import express from 'express';
import dotenv from 'dotenv';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox } from './db';

dotenv.config();

const app = express();
app.use(express.json());

// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = createPeriodicSyncer({
  serviceName: 'config-service',
  pool,
  firestoreCollection: 'Villages',
  inboundTable: 'villages',
  idColumn: 'village_id',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'config-service',
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
 * Upsert Village with Google Maps coordinates and pincode
 */
app.post('/villages', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { villageId, name, districtId, stateId, pincode, geoLocation } = req.body;
    if (!villageId || !name || !pincode) throw new AppError('INVALID_ARGUMENT', 'villageId, name, pincode required');

    await client.query('BEGIN');
    const upsertRes = await client.query(
      `INSERT INTO villages (village_id, name, district_id, state_id, pincode, geo_location, updated_at)
       VALUES ($1, $2, $3, $4, $5, $6, NOW())
       ON CONFLICT (village_id) DO UPDATE
       SET name = EXCLUDED.name, pincode = EXCLUDED.pincode, geo_location = EXCLUDED.geo_location, updated_at = NOW()
       RETURNING *`,
      [villageId, name, districtId || '', stateId || '', pincode, JSON.stringify(geoLocation || {})]
    );

    const village = upsertRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'Village',
      aggregateId: villageId,
      operation: 'UPDATE',
      payload: village,
      firestoreCollection: 'Villages',
      firestoreDocId: villageId,
    });

    await client.query('COMMIT');
    res.json({ village });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Public catalog lookup (Plans, Villages, Tariffs)
 */
app.get('/catalog', async (req, res, next) => {
  try {
    const villages = await pool.query('SELECT * FROM villages WHERE status = \'ACTIVE\' LIMIT 100');
    const plans = await pool.query('SELECT * FROM subscription_plans WHERE status = \'ACTIVE\'');
    res.json({ villages: villages.rows, plans: plans.rows });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4010;
initDb().then(() => {
  syncer.start();

  app.listen(PORT, () => {
    logger.info(`Config Microservice listening on port ${PORT} with independent periodic sync active`);
  });
});

process.on('SIGTERM', () => {
  syncer.stop();
  pool.end();
});
