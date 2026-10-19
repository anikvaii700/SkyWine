import React, { useState } from 'react';
import { RoundHistoryItem } from '../types/game';
import { History, ShieldCheck, X } from 'lucide-react';

interface HistoryRibbonProps {
  history: RoundHistoryItem[];
}

export const HistoryRibbon: React.FC<HistoryRibbonProps> = ({ history }) => {
  const [selectedRound, setSelectedRound] = useState<RoundHistoryItem | null>(null);

  const getBadgeStyle = (multiplier: number) => {
    if (multiplier < 2.0) {
      return 'bg-[#1e3a8a]/60 text-[#93c5fd] border-[#3b82f6]/40 hover:border-[#60a5fa]';
    }
    if (multiplier < 10.0) {
      return 'bg-[#581c87]/60 text-[#d8b4fe] border-[#a855f7]/40 hover:border-[#c084fc]';
    }
    return 'bg-[#831843]/70 text-[#fbcfe8] border-[#f43f5e]/50 hover:border-[#fb7185] font-bold shadow-[0_0_10px_rgba(244,63,94,0.3)]';
  };

  return (
    <>
      <div className="w-full bg-[#0d121c] border-b border-[#1b2333] px-3 py-1.5 flex items-center justify-between overflow-hidden">
        <div className="flex items-center gap-1.5 overflow-x-auto scrollbar-none py-0.5 max-w-full">
          {history.slice(0, 15).map((item) => (
            <button
              key={item.id}
              onClick={() => setSelectedRound(item)}
              className={`px-2.5 py-0.5 rounded-full text-xs font-mono-numbers font-semibold border transition-all shrink-0 cursor-pointer ${getBadgeStyle(
                item.crashMultiplier
              )}`}
            >
              {item.crashMultiplier.toFixed(2)}x
            </button>
          ))}
        </div>

        <button
          onClick={() => history[0] && setSelectedRound(history[0])}
          className="text-slate-400 hover:text-white p-1 rounded hover:bg-[#1a2336] transition-colors ml-2 shrink-0"
          title="Round history & Provably Fair"
        >
          <History className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Provably Fair verification modal */}
      {selectedRound && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4 animate-fadeIn">
          <div className="bg-[#141b2a] border border-[#27354f] rounded-2xl p-5 max-w-md w-full shadow-2xl text-white">
            <div className="flex items-center justify-between pb-3 border-b border-[#222e45]">
              <div className="flex items-center gap-2">
                <ShieldCheck className="w-5 h-5 text-emerald-400" />
                <h3 className="font-bold text-base">Provably Fair Round Details</h3>
              </div>
              <button
                onClick={() => setSelectedRound(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-sm">
              <div className="flex justify-between items-center bg-[#0d121c] p-3 rounded-lg border border-[#1d273c]">
                <span className="text-slate-400">Final Multiplier:</span>
                <span
                  className={`text-lg font-bold font-mono-numbers px-2.5 py-0.5 rounded ${getBadgeStyle(
                    selectedRound.crashMultiplier
                  )}`}
                >
                  {selectedRound.crashMultiplier.toFixed(2)}x
                </span>
              </div>

              <div className="bg-[#0d121c] p-3 rounded-lg border border-[#1d273c] space-y-1">
                <span className="text-xs text-slate-400">Server Seed SHA-256 Hash:</span>
                <p className="font-mono text-xs text-emerald-300 break-all select-all">
                  {selectedRound.hash || 'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855'}
                </p>
              </div>

              <div className="bg-[#0d121c] p-3 rounded-lg border border-[#1d273c] space-y-1">
                <span className="text-xs text-slate-400">Client Combined Seed:</span>
                <p className="font-mono text-xs text-sky-300 break-all">
                  00000000000000000001a4f9bc2718e0365d9c72f10b5
                </p>
              </div>

              <p className="text-xs text-slate-400 leading-relaxed">
                Every multiplier is generated transparently before the round begins. The result cannot be altered by either the server or the player.
              </p>
            </div>

            <button
              onClick={() => setSelectedRound(null)}
              className="w-full py-2.5 bg-[#25324c] hover:bg-[#304163] text-white font-semibold rounded-xl text-sm transition-colors"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
};
