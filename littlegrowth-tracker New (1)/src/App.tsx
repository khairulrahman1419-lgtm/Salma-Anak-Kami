/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 * 
 * TumbuhKembang - Jurnal Ayah & Buah Hati
 * Aplikasi Dokumentasi Tumbuh Kembang, Galeri Kolase Pinterest & Kurva WHO
 */

import React, { useState, useEffect } from 'react';
import {
  Heart,
  Camera,
  Sparkles,
  BookOpen,
  TrendingUp,
  Cloud,
  CheckCircle2,
  Download,
  Upload,
  Calendar,
  AlertCircle,
  Home,
  Images,
  Award,
  Layers,
  Settings,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { ChildProfile, FilterOptions, GrowthRecord, MilestoneChecklistItem, MomentItem } from './types/index.ts';
import { initialChildProfile, initialGrowthRecords, initialMilestones, initialMoments } from './data/initialData.ts';
import { filterMoments, getLatestMeasurements, calculateAge } from './utils/growth.ts';
import { exportAppBackup, loadFromStorage, saveToStorage, STORAGE_KEYS } from './utils/googleDriveService.ts';

import { initAuth, googleSignIn, logoutGoogle } from './services/googleAuth.ts';
import { fetchDriveQuota } from './services/googleDriveClient.ts';

import { Header } from './components/Header.tsx';
import { ChildHeroProfile } from './components/ChildHeroProfile.tsx';
import { StorageModal } from './components/StorageModal.tsx';
import { ContextMenuPopup } from './components/ContextMenuPopup.tsx';
import { CollageGallery } from './components/CollageGallery.tsx';
import { GrowthCharts } from './components/GrowthCharts.tsx';
import { MilestoneTracker } from './components/MilestoneTracker.tsx';
import { UploadModal } from './components/UploadModal.tsx';
import { MomentLightbox } from './components/MomentLightbox.tsx';
import { EditProfileModal } from './components/EditProfileModal.tsx';
import { QuickGrowthModal } from './components/QuickGrowthModal.tsx';
import { OfflineIndicator } from './components/OfflineIndicator.tsx';

export default function App() {
  // App States with persistent LocalStorage
  const [profile, setProfile] = useState<ChildProfile>(() =>
    loadFromStorage(STORAGE_KEYS.PROFILE, initialChildProfile)
  );

  const [moments, setMoments] = useState<MomentItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.MOMENTS, initialMoments)
  );

  const [records, setRecords] = useState<GrowthRecord[]>(() =>
    loadFromStorage(STORAGE_KEYS.GROWTH_RECORDS, initialGrowthRecords)
  );

  const [milestones, setMilestones] = useState<MilestoneChecklistItem[]>(() =>
    loadFromStorage(STORAGE_KEYS.MILESTONES, initialMilestones)
  );

  // Storage Destination & Google Drive OAuth states
  const [storageDestination, setStorageDestination] = useState<'google_drive' | 'vps_local'>('google_drive');
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [accessToken, setAccessToken] = useState<string | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [driveQuota, setDriveQuota] = useState<{ usageGb: string; limitGb: string } | null>(null);

  // Modals
  const [isStorageModalOpen, setIsStorageModalOpen] = useState(false);
  const [contextMenuPos, setContextMenuPos] = useState<{ x: number; y: number } | null>(null);
  const [isContextMenuOpen, setIsContextMenuOpen] = useState(false);
  const [isUploadOpen, setIsUploadOpen] = useState(false);
  const [isQuickGrowthOpen, setIsQuickGrowthOpen] = useState(false);
  const [uploadMode, setUploadMode] = useState<'media' | 'milestone'>('media');
  const [isEditProfileOpen, setIsEditProfileOpen] = useState(false);
  const [selectedMoment, setSelectedMoment] = useState<MomentItem | null>(null);

  // Navigation
  const [activeTab, setActiveTab] = useState<'overview' | 'gallery' | 'charts' | 'milestones'>('overview');

  // Notification Toast
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => {
      setToastMessage(null);
    }, 4000);
  };

  // Listen to Google Auth State
  useEffect(() => {
    const unsubscribe = initAuth(
      async (user, token) => {
        setCurrentUser(user);
        if (token) {
          setAccessToken(token);
          const quota = await fetchDriveQuota(token);
          if (quota) setDriveQuota(quota);
        }
      },
      () => {
        setCurrentUser(null);
        setAccessToken(null);
        setDriveQuota(null);
      }
    );
    return () => {
      if (unsubscribe) unsubscribe();
    };
  }, []);

  // Sync to Storage on State Changes
  useEffect(() => {
    saveToStorage(STORAGE_KEYS.PROFILE, profile);
  }, [profile]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.MOMENTS, moments);
  }, [moments]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.GROWTH_RECORDS, records);
  }, [records]);

  useEffect(() => {
    saveToStorage(STORAGE_KEYS.MILESTONES, milestones);
  }, [milestones]);

  // Derived calculations
  const latestStats = getLatestMeasurements(profile, moments, records);

  // Handlers for Google Drive connection
  const handleConnectGoogle = async () => {
    setIsConnectingGoogle(true);
    try {
      const res = await googleSignIn();
      if (res) {
        setCurrentUser(res.user);
        setAccessToken(res.accessToken);
        const quota = await fetchDriveQuota(res.accessToken);
        if (quota) setDriveQuota(quota);
        showToast(`Akun Google (${res.user.email}) berhasil terhubung ke Google Drive!`);
      }
    } catch (err: any) {
      console.error('Google Sign-In failed:', err);
      showToast(err.message || 'Gagal menghubungkan ke Google Drive');
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

  // Upload Handlers
  const handleOpenUpload = (mode: 'media' | 'milestone' = 'media') => {
    setUploadMode(mode);
    setIsUploadOpen(true);
  };

  const handleSaveNewMoment = (newMoment: MomentItem) => {
    setMoments((prevMoments) => {
      const updatedMoments = [newMoment, ...prevMoments];
      saveToStorage(STORAGE_KEYS.MOMENTS, updatedMoments);
      return updatedMoments;
    });

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
        saveToStorage(STORAGE_KEYS.GROWTH_RECORDS, updatedRecords);
        return updatedRecords;
      });
    }

    if (newMoment.googleDriveSynced) {
      showToast(`Momen "${newMoment.title}" tersimpan langsung ke Google Drive!`);
    } else {
      showToast(`Momen "${newMoment.title}" berhasil disimpan di penyimpanan lokal.`);
    }
  };

  const handleToggleMilestone = (milestoneId: string) => {
    setMilestones((prev) => {
      const updated = prev.map((m) => {
        if (m.id === milestoneId) {
          const nextState = !m.completed;
          if (nextState) {
            showToast(`Selamat! Milestone "${m.title}" berhasil dicapai.`);
          }
          return {
            ...m,
            completed: nextState,
            completedDate: nextState ? new Date().toISOString().slice(0, 10) : undefined,
          };
        }
        return m;
      });
      saveToStorage(STORAGE_KEYS.MILESTONES, updated);
      return updated;
    });
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
      saveToStorage(STORAGE_KEYS.GROWTH_RECORDS, updatedRecords);
      return updatedRecords;
    });
    showToast(`Data pertumbuhan ${profile.nickname} (${data.weightKg ? data.weightKg + ' kg' : ''} ${data.heightCm ? data.heightCm + ' cm' : ''}) berhasil dicatat!`);
  };

  return (
    <div
      onContextMenu={(e) => {
        // Klik Kanan / Long Press pop up menu untuk mode mobile & desktop
        e.preventDefault();
        setContextMenuPos({ x: e.clientX, y: e.clientY });
        setIsContextMenuOpen(true);
      }}
      className="min-h-screen bg-[#FAF8F5] flex flex-col font-sans pb-20 md:pb-12 text-[#1F2937] select-none sm:select-auto"
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
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 space-y-6">
        {/* Tab 1: Overview (Beranda Utama) */}
        {activeTab === 'overview' && (
          <div className="space-y-6">
            {/* Child Profile Hero Section (Hanya di Beranda) */}
            <ChildHeroProfile
              profile={profile}
              latestStats={latestStats}
              onOpenUpload={handleOpenUpload}
              onEditProfile={() => setIsEditProfileOpen(true)}
              onOpenQuickGrowth={() => setIsQuickGrowthOpen(true)}
              onOpenMenu={() => {
                setContextMenuPos(null);
                setIsContextMenuOpen(true);
              }}
            />

            {/* Quick Section: Sorotan Momen & Kolase Terbaru */}
            <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-5 sm:p-6 shadow-xs space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-base sm:text-lg font-bold text-slate-900 tracking-tight flex items-center gap-2">
                    <span>Momen & Kenangan Terkini</span>
                    <span className="text-[11px] font-medium text-amber-800 bg-amber-100/80 px-2.5 py-0.5 rounded-full">
                      Polaroid Terbaru
                    </span>
                  </h2>
                  <p className="text-[11px] sm:text-xs text-slate-500">
                    Kilas potret tumbuh kembang {profile.nickname}
                  </p>
                </div>

                <button
                  onClick={() => setActiveTab('gallery')}
                  className="px-3 py-1.5 text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/80 border border-emerald-200/80 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 shadow-2xs"
                >
                  <Images className="w-3.5 h-3.5" />
                  <span>Buka Galeri Kolase &rarr;</span>
                </button>
              </div>

              {/* Mini Collage Grid for Overview (Latest 4 Moments) */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 sm:gap-4">
                {moments.slice(0, 4).map((moment) => {
                  const mAge = calculateAge(profile.birthDate, moment.date);
                  return (
                    <div
                      key={moment.id}
                      onClick={() => setSelectedMoment(moment)}
                      className="group bg-white p-2.5 sm:p-3 rounded-2xl border border-slate-200/80 shadow-xs hover:shadow-md transition-all cursor-pointer flex flex-col"
                    >
                      <div className="aspect-square rounded-xl overflow-hidden bg-slate-100 relative mb-2">
                        <img
                          src={moment.mediaUrl}
                          alt={moment.title}
                          className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                          loading="lazy"
                        />
                        {moment.weightKg && (
                          <div className="absolute top-1.5 right-1.5 bg-slate-900/80 backdrop-blur-xs text-white text-[9px] font-bold px-1.5 py-0.5 rounded-md">
                            {moment.weightKg} kg
                          </div>
                        )}
                      </div>
                      <div className="space-y-0.5">
                        <h4 className="text-xs font-bold text-slate-800 truncate group-hover:text-emerald-700">
                          {moment.title}
                        </h4>
                        <p className="text-[10px] text-slate-400">
                          Usia {mAge.label}
                        </p>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

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
                      <h3 className="text-sm font-bold text-slate-900">
                        Kurva Pertumbuhan WHO
                      </h3>
                    </div>
                    <button
                      onClick={() => setIsQuickGrowthOpen(true)}
                      className="text-[11px] font-bold text-emerald-700 hover:text-emerald-800 cursor-pointer bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200"
                    >
                      + Catat BB/TB
                    </button>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pengukuran terakhir: <span className="font-semibold text-slate-800">{latestStats.weightKg} kg</span> & <span className="font-semibold text-slate-800">{latestStats.heightCm} cm</span>. Status grafik sesuai standar pita WHO.
                  </p>
                </div>

                <button
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
                      <h3 className="text-sm font-bold text-slate-900">
                        Buku Tahapan Milestone
                      </h3>
                    </div>
                    <span className="text-[11px] font-bold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                      {milestones.filter(m => m.completed).length} / {milestones.length} Tercapai
                    </span>
                  </div>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Pantau tahapan motorik, bicara, dan sosial emosional buah hati dengan panduan standar medis.
                  </p>
                </div>

                <button
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
            onSelectMoment={setSelectedMoment}
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

        {/* Subtle Quick Footer Link for Mobile Simplicity */}
        <div className="flex items-center justify-between text-xs text-slate-400 pt-2 px-2">
          <span>Tip: Klik kanan atau tap lama untuk membuka menu cepat</span>
          <button
            onClick={() => setIsStorageModalOpen(true)}
            className="text-sky-700 hover:underline flex items-center gap-1 cursor-pointer"
          >
            <Cloud className="w-3.5 h-3.5" />
            <span>Pengaturan Cloud Drive</span>
          </button>
        </div>
      </main>

      {/* Floating Bottom Navigation Bar for Mobile */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 backdrop-blur-md border-t border-slate-200 px-2 py-1 shadow-lg">
        <div className="grid grid-cols-4 items-center h-14">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer ${
              activeTab === 'overview' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Home className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Beranda</span>
          </button>

          <button
            onClick={() => setActiveTab('gallery')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer ${
              activeTab === 'gallery' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <Layers className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Kolase</span>
          </button>

          <button
            onClick={() => setActiveTab('charts')}
            className={`flex flex-col items-center justify-center h-full min-h-[44px] cursor-pointer ${
              activeTab === 'charts' ? 'text-emerald-700 font-bold' : 'text-slate-500'
            }`}
          >
            <TrendingUp className="w-5 h-5" />
            <span className="text-[10px] mt-0.5">Kurva WHO</span>
          </button>

          <button
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

      {/* Pop-up Modal Pengaturan Penyimpanan (Disembunyikan dari tampilan utama mobile) */}
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

      {/* Upload Media & Milestone Modal */}
      <UploadModal
        isOpen={isUploadOpen}
        onClose={() => setIsUploadOpen(false)}
        onSaveMoment={handleSaveNewMoment}
        childName={profile.nickname}
        initialMode={uploadMode}
        storageDestination={storageDestination}
        currentUser={currentUser}
        accessToken={accessToken}
        onConnectGoogle={handleConnectGoogle}
      />

      {/* Lightbox / Moment Detail Viewer with Prev/Next navigation */}
      {(() => {
        const currentMomentIndex = selectedMoment
          ? moments.findIndex((m) => m.id === selectedMoment.id)
          : -1;

        return (
          <MomentLightbox
            moment={selectedMoment}
            birthDate={profile.birthDate}
            childName={profile.nickname}
            onClose={() => setSelectedMoment(null)}
            onPrev={
              currentMomentIndex > 0
                ? () => setSelectedMoment(moments[currentMomentIndex - 1])
                : undefined
            }
            onNext={
              currentMomentIndex >= 0 && currentMomentIndex < moments.length - 1
                ? () => setSelectedMoment(moments[currentMomentIndex + 1])
                : undefined
            }
          />
        );
      })()}

      {/* Edit Child Profile Modal (dengan upload foto & ganti avatar) */}
      <EditProfileModal
        isOpen={isEditProfileOpen}
        profile={profile}
        onClose={() => setIsEditProfileOpen(false)}
        onSaveProfile={(updated) => {
          setProfile(updated);
          saveToStorage(STORAGE_KEYS.PROFILE, updated);
          showToast('Profil dan foto anak berhasil diperbarui!');
        }}
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

      {/* Indikator Mode Offline PWA */}
      <OfflineIndicator />

      {/* Notification Toast */}
      {toastMessage && (
        <div className="fixed bottom-18 md:bottom-6 right-4 sm:right-6 z-50 bg-slate-900 text-white text-xs px-4 py-3 rounded-2xl shadow-xl flex items-center gap-2.5 animate-in slide-in-from-bottom duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}
    </div>
  );
}
