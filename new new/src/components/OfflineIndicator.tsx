import React from 'react';
import { WifiOff } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall.ts';

export const OfflineIndicator: React.FC = () => {
  const isOnline = useOnlineStatus();

  if (isOnline) return null;

  return (
    <div className="fixed bottom-18 md:bottom-6 left-4 z-50 flex items-center gap-2 rounded-2xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg animate-in slide-in-from-bottom duration-200">
      <WifiOff className="w-3.5 h-3.5 shrink-0" />
      <span>Mode Offline — Data tersimpan lokal sedang digunakan</span>
    </div>
  );
};
