/**
 * Single backend switch for the PWA.
 *
 * Vite `--mode` loads the matching alias file, plus optional overlays:
 *   development → web/.env.development  → alias `dev`
 *   test        → web/.env.test         → alias `test`
 *   production  → web/.env.production   → alias `prod`
 *   emulator    → web/.env.emulator     → local emulators
 *   all modes   → web/.env.local        → personal overlay (gitignored)
 *
 * Later files win: .env.local < .env.[mode] < .env.[mode].local
 * Do not set FIREBASE_PROJECT_ALIAS in .env.local.
 *
 * REACT_APP_USE_LOCAL_FUNCTIONS=true in .env.local points /v1 at the Functions
 * emulator. Auth/Firestore stay on the Vite --mode alias. Ignored for production builds.
 *
 * Every Firebase option, API base URL, Maps key, App Check site key, and
 * Razorpay publishable key is read here. Screens and data modules import
 * `env` — they never read `import.meta.env` themselves.
 *
 * A production build must not be able to retarget `dev` or `test`.
 * Do not add a runtime environment picker.
 */

export type ProjectAlias = "emulator" | "dev" | "test" | "prod";

const MODE_TO_ALIAS: Record<string, ProjectAlias> = {
  emulator: "emulator",
  development: "dev",
  test: "test",
  production: "prod",
};

function read(name: keyof ImportMetaEnv): string {
  return (import.meta.env[name] ?? "").trim();
}

function resolveAlias(): ProjectAlias {
  const explicit = read("FIREBASE_PROJECT_ALIAS");
  if (explicit === "emulator" || explicit === "dev" || explicit === "test" || explicit === "prod") {
    return explicit;
  }
  return MODE_TO_ALIAS[import.meta.env.MODE] ?? "dev";
}

const alias = resolveAlias();
const useEmulators = alias === "emulator" || read("REACT_APP_USE_EMULATORS") === "true";

/** Hybrid: remote Auth/Firestore for this alias, HTTP /v1 on the Functions emulator. */
const useLocalFunctions =
  import.meta.env.MODE !== "production" && read("REACT_APP_USE_LOCAL_FUNCTIONS") === "true";

function localFunctionsUrl(): string {
  const host = read("REACT_APP_FUNCTIONS_EMULATOR_HOST") || "127.0.0.1:5001";
  const origin = host.startsWith("http") ? host : `http://${host}`;
  const projectId = read("REACT_APP_FIREBASE_PROJECT_ID") || "logikchain-dev";
  const region = read("FUNCTIONS_REGION") || "asia-south1";
  return `${origin.replace(/\/+$/, "")}/${projectId}/${region}/api`;
}

function resolveApiBaseUrl(): string {
  if (useLocalFunctions) return read("REACT_APP_API_BASE_URL") || localFunctionsUrl();
  return read("REACT_APP_API_BASE_URL");
}

export const env = {
  alias,
  useEmulators,
  useLocalFunctions,
  region: read("FUNCTIONS_REGION") || "asia-south1",
  appVersion: "1.0.0",
  firebase: {
    apiKey: read("REACT_APP_FIREBASE_API_KEY"),
    authDomain: read("REACT_APP_FIREBASE_AUTH_DOMAIN"),
    projectId: read("REACT_APP_FIREBASE_PROJECT_ID"),
    storageBucket: read("REACT_APP_FIREBASE_STORAGE_BUCKET"),
    messagingSenderId: read("REACT_APP_FIREBASE_MESSAGING_SENDER_ID"),
    appId: read("REACT_APP_FIREBASE_APP_ID"),
    measurementId: read("REACT_APP_FIREBASE_MEASUREMENT_ID") || undefined,
  },
  apiBaseUrl: resolveApiBaseUrl(),
  mapsKey: read("REACT_APP_GOOGLE_MAPS_API_KEY"),
  vapidKey: read("REACT_APP_FCM_VAPID_PUBLIC_KEY"),
  recaptchaEnterpriseSiteKey: read("REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY"),
  razorpayKeyId: read("REACT_APP_RAZORPAY_KEY_ID"),
  emulators: {
    auth: read("REACT_APP_AUTH_EMULATOR_URL") || "http://127.0.0.1:9099",
    firestore: read("REACT_APP_FIRESTORE_EMULATOR_HOST") || "127.0.0.1:8080",
    storage: read("REACT_APP_STORAGE_EMULATOR_HOST") || "127.0.0.1:9199",
    functions: read("REACT_APP_FUNCTIONS_EMULATOR_HOST") || "127.0.0.1:5001",
  },
} as const;

export type Env = typeof env;

export function missingFirebaseKeys(): string[] {
  if (env.useEmulators) return [];
  return (["apiKey", "authDomain", "projectId", "appId"] as const).filter((k) => !env.firebase[k]);
}

export function isFirebaseConfigured(): boolean {
  return missingFirebaseKeys().length === 0;
}

export function requireFirebaseConfig(): void {
  const missing = missingFirebaseKeys();
  if (missing.length) {
    throw new Error(
        `Firebase web config incomplete for alias "${env.alias}". Copy web/.env.${import.meta.env.MODE}.example to web/.env.${import.meta.env.MODE} and fill values from that alias's console.`,
    );
  }
}

export function hostingOrigin(): string {
  if (env.alias === "prod") return "https://logikchain.com";
  if (env.alias === "test") return "https://test.logikchain.com";
  if (env.alias === "dev") return "https://logikchain-dev.web.app";
  return "http://127.0.0.1:5000";
}
