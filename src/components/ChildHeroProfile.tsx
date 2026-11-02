import React, { useRef, useState } from 'react';
import {
  Scale,
  Ruler,
  Brain,
  CheckCircle2,
  MoreVertical,
  ArrowUpRight,
  Clock,
  RefreshCw,
  Plus,
  Loader2,
} from 'lucide-react';
import type { ChildProfile, FamilyExtraPhoto } from '../types/index.ts';
import {
  calculateAge,
  formatDateIndo,
  formatHeight,
  formatWeight,
  formatHeadCirc,
  getWHOGrowthStatus,
  type LatestMeasurements,
} from '../utils/growth.ts';
import { MAX_EXTRA_FAMILY_PHOTOS, readImageAsDataUrl } from '../utils/imageHelper.ts';
import { Clothespin } from './Clothespin.tsx';
import { FamilyPhotoModal, type FamilyPhotoKey } from './FamilyPhotoModal.tsx';

interface ChildHeroProfileProps {
  profile: ChildProfile;
  latestStats: LatestMeasurements;
  isPendingLocalSync?: boolean;
  onRetrySync?: () => void;
  onEditProfile: () => void;
  onSaveProfile?: (updated: ChildProfile) => Promise<unknown> | void;
  onOpenQuickGrowth: () => void;
  onOpenMenu?: (e: React.MouseEvent<HTMLButtonElement>) => void;
  onNotify?: (msg: string) => void;
}

const DEFAULT_FATHER_PHOTO = '/src/assets/images/moment_father_play_1792555577232.jpg';
const DEFAULT_MOTHER_PHOTO = '/src/assets/images/moment_eating_puree_1792555107552.jpg';

const FALLBACK_AVATAR_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120" viewBox="0 0 24 24" fill="none" stroke="%2314B8A6" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><rect width="24" height="24" rx="4" fill="%23F0FDFA" stroke="none"/><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>';

