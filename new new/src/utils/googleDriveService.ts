/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * GOOGLE DRIVE INTEGRATION SERVICE & SIMULATION
 * 
 * =========================================================================================
 * PANDUAN PENGEMBANG (DEVELOPER INTEGRATION GUIDE) UNTUK GOOGLE DRIVE API ASLI:
 * =========================================================================================
 * 
 * Untuk menghubungkan aplikasi ini ke Google Drive API nyata di lingkungan produksi:
 * 
 * 1. AKTIFKAN GOOGLE DRIVE API DI GOOGLE CLOUD CONSOLE:
 *    - Buka Google Cloud Console: https://console.cloud.google.com/
 *    - Buat atau pilih Project.
 *    - Navigasi ke "APIs & Services" > "Library" > cari "Google Drive API" > klik Enable.
 *    - Buat OAuth 2.0 Client ID (Web Application) di menu "Credentials".
 *    - Tambahkan Authorized JavaScript Origins (contoh: https://domain-anda.com).
 * 
 * 2. SCOPE YANG DISIAPKAN:
 *    - 'https://www.googleapis.com/auth/drive.file' (Sangat direkomendasikan karena hanya
 *      mengakses file & folder yang dibuat oleh aplikasi ini, aman & privasi terjaga).
 * 
 * 3. ARSITEKTUR CLIENT-SIDE OAUTH / BACKEND PROXY:
 *    Opsi A (Client-side dengan Google Identity Services - GIS):
 *    ```ts
 *    const tokenClient = google.accounts.oauth2.initTokenClient({
 *      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID,
 *      scope: 'https://www.googleapis.com/auth/drive.file',
 *      callback: async (tokenResponse) => {
 *        const accessToken = tokenResponse.access_token;
 *        await uploadToDriveReal(file, metadata, accessToken);
 *      },
 *    });
 *    tokenClient.requestAccessToken();
 *    ```
 * 
 *    Opsi B (Backend Proxy dengan Express/Node.js):
 *    - Kirim FormData (file + JSON metadata) ke route Express `/api/drive/upload`.
 *    - Backend menggunakan library `@googleapis/drive` dengan service account atau user token:
 *    ```ts
 *    import { google } from 'googleapis';
 *    const drive = google.drive({ version: 'v3', auth: oauth2Client });
 *    const res = await drive.files.create({
 *      requestBody: {
 *        name: `Momen_${metadata.date}_${file.name}`,
 *        parents: [targetFolderId],
 *        description: JSON.stringify(metadata),
 *      },
 *      media: {
 *        mimeType: file.type,
 *        body: fs.createReadStream(tempFilePath),
 *      },
 *    });
 *    ```
 * =========================================================================================
 */

import type { ChildProfile, GrowthRecord, MomentItem } from '../types/index.ts';

export interface DriveUploadProgress {
  status: 'idle' | 'authorizing' | 'creating_folder' | 'uploading_media' | 'saving_metadata' | 'success' | 'error';
  percent: number;
  message: string;
  driveFileUrl?: string;
  driveFileId?: string;
}

export interface DriveUploadPayload {
  file?: File | null;
  previewUrl?: string;
  mediaType: 'image' | 'video';
  date: string;
  title: string;
  category: string;
  notes: string;
  weightKg?: number;
  heightCm?: number;
  headCircumferenceCm?: number;
  childName: string;
}

/**
 * Simulasi Pengunggahan ke Google Drive
 * Meniru proses OAuth handshake, upload multipart file binary, dan penyimpanan metadata JSON.
 */
export async function simulateGoogleDriveUpload(
  payload: DriveUploadPayload,
  onProgress?: (progress: DriveUploadProgress) => void
): Promise<{ fileId: string; webViewLink: string; success: boolean }> {
  const update = (p: DriveUploadProgress) => {
    if (onProgress) onProgress(p);
  };

  try {
    // 1. Simulasi Autentikasi / Token Handshake
    update({
      status: 'authorizing',
      percent: 15,
      message: 'Menghubungkan ke akun Google Drive...',
    });
    await new Promise((r) => setTimeout(r, 400));

    // 2. Simulasi Verifikasi Folder Jurnal di Drive
    update({
      status: 'creating_folder',
      percent: 35,
      message: `Mempersiapkan folder "Jurnal Tumbuh Kembang - ${payload.childName}" di Google Drive...`,
    });
    await new Promise((r) => setTimeout(r, 450));

    // 3. Simulasi Pengunggahan Media Binary
    const mediaName = payload.file ? payload.file.name : `momen_${payload.date}.jpg`;
    update({
      status: 'uploading_media',
      percent: 70,
      message: `Mengunggah media "${mediaName}" ke Google Drive Cloud Storage...`,
    });
    await new Promise((r) => setTimeout(r, 600));

    // 4. Simulasi Penyimpanan Metadata Terstruktur
    update({
      status: 'saving_metadata',
      percent: 90,
      message: 'Menyematkan metadata tumbuh kembang & milestone ke file Drive...',
    });
    await new Promise((r) => setTimeout(r, 350));

    // 5. Sukses
    const mockFileId = `gdrive_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
    const mockWebViewLink = `https://drive.google.com/file/d/${mockFileId}/view?usp=sharing`;

    update({
      status: 'success',
      percent: 100,
      message: 'Berhasil diunggah dan disinkronkan ke Google Drive!',
      driveFileId: mockFileId,
      driveFileUrl: mockWebViewLink,
    });

    return {
      fileId: mockFileId,
      webViewLink: mockWebViewLink,
      success: true,
    };
  } catch (error) {
    update({
      status: 'error',
      percent: 0,
      message: error instanceof Error ? error.message : 'Gagal mengunggah ke Google Drive',
    });
    throw error;
  }
}

// =========================================================================================
// LOCAL PERSISTENCE SYSTEM (Untuk menjaga data tetap ada saat refresh browser)
// =========================================================================================

const STORAGE_KEYS = {
  PROFILE: 'tumbuhkembang_child_profile_v1',
  MOMENTS: 'tumbuhkembang_moments_v1',
  GROWTH_RECORDS: 'tumbuhkembang_growth_records_v1',
  MILESTONES: 'tumbuhkembang_milestones_checklist_v1',
};

export function saveToStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.warn(`Gagal menyimpan ke localStorage key ${key}:`, err);
  }
}

export function loadFromStorage<T>(key: string, fallback: T): T {
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch (err) {
    console.warn(`Gagal memuat dari localStorage key ${key}:`, err);
    return fallback;
  }
}

export { STORAGE_KEYS };

/**
 * Ekspor seluruh data jurnal anak ke format file JSON (Backup Mandiri)
 */
export function exportAppBackup(profile: ChildProfile, moments: MomentItem[], records: GrowthRecord[]) {
  const backupData = {
    appName: 'TumbuhKembang - Jurnal Ayah',
    version: '1.0.0',
    exportedAt: new Date().toISOString(),
    profile,
    moments,
    records,
  };

  const blob = new Blob([JSON.stringify(backupData, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `backup_jurnal_${profile.nickname.toLowerCase()}_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
