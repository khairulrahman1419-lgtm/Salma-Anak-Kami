import React, { useState, useRef, useEffect, DragEvent, ChangeEvent, FormEvent } from 'react';
import {
  X,
  UploadCloud,
  Scale,
  AlertCircle,
  Video,
  Image as ImageIcon,
  Camera,
  Sparkles,
  Loader2,
  Cloud,
  HardDrive,
  Download,
  Edit2,
  Plus,
  Trash2,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { MomentCategory, MomentItem, MomentMediaSlide } from '../types/index.ts';
import { uploadMediaToGoogleDrive } from '../services/googleDriveClient.ts';
import { uploadChildMediaOnline } from '../services/mediaFirebaseStorage.ts';
import { simulateGoogleDriveUpload } from '../utils/googleDriveService.ts';
import { downloadMediaFile } from '../utils/downloadMedia.ts';
import {
  getMomentMediaSlides,
  getVideoPosterUrl,
  MAX_MOMENT_MEDIA_ITEMS,
  readImageAsDataUrl,
} from '../utils/imageHelper.ts';

interface UploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSaveMoment: (moment: MomentItem) => void;
  onUpdateMoment?: (moment: MomentItem) => void;
  editingMoment?: MomentItem | null;
  childName: string;
  initialMode?: 'media' | 'milestone';
  storageDestination: 'google_drive' | 'vps_local';
  currentUser: User | null;
  accessToken: string | null;
  onConnectGoogle: () => Promise<void>;
}

interface DraftMomentSlide {
  id: string;
  previewUrl: string;
  mediaType: 'image' | 'video';
  file?: File;
  fileName?: string;
}

const PRESET_SAMPLE_MEDIA = [
  {
    name: 'Momen Berjalan',
    url: '/src/assets/images/moment_first_steps_1792502523399.jpg',
    category: 'milestone_fisik' as MomentCategory,
    defaultTitle: 'Latihan Berjalan di Ruang Keluarga',
  },
  {
    name: 'Membaca Buku',
    url: '/src/assets/images/moment_reading_book_1792502524701.jpg',
    category: 'kata_pertama' as MomentCategory,
    defaultTitle: 'Belajar Menyebut Gambar Bersama Ayah',
  },
  {
    name: 'Bermain di Taman',
    url: '/src/assets/images/moment_playing_park_1792502524857.jpg',
    category: 'bermain' as MomentCategory,
    defaultTitle: 'Ceria Berlari Menghirup Udara Pagi',
  },
];

