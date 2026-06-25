import { randomUUID } from 'node:crypto';
import type { Request, Response } from 'express';
import { Prisma, type QuoteStatus } from '@prisma/client';
import { getAuth, getDb } from '../utils/requestContext';
import { ApiError, sendData } from '../utils/apiResponse';
import { buildPageMeta, toPrismaPage } from '../utils/pagination';
import type { TenantPrisma } from '../lib/tenantPrisma';
import { calculateQuote, type CalcLineInput } from '../services/quoteCalculator';
import { PdfService, type QuotePdfData } from '../services/pdf.service';
import { EmailService } from '../services/email.service';
import type {
  CreateQuoteInput,
  QuoteLineItemInput,
  UpdateQuoteInput,
  WorkflowActionInput,
} from '../validators/quote.validator';

// Quotes may only be edited while in these statuses; workflow transitions
// (submit/approve/send) are handled by a dedicated slice.
const EDITABLE: QuoteStatus[] = ['DRAFT', 'REJECTED'];

const QUOTE_INCLUDE = {
  lineItems: { orderBy: { position: 'asc' } },
  account: true,
  contact: true,
  owner: { select: { id: true, name: true, email: true, role: true } },
  activityLog: { orderBy: { createdAt: 'desc' } },
  approvals: {
    orderBy: { createdAt: 'desc' },
    include: {
      requester: { select: { id: true, name: true } },
      approver: { select: { id: true, name: true } },
    },
  },
  signatures: {
    orderBy: { createdAt: 'desc' },
    select: { id: true, signerName: true, signerEmail: true, signedAt: true },
  },
} satisfies Prisma.QuoteInclude;

/** Resolve + validate tax rates for a set of ids; returns id -> percentage. */
async function resolveTaxMap(db: TenantPrisma, ids: string[]): Promise<Map<string, string>> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return new Map();
  const rates = await db.taxRate.findMany({
    where: { id: { in: unique }, deletedAt: null },
    select: { id: true, percentage: true },
  });
  if (rates.length !== unique.length) {
    throw ApiError.badRequest('One or more taxRateId values are invalid', 'lineItems.taxRateId');
  }
  return new Map(rates.map((r) => [r.id, r.percentage.toString()]));
}

/** Validate referenced products all belong to the tenant. */
async function validateProducts(db: TenantPrisma, ids: string[]): Promise<void> {
  const unique = [...new Set(ids)];
  if (unique.length === 0) return;
  const found = await db.product.count({ where: { id: { in: unique }, deletedAt: null } });
  if (found !== unique.length) {
    throw ApiError.badRequest('One or more productId values are invalid', 'lineItems.productId');
  }
}

/** Validate the optional header foreign keys (account/contact/deal/template/owner). */
async function validateHeaderRefs(
  db: TenantPrisma,
  refs: { accountId?: string | null; contactId?: string | null; dealId?: string | null; templateId?: string | null; ownerId?: string | null },
): Promise<void> {
  const checks: Array<[string | null | undefined, () => Promise<number>, string]> = [
    [refs.accountId, () => db.account.count({ where: { id: refs.accountId!, deletedAt: null } }), 'accountId'],
    [refs.contactId, () => db.contact.count({ where: { id: refs.contactId!, deletedAt: null } }), 'contactId'],
    [refs.dealId, () => db.deal.count({ where: { id: refs.dealId!, deletedAt: null } }), 'dealId'],
    [refs.templateId, () => db.quoteTemplate.count({ where: { id: refs.templateId!, deletedAt: null } }), 'templateId'],
    [refs.ownerId, () => db.user.count({ where: { id: refs.ownerId!, deletedAt: null } }), 'ownerId'],
  ];
  for (const [value, count, field] of checks) {
    if (value) {
      // eslint-disable-next-line no-await-in-loop
      if ((await count()) === 0) throw ApiError.badRequest(`${field} does not exist`, field);
    }
  }
}

function toCalcInputs(
  lines: Array<Pick<QuoteLineItemInput, 'quantity' | 'unitPrice' | 'discountPct' | 'taxRateId'>>,
  taxMap: Map<string, string>,
): CalcLineInput[] {
  return lines.map((l) => ({
    quantity: l.quantity,
    unitPrice: l.unitPrice,
    discountPct: l.discountPct ?? 0,
    taxPct: l.taxRateId ? taxMap.get(l.taxRateId) ?? 0 : 0,
  }));
}

