import { createApp } from './app.js';

const port = Number(process.env.PORT ?? 3000);
const app = createApp();

app.listen(port, (error) => {
  // Express 5 passes listen errors (e.g. EADDRINUSE) to this callback instead
  // of only emitting them on the underlying http.Server.
  if (error) throw error;
  console.log(`API listening on http://localhost:${port}`);
});
