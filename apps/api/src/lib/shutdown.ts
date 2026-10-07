import { logger } from './logger.js';

/**
 * Graceful shutdown, shared by the API (server.ts) and the worker (worker.ts).
 *
 * Docker/Kubernetes stop a container with SIGTERM, wait (10s by default),
 * then SIGKILL. In those seconds we stop taking new work, let in-flight
 * work finish, and close connections cleanly. PHP-FPM handles this for a
 * Laravel app; a Node process is its own server and has to do it itself.
 */
export function registerGracefulShutdown(cleanup: () => Promise<void>, timeoutMs = 10_000) {
  let shuttingDown = false;

  async function shutdown(signal: NodeJS.Signals) {
    // A second Ctrl+C while we're already cleaning up shouldn't start over.
    if (shuttingDown) return;
    shuttingDown = true;
    logger.info({ signal }, 'Shutting down gracefully');

    // Safety net: if cleanup hangs (a stuck request, a dead DB), exit anyway.
    // unref() means this timer alone won't keep the process alive.
    setTimeout(() => {
      logger.error('Graceful shutdown timed out, forcing exit');
      process.exit(1);
    }, timeoutMs).unref();

    try {
      await cleanup();
      logger.info('Shutdown complete');
      process.exit(0);
    } catch (err) {
      logger.error({ err }, 'Error during shutdown');
      process.exit(1);
    }
  }

  process.once('SIGTERM', (signal) => void shutdown(signal));
  process.once('SIGINT', (signal) => void shutdown(signal));
}

/**
 * Last-resort handlers. After an uncaught exception the process is in an
 * unknown state, so the only safe move is to log and exit, and let Docker's
 * restart policy start a fresh process. Never "log and carry on".
 */
export function registerCrashHandlers() {
  process.on('unhandledRejection', (reason) => {
    logger.fatal({ err: reason }, 'Unhandled promise rejection');
    process.exit(1);
  });
  process.on('uncaughtException', (err) => {
    logger.fatal({ err }, 'Uncaught exception');
    process.exit(1);
  });
}
