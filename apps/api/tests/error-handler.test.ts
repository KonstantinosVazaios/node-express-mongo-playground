import express, { type Express } from 'express';
import mongoose from 'mongoose';
import request from 'supertest';
import { describe, expect, it } from 'vitest';
import { createApp } from '../src/app.js';
import { ForbiddenError } from '../src/lib/errors.js';
import { errorHandler, notFoundHandler } from '../src/middleware/error-handler.js';

/** A minimal app with test-only routes, wired with the real error handling. */
function appWith(register: (app: Express) => void) {
  const app = express();
  app.use(express.json());
  register(app);
  app.use(notFoundHandler);
  app.use(errorHandler);
  return app;
}

describe('error handling', () => {
  it('maps an AppError thrown synchronously to its status and the error shape', async () => {
    const app = appWith((a) =>
      a.get('/boom', () => {
        throw new ForbiddenError();
      }),
    );

    const res = await request(app).get('/boom');

    expect(res.status).toBe(403);
    expect(res.body).toEqual({
      error: { code: 'FORBIDDEN', message: 'You do not have permission to do this' },
    });
  });

  it('catches errors from ASYNC handlers without any wrapper (Express 5)', async () => {
    const app = appWith((a) =>
      a.get('/async-boom', async () => {
        await new Promise((resolve) => setTimeout(resolve, 1));
        throw new ForbiddenError('Nope');
      }),
    );

    const res = await request(app).get('/async-boom');

    expect(res.status).toBe(403);
    expect(res.body.error.message).toBe('Nope');
  });

  it('hides the message and stack of unexpected errors', async () => {
    const app = appWith((a) =>
      a.get('/bug', () => {
        throw new Error('connection string mongodb://admin:secret@db leaked');
      }),
    );

    const res = await request(app).get('/bug');

    expect(res.status).toBe(500);
    expect(res.body).toEqual({
      error: { code: 'INTERNAL_ERROR', message: 'Internal server error' },
    });
  });

  it('turns malformed JSON into a 400', async () => {
    const app = appWith((a) => a.post('/echo', (req, res) => res.json(req.body)));

    const res = await request(app)
      .post('/echo')
      .set('Content-Type', 'application/json')
      .send('{"broken": ');

    expect(res.status).toBe(400);
    expect(res.body.error.code).toBe('BAD_REQUEST');
  });

  it('turns a duplicate key error into a 409', async () => {
    const app = appWith((a) =>
      a.get('/dup', () => {
        throw new mongoose.mongo.MongoServerError({ code: 11000, errmsg: 'E11000 duplicate key' });
      }),
    );

    const res = await request(app).get('/dup');

    expect(res.status).toBe(409);
    expect(res.body.error.code).toBe('CONFLICT');
  });

  it('returns a 404 in the same shape for unknown routes', async () => {
    const res = await request(createApp()).get('/does-not-exist');

    expect(res.status).toBe(404);
    expect(res.body).toEqual({
      error: { code: 'NOT_FOUND', message: 'Route GET /does-not-exist not found' },
    });
  });
});
