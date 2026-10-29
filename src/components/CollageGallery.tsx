import React, { useState } from 'react';
import {
  LayoutGrid,
  Layers,
  Plus,
  Video,
  CheckCircle2,
  Download,
  Edit2,
} from 'lucide-react';
import type { MomentItem } from '../types/index.ts';
import {
  calculateAge,
  CATEGORY_LABELS,
  formatDateIndo,
  formatHeight,
  formatWeight,
} from '../utils/growth.ts';
import { Clothespin } from './Clothespin.tsx';

interface CollageGalleryProps {
  moments: MomentItem[];
  birthDate: string;
  onSelectMoment: (moment: MomentItem) => void;
  onEditMoment: (moment: MomentItem) => void;
  onDownloadMoment: (moment: MomentItem) => void;
  onOpenUpload: () => void;
}

const CATEGORY_BOARDS: {
  id: string;
  label: string;
  icon: string;
  description: string;
  color: string;
}[] = [
  {
    id: 'all',
    label: 'Semua Momen',
    icon: '🌟',
    description: 'Kolase scrapbook lengkap seluruh memori berharga',
    color: 'bg-amber-100 text-amber-900 border-amber-200',
  },
  {
    id: 'milestone_fisik',
    label: 'Langkah & Motorik',
    icon: '👣',
    description: 'Tahapan fisik, berjalan, merangkak, dan gerak aktif',
    color: 'bg-emerald-100 text-emerald-900 border-emerald-200',
  },
  {
    id: 'kata_pertama',
    label: 'Kata & Bahasa',
    icon: '🗣️',
    description: 'Kata pertama, bicara, tiru suara, dan membaca buku',
    color: 'bg-sky-100 text-sky-900 border-sky-200',
  },
  {
    id: 'bermain',
    label: 'Bermain Ceria',
    icon: '🎈',
    description: 'Aktivitas bermain, taman kota, gelembung & tawa',
    color: 'bg-rose-100 text-rose-900 border-rose-200',
  },
  {
    id: 'makan_mpasi',
    label: 'MPASI & Nutrisi',
    icon: '🥑',
    description: 'Menu perdana, lahap belajar makan, dan rasa baru',
    color: 'bg-lime-100 text-lime-900 border-lime-200',
  },
  {
    id: 'momen_lucu',
    label: 'Tawa & Menggemaskan',
    icon: '🧸',
    description: 'Tidur lelap, ekspresi polos, dan kepolosan si kecil',
    color: 'bg-purple-100 text-purple-900 border-purple-200',
  },
];

const ROTATIONS = [
  '-rotate-1 sm:-rotate-2',
  'rotate-1 sm:rotate-2',
  '-rotate-1',
  'rotate-1',
  '-rotate-2 sm:-rotate-1',
  'rotate-2 sm:rotate-1',
];

