# NexaERP

A small-business ERP monorepo for inventory, sales, purchase, billing, customer/supplier management, user roles, and reporting.

## Tech stack we are using

- Frontend: Next.js 16 + TypeScript + Tailwind CSS
- Backend: NestJS + TypeScript
- Database: PostgreSQL 16
- Cache: Redis 7
- Container setup: Docker Compose
- Package manager: npm
- Monorepo structure: apps/web + apps/api

## Required commands to run this project

From the project root:

```powershell
npm install
npm run docker:up
npm run dev:api
npm run dev:web
```

Or run everything together from the root:

```powershell
npm run start
```

This starts PostgreSQL + Redis and launches the API and web app together.

## Apps

- `apps/web` — frontend dashboard and business screens
- `apps/api` — REST API and business logic

## Quick install for Windows

Run this from the project root to install everything and bring up the required services:

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

## Start the app after setup

Once the setup has completed successfully, start the ERP app from the project root:

```powershell
npm run start
```

This command will:

- start PostgreSQL and Redis if Docker is available
- print the app URLs
- launch the API and web app together

A shorter alias is also available:

```powershell
npm run app
```

## PostgreSQL setup

This project includes PostgreSQL in [docker-compose.yml](docker-compose.yml) and local database values in [.env.example](.env.example). For developer testing, a ready-to-load schema and sample role data is also included in [database/erp-seed.sql](database/erp-seed.sql).

### 1) Start PostgreSQL with Docker

```powershell
docker compose up -d
```

This starts:

- PostgreSQL on `localhost:5432`
- Redis on `localhost:6379`

### 2) Confirm the database is running

```powershell
docker compose ps
```

You should see the `postgres` service in the running state.

### 3) Local database credentials

The default local values are:

```env
DB_HOST=localhost
DB_PORT=5432
DB_USERNAME=erpuser
DB_PASSWORD=erpsecret
DB_NAME=erpdb
```

These values match the setup in the compose file and are also included in [.env.example](.env.example).

### 4) Load demo schema and test data

Run the SQL file from the project root:

```powershell
docker compose up -d
psql -h localhost -U erpuser -d erpdb -f .\database\erp-seed.sql
```

This creates the default ERP roles and sample users used for testing, including:

- `admin@nexaerp.com` with the `Admin` role
- `sales@nexaerp.com` with the `Sales Manager` role
- `inventory@nexaerp.com` with the `Inventory Manager` role
- `newuser@nexaerp.com` pending registration example

### 5) Connect to PostgreSQL

You can connect with any Postgres client using:

- Host: `localhost`
- Port: `5432`
- Database: `erpdb`
- Username: `erpuser`
- Password: `erpsecret`

## Login and profile flow

The application starts on a public login page. The default demo login flow is intentionally simple for local development:

1. Open the app at `http://localhost:3000`
2. Sign in from the landing page using the demo admin account
3. After successful login, the header changes from `Login` to `Logout` and the user can access the profile page
4. The authenticated navigation includes `Dashboard`, `Products`, and `Profile`

The demo session is stored in browser local storage to keep the prototype lightweight while still showing the login-first ERP experience.

## Local development

If you only want to run the app manually after dependencies are already installed:

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

## ERP role recommendations

All ERP role definitions should be stored in the master database table named `application_roles`. This table is the source of truth for role names, slugs, and descriptions, and other mappings such as user-role assignments and role-permission links reference it.

A good ERP role model starts with a small set of business-focused roles and grants access by module, not by user. The following roles are usually enough for a small or mid-sized ERP:

- `Super Admin`: full access to setup, users, roles, tenants, and all modules.
- `Admin / Operations Manager`: full access to daily operations, all ERP modules, and user management for staff.
- `Inventory Manager`: access to inventory, stock movement, suppliers, purchases, and stock reports only.
- `Sales Manager`: access to sales, customers, orders, invoices, and sales reporting only.
- `Accounts / Finance`: access to billing, invoices, payments, taxation, and financial reports only.
- `Purchase Manager`: access to purchasing, suppliers, purchase orders, and vendor tracking only.
- `HR / User Manager`: access to user accounts, role assignments, and employee records only.
- `Viewer / Auditor`: read-only access for reports, dashboards, and audit history only.

Recommended default setup for a small ERP:

- `Super Admin`
- `Admin`
- `Inventory Manager`
- `Sales Manager`
- `Accounts Manager`
- `Purchase Manager`
- `Viewer`

This keeps authorization simple and ensures each user can access only the pages and database actions relevant to their work.

## Role-based access design

Use the following pattern in the app and API:

- Roles define user permission groups.
- Permissions define action-level access such as `view_products`, `create_products`, `edit_products`, `delete_products`, `view_reports`, `approve_invoice`.
- User-role mapping defines which roles a user belongs to.
- Registration table stores new user requests and the role they want.
- DML restrictions should be enforced by role/permission checks on both frontend routes and backend API endpoints.

Recommended page access mapping:

- `Super Admin`: all pages and all CRUD operations
- `Admin`: all operational pages, limited user management
- `Inventory Manager`: inventory, products, purchase, stock pages
- `Sales Manager`: sales, customers, orders, invoices
- `Accounts Manager`: billing, payments, reports, taxes
- `Purchase Manager`: suppliers, purchase orders, inventory adjustments
- `Viewer`: dashboard and read-only reports only

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
