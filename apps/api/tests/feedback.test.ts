import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { FeedbackModel } from '../src/models/feedback.model.js';
import type { UserDocument } from '../src/models/user.model.js';
import { loginAs } from './helpers/auth.js';
import { useTestDb } from './helpers/db.js';
import { createFeedback, createOrganization, createUser } from './helpers/factories.js';

useTestDb();

const app = createApp();

// Acme: admin; Maria manages Eve; Mike manages Emma. Globex: Gary.
let admin: UserDocument;
let maria: UserDocument;
let eve: UserDocument;
let mike: UserDocument;
let emma: UserDocument;
let gary: UserDocument;

beforeEach(async () => {
  const acme = await createOrganization('Acme');
  const globex = await createOrganization('Globex');
  admin = await createUser(acme._id, { role: 'admin' });
  maria = await createUser(acme._id, { role: 'manager' });
  mike = await createUser(acme._id, { role: 'manager' });
  eve = await createUser(acme._id, { managerId: maria._id });
  emma = await createUser(acme._id, { managerId: mike._id });
  gary = await createUser(globex._id);
});

const ids = (res: { body: { items: { id: string }[] } }) => res.body.items.map((f) => f.id).sort();

describe('POST /feedback', () => {
  it('creates feedback written by the caller', async () => {
    const agent = await loginAs(app, emma);

    const res = await agent
      .post('/feedback')
      .send({ employeeId: eve._id.toString(), text: '  Super helpful in code review  ' });

    expect(res.status).toBe(201);
    expect(res.get('Location')).toBe(`/feedback/${res.body.id}`);
    expect(res.body).toMatchObject({
      text: 'Super helpful in code review',
      source: 'manual',
      employee: { id: eve._id.toString(), fullName: 'Test User' },
      author: { id: emma._id.toString() },
    });
  });

  it('returns field errors from the Zod schema', async () => {
    const agent = await loginAs(app, emma);

    const res = await agent
      .post('/feedback')
      .send({ employeeId: 'nope', text: 'x', source: 'fax' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields.map((f: { path: string }) => f.path)).toEqual([
      'employeeId',
      'text',
      'source',
    ]);
  });

  it('returns business-rule errors as field errors too', async () => {
    const agent = await loginAs(app, emma);

    const toSelf = await agent
      .post('/feedback')
      .send({ employeeId: emma._id.toString(), text: 'Me!' });
    const otherTenant = await agent
      .post('/feedback')
      .send({ employeeId: gary._id.toString(), text: 'Hello Globex' });

    expect(toSelf.body.error.fields).toEqual([
      { in: 'body', path: 'employeeId', message: 'You cannot give feedback to yourself' },
    ]);
    expect(otherTenant.body.error.fields).toEqual([
      { in: 'body', path: 'employeeId', message: 'Employee not found' },
    ]);
  });
});

describe('GET /feedback (visibility)', () => {
  let aboutEve: string;
  let aboutEmma: string;
  let byEveAboutEmma: string;
  let globexFeedback: string;

  beforeEach(async () => {
    aboutEve = (await createFeedback(maria, eve, 'Eve owns her projects')).id;
    aboutEmma = (await createFeedback(mike, emma, 'Emma communicates clearly')).id;
    byEveAboutEmma = (await createFeedback(eve, emma, 'Emma helped me debug')).id;
    globexFeedback = (await createFeedback(gary, gary, 'Globex internal')).id;
  });

  it('admins see all feedback in their organization, and nothing from others', async () => {
    const res = await (await loginAs(app, admin)).get('/feedback');

    expect(ids(res)).toEqual([aboutEve, aboutEmma, byEveAboutEmma].sort());
    expect(ids(res)).not.toContain(globexFeedback);
  });

  it("managers see their direct reports' feedback only", async () => {
    const res = await (await loginAs(app, maria)).get('/feedback');

    expect(ids(res)).toEqual([aboutEve]);
  });

  it('employees see feedback about themselves and feedback they wrote', async () => {
    const res = await (await loginAs(app, eve)).get('/feedback');

    expect(ids(res)).toEqual([aboutEve, byEveAboutEmma].sort());
  });

  it('cannot widen visibility with the employeeId filter', async () => {
    const res = await (
      await loginAs(app, maria)
    ).get(`/feedback?employeeId=${emma._id.toString()}`);

    expect(res.status).toBe(200);
    expect(res.body.items).toEqual([]);
  });

  it('searches the text index', async () => {
    const res = await (await loginAs(app, admin)).get('/feedback?q=communication');

    expect(ids(res)).toEqual([aboutEmma]);
  });

  it('paginates newest first', async () => {
    const agent = await loginAs(app, admin);

    const first = await agent.get('/feedback?pageSize=2&page=1');
    const second = await agent.get('/feedback?pageSize=2&page=2');

    expect(first.body).toMatchObject({ total: 3, totalPages: 2 });
    expect(first.body.items.map((f: { id: string }) => f.id)).toEqual([byEveAboutEmma, aboutEmma]);
    expect(second.body.items.map((f: { id: string }) => f.id)).toEqual([aboutEve]);
  });
});

describe('GET /feedback/:id', () => {
  it('returns 404 for feedback of another organization (not 403)', async () => {
    const globex = await createFeedback(gary, gary);

    const res = await (await loginAs(app, admin)).get(`/feedback/${globex.id}`);

    expect(res.status).toBe(404);
  });

  it("returns 403 for a manager reading another team's feedback", async () => {
    const aboutEmma = await createFeedback(mike, emma);

    const res = await (await loginAs(app, maria)).get(`/feedback/${aboutEmma.id}`);

    expect(res.status).toBe(403);
  });

  it('lets the author read what they wrote', async () => {
    const byEve = await createFeedback(eve, emma);

    const res = await (await loginAs(app, eve)).get(`/feedback/${byEve.id}`);

    expect(res.status).toBe(200);
    expect(await FeedbackModel.countDocuments({ organizationId: eve.organizationId })).toBe(1);
  });
});
