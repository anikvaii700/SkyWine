import React, { useState } from 'react';
import { Smartphone, Download, Share2, PlusSquare, X, CheckCircle2, Sparkles, ShieldCheck } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';
import { soundManager } from '../services/audio';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
  onOpenAndroidStudio?: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({
  isOpen,
  onClose,
  onOpenAndroidStudio,
}) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [installSuccess, setInstallSuccess] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);

  if (!isOpen) return null;

  const handleInstallClick = async () => {
    soundManager.playClick();
    setIsInstalling(true);
    try {
      const ok = await install();
      if (ok) {
        soundManager.playWin();
        setInstallSuccess(true);
        setTimeout(() => {
          onClose();
        }, 2500);
      }
    } finally {
      setIsInstalling(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 animate-fadeIn select-none">
      <div className="bg-[#101726] border border-[#223048] rounded-3xl max-w-sm w-full p-5 shadow-2xl relative flex flex-col items-center text-center">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 w-8 h-8 rounded-full bg-[#1b2538] hover:bg-[#25344e] text-slate-400 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>

        {/* App Logo */}
        <div className="w-20 h-20 rounded-3xl bg-gradient-to-br from-amber-400 via-red-600 to-amber-600 p-0.5 shadow-xl shadow-amber-500/20 mb-3 relative flex items-center justify-center border-2 border-amber-500/60">
          <img src="/skywin-logo.svg" alt="SkyWin BD App Logo" className="w-full h-full object-cover rounded-[22px]" referrerPolicy="no-referrer" />
          <span className="absolute -bottom-1 -right-1 px-1.5 py-0.5 rounded-full bg-amber-400 text-black font-black text-[9px] shadow">
            APP
          </span>
        </div>

        <h3 className="text-lg font-black text-white">SkyWin BD মোবাইল অ্যাপ</h3>
        <p className="text-xs text-slate-400 mt-1">
          অরিজিনাল মোবাইল অ্যাপ হিসেবে আপনার হোমস্ক্রিনে ডাউনলোড ও ইনস্টল করুন
        </p>

        {/* Feature Badges */}
        <div className="grid grid-cols-2 gap-2 w-full my-4 text-[11px]">
          <div className="bg-[#141d2e] border border-[#22314a] rounded-xl p-2 flex items-center gap-1.5 text-slate-300">
            <Sparkles className="w-3.5 h-3.5 text-amber-400 shrink-0" />
            <span>সুপার ফাস্ট স্পিড</span>
          </div>
          <div className="bg-[#141d2e] border border-[#22314a] rounded-xl p-2 flex items-center gap-1.5 text-slate-300">
            <Smartphone className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span>ফুল স্ক্রিন মোড</span>
          </div>
          <div className="bg-[#141d2e] border border-[#22314a] rounded-xl p-2 flex items-center gap-1.5 text-slate-300">
            <ShieldCheck className="w-3.5 h-3.5 text-cyan-400 shrink-0" />
            <span>১০০% নিরাপদ লেনদেন</span>
          </div>
          <div className="bg-[#141d2e] border border-[#22314a] rounded-xl p-2 flex items-center gap-1.5 text-slate-300">
            <CheckCircle2 className="w-3.5 h-3.5 text-red-400 shrink-0" />
            <span>লাইভ সিগন্যাল</span>
          </div>
        </div>

        {/* Success state */}
        {installSuccess ? (
          <div className="bg-emerald-500/15 border border-emerald-500/40 rounded-2xl p-3 text-emerald-300 text-xs font-bold w-full flex items-center justify-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>অ্যাপ ইনস্টল সফল হয়েছে! হোমস্ক্রিন দেখুন।</span>
          </div>
        ) : isInstalled ? (
          <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-2xl p-3 text-emerald-300 text-xs font-medium w-full">
            ✅ আপনার ডিভাইসে অ্যাপটি ইতিমধ্যে ইনস্টল করা আছে।
          </div>
        ) : isInstallable ? (
          <button
            onClick={handleInstallClick}
            disabled={isInstalling}
            className="w-full py-3.5 bg-gradient-to-r from-red-600 via-rose-600 to-[#E51D24] hover:from-red-500 hover:to-[#ff2830] text-white font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-red-600/30 active:scale-95 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <Download className="w-4 h-4 stroke-[2.5]" />
            <span>{isInstalling ? 'ইনস্টল হচ্ছে...' : 'মোবাইল অ্যাপ ইনস্টল করুন'}</span>
          </button>
        ) : isIOS ? (
          /* iOS Instructions */
          <div className="w-full bg-[#151f33] border border-[#283955] rounded-2xl p-3.5 text-left text-xs space-y-2 text-slate-300">
            <div className="flex items-center gap-2 text-amber-400 font-bold text-xs pb-1 border-b border-[#25354e]">
              <Share2 className="w-4 h-4" />
              <span>iPhone / iPad এ ইনস্টল করার নিয়ম:</span>
            </div>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed">
              <span className="w-4 h-4 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                ১
              </span>
              <span>
                সাফারি (Safari) ব্রাউজারের নিচে থাকা <strong className="text-white">Share</strong> বাটনে চাপ দিন।
              </span>
            </p>
            <p className="flex items-start gap-2 text-[11px] leading-relaxed">
              <span className="w-4 h-4 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">
                ২
              </span>
              <span>
                নিচে স্ক্রোল করে <strong className="text-white flex items-center gap-1 inline-flex"><PlusSquare className="w-3.5 h-3.5 text-amber-400" /> "Add to Home Screen"</strong> অপশনে চাপ দিন।
              </span>
            </p>
          </div>
        ) : null}

        {/* Direct Phone QR Code & Live Link Section */}
        <div className="w-full mt-3 bg-[#0a0f18] border border-[#1e2a3c] rounded-2xl p-3 text-center space-y-2.5">
          <div className="flex items-center justify-center gap-1.5 text-cyan-400 font-bold text-xs">
            <Smartphone className="w-4 h-4" />
            <span>সরাসরি ফোনে নিন (ক্যামেরা দিয়ে স্ক্যান করুন):</span>
          </div>

          <div className="flex justify-center">
            <div className="p-2 bg-white rounded-2xl shadow-lg border-2 border-cyan-500/40 inline-block">
              <img
                src="https://api.qrserver.com/v1/create-qr-code/?size=160x160&data=https://ais-pre-rcq6agpjqpcvfptktadv4m-196713937546.asia-southeast1.run.app"
                alt="Scan to open on phone"
                className="w-32 h-32 rounded-lg"
              />
            </div>
          </div>

          <div className="text-[11px] text-slate-300 leading-relaxed text-left bg-[#131b2a] p-2.5 rounded-xl border border-[#212e43]">
            <p className="font-bold text-amber-300 mb-1">ফোনে যেভাবে আসল অ্যাপ হবে:</p>
            <p>১. ফোনের ক্যামেরা দিয়ে উপরের কিউআর কোড স্ক্যান করুন (অথবা ফোনের Chrome ব্রাউজারে লিংকটি ওপেন করুন)।</p>
            <p>২. ক্রোম ব্রাউজারের উপরে ডানদিকের <strong className="text-white">৩-ডট (⋮)</strong> মেনু চাপুন।</p>
            <p>৩. মেনু থেকে <strong className="text-emerald-400">"Install app"</strong> অথবা <strong className="text-emerald-400">"Add to Home screen"</strong> চাপলেই ফোনের হোমস্ক্রিনে আসল অ্যাপের মতো ইনস্টল হয়ে যাবে!</p>
          </div>

          <button
            onClick={() => {
              soundManager.playClick();
              navigator.clipboard.writeText('https://ais-pre-rcq6agpjqpcvfptktadv4m-196713937546.asia-southeast1.run.app');
              alert('ফোনের লাইভ লিংক কপি করা হয়েছে!');
            }}
            className="w-full py-2 bg-[#1b2538] hover:bg-[#25354f] border border-[#2e3f5c] text-sky-300 font-bold text-xs rounded-xl flex items-center justify-center gap-1.5 transition-all cursor-pointer active:scale-95"
          >
            <Share2 className="w-3.5 h-3.5" />
            <span>ফোনে পাঠানোর লাইভ লিংক কপি করুন</span>
          </button>
        </div>

        {/* Android Studio Native APK Section */}
        {onOpenAndroidStudio && (
          <button
            onClick={() => {
              soundManager.playClick();
              onClose();
              onOpenAndroidStudio();
            }}
            className="w-full mt-2.5 py-2.5 px-3 bg-gradient-to-r from-emerald-600/20 via-teal-600/20 to-emerald-600/10 hover:from-emerald-600/30 hover:to-teal-600/30 border border-emerald-500/40 rounded-2xl flex items-center justify-between text-left transition-all active:scale-[0.98] cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <span className="text-base">🤖</span>
              <div>
                <h5 className="text-xs font-bold text-emerald-300">Android Studio তে আসল APK তৈরি করবেন?</h5>
                <p className="text-[10px] text-slate-400">ফেইল আসার কারণ, রেডি কোড ও ১-ক্লিক জিপ ডাউনলোড</p>
              </div>
            </div>
            <span className="text-[10px] bg-emerald-500 text-black font-extrabold px-2 py-0.5 rounded-full shrink-0">
              গাইড
            </span>
          </button>
        )}

        <button
          onClick={onClose}
          className="mt-3 text-xs text-slate-400 hover:text-white transition-colors cursor-pointer py-1"
        >
          বন্ধ করুন
        </button>
      </div>
    </div>
  );
};
