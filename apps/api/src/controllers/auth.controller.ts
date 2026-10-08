import type { Request, Response } from 'express';
import { AUTH_COOKIE, authCookieOptions } from '../lib/auth-cookie.js';
import { currentUser } from '../middleware/authenticate.js';
import type { AuthUserResponse, LoginBody, MeResponse } from '../schemas/auth.schema.js';
import * as authService from '../services/auth.service.js';

// Request<Params, ResBody, ReqBody>: the validate() middleware guarantees
// req.body matches LoginBody by the time we get here.
export async function login(req: Request<object, AuthUserResponse, LoginBody>, res: Response) {
  const { user, token } = await authService.login(req.body.email, req.body.password);
  res.cookie(AUTH_COOKIE, token, authCookieOptions());
  res.json({ user } satisfies AuthUserResponse);
}

export function logout(_req: Request, res: Response) {
  // The options must match the ones used to set the cookie, or the browser
  // treats it as a different cookie and keeps the old one.
  const { maxAge: _maxAge, ...options } = authCookieOptions();
  res.clearCookie(AUTH_COOKIE, options);
  res.status(204).end();
}

export async function me(req: Request, res: Response<MeResponse>) {
  res.json(await authService.getMe(currentUser(req).id));
}
