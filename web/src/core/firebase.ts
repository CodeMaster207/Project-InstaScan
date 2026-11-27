import { initializeApp, type FirebaseApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";

const env = import.meta.env;

const firebaseConfig = {
  apiKey: env.VITE_FIREBASE_API_KEY,
  authDomain: env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: env.VITE_FIREBASE_APP_ID,
};

/** False until the Firebase keys are put in web/.env. The app then works offline, in Manual mode. */
export const isFirebaseConfigured = Boolean(firebaseConfig.apiKey && firebaseConfig.projectId && firebaseConfig.appId);

/**
 * Firebase AI Logic requires App Check. Three ways to satisfy it:
 * - Local dev (`npm run dev`): debug token is switched on automatically. The first run prints
 *   a token in the browser console; register it in Firebase console > App Check > Apps >
 *   Manage debug tokens.
 * - Hosted build with a fixed debug token (the contest rules accept debug tokens): set
 *   VITE_APPCHECK_DEBUG_TOKEN to a token registered in the console. It ends up in the public
 *   JavaScript, so use a dedicated token and revoke it after judging.
 * - Hosted build with reCAPTCHA Enterprise: set VITE_RECAPTCHA_SITE_KEY.
 */
function setUpAppCheck(app: FirebaseApp): void {
  const debugScope = self as unknown as { FIREBASE_APPCHECK_DEBUG_TOKEN?: boolean | string };
  const fixedDebugToken = env.VITE_APPCHECK_DEBUG_TOKEN as string | undefined;
  if (fixedDebugToken) debugScope.FIREBASE_APPCHECK_DEBUG_TOKEN = fixedDebugToken;
  else if (env.DEV) debugScope.FIREBASE_APPCHECK_DEBUG_TOKEN = true;

  // In debug mode the provider is swapped for the debug one, so the site key is a placeholder.
  const siteKey = (env.VITE_RECAPTCHA_SITE_KEY as string | undefined) || "debug-only-placeholder";
  initializeAppCheck(app, {
    provider: new ReCaptchaEnterpriseProvider(siteKey),
    isTokenAutoRefreshEnabled: true,
  });
}

/**
 * Development only: talk to the local Firebase emulators (Auth on 9099, Firestore on 8080) instead of
 * the real project, so sign-in and sync can be tested without touching any real data. It needs the dev
 * server AND VITE_USE_EMULATORS=true, so a production build can never switch it on.
 */
export const useEmulators = import.meta.env.DEV && import.meta.env.VITE_USE_EMULATORS === "true";

let app: FirebaseApp | null = null;

/** One shared Firebase app. App Check is set up first, so AI, Auth and Firestore all send tokens. */
export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured) throw new Error("Firebase is not configured. Add your keys to web/.env.");
  if (!app) {
    app = initializeApp(firebaseConfig);
    // The emulators do not check App Check, and the debug token would call the real service.
    if (!useEmulators) setUpAppCheck(app);
  }
  return app;
}
