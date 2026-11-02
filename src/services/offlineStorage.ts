/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Offline Fallback Engine (IndexedDB + localStorage + Antrean Sinkronisasi Offline)
 * Menjamin aplikasi tetap berjalan mulus 100% ketika internet mati/offline, lalu
 * menyinkronkan perubahan tertunda secara otomatis ke Firebase Storage & Firestore saat online kembali.
 */

import { saveToStorage, loadFromStorage, STORAGE_KEYS } from '../utils/googleDriveService.ts';
import type {
  ChildProfile,
  GrowthRecord,
  MilestoneChecklistItem,
  MomentItem,
  ParentingQuoteItem,
} from '../types/index.ts';

export const OFFLINE_STORAGE_KEYS = {
  ...STORAGE_KEYS,
  PARENTING_QUOTES: 'tumbuhkembang_parenting_quotes_v1',
};

const IDB_NAME = 'tumbuhkembang_idb_v1';
const IDB_VERSION = 1;
const STORE_APP_STATE = 'app_state';
const STORE_PENDING_MUTATIONS = 'pending_mutations';
const STORE_MEDIA_BLOBS = 'offline_media_blobs';

export type OfflineMutationKind =
  | 'profile:update'
  | 'moment:create'
  | 'moment:update'
  | 'growth:create'
  | 'milestone:toggle'
  | 'quote:update';

export interface QueuedOfflineMutation {
  id: string;
  kind: OfflineMutationKind;
  payload: unknown;
  createdAt: number;
}

function openIndexedDb(): Promise<IDBDatabase | null> {
  if (typeof window === 'undefined' || !('indexedDB' in window)) {
    return Promise.resolve(null);
  }

  return new Promise((resolve) => {
    try {
      const req = window.indexedDB.open(IDB_NAME, IDB_VERSION);
      req.onupgradeneeded = () => {
        const db = req.result;
        if (!db.objectStoreNames.contains(STORE_APP_STATE)) {
          db.createObjectStore(STORE_APP_STATE);
        }
        if (!db.objectStoreNames.contains(STORE_PENDING_MUTATIONS)) {
          db.createObjectStore(STORE_PENDING_MUTATIONS, { keyPath: 'id' });
        }
        if (!db.objectStoreNames.contains(STORE_MEDIA_BLOBS)) {
          db.createObjectStore(STORE_MEDIA_BLOBS);
        }
      };
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => resolve(null);
    } catch {
      resolve(null);
    }
  });
}

async function idbPut(storeName: string, value: unknown, key?: string): Promise<void> {
  const db = await openIndexedDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readwrite');
      const store = tx.objectStore(storeName);
      if (key !== undefined) {
        store.put(value, key);
      } else {
        store.put(value);
      }
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

async function idbGet<T>(storeName: string, key: string): Promise<T | null> {
  const db = await openIndexedDb();
  if (!db) return null;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(storeName, 'readonly');
      const store = tx.objectStore(storeName);
      const req = store.get(key);
      req.onsuccess = () => {
        db.close();
        resolve((req.result as T) ?? null);
      };
      req.onerror = () => {
        db.close();
        resolve(null);
      };
    } catch {
      db.close();
      resolve(null);
    }
  });
}

/**
 * Menyimpan state ke localStorage (sinkron untuk fast boot) sekaligus IndexedDB (kapasitas besar untuk mode offline).
 */
export function persistLocalState<T>(key: string, data: T): void {
  saveToStorage(key, data);
  void idbPut(STORE_APP_STATE, data, key);
}

/**
 * Menyimpan state ke localStorage & menunggu penulisan IndexedDB selesai (dengan pengaman 400ms
 * agar UI tidak pernah tertahan apabila IndexedDB browser sedang terkunci).
 */
export async function persistLocalStateAsync<T>(key: string, data: T): Promise<void> {
  saveToStorage(key, data);
  await Promise.race([
    idbPut(STORE_APP_STATE, data, key),
    new Promise<void>((resolve) => setTimeout(resolve, 400)),
  ]);
}

/**
 * Memuat state awal secara sinkron dari localStorage (dengan migrasi otomatis bila masih berisi data lama).
 */
export function loadInitialLocalProfile(fallback: ChildProfile): ChildProfile {
  const saved = loadFromStorage<ChildProfile | null>(OFFLINE_STORAGE_KEYS.PROFILE, null);
  if (!saved || saved.id === 'child_arka_01') {
    return fallback;
  }
  return { ...fallback, ...saved };
}

export function loadInitialLocalMoments(fallback: MomentItem[]): MomentItem[] {
  const saved = loadFromStorage<MomentItem[] | null>(OFFLINE_STORAGE_KEYS.MOMENTS, null);
  if (!saved || saved.length === 0) return fallback;
  // Jika masih menggunakan data contoh lama Kalandra, perbarui ke Salma
  if (saved.some((m) => m.notes?.includes('Kalandra'))) {
    return fallback;
  }
  return saved;
}

