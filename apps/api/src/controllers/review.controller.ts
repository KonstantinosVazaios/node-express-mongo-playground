import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import type { IdParams } from '../schemas/common.schema.js';
import type {
  ListReviewsQuery,
  ReviewDetailDto,
  ReviewList,
  UpdateReviewBody,
} from '../schemas/review.schema.js';
import * as reviewService from '../services/review.service.js';

export async function listReviews(
  req: Request<object, ReviewList, unknown, ListReviewsQuery>,
  res: Response<ReviewList>,
) {
  res.json(await reviewService.listReviews(currentUser(req), req.query));
}

export async function getReview(req: Request<IdParams>, res: Response<ReviewDetailDto>) {
  res.json(await reviewService.getReview(currentUser(req), req.params.id));
}

export async function updateReview(
  req: Request<IdParams, ReviewDetailDto, UpdateReviewBody>,
  res: Response<ReviewDetailDto>,
) {
  res.json(await reviewService.updateReview(currentUser(req), req.params.id, req.body));
}

export async function submitReview(req: Request<IdParams>, res: Response<ReviewDetailDto>) {
  res.json(await reviewService.submitReview(currentUser(req), req.params.id));
}
