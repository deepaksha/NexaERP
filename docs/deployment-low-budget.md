# Low-Budget Deployment Guide

This guide deploys the ERP with a near-zero budget stack:

- Frontend: Vercel (Hobby)
- API: Render (Starter)
- Database: Neon or Supabase Postgres (free tier)
- Redis: Upstash (free tier, optional)

## Architecture

- Vercel serves `apps/web`
- Render serves `apps/api`
- Render API connects to managed Postgres using `DATABASE_URL`

## 1) Prepare accounts

Create accounts on:

- Vercel
- Render
- Neon or Supabase
- Upstash (optional)

## 2) Provision Postgres

Create one Postgres project in Neon or Supabase and copy:

- host
- port
- database name
- user
- password
- full connection string (`DATABASE_URL`)

If SSL mode is included in the URL, keep it as provided.

## 3) Load schema and seed

Load SQL files in this order:

1. `database/erp-seed.sql`
2. `database/erp-normalization.sql`

If local `psql` is not available, use the SQL editor in Neon or Supabase and run both files sequentially.

## 4) Deploy API on Render

Use the `render.yaml` blueprint at project root.

Manual values to set in Render service environment:

- `DATABASE_URL=<your-neon-or-supabase-url>`
- `DB_SSL=true`
- `JWT_SECRET=<strong-random-secret>`
- `JWT_EXPIRES_IN=7d`
- `PORT` is managed by Render

Build and start commands are already defined in `render.yaml`:

- build: `npm install && npm run build`
- start: `npm run start:prod`

After deploy, verify:

- `https://<render-api-domain>/api`

## 5) Deploy Web on Vercel

In Vercel project settings:

- Root Directory: `apps/web`
- Framework: Next.js

Set environment variable:

- `NEXT_PUBLIC_API_BASE_URL=https://<render-api-domain>/api`

Deploy and verify login page loads and API calls succeed.

## 6) Optional Redis on Upstash

If you later add Redis-backed features, set:

- `REDIS_HOST`
- `REDIS_PORT`
- credentials as required by provider

Current app can run without Redis in early pilot if no hard dependency is enforced.

## 7) Production-safe minimum settings

- Keep `NODE_ENV=production`
- Restrict CORS origin in API to your Vercel domain
- Rotate `JWT_SECRET` before public launch
- Enable DB backups in Neon/Supabase

## 8) Smoke test checklist

- Open web app and sign in
- Create supplier/customer/product
- Create purchase order and billing record
- Open API Swagger at `/api`
- Test EPR endpoints under `/api/epr/*`

## 9) Known free-tier limits

- Cold starts on low-cost API plans
- Limited database compute/storage
- Lower throughput and no strict SLA

Use this stack for pilot/UAT. Move to AWS Mumbai managed stack for full production scale and compliance controls.
