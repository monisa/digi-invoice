import type { Request } from 'express';
import type { TenantPrisma } from '../lib/tenantPrisma';

/**
 * Accessors that turn the optional `req.auth` / `req.db` (populated by the
 * authenticate + tenantScope middleware) into guaranteed non-null values for
 * controllers, so handlers don't litter `!` assertions. Throwing here would
 * indicate a route was mounted without the middleware — a programming error.
 */
export function getDb(req: Request): TenantPrisma {
  if (!req.db) {
    throw new Error('req.db missing — tenantScope middleware not applied to this route');
  }
  return req.db;
}

export function getAuth(req: Request): Express.AuthContext {
  if (!req.auth) {
    throw new Error('req.auth missing — authenticate middleware not applied to this route');
  }
  return req.auth;
}
