import { Prisma } from '@prisma/client';
import { prisma } from './prisma';

/**
 * Tenant isolation — the single most important security boundary in the app.
 *
 * `forTenant(tenantId)` returns a PrismaClient extension that AUTOMATICALLY:
 *   - filters every read / update / delete by `tenantId`, and
 *   - stamps `tenantId` onto every create.
 *
 * Controllers receive this scoped client as `req.db` and can write ordinary
 * Prisma queries without ever mentioning tenantId — and critically, *cannot*
 * read or mutate another tenant's rows even if they tried. The tenantId always
 * comes from the verified JWT, never from request input.
 *
 * Only models that own a `tenantId` column are auto-scoped. Child records
 * (line items, approvals, signatures, activity logs, refresh tokens) have no
 * tenantId of their own and MUST be reached through their tenant-scoped parent
 * (e.g. nested writes, or a relation filter such as
 * `quote: { tenantId }`). See SCOPED_MODELS below.
 */

const SCOPED_MODELS = new Set<string>([
  'User',
  'Account',
  'Contact',
  'Deal',
  'TaxRate',
  'Product',
  'QuoteTemplate',
  'Quote',
  'SalesOrder',
  'Invoice',
  'ExchangeRate',
  'QuoteNumberSequence',
  'Permission',
]);

// Operations whose `args.where` should be constrained by tenantId.
const WHERE_OPS = new Set<string>([
  'findFirst',
  'findFirstOrThrow',
  'findMany',
  'findUnique',
  'findUniqueOrThrow',
  'count',
  'aggregate',
  'groupBy',
  'update',
  'updateMany',
  'delete',
  'deleteMany',
  'upsert',
]);

export type TenantPrisma = ReturnType<typeof forTenant>;

export function forTenant(tenantId: string) {
  if (!tenantId) {
    throw new Error('forTenant() called without a tenantId');
  }

  return prisma.$extends({
    name: 'tenant-scope',
    query: {
      $allModels: {
        async $allOperations({ model, operation, args, query }) {
          if (!SCOPED_MODELS.has(model)) {
            return query(args);
          }

          const a = (args ?? {}) as Record<string, unknown>;

          if (WHERE_OPS.has(operation)) {
            a.where = { ...(a.where as object | undefined), tenantId };
          }

          if (operation === 'create') {
            a.data = { ...(a.data as object | undefined), tenantId };
          }

          if (operation === 'createMany') {
            const data = a.data as unknown;
            a.data = Array.isArray(data)
              ? data.map((row) => ({ ...(row as object), tenantId }))
              : { ...(data as object), tenantId };
          }

          if (operation === 'upsert') {
            a.create = { ...(a.create as object | undefined), tenantId };
          }

          return query(a);
        },
      },
    },
  });
}

/**
 * Guard for places that must never run without a tenant context.
 */
export function assertTenant(tenantId: string | undefined): asserts tenantId is string {
  if (!tenantId) {
    throw new Prisma.PrismaClientKnownRequestError('Missing tenant context', {
      code: 'P2025',
      clientVersion: Prisma.prismaVersion.client,
    });
  }
}
