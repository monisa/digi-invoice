import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

/**
 * Idempotent dev seed: one demo tenant + an admin user.
 * Run with: npm run seed
 */
const prisma = new PrismaClient();

async function main() {
  const subdomain = 'demo';
  const adminEmail = 'admin@demo.test';
  const adminPassword = 'ChangeMe123!';

  const tenant = await prisma.tenant.upsert({
    where: { subdomain },
    update: {},
    create: {
      companyName: 'Demo Company',
      subdomain,
      plan: 'PRO',
      currencyDefault: 'USD',
    },
  });

  const passwordHash = await bcrypt.hash(adminPassword, 10);

  await prisma.user.upsert({
    where: { tenantId_email: { tenantId: tenant.id, email: adminEmail } },
    update: {},
    create: {
      tenantId: tenant.id,
      name: 'Demo Admin',
      email: adminEmail,
      passwordHash,
      role: 'ADMIN',
      status: 'ACTIVE',
    },
  });

  // A default tax rate and quote template to get started.
  await prisma.taxRate.create({
    data: { tenantId: tenant.id, name: 'Standard VAT', percentage: '20.0000' },
  }).catch(() => undefined);

  await prisma.quoteTemplate.upsert({
    where: { id: `${tenant.id}-default-template` },
    update: {},
    create: {
      id: `${tenant.id}-default-template`,
      tenantId: tenant.id,
      name: 'Default Template',
      headerHtml: '<h1>{{company_name}}</h1>',
      footerHtml: '<p>Thank you for your business.</p>',
      termsHtml: '<p>Valid until {{valid_until}}.</p>',
      isDefault: true,
    },
  });

  // A richer sample template with a full Terms & Conditions section.
  await prisma.quoteTemplate.upsert({
    where: { id: `${tenant.id}-sample-template` },
    update: {},
    create: {
      id: `${tenant.id}-sample-template`,
      tenantId: tenant.id,
      name: 'Standard Sales Quote',
      headerHtml:
        '<h1>{{company_name}}</h1>' +
        '<p>Quote {{quote_number}} prepared for {{client_name}}.</p>' +
        '<p>We are pleased to submit the following proposal for your consideration.</p>',
      termsHtml:
        '<p><strong>Terms &amp; Conditions</strong></p>' +
        '<p>1. Validity: This quote is valid until {{valid_until}}. Prices are subject to change after this date.</p>' +
        '<p>2. Pricing: All amounts are stated in {{currency}} and are exclusive of any applicable taxes or duties unless otherwise noted.</p>' +
        '<p>3. Payment: Payment is due within 30 days of the invoice date. Late payments may incur interest at 1.5% per month.</p>' +
        '<p>4. Acceptance: Written acceptance of this quote, or issuance of a purchase order, constitutes agreement to these terms.</p>' +
        '<p>5. Delivery: Delivery and lead times are estimates from the date of order confirmation and are not guaranteed.</p>' +
        '<p>6. Cancellation: Orders cancelled after confirmation may be subject to a restocking or cancellation fee.</p>' +
        '<p>7. Warranty: Goods and services are provided in accordance with our standard warranty; no other warranties are implied.</p>' +
        '<p>8. Governing law: This agreement is governed by the laws of the jurisdiction in which {{company_name}} is registered.</p>',
      footerHtml: '<p>Thank you for your business — we look forward to working with you.</p>',
      isDefault: false,
    },
  });

  // eslint-disable-next-line no-console
  console.log(`Seeded tenant "${tenant.companyName}" (${subdomain}).`);
  // eslint-disable-next-line no-console
  console.log(`Admin login: ${adminEmail} / ${adminPassword}`);
}

main()
  .catch((e) => {
    // eslint-disable-next-line no-console
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
