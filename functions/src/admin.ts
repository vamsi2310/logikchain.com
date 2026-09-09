import { getApps, initializeApp } from "firebase-admin/app";
import { getAuth } from "firebase-admin/auth";
import { getFirestore, FieldValue } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";
import { getStorage } from "firebase-admin/storage";

if (!getApps().length) {
  initializeApp();
}

const databaseId = process.env.FIRESTORE_DATABASE_ID || "default";
export const auth = getAuth();
export const db = getFirestore(databaseId);
export const messaging = getMessaging();
export const storage = getStorage();
export { FieldValue };
