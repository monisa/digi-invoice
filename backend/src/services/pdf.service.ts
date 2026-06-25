import PDFDocument from 'pdfkit';
import { mkdir, writeFile } from 'node:fs/promises';
import path from 'node:path';

/**
 * Server-side PDF generation with PDFKit — pure JS, built-in AFM fonts (no
 * font files, no headless browser), so it runs on Hostinger shared hosting.
 * Decimal/Date values are accepted as-is and stringified.
 */

export interface QuotePdfData {
  tenant: { companyName: string };
  /** Optional branding template; HTML is reduced to text for the PDF. */
  template?: { headerHtml?: string | null; footerHtml?: string | null; termsHtml?: string | null } | null;
  quote: {
    id: string;
    quoteNumber: string;
    status: string;
    currency: string;
    subtotal: unknown;
    discountTotal: unknown;
    taxTotal: unknown;
    grandTotal: unknown;
    validUntil?: Date | null;
    createdAt: Date;
    account?: { name: string } | null;
    contact?: { name: string; email?: string | null } | null;
    lineItems: Array<{
      description?: string | null;
      quantity: unknown;
      unitPrice: unknown;
      discountPct: unknown;
      lineTotal: unknown;
    }>;
  };
}

const STORAGE_DIR = path.resolve(__dirname, '../../storage/pdfs');
const s = (v: unknown): string => (v === null || v === undefined ? '' : String(v));

export const PdfService = {
  /** Render the quote to a PDF buffer and persist it under /storage/pdfs. */
  async generateQuotePdf(data: QuotePdfData): Promise<{ buffer: Buffer; filePath: string }> {
    const buffer = await render(data);
    await mkdir(STORAGE_DIR, { recursive: true });
    const filePath = path.join(STORAGE_DIR, `${data.quote.id}.pdf`);
    await writeFile(filePath, buffer);
    return { buffer, filePath };
  },
};

