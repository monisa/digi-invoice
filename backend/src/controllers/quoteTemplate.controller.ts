import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { getAuth, getDb } from '../utils/requestContext';
import { ApiError, sendData } from '../utils/apiResponse';
import { buildPageMeta, toPrismaPage } from '../utils/pagination';
import type {
  CreateQuoteTemplateInput,
  UpdateQuoteTemplateInput,
} from '../validators/quoteTemplate.validator';

export const QuoteTemplateController = {
  async list(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { page, pageSize, search } = req.query as unknown as { page: number; pageSize: number; search?: string };
    const where: Prisma.QuoteTemplateWhereInput = {
      deletedAt: null,
      ...(search ? { name: { contains: search } } : {}),
    };
    const [items, total] = await Promise.all([
      db.quoteTemplate.findMany({ where, orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }], ...toPrismaPage({ page, pageSize }) }),
      db.quoteTemplate.count({ where }),
    ]);
    sendData(res, items, 200, buildPageMeta(total, { page, pageSize }));
  },

  async get(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const tpl = await db.quoteTemplate.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!tpl) throw ApiError.notFound('Template not found');
    sendData(res, tpl);
  },

  async create(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { tenantId } = getAuth(req);
    const input = req.body as CreateQuoteTemplateInput;

    // First template becomes the default automatically.
    const count = await db.quoteTemplate.count({ where: { deletedAt: null } });
    const isDefault = input.isDefault ?? count === 0;

    const tpl = await db.$transaction(async (tx) => {
      if (isDefault) {
        await tx.quoteTemplate.updateMany({ where: { isDefault: true, deletedAt: null }, data: { isDefault: false } });
      }
      return tx.quoteTemplate.create({
        data: {
          tenantId,
          name: input.name,
          headerHtml: input.headerHtml ?? null,
          footerHtml: input.footerHtml ?? null,
          termsHtml: input.termsHtml ?? null,
          isDefault,
        },
      });
    });
    sendData(res, tpl, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const input = req.body as UpdateQuoteTemplateInput;
    const existing = await db.quoteTemplate.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { id: true } });
    if (!existing) throw ApiError.notFound('Template not found');

    const tpl = await db.$transaction(async (tx) => {
      if (input.isDefault === true) {
        await tx.quoteTemplate.updateMany({
          where: { isDefault: true, deletedAt: null, id: { not: existing.id } },
          data: { isDefault: false },
        });
      }
      return tx.quoteTemplate.update({ where: { id: existing.id }, data: input });
    });
    sendData(res, tpl);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const existing = await db.quoteTemplate.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { id: true } });
    if (!existing) throw ApiError.notFound('Template not found');
    await db.quoteTemplate.update({ where: { id: existing.id }, data: { deletedAt: new Date(), isDefault: false } });
    sendData(res, { success: true });
  },
};
