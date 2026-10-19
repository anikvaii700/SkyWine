import React from 'react';
import { X, ShieldCheck, Check, MousePointerClick } from 'lucide-react';

interface AdminStealthGuideModalProps {
  isOpen: boolean;
  onClose: () => void;
  adminPhone?: string;
}

export const AdminStealthGuideModal: React.FC<AdminStealthGuideModalProps> = ({
  isOpen,
  onClose,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-3 sm:p-5 z-60 animate-fadeIn select-none">
      <div className="bg-[#101726] border border-amber-500/40 rounded-3xl max-w-lg w-full p-4 sm:p-6 shadow-2xl relative max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#212f47]">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-2xl bg-amber-500/20 text-amber-400 flex items-center justify-center border border-amber-500/40">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-black text-white">
                অনলাইনে পাবলিশ ও গোপন এডমিন গাইড
              </h3>
              <p className="text-xs text-amber-300/80">
                সাধারণ প্লেয়াররা এডমিন সেকশন দেখবে না — শুধুমাত্র আপনি যেভাবে ঢুকবেন
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1b273d] hover:bg-[#253552] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto py-4 space-y-4 text-xs pr-1">
          {/* Status Box */}
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3.5 flex items-start gap-3">
            <Check className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5 stroke-[3]" />
            <div>
              <p className="font-bold text-emerald-300 text-sm">পাবলিক সাইট ১০০% নিরাপদ ও ক্লিন</p>
              <p className="text-slate-300 mt-1 leading-relaxed">
                আপনার সাইটে কোনো "এডমিন" বাটন বা কোনো লিংক দৃশ্যমান থাকবে না। সাধারণ কোনো প্লেয়ার কখনোই বুঝতে পারবে না যে এখানে কোনো এডমিন প্যানেল রয়েছে।
              </p>
            </div>
          </div>

          <h4 className="text-xs font-black text-amber-400 uppercase tracking-wider pt-1">
            এডমিন হিসেবে প্রবেশ করার একমাত্র গোপন পদ্ধতি:
          </h4>

          {/* The Single Secret Method: 5 taps on Aviator Logo */}
          <div className="bg-[#0b101a] border border-amber-500/50 rounded-2xl p-4 space-y-2.5 shadow-lg shadow-amber-500/5">
            <div className="flex items-center gap-2 text-white font-bold text-sm">
              <div className="w-6 h-6 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center text-xs font-black border border-red-500/40">
                ১
              </div>
              <MousePointerClick className="w-5 h-5 text-red-400" />
              <span className="text-amber-300">পদ্ধতি ১: লোগোতে ৫ বার ট্যাপ (সবচেয়ে সহজ)</span>
            </div>
            <p className="text-slate-300 leading-relaxed text-xs pl-8">
              সাইটের উপরে বাম কোণে থাকা <strong className="text-red-400 text-sm font-black italic">"SkyWin BD"</strong> লোগোটিতে দ্রুত পরপর <strong className="text-white bg-white/10 px-1.5 py-0.5 rounded font-mono">৫ বার ট্যাপ / ক্লিক</strong> করলেই সাথে সাথে আপনার এডমিন কন্ট্রোল প্যানেলটি সরাসরি খুলে যাবে!
            </p>
            <div className="ml-8 p-2.5 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-300 text-[11px] leading-relaxed">
              💡 এটি মোবাইল, ট্যাব ও কম্পিউটার সব ডিভাইসেই কাজ করে। সাধারণ কোনো প্লেয়ার এটি কখনো আন্দাজ করতে পারবে না।
            </div>
          </div>

          {/* PIN Protection reminder */}
          <div className="bg-[#0b101a] border border-[#21304a] rounded-2xl p-3 text-slate-300">
            <p className="font-bold text-amber-300 mb-0.5">গোপন এডমিন পিন নিরাপত্তা:</p>
            <p className="text-[11px] leading-relaxed">
              লোগোতে ৫ বার ট্যাপ করে প্যানেল খুললেও আপনার সিক্রেট এডমিন পিন না দেওয়া পর্যন্ত কেউ কোনো লেনদেন বা সেটিংসে প্রবেশ করতে পারবে না।
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-[#212f47] flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-6 py-2.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-black font-black text-xs uppercase tracking-wider rounded-xl shadow-lg shadow-amber-500/20 active:scale-95 transition-all cursor-pointer"
          >
            বুঝেছি, বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
