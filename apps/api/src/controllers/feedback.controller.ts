import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import type { IdParams } from '../schemas/common.schema.js';
import type {
  CreateFeedbackBody,
  FeedbackDto,
  FeedbackList,
  ListFeedbackQuery,
  UpdateFeedbackBody,
} from '../schemas/feedback.schema.js';
import * as feedbackService from '../services/feedback.service.js';

export async function listFeedback(
  req: Request<object, FeedbackList, unknown, ListFeedbackQuery>,
  res: Response<FeedbackList>,
) {
  res.json(await feedbackService.listFeedback(currentUser(req), req.query));
}

export async function getFeedback(req: Request<IdParams>, res: Response<FeedbackDto>) {
  res.json(await feedbackService.getFeedback(currentUser(req), req.params.id));
}

export async function createFeedback(
  req: Request<object, FeedbackDto, CreateFeedbackBody>,
  res: Response<FeedbackDto>,
) {
  const feedback = await feedbackService.createFeedback(currentUser(req), req.body);
  res.status(201).location(`/feedback/${feedback.id}`).json(feedback);
}

export async function updateFeedback(
  req: Request<IdParams, FeedbackDto, UpdateFeedbackBody>,
  res: Response<FeedbackDto>,
) {
  res.json(await feedbackService.updateFeedback(currentUser(req), req.params.id, req.body));
}

export async function deleteFeedback(req: Request<IdParams>, res: Response) {
  await feedbackService.deleteFeedback(currentUser(req), req.params.id);
  res.status(204).end();
}
