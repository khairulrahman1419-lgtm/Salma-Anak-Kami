/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Layanan Kompresi Video Otomatis di Browser (Client-side Video Compressor)
 * Mengurangi ukuran video > 90 MB sebelum diunggah ke Cloudinary:
 * 1. Menyesuaikan resolusi ke standar 720p (maks 1280x720 / 720x1280) dengan mempertahankan rasio aspek.
 * 2. Mengatur bitrate video dinamis agar ukuran akhir turun di bawah 90 MB (target ~60-75 MB).
 * 3. Menangkap audio asli tanpa mengeluarkan suara keras di speaker perangkat saat kompresi berjalan.
 * 4. Mendukung pembatalan (AbortSignal) dan pelaporan progres real-time.
 */

export const MAX_UNCOMPRESSED_VIDEO_BYTES = 90 * 1024 * 1024; // 90 MB
export const TARGET_COMPRESSED_VIDEO_BYTES = 72 * 1024 * 1024; // ~72 MB (aman di bawah 90 MB)

export interface VideoCompressionOptions {
  onProgress?: (percent: number, statusText: string) => void;
  signal?: AbortSignal;
  targetMaxDimension?: number; // default 1280 (720p)
}

/**
 * Memeriksa apakah file video membutuhkan kompresi otomatis (> 90 MB).
 */
export function isVideoCompressionNeeded(fileOrSize: File | number, fileName?: string): boolean {
  const size = typeof fileOrSize === 'number' ? fileOrSize : fileOrSize.size;
  const isVid =
    typeof fileOrSize === 'number'
      ? Boolean(fileName && /\.(mp4|mov|webm|mkv|avi|m4v)/i.test(fileName))
      : fileOrSize.type.startsWith('video/') ||
        /\.(mp4|mov|webm|mkv|avi|m4v)/i.test(fileOrSize.name);

  return isVid && size > MAX_UNCOMPRESSED_VIDEO_BYTES;
}

/**
 * Mencari MIME type terbaik yang didukung oleh browser saat ini.
 */
function getSupportedMimeType(): string {
  if (typeof MediaRecorder === 'undefined') return '';

  const candidates = [
    'video/mp4;codecs=avc1.42E01E,mp4a.40.2',
    'video/mp4',
    'video/webm;codecs=vp9,opus',
    'video/webm;codecs=vp8,opus',
    'video/webm',
  ];

  for (const mime of candidates) {
    if (MediaRecorder.isTypeSupported(mime)) {
      return mime;
    }
  }

  return '';
}

/**
 * Mengompres video di browser menggunakan HTML5 Video, Canvas, dan MediaRecorder.
 */
