"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.initDb = initDb;
exports.recordOutbox = recordOutbox;
const pg_1 = require("pg");
const common_1 = require("@logikchain/common");
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/finance_db',
    max: 20,
});
async function initDb() {
    const client = await exports.pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS reconciliation_runs (
        run_id VARCHAR(64) PRIMARY KEY,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS',
        total_transactions INT DEFAULT 0,
        unmatched_count INT DEFAULT 0,
        discrepancies JSONB DEFAULT '[]'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tds_challans (
        challan_id VARCHAR(64) PRIMARY KEY,
        tax_period VARCHAR(16) NOT NULL,
        bsr_code VARCHAR(16) NOT NULL,
        challan_number VARCHAR(32) NOT NULL,
        amount NUMERIC(12, 2) NOT NULL,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

      CREATE INDEX IF NOT EXISTS idx_finance_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
    `);
        common_1.logger.info('Finance database initialized');
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
        'finance-service',
        params.aggregateType,
        params.aggregateId,
        params.operation,
        JSON.stringify(params.payload),
        params.firestoreCollection,
        params.firestoreDocId,
    ]);
}