export const QuoteController = {
  async list(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { page, pageSize, search, status, ownerId, accountId, dateFrom, dateTo } =
      req.query as unknown as {
        page: number; pageSize: number; search?: string; status?: QuoteStatus;
        ownerId?: string; accountId?: string; dateFrom?: Date; dateTo?: Date;
      };

    const where: Prisma.QuoteWhereInput = {
      deletedAt: null,
      ...(status ? { status } : {}),
      ...(ownerId ? { ownerId } : {}),
      ...(accountId ? { accountId } : {}),
      ...(search ? { quoteNumber: { contains: search } } : {}),
      ...(dateFrom || dateTo
        ? { createdAt: { ...(dateFrom ? { gte: dateFrom } : {}), ...(dateTo ? { lte: dateTo } : {}) } }
        : {}),
    };

    const [items, total] = await Promise.all([
      db.quote.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        include: { owner: { select: { id: true, name: true } }, account: { select: { id: true, name: true } } },
        ...toPrismaPage({ page, pageSize }),
      }),
      db.quote.count({ where }),
    ]);

    sendData(res, items, 200, buildPageMeta(total, { page, pageSize }));
  },

  async get(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const quote = await db.quote.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: QUOTE_INCLUDE,
    });
    if (!quote) throw ApiError.notFound('Quote not found');
    sendData(res, quote);
  },

  async create(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { tenantId, userId } = getAuth(req);
    const input = req.body as CreateQuoteInput;

    const ownerId = input.ownerId ?? userId;
    await validateHeaderRefs(db, { ...input, ownerId });
    await validateProducts(db, input.lineItems.map((l) => l.productId).filter((x): x is string => !!x));
    const taxMap = await resolveTaxMap(db, input.lineItems.map((l) => l.taxRateId).filter((x): x is string => !!x));

    const overallDiscountType = input.overallDiscountType ?? 'PERCENT';
    const overallDiscountValue = input.overallDiscountValue ?? '0';
    const calc = calculateQuote(toCalcInputs(input.lineItems, taxMap), overallDiscountType, overallDiscountValue);

    const created = await db.$transaction(async (tx) => {
      // Atomic per-tenant sequential number, e.g. QT-2026-00001. One counter
      // row per (tenant, prefix, year); the increment is row-atomic.
      const prefix = 'QT';
      const year = new Date().getFullYear();
      const seq = await tx.quoteNumberSequence.upsert({
        where: { tenantId_prefix_year: { tenantId, prefix, year } },
        create: { tenantId, prefix, year, lastValue: 1 },
        update: { lastValue: { increment: 1 } },
      });
      const quoteNumber = `${prefix}-${year}-${String(seq.lastValue).padStart(5, '0')}`;

      return tx.quote.create({
        data: {
          tenantId,
          quoteNumber,
          accountId: input.accountId ?? null,
          contactId: input.contactId ?? null,
          dealId: input.dealId ?? null,
          templateId: input.templateId ?? null,
          ownerId,
          currency: input.currency ?? 'USD',
          exchangeRate: input.exchangeRate ?? '1',
          validUntil: input.validUntil ?? null,
          overallDiscountType,
          overallDiscountValue,
          subtotal: calc.subtotal,
          discountTotal: calc.discountTotal,
          taxTotal: calc.taxTotal,
          grandTotal: calc.grandTotal,
          lineItems: {
            create: input.lineItems.map((l, i) => ({
              productId: l.productId ?? null,
              taxRateId: l.taxRateId ?? null,
              description: l.description ?? null,
              quantity: l.quantity,
              unitPrice: l.unitPrice,
              discountPct: l.discountPct ?? '0',
              lineTotal: calc.lines[i].lineTotal,
              position: i,
            })),
          },
          activityLog: {
            create: { userId, action: 'created', detailsJson: { grandTotal: calc.grandTotal } },
          },
        },
        include: QUOTE_INCLUDE,
      });
    });

    sendData(res, created, 201);
  },

  async update(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { userId } = getAuth(req);
    const input = req.body as UpdateQuoteInput;

    const existing = await db.quote.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: { lineItems: true },
    });
    if (!existing) throw ApiError.notFound('Quote not found');
    if (!EDITABLE.includes(existing.status)) {
      throw ApiError.conflict(`Quote cannot be edited while in status ${existing.status}`);
    }

    await validateHeaderRefs(db, input);

    // Determine the line set to price: the new one if supplied, else existing.
    const replacingLines = input.lineItems !== undefined;
    const linesForCalc = replacingLines
      ? input.lineItems!
      : existing.lineItems.map((l) => ({
          quantity: l.quantity.toString(),
          unitPrice: l.unitPrice.toString(),
          discountPct: l.discountPct.toString(),
          taxRateId: l.taxRateId ?? undefined,
        }));

    if (replacingLines) {
      await validateProducts(db, input.lineItems!.map((l) => l.productId).filter((x): x is string => !!x));
    }
    const taxMap = await resolveTaxMap(db, linesForCalc.map((l) => l.taxRateId).filter((x): x is string => !!x));

    const overallDiscountType = input.overallDiscountType ?? existing.overallDiscountType;
    const overallDiscountValue = input.overallDiscountValue ?? existing.overallDiscountValue.toString();
    const calc = calculateQuote(toCalcInputs(linesForCalc, taxMap), overallDiscountType, overallDiscountValue);

    const updated = await db.$transaction(async (tx) => {
      if (replacingLines) {
        await tx.quoteLineItem.deleteMany({ where: { quoteId: existing.id } });
        await tx.quoteLineItem.createMany({
          data: input.lineItems!.map((l, i) => ({
            quoteId: existing.id,
            productId: l.productId ?? null,
            taxRateId: l.taxRateId ?? null,
            description: l.description ?? null,
            quantity: l.quantity,
            unitPrice: l.unitPrice,
            discountPct: l.discountPct ?? '0',
            lineTotal: calc.lines[i].lineTotal,
            position: i,
          })),
        });
      }

      await tx.quote.update({
        where: { id: existing.id },
        data: {
          ...(input.accountId !== undefined ? { accountId: input.accountId } : {}),
          ...(input.contactId !== undefined ? { contactId: input.contactId } : {}),
          ...(input.dealId !== undefined ? { dealId: input.dealId } : {}),
          ...(input.templateId !== undefined ? { templateId: input.templateId } : {}),
          ...(input.ownerId !== undefined ? { ownerId: input.ownerId } : {}),
          ...(input.currency !== undefined ? { currency: input.currency } : {}),
          ...(input.exchangeRate !== undefined ? { exchangeRate: input.exchangeRate } : {}),
          ...(input.validUntil !== undefined ? { validUntil: input.validUntil } : {}),
          overallDiscountType,
          overallDiscountValue,
          subtotal: calc.subtotal,
          discountTotal: calc.discountTotal,
          taxTotal: calc.taxTotal,
          grandTotal: calc.grandTotal,
        },
      });

      await tx.quoteActivityLog.create({
        data: { quoteId: existing.id, userId, action: 'updated', detailsJson: { grandTotal: calc.grandTotal } },
      });

      return tx.quote.findFirstOrThrow({ where: { id: existing.id }, include: QUOTE_INCLUDE });
    });

    sendData(res, updated);
  },

  async remove(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const { userId } = getAuth(req);
    const existing = await db.quote.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true },
    });
    if (!existing) throw ApiError.notFound('Quote not found');

    await db.$transaction(async (tx) => {
      await tx.quote.update({ where: { id: existing.id }, data: { deletedAt: new Date() } });
      await tx.quoteActivityLog.create({
        data: { quoteId: existing.id, userId, action: 'deleted', detailsJson: Prisma.JsonNull },
      });
    });

    sendData(res, { success: true });
  },

  // --- Workflow transitions ------------------------------------------------
  // State machine:
  //   DRAFT|REJECTED --submit--> PENDING_APPROVAL
  //   PENDING_APPROVAL --approve--> APPROVED   (managers/admins)
  //   PENDING_APPROVAL --reject--> REJECTED    (managers/admins)
  //   APPROVED|DRAFT --send--> SENT

  async submitForApproval(req: Request, res: Response): Promise<void> {
    const quote = await loadQuoteForTransition(req, ['DRAFT', 'REJECTED'], 'submitted for approval');
    const { userId } = getAuth(req);
    const comments = (req.body as WorkflowActionInput).comments ?? null;

    const updated = await getDb(req).$transaction(async (tx) => {
      await tx.quoteApproval.create({
        data: { quoteId: quote.id, requestedBy: userId, status: 'PENDING', comments },
      });
      await tx.quote.update({ where: { id: quote.id }, data: { status: 'PENDING_APPROVAL' } });
      await tx.quoteActivityLog.create({
        data: {
          quoteId: quote.id,
          userId,
          action: 'submitted_for_approval',
          detailsJson: comments ? { comments } : Prisma.JsonNull,
        },
      });
      return tx.quote.findFirstOrThrow({ where: { id: quote.id }, include: QUOTE_INCLUDE });
    });
    sendData(res, updated);
  },

  async approve(req: Request, res: Response): Promise<void> {
    sendData(res, await actOnApproval(req, 'APPROVED'));
  },

  async reject(req: Request, res: Response): Promise<void> {
    sendData(res, await actOnApproval(req, 'REJECTED'));
  },

  async send(req: Request, res: Response): Promise<void> {
    const quote = await loadQuoteForTransition(req, ['APPROVED', 'DRAFT'], 'sent');
    const db = getDb(req);
    const { userId } = getAuth(req);

    const full = await db.quote.findFirstOrThrow({ where: { id: quote.id }, include: PDF_INCLUDE });
    const { buffer } = await PdfService.generateQuotePdf(toPdfData(full));

    const recipient = full.contact?.email ?? null;
    const email = recipient
      ? await EmailService.sendQuote({
          to: recipient,
          companyName: full.tenant.companyName,
          quoteNumber: full.quoteNumber,
          pdf: buffer,
        })
      : { sent: false, skipped: true, reason: 'no recipient email' };

    // Ensure a non-guessable signing token exists for the public link.
    const publicToken = full.publicToken ?? randomUUID();

    const updated = await db.$transaction(async (tx) => {
      await tx.quote.update({ where: { id: quote.id }, data: { status: 'SENT', publicToken } });
      await tx.quoteActivityLog.create({
        data: { quoteId: quote.id, userId, action: 'sent', detailsJson: { emailedTo: recipient, ...email } },
      });
      return tx.quote.findFirstOrThrow({ where: { id: quote.id }, include: QUOTE_INCLUDE });
    });
    sendData(res, updated);
  },

  async signingLink(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const quote = await db.quote.findFirst({
      where: { id: req.params.id, deletedAt: null },
      select: { id: true, publicToken: true },
    });
    if (!quote) throw ApiError.notFound('Quote not found');

    let token = quote.publicToken;
    if (!token) {
      token = randomUUID();
      await db.quote.update({ where: { id: quote.id }, data: { publicToken: token } });
    }
    sendData(res, { token });
  },

  async pdf(req: Request, res: Response): Promise<void> {
    const db = getDb(req);
    const quote = await db.quote.findFirst({
      where: { id: req.params.id, deletedAt: null },
      include: PDF_INCLUDE,
    });
    if (!quote) throw ApiError.notFound('Quote not found');

    const { buffer } = await PdfService.generateQuotePdf(toPdfData(quote));
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `inline; filename="${quote.quoteNumber}.pdf"`);
    res.send(buffer);
  },
};

