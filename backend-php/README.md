# digi-invoice — Backend API (PHP/Laravel)

Laravel 11 + Eloquent, MySQL 8+. JSON REST API under `/api/v1`. This is a
from-scratch rewrite of the original Node.js/Express/Prisma backend (kept at
`/backend` for reference), built because the target Hostinger hosting plan
turned out not to include Node.js app hosting — see `/PHP_MIGRATION.md` at
the repo root for the full story and slice-by-slice status.

The API's URL paths, JSON response envelope, field names (camelCase), status
codes, and error codes were all built to match the original Node API
byte-for-byte, so the Angular frontend (`/frontend`) needs no changes.

## Setup

```bash
cd backend-php
composer install
cp .env.example .env
# edit .env: DB_* (a real MySQL DB), JWT_ACCESS_SECRET / JWT_REFRESH_SECRET
php artisan key:generate
php artisan migrate
php artisan db:seed        # optional: demo tenant + admin user
php artisan serve          # start on http://127.0.0.1:8000
```

Health check: `GET http://127.0.0.1:8000/api/v1/health`

## Deploying to Hostinger

See [`/DEPLOYMENT.md`](../DEPLOYMENT.md) at the repo root for the full
step-by-step hPanel walkthrough. In short: this runs on plain PHP + MySQL
shared hosting — no Node.js app hosting, no VPS, no separate service needed.

## Architecture

| Concern | Where |
| --- | --- |
| Env validation (JWT secrets) | `app/Providers/AppServiceProvider.php` (fails fast at boot) |
| Response envelope | `app/Support/ApiResponse.php` (`{ data, meta, errors }`) |
| App errors | `app/Exceptions/ApiException.php` |
| Central error rendering | `bootstrap/app.php`'s `withExceptions()` |
| JWT | `app/Services/JwtService.php` (firebase/php-jwt) |
| Passwords / refresh-token hashing | `app/Services/PasswordService.php` |
| JWT auth middleware | `app/Http/Middleware/JwtAuthenticate.php` (alias `jwt.auth`) |
| Tenant scoping | `app/Http/Middleware/TenantScope.php` (alias `tenant.scope`) + `app/Support/TenantContext.php` |
| RBAC | `app/Http/Middleware/RequireRole.php` (alias `role:X,Y`) |
| Quote money math | `app/Services/QuoteCalculator.php` (brick/math) |
| Sequential numbering | `app/Services/QuoteNumberService.php` |
| PDF generation | `app/Services/QuotePdfService.php` (dompdf + `resources/views/pdf/quote.blade.php`) |
| Email | `app/Services/QuoteEmailService.php` + `app/Mail/QuoteMail.php` |

### Tenant isolation — read this before adding endpoints

`App\Models\Concerns\BelongsToTenant` adds an Eloquent global scope that
**auto-filters every query and auto-stamps every create** with the current
tenant, once `TenantScope` middleware has set it (from the verified JWT).
Every tenant-owned model (`Account`, `Contact`, `Deal`, `Product`, `TaxRate`,
`Quote`, `QuoteTemplate`, `SalesOrder`, `Invoice`, `ExchangeRate`,
`QuoteNumberSequence`, `Permission`, `User`) uses this trait — you can write
plain `Account::find($id)` in a controller and it's already tenant-scoped, no
manual `where('tenant_id', ...)` needed.

Before a tenant is known (signup/login, which cross the tenant boundary on
purpose), this is a no-op — those flows filter `tenant_id` explicitly
themselves. Child records with no `tenant_id` of their own (`QuoteLineItem`,
`QuoteApproval`, `QuoteSignature`, `QuoteActivityLog`, `RefreshToken`) don't
use this trait — they're only ever reached through their tenant-scoped
parent.

### JSON serialization

Laravel's default JSON output for Eloquent models is snake_case
(`billing_address`). `App\Models\Concerns\SerializesCamelCase` converts at
the `toArray()` boundary so the API output is camelCase
(`billingAddress`), matching the original Prisma-based API — every
API-facing model uses it. DB columns stay idiomatic snake_case.

Money/decimal columns use Laravel's `decimal:N` cast (which itself uses
brick/math) so they always serialize as a fixed-precision **string**
(`"9.99"`, not the bare JSON number `9.99`) regardless of DB driver —
matching Prisma's `Decimal` → JSON-string behavior.

## Slices ported (see `/PHP_MIGRATION.md` for detail)

1. Foundation: tenant/auth (signup/login/refresh/logout), RBAC
2. CRM: Accounts, Contacts, Deals
3. Catalog: Products, Tax Rates
4. Quotes: line items, server-authoritative totals, sequential numbering
5. Quote templates, PDF generation, email
6. Approval workflow, public e-signature flow
7. Conversion: Quote → Sales Order → Invoice
8. Users, exchange rates, dashboard metrics
