# Deploying digi-invoice to Hostinger

Step-by-step checklist for putting this app on Hostinger: a Laravel API
(`/backend-php`) backed by MySQL, and an Angular SPA (`/frontend`) served as
static files — **all on plain PHP shared hosting**, no Node.js app hosting,
no VPS. Follow it in order the first time; skip to
[Redeploying](#redeploying-after-the-first-time) for later updates.

> This app was originally built for Node.js hosting, then rewritten in PHP
> (see [`PHP_MIGRATION.md`](PHP_MIGRATION.md)) specifically because the
> target Hostinger plan turned out not to include Node.js app hosting. If
> you're reading this, that's already resolved — everything below just needs
> PHP + MySQL, which every Hostinger plan has.

## 0. What you need

- Any Hostinger plan with PHP hosting (PHP 8.2+) — check hPanel → **Advanced
  → PHP Configuration** to confirm the version, bump it there if it's older.
- A **MySQL 8** database (hPanel → **Databases → MySQL Databases**).
- A domain or subdomain pointed at the hosting account.
- Node 20+ **locally** to build the frontend before upload (not needed on
  the server — Angular is built to static files ahead of time).
- Composer available where you run `composer install` for the backend —
  either locally (then upload `vendor/`) or via hPanel's SSH access if your
  plan includes it (hPanel → **Advanced → SSH Access**).

## 1. Create the MySQL database

hPanel → **Databases → MySQL Databases** → create a database + user, grant
the user all privileges on it. Note the **database name, username,
password, and host** (Hostinger DBs are sometimes reachable as `localhost`
from the app on the same account, sometimes a separate hostname like
`srv####.hostinger.com` — hPanel shows the exact value, don't assume).

## 2. Get the code onto the server

Two options; pick whichever matches how you want to manage updates:

**A. Git deploy (recommended)** — hPanel → **Git** (under Advanced), point
it at this GitHub repo and the branch you want to deploy. Deploy pulls the
latest commit on demand. Set the deploy path to a folder *outside*
`public_html` if possible (see [Document root layout](#document-root-layout)
below for why) — e.g. `digi-invoice/` alongside `public_html/`.

**B. Manual upload / SFTP** — get SFTP credentials from hPanel → **Files →
FTP Accounts**, or `git clone` over SSH if your plan includes shell access.

## 3. Document root layout

Laravel's front controller lives at `backend-php/public/index.php` — only
that `public/` folder should be web-accessible; `app/`, `.env`,
`storage/`, etc. must **not** be reachable directly (leaking `.env` leaks
your DB password and JWT secrets). The Angular build is a folder of static
files. Putting both under one domain needs a bit of care:

1. Clone/upload the whole repo somewhere **outside** the web root, e.g.
   `~/digi-invoice/` (a sibling of `public_html/`, not inside it).
2. Point your domain's document root at `~/digi-invoice/public_html/` (a
   *new*, empty folder you create — not the repo's `public_html` if one
   exists elsewhere; Hostinger's default doc root is usually already named
   `public_html`).
3. Copy `backend-php/public/*` into that document root, and edit the two
   lines in its `index.php` that reference `__DIR__.'/../vendor/autoload.php'`
   and `__DIR__.'/../bootstrap/app.php'` to point up to wherever you cloned
   the repo (e.g. `__DIR__.'/../digi-invoice/backend-php/vendor/autoload.php'`).
   This is the standard "Laravel on shared hosting" pattern — the app code
   stays outside the web root, only the compiled `public/` assets are
   inside it.
4. Copy the Angular build's contents (`frontend/dist/frontend/browser/*`,
   built in step 5 below) into the **same** document root, alongside
   Laravel's `index.php` and its `.htaccess`.
5. Replace the document root's `.htaccess` with the merged version in
   [SPA + API routing](#spa--api-routing) below, so `/api/*` reaches Laravel
   and everything else falls back to Angular's `index.html`.

If your plan doesn't let you point a document root outside `public_html`,
put the whole repo inside `public_html/` instead but add a `.htaccess`
`Deny from all` rule (or equivalent) on every folder except
`backend-php/public` and the Angular build — ask Hostinger support for the
exact syntax on their Apache version if unsure. Getting this wrong exposes
your `.env` file publicly, so don't skip it.

## 4. Backend: install, configure, migrate

SSH into the server, or run these locally and upload `vendor/` if your plan
has no shell access:

```bash
cd digi-invoice/backend-php
composer install --no-dev --optimize-autoloader
cp .env.example .env
php artisan key:generate
```

Set the real values in `.env` (never commit it):

| Variable | Value |
|---|---|
| `APP_ENV` | `production` |
| `APP_DEBUG` | `false` |
| `APP_URL` | `https://yourdomain.com` |
| `DB_CONNECTION` | `mysql` |
| `DB_HOST` / `DB_PORT` / `DB_DATABASE` / `DB_USERNAME` / `DB_PASSWORD` | from step 1 |
| `CORS_ALLOWED_ORIGINS` | your frontend's origin — same-domain deploys can leave this as-is since same-origin requests don't need CORS at all |
| `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` | random strings, 16+ chars — generate with `openssl rand -base64 48`, **different** values for each |
| `MAIL_MAILER` | `smtp` to actually email quotes on send; leave `log` and it's skipped (the PDF still generates, quote still marks SENT) |
| `MAIL_HOST` / `MAIL_PORT` / `MAIL_USERNAME` / `MAIL_PASSWORD` / `MAIL_ENCRYPTION` / `MAIL_FROM_ADDRESS` | only if `MAIL_MAILER=smtp` |

Apply the schema and (optionally) seed a demo tenant:

```bash
php artisan migrate --force
php artisan db:seed --force   # optional: demo tenant + admin user
```

Make `storage/` and `bootstrap/cache/` writable by the web server user
(hPanel's file manager or `chmod -R 775` over SSH — exact user/group depends
on Hostinger's setup, check with support if `chmod 775` isn't enough).

Verify: `https://yourdomain.com/api/v1/health` should return
`{"data":{"status":"ok",...}}`.

### Persistent storage

`backend-php/storage/app/private/{pdfs,signatures}` holds generated quote
PDFs and captured signature images. It's outside the web root (see step 3)
and gitignored, so a redeploy won't touch existing files — but back it up
like you would the database (shared hosting doesn't guarantee persistent
storage across plan changes).

## 5. Frontend: build and upload as static files

Build **locally** (or in CI) — don't build on the Hostinger box:

```bash
cd frontend
npm install
npm run build   # -> dist/frontend/browser
```

`environment.prod.ts` already ships with `apiBaseUrl: '/api/v1'` — a
relative path assuming same-origin, which is what step 3's layout gives
you. No edit needed for a same-domain deploy.

Copy `dist/frontend/browser/*` into the document root from step 3,
alongside (not overwriting) Laravel's `public/index.php` and its assets.

## SPA + API routing

Replace the document root's `.htaccess` with this — static files (both
Angular's JS/CSS and Laravel's own public assets) are served directly,
`/api/*` reaches Laravel's front controller, and everything else falls back
to Angular's `index.html` for client-side routing:

```apache
# Without this, a request for "/" hits Apache's default DirectoryIndex
# priority (index.php before index.html) and serves Laravel instead of
# the Angular shell, bypassing the rewrite rules below entirely.
DirectoryIndex index.html index.php

<IfModule mod_rewrite.c>
  RewriteEngine On

  # Real files/directories (Angular assets, Laravel's own public files) — serve as-is.
  RewriteCond %{REQUEST_FILENAME} -f [OR]
  RewriteCond %{REQUEST_FILENAME} -d
  RewriteRule ^ - [L]

  # API requests go to Laravel's front controller.
  RewriteRule ^api/ index.php [L]

  # Everything else is an Angular client-side route.
  RewriteRule ^ index.html [L]
</IfModule>
```

## 6. SSL

hPanel → **SSL** → issue a free Let's Encrypt certificate for the domain.
Force HTTPS redirects.

## 7. Smoke test

- `GET https://yourdomain.com/api/v1/health` → 200
- Load the site, log in with the seeded admin (if you ran `db:seed`),
  confirm the dashboard loads
- Create a quote, submit/approve/send it, confirm a PDF is generated (and
  emailed, if SMTP is configured), and that the public signing link works
  in an incognito window (no login)

## Redeploying after the first time

**Backend:**
```bash
cd digi-invoice/backend-php
git pull            # or trigger hPanel's Git deploy
composer install --no-dev --optimize-autoloader
php artisan migrate --force   # only if new migrations were added
php artisan config:cache      # optional, speeds up boot
```
No process to restart — PHP-FPM/Apache picks up changes on the next request.

**Frontend:** rebuild locally (`npm run build`), re-upload
`dist/frontend/browser/` contents over the previous build in the document
root.

## Security checklist before going live

- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are freshly generated, not
      the defaults from `.env.example`
- [ ] `APP_DEBUG=false` in production (a stack trace in a 500 response leaks
      internals)
- [ ] `.env`, `app/`, `bootstrap/`, `storage/`, `vendor/` are **not**
      reachable over HTTP — only `backend-php/public/*`'s contents should be
      (test by requesting `https://yourdomain.com/.env` — it must 403/404)
- [ ] `.env` is not committed anywhere in the repo (check `git log -p -- '*.env'` if unsure)
- [ ] `CORS_ALLOWED_ORIGINS` lists only real origins, not `*` — moot for a
      same-domain deploy, but check if you split frontend/backend onto
      different (sub)domains instead
- [ ] SSL is active and HTTP redirects to HTTPS
