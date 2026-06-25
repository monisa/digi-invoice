import { Router } from 'express';
import { TaxRateController } from '../controllers/taxRate.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenantScope.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/common.validator';
import {
  createTaxRateSchema,
  listTaxRatesSchema,
  updateTaxRateSchema,
} from '../validators/taxRate.validator';

export const taxRateRouter = Router();

taxRateRouter.use(authenticate, tenantScope);

// Catalog/pricing config is restricted to admins and sales managers.
const MANAGE = requireRole('ADMIN', 'SALES_MANAGER');

taxRateRouter.get('/', validateQuery(listTaxRatesSchema), asyncHandler(TaxRateController.list));
taxRateRouter.post('/', MANAGE, validateBody(createTaxRateSchema), asyncHandler(TaxRateController.create));
taxRateRouter.get('/:id', validateParams(idParamSchema), asyncHandler(TaxRateController.get));
taxRateRouter.put(
  '/:id',
  MANAGE,
  validateParams(idParamSchema),
  validateBody(updateTaxRateSchema),
  asyncHandler(TaxRateController.update),
);
taxRateRouter.delete('/:id', MANAGE, validateParams(idParamSchema), asyncHandler(TaxRateController.remove));
