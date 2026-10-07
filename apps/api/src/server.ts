import type { Server } from 'node:http';
import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectMongo, disconnectMongo } from './db/mongo.js';
import { connectRedis, disconnectRedis } from './db/redis.js';
import { logger } from './lib/logger.js';
import { registerCrashHandlers, registerGracefulShutdown } from './lib/shutdown.js';

registerCrashHandlers();

// Top-level await works because this is an ES module. Connect BEFORE
// accepting traffic: a server that listens but can't reach its database would
// pass a naive liveness check and then fail every request. The two
// connections don't depend on each other, so they are opened in parallel.
await Promise.all([connectMongo(), connectRedis()]);

const app = createApp();

const server: Server = app.listen(env.PORT, (error) => {
  // Express 5 passes listen errors (e.g. EADDRINUSE) to this callback instead
  // of only emitting them on the underlying http.Server.
  if (error) throw error;
  logger.info(`API listening on http://localhost:${env.PORT}`);
});

registerGracefulShutdown(async () => {
  // 1. Stop accepting new connections. The callback fires once every
  //    in-flight request has finished.
  const closed = new Promise<void>((resolve, reject) =>
    server.close((err) => (err ? reject(err) : resolve())),
  );
  // 2. Keep-alive sockets with no request in flight would otherwise hold
  //    server.close() open until they time out.
  server.closeIdleConnections();
  await closed;
  // 3. Only now close the connections that requests were using.
  await Promise.all([disconnectMongo(), disconnectRedis()]);
});
