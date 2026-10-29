import React from 'react';
import {
  Calendar,
  Filter,
  Search,
  Video,
  Image as ImageIcon,
  CheckCircle,
  Clock,
  Sparkles,
  ExternalLink,
  Scale,
  Ruler,
  Plus,
} from 'lucide-react';
import type { FilterOptions, MomentCategory, MomentItem } from '../types/index.ts';
import { calculateAge, CATEGORY_LABELS, formatDateIndo, formatHeight, formatWeight } from '../utils/growth.ts';

interface MomentGalleryProps {
  moments: MomentItem[];
  birthDate: string;
  filter: FilterOptions;
  onFilterChange: (newFilter: FilterOptions) => void;
  onSelectMoment: (moment: MomentItem) => void;
  onOpenUpload: () => void;
}

const CATEGORIES: { id: string; label: string }[] = [
  { id: 'all', label: 'Semua Kategori' },
  { id: 'milestone_fisik', label: 'Milestone Fisik' },
  { id: 'kata_pertama', label: 'Kata & Bahasa' },
  { id: 'momen_lucu', label: 'Momen Lucu' },
  { id: 'bermain', label: 'Bermain' },
  { id: 'makan_mpasi', label: 'MPASI & Nutrisi' },
  { id: 'kesehatan', label: 'Kesehatan' },
];

const AGE_RANGES: { id: string; label: string }[] = [
  { id: 'all', label: 'Semua Usia' },
  { id: '0-6', label: '0 - 6 Bulan' },
  { id: '6-12', label: '6 - 12 Bulan' },
  { id: '12-24', label: '1 - 2 Tahun' },
  { id: '24+', label: '2+ Tahun' },
];

