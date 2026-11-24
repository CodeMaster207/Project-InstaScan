import type { WarrantyItem } from "./types";

const ITEMS_KEY = "instapay.items";
const SESSION_KEY = "instapay.session";
const NOTIFIED_KEY = "instapay.notified";

export type Session = "registered" | "offline";

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

export const loadItems = (): WarrantyItem[] => read<WarrantyItem[]>(ITEMS_KEY, []);
export const saveItems = (items: WarrantyItem[]): void => write(ITEMS_KEY, items);

export const loadSession = (): Session | null => read<Session | null>(SESSION_KEY, null);
export const saveSession = (session: Session): void => write(SESSION_KEY, session);

/** Remembers which reminders were already shown today so they are not repeated. */
export function wasNotifiedToday(id: string, today: string): boolean {
  return read<Record<string, string>>(NOTIFIED_KEY, {})[id] === today;
}

export function markNotified(id: string, today: string): void {
  const map = read<Record<string, string>>(NOTIFIED_KEY, {});
  map[id] = today;
  write(NOTIFIED_KEY, map);
}
