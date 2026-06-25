import { Router } from 'express';
import { QuoteTemplateController } from '../controllers/quoteTemplate.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenantScope.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/common.validator';
import {
  createQuoteTemplateSchema,
  listQuoteTemplatesSchema,
  updateQuoteTemplateSchema,
} from '../validators/quoteTemplate.validator';

export const quoteTemplateRouter = Router();

quoteTemplateRouter.use(authenticate, tenantScope);
const MANAGE = requireRole('ADMIN', 'SALES_MANAGER');

quoteTemplateRouter.get('/', validateQuery(listQuoteTemplatesSchema), asyncHandler(QuoteTemplateController.list));
quoteTemplateRouter.post('/', MANAGE, validateBody(createQuoteTemplateSchema), asyncHandler(QuoteTemplateController.create));
quoteTemplateRouter.get('/:id', validateParams(idParamSchema), asyncHandler(QuoteTemplateController.get));
quoteTemplateRouter.put(
  '/:id',
  MANAGE,
  validateParams(idParamSchema),
  validateBody(updateQuoteTemplateSchema),
  asyncHandler(QuoteTemplateController.update),
);
quoteTemplateRouter.delete('/:id', MANAGE, validateParams(idParamSchema), asyncHandler(QuoteTemplateController.remove));
