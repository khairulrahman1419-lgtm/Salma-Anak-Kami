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
} from 'lucide-react';
import type { User } from 'firebase/auth';
import type { MomentCategory, MomentItem } from '../types/index.ts';
import { uploadMediaToGoogleDrive } from '../services/googleDriveClient.ts';
import { simulateGoogleDriveUpload } from '../utils/googleDriveService.ts';
import { downloadMediaFile } from '../utils/downloadMedia.ts';

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

function compressImageToDataUrl(file: File, maxDimension = 1080, quality = 0.8): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca file gambar.'));
    reader.onload = () => {
      const dataUrl = reader.result as string;
      const img = new Image();
      img.onerror = () => resolve(dataUrl);
      img.onload = () => {
        try {
          let { width, height } = img;
          if (width > maxDimension || height > maxDimension) {
            if (width >= height) {
              height = Math.round((height * maxDimension) / width);
              width = maxDimension;
            } else {
              width = Math.round((width * maxDimension) / height);
              height = maxDimension;
            }
          }
          const canvas = document.createElement('canvas');
          canvas.width = width;
          canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (!ctx) {
            resolve(dataUrl);
            return;
          }
          ctx.drawImage(img, 0, 0, width, height);
          resolve(canvas.toDataURL('image/jpeg', quality));
        } catch {
          resolve(dataUrl);
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  });
}

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
  const [showStoragePicker, setShowStoragePicker] = useState(false);

  const isEditMode = Boolean(editingMoment);

  // Form States
  const [title, setTitle] = useState('');
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [category, setCategory] = useState<MomentCategory>(
    initialMode === 'milestone' ? 'milestone_fisik' : 'bermain'
  );
  const [mediaType, setMediaType] = useState<'image' | 'video'>('image');
  const [mediaPreview, setMediaPreview] = useState<string | null>(null);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // Growth Measurements
  const [weightKg, setWeightKg] = useState<string>('');
  const [heightCm, setHeightCm] = useState<string>('');
  const [headCircumferenceCm, setHeadCircumferenceCm] = useState<string>('');
  const [notes, setNotes] = useState('');

  // UI & Drive Upload Progress States
  const [isDragging, setIsDragging] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [progressStatus, setProgressStatus] = useState<string | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);

  // Sinkronisasi state ketika modal dibuka (mode tambah baru vs mode edit)
  useEffect(() => {
    if (!isOpen) return;
    setErrorMessage(null);
    setProgressStatus(null);
    setSelectedFile(null);
    setShowStoragePicker(false);

    if (editingMoment) {
      setTitle(editingMoment.title);
      setDate(editingMoment.date);
      setCategory(editingMoment.category);
      setMediaType(editingMoment.mediaType);
      setMediaPreview(editingMoment.mediaUrl);
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
      setMediaType('image');
      setMediaPreview(null);
      setWeightKg('');
      setHeightCm('');
      setHeadCircumferenceCm('');
      setNotes('');
    }
  }, [isOpen, initialMode, editingMoment]);

  if (!isOpen) return null;

  const resetForm = () => {
    setTitle('');
    setDate(new Date().toISOString().slice(0, 10));
    setCategory(initialMode === 'milestone' ? 'milestone_fisik' : 'bermain');
    setMediaType('image');
    setMediaPreview(null);
    setSelectedFile(null);
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
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      void handleFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleFileChange = (e: ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      void handleFileSelected(e.target.files[0]);
    }
    e.target.value = '';
  };

  const handleFileSelected = async (file: File) => {
    setSelectedFile(file);
    setErrorMessage(null);
    const isVid = file.type.startsWith('video/');
    setMediaType(isVid ? 'video' : 'image');

    if (isVid) {
      const objectUrl = URL.createObjectURL(file);
      setMediaPreview(objectUrl);
    } else {
      try {
        const persistentDataUrl = await compressImageToDataUrl(file);
        setMediaPreview(persistentDataUrl);
      } catch {
        setMediaPreview(URL.createObjectURL(file));
      }
    }

    if (!title.trim()) {
      const cleanName = file.name.replace(/\.[^/.]+$/, '').replace(/[_-]/g, ' ');
      setTitle(cleanName.charAt(0).toUpperCase() + cleanName.slice(1));
    }
  };

  const handleSelectPreset = (preset: (typeof PRESET_SAMPLE_MEDIA)[0]) => {
    setMediaPreview(preset.url);
    setSelectedFile(null);
    setMediaType('image');
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

    const finalMediaUrl = mediaPreview || PRESET_SAMPLE_MEDIA[0].url;

    try {
      setIsSubmitting(true);

      // Jika sedang mengedit momen yang sudah ada dan user tidak memilih file baru, langsung simpan perubahan dengan cepat
      if (editingMoment && !selectedFile && finalMediaUrl === editingMoment.mediaUrl) {
        const updatedItem: MomentItem = {
          ...editingMoment,
          title: title.trim(),
          date,
          mediaType,
          mediaUrl: finalMediaUrl,
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

      let driveFileId: string | undefined = editingMoment?.googleDriveFileId;
      let driveWebViewLink: string | undefined = editingMoment?.googleDriveWebViewLink;
      let isSyncedToDrive = editingMoment?.googleDriveSynced || false;

      if (storageDestination === 'google_drive' && accessToken) {
        setProgressStatus('Menghubungkan ke folder Google Drive Anda...');

        let mediaBlob: Blob;
        if (selectedFile) {
          mediaBlob = selectedFile;
        } else {
          setProgressStatus('Mempersiapkan media...');
          const resp = await fetch(finalMediaUrl);
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
        setProgressStatus('Menyimpan cadangan ke Google Drive (simulasi)...');
        const simRes = await simulateGoogleDriveUpload({
          file: selectedFile,
          previewUrl: finalMediaUrl,
          mediaType,
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
        mediaType,
        mediaUrl: finalMediaUrl,
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
                {isEditMode ? 'Edit Momen, Foto & Catatan' : 'Catat Momen & Milestone Baru'}
              </h2>
              <p className="text-[11px] text-slate-500 -mt-0.5">
                {isEditMode
                  ? `Perbarui foto, catatan, atau unduh kembali file momen ${childName}`
                  : `Dokumentasikan foto, video, dan data fisik untuk ${childName}`}
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
                      Tersimpan Langsung ke Google Drive ({currentUser.email})
                    </span>
                    <span className="text-[11px] text-sky-800">
                      Folder: Jurnal Tumbuh Kembang - {childName}
                    </span>
                  </div>
                </div>
                <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                  Drive Terhubung
                </span>
              </div>
            ) : (
              <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="text-xs text-amber-900">
                  <span className="font-bold block">Google Drive Belum Terhubung</span>
                  <span className="text-[11px] text-amber-800">
                    Hubungkan akun Google Drive untuk upload otomatis ke cloud Anda.
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
                    <svg className="w-3.5 h-3.5" viewBox="0 0 24 24">
                      <path
                        fill="#4285F4"
                        d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                      />
                      <path
                        fill="#34A853"
                        d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                      />
                      <path
                        fill="#FBBC05"
                        d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                      />
                      <path
                        fill="#EA4335"
                        d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                      />
                    </svg>
                  )}
                  <span>Hubungkan Sekarang</span>
                </button>
              </div>
            )
          ) : (
            <div className="p-3 rounded-2xl bg-emerald-50 border border-emerald-200 flex items-center gap-2 text-xs text-emerald-900">
              <HardDrive className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>Tersimpan di Penyimpanan Lokal Perangkat</span>
            </div>
          )}

          {errorMessage && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {/* Pilihan Sumber Media */}
          <div className="space-y-2">
            <label className="block text-xs font-bold text-slate-800">
              {isEditMode ? 'Foto / Video Saat Ini (Bisa Diganti atau Diunduh)' : 'Pilih Sumber Foto / Video'}
            </label>

            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => cameraInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-emerald-50 hover:bg-emerald-100/80 active:bg-emerald-200 border border-emerald-200 text-emerald-900 transition-all cursor-pointer shadow-2xs text-center"
              >
                <div className="w-8 h-8 rounded-full bg-emerald-600 text-white flex items-center justify-center shadow-xs">
                  <Camera className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold">Kamera HP</span>
                <span className="text-[9px] text-emerald-700">Jepret Langsung</span>
              </button>

              <button
                type="button"
                onClick={() => galleryInputRef.current?.click()}
                className="flex flex-col items-center justify-center gap-1.5 p-2.5 rounded-2xl bg-sky-50 hover:bg-sky-100/80 active:bg-sky-200 border border-sky-200 text-sky-900 transition-all cursor-pointer shadow-2xs text-center"
              >
                <div className="w-8 h-8 rounded-full bg-sky-600 text-white flex items-center justify-center shadow-xs">
                  <ImageIcon className="w-4 h-4" />
                </div>
                <span className="text-[11px] font-bold">Galeri HP</span>
                <span className="text-[9px] text-sky-700">Pilih dari Album</span>
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
              onChange={handleFileChange}
              className="hidden"
            />

            {showStoragePicker && (
              <div className="p-3 bg-amber-50/70 rounded-2xl border border-amber-200 space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-bold text-amber-900 flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-amber-600" />
                    Pilih Foto dari Storage Aplikasi &amp; Contoh Album:
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
                      onClick={() => {
                        handleSelectPreset(preset);
                        setShowStoragePicker(false);
                      }}
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

            {/* Area Drag and Drop / Preview Media + Tombol Unduh */}
            <div
              onDragOver={handleDragOver}
              onDragLeave={handleDragLeave}
              onDrop={handleDrop}
              onClick={() => galleryInputRef.current?.click()}
              className={`relative border-2 border-dashed rounded-2xl p-4 text-center cursor-pointer transition-all duration-200 ${
                isDragging
                  ? 'border-emerald-500 bg-emerald-50/50'
                  : mediaPreview
                  ? 'border-emerald-300 bg-emerald-50/20'
                  : 'border-slate-300 hover:border-slate-400 bg-[#FAF8F5]'
              }`}
            >
              {mediaPreview ? (
                <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="flex flex-col sm:flex-row items-center gap-3">
                    <div className="w-24 h-20 rounded-xl overflow-hidden bg-slate-100 shrink-0 border border-slate-200 shadow-xs">
                      {mediaType === 'video' ? (
                        <div className="w-full h-full flex flex-col items-center justify-center bg-slate-900 text-white text-xs">
                          <Video className="w-5 h-5 mb-1 text-sky-400" />
                          <span className="text-[10px]">Video Terpilih</span>
                        </div>
                      ) : (
                        <img
                          src={mediaPreview}
                          alt="Preview"
                          className="w-full h-full object-cover"
                        />
                      )}
                    </div>
                    <div className="text-center sm:text-left space-y-0.5">
                      <p className="text-xs font-bold text-slate-800">
                        {selectedFile
                          ? selectedFile.name
                          : isEditMode
                          ? 'File Foto / Video Tersimpan'
                          : 'Media Siap Disimpan'}
                      </p>
                      <p className="text-[11px] text-slate-500">
                        Ketuk tombol Kamera atau Galeri di atas jika ingin mengganti file
                      </p>
                      <span className="inline-block text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md">
                        ✓ Media Tersedia
                      </span>
                    </div>
                  </div>

                  {/* Tombol Download File Langsung dari Modal */}
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      void downloadMediaFile(
                        mediaPreview,
                        title || `momen-${childName}`,
                        mediaType
                      );
                    }}
                    className="shrink-0 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white hover:bg-slate-100 text-slate-800 border border-slate-300 text-xs font-bold shadow-2xs transition-colors cursor-pointer"
                  >
                    <Download className="w-3.5 h-3.5 text-teal-600" />
                    <span>Unduh File</span>
                  </button>
                </div>
              ) : (
                <div className="py-2 space-y-1">
                  <div className="w-10 h-10 mx-auto rounded-xl bg-slate-100 text-slate-500 flex items-center justify-center">
                    <UploadCloud className="w-5 h-5 text-emerald-600" />
                  </div>
                  <div className="text-xs text-slate-700">
                    <span className="font-semibold text-emerald-700">
                      Ketuk di sini atau tombol di atas
                    </span>
                  </div>
                  <p className="text-[10px] text-slate-400">
                    Mendukung JPG, PNG, WEBP, MP4, MOV
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
              {storageDestination === 'google_drive'
                ? 'Tersimpan otomatis ke Google Drive pribadi Anda.'
                : 'Tersimpan ke database lokal browser.'}
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
                      {isEditMode
                        ? 'Simpan Perubahan'
                        : storageDestination === 'google_drive'
                        ? 'Simpan ke Google Drive'
                        : 'Simpan ke Penyimpanan'}
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
