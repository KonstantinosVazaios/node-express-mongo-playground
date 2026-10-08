import { Router } from 'express';
import * as userController from '../controllers/user.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { validate } from '../middleware/validate.js';
import { IdParamsSchema } from '../schemas/common.schema.js';
import { ListUsersQuerySchema } from '../schemas/user.schema.js';

export const userRouter = Router();

// router.use() applies authenticate to every route below it, like a
// Laravel Route::middleware('auth')->group(...).
userRouter.use(authenticate);

userRouter.get('/', validate({ query: ListUsersQuerySchema }), userController.listUsers);
userRouter.get('/:id', validate({ params: IdParamsSchema }), userController.getUser);
