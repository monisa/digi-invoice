import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { getAuth, getDb } from '../utils/requestContext';
import { ApiError, sendData } from '../utils/apiResponse';
import { buildPageMeta, toPrismaPage } from '../utils/pagination';
import type { CreateAccountInput, UpdateAccountInput } from '../validators/account.validator';

export const AccountController = {
  async list(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { page, pageSize, search } = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
    };

    const where: Prisma.AccountWhereInput = {
      deletedAt: null,
      ...(search ? { name: { contains: search } } : {}),
    };

    const [items, total] = await Promise.all([
      db.account.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toPrismaPage({ page, pageSize }),
      }),
      db.account.count({ where }),
    ]);

    sendData(res, items, 200, buildPageMeta(total, { page, pageSize }));
  },

  async get(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const account = await db.account.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { contacts: true, deals: true },
    });
    if (!account) throw ApiError.notFound('Account not found');
    sendData(res, account);
  },

  async create(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { tenantId } = getAuth(req);
    const input = req.body as CreateAccountInput;
    // tenantId from the verified JWT; the tenant extension re-asserts it too.
    const account = await db.account.create({ data: { ...input, tenantId } });
    sendData(res, account, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const existing = await db.account.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Account not found');

    const account = await db.account.update({
      where: { id: req.params.id },
      data: req.body as UpdateAccountInput,
    });
    sendData(res, account);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const existing = await db.account.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Account not found');

    await db.account.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    sendData(res, { success: true });
  },
};
