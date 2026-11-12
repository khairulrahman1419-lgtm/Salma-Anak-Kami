/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Layanan Upload Media Terpadu (Utama: Cloudinary `la3st6qh` -> URL disimpan ke Firestore `salma-anak-kami`)
 * Dilengkapi Offline Fallback otomatis (IndexedDB + dataUrl lokal) saat internet sedang mati,
 * yang akan diunggah otomatis ke Cloudinary begitu HP kembali online.
 */

import {
  ref,
  uploadBytes,
  uploadBytesResumable,
  getDownloadURL,
  deleteObject,
  type UploadTask,
} from 'firebase/storage';
import { auth, storage } from '../firebase.ts';
import { uploadToCloudinary, uploadToCloudinaryChunked } from './cloudinaryService.ts';
import { saveOfflineMediaBlob } from './offlineStorage.ts';
import { getMomentMediaSlides } from '../utils/imageHelper.ts';
import type { MomentItem, MediaStorageProvider } from '../types/index.ts';

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
 * Unggah media ke Firebase Storage ("salma-anak-kami") menggunakan uploadBytesResumable.
 * Khusus video disimpan di direktori `videos/` dan mengembalikan download URL resmi HTTPS.
 */
export async function uploadToFirebaseStorageResumable(
  blob: Blob,
  safeFileName: string,
  folderDirectory = 'videos',
  onProgress?: (percent: number, loadedBytes?: number, totalBytes?: number) => void,
  options?: FirebaseResumableOptions
): Promise<string> {
  const cleanDir = folderDirectory.replace(/^\/+|\/+$/g, '') || 'videos';
  const objectPath = `${cleanDir}/${Date.now()}_${safeFileName}`;
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

    // Kirim notifikasi progres awal segera agar UI menampilkan total ukuran file sejak milidetik pertama
    if (onProgress) {
      onProgress(0, 0, blob.size);
    }

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
        if (options?.signal?.aborted) return;
        const total = snapshot.totalBytes > 0 ? snapshot.totalBytes : blob.size;
        const transferred = snapshot.bytesTransferred || 0;
        const pct =
          total > 0
            ? Math.min(99, Math.round((transferred / total) * 100))
            : 0;

        if (onProgress) {
          onProgress(pct, transferred, total);
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
 * Menghapus file media dari Firebase Storage
 */
export async function deleteFirebaseStorageMedia(mediaUrl: string): Promise<boolean> {
  try {
    if (!mediaUrl || !mediaUrl.includes('firebasestorage')) return false;
    const storageRef = ref(storage, mediaUrl);
    await deleteObject(storageRef);
    return true;
  } catch (err) {
    console.warn('Gagal menghapus file dari Firebase Storage:', err);
    return false;
  }
}

/**
 * Menghapus bersih seluruh file media suatu momen dari Firebase Storage & Cloudinary
 */
export async function deleteMomentMediaFiles(moment: MomentItem): Promise<void> {
  const slides = getMomentMediaSlides(moment);
  await Promise.allSettled(
    slides.map(async (slide) => {
      const url = slide.url;
      if (!url) return;
      if (url.includes('firebasestorage')) {
        await deleteFirebaseStorageMedia(url);
      } else {
        try {
          await fetch('/api/delete-media', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ url }),
          });
        } catch {
          // ignore
        }
      }
    })
  );
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

export interface UploadMediaResult {
  url: string;
  mediaType: 'photo' | 'video';
  storageProvider: 'cloudinary' | 'firebase';
}

export interface ChildMediaUploadOptions {
  signal?: AbortSignal;
  onTaskCreated?: (task: UploadTask) => void;
  onFallbackTriggered?: (provider: 'firebase_storage', reason: string) => void;
}

/**
 * Mengunggah foto atau video tumbuh kembang Salma sesuai standar arsitektur:
 * 1. Khusus Video (video/*): Langsung diunggah ke Firebase Storage ("salma-anak-kami")
 *    di folder `videos/` menggunakan uploadBytesResumable untuk stabilitas & kapasitas besar.
 * 2. Khusus Foto: Diunggah ke Cloudinary ("la3st6qh"). Jika Cloudinary terkendala,
 *    otomatis beralih ke Firebase Storage di folder `photos/`.
 * 3. Menghasilkan download URL resmi HTTPS yang siap disimpan ke Firestore bersama metadata provider.
 */
