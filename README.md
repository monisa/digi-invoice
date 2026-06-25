# digi-invoice

Multi-tenant quote / proposal management SaaS (Zoho Quotes–style).

- **Backend:** Node.js + Express + TypeScript, Prisma ORM, MySQL 8+ — JSON REST API under `/api/v1`
- **Frontend:** Angular SPA (added in a later slice)
- **Hosting:** Hostinger (native MySQL + Node.js hosting)

## Monorepo layout

```
/backend     Express + Prisma API  (this slice)
/frontend    Angular SPA           (later)
```

## Status

**Backend (verified against MySQL 8):** foundation + JWT auth/tenant scoping,
Auth endpoints, CRM (Accounts/Contacts/Deals), Catalog (Products/Tax Rates),
and Quotes (CRUD + server-authoritative totals + sequential numbering).

**Frontend (Angular 20 + Material):** app scaffold, core (JWT interceptor with
refresh, AuthService with signals, Auth/Role guards, env config, API models),
login + signup screens, and an authed app shell with a placeholder dashboard.

Run the frontend: `cd frontend && npm start` (expects the API on
`http://localhost:3000`). See [`backend/README.md`](backend/README.md) for the
API setup and build roadmap.
