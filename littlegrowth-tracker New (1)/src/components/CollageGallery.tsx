import React, { useState } from 'react';
import {
  Sparkles,
  Camera,
  Calendar,
  Scale,
  Ruler,
  LayoutGrid,
  Layers,
  Heart,
  Star,
  Plus,
  Video,
  CheckCircle2,
  FolderHeart,
  Pin,
} from 'lucide-react';
import type { MomentCategory, MomentItem } from '../types/index.ts';
import { calculateAge, CATEGORY_LABELS, formatDateIndo, formatHeight, formatWeight } from '../utils/growth.ts';

interface CollageGalleryProps {
  moments: MomentItem[];
  birthDate: string;
  onSelectMoment: (moment: MomentItem) => void;
  onOpenUpload: () => void;
}

const CATEGORY_BOARDS: { id: string; label: string; icon: string; description: string; color: string }[] = [
  { id: 'all', label: 'Semua Momen', icon: '🌟', description: 'Kolase scrapbook lengkap seluruh memori berharga', color: 'bg-amber-100 text-amber-900 border-amber-200' },
  { id: 'milestone_fisik', label: 'Langkah & Motorik', icon: '👣', description: 'Tahapan fisik, berjalan, merangkak, dan gerak aktif', color: 'bg-emerald-100 text-emerald-900 border-emerald-200' },
  { id: 'kata_pertama', label: 'Kata & Bahasa', icon: '🗣️', description: 'Kata pertama, bicara, tiru suara, dan membaca buku', color: 'bg-sky-100 text-sky-900 border-sky-200' },
  { id: 'bermain', label: 'Bermain Ceria', icon: '🎈', description: 'Aktivitas bermain, taman kota, gelembung & tawa', color: 'bg-rose-100 text-rose-900 border-rose-200' },
  { id: 'makan_mpasi', label: 'MPASI & Nutrisi', icon: '🥑', description: 'Menu perdana, lahap belajar makan, dan rasa baru', color: 'bg-lime-100 text-lime-900 border-lime-200' },
  { id: 'momen_lucu', label: 'Tawa & Menggemaskan', icon: '🧸', description: 'Tidur lelap, ekspresi polos, dan kepolosan si kecil', color: 'bg-purple-100 text-purple-900 border-purple-200' },
];

// Aesthetic rotation offsets for Pinterest polaroid look
const ROTATIONS = [
  '-rotate-2 sm:-rotate-3',
  'rotate-2 sm:rotate-3',
  '-rotate-1 sm:-rotate-2',
  'rotate-1 sm:rotate-2',
  '-rotate-3 sm:-rotate-2',
  'rotate-2 sm:rotate-1',
];

// Scrapbook washi tape sticker accents
const WASHI_TAPES = [
  'bg-amber-200/90 text-amber-900 border-amber-300/80 -rotate-2',
  'bg-emerald-200/90 text-emerald-900 border-emerald-300/80 rotate-2',
  'bg-sky-200/90 text-sky-900 border-sky-300/80 -rotate-1',
  'bg-rose-200/90 text-rose-900 border-rose-300/80 rotate-3',
  'bg-teal-200/90 text-teal-900 border-teal-300/80 -rotate-3',
];

