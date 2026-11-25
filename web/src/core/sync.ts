import { getFirebaseApp } from "./firebase";
import { migrateItem } from "./items";
import { mergeItems, type MergeResult, type RemoteDoc, type Tombstones } from "./merge";
import type { Item } from "./types";

/**
 * Optional backup and sync of items to the signed-in account, in Cloud Firestore at
 * users/{uid}/items/{itemId}. Only item details are uploaded. Receipt photos stay on the device.
 * Firestore is loaded on demand, so it adds nothing to the first page load.
 */

const BATCH_SIZE = 400; // Firestore allows 500 writes per batch.

async function open(uid: string) {
  const m = await import("firebase/firestore");
  const db = m.getFirestore(getFirebaseApp());
  return { m, db, items: m.collection(db, "users", uid, "items") };
}

/** Firestore rejects `undefined`, so drop it. */
function clean<T>(value: T): T {
  return JSON.parse(JSON.stringify(value)) as T;
}

/** Downloads the cloud copy, merges it with this device's items, and uploads what is newer here. */
export async function syncItems(uid: string, local: Item[], tombstones: Tombstones): Promise<MergeResult> {
  const { m, db, items } = await open(uid);

  const snapshot = await m.getDocs(items);
  const remote: RemoteDoc[] = [];
  snapshot.forEach((d) => {
    const data = d.data();
    const updatedAt = typeof data.updatedAt === "number" ? data.updatedAt : 0;
    if (data.deleted === true) {
      remote.push({ id: d.id, updatedAt, deleted: true });
      return;
    }
    const item = migrateItem({ ...data, id: d.id });
    if (item) remote.push({ id: d.id, updatedAt: item.updatedAt, item });
  });

  const result = mergeItems(local, remote, tombstones);

  const writes: { id: string; data: Record<string, unknown> }[] = [
    ...result.upload.map((item) => ({ id: item.id, data: clean(item) as unknown as Record<string, unknown> })),
    ...result.uploadDeletes.map((d) => ({ id: d.id, data: { id: d.id, deleted: true, updatedAt: d.deletedAt } })),
  ];
  for (let i = 0; i < writes.length; i += BATCH_SIZE) {
    const batch = m.writeBatch(db);
    for (const write of writes.slice(i, i + BATCH_SIZE)) batch.set(m.doc(items, write.id), write.data);
    await batch.commit();
  }
  return result;
}

/** Permanently deletes everything this account has stored in the cloud. */
export async function deleteCloudData(uid: string): Promise<number> {
  const { m, db, items } = await open(uid);
  const snapshot = await m.getDocs(items);
  const refs = snapshot.docs.map((d) => d.ref);
  for (let i = 0; i < refs.length; i += BATCH_SIZE) {
    const batch = m.writeBatch(db);
    for (const ref of refs.slice(i, i + BATCH_SIZE)) batch.delete(ref);
    await batch.commit();
  }
  return refs.length;
}

/** Plain-language text for sync problems. */
export function describeSyncError(error: unknown): string {
  const code = typeof error === "object" && error && "code" in error ? String((error as { code: unknown }).code) : "";
  switch (code) {
    case "permission-denied":
      return "The cloud refused the request. Check that Firestore rules are deployed and you are signed in.";
    case "not-found":
    case "failed-precondition":
      return "The cloud database has not been created yet for this project.";
    case "unavailable":
    case "deadline-exceeded":
      return "Could not reach the cloud. Check your connection; your items are safe on this device.";
    case "unauthenticated":
      return "Please sign in again to sync.";
    default:
      return "Sync failed. Your items are safe on this device. Try again later.";
  }
}
