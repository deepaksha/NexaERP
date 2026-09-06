# Database setup

This folder contains the development database schema and seed data used by the ERP project.

## Load the seed data

From the project root:

```powershell
docker compose up -d
psql -h localhost -U erpuser -d erpdb -f .\database\erp-seed.sql
```

If `psql` is not installed, use any PostgreSQL client such as pgAdmin or DBeaver.

## Default connection values

- Host: `localhost`
- Port: `5432`
- Database: `erpdb`
- Username: `erpuser`
- Password: `erpsecret`

## Included sample data

- default ERP roles in `application_roles`
- application users in `application_users`
- role assignments in `application_user_roles`
- sample registration in `registrations`

## Notes

The project uses TypeORM with `synchronize: true`, so a fresh database can also be created automatically. This SQL file is primarily for developer testing and sample data consistency.
