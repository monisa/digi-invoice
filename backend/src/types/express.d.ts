import type { UserRole } from '@prisma/client';
import type { TenantPrisma } from '../lib/tenantPrisma';

/**
 * Request augmentation: auth.middleware populates `req.auth`, and
 * tenantScope.middleware attaches the tenant-scoped Prisma client as `req.db`.
 */
declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace Express {
    interface AuthContext {
      userId: string;
      tenantId: string;
      role: UserRole;
    }

    interface Request {
      auth?: AuthContext;
      db?: TenantPrisma;
    }
  }
}

export {};
