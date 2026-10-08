import { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { AUTH_COOKIE } from '../domain/constants.js';

/**
 * A fresh registry with the pieces every path shares. A factory instead of a
 * module-level singleton: generating the document is then a pure function
 * with no hidden import-order dependencies.
 */
export function createRegistry(): OpenAPIRegistry {
  const registry = new OpenAPIRegistry();

  // The session is an httpOnly cookie, so OpenAPI's "apiKey in cookie" is
  // the right description. Browsers (and Swagger UI) send it automatically
  // after POST /auth/login on the same origin.
  registry.registerComponent('securitySchemes', 'cookieAuth', {
    type: 'apiKey',
    in: 'cookie',
    name: AUTH_COOKIE,
    description: 'Session JWT set by POST /auth/login (httpOnly, so you never handle it in JS).',
  });

  return registry;
}

/** Use on every operation that needs a logged-in user. */
export const requiresSession = [{ cookieAuth: [] }];
/** Explicitly public (login, health). */
export const isPublic = [];
