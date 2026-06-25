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
