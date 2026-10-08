import type { Types } from 'mongoose';
import { z } from 'zod';
import { REVIEW_STATUSES } from '../models/review.model.js';
import {
  ObjectIdSchema,
  PaginationQuerySchema,
  UserRefSchema,
  paginated,
} from './common.schema.js';
import { type PopulatedUser, toUserRef } from './feedback.schema.js';
import { CycleStatusSchema } from './review-cycle.schema.js';

export const ReviewStatusSchema = z.enum(REVIEW_STATUSES);

export const ScoreSchema = z.object({
  competency: z.string(),
  score: z.number().int().min(1).max(5),
});

export const AnswerSchema = z.object({
  id: z.string(),
  question: z.string(),
  answer: z.string(),
});

export const ReviewSchema = z.object({
  id: z.string(),
  cycle: z.object({ id: z.string(), name: z.string(), status: CycleStatusSchema }),
  employee: UserRefSchema,
  reviewer: UserRefSchema.nullable(),
  status: ReviewStatusSchema,
  locked: z.boolean(),
  scores: z.array(ScoreSchema),
  answers: z.array(AnswerSchema),
  averageScore: z.number().nullable(),
  submittedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type ReviewDto = z.infer<typeof ReviewSchema>;

/** The single-review view adds what the review page needs around it. */
export const ReviewDetailSchema = ReviewSchema.extend({
  competencies: z.array(z.string()),
  feedbackCount: z.number().int(),
});
export type ReviewDetailDto = z.infer<typeof ReviewDetailSchema>;

export const ReviewListSchema = paginated(ReviewSchema);
export type ReviewList = z.infer<typeof ReviewListSchema>;

export const ListReviewsQuerySchema = z.strictObject({
  ...PaginationQuerySchema.shape,
  cycleId: ObjectIdSchema.optional(),
  employeeId: ObjectIdSchema.optional(),
  status: ReviewStatusSchema.optional(),
});
export type ListReviewsQuery = z.infer<typeof ListReviewsQuerySchema>;

export interface PopulatedCycle {
  _id: Types.ObjectId;
  name: string;
  status: string;
}

interface ReviewLike {
  _id: Types.ObjectId;
  cycleId: PopulatedCycle | null;
  employeeId: PopulatedUser | null;
  reviewerId: PopulatedUser | null;
  status: string;
  locked: boolean;
  scores: { competency: string; score: number }[];
  answers: { _id: Types.ObjectId; question: string; answer?: string | null }[];
  submittedAt?: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export function toReviewDto(review: ReviewLike): ReviewDto {
  const total = review.scores.reduce((sum, s) => sum + s.score, 0);
  return ReviewSchema.parse({
    id: review._id.toString(),
    cycle: review.cycleId
      ? {
          id: review.cycleId._id.toString(),
          name: review.cycleId.name,
          status: review.cycleId.status,
        }
      : { id: '', name: 'Unknown cycle', status: 'closed' },
    employee: toUserRef(review.employeeId),
    reviewer: review.reviewerId ? toUserRef(review.reviewerId) : null,
    status: review.status,
    locked: review.locked,
    scores: review.scores.map(({ competency, score }) => ({ competency, score })),
    answers: review.answers.map((a) => ({
      id: a._id.toString(),
      question: a.question,
      answer: a.answer ?? '',
    })),
    averageScore: review.scores.length
      ? Math.round((total / review.scores.length) * 100) / 100
      : null,
    submittedAt: review.submittedAt?.toISOString() ?? null,
    createdAt: review.createdAt.toISOString(),
    updatedAt: review.updatedAt.toISOString(),
  });
}
