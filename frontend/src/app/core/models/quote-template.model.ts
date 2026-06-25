export interface QuoteTemplate {
  id: string;
  name: string;
  headerHtml?: string | null;
  footerHtml?: string | null;
  termsHtml?: string | null;
  isDefault: boolean;
  createdAt: string;
  updatedAt: string;
}

/** Placeholders supported in template HTML (substituted when rendering the PDF). */
export const TEMPLATE_PLACEHOLDERS = [
  'company_name',
  'quote_number',
  'client_name',
  'contact_name',
  'grand_total',
  'currency',
  'valid_until',
];
