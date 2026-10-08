import type { Types } from 'mongoose';
import { z } from 'zod';
import { FEEDBACK_SOURCES } from '../models/feedback.model.js';
import {
  ObjectIdSchema,
  PaginationQuerySchema,
  type UserRef,
  UserRefSchema,
  paginated,
} from './common.schema.js';

export const FeedbackSourceSchema = z.enum(FEEDBACK_SOURCES);

export const FeedbackSchema = z.object({
  id: z.string(),
  employee: UserRefSchema,
  author: UserRefSchema,
  text: z.string(),
  source: FeedbackSourceSchema,
  createdAt: z.iso.datetime(),
  updatedAt: z.iso.datetime(),
});
export type FeedbackDto = z.infer<typeof FeedbackSchema>;

export const FeedbackListSchema = paginated(FeedbackSchema);
export type FeedbackList = z.infer<typeof FeedbackListSchema>;

const FeedbackTextSchema = z
  .string()
  .trim()
  .min(3, 'Feedback must be at least 3 characters')
  .max(5000, 'Feedback must be at most 5000 characters');

export const CreateFeedbackBodySchema = z.object({
  employeeId: ObjectIdSchema,
  text: FeedbackTextSchema,
  source: FeedbackSourceSchema.default('manual'),
});
export type CreateFeedbackBody = z.infer<typeof CreateFeedbackBodySchema>;

// PATCH semantics: every field optional, but at least one must be present.
// (The employee can't be changed; that would be different feedback.)
export const UpdateFeedbackBodySchema = z
  .object({ text: FeedbackTextSchema.optional(), source: FeedbackSourceSchema.optional() })
  .refine((body) => body.text !== undefined || body.source !== undefined, {
    message: 'Provide at least one field to update',
  });
export type UpdateFeedbackBody = z.infer<typeof UpdateFeedbackBodySchema>;

export const ListFeedbackQuerySchema = z.strictObject({
  ...PaginationQuerySchema.shape,
  /** Full-text search over the feedback text. */
  q: z.string().trim().min(1).max(100).optional(),
  employeeId: ObjectIdSchema.optional(),
});
export type ListFeedbackQuery = z.infer<typeof ListFeedbackQuerySchema>;

/** A user reference after populate({ select: 'firstName lastName' }). */
export interface PopulatedUser {
  _id: Types.ObjectId;
  firstName: string;
  lastName: string;
}

interface FeedbackLike {
  _id: Types.ObjectId;
  employeeId: PopulatedUser | null;
  authorId: PopulatedUser | null;
  text: string;
  source: string;
  createdAt: Date;
  updatedAt: Date;
}

// populate() yields null when the referenced user no longer exists (or was
// filtered out by `match`), so the mapper has to cope.
export function toUserRef(user: PopulatedUser | null): UserRef {
  return user
    ? { id: user._id.toString(), fullName: `${user.firstName} ${user.lastName}` }
    : { id: '', fullName: 'Unknown user' };
}

export function toFeedbackDto(feedback: FeedbackLike): FeedbackDto {
  return FeedbackSchema.parse({
    id: feedback._id.toString(),
    employee: toUserRef(feedback.employeeId),
    author: toUserRef(feedback.authorId),
    text: feedback.text,
    source: feedback.source,
    createdAt: feedback.createdAt.toISOString(),
    updatedAt: feedback.updatedAt.toISOString(),
  });
}
