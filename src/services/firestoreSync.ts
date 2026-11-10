/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Cloud Firestore Real-Time Sync Service ("salma-anak-kami")
 * Menyimpan dan menyinkronkan seluruh data harian Salma secara real-time otomatis
 * antara HP Ayah & HP Bunda pada dokumen bersama `journals/salma_family_journal`:
 * 1. Biodata Salma, Ayah & Bunda (`journals/{journalId}`)
 * 2. Foto, Video (URL Cloudinary `la3st6qh`) & Catatan Harian (`journals/{journalId}/moments/{momentId}`)
 * 3. Riwayat Tinggi, Berat Badan & Lingkar Kepala (`journals/{journalId}/growth_records/{recordId}`)
 * 4. Buku Tahapan Milestone (`journals/{journalId}/milestones/{milestoneId}`)
 * 5. Mutiara Parenting (`journals/{journalId}/parenting_quotes/{quoteId}`)
 */

import {
  doc,
  collection,
  getDoc,
  getDocs,
  getDocFromServer,
  setDoc,
  onSnapshot,
  serverTimestamp,
  type Unsubscribe,
} from 'firebase/firestore';
import { auth, db } from '../firebase.ts';
import {
  uploadAvatarToCloudinaryWithTimeout,
  uploadChildMediaOnline,
} from './mediaFirebaseStorage.ts';
import { getClientDeviceId } from './realtimeFamilySync.ts';
import {
  getMomentMediaSlides,
  MAX_EXTRA_FAMILY_PHOTOS,
  MAX_MOMENT_MEDIA_ITEMS,
} from '../utils/imageHelper.ts';
import type {
  ChildProfile,
  FamilyExtraPhoto,
  GrowthRecord,
  MilestoneChecklistItem,
  MomentItem,
  MomentMediaSlide,
  ParentingQuoteItem,
} from '../types/index.ts';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

export interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  };
}

export function handleFirestoreError(
  error: unknown,
  operationType: OperationType,
  path: string | null
): never {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo:
        auth.currentUser?.providerData?.map((provider) => ({
          providerId: provider.providerId,
          email: provider.email,
        })) || [],
    },
    operationType,
    path,
  };
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  throw new Error(JSON.stringify(errInfo));
}

let connectionTested = false;

export async function testFirestoreConnection(): Promise<void> {
  if (connectionTested) return;
  connectionTested = true;
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }
  try {
    await getDocFromServer(doc(db, 'journals', SHARED_SALMA_JOURNAL_ID));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.error('Please check your Firebase configuration.');
    }
  }
}

function clampStr(val: string | undefined | null, maxLen: number, fallback = ''): string {
  const clean = (val ?? fallback).trim();
  return clean.slice(0, maxLen);
}

function sanitizeDocId(rawId: string): string {
  const cleaned = rawId.replace(/[^a-zA-Z0-9_-]/g, '_').slice(0, 128);
  return cleaned || `id_${Date.now()}`;
}

function withCloudTimeout<T>(
  operation: Promise<T>,
  timeoutMs: number,
  timeoutMessage: string
): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => {
      reject(new Error(timeoutMessage));
    }, Math.max(250, timeoutMs));

    operation
      .then((val) => {
        clearTimeout(timer);
        resolve(val);
      })
      .catch((err) => {
        clearTimeout(timer);
        reject(err);
      });
  });
}

/**
 * Memastikan URL media yang disimpan di Firestore adalah URL pendek HTTPS dari Cloudinary
 * (bukan base64 panjang yang membebani dokumen 1MB Firestore).
 */
async function ensureCloudinaryOrShortUrl(
  url: string | undefined,
  fallbackUrl: string,
  folderCategory: 'moments' | 'avatars' = 'moments',
  mediaType: 'image' | 'video' = 'image'
): Promise<string> {
  const target = (url || fallbackUrl).trim();
  if (!target) return fallbackUrl;
  if (target.startsWith('data:') || target.startsWith('blob:') || target.length > 2048) {
    try {
      const isVid =
        mediaType === 'video' ||
        target.startsWith('data:video') ||
        /\.(mp4|mov|webm|mkv|avi|m4v)/i.test(target);
      const fileName = isVid ? 'salma_video.mp4' : 'salma_media.jpg';
      const uploaded = await uploadChildMediaOnline(target, fileName, folderCategory);
      if (uploaded && !uploaded.startsWith('data:') && uploaded.length <= 2048) {
        return uploaded;
      }
    } catch {
      // Fallback aman apabila sedang offline
    }
    return fallbackUrl;
  }
  return target.slice(0, 2048);
}

/**
 * ID Jurnal Bersama Default agar HP Ayah & HP Bunda otomatis terhubung ke dokumen yang sama
 * begitu aplikasi dibuka di perangkat mana pun.
 */
export const SHARED_SALMA_JOURNAL_ID = 'salma_family_journal';
export const JOURNAL_ID_STORAGE_KEY = 'tk_salma_journal_id_v2';