function render(data: QuotePdfData): Promise<Buffer> {
  const { tenant, quote, template } = data;
  const doc = new PDFDocument({ size: 'A4', margin: 50 });
  const done = collect(doc);

  const left = doc.page.margins.left;
  const right = doc.page.width - doc.page.margins.right;
  const money = (v: unknown) => `${s(v)} ${quote.currency}`;

  // Resolve {{placeholders}} and reduce HTML to plain text for the PDF.
  const placeholders: Record<string, string> = {
    company_name: tenant.companyName,
    quote_number: quote.quoteNumber,
    client_name: quote.account?.name ?? '',
    contact_name: quote.contact?.name ?? '',
    grand_total: `${s(quote.grandTotal)} ${quote.currency}`,
    currency: quote.currency,
    valid_until: quote.validUntil ? formatDate(quote.validUntil) : '',
  };
  const fill = (html?: string | null): string =>
    html ? htmlToText(html.replace(/\{\{\s*(\w+)\s*\}\}/g, (_, k: string) => placeholders[k] ?? '')) : '';
  const headerText = fill(template?.headerHtml);
  const termsText = fill(template?.termsHtml);
  const footerText = fill(template?.footerHtml);

  // Header
  doc.fontSize(20).font('Helvetica-Bold').text(tenant.companyName, left, 50);
  doc.fontSize(16).font('Helvetica').fillColor('#555').text('QUOTE', { align: 'right' });
  doc.moveDown(0.2);
  doc.fontSize(10).fillColor('#000');
  doc.text(`Quote #: ${quote.quoteNumber}`, { align: 'right' });
  doc.text(`Status: ${quote.status}`, { align: 'right' });
  doc.text(`Date: ${formatDate(quote.createdAt)}`, { align: 'right' });
  if (quote.validUntil) doc.text(`Valid until: ${formatDate(quote.validUntil)}`, { align: 'right' });

  // Bill-to
  doc.moveDown(2);
  doc.font('Helvetica-Bold').fontSize(11).text('Bill to');
  doc.font('Helvetica').fontSize(10).fillColor('#333');
  doc.text(quote.account?.name ?? '—');
  if (quote.contact?.name) doc.text(quote.contact.name);
  if (quote.contact?.email) doc.text(quote.contact.email);
  doc.fillColor('#000');

  // Template header / intro
  if (headerText) {
    doc.moveDown(1.2);
    doc.font('Helvetica').fontSize(10).fillColor('#333').text(headerText, left, doc.y, { width: right - left });
    doc.fillColor('#000');
  }

  // Line items table
  doc.moveDown(1.5);
  const cols = { desc: left, qty: 300, price: 350, disc: 420, total: 470 };
  const headerY = doc.y;
  doc.font('Helvetica-Bold').fontSize(9);
  doc.text('Description', cols.desc, headerY);
  doc.text('Qty', cols.qty, headerY, { width: 40, align: 'right' });
  doc.text('Unit', cols.price, headerY, { width: 60, align: 'right' });
  doc.text('Disc%', cols.disc, headerY, { width: 40, align: 'right' });
  doc.text('Total', cols.total, headerY, { width: right - cols.total, align: 'right' });
  doc.moveTo(left, doc.y + 2).lineTo(right, doc.y + 2).strokeColor('#ccc').stroke();

  doc.font('Helvetica').fontSize(9).fillColor('#000');
  for (const li of quote.lineItems) {
    const y = doc.y + 6;
    doc.text(s(li.description) || '—', cols.desc, y, { width: cols.qty - cols.desc - 10 });
    const rowY = y;
    doc.text(s(li.quantity), cols.qty, rowY, { width: 40, align: 'right' });
    doc.text(s(li.unitPrice), cols.price, rowY, { width: 60, align: 'right' });
    doc.text(s(li.discountPct), cols.disc, rowY, { width: 40, align: 'right' });
    doc.text(s(li.lineTotal), cols.total, rowY, { width: right - cols.total, align: 'right' });
    doc.moveDown(0.5);
  }

  // Totals
  doc.moveTo(left, doc.y + 4).lineTo(right, doc.y + 4).strokeColor('#ccc').stroke();
  doc.moveDown(1);
  const totalsX = 350;
  const totalLine = (label: string, value: string, bold = false) => {
    doc.font(bold ? 'Helvetica-Bold' : 'Helvetica').fontSize(bold ? 11 : 9);
    const y = doc.y;
    doc.text(label, totalsX, y, { width: 80 });
    doc.text(value, totalsX + 80, y, { width: right - totalsX - 80, align: 'right' });
    doc.moveDown(0.3);
  };
  totalLine('Subtotal', money(quote.subtotal));
  totalLine('Discount', `- ${money(quote.discountTotal)}`);
  totalLine('Tax', money(quote.taxTotal));
  totalLine('Grand total', money(quote.grandTotal), true);

  // Template terms
  if (termsText) {
    doc.moveDown(2);
    doc.font('Helvetica-Bold').fontSize(10).fillColor('#000').text('Terms', left, doc.y);
    doc.font('Helvetica').fontSize(9).fillColor('#444').text(termsText, { width: right - left });
    doc.fillColor('#000');
  }

  // Footer — template footer if provided, else a default line
  doc.font('Helvetica').fontSize(8).fillColor('#999');
  doc.text(footerText || 'Thank you for your business.', left, doc.page.height - 70, {
    align: 'center',
    width: right - left,
  });

  doc.end();
  return done;
}

function htmlToText(html: string): string {
  return html
    .replace(/<\s*br\s*\/?>/gi, '\n')
    .replace(/<\/\s*(p|div|h[1-6]|li)\s*>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;/gi, "'")
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function collect(doc: PDFKit.PDFDocument): Promise<Buffer> {
  return new Promise((resolve, reject) => {
    const chunks: Buffer[] = [];
    doc.on('data', (c: Buffer) => chunks.push(c));
    doc.on('end', () => resolve(Buffer.concat(chunks)));
    doc.on('error', reject);
  });
}

function formatDate(d: Date): string {
  return new Date(d).toISOString().slice(0, 10);
}
