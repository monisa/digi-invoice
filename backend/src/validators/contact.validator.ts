import { z } from 'zod';
import { listQuerySchema } from './common.validator';

export const createContactSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160),
  accountId: z.string().uuid('Invalid accountId').optional(),
  email: z.string().trim().toLowerCase().email('Invalid email').optional(),
  phone: z.string().trim().max(40).optional(),
});

export const updateContactSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    accountId: z.string().uuid('Invalid accountId').nullable(),
    email: z.string().trim().toLowerCase().email('Invalid email').nullable(),
    phone: z.string().trim().max(40).nullable(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field must be provided');

export const listContactsSchema = listQuerySchema.extend({
  accountId: z.string().uuid('Invalid accountId').optional(),
});

export type CreateContactInput = z.infer<typeof createContactSchema>;
export type UpdateContactInput = z.infer<typeof updateContactSchema>;
