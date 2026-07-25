# Backend migration: Node.js/Express → PHP/Laravel

## Why

The original backend (`/backend`) is Node.js + Express + TypeScript + Prisma,
built to run under Hostinger's Node.js app hosting feature (see
`backend/README.md`'s original "Deploying to Hostinger" section).

During deployment it turned out the live Hostinger account
(`digifoxprosolutions.com`, "Business" plan) does not have Node.js app
hosting available — it's a PHP/static shared-hosting plan. Options
considered: upgrade the Hostinger plan, buy a Hostinger VPS, or host the
Node API on a separate Node-friendly service (e.g. Render) while keeping the
frontend on Hostinger. Decision: **rewrite the backend in PHP (Laravel)** so
the whole app — frontend and backend — runs natively on the existing
Hostinger Business plan with no extra infrastructure or cost.

## What this means

This is a full rewrite of the API layer, not a syntax conversion. The
Node backend at `/backend` (kept in place as the reference implementation
until the rewrite reaches parity) covers:

- JWT auth + refresh tokens, multi-tenant scoping (every tenant-owned table
  auto-filtered by `tenantId`), RBAC (`ADMIN` / `SALES_MANAGER` /
  `SALES_REP` / `VIEWER`)
- CRM: Accounts, Contacts, Deals
- Catalog: Products, Tax Rates
- Quotes: line items, server-authoritative totals (decimal-safe), sequential
  per-tenant quote numbering, quote templates
- Quote PDF generation + email on send
- Approval workflow (submit/approve/reject/send)
- Public e-signature flow (unauthenticated sign/decline via capability token)
- Conversion: Quote → Sales Order → Invoice
- User management, exchange rates (+ live FX sync), dashboard metrics

The new backend will live at `/backend-php` (Laravel) and is being built in
the same slice order the original Node backend was built in, so each stage
is independently testable. Data model source of truth for the port is
`backend/prisma/schema.prisma`.

## Status

| # | Slice | Status |
|---|---|---|
| 1 | Laravel scaffold, DB schema, tenant scoping, JWT auth | done |
| 2 | CRM (Accounts, Contacts, Deals) | done |
| 3 | Catalog (Products, Tax Rates) | done |
| 4 | Quotes (line items, totals, numbering) | done |
| 5 | Quote templates, PDF generation, email | done |
| 6 | Approval workflow, public e-signature flow | done |
| 7 | Conversion (Quote → Sales Order → Invoice) | not started |
| 8 | Users, exchange rates, dashboard | not started |
| 9 | Point Angular frontend at the PHP backend, update deploy docs | not started |

Once slice 9 is done and the PHP backend has full parity, `/backend` (Node)
and its Hostinger/Node.js-hosting instructions get removed, and
`DEPLOYMENT.md` is rewritten for a plain PHP + MySQL deploy on Hostinger
shared hosting (upload via Git/File Manager, no Node.js app hosting needed).

## Live deployment (as of this migration)

- Domain: `digifoxprosolutions.com`, subdomain `digi-invoice.digifoxprosolutions.com`
- Plan: Hostinger Business (shared hosting, PHP-capable, no Node.js app hosting)
- MySQL database already created in hPanel (`u311568037_digiInvoice`)
- Frontend (Angular build) has been deployed to the subdomain
- Backend is not yet live under this migration — the previously
  uploaded Node `backend/` source on the subdomain cannot run (no Node.js
  runtime on this plan) and will be replaced by the Laravel app once ready
