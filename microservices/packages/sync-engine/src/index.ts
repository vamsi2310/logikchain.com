import express from 'express';
import { Pool } from 'pg';
import * as admin from 'firebase-admin';
import dotenv from 'dotenv';
import { logger } from '@logikchain/common';
import { FirestoreSyncer } from './firestore-syncer';
import { StorageSyncer } from './storage-syncer';

dotenv.config();

if (admin.apps.length === 0) {
  admin.initializeApp();
}

const pool = new Pool({
  connectionString: process.env.DATABASE_URL || 'postgresql://postgres:postgres@localhost:5432/sync_db',
  max: 10,
});

const firestore = admin.firestore();
const storage = admin.storage();
const defaultBucketName = process.env.FIREBASE_STORAGE_BUCKET || 'logikchain-dev.appspot.com';

const firestoreSyncer = new FirestoreSyncer({ dbPool: pool, firestore, batchSize: 50 });
const storageSyncer = new StorageSyncer({ dbPool: pool, storage, defaultBucketName });

// Start real-time inbound listeners for core mobile-synchronized collections
firestoreSyncer.startInboundFirestoreListeners([
  'Orders',
  'Gigs',
  'CashSettlements',
  'CustodyTransfers',
]);

let isRunning = true;

async function pollLoop() {
  while (isRunning) {
    try {
      await firestoreSyncer.syncOutboxToFirestore();
      await storageSyncer.syncPendingStorageEvents();
    } catch (err: any) {
      logger.error({ err: err.message }, 'Error in sync engine polling loop');
    }
    await new Promise((resolve) => setTimeout(resolve, parseInt(process.env.SYNC_INTERVAL_MS || '3000', 10)));
  }
}

pollLoop().catch((err) => logger.fatal(err, 'Sync engine crashed'));

const app = express();
app.use(express.json());

app.get('/health', async (req, res) => {
  try {
    await pool.query('SELECT 1');
    res.status(200).json({ status: 'ok', service: 'sync-engine', timestamp: new Date().toISOString() });
  } catch (err: any) {
    res.status(500).json({ status: 'degraded', error: err.message });
  }
});

const PORT = process.env.PORT || 4050;
app.listen(PORT, () => {
  logger.info(`Sync Engine service listening on port ${PORT}`);
});

process.on('SIGTERM', () => {
  logger.info('Shutting down sync engine gracefully...');
  isRunning = false;
  firestoreSyncer.stop();
  pool.end();
  process.exit(0);
});
