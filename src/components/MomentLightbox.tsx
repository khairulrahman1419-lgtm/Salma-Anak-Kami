import React, { useEffect, useRef, useState } from 'react';
import {
  X,
  Calendar,
  CheckCircle2,
  ExternalLink,
  Download,
  Edit2,
  ChevronLeft,
  ChevronRight,
  Sparkles,
  Video,
} from 'lucide-react';
import type { MomentItem } from '../types/index.ts';
import {
  calculateAge,
  CATEGORY_LABELS,
  formatDateIndo,
  formatHeight,
  formatWeight,
  formatHeadCirc,
} from '../utils/growth.ts';
import { downloadMediaFile } from '../utils/downloadMedia.ts';
import { getMomentMediaSlides, getVideoPosterUrl } from '../utils/imageHelper.ts';
import { VideoPlayer } from './VideoPlayer.tsx';

interface MomentLightboxProps {
  moment: MomentItem | null;
  initialSlideIndex?: number;
  birthDate: string;
  childName: string;
  onClose: () => void;
  onEditMoment?: (moment: MomentItem) => void;
  onNotify?: (msg: string) => void;
  onPrev?: () => void;
  onNext?: () => void;
}

const FALLBACK_LIGHTBOX_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="600" height="450" viewBox="0 0 600 450" fill="%230f172a"><rect width="600" height="450" fill="%230f172a"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="16" fill="%2394a3b8">Foto Momen</text></svg>';

