import { Router } from 'express';
import { getHealth } from '../controllers/health.controller.js';

// A Router is a mini-app: routes + middleware that can be mounted under a
// prefix in app.ts, like a Laravel route group or a FastAPI APIRouter.
export const healthRouter = Router();

healthRouter.get('/', getHealth);
