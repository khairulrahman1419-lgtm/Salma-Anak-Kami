import React, { useEffect } from 'react';
import { X, Download, Edit2, ChevronLeft, ChevronRight, Trash2, Plus } from 'lucide-react';
import type { ChildProfile } from '../types/index.ts';
import { downloadMediaFile } from '../utils/downloadMedia.ts';

export type FamilyPhotoKey = string; // 'child' | 'father' | 'mother' | `extra:${id}`

interface FamilyPhotoModalProps {
  activePhotoKey: FamilyPhotoKey | null;
  profile: ChildProfile;
  onSelectPhotoKey: (key: FamilyPhotoKey) => void;
  onClose: () => void;
  onEditProfile?: () => void;
  onRemoveExtraPhoto?: (extraId: string) => void;
  onTriggerAddExtraPhotos?: () => void;
  canAddMoreExtra?: boolean;
  onNotify?: (msg: string) => void;
}

const FALLBACK_CHILD_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 24 24" fill="none" stroke="%2314B8A6" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="4" fill="%23F0FDFA" stroke="none"/><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

const FALLBACK_FATHER_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 24 24" fill="none" stroke="%230284C7" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="4" fill="%23F0F9FF" stroke="none"/><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

const FALLBACK_MOTHER_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 24 24" fill="none" stroke="%23E11D48" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="4" fill="%23FFF1F2" stroke="none"/><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

