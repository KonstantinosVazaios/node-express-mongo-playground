import type { QueryFilter } from 'mongoose';
import { NotFoundError } from '../lib/errors.js';
import { mapPage, paginate } from '../lib/pagination.js';
import { type User, UserModel } from '../models/user.model.js';
import type { Page } from '../schemas/common.schema.js';
import { type ListUsersQuery, type UserDto, toUserDto } from '../schemas/user.schema.js';
import type { AuthUser } from '../types/auth.js';

/**
 * The company directory: every user can see who works in THEIR organization
 * (names and roles are not sensitive here). Feedback and reviews have
 * stricter rules, see access.service.ts.
 */
export async function listUsers(actor: AuthUser, query: ListUsersQuery): Promise<Page<UserDto>> {
  const filter: QueryFilter<User> = {
    organizationId: actor.organizationId,
    ...(query.role && { role: query.role }),
    ...(query.managerId && { managerId: query.managerId }),
  };

  const page = await paginate(
    UserModel.find(filter).sort({ lastName: 1, firstName: 1 }).lean(),
    UserModel.countDocuments(filter),
    query,
  );
  return mapPage(page, toUserDto);
}

export async function getUser(actor: AuthUser, id: string): Promise<UserDto> {
  // _id AND organizationId: a valid id from another tenant simply doesn't
  // match, so the caller gets a 404, exactly as if it didn't exist. A 403
  // would confirm that the id exists somewhere, which is an information
  // leak across tenants.
  const user = await UserModel.findOne({ _id: id, organizationId: actor.organizationId }).lean();
  if (!user) throw new NotFoundError('User');
  return toUserDto(user);
}
