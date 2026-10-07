import { Redis } from 'ioredis';
import { env } from '../config/env.js';
import { logger } from '../lib/logger.js';

/**
 * Shared Redis client (BullMQ queues will reuse this connection config).
 *
 * - lazyConnect: creating the client does NOT open a socket. Importing this
 *   module (e.g. from a test) has no side effects; server.ts connects
 *   explicitly on startup.
 * - maxRetriesPerRequest: null tells ioredis to keep retrying a command while
 *   Redis is unavailable instead of failing it after 20 attempts. BullMQ
 *   requires this for the connections its workers use, because a worker
 *   blocks on Redis waiting for jobs.
 */
export const redis = new Redis(env.REDIS_URL, {
  lazyConnect: true,
  maxRetriesPerRequest: null,
});

redis.on('error', (err) => logger.error({ err }, 'Redis error'));

export async function connectRedis(): Promise<void> {
  await redis.connect();
  logger.info('Redis connected');
}

export async function disconnectRedis(): Promise<void> {
  // quit() waits for pending replies before closing; disconnect() would drop them.
  await redis.quit();
}

export async function pingRedis(): Promise<void> {
  await redis.ping();
}
