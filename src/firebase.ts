/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Konfigurasi Firebase Firestore ("salma-anak-kami") & Cloudinary ("la3st6qh")
 * - Cloud Firestore: Menyimpan data teks harian (biodata, catatan, BB/TB, milestone, Mutiara Parenting)
 *   dan URL media secara real-time antara HP Ayah & HP Bunda, lengkap dengan cache offline IndexedDB.
 * - Cloudinary: Menyimpan file foto & video tumbuh kembang Salma.
 */

import { initializeApp, getApps, getApp, type FirebaseApp } from 'firebase/app';
import { getAuth, type Auth } from 'firebase/auth';
import {
  getFirestore,
  initializeFirestore,
  persistentLocalCache,
  persistentMultipleTabManager,
  type Firestore,
} from 'firebase/firestore';
import { getStorage, type FirebaseStorage } from 'firebase/storage';

export interface SalmaFirebaseConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
}

export interface SalmaCloudinaryConfig {
  cloudName: string;
  uploadPreset: string;
  uploadUrl: string;
}

/**
 * 1. Konfigurasi Firebase Firestore Proyek "salma-anak-kami"
 */
export const firebaseConfig: SalmaFirebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || 'AIzaSyCA-oapuqrmK0lhq2IJF1Kvw6NqrAfutsc',
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || 'salma-anak-kami.firebaseapp.com',
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || 'salma-anak-kami',
  storageBucket:
    import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || 'salma-anak-kami.firebasestorage.app',
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || '327328080570',
  appId:
    import.meta.env.VITE_FIREBASE_APP_ID || '1:327328080570:web:641b88478a45edd7885883',
};

/**
 * 2. Konfigurasi Cloudinary untuk Upload Foto & Video Salma
 */
export const cloudinaryConfig: SalmaCloudinaryConfig = {
  cloudName: import.meta.env.VITE_CLOUDINARY_CLOUD_NAME || 'la3st6qh',
  uploadPreset: import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET || 'wvulbv7y',
  uploadUrl:
    import.meta.env.VITE_CLOUDINARY_UPLOAD_URL ||
    'https://api.cloudinary.com/v1_1/la3st6qh/auto/upload',
};

// Inisialisasi Aplikasi Firebase ("salma-anak-kami")
export const app: FirebaseApp = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);

// Inisialisasi Cloud Firestore dengan Persistent Local Cache (Offline Fallback IndexedDB)
function createSalmaFirestore(firebaseApp: FirebaseApp): Firestore {
  try {
    return initializeFirestore(firebaseApp, {
      localCache: persistentLocalCache({
        tabManager: persistentMultipleTabManager(),
      }),
      experimentalAutoDetectLongPolling: true,
    });
  } catch {
    // Fallback aman apabila instance sudah terinisialisasi atau di lingkungan browser terbatas
    return getFirestore(firebaseApp);
  }
}

export const db: Firestore = createSalmaFirestore(app);

// Inisialisasi Firebase Storage cadangan pada proyek yang sama
export const storage: FirebaseStorage = getStorage(
  app,
  firebaseConfig.storageBucket.startsWith('gs://')
    ? firebaseConfig.storageBucket
    : `gs://${firebaseConfig.storageBucket}`
);

// Inisialisasi Firebase Authentication
export const auth: Auth = getAuth(app);
