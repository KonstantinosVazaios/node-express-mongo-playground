import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ReviewModel } from '../src/models/review.model.js';
import type { UserDocument } from '../src/models/user.model.js';
import { loginAs } from './helpers/auth.js';
import { useTestDb } from './helpers/db.js';
import { createOrganization, createUser } from './helpers/factories.js';

useTestDb();

const app = createApp();
let admin: UserDocument;
let employee: UserDocument;
let otherAdmin: UserDocument;

const validCycle = {
  name: 'Q4 2026',
  competencies: ['Communication', 'Ownership'],
  questions: ['What went well this quarter?'],
  startsAt: '2026-10-01',
  endsAt: '2026-12-31',
};

beforeEach(async () => {
  const acme = await createOrganization('Acme');
  const globex = await createOrganization('Globex');
  admin = await createUser(acme._id, { role: 'admin' });
  employee = await createUser(acme._id);
  otherAdmin = await createUser(globex._id, { role: 'admin' });
});

describe('POST /review-cycles', () => {
  it('lets an admin create a draft cycle', async () => {
    const res = await (await loginAs(app, admin)).post('/review-cycles').send(validCycle);

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({
      name: 'Q4 2026',
      status: 'draft',
      competencies: ['Communication', 'Ownership'],
      startsAt: '2026-10-01',
      endsAt: '2026-12-31',
    });
  });

  it('returns 403 for non-admins (role permission)', async () => {
    const res = await (await loginAs(app, employee)).post('/review-cycles').send(validCycle);

    expect(res.status).toBe(403);
  });

  it('validates cross-field rules and attaches the error to the right field', async () => {
    const res = await (
      await loginAs(app, admin)
    )
      .post('/review-cycles')
      .send({ ...validCycle, competencies: ['Ownership', 'Ownership'], endsAt: '2026-09-01' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.map((f: { path: string }) => f.path).sort()).toEqual([
      'competencies',
      'endsAt',
    ]);
  });

  it('returns 409 for a duplicate name in the same org, but allows it in another org', async () => {
    const agent = await loginAs(app, admin);
    await agent.post('/review-cycles').send(validCycle).expect(201);

    const duplicate = await agent.post('/review-cycles').send(validCycle);
    const otherOrg = await (await loginAs(app, otherAdmin)).post('/review-cycles').send(validCycle);

    expect(duplicate.status).toBe(409);
    expect(otherOrg.status).toBe(201);
  });
});

describe('GET /review-cycles', () => {
  it('lists the cycles of the caller organization for every role', async () => {
    await (await loginAs(app, admin)).post('/review-cycles').send(validCycle);
    await (
      await loginAs(app, otherAdmin)
    )
      .post('/review-cycles')
      .send({ ...validCycle, name: 'Globex' });

    const res = await (await loginAs(app, employee)).get('/review-cycles?status=draft');

    expect(res.status).toBe(200);
    expect(res.body.items.map((c: { name: string }) => c.name)).toEqual(['Q4 2026']);
  });

  it('returns 404 for a cycle of another organization', async () => {
    const created = await (await loginAs(app, otherAdmin)).post('/review-cycles').send(validCycle);

    const res = await (await loginAs(app, admin)).get(`/review-cycles/${created.body.id}`);

    expect(res.status).toBe(404);
  });
});

describe('POST /review-cycles/:id/activate', () => {
  it('activates a draft cycle and creates one review per managed employee', async () => {
    const org = admin.organizationId;
    const manager = await createUser(org, { role: 'manager' });
    const report = await createUser(org, { managerId: manager._id });
    const agent = await loginAs(app, admin);
    const cycle = await agent.post('/review-cycles').send(validCycle);

    const res = await agent.post(`/review-cycles/${cycle.body.id}/activate`);

    expect(res.status).toBe(200);
    expect(res.body.status).toBe('active');
    const reviews = await ReviewModel.find({ organizationId: org }).lean();
    // Only `report` has a manager (admin, employee and manager don't).
    expect(reviews).toHaveLength(1);
    expect(reviews[0]).toMatchObject({
      employeeId: report._id,
      reviewerId: manager._id,
      status: 'pending',
      answers: [expect.objectContaining({ question: 'What went well this quarter?', answer: '' })],
    });
  });

  it('refuses to activate twice (409)', async () => {
    const agent = await loginAs(app, admin);
    const cycle = await agent.post('/review-cycles').send(validCycle);
    await agent.post(`/review-cycles/${cycle.body.id}/activate`).expect(200);

    const again = await agent.post(`/review-cycles/${cycle.body.id}/activate`);

    expect(again.status).toBe(409);
  });

  it('is admin-only', async () => {
    const cycle = await (await loginAs(app, admin)).post('/review-cycles').send(validCycle);

    const res = await (
      await loginAs(app, employee)
    ).post(`/review-cycles/${cycle.body.id}/activate`);

    expect(res.status).toBe(403);
  });
});
