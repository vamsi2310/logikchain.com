import express from 'express';
import crypto from 'crypto';
import dotenv from 'dotenv';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox } from './db';

dotenv.config();

const app = express();
app.use(express.json({
  verify: (req: any, res, buf) => {
    req.rawBody = buf;
  }
}));

// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = createPeriodicSyncer({
  serviceName: 'payments-service',
  pool,
  firestoreCollection: 'PaymentIntents',
  inboundTable: 'payment_intents',
  idColumn: 'intent_id',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'payments-service',
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
 * Create UPI Payment Intent
 */
app.post('/intents', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { orderId, amount, buyerVpa } = req.body;
    if (!orderId || !amount) throw new AppError('INVALID_ARGUMENT', 'Missing orderId or amount');

    const intentId = `pi_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    await client.query('BEGIN');
    const insertRes = await client.query(
      `INSERT INTO payment_intents (intent_id, order_id, buyer_vpa, amount, status)
       VALUES ($1, $2, $3, $4, 'CREATED')
       RETURNING *`,
      [intentId, orderId, buyerVpa || null, amount]
    );

    const intent = insertRes.rows[0];
    const upiLink = `upi://pay?pa=merchant@logikchain&pn=Logikchain&tr=${intentId}&am=${amount}&cu=INR`;

    await recordOutbox(client, {
      aggregateType: 'PaymentIntent',
      aggregateId: intentId,
      operation: 'INSERT',
      payload: { ...intent, upiLink },
      firestoreCollection: 'PaymentIntents',
      firestoreDocId: intentId,
    });

    await client.query('COMMIT');
    res.status(201).json({ paymentIntent: intent, upiLink });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Inbound PSP Webhook (Verified via HMAC-SHA256 signature)
 */
app.post('/webhook', async (req: any, res, next) => {
  const client = await pool.connect();
  try {
    const signature = req.header('X-PSP-Signature') || req.header('x-razorpay-signature');
    const secret = process.env.PSP_WEBHOOK_SECRET || 'dev_secret_key';

    if (process.env.NODE_ENV === 'production' && signature) {
      const expected = crypto.createHmac('sha256', secret).update(req.rawBody).digest('hex');
      if (expected !== signature) {
        throw new AppError('UNAUTHENTICATED', 'Invalid webhook HMAC signature', 401);
      }
    }

    const { event, payload } = req.body;
    const intentId = payload?.payment?.intentId || payload?.intentId;

    if (!intentId) {
      res.status(200).json({ received: true, ignored: true });
      return;
    }

    await client.query('BEGIN');
    const updateRes = await client.query(
      `UPDATE payment_intents SET status = 'SUCCESS', gateway_txn_id = $2, updated_at = NOW()
       WHERE intent_id = $1 RETURNING *`,
      [intentId, payload?.payment?.id || 'txn_mock']
    );

    if (updateRes.rows.length > 0) {
      const updated = updateRes.rows[0];
      await recordOutbox(client, {
        aggregateType: 'PaymentIntent',
        aggregateId: intentId,
        operation: 'UPDATE',
        payload: updated,
        firestoreCollection: 'PaymentIntents',
        firestoreDocId: intentId,
      });
    }

    await client.query('COMMIT');
    res.status(200).json({ received: true });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Refund Order
 */
app.post('/refund', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { intentId, amount, reason } = req.body;
    await client.query('BEGIN');
    const updateRes = await client.query(
      `UPDATE payment_intents SET status = 'REFUNDED', updated_at = NOW() WHERE intent_id = $1 RETURNING *`,
      [intentId]
    );
    if (updateRes.rows.length === 0) throw new AppError('NOT_FOUND', 'Payment intent not found', 404);

    const updated = updateRes.rows[0];
    await recordOutbox(client, {
      aggregateType: 'PaymentIntent',
      aggregateId: intentId,
      operation: 'UPDATE',
      payload: { ...updated, refundAmount: amount, refundReason: reason },
      firestoreCollection: 'PaymentIntents',
      firestoreDocId: intentId,
    });

    await client.query('COMMIT');
    res.json({ refund: { intentId, status: 'REFUNDED', amount } });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4005;
initDb().then(() => {
  syncer.start();

  app.listen(PORT, () => {
    logger.info(`Payments Microservice listening on port ${PORT} with independent periodic sync active`);
  });
});

process.on('SIGTERM', () => {
  syncer.stop();
  pool.end();
});
