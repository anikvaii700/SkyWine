import React from 'react';
import { Plane, Target, ArrowDownLeft, User as UserIcon } from 'lucide-react';
import { soundManager } from '../services/audio';
import { AppUser } from '../services/phoneAuth';

interface MobileBottomNavProps {
  activeTab: 'AVIATOR' | 'WINGO';
  onSelectTab: (tab: 'AVIATOR' | 'WINGO') => void;
  onOpenDeposit: () => void;
  onOpenWithdraw: () => void;
  onOpenAuth: () => void;
  onTogglePredictor: () => void;
  isPredictorOpen: boolean;
  onOpenInstallModal?: () => void;
  isAppInstalled?: boolean;
  currentUser?: AppUser | null;
}

export const MobileBottomNav: React.FC<MobileBottomNavProps> = ({
  activeTab,
  onSelectTab,
  onOpenDeposit,
  onOpenWithdraw,
  onOpenAuth,
  onTogglePredictor,
  isPredictorOpen,
  onOpenInstallModal,
  isAppInstalled = false,
  currentUser = null,
}) => {
  return (
    <nav className="fixed bottom-0 left-0 right-0 z-40 pointer-events-none pb-[env(safe-area-inset-bottom)] select-none flex justify-center">
      <div className="w-full max-w-md bg-[#0c101a]/95 backdrop-blur-lg border-t sm:border-x border-[#1e2a3f] shadow-2xl pointer-events-auto sm:rounded-t-2xl">
        <div className="grid grid-cols-5 items-center h-15 px-1">
        {/* Tab 1: Aviator */}
        <button
          onClick={() => {
            soundManager.playClick();
            onSelectTab('AVIATOR');
          }}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer relative ${
            activeTab === 'AVIATOR' ? 'text-[#E51D24]' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'AVIATOR' && (
            <span className="absolute top-0 w-8 h-1 bg-[#E51D24] rounded-full shadow-[0_0_8px_rgba(229,29,36,0.8)]" />
          )}
          <Plane className={`w-5 h-5 transition-transform ${activeTab === 'AVIATOR' ? 'scale-110 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] font-black tracking-tight mt-0.5">Aviator</span>
        </button>

        {/* Tab 2: Wingo */}
        <button
          onClick={() => {
            soundManager.playClick();
            onSelectTab('WINGO');
          }}
          className={`flex flex-col items-center justify-center py-1 transition-all cursor-pointer relative ${
            activeTab === 'WINGO' ? 'text-cyan-400' : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          {activeTab === 'WINGO' && (
            <span className="absolute top-0 w-8 h-1 bg-cyan-400 rounded-full shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
          )}
          <Target className={`w-5 h-5 transition-transform ${activeTab === 'WINGO' ? 'scale-110 stroke-[2.5]' : ''}`} />
          <span className="text-[10px] font-black tracking-tight mt-0.5">Wingo</span>
        </button>

        {/* Tab 3: Center Action - টাকা লোড (Only single Taka symbol ৳ across the entire circle) */}
        <button
          onClick={() => {
            soundManager.playClick();
            onOpenDeposit();
          }}
          className="flex flex-col items-center justify-center relative -top-3 cursor-pointer group"
          title="টাকা লোড / ডিপোজিট"
        >
          <div className="w-12 h-12 rounded-full bg-gradient-to-tr from-emerald-600 via-green-500 to-emerald-400 flex items-center justify-center text-white shadow-xl shadow-emerald-500/50 border-2 border-[#101726] group-active:scale-90 transition-transform">
            <span className="text-2xl sm:text-3xl font-black text-white font-mono select-none drop-shadow-md leading-none">
              ৳
            </span>
          </div>
          <span className="text-[10px] font-black text-emerald-400 tracking-tight -mt-1">
            টাকা লোড
          </span>
        </button>

        {/* Tab 4: Withdraw */}
        <button
          onClick={() => {
            soundManager.playClick();
            onOpenWithdraw();
          }}
          className="flex flex-col items-center justify-center py-1 text-slate-400 hover:text-rose-400 transition-all cursor-pointer"
          title="ক্যাশআউট / Withdraw"
        >
          <ArrowDownLeft className="w-5 h-5 text-rose-400" />
          <span className="text-[10px] font-bold tracking-tight mt-0.5 text-slate-300">উইথড্র</span>
        </button>

        {/* Tab 5: Bottom Right Corner - User Account ("MyAcount") */}
        <button
          onClick={() => {
            soundManager.playClick();
            onOpenAuth();
          }}
          className="flex flex-col items-center justify-center py-1 text-slate-300 hover:text-white transition-all cursor-pointer relative group"
          title="MyAccount / আমার একাউন্ট"
        >
          <div className="relative">
            <UserIcon className="w-5 h-5 text-sky-400 group-hover:scale-110 transition-transform stroke-[2.2]" />
            {currentUser && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-[#0c101a]" />
            )}
          </div>
          <span className="text-[10px] font-bold tracking-tight mt-0.5 text-slate-200">
            MyAcount
          </span>
        </button>
      </div>
    </div>
  </nav>
);
};
