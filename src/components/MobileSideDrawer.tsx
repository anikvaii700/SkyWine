import React from 'react';
import {
  X,
  Plane,
  Target,
  Sparkles,
  ArrowDownLeft,
  PlusCircle,
  HelpCircle,
  Download,
  Volume2,
  VolumeX,
  Globe,
  User as UserIcon,
  LogOut,
  ChevronRight,
  ShieldCheck,
  Zap,
  Smartphone,
  RefreshCw,
} from 'lucide-react';
import { AppUser } from '../services/phoneAuth';
import { UserWalletProfile } from '../services/firebase';
import { ActiveGameTab } from '../types/game';
import { Language } from '../utils/i18n';
import { soundManager } from '../services/audio';

interface MobileSideDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  userProfile?: UserWalletProfile | null;
  balance: number;
  activeGameTab: ActiveGameTab;
  onChangeGameTab: (tab: ActiveGameTab) => void;
  onOpenAuth: () => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenRules: () => void;
  onOpenAdmin?: () => void;
  isPredictorOpen: boolean;
  onTogglePredictor: () => void;
  isMuted: boolean;
  onToggleSound: () => void;
  lang: Language;
  onToggleLang: () => void;
  onOpenInstallModal?: () => void;
  onRequireAuth?: (message: string) => void;
  onExitApp: () => void;
}

