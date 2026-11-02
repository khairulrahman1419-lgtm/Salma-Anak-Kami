/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 *
 * Real-Time Multi-Device Sync Client (HP Ayah <-> HP Bunda)
 * Mendampingi Cloud Firestore & Offline Fallback sehingga perangkat keluarga tetap sinkron
 * seketika bahkan sebelum login Google, serta senyap tanpa error ketika internet sedang offline.
 */

import type {
  ChildProfile,
  GrowthRecord,
  MilestoneChecklistItem,
  MomentItem,
  ParentingQuoteItem,
} from '../types/index.ts';

export interface FamilySnapshotPayload {
  profile: ChildProfile;
  moments: MomentItem[];
  records: GrowthRecord[];
  milestones: MilestoneChecklistItem[];
  parentingQuotes?: ParentingQuoteItem[];
  updatedAt?: string;
}

export interface RealtimeSyncHandlers {
  onFullState: (state: FamilySnapshotPayload) => void;
  onProfileUpdated: (profile: ChildProfile, isFromOtherDevice: boolean) => void;
  onMomentCreated: (moment: MomentItem, isFromOtherDevice: boolean) => void;
  onMomentUpdated: (moment: MomentItem, isFromOtherDevice: boolean) => void;
  onGrowthCreated: (record: GrowthRecord, isFromOtherDevice: boolean) => void;
  onMilestoneToggled: (milestone: MilestoneChecklistItem, isFromOtherDevice: boolean) => void;
  onQuoteUpdated?: (quote: ParentingQuoteItem, isFromOtherDevice: boolean) => void;
  onPresenceCount?: (count: number) => void;
  onConnectionChange?: (isLive: boolean) => void;
}

const CLIENT_DEVICE_ID = `dev_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

export function getClientDeviceId(): string {
  return CLIENT_DEVICE_ID;
}

export async function pushFamilyMutation(
  action:
    | 'profile:update'
    | 'moment:create'
    | 'moment:update'
    | 'growth:create'
    | 'milestone:toggle'
    | 'quote:update'
    | 'cloud:reconcile',
  payload: unknown
): Promise<boolean> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return false;
  }

  try {
    const res = await fetch('/api/family-sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        action,
        payload,
        senderId: CLIENT_DEVICE_ID,
      }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function fetchOnlineFamilyState(): Promise<FamilySnapshotPayload | null> {
  if (typeof navigator !== 'undefined' && !navigator.onLine) {
    return null;
  }

  try {
    const res = await fetch('/api/family-state', { cache: 'no-store' });
    if (!res.ok) return null;
    return (await res.json()) as FamilySnapshotPayload;
  } catch {
    return null;
  }
}

export function connectRealtimeFamilySync(handlers: RealtimeSyncHandlers): () => void {
  let ws: WebSocket | null = null;
  let reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  let disposed = false;
  let retryDelayMs = 1500;

  const syncViaHttp = async () => {
    if (typeof navigator !== 'undefined' && !navigator.onLine) return;
    const state = await fetchOnlineFamilyState();
    if (state && !disposed) {
      handlers.onFullState(state);
    }
  };

  const openSocket = () => {
    if (disposed) return;
    if (ws && (ws.readyState === WebSocket.OPEN || ws.readyState === WebSocket.CONNECTING)) {
      return;
    }
    if (typeof navigator !== 'undefined' && !navigator.onLine) {
      handlers.onConnectionChange?.(false);
      return;
    }

    try {
      const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
      const socketUrl = `${protocol}//${window.location.host}/ws/sync`;
      const socket = new WebSocket(socketUrl);
      ws = socket;

      ws.onopen = () => {
        retryDelayMs = 1500;
        handlers.onConnectionChange?.(true);
      };

      ws.onmessage = (event) => {
        if (disposed) return;
        try {
          const msg = JSON.parse(String(event.data));
          if (msg.type === 'sync:init' && msg.payload) {
            handlers.onFullState(msg.payload as FamilySnapshotPayload);
            if (typeof msg.connectedDevices === 'number') {
              handlers.onPresenceCount?.(msg.connectedDevices);
            }
          } else if (msg.type === 'presence:update' && typeof msg.connectedDevices === 'number') {
            handlers.onPresenceCount?.(msg.connectedDevices);
          } else if (msg.type === 'sync:event') {
            const isFromOtherDevice = Boolean(msg.senderId && msg.senderId !== CLIENT_DEVICE_ID);
            switch (msg.action) {
              case 'profile:update':
                handlers.onProfileUpdated(msg.payload as ChildProfile, isFromOtherDevice);
                break;
              case 'moment:create':
                handlers.onMomentCreated(msg.payload as MomentItem, isFromOtherDevice);
                break;
              case 'moment:update':
                handlers.onMomentUpdated(msg.payload as MomentItem, isFromOtherDevice);
                break;
              case 'growth:create':
                handlers.onGrowthCreated(msg.payload as GrowthRecord, isFromOtherDevice);
                break;
              case 'milestone:toggle':
                handlers.onMilestoneToggled(
                  msg.payload as MilestoneChecklistItem,
                  isFromOtherDevice
                );
                break;
              case 'quote:update':
                handlers.onQuoteUpdated?.(msg.payload as ParentingQuoteItem, isFromOtherDevice);
                break;
            }
          }
        } catch (err) {
          console.warn('Error parsing real-time sync message:', err);
        }
      };

      ws.onclose = () => {
        handlers.onConnectionChange?.(false);
        if (!disposed && (typeof navigator === 'undefined' || navigator.onLine)) {
          reconnectTimer = setTimeout(() => {
            retryDelayMs = Math.min(retryDelayMs * 1.5, 10000);
            openSocket();
          }, retryDelayMs);
        }
      };

      ws.onerror = () => {
        if (ws && ws.readyState === WebSocket.OPEN) {
          ws.close();
        }
      };
    } catch {
      if (!disposed && (typeof navigator === 'undefined' || navigator.onLine)) {
        reconnectTimer = setTimeout(openSocket, retryDelayMs);
      }
    }
  };

  void syncViaHttp();
  openSocket();

  const handleVisibilityOrOnline = () => {
    if (document.visibilityState === 'visible' && navigator.onLine) {
      void syncViaHttp();
      if (!ws || ws.readyState === WebSocket.CLOSED) {
        openSocket();
      }
    }
  };

  const handleOffline = () => {
    handlers.onConnectionChange?.(false);
    if (reconnectTimer) clearTimeout(reconnectTimer);
  };

  document.addEventListener('visibilitychange', handleVisibilityOrOnline);
  window.addEventListener('online', handleVisibilityOrOnline);
  window.addEventListener('offline', handleOffline);

  return () => {
    disposed = true;
    document.removeEventListener('visibilitychange', handleVisibilityOrOnline);
    window.removeEventListener('online', handleVisibilityOrOnline);
    window.removeEventListener('offline', handleOffline);
    if (reconnectTimer) clearTimeout(reconnectTimer);
    if (ws) {
      const socketToClose = ws;
      ws = null;
      socketToClose.onclose = null;
      socketToClose.onerror = null;
      socketToClose.onmessage = null;
      if (socketToClose.readyState === WebSocket.CONNECTING) {
        socketToClose.onopen = () => {
          socketToClose.close();
        };
      } else if (socketToClose.readyState === WebSocket.OPEN) {
        socketToClose.close();
      }
    }
  };
}
