/// <reference types="vite/client" />
/// <reference types="vite-plugin-pwa/client" />

interface ImportMetaEnv {
  readonly FIREBASE_PROJECT_ALIAS?: string;
  readonly FUNCTIONS_REGION?: string;
  readonly REACT_APP_FIREBASE_API_KEY?: string;
  readonly REACT_APP_FIREBASE_AUTH_DOMAIN?: string;
  readonly REACT_APP_FIREBASE_PROJECT_ID?: string;
  readonly REACT_APP_FIREBASE_STORAGE_BUCKET?: string;
  readonly REACT_APP_FIREBASE_MESSAGING_SENDER_ID?: string;
  readonly REACT_APP_FIREBASE_APP_ID?: string;
  readonly REACT_APP_FIREBASE_MEASUREMENT_ID?: string;
  readonly REACT_APP_GOOGLE_MAPS_API_KEY?: string;
  readonly REACT_APP_FCM_VAPID_PUBLIC_KEY?: string;
  readonly REACT_APP_RECAPTCHA_ENTERPRISE_SITE_KEY?: string;
  readonly REACT_APP_RAZORPAY_KEY_ID?: string;
  readonly REACT_APP_API_BASE_URL?: string;
  readonly REACT_APP_USE_LOCAL_FUNCTIONS?: string;
  readonly REACT_APP_USE_EMULATORS?: string;
  readonly REACT_APP_AUTH_EMULATOR_URL?: string;
  readonly REACT_APP_FIRESTORE_EMULATOR_HOST?: string;
  readonly REACT_APP_STORAGE_EMULATOR_HOST?: string;
  readonly REACT_APP_FUNCTIONS_EMULATOR_HOST?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
