import { z } from 'zod';
import { currencyCode, listQuerySchema, nonNegativeDecimal } from './common.validator';

export const createProductSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  sku: z.string().trim().min(1).max(64).optional(),
  unitPrice: nonNegativeDecimal,
  currency: currencyCode.optional(),
  taxRateId: z.string().uuid('Invalid taxRateId').optional(),
  description: z.string().trim().max(5000).optional(),
});

export const updateProductSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    sku: z.string().trim().min(1).max(64).nullable(),
    unitPrice: nonNegativeDecimal,
    currency: currencyCode,
    taxRateId: z.string().uuid('Invalid taxRateId').nullable(),
    description: z.string().trim().max(5000).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field must be provided');

export const listProductsSchema = listQuerySchema.extend({
  taxRateId: z.string().uuid('Invalid taxRateId').optional(),
});

export type CreateProductInput = z.infer<typeof createProductSchema>;
export type UpdateProductInput = z.infer<typeof updateProductSchema>;
