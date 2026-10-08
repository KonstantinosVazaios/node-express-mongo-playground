/**
 * Plain domain constants with ZERO imports.
 *
 * Models, Zod schemas, middleware and the OpenAPI generator all need these.
 * Keeping them out of the model files matters: importing a model pulls in
 * Mongoose, bcrypt and config/env.ts, which validates env vars on import.
 * The OpenAPI generator (scripts/write-openapi.ts, CI) must run with no
 * database and no secrets, so it may only reach schemas -> this file.
 */

export const ROLES = ['admin', 'manager', 'employee'] as const;
export type Role = (typeof ROLES)[number];

export const FEEDBACK_SOURCES = ['manual', 'slack', 'email'] as const;
export type FeedbackSource = (typeof FEEDBACK_SOURCES)[number];

/** draft -> active -> closed. Only forward; a closed cycle is read-only. */
export const CYCLE_STATUSES = ['draft', 'active', 'closed'] as const;
export type CycleStatus = (typeof CYCLE_STATUSES)[number];

export const REVIEW_STATUSES = ['pending', 'submitted'] as const;
export type ReviewStatus = (typeof REVIEW_STATUSES)[number];

/** Name of the httpOnly session cookie. */
export const AUTH_COOKIE = 'hr_session';
