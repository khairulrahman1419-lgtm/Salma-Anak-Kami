import React, { useEffect, useRef } from 'react';
import { Cloud, Camera, Award, Edit2, Download, X, Scale } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface ContextMenuPopupProps {
  isOpen: boolean;
  position: { x: number; y: number } | null;
  onClose: () => void;
  onOpenStorage: () => void;
  onOpenUpload: (mode?: 'media' | 'milestone') => void;
  onOpenQuickGrowth?: () => void;
  onEditProfile: () => void;
  onExportBackup: () => void;
  onNavigateTab?: (tab: 'overview' | 'gallery' | 'charts' | 'milestones') => void;
}

export const ContextMenuPopup: React.FC<ContextMenuPopupProps> = ({
  isOpen,
  position,
  onClose,
  onOpenStorage,
  onOpenUpload,
  onOpenQuickGrowth,
  onEditProfile,
  onExportBackup,
  onNavigateTab,
}) => {
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    const handleEsc = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      window.addEventListener('keydown', handleEsc);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEsc);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  return (
    <div
      data-anchored={position ? 'true' : 'false'}
      className="fixed inset-0 z-50 bg-slate-900/45 backdrop-blur-2xs flex items-end sm:items-center justify-center sm:p-4"
      onClick={onClose}
    >
      <div
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        className="w-full max-w-md sm:max-w-none sm:w-80 bg-[#FFFDF9] rounded-t-3xl sm:rounded-2xl border-t sm:border border-[#EDE8DF] shadow-2xl p-4 pb-6 sm:p-3.5 z-50 text-xs text-slate-800 space-y-1.5 animate-in slide-in-from-bottom sm:zoom-in-95 duration-200 max-h-[85vh] overflow-y-auto"
      >
        {/* Mobile grab handle */}
        <div className="sm:hidden w-10 h-1.5 bg-slate-300 rounded-full mx-auto mb-2" />

        <div className="px-2.5 py-1.5 border-b border-slate-100 flex items-center justify-between">
          <span className="text-xs font-extrabold text-slate-900">
            Menu Keluarga &amp; Jurnal
          </span>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup Menu"
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* 1. Ubah Biodata & Foto Keluarga */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onEditProfile();
          }}
          className="w-full min-h-[48px] flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-teal-50 text-slate-800 hover:text-teal-900 transition-colors text-left cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
            <Edit2 className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-900">
              Ubah Biodata &amp; Foto Keluarga
            </span>
            <span className="block text-[10px] text-slate-500 truncate">
              Edit profil &amp; foto Anak, Ayah, dan Bunda
            </span>
          </div>
        </button>

        {/* 2. Upload Media (Foto / Video) */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenUpload('media');
          }}
          className="w-full min-h-[48px] flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 transition-colors text-left cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-900">Upload Media</span>
            <span className="block text-[10px] text-slate-500 truncate">
              Tambah foto atau video momen dari Kamera / Galeri
            </span>
          </div>
        </button>

        {/* 3. Catat Milestone Perkembangan */}
        <button
          type="button"
          onClick={() => {
            onClose();
            onOpenUpload('milestone');
          }}
          className="w-full min-h-[48px] flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-amber-50 text-slate-800 hover:text-amber-900 transition-colors text-left cursor-pointer"
        >
          <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Award className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-900">Catat Milestone</span>
            <span className="block text-[10px] text-slate-500 truncate">
              Rekam tahapan perkembangan baru buah hati
            </span>
          </div>
        </button>

        {/* 4. Input Cepat Berat & Tinggi Badan (BB/TB) */}
        {onOpenQuickGrowth && (
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenQuickGrowth();
            }}
            className="w-full min-h-[48px] flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-sky-50 text-slate-800 hover:text-sky-900 transition-colors text-left cursor-pointer"
          >
            <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
              <Scale className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-slate-900">
                Catat Berat &amp; Tinggi (BB/TB)
              </span>
              <span className="block text-[10px] text-slate-500 truncate">
                Input pengukuran BB, TB &amp; Lingkar Kepala
              </span>
            </div>
          </button>
        )}

        {/* PWA Install Action (Otomatis sembunyi jika sudah ter-install) */}
        <PWAInstallButton variant="menu" onAfterAction={onClose} />

        {/* 5. Pengaturan Cloud & Google Drive */}
        <div className="pt-1 border-t border-slate-100 space-y-1">
          <button
            type="button"
            onClick={() => {
              onClose();
              onOpenStorage();
            }}
            className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Cloud className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-800">
                Pengaturan Cloud &amp; Google Drive
              </span>
              <span className="block text-[10px] text-slate-500 truncate">
                Sinkronisasi Firestore, Cloudinary &amp; Drive
              </span>
            </div>
          </button>

          {/* 6. Download Backup JSON */}
          <button
            type="button"
            onClick={() => {
              onClose();
              onExportBackup();
            }}
            className="w-full min-h-[44px] flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-700 hover:text-slate-900 transition-colors text-left cursor-pointer"
          >
            <div className="w-7 h-7 rounded-lg bg-slate-100 text-slate-600 flex items-center justify-center shrink-0">
              <Download className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-semibold text-slate-800">
                Unduh Backup Jurnal (JSON)
              </span>
              <span className="block text-[10px] text-slate-500 truncate">
                Simpan salinan cadangan data di perangkat
              </span>
            </div>
          </button>
        </div>

        {/* Navigasi Cepat Halaman */}
        {onNavigateTab && (
          <div className="pt-1.5 border-t border-slate-100 grid grid-cols-3 gap-1.5 px-1">
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateTab('gallery');
              }}
              className="py-2 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 text-center cursor-pointer whitespace-nowrap"
            >
              Kolase
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateTab('charts');
              }}
              className="py-2 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 text-center cursor-pointer whitespace-nowrap"
            >
              Kurva WHO
            </button>
            <button
              type="button"
              onClick={() => {
                onClose();
                onNavigateTab('milestones');
              }}
              className="py-2 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 text-center cursor-pointer whitespace-nowrap"
            >
              Milestone
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
