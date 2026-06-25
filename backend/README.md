# digi-invoice — Backend API

Node.js + Express + TypeScript, Prisma ORM, MySQL 8+. JSON REST API under `/api/v1`.

## Setup

```bash
cd backend
npm install
cp .env.example .env          # then edit DATABASE_URL + JWT secrets
npm run prisma:generate       # generate the Prisma client
npm run prisma:migrate        # create the DB schema (needs a reachable MySQL)
npm run seed                  # optional: demo tenant + admin user
npm run dev                   # start on http://localhost:3000
```

Health check: `GET http://localhost:3000/api/v1/health`

## Deploying to Hostinger

1. In hPanel, set the Node.js app **environment variables** (never commit them):
   `DATABASE_URL`, `JWT_ACCESS_SECRET`, `JWT_REFRESH_SECRET`, `CORS_ORIGINS`,
   `NODE_ENV=production`. Optionally `SMTP_HOST`/`SMTP_PORT`/`SMTP_USER`/
   `SMTP_PASS`/`SMTP_SECURE`/`MAIL_FROM` to email quotes on send (without them,
   "send" still generates the PDF and transitions the quote, skipping email).
2. The Hostinger `DATABASE_URL` uses `host=localhost` (resolves on the server).
   URL-encode special characters in the password — e.g. raw `sS*>n/#/0K`
   becomes `sS*%3En%2F%23%2F0K`. A commented reference value lives in `.env`.
3. Apply migrations against the production DB at release time:
   `npm run prisma:deploy` (runs `prisma migrate deploy` — no schema drift, no
   data loss, applies committed migrations only).

> **Security:** the database password was shared in chat during setup —
> **rotate it in hPanel** and update the env var.

## Architecture (Slice 1 — Foundation)

| Concern            | Where                                             |
| ------------------ | ------------------------------------------------- |
| Env validation     | `src/config/env.ts` (zod, fail-fast at boot)      |
| Base Prisma client | `src/lib/prisma.ts` (auth/bootstrap paths only)   |
| **Tenant scoping** | `src/lib/tenantPrisma.ts` — `forTenant(tenantId)` |
| JWT                | `src/services/jwt.service.ts`                     |
| Passwords/tokens   | `src/services/password.service.ts` (bcryptjs)     |
| Auth middleware    | `src/middleware/auth.middleware.ts`               |
| Tenant middleware  | `src/middleware/tenantScope.middleware.ts`        |
| RBAC middleware    | `src/middleware/role.middleware.ts`               |
| Error handling     | `src/middleware/error.middleware.ts`              |
| Response envelope  | `src/utils/apiResponse.ts` (`{ data, meta, errors }`) |

### Tenant isolation — read this before adding endpoints

`forTenant(tenantId)` returns a Prisma client extension that **auto-injects
`tenantId`** into every read/update/delete `where` and every create `data`, for
all models that own a `tenantId` column. Controllers get it as **`req.db`**
(set by `tenantScope` after `authenticate`) and must use it for all
tenant-owned data:

```ts
router.get('/', authenticate, tenantScope, requireRole('ADMIN'),
  asyncHandler(async (req, res) => {
    const accounts = await req.db!.account.findMany();  // already tenant-scoped
    sendData(res, accounts);
  }),
);
```

**Never** read `tenantId` from the request body, and **never** use the base
`prisma` client for tenant data. Child records without their own `tenantId`
(line items, approvals, signatures, activity logs, refresh tokens) must be
reached through their tenant-scoped parent (nested writes or a relation filter
like `{ quote: { tenantId } }`).

## Build roadmap (next slices)

2. Auth endpoints — signup (tenant + first admin), login, refresh, logout
3. Accounts / Contacts / Deals CRUD
4. Products & Tax Rates CRUD
5. Quotes + line items + server-authoritative totals (decimal.js)
6. Quote templates → PDF (Puppeteer/pdfmake) → email (Nodemailer)
7. Approval workflow · public e-signature · conversion · dashboard
