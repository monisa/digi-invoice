import { Router } from 'express';
import { DashboardController } from '../controllers/dashboard.controller';
import { authenticate } from '../middleware/auth.middleware';
import { tenantScope } from '../middleware/tenantScope.middleware';
import { asyncHandler } from '../utils/asyncHandler';

export const dashboardRouter = Router();

dashboardRouter.use(authenticate, tenantScope);

// Any authenticated tenant user may view dashboard metrics.
dashboardRouter.get('/summary', asyncHandler(DashboardController.summary));