const PDF_INCLUDE = {
  lineItems: { orderBy: { position: 'asc' } },
  account: { select: { name: true } },
  contact: { select: { name: true, email: true } },
  tenant: { select: { companyName: true } },
} satisfies Prisma.QuoteInclude;

type QuoteWithPdfRelations = Prisma.QuoteGetPayload<{ include: typeof PDF_INCLUDE }>;

function toPdfData(q: QuoteWithPdfRelations): QuotePdfData {
  return {
    tenant: { companyName: q.tenant.companyName },
    quote: {
      id: q.id,
      quoteNumber: q.quoteNumber,
      status: q.status,
      currency: q.currency,
      subtotal: q.subtotal,
      discountTotal: q.discountTotal,
      taxTotal: q.taxTotal,
      grandTotal: q.grandTotal,
      validUntil: q.validUntil,
      createdAt: q.createdAt,
      account: q.account,
      contact: q.contact,
      lineItems: q.lineItems,
    },
  };
}

/** Load a tenant-scoped, non-deleted quote and assert it's in an allowed status. */
async function loadQuoteForTransition(
  req: Request,
  allowed: QuoteStatus[],
  verb: string,
): Promise<{ id: string; status: QuoteStatus }> {
  const db = getDb(req);
  const quote = await db.quote.findFirst({
    where: { id: req.params.id, deletedAt: null },
    select: { id: true, status: true },
  });
  if (!quote) throw ApiError.notFound('Quote not found');
  if (!allowed.includes(quote.status)) {
    throw ApiError.conflict(`A ${quote.status} quote cannot be ${verb}`);
  }
  return quote;
}

