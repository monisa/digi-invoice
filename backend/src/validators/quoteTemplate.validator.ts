import { z } from 'zod';
import { listQuerySchema } from './common.validator';

const html = z.string().max(20000);

export const createQuoteTemplateSchema = z.object({
  name: z.string().trim().min(1, 'Name is required').max(160),
  headerHtml: html.nullish(),
  footerHtml: html.nullish(),
  termsHtml: html.nullish(),
  isDefault: z.boolean().optional(),
});

export const updateQuoteTemplateSchema = z
  .object({
    name: z.string().trim().min(1).max(160),
    headerHtml: html.nullable(),
    footerHtml: html.nullable(),
    termsHtml: html.nullable(),
    isDefault: z.boolean(),
  })
  .partial()
  .refine((v) => Object.keys(v).length > 0, 'At least one field must be provided');

export const listQuoteTemplatesSchema = listQuerySchema;

export type CreateQuoteTemplateInput = z.infer<typeof createQuoteTemplateSchema>;
export type UpdateQuoteTemplateInput = z.infer<typeof updateQuoteTemplateSchema>;
