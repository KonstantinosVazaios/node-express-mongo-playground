import type { RequestHandler } from 'express';
import type { z } from 'zod';
import { ValidationError } from '../lib/errors.js';
import type { FieldError } from '../schemas/error.schema.js';

interface RequestSchemas {
  body?: z.ZodType;
  params?: z.ZodType;
  query?: z.ZodType;
}

const LOCATIONS = ['params', 'query', 'body'] as const;

/**
 * validate({ body, params, query }): reusable request validation.
 *
 * Laravel does this with a FormRequest class and FastAPI with typed
 * parameters plus pydantic. In Express, validation is just middleware placed
 * before the controller:
 *
 *   router.post('/', validate({ body: CreateFeedbackBody }), createFeedback);
 *
 * On success, the PARSED values replace the raw ones. Zod has then stripped
 * unknown keys, coerced query strings ("2" -> 2) and applied defaults, so the
 * controller only ever sees clean data. On failure, every problem in every
 * location is collected into one 400 with field-level errors.
 */
export function validate(schemas: RequestSchemas): RequestHandler {
  return (req, _res, next) => {
    const fields: FieldError[] = [];

    for (const location of LOCATIONS) {
      const schema = schemas[location];
      if (!schema) continue;

      const result = schema.safeParse(req[location]);
      if (!result.success) {
        for (const issue of result.error.issues) {
          fields.push({ in: location, path: issue.path.join('.'), message: issue.message });
        }
        continue;
      }

      if (location === 'query') {
        // Express 5 made req.query a getter (it re-parses the URL on every
        // access), so `req.query = ...` throws. Defining an own property on
        // this request object shadows the getter.
        Object.defineProperty(req, 'query', {
          value: result.data,
          writable: true,
          enumerable: true,
        });
      } else {
        req[location] = result.data;
      }
    }

    if (fields.length > 0) throw new ValidationError(fields);
    next();
  };
}
