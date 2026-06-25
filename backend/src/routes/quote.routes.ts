import { Router } from 'express';
import { QuoteController } from '../controllers/quote.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenantScope.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/common.validator';
import {
  createQuoteSchema,
  listQuotesSchema,
  updateQuoteSchema,
} from '../validators/quote.validator';

export const quoteRouter = Router();

quoteRouter.use(authenticate, tenantScope);

const WRITE = requireRole('ADMIN', 'SALES_MANAGER', 'SALES_REP');

quoteRouter.get('/', validateQuery(listQuotesSchema), asyncHandler(QuoteController.list));
quoteRouter.post('/', WRITE, validateBody(createQuoteSchema), asyncHandler(QuoteController.create));
quoteRouter.get('/:id', validateParams(idParamSchema), asyncHandler(QuoteController.get));
quoteRouter.put(
  '/:id',
  WRITE,
  validateParams(idParamSchema),
  validateBody(updateQuoteSchema),
  asyncHandler(QuoteController.update),
);
quoteRouter.delete('/:id', WRITE, validateParams(idParamSchema), asyncHandler(QuoteController.remove));
