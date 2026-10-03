import { Pool } from 'pg';
import * as admin from 'firebase-admin';
import { logger } from '@logikchain/common';

export interface StorageSyncerConfig {
  dbPool: Pool;
  storage: admin.storage.Storage;
  defaultBucketName: string;
}

export class StorageSyncer {
  private pool: Pool;
  private storage: admin.storage.Storage;
  private defaultBucketName: string;

  constructor(config: StorageSyncerConfig) {
    this.pool = config.dbPool;
    this.storage = config.storage;
    this.defaultBucketName = config.defaultBucketName;
  }

  /**
   * Syncs file uploads recorded in the storage_sync_events table to Firebase Storage
   */
  public async syncPendingStorageEvents(): Promise<number> {
    const client = await this.pool.connect();
    let processed = 0;

    try {
      await client.query('BEGIN');
      const selectQuery = `
        SELECT id, service, bucket_name, storage_path, mime_type, metadata, file_data_base64, operation
        FROM storage_sync_events
        WHERE sync_status = 'PENDING'
        ORDER BY created_at ASC
        LIMIT 50
        FOR UPDATE SKIP LOCKED
      `;
      const res = await client.query(selectQuery);

      if (res.rows.length === 0) {
        await client.query('COMMIT');
        return 0;
      }

      for (const row of res.rows) {
        const bucket = this.storage.bucket(row.bucket_name || this.defaultBucketName);
        const file = bucket.file(row.storage_path);

        if (row.operation === 'UPLOAD' && row.file_data_base64) {
          const buffer = Buffer.from(row.file_data_base64, 'base64');
          await file.save(buffer, {
            contentType: row.mime_type,
            metadata: {
              metadata: typeof row.metadata === 'string' ? JSON.parse(row.metadata) : row.metadata,
              syncedFrom: row.service,
            },
          });
        } else if (row.operation === 'DELETE') {
          const [exists] = await file.exists();
          if (exists) {
            await file.delete();
          }
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
      logger.info({ processed }, 'Synced files to Firebase Cloud Storage');
    } catch (err: any) {
      await client.query('ROLLBACK');
      logger.error({ err: err.message }, 'Failed during storage sync');
      throw err;
    } finally {
      client.release();
    }

    return processed;
  }
}
