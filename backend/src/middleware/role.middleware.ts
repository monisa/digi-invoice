import type { NextFunction, Request, Response } from 'express';
import type { UserRole } from '@prisma/client';
import { ApiError } from '../utils/apiResponse';

/**
 * Route-level RBAC mirroring the frontend RoleGuard. Use after authenticate:
 *   router.post('/', authenticate, tenantScope, requireRole('ADMIN', 'SALES_MANAGER'), handler)
 */
export function requireRole(...allowed: UserRole[]) {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.auth) {
      return next(ApiError.unauthorized());
    }
    if (!allowed.includes(req.auth.role)) {
      return next(ApiError.forbidden());
    }
    next();
  };
}
