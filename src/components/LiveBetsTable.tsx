import React, { useState, useEffect } from 'react';
import { LivePlayerBet } from '../types/game';
import { Language, translations } from '../utils/i18n';
import { Trophy, Radio } from 'lucide-react';

interface LiveBetsTableProps {
  livePlayers: LivePlayerBet[];
  myBetHistory: Array<{
    id: string;
    amount: number;
    multiplier: number | null;
    winAmount: number | null;
    timestamp: number;
  }>;
  lang: Language;
}

export const LiveBetsTable: React.FC<LiveBetsTableProps> = ({
  livePlayers,
  myBetHistory,
  lang,
}) => {
  const t = translations[lang];

  // Dynamic Top Win - changes periodically or showcases supreme winner
  const [topWinIndex, setTopWinIndex] = useState<number>(0);
  const topWins = [
    { name: 'Shanto_King', stake: 5000, multiplier: 48.20, win: 241000 },
    { name: 'Rifat_777', stake: 2000, multiplier: 42.10, win: 84200 },
    { name: 'Anik_Boss', stake: 1000, multiplier: 38.65, win: 38650 },
    { name: 'Mehedi_Pro', stake: 3000, multiplier: 21.40, win: 64200 },
    { name: 'Sumon_Dhaka', stake: 1500, multiplier: 18.90, win: 28350 },
  ];

  // Rotate featured top win every 12 seconds so users see real variety of huge wins
  useEffect(() => {
    const timer = setInterval(() => {
      setTopWinIndex((prev) => (prev + 1) % topWins.length);
    }, 12000);
    return () => clearInterval(timer);
  }, [topWins.length]);

  const currentTopWin = topWins[topWinIndex];

  return (
    <div className="bg-[#121824] border border-[#1f2a3e] rounded-2xl p-2.5 sm:p-3.5 shadow-xl select-none">
      {/* Clean Single Header (No tab switchers) */}
      <div className="flex items-center justify-between border-b border-[#1f2a3e] pb-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-black tracking-wide text-white">
            লাইভ প্লেয়ার্স ও বাজি
          </span>
        </div>

        <div className="flex items-center gap-1.5 text-[10px] bg-[#0c1018] px-2 py-0.5 rounded-full border border-[#1e2a3f] text-slate-300 font-mono">
          <Radio className="w-3 h-3 text-emerald-400 animate-pulse" />
          <span className="font-bold text-emerald-300">{livePlayers.length + 1}</span>
          <span>জন সক্রিয়</span>
        </div>
      </div>

      {/* Table Content with no scrollbar lines */}
      <div className="no-scrollbar overflow-x-hidden max-h-[260px] overflow-y-auto relative">
        <table className="w-full text-left text-xs">
          <thead className="sticky top-0 z-20 bg-[#121824] shadow-xs">
            <tr className="text-slate-400 border-b border-[#1b2333] text-[11px]">
              <th className="py-1.5 font-medium pl-1.5">{t.user}</th>
              <th className="py-1.5 font-medium text-right">{t.betAmount}</th>
              <th className="py-1.5 font-medium text-center">{t.multiplier}</th>
              <th className="py-1.5 font-medium text-right pr-1">{t.winTaka}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[#171f2d]">
            {/* 👑 PINNED PERMANENTLY AT THE VERY TOP: সেরা জয় (Top Win) */}
            <tr className="sticky top-[27px] z-10 bg-gradient-to-r from-[#21160a] via-[#1a1309] to-[#121824] border-l-4 border-l-amber-400 shadow-md">
              <td className="py-2.5 pl-1.5 flex items-center gap-1.5">
                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-amber-400 to-yellow-600 flex items-center justify-center text-[#1a1200] shadow-sm shrink-0">
                  <Trophy className="w-3.5 h-3.5 stroke-[2.5]" />
                </div>
                <div className="min-w-0">
                  <span className="bg-amber-400/25 text-amber-300 border border-amber-400/50 text-[11px] px-2 py-0.5 rounded-full font-black tracking-tight shrink-0 shadow-xs">
                    সেরা জয়
                  </span>
                </div>
              </td>
              <td className="py-2.5 text-right font-mono-numbers text-amber-100 font-bold">
                ৳{currentTopWin.stake.toLocaleString()}
              </td>
              <td className="py-2.5 text-center">
                <span className="px-2 py-0.5 rounded-full text-[11px] font-black font-mono-numbers bg-amber-500/25 text-amber-300 border border-amber-400/60 shadow-[0_0_10px_rgba(251,191,36,0.35)]">
                  {currentTopWin.multiplier.toFixed(2)}x
                </span>
              </td>
              <td className="py-2.5 text-right font-mono-numbers pr-1">
                <span className="text-amber-300 font-black text-xs">
                  +৳{currentTopWin.win.toLocaleString()}
                </span>
              </td>
            </tr>

            {/* LIVE RANDOM PLAYERS BELOW */}
            {livePlayers.map((player) => (
              <tr key={player.id} className="hover:bg-[#161e2c]/40 transition-colors">
                <td className="py-2 pl-1.5 flex items-center gap-1.5">
                  <div className="w-5.5 h-5.5 rounded-full bg-[#1b2538] flex items-center justify-center text-[10px] font-bold text-slate-300 shrink-0">
                    {player.playerName.slice(0, 2).toUpperCase()}
                  </div>
                  <span className="text-slate-200 font-medium truncate max-w-[95px] text-[11px]">
                    {player.playerName}
                  </span>
                </td>
                <td className="py-2 text-right font-mono-numbers text-slate-300 text-xs">
                  ৳{player.betAmount.toLocaleString()}
                </td>
                <td className="py-2 text-center">
                  {player.cashedOut ? (
                    <span className="px-1.5 py-0.5 rounded-md text-[10px] font-bold font-mono-numbers bg-purple-900/40 text-purple-300 border border-purple-700/40">
                      {player.cashedOutMultiplier?.toFixed(2)}x
                    </span>
                  ) : (
                    <span className="text-slate-600 font-mono text-xs">-</span>
                  )}
                </td>
                <td className="py-2 text-right font-mono-numbers pr-1 text-xs">
                  {player.cashedOut ? (
                    <span className="text-emerald-400 font-bold">
                      +৳{(player.winAmount || 0).toLocaleString()}
                    </span>
                  ) : (
                    <span className="text-slate-600">-</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};
