export type ClientPlatform = 'web' | 'android' | 'ios' | 'unknown';

export type UserRole = 'buyer' | 'merchant' | 'driver' | 'supplier' | 'support' | 'admin';

export interface AuthenticatedUser {
  uid: string;
  email?: string;
  phoneNumber?: string;
  role: UserRole;
  status: 'active' | 'suspended' | 'pending';
  claims: Record<string, unknown>;
}

export interface ClientContext {
  platform: ClientPlatform;
  appVersion?: string;
  appCheckVerified: boolean;
  appId?: string;
  user?: AuthenticatedUser;
  correlationId: string;
  idempotencyKey?: string;
}

export type OutboxOperation = 'INSERT' | 'UPDATE' | 'DELETE';

export interface OutboxMessage {
  id: string;
  service: string;
  aggregateType: string;
  aggregateId: string;
  operation: OutboxOperation;
  payload: Record<string, unknown>;
  firestoreCollection: string;
  firestoreDocId: string;
  createdAt: Date;
  syncedAt?: Date | null;
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  retryCount: number;
  lastError?: string | null;
}

export interface StorageSyncMessage {
  id: string;
  service: string;
  bucketName: string;
  storagePath: string;
  mimeType: string;
  sizeBytes: number;
  metadata: Record<string, string>;
  operation: 'UPLOAD' | 'DELETE';
  syncStatus: 'PENDING' | 'SYNCED' | 'FAILED';
  createdAt: Date;
}
