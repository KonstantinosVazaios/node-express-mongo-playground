import type { QueryFilter } from 'mongoose';
import { NotFoundError } from '../lib/errors.js';
import { mapPage, paginate } from '../lib/pagination.js';
import { type ReviewCycle, ReviewCycleModel } from '../models/review-cycle.model.js';
import type { Page } from '../schemas/common.schema.js';
import {
  type CreateReviewCycleBody,
  type ListReviewCyclesQuery,
  type ReviewCycleDto,
  toReviewCycleDto,
} from '../schemas/review-cycle.schema.js';
import type { AuthUser } from '../types/auth.js';

// Cycles are organization-wide metadata ("Q4 2026 is active"), so every role
// can read them; only admins create or change them (enforced in the routes).

export async function listCycles(
  actor: AuthUser,
  query: ListReviewCyclesQuery,
): Promise<Page<ReviewCycleDto>> {
  const filter: QueryFilter<ReviewCycle> = {
    organizationId: actor.organizationId,
    ...(query.status && { status: query.status }),
  };
  const page = await paginate(
    ReviewCycleModel.find(filter).sort({ createdAt: -1, _id: -1 }).lean(),
    ReviewCycleModel.countDocuments(filter),
    query,
  );
  return mapPage(page, toReviewCycleDto);
}

export async function getCycle(actor: AuthUser, id: string): Promise<ReviewCycleDto> {
  const cycle = await ReviewCycleModel.findOne({
    _id: id,
    organizationId: actor.organizationId,
  }).lean();
  if (!cycle) throw new NotFoundError('Review cycle');
  return toReviewCycleDto(cycle);
}

export async function createCycle(
  actor: AuthUser,
  body: CreateReviewCycleBody,
): Promise<ReviewCycleDto> {
  // A duplicate name hits the unique index -> E11000 -> 409 in the error
  // handler. No "check first, then insert" race: the database decides.
  const cycle = await ReviewCycleModel.create({
    organizationId: actor.organizationId,
    name: body.name,
    competencies: body.competencies,
    questions: body.questions,
    startsAt: body.startsAt ? new Date(body.startsAt) : null,
    endsAt: body.endsAt ? new Date(body.endsAt) : null,
  });
  return toReviewCycleDto(cycle);
}
