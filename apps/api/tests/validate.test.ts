import express from 'express';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { z } from 'zod';
import { errorHandler } from '../src/middleware/error-handler.js';
import { validate } from '../src/middleware/validate.js';

const app = express();
app.use(express.json());
app.post(
  '/items/:id',
  validate({
    params: z.object({ id: z.string().regex(/^[a-f\d]{24}$/, 'Invalid id') }),
    query: z.object({ page: z.coerce.number().int().min(1).default(1) }),
    body: z.object({ name: z.string().min(2), score: z.number().int().max(5) }),
  }),
  (req, res) => {
    res.json({ params: req.params, query: req.query, body: req.body });
  },
);
app.use(errorHandler);

const validId = '65f1c0ffee0000000000abcd';

describe('validate()', () => {
  it('passes parsed, coerced data to the handler and strips unknown keys', async () => {
    const res = await request(app)
      .post(`/items/${validId}?page=3`)
      .send({ name: 'Ada', score: 4, isAdmin: true });

    expect(res.status).toBe(200);
    expect(res.body).toEqual({
      params: { id: validId },
      query: { page: 3 },
      body: { name: 'Ada', score: 4 },
    });
  });

  it('applies defaults', async () => {
    const res = await request(app).post(`/items/${validId}`).send({ name: 'Ada', score: 1 });

    expect(res.body.query).toEqual({ page: 1 });
  });

  it('returns 400 with every field error from every location', async () => {
    const res = await request(app).post('/items/not-an-id?page=0').send({ name: 'A', score: 9 });

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('VALIDATION_ERROR');
    expect(res.body.error.fields).toEqual([
      { in: 'params', path: 'id', message: 'Invalid id' },
      { in: 'query', path: 'page', message: expect.any(String) },
      { in: 'body', path: 'name', message: expect.any(String) },
      { in: 'body', path: 'score', message: expect.any(String) },
    ]);
  });
});
