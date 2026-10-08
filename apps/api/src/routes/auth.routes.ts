import { Router } from 'express';
import * as authController from '../controllers/auth.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { LoginBodySchema } from '../schemas/auth.schema.js';

export const authRouter = Router();

authRouter.post('/login', validate({ body: LoginBodySchema }), authController.login);
authRouter.post('/logout', authController.logout);
authRouter.get('/me', authenticate, authController.me);
