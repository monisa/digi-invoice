import { z } from 'zod';
import { listQuerySchema } from './common.validator';

export const createAccountSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(200),
  industry: z.string().trim().max(120).optional(),
  website: z.string().trim().url('Website must be a valid URL').max(255).optional(),
  billingAddress: z.string().trim().max(2000).optional(),
  shippingAddress: z.string().trim().max(2000).optional(),
});

// Partial for PATCH/PUT; nullable so fields can be explicitly cleared.
export const updateAccountSchema = z
  .object({
    name: z.string().trim().min(1).max(200),
    industry: z.string().trim().max(120).nullable(),
    website: z.string().trim().url('Website must be a valid URL').max(255).nullable(),
    billingAddress: z.string().trim().max(2000).nullable(),
    shippingAddress: z.string().trim().max(2000).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field must be provided');

export const listAccountsSchema = listQuerySchema;

export type CreateAccountInput = z.infer<typeof createAccountSchema>;
export type UpdateAccountInput = z.infer<typeof updateAccountSchema>;
