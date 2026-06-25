import type { QuoteStatus } from '../../core/models/quote.model';

export const QUOTE_STATUSES: QuoteStatus[] = [
  'DRAFT',
  'PENDING_APPROVAL',
  'APPROVED',
  'REJECTED',
  'SENT',
  'ACCEPTED',
  'DECLINED',
  'EXPIRED',
];

export function statusLabel(status: string): string {
  return status.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Maps a status to a CSS class (defined in the list/detail styles). */
export function statusClass(status: QuoteStatus): string {
  switch (status) {
    case 'ACCEPTED':
    case 'APPROVED':
      return 'status--good';
    case 'REJECTED':
    case 'DECLINED':
    case 'EXPIRED':
      return 'status--bad';
    case 'SENT':
    case 'PENDING_APPROVAL':
      return 'status--info';
    default:
      return 'status--neutral';
  }
}
