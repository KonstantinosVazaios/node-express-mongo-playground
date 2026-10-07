import { pino } from 'pino';
import { env } from '../config/env.js';

/**
 * One shared Pino logger.
 *
 * Production: one JSON object per line on stdout. In containers the app
 * should NOT manage log files or rotation. It writes to stdout and Docker or
 * the platform ships the lines to Loki/Datadog/CloudWatch, which can index
 * the JSON fields.
 *
 * Development: pino-pretty for readable, coloured lines. It runs as a
 * "transport" in a worker thread, so formatting never blocks the event loop.
 * It is a devDependency and is only loaded here, never in production.
 */
export const logger = pino({
  level: env.LOG_LEVEL,
  base: { service: 'hr-api' },
  // Never write credentials to logs, even by accident.
  redact: ['req.headers.authorization', 'req.headers.cookie', 'password', '*.password'],
  ...(env.NODE_ENV === 'development' && {
    transport: {
      target: 'pino-pretty',
      options: { translateTime: 'HH:MM:ss', ignore: 'pid,hostname,service' },
    },
  }),
});

export type Logger = typeof logger;
