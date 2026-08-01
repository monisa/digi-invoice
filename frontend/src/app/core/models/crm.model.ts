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
