import { z } from 'zod';
import { OrganizationSchema } from './organization.schema.js';
import { UserSchema } from './user.schema.js';

export const LoginBodySchema = z
  .object({
    // z.email() also rejects objects like { "$ne": null }: only a real string
    // can ever reach the database query (NoSQL injection, see phase 3).
    email: z.email().toLowerCase(),
    password: z.string().min(1, 'Password is required').max(200),
  })
  .meta({ id: 'LoginRequest' });

export const AuthUserResponseSchema = z
  .object({ user: UserSchema })
  .meta({ id: 'AuthUserResponse' });

export const MeResponseSchema = z
  .object({
    user: UserSchema,
    organization: OrganizationSchema,
  })
  .meta({ id: 'MeResponse' });

export type LoginBody = z.infer<typeof LoginBodySchema>;
export type AuthUserResponse = z.infer<typeof AuthUserResponseSchema>;
export type MeResponse = z.infer<typeof MeResponseSchema>;
