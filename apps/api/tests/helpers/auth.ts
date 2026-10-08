import type { Express } from 'express';
import request from 'supertest';
import { TEST_PASSWORD } from './factories.js';

/** Logs in through the real endpoint and returns an agent that keeps the cookie. */
export async function loginAs(app: Express, user: { email: string }) {
  const agent = request.agent(app);
  await agent.post('/auth/login').send({ email: user.email, password: TEST_PASSWORD }).expect(200);
  return agent;
}
