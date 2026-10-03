import { Pool, PoolClient } from 'pg';
import { logger } from '@logikchain/common';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/social_connect_db',
  max: 20,
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS user_notification_preferences (
        user_id VARCHAR(64) PRIMARY KEY,
        phone_number VARCHAR(32),
        whatsapp_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        sms_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        push_enabled BOOLEAN NOT NULL DEFAULT TRUE,
        preferred_channel VARCHAR(32) NOT NULL DEFAULT 'whatsapp',
        categories JSONB NOT NULL DEFAULT '{"orders": true, "otps": true, "bills": true, "ownership": true, "marketing": false}'::jsonb,
        quiet_hours_start VARCHAR(8),
        quiet_hours_end VARCHAR(8),
        language VARCHAR(16) NOT NULL DEFAULT 'en',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS notification_dispatches (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id VARCHAR(64) NOT NULL,
        channel VARCHAR(32) NOT NULL, -- 'whatsapp' | 'sms' | 'push'
        category VARCHAR(32) NOT NULL, -- 'otp' | 'order_update' | 'bill_invoice' | 'ownership_alert'
        recipient VARCHAR(64) NOT NULL,
        template_name VARCHAR(64),
        payload JSONB NOT NULL,
        external_message_id VARCHAR(128),
        status VARCHAR(32) NOT NULL DEFAULT 'pending', -- 'pending' | 'sent' | 'delivered' | 'read' | 'failed'
        error_details TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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

      CREATE INDEX IF NOT EXISTS idx_social_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
      CREATE INDEX IF NOT EXISTS idx_notif_user ON notification_dispatches(user_id, created_at DESC);
    `);
    logger.info('Social Connect database initialized (user_notification_preferences, notification_dispatches, outbox_events)');
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
  await client.query(
    `
    INSERT INTO outbox_events (
      service, aggregate_type, aggregate_id, operation, payload, firestore_collection, firestore_doc_id
    ) VALUES ($1, $2, $3, $4, $5, $6, $7)
  `,
    [
      'social-connect-service',
      params.aggregateType,
      params.aggregateId,
      params.operation,
      JSON.stringify(params.payload),
      params.firestoreCollection,
      params.firestoreDocId,
    ]
  );
}

/**
 * Retrieve user's notification preferences from local DB.
 * If user hasn't set custom preferences yet, returns standard defaults.
 */
export async function getUserPreferences(userId: string) {
  const result = await pool.query(
    'SELECT * FROM user_notification_preferences WHERE user_id = $1',
    [userId]
  );

  if (result.rows.length > 0) {
    return result.rows[0];
  }

  // Sensible rural defaults: WhatsApp enabled, OTPs & Orders & Bills enabled
  return {
    user_id: userId,
    phone_number: null,
    whatsapp_enabled: true,
    sms_enabled: true,
    push_enabled: true,
    preferred_channel: 'whatsapp',
    categories: {
      orders: true,
      otps: true,
      bills: true,
      ownership: true,
      marketing: false,
    },
    quiet_hours_start: null,
    quiet_hours_end: null,
    language: 'en',
    is_default: true,
  };
}
