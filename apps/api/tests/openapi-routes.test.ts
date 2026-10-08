import { beforeEach, describe, expect, it, vi } from 'vitest';
import type TestAgent from 'supertest/lib/agent.js';
import { createApp } from '../src/app.js';
import { generateOpenApiDocument } from '../src/openapi/generator.js';
import { loginAs } from './helpers/auth.js';
import { useTestDb } from './helpers/db.js';
import { createOrganization, createUser } from './helpers/factories.js';

/**
 * The OpenAPI paths and the Express routers are declared in two places
 * (openapi/paths/*.ts and routes/*.ts), sharing the same Zod schemas. This
 * catches the remaining drift: a documented operation that no router
 * actually serves, which would give the frontend a generated function that
 * always 404s.
 *
 * The requests are AUTHENTICATED (as an admin): routers run `authenticate`
 * before route matching, so an anonymous request to a missing route would be
 * answered 401 and the drift would go unnoticed.
 */

// /health would otherwise make the real Redis client retry in the background.
vi.mock('../src/db/redis.js', () => ({ pingRedis: vi.fn().mockResolvedValue(undefined) }));

useTestDb();

const app = createApp();
const document = generateOpenApiDocument();
const anyId = '6650c0ffee0000000000abcd';

const operations = Object.entries(document.paths ?? {}).flatMap(([path, item]) =>
  Object.keys(item ?? {}).map((method) => ({
    method,
    // OpenAPI's /reviews/{id} -> a concrete URL Express can match.
    url: path.replace(/\{[^}]+\}/g, anyId),
  })),
);

let agent: TestAgent;

// beforeEach, not beforeAll: useTestDb() empties every collection after each
// test, which would delete the user and silently turn every request into a 401.
beforeEach(async () => {
  const org = await createOrganization();
  agent = await loginAs(app, await createUser(org._id, { role: 'admin' }));
});

describe('every documented operation is routed', () => {
  it.each(operations)('$method $url', async ({ method, url }) => {
    const res = await agent[method as 'get'](url);

    // 200, 400 (no body sent), 404 "Review not found"... are all fine. Only
    // our catch-all "Route GET /x not found" means nothing is listening.
    expect(res.body?.error?.message ?? '').not.toMatch(/^Route /);
  });
});
