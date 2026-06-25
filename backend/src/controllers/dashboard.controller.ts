import type { Request, Response } from 'express';
import Decimal from 'decimal.js';
import type { QuoteStatus } from '@prisma/client';
import { getDb } from '../utils/requestContext';
import { sendData } from '../utils/apiResponse';

/**
 * Aggregate dashboard metrics for the tenant. Monetary sums assume a single
 * working currency (the tenant default); mixed-currency tenants would need
 * per-currency breakdowns or conversion via ExchangeRate (future work).
 */

const OPEN_STATUSES: QuoteStatus[] = ['DRAFT', 'PENDING_APPROVAL', 'APPROVED', 'SENT'];

export const DashboardController = {
  async summary(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const now = new Date();
    const in7Days = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);

    const [byStatus, byOwner, acceptedByOwner, invByStatus, expiringSoon, owners] = await Promise.all([
      db.quote.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true }, _sum: { grandTotal: true } }),
      db.quote.groupBy({ by: ['ownerId'], where: { deletedAt: null }, _count: { _all: true }, _sum: { grandTotal: true } }),
      db.quote.groupBy({ by: ['ownerId'], where: { deletedAt: null, status: 'ACCEPTED' }, _count: { _all: true }, _sum: { grandTotal: true } }),
      db.invoice.groupBy({ by: ['status'], where: { deletedAt: null }, _count: { _all: true } }),
      db.quote.count({ where: { deletedAt: null, status: { in: OPEN_STATUSES }, validUntil: { gte: now, lte: in7Days } } }),
      db.user.findMany({ where: { deletedAt: null }, select: { id: true, name: true } }),
    ]);

    // Quote counts + value by status
    const counts: Record<string, number> = {};
    const valueByStatus: Record<string, Decimal> = {};
    let totalQuotes = 0;
    for (const row of byStatus) {
      counts[row.status] = row._count._all;
      valueByStatus[row.status] = new Decimal(row._sum.grandTotal?.toString() ?? '0');
      totalQuotes += row._count._all;
    }
    const valOf = (s: QuoteStatus) => valueByStatus[s] ?? new Decimal(0);
    const cntOf = (s: QuoteStatus) => counts[s] ?? 0;

    const pipelineValue = OPEN_STATUSES.reduce((acc, s) => acc.plus(valOf(s)), new Decimal(0));
    const acceptedValue = valOf('ACCEPTED');

    const won = cntOf('ACCEPTED');
    const lost = cntOf('DECLINED') + cntOf('EXPIRED');
    const decided = won + lost;
    const winRate = decided === 0 ? 0 : Math.round((won / decided) * 1000) / 10;

    const ownerName = new Map(owners.map((o) => [o.id, o.name]));
    const acceptedMap = new Map(acceptedByOwner.map((r) => [r.ownerId ?? 'none', r._count._all]));
    const perRep = byOwner
      .map((r) => ({
        ownerId: r.ownerId,
        name: r.ownerId ? ownerName.get(r.ownerId) ?? 'Unknown' : 'Unassigned',
        totalQuotes: r._count._all,
        acceptedQuotes: acceptedMap.get(r.ownerId ?? 'none') ?? 0,
        totalValue: (r._sum.grandTotal?.toString() ?? '0'),
      }))
      .sort((a, b) => b.totalQuotes - a.totalQuotes);

    const invoiceCounts: Record<string, number> = {};
    for (const row of invByStatus) invoiceCounts[row.status] = row._count._all;

    sendData(res, {
      quotes: {
        total: totalQuotes,
        open: OPEN_STATUSES.reduce((n, s) => n + cntOf(s), 0),
        byStatus: counts,
      },
      pipelineValue: pipelineValue.toFixed(2),
      acceptedValue: acceptedValue.toFixed(2),
      winRate,
      expiringSoon,
      invoices: {
        total: Object.values(invoiceCounts).reduce((a, b) => a + b, 0),
        outstanding: (invoiceCounts['ISSUED'] ?? 0) + (invoiceCounts['OVERDUE'] ?? 0),
        paid: invoiceCounts['PAID'] ?? 0,
        byStatus: invoiceCounts,
      },
      perRep,
    });
  },
};
