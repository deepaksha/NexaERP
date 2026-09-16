-- NexaERP normalization foundation (non-breaking)
-- Purpose:
-- 1) Introduce normalized master tables for parties, contacts, addresses, tax IDs, and roles.
-- 2) Add configurable approval rule tables.
-- 3) Add extension tables for custom attributes and payment schedules.
-- 4) Backfill from existing legacy tables (suppliers/customers/brokers) without changing app behavior.

BEGIN;

-- ---------------------------------------------------------------------------
-- 1) Generic lookups
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS lookup_status (
  id SERIAL PRIMARY KEY,
  domain VARCHAR(80) NOT NULL,
  code VARCHAR(80) NOT NULL,
  label VARCHAR(120) NOT NULL,
  sort_order INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (domain, code)
);

INSERT INTO lookup_status (domain, code, label, sort_order)
VALUES
  ('party', 'active', 'Active', 1),
  ('party', 'inactive', 'Inactive', 2),
  ('purchase_order', 'draft', 'Draft', 1),
  ('purchase_order', 'pending_approval', 'Pending Approval', 2),
  ('purchase_order', 'approved', 'Approved', 3),
  ('purchase_order', 'rejected', 'Rejected', 4),
  ('purchase_order', 'billed', 'Billed', 5),
  ('purchase_order', 'closed', 'Closed', 6),
  ('purchase_order', 'cancelled', 'Cancelled', 7),
  ('billing', 'draft', 'Draft', 1),
  ('billing', 'issued', 'Issued', 2),
  ('billing', 'paid', 'Paid', 3),
  ('billing', 'overdue', 'Overdue', 4),
  ('payment', 'pending', 'Pending', 1),
  ('payment', 'partial', 'Partial', 2),
  ('payment', 'paid', 'Paid', 3)
ON CONFLICT (domain, code) DO NOTHING;

