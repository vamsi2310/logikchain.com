import { initializeApp, getApps, type FirebaseApp } from "firebase/app";
import { getAuth, connectAuthEmulator, type Auth } from "firebase/auth";
import {
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  connectFirestoreEmulator,
  type Firestore,
} from "firebase/firestore";
import { getStorage, connectStorageEmulator, type FirebaseStorage } from "firebase/storage";
import {
  initializeAppCheck,
  ReCaptchaEnterpriseProvider,
  type AppCheck,
} from "firebase/app-check";
import { env, requireFirebaseConfig } from "@/config/env";

let app: FirebaseApp | undefined;
let auth: Auth | undefined;
let db: Firestore | undefined;
let storage: FirebaseStorage | undefined;
let appCheck: AppCheck | undefined;

export function getFirebaseApp(): FirebaseApp {
  if (app) return app;
  requireFirebaseConfig();
  app = getApps()[0] ?? initializeApp(env.firebase);
  return app;
}

export function getFirebaseAuth(): Auth {
  if (auth) return auth;
  auth = getAuth(getFirebaseApp());
  if (env.useEmulators) {
    connectAuthEmulator(auth, env.emulators.auth, { disableWarnings: true });
  }
  return auth;
}

export function getDb(): Firestore {
  if (db) return db;
  db = initializeFirestore(getFirebaseApp(), {
    localCache: persistentLocalCache({ tabManager: persistentMultipleTabManager() }),
  });
  if (env.useEmulators) {
    const [host, port] = env.emulators.firestore.split(":");
    connectFirestoreEmulator(db, host ?? "127.0.0.1", Number(port ?? 8080));
  }
  return db;
}

export function getBucket(): FirebaseStorage {
  if (storage) return storage;
  storage = getStorage(getFirebaseApp());
  if (env.useEmulators) {
    const [host, port] = env.emulators.storage.split(":");
    connectStorageEmulator(storage, host ?? "127.0.0.1", Number(port ?? 9199));
  }
  return storage;
}

export function getAppCheck(): AppCheck | undefined {
  if (appCheck) return appCheck;
  if (env.useEmulators || !env.recaptchaEnterpriseSiteKey) return undefined;
  appCheck = initializeAppCheck(getFirebaseApp(), {
    provider: new ReCaptchaEnterpriseProvider(env.recaptchaEnterpriseSiteKey),
    isTokenAutoRefreshEnabled: true,
  });
  return appCheck;
}

export function initFirebase(): void {
  getFirebaseApp();
  getFirebaseAuth();
  getDb();
  getBucket();
  getAppCheck();
}
