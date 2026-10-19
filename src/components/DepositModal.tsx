import React, { useState, useEffect } from 'react';
import {
  X,
  Check,
  Wallet,
  ArrowUpRight,
  ArrowDownLeft,
  RotateCcw,
  AlertCircle,
  Copy,
  Clock,
  ShieldCheck,
  Send,
  History,
  CheckCircle2,
  XCircle,
  Info,
} from 'lucide-react';
import { soundManager } from '../services/audio';
import { Language, translations } from '../utils/i18n';
import { AppUser, getActivePhoneSession, getStoredPhoneAccounts } from '../services/phoneAuth';
import { UserWalletProfile } from '../services/firebase';
import { calculateWithdrawableBalance } from '../services/userManagement';
import {
  SystemPaymentSettings,
  ManualDepositRequest,
  ManualWithdrawalRequest,
  getStoredPaymentSettings,
  getStoredDepositRequests,
  submitManualDepositRequest,
  getStoredWithdrawalRequests,
  submitManualWithdrawalRequest,
} from '../services/manualPayment';

interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentBalance: number;
  onAddFunds: (amount: number) => void;
  onWithdrawFunds: (amount: number) => void;
  onResetBalance: () => void;
  initialTab?: 'deposit' | 'withdraw';
  lang: Language;
  userPhone?: string;
  currentUser?: AppUser | null;
  userProfile?: UserWalletProfile | null;
  onOpenAdminPanel?: () => void;
  onOpenAuth?: (notice?: string) => void;
}

