/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Background Upload Manager ("salma-anak-kami")
 * Mengelola proses pengunggahan media & video besar di latar belakang (Non-Blocking UI):
 * 1. Menutup modal unggah seketika tanpa menahan interaksi pengguna di layar.
 * 2. Melacak progres unggah real-time (byte demi byte, slide demi slide).
 * 3. Alur otomatis Cloudinary -> Seamless fallback ke Firebase Storage (uploadBytesResumable).
 * 4. Mendukung pembatalan ("Batal"), coba lagi ("Coba Lagi"), dan pembaruan galeri otomatis.
 */

import type { UploadTask } from 'firebase/storage';
import { uploadChildMediaOnline } from './mediaFirebaseStorage.ts';
import { syncMomentToFirestore, syncGrowthToFirestore } from './firestoreSync.ts';
import { uploadMediaToGoogleDrive } from './googleDriveClient.ts';
import type {
  ChildProfile,
  GrowthRecord,
  MomentCategory,
  MomentItem,
  MomentMediaSlide,
} from '../types/index.ts';

export type BackgroundTaskStatus =
  | 'uploading'
  | 'fallback_storage'
  | 'saving_firestore'
  | 'completed'
  | 'error'
  | 'cancelled';

export interface BackgroundUploadDraftSlide {
  id: string;
  file?: File;
  previewUrl: string;
  mediaType: 'image' | 'video';
  fileName?: string;
  fileSize?: number;
}

export interface BackgroundUploadPayload {
  momentDraft: {
    id?: string;
    title: string;
    date: string;
    category: MomentCategory;
    notes: string;
    weightKg?: number;
    heightCm?: number;
    headCircumferenceCm?: number;
    storageDestination?: 'cloudinary_firestore' | 'google_drive' | 'vps_local';
    accessToken?: string | null;
  };
  slides: BackgroundUploadDraftSlide[];
  isEditing?: boolean;
  editingMoment?: MomentItem | null;
  childProfile: ChildProfile;
  activeJournalId: string;
}

export interface BackgroundUploadTask {
  id: string;
  title: string;
  status: BackgroundTaskStatus;
  currentSlideIndex: number;
  totalSlides: number;
  currentSlideProgress: number; // 0 - 100
  currentLoadedBytes: number;
  currentTotalBytes: number;
  overallLoadedBytes: number;
  overallTotalBytes: number;
  overallPercent: number; // 0 - 100
  statusMessage: string;
  provider: 'cloudinary' | 'firebase_storage' | 'google_drive';
  errorMessage?: string;
  payload: BackgroundUploadPayload;
  resultMoment?: MomentItem;
  createdAt: number;
  completedAt?: number;
}