export function getStoredJournalId(_defaultUid?: string): string {
  try {
    const saved = localStorage.getItem(JOURNAL_ID_STORAGE_KEY);
    if (saved && /^[a-zA-Z0-9_-]{1,128}$/.test(saved)) {
      return saved;
    }
  } catch {
    // abaikan pembatasan storage
  }
  return SHARED_SALMA_JOURNAL_ID;
}

export function setStoredJournalId(journalId: string) {
  try {
    localStorage.setItem(JOURNAL_ID_STORAGE_KEY, sanitizeDocId(journalId));
  } catch {
    // abaikan pembatasan storage
  }
}

export async function joinPartnerCloudJournal(targetJournalId: string): Promise<string> {
  const cleanJournalId = sanitizeDocId(targetJournalId.trim() || SHARED_SALMA_JOURNAL_ID);
  setStoredJournalId(cleanJournalId);

  if (auth.currentUser?.uid) {
    try {
      await setDoc(
        doc(db, 'journals', cleanJournalId),
        {
          partnerUid: auth.currentUser.uid,
          updatedByDeviceId: getClientDeviceId(),
          updatedAt: serverTimestamp(),
        },
        { merge: true }
      );
    } catch (err) {
      console.warn('Info sinkronisasi partnerUid:', err);
    }
  }

  return cleanJournalId;
}

export async function syncProfileToFirestore(
  journalId: string,
  profile: ChildProfile,
  options?: { timeoutMs?: number }
): Promise<ChildProfile> {
  const totalTimeoutMs = options?.timeoutMs ?? 25000;
  const startedAt = Date.now();
  const abortController = new AbortController();
  const abortTimer = setTimeout(() => abortController.abort(), totalTimeoutMs);

  const cleanJournalId = sanitizeDocId(journalId || SHARED_SALMA_JOURNAL_ID);
  const journalPath = `journals/${cleanJournalId}`;
  const actorUid = auth.currentUser?.uid || 'keluarga_salma';

  try {
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      throw new Error('Perangkat sedang offline.');
    }

    // 1. Upload foto profil baru & foto tambahan keluarga ke Cloudinary dalam batas waktu
    const rawExtras = (profile.extraFamilyPhotos || []).slice(0, MAX_EXTRA_FAMILY_PHOTOS);
    const uploadBudgetMs = Math.max(500, totalTimeoutMs - (Date.now() - startedAt));
    const [avatarUrl, fatherAvatarUrl, motherAvatarUrl, ...uploadedExtraUrls] =
      await withCloudTimeout(
        Promise.all([
          uploadAvatarToCloudinaryWithTimeout(
            profile.avatarUrl,
            'avatar_salma.jpg',
            uploadBudgetMs,
            abortController.signal
          ),
          uploadAvatarToCloudinaryWithTimeout(
            profile.fatherAvatarUrl,
            'avatar_ayah.jpg',
            uploadBudgetMs,
            abortController.signal
          ),
          uploadAvatarToCloudinaryWithTimeout(
            profile.motherAvatarUrl,
            'avatar_bunda.jpg',
            uploadBudgetMs,
            abortController.signal
          ),
          ...rawExtras.map((extra, idx) =>
            uploadAvatarToCloudinaryWithTimeout(
              extra.url,
              `keluarga_extra_${idx + 1}.jpg`,
              uploadBudgetMs,
              abortController.signal
            )
          ),
        ]),
        uploadBudgetMs,
        'Waktu unggah foto ke Cloudinary melebihi batas waktu.'
      );

    const upgradedExtras: FamilyExtraPhoto[] = rawExtras
      .map((extra, idx) => {
        const resolvedUrl = (uploadedExtraUrls[idx] || extra.url || '').trim();
        const trimmedLabel = (extra.label || '').trim().slice(0, 40);
        return {
          id: sanitizeDocId(extra.id || `extra_${idx + 1}`),
          url: resolvedUrl,
          ...(trimmedLabel ? { label: trimmedLabel } : {}),
        };
      })
      .filter((item) => Boolean(item.url) && !item.url.startsWith('data:') && item.url.length <= 2048);

    const upgradedProfile: ChildProfile = {
      ...profile,
      avatarUrl: avatarUrl || profile.avatarUrl,
      fatherAvatarUrl: fatherAvatarUrl || profile.fatherAvatarUrl,
      motherAvatarUrl: motherAvatarUrl || profile.motherAvatarUrl,
      extraFamilyPhotos: upgradedExtras,
    };

    // 2. Simpan dokumen biodata ke Cloud Firestore dalam sisa batas waktu total
    const elapsedMs = Date.now() - startedAt;
    const remainingFirestoreMs = totalTimeoutMs - elapsedMs;
    if (remainingFirestoreMs <= 150) {
      throw new Error('Waktu sinkronisasi Cloud Firestore melebihi batas waktu.');
    }

    try {
      await withCloudTimeout(
        setDoc(
          doc(db, 'journals', cleanJournalId),
          {
            journalId: cleanJournalId,
            lastAuthorUid: actorUid,
            updatedByDeviceId: getClientDeviceId(),
            name: clampStr(upgradedProfile.name, 120, 'Salma Nur Khalisa'),
            nickname: clampStr(upgradedProfile.nickname, 60, 'Salma'),
            birthDate: /^\d{4}-\d{2}-\d{2}$/.test(upgradedProfile.birthDate)
              ? upgradedProfile.birthDate
              : '2026-03-25',
            gender: upgradedProfile.gender === 'male' ? 'male' : 'female',
            bloodType: clampStr(upgradedProfile.bloodType, 10, ''),
            avatarUrl: clampStr(upgradedProfile.avatarUrl, 2048, ''),
            fatherName: clampStr(upgradedProfile.fatherName, 80, 'Ayah Rahman'),
            fatherInfo: clampStr(upgradedProfile.fatherInfo, 300, ''),
            fatherAvatarUrl: clampStr(upgradedProfile.fatherAvatarUrl, 2048, ''),
            motherName: clampStr(upgradedProfile.motherName, 80, 'Bunda'),
            motherInfo: clampStr(upgradedProfile.motherInfo, 300, ''),
            motherAvatarUrl: clampStr(upgradedProfile.motherAvatarUrl, 2048, ''),
            extraFamilyPhotos: upgradedExtras.map((item) => ({
              id: sanitizeDocId(item.id),
              url: clampStr(item.url, 2048, ''),
              label: clampStr(item.label, 40, ''),
            })),
            birthWeightKg: Math.min(
              20,
              Math.max(0.5, Number(upgradedProfile.birthWeightKg) || 3.3)
            ),
            birthHeightCm: Math.min(
              120,
              Math.max(20, Number(upgradedProfile.birthHeightCm) || 49.5)
            ),
            birthHeadCircumferenceCm: Math.min(
              70,
              Math.max(15, Number(upgradedProfile.birthHeadCircumferenceCm) || 34.5)
            ),
            specialNotes: clampStr(upgradedProfile.specialNotes, 1000, ''),
            updatedAt: serverTimestamp(),
          },
          { merge: true }
        ),
        remainingFirestoreMs,
        'Waktu simpan Cloud Firestore melebihi batas waktu.'
      );
    } catch (firestoreErr) {
      const msg = firestoreErr instanceof Error ? firestoreErr.message : String(firestoreErr);
      if (msg.toLowerCase().includes('permission') || msg.toLowerCase().includes('insufficient')) {
        handleFirestoreError(firestoreErr, OperationType.WRITE, journalPath);
      }
      throw firestoreErr;
    }

    return upgradedProfile;
  } finally {
    clearTimeout(abortTimer);
  }
}

