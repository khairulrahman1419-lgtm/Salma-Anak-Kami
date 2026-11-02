/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Layanan Upload Media Terpadu (Utama: Cloudinary `la3st6qh` -> URL disimpan ke Firestore `salma-anak-kami`)
 * Dilengkapi Offline Fallback otomatis (IndexedDB + dataUrl lokal) saat internet sedang mati,
 * yang akan diunggah otomatis ke Cloudinary begitu HP kembali online.
 */

import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, storage } from '../firebase.ts';
import { uploadToCloudinary } from './cloudinaryService.ts';
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

async function fallbackFirebaseStorageUpload(
  blob: Blob,
  safeFileName: string,
  folderCategory: 'moments' | 'avatars' = 'moments'
): Promise<string | null> {
  try {
    const ownerFolder = auth.currentUser?.uid || 'salma_family';
    const objectPath = `journals/${ownerFolder}/${folderCategory}/${Date.now()}_${safeFileName}`;
    const storageRef = ref(storage, objectPath);
    const snapshot = await uploadBytes(storageRef, blob, {
      contentType: blob.type || 'image/jpeg',
    });
    return await getDownloadURL(snapshot.ref);
  } catch {
    return null;
  }
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

/**
 * Mengunggah foto atau video tumbuh kembang Salma ke Cloudinary (`la3st6qh` / preset `wvulbv7y`)
 * dan mengembalikan `secure_url` HTTPS untuk disimpan ke dokumen Cloud Firestore (`salma-anak-kami`).
 */
export async function uploadChildMediaOnline(
  input: File | Blob | string,
  preferredName = 'momen_salma.jpg',
  folderCategory: 'moments' | 'avatars' = 'moments',
  onProgress?: (percent: number) => void
): Promise<string> {
  // Jika sudah berupa URL HTTPS (Cloudinary / CDN / aset lokal), tidak perlu diunggah ulang
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

  // 1. Prioritas Utama: Unggah langsung ke Cloudinary (https://api.cloudinary.com/v1_1/la3st6qh/auto/upload)
  try {
    const cloudinaryRes = await uploadToCloudinary(blob, safeName, onProgress);
    if (cloudinaryRes.secure_url) {
      return cloudinaryRes.secure_url;
    }
  } catch (cloudinaryErr) {
    console.warn('Cloudinary upload mengalami kendala, mencoba jalur cadangan:', cloudinaryErr);
  }

  // 2. Cadangan: Firebase Storage pada proyek `salma-anak-kami`
  const fbStorageUrl = await fallbackFirebaseStorageUpload(blob, safeName, folderCategory);
  if (fbStorageUrl) {
    return fbStorageUrl;
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
