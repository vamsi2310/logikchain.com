import { Pool, PoolClient } from 'pg';
import { logger } from '@logikchain/common';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/pamphlet_db',
  max: 20,
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS gig_pamphlets (
        pamphlet_id VARCHAR(128) PRIMARY KEY,
        gig_id VARCHAR(128) NOT NULL UNIQUE,
        vehicle_id VARCHAR(64) NOT NULL,
        supplier_id VARCHAR(64) NOT NULL,
        start_datetime TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status VARCHAR(32) NOT NULL DEFAULT 'DRAFT',
        rolling_stock JSONB NOT NULL DEFAULT '[]'::jsonb,
        pre_booked_orders JSONB NOT NULL DEFAULT '[]'::jsonb,
        loaded_items JSONB NOT NULL DEFAULT '[]'::jsonb,
        unloaded_items JSONB NOT NULL DEFAULT '[]'::jsonb,
        total_cargo_value NUMERIC(12, 2) DEFAULT 0,
        gate_seal JSONB,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS damage_claims (
        claim_id VARCHAR(128) PRIMARY KEY,
        pamphlet_id VARCHAR(128) NOT NULL,
        sku_id VARCHAR(64) NOT NULL,
        damaged_qty INT NOT NULL,
        unit_price NUMERIC(10, 2) DEFAULT 0,
        total_damaged_value NUMERIC(10, 2) DEFAULT 0,
        reason VARCHAR(128) NOT NULL,
        photo_url TEXT,
        claim_status VARCHAR(32) NOT NULL DEFAULT 'PENDING',
        liability VARCHAR(32),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

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

      CREATE INDEX IF NOT EXISTS idx_pamphlets_gig ON gig_pamphlets(gig_id);
      CREATE INDEX IF NOT EXISTS idx_pamphlets_supplier ON gig_pamphlets(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_claims_pamphlet ON damage_claims(pamphlet_id);
      CREATE INDEX IF NOT EXISTS idx_pamphlet_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
    `);
    logger.info('Pamphlet database initialized successfully');
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
    'pamphlet-service',
    params.aggregateType,
    params.aggregateId,
    params.operation,
    JSON.stringify(params.payload),
    params.firestoreCollection,
    params.firestoreDocId,
  ]);
}
