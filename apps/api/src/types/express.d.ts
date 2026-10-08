/**
 * Declaration merging: adds our own properties to Express's Request type.
 * Express's types declare a global `Express.Request` interface for exactly
 * this. Interfaces with the same name MERGE in TypeScript, so every `req`
 * in the codebase now knows about these fields.
 *
 * Only types change here. A middleware still has to actually set the value
 * at runtime (see middleware/request-id.ts).
 */
declare global {
  namespace Express {
    interface Request {
      /** Set by the requestId middleware for every request. */
      requestId: string;
    }
  }
}

export {};
