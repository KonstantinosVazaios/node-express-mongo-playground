import { type HydratedDocument, type InferSchemaType, Schema, model } from 'mongoose';
import { FEEDBACK_SOURCES } from '../domain/constants.js';
import { tenantGuard } from './plugins/tenant-guard.js';

/**
 * EMBED vs REFERENCE: Feedback is its own collection that REFERENCES users,
 * while a Review EMBEDS its answers (see review.model.ts). Rules of thumb:
 *  - embed what is owned by one parent, always read together with it, and
 *    bounded in size (a review has ~5-10 answers)
 *  - reference what grows without bound, is queried on its own, or is
 *    shared. Feedback about an employee piles up over years (MongoDB caps a
 *    document at 16 MB), it's searched, paginated and exported on its own,
 *    and the AI summary of ANY review cycle reads it.
 */
const feedbackSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    /** Who the feedback is about. */
    employeeId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    /** Who wrote it: a colleague or the manager. */
    authorId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    text: { type: String, required: true, trim: true, minlength: 3, maxlength: 5000 },
    source: { type: String, enum: FEEDBACK_SOURCES, required: true, default: 'manual' },
  },
  { timestamps: true },
);

feedbackSchema.plugin(tenantGuard);

// Compound index for the hottest query: "feedback about employee X in my
// org, newest first". Field order follows ESR (Equality, Sort, Range):
// equality fields first, then the sort field. The same index also serves
// queries on just { organizationId } (index prefix), so no separate
// single-field index is needed.
feedbackSchema.index({ organizationId: 1, employeeId: 1, createdAt: -1 });

// Text index for ?q= search: tokenizes, stems ("communicating" matches
// "communication") and ranks. A collection can only have ONE text index.
// For fuzzy or typo-tolerant search you'd reach for Atlas Search or
// Elasticsearch instead.
feedbackSchema.index({ text: 'text' });

export type Feedback = InferSchemaType<typeof feedbackSchema>;
export type FeedbackDocument = HydratedDocument<Feedback>;

export const FeedbackModel = model('Feedback', feedbackSchema);
