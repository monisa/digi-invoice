import type { Request, Response } from 'express';
import type { Prisma } from '@prisma/client';
import { getAuth, getDb } from '../utils/requestContext';
import { prisma } from '../lib/prisma';
import { ApiError, sendData } from '../utils/apiResponse';
import { buildPageMeta, toPrismaPage } from '../utils/pagination';
import { CurrencyService } from '../services/currency.service';
import type { CreateExchangeRateInput, UpdateExchangeRateInput } from '../validators/exchangeRate.validator';

export const ExchangeRateController = {
  async list(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { page, pageSize, baseCurrency, targetCurrency } = req.query as unknown as {
      page: number; pageSize: number; baseCurrency?: string; targetCurrency?: string;
    };
    const where: Prisma.ExchangeRateWhereInput = {
      ...(baseCurrency ? { baseCurrency } : {}),
      ...(targetCurrency ? { targetCurrency } : {}),
    };
    const [items, total] = await Promise.all([
      db.exchangeRate.findMany({ where, orderBy: { effectiveDate: 'desc' }, ...toPrismaPage({ page, pageSize }) }),
      db.exchangeRate.count({ where }),
    ]);
    sendData(res, items, 200, buildPageMeta(total, { page, pageSize }));
  },

  /** Most recent rate for a base->target pair. */
  async latest(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { base, target } = req.query as unknown as { base: string; target: string };
    if (base === target) {
      sendData(res, { baseCurrency: base, targetCurrency: target, rate: '1', effectiveDate: null });
      return;
    }
    const rate = await db.exchangeRate.findFirst({
      where: { baseCurrency: base, targetCurrency: target },
      orderBy: { effectiveDate: 'desc' },
    });
    if (!rate) throw ApiError.notFound('No exchange rate found for that currency pair');
    sendData(res, rate);
  },

  async create(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { tenantId } = getAuth(req);
    const input = req.body as CreateExchangeRateInput;
    const rate = await db.exchangeRate.create({ data: { ...input, tenantId } });
    sendData(res, rate, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const existing = await db.exchangeRate.findFirst({ where: { id: req.params.id }, select: { id: true } });
    if (!existing) throw ApiError.notFound('Exchange rate not found');
    const rate = await db.exchangeRate.update({ where: { id: existing.id }, data: req.body as UpdateExchangeRateInput });
    sendData(res, rate);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const existing = await db.exchangeRate.findFirst({ where: { id: req.params.id }, select: { id: true } });
    if (!existing) throw ApiError.notFound('Exchange rate not found');
    await db.exchangeRate.delete({ where: { id: existing.id } });
    sendData(res, { success: true });
  },

  /** Pull live rates from the FX provider for the tenant's base currency. */
  async sync(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { tenantId } = getAuth(req);
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId }, select: { currencyDefault: true } });
    const base = tenant?.currencyDefault ?? 'USD';
    const count = await CurrencyService.syncFromApi(db, tenantId, base);
    sendData(res, { baseCurrency: base, updated: count });
  },
};
