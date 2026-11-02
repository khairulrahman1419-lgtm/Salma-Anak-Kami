import React, { useState, useEffect } from 'react';
import {
  Sparkles,
  BookOpen,
  ScrollText,
  Smartphone,
  Quote,
  Share,
  PlusSquare,
  MoreVertical,
  X,
  CheckCircle2,
  Edit2,
  Save,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';
import type { ParentingQuoteItem } from '../types/index.ts';
import { INITIAL_PARENTING_QUOTES } from '../utils/initialFallback.ts';

interface ParentingQuoteBarProps {
  quotes?: ParentingQuoteItem[];
  onUpdateQuote?: (updated: ParentingQuoteItem) => void;
}

function getAutomaticDailyQuoteIndex(totalQuotes: number): number {
  const safeCount = Math.max(1, totalQuotes);
  const jsDay = new Date().getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
  const zeroBasedDay = jsDay === 0 ? 6 : jsDay - 1;
  return zeroBasedDay % safeCount;
}

export const ParentingQuoteBar: React.FC<ParentingQuoteBarProps> = ({
  quotes,
  onUpdateQuote,
}) => {
  const activeQuotes =
    quotes && quotes.length > 0
      ? [...quotes].sort((a, b) => a.orderIndex - b.orderIndex)
      : INITIAL_PARENTING_QUOTES;

  const [dailyIdx, setDailyIdx] = useState<number>(() =>
    getAutomaticDailyQuoteIndex(activeQuotes.length)
  );
  const [mode, setMode] = useState<'marquee' | 'read'>('marquee');
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const [isEditingQuote, setIsEditingQuote] = useState(false);
  const [draftQuoteText, setDraftQuoteText] = useState('');

  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();

  // Secara otomatis memperbarui kutipan ketika pergantian hari tanpa menampilkan nama hari
  useEffect(() => {
    const syncDailyIndex = () => {
      const nextIdx = getAutomaticDailyQuoteIndex(activeQuotes.length);
      setDailyIdx((prev) => (prev !== nextIdx ? nextIdx : prev));
    };

    syncDailyIndex();
    const intervalId = setInterval(syncDailyIndex, 60_000);
    document.addEventListener('visibilitychange', syncDailyIndex);

    return () => {
      clearInterval(intervalId);
      document.removeEventListener('visibilitychange', syncDailyIndex);
    };
  }, [activeQuotes.length]);

  const currentQuoteObj =
    activeQuotes[dailyIdx] || activeQuotes[0] || INITIAL_PARENTING_QUOTES[0];
  const currentQuote = currentQuoteObj.text;

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowInstallGuide(true);
  };

  const handleStartEdit = () => {
    setDraftQuoteText(currentQuoteObj.text);
    setIsEditingQuote(true);
  };

  const handleSaveEditedQuote = () => {
    const clean = draftQuoteText.trim();
    if (!clean) return;
    if (onUpdateQuote) {
      onUpdateQuote({
        ...currentQuoteObj,
        text: clean.slice(0, 600),
        updatedAt: new Date().toISOString(),
      });
    }
    setIsEditingQuote(false);
  };

  return (
    <>
      <section
        aria-label="Mutiara Parenting Harian dan Pasang Aplikasi"
        className="bg-gradient-to-r from-[#0F5249] via-[#115E59] to-[#0F5249] text-white rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-sm border border-emerald-800/60 space-y-2"
      >
        {/* Top Header Row inside Bar (Tanpa Label Hari) */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-xs font-extrabold tracking-tight text-white">
              Mutiara Parenting
            </span>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            {/* Tombol Pasang di Layar: Otomatis hilang setelah aplikasi di-install di HP */}
            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                title="Pasang aplikasi ke Layar Utama HP"
                className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-300 hover:bg-amber-200 text-slate-900 font-bold text-[10px] sm:text-[11px] transition-colors cursor-pointer shadow-2xs"
              >
                <Smartphone className="w-3 h-3 shrink-0" />
                <span>Pasang di Layar</span>
              </button>
            )}

            {/* Toggle Pesan Berjalan vs Mode Baca */}
            <button
              type="button"
              onClick={() => {
                setIsEditingQuote(false);
                setMode((prev) => (prev === 'marquee' ? 'read' : 'marquee'));
              }}
              className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-white/12 hover:bg-white/20 border border-white/20 text-emerald-50 font-semibold text-[10px] sm:text-[11px] transition-colors cursor-pointer"
            >
              {mode === 'marquee' ? (
                <>
                  <BookOpen className="w-3 h-3 text-amber-200" />
                  <span>Mode Baca</span>
                </>
              ) : (
                <>
                  <ScrollText className="w-3 h-3 text-amber-200" />
                  <span>Pesan Berjalan</span>
                </>
              )}
            </button>
          </div>
        </div>

        {/* Quote Content Row (Berjalan otomatis setiap hari tanpa menampilkan nama hari) */}
        {mode === 'marquee' ? (
          <div className="flex items-center gap-2.5 bg-black/15 rounded-xl px-3 py-1.5 border border-white/10">
            <Quote className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <div
              onClick={() => setMode('read')}
              title="Ketuk untuk membuka Mode Baca"
              className="flex-1 overflow-hidden cursor-pointer"
            >
              <div className="animate-marquee-quote text-xs text-emerald-50/95 font-medium">
                <span className="pr-16">“{currentQuote}”</span>
                <span className="pr-16" aria-hidden="true">
                  “{currentQuote}”
                </span>
              </div>
            </div>
          </div>
        ) : (
          <div className="bg-black/15 rounded-xl p-3.5 sm:p-4 border border-white/10 animate-in fade-in duration-150 space-y-2.5">
            {isEditingQuote ? (
              <div className="space-y-2">
                <textarea
                  rows={3}
                  maxLength={600}
                  value={draftQuoteText}
                  onChange={(e) => setDraftQuoteText(e.target.value)}
                  className="w-full rounded-xl bg-white/95 text-slate-900 text-xs sm:text-sm p-2.5 border border-emerald-300 focus:outline-none focus:ring-2 focus:ring-amber-300 resize-none"
                  placeholder="Tulis kutipan Mutiara Parenting keluarga..."
                />
                <div className="flex items-center justify-end gap-2">
                  <button
                    type="button"
                    onClick={() => setIsEditingQuote(false)}
                    className="px-3 py-1 rounded-lg text-[11px] font-semibold text-emerald-100 hover:bg-white/10 cursor-pointer"
                  >
                    Batal
                  </button>
                  <button
                    type="button"
                    onClick={handleSaveEditedQuote}
                    className="inline-flex items-center gap-1 px-3 py-1 rounded-lg bg-amber-300 hover:bg-amber-200 text-slate-900 text-[11px] font-bold cursor-pointer"
                  >
                    <Save className="w-3 h-3" />
                    <span>Simpan &amp; Sinkronkan</span>
                  </button>
                </div>
              </div>
            ) : (
              <div className="flex items-start justify-between gap-2.5">
                <div className="flex items-start gap-2.5 flex-1">
                  <Quote className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
                  <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium">
                    “{currentQuote}”
                  </p>
                </div>
                {onUpdateQuote && (
                  <button
                    type="button"
                    onClick={handleStartEdit}
                    title="Ubah kutipan Mutiara Parenting (tersinkronisasi ke HP pasangan)"
                    className="shrink-0 inline-flex items-center gap-1 px-2 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-[10px] font-semibold text-emerald-100 transition-colors cursor-pointer"
                  >
                    <Edit2 className="w-3 h-3 text-amber-200" />
                    <span>Ubah</span>
                  </button>
                )}
              </div>
            )}
          </div>
        )}
      </section>

      {/* Panduan Pasang ke Layar Utama HP */}
      {showInstallGuide && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/60 backdrop-blur-xs p-4 animate-in fade-in duration-200"
          onClick={() => setShowInstallGuide(false)}
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
                    Tombol pasang akan otomatis hilang setelah aplikasi terinstal
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                aria-label="Tutup panduan install"
                className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {isInIframe && (
              <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200 text-[11px] text-amber-900 leading-relaxed">
                <strong>Catatan Pratinjau:</strong> Buka tautan aplikasi langsung di browser{' '}
                <strong>Chrome (Android)</strong> atau <strong>Safari (iPhone)</strong> agar tombol
                instalasi otomatis muncul di HP Anda.
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
                    Ketuk ikon <strong>Bagikan (Share)</strong> di bilah bawah Safari.
                  </li>
                  <li>
                    Pilih{' '}
                    <strong className="inline-flex items-center gap-1 text-slate-900">
                      <PlusSquare className="w-3.5 h-3.5 text-emerald-600 inline" /> Tambah ke Layar
                      Utama
                    </strong>
                    .
                  </li>
                  <li>
                    Ketuk <strong>Tambah (Add)</strong> di pojok kanan atas.
                  </li>
                </ol>
              </div>
            ) : (
              <div className="space-y-2.5 bg-[#FAF8F5] p-4 rounded-2xl border border-[#EDE8DF] text-xs">
                <p className="font-bold text-slate-900 flex items-center gap-1.5">
                  <MoreVertical className="w-4 h-4 text-emerald-600" />
                  <span>Android (Google Chrome) &amp; iPhone (Safari):</span>
                </p>
                <ol className="space-y-1.5 text-slate-600 list-decimal list-inside">
                  <li>
                    Di Chrome Android: ketuk menu <strong>titik tiga (⋮)</strong> lalu pilih{' '}
                    <strong>Instal aplikasi / Tambahkan ke Layar utama</strong>.
                  </li>
                  <li>
                    Di Safari iPhone: ketuk <strong>Bagikan (Share)</strong> lalu pilih{' '}
                    <strong>Add to Home Screen</strong>.
                  </li>
                </ol>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
              <span className="text-[11px] text-emerald-700 font-medium flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                Mutiara Parenting tersinkronisasi &amp; tampil otomatis setiap hari
              </span>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
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
