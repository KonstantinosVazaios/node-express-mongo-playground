import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { loginRateLimit } from '../middleware/rate-limit.js';
import { validate } from '../middleware/validate.js';
import { LoginBodySchema } from '../schemas/auth.schema.js';

export const authRouter = Router();

// Middleware run left to right: the rate limiter comes first, so blocked
// clients never reach validation or bcrypt (which is expensive on purpose).
authRouter.post(
  '/login',
  loginRateLimit,
  validate({ body: LoginBodySchema }),
  authController.login,
);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', authenticate, authController.me);
