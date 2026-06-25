import { Router } from 'express';
import { ProductController } from '../controllers/product.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenantScope.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/common.validator';
import {
  createProductSchema,
  listProductsSchema,
  updateProductSchema,
} from '../validators/product.validator';

export const productRouter = Router();

productRouter.use(authenticate, tenantScope);

const MANAGE = requireRole('ADMIN', 'SALES_MANAGER');

productRouter.get('/', validateQuery(listProductsSchema), asyncHandler(ProductController.list));
productRouter.post('/', MANAGE, validateBody(createProductSchema), asyncHandler(ProductController.create));
productRouter.get('/:id', validateParams(idParamSchema), asyncHandler(ProductController.get));
productRouter.put(
  '/:id',
  MANAGE,
  validateParams(idParamSchema),
  validateBody(updateProductSchema),
  asyncHandler(ProductController.update),
);
productRouter.delete('/:id', MANAGE, validateParams(idParamSchema), asyncHandler(ProductController.remove));
