import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import {
  AuthUserResponseSchema,
  LoginBodySchema,
  MeResponseSchema,
} from '../../schemas/auth.schema.js';
import { isPublic, requiresSession } from '../registry.js';
import { errorResponses, jsonContent, jsonResponse } from '../responses.js';

// The SAME Zod schemas the routes validate with (routes/auth.routes.ts):
// what's documented is, by construction, what's enforced.

export function registerAuthPaths(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: 'post',
    path: '/auth/login',
    operationId: 'login',
    tags: ['Auth'],
    summary: 'Log in and receive the session cookie',
    security: isPublic,
    request: { body: { content: jsonContent(LoginBodySchema), required: true } },
    responses: {
      200: {
        ...jsonResponse(AuthUserResponseSchema, 'Logged in'),
        headers: {
          'Set-Cookie': {
            description: 'hr_session=<JWT>; HttpOnly; SameSite=Lax (Secure in production)',
            schema: { type: 'string' },
          },
        },
      },
      ...errorResponses(400, 401, 429),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/auth/logout',
    operationId: 'logout',
    tags: ['Auth'],
    summary: 'Clear the session cookie',
    security: isPublic,
    responses: { 204: { description: 'Logged out' } },
  });

  registry.registerPath({
    method: 'get',
    path: '/auth/me',
    operationId: 'getMe',
    tags: ['Auth'],
    summary: 'The logged-in user and their organization',
    security: requiresSession,
    responses: {
      200: jsonResponse(MeResponseSchema, 'Current session'),
      ...errorResponses(401),
    },
  });
}
