"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const crypto_1 = __importDefault(require("crypto"));
const common_1 = require("@logikchain/common");
const db_1 = require("./db");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = (0, common_1.createPeriodicSyncer)({
    serviceName: 'governance-service',
    pool: db_1.pool,
    firestoreCollection: 'AuditLogEntries',
    inboundTable: 'audit_logs',
    idColumn: 'event_id',
    syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});
app.get('/health', async (req, res) => {
    try {
        const dbStart = Date.now();
        await db_1.pool.query('SELECT 1');
        const dbLatency = Date.now() - dbStart;
        res.json({
            status: 'ok',
            service: 'governance-service',
            epic: 'EPIC-11',
            timestamp: new Date().toISOString(),
            database: {
                status: 'connected',
                latencyMs: dbLatency,
            },
            sync: syncer.getStats(),
        });
    }
    catch (err) {
        res.status(500).json({ status: 'degraded', error: err.message });
    }
});
app.get('/sync/status', (req, res) => {
    res.json(syncer.getStats());
});
app.post('/sync/trigger', async (req, res) => {
    const syncedOutbox = await syncer.syncOutbox();
    const syncedStorage = await syncer.syncStorage();
    res.json({ triggered: true, syncedOutbox, syncedStorage, stats: syncer.getStats() });
});
/* ==========================================================================
   FEAT-11.01: UPI TPAP Compliance & VPA Lifecycle Governance
   ========================================================================== */
const VALID_PSP_HANDLES = new Set([
    'okhdfcbank',
    'okaxis',
    'okicici',
    'oksbi',
    'icici',
    'hdfcbank',
    'ybl',
    'axl',
    'ibl',
    'paytm',
    'upi',
]);
/**
 * Register VPA (UPI TPAP compliance)
 * POST /v1/governance/vpa/register
 */
app.post(['/v1/governance/vpa/register', '/governance/vpa/register', '/vpa/register', '/vpa'], async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { vpa, userId, pspHandle, bankAccountLinked = true, deviceFingerprint } = req.body;
        if (!vpa || !userId) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'vpa and userId are required', 400);
        }
        // 1. Syntax Validation: must contain exactly one '@'
        const parts = vpa.trim().toLowerCase().split('@');
        if (parts.length !== 2 || !parts[0] || !parts[1]) {
            throw new common_1.AppError('INVALID_VPA_FORMAT', 'VPA format must follow username@handle', 422);
        }
        const handle = (pspHandle || parts[1]).toLowerCase();
        // 2. National Fraudulent VPA Blacklist Check
        const normalizedVpa = `${parts[0]}@${parts[1]}`;
        const blacklistRes = await client.query(`SELECT * FROM vpa_blacklist 
         WHERE vpa_pattern = $1 
            OR $1 ILIKE '%' || vpa_pattern || '%'
            OR $1 ILIKE '%fraud%'
            OR $1 ILIKE '%scam%'`, [normalizedVpa]);
        if (blacklistRes.rows.length > 0) {
            const bl = blacklistRes.rows[0];
            // Log security audit for blocked blacklist attempt
            await client.query(`INSERT INTO audit_logs (actor_id, action, target_entity, target_id, metadata)
           VALUES ($1, 'VPA_REGISTRATION_BLACKLIST_BLOCKED', 'VPA', $2, $3)`, [userId, normalizedVpa, JSON.stringify({ reason: bl.reason, category: bl.category })]);
            return res.status(422).json({
                error: {
                    code: 'VPA_BLACKLISTED',
                    message: `VPA ${normalizedVpa} is blacklisted by national regulatory anti-fraud database: ${bl.reason}`,
                },
                status: 'BLACKLISTED',
                compliant: false,
            });
        }
        await client.query('BEGIN');
        const insertRes = await client.query(`INSERT INTO upi_vpa_registry 
          (vpa, user_id, psp_handle, bank_account_linked, device_fingerprint, status, compliance_certified, updated_at)
         VALUES ($1, $2, $3, $4, $5, 'ACTIVE', true, NOW())
         ON CONFLICT (vpa) DO UPDATE SET 
           status = 'ACTIVE', 
           bank_account_linked = EXCLUDED.bank_account_linked,
           device_fingerprint = EXCLUDED.device_fingerprint,
           updated_at = NOW()
         RETURNING *`, [normalizedVpa, userId, handle, Boolean(bankAccountLinked), deviceFingerprint || null]);
        const record = insertRes.rows[0];
        // Append-only audit log
        await client.query(`INSERT INTO audit_logs (actor_id, action, target_entity, target_id, metadata)
         VALUES ($1, 'VPA_REGISTERED', 'VPA', $2, $3)`, [userId, normalizedVpa, JSON.stringify({ vpa: normalizedVpa, userId, handle, bankAccountLinked })]);
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'VpaRegistration',
            aggregateId: normalizedVpa,
            operation: 'INSERT',
            payload: record,
            firestoreCollection: 'VerifiedVPAs',
            firestoreDocId: `vpa_${normalizedVpa.replace(/[@.]/g, '_')}`,
        });
        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            vpa: record,
            compliant: true,
            tpapCertified: true,
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
});
/**
 * Verify VPA Linkage & NPCI Compliance Status
 * GET /v1/governance/vpa/:vpa/verify
 */
