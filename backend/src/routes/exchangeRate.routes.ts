import { Router } from 'express';
import { ExchangeRateController } from '../controllers/exchangeRate.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenantScope.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/common.validator';
import {
  createExchangeRateSchema,
  latestRateQuerySchema,
  listExchangeRatesSchema,
  updateExchangeRateSchema,
} from '../validators/exchangeRate.validator';

export const exchangeRateRouter = Router();

exchangeRateRouter.use(authenticate, tenantScope);
const MANAGE = requireRole('ADMIN', 'SALES_MANAGER');

exchangeRateRouter.get('/', validateQuery(listExchangeRatesSchema), asyncHandler(ExchangeRateController.list));
exchangeRateRouter.get('/latest', validateQuery(latestRateQuerySchema), asyncHandler(ExchangeRateController.latest));
exchangeRateRouter.post('/', MANAGE, validateBody(createExchangeRateSchema), asyncHandler(ExchangeRateController.create));
exchangeRateRouter.post('/sync', MANAGE, asyncHandler(ExchangeRateController.sync));
exchangeRateRouter.put(
  '/:id',
  MANAGE,
  validateParams(idParamSchema),
  validateBody(updateExchangeRateSchema),
  asyncHandler(ExchangeRateController.update),
);
exchangeRateRouter.delete('/:id', MANAGE, validateParams(idParamSchema), asyncHandler(ExchangeRateController.remove));
