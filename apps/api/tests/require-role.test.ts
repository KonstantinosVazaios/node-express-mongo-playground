import express, { type RequestHandler } from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { errorHandler } from '../src/middleware/error-handler.js';
import { requireRole } from '../src/middleware/require-role.js';
import type { Role } from '../src/domain/constants.js';

// Stand-in for `authenticate`: pretend a user with this role is logged in.
const actingAs =
  (role: Role | null): RequestHandler =>
  (req, _res, next) => {
    if (role) {
      req.user = { id: 'u1', organizationId: 'o1', role, managerId: null, email: 'x@test.dev' };
    }
    next();
  };

function appFor(role: Role | null) {
  const app = express();
  app.get('/managers-only', actingAs(role), requireRole('admin', 'manager'), (_req, res) => {
    res.json({ ok: true });
  });
  app.use(errorHandler);
  return app;
}

describe('requireRole()', () => {
  it.each(['admin', 'manager'] as const)('lets a %s through', async (role) => {
    const res = await request(appFor(role)).get('/managers-only');
    expect(res.status).toBe(200);
  });

  it('returns 403 for an employee', async () => {
    const res = await request(appFor('employee')).get('/managers-only');

    expect(res.status).toBe(403);
    expect(res.body.error.code).toBe('FORBIDDEN');
  });

  it('returns 401 when nobody is logged in', async () => {
    const res = await request(appFor(null)).get('/managers-only');
    expect(res.status).toBe(401);
  });
});
