import type { NextFunction, Request, Response } from 'express';
import { forTenant } from '../lib/tenantPrisma';
import { ApiError } from '../utils/apiResponse';

/**
 * Attaches a tenant-scoped Prisma client to `req.db`, derived from the
 * tenantId in the verified JWT. Must run AFTER authenticate. Controllers use
 * `req.db` for all tenant-owned data so isolation is automatic.
 */
export function tenantScope(req: Request, _res: Response, next: NextFunction): void {
  if (!req.auth?.tenantId) {
    return next(ApiError.unauthorized('No tenant context on request'));
  }
  req.db = forTenant(req.auth.tenantId);
  next();
}
