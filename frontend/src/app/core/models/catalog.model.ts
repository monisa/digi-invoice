export interface TaxRate {
  id: string;
  name: string;
  percentage: string;
  createdAt: string;
  updatedAt: string;
}

export interface Product {
  id: string;
  name: string;
  sku?: string | null;
  unitPrice: string;
  currency: string;
  taxRateId?: string | null;
  description?: string | null;
  taxRate?: Pick<TaxRate, 'id' | 'name' | 'percentage'> | null;
  createdAt: string;
  updatedAt: string;
}
