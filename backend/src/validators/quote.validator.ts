import { z } from 'zod';
import { DiscountType, QuoteStatus } from '@prisma/client';
import {
  currencyCode,
  listQuerySchema,
  nonNegativeDecimal,
  percentage,
  positiveDecimal,
} from './common.validator';

const lineItemSchema = z.object({
  productId: z.string().uuid('Invalid productId').optional(),
  description: z.string().trim().max(2000).optional(),
  quantity: positiveDecimal,
  unitPrice: nonNegativeDecimal,
  discountPct: percentage.optional(),
  taxRateId: z.string().uuid('Invalid taxRateId').optional(),
});

export const createQuoteSchema = z.object({
  accountId: z.string().uuid('Invalid accountId').optional(),
  contactId: z.string().uuid('Invalid contactId').optional(),
  dealId: z.string().uuid('Invalid dealId').optional(),
  templateId: z.string().uuid('Invalid templateId').optional(),
  ownerId: z.string().uuid('Invalid ownerId').optional(),
  currency: currencyCode.optional(),
  exchangeRate: positiveDecimal.optional(),
  validUntil: z.coerce.date().optional(),
  overallDiscountType: z.nativeEnum(DiscountType).optional(),
  overallDiscountValue: nonNegativeDecimal.optional(),
  lineItems: z.array(lineItemSchema).default([]),
});

export const updateQuoteSchema = z
  .object({
    accountId: z.string().uuid('Invalid accountId').nullable(),
    contactId: z.string().uuid('Invalid contactId').nullable(),
    dealId: z.string().uuid('Invalid dealId').nullable(),
    templateId: z.string().uuid('Invalid templateId').nullable(),
    ownerId: z.string().uuid('Invalid ownerId').nullable(),
    currency: currencyCode,
    exchangeRate: positiveDecimal,
    validUntil: z.coerce.date().nullable(),
    overallDiscountType: z.nativeEnum(DiscountType),
    overallDiscountValue: nonNegativeDecimal,
    // When provided, line items are fully replaced and totals recomputed.
    lineItems: z.array(lineItemSchema),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field must be provided');

export const listQuotesSchema = listQuerySchema.extend({
  status: z.nativeEnum(QuoteStatus).optional(),
  ownerId: z.string().uuid('Invalid ownerId').optional(),
  accountId: z.string().uuid('Invalid accountId').optional(),
  dateFrom: z.coerce.date().optional(),
  dateTo: z.coerce.date().optional(),
});

export type QuoteLineItemInput = z.infer<typeof lineItemSchema>;
export type CreateQuoteInput = z.infer<typeof createQuoteSchema>;
export type UpdateQuoteInput = z.infer<typeof updateQuoteSchema>;
