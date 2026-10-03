import { Pool } from 'pg';
import * as admin from 'firebase-admin';
import { logger } from '@logikchain/common';

export interface SyncerConfig {
  dbPool: Pool;
  firestore: admin.firestore.Firestore;
  batchSize?: number;
}

export class FirestoreSyncer {
  private pool: Pool;
  private firestore: admin.firestore.Firestore;
  private batchSize: number;
  private isRunning: boolean = false;
  private unsubscribeListeners: Array<() => void> = [];

  constructor(config: SyncerConfig) {
    this.pool = config.dbPool;
    this.firestore = config.firestore;
    this.batchSize = config.batchSize || 100;
  }

  /**
   * Outbound sync: Polls microservice PostgreSQL outbox_events and syncs to Cloud Firestore
   */
  public async syncOutboxToFirestore(): Promise<number> {
    const client = await this.pool.connect();
    let processedCount = 0;

    try {
      await client.query('BEGIN');

      const selectQuery = `
        SELECT id, service, aggregate_type, aggregate_id, operation, payload, firestore_collection, firestore_doc_id, retry_count
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
      const updatedEventIds: string[] = [];

      for (const row of res.rows) {
        const docRef = this.firestore.collection(row.firestore_collection).doc(row.firestore_doc_id);
        const data = typeof row.payload === 'string' ? JSON.parse(row.payload) : row.payload;

        const enhancedData = {
          ...data,
          _syncMetadata: {
            syncedFromService: row.service,
            syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            origin: 'microservices-backend',
          },
        };

        if (row.operation === 'INSERT' || row.operation === 'UPDATE') {
          batch.set(docRef, enhancedData, { merge: true });
        } else if (row.operation === 'DELETE') {
          batch.delete(docRef);
        }

        updatedEventIds.push(row.id);
      }

      await batch.commit();

      await client.query(
        `UPDATE outbox_events
         SET sync_status = 'SYNCED', synced_at = NOW()
         WHERE id = ANY($1::uuid[])`,
        [updatedEventIds]
      );

      await client.query('COMMIT');
      processedCount = updatedEventIds.length;
      logger.info({ processedCount }, 'Successfully synced outbox events to Firestore');
    } catch (err: any) {
      await client.query('ROLLBACK');
      logger.error({ err: err.message }, 'Failed during syncOutboxToFirestore');
      throw err;
    } finally {
      client.release();
    }

    return processedCount;
  }

  /**
   * Inbound sync: Real-time listener for Firestore documents modified directly by Mobile/PWA offline clients
   */
  public startInboundFirestoreListeners(collections: string[]): void {
    for (const colName of collections) {
      const unsubscribe = this.firestore
        .collection(colName)
        .where('_syncMetadata.origin', '!=', 'microservices-backend')
        .onSnapshot(
          async (snapshot) => {
            for (const change of snapshot.docChanges()) {
              if (change.type === 'added' || change.type === 'modified') {
                const docData = change.doc.data();
                const docId = change.doc.id;
                await this.ingestInboundFirestoreDoc(colName, docId, docData);
              }
            }
          },
          (err) => {
            logger.error({ colName, err: err.message }, 'Firestore listener error');
          }
        );
      this.unsubscribeListeners.push(unsubscribe);
      logger.info({ colName }, 'Started inbound Firestore listener');
    }
  }

  private async ingestInboundFirestoreDoc(collection: string, docId: string, data: any): Promise<void> {
    try {
      const query = `
        INSERT INTO inbound_firestore_events (collection, doc_id, payload, received_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (collection, doc_id) DO UPDATE
        SET payload = EXCLUDED.payload, received_at = NOW();
      `;
      await this.pool.query(query, [collection, docId, JSON.stringify(data)]);
      logger.debug({ collection, docId }, 'Ingested inbound Firestore document to PostgreSQL');
    } catch (err: any) {
      logger.error({ collection, docId, err: err.message }, 'Failed to ingest inbound document');
    }
  }

  public stop(): void {
    for (const unsub of this.unsubscribeListeners) {
      unsub();
    }
    this.unsubscribeListeners = [];
  }
}