export const DepositModal: React.FC<DepositModalProps> = ({
  isOpen,
  onClose,
  currentBalance,
  onAddFunds,
  onWithdrawFunds,
  onResetBalance,
  initialTab = 'deposit',
  lang,
  userPhone,
  currentUser,
  userProfile,
  onOpenAdminPanel,
  onOpenAuth,
}) => {
  const [activeTab, setActiveTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [selectedMethod, setSelectedMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [selectedWithdrawMethod, setSelectedWithdrawMethod] = useState<'bkash' | 'nagad' | 'rocket'>('bkash');
  const [depositAmount, setDepositAmount] = useState<number>(1000);
  const [withdrawAmount, setWithdrawAmount] = useState<number>(Math.min(Math.max(currentBalance, 0), 500));
  const [senderPhone, setSenderPhone] = useState<string>(userPhone || '');
  const [trxId, setTrxId] = useState<string>('');
  const [withdrawPhone, setWithdrawPhone] = useState<string>(userPhone || '');

  // Sub-views
  const [depositView, setDepositView] = useState<'form' | 'history'>('form');
  const [withdrawView, setWithdrawView] = useState<'form' | 'history'>('form');

  // Payment settings (Admin numbers) & Requests
  const [paymentSettings, setPaymentSettings] = useState<SystemPaymentSettings>(getStoredPaymentSettings);
  const [userRequests, setUserRequests] = useState<ManualDepositRequest[]>([]);
  const [userWithdrawals, setUserWithdrawals] = useState<ManualWithdrawalRequest[]>([]);

  // UI status
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [submissionError, setSubmissionError] = useState<string>('');
  const [submissionSuccess, setSubmissionSuccess] = useState<ManualDepositRequest | null>(null);

  // Withdraw status
  const [isWithdrawSubmitting, setIsWithdrawSubmitting] = useState<boolean>(false);
  const [withdrawError, setWithdrawError] = useState<string>('');
  const [withdrawSuccess, setWithdrawSuccess] = useState<ManualWithdrawalRequest | null>(null);

  const [copiedNumber, setCopiedNumber] = useState<boolean>(false);
  const [showSuccessToast, setShowSuccessToast] = useState<{ type: 'deposit' | 'withdraw'; amount: number } | null>(null);

  const t = translations[lang];

  // Refresh settings & user requests (both deposits and withdrawals)
  const loadData = () => {
    setPaymentSettings(getStoredPaymentSettings());
    const allDeposits = getStoredDepositRequests();
    const allWithdrawals = getStoredWithdrawalRequests();
    const uid = currentUser?.uid;
    const phone = currentUser?.phoneNumber || userPhone;

    const myDeposits = allDeposits.filter((r) => {
      if (uid && r.userId === uid) return true;
      if (phone && (r.senderNumber === phone || r.userIdentifier.includes(phone))) return true;
      return false;
    });
    setUserRequests(myDeposits);

    const myWithdrawals = allWithdrawals.filter((r) => {
      if (uid && r.userId === uid) return true;
      if (phone && (r.personalNumber === phone || r.userIdentifier.includes(phone))) return true;
      return false;
    });
    setUserWithdrawals(myWithdrawals);
  };

  useEffect(() => {
    setActiveTab(initialTab);
    setDepositView('form');
    setWithdrawView('form');
    setSubmissionError('');
    setSubmissionSuccess(null);
    setWithdrawError('');
    setWithdrawSuccess(null);
  }, [initialTab, isOpen]);

  useEffect(() => {
    if (userPhone) {
      if (!senderPhone) setSenderPhone(userPhone);
      if (!withdrawPhone) setWithdrawPhone(userPhone);
    }
  }, [userPhone]);

  useEffect(() => {
    if (isOpen) {
      loadData();
    }
  }, [isOpen, currentUser, userPhone]);

  useEffect(() => {
    const handleSettingsUpdated = () => setPaymentSettings(getStoredPaymentSettings());
    const handleRequestsUpdated = () => loadData();
    const handleWithdrawalsUpdated = () => loadData();

    window.addEventListener('payment_settings_updated', handleSettingsUpdated);
    window.addEventListener('deposit_requests_updated', handleRequestsUpdated);
    window.addEventListener('withdrawal_requests_updated', handleWithdrawalsUpdated);

    return () => {
      window.removeEventListener('payment_settings_updated', handleSettingsUpdated);
      window.removeEventListener('deposit_requests_updated', handleRequestsUpdated);
      window.removeEventListener('withdrawal_requests_updated', handleWithdrawalsUpdated);
    };
  }, [currentUser, userPhone]);

  useEffect(() => {
    if (activeTab === 'withdraw') {
      setWithdrawAmount((prev) => (currentBalance <= 0 ? 0 : Math.min(prev || 500, currentBalance)));
    }
  }, [currentBalance, activeTab]);

  if (!isOpen) return null;

  const depositPresets = [300, 500, 1000, 2000, 5000, 10000];
  const withdrawPresets = [1000, 5000, 20000, 50000];

  // Active method config from admin settings
  const currentGateway = paymentSettings[selectedMethod] || {
    number: '01712-345678',
    accountType: 'Personal',
    instructions: 'Send Money করুন',
    isActive: true,
  };

  // Copy target admin number
  const handleCopyTargetNumber = () => {
    if (currentGateway.number) {
      navigator.clipboard.writeText(currentGateway.number.replace(/[^0-9]/g, ''));
      setCopiedNumber(true);
      soundManager.playClick();
      setTimeout(() => setCopiedNumber(false), 2000);
    }
  };

  // Handle manual deposit request submission
  const handleSubmitDeposit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmissionError('');

    if (!currentUser) {
      setSubmissionError('এড মানি করতে হলে প্রথমে একাউন্ট তৈরি বা লগইন করতে হবে।');
      soundManager.playCrash();
      return;
    }

    if (!depositAmount || depositAmount < 50) {
      setSubmissionError('নূন্যতম ডিপোজিটের পরিমাণ ৫০ ৳');
      soundManager.playCrash();
      return;
    }

    const cleanSender = senderPhone.replace(/[^0-9]/g, '');
    if (cleanSender.length < 11) {
      setSubmissionError('অনুগ্রহ করে সঠিক ১১ ডিজিটের প্রেরক নম্বর দিন (যেমন: 017xxxxxxxx)');
      soundManager.playCrash();
      return;
    }

    const cleanTrx = trxId.trim();
    if (!cleanTrx || cleanTrx.length < 5) {
      setSubmissionError('অনুগ্রহ করে সঠিক ট্রানজেকশন আইডি (TrxID) লিখুন');
      soundManager.playCrash();
      return;
    }

    setIsSubmitting(true);
    soundManager.playClick();

    const userCode = userProfile?.userCode || currentUser?.userCode || '';
    const userId = currentUser?.uid || `guest_${cleanSender}`;
    const userIdentifier = currentUser?.displayName || currentUser?.phoneNumber || cleanSender;

    const res = await submitManualDepositRequest({
      userId,
      userCode,
      userIdentifier,
      method: selectedMethod,
      targetNumber: currentGateway.number,
      senderNumber: cleanSender,
      trxId: cleanTrx,
      amount: depositAmount,
    });

    setIsSubmitting(false);

    if (res.success && res.request) {
      soundManager.playWin();
      setSubmissionSuccess(res.request);
      setTrxId('');
      loadData();
    } else {
      setSubmissionError(res.error || 'ডিপোজিট রিকোয়েস্ট পাঠাতে ব্যর্থ হয়েছে');
      soundManager.playCrash();
    }
  };

  // Handle Withdraw request submission
  // Rules (Updated per user instruction):
  // 1. Min cashout = 500 BDT
  // 2. Cash-in (deposits) CAN be cashed out!
  // 3. ONLY referral commission received (রেফার কমিশন) cannot be directly cashed out
  const handleSubmitWithdrawal = async (e: React.FormEvent) => {
    e.preventDefault();
    setWithdrawError('');
    setWithdrawSuccess(null);

    if (!currentUser) {
      setWithdrawError('উইথড্র করতে হলে প্রথমে একাউন্ট তৈরি বা লগইন করতে হবে।');
      soundManager.playCrash();
      return;
    }

    // Calculate effective locked referral bonus
    let lockedReferralBonus = 0;
    const phoneSession = getActivePhoneSession();
    if (phoneSession?.user.phoneNumber) {
      const accounts = getStoredPhoneAccounts();
      const acc = accounts[phoneSession.user.phoneNumber];
      if (acc) {
        lockedReferralBonus = acc.referralBonusEarned || 0;
      } else {
        lockedReferralBonus = phoneSession.profile.referralBonusEarned || 0;
      }
    } else if (userProfile) {
      lockedReferralBonus = userProfile.referralBonusEarned || 0;
    }

    // নিয়ম: ০ করে উত্তোলন করা যাবে না, একাউন্টে সর্বনিম্ন ১০০ টাকা ব্যালেন্স থাকতে হবে
    const minRetainedBalance = 100;
    const withdrawableAmount = Math.max(0, Math.round((currentBalance - lockedReferralBonus - minRetainedBalance) * 100) / 100);

    if (!withdrawAmount || withdrawAmount < 500) {
      setWithdrawError('ক্যাশআউট মিনিমাম ৫০০ টাকা হতে হবে।');
      soundManager.playCrash();
      return;
    }

    if (withdrawableAmount < 500) {
      setWithdrawError(
        `উত্তোলনের জন্য একাউন্টে সর্বনিম্ন ১০০ টাকা ব্যালেন্স রেখে ন্যূনতম ৫০০ টাকা ক্যাশআউট করতে পারবেন। আপনার বর্তমান উত্তোলনযোগ্য ব্যালেন্স ৳ ${withdrawableAmount.toLocaleString()}।`
      );
      soundManager.playCrash();
      return;
    }

    if (withdrawAmount > withdrawableAmount) {
      setWithdrawError(
        `একাউন্টে সর্বনিম্ন ১০০ টাকা ব্যালেন্স রাখতে হবে। আপনার সর্বোচ্চ উত্তোলনযোগ্য ব্যালেন্স: ৳ ${withdrawableAmount.toLocaleString()}`
      );
      soundManager.playCrash();
      return;
    }

    const cleanPhone = withdrawPhone.replace(/[^0-9]/g, '');
    if (cleanPhone.length < 11) {
      setWithdrawError('অনুগ্রহ করে সঠিক ১১ ডিজিটের পার্সোনাল নম্বর লিখুন (যেমন: 017xxxxxxxx)');
      soundManager.playCrash();
      return;
    }

    setIsWithdrawSubmitting(true);
    soundManager.playClick();

    const userCode = userProfile?.userCode || currentUser?.userCode || '';
    const userId = currentUser?.uid || `guest_${cleanPhone}`;
    const userIdentifier = currentUser?.displayName || currentUser?.phoneNumber || cleanPhone;

    // Deduct balance
    onWithdrawFunds(withdrawAmount);

    const res = await submitManualWithdrawalRequest({
      userId,
      userCode,
      userIdentifier,
      method: selectedWithdrawMethod,
      personalNumber: cleanPhone,
      amount: withdrawAmount,
    });

    setIsWithdrawSubmitting(false);

    if (res.success && res.request) {
      soundManager.playWin();
      setWithdrawSuccess(res.request);
      loadData();
    } else {
      // Refund if error
      onAddFunds(withdrawAmount);
      setWithdrawError(res.error || 'উত্তোলন রিকোয়েস্ট পাঠাতে ব্যর্থ হয়েছে');
      soundManager.playCrash();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
      <div className="bg-[#101724] border border-[#22314a] rounded-3xl p-5 sm:p-6 max-w-lg w-full shadow-2xl text-white relative max-h-[94vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1c273c]">
          <div className="flex items-center gap-2.5">
            <div
              className={`w-9 h-9 rounded-2xl flex items-center justify-center shadow-md ${
                activeTab === 'deposit'
                  ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                  : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
              }`}
            >
              <Wallet className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-black tracking-wide">
                {activeTab === 'deposit' ? 'টাকা ডিপোজিট (Manual Deposit)' : 'টাকা উত্তোলন (Withdrawal)'}
              </h2>
              <p className="text-xs text-slate-400">
                {activeTab === 'deposit'
                  ? 'বিকাশ, নগদ ও রকেট দিয়ে একাউন্টে টাকা যোগ করুন'
                  : 'ব্যালেন্স উত্তোলন করুন'}
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#192437] hover:bg-[#23324c] text-slate-300 hover:text-white flex items-center justify-center transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Switcher: [ রিচার্জ (Deposit) ] | [ উত্তোলন (Withdraw) ] */}
        <div className="mt-3.5 bg-[#0a0e16] p-1 rounded-2xl border border-[#1a2335] flex items-center">
          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('deposit');
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'deposit'
                ? 'bg-gradient-to-r from-emerald-600 to-green-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-4 h-4" />
            <span>ডিপোজিট (DEPOSIT)</span>
          </button>

          <button
            onClick={() => {
              soundManager.playClick();
              setActiveTab('withdraw');
            }}
            className={`flex-1 py-2 text-xs sm:text-sm font-bold rounded-xl transition-all flex items-center justify-center gap-1.5 cursor-pointer ${
              activeTab === 'withdraw'
                ? 'bg-gradient-to-r from-rose-600 to-red-600 text-white shadow-md'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-4 h-4" />
            <span>উত্তোলন (WITHDRAW)</span>
          </button>
        </div>

        {/* Current Balance Card (Sleek Real-Money Design - No Reset Button) */}
        <div className="mt-3.5 bg-gradient-to-r from-[#0d1422] to-[#0a0f1a] border border-[#1e2c44] rounded-2xl p-3.5 flex items-center justify-between shadow-inner">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-yellow-400 to-amber-600 flex items-center justify-center text-[#1a1200] font-black text-base shadow-md">
              ৳
            </div>
            <div>
              <span className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider block">
                বর্তমান ব্যালেন্স (Current Balance)
              </span>
              <div className={`text-xl sm:text-2xl font-black font-mono-numbers tracking-tight ${currentBalance <= 0 ? 'text-amber-400' : 'text-[#38bdf8]'}`}>
                ৳ {currentBalance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </div>
            </div>
          </div>
          <div className="text-right">
            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400 border border-emerald-500/30 flex items-center gap-1 font-mono">
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              সক্রিয় ওয়ালেট
            </span>
          </div>
        </div>

        {/* If user does not have an account, block deposits & withdrawals completely */}
        {!currentUser ? (
          <div className="mt-5 bg-[#0b111c] border border-amber-500/40 rounded-2xl p-6 text-center space-y-4 shadow-xl">
            <div className="w-16 h-16 mx-auto rounded-2xl bg-amber-500/15 border border-amber-500/30 flex items-center justify-center text-amber-400">
              <AlertCircle className="w-8 h-8" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white mb-1.5">
                একাউন্ট তৈরি করা নেই!
              </h3>
              <p className="text-xs text-slate-300 max-w-sm mx-auto leading-relaxed">
                টাকা জমা (Add Money) বা উইথড্র করার পূর্বে আপনাকে অবশ্যই একাউন্ট তৈরি বা লগইন করতে হবে। একাউন্ট তৈরি ছাড়া কোনো রিচার্জ গ্রহণযোগ্য নয়।
              </p>
            </div>
            <div className="pt-2 flex flex-col sm:flex-row gap-2.5 justify-center">
              <button
                type="button"
                onClick={() => {
                  soundManager.playClick();
                  onClose();
                  onOpenAuth?.('এড মানি করতে হলে প্রথমে একাউন্ট তৈরি বা লগইন করুন!');
                }}
                className="px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 via-green-600 to-emerald-500 hover:from-emerald-500 hover:to-green-400 text-white font-bold text-sm shadow-lg shadow-emerald-600/30 active:scale-95 transition-all cursor-pointer"
              >
                এখনই একাউন্ট তৈরি করুন (Sign Up)
              </button>
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2.5 rounded-xl bg-[#1b2333] hover:bg-[#253248] text-slate-300 text-xs font-semibold cursor-pointer"
              >
                বন্ধ করুন
              </button>
            </div>
          </div>
        ) : (
          <>
            {/* ===================== TAB 1: DEPOSIT ===================== */}
            {activeTab === 'deposit' && (
              <div className="mt-4 space-y-4 animate-fadeIn">
            {/* View Selector: [ টাকা পাঠান ও সাবমিট করুন ] | [ আমার রিকোয়েস্ট হিস্ট্রি ] */}
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-2">
              <div className="flex gap-2 w-full">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setDepositView('form');
                  }}
                  className={`flex-1 text-xs font-bold px-3 py-2 rounded-xl transition-all text-center cursor-pointer ${
                    depositView === 'form'
                      ? 'bg-[#1b2538] text-white shadow border border-[#2b3952]'
                      : 'text-slate-400 hover:text-white bg-[#0f1420]'
                  }`}
                >
                  টাকা পাঠান ও সাবমিট করুন
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setDepositView('history');
                  }}
                  className={`flex-1 text-xs font-bold px-3 py-2 rounded-xl transition-all flex items-center justify-center gap-1.5 text-center cursor-pointer ${
                    depositView === 'history'
                      ? 'bg-[#1b2538] text-white shadow border border-[#2b3952]'
                      : 'text-slate-400 hover:text-white bg-[#0f1420]'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>রিকোয়েস্ট হিস্ট্রি</span>
                  {userRequests.length > 0 && (
                    <span className="w-4 h-4 rounded-full bg-emerald-500/20 text-emerald-400 font-mono text-[10px] flex items-center justify-center font-bold">
                      {userRequests.length}
                    </span>
                  )}
                </button>
              </div>
            </div>

            {/* FORM VIEW */}
            {depositView === 'form' && (
              <div className="space-y-4 animate-fadeIn">
                {/* 1. Payment Method Selection (bKash, Nagad, Rocket) */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-2">
                    পেমেন্ট মাধ্যম বেছে নিন:
                  </label>
                  <div className="grid grid-cols-3 gap-2">
                    {/* bKash */}
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedMethod('bkash');
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        selectedMethod === 'bkash'
                          ? 'bg-[#e2136e]/20 border-[#e2136e] text-white shadow-lg shadow-[#e2136e]/20 scale-102'
                          : 'bg-[#0d121c] border-[#1d273c] text-slate-400 hover:border-[#334155]'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#e2136e] text-white font-black text-xs flex items-center justify-center shadow">
                        bK
                      </div>
                      <span className="text-xs font-black">বিকাশ (bKash)</span>
                    </button>

                    {/* Nagad */}
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedMethod('nagad');
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        selectedMethod === 'nagad'
                          ? 'bg-[#f7941d]/20 border-[#f7941d] text-white shadow-lg shadow-[#f7941d]/20 scale-102'
                          : 'bg-[#0d121c] border-[#1d273c] text-slate-400 hover:border-[#334155]'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#f7941d] text-white font-black text-xs flex items-center justify-center shadow">
                        ন
                      </div>
                      <span className="text-xs font-black">নগদ (Nagad)</span>
                    </button>

                    {/* Rocket */}
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedMethod('rocket');
                      }}
                      className={`p-3 rounded-2xl border text-center transition-all flex flex-col items-center justify-center gap-1.5 cursor-pointer ${
                        selectedMethod === 'rocket'
                          ? 'bg-[#8c3494]/20 border-[#8c3494] text-white shadow-lg shadow-[#8c3494]/20 scale-102'
                          : 'bg-[#0d121c] border-[#1d273c] text-slate-400 hover:border-[#334155]'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#8c3494] text-white font-black text-xs flex items-center justify-center shadow">
                        R
                      </div>
                      <span className="text-xs font-black">রকেট (Rocket)</span>
                    </button>
                  </div>
                </div>

                {/* 2. DYNAMIC ADMIN NUMBER BOX (Exact User Requirement) */}
                <div
                  className={`p-4 rounded-2xl border transition-all ${
                    selectedMethod === 'bkash'
                      ? 'bg-gradient-to-br from-[#180f19] to-[#120813] border-[#e2136e]/60 shadow-lg shadow-[#e2136e]/10'
                      : selectedMethod === 'nagad'
                      ? 'bg-gradient-to-br from-[#19130d] to-[#130d07] border-[#f7941d]/60 shadow-lg shadow-[#f7941d]/10'
                      : 'bg-gradient-to-br from-[#180f1a] to-[#120914] border-[#8c3494]/60 shadow-lg shadow-[#8c3494]/10'
                  }`}
                >
                  <div className="flex items-center justify-between text-xs font-bold mb-2">
                    <span className="text-slate-200">
                      এই নম্বরে টাকা পাঠান ({selectedMethod.toUpperCase()} {currentGateway.accountType}):
                    </span>
                    <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono text-emerald-300 border border-white/10">
                      {currentGateway.accountType}
                    </span>
                  </div>

                  {/* Big Single-Line Number Display & Copy Button Below */}
                  <div className="bg-[#090d14]/90 border border-white/15 rounded-xl p-3 sm:p-3.5 flex flex-col items-center justify-center text-center shadow-inner">
                    <span className="text-[10px] text-slate-400 block uppercase font-mono tracking-wider mb-0.5">
                      {selectedMethod} Receiver Number (টাকা পাঠানোর নম্বর)
                    </span>

                    {/* Single-Line Large Number */}
                    <div className="text-2xl sm:text-3xl font-black font-mono tracking-wider text-white select-all py-2 whitespace-nowrap overflow-x-auto max-w-full">
                      {currentGateway.number}
                    </div>

                    {/* Full-Width Copy Button Below */}
                    <button
                      type="button"
                      onClick={handleCopyTargetNumber}
                      className="w-full mt-2 py-2.5 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-1.5 active:scale-98 transition-all cursor-pointer"
                    >
                      {copiedNumber ? (
                        <>
                          <Check className="w-4 h-4 stroke-[3] text-white" />
                          <span>নম্বর কপি হয়েছে!</span>
                        </>
                      ) : (
                        <>
                          <Copy className="w-4 h-4" />
                          <span>নম্বর কপি করুন</span>
                        </>
                      )}
                    </button>
                  </div>

                  <p className="mt-2 text-[11px] text-slate-300 flex items-center gap-1.5">
                    <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                    <span>{currentGateway.instructions || 'টাকা পাঠিয়ে TrxID নিচে সাবমিট করুন।'}</span>
                  </p>
                </div>

                {/* 3. Deposit Submission Form */}
                <form onSubmit={handleSubmitDeposit} className="space-y-3.5">
                  {/* Select or Input Amount */}
                  <div>
                    <div className="flex items-center justify-between mb-1.5">
                      <label className="text-xs font-semibold text-slate-300">
                        টাকার পরিমাণ (Deposit Amount):
                      </label>
                      <span className="text-[11px] text-emerald-400 font-mono font-bold">
                        ৳ {depositAmount.toLocaleString()}
                      </span>
                    </div>

                    <div className="grid grid-cols-3 sm:grid-cols-6 gap-1.5 mb-2">
                      {depositPresets.map((val) => (
                        <button
                          key={val}
                          type="button"
                          onClick={() => {
                            soundManager.playClick();
                            setDepositAmount(val);
                          }}
                          className={`py-1.5 px-1 rounded-xl text-xs font-bold font-mono-numbers transition-all ${
                            depositAmount === val
                              ? 'bg-emerald-600 text-white shadow-md'
                              : 'bg-[#0f1522] border border-[#1f2b3e] text-slate-300 hover:bg-[#1a2336]'
                          }`}
                        >
                          +৳{val >= 1000 ? `${val / 1000}k` : val}
                        </button>
                      ))}
                    </div>

                    <div className="bg-[#090d14] border border-[#1e2a3f] rounded-xl px-3 py-2 flex items-center justify-between">
                      <span className="text-xs text-slate-400">পরিমাণ লিখুন:</span>
                      <div className="flex items-center gap-1">
                        <input
                          type="number"
                          min="50"
                          step="10"
                          value={depositAmount || ''}
                          onChange={(e) => setDepositAmount(Math.max(0, parseFloat(e.target.value) || 0))}
                          className="w-28 bg-transparent text-right font-mono font-black text-base text-emerald-400 focus:outline-hidden"
                        />
                        <span className="text-xs text-slate-400">৳</span>
                      </div>
                    </div>
                  </div>

                  {/* Sender Phone Number */}
                  <div>
                    <label className="text-xs font-semibold text-slate-300 block mb-1">
                      যে নম্বর থেকে টাকা পাঠিয়েছেন (Sender Phone):
                    </label>
                    <input
                      type="text"
                      maxLength={14}
                      value={senderPhone}
                      onChange={(e) => setSenderPhone(e.target.value)}
                      placeholder="017xxxxxxxx"
                      className="w-full bg-[#090d14] border border-[#1e2a3f] rounded-xl px-3.5 py-2.5 text-xs font-mono text-white focus:outline-hidden focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* Transaction ID (TrxID) */}
                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-semibold text-slate-300">
                        ট্রানজেকশন আইডি (TrxID):
                      </label>
                      <span className="text-[10px] text-slate-400">
                        মেসেজ বা অ্যাপ থেকে কপি করুন
                      </span>
                    </div>
                    <input
                      type="text"
                      value={trxId}
                      onChange={(e) => setTrxId(e.target.value.toUpperCase())}
                      placeholder="যেমন: BKI982142 বা 9J8K21"
                      className="w-full bg-[#090d14] border border-[#1e2a3f] rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold uppercase tracking-wider text-amber-300 focus:outline-hidden focus:border-emerald-500"
                      required
                    />
                  </div>

                  {/* Error Message if any */}
                  {submissionError && (
                    <div className="p-2.5 rounded-xl bg-rose-500/15 border border-rose-500/30 text-rose-300 text-xs font-medium flex items-center gap-2 animate-fadeIn">
                      <AlertCircle className="w-4 h-4 shrink-0" />
                      <span>{submissionError}</span>
                    </div>
                  )}

                  {/* Success Message Card if just submitted */}
                  {submissionSuccess && (
                    <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs space-y-1.5 animate-fadeIn">
                      <div className="flex items-center gap-2 font-bold text-sm">
                        <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                        <span>ডিপোজিট রিকোয়েস্ট সফলভাবে জমা হয়েছে!</span>
                      </div>
                      <p className="text-slate-300">
                        পরিমাণ: <strong className="text-white">৳ {submissionSuccess.amount.toLocaleString()}</strong> | TrxID:{' '}
                        <strong className="text-amber-300 font-mono">{submissionSuccess.trxId}</strong>
                      </p>
                      <p className="text-[11px] text-slate-400">
                        এডমিন প্যানেলে রিকোয়েস্টটি পাঠানো হয়েছে। নিশ্চিত করে ১-৩ মিনিটের মধ্যে আপনার ব্যালেন্সে টাকা যোগ করে দেওয়া হবে।
                      </p>
                    </div>
                  )}

                  {/* Submit Action Button */}
                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full py-3 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white rounded-2xl shadow-xl shadow-emerald-700/30 active:scale-98 transition-all flex flex-col items-center justify-center cursor-pointer disabled:opacity-50"
                  >
                    <div className="flex items-center gap-1.5 text-sm font-black tracking-wide">
                      <Send className="w-4 h-4 font-bold" />
                      <span>{isSubmitting ? 'রিকোয়েস্ট পাঠানো হচ্ছে...' : 'ডিপোজিট রিকুয়েস্ট সাবমিট'}</span>
                    </div>
                    {!isSubmitting && (
                      <span className="text-xs font-mono font-bold text-emerald-100 opacity-95 mt-0.5">
                        (৳ {depositAmount.toLocaleString()})
                      </span>
                    )}
                  </button>
                </form>

                {/* Footer Notice */}
                <div className="bg-[#090d14] p-3 rounded-xl border border-[#182132] text-[11px] text-slate-400 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />
                  <span>
                    {paymentSettings.noticeText ||
                      'টাকা পাঠানোর পর সঠিক ট্রানজেকশন আইডি দিন। অ্যাডমিন নিশ্চিত করে ব্যালেন্স যোগ করে দিবে।'}
                  </span>
                </div>
              </div>
            )}

            {/* HISTORY VIEW */}
            {depositView === 'history' && (
              <div className="space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-semibold text-slate-300">
                    আপনার জমা দেওয়া ডিপোজিট রিকোয়েস্টসমূহ:
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    মোট: {userRequests.length} টি
                  </span>
                </div>

                {userRequests.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-[#090d14] rounded-2xl border border-[#1b2538]">
                    <Clock className="w-7 h-7 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs font-medium">এখনও কোনো ডিপোজিট রিকোয়েস্ট জমা দেওয়া হয়নি।</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {userRequests.map((req) => (
                      <div
                        key={req.id}
                        className={`p-3 rounded-xl border transition-all ${
                          req.status === 'pending'
                            ? 'bg-[#121927] border-amber-500/30'
                            : req.status === 'approved'
                            ? 'bg-[#0d1720] border-emerald-500/30'
                            : 'bg-[#150d12] border-rose-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-emerald-400 font-mono-numbers">
                              ৳ {req.amount.toLocaleString()}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300">
                              {req.method}
                            </span>
                          </div>

                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              req.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                : req.status === 'approved'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {req.status === 'pending' && <Clock className="w-3 h-3" />}
                            {req.status === 'approved' && <CheckCircle2 className="w-3 h-3" />}
                            {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                            <span>
                              {req.status === 'pending'
                                ? 'অপেক্ষমান (Pending)'
                                : req.status === 'approved'
                                ? 'অনুমোদিত (যোগ হয়েছে)'
                                : 'বাতিল'}
                            </span>
                          </span>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>TrxID: <strong className="text-amber-300">{req.trxId}</strong></span>
                          <span>{new Date(req.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {req.rejectionReason && (
                          <p className="mt-1.5 text-[10px] text-rose-400 bg-rose-500/10 p-1.5 rounded-md">
                            কারণ: {req.rejectionReason}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* ===================== TAB 2: WITHDRAW ===================== */}
        {activeTab === 'withdraw' && (
          <div className="mt-4 space-y-4 animate-fadeIn">
            {/* View Selector: [ উত্তোলন করুন ] | [ আমার উত্তোলন হিস্ট্রি ] */}
            <div className="flex items-center justify-between border-b border-[#1b263b] pb-2">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setWithdrawView('form');
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer ${
                    withdrawView === 'form'
                      ? 'bg-[#1b2538] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  টাকা উত্তোলন করুন
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setWithdrawView('history');
                  }}
                  className={`text-xs font-bold px-3 py-1.5 rounded-xl transition-all cursor-pointer flex items-center gap-1.5 ${
                    withdrawView === 'history'
                      ? 'bg-[#1b2538] text-white shadow'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <History className="w-3.5 h-3.5" />
                  <span>উত্তোলন হিস্ট্রি</span>
                  {userWithdrawals.length > 0 && (
                    <span className="bg-rose-500/20 text-rose-300 border border-rose-500/40 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
                      {userWithdrawals.length}
                    </span>
                  )}
                </button>
              </div>

              <span className="text-[11px] text-slate-400">
                ব্যালেন্স: <strong className="text-white font-mono">৳{currentBalance.toLocaleString()}</strong>
              </span>
            </div>

            {/* WITHDRAW FORM */}
            {withdrawView === 'form' && (
              <form onSubmit={handleSubmitWithdrawal} className="space-y-4">
                {/* 1. Payment Method Selector: bKash / Nagad / Rocket */}
                <div>
                  <label className="text-xs font-bold text-slate-300 block mb-2">
                    ১. উত্তোলন মাধ্যম সিলেক্ট করুন (Select Method):
                  </label>
                  <div className="grid grid-cols-3 gap-2.5">
                    {/* bKash */}
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedWithdrawMethod('bkash');
                      }}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                        selectedWithdrawMethod === 'bkash'
                          ? 'bg-[#e2136e]/20 border-[#e2136e] shadow-lg shadow-[#e2136e]/20 ring-1 ring-[#e2136e]'
                          : 'bg-[#0a0e16] border-[#1e2a3f] hover:border-slate-500 text-slate-400'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#e2136e] text-white flex items-center justify-center font-black text-sm shadow">
                        ব
                      </div>
                      <span className="text-xs font-black text-white">বিকাশ (bKash)</span>
                      <span className="text-[10px] text-[#e2136e] font-bold">Personal</span>
                      {selectedWithdrawMethod === 'bkash' && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#e2136e] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>

                    {/* Nagad */}
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedWithdrawMethod('nagad');
                      }}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                        selectedWithdrawMethod === 'nagad'
                          ? 'bg-[#f7941d]/20 border-[#f7941d] shadow-lg shadow-[#f7941d]/20 ring-1 ring-[#f7941d]'
                          : 'bg-[#0a0e16] border-[#1e2a3f] hover:border-slate-500 text-slate-400'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#f7941d] text-white flex items-center justify-center font-black text-sm shadow">
                        ন
                      </div>
                      <span className="text-xs font-black text-white">নগদ (Nagad)</span>
                      <span className="text-[10px] text-[#f7941d] font-bold">Personal</span>
                      {selectedWithdrawMethod === 'nagad' && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#f7941d] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>

                    {/* Rocket */}
                    <button
                      type="button"
                      onClick={() => {
                        soundManager.playClick();
                        setSelectedWithdrawMethod('rocket');
                      }}
                      className={`p-2.5 rounded-2xl border flex flex-col items-center justify-center gap-1 transition-all cursor-pointer relative ${
                        selectedWithdrawMethod === 'rocket'
                          ? 'bg-[#8c3494]/20 border-[#8c3494] shadow-lg shadow-[#8c3494]/20 ring-1 ring-[#8c3494]'
                          : 'bg-[#0a0e16] border-[#1e2a3f] hover:border-slate-500 text-slate-400'
                      }`}
                    >
                      <div className="w-8 h-8 rounded-full bg-[#8c3494] text-white flex items-center justify-center font-black text-sm shadow">
                        র
                      </div>
                      <span className="text-xs font-black text-white">রকেট (Rocket)</span>
                      <span className="text-[10px] text-[#a855f7] font-bold">Personal</span>
                      {selectedWithdrawMethod === 'rocket' && (
                        <div className="absolute top-1.5 right-1.5 w-4 h-4 rounded-full bg-[#8c3494] text-white flex items-center justify-center">
                          <Check className="w-2.5 h-2.5 stroke-[3]" />
                        </div>
                      )}
                    </button>
                  </div>
                </div>

                {/* 2. Personal Number Input (strictly personal - no agent!) */}
                <div className="bg-[#090d15] border border-[#1b2538] rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-slate-200 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-rose-400 inline-block"></span>
                      <span>আপনার পার্সোনাল {selectedWithdrawMethod === 'bkash' ? 'বিকাশ' : selectedWithdrawMethod === 'nagad' ? 'নগদ' : 'রকেট'} নম্বর:</span>
                    </label>
                    <span className="text-[10px] uppercase font-extrabold px-2 py-0.5 rounded-md bg-rose-500/20 text-rose-300 border border-rose-500/30">
                      Personal Only
                    </span>
                  </div>

                  <input
                    type="tel"
                    value={withdrawPhone}
                    onChange={(e) => setWithdrawPhone(e.target.value)}
                    placeholder="যেমন: 017xxxxxxxx"
                    maxLength={14}
                    className="w-full bg-[#0d131f] border border-[#233149] focus:border-rose-500 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white placeholder-slate-500 focus:outline-hidden transition-colors"
                  />

                  <p className="text-[11px] text-amber-300/90 flex items-center gap-1.5 font-medium">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0 text-amber-400" />
                    <span>শুধুমাত্র আপনার পার্সোনাল নম্বর দিন। কোনো এজেন্ট নম্বর গ্রহণযোগ্য নয়।</span>
                  </p>
                </div>

                {/* Balance & Rules Breakdown */}
                {(() => {
                  let lockedReferralBonus = 0;
                  const phoneSession = getActivePhoneSession();
                  if (phoneSession?.user.phoneNumber) {
                    const accounts = getStoredPhoneAccounts();
                    const acc = accounts[phoneSession.user.phoneNumber];
                    if (acc) {
                      lockedReferralBonus = acc.referralBonusEarned || 0;
                    } else {
                      lockedReferralBonus = phoneSession.profile.referralBonusEarned || 0;
                    }
                  } else if (userProfile) {
                    lockedReferralBonus = userProfile.referralBonusEarned || 0;
                  }

                  const minRetainedBalance = 100;
                  const withdrawableAmount = Math.max(0, Math.round((currentBalance - lockedReferralBonus - minRetainedBalance) * 100) / 100);

                  return (
                    <div className="bg-[#0b101a] border border-[#1e2a3f] rounded-2xl p-3 space-y-2">
                      <div className="grid grid-cols-2 gap-2 text-xs">
                        <div className="bg-[#080d16] p-2 rounded-xl border border-amber-500/20">
                          <span className="text-[10px] text-slate-400 block">সংরক্ষিত ব্যালেন্স (বোনাস):</span>
                          <span className="font-bold text-amber-300 font-mono text-xs">৳ ১০০.০০</span>
                        </div>
                        <div className="bg-[#080d16] p-2 rounded-xl border border-emerald-500/20">
                          <span className="text-[10px] text-slate-400 block">উত্তোলনযোগ্য লাভ:</span>
                          <span className="font-bold text-emerald-400 font-mono text-sm">৳ {withdrawableAmount.toLocaleString()}</span>
                        </div>
                      </div>
                      <div className="bg-amber-950/25 border border-amber-800/30 rounded-xl p-2.5 text-[10.5px] text-slate-300 leading-snug space-y-1">
                        <p className="font-bold text-amber-300 flex items-center gap-1">
                          <Info className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>ক্যাশআউট নিয়মাবলী:</span>
                        </p>
                        <p>
                          ১. মিনিমাম ক্যাশআউট <strong>৳ ৫০০</strong>।<br />
                          ২. একাউন্টে সর্বনিম্ন ৳ ১০০ ব্যালেন্স রেখে বাকি টাকা উত্তোলন করা যাবে (০ করে উত্তোলন করা যাবে না)।<br />
                          ৩. রেফার কমিশন পাওয়া টাকা উত্তোলনযোগ্য নয় (তা দিয়ে গেম খেলতে পারবেন)।
                        </p>
                      </div>
                    </div>
                  );
                })()}

                {/* 3. Withdrawal Amount Selection */}
                {(() => {
                  let lockedReferralBonus = 0;
                  const phoneSession = getActivePhoneSession();
                  if (phoneSession?.user.phoneNumber) {
                    const accounts = getStoredPhoneAccounts();
                    const acc = accounts[phoneSession.user.phoneNumber];
                    if (acc) {
                      lockedReferralBonus = acc.referralBonusEarned || 0;
                    } else {
                      lockedReferralBonus = phoneSession.profile.referralBonusEarned || 0;
                    }
                  } else if (userProfile) {
                    lockedReferralBonus = userProfile.referralBonusEarned || 0;
                  }

                  const minRetainedBalance = 100;
                  const withdrawableAmount = Math.max(0, Math.round((currentBalance - lockedReferralBonus - minRetainedBalance) * 100) / 100);

                  return (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <label className="text-xs font-bold text-slate-200">
                          ৩. উত্তোলনের পরিমাণ (মিনিমাম ৫০০ ৳):
                        </label>
                        <span className="text-[11px] text-emerald-400 font-mono font-bold">
                          উত্তোলনযোগ্য ব্যালেন্স: ৳{withdrawableAmount.toLocaleString()}
                        </span>
                      </div>

                      {/* Preset Chips (Starting from 500) */}
                      <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
                        {[500, 630, 1000, 2000, 5000].map((val) => (
                          <button
                            key={val}
                            type="button"
                            onClick={() => {
                              soundManager.playClick();
                              setWithdrawAmount(val);
                            }}
                            disabled={withdrawableAmount < val}
                            className={`py-2 rounded-xl text-xs font-bold font-mono-numbers transition-all cursor-pointer ${
                              withdrawAmount === val
                                ? 'bg-rose-600 text-white shadow-md shadow-rose-900/40 ring-1 ring-rose-400'
                                : 'bg-[#0a0e16] border border-[#1b2538] text-slate-300 hover:border-slate-500 hover:text-white'
                            } disabled:opacity-25 disabled:cursor-not-allowed`}
                          >
                            ৳{val.toLocaleString()}
                          </button>
                        ))}
                      </div>

                      {/* Custom Amount Input Field */}
                      <div className="bg-[#090d15] border border-[#1e2a3f] rounded-xl px-3.5 py-2 flex items-center justify-between focus-within:border-rose-500 transition-colors">
                        <span className="text-xs text-slate-400 font-medium">পরিমাণ (মিনিমাম ৫০০ ৳):</span>
                        <div className="flex items-center gap-1.5">
                          <input
                            type="number"
                            min="500"
                            max={withdrawableAmount}
                            value={withdrawAmount || ''}
                            onChange={(e) => {
                              const val = parseFloat(e.target.value) || 0;
                              setWithdrawAmount(val);
                            }}
                            placeholder="যেমন: 630"
                            className="w-32 bg-transparent text-right font-mono font-bold text-base text-rose-400 focus:outline-hidden"
                          />
                          <span className="text-xs text-slate-400 font-bold">৳</span>
                        </div>
                      </div>
                    </div>
                  );
                })()}

                {/* Error Banner */}
                {withdrawError && (
                  <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2 animate-fadeIn">
                    <AlertCircle className="w-4 h-4 shrink-0" />
                    <span>{withdrawError}</span>
                  </div>
                )}

                {/* Success Card */}
                {withdrawSuccess && (
                  <div className="p-3.5 rounded-2xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs space-y-1.5 animate-fadeIn">
                    <div className="flex items-center gap-2 font-bold text-sm">
                      <CheckCircle2 className="w-5 h-5 text-emerald-400" />
                      <span>উত্তোলন রিকোয়েস্ট সফলভাবে জমা হয়েছে!</span>
                    </div>
                    <p className="text-slate-300">
                      পরিমাণ: <strong className="text-white">৳ {withdrawSuccess.amount.toLocaleString()}</strong> | মাধ্যম:{' '}
                      <strong className="text-amber-300 uppercase">{withdrawSuccess.method}</strong> (পার্সোনাল:{' '}
                      <strong className="text-white font-mono">{withdrawSuccess.personalNumber}</strong>)
                    </p>
                    <p className="text-[11px] text-slate-400">
                      এডমিন যাচাই বাচাই করে আপনার নম্বরে টাকা সেন্ড করে স্ট্যাটাস আপডেট করে দিবেন।
                    </p>
                  </div>
                )}

                {/* Primary Submit Button */}
                {(() => {
                  let lockedReferralBonus = 0;
                  const phoneSession = getActivePhoneSession();
                  if (phoneSession?.user.phoneNumber) {
                    const accounts = getStoredPhoneAccounts();
                    const acc = accounts[phoneSession.user.phoneNumber];
                    if (acc) {
                      lockedReferralBonus = acc.referralBonusEarned || 0;
                    } else {
                      lockedReferralBonus = phoneSession.profile.referralBonusEarned || 0;
                    }
                  } else if (userProfile) {
                    lockedReferralBonus = userProfile.referralBonusEarned || 0;
                  }

                  const minRetainedBalance = 100;
                  const withdrawableAmount = Math.max(0, Math.round((currentBalance - lockedReferralBonus - minRetainedBalance) * 100) / 100);
                  const isEligible = withdrawableAmount >= 500 && withdrawAmount >= 500 && withdrawAmount <= withdrawableAmount;

                  return (
                    <button
                      type="submit"
                      disabled={isWithdrawSubmitting || !isEligible}
                      className="w-full py-3 bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white rounded-2xl shadow-xl shadow-rose-900/40 active:scale-98 transition-all flex flex-col items-center justify-center cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                    >
                      <div className="flex items-center gap-1.5 text-sm font-black tracking-wide">
                        <ArrowDownLeft className="w-4 h-4 font-bold" />
                        <span>
                          {isWithdrawSubmitting
                            ? 'রিকোয়েস্ট পাঠানো হচ্ছে...'
                            : withdrawableAmount < 500
                            ? 'উত্তোলনযোগ্য ব্যালেন্স ৫০০ ৳ এর কম'
                            : 'উত্তোলন রিকুয়েস্ট সাবমিট'}
                        </span>
                      </div>
                      {!isWithdrawSubmitting && isEligible && (
                        <span className="text-xs font-mono font-bold text-rose-100 opacity-95 mt-0.5">
                          (৳ {withdrawAmount.toLocaleString()})
                        </span>
                      )}
                    </button>
                  );
                })()}

                {/* Notice text */}
                <div className="bg-[#090d14] p-3 rounded-xl border border-[#182132] text-[11px] text-slate-400 flex items-start gap-2">
                  <ShieldCheck className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                  <span>
                    এডমিন যাচাই বাচাই করে আপনার প্রদানকৃত বিকাশ/নগদ/রকেট পার্সোনাল নম্বরে টাকা পাঠিয়ে দিবেন এবং স্ট্যাটাস আপডেট করবেন।
                  </span>
                </div>
              </form>
            )}

            {/* WITHDRAW HISTORY VIEW */}
            {withdrawView === 'history' && (
              <div className="space-y-2.5 animate-fadeIn">
                <div className="flex items-center justify-between pb-1">
                  <span className="text-xs font-semibold text-slate-300">
                    আপনার জমা দেওয়া উত্তোলন রিকোয়েস্টসমূহ:
                  </span>
                  <span className="text-xs text-slate-400 font-mono">
                    মোট: {userWithdrawals.length} টি
                  </span>
                </div>

                {userWithdrawals.length === 0 ? (
                  <div className="p-8 text-center text-slate-500 bg-[#090d14] rounded-2xl border border-[#1b2538]">
                    <Clock className="w-7 h-7 mx-auto mb-2 text-slate-600" />
                    <p className="text-xs font-medium">এখনও কোনো উত্তোলন রিকোয়েস্ট জমা দেওয়া হয়নি।</p>
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto space-y-2 pr-1">
                    {userWithdrawals.map((req) => (
                      <div
                        key={req.id}
                        className={`p-3 rounded-xl border transition-all ${
                          req.status === 'pending'
                            ? 'bg-[#121927] border-amber-500/30'
                            : req.status === 'completed'
                            ? 'bg-[#0d1720] border-emerald-500/30'
                            : 'bg-[#150d12] border-rose-500/30'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-black text-sm text-rose-400 font-mono-numbers">
                              ৳ {req.amount.toLocaleString()}
                            </span>
                            <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded-md bg-white/10 text-slate-300">
                              {req.method} (Personal)
                            </span>
                          </div>

                          <span
                            className={`text-[11px] font-bold px-2 py-0.5 rounded-full flex items-center gap-1 ${
                              req.status === 'pending'
                                ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                : req.status === 'completed'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                            }`}
                          >
                            {req.status === 'pending' && <Clock className="w-3 h-3" />}
                            {req.status === 'completed' && <CheckCircle2 className="w-3 h-3" />}
                            {req.status === 'rejected' && <XCircle className="w-3 h-3" />}
                            <span>
                              {req.status === 'pending'
                                ? 'অপেক্ষমান (এডমিন যাচাই করছেন)'
                                : req.status === 'completed'
                                ? 'টাকা সেন্ড করা হয়েছে'
                                : 'বাতিল ও রিফান্ড'}
                            </span>
                          </span>
                        </div>

                        <div className="mt-2 pt-1.5 border-t border-white/5 flex items-center justify-between text-[11px] text-slate-400 font-mono">
                          <span>পার্সোনাল নম্বর: <strong className="text-white">{req.personalNumber}</strong></span>
                          <span>{new Date(req.createdAt).toLocaleTimeString('bn-BD', { hour: '2-digit', minute: '2-digit' })}</span>
                        </div>

                        {req.adminNote && (
                          <p className="mt-1.5 text-[10px] text-emerald-400 bg-emerald-500/10 p-1.5 rounded-md">
                            নোট: {req.adminNote}
                          </p>
                        )}

                        {req.rejectionReason && (
                          <p className="mt-1.5 text-[10px] text-rose-400 bg-rose-500/10 p-1.5 rounded-md">
                            বাতিলের কারণ: {req.rejectionReason} (ব্যালেন্সে রিফান্ড করা হয়েছে)
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>
        )}
          </>
        )}

        {/* Toast confirmation */}
        {showSuccessToast && (
          <div className="absolute inset-0 bg-[#101724]/95 backdrop-blur-md rounded-3xl flex flex-col items-center justify-center gap-2 z-50 animate-fadeIn p-4 text-center">
            <div
              className={`w-12 h-12 rounded-full flex items-center justify-center border ${
                showSuccessToast.type === 'deposit'
                  ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/40'
                  : 'bg-rose-500/20 text-rose-400 border-rose-500/40'
              }`}
            >
              <Check className="w-6 h-6 stroke-[3]" />
            </div>
            <p className={`font-bold text-base ${showSuccessToast.type === 'deposit' ? 'text-emerald-300' : 'text-rose-300'}`}>
              {showSuccessToast.type === 'deposit'
                ? 'ব্যালেন্স সফলভাবে যোগ হয়েছে!'
                : 'উত্তোলন সফলভাবে সম্পন্ন হয়েছে!'}
            </p>
            <p className="text-xs text-slate-300 font-mono">
              ৳ {showSuccessToast.amount.toLocaleString()} {selectedMethod.toUpperCase()} নম্বরে পাঠানো হয়েছে
            </p>
            <p className="text-[11px] text-slate-400 mt-1">
              বর্তমান অবশিষ্ট ব্যালেন্স:{' '}
              <span className="font-bold text-cyan-300">
                ৳ {(currentBalance - showSuccessToast.amount).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