CREATE TABLE IF NOT EXISTS uom_master (
  id SERIAL PRIMARY KEY,
  code VARCHAR(20) NOT NULL UNIQUE,
  name VARCHAR(80) NOT NULL,
  category VARCHAR(80),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO uom_master (code, name, category)
VALUES
  ('KG', 'Kilogram', 'Weight'),
  ('MT', 'Metric Ton', 'Weight'),
  ('PCS', 'Pieces', 'Count'),
  ('LTR', 'Litre', 'Volume'),
  ('BAG', 'Bag', 'Packaging')
ON CONFLICT (code) DO NOTHING;

-- ---------------------------------------------------------------------------
-- 2) Party normalization (suppliers/customers/brokers -> party_*)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS party_master (
  id SERIAL PRIMARY KEY,
  legal_name VARCHAR(255) NOT NULL,
  display_name VARCHAR(255),
  status_code VARCHAR(80) NOT NULL DEFAULT 'active',
  source_system VARCHAR(80) NOT NULL DEFAULT 'nexaerp',
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_party_master_legal_name ON party_master(legal_name);

CREATE TABLE IF NOT EXISTS party_legacy_map (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE CASCADE,
  source_table VARCHAR(80) NOT NULL,
  source_id INTEGER NOT NULL,
  UNIQUE (source_table, source_id)
);

CREATE TABLE IF NOT EXISTS party_company_roles (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE CASCADE,
  company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
  role_code VARCHAR(80) NOT NULL,
  status_code VARCHAR(80) NOT NULL DEFAULT 'active',
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (party_id, company_id, role_code)
);

CREATE INDEX IF NOT EXISTS idx_party_company_roles_company_role
  ON party_company_roles(company_id, role_code);

CREATE TABLE IF NOT EXISTS party_contacts (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE CASCADE,
  contact_name VARCHAR(255),
  phone VARCHAR(50),
  email VARCHAR(255),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_party_contacts_party_id ON party_contacts(party_id);

CREATE TABLE IF NOT EXISTS party_addresses (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE CASCADE,
  address_line1 TEXT,
  address_line2 TEXT,
  city VARCHAR(150),
  state VARCHAR(150),
  country VARCHAR(150) DEFAULT 'India',
  postal_code VARCHAR(20),
  is_primary BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_party_addresses_party_id ON party_addresses(party_id);

CREATE TABLE IF NOT EXISTS party_tax_identifiers (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE CASCADE,
  id_type VARCHAR(50) NOT NULL,
  id_value VARCHAR(120) NOT NULL,
  is_primary BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (id_type, id_value)
);

CREATE INDEX IF NOT EXISTS idx_party_tax_identifiers_party_id ON party_tax_identifiers(party_id);

-- Backfill suppliers
INSERT INTO party_master (legal_name, display_name, status_code)
SELECT DISTINCT s.name, s.name, LOWER(COALESCE(s.status, 'Active'))
FROM suppliers s
WHERE NOT EXISTS (
  SELECT 1
  FROM party_legacy_map m
  WHERE m.source_table = 'suppliers' AND m.source_id = s.id
);

INSERT INTO party_legacy_map (party_id, source_table, source_id)
SELECT p.id, 'suppliers', s.id
FROM suppliers s
JOIN party_master p ON p.legal_name = s.name
WHERE NOT EXISTS (
  SELECT 1
  FROM party_legacy_map m
  WHERE m.source_table = 'suppliers' AND m.source_id = s.id
);

INSERT INTO party_company_roles (party_id, company_id, role_code, status_code)
SELECT m.party_id, s.company_id, 'supplier', LOWER(COALESCE(s.status, 'Active'))
FROM suppliers s
JOIN party_legacy_map m ON m.source_table = 'suppliers' AND m.source_id = s.id
WHERE s.company_id IS NOT NULL
ON CONFLICT (party_id, company_id, role_code) DO NOTHING;

INSERT INTO party_contacts (party_id, contact_name, phone, email, is_primary)
SELECT m.party_id, s."contactPerson", s.phone, s.email, TRUE
FROM suppliers s
JOIN party_legacy_map m ON m.source_table = 'suppliers' AND m.source_id = s.id
WHERE NOT EXISTS (
  SELECT 1 FROM party_contacts c
  WHERE c.party_id = m.party_id AND c.is_primary = TRUE
);

INSERT INTO party_addresses (party_id, address_line1, city, state, country, is_primary)
SELECT m.party_id, s.address, s.city, s.state, COALESCE(s.country, 'India'), TRUE
FROM suppliers s
JOIN party_legacy_map m ON m.source_table = 'suppliers' AND m.source_id = s.id
WHERE NOT EXISTS (
  SELECT 1 FROM party_addresses a
  WHERE a.party_id = m.party_id AND a.is_primary = TRUE
);

INSERT INTO party_tax_identifiers (party_id, id_type, id_value, is_primary)
SELECT m.party_id, 'GSTIN', s."gstNumber", TRUE
FROM suppliers s
JOIN party_legacy_map m ON m.source_table = 'suppliers' AND m.source_id = s.id
WHERE COALESCE(TRIM(s."gstNumber"), '') <> ''
ON CONFLICT (id_type, id_value) DO NOTHING;

-- Backfill customers
INSERT INTO party_master (legal_name, display_name, status_code)
SELECT DISTINCT c.name, c.name, LOWER(COALESCE(c.status, 'Active'))
FROM customers c
WHERE NOT EXISTS (
  SELECT 1
  FROM party_legacy_map m
  WHERE m.source_table = 'customers' AND m.source_id = c.id
);

INSERT INTO party_legacy_map (party_id, source_table, source_id)
SELECT p.id, 'customers', c.id
FROM customers c
JOIN party_master p ON p.legal_name = c.name
WHERE NOT EXISTS (
  SELECT 1
  FROM party_legacy_map m
  WHERE m.source_table = 'customers' AND m.source_id = c.id
);

INSERT INTO party_company_roles (party_id, company_id, role_code, status_code)
SELECT m.party_id, c.company_id, 'customer', LOWER(COALESCE(c.status, 'Active'))
FROM customers c
JOIN party_legacy_map m ON m.source_table = 'customers' AND m.source_id = c.id
WHERE c.company_id IS NOT NULL
ON CONFLICT (party_id, company_id, role_code) DO NOTHING;

INSERT INTO party_contacts (party_id, contact_name, phone, email, is_primary)
SELECT m.party_id, NULL, c.phone, c.email, TRUE
FROM customers c
JOIN party_legacy_map m ON m.source_table = 'customers' AND m.source_id = c.id
WHERE NOT EXISTS (
  SELECT 1 FROM party_contacts ct
  WHERE ct.party_id = m.party_id AND ct.is_primary = TRUE
);

INSERT INTO party_addresses (party_id, address_line1, city, state, country, is_primary)
SELECT m.party_id, c.address, c.city, c.state, COALESCE(c.country, 'India'), TRUE
FROM customers c
JOIN party_legacy_map m ON m.source_table = 'customers' AND m.source_id = c.id
WHERE NOT EXISTS (
  SELECT 1 FROM party_addresses a
  WHERE a.party_id = m.party_id AND a.is_primary = TRUE
);

INSERT INTO party_tax_identifiers (party_id, id_type, id_value, is_primary)
SELECT m.party_id, 'GSTIN', c."gstNumber", TRUE
FROM customers c
JOIN party_legacy_map m ON m.source_table = 'customers' AND m.source_id = c.id
WHERE COALESCE(TRIM(c."gstNumber"), '') <> ''
ON CONFLICT (id_type, id_value) DO NOTHING;

-- Backfill brokers
INSERT INTO party_master (legal_name, display_name, status_code)
SELECT DISTINCT b.name, b.name, LOWER(COALESCE(b.status, 'Active'))
FROM brokers b
WHERE NOT EXISTS (
  SELECT 1
  FROM party_legacy_map m
  WHERE m.source_table = 'brokers' AND m.source_id = b.id
);

INSERT INTO party_legacy_map (party_id, source_table, source_id)
SELECT p.id, 'brokers', b.id
FROM brokers b
JOIN party_master p ON p.legal_name = b.name
WHERE NOT EXISTS (
  SELECT 1
  FROM party_legacy_map m
  WHERE m.source_table = 'brokers' AND m.source_id = b.id
);

INSERT INTO party_company_roles (party_id, company_id, role_code, status_code)
SELECT m.party_id, b.company_id, 'broker', LOWER(COALESCE(b.status, 'Active'))
FROM brokers b
JOIN party_legacy_map m ON m.source_table = 'brokers' AND m.source_id = b.id
WHERE b.company_id IS NOT NULL
ON CONFLICT (party_id, company_id, role_code) DO NOTHING;

INSERT INTO party_contacts (party_id, contact_name, phone, email, is_primary)
SELECT m.party_id, b.contact_person, b.phone, b.email, TRUE
FROM brokers b
JOIN party_legacy_map m ON m.source_table = 'brokers' AND m.source_id = b.id
WHERE NOT EXISTS (
  SELECT 1 FROM party_contacts c
  WHERE c.party_id = m.party_id AND c.is_primary = TRUE
);

-- ---------------------------------------------------------------------------
-- 3) Approval rules in DB (replace env-only approach over time)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS approval_rule_sets (
  id SERIAL PRIMARY KEY,
  module_code VARCHAR(80) NOT NULL,
  doc_type VARCHAR(80) NOT NULL,
  company_id INTEGER REFERENCES companies(id),
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (module_code, doc_type, company_id)
);

CREATE TABLE IF NOT EXISTS approval_rules (
  id SERIAL PRIMARY KEY,
  rule_set_id INTEGER NOT NULL REFERENCES approval_rule_sets(id) ON DELETE CASCADE,
  sequence_no INTEGER NOT NULL,
  min_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  max_amount DECIMAL(14,2) NOT NULL,
  approver_role_slug VARCHAR(120) NOT NULL,
  auto_approve BOOLEAN NOT NULL DEFAULT FALSE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (rule_set_id, sequence_no)
);

CREATE INDEX IF NOT EXISTS idx_approval_rules_range ON approval_rules(rule_set_id, min_amount, max_amount);

INSERT INTO approval_rule_sets (module_code, doc_type, company_id)
VALUES ('procurement', 'purchase_order', NULL)
ON CONFLICT (module_code, doc_type, company_id) DO NOTHING;

INSERT INTO approval_rules (rule_set_id, sequence_no, min_amount, max_amount, approver_role_slug, auto_approve)
SELECT ars.id, 1, 0, 50000, 'supervisor', FALSE
FROM approval_rule_sets ars
WHERE ars.module_code = 'procurement' AND ars.doc_type = 'purchase_order' AND ars.company_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM approval_rules ar WHERE ar.rule_set_id = ars.id AND ar.sequence_no = 1
  );

INSERT INTO approval_rules (rule_set_id, sequence_no, min_amount, max_amount, approver_role_slug, auto_approve)
SELECT ars.id, 2, 50000.01, 200000, 'manager', FALSE
FROM approval_rule_sets ars
WHERE ars.module_code = 'procurement' AND ars.doc_type = 'purchase_order' AND ars.company_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM approval_rules ar WHERE ar.rule_set_id = ars.id AND ar.sequence_no = 2
  );

