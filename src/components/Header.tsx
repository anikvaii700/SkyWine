import React, { useState, useRef } from 'react';
import { Menu, Volume2, VolumeX, HelpCircle, Plus, ArrowDownLeft, Globe, Sparkles, Wifi, User as UserIcon, Download } from 'lucide-react';
import { translations, Language } from '../utils/i18n';
import { UserWalletProfile } from '../services/firebase';
import { AppUser } from '../services/phoneAuth';
import { soundManager } from '../services/audio';

interface HeaderProps {
  balance: number;
  currentUser: AppUser | null;
  userProfile?: UserWalletProfile | null;
  onOpenMenu: () => void;
  onOpenAuth: () => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenRules: () => void;
  onOpenAdmin: () => void;
  pendingDepositCount?: number;
  isMuted: boolean;
  onToggleSound: () => void;
  lang: Language;
  onToggleLang: () => void;
  isPredictorOpen: boolean;
  onTogglePredictor: () => void;
  onOpenInstallModal?: () => void;
  isAppInstalled?: boolean;
}

export const Header: React.FC<HeaderProps> = ({
  balance,
  currentUser,
  userProfile,
  onOpenMenu,
  onOpenAuth,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenRules,
  onOpenAdmin,
  pendingDepositCount = 0,
  isMuted,
  onToggleSound,
  lang,
  onToggleLang,
  isPredictorOpen,
  onTogglePredictor,
  onOpenInstallModal,
  isAppInstalled = false,
}) => {
  const t = translations[lang];

  // SECRET METHOD: Tap the "Aviator" brand logo 5 times to open Admin Panel (Completely stealthy, ZERO numbers or indicators shown)
  const logoClicksRef = useRef<number>(0);
  const lastClickTimeRef = useRef<number>(0);

  const handleLogoClick = (e: React.MouseEvent | React.TouchEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const now = Date.now();
    const isFastClick = now - lastClickTimeRef.current < 2500;
    const nextCount = isFastClick ? logoClicksRef.current + 1 : 1;
    logoClicksRef.current = nextCount;
    lastClickTimeRef.current = now;

    if (nextCount >= 5) {
      logoClicksRef.current = 0;
      soundManager.playWin();
      onOpenAdmin();
    } else {
      soundManager.playClick();
    }
  };

  return (
    <header className="w-full bg-[#111622] border-b border-[#1e2638] px-2 sm:px-4 py-2 sm:py-2.5 flex items-center justify-between text-white shadow-md z-30 relative select-none">
      {/* Left: 3-line Menu Button + Brand logo & rules */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Top-Left 3-Line Hamburger Menu Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            onOpenMenu();
          }}
          aria-label="মোবাইল মেনু (Menu)"
          title="মোবাইল মেনু / 3 Lines Menu"
          className="p-1.5 sm:p-2 rounded-xl bg-[#161d2d] hover:bg-[#202b40] active:scale-90 border border-[#232e44] text-slate-200 hover:text-white transition-all cursor-pointer flex items-center justify-center shadow-sm"
        >
          <Menu className="w-5 h-5 text-white stroke-[2.5]" />
        </button>

        <div 
          onClick={handleLogoClick}
          className="flex items-center gap-1.5 sm:gap-2 cursor-pointer select-none active:scale-95 transition-transform relative touch-manipulation"
          style={{ WebkitUserSelect: 'none', userSelect: 'none', WebkitTouchCallout: 'none' }}
          data-no-exit="true"
        >
          <img 
            src="/skywin-logo.svg" 
            alt="SkyWin BD Logo" 
            className="w-7 h-7 sm:w-8 sm:h-8 rounded-xl object-contain drop-shadow-[0_2px_8px_rgba(255,183,3,0.5)] border border-amber-500/40 pointer-events-none shrink-0"
            referrerPolicy="no-referrer"
          />
          <span className="text-xl sm:text-2xl font-black italic tracking-tight text-white drop-shadow-[0_2px_10px_rgba(255,43,54,0.6)] select-none pointer-events-none flex items-center gap-1">
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2B36] via-[#FF5E62] to-[#FF9900]">SkyWin</span>
            <span className="text-[11px] sm:text-xs font-black text-amber-400 bg-amber-500/15 border border-amber-500/30 px-1.5 py-0.5 rounded not-italic tracking-normal">BD</span>
          </span>
          <button
            onClick={(e) => {
              e.stopPropagation();
              onOpenRules();
            }}
            aria-label="Rules"
            className="w-5 h-5 rounded-full bg-[#1f293d] hover:bg-[#2b3954] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* AI Predictor Toggle Button (Visible on desktop/tablet, in Drawer on mobile) */}
        <button
          onClick={() => {
            if (!currentUser) {
              soundManager.playCrash();
              onOpenAuth();
              return;
            }
            onTogglePredictor();
          }}
          className={`hidden md:flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold transition-all shadow-sm cursor-pointer ${
            isPredictorOpen
              ? 'bg-gradient-to-r from-red-600 to-orange-500 text-white shadow-red-500/30'
              : 'bg-[#1a2234] border border-[#2d3950] text-red-400 hover:bg-[#222d42]'
          }`}
          title="AI Signal Predictor"
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          <span>AI Signal</span>
          <span className="text-[10px] bg-red-950/80 px-1.5 py-0.2 rounded text-red-300 border border-red-700/50">PRO</span>
        </button>

        {/* Mobile App Install button (Desktop only, mobile has drawer) */}
        {!isAppInstalled && onOpenInstallModal && (
          <button
            onClick={onOpenInstallModal}
            className="hidden md:flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold transition-all shadow-sm cursor-pointer bg-gradient-to-r from-red-600/30 to-amber-600/30 border border-red-500/50 text-red-300 hover:text-white hover:from-red-600/50 hover:to-amber-600/50 active:scale-95"
            title="মোবাইল অ্যাপ ইনস্টল করুন (Download Mobile App)"
          >
            <Download className="w-3.5 h-3.5 text-amber-400 animate-pulse" />
            <span>অ্যাপ নামান</span>
          </button>
        )}
      </div>

      {/* Right: Balance capsule & Desktop Controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5">
        {/* Balance Capsule - always visible and perfectly sized */}
        <div
          onClick={onOpenDeposit}
          className="flex items-center bg-[#0c0f17] border border-[#232c3f] rounded-full pl-2 pr-1 py-0.5 sm:py-1 shadow-inner cursor-pointer hover:border-[#38bdf8]/40 transition-colors"
          title="Wallet Balance / Click to deposit"
        >
          <div className="w-5 sm:w-6 h-5 sm:h-6 rounded-full bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-[#1a1200] font-black text-xs shadow">
            ৳
          </div>
          <div className="flex items-baseline px-1.5 sm:px-2">
            <span className={`text-xs sm:text-sm font-bold font-mono-numbers tracking-tight ${balance <= 0 ? 'text-rose-400' : 'text-[#38bdf8]'}`}>
              ৳ {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>

          {/* Quick Deposit button */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              soundManager.playClick();
              onOpenDeposit();
            }}
            className="w-5.5 sm:w-6.5 h-5.5 sm:h-6.5 rounded-full bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white flex items-center justify-center shadow-md active:scale-95 transition-all cursor-pointer"
            title="রিচার্জ / Deposit"
          >
            <Plus className="w-3.5 sm:w-4 h-3.5 sm:h-4 font-bold" />
          </button>
        </div>

        {/* Quick Withdraw Button (Desktop only; on mobile it is in Bottom Nav & Drawer) */}
        <button
          onClick={onOpenWithdraw}
          className="hidden md:flex items-center gap-1 px-2.5 py-1.5 rounded-full bg-gradient-to-r from-rose-700/80 to-red-600/80 hover:from-rose-600 hover:to-red-500 text-white font-bold text-xs shadow-md border border-rose-500/40 active:scale-95 transition-all cursor-pointer"
          title="ক্যাশআউট / Withdraw"
        >
          <ArrowDownLeft className="w-3.5 h-3.5 text-rose-200" />
          <span>উইথড্র</span>
        </button>

        {/* User Auth Profile Trigger (Desktop only; on mobile it is MyAcount bottom nav tab) */}
        <button
          onClick={onOpenAuth}
          className="hidden md:flex items-center gap-1.5 px-2.5 py-1.5 rounded-full bg-[#182030] hover:bg-[#202b40] border border-[#2b3850] text-slate-300 font-medium text-xs shadow-sm active:scale-95 transition-all cursor-pointer"
        >
          {currentUser ? (
            <>
              {currentUser.photoURL ? (
                <img
                  src={currentUser.photoURL}
                  alt={currentUser.displayName || 'User'}
                  className="w-4 h-4 rounded-full object-cover"
                />
              ) : (
                <div className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center text-[10px] font-bold">
                  {currentUser.provider === 'phone' ? (
                    <UserIcon className="w-3 h-3" />
                  ) : (
                    (currentUser.displayName?.[0] || 'U').toUpperCase()
                  )}
                </div>
              )}
              <span className="max-w-[90px] truncate text-[11px]">
                {currentUser.displayName?.split(' ')[0] || userProfile?.phoneNumber || 'User'}
              </span>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
            </>
          ) : (
            <>
              <UserIcon className="w-3.5 h-3.5 text-sky-400" />
              <span>লগইন / সাইনআপ</span>
            </>
          )}
        </button>

        {/* Utility controls */}
        <div className="flex items-center gap-1 sm:gap-2 text-slate-400 text-xs">
          {/* Ping indicator */}
          <div className="hidden xl:flex items-center gap-1 text-[11px] text-slate-400 font-mono px-2 py-1 rounded bg-[#161d2d]">
            <Wifi className="w-3 h-3 text-emerald-400" />
            <span>148ms</span>
          </div>

          {/* Sound toggle */}
          <button
            onClick={onToggleSound}
            aria-label="Toggle sound"
            className="p-1.5 rounded-lg bg-[#182030] hover:bg-[#222c42] hover:text-white transition-colors cursor-pointer"
          >
            {isMuted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-slate-300" />}
          </button>

          {/* Language toggle */}
          <button
            onClick={onToggleLang}
            className="flex items-center gap-1 px-2 py-1 rounded-lg bg-[#182030] hover:bg-[#222c42] hover:text-white font-medium text-xs transition-colors cursor-pointer"
            title="Switch Language / ভাষা পরিবর্তন"
          >
            <Globe className="w-3.5 h-3.5" />
            <span>{lang === 'bn' ? 'বাংলা' : 'EN'}</span>
          </button>
        </div>
      </div>
    </header>
  );
};
