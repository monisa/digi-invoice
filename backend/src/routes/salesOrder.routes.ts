import { Router } from 'express';
import { SalesOrderController } from '../controllers/salesOrder.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenantScope.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/common.validator';
import {
  listSalesOrdersSchema,
  updateSalesOrderStatusSchema,
} from '../validators/conversion.validator';

export const salesOrderRouter = Router();

salesOrderRouter.use(authenticate, tenantScope);
const MANAGE = requireRole('ADMIN', 'SALES_MANAGER');

salesOrderRouter.get('/', validateQuery(listSalesOrdersSchema), asyncHandler(SalesOrderController.list));
salesOrderRouter.get('/:id', validateParams(idParamSchema), asyncHandler(SalesOrderController.get));
salesOrderRouter.patch(
  '/:id/status',
  MANAGE,
  validateParams(idParamSchema),
  validateBody(updateSalesOrderStatusSchema),
  asyncHandler(SalesOrderController.updateStatus),
);
salesOrderRouter.post(
  '/:id/convert-to-invoice',
  MANAGE,
  validateParams(idParamSchema),
  asyncHandler(SalesOrderController.convertToInvoice),
);
