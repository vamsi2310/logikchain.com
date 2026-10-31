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
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      -- Standard Platform Chart of Accounts (FEAT-09.01)
      CREATE TABLE IF NOT EXISTS chart_of_accounts (
        account_code VARCHAR(32) PRIMARY KEY,
        account_name VARCHAR(128) NOT NULL,
        account_type VARCHAR(32) NOT NULL, -- 'ASSET', 'LIABILITY', 'EQUITY', 'REVENUE', 'EXPENSE'
        description TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Seed standard chart of accounts
      INSERT INTO chart_of_accounts (account_code, account_name, account_type, description)
      VALUES
        ('1010', '1010-GATEWAY-CLEARING', 'ASSET', 'Payment gateway clearing buffer for settled UPI collections'),
        ('1020', '1020-BANK-NODAL-ACCOUNT', 'ASSET', 'Primary RBI-compliant nodal bank settlement account'),
        ('1030', '1030-CASH-IN-TRANSIT', 'ASSET', 'Physical cash held by field delivery drivers during transit'),
        ('2010', '2010-BUYER-ADVANCE', 'LIABILITY', 'Buyer order advance deposits held pending delivery completion'),
        ('2020', '2020-MERCHANT-PAYABLE', 'LIABILITY', 'Payables owed to local merchants for fulfilled wholesale stock'),
        ('2030', '2030-TDS-PAYABLE', 'LIABILITY', 'Statutory tax withheld under Section 194C and 194O payable to Govt'),
        ('2040', '2040-DRIVER-EARNINGS-PAYABLE', 'LIABILITY', 'Accrued delivery partner gig commissions available for payout'),
        ('4010', '4010-PLATFORM-COMMISSION-REVENUE', 'REVENUE', 'Logikchain marketplace platform convenience & commission fee'),
        ('5010', '5010-PAYMENT-GATEWAY-FEES', 'EXPENSE', 'Direct merchant discount rate (MDR) and banking processing costs')
      ON CONFLICT (account_code) DO NOTHING;

      -- Cached Real-Time Account Balances (FEAT-09.01)
      CREATE TABLE IF NOT EXISTS account_balances (
        account_code VARCHAR(32) PRIMARY KEY REFERENCES chart_of_accounts(account_code),
        current_balance NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        total_debit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        total_credit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        last_updated TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      -- Initialize balances for all accounts
      INSERT INTO account_balances (account_code, current_balance, total_debit, total_credit)
      SELECT account_code, 0.00, 0.00, 0.00 FROM chart_of_accounts
      ON CONFLICT (account_code) DO NOTHING;

      -- Immutable Double-Entry Journal Headers (FEAT-09.01)
      CREATE TABLE IF NOT EXISTS journal_entries (
        entry_id VARCHAR(64) PRIMARY KEY,
        transaction_reference VARCHAR(64),
        entry_type VARCHAR(32) NOT NULL DEFAULT 'STANDARD',
        description TEXT NOT NULL,
        total_amount NUMERIC(14, 2) NOT NULL,
        posted_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_journal_entries_posted ON journal_entries(posted_at);
      CREATE INDEX IF NOT EXISTS idx_journal_entries_ref ON journal_entries(transaction_reference);

      -- Immutable Double-Entry Journal Lines (FEAT-09.01)
      CREATE TABLE IF NOT EXISTS journal_lines (
        line_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        entry_id VARCHAR(64) NOT NULL REFERENCES journal_entries(entry_id),
        account_code VARCHAR(32) NOT NULL REFERENCES chart_of_accounts(account_code),
        debit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        credit NUMERIC(14, 2) NOT NULL DEFAULT 0.00,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_journal_lines_entry ON journal_lines(entry_id);
      CREATE INDEX IF NOT EXISTS idx_journal_lines_account ON journal_lines(account_code);

      -- 3-Way Nightly Bank Reconciliation Runs (FEAT-09.02)
      CREATE TABLE IF NOT EXISTS reconciliation_runs (
        run_id VARCHAR(64) PRIMARY KEY,
        period_start TIMESTAMPTZ NOT NULL,
        period_end TIMESTAMPTZ NOT NULL,
        run_type VARCHAR(32) NOT NULL DEFAULT 'NIGHTLY_3WAY',
        status VARCHAR(32) NOT NULL DEFAULT 'IN_PROGRESS', -- 'BALANCED', 'VARIANCE_DETECTED', 'IN_PROGRESS'
        total_transactions INT DEFAULT 0,
        matched_count INT DEFAULT 0,
        unmatched_count INT DEFAULT 0,
        total_variance_amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
        variance_details JSONB DEFAULT '[]'::jsonb,
        ai_analysis JSONB,
        closed_at TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_reconciliation_status ON reconciliation_runs(status);

      -- Statutory TDS Deductions (FEAT-09.03)
      CREATE TABLE IF NOT EXISTS tds_deductions (
        deduction_id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        deductee_id VARCHAR(64) NOT NULL,
        deductee_type VARCHAR(32) NOT NULL, -- 'DRIVER', 'MERCHANT'
        pan_number VARCHAR(16),
        section VARCHAR(16) NOT NULL, -- '194C', '194O'
        gross_amount NUMERIC(12, 2) NOT NULL,
        tds_rate NUMERIC(5, 2) NOT NULL,
        tds_amount NUMERIC(12, 2) NOT NULL,
        payout_id VARCHAR(64),
        status VARCHAR(32) NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'DEPOSITED'
        challan_id VARCHAR(64),
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_tds_deductee ON tds_deductions(deductee_id);
      CREATE INDEX IF NOT EXISTS idx_tds_status ON tds_deductions(status);

      -- Government TDS Challans (FEAT-09.03)
      CREATE TABLE IF NOT EXISTS tds_challans (
        challan_id VARCHAR(64) PRIMARY KEY,
        tax_period VARCHAR(16) NOT NULL,
        bsr_code VARCHAR(16) NOT NULL,
        challan_number VARCHAR(32) NOT NULL,
        deposit_date DATE NOT NULL DEFAULT CURRENT_DATE,
        amount NUMERIC(12, 2) NOT NULL,
        linked_deductions_count INT NOT NULL DEFAULT 0,
        storage_path TEXT,
        recorded_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      );

      CREATE INDEX IF NOT EXISTS idx_tds_challans_period ON tds_challans(tax_period);

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

      CREATE INDEX IF NOT EXISTS idx_finance_outbox_pending ON outbox_events(created_at) WHERE sync_status = 'PENDING';
    `);
        common_1.logger.info('Finance database schema initialized successfully (EPIC-09)');
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