export const MomentLightbox: React.FC<MomentLightboxProps> = ({
  moment,
  initialSlideIndex = 0,
  birthDate,
  childName,
  onClose,
  onEditMoment,
  onNotify,
  onPrev,
  onNext,
}) => {
  const scrollerRef = useRef<HTMLDivElement>(null);
  const [slideIndex, setSlideIndex] = useState(0);

  const slides = moment ? getMomentMediaSlides(moment) : [];
  const hasMultipleSlides = slides.length > 1;
  const safeSlideIdx = slides.length > 0 ? Math.min(slideIndex, slides.length - 1) : 0;
  const activeSlide = slides[safeSlideIdx];

  useEffect(() => {
    if (!moment) return;
    const targetIdx = Math.max(0, Math.min(slides.length - 1, initialSlideIndex));
    setSlideIndex(targetIdx);
    requestAnimationFrame(() => {
      const container = scrollerRef.current;
      if (container && container.clientWidth > 0) {
        container.scrollTo({
          left: targetIdx * container.clientWidth,
          behavior: 'instant' as ScrollBehavior,
        });
      }
    });
  }, [moment?.id, initialSlideIndex, slides.length]);

  const goToSlide = (targetIdx: number) => {
    if (slides.length === 0) return;
    const clamped = Math.max(0, Math.min(slides.length - 1, targetIdx));
    setSlideIndex(clamped);
    const container = scrollerRef.current;
    if (container && container.clientWidth > 0) {
      container.scrollTo({
        left: clamped * container.clientWidth,
        behavior: 'smooth',
      });
    }
  };

  useEffect(() => {
    if (!moment) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      } else if (e.key === 'ArrowLeft') {
        if (safeSlideIdx > 0) {
          goToSlide(safeSlideIdx - 1);
        } else if (onPrev) {
          onPrev();
        }
      } else if (e.key === 'ArrowRight') {
        if (safeSlideIdx < slides.length - 1) {
          goToSlide(safeSlideIdx + 1);
        } else if (onNext) {
          onNext();
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [moment, safeSlideIdx, slides.length, onClose, onPrev, onNext]);

  if (!moment || !activeSlide) return null;

  const age = calculateAge(birthDate, moment.date);
  const categoryMeta = CATEGORY_LABELS[moment.category] || CATEGORY_LABELS.lainnya;

  const handleScroll = () => {
    const container = scrollerRef.current;
    if (!container || container.clientWidth <= 0) return;
    const nextIdx = Math.round(container.scrollLeft / container.clientWidth);
    const clamped = Math.max(0, Math.min(slides.length - 1, nextIdx));
    if (clamped !== slideIndex) {
      setSlideIndex(clamped);
    }
  };

  const handleDownloadCurrent = async () => {
    const suffix = hasMultipleSlides ? `-${safeSlideIdx + 1}` : '';
    const ok = await downloadMediaFile(
      activeSlide.url,
      `${moment.title}${suffix}`,
      activeSlide.mediaType
    );
    if (ok && onNotify) {
      onNotify(
        hasMultipleSlides
          ? `Foto ${safeSlideIdx + 1}/${slides.length} "${moment.title}" berhasil diunduh!`
          : `File "${moment.title}" berhasil diunduh ke perangkat Anda!`
      );
    }
  };

  const canGoLeft = safeSlideIdx > 0 || Boolean(onPrev);
  const canGoRight = safeSlideIdx < slides.length - 1 || Boolean(onNext);

  const handleLeftAction = () => {
    if (safeSlideIdx > 0) {
      goToSlide(safeSlideIdx - 1);
    } else if (onPrev) {
      onPrev();
    }
  };

  const handleRightAction = () => {
    if (safeSlideIdx < slides.length - 1) {
      goToSlide(safeSlideIdx + 1);
    } else if (onNext) {
      onNext();
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 animate-in fade-in duration-200"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-4xl bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] shadow-2xl overflow-hidden flex flex-col md:flex-row max-h-[92vh]"
      >
        {/* Swipeable Media Preview Column */}
        <div className="md:w-3/5 bg-slate-950 flex flex-col justify-between relative min-h-[300px] md:min-h-[480px] overflow-hidden select-none">
          {/* Horizontal Snap-Scroll Track */}
          <div className="relative flex-1 flex items-center min-h-[260px]">
            <div
              ref={scrollerRef}
              onScroll={hasMultipleSlides ? handleScroll : undefined}
              className={`w-full h-full flex items-center ${
                hasMultipleSlides
                  ? 'overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth touch-pan-x'
                  : 'overflow-hidden'
              }`}
            >
              {slides.map((slide, idx) => (
                <div
                  key={slide.id || idx}
                  className="w-full h-full shrink-0 snap-center snap-always flex items-center justify-center p-1 sm:p-2"
                >
                  {slide.mediaType === 'video' ? (
                    <div className="w-full h-full flex items-center justify-center">
                      <VideoPlayer
                        src={slide.url}
                        title={`${moment.title} (${idx + 1})`}
                        poster={getVideoPosterUrl(slide.url)}
                        className="w-full h-full max-h-[64vh] rounded-2xl"
                      />
                    </div>
                  ) : (
                    <img
                      src={slide.url}
                      alt={`${moment.title} (${idx + 1}/${slides.length})`}
                      referrerPolicy="no-referrer"
                      draggable={false}
                      className="w-full h-full max-h-[64vh] object-contain"
                      onError={(e) => {
                        (e.target as HTMLImageElement).src = FALLBACK_LIGHTBOX_SVG;
                      }}
                    />
                  )}
                </div>
              ))}
            </div>

            {/* Top-Left Download + Slide Counter */}
            <div className="absolute top-3 left-3 z-20 flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleDownloadCurrent()}
                title="Unduh foto / video yang sedang tampil"
                className="px-3 py-1.5 rounded-full bg-black/60 hover:bg-black/80 text-white text-xs font-bold flex items-center gap-1.5 backdrop-blur-xs transition-colors cursor-pointer"
              >
                <Download className="w-3.5 h-3.5 text-emerald-300" />
                <span>Unduh</span>
              </button>

              {hasMultipleSlides && (
                <span className="px-2.5 py-1 rounded-full bg-black/60 text-white text-xs font-bold backdrop-blur-xs tabular-nums">
                  {safeSlideIdx + 1} / {slides.length}
                </span>
              )}
            </div>

            {/* Previous / Next Floating Arrows (Slide first, then Moment) */}
            {canGoLeft && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleLeftAction();
                }}
                title={safeSlideIdx > 0 ? 'Slide Foto Sebelumnya' : 'Momen Sebelumnya'}
                aria-label="Sebelumnya"
                className="absolute left-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {canGoRight && (
              <button
                type="button"
                onClick={(e) => {
                  e.stopPropagation();
                  handleRightAction();
                }}
                title={
                  safeSlideIdx < slides.length - 1 ? 'Slide Foto Berikutnya' : 'Momen Selanjutnya'
                }
                aria-label="Berikutnya"
                className="absolute right-3 top-1/2 -translate-y-1/2 z-20 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}

            {/* Close button for mobile inside media area */}
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup Detail"
              className="md:hidden absolute top-3 right-3 z-20 w-10 h-10 min-w-[44px] min-h-[44px] rounded-full bg-black/55 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Interactive Slide Thumbnail Strip when Moment has > 1 Photo */}
          {hasMultipleSlides && (
            <div className="px-3 py-2.5 bg-slate-900/95 border-t border-white/10 flex items-center justify-center gap-2 overflow-x-auto no-scrollbar">
              {slides.map((slide, idx) => {
                const isSelected = idx === safeSlideIdx;
                return (
                  <button
                    key={slide.id || idx}
                    type="button"
                    onClick={() => goToSlide(idx)}
                    aria-label={`Pilih foto ke-${idx + 1}`}
                    className={`relative w-12 h-12 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                      isSelected
                        ? 'border-emerald-400 scale-105 opacity-100'
                        : 'border-white/15 opacity-60 hover:opacity-90'
                    }`}
                  >
                    {slide.mediaType === 'video' ? (
                      <div className="w-full h-full bg-slate-800 text-white flex items-center justify-center relative">
                        {getVideoPosterUrl(slide.url) ? (
                          <img
                            src={getVideoPosterUrl(slide.url)}
                            alt={`Thumbnail Video ${idx + 1}`}
                            className="w-full h-full object-cover"
                          />
                        ) : null}
                        <div className="absolute inset-0 bg-black/45 flex items-center justify-center">
                          <Video className="w-4 h-4 text-emerald-300" />
                        </div>
                      </div>
                    ) : (
                      <img
                        src={slide.url}
                        alt={`Thumbnail ${idx + 1}`}
                        referrerPolicy="no-referrer"
                        className="w-full h-full object-cover"
                      />
                    )}
                  </button>
                );
              })}
            </div>
          )}
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
                type="button"
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
                <span className="font-semibold text-emerald-800">Usia {age.label}</span>
                {hasMultipleSlides && (
                  <>
                    <span aria-hidden="true">·</span>
                    <span className="text-slate-600 font-medium tabular-nums">
                      {slides.length} Foto (Geser ke samping)
                    </span>
                  </>
                )}
              </div>
            </div>

            {/* Parents' Heartfelt Notes & Story */}
            <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#EDE8DF] space-y-1.5">
              <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block">
                Catatan Hati &amp; Kisah Momen
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
                  <span className="font-semibold text-slate-800 block">
                    {moment.googleDriveSynced
                      ? 'Tersimpan di Google Drive'
                      : 'Tersimpan & Tersinkronisasi Cloud'}
                  </span>
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
                  Aman
                </span>
              )}
            </div>
          </div>

          {/* Action Footer: Edit, Download & Tutup */}
          <div className="pt-3 border-t border-[#EDE8DF] flex flex-wrap items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => void handleDownloadCurrent()}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-teal-800 bg-teal-50 hover:bg-teal-100 border border-teal-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
              >
                <Download className="w-3.5 h-3.5" />
                <span>
                  {hasMultipleSlides
                    ? `Unduh Foto (${safeSlideIdx + 1}/${slides.length})`
                    : 'Unduh Foto'}
                </span>
              </button>

              {onEditMoment && (
                <button
                  type="button"
                  onClick={() => {
                    const target = moment;
                    onClose();
                    onEditMoment(target);
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition-colors cursor-pointer whitespace-nowrap"
                >
                  <Edit2 className="w-3.5 h-3.5" />
                  <span>Edit Momen</span>
                </button>
              )}
            </div>

            <button
              type="button"
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
