/**
 * Public entry point of @hr/api-client.
 *
 * Everything under ./generated is produced by `npm run generate:client` from
 * openapi.json and must never be edited by hand (it would be overwritten).
 * Hand-written additions live next to it: runtime-config.ts and this file.
 */
import type { ErrorResponse } from './generated/types.gen';

export * from './generated';
export * from './generated/@tanstack/react-query.gen';
export { client } from './generated/client.gen';

/**
 * The fetch client throws the parsed JSON error body, so a caught error is our
 * documented ErrorResponse. Network failures throw a TypeError instead, hence
 * the guard. Switch on `error.error.code` ('UNAUTHORIZED', 'NOT_FOUND', ...)
 * rather than on HTTP status codes.
 */
export function isErrorResponse(value: unknown): value is ErrorResponse {
  if (typeof value !== 'object' || value === null || !('error' in value)) return false;
  const { error } = value;
  return (
    typeof error === 'object' && error !== null && 'code' in error && typeof error.code === 'string'
  );
}
