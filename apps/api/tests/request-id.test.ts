import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('requestId middleware', () => {
  it('generates an id and returns it in the header and in error bodies', async () => {
    const res = await request(createApp()).get('/nope');

    const id = res.get('X-Request-Id');
    expect(id).toMatch(/^[0-9a-f-]{36}$/);
    expect(res.body.error.requestId).toBe(id);
  });

  it('keeps a valid incoming X-Request-Id', async () => {
    const res = await request(createApp()).get('/').set('X-Request-Id', 'from-the-proxy-123');

    expect(res.get('X-Request-Id')).toBe('from-the-proxy-123');
  });

  it('replaces an incoming id that looks malicious', async () => {
    const res = await request(createApp())
      .get('/')
      .set('X-Request-Id', '<script>alert(1)</script>');

    expect(res.get('X-Request-Id')).not.toContain('<script>');
  });
});
