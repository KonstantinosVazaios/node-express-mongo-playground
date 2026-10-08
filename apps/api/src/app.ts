import express from 'express';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { httpLogger } from './middleware/http-logger.js';
import { requestId } from './middleware/request-id.js';
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

  app.use(requestId);
  app.use(httpLogger);

  // Express doesn't parse bodies by default (unlike Laravel/FastAPI). Without
  // this middleware req.body is undefined. The size limit protects against
  // huge payloads eating memory.
  app.use(express.json({ limit: '100kb' }));

  app.get('/', (_req, res) => {
    res.json({ name: 'hr-api', docs: '/docs' });
  });

  app.use('/health', healthRouter);

  // These two MUST come after every route: Express runs middleware in the
  // order it was registered, so they only see requests nothing else handled.
  app.use(notFoundHandler);
  app.use(errorHandler);

  return app;
}
