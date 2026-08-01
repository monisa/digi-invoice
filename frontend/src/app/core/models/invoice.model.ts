import type { Account, Contact } from './crm.model';
import type { DiscountType, OwnerSummary } from './quote.model';

export type InvoiceStatus = 'DRAFT' | 'PENDING' | 'PAID' | 'OVERDUE';

export const INVOICE_STATUSES: InvoiceStatus[] = ['DRAFT', 'PENDING', 'PAID', 'OVERDUE'];

export const INVOICE_EDITABLE_STATUSES: InvoiceStatus[] = ['DRAFT'];

export interface InvoiceLineItem {
  id: string;
  productId?: string | null;
  taxRateId?: string | null;
  description?: string | null;
  quantity: string;
  unitPrice: string;
  discountPct: string;
  lineTotal: string;
  position: number;
}

export interface Invoice {
  id: string;
  invoiceNumber: string;
  salesOrderId?: string | null;
  accountId?: string | null;
  contactId?: string | null;
  ownerId?: string | null;
  templateId?: string | null;
  status: InvoiceStatus;
  currency: string;
  exchangeRate: string;
  overallDiscountType: DiscountType;
  overallDiscountValue: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  dueDate?: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems?: InvoiceLineItem[];
  account?: Pick<Account, 'id' | 'name'> | null;
  contact?: Pick<Contact, 'id' | 'name'> | null;
  owner?: OwnerSummary | null;
  salesOrder?: { id: string; orderNumber: string } | null;
}

export interface InvoiceLineItemPayload {
  productId?: string | null;
  description?: string | null;
  quantity: string;
  unitPrice: string;
  discountPct?: string;
  taxRateId?: string | null;
}

export interface InvoicePayload {
  accountId?: string | null;
  contactId?: string | null;
  templateId?: string | null;
  currency?: string;
  exchangeRate?: string;
  dueDate?: string | null;
  overallDiscountType?: DiscountType;
  overallDiscountValue?: string;
  lineItems: InvoiceLineItemPayload[];
}

export function invoiceStatusLabel(status: string): string {
  return status.charAt(0) + status.slice(1).toLowerCase();
}

export function invoiceStatusClass(status: InvoiceStatus): string {
  switch (status) {
    case 'PAID':
      return 'status--good';
    case 'OVERDUE':
      return 'status--bad';
    case 'PENDING':
      return 'status--info';
    default:
      return 'status--neutral';
  }
}
