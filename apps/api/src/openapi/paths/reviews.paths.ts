import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { IdParamsSchema } from '../../schemas/common.schema.js';
import {
  ListReviewsQuerySchema,
  ReviewDetailSchema,
  ReviewListSchema,
  UpdateReviewBodySchema,
} from '../../schemas/review.schema.js';
import { requiresSession } from '../registry.js';
import { errorResponses, jsonContent, jsonResponse } from '../responses.js';

const VISIBILITY =
  'Admins see their whole organization, managers their direct reports (and themselves), ' +
  'employees only their own review.';

export function registerReviewPaths(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: 'get',
    path: '/reviews',
    operationId: 'listReviews',
    tags: ['Reviews'],
    description: VISIBILITY,
    security: requiresSession,
    request: { query: ListReviewsQuerySchema },
    responses: {
      200: jsonResponse(ReviewListSchema, 'A page of reviews'),
      ...errorResponses(400, 401),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/reviews/{id}',
    operationId: 'getReview',
    tags: ['Reviews'],
    description: VISIBILITY,
    security: requiresSession,
    request: { params: IdParamsSchema },
    responses: {
      200: jsonResponse(ReviewDetailSchema, 'The review with its cycle competencies'),
      ...errorResponses(400, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/reviews/{id}',
    operationId: 'updateReview',
    tags: ['Reviews'],
    summary: 'Score competencies and answer questions (reviewer or admin)',
    security: requiresSession,
    request: {
      params: IdParamsSchema,
      body: { content: jsonContent(UpdateReviewBodySchema), required: true },
    },
    responses: {
      200: jsonResponse(ReviewDetailSchema, 'Updated'),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/reviews/{id}/submit',
    operationId: 'submitReview',
    tags: ['Reviews'],
    summary: 'pending -> submitted; requires every competency to be scored',
    security: requiresSession,
    request: { params: IdParamsSchema },
    responses: {
      200: jsonResponse(ReviewDetailSchema, 'Submitted'),
      ...errorResponses(400, 401, 403, 404, 409),
    },
  });
}
