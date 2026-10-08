import { type HydratedDocument, type InferSchemaType, Schema, model } from 'mongoose';
import { tenantGuard } from './plugins/tenant-guard.js';

export const REVIEW_STATUSES = ['pending', 'submitted'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

// Sub-schemas for EMBEDDED documents. They live inside the review document
// itself, so there's no separate collection, no join, and they're read and
// written atomically with their parent.
const scoreSchema = new Schema(
  {
    competency: { type: String, required: true },
    score: { type: Number, required: true, min: 1, max: 5 },
  },
  // Scores are identified by their competency name, so they don't need an id.
  { _id: false },
);

const answerSchema = new Schema({
  question: { type: String, required: true },
  answer: { type: String, default: '', trim: true, maxlength: 5000 },
});

/**
 * EMBED (answers, scores) vs REFERENCE (feedback, see feedback.model.ts):
 * answers belong to exactly one review, are always shown with it, are never
 * queried on their own, and are bounded (one per cycle question). So they're
 * embedded: one read loads the whole review, and one write updates it
 * atomically.
 */
const reviewSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    cycleId: { type: Schema.Types.ObjectId, ref: 'ReviewCycle', required: true },
    /** Who is being reviewed. */
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Who writes the review: the employee's manager when the cycle was activated. */
    reviewerId: { type: Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: REVIEW_STATUSES, required: true, default: 'pending' },
    /** Set when the cycle closes (phase 6): a locked review can't change any more. */
    locked: { type: Boolean, required: true, default: false },
    scores: { type: [scoreSchema], default: [] },
    answers: { type: [answerSchema], default: [] },
    submittedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reviewSchema.plugin(tenantGuard);

// ONE review per employee per cycle, enforced by the database. Concurrent
// "create review" requests can't produce duplicates, which an
// application-level "check if exists, then insert" can't guarantee.
reviewSchema.index({ organizationId: 1, cycleId: 1, employeeId: 1 }, { unique: true });
// "My pending reviews" for a manager.
reviewSchema.index({ organizationId: 1, reviewerId: 1, status: 1 });

export type Review = InferSchemaType<typeof reviewSchema>;
export type ReviewDocument = HydratedDocument<Review>;

export const ReviewModel = model('Review', reviewSchema);
