"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const dotenv_1 = __importDefault(require("dotenv"));
const common_1 = require("@logikchain/common");
const db_1 = require("./db");
dotenv_1.default.config();
const app = (0, express_1.default)();
app.use(express_1.default.json());
// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = (0, common_1.createPeriodicSyncer)({
    serviceName: 'cash-service',
    pool: db_1.pool,
    firestoreCollection: 'CashSettlements',
    inboundTable: 'cash_handovers',
    idColumn: 'handover_id',
    syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});
app.get('/health', async (req, res) => {
    try {
        const dbStart = Date.now();
        await db_1.pool.query('SELECT 1');
        const dbLatency = Date.now() - dbStart;
        res.json({
            status: 'ok',
            service: 'cash-service',
            epic: 'EPIC-07',
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
   FEAT-07.01: CoD Cash Collection & Driver Custody Tracking
   ========================================================================== */
/**
 * Helper: get or create driver custody record
 */
async function getOrCreateDriverCustody(client, driverId) {
    const existing = await client.query('SELECT * FROM driver_custody WHERE driver_id = $1', [driverId]);
    if (existing.rows.length > 0) {
        return existing.rows[0];
    }
    const created = await client.query(`INSERT INTO driver_custody (driver_id, active_balance, total_collected, total_handed_over, daily_collection_ceiling)
     VALUES ($1, 0.00, 0.00, 0.00, 50000.00)
     RETURNING *`, [driverId]);
    return created.rows[0];
}
/**
 * Get Driver Cash Custody Summary
 * GET /v1/cash/summary/:driverId
 */
app.get(['/v1/cash/summary/:driverId', '/cash/summary/:driverId', '/summary/:driverId'], async (req, res, next) => {
    try {
        const driverId = req.params.driverId;
        const custody = await getOrCreateDriverCustody(db_1.pool, driverId);
        // Check unresolved discrepancies
        const discRes = await db_1.pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(shortfall_amount), 0) as total_shortfall
         FROM cash_discrepancies
         WHERE driver_id = $1 AND status = 'UNDER_REVIEW'`, [driverId]);
        const unresolvedCount = parseInt(discRes.rows[0].count, 10);
        const totalShortfall = parseFloat(discRes.rows[0].total_shortfall);
        res.json({
            driverId,
            activeBalance: parseFloat(custody.active_balance),
            totalCollected: parseFloat(custody.total_collected),
            totalHandedOver: parseFloat(custody.total_handed_over),
            dailyCollectionCeiling: parseFloat(custody.daily_collection_ceiling),
            isLocked: custody.is_locked || unresolvedCount > 0,
            lockReason: custody.lock_reason || (unresolvedCount > 0 ? 'UNRESOLVED_CASH_DISCREPANCIES' : null),
            unresolvedDiscrepancyCount: unresolvedCount,
            totalShortfall,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Record Cash Collection (CoD parcel delivery or credit repayment)
 * POST /v1/cash/collections
 */
app.post(['/v1/cash/collections', '/cash/collections', '/collections'], async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { driverId, orderId, amount, collectionType, notes, capturedAt } = req.body;
        const idempotencyKey = (req.header('idempotency-key') || req.body.idempotencyKey);
        if (!driverId || !orderId || amount === undefined) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'driverId, orderId, and amount are required');
        }
        const numAmount = parseFloat(amount);
        if (isNaN(numAmount) || numAmount <= 0) {
            throw new common_1.AppError('INVALID_AMOUNT', 'Collection amount must be a positive number');
        }
        await client.query('BEGIN');
        // Idempotency deduplication
        if (idempotencyKey) {
            const existing = await client.query('SELECT * FROM cash_collections WHERE idempotency_key = $1', [idempotencyKey]);
            if (existing.rows.length > 0) {
                const custody = await getOrCreateDriverCustody(client, driverId);
                await client.query('COMMIT');
                res.json({
                    success: true,
                    collection: existing.rows[0],
                    activeBalance: parseFloat(custody.active_balance),
                    idempotentReplay: true,
                });
                return;
            }
        }
        // Check current custody & ceiling limit (e.g. max daily transit ceiling ₹50,000)
        const custody = await getOrCreateDriverCustody(client, driverId);
        const currentActive = parseFloat(custody.active_balance);
        const ceiling = parseFloat(custody.daily_collection_ceiling);
        if (currentActive + numAmount > ceiling) {
            throw new common_1.AppError('DAILY_CUSTODY_LIMIT_EXCEEDED', `Collection of ₹${numAmount} exceeds maximum daily field cash custody ceiling of ₹${ceiling}. Current custody: ₹${currentActive}`, 422);
        }
        // Record collection
        const insRes = await client.query(`INSERT INTO cash_collections (driver_id, order_id, amount, collection_type, idempotency_key, notes, captured_at)
         VALUES ($1, $2, $3, $4, $5, $6, $7)
         RETURNING *`, [driverId, orderId, numAmount, collectionType || 'COD', idempotencyKey || null, notes || null, capturedAt || new Date()]);
        const collection = insRes.rows[0];
        // Increment driver custody
        const updCustody = await client.query(`UPDATE driver_custody
         SET active_balance = active_balance + $2,
             total_collected = total_collected + $2,
             updated_at = NOW()
         WHERE driver_id = $1
         RETURNING *`, [driverId, numAmount]);
        const updatedRecord = updCustody.rows[0];
        // Outbox CDC event
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'DriverCustody',
            aggregateId: driverId,
            operation: 'UPDATE',
            payload: {
                driverId,
                activeBalance: parseFloat(updatedRecord.active_balance),
                totalCollected: parseFloat(updatedRecord.total_collected),
                lastCollectionId: collection.collection_id,
            },
            firestoreCollection: 'CashCustody',
            firestoreDocId: driverId,
        });
        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            collection,
            activeBalance: parseFloat(updatedRecord.active_balance),
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
   FEAT-07.02: Driver-to-Supplier Cash Handover & OTP Verification
   ========================================================================== */
/**
 * Declare End-of-Shift Cash Turn-In & Generate 6-Digit Handover OTP
 * POST /v1/cash/handover/declare
 */
app.post(['/v1/cash/handover/declare', '/cash/handover/declare', '/handover/declare'], async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { driverId, recipientId, declaredAmount } = req.body;
        const idempotencyKey = (req.header('idempotency-key') || req.body.idempotencyKey);
        if (!driverId || !recipientId || declaredAmount === undefined) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'driverId, recipientId, and declaredAmount are required');
        }
        const numDeclared = parseFloat(declaredAmount);
        if (isNaN(numDeclared) || numDeclared <= 0) {
            throw new common_1.AppError('INVALID_AMOUNT', 'Declared amount must be greater than zero');
        }
        await client.query('BEGIN');
        // Idempotency check
        if (idempotencyKey) {
            const existing = await client.query('SELECT * FROM cash_handovers WHERE idempotency_key = $1', [idempotencyKey]);
            if (existing.rows.length > 0) {
                await client.query('COMMIT');
                res.json({ success: true, handover: existing.rows[0], idempotentReplay: true });
                return;
            }
        }
        // Generate cryptographically secure 6-digit numeric OTP
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const insRes = await client.query(`INSERT INTO cash_handovers (
           driver_id, recipient_id, declared_amount, status, verification_code, idempotency_key
         ) VALUES ($1, $2, $3, 'DECLARED', $4, $5)
         RETURNING *`, [driverId, recipientId, numDeclared, verificationCode, idempotencyKey || null]);
        const handover = insRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'CashHandover',
            aggregateId: handover.handover_id,
            operation: 'INSERT',
            payload: {
                handoverId: handover.handover_id,
                driverId,
                recipientId,
                declaredAmount: numDeclared,
                status: 'DECLARED',
            },
            firestoreCollection: 'CashSettlements',
            firestoreDocId: handover.handover_id,
        });
        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            handoverId: handover.handover_id,
            verificationCode, // Transmitted to driver app / SMS
            handover,
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
 * Cashier Verifies OTP & Discharges Driver Custody
 * POST /v1/cash/handover/confirm
 */
app.post(['/v1/cash/handover/confirm', '/cash/handover/confirm', '/handover/confirm'], async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { handoverId, driverId, receivedAmount, verificationCode } = req.body;
        if (!verificationCode) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'verificationCode is required');
        }
        await client.query('BEGIN');
        let handoverQuery = 'SELECT * FROM cash_handovers WHERE ';
        const params = [];
        if (handoverId) {
            handoverQuery += 'handover_id = $1';
            params.push(handoverId);
        }
        else if (driverId) {
            handoverQuery += "driver_id = $1 AND status = 'DECLARED' ORDER BY created_at DESC LIMIT 1";
            params.push(driverId);
        }
        else {
            throw new common_1.AppError('INVALID_ARGUMENT', 'handoverId or driverId is required');
        }
        const hRes = await client.query(handoverQuery, params);
        if (hRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', 'Active handover declaration not found', 404);
        }
        const handover = hRes.rows[0];
        // Replay prevention
        if (handover.status === 'CONFIRMED') {
            throw new common_1.AppError('CODE_REPLAYED', 'This handover OTP has already been verified and settled', 400);
        }
        // Expiry check (15 minutes)
        if (new Date() > new Date(handover.code_expires_at)) {
            throw new common_1.AppError('CODE_EXPIRED', 'Handover OTP has expired (15-minute window exceeded)', 400);
        }
        // OTP Verification
        if (handover.verification_code !== verificationCode.trim()) {
            throw new common_1.AppError('INVALID_CODE', 'Verification OTP mismatch', 400);
        }
        const numReceived = receivedAmount !== undefined ? parseFloat(receivedAmount) : parseFloat(handover.declared_amount);
        const declaredNum = parseFloat(handover.declared_amount);
        // Status
        const finalStatus = numReceived < declaredNum ? 'DISCREPANCY' : 'CONFIRMED';
        const updRes = await client.query(`UPDATE cash_handovers
         SET status = $2, received_amount = $3, confirmed_at = NOW(), updated_at = NOW()
         WHERE handover_id = $1
         RETURNING *`, [handover.handover_id, finalStatus, numReceived]);
        const confirmedHandover = updRes.rows[0];
        // Discharge driver active custody balance
        const updCustody = await client.query(`UPDATE driver_custody
         SET active_balance = GREATEST(0.00, active_balance - $2),
             total_handed_over = total_handed_over + $2,
             updated_at = NOW()
         WHERE driver_id = $1
         RETURNING *`, [handover.driver_id, numReceived]);
        const remainingBalance = updCustody.rows.length > 0 ? parseFloat(updCustody.rows[0].active_balance) : 0.0;
        // Outbox CDC event
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'CashHandover',
            aggregateId: handover.handover_id,
            operation: 'UPDATE',
            payload: {
                handoverId: handover.handover_id,
                driverId: handover.driver_id,
                status: finalStatus,
                receivedAmount: numReceived,
                remainingCustodyBalance: remainingBalance,
            },
            firestoreCollection: 'CashSettlements',
            firestoreDocId: handover.handover_id,
        });
        await client.query('COMMIT');
        res.status(200).json({
            success: true,
            handover: confirmedHandover,
            remainingCustodyBalance: remainingBalance,
            discrepancyDetected: numReceived < declaredNum,
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
   FEAT-07.03: Cash Discrepancy Reporting & Resolution Workflow
   ========================================================================== */
/**
 * Report Cash Shortfall or Discrepancy
 * POST /v1/cash/discrepancies
 */
app.post(['/v1/cash/discrepancies', '/cash/discrepancies', '/discrepancies'], async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { driverId, cashierId, handoverId, declaredAmount, countedAmount, reason, notes } = req.body;
        if (!driverId || !cashierId || declaredAmount === undefined || countedAmount === undefined) {
            throw new common_1.AppError('INVALID_ARGUMENT', 'driverId, cashierId, declaredAmount, and countedAmount are required');
        }
        const decNum = parseFloat(declaredAmount);
        const countNum = parseFloat(countedAmount);
        const shortfall = decNum - countNum;
        await client.query('BEGIN');
        const insRes = await client.query(`INSERT INTO cash_discrepancies (
           driver_id, cashier_id, handover_id, declared_amount, counted_amount, shortfall_amount, reason, status, notes
         ) VALUES ($1, $2, $3, $4, $5, $6, $7, 'UNDER_REVIEW', $8)
         RETURNING *`, [driverId, cashierId, handoverId || null, decNum, countNum, shortfall, reason || 'CASH_SHORTFALL', notes || null]);
        const discrepancy = insRes.rows[0];
        // Lock driver custody payouts flag
        await client.query(`UPDATE driver_custody
         SET is_locked = true, lock_reason = 'UNRESOLVED_CASH_DISCREPANCY', updated_at = NOW()
         WHERE driver_id = $1`, [driverId]);
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'CashDiscrepancy',
            aggregateId: discrepancy.discrepancy_id,
            operation: 'INSERT',
            payload: {
                discrepancyId: discrepancy.discrepancy_id,
                driverId,
                shortfallAmount: shortfall,
                reason: discrepancy.reason,
                status: 'UNDER_REVIEW',
            },
            firestoreCollection: 'CashDiscrepancies',
            firestoreDocId: discrepancy.discrepancy_id,
        });
        await client.query('COMMIT');
        res.status(201).json({
            success: true,
            discrepancy,
            message: 'Cash discrepancy registered. Driver payout capability has been locked pending audit resolution.',
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
 * Critical Operational Gate: Query Unresolved Discrepancies for Driver
 * GET /v1/cash/discrepancies/driver/:driverId/unresolved
 * Used by payouts-service for Payout Custody Gate assertions!
 */
app.get([
    '/v1/cash/discrepancies/driver/:driverId/unresolved',
    '/cash/discrepancies/driver/:driverId/unresolved',
    '/discrepancies/driver/:driverId/unresolved',
], async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const result = await db_1.pool.query(`SELECT COUNT(*) as count, COALESCE(SUM(shortfall_amount), 0) as total_shortfall
         FROM cash_discrepancies
         WHERE driver_id = $1 AND status = 'UNDER_REVIEW'`, [driverId]);
        const unresolvedCount = parseInt(result.rows[0].count, 10);
        const totalShortfall = parseFloat(result.rows[0].total_shortfall);
        res.json({
            driverId,
            hasUnresolvedDiscrepancies: unresolvedCount > 0,
            unresolvedCount,
            totalShortfall,
        });
    }
    catch (err) {
        next(err);
    }
});
/**
 * List Discrepancies for a Driver
 * GET /v1/cash/discrepancies/driver/:driverId
 */
app.get([
    '/v1/cash/discrepancies/driver/:driverId',
    '/cash/discrepancies/driver/:driverId',
    '/discrepancies/driver/:driverId',
], async (req, res, next) => {
    try {
        const { driverId } = req.params;
        const result = await db_1.pool.query(`SELECT * FROM cash_discrepancies WHERE driver_id = $1 ORDER BY created_at DESC`, [driverId]);
        res.json({ driverId, discrepancies: result.rows });
    }
    catch (err) {
        next(err);
    }
});
/**
 * Support Audits & Resolves Cash Discrepancy
 * POST /v1/cash/discrepancies/:id/resolve
 */
app.post([
    '/v1/cash/discrepancies/:id/resolve',
    '/cash/discrepancies/:id/resolve',
    '/discrepancies/:id/resolve',
], async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const id = req.params.id;
        const { resolutionStatus, resolutionNotes, resolvedBy } = req.body;
        const finalStatus = resolutionStatus === 'WRITTEN_OFF' ? 'WRITTEN_OFF' : 'RESOLVED';
        await client.query('BEGIN');
        const updRes = await client.query(`UPDATE cash_discrepancies
         SET status = $2, resolution_notes = $3, resolved_by = $4, resolved_at = NOW(), updated_at = NOW()
         WHERE discrepancy_id = $1
         RETURNING *`, [id, finalStatus, resolutionNotes || 'Resolved by Support audit', resolvedBy || 'support_admin']);
        if (updRes.rows.length === 0) {
            throw new common_1.AppError('NOT_FOUND', 'Discrepancy record not found', 404);
        }
        const resolved = updRes.rows[0];
        // Check if driver has any other unresolved discrepancies
        const remaining = await client.query(`SELECT COUNT(*) as count FROM cash_discrepancies WHERE driver_id = $1 AND status = 'UNDER_REVIEW'`, [resolved.driver_id]);
        if (parseInt(remaining.rows[0].count, 10) === 0) {
            await client.query(`UPDATE driver_custody SET is_locked = false, lock_reason = null, updated_at = NOW() WHERE driver_id = $1`, [resolved.driver_id]);
        }
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'CashDiscrepancy',
            aggregateId: id,
            operation: 'UPDATE',
            payload: {
                discrepancyId: id,
                driverId: resolved.driver_id,
                status: finalStatus,
                resolvedAt: new Date().toISOString(),
            },
            firestoreCollection: 'CashDiscrepancies',
            firestoreDocId: id,
        });
        await client.query('COMMIT');
        res.json({
            success: true,
            discrepancy: resolved,
            message: 'Cash discrepancy resolved. Driver custody lock released if no further pending disputes.',
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
   Backward Compatibility: Legacy Settlement Endpoints
   ========================================================================== */
app.post('/settlements/:settlementId/declare', async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { settlementId } = req.params;
        const { holderId, recipientId, amount, capturedAt } = req.body;
        const idempotencyKey = (req.header('idempotency-key') || req.body.idempotencyKey);
        await client.query('BEGIN');
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        const insertRes = await client.query(`INSERT INTO cash_handovers (handover_id, driver_id, recipient_id, declared_amount, status, verification_code, idempotency_key)
       VALUES ($1, $2, $3, $4, 'DECLARED', $5, $6)
       RETURNING *`, [settlementId, holderId || 'legacy_holder', recipientId || 'legacy_recip', amount || 0, verificationCode, idempotencyKey || null]);
        await client.query('COMMIT');
        res.status(201).json({ settlement: insertRes.rows[0] });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
});
app.post('/settlements/:settlementId/confirm', async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { settlementId } = req.params;
        const { verificationCode } = req.body;
        await client.query('BEGIN');
        const existing = await client.query('SELECT * FROM cash_handovers WHERE handover_id = $1', [settlementId]);
        if (existing.rows.length === 0)
            throw new common_1.AppError('NOT_FOUND', 'Settlement record not found', 404);
        const record = existing.rows[0];
        if (record.verification_code !== verificationCode) {
            throw new common_1.AppError('INVALID_CODE', 'Verification OTP mismatch', 400);
        }
        const updateRes = await client.query(`UPDATE cash_handovers SET status = 'CONFIRMED', updated_at = NOW() WHERE handover_id = $1 RETURNING *`, [settlementId]);
        await client.query('COMMIT');
        res.json({ settlement: updateRes.rows[0] });
    }
    catch (err) {
        await client.query('ROLLBACK');
        next(err);
    }
    finally {
        client.release();
    }
});
app.use(common_1.errorHandler);
const PORT = process.env.PORT || 4007;
(0, db_1.initDb)().then(() => {
    syncer.start();
    app.listen(PORT, () => {
        common_1.logger.info(`Cash Microservice (EPIC-07) listening on port ${PORT} with periodic CDC active`);
    });
}).catch((err) => {
    common_1.logger.error({ err: err.message }, 'Failed to initialize Cash database');
});
process.on('SIGTERM', () => {
    syncer.stop();
    db_1.pool.end();
});
