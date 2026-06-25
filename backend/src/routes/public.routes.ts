import { Router } from 'express';
import rateLimit from 'express-rate-limit';
import { PublicController } from '../controllers/public.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody, validateParams } from '../middleware/validate.middleware';
import {
  declineQuoteSchema,
  signQuoteSchema,
  tokenParamSchema,
} from '../validators/publicSign.validator';

/**
 * Unauthenticated, token-gated quote signing. Rate-limited per IP to blunt
 * token guessing / abuse.
 */
export const publicRouter = Router();

const limiter = rateLimit({
  windowMs: 60_000,
  limit: 30,
  standardHeaders: 'draft-7',
  legacyHeaders: false,
});

publicRouter.use(limiter);

publicRouter.get(
  '/quotes/:token',
  validateParams(tokenParamSchema),
  asyncHandler(PublicController.getQuote),
);
publicRouter.post(
  '/quotes/:token/sign',
  validateParams(tokenParamSchema),
  validateBody(signQuoteSchema),
  asyncHandler(PublicController.sign),
);
publicRouter.post(
  '/quotes/:token/decline',
  validateParams(tokenParamSchema),
  validateBody(declineQuoteSchema),
  asyncHandler(PublicController.decline),
);
