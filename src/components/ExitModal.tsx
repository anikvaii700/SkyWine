import React from 'react';
import { LogOut, X, AlertTriangle, ArrowRight } from 'lucide-react';
import { soundManager } from '../services/audio';

interface ExitModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirmExit: () => void;
}

export const ExitModal: React.FC<ExitModalProps> = ({
  isOpen,
  onClose,
  onConfirmExit,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
      <div className="bg-[#141a27] border border-red-500/40 rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl shadow-red-950/50 transform animate-scaleUp">
        {/* Header */}
        <div className="bg-gradient-to-r from-red-950/80 to-[#1e2538] p-4 border-b border-[#242f46] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-red-600/20 border border-red-500/50 flex items-center justify-center text-red-400">
              <AlertTriangle className="w-5 h-5 text-red-500" />
            </div>
            <div>
              <h3 className="font-bold text-white text-base leading-tight">
                অ্যাপ এক্সিট করবেন?
              </h3>
              <p className="text-[11px] text-slate-400">Exit Confirmation</p>
            </div>
          </div>
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-[#28354f] transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <div className="p-5 text-center">
          <div className="w-16 h-16 mx-auto mb-3 rounded-full bg-[#1b2234] border border-[#2d3a54] flex items-center justify-center text-red-400 shadow-inner">
            <LogOut className="w-8 h-8 text-red-400" />
          </div>
          <p className="text-base font-bold text-slate-100 mb-1">
            আপনি কি নিশ্চিতভাবে অ্যাপ ক্লোজ করে এক্সিট করতে চান?
          </p>
          <p className="text-xs text-slate-400">
            এক্সিট করলে অ্যাপটি সম্পূর্ণরূপে বন্ধ হয়ে যাবে।
          </p>
        </div>

        {/* Action Buttons */}
        <div className="p-4 bg-[#0e131d] border-t border-[#1e2638] flex items-center gap-2.5">
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
            }}
            className="flex-1 py-2.5 rounded-xl bg-[#1e273a] hover:bg-[#28354c] text-slate-200 font-semibold text-xs transition-colors border border-[#2a3750] active:scale-95 cursor-pointer"
          >
            না, অ্যাপে থাকুন
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              onConfirmExit();
            }}
            className="flex-1 py-2.5 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-red-700/30 flex items-center justify-center gap-1.5 transition-transform active:scale-95 cursor-pointer"
          >
            <span>হ্যাঁ, এক্সিট</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};
