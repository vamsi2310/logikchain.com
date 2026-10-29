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
    serviceName: 'finance-service',
    pool: db_1.pool,
    firestoreCollection: 'ReconciliationRuns',
    inboundTable: 'reconciliation_runs',
    idColumn: 'run_id',
    syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});
app.get('/health', async (req, res) => {
    try {
        await db_1.pool.query('SELECT 1');
        res.json({
            status: 'ok',
            service: 'finance-service',
            timestamp: new Date().toISOString(),
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
/**
 * Run Daily Reconciliation Engine
 */
app.post('/reconciliations/run', async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { periodStart, periodEnd } = req.body;
        const runId = `rec_${Date.now()}`;
        await client.query('BEGIN');
        const insertRes = await client.query(`INSERT INTO reconciliation_runs (run_id, period_start, period_end, status)
       VALUES ($1, $2, $3, 'COMPLETED')
       RETURNING *`, [runId, periodStart || new Date(Date.now() - 86400000), periodEnd || new Date()]);
        const record = insertRes.rows[0];
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'ReconciliationRun',
            aggregateId: runId,
            operation: 'INSERT',
            payload: record,
            firestoreCollection: 'ReconciliationRuns',
            firestoreDocId: runId,
        });
        await client.query('COMMIT');
        res.status(201).json({ reconciliation: record });
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
 * Record TDS Challan
 */
app.post('/tds/challans', async (req, res, next) => {
    const client = await db_1.pool.connect();
    try {
        const { taxPeriod, bsrCode, challanNumber, amount } = req.body;
        const challanId = `tds_${challanNumber}`;
        await client.query('BEGIN');
        const insertRes = await client.query(`INSERT INTO tds_challans (challan_id, tax_period, bsr_code, challan_number, amount)
       VALUES ($1, $2, $3, $4, $5)
       ON CONFLICT (challan_id) DO NOTHING
       RETURNING *`, [challanId, taxPeriod, bsrCode, challanNumber, amount]);
        const challan = insertRes.rows[0] || { challan_id: challanId, taxPeriod, amount };
        await (0, db_1.recordOutbox)(client, {
            aggregateType: 'TdsChallan',
            aggregateId: challanId,
            operation: 'INSERT',
            payload: challan,
            firestoreCollection: 'TdsChallans',
            firestoreDocId: challanId,
        });
        await client.query('COMMIT');
        res.status(201).json({ challan });
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
const PORT = process.env.PORT || 4009;
(0, db_1.initDb)().then(() => {
    syncer.start();
    app.listen(PORT, () => {
        common_1.logger.info(`Finance Microservice listening on port ${PORT} with independent periodic sync active`);
    });
});
process.on('SIGTERM', () => {
    syncer.stop();
    db_1.pool.end();
});
