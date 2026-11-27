import type { Auth } from "firebase/auth";
import { getFirebaseApp, isFirebaseConfigured, useEmulators } from "./firebase";

/** Firebase Authentication is loaded on demand, so it adds nothing to the first page load. */
export interface AuthUser {
  uid: string;
  email: string;
}

export const MIN_PASSWORD_LENGTH = 8;

let authInstance: Auth | null = null;

async function authKit() {
  const m = await import("firebase/auth");
  if (!authInstance) {
    authInstance = m.getAuth(getFirebaseApp());
    if (useEmulators) m.connectAuthEmulator(authInstance, "http://127.0.0.1:9099", { disableWarnings: true });
  }
  return { m, auth: authInstance };
}

/** Calls `onChange` with the signed-in user, or null. Returns a function that stops listening. */
export function watchAuth(onChange: (user: AuthUser | null) => void): () => void {
  if (!isFirebaseConfigured) {
    onChange(null);
    return () => {};
  }
  let stop: () => void = () => {};
  let cancelled = false;
  void (async () => {
    try {
      const { m, auth } = await authKit();
      if (cancelled) return;
      stop = m.onAuthStateChanged(auth, (user) => onChange(user ? { uid: user.uid, email: user.email ?? "" } : null));
    } catch {
      onChange(null);
    }
  })();
  return () => {
    cancelled = true;
    stop();
  };
}

export async function registerAccount(email: string, password: string): Promise<void> {
  const { m, auth } = await authKit();
  await m.createUserWithEmailAndPassword(auth, email.trim(), password);
}

export async function signInAccount(email: string, password: string): Promise<void> {
  const { m, auth } = await authKit();
  await m.signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function signOutAccount(): Promise<void> {
  const { m, auth } = await authKit();
  await m.signOut(auth);
}

export async function sendPasswordReset(email: string): Promise<void> {
  const { m, auth } = await authKit();
  await m.sendPasswordResetEmail(auth, email.trim());
}

/** Plain-language text for the errors a person can actually fix. */
export function describeAuthError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "auth/email-already-in-use":
      return "That email already has an account. Try signing in instead.";
    case "auth/invalid-email":
      return "That email address doesn't look right.";
    case "auth/weak-password":
      return `Choose a longer password (at least ${MIN_PASSWORD_LENGTH} characters).`;
    case "auth/invalid-credential":
    case "auth/wrong-password":
    case "auth/user-not-found":
      return "The email or password is not right.";
    case "auth/too-many-requests":
      return "Too many attempts. Wait a few minutes and try again.";
    case "auth/network-request-failed":
      return "No connection. Check your internet and try again.";
    case "auth/operation-not-allowed":
    case "auth/configuration-not-found":
      return "Email sign-in is not switched on for this project yet.";
    default:
      return "Something went wrong. Please try again.";
  }
}
