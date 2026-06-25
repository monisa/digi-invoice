import { z } from 'zod';

export const tokenParamSchema = z.object({
  token: z.string().uuid('Invalid token'),
});

export const signQuoteSchema = z.object({
  signerName: z.string().trim().min(1, 'Name is required').max(160),
  signerEmail: z.string().trim().toLowerCase().email('Invalid email').optional(),
  /** Optional PNG data URL from the signature pad. */
  signatureImage: z
    .string()
    .regex(/^data:image\/(png|jpeg);base64,/, 'Invalid signature image')
    .max(2_000_000)
    .optional(),
});

export const declineQuoteSchema = z.object({
  reason: z.string().trim().max(1000).optional(),
});

export type SignQuoteInput = z.infer<typeof signQuoteSchema>;
export type DeclineQuoteInput = z.infer<typeof declineQuoteSchema>;
