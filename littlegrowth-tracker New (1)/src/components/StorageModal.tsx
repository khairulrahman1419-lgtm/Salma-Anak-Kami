import React from 'react';
import { X, Cloud, HardDrive, CheckCircle2 } from 'lucide-react';
import type { User } from 'firebase/auth';
import { StorageDestinationCard } from './StorageDestinationCard.tsx';

interface StorageModalProps {
  isOpen: boolean;
  onClose: () => void;
  storageDestination: 'google_drive' | 'vps_local';
  onSelectDestination: (dest: 'google_drive' | 'vps_local') => void;
  currentUser: User | null;
  driveQuota: { usageGb: string; limitGb: string } | null;
  isConnecting: boolean;
  onConnectGoogle: () => void;
  onDisconnectGoogle: () => void;
  childName: string;
}

export const StorageModal: React.FC<StorageModalProps> = ({
  isOpen,
  onClose,
  storageDestination,
  onSelectDestination,
  currentUser,
  driveQuota,
  isConnecting,
  onConnectGoogle,
  onDisconnectGoogle,
  childName,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="relative w-full max-w-md bg-[#FFFDF9] rounded-3xl border border-[#EDE8DF] shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="px-5 py-4 border-b border-[#EDE8DF] flex items-center justify-between bg-[#FAF8F5]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-sky-100 text-sky-800 flex items-center justify-center">
              <Cloud className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-900">Pengaturan Penyimpanan</h3>
              <p className="text-[11px] text-slate-500">Google Drive & Cadangan Berkas</p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full text-slate-400 hover:text-slate-700 flex items-center justify-center cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 sm:p-5">
          <StorageDestinationCard
            storageDestination={storageDestination}
            onSelectDestination={onSelectDestination}
            currentUser={currentUser}
            driveQuota={driveQuota}
            isConnecting={isConnecting}
            onConnectGoogle={onConnectGoogle}
            onDisconnectGoogle={onDisconnectGoogle}
            childName={childName}
          />
        </div>

        {/* Footer */}
        <div className="px-5 py-3 border-t border-[#EDE8DF] bg-[#FAF8F5] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-white bg-slate-900 hover:bg-slate-800 rounded-xl transition-colors cursor-pointer"
          >
            Selesai
          </button>
        </div>
      </div>
    </div>
  );
};
