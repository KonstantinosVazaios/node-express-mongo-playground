import type { QueryFilter } from 'mongoose';
import { ConflictError, NotFoundError } from '../lib/errors.js';
import { mapPage, paginate } from '../lib/pagination.js';
import { type ReviewCycle, ReviewCycleModel } from '../models/review-cycle.model.js';
import { ReviewModel } from '../models/review.model.js';
import { UserModel } from '../models/user.model.js';
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

/**
 * draft -> active: creates one pending review for every user who has a
 * manager, with that manager as the reviewer and the cycle's questions as
 * empty answers.
 *
 * bulkWrite sends ALL the operations in one round trip, instead of one
 * insert per employee (the N+1 problem, write edition). Each operation is
 * an upsert with $setOnInsert, which makes activation IDEMPOTENT: if the
 * process crashes halfway, running it again creates only the missing
 * reviews and never duplicates (the unique index backs that up). The status
 * flips to active only at the end, so a crash leaves the cycle in draft and
 * safe to retry. (Phase 6 shows the other tool for "all or nothing":
 * a multi-document transaction.)
 */
export async function activateCycle(actor: AuthUser, id: string): Promise<ReviewCycleDto> {
  const cycle = await ReviewCycleModel.findOne({ _id: id, organizationId: actor.organizationId });
  if (!cycle) throw new NotFoundError('Review cycle');
  if (cycle.status !== 'draft') {
    throw new ConflictError(`Only draft cycles can be activated (this one is ${cycle.status})`);
  }

  const reviewees = await UserModel.find({
    organizationId: actor.organizationId,
    managerId: { $ne: null },
  })
    .select('_id managerId')
    .lean();

  if (reviewees.length > 0) {
    await ReviewModel.bulkWrite(
      reviewees.map((user) => ({
        updateOne: {
          filter: {
            organizationId: actor.organizationId,
            cycleId: cycle._id,
            employeeId: user._id,
          },
          update: {
            $setOnInsert: {
              reviewerId: user.managerId,
              answers: cycle.questions.map((question) => ({ question, answer: '' })),
            },
          },
          upsert: true,
        },
      })),
    );
  }

  cycle.status = 'active';
  await cycle.save();
  return toReviewCycleDto(cycle);
}
