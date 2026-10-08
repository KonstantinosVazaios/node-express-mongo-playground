import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import type { IdParams } from '../schemas/common.schema.js';
import type {
  CreateReviewCycleBody,
  ListReviewCyclesQuery,
  ReviewCycleDto,
  ReviewCycleList,
} from '../schemas/review-cycle.schema.js';
import * as cycleService from '../services/review-cycle.service.js';

export async function listCycles(
  req: Request<object, ReviewCycleList, unknown, ListReviewCyclesQuery>,
  res: Response<ReviewCycleList>,
) {
  res.json(await cycleService.listCycles(currentUser(req), req.query));
}

export async function getCycle(req: Request<IdParams>, res: Response<ReviewCycleDto>) {
  res.json(await cycleService.getCycle(currentUser(req), req.params.id));
}

export async function createCycle(
  req: Request<object, ReviewCycleDto, CreateReviewCycleBody>,
  res: Response<ReviewCycleDto>,
) {
  const cycle = await cycleService.createCycle(currentUser(req), req.body);
  res.status(201).location(`/review-cycles/${cycle.id}`).json(cycle);
}

export async function activateCycle(req: Request<IdParams>, res: Response<ReviewCycleDto>) {
  res.json(await cycleService.activateCycle(currentUser(req), req.params.id));
}
