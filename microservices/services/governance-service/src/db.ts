import { Pool, PoolClient } from 'pg';
import { logger } from '@logikchain/common';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/governance_db',
  max: 20,
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- UPI TPAP VPA Registry (FEAT-11.01)
      CREATE TABLE IF NOT EXISTS upi_vpa_registry (
        vpa VARCHAR(128) PRIMARY KEY,
        user_id VARCHAR(64) NOT NULL,
        psp_handle VARCHAR(64) NOT NULL DEFAULT 'okhdfcbank',
        bank_account_linked BOOLEAN NOT NULL DEFAULT true,
        device_fingerprint VARCHAR(128),
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        compliance_certified BOOLEAN NOT NULL DEFAULT true,
        blacklisted_reason TEXT,
        linked_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_vpa_registry_user ON upi_vpa_registry(user_id);
      CREATE INDEX IF NOT EXISTS idx_vpa_registry_status ON upi_vpa_registry(status);

      -- Known Fraudulent VPA Blacklist (FEAT-11.01)
      CREATE TABLE IF NOT EXISTS vpa_blacklist (
        vpa_pattern VARCHAR(128) PRIMARY KEY,
        reason TEXT NOT NULL,
        category VARCHAR(64) NOT NULL DEFAULT 'NATIONAL_FRAUD_REGISTRY',
        added_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Seed sample blacklisted handles if not present
      INSERT INTO vpa_blacklist (vpa_pattern, reason, category)
      VALUES 
        ('fraud_merchant@upi', 'Identified in multi-state phishing ring', 'NPCI_CIRCULAR_ALERT'),
        ('scam_account@icici', 'Fake agricultural seeds supplier spoof', 'STATE_CYBER_CRIME'),
        ('phishing_payout@okhdfcbank', 'Driver mule account fraud', 'INTERNAL_SECURITY')
      ON CONFLICT (vpa_pattern) DO NOTHING;

      -- AML Transaction Velocity Records (FEAT-11.02)
      CREATE TABLE IF NOT EXISTS aml_velocity_records (
        record_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(64) NOT NULL,
        transaction_type VARCHAR(32) NOT NULL DEFAULT 'PAYMENT',
        amount NUMERIC(12, 2) NOT NULL,
        vpa VARCHAR(128),
        geo_cell VARCHAR(64),
        device_fingerprint VARCHAR(128),
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_aml_velocity_user_time ON aml_velocity_records(user_id, timestamp);

      -- Real-Time AML Fraud Alerts (FEAT-11.02)
      CREATE TABLE IF NOT EXISTS aml_alerts (
        alert_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(64) NOT NULL,
        risk_score INT NOT NULL,
        decision VARCHAR(32) NOT NULL,
        flags JSONB NOT NULL DEFAULT '[]'::jsonb,
        status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
        notes TEXT,
        resolved_by VARCHAR(64),
        resolved_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_aml_alerts_user ON aml_alerts(user_id);
      CREATE INDEX IF NOT EXISTS idx_aml_alerts_status ON aml_alerts(status);

      -- Support-as-Supplier Proxy Audit Trail (FEAT-11.02, US-11.02.02)
      CREATE TABLE IF NOT EXISTS proxy_audit_trail (
        audit_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        operator_uid VARCHAR(64) NOT NULL,
        target_supplier_id VARCHAR(64) NOT NULL,
        grant_id VARCHAR(64) NOT NULL,
        action VARCHAR(64) NOT NULL,
        payload_hash VARCHAR(128) NOT NULL,
        client_ip VARCHAR(64) NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_proxy_audit_operator ON proxy_audit_trail(operator_uid);
      CREATE INDEX IF NOT EXISTS idx_proxy_audit_target ON proxy_audit_trail(target_supplier_id);

      -- NPCI T+1 Dispute SLA Tracking (FEAT-11.03)
      CREATE TABLE IF NOT EXISTS dispute_sla (
        dispute_id VARCHAR(64) PRIMARY KEY,
        transaction_id VARCHAR(64) NOT NULL,
        user_id VARCHAR(64) NOT NULL,
        vpa VARCHAR(128),
        amount NUMERIC(12, 2) NOT NULL,
        reason TEXT NOT NULL,
        received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        sla_deadline TIMESTAMPTZ NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'OPEN',
        resolution_outcome VARCHAR(32),
        resolution_notes TEXT,
        resolved_by VARCHAR(64),
        resolved_at TIMESTAMPTZ,
        sla_breached BOOLEAN NOT NULL DEFAULT false,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_dispute_sla_status ON dispute_sla(status);
      CREATE INDEX IF NOT EXISTS idx_dispute_sla_deadline ON dispute_sla(sla_deadline);

      -- NPCI Regulatory Daily Reports (FEAT-11.03)
      CREATE TABLE IF NOT EXISTS npci_regulatory_reports (
        report_id VARCHAR(64) PRIMARY KEY,
        report_date DATE NOT NULL,
        total_disputes INT NOT NULL DEFAULT 0,
        resolved_within_sla INT NOT NULL DEFAULT 0,
        breached_count INT NOT NULL DEFAULT 0,
        compliance_ratio NUMERIC(5, 2) NOT NULL DEFAULT 100.00,
        report_payload JSONB NOT NULL,
        generated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Versioned Legal Policies & Clickwrap Consents (FEAT-11.04)
      CREATE TABLE IF NOT EXISTS policy_consents (
        consent_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(64) NOT NULL,
        role VARCHAR(32) NOT NULL,
        policy_id VARCHAR(64) NOT NULL,
        policy_version VARCHAR(16) NOT NULL,
        policy_version_hash VARCHAR(128) NOT NULL,
        consented_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        ip_address VARCHAR(64),
        user_agent TEXT,
        client_runtime VARCHAR(32) DEFAULT 'web'
      );

      CREATE INDEX IF NOT EXISTS idx_policy_consents_user ON policy_consents(user_id);
      CREATE INDEX IF NOT EXISTS idx_policy_consents_policy ON policy_consents(policy_id, policy_version);

      -- Canonical Audit Log (FEAT-11.01)
      CREATE TABLE IF NOT EXISTS audit_logs (
        event_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        actor_id VARCHAR(64) NOT NULL,
        action VARCHAR(64) NOT NULL,
        target_entity VARCHAR(64) NOT NULL,
        target_id VARCHAR(64) NOT NULL,
        metadata JSONB NOT NULL,
        timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Transactional Outbox for CDC Sync (EPIC-12)
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

      CREATE INDEX IF NOT EXISTS idx_governance_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
    `);
    logger.info('Governance database schema initialized successfully (EPIC-11)');
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
    'governance-service',
    params.aggregateType,
    params.aggregateId,
    params.operation,
    JSON.stringify(params.payload),
    params.firestoreCollection,
    params.firestoreDocId,
  ]);
}
