import { Router } from 'express';
import { ContactController } from '../controllers/contact.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenantScope.middleware';
import { requireRole } from '../middleware/role.middleware';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams, validateQuery } from '../middleware/validate.middleware';
import { idParamSchema } from '../validators/common.validator';
import {
  createContactSchema,
  listContactsSchema,
  updateContactSchema,
} from '../validators/contact.validator';

export const contactRouter = Router();

contactRouter.use(authenticate, tenantScope);

const WRITE = requireRole('ADMIN', 'SALES_MANAGER', 'SALES_REP');

contactRouter.get('/', validateQuery(listContactsSchema), asyncHandler(ContactController.list));
contactRouter.post('/', WRITE, validateBody(createContactSchema), asyncHandler(ContactController.create));
contactRouter.get('/:id', validateParams(idParamSchema), asyncHandler(ContactController.get));
contactRouter.put(
  '/:id',
  WRITE,
  validateParams(idParamSchema),
  validateBody(updateContactSchema),
  asyncHandler(ContactController.update),
);
contactRouter.delete('/:id', WRITE, validateParams(idParamSchema), asyncHandler(ContactController.remove));
