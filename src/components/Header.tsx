import React from 'react';
import { Camera, Heart, MoreVertical } from 'lucide-react';
import { PWAInstallButton } from './PWAInstallButton.tsx';

interface HeaderProps {
  activeTab: 'overview' | 'gallery' | 'charts' | 'milestones';
  onSelectTab: (tab: 'overview' | 'gallery' | 'charts' | 'milestones') => void;
  onOpenUpload: (initialMode?: 'media' | 'milestone') => void;
  momentsCount: number;
  currentUser?: { displayName?: string | null; email?: string | null; photoURL?: string | null } | null;
  onConnectGoogle?: () => void;
  onOpenMenu?: (e: React.MouseEvent) => void;
}

export const Header: React.FC<HeaderProps> = ({
  activeTab,
  onSelectTab,
  onOpenUpload,
  currentUser,
  onOpenMenu,
}) => {
  return (
    <header className="sticky top-0 z-30 bg-[#FAF8F5]/92 backdrop-blur-md border-b border-[#E7E2D9]">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-3 h-14 sm:h-16">
          {/* Zone 1: Brand Wordmark */}
          <div
            onClick={() => onSelectTab('overview')}
            className="flex items-center gap-2.5 shrink-0 cursor-pointer"
          >
            <div className="w-8 h-8 sm:w-9 sm:h-9 rounded-xl bg-gradient-to-tr from-[#34D399] to-[#14B8A6] flex items-center justify-center text-white shadow-sm shadow-emerald-600/10">
              <Heart className="w-4.5 h-4.5 fill-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm sm:text-base font-extrabold tracking-tight text-slate-800 whitespace-nowrap">
                TumbuhKembang
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-slate-500 whitespace-nowrap -mt-0.5">
                Jurnal Ayah &amp; Ibu
              </span>
            </div>
          </div>

          {/* Zone 2: Navigation Links for Desktop */}
          <nav className="hidden md:flex items-center gap-1">
            <button
              type="button"
              onClick={() => onSelectTab('overview')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'overview'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Beranda
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('gallery')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'gallery'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Kolase
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('charts')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'charts'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Kurva WHO
            </button>
            <button
              type="button"
              onClick={() => onSelectTab('milestones')}
              className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                activeTab === 'milestones'
                  ? 'bg-white text-slate-900 shadow-sm border border-slate-200/80'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/60'
              }`}
            >
              Milestone
            </button>
          </nav>

          {/* Zone 3: Actions + Menu Button */}
          <div className="flex items-center gap-2 shrink-0">
            {currentUser && (
              <div
                title={`Google Drive Terhubung: ${currentUser.email}`}
                className="hidden lg:flex items-center gap-2 px-2.5 py-1 bg-sky-50 border border-sky-200 rounded-xl text-xs text-sky-900 font-medium"
              >
                <div className="w-2 h-2 rounded-full bg-emerald-500" />
                <span className="text-[11px] truncate max-w-[130px]">
                  {currentUser.displayName || currentUser.email}
                </span>
              </div>
            )}

            <div className="hidden sm:block">
              <PWAInstallButton variant="header" />
            </div>

            <button
              type="button"
              onClick={() => onOpenUpload('media')}
              className="flex items-center gap-1.5 px-3 sm:px-3.5 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-all shadow-sm active:scale-[0.98] whitespace-nowrap cursor-pointer"
            >
              <Camera className="w-3.5 h-3.5 text-emerald-300" />
              <span>+ Upload</span>
            </button>

            {onOpenMenu && (
              <button
                type="button"
                onClick={onOpenMenu}
                title="Buka Menu & Pengaturan"
                aria-label="Menu Fitur"
                className="w-9 h-9 rounded-xl bg-white hover:bg-slate-100 border border-slate-200/80 text-slate-700 flex items-center justify-center transition-colors cursor-pointer shadow-2xs"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
