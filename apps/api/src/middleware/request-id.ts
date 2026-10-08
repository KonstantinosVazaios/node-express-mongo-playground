import { randomUUID } from 'node:crypto';
import type { RequestHandler } from 'express';

// Only accept "reasonable" incoming IDs. The value ends up in logs and
// response headers, so we don't trust arbitrary client input.
const VALID_ID = /^[\w-]{1,64}$/;

/**
 * Gives every request an ID that appears in every log line it produces, in
 * the X-Request-Id response header and in error responses. A user can report
 * "request 3f2a... failed" and you grep the logs for it.
 *
 * If a proxy or the frontend already sent X-Request-Id, we keep it, so one
 * ID follows the request across services.
 */
export const requestId: RequestHandler = (req, res, next) => {
  const incoming = req.get('x-request-id');
  req.requestId = incoming && VALID_ID.test(incoming) ? incoming : randomUUID();
  res.setHeader('X-Request-Id', req.requestId);
  next();
};
