import type { Item } from "./types";

/**
 * Deleting and syncing.
 *
 * A delete reaches the account's backup only while sync is actually running and the device is online.
 * A delete made offline (or while signed out, or with sync off) removes the item from this device only.
 * If it is in the backup, it simply comes back at the next sync, for example when the person logs back in.
 */
export function deleteReachesBackup(syncOn: boolean, online: boolean): boolean {
  return syncOn && online;
}

/** The question asked before deleting an item, written for what will really happen. */
export function deleteQuestion(name: string, reachesBackup: boolean): string {
  return reachesBackup
    ? `Delete "${name}" everywhere (expenses, warranty and subscriptions)?\n\nIt will also be removed from your account's backup.`
    : `Delete "${name}" from this device (expenses, warranty and subscriptions)?\n\nIf it is backed up in your account, it comes back the next time you sync.`;
}

/** Items a sync just brought to this device: in `after` but not in `before`. */
export function findNewItems(before: Pick<Item, "id">[], after: Item[]): Item[] {
  const known = new Set(before.map((item) => item.id));
  return after.filter((item) => !known.has(item.id));
}

export interface Discovery {
  /** Names of the items that were found, in the order they will be listed. */
  names: string[];
  /** How many were found in all (the list shows only the first few). */
  count: number;
  /** True when at least one was scanned with a receipt photo, which stays on the other device. */
  mentionsPhotos: boolean;
}

const LISTED = 6;

/** What the "new items found" pop-up needs to say, or null when nothing new arrived. */
export function describeDiscovery(found: Pick<Item, "name" | "hasReceiptImage">[]): Discovery | null {
  if (found.length === 0) return null;
  return {
    names: found.slice(0, LISTED).map((item) => item.name),
    count: found.length,
    mentionsPhotos: found.some((item) => item.hasReceiptImage),
  };
}
