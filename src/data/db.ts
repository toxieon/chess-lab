/**
 * Chess Lab — IndexedDB cache for archives and analysis.
 * Copyright (C) 2026 Brandon N
 * SPDX-License-Identifier: AGPL-3.0-only
 */

const DB_NAME = 'chess-lab';
const DB_VERSION = 1;

function requestToPromise<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise((resolve, reject) => {
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function openDb(): Promise<IDBDatabase | null> {
  if (typeof indexedDB === 'undefined') return null;
  try {
    return await new Promise((resolve, reject) => {
      const request = indexedDB.open(DB_NAME, DB_VERSION);
      request.onupgradeneeded = () => {
        const db = request.result;
        if (!db.objectStoreNames.contains('archives')) db.createObjectStore('archives');
        if (!db.objectStoreNames.contains('analysis')) db.createObjectStore('analysis');
      };
      request.onsuccess = () => resolve(request.result);
      request.onerror = () => reject(request.error);
    });
  } catch {
    return null;
  }
}

export async function idbGet<T>(store: string, key: string): Promise<T | undefined> {
  const db = await openDb();
  if (!db) return undefined;
  const tx = db.transaction(store, 'readonly');
  return requestToPromise(tx.objectStore(store).get(key) as IDBRequest<T | undefined>);
}

export async function idbPut(store: string, value: unknown, key: string): Promise<void> {
  const db = await openDb();
  if (!db) return;
  const tx = db.transaction(store, 'readwrite');
  await requestToPromise(tx.objectStore(store).put(value, key));
}

export async function idbGetAll<T>(store: string): Promise<T[]> {
  const db = await openDb();
  if (!db) return [];
  const tx = db.transaction(store, 'readonly');
  const rows = await requestToPromise(tx.objectStore(store).getAll() as IDBRequest<T[]>);
  return rows ?? [];
}

export async function idbKeys(store: string): Promise<string[]> {
  const db = await openDb();
  if (!db) return [];
  const tx = db.transaction(store, 'readonly');
  const keys = await requestToPromise(tx.objectStore(store).getAllKeys());
  return keys.map((key) => String(key));
}
