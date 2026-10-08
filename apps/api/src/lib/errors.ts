import type { ErrorCode, FieldError } from '../schemas/error.schema.js';

/**
 * Base class for "expected" errors: things that are the client's fault or a
 * known business rule, each with an HTTP status and a stable error code.
 *
 * Services throw these without knowing anything about HTTP responses; the
 * central error handler (middleware/error-handler.ts) turns them into JSON.
 * This is Laravel's ModelNotFoundException -> 404 or FastAPI's
 * HTTPException, minus the coupling to the response object.
 *
 * Anything that is NOT an AppError is treated as a bug: logged with its
 * stack, and returned to the client as a generic 500.
 */
export class AppError extends Error {
  readonly statusCode: number;
  readonly code: ErrorCode;
  readonly fields: FieldError[] | undefined;

  constructor(statusCode: number, code: ErrorCode, message: string, fields?: FieldError[]) {
    super(message);
    // new.target is the subclass actually being constructed, so err.name
    // reads "NotFoundError" in logs instead of "Error".
    this.name = new.target.name;
    this.statusCode = statusCode;
    this.code = code;
    this.fields = fields;
  }
}

export class BadRequestError extends AppError {
  constructor(message = 'Bad request') {
    super(400, 'BAD_REQUEST', message);
  }
}

export class ValidationError extends AppError {
  constructor(fields: FieldError[], message = 'Request validation failed') {
    super(400, 'VALIDATION_ERROR', message, fields);
  }
}

export class UnauthorizedError extends AppError {
  constructor(message = 'Authentication required') {
    super(401, 'UNAUTHORIZED', message);
  }
}

export class ForbiddenError extends AppError {
  constructor(message = 'You do not have permission to do this') {
    super(403, 'FORBIDDEN', message);
  }
}

export class NotFoundError extends AppError {
  constructor(resource = 'Resource') {
    super(404, 'NOT_FOUND', `${resource} not found`);
  }
}

export class ConflictError extends AppError {
  constructor(message = 'Conflict') {
    super(409, 'CONFLICT', message);
  }
}

export class PayloadTooLargeError extends AppError {
  constructor(message = 'Request body is too large') {
    super(413, 'PAYLOAD_TOO_LARGE', message);
  }
}

export class TooManyRequestsError extends AppError {
  constructor(message = 'Too many requests, please try again later') {
    super(429, 'TOO_MANY_REQUESTS', message);
  }
}
