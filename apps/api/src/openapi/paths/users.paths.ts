import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { IdParamsSchema } from '../../schemas/common.schema.js';
import { ListUsersQuerySchema, UserListSchema, UserSchema } from '../../schemas/user.schema.js';
import { requiresSession } from '../registry.js';
import { errorResponses, jsonResponse } from '../responses.js';

export function registerUserPaths(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: 'get',
    path: '/users',
    operationId: 'listUsers',
    tags: ['Users'],
    summary: "Your organization's directory",
    security: requiresSession,
    request: { query: ListUsersQuerySchema },
    responses: {
      200: jsonResponse(UserListSchema, 'A page of users'),
      ...errorResponses(400, 401),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/users/{id}',
    operationId: 'getUser',
    tags: ['Users'],
    security: requiresSession,
    request: { params: IdParamsSchema },
    responses: {
      200: jsonResponse(UserSchema, 'The user'),
      ...errorResponses(400, 401, 404),
    },
  });
}