export const ChildHeroProfile: React.FC<ChildHeroProfileProps> = ({
  profile,
  latestStats,
  isPendingLocalSync = false,
  onRetrySync,
  onEditProfile,
  onSaveProfile,
  onOpenQuickGrowth,
  onOpenMenu,
  onNotify,
}) => {
  const [viewerKey, setViewerKey] = useState<FamilyPhotoKey | null>(null);
  const [isAddingExtra, setIsAddingExtra] = useState(false);
  const extraPhotosInputRef = useRef<HTMLInputElement>(null);

  const age = calculateAge(profile.birthDate);
  const whoStatus = getWHOGrowthStatus(
    latestStats.ageAtRecordMonths,
    latestStats.weightKg,
    profile.gender
  );

  const resolvedFatherPhoto = profile.fatherAvatarUrl || DEFAULT_FATHER_PHOTO;
  const resolvedMotherPhoto = profile.motherAvatarUrl || DEFAULT_MOTHER_PHOTO;
  const extraPhotos = (profile.extraFamilyPhotos || []).slice(0, MAX_EXTRA_FAMILY_PHOTOS);
  const remainingSlots = Math.max(0, MAX_EXTRA_FAMILY_PHOTOS - extraPhotos.length);

  const handleQuickAddExtraPhotos = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files ? Array.from(e.target.files) : [];
    e.target.value = '';
    if (fileList.length === 0 || !onSaveProfile) return;

    const filesToProcess = fileList.slice(0, Math.max(1, remainingSlots));
    setIsAddingExtra(true);
    try {
      const dataUrls = await Promise.all(
        filesToProcess.map((file) => readImageAsDataUrl(file))
      );

      const now = Date.now();
      const addedItems: FamilyExtraPhoto[] = dataUrls.map((url, idx) => ({
        id: `extra_${now}_${idx + 1}`,
        url,
      }));

      const nextExtras = [...extraPhotos, ...addedItems].slice(0, MAX_EXTRA_FAMILY_PHOTOS);
      await Promise.resolve(
        onSaveProfile({
          ...profile,
          extraFamilyPhotos: nextExtras,
        })
      );
    } catch (err) {
      console.error('Gagal menambahkan foto keluarga tambahan:', err);
      onNotify?.('Gagal memproses foto tambahan.');
    } finally {
      setIsAddingExtra(false);
    }
  };

  const handleRemoveExtraPhoto = (extraId: string) => {
    if (!onSaveProfile) return;
    const nextExtras = extraPhotos.filter((item) => item.id !== extraId);
    void Promise.resolve(
      onSaveProfile({
        ...profile,
        extraFamilyPhotos: nextExtras,
      })
    );
  };

  return (
    <>
      <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-4 sm:p-6 shadow-xs relative mt-2">
        {/* Decorative Clothespins on Top Edge */}
        <Clothespin variant="mint" className="hidden sm:block absolute -top-4 left-12 -rotate-3" />
        <Clothespin variant="wood" className="hidden sm:block absolute -top-4 right-14 rotate-3" />

        {/* Tombol Titik Tiga (⋮) untuk Seluruh Fitur & Aksi Cepat */}
        {onOpenMenu && (
          <button
            type="button"
            onClick={onOpenMenu}
            title="Menu Fitur (Ubah Biodata, Upload Media, Milestone, BB/TB & Pengaturan)"
            aria-label="Buka Menu Fitur"
            className="absolute top-3.5 right-3.5 w-11 h-11 min-w-[44px] min-h-[44px] rounded-full bg-[#FAF8F5] hover:bg-slate-200/70 border border-slate-200/90 text-slate-700 flex items-center justify-center transition-colors cursor-pointer"
          >
            <MoreVertical className="w-4.5 h-4.5" />
          </button>
        )}

        {/* Hidden Multi-Photo Input untuk Foto Tambahan di Bawah Ayah & Bunda */}
        <input
          ref={extraPhotosInputRef}
          type="file"
          accept="image/*"
          multiple
          onChange={(e) => void handleQuickAddExtraPhotos(e)}
          className="hidden"
        />

        {/* Area Utama: Kolom Foto Keluarga (Anak + Ayah & Bunda + Foto Tambahan Opsional) & Detail Biodata */}
        <div className="flex items-start gap-4 sm:gap-6 pr-11 sm:pr-12">
          {/* Kolom Foto Keluarga */}
          <div className="shrink-0 flex flex-col items-center gap-2">
            {/* 1. Foto Anak (Klik untuk melihat foto utuh) */}
            <button
              type="button"
              onClick={() => setViewerKey('child')}
              title={`Lihat foto utuh ${profile.name}`}
              aria-label={`Lihat foto utuh ${profile.name}`}
              className="group relative w-24 h-24 sm:w-28 sm:h-28 rounded-2xl overflow-hidden border-2 border-white shadow-md bg-amber-50 focus:outline-none focus-visible:ring-2 focus-visible:ring-teal-600 cursor-pointer"
            >
              <img
                src={profile.avatarUrl}
                alt={profile.name}
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_AVATAR_SVG;
                }}
              />
            </button>

            {/* 2. Foto Ayah & Foto Bunda di Bawah Foto Anak */}
            <div className="flex items-start justify-between gap-2 w-24 sm:w-28">
              {/* Foto Ayah */}
              <button
                type="button"
                onClick={() => setViewerKey('father')}
                title={`Lihat foto utuh ${profile.fatherName || 'Ayah'}`}
                aria-label={`Lihat foto utuh ${profile.fatherName || 'Ayah'}`}
                className="group flex flex-col items-center gap-1 w-11 sm:w-13 min-w-[44px] focus:outline-none cursor-pointer"
              >
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden border-2 border-white shadow-sm bg-sky-50 group-focus-visible:ring-2 group-focus-visible:ring-teal-600">
                  <img
                    src={resolvedFatherPhoto}
                    alt={profile.fatherName || 'Ayah'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_AVATAR_SVG;
                    }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-600 group-hover:text-teal-700 leading-none truncate max-w-full">
                  Ayah
                </span>
              </button>

              {/* Foto Bunda */}
              <button
                type="button"
                onClick={() => setViewerKey('mother')}
                title={`Lihat foto utuh ${profile.motherName || 'Bunda'}`}
                aria-label={`Lihat foto utuh ${profile.motherName || 'Bunda'}`}
                className="group flex flex-col items-center gap-1 w-11 sm:w-13 min-w-[44px] focus:outline-none cursor-pointer"
              >
                <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden border-2 border-white shadow-sm bg-rose-50 group-focus-visible:ring-2 group-focus-visible:ring-teal-600">
                  <img
                    src={resolvedMotherPhoto}
                    alt={profile.motherName || 'Bunda'}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = FALLBACK_AVATAR_SVG;
                    }}
                  />
                </div>
                <span className="text-[10px] font-semibold text-slate-600 group-hover:text-teal-700 leading-none truncate max-w-full">
                  Bunda
                </span>
              </button>
            </div>

            {/* 3. Foto-Foto Tambahan Opsional di Bawah Ayah & Bunda (Bisa > 1 Foto) */}
            {(extraPhotos.length > 0 || (onSaveProfile && remainingSlots > 0)) && (
              <div className="grid grid-cols-2 gap-2 w-24 sm:w-28 pt-0.5">
                {extraPhotos.map((extra, idx) => (
                  <button
                    key={extra.id}
                    type="button"
                    onClick={() => setViewerKey(`extra:${extra.id}`)}
                    title={`Lihat foto utuh ${extra.label || `Potret Keluarga ${idx + 1}`}`}
                    aria-label={`Lihat foto utuh ${extra.label || `Potret Keluarga ${idx + 1}`}`}
                    className="group flex flex-col items-center gap-1 w-11 sm:w-13 min-w-[44px] focus:outline-none cursor-pointer"
                  >
                    <div className="w-11 h-11 sm:w-13 sm:h-13 rounded-xl overflow-hidden border-2 border-white shadow-sm bg-amber-50/70 group-focus-visible:ring-2 group-focus-visible:ring-teal-600">
                      <img
                        src={extra.url}
                        alt={extra.label || `Foto Keluarga ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover transition-transform duration-200 group-hover:scale-105"
                        onError={(e) => {
                          (e.target as HTMLImageElement).src = FALLBACK_AVATAR_SVG;
                        }}
                      />
                    </div>
                    {extra.label && (
                      <span className="text-[10px] font-medium text-slate-500 group-hover:text-teal-700 leading-none truncate max-w-full">
                        {extra.label}
                      </span>
                    )}
                  </button>
                ))}

                {/* Slot Opsional Tambah Foto (Bisa pilih > 1 sekaligus dari galeri) */}
                {onSaveProfile && remainingSlots > 0 && (
                  <button
                    type="button"
                    disabled={isAddingExtra}
                    onClick={() => extraPhotosInputRef.current?.click()}
                    title="Opsional: Tambah 1 atau beberapa foto sekaligus di bawah foto Ayah & Bunda"
                    aria-label="Tambah foto keluarga opsional"
                    className={
                      extraPhotos.length % 2 === 1
                        ? 'group flex flex-col items-center justify-center w-11 h-11 sm:w-13 sm:h-13 min-w-[44px] min-h-[44px] rounded-xl border border-dashed border-[#DFD8CA] hover:border-teal-400 bg-[#FAF8F5]/70 hover:bg-teal-50/50 text-slate-400 hover:text-teal-700 transition-colors cursor-pointer disabled:opacity-60'
                        : 'col-span-2 flex items-center justify-center gap-1 w-full min-h-[40px] py-1.5 px-2 rounded-xl border border-dashed border-[#E4DEC9] hover:border-teal-400 bg-[#FAF8F5]/65 hover:bg-teal-50/50 text-slate-400 hover:text-teal-700 transition-colors cursor-pointer disabled:opacity-60'
                    }
                  >
                    {isAddingExtra ? (
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-teal-600" />
                    ) : (
                      <>
                        <Plus className="w-3.5 h-3.5 shrink-0" />
                        {extraPhotos.length % 2 === 0 && (
                          <span className="text-[10px] font-semibold whitespace-nowrap">
                            Foto
                          </span>
                        )}
                      </>
                    )}
                  </button>
                )}
              </div>
            )}
          </div>

          {/* Kolom Informasi Biodata Anak, Ayah & Bunda */}
          <div className="space-y-2 min-w-0 flex-1">
            <div>
              <h1 className="text-lg sm:text-2xl font-extrabold tracking-tight text-slate-900 leading-snug">
                {profile.name}
              </h1>

              {/* Metadata Kelahiran & Usia */}
              <div className="flex items-center gap-1.5 text-xs text-slate-600 flex-wrap mt-0.5">
                <span
                  className={`font-semibold ${
                    profile.gender === 'female' ? 'text-rose-700' : 'text-sky-700'
                  }`}
                >
                  {profile.gender === 'female' ? 'Perempuan' : 'Laki-laki'}
                </span>
                {profile.bloodType && (
                  <>
                    <span aria-hidden="true" className="text-slate-300">
                      ·
                    </span>
                    <span className="font-semibold text-slate-700">Gol. {profile.bloodType}</span>
                  </>
                )}
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="font-bold text-slate-900">{age.label}</span>
              </div>

              <div className="flex items-center gap-1.5 text-[11px] sm:text-xs text-slate-500 flex-wrap mt-0.5">
                <span>Lahir {formatDateIndo(profile.birthDate)}</span>
                <span aria-hidden="true" className="text-slate-300">
                  ·
                </span>
                <span className="text-emerald-800 font-semibold">{whoStatus.label}</span>
              </div>
            </div>

            {/* Indikator Status Lokal apabila Cloud belum merespons */}
            {isPendingLocalSync && (
              <div>
                <button
                  type="button"
                  onClick={onRetrySync}
                  title="Ketuk untuk mencoba sinkronisasi ulang ke Cloud sekarang"
                  className="inline-flex items-center gap-1.5 text-[11px] font-bold px-2.5 py-1 rounded-xl bg-amber-100 hover:bg-amber-200/80 text-amber-900 border border-amber-300 transition-colors cursor-pointer"
                >
                  <Clock className="w-3 h-3 text-amber-700 animate-pulse shrink-0" />
                  <span>Tersimpan Lokal (Menunggu Sinkronisasi)</span>
                  {onRetrySync && <RefreshCw className="w-3 h-3 text-amber-700 shrink-0" />}
                </button>
              </div>
            )}

            {/* Biodata Ayah & Bunda */}
            <div className="pt-1 border-t border-[#EFEAE1] grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-3 text-xs">
              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 font-medium">Ayah: </span>
                <span className="font-bold text-slate-800">{profile.fatherName || 'Ayah'}</span>
                {profile.fatherInfo && (
                  <p className="text-[11px] text-slate-500 leading-snug">{profile.fatherInfo}</p>
                )}
              </div>

              <div className="min-w-0">
                <span className="text-[11px] text-slate-400 font-medium">Bunda: </span>
                <span className="font-bold text-slate-800">{profile.motherName || 'Bunda'}</span>
                {profile.motherInfo && (
                  <p className="text-[11px] text-slate-500 leading-snug">{profile.motherInfo}</p>
                )}
              </div>
            </div>

            {/* Catatan Keluarga / Riwayat Kelahiran */}
            {profile.specialNotes && (
              <p className="text-xs text-slate-600 italic leading-relaxed">
                “{profile.specialNotes}”
              </p>
            )}
          </div>
        </div>

        {/* Ringkasan Pengukuran Pertumbuhan Buah Hati */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3 mt-4 pt-3.5 border-t border-[#EDE8DF]">
          {/* Berat Badan Terakhir */}
          <button
            type="button"
            onClick={onOpenQuickGrowth}
            title="Ketuk untuk memperbarui Berat Badan"
            className="text-left bg-[#FAF8F5] hover:bg-emerald-50/50 rounded-2xl p-2.5 sm:p-3 border border-[#E9E4DB] transition-colors cursor-pointer"
          >
            <span className="block text-[10px] font-medium text-slate-500 truncate mb-1">
              Berat Badan (BB)
            </span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-emerald-100 text-emerald-800 flex items-center justify-center shrink-0">
                <Scale className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                  {formatWeight(latestStats.weightKg)}
                </span>
                {latestStats.weightDiffKg !== undefined && latestStats.weightDiffKg > 0 && (
                  <span className="text-[9px] font-semibold text-emerald-700 flex items-center tabular-nums">
                    <ArrowUpRight className="w-2 h-2" />+{latestStats.weightDiffKg}
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Tinggi Badan Terakhir */}
          <button
            type="button"
            onClick={onOpenQuickGrowth}
            title="Ketuk untuk memperbarui Tinggi Badan"
            className="text-left bg-[#FAF8F5] hover:bg-sky-50/50 rounded-2xl p-2.5 sm:p-3 border border-[#E9E4DB] transition-colors cursor-pointer"
          >
            <span className="block text-[10px] font-medium text-slate-500 truncate mb-1">
              Tinggi Badan (TB)
            </span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-sky-100 text-sky-800 flex items-center justify-center shrink-0">
                <Ruler className="w-3.5 h-3.5" />
              </div>
              <div className="flex items-baseline gap-1 min-w-0">
                <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                  {formatHeight(latestStats.heightCm)}
                </span>
                {latestStats.heightDiffCm !== undefined && latestStats.heightDiffCm > 0 && (
                  <span className="text-[9px] font-semibold text-sky-700 flex items-center tabular-nums">
                    <ArrowUpRight className="w-2 h-2" />+{latestStats.heightDiffCm}
                  </span>
                )}
              </div>
            </div>
          </button>

          {/* Lingkar Kepala */}
          <button
            type="button"
            onClick={onOpenQuickGrowth}
            title="Ketuk untuk memperbarui Lingkar Kepala"
            className="text-left bg-[#FAF8F5] hover:bg-amber-50/50 rounded-2xl p-2.5 sm:p-3 border border-[#E9E4DB] transition-colors cursor-pointer"
          >
            <span className="block text-[10px] font-medium text-slate-500 truncate mb-1">
              Lingkar Kepala (LK)
            </span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center shrink-0">
                <Brain className="w-3.5 h-3.5" />
              </div>
              <span className="text-sm sm:text-base font-bold text-slate-900 tabular-nums">
                {formatHeadCirc(latestStats.headCircumferenceCm)}
              </span>
            </div>
          </button>

          {/* Pemeriksaan Terakhir */}
          <button
            type="button"
            onClick={onOpenQuickGrowth}
            title="Ketuk untuk mencatat pengukuran baru"
            className="text-left bg-[#FAF8F5] hover:bg-teal-50/50 rounded-2xl p-2.5 sm:p-3 border border-[#E9E4DB] transition-colors cursor-pointer"
          >
            <span className="block text-[10px] font-medium text-slate-500 truncate mb-1">
              Pemeriksaan Terakhir
            </span>
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-teal-100 text-teal-800 flex items-center justify-center shrink-0">
                <CheckCircle2 className="w-3.5 h-3.5" />
              </div>
              <div className="min-w-0">
                <span className="text-xs sm:text-sm font-bold text-slate-900 block truncate">
                  {latestStats.date ? formatDateIndo(latestStats.date) : 'Belum Ada'}
                </span>
                <span className="text-[9px] text-slate-500 tabular-nums">
                  Usia {latestStats.ageAtRecordMonths} Bulan
                </span>
              </div>
            </div>
          </button>
        </div>
      </div>

      {/* Lightbox Foto Utuh Keluarga (Anak, Ayah, Bunda & Foto Tambahan) */}
      <FamilyPhotoModal
        activePhotoKey={viewerKey}
        profile={profile}
        onSelectPhotoKey={setViewerKey}
        onClose={() => setViewerKey(null)}
        onEditProfile={onEditProfile}
        onRemoveExtraPhoto={onSaveProfile ? handleRemoveExtraPhoto : undefined}
        onTriggerAddExtraPhotos={
          onSaveProfile && remainingSlots > 0
            ? () => extraPhotosInputRef.current?.click()
            : undefined
        }
        canAddMoreExtra={Boolean(onSaveProfile && remainingSlots > 0)}
        onNotify={onNotify}
      />
    </>
  );
};
