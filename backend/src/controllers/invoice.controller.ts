import type { Request, Response } from 'express';
import { Prisma, type InvoiceStatus } from '@prisma/client';
import { getDb } from '../utils/requestContext';
import { ApiError, sendData } from '../utils/apiResponse';
import { buildPageMeta, toPrismaPage } from '../utils/pagination';
import type { UpdateInvoiceStatusInput } from '../validators/conversion.validator';

const INVOICE_INCLUDE = {
  salesOrder: {
    select: {
      orderNumber: true,
      quote: { select: { quoteNumber: true, currency: true, grandTotal: true, account: { select: { name: true } } } },
    },
  },
} satisfies Prisma.InvoiceInclude;

export const InvoiceController = {
  async list(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { page, pageSize, search, status } = req.query as unknown as {
      page: number; pageSize: number; search?: string; status?: InvoiceStatus;
    };
    const where: Prisma.InvoiceWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(search ? { invoiceNumber: { contains: search } } : {}),
    };
    const [items, total] = await Promise.all([
      db.invoice.findMany({ where, orderBy: { createdAt: 'desc' }, include: INVOICE_INCLUDE, ...toPrismaPage({ page, pageSize }) }),
      db.invoice.count({ where }),
    ]);
    sendData(res, items, 200, buildPageMeta(total, { page, pageSize }));
  },

  async get(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const invoice = await db.invoice.findFirst({ where: { id: req.params.id, deletedAt: null }, include: INVOICE_INCLUDE });
    if (!invoice) throw ApiError.notFound('Invoice not found');
    sendData(res, invoice);
  },

  async updateStatus(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const existing = await db.invoice.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { id: true } });
    if (!existing) throw ApiError.notFound('Invoice not found');
    const { status, dueDate } = req.body as UpdateInvoiceStatusInput;
    const invoice = await db.invoice.update({
      where: { id: existing.id },
      data: { status, ...(dueDate !== undefined ? { dueDate } : {}) },
      include: INVOICE_INCLUDE,
    });
    sendData(res, invoice);
  },
};