export async function syncMomentToFirestore(
  journalId: string,
  _profile: ChildProfile,
  moment: MomentItem,
  isUpdate = false
): Promise<void> {
  const cleanJournalId = sanitizeDocId(journalId || SHARED_SALMA_JOURNAL_ID);
  const momentId = sanitizeDocId(moment.id);
  const momentPath = `journals/${cleanJournalId}/moments/${momentId}`;
  const actorUid = auth.currentUser?.uid || 'keluarga_salma';

  const rawSlides = getMomentMediaSlides(moment).slice(0, MAX_MOMENT_MEDIA_ITEMS);
  const resolvedSlides: MomentMediaSlide[] = await Promise.all(
    rawSlides.map(async (slide, idx) => {
      const isVid = slide.mediaType === 'video';
      const defaultFallback = isVid
        ? slide.url
        : '/src/assets/images/moment_first_steps_1792502523399.jpg';
      const cleanUrl = await ensureCloudinaryOrShortUrl(
        slide.url,
        defaultFallback,
        'moments',
        slide.mediaType
      );
      return {
        id: sanitizeDocId(slide.id || `${momentId}_slide_${idx}`),
        url: cleanUrl,
        mediaType: slide.mediaType === 'video' ? 'video' : 'image',
      };
    })
  );

  const primarySlide = resolvedSlides[0] || {
    id: `${momentId}_slide_0`,
    url: '/src/assets/images/moment_first_steps_1792502523399.jpg',
    mediaType: moment.mediaType === 'video' ? 'video' : 'image',
  };

  const payload: Record<string, unknown> = {
    journalId: cleanJournalId,
    authorUid: actorUid,
    updatedByDeviceId: getClientDeviceId(),
    title: clampStr(moment.title, 160, 'Momen Salma'),
    date: /^\d{4}-\d{2}-\d{2}$/.test(moment.date)
      ? moment.date
      : new Date().toISOString().slice(0, 10),
    mediaType: primarySlide.mediaType,
    mediaUrl: primarySlide.url,
    mediaItems: resolvedSlides.map((s) => ({
      id: sanitizeDocId(s.id),
      url: clampStr(s.url, 2048, ''),
      mediaType: s.mediaType === 'video' ? 'video' : 'image',
    })),
    category: moment.category,
    notes: clampStr(moment.notes, 2000, '-'),
    weightKg: Math.min(60, Math.max(0, Number(moment.weightKg) || 0)),
    heightCm: Math.min(180, Math.max(0, Number(moment.heightCm) || 0)),
    headCircumferenceCm: Math.min(80, Math.max(0, Number(moment.headCircumferenceCm) || 0)),
    googleDriveSynced: Boolean(moment.googleDriveSynced),
    googleDriveFileId: clampStr(moment.googleDriveFileId, 256, ''),
    googleDriveWebViewLink: clampStr(moment.googleDriveWebViewLink, 2048, ''),
    clientCreatedAt: moment.createdAt || new Date().toISOString(),
    updatedAt: serverTimestamp(),
  };

  if (!isUpdate) {
    payload.createdAt = serverTimestamp();
  }

  try {
    await setDoc(doc(db, 'journals', cleanJournalId, 'moments', momentId), payload, {
      merge: true,
    });
  } catch (err) {
    handleFirestoreError(err, isUpdate ? OperationType.UPDATE : OperationType.CREATE, momentPath);
  }
}

