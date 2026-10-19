import React from 'react';
import { X, Plane, TrendingUp, DollarSign, AlertTriangle } from 'lucide-react';
import { Language, translations } from '../utils/i18n';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
  lang: Language;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose, lang }) => {
  const t = translations[lang];

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-[#121824] border border-[#24334c] rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl text-white relative">
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2a3f]">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-red-600/20 text-[#E51D24] flex items-center justify-center font-bold">
              ?
            </div>
            <h2 className="text-base sm:text-lg font-bold">{t.rulesTitle}</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1b2537] hover:bg-[#253248] text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="mt-4 space-y-3.5 text-xs sm:text-sm">
          <div className="flex items-start gap-3 bg-[#0b0e15] p-3 rounded-2xl border border-[#1b2435]">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0 mt-0.5">
              <DollarSign className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-0.5">১. বাজি নির্বাচন করুন (Place Your Bet)</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                রাউন্ড শুরু হওয়ার আগে বাজি পরিমাণ ঠিক করুন এবং সবুজ "BET" বাটনে চাপুন। আপনি একসাথে দুটি প্যানেলে দুটি বাজি ধরতে পারেন।
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-[#0b0e15] p-3 rounded-2xl border border-[#1b2435]">
            <div className="w-8 h-8 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center shrink-0 mt-0.5">
              <Plane className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-0.5">২. প্লেন উড়তে শুরু করবে (Plane Takes Off)</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                প্লেন যত উপরে উঠবে, আপনার সম্ভাব্য গুণক (Multiplier) ১.০০x থেকে ক্রমান্বয়ে বৃদ্ধি পাবে (যেমন ১.৫০x, ২.০০x, ৫.০০x বা ১০০x পর্যন্ত)।
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-[#0b0e15] p-3 rounded-2xl border border-[#1b2435]">
            <div className="w-8 h-8 rounded-xl bg-amber-500/20 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-0.5">৩. ক্যাশ আউট করুন (Cash Out In Time)</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                প্লেন চলে যাওয়ার (Flew Away) আগেই কমলা রঙের "CASH OUT" বাটনে চাপুন। সময়মতো ক্যাশ আউট করলে সাথে সাথে লাভ পাবেন!
              </p>
            </div>
          </div>

          <div className="flex items-start gap-3 bg-[#0b0e15] p-3 rounded-2xl border border-[#1b2435]">
            <div className="w-8 h-8 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0 mt-0.5">
              <AlertTriangle className="w-4 h-4" />
            </div>
            <div>
              <h4 className="font-bold text-white mb-0.5">৪. চলে যাওয়ার আগেই সতর্ক থাকুন</h4>
              <p className="text-slate-400 text-xs leading-relaxed">
                ক্যাশ আউট করার আগেই যদি প্লেন উড়ে চলে যায়, তবে সেই বাজিটি হেরে যাবেন। অটো ক্যাশ আউট ব্যবহার করে ঝুঁকি কমাতে পারেন।
              </p>
            </div>
          </div>
        </div>

        <button
          onClick={onClose}
          className="mt-5 w-full py-3 bg-[#243147] hover:bg-[#2e3e5a] text-white font-bold rounded-2xl text-xs uppercase tracking-wider transition-colors"
        >
          বুঝেছি, খেলা শুরু করি
        </button>
      </div>
    </div>
  );
};
