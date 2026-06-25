import { z } from 'zod';
import { InvoiceStatus, SalesOrderStatus } from '@prisma/client';
import { listQuerySchema } from './common.validator';

export const listSalesOrdersSchema = listQuerySchema.extend({
  status: z.nativeEnum(SalesOrderStatus).optional(),
});

export const updateSalesOrderStatusSchema = z.object({
  status: z.nativeEnum(SalesOrderStatus),
});

export const listInvoicesSchema = listQuerySchema.extend({
  status: z.nativeEnum(InvoiceStatus).optional(),
});

export const updateInvoiceStatusSchema = z.object({
  status: z.nativeEnum(InvoiceStatus),
  dueDate: z.coerce.date().nullable().optional(),
});

export type UpdateSalesOrderStatusInput = z.infer<typeof updateSalesOrderStatusSchema>;
export type UpdateInvoiceStatusInput = z.infer<typeof updateInvoiceStatusSchema>;
