import { type InferSchemaType, Schema, model } from 'mongoose';

/**
 * A customer of the platform (the "tenant"). Every other document carries an
 * organizationId pointing here, and every query is scoped by it.
 */
const organizationSchema = new Schema(
  {
    name: { type: String, required: true, trim: true, maxlength: 100 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9-]+$/, 'Slug may only contain a-z, 0-9 and dashes'],
    },
  },
  // Adds createdAt / updatedAt and keeps them up to date, like Eloquent's
  // $timestamps.
  { timestamps: true },
);

// The TS type is INFERRED from the schema, so there's no separate interface
// that can drift out of sync with it.
export type Organization = InferSchemaType<typeof organizationSchema>;

export const OrganizationModel = model('Organization', organizationSchema);
