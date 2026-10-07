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
