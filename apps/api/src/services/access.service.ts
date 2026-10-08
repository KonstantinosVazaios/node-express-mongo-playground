import { Types } from 'mongoose';
import { UserModel } from '../models/user.model.js';
import type { AuthUser } from '../types/auth.js';

/**
 * WHO MAY SEE WHOSE DATA: the one place that answers it (think Laravel
 * Policies/Gates, or a FastAPI dependency returning a filter).
 *
 *   admin     everyone in their organization
 *   manager   themselves + their DIRECT reports
 *   employee  only themselves
 *
 * Feedback and review services build their Mongo filters from these
 * functions instead of re-implementing the rules, so a rule changes in one
 * place. Tenant scoping (organizationId) is always included.
 */
export async function visibleEmployeeIds(actor: AuthUser): Promise<Types.ObjectId[] | 'all'> {
  if (actor.role === 'admin') return 'all';

  const self = new Types.ObjectId(actor.id);
  if (actor.role === 'employee') return [self];

  const reports = await UserModel.find({
    organizationId: actor.organizationId,
    managerId: actor.id,
  })
    .select('_id')
    .lean();
  return [self, ...reports.map((report) => report._id)];
}

/**
 * Mongo filter limiting a collection to what the actor may see, e.g.
 * `{ organizationId, employeeId: { $in: [...] } }`.
 */
export async function employeeScope(
  actor: AuthUser,
  field = 'employeeId',
): Promise<Record<string, unknown>> {
  const visible = await visibleEmployeeIds(actor);
  return {
    organizationId: actor.organizationId,
    ...(visible !== 'all' && { [field]: { $in: visible } }),
  };
}

export async function canSeeEmployee(actor: AuthUser, employeeId: string): Promise<boolean> {
  const visible = await visibleEmployeeIds(actor);
  return visible === 'all' || visible.some((id) => id.equals(employeeId));
}
