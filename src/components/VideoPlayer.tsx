import React, { useEffect, useRef, useState, useCallback } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Volume1,
  VolumeX,
  Maximize,
  Minimize,
  Download,
  Loader2,
  Video as VideoIcon,
  FastForward,
} from 'lucide-react';
import { getVideoPosterUrl, getVideoStreamingUrl } from '../utils/imageHelper.ts';
import { downloadMediaFile } from '../utils/downloadMedia.ts';

interface VideoPlayerProps {
  src: string;
  poster?: string;
  title?: string;
  autoPlay?: boolean;
  className?: string;
  onEnded?: () => void;
}

function formatVideoTime(seconds: number): string {
  if (isNaN(seconds) || seconds < 0) return '00:00';
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  const m = mins < 10 ? `0${mins}` : `${mins}`;
  const s = secs < 10 ? `0${secs}` : `${secs}`;
  return `${m}:${s}`;
}

export const VideoPlayer: React.FC<VideoPlayerProps> = ({
  src,
  poster,
  title = 'Video Momen',
  autoPlay = false,
  className = '',
  onEnded,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const progressTrackRef = useRef<HTMLDivElement>(null);
  const hideControlsTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [isPlaying, setIsPlaying] = useState(false);
  const [isBuffering, setIsBuffering] = useState(false);
  const [hasStartedPlaying, setHasStartedPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [bufferedEnd, setBufferedEnd] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [showControls, setShowControls] = useState(true);
  const [hoverSeekTime, setHoverSeekTime] = useState<number | null>(null);
  const [hoverSeekPos, setHoverSeekPos] = useState<number>(0);
  const [hasError, setHasError] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [clickIndicator, setClickIndicator] = useState<'play' | 'pause' | null>(null);

  const resolvedPoster = poster || getVideoPosterUrl(src);
  const streamingUrl = getVideoStreamingUrl(src);

  // Auto-hide controls timer
  const resetControlsTimeout = useCallback(() => {
    setShowControls(true);
    if (hideControlsTimeoutRef.current) {
      clearTimeout(hideControlsTimeoutRef.current);
    }
    if (isPlaying) {
      hideControlsTimeoutRef.current = setTimeout(() => {
        setShowControls(false);
      }, 2600);
    }
  }, [isPlaying]);

  useEffect(() => {
    resetControlsTimeout();
    return () => {
      if (hideControlsTimeoutRef.current) {
        clearTimeout(hideControlsTimeoutRef.current);
      }
    };
  }, [isPlaying, resetControlsTimeout]);

  // Sync fullscreen change event
  useEffect(() => {
    const handleFullscreenChange = () => {
      const isCurrFullscreen = Boolean(
        document.fullscreenElement ||
          (document as any).webkitFullscreenElement ||
          (document as any).mozFullScreenElement
      );
      setIsFullscreen(isCurrFullscreen);
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
      document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
    };
  }, []);

  // Update buffered progress
  const updateBuffered = () => {
    const video = videoRef.current;
    if (!video || video.buffered.length === 0) return;
    try {
      const end = video.buffered.end(video.buffered.length - 1);
      setBufferedEnd(end);
    } catch {
      // ignore
    }
  };

  const togglePlay = useCallback(() => {
    const video = videoRef.current;
    if (!video) return;

    if (video.paused || video.ended) {
      video
        .play()
        .then(() => {
          setIsPlaying(true);
          setHasStartedPlaying(true);
          setClickIndicator('play');
          setTimeout(() => setClickIndicator(null), 500);
        })
        .catch((err) => {
          console.warn('Gagal memutar video:', err);
          // Bila diblokir browser karena audio, coba mute lalu putar
          video.muted = true;
          setIsMuted(true);
          video.play().then(() => {
            setIsPlaying(true);
            setHasStartedPlaying(true);
          });
        });
    } else {
      video.pause();
      setIsPlaying(false);
      setClickIndicator('pause');
      setTimeout(() => setClickIndicator(null), 500);
    }
  }, []);

  const handleSeek = (e: React.MouseEvent<HTMLDivElement> | React.TouchEvent<HTMLDivElement>) => {
    e.stopPropagation();
    const track = progressTrackRef.current;
    const video = videoRef.current;
    if (!track || !video || !duration) return;

    const rect = track.getBoundingClientRect();
    const clientX = 'touches' in e ? e.touches[0].clientX : e.clientX;
    const clickX = Math.max(0, Math.min(rect.width, clientX - rect.left));
    const targetTime = (clickX / rect.width) * duration;

    video.currentTime = targetTime;
    setCurrentTime(targetTime);
  };

  const handleSeekMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const track = progressTrackRef.current;
    if (!track || !duration) return;
    const rect = track.getBoundingClientRect();
    const pos = Math.max(0, Math.min(rect.width, e.clientX - rect.left));
    const time = (pos / rect.width) * duration;
    setHoverSeekPos((pos / rect.width) * 100);
    setHoverSeekTime(time);
  };

  const toggleMute = () => {
    const video = videoRef.current;
    if (!video) return;
    const nextMuted = !video.muted;
    video.muted = nextMuted;
    setIsMuted(nextMuted);
    if (!nextMuted && volume === 0) {
      video.volume = 0.5;
      setVolume(0.5);
    }
  };

  const handleVolumeChange = (newVol: number) => {
    const video = videoRef.current;
    if (!video) return;
    const clamped = Math.max(0, Math.min(1, newVol));
    video.volume = clamped;
    setVolume(clamped);
    if (clamped === 0) {
      video.muted = true;
      setIsMuted(true);
    } else if (video.muted) {
      video.muted = false;
      setIsMuted(false);
    }
  };

  const toggleFullscreen = async () => {
    const container = containerRef.current;
    if (!container) return;

    if (!isFullscreen) {
      try {
        if (container.requestFullscreen) {
          await container.requestFullscreen();
        } else if ((container as any).webkitRequestFullscreen) {
          await (container as any).webkitRequestFullscreen();
        }
      } catch (err) {
        console.warn('Gagal fullscreen:', err);
      }
    } else {
      try {
        if (document.exitFullscreen) {
          await document.exitFullscreen();
        } else if ((document as any).webkitExitFullscreen) {
          await (document as any).webkitExitFullscreen();
        }
      } catch (err) {
        console.warn('Gagal keluar fullscreen:', err);
      }
    }
  };

  const cyclePlaybackRate = () => {
    const video = videoRef.current;
    if (!video) return;
    const rates = [1, 1.25, 1.5, 2, 0.75];
    const currIdx = rates.indexOf(playbackRate);
    const nextRate = rates[(currIdx + 1) % rates.length];
    video.playbackRate = nextRate;
    setPlaybackRate(nextRate);
  };

  const handleDownload = () => {
    void downloadMediaFile(src, title, 'video');
  };

  // Keyboard controls
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    const video = videoRef.current;
    if (!video) return;

    if (e.key === ' ' || e.key === 'k') {
      e.preventDefault();
      togglePlay();
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      video.currentTime = Math.max(0, video.currentTime - 5);
    } else if (e.key === 'ArrowRight') {
      e.preventDefault();
      video.currentTime = Math.min(duration, video.currentTime + 5);
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      handleVolumeChange(volume + 0.1);
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      handleVolumeChange(volume - 0.1);
    } else if (e.key === 'm' || e.key === 'M') {
      e.preventDefault();
      toggleMute();
    } else if (e.key === 'f' || e.key === 'F') {
      e.preventDefault();
      void toggleFullscreen();
    }
  };

  const progressPercent = duration > 0 ? (currentTime / duration) * 100 : 0;
  const bufferedPercent = duration > 0 ? (bufferedEnd / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      onKeyDown={handleKeyDown}
      onMouseMove={resetControlsTimeout}
      onTouchStart={resetControlsTimeout}
      className={`relative group bg-black overflow-hidden flex items-center justify-center select-none outline-none ${className}`}
    >
      {/* HTML5 Video Tag with Auto-Streaming Optimization */}
      <video
        ref={videoRef}
        playsInline
        preload="auto"
        autoPlay={autoPlay}
        poster={resolvedPoster || undefined}
        onTimeUpdate={() => {
          if (videoRef.current) {
            setCurrentTime(videoRef.current.currentTime);
            updateBuffered();
          }
        }}
        onDurationChange={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || 0);
          }
        }}
        onLoadedMetadata={() => {
          if (videoRef.current) {
            setDuration(videoRef.current.duration || 0);
            updateBuffered();
          }
        }}
        onWaiting={() => setIsBuffering(true)}
        onPlaying={() => {
          setIsBuffering(false);
          setIsPlaying(true);
          setHasStartedPlaying(true);
        }}
        onPause={() => setIsPlaying(false)}
        onEnded={() => {
          setIsPlaying(false);
          onEnded?.();
        }}
        onError={(e) => {
          console.warn('Video load error:', e);
          setHasError(true);
          setErrorMessage('Gagal memuat format video. Anda tetap dapat mengunduhnya secara langsung.');
        }}
        onClick={togglePlay}
        className="w-full h-full max-h-[72vh] object-contain cursor-pointer"
      >
        <source src={streamingUrl} type="video/mp4" />
        <source src={src} />
        Browser Anda tidak mendukung pemutar video HTML5.
      </video>

      {/* Buffering Indicator */}
      {isBuffering && (
        <div className="absolute inset-0 flex items-center justify-center bg-black/30 backdrop-blur-2xs pointer-events-none z-20">
          <div className="w-14 h-14 rounded-full bg-black/70 border border-white/20 text-emerald-400 flex items-center justify-center shadow-lg">
            <Loader2 className="w-7 h-7 animate-spin" />
          </div>
        </div>
      )}

      {/* Center Action Ripple Flash Indicator */}
      {clickIndicator && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-20">
          <div className="w-16 h-16 rounded-full bg-black/70 text-white flex items-center justify-center animate-ping duration-300">
            {clickIndicator === 'play' ? (
              <Play className="w-8 h-8 fill-current ml-1" />
            ) : (
              <Pause className="w-8 h-8 fill-current" />
            )}
          </div>
        </div>
      )}

      {/* Large Center Play / Replay Button when Paused */}
      {!isPlaying && !isBuffering && (
        <div
          onClick={togglePlay}
          className="absolute inset-0 flex flex-col items-center justify-center cursor-pointer z-10 bg-black/25 hover:bg-black/40 transition-colors"
        >
          <div className="relative group/btn">
            {/* Animated Glow Ring */}
            <div className="absolute -inset-2 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full blur-md opacity-70 group-hover/btn:opacity-100 transition duration-300 animate-pulse" />
            
            <button
              type="button"
              aria-label={currentTime >= duration && duration > 0 ? 'Putar Ulang' : 'Putar Video'}
              className="relative w-16 h-16 sm:w-20 sm:h-20 rounded-full bg-slate-900/90 border-2 border-white/80 text-white flex items-center justify-center shadow-2xl transition-transform duration-200 group-hover/btn:scale-110 active:scale-95"
            >
              {currentTime >= duration && duration > 0 ? (
                <RotateCcw className="w-8 h-8 text-emerald-300" />
              ) : (
                <Play className="w-8 h-8 sm:w-9 sm:h-9 fill-white text-white ml-1.5" />
              )}
            </button>
          </div>

          <span className="mt-3 px-3 py-1 rounded-full bg-black/75 backdrop-blur-xs text-white text-xs font-semibold tracking-wide border border-white/10 shadow-md">
            {currentTime >= duration && duration > 0 ? 'Putar Ulang Video' : 'Ketuk untuk Memutar Video'}
          </span>
        </div>
      )}

      {/* Error State Banner */}
      {hasError && (
        <div className="absolute inset-0 flex flex-col items-center justify-center bg-slate-950/90 p-4 text-center z-30 space-y-3">
          <div className="w-12 h-12 rounded-full bg-rose-500/20 text-rose-400 flex items-center justify-center border border-rose-500/30">
            <VideoIcon className="w-6 h-6" />
          </div>
          <div>
            <h4 className="text-sm font-bold text-white">Video Sedang Diproses</h4>
            <p className="text-xs text-slate-400 max-w-sm mt-1">{errorMessage}</p>
          </div>
          <div className="flex items-center gap-2 pt-1">
            <button
              type="button"
              onClick={handleDownload}
              className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold flex items-center gap-1.5 shadow-md cursor-pointer"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Unduh Video Langsung</span>
            </button>
            <a
              href={src}
              target="_blank"
              rel="noreferrer"
              className="px-3 py-1.5 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold border border-white/10 cursor-pointer"
            >
              Buka di Tab Baru
            </a>
          </div>
        </div>
      )}

      {/* Modern Glassmorphic Bottom Control Bar */}
      <div
        onClick={(e) => e.stopPropagation()}
        className={`absolute bottom-0 left-0 right-0 z-30 bg-gradient-to-t from-black/90 via-black/60 to-transparent pt-8 pb-3 px-3 sm:px-4 transition-opacity duration-300 flex flex-col gap-2 ${
          showControls || !isPlaying ? 'opacity-100' : 'opacity-0 pointer-events-none'
        }`}
      >
        {/* Interactive Scrubber / Seek Progress Bar */}
        <div
          ref={progressTrackRef}
          onClick={handleSeek}
          onMouseMove={handleSeekMouseMove}
          onMouseLeave={() => setHoverSeekTime(null)}
          className="relative w-full h-2.5 sm:h-3 group/track cursor-pointer flex items-center"
        >
          {/* Background Track */}
          <div className="w-full h-1 sm:h-1.5 rounded-full bg-white/20 overflow-hidden relative group-hover/track:h-2 transition-all">
            {/* Loaded Buffered Bar */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-white/30 rounded-full transition-all"
              style={{ width: `${Math.min(100, bufferedPercent)}%` }}
            />
            {/* Played Progress Bar with Emerald Gradient */}
            <div
              className="absolute top-0 bottom-0 left-0 bg-gradient-to-r from-emerald-500 to-teal-400 rounded-full transition-all"
              style={{ width: `${Math.min(100, progressPercent)}%` }}
            />
          </div>

          {/* Hover Time Tooltip */}
          {hoverSeekTime !== null && (
            <div
              className="absolute -top-7 -translate-x-1/2 px-2 py-0.5 rounded-md bg-black/90 border border-white/20 text-white text-[10px] font-mono pointer-events-none shadow-md"
              style={{ left: `${hoverSeekPos}%` }}
            >
              {formatVideoTime(hoverSeekTime)}
            </div>
          )}

          {/* Draggable Progress Thumb */}
          <div
            className="absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3.5 h-3.5 rounded-full bg-white shadow-md border-2 border-emerald-500 scale-0 group-hover/track:scale-100 transition-transform"
            style={{ left: `${Math.min(100, progressPercent)}%` }}
          />
        </div>

        {/* Buttons and Time Row */}
        <div className="flex items-center justify-between text-white text-xs gap-2">
          {/* Left Controls: Play/Pause, Replay, Time */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button
              type="button"
              onClick={togglePlay}
              title={isPlaying ? 'Jeda (Spasi)' : 'Putar (Spasi)'}
              aria-label={isPlaying ? 'Jeda video' : 'Putar video'}
              className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors cursor-pointer text-white"
            >
              {isPlaying ? (
                <Pause className="w-4 h-4 fill-current" />
              ) : currentTime >= duration && duration > 0 ? (
                <RotateCcw className="w-4 h-4" />
              ) : (
                <Play className="w-4 h-4 fill-current ml-0.5" />
              )}
            </button>

            {/* Time Stamp (e.g. 00:14 / 00:26) */}
            <div className="text-[11px] font-mono text-slate-200 tracking-tight tabular-nums flex items-center gap-1">
              <span className="font-bold text-white">{formatVideoTime(currentTime)}</span>
              <span className="text-slate-400">/</span>
              <span className="text-slate-300">{formatVideoTime(duration)}</span>
            </div>
          </div>

          {/* Right Controls: Volume, Speed, Download, Fullscreen */}
          <div className="flex items-center gap-1 sm:gap-2">
            {/* Volume & Mute with Hover Slider */}
            <div className="group/vol relative flex items-center">
              <button
                type="button"
                onClick={toggleMute}
                title={isMuted ? 'Nyalakan Suara (M)' : 'Bisukan Suara (M)'}
                aria-label={isMuted ? 'Nyalakan suara' : 'Bisukan suara'}
                className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors cursor-pointer text-white"
              >
                {isMuted || volume === 0 ? (
                  <VolumeX className="w-4 h-4 text-rose-400" />
                ) : volume < 0.5 ? (
                  <Volume1 className="w-4 h-4" />
                ) : (
                  <Volume2 className="w-4 h-4" />
                )}
              </button>

              {/* Slider for volume */}
              <input
                type="range"
                min="0"
                max="1"
                step="0.05"
                value={isMuted ? 0 : volume}
                onChange={(e) => handleVolumeChange(parseFloat(e.target.value))}
                aria-label="Pengaturan volume suara"
                className="w-0 group-hover/vol:w-16 transition-all duration-200 h-1 accent-emerald-400 bg-white/30 rounded-lg cursor-pointer overflow-hidden group-hover/vol:mr-2"
              />
            </div>

            {/* Playback Rate Cycler */}
            <button
              type="button"
              onClick={cyclePlaybackRate}
              title="Kecepatan Pemutaran"
              aria-label="Kecepatan pemutaran"
              className="px-2 py-1 rounded-md text-[10px] font-bold font-mono hover:bg-white/15 text-slate-200 hover:text-white transition-colors cursor-pointer border border-white/15"
            >
              {playbackRate}x
            </button>

            {/* Download Video Shortcut */}
            <button
              type="button"
              onClick={handleDownload}
              title="Unduh file video ini"
              aria-label="Unduh video"
              className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors cursor-pointer text-white"
            >
              <Download className="w-4 h-4 text-emerald-300" />
            </button>

            {/* Fullscreen Button */}
            <button
              type="button"
              onClick={() => void toggleFullscreen()}
              title={isFullscreen ? 'Keluar Layar Penuh (F)' : 'Layar Penuh (F)'}
              aria-label={isFullscreen ? 'Keluar layar penuh' : 'Layar penuh'}
              className="w-8 h-8 rounded-full hover:bg-white/15 flex items-center justify-center transition-colors cursor-pointer text-white"
            >
              {isFullscreen ? (
                <Minimize className="w-4 h-4" />
              ) : (
                <Maximize className="w-4 h-4" />
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
