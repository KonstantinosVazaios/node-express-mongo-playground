import type { OpenAPIRegistry } from '@asteasolutions/zod-to-openapi';
import { IdParamsSchema } from '../../schemas/common.schema.js';
import {
  CreateFeedbackBodySchema,
  FeedbackListSchema,
  FeedbackSchema,
  ListFeedbackQuerySchema,
  UpdateFeedbackBodySchema,
} from '../../schemas/feedback.schema.js';
import { requiresSession } from '../registry.js';
import { errorResponses, jsonContent, jsonResponse } from '../responses.js';

const VISIBILITY =
  'Admins see their whole organization, managers their direct reports (and themselves), ' +
  'employees themselves. Everyone also sees feedback they wrote.';

export function registerFeedbackPaths(registry: OpenAPIRegistry) {
  registry.registerPath({
    method: 'get',
    path: '/feedback',
    operationId: 'listFeedback',
    tags: ['Feedback'],
    summary: 'Feedback you may see, newest first',
    description: `${VISIBILITY} Filters only ever narrow that set.`,
    security: requiresSession,
    request: { query: ListFeedbackQuerySchema },
    responses: {
      200: jsonResponse(FeedbackListSchema, 'A page of feedback'),
      ...errorResponses(400, 401),
    },
  });

  registry.registerPath({
    method: 'post',
    path: '/feedback',
    operationId: 'createFeedback',
    tags: ['Feedback'],
    summary: 'Give feedback to a colleague in your organization',
    security: requiresSession,
    request: { body: { content: jsonContent(CreateFeedbackBodySchema), required: true } },
    responses: {
      201: {
        ...jsonResponse(FeedbackSchema, 'Created'),
        headers: {
          Location: { description: 'URL of the new feedback', schema: { type: 'string' } },
        },
      },
      ...errorResponses(400, 401),
    },
  });

  registry.registerPath({
    method: 'get',
    path: '/feedback/{id}',
    operationId: 'getFeedback',
    tags: ['Feedback'],
    description: VISIBILITY,
    security: requiresSession,
    request: { params: IdParamsSchema },
    responses: {
      200: jsonResponse(FeedbackSchema, 'The feedback'),
      ...errorResponses(400, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: 'patch',
    path: '/feedback/{id}',
    operationId: 'updateFeedback',
    tags: ['Feedback'],
    summary: 'Edit your own feedback (author only)',
    security: requiresSession,
    request: {
      params: IdParamsSchema,
      body: { content: jsonContent(UpdateFeedbackBodySchema), required: true },
    },
    responses: {
      200: jsonResponse(FeedbackSchema, 'Updated'),
      ...errorResponses(400, 401, 403, 404),
    },
  });

  registry.registerPath({
    method: 'delete',
    path: '/feedback/{id}',
    operationId: 'deleteFeedback',
    tags: ['Feedback'],
    summary: 'Delete feedback (author or admin)',
    security: requiresSession,
    request: { params: IdParamsSchema },
    responses: {
      204: { description: 'Deleted' },
      ...errorResponses(400, 401, 403, 404),
    },
  });
}
