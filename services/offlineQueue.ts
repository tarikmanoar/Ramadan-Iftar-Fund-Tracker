/**
 * Offline Queue — IndexedDB-backed queue for writes made while offline.
 *
 * Only ADD operations are queued (Option B safety model).
 * UPDATE / DELETE are blocked in the UI while offline.
 *
 * Queue items are processed in timestamp order when the device comes back online.
 */

export type QueuedActionType = 'ADD_DONATION' | 'ADD_EXPENSE';

export interface QueuedAction {
  id: string;            // client-generated UUID — also used as the temp record ID
  type: QueuedActionType;
  payload: any;          // the full object that would be sent to the API
  timestamp: number;
}

const DB_NAME = 'iftar-offline-queue';
const STORE = 'actions';
const DB_VERSION = 1;

function openDB(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = (e) => {
      const db = (e.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE)) {
        db.createObjectStore(STORE, { keyPath: 'id' });
      }
    };
    req.onsuccess = (e) => resolve((e.target as IDBOpenDBRequest).result);
    req.onerror = () => reject(req.error);
  });
}

export const offlineQueue = {
  /** Add an action to the queue. Returns the action (including its id). */
  async enqueue(type: QueuedActionType, payload: any): Promise<QueuedAction> {
    const db = await openDB();
    const action: QueuedAction = {
      id: payload.id ?? crypto.randomUUID(),
      type,
      payload,
      timestamp: Date.now(),
    };
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).add(action);
      tx.oncomplete = () => resolve(action);
      tx.onerror = () => reject(tx.error);
    });
  },

  /** Return all queued actions sorted by timestamp (oldest first). */
  async getAll(): Promise<QueuedAction[]> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).getAll();
      req.onsuccess = () =>
        resolve((req.result as QueuedAction[]).sort((a, b) => a.timestamp - b.timestamp));
      req.onerror = () => reject(req.error);
    });
  },

  /** Remove a successfully synced action. */
  async remove(id: string): Promise<void> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readwrite');
      tx.objectStore(STORE).delete(id);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  },

  /** How many actions are pending. */
  async count(): Promise<number> {
    const db = await openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(STORE, 'readonly');
      const req = tx.objectStore(STORE).count();
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  },
};
