import { migrateItem } from "./items";
import type { Tombstones } from "./merge";
import type { RateTable } from "./rates";
import { resolveSettings } from "./settings";
import type { Item, Settings } from "./types";

// Key names keep the app's earlier working name so items saved before the rename are not lost.
const ITEMS_KEY = "instapay.items";
const SESSION_KEY = "instapay.session";
const NOTIFIED_KEY = "instapay.notified";
const SETTINGS_KEY = "instapay.settings";
const DELETED_KEY = "instapay.deleted";
const RATES_KEY = "instapay.rates";
const OWNER_KEY = "instapay.owner";
const PROMPT_HIDDEN_KEY = "instapay.syncPromptHidden";

export type Session = "offline" | "account";

function read<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as T) : fallback;
  } catch {
    return fallback;
  }
}

function write(key: string, value: unknown): void {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Storage full or blocked (private mode): the app still works for this session.
  }
}

function remove(key: string): void {
  try {
    localStorage.removeItem(key);
  } catch {
    // Ignore.
  }
}

export function loadItems(): Item[] {
  const raw = read<unknown>(ITEMS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return raw.map((entry) => migrateItem(entry)).filter((item): item is Item => item !== null);
}
export const saveItems = (items: Item[]): void => write(ITEMS_KEY, items);

export function loadSession(): Session | null {
  const value = read<unknown>(SESSION_KEY, null);
  return value === "offline" || value === "account" ? value : null;
}
export const saveSession = (session: Session): void => write(SESSION_KEY, session);
export const clearSession = (): void => remove(SESSION_KEY);

export const loadSettings = (): Settings => resolveSettings(read<unknown>(SETTINGS_KEY, {}));
export const saveSettings = (settings: Settings): void => write(SETTINGS_KEY, settings);

/**
 * The account whose cloud copy the items on this device are synced with. It lets the app notice when a
 * different person signs in on the same device, so one person's items are never quietly added to
 * someone else's account.
 */
export function loadOwner(): string | null {
  const value = read<unknown>(OWNER_KEY, null);
  return typeof value === "string" && value !== "" ? value : null;
}
export const saveOwner = (uid: string): void => write(OWNER_KEY, uid);

/** Whether the person hid the "you can sync" button. Only a convenience, so it is safe to lose. */
export const loadPromptHidden = (): boolean => read<unknown>(PROMPT_HIDDEN_KEY, false) === true;
export const savePromptHidden = (hidden: boolean): void => write(PROMPT_HIDDEN_KEY, hidden);

export function loadTombstones(): Tombstones {
  const raw = read<unknown>(DELETED_KEY, {});
  if (!raw || typeof raw !== "object") return {};
  const out: Tombstones = {};
  for (const [id, at] of Object.entries(raw)) if (typeof at === "number") out[id] = at;
  return out;
}
export const saveTombstones = (tombstones: Tombstones): void => write(DELETED_KEY, tombstones);

/** The last exchange rates downloaded, so conversion also works offline. */
export function loadRates(): RateTable | null {
  const raw = read<Partial<RateTable> | null>(RATES_KEY, null);
  if (!raw || typeof raw.date !== "string" || typeof raw.fetchedAt !== "number" || !raw.rates || typeof raw.rates !== "object") return null;
  return { date: raw.date, fetchedAt: raw.fetchedAt, rates: raw.rates as Record<string, number> };
}
export const saveRates = (table: RateTable): void => write(RATES_KEY, table);

/** Remembers which reminders were already shown today so they are not repeated. */
export function wasNotifiedToday(key: string, today: string): boolean {
  return read<Record<string, string>>(NOTIFIED_KEY, {})[key] === today;
}

export function markNotified(key: string, today: string): void {
  const map = read<Record<string, string>>(NOTIFIED_KEY, {});
  map[key] = today;
  write(NOTIFIED_KEY, map);
}

/** Removes everything the app keeps in this browser, except the welcome-screen choice. */
export function clearLocalData(): void {
  remove(ITEMS_KEY);
  remove(DELETED_KEY);
  remove(NOTIFIED_KEY);
  remove(OWNER_KEY); // nothing is left on this device, so it belongs to nobody
}
