import { z } from 'zod';
import { DealStage } from '@prisma/client';
import { currencyCode, decimalString, listQuerySchema } from './common.validator';

export const createDealSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  accountId: z.string().uuid('Invalid accountId').optional(),
  stage: z.nativeEnum(DealStage).optional(),
  amount: decimalString.optional(),
  currency: currencyCode.optional(),
  expectedCloseDate: z.coerce.date().optional(),
});

export const updateDealSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    accountId: z.string().uuid('Invalid accountId').nullable(),
    stage: z.nativeEnum(DealStage),
    amount: decimalString.nullable(),
    currency: currencyCode,
    expectedCloseDate: z.coerce.date().nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field must be provided');

export const listDealsSchema = listQuerySchema.extend({
  accountId: z.string().uuid('Invalid accountId').optional(),
  stage: z.nativeEnum(DealStage).optional(),
});

export type CreateDealInput = z.infer<typeof createDealSchema>;
export type UpdateDealInput = z.infer<typeof updateDealSchema>;
