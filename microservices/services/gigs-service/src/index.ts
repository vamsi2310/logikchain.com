import express from 'express';
import dotenv from 'dotenv';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox } from './db';

dotenv.config();

const app = express();
app.use(express.json());

// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = createPeriodicSyncer({
  serviceName: 'gigs-service',
  pool,
  firestoreCollection: 'Gigs',
  inboundTable: 'gigs',
  idColumn: 'gig_id',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'gigs-service',
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
 * Compose Gig (vehicleId + startDatetime forms canonical gig ID)
 */
app.post('/', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { vehicleId, driverId, startDatetime, stops } = req.body;
    if (!vehicleId || !driverId || !startDatetime) {
      throw new AppError('INVALID_ARGUMENT', 'Mandatory fields: vehicleId, driverId, startDatetime');
    }

    const isoDate = new Date(startDatetime).toISOString().replace(/[:.]/g, '-');
    const gigId = `gig_${vehicleId}_${isoDate}`;

    await client.query('BEGIN');
    const insertRes = await client.query(
      `INSERT INTO gigs (gig_id, vehicle_id, driver_id, start_datetime, status, stops)
       VALUES ($1, $2, $3, $4, 'PLANNED', $5)
       ON CONFLICT (gig_id) DO UPDATE SET updated_at = NOW()
       RETURNING *`,
      [gigId, vehicleId, driverId, startDatetime, JSON.stringify(stops || [])]
    );

    const gig = insertRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'Gig',
      aggregateId: gigId,
      operation: 'INSERT',
      payload: gig,
      firestoreCollection: 'Gigs',
      firestoreDocId: gigId,
    });

    await client.query('COMMIT');
    logger.info({ gigId, vehicleId, driverId }, 'Composed Gig successfully');
    res.status(201).json({ gig });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Start Gig (Driver official loop - Android Play Integrity required)
 */
app.post('/:gigId/start', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { gigId } = req.params;
    const clientPlatform = req.header('x-client-platform');

    if (clientPlatform === 'web' && process.env.NODE_ENV === 'production') {
      throw new AppError('CLIENT_NOT_OFFICIAL', 'Vehicle driving operations must run via the official Android app.', 403);
    }

    await client.query('BEGIN');
    const updateRes = await client.query(
      `UPDATE gigs SET status = 'IN_TRANSIT', updated_at = NOW() WHERE gig_id = $1 RETURNING *`,
      [gigId]
    );

    if (updateRes.rows.length === 0) throw new AppError('NOT_FOUND', 'Gig not found', 404);

    const gig = updateRes.rows[0];
    await recordOutbox(client, {
      aggregateType: 'Gig',
      aggregateId: gigId,
      operation: 'UPDATE',
      payload: gig,
      firestoreCollection: 'Gigs',
      firestoreDocId: gigId,
    });

    await client.query('COMMIT');
    res.json({ gig });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Update Gig Location (GPS breadcrumbs from Driver device)
 */
app.patch('/:gigId/location', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { gigId } = req.params;
    const { lat, lng, speed, bearing } = req.body;

    const locPayload = { lat, lng, speed, bearing, timestamp: new Date().toISOString() };

    await client.query('BEGIN');
    const updateRes = await client.query(
      `UPDATE gigs SET current_location = $2, updated_at = NOW() WHERE gig_id = $1 RETURNING *`,
      [gigId, JSON.stringify(locPayload)]
    );

    if (updateRes.rows.length === 0) throw new AppError('NOT_FOUND', 'Gig not found', 404);

    const gig = updateRes.rows[0];
    await recordOutbox(client, {
      aggregateType: 'Gig',
      aggregateId: gigId,
      operation: 'UPDATE',
      payload: { gigId, currentLocation: locPayload },
      firestoreCollection: 'Gigs',
      firestoreDocId: gigId,
    });

    await client.query('COMMIT');
    res.json({ success: true, gigId, location: locPayload });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Complete & Finalize Gig
 */
app.post('/:gigId/complete', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { gigId } = req.params;

    await client.query('BEGIN');
    const updateRes = await client.query(
      `UPDATE gigs SET status = 'COMPLETED', updated_at = NOW() WHERE gig_id = $1 RETURNING *`,
      [gigId]
    );

    if (updateRes.rows.length === 0) throw new AppError('NOT_FOUND', 'Gig not found', 404);

    const gig = updateRes.rows[0];
    await recordOutbox(client, {
      aggregateType: 'Gig',
      aggregateId: gigId,
      operation: 'UPDATE',
      payload: gig,
      firestoreCollection: 'Gigs',
      firestoreDocId: gigId,
    });

    await client.query('COMMIT');
    res.json({ gig });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4003;
initDb().then(() => {
  syncer.start();

  app.listen(PORT, () => {
    logger.info(`Gigs Microservice listening on port ${PORT} with independent periodic sync active`);
  });
});

process.on('SIGTERM', () => {
  syncer.stop();
  pool.end();
});
