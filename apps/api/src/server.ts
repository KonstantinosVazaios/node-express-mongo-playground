import { createApp } from './app.js';
import { env } from './config/env.js';

const app = createApp();

app.listen(env.PORT, (error) => {
  // Express 5 passes listen errors (e.g. EADDRINUSE) to this callback instead
  // of only emitting them on the underlying http.Server.
  if (error) throw error;
  console.log(`API listening on http://localhost:${env.PORT}`);
});
