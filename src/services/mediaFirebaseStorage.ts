/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Layanan Upload Media Terpadu (Utama: Cloudinary `la3st6qh` -> URL disimpan ke Firestore `salma-anak-kami`)
 * Dilengkapi Offline Fallback otomatis (IndexedDB + dataUrl lokal) saat internet sedang mati,
 * yang akan diunggah otomatis ke Cloudinary begitu HP kembali online.
 */

import { ref, uploadBytes, uploadBytesResumable, getDownloadURL, type UploadTask } from 'firebase/storage';
import { auth, storage } from '../firebase.ts';
import { uploadToCloudinary, uploadToCloudinaryChunked } from './cloudinaryService.ts';
import { saveOfflineMediaBlob } from './offlineStorage.ts';

function fileOrBlobToDataUrl(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file media.'));
    reader.onload = () => resolve(String(reader.result || ''));
    reader.readAsDataURL(blob);
  });
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = dataUrl.match(/^data:([^;]+);base64,(.+)$/);
  if (!match) {
    throw new Error('Data URL tidak valid.');
  }
  const mime = match[1];
  const binary = atob(match[2]);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return new Blob([bytes], { type: mime });
}

export interface FirebaseResumableOptions {
  signal?: AbortSignal;
  onTaskCreated?: (task: UploadTask) => void;
}

/**
 * Unggah media ke Firebase Storage bawaan ("salma-anak-kami") secara resumable (uploadBytesResumable).
 * Mendukung file video/foto berukuran besar tanpa batasan, dengan progres byte akurat & fitur batal.
 */