/** Approve or reject the pending approval and transition the quote. */
async function actOnApproval(req: Request, decision: 'APPROVED' | 'REJECTED') {
  const quote = await loadQuoteForTransition(
    req,
    ['PENDING_APPROVAL'],
    decision === 'APPROVED' ? 'approved' : 'rejected',
  );
  const { userId } = getAuth(req);
  const comments = (req.body as WorkflowActionInput).comments ?? null;

  return getDb(req).$transaction(async (tx) => {
    const pending = await tx.quoteApproval.findFirst({
      where: { quoteId: quote.id, status: 'PENDING' },
      orderBy: { createdAt: 'desc' },
    });
    if (pending) {
      await tx.quoteApproval.update({
        where: { id: pending.id },
        data: { status: decision, approverId: userId, comments: comments ?? pending.comments, actedAt: new Date() },
      });
    } else {
      await tx.quoteApproval.create({
        data: { quoteId: quote.id, requestedBy: userId, approverId: userId, status: decision, comments, actedAt: new Date() },
      });
    }
    await tx.quote.update({
      where: { id: quote.id },
      data: { status: decision === 'APPROVED' ? 'APPROVED' : 'REJECTED' },
    });
    await tx.quoteActivityLog.create({
      data: {
        quoteId: quote.id,
        userId,
        action: decision === 'APPROVED' ? 'approved' : 'rejected',
        detailsJson: comments ? { comments } : Prisma.JsonNull,
      },
    });
    return tx.quote.findFirstOrThrow({ where: { id: quote.id }, include: QUOTE_INCLUDE });
  });
}
