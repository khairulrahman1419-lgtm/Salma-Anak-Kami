import React, { useState, useRef } from 'react';
import { X, User, Calendar, Save, Camera, UploadCloud, Check, UserCheck, Sparkles, Image as ImageIcon } from 'lucide-react';
import type { ChildProfile, Gender } from '../types/index.ts';

interface EditProfileModalProps {
  isOpen: boolean;
  profile: ChildProfile;
  onClose: () => void;
  onSaveProfile: (updated: ChildProfile) => void;
}

const PRESET_CHILD_AVATARS = [
  { label: 'Ceria Utama', url: '/src/assets/images/child_avatar_1792502522791.jpg' },
  { label: 'Bermain Balok', url: '/src/assets/images/moment_toddler_blocks_1792555577885.jpg' },
  { label: 'Taman Ceria', url: '/src/assets/images/moment_playing_park_1792502524857.jpg' },
  { label: 'Langkah Pertama', url: '/src/assets/images/moment_first_steps_1792502523399.jpg' },
  { label: 'Momen Makan', url: '/src/assets/images/moment_eating_puree_1792555107552.jpg' },
  { label: 'Tidur Pulas', url: '/src/assets/images/moment_sleeping_peaceful_1792555107760.jpg' },
];

const PRESET_FATHER_AVATARS = [
  { label: 'Ayah Bahagia', url: '/src/assets/images/moment_father_play_1792555577232.jpg' },
  { label: 'Membaca Buku', url: '/src/assets/images/moment_reading_book_1792502524701.jpg' },
];

