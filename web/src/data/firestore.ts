import {
  collection,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  orderBy,
  query,
  startAfter,
  updateDoc,
  where,
  type DocumentData,
  type QueryConstraint,
  type QueryDocumentSnapshot,
  type Unsubscribe,
} from "firebase/firestore";
import { getDb } from "@/firebase/app";
import { VOLATILE, VOLATILE_TTL_MS } from "./collections";

export interface ReadMeta {
  fromCache: boolean;
  stale: boolean;
  fetchedAt: number;
}

export interface DocResult<T> {
  data: T | null;
  meta: ReadMeta;
}

export interface QueryResult<T> {
  rows: T[];
  meta: ReadMeta;
  last?: QueryDocumentSnapshot<DocumentData>;
}

function withId<T>(id: string, data: DocumentData | undefined): T {
  return { id, ...(data ?? {}) } as T;
}

function ttlFor(col: string): number {
  return VOLATILE.has(col) ? VOLATILE_TTL_MS : Number.POSITIVE_INFINITY;
}

export async function getDocument<T>(col: string, id: string): Promise<DocResult<T>> {
  const snap = await getDoc(doc(getDb(), col, id));
  const fetchedAt = Date.now();
  const fromCache = snap.metadata.fromCache;
  const stale = fromCache && VOLATILE.has(col);
  return {
    data: snap.exists() ? withId<T>(snap.id, snap.data()) : null,
    meta: { fromCache, stale, fetchedAt },
  };
}

export async function queryDocuments<T>(
  col: string,
  constraints: QueryConstraint[],
  pageSize = 20,
): Promise<QueryResult<T>> {
  const q = query(collection(getDb(), col), ...constraints, limit(pageSize));
  const snap = await getDocs(q);
  const fetchedAt = Date.now();
  const fromCache = snap.metadata.fromCache;
  const last = snap.docs[snap.docs.length - 1];
  return {
    rows: snap.docs.map((d) => withId<T>(d.id, d.data())),
    meta: { fromCache, stale: fromCache && VOLATILE.has(col), fetchedAt },
    last,
  };
}

export async function queryMore<T>(
  col: string,
  constraints: QueryConstraint[],
  after: QueryDocumentSnapshot<DocumentData>,
  pageSize = 20,
): Promise<QueryResult<T>> {
  const q = query(collection(getDb(), col), ...constraints, startAfter(after), limit(pageSize));
  const snap = await getDocs(q);
  const last = snap.docs[snap.docs.length - 1];
  return {
    rows: snap.docs.map((d) => withId<T>(d.id, d.data())),
    meta: {
      fromCache: snap.metadata.fromCache,
      stale: snap.metadata.fromCache && VOLATILE.has(col),
      fetchedAt: Date.now(),
    },
    last,
  };
}

export function listenDocument<T>(
  col: string,
  id: string,
  onNext: (result: DocResult<T>) => void,
  onError?: (err: Error) => void,
): Unsubscribe {
  return onSnapshot(
    doc(getDb(), col, id),
    (snap) => {
      onNext({
        data: snap.exists() ? withId<T>(snap.id, snap.data()) : null,
        meta: {
          fromCache: snap.metadata.fromCache,
          stale: snap.metadata.fromCache && Date.now() > ttlFor(col),
          fetchedAt: Date.now(),
        },
      });
    },
    (err) => onError?.(err),
  );
}

export function listenQuery<T>(
  col: string,
  constraints: QueryConstraint[],
  onNext: (result: QueryResult<T>) => void,
  onError?: (err: Error) => void,
  pageSize = 20,
): Unsubscribe {
  const q = query(collection(getDb(), col), ...constraints, limit(pageSize));
  return onSnapshot(
    q,
    (snap) => {
      onNext({
        rows: snap.docs.map((d) => withId<T>(d.id, d.data())),
        meta: {
          fromCache: snap.metadata.fromCache,
          stale: snap.metadata.fromCache && VOLATILE.has(col),
          fetchedAt: Date.now(),
        },
        last: snap.docs[snap.docs.length - 1],
      });
    },
    (err) => onError?.(err),
  );
}

/** Allowed client write: Notification.read on own rows. */
export async function markNotificationRead(id: string): Promise<void> {
  await updateDoc(doc(getDb(), "Notifications", id), { read: true });
}

export { where, orderBy, limit };
