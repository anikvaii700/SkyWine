import React, { useState, useEffect } from 'react';
import { Megaphone } from 'lucide-react';
import { subscribeToPaymentSettings } from '../services/manualPayment';

interface MarqueeTickerProps {
  customText?: string;
}

const DEFAULT_MARQUEE_TEXT =
  '🎉 স্বাগতম অ্যাভিয়েটর অফিসিয়াল মোবাইল গেমে! ৳ ৫০০ ডিপোজিট করলেই পাচ্ছেন আকর্ষণীয় বোনাস! বিকাশ, নগদ ও রকেটে ১-৩ মিনিটে দ্রুত পেমেন্ট সম্পন্ন হয়। উপভোগ করুন সেরা ক্র্যাশ গেম ও সেরা জয়! 🚀';

export const MarqueeTicker: React.FC<MarqueeTickerProps> = ({ customText }) => {
  const [marqueeText, setMarqueeText] = useState<string>(() => {
    return localStorage.getItem('aviator_marquee_text') || customText || DEFAULT_MARQUEE_TEXT;
  });

  useEffect(() => {
    if (customText) {
      setMarqueeText(customText);
    }
  }, [customText]);

  // Listen to Admin Panel headline updates & real-time Firestore sync
  useEffect(() => {
    const handleUpdate = () => {
      const saved = localStorage.getItem('aviator_marquee_text');
      if (saved) {
        setMarqueeText(saved);
      }
    };

    window.addEventListener('marquee_text_updated', handleUpdate);
    const unsub = subscribeToPaymentSettings((s) => {
      if (s.marqueeNotice) {
        setMarqueeText(s.marqueeNotice);
      }
    });

    return () => {
      window.removeEventListener('marquee_text_updated', handleUpdate);
      unsub();
    };
  }, []);

  return (
    <div className="w-full bg-gradient-to-r from-[#171208] via-[#1a140b] to-[#171208] border-y border-amber-500/35 px-2 py-1 flex items-center gap-2 overflow-hidden shadow-xs select-none z-20">
      {/* Official Protected Headline Badge (User cannot edit, Admin only from Admin Panel) */}
      <div
        className="flex items-center gap-1.5 bg-gradient-to-r from-red-600 via-rose-600 to-amber-600 text-white text-[10px] sm:text-xs font-black uppercase px-2.5 py-0.5 rounded-full shadow-md shrink-0 border border-amber-300/40"
      >
        <Megaphone className="w-3 h-3 text-yellow-200 animate-bounce" />
        <span>শিরোনাম</span>
      </div>

      {/* Scrolling Text Container (Very slow, 100% continuous non-stop seamless loop) */}
      <div className="flex-1 overflow-hidden relative flex items-center">
        <div className="animate-marquee-slow flex items-center gap-8 whitespace-nowrap text-[11px] sm:text-xs font-semibold text-amber-200 tracking-wide shrink-0">
          <span className="flex items-center gap-6 shrink-0">
            <span>{marqueeText}</span>
            <span className="text-amber-400 font-bold">✦</span>
            <span>{marqueeText}</span>
            <span className="text-amber-400 font-bold">✦</span>
          </span>
          <span className="flex items-center gap-6 shrink-0">
            <span>{marqueeText}</span>
            <span className="text-amber-400 font-bold">✦</span>
            <span>{marqueeText}</span>
            <span className="text-amber-400 font-bold">✦</span>
          </span>
        </div>
      </div>
    </div>
  );
};
