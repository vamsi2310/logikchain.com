import express from 'express';
import dotenv from 'dotenv';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox } from './db';

dotenv.config();

const app = express();
app.use(express.json());

// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = createPeriodicSyncer({
  serviceName: 'pamphlet-service',
  pool,
  firestoreCollection: 'Pamphlets',
  inboundTable: 'gig_pamphlets',
  idColumn: 'pamphlet_id',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'pamphlet-service',
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
 * Create Gig Pamphlet (keyed as {vehicleId}_{startDatetime})
 */
app.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { vehicleId, startDatetime, supplierId, stockItems } = req.body;
    if (!vehicleId || !startDatetime || !supplierId) {
      throw new AppError('INVALID_ARGUMENT', 'vehicleId, startDatetime, and supplierId required');
    }

    const isoDate = new Date(startDatetime).toISOString().replace(/[:.]/g, '-');
    const pamphletId = `pam_${vehicleId}_${isoDate}`;

    await client.query('BEGIN');
    const insertRes = await client.query(
      `INSERT INTO gig_pamphlets (pamphlet_id, vehicle_id, start_datetime, supplier_id, status, stock_items)
       VALUES ($1, $2, $3, $4, 'OPEN', $5)
       ON CONFLICT (pamphlet_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [pamphletId, vehicleId, startDatetime, supplierId, JSON.stringify(stockItems || [])]
    );

    const pamphlet = insertRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'Pamphlet',
      aggregateId: pamphletId,
      operation: 'INSERT',
      payload: pamphlet,
      firestoreCollection: 'Pamphlets',
      firestoreDocId: pamphletId,
    });

    await client.query('COMMIT');
    res.status(201).json({ pamphlet });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Load Stock onto vehicle manifest
 */
app.post('/:pamphletId/load', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { pamphletId } = req.params;
    const { items } = req.body;

    await client.query('BEGIN');
    const current = await client.query('SELECT stock_items FROM gig_pamphlets WHERE pamphlet_id = $1', [pamphletId]);
    if (current.rows.length === 0) throw new AppError('NOT_FOUND', 'Pamphlet manifest not found', 404);

    const existingItems = current.rows[0].stock_items || [];
    const mergedItems = [...existingItems, ...items];

    const updateRes = await client.query(
      `UPDATE gig_pamphlets SET stock_items = $2, updated_at = NOW() WHERE pamphlet_id = $1 RETURNING *`,
      [pamphletId, JSON.stringify(mergedItems)]
    );

    const updated = updateRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'Pamphlet',
      aggregateId: pamphletId,
      operation: 'UPDATE',
      payload: updated,
      firestoreCollection: 'Pamphlets',
      firestoreDocId: pamphletId,
    });

    await client.query('COMMIT');
    res.json({ pamphlet: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Close Pamphlet
 */
app.post('/:pamphletId/close', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { pamphletId } = req.params;
    await client.query('BEGIN');
    const updateRes = await client.query(
      `UPDATE gig_pamphlets SET status = 'CLOSED', updated_at = NOW() WHERE pamphlet_id = $1 RETURNING *`,
      [pamphletId]
    );
    if (updateRes.rows.length === 0) throw new AppError('NOT_FOUND', 'Pamphlet not found', 404);

    const updated = updateRes.rows[0];
    await recordOutbox(client, {
      aggregateType: 'Pamphlet',
      aggregateId: pamphletId,
      operation: 'UPDATE',
      payload: updated,
      firestoreCollection: 'Pamphlets',
      firestoreDocId: pamphletId,
    });

    await client.query('COMMIT');
    res.json({ pamphlet: updated });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4004;
initDb().then(() => {
  syncer.start();

  app.listen(PORT, () => {
    logger.info(`Pamphlet Microservice listening on port ${PORT} with independent periodic sync active`);
  });
});

process.on('SIGTERM', () => {
  syncer.stop();
  pool.end();
});
