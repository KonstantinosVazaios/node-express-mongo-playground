import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import type { Types } from 'mongoose';
import { z } from 'zod';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';
import type { Organization } from '../models/organization.model.js';
import { UserModel } from '../models/user.model.js';
import type { MeResponse } from '../schemas/auth.schema.js';
import { RoleSchema, type UserDto, toUserDto } from '../schemas/user.schema.js';
import type { AuthUser } from '../types/auth.js';

// A service is just a module of functions. Node caches modules after the
// first import, so every importer shares the same instance: no DI container
// or singleton registration needed (unlike Laravel's service container or
// FastAPI's Depends).

const TokenPayloadSchema = z.object({
  sub: z.string(),
  org: z.string(),
  role: RoleSchema,
});

export type TokenPayload = z.infer<typeof TokenPayloadSchema>;

// Same message for "no such email" and "wrong password", so the API doesn't
// reveal which emails have accounts.
const INVALID_CREDENTIALS = 'Invalid email or password';

// When the email doesn't exist we still run one bcrypt.compare against this
// hash, so both failure paths take the same ~250ms. Otherwise response
// timing would leak which emails exist. Computed lazily, once.
let dummyHash: Promise<string> | undefined;
const getDummyHash = () => (dummyHash ??= bcrypt.hash('dummy-password', env.BCRYPT_ROUNDS));

export async function login(
  email: string,
  password: string,
): Promise<{ user: UserDto; token: string }> {
  // The one legitimately cross-tenant query: before login we don't know the
  // user's organization yet (emails are globally unique).
  const user = await UserModel.findOne({ email })
    .select('+password')
    .setOptions({ skipTenantGuard: true });

  // bcrypt.compare is async: the hashing runs on libuv's thread pool, so the
  // event loop keeps serving other requests during those ~250ms.
  const valid = await bcrypt.compare(password, user?.password ?? (await getDummyHash()));
  if (!user || !valid) throw new UnauthorizedError(INVALID_CREDENTIALS);

  return { user: toUserDto(user), token: signToken(user._id.toString(), user) };
}

export function signToken(
  userId: string,
  claims: { organizationId: { toString(): string }; role: string },
): string {
  const payload = { org: claims.organizationId.toString(), role: claims.role };
  return jwt.sign(payload, env.JWT_SECRET, {
    subject: userId,
    expiresIn: env.JWT_TTL_SECONDS,
    algorithm: 'HS256',
  });
}

export function verifyToken(token: string): TokenPayload {
  try {
    // Pin the algorithm. Never let the token's own header choose it
    // (the classic "alg: none" / algorithm-confusion attacks).
    const decoded = jwt.verify(token, env.JWT_SECRET, { algorithms: ['HS256'] });
    // A valid signature proves who issued the token, not what shape it has.
    // Zod checks the claims too.
    return TokenPayloadSchema.parse(decoded);
  } catch {
    throw new UnauthorizedError('Invalid or expired session');
  }
}

/**
 * Token -> current user. Runs on EVERY authenticated request.
 *
 * We could trust the JWT claims alone (fully stateless, no DB hit), but then
 * a deleted user or a changed role would keep working until the token
 * expires. One indexed lookup by _id is cheap, so we pay it.
 *
 * .lean() returns a plain JS object instead of a Mongoose document: no change
 * tracking, no getters/virtuals/save(), several times faster and lighter.
 * That's the right choice for read-only data we don't modify.
 */
export async function getSessionUser(token: string): Promise<AuthUser> {
  const payload = verifyToken(token);
  const user = await UserModel.findOne({ _id: payload.sub, organizationId: payload.org }).lean();
  if (!user) throw new UnauthorizedError('Session is no longer valid');

  return {
    id: user._id.toString(),
    organizationId: user.organizationId.toString(),
    role: RoleSchema.parse(user.role),
    managerId: user.managerId?.toString() ?? null,
    email: user.email,
  };
}

/**
 * populate() replaces the organizationId ObjectId with the Organization
 * document by running a SECOND query, like Eloquent's eager loading
 * (User::with('organization')). It is not a SQL JOIN; the server-side
 * equivalent of a join is $lookup in an aggregation pipeline (later).
 */
export async function getMe(actor: AuthUser): Promise<MeResponse> {
  const user = await UserModel.findOne({ _id: actor.id, organizationId: actor.organizationId })
    .populate<{ organizationId: Organization & { _id: Types.ObjectId } }>(
      'organizationId',
      'name slug',
    )
    .orFail(new UnauthorizedError());
  const organization = user.organizationId;

  return {
    user: toUserDto({ ...user.toObject(), organizationId: organization._id }),
    organization: {
      id: organization._id.toString(),
      name: organization.name,
      slug: organization.slug,
    },
  };
}
