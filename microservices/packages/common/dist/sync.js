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
function camelToSnake(str) {
    return str.replace(/([a-z0-9])([A-Z])/g, '$1_$2').toLowerCase();
}
class PeriodicServiceSyncer {
    serviceName;
    pool;
    firestoreCollection;
    inboundTable;
    idColumn;
    storageBucketName;
    syncIntervalMs;
    batchSize;
    autoHydrateOnStart;
    firestore;
    storage;
    timer = null;
    isRunning = false;
    unsubscribeInbound = null;
    stats;
    columnCache = new Map();
    constructor(options) {
        this.serviceName = options.serviceName;
        this.pool = options.pool;
        this.firestoreCollection = options.firestoreCollection;
        this.inboundTable = options.inboundTable;
        this.idColumn = options.idColumn || 'id';
        this.syncIntervalMs = options.syncIntervalMs || 2500;
        this.batchSize = options.batchSize || 50;
        this.autoHydrateOnStart = options.autoHydrateOnStart !== false;
        const adminApp = (0, auth_1.getFirebaseAdmin)();
        this.firestore = adminApp.firestore();
        this.storage = adminApp.storage();
        this.storageBucketName = options.defaultStorageBucket || process.env.FIREBASE_STORAGE_BUCKET || 'logikchain-dev.appspot.com';
        this.stats = {
            serviceName: this.serviceName,
            lastSyncAt: null,
            initialHydrationCompleted: false,
            totalHydrated: 0,
            hydratedAt: null,
            totalOutboxSynced: 0,
            totalStorageSynced: 0,
            totalInboundSynced: 0,
            errorsCount: 0,
            isListening: false,
        };
    }
    /**
     * Ensures essential synchronization and outbox schema tables exist in the container-local database
     */
    async ensureSyncTables() {
        const client = await this.pool.connect();
        try {
            await client.query(`
        CREATE EXTENSION IF NOT EXISTS "pgcrypto";

        CREATE TABLE IF NOT EXISTS outbox_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          service VARCHAR(64) NOT NULL,
          aggregate_type VARCHAR(64) NOT NULL,
          aggregate_id VARCHAR(64) NOT NULL,
          operation VARCHAR(16) NOT NULL,
          payload JSONB NOT NULL,
          firestore_collection VARCHAR(64) NOT NULL,
          firestore_doc_id VARCHAR(64) NOT NULL,
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          synced_at TIMESTAMPTZ,
          sync_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
          retry_count INT NOT NULL DEFAULT 0,
          last_error TEXT
        );

        CREATE TABLE IF NOT EXISTS storage_sync_events (
          id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
          service VARCHAR(64) NOT NULL,
          bucket_name VARCHAR(128) NOT NULL,
          storage_path VARCHAR(256) NOT NULL,
          mime_type VARCHAR(64) NOT NULL,
          metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
          file_data_base64 TEXT,
          operation VARCHAR(16) NOT NULL DEFAULT 'UPLOAD',
          sync_status VARCHAR(16) NOT NULL DEFAULT 'PENDING',
          created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          synced_at TIMESTAMPTZ
        );

        CREATE TABLE IF NOT EXISTS inbound_firestore_events (
          collection VARCHAR(64) NOT NULL,
          doc_id VARCHAR(64) NOT NULL,
          payload JSONB NOT NULL,
          received_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
          PRIMARY KEY (collection, doc_id)
        );

        CREATE INDEX IF NOT EXISTS idx_outbox_pending_status
          ON outbox_events(created_at) WHERE sync_status = 'PENDING';
      `);
        }
        catch (err) {
            logger_1.logger.warn({ service: this.serviceName, err: err.message }, 'Failed verifying sync tables (non-fatal if already present)');
        }
        finally {
            client.release();
        }
    }
    /**
     * Retrieves and caches table column names and types from PostgreSQL schema
     */
    async getTableColumns(tableName) {
        if (this.columnCache.has(tableName)) {
            return this.columnCache.get(tableName);
        }
        const cols = new Map();
        try {
            const res = await this.pool.query(`SELECT column_name, data_type
         FROM information_schema.columns
         WHERE table_name = $1 AND table_schema = current_schema()`, [tableName]);
            for (const row of res.rows) {
                cols.set(row.column_name.toLowerCase(), row.data_type.toLowerCase());
            }
            this.columnCache.set(tableName, cols);
        }
        catch (err) {
            logger_1.logger.warn({ service: this.serviceName, tableName, err: err.message }, 'Could not introspect table columns');
        }
        return cols;
    }
    /**
     * Dynamically upserts a Firestore document into a specific PostgreSQL domain table
     */
    async upsertDocumentToTable(tableName, idColumn, docId, data) {
        const tableCols = await this.getTableColumns(tableName);
        if (tableCols.size === 0)
            return;
        const columnValues = new Map();
        // 1. Map document fields (direct column name or snake_case conversion)
        for (const [key, rawVal] of Object.entries(data)) {
            if (key === '_syncMetadata')
                continue;
            const directCol = key.toLowerCase();
            const snakeCol = camelToSnake(key);
            const targetCol = tableCols.has(directCol) ? directCol : (tableCols.has(snakeCol) ? snakeCol : null);
            if (!targetCol)
                continue;
            const dataType = tableCols.get(targetCol) || '';
            let val = rawVal;
            // Handle Firestore Timestamp or Date objects
            if (val && typeof val === 'object') {
                if (typeof val.toDate === 'function') {
                    val = val.toDate();
                }
                else if (val._seconds !== undefined) {
                    val = new Date(val._seconds * 1000);
                }
            }
            // Handle JSON / JSONB types
            if (dataType.includes('json')) {
                val = typeof val === 'object' && val !== null ? JSON.stringify(val) : val;
            }
            else if (dataType.includes('boolean')) {
                val = Boolean(val);
            }
            else if (dataType.includes('int') || dataType.includes('numeric')) {
                if (typeof val === 'string' && val.trim() !== '') {
                    val = Number(val);
                }
            }
            columnValues.set(targetCol, val);
        }
        // 2. Ensure Primary Key ID column is present
        const lowerIdCol = idColumn.toLowerCase();
        if (tableCols.has(lowerIdCol) && !columnValues.has(lowerIdCol)) {
            columnValues.set(lowerIdCol, docId);
        }
        // 3. Set updated_at if column exists
        if (tableCols.has('updated_at') && !columnValues.has('updated_at')) {
            columnValues.set('updated_at', new Date());
        }
        if (columnValues.size === 0)
            return;
        const cols = Array.from(columnValues.keys());
        const placeholders = cols.map((_, i) => `$${i + 1}`);
        const values = cols.map((col) => columnValues.get(col));
        const updateCols = cols.filter((col) => col !== lowerIdCol);
        const updateClauses = updateCols.length > 0
            ? `DO UPDATE SET ${updateCols.map((c) => `"${c}" = EXCLUDED."${c}"`).join(', ')}`
            : 'DO NOTHING';
        const sql = `
      INSERT INTO "${tableName}" (${cols.map((c) => `"${c}"`).join(', ')})
      VALUES (${placeholders.join(', ')})
      ON CONFLICT ("${lowerIdCol}") ${updateClauses}
    `;
        await this.pool.query(sql, values);
    }
    /**
     * Startup Hydration: Loads all domain data from Firebase Firestore into container-local PostgreSQL
     */
    async hydrateFromFirebase() {
        await this.ensureSyncTables();
        if (!this.firestore || !this.firestoreCollection) {
            logger_1.logger.info({ service: this.serviceName }, 'No firestore collection configured for startup hydration');
            return 0;
        }
        let loadedCount = 0;
        try {
            logger_1.logger.info({ service: this.serviceName, collection: this.firestoreCollection }, 'Startup data hydration: querying Firebase Firestore...');
            const snapshot = await this.firestore.collection(this.firestoreCollection).get();
            if (snapshot.empty) {
                logger_1.logger.info({ service: this.serviceName, collection: this.firestoreCollection }, 'Startup data hydration: Firestore collection is empty, proceeding with clean database');
                this.stats.initialHydrationCompleted = true;
                this.stats.hydratedAt = new Date().toISOString();
                return 0;
            }
            for (const doc of snapshot.docs) {
                const docData = doc.data();
                await this.ingestInboundDocument(doc.id, docData);
                loadedCount++;
            }
            this.stats.totalHydrated += loadedCount;
            this.stats.initialHydrationCompleted = true;
            this.stats.hydratedAt = new Date().toISOString();
            logger_1.logger.info({ service: this.serviceName, collection: this.firestoreCollection, loadedCount }, 'Startup data hydration: successfully loaded and synced data from Firebase');
        }
        catch (err) {
            this.stats.errorsCount++;
            logger_1.logger.warn({ service: this.serviceName, collection: this.firestoreCollection, err: err.message }, 'Startup data hydration from Firebase encountered an error (continuing service initialization)');
        }
        return loadedCount;
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
        let client = null;
        try {
            client = await this.pool.connect();
        }
        catch {
            return 0;
        }
        let processed = 0;
        try {
            const tableCheck = await client.query(`
        SELECT EXISTS (
          SELECT FROM information_schema.tables WHERE table_name = 'storage_sync_events'
        )
      `);
            if (!tableCheck.rows[0].exists) {
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
    /**
     * Ingests a single Firestore document into local PostgreSQL storage:
     * 1. Preserves raw payload in inbound_firestore_events table
     * 2. Maps and upserts columns into domain inboundTable
     */
    async ingestInboundDocument(docId, data) {
        try {
            // 1. Raw event log persistence
            const rawQuery = `
        INSERT INTO inbound_firestore_events (collection, doc_id, payload, received_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (collection, doc_id) DO UPDATE
        SET payload = EXCLUDED.payload, received_at = NOW();
      `;
            await this.pool.query(rawQuery, [this.firestoreCollection, docId, JSON.stringify(data)]);
            // 2. Domain table upsert
            if (this.inboundTable) {
                await this.upsertDocumentToTable(this.inboundTable, this.idColumn, docId, data);
            }
            this.stats.totalInboundSynced++;
            logger_1.logger.debug({ service: this.serviceName, docId }, 'Ingested inbound Firestore document into local PostgreSQL');
        }
        catch (err) {
            this.stats.errorsCount++;
            logger_1.logger.error({ service: this.serviceName, docId, err: err.message }, 'Failed to ingest inbound document');
        }
    }
    /**
     * Start independent periodic background sync loop and startup hydration
     */
    async start(options) {
        if (this.isRunning)
            return;
        this.isRunning = true;
        await this.ensureSyncTables();
        // 1. Startup load from Firebase
        if (this.autoHydrateOnStart && !options?.skipHydration && !this.stats.initialHydrationCompleted) {
            await this.hydrateFromFirebase();
        }
        // 2. Real-time inbound updates
        this.startInboundListener();
        // 3. Periodic outbound sync loop
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
        logger_1.logger.info({ service: this.serviceName, intervalMs: this.syncIntervalMs }, 'Independent periodic sync engine active');
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
