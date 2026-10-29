import React, { useState } from 'react';
import { Download, Smartphone, Share, PlusSquare, MoreVertical, X, CheckCircle2 } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface PWAInstallButtonProps {
  variant?: 'header' | 'menu';
  onAfterAction?: () => void;
}

export const PWAInstallButton: React.FC<PWAInstallButtonProps> = ({
  variant = 'header',
  onAfterAction,
}) => {
  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();
  const [showGuideModal, setShowGuideModal] = useState(false);

  // Sembunyikan otomatis apabila aplikasi sudah dibuka dalam mode standalone (ter-install)
  if (isInstalled) {
    return null;
  }

  const handleClick = async () => {
    if (isInstallable) {
      const accepted = await install();
      if (accepted && onAfterAction) {
        onAfterAction();
      }
      return;
    }
    setShowGuideModal(true);
  };

  return (
    <>
      {variant === 'header' ? (
        <button
          type="button"
          onClick={handleClick}
          title="Install Aplikasi ke Layar Utama HP"
          className="flex items-center gap-1.5 px-2.5 sm:px-3 py-2 text-xs font-bold text-emerald-800 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200/90 rounded-xl transition-all shadow-2xs active:scale-[0.98] whitespace-nowrap cursor-pointer"
        >
          <Download className="w-3.5 h-3.5 text-emerald-600" />
          <span className="hidden sm:inline">Install Aplikasi</span>
          <span className="sm:hidden">Install</span>
        </button>
      ) : (
        <button
          type="button"
          onClick={handleClick}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl bg-emerald-50/70 hover:bg-emerald-100/80 text-emerald-950 transition-colors text-left font-semibold cursor-pointer border border-emerald-200/80"
        >
          <div className="w-8 h-8 rounded-lg bg-emerald-600 text-white flex items-center justify-center shrink-0 shadow-2xs">
            <Smartphone className="w-4 h-4" />
          </div>
          <div className="min-w-0 flex-1">
            <span className="block text-xs font-bold text-emerald-950">
              Install Aplikasi di HP (Add to Home Screen)
            </span>
            <span className="block text-[10px] text-emerald-700 truncate">
              {isInstallable
                ? 'Ketuk untuk langsung memasang aplikasi ke layar utama'
                : 'Pasang ke layar utama Android / iPhone tanpa App Store'}
            </span>
          </div>
        </button>
      )}

      {showGuideModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowGuideModal(false)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-md rounded-3xl bg-[#FFFDF9] border border-[#EDE8DF] p-5 sm:p-6 shadow-2xl space-y-4 text-slate-800"
          >
            <div className="flex items-start justify-between gap-3 border-b border-[#EDE8DF] pb-3">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-sm sm:text-base font-bold text-slate-900">
                    Pasang ke Layar Utama HP
                  </h3>
                  <p className="text-[11px] text-slate-500">
                    Akses cepat layar penuh seperti aplikasi native
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                aria-label="Tutup panduan install"
                className="w-7 h-7 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isInIframe && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <strong>Catatan Pratinjau:</strong> Buka tautan aplikasi langsung di browser{' '}
                <strong>Chrome (Android)</strong> atau <strong>Safari (iPhone)</strong> agar tombol
                instalasi otomatis muncul di perangkat Anda.
              </div>
            )}

            {isIOS ? (
              <div className="space-y-2.5 bg-[#FAF8F5] p-4 rounded-2xl border border-[#EDE8DF] text-xs">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <Share className="w-4 h-4 text-sky-600" />
                  <span>Langkah Install di iPhone / iPad (Safari):</span>
                </p>
                <ol className="space-y-2 text-slate-600 list-decimal list-inside">
                  <li>
                    Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah browser Safari.
                  </li>
                  <li>
                    Gulir ke bawah lalu pilih{' '}
                    <strong className="inline-flex items-center gap-1 text-slate-900">
                      <PlusSquare className="w-3.5 h-3.5 text-emerald-600 inline" /> Tambah ke Layar
                      Utama (Add to Home Screen)
                    </strong>
                    .
                  </li>
                  <li>
                    Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-3 text-xs">
                <div className="space-y-2 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EDE8DF]">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <MoreVertical className="w-4 h-4 text-emerald-600" />
                    <span>Android (Google Chrome / Edge):</span>
                  </p>
                  <ol className="space-y-1.5 text-slate-600 list-decimal list-inside">
                    <li>
                      Ketuk ikon menu <strong>titik tiga (⋮)</strong> di pojok kanan atas Chrome.
                    </li>
                    <li>
                      Pilih <strong>Instal aplikasi</strong> atau{' '}
                      <strong>Tambahkan ke Layar utama</strong>.
                    </li>
                    <li>
                      Konfirmasi dengan menekan <strong>Instal</strong>.
                    </li>
                  </ol>
                </div>

                <div className="space-y-2 bg-[#FAF8F5] p-3.5 rounded-2xl border border-[#EDE8DF]">
                  <p className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Share className="w-4 h-4 text-sky-600" />
                    <span>iPhone / iPad (Safari):</span>
                  </p>
                  <ol className="space-y-1.5 text-slate-600 list-decimal list-inside">
                    <li>
                      Ketuk tombol <strong>Bagikan (Share)</strong> di Safari.
                    </li>
                    <li>
                      Pilih <strong>Tambah ke Layar Utama (Add to Home Screen)</strong>.
                    </li>
                  </ol>
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mendukung mode layar penuh & akses offline
              </span>
              <button
                type="button"
                onClick={() => setShowGuideModal(false)}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold cursor-pointer transition-colors"
              >
                Mengerti
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
