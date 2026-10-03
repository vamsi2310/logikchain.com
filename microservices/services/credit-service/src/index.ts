import express from 'express';
import dotenv from 'dotenv';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox } from './db';

dotenv.config();

const app = express();
app.use(express.json());

// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = createPeriodicSyncer({
  serviceName: 'credit-service',
  pool,
  firestoreCollection: 'CreditProfiles',
  inboundTable: 'merchant_credit_profiles',
  idColumn: 'merchant_id',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'credit-service',
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
 * Set Merchant Credit Limit
 */
app.put('/merchants/:merchantId/limit', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { merchantId } = req.params;
    const { creditLimit } = req.body;

    if (creditLimit === undefined || creditLimit < 0) {
      throw new AppError('INVALID_ARGUMENT', 'Valid creditLimit required');
    }

    await client.query('BEGIN');
    const upsertRes = await client.query(
      `INSERT INTO merchant_credit_profiles (merchant_id, credit_limit, updated_at)
       VALUES ($1, $2, NOW())
       ON CONFLICT (merchant_id) DO UPDATE SET credit_limit = EXCLUDED.credit_limit, updated_at = NOW()
       RETURNING *`,
      [merchantId, creditLimit]
    );

    const profile = upsertRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'CreditProfile',
      aggregateId: merchantId,
      operation: 'UPDATE',
      payload: profile,
      firestoreCollection: 'CreditProfiles',
      firestoreDocId: merchantId,
    });

    await client.query('COMMIT');
    res.json({ profile });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Initiate Credit Repayment (Blocked offline)
 */
app.post('/repayments', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { merchantId, amount } = req.body;
    if (!merchantId || !amount) throw new AppError('INVALID_ARGUMENT', 'merchantId and amount required');

    await client.query('BEGIN');
    const updateRes = await client.query(
      `UPDATE merchant_credit_profiles
       SET utilized_credit = GREATEST(0.00, utilized_credit - $2), updated_at = NOW()
       WHERE merchant_id = $1 RETURNING *`,
      [merchantId, amount]
    );

    if (updateRes.rows.length === 0) throw new AppError('NOT_FOUND', 'Merchant profile not found', 404);

    const updated = updateRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'CreditProfile',
      aggregateId: merchantId,
      operation: 'UPDATE',
      payload: updated,
      firestoreCollection: 'CreditProfiles',
      firestoreDocId: merchantId,
    });

    await client.query('COMMIT');
    res.json({ profile: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4008;
initDb().then(() => {
  syncer.start();

  app.listen(PORT, () => {
    logger.info(`Credit Microservice listening on port ${PORT} with independent periodic sync active`);
  });
});

process.on('SIGTERM', () => {
  syncer.stop();
  pool.end();
});
