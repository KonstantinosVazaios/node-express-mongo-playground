import type { RequestHandler } from 'express';
import { ForbiddenError } from '../lib/errors.js';
import type { Role } from '../models/user.model.js';
import { currentUser } from './authenticate.js';

/**
 * Route-level role check, placed AFTER authenticate:
 *
 *   router.get('/team/stats', authenticate, requireRole('admin', 'manager'), handler)
 *
 * A factory: requireRole(...) returns the actual middleware, so each route can
 * configure it. Laravel: ->middleware('role:admin,manager'). FastAPI:
 * Depends(require_role("admin", "manager")).
 *
 * 401 = "who are you?" (not logged in). 403 = "I know who you are, and you
 * may not do this." Finer rules such as "managers only see their own reports"
 * depend on the data, so they live in the services, not here.
 */
export function requireRole(...allowed: Role[]): RequestHandler {
  return (req, _res, next) => {
    const { role } = currentUser(req);
    if (!allowed.includes(role)) {
      throw new ForbiddenError(`This action requires one of these roles: ${allowed.join(', ')}`);
    }
    next();
  };
}
