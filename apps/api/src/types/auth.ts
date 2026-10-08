import type { Role } from '../domain/constants.js';

/** The authenticated user, as attached to `req.user` by the authenticate middleware. */
export interface AuthUser {
  id: string;
  organizationId: string;
  role: Role;
  managerId: string | null;
  email: string;
}
