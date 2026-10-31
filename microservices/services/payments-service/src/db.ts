import { Pool, PoolClient } from 'pg';
import { logger } from '@logikchain/common';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/payments_db',
  max: 20,
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS payment_intents (
        intent_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        buyer_id VARCHAR(64),
        buyer_vpa VARCHAR(128),
        amount NUMERIC(12, 2) NOT NULL,
        currency VARCHAR(8) NOT NULL DEFAULT 'INR',
        status VARCHAR(32) NOT NULL DEFAULT 'CREATED',
        upi_link TEXT,
        qr_string TEXT,
        gateway_txn_id VARCHAR(128),
        psp_reference VARCHAR(128),
        idempotency_key VARCHAR(128),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_payment_intents_order ON payment_intents(order_id);
      CREATE INDEX IF NOT EXISTS idx_payment_intents_idempotency ON payment_intents(idempotency_key);

      CREATE TABLE IF NOT EXISTS payment_refunds (
        refund_id VARCHAR(64) PRIMARY KEY,
        payment_id VARCHAR(64) NOT NULL,
        order_id VARCHAR(64) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        reason TEXT,
        status VARCHAR(32) NOT NULL DEFAULT 'PROCESSED',
        credit_note_number VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_payment_refunds_payment ON payment_refunds(payment_id);

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

      CREATE INDEX IF NOT EXISTS idx_payments_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
    `);
    logger.info('Payments database initialized successfully');
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
    'payments-service',
    params.aggregateType,
    params.aggregateId,
    params.operation,
    JSON.stringify(params.payload),
    params.firestoreCollection,
    params.firestoreDocId,
  ]);
}
