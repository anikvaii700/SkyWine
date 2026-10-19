import React, { useState, useEffect, useRef, useCallback } from 'react';
import { soundManager } from '../services/audio';
import { Language, translations } from '../utils/i18n';
import confetti from 'canvas-confetti';
import { Clock, History, HelpCircle, Trophy, AlertTriangle } from 'lucide-react';
import { AppUser } from '../services/phoneAuth';

interface WingoGameProps {
  balance: number;
  onUpdateBalance: (delta: number) => void;
  lang: Language;
  currentUser?: AppUser | null;
  onRequireAuth?: (message: string) => void;
}

interface WingoResult {
  issue: string;
  number: number;
  color: 'green' | 'red' | 'violet';
  size: 'Big' | 'Small';
}

export const WingoGame: React.FC<WingoGameProps> = ({
  balance,
  onUpdateBalance,
  lang,
  currentUser,
  onRequireAuth,
}) => {
  const [countdown, setCountdown] = useState<number>(35);
  const [issueNumber, setIssueNumber] = useState<string>('202610130428');
  const [selectedBetType, setSelectedBetType] = useState<string | null>(null);
  const [stakeAmount, setStakeAmount] = useState<number>(100);
  const [activeBets, setActiveBets] = useState<Array<{ type: string; amount: number }>>([]);
  const [lastWin, setLastWin] = useState<{ amount: number; message: string } | null>(null);

  const [history, setHistory] = useState<WingoResult[]>([
    { issue: '202610130427', number: 7, color: 'green', size: 'Big' },
    { issue: '202610130426', number: 2, color: 'red', size: 'Small' },
    { issue: '202610130425', number: 0, color: 'violet', size: 'Small' },
    { issue: '202610130424', number: 8, color: 'red', size: 'Big' },
    { issue: '202610130423', number: 5, color: 'violet', size: 'Big' },
    { issue: '202610130422', number: 3, color: 'green', size: 'Small' },
  ]);

  const t = translations[lang];

  const activeBetsRef = useRef(activeBets);
  activeBetsRef.current = activeBets;
  const issueNumberRef = useRef(issueNumber);
  issueNumberRef.current = issueNumber;
  const onUpdateBalanceRef = useRef(onUpdateBalance);
  onUpdateBalanceRef.current = onUpdateBalance;

  const resolveRound = useCallback(() => {
    const currentBets = activeBetsRef.current;
    const currentIssue = issueNumberRef.current;

    const winningNum = Math.floor(Math.random() * 10);
    let winningColor: 'green' | 'red' | 'violet' = 'green';
    if (winningNum === 0 || winningNum === 5) {
      winningColor = 'violet';
    } else if (winningNum % 2 === 0) {
      winningColor = 'red';
    } else {
      winningColor = 'green';
    }
    const winningSize: 'Big' | 'Small' = winningNum >= 5 ? 'Big' : 'Small';

    const newResult: WingoResult = {
      issue: currentIssue,
      number: winningNum,
      color: winningColor,
      size: winningSize,
    };

    setHistory((prev) => [newResult, ...prev.slice(0, 9)]);

    // Check winnings for player's active bets
    let totalWin = 0;
    currentBets.forEach((b) => {
      if (b.type === winningColor) {
        totalWin += b.amount * 2;
      } else if (b.type === winningSize) {
        totalWin += b.amount * 2;
      } else if (b.type === String(winningNum)) {
        totalWin += b.amount * 9;
      }
    });

    if (totalWin > 0) {
      soundManager.playWin();
      onUpdateBalanceRef.current(totalWin);
      try {
        confetti({ particleCount: 35, spread: 60, origin: { y: 0.5 } });
      } catch {
        // ignore
      }
      setLastWin({
        amount: totalWin,
        message: `Won ৳${totalWin.toLocaleString()} on #${currentIssue.slice(-4)}! Result: ${winningNum} (${winningColor})`,
      });
      setTimeout(() => setLastWin(null), 5000);
    } else if (currentBets.length > 0) {
      soundManager.playCrash();
    }

    // Reset bets and advance issue number
    setActiveBets([]);
    setIssueNumber((prev) => String(BigInt(prev) + 1n));
  }, []);

  // Pure 60-second countdown game loop (never calls setState of other components inside updater)
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => (prev > 0 ? prev - 1 : 0));
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Separate effect triggers round resolution when countdown hits 0
  useEffect(() => {
    if (countdown === 0) {
      resolveRound();
      setCountdown(60);
    }
  }, [countdown, resolveRound]);

  const handlePlaceBet = (betKey: string) => {
    if (!currentUser) {
      soundManager.playCrash();
      onRequireAuth?.(
        lang === 'bn'
          ? 'উইঙ্গো গেমে বাজি ধরার জন্য প্রথমে একাউন্ট তৈরি বা লগইন করতে হবে!'
          : 'Please create an account or sign in to bet on Wingo!'
      );
      return;
    }
    if (countdown <= 5) return; // খেলা চলাকালীন সময়ে বাজি ধরা যাবে না
    if (balance < stakeAmount) return;

    soundManager.playClick();
    onUpdateBalance(-stakeAmount);
    setActiveBets((prev) => [...prev, { type: betKey, amount: stakeAmount }]);
  };

  const numbers = [0, 1, 2, 3, 4, 5, 6, 7, 8, 9];

  const getColorForNumber = (num: number) => {
    if (num === 0 || num === 5) return 'from-purple-600 to-indigo-600';
    if (num % 2 === 0) return 'from-rose-600 to-red-600';
    return 'from-emerald-600 to-green-600';
  };

  return (
    <div className="w-full max-w-4xl mx-auto space-y-4 animate-fadeIn">
      {/* Wingo Round Header */}
      <div className="bg-[#121824] border border-[#222e44] rounded-2xl p-4 flex flex-wrap items-center justify-between gap-4 shadow-xl">
        <div>
          <div className="flex items-center gap-2">
            <h2 className="text-xl font-black text-amber-400 tracking-tight">WINGO 1Min Lottery</h2>
            <span className="text-xs bg-amber-950/60 text-amber-300 border border-amber-800/40 px-2 py-0.5 rounded-full font-mono">
              Live
            </span>
          </div>
          <p className="text-xs text-slate-400 mt-0.5">
            Issue: <span className="font-mono text-slate-200">#{issueNumber}</span>
          </p>
        </div>

        {/* Countdown Timer */}
        <div className="flex items-center gap-3 bg-[#0a0d14] px-4 py-2 rounded-xl border border-[#1d273a]">
          <Clock className={`w-5 h-5 ${countdown <= 5 ? 'text-red-500 animate-spin' : 'text-emerald-400'}`} />
          <div className="text-right">
            <span className="text-[10px] text-slate-400 block uppercase font-bold">Time Remaining</span>
            <span
              className={`text-2xl font-black font-mono-numbers ${
                countdown <= 5 ? 'text-red-500 animate-pulse' : 'text-white'
              }`}
            >
              00:{countdown < 10 ? `0${countdown}` : countdown}
            </span>
          </div>
        </div>
      </div>

      {/* Win Banner */}
      {lastWin && (
        <div className="bg-gradient-to-r from-emerald-600 to-green-600 text-white p-3 rounded-2xl shadow-xl flex items-center justify-between animate-fadeIn">
          <div className="flex items-center gap-2.5">
            <Trophy className="w-6 h-6 text-yellow-300" />
            <span className="font-bold text-sm">{lastWin.message}</span>
          </div>
        </div>
      )}

      {/* Live Draw In-Progress Alert Banner */}
      {countdown <= 5 && (
        <div className="bg-amber-950/80 border border-amber-600/70 rounded-2xl p-3 flex items-center justify-center gap-2.5 text-amber-300 text-xs sm:text-sm font-black shadow-lg animate-pulse">
          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>{lang === 'bn' ? 'খেলা চলছে (লটারি ড্র হচ্ছে) — এই সময়ে কোন বাজি ধরা যাবে না' : 'Draw in progress — No bets can be placed during this time!'}</span>
        </div>
      )}

      {/* Betting Board */}
      <div className="bg-[#121824] border border-[#222e44] rounded-2xl p-4 sm:p-5 shadow-xl space-y-4">
        {/* Colors Row */}
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Select Color (রং নির্বাচন করুন)
          </span>
          <div className="grid grid-cols-3 gap-2.5">
            <button
              onClick={() => handlePlaceBet('green')}
              disabled={countdown <= 5 || Boolean(currentUser && balance < stakeAmount)}
              className="py-3.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-500 hover:from-emerald-500 hover:to-green-400 text-white font-extrabold shadow-lg shadow-emerald-900/30 transition-all active:scale-95 disabled:opacity-40 cursor-pointer text-sm sm:text-base"
            >
              Green (2x)
            </button>

            <button
              onClick={() => handlePlaceBet('violet')}
              disabled={countdown <= 5 || Boolean(currentUser && balance < stakeAmount)}
              className="py-3.5 rounded-xl bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-extrabold shadow-lg shadow-purple-900/30 transition-all active:scale-95 disabled:opacity-40 cursor-pointer text-sm sm:text-base"
            >
              Violet (4.5x)
            </button>

            <button
              onClick={() => handlePlaceBet('red')}
              disabled={countdown <= 5 || Boolean(currentUser && balance < stakeAmount)}
              className="py-3.5 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white font-extrabold shadow-lg shadow-rose-900/30 transition-all active:scale-95 disabled:opacity-40 cursor-pointer text-sm sm:text-base"
            >
              Red (2x)
            </button>
          </div>
        </div>

        {/* Numbers Row 0-9 */}
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Select Number (গুণক ৯x)
          </span>
          <div className="grid grid-cols-5 sm:grid-cols-10 gap-2">
            {numbers.map((num) => (
              <button
                key={num}
                onClick={() => handlePlaceBet(String(num))}
                disabled={countdown <= 5 || Boolean(currentUser && balance < stakeAmount)}
                className={`aspect-square rounded-xl bg-gradient-to-b ${getColorForNumber(
                  num
                )} text-white font-black text-lg sm:text-xl flex flex-col items-center justify-center shadow hover:opacity-90 active:scale-95 transition-all disabled:opacity-40 cursor-pointer border border-white/20`}
              >
                <span>{num}</span>
                <span className="text-[9px] font-normal opacity-80">9x</span>
              </button>
            ))}
          </div>
        </div>

        {/* Big / Small Row */}
        <div>
          <span className="text-xs font-bold text-slate-400 uppercase tracking-wider block mb-2">
            Big (5-9) or Small (0-4)
          </span>
          <div className="grid grid-cols-2 gap-3">
            <button
              onClick={() => handlePlaceBet('Big')}
              disabled={countdown <= 5 || Boolean(currentUser && balance < stakeAmount)}
              className="py-3 rounded-xl bg-[#f59e0b] hover:bg-[#d97706] text-black font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
            >
              Big (5-9) · 2x
            </button>
            <button
              onClick={() => handlePlaceBet('Small')}
              disabled={countdown <= 5 || Boolean(currentUser && balance < stakeAmount)}
              className="py-3 rounded-xl bg-[#0ea5e9] hover:bg-[#0284c7] text-white font-black text-sm uppercase tracking-wider shadow-lg active:scale-95 transition-all disabled:opacity-40 cursor-pointer"
            >
              Small (0-4) · 2x
            </button>
          </div>
        </div>

        {/* Stake Selector */}
        <div className="pt-2 border-t border-[#1e2a3f] flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-300 font-semibold">Stake:</span>
            {[10, 50, 100, 500, 1000].map((amt) => (
              <button
                key={amt}
                onClick={() => {
                  if (!currentUser) {
                    soundManager.playCrash();
                    onRequireAuth?.(
                      lang === 'bn'
                        ? 'বাজির পরিমাণ নির্ধারণ ও বেট ধরার জন্য প্রথমে একাউন্ট তৈরি বা লগইন করুন!'
                        : 'Please create an account or sign in to set stake and bet!'
                    );
                    return;
                  }
                  setStakeAmount(amt);
                }}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold font-mono-numbers transition-all ${
                  stakeAmount === amt
                    ? 'bg-emerald-600 text-white'
                    : 'bg-[#0a0d14] text-slate-400 hover:text-white border border-[#232d40]'
                }`}
              >
                ৳{amt}
              </button>
            ))}
          </div>

          <div className="text-xs text-slate-400">
            Active Bets this round:{' '}
            <span className="font-bold font-mono text-emerald-400">{activeBets.length}</span>
          </div>
        </div>
      </div>

      {/* History Table */}
      <div className="bg-[#121824] border border-[#222e44] rounded-2xl p-4 shadow-xl">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2a3f] mb-2">
          <div className="flex items-center gap-1.5 text-slate-300 font-bold text-sm">
            <History className="w-4 h-4 text-slate-400" />
            <span>Recent Results History</span>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead>
              <tr className="text-slate-400 border-b border-[#1b2333] pb-1">
                <th className="pb-2">Issue</th>
                <th className="pb-2 text-center">Winning Number</th>
                <th className="pb-2 text-center">Big/Small</th>
                <th className="pb-2 text-right">Color</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#171f2d]">
              {history.map((h, idx) => (
                <tr key={idx} className="hover:bg-[#161e2c]/50">
                  <td className="py-2 font-mono text-slate-400">#{h.issue}</td>
                  <td className="py-2 text-center">
                    <span className="w-6 h-6 rounded-full inline-flex items-center justify-center font-bold text-white text-xs bg-[#1e293b]">
                      {h.number}
                    </span>
                  </td>
                  <td className="py-2 text-center">
                    <span
                      className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        h.size === 'Big' ? 'bg-amber-950 text-amber-300' : 'bg-sky-950 text-sky-300'
                      }`}
                    >
                      {h.size}
                    </span>
                  </td>
                  <td className="py-2 text-right">
                    <span
                      className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold capitalize ${
                        h.color === 'green'
                          ? 'bg-emerald-950 text-emerald-300 border border-emerald-800'
                          : h.color === 'red'
                          ? 'bg-rose-950 text-rose-300 border border-rose-800'
                          : 'bg-purple-950 text-purple-300 border border-purple-800'
                      }`}
                    >
                      {h.color}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
