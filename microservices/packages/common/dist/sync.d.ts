import { Pool } from 'pg';
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
export declare class PeriodicServiceSyncer {
    private serviceName;
    private pool;
    private firestoreCollection;
    private inboundTable?;
    private idColumn;
    private storageBucketName;
    private syncIntervalMs;
    private batchSize;
    private firestore;
    private storage;
    private timer;
    private isRunning;
    private unsubscribeInbound;
    private stats;
    constructor(options: SyncerOptions);
    /**
     * Outbound Firestore sync: Flushes outbox_events to Cloud Firestore
     */
    syncOutbox(): Promise<number>;
    /**
     * Outbound Firebase Storage sync: Flushes pending local storage attachments to Cloud Storage
     */
    syncStorage(): Promise<number>;
    /**
     * Inbound sync: Real-time listener on this service's Firestore collection to ingest offline client writes
     */
    startInboundListener(): void;
    private ingestInboundDocument;
    /**
     * Start independent periodic background sync loop
     */
    start(): void;
    /**
     * Stop syncer gracefully
     */
    stop(): void;
    getStats(): SyncStats;
}
export declare function createPeriodicSyncer(options: SyncerOptions): PeriodicServiceSyncer;
