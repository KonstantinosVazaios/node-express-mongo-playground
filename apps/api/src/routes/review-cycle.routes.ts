import { Router } from 'express';
import * as cycleController from '../controllers/review-cycle.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import { validate } from '../middleware/validate.js';
import { IdParamsSchema } from '../schemas/common.schema.js';
import {
  CreateReviewCycleBodySchema,
  ListReviewCyclesQuerySchema,
} from '../schemas/review-cycle.schema.js';

export const reviewCycleRouter = Router();

reviewCycleRouter.use(authenticate);

reviewCycleRouter.get(
  '/',
  validate({ query: ListReviewCyclesQuerySchema }),
  cycleController.listCycles,
);
reviewCycleRouter.get('/:id', validate({ params: IdParamsSchema }), cycleController.getCycle);
// Role check BEFORE validation: an employee gets a 403, not a list of field
// errors that describe a form they may not submit anyway.
reviewCycleRouter.post(
  '/',
  requireRole('admin'),
  validate({ body: CreateReviewCycleBodySchema }),
  cycleController.createCycle,
);
// An action endpoint (POST /:id/activate) rather than PATCH { status }: a
// state transition with side effects (it creates reviews) is clearer as an
// explicit verb, and each transition can have its own rules.
reviewCycleRouter.post(
  '/:id/activate',
  requireRole('admin'),
  validate({ params: IdParamsSchema }),
  cycleController.activateCycle,
);
