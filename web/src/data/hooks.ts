import { useCallback, useEffect, useState } from "react";
import type { QueryConstraint } from "firebase/firestore";
import { getDocument, listenDocument, queryDocuments, type DocResult, type QueryResult, type ReadMeta } from "./firestore";

export function useDoc<T>(col: string | null, id: string | undefined | null) {
  const [result, setResult] = useState<DocResult<T> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!col || !id) {
      setResult({ data: null, meta: { fromCache: false, stale: false, fetchedAt: Date.now() } });
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      setResult(await getDocument<T>(col, id));
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [col, id]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { data: result?.data ?? null, meta: result?.meta, error, loading, reload };
}

export function useListenDoc<T>(col: string | null, id: string | undefined | null, enabled = true) {
  const [result, setResult] = useState<DocResult<T> | null>(null);
  const [error, setError] = useState<Error | null>(null);
  useEffect(() => {
    if (!col || !id || !enabled) return;
    return listenDocument<T>(
      col,
      id,
      (r) => setResult(r),
      (e) => setError(e),
    );
  }, [col, id, enabled]);
  return { data: result?.data ?? null, meta: result?.meta, error };
}

export function useQuery<T>(col: string | null, constraints: QueryConstraint[], deps: unknown[] = []) {
  const [rows, setRows] = useState<T[]>([]);
  const [meta, setMeta] = useState<ReadMeta | undefined>();
  const [error, setError] = useState<Error | null>(null);
  const [loading, setLoading] = useState(true);

  const reload = useCallback(async () => {
    if (!col) {
      setRows([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const res: QueryResult<T> = await queryDocuments<T>(col, constraints);
      setRows(res.rows);
      setMeta(res.meta);
      setError(null);
    } catch (e) {
      setError(e as Error);
    } finally {
      setLoading(false);
    }
  }, [col, ...deps]);

  useEffect(() => {
    void reload();
  }, [reload]);

  return { rows, meta, error, loading, reload };
}