export async function uploadToFirebaseStorageResumable(
  blob: Blob,
  safeFileName: string,
  folderCategory: 'moments' | 'avatars' = 'moments',
  onProgress?: (percent: number, loadedBytes?: number, totalBytes?: number) => void,
  options?: FirebaseResumableOptions
): Promise<string> {
  const ownerFolder = auth.currentUser?.uid || 'salma_family';
  const objectPath = `journals/${ownerFolder}/${folderCategory}/${Date.now()}_${safeFileName}`;
  const storageRef = ref(storage, objectPath);

  return new Promise<string>((resolve, reject) => {
    if (options?.signal?.aborted) {
      reject(new Error('Pengunggahan ke Firebase Storage dibatalkan.'));
      return;
    }

    const uploadTask = uploadBytesResumable(storageRef, blob, {
      contentType: blob.type || (safeFileName.endsWith('.mp4') ? 'video/mp4' : 'image/jpeg'),
    });

    options?.onTaskCreated?.(uploadTask);

    const onAbort = () => {
      try {
        uploadTask.cancel();
      } catch {
        // ignore
      }
      reject(new Error('Pengunggahan dibatalkan oleh pengguna.'));
    };

    if (options?.signal) {
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    const cleanup = () => {
      if (options?.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
    };

    uploadTask.on(
      'state_changed',
      (snapshot) => {
        if (snapshot.totalBytes > 0 && onProgress) {
          const pct = Math.min(
            99,
            Math.round((snapshot.bytesTransferred / snapshot.totalBytes) * 100)
          );
          onProgress(pct, snapshot.bytesTransferred, snapshot.totalBytes);
        }
      },
      (error) => {
        cleanup();
        console.warn('Firebase Storage upload error:', error);
        reject(error);
      },
      async () => {
        cleanup();
        try {
          const downloadUrl = await getDownloadURL(uploadTask.snapshot.ref);
          if (onProgress) onProgress(100, blob.size, blob.size);
          resolve(downloadUrl);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
}

/**
 * Mengunggah foto profil ke Cloudinary dengan batas waktu ketat (misal <= 5 detik)
 * tanpa retry panjang yang membuat modal menggantung. Melempar error jika offline/lambat
 * sehingga pemanggil dapat menyimpan lokal (IndexedDB / LocalStorage) terlebih dahulu.
 */
export async function uploadAvatarToCloudinaryWithTimeout(
  input: string | undefined,
  preferredName = 'avatar_salma.jpg',
  timeoutMs = 5000,
  signal?: AbortSignal
): Promise<string> {
  const clean = (input || '').trim();
  if (!clean) return '';
  if (!clean.startsWith('data:') && !clean.startsWith('blob:')) {
    return clean;
  }

  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    throw new Error('Perangkat sedang offline.');
  }

  const safeName = preferredName.replace(/[^a-zA-Z0-9._-]/g, '_');
  let blob: Blob;
  if (clean.startsWith('blob:')) {
    const resp = await fetch(clean);
    blob = await resp.blob();
  } else {
    blob = dataUrlToBlob(clean);
  }

  const res = await uploadToCloudinary(blob, safeName, undefined, {
    timeoutMs: Math.max(500, timeoutMs),
    signal,
  });
  if (!res.secure_url) {
    throw new Error('URL Cloudinary kosong.');
  }
  return res.secure_url;
}

export interface ChildMediaUploadOptions {
  signal?: AbortSignal;
  onTaskCreated?: (task: UploadTask) => void;
  onFallbackTriggered?: (provider: 'firebase_storage', reason: string) => void;
}

/**
 * Mengunggah foto atau video tumbuh kembang Salma secara otomatis & seamless:
 * 1. Mencoba Cloudinary terlebih dahulu (format resmi https://api.cloudinary.com/v1_1/la3st6qh/auto/upload)
 * 2. Jika Cloudinary gagal atau ukuran file terlalu besar, otomatis beralih ke Firebase Storage (uploadBytesResumable)
 * 3. Menghasilkan HTTPS URL resmi yang langsung disimpan ke Firestore
 */
export async function uploadChildMediaOnline(
  input: File | Blob | string,
  preferredName = 'momen_salma.jpg',
  folderCategory: 'moments' | 'avatars' = 'moments',
  onProgress?: (percent: number, loadedBytes?: number, totalBytes?: number) => void,
  options?: ChildMediaUploadOptions
): Promise<string> {
  // Jika sudah berupa URL HTTPS (Cloudinary / Firebase / CDN / aset lokal), tidak perlu diunggah ulang
  if (typeof input === 'string' && !input.startsWith('data:') && !input.startsWith('blob:')) {
    return input;
  }

  const safeName = preferredName.replace(/[^a-zA-Z0-9._-]/g, '_');
  let blob: Blob;
  let dataUrl: string | null = null;

  if (typeof input === 'string') {
    if (input.startsWith('blob:')) {
      const resp = await fetch(input);
      blob = await resp.blob();
    } else {
      dataUrl = input;
      blob = dataUrlToBlob(input);
    }
  } else {
    blob = input;
  }

  // Offline Fallback: Jika internet HP sedang mati, simpan Blob di IndexedDB agar tetap aman
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const offlineKey = `offline_${Date.now()}_${safeName}`;
    await saveOfflineMediaBlob(offlineKey, blob);
    return dataUrl || (await fileOrBlobToDataUrl(blob));
  }

  // 1. Prioritas Utama: Unggah ke Cloudinary resmi
  try {
    const isLargeFile = blob.size > 20 * 1024 * 1024; // > 20MB
    const cloudinaryPromise = isLargeFile
      ? uploadToCloudinaryChunked(blob, safeName, onProgress, {
          signal: options?.signal,
          timeoutMs: 900_000,
        })
      : uploadToCloudinary(blob, safeName, onProgress, {
          signal: options?.signal,
          timeoutMs: 300_000,
        });

    const cloudinaryRes = await cloudinaryPromise;
    if (cloudinaryRes.secure_url) {
      return cloudinaryRes.secure_url;
    }
  } catch (cloudinaryErr: any) {
    if (options?.signal?.aborted) {
      throw new Error('Pengunggahan dibatalkan.');
    }
    const errText = cloudinaryErr?.message || String(cloudinaryErr);
    console.warn(
      'Cloudinary upload mengalami kendala, beralih otomatis ke Firebase Storage:',
      errText
    );
    options?.onFallbackTriggered?.(
      'firebase_storage',
      'Mengalihkan pengunggahan ke Firebase Storage (cadangan kapasitas besar)...'
    );
  }

  // 2. Cadangan Otomatis: Firebase Storage pada proyek `salma-anak-kami` (Kapasitas besar tanpa batas ukuran)
  try {
    const fbStorageUrl = await uploadToFirebaseStorageResumable(
      blob,
      safeFileName(safeName),
      folderCategory,
      onProgress,
      {
        signal: options?.signal,
        onTaskCreated: options?.onTaskCreated,
      }
    );
    if (fbStorageUrl) {
      return fbStorageUrl;
    }
  } catch (fbErr: any) {
    if (options?.signal?.aborted) {
      throw new Error('Pengunggahan dibatalkan.');
    }
    console.warn('Firebase Storage upload error:', fbErr);
  }

  // 3. Cadangan Server Lokal (`/uploads/...`) atau IndexedDB
  const resolvedDataUrl = dataUrl || (await fileOrBlobToDataUrl(blob));
  try {
    const res = await fetch('/api/upload-media', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        dataUrl: resolvedDataUrl,
        fileName: safeName,
      }),
    });
    if (res.ok) {
      const data = (await res.json()) as { url?: string };
      if (data.url) {
        return data.url;
      }
    }
  } catch {
    const offlineKey = `offline_${Date.now()}_${safeName}`;
    await saveOfflineMediaBlob(offlineKey, blob);
  }

  return resolvedDataUrl;
}

function safeFileName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]/g, '_');
}