export const FamilyPhotoModal: React.FC<FamilyPhotoModalProps> = ({
  activePhotoKey,
  profile,
  onSelectPhotoKey,
  onClose,
  onEditProfile,
  onRemoveExtraPhoto,
  onTriggerAddExtraPhotos,
  canAddMoreExtra = false,
  onNotify,
}) => {
  const extraItems = (profile.extraFamilyPhotos || []).map((extra, idx) => ({
    key: `extra:${extra.id}`,
    extraId: extra.id,
    tabLabel: extra.label?.trim() || `Foto ${idx + 1}`,
    name: extra.label?.trim() || `Potret Keluarga ${idx + 1}`,
    subtitle: `Album Keluarga ${profile.nickname || profile.name}`,
    url: extra.url || FALLBACK_CHILD_SVG,
    fallbackUrl: FALLBACK_CHILD_SVG,
  }));

  const familyPhotos: {
    key: FamilyPhotoKey;
    extraId?: string;
    tabLabel: string;
    name: string;
    subtitle: string;
    url: string;
    fallbackUrl: string;
  }[] = [
    {
      key: 'child',
      tabLabel: profile.nickname || 'Anak',
      name: profile.name,
      subtitle: 'Buah Hati Tercinta',
      url: profile.avatarUrl || FALLBACK_CHILD_SVG,
      fallbackUrl: FALLBACK_CHILD_SVG,
    },
    {
      key: 'father',
      tabLabel: 'Ayah',
      name: profile.fatherName || 'Ayah',
      subtitle: profile.fatherInfo || 'Ayah Tercinta',
      url:
        profile.fatherAvatarUrl ||
        '/src/assets/images/moment_father_play_1792555577232.jpg',
      fallbackUrl: FALLBACK_FATHER_SVG,
    },
    {
      key: 'mother',
      tabLabel: 'Bunda',
      name: profile.motherName || 'Bunda',
      subtitle: profile.motherInfo || 'Bunda Tercinta',
      url:
        profile.motherAvatarUrl ||
        '/src/assets/images/moment_eating_puree_1792555107552.jpg',
      fallbackUrl: FALLBACK_MOTHER_SVG,
    },
    ...extraItems,
  ];

  const currentIndex = activePhotoKey
    ? familyPhotos.findIndex((item) => item.key === activePhotoKey)
    : -1;

  useEffect(() => {
    if (!activePhotoKey) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft' && currentIndex !== -1) {
        const prevIdx = (currentIndex - 1 + familyPhotos.length) % familyPhotos.length;
        onSelectPhotoKey(familyPhotos[prevIdx].key);
      } else if (e.key === 'ArrowRight' && currentIndex !== -1) {
        const nextIdx = (currentIndex + 1) % familyPhotos.length;
        onSelectPhotoKey(familyPhotos[nextIdx].key);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [activePhotoKey, currentIndex, familyPhotos, onClose, onSelectPhotoKey]);

  if (!activePhotoKey || currentIndex === -1) return null;

  const activeItem = familyPhotos[currentIndex];

  const handleDownload = async () => {
    const ok = await downloadMediaFile(
      activeItem.url,
      `foto-${activeItem.tabLabel.toLowerCase().replace(/\s+/g, '-')}-${profile.nickname || 'keluarga'}`,
      'image'
    );
    if (ok && onNotify) {
      onNotify(`Foto ${activeItem.name} berhasil diunduh!`);
    }
  };

  const handlePrev = () => {
    const prevIdx = (currentIndex - 1 + familyPhotos.length) % familyPhotos.length;
    onSelectPhotoKey(familyPhotos[prevIdx].key);
  };

  const handleNext = () => {
    const nextIdx = (currentIndex + 1) % familyPhotos.length;
    onSelectPhotoKey(familyPhotos[nextIdx].key);
  };

  const handleDeleteCurrentExtra = () => {
    if (!activeItem.extraId || !onRemoveExtraPhoto) return;
    const fallbackKey =
      currentIndex > 0 ? familyPhotos[currentIndex - 1].key : 'child';
    onRemoveExtraPhoto(activeItem.extraId);
    onSelectPhotoKey(fallbackKey);
  };

  return (
    <div
      className="fixed inset-0 z-50 bg-slate-950/92 backdrop-blur-md flex flex-col justify-between p-4 sm:p-6 animate-in fade-in duration-150"
      onClick={onClose}
    >
      {/* Top Bar: Switcher Keluarga + Actions */}
      <div
        className="w-full max-w-5xl mx-auto flex items-center justify-between gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Scrollable Role & Extra Photos Tabs */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-white/10 border border-white/15 overflow-x-auto max-w-[56vw] sm:max-w-lg">
          {familyPhotos.map((item) => {
            const isSelected = item.key === activePhotoKey;
            return (
              <button
                key={item.key}
                type="button"
                onClick={() => onSelectPhotoKey(item.key)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] ${
                  isSelected
                    ? 'bg-white text-slate-900 shadow-xs'
                    : 'text-white/80 hover:text-white hover:bg-white/10'
                }`}
              >
                {item.tabLabel}
              </button>
            );
          })}

          {canAddMoreExtra && onTriggerAddExtraPhotos && (
            <button
              type="button"
              onClick={onTriggerAddExtraPhotos}
              title="Tambah foto keluarga (bisa pilih lebih dari 1)"
              className="px-2.5 py-1.5 rounded-lg text-xs font-bold text-teal-300 hover:text-white hover:bg-teal-600/40 transition-colors cursor-pointer whitespace-nowrap shrink-0 min-h-[36px] inline-flex items-center gap-1"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Foto</span>
            </button>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {activeItem.extraId && onRemoveExtraPhoto && (
            <button
              type="button"
              onClick={handleDeleteCurrentExtra}
              title="Hapus foto tambahan ini"
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 min-h-[40px] rounded-xl bg-rose-500/20 hover:bg-rose-500/35 border border-rose-400/30 text-rose-200 text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Hapus</span>
            </button>
          )}

          {onEditProfile && (
            <button
              type="button"
              onClick={() => {
                onClose();
                onEditProfile();
              }}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 min-h-[40px] rounded-xl bg-white/12 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Kelola Foto</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => void handleDownload()}
            className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-2 min-h-[40px] rounded-xl bg-white/12 hover:bg-white/20 text-white text-xs font-semibold transition-colors cursor-pointer whitespace-nowrap"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Unduh</span>
          </button>

          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup tampilan foto utuh"
            className="w-10 h-10 min-w-[44px] min-h-[44px] rounded-xl bg-white/15 hover:bg-white/25 text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Center Stage: Full Uncropped Photo ("Foto Utuhnya") */}
      <div
        className="relative flex-1 flex items-center justify-center my-3 min-h-0"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          onClick={handlePrev}
          aria-label="Foto sebelumnya"
          className="absolute left-0 sm:left-4 z-10 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-black/50 hover:bg-black/75 border border-white/15 text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronLeft className="w-5 h-5" />
        </button>

        <img
          src={activeItem.url}
          alt={activeItem.name}
          referrerPolicy="no-referrer"
          onError={(e) => {
            (e.target as HTMLImageElement).src = activeItem.fallbackUrl;
          }}
          className="max-h-[72vh] max-w-full w-auto h-auto object-contain rounded-2xl shadow-2xl select-none"
        />

        <button
          type="button"
          onClick={handleNext}
          aria-label="Foto berikutnya"
          className="absolute right-0 sm:right-4 z-10 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-black/50 hover:bg-black/75 border border-white/15 text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <ChevronRight className="w-5 h-5" />
        </button>
      </div>

      {/* Bottom Caption: Nama & Peran + Indikator Urutan */}
      <div
        className="w-full max-w-xl mx-auto text-center space-y-0.5 pb-1"
        onClick={(e) => e.stopPropagation()}
      >
        <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
          {activeItem.name}
        </h3>
        <p className="text-xs sm:text-sm text-white/75 tabular-nums">
          {activeItem.subtitle} · {currentIndex + 1}/{familyPhotos.length}
        </p>
      </div>
    </div>
  );
};
