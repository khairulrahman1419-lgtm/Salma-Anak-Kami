import React, { useState, useRef, useEffect } from 'react';
import {
  X,
  Save,
  Camera,
  Check,
  Image as ImageIcon,
  Download,
  Baby,
  Users,
} from 'lucide-react';
import type { ChildProfile, Gender } from '../types/index.ts';
import { downloadMediaFile } from '../utils/downloadMedia.ts';
import { Clothespin } from './Clothespin.tsx';

interface EditProfileModalProps {
  isOpen: boolean;
  profile: ChildProfile;
  onClose: () => void;
  onSaveProfile: (updated: ChildProfile) => void;
}

const PRESET_CHILD_AVATARS = [
  { label: 'Ceria Utama', url: '/src/assets/images/child_avatar_1792502522791.jpg' },
  { label: 'Langkah Pertama', url: '/src/assets/images/moment_first_steps_1792502523399.jpg' },
  { label: 'Membaca Buku', url: '/src/assets/images/moment_reading_book_1792502524701.jpg' },
  { label: 'Taman Ceria', url: '/src/assets/images/moment_playing_park_1792502524857.jpg' },
  { label: 'Momen Makan', url: '/src/assets/images/moment_eating_puree_1792555107552.jpg' },
  { label: 'Bermain Balok', url: '/src/assets/images/moment_toddler_blocks_1792555577885.jpg' },
];

const BLOOD_TYPES = ['-', 'A+', 'A-', 'B+', 'B-', 'AB+', 'AB-', 'O+', 'O-', 'A', 'B', 'AB', 'O'];

function readImageAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Gagal membaca foto'));
    reader.onload = () => {
      if (typeof reader.result === 'string') {
        const img = new Image();
        img.onerror = () => resolve(reader.result as string);
        img.onload = () => {
          try {
            const maxDim = 900;
            let { width, height } = img;
            if (width > maxDim || height > maxDim) {
              if (width >= height) {
                height = Math.round((height * maxDim) / width);
                width = maxDim;
              } else {
                width = Math.round((width * maxDim) / height);
                height = maxDim;
              }
            }
            const canvas = document.createElement('canvas');
            canvas.width = width;
            canvas.height = height;
            const ctx = canvas.getContext('2d');
            if (!ctx) {
              resolve(reader.result as string);
              return;
            }
            ctx.drawImage(img, 0, 0, width, height);
            resolve(canvas.toDataURL('image/jpeg', 0.82));
          } catch {
            resolve(reader.result as string);
          }
        };
        img.src = reader.result;
      }
    };
    reader.readAsDataURL(file);
  });
}

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  profile,
  onClose,
  onSaveProfile,
}) => {
  const childGalleryInputRef = useRef<HTMLInputElement>(null);
  const childCameraInputRef = useRef<HTMLInputElement>(null);
  const fatherFileInputRef = useRef<HTMLInputElement>(null);
  const motherFileInputRef = useRef<HTMLInputElement>(null);

  const [showPresets, setShowPresets] = useState(false);

  // Child Biodata States
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [name, setName] = useState(profile.name);
  const [nickname, setNickname] = useState(profile.nickname);
  const [birthDate, setBirthDate] = useState(profile.birthDate);
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [bloodType, setBloodType] = useState(profile.bloodType || 'O+');
  const [birthWeightKg, setBirthWeightKg] = useState(String(profile.birthWeightKg));
  const [birthHeightCm, setBirthHeightCm] = useState(String(profile.birthHeightCm));
  const [birthHeadCircCm, setBirthHeadCircCm] = useState(
    profile.birthHeadCircumferenceCm ? String(profile.birthHeadCircumferenceCm) : '34.0'
  );
  const [specialNotes, setSpecialNotes] = useState(profile.specialNotes || '');

  // Father & Mother Biodata States
  const [fatherName, setFatherName] = useState(profile.fatherName || '');
  const [fatherInfo, setFatherInfo] = useState(profile.fatherInfo || '');
  const [fatherAvatarUrl, setFatherAvatarUrl] = useState(
    profile.fatherAvatarUrl || '/src/assets/images/moment_father_play_1792555577232.jpg'
  );
  const [motherName, setMotherName] = useState(profile.motherName || '');
  const [motherInfo, setMotherInfo] = useState(profile.motherInfo || '');
  const [motherAvatarUrl, setMotherAvatarUrl] = useState(
    profile.motherAvatarUrl || '/src/assets/images/moment_eating_puree_1792555107552.jpg'
  );

  useEffect(() => {
    if (isOpen) {
      setAvatarUrl(profile.avatarUrl);
      setName(profile.name);
      setNickname(profile.nickname);
      setBirthDate(profile.birthDate);
      setGender(profile.gender);
      setBloodType(profile.bloodType || 'O+');
      setBirthWeightKg(String(profile.birthWeightKg));
      setBirthHeightCm(String(profile.birthHeightCm));
      setBirthHeadCircCm(
        profile.birthHeadCircumferenceCm ? String(profile.birthHeadCircumferenceCm) : '34.0'
      );
      setSpecialNotes(profile.specialNotes || '');
      setFatherName(profile.fatherName || '');
      setFatherInfo(profile.fatherInfo || '');
      setFatherAvatarUrl(
        profile.fatherAvatarUrl || '/src/assets/images/moment_father_play_1792555577232.jpg'
      );
      setMotherName(profile.motherName || '');
      setMotherInfo(profile.motherInfo || '');
      setMotherAvatarUrl(
        profile.motherAvatarUrl || '/src/assets/images/moment_eating_puree_1792555107552.jpg'
      );
    }
  }, [isOpen, profile]);

  if (!isOpen) return null;

  const handleFilePick = async (
    e: React.ChangeEvent<HTMLInputElement>,
    setter: (val: string) => void
  ) => {
    if (e.target.files && e.target.files[0]) {
      try {
        const dataUrl = await readImageAsDataUrl(e.target.files[0]);
        setter(dataUrl);
      } catch (err) {
        console.error(err);
      }
    }
    e.target.value = '';
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanFullName = name.trim() || profile.name;
    const derivedNickname =
      nickname.trim() || cleanFullName.split(' ')[0] || profile.nickname;

    onSaveProfile({
      ...profile,
      avatarUrl,
      name: cleanFullName,
      nickname: derivedNickname,
      birthDate,
      gender,
      bloodType: bloodType === '-' ? undefined : bloodType,
      fatherName: fatherName.trim() || 'Ayah',
      fatherInfo: fatherInfo.trim() || undefined,
      fatherAvatarUrl,
      motherName: motherName.trim() || undefined,
      motherInfo: motherInfo.trim() || undefined,
      motherAvatarUrl,
      birthWeightKg: parseFloat(birthWeightKg) || profile.birthWeightKg,
      birthHeightCm: parseFloat(birthHeightCm) || profile.birthHeightCm,
      birthHeadCircumferenceCm: parseFloat(birthHeadCircCm) || profile.birthHeadCircumferenceCm,
      specialNotes: specialNotes.trim() || undefined,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/55 backdrop-blur-xs flex items-center justify-center p-3 sm:p-5 animate-in fade-in duration-200">
      <div className="relative w-full max-w-lg pt-4">
        {/* Top Wooden Clothespin Accent (Matching User Reference Screenshot) */}
        <Clothespin
          variant="wood"
          className="absolute top-0 left-1/2 -translate-x-1/2 scale-110"
        />

        <div className="w-full bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] shadow-2xl overflow-hidden flex flex-col max-h-[89vh]">
          {/* Modal Header */}
          <div className="px-5 sm:px-6 pt-5 pb-4 border-b border-[#EDE8DF] flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-teal-600 text-white flex items-center justify-center shadow-xs shrink-0">
                <Baby className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base sm:text-lg font-extrabold text-slate-900 leading-tight">
                  Ubah Biodata &amp; Foto Anak
                </h3>
                <p className="text-xs text-slate-500">
                  Edit profil si kecil, data kelahiran &amp; info Ayah Ibu
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={onClose}
              aria-label="Tutup"
              className="w-9 h-9 rounded-full border border-slate-200 text-slate-400 hover:text-slate-700 hover:bg-slate-100 flex items-center justify-center cursor-pointer shrink-0"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Scrollable Form Body */}
          <form onSubmit={handleSubmit} className="p-5 sm:p-6 space-y-4 overflow-y-auto flex-1">
            {/* Foto Profil Buah Hati Card */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200/90 space-y-3 shadow-2xs">
              <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                <div className="w-20 h-20 rounded-2xl overflow-hidden border-2 border-slate-100 shadow-sm bg-amber-50 shrink-0 mx-auto sm:mx-0">
                  <img
                    src={avatarUrl}
                    alt={name}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 text-center sm:text-left space-y-2">
                  <div>
                    <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                      Foto Profil Buah Hati
                    </h4>
                    <p className="text-[11px] text-slate-500">
                      Pilih foto dari galeri, ambil kamera, atau unduh foto saat ini
                    </p>
                  </div>

                  <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2">
                    <button
                      type="button"
                      onClick={() => childGalleryInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-teal-700 bg-teal-50/70 hover:bg-teal-100 border border-teal-400 transition-colors cursor-pointer"
                    >
                      <ImageIcon className="w-3.5 h-3.5" />
                      <span>Galeri</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => childCameraInputRef.current?.click()}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 transition-colors cursor-pointer"
                    >
                      <Camera className="w-3.5 h-3.5" />
                      <span>Kamera</span>
                    </button>

                    <button
                      type="button"
                      onClick={() =>
                        void downloadMediaFile(avatarUrl, `foto-anak-${nickname || name}`, 'image')
                      }
                      title="Unduh foto profil anak saat ini"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 border border-slate-300 transition-colors cursor-pointer"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Unduh</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setShowPresets((p) => !p)}
                      className="text-[11px] font-semibold text-teal-700 hover:underline px-1 cursor-pointer"
                    >
                      {showPresets ? 'Tutup Koleksi' : 'Koleksi Foto'}
                    </button>
                  </div>
                </div>
              </div>

              {/* Hidden Inputs for Child Photo */}
              <input
                ref={childGalleryInputRef}
                type="file"
                accept="image/*"
                onChange={(e) => void handleFilePick(e, setAvatarUrl)}
                className="hidden"
              />
              <input
                ref={childCameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={(e) => void handleFilePick(e, setAvatarUrl)}
                className="hidden"
              />

              {showPresets && (
                <div className="pt-2.5 border-t border-slate-100 grid grid-cols-6 gap-1.5">
                  {PRESET_CHILD_AVATARS.map((av, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => setAvatarUrl(av.url)}
                      title={av.label}
                      className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer relative ${
                        avatarUrl === av.url
                          ? 'border-teal-600 scale-105'
                          : 'border-slate-200 opacity-75 hover:opacity-100'
                      }`}
                    >
                      <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                      {avatarUrl === av.url && (
                        <div className="absolute inset-0 bg-teal-600/30 flex items-center justify-center text-white">
                          <Check className="w-3 h-3" />
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* Nama Lengkap & Nama Panggilan */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Nama Lengkap Anak <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Contoh: Salma Nur Khalisa"
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">Nama Panggilan</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  placeholder="Salma"
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
                />
              </div>
            </div>

            {/* Jenis Kelamin & Tanggal Lahir */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Jenis Kelamin <span className="text-rose-500">*</span>
                </label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 cursor-pointer"
                >
                  <option value="male">Laki-laki (Biru)</option>
                  <option value="female">Perempuan (Merah Muda)</option>
                </select>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">
                  Tanggal Lahir <span className="text-rose-500">*</span>
                </label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
                />
              </div>
            </div>

            {/* Data Orang Tua: Info Ayah & Info Ibu */}
            <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E9E4DB] space-y-3.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-xs font-extrabold text-slate-800 flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-teal-600" />
                  <span>Data &amp; Info Orang Tua (Ayah &amp; Ibu)</span>
                </span>

                <div className="flex items-center gap-1.5">
                  <label className="text-[11px] font-bold text-slate-700">Gol. Darah Anak:</label>
                  <select
                    value={bloodType}
                    onChange={(e) => setBloodType(e.target.value)}
                    className="px-2.5 py-1 text-xs font-semibold bg-white border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 text-slate-900 cursor-pointer"
                  >
                    {BLOOD_TYPES.map((bt) => (
                      <option key={bt} value={bt}>
                        {bt}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {/* Kolom Data Ayah */}
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={fatherAvatarUrl}
                        alt={fatherName || 'Ayah'}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-sky-50 shrink-0"
                      />
                      <div>
                        <span className="block text-[11px] font-bold text-sky-900">Profil Ayah</span>
                        <button
                          type="button"
                          onClick={() => fatherFileInputRef.current?.click()}
                          className="text-[10px] font-semibold text-sky-700 hover:underline cursor-pointer"
                        >
                          Ganti Foto
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void downloadMediaFile(fatherAvatarUrl, `foto-${fatherName || 'ayah'}`, 'image')
                      }
                      title="Unduh foto Ayah"
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    ref={fatherFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleFilePick(e, setFatherAvatarUrl)}
                    className="hidden"
                  />

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">Nama Ayah</label>
                    <input
                      type="text"
                      value={fatherName}
                      onChange={(e) => setFatherName(e.target.value)}
                      placeholder="Misal: Ayah Rahman"
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Info / Kontak / Catatan Ayah
                    </label>
                    <input
                      type="text"
                      value={fatherInfo}
                      onChange={(e) => setFatherInfo(e.target.value)}
                      placeholder="No. HP / Gol. Darah / Peran"
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 text-slate-900"
                    />
                  </div>
                </div>

                {/* Kolom Data Ibu */}
                <div className="p-3 rounded-xl bg-white border border-slate-200/80 space-y-2">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <img
                        src={motherAvatarUrl}
                        alt={motherName || 'Ibu'}
                        className="w-9 h-9 rounded-full object-cover border border-slate-200 bg-rose-50 shrink-0"
                      />
                      <div>
                        <span className="block text-[11px] font-bold text-rose-900">
                          Profil Ibu / Bunda
                        </span>
                        <button
                          type="button"
                          onClick={() => motherFileInputRef.current?.click()}
                          className="text-[10px] font-semibold text-rose-700 hover:underline cursor-pointer"
                        >
                          Ganti Foto
                        </button>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() =>
                        void downloadMediaFile(motherAvatarUrl, `foto-${motherName || 'ibu'}`, 'image')
                      }
                      title="Unduh foto Ibu"
                      className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-600 flex items-center justify-center cursor-pointer"
                    >
                      <Download className="w-3 h-3" />
                    </button>
                  </div>
                  <input
                    ref={motherFileInputRef}
                    type="file"
                    accept="image/*"
                    onChange={(e) => void handleFilePick(e, setMotherAvatarUrl)}
                    className="hidden"
                  />

                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Nama Ibu / Bunda
                    </label>
                    <input
                      type="text"
                      value={motherName}
                      onChange={(e) => setMotherName(e.target.value)}
                      placeholder="Misal: Bunda Sarah"
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 text-slate-900"
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="block text-[11px] font-bold text-slate-700">
                      Info / Kontak / Catatan Ibu
                    </label>
                    <input
                      type="text"
                      value={motherInfo}
                      onChange={(e) => setMotherInfo(e.target.value)}
                      placeholder="No. HP / Gol. Darah / ASI & MPASI"
                      className="w-full px-2.5 py-1.5 text-xs bg-[#FAF8F5] border border-slate-200 rounded-lg focus:outline-none focus:border-teal-500 text-slate-900"
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Data Kelahiran: Berat Lahir, Panjang Lahir, LK Lahir */}
            <div className="grid grid-cols-3 gap-2.5 sm:gap-3">
              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-800">
                  Berat Lahir (kg)
                </label>
                <input
                  type="number"
                  step="0.01"
                  value={birthWeightKg}
                  onChange={(e) => setBirthWeightKg(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-800">
                  Panjang Lahir (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={birthHeightCm}
                  onChange={(e) => setBirthHeightCm(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
                />
              </div>

              <div className="space-y-1">
                <label className="block text-[11px] font-bold text-slate-800">
                  LK Lahir (cm)
                </label>
                <input
                  type="number"
                  step="0.1"
                  value={birthHeadCircCm}
                  onChange={(e) => setBirthHeadCircCm(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900"
                />
              </div>
            </div>

            {/* Catatan Khusus / Riwayat Kelahiran */}
            <div className="space-y-1">
              <label className="block text-xs font-bold text-slate-800">
                Catatan Khusus / Riwayat Kelahiran
              </label>
              <textarea
                rows={2}
                value={specialNotes}
                onChange={(e) => setSpecialNotes(e.target.value)}
                placeholder="Contoh: Buah hati tercinta Ayah & Ibu. Lahir spontan sehat, ASI eksklusif dilanjutkan MPASI bernutrisi."
                className="w-full px-3.5 py-2.5 text-xs bg-white border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-slate-900 resize-y"
              />
            </div>

            {/* Footer Action Buttons */}
            <div className="pt-3 border-t border-[#EDE8DF] flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 text-xs font-bold text-slate-600 hover:text-slate-900 cursor-pointer"
              >
                Batal
              </button>
              <button
                type="submit"
                className="px-6 py-2.5 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-full transition-colors shadow-sm cursor-pointer flex items-center gap-2"
              >
                <Save className="w-3.5 h-3.5 text-teal-300" />
                <span>Simpan Perubahan</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
};
