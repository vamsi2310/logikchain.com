"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.PeriodicServiceSyncer = void 0;
exports.createPeriodicSyncer = createPeriodicSyncer;
const admin = __importStar(require("firebase-admin"));
const logger_1 = require("./logger");
const auth_1 = require("./auth");
class PeriodicServiceSyncer {
    serviceName;
    pool;
    firestoreCollection;
    inboundTable;
    idColumn;
    storageBucketName;
    syncIntervalMs;
    batchSize;
    firestore;
    storage;
    timer = null;
    isRunning = false;
    unsubscribeInbound = null;
    stats;
    constructor(options) {
        this.serviceName = options.serviceName;
        this.pool = options.pool;
        this.firestoreCollection = options.firestoreCollection;
        this.inboundTable = options.inboundTable;
        this.idColumn = options.idColumn || 'id';
        this.syncIntervalMs = options.syncIntervalMs || 2500;
        this.batchSize = options.batchSize || 50;
        const adminApp = (0, auth_1.getFirebaseAdmin)();
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
    async syncOutbox() {
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
            const idsToMarkSynced = [];
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
                }
                else if (row.operation === 'DELETE') {
                    batch.delete(docRef);
                }
                idsToMarkSynced.push(row.id);
            }
            await batch.commit();
            await client.query(`UPDATE outbox_events
         SET sync_status = 'SYNCED', synced_at = NOW()
         WHERE id = ANY($1::uuid[])`, [idsToMarkSynced]);
            await client.query('COMMIT');
            processed = idsToMarkSynced.length;
            this.stats.totalOutboxSynced += processed;
            this.stats.lastSyncAt = new Date().toISOString();
        }
        catch (err) {
            await client.query('ROLLBACK');
            this.stats.errorsCount++;
            logger_1.logger.error({ service: this.serviceName, err: err.message }, 'Failed during microservice outbox sync');
        }
        finally {
            client.release();
        }
        return processed;
    }
    /**
     * Outbound Firebase Storage sync: Flushes pending local storage attachments to Cloud Storage
     */
    async syncStorage() {
        let client;
        try {
            client = await this.pool.connect();
        }
        catch {
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
                }
                else if (row.operation === 'DELETE') {
                    const [exists] = await file.exists();
                    if (exists)
                        await file.delete();
                }
                await client.query(`UPDATE storage_sync_events
           SET sync_status = 'SYNCED', synced_at = NOW(), file_data_base64 = NULL
           WHERE id = $1`, [row.id]);
                processed++;
            }
            await client.query('COMMIT');
            this.stats.totalStorageSynced += processed;
        }
        catch (err) {
            if (client)
                await client.query('ROLLBACK');
            this.stats.errorsCount++;
            logger_1.logger.error({ service: this.serviceName, err: err.message }, 'Failed during microservice storage sync');
        }
        finally {
            if (client)
                client.release();
        }
        return processed;
    }
    /**
     * Inbound sync: Real-time listener on this service's Firestore collection to ingest offline client writes
     */
    startInboundListener() {
        if (this.unsubscribeInbound || !this.firestoreCollection)
            return;
        try {
            this.unsubscribeInbound = this.firestore
                .collection(this.firestoreCollection)
                .where('_syncMetadata.origin', '!=', this.serviceName)
                .onSnapshot(async (snapshot) => {
                for (const change of snapshot.docChanges()) {
                    if (change.type === 'added' || change.type === 'modified') {
                        await this.ingestInboundDocument(change.doc.id, change.doc.data());
                    }
                }
            }, (err) => {
                logger_1.logger.error({ service: this.serviceName, err: err.message }, 'Inbound Firestore listener error');
            });
            this.stats.isListening = true;
            logger_1.logger.info({ service: this.serviceName, collection: this.firestoreCollection }, 'Started independent inbound Firestore listener');
        }
        catch (err) {
            logger_1.logger.warn({ service: this.serviceName, err: err.message }, 'Could not attach inbound Firestore listener');
        }
    }
    async ingestInboundDocument(docId, data) {
        if (!this.inboundTable)
            return;
        try {
            const query = `
        INSERT INTO ${this.inboundTable} (${this.idColumn}, status, updated_at)
        VALUES ($1, $2, NOW())
        ON CONFLICT (${this.idColumn}) DO UPDATE
        SET status = EXCLUDED.status, updated_at = NOW()
      `;
            await this.pool.query(query, [docId, data.status || 'SYNCED_FROM_CLIENT']);
            this.stats.totalInboundSynced++;
            logger_1.logger.debug({ service: this.serviceName, docId }, 'Ingested inbound client document to local PostgreSQL');
        }
        catch (err) {
            logger_1.logger.error({ service: this.serviceName, docId, err: err.message }, 'Failed to ingest inbound document');
        }
    }
    /**
     * Start independent periodic background sync loop
     */
    start() {
        if (this.isRunning)
            return;
        this.isRunning = true;
        // Start real-time inbound listener
        this.startInboundListener();
        // Start quick periodic outbound polling loop
        const loop = async () => {
            if (!this.isRunning)
                return;
            try {
                await this.syncOutbox();
                await this.syncStorage();
            }
            catch (err) {
                logger_1.logger.error({ service: this.serviceName, err: err.message }, 'Periodic sync iteration error');
            }
            if (this.isRunning) {
                this.timer = setTimeout(loop, this.syncIntervalMs);
            }
        };
        this.timer = setTimeout(loop, 1000);
        logger_1.logger.info({ service: this.serviceName, intervalMs: this.syncIntervalMs }, 'Independent periodic sync engine started');
    }
    /**
     * Stop syncer gracefully
     */
    stop() {
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
    getStats() {
        return { ...this.stats };
    }
}
exports.PeriodicServiceSyncer = PeriodicServiceSyncer;
function createPeriodicSyncer(options) {
    return new PeriodicServiceSyncer(options);
}
