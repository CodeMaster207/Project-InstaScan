import type { Settings } from "./types";

/** Sync is opt-in: nobody is synced until they turn it on. */
export const DEFAULT_SETTINGS: Settings = {
  defaultCurrency: "RM",
  syncUid: null,
  autoConvert: true,
};

/** Turns whatever was saved into valid settings. Anything unexpected falls back to the safe default. */
export function resolveSettings(raw: unknown): Settings {
  const saved = (raw && typeof raw === "object" ? raw : {}) as Record<string, unknown>;
  const currency =
    typeof saved.defaultCurrency === "string" && saved.defaultCurrency.trim()
      ? saved.defaultCurrency.trim().toUpperCase().slice(0, 4)
      : DEFAULT_SETTINGS.defaultCurrency;
  return {
    defaultCurrency: currency,
    // An older "sync on" flag with no account attached is dropped: that person simply opts in again.
    syncUid: typeof saved.syncUid === "string" && saved.syncUid !== "" ? saved.syncUid : null,
    autoConvert: saved.autoConvert !== false,
  };
}

/** True when sync should run: someone is signed in, and it is that same account that opted in. */
export function isSyncOn(settings: Pick<Settings, "syncUid">, signedInUid: string | null): boolean {
  return signedInUid !== null && settings.syncUid === signedInUid;
}
