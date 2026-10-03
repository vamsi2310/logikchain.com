import { Pool } from 'pg';
import * as admin from 'firebase-admin';
import { logger } from './logger';
import { getFirebaseAdmin } from './auth';

export interface SyncerOptions {
  serviceName: string;
  pool: Pool;
  firestoreCollection: string;
  inboundTable?: string;
  idColumn?: string;
  defaultStorageBucket?: string;
  syncIntervalMs?: number;
  batchSize?: number;
}

export interface SyncStats {
  serviceName: string;
  lastSyncAt: string | null;
  totalOutboxSynced: number;
  totalStorageSynced: number;
  totalInboundSynced: number;
  errorsCount: number;
  isListening: boolean;
}

export class PeriodicServiceSyncer {
  private serviceName: string;
  private pool: Pool;
  private firestoreCollection: string;
  private inboundTable?: string;
  private idColumn: string;
  private storageBucketName: string;
  private syncIntervalMs: number;
  private batchSize: number;

  private firestore: admin.firestore.Firestore;
  private storage: admin.storage.Storage;
  private timer: NodeJS.Timeout | null = null;
  private isRunning: boolean = false;
  private unsubscribeInbound: (() => void) | null = null;

  private stats: SyncStats;

  constructor(options: SyncerOptions) {
    this.serviceName = options.serviceName;
    this.pool = options.pool;
    this.firestoreCollection = options.firestoreCollection;
    this.inboundTable = options.inboundTable;
    this.idColumn = options.idColumn || 'id';
    this.syncIntervalMs = options.syncIntervalMs || 2500;
    this.batchSize = options.batchSize || 50;

    const adminApp = getFirebaseAdmin();
    this.firestore = adminApp.firestore();
    this.storage = adminApp.storage();
    this.storageBucketName = options.defaultStorageBucket || process.env.FIREBASE_STORAGE_BUCKET || 'logikchain-dev.appspot.com';

    this.stats = {
      serviceName: this.serviceName,
      lastSyncAt: null,
      totalOutboxSynced: 0,
      totalStorageSynced: 0,
      totalInboundSynced: 0,
      errorsCount: 0,
      isListening: false,
    };
  }

  /**
   * Outbound Firestore sync: Flushes outbox_events to Cloud Firestore
   */
  public async syncOutbox(): Promise<number> {
    const client = await this.pool.connect();
    let processed = 0;

    try {
      await client.query('BEGIN');
      const selectQuery = `
        SELECT id, aggregate_type, aggregate_id, operation, payload, firestore_collection, firestore_doc_id
        FROM outbox_events
        WHERE sync_status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT $1
        FOR UPDATE SKIP LOCKED
      `;
      const res = await client.query(selectQuery, [this.batchSize]);

      if (res.rows.length === 0) {
        await client.query('COMMIT');
        return 0;
      }

      const batch = this.firestore.batch();
      const idsToMarkSynced: string[] = [];

      for (const row of res.rows) {
        const col = row.firestore_collection || this.firestoreCollection;
        const docRef = this.firestore.collection(col).doc(row.firestore_doc_id);
        const data = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;

        const payloadWithMeta = {
          ...data,
          _syncMetadata: {
            origin: this.serviceName,
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
          },
        };

        if (row.operation === 'INSERT' || row.operation === 'UPDATE') {
          batch.set(docRef, payloadWithMeta, { merge: true });
        } else if (row.operation === 'DELETE') {
          batch.delete(docRef);
        }

        idsToMarkSynced.push(row.id);
      }

      await batch.commit();

      await client.query(
        `UPDATE outbox_events
         SET sync_status = 'SYNCED', synced_at = NOW()
         WHERE id = ANY($1::uuid[])`,
        [idsToMarkSynced]
      );

      await client.query('COMMIT');
      processed = idsToMarkSynced.length;
      this.stats.totalOutboxSynced += processed;
      this.stats.lastSyncAt = new Date().toISOString();
    } catch (err: any) {
      await client.query('ROLLBACK');
      this.stats.errorsCount++;
      logger.error({ service: this.serviceName, err: err.message }, 'Failed during microservice outbox sync');
    } finally {
      client.release();
    }

    return processed;
  }

