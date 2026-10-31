import { Pool, PoolClient } from 'pg';
import { logger } from '@logikchain/common';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/credit_db',
  max: 20,
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS merchant_credit_profiles (
        merchant_id VARCHAR(64) NOT NULL,
        supplier_id VARCHAR(64) NOT NULL,
        credit_limit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        utilized_credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        available_credit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        terms_cycle_days INT NOT NULL DEFAULT 14,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        provisional_policy VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        PRIMARY KEY (merchant_id, supplier_id)
      );

      CREATE INDEX IF NOT EXISTS idx_credit_profiles_merchant ON merchant_credit_profiles(merchant_id);
      CREATE INDEX IF NOT EXISTS idx_credit_profiles_supplier ON merchant_credit_profiles(supplier_id);

      CREATE TABLE IF NOT EXISTS credit_holds (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id VARCHAR(64) NOT NULL,
        supplier_id VARCHAR(64) NOT NULL,
        order_id VARCHAR(64) NOT NULL,
        hold_amount NUMERIC(12, 2) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '1 hour'),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_credit_holds_order ON credit_holds(order_id);
      CREATE INDEX IF NOT EXISTS idx_credit_holds_merchant_supplier ON credit_holds(merchant_id, supplier_id);

      CREATE TABLE IF NOT EXISTS credit_repayments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id VARCHAR(64) NOT NULL,
        supplier_id VARCHAR(64) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        repayment_channel VARCHAR(32) NOT NULL DEFAULT 'CASH',
        driver_id VARCHAR(64),
        gig_id VARCHAR(64),
        reference_id VARCHAR(128),
        notes TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'CONFIRMED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_credit_repayments_merchant ON credit_repayments(merchant_id);

      CREATE TABLE IF NOT EXISTS credit_increase_requests (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id VARCHAR(64) NOT NULL,
        supplier_id VARCHAR(64) NOT NULL,
        requested_limit NUMERIC(12, 2) NOT NULL,
        current_limit NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        reason TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        reviewed_by VARCHAR(64),
        review_notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reviewed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS credit_disputes (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id VARCHAR(64) NOT NULL,
        supplier_id VARCHAR(64) NOT NULL,
        reason TEXT NOT NULL,
        disputed_amount NUMERIC(12, 2),
        status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        resolved_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS credit_relief_plans (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id VARCHAR(64) NOT NULL,
        supplier_id VARCHAR(64) NOT NULL,
        relief_type VARCHAR(32) NOT NULL DEFAULT 'GRACE_EXTENSION',
        extended_days INT NOT NULL DEFAULT 14,
        waived_penalties NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        notes TEXT,
        approved_by VARCHAR(64) NOT NULL DEFAULT 'SYSTEM_OPS',
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_credit_relief_merchant ON credit_relief_plans(merchant_id);

      CREATE TABLE IF NOT EXISTS credit_agreements (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        merchant_id VARCHAR(64) NOT NULL,
        supplier_id VARCHAR(64) NOT NULL,
        terms_version VARCHAR(32) NOT NULL DEFAULT 'v1.0',
        cycle_days INT NOT NULL DEFAULT 14,
        interest_rate_pct NUMERIC(5, 2) NOT NULL DEFAULT 0.00,
        accepted_by VARCHAR(64) NOT NULL,
        accepted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_credit_agreements_merchant ON credit_agreements(merchant_id, supplier_id);

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

      CREATE INDEX IF NOT EXISTS idx_credit_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
    `);
    logger.info('Credit database schema initialized successfully');
  } finally {
    client.release();
  }
}

export async function recordOutbox(
  client: PoolClient | Pool,
  params: {
    aggregateType: string;
    aggregateId: string;
    operation: 'INSERT' | 'UPDATE' | 'DELETE';
    payload: Record<string, unknown>;
    firestoreCollection: string;
    firestoreDocId: string;
  }
): Promise<void> {
  const query = `
    INSERT INTO outbox_events (
      service, aggregate_type, aggregate_id, operation, payload, firestore_collection, firestore_doc_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
  await client.query(query, [
    'credit-service',
    params.aggregateType,
    params.aggregateId,
    params.operation,
    JSON.stringify(params.payload),
    params.firestoreCollection,
    params.firestoreDocId,
  ]);
}
