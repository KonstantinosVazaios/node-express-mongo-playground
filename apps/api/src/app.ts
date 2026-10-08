import cookieParser from 'cookie-parser';
import express from 'express';
import { env } from './config/env.js';
import { errorHandler, notFoundHandler } from './middleware/error-handler.js';
import { httpLogger } from './middleware/http-logger.js';
import { requestId } from './middleware/request-id.js';
import { corsMiddleware, securityHeaders } from './middleware/security.js';
import { authRouter } from './routes/auth.routes.js';
import { healthRouter } from './routes/health.routes.js';

/**
 * Builds the Express app WITHOUT calling listen().
 *
 * Keeping "build the app" separate from "start the server" (server.ts) means
 * tests can import the app and hand it to Supertest, which binds it to an
 * ephemeral port, and no real port, DB or Redis connection is needed just
 * to construct it.
 *
 * MIDDLEWARE ORDER MATTERS. Express runs middleware in registration order,
 * as one pipeline (Laravel's Kernel $middleware array works the same way),
 * and each step can rely only on what the steps before it did:
 *
 *  1. requestId       first, so every later step (logs, errors) can use the id
 *  2. httpLogger      early, so it times and logs EVERY request, including
 *                     ones rejected further down (CORS, bad JSON, 401, 429)
 *  3. helmet          security headers on every response, errors included
 *  4. cors            must answer OPTIONS preflights before any route or auth
 *                     check runs, or the browser never sends the real request
 *  5. json + cookies  parse the body/cookies. Placed after 1-2 on purpose: a
 *                     malformed JSON body fails HERE, and we still want that
 *                     400 logged with a request id.
 *  6. routes          per-route middleware runs inside each router:
 *                     rate limit -> validate -> authenticate -> requireRole
 *                     -> controller
 *  7. 404 handler     only reached if no route matched
 *  8. error handler   last: catches everything thrown or next(err)'d above
 */
export function createApp() {
  const app = express();

  // Behind nginx (the web container) the TCP peer is the proxy, not the
  // user. This tells Express how many proxy hops to trust when it reads
  // req.ip from X-Forwarded-For. The rate limiter keys on req.ip.
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(requestId); // 1
  app.use(httpLogger); // 2
  app.use(securityHeaders); // 3
  app.use(corsMiddleware); // 4

  // 5. Express parses nothing by default (unlike Laravel/FastAPI); without
  // this, req.body is undefined. The size limit stops huge payloads from
  // eating memory.
  app.use(express.json({ limit: '100kb' }));
  app.use(cookieParser());

  // 6
  app.get('/', (_req, res) => {
    res.json({ name: 'hr-api', docs: '/docs' });
  });
  app.use('/health', healthRouter);
  app.use('/auth', authRouter);

  app.use(notFoundHandler); // 7
  app.use(errorHandler); // 8

  return app;
}
