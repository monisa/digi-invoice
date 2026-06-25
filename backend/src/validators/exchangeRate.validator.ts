import { z } from 'zod';
import { currencyCode, listQuerySchema, positiveDecimal } from './common.validator';

export const createExchangeRateSchema = z
  .object({
    baseCurrency: currencyCode,
    targetCurrency: currencyCode,
    rate: positiveDecimal,
    effectiveDate: z.coerce.date(),
  })
  .refine((v) => v.baseCurrency !== v.targetCurrency, {
    message: 'Base and target currency must differ',
    path: ['targetCurrency'],
  });

export const updateExchangeRateSchema = z
  .object({
    rate: positiveDecimal,
    effectiveDate: z.coerce.date(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field must be provided');

export const listExchangeRatesSchema = listQuerySchema.extend({
  baseCurrency: currencyCode.optional(),
  targetCurrency: currencyCode.optional(),
});

export const latestRateQuerySchema = z.object({
  base: currencyCode,
  target: currencyCode,
});

export type CreateExchangeRateInput = z.infer<typeof createExchangeRateSchema>;
export type UpdateExchangeRateInput = z.infer<typeof updateExchangeRateSchema>;
