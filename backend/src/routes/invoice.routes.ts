import { Router } from 'express';
import { InvoiceController } from '../controllers/invoice.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenantScope.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/common.validator';
import { listInvoicesSchema, updateInvoiceStatusSchema } from '../validators/conversion.validator';

export const invoiceRouter = Router();

invoiceRouter.use(authenticate, tenantScope);
const MANAGE = requireRole('ADMIN', 'SALES_MANAGER');

invoiceRouter.get('/', validateQuery(listInvoicesSchema), asyncHandler(InvoiceController.list));
invoiceRouter.get('/:id', validateParams(idParamSchema), asyncHandler(InvoiceController.get));
invoiceRouter.patch(
  '/:id/status',
  MANAGE,
  validateParams(idParamSchema),
  validateBody(updateInvoiceStatusSchema),
  asyncHandler(InvoiceController.updateStatus),
);
