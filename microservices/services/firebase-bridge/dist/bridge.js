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
exports.FirebaseBridge = void 0;
const admin = __importStar(require("firebase-admin"));
const common_1 = require("@logikchain/common");
class FirebaseBridge {
    firestore;
    storage;
    defaultBucket;
    stats = {
        totalOutboxProcessed: 0,
        totalOutboxSucceeded: 0,
        totalOutboxFailed: 0,
        lastSyncAt: null,
        storageUrlsGenerated: 0,
        inboundEventsDispatched: 0,
    };
    constructor() {
        const adminApp = (0, common_1.getFirebaseAdmin)();
        this.firestore = adminApp.firestore();
        this.storage = adminApp.storage();
        this.defaultBucket = process.env.FIREBASE_STORAGE_BUCKET || 'logikchain-dev.appspot.com';
    }
    /**
     * Process a batch of outbox events streamed from Rust or TypeScript microservices
     */
    async processOutboxBatch(events) {
        if (!events || events.length === 0) {
            return { syncedIds: [], failedIds: [] };
        }
        const syncedIds = [];
        const failedIds = [];
        const batch = this.firestore.batch();
        for (const event of events) {
            try {
                const collection = event.firestoreCollection || 'SyncJournal';
                const docRef = this.firestore.collection(collection).doc(event.aggregateId);
                if (event.operation === 'DELETE') {
                    batch.delete(docRef);
                }
                else {
                    const docData = {
                        ...event.payload,
                        _syncedAt: admin.firestore.FieldValue.serverTimestamp(),
                        _lastEventId: event.id,
                        _sourceService: event.service,
                    };
                    batch.set(docRef, docData, { merge: true });
                }
                syncedIds.push(event.id);
            }
            catch (err) {
                common_1.logger.error({ err, eventId: event.id }, 'Failed to queue event in Firestore batch');
                failedIds.push(event.id);
            }
        }
        if (syncedIds.length > 0) {
            try {
                await batch.commit();
                this.stats.totalOutboxSucceeded += syncedIds.length;
                this.stats.lastSyncAt = new Date().toISOString();
            }
            catch (commitErr) {
                common_1.logger.error({ commitErr }, 'Failed committing Firestore batch write');
                this.stats.totalOutboxFailed += syncedIds.length;
                return { syncedIds: [], failedIds: events.map((e) => e.id) };
            }
        }
        this.stats.totalOutboxProcessed += events.length;
        this.stats.totalOutboxFailed += failedIds.length;
        return { syncedIds, failedIds };
    }
    /**
     * Generates a signed upload URL for Cloud Storage
     */
    async generateSignedUploadUrl(options) {
        const bucket = this.storage.bucket(options.bucketName || this.defaultBucket);
        const file = bucket.file(options.filePath);
        const expiresAt = new Date(Date.now() + (options.expiresInMinutes || 15) * 60 * 1000);
        const [uploadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'write',
            expires: expiresAt,
            contentType: options.contentType,
        });
        this.stats.storageUrlsGenerated += 1;
        return {
            uploadUrl,
            storagePath: `gs://${bucket.name}/${options.filePath}`,
            expiresAt: expiresAt.toISOString(),
        };
    }
    /**
     * Generates a signed download URL for Cloud Storage
     */
    async generateSignedDownloadUrl(options) {
        const bucket = this.storage.bucket(options.bucketName || this.defaultBucket);
        const file = bucket.file(options.filePath);
        const expiresAt = new Date(Date.now() + (options.expiresInMinutes || 60) * 60 * 1000);
        const [downloadUrl] = await file.getSignedUrl({
            version: 'v4',
            action: 'read',
            expires: expiresAt,
        });
        this.stats.storageUrlsGenerated += 1;
        return {
            downloadUrl,
            expiresAt: expiresAt.toISOString(),
        };
    }
    /**
     * Sets up a real-time listener on Firestore to forward mutations to an internal microservice
     */
    setupInboundListener(collection, targetServiceUrl, onMutateFilter) {
        common_1.logger.info({ collection, targetServiceUrl }, 'Initializing Firestore inbound snapshot listener');
        const unsubscribe = this.firestore.collection(collection).onSnapshot(async (snapshot) => {
            for (const change of snapshot.docChanges()) {
                if (change.type === 'added' || change.type === 'modified') {
                    const data = change.doc.data();
                    if (onMutateFilter && !onMutateFilter(data)) {
                        continue;
                    }
                    try {
                        // Dispatch to target microservice internal webhook
                        const response = await fetch(`${targetServiceUrl}/internal/sync-inbound`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({
                                id: change.doc.id,
                                collection,
                                type: change.type,
                                data,
                                dispatchedAt: new Date().toISOString(),
                            }),
                        });
                        if (response.ok) {
                            this.stats.inboundEventsDispatched += 1;
                        }
                        else {
                            common_1.logger.warn({ status: response.status, docId: change.doc.id }, 'Microservice returned non-200 for inbound sync');
                        }
                    }
                    catch (dispatchErr) {
                        common_1.logger.error({ dispatchErr, docId: change.doc.id }, 'Failed to dispatch inbound mutation to microservice');
                    }
                }
            }
        }, (error) => {
            common_1.logger.error({ error, collection }, 'Inbound Firestore listener encountered an error');
        });
        return unsubscribe;
    }
    getStats() {
        return { ...this.stats };
    }
}
exports.FirebaseBridge = FirebaseBridge;
