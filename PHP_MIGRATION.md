# Backend migration: Node.js/Express → PHP/Laravel

## Why

The original backend was Node.js + Express + TypeScript + Prisma, built to
run under Hostinger's Node.js app hosting feature. During deployment it
turned out the live Hostinger account (`digifoxprosolutions.com`, "Business"
plan) does not have Node.js app hosting available — it's a PHP/static
shared-hosting plan. Options considered: upgrade the Hostinger plan, buy a
Hostinger VPS, or host the Node API on a separate Node-friendly service
(e.g. Render) while keeping the frontend on Hostinger. Decision: **rewrite
the backend in PHP (Laravel)** so the whole app — frontend and backend —
runs natively on the existing Hostinger Business plan with no extra
infrastructure or cost.

## What this meant

A full rewrite of the API layer, not a syntax conversion. The retired Node
backend covered:

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

The new backend at `/backend-php` (Laravel) was built in the same slice
order the original Node backend was built in, each stage independently
tested against a real database before moving on. The data model source of
truth for the port was the Node backend's Prisma schema (no longer in the
repo — see git history prior to this migration if you need to cross-check
something).

## Status — done

| # | Slice | Status |
|---|---|---|
| 1 | Laravel scaffold, DB schema, tenant scoping, JWT auth | done |
| 2 | CRM (Accounts, Contacts, Deals) | done |
| 3 | Catalog (Products, Tax Rates) | done |
| 4 | Quotes (line items, totals, numbering) | done |
| 5 | Quote templates, PDF generation, email | done |
| 6 | Approval workflow, public e-signature flow | done |
| 7 | Conversion (Quote → Sales Order → Invoice) | done |
| 8 | Users, exchange rates, dashboard | done |
| 9 | Point Angular frontend at the PHP backend, update deploy docs | done |

The Node `/backend` has been removed from the repo (it's still recoverable
from git history on this branch prior to the removal commit, if ever
needed for reference). `DEPLOYMENT.md` now describes a plain PHP + MySQL
deploy on Hostinger shared hosting — no Node.js app hosting, no VPS needed.

## Contract parity

Every slice was built to match the Node API's contract exactly — same URL
paths under `/api/v1`, same `{ data, meta, errors }` envelope, same
camelCase field names, same HTTP status codes and error codes, same
pagination `meta` shape, decimal fields serialized as fixed-precision JSON
strings the same way Prisma's `Decimal` did. A dedicated read-only pass over
the Angular frontend (`/frontend`) confirmed no compatibility gaps — the
frontend needed **zero code changes** beyond pointing the dev environment's
`apiBaseUrl` at the new backend's local port (`php artisan serve` defaults
to 8000; the old Node dev server used 3000).

## Notable bugs found and fixed during the port

Each surfaced from actually running the endpoints against a database, not
just reading code — recorded here since they're the kind of thing that
would otherwise resurface silently:

- **Decimal serialization drift**: without an explicit `decimal:N` cast,
  Eloquent returns decimal columns as native PHP floats on SQLite but
  strings on MySQL — a real cross-driver inconsistency that would have made
  local/CI testing lie about production behavior. Fixed by adding explicit
  casts to every money/decimal field.
- **QueryException driver assumptions**: the duplicate-key/FK-violation
  error mapping initially checked only MySQL's numeric error codes, so it
  silently fell through to a raw leaked SQL exception (500) on SQLite.
  Fixed to check both MySQL codes and SQLite's message text.
- **Mail "isConfigured" false positive**: checked
  `config('mail.mailers.smtp.host')`, which always has a non-empty default
  regardless of the active mailer — so it reported "configured" even with
  the intentionally-unconfigured `MAIL_MAILER=log` default, silently
  logging instead of the expected `skipped:true` response. Fixed to check
  the active mailer driver instead.
- **Double Request injection**: a controller method injecting both a
  `FormRequest` subclass and a plain `Illuminate\Http\Request` parameter
  (for the client IP) failed at runtime — Laravel doesn't resolve two
  `Request`-compatible parameters independently. Fixed by using the
  `FormRequest` instance directly (it extends `Request`).
- **PHP's array/object JSON ambiguity**: an empty PHP associative array and
  an empty list serialize identically to `[]`, so a brand-new tenant's
  dashboard summary would send `invoices.byStatus: []` instead of the
  expected `{}`. Fixed by casting to `(object)` before returning.
