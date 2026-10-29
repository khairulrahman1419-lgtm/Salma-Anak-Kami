import React from 'react';
import { Camera, Sparkles, Scale, Ruler, Brain, CheckCircle2, MoreVertical, Edit2, PlusCircle, ArrowUpRight } from 'lucide-react';
import type { ChildProfile } from '../types/index.ts';
import { calculateAge, formatDateIndo, formatHeight, formatWeight, formatHeadCirc, getWHOGrowthStatus, LatestMeasurements } from '../utils/growth.ts';

interface ChildHeroProfileProps {
  profile: ChildProfile;
  latestStats: LatestMeasurements;
  onOpenUpload: (mode: 'media' | 'milestone') => void;
  onEditProfile: () => void;
  onOpenQuickGrowth: () => void;
  onOpenMenu?: (e: React.MouseEvent) => void;
}

export const ChildHeroProfile: React.FC<ChildHeroProfileProps> = ({
  profile,
  latestStats,
  onOpenUpload,
  onEditProfile,
  onOpenQuickGrowth,
  onOpenMenu,
}) => {
  const age = calculateAge(profile.birthDate);
  const whoStatus = getWHOGrowthStatus(latestStats.ageAtRecordMonths, latestStats.weightKg);

  return (
    <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-3.5 sm:p-5 shadow-xs relative">
      {/* Mobile-Friendly Quick Menu Trigger (•••) */}
      {onOpenMenu && (
        <button
          onClick={onOpenMenu}
          title="Menu Cepat Jurnal & Penyimpanan"
          aria-label="Menu Cepat"
          className="absolute top-3.5 right-3.5 w-8 h-8 rounded-full bg-[#FAF8F5] hover:bg-slate-200/70 border border-slate-200/80 text-slate-600 flex items-center justify-center transition-colors cursor-pointer"
        >
          <MoreVertical className="w-4 h-4" />
        </button>
      )}

      {/* Profile Header & Compact Action Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pr-7 sm:pr-0">
        {/* Child Profile Information */}
        <div className="flex items-center gap-3 sm:gap-4">
          {/* Tappable Avatar with Camera Overlay to Change Photo */}
          <div
            onClick={onEditProfile}
            title="Klik untuk ganti foto anak atau akun"
            className="relative group shrink-0 cursor-pointer"
          >
            <div className="w-14 h-14 sm:w-16 sm:h-16 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-amber-50 transition-transform group-hover:scale-102">
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
            {/* Camera badge to change photo */}
            <div
              className="absolute -bottom-1 -right-1 w-6 h-6 bg-emerald-600 group-hover:bg-emerald-700 text-white rounded-full border-2 border-white shadow-xs flex items-center justify-center transition-colors"
              title="Ganti Foto Anak"
            >
              <Camera className="w-3 h-3" />
            </div>
          </div>

          <div className="space-y-0.5 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h1 className="text-base sm:text-xl font-bold tracking-tight text-slate-900 truncate">
                {profile.name}
              </h1>
              <span className="text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100 whitespace-nowrap">
                {profile.gender === 'male' ? 'Laki-laki' : 'Perempuan'}
              </span>
            </div>

            <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-600 flex-wrap">
              <span className="font-semibold text-slate-900">{age.label}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-500">Lahir {profile.birthDate}</span>
              <span aria-hidden="true" className="text-slate-300">·</span>
              <span className="text-slate-500">{profile.fatherName}</span>
            </div>

            <div className="flex items-center gap-2 pt-0.5 flex-wrap">
              <span className={`text-[9px] sm:text-[10px] font-medium px-1.5 py-0.5 rounded-md ${whoStatus.badgeClass}`}>
                {whoStatus.label}
              </span>
              <button
                type="button"
                onClick={onEditProfile}
                className="text-[10px] sm:text-[11px] font-semibold text-emerald-700 hover:text-emerald-800 underline decoration-emerald-300 cursor-pointer"
              >
                Ganti Foto & Profil
              </button>
            </div>
          </div>
        </div>

        {/* Compact, Sleek Action Bar */}
        <div className="flex items-center gap-1.5 sm:gap-2 overflow-x-auto no-scrollbar pt-1 md:pt-0">
          {/* 1. Upload Media Button */}
          <button
            onClick={() => onOpenUpload('media')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Camera className="w-3.5 h-3.5" />
            <span>Upload Media</span>
          </button>

          {/* 2. Catat Milestone Button */}
          <button
            onClick={() => onOpenUpload('milestone')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-sky-600 hover:bg-sky-700 text-white font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
          >
            <Sparkles className="w-3.5 h-3.5" />
            <span>Milestone</span>
          </button>

          {/* 3. Easy Quick Input BB/TB Button */}
          <button
            onClick={onOpenQuickGrowth}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300/80 font-semibold text-xs shadow-xs active:scale-95 transition-all cursor-pointer whitespace-nowrap"
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
                    <ArrowUpRight className="w-2 h-2" />
                    +{latestStats.weightDiffKg}
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
                    <ArrowUpRight className="w-2 h-2" />
                    +{latestStats.heightDiffCm}
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
