import type { Item } from "./types";

/** A deleted item's id and the time it was deleted (epoch ms). */
export type Tombstones = Record<string, number>;

/** What a cloud document may hold: a full item, or a marker that the item was deleted. */
export interface RemoteDoc {
  id: string;
  updatedAt: number;
  deleted?: boolean;
  item?: Item;
}

export interface MergeResult {
  /** The merged list to keep locally. */
  items: Item[];
  /** True when `items` differs from the local list, so the UI should update. */
  localChanged: boolean;
  /** Local items that are newer than the cloud copy (or missing there) and must be uploaded. */
  upload: Item[];
  /** Deletions that must be recorded in the cloud. */
  uploadDeletes: { id: string; deletedAt: number }[];
  /** Tombstones to keep after the merge (a newer edit elsewhere cancels an older delete). */
  tombstones: Tombstones;
}

/**
 * Last-writer-wins merge of this device's items with the cloud copy.
 * - Newer `updatedAt` wins for an item that exists in both places.
 * - A delete wins over an edit only if it is newer than the edit.
 */
export function mergeItems(local: Item[], remote: RemoteDoc[], tombstones: Tombstones): MergeResult {
  const localById = new Map(local.map((i) => [i.id, i]));
  const remoteById = new Map(remote.map((d) => [d.id, d]));
  const merged = new Map<string, Item>();
  const upload: Item[] = [];
  const uploadDeletes: { id: string; deletedAt: number }[] = [];
  const nextTombstones: Tombstones = { ...tombstones };
  let localChanged = false;

  // Items known only to the cloud, or to both.
  for (const doc of remote) {
    const mine = localById.get(doc.id);
    const myDeletedAt = tombstones[doc.id];

    if (doc.deleted) {
      if (mine && mine.updatedAt > doc.updatedAt) {
        // Edited here after it was deleted elsewhere: keep it and bring it back to the cloud.
        merged.set(mine.id, mine);
        upload.push(mine);
        delete nextTombstones[doc.id];
      } else {
        if (mine) localChanged = true;
        nextTombstones[doc.id] = Math.max(doc.updatedAt, myDeletedAt ?? 0);
      }
      continue;
    }

    const theirs = doc.item;
    if (!theirs) continue;

    if (myDeletedAt !== undefined && myDeletedAt >= theirs.updatedAt) {
      // Deleted here after the cloud copy was last changed.
      uploadDeletes.push({ id: doc.id, deletedAt: myDeletedAt });
      continue;
    }
    if (myDeletedAt !== undefined) delete nextTombstones[doc.id];

    if (!mine) {
      merged.set(theirs.id, theirs);
      localChanged = true;
    } else if (theirs.updatedAt > mine.updatedAt) {
      merged.set(theirs.id, theirs);
      localChanged = true;
    } else {
      merged.set(mine.id, mine);
      if (mine.updatedAt > theirs.updatedAt) upload.push(mine);
    }
  }

  // Items that exist only on this device.
  for (const mine of local) {
    if (remoteById.has(mine.id)) continue;
    merged.set(mine.id, mine);
    upload.push(mine);
  }

  // Deletions the cloud does not know about yet.
  for (const [id, deletedAt] of Object.entries(tombstones)) {
    if (remoteById.has(id)) continue;
    uploadDeletes.push({ id, deletedAt });
  }

  const items = [...merged.values()].sort((a, b) => b.updatedAt - a.updatedAt);
  return { items, localChanged, upload, uploadDeletes, tombstones: nextTombstones };
}
