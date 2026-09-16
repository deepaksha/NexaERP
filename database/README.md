# Database setup

This folder contains the development database schema and seed data used by the ERP project.

## Load the seed data

From the project root:

```powershell
docker compose up -d
psql -h localhost -U erpuser -d erpdb -f .\database\erp-seed.sql

# Optional: apply normalization foundation (non-breaking)
psql -h localhost -U erpuser -d erpdb -f .\database\erp-normalization.sql
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

The project uses TypeORM with `synchronize: false`, so schema changes must be applied through SQL scripts or migrations.
`erp-normalization.sql` adds normalized foundation tables and compatibility views without breaking existing API tables.

For EPR and India trademark-aware normalized modeling, see `docs/epr-india-normalized-erd.md` and section `6) EPR + India trademark compliance foundation (normalized)` in `erp-normalization.sql`.