export const MobileSideDrawer: React.FC<MobileSideDrawerProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  balance,
  activeGameTab,
  onChangeGameTab,
  onOpenAuth,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenRules,
  onOpenAdmin,
  isPredictorOpen,
  onTogglePredictor,
  isMuted,
  onToggleSound,
  lang,
  onToggleLang,
  onOpenInstallModal,
  onRequireAuth,
  onExitApp,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        onClick={() => {
          soundManager.playClick();
          onClose();
        }}
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity duration-300 animate-fadeIn"
      />

      {/* Drawer Container (Slide from left) */}
      <div className="absolute inset-y-0 left-0 max-w-xs w-[85%] bg-[#0f1420] border-r border-[#1e273a] shadow-2xl flex flex-col justify-between transform transition-transform duration-300 ease-out z-10 animate-slideRight">
        {/* Top Header */}
        <div className="p-4 bg-gradient-to-b from-[#161d2d] to-[#0f1420] border-b border-[#1f2a3e]">
          <div className="flex items-center justify-between mb-4">
            <div className="flex items-center gap-2">
              <img 
                src="/skywin-logo.svg" 
                alt="SkyWin BD" 
                className="w-9 h-9 rounded-xl object-contain drop-shadow-[0_2px_8px_rgba(255,183,3,0.5)] border border-amber-500/40 shrink-0"
                referrerPolicy="no-referrer"
              />
              <div className="flex items-center gap-1.5">
                <span className="text-xl font-black italic tracking-tight text-white drop-shadow-[0_2px_8px_rgba(255,43,54,0.6)] flex items-center gap-1">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2B36] via-[#FF5E62] to-[#FF9900]">SkyWin</span>
                  <span className="text-xs font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1 py-0.5 rounded not-italic tracking-normal">BD</span>
                </span>
                <span className="text-[9px] bg-red-950/90 text-red-300 px-1.5 py-0.5 rounded border border-red-700/50 font-bold uppercase tracking-wider">
                  Official
                </span>
              </div>
            </div>
            <button
              onClick={() => {
                soundManager.playClick();
                onClose();
              }}
              className="p-1.5 rounded-lg bg-[#182133] text-slate-300 hover:text-white hover:bg-[#222e47] active:scale-95 transition-all"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* User Profile Card */}
          <div
            onClick={() => {
              soundManager.playClick();
              onClose();
              onOpenAuth();
            }}
            className="bg-[#141b29] hover:bg-[#1a2335] border border-[#243047] rounded-xl p-3 cursor-pointer transition-all active:scale-[0.98] shadow-inner"
          >
            {currentUser ? (
              <div className="flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt="User"
                    className="w-10 h-10 rounded-full object-cover border border-emerald-500/50"
                  />
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gradient-to-tr from-emerald-600 to-teal-400 text-white flex items-center justify-center font-bold text-sm shadow">
                    {currentUser.provider === 'phone' ? (
                      <UserIcon className="w-5 h-5" />
                    ) : (
                      (currentUser.displayName?.[0] || 'U').toUpperCase()
                    )}
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-white font-bold text-sm truncate">
                      {currentUser.displayName || 'খেলোয়াড়'}
                    </span>
                    <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  </div>
                  <p className="text-[11px] text-slate-400 truncate">
                    {userProfile?.phoneNumber || currentUser.email || 'আইডি: ' + currentUser.uid.slice(0, 8)}
                  </p>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-400" />
              </div>
            ) : (
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2.5">
                  <div className="w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/30 flex items-center justify-center text-sky-400">
                    <UserIcon className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white">লগইন / রেজিস্টার</h4>
                    <p className="text-[10px] text-slate-400">একাউন্ট তৈরি করে খেলুন</p>
                  </div>
                </div>
                <span className="px-2.5 py-1 rounded-lg bg-sky-600 hover:bg-sky-500 text-white text-[11px] font-bold shadow-sm">
                  লগইন
                </span>
              </div>
            )}

            {/* Quick Balance display inside Drawer */}
            <div className="mt-3 pt-2.5 border-t border-[#1e273a] flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase tracking-wider block">
                  মোট ব্যালেন্স
                </span>
                <span className="text-sm font-black font-mono text-[#38bdf8]">
                  ৳ {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundManager.playClick();
                    onClose();
                    onOpenDeposit();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 text-white text-[11px] font-bold shadow-sm active:scale-95"
                >
                  জমা
                </button>
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    soundManager.playClick();
                    onClose();
                    onOpenWithdraw();
                  }}
                  className="px-2.5 py-1 rounded-lg bg-[#202a3d] hover:bg-[#2b3952] text-rose-300 border border-rose-500/30 text-[11px] font-bold active:scale-95"
                >
                  উত্তোলন
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Scrollable Navigation Menu List */}
        <div className="flex-1 overflow-y-auto py-3 px-3 space-y-4 text-xs font-medium">
          {/* Section 1: Games */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-1.5 block">
              গেমস নির্বাচন (Games)
            </span>
            <div className="space-y-1">
              <button
                onClick={() => {
                  soundManager.playClick();
                  onChangeGameTab('AVIATOR');
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                  activeGameTab === 'AVIATOR'
                    ? 'bg-red-600/20 text-red-300 border border-red-500/40 font-bold'
                    : 'text-slate-300 hover:bg-[#161f30]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Plane className={`w-4 h-4 ${activeGameTab === 'AVIATOR' ? 'text-red-500' : 'text-slate-400'}`} />
                  <span>অ্যাভিয়েটর ক্র্যাশ গেম</span>
                </div>
                {activeGameTab === 'AVIATOR' && (
                  <span className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
                )}
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onChangeGameTab('WINGO');
                  onClose();
                }}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl transition-all ${
                  activeGameTab === 'WINGO'
                    ? 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/40 font-bold'
                    : 'text-slate-300 hover:bg-[#161f30]'
                }`}
              >
                <div className="flex items-center gap-2.5">
                  <Target className={`w-4 h-4 ${activeGameTab === 'WINGO' ? 'text-emerald-400' : 'text-slate-400'}`} />
                  <span>উইঙ্গো ১-মিনিট লটারি</span>
                </div>
                <span className="text-[9px] bg-emerald-950 text-emerald-400 px-1.5 py-0.2 rounded border border-emerald-700/50 font-bold">
                  HOT
                </span>
              </button>
            </div>
          </div>

          {/* Section 2: Features & Tools */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-1.5 block">
              টুলস ও ফিচার্স (Tools)
            </span>
            <div className="space-y-1">
              <button
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  if (!currentUser) {
                    onRequireAuth?.('AI সিগন্যাল প্রেডিক্টর ব্যবহার করতে প্রথমে আপনার একাউন্ট তৈরি বা লগইন করুন!');
                    return;
                  }
                  onTogglePredictor();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-200 hover:bg-[#161f30] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <Sparkles className="w-4 h-4 text-yellow-400" />
                  <span>AI সিগন্যাল প্রেডিক্টর</span>
                </div>
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${
                  isPredictorOpen ? 'bg-amber-500 text-black' : 'bg-[#1e283d] text-slate-400'
                }`}>
                  {isPredictorOpen ? 'চালু' : 'বন্ধ'}
                </span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  onOpenRules();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-200 hover:bg-[#161f30] transition-colors cursor-pointer"
              >
                <div className="flex items-center gap-2.5">
                  <HelpCircle className="w-4 h-4 text-sky-400" />
                  <span>খেলার নিয়ম ও নির্দেশিকা</span>
                </div>
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              </button>

              {onOpenInstallModal && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onClose();
                    onOpenInstallModal();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-amber-300 hover:bg-[#161f30] transition-colors bg-amber-500/10 border border-amber-500/20 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <Download className="w-4 h-4 text-amber-400" />
                    <span>মোবাইল অ্যাপ নামান</span>
                  </div>
                  <span className="text-[9px] bg-amber-400 text-black px-1.5 py-0.2 rounded font-bold">
                    APK / PWA
                  </span>
                </button>
              )}
            </div>
          </div>

          {/* Section 3: App Controls & Admin */}
          <div>
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 px-2 mb-1.5 block">
              অ্যাপ সেটিংস (Settings)
            </span>
            <div className="space-y-1">
              <button
                onClick={() => {
                  soundManager.playClick();
                  onToggleSound();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-200 hover:bg-[#161f30] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  {isMuted ? <VolumeX className="w-4 h-4 text-slate-400" /> : <Volume2 className="w-4 h-4 text-emerald-400" />}
                  <span>সাউন্ড ও ইফেক্ট</span>
                </div>
                <span className="text-slate-400 text-[11px] font-mono">
                  {isMuted ? 'Muted' : 'Active'}
                </span>
              </button>

              <button
                onClick={() => {
                  soundManager.playClick();
                  onToggleLang();
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-slate-200 hover:bg-[#161f30] transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <Globe className="w-4 h-4 text-cyan-400" />
                  <span>ভাষা (Language)</span>
                </div>
                <span className="text-slate-400 text-[11px] font-bold">
                  {lang === 'bn' ? 'বাংলা' : 'English'}
                </span>
              </button>

              {onOpenAdmin && (
                <button
                  onClick={() => {
                    soundManager.playClick();
                    onClose();
                    onOpenAdmin();
                  }}
                  className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-amber-300 hover:bg-[#1f190e] transition-colors border border-amber-500/30 bg-amber-500/10 cursor-pointer"
                >
                  <div className="flex items-center gap-2.5">
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    <span className="font-bold">এডমিন প্যানেল (Admin Panel)</span>
                  </div>
                  <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded font-mono font-bold border border-amber-500/40">
                    PIN Protected
                  </span>
                </button>
              )}

              <button
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  if ((window as any).__updateApp) {
                    (window as any).__updateApp();
                  } else {
                    window.location.reload();
                  }
                }}
                className="w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-emerald-300 hover:bg-[#12221b] transition-colors border border-emerald-500/25 bg-emerald-500/5 cursor-pointer"
                title="সার্ভার থেকে সরাসরি নতুন কোড ও আপডেট লোড করুন"
              >
                <div className="flex items-center gap-2.5">
                  <RefreshCw className="w-4 h-4 text-emerald-400" />
                  <span className="font-semibold text-xs">অ্যাপের নতুন আপডেট চেক ও রিফ্রেশ</span>
                </div>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-mono font-bold">
                  Update
                </span>
              </button>
            </div>
          </div>
        </div>

        {/* Drawer Bottom Actions: Exit App & Version info */}
        <div className="p-3 bg-[#0c101a] border-t border-[#1e273a] space-y-2">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
              onExitApp();
            }}
            className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl bg-gradient-to-r from-red-950/70 to-rose-900/50 hover:from-red-900 hover:to-rose-800 text-rose-200 font-bold text-xs border border-red-700/40 active:scale-95 transition-all shadow-sm"
          >
            <LogOut className="w-4 h-4 text-rose-400" />
            <span>অ্যাপ থেকে প্রস্থান (Exit App)</span>
          </button>

          <div className="flex items-center justify-between text-[10px] text-slate-500 pt-1">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              সার্ভার স্ট্যাটাস: অনলাইন
            </span>
            <span className="font-mono">v2.5.0 BD</span>
          </div>
        </div>
      </div>
    </div>
  );
};
