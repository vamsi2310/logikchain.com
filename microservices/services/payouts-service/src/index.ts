import express from 'express';
import dotenv from 'dotenv';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox } from './db';

dotenv.config();

const app = express();
app.use(express.json());

// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = createPeriodicSyncer({
  serviceName: 'payouts-service',
  pool,
  firestoreCollection: 'PayoutTransactions',
  inboundTable: 'payout_requests',
  idColumn: 'payout_id',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'payouts-service',
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
 * Request Payout (Driver earnings / Supplier settlement)
 */
app.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { beneficiaryId, recipientType, amount, accountDetails } = req.body;
    if (!beneficiaryId || !recipientType || !amount) {
      throw new AppError('INVALID_ARGUMENT', 'beneficiaryId, recipientType, and amount required');
    }

    const payoutId = `pay_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const encryptedAccount = Buffer.from(JSON.stringify(accountDetails || {})).toString('base64');

    await client.query('BEGIN');
    const insertRes = await client.query(
      `INSERT INTO payout_requests (payout_id, beneficiary_id, recipient_type, amount, status, encrypted_account_details)
       VALUES ($1, $2, $3, $4, 'REQUESTED', $5)
       RETURNING *`,
      [payoutId, beneficiaryId, recipientType, amount, encryptedAccount]
    );

    const payout = insertRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'PayoutRequest',
      aggregateId: payoutId,
      operation: 'INSERT',
      payload: { ...payout, encrypted_account_details: '[ENCRYPTED_KMS]' },
      firestoreCollection: 'PayoutTransactions',
      firestoreDocId: payoutId,
    });

    await client.query('COMMIT');
    res.status(201).json({ payout: { ...payout, encrypted_account_details: undefined } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Review Payout Request (Approve or Reject by Finance team)
 */
app.patch('/:payoutId', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { payoutId } = req.params;
    const { status, remarks } = req.body;

    if (!['APPROVED', 'REJECTED'].includes(status)) {
      throw new AppError('INVALID_ARGUMENT', 'Status must be APPROVED or REJECTED');
    }

    await client.query('BEGIN');
    const updateRes = await client.query(
      `UPDATE payout_requests SET status = $2, updated_at = NOW() WHERE payout_id = $1 RETURNING *`,
      [payoutId, status]
    );

    if (updateRes.rows.length === 0) throw new AppError('NOT_FOUND', 'Payout not found', 404);

    const updated = updateRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'PayoutRequest',
      aggregateId: payoutId,
      operation: 'UPDATE',
      payload: { ...updated, remarks },
      firestoreCollection: 'PayoutTransactions',
      firestoreDocId: payoutId,
    });

    await client.query('COMMIT');
    res.json({ payout: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4006;
initDb().then(() => {
  syncer.start();

  app.listen(PORT, () => {
    logger.info(`Payouts Microservice listening on port ${PORT} with independent periodic sync active`);
  });
});

process.on('SIGTERM', () => {
  syncer.stop();
  pool.end();
});
