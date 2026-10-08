import request from 'supertest';
import { beforeEach, describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { UserModel } from '../src/models/user.model.js';
import { useTestDb } from './helpers/db.js';
import { TEST_PASSWORD, createOrganization, createUser } from './helpers/factories.js';

useTestDb();

const app = createApp();
const email = 'maria@acme.test';

beforeEach(async () => {
  const org = await createOrganization();
  await createUser(org._id, { email, role: 'manager' });
});

describe('POST /auth/login', () => {
  it('sets an httpOnly session cookie and returns the user without the password', async () => {
    const res = await request(app).post('/auth/login').send({ email, password: TEST_PASSWORD });

    expect(res.status).toBe(200);
    expect(res.body.user).toMatchObject({ email, role: 'manager', fullName: 'Test User' });
    expect(res.body.user).not.toHaveProperty('password');

    const cookie = res.get('Set-Cookie')?.[0] ?? '';
    expect(cookie).toMatch(/^hr_session=/);
    expect(cookie).toContain('HttpOnly');
    expect(cookie).toContain('SameSite=Lax');
  });

  it('accepts the email case-insensitively', async () => {
    const res = await request(app)
      .post('/auth/login')
      .send({ email: 'MARIA@acme.test', password: TEST_PASSWORD });

    expect(res.status).toBe(200);
  });

  it('returns the same 401 for a wrong password and an unknown email', async () => {
    const wrongPassword = await request(app).post('/auth/login').send({ email, password: 'nope' });
    const unknownEmail = await request(app)
      .post('/auth/login')
      .send({ email: 'nobody@acme.test', password: TEST_PASSWORD });

    expect(wrongPassword.status).toBe(401);
    expect(unknownEmail.status).toBe(401);
    expect(wrongPassword.body.error.message).toBe(unknownEmail.body.error.message);
    expect(wrongPassword.get('Set-Cookie')).toBeUndefined();
  });

  it('returns 400 with field errors for an invalid body', async () => {
    const res = await request(app).post('/auth/login').send({ email: 'not-an-email' });

    expect(res.status).toBe(400);
    expect(res.body.error.fields).toEqual([
      { in: 'body', path: 'email', message: expect.any(String) },
      { in: 'body', path: 'password', message: expect.any(String) },
    ]);
  });
});

describe('POST /auth/logout', () => {
  it('clears the session cookie', async () => {
    const res = await request(app).post('/auth/logout');

    expect(res.status).toBe(204);
    expect(res.get('Set-Cookie')?.[0]).toMatch(/^hr_session=;.*Expires=Thu, 01 Jan 1970/);
  });
});

describe('GET /auth/me (authenticate middleware)', () => {
  it('returns 401 without a session cookie', async () => {
    const res = await request(app).get('/auth/me');

    expect(res.status).toBe(401);
    expect(res.body.error.code).toBe('UNAUTHORIZED');
  });

  it('returns the user and their organization when logged in', async () => {
    // An agent keeps cookies between requests, like a browser.
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email, password: TEST_PASSWORD }).expect(200);

    const res = await agent.get('/auth/me');

    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe(email);
    expect(res.body.organization).toMatchObject({ name: 'Acme Corp' });
  });

  it('rejects a tampered token', async () => {
    const login = await request(app).post('/auth/login').send({ email, password: TEST_PASSWORD });
    const token = /hr_session=([^;]+)/.exec(login.get('Set-Cookie')?.[0] ?? '')?.[1] ?? '';
    const [header, payload, signature] = token.split('.');
    const forged = Buffer.from(
      JSON.stringify({
        ...JSON.parse(Buffer.from(payload!, 'base64url').toString()),
        role: 'admin',
      }),
    ).toString('base64url');

    const res = await request(app)
      .get('/auth/me')
      .set('Cookie', `hr_session=${header}.${forged}.${signature}`);

    expect(res.status).toBe(401);
  });

  it('rejects the session of a user that no longer exists', async () => {
    const agent = request.agent(app);
    await agent.post('/auth/login').send({ email, password: TEST_PASSWORD }).expect(200);
    await UserModel.deleteOne({ email });

    const res = await agent.get('/auth/me');

    expect(res.status).toBe(401);
  });
});
