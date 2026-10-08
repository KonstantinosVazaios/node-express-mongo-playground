import type { Aggregate, MongooseDefaultQueryMiddleware, Query, Schema } from 'mongoose';

/**
 * MULTI-TENANCY: the central safety net.
 *
 * Every tenant-owned query must filter by organizationId. Services do that
 * explicitly (`{ _id: id, organizationId: actor.organizationId }`), and this
 * plugin ENFORCES it: a query on a guarded model whose filter lacks a
 * top-level organizationId throws before it reaches MongoDB. A forgotten
 * scope then fails loudly in tests instead of quietly returning another
 * customer's data in production.
 *
 * Why not inject organizationId automatically (an AsyncLocalStorage "current
 * tenant" read by a pre-find hook, like a Laravel global scope)? Because:
 *  - it's invisible: reading a service, you can't see that a query is scoped
 *  - background workers and scripts have no request, so no "current tenant",
 *    and the magic silently does something different there
 *  - when it breaks, it fails OPEN (unscoped), not closed
 * Explicit filter + guard = boring, greppable and fails closed.
 *
 * Escape hatch for the rare legitimate cross-tenant query (login, before we
 * know the tenant; seeding): `.setOptions({ skipTenantGuard: true })`.
 */
const GUARDED_QUERIES: MongooseDefaultQueryMiddleware[] = [
  'countDocuments',
  'deleteMany',
  'deleteOne',
  'distinct',
  'estimatedDocumentCount',
  'find',
  'findOne',
  'findOneAndDelete',
  'findOneAndReplace',
  'findOneAndUpdate',
  'replaceOne',
  'updateMany',
  'updateOne',
];

export class TenantScopeError extends Error {}

export function tenantGuard(schema: Schema) {
  schema.pre(GUARDED_QUERIES, function (this: Query<unknown, unknown>) {
    if (this.getOptions().skipTenantGuard === true) return;
    if (!('organizationId' in this.getFilter())) {
      throw new TenantScopeError(
        `Unscoped query on ${this.model.modelName}: the filter must include organizationId`,
      );
    }
  });

  // Aggregations must start with a $match on organizationId. That is also
  // the fastest pipeline shape: it filters with an index before anything else.
  schema.pre('aggregate', function (this: Aggregate<unknown>) {
    if (this.options.skipTenantGuard === true) return;
    const first = this.pipeline()[0];
    if (!first || !('$match' in first) || !('organizationId' in first.$match)) {
      throw new TenantScopeError(
        'Aggregation pipelines must start with { $match: { organizationId } }',
      );
    }
  });
}