export const UploadModal: React.FC<UploadModalProps> = ({
  isOpen,
  onClose,
  onSaveMoment,
  onUpdateMoment,
  editingMoment,
  childName,
  initialMode = 'media',
  storageDestination,
  currentUser,
  accessToken,
  onConnectGoogle,
}) => {
  const cameraInputRef = useRef<HTMLInputElement>(null);
  const galleryInputRef = useRef<HTMLInputElement>(null);
  const previewScrollerRef = useRef<HTMLDivElement>(null);
  const [showStoragePicker, setShowStoragePicker] = useState(false);

  const isEditMode = Boolean(editingMoment);

  // Form States
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<MomentCategory>(
    initialMode === 'milestone' ? 'milestone_fisik' : 'bermain'
  );
  const [draftSlides, setDraftSlides] = useState<DraftMomentSlide[]>([]);
  const [activeSlideIdx, setActiveSlideIdx] = useState(0);

  // Growth Measurements
  const [weightKg, setWeightKg] = useState<string>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState<string>('');
  const [notes, setNotes] = useState('');

  // UI & Upload Progress States
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setProgressStatus(null);
    setShowStoragePicker(false);
    setActiveSlideIdx(0);

    if (editingMoment) {
      setTitle(editingMoment.title);
      setDate(editingMoment.date);
      setCategory(editingMoment.category);
      const existingSlides = getMomentMediaSlides(editingMoment).map((s) => ({
        id: s.id,
        previewUrl: s.url,
        mediaType: s.mediaType,
      }));
      setDraftSlides(existingSlides);
      setWeightKg(editingMoment.weightKg !== undefined ? String(editingMoment.weightKg) : '');
      setHeightCm(editingMoment.heightCm !== undefined ? String(editingMoment.heightCm) : '');
      setHeadCircumferenceCm(
        editingMoment.headCircumferenceCm !== undefined
          ? String(editingMoment.headCircumferenceCm)
          : ''
      );
      setNotes(editingMoment.notes);
    } else {
      setTitle('');
      setDate(new Date().toISOString().slice(0, 10));
      setCategory(initialMode === 'milestone' ? 'milestone_fisik' : 'bermain');
      setDraftSlides([]);
      setWeightKg('');
      setHeightCm('');
      setHeadCircumferenceCm('');
      setNotes('');
    }
  }, [isOpen, initialMode, editingMoment]);

  if (!isOpen) return null;

  const safeActiveIdx =
    draftSlides.length > 0 ? Math.min(activeSlideIdx, draftSlides.length - 1) : 0;
  const activeSlide = draftSlides[safeActiveIdx];
  const remainingSlots = Math.max(0, MAX_MOMENT_MEDIA_ITEMS - draftSlides.length);

  const scrollToPreviewSlide = (targetIdx: number) => {
    if (draftSlides.length === 0) return;
    const clamped = Math.max(0, Math.min(draftSlides.length - 1, targetIdx));
    setActiveSlideIdx(clamped);
    const scroller = previewScrollerRef.current;
    if (scroller && scroller.clientWidth > 0) {
      scroller.scrollTo({
        left: clamped * scroller.clientWidth,
        behavior: 'smooth',
      });
    }
  };

  const handlePreviewScroll = () => {
    const scroller = previewScrollerRef.current;
    if (!scroller || scroller.clientWidth <= 0) return;
    const idx = Math.round(scroller.scrollLeft / scroller.clientWidth);
    const clamped = Math.max(0, Math.min(draftSlides.length - 1, idx));
    if (clamped !== activeSlideIdx) {
      setActiveSlideIdx(clamped);
    }
  };

  const resetForm = () => {
    setTitle('');
    setDate(new Date().toISOString().slice(0, 10));
    setCategory(initialMode === 'milestone' ? 'milestone_fisik' : 'bermain');
    setDraftSlides([]);
    setActiveSlideIdx(0);
    setWeightKg('');
    setHeightCm('');
    setHeadCircumferenceCm('');
    setNotes('');
    setShowStoragePicker(false);
    setErrorMessage(null);
    setProgressStatus(null);
  };

  const handleCloseModal = () => {
    if (isSubmitting) return;
    setErrorMessage(null);
    onClose();
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      void handleFilesSelected(Array.from(e.dataTransfer.files));
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      void handleFilesSelected(Array.from(e.target.files));
    }
    e.target.value = '';
  };

  const handleFilesSelected = async (files: File[]) => {
    setErrorMessage(null);
    if (remainingSlots <= 0) {
      setErrorMessage(`Maksimal ${MAX_MOMENT_MEDIA_ITEMS} foto/video dalam satu momen swipe.`);
      return;
    }

    const acceptedFiles = files.slice(0, remainingSlots);
    const newSlides: DraftMomentSlide[] = [];
    const now = Date.now();

    for (let i = 0; i < acceptedFiles.length; i++) {
      const file = acceptedFiles[i];
      const isVid = file.type.startsWith('video/');

      if (isVid && file.size > 95 * 1024 * 1024) {
        setErrorMessage('Ukuran video terlalu besar (maksimal 95 MB untuk unggahan Cloudinary).');
        continue;
      }

      if (isVid) {
        newSlides.push({
          id: `slide_${now}_${i}`,
          previewUrl: URL.createObjectURL(file),
          mediaType: 'video',
          file,
          fileName: file.name,
        });
      } else {
        try {
          const persistentDataUrl = await readImageAsDataUrl(file, 1200, 0.84);
          newSlides.push({
            id: `slide_${now}_${i}`,
            previewUrl: persistentDataUrl,
            mediaType: 'image',
            file,
            fileName: file.name,
          });
        } catch {
          newSlides.push({
            id: `slide_${now}_${i}`,
            previewUrl: URL.createObjectURL(file),
            mediaType: 'image',
            file,
            fileName: file.name,
          });
        }
      }
    }

    if (newSlides.length === 0) return;

    setDraftSlides((prev) => {
      const combined = [...prev, ...newSlides].slice(0, MAX_MOMENT_MEDIA_ITEMS);
      const nextFocusIdx = prev.length;
      requestAnimationFrame(() => {
        scrollToPreviewSlide(Math.min(nextFocusIdx, combined.length - 1));
      });
      return combined;
    });

    if (!title.trim() && acceptedFiles[0]) {
      const cleanName = acceptedFiles[0].name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleRemoveDraftSlide = (slideId: string) => {
    setDraftSlides((prev) => {
      const next = prev.filter((s) => s.id !== slideId);
      setActiveSlideIdx((curr) => Math.max(0, Math.min(curr, next.length - 1)));
      return next;
    });
  };

  const handleSelectPreset = (preset: (typeof PRESET_SAMPLE_MEDIA)[0]) => {
    if (remainingSlots <= 0) return;
    const presetSlide: DraftMomentSlide = {
      id: `preset_${Date.now()}`,
      previewUrl: preset.url,
      mediaType: 'image',
      fileName: preset.name,
    };
    setDraftSlides((prev) => [...prev, presetSlide].slice(0, MAX_MOMENT_MEDIA_ITEMS));
    setCategory(preset.category);
    setErrorMessage(null);
    if (!title.trim()) setTitle(preset.defaultTitle);
  };

  const handleConnectGoogleInModal = async () => {
    try {
      setIsConnectingGoogle(true);
      await onConnectGoogle();
    } catch (err: any) {
      setErrorMessage(err.message || 'Gagal menghubungkan Akun Google');
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (isSubmitting) return;
    setErrorMessage(null);

    if (!title.trim()) {
      setErrorMessage('Silakan masukkan judul momen atau milestone ini.');
      return;
    }

    if (!notes.trim()) {
      setErrorMessage('Silakan tuliskan catatan singkat atau kisah momen ini.');
      return;
    }

    const effectiveDrafts: DraftMomentSlide[] =
      draftSlides.length > 0
        ? draftSlides
        : [
            {
              id: `default_${Date.now()}`,
              previewUrl: PRESET_SAMPLE_MEDIA[0].url,
              mediaType: 'image',
            },
          ];

    try {
      setIsSubmitting(true);

      // Cek apakah dalam mode edit tidak ada perubahan slide baru
      if (editingMoment) {
        const originalSlides = getMomentMediaSlides(editingMoment);
        const unchangedSlides =
          effectiveDrafts.length === originalSlides.length &&
          effectiveDrafts.every(
            (d, i) =>
              !d.file &&
              d.previewUrl === originalSlides[i]?.url &&
              d.mediaType === originalSlides[i]?.mediaType
          );

        if (unchangedSlides) {
          const updatedItem: MomentItem = {
            ...editingMoment,
            title: title.trim(),
            date,
            mediaType: effectiveDrafts[0].mediaType,
            mediaUrl: effectiveDrafts[0].previewUrl,
            mediaItems: effectiveDrafts.map((d) => ({
              id: d.id,
              url: d.previewUrl,
              mediaType: d.mediaType,
            })),
            category,
            notes: notes.trim(),
            weightKg: weightKg ? parseFloat(weightKg) : undefined,
            heightCm: heightCm ? parseFloat(heightCm) : undefined,
            headCircumferenceCm: headCircumferenceCm ? parseFloat(headCircumferenceCm) : undefined,
          };

          if (onUpdateMoment) {
            onUpdateMoment(updatedItem);
          } else {
            onSaveMoment(updatedItem);
          }
          resetForm();
          onClose();
          return;
        }
      }

      // 1. Unggah seluruh slide foto/video ke Cloudinary (la3st6qh / wvulbv7y)
      const uploadedSlides: MomentMediaSlide[] = [];
      for (let i = 0; i < effectiveDrafts.length; i++) {
        const slide = effectiveDrafts[i];
        const slideLabel =
          effectiveDrafts.length > 1 ? ` (${i + 1}/${effectiveDrafts.length})` : '';

        setProgressStatus(
          navigator.onLine
            ? `Mengunggah foto/video${slideLabel} ke Cloudinary & Firestore...`
            : `Menyimpan media${slideLabel} ke penyimpanan lokal offline...`
        );

        const onlineUrl = await uploadChildMediaOnline(
          slide.file ? slide.file : slide.previewUrl,
          slide.fileName ||
            `momen_${Date.now()}_${i + 1}.${slide.mediaType === 'video' ? 'mp4' : 'jpg'}`,
          'moments',
          (pct) => {
            if (navigator.onLine) {
              setProgressStatus(
                `Mengunggah ${slide.mediaType === 'video' ? 'video' : 'foto'}${slideLabel} ke Cloudinary (${pct}%)...`
              );
            }
          }
        );

        uploadedSlides.push({
          id: slide.id || `slide_${Date.now()}_${i + 1}`,
          url: onlineUrl,
          mediaType: slide.mediaType,
        });
      }

      const coverSlide = uploadedSlides[0];

      let driveFileId: string | undefined = editingMoment?.googleDriveFileId;
      let driveWebViewLink: string | undefined = editingMoment?.googleDriveWebViewLink;
      let isSyncedToDrive = editingMoment?.googleDriveSynced || false;

      if (storageDestination === 'google_drive' && accessToken) {
        setProgressStatus('Menyimpan cadangan ke folder Google Drive Anda...');

        let mediaBlob: Blob;
        if (effectiveDrafts[0].file) {
          mediaBlob = effectiveDrafts[0].file;
        } else {
          const resp = await fetch(coverSlide.url);
          mediaBlob = await resp.blob();
        }

        const driveResult = await uploadMediaToGoogleDrive(
          mediaBlob,
          {
            childName,
            date,
            title: title.trim(),
            category,
            notes: notes.trim(),
            weightKg: weightKg ? parseFloat(weightKg) : undefined,
            heightCm: heightCm ? parseFloat(heightCm) : undefined,
            headCircumferenceCm: headCircumferenceCm ? parseFloat(headCircumferenceCm) : undefined,
          },
          accessToken,
          (step) => setProgressStatus(step)
        );

        driveFileId = driveResult.fileId;
        driveWebViewLink = driveResult.webViewLink;
        isSyncedToDrive = true;
      } else if (storageDestination === 'google_drive' && !editingMoment) {
        setProgressStatus('Menyelesaikan sinkronisasi cloud keluarga...');
        const simRes = await simulateGoogleDriveUpload({
          file: effectiveDrafts[0].file || null,
          previewUrl: coverSlide.url,
          mediaType: coverSlide.mediaType,
          date,
          title: title.trim(),
          category,
          notes: notes.trim(),
          weightKg: weightKg ? parseFloat(weightKg) : undefined,
          heightCm: heightCm ? parseFloat(heightCm) : undefined,
          headCircumferenceCm: headCircumferenceCm ? parseFloat(headCircumferenceCm) : undefined,
          childName,
        });
        driveFileId = simRes.fileId;
        driveWebViewLink = simRes.webViewLink;
        isSyncedToDrive = true;
      }

      const savedMoment: MomentItem = {
        id: editingMoment ? editingMoment.id : `moment_${Date.now()}`,
        title: title.trim(),
        date,
        mediaType: coverSlide.mediaType,
        mediaUrl: coverSlide.url,
        mediaItems: uploadedSlides,
        category,
        notes: notes.trim(),
        weightKg: weightKg ? parseFloat(weightKg) : undefined,
        heightCm: heightCm ? parseFloat(heightCm) : undefined,
        headCircumferenceCm: headCircumferenceCm ? parseFloat(headCircumferenceCm) : undefined,
        googleDriveSynced: isSyncedToDrive,
        googleDriveFileId: driveFileId,
        googleDriveWebViewLink: driveWebViewLink,
        createdAt: editingMoment ? editingMoment.createdAt : new Date().toISOString(),
      };

      if (editingMoment && onUpdateMoment) {
        onUpdateMoment(savedMoment);
      } else {
        onSaveMoment(savedMoment);
      }

      resetForm();
      onClose();
    } catch (err: any) {
      console.error('Upload Error:', err);
      setErrorMessage(err.message || 'Terjadi kendala saat menyimpan. Silakan coba kembali.');
    } finally {
      setIsSubmitting(false);
      setProgressStatus(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 sm:p-6 animate-in fade-in duration-200">
      <div className="relative w-full max-w-2xl bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-6 py-4 border-b border-[#EDE8DF] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              {isEditMode ? <Edit2 className="w-4 h-4" /> : <Sparkles className="w-4 h-4" />}
            </div>
            <div>
              <h2 className="text-base font-bold text-slate-900">
                {isEditMode ? 'Edit Momen, Foto Swipe & Catatan' : 'Catat Momen & Foto Swipe Baru'}
              </h2>
              <p className="text-[11px] text-slate-500 -mt-0.5">
                {isEditMode
                  ? `Tambah/hapus slide foto, perbarui catatan, atau unduh kembali foto ${childName}`
                  : `Bisa pilih banyak foto sekaligus untuk di-swipe ke samping`}
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleCloseModal}
            disabled={isSubmitting}
            aria-label="Tutup modal unggahan"
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 hover:bg-slate-200/50 flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Scrollable Body */}
        <form onSubmit={handleSubmit} noValidate className="p-6 space-y-5 overflow-y-auto flex-1">
          {/* Storage Destination Status Notice inside Modal */}
          {storageDestination === 'google_drive' ? (
            currentUser ? (
              <div className="p-3 rounded-2xl bg-sky-50 border border-sky-200 flex items-center justify-between text-xs">
                <div className="flex items-center gap-2">
                  <Cloud className="w-4 h-4 text-sky-600 shrink-0" />
                  <div>
                    <span className="font-bold text-sky-950 block">
                      Sinkron Real-Time + Google Drive ({currentUser.email})
                    </span>
                    <span className="text-[11px] text-sky-800">
                      Folder: Jurnal Tumbuh Kembang - {childName}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  Cloud Aktif
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-emerald-950">
                  <span className="font-bold block">
                    Sinkron Real-Time Aktif (Firestore + Cloudinary)
                  </span>
                  <span className="text-[11px] text-emerald-800">
                    Semua slide foto, video, BB/TB &amp; catatan langsung ter-update di HP Ayah &amp;
                    HP Bunda.
                  </span>
                </div>
                <button
                  type="button"
                  onClick={handleConnectGoogleInModal}
                  disabled={isConnectingGoogle}
                  className="px-3 py-1.5 bg-white hover:bg-slate-50 text-slate-800 text-xs font-bold rounded-xl border border-slate-300 shadow-xs flex items-center justify-center gap-2 shrink-0 cursor-pointer"
                >
                  {isConnectingGoogle ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Cloud className="w-3.5 h-3.5 text-sky-600" />
                  )}
                  <span>Drive Opsional</span>
                </button>
              </div>
            )
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900">
              <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tersimpan &amp; Tersinkronisasi Online Antar Perangkat Keluarga</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pilihan Sumber Media (Mendukung Multi-Upload untuk Swipe) */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <label className="block text-xs font-bold text-slate-800">
                {draftSlides.length > 0
                  ? `Foto / Video Momen (${draftSlides.length}/${MAX_MOMENT_MEDIA_ITEMS} Slide — Bisa Geser ke Samping)`
                  : 'Pilih Foto / Video (Bisa Pilih Lebih dari 1 untuk Swipe)'}
              </label>

              {draftSlides.length > 1 && (
                <button
                  type="button"
                  onClick={() => {
                    setDraftSlides([]);
                    setActiveSlideIdx(0);
                  }}
                  className="text-[11px] font-semibold text-rose-600 hover:underline cursor-pointer"
                >
                  Hapus Semua
                </button>
              )}
            </div>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                disabled={remainingSlots <= 0}
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 active:bg-emerald-200 disabled:opacity-50 border border-emerald-200 text-emerald-900 transition-all cursor-pointer shadow-2xs text-center"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold">Kamera HP</span>
                <span className="text-[9px] text-emerald-700">Jepret &amp; Tambah</span>
              </button>

              <button
                type="button"
                disabled={remainingSlots <= 0}
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100/80 active:bg-sky-200 disabled:opacity-50 border border-sky-200 text-sky-900 transition-all cursor-pointer shadow-2xs text-center"
              >
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold">Galeri HP</span>
                <span className="text-[9px] text-sky-700">Pilih Banyak Foto</span>
              </button>

              <button
                type="button"
                onClick={() => setShowStoragePicker((prev) => !prev)}
                className={`flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl border transition-all cursor-pointer shadow-2xs text-center ${
                  showStoragePicker
                    ? 'bg-amber-100 border-amber-400 text-amber-950 font-bold'
                    : 'bg-amber-50 hover:bg-amber-100/80 active:bg-amber-200 border-amber-200 text-amber-900'
                }`}
              >
                <div className="w-8 h-8 rounded-full bg-amber-600 text-white flex items-center justify-center shadow-xs">
                  <HardDrive className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold">Storage / Drive</span>
                <span className="text-[9px] text-amber-700">Koleksi Media</span>
              </button>
            </div>

            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              onChange={handleFileChange}
              className="hidden"
            />
            <input
              ref={galleryInputRef}
              type="file"
              accept="image/*,video/*"
              multiple
              onChange={handleFileChange}
              className="hidden"
            />

            {showStoragePicker && (
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Ketuk untuk menambahkan ke slide momen:
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowStoragePicker(false)}
                    className="text-[10px] text-amber-800 hover:underline cursor-pointer"
                  >
                    Tutup
                  </button>
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {PRESET_SAMPLE_MEDIA.map((preset, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSelectPreset(preset)}
                      className="group relative rounded-xl overflow-hidden border-2 border-transparent hover:border-emerald-500 text-left bg-white shadow-2xs cursor-pointer transition-all"
                    >
                      <img
                        src={preset.url}
                        alt={preset.name}
                        className="w-full h-16 object-cover group-hover:scale-105 transition-transform"
                      />
                      <span className="block p-1 text-[10px] font-bold text-slate-800 truncate text-center">
                        {preset.name}
                      </span>
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Area Drag & Drop / Live Swipeable Carousel Preview */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => {
                if (draftSlides.length === 0) {
                  galleryInputRef.current?.click();
                }
              }}
              className={`relative border-2 border-dashed rounded-2xl p-3.5 transition-all duration-200 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : draftSlides.length > 0
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-300 hover:border-slate-400 bg-[#FAF8F5] cursor-pointer text-center'
              }`}
            >
              {draftSlides.length > 0 && activeSlide ? (
                <div className="space-y-3">
                  {/* Live Horizontal Swipe Stage */}
                  <div className="relative rounded-2xl overflow-hidden bg-slate-900 aspect-[16/10] sm:aspect-[16/9] select-none">
                    <div
                      ref={previewScrollerRef}
                      onScroll={draftSlides.length > 1 ? handlePreviewScroll : undefined}
                      className={`w-full h-full flex ${
                        draftSlides.length > 1
                          ? 'overflow-x-auto snap-x snap-mandatory no-scrollbar scroll-smooth touch-pan-x'
                          : 'overflow-hidden'
                      }`}
                    >
                      {draftSlides.map((slide, idx) => (
                        <div
                          key={slide.id}
                          className="w-full h-full shrink-0 snap-center snap-always flex items-center justify-center relative"
                        >
                          {slide.mediaType === 'video' ? (
                            <video
                              src={slide.previewUrl}
                              poster={getVideoPosterUrl(slide.previewUrl) || undefined}
                              controls
                              playsInline
                              preload="metadata"
                              className="w-full h-full object-contain"
                            />
                          ) : (
                            <img
                              src={slide.previewUrl}
                              alt={`Slide ${idx + 1}`}
                              draggable={false}
                              className="w-full h-full object-contain"
                            />
                          )}
                        </div>
                      ))}
                    </div>

                    {/* Slide Counter Top-Left */}
                    <div className="absolute top-2.5 left-2.5 z-10 bg-black/65 backdrop-blur-xs text-white text-[11px] font-bold px-2.5 py-1 rounded-full tabular-nums">
                      Slide {safeActiveIdx + 1} / {draftSlides.length}
                    </div>

                    {/* Top-Right Actions on Active Slide: Unduh & Hapus Slide */}
                    <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5">
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          void downloadMediaFile(
                            activeSlide.previewUrl,
                            `${title || `momen-${childName}`}-${safeActiveIdx + 1}`,
                            activeSlide.mediaType
                          );
                        }}
                        title="Unduh slide ini"
                        className="px-2.5 py-1.5 rounded-xl bg-black/60 hover:bg-black/80 text-white text-[11px] font-bold inline-flex items-center gap-1 backdrop-blur-xs cursor-pointer"
                      >
                        <Download className="w-3.5 h-3.5 text-emerald-300" />
                        <span>Unduh</span>
                      </button>

                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          handleRemoveDraftSlide(activeSlide.id);
                        }}
                        title="Hapus slide ini"
                        className="w-8 h-8 rounded-xl bg-rose-600/80 hover:bg-rose-600 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>

                    {/* Left / Right Swipe Arrows */}
                    {draftSlides.length > 1 && safeActiveIdx > 0 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToPreviewSlide(safeActiveIdx - 1);
                        }}
                        aria-label="Slide sebelumnya"
                        className="absolute left-2.5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer"
                      >
                        <ChevronLeft className="w-4.5 h-4.5" />
                      </button>
                    )}

                    {draftSlides.length > 1 && safeActiveIdx < draftSlides.length - 1 && (
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          scrollToPreviewSlide(safeActiveIdx + 1);
                        }}
                        aria-label="Slide berikutnya"
                        className="absolute right-2.5 top-1/2 -translate-y-1/2 z-10 w-9 h-9 rounded-full bg-black/55 hover:bg-black/80 text-white flex items-center justify-center backdrop-blur-xs cursor-pointer"
                      >
                        <ChevronRight className="w-4.5 h-4.5" />
                      </button>
                    )}
                  </div>

                  {/* Thumbnail Strip + "+ Tambah Foto" Button */}
                  <div className="flex items-center gap-2 overflow-x-auto pb-0.5 no-scrollbar">
                    {draftSlides.map((slide, idx) => {
                      const isActive = idx === safeActiveIdx;
                      return (
                        <button
                          key={slide.id}
                          type="button"
                          onClick={() => scrollToPreviewSlide(idx)}
                          className={`relative w-13 h-13 rounded-xl overflow-hidden shrink-0 border-2 transition-all cursor-pointer ${
                            isActive
                              ? 'border-emerald-600 scale-103 shadow-xs'
                              : 'border-slate-200 opacity-70 hover:opacity-100'
                          }`}
                        >
                          {slide.mediaType === 'video' ? (
                            <div className="w-full h-full bg-slate-900 text-white flex items-center justify-center relative">
                              {getVideoPosterUrl(slide.previewUrl) ? (
                                <img
                                  src={getVideoPosterUrl(slide.previewUrl)}
                                  alt={`Thumb Video ${idx + 1}`}
                                  className="w-full h-full object-cover"
                                />
                              ) : null}
                              <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                                <Video className="w-4 h-4 text-emerald-300" />
                              </div>
                            </div>
                          ) : (
                            <img
                              src={slide.previewUrl}
                              alt={`Thumb ${idx + 1}`}
                              className="w-full h-full object-cover"
                            />
                          )}
                          <span className="absolute bottom-0.5 right-1 text-[9px] font-extrabold text-white bg-black/60 px-1 rounded tabular-nums">
                            {idx + 1}
                          </span>
                        </button>
                      );
                    })}

                    {remainingSlots > 0 && (
                      <button
                        type="button"
                        onClick={() => galleryInputRef.current?.click()}
                        title="Tambah foto/video lagi agar bisa di-swipe ke samping"
                        className="w-13 h-13 rounded-xl border-2 border-dashed border-emerald-400 bg-white hover:bg-emerald-50 text-emerald-700 flex flex-col items-center justify-center gap-0.5 shrink-0 transition-colors cursor-pointer"
                      >
                        <Plus className="w-4 h-4" />
                        <span className="text-[9px] font-bold">Tambah</span>
                      </button>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-3 space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold text-emerald-700">
                      Ketuk di sini untuk memilih 1 atau beberapa foto sekaligus
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Foto yang dipilih lebih dari 1 otomatis bisa di-swipe ke samping (JPG, PNG, WEBP, MP4)
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Kolom Judul & Tanggal */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="sm:col-span-2 space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Judul Momen / Milestone <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                required
                maxLength={160}
                placeholder="Contoh: Langkah Pertama Mandiri"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900"
              />
            </div>

            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Tanggal Kejadian <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900"
              />
            </div>
          </div>

          {/* Kategori Milestone */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800">
              Kategori Perkembangan
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value as MomentCategory)}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 cursor-pointer"
            >
              <option value="milestone_fisik">Milestone Fisik (Duduk, Merangkak, Berjalan)</option>
              <option value="kata_pertama">Kata &amp; Bahasa (Bicara, Panggil Papa/Mama)</option>
              <option value="momen_lucu">Momen Lucu &amp; Menggemaskan</option>
              <option value="bermain">Aktivitas Bermain &amp; Sensorik</option>
              <option value="makan_mpasi">MPASI &amp; Nutrisi Baru</option>
              <option value="kesehatan">Pemeriksaan Dokter / Posyandu</option>
              <option value="ulang_tahun">Ulang Tahun / Syukuran</option>
              <option value="lainnya">Momen Spesial Lainnya</option>
            </select>
          </div>

          {/* Data Fisik Anak */}
          <div className="bg-[#FAF8F5] p-4 rounded-2xl border border-[#EDE8DF] space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <Scale className="w-3.5 h-3.5 text-emerald-600" />
                Catatan Fisik Anak (Opsional)
              </span>
              <span className="text-[10px] text-slate-500">Otomatis update kurva WHO</span>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-600">
                  Berat Badan (kg)
                </label>
                <input
                  type="number"
                  step="0.05"
                  min="1"
                  max="40"
                  placeholder="Misal: 10.5"
                  value={weightKg}
                  onChange={(e) => setWeightKg(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-600">
                  Tinggi Badan (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="30"
                  max="150"
                  placeholder="Misal: 81.5"
                  value={heightCm}
                  onChange={(e) => setHeightCm(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-medium text-slate-600">
                  Lingkar Kepala (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  min="25"
                  max="60"
                  placeholder="Misal: 46.5"
                  value={headCircumferenceCm}
                  onChange={(e) => setHeadCircumferenceCm(e.target.value)}
                  className="w-full px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>
            </div>
          </div>

          {/* Catatan Milestone / Kisah Momen */}
          <div className="space-y-1">
            <label className="block text-xs font-bold text-slate-800">
              Catatan Milestone &amp; Kisah Momen <span className="text-rose-500">*</span>
            </label>
            <textarea
              required
              rows={3}
              maxLength={2000}
              placeholder="Ceritakan apa yang si kecil lakukan, reaksi lucunya, kata yang diucapkannya, atau perasaan Ayah & Ibu saat melihat momen ini..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 text-slate-900 resize-none"
            />
          </div>

          {progressStatus && (
            <div className="p-3.5 rounded-2xl bg-sky-50 border border-sky-200 flex items-center gap-2.5 text-xs font-semibold text-sky-900">
              <Loader2 className="w-4 h-4 animate-spin text-sky-600 shrink-0" />
              <span>{progressStatus}</span>
            </div>
          )}

          {/* Footer Action Buttons */}
          <div className="pt-3 border-t border-[#EDE8DF] flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="text-[11px] text-slate-400 text-center sm:text-left">
              Otomatis tersinkronisasi online ke perangkat Ayah &amp; Ibu.
            </div>

            <div className="flex items-center gap-2.5 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleCloseModal}
                disabled={isSubmitting}
                className="flex-1 sm:flex-none px-4 py-2.5 text-xs font-semibold text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors cursor-pointer"
              >
                Batal
              </button>

              <button
                type="submit"
                disabled={isSubmitting}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-2.5 text-xs font-bold text-white bg-gradient-to-r from-emerald-600 to-teal-700 hover:from-emerald-700 hover:to-teal-800 rounded-xl shadow-md shadow-emerald-700/15 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-50"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-white" />
                    <span>Menyimpan...</span>
                  </>
                ) : (
                  <>
                    <UploadCloud className="w-4 h-4 text-emerald-200" />
                    <span>
                      {isEditMode ? 'Simpan Perubahan' : 'Simpan & Sinkronkan'}
                    </span>
                  </>
                )}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
};
