import type { Types } from 'mongoose';
import { z } from 'zod';
import { ROLES } from '../models/user.model.js';
import { ObjectIdSchema, PaginationQuerySchema, paginated } from './common.schema.js';

export const RoleSchema = z.enum(ROLES);

/** What the API returns for a user. The password hash is simply not part of it. */
export const UserSchema = z.object({
  id: z.string(),
  organizationId: z.string(),
  email: z.string(),
  firstName: z.string(),
  lastName: z.string(),
  fullName: z.string(),
  role: RoleSchema,
  managerId: z.string().nullable(),
});

export type UserDto = z.infer<typeof UserSchema>;

export const UserListSchema = paginated(UserSchema);
export type UserList = z.infer<typeof UserListSchema>;

// strictObject: unknown query params are a 400, not silently ignored. It also
// makes probes like ?role[$ne]=x fail loudly (see the NoSQL injection tests).
export const ListUsersQuerySchema = z.strictObject({
  ...PaginationQuerySchema.shape,
  role: RoleSchema.optional(),
  managerId: ObjectIdSchema.optional(),
});
export type ListUsersQuery = z.infer<typeof ListUsersQuerySchema>;

interface UserLike {
  _id: Types.ObjectId;
  organizationId: Types.ObjectId;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  managerId?: Types.ObjectId | null;
}

/**
 * Document -> response DTO. Laravel would use an API Resource
 * (UserResource::toArray) here.
 *
 * Listing fields explicitly (an allow-list) is safer than serializing the
 * whole document: a field added to the model later doesn't leak by accident.
 * Works for hydrated documents AND .lean() objects, where toJSON transforms
 * and virtuals don't run. The final .parse() checks at runtime that the
 * response really matches the schema we document.
 */
export function toUserDto(user: UserLike): UserDto {
  return UserSchema.parse({
    id: user._id.toString(),
    organizationId: user.organizationId.toString(),
    email: user.email,
    firstName: user.firstName,
    lastName: user.lastName,
    fullName: `${user.firstName} ${user.lastName}`,
    role: user.role,
    managerId: user.managerId?.toString() ?? null,
  });
}
