import type { Account, Contact } from './crm.model';

export type QuoteStatus =
  | 'DRAFT'
  | 'PENDING_APPROVAL'
  | 'APPROVED'
  | 'REJECTED'
  | 'SENT'
  | 'ACCEPTED'
  | 'DECLINED'
  | 'EXPIRED';

export type DiscountType = 'PERCENT' | 'AMOUNT';

export const EDITABLE_STATUSES: QuoteStatus[] = ['DRAFT', 'REJECTED'];

export interface QuoteLineItem {
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

export interface QuoteActivityEntry {
  id: string;
  userId?: string | null;
  action: string;
  detailsJson?: unknown;
  createdAt: string;
}

export interface OwnerSummary {
  id: string;
  name: string;
  email?: string;
  role?: string;
}

export type ApprovalStatus = 'PENDING' | 'APPROVED' | 'REJECTED';

export interface QuoteApproval {
  id: string;
  status: ApprovalStatus;
  comments?: string | null;
  createdAt: string;
  actedAt?: string | null;
  requester?: { id: string; name: string } | null;
  approver?: { id: string; name: string } | null;
}

export interface Quote {
  id: string;
  quoteNumber: string;
  accountId?: string | null;
  contactId?: string | null;
  templateId?: string | null;
  ownerId?: string | null;
  status: QuoteStatus;
  currency: string;
  exchangeRate: string;
  overallDiscountType: DiscountType;
  overallDiscountValue: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  validUntil?: string | null;
  createdAt: string;
  updatedAt: string;
  lineItems?: QuoteLineItem[];
  account?: Pick<Account, 'id' | 'name'> | null;
  contact?: Pick<Contact, 'id' | 'name'> | null;
  publicToken?: string | null;
  owner?: OwnerSummary | null;
  activityLog?: QuoteActivityEntry[];
  approvals?: QuoteApproval[];
  signatures?: QuoteSignatureSummary[];
}

export interface QuoteSignatureSummary {
  id: string;
  signerName?: string | null;
  signerEmail?: string | null;
  signedAt?: string | null;
}

/** Public (unauthenticated) read-only projection for the signing page. */
export interface PublicQuoteView {
  quoteNumber: string;
  companyName: string;
  status: QuoteStatus;
  awaitingSignature: boolean;
  currency: string;
  subtotal: string;
  discountTotal: string;
  taxTotal: string;
  grandTotal: string;
  validUntil?: string | null;
  account?: { name: string } | null;
  contact?: { name: string; email?: string | null } | null;
  lineItems: Array<{
    description?: string | null;
    quantity: string;
    unitPrice: string;
    discountPct: string;
    lineTotal: string;
  }>;
}

export interface QuoteLineItemPayload {
  productId?: string | null;
  description?: string | null;
  quantity: string;
  unitPrice: string;
  discountPct?: string;
  taxRateId?: string | null;
}

export interface QuotePayload {
  accountId?: string | null;
  contactId?: string | null;
  templateId?: string | null;
  currency?: string;
  exchangeRate?: string;
  validUntil?: string | null;
  overallDiscountType?: DiscountType;
  overallDiscountValue?: string;
  lineItems: QuoteLineItemPayload[];
}
