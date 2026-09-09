import { getIdToken } from "firebase/auth";
import { getToken } from "firebase/app-check";
import { env } from "@/config/env";
import { getFirebaseAuth, getAppCheck } from "@/firebase/app";
import { ApiError } from "@/types/domain";

export interface RequestOptions {
  method: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  path: string;
  body?: Record<string, unknown>;
  query?: Record<string, string | number | boolean | undefined>;
  idempotencyKey?: string;
}

function apiRoot(): string {
  if (env.apiBaseUrl) return env.apiBaseUrl.replace(/\/+$/, "");
  return "";
}

function withQuery(path: string, query?: RequestOptions["query"]): string {
  if (!query) return path;
  const params = new URLSearchParams();
  for (const [k, v] of Object.entries(query)) {
    if (v === undefined) continue;
    params.set(k, String(v));
  }
  const qs = params.toString();
  return qs ? `${path}?${qs}` : path;
}

async function authHeaders(): Promise<Record<string, string>> {
  const headers: Record<string, string> = {
    "Content-Type": "application/json",
    "X-Firebase-AppId": env.firebase.appId,
  };
  const user = getFirebaseAuth().currentUser;
  if (user) {
    headers.Authorization = `Bearer ${await getIdToken(user)}`;
  }
  const check = getAppCheck();
  if (check) {
    try {
      const token = await getToken(check, false);
      if (token.token) headers["X-Firebase-AppCheck"] = token.token;
    } catch {
      /* App Check missing is UNAUTHENTICATED on the server for non-public ops */
    }
  }
  return headers;
}

export async function apiRequest<T>(opts: RequestOptions): Promise<T> {
  const url = `${apiRoot()}${withQuery(opts.path, opts.query)}`;
  const headers = await authHeaders();
  if (opts.idempotencyKey) headers["Idempotency-Key"] = opts.idempotencyKey;
  const res = await fetch(url, {
    method: opts.method,
    headers,
    body: opts.body && opts.method !== "GET" ? JSON.stringify(opts.body) : undefined,
  });
  const text = await res.text();
  const json = text ? (JSON.parse(text) as unknown) : {};
  if (!res.ok) {
    const err = json as { error?: { code?: string; message?: string; details?: unknown } };
    throw new ApiError(
      err.error?.code ?? "INTERNAL",
      err.error?.message ?? res.statusText,
      res.status,
      err.error?.details,
    );
  }
  return json as T;
}

export const api = {
  get: <T>(path: string, query?: RequestOptions["query"]) =>
    apiRequest<T>({ method: "GET", path, query }),
  post: <T>(path: string, body?: Record<string, unknown>, extra?: Partial<RequestOptions>) =>
    apiRequest<T>({ method: "POST", path, body, ...extra }),
  patch: <T>(path: string, body?: Record<string, unknown>) =>
    apiRequest<T>({ method: "PATCH", path, body }),
  put: <T>(path: string, body?: Record<string, unknown>) =>
    apiRequest<T>({ method: "PUT", path, body }),
  delete: <T>(path: string, body?: Record<string, unknown>) =>
    apiRequest<T>({ method: "DELETE", path, body }),
};
