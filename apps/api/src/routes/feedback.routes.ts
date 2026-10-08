import { Router } from 'express';
import * as feedbackController from '../controllers/feedback.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { IdParamsSchema } from '../schemas/common.schema.js';
import {
  CreateFeedbackBodySchema,
  ListFeedbackQuerySchema,
  UpdateFeedbackBodySchema,
} from '../schemas/feedback.schema.js';

export const feedbackRouter = Router();

feedbackRouter.use(authenticate);

feedbackRouter.get(
  '/',
  validate({ query: ListFeedbackQuerySchema }),
  feedbackController.listFeedback,
);
feedbackRouter.post(
  '/',
  validate({ body: CreateFeedbackBodySchema }),
  feedbackController.createFeedback,
);
feedbackRouter.get('/:id', validate({ params: IdParamsSchema }), feedbackController.getFeedback);
feedbackRouter.patch(
  '/:id',
  validate({ params: IdParamsSchema, body: UpdateFeedbackBodySchema }),
  feedbackController.updateFeedback,
);
feedbackRouter.delete(
  '/:id',
  validate({ params: IdParamsSchema }),
  feedbackController.deleteFeedback,
);
