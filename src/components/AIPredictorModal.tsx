import React, { useState, useEffect } from 'react';
import { Sparkles, Send, RefreshCw, X, ShieldAlert, CheckCircle2 } from 'lucide-react';
import { soundManager } from '../services/audio';

interface AIPredictorModalProps {
  isOpen: boolean;
  onClose: () => void;
  recentMultipliers: number[];
  roundStatus: string;
}

export const AIPredictorModal: React.FC<AIPredictorModalProps> = ({
  isOpen,
  onClose,
  recentMultipliers,
  roundStatus,
}) => {
  const [predictedMultiplier, setPredictedMultiplier] = useState<number>(1.47);
  const [isCalculating, setIsCalculating] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number>(28);
  const [signalHistory, setSignalHistory] = useState<number[]>([2.14, 3.12, 1.57, 1.96, 8.1, 1.15]);
  const [telegramToast, setTelegramToast] = useState(false);

  // 30s countdown loop for signal freshness
  useEffect(() => {
    const timer = setInterval(() => {
      setCountdown((prev) => {
        if (prev <= 1) {
          // Auto generate next subtle signal
          generateSignal();
          return 30;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const generateSignal = () => {
    soundManager.playClick();
    setIsCalculating(true);
    setTimeout(() => {
      // Heuristic prediction based on Aviator probability patterns
      const rand = Math.random();
      let nextSignal = 1.35;
      if (rand < 0.45) {
        nextSignal = +(1.2 + Math.random() * 0.7).toFixed(2);
      } else if (rand < 0.8) {
        nextSignal = +(1.8 + Math.random() * 1.6).toFixed(2);
      } else {
        nextSignal = +(3.5 + Math.random() * 4.5).toFixed(2);
      }
      setPredictedMultiplier(nextSignal);
      setSignalHistory((prev) => [nextSignal, ...prev.slice(0, 5)]);
      setIsCalculating(false);
      setCountdown(30);
    }, 700);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed sm:absolute top-14 left-3 sm:left-6 z-40 w-[260px] sm:w-[280px] bg-[#0f1422]/95 backdrop-blur-md border border-[#2b3952] rounded-2xl shadow-2xl overflow-hidden text-white transition-all animate-fadeIn">
      {/* Top Banner Header */}
      <div className="bg-gradient-to-r from-red-900/80 to-[#182236] px-3 py-2 flex items-center justify-between border-b border-[#2d3a54]">
        <div className="flex items-center gap-1.5">
          <div className="w-2 h-2 rounded-full bg-red-500 animate-ping" />
          <span className="text-xs font-black tracking-wider uppercase text-red-200">
            SIGNAL AI PRO
          </span>
          <span className="text-[10px] bg-red-950 px-1.5 py-0.5 rounded text-red-400 font-mono border border-red-800">
            {countdown}s
          </span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-white p-0.5 rounded transition-colors"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      <div className="p-3.5 space-y-3">
        {/* Signal Display Box */}
        <div className="bg-[#090c14] border border-red-950 rounded-xl p-3 text-center shadow-inner relative overflow-hidden">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">
            PREDICTED CASH OUT MULTIPLIER
          </div>

          {isCalculating ? (
            <div className="py-2 flex items-center justify-center gap-2 text-amber-400">
              <RefreshCw className="w-5 h-5 animate-spin" />
              <span className="text-xs font-bold font-mono">CALCULATING...</span>
            </div>
          ) : (
            <div className="text-3xl sm:text-4xl font-black font-mono-numbers text-[#E51D24] tracking-tight drop-shadow-[0_0_12px_rgba(229,29,36,0.6)]">
              {predictedMultiplier.toFixed(2)}x
            </div>
          )}

          <div className="text-[10px] text-emerald-400 mt-1 flex items-center justify-center gap-1">
            <CheckCircle2 className="w-3 h-3" />
            <span>Server Confidence 98.4%</span>
          </div>
        </div>

        {/* Get Signal Button */}
        <button
          onClick={generateSignal}
          disabled={isCalculating}
          className="w-full py-2 bg-gradient-to-r from-[#E51D24] to-red-600 hover:from-red-600 hover:to-[#E51D24] text-white text-xs font-black tracking-wider uppercase rounded-xl shadow-lg shadow-red-900/40 active:scale-95 transition-all flex items-center justify-center gap-1.5 border border-red-500/40 cursor-pointer disabled:opacity-50"
        >
          <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
          <span>@ GET SIGNAL</span>
        </button>

        {/* Signal History Pills */}
        <div>
          <div className="text-[10px] text-slate-400 font-semibold uppercase mb-1">
            SIGNAL HISTORY
          </div>
          <div className="flex items-center gap-1 overflow-x-auto py-0.5 scrollbar-none">
            {signalHistory.map((s, idx) => (
              <span
                key={idx}
                className="text-[10px] font-mono-numbers px-1.5 py-0.5 rounded bg-[#182236] border border-[#26354f] text-slate-300 shrink-0"
              >
                {s.toFixed(2)}x
              </span>
            ))}
          </div>
        </div>

        {/* Telegram Channel Button */}
        <button
          onClick={() => {
            soundManager.playClick();
            setTelegramToast(true);
            setTimeout(() => setTelegramToast(false), 2500);
          }}
          className="w-full py-2 bg-[#0284c7] hover:bg-[#0369a1] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow transition-all active:scale-95"
        >
          <Send className="w-3.5 h-3.5" />
          <span>TELEGRAM CHANNEL</span>
        </button>

        {telegramToast && (
          <div className="text-center text-[11px] text-cyan-300 bg-cyan-950/80 border border-cyan-800 rounded-lg p-1.5 animate-fadeIn">
            VIP Signal Community: @AviatorBangladeshSignals
          </div>
        )}

        <div className="flex items-center gap-1 text-[9px] text-slate-400 justify-center">
          <ShieldAlert className="w-3 h-3 text-amber-500" />
          <span>Demo simulation predictor for training only</span>
        </div>
      </div>
    </div>
  );
};
