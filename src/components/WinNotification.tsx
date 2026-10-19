import React, { useEffect, useRef } from 'react';
import { Star, X } from 'lucide-react';
import confetti from 'canvas-confetti';

interface WinNotificationProps {
  amount: number;
  multiplier: number;
  onClose: () => void;
}

export const WinNotification: React.FC<WinNotificationProps> = ({ amount, multiplier, onClose }) => {
  const hasFiredRef = useRef(false);

  useEffect(() => {
    // Fire celebratory confetti ONCE only
    if (!hasFiredRef.current) {
      hasFiredRef.current = true;
      try {
        confetti({
          particleCount: 28,
          spread: 50,
          origin: { y: 0.25, x: 0.7 },
          colors: ['#22c55e', '#eab308', '#ffffff'],
          ticks: 60, // Short particle lifespan (1 second)
          disableForReducedMotion: true,
        });
      } catch {
        // ignore
      }
    }

    // Auto close after exactly 1 second (1000ms) as requested
    const timer = setTimeout(() => {
      try {
        confetti.reset();
      } catch {
        // ignore
      }
      onClose();
    }, 1000);

    return () => {
      clearTimeout(timer);
    };
  }, [onClose]);

  return (
    <div className="absolute top-3 right-3 sm:right-6 z-40 pointer-events-auto transition-opacity duration-200">
      <div className="relative bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 text-white rounded-2xl px-4 py-2.5 shadow-xl shadow-emerald-900/40 border border-emerald-400/50 flex items-center gap-3">
        {/* Star Icon Badge */}
        <div className="w-8 h-8 rounded-full bg-white/20 flex items-center justify-center shrink-0">
          <Star className="w-5 h-5 fill-yellow-300 text-yellow-300" />
        </div>

        {/* Win details */}
        <div>
          <div className="flex items-center gap-1.5">
            <span className="text-xs font-semibold text-emerald-100 uppercase tracking-wide">
              Win, ৳
            </span>
            <span className="text-lg font-black font-mono-numbers tracking-tight">
              {(typeof amount === 'number' && Number.isFinite(amount) ? amount : 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
          </div>
          <p className="text-[11px] text-emerald-100 font-medium">
            You have cashed out! <span className="font-bold font-mono-numbers">{(typeof multiplier === 'number' && Number.isFinite(multiplier) ? multiplier : 1.0).toFixed(2)}x</span>
          </p>
        </div>

        {/* Close Button */}
        <button
          onClick={() => {
            try {
              confetti.reset();
            } catch {
              // ignore
            }
            onClose();
          }}
          className="w-6 h-6 rounded-full hover:bg-black/20 flex items-center justify-center text-white/80 hover:text-white transition-colors ml-1 cursor-pointer"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
