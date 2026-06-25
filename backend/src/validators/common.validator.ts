import { z } from 'zod';

/** UUID path param, e.g. /accounts/:id */
export const idParamSchema = z.object({
  id: z.string().uuid('Invalid id'),
});

/** Base list query: page, pageSize, optional free-text search. */
export const listQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  pageSize: z.coerce.number().int().min(1).max(100).default(20),
  search: z.string().trim().min(1).optional(),
});

/** Sort direction shared by list endpoints. */
export const sortOrderSchema = z.enum(['asc', 'desc']).default('desc');

/**
 * Monetary / decimal input. Accepts a number or numeric string and normalises
 * to a string so it maps cleanly to Prisma Decimal without float drift.
 */
export const decimalString = z
  .union([z.number(), z.string()])
  .refine((v) => v !== '' && !Number.isNaN(Number(v)), 'Must be a valid number')
  .transform((v) => String(v));

/** ISO 3-letter currency code, normalised to uppercase. */
export const currencyCode = z
  .string()
  .trim()
  .toUpperCase()
  .length(3, 'Currency must be a 3-letter ISO code');

/** Non-negative monetary amount; accepts number or string, rejects NaN. */
export const nonNegativeDecimal = z.coerce
  .number({ invalid_type_error: 'Must be a number' })
  .min(0, 'Must be zero or greater')
  .finite('Must be a finite number')
  .transform((v) => String(v));

/** Strictly positive decimal (e.g. quantity); normalised to a string. */
export const positiveDecimal = z.coerce
  .number({ invalid_type_error: 'Must be a number' })
  .gt(0, 'Must be greater than zero')
  .finite('Must be a finite number')
  .transform((v) => String(v));

/** Tax percentage 0–100; normalised to a string for Prisma Decimal. */
export const percentage = z.coerce
  .number({ invalid_type_error: 'Must be a number' })
  .min(0, 'Percentage cannot be negative')
  .max(100, 'Percentage cannot exceed 100')
  .transform((v) => String(v));
