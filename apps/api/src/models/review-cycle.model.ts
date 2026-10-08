import { type HydratedDocument, type InferSchemaType, Schema, model } from 'mongoose';
import { tenantGuard } from './plugins/tenant-guard.js';

/** draft -> active -> closed. Only forward; a closed cycle is read-only. */
export const CYCLE_STATUSES = ['draft', 'active', 'closed'] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];

const reviewCycleSchema = new Schema(
  {
    organizationId: { type: Schema.Types.ObjectId, ref: 'Organization', required: true },
    name: { type: String, required: true, trim: true, maxlength: 100 },
    status: { type: String, enum: CYCLE_STATUSES, required: true, default: 'draft' },
    /** What every review in this cycle scores, 1-5 each (e.g. "Communication"). */
    competencies: {
      type: [String],
      validate: {
        validator: (values: string[]) => values.length > 0,
        message: 'A cycle needs at least one competency',
      },
    },
    /** Open questions copied into every review as empty answers on activation. */
    questions: { type: [String], default: [] },
    startsAt: { type: Date, default: null },
    endsAt: { type: Date, default: null },
    closedAt: { type: Date, default: null },
  },
  { timestamps: true },
);

reviewCycleSchema.plugin(tenantGuard);

// A unique COMPOUND index: names only need to be unique within one
// organization. A duplicate insert fails with E11000, which the error
// handler turns into a 409.
reviewCycleSchema.index({ organizationId: 1, name: 1 }, { unique: true });
// The reminder job (phase 7) looks for active cycles across organizations.
reviewCycleSchema.index({ status: 1 });

export type ReviewCycle = InferSchemaType<typeof reviewCycleSchema>;
export type ReviewCycleDocument = HydratedDocument<ReviewCycle>;

export const ReviewCycleModel = model('ReviewCycle', reviewCycleSchema);
