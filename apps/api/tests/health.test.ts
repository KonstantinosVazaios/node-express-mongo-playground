import request from 'supertest';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { pingRedis } from '../src/db/redis.js';
import { useTestDb } from './helpers/db.js';

// Mongo is real (in-memory); Redis is mocked. vi.mock is hoisted above the
// imports, so app.ts receives this fake module instead of the real client.
vi.mock('../src/db/redis.js', () => ({ pingRedis: vi.fn() }));

useTestDb();

describe('GET /health', () => {
  beforeEach(() => {
    vi.mocked(pingRedis).mockResolvedValue(undefined);
  });

  it('returns 200 when Mongo and Redis are up', async () => {
    const res = await request(createApp()).get('/health');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ status: 'ok', checks: { mongo: 'up', redis: 'up' } });
  });

  it('returns 503 when a dependency is down', async () => {
    vi.mocked(pingRedis).mockRejectedValue(new Error('ECONNREFUSED'));

    const res = await request(createApp()).get('/health');

    expect(res.status).toBe(503);
    expect(res.body).toMatchObject({ status: 'degraded', checks: { mongo: 'up', redis: 'down' } });
  });
});