export async function syncGrowthToFirestore(
  journalId: string,
  _profile: ChildProfile,
  record: GrowthRecord
): Promise<void> {
  const cleanJournalId = sanitizeDocId(journalId || SHARED_SALMA_JOURNAL_ID);
  const recordId = sanitizeDocId(record.id);
  const recordPath = `journals/${cleanJournalId}/growth_records/${recordId}`;
  const actorUid = auth.currentUser?.uid || 'keluarga_salma';

  try {
    await setDoc(
      doc(db, 'journals', cleanJournalId, 'growth_records', recordId),
      {
        journalId: cleanJournalId,
        authorUid: actorUid,
        updatedByDeviceId: getClientDeviceId(),
        date: /^\d{4}-\d{2}-\d{2}$/.test(record.date)
          ? record.date
          : new Date().toISOString().slice(0, 10),
        ageMonths: Math.min(240, Math.max(0, Number(record.ageMonths) || 0)),
        weightKg: Math.min(80, Math.max(0.5, Number(record.weightKg) || 3.3)),
        heightCm: Math.min(200, Math.max(20, Number(record.heightCm) || 49.5)),
        headCircumferenceCm: Math.min(80, Math.max(0, Number(record.headCircumferenceCm) || 0)),
        notes: clampStr(record.notes, 500, ''),
        sourceMomentId: clampStr(record.sourceMomentId, 128, ''),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, recordPath);
  }
}

export async function syncMilestoneToFirestore(
  journalId: string,
  _profile: ChildProfile,
  milestone: MilestoneChecklistItem
): Promise<void> {
  const cleanJournalId = sanitizeDocId(journalId || SHARED_SALMA_JOURNAL_ID);
  const milestoneId = sanitizeDocId(milestone.id);
  const milestonePath = `journals/${cleanJournalId}/milestones/${milestoneId}`;
  const actorUid = auth.currentUser?.uid || 'keluarga_salma';

  try {
    await setDoc(
      doc(db, 'journals', cleanJournalId, 'milestones', milestoneId),
      {
        journalId: cleanJournalId,
        authorUid: actorUid,
        updatedByDeviceId: getClientDeviceId(),
        domain: milestone.domain,
        ageRangeLabel: clampStr(milestone.ageRangeLabel, 40, '0 - 6 Bulan'),
        minAgeMonths: Math.min(120, Math.max(0, Number(milestone.minAgeMonths) || 0)),
        maxAgeMonths: Math.min(120, Math.max(0, Number(milestone.maxAgeMonths) || 6)),
        title: clampStr(milestone.title, 180, 'Milestone'),
        description: clampStr(milestone.description, 600, '-'),
        notes: clampStr(milestone.notes, 500, ''),
        completed: Boolean(milestone.completed),
        completedDate: clampStr(milestone.completedDate, 10, ''),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, milestonePath);
  }
}

export async function syncParentingQuoteToFirestore(
  journalId: string,
  _profile: ChildProfile,
  quote: ParentingQuoteItem
): Promise<void> {
  const cleanJournalId = sanitizeDocId(journalId || SHARED_SALMA_JOURNAL_ID);
  const quoteId = sanitizeDocId(quote.id);
  const quotePath = `journals/${cleanJournalId}/parenting_quotes/${quoteId}`;
  const actorUid = auth.currentUser?.uid || 'keluarga_salma';

  try {
    await setDoc(
      doc(db, 'journals', cleanJournalId, 'parenting_quotes', quoteId),
      {
        journalId: cleanJournalId,
        authorUid: actorUid,
        updatedByDeviceId: getClientDeviceId(),
        orderIndex: Math.min(50, Math.max(0, Number(quote.orderIndex) || 0)),
        text: clampStr(quote.text, 600, 'Anak adalah amanah terindah.'),
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (err) {
    handleFirestoreError(err, OperationType.WRITE, quotePath);
  }
}

/**
 * Mengisi data awal Salma ke Firestore `salma-anak-kami` HANYA apabila database masih kosong
 * (tidak akan pernah menimpa data yang sudah diunggah oleh HP Ayah atau HP Bunda).
 */
async function seedInitialSalmaFirestoreIfEmpty(
  cleanJournalId: string,
  seedData: {
    profile: ChildProfile;
    moments: MomentItem[];
    records: GrowthRecord[];
    milestones: MilestoneChecklistItem[];
    quotes: ParentingQuoteItem[];
  }
): Promise<void> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return;
  }

  try {
    const journalRef = doc(db, 'journals', cleanJournalId);
    const journalSnap = await getDoc(journalRef);

    if (!journalSnap.exists()) {
      await syncProfileToFirestore(cleanJournalId, seedData.profile);
    }

    const [momentsSnap, recordsSnap, milestonesSnap, quotesSnap] = await Promise.all([
      getDocs(collection(db, 'journals', cleanJournalId, 'moments')),
      getDocs(collection(db, 'journals', cleanJournalId, 'growth_records')),
      getDocs(collection(db, 'journals', cleanJournalId, 'milestones')),
      getDocs(collection(db, 'journals', cleanJournalId, 'parenting_quotes')),
    ]);

    if (momentsSnap.empty && seedData.moments.length > 0) {
      await Promise.all(
        seedData.moments.map((m) => syncMomentToFirestore(cleanJournalId, seedData.profile, m, false))
      );
    }

    if (recordsSnap.empty && seedData.records.length > 0) {
      await Promise.all(
        seedData.records.map((r) => syncGrowthToFirestore(cleanJournalId, seedData.profile, r))
      );
    }

    if (milestonesSnap.empty && seedData.milestones.length > 0) {
      await Promise.all(
        seedData.milestones.map((ms) =>
          syncMilestoneToFirestore(cleanJournalId, seedData.profile, ms)
        )
      );
    }

    if (quotesSnap.empty && seedData.quotes.length > 0) {
      await Promise.all(
        seedData.quotes.map((q) => syncParentingQuoteToFirestore(cleanJournalId, seedData.profile, q))
      );
    }
  } catch (err) {
    console.warn('Inisialisasi awal Cloud Firestore dilewati atau menunggu izin:', err);
  }
}

export interface AuthoritativeCloudData {
  profile?: ChildProfile;
  moments: MomentItem[];
  records: GrowthRecord[];
  milestones: MilestoneChecklistItem[];
  quotes: ParentingQuoteItem[];
}

/**
 * Memuat seluruh data utama langsung dari Cloud Firestore ("salma-anak-kami") saat aplikasi
 * dibuka pertama kali agar foto dan biodata yang tersimpan di cloud langsung muncul tanpa delay.
 */
export async function loadAuthoritativeCloudState(
  journalId: string
): Promise<AuthoritativeCloudData | null> {
  const cleanJournalId = sanitizeDocId(journalId || SHARED_SALMA_JOURNAL_ID);
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const journalRef = doc(db, 'journals', cleanJournalId);
    const journalSnap = await getDoc(journalRef);

    let parsedProfile: ChildProfile | undefined;
    if (journalSnap.exists()) {
      const d = journalSnap.data();
      const parsedExtraPhotos: FamilyExtraPhoto[] | undefined = Array.isArray(d.extraFamilyPhotos)
        ? d.extraFamilyPhotos
            .slice(0, MAX_EXTRA_FAMILY_PHOTOS)
            .map((raw: any, idx: number) => ({
              id: String(raw?.id || `extra_${idx + 1}`),
              url: String(raw?.url || ''),
              ...(raw?.label ? { label: String(raw.label) } : {}),
            }))
            .filter((item: FamilyExtraPhoto) => Boolean(item.url))
        : undefined;

      parsedProfile = {
        id: 'salma_profile',
        name: String(d.name || 'Salma Nur Khalisa'),
        nickname: String(d.nickname || 'Salma'),
        birthDate: String(d.birthDate || '2026-03-25'),
        gender: d.gender === 'male' ? 'male' : 'female',
        bloodType: d.bloodType ? String(d.bloodType) : 'O+',
        avatarUrl: String(d.avatarUrl || '/src/assets/images/moment_eating_puree_1792555107552.jpg'),
        fatherName: String(d.fatherName || 'Ayah Rahman'),
        fatherInfo: d.fatherInfo ? String(d.fatherInfo) : undefined,
        fatherAvatarUrl: d.fatherAvatarUrl
          ? String(d.fatherAvatarUrl)
          : '/src/assets/images/moment_father_play_1792555577232.jpg',
        motherName: d.motherName ? String(d.motherName) : 'Bunda',
        motherInfo: d.motherInfo ? String(d.motherInfo) : undefined,
        motherAvatarUrl: d.motherAvatarUrl
          ? String(d.motherAvatarUrl)
          : '/src/assets/images/moment_eating_puree_1792555107552.jpg',
        extraFamilyPhotos: parsedExtraPhotos,
        birthWeightKg: Number(d.birthWeightKg) || 3.3,
        birthHeightCm: Number(d.birthHeightCm) || 49.5,
        birthHeadCircumferenceCm: Number(d.birthHeadCircumferenceCm) || 34.5,
        specialNotes: d.specialNotes ? String(d.specialNotes) : undefined,
      };
    }

    const [momentsSnap, recordsSnap, milestonesSnap, quotesSnap] = await Promise.all([
      getDocs(collection(db, 'journals', cleanJournalId, 'moments')),
      getDocs(collection(db, 'journals', cleanJournalId, 'growth_records')),
      getDocs(collection(db, 'journals', cleanJournalId, 'milestones')),
      getDocs(collection(db, 'journals', cleanJournalId, 'parenting_quotes')),
    ]);

    const parsedMoments: MomentItem[] = momentsSnap.docs.map((docSnap) => {
      const d = docSnap.data();
      const resolvedCreated =
        typeof d.clientCreatedAt === 'string' && d.clientCreatedAt
          ? d.clientCreatedAt
          : typeof d.createdAt?.toDate === 'function'
          ? d.createdAt.toDate().toISOString()
          : new Date().toISOString();

      const parsedMediaItems: MomentMediaSlide[] | undefined = Array.isArray(d.mediaItems)
        ? d.mediaItems
            .slice(0, MAX_MOMENT_MEDIA_ITEMS)
            .map((raw: any, idx: number) => ({
              id: String(raw?.id || `${docSnap.id}_slide_${idx}`),
              url: String(raw?.url || ''),
              mediaType: raw?.mediaType === 'video' ? ('video' as const) : ('image' as const),
            }))
            .filter((s: MomentMediaSlide) => Boolean(s.url))
        : undefined;

      return {
        id: docSnap.id,
        title: String(d.title || ''),
        date: String(d.date || ''),
        mediaType: d.mediaType === 'video' ? 'video' : 'image',
        mediaUrl: String(d.mediaUrl || ''),
        mediaItems: parsedMediaItems && parsedMediaItems.length > 0 ? parsedMediaItems : undefined,
        category: d.category,
        notes: String(d.notes || ''),
        weightKg: Number(d.weightKg) > 0 ? Number(d.weightKg) : undefined,
        heightCm: Number(d.heightCm) > 0 ? Number(d.heightCm) : undefined,
        headCircumferenceCm:
          Number(d.headCircumferenceCm) > 0 ? Number(d.headCircumferenceCm) : undefined,
        googleDriveSynced: Boolean(d.googleDriveSynced),
        googleDriveFileId: d.googleDriveFileId ? String(d.googleDriveFileId) : undefined,
        googleDriveWebViewLink: d.googleDriveWebViewLink
          ? String(d.googleDriveWebViewLink)
          : undefined,
        createdAt: resolvedCreated,
      };
    });
    parsedMoments.sort((a, b) => b.createdAt.localeCompare(a.createdAt));

    const parsedRecords: GrowthRecord[] = recordsSnap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        date: String(d.date || ''),
        ageMonths: Number(d.ageMonths) || 0,
        weightKg: Number(d.weightKg) || 0,
        heightCm: Number(d.heightCm) || 0,
        headCircumferenceCm:
          Number(d.headCircumferenceCm) > 0 ? Number(d.headCircumferenceCm) : undefined,
        notes: d.notes ? String(d.notes) : undefined,
        sourceMomentId: d.sourceMomentId ? String(d.sourceMomentId) : undefined,
      };
    });
    parsedRecords.sort((a, b) => a.date.localeCompare(b.date));

    const parsedMilestones: MilestoneChecklistItem[] = milestonesSnap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        domain: d.domain,
        ageRangeLabel: String(d.ageRangeLabel || ''),
        minAgeMonths: Number(d.minAgeMonths) || 0,
        maxAgeMonths: Number(d.maxAgeMonths) || 6,
        title: String(d.title || ''),
        description: String(d.description || ''),
        notes: d.notes ? String(d.notes) : undefined,
        completed: Boolean(d.completed),
        completedDate: d.completedDate ? String(d.completedDate) : undefined,
      };
    });
    parsedMilestones.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));

    const parsedQuotes: ParentingQuoteItem[] = quotesSnap.docs.map((docSnap) => {
      const d = docSnap.data();
      return {
        id: docSnap.id,
        orderIndex: Number(d.orderIndex) || 0,
        text: String(d.text || ''),
        updatedAt:
          typeof d.updatedAt?.toDate === 'function'
            ? d.updatedAt.toDate().toISOString()
            : undefined,
      };
    });
    parsedQuotes.sort((a, b) => a.orderIndex - b.orderIndex);

    return {
      profile: parsedProfile,
      moments: parsedMoments,
      records: parsedRecords,
      milestones: parsedMilestones,
      quotes: parsedQuotes,
    };
  } catch (err) {
    console.warn('Pemuatan data utama dari Firestore dilewati / offline:', err);
    return null;
  }
}