  /**
   * Outbound Firebase Storage sync: Flushes pending local storage attachments to Cloud Storage
   */
  public async syncStorage(): Promise<number> {
    let client;
    try {
      client = await this.pool.connect();
    } catch {
      return 0;
    }

    let processed = 0;
    try {
      // Check if storage_sync_events table exists
      const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables WHERE table_name = 'storage_sync_events'
        )
      `);
      if (!tableCheck.rows[0].exists) {
        client.release();
        return 0;
      }

      await client.query('BEGIN');
      const res = await client.query(`
        SELECT id, bucket_name, storage_path, mime_type, metadata, file_data_base64, operation
        FROM storage_sync_events
        WHERE sync_status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 25
        FOR UPDATE SKIP LOCKED
      `);

      if (res.rows.length === 0) {
        await client.query('COMMIT');
        client.release();
        return 0;
      }

      for (const row of res.rows) {
        const bucket = this.storage.bucket(row.bucket_name || this.storageBucketName);
        const file = bucket.file(row.storage_path);

        if (row.operation === 'UPLOAD' && row.file_data_base64) {
          const buffer = Buffer.from(row.file_data_base64, 'base64');
          await file.save(buffer, {
            contentType: row.mime_type,
            metadata: {
              metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
              syncedFrom: this.serviceName,
            },
          });
        } else if (row.operation === 'DELETE') {
          const [exists] = await file.exists();
          if (exists) await file.delete();
        }

        await client.query(
          `UPDATE storage_sync_events
           SET sync_status = 'SYNCED', synced_at = NOW(), file_data_base64 = NULL
           WHERE id = $1`,
          [row.id]
        );
        processed++;
      }

      await client.query('COMMIT');
      this.stats.totalStorageSynced += processed;
    } catch (err: any) {
      if (client) await client.query('ROLLBACK');
      this.stats.errorsCount++;
      logger.error({ service: this.serviceName, err: err.message }, 'Failed during microservice storage sync');
    } finally {
      if (client) client.release();
    }

    return processed;
  }

  /**
   * Inbound sync: Real-time listener on this service's Firestore collection to ingest offline client writes
   */
  public startInboundListener(): void {
    if (this.unsubscribeInbound || !this.firestoreCollection) return;

    try {
      this.unsubscribeInbound = this.firestore
        .collection(this.firestoreCollection)
        .where('_syncMetadata.origin', '!=', this.serviceName)
        .onSnapshot(
          async (snapshot) => {
            for (const change of snapshot.docChanges()) {
              if (change.type === 'added' || change.type === 'modified') {
                await this.ingestInboundDocument(change.doc.id, change.doc.data());
              }
            }
          },
          (err) => {
            logger.error({ service: this.serviceName, err: err.message }, 'Inbound Firestore listener error');
          }
        );

      this.stats.isListening = true;
      logger.info({ service: this.serviceName, collection: this.firestoreCollection }, 'Started independent inbound Firestore listener');
    } catch (err: any) {
      logger.warn({ service: this.serviceName, err: err.message }, 'Could not attach inbound Firestore listener');
    }
  }

  private async ingestInboundDocument(docId: string, data: any): Promise<void> {
    if (!this.inboundTable) return;
    try {
      const query = `
        INSERT INTO ${this.inboundTable} (${this.idColumn}, status, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (${this.idColumn}) DO UPDATE
        SET status = EXCLUDED.status, updated_at = NOW()
      `;
      await this.pool.query(query, [docId, data.status || 'SYNCED_FROM_CLIENT']);
      this.stats.totalInboundSynced++;
      logger.debug({ service: this.serviceName, docId }, 'Ingested inbound client document to local PostgreSQL');
    } catch (err: any) {
      logger.error({ service: this.serviceName, docId, err: err.message }, 'Failed to ingest inbound document');
    }
  }

  /**
   * Start independent periodic background sync loop
   */
  public start(): void {
    if (this.isRunning) return;
    this.isRunning = true;

    // Start real-time inbound listener
    this.startInboundListener();

    // Start quick periodic outbound polling loop
    const loop = async () => {
      if (!this.isRunning) return;
      try {
        await this.syncOutbox();
        await this.syncStorage();
      } catch (err: any) {
        logger.error({ service: this.serviceName, err: err.message }, 'Periodic sync iteration error');
      }

      if (this.isRunning) {
        this.timer = setTimeout(loop, this.syncIntervalMs);
      }
    };

    this.timer = setTimeout(loop, 1000);
    logger.info({ service: this.serviceName, intervalMs: this.syncIntervalMs }, 'Independent periodic sync engine started');
  }

  /**
   * Stop syncer gracefully
   */
  public stop(): void {
    this.isRunning = false;
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
    }
    if (this.unsubscribeInbound) {
      this.unsubscribeInbound();
      this.unsubscribeInbound = null;
    }
    this.stats.isListening = false;
  }

  public getStats(): SyncStats {
    return { ...this.stats };
  }
}

export function createPeriodicSyncer(options: SyncerOptions): PeriodicServiceSyncer {
  return new PeriodicServiceSyncer(options);
}
