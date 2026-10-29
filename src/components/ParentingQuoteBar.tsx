import React, { useState } from 'react';
import {
  Sparkles,
  BookOpen,
  ScrollText,
  Smartphone,
  ChevronLeft,
  ChevronRight,
  Quote,
  Share,
  PlusSquare,
  MoreVertical,
  X,
  CheckCircle2,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall.ts';

interface DailyQuoteItem {
  dayIndex: number; // 0 = Senin ... 6 = Minggu
  shortDay: string;
  fullDay: string;
  quote: string;
}

const WEEKLY_PARENTING_QUOTES: DailyQuoteItem[] = [
  {
    dayIndex: 0,
    shortDay: 'Sen',
    fullDay: 'Senin',
    quote:
      'Kehadiran seorang anak adalah anugerah terindah dari Tuhan yang membawa rezeki serta kebahagiaan yang tidak ternilai harganya ke dalam rumah tangga.',
  },
  {
    dayIndex: 1,
    shortDay: 'Sel',
    fullDay: 'Selasa',
    quote:
      'Setiap lelah dalam mengurus dan mendidik anak bernilai ibadah di sisi-Nya, karena kesabaran orang tua adalah ladang pahala yang luar biasa.',
  },
  {
    dayIndex: 2,
    shortDay: 'Rab',
    fullDay: 'Rabu',
    quote:
      'Tetaplah semangat dan ikhlas dalam merawat buah hati, sebab setiap keringat dan pengorbanan hari ini akan menjadi investasi kebaikan di masa depan.',
  },
  {
    dayIndex: 3,
    shortDay: 'Kam',
    fullDay: 'Kamis',
    quote:
      'Menemani tumbuh kembang anak dengan penuh cinta kasih bukan sekadar tugas, melainkan bentuk syukur atas amanah mulia yang dipercayakan kepada kita.',
  },
  {
    dayIndex: 4,
    shortDay: 'Jum',
    fullDay: 'Jumat',
    quote:
      'Pelukan hangat dan senyuman anak di tengah penatnya hari adalah pengingat bahwa Allah telah menitipkan surga kecil di dalam keluarga kita.',
  },
  {
    dayIndex: 5,
    shortDay: 'Sab',
    fullDay: 'Sabtu',
    quote:
      'Jadikan setiap detik membersamai anak sebagai momen berharga untuk menanamkan kebaikan sekaligus mendekatkan diri kepada Sang Pencipta.',
  },
  {
    dayIndex: 6,
    shortDay: 'Min',
    fullDay: 'Minggu',
    quote:
      'Tidak ada usaha mendidik anak yang sia-sia; setiap doa dan didikan tulus adalah bentuk ketaatan serta ibadah terbaik seorang orang tua.',
  },
];

function getTodayMondayZeroIndex(): number {
  const jsDay = new Date().getDay(); // 0 = Sunday, 1 = Monday ... 6 = Saturday
  return jsDay === 0 ? 6 : jsDay - 1;
}

export const ParentingQuoteBar: React.FC = () => {
  const todayIdx = getTodayMondayZeroIndex();
  const [selectedDayIdx, setSelectedDayIdx] = useState<number>(todayIdx);
  const [mode, setMode] = useState<'marquee' | 'read'>('marquee');
  const [showInstallGuide, setShowInstallGuide] = useState(false);

  const { isInstallable, isInstalled, isIOS, isInIframe, install } = usePWAInstall();

  const currentItem = WEEKLY_PARENTING_QUOTES[selectedDayIdx] || WEEKLY_PARENTING_QUOTES[0];
  const isTodaySelected = selectedDayIdx === todayIdx;

  const handleInstallClick = async () => {
    if (isInstallable) {
      await install();
      return;
    }
    setShowInstallGuide(true);
  };

  const handlePrevDay = () => {
    setSelectedDayIdx((prev) => (prev === 0 ? 6 : prev - 1));
  };

  const handleNextDay = () => {
    setSelectedDayIdx((prev) => (prev === 6 ? 0 : prev + 1));
  };

  return (
    <>
      <section
        aria-label="Mutiara Parenting Mingguan dan Pasang Aplikasi"
        className="bg-gradient-to-r from-[#0F5249] via-[#115E59] to-[#0F5249] text-white rounded-2xl px-3.5 py-2.5 sm:px-4 sm:py-3 shadow-sm border border-emerald-800/60 space-y-2"
      >
        {/* Top Header Row inside Bar */}
        <div className="flex items-center justify-between gap-2 flex-wrap">
          <div className="flex items-center gap-2 min-w-0">
            <Sparkles className="w-3.5 h-3.5 text-amber-300 shrink-0" />
            <span className="text-xs font-extrabold tracking-tight text-white">
              Mutiara Parenting
            </span>
            <span className="text-[10px] font-semibold text-emerald-100/90 bg-white/10 border border-white/15 px-2 py-0.5 rounded-full whitespace-nowrap">
              {currentItem.fullDay} {isTodaySelected ? '· Hari Ini' : `· Hari ke-${selectedDayIdx + 1}`}
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
              onClick={() => setMode((prev) => (prev === 'marquee' ? 'read' : 'marquee'))}
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

        {/* Quote Content Row */}
        {mode === 'marquee' ? (
          <div className="flex items-center gap-2.5 bg-black/15 rounded-xl px-3 py-1.5 border border-white/10">
            <Quote className="w-3.5 h-3.5 text-emerald-300 shrink-0" />
            <div
              onClick={() => setMode('read')}
              title="Ketuk untuk membuka Mode Baca 7 Hari"
              className="flex-1 overflow-hidden cursor-pointer"
            >
              <div className="animate-marquee-quote text-xs text-emerald-50/95 font-medium">
                <span className="pr-14">
                  “{currentItem.quote}” — Renungan {currentItem.fullDay} (Ketuk untuk Mode Baca 7 Hari)
                </span>
                <span className="pr-14" aria-hidden="true">
                  “{currentItem.quote}” — Renungan {currentItem.fullDay} (Ketuk untuk Mode Baca 7 Hari)
                </span>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setMode('read')}
              className="shrink-0 text-[10px] font-bold text-amber-200 hover:text-white bg-white/10 px-2 py-0.5 rounded-md cursor-pointer"
            >
              {currentItem.shortDay}
            </button>
          </div>
        ) : (
          <div className="bg-black/15 rounded-xl p-3 sm:p-3.5 border border-white/10 space-y-3 animate-in fade-in duration-150">
            <div className="flex items-start gap-2.5">
              <Quote className="w-4 h-4 text-amber-300 shrink-0 mt-0.5" />
              <p className="text-xs sm:text-sm text-white/95 leading-relaxed font-medium">
                “{currentItem.quote}”
              </p>
            </div>

            {/* 7-Day Selector Bar (Berulang Setiap Minggu) */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-white/10">
              <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
                {WEEKLY_PARENTING_QUOTES.map((item) => {
                  const active = item.dayIndex === selectedDayIdx;
                  const isToday = item.dayIndex === todayIdx;
                  return (
                    <button
                      key={item.dayIndex}
                      type="button"
                      onClick={() => setSelectedDayIdx(item.dayIndex)}
                      className={`px-2.5 py-1 rounded-lg text-[10px] sm:text-[11px] font-bold transition-all cursor-pointer relative ${
                        active
                          ? 'bg-white text-[#0F5249] shadow-2xs'
                          : 'bg-white/10 text-emerald-100 hover:bg-white/20'
                      }`}
                    >
                      <span>{item.shortDay}</span>
                      {isToday && !active && (
                        <span className="ml-1 inline-block w-1.5 h-1.5 rounded-full bg-amber-300 align-middle" />
                      )}
                    </button>
                  );
                })}
              </div>

              <div className="flex items-center gap-1">
                {!isTodaySelected && (
                  <button
                    type="button"
                    onClick={() => setSelectedDayIdx(todayIdx)}
                    className="px-2 py-1 rounded-lg bg-amber-300/20 hover:bg-amber-300/30 text-amber-200 text-[10px] font-bold cursor-pointer"
                  >
                    Hari Ini
                  </button>
                )}
                <button
                  type="button"
                  onClick={handlePrevDay}
                  aria-label="Hari sebelumnya"
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                >
                  <ChevronLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  type="button"
                  onClick={handleNextDay}
                  aria-label="Hari berikutnya"
                  className="w-7 h-7 rounded-lg bg-white/10 hover:bg-white/20 flex items-center justify-center cursor-pointer"
                >
                  <ChevronRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Panduan Pasang ke Layar Utama HP (Muncul bila browser butuh panduan manual) */}
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
                Mutiara Parenting tetap tampil setiap hari
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
