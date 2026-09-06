-- NexaERP development seed data
-- Creates the role and user tables used by the ERP app and inserts demo data.

CREATE TABLE IF NOT EXISTS application_roles (
  id SERIAL PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE,
  slug VARCHAR(100) NOT NULL UNIQUE,
  description TEXT,
  "userRoles" JSONB DEFAULT '[]',
  "permissions" JSONB DEFAULT '[]',
  "registrations" JSONB DEFAULT '[]'
);

CREATE TABLE IF NOT EXISTS application_users (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  "fullName" VARCHAR(255) NOT NULL,
  "companyName" VARCHAR(255),
  "passwordHash" VARCHAR(255) NOT NULL,
  "isActive" BOOLEAN NOT NULL DEFAULT TRUE,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS application_user_roles (
  "user_id" INTEGER NOT NULL,
  "role_id" INTEGER NOT NULL,
  PRIMARY KEY ("user_id", "role_id"),
  CONSTRAINT fk_application_user_roles_user FOREIGN KEY ("user_id") REFERENCES application_users (id) ON DELETE CASCADE,
  CONSTRAINT fk_application_user_roles_role FOREIGN KEY ("role_id") REFERENCES application_roles (id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS registrations (
  id SERIAL PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  "fullName" VARCHAR(255) NOT NULL,
  phone VARCHAR(50),
  "companyName" VARCHAR(255),
  "requested_role_id" INTEGER,
  status VARCHAR(20) NOT NULL DEFAULT 'pending',
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "reviewedAt" TIMESTAMP WITHOUT TIME ZONE,
  "reviewedBy" VARCHAR(255),
  notes TEXT,
  CONSTRAINT fk_registrations_requested_role FOREIGN KEY ("requested_role_id") REFERENCES application_roles (id) ON DELETE SET NULL
);

INSERT INTO application_roles (name, slug, description)
VALUES
  ('Super Admin', 'super-admin', 'Full system access across all ERP modules and setup screens.'),
  ('Admin', 'admin', 'Operational admin access across all business workflows.'),
  ('Inventory Manager', 'inventory-manager', 'Access to products, stock, purchase, and inventory controls.'),
  ('Sales Manager', 'sales-manager', 'Access to customer, sales, and invoice workflows.'),
  ('Accounts Manager', 'accounts-manager', 'Access to billing, payments, and financial reporting.'),
  ('Purchase Manager', 'purchase-manager', 'Access to purchase workflows, vendors, and inventory sourcing.'),
  ('Viewer', 'viewer', 'Read-only access to dashboard and reports.')
ON CONFLICT (name) DO NOTHING;

INSERT INTO application_users (email, "fullName", "companyName", "passwordHash", "isActive")
VALUES
  ('admin@nexaerp.com', 'Admin User', 'NexaERP', 'password123', TRUE),
  ('sales@nexaerp.com', 'Sales Manager', 'NexaERP', 'password123', TRUE),
  ('inventory@nexaerp.com', 'Inventory Manager', 'NexaERP', 'password123', TRUE)
ON CONFLICT (email) DO NOTHING;

INSERT INTO application_user_roles ("user_id", "role_id")
SELECT u.id, r.id
FROM application_users u
JOIN application_roles r ON r.slug = 'admin'
WHERE u.email = 'admin@nexaerp.com'
ON CONFLICT DO NOTHING;

INSERT INTO application_user_roles ("user_id", "role_id")
SELECT u.id, r.id
FROM application_users u
JOIN application_roles r ON r.slug = 'sales-manager'
WHERE u.email = 'sales@nexaerp.com'
ON CONFLICT DO NOTHING;

INSERT INTO application_user_roles ("user_id", "role_id")
SELECT u.id, r.id
FROM application_users u
JOIN application_roles r ON r.slug = 'inventory-manager'
WHERE u.email = 'inventory@nexaerp.com'
ON CONFLICT DO NOTHING;

INSERT INTO registrations (email, "fullName", phone, "companyName", "requested_role_id", status)
SELECT 'newuser@nexaerp.com', 'New User', '+91 90000 00000', 'NexaERP', r.id, 'pending'
FROM application_roles r
WHERE r.slug = 'viewer'
ON CONFLICT (email) DO NOTHING;

SELECT 'NexaERP seed data loaded successfully.' AS status;
