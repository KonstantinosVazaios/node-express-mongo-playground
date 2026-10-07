import express from 'express';
import { healthRouter } from './routes/health.routes.js';

/**
 * Builds the Express app WITHOUT calling listen().
 *
 * Keeping "build the app" separate from "start the server" (server.ts) means
 * tests can import the app and hand it to Supertest, which binds it to an
 * ephemeral port, and no real port, DB or Redis connection is needed just
 * to construct it.
 */
export function createApp() {
  const app = express();

  // Express doesn't parse bodies by default (unlike Laravel/FastAPI). Without
  // this middleware req.body is undefined. The size limit protects against
  // huge payloads eating memory.
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (_req, res) => {
    res.json({ name: 'hr-api', docs: '/docs' });
  });

  app.use('/health', healthRouter);

  return app;
}
