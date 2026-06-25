import { PrismaClient } from '@prisma/client';
import { isProd } from '../config/env';

/**
 * Single base PrismaClient for the process. Controllers should NOT use this
 * directly for tenant-owned data — use `req.db` (the tenant-scoped client from
 * tenantScope.middleware) instead. This base client is for auth/bootstrap
 * paths that legitimately cross or pre-date a tenant context (login, signup,
 * refresh-token lookup).
 */
export const prisma = new PrismaClient({
  log: isProd ? ['error', 'warn'] : ['query', 'error', 'warn'],
});

export async function disconnectPrisma(): Promise<void> {
  await prisma.$disconnect();
}
