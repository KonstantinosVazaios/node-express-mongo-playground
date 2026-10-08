import { z } from 'zod';

/**
 * The ONE error shape every endpoint returns, whatever went wrong:
 *
 *   { "error": { "code": "VALIDATION_ERROR", "message": "...", "requestId": "...",
 *                "fields": [{ "in": "body", "path": "email", "message": "Invalid email" }] } }
 *
 * A stable machine-readable `code` (clients switch on it) plus a human
 * `message`. `fields` lets the frontend show each validation message next to
 * the right input.
 */
export const ErrorCodeSchema = z.enum([
  'BAD_REQUEST',
  'VALIDATION_ERROR',
  'UNAUTHORIZED',
  'FORBIDDEN',
  'NOT_FOUND',
  'CONFLICT',
  'PAYLOAD_TOO_LARGE',
  'TOO_MANY_REQUESTS',
  'INTERNAL_ERROR',
]);

export const FieldErrorSchema = z.object({
  in: z.enum(['body', 'query', 'params']),
  path: z.string(),
  message: z.string(),
});

export const ErrorResponseSchema = z.object({
  error: z.object({
    code: ErrorCodeSchema,
    message: z.string(),
    requestId: z.string().optional(),
    fields: z.array(FieldErrorSchema).optional(),
    // Only ever present when NODE_ENV=development.
    stack: z.string().optional(),
  }),
});

export type ErrorCode = z.infer<typeof ErrorCodeSchema>;
export type FieldError = z.infer<typeof FieldErrorSchema>;
export type ErrorResponse = z.infer<typeof ErrorResponseSchema>;
