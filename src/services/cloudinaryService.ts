/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cloudinary Media Upload Service ("la3st6qh" / preset "wvulbv7y")
 * Mengunggah foto (JPG, PNG, WEBP) dan video (MP4, MOV, WEBM) langsung ke
 * https://api.cloudinary.com/v1_1/la3st6qh/auto/upload dan mengembalikan secure_url HTTPS
 * untuk disimpan ke dokumen Cloud Firestore ("salma-anak-kami").
 */

import { cloudinaryConfig } from '../firebase.ts';

/**
 * Format Cloudinary Resmi:
 * Endpoint: https://api.cloudinary.com/v1_1/la3st6qh/auto/upload
 * Cloud Name: la3st6qh
 * Upload Preset: wvulbv7y (Unsigned Upload)
 */
export const CLOUDINARY_CLOUD_NAME = 'la3st6qh';
export const CLOUDINARY_UPLOAD_PRESET = 'wvulbv7y';
export const CLOUDINARY_UPLOAD_URL = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;

export interface CloudinaryUploadResponse {
  asset_id?: string;
  public_id: string;
  secure_url: string;
  url?: string;
  resource_type: 'image' | 'video' | 'raw' | string;
  format?: string;
  bytes?: number;
  width?: number;
  height?: number;
  duration?: number;
}

export interface CloudinaryUploadOptions {
  timeoutMs?: number;
  signal?: AbortSignal;
}

export type CloudinaryProgressCallback = (
  percent: number,
  loadedBytes?: number,
  totalBytes?: number
) => void;

/**
 * Mengunggah File atau Blob foto/video langsung ke Cloudinary menggunakan unsigned upload preset.
 * Menggunakan format resmi: https://api.cloudinary.com/v1_1/la3st6qh/auto/upload
 * dengan cloud_name 'la3st6qh' dan upload_preset 'wvulbv7y'.
 */
