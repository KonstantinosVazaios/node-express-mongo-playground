import { Router } from 'express';
import * as reviewController from '../controllers/review.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requireRole } from '../middleware/require-role.js';
import { validate } from '../middleware/validate.js';
import { IdParamsSchema } from '../schemas/common.schema.js';
import { ListReviewsQuerySchema, UpdateReviewBodySchema } from '../schemas/review.schema.js';

export const reviewRouter = Router();

reviewRouter.use(authenticate);

reviewRouter.get('/', validate({ query: ListReviewsQuerySchema }), reviewController.listReviews);
reviewRouter.get('/:id', validate({ params: IdParamsSchema }), reviewController.getReview);

// Writing reviews: managers (their reports only, checked in the service) and admins.
reviewRouter.patch(
  '/:id',
  requireRole('admin', 'manager'),
  validate({ params: IdParamsSchema, body: UpdateReviewBodySchema }),
  reviewController.updateReview,
);
reviewRouter.post(
  '/:id/submit',
  requireRole('admin', 'manager'),
  validate({ params: IdParamsSchema }),
  reviewController.submitReview,
);
