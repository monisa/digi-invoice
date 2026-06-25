import { Router } from 'express';
import { AccountController } from '../controllers/account.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenantScope.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/common.validator';
import {
  createAccountSchema,
  listAccountsSchema,
  updateAccountSchema,
} from '../validators/account.validator';

export const accountRouter = Router();

// Every account route requires a valid JWT + tenant scope.
accountRouter.use(authenticate, tenantScope);

// Roles permitted to mutate CRM data (Viewer is read-only).
const WRITE = requireRole('ADMIN', 'SALES_MANAGER', 'SALES_REP');

accountRouter.get('/', validateQuery(listAccountsSchema), asyncHandler(AccountController.list));
accountRouter.post('/', WRITE, validateBody(createAccountSchema), asyncHandler(AccountController.create));
accountRouter.get('/:id', validateParams(idParamSchema), asyncHandler(AccountController.get));
accountRouter.put(
  '/:id',
  WRITE,
  validateParams(idParamSchema),
  validateBody(updateAccountSchema),
  asyncHandler(AccountController.update),
);
accountRouter.delete('/:id', WRITE, validateParams(idParamSchema), asyncHandler(AccountController.remove));
