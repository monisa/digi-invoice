import { Router } from 'express';
import { AuthController } from '../controllers/auth.controller';
import { asyncHandler } from '../utils/asyncHandler';
import { validateBody } from '../middleware/validate.middleware';
import {
  loginSchema,
  logoutSchema,
  refreshSchema,
  signupSchema,
} from '../validators/auth.validator';

export const authRouter = Router();

// Public auth endpoints (no JWT required).
authRouter.post('/signup', validateBody(signupSchema), asyncHandler(AuthController.signup));
authRouter.post('/login', validateBody(loginSchema), asyncHandler(AuthController.login));
authRouter.post('/refresh', validateBody(refreshSchema), asyncHandler(AuthController.refresh));
authRouter.post('/logout', validateBody(logoutSchema), asyncHandler(AuthController.logout));
