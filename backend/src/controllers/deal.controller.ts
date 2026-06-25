import type { Request, Response } from 'express';
import type { DealStage, Prisma } from '@prisma/client';
import { getAuth, getDb } from '../utils/requestContext';
import { ApiError, sendData } from '../utils/apiResponse';
import { buildPageMeta, toPrismaPage } from '../utils/pagination';
import type { CreateDealInput, UpdateDealInput } from '../validators/deal.validator';

export const DealController = {
  async list(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { page, pageSize, search, accountId, stage } = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
      accountId?: string;
      stage?: DealStage;
    };

    const where: Prisma.DealWhereInput = {
      deletedAt: null,
      ...(accountId ? { accountId } : {}),
      ...(stage ? { stage } : {}),
      ...(search ? { name: { contains: search } } : {}),
    };

    const [items, total] = await Promise.all([
      db.deal.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toPrismaPage({ page, pageSize }),
      }),
      db.deal.count({ where }),
    ]);

    sendData(res, items, 200, buildPageMeta(total, { page, pageSize }));
  },

  async get(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const deal = await db.deal.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { account: true },
    });
    if (!deal) throw ApiError.notFound('Deal not found');
    sendData(res, deal);
  },

  async create(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const input = req.body as CreateDealInput;
    if (input.accountId) {
      const account = await db.account.findFirst({
        where: { id: input.accountId, deletedAt: null },
        select: { id: true },
      });
      if (!account) throw ApiError.badRequest('accountId does not exist', 'accountId');
    }
    const { tenantId } = getAuth(req);
    const deal = await db.deal.create({ data: { ...input, tenantId } });
    sendData(res, deal, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const input = req.body as UpdateDealInput;
    const existing = await db.deal.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Deal not found');

    if (input.accountId) {
      const account = await db.account.findFirst({
        where: { id: input.accountId, deletedAt: null },
        select: { id: true },
      });
      if (!account) throw ApiError.badRequest('accountId does not exist', 'accountId');
    }

    const deal = await db.deal.update({
      where: { id: req.params.id },
      data: input,
    });
    sendData(res, deal);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const existing = await db.deal.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Deal not found');

    await db.deal.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    sendData(res, { success: true });
  },
};
