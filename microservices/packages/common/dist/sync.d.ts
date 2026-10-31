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
    autoHydrateOnStart?: boolean;
}
export interface SyncStats {
    serviceName: string;
    lastSyncAt: string | null;
    initialHydrationCompleted: boolean;
    totalHydrated: number;
    hydratedAt: string | null;
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
    private autoHydrateOnStart;
    private firestore;
    private storage;
    private timer;
    private isRunning;
    private unsubscribeInbound;
    private stats;
    private columnCache;
    constructor(options: SyncerOptions);
    /**
     * Ensures essential synchronization and outbox schema tables exist in the container-local database
     */
    ensureSyncTables(): Promise<void>;
    /**
     * Retrieves and caches table column names and types from PostgreSQL schema
     */
    private getTableColumns;
    /**
     * Dynamically upserts a Firestore document into a specific PostgreSQL domain table
     */
    private upsertDocumentToTable;
    /**
     * Startup Hydration: Loads all domain data from Firebase Firestore into container-local PostgreSQL
     */
    hydrateFromFirebase(): Promise<number>;
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
    /**
     * Ingests a single Firestore document into local PostgreSQL storage:
     * 1. Preserves raw payload in inbound_firestore_events table
     * 2. Maps and upserts columns into domain inboundTable
     */
    ingestInboundDocument(docId: string, data: any): Promise<void>;
    /**
     * Start independent periodic background sync loop and startup hydration
     */
    start(options?: {
        skipHydration?: boolean;
    }): Promise<void>;
    /**
     * Stop syncer gracefully
     */
    stop(): void;
    getStats(): SyncStats;
}
export declare function createPeriodicSyncer(options: SyncerOptions): PeriodicServiceSyncer;