export const EditProfileModal: React.FC<EditProfileModalProps> = ({
  isOpen,
  profile,
  onClose,
  onSaveProfile,
}) => {
  const childFileInputRef = useRef<HTMLInputElement>(null);
  const fatherFileInputRef = useRef<HTMLInputElement>(null);

  const [activeTab, setActiveTab] = useState<'child' | 'account'>('child');

  // Child Profile States
  const [avatarUrl, setAvatarUrl] = useState(profile.avatarUrl);
  const [name, setName] = useState(profile.name);
  const [nickname, setNickname] = useState(profile.nickname);
  const [birthDate, setBirthDate] = useState(profile.birthDate);
  const [gender, setGender] = useState<Gender>(profile.gender);
  const [birthWeightKg, setBirthWeightKg] = useState(String(profile.birthWeightKg));
  const [birthHeightCm, setBirthHeightCm] = useState(String(profile.birthHeightCm));

  // Account / Father States
  const [fatherName, setFatherName] = useState(profile.fatherName);
  const [fatherAvatarUrl, setFatherAvatarUrl] = useState(
    profile.fatherAvatarUrl || '/src/assets/images/moment_father_play_1792555577232.jpg'
  );

  if (!isOpen) return null;

  // Handle Child Avatar File Pick
  const handleChildAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  // Handle Father Avatar File Pick
  const handleFatherAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      const reader = new FileReader();
      reader.onload = () => {
        if (typeof reader.result === 'string') {
          setFatherAvatarUrl(reader.result);
        }
      };
      reader.readAsDataURL(file);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSaveProfile({
      ...profile,
      avatarUrl,
      name: name.trim() || profile.name,
      nickname: nickname.trim() || profile.nickname,
      birthDate,
      gender,
      fatherName: fatherName.trim() || profile.fatherName,
      fatherAvatarUrl,
      birthWeightKg: parseFloat(birthWeightKg) || profile.birthWeightKg,
      birthHeightCm: parseFloat(birthHeightCm) || profile.birthHeightCm,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-3 sm:p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] shadow-2xl overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="px-5 py-4 border-b border-[#EDE8DF] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-100 text-emerald-800 flex items-center justify-center">
              <Camera className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm sm:text-base font-bold text-slate-900">
                Ubah Tampilan Foto & Profil
              </h3>
              <p className="text-[11px] text-slate-500">
                Ganti foto anak, foto akun ayah, dan biodata
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Tutup"
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher between Child Profile & Account / Father Profile */}
        <div className="flex items-center border-b border-[#EDE8DF] bg-[#FAF8F5]/80 px-4 pt-2">
          <button
            type="button"
            onClick={() => setActiveTab('child')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'child'
                ? 'border-emerald-600 text-emerald-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <User className="w-3.5 h-3.5" />
            <span>Foto & Profil Anak</span>
          </button>

          <button
            type="button"
            onClick={() => setActiveTab('account')}
            className={`flex items-center gap-2 px-4 py-2 text-xs font-bold border-b-2 cursor-pointer transition-colors ${
              activeTab === 'account'
                ? 'border-sky-600 text-sky-800'
                : 'border-transparent text-slate-500 hover:text-slate-800'
            }`}
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>Foto & Akun Ayah</span>
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSubmit} className="p-5 space-y-4 overflow-y-auto flex-1">
          {activeTab === 'child' ? (
            /* TAB 1: CHILD PROFILE & PHOTO EDIT */
            <div className="space-y-4">
              {/* UPLOAD & GANTI FOTO ANAK */}
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E9E4DB] flex flex-col items-center space-y-3">
                <span className="text-xs font-bold text-slate-800">Foto Profil Anak Saat Ini:</span>

                <div
                  className="relative group cursor-pointer"
                  onClick={() => childFileInputRef.current?.click()}
                  title="Klik untuk memilih foto dari HP atau kamera"
                >
                  <div className="w-24 h-24 rounded-2xl overflow-hidden border-3 border-white shadow-md bg-amber-50">
                    <img
                      src={avatarUrl}
                      alt={name}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-2xl flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] font-bold">Ganti Foto</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-emerald-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </div>

                {/* Hidden input for camera / local gallery file pick */}
                <input
                  ref={childFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleChildAvatarChange}
                  className="hidden"
                />

                <div className="text-center space-y-1 w-full">
                  <button
                    type="button"
                    onClick={() => childFileInputRef.current?.click()}
                    className="w-full justify-center text-xs font-bold text-emerald-800 hover:text-emerald-900 bg-emerald-50 hover:bg-emerald-100/70 border border-emerald-200/80 px-3 py-2 rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <UploadCloud className="w-4 h-4 text-emerald-600" />
                    <span>Upload Foto Anak dari Galeri / Kamera</span>
                  </button>
                  <p className="text-[10px] text-slate-400">
                    Langsung pilih foto dari galeri smartphone Anda (JPG/PNG/WEBP)
                  </p>
                </div>

                {/* Presets Gallery for Child */}
                <div className="pt-2 border-t border-slate-200/80 w-full">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2 text-center">
                    Atau Pilih Foto Pilihan:
                  </span>
                  <div className="grid grid-cols-6 gap-1.5">
                    {PRESET_CHILD_AVATARS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setAvatarUrl(av.url)}
                        title={av.label}
                        className={`aspect-square rounded-xl overflow-hidden border-2 transition-all cursor-pointer relative ${
                          avatarUrl === av.url
                            ? 'border-emerald-600 scale-105 shadow-xs ring-2 ring-emerald-500/20'
                            : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                        {avatarUrl === av.url && (
                          <div className="absolute inset-0 bg-emerald-600/30 flex items-center justify-center text-white">
                            <Check className="w-3 h-3 drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Biodata Anak Fields */}
              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">Nama Lengkap Anak</label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Nama Panggilan</label>
                  <input
                    type="text"
                    required
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-xs font-bold text-slate-800">Jenis Kelamin</label>
                  <select
                    value={gender}
                    onChange={(e) => setGender(e.target.value as Gender)}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  >
                    <option value="male">Laki-laki</option>
                    <option value="female">Perempuan</option>
                  </select>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">Tanggal Lahir</label>
                <input
                  type="date"
                  required
                  value={birthDate}
                  onChange={(e) => setBirthDate(e.target.value)}
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">Berat Lahir (kg)</label>
                  <input
                    type="number"
                    step="0.01"
                    value={birthWeightKg}
                    onChange={(e) => setBirthWeightKg(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>

                <div className="space-y-1">
                  <label className="block text-[11px] font-bold text-slate-700">Tinggi Lahir (cm)</label>
                  <input
                    type="number"
                    step="0.1"
                    value={birthHeightCm}
                    onChange={(e) => setBirthHeightCm(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-emerald-500/20 text-slate-900"
                  />
                </div>
              </div>
            </div>
          ) : (
            /* TAB 2: ACCOUNT & FATHER PHOTO EDIT */
            <div className="space-y-4">
              <div className="p-4 rounded-2xl bg-[#FAF8F5] border border-[#E9E4DB] flex flex-col items-center space-y-3">
                <span className="text-xs font-bold text-slate-800">Foto Profil Akun Ayah:</span>

                <div
                  className="relative group cursor-pointer"
                  onClick={() => fatherFileInputRef.current?.click()}
                  title="Klik untuk memilih foto profil akun dari HP"
                >
                  <div className="w-24 h-24 rounded-full overflow-hidden border-3 border-white shadow-md bg-sky-50">
                    <img
                      src={fatherAvatarUrl}
                      alt={fatherName}
                      referrerPolicy="no-referrer"
                      className="w-full h-full object-cover group-hover:scale-105 transition-transform"
                    />
                  </div>
                  <div className="absolute inset-0 bg-black/40 rounded-full flex flex-col items-center justify-center text-white opacity-0 group-hover:opacity-100 transition-opacity">
                    <Camera className="w-5 h-5 mb-0.5" />
                    <span className="text-[10px] font-bold">Ganti Foto</span>
                  </div>
                  <div className="absolute -bottom-1 -right-1 w-7 h-7 bg-sky-600 text-white rounded-full flex items-center justify-center border-2 border-white shadow-sm">
                    <Camera className="w-3.5 h-3.5" />
                  </div>
                </div>

                <input
                  ref={fatherFileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFatherAvatarChange}
                  className="hidden"
                />

                <div className="text-center space-y-1 w-full">
                  <button
                    type="button"
                    onClick={() => fatherFileInputRef.current?.click()}
                    className="w-full justify-center text-xs font-bold text-sky-800 hover:text-sky-900 bg-sky-50 hover:bg-sky-100/70 border border-sky-200/80 px-3 py-2 rounded-xl shadow-2xs cursor-pointer flex items-center gap-1.5 transition-colors"
                  >
                    <UploadCloud className="w-4 h-4 text-sky-600" />
                    <span>Upload Foto Profil Akun dari HP</span>
                  </button>
                  <p className="text-[10px] text-slate-400">
                    Ganti foto akun ayah untuk personalisasi jurnal buah hati
                  </p>
                </div>

                {/* Presets for Father */}
                <div className="pt-2 border-t border-slate-200/80 w-full">
                  <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider block mb-2 text-center">
                    Foto Pilihan Ayah:
                  </span>
                  <div className="flex items-center justify-center gap-3">
                    {PRESET_FATHER_AVATARS.map((av, idx) => (
                      <button
                        key={idx}
                        type="button"
                        onClick={() => setFatherAvatarUrl(av.url)}
                        title={av.label}
                        className={`w-12 h-12 rounded-full overflow-hidden border-2 transition-all cursor-pointer relative ${
                          fatherAvatarUrl === av.url
                            ? 'border-sky-600 scale-105 shadow-xs ring-2 ring-sky-500/20'
                            : 'border-slate-200 opacity-70 hover:opacity-100'
                        }`}
                      >
                        <img src={av.url} alt={av.label} className="w-full h-full object-cover" />
                        {fatherAvatarUrl === av.url && (
                          <div className="absolute inset-0 bg-sky-600/30 flex items-center justify-center text-white">
                            <Check className="w-3.5 h-3.5 drop-shadow" />
                          </div>
                        )}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-1">
                <label className="block text-xs font-bold text-slate-800">Nama Akun / Ayah</label>
                <input
                  type="text"
                  required
                  value={fatherName}
                  onChange={(e) => setFatherName(e.target.value)}
                  placeholder="Misal: Ayah Dimas"
                  className="w-full px-3 py-2 text-xs bg-[#FAF8F5] border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-sky-500/20 text-slate-900"
                />
                <p className="text-[10px] text-slate-400">
                  Nama ini akan tertera pada catatan jurnal dan pengingat tumbuh kembang anak.
                </p>
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="pt-4 border-t border-[#EDE8DF] flex items-center justify-end gap-2.5">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:text-slate-800 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-5 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors shadow-xs cursor-pointer flex items-center gap-1.5"
            >
              <Save className="w-3.5 h-3.5 text-emerald-300" />
              <span>Simpan Perubahan</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
