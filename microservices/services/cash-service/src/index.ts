import express from 'express';
import dotenv from 'dotenv';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox } from './db';

dotenv.config();

const app = express();
app.use(express.json());

// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = createPeriodicSyncer({
  serviceName: 'cash-service',
  pool,
  firestoreCollection: 'CashSettlements',
  inboundTable: 'cash_settlements',
  idColumn: 'settlement_id',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'cash-service',
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
 * Declare Cash Handover (Driver handing physical cash to hub/merchant)
 */
app.post('/settlements/:settlementId/declare', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { settlementId } = req.params;
    const { holderId, recipientId, amount, capturedAt } = req.body;
    const idempotencyKey = req.header('idempotency-key') || req.body.idempotencyKey;

    await client.query('BEGIN');

    if (idempotencyKey) {
      const existing = await client.query('SELECT * FROM cash_settlements WHERE idempotency_key = $1', [idempotencyKey]);
      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        res.json({ settlement: existing.rows[0], idempotentReplay: true });
        return;
      }
    }

    const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();

    const insertRes = await client.query(
      `INSERT INTO cash_settlements (settlement_id, holder_id, recipient_id, amount, status, verification_code, idempotency_key, captured_at)
       VALUES ($1, $2, $3, $4, 'DECLARED', $5, $6, $7)
       RETURNING *`,
      [settlementId, holderId, recipientId, amount, verificationCode, idempotencyKey || null, capturedAt || new Date()]
    );

    const settlement = insertRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'CashSettlement',
      aggregateId: settlementId,
      operation: 'INSERT',
      payload: settlement,
      firestoreCollection: 'CashSettlements',
      firestoreDocId: settlementId,
    });

    await client.query('COMMIT');
    res.status(201).json({ settlement });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Confirm Cash Settlement with verification OTP
 */
app.post('/settlements/:settlementId/confirm', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { settlementId } = req.params;
    const { verificationCode } = req.body;

    await client.query('BEGIN');
    const existing = await client.query('SELECT * FROM cash_settlements WHERE settlement_id = $1', [settlementId]);
    if (existing.rows.length === 0) throw new AppError('NOT_FOUND', 'Settlement record not found', 404);

    const record = existing.rows[0];
    if (record.verification_code !== verificationCode) {
      throw new AppError('INVALID_CODE', 'Verification OTP mismatch', 400);
    }

    const updateRes = await client.query(
      `UPDATE cash_settlements SET status = 'CONFIRMED', updated_at = NOW() WHERE settlement_id = $1 RETURNING *`,
      [settlementId]
    );

    const updated = updateRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'CashSettlement',
      aggregateId: settlementId,
      operation: 'UPDATE',
      payload: updated,
      firestoreCollection: 'CashSettlements',
      firestoreDocId: settlementId,
    });

    await client.query('COMMIT');
    res.json({ settlement: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4007;
initDb().then(() => {
  syncer.start();

  app.listen(PORT, () => {
    logger.info(`Cash Microservice listening on port ${PORT} with independent periodic sync active`);
  });
});

process.on('SIGTERM', () => {
  syncer.stop();
  pool.end();
});
