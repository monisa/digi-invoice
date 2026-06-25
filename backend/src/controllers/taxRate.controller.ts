import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { getAuth, getDb } from '../utils/requestContext';
import { ApiError, sendData } from '../utils/apiResponse';
import { buildPageMeta, toPrismaPage } from '../utils/pagination';
import type { CreateTaxRateInput, UpdateTaxRateInput } from '../validators/taxRate.validator';

export const TaxRateController = {
  async list(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { page, pageSize, search } = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
    };

    const where: Prisma.TaxRateWhereInput = {
      deletedAt: null,
      ...(search ? { name: { contains: search } } : {}),
    };

    const [items, total] = await Promise.all([
      db.taxRate.findMany({ where, orderBy: { createdAt: 'desc' }, ...toPrismaPage({ page, pageSize }) }),
      db.taxRate.count({ where }),
    ]);

    sendData(res, items, 200, buildPageMeta(total, { page, pageSize }));
  },

  async get(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const taxRate = await db.taxRate.findFirst({ where: { id: req.params.id, deletedAt: null } });
    if (!taxRate) throw ApiError.notFound('Tax rate not found');
    sendData(res, taxRate);
  },

  async create(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { tenantId } = getAuth(req);
    const input = req.body as CreateTaxRateInput;
    const taxRate = await db.taxRate.create({ data: { ...input, tenantId } });
    sendData(res, taxRate, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const existing = await db.taxRate.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Tax rate not found');

    const taxRate = await db.taxRate.update({
      where: { id: req.params.id },
      data: req.body as UpdateTaxRateInput,
    });
    sendData(res, taxRate);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const existing = await db.taxRate.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Tax rate not found');

    await db.taxRate.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    sendData(res, { success: true });
  },
};
