# ERP System

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

## Local development

1. Copy `.env.example` to `.env`
2. Start supporting services:
   `docker compose up -d`
3. Start backend:
   `npm run dev:api`
4. Start frontend:
   `npm run dev:web`

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
