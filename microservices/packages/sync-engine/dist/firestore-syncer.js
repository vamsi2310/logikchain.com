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
exports.FirestoreSyncer = void 0;
const admin = __importStar(require("firebase-admin"));
const common_1 = require("@logikchain/common");
class FirestoreSyncer {
    pool;
    firestore;
    batchSize;
    isRunning = false;
    unsubscribeListeners = [];
    constructor(config) {
        this.pool = config.dbPool;
        this.firestore = config.firestore;
        this.batchSize = config.batchSize || 100;
    }
    /**
     * Outbound sync: Polls microservice PostgreSQL outbox_events and syncs to Cloud Firestore
     */
    async syncOutboxToFirestore() {
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
            const updatedEventIds = [];
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
                }
                else if (row.operation === 'DELETE') {
                    batch.delete(docRef);
                }
                updatedEventIds.push(row.id);
            }
            await batch.commit();
            await client.query(`UPDATE outbox_events
         SET sync_status = 'SYNCED', synced_at = NOW()
         WHERE id = ANY($1::uuid[])`, [updatedEventIds]);
            await client.query('COMMIT');
            processedCount = updatedEventIds.length;
            common_1.logger.info({ processedCount }, 'Successfully synced outbox events to Firestore');
        }
        catch (err) {
            await client.query('ROLLBACK');
            common_1.logger.error({ err: err.message }, 'Failed during syncOutboxToFirestore');
            throw err;
        }
        finally {
            client.release();
        }
        return processedCount;
    }
    /**
     * Inbound sync: Real-time listener for Firestore documents modified directly by Mobile/PWA offline clients
     */
    startInboundFirestoreListeners(collections) {
        for (const colName of collections) {
            const unsubscribe = this.firestore
                .collection(colName)
                .where('_syncMetadata.origin', '!=', 'microservices-backend')
                .onSnapshot(async (snapshot) => {
                for (const change of snapshot.docChanges()) {
                    if (change.type === 'added' || change.type === 'modified') {
                        const docData = change.doc.data();
                        const docId = change.doc.id;
                        await this.ingestInboundFirestoreDoc(colName, docId, docData);
                    }
                }
            }, (err) => {
                common_1.logger.error({ colName, err: err.message }, 'Firestore listener error');
            });
            this.unsubscribeListeners.push(unsubscribe);
            common_1.logger.info({ colName }, 'Started inbound Firestore listener');
        }
    }
    async ingestInboundFirestoreDoc(collection, docId, data) {
        try {
            const query = `
        INSERT INTO inbound_firestore_events (collection, doc_id, payload, received_at)
        VALUES ($1, $2, $3, NOW())
        ON CONFLICT (collection, doc_id) DO UPDATE
        SET payload = EXCLUDED.payload, received_at = NOW();
      `;
            await this.pool.query(query, [collection, docId, JSON.stringify(data)]);
            common_1.logger.debug({ collection, docId }, 'Ingested inbound Firestore document to PostgreSQL');
        }
        catch (err) {
            common_1.logger.error({ collection, docId, err: err.message }, 'Failed to ingest inbound document');
        }
    }
    stop() {
        for (const unsub of this.unsubscribeListeners) {
            unsub();
        }
        this.unsubscribeListeners = [];
    }
}
exports.FirestoreSyncer = FirestoreSyncer;
