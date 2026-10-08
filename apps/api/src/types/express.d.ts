import type { AuthUser } from './auth.js';

/**
 * Declaration merging: adds our own properties to Express's Request type.
 * Express's types declare a global `Express.Request` interface for exactly
 * this. Interfaces with the same name MERGE in TypeScript, so every `req`
 * in the codebase now knows about these fields.
 *
 * Only types change here. Middleware still has to set the values at runtime
 * (middleware/request-id.ts, middleware/authenticate.ts).
 */
declare global {
  namespace Express {
    interface Request {
      /** Set by the requestId middleware for every request. */
      requestId: string;
      /**
       * Set by the authenticate middleware. Optional because public routes
       * don't run it. Use currentUser(req) in controllers to get it typed as
       * non-null.
       */
      user?: AuthUser;
    }
  }
}
