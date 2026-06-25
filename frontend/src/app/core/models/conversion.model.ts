export type SalesOrderStatus = 'OPEN' | 'FULFILLED' | 'CANCELLED';
export type InvoiceStatus = 'DRAFT' | 'ISSUED' | 'PAID' | 'OVERDUE' | 'VOID';

export const SALES_ORDER_STATUSES: SalesOrderStatus[] = ['OPEN', 'FULFILLED', 'CANCELLED'];
export const INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT', 'ISSUED', 'PAID', 'OVERDUE', 'VOID'];

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

export interface Invoice {
  id: string;
  invoiceNumber: string;
  status: InvoiceStatus;
  dueDate?: string | null;
  createdAt: string;
  salesOrder?: { orderNumber: string; quote?: QuoteRef | null } | null;
}

export function convStatusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function convStatusClass(status: string): string {
  switch (status) {
    case 'PAID':
    case 'FULFILLED':
      return 'status--good';
    case 'CANCELLED':
    case 'VOID':
    case 'OVERDUE':
      return 'status--bad';
    case 'ISSUED':
      return 'status--info';
    default:
      return 'status--neutral';
  }
}
