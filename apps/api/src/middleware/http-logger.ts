import type { Request, Response } from 'express';
import { pinoHttp } from 'pino-http';
import { logger } from '../lib/logger.js';

/**
 * Logs one line per request when the response finishes: method, url,
 * status, response time and the request id. pino-http also attaches
 * `req.log`, a child logger that stamps every line with the request id.
 */
export const httpLogger = pinoHttp<Request, Response>({
  logger,
  // Reuse the id from the requestId middleware (registered before this one).
  genReqId: (req) => req.requestId,
  customLogLevel: (_req, res, err) => {
    if (err || res.statusCode >= 500) return 'error';
    if (res.statusCode >= 400) return 'warn';
    return 'info';
  },
  customSuccessMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
  customErrorMessage: (req, res) => `${req.method} ${req.originalUrl} ${res.statusCode}`,
  // The frontend's "API ping" calls /health many times per second, which
  // would drown out everything else.
  autoLogging: { ignore: (req) => req.url === '/health' },
  // The default serializers log every header; keep log lines short.
  serializers: {
    req: (req: { id: string; method: string; url: string }) => ({
      id: req.id,
      method: req.method,
      url: req.url,
    }),
    res: (res: { statusCode: number }) => ({ statusCode: res.statusCode }),
  },
});
