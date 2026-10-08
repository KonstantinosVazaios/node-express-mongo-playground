import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { HealthSchema } from '../../schemas/health.schema.js';
import { isPublic } from '../registry.js';
import { jsonResponse } from '../responses.js';

export function registerSystemPaths(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: 'get',
    path: '/health',
    operationId: 'getHealth',
    tags: ['System'],
    summary: 'Liveness/readiness: pings MongoDB and Redis',
    security: isPublic,
    responses: {
      200: jsonResponse(HealthSchema, 'Every dependency is up'),
      503: jsonResponse(HealthSchema, 'At least one dependency is down'),
    },
  });
}
