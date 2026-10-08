import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { UserDocument } from '../src/models/user.model.js';
import { useTestDb } from './helpers/db.js';
import { loginAs } from './helpers/auth.js';
import { createOrganization, createUser } from './helpers/factories.js';

useTestDb();

const app = createApp();
let acmeManager: UserDocument;
let acmeEmployee: UserDocument;
let globexEmployee: UserDocument;

beforeEach(async () => {
  const acme = await createOrganization('Acme');
  const globex = await createOrganization('Globex');
  acmeManager = await createUser(acme._id, { role: 'manager' });
  acmeEmployee = await createUser(acme._id, { managerId: acmeManager._id });
  globexEmployee = await createUser(globex._id);
});

describe('GET /users', () => {
  it('requires authentication', async () => {
    expect((await request(app).get('/users')).status).toBe(401);
  });

  it('lists only users of the caller organization, paginated', async () => {
    const agent = await loginAs(app, acmeEmployee);

    const res = await agent.get('/users?pageSize=1');

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ page: 1, pageSize: 1, total: 2, totalPages: 2 });
    expect(res.body.items).toHaveLength(1);
    const all = await agent.get('/users');
    expect(all.body.items.map((u: { id: string }) => u.id)).not.toContain(
      globexEmployee._id.toString(),
    );
  });

  it('filters by role and manager', async () => {
    const agent = await loginAs(app, acmeEmployee);

    const managers = await agent.get('/users?role=manager');
    const team = await agent.get(`/users?managerId=${acmeManager._id.toString()}`);

    expect(managers.body.items).toEqual([expect.objectContaining({ role: 'manager' })]);
    expect(team.body.items).toEqual([expect.objectContaining({ id: acmeEmployee._id.toString() })]);
  });

  it('rejects unknown query parameters', async () => {
    const agent = await loginAs(app, acmeEmployee);

    const res = await agent.get('/users?sort=password');

    expect(res.status).toBe(400);
  });
});

describe('GET /users/:id', () => {
  it('returns a user of the same organization', async () => {
    const agent = await loginAs(app, acmeEmployee);

    const res = await agent.get(`/users/${acmeManager._id.toString()}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({ role: 'manager' });
  });

  it('returns 404 (not 403) for a user of another organization', async () => {
    const agent = await loginAs(app, acmeEmployee);

    const res = await agent.get(`/users/${globexEmployee._id.toString()}`);

    expect(res.status).toBe(404);
    expect(res.body.error.code).toBe('NOT_FOUND');
  });

  it('returns 400 for a malformed id', async () => {
    const agent = await loginAs(app, acmeEmployee);

    const res = await agent.get('/users/not-an-id');

    expect(res.status).toBe(400);
    expect(res.body.error.fields[0]).toMatchObject({ in: 'params', path: 'id' });
  });
});
