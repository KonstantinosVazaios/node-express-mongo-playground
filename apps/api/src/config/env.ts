import { z } from 'zod';

/**
 * Every environment variable the app reads is declared, typed and validated
 * here, and nowhere else touches process.env.
 *
 * process.env values are always strings (or undefined), so numbers use
 * z.coerce. If anything is invalid the import of this module throws, and the
 * process dies on startup with a readable message. That beats crashing hours
 * later on the first request that happens to need the missing value.
 * (Compare: Laravel's config/*.php + env() fail lazily; pydantic-settings
 * in FastAPI fails fast, just like this.)
 */
const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().min(1).max(65535).default(3000),
  // Must point at a replica set (see docker-compose.yml): transactions need one.
  MONGO_URL: z.string().regex(/^mongodb(\+srv)?:\/\//, 'must be a mongodb:// URL'),
  REDIS_URL: z.string().regex(/^rediss?:\/\//, 'must be a redis:// URL'),
  // Comma-separated list of origins allowed to call the API with cookies,
  // e.g. "http://localhost:5173,http://localhost:8080".
  CORS_ORIGIN: z
    .string()
    .default('http://localhost:5173')
    .transform((value) => value.split(',').map((origin) => origin.trim())),
  // Signs the session JWTs. Anyone holding it can mint a token for any user.
  JWT_SECRET: z.string().min(32, 'JWT_SECRET must be at least 32 characters'),
  JWT_TTL_SECONDS: z.coerce
    .number()
    .int()
    .positive()
    .default(8 * 60 * 60),
  // bcrypt cost factor: each +1 doubles the hashing time. 12 is ~250ms, which
  // is slow on purpose to make brute force expensive. Tests use 4 for speed.
  BCRYPT_ROUNDS: z.coerce.number().int().min(4).max(15).default(12),
  // How many reverse proxies (nginx, a load balancer) sit in front of the API.
  // Express then reads the client IP from X-Forwarded-For. Leave it at 0 when
  // the API is reached directly, or any client could spoof its IP with that
  // header and dodge the rate limiter.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace', 'silent']).default('info'),
});

export type Env = z.infer<typeof EnvSchema>;

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = EnvSchema.safeParse(source);
  if (!result.success) {
    throw new Error(`Invalid environment variables:\n${z.prettifyError(result.error)}`);
  }
  return result.data;
}

export const env = parseEnv(process.env);
