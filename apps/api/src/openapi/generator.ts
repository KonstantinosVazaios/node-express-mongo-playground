import { OpenApiGeneratorV31 } from '@asteasolutions/zod-to-openapi';
import { registerAuthPaths } from './paths/auth.paths.js';
import { registerFeedbackPaths } from './paths/feedback.paths.js';
import { registerReviewCyclePaths } from './paths/review-cycles.paths.js';
import { registerReviewPaths } from './paths/reviews.paths.js';
import { registerSystemPaths } from './paths/system.paths.js';
import { registerUserPaths } from './paths/users.paths.js';
import { createRegistry } from './registry.js';

/**
 * CODE-FIRST OpenAPI: the spec is GENERATED from the same Zod schemas that
 * validate requests at runtime and give TypeScript its types. One source of
 * truth means the docs can't drift from the behaviour.
 * (FastAPI does this from pydantic models + type hints.)
 *
 * The alternative is SPEC-FIRST: hand-write openapi.yaml, then generate
 * server stubs/validators from it. That's great when several teams agree on
 * a contract before anyone writes code, or with a polyglot backend. The cost
 * is that YAML is a second language to maintain, and the code still needs
 * its own validation layer that can drift from it.
 */
export function generateOpenApiDocument() {
  const registry = createRegistry();

  registerSystemPaths(registry);
  registerAuthPaths(registry);
  registerUserPaths(registry);
  registerFeedbackPaths(registry);
  registerReviewCyclePaths(registry);
  registerReviewPaths(registry);

  return new OpenApiGeneratorV31(registry.definitions).generateDocument({
    openapi: '3.1.0',
    info: {
      title: 'HR Playground API',
      version: '0.1.0',
      description:
        'Multi-tenant HR performance API (learning project). Log in with POST /auth/login; ' +
        'the session cookie is then sent automatically. Seeded users use password123.',
    },
    tags: [
      { name: 'Auth', description: 'Session cookie login/logout' },
      { name: 'Users', description: 'The organization directory' },
      { name: 'Feedback', description: 'Feedback about colleagues' },
      { name: 'Review cycles', description: 'Performance review periods (admin-managed)' },
      { name: 'Reviews', description: 'One review per employee per cycle' },
      { name: 'System', description: 'Health and operations' },
    ],
  });
}

export type OpenApiDocument = ReturnType<typeof generateOpenApiDocument>;
