import React, { useEffect, useState, useRef } from 'react';
import { Plane, Zap, ShieldCheck } from 'lucide-react';

interface SplashScreenProps {
  onFinish: () => void;
}

export const SplashScreen: React.FC<SplashScreenProps> = ({ onFinish }) => {
  const [progress, setProgress] = useState<number>(0);
  const [isFading, setIsFading] = useState<boolean>(false);
  const onFinishRef = useRef(onFinish);

  useEffect(() => {
    onFinishRef.current = onFinish;
  });

  useEffect(() => {
    const startTime = performance.now();
    const duration = 1000; // Exactly 1.0 second (1000ms)

    let animId: number;

    const frame = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, Math.floor((elapsed / duration) * 100));
      setProgress(pct);

      if (elapsed < duration) {
        animId = requestAnimationFrame(frame);
      } else {
        setProgress(100);
        setIsFading(true);
        setTimeout(() => {
          onFinishRef.current();
        }, 120);
      }
    };

    animId = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(animId);
    };
  }, []); // Run strictly ONCE on mount without restarting

  return (
    <div
      className={`fixed inset-0 z-[9999] bg-[#0b0e17] flex flex-col items-center justify-between p-8 select-none transition-opacity duration-300 ${
        isFading ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Top Tag */}
      <div className="w-full flex items-center justify-between text-xs text-slate-400 font-mono tracking-wider pt-2">
        <span className="flex items-center gap-1.5 text-emerald-400">
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping" />
          SYSTEM ONLINE
        </span>
        <span className="bg-[#182030] px-2 py-0.5 rounded border border-[#232f48] text-[11px] text-amber-400">
          v2.5 MOBILE
        </span>
      </div>

      {/* Center Branding & Plane */}
      <div className="flex flex-col items-center text-center my-auto">
        {/* Glowing Logo Icon */}
        <div className="relative mb-6">
          <div className="absolute -inset-4 bg-amber-500/20 rounded-3xl blur-2xl animate-pulse" />
          <div className="relative w-28 h-28 rounded-3xl p-1 bg-gradient-to-br from-amber-400 via-red-600 to-amber-600 shadow-[0_12px_36px_rgba(255,183,3,0.4)] flex items-center justify-center transform animate-pulse">
            <img 
              src="/skywin-logo.svg" 
              alt="SkyWin BD Logo" 
              className="w-full h-full rounded-[22px] object-cover"
              referrerPolicy="no-referrer"
            />
          </div>
        </div>

        {/* Brand Name */}
        <h1 className="text-4xl sm:text-5xl font-black italic tracking-tight text-white drop-shadow-[0_4px_16px_rgba(229,29,36,0.7)] mb-1 flex items-center justify-center gap-2">
          <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#FF2B36] via-[#FF5E62] to-[#FF9900]">SkyWin</span>
          <span className="text-2xl sm:text-3xl text-amber-400 font-extrabold not-italic bg-amber-500/15 border border-amber-500/30 px-2 py-0.5 rounded-xl">BD</span>
        </h1>
        <p className="text-slate-300 text-sm font-semibold tracking-wide mb-1">
          অফিসিয়াল গেমিং প্ল্যাটফর্ম
        </p>
        <p className="text-slate-500 text-xs">
          Fast & Provably Fair Multiplier Engine
        </p>

        {/* Mini 1-second Progress Bar */}
        <div className="w-64 sm:w-72 mt-8">
          <div className="flex items-center justify-between text-[11px] text-slate-400 mb-1.5 font-mono">
            <span className="flex items-center gap-1">
              <Zap className="w-3 h-3 text-amber-400" />
              লোড হচ্ছে...
            </span>
            <span className="text-red-400 font-bold">{Math.min(100, progress)}%</span>
          </div>
          <div className="w-full h-2 bg-[#161d2d] rounded-full overflow-hidden border border-[#222c42] p-0.5">
            <div
              className="h-full bg-gradient-to-r from-red-600 via-amber-500 to-red-500 rounded-full transition-all duration-150 ease-out shadow-[0_0_12px_rgba(239,68,68,0.8)]"
              style={{ width: `${Math.min(100, progress)}%` }}
            />
          </div>
        </div>
      </div>

      {/* Bottom Footer */}
      <div className="flex flex-col items-center gap-1 text-[11px] text-slate-400 pb-2">
        <div className="flex items-center gap-1 text-slate-400">
          <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
          <span>নিরাপদ ও সুরক্ষিত সার্ভার সংযোগ</span>
        </div>
        <span className="text-[10px] text-slate-500">© 2026 SkyWin BD. All Rights Reserved.</span>
      </div>
    </div>
  );
};