export const CollageGallery: React.FC<CollageGalleryProps> = ({
  moments,
  birthDate,
  onSelectMoment,
  onEditMoment,
  onDownloadMoment,
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
                Ketuk foto untuk kisah lengkap, atau gunakan tombol Edit &amp; Unduh di setiap foto
              </p>
            </div>
          </div>

          {/* Toggle Collage vs Grid */}
          <div className="flex items-center gap-1.5 self-start sm:self-auto bg-[#FAF8F5] p-1 rounded-xl border border-slate-200">
            <button
              type="button"
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
              type="button"
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

        {/* Category Boards Filter */}
        <div className="pt-2 border-t border-[#EDE8DF] flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar">
          {CATEGORY_BOARDS.map((board) => {
            const count = moments.filter((m) =>
              board.id === 'all' ? true : m.category === board.id
            ).length;

            const isSelected = selectedCategory === board.id;

            return (
              <button
                key={board.id}
                type="button"
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
            type="button"
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
          <div className="mb-6 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="inline-flex items-center gap-2 px-3 py-1 bg-white/90 backdrop-blur-xs rounded-full border border-amber-200/90 shadow-2xs text-xs text-amber-900 font-bold self-start">
              <span>{activeBoardMeta.icon}</span>
              <span>Koleksi: {activeBoardMeta.label}</span>
              <span className="text-amber-500">·</span>
              <span className="font-normal text-slate-600">
                {filteredMoments.length} foto berharga
              </span>
            </div>

            <span className="text-[11px] text-slate-500 italic">
              Ketuk foto polaroid untuk membaca cerita, edit, atau mengunduh ulang
            </span>
          </div>

          <div className="columns-1 sm:columns-2 lg:columns-3 gap-6 space-y-8 pt-2">
            {filteredMoments.map((item, idx) => {
              const ageAtMoment = calculateAge(birthDate, item.date);
              const rotation = ROTATIONS[idx % ROTATIONS.length];
              const pinVariant =
                idx % 3 === 0 ? 'wood' : idx % 3 === 1 ? 'mint' : 'coral';

              return (
                <div
                  key={item.id}
                  onClick={() => onSelectMoment(item)}
                  className={`group relative break-inside-avoid pt-3 transform transition-all duration-300 hover:scale-[1.02] hover:rotate-0 hover:z-30 cursor-pointer ${rotation}`}
                >
                  {/* Top Clothespin */}
                  <Clothespin
                    variant={pinVariant}
                    className="absolute top-0 left-1/2 -translate-x-1/2"
                  />

                  {/* POLAROID FRAME */}
                  <div className="bg-white p-3.5 pb-4 rounded-3xl shadow-md group-hover:shadow-xl border border-slate-200/80 transition-shadow">
                    <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 border border-slate-100">
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

                      {item.weightKg && (
                        <div className="absolute top-2.5 right-2.5 bg-slate-900/85 backdrop-blur-xs text-white text-[10px] font-bold px-2.5 py-0.5 rounded-full">
                          {item.weightKg} kg
                        </div>
                      )}

                      {item.mediaType === 'video' && (
                        <div className="absolute top-2.5 left-2.5 w-7 h-7 rounded-lg bg-black/60 text-white flex items-center justify-center backdrop-blur-xs shadow-xs">
                          <Video className="w-3.5 h-3.5" />
                        </div>
                      )}

                      {item.googleDriveSynced && (
                        <div
                          title="Tersimpan di Google Drive"
                          className="absolute bottom-2 right-2 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs"
                        >
                          <CheckCircle2 className="w-3 h-3" />
                        </div>
                      )}
                    </div>

                    {/* Polaroid Caption & Direct Edit / Download Actions */}
                    <div className="pt-3 px-1 space-y-1.5">
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span className="font-serif italic">{formatDateIndo(item.date)}</span>
                        <span className="font-semibold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded-md">
                          Usia {ageAtMoment.compactLabel}
                        </span>
                      </div>

                      <div className="flex items-start justify-between gap-2">
                        <h4 className="text-xs sm:text-sm font-bold text-slate-800 leading-snug line-clamp-1 group-hover:text-emerald-700 transition-colors flex-1">
                          {item.title}
                        </h4>

                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onEditMoment(item);
                            }}
                            title="Edit foto atau catatan momen"
                            aria-label="Edit momen"
                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              onDownloadMoment(item);
                            }}
                            title="Unduh file foto / video"
                            aria-label="Unduh foto"
                            className="w-7 h-7 rounded-lg text-slate-500 hover:text-teal-700 hover:bg-teal-50 flex items-center justify-center transition-colors cursor-pointer"
                          >
                            <Download className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      <p className="text-[11px] text-slate-600 line-clamp-2 italic font-serif leading-relaxed">
                        "{item.notes}"
                      </p>

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
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
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

                  <div className="pt-2 border-t border-slate-100 flex items-center justify-between">
                    <span className="text-[11px] font-semibold text-emerald-600">
                      Buka Detail &rarr;
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onEditMoment(item);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 text-[11px] font-semibold cursor-pointer"
                      >
                        <Edit2 className="w-3 h-3" />
                        <span>Edit</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          onDownloadMoment(item);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-100 hover:bg-teal-50 text-slate-700 hover:text-teal-700 text-[11px] font-semibold cursor-pointer"
                      >
                        <Download className="w-3 h-3" />
                        <span>Unduh</span>
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
