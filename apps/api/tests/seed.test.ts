import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { SEED_PASSWORD, seed } from '../scripts/seed.js';
import { createApp } from '../src/app.js';
import { FeedbackModel } from '../src/models/feedback.model.js';
import { OrganizationModel } from '../src/models/organization.model.js';
import { UserModel } from '../src/models/user.model.js';
import { useTestDb } from './helpers/db.js';

useTestDb();

describe('seed script', () => {
  it('creates two organizations with users that can log in', async () => {
    await seed();

    expect(await OrganizationModel.countDocuments()).toBe(2);
    const eve = await UserModel.findOne({ email: 'eve@acme.test' })
      .setOptions({ skipTenantGuard: true })
      .orFail();
    const manager = await UserModel.findOne({
      _id: eve.managerId,
      organizationId: eve.organizationId,
    }).orFail();
    expect(manager.email).toBe('maria@acme.test');

    const res = await request(createApp())
      .post('/auth/login')
      .send({ email: 'gina@globex.test', password: SEED_PASSWORD });
    expect(res.status).toBe(200);
  });

  it('can run twice (wipes before seeding)', async () => {
    await seed();
    await seed();

    expect(await UserModel.countDocuments().setOptions({ skipTenantGuard: true })).toBe(9);
  });
});

describe('seed script cleanup', () => {
  it('also wipes tenant data created since the last seed', async () => {
    await seed();
    const eve = await UserModel.findOne({ email: 'eve@acme.test' })
      .setOptions({ skipTenantGuard: true })
      .orFail();
    await FeedbackModel.create({
      organizationId: eve.organizationId,
      employeeId: eve._id,
      authorId: eve._id,
      text: 'Stale feedback',
    });

    await seed();

    expect(await FeedbackModel.countDocuments().setOptions({ skipTenantGuard: true })).toBe(0);
  });
});