export const CollageGallery: React.FC<CollageGalleryProps> = ({
  moments,
  birthDate,
  onSelectMoment,
  onOpenUpload,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [displayMode, setDisplayMode] = useState<'collage' | 'grid'>('collage');

  const filteredMoments = moments.filter((m) => {
    if (selectedCategory === 'all') return true;
    return m.category === selectedCategory;
  });

  const activeBoardMeta =
    CATEGORY_BOARDS.find((b) => b.id === selectedCategory) || CATEGORY_BOARDS[0];

  return (
    <div className="space-y-5">
      {/* Category Albums & Scrapbook Switcher Bar */}
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-4 sm:p-5 shadow-xs space-y-3.5">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-base shadow-xs">
              ✨
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-slate-900 flex items-center gap-2">
                <span>Kolase Album per Kategori</span>
                <span className="text-[10px] font-semibold text-amber-800 bg-amber-100/80 px-2 py-0.5 rounded-full">
                  Pinterest Scrapbook
                </span>
              </h2>
              <p className="text-[11px] text-slate-500">
                Tampilan polaroid estetik — ketuk foto untuk membuka kisah lengkap & milestone
              </p>
            </div>
          </div>

          {/* Toggle Collage vs Grid */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#FAF8F5] p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => setDisplayMode('collage')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                displayMode === 'collage'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Layers className="w-3.5 h-3.5 text-amber-300" />
              <span>Kolase Estetik</span>
            </button>
            <button
              onClick={() => setDisplayMode('grid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors cursor-pointer ${
                displayMode === 'grid'
                  ? 'bg-slate-900 text-white shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <LayoutGrid className="w-3.5 h-3.5" />
              <span>Grid Rapi</span>
            </button>
          </div>
        </div>

        {/* Category Boards Pills (Scrapbook Albums) */}
        <div className="pt-2 border-t border-[#EDE8DF] flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORY_BOARDS.map((board) => {
            const count = moments.filter((m) =>
              board.id === 'all' ? true : m.category === board.id
            ).length;

            const isSelected = selectedCategory === board.id;

            return (
              <button
                key={board.id}
                onClick={() => setSelectedCategory(board.id)}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium whitespace-nowrap transition-all cursor-pointer shrink-0 ${
                  isSelected
                    ? 'bg-emerald-700 text-white shadow-xs font-semibold scale-102'
                    : 'bg-[#FAF8F5] text-slate-700 hover:bg-slate-200/60 border border-slate-200/60'
                }`}
              >
                <span>{board.icon}</span>
                <span>{board.label}</span>
                <span
                  className={`text-[10px] px-1.5 py-0.2 rounded-full ${
                    isSelected ? 'bg-white/25 text-white' : 'bg-slate-200 text-slate-600'
                  }`}
                >
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Collage Content Area */}
      {filteredMoments.length === 0 ? (
        <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-10 text-center space-y-3">
          <div className="w-12 h-12 mx-auto rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center text-xl">
            📷
          </div>
          <h3 className="text-sm font-bold text-slate-800">
            Belum Ada Foto di Album "{activeBoardMeta.label}"
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mx-auto">
            {activeBoardMeta.description}. Mulai abadikan momen si kecil sekarang!
          </p>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors cursor-pointer"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-300" />
            <span>Upload Foto ke Kategori Ini</span>
          </button>
        </div>
      ) : displayMode === 'collage' ? (
        /* PINTEREST SCRAPBOOK COLLAGE LAYOUT */
        <div className="relative bg-gradient-to-br from-[#FAF7F2] via-[#FDFBF7] to-[#F5EFE6] rounded-3xl border border-[#EDE8DF] p-4 sm:p-7 shadow-sm overflow-hidden">
          {/* Aesthetic background motifs reminiscent of scrapbook paper */}
          <div className="absolute top-4 right-6 text-amber-300/40 select-none text-2xl font-serif pointer-events-none">
            ✦ ✦
          </div>
          <div className="absolute bottom-4 left-6 text-emerald-300/40 select-none text-2xl font-serif pointer-events-none">
            ❀
          </div>

          {/* Collage Header Stamp */}
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/90 backdrop-blur-xs rounded-full border border-amber-200/90 shadow-2xs text-xs text-amber-900 font-bold self-start">
              <span>{activeBoardMeta.icon}</span>
              <span>Koleksi: {activeBoardMeta.label}</span>
              <span className="text-amber-500">·</span>
              <span className="font-normal text-slate-600">{filteredMoments.length} foto berharga</span>
            </div>

            <span className="text-[11px] text-slate-500 italic">
              💡 Ketuk foto polaroid untuk membaca cerita & milestone
            </span>
          </div>

          {/* Collage Masonry / Scrapbook Grid (Columns adapt gracefully on mobile & desktop) */}
          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-6">
            {filteredMoments.map((item, idx) => {
              const ageAtMoment = calculateAge(birthDate, item.date);
              const rotation = ROTATIONS[idx % ROTATIONS.length];
              const washi = WASHI_TAPES[idx % WASHI_TAPES.length];
              const isHighlight = idx === 0 && selectedCategory !== 'all';

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectMoment(item)}
                  className={`group relative break-inside-avoid transform transition-all duration-300 hover:scale-[1.03] hover:rotate-0 hover:z-30 cursor-pointer ${rotation}`}
                >
                  {/* POLAROID FRAME (Inspired by Pinterest Scrapbook) */}
                  <div className="bg-white p-3.5 pb-5 rounded-2xl shadow-md group-hover:shadow-2xl border border-slate-200/80 transition-shadow">
                    {/* Washi Tape Accent Sticker at the top corner */}
                    <div
                      className={`absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 text-[9px] font-bold uppercase tracking-wider rounded-xs shadow-2xs select-none border z-20 ${washi}`}
                    >
                      {item.category.replace('_', ' ')}
                    </div>

                    {/* Cute sticker star or pin accent */}
                    {idx % 3 === 0 && (
                      <div className="absolute -top-2 -right-1 text-amber-400 select-none drop-shadow-xs z-20 text-base">
                        ★
                      </div>
                    )}
                    {idx % 3 === 1 && (
                      <div className="absolute -top-2 -left-1 text-rose-400 select-none drop-shadow-xs z-20 text-xs font-bold">
                        ❤️
                      </div>
                    )}
                    {idx % 3 === 2 && (
                      <div className="absolute -top-2 -right-1 text-sky-400 select-none drop-shadow-xs z-20 text-xs">
                        ✦
                      </div>
                    )}

                    {/* Polaroid Photo Image (Aspect ratio adapted for scrapbook) */}
                    <div className="relative aspect-[4/3] rounded-xl overflow-hidden bg-slate-100 border border-slate-100">
                      <img
                        src={item.mediaUrl}
                        alt={item.title}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover group-hover:brightness-105 group-hover:scale-102 transition-all duration-300"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src =
                            'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="%23f1f5f9"><rect width="400" height="300" fill="%23f8fafc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8">Foto Momen</text></svg>';
                        }}
                      />

                      {/* Video Indicator */}
                      {item.mediaType === 'video' && (
                        <div className="absolute top-2 right-2 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center backdrop-blur-xs shadow-xs">
                          <Video className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {/* Google Drive Synced Badge */}
                      {item.googleDriveSynced && (
                        <div
                          title="Tersimpan di Google Drive"
                          className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}

                      {/* Hover action cue overlay */}
                      <div className="absolute inset-0 bg-slate-900/25 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                        <span className="text-[11px] font-bold text-white bg-slate-900/80 px-3 py-1 rounded-full backdrop-blur-xs shadow-md">
                          Buka Kisah &rarr;
                        </span>
                      </div>
                    </div>

                    {/* Polaroid Caption Area */}
                    <div className="pt-3 px-1 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-serif italic">{formatDateIndo(item.date)}</span>
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Usia {ageAtMoment.compactLabel}
                        </span>
                      </div>

                      <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug line-clamp-1 group-hover:text-emerald-700 transition-colors">
                        {item.title}
                      </h4>

                      <p className="text-[11px] text-slate-600 line-clamp-2 italic font-serif leading-relaxed">
                        "{item.notes}"
                      </p>

                      {/* Quick Growth badge if measured */}
                      {(item.weightKg || item.heightCm) && (
                        <div className="pt-2 flex items-center gap-2 text-[10px] text-slate-600 font-medium border-t border-dashed border-slate-200">
                          {item.weightKg && <span>⚖️ {formatWeight(item.weightKg)}</span>}
                          {item.heightCm && <span>📏 {formatHeight(item.heightCm)}</span>}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* STANDARD CLEAN GRID DISPLAY */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredMoments.map((item) => {
            const ageAtMoment = calculateAge(birthDate, item.date);
            const categoryMeta = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.lainnya;

            return (
              <div
                key={item.id}
                onClick={() => onSelectMoment(item)}
                className="group bg-[#FFFDF9] rounded-2xl border border-[#EDE8DF] hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
              >
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                  />
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/95 text-slate-800 shadow-xs">
                      {categoryMeta.label}
                    </span>
                    {item.googleDriveSynced && (
                      <span className="w-6 h-6 rounded-md bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                        <CheckCircle2 className="w-3.5 h-3.5" />
                      </span>
                    )}
                  </div>
                </div>
                <div className="p-4 flex-1 flex flex-col justify-between space-y-2">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <span>{formatDateIndo(item.date)}</span>
                      <span>·</span>
                      <span className="font-semibold text-slate-800">{ageAtMoment.label}</span>
                    </div>
                    <h3 className="text-sm font-bold text-slate-900 group-hover:text-emerald-700">
                      {item.title}
                    </h3>
                    <p className="text-xs text-slate-600 line-clamp-2">"{item.notes}"</p>
                  </div>
                  <span className="text-[11px] font-semibold text-emerald-600">
                    Buka Detail &rarr;
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
