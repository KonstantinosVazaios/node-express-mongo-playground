import { Router } from 'express';
import * as reviewController from '../controllers/review.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { IdParamsSchema } from '../schemas/common.schema.js';
import { ListReviewsQuerySchema } from '../schemas/review.schema.js';

export const reviewRouter = Router();

reviewRouter.use(authenticate);

reviewRouter.get('/', validate({ query: ListReviewsQuerySchema }), reviewController.listReviews);
reviewRouter.get('/:id', validate({ params: IdParamsSchema }), reviewController.getReview);
