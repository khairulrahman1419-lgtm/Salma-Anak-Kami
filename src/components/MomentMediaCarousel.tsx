import React, { useRef, useState, useEffect } from 'react';
import {
  ChevronLeft,
  ChevronRight,
  Video,
  Play,
  Pause,
  Volume2,
  VolumeX,
  Maximize,
} from 'lucide-react';
import type { MomentItem, MomentMediaSlide } from '../types/index.ts';
import {
  getMomentMediaSlides,
  getVideoPosterUrl,
  getVideoStreamingUrl,
} from '../utils/imageHelper.ts';

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
  const videoRefsMap = useRef<Record<string | number, HTMLVideoElement | null>>({});
  const pointerStartXRef = useRef<number | null>(null);
  const didSwipeDragRef = useRef<boolean>(false);

  const [activeIndex, setActiveIndex] = useState(0);
  const [playingSlideId, setPlayingSlideId] = useState<string | number | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [videoProgress, setVideoProgress] = useState(0);

  const safeIndex = Math.min(activeIndex, slides.length - 1);
  const currentSlide = slides[safeIndex] || slides[0];

  const pauseAllVideos = () => {
    Object.values(videoRefsMap.current).forEach((v) => {
      if (v && !v.paused) {
        v.pause();
      }
    });
    setPlayingSlideId(null);
  };

  useEffect(() => {
    return () => {
      pauseAllVideos();
    };
  }, []);

  const scrollToSlide = (targetIdx: number) => {
    pauseAllVideos();
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
      pauseAllVideos();
      setActiveIndex(clamped);
      onActiveSlideChange?.(clamped, slides[clamped]);
    }
  };

  const startInlinePlayback = (id: string | number) => {
    pauseAllVideos();
    const v = videoRefsMap.current[id];
    if (v) {
      v.play()
        .then(() => {
          setPlayingSlideId(id);
        })
        .catch(() => {
          v.muted = true;
          setIsMuted(true);
          v.play().then(() => setPlayingSlideId(id));
        });
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
      pauseAllVideos();
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
        {slides.map((slide, idx) => {
          const slideKey = slide.id || idx;
          const isCurrentSlidePlaying = playingSlideId === slideKey;
          const posterUrl = getVideoPosterUrl(slide.url);
          const streamUrl = getVideoStreamingUrl(slide.url);

          return (
            <div
              key={slideKey}
              className="w-full h-full shrink-0 snap-center snap-always relative overflow-hidden"
            >
              {slide.mediaType === 'video' ? (
                <div className="w-full h-full relative overflow-hidden bg-slate-950 flex items-center justify-center">
                  <video
                    ref={(el) => {
                      videoRefsMap.current[slideKey] = el;
                    }}
                    poster={posterUrl || undefined}
                    muted={isMuted}
                    controls
                    playsInline
                    preload="metadata"
                    {...({ 'webkit-playsinline': 'true' } as any)}
                    onTimeUpdate={(e) => {
                      const v = e.currentTarget;
                      if (v.duration > 0) {
                        setVideoProgress((v.currentTime / v.duration) * 100);
                      }
                    }}
                    onEnded={() => {
                      setPlayingSlideId(null);
                      setVideoProgress(0);
                    }}
                    className="w-full h-full object-cover"
                  >
                    <source src={streamUrl} type="video/mp4" />
                    <source src={slide.url} type="video/mp4" />
                    <source src={slide.url} type="video/quicktime" />
                    <source src={slide.url} />
                  </video>

                  {/* Inline Active Player Overlay */}
                  {isCurrentSlidePlaying ? (
                    <div
                      onClick={(e) => e.stopPropagation()}
                      className="absolute inset-0 z-20 flex flex-col justify-between p-2.5 bg-gradient-to-t from-black/85 via-transparent to-black/60 pointer-events-auto"
                    >
                      {/* Top Bar: Live Playing Indicator, Mute Toggle & Fullscreen Button */}
                      <div className="flex items-center justify-between">
                        <span className="px-2 py-0.5 rounded-full bg-emerald-600/90 text-white text-[10px] font-bold flex items-center gap-1 backdrop-blur-xs shadow-xs">
                          <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                          <span>Video Diputar</span>
                        </span>

                        <div className="flex items-center gap-1">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const v = videoRefsMap.current[slideKey];
                              const nextMuted = !isMuted;
                              if (v) v.muted = nextMuted;
                              setIsMuted(nextMuted);
                            }}
                            title={isMuted ? 'Nyalakan Suara' : 'Bisukan Suara'}
                            aria-label={isMuted ? 'Nyalakan suara' : 'Bisukan suara'}
                            className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                          >
                            {isMuted ? (
                              <VolumeX className="w-3.5 h-3.5 text-rose-300" />
                            ) : (
                              <Volume2 className="w-3.5 h-3.5 text-emerald-300" />
                            )}
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              pauseAllVideos();
                              onTapSlide?.(idx, slide);
                            }}
                            title="Buka Layar Penuh"
                            aria-label="Buka layar penuh"
                            className="w-7 h-7 rounded-full bg-black/60 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs transition-colors cursor-pointer"
                          >
                            <Maximize className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>

                      {/* Bottom Bar: Pause Button & Timeline Progress */}
                      <div className="space-y-1.5">
                        <div className="w-full h-1 bg-white/30 rounded-full overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-emerald-400 to-teal-300 transition-all"
                            style={{ width: `${Math.min(100, videoProgress)}%` }}
                          />
                        </div>
                        <div className="flex items-center justify-between">
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              const v = videoRefsMap.current[slideKey];
                              if (v) {
                                v.pause();
                                setPlayingSlideId(null);
                              }
                            }}
                            className="px-2 py-0.5 rounded-md bg-black/70 hover:bg-black/90 text-white text-[10px] font-bold flex items-center gap-1 cursor-pointer transition-colors"
                          >
                            <Pause className="w-3 h-3 fill-current" />
                            <span>Jeda</span>
                          </button>

                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              pauseAllVideos();
                              onTapSlide?.(idx, slide);
                            }}
                            className="text-[10px] font-bold text-emerald-300 hover:text-white transition-colors cursor-pointer"
                          >
                            Detail &amp; Kontrol Penuh &rarr;
                          </button>
                        </div>
                      </div>
                    </div>
                  ) : (
                    /* Inactive State: Prominent Center Play Button */
                    <div
                      onClick={(e) => {
                        e.stopPropagation();
                        startInlinePlayback(slideKey);
                      }}
                      className="absolute inset-0 z-10 flex flex-col items-center justify-center cursor-pointer bg-black/30 hover:bg-black/50 transition-colors group/play"
                    >
                      <div className="relative">
                        <div className="absolute -inset-1.5 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full blur-xs opacity-75 group-hover/play:opacity-100 transition duration-200 animate-pulse" />
                        
                        <div className="relative w-11 h-11 sm:w-13 sm:h-13 rounded-full bg-slate-900/90 border border-white/90 text-white flex items-center justify-center shadow-lg transition-transform group-hover/play:scale-110 active:scale-95">
                          <Play className="w-5 h-5 sm:w-6 sm:h-6 fill-white text-white ml-0.5" />
                        </div>
                      </div>

                      <span className="mt-2 px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-xs text-white text-[10px] font-bold border border-white/10 shadow-xs flex items-center gap-1">
                        <span>Putar Video</span>
                      </span>
                    </div>
                  )}
                </div>
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
          );
        })}
      </div>

      {/* Video Indicator when active slide is a video and not currently playing */}
      {currentSlide?.mediaType === 'video' && playingSlideId === null && (
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
