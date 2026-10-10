// Minimal promise wrapper over IndexedDB: one database, a key-value store and a blob store keyed by media path.

const DB_NAME = 'picto-woordspel';
const VERSION = 1;
export const KV = 'kv';
export const BLOBS = 'blobs';

let dbPromise: Promise<IDBDatabase> | null = null;

function open(): Promise<IDBDatabase> {
  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const req = indexedDB.open(DB_NAME, VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(KV)) db.createObjectStore(KV);
        if (!db.objectStoreNames.contains(BLOBS)) db.createObjectStore(BLOBS);
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
    dbPromise.catch(() => (dbPromise = null));
  }
  return dbPromise;
}

function done<T>(req: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });
}

export async function get<T>(store: string, key: string): Promise<T | undefined> {
  const db = await open();
  return done(db.transaction(store).objectStore(store).get(key)) as Promise<T | undefined>;
}

export async function put(store: string, key: string, value: unknown): Promise<void> {
  const db = await open();
  await done(db.transaction(store, 'readwrite').objectStore(store).put(value, key));
}

export async function del(store: string, keys: string[]): Promise<void> {
  if (!keys.length) return;
  const db = await open();
  const tx = db.transaction(store, 'readwrite');
  for (const k of keys) tx.objectStore(store).delete(k);
  await new Promise<void>((resolve, reject) => {
    tx.oncomplete = () => resolve();
    tx.onerror = () => reject(tx.error);
  });
}

export async function keys(store: string): Promise<string[]> {
  const db = await open();
  return (await done(db.transaction(store).objectStore(store).getAllKeys())) as string[];
}

/** For tests: forget the open connection so a fresh fake database can be used. */
export function resetForTests(): void {
  dbPromise = null;
}
