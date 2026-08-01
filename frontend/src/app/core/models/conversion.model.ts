import type { Invoice } from './invoice.model';

export type SalesOrderStatus = 'OPEN' | 'FULFILLED' | 'CANCELLED';

export const SALES_ORDER_STATUSES: SalesOrderStatus[] = ['OPEN', 'FULFILLED', 'CANCELLED'];

interface QuoteRef {
  id?: string;
  quoteNumber: string;
  currency: string;
  grandTotal: string;
  account?: { name: string } | null;
}

export interface SalesOrder {
  id: string;
  orderNumber: string;
  status: SalesOrderStatus;
  createdAt: string;
  quote?: QuoteRef | null;
  invoices?: Invoice[];
}

export function convStatusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function convStatusClass(status: string): string {
  switch (status) {
    case 'FULFILLED':
      return 'status--good';
    case 'CANCELLED':
      return 'status--bad';
    default:
      return 'status--neutral';
  }
}
