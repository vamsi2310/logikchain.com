"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.initDb = initDb;
exports.recordOutbox = recordOutbox;
const pg_1 = require("pg");
const common_1 = require("@logikchain/common");
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/cash_db',
    max: 20,
});
async function initDb() {
    const client = await exports.pool.connect();
    try {
        await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- Driver physical cash custody ledger (FEAT-07.01)
      CREATE TABLE IF NOT EXISTS driver_custody (
        driver_id VARCHAR(64) PRIMARY KEY,
        active_balance NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        total_collected NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        total_handed_over NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        daily_collection_ceiling NUMERIC(12, 2) NOT NULL DEFAULT 50000.00,
        is_locked BOOLEAN NOT NULL DEFAULT false,
        lock_reason TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- CoD and credit cash collection records (FEAT-07.01)
      CREATE TABLE IF NOT EXISTS cash_collections (
        collection_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id VARCHAR(64) NOT NULL,
        order_id VARCHAR(64) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        collection_type VARCHAR(32) NOT NULL DEFAULT 'COD',
        captured_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        idempotency_key VARCHAR(128) UNIQUE,
        notes TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_cash_collections_driver ON cash_collections(driver_id);
      CREATE INDEX IF NOT EXISTS idx_cash_collections_order ON cash_collections(order_id);

      -- Driver-to-cashier handover declarations and OTP verification (FEAT-07.02)
      CREATE TABLE IF NOT EXISTS cash_handovers (
        handover_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id VARCHAR(64) NOT NULL,
        recipient_id VARCHAR(64) NOT NULL,
        declared_amount NUMERIC(12, 2) NOT NULL,
        received_amount NUMERIC(12, 2),
        status VARCHAR(32) NOT NULL DEFAULT 'DECLARED',
        verification_code VARCHAR(16) NOT NULL,
        code_expires_at TIMESTAMPTZ NOT NULL DEFAULT (NOW() + INTERVAL '15 minutes'),
        idempotency_key VARCHAR(128) UNIQUE,
        confirmed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_cash_handovers_driver ON cash_handovers(driver_id);
      CREATE INDEX IF NOT EXISTS idx_cash_handovers_recipient ON cash_handovers(recipient_id);

      -- Cash discrepancy reports and resolution audits (FEAT-07.03)
      CREATE TABLE IF NOT EXISTS cash_discrepancies (
        discrepancy_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id VARCHAR(64) NOT NULL,
        cashier_id VARCHAR(64) NOT NULL,
        handover_id UUID REFERENCES cash_handovers(handover_id),
        declared_amount NUMERIC(12, 2) NOT NULL,
        counted_amount NUMERIC(12, 2) NOT NULL,
        shortfall_amount NUMERIC(12, 2) NOT NULL,
        reason VARCHAR(64) NOT NULL DEFAULT 'CASH_SHORTFALL',
        status VARCHAR(32) NOT NULL DEFAULT 'UNDER_REVIEW',
        notes TEXT,
        resolution_notes TEXT,
        resolved_by VARCHAR(64),
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_cash_discrepancies_driver ON cash_discrepancies(driver_id);
      CREATE INDEX IF NOT EXISTS idx_cash_discrepancies_status ON cash_discrepancies(status);

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

      CREATE INDEX IF NOT EXISTS idx_cash_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
    `);
        common_1.logger.info('Cash database schema initialized successfully (EPIC-07)');
    }
    finally {
        client.release();
    }
}
async function recordOutbox(client, params) {
    const query = `
    INSERT INTO outbox_events (
      service, aggregate_type, aggregate_id, operation, payload, firestore_collection, firestore_doc_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `;
    await client.query(query, [
        'cash-service',
        params.aggregateType,
        params.aggregateId,
        params.operation,
        JSON.stringify(params.payload),
        params.firestoreCollection,
        params.firestoreDocId,
    ]);
}
