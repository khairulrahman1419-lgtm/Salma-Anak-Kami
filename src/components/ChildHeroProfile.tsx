import React from 'react';
import {
  Camera,
  Sparkles,
  Scale,
  Ruler,
  Brain,
  CheckCircle2,
  MoreVertical,
  Edit2,
  PlusCircle,
  ArrowUpRight,
  Download,
  Users,
  Droplets,
} from 'lucide-react';
import type { ChildProfile } from '../types/index.ts';
import {
  calculateAge,
  formatDateIndo,
  formatHeight,
  formatWeight,
  formatHeadCirc,
  getWHOGrowthStatus,
  type LatestMeasurements,
} from '../utils/growth.ts';
import { downloadMediaFile } from '../utils/downloadMedia.ts';
import { Clothespin } from './Clothespin.tsx';

interface ChildHeroProfileProps {
  profile: ChildProfile;
  latestStats: LatestMeasurements;
  onOpenUpload: (mode: 'media' | 'milestone') => void;
  onEditProfile: () => void;
  onOpenQuickGrowth: () => void;
  onOpenMenu?: (e: React.MouseEvent) => void;
  onNotify?: (msg: string) => void;
}

export const ChildHeroProfile: React.FC<ChildHeroProfileProps> = ({
  profile,
  latestStats,
  onOpenUpload,
  onEditProfile,
  onOpenQuickGrowth,
  onOpenMenu,
  onNotify,
}) => {
  const age = calculateAge(profile.birthDate);
  const whoStatus = getWHOGrowthStatus(latestStats.ageAtRecordMonths, latestStats.weightKg);

  const handleDownloadAvatar = async (e: React.MouseEvent) => {
    e.stopPropagation();
    const ok = await downloadMediaFile(profile.avatarUrl, `foto-profil-${profile.nickname}`, 'image');
    if (ok && onNotify) {
      onNotify(`Foto profil ${profile.nickname} berhasil diunduh!`);
    }
  };

  return (
    <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-4 sm:p-5 shadow-xs relative mt-2">
      {/* Decorative Clothespins on Top Edge */}
      <Clothespin variant="mint" className="hidden sm:block absolute -top-4 left-12 -rotate-3" />
      <Clothespin variant="wood" className="hidden sm:block absolute -top-4 right-14 rotate-3" />

      {/* Mobile-Friendly Quick Menu Trigger (•••) */}
      {onOpenMenu && (
        <button
          type="button"
          onClick={onOpenMenu}
          title="Menu Cepat Jurnal & Penyimpanan"
          aria-label="Menu Cepat"
          className="absolute top-3.5 right-3.5 w-9 h-9 rounded-full bg-[#FAF8F5] hover:bg-slate-200/70 border border-slate-200/80 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      )}

      {/* Profile Header & Compact Action Bar */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pr-9 sm:pr-10">
        {/* Child & Parents Biodata Information */}
        <div className="flex items-start sm:items-center gap-3.5 sm:gap-4">
          {/* Tappable Avatar with Camera & Download Actions */}
          <div className="relative shrink-0 flex flex-col items-center gap-1.5">
            <div
              onClick={onEditProfile}
              title="Ketuk untuk mengubah foto & biodata anak"
              className="relative group cursor-pointer"
            >
              <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-amber-50 transition-transform group-hover:scale-102">
                <img
                  src={profile.avatarUrl}
                  alt={profile.name}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src =
                      'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 24 24" fill="none" stroke="%2334D399" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';
                  }}
                />
              </div>
              <div
                className="absolute -bottom-1 -right-1 w-6 h-6 bg-teal-600 group-hover:bg-teal-700 text-white rounded-full border-2 border-white shadow-xs flex items-center justify-center transition-colors"
                title="Ubah Foto Anak"
              >
                <Camera className="w-3 h-3" />
              </div>
            </div>

            {/* Download Profile Photo Button */}
            <button
              type="button"
              onClick={handleDownloadAvatar}
              title="Unduh foto profil anak"
              className="inline-flex items-center gap-1 text-[10px] font-semibold text-slate-500 hover:text-teal-700 bg-[#FAF8F5] hover:bg-teal-50 border border-slate-200/80 px-2 py-0.5 rounded-full transition-colors cursor-pointer"
            >
              <Download className="w-2.5 h-2.5" />
              <span>Unduh</span>
            </button>
          </div>

          <div className="space-y-1 min-w-0 flex-1">
            <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-extrabold tracking-tight text-slate-900 truncate">
                {profile.name}
              </h1>
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-md border whitespace-nowrap ${
                  profile.gender === 'female'
                    ? 'bg-pink-50 text-pink-800 border-pink-200'
                    : 'bg-sky-50 text-sky-800 border-sky-200'
                }`}
              >
                {profile.gender === 'female' ? 'Perempuan' : 'Laki-laki'}
              </span>
              {profile.bloodType && (
                <span className="inline-flex items-center gap-0.5 text-[10px] font-bold px-2 py-0.5 rounded-md bg-rose-50 text-rose-800 border border-rose-200/80 whitespace-nowrap">
                  <Droplets className="w-2.5 h-2.5 text-rose-500" />
                  <span>Gol. {profile.bloodType}</span>
                </span>
              )}
            </div>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 flex-wrap">
              <span className="font-bold text-slate-900">{age.label}</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className="text-slate-500">Lahir {formatDateIndo(profile.birthDate)}</span>
              <span aria-hidden="true" className="text-slate-300">
                ·
              </span>
              <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md ${whoStatus.badgeClass}`}>
                {whoStatus.label}
              </span>
            </div>

            {/* Info Ayah & Ibu */}
            <div className="pt-0.5 flex flex-wrap items-center gap-1.5 text-[11px] text-slate-700">
              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-[#FAF8F5] border border-[#E9E4DB] font-semibold text-slate-800">
                <Users className="w-3 h-3 text-teal-600 shrink-0" />
                <span>
                  {profile.fatherName || 'Ayah'}
                  {profile.motherName ? ` & ${profile.motherName}` : ''}
                </span>
              </span>

              {(profile.fatherInfo || profile.motherInfo) && (
                <span className="text-[10px] text-slate-500 truncate max-w-xs sm:max-w-md">
                  {[profile.fatherInfo, profile.motherInfo].filter(Boolean).join(' • ')}
                </span>
              )}
            </div>

            {profile.specialNotes && (
              <p className="text-[11px] text-slate-500 italic line-clamp-1">
                “{profile.specialNotes}”
              </p>
            )}
          </div>
        </div>

        {/* Compact, Sleek Action Bar including Explicit Ubah Biodata Button */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pt-1 lg:pt-0">
          {/* Ubah Biodata Anak & Orang Tua */}
          <button
            type="button"
            onClick={onEditProfile}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-teal-50 hover:bg-teal-100 text-teal-900 border border-teal-300/90 font-bold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Edit2 className="w-3.5 h-3.5 text-teal-700" />
            <span>Ubah Biodata</span>
          </button>

          {/* Upload Media Button */}
          <button
            type="button"
            onClick={() => onOpenUpload('media')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Upload Media</span>
          </button>

          {/* Catat Milestone Button */}
          <button
            type="button"
            onClick={() => onOpenUpload('milestone')}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Milestone</span>
          </button>

          {/* Easy Quick Input BB/TB Button */}
          <button
            type="button"
            onClick={onOpenQuickGrowth}
            className="flex items-center gap-1.5 px-3 py-2 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 font-semibold text-xs shadow-2xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
            title="Catat berat badan dan tinggi terbaru dengan cepat"
          >
            <Scale className="w-3.5 h-3.5 text-amber-700" />
            <span>+ Catat BB/TB</span>
          </button>
        </div>
      </div>

      {/* Metrics Row: Interactive Tap to Input/Edit BB & TB */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-3.5 pt-3 border-t border-[#EDE8DF]">
        {/* Berat Badan Terakhir */}
        <button
          type="button"
          onClick={onOpenQuickGrowth}
          className="group text-left bg-[#FAF8F5] hover:bg-emerald-50/50 rounded-2xl p-2.5 sm:p-3 border border-[#E9E4DB] hover:border-emerald-300 transition-all cursor-pointer relative"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-slate-500 truncate">
              Berat Badan (BB)
            </span>
            <span className="text-[9px] font-semibold text-emerald-700 opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
              <Edit2 className="w-2.5 h-2.5" />
              <span>Input</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
              <Scale className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                  {formatWeight(latestStats.weightKg)}
                </span>
                {latestStats.weightDiffKg !== undefined && latestStats.weightDiffKg > 0 && (
                  <span className="text-[9px] font-semibold text-emerald-700 flex items-center">
                    <ArrowUpRight className="w-2 h-2" />+{latestStats.weightDiffKg}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Tinggi Badan Terakhir */}
        <button
          type="button"
          onClick={onOpenQuickGrowth}
          className="group text-left bg-[#FAF8F5] hover:bg-sky-50/50 rounded-2xl p-2.5 sm:p-3 border border-[#E9E4DB] hover:border-sky-300 transition-all cursor-pointer relative"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-slate-500 truncate">
              Tinggi Badan (TB)
            </span>
            <span className="text-[9px] font-semibold text-sky-700 opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
              <Edit2 className="w-2.5 h-2.5" />
              <span>Input</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
              <Ruler className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-baseline gap-1">
                <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                  {formatHeight(latestStats.heightCm)}
                </span>
                {latestStats.heightDiffCm !== undefined && latestStats.heightDiffCm > 0 && (
                  <span className="text-[9px] font-semibold text-sky-700 flex items-center">
                    <ArrowUpRight className="w-2 h-2" />+{latestStats.heightDiffCm}
                  </span>
                )}
              </div>
            </div>
          </div>
        </button>

        {/* Lingkar Kepala */}
        <button
          type="button"
          onClick={onOpenQuickGrowth}
          className="group text-left bg-[#FAF8F5] hover:bg-amber-50/50 rounded-2xl p-2.5 sm:p-3 border border-[#E9E4DB] hover:border-amber-300 transition-all cursor-pointer relative"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-slate-500 truncate">
              Lingkar Kepala (LK)
            </span>
            <span className="text-[9px] font-semibold text-amber-700 opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
              <Edit2 className="w-2.5 h-2.5" />
              <span>Input</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
              <Brain className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                {formatHeadCirc(latestStats.headCircumferenceCm)}
              </span>
            </div>
          </div>
        </button>

        {/* Pemeriksaan Terakhir */}
        <button
          type="button"
          onClick={onOpenQuickGrowth}
          className="group text-left bg-[#FAF8F5] hover:bg-teal-50/50 rounded-2xl p-2.5 sm:p-3 border border-[#E9E4DB] hover:border-teal-300 transition-all cursor-pointer relative"
        >
          <div className="flex items-center justify-between mb-1">
            <span className="text-[10px] font-medium text-slate-500 truncate">
              Pemeriksaan Terakhir
            </span>
            <span className="text-[9px] font-semibold text-teal-700 opacity-80 group-hover:opacity-100 flex items-center gap-0.5">
              <PlusCircle className="w-2.5 h-2.5" />
              <span>Catat Baru</span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-3.5 h-3.5" />
            </div>
            <div className="min-w-0">
              <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                {latestStats.date ? formatDateIndo(latestStats.date) : 'Belum Ada'}
              </span>
              <span className="text-[9px] text-slate-500">
                Usia {latestStats.ageAtRecordMonths} Bulan
              </span>
            </div>
          </div>
        </button>
      </div>
    </div>
  );
};
