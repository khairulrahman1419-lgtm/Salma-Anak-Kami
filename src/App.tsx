/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Tracker Tumbuh Kembang Salma - Jurnal Ayah & Bunda
 * Sinkronisasi Real-Time Cloud Firestore ("salma-anak-kami") + Penyimpanan Media Cloudinary ("la3st6qh")
 * dengan Offline Fallback Otomatis (IndexedDB + localStorage).
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  TrendingUp,
  Cloud,
  CheckCircle2,
  Download,
  Home,
  Award,
  Layers,
  Edit2,
  Plus,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type {
  ChildProfile,
  GrowthRecord,
  MilestoneChecklistItem,
  MomentItem,
  MomentMediaSlide,
  ParentingQuoteItem,
} from './types/index.ts';
import {
  INITIAL_CHILD_PROFILE,
  INITIAL_MOMENTS,
  INITIAL_GROWTH_RECORDS,
  INITIAL_MILESTONES,
  INITIAL_PARENTING_QUOTES,
} from './utils/initialFallback.ts';
import { getLatestMeasurements, calculateAge } from './utils/growth.ts';
import { exportAppBackup } from './utils/googleDriveService.ts';
import { downloadMediaFile } from './utils/downloadMedia.ts';

import { initAuth, googleSignIn, logoutGoogle } from './services/googleAuth.ts';
import { fetchDriveQuota } from './services/googleDriveClient.ts';
import { uploadChildMediaOnline } from './services/mediaFirebaseStorage.ts';
import {
  OFFLINE_STORAGE_KEYS,
  persistLocalState,
  persistLocalStateAsync,
  loadInitialLocalProfile,
  loadInitialLocalMoments,
  loadInitialLocalRecords,
  loadInitialLocalMilestones,
  loadInitialLocalQuotes,
  hydrateStateFromIndexedDb,
  enqueueOfflineMutation,
  loadOfflineMutations,
  removeOfflineMutation,
} from './services/offlineStorage.ts';
import {
  SHARED_SALMA_JOURNAL_ID,
  testFirestoreConnection,
  getStoredJournalId,
  joinPartnerCloudJournal,
  subscribeFamilyCloudJournal,
  loadAuthoritativeCloudState,
  syncProfileToFirestore,
  syncMomentToFirestore,
  syncGrowthToFirestore,
  syncMilestoneToFirestore,
  syncParentingQuoteToFirestore,
} from './services/firestoreSync.ts';
import {
  connectRealtimeFamilySync,
  pushFamilyMutation,
} from './services/realtimeFamilySync.ts';

import { Header } from './components/Header.tsx';
import { ParentingQuoteBar } from './components/ParentingQuoteBar.tsx';
import { ChildHeroProfile } from './components/ChildHeroProfile.tsx';
import { Clothespin } from './components/Clothespin.tsx';
import { StorageModal } from './components/StorageModal.tsx';
import { ContextMenuPopup } from './components/ContextMenuPopup.tsx';
import { CollageGallery } from './components/CollageGallery.tsx';
import { MomentMediaCarousel } from './components/MomentMediaCarousel.tsx';
import { GrowthCharts } from './components/GrowthCharts.tsx';
import { MilestoneTracker } from './components/MilestoneTracker.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { MomentLightbox } from './components/MomentLightbox.tsx';
import { EditProfileModal } from './components/EditProfileModal.tsx';
import { QuickGrowthModal } from './components/QuickGrowthModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';
import { FloatingDoctorFAQ } from './components/FloatingDoctorFAQ.tsx';

