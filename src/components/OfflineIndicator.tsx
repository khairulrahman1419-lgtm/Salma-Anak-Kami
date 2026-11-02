import React from 'react';
import { WifiOff, Clock, RefreshCw } from 'lucide-react';
import { useOnlineStatus } from '../hooks/usePWAInstall.ts';

interface OfflineIndicatorProps {
  pendingCount?: number;
  isSyncing?: boolean;
  onRetrySync?: () => void;
}

export const OfflineIndicator: React.FC<OfflineIndicatorProps> = ({
  pendingCount = 0,
  isSyncing = false,
  onRetrySync,
}) => {
  const isOnline = useOnlineStatus();

  if (isOnline && pendingCount === 0) return null;

  if (!isOnline) {
    return (
      <div className="fixed bottom-18 md:bottom-6 left-4 z-50 flex items-center gap-2 rounded-2xl bg-amber-600 px-3.5 py-2 text-xs font-semibold text-white shadow-lg animate-in slide-in-from-bottom duration-200 max-w-xs sm:max-w-md">
        <WifiOff className="w-3.5 h-3.5 shrink-0" />
        <span>
          {pendingCount > 0
            ? 'Tersimpan Lokal (Menunggu Sinkronisasi) — Offline'
            : 'Mode Offline — Data tersimpan di perangkat (IndexedDB / LocalStorage)'}
        </span>
      </div>
    );
  }

  return (
    <div className="fixed bottom-18 md:bottom-6 left-4 z-50 flex items-center gap-2.5 rounded-2xl bg-amber-50 border border-amber-300 px-3.5 py-2 text-xs font-bold text-amber-950 shadow-lg animate-in slide-in-from-bottom duration-200 max-w-xs sm:max-w-md">
      <Clock className="w-3.5 h-3.5 text-amber-700 shrink-0 animate-pulse" />
      <span>
        Tersimpan Lokal (Menunggu Sinkronisasi{pendingCount > 1 ? ` • ${pendingCount}` : ''})
      </span>
      {onRetrySync && (
        <button
          type="button"
          onClick={onRetrySync}
          disabled={isSyncing}
          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-600 hover:bg-amber-700 disabled:opacity-60 text-white text-[10px] font-bold transition-colors cursor-pointer shrink-0"
        >
          <RefreshCw className={`w-2.5 h-2.5 ${isSyncing ? 'animate-spin' : ''}`} />
          <span>{isSyncing ? 'Sinkron...' : 'Sinkronkan'}</span>
        </button>
      )}
    </div>
  );
};
