import { z } from 'zod';

/**
 * A MongoDB ObjectId as it travels over HTTP: a 24-char hex string.
 *
 * Typing ids as strings is ALSO the NoSQL-injection defence: a payload like
 * { "employeeId": { "$ne": null } } is an object, not a string, so it fails
 * here and never reaches a Mongo query (where $ne would turn the filter into
 * "match anything").
 */
export const ObjectIdSchema = z
  .string()
  // No /i flag: regex flags can't be expressed in an OpenAPI `pattern`, so
  // both cases are spelled out instead.
  .regex(/^[a-fA-F\d]{24}$/, 'Invalid id')
  .meta({
    description: 'MongoDB ObjectId (24 hex characters)',
    example: '6650c0ffee0000000000abcd',
  });

export const IdParamsSchema = z.object({ id: ObjectIdSchema });
export type IdParams = z.infer<typeof IdParamsSchema>;

export const PaginationQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
});
export type PaginationQuery = z.infer<typeof PaginationQuerySchema>;

/** Builds the response schema of a paginated list, e.g. paginated(FeedbackSchema). */
export function paginated<T extends z.ZodType>(item: T) {
  return z.object({
    items: z.array(item),
    page: z.number().int(),
    pageSize: z.number().int(),
    total: z.number().int(),
    totalPages: z.number().int(),
  });
}

export interface Page<T> {
  items: T[];
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
}

/** A user as embedded in other resources ("written by", "about"). */
export const UserRefSchema = z
  .object({ id: z.string(), fullName: z.string() })
  .meta({ id: 'UserRef' });
export type UserRef = z.infer<typeof UserRefSchema>;
