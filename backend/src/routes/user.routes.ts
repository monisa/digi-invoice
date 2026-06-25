import { Router } from 'express';
import { UserController } from '../controllers/user.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenantScope.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/common.validator';
import { createUserSchema, listUsersSchema, updateUserSchema } from '../validators/user.validator';

export const userRouter = Router();

userRouter.use(authenticate, tenantScope);

const VIEW = requireRole('ADMIN', 'SALES_MANAGER');
const ADMIN = requireRole('ADMIN');

userRouter.get('/', VIEW, validateQuery(listUsersSchema), asyncHandler(UserController.list));
userRouter.get('/:id', VIEW, validateParams(idParamSchema), asyncHandler(UserController.get));
userRouter.post('/', ADMIN, validateBody(createUserSchema), asyncHandler(UserController.create));
userRouter.put(
  '/:id',
  ADMIN,
  validateParams(idParamSchema),
  validateBody(updateUserSchema),
  asyncHandler(UserController.update),
);
userRouter.delete('/:id', ADMIN, validateParams(idParamSchema), asyncHandler(UserController.remove));
