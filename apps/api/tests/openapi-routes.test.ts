import request from 'supertest';
import { describe, expect, it, vi } from 'vitest';
import { createApp } from '../src/app.js';
import { generateOpenApiDocument } from '../src/openapi/generator.js';

/**
 * The OpenAPI paths and the Express routers are declared in two places
 * (openapi/paths/*.ts and routes/*.ts), sharing the same Zod schemas. This
 * catches the remaining drift: a documented operation that no router
 * actually serves, which would give the frontend a generated function that
 * always 404s.
 */
// /health would otherwise make the real Redis client retry in the background.
vi.mock('../src/db/redis.js', () => ({ pingRedis: vi.fn().mockResolvedValue(undefined) }));

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

describe('every documented operation is routed', () => {
  it.each(operations)('$method $url', async ({ method, url }) => {
    const res = await request(app)[method as 'get'](url);

    // Unauthenticated, so most answer 401/400 (or 200/503 for public ones).
    // What matters is that it's NOT our "Route ... not found" 404.
    expect(res.body?.error?.message ?? '').not.toMatch(/^Route /);
  });
});
