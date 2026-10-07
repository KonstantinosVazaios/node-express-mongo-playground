import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('app', () => {
  it('responds on the root route', async () => {
    // Supertest takes the app (not a URL), starts it on a random port for
    // this request and closes it afterwards, so tests never fight over ports.
    const res = await request(createApp()).get('/');

    expect(res.status).toBe(200);
    expect(res.body).toEqual({ name: 'hr-api', docs: '/docs' });
  });
});