export const MomentGallery: React.FC<MomentGalleryProps> = ({
  moments,
  birthDate,
  filter,
  onFilterChange,
  onSelectMoment,
  onOpenUpload,
}) => {
  return (
    <div className="space-y-6">
      {/* Header and Filter Bar */}
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-5 sm:p-6 shadow-xs space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-lg sm:text-xl font-bold tracking-tight text-slate-900">
              Galeri Momen & Jejak Milestone
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-0.5">
              Dokumentasi foto, video, dan catatan tumbuh kembang buah hati tercinta
            </p>
          </div>

          {/* Quick Search Input */}
          <div className="relative min-w-[220px] max-w-xs">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            <input
              type="text"
              placeholder="Cari momen atau catatan..."
              value={filter.searchQuery}
              onChange={(e) => onFilterChange({ ...filter, searchQuery: e.target.value })}
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition-all text-slate-800 placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Filter Tabs (Interactive Segmented Buttons) */}
        <div className="pt-2 border-t border-[#EDE8DF] flex flex-col md:flex-row md:items-center justify-between gap-3">
          {/* Category Filter */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 max-w-full">
            <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider shrink-0 mr-1 hidden sm:inline">
              Kategori:
            </span>
            {CATEGORIES.map((cat) => (
              <button
                key={cat.id}
                onClick={() => onFilterChange({ ...filter, category: cat.id })}
                className={`px-3 py-1.5 text-xs font-medium rounded-xl whitespace-nowrap transition-colors cursor-pointer shrink-0 ${
                  filter.category === cat.id
                    ? 'bg-slate-900 text-white shadow-xs font-semibold'
                    : 'bg-[#FAF8F5] text-slate-600 hover:text-slate-900 hover:bg-slate-200/60 border border-slate-200/60'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Age Range and Media Type Selectors */}
          <div className="flex items-center gap-2 shrink-0">
            {/* Age Range Selector */}
            <select
              value={filter.ageRange}
              aria-label="Filter Rentang Usia"
              onChange={(e) => onFilterChange({ ...filter, ageRange: e.target.value })}
              className="px-2.5 py-1.5 text-xs font-medium rounded-xl bg-[#FAF8F5] text-slate-700 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-emerald-500/20 cursor-pointer"
            >
              {AGE_RANGES.map((age) => (
                <option key={age.id} value={age.id}>
                  {age.label}
                </option>
              ))}
            </select>

            {/* Media Type Toggle */}
            <div className="flex items-center bg-[#FAF8F5] p-0.5 rounded-xl border border-slate-200">
              <button
                onClick={() => onFilterChange({ ...filter, mediaType: 'all' })}
                aria-label="Tampilkan semua media"
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filter.mediaType === 'all' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                Semua
              </button>
              <button
                onClick={() => onFilterChange({ ...filter, mediaType: 'image' })}
                aria-label="Tampilkan foto saja"
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filter.mediaType === 'image' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                Foto
              </button>
              <button
                onClick={() => onFilterChange({ ...filter, mediaType: 'video' })}
                aria-label="Tampilkan video saja"
                className={`px-2.5 py-1 text-xs font-medium rounded-lg transition-colors cursor-pointer ${
                  filter.mediaType === 'video' ? 'bg-white text-slate-900 shadow-xs font-semibold' : 'text-slate-600'
                }`}
              >
                Video
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Media Cards Grid */}
      {moments.length === 0 ? (
        <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-12 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-2xl bg-emerald-50 text-emerald-600 flex items-center justify-center">
            <ImageIcon className="w-7 h-7" />
          </div>
          <div className="max-w-md mx-auto">
            <h3 className="text-base font-bold text-slate-900">Belum Ada Momen yang Cocok</h3>
            <p className="text-xs text-slate-500 mt-1">
              Tidak ada foto atau video yang sesuai dengan filter yang dipilih. Coba reset filter atau unggah momen baru.
            </p>
          </div>
          <button
            onClick={onOpenUpload}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-bold text-white bg-slate-900 rounded-xl hover:bg-slate-800 transition-colors shadow-xs"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-300" />
            <span>Upload Momen Pertama</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {moments.map((item) => {
            const ageAtMoment = calculateAge(birthDate, item.date);
            const categoryMeta = CATEGORY_LABELS[item.category] || CATEGORY_LABELS.lainnya;

            return (
              <div
                key={item.id}
                onClick={() => onSelectMoment(item)}
                className="group bg-[#FFFDF9] rounded-2xl border border-[#EDE8DF] hover:border-slate-300 hover:shadow-md transition-all duration-200 overflow-hidden flex flex-col cursor-pointer"
              >
                {/* Media Thumbnail Container with measured aspect ratio */}
                <div className="relative aspect-[4/3] bg-slate-100 overflow-hidden">
                  <img
                    src={item.mediaUrl}
                    alt={item.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover group-hover:scale-103 transition-transform duration-300"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src =
                        'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="%23f1f5f9"><rect width="400" height="300" fill="%23f8fafc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8">Foto Momen</text></svg>';
                    }}
                  />

                  {/* Gradient Scrim for subtle contrast */}
                  <div className="absolute inset-0 bg-gradient-to-t from-black/40 via-transparent to-black/10 opacity-70 group-hover:opacity-90 transition-opacity" />

                  {/* Badges Overlay */}
                  <div className="absolute top-3 left-3 right-3 flex items-center justify-between">
                    <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-white/95 text-slate-800 backdrop-blur-xs shadow-xs">
                      {categoryMeta.label}
                    </span>

                    <div className="flex items-center gap-1.5">
                      {item.mediaType === 'video' && (
                        <span className="w-6 h-6 rounded-md bg-black/60 text-white backdrop-blur-xs flex items-center justify-center">
                          <Video className="w-3.5 h-3.5" />
                        </span>
                      )}
                      {item.googleDriveSynced && (
                        <span
                          title="Tersinkronisasi ke Google Drive"
                          className="w-6 h-6 rounded-md bg-emerald-600/90 text-white backdrop-blur-xs flex items-center justify-center shadow-xs"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Bottom Image Overlay: Age at Moment */}
                  <div className="absolute bottom-2.5 left-3 text-white text-xs font-semibold drop-shadow-sm flex items-center gap-1.5">
                    <span>Usia {ageAtMoment.compactLabel}</span>
                  </div>
                </div>

                {/* Card Content & Father's Notes */}
                <div className="p-4 sm:p-5 flex-1 flex flex-col justify-between space-y-3">
                  <div className="space-y-1.5">
                    {/* Unboxed Metadata with Typographic Separator */}
                    <div className="flex items-center gap-1.5 text-xs text-slate-500">
                      <Calendar className="w-3.5 h-3.5 text-slate-400" />
                      <span>{formatDateIndo(item.date)}</span>
                      <span aria-hidden="true">·</span>
                      <span className="font-medium text-slate-700">{ageAtMoment.label}</span>
                    </div>

                    <h3 className="text-sm sm:text-base font-bold text-slate-900 group-hover:text-emerald-700 transition-colors line-clamp-1">
                      {item.title}
                    </h3>

                    {/* Father's Heartfelt Note */}
                    <p className="text-xs text-slate-600 line-clamp-2 leading-relaxed">
                      "{item.notes}"
                    </p>
                  </div>

                  {/* Physical Measurements strip (if recorded) */}
                  <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                    {(item.weightKg || item.heightCm) ? (
                      <div className="flex items-center gap-3 text-slate-600">
                        {item.weightKg && (
                          <div className="flex items-center gap-1 text-slate-700">
                            <Scale className="w-3.5 h-3.5 text-emerald-600" />
                            <span className="font-semibold tabular-nums">{formatWeight(item.weightKg)}</span>
                          </div>
                        )}
                        {item.heightCm && (
                          <div className="flex items-center gap-1 text-slate-700">
                            <Ruler className="w-3.5 h-3.5 text-sky-600" />
                            <span className="font-semibold tabular-nums">{formatHeight(item.heightCm)}</span>
                          </div>
                        )}
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Dokumentasi Momen</span>
                    )}

                    <span className="text-[11px] font-semibold text-emerald-600 group-hover:translate-x-0.5 transition-transform flex items-center gap-0.5">
                      Lihat Detail &rarr;
                    </span>
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
