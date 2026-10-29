import React, { useEffect, useRef } from 'react';
import { Cloud, Camera, Sparkles, User, Download, X, Scale } from 'lucide-react';
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
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const isMobile = window.innerWidth < 640 || !position;

  // On desktop with context menu position
  const x = position ? Math.min(position.x, window.innerWidth - 260) : window.innerWidth / 2 - 130;
  const y = position ? Math.min(position.y, window.innerHeight - 360) : window.innerHeight / 2 - 180;

  return (
    <div
      className="fixed inset-0 z-50 bg-black/40 backdrop-blur-2xs flex sm:block items-end sm:items-stretch justify-center"
      onClick={onClose}
    >
      <div
        ref={menuRef}
        onClick={(e) => e.stopPropagation()}
        style={!isMobile && position ? { top: `${y}px`, left: `${x}px` } : undefined}
        className={
          isMobile
            ? 'w-full max-w-md bg-[#FFFDF9] rounded-t-3xl border-t border-[#EDE8DF] shadow-2xl p-4 z-50 text-xs text-slate-800 space-y-2 animate-in slide-in-from-bottom duration-200'
            : 'fixed w-64 bg-[#FFFDF9] rounded-2xl border border-[#EDE8DF] shadow-2xl p-2.5 z-50 text-xs text-slate-800 space-y-1.5 animate-in zoom-in-95 duration-150'
        }
      >
        {/* Mobile handle indicator */}
        {isMobile && (
          <div className="w-12 h-1 bg-slate-300 rounded-full mx-auto mb-2" />
        )}

        <div className="px-3 py-1.5 border-b border-slate-100 flex items-center justify-between">
          <div className="flex items-center gap-1.5 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
            <span>Menu Cepat & Fitur Lengkap</span>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-6 h-6 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* PWA Install Action (Otomatis sembunyi jika sudah ter-install) */}
        <PWAInstallButton variant="menu" onAfterAction={onClose} />

        {/* Feature 1: Google Drive & Storage Settings (Hidden from main screen as requested) */}
        <button
          onClick={() => {
            onClose();
            onOpenStorage();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-sky-50 text-slate-800 hover:text-sky-900 transition-colors text-left font-semibold cursor-pointer border border-transparent hover:border-sky-100"
        >
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center shrink-0">
            <Cloud className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-900">Pengaturan Google Drive</span>
            <span className="block text-[10px] text-slate-500 truncate">
              Hubungkan akun, kelola folder & backup cloud
            </span>
          </div>
        </button>

        {/* Feature 2: Ubah Foto Anak & Akun Ayah */}
        <button
          onClick={() => {
            onClose();
            onEditProfile();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl hover:bg-emerald-50 text-slate-800 hover:text-emerald-900 transition-colors text-left font-semibold cursor-pointer border border-transparent hover:border-emerald-100"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
            <User className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-slate-900">Ganti Foto Anak & Akun</span>
            <span className="block text-[10px] text-slate-500 truncate">
              Upload foto dari HP, ganti avatar & biodata
            </span>
          </div>
        </button>

        {/* Feature 3: Input Cepat BB & TB (Kemudahan Input Pertumbuhan) */}
        {onOpenQuickGrowth && (
          <button
            onClick={() => {
              onClose();
              onOpenQuickGrowth();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-teal-50 text-slate-800 hover:text-teal-900 transition-colors text-left font-semibold cursor-pointer border border-transparent hover:border-teal-100"
          >
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-700 flex items-center justify-center shrink-0">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0 flex-1">
              <span className="block text-xs font-bold text-slate-900">Input Cepat Berat & Tinggi</span>
              <span className="block text-[10px] text-slate-500 truncate">
                Catat BB, TB & Lingkar Kepala dengan stepper mudah
              </span>
            </div>
          </button>
        )}

        {/* Feature 4: Upload Foto/Video Cepat */}
        <button
          onClick={() => {
            onClose();
            onOpenUpload('media');
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-amber-50 text-slate-700 hover:text-amber-900 transition-colors text-left font-medium cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-700 flex items-center justify-center shrink-0">
            <Camera className="w-3.5 h-3.5" />
          </div>
          <span>Upload Foto / Video (Kamera & Galeri)</span>
        </button>

        {/* Feature 4: Catat Milestone Baru */}
        <button
          onClick={() => {
            onClose();
            onOpenUpload('milestone');
          }}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-indigo-50 text-slate-700 hover:text-indigo-900 transition-colors text-left font-medium cursor-pointer"
        >
          <div className="w-7 h-7 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
            <Sparkles className="w-3.5 h-3.5" />
          </div>
          <span>Catat Milestone Perkembangan</span>
        </button>

        {/* Navigation Quick Links on mobile */}
        {onNavigateTab && (
          <div className="pt-1 border-t border-slate-100 flex items-center gap-2 px-1">
            <button
              onClick={() => {
                onClose();
                onNavigateTab('gallery');
              }}
              className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 text-center cursor-pointer"
            >
              Kolase Pinterest
            </button>
            <button
              onClick={() => {
                onClose();
                onNavigateTab('charts');
              }}
              className="flex-1 py-1.5 px-2 bg-slate-100 hover:bg-slate-200 rounded-lg text-[11px] font-semibold text-slate-700 text-center cursor-pointer"
            >
              Kurva WHO
            </button>
          </div>
        )}

        {/* Feature 5: Cadangkan Data JSON */}
        <div className="pt-1.5 border-t border-slate-100">
          <button
            onClick={() => {
              onClose();
              onExportBackup();
            }}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-xl hover:bg-slate-100 text-slate-600 hover:text-slate-900 transition-colors text-left font-medium cursor-pointer"
          >
            <Download className="w-4 h-4 text-slate-400" />
            <div className="min-w-0 flex-1">
              <span className="block text-[11px] font-semibold text-slate-800">
                Download Backup Jurnal (JSON)
              </span>
              <span className="block text-[10px] text-slate-400">
                Simpan salinan data aman di penyimpanan lokal
              </span>
            </div>
          </button>
        </div>
      </div>
    </div>
  );
};
