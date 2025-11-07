const isBrowser = typeof window !== 'undefined' && typeof indexedDB !== 'undefined';
const DB_NAME = 'word-image-cache';
const STORE_NAME = 'images';
const DB_VERSION = 1;

type IDBInstance = IDBDatabase | null;

let dbPromise: Promise<IDBInstance> | null = null;

const openDatabase = (): Promise<IDBInstance> => {
  if (!isBrowser) {
    return Promise.resolve(null);
  }

  if (!dbPromise) {
    dbPromise = new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);

      request.onerror = () => {
        console.error('Не удалось открыть IndexedDB для изображений', request.error);
        reject(request.error);
      };

      request.onsuccess = () => {
        resolve(request.result);
      };

      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains(STORE_NAME)) {
          db.createObjectStore(STORE_NAME);
        }
      };
    }).catch(() => null);
  }

  return dbPromise;
};

const runTransaction = async <T>(
  mode: IDBTransactionMode,
  executor: (store: IDBObjectStore) => IDBRequest<T>
): Promise<T | undefined> => {
  const db = await openDatabase();
  if (!db) return undefined;

  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE_NAME, mode);
    const store = tx.objectStore(STORE_NAME);
    const request = executor(store);

    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

export const saveWordImageData = async (storageKey: string, dataUrl: string): Promise<void> => {
  await runTransaction('readwrite', store => store.put(dataUrl, storageKey));
};

export const loadWordImageData = async (storageKey: string): Promise<string | undefined> => {
  return runTransaction('readonly', store => store.get(storageKey));
};

export const deleteWordImageData = async (storageKey: string): Promise<void> => {
  await runTransaction('readwrite', store => store.delete(storageKey));
};

export const clearAllWordImages = async (): Promise<void> => {
  await runTransaction('readwrite', store => store.clear());
};
