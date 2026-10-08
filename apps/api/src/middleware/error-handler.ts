import type { ErrorRequestHandler, RequestHandler } from 'express';
import mongoose from 'mongoose';
import { env } from '../config/env.js';
import {
  AppError,
  BadRequestError,
  ConflictError,
  NotFoundError,
  PayloadTooLargeError,
} from '../lib/errors.js';
import { logger } from '../lib/logger.js';
import type { ErrorResponse } from '../schemas/error.schema.js';

/** Registered after all routes: nothing matched, so it's a 404 in our error format. */
export const notFoundHandler: RequestHandler = (req) => {
  // Express 5 catches a synchronous throw in middleware just like next(err).
  throw new NotFoundError(`Route ${req.method} ${req.path}`);
};

/**
 * Centralized error handler. Express recognises error middleware ONLY by its
 * arity: it must declare four parameters, even if `next` is unused.
 *
 * How errors get here:
 *  - `throw` inside any handler or middleware (sync)
 *  - a rejected promise / `throw` inside an ASYNC handler. Express 5 calls
 *    next(err) for you when a handler's returned promise rejects. In
 *    Express 4 an async throw was an unhandled rejection that left the
 *    request hanging, so every async handler needed a wrapper:
 *        const asyncHandler = (fn) => (req, res, next) => fn(req, res, next).catch(next);
 *    (or the `express-async-errors` monkey-patch).
 *  - an explicit next(err), e.g. from body-parser on malformed JSON
 */
export const errorHandler: ErrorRequestHandler = (err, req, res, next) => {
  // If streaming a response already started, we can't send a JSON error any
  // more. Express's default handler then closes the connection.
  if (res.headersSent) {
    next(err);
    return;
  }

  const appError = toAppError(err);

  // 4xx errors are the client's problem and expected. 5xx errors are bugs:
  // log them with the full stack.
  if (appError.statusCode >= 500) {
    logger.error({ err }, 'Unhandled error');
  }

  const body: ErrorResponse = {
    error: {
      code: appError.code,
      message: appError.message,
      ...(appError.fields && { fields: appError.fields }),
      // Stack traces reveal file paths, library versions and code structure,
      // so they're shown only in development, never in production.
      ...(env.NODE_ENV === 'development' && err instanceof Error && { stack: err.stack }),
    },
  };

  res.status(appError.statusCode).json(body);
};

/** Maps known library errors to AppErrors; everything else becomes a 500. */
function toAppError(err: unknown): AppError {
  if (err instanceof AppError) return err;

  // body-parser (express.json) attaches a `type` to the errors it raises.
  if (hasType(err, 'entity.parse.failed')) return new BadRequestError('Malformed JSON body');
  if (hasType(err, 'entity.too.large')) return new PayloadTooLargeError();

  // E11000: a unique index was violated (e.g. a second review for the same
  // employee in the same cycle). Laravel would raise a QueryException here.
  if (err instanceof mongoose.mongo.MongoServerError && err.code === 11000) {
    return new ConflictError('A record with the same unique value already exists');
  }

  // Mongoose couldn't cast a value, e.g. "abc" as an ObjectId.
  if (err instanceof mongoose.Error.CastError) {
    return new BadRequestError(`Invalid value for ${err.path}`);
  }

  // Unknown error = a bug. The client gets a generic message, never the
  // real one, because it might leak internals (SQL, hostnames, secrets).
  return new AppError(500, 'INTERNAL_ERROR', 'Internal server error');
}

function hasType(err: unknown, type: string): boolean {
  return typeof err === 'object' && err !== null && 'type' in err && err.type === type;
}