INSERT INTO approval_rules (rule_set_id, sequence_no, min_amount, max_amount, approver_role_slug, auto_approve)
SELECT ars.id, 3, 200000.01, 999999999, 'admin', FALSE
FROM approval_rule_sets ars
WHERE ars.module_code = 'procurement' AND ars.doc_type = 'purchase_order' AND ars.company_id IS NULL
  AND NOT EXISTS (
    SELECT 1 FROM approval_rules ar WHERE ar.rule_set_id = ars.id AND ar.sequence_no = 3
  );

-- ---------------------------------------------------------------------------
-- 4) Document attachments / payment schedules / custom fields
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS document_attachments (
  id SERIAL PRIMARY KEY,
  entity_name VARCHAR(80) NOT NULL,
  entity_id INTEGER NOT NULL,
  category VARCHAR(80),
  file_name VARCHAR(255) NOT NULL,
  storage_url TEXT NOT NULL,
  mime_type VARCHAR(120),
  size_bytes BIGINT,
  uploaded_by VARCHAR(255),
  uploaded_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_document_attachments_entity
  ON document_attachments(entity_name, entity_id);

CREATE TABLE IF NOT EXISTS payment_terms_master (
  id SERIAL PRIMARY KEY,
  code VARCHAR(60) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL,
  due_days INTEGER NOT NULL DEFAULT 0,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO payment_terms_master (code, label, due_days)
VALUES
  ('IMMEDIATE', 'Immediate', 0),
  ('NET_7', 'Net 7 Days', 7),
  ('NET_15', 'Net 15 Days', 15),
  ('NET_30', 'Net 30 Days', 30),
  ('NET_45', 'Net 45 Days', 45)
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS billing_payment_schedules (
  id SERIAL PRIMARY KEY,
  billing_id INTEGER NOT NULL REFERENCES billings(id) ON DELETE CASCADE,
  installment_no INTEGER NOT NULL,
  due_date DATE NOT NULL,
  amount DECIMAL(14,2) NOT NULL,
  paid_amount DECIMAL(14,2) NOT NULL DEFAULT 0,
  payment_status VARCHAR(40) NOT NULL DEFAULT 'pending',
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (billing_id, installment_no)
);

CREATE INDEX IF NOT EXISTS idx_billing_payment_schedules_status
  ON billing_payment_schedules(payment_status, due_date);

CREATE TABLE IF NOT EXISTS entity_attribute_definitions (
  id SERIAL PRIMARY KEY,
  entity_name VARCHAR(80) NOT NULL,
  attribute_key VARCHAR(120) NOT NULL,
  display_label VARCHAR(180) NOT NULL,
  data_type VARCHAR(40) NOT NULL DEFAULT 'text',
  is_required BOOLEAN NOT NULL DEFAULT FALSE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (entity_name, attribute_key)
);

CREATE TABLE IF NOT EXISTS entity_attribute_values (
  id SERIAL PRIMARY KEY,
  definition_id INTEGER NOT NULL REFERENCES entity_attribute_definitions(id) ON DELETE CASCADE,
  entity_name VARCHAR(80) NOT NULL,
  entity_id INTEGER NOT NULL,
  value_text TEXT,
  value_number DECIMAL(20,6),
  value_date DATE,
  value_json JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (definition_id, entity_name, entity_id)
);

CREATE INDEX IF NOT EXISTS idx_entity_attribute_values_entity
  ON entity_attribute_values(entity_name, entity_id);

-- ---------------------------------------------------------------------------
-- 5) Compatibility views for incremental migration
-- ---------------------------------------------------------------------------
CREATE OR REPLACE VIEW vw_supplier_party AS
SELECT
  s.id AS supplier_id,
  m.party_id,
  p.legal_name,
  p.display_name,
  s.company_id,
  s.status,
  s."createdAt" AS created_at
FROM suppliers s
JOIN party_legacy_map m ON m.source_table = 'suppliers' AND m.source_id = s.id
JOIN party_master p ON p.id = m.party_id;

CREATE OR REPLACE VIEW vw_customer_party AS
SELECT
  c.id AS customer_id,
  m.party_id,
  p.legal_name,
  p.display_name,
  c.company_id,
  c.status,
  c."createdAt" AS created_at
FROM customers c
JOIN party_legacy_map m ON m.source_table = 'customers' AND m.source_id = c.id
JOIN party_master p ON p.id = m.party_id;

CREATE OR REPLACE VIEW vw_broker_party AS
SELECT
  b.id AS broker_id,
  m.party_id,
  p.legal_name,
  p.display_name,
  b.company_id,
  b.status,
  b.created_at
FROM brokers b
JOIN party_legacy_map m ON m.source_table = 'brokers' AND m.source_id = b.id
JOIN party_master p ON p.id = m.party_id;

-- ---------------------------------------------------------------------------
-- 6) EPR + India trademark compliance foundation (normalized)
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS epr_role_master (
  id SERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  label VARCHAR(120) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO epr_role_master (code, label, description)
VALUES
  ('PRODUCER', 'Producer', 'Entity manufacturing goods with EPR obligations.'),
  ('IMPORTER', 'Importer', 'Entity importing goods/packaging with EPR obligations.'),
  ('BRAND_OWNER', 'Brand Owner', 'Entity owning brand/trademark under which goods are sold.'),
  ('RECYCLER', 'Recycler', 'Authorized recycler processing eligible waste streams.'),
  ('PRO', 'Producer Responsibility Organization', 'Service provider helping PIBOs meet EPR obligations.')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS cpcb_material_category_master (
  id SERIAL PRIMARY KEY,
  code VARCHAR(50) NOT NULL UNIQUE,
  label VARCHAR(150) NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO cpcb_material_category_master (code, label, description)
VALUES
  ('PLASTIC_CAT_I', 'Plastic Category I', 'Rigid plastic packaging.'),
  ('PLASTIC_CAT_II', 'Plastic Category II', 'Flexible plastic packaging.'),
  ('PLASTIC_CAT_III', 'Plastic Category III', 'Multi-layered plastic packaging.'),
  ('PLASTIC_CAT_IV', 'Plastic Category IV', 'Compostable plastic packaging.'),
  ('E_WASTE', 'E-Waste', 'Electrical and electronic waste stream.'),
  ('BATTERY', 'Battery Waste', 'Battery waste stream under battery waste rules.'),
  ('TYRE', 'Waste Tyre', 'Tyre waste stream under applicable rules.')
ON CONFLICT (code) DO NOTHING;

CREATE TABLE IF NOT EXISTS india_state_master (
  id SERIAL PRIMARY KEY,
  state_code VARCHAR(10) NOT NULL UNIQUE,
  state_name VARCHAR(120) NOT NULL UNIQUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

INSERT INTO india_state_master (state_code, state_name)
VALUES
  ('AN', 'Andaman and Nicobar Islands'),
  ('AP', 'Andhra Pradesh'),
  ('AR', 'Arunachal Pradesh'),
  ('AS', 'Assam'),
  ('BR', 'Bihar'),
  ('CH', 'Chandigarh'),
  ('CT', 'Chhattisgarh'),
  ('DH', 'Dadra and Nagar Haveli and Daman and Diu'),
  ('DL', 'Delhi'),
  ('GA', 'Goa'),
  ('GJ', 'Gujarat'),
  ('HR', 'Haryana'),
  ('HP', 'Himachal Pradesh'),
  ('JH', 'Jharkhand'),
  ('JK', 'Jammu and Kashmir'),
  ('KA', 'Karnataka'),
  ('KL', 'Kerala'),
  ('LA', 'Ladakh'),
  ('LD', 'Lakshadweep'),
  ('MH', 'Maharashtra'),
  ('ML', 'Meghalaya'),
  ('MN', 'Manipur'),
  ('MP', 'Madhya Pradesh'),
  ('MZ', 'Mizoram'),
  ('NL', 'Nagaland'),
  ('OD', 'Odisha'),
  ('PB', 'Punjab'),
  ('PY', 'Puducherry'),
  ('RJ', 'Rajasthan'),
  ('SK', 'Sikkim'),
  ('TN', 'Tamil Nadu'),
  ('TR', 'Tripura'),
  ('TS', 'Telangana'),
  ('UK', 'Uttarakhand'),
  ('UP', 'Uttar Pradesh'),
  ('WB', 'West Bengal')
ON CONFLICT (state_code) DO NOTHING;

CREATE TABLE IF NOT EXISTS epr_organization_role_assignments (
  id SERIAL PRIMARY KEY,
  party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE CASCADE,
  company_id INTEGER REFERENCES companies(id) ON DELETE SET NULL,
  epr_role_id INTEGER NOT NULL REFERENCES epr_role_master(id),
  valid_from DATE,
  valid_to DATE,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (party_id, company_id, epr_role_id)
);

CREATE INDEX IF NOT EXISTS idx_epr_org_roles_party
  ON epr_organization_role_assignments(party_id, epr_role_id);

CREATE TABLE IF NOT EXISTS india_trademark_registry (
  id SERIAL PRIMARY KEY,
  proprietor_party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE RESTRICT,
  mark_text VARCHAR(255) NOT NULL,
  mark_type VARCHAR(40) NOT NULL DEFAULT 'WORD',
  application_number VARCHAR(50),
  registration_number VARCHAR(50),
  nice_class_no SMALLINT NOT NULL,
  status_code VARCHAR(40) NOT NULL,
  filing_date DATE,
  registration_date DATE,
  expiry_date DATE,
  jurisdiction VARCHAR(20) NOT NULL DEFAULT 'IN',
  journal_number VARCHAR(40),
  notes TEXT,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_india_tm_mark_type CHECK (mark_type IN ('WORD', 'DEVICE', 'COMBINED', 'LABEL', 'OTHER')),
  CONSTRAINT chk_india_tm_class CHECK (nice_class_no BETWEEN 1 AND 45),
  CONSTRAINT chk_india_tm_status CHECK (status_code IN ('FILED', 'FORMALITY_CHECK_PASS', 'OBJECTED', 'OPPOSED', 'REGISTERED', 'ABANDONED', 'REFUSED', 'EXPIRED')),
  CONSTRAINT uq_india_tm_application UNIQUE (application_number),
  CONSTRAINT uq_india_tm_registration UNIQUE (registration_number)
);

CREATE INDEX IF NOT EXISTS idx_india_tm_proprietor
  ON india_trademark_registry(proprietor_party_id);

CREATE TABLE IF NOT EXISTS india_trademark_ownership_history (
  id SERIAL PRIMARY KEY,
  trademark_id INTEGER NOT NULL REFERENCES india_trademark_registry(id) ON DELETE CASCADE,
  owner_party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE RESTRICT,
  ownership_type VARCHAR(30) NOT NULL DEFAULT 'PROPRIETOR',
  valid_from DATE NOT NULL,
  valid_to DATE,
  evidence_attachment_id INTEGER REFERENCES document_attachments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_tm_ownership_type CHECK (ownership_type IN ('PROPRIETOR', 'LICENSEE', 'ASSIGNEE')),
  UNIQUE (trademark_id, owner_party_id, ownership_type, valid_from)
);

CREATE TABLE IF NOT EXISTS epr_brand_authorizations (
  id SERIAL PRIMARY KEY,
  trademark_id INTEGER NOT NULL REFERENCES india_trademark_registry(id) ON DELETE RESTRICT,
  brand_owner_party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE RESTRICT,
  authorized_party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE RESTRICT,
  authorization_scope VARCHAR(80) NOT NULL,
  authorization_number VARCHAR(80),
  start_date DATE NOT NULL,
  end_date DATE,
  status_code VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  authorization_document_id INTEGER REFERENCES document_attachments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_epr_brand_auth_scope CHECK (authorization_scope IN ('EPR_FILING', 'MANUFACTURING', 'IMPORT', 'DISTRIBUTION', 'COMBINED')),
  CONSTRAINT chk_epr_brand_auth_status CHECK (status_code IN ('ACTIVE', 'SUSPENDED', 'EXPIRED', 'REVOKED')),
  CONSTRAINT chk_epr_brand_auth_party CHECK (brand_owner_party_id <> authorized_party_id),
  UNIQUE (trademark_id, brand_owner_party_id, authorized_party_id, authorization_scope, start_date)
);

CREATE INDEX IF NOT EXISTS idx_epr_brand_auth_authorized
  ON epr_brand_authorizations(authorized_party_id, status_code);

CREATE TABLE IF NOT EXISTS epr_registrations (
  id SERIAL PRIMARY KEY,
  registrant_party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE RESTRICT,
  epr_role_id INTEGER NOT NULL REFERENCES epr_role_master(id),
  registration_number VARCHAR(80) NOT NULL UNIQUE,
  registration_authority VARCHAR(50) NOT NULL DEFAULT 'CPCB',
  registration_status VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  issue_date DATE,
  expiry_date DATE,
  certificate_attachment_id INTEGER REFERENCES document_attachments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_epr_registration_authority CHECK (registration_authority IN ('CPCB', 'SPCB', 'PCC')),
  CONSTRAINT chk_epr_registration_status CHECK (registration_status IN ('ACTIVE', 'EXPIRED', 'SUSPENDED', 'CANCELLED', 'PENDING_RENEWAL'))
);

CREATE TABLE IF NOT EXISTS epr_registration_material_scopes (
  id SERIAL PRIMARY KEY,
  epr_registration_id INTEGER NOT NULL REFERENCES epr_registrations(id) ON DELETE CASCADE,
  material_category_id INTEGER NOT NULL REFERENCES cpcb_material_category_master(id),
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (epr_registration_id, material_category_id)
);

CREATE TABLE IF NOT EXISTS epr_registration_state_scopes (
  id SERIAL PRIMARY KEY,
  epr_registration_id INTEGER NOT NULL REFERENCES epr_registrations(id) ON DELETE CASCADE,
  india_state_id INTEGER NOT NULL REFERENCES india_state_master(id),
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  UNIQUE (epr_registration_id, india_state_id)
);

CREATE TABLE IF NOT EXISTS epr_annual_obligations (
  id SERIAL PRIMARY KEY,
  epr_registration_id INTEGER NOT NULL REFERENCES epr_registrations(id) ON DELETE CASCADE,
  obligation_year VARCHAR(9) NOT NULL,
  material_category_id INTEGER NOT NULL REFERENCES cpcb_material_category_master(id),
  target_quantity_mt DECIMAL(14,3) NOT NULL,
  carry_forward_mt DECIMAL(14,3) NOT NULL DEFAULT 0,
  total_obligation_mt DECIMAL(14,3) GENERATED ALWAYS AS (target_quantity_mt + carry_forward_mt) STORED,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_epr_obligation_year CHECK (obligation_year ~ '^[0-9]{4}-[0-9]{2}$'),
  CONSTRAINT chk_epr_obligation_target CHECK (target_quantity_mt >= 0),
  CONSTRAINT chk_epr_obligation_carry CHECK (carry_forward_mt >= 0),
  UNIQUE (epr_registration_id, obligation_year, material_category_id)
);

CREATE TABLE IF NOT EXISTS epr_recycling_certificates (
  id SERIAL PRIMARY KEY,
  certificate_number VARCHAR(100) NOT NULL UNIQUE,
  issuer_party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE RESTRICT,
  beneficiary_party_id INTEGER NOT NULL REFERENCES party_master(id) ON DELETE RESTRICT,
  material_category_id INTEGER NOT NULL REFERENCES cpcb_material_category_master(id),
  certificate_quantity_mt DECIMAL(14,3) NOT NULL,
  issue_date DATE NOT NULL,
  valid_from DATE,
  valid_to DATE,
  status_code VARCHAR(30) NOT NULL DEFAULT 'ACTIVE',
  evidence_attachment_id INTEGER REFERENCES document_attachments(id) ON DELETE SET NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_epr_cert_status CHECK (status_code IN ('ACTIVE', 'PARTIALLY_UTILIZED', 'FULLY_UTILIZED', 'EXPIRED', 'CANCELLED')),
  CONSTRAINT chk_epr_cert_qty CHECK (certificate_quantity_mt > 0)
);

CREATE TABLE IF NOT EXISTS epr_certificate_allocations (
  id SERIAL PRIMARY KEY,
  certificate_id INTEGER NOT NULL REFERENCES epr_recycling_certificates(id) ON DELETE CASCADE,
  epr_obligation_id INTEGER NOT NULL REFERENCES epr_annual_obligations(id) ON DELETE CASCADE,
  allocated_quantity_mt DECIMAL(14,3) NOT NULL,
  allocation_date DATE NOT NULL DEFAULT CURRENT_DATE,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_epr_alloc_qty CHECK (allocated_quantity_mt > 0),
  UNIQUE (certificate_id, epr_obligation_id, allocation_date)
);

CREATE INDEX IF NOT EXISTS idx_epr_alloc_obligation
  ON epr_certificate_allocations(epr_obligation_id);

CREATE TABLE IF NOT EXISTS epr_filing_events (
  id SERIAL PRIMARY KEY,
  epr_registration_id INTEGER NOT NULL REFERENCES epr_registrations(id) ON DELETE CASCADE,
  filing_period VARCHAR(30) NOT NULL,
  filing_type VARCHAR(40) NOT NULL,
  filing_status VARCHAR(30) NOT NULL,
  acknowledgement_number VARCHAR(120),
  submitted_on TIMESTAMP WITHOUT TIME ZONE,
  due_on DATE,
  filing_payload JSONB,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_epr_filing_type CHECK (filing_type IN ('QUARTERLY', 'ANNUAL', 'AMENDMENT', 'RETURN')),
  CONSTRAINT chk_epr_filing_status CHECK (filing_status IN ('DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED'))
);

CREATE TABLE IF NOT EXISTS epr_brand_compliance_links (
  id SERIAL PRIMARY KEY,
  epr_registration_id INTEGER NOT NULL REFERENCES epr_registrations(id) ON DELETE CASCADE,
  brand_authorization_id INTEGER NOT NULL REFERENCES epr_brand_authorizations(id) ON DELETE CASCADE,
  obligation_year VARCHAR(9) NOT NULL,
  created_at TIMESTAMP WITHOUT TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT chk_epr_brand_compliance_year CHECK (obligation_year ~ '^[0-9]{4}-[0-9]{2}$'),
  UNIQUE (epr_registration_id, brand_authorization_id, obligation_year)
);

-- Validate category consistency and prevent over-allocation of certificates.
CREATE OR REPLACE FUNCTION fn_epr_validate_certificate_allocation()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_certificate_qty DECIMAL(14,3);
  v_certificate_material_id INTEGER;
  v_obligation_material_id INTEGER;
  v_existing_alloc DECIMAL(14,3);
BEGIN
  SELECT certificate_quantity_mt, material_category_id
  INTO v_certificate_qty, v_certificate_material_id
  FROM epr_recycling_certificates
  WHERE id = NEW.certificate_id;

  IF v_certificate_qty IS NULL THEN
    RAISE EXCEPTION 'Certificate % does not exist', NEW.certificate_id;
  END IF;

  SELECT material_category_id
  INTO v_obligation_material_id
  FROM epr_annual_obligations
  WHERE id = NEW.epr_obligation_id;

  IF v_obligation_material_id IS NULL THEN
    RAISE EXCEPTION 'Obligation % does not exist', NEW.epr_obligation_id;
  END IF;

  IF v_certificate_material_id <> v_obligation_material_id THEN
    RAISE EXCEPTION 'Material category mismatch between certificate % and obligation %', NEW.certificate_id, NEW.epr_obligation_id;
  END IF;

  SELECT COALESCE(SUM(allocated_quantity_mt), 0)
  INTO v_existing_alloc
  FROM epr_certificate_allocations
  WHERE certificate_id = NEW.certificate_id
    AND id <> COALESCE(NEW.id, -1);

  IF (v_existing_alloc + NEW.allocated_quantity_mt) > v_certificate_qty THEN
    RAISE EXCEPTION 'Allocated quantity %.3f exceeds certificate %.3f for certificate %',
      (v_existing_alloc + NEW.allocated_quantity_mt), v_certificate_qty, NEW.certificate_id;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_epr_validate_certificate_allocation ON epr_certificate_allocations;
CREATE TRIGGER trg_epr_validate_certificate_allocation
BEFORE INSERT OR UPDATE ON epr_certificate_allocations
FOR EACH ROW
EXECUTE FUNCTION fn_epr_validate_certificate_allocation();

CREATE OR REPLACE FUNCTION fn_epr_refresh_certificate_status(p_certificate_id INTEGER)
RETURNS VOID
LANGUAGE plpgsql
AS $$
DECLARE
  v_certificate_qty DECIMAL(14,3);
  v_allocated_qty DECIMAL(14,3);
  v_next_status VARCHAR(30);
BEGIN
  SELECT certificate_quantity_mt
  INTO v_certificate_qty
  FROM epr_recycling_certificates
  WHERE id = p_certificate_id;

  IF v_certificate_qty IS NULL THEN
    RETURN;
  END IF;

  SELECT COALESCE(SUM(allocated_quantity_mt), 0)
  INTO v_allocated_qty
  FROM epr_certificate_allocations
  WHERE certificate_id = p_certificate_id;

  IF v_allocated_qty <= 0 THEN
    v_next_status := 'ACTIVE';
  ELSIF v_allocated_qty < v_certificate_qty THEN
    v_next_status := 'PARTIALLY_UTILIZED';
  ELSE
    v_next_status := 'FULLY_UTILIZED';
  END IF;

  UPDATE epr_recycling_certificates
  SET status_code = v_next_status
  WHERE id = p_certificate_id
    AND status_code <> v_next_status;
END;
$$;

CREATE OR REPLACE FUNCTION fn_epr_apply_certificate_status_change()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'DELETE' THEN
    PERFORM fn_epr_refresh_certificate_status(OLD.certificate_id);
  ELSE
    PERFORM fn_epr_refresh_certificate_status(NEW.certificate_id);
    IF TG_OP = 'UPDATE' AND NEW.certificate_id <> OLD.certificate_id THEN
      PERFORM fn_epr_refresh_certificate_status(OLD.certificate_id);
    END IF;
  END IF;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_epr_apply_certificate_status_change ON epr_certificate_allocations;
CREATE TRIGGER trg_epr_apply_certificate_status_change
AFTER INSERT OR UPDATE OR DELETE ON epr_certificate_allocations
FOR EACH ROW
EXECUTE FUNCTION fn_epr_apply_certificate_status_change();

-- Ensure compliance link year is covered by authorization period and registrant party.
CREATE OR REPLACE FUNCTION fn_epr_validate_brand_compliance_link()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
DECLARE
  v_auth_start DATE;
  v_auth_end DATE;
  v_authorized_party_id INTEGER;
  v_registrant_party_id INTEGER;
  v_year_start INTEGER;
  v_fy_start DATE;
  v_fy_end DATE;
BEGIN
  SELECT start_date, end_date, authorized_party_id
  INTO v_auth_start, v_auth_end, v_authorized_party_id
  FROM epr_brand_authorizations
  WHERE id = NEW.brand_authorization_id;

  IF v_auth_start IS NULL THEN
    RAISE EXCEPTION 'Brand authorization % does not exist', NEW.brand_authorization_id;
  END IF;

  SELECT registrant_party_id
  INTO v_registrant_party_id
  FROM epr_registrations
  WHERE id = NEW.epr_registration_id;

  IF v_registrant_party_id IS NULL THEN
    RAISE EXCEPTION 'EPR registration % does not exist', NEW.epr_registration_id;
  END IF;

  IF v_registrant_party_id <> v_authorized_party_id THEN
    RAISE EXCEPTION 'Registrant party % must match authorized party % for brand authorization %',
      v_registrant_party_id, v_authorized_party_id, NEW.brand_authorization_id;
  END IF;

  v_year_start := SUBSTRING(NEW.obligation_year FROM 1 FOR 4)::INTEGER;
  v_fy_start := MAKE_DATE(v_year_start, 4, 1);
  v_fy_end := MAKE_DATE(v_year_start + 1, 3, 31);

  IF COALESCE(v_auth_end, DATE '2999-12-31') < v_fy_start OR v_auth_start > v_fy_end THEN
    RAISE EXCEPTION 'Brand authorization % is not valid for obligation year %',
      NEW.brand_authorization_id, NEW.obligation_year;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_epr_validate_brand_compliance_link ON epr_brand_compliance_links;
CREATE TRIGGER trg_epr_validate_brand_compliance_link
BEFORE INSERT OR UPDATE ON epr_brand_compliance_links
FOR EACH ROW
EXECUTE FUNCTION fn_epr_validate_brand_compliance_link();

COMMIT;
