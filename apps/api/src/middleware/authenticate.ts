import type { Request, RequestHandler } from 'express';
import { AUTH_COOKIE } from '../lib/auth-cookie.js';
import { UnauthorizedError } from '../lib/errors.js';
import { getSessionUser } from '../services/auth.service.js';
import type { AuthUser } from '../types/auth.js';

/**
 * Reads the session cookie, verifies the JWT and attaches `req.user`.
 * Routes opt in by adding it to their middleware chain, like Laravel's
 * `auth` middleware or a FastAPI `Depends(get_current_user)`.
 *
 * It's an async middleware: a rejected promise (e.g. an expired token) is
 * forwarded to the error handler automatically by Express 5.
 */
export const authenticate: RequestHandler = async (req, _res, next) => {
  // cookie-parser types req.cookies as `any`; narrow it before trusting it.
  const cookies = req.cookies as Record<string, unknown>;
  const token = cookies[AUTH_COOKIE];
  if (typeof token !== 'string' || token === '') throw new UnauthorizedError();

  req.user = await getSessionUser(token);
  next();
};

/** For controllers behind `authenticate`: returns req.user typed as non-null. */
export function currentUser(req: Request): AuthUser {
  if (!req.user) throw new UnauthorizedError();
  return req.user;
}
