import React, { useState } from 'react';
import { BetState, RoundStatus } from '../types/game';
import { Minus, Plus, UserPlus } from 'lucide-react';
import { Language, translations } from '../utils/i18n';
import { AppUser } from '../services/phoneAuth';
import { soundManager } from '../services/audio';

interface BetPanelProps {
  bet: BetState;
  roundStatus: RoundStatus;
  currentMultiplier: number;
  balance: number;
  onPlaceBet: (amount: number) => void;
  onCancelBet: () => void;
  onCashOut: () => void;
  onUpdateAutoSettings?: (isAutoBet: boolean, isAutoCashOut: boolean, autoMultiplier: number) => void;
  lang: Language;
  panelIndex: number;
  currentUser?: AppUser | null;
  onRequireAuth?: (message: string) => void;
}

export const BetPanel: React.FC<BetPanelProps> = ({
  bet,
  roundStatus,
  currentMultiplier,
  balance,
  onPlaceBet,
  onCancelBet,
  onCashOut,
  lang,
  panelIndex,
  currentUser,
  onRequireAuth,
}) => {
  const [amount, setAmount] = useState<number>(bet.amount || 1000);
  const t = translations[lang];
  const isLoggedIn = Boolean(currentUser && currentUser.uid);

  // Quick preset chips
  const presets = [10, 100, 500, 1000];

  const handleAdjust = (delta: number) => {
    if (!isLoggedIn) {
      soundManager.playCrash();
      onRequireAuth?.(
        lang === 'bn'
          ? 'বাজির পরিমাণ নির্ধারণ ও বেট ধরার জন্য প্রথমে একাউন্ট তৈরি বা লগইন করুন!'
          : 'Please create an account or sign in to set stake and bet!'
      );
      return;
    }
    setAmount((prev) => Math.max(10, Math.min(balance || 100000, Math.round(prev + delta))));
  };

  const handleSelectPreset = (val: number) => {
    if (!isLoggedIn) {
      soundManager.playCrash();
      onRequireAuth?.(
        lang === 'bn'
          ? 'বাজির পরিমাণ নির্ধারণ ও বেট ধরার জন্য প্রথমে একাউন্ট তৈরি বা লগইন করুন!'
          : 'Please create an account or sign in to set stake and bet!'
      );
      return;
    }
    setAmount(val);
  };

  // Calculate current cashout value if round is flying
  const liveWinValue = bet.amount * currentMultiplier;

  return (
    <div className="bg-[#141a27] border border-[#222c3f] rounded-2xl p-2 sm:p-3 shadow-xl flex flex-col justify-between">
      {/* Top Header Row: Panel Name on Left (No Auto Bet Option) */}
      <div className="flex items-center justify-between mb-1.5">
        <div className="flex items-center gap-1.5">
          <span
            className={`w-2 h-2 rounded-full ${
              panelIndex === 1
                ? 'bg-rose-500 shadow-[0_0_8px_rgba(244,63,94,0.9)] animate-pulse'
                : 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.9)] animate-pulse'
            }`}
          />
          <span className="text-xs font-black tracking-wide text-white">
            {panelIndex === 1
              ? (lang === 'bn' ? 'বেট প্যানেল ১' : 'Bet Panel 1')
              : (lang === 'bn' ? 'বেট প্যানেল ২' : 'Bet Panel 2')}
          </span>
        </div>
      </div>

      {/* Main Grid: Controls on left, Big Action button on right */}
      <div className="grid grid-cols-2 gap-2 sm:gap-2.5 items-stretch">
        {/* Left Column: Stake Stepper & Presets tightly grouped (zero empty gap) */}
        <div className="flex flex-col justify-center gap-1.5">
          {/* Stepper Input */}
          <div className="flex items-center justify-between bg-[#0b0e15] border border-[#232d40] rounded-xl px-1.5 sm:px-2 py-1 shadow-inner">
            <button
              onClick={() => handleAdjust(-100)}
              disabled={roundStatus !== 'WAITING'}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#182133] hover:bg-[#25324d] text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Minus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
            <div className="flex items-baseline gap-1">
              <span className="text-xs sm:text-base font-bold font-mono-numbers text-white">
                {amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })}
              </span>
              <span className="text-[10px] sm:text-xs text-slate-400">৳</span>
            </div>
            <button
              onClick={() => handleAdjust(100)}
              disabled={roundStatus !== 'WAITING'}
              className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg bg-[#182133] hover:bg-[#25324d] text-slate-300 hover:text-white flex items-center justify-center transition-colors disabled:opacity-40 cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5 sm:w-4 sm:h-4" />
            </button>
          </div>

          {/* Preset Buttons - tightly placed under stepper with minimal gap */}
          <div className="grid grid-cols-4 gap-1">
            {presets.map((val) => (
              <button
                key={val}
                onClick={() => handleSelectPreset(val)}
                disabled={roundStatus !== 'WAITING'}
                className={`py-1 rounded-lg text-[10px] sm:text-xs font-bold font-mono-numbers transition-all cursor-pointer ${
                  amount === val
                    ? 'bg-[#2b374e] text-white border border-[#405377]'
                    : 'bg-[#0f1420] text-slate-400 hover:text-slate-200 hover:bg-[#1a2336] border border-[#1a2334]'
                } disabled:opacity-40`}
              >
                {val >= 1000 ? `${val / 1000}k` : val}
              </button>
            ))}
          </div>
        </div>

        {/* Right Column: Giant Green BET / Orange CASH OUT Button */}
        <div className="flex flex-col justify-center min-h-[74px] sm:min-h-[82px]">
          {/* Case 1: Bet is placed and round is FLYING -> show big Orange CASH OUT button */}
          {bet.isPlaced && roundStatus === 'FLYING' && !bet.cashedOut ? (
            <button
              onClick={() => onCashOut()}
              className="w-full h-full py-2 sm:py-3 px-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-500 via-orange-500 to-amber-600 hover:from-amber-400 hover:to-orange-500 text-white font-extrabold flex flex-col items-center justify-center shadow-lg shadow-amber-500/30 active:scale-[0.98] transition-all cursor-pointer border border-amber-400/40 animate-pulse"
            >
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-amber-100 font-bold mb-0.5">
                {t.cashOut}
              </span>
              <span className="text-base sm:text-xl font-black font-mono-numbers tracking-tight">
                {liveWinValue.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ৳
              </span>
            </button>
          ) : bet.isPlaced && bet.cashedOut ? (
            /* Case 2: Already cashed out this round */
            <div className="w-full h-full py-2 sm:py-3 px-2 rounded-xl sm:rounded-2xl bg-[#0f2e1e] border border-emerald-500/40 text-emerald-400 font-bold flex flex-col items-center justify-center text-center">
              <span className="text-[10px] sm:text-xs uppercase text-emerald-300 font-medium">
                {t.cashedOutAt}
              </span>
              <span className="text-sm sm:text-lg font-extrabold font-mono-numbers">
                +{(bet.winAmount || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ৳
              </span>
              <span className="text-[10px] font-mono text-emerald-300">
                @{bet.cashedOutMultiplier?.toFixed(2)}x
              </span>
            </div>
          ) : bet.isPlaced && roundStatus === 'WAITING' ? (
            /* Case 3: Bet placed, waiting for round to start -> CANCEL button */
            <button
              onClick={onCancelBet}
              className="w-full h-full py-2 sm:py-3 px-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-rose-700 to-red-600 hover:from-rose-600 hover:to-red-500 text-white font-bold flex flex-col items-center justify-center shadow-lg shadow-red-700/20 active:scale-[0.98] transition-all border border-rose-500/40 cursor-pointer"
            >
              <span className="text-[10px] sm:text-xs uppercase tracking-wider text-rose-200 mb-0.5">
                {t.cancel}
              </span>
              <span className="text-sm sm:text-lg font-black font-mono-numbers">
                {bet.amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ৳
              </span>
              <span className="text-[10px] text-rose-300">{t.waitingForNextRound}</span>
            </button>
          ) : !bet.isPlaced && roundStatus === 'FLYING' ? (
            /* Case 4: Flight in progress - NO bets allowed during game! */
            <button
              disabled
              className="w-full h-full py-2 sm:py-3 px-2 rounded-xl sm:rounded-2xl bg-[#131b28] border border-[#23314d] text-slate-400 font-extrabold flex flex-col items-center justify-center cursor-not-allowed opacity-90 shadow-inner select-none"
            >
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-amber-400 font-bold mb-0.5 flex items-center gap-1">
                <span className="w-1.5 h-1.5 rounded-full bg-amber-400 animate-ping inline-block" />
                {lang === 'bn' ? 'খেলা চলছে (বাজি বন্ধ)' : 'ROUND IN PROGRESS'}
              </span>
              <span className="text-[11px] sm:text-xs font-bold text-slate-200">
                {lang === 'bn' ? 'পরবর্তী রাউন্ড অপেক্ষা' : 'WAIT FOR NEXT ROUND'}
              </span>
              <span className="text-[10px] text-slate-400 font-mono-numbers mt-0.5">
                {amount.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ৳
              </span>
            </button>
          ) : !bet.isPlaced && roundStatus === 'CRASHED' ? (
            /* Case 5: Plane just crashed, preparing next round */
            <button
              disabled
              className="w-full h-full py-2 sm:py-3 px-2 rounded-xl sm:rounded-2xl bg-[#1b1419] border border-rose-900/40 text-slate-400 font-extrabold flex flex-col items-center justify-center cursor-not-allowed opacity-80 select-none"
            >
              <span className="text-[10px] sm:text-[11px] uppercase tracking-wider text-rose-400 font-bold mb-0.5">
                {lang === 'bn' ? 'রাউন্ড সমাপ্ত' : 'ROUND ENDED'}
              </span>
              <span className="text-xs font-semibold text-slate-300">
                {lang === 'bn' ? 'অপেক্ষা করুন...' : 'PREPARING NEXT ROUND...'}
              </span>
            </button>
          ) : !isLoggedIn ? (
            /* Case 6A: User is NOT logged in / has no account -> Cannot place bet! Prompts to Sign Up */
            <button
              onClick={() => {
                soundManager.playCrash();
                onRequireAuth?.(
                  lang === 'bn'
                    ? 'বেট ধরার জন্য আপনাকে অবশ্যই একাউন্ট তৈরি বা লগইন করতে হবে!'
                    : 'Please create an account or sign in to place bets!'
                );
              }}
              className="w-full h-full py-2 sm:py-3 px-2 rounded-xl sm:rounded-2xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-extrabold flex flex-col items-center justify-center shadow-lg shadow-amber-600/30 active:scale-[0.98] transition-all cursor-pointer border border-amber-400/50"
              title="বেট ধরতে একাউন্ট তৈরি করুন"
            >
              <span className="text-[10px] sm:text-xs font-black tracking-wider uppercase mb-0.5 text-amber-200 flex items-center gap-1">
                <UserPlus className="w-3.5 h-3.5" />
                {lang === 'bn' ? 'একাউন্ট নেই' : 'NO ACCOUNT'}
              </span>
              <span className="text-xs sm:text-sm font-extrabold text-white text-center leading-tight">
                {lang === 'bn' ? 'বেট ধরতে একাউন্ট খুলুন' : 'Sign Up to Bet'}
              </span>
            </button>
          ) : (
            /* Case 6B: Authenticated player -> WAITING state -> Only NOW can bet be placed! Giant Neon Green Button */
            <button
              onClick={() => onPlaceBet(amount)}
              disabled={balance < amount || roundStatus !== 'WAITING'}
              className={`w-full h-full py-2 sm:py-3 px-2 rounded-xl sm:rounded-2xl ${
                balance < amount
                  ? 'bg-[#1b2333] border border-[#2b374e] text-slate-400 opacity-60 cursor-not-allowed'
                  : 'bg-gradient-to-r from-emerald-500 via-green-600 to-emerald-600 hover:from-emerald-400 hover:to-green-500 text-white shadow-lg shadow-emerald-600/30 active:scale-[0.98] cursor-pointer border border-emerald-400/30'
              } font-extrabold flex flex-col items-center justify-center transition-all`}
            >
              <span className="text-xs sm:text-base font-black tracking-wider uppercase mb-0.5">
                {balance <= 0 ? (lang === 'bn' ? 'ব্যালেন্স নেই (০ ৳)' : 'NO BALANCE (৳ 0)') : t.bet}
              </span>
              <span className="text-sm sm:text-xl font-black font-mono-numbers tracking-tight">
                {amount.toLocaleString('en-US', { minimumFractionDigits: 0, maximumFractionDigits: 2 })} ৳
              </span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