export function loadInitialLocalRecords(fallback: GrowthRecord[]): GrowthRecord[] {
  const saved = loadFromStorage<GrowthRecord[] | null>(OFFLINE_STORAGE_KEYS.GROWTH_RECORDS, null);
  if (!saved || saved.length === 0) return fallback;
  if (saved.some((r) => r.id === 'gr_0' && r.date === '2025-06-15')) {
    return fallback;
  }
  return saved;
}

export function loadInitialLocalMilestones(
  fallback: MilestoneChecklistItem[]
): MilestoneChecklistItem[] {
  return loadFromStorage(OFFLINE_STORAGE_KEYS.MILESTONES, fallback);
}

export function loadInitialLocalQuotes(fallback: ParentingQuoteItem[]): ParentingQuoteItem[] {
  return loadFromStorage(OFFLINE_STORAGE_KEYS.PARENTING_QUOTES, fallback);
}

/**
 * Memulihkan snapshot dari IndexedDB bila localStorage pernah dibersihkan oleh browser HP.
 */
export async function hydrateStateFromIndexedDb(): Promise<{
  profile?: ChildProfile;
  moments?: MomentItem[];
  records?: GrowthRecord[];
  milestones?: MilestoneChecklistItem[];
  parentingQuotes?: ParentingQuoteItem[];
}> {
  const [profile, moments, records, milestones, parentingQuotes] = await Promise.all([
    idbGet<ChildProfile>(STORE_APP_STATE, OFFLINE_STORAGE_KEYS.PROFILE),
    idbGet<MomentItem[]>(STORE_APP_STATE, OFFLINE_STORAGE_KEYS.MOMENTS),
    idbGet<GrowthRecord[]>(STORE_APP_STATE, OFFLINE_STORAGE_KEYS.GROWTH_RECORDS),
    idbGet<MilestoneChecklistItem[]>(STORE_APP_STATE, OFFLINE_STORAGE_KEYS.MILESTONES),
    idbGet<ParentingQuoteItem[]>(STORE_APP_STATE, OFFLINE_STORAGE_KEYS.PARENTING_QUOTES),
  ]);

  return {
    profile: profile && profile.id !== 'child_arka_01' ? profile : undefined,
    moments:
      moments && !moments.some((m) => m.notes?.includes('Kalandra')) ? moments : undefined,
    records:
      records && !records.some((r) => r.id === 'gr_0' && r.date === '2025-06-15')
        ? records
        : undefined,
    milestones: milestones || undefined,
    parentingQuotes: parentingQuotes || undefined,
  };
}

/**
 * Menyimpan file Blob foto/video di IndexedDB ketika aplikasi sedang offline.
 */
export async function saveOfflineMediaBlob(mediaKey: string, blob: Blob): Promise<void> {
  await idbPut(STORE_MEDIA_BLOBS, blob, mediaKey);
}

export async function getOfflineMediaBlob(mediaKey: string): Promise<Blob | null> {
  return await idbGet<Blob>(STORE_MEDIA_BLOBS, mediaKey);
}

export async function removeOfflineMediaBlob(mediaKey: string): Promise<void> {
  const db = await openIndexedDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_MEDIA_BLOBS, 'readwrite');
      tx.objectStore(STORE_MEDIA_BLOBS).delete(mediaKey);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

/**
 * Menambahkan perubahan ke antrean offline IndexedDB saat internet mati.
 */
export async function enqueueOfflineMutation(
  kind: OfflineMutationKind,
  payload: unknown,
  dedupeKey?: string
): Promise<void> {
  const id = dedupeKey || `${kind}_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`;
  const item: QueuedOfflineMutation = {
    id,
    kind,
    payload,
    createdAt: Date.now(),
  };
  await idbPut(STORE_PENDING_MUTATIONS, item);
}

export async function loadOfflineMutations(): Promise<QueuedOfflineMutation[]> {
  const db = await openIndexedDb();
  if (!db) return [];
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PENDING_MUTATIONS, 'readonly');
      const req = tx.objectStore(STORE_PENDING_MUTATIONS).getAll();
      req.onsuccess = () => {
        db.close();
        const items = Array.isArray(req.result) ? (req.result as QueuedOfflineMutation[]) : [];
        items.sort((a, b) => a.createdAt - b.createdAt);
        resolve(items);
      };
      req.onerror = () => {
        db.close();
        resolve([]);
      };
    } catch {
      db.close();
      resolve([]);
    }
  });
}

export async function removeOfflineMutation(id: string): Promise<void> {
  const db = await openIndexedDb();
  if (!db) return;
  return new Promise((resolve) => {
    try {
      const tx = db.transaction(STORE_PENDING_MUTATIONS, 'readwrite');
      tx.objectStore(STORE_PENDING_MUTATIONS).delete(id);
      tx.oncomplete = () => {
        db.close();
        resolve();
      };
      tx.onerror = () => {
        db.close();
        resolve();
      };
    } catch {
      db.close();
      resolve();
    }
  });
}

export async function hasPendingOfflineMutation(id: string): Promise<boolean> {
  const item = await idbGet<QueuedOfflineMutation>(STORE_PENDING_MUTATIONS, id);
  return Boolean(item);
}

