import React from 'react';
import { CheckCircle2, Coins, X } from 'lucide-react';

interface UserBalanceAlertToastProps {
  message: string | null;
  onClose: () => void;
}

export const UserBalanceAlertToast: React.FC<UserBalanceAlertToastProps> = ({
  message,
  onClose,
}) => {
  if (!message) return null;

  return (
    <div className="fixed top-4 left-4 right-4 sm:left-auto sm:right-4 sm:max-w-md z-50 animate-in fade-in slide-in-from-top-3 duration-300">
      <div className="bg-gradient-to-r from-emerald-950/95 to-slate-900/95 border border-emerald-500/60 rounded-2xl p-4 shadow-2xl shadow-emerald-950/60 backdrop-blur-xl flex items-start justify-between gap-3">
        <div className="flex items-start gap-3">
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 flex items-center justify-center shrink-0 shadow-lg mt-0.5">
            <Coins className="w-5 h-5 animate-bounce" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30">
                ব্যালেন্স আপডেট
              </span>
              <span className="text-[10px] text-slate-400">অনলাইন সিঙ্ক</span>
            </div>
            <p className="text-sm font-bold text-white mt-1 leading-snug">
              {message}
            </p>
          </div>
        </div>

        <button
          onClick={onClose}
          className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors shrink-0"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
