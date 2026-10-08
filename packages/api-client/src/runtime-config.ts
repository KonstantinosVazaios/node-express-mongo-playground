import type { CreateClientConfig } from './generated/client.gen';

/**
 * Hand-written (NOT generated): the generated client calls this once, when it
 * is created, to get its initial config.
 *
 * - credentials: 'include' makes fetch send and store cookies, which is what
 *   carries our httpOnly session. With the Vite dev proxy / nginx the API is
 *   same-origin and 'same-origin' would suffice; 'include' also covers a
 *   cross-origin API (which then needs CORS with credentials, see
 *   apps/api/src/middleware/security.ts).
 * - baseUrl defaults to '/api', the path the dev proxy and nginx forward to
 *   the API. The web app overrides it from its env (VITE_API_BASE_URL) with
 *   client.setConfig() at startup.
 */
export const createClientConfig: CreateClientConfig = (config) => ({
  ...config,
  baseUrl: '/api',
  credentials: 'include',
});