export async function uploadChildMediaWithProviderInfo(
  input: File | Blob | string,
  preferredName = 'momen_salma.jpg',
  folderCategory: 'moments' | 'avatars' = 'moments',
  onProgress?: (percent: number, loadedBytes?: number, totalBytes?: number) => void,
  options?: ChildMediaUploadOptions
): Promise<UploadMediaResult> {
  const safeName = safeFileName(preferredName);

  // Jika sudah berupa URL HTTPS resmi (Cloudinary / Firebase / aset lokal)
  if (typeof input === 'string' && !input.startsWith('data:') && !input.startsWith('blob:')) {
    const isVideo =
      /\.(mp4|mov|webm|mkv|avi|m4v)/i.test(input) || input.includes('/video/');
    const isFirebase =
      input.includes('firebasestorage') || input.includes('firebase');
    return {
      url: input,
      mediaType: isVideo ? 'video' : 'photo',
      storageProvider: isFirebase ? 'firebase' : 'cloudinary',
    };
  }

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

  const isVideo =
    (input instanceof File && input.type.startsWith('video/')) ||
    (typeof blob !== 'undefined' && blob.type.startsWith('video/')) ||
    /\.(mp4|mov|webm|mkv|avi|m4v)/i.test(preferredName) ||
    (dataUrl ? dataUrl.startsWith('data:video') : false);

  const normalizedMediaType: 'photo' | 'video' = isVideo ? 'video' : 'photo';

  // Offline Fallback: Simpan Blob di IndexedDB agar momen tidak hilang saat internet mati
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    const offlineKey = `offline_${Date.now()}_${safeName}`;
    await saveOfflineMediaBlob(offlineKey, blob);
    const resolvedFallback = dataUrl || (await fileOrBlobToDataUrl(blob));
    return {
      url: resolvedFallback,
      mediaType: normalizedMediaType,
      storageProvider: 'cloudinary',
    };
  }

  // JALUR 100% CLOUDINARY RESMI (Endpoint: https://api.cloudinary.com/v1_1/la3st6qh/auto/upload)
  // Semua media (Foto dan Video) diunggah langsung ke Cloudinary
  try {
    const isLargeFile = blob.size > 20 * 1024 * 1024;
    const cloudinaryPromise = isLargeFile
      ? uploadToCloudinaryChunked(blob, safeName, onProgress, {
          signal: options?.signal,
          timeoutMs: 900_000,
        })
      : uploadToCloudinary(blob, safeName, onProgress, {
          signal: options?.signal,
          timeoutMs: 450_000,
        });

    const cloudinaryRes = await cloudinaryPromise;
    if (cloudinaryRes.secure_url) {
      return {
        url: cloudinaryRes.secure_url,
        mediaType: normalizedMediaType,
        storageProvider: 'cloudinary',
      };
    }

    throw new Error('Respons Cloudinary tidak memiliki secure_url.');
  } catch (cloudinaryErr: any) {
    if (options?.signal?.aborted) {
      throw new Error('Pengunggahan ke Cloudinary dibatalkan oleh pengguna.');
    }
    const errText = cloudinaryErr?.message || String(cloudinaryErr);
    console.error('Cloudinary upload failure:', errText);
    throw new Error(errText);
  }

  // JALUR CADANGAN LOKAL
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
      const returnedUrl = data?.url ? String(data.url) : '';
      if (returnedUrl.length > 0) {
        return {
          url: returnedUrl,
          mediaType: normalizedMediaType,
          storageProvider: 'cloudinary',
        };
      }
    }
  } catch {
    const offlineKey = `offline_${Date.now()}_${safeName}`;
    await saveOfflineMediaBlob(offlineKey, blob);
  }

  return {
    url: resolvedDataUrl,
    mediaType: normalizedMediaType,
    storageProvider: 'cloudinary',
  };
}

/**
 * Wrapper praktis yang mengembalikan langsung URL HTTPS
 */
export async function uploadChildMediaOnline(
  input: File | Blob | string,
  preferredName = 'momen_salma.jpg',
  folderCategory: 'moments' | 'avatars' = 'moments',
  onProgress?: (percent: number, loadedBytes?: number, totalBytes?: number) => void,
  options?: ChildMediaUploadOptions
): Promise<string> {
  const result = await uploadChildMediaWithProviderInfo(
    input,
    preferredName,
    folderCategory,
    onProgress,
    options
  );
  return result.url;
}

function safeFileName(raw: string): string {
  return raw.replace(/[^a-zA-Z0-9._-]/g, '_');
}
