import type { QueryFilter } from 'mongoose';
import { ConflictError, ForbiddenError, NotFoundError, ValidationError } from '../lib/errors.js';
import { mapPage, paginate } from '../lib/pagination.js';
import { FeedbackModel } from '../models/feedback.model.js';
import { ReviewCycleModel } from '../models/review-cycle.model.js';
import { type Review, type ReviewDocument, ReviewModel } from '../models/review.model.js';
import type { Page } from '../schemas/common.schema.js';
import type { FieldError } from '../schemas/error.schema.js';
import type { PopulatedUser } from '../schemas/feedback.schema.js';
import {
  type ListReviewsQuery,
  type PopulatedCycle,
  type ReviewDetailDto,
  type ReviewDto,
  ReviewDetailSchema,
  type UpdateReviewBody,
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

/**
 * Who may WRITE a review: its reviewer (the employee's manager) or an admin.
 * requireRole('admin', 'manager') on the route already rejects employees;
 * this is the data-dependent part (WHICH manager) that only the service can
 * check.
 */
async function loadEditableReview(actor: AuthUser, id: string) {
  const review = await findVisibleReview(actor, id);
  const isReviewer = review.reviewerId?.equals(actor.id) ?? false;
  if (actor.role !== 'admin' && !isReviewer) {
    throw new ForbiddenError('Only the reviewer or an admin can change this review');
  }

  const cycle = await ReviewCycleModel.findOne({
    _id: review.cycleId,
    organizationId: actor.organizationId,
  }).lean();
  if (review.locked || cycle?.status !== 'active') {
    throw new ConflictError('This review is locked because its cycle is not active');
  }
  if (review.status === 'submitted') {
    throw new ConflictError('This review has already been submitted');
  }
  return { review, competencies: cycle.competencies };
}

function assertKnownCompetencies(body: UpdateReviewBody, competencies: string[]) {
  const fields: FieldError[] = [];
  body.scores?.forEach((score, i) => {
    if (!competencies.includes(score.competency)) {
      fields.push({
        in: 'body',
        path: `scores.${i}.competency`,
        message: `"${score.competency}" is not a competency of this cycle`,
      });
    }
  });
  if (fields.length) throw new ValidationError(fields);
}

function applyAnswers(review: ReviewDocument, body: UpdateReviewBody) {
  const fields: FieldError[] = [];
  body.answers?.forEach((input, i) => {
    // DocumentArray#id(): finds an embedded subdocument by its _id, in memory.
    const answer = review.answers.id(input.id);
    if (!answer) {
      fields.push({ in: 'body', path: `answers.${i}.id`, message: 'Unknown answer' });
      return;
    }
    answer.answer = input.answer;
  });
  if (fields.length) throw new ValidationError(fields);
}

export async function updateReview(
  actor: AuthUser,
  id: string,
  body: UpdateReviewBody,
): Promise<ReviewDetailDto> {
  const { review, competencies } = await loadEditableReview(actor, id);

  assertKnownCompetencies(body, competencies);
  if (body.scores) review.set('scores', body.scores);
  applyAnswers(review, body);

  // save() validates the whole document, embedded subdocuments included,
  // and writes only the changed paths.
  await review.save();
  return getReview(actor, id);
}

/**
 * pending -> submitted. Instead of "read, check status, write" (two
 * requests racing could both pass the check), the state check is part of
 * the UPDATE's filter: findOneAndUpdate is atomic on a single document, so
 * exactly one concurrent submit wins and the other gets null -> 409.
 */
export async function submitReview(actor: AuthUser, id: string): Promise<ReviewDetailDto> {
  const { review, competencies } = await loadEditableReview(actor, id);

  const scored = new Set(review.scores.map((s) => s.competency));
  const missing = competencies.filter((c) => !scored.has(c));
  if (missing.length) {
    throw new ValidationError([
      { in: 'body', path: 'scores', message: `Missing scores for: ${missing.join(', ')}` },
    ]);
  }

  const submitted = await ReviewModel.findOneAndUpdate(
    { _id: id, organizationId: actor.organizationId, status: 'pending', locked: false },
    { $set: { status: 'submitted', submittedAt: new Date() } },
    { returnDocument: 'after' },
  );
  if (!submitted) throw new ConflictError('This review has already been submitted');

  return getReview(actor, id);
}
