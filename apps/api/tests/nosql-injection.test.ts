import express from 'express';
import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { UserModel, type UserDocument } from '../src/models/user.model.js';
import { loginAs } from './helpers/auth.js';
import { useTestDb } from './helpers/db.js';
import { createOrganization, createUser } from './helpers/factories.js';

/**
 * NoSQL injection: if user input reaches a Mongo filter unchecked, an OBJECT
 * where a string was expected turns into a query operator:
 *
 *   POST /auth/login  { "email": { "$ne": null }, "password": ... }
 *   -> UserModel.findOne({ email: { $ne: null } })  = "any user at all"
 *
 * Defence: every input is parsed by a Zod schema that says "this is a
 * string" (or an ObjectId string), so objects never get through.
 */
useTestDb();

const app = createApp();
let user: UserDocument;

beforeEach(async () => {
  const org = await createOrganization();
  user = await createUser(org._id);
});

describe('NoSQL injection', () => {
  it('the raw payload WOULD match a user if it reached Mongo unvalidated', async () => {
    const attack = { $ne: null };

    const found = await UserModel.findOne({ email: attack }).setOptions({ skipTenantGuard: true });

    expect(found?.email).toBe(user.email); // this is why validation matters
  });

  it('rejects operator objects in the login body', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: { $ne: null }, password: { $ne: null } });

    expect(res.status).toBe(400);
    expect(res.get('Set-Cookie')).toBeUndefined();
    expect(res.body.error.fields).toEqual([
      expect.objectContaining({ path: 'email', message: expect.stringMatching(/expected string/) }),
      expect.objectContaining({
        path: 'password',
        message: expect.stringMatching(/expected string/),
      }),
    ]);
  });

  it('rejects operator objects where an id is expected', async () => {
    const agent = await loginAs(app, user);

    const res = await agent.post('/feedback').send({ employeeId: { $gt: '' }, text: 'Hello' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields[0]).toMatchObject({ path: 'employeeId' });
  });

  it('Express 5 does not turn query strings into nested objects', async () => {
    // Express 4's default "extended" parser (qs) turned ?a[$ne]=x into
    // { a: { $ne: 'x' } }. Express 5 defaults to the "simple" parser, which
    // keeps it as a flat key. One less injection vector, out of the box.
    const echo = express().get('/', (req, res) => res.json(req.query));

    const res = await request(echo).get('/?employeeId[$ne]=x');

    expect(res.body).toEqual({ 'employeeId[$ne]': 'x' });
  });

  it('rejects operator-looking query params (strict query schemas)', async () => {
    const agent = await loginAs(app, user);

    const res = await agent.get('/feedback?employeeId[$ne]=x');

    expect(res.status).toBe(400);
    expect(res.body.error.fields[0].message).toMatch(/Unrecognized key/);
  });
});
