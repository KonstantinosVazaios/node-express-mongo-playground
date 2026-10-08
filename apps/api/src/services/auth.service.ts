import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { z } from 'zod';
import { env } from '../config/env.js';
import { UnauthorizedError } from '../lib/errors.js';
import { UserModel } from '../models/user.model.js';
import { RoleSchema, type UserDto, toUserDto } from '../schemas/user.schema.js';

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
  const user = await UserModel.findOne({ email }).select('+password');

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
