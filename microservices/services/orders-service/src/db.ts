import { Pool, PoolClient } from 'pg';
import { logger } from '@logikchain/common';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/orders_db',
  max: 20,
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS orders (
        order_id VARCHAR(64) PRIMARY KEY,
        buyer_id VARCHAR(64) NOT NULL,
        merchant_id VARCHAR(64),
        supplier_id VARCHAR(64),
        gig_id VARCHAR(64),
        status VARCHAR(32) NOT NULL,
        payment_type VARCHAR(32) NOT NULL,
        total_amount NUMERIC(12, 2) NOT NULL,
        items JSONB NOT NULL,
        delivery_address JSONB NOT NULL DEFAULT '{}'::jsonb,
        credit_hold_id VARCHAR(64),
        payment_intent_id VARCHAR(64),
        departure_manifest JSONB,
        dispatched_at TIMESTAMPTZ,
        handover_otp VARCHAR(16),
        delivered_at TIMESTAMPTZ,
        idempotency_key VARCHAR(128) UNIQUE,
        captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_handovers (
        handover_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        driver_id VARCHAR(64) NOT NULL,
        otp_code VARCHAR(16) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        verified_at TIMESTAMPTZ,
        signature_pod TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_returns (
        return_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        buyer_id VARCHAR(64) NOT NULL,
        reason VARCHAR(64) NOT NULL,
        line_items JSONB NOT NULL DEFAULT '[]'::jsonb,
        refund_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        status VARCHAR(32) NOT NULL DEFAULT 'INITIATED',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_rtos (
        rto_id VARCHAR(64) PRIMARY KEY,
        order_id VARCHAR(64) NOT NULL,
        merchant_id VARCHAR(64),
        supplier_id VARCHAR(64),
        trigger_reason VARCHAR(64) NOT NULL DEFAULT '72_HOUR_EXPIRATION',
        retention_hours INT NOT NULL DEFAULT 72,
        status VARCHAR(32) NOT NULL DEFAULT 'RTO_INITIATED',
        reverse_gig_id VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_order_returns_order ON order_returns(order_id);
      CREATE INDEX IF NOT EXISTS idx_order_rtos_order ON order_rtos(order_id);

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

      CREATE INDEX IF NOT EXISTS idx_orders_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
      CREATE INDEX IF NOT EXISTS idx_orders_storage_pending ON storage_sync_events(created_at) WHERE sync_status = 'PENDING';
      CREATE INDEX IF NOT EXISTS idx_order_handovers_order ON order_handovers(order_id);
    `);
    logger.info('Orders database initialized with order_handovers, outbox & storage sync tables');
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
    'orders-service',
    params.aggregateType,
    params.aggregateId,
    params.operation,
    JSON.stringify(params.payload),
    params.firestoreCollection,
    params.firestoreDocId,
  ]);
}