export async function compressVideoInBrowser(
  videoFile: File,
  options?: VideoCompressionOptions
): Promise<File> {
  if (options?.signal?.aborted) {
    throw new Error('Kompresi video dibatalkan.');
  }

  // Jika ukuran video <= 90 MB, tidak perlu kompresi
  if (videoFile.size <= MAX_UNCOMPRESSED_VIDEO_BYTES) {
    return videoFile;
  }

  const supportedMime = getSupportedMimeType();
  if (!supportedMime) {
    console.warn('Browser tidak mendukung MediaRecorder untuk kompresi video.');
    return videoFile;
  }

  options?.onProgress?.(0, 'Mengecilkan Ukuran Video Otomatis...');

  return new Promise<File>((resolve, reject) => {
    let isCleanedUp = false;
    let videoUrl = '';
    let animFrameId: number | null = null;
    let audioCtx: AudioContext | null = null;
    let mediaRecorder: MediaRecorder | null = null;

    const video = document.createElement('video');
    video.playsInline = true;
    video.muted = false; // Tetap false agar AudioContext dapat membaca track audio
    video.volume = 1;
    video.preload = 'auto';

    const canvas = document.createElement('canvas');
    const ctx = canvas.getContext('2d', { alpha: false });

    const cleanup = () => {
      if (isCleanedUp) return;
      isCleanedUp = true;

      if (animFrameId) {
        cancelAnimationFrame(animFrameId);
        animFrameId = null;
      }

      if (mediaRecorder && mediaRecorder.state !== 'inactive') {
        try {
          mediaRecorder.stop();
        } catch {
          // ignore
        }
      }

      try {
        video.pause();
        video.removeAttribute('src');
        video.load();
      } catch {
        // ignore
      }

      if (videoUrl) {
        URL.revokeObjectURL(videoUrl);
        videoUrl = '';
      }

      if (audioCtx && audioCtx.state !== 'closed') {
        try {
          void audioCtx.close();
        } catch {
          // ignore
        }
      }

      if (options?.signal) {
        options.signal.removeEventListener('abort', onAbort);
      }
    };

    const onAbort = () => {
      cleanup();
      reject(new Error('Kompresi video dibatalkan oleh pengguna.'));
    };

    if (options?.signal) {
      options.signal.addEventListener('abort', onAbort, { once: true });
    }

    try {
      videoUrl = URL.createObjectURL(videoFile);
      video.src = videoUrl;
    } catch (err: any) {
      cleanup();
      reject(new Error(`Gagal memuat file video: ${err?.message || 'Format tidak didukung'}`));
      return;
    }

    video.onerror = () => {
      cleanup();
      reject(new Error('Format video tidak dapat diproses oleh browser untuk kompresi.'));
    };

    video.onloadedmetadata = async () => {
      if (options?.signal?.aborted) {
        cleanup();
        reject(new Error('Kompresi video dibatalkan.'));
        return;
      }

      try {
        const origWidth = video.videoWidth || 1280;
        const origHeight = video.videoHeight || 720;
        const duration = video.duration || 60;

        // Hitung skala resolusi ke standar 720p (maksimum 1280x720 / 720x1280)
        const maxDimension = options?.targetMaxDimension || 1280;
        let scale = 1;
        if (origWidth > maxDimension || origHeight > maxDimension) {
          scale = maxDimension / Math.max(origWidth, origHeight);
        }

        // Pastikan dimensi bernilai genap untuk kompatibilitas encoder video
        let targetWidth = Math.floor((origWidth * scale) / 2) * 2;
        let targetHeight = Math.floor((origHeight * scale) / 2) * 2;

        targetWidth = Math.max(320, targetWidth);
        targetHeight = Math.max(240, targetHeight);

        canvas.width = targetWidth;
        canvas.height = targetHeight;

        // Hitung target bitrate dinamis agar total ukuran video berada di ~70 MB (< 90 MB)
        // Rumus: (TargetBytes * 8) / duration = bps
        const targetBps = Math.floor((TARGET_COMPRESSED_VIDEO_BYTES * 8) / Math.max(5, duration));
        // Batasi bitrate antara 1.0 Mbps hingga 2.8 Mbps (kualitas 720p sangat jernih)
        const clampedBitrate = Math.min(2_800_000, Math.max(900_000, targetBps));

        // Siapkan Canvas Video Stream
        if (!('captureStream' in canvas)) {
          throw new Error('Canvas captureStream tidak didukung di peramban ini.');
        }

        const canvasStream = (canvas as any).captureStream(30) as MediaStream;

        // Tangkap track audio secara senyap (tanpa bunyi di speaker HP/laptop)
        let finalStream: MediaStream = canvasStream;
        try {
          const AudioContextClass =
            window.AudioContext || (window as any).webkitAudioContext;
          if (AudioContextClass) {
            audioCtx = new AudioContextClass();
            const source = audioCtx.createMediaElementSource(video);
            const destination = audioCtx.createMediaStreamDestination();
            source.connect(destination);
            // PENTING: source sengaja TIDAK disambungkan ke audioCtx.destination
            // sehingga pengguna tidak terganggu suara keras selama proses kompresi

            const audioTracks = destination.stream.getAudioTracks();
            if (audioTracks.length > 0) {
              finalStream = new MediaStream([
                ...canvasStream.getVideoTracks(),
                ...audioTracks,
              ]);
            }
          }
        } catch (audioErr) {
          console.warn('Audio capture note (melanjutkan kompresi visual):', audioErr);
        }

        // Konfigurasi MediaRecorder
        const recorderOptions: MediaRecorderOptions = {
          mimeType: supportedMime,
          videoBitsPerSecond: clampedBitrate,
        };

        mediaRecorder = new MediaRecorder(finalStream, recorderOptions);
        const recordedChunks: Blob[] = [];

        mediaRecorder.ondataavailable = (event) => {
          if (event.data && event.data.size > 0) {
            recordedChunks.push(event.data);
          }
        };

        mediaRecorder.onstop = () => {
          try {
            const isWebm = supportedMime.includes('webm');
            const fileExt = isWebm ? '.webm' : '.mp4';
            const baseName = videoFile.name.replace(/\.[^/.]+$/, '');
            const newFileName = `${baseName}_compressed${fileExt}`;

            const compressedBlob = new Blob(recordedChunks, {
              type: supportedMime.split(';')[0] || 'video/mp4',
            });

            const compressedFile = new File([compressedBlob], newFileName, {
              type: compressedBlob.type,
              lastModified: Date.now(),
            });

            cleanup();
            options?.onProgress?.(100, 'Kompresi Video Selesai');

            // Gunakan file hasil kompresi jika ukurannya berhasil turun
            if (compressedFile.size < videoFile.size) {
              resolve(compressedFile);
            } else {
              // Jika entah kenapa ukuran tidak mengecil, tetap gunakan file baru
              resolve(compressedFile);
            }
          } catch (err: any) {
            cleanup();
            reject(new Error(`Gagal merangkum file video hasil kompresi: ${err?.message}`));
          }
        };

        // Mulai perekaman
        mediaRecorder.start(250);

        // Putar video dengan akselerasi halus (1.5x) agar proses kompresi lebih cepat
        video.playbackRate = 1.5;

        // Loop penggambaran frame video ke kanvas
        const renderFrame = () => {
          if (isCleanedUp || video.paused || video.ended) return;

          if (ctx && video.readyState >= 2) {
            ctx.drawImage(video, 0, 0, targetWidth, targetHeight);
          }

          if (duration > 0) {
            const pct = Math.min(
              99,
              Math.round((video.currentTime / duration) * 100)
            );
            options?.onProgress?.(pct, 'Mengecilkan Ukuran Video Otomatis...');
          }

          animFrameId = requestAnimationFrame(renderFrame);
        };

        video.onended = () => {
          if (mediaRecorder && mediaRecorder.state !== 'inactive') {
            mediaRecorder.stop();
          }
        };

        await video.play();
        renderFrame();
      } catch (err: any) {
        cleanup();
        reject(
          new Error(
            `Gagal menjalankan kompresi video di browser: ${err?.message || 'Error tidak diketahui'}`
          )
        );
      }
    };
  });
}
