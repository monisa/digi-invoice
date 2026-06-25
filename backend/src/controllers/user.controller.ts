import type { Request, Response } from 'express';
import type { Prisma, UserRole, UserStatus } from '@prisma/client';
import { getAuth, getDb } from '../utils/requestContext';
import { ApiError, sendData } from '../utils/apiResponse';
import { buildPageMeta, toPrismaPage } from '../utils/pagination';
import { PasswordService } from '../services/password.service';
import type { CreateUserInput, UpdateUserInput } from '../validators/user.validator';

// Public projection — NEVER return passwordHash.
const USER_SELECT = {
  id: true,
  name: true,
  email: true,
  role: true,
  status: true,
  lastLoginAt: true,
  createdAt: true,
  updatedAt: true,
} satisfies Prisma.UserSelect;

export const UserController = {
  async list(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { page, pageSize, search, role, status } = req.query as unknown as {
      page: number; pageSize: number; search?: string; role?: UserRole; status?: UserStatus;
    };
    const where: Prisma.UserWhereInput = {
      deletedAt: null,
      ...(role ? { role } : {}),
      ...(status ? { status } : {}),
      ...(search ? { OR: [{ name: { contains: search } }, { email: { contains: search } }] } : {}),
    };
    const [items, total] = await Promise.all([
      db.user.findMany({ where, orderBy: { createdAt: 'desc' }, select: USER_SELECT, ...toPrismaPage({ page, pageSize }) }),
      db.user.count({ where }),
    ]);
    sendData(res, items, 200, buildPageMeta(total, { page, pageSize }));
  },

  async get(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const user = await db.user.findFirst({ where: { id: req.params.id, deletedAt: null }, select: USER_SELECT });
    if (!user) throw ApiError.notFound('User not found');
    sendData(res, user);
  },

  async create(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { tenantId } = getAuth(req);
    const input = req.body as CreateUserInput;
    const passwordHash = await PasswordService.hash(input.password);
    const user = await db.user.create({
      data: { tenantId, name: input.name, email: input.email, role: input.role, status: 'ACTIVE', passwordHash },
      select: USER_SELECT,
    });
    sendData(res, user, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { userId } = getAuth(req);
    const input = req.body as UpdateUserInput;

    const existing = await db.user.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { id: true } });
    if (!existing) throw ApiError.notFound('User not found');

    // Prevent self-lockout: an admin can't change their own role/status.
    if (existing.id === userId && (input.role !== undefined || input.status !== undefined)) {
      throw ApiError.forbidden('You cannot change your own role or status');
    }

    const data: Prisma.UserUpdateInput = {};
    if (input.name !== undefined) data.name = input.name;
    if (input.role !== undefined) data.role = input.role;
    if (input.status !== undefined) data.status = input.status;
    if (input.password !== undefined) data.passwordHash = await PasswordService.hash(input.password);

    const user = await db.user.update({ where: { id: existing.id }, data, select: USER_SELECT });
    sendData(res, user);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { userId } = getAuth(req);
    if (req.params.id === userId) throw ApiError.forbidden('You cannot deactivate your own account');

    const existing = await db.user.findFirst({ where: { id: req.params.id, deletedAt: null }, select: { id: true } });
    if (!existing) throw ApiError.notFound('User not found');

    // Soft delete + suspend, and revoke their refresh tokens.
    await db.$transaction(async (tx) => {
      await tx.user.update({ where: { id: existing.id }, data: { deletedAt: new Date(), status: 'SUSPENDED' } });
      await tx.refreshToken.updateMany({ where: { userId: existing.id, revoked: false }, data: { revoked: true } });
    });
    sendData(res, { success: true });
  },
};
