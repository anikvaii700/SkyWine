import React, { useState, useEffect, useRef } from 'react';
import {
  Bell,
  ArrowUpRight,
  X,
  Smartphone,
  CreditCard,
  Coins,
  ArrowDownLeft,
  Volume2,
} from 'lucide-react';
import { soundManager } from '../services/audio';
import {
  ManualDepositRequest,
  ManualWithdrawalRequest,
  listenToDepositRequests,
  listenToWithdrawalRequests,
} from '../services/manualPayment';
import { isPublicAdminVisible, isUserAdminAccount } from '../services/adminAuth';

interface AdminNotificationBannerProps {
  currentUserPhone?: string | null;
  onOpenAdminPanel: (targetTab?: 'requests' | 'withdrawals') => void;
}

interface AlertNotification {
  id: string;
  type: 'deposit' | 'withdrawal';
  amount: number;
  method: string;
  senderOrPersonalNumber: string;
  trxId?: string;
  userCode?: string;
  createdAt: string;
}

const STORAGE_LAST_SEEN_DEPOSIT_KEY = 'aviator_admin_last_seen_deposit_ts';
const STORAGE_LAST_SEEN_WITHDRAWAL_KEY = 'aviator_admin_last_seen_withdrawal_ts';

export const AdminNotificationBanner: React.FC<AdminNotificationBannerProps> = ({
  currentUserPhone,
  onOpenAdminPanel,
}) => {
  const [activeAlert, setActiveAlert] = useState<AlertNotification | null>(null);
  const [queue, setQueue] = useState<AlertNotification[]>([]);
  const isInitialLoadRef = useRef(true);

  // Check if current device has admin privileges enabled
  const isAdmin =
    isPublicAdminVisible() ||
    isUserAdminAccount(currentUserPhone) ||
    (typeof window !== 'undefined' && localStorage.getItem('aviator_admin_stealth_mode_v1') === 'true');

  // Trigger browser web notification if allowed
  const sendBrowserNotification = (alert: AlertNotification) => {
    if (typeof window === 'undefined' || !('Notification' in window)) return;

    if (Notification.permission === 'granted') {
      try {
        const title =
          alert.type === 'deposit'
            ? '🔔 নতুন এডমানি (ডিপোজিট) রিকোয়েস্ট এসেছে!'
            : '🔔 নতুন ক্যাশআউট (উইথড্র) রিকোয়েস্ট এসেছে!';
        const body =
          alert.type === 'deposit'
            ? `নম্বর: ${alert.senderOrPersonalNumber} | পরিমাণ: ৳ ${alert.amount} | মেথড: ${alert.method.toUpperCase()} (TrxID: ${alert.trxId || ''})`
            : `পার্সোনাল নম্বর: ${alert.senderOrPersonalNumber} | পরিমাণ: ৳ ${alert.amount} | মেথড: ${alert.method.toUpperCase()}`;

        new Notification(title, {
          body,
          icon: '/pwa-192x192.png',
          badge: '/pwa-192x192.png',
        });
      } catch (err) {
        console.warn('Browser notification error:', err);
      }
    }
  };

  // Helper to trigger alert notification
  const triggerNotification = (newAlert: AlertNotification) => {
    soundManager.playNotificationChime();
    sendBrowserNotification(newAlert);

    setActiveAlert((current) => {
      if (!current) return newAlert;
      // If already an active alert, append to queue
      setQueue((q) => [...q, newAlert]);
      return current;
    });
  };

  // Listen to deposits in real-time
  useEffect(() => {
    const unsubscribe = listenToDepositRequests((requests: ManualDepositRequest[]) => {
      const pendingRequests = requests.filter((r) => r.status === 'pending');

      if (isInitialLoadRef.current) {
        // Save latest timestamp on initial load
        if (pendingRequests.length > 0) {
          const maxTs = Math.max(...pendingRequests.map((r) => new Date(r.createdAt).getTime()));
          localStorage.setItem(STORAGE_LAST_SEEN_DEPOSIT_KEY, String(maxTs));
        }
        return;
      }

      // Check for incoming pending requests that are newer than last seen
      const lastSeenTs = Number(localStorage.getItem(STORAGE_LAST_SEEN_DEPOSIT_KEY) || '0');
      const brandNew = pendingRequests.filter(
        (r) => new Date(r.createdAt).getTime() > lastSeenTs
      );

      if (brandNew.length > 0 && isAdmin) {
        const newest = brandNew[0];
        const newMaxTs = Math.max(...brandNew.map((r) => new Date(r.createdAt).getTime()));
        localStorage.setItem(STORAGE_LAST_SEEN_DEPOSIT_KEY, String(newMaxTs));

        triggerNotification({
          id: newest.id,
          type: 'deposit',
          amount: newest.amount,
          method: newest.method,
          senderOrPersonalNumber: newest.senderNumber,
          trxId: newest.trxId,
          userCode: newest.userCode,
          createdAt: newest.createdAt,
        });
      }
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Listen to withdrawals in real-time
  useEffect(() => {
    const unsubscribe = listenToWithdrawalRequests((requests: ManualWithdrawalRequest[]) => {
      const pendingRequests = requests.filter((r) => r.status === 'pending');

      if (isInitialLoadRef.current) {
        if (pendingRequests.length > 0) {
          const maxTs = Math.max(...pendingRequests.map((r) => new Date(r.createdAt).getTime()));
          localStorage.setItem(STORAGE_LAST_SEEN_WITHDRAWAL_KEY, String(maxTs));
        }
        isInitialLoadRef.current = false;
        return;
      }

      const lastSeenTs = Number(localStorage.getItem(STORAGE_LAST_SEEN_WITHDRAWAL_KEY) || '0');
      const brandNew = pendingRequests.filter(
        (r) => new Date(r.createdAt).getTime() > lastSeenTs
      );

      if (brandNew.length > 0 && isAdmin) {
        const newest = brandNew[0];
        const newMaxTs = Math.max(...brandNew.map((r) => new Date(r.createdAt).getTime()));
        localStorage.setItem(STORAGE_LAST_SEEN_WITHDRAWAL_KEY, String(newMaxTs));

        triggerNotification({
          id: newest.id,
          type: 'withdrawal',
          amount: newest.amount,
          method: newest.method,
          senderOrPersonalNumber: newest.personalNumber,
          userCode: newest.userCode,
          createdAt: newest.createdAt,
        });
      }
    });

    return () => unsubscribe();
  }, [isAdmin]);

  // Auto-dismiss or process next queue item after 12 seconds
  useEffect(() => {
    if (!activeAlert) return;

    const timer = setTimeout(() => {
      dismissCurrentAlert();
    }, 12000);

    return () => clearTimeout(timer);
  }, [activeAlert]);

  const dismissCurrentAlert = () => {
    setActiveAlert(null);
    if (queue.length > 0) {
      const next = queue[0];
      setQueue((q) => q.slice(1));
      setTimeout(() => {
        setActiveAlert(next);
        soundManager.playNotificationChime();
      }, 400);
    }
  };

  const handleOpenAdmin = (tab: 'requests' | 'withdrawals') => {
    soundManager.playClick();
    dismissCurrentAlert();
    onOpenAdminPanel(tab);
  };

  // Listen for test notification trigger from Admin Panel
  useEffect(() => {
    const handleTestNotification = (e: Event) => {
      const customEvent = e as CustomEvent<{ type?: 'deposit' | 'withdrawal' }>;
      const testType = customEvent.detail?.type || 'deposit';
      triggerNotification({
        id: `test_${Date.now()}`,
        type: testType,
        amount: testType === 'deposit' ? 500 : 1000,
        method: 'bkash',
        senderOrPersonalNumber: '01712345678',
        trxId: testType === 'deposit' ? 'BKASH987XYZ' : undefined,
        userCode: 'USER-10842',
        createdAt: new Date().toISOString(),
      });
    };

    window.addEventListener('trigger_admin_test_notification', handleTestNotification);
    return () => window.removeEventListener('trigger_admin_test_notification', handleTestNotification);
  }, []);

  if (!activeAlert || !isAdmin) return null;

  const isDep = activeAlert.type === 'deposit';

  return (
    <div className="fixed top-3 left-3 right-3 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-in fade-in slide-in-from-top-4 duration-300">
      <div
        className={`relative overflow-hidden rounded-2xl border backdrop-blur-xl shadow-2xl p-4 ${
          isDep
            ? 'bg-slate-900/95 border-emerald-500/60 shadow-emerald-950/50'
            : 'bg-slate-900/95 border-amber-500/60 shadow-amber-950/50'
        }`}
      >
        {/* Glowing aura effect */}
        <div
          className={`absolute -top-12 -right-12 w-32 h-32 rounded-full blur-2xl pointer-events-none opacity-40 ${
            isDep ? 'bg-emerald-500' : 'bg-amber-500'
          }`}
        />

        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 mb-2.5">
          <div className="flex items-center gap-2">
            <div
              className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 shadow-lg animate-pulse ${
                isDep ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40' : 'bg-amber-500/20 text-amber-400 border border-amber-500/40'
              }`}
            >
              <Bell className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span
                  className={`text-xs font-black uppercase tracking-wider px-2 py-0.5 rounded-full ${
                    isDep
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                      : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                  }`}
                >
                  {isDep ? 'এড মানি রিকোয়েস্ট' : 'ক্যাশআউট রিকোয়েস্ট'}
                </span>
                <span className="text-[10px] text-slate-400 font-mono">এখনই এসেছে</span>
              </div>
              <h4 className="text-sm font-bold text-white mt-0.5">
                {isDep ? '🔔 নতুন ডিপোজিট রিকোয়েস্ট!' : '🔔 নতুন ক্যাশআউট রিকোয়েস্ট!'}
              </h4>
            </div>
          </div>

          <button
            onClick={dismissCurrentAlert}
            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800/80 transition-colors"
            title="ডিসমিস"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Card Body details */}
        <div className="bg-slate-950/70 border border-slate-800/80 rounded-xl p-2.5 text-xs space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Coins className="w-3.5 h-3.5 text-yellow-400" /> পরিমাণ:
            </span>
            <span className="text-base font-black font-mono text-emerald-400">
              ৳ {activeAlert.amount.toLocaleString()}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <Smartphone className="w-3.5 h-3.5 text-sky-400" />
              {isDep ? 'প্রেরক নম্বর:' : 'পার্সোনাল নম্বর:'}
            </span>
            <span className="font-mono font-bold text-slate-200">
              {activeAlert.senderOrPersonalNumber}
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-slate-400 flex items-center gap-1">
              <CreditCard className="w-3.5 h-3.5 text-indigo-400" /> মেথড:
            </span>
            <span className="font-bold text-white uppercase bg-slate-800 px-2 py-0.5 rounded text-[11px]">
              {activeAlert.method}
            </span>
          </div>

          {activeAlert.trxId && (
            <div className="flex items-center justify-between pt-1 border-t border-slate-800/60">
              <span className="text-slate-400">TrxID:</span>
              <span className="font-mono font-bold text-yellow-300 tracking-wider">
                {activeAlert.trxId}
              </span>
            </div>
          )}

          {activeAlert.userCode && (
            <div className="flex items-center justify-between text-[11px] text-slate-400">
              <span>ইউজার আইডি:</span>
              <span className="font-mono text-slate-300 font-semibold">{activeAlert.userCode}</span>
            </div>
          )}
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 mt-3">
          <button
            onClick={() => handleOpenAdmin(isDep ? 'requests' : 'withdrawals')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 px-3 rounded-xl font-bold text-xs shadow-lg transition-all active:scale-[0.98] ${
              isDep
                ? 'bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-slate-950 font-black shadow-emerald-500/25'
                : 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-slate-950 font-black shadow-amber-500/25'
            }`}
          >
            <span>এডমিন প্যানেলে দেখুন</span>
            <ArrowUpRight className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={dismissCurrentAlert}
            className="py-2 px-3 rounded-xl font-medium text-xs text-slate-300 bg-slate-800 hover:bg-slate-700/80 transition-colors"
          >
            পরে দেখব
          </button>
        </div>

        {queue.length > 0 && (
          <div className="text-center mt-2 text-[10px] text-slate-400 font-medium">
            আরও {queue.length}টি পেন্ডিং রিকোয়েস্ট রয়েছে
          </div>
        )}
      </div>
    </div>
  );
};
