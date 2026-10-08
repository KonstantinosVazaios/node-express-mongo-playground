import { Router } from 'express';
import swaggerUi from 'swagger-ui-express';
import { generateOpenApiDocument } from '../openapi/generator.js';

export const docsRouter = Router();

// Generated once at startup: the document only changes when the code does.
const document = generateOpenApiDocument();

docsRouter.get('/openapi.json', (_req, res) => {
  res.json(document);
});

// Swagger UI loads the live spec from /openapi.json. It's served from the
// API's own origin, so after "Try it out" on POST /auth/login the browser
// stores the httpOnly cookie and sends it with every later "Try it out".
// (A real product might only expose /docs outside production.)
docsRouter.use(
  '/docs',
  swaggerUi.serve,
  swaggerUi.setup(undefined, {
    customSiteTitle: 'HR Playground API',
    swaggerOptions: { url: '/openapi.json', withCredentials: true, persistAuthorization: true },
  }),
);
