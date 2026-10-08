import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import type { ReviewDocument } from '../src/models/review.model.js';
import type { UserDocument } from '../src/models/user.model.js';
import { loginAs } from './helpers/auth.js';
import { useTestDb } from './helpers/db.js';
import {
  createCycle,
  createFeedback,
  createOrganization,
  createReview,
  createUser,
} from './helpers/factories.js';

useTestDb();

const app = createApp();

// Acme: admin; Maria manages Eve; Mike manages Emma. Globex: Gina manages Gary.
let admin: UserDocument;
let maria: UserDocument;
let eve: UserDocument;
let emma: UserDocument;
let gary: UserDocument;
let eveReview: ReviewDocument;
let emmaReview: ReviewDocument;
let garyReview: ReviewDocument;

beforeEach(async () => {
  const acme = await createOrganization('Acme');
  const globex = await createOrganization('Globex');
  admin = await createUser(acme._id, { role: 'admin' });
  maria = await createUser(acme._id, { role: 'manager' });
  const mike = await createUser(acme._id, { role: 'manager' });
  eve = await createUser(acme._id, { managerId: maria._id });
  emma = await createUser(acme._id, { managerId: mike._id });
  const gina = await createUser(globex._id, { role: 'manager' });
  gary = await createUser(globex._id, { managerId: gina._id });

  const acmeCycle = await createCycle(acme._id, { name: 'Q4 2026' });
  const globexCycle = await createCycle(globex._id);
  eveReview = await createReview(acmeCycle, eve, {
    scores: [
      { competency: 'Communication', score: 4 },
      { competency: 'Ownership', score: 5 },
    ],
  });
  emmaReview = await createReview(acmeCycle, emma);
  garyReview = await createReview(globexCycle, gary);
});

const ids = (res: { body: { items: { id: string }[] } }) => res.body.items.map((r) => r.id).sort();

describe('GET /reviews (role visibility)', () => {
  it('admins see every review in their organization only', async () => {
    const res = await (await loginAs(app, admin)).get('/reviews');

    expect(ids(res)).toEqual([eveReview.id, emmaReview.id].sort());
  });

  it("managers see their direct reports' reviews only", async () => {
    const res = await (await loginAs(app, maria)).get('/reviews');

    expect(ids(res)).toEqual([eveReview.id]);
    expect(res.body.items[0]).toMatchObject({
      cycle: { name: 'Q4 2026', status: 'active' },
      reviewer: { id: maria._id.toString() },
      averageScore: 4.5,
    });
  });

  it('employees see only their own review', async () => {
    const res = await (await loginAs(app, emma)).get('/reviews');

    expect(ids(res)).toEqual([emmaReview.id]);
  });

  it('an employeeId filter narrows but can never widen the scope', async () => {
    const res = await (await loginAs(app, maria)).get(`/reviews?employeeId=${emma._id.toString()}`);

    expect(res.body.items).toEqual([]);
  });

  it('filters by status', async () => {
    const res = await (await loginAs(app, admin)).get('/reviews?status=submitted');

    expect(res.body.items).toEqual([]);
  });
});

describe('GET /reviews/:id', () => {
  it('returns the detail with competencies and the feedback count', async () => {
    await createFeedback(maria, eve);
    await createFeedback(emma, eve);

    const res = await (await loginAs(app, eve)).get(`/reviews/${eveReview.id}`);

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      employee: { id: eve._id.toString() },
      competencies: ['Communication', 'Ownership'],
      feedbackCount: 2,
      answers: [{ question: 'What went well?', answer: '' }],
    });
  });

  it('returns 404 for a review of another organization', async () => {
    const res = await (await loginAs(app, admin)).get(`/reviews/${garyReview.id}`);

    expect(res.status).toBe(404);
  });

  it("returns 403 for a manager opening another team's review", async () => {
    const res = await (await loginAs(app, maria)).get(`/reviews/${emmaReview.id}`);

    expect(res.status).toBe(403);
  });
});

describe('PATCH /reviews/:id', () => {
  const scores = [
    { competency: 'Communication', score: 3 },
    { competency: 'Ownership', score: 4 },
  ];

  it('lets the reviewer update scores and answers', async () => {
    const agent = await loginAs(app, maria);
    const eveAnswerId = eveReview.answers[0]!._id.toString();

    const res = await agent
      .patch(`/reviews/${eveReview.id}`)
      .send({ scores, answers: [{ id: eveAnswerId, answer: 'Led the migration' }] });

    expect(res.status).toBe(200);
    expect(res.body).toMatchObject({
      scores,
      averageScore: 3.5,
      answers: [{ id: eveAnswerId, answer: 'Led the migration' }],
    });
  });

  it('returns 403 for employees (route role check)', async () => {
    const res = await (await loginAs(app, eve)).patch(`/reviews/${eveReview.id}`).send({ scores });

    expect(res.status).toBe(403);
  });

  it('lets an admin edit any review in the organization', async () => {
    const res = await (
      await loginAs(app, admin)
    )
      .patch(`/reviews/${emmaReview.id}`)
      .send({ scores });

    expect(res.status).toBe(200);
  });

  it('rejects competencies that are not part of the cycle, as a field error', async () => {
    const res = await (
      await loginAs(app, maria)
    )
      .patch(`/reviews/${eveReview.id}`)
      .send({ scores: [{ competency: 'Juggling', score: 5 }] });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual([
      expect.objectContaining({ path: 'scores.0.competency' }),
    ]);
  });

  it('returns 409 when the review is locked', async () => {
    eveReview.locked = true;
    await eveReview.save();

    const res = await (
      await loginAs(app, maria)
    )
      .patch(`/reviews/${eveReview.id}`)
      .send({ scores });

    expect(res.status).toBe(409);
  });
});

describe('POST /reviews/:id/submit', () => {
  it('requires every competency to be scored', async () => {
    const res = await (await loginAs(app, admin)).post(`/reviews/${emmaReview.id}/submit`);

    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].message).toBe('Missing scores for: Communication, Ownership');
  });

  it('submits once; afterwards the review is read-only', async () => {
    const agent = await loginAs(app, maria);

    const submitted = await agent.post(`/reviews/${eveReview.id}/submit`);
    const again = await agent.post(`/reviews/${eveReview.id}/submit`);
    const edit = await agent.patch(`/reviews/${eveReview.id}`).send({ scores: [] });

    expect(submitted.status).toBe(200);
    expect(submitted.body).toMatchObject({ status: 'submitted', submittedAt: expect.any(String) });
    expect(again.status).toBe(409);
    expect(edit.status).toBe(409);
  });
});
