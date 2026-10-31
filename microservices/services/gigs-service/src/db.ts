import { Pool, PoolClient } from 'pg';
import { logger } from '@logikchain/common';

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/gigs_db',
  max: 20,
});

export async function initDb(): Promise<void> {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS gigs (
        gig_id VARCHAR(128) PRIMARY KEY,
        supplier_id VARCHAR(64) NOT NULL,
        route_id VARCHAR(64),
        vehicle_id VARCHAR(64) NOT NULL,
        driver_id VARCHAR(64) NOT NULL,
        start_datetime TIMESTAMPTZ NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'PLANNED',
        current_location JSONB,
        route_metrics JSONB DEFAULT '{}'::jsonb,
        stops JSONB DEFAULT '[]'::jsonb,
        actual_distance_km NUMERIC(10, 2) DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS routes (
        route_id VARCHAR(64) PRIMARY KEY,
        supplier_id VARCHAR(64),
        name VARCHAR(128) NOT NULL,
        waypoints JSONB NOT NULL DEFAULT '[]'::jsonb,
        distance_km NUMERIC(10, 2) DEFAULT 0,
        estimated_duration_mins INT DEFAULT 0,
        is_corridor BOOLEAN DEFAULT FALSE,
        cloned_from_route_id VARCHAR(64),
        status VARCHAR(32) NOT NULL DEFAULT 'ACTIVE',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS driver_telemetry (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        gig_id VARCHAR(128) NOT NULL,
        vehicle_id VARCHAR(64) NOT NULL,
        driver_id VARCHAR(64),
        lat NUMERIC(10, 6) NOT NULL,
        lng NUMERIC(10, 6) NOT NULL,
        speed NUMERIC(6, 2) DEFAULT 0,
        bearing NUMERIC(6, 2) DEFAULT 0,
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

      CREATE INDEX IF NOT EXISTS idx_gigs_supplier_status ON gigs(supplier_id, status);
      CREATE INDEX IF NOT EXISTS idx_routes_supplier ON routes(supplier_id);
      CREATE INDEX IF NOT EXISTS idx_telemetry_gig ON driver_telemetry(gig_id, recorded_at);
      CREATE INDEX IF NOT EXISTS idx_gigs_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
    `);

    // Seed default standard corridor routes if table is empty
    const routesCount = await client.query('SELECT COUNT(*) FROM routes');
    if (parseInt(routesCount.rows[0].count, 10) === 0) {
      await client.query(`
        INSERT INTO routes (route_id, supplier_id, name, waypoints, distance_km, estimated_duration_mins, is_corridor)
        VALUES 
          ('rte_prakasam_north', NULL, 'Prakasam North Corridor', '[{"villageId":"vil_ap_01","name":"Peridepi S.O","seq":1},{"villageId":"vil_ap_02","name":"Kondepi","seq":2},{"villageId":"vil_ap_03","name":"Zarugumalli","seq":3}]'::jsonb, 78.5, 140, TRUE),
          ('rte_ongole_circuit', NULL, 'Ongole Rural Cluster', '[{"villageId":"vil_ap_04","name":"Maddipadu","seq":1},{"villageId":"vil_ap_05","name":"Santhanuthalapadu","seq":2}]'::jsonb, 42.0, 75, TRUE);
      `);
      logger.info('Default corridor routes seeded into gigs_db');
    }

    logger.info('Gigs database initialized successfully');
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
    'gigs-service',
    params.aggregateType,
    params.aggregateId,
    params.operation,
    JSON.stringify(params.payload),
    params.firestoreCollection,
    params.firestoreDocId,
  ]);
}