/**
 * Berlangganan secara real-time ke seluruh koleksi Cloud Firestore `salma-anak-kami`
 * sehingga HP Ayah & HP Bunda selalu ter-update otomatis detik itu juga.
 */
export function subscribeFamilyCloudJournal(
  journalId: string,
  seedState: {
    profile: ChildProfile;
    moments: MomentItem[];
    records: GrowthRecord[];
    milestones: MilestoneChecklistItem[];
    quotes: ParentingQuoteItem[];
  },
  callbacks: {
    onProfile: (p: ChildProfile, isFromPartnerDevice: boolean, hasPendingWrites: boolean) => void;
    onMoments: (m: MomentItem[], isFromPartnerDevice: boolean) => void;
    onRecords: (r: GrowthRecord[], isFromPartnerDevice: boolean) => void;
    onMilestones: (ms: MilestoneChecklistItem[], isFromPartnerDevice: boolean) => void;
    onQuotes: (q: ParentingQuoteItem[], isFromPartnerDevice: boolean) => void;
    onStatusChange?: (connected: boolean) => void;
  }
): Unsubscribe {
  const cleanJournalId = sanitizeDocId(journalId || SHARED_SALMA_JOURNAL_ID);
  const myDeviceId = getClientDeviceId();
  let initialProfileLoaded = false;
  let initialMomentsLoaded = false;
  let initialRecordsLoaded = false;

  void seedInitialSalmaFirestoreIfEmpty(cleanJournalId, seedState);

  // 1. Real-time Biodata Salma / Ayah / Bunda
  const unsubJournal = onSnapshot(
    doc(db, 'journals', cleanJournalId),
    (snap) => {
      callbacks.onStatusChange?.(true);
      if (!snap.exists()) return;
      const d = snap.data();
      const isRemoteUpdate =
        initialProfileLoaded &&
        !snap.metadata.hasPendingWrites &&
        Boolean(d.updatedByDeviceId) &&
        d.updatedByDeviceId !== myDeviceId;
      initialProfileLoaded = true;

      const parsedExtraPhotos: FamilyExtraPhoto[] | undefined = Array.isArray(d.extraFamilyPhotos)
        ? d.extraFamilyPhotos
            .slice(0, MAX_EXTRA_FAMILY_PHOTOS)
            .map((raw: any, idx: number) => ({
              id: String(raw?.id || `extra_${idx + 1}`),
              url: String(raw?.url || ''),
              ...(raw?.label ? { label: String(raw.label) } : {}),
            }))
            .filter((item: FamilyExtraPhoto) => Boolean(item.url))
        : seedState.profile.extraFamilyPhotos;

      callbacks.onProfile(
        {
          id: seedState.profile.id,
          name: String(d.name || seedState.profile.name),
          nickname: String(d.nickname || seedState.profile.nickname),
          birthDate: String(d.birthDate || seedState.profile.birthDate),
          gender: d.gender === 'male' ? 'male' : 'female',
          bloodType: d.bloodType ? String(d.bloodType) : undefined,
          avatarUrl: String(d.avatarUrl || seedState.profile.avatarUrl),
          fatherName: String(d.fatherName || seedState.profile.fatherName),
          fatherInfo: d.fatherInfo ? String(d.fatherInfo) : undefined,
          fatherAvatarUrl: d.fatherAvatarUrl
            ? String(d.fatherAvatarUrl)
            : seedState.profile.fatherAvatarUrl,
          motherName: d.motherName ? String(d.motherName) : undefined,
          motherInfo: d.motherInfo ? String(d.motherInfo) : undefined,
          motherAvatarUrl: d.motherAvatarUrl
            ? String(d.motherAvatarUrl)
            : seedState.profile.motherAvatarUrl,
          extraFamilyPhotos: parsedExtraPhotos,
          birthWeightKg: Number(d.birthWeightKg) || seedState.profile.birthWeightKg,
          birthHeightCm: Number(d.birthHeightCm) || seedState.profile.birthHeightCm,
          birthHeadCircumferenceCm:
            Number(d.birthHeadCircumferenceCm) || seedState.profile.birthHeadCircumferenceCm,
          specialNotes: d.specialNotes ? String(d.specialNotes) : undefined,
        },
        isRemoteUpdate,
        snap.metadata.hasPendingWrites
      );
    },
    (error) => {
      callbacks.onStatusChange?.(false);
      console.warn('Firestore journal listener warning:', error.message);
    }
  );

  // 2. Real-time Momen, Foto & Video Cloudinary + Catatan Harian
  const unsubMoments = onSnapshot(
    collection(db, 'journals', cleanJournalId, 'moments'),
    (snap) => {
      callbacks.onStatusChange?.(true);
      if (snap.empty) return;
      const hasPartnerChange =
        initialMomentsLoaded &&
        !snap.metadata.hasPendingWrites &&
        snap
          .docChanges()
          .some((ch) => {
            const devId = ch.doc.data().updatedByDeviceId;
            return Boolean(devId) && devId !== myDeviceId;
          });
      initialMomentsLoaded = true;

      const items: MomentItem[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        const resolvedCreated =
          typeof d.clientCreatedAt === 'string' && d.clientCreatedAt
            ? d.clientCreatedAt
            : typeof d.createdAt?.toDate === 'function'
            ? d.createdAt.toDate().toISOString()
            : new Date().toISOString();

        const parsedMediaItems: MomentMediaSlide[] | undefined = Array.isArray(d.mediaItems)
          ? d.mediaItems
              .slice(0, MAX_MOMENT_MEDIA_ITEMS)
              .map((raw: any, idx: number) => ({
                id: String(raw?.id || `${docSnap.id}_slide_${idx}`),
                url: String(raw?.url || ''),
                mediaType: raw?.mediaType === 'video' ? ('video' as const) : ('image' as const),
              }))
              .filter((s: MomentMediaSlide) => Boolean(s.url))
          : undefined;

        return {
          id: docSnap.id,
          title: String(d.title || ''),
          date: String(d.date || ''),
          mediaType: d.mediaType === 'video' ? 'video' : 'image',
          mediaUrl: String(d.mediaUrl || ''),
          mediaItems: parsedMediaItems && parsedMediaItems.length > 0 ? parsedMediaItems : undefined,
          category: d.category,
          notes: String(d.notes || ''),
          weightKg: Number(d.weightKg) > 0 ? Number(d.weightKg) : undefined,
          heightCm: Number(d.heightCm) > 0 ? Number(d.heightCm) : undefined,
          headCircumferenceCm:
            Number(d.headCircumferenceCm) > 0 ? Number(d.headCircumferenceCm) : undefined,
          googleDriveSynced: Boolean(d.googleDriveSynced),
          googleDriveFileId: d.googleDriveFileId ? String(d.googleDriveFileId) : undefined,
          googleDriveWebViewLink: d.googleDriveWebViewLink
            ? String(d.googleDriveWebViewLink)
            : undefined,
          createdAt: resolvedCreated,
        };
      });

      items.sort((a, b) => b.createdAt.localeCompare(a.createdAt));
      callbacks.onMoments(items, hasPartnerChange);
    },
    (error) => {
      console.warn('Firestore moments listener warning:', error.message);
    }
  );

  // 3. Real-time Riwayat Tinggi & Berat Badan (Kurva WHO)
  const unsubRecords = onSnapshot(
    collection(db, 'journals', cleanJournalId, 'growth_records'),
    (snap) => {
      if (snap.empty) return;
      const hasPartnerChange =
        initialRecordsLoaded &&
        !snap.metadata.hasPendingWrites &&
        snap
          .docChanges()
          .some((ch) => {
            const devId = ch.doc.data().updatedByDeviceId;
            return Boolean(devId) && devId !== myDeviceId;
          });
      initialRecordsLoaded = true;

      const items: GrowthRecord[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          date: String(d.date || ''),
          ageMonths: Number(d.ageMonths) || 0,
          weightKg: Number(d.weightKg) || 0,
          heightCm: Number(d.heightCm) || 0,
          headCircumferenceCm:
            Number(d.headCircumferenceCm) > 0 ? Number(d.headCircumferenceCm) : undefined,
          notes: d.notes ? String(d.notes) : undefined,
          sourceMomentId: d.sourceMomentId ? String(d.sourceMomentId) : undefined,
        };
      });

      items.sort((a, b) => a.date.localeCompare(b.date));
      callbacks.onRecords(items, hasPartnerChange);
    },
    (error) => {
      console.warn('Firestore growth_records listener warning:', error.message);
    }
  );

  // 4. Real-time Buku Tahapan Milestone
  const unsubMilestones = onSnapshot(
    collection(db, 'journals', cleanJournalId, 'milestones'),
    (snap) => {
      if (snap.empty) return;
      const items: MilestoneChecklistItem[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          domain: d.domain,
          ageRangeLabel: String(d.ageRangeLabel || ''),
          minAgeMonths: Number(d.minAgeMonths) || 0,
          maxAgeMonths: Number(d.maxAgeMonths) || 6,
          title: String(d.title || ''),
          description: String(d.description || ''),
          notes: d.notes ? String(d.notes) : undefined,
          completed: Boolean(d.completed),
          completedDate: d.completedDate ? String(d.completedDate) : undefined,
        };
      });
      items.sort((a, b) => a.id.localeCompare(b.id, undefined, { numeric: true }));
      callbacks.onMilestones(items, false);
    },
    (error) => {
      console.warn('Firestore milestones listener warning:', error.message);
    }
  );

  // 5. Real-time Mutiara Parenting
  const unsubQuotes = onSnapshot(
    collection(db, 'journals', cleanJournalId, 'parenting_quotes'),
    (snap) => {
      if (snap.empty) return;
      const items: ParentingQuoteItem[] = snap.docs.map((docSnap) => {
        const d = docSnap.data();
        return {
          id: docSnap.id,
          orderIndex: Number(d.orderIndex) || 0,
          text: String(d.text || ''),
          updatedAt:
            typeof d.updatedAt?.toDate === 'function'
              ? d.updatedAt.toDate().toISOString()
              : undefined,
        };
      });
      items.sort((a, b) => a.orderIndex - b.orderIndex);
      callbacks.onQuotes(items, false);
    },
    (error) => {
      console.warn('Firestore parenting_quotes listener warning:', error.message);
    }
  );

  return () => {
    unsubJournal();
    unsubMoments();
    unsubRecords();
    unsubMilestones();
    unsubQuotes();
  };
}
