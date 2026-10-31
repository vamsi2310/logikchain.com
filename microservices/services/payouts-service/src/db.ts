import { Pool, PoolClient } from 'pg';
import { logger } from '@logikchain/common';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/payouts_db',
  max: 20,
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- Registered Bank Beneficiaries with KMS Account Encryption (FEAT-06.01)
      CREATE TABLE IF NOT EXISTS payout_beneficiaries (
        beneficiary_id VARCHAR(64) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        recipient_type VARCHAR(32) NOT NULL DEFAULT 'DRIVER',
        account_holder_name VARCHAR(128) NOT NULL,
        account_number_encrypted TEXT NOT NULL,
        ifsc_code_encrypted TEXT NOT NULL,
        masked_account VARCHAR(32) NOT NULL,
        masked_ifsc VARCHAR(16) NOT NULL,
        penny_drop_status VARCHAR(32) NOT NULL DEFAULT 'VERIFIED',
        penny_drop_reference VARCHAR(64),
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_payout_beneficiaries_user ON payout_beneficiaries(user_id);

      -- Payout Requests & Review Workflow (FEAT-06.02)
      CREATE TABLE IF NOT EXISTS payout_requests (
        payout_id VARCHAR(64) PRIMARY KEY,
        beneficiary_id VARCHAR(64) NOT NULL,
        recipient_id VARCHAR(64) NOT NULL,
        recipient_type VARCHAR(32) NOT NULL DEFAULT 'DRIVER',
        amount NUMERIC(12, 2) NOT NULL,
        tds_rate NUMERIC(5, 2) NOT NULL DEFAULT 1.00,
        tds_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        net_amount NUMERIC(12, 2) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'REQUESTED',
        remarks TEXT,
        reviewed_by VARCHAR(64),
        reviewed_at TIMESTAMPTZ,
        encrypted_account_details TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_payout_requests_recipient ON payout_requests(recipient_id);
      CREATE INDEX IF NOT EXISTS idx_payout_requests_status ON payout_requests(status);

      -- Bank Settlement & Cloud Tasks IMPS UTR Execution (FEAT-06.03)
      CREATE TABLE IF NOT EXISTS payout_settlements (
        settlement_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        payout_id VARCHAR(64) NOT NULL REFERENCES payout_requests(payout_id),
        bank_utr VARCHAR(64) NOT NULL,
        disbursed_amount NUMERIC(12, 2) NOT NULL,
        gateway_reference VARCHAR(64) NOT NULL,
        disbursed_channel VARCHAR(32) NOT NULL DEFAULT 'IMPS',
        settled_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_payout_settlements_payout ON payout_settlements(payout_id);
      CREATE INDEX IF NOT EXISTS idx_payout_settlements_utr ON payout_settlements(bank_utr);

      -- Supplier Funds & Escrow Allocation Ledger (FEAT-06.04)
      CREATE TABLE IF NOT EXISTS supplier_funds_ledger (
        entry_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id VARCHAR(64) NOT NULL,
        gross_inflow NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        merchant_allocation NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        driver_allocation NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        platform_fee NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        net_available NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        withdrawn_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_supplier_funds_supplier ON supplier_funds_ledger(supplier_id);

      -- Transactional Outbox for CDC Sync
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

      CREATE INDEX IF NOT EXISTS idx_payouts_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
    `);
    logger.info('Payouts database schema initialized successfully (EPIC-06)');
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
    'payouts-service',
    params.aggregateType,
    params.aggregateId,
    params.operation,
    JSON.stringify(params.payload),
    params.firestoreCollection,
    params.firestoreDocId,
  ]);
}
