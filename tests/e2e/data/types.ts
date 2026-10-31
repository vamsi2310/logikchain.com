/**
 * Logikchain Automated E2E Test Data Contract & Schema
 * Defines the canonical metadata, datastore sources, seed values,
 * and expected validation outcomes for all numbered use cases.
 */

export type ActorRole =
  | 'buyer'
  | 'merchant'
  | 'driver'
  | 'supplier'
  | 'support'
  | 'finance'
  | 'sre'
  | 'admin';

export type UseCaseCategory = 'business' | 'technical';

export interface TestDataSource {
  datastore: string;             // e.g. "PostgreSQL identity_db.user_profiles"
  microservice: string;          // e.g. "identity-service (:4001)"
  syncTarget?: string;           // e.g. "Cloud Firestore /UserProfiles/{uid}"
  apiEndpoint?: string;          // e.g. "POST /v1/auth/bootstrap"
  authMechanism?: string;        // e.g. "SMS Phone OTP + Firebase Custom Claims"
  seedFile?: string;             // file where data is loaded from
}

export interface UseCaseTestData<T = Record<string, any>> {
  useCaseId: string;
  title: string;
  tier: string;
  category: UseCaseCategory;
  epic: string;
  featureId: string;
  actor: ActorRole;
  source: TestDataSource;
  seedValues: T;
  expectedOutcomes?: Record<string, any>;
}

