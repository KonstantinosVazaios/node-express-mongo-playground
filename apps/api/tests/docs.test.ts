import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';

describe('API docs', () => {
  it('serves the OpenAPI document', async () => {
    const res = await request(createApp()).get('/openapi.json');

    expect(res.status).toBe(200);
    expect(res.body.openapi).toBe('3.1.0');
    expect(res.body.paths).toHaveProperty('/feedback');
  });

  it('serves Swagger UI', async () => {
    const res = await request(createApp()).get('/docs/');

    expect(res.status).toBe(200);
    expect(res.text).toContain('swagger-ui');
  });
});
