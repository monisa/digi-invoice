# digi-invoice

Multi-tenant quote / proposal management SaaS (Zoho Quotes–style).

- **Backend:** PHP 8.2+ / Laravel 11, MySQL 8+ — JSON REST API under `/api/v1`
- **Frontend:** Angular SPA
- **Hosting:** Hostinger (plain PHP + MySQL shared hosting — see [`DEPLOYMENT.md`](DEPLOYMENT.md))

## Monorepo layout

```
/backend-php  Laravel API
/frontend     Angular SPA
```

The backend was originally built in Node.js/Express/Prisma, then rewritten in
PHP/Laravel because the target Hostinger plan doesn't include Node.js app
hosting (only plain PHP). See [`PHP_MIGRATION.md`](PHP_MIGRATION.md) for why
and how — the two APIs are contract-identical (same routes, same JSON
envelope, same field names), so the frontend needed no changes.

## Status

**Backend (verified against MySQL 8 and SQLite):** full JWT auth + tenant
scoping + RBAC, CRM (Accounts/Contacts/Deals), Catalog (Products/Tax Rates),
Quotes (CRUD + server-authoritative totals + sequential numbering + PDF +
email), quote templates, the full approval → send → public e-signature
workflow, conversion (Quote → Sales Order → Invoice), user management,
exchange rates (+ live FX sync), and dashboard metrics.

**Frontend (Angular 20 + Material):** app scaffold, core (JWT interceptor
with refresh, AuthService with signals, Auth/Role guards, env config, API
models), login + signup, CRM/Catalog/Quotes screens, quote builder, approval
workflow UI, public e-signature flow, conversion UI, user management,
exchange rates screen, and a dashboard.

Run the frontend: `cd frontend && npm start` → serves on
`http://localhost:6060` (expects the API on `http://localhost:8000`; the
API's `CORS_ALLOWED_ORIGINS` must include the app origin). See
[`backend-php/README.md`](backend-php/README.md) for the API setup.
