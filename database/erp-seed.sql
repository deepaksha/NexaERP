-- NexaERP development seed data
-- Creates the role and user tables used by the ERP app and inserts demo data.

CREATE TABLE IF NOT EXISTS companies (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  code VARCHAR(100),
  "shortName" VARCHAR(100),
  "gstNumber" VARCHAR(100),
  phone VARCHAR(100),
  email VARCHAR(255),
  address TEXT,
  city VARCHAR(150),
  state VARCHAR(150),
  country VARCHAR(150) DEFAULT 'India',
  "parent_company_id" INTEGER REFERENCES companies(id),
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO companies (name, code, "shortName", "gstNumber", phone, email, city, state, country, status)
VALUES
  ('Nexa Group', 'NG', 'NG', '27NGROUP1234F1Z5', '+91 90000 11111', 'group@nexaerp.com', 'Pune', 'Maharashtra', 'India', 'Active'),
  ('Nexa Feed Industries', 'NFI', 'NFI', '27ABCDE1234F1Z5', '+91 98765 43210', 'hello@nexa-feed.com', 'Pune', 'Maharashtra', 'India', 'Active'),
  ('Gopal Cattle Feeds', 'GCF', 'GCF', '27FGHIJ5678K1L2', '+91 91234 56789', 'sales@gopalfeeds.com', 'Nagpur', 'Maharashtra', 'India', 'Active')
ON CONFLICT (name) DO NOTHING;

UPDATE companies
SET "parent_company_id" = (SELECT id FROM companies WHERE name = 'Nexa Group')
WHERE name IN ('Nexa Feed Industries', 'Gopal Cattle Feeds');

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

ALTER TABLE application_users
  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

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

CREATE TABLE IF NOT EXISTS products (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  sku VARCHAR(255) NOT NULL UNIQUE,
  category VARCHAR(255) NOT NULL,
  company_id INTEGER REFERENCES companies(id),
  stock INTEGER NOT NULL DEFAULT 0,
  lowstockthreshold INTEGER NOT NULL DEFAULT 15,
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE products
  ADD COLUMN IF NOT EXISTS company_id INTEGER REFERENCES companies(id);

ALTER TABLE products
  DROP COLUMN IF EXISTS price;

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

INSERT INTO products (name, sku, category, stock, lowstockthreshold, status)
VALUES
  ('Nexa Laptop Pro 14', 'NX-LAP-001', 'Electronics', 18, 15, 'Active'),
  ('Nexa Office Chair', 'NX-FUR-010', 'Furniture', 32, 15, 'Active'),
  ('Nexa Monitor 27', 'NX-IT-022', 'Electronics', 12, 15, 'Active'),
  ('Nexa Desk Organizer', 'NX-ACC-045', 'Accessories', 75, 15, 'Active'),
  ('Nexa ERP License', 'NX-SW-200', 'Software', 50, 15, 'Active')
ON CONFLICT (sku) DO NOTHING;

CREATE TABLE IF NOT EXISTS suppliers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  "contactPerson" VARCHAR(255),
  phone VARCHAR(100),
  email VARCHAR(255),
  "gstNumber" VARCHAR(100),
  address TEXT,
  city VARCHAR(150),
  state VARCHAR(150),
  country VARCHAR(150) DEFAULT 'India',
  company_id INTEGER REFERENCES companies(id),
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  phone VARCHAR(100),
  email VARCHAR(255),
  "gstNumber" VARCHAR(100),
  address TEXT,
  city VARCHAR(150),
  state VARCHAR(150),
  country VARCHAR(150) DEFAULT 'India',
  company_id INTEGER REFERENCES companies(id),
  status VARCHAR(50) NOT NULL DEFAULT 'Active',
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchases (
  id SERIAL PRIMARY KEY,
  "invoiceNumber" VARCHAR(255) NOT NULL,
  "purchaseDate" DATE NOT NULL,
  "productName" VARCHAR(255),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  "unitPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  supplier_id INTEGER REFERENCES suppliers(id),
  company_id INTEGER REFERENCES companies(id),
  "paymentStatus" VARCHAR(50) NOT NULL DEFAULT 'Paid',
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sales (
  id SERIAL PRIMARY KEY,
  "invoiceNumber" VARCHAR(255) NOT NULL,
  "saleDate" DATE NOT NULL,
  product_id INTEGER REFERENCES products(id),
  "productName" VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  "unitPrice" DECIMAL(10,2) NOT NULL DEFAULT 0,
  "totalAmount" DECIMAL(10,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  customer_id INTEGER REFERENCES customers(id),
  company_id INTEGER REFERENCES companies(id),
  "paymentStatus" VARCHAR(50) NOT NULL DEFAULT 'Paid',
  payment_type VARCHAR(50) NOT NULL DEFAULT 'Cash',
  sale_date_time TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "createdAt" TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS sale_items (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  product_id INTEGER NOT NULL REFERENCES products(id),
  product_name VARCHAR(255) NOT NULL,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  line_total DECIMAL(12,2) NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS product_id INTEGER REFERENCES products(id);

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS payment_type VARCHAR(50) NOT NULL DEFAULT 'Cash';

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS sale_date_time TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

UPDATE sales
SET paid_amount = CASE
  WHEN "paymentStatus" = 'Paid' THEN "totalAmount"
  ELSE 0
END,
balance_amount = CASE
  WHEN "paymentStatus" = 'Paid' THEN 0
  ELSE "totalAmount"
END
WHERE paid_amount = 0 AND balance_amount = 0;

CREATE TABLE IF NOT EXISTS sale_payments (
  id SERIAL PRIMARY KEY,
  sale_id INTEGER NOT NULL REFERENCES sales(id) ON DELETE CASCADE,
  receipt_number VARCHAR(255) NOT NULL,
  payment_type VARCHAR(50) NOT NULL DEFAULT 'Cash',
  payment_reference VARCHAR(255),
  amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  payment_date_time TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE sale_items
  ADD COLUMN IF NOT EXISTS product_name VARCHAR(255) NOT NULL DEFAULT 'Item';

CREATE TABLE IF NOT EXISTS billings (
  id SERIAL PRIMARY KEY,
  invoice_number VARCHAR(255) NOT NULL UNIQUE,
  invoice_date DATE NOT NULL,
  due_date DATE,
  bill_type VARCHAR(20) NOT NULL DEFAULT 'SALE',
  company_id INTEGER REFERENCES companies(id),
  customer_id INTEGER REFERENCES customers(id),
  supplier_id INTEGER REFERENCES suppliers(id),
  broker_id INTEGER,
  brokerage_type VARCHAR(20),
  brokerage_value DECIMAL(10,2) NOT NULL DEFAULT 0,
  brokerage_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  purchase_order_id INTEGER,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  gst_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  transport_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
  other_charges DECIMAL(12,2) NOT NULL DEFAULT 0,
  paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  original_bill_attachment_url TEXT,
  original_bill_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  journal_narration TEXT,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  payment_status VARCHAR(50) NOT NULL DEFAULT 'Pending',
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS purchase_orders (
  id SERIAL PRIMARY KEY,
  po_number VARCHAR(255) NOT NULL UNIQUE,
  po_date DATE NOT NULL,
  expected_delivery_date DATE,
  request_number VARCHAR(60),
  company_id INTEGER NOT NULL REFERENCES companies(id),
  supplier_id INTEGER NOT NULL REFERENCES suppliers(id),
  item_description TEXT NOT NULL,
  items JSONB NOT NULL DEFAULT '[]'::jsonb,
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  unit_price DECIMAL(10,2) NOT NULL DEFAULT 0,
  transport_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
  other_charges DECIMAL(10,2) NOT NULL DEFAULT 0,
  subtotal_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  total_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  status VARCHAR(50) NOT NULL DEFAULT 'Draft',
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS approval_required_role VARCHAR(60) NOT NULL DEFAULT 'purchase-manager';

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS approved_by_role VARCHAR(80);

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS approved_at TIMESTAMP WITHOUT TIME ZONE;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS approval_notes TEXT;

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS bill_type VARCHAR(20) NOT NULL DEFAULT 'SALE';

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS supplier_id INTEGER REFERENCES suppliers(id);

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS purchase_order_id INTEGER;

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS transport_charges DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS other_charges DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS paid_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS balance_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS broker_id INTEGER;

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS brokerage_type VARCHAR(20);

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS brokerage_value DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS brokerage_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS original_bill_attachment_url TEXT;

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS original_bill_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

ALTER TABLE billings
  ADD COLUMN IF NOT EXISTS journal_narration TEXT;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS request_number VARCHAR(60);

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS items JSONB NOT NULL DEFAULT '[]'::jsonb;

ALTER TABLE purchase_orders
  ADD COLUMN IF NOT EXISTS other_charges DECIMAL(10,2) NOT NULL DEFAULT 0;

CREATE TABLE IF NOT EXISTS brokers (
  id SERIAL PRIMARY KEY,
  name VARCHAR(255) NOT NULL UNIQUE,
  contact_person VARCHAR(255),
  phone VARCHAR(30),
  email VARCHAR(255),
  company_id INTEGER REFERENCES companies(id),
  notes TEXT,
  status VARCHAR(20) NOT NULL DEFAULT 'Active',
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS journal_entries (
  id SERIAL PRIMARY KEY,
  billing_id INTEGER NOT NULL REFERENCES billings(id) ON DELETE CASCADE,
  purchase_order_id INTEGER REFERENCES purchase_orders(id),
  company_id INTEGER REFERENCES companies(id),
  entry_date DATE NOT NULL,
  debit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  credit_amount DECIMAL(12,2) NOT NULL DEFAULT 0,
  narration TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS product_rates (
  id SERIAL PRIMARY KEY,
  product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
  rate_date DATE NOT NULL,
  rate DECIMAL(12,2) NOT NULL,
  source VARCHAR(80) NOT NULL DEFAULT 'Government',
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE UNIQUE INDEX IF NOT EXISTS uq_product_rate_day
  ON product_rates(product_id, rate_date);

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS broker_id INTEGER;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS brokerage_type VARCHAR(20);

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS brokerage_value DECIMAL(10,2) NOT NULL DEFAULT 0;

ALTER TABLE sales
  ADD COLUMN IF NOT EXISTS brokerage_amount DECIMAL(12,2) NOT NULL DEFAULT 0;

INSERT INTO brokers (name, contact_person, phone, email, status)
SELECT 'Ramesh Trade Brokers', 'Ramesh Shah', '+91 98989 12121', 'ramesh.broker@example.com', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM brokers WHERE name = 'Ramesh Trade Brokers');

INSERT INTO brokers (name, contact_person, phone, email, status)
SELECT 'Agri Link Brokers', 'Pooja Verma', '+91 97979 23232', 'pooja.broker@example.com', 'Active'
WHERE NOT EXISTS (SELECT 1 FROM brokers WHERE name = 'Agri Link Brokers');

CREATE TABLE IF NOT EXISTS inventory_movements (
  id SERIAL PRIMARY KEY,
  product_id INTEGER REFERENCES products(id),
  company_id INTEGER REFERENCES companies(id),
  quantity DECIMAL(10,2) NOT NULL DEFAULT 0,
  movement_type VARCHAR(50) NOT NULL DEFAULT 'IN',
  reference_type VARCHAR(255),
  reference_id VARCHAR(255),
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO suppliers (name, "contactPerson", phone, email, "gstNumber", city, state, company_id)
SELECT
  'A1 Animal Nutrition',
  'Suresh Patil',
  '+91 98888 11111',
  'suresh@a1animal.com',
  '27AAAAA1111A1Z6',
  'Pune',
  'Maharashtra',
  c.id
FROM companies c
WHERE c.name = 'Nexa Feed Industries'
  AND NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.email = 'suresh@a1animal.com');

INSERT INTO suppliers (name, "contactPerson", phone, email, "gstNumber", city, state, company_id)
SELECT
  'Rural Grain Supply',
  'Anita Kulkarni',
  '+91 97777 22222',
  'anita@ruralgrain.com',
  '27BBBBB2222B2Z7',
  'Nagpur',
  'Maharashtra',
  c.id
FROM companies c
WHERE c.name = 'Gopal Cattle Feeds'
  AND NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.email = 'anita@ruralgrain.com');

INSERT INTO customers (name, phone, email, "gstNumber", city, state, company_id)
SELECT
  'Ace Retail',
  '+91 90001 10001',
  'ace@retail.com',
  '27CCCCC3333C3Z8',
  'Pune',
  'Maharashtra',
  c.id
FROM companies c
WHERE c.name = 'Nexa Feed Industries'
  AND NOT EXISTS (SELECT 1 FROM customers cu WHERE cu.email = 'ace@retail.com');

INSERT INTO customers (name, phone, email, "gstNumber", city, state, company_id)
SELECT
  'Green Valley Dairy',
  '+91 90001 20002',
  'dairy@greenvalley.com',
  '27DDDDD4444D4Z9',
  'Nagpur',
  'Maharashtra',
  c.id
FROM companies c
WHERE c.name = 'Gopal Cattle Feeds'
  AND NOT EXISTS (SELECT 1 FROM customers cu WHERE cu.email = 'dairy@greenvalley.com');

INSERT INTO customers (name, phone, email, "gstNumber", city, state, company_id)
SELECT
  'Sunrise Agro Stores',
  '+91 90001 30003',
  'procurement@sunriseagro.in',
  '27EEEEE5555E5Z1',
  'Nashik',
  'Maharashtra',
  c.id
FROM companies c
WHERE c.name = 'Nexa Feed Industries'
  AND NOT EXISTS (SELECT 1 FROM customers cu WHERE cu.email = 'procurement@sunriseagro.in');

INSERT INTO purchases ("invoiceNumber", "purchaseDate", "productName", quantity, "unitPrice", "totalAmount", supplier_id, company_id, "paymentStatus")
SELECT
  'PO-1001',
  '2026-09-01',
  'Corn Meal Bulk',
  120,
  34.50,
  4140.00,
  s.id,
  c.id,
  'Paid'
FROM suppliers s
JOIN companies c ON c.id = s.company_id
WHERE s.email = 'suresh@a1animal.com'
  AND NOT EXISTS (SELECT 1 FROM purchases p WHERE p."invoiceNumber" = 'PO-1001');

INSERT INTO purchases ("invoiceNumber", "purchaseDate", "productName", quantity, "unitPrice", "totalAmount", supplier_id, company_id, "paymentStatus")
SELECT
  'PO-1002',
  '2026-09-03',
  'Soy Concentrate',
  80,
  58.00,
  4640.00,
  s.id,
  c.id,
  'Pending'
FROM suppliers s
JOIN companies c ON c.id = s.company_id
WHERE s.email = 'anita@ruralgrain.com'
  AND NOT EXISTS (SELECT 1 FROM purchases p WHERE p."invoiceNumber" = 'PO-1002');

INSERT INTO purchase_orders (po_number, po_date, expected_delivery_date, company_id, supplier_id, item_description, quantity, unit_price, transport_charges, other_charges, subtotal_amount, total_amount, status, notes)
SELECT
  'PO-REQ-2001',
  '2026-09-04',
  '2026-09-08',
  c.id,
  s.id,
  'Bulk feed raw material lot A',
  100,
  950.00,
  3500.00,
  1250.00,
  95000.00,
  99750.00,
  'Approved',
  'PO raised for weekly production cycle'
FROM suppliers s
JOIN companies c ON c.id = s.company_id
WHERE s.email = 'suresh@a1animal.com'
  AND NOT EXISTS (SELECT 1 FROM purchase_orders p WHERE p.po_number = 'PO-REQ-2001');

INSERT INTO sales ("invoiceNumber", "saleDate", product_id, "productName", quantity, "unitPrice", "totalAmount", customer_id, company_id, "paymentStatus", payment_type, sale_date_time)
SELECT
  'SO-2001',
  '2026-09-05',
  p.id,
  'Nexa Dairy Mix 50kg',
  40,
  2100.00,
  84000.00,
  cu.id,
  c.id,
  'Pending',
  'Credit',
  '2026-09-05 11:15:00'
FROM customers cu
JOIN companies c ON c.id = cu.company_id
LEFT JOIN products p ON p.sku = 'NX-LAP-001'
WHERE cu.email = 'ace@retail.com'
  AND NOT EXISTS (SELECT 1 FROM sales s WHERE s."invoiceNumber" = 'SO-2001');

INSERT INTO sales ("invoiceNumber", "saleDate", product_id, "productName", quantity, "unitPrice", "totalAmount", customer_id, company_id, "paymentStatus", payment_type, sale_date_time)
SELECT
  'SO-2002',
  '2026-09-06',
  p.id,
  'Nexa Cattle Growth 25kg',
  55,
  1450.00,
  79750.00,
  cu.id,
  c.id,
  'Paid',
  'UPI',
  '2026-09-06 15:45:00'
FROM customers cu
JOIN companies c ON c.id = cu.company_id
LEFT JOIN products p ON p.sku = 'NX-IT-022'
WHERE cu.email = 'dairy@greenvalley.com'
  AND NOT EXISTS (SELECT 1 FROM sales s WHERE s."invoiceNumber" = 'SO-2002');

INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, line_total)
SELECT
  s.id,
  p.id,
  p.name,
  20,
  2100.00,
  42000.00
FROM sales s
JOIN products p ON p.sku = 'NX-LAP-001'
WHERE s."invoiceNumber" = 'SO-2001'
  AND NOT EXISTS (
    SELECT 1
    FROM sale_items si
    WHERE si.sale_id = s.id AND si.product_id = p.id
  );

INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, line_total)
SELECT
  s.id,
  p.id,
  p.name,
  20,
  2100.00,
  42000.00
FROM sales s
JOIN products p ON p.sku = 'NX-IT-022'
WHERE s."invoiceNumber" = 'SO-2001'
  AND NOT EXISTS (
    SELECT 1
    FROM sale_items si
    WHERE si.sale_id = s.id AND si.product_id = p.id
  );

INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, line_total)
SELECT
  s.id,
  p.id,
  p.name,
  55,
  1450.00,
  79750.00
FROM sales s
JOIN products p ON p.sku = 'NX-IT-022'
WHERE s."invoiceNumber" = 'SO-2002'
  AND NOT EXISTS (
    SELECT 1
    FROM sale_items si
    WHERE si.sale_id = s.id AND si.product_id = p.id
  );

UPDATE sales
SET paid_amount = 42000.00,
    balance_amount = 42000.00,
    "paymentStatus" = 'Partial',
    payment_type = 'UPI'
WHERE "invoiceNumber" = 'SO-2001';

UPDATE sales
SET paid_amount = "totalAmount",
    balance_amount = 0,
    "paymentStatus" = 'Paid',
    payment_type = 'UPI'
WHERE "invoiceNumber" = 'SO-2002';

INSERT INTO sale_payments (sale_id, receipt_number, payment_type, payment_reference, amount, payment_date_time, notes)
SELECT
  s.id,
  'RCPT-90010001',
  'UPI',
  'UPI-SO2001-1',
  42000.00,
  '2026-09-05 12:00:00',
  'First partial receipt against SO-2001'
FROM sales s
WHERE s."invoiceNumber" = 'SO-2001'
  AND NOT EXISTS (
    SELECT 1 FROM sale_payments sp WHERE sp.sale_id = s.id AND sp.receipt_number = 'RCPT-90010001'
  );

INSERT INTO sale_payments (sale_id, receipt_number, payment_type, payment_reference, amount, payment_date_time, notes)
SELECT
  s.id,
  'RCPT-90020001',
  'UPI',
  'UPI-SO2002-1',
  79750.00,
  '2026-09-06 16:00:00',
  'Full receipt against SO-2002'
FROM sales s
WHERE s."invoiceNumber" = 'SO-2002'
  AND NOT EXISTS (
    SELECT 1 FROM sale_payments sp WHERE sp.sale_id = s.id AND sp.receipt_number = 'RCPT-90020001'
  );

INSERT INTO billings (invoice_number, invoice_date, due_date, company_id, customer_id, total_amount, gst_amount, status, payment_status, notes)
SELECT
  'INV-3001',
  '2026-09-05',
  '2026-09-20',
  c.id,
  cu.id,
  84000.00,
  15120.00,
  'Issued',
  'Pending',
  'Billing created from SO-2001'
FROM customers cu
JOIN companies c ON c.id = cu.company_id
WHERE cu.email = 'ace@retail.com'
  AND NOT EXISTS (SELECT 1 FROM billings b WHERE b.invoice_number = 'INV-3001');

UPDATE billings
SET bill_type = 'SALE'
WHERE invoice_number IN ('INV-3001', 'INV-3002');

INSERT INTO billings (invoice_number, invoice_date, due_date, bill_type, company_id, supplier_id, purchase_order_id, total_amount, gst_amount, transport_charges, other_charges, status, payment_status, notes)
SELECT
  'PINV-4001',
  '2026-09-09',
  '2026-09-24',
  'PURCHASE',
  po.company_id,
  po.supplier_id,
  po.id,
  po.total_amount,
  ROUND(po.total_amount * 0.05, 2),
  po.transport_charges,
  po.other_charges,
  'Issued',
  'Pending',
  'Purchase bill booked against PO-REQ-2001'
FROM purchase_orders po
WHERE po.po_number = 'PO-REQ-2001'
  AND NOT EXISTS (SELECT 1 FROM billings b WHERE b.invoice_number = 'PINV-4001');

INSERT INTO billings (invoice_number, invoice_date, due_date, company_id, customer_id, total_amount, gst_amount, status, payment_status, notes)
SELECT
  'INV-3002',
  '2026-09-06',
  '2026-09-21',
  c.id,
  cu.id,
  79750.00,
  14355.00,
  'Issued',
  'Paid',
  'Billing created from SO-2002'
FROM customers cu
JOIN companies c ON c.id = cu.company_id
WHERE cu.email = 'dairy@greenvalley.com'
  AND NOT EXISTS (SELECT 1 FROM billings b WHERE b.invoice_number = 'INV-3002');

INSERT INTO inventory_movements (product_id, company_id, quantity, movement_type, reference_type, reference_id, notes)
SELECT
  p.id,
  c.id,
  120,
  'IN',
  'PURCHASE',
  'PO-1001',
  'Initial stock receipt from supplier'
FROM products p
JOIN companies c ON c.name = 'Nexa Feed Industries'
WHERE p.sku = 'NX-LAP-001'
  AND NOT EXISTS (
    SELECT 1
    FROM inventory_movements im
    WHERE im.reference_type = 'PURCHASE' AND im.reference_id = 'PO-1001'
  );

INSERT INTO inventory_movements (product_id, company_id, quantity, movement_type, reference_type, reference_id, notes)
SELECT
  p.id,
  c.id,
  40,
  'OUT',
  'SALE',
  'SO-2001',
  'Dispatch against sales order'
FROM products p
JOIN companies c ON c.name = 'Nexa Feed Industries'
WHERE p.sku = 'NX-LAP-001'
  AND NOT EXISTS (
    SELECT 1
    FROM inventory_movements im
    WHERE im.reference_type = 'SALE' AND im.reference_id = 'SO-2001'
  );

INSERT INTO product_rates (product_id, rate_date, rate, source, notes)
SELECT p.id, '2026-09-11', 1275.00, 'Government', 'Daily commodity bulletin'
FROM products p
WHERE p.sku = 'NX-LAP-001'
  AND NOT EXISTS (
    SELECT 1 FROM product_rates r WHERE r.product_id = p.id AND r.rate_date = '2026-09-11'
  );

INSERT INTO product_rates (product_id, rate_date, rate, source, notes)
SELECT p.id, '2026-09-12', 1282.00, 'Government', 'Daily commodity bulletin'
FROM products p
WHERE p.sku = 'NX-LAP-001'
  AND NOT EXISTS (
    SELECT 1 FROM product_rates r WHERE r.product_id = p.id AND r.rate_date = '2026-09-12'
  );

INSERT INTO product_rates (product_id, rate_date, rate, source, notes)
SELECT p.id, '2026-09-13', 1290.00, 'Government', 'Daily commodity bulletin'
FROM products p
WHERE p.sku = 'NX-LAP-001'
  AND NOT EXISTS (
    SELECT 1 FROM product_rates r WHERE r.product_id = p.id AND r.rate_date = '2026-09-13'
  );

INSERT INTO product_rates (product_id, rate_date, rate, source, notes)
SELECT p.id, '2026-09-14', 1288.00, 'Government', 'Daily commodity bulletin'
FROM products p
WHERE p.sku = 'NX-LAP-001'
  AND NOT EXISTS (
    SELECT 1 FROM product_rates r WHERE r.product_id = p.id AND r.rate_date = '2026-09-14'
  );

INSERT INTO product_rates (product_id, rate_date, rate, source, notes)
SELECT p.id, '2026-09-15', 1302.00, 'Government', 'Daily commodity bulletin'
FROM products p
WHERE p.sku = 'NX-LAP-001'
  AND NOT EXISTS (
    SELECT 1 FROM product_rates r WHERE r.product_id = p.id AND r.rate_date = '2026-09-15'
  );

INSERT INTO product_rates (product_id, rate_date, rate, source, notes)
SELECT p.id, '2026-09-16', 1310.00, 'Government', 'Today official notified rate'
FROM products p
WHERE p.sku = 'NX-LAP-001'
  AND NOT EXISTS (
    SELECT 1 FROM product_rates r WHERE r.product_id = p.id AND r.rate_date = '2026-09-16'
  );

INSERT INTO product_rates (product_id, rate_date, rate, source, notes)
SELECT p.id, '2026-09-11', 480.00, 'Government', 'Daily commodity bulletin'
FROM products p
WHERE p.sku = 'NX-IT-022'
  AND NOT EXISTS (
    SELECT 1 FROM product_rates r WHERE r.product_id = p.id AND r.rate_date = '2026-09-11'
  );

INSERT INTO product_rates (product_id, rate_date, rate, source, notes)
SELECT p.id, '2026-09-12', 486.00, 'Government', 'Daily commodity bulletin'
FROM products p
WHERE p.sku = 'NX-IT-022'
  AND NOT EXISTS (
    SELECT 1 FROM product_rates r WHERE r.product_id = p.id AND r.rate_date = '2026-09-12'
  );

INSERT INTO product_rates (product_id, rate_date, rate, source, notes)
SELECT p.id, '2026-09-13', 490.00, 'Government', 'Daily commodity bulletin'
FROM products p
WHERE p.sku = 'NX-IT-022'
  AND NOT EXISTS (
    SELECT 1 FROM product_rates r WHERE r.product_id = p.id AND r.rate_date = '2026-09-13'
  );

INSERT INTO product_rates (product_id, rate_date, rate, source, notes)
SELECT p.id, '2026-09-14', 492.00, 'Government', 'Daily commodity bulletin'
FROM products p
WHERE p.sku = 'NX-IT-022'
  AND NOT EXISTS (
    SELECT 1 FROM product_rates r WHERE r.product_id = p.id AND r.rate_date = '2026-09-14'
  );

INSERT INTO product_rates (product_id, rate_date, rate, source, notes)
SELECT p.id, '2026-09-15', 496.00, 'Government', 'Daily commodity bulletin'
FROM products p
WHERE p.sku = 'NX-IT-022'
  AND NOT EXISTS (
    SELECT 1 FROM product_rates r WHERE r.product_id = p.id AND r.rate_date = '2026-09-15'
  );

INSERT INTO product_rates (product_id, rate_date, rate, source, notes)
SELECT p.id, '2026-09-16', 499.00, 'Government', 'Today official notified rate'
FROM products p
WHERE p.sku = 'NX-IT-022'
  AND NOT EXISTS (
    SELECT 1 FROM product_rates r WHERE r.product_id = p.id AND r.rate_date = '2026-09-16'
  );

-- ---------------------------------------------------------------------------
-- Extended sample data for analytics and testing
-- Covers: profit/loss, GST/tax, journal/ledger, vendor rate comparison,
-- broker deal concentration, payment pending/paid, and sales pending amount.
-- ---------------------------------------------------------------------------

INSERT INTO suppliers (name, "contactPerson", phone, email, "gstNumber", city, state, company_id)
SELECT
  'Value Feeds Co',
  'Mahesh Jadhav',
  '+91 96666 33333',
  'mahesh@valuefeeds.in',
  '27FFFFF6666F6Z2',
  'Pune',
  'Maharashtra',
  c.id
FROM companies c
WHERE c.name = 'Nexa Feed Industries'
  AND NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.email = 'mahesh@valuefeeds.in');

INSERT INTO suppliers (name, "contactPerson", phone, email, "gstNumber", city, state, company_id)
SELECT
  'Prime Agro Inputs',
  'Kiran More',
  '+91 95555 44444',
  'kiran@primeagro.in',
  '27GGGGG7777G7Z3',
  'Pune',
  'Maharashtra',
  c.id
FROM companies c
WHERE c.name = 'Nexa Feed Industries'
  AND NOT EXISTS (SELECT 1 FROM suppliers s WHERE s.email = 'kiran@primeagro.in');

UPDATE brokers
SET company_id = c.id
FROM companies c
WHERE c.name = 'Nexa Feed Industries'
  AND brokers.name IN ('Ramesh Trade Brokers', 'Agri Link Brokers')
  AND brokers.company_id IS NULL;

INSERT INTO brokers (name, contact_person, phone, email, company_id, notes, status)
SELECT
  'Market Bridge Associates',
  'Neha Bansal',
  '+91 94444 55555',
  'neha@marketbridge.in',
  c.id,
  'Focus on commodity and bulk feed deals',
  'Active'
FROM companies c
WHERE c.name = 'Nexa Feed Industries'
  AND NOT EXISTS (SELECT 1 FROM brokers b WHERE b.name = 'Market Bridge Associates');

INSERT INTO purchases ("invoiceNumber", "purchaseDate", "productName", quantity, "unitPrice", "totalAmount", supplier_id, company_id, "paymentStatus")
SELECT
  'PO-1003',
  '2026-09-07',
  'Maize Bran',
  100,
  33.20,
  3320.00,
  s.id,
  c.id,
  'Paid'
FROM suppliers s
JOIN companies c ON c.id = s.company_id
WHERE s.email = 'suresh@a1animal.com'
  AND NOT EXISTS (SELECT 1 FROM purchases p WHERE p."invoiceNumber" = 'PO-1003');

INSERT INTO purchases ("invoiceNumber", "purchaseDate", "productName", quantity, "unitPrice", "totalAmount", supplier_id, company_id, "paymentStatus")
SELECT
  'PO-1004',
  '2026-09-08',
  'Maize Bran',
  100,
  31.80,
  3180.00,
  s.id,
  c.id,
  'Pending'
FROM suppliers s
JOIN companies c ON c.id = s.company_id
WHERE s.email = 'mahesh@valuefeeds.in'
  AND NOT EXISTS (SELECT 1 FROM purchases p WHERE p."invoiceNumber" = 'PO-1004');

INSERT INTO purchases ("invoiceNumber", "purchaseDate", "productName", quantity, "unitPrice", "totalAmount", supplier_id, company_id, "paymentStatus")
SELECT
  'PO-1005',
  '2026-09-08',
  'Maize Bran',
  100,
  35.10,
  3510.00,
  s.id,
  c.id,
  'Paid'
FROM suppliers s
JOIN companies c ON c.id = s.company_id
WHERE s.email = 'kiran@primeagro.in'
  AND NOT EXISTS (SELECT 1 FROM purchases p WHERE p."invoiceNumber" = 'PO-1005');

UPDATE purchase_orders
SET
  request_number = COALESCE(request_number, 'PR-2001'),
  items = CASE
    WHEN COALESCE(jsonb_array_length(items), 0) = 0 THEN
      '[
        {"productName":"Maize Bran","quantity":60,"unitPrice":32.50,"lineTotal":1950.00},
        {"productName":"Soy DOC","quantity":40,"unitPrice":47.00,"lineTotal":1880.00}
      ]'::jsonb
    ELSE items
  END,
  item_description = CASE
    WHEN item_description IS NULL OR trim(item_description) = '' THEN 'Maize Bran, Soy DOC'
    ELSE item_description
  END,
  quantity = CASE WHEN quantity <= 0 THEN 100 ELSE quantity END,
  unit_price = CASE WHEN unit_price <= 0 THEN 38.30 ELSE unit_price END,
  subtotal_amount = CASE WHEN subtotal_amount <= 0 THEN 3830.00 ELSE subtotal_amount END,
  total_amount = CASE WHEN total_amount <= 0 THEN subtotal_amount + transport_charges ELSE total_amount END
WHERE po_number = 'PO-REQ-2001';

INSERT INTO purchase_orders (po_number, po_date, expected_delivery_date, request_number, company_id, supplier_id, item_description, items, quantity, unit_price, transport_charges, other_charges, subtotal_amount, total_amount, status, notes)
SELECT
  'PO-REQ-2002',
  '2026-09-10',
  '2026-09-14',
  'PR-2002',
  c.id,
  s.id,
  'Maize Bran, Mineral Mix',
  '[
    {"productName":"Maize Bran","quantity":120,"unitPrice":31.80,"lineTotal":3816.00},
    {"productName":"Mineral Mix","quantity":25,"unitPrice":72.00,"lineTotal":1800.00}
  ]'::jsonb,
  145,
  38.73,
  420.00,
  180.00,
  5616.00,
  6216.00,
  'Approved',
  'Vendor quoted lowest maize rate in last 30 days'
FROM suppliers s
JOIN companies c ON c.id = s.company_id
WHERE s.email = 'mahesh@valuefeeds.in'
  AND NOT EXISTS (SELECT 1 FROM purchase_orders p WHERE p.po_number = 'PO-REQ-2002');

UPDATE sales
SET
  broker_id = (SELECT id FROM brokers WHERE name = 'Ramesh Trade Brokers'),
  brokerage_type = 'PERCENT',
  brokerage_value = 1.20,
  brokerage_amount = ROUND(("totalAmount" * 1.20 / 100.0)::numeric, 2)
WHERE "invoiceNumber" = 'SO-2001';

UPDATE sales
SET
  broker_id = (SELECT id FROM brokers WHERE name = 'Ramesh Trade Brokers'),
  brokerage_type = 'PERCENT',
  brokerage_value = 1.10,
  brokerage_amount = ROUND(("totalAmount" * 1.10 / 100.0)::numeric, 2)
WHERE "invoiceNumber" = 'SO-2002';

INSERT INTO sales ("invoiceNumber", "saleDate", product_id, "productName", quantity, "unitPrice", "totalAmount", paid_amount, balance_amount, customer_id, company_id, "paymentStatus", payment_type, broker_id, brokerage_type, brokerage_value, brokerage_amount, sale_date_time)
SELECT
  'SO-2003',
  '2026-09-10',
  p.id,
  'Nexa Layer Feed 50kg',
  30,
  1850.00,
  55500.00,
  0.00,
  55500.00,
  cu.id,
  c.id,
  'Pending',
  'Credit',
  b.id,
  'PERCENT',
  1.00,
  555.00,
  '2026-09-10 10:10:00'
FROM customers cu
JOIN companies c ON c.id = cu.company_id
LEFT JOIN products p ON p.sku = 'NX-LAP-001'
LEFT JOIN brokers b ON b.name = 'Ramesh Trade Brokers'
WHERE cu.email = 'procurement@sunriseagro.in'
  AND NOT EXISTS (SELECT 1 FROM sales s WHERE s."invoiceNumber" = 'SO-2003');

INSERT INTO sales ("invoiceNumber", "saleDate", product_id, "productName", quantity, "unitPrice", "totalAmount", paid_amount, balance_amount, customer_id, company_id, "paymentStatus", payment_type, broker_id, brokerage_type, brokerage_value, brokerage_amount, sale_date_time)
SELECT
  'SO-2004',
  '2026-09-11',
  p.id,
  'Nexa Growth Plus 25kg',
  45,
  1625.00,
  73125.00,
  73125.00,
  0.00,
  cu.id,
  c.id,
  'Paid',
  'Bank Transfer',
  b.id,
  'FIXED',
  900.00,
  900.00,
  '2026-09-11 14:20:00'
FROM customers cu
JOIN companies c ON c.id = cu.company_id
LEFT JOIN products p ON p.sku = 'NX-IT-022'
LEFT JOIN brokers b ON b.name = 'Agri Link Brokers'
WHERE cu.email = 'dairy@greenvalley.com'
  AND NOT EXISTS (SELECT 1 FROM sales s WHERE s."invoiceNumber" = 'SO-2004');

INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, line_total)
SELECT
  s.id,
  p.id,
  p.name,
  30,
  1850.00,
  55500.00
FROM sales s
JOIN products p ON p.sku = 'NX-LAP-001'
WHERE s."invoiceNumber" = 'SO-2003'
  AND NOT EXISTS (
    SELECT 1
    FROM sale_items si
    WHERE si.sale_id = s.id AND si.product_id = p.id
  );

INSERT INTO sale_items (sale_id, product_id, product_name, quantity, unit_price, line_total)
SELECT
  s.id,
  p.id,
  p.name,
  45,
  1625.00,
  73125.00
FROM sales s
JOIN products p ON p.sku = 'NX-IT-022'
WHERE s."invoiceNumber" = 'SO-2004'
  AND NOT EXISTS (
    SELECT 1
    FROM sale_items si
    WHERE si.sale_id = s.id AND si.product_id = p.id
  );

INSERT INTO sale_payments (sale_id, receipt_number, payment_type, payment_reference, amount, payment_date_time, notes)
SELECT
  s.id,
  'RCPT-90040001',
  'Bank Transfer',
  'NEFT-SO2004-1',
  73125.00,
  '2026-09-11 14:45:00',
  'Full settlement against SO-2004'
FROM sales s
WHERE s."invoiceNumber" = 'SO-2004'
  AND NOT EXISTS (
    SELECT 1 FROM sale_payments sp WHERE sp.sale_id = s.id AND sp.receipt_number = 'RCPT-90040001'
  );

UPDATE billings
SET
  paid_amount = CASE
    WHEN invoice_number = 'INV-3001' THEN 42000.00
    WHEN invoice_number = 'INV-3002' THEN total_amount
    WHEN invoice_number = 'PINV-4001' THEN 0.00
    ELSE paid_amount
  END,
  balance_amount = CASE
    WHEN invoice_number = 'INV-3001' THEN total_amount - 42000.00
    WHEN invoice_number = 'INV-3002' THEN 0.00
    WHEN invoice_number = 'PINV-4001' THEN total_amount
    ELSE balance_amount
  END,
  payment_status = CASE
    WHEN invoice_number = 'INV-3001' THEN 'Partial'
    WHEN invoice_number = 'INV-3002' THEN 'Paid'
    WHEN invoice_number = 'PINV-4001' THEN 'Pending'
    ELSE payment_status
  END,
  broker_id = CASE
    WHEN invoice_number IN ('INV-3001', 'INV-3002') THEN (SELECT id FROM brokers WHERE name = 'Ramesh Trade Brokers')
    WHEN invoice_number = 'PINV-4001' THEN (SELECT id FROM brokers WHERE name = 'Agri Link Brokers')
    ELSE broker_id
  END,
  brokerage_type = CASE
    WHEN invoice_number IN ('INV-3001', 'INV-3002') THEN 'PERCENT'
    WHEN invoice_number = 'PINV-4001' THEN 'FIXED'
    ELSE brokerage_type
  END,
  brokerage_value = CASE
    WHEN invoice_number = 'INV-3001' THEN 1.20
    WHEN invoice_number = 'INV-3002' THEN 1.10
    WHEN invoice_number = 'PINV-4001' THEN 500.00
    ELSE brokerage_value
  END,
  brokerage_amount = CASE
    WHEN invoice_number = 'INV-3001' THEN ROUND((total_amount * 1.20 / 100.0)::numeric, 2)
    WHEN invoice_number = 'INV-3002' THEN ROUND((total_amount * 1.10 / 100.0)::numeric, 2)
    WHEN invoice_number = 'PINV-4001' THEN 500.00
    ELSE brokerage_amount
  END,
  original_bill_attachment_url = CASE
    WHEN invoice_number = 'PINV-4001' THEN 'https://files.example.com/bills/pinv-4001.pdf'
    ELSE original_bill_attachment_url
  END,
  original_bill_amount = CASE
    WHEN invoice_number = 'PINV-4001' THEN total_amount
    ELSE original_bill_amount
  END,
  journal_narration = CASE
    WHEN invoice_number = 'PINV-4001' THEN 'Provision entry for purchase bill against PO-REQ-2001'
    ELSE journal_narration
  END
WHERE invoice_number IN ('INV-3001', 'INV-3002', 'PINV-4001');

INSERT INTO billings (invoice_number, invoice_date, due_date, bill_type, company_id, supplier_id, purchase_order_id, total_amount, gst_amount, transport_charges, other_charges, paid_amount, balance_amount, payment_status, broker_id, brokerage_type, brokerage_value, brokerage_amount, original_bill_attachment_url, original_bill_amount, journal_narration, status, notes)
SELECT
  'PINV-4002',
  '2026-09-12',
  '2026-09-27',
  'PURCHASE',
  po.company_id,
  po.supplier_id,
  po.id,
  po.total_amount,
  ROUND((po.total_amount * 0.05)::numeric, 2),
  po.transport_charges,
  po.other_charges,
  po.total_amount,
  0.00,
  'Paid',
  (SELECT id FROM brokers WHERE name = 'Ramesh Trade Brokers'),
  'PERCENT',
  0.80,
  ROUND((po.total_amount * 0.80 / 100.0)::numeric, 2),
  'https://files.example.com/bills/pinv-4002.pdf',
  po.total_amount,
  'Purchase bill settled in full against PO-REQ-2002',
  'Issued',
  'Fully paid purchase bill with GST and brokerage'
FROM purchase_orders po
WHERE po.po_number = 'PO-REQ-2002'
  AND NOT EXISTS (SELECT 1 FROM billings b WHERE b.invoice_number = 'PINV-4002');

INSERT INTO journal_entries (billing_id, purchase_order_id, company_id, entry_date, debit_amount, credit_amount, narration)
SELECT
  b.id,
  b.purchase_order_id,
  b.company_id,
  b.invoice_date,
  b.total_amount,
  0.00,
  COALESCE(b.journal_narration, 'Purchase bill booking')
FROM billings b
WHERE b.invoice_number = 'PINV-4001'
  AND NOT EXISTS (
    SELECT 1 FROM journal_entries j WHERE j.billing_id = b.id AND j.debit_amount = b.total_amount
  );

INSERT INTO journal_entries (billing_id, purchase_order_id, company_id, entry_date, debit_amount, credit_amount, narration)
SELECT
  b.id,
  b.purchase_order_id,
  b.company_id,
  b.invoice_date,
  0.00,
  b.paid_amount,
  'Cash/Bank settlement against purchase bill'
FROM billings b
WHERE b.invoice_number = 'PINV-4002'
  AND NOT EXISTS (
    SELECT 1 FROM journal_entries j WHERE j.billing_id = b.id AND j.credit_amount = b.paid_amount
  );

CREATE OR REPLACE VIEW vw_vendor_best_rates AS
WITH purchase_rates AS (
  SELECT
    p.company_id,
    p.supplier_id,
    LOWER(TRIM(p."productName")) AS product_key,
    TRIM(p."productName") AS product_name,
    p."unitPrice"::numeric AS unit_price,
    p."purchaseDate"::date AS tx_date,
    'PURCHASE'::text AS source
  FROM purchases p
  WHERE COALESCE(TRIM(p."productName"), '') <> ''
),
po_rates AS (
  SELECT
    po.company_id,
    po.supplier_id,
    LOWER(TRIM(item.product_name)) AS product_key,
    TRIM(item.product_name) AS product_name,
    item.unit_price AS unit_price,
    po.po_date::date AS tx_date,
    'PO'::text AS source
  FROM purchase_orders po
  CROSS JOIN LATERAL (
    SELECT
      (x->>'productName')::text AS product_name,
      COALESCE((x->>'unitPrice')::numeric, 0) AS unit_price
    FROM jsonb_array_elements(COALESCE(po.items, '[]'::jsonb)) x
  ) item
  WHERE COALESCE(TRIM(item.product_name), '') <> ''
),
merged AS (
  SELECT * FROM purchase_rates
  UNION ALL
  SELECT * FROM po_rates
)
SELECT
  m.company_id,
  c.name AS company_name,
  m.product_name,
  m.supplier_id,
  s.name AS supplier_name,
  ROUND(AVG(m.unit_price), 2) AS avg_unit_price,
  ROUND(MIN(m.unit_price), 2) AS best_rate,
  ROUND(MAX(m.unit_price), 2) AS highest_rate,
  COUNT(*)::int AS sample_count,
  STRING_AGG(DISTINCT m.source, ', ' ORDER BY m.source) AS sources,
  CASE
    WHEN MIN(m.unit_price) = 0 THEN 0
    ELSE ROUND(((MAX(m.unit_price) - MIN(m.unit_price)) / MIN(m.unit_price)) * 100, 2)
  END AS rate_gap_percent
FROM merged m
JOIN suppliers s ON s.id = m.supplier_id
LEFT JOIN companies c ON c.id = m.company_id
GROUP BY m.company_id, c.name, m.product_name, m.supplier_id, s.name
ORDER BY m.product_name, avg_unit_price ASC;

CREATE OR REPLACE VIEW vw_broker_deal_summary AS
WITH deals AS (
  SELECT
    s.broker_id,
    s.company_id,
    s."invoiceNumber"::text AS reference_number,
    s."totalAmount"::numeric AS deal_value,
    s."paymentStatus"::text AS payment_status,
    'SALE'::text AS deal_type,
    COALESCE(s.brokerage_amount, 0)::numeric AS brokerage_amount,
    s.sale_date_time::date AS deal_date
  FROM sales s
  WHERE s.broker_id IS NOT NULL

  UNION ALL

  SELECT
    b.broker_id,
    b.company_id,
    b.invoice_number::text AS reference_number,
    b.total_amount::numeric AS deal_value,
    b.payment_status::text AS payment_status,
    b.bill_type::text AS deal_type,
    COALESCE(b.brokerage_amount, 0)::numeric AS brokerage_amount,
    b.invoice_date::date AS deal_date
  FROM billings b
  WHERE b.broker_id IS NOT NULL
)
SELECT
  d.company_id,
  c.name AS company_name,
  d.broker_id,
  br.name AS broker_name,
  COUNT(*)::int AS total_deals,
  ROUND(SUM(d.deal_value), 2) AS total_deal_value,
  ROUND(SUM(d.brokerage_amount), 2) AS total_brokerage,
  COUNT(*) FILTER (WHERE LOWER(d.payment_status) = 'paid')::int AS paid_deals,
  COUNT(*) FILTER (WHERE LOWER(d.payment_status) IN ('pending', 'partial'))::int AS open_deals,
  MAX(d.deal_date) AS last_deal_date
FROM deals d
JOIN brokers br ON br.id = d.broker_id
LEFT JOIN companies c ON c.id = d.company_id
GROUP BY d.company_id, c.name, d.broker_id, br.name
ORDER BY total_deals DESC, total_deal_value DESC;

CREATE OR REPLACE VIEW vw_payment_status_summary AS
SELECT
  'sales'::text AS source,
  s.company_id,
  c.name AS company_name,
  s."paymentStatus"::text AS payment_status,
  COUNT(*)::int AS invoice_count,
  ROUND(SUM(s."totalAmount"::numeric), 2) AS total_amount,
  ROUND(SUM(COALESCE(s.paid_amount, 0)::numeric), 2) AS paid_amount,
  ROUND(SUM(COALESCE(s.balance_amount, 0)::numeric), 2) AS pending_amount
FROM sales s
LEFT JOIN companies c ON c.id = s.company_id
GROUP BY s.company_id, c.name, s."paymentStatus"

UNION ALL

SELECT
  'billings'::text AS source,
  b.company_id,
  c.name AS company_name,
  b.payment_status::text AS payment_status,
  COUNT(*)::int AS invoice_count,
  ROUND(SUM(b.total_amount::numeric), 2) AS total_amount,
  ROUND(SUM(COALESCE(b.paid_amount, 0)::numeric), 2) AS paid_amount,
  ROUND(SUM(COALESCE(b.balance_amount, 0)::numeric), 2) AS pending_amount
FROM billings b
LEFT JOIN companies c ON c.id = b.company_id
GROUP BY b.company_id, c.name, b.payment_status;

CREATE OR REPLACE VIEW vw_sales_pending_amount AS
SELECT
  s.company_id,
  c.name AS company_name,
  s.id AS sale_id,
  s."invoiceNumber" AS invoice_number,
  s."saleDate" AS sale_date,
  s."totalAmount"::numeric AS total_amount,
  COALESCE(s.paid_amount, 0)::numeric AS paid_amount,
  COALESCE(s.balance_amount, 0)::numeric AS pending_amount,
  s."paymentStatus" AS payment_status,
  cu.name AS customer_name
FROM sales s
LEFT JOIN companies c ON c.id = s.company_id
LEFT JOIN customers cu ON cu.id = s.customer_id
WHERE COALESCE(s.balance_amount, 0) > 0
ORDER BY pending_amount DESC, s."saleDate" DESC;

CREATE OR REPLACE VIEW vw_profit_loss_snapshot AS
WITH sales_rollup AS (
  SELECT
    s.company_id,
    ROUND(SUM(s."totalAmount"::numeric), 2) AS gross_sales,
    ROUND(SUM(COALESCE(s.brokerage_amount, 0)::numeric), 2) AS sales_brokerage,
    ROUND(SUM((s."totalAmount"::numeric * 0.18)), 2) AS output_gst
  FROM sales s
  GROUP BY s.company_id
),
purchase_rollup AS (
  SELECT
    p.company_id,
    ROUND(SUM(p."totalAmount"::numeric), 2) AS gross_purchase,
    ROUND(SUM((p."totalAmount"::numeric * 0.05)), 2) AS input_gst
  FROM purchases p
  GROUP BY p.company_id
),
billing_transport AS (
  SELECT
    b.company_id,
    ROUND(SUM(COALESCE(b.transport_charges, 0)::numeric), 2) AS transport_cost
  FROM billings b
  GROUP BY b.company_id
)
SELECT
  c.id AS company_id,
  c.name AS company_name,
  COALESCE(sr.gross_sales, 0) AS gross_sales,
  COALESCE(pr.gross_purchase, 0) AS gross_purchase,
  COALESCE(sr.output_gst, 0) AS output_gst,
  COALESCE(pr.input_gst, 0) AS input_gst,
  COALESCE(sr.sales_brokerage, 0) AS brokerage_expense,
  COALESCE(bt.transport_cost, 0) AS transport_expense,
  ROUND(COALESCE(sr.gross_sales, 0) - COALESCE(pr.gross_purchase, 0), 2) AS gross_profit,
  ROUND(
    COALESCE(sr.gross_sales, 0)
    - COALESCE(pr.gross_purchase, 0)
    - COALESCE(sr.sales_brokerage, 0)
    - COALESCE(bt.transport_cost, 0),
    2
  ) AS net_profit,
  ROUND(
    COALESCE(pr.gross_purchase, 0)
    + COALESCE(sr.sales_brokerage, 0)
    + COALESCE(bt.transport_cost, 0)
    - COALESCE(sr.gross_sales, 0),
    2
  ) AS net_loss_if_negative
FROM companies c
LEFT JOIN sales_rollup sr ON sr.company_id = c.id
LEFT JOIN purchase_rollup pr ON pr.company_id = c.id
LEFT JOIN billing_transport bt ON bt.company_id = c.id
ORDER BY c.name;

SELECT 'NexaERP seed data loaded successfully with analytics fixtures.' AS status;
