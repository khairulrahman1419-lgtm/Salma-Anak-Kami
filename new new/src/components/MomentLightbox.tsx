import React, { useEffect } from 'react';
import {
  X,
  Calendar,
  Scale,
  Ruler,
  Brain,
  CheckCircle2,
  ExternalLink,
  Share2,
  Video,
  Download,
  ChevronLeft,
  ChevronRight,
  Heart,
  Sparkles,
} from 'lucide-react';
import type { MomentItem } from '../types/index.ts';
import { calculateAge, CATEGORY_LABELS, formatDateIndo, formatHeight, formatWeight, formatHeadCirc } from '../utils/growth.ts';

interface MomentLightboxProps {
  moment: MomentItem | null;
  birthDate: string;
  childName: string;
  onClose: () => void;
  onPrev?: () => void;
  onNext?: () => void;
}

export const MomentLightbox: React.FC<MomentLightboxProps> = ({
  moment,
  birthDate,
  childName,
  onClose,
  onPrev,
  onNext,
}) => {
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
      if (e.key === 'ArrowLeft' && onPrev) onPrev();
      if (e.key === 'ArrowRight' && onNext) onNext();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose, onPrev, onNext]);

  if (!moment) return null;

  const age = calculateAge(birthDate, moment.date);
  const categoryMeta = CATEGORY_LABELS[moment.category] || CATEGORY_LABELS.lainnya;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-4xl bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]">
        {/* Media Preview Column */}
        <div className="md:w-3/5 bg-slate-950 flex items-center justify-center relative min-h-[280px] md:min-h-[460px] overflow-hidden select-none">
          {moment.mediaType === 'video' ? (
            <div className="p-8 text-center text-white space-y-3">
              <div className="w-16 h-16 rounded-full bg-white/10 mx-auto flex items-center justify-center text-sky-400">
                <Video className="w-8 h-8" />
              </div>
              <p className="text-sm font-semibold">Video Momen Tumbuh Kembang</p>
              <p className="text-xs text-slate-400 max-w-xs mx-auto">
                File video tersimpan dengan aman di Google Drive Cloud Storage.
              </p>
            </div>
          ) : (
            <img
              src={moment.mediaUrl}
              alt={moment.title}
              referrerPolicy="no-referrer"
              className="w-full h-full object-contain max-h-[70vh]"
            />
          )}

          {/* Previous / Next Floating Arrows for Album Browsing */}
          {onPrev && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onPrev();
              }}
              title="Foto Sebelumnya"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          {onNext && (
            <button
              onClick={(e) => {
                e.stopPropagation();
                onNext();
              }}
              title="Foto Selanjutnya"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/50 hover:bg-black/70 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
            >
              <ChevronRight className="w-5 h-5" />
            </button>
          )}

          {/* Close button for mobile inside media area */}
          <button
            onClick={onClose}
            aria-label="Tutup Detail"
            className="md:hidden absolute top-3 right-3 w-8 h-8 rounded-full bg-black/50 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Story & Metadata Column */}
        <div className="md:w-2/5 p-5 sm:p-6 flex flex-col justify-between overflow-y-auto bg-[#FFFDF9] space-y-4">
          <div className="space-y-4">
            {/* Header row with Close button on Desktop */}
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold px-2.5 py-1 rounded-md bg-emerald-50 text-emerald-800 border border-emerald-100 flex items-center gap-1.5">
                <Sparkles className="w-3 h-3 text-emerald-600" />
                <span>{categoryMeta.label}</span>
              </span>

              <button
                onClick={onClose}
                aria-label="Tutup Detail"
                className="hidden md:flex w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-100 items-center justify-center transition-colors cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Title & Dates */}
            <div className="space-y-1.5">
              <h2 className="text-base sm:text-lg font-bold text-slate-900 leading-snug">
                {moment.title}
              </h2>

              <div className="flex items-center gap-2 text-xs text-slate-500 flex-wrap">
                <div className="flex items-center gap-1 font-medium text-slate-700">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDateIndo(moment.date)}</span>
                </div>
                <span aria-hidden="true">·</span>
                <span className="font-semibold text-emerald-800">
                  Usia {age.label}
                </span>
              </div>
            </div>

            {/* Father's Heartfelt Notes & Story */}
            <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#EDE8DF] space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Catatan Hati & Kisah Ayah
              </span>
              <p className="text-xs sm:text-sm text-slate-700 leading-relaxed italic font-serif">
                "{moment.notes}"
              </p>
            </div>

            {/* Physical Measurements strip */}
            {(moment.weightKg || moment.heightCm || moment.headCircumferenceCm) && (
              <div className="space-y-2">
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                  Data Fisik Saat Momen Ini
                </span>
                <div className="grid grid-cols-3 gap-2">
                  {moment.weightKg && (
                    <div className="bg-[#FAF8F5] p-2 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block">Berat</span>
                      <span className="text-xs font-bold text-slate-900 tabular-nums">
                        {formatWeight(moment.weightKg)}
                      </span>
                    </div>
                  )}
                  {moment.heightCm && (
                    <div className="bg-[#FAF8F5] p-2 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block">Tinggi</span>
                      <span className="text-xs font-bold text-slate-900 tabular-nums">
                        {formatHeight(moment.heightCm)}
                      </span>
                    </div>
                  )}
                  {moment.headCircumferenceCm && (
                    <div className="bg-[#FAF8F5] p-2 rounded-xl border border-slate-200 text-center">
                      <span className="text-[10px] text-slate-400 block">L. Kepala</span>
                      <span className="text-xs font-bold text-slate-900 tabular-nums">
                        {formatHeadCirc(moment.headCircumferenceCm)}
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

            {/* Google Drive Status Banner */}
            <div className="p-3 rounded-2xl bg-sky-50/70 border border-sky-100 flex items-center justify-between text-xs">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <div className="text-[11px]">
                  <span className="font-semibold text-slate-800 block">Tersimpan di Google Drive</span>
                  <span className="text-slate-500">Folder: Jurnal Tumbuh Kembang - {childName}</span>
                </div>
              </div>
              {moment.googleDriveWebViewLink ? (
                <a
                  href={moment.googleDriveWebViewLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-[11px] font-bold text-sky-700 bg-sky-100 hover:bg-sky-200 px-2.5 py-1 rounded-lg flex items-center gap-1 transition-colors"
                >
                  <span>Buka Drive</span>
                  <ExternalLink className="w-3 h-3" />
                </a>
              ) : (
                <span className="text-[10px] font-semibold text-sky-700 bg-sky-100/70 px-2 py-0.5 rounded-md">
                  Tersinkron
                </span>
              )}
            </div>
          </div>

          {/* Action Footer */}
          <div className="pt-3 border-t border-[#EDE8DF] flex items-center justify-between">
            <span className="text-[11px] text-slate-400">
              Dokumentasi Jurnal Buah Hati
            </span>
            <button
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
            >
              Tutup
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
