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

**Slice 1 — Foundation (current):** project scaffold, full Prisma schema for all
domain models, JWT auth + tenant-scoping middleware. No business endpoints yet.

See [`backend/README.md`](backend/README.md) for setup and the build roadmap.
