import cors from 'cors';
import helmet from 'helmet';
import { env } from '../config/env.js';

/**
 * helmet sets security-related response headers: X-Content-Type-Options:
 * nosniff, a strict Content-Security-Policy, Strict-Transport-Security,
 * X-Frame-Options (clickjacking), and it removes X-Powered-By: Express so
 * we don't advertise the framework.
 */
export const securityHeaders = helmet();

/**
 * CORS for cookie-based auth.
 *
 * The browser only sends cookies cross-origin when the frontend uses
 * `credentials: 'include'` AND the API answers with BOTH
 *   Access-Control-Allow-Origin: <the exact origin>
 *   Access-Control-Allow-Credentials: true
 *
 * `Access-Control-Allow-Origin: *` is NOT allowed together with credentials.
 * Browsers reject that combination by spec. Otherwise any website you visit
 * could call this API with your session cookie attached and read the
 * response. So we list the allowed origins explicitly, and the cors package
 * echoes back the request's Origin only when it is on that list.
 *
 * In development the React app uses Vite's proxy (same origin), so CORS isn't
 * even involved. It matters when the frontend is served from another origin.
 */
export const corsMiddleware = cors({
  origin: env.CORS_ORIGIN,
  credentials: true,
});
