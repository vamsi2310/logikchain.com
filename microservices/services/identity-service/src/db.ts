import { Pool, PoolClient } from 'pg';
import { logger } from '@logikchain/common';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/identity_db',
  max: 20,
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      -- 1. User Profiles (EPIC-01 Core User State & KYC)
      CREATE TABLE IF NOT EXISTS user_profiles (
        user_id VARCHAR(64) PRIMARY KEY,
        phone_number VARCHAR(32),
        email VARCHAR(128),
        display_name VARCHAR(128),
        role VARCHAR(32) NOT NULL DEFAULT 'buyer',
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        official_client VARCHAR(32) DEFAULT 'pwa',
        village_id VARCHAR(64),
        selected_merchant_id VARCHAR(64),
        supplier_id VARCHAR(64),
        locale VARCHAR(16) DEFAULT 'en',
        photo_url TEXT,
        setup_incomplete BOOLEAN DEFAULT true,
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        device_tokens TEXT[] DEFAULT ARRAY[]::TEXT[],
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Add missing columns if user_profiles table already existed with older schema
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS official_client VARCHAR(32) DEFAULT 'pwa';
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS village_id VARCHAR(64);
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS selected_merchant_id VARCHAR(64);
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS supplier_id VARCHAR(64);
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS locale VARCHAR(16) DEFAULT 'en';
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS photo_url TEXT;
      ALTER TABLE user_profiles ADD COLUMN IF NOT EXISTS setup_incomplete BOOLEAN DEFAULT true;

      -- 2. Regional Suppliers (FEAT-01.02)
      CREATE TABLE IF NOT EXISTS suppliers (
        supplier_id VARCHAR(64) PRIMARY KEY,
        legal_name VARCHAR(256) NOT NULL,
        gstin VARCHAR(32) UNIQUE NOT NULL,
        email VARCHAR(128),
        phone_number VARCHAR(32) NOT NULL,
        country_id VARCHAR(64) NOT NULL DEFAULT 'IN',
        state_id VARCHAR(64),
        district_id VARCHAR(64),
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        subscription_tier VARCHAR(32) DEFAULT 'starter',
        delegated_support_enabled BOOLEAN DEFAULT false,
        admin_user_id VARCHAR(64),
        metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- 3. Supplier Delegated Support Grants (FEAT-01.05)
      CREATE TABLE IF NOT EXISTS supplier_delegated_support_grants (
        grant_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        supplier_id VARCHAR(64) NOT NULL,
        granted_by VARCHAR(64) NOT NULL,
        duration_hours INT NOT NULL,
        ticket_reference VARCHAR(128),
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        expires_at TIMESTAMPTZ NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        revoked_at TIMESTAMPTZ
      );

      -- 4. User Suspensions & Governance Audit (FEAT-01.04)
      CREATE TABLE IF NOT EXISTS user_suspensions (
        suspension_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(64) NOT NULL,
        scope VARCHAR(32) NOT NULL DEFAULT 'operational', -- 'operational' | 'platform'
        reason TEXT NOT NULL,
        suspended_by VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active', -- 'active' | 'reinstated'
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        reinstated_at TIMESTAMPTZ,
        reinstated_by VARCHAR(64)
      );

      -- 5. Outbox Events for CDC Synchronization
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

      -- Indices for high-frequency queries
      CREATE INDEX IF NOT EXISTS idx_identity_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
      CREATE INDEX IF NOT EXISTS idx_user_profiles_phone ON user_profiles(phone_number);
      CREATE INDEX IF NOT EXISTS idx_user_profiles_role ON user_profiles(role, status);
      CREATE INDEX IF NOT EXISTS idx_suppliers_gstin ON suppliers(gstin);
      CREATE INDEX IF NOT EXISTS idx_delegated_grants_active ON supplier_delegated_support_grants(supplier_id, status, expires_at);
      CREATE INDEX IF NOT EXISTS idx_suspensions_user ON user_suspensions(user_id, status);
    `);
    logger.info('Identity database schema initialized successfully (user_profiles, suppliers, supplier_delegated_support_grants, user_suspensions, outbox_events)');
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
    'identity-service',
    params.aggregateType,
    params.aggregateId,
    params.operation,
    JSON.stringify(params.payload),
    params.firestoreCollection,
    params.firestoreDocId,
  ]);
}
