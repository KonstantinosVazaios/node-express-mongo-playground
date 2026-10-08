import { rateLimit } from 'express-rate-limit';
import { TooManyRequestsError } from '../lib/errors.js';

/**
 * Brute-force protection for POST /auth/login: at most 5 FAILED attempts per
 * IP per 15 minutes. Successful logins don't count, so a real user who logs
 * in and out often never hits it.
 *
 * The counters live in this process's memory, which is fine for one API
 * instance. With several instances behind a load balancer each would count
 * separately, so you'd plug in a shared store (rate-limit-redis), like
 * Laravel's RateLimiter does by default through the cache.
 */
export const loginRateLimit = rateLimit({
  windowMs: 15 * 60 * 1000,
  limit: 5,
  skipSuccessfulRequests: true,
  // Sends the standard RateLimit / RateLimit-Policy headers so clients can see
  // their budget; drops the legacy X-RateLimit-* ones.
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  // Go through our error handler so a 429 has the same shape as every error.
  handler: (_req, _res, next) => {
    next(new TooManyRequestsError('Too many failed login attempts, try again in 15 minutes'));
  },
});
