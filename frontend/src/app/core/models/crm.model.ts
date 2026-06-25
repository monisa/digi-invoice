export interface Account {
  id: string;
  name: string;
  industry?: string | null;
  website?: string | null;
  billingAddress?: string | null;
  shippingAddress?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Contact {
  id: string;
  accountId?: string | null;
  name: string;
  email?: string | null;
  phone?: string | null;
  account?: Account | null;
  createdAt: string;
  updatedAt: string;
}

export type DealStage =
  | 'PROSPECTING'
  | 'QUALIFICATION'
  | 'PROPOSAL'
  | 'NEGOTIATION'
  | 'CLOSED_WON'
  | 'CLOSED_LOST';

export const DEAL_STAGES: DealStage[] = [
  'PROSPECTING',
  'QUALIFICATION',
  'PROPOSAL',
  'NEGOTIATION',
  'CLOSED_WON',
  'CLOSED_LOST',
];

export interface Deal {
  id: string;
  accountId?: string | null;
  name: string;
  stage: DealStage;
  amount?: string | null;
  currency: string;
  expectedCloseDate?: string | null;
  account?: Account | null;
  createdAt: string;
  updatedAt: string;
}
