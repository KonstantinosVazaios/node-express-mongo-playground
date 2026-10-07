import { createApp } from './app.js';
import { env } from './config/env.js';
import { connectMongo } from './db/mongo.js';
import { logger } from './lib/logger.js';

// Top-level await works because this is an ES module. Connect BEFORE
// accepting traffic: a server that listens but can't reach its database would
// pass a naive liveness check and then fail every request.
await connectMongo();

const app = createApp();

app.listen(env.PORT, (error) => {
  // Express 5 passes listen errors (e.g. EADDRINUSE) to this callback instead
  // of only emitting them on the underlying http.Server.
  if (error) throw error;
  logger.info(`API listening on http://localhost:${env.PORT}`);
});
