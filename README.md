# NexaERP

A small-business ERP monorepo for inventory, sales, purchase, billing, customer/supplier management, user roles, and reporting.

## Stack

- Frontend: Next.js + TypeScript + Tailwind
- Backend: NestJS + TypeScript
- Database: PostgreSQL
- Cache: Redis
- Deployment: Docker + Nginx + Ubuntu VPS

## Apps

- `apps/web` — frontend dashboard and business screens
- `apps/api` — REST API and business logic

## Quick install for Windows

Run this from the project root:

```powershell
npm run setup
```

This setup flow will:

- install Node.js LTS if it is missing
- install project dependencies with `npm install`
- enable required Windows features for Docker and WSL
- install WSL if it is missing
- install Docker Desktop if it is missing
- start Docker Desktop and the project containers with `docker compose up -d`
- print the local URLs for the app and the database services

If you are already on a machine with Docker and WSL configured, you can skip the OS setup pieces with:

```powershell
npm run setup:project -- -SkipWslInstall -SkipDockerInstall -SkipDockerStart
```

## Local development

1. Copy `.env.example` to `.env`
2. Start supporting services:
   `docker compose up -d`
3. Start backend:
   `npm run dev:api`
4. Start frontend:
   `npm run dev:web`

### Windows Docker prerequisite setup

If Docker Desktop shows virtualization errors on Windows, run the shared admin script in this repository:

1. Open PowerShell as Administrator
2. Run from project root: `npm run setup:windows-docker`
3. Reboot your machine
4. Start Docker Desktop and run `docker version`

Optional: if WSL is already managed separately, run `npm run setup:windows-docker:skip-wsl`

## Initial ERP modules

- Inventory management
- Sales
- Purchase
- Accounts / billing
- Customer and supplier management
- User roles and permissions
- Reports

## Production deployment

- Run the API on a VPS with Docker and Nginx
- Use PostgreSQL and Redis in the server environment
- Put the app behind Cloudflare or Nginx SSL termination
- Configure backups, monitoring, and environment secrets

## Team collaboration workflow

- Base branch for releases: `main`
- Shared integration branch: `develop`
- Work branches: `feature/*`, `fix/*`, `hotfix/*`
- Open pull requests with the provided template
- Track work with GitHub issues using the project templates

See `CONTRIBUTING.md` for the full branch and PR process.
