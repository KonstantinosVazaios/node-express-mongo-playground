import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { IdParamsSchema } from '../../schemas/common.schema.js';
import {
  CreateReviewCycleBodySchema,
  ListReviewCyclesQuerySchema,
  ReviewCycleListSchema,
  ReviewCycleSchema,
} from '../../schemas/review-cycle.schema.js';
import { requiresSession } from '../registry.js';
import { errorResponses, jsonContent, jsonResponse } from '../responses.js';

export function registerReviewCyclePaths(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: 'get',
    path: '/review-cycles',
    operationId: 'listReviewCycles',
    tags: ['Review cycles'],
    security: requiresSession,
    request: { query: ListReviewCyclesQuerySchema },
    responses: {
      200: jsonResponse(ReviewCycleListSchema, 'A page of review cycles'),
      ...errorResponses(400, 401),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/review-cycles',
    operationId: 'createReviewCycle',
    tags: ['Review cycles'],
    summary: 'Create a draft cycle (admin)',
    security: requiresSession,
    request: { body: { content: jsonContent(CreateReviewCycleBodySchema), required: true } },
    responses: {
      201: jsonResponse(ReviewCycleSchema, 'Created (status: draft)'),
      ...errorResponses(400, 401, 403, 409),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/review-cycles/{id}',
    operationId: 'getReviewCycle',
    tags: ['Review cycles'],
    security: requiresSession,
    request: { params: IdParamsSchema },
    responses: {
      200: jsonResponse(ReviewCycleSchema, 'The cycle'),
      ...errorResponses(400, 401, 404),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/review-cycles/{id}/activate',
    operationId: 'activateReviewCycle',
    tags: ['Review cycles'],
    summary: 'draft -> active; creates one review per managed employee (admin)',
    security: requiresSession,
    request: { params: IdParamsSchema },
    responses: {
      200: jsonResponse(ReviewCycleSchema, 'Activated'),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });
}
