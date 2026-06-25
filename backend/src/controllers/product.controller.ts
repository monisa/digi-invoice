import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { getAuth, getDb } from '../utils/requestContext';
import { ApiError, sendData } from '../utils/apiResponse';
import { buildPageMeta, toPrismaPage } from '../utils/pagination';
import type { TenantPrisma } from '../lib/tenantPrisma';
import type { CreateProductInput, UpdateProductInput } from '../validators/product.validator';

/** Ensure a referenced tax rate exists within the tenant (req.db is scoped). */
async function assertTaxRate(db: TenantPrisma, taxRateId: string): Promise<void> {
  const tax = await db.taxRate.findFirst({
    where: { id: taxRateId, deletedAt: null },
    select: { id: true },
  });
  if (!tax) throw ApiError.badRequest('taxRateId does not exist', 'taxRateId');
}

export const ProductController = {
  async list(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { page, pageSize, search, taxRateId } = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
      taxRateId?: string;
    };

    const where: Prisma.ProductWhereInput = {
      deletedAt: null,
      ...(taxRateId ? { taxRateId } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { sku: { contains: search } }] } : {}),
    };

    const [items, total] = await Promise.all([
      db.product.findMany({ where, orderBy: { createdAt: 'desc' }, ...toPrismaPage({ page, pageSize }) }),
      db.product.count({ where }),
    ]);

    sendData(res, items, 200, buildPageMeta(total, { page, pageSize }));
  },

  async get(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const product = await db.product.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { taxRate: true },
    });
    if (!product) throw ApiError.notFound('Product not found');
    sendData(res, product);
  },

  async create(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { tenantId } = getAuth(req);
    const input = req.body as CreateProductInput;
    if (input.taxRateId) await assertTaxRate(db, input.taxRateId);
    const product = await db.product.create({ data: { ...input, tenantId } });
    sendData(res, product, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const input = req.body as UpdateProductInput;
    const existing = await db.product.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Product not found');
    if (input.taxRateId) await assertTaxRate(db, input.taxRateId);

    const product = await db.product.update({ where: { id: req.params.id }, data: input });
    sendData(res, product);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const existing = await db.product.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Product not found');

    await db.product.update({ where: { id: req.params.id }, data: { deletedAt: new Date() } });
    sendData(res, { success: true });
  },
};