export function uploadToCloudinary(
  fileOrBlob: File | Blob,
  fileName = 'salma_media.jpg',
  onProgress?: CloudinaryProgressCallback,
  options?: CloudinaryUploadOptions
): Promise<CloudinaryUploadResponse> {
  return new Promise((resolve, reject) => {
    if (options?.signal?.aborted) {
      reject(new Error('Waktu unggah ke Cloudinary habis (dibatalkan).'));
      return;
    }

    // Pastikan parameter dan endpoint resmi Cloudinary digunakan dengan benar
    const cloudName = CLOUDINARY_CLOUD_NAME;
    const uploadPreset = CLOUDINARY_UPLOAD_PRESET;
    const uploadUrl = `https://api.cloudinary.com/v1_1/${cloudName}/auto/upload`;

    const formData = new FormData();
    formData.append('file', fileOrBlob, fileName);
    formData.append('upload_preset', uploadPreset);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', uploadUrl, true);
    // Batas waktu fleksibel & sangat lapang untuk file video/foto besar (15 menit untuk file >50MB)
    xhr.timeout =
      options?.timeoutMs ??
      (fileOrBlob.size > 50 * 1024 * 1024 ? 900_000 : 300_000);

    const handleAbortSignal = () => {
      try {
        xhr.abort();
      } catch {
        // ignore abort error
      }
      reject(new Error('Waktu unggah ke Cloudinary melebihi batas waktu.'));
    };

    if (options?.signal) {
      options.signal.addEventListener('abort', handleAbortSignal, { once: true });
    }

    const cleanupSignal = () => {
      if (options?.signal) {
        options.signal.removeEventListener('abort', handleAbortSignal);
      }
    };

    if (xhr.upload && onProgress) {
      xhr.upload.onprogress = (event) => {
        if (event.lengthComputable && event.total > 0) {
          const pct = Math.min(99, Math.round((event.loaded / event.total) * 100));
          onProgress(pct, event.loaded, event.total);
        }
      };
    }

    xhr.onload = () => {
      cleanupSignal();

      // Cek terlebih dahulu apakah xhr.status === 200
      if (xhr.status !== 200) {
        let serverErrorMsg = `HTTP ${xhr.status}`;
        if (xhr.responseText) {
          try {
            const errJson = JSON.parse(xhr.responseText) as {
              error?: { message?: string };
              message?: string;
            };
            serverErrorMsg = errJson.error?.message || errJson.message || xhr.responseText.slice(0, 300);
          } catch {
            // Tampilkan pesan error asli dari server (misal teks atau HTML status)
            const cleanText = xhr.responseText.replace(/<[^>]*>/g, '').trim().slice(0, 300);
            serverErrorMsg = cleanText || `HTTP ${xhr.status} (${xhr.statusText || 'Gagal'})`;
          }
        } else if (xhr.statusText) {
          serverErrorMsg = `HTTP ${xhr.status}: ${xhr.statusText}`;
        }

        reject(new Error(`Upload Cloudinary gagal (${xhr.status}): ${serverErrorMsg}`));
        return;
      }

      // Jika xhr.status === 200, lakukan pembacaan respon sukses
      try {
        const parsed = JSON.parse(xhr.responseText) as CloudinaryUploadResponse;
        const finalUrl = parsed.secure_url || parsed.url;
        if (!finalUrl) {
          reject(new Error('Respons Cloudinary tidak menyertakan secure_url.'));
          return;
        }
        if (onProgress) onProgress(100);
        resolve({
          ...parsed,
          secure_url: finalUrl.replace(/^http:\/\//i, 'https://'),
        });
      } catch (err: any) {
        reject(
          new Error(
            `Format data respons Cloudinary tidak valid: ${err?.message || xhr.responseText?.slice(0, 150) || 'Respons kosong'}`
          )
        );
      }
    };

    xhr.onerror = () => {
      cleanupSignal();
      reject(new Error('Koneksi jaringan terputus saat mengunggah ke Cloudinary.'));
    };

    xhr.ontimeout = () => {
      cleanupSignal();
      reject(new Error('Waktu unggah ke Cloudinary habis (timeout).'));
    };

    xhr.onabort = () => {
      cleanupSignal();
      reject(new Error('Unggahan Cloudinary dibatalkan karena koneksi lambat.'));
    };

    xhr.send(formData);
  });
}

/**
 * Mengunggah file besar bertahap (chunked upload) ke Cloudinary resmi
 * untuk file video/foto berukuran besar agar upload stabil.
 */
export async function uploadToCloudinaryChunked(
  fileOrBlob: File | Blob,
  fileName = 'salma_video.mp4',
  onProgress?: CloudinaryProgressCallback,
  options?: CloudinaryUploadOptions
): Promise<CloudinaryUploadResponse> {
  const chunkSize = 6 * 1024 * 1024; // 6MB per slice
  const totalSize = fileOrBlob.size;
  const uniqueId = `cl_chunk_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  const totalChunks = Math.ceil(totalSize / chunkSize);

  let currentStart = 0;
  let lastResponse: CloudinaryUploadResponse | null = null;

  for (let chunkIdx = 0; chunkIdx < totalChunks; chunkIdx++) {
    if (options?.signal?.aborted) {
      throw new Error('Pengunggahan ke Cloudinary dibatalkan.');
    }

    const currentEnd = Math.min(currentStart + chunkSize, totalSize);
    const chunkBlob = fileOrBlob.slice(currentStart, currentEnd);

    const formData = new FormData();
    formData.append('file', chunkBlob, fileName);
    formData.append('upload_preset', CLOUDINARY_UPLOAD_PRESET);

    const uploadUrl = `https://api.cloudinary.com/v1_1/${CLOUDINARY_CLOUD_NAME}/auto/upload`;
    const xhr = new XMLHttpRequest();

    const chunkPromise = new Promise<CloudinaryUploadResponse>((resolve, reject) => {
      const handleAbort = () => {
        try {
          xhr.abort();
        } catch {
          // ignore
        }
        reject(new Error('Pengunggahan dibatalkan.'));
      };

      if (options?.signal) {
        options.signal.addEventListener('abort', handleAbort, { once: true });
      }

      xhr.open('POST', uploadUrl, true);
      xhr.setRequestHeader('X-Unique-Upload-Id', uniqueId);
      xhr.setRequestHeader(
        'Content-Range',
        `bytes ${currentStart}-${currentEnd - 1}/${totalSize}`
      );
      xhr.timeout = 240_000; // 4 menit per chunk

      if (xhr.upload && onProgress) {
        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const overallLoaded = currentStart + event.loaded;
            const overallPct = Math.min(99, Math.round((overallLoaded / totalSize) * 100));
            onProgress(overallPct, overallLoaded, totalSize);
          }
        };
      }

      xhr.onload = () => {
        if (options?.signal) {
          options.signal.removeEventListener('abort', handleAbort);
        }
        if (xhr.status !== 200) {
          let errMsg = `HTTP ${xhr.status}`;
          try {
            const errJson = JSON.parse(xhr.responseText);
            errMsg = errJson.error?.message || errJson.message || errMsg;
          } catch {
            errMsg = xhr.responseText?.slice(0, 200) || errMsg;
          }
          reject(new Error(`Chunk upload Cloudinary gagal: ${errMsg}`));
          return;
        }
        try {
          const parsed = JSON.parse(xhr.responseText) as CloudinaryUploadResponse;
          resolve(parsed);
        } catch (e: any) {
          reject(new Error(`Format JSON respons Cloudinary tidak valid: ${e?.message}`));
        }
      };

      xhr.onerror = () => {
        if (options?.signal) {
          options.signal.removeEventListener('abort', handleAbort);
        }
        reject(new Error('Koneksi jaringan terputus saat chunk upload Cloudinary.'));
      };

      xhr.ontimeout = () => {
        if (options?.signal) {
          options.signal.removeEventListener('abort', handleAbort);
        }
        reject(new Error('Waktu chunk upload Cloudinary habis.'));
      };

      xhr.send(formData);
    });

    lastResponse = await chunkPromise;
    currentStart = currentEnd;
  }

  if (!lastResponse?.secure_url && !lastResponse?.url) {
    throw new Error('Respons akhir Cloudinary tidak menyertakan secure_url.');
  }

  const finalUrl = (lastResponse.secure_url || lastResponse.url || '').replace(
    /^http:\/\//i,
    'https://'
  );
  if (onProgress) onProgress(100, totalSize, totalSize);

  return {
    ...lastResponse,
    secure_url: finalUrl,
  };
}
