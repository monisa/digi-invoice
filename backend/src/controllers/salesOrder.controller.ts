import type { Request, Response } from 'express';
import { Prisma, type SalesOrderStatus } from '@prisma/client';
import { getAuth, getDb } from '../utils/requestContext';
import { ApiError, sendData } from '../utils/apiResponse';
import { buildPageMeta, toPrismaPage } from '../utils/pagination';
import type { UpdateSalesOrderStatusInput } from '../validators/conversion.validator';

const ORDER_INCLUDE = {
  quote: {
    select: { id: true, quoteNumber: true, currency: true, grandTotal: true, account: { select: { name: true } } },
  },
} satisfies Prisma.SalesOrderInclude;

export const SalesOrderController = {
  async list(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { page, pageSize, search, status } = req.query as unknown as {
      page: number; pageSize: number; search?: string; status?: SalesOrderStatus;
    };
    const where: Prisma.SalesOrderWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search ? { orderNumber: { contains: search } } : {}),
    };
    const [items, total] = await Promise.all([
      db.salesOrder.findMany({ where, orderBy: { createdAt: 'desc' }, include: ORDER_INCLUDE, ...toPrismaPage({ page, pageSize }) }),
      db.salesOrder.count({ where }),
    ]);
    sendData(res, items, 200, buildPageMeta(total, { page, pageSize }));
  },

  async get(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const order = await db.salesOrder.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: {
        quote: { select: { id: true, quoteNumber: true, currency: true, grandTotal: true, account: { select: { name: true } } } },
        invoices: { where: { deletedAt: null }, orderBy: { createdAt: 'desc' } },
      },
    });
    if (!order) throw ApiError.notFound('Sales order not found');
    sendData(res, order);
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const existing = await db.salesOrder.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { id: true } });
    if (!existing) throw ApiError.notFound('Sales order not found');
    const { status } = req.body as UpdateSalesOrderStatusInput;
    const order = await db.salesOrder.update({ where: { id: existing.id }, data: { status }, include: ORDER_INCLUDE });
    sendData(res, order);
  },

  async convertToInvoice(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { tenantId } = getAuth(req);
    const order = await db.salesOrder.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { id: true, status: true } });
    if (!order) throw ApiError.notFound('Sales order not found');
    if (order.status === 'CANCELLED') throw ApiError.conflict('A cancelled order cannot be invoiced');

    const invoice = await db.$transaction(async (tx) => {
      const prefix = 'INV';
      const year = new Date().getFullYear();
      const seq = await tx.quoteNumberSequence.upsert({
        where: { tenantId_prefix_year: { tenantId, prefix, year } },
        create: { tenantId, prefix, year, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const invoiceNumber = `${prefix}-${year}-${String(seq.lastValue).padStart(5, '0')}`;
      const dueDate = new Date();
      dueDate.setDate(dueDate.getDate() + 30);
      return tx.invoice.create({
        data: { tenantId, salesOrderId: order.id, invoiceNumber, status: 'DRAFT', dueDate },
        include: {
          salesOrder: { select: { orderNumber: true, quote: { select: { quoteNumber: true, currency: true, grandTotal: true } } } },
        },
      });
    });
    sendData(res, invoice, 201);
  },
};