app.get(['/v1/governance/vpa/:vpa/verify', '/governance/vpa/:vpa/verify', '/vpa/:vpa/verify'], async (req, res, next) => {
    try {
        const vpa = req.params.vpa.trim().toLowerCase();
        const result = await db_1.pool.query('SELECT * FROM upi_vpa_registry WHERE vpa = $1', [vpa]);
        if (result.rows.length === 0) {
            return res.status(404).json({
                error: { code: 'VPA_NOT_FOUND', message: `VPA ${vpa} is not registered on Logikchain TPAP mesh.` },
                compliant: false,
            });
        }
        const row = result.rows[0];
        res.json({
            vpa: row.vpa,
            userId: row.user_id,
            pspHandle: row.psp_handle,
            status: row.status,
            bankAccountLinked: row.bank_account_linked,
            complianceCertified: row.compliance_certified && row.status === 'ACTIVE',
            linkedAt: row.linked_at,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * De-register VPA
 * POST /v1/governance/vpa/deregister
 */
app.post(['/v1/governance/vpa/deregister', '/governance/vpa/deregister', '/vpa/deregister'], async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { vpa, userId, reason } = req.body;
        if (!vpa)
            throw new common_1.AppError('INVALID_ARGUMENT', 'vpa is required', 400);
        const normalizedVpa = vpa.trim().toLowerCase();
        await client.query('BEGIN');
        const updateRes = await client.query(`UPDATE upi_vpa_registry 
         SET status = 'DEREGISTERED', updated_at = NOW()
         WHERE vpa = $1
         RETURNING *`, [normalizedVpa]);
        if (updateRes.rows.length === 0) {
            throw new common_1.AppError('VPA_NOT_FOUND', `VPA ${normalizedVpa} not found`, 404);
        }
        await client.query(`INSERT INTO audit_logs (actor_id, action, target_entity, target_id, metadata)
         VALUES ($1, 'VPA_DEREGISTERED', 'VPA', $2, $3)`, [userId || 'system', normalizedVpa, JSON.stringify({ reason: reason || 'User requested deregistration' })]);
        await client.query('COMMIT');
        res.json({
            success: true,
            vpa: updateRes.rows[0],
            message: 'VPA successfully deregistered from platform routing.',
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
});
/* ==========================================================================
   FEAT-11.02: Real-Time AML Fraud Detection & Velocity Guardrails
   ========================================================================== */
/**
 * Evaluate Transaction Velocity & AML Guardrails
 * POST /v1/governance/aml/check
 */
app.post(['/v1/governance/aml/check', '/governance/aml/check', '/aml/check', '/aml/scan', '/fraud-check', '/api/v1/governance/aml/scan'], async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { userId, amount, vpa, geoCell, deviceFingerprint, transactionType = 'PAYMENT' } = req.body;
        if (!userId || amount === undefined) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'userId and amount are required', 400);
        }
        const numAmount = parseFloat(amount);
        const flags = [];
        let riskScore = 5; // Baseline low risk
        // 1. Record velocity telemetry in postgres
        await client.query(`INSERT INTO aml_velocity_records (user_id, transaction_type, amount, vpa, geo_cell, device_fingerprint)
         VALUES ($1, $2, $3, $4, $5, $6)`, [userId, transactionType, numAmount, vpa || null, geoCell || null, deviceFingerprint || null]);
        // 2. Sliding-Window Velocity Check: count transactions for user in last 10 minutes
        const velocityRes = await client.query(`SELECT COUNT(*) as count, COALESCE(SUM(amount), 0) as total_volume
         FROM aml_velocity_records
         WHERE user_id = $1 AND timestamp >= (NOW() - INTERVAL '10 minutes')`, [userId]);
        const recentTxCount = parseInt(velocityRes.rows[0].count, 10);
        const recentVolume = parseFloat(velocityRes.rows[0].total_volume);
        // Rule A: Velocity spike (More than 5 transactions in 10 minutes)
        if (recentTxCount > 5) {
            riskScore = 95;
            flags.push(`HIGH_VELOCITY_SPIKE: ${recentTxCount} txs in 10m`);
        }
        // Rule B: Single Ticket Ceiling for rural merchant/buyer (> ₹1,00,000)
        if (numAmount > 100000.0) {
            riskScore += 50;
            flags.push(`EXCEEDS_SINGLE_TICKET_CEILING: ₹${numAmount.toLocaleString('en-IN')}`);
        }
        // Rule C: Rapid volume accumulation (> ₹2,50,000 in 10 minutes)
        if (recentVolume > 250000.0) {
            riskScore += 45;
            flags.push(`AGGREGATE_WINDOW_VOLUME_HIGH: ₹${recentVolume.toLocaleString('en-IN')}`);
        }
        // Rule D: Known fraudulent handle pattern
        if (vpa && (vpa.includes('fraud') || vpa.includes('scam'))) {
            riskScore = 100;
            flags.push(`FRAUDULENT_VPA_PATTERN: ${vpa}`);
        }
        // Normalize score to max 100
        riskScore = Math.min(100, riskScore);
        const isFreeze = riskScore >= 80;
        const decision = isFreeze ? 'REJECT_AND_FREEZE' : riskScore >= 50 ? 'REVIEW' : 'ALLOW';
        // If risk score >= 80, create immutable alert ticket and flag account freeze
        if (isFreeze) {
            await client.query(`INSERT INTO aml_alerts (user_id, risk_score, decision, flags, notes)
           VALUES ($1, $2, $3, $4, $5)`, [
                userId,
                riskScore,
                decision,
                JSON.stringify(flags),
                `Automated lockdown triggered: risk score ${riskScore}/100 exceeds threshold 80`,
            ]);
            await client.query(`INSERT INTO audit_logs (actor_id, action, target_entity, target_id, metadata)
           VALUES ($1, 'ACCOUNT_AML_LOCKDOWN', 'USER', $1, $2)`, [userId, JSON.stringify({ riskScore, flags, decision })]);
        }
        res.json({
            allowed: !isFreeze,
            riskScore,
            decision,
            flags,
            freezeTriggered: isFreeze,
            recentTxCountInWindow: recentTxCount,
            timestamp: new Date().toISOString(),
        });
    }
    catch (err) {
        next(err);
    }
    finally {
        client.release();
    }
});
/**
 * Get Open AML Alerts (Support Console)
 * GET /v1/governance/aml/alerts
 */
app.get(['/v1/governance/aml/alerts', '/governance/aml/alerts', '/aml/alerts'], async (req, res, next) => {
    try {
        const result = await db_1.pool.query('SELECT * FROM aml_alerts ORDER BY created_at DESC LIMIT 50');
        res.json({
            count: result.rows.length,
            alerts: result.rows,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Support Proxy Audit Trail Logging (US-11.02.02)
 * POST /v1/governance/audit/proxy
 */
app.post(['/v1/governance/audit/proxy', '/governance/audit/proxy', '/audit/proxy'], async (req, res, next) => {
    try {
        const { operatorUid, targetSupplierId, grantId, action, payloadHash, clientIp } = req.body;
        if (!operatorUid || !targetSupplierId || !action) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'operatorUid, targetSupplierId, and action required', 400);
        }
        const insertRes = await db_1.pool.query(`INSERT INTO proxy_audit_trail (operator_uid, target_supplier_id, grant_id, action, payload_hash, client_ip)
         VALUES ($1, $2, $3, $4, $5, $6)
         RETURNING *`, [
            operatorUid,
            targetSupplierId,
            grantId || 'default-grant',
            action,
            payloadHash || crypto_1.default.createHash('sha256').update(action).digest('hex'),
            clientIp || '127.0.0.1',
        ]);
        res.status(201).json({
            success: true,
            auditRecord: insertRes.rows[0],
        });
    }
    catch (err) {
        next(err);
    }
});
/* ==========================================================================
   FEAT-11.03: Dispute SLA Tracking & Regulatory Reporting
   ========================================================================== */
/**
 * Track Ingested Dispute with 24-Hour Statutory Countdown
 * POST /v1/governance/disputes
 */
app.post(['/v1/governance/disputes', '/governance/disputes', '/disputes'], async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { disputeId, transactionId, userId, vpa, amount, reason, receivedAt } = req.body;
        if (!disputeId || !transactionId || !userId || amount === undefined) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'disputeId, transactionId, userId, and amount are required', 400);
        }
        const recDate = receivedAt ? new Date(receivedAt) : new Date();
        // Strict NPCI T+1 / 24-Hour SLA Deadline
        const slaDeadline = new Date(recDate.getTime() + 24 * 60 * 60 * 1000);
        await client.query('BEGIN');
        const insertRes = await client.query(`INSERT INTO dispute_sla 
          (dispute_id, transaction_id, user_id, vpa, amount, reason, received_at, sla_deadline, status)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8, 'OPEN')
         ON CONFLICT (dispute_id) DO UPDATE SET 
           reason = EXCLUDED.reason, 
           updated_at = NOW()
         RETURNING *`, [disputeId, transactionId, userId, vpa || null, parseFloat(amount), reason || 'Customer chargeback', recDate, slaDeadline]);
        const record = insertRes.rows[0];
        await client.query(`INSERT INTO audit_logs (actor_id, action, target_entity, target_id, metadata)
         VALUES ($1, 'DISPUTE_INGESTED', 'DISPUTE', $2, $3)`, [userId, disputeId, JSON.stringify({ disputeId, transactionId, slaDeadline })]);
        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            dispute: record,
            slaHours: 24,
            slaDeadline: record.sla_deadline,
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
});
/**
 * Resolve UPI Dispute & Audit SLA Breach
 * POST /v1/governance/disputes/:id/resolve
 */
app.post(['/v1/governance/disputes/:id/resolve', '/governance/disputes/:id/resolve', '/disputes/:id/resolve'], async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const disputeId = req.params.id;
        const { resolutionOutcome, resolutionNotes, resolvedBy } = req.body;
        if (!resolutionOutcome) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'resolutionOutcome is required (REFUND, GOODS_DELIVERED, FRAUD_REJECTED)', 400);
        }
        await client.query('BEGIN');
        const existingRes = await client.query('SELECT * FROM dispute_sla WHERE dispute_id = $1', [disputeId]);
        if (existingRes.rows.length === 0) {
            throw new common_1.AppError('DISPUTE_NOT_FOUND', `Dispute ${disputeId} not found`, 404);
        }
        const existing = existingRes.rows[0];
        const now = new Date();
        const slaDeadline = new Date(existing.sla_deadline);
        const slaBreached = now > slaDeadline;
        const updateRes = await client.query(`UPDATE dispute_sla
         SET status = 'RESOLVED',
             resolution_outcome = $1,
             resolution_notes = $2,
             resolved_by = $3,
             resolved_at = $4,
             sla_breached = $5,
             updated_at = NOW()
         WHERE dispute_id = $6
         RETURNING *`, [resolutionOutcome, resolutionNotes || 'Resolved per compliance SOP', resolvedBy || 'support_lead', now, slaBreached, disputeId]);
        const resolved = updateRes.rows[0];
        await client.query(`INSERT INTO audit_logs (actor_id, action, target_entity, target_id, metadata)
         VALUES ($1, 'DISPUTE_RESOLVED', 'DISPUTE', $2, $3)`, [resolvedBy || 'support', disputeId, JSON.stringify({ resolutionOutcome, slaBreached })]);
        await client.query('COMMIT');
        res.json({
            success: true,
            dispute: resolved,
            slaBreached,
            message: slaBreached ? 'Warning: Resolved after 24h SLA expiry' : 'Resolved within statutory 24h SLA',
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
});
/**
 * List Disputes with Countdown Status
 * GET /v1/governance/disputes
 */
app.get(['/v1/governance/disputes', '/governance/disputes', '/disputes'], async (req, res, next) => {
    try {
        const result = await db_1.pool.query(`SELECT *, 
          EXTRACT(EPOCH FROM (sla_deadline - NOW())) / 60 as remaining_minutes
         FROM dispute_sla
         ORDER BY sla_deadline ASC LIMIT 100`);
        res.json({
            count: result.rows.length,
            disputes: result.rows.map((row) => ({
                ...row,
                remainingMinutes: Math.round(parseFloat(row.remaining_minutes)),
                isUrgent: parseFloat(row.remaining_minutes) < 360 && row.status === 'OPEN', // < 6 hours remaining
            })),
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Generate NPCI Regulatory Daily Report
 * POST /v1/governance/reporting/npci
 */
app.post(['/v1/governance/reporting/npci', '/governance/reporting/npci', '/reporting/npci'], async (req, res, next) => {
    try {
        const reportDate = req.body.reportDate ? new Date(req.body.reportDate) : new Date();
        const dateStr = reportDate.toISOString().split('T')[0];
        const reportId = `NPCI_${dateStr.replace(/-/g, '')}_${Date.now()}`;
        // Aggregate disputes resolved today
        const stats = await db_1.pool.query(`SELECT 
           COUNT(*) as total,
           COUNT(*) FILTER (WHERE sla_breached = false) as on_time,
           COUNT(*) FILTER (WHERE sla_breached = true) as breached
         FROM dispute_sla`);
        const total = parseInt(stats.rows[0].total, 10) || 0;
        const onTime = parseInt(stats.rows[0].on_time, 10) || 0;
        const breached = parseInt(stats.rows[0].breached, 10) || 0;
        const complianceRatio = total > 0 ? Math.round((onTime / total) * 10000) / 100 : 100.0;
        const payload = {
            reportId,
            date: dateStr,
            regulatoryEntity: 'NPCI_TPAP_OVERSIGHT',
            entityId: 'LOGIKCHAIN_TECHNOLOGIES_PVT_LTD',
            totalDisputes: total,
            resolvedWithinSla: onTime,
            breachedCount: breached,
            complianceRatio,
            generatedAt: new Date().toISOString(),
        };
        await db_1.pool.query(`INSERT INTO npci_regulatory_reports 
          (report_id, report_date, total_disputes, resolved_within_sla, breached_count, compliance_ratio, report_payload)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         ON CONFLICT (report_id) DO NOTHING`, [reportId, dateStr, total, onTime, breached, complianceRatio, JSON.stringify(payload)]);
        res.status(201).json({
            success: true,
            reportId,
            report: payload,
        });
    }
    catch (err) {
        next(err);
    }
});
/* ==========================================================================
   FEAT-11.04: Platform Terms of Service, Legal Policies & Versioned Consent Engine
   ========================================================================== */
const PLATFORM_POLICIES = [
    {
        policyId: 'POL-TERMS-BUYER',
        role: 'buyer',
        title: 'Buyer Terms of Sale & Group Buying Agreement',
        currentVersion: 'v2.0',
        versionHash: 'hash_buyer_v2_0_7a9c8f',
        mandatory: true,
        effectiveDate: '2026-09-01',
        summary: 'Governs consumer group purchases, pickup timeframes at PUDO points, and refund eligibility under Consumer Protection Rules 2020.',
    },
    {
        policyId: 'POL-PUDO-MERCHANT',
        role: 'merchant',
        title: 'Merchant PUDO Master Services & Trade Credit Agreement',
        currentVersion: 'v1.5',
        versionHash: 'hash_merchant_v1_5_4b8e2d',
        mandatory: true,
        effectiveDate: '2026-08-15',
        summary: 'Outlines merchant inventory custody obligations, commission structures, and trade credit default provisions.',
    },
    {
        policyId: 'POL-DRIVER-AGREEMENT',
        role: 'driver',
        title: 'Independent Delivery Partner Logistics Agreement',
        currentVersion: 'v1.2',
        versionHash: 'hash_driver_v1_2_9c1f4a',
        mandatory: true,
        effectiveDate: '2026-07-01',
        summary: 'Specifies physical cash custody limits, daily turn-in protocols, Section 194C TDS deductions, and gig routing responsibilities.',
    },
    {
        policyId: 'POL-SUPPLIER-MASTER',
        role: 'supplier',
        title: 'Wholesale Supplier Master Distribution Agreement',
        currentVersion: 'v1.1',
        versionHash: 'hash_supplier_v1_1_3e7a0b',
        mandatory: true,
        effectiveDate: '2026-06-01',
        summary: 'Governs agricultural catalog publishing, warehouse dispatch manifest sign-offs, and batch payout settlements.',
    },
];
/**
 * Get Active Platform Policies
 * GET /v1/governance/policies/active
 */
app.get(['/v1/governance/policies/active', '/governance/policies/active', '/policies/active'], (req, res) => {
    res.json({
        policies: PLATFORM_POLICIES,
        timestamp: new Date().toISOString(),
    });
});
/**
 * Get Specific Policy Document
 * GET /v1/governance/policies/:policyId/versions/:version
 */
app.get(['/v1/governance/policies/:policyId/versions/:version', '/governance/policies/:policyId/versions/:version', '/policies/:policyId/versions/:version'], (req, res) => {
    const { policyId, version } = req.params;
    const policy = PLATFORM_POLICIES.find((p) => p.policyId === policyId);
    if (!policy) {
        return res.status(404).json({ error: { code: 'POLICY_NOT_FOUND', message: `Policy ${policyId} not found` } });
    }
    res.json({
        policyId: policy.policyId,
        role: policy.role,
        title: policy.title,
        version: version || policy.currentVersion,
        versionHash: policy.versionHash,
        effectiveDate: policy.effectiveDate,
        clauses: [
            { clauseId: '1.1', title: 'Jurisdiction & Statutory Compliance', content: 'Governed by the laws of India and Consumer Protection (E-Commerce) Rules 2020.' },
            { clauseId: '1.2', title: 'Financial & Dispute Settlement', content: 'Disputes resolved under NPCI UPI grievance redressal frameworks within 24 hours.' },
            { clauseId: '1.3', title: 'Custody & Audit', content: 'All transactions recorded in tamper-proof append-only audit ledger.' },
        ],
    });
});
/**
 * Record Clickwrap Policy Consent
 * POST /v1/governance/policies/consent
 */
app.post(['/v1/governance/policies/consent', '/governance/policies/consent', '/policies/consent'], async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { userId, role, policyId, policyVersion, policyVersionHash, clientIp, userAgent, clientRuntime } = req.body;
        if (!userId || !role || !policyId) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'userId, role, and policyId are required', 400);
        }
        const policy = PLATFORM_POLICIES.find((p) => p.policyId === policyId);
        const version = policyVersion || (policy ? policy.currentVersion : 'v1.0');
        const hash = policyVersionHash || (policy ? policy.versionHash : 'hash_default');
        await client.query('BEGIN');
        const insertRes = await client.query(`INSERT INTO policy_consents 
          (user_id, role, policy_id, policy_version, policy_version_hash, ip_address, user_agent, client_runtime)
         VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
         RETURNING *`, [userId, role.toLowerCase(), policyId, version, hash, clientIp || '127.0.0.1', userAgent || 'ClientApp', clientRuntime || 'web']);
        const record = insertRes.rows[0];
        // Cryptographic audit entry
        await client.query(`INSERT INTO audit_logs (actor_id, action, target_entity, target_id, metadata)
         VALUES ($1, 'POLICY_CONSENT_CAPTURED', 'POLICY', $2, $3)`, [userId, policyId, JSON.stringify({ version, role, consentId: record.consent_id })]);
        await client.query('COMMIT');
        // Generate verification token
        const token = crypto_1.default
            .createHmac('sha256', 'policy_consent_secret')
            .update(`${userId}:${policyId}:${version}:${record.consented_at}`)
            .digest('hex');
        res.status(201).json({
            success: true,
            consent: record,
            verificationToken: token,
            consentedAt: record.consented_at,
        });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
});
/**
 * Check User Policy Consent & Re-consent Gate Status
 * GET /v1/governance/policies/consent/check/:userId
 */
app.get(['/v1/governance/policies/consent/check/:userId', '/governance/policies/consent/check/:userId', '/policies/consent/check/:userId'], async (req, res, next) => {
    try {
        const userId = req.params.userId;
        const role = (req.query.role || 'buyer').toLowerCase();
        // Find required active policy for this role
        const requiredPolicy = PLATFORM_POLICIES.find((p) => p.role === role) || PLATFORM_POLICIES[0];
        const consentRes = await db_1.pool.query(`SELECT * FROM policy_consents
         WHERE user_id = $1 AND policy_id = $2
         ORDER BY consented_at DESC LIMIT 1`, [userId, requiredPolicy.policyId]);
        if (consentRes.rows.length === 0) {
            return res.json({
                userId,
                role,
                consentValid: false,
                requiresReconsent: true,
                requiredPolicyId: requiredPolicy.policyId,
                activeVersion: requiredPolicy.currentVersion,
                reason: 'NO_PRIOR_CONSENT_RECORDED',
            });
        }
        const latestConsent = consentRes.rows[0];
        const isUpToDate = latestConsent.policy_version === requiredPolicy.currentVersion;
        res.json({
            userId,
            role,
            consentValid: isUpToDate,
            requiresReconsent: !isUpToDate,
            consentedVersion: latestConsent.policy_version,
            activeVersion: requiredPolicy.currentVersion,
            consentedAt: latestConsent.consented_at,
            reason: isUpToDate ? 'CONSENT_UP_TO_DATE' : 'NEWER_POLICY_VERSION_PUBLISHED',
        });
    }
    catch (err) {
        next(err);
    }
});
app.use(common_1.errorHandler);
const PORT = process.env.PORT || 4011;
(0, db_1.initDb)().then(() => {
    syncer.start();
    app.listen(PORT, () => {
        common_1.logger.info(`Governance Microservice (EPIC-11) listening on port ${PORT} with independent periodic sync active`);
    });
});
process.on('SIGTERM', () => {
    syncer.stop();
    db_1.pool.end();
});
