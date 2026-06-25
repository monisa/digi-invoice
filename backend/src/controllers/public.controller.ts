import { randomUUID } from 'node:crypto';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';
import type { Request, Response } from 'express';
import { prisma } from '../lib/prisma';
import { ApiError, sendData } from '../utils/apiResponse';
import type { DeclineQuoteInput, SignQuoteInput } from '../validators/publicSign.validator';

/**
 * Public, UNAUTHENTICATED quote signing. Access is gated solely by the
 * non-guessable UUID token in the URL, which maps to exactly one quote. These
 * handlers use the base prisma client (no tenant context) and only ever expose
 * the single quote the token resolves to. Routes are rate-limited.
 */

const SIGNATURE_DIR = path.resolve(__dirname, '../../storage/signatures');

async function loadQuoteByToken(token: string) {
  const quote = await prisma.quote.findFirst({
    where: { publicToken: token, deletedAt: null },
    include: {
      tenant: { select: { companyName: true } },
      account: { select: { name: true } },
      contact: { select: { name: true, email: true } },
      lineItems: { orderBy: { position: 'asc' } },
    },
  });
  if (!quote) throw ApiError.notFound('Quote not found');
  return quote;
}

/** Public, read-only projection — never leak tenantId, owner, internal ids beyond the quote. */
function publicView(q: Awaited<ReturnType<typeof loadQuoteByToken>>) {
  return {
    quoteNumber: q.quoteNumber,
    companyName: q.tenant.companyName,
    status: q.status,
    awaitingSignature: q.status === 'SENT',
    currency: q.currency,
    subtotal: q.subtotal,
    discountTotal: q.discountTotal,
    taxTotal: q.taxTotal,
    grandTotal: q.grandTotal,
    validUntil: q.validUntil,
    account: q.account,
    contact: q.contact,
    lineItems: q.lineItems.map((l) => ({
      description: l.description,
      quantity: l.quantity,
      unitPrice: l.unitPrice,
      discountPct: l.discountPct,
      lineTotal: l.lineTotal,
    })),
  };
}

async function saveSignatureImage(dataUrl: string): Promise<string> {
  const [, mime, b64] = /^data:image\/(png|jpeg);base64,(.+)$/s.exec(dataUrl) ?? [];
  if (!b64) throw ApiError.badRequest('Invalid signature image', 'signatureImage');
  await mkdir(SIGNATURE_DIR, { recursive: true });
  const file = `${randomUUID()}.${mime === 'jpeg' ? 'jpg' : 'png'}`;
  await writeFile(path.join(SIGNATURE_DIR, file), Buffer.from(b64, 'base64'));
  return `signatures/${file}`;
}

export const PublicController = {
  async getQuote(req: Request, res: Response): Promise<void> {
    const quote = await loadQuoteByToken(req.params.token);
    sendData(res, publicView(quote));
  },

  async sign(req: Request, res: Response): Promise<void> {
    const token = req.params.token;
    const input = req.body as SignQuoteInput;
    const quote = await loadQuoteByToken(token);
    if (quote.status !== 'SENT') {
      throw ApiError.conflict('This quote is not awaiting signature');
    }

    const signaturePath = input.signatureImage ? await saveSignatureImage(input.signatureImage) : null;

    await prisma.$transaction(async (tx) => {
      await tx.quoteSignature.create({
        data: {
          quoteId: quote.id,
          signerName: input.signerName,
          signerEmail: input.signerEmail ?? null,
          signatureImagePath: signaturePath,
          ipAddress: req.ip ?? null,
          publicToken: token,
          signedAt: new Date(),
        },
      });
      await tx.quote.update({ where: { id: quote.id }, data: { status: 'ACCEPTED' } });
      await tx.quoteActivityLog.create({
        data: { quoteId: quote.id, action: 'accepted', detailsJson: { signerName: input.signerName } },
      });
    });

    sendData(res, { status: 'ACCEPTED' });
  },

  async decline(req: Request, res: Response): Promise<void> {
    const quote = await loadQuoteByToken(req.params.token);
    if (quote.status !== 'SENT') {
      throw ApiError.conflict('This quote is not awaiting a decision');
    }
    const reason = (req.body as DeclineQuoteInput).reason ?? null;

    await prisma.$transaction(async (tx) => {
      await tx.quote.update({ where: { id: quote.id }, data: { status: 'DECLINED' } });
      await tx.quoteActivityLog.create({
        data: { quoteId: quote.id, action: 'declined', detailsJson: reason ? { reason } : undefined },
      });
    });

    sendData(res, { status: 'DECLINED' });
  },
};
