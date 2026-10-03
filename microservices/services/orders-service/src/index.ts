import express from 'express';
import dotenv from 'dotenv';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox } from './db';

dotenv.config();

const app = express();
app.use(express.json());

// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = createPeriodicSyncer({
  serviceName: 'orders-service',
  pool,
  firestoreCollection: 'Orders',
  inboundTable: 'orders',
  idColumn: 'order_id',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});

// Healthcheck
app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'orders-service',
      timestamp: new Date().toISOString(),
      sync: syncer.getStats(),
    });
  } catch (err: any) {
    res.status(500).json({ status: 'degraded', error: err.message });
  }
});

// Sync status and manual trigger endpoints
app.get('/sync/status', (req, res) => {
  res.json(syncer.getStats());
});

app.post('/sync/trigger', async (req, res) => {
  const syncedOutbox = await syncer.syncOutbox();
  const syncedStorage = await syncer.syncStorage();
  res.json({ triggered: true, syncedOutbox, syncedStorage, stats: syncer.getStats() });
});

/**
 * Place Order (Buyer purchase order - CoD / Prepaid)
 */
app.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { buyerId, items, totalAmount, paymentType, deliveryAddress, gigId, merchantId } = req.body;
    const idempotencyKey = req.header('idempotency-key') || req.body.idempotencyKey;
    const orderId = `ord_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

    if (!buyerId || !items || !totalAmount || !paymentType) {
      throw new AppError('INVALID_ARGUMENT', 'Missing mandatory order fields.', 400);
    }

    await client.query('BEGIN');

    // Idempotency check
    if (idempotencyKey) {
      const existing = await client.query('SELECT * FROM orders WHERE idempotency_key = $1', [idempotencyKey]);
      if (existing.rows.length > 0) {
        await client.query('COMMIT');
        res.status(200).json({ order: existing.rows[0], idempotentReplay: true });
        return;
      }
    }

    const insertQuery = `
      INSERT INTO orders (order_id, buyer_id, merchant_id, gig_id, status, payment_type, total_amount, items, delivery_address, idempotency_key)
      VALUES ($1, $2, $3, $4, 'PLACED', $5, $6, $7, $8, $9)
      RETURNING *
    `;
    const result = await client.query(insertQuery, [
      orderId,
      buyerId,
      merchantId || null,
      gigId || null,
      paymentType,
      totalAmount,
      JSON.stringify(items),
      JSON.stringify(deliveryAddress || {}),
      idempotencyKey || null,
    ]);

    const createdOrder = result.rows[0];

    // Emit Outbox event to synchronize with Firestore Orders collection
    await recordOutbox(client, {
      aggregateType: 'Order',
      aggregateId: orderId,
      operation: 'INSERT',
      payload: createdOrder,
      firestoreCollection: 'Orders',
      firestoreDocId: orderId,
    });

    await client.query('COMMIT');
    logger.info({ orderId, buyerId, platform: req.header('x-client-platform') }, 'Order created and queued for immediate periodic Firestore sync');

    res.status(201).json({ order: createdOrder });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Cancel Order
 */
app.post('/:orderId/cancel', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { orderId } = req.params;
    const { reason } = req.body;

    await client.query('BEGIN');
    const updateRes = await client.query(
      `UPDATE orders SET status = 'CANCELLED', updated_at = NOW() WHERE order_id = $1 RETURNING *`,
      [orderId]
    );

    if (updateRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', `Order ${orderId} does not exist.`, 404);
    }

    const updated = updateRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'Order',
      aggregateId: orderId,
      operation: 'UPDATE',
      payload: { ...updated, cancelReason: reason },
      firestoreCollection: 'Orders',
      firestoreDocId: orderId,
    });

    await client.query('COMMIT');
    res.json({ order: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Mark Order Delivered (Physical custody handover finalized)
 */
app.post('/:orderId/deliver', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { orderId } = req.params;
    const { deliveredByDriverId, verificationCode } = req.body;

    await client.query('BEGIN');
    const updateRes = await client.query(
      `UPDATE orders SET status = 'DELIVERED', updated_at = NOW() WHERE order_id = $1 RETURNING *`,
      [orderId]
    );

    if (updateRes.rows.length === 0) {
      throw new AppError('NOT_FOUND', `Order ${orderId} does not exist.`, 404);
    }

    const updated = updateRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'Order',
      aggregateId: orderId,
      operation: 'UPDATE',
      payload: { ...updated, deliveredByDriverId, deliveredAt: new Date().toISOString() },
      firestoreCollection: 'Orders',
      firestoreDocId: orderId,
    });

    await client.query('COMMIT');
    res.json({ order: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Get Order Details
 */
app.get('/:orderId', async (req, res, next) => {
  try {
    const { orderId } = req.params;
    const query = await pool.query('SELECT * FROM orders WHERE order_id = $1', [orderId]);
    if (query.rows.length === 0) {
      throw new AppError('NOT_FOUND', 'Order not found', 404);
    }
    res.json({ order: query.rows[0] });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4002;
initDb().then(() => {
  // Start the service's independent periodic sync to Firestore & Cloud Storage
  syncer.start();

  app.listen(PORT, () => {
    logger.info(`Orders Microservice listening on port ${PORT} with independent periodic sync active`);
  });
});

process.on('SIGTERM', () => {
  syncer.stop();
  pool.end();
});
