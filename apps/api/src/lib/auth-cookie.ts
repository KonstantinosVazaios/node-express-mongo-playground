import type { CookieOptions } from 'express';
import { env } from '../config/env.js';

/**
 * Why a cookie and not `Authorization: Bearer` from localStorage?
 * - httpOnly: page JavaScript can't read it, so an XSS bug can't steal the token.
 * - sameSite 'lax': the browser doesn't attach it to cross-site POST/fetch,
 *   which blocks classic CSRF. Combined with a JSON-only API (cross-origin
 *   JSON requests need a CORS preflight we don't allow), that's enough here.
 * - secure: HTTPS only in production. Browsers treat http://localhost as
 *   secure, so this still works locally.
 */
export function authCookieOptions(): CookieOptions {
  return {
    httpOnly: true,
    sameSite: 'lax',
    secure: env.NODE_ENV === 'production',
    path: '/',
    maxAge: env.JWT_TTL_SECONDS * 1000,
  };
}
