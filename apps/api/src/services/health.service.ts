import { pingMongo } from '../db/mongo.js';
import { pingRedis } from '../db/redis.js';

import type { HealthReport } from '../schemas/health.schema.js';

const CHECK_TIMEOUT_MS = 1_000;

/**
 * A health check must answer quickly even when a dependency is hanging.
 * For example, the Redis client retries forever while Redis is down
 * (maxRetriesPerRequest: null), so a bare `await redis.ping()` would never
 * settle. Promise.race against a timer caps every check.
 */
function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: NodeJS.Timeout | undefined;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`Timed out after ${ms}ms`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

export async function checkHealth(): Promise<HealthReport> {
  // allSettled (not Promise.all): we want the result of EVERY check, and one
  // failure must not short-circuit the others.
  const [mongo, redis] = await Promise.allSettled([
    withTimeout(pingMongo(), CHECK_TIMEOUT_MS),
    withTimeout(pingRedis(), CHECK_TIMEOUT_MS),
  ]);

  const checks = {
    mongo: mongo.status === 'fulfilled' ? 'up' : 'down',
    redis: redis.status === 'fulfilled' ? 'up' : 'down',
  } as const;

  return {
    status: checks.mongo === 'up' && checks.redis === 'up' ? 'ok' : 'degraded',
    uptimeSeconds: Math.round(process.uptime()),
    checks,
  };
}
