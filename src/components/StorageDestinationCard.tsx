import React from 'react';
import { Cloud, HardDrive, CheckCircle2, LogOut, Loader2, Folder, ExternalLink } from 'lucide-react';
import type { User } from 'firebase/auth';

interface StorageDestinationCardProps {
  storageDestination: 'google_drive' | 'vps_local';
  onSelectDestination: (dest: 'google_drive' | 'vps_local') => void;
  currentUser: User | null;
  driveQuota: { usageGb: string; limitGb: string } | null;
  isConnecting: boolean;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
  childName: string;
}

export const StorageDestinationCard: React.FC<StorageDestinationCardProps> = ({
  storageDestination,
  onSelectDestination,
  currentUser,
  driveQuota,
  isConnecting,
  onConnectGoogle,
  onDisconnectGoogle,
  childName,
}) => {
  return (
    <div className="bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] p-5 sm:p-6 shadow-xs space-y-4">
      {/* Label Tujuan Penyimpanan */}
      <div>
        <span className="text-[11px] font-bold tracking-wider text-slate-500 uppercase">
          Tujuan Penyimpanan:
        </span>

        {/* Tab Pilihan: Google Drive vs Server VPS / Lokal */}
        <div className="grid grid-cols-2 gap-3 mt-2.5">
          <button
            type="button"
            onClick={() => onSelectDestination('google_drive')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              storageDestination === 'google_drive'
                ? 'bg-sky-50 text-sky-900 border-2 border-sky-400 shadow-xs'
                : 'bg-[#FAF8F5] text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <Cloud className={`w-4 h-4 ${storageDestination === 'google_drive' ? 'text-sky-600' : 'text-slate-400'}`} />
            <span>Google Drive</span>
          </button>

          <button
            type="button"
            onClick={() => onSelectDestination('vps_local')}
            className={`flex items-center justify-center gap-2 py-3 px-4 rounded-2xl font-bold text-xs sm:text-sm transition-all cursor-pointer ${
              storageDestination === 'vps_local'
                ? 'bg-emerald-50 text-emerald-900 border-2 border-emerald-400 shadow-xs'
                : 'bg-[#FAF8F5] text-slate-600 hover:text-slate-900 border border-slate-200'
            }`}
          >
            <HardDrive className={`w-4 h-4 ${storageDestination === 'vps_local' ? 'text-emerald-600' : 'text-slate-400'}`} />
            <span>Server VPS / Lokal</span>
          </button>
        </div>
      </div>

      {/* Konten Berdasarkan Pilihan Penyimpanan */}
      {storageDestination === 'google_drive' ? (
        <div className="space-y-3">
          {!currentUser ? (
            /* Kotak Kuning / Amber Persis Sesuai Screenshot User */
            <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4 sm:p-5 space-y-3">
              <p className="text-xs sm:text-sm text-amber-900 leading-relaxed font-medium">
                Hubungkan akun Google Drive pribadi Anda untuk upload otomatis (Kuota 15 GB, sama seperti di E-Agenda).
              </p>

              {/* Tombol Resmi "Hubungkan Akun Google" dengan logo Google */}
              <button
                type="button"
                onClick={onConnectGoogle}
                disabled={isConnecting}
                className="w-full bg-white hover:bg-slate-50 text-slate-800 font-bold text-xs sm:text-sm py-2.5 px-4 rounded-xl border border-slate-200 shadow-xs flex items-center justify-center gap-2.5 transition-all cursor-pointer active:scale-[0.99] disabled:opacity-60"
              >
                {isConnecting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin text-slate-500" />
                    <span>Menghubungkan ke Google...</span>
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4" viewBox="0 0 24 24">
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
                    <span>Hubungkan Akun Google</span>
                  </>
                )}
              </button>
            </div>
          ) : (
            /* Akun Google Sudah Terhubung */
            <div className="rounded-2xl bg-sky-50/60 border border-sky-200 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Akun Google'}
                    referrerPolicy="no-referrer"
                    className="w-10 h-10 rounded-full border border-sky-300 shadow-xs shrink-0"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center shrink-0">
                    {(currentUser.displayName || currentUser.email || 'G').charAt(0).toUpperCase()}
                  </div>
                )}
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs sm:text-sm font-bold text-slate-900">
                      {currentUser.displayName || 'Akun Google'}
                    </span>
                    <span className="text-[10px] font-semibold text-emerald-700 bg-emerald-100/70 px-2 py-0.5 rounded-md flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      Terhubung
                    </span>
                  </div>
                  <p className="text-xs text-slate-500">{currentUser.email}</p>
                  <p className="text-[11px] text-sky-800 font-medium mt-0.5 flex items-center gap-1">
                    <Folder className="w-3 h-3 text-sky-600" />
                    Folder otomatis: <strong>Jurnal Tumbuh Kembang - {childName}</strong>
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-3 self-end sm:self-center">
                {driveQuota && (
                  <div className="text-right hidden sm:block text-xs">
                    <span className="text-[11px] text-slate-500 block">Kapasitas Drive:</span>
                    <span className="font-bold text-slate-800 tabular-nums">
                      {driveQuota.usageGb} GB / {driveQuota.limitGb} GB
                    </span>
                  </div>
                )}
                <button
                  type="button"
                  onClick={onDisconnectGoogle}
                  className="px-3 py-1.5 text-xs font-semibold text-rose-700 hover:text-rose-800 bg-white hover:bg-rose-50 border border-rose-200 rounded-xl transition-colors flex items-center gap-1 cursor-pointer"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>Putuskan</span>
                </button>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Pilihan Server VPS / Lokal */
        <div className="rounded-2xl bg-emerald-50/50 border border-emerald-200 p-4 sm:p-5 text-xs text-emerald-950 space-y-1">
          <p className="font-bold flex items-center gap-1.5">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Mode Penyimpanan Lokal & Cache Browser Aktif
          </p>
          <p className="text-slate-600 text-[11px] leading-relaxed">
            Foto, video, dan catatan milestone tersimpan langsung di browser perangkat Anda dan dapat diekspor menjadi file JSON kapan saja tanpa perlu login Google.
          </p>
        </div>
      )}
    </div>
  );
};
