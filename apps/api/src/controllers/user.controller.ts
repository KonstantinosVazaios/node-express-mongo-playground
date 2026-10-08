import type { Request, Response } from 'express';
import { currentUser } from '../middleware/authenticate.js';
import type { IdParams } from '../schemas/common.schema.js';
import type { ListUsersQuery, UserDto, UserList } from '../schemas/user.schema.js';
import * as userService from '../services/user.service.js';

// Controllers stay thin: pull validated input off the request, call one
// service function, send the result. No business rules, no queries.

export async function listUsers(
  req: Request<object, UserList, unknown, ListUsersQuery>,
  res: Response<UserList>,
) {
  res.json(await userService.listUsers(currentUser(req), req.query));
}

export async function getUser(req: Request<IdParams>, res: Response<UserDto>) {
  res.json(await userService.getUser(currentUser(req), req.params.id));
}
