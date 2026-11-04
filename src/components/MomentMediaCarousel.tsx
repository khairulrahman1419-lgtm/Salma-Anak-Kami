import React, { useRef, useState } from 'react';
import { ChevronLeft, ChevronRight, Video } from 'lucide-react';
import type { MomentItem, MomentMediaSlide } from '../types/index.ts';
import { getMomentMediaSlides } from '../utils/imageHelper.ts';

interface MomentMediaCarouselProps {
  moment: MomentItem;
  aspectClassName?: string;
  imageClassName?: string;
  showCounterBadge?: boolean;
  onTapSlide?: (slideIndex: number, slide: MomentMediaSlide) => void;
  onActiveSlideChange?: (slideIndex: number, slide: MomentMediaSlide) => void;
  children?: React.ReactNode;
}

const FALLBACK_MOMENT_SVG =
  'data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="400" height="300" viewBox="0 0 400 300" fill="%23f1f5f9"><rect width="400" height="300" fill="%23f8fafc"/><text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" font-family="sans-serif" font-size="14" fill="%2394a3b8">Foto Momen</text></svg>';

export const MomentMediaCarousel: React.FC<MomentMediaCarouselProps> = ({
  moment,
  aspectClassName = 'aspect-[4/3]',
  imageClassName = 'w-full h-full object-cover',
  showCounterBadge = true,
  onTapSlide,
  onActiveSlideChange,
  children,
}) => {
  const slides = getMomentMediaSlides(moment);
  const hasMultiple = slides.length > 1;

  const scrollerRef = useRef<HTMLDivElement>(null);
  const pointerStartXRef = useRef<number | null>(null);
  const didSwipeDragRef = useRef<boolean>(false);
  const [activeIndex, setActiveIndex] = useState(0);

  const safeIndex = Math.min(activeIndex, slides.length - 1);
  const currentSlide = slides[safeIndex] || slides[0];

  const scrollToSlide = (targetIdx: number) => {
    const clamped = Math.max(0, Math.min(slides.length - 1, targetIdx));
    setActiveIndex(clamped);
    onActiveSlideChange?.(clamped, slides[clamped]);
    const container = scrollerRef.current;
    if (container && container.clientWidth > 0) {
      container.scrollTo({
        left: clamped * container.clientWidth,
        behavior: 'smooth',
      });
    }
  };

  const handleScroll = () => {
    const container = scrollerRef.current;
    if (!container || container.clientWidth <= 0) return;
    const nextIdx = Math.round(container.scrollLeft / container.clientWidth);
    const clamped = Math.max(0, Math.min(slides.length - 1, nextIdx));
    if (clamped !== activeIndex) {
      setActiveIndex(clamped);
      onActiveSlideChange?.(clamped, slides[clamped]);
    }
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLDivElement>) => {
    pointerStartXRef.current = e.clientX;
    didSwipeDragRef.current = false;
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (pointerStartXRef.current !== null && Math.abs(e.clientX - pointerStartXRef.current) > 8) {
      didSwipeDragRef.current = true;
    }
  };

  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (didSwipeDragRef.current) {
      e.stopPropagation();
      didSwipeDragRef.current = false;
      return;
    }
    if (onTapSlide) {
      e.stopPropagation();
      onTapSlide(safeIndex, currentSlide);
    }
  };

  return (
    <div
      className={`relative ${aspectClassName} overflow-hidden bg-slate-100 select-none`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onClick={handleContainerClick}
    >
      {/* Horizontal Snap-Scroll Track ("Swipe ke Samping") */}
      <div
        ref={scrollerRef}
        onScroll={hasMultiple ? handleScroll : undefined}
        className={`w-full h-full flex ${
          hasMultiple
            ? 'overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth touch-pan-x'
            : 'overflow-hidden'
        }`}
      >
        {slides.map((slide, idx) => (
          <div
            key={slide.id || idx}
            className="w-full h-full shrink-0 snap-center snap-always relative overflow-hidden"
          >
            {slide.mediaType === 'video' ? (
              <video
                src={slide.url}
                muted
                playsInline
                preload="metadata"
                className="w-full h-full object-cover"
              />
            ) : (
              <img
                src={slide.url}
                alt={`${moment.title} (${idx + 1}/${slides.length})`}
                referrerPolicy="no-referrer"
                draggable={false}
                loading="lazy"
                className={imageClassName}
                onError={(e) => {
                  (e.target as HTMLImageElement).src = FALLBACK_MOMENT_SVG;
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Video Indicator when active slide is a video */}
      {currentSlide?.mediaType === 'video' && (
        <div className="absolute bottom-2.5 left-2.5 z-10 w-6 h-6 rounded-lg bg-black/60 text-white flex items-center justify-center backdrop-blur-xs pointer-events-none">
          <Video className="w-3 h-3" />
        </div>
      )}

      {/* Multi-Photo Slide Counter Badge (e.g. 1/4) */}
      {hasMultiple && showCounterBadge && (
        <div className="absolute top-2.5 left-2.5 z-10 bg-black/60 backdrop-blur-xs text-white text-[10px] font-bold px-2 py-0.5 rounded-full tabular-nums pointer-events-none">
          {safeIndex + 1}/{slides.length}
        </div>
      )}

      {/* Left / Right Quick Step Arrows when Moment has > 1 Photo */}
      {hasMultiple && safeIndex > 0 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            scrollToSlide(safeIndex - 1);
          }}
          aria-label="Foto sebelumnya"
          className="absolute left-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-opacity sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
        >
          <ChevronLeft className="w-4 h-4" />
        </button>
      )}

      {hasMultiple && safeIndex < slides.length - 1 && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            scrollToSlide(safeIndex + 1);
          }}
          aria-label="Foto berikutnya"
          className="absolute right-1.5 top-1/2 -translate-y-1/2 z-20 w-7 h-7 rounded-full bg-black/50 hover:bg-black/75 text-white flex items-center justify-center backdrop-blur-xs transition-opacity sm:opacity-0 sm:group-hover:opacity-100 cursor-pointer"
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      )}

      {/* Bottom Pagination Dots for Swipeable Slides */}
      {hasMultiple && (
        <div
          className="absolute bottom-2 left-1/2 -translate-x-1/2 z-20 flex items-center gap-1 px-2 py-1 rounded-full bg-black/40 backdrop-blur-2xs"
          onClick={(e) => e.stopPropagation()}
        >
          {slides.map((slide, idx) => (
            <button
              key={slide.id || idx}
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                scrollToSlide(idx);
              }}
              aria-label={`Lihat foto ${idx + 1}`}
              className={`h-1.5 rounded-full transition-all cursor-pointer ${
                idx === safeIndex ? 'w-3.5 bg-white' : 'w-1.5 bg-white/55 hover:bg-white/80'
              }`}
            />
          ))}
        </div>
      )}

      {/* Custom Card Overlays (Weight Badge, Category Label, Drive Sync Icon, etc.) */}
      {children}
    </div>
  );
};
