"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.pool = void 0;
exports.initDb = initDb;
exports.recordOutbox = recordOutbox;
const pg_1 = require("pg");
const common_1 = require("@logikchain/common");
exports.pool = new pg_1.Pool({
    connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/config_db',
    max: 20,
});
async function initDb() {
    const client = await exports.pool.connect();
    try {
        await client.query(`
      CREATE TABLE IF NOT EXISTS countries (
        country_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        iso_code VARCHAR(8) NOT NULL,
        iso_code3 VARCHAR(8),
        numeric_code VARCHAR(8),
        mobile_prefix VARCHAR(8),
        phone_number_length INT DEFAULT 10,
        currency_code VARCHAR(8) DEFAULT 'INR',
        currency_symbol VARCHAR(8) DEFAULT '₹',
        timezone VARCHAR(64) DEFAULT 'Asia/Kolkata',
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS states (
        state_id VARCHAR(64) PRIMARY KEY,
        country_id VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        code VARCHAR(32) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS districts (
        district_id VARCHAR(64) PRIMARY KEY,
        country_id VARCHAR(64) NOT NULL,
        state_id VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        code VARCHAR(32),
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS pincodes (
        pincode_id VARCHAR(64) PRIMARY KEY,
        pincode VARCHAR(16) NOT NULL UNIQUE,
        district_id VARCHAR(64),
        state_id VARCHAR(64),
        centroid JSONB,
        boundary_geojson JSONB,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS villages (
        village_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        lgd_code VARCHAR(32),
        district_id VARCHAR(64) NOT NULL,
        state_id VARCHAR(64) NOT NULL,
        pincode VARCHAR(16) NOT NULL,
        panchayat VARCHAR(128),
        mandal VARCHAR(128),
        geo_location JSONB NOT NULL DEFAULT '{}'::jsonb,
        latitude NUMERIC(10, 6),
        longitude NUMERIC(10, 6),
        is_serviceable BOOLEAN NOT NULL DEFAULT false,
        population INT,
        tier VARCHAR(32),
        hub_id VARCHAR(64),
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_villages_pincode ON villages(pincode);
      CREATE INDEX IF NOT EXISTS idx_villages_coords ON villages(latitude, longitude);

      CREATE TABLE IF NOT EXISTS village_requests (
        request_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(128) NOT NULL,
        pincode VARCHAR(16) NOT NULL,
        panchayat VARCHAR(128),
        mandal VARCHAR(128),
        district VARCHAR(128) NOT NULL,
        state VARCHAR(128) NOT NULL,
        location JSONB,
        requested_by VARCHAR(64),
        requester_role VARCHAR(32),
        status VARCHAR(32) NOT NULL DEFAULT 'pending_support_review',
        rejection_reason TEXT,
        created_village_id VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subscription_plans (
        plan_id VARCHAR(64) PRIMARY KEY,
        name VARCHAR(64) NOT NULL,
        target_role VARCHAR(32) NOT NULL DEFAULT 'supplier',
        description TEXT,
        monthly_fee NUMERIC(10, 2) NOT NULL DEFAULT 0,
        features JSONB NOT NULL DEFAULT '[]'::jsonb,
        entitlements JSONB NOT NULL DEFAULT '[]'::jsonb,
        entitlement_limits JSONB NOT NULL DEFAULT '{}'::jsonb,
        max_vehicles INT DEFAULT 10,
        max_gigs_per_month INT DEFAULT 100,
        delegated_support_enabled BOOLEAN NOT NULL DEFAULT false,
        status VARCHAR(16) NOT NULL DEFAULT 'active',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS plan_tariffs (
        tariff_id VARCHAR(64) PRIMARY KEY,
        plan_id VARCHAR(64) NOT NULL,
        name VARCHAR(128) NOT NULL,
        billing_cycle VARCHAR(32) NOT NULL DEFAULT 'monthly',
        currency_code VARCHAR(8) NOT NULL DEFAULT 'INR',
        country_id VARCHAR(64),
        base_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
        tariff_type VARCHAR(32) NOT NULL DEFAULT 'standard',
        unit_price NUMERIC(10, 2),
        gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        effective_to TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subscription_offers (
        offer_id VARCHAR(64) PRIMARY KEY,
        plan_id VARCHAR(64),
        name VARCHAR(128) NOT NULL,
        value_type VARCHAR(32) NOT NULL DEFAULT 'percent',
        value NUMERIC(10, 2) NOT NULL DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS discount_codes (
        code_id VARCHAR(64) PRIMARY KEY,
        offer_id VARCHAR(64) NOT NULL,
        code VARCHAR(64) NOT NULL UNIQUE,
        status VARCHAR(32) NOT NULL DEFAULT 'draft',
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS platform_subscriptions (
        subscription_id VARCHAR(64) PRIMARY KEY,
        subscriber_id VARCHAR(64) NOT NULL,
        plan_id VARCHAR(64) NOT NULL,
        tariff_id VARCHAR(64),
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        grace_days INT NOT NULL DEFAULT 0,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tax_profiles (
        tax_profile_id VARCHAR(64) PRIMARY KEY,
        supplier_id VARCHAR(64),
        gstin VARCHAR(32) NOT NULL,
        registered_state_code VARCHAR(8),
        hsn_sac_code VARCHAR(32),
        default_gst_rate NUMERIC(5, 2) NOT NULL DEFAULT 18,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        effective_from TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        valid_to TIMESTAMPTZ,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tds_configs (
        config_id VARCHAR(64) PRIMARY KEY,
        section VARCHAR(32) NOT NULL DEFAULT '194O',
        rate_with_pan NUMERIC(5, 2) NOT NULL DEFAULT 1.0,
        rate_without_pan NUMERIC(5, 2) NOT NULL DEFAULT 5.0,
        enabled BOOLEAN NOT NULL DEFAULT true,
        reason TEXT,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tds_challans (
        challan_id VARCHAR(64) PRIMARY KEY,
        deduction_ids JSONB NOT NULL DEFAULT '[]'::jsonb,
        total_amount NUMERIC(12, 2) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'recorded',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS tds_certificates (
        certificate_id VARCHAR(64) PRIMARY KEY,
        driver_id VARCHAR(64) NOT NULL,
        financial_year VARCHAR(16) NOT NULL,
        quarter VARCHAR(8) NOT NULL,
        issued_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        status VARCHAR(32) NOT NULL DEFAULT 'issued'
      );

      CREATE TABLE IF NOT EXISTS merchant_delivery_configs (
        merchant_id VARCHAR(64) PRIMARY KEY,
        enable_home_delivery BOOLEAN NOT NULL DEFAULT false,
        delivery_charge NUMERIC(10, 2) NOT NULL DEFAULT 0,
        working_days JSONB NOT NULL DEFAULT '["Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"]'::jsonb,
        delivery_days JSONB NOT NULL DEFAULT '["Monday","Wednesday","Friday"]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS pudo_commission_tiers (
        tier_id VARCHAR(64) PRIMARY KEY,
        supplier_id VARCHAR(64) NOT NULL,
        tiers JSONB NOT NULL DEFAULT '[]'::jsonb,
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS master_routes (
        route_id VARCHAR(64) PRIMARY KEY,
        supplier_id VARCHAR(64) NOT NULL DEFAULT 'GLOBAL',
        is_pre_configured BOOLEAN NOT NULL DEFAULT true,
        route_type VARCHAR(32) NOT NULL DEFAULT 'standard_corridor',
        name VARCHAR(128) NOT NULL,
        origin JSONB,
        destination JSONB,
        waypoints JSONB NOT NULL DEFAULT '[]'::jsonb,
        villages JSONB NOT NULL DEFAULT '[]'::jsonb,
        distance_km NUMERIC(8, 2) DEFAULT 0,
        turnaround_hours NUMERIC(6, 2) DEFAULT 0,
        status VARCHAR(32) NOT NULL DEFAULT 'active',
        cloned_from_route_id VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS geo_import_jobs (
        job_id VARCHAR(64) PRIMARY KEY,
        filename VARCHAR(256),
        status VARCHAR(32) NOT NULL DEFAULT 'processing',
        total_records INT DEFAULT 0,
        matched_count INT DEFAULT 0,
        unmatched_count INT DEFAULT 0,
        interpolated_count INT DEFAULT 0,
        report JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS supplier_ingestion_jobs (
        job_id VARCHAR(64) PRIMARY KEY,
        supplier_id VARCHAR(64) NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        selected_categories JSONB NOT NULL DEFAULT '[]'::jsonb,
        total_rows INT DEFAULT 0,
        valid_rows INT DEFAULT 0,
        error_rows INT DEFAULT 0,
        validation_report JSONB DEFAULT '{}'::jsonb,
        execution_metrics JSONB DEFAULT '{}'::jsonb,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        completed_at TIMESTAMPTZ
      );

      CREATE TABLE IF NOT EXISTS supplier_ingestion_staging (
        staging_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        job_id VARCHAR(64) NOT NULL,
        entity_type VARCHAR(64) NOT NULL,
        raw_data JSONB NOT NULL,
        status VARCHAR(32) NOT NULL DEFAULT 'pending',
        validation_errors JSONB,
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

      CREATE INDEX IF NOT EXISTS idx_config_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
    `);
        common_1.logger.info('Config database initialized with full Epic 10 schema');
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
        'config-service',
        params.aggregateType,
        params.aggregateId,
        params.operation,
        JSON.stringify(params.payload),
        params.firestoreCollection,
        params.firestoreDocId,
    ]);
}
