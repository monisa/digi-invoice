import { z } from 'zod';
import { listQuerySchema, percentage } from './common.validator';

export const createTaxRateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(120),
  percentage,
});

export const updateTaxRateSchema = z
  .object({
    name: z.string().trim().min(1).max(120),
    percentage,
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field must be provided');

export const listTaxRatesSchema = listQuerySchema;

export type CreateTaxRateInput = z.infer<typeof createTaxRateSchema>;
export type UpdateTaxRateInput = z.infer<typeof updateTaxRateSchema>;
