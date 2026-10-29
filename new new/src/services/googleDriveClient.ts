/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * Google Drive REST API Client (v3)
 * Handles folder management, multipart binary upload, and metadata attachment.
 */

export interface DriveUploadMetadata {
  title: string;
  childName: string;
  date: string;
  category: string;
  notes: string;
  weightKg?: number;
  heightCm?: number;
  headCircumferenceCm?: number;
}

export interface DriveUploadResult {
  fileId: string;
  webViewLink: string;
  webContentLink?: string;
  name: string;
  folderId: string;
}

/**
 * Finds or creates the dedicated parenting journal folder on the user's Google Drive.
 */
export async function getOrCreateJournalFolder(
  accessToken: string,
  childName: string
): Promise<string> {
  const folderName = `Jurnal Tumbuh Kembang - ${childName || 'Anak'}`;

  // 1. Check if folder already exists
  const query = encodeURIComponent(
    `name = '${folderName}' and mimeType = 'application/vnd.google-apps.folder' and trashed = false`
  );

  const searchRes = await fetch(
    `https://www.googleapis.com/drive/v3/files?q=${query}&fields=files(id,name)`,
    {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    }
  );

  if (!searchRes.ok) {
    const errText = await searchRes.text();
    console.error('Failed to search Drive folder:', errText);
    throw new Error(`Gagal mencari folder di Google Drive: ${searchRes.statusText}`);
  }

  const searchData = await searchRes.json();
  if (searchData.files && searchData.files.length > 0) {
    return searchData.files[0].id;
  }

  // 2. Create new folder if not found
  const createRes = await fetch('https://www.googleapis.com/drive/v3/files', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${accessToken}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      name: folderName,
      mimeType: 'application/vnd.google-apps.folder',
      description: `Folder otomatis untuk menyimpan foto, video, dan milestone tumbuh kembang ${childName}`,
    }),
  });

  if (!createRes.ok) {
    const errText = await createRes.text();
    console.error('Failed to create Drive folder:', errText);
    throw new Error(`Gagal membuat folder di Google Drive: ${createRes.statusText}`);
  }

  const newFolder = await createRes.json();
  return newFolder.id;
}

/**
 * Uploads a file (or Blob) directly to the user's Google Drive folder with metadata.
 */
export async function uploadMediaToGoogleDrive(
  fileOrBlob: Blob | File,
  metadata: DriveUploadMetadata,
  accessToken: string,
  onProgress?: (step: string) => void
): Promise<DriveUploadResult> {
  if (onProgress) onProgress('Mempersiapkan folder Google Drive...');
  const folderId = await getOrCreateJournalFolder(accessToken, metadata.childName);

  if (onProgress) onProgress('Mengunggah file ke Google Drive...');

  const fileName =
    fileOrBlob instanceof File
      ? fileOrBlob.name
      : `Momen_${metadata.date}_${metadata.title.replace(/\s+/g, '_')}.jpg`;

  const mimeType = fileOrBlob.type || 'image/jpeg';

  const boundary = '-------314159265358979323846';
  const delimiter = `\r\n--${boundary}\r\n`;
  const closeDelim = `\r\n--${boundary}--`;

  const fileMetadata = {
    name: fileName,
    mimeType: mimeType,
    parents: [folderId],
    description: JSON.stringify({
      appName: 'TumbuhKembang - Jurnal Ayah',
      childName: metadata.childName,
      date: metadata.date,
      title: metadata.title,
      category: metadata.category,
      weightKg: metadata.weightKg,
      heightCm: metadata.heightCm,
      headCircumferenceCm: metadata.headCircumferenceCm,
      notes: metadata.notes,
    }),
  };

  // Build multipart body
  const metadataBlob = new Blob([JSON.stringify(fileMetadata)], {
    type: 'application/json; charset=UTF-8',
  });

  const multipartBody = new Blob(
    [
      delimiter,
      'Content-Type: application/json; charset=UTF-8\r\n\r\n',
      metadataBlob,
      delimiter,
      `Content-Type: ${mimeType}\r\n`,
      'Content-Transfer-Encoding: binary\r\n\r\n',
      fileOrBlob,
      closeDelim,
    ],
    { type: `multipart/related; boundary=${boundary}` }
  );

  const uploadRes = await fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id,name,webViewLink,webContentLink,thumbnailLink',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
      body: multipartBody,
    }
  );

  if (!uploadRes.ok) {
    const errText = await uploadRes.text();
    console.error('Google Drive Upload error:', errText);
    throw new Error(`Upload Google Drive gagal (${uploadRes.status}): ${errText}`);
  }

  const result = await uploadRes.json();

  if (onProgress) onProgress('Selesai tersimpan di Google Drive!');

  return {
    fileId: result.id,
    webViewLink: result.webViewLink || `https://drive.google.com/file/d/${result.id}/view`,
    webContentLink: result.webContentLink,
    name: result.name || fileName,
    folderId,
  };
}

/**
 * Fetches Google Drive user storage quota
 */
export async function fetchDriveQuota(accessToken: string): Promise<{
  usageGb: string;
  limitGb: string;
} | null> {
  try {
    const res = await fetch('https://www.googleapis.com/drive/v3/about?fields=storageQuota', {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });
    if (!res.ok) return null;
    const data = await res.json();
    if (data.storageQuota) {
      const usageBytes = parseInt(data.storageQuota.usage || '0', 10);
      const limitBytes = parseInt(data.storageQuota.limit || '16106127360', 10); // ~15GB
      return {
        usageGb: (usageBytes / (1024 * 1024 * 1024)).toFixed(2),
        limitGb: (limitBytes / (1024 * 1024 * 1024)).toFixed(0),
      };
    }
    return null;
  } catch (err) {
    console.warn('Could not fetch Drive quota:', err);
    return null;
  }
}
