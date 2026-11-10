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
 * Mendukung pelaporan persentase & megabytes progres upload serta batas waktu dinamis untuk file besar.
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

    const formData = new FormData();
    formData.append('file', fileOrBlob, fileName);
    formData.append('upload_preset', cloudinaryConfig.uploadPreset);

    const xhr = new XMLHttpRequest();
    xhr.open('POST', cloudinaryConfig.uploadUrl, true);
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
      if (xhr.status >= 200 && xhr.status < 300) {
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
        } catch {
          reject(new Error('Gagal membaca respons JSON dari Cloudinary.'));
        }
      } else {
        let detail = `HTTP ${xhr.status}`;
        try {
          const errJson = JSON.parse(xhr.responseText) as { error?: { message?: string } };
          if (errJson?.error?.message) {
            detail = errJson.error.message;
          }
        } catch {
          // gunakan kode status HTTP
        }
        reject(new Error(`Upload Cloudinary gagal: ${detail}`));
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
