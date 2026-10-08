import type { QueryFilter } from 'mongoose';
import { ForbiddenError, NotFoundError } from '../lib/errors.js';
import { mapPage, paginate } from '../lib/pagination.js';
import { FeedbackModel } from '../models/feedback.model.js';
import { ReviewCycleModel } from '../models/review-cycle.model.js';
import { type Review, ReviewModel } from '../models/review.model.js';
import type { Page } from '../schemas/common.schema.js';
import type { PopulatedUser } from '../schemas/feedback.schema.js';
import {
  type ListReviewsQuery,
  type PopulatedCycle,
  type ReviewDetailDto,
  type ReviewDto,
  ReviewDetailSchema,
  toReviewDto,
} from '../schemas/review.schema.js';
import type { AuthUser } from '../types/auth.js';
import { canSeeEmployee, employeeScope } from './access.service.js';

type PopulatedReview = {
  cycleId: PopulatedCycle | null;
  employeeId: PopulatedUser | null;
  reviewerId: PopulatedUser | null;
};

/** populate() options for a review, each one scoped to the tenant. */
function reviewRefs(organizationId: string) {
  const match = { organizationId };
  return [
    { path: 'cycleId', select: 'name status', match },
    { path: 'employeeId', select: 'firstName lastName', match },
    { path: 'reviewerId', select: 'firstName lastName', match },
  ];
}

export async function listReviews(
  actor: AuthUser,
  query: ListReviewsQuery,
): Promise<Page<ReviewDto>> {
  const filter: QueryFilter<Review> = {
    ...(await employeeScope(actor)),
    ...(query.cycleId && { cycleId: query.cycleId }),
    ...(query.status && { status: query.status }),
  };
  // Narrowing by employee must not REPLACE the scope's employeeId $in, so
  // the two are combined with $and.
  if (query.employeeId) {
    filter.$and = [{ employeeId: query.employeeId }];
  }

  const page = await paginate(
    ReviewModel.find(filter)
      .sort({ createdAt: -1, _id: -1 })
      .populate<PopulatedReview>(reviewRefs(actor.organizationId))
      .lean(),
    ReviewModel.countDocuments(filter),
    query,
  );
  return mapPage(page, toReviewDto);
}

/** Loads a review of the actor's tenant and checks the access policy. */
export async function findVisibleReview(actor: AuthUser, id: string) {
  const review = await ReviewModel.findOne({ _id: id, organizationId: actor.organizationId });
  if (!review) throw new NotFoundError('Review');
  if (!(await canSeeEmployee(actor, review.employeeId.toString()))) {
    throw new ForbiddenError('You cannot view this review');
  }
  return review;
}

export async function getReview(actor: AuthUser, id: string): Promise<ReviewDetailDto> {
  // SEQUENTIAL await: every query below needs data from this one (cycleId,
  // employeeId), so it must finish first.
  const review = await findVisibleReview(actor, id);

  // PARALLEL with Promise.all: these three are independent of each other.
  // Awaiting them one by one would cost 3 round trips of latency; together
  // they cost the slowest one. The trade-off: if one rejects, Promise.all
  // rejects immediately (the others still run, their results are dropped).
  // Use Promise.allSettled when partial results are useful (see /health).
  const [populated, cycle, feedbackCount] = await Promise.all([
    review.populate<PopulatedReview>(reviewRefs(actor.organizationId)),
    ReviewCycleModel.findOne({ _id: review.cycleId, organizationId: actor.organizationId })
      .select('competencies')
      .lean(),
    FeedbackModel.countDocuments({
      organizationId: actor.organizationId,
      employeeId: review.employeeId,
    }),
  ]);

  return ReviewDetailSchema.parse({
    ...toReviewDto(populated),
    competencies: cycle?.competencies ?? [],
    feedbackCount,
  });
}
