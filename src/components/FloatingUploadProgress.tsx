/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Floating Background Upload Progress Widget
 * Menampilkan progres unggah real-time di pojok layar (Non-Blocking UI),
 * lengkap dengan indikator byte demi byte, alur fallback Cloudinary -> Firebase Storage,
 * tombol "Batal", dan tombol "Coba Lagi" apabila koneksi terputus.
 */

import React, { useEffect, useState } from 'react';
import {
  Upload,
  Video,
  Image as ImageIcon,
  CheckCircle2,
  AlertTriangle,
  RotateCcw,
  X,
  Cloud,
  HardDrive,
  Loader2,
} from 'lucide-react';
import {
  backgroundUploadManager,
  type BackgroundUploadTask,
  formatByteSize,
} from '../services/backgroundUploadManager.ts';

export const FloatingUploadProgress: React.FC = () => {
  const [tasks, setTasks] = useState<BackgroundUploadTask[]>([]);

  useEffect(() => {
    const unsub = backgroundUploadManager.subscribe((allTasks) => {
      setTasks(allTasks);
    });
    return unsub;
  }, []);

  if (tasks.length === 0) {
    return null;
  }

  return (
    <div
      aria-live="polite"
      className="fixed bottom-24 sm:bottom-6 right-3 sm:right-6 z-50 flex flex-col gap-2.5 max-w-sm w-[calc(100vw-1.5rem)] sm:w-[380px] pointer-events-none select-none"
    >
      {tasks.map((task) => {
        const isVideo = task.payload.slides.some((s) => s.mediaType === 'video');
        const isUploading =
          task.status === 'uploading' ||
          task.status === 'fallback_storage' ||
          task.status === 'saving_firestore';
        const isCompleted = task.status === 'completed';
        const isError = task.status === 'error';
        const isCancelled = task.status === 'cancelled';

        return (
          <div
            key={task.id}
            className={`pointer-events-auto bg-[#FFFDF9] rounded-2xl border p-3.5 sm:p-4 shadow-xl transition-all duration-300 animate-in slide-in-from-bottom-3 ${
              isCompleted
                ? 'border-emerald-300 bg-emerald-50/60 shadow-emerald-500/10'
                : isError
                ? 'border-rose-300 bg-rose-50/60 shadow-rose-500/10'
                : isCancelled
                ? 'border-slate-300 bg-slate-50'
                : 'border-[#EAE4D7] shadow-slate-900/10'
            }`}
          >
            {/* Header: Icon, Title & Provider Badge */}
            <div className="flex items-start justify-between gap-2 mb-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div
                  className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    isCompleted
                      ? 'bg-emerald-100 text-emerald-700'
                      : isError
                      ? 'bg-rose-100 text-rose-700'
                      : isCancelled
                      ? 'bg-slate-200 text-slate-700'
                      : 'bg-teal-100 text-teal-800'
                  }`}
                >
                  {isCompleted ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : isError ? (
                    <AlertTriangle className="w-4 h-4" />
                  ) : isUploading ? (
                    isVideo ? (
                      <Video className="w-4 h-4 animate-pulse" />
                    ) : (
                      <ImageIcon className="w-4 h-4 animate-pulse" />
                    )
                  ) : (
                    <Upload className="w-4 h-4" />
                  )}
                </div>

                <div className="min-w-0">
                  <h4 className="text-xs font-bold text-slate-900 truncate">
                    {task.title || (isVideo ? 'Momen Video Baru' : 'Momen Foto Baru')}
                  </h4>
                  <div className="flex items-center gap-1.5 flex-wrap text-[10px] text-slate-500">
                    {isUploading && (
                      <span className="inline-flex items-center gap-1 font-semibold text-teal-700">
                        <Loader2 className="w-2.5 h-2.5 animate-spin" />
                        Unggah Latar Belakang
                      </span>
                    )}
                    {task.provider === 'firebase_storage' && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-amber-100 text-amber-800 font-bold border border-amber-200">
                        <HardDrive className="w-2.5 h-2.5" />
                        Firebase Storage
                      </span>
                    )}
                    {task.provider === 'cloudinary' && isUploading && (
                      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.2 rounded-md bg-sky-100 text-sky-800 font-bold border border-sky-200">
                        <Cloud className="w-2.5 h-2.5" />
                        Cloudinary
                      </span>
                    )}
                    {isCompleted && (
                      <span className="text-emerald-700 font-bold">✓ Tersinkronisasi</span>
                    )}
                    {isError && (
                      <span className="text-rose-700 font-bold">Gagal Mengunggah</span>
                    )}
                    {isCancelled && (
                      <span className="text-slate-600 font-medium">Dibatalkan</span>
                    )}
                  </div>
                </div>
              </div>

              {/* Close / Dismiss Button */}
              {(isCompleted || isError || isCancelled) && (
                <button
                  type="button"
                  onClick={() => backgroundUploadManager.dismissTask(task.id)}
                  title="Tutup indikator"
                  className="w-6 h-6 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-200/60 flex items-center justify-center transition-colors cursor-pointer"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              )}
            </div>

            {/* Real-time Status Message (e.g., Mengunggah Video: 45.2 MB / 150 MB (30%)) */}
            <p className="text-[11px] font-medium text-slate-700 truncate mb-2">
              {task.statusMessage}
            </p>

            {/* Progress Bar (when uploading) */}
            {isUploading && (
              <div className="space-y-1.5">
                <div className="w-full h-2 rounded-full bg-slate-200/80 overflow-hidden">
                  <div
                    className="h-full bg-gradient-to-r from-teal-500 to-emerald-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.max(4, task.overallPercent)}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-[10px] text-slate-500 font-mono">
                  <span>
                    {task.totalSlides > 1
                      ? `Slide ${task.currentSlideIndex + 1} dari ${task.totalSlides}`
                      : isVideo
                      ? 'Video Momen'
                      : 'Foto Momen'}
                  </span>
                  <span className="font-bold text-slate-800">{task.overallPercent}%</span>
                </div>
              </div>
            )}

            {/* Action Buttons: Batal & Coba Lagi */}
            <div className="flex items-center justify-end gap-2 mt-2.5 pt-2 border-t border-[#EAE4D7]/70">
              {isUploading && (
                <button
                  type="button"
                  onClick={() => backgroundUploadManager.cancelTask(task.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-rose-700 hover:bg-rose-100/80 border border-rose-200 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <X className="w-3 h-3" />
                  <span>Batal</span>
                </button>
              )}

              {isError && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => backgroundUploadManager.dismissTask(task.id)}
                    className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-slate-600 hover:bg-slate-100 border border-slate-200 transition-colors cursor-pointer"
                  >
                    Tutup
                  </button>
                  <button
                    type="button"
                    onClick={() => backgroundUploadManager.retryTask(task.id)}
                    className="px-3 py-1 rounded-lg text-[11px] font-bold text-white bg-teal-600 hover:bg-teal-700 shadow-xs transition-colors cursor-pointer flex items-center gap-1.5"
                  >
                    <RotateCcw className="w-3 h-3" />
                    <span>Coba Lagi</span>
                  </button>
                </div>
              )}

              {isCancelled && (
                <button
                  type="button"
                  onClick={() => backgroundUploadManager.retryTask(task.id)}
                  className="px-2.5 py-1 rounded-lg text-[11px] font-semibold text-teal-800 hover:bg-teal-100 border border-teal-200 transition-colors cursor-pointer flex items-center gap-1"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Mulai Ulang</span>
                </button>
              )}

              {isCompleted && (
                <span className="text-[10px] font-semibold text-emerald-800">
                  Tersimpan di Cloud &amp; Siap Ditonton
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};
