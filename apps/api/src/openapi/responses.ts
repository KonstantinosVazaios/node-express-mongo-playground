import type { z } from 'zod';
import { ErrorResponseSchema } from '../schemas/error.schema.js';

export function jsonContent(schema: z.ZodType) {
  return { 'application/json': { schema } };
}

export function jsonResponse(schema: z.ZodType, description: string) {
  return { description, content: jsonContent(schema) };
}

const ERROR_DESCRIPTIONS = {
  400: 'Invalid request. `error.fields` lists every problem, per field.',
  401: 'Not logged in, or the session expired.',
  403: 'Logged in, but your role or the access policy does not allow this.',
  404: 'Not found, or it belongs to another organization (never a 403 across tenants).',
  409: 'Conflicts with the current state (duplicate, locked, wrong status).',
  429: 'Too many requests.',
} as const;

type ErrorStatus = keyof typeof ERROR_DESCRIPTIONS;

/**
 * Every error uses the SAME documented shape, ErrorResponse, so the generated
 * client gets one typed error and the UI can handle all of them the same way.
 */
export function errorResponses(...statuses: ErrorStatus[]) {
  return Object.fromEntries(
    statuses.map((status) => [
      status,
      jsonResponse(ErrorResponseSchema, ERROR_DESCRIPTIONS[status]),
    ]),
  );
}
