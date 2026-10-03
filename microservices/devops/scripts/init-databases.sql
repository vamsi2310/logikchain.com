-- PostgreSQL Database-Per-Service Initialization Script
-- Executed automatically on container boot via /docker-entrypoint-initdb.d/

CREATE DATABASE identity_db;
CREATE DATABASE orders_db;
CREATE DATABASE gigs_db;
CREATE DATABASE pamphlet_db;
CREATE DATABASE payments_db;
CREATE DATABASE payouts_db;
CREATE DATABASE cash_db;
CREATE DATABASE credit_db;
CREATE DATABASE finance_db;
CREATE DATABASE config_db;
CREATE DATABASE governance_db;
CREATE DATABASE social_connect_db;
CREATE DATABASE sync_db;

-- Grant privileges to default user
GRANT ALL PRIVILEGES ON DATABASE identity_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE orders_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE gigs_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE pamphlet_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE payments_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE payouts_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE cash_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE credit_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE finance_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE config_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE governance_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE social_connect_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE sync_db TO postgres;

\connect sync_db;

CREATE TABLE IF NOT EXISTS outbox_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(64) NOT NULL,
  aggregate_type VARCHAR(64) NOT NULL,
  aggregate_id VARCHAR(64) NOT NULL,
  operation VARCHAR(16) NOT NULL,
  payload JSONB NOT NULL,
  firestore_collection VARCHAR(64) NOT NULL,
  firestore_doc_id VARCHAR(64) NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ,
  sync_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  retry_count INT NOT NULL DEFAULT 0,
  last_error TEXT
);

CREATE TABLE IF NOT EXISTS storage_sync_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  service VARCHAR(64) NOT NULL,
  bucket_name VARCHAR(128) NOT NULL,
  storage_path VARCHAR(256) NOT NULL,
  mime_type VARCHAR(64) NOT NULL,
  metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
  file_data_base64 TEXT,
  operation VARCHAR(16) NOT NULL DEFAULT 'UPLOAD',
  sync_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  synced_at TIMESTAMPTZ
);

CREATE TABLE IF NOT EXISTS inbound_firestore_events (
  collection VARCHAR(64) NOT NULL,
  doc_id VARCHAR(64) NOT NULL,
  payload JSONB NOT NULL,
  received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (collection, doc_id)
);