export default function App() {
  // State Utama dengan Offline Fallback (localStorage + IndexedDB) & Real-Time Firestore Sync
  const [profile, setProfile] = useState<ChildProfile>(() =>
    loadInitialLocalProfile(INITIAL_CHILD_PROFILE)
  );
  const [moments, setMoments] = useState<MomentItem[]>(() =>
    loadInitialLocalMoments(INITIAL_MOMENTS)
  );
  const [records, setRecords] = useState<GrowthRecord[]>(() =>
    loadInitialLocalRecords(INITIAL_GROWTH_RECORDS)
  );
  const [milestones, setMilestones] = useState<MilestoneChecklistItem[]>(() =>
    loadInitialLocalMilestones(INITIAL_MILESTONES)
  );
  const [parentingQuotes, setParentingQuotes] = useState<ParentingQuoteItem[]>(() =>
    loadInitialLocalQuotes(INITIAL_PARENTING_QUOTES)
  );
  const [pendingOfflineCount, setPendingOfflineCount] = useState<number>(0);
  const [isProfilePendingSync, setIsProfilePendingSync] = useState<boolean>(false);
  const [isFlushingOffline, setIsFlushingOffline] = useState<boolean>(false);

  // Storage Destination & Firebase Auth States
  const [storageDestination, setStorageDestination] = useState<'google_drive' | 'vps_local'>(
    'google_drive'
  );
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [activeJournalId, setActiveJournalId] = useState<string>(() => getStoredJournalId());
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [driveQuota, setDriveQuota] = useState<{ usageGb: string; limitGb: string } | null>(null);

  // Modals & Editing States
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [editingMoment, setEditingMoment] = useState<MomentItem | null>(null);
  const [isQuickGrowthOpen, setIsQuickGrowthOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'media' | 'milestone'>('media');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<MomentItem | null>(null);
  const [selectedMomentSlideIndex, setSelectedMomentSlideIndex] = useState<number>(0);
  const [overviewActiveSlides, setOverviewActiveSlides] = useState<
    Record<string, MomentMediaSlide>
  >({});

  // Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'gallery' | 'charts' | 'milestones'>(
    'overview'
  );

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Refs untuk akses snapshot terkini di dalam listener asinkron
  const stateRef = useRef({
    profile,
    moments,
    records,
    milestones,
    quotes: parentingQuotes,
    activeJournalId,
  });
  stateRef.current = {
    profile,
    moments,
    records,
    milestones,
    quotes: parentingQuotes,
    activeJournalId,
  };

  const cloudUnsubRef = useRef<(() => void) | null>(null);
  const isFlushingQueueRef = useRef(false);
  const hasPendingProfileSyncRef = useRef(false);

  const showToast = useCallback((msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4500);
  }, []);

  const refreshPendingOfflineCount = useCallback(async () => {
    const queued = await loadOfflineMutations();
    setPendingOfflineCount(queued.length);
    const hasPendingProfile = queued.some((item) => item.kind === 'profile:update');
    hasPendingProfileSyncRef.current = hasPendingProfile;
    setIsProfilePendingSync(hasPendingProfile);
  }, []);

  // 1. Validasi Koneksi Firestore ("salma-anak-kami") & Pemuatan Seluruh Data Utama Langsung dari Firestore
  useEffect(() => {
    void testFirestoreConnection();

    void (async () => {
      const queued = await loadOfflineMutations();
      const hasPendingProfile = queued.some((item) => item.kind === 'profile:update');
      hasPendingProfileSyncRef.current = hasPendingProfile;
      setIsProfilePendingSync(hasPendingProfile);
      setPendingOfflineCount(queued.length);

      // Muat cache IndexedDB terlebih dahulu agar tampilan instan
      const idbSnapshot = await hydrateStateFromIndexedDb();
      if (idbSnapshot.profile) {
        setProfile(idbSnapshot.profile);
      }
      if (idbSnapshot.moments?.length) setMoments(idbSnapshot.moments);
      if (idbSnapshot.records?.length) setRecords(idbSnapshot.records);
      if (idbSnapshot.milestones?.length) setMilestones(idbSnapshot.milestones);
      if (idbSnapshot.parentingQuotes?.length) setParentingQuotes(idbSnapshot.parentingQuotes);

      // Muat seluruh data utama langsung dari Firestore agar foto & biodata tersimpan langsung muncul kembali
      if (typeof navigator === 'undefined' || navigator.onLine) {
        try {
          const cloudData = await loadAuthoritativeCloudState(activeJournalId);
          if (cloudData) {
            if (cloudData.profile) {
              setProfile(cloudData.profile);
              persistLocalState(OFFLINE_STORAGE_KEYS.PROFILE, cloudData.profile);
              if (!hasPendingProfile) {
                hasPendingProfileSyncRef.current = false;
                setIsProfilePendingSync(false);
              }
            }
            if (cloudData.moments.length > 0) {
              setMoments(cloudData.moments);
              persistLocalState(OFFLINE_STORAGE_KEYS.MOMENTS, cloudData.moments);
            }
            if (cloudData.records.length > 0) {
              setRecords(cloudData.records);
              persistLocalState(OFFLINE_STORAGE_KEYS.GROWTH_RECORDS, cloudData.records);
            }
            if (cloudData.milestones.length > 0) {
              setMilestones(cloudData.milestones);
              persistLocalState(OFFLINE_STORAGE_KEYS.MILESTONES, cloudData.milestones);
            }
            if (cloudData.quotes.length > 0) {
              setParentingQuotes(cloudData.quotes);
              persistLocalState(OFFLINE_STORAGE_KEYS.PARENTING_QUOTES, cloudData.quotes);
            }
          }
        } catch (cloudErr) {
          console.warn('Pemuatan cloud state saat boot dilewati:', cloudErr);
        }
      }
    })();
  }, [activeJournalId]);

  // 2. Pengosongan Antrean Lokal Otomatis ke Cloudinary & Firestore saat Koneksi Merespons
  const flushPendingOfflineQueue = useCallback(async () => {
    if (isFlushingQueueRef.current) return;
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;

    const queued = await loadOfflineMutations();
    if (queued.length === 0) {
      setPendingOfflineCount(0);
      hasPendingProfileSyncRef.current = false;
      setIsProfilePendingSync(false);
      return;
    }

    isFlushingQueueRef.current = true;
    setIsFlushingOffline(true);
    try {
      const journalId = stateRef.current.activeJournalId || SHARED_SALMA_JOURNAL_ID;

      for (const item of queued) {
        try {
          if (item.kind === 'profile:update') {
            const p = item.payload as ChildProfile;
            const upgradedProfile = await syncProfileToFirestore(journalId, p, {
              timeoutMs: 10_000,
            });
            setProfile(upgradedProfile);
            await persistLocalStateAsync(OFFLINE_STORAGE_KEYS.PROFILE, upgradedProfile);
            void pushFamilyMutation('profile:update', upgradedProfile);
          } else if (item.kind === 'moment:create' || item.kind === 'moment:update') {
            const m = item.payload as MomentItem;
            const ext = m.mediaType === 'video' ? 'mp4' : 'jpg';
            const mediaUrl = m.mediaUrl?.startsWith('data:')
              ? await uploadChildMediaOnline(m.mediaUrl, `momen_${m.id}.${ext}`, 'moments')
              : m.mediaUrl;
            const upgradedMoment: MomentItem = {
              ...m,
              mediaUrl,
              pendingStorageUpload: false,
            };
            setMoments((prev) =>
              prev.map((existing) => (existing.id === upgradedMoment.id ? upgradedMoment : existing))
            );
            await pushFamilyMutation(item.kind, upgradedMoment);
            await syncMomentToFirestore(
              journalId,
              stateRef.current.profile,
              upgradedMoment,
              item.kind === 'moment:update'
            );
          } else if (item.kind === 'growth:create') {
            const r = item.payload as GrowthRecord;
            await pushFamilyMutation('growth:create', r);
            await syncGrowthToFirestore(journalId, stateRef.current.profile, r);
          } else if (item.kind === 'milestone:toggle') {
            const ms = item.payload as MilestoneChecklistItem;
            await pushFamilyMutation('milestone:toggle', ms);
            await syncMilestoneToFirestore(journalId, stateRef.current.profile, ms);
          } else if (item.kind === 'quote:update') {
            const q = item.payload as ParentingQuoteItem;
            await pushFamilyMutation('quote:update', q);
            await syncParentingQuoteToFirestore(journalId, stateRef.current.profile, q);
          }

          await removeOfflineMutation(item.id);
        } catch (flushErr) {
          console.warn('Menunda sinkronisasi item lokal ke siklus berikutnya:', flushErr);
        }
      }
    } finally {
      isFlushingQueueRef.current = false;
      setIsFlushingOffline(false);
      const remaining = await loadOfflineMutations();
      const stillPendingProfile = remaining.some((item) => item.kind === 'profile:update');
      hasPendingProfileSyncRef.current = stillPendingProfile;
      setIsProfilePendingSync(stillPendingProfile);
      setPendingOfflineCount(remaining.length);
      if (remaining.length === 0) {
        showToast('Sinkronisasi berhasil! Data lokal telah tersimpan di Cloudinary & Firestore.');
      }
    }
  }, [showToast]);

  useEffect(() => {
    const onReconnectOrVisible = () => {
      if (typeof document === 'undefined' || document.visibilityState === 'visible') {
        void flushPendingOfflineQueue();
      }
    };
    window.addEventListener('online', onReconnectOrVisible);
    document.addEventListener('visibilitychange', onReconnectOrVisible);
    return () => {
      window.removeEventListener('online', onReconnectOrVisible);
      document.removeEventListener('visibilitychange', onReconnectOrVisible);
    };
  }, [flushPendingOfflineQueue]);

  // Retry otomatis berkala saat ada data lokal yang masih menunggu sinkronisasi Cloud
  useEffect(() => {
    if (pendingOfflineCount === 0) return;
    const retryTimer = setInterval(() => {
      if (typeof navigator === 'undefined' || navigator.onLine) {
        void flushPendingOfflineQueue();
      }
    }, 20_000);
    return () => clearInterval(retryTimer);
  }, [pendingOfflineCount, flushPendingOfflineQueue]);

  // 3. Langganan Real-Time Langsung ke Cloud Firestore ("salma-anak-kami") Sejak Aplikasi Dibuka
  //    HP Ayah & HP Bunda otomatis terhubung ke dokumen bersama tanpa perlu pairing manual!
  const attachCloudFirestoreListeners = useCallback(
    (journalId: string) => {
      if (cloudUnsubRef.current) {
        cloudUnsubRef.current();
        cloudUnsubRef.current = null;
      }

      const unsub = subscribeFamilyCloudJournal(
        journalId,
        {
          profile: stateRef.current.profile,
          moments: stateRef.current.moments,
          records: stateRef.current.records,
          milestones: stateRef.current.milestones,
          quotes: stateRef.current.quotes,
        },
        {
          onProfile: (cloudProfile, isFromPartner, hasPendingWrites) => {
            if (!hasPendingWrites) {
              hasPendingProfileSyncRef.current = false;
              setIsProfilePendingSync(false);
              void removeOfflineMutation('profile_latest');
            }
            if (hasPendingProfileSyncRef.current && !isFromPartner && hasPendingWrites) {
              return;
            }
            setProfile((prev) => ({ ...prev, ...cloudProfile }));
            persistLocalState(OFFLINE_STORAGE_KEYS.PROFILE, cloudProfile);
            void pushFamilyMutation('cloud:reconcile', { profile: cloudProfile });
            if (isFromPartner) {
              showToast(`Biodata ${cloudProfile.nickname} otomatis ter-update dari HP pasangan!`);
            }
          },
          onMoments: (cloudMoments, isFromPartner) => {
            if (cloudMoments.length > 0) {
              setMoments(cloudMoments);
              setSelectedMoment((curr) =>
                curr ? cloudMoments.find((m) => m.id === curr.id) || curr : null
              );
              persistLocalState(OFFLINE_STORAGE_KEYS.MOMENTS, cloudMoments);
              void pushFamilyMutation('cloud:reconcile', { moments: cloudMoments });
              if (isFromPartner) {
                showToast('Foto/video atau catatan baru masuk otomatis dari HP pasangan!');
              }
            }
          },
          onRecords: (cloudRecords, isFromPartner) => {
            if (cloudRecords.length > 0) {
              setRecords(cloudRecords);
              persistLocalState(OFFLINE_STORAGE_KEYS.GROWTH_RECORDS, cloudRecords);
              void pushFamilyMutation('cloud:reconcile', { records: cloudRecords });
              if (isFromPartner) {
                showToast('Catatan tinggi/berat badan Salma otomatis ter-update secara real-time!');
              }
            }
          },
          onMilestones: (cloudMilestones) => {
            if (cloudMilestones.length > 0) {
              setMilestones(cloudMilestones);
              persistLocalState(OFFLINE_STORAGE_KEYS.MILESTONES, cloudMilestones);
              void pushFamilyMutation('cloud:reconcile', { milestones: cloudMilestones });
            }
          },
          onQuotes: (cloudQuotes) => {
            if (cloudQuotes.length > 0) {
              setParentingQuotes(cloudQuotes);
              persistLocalState(OFFLINE_STORAGE_KEYS.PARENTING_QUOTES, cloudQuotes);
              void pushFamilyMutation('cloud:reconcile', { parentingQuotes: cloudQuotes });
            }
          },
        }
      );

      cloudUnsubRef.current = unsub;
    },
    [showToast]
  );

  useEffect(() => {
    attachCloudFirestoreListeners(activeJournalId);
    return () => {
      if (cloudUnsubRef.current) {
        cloudUnsubRef.current();
        cloudUnsubRef.current = null;
      }
    };
  }, [activeJournalId, attachCloudFirestoreListeners]);

  // 4. Sinkronisasi Pendamping Real-Time WebSocket Lokal / Server
  useEffect(() => {
    const disconnect = connectRealtimeFamilySync({
      onFullState: (state) => {
        if (state.profile && !hasPendingProfileSyncRef.current) {
          setProfile((prev) => ({ ...prev, ...state.profile }));
          persistLocalState(OFFLINE_STORAGE_KEYS.PROFILE, state.profile);
        }
        if (Array.isArray(state.moments) && state.moments.length > 0) {
          setMoments(state.moments);
          persistLocalState(OFFLINE_STORAGE_KEYS.MOMENTS, state.moments);
        }
        if (Array.isArray(state.records) && state.records.length > 0) {
          setRecords(state.records);
          persistLocalState(OFFLINE_STORAGE_KEYS.GROWTH_RECORDS, state.records);
        }
        if (Array.isArray(state.milestones) && state.milestones.length > 0) {
          setMilestones(state.milestones);
          persistLocalState(OFFLINE_STORAGE_KEYS.MILESTONES, state.milestones);
        }
        if (Array.isArray(state.parentingQuotes) && state.parentingQuotes.length > 0) {
          setParentingQuotes(state.parentingQuotes);
          persistLocalState(OFFLINE_STORAGE_KEYS.PARENTING_QUOTES, state.parentingQuotes);
        }
      },
      onProfileUpdated: (nextProfile, isFromOtherDevice) => {
        if (hasPendingProfileSyncRef.current && !isFromOtherDevice) {
          return;
        }
        setProfile((prev) => ({ ...prev, ...nextProfile }));
        persistLocalState(OFFLINE_STORAGE_KEYS.PROFILE, nextProfile);
      },
      onMomentCreated: (incomingMoment) => {
        setMoments((prev) => {
          const exists = prev.some((m) => m.id === incomingMoment.id);
          const next = exists
            ? prev.map((m) => (m.id === incomingMoment.id ? incomingMoment : m))
            : [incomingMoment, ...prev];
          persistLocalState(OFFLINE_STORAGE_KEYS.MOMENTS, next);
          return next;
        });
      },
      onMomentUpdated: (updatedMoment) => {
        setMoments((prev) => {
          const exists = prev.some((m) => m.id === updatedMoment.id);
          const next = exists
            ? prev.map((m) => (m.id === updatedMoment.id ? updatedMoment : m))
            : [updatedMoment, ...prev];
          persistLocalState(OFFLINE_STORAGE_KEYS.MOMENTS, next);
          return next;
        });
        setSelectedMoment((curr) => (curr && curr.id === updatedMoment.id ? updatedMoment : curr));
      },
      onGrowthCreated: (incomingRecord) => {
        setRecords((prev) => {
          const existingIdx = prev.findIndex(
            (r) =>
              r.id === incomingRecord.id ||
              (Boolean(incomingRecord.sourceMomentId) &&
                r.sourceMomentId === incomingRecord.sourceMomentId)
          );
          const next =
            existingIdx >= 0
              ? prev.map((r, i) => (i === existingIdx ? incomingRecord : r))
              : [...prev, incomingRecord];
          persistLocalState(OFFLINE_STORAGE_KEYS.GROWTH_RECORDS, next);
          return next;
        });
      },
      onMilestoneToggled: (incomingMilestone) => {
        setMilestones((prev) => {
          const next = prev.map((m) => (m.id === incomingMilestone.id ? incomingMilestone : m));
          persistLocalState(OFFLINE_STORAGE_KEYS.MILESTONES, next);
          return next;
        });
      },
      onQuoteUpdated: (incomingQuote) => {
        setParentingQuotes((prev) => {
          const exists = prev.some((q) => q.id === incomingQuote.id);
          const next = exists
            ? prev.map((q) => (q.id === incomingQuote.id ? incomingQuote : q))
            : [...prev, incomingQuote];
          persistLocalState(OFFLINE_STORAGE_KEYS.PARENTING_QUOTES, next);
          return next;
        });
      },
    });

    return () => {
      disconnect();
    };
  }, []);

  // 5. Pantau Status Login Google Opsional (untuk Cadangan Google Drive)
  useEffect(() => {
    const unsubscribeAuth = initAuth(
      async (user, token) => {
        setCurrentUser(user);
        if (token) {
          setAccessToken(token);
          const quota = await fetchDriveQuota(token);
          if (quota) setDriveQuota(quota);
        }
        await flushPendingOfflineQueue();
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setDriveQuota(null);
      }
    );

    return () => {
      if (unsubscribeAuth) unsubscribeAuth();
    };
  }, [flushPendingOfflineQueue]);

  // 6. Simpan Setiap Perubahan State ke localStorage & IndexedDB (Offline Fallback Instan)
  useEffect(() => {
    persistLocalState(OFFLINE_STORAGE_KEYS.PROFILE, profile);
  }, [profile]);

  useEffect(() => {
    persistLocalState(OFFLINE_STORAGE_KEYS.MOMENTS, moments);
  }, [moments]);

  useEffect(() => {
    persistLocalState(OFFLINE_STORAGE_KEYS.GROWTH_RECORDS, records);
  }, [records]);

  useEffect(() => {
    persistLocalState(OFFLINE_STORAGE_KEYS.MILESTONES, milestones);
  }, [milestones]);

  useEffect(() => {
    persistLocalState(OFFLINE_STORAGE_KEYS.PARENTING_QUOTES, parentingQuotes);
  }, [parentingQuotes]);

  // Derived calculations
  const latestStats = getLatestMeasurements(profile, moments, records);

  // Handlers for Google Auth & Cloud Family Linking
  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        if (res.accessToken) {
          setAccessToken(res.accessToken);
          const quota = await fetchDriveQuota(res.accessToken);
          if (quota) setDriveQuota(quota);
        }
        showToast(`Akun Google (${res.user.email}) berhasil terhubung!`);
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      showToast(err.message || 'Gagal menghubungkan ke Akun Google');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleDisconnectGoogle = async () => {
    await logoutGoogle();
    setCurrentUser(null);
    setAccessToken(null);
    setDriveQuota(null);
    showToast('Akun Google berhasil diputuskan.');
  };

  const handleJoinFamilyJournal = async (targetJournalCode: string) => {
    try {
      const joinedId = await joinPartnerCloudJournal(targetJournalCode);
      setActiveJournalId(joinedId);
      showToast(`Berhasil terhubung ke Jurnal Cloud Keluarga (${joinedId})!`);
    } catch (err: any) {
      console.error('Gagal menggabungkan Jurnal Cloud:', err);
      showToast('Gagal menautkan ID Jurnal Cloud.');
    }
  };

  // Upload & Edit Handlers
  const handleOpenUpload = (mode: 'media' | 'milestone' = 'media') => {
    setEditingMoment(null);
    setUploadMode(mode);
    setIsUploadOpen(true);
  };

  const handleOpenEditMoment = (moment: MomentItem) => {
    setEditingMoment(moment);
    setUploadMode('media');
    setIsUploadOpen(true);
  };

  const handleDownloadMoment = async (moment: MomentItem, activeSlide?: MomentMediaSlide) => {
    const targetUrl = activeSlide?.url || moment.mediaUrl;
    const targetType = activeSlide?.mediaType || moment.mediaType;
    const ok = await downloadMediaFile(targetUrl, moment.title, targetType);
    if (ok) {
      showToast(`File "${moment.title}" berhasil diunduh!`);
    }
  };

  const handleSaveNewMoment = (newMoment: MomentItem) => {
    setMoments((prevMoments) => {
      const exists = prevMoments.some((m) => m.id === newMoment.id);
      const updatedMoments = exists ? prevMoments : [newMoment, ...prevMoments];
      persistLocalState(OFFLINE_STORAGE_KEYS.MOMENTS, updatedMoments);
      return updatedMoments;
    });

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      void enqueueOfflineMutation('moment:create', newMoment, `moment_create_${newMoment.id}`).then(
        refreshPendingOfflineCount
      );
    } else {
      void pushFamilyMutation('moment:create', newMoment);
      void syncMomentToFirestore(activeJournalId, profile, newMoment, false).catch(() =>
        enqueueOfflineMutation('moment:create', newMoment, `moment_create_${newMoment.id}`).then(
          refreshPendingOfflineCount
        )
      );
    }

    if (newMoment.weightKg || newMoment.heightCm) {
      const birth = new Date(profile.birthDate);
      const mDate = new Date(newMoment.date);
      const monthsDiff = Math.max(
        0,
        (mDate.getFullYear() - birth.getFullYear()) * 12 + (mDate.getMonth() - birth.getMonth())
      );

      const newRecord: GrowthRecord = {
        id: `gr_${Date.now()}`,
        date: newMoment.date,
        ageMonths: monthsDiff,
        weightKg: newMoment.weightKg || latestStats.weightKg,
        heightCm: newMoment.heightCm || latestStats.heightCm,
        headCircumferenceCm: newMoment.headCircumferenceCm,
        notes: newMoment.title,
        sourceMomentId: newMoment.id,
      };
      setRecords((prev) => {
        const updatedRecords = [...prev, newRecord];
        persistLocalState(OFFLINE_STORAGE_KEYS.GROWTH_RECORDS, updatedRecords);
        return updatedRecords;
      });

      if (isOffline) {
        void enqueueOfflineMutation('growth:create', newRecord, `growth_${newRecord.id}`).then(
          refreshPendingOfflineCount
        );
      } else {
        void pushFamilyMutation('growth:create', newRecord);
        void syncGrowthToFirestore(activeJournalId, profile, newRecord).catch(() =>
          enqueueOfflineMutation('growth:create', newRecord, `growth_${newRecord.id}`).then(
            refreshPendingOfflineCount
          )
        );
      }
    }

    showToast(
      isOffline
        ? `Momen "${newMoment.title}" tersimpan offline & akan diunggah ke Cloudinary + Firestore saat online!`
        : `Momen "${newMoment.title}" tersimpan ke Cloudinary & Firestore (sinkron otomatis ke HP Ayah & Bunda)!`
    );
  };

  const handleUpdateMoment = (updatedMoment: MomentItem) => {
    setMoments((prevMoments) => {
      const next = prevMoments.map((m) => (m.id === updatedMoment.id ? updatedMoment : m));
      persistLocalState(OFFLINE_STORAGE_KEYS.MOMENTS, next);
      return next;
    });

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      void enqueueOfflineMutation(
        'moment:update',
        updatedMoment,
        `moment_update_${updatedMoment.id}`
      ).then(refreshPendingOfflineCount);
    } else {
      void pushFamilyMutation('moment:update', updatedMoment);
      void syncMomentToFirestore(activeJournalId, profile, updatedMoment, true).catch(() =>
        enqueueOfflineMutation(
          'moment:update',
          updatedMoment,
          `moment_update_${updatedMoment.id}`
        ).then(refreshPendingOfflineCount)
      );
    }

    if (updatedMoment.weightKg || updatedMoment.heightCm) {
      const birth = new Date(profile.birthDate);
      const mDate = new Date(updatedMoment.date);
      const monthsDiff = Math.max(
        0,
        (mDate.getFullYear() - birth.getFullYear()) * 12 + (mDate.getMonth() - birth.getMonth())
      );

      const existingRecord = records.find((r) => r.sourceMomentId === updatedMoment.id);
      const syncedRecord: GrowthRecord = existingRecord
        ? {
            ...existingRecord,
            date: updatedMoment.date,
            ageMonths: monthsDiff,
            weightKg: updatedMoment.weightKg || existingRecord.weightKg,
            heightCm: updatedMoment.heightCm || existingRecord.heightCm,
            headCircumferenceCm:
              updatedMoment.headCircumferenceCm ?? existingRecord.headCircumferenceCm,
            notes: updatedMoment.title,
          }
        : {
            id: `gr_${Date.now()}`,
            date: updatedMoment.date,
            ageMonths: monthsDiff,
            weightKg: updatedMoment.weightKg || latestStats.weightKg,
            heightCm: updatedMoment.heightCm || latestStats.heightCm,
            headCircumferenceCm: updatedMoment.headCircumferenceCm,
            notes: updatedMoment.title,
            sourceMomentId: updatedMoment.id,
          };

      setRecords((prev) => {
        const idx = prev.findIndex((r) => r.id === syncedRecord.id);
        const updatedRecords =
          idx >= 0 ? prev.map((r, i) => (i === idx ? syncedRecord : r)) : [...prev, syncedRecord];
        persistLocalState(OFFLINE_STORAGE_KEYS.GROWTH_RECORDS, updatedRecords);
        return updatedRecords;
      });

      if (isOffline) {
        void enqueueOfflineMutation('growth:create', syncedRecord, `growth_${syncedRecord.id}`).then(
          refreshPendingOfflineCount
        );
      } else {
        void pushFamilyMutation('growth:create', syncedRecord);
        void syncGrowthToFirestore(activeJournalId, profile, syncedRecord).catch(() =>
          enqueueOfflineMutation('growth:create', syncedRecord, `growth_${syncedRecord.id}`).then(
            refreshPendingOfflineCount
          )
        );
      }
    }

    setEditingMoment(null);
    showToast(
      isOffline
        ? `Perubahan momen "${updatedMoment.title}" tersimpan offline!`
        : `Perubahan momen "${updatedMoment.title}" langsung tersinkronisasi ke HP Ayah & Bunda!`
    );
  };

  const handleToggleMilestone = (milestoneId: string) => {
    let toggledTarget: MilestoneChecklistItem | null = null;
    setMilestones((prev) => {
      const updated = prev.map((m) => {
        if (m.id === milestoneId) {
          const nextState = !m.completed;
          if (nextState) {
            showToast(`Selamat! Milestone "${m.title}" berhasil dicapai.`);
          }
          toggledTarget = {
            ...m,
            completed: nextState,
            completedDate: nextState ? new Date().toISOString().slice(0, 10) : undefined,
          };
          return toggledTarget;
        }
        return m;
      });
      persistLocalState(OFFLINE_STORAGE_KEYS.MILESTONES, updated);
      return updated;
    });

    if (toggledTarget) {
      const targetSnapshot = toggledTarget as MilestoneChecklistItem;
      const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
      if (isOffline) {
        void enqueueOfflineMutation(
          'milestone:toggle',
          targetSnapshot,
          `milestone_${targetSnapshot.id}`
        ).then(refreshPendingOfflineCount);
      } else {
        void pushFamilyMutation('milestone:toggle', targetSnapshot);
        void syncMilestoneToFirestore(activeJournalId, profile, targetSnapshot).catch(() =>
          enqueueOfflineMutation(
            'milestone:toggle',
            targetSnapshot,
            `milestone_${targetSnapshot.id}`
          ).then(refreshPendingOfflineCount)
        );
      }
    }
  };

  const handleSaveQuickGrowth = (data: {
    date: string;
    weightKg?: number;
    heightCm?: number;
    headCircumferenceCm?: number;
    notes?: string;
  }) => {
    const birth = new Date(profile.birthDate);
    const mDate = new Date(data.date);
    const monthsDiff = Math.max(
      0,
      (mDate.getFullYear() - birth.getFullYear()) * 12 + (mDate.getMonth() - birth.getMonth())
    );

    const newRecord: GrowthRecord = {
      id: `gr_${Date.now()}`,
      date: data.date,
      ageMonths: monthsDiff,
      weightKg: data.weightKg || latestStats.weightKg,
      heightCm: data.heightCm || latestStats.heightCm,
      headCircumferenceCm: data.headCircumferenceCm || latestStats.headCircumferenceCm,
      notes: data.notes || 'Pencatatan Cepat Pertumbuhan',
    };

    setRecords((prev) => {
      const updatedRecords = [...prev, newRecord];
      persistLocalState(OFFLINE_STORAGE_KEYS.GROWTH_RECORDS, updatedRecords);
      return updatedRecords;
    });

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      void enqueueOfflineMutation('growth:create', newRecord, `growth_${newRecord.id}`).then(
        refreshPendingOfflineCount
      );
    } else {
      void pushFamilyMutation('growth:create', newRecord);
      void syncGrowthToFirestore(activeJournalId, profile, newRecord).catch(() =>
        enqueueOfflineMutation('growth:create', newRecord, `growth_${newRecord.id}`).then(
          refreshPendingOfflineCount
        )
      );
    }

    showToast(
      isOffline
        ? `Data pertumbuhan ${profile.nickname} tersimpan offline & siap sinkron saat online!`
        : `Data BB/TB ${profile.nickname} (${data.weightKg ? data.weightKg + ' kg' : ''} ${
            data.heightCm ? data.heightCm + ' cm' : ''
          }) tersimpan ke Firestore secara real-time!`
    );
  };

  const handleSaveProfileOnline = async (
    updated: ChildProfile
  ): Promise<{ syncedOnline: boolean }> => {
    // 1. Simpan otomatis terlebih dahulu ke IndexedDB & LocalStorage agar UI tidak menggantung
    setProfile(updated);
    await persistLocalStateAsync(OFFLINE_STORAGE_KEYS.PROFILE, updated);

    // 2. Upload Cloudinary (format resmi) & simpan Firestore secara real-time
    try {
      const syncedProfile = await syncProfileToFirestore(activeJournalId, updated, {
        timeoutMs: 25000,
      });

      setProfile(syncedProfile);
      await persistLocalStateAsync(OFFLINE_STORAGE_KEYS.PROFILE, syncedProfile);
      await removeOfflineMutation('profile_latest');
      hasPendingProfileSyncRef.current = false;
      setIsProfilePendingSync(false);
      await refreshPendingOfflineCount();

      void pushFamilyMutation('profile:update', syncedProfile);
      showToast(
        'Biodata Salma, Ayah & Bunda berhasil tersinkronisasi ke Cloudinary & Firestore!'
      );
      return { syncedOnline: true };
    } catch (err) {
      console.warn(
        'Koneksi Cloud lambat/gagal (batas 5 detik), biodata disimpan lokal menunggu sinkronisasi:',
        err
      );
      hasPendingProfileSyncRef.current = true;
      setIsProfilePendingSync(true);
      await enqueueOfflineMutation('profile:update', updated, 'profile_latest');
      await refreshPendingOfflineCount();
      showToast('Tersimpan Lokal (Menunggu Sinkronisasi)');
      return { syncedOnline: false };
    }
  };

  const handleUpdateParentingQuote = (updatedQuote: ParentingQuoteItem) => {
    setParentingQuotes((prev) => {
      const exists = prev.some((q) => q.id === updatedQuote.id);
      const next = exists
        ? prev.map((q) => (q.id === updatedQuote.id ? updatedQuote : q))
        : [...prev, updatedQuote];
      persistLocalState(OFFLINE_STORAGE_KEYS.PARENTING_QUOTES, next);
      return next;
    });

    const isOffline = typeof navigator !== 'undefined' && !navigator.onLine;
    if (isOffline) {
      void enqueueOfflineMutation('quote:update', updatedQuote, `quote_${updatedQuote.id}`).then(
        refreshPendingOfflineCount
      );
      showToast('Mutiara Parenting disimpan offline & otomatis sinkron saat online!');
      return;
    }

    void pushFamilyMutation('quote:update', updatedQuote);
    void syncParentingQuoteToFirestore(activeJournalId, profile, updatedQuote).catch(() =>
      enqueueOfflineMutation('quote:update', updatedQuote, `quote_${updatedQuote.id}`).then(
        refreshPendingOfflineCount
      )
    );
    showToast('Mutiara Parenting berhasil diperbarui & disinkronkan ke semua HP!');
  };

  return (
    <div
      onContextMenu={(e) => {
        e.preventDefault();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setIsContextMenuOpen(true);
      }}
      className="min-h-screen flex flex-col font-sans pb-24 md:pb-16 text-[#1F2937] select-none sm:select-auto"
    >
      {/* 3-Zone Desktop & Mobile Top Bar */}
      <Header
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        onOpenUpload={handleOpenUpload}
        momentsCount={moments.length}
        currentUser={currentUser}
        onConnectGoogle={() => setIsStorageModalOpen(true)}
        onOpenMenu={() => {
          setContextMenuPos(null);
          setIsContextMenuOpen(true);
        }}
      />

      {/* Main Content Viewport */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-4 sm:py-5 space-y-6">
        {/* Bar Pasang di Layar + Mutiara Parenting Otomatis (Sinkron Real-Time via Firestore) */}
        <ParentingQuoteBar
          quotes={parentingQuotes}
          onUpdateQuote={handleUpdateParentingQuote}
        />

        {/* Tab 1: Overview (Beranda Utama) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Child & Parents Biodata Hero Box */}
            <ChildHeroProfile
              profile={profile}
              latestStats={latestStats}
              isPendingLocalSync={isProfilePendingSync}
              onRetrySync={() => void flushPendingOfflineQueue()}
              onEditProfile={() => setIsEditProfileOpen(true)}
              onSaveProfile={handleSaveProfileOnline}
              onOpenQuickGrowth={() => setIsQuickGrowthOpen(true)}
              onNotify={showToast}
              onOpenMenu={() => {
                setContextMenuPos(null);
                setIsContextMenuOpen(true);
              }}
            />

            {/* Section: Momen & Kenangan Terkini (Polaroid Cards with Clothespins, Edit & Download) */}
            <section className="space-y-4 pt-1">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                <div>
                  <h2 className="text-base sm:text-xl font-extrabold text-slate-900 tracking-tight flex items-center gap-2 flex-wrap">
                    <span>Momen &amp; Kenangan Terkini</span>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100/90 border border-amber-200/80 px-2.5 py-0.5 rounded-full">
                      Polaroid Terbaru
                    </span>
                  </h2>
                  <p className="text-xs text-slate-500 mt-0.5">
                    Kilas potret tumbuh kembang {profile.name}
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('gallery')}
                  className="self-start sm:self-auto px-4 py-2 text-xs font-bold text-teal-800 hover:text-teal-950 bg-white/90 hover:bg-teal-50 border border-teal-300/90 rounded-full transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <span>Buka Galeri Kolase &rarr;</span>
                </button>
              </div>

              {/* Polaroid Grid: Latest 3 Moments + Dashed "+ Tambah Momen" Card */}
              <div className="grid grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-5 pt-2">
                {moments.slice(0, 3).map((moment, idx) => {
                  const mAge = calculateAge(profile.birthDate, moment.date);
                  const pinVariant = idx % 2 === 0 ? 'wood' : 'mint';

                  return (
                    <div
                      key={moment.id}
                      onClick={() => {
                        setSelectedMomentSlideIndex(0);
                        setSelectedMoment(moment);
                      }}
                      className="group relative pt-3 cursor-pointer"
                    >
                      <Clothespin
                        variant={pinVariant}
                        className="absolute top-0 left-1/2 -translate-x-1/2"
                      />

                      <div className="h-full bg-white p-2.5 sm:p-3.5 pb-3.5 rounded-3xl border border-slate-200/90 shadow-sm group-hover:shadow-md transition-all flex flex-col justify-between">
                        <MomentMediaCarousel
                          moment={moment}
                          aspectClassName="aspect-[4/5] rounded-2xl mb-2.5"
                          imageClassName="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          onTapSlide={(slideIdx) => {
                            setSelectedMomentSlideIndex(slideIdx);
                            setSelectedMoment(moment);
                          }}
                          onActiveSlideChange={(_idx, slide) =>
                            setOverviewActiveSlides((prev) => ({ ...prev, [moment.id]: slide }))
                          }
                        >
                          {moment.weightKg && (
                            <div className="absolute top-2 right-2 z-10 bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full pointer-events-none">
                              {moment.weightKg} kg
                            </div>
                          )}
                        </MomentMediaCarousel>

                        <div className="flex items-start justify-between gap-1.5 px-0.5">
                          <div className="min-w-0 flex-1">
                            <h4 className="text-xs sm:text-sm font-bold text-slate-800 truncate group-hover:text-teal-700 transition-colors">
                              {moment.title}
                            </h4>
                            <p className="text-[10px] sm:text-[11px] text-slate-400 truncate">
                              Usia {mAge.label}
                            </p>
                          </div>

                          {/* Direct Edit & Download Buttons on Card */}
                          <div className="flex items-center gap-0.5 shrink-0">
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleOpenEditMoment(moment);
                              }}
                              title="Edit foto atau catatan momen"
                              aria-label="Edit momen"
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button
                              type="button"
                              onClick={(e) => {
                                e.stopPropagation();
                                void handleDownloadMoment(moment, overviewActiveSlides[moment.id]);
                              }}
                              title="Unduh foto yang sedang ditampilkan"
                              aria-label="Unduh foto"
                              className="w-7 h-7 rounded-lg text-slate-400 hover:text-teal-700 hover:bg-teal-50 flex items-center justify-center transition-colors cursor-pointer"
                            >
                              <Download className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}

                {/* Dashed "+ Tambah Momen" Card */}
                <div className="pt-3">
                  <button
                    type="button"
                    onClick={() => handleOpenUpload('media')}
                    className="w-full h-full min-h-[220px] sm:min-h-[260px] rounded-3xl border-2 border-dashed border-slate-300/90 hover:border-teal-500 bg-white/55 hover:bg-teal-50/40 transition-all flex flex-col items-center justify-center p-4 text-center gap-2 cursor-pointer group"
                  >
                    <div className="w-12 h-12 rounded-full bg-teal-50 group-hover:bg-teal-100 text-teal-600 flex items-center justify-center transition-transform group-hover:scale-105">
                      <Plus className="w-6 h-6" />
                    </div>
                    <div>
                      <span className="block text-xs sm:text-sm font-extrabold text-slate-800 group-hover:text-teal-800">
                        + Tambah Momen
                      </span>
                      <span className="block text-[11px] text-slate-400">
                        Kamera / Galeri
                      </span>
                    </div>
                  </button>
                </div>
              </div>
            </section>

            {/* Quick Teaser for Growth Chart & Milestones */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Kurva Pertumbuhan WHO Box */}
              <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-5 shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center">
                        <TrendingUp className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">Kurva Pertumbuhan WHO</h3>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsQuickGrowthOpen(true)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                    >
                      + Catat BB/TB
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pengukuran terakhir:{' '}
                    <span className="font-semibold text-slate-800">{latestStats.weightKg} kg</span>{' '}
                    &amp;{' '}
                    <span className="font-semibold text-slate-800">{latestStats.heightCm} cm</span>.
                    Status grafik sesuai standar pita WHO.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('charts')}
                  className="w-full py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer text-center"
                >
                  Buka Grafik Pita WHO Lengkap &rarr;
                </button>
              </div>

              {/* Milestone Tracker Box */}
              <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-5 shadow-xs flex flex-col justify-between gap-4">
                <div className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center">
                        <Award className="w-4 h-4" />
                      </div>
                      <h3 className="text-sm font-bold text-slate-900">Buku Tahapan Milestone</h3>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                      {milestones.filter((m) => m.completed).length} / {milestones.length} Tercapai
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pantau tahapan motorik, bicara, dan sosial emosional buah hati dengan panduan
                    standar IDAI &amp; WHO.
                  </p>
                </div>

                <button
                  type="button"
                  onClick={() => setActiveTab('milestones')}
                  className="w-full py-2.5 text-xs font-bold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200/80 rounded-xl transition-all cursor-pointer text-center"
                >
                  Buka Catatan Milestone Lengkap &rarr;
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Tab 2: Gallery (Kolase Estetik Per Kategori ala Pinterest) */}
        {activeTab === 'gallery' && (
          <CollageGallery
            moments={moments}
            birthDate={profile.birthDate}
            onSelectMoment={(m, slideIdx = 0) => {
              setSelectedMomentSlideIndex(slideIdx);
              setSelectedMoment(m);
            }}
            onEditMoment={handleOpenEditMoment}
            onDownloadMoment={(m, slide) => void handleDownloadMoment(m, slide)}
            onOpenUpload={() => handleOpenUpload('media')}
          />
        )}

        {/* Tab 3: Growth Charts (Kurva WHO & Riwayat Pengukuran) */}
        {activeTab === 'charts' && (
          <GrowthCharts
            profile={profile}
            records={records}
            onAddRecord={() => handleOpenUpload('milestone')}
          />
        )}

        {/* Tab 4: Milestones (Buku Milestone Tahapan Perkembangan) */}
        {activeTab === 'milestones' && (
          <MilestoneTracker
            milestones={milestones}
            childName={profile.nickname}
            onToggleMilestone={handleToggleMilestone}
            onOpenUploadMilestone={() => handleOpenUpload('milestone')}
          />
        )}

        {/* Subtle Quick Footer Link */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 px-2">
          <span>Tip: Klik kanan atau tap lama untuk membuka menu cepat</span>
          <button
            type="button"
            onClick={() => setIsStorageModalOpen(true)}
            className="text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Pengaturan Cloud Firestore &amp; Cloudinary</span>
          </button>
        </div>
      </main>

      {/* Floating Transparent FAQ & Konsultasi dr. AI (Google Search + Halodoc/IDAI/WHO) */}
      <FloatingDoctorFAQ profile={profile} latestStats={latestStats} />

      {/* Floating Bottom Navigation Bar for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
        <div className="grid grid-cols-4 items-center h-14">
          <button
            type="button"
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer ${
              activeTab === 'overview' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Beranda</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('gallery')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer ${
              activeTab === 'gallery' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Kolase</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('charts')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer ${
              activeTab === 'charts' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Kurva WHO</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('milestones')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer ${
              activeTab === 'milestones' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Award className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Milestone</span>
          </button>
        </div>
      </nav>

      {/* Pop-up Modal Pengaturan Cloud Firestore ("salma-anak-kami") & Cloudinary ("la3st6qh") */}
      <StorageModal
        isOpen={isStorageModalOpen}
        onClose={() => setIsStorageModalOpen(false)}
        storageDestination={storageDestination}
        onSelectDestination={setStorageDestination}
        currentUser={currentUser}
        driveQuota={driveQuota}
        isConnecting={isConnectingGoogle}
        onConnectGoogle={handleConnectGoogle}
        onDisconnectGoogle={handleDisconnectGoogle}
        childName={profile.nickname}
        activeJournalId={activeJournalId}
        onJoinFamilyJournal={handleJoinFamilyJournal}
      />

      {/* Context Menu / Long Press Pop-up / Mobile Bottom Sheet */}
      <ContextMenuPopup
        isOpen={isContextMenuOpen}
        position={contextMenuPos}
        onClose={() => {
          setIsContextMenuOpen(false);
          setContextMenuPos(null);
        }}
        onOpenStorage={() => setIsStorageModalOpen(true)}
        onOpenUpload={handleOpenUpload}
        onOpenQuickGrowth={() => setIsQuickGrowthOpen(true)}
        onEditProfile={() => setIsEditProfileOpen(true)}
        onExportBackup={() => exportAppBackup(profile, moments, records)}
        onNavigateTab={(tab) => setActiveTab(tab)}
      />

      {/* Upload & Edit Media / Milestone Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => {
          setIsUploadOpen(false);
          setEditingMoment(null);
        }}
        onSaveMoment={handleSaveNewMoment}
        onUpdateMoment={handleUpdateMoment}
        editingMoment={editingMoment}
        childName={profile.nickname}
        initialMode={uploadMode}
        storageDestination={storageDestination}
        currentUser={currentUser}
        accessToken={accessToken}
        onConnectGoogle={handleConnectGoogle}
      />

      {/* Lightbox / Moment Detail Viewer with Edit, Download & Prev/Next navigation */}
      {(() => {
        const currentMomentIndex = selectedMoment
          ? moments.findIndex((m) => m.id === selectedMoment.id)
          : -1;

        return (
          <MomentLightbox
            moment={selectedMoment}
            initialSlideIndex={selectedMomentSlideIndex}
            birthDate={profile.birthDate}
            childName={profile.nickname}
            onClose={() => {
              setSelectedMoment(null);
              setSelectedMomentSlideIndex(0);
            }}
            onEditMoment={handleOpenEditMoment}
            onNotify={showToast}
            onPrev={
              currentMomentIndex > 0
                ? () => {
                    setSelectedMomentSlideIndex(0);
                    setSelectedMoment(moments[currentMomentIndex - 1]);
                  }
                : undefined
            }
            onNext={
              currentMomentIndex >= 0 && currentMomentIndex < moments.length - 1
                ? () => {
                    setSelectedMomentSlideIndex(0);
                    setSelectedMoment(moments[currentMomentIndex + 1]);
                  }
                : undefined
            }
          />
        );
      })()}

      {/* Edit Child & Parents Biodata Modal */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        profile={profile}
        onClose={() => setIsEditProfileOpen(false)}
        onSaveProfile={handleSaveProfileOnline}
      />

      {/* Modal Input Cepat Pertumbuhan (BB, TB, LK Stepper & Posyandu) */}
      <QuickGrowthModal
        isOpen={isQuickGrowthOpen}
        onClose={() => setIsQuickGrowthOpen(false)}
        initialWeight={latestStats.weightKg}
        initialHeight={latestStats.heightCm}
        initialHeadCirc={latestStats.headCircumferenceCm}
        childName={profile.nickname}
        onSave={handleSaveQuickGrowth}
      />

      {/* Indikator Mode Offline PWA & Antrean Sinkronisasi Cloud */}
      <OfflineIndicator
        pendingCount={pendingOfflineCount}
        isSyncing={isFlushingOffline}
        onRetrySync={() => void flushPendingOfflineQueue()}
      />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-32 md:bottom-20 right-4 sm:right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
