import { Router } from 'express';
import { DealController } from '../controllers/deal.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenantScope.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/common.validator';
import { createDealSchema, listDealsSchema, updateDealSchema } from '../validators/deal.validator';

export const dealRouter = Router();

dealRouter.use(authenticate, tenantScope);

const WRITE = requireRole('ADMIN', 'SALES_MANAGER', 'SALES_REP');

dealRouter.get('/', validateQuery(listDealsSchema), asyncHandler(DealController.list));
dealRouter.post('/', WRITE, validateBody(createDealSchema), asyncHandler(DealController.create));
dealRouter.get('/:id', validateParams(idParamSchema), asyncHandler(DealController.get));
dealRouter.put(
  '/:id',
  WRITE,
  validateParams(idParamSchema),
  validateBody(updateDealSchema),
  asyncHandler(DealController.update),
);
dealRouter.delete('/:id', WRITE, validateParams(idParamSchema), asyncHandler(DealController.remove));
