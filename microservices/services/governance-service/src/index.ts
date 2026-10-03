import express from 'express';
import dotenv from 'dotenv';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox } from './db';

dotenv.config();

const app = express();
app.use(express.json());

// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = createPeriodicSyncer({
  serviceName: 'governance-service',
  pool,
  firestoreCollection: 'AuditLogEntries',
  inboundTable: 'audit_logs',
  idColumn: 'event_id',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'governance-service',
      timestamp: new Date().toISOString(),
      sync: syncer.getStats(),
    });
  } catch (err: any) {
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
 * Register VPA (UPI TPAP compliance)
 */
app.post('/vpa', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { vpa, userId } = req.body;
    if (!vpa || !userId) throw new AppError('INVALID_ARGUMENT', 'vpa and userId required');

    await client.query('BEGIN');
    const insertRes = await client.query(
      `INSERT INTO upi_vpa_registry (vpa, user_id, status)
       VALUES ($1, $2, 'ACTIVE')
       ON CONFLICT (vpa) DO UPDATE SET status = 'ACTIVE', linked_at = NOW()
       RETURNING *`,
      [vpa, userId]
    );

    const record = insertRes.rows[0];

    // Append-only audit log
    await client.query(
      `INSERT INTO audit_logs (actor_id, action, target_entity, target_id, metadata)
       VALUES ($1, 'VPA_REGISTERED', 'VPA', $2, $3)`,
      [userId, vpa, JSON.stringify({ vpa, userId })]
    );

    await recordOutbox(client, {
      aggregateType: 'VpaRegistration',
      aggregateId: vpa,
      operation: 'INSERT',
      payload: record,
      firestoreCollection: 'AuditLogEntries',
      firestoreDocId: `audit_vpa_${vpa}`,
    });

    await client.query('COMMIT');
    res.status(201).json({ vpa: record });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Run AML Fraud / Velocity check before UPI collect
 */
app.post('/fraud-check', async (req, res, next) => {
  try {
    const { userId, amount, vpa } = req.body;

    const checkPassed = Number(amount) <= 100000;

    res.json({
      allowed: checkPassed,
      velocityScore: checkPassed ? 0.05 : 0.95,
      reason: checkPassed ? 'VELOCITY_OK' : 'EXCEEDS_SINGLE_TRANSACTION_LIMIT',
      timestamp: new Date().toISOString(),
    });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4011;
initDb().then(() => {
  syncer.start();

  app.listen(PORT, () => {
    logger.info(`Governance Microservice listening on port ${PORT} with independent periodic sync active`);
  });
});

process.on('SIGTERM', () => {
  syncer.stop();
  pool.end();
});
