import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { useTestDb } from './helpers/db.js';
import { TEST_PASSWORD, createOrganization, createUser } from './helpers/factories.js';

// Its own test file on purpose: the limiter's counters live in module memory,
// and Vitest gives every test file a fresh module registry.
useTestDb();

describe('login rate limit', () => {
  it('blocks an IP after 5 failed attempts, even with the right password', async () => {
    const org = await createOrganization();
    const user = await createUser(org._id);
    const app = createApp();

    for (let attempt = 1; attempt <= 5; attempt++) {
      const res = await request(app)
        .post('/auth/login')
        .send({ email: user.email, password: 'wrong' });
      expect(res.status).toBe(401);
    }

    const blocked = await request(app)
      .post('/auth/login')
      .send({ email: user.email, password: TEST_PASSWORD });

    expect(blocked.status).toBe(429);
    expect(blocked.body.error.code).toBe('TOO_MANY_REQUESTS');
    expect(blocked.get('RateLimit-Policy')).toBeDefined();
  });
});
