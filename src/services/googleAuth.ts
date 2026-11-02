/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Google Authentication & Firebase Instance Re-exports
 * Seluruh layanan (Auth, Cloud Firestore, Firebase Storage) menggunakan 1 Proyek Firebase
 * yang sama dari `src/firebase.ts`.
 */

import {
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  type User,
  signOut,
} from 'firebase/auth';
import { app, auth, db, storage, firebaseConfig } from '../firebase.ts';

export { app, auth, db, storage, firebaseConfig };

// Provider dengan Google Drive file scope
const provider = new GoogleAuthProvider();
provider.addScope('https://www.googleapis.com/auth/drive.file');
provider.setCustomParameters({
  prompt: 'select_account',
});

let cachedAccessToken: string | null = null;

/**
 * Inisialisasi listener status login Google / Firebase Auth
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, async (user: User | null) => {
    if (user) {
      if (onAuthSuccess) {
        onAuthSuccess(user, cachedAccessToken);
      }
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) {
        onAuthFailure();
      }
    }
  });
};

/**
 * Membuka popup Sign-In Google (sekaligus mengaktifkan Cloud Firestore & Storage Real-Time)
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);

    cachedAccessToken = credential?.accessToken || '';
    return { user: result.user, accessToken: cachedAccessToken };
  } catch (error: unknown) {
    console.error('Google Sign-In Error:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => {
  return cachedAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const logoutGoogle = async () => {
  await signOut(auth);
  cachedAccessToken = null;
};