export function formatByteSize(bytes?: number): string {
  if (!bytes || bytes <= 0) return '0 B';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

type TaskListener = (tasks: BackgroundUploadTask[]) => void;
type MomentSavedCallback = (moment: MomentItem, isEditing: boolean) => void;
type GrowthRecordSavedCallback = (record: GrowthRecord) => void;

class BackgroundUploadManager {
  private tasks: Map<string, BackgroundUploadTask> = new Map();
  private abortControllers: Map<string, AbortController> = new Map();
  private firebaseUploadTasks: Map<string, UploadTask> = new Map();
  private listeners: Set<TaskListener> = new Set();
  private onMomentSavedCallback: MomentSavedCallback | null = null;
  private onGrowthRecordSavedCallback: GrowthRecordSavedCallback | null = null;

  public registerCallbacks(callbacks: {
    onMomentSaved: MomentSavedCallback;
    onGrowthSaved?: GrowthRecordSavedCallback;
  }) {
    this.onMomentSavedCallback = callbacks.onMomentSaved;
    if (callbacks.onGrowthSaved) {
      this.onGrowthRecordSavedCallback = callbacks.onGrowthSaved;
    }
  }

  public subscribe(listener: TaskListener): () => void {
    this.listeners.add(listener);
    listener(this.getAllTasks());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private notify() {
    const list = this.getAllTasks();
    this.listeners.forEach((fn) => {
      try {
        fn(list);
      } catch (err) {
        console.error('Upload listener error:', err);
      }
    });
  }

  public getAllTasks(): BackgroundUploadTask[] {
    return Array.from(this.tasks.values()).sort((a, b) => b.createdAt - a.createdAt);
  }

  public getTask(id: string): BackgroundUploadTask | undefined {
    return this.tasks.get(id);
  }

  /**
   * Memulai proses pengunggahan di latar belakang secara asinkron (non-blocking).
   */
  public startUpload(payload: BackgroundUploadPayload): string {
    const taskId = `task_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const abortController = new AbortController();
    this.abortControllers.set(taskId, abortController);

    // Hitung estimasi total byte untuk seluruh slide
    const totalBytesEstimate = payload.slides.reduce((acc, slide) => {
      return acc + (slide.file?.size || slide.fileSize || 500 * 1024);
    }, 0);

    const isVideo = payload.slides.some((s) => s.mediaType === 'video');
    const mediaLabel = isVideo ? 'Video' : 'Foto';

    const task: BackgroundUploadTask = {
      id: taskId,
      title: payload.momentDraft.title || `Momen ${payload.childProfile.nickname}`,
      status: 'uploading',
      currentSlideIndex: 0,
      totalSlides: payload.slides.length,
      currentSlideProgress: 0,
      currentLoadedBytes: 0,
      currentTotalBytes: payload.slides[0]?.file?.size || 0,
      overallLoadedBytes: 0,
      overallTotalBytes: totalBytesEstimate,
      overallPercent: 0,
      statusMessage: `Menyiapkan pengunggahan ${mediaLabel.toLowerCase()}...`,
      provider: 'cloudinary',
      payload,
      createdAt: Date.now(),
    };

    this.tasks.set(taskId, task);
    this.notify();

    // Jalankan siklus pengunggahan secara non-blocking di latar belakang
    void this.executeUploadTask(taskId, payload, abortController.signal);

    return taskId;
  }

  private async executeUploadTask(
    taskId: string,
    payload: BackgroundUploadPayload,
    signal: AbortSignal
  ) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    try {
      const slides = payload.slides;
      const uploadedSlides: MomentMediaSlide[] = [];
      const slideBytesLoaded: number[] = new Array(slides.length).fill(0);

      for (let i = 0; i < slides.length; i++) {
        if (signal.aborted) {
          throw new Error('Pengunggahan dibatalkan oleh pengguna.');
        }

        const slide = slides[i];
        const isVideo = slide.mediaType === 'video';
        const slideSize = slide.file?.size || slide.fileSize || 0;
        const slidePrefix = slides.length > 1 ? ` (${i + 1}/${slides.length})` : '';

        task.currentSlideIndex = i;
        task.currentTotalBytes = slideSize;
        task.currentLoadedBytes = 0;
        task.currentSlideProgress = 0;
        task.statusMessage = `Mengunggah ${isVideo ? 'Video' : 'Foto'}${slidePrefix}: 0 B / ${formatByteSize(
          slideSize
        )} (0%)`;
        this.notify();

        // Unggah media (Cloudinary resmi -> Seamless fallback ke Firebase Storage)
        const onlineUrl = await uploadChildMediaOnline(
          slide.file ? slide.file : slide.previewUrl,
          slide.fileName ||
            `momen_${Date.now()}_${i + 1}.${isVideo ? 'mp4' : 'jpg'}`,
          'moments',
          (pct, loaded, total) => {
            if (signal.aborted) return;
            const currentTotal = total || slideSize;
            const currentLoaded = loaded || Math.round((pct / 100) * currentTotal);
            slideBytesLoaded[i] = currentLoaded;

            const sumLoaded = slideBytesLoaded.reduce((a, b) => a + b, 0);
            const sumTotal = Math.max(sumLoaded, task.overallTotalBytes);
            const overallPct = Math.min(99, Math.round((sumLoaded / sumTotal) * 100));

            task.currentSlideProgress = pct;
            task.currentLoadedBytes = currentLoaded;
            task.currentTotalBytes = currentTotal;
            task.overallLoadedBytes = sumLoaded;
            task.overallPercent = overallPct;

            const byteText =
              currentTotal > 0
                ? `${formatByteSize(currentLoaded)} / ${formatByteSize(currentTotal)}`
                : `${pct}%`;

            const providerLabel =
              task.provider === 'firebase_storage' ? ' [Firebase Storage]' : '';

            task.statusMessage = `Mengunggah ${
              isVideo ? 'Video' : 'Foto'
            }${slidePrefix}: ${byteText} (${pct}%)${providerLabel}`;
            this.notify();
          },
          {
            signal,
            onTaskCreated: (fbTask) => {
              this.firebaseUploadTasks.set(taskId, fbTask);
            },
            onFallbackTriggered: (provider, reason) => {
              task.provider = provider;
              task.status = 'fallback_storage';
              task.statusMessage = reason;
              this.notify();
            },
          }
        );

        uploadedSlides.push({
          id: slide.id || `slide_${Date.now()}_${i + 1}`,
          url: onlineUrl,
          mediaType: slide.mediaType,
        });
      }

      if (signal.aborted) {
        throw new Error('Pengunggahan dibatalkan oleh pengguna.');
      }

      const coverSlide = uploadedSlides[0];

      // Google Drive opsional jika dipilih
      let driveFileId: string | undefined = payload.editingMoment?.googleDriveFileId;
      let driveWebViewLink: string | undefined = payload.editingMoment?.googleDriveWebViewLink;
      let isSyncedToDrive = payload.editingMoment?.googleDriveSynced || false;

      if (
        payload.momentDraft.storageDestination === 'google_drive' &&
        payload.momentDraft.accessToken
      ) {
        task.statusMessage = 'Menyimpan cadangan ke folder Google Drive...';
        this.notify();

        try {
          let mediaBlob: Blob;
          if (slides[0].file) {
            mediaBlob = slides[0].file;
          } else {
            const resp = await fetch(coverSlide.url);
            mediaBlob = await resp.blob();
          }

          const driveResult = await uploadMediaToGoogleDrive(
            mediaBlob,
            {
              childName: payload.childProfile.name,
              date: payload.momentDraft.date,
              title: payload.momentDraft.title.trim(),
              category: payload.momentDraft.category,
              notes: payload.momentDraft.notes.trim(),
              weightKg: payload.momentDraft.weightKg,
              heightCm: payload.momentDraft.heightCm,
              headCircumferenceCm: payload.momentDraft.headCircumferenceCm,
            },
            payload.momentDraft.accessToken,
            (step: string) => {
              task.statusMessage = step;
              this.notify();
            }
          );

          driveFileId = driveResult.fileId;
          driveWebViewLink = driveResult.webViewLink;
          isSyncedToDrive = true;
        } catch (driveErr) {
          console.warn('Google drive backup warning:', driveErr);
        }
      }

      // Buat objek Momen Lengkap
      const savedMoment: MomentItem = {
        id: payload.editingMoment ? payload.editingMoment.id : `moment_${Date.now()}`,
        title: payload.momentDraft.title.trim(),
        date: payload.momentDraft.date,
        mediaType: coverSlide.mediaType,
        mediaUrl: coverSlide.url,
        mediaItems: uploadedSlides,
        category: payload.momentDraft.category,
        notes: payload.momentDraft.notes.trim(),
        weightKg: payload.momentDraft.weightKg,
        heightCm: payload.momentDraft.heightCm,
        headCircumferenceCm: payload.momentDraft.headCircumferenceCm,
        googleDriveSynced: isSyncedToDrive,
        googleDriveFileId: driveFileId,
        googleDriveWebViewLink: driveWebViewLink,
        createdAt: payload.editingMoment
          ? payload.editingMoment.createdAt
          : new Date().toISOString(),
      };

      // Simpan langsung ke Firestore
      task.status = 'saving_firestore';
      task.overallPercent = 100;
      task.statusMessage = 'Menyimpan data momen ke Cloud Firestore...';
      this.notify();

      await syncMomentToFirestore(
        payload.activeJournalId,
        payload.childProfile,
        savedMoment,
        Boolean(payload.isEditing)
      );

      // Sinkron BB/TB jika diisi
      if (savedMoment.weightKg || savedMoment.heightCm) {
        const birth = new Date(payload.childProfile.birthDate);
        const mDate = new Date(savedMoment.date);
        const monthsDiff = Math.max(
          0,
          (mDate.getFullYear() - birth.getFullYear()) * 12 + (mDate.getMonth() - birth.getMonth())
        );

        const newRecord: GrowthRecord = {
          id: `gr_${Date.now()}`,
          date: savedMoment.date,
          ageMonths: monthsDiff,
          weightKg: savedMoment.weightKg || 0,
          heightCm: savedMoment.heightCm || 0,
          headCircumferenceCm: savedMoment.headCircumferenceCm,
          notes: savedMoment.title,
          sourceMomentId: savedMoment.id,
        };

        await syncGrowthToFirestore(payload.activeJournalId, payload.childProfile, newRecord);
        this.onGrowthRecordSavedCallback?.(newRecord);
      }

      // Beritahu pemanggil agar UI galeri langsung diperbarui otomatis
      this.onMomentSavedCallback?.(savedMoment, Boolean(payload.isEditing));

      // Tandai Berhasil
      task.status = 'completed';
      task.overallPercent = 100;
      task.resultMoment = savedMoment;
      task.completedAt = Date.now();
      task.statusMessage = 'Momen berhasil diunggah & tersinkronisasi!';
      this.notify();

      // Auto dismiss setelah 6 detik
      setTimeout(() => {
        const current = this.tasks.get(taskId);
        if (current && current.status === 'completed') {
          this.dismissTask(taskId);
        }
      }, 6000);
    } catch (err: any) {
      if (signal.aborted) {
        task.status = 'cancelled';
        task.statusMessage = 'Pengunggahan dibatalkan.';
      } else {
        const msg = err?.message || 'Terjadi gangguan jaringan saat mengunggah.';
        task.status = 'error';
        task.errorMessage = msg;
        task.statusMessage = `Gagal mengunggah: ${msg}`;
      }
      this.notify();
    } finally {
      this.abortControllers.delete(taskId);
      this.firebaseUploadTasks.delete(taskId);
    }
  }

  /**
   * Batalkan pengunggahan yang sedang berjalan
   */
  public cancelTask(taskId: string) {
    const controller = this.abortControllers.get(taskId);
    if (controller) {
      controller.abort();
      this.abortControllers.delete(taskId);
    }

    const fbTask = this.firebaseUploadTasks.get(taskId);
    if (fbTask) {
      try {
        fbTask.cancel();
      } catch (err) {
        console.warn('Gagal membatalkan Firebase task:', err);
      }
      this.firebaseUploadTasks.delete(taskId);
    }

    const task = this.tasks.get(taskId);
    if (task) {
      task.status = 'cancelled';
      task.statusMessage = 'Pengunggahan dibatalkan oleh pengguna.';
      this.notify();

      setTimeout(() => {
        this.dismissTask(taskId);
      }, 4000);
    }
  }

  /**
   * Mencoba kembali pengunggahan yang gagal atau terputus
   */
  public retryTask(taskId: string) {
    const task = this.tasks.get(taskId);
    if (!task) return;

    const payload = task.payload;
    this.dismissTask(taskId);
    this.startUpload(payload);
  }

  /**
   * Menghapus widget task dari daftar
   */
  public dismissTask(taskId: string) {
    this.tasks.delete(taskId);
    this.abortControllers.delete(taskId);
    this.firebaseUploadTasks.delete(taskId);
    this.notify();
  }
}

export const backgroundUploadManager = new BackgroundUploadManager();
