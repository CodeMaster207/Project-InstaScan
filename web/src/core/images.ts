/**
 * Receipt photos are kept in IndexedDB on this device only. They are never uploaded by sync:
 * a receipt photo is the most private thing the app holds. localStorage is too small for photos.
 * Every function fails soft, so a blocked or full database never breaks the app.
 */
const DB_NAME = "instascan-receipts";
const STORE = "photos";

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    if (typeof indexedDB === "undefined") {
      reject(new Error("IndexedDB is not available"));
      return;
    }
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => request.result.createObjectStore(STORE);
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

async function run<T>(mode: IDBTransactionMode, work: (store: IDBObjectStore) => IDBRequest<T>): Promise<T> {
  const db = await open();
  try {
    return await new Promise<T>((resolve, reject) => {
      const request = work(db.transaction(STORE, mode).objectStore(STORE));
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } finally {
    db.close();
  }
}

/** Saves a photo (as a data URL). Returns false if it could not be stored. */
export async function saveReceiptImage(id: string, dataUrl: string): Promise<boolean> {
  try {
    await run("readwrite", (s) => s.put(dataUrl, id));
    return true;
  } catch {
    return false;
  }
}

export async function loadReceiptImage(id: string): Promise<string | null> {
  try {
    const value = await run<unknown>("readonly", (s) => s.get(id));
    return typeof value === "string" ? value : null;
  } catch {
    return null;
  }
}

export async function deleteReceiptImage(id: string): Promise<void> {
  try {
    await run("readwrite", (s) => s.delete(id));
  } catch {
    // Nothing to do.
  }
}

export async function clearReceiptImages(): Promise<void> {
  try {
    await run("readwrite", (s) => s.clear());
  } catch {
    // Nothing to do.
  }
}
