import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('security middleware', () => {
  it('sets helmet headers and hides X-Powered-By', async () => {
    const res = await request(createApp()).get('/');

    expect(res.get('X-Content-Type-Options')).toBe('nosniff');
    expect(res.get('X-Powered-By')).toBeUndefined();
  });

  it('allows the configured origin with credentials (never "*")', async () => {
    const res = await request(createApp()).get('/').set('Origin', 'http://localhost:5173');

    expect(res.get('Access-Control-Allow-Origin')).toBe('http://localhost:5173');
    expect(res.get('Access-Control-Allow-Credentials')).toBe('true');
  });

  it('does not allow other origins', async () => {
    const res = await request(createApp()).get('/').set('Origin', 'https://evil.example');

    expect(res.get('Access-Control-Allow-Origin')).toBeUndefined();
  });
});
