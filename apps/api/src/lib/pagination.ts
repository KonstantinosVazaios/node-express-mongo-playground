import type { Page, PaginationQuery } from '../schemas/common.schema.js';

/** Anything with Mongoose's chainable skip/limit that resolves to an array. */
interface PageableQuery<T> {
  skip(n: number): { limit(n: number): PromiseLike<T[]> };
}

/**
 * Offset pagination used by every list endpoint:
 *
 *   paginate(FeedbackModel.find(filter).sort({ createdAt: -1 }).lean(),
 *            FeedbackModel.countDocuments(filter), query)
 *
 * The page query and the count query are independent, so they run in
 * parallel with Promise.all: one round trip of latency instead of two.
 *
 * Trade-off: skip(N) still makes MongoDB walk past N documents, so deep pages
 * get slower. For infinite scroll over huge collections, cursor ("keyset")
 * pagination (`createdAt < lastSeen`) scales better. For an admin UI with
 * page numbers, offsets are fine.
 */
export async function paginate<T>(
  query: PageableQuery<T>,
  count: PromiseLike<number>,
  { page, pageSize }: PaginationQuery,
): Promise<Page<T>> {
  const [items, total] = await Promise.all([
    query.skip((page - 1) * pageSize).limit(pageSize),
    count,
  ]);
  return { items, page, pageSize, total, totalPages: Math.ceil(total / pageSize) };
}

/** Maps the items of a page (documents -> DTOs) and keeps the metadata. */
export function mapPage<T, U>(page: Page<T>, map: (item: T) => U): Page<U> {
  return { ...page, items: page.items.map(map) };
}
