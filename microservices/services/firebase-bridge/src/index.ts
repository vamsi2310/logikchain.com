import express, { Request, Response } from 'express';
import dotenv from 'dotenv';
import { logger } from '@logikchain/common';
import { FirebaseBridge } from './bridge';

dotenv.config();

const app = express();
app.use(express.json({ limit: '10mb' }));

const port = process.env.PORT || 4050;
const bridge = new FirebaseBridge();

// Inbound listeners can be activated via environment flag
if (process.env.ENABLE_INBOUND_LISTENERS === 'true') {
  const ordersServiceUrl = process.env.ORDERS_SERVICE_URL || 'http://orders-service:4002';
  const gigsServiceUrl = process.env.GIGS_SERVICE_URL || 'http://gigs-service:4003';

  // Listen to mobile offline outbox collections
  bridge.setupInboundListener('Orders', ordersServiceUrl, (data) => data._clientSource === 'mobile_offline');
  bridge.setupInboundListener('Gigs', gigsServiceUrl, (data) => data._clientSource === 'mobile_offline');
}

// Health check endpoint
app.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'ok',
    service: 'firebase-bridge',
    timestamp: new Date().toISOString(),
    metrics: bridge.getStats(),
  });
});

// Sync metrics endpoint
app.get('/sync/status', (req: Request, res: Response) => {
  res.json({
    service: 'firebase-bridge',
    stats: bridge.getStats(),
    timestamp: new Date().toISOString(),
  });
});

/**
 * Ingests transactional outbox batches streamed from Rust or TS microservices
 */
app.post('/v1/bridge/outbox', async (req: Request, res: Response) => {
  try {
    const { events } = req.body;
    if (!Array.isArray(events)) {
      return res.status(400).json({ error: 'Missing or invalid "events" array in request body' });
    }

    const result = await bridge.processOutboxBatch(events);
    return res.json({
      status: 'ok',
      syncedCount: result.syncedIds.length,
      failedCount: result.failedIds.length,
      syncedIds: result.syncedIds,
      failedIds: result.failedIds,
    });
  } catch (err: any) {
    logger.error({ err }, 'Error processing outbox batch in bridge');
    return res.status(500).json({ error: err.message || 'Internal bridge processing error' });
  }
});

/**
 * Generates signed upload URL for Cloud Storage
 */
app.post('/v1/bridge/storage/sign-upload', async (req: Request, res: Response) => {
  try {
    const { filePath, contentType, bucketName, expiresInMinutes } = req.body;
    if (!filePath || !contentType) {
      return res.status(400).json({ error: 'filePath and contentType are required' });
    }

    const result = await bridge.generateSignedUploadUrl({
      filePath,
      contentType,
      bucketName,
      expiresInMinutes,
    });
    return res.json(result);
  } catch (err: any) {
    logger.error({ err }, 'Error generating signed upload URL');
    return res.status(500).json({ error: err.message });
  }
});

/**
 * Generates signed download URL for Cloud Storage
 */
app.post('/v1/bridge/storage/sign-download', async (req: Request, res: Response) => {
  try {
    const { filePath, bucketName, expiresInMinutes } = req.body;
    if (!filePath) {
      return res.status(400).json({ error: 'filePath is required' });
    }

    const result = await bridge.generateSignedDownloadUrl({
      filePath,
      bucketName,
      expiresInMinutes,
    });
    return res.json(result);
  } catch (err: any) {
    logger.error({ err }, 'Error generating signed download URL');
    return res.status(500).json({ error: err.message });
  }
});

app.listen(port, () => {
  logger.info({ port }, 'Firebase Sync Bridge listening for microservice outboxes');
});

export default app;

