import type { Types } from 'mongoose';
import { z } from 'zod';
import { CYCLE_STATUSES } from '../models/review-cycle.model.js';
import { PaginationQuerySchema, paginated } from './common.schema.js';

export const CycleStatusSchema = z.enum(CYCLE_STATUSES);

export const ReviewCycleSchema = z.object({
  id: z.string(),
  name: z.string(),
  status: CycleStatusSchema,
  competencies: z.array(z.string()),
  questions: z.array(z.string()),
  startsAt: z.iso.date().nullable(),
  endsAt: z.iso.date().nullable(),
  closedAt: z.iso.datetime().nullable(),
  createdAt: z.iso.datetime(),
});
export type ReviewCycleDto = z.infer<typeof ReviewCycleSchema>;

export const ReviewCycleListSchema = paginated(ReviewCycleSchema);
export type ReviewCycleList = z.infer<typeof ReviewCycleListSchema>;

const uniqueStrings = (values: string[]) => new Set(values).size === values.length;

export const CreateReviewCycleBodySchema = z
  .object({
    name: z.string().trim().min(2).max(100),
    competencies: z
      .array(z.string().trim().min(2).max(50))
      .min(1, 'Add at least one competency')
      .max(10)
      .refine(uniqueStrings, 'Competencies must be unique'),
    questions: z.array(z.string().trim().min(5).max(200)).max(10).default([]),
    startsAt: z.iso.date().optional(),
    endsAt: z.iso.date().optional(),
  })
  // Cross-field rule: `path` attaches the error to endsAt, so the UI shows it
  // under that input.
  .refine((body) => !body.startsAt || !body.endsAt || body.startsAt <= body.endsAt, {
    message: 'End date must be on or after the start date',
    path: ['endsAt'],
  });
export type CreateReviewCycleBody = z.infer<typeof CreateReviewCycleBodySchema>;

export const ListReviewCyclesQuerySchema = z.strictObject({
  ...PaginationQuerySchema.shape,
  status: CycleStatusSchema.optional(),
});
export type ListReviewCyclesQuery = z.infer<typeof ListReviewCyclesQuerySchema>;

interface ReviewCycleLike {
  _id: Types.ObjectId;
  name: string;
  status: string;
  competencies: string[];
  questions: string[];
  startsAt?: Date | null;
  endsAt?: Date | null;
  closedAt?: Date | null;
  createdAt: Date;
}

const toDateOnly = (date?: Date | null) => date?.toISOString().slice(0, 10) ?? null;

export function toReviewCycleDto(cycle: ReviewCycleLike): ReviewCycleDto {
  return ReviewCycleSchema.parse({
    id: cycle._id.toString(),
    name: cycle.name,
    status: cycle.status,
    competencies: cycle.competencies,
    questions: cycle.questions,
    startsAt: toDateOnly(cycle.startsAt),
    endsAt: toDateOnly(cycle.endsAt),
    closedAt: cycle.closedAt?.toISOString() ?? null,
    createdAt: cycle.createdAt.toISOString(),
  });
}
