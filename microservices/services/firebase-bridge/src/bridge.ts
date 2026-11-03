import * as admin from 'firebase-admin';
import { getFirebaseAdmin, logger } from '@logikchain/common';

export interface OutboxEventPayload {
  id: string;
  service: string;
  aggregateType: string;
  aggregateId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: any;
  firestoreCollection: string;
  createdAt?: string;
}

export interface BridgeStats {
  totalOutboxProcessed: number;
  totalOutboxSucceeded: number;
  totalOutboxFailed: number;
  lastSyncAt: string | null;
  storageUrlsGenerated: number;
  inboundEventsDispatched: number;
}

export class FirebaseBridge {
  private firestore: any;
  private storage: any;
  private defaultBucket: string;
  private stats: BridgeStats = {
    totalOutboxProcessed: 0,
    totalOutboxSucceeded: 0,
    totalOutboxFailed: 0,
    lastSyncAt: null,
    storageUrlsGenerated: 0,
    inboundEventsDispatched: 0,
  };

  constructor() {
    const adminApp = getFirebaseAdmin();
    this.firestore = adminApp.firestore();
    this.storage = adminApp.storage();
    this.defaultBucket = process.env.FIREBASE_STORAGE_BUCKET || 'logikchain-dev.appspot.com';
  }

  /**
   * Process a batch of outbox events streamed from Rust or TypeScript microservices
   */
  public async processOutboxBatch(events: OutboxEventPayload[]): Promise<{
    syncedIds: string[];
    failedIds: string[];
  }> {
    if (!events || events.length === 0) {
      return { syncedIds: [], failedIds: [] };
    }

    const syncedIds: string[] = [];
    const failedIds: string[] = [];
    const batch = this.firestore.batch();

    for (const event of events) {
      try {
        const collection = event.firestoreCollection || 'SyncJournal';
        const docRef = this.firestore.collection(collection).doc(event.aggregateId);

        if (event.operation === 'DELETE') {
          batch.delete(docRef);
        } else {
          const docData = {
            ...event.payload,
            _syncedAt: admin.firestore.FieldValue.serverTimestamp(),
            _lastEventId: event.id,
            _sourceService: event.service,
          };
          batch.set(docRef, docData, { merge: true });
        }
        syncedIds.push(event.id);
      } catch (err: any) {
        logger.error({ err, eventId: event.id }, 'Failed to queue event in Firestore batch');
        failedIds.push(event.id);
      }
    }

    if (syncedIds.length > 0) {
      try {
        await batch.commit();
        this.stats.totalOutboxSucceeded += syncedIds.length;
        this.stats.lastSyncAt = new Date().toISOString();
      } catch (commitErr: any) {
        logger.error({ commitErr }, 'Failed committing Firestore batch write');
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
  public async generateSignedUploadUrl(options: {
    filePath: string;
    contentType: string;
    bucketName?: string;
    expiresInMinutes?: number;
  }): Promise<{ uploadUrl: string; storagePath: string; expiresAt: string }> {
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
  public async generateSignedDownloadUrl(options: {
    filePath: string;
    bucketName?: string;
    expiresInMinutes?: number;
  }): Promise<{ downloadUrl: string; expiresAt: string }> {
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
  public setupInboundListener(
    collection: string,
    targetServiceUrl: string,
    onMutateFilter?: (docData: any) => boolean
  ): () => void {
    logger.info({ collection, targetServiceUrl }, 'Initializing Firestore inbound snapshot listener');

    const unsubscribe = this.firestore.collection(collection).onSnapshot(
      async (snapshot: any) => {
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
              } else {
                logger.warn(
                  { status: response.status, docId: change.doc.id },
                  'Microservice returned non-200 for inbound sync'
                );
              }
            } catch (dispatchErr: any) {
              logger.error(
                { dispatchErr, docId: change.doc.id },
                'Failed to dispatch inbound mutation to microservice'
              );
            }
          }
        }
      },
      (error: any) => {
        logger.error({ error, collection }, 'Inbound Firestore listener encountered an error');
      }
    );

    return unsubscribe;
  }

  public getStats(): BridgeStats {
    return { ...this.stats };
  }
}

