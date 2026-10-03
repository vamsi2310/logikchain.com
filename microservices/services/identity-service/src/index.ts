import express from 'express';
import dotenv from 'dotenv';
import * as admin from 'firebase-admin';
import { logger, AppError, errorHandler, createPeriodicSyncer } from '@logikchain/common';
import { pool, initDb, recordOutbox } from './db';

dotenv.config();

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const app = express();
app.use(express.json());

// Independent Periodic Sync to Firestore & Firebase Storage
const syncer = createPeriodicSyncer({
  serviceName: 'identity-service',
  pool,
  firestoreCollection: 'UserProfiles',
  inboundTable: 'user_profiles',
  idColumn: 'user_id',
  syncIntervalMs: parseInt(process.env.SYNC_INTERVAL_MS || '2000', 10),
});

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({
      status: 'ok',
      service: 'identity-service',
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
 * Update user role & set Firebase custom claims
 */
app.post('/buyer/:buyerId/role', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { buyerId } = req.params;
    const { targetRole } = req.body;

    if (!['merchant', 'driver', 'supplier', 'support'].includes(targetRole)) {
      throw new AppError('INVALID_ARGUMENT', `Unsupported role: ${targetRole}`);
    }

    await client.query('BEGIN');

    await admin.auth().setCustomUserClaims(buyerId, { role: targetRole, status: 'active' });

    const upsertRes = await client.query(
      `INSERT INTO user_profiles (user_id, role, status, updated_at)
       VALUES ($1, $2, 'active', NOW())
       ON CONFLICT (user_id) DO UPDATE
       SET role = EXCLUDED.role, status = 'active', updated_at = NOW()
       RETURNING *`,
      [buyerId, targetRole]
    );

    const profile = upsertRes.rows[0];

    await recordOutbox(client, {
      aggregateType: 'UserProfile',
      aggregateId: buyerId,
      operation: 'UPDATE',
      payload: profile,
      firestoreCollection: 'UserProfiles',
      firestoreDocId: buyerId,
    });

    await client.query('COMMIT');
    logger.info({ userId: buyerId, targetRole }, 'Successfully converted user role and updated claims');
    res.json({ user: profile });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Suspend user
 */
app.post('/users/:userId/suspension', async (req, res, next) => {
  const client = await pool.connect();
  try {
    const { userId } = req.params;
    const { reason } = req.body;

    await client.query('BEGIN');
    const existingClaims = (await admin.auth().getUser(userId)).customClaims || {};
    await admin.auth().setCustomUserClaims(userId, { ...existingClaims, status: 'suspended' });

    const updateRes = await client.query(
      `UPDATE user_profiles SET status = 'suspended', updated_at = NOW() WHERE user_id = $1 RETURNING *`,
      [userId]
    );

    await recordOutbox(client, {
      aggregateType: 'UserProfile',
      aggregateId: userId,
      operation: 'UPDATE',
      payload: { userId, status: 'suspended', reason },
      firestoreCollection: 'UserProfiles',
      firestoreDocId: userId,
    });

    await client.query('COMMIT');
    res.json({ status: 'suspended', userId });
  } catch (err) {
    await client.query('ROLLBACK');
    next(err);
  } finally {
    client.release();
  }
});

/**
 * Register mobile/PWA FCM device token
 */
app.post('/device-tokens', async (req, res, next) => {
  try {
    const { userId, token } = req.body;
    if (!userId || !token) throw new AppError('INVALID_ARGUMENT', 'Missing userId or token');

    await pool.query(
      `UPDATE user_profiles
       SET device_tokens = array_append(array_remove(device_tokens, $2), $2), updated_at = NOW()
       WHERE user_id = $1`,
      [userId, token]
    );

    res.json({ success: true, userId });
  } catch (err) {
    next(err);
  }
});

app.use(errorHandler);

const PORT = process.env.PORT || 4001;
initDb().then(() => {
  syncer.start();

  app.listen(PORT, () => {
    logger.info(`Identity Microservice listening on port ${PORT} with independent periodic sync active`);
  });
});

process.on('SIGTERM', () => {
  syncer.stop();
  pool.end();
});
