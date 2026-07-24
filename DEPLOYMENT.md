# Deploying digi-invoice to Hostinger

This is a step-by-step checklist for putting this app on Hostinger: a Node.js
API (`/backend`) backed by MySQL, and an Angular SPA (`/frontend`) served as
static files. Follow it in order the first time; skip to
[Redeploying](#redeploying-after-the-first-time) for later updates.

## 0. What you need

- A Hostinger plan with **Node.js app hosting** in hPanel (Business/Cloud
  shared hosting or VPS). Confirm under hPanel → **Websites → Manage → Advanced
  → Node.js**.
- A **MySQL 8** database (hPanel → **Databases → MySQL Databases**).
- A domain (or subdomain) pointed at the hosting account — e.g.
  `app.yourdomain.com` for the frontend and `api.yourdomain.com` for the
  backend, or one domain serving both (see [Domain layout](#domain-layout)).
- Node 20+ locally to build the frontend before upload (matches
  `backend/package.json`'s `engines.node`).

## 1. Create the MySQL database

hPanel → **Databases → MySQL Databases** → create a database + user, grant
the user all privileges on it. Note the **database name, username, password,
and host** (Hostinger DBs are usually reachable as `localhost` from the
Node.js app on the same account — hPanel shows the exact host string, it's
not always literally `localhost`).

Build the connection string:

```
mysql://DB_USER:DB_PASSWORD@DB_HOST:3306/DB_NAME
```

URL-encode any special characters in the password (`@`, `#`, `%`, `/`, `*`,
`>` etc.) — e.g. `sS*>n/#/0K` becomes `sS*%3En%2F%23%2F0K`.

## 2. Create the Node.js app (backend)

hPanel → **Advanced → Node.js** → **Create Application**:

- **Node version:** 20.x
- **Application root:** the folder the backend will live in, e.g.
  `digi-invoice/backend`
- **Application URL:** the domain/subdomain that will serve the API (e.g.
  `api.yourdomain.com`), or a path if you're doing same-domain routing (see
  [Domain layout](#domain-layout))
- **Application startup file:** `dist/server.js`

Don't start it yet — there's no code there.

## 3. Get the code onto the server

Two options; pick whichever matches how you want to manage updates:

**A. Git deploy (recommended)** — hPanel → **Git** (under Advanced), point it
at this GitHub repo and the branch you want to deploy, with the deploy path
set to the Node.js app's application root's parent (so it clones the whole
repo, since `backend/` and `frontend/` both come from it). Deploy pulls the
latest commit on demand.

**B. Manual upload / SFTP** — get SFTP credentials from hPanel → **Files →
FTP Accounts**, and upload the repo contents (or `git clone` over SSH if your
plan includes shell access: hPanel → **Advanced → SSH Access**).

## 4. Backend: install, configure, build, migrate

SSH into the server (hPanel → SSH Access gives you the command), or use
hPanel's Node.js app "Run NPM Install" / terminal button if SSH isn't
available on your plan.

```bash
cd digi-invoice/backend
npm install
npm run build          # tsc -> dist/
npm run prisma:generate
```

Set environment variables in hPanel → **Node.js → your app → Environment
variables** (do **not** commit a `.env` with real secrets):

| Variable | Value |
|---|---|
| `NODE_ENV` | `production` |
| `PORT` | whatever hPanel's Node.js app expects it to listen on (it usually injects/proxies this — check the app's detail page) |
| `DATABASE_URL` | the connection string from step 1 |
| `CORS_ORIGINS` | the frontend's origin, e.g. `https://app.yourdomain.com` (comma-separate if more than one) |
| `JWT_ACCESS_SECRET` | random string, 16+ chars — generate with `openssl rand -base64 48` |
| `JWT_REFRESH_SECRET` | same, a **different** random string |
| `JWT_ACCESS_EXPIRES_IN` | `15m` (default, optional) |
| `JWT_REFRESH_EXPIRES_IN` | `7d` (default, optional) |
| `SMTP_HOST` / `SMTP_PORT` / `SMTP_USER` / `SMTP_PASS` / `SMTP_SECURE` / `MAIL_FROM` | optional — only needed to actually email quotes on send; without them the app still generates the PDF and marks the quote SENT |

Apply the database schema:

```bash
npm run prisma:deploy   # prisma migrate deploy — applies committed migrations only
npm run seed             # optional: creates a demo tenant + admin user
```

Start (or restart) the app from hPanel's Node.js app page — that's how
Hostinger keeps it running/restarted, don't rely on `npm start` in a
foreground SSH session.

Verify: `https://api.yourdomain.com/api/v1/health` should return 200.

### Persistent storage

`backend/storage/{uploads,pdfs,signatures}` holds generated quote PDFs and
signature files. It's `.gitignore`d, so a git-based redeploy won't touch
existing files there — but make sure the app's Node process has write
permission to it, and back it up like you would the database (Hostinger
shared hosting doesn't guarantee network-attached storage across plan
changes).

## 5. Frontend: build and upload as static files

Build **locally** (or in CI) — don't build on the Hostinger box, it's
unnecessary load on shared hosting:

```bash
cd frontend
npm install
npm run build   # -> dist/frontend/browser (Angular 20 application builder)
```

Before building, make sure `frontend/src/environments/environment.prod.ts`
points `apiBaseUrl` at wherever the backend actually lives — see
[Domain layout](#domain-layout) below, this is the one line most likely to
be wrong on first deploy.

Upload the contents of `dist/frontend/browser/` to the **public_html** (or
subdomain's document root) via hPanel File Manager, SFTP, or a second Git
deploy pointed at a `frontend-dist` branch/folder if you'd rather not hand-copy
build output.

Angular is a SPA — deep links (e.g. refreshing on `/quotes/42`) need
unmatched routes rewritten to `index.html`. Add an `.htaccess` in the
document root (Hostinger shared hosting uses Apache):

```apache
<IfModule mod_rewrite.c>
  RewriteEngine On
  RewriteBase /
  RewriteRule ^index\.html$ - [L]
  RewriteCond %{REQUEST_FILENAME} !-f
  RewriteCond %{REQUEST_FILENAME} !-d
  RewriteRule . /index.html [L]
</IfModule>
```

## Domain layout

`environment.prod.ts` currently ships with `apiBaseUrl: '/api/v1'` — a
**relative** path, meaning it assumes the frontend and backend are served
from the **same origin**. Pick one:

- **Same domain (simpler CORS, needs a reverse proxy):** serve the Angular
  build from `public_html`, and proxy `/api/*` on that same domain through to
  the Node.js app (hPanel Node.js apps can usually be mapped to a URL path
  instead of a subdomain — check your plan's Node.js app settings). Leave
  `apiBaseUrl: '/api/v1'` as-is.
- **Separate subdomain (simpler routing, needs CORS):** point the Node.js app
  at `api.yourdomain.com` and the static frontend at `app.yourdomain.com` (or
  the bare domain). Change `apiBaseUrl` to
  `https://api.yourdomain.com/api/v1`, rebuild the frontend, and set
  `CORS_ORIGINS=https://app.yourdomain.com` on the backend.

The separate-subdomain path is the one the repo's `backend/README.md` and
`environment.prod.ts` comments were written for — it's the path of least
surprise.

## 6. SSL

hPanel → **SSL** → issue a free Let's Encrypt certificate for each
domain/subdomain in use. Force HTTPS redirects for both.

## 7. Smoke test

- `GET https://api.yourdomain.com/api/v1/health` → 200
- Load the frontend URL, log in with the seeded admin (if you ran
  `npm run seed`), confirm the dashboard loads (proves CORS + `apiBaseUrl`
  are wired correctly)
- Create a quote and send it, confirm a PDF is generated (and emailed, if
  SMTP is configured)

## Redeploying after the first time

**Backend:**
```bash
cd digi-invoice/backend
git pull            # or trigger hPanel's Git deploy
npm install
npm run build
npm run prisma:deploy   # only if new migrations were added
# restart the app from hPanel's Node.js app page
```

**Frontend:** rebuild locally (`npm run build`), re-upload
`dist/frontend/browser/` contents, overwriting the previous build.

## Security checklist before going live

- [ ] `JWT_ACCESS_SECRET` / `JWT_REFRESH_SECRET` are freshly generated, not
      the defaults from `.env.example`
- [ ] `backend/README.md` flags that a DB password was shared in chat during
      initial setup — **rotate it in hPanel** if that hasn't happened yet,
      and update `DATABASE_URL` afterward
- [ ] `.env` is not committed anywhere in the repo (check `git log -p -- '*.env'` if unsure)
- [ ] `CORS_ORIGINS` lists only the real frontend origin(s), not `*`
- [ ] SSL is active and HTTP is redirected to HTTPS on both domains
