import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { getAuth, getDb } from '../utils/requestContext';
import { ApiError, sendData } from '../utils/apiResponse';
import { buildPageMeta, toPrismaPage } from '../utils/pagination';
import type { CreateContactInput, UpdateContactInput } from '../validators/contact.validator';

export const ContactController = {
  async list(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { page, pageSize, search, accountId } = req.query as unknown as {
      page: number;
      pageSize: number;
      search?: string;
      accountId?: string;
    };

    const where: Prisma.ContactWhereInput = {
      deletedAt: null,
      ...(accountId ? { accountId } : {}),
      ...(search
        ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.contact.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        ...toPrismaPage({ page, pageSize }),
      }),
      db.contact.count({ where }),
    ]);

    sendData(res, items, 200, buildPageMeta(total, { page, pageSize }));
  },

  async get(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const contact = await db.contact.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { account: true },
    });
    if (!contact) throw ApiError.notFound('Contact not found');
    sendData(res, contact);
  },

  async create(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const input = req.body as CreateContactInput;
    // Verify any referenced account belongs to this tenant (req.db is scoped).
    if (input.accountId) {
      const account = await db.account.findFirst({
        where: { id: input.accountId, deletedAt: null },
        select: { id: true },
      });
      if (!account) throw ApiError.badRequest('accountId does not exist', 'accountId');
    }
    const { tenantId } = getAuth(req);
    const contact = await db.contact.create({ data: { ...input, tenantId } });
    sendData(res, contact, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const input = req.body as UpdateContactInput;
    const existing = await db.contact.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Contact not found');

    if (input.accountId) {
      const account = await db.account.findFirst({
        where: { id: input.accountId, deletedAt: null },
        select: { id: true },
      });
      if (!account) throw ApiError.badRequest('accountId does not exist', 'accountId');
    }

    const contact = await db.contact.update({
      where: { id: req.params.id },
      data: input,
    });
    sendData(res, contact);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const existing = await db.contact.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Contact not found');

    await db.contact.update({
      where: { id: req.params.id },
      data: { deletedAt: new Date() },
    });
    sendData(res, { success: true });
  },
};
