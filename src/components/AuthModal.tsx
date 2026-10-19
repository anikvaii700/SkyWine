import React, { useState } from 'react';
import {
  X,
  LogIn,
  LogOut,
  CheckCircle2,
  ShieldCheck,
  Database,
  Cloud,
  RotateCcw,
  Smartphone,
  Mail,
  Lock,
  Eye,
  EyeOff,
  User as UserIcon,
  UserPlus,
  Save,
  Edit2,
  Sparkles,
  Copy,
  Check,
  Gift,
  Share2,
  AlertCircle,
} from 'lucide-react';
import { calculateWithdrawableBalance } from '../services/userManagement';
import {
  signInWithGoogle,
  logoutUser as firebaseLogout,
  updateUserPhoneNumber,
  getOrCreateUserProfile,
  UserWalletProfile,
} from '../services/firebase';
import {
  AppUser,
  registerPhoneAccount,
  loginPhoneAccount,
  logoutPhoneSession,
  normalizePhoneNumber,
} from '../services/phoneAuth';
import { soundManager } from '../services/audio';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: AppUser | null;
  userProfile: UserWalletProfile | null;
  onLoginSuccess: (user: AppUser, profile: UserWalletProfile) => void;
  onLogoutSuccess: () => void;
  onResetBalance?: () => void;
  onUpdatePhone?: (phone: string) => void;
  onOpenInstallModal?: () => void;
  noticeMessage?: string | null;
}

type AuthMethod = 'google' | 'phone';
type AuthMode = 'signup' | 'login';

export const AuthModal: React.FC<AuthModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  userProfile,
  onLoginSuccess,
  onLogoutSuccess,
  onResetBalance,
  onUpdatePhone,
  onOpenInstallModal,
  noticeMessage,
}) => {
  const [activeMethod, setActiveMethod] = useState<AuthMethod>('phone');
  const [authMode, setAuthMode] = useState<AuthMode>('signup');

  // Form states
  const [phoneNumber, setPhoneNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [referralCodeInput, setReferralCodeInput] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedReferral, setCopiedReferral] = useState(false);

  // Phone editing for logged-in user
  const [isEditingPhone, setIsEditingPhone] = useState(false);
  const [editPhoneNumber, setEditPhoneNumber] = useState(userProfile?.phoneNumber || '');
  const [isSavingPhone, setIsSavingPhone] = useState(false);

  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  if (!isOpen) return null;

  // 1-Click Google Sign-In
  const handleGoogleLogin = async () => {
    setIsLoading(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    soundManager.playClick();
    try {
      const fbUser = await signInWithGoogle();
      if (fbUser) {
        const profile = await getOrCreateUserProfile(fbUser, 100);
        const appUser: AppUser = {
          uid: fbUser.uid,
          userCode: profile.userCode,
          displayName: fbUser.displayName || 'Google Player',
          email: fbUser.email,
          phoneNumber: profile.phoneNumber || fbUser.phoneNumber || null,
          photoURL: fbUser.photoURL,
          provider: 'google',
        };
        soundManager.playWin();
        onLoginSuccess(appUser, profile);
        setSuccessMsg('Google জিমেইল দিয়ে সফলভাবে লগইন হয়েছে! স্বাগতম ব্যালেন্স ৳ ১০০.০০ ওয়ালেটে রয়েছে।');
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (err: unknown) {
      console.warn('Google sign-in attempt:', err);
      setErrorMsg('Google দিয়ে সাইনআপ/লগইন করতে ব্যর্থ হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  // Mobile Phone Sign-Up & Login
  const handlePhoneSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg(null);
    setSuccessMsg(null);

    const { cleanPhone } = normalizePhoneNumber(phoneNumber);
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
      setErrorMsg('অনুগ্রহ করে সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 01712345678)');
      return;
    }

    if (!password || password.length < 6) {
      setErrorMsg('পাসওয়ার্ড বা গোপন পিন কমপক্ষে ৬ ডিজিটের হতে হবে');
      return;
    }

    if (authMode === 'signup' && password !== confirmPassword) {
      setErrorMsg('পাসওয়ার্ড দুটি মিলছে না। অনুগ্রহ করে আবার চেক করুন।');
      return;
    }

    setIsLoading(true);
    soundManager.playClick();

    try {
      if (authMode === 'signup') {
        const res = await registerPhoneAccount(phoneNumber, password, fullName, referralCodeInput);
        if (!res.success || !res.user || !res.profile) {
          setErrorMsg(res.error || 'অ্যাকাউন্ট তৈরি করা যায়নি');
          if (res.error?.includes('ইতোমধ্যে')) {
            setAuthMode('login');
          }
          return;
        }

        soundManager.playWin();
        setSuccessMsg(
          `মোবাইল অ্যাকাউন্ট সফলভাবে তৈরি হয়েছে! শুরুতেই ৳ ১০০.০০ স্বাগতম বোনাস যুক্ত হয়েছে!` +
            (res.referralBonusApplied ? ' (রেফারেল কোড সফলভাবে যুক্ত হয়েছে)' : '')
        );
        onLoginSuccess(res.user, res.profile);
        setTimeout(() => {
          onClose();
        }, 600);
      } else {
        const res = await loginPhoneAccount(phoneNumber, password);
        if (!res.success || !res.user || !res.profile) {
          setErrorMsg(res.error || 'লগইন ব্যর্থ হয়েছে।');
          return;
        }

        soundManager.playWin();
        setSuccessMsg('মোবাইল নাম্বার দিয়ে লগইন সফল হয়েছে!');
        onLoginSuccess(res.user, res.profile);
        setTimeout(() => {
          onClose();
        }, 500);
      }
    } catch (err: unknown) {
      console.warn('Phone auth notice:', err);
      setErrorMsg('প্রক্রিয়া সম্পন্ন করা যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।');
    } finally {
      setIsLoading(false);
    }
  };

  // Save phone number for logged-in user
  const handleSaveUserPhone = async () => {
    if (!currentUser) return;
    const { cleanPhone } = normalizePhoneNumber(editPhoneNumber);
    if (cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
      setErrorMsg('সঠিক ১১ ডিজিটের মোবাইল নাম্বার দিন (যেমন: 01712345678)');
      return;
    }

    setIsSavingPhone(true);
    setErrorMsg(null);
    try {
      if (currentUser.provider === 'google') {
        await updateUserPhoneNumber(currentUser.uid, cleanPhone);
      }
      if (userProfile) {
        userProfile.phoneNumber = cleanPhone;
      }
      if (onUpdatePhone) {
        onUpdatePhone(cleanPhone);
      }
      setIsEditingPhone(false);
      setSuccessMsg('মোবাইল নাম্বার সফলভাবে সংরক্ষিত হয়েছে!');
      soundManager.playWin();
    } catch (err) {
      console.warn('Failed to update phone:', err);
      setErrorMsg('নাম্বার সংরক্ষণ করা যায়নি।');
    } finally {
      setIsSavingPhone(false);
    }
  };

  const handleLogout = async () => {
    soundManager.playClick();
    try {
      await firebaseLogout();
    } catch {}
    logoutPhoneSession();
    onLogoutSuccess();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-4 animate-fadeIn">
      <div className="bg-[#121824] border border-[#24334c] rounded-3xl p-5 sm:p-6 max-w-md w-full shadow-2xl text-white relative max-h-[92vh] overflow-y-auto">
        {/* Header */}
        <div className="flex items-center justify-between pb-3 border-b border-[#1e2a3f]">
          <div className="flex items-center gap-2.5">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center border border-emerald-500/30">
              <Database className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold leading-tight">ইউজার অ্যাকাউন্ট ও ওয়ালেট</h2>
              <p className="text-[11px] text-slate-400">একাউন্ট তৈরি ও সরাসরি লগইন</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1b2537] hover:bg-[#253248] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="mt-4 space-y-4">
          {currentUser ? (
            /* Logged in state */
            <div className="space-y-4">
              <div className="bg-[#0b0e15] border border-[#1d273a] rounded-2xl p-4 flex items-center gap-3">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'User'}
                    className="w-12 h-12 rounded-full border-2 border-emerald-500 shrink-0"
                    referrerPolicy="no-referrer"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-emerald-600 to-teal-700 text-white font-bold flex items-center justify-center text-lg shrink-0 border border-emerald-400/40 shadow-inner">
                    {userProfile?.phoneNumber ? (
                      <Smartphone className="w-6 h-6" />
                    ) : (
                      currentUser.displayName?.charAt(0) || 'U'
                    )}
                  </div>
                )}
                <div className="overflow-hidden min-w-0 flex-1">
                  <div className="flex items-center gap-1.5">
                    <h3 className="font-bold text-sm text-white truncate">
                      {currentUser.displayName || userProfile?.displayName || 'Player'}
                    </h3>
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  </div>
                  {currentUser.phoneNumber ? (
                    <p className="text-xs text-emerald-400 font-mono truncate">
                      📱 +88 {currentUser.phoneNumber}
                    </p>
                  ) : currentUser.email ? (
                    <p className="text-xs text-slate-400 truncate">{currentUser.email}</p>
                  ) : null}
                  <div className="flex items-center gap-1 text-[11px] text-emerald-400 mt-1 font-mono">
                    <Cloud className="w-3 h-3" />
                    <span>
                      {currentUser.provider === 'google' ? 'Google Cloud Sync Active' : 'মোবাইল ওয়ালেট সক্রিয়'}
                    </span>
                  </div>
                </div>
              </div>

              {/* Linked Mobile Phone card */}
              <div className="bg-[#0e1422] border border-[#1f2c42] rounded-2xl p-3.5 space-y-2 text-xs">
                <div className="flex justify-between items-center text-slate-300">
                  <div className="flex items-center gap-2">
                    <Smartphone className="w-4 h-4 text-emerald-400" />
                    <span className="font-bold">মোবাইল নাম্বার (বিকাশ / নগদ ওয়ালেট):</span>
                  </div>
                  {!isEditingPhone && currentUser.provider === 'google' && (
                    <button
                      onClick={() => {
                        setEditPhoneNumber(userProfile?.phoneNumber || '');
                        setIsEditingPhone(true);
                      }}
                      className="text-[11px] text-sky-400 hover:text-sky-300 flex items-center gap-1 cursor-pointer"
                    >
                      <Edit2 className="w-3 h-3" />
                      <span>{userProfile?.phoneNumber ? 'পরিবর্তন' : 'যুক্ত করুন'}</span>
                    </button>
                  )}
                </div>

                {isEditingPhone ? (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center gap-2">
                      <div className="relative flex-1">
                        <span className="absolute left-2.5 top-2.5 text-xs text-emerald-400 font-mono font-bold select-none">
                          🇧🇩 +88
                        </span>
                        <input
                          type="tel"
                          value={editPhoneNumber}
                          onChange={(e) => setEditPhoneNumber(e.target.value)}
                          placeholder="017xxxxxxxx"
                          className="w-full bg-[#090d14] border border-[#2b3952] rounded-xl pl-16 pr-3 py-2 text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500"
                        />
                      </div>
                      <button
                        onClick={handleSaveUserPhone}
                        disabled={isSavingPhone}
                        className="px-3 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold flex items-center gap-1 cursor-pointer disabled:opacity-50"
                      >
                        <Save className="w-3.5 h-3.5" />
                        <span>সেভ</span>
                      </button>
                      <button
                        onClick={() => setIsEditingPhone(false)}
                        className="px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 rounded-xl text-xs cursor-pointer"
                      >
                        বাতিল
                      </button>
                    </div>
                    <p className="text-[10px] text-slate-400">
                      এই নাম্বারটি ডিপোজিট ও উত্তোলনে স্বয়ংক্রিয়ভাবে ব্যবহৃত হবে।
                    </p>
                  </div>
                ) : (
                  <div className="flex items-center justify-between font-mono bg-[#090d14] p-2.5 rounded-xl border border-slate-800">
                    <span className="text-emerald-300 font-bold text-xs">
                      {userProfile?.phoneNumber || currentUser.phoneNumber
                        ? `+88 ${userProfile?.phoneNumber || currentUser.phoneNumber}`
                        : 'কোন মোবাইল নাম্বার যুক্ত করা নেই'}
                    </span>
                    <span className="text-[10px] text-slate-400">
                      {userProfile?.phoneNumber || currentUser.phoneNumber ? 'সংযুক্ত ও সক্রিয়' : 'বিকাশ/নগদ এর জন্য আবশ্যক'}
                    </span>
                  </div>
                )}
              </div>

              {/* User ID & Credentials Card */}
              {(() => {
                const userCode = userProfile?.userCode || currentUser.userCode || `USER-${currentUser.uid.slice(-5)}`;
                const balance = userProfile?.balance || 0;
                const locked = userProfile?.referralBonusEarned || 0;
                const withdrawable = calculateWithdrawableBalance(balance, locked);
                const referralCount = userProfile?.referralCount || 0;
                const referralBonus = userProfile?.referralBonusEarned || referralCount * 50;

                const copyUserId = () => {
                  navigator.clipboard.writeText(userCode);
                  setCopiedId(true);
                  soundManager.playClick();
                  setTimeout(() => setCopiedId(false), 2000);
                };

                const copyReferral = () => {
                  navigator.clipboard.writeText(userCode);
                  setCopiedReferral(true);
                  soundManager.playClick();
                  setTimeout(() => setCopiedReferral(false), 2000);
                };

                return (
                  <>
                    {/* User ID Badge */}
                    <div className="bg-[#0b1019] border border-[#1e2a3f] rounded-2xl p-3 flex items-center justify-between">
                      <div>
                        <span className="text-[10px] text-slate-400 block font-medium">আপনার ইউজার আইডি (User ID):</span>
                        <span className="font-mono text-sm font-bold text-amber-400 tracking-wider">
                          {userCode}
                        </span>
                      </div>
                      <button
                        onClick={copyUserId}
                        className="px-2.5 py-1.5 rounded-xl bg-[#172233] hover:bg-[#202f47] border border-[#263752] text-xs font-semibold text-slate-300 hover:text-white flex items-center gap-1.5 transition-colors cursor-pointer"
                        title="আইডি কপি করুন"
                      >
                        {copiedId ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                        <span>{copiedId ? 'কপি হয়েছে!' : 'কপি আইডি'}</span>
                      </button>
                    </div>

                    {/* Balance & Withdrawable Breakdown Card */}
                    <div className="bg-[#0e1422] border border-[#1f2c42] rounded-2xl p-3.5 space-y-2.5 text-xs">
                      <div className="flex justify-between items-center text-slate-300">
                        <span className="font-medium">মোট ওয়ালেট ব্যালেন্স:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-bold font-mono text-base text-cyan-300">
                            ৳ {balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                          {onResetBalance && (
                            <button
                              onClick={() => {
                                soundManager.playClick();
                                onResetBalance();
                              }}
                              className="px-2 py-1 rounded-lg bg-[#1a2334] hover:bg-[#25324c] text-[10px] text-slate-300 hover:text-white border border-[#2b3952] flex items-center gap-1 transition-colors cursor-pointer"
                              title="ব্যালেন্স ০ করুন"
                            >
                              <RotateCcw className="w-3 h-3 text-amber-400" />
                              <span>০ করুন</span>
                            </button>
                          )}
                        </div>
                      </div>

                      <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#1b263b]">
                        <div className="bg-[#080c14] p-2 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 block">রেফার কমিশন (লকড বোনাস):</span>
                          <span className="font-bold text-xs text-amber-300 font-mono">
                            ৳ {locked.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                        <div className="bg-[#080c14] p-2 rounded-xl border border-white/5">
                          <span className="text-[10px] text-slate-400 block">উত্তোলনযোগ্য ব্যালেন্স:</span>
                          <span className="font-bold text-xs text-emerald-400 font-mono">
                            ৳ {withdrawable.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                          </span>
                        </div>
                      </div>

                      <p className="text-[10px] text-slate-400 bg-emerald-950/30 p-2 rounded-xl border border-emerald-900/30 leading-snug">
                        💡 <span className="text-emerald-300 font-semibold">ক্যাশআউট নিয়ম:</span> মিনিমাম ক্যাশআউট ৫০০ টাকা। ক্যাশ-ইন ও গেম খেলে অর্জিত ব্যালেন্স সম্পূর্ণ ক্যাশআউট করা যাবে, শুধুমাত্র রেফার কমিশন সরাসরি উত্তোলন করা যাবে না।
                      </p>
                    </div>

                    {/* Refer & Earn ৳50 Card */}
                    <div className="bg-gradient-to-br from-[#121c2c] to-[#0f1724] border border-[#23354f] rounded-2xl p-3.5 space-y-2 text-xs">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1.5 text-amber-400 font-bold">
                          <Gift className="w-4 h-4" />
                          <span>রেফার ও ইনভাইট বোনাস (৳৫০/ফ্রেন্ড)</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-full bg-amber-500/20 text-amber-300 text-[10px] font-bold border border-amber-500/30">
                          ৳ ৫০ বোনাস
                        </span>
                      </div>

                      <p className="text-[11px] text-slate-300 leading-snug">
                        আপনার রেফারেল কোড দিয়ে কোনো বন্ধু সাইনআপ করলেই আপনি পাবেন <span className="text-amber-400 font-bold">৳ ৫০ বোনাস</span>! (যেমন: ২০ জন একাউন্ট করলে ১,০০০ টাকা কমিশন বোনাস)।
                      </p>

                      <div className="flex items-center justify-between bg-[#080c14] p-2.5 rounded-xl border border-[#1e2a3c]">
                        <div>
                          <span className="text-[10px] text-slate-400 block">আপনার রেফারেল কোড:</span>
                          <span className="font-mono font-bold text-amber-300 text-sm tracking-wider">{userCode}</span>
                        </div>
                        <button
                          onClick={copyReferral}
                          className="px-3 py-1.5 rounded-lg bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 border border-amber-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
                        >
                          {copiedReferral ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Share2 className="w-3.5 h-3.5" />}
                          <span>{copiedReferral ? 'কপি হয়েছে' : 'কোড কপি'}</span>
                        </button>
                      </div>

                      <div className="flex items-center justify-between text-[11px] text-slate-400 px-1 pt-1">
                        <span>মোট বন্ধু ইনভাইট: <strong className="text-white font-mono">{referralCount} জন</strong></span>
                        <span>অর্জিত কমিশন: <strong className="text-emerald-400 font-mono">৳ {referralBonus}</strong></span>
                      </div>
                    </div>
                  </>
                );
              })()}

              {onOpenInstallModal && (
                <div
                  onClick={() => {
                    soundManager.playClick();
                    onOpenInstallModal();
                  }}
                  className="bg-gradient-to-r from-red-600/20 via-rose-600/20 to-amber-600/20 border border-red-500/40 rounded-2xl p-3 flex items-center justify-between cursor-pointer hover:border-red-400 transition-all active:scale-[0.99]"
                >
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-red-600 to-rose-700 flex items-center justify-center text-white shadow-md">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <div className="text-left">
                      <span className="text-xs font-bold text-white block">মোবাইল অ্যাপ ইনস্টল করুন</span>
                      <span className="text-[10px] text-slate-400 block">হোমস্ক্রিনে ১-ক্লিকে ইনস্টল করুন</span>
                    </div>
                  </div>
                  <span className="px-2.5 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white font-bold text-xs shadow-sm">
                    ইনস্টল
                  </span>
                </div>
              )}

              <button
                onClick={handleLogout}
                className="w-full py-3 bg-[#1e273a] hover:bg-rose-900/60 hover:border-rose-700/60 border border-[#2b374e] text-slate-200 hover:text-white font-bold text-xs uppercase tracking-wider rounded-2xl transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <LogOut className="w-4 h-4" />
                <span>লগআউট করুন (Sign Out)</span>
              </button>
            </div>
          ) : (
            /* Logged out state - Multi-method Auth */
            <div className="space-y-4">
              {/* Notice Banner when redirected from Add Money or Betting */}
              {noticeMessage && (
                <div className="bg-gradient-to-r from-amber-500/20 via-orange-500/20 to-red-500/20 border border-amber-500/50 rounded-2xl p-3 flex items-start gap-2.5 text-amber-200 text-xs shadow-md">
                  <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="flex-1">
                    <span className="font-bold text-amber-300 block mb-0.5">একাউন্ট তৈরি আবশ্যক!</span>
                    <p className="text-[11px] text-amber-100/95 leading-relaxed">{noticeMessage}</p>
                  </div>
                </div>
              )}

              {/* Top Navigation Tabs: Mobile Number vs Gmail */}
              <div className="grid grid-cols-2 gap-2 p-1 bg-[#0a0e17] border border-[#1f2b3e] rounded-2xl">
                <button
                  type="button"
                  onClick={() => {
                    setActiveMethod('phone');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    activeMethod === 'phone'
                      ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Smartphone className="w-4 h-4" />
                  <span>মোবাইল নাম্বার</span>
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setActiveMethod('google');
                    setErrorMsg(null);
                    setSuccessMsg(null);
                  }}
                  className={`flex items-center justify-center gap-2 py-2.5 rounded-xl font-bold text-xs transition-all cursor-pointer ${
                    activeMethod === 'google'
                      ? 'bg-gradient-to-r from-red-600 to-rose-600 text-white shadow-lg'
                      : 'text-slate-400 hover:text-white'
                  }`}
                >
                  <Mail className="w-4 h-4" />
                  <span>জিমেইল (Google)</span>
                </button>
              </div>

              {/* Sub-mode switch (Login vs Signup) for Phone */}
              {activeMethod === 'phone' && (
                <div className="flex items-center justify-between px-1">
                  <span className="text-xs text-slate-300 font-medium">
                    {authMode === 'signup' ? 'নতুন অ্যাকাউন্ট খুলুন:' : 'বিদ্যমান অ্যাকাউন্টে প্রবেশ করুন:'}
                  </span>
                  <div className="flex gap-1 bg-[#151c2a] p-0.5 rounded-lg border border-[#222e43]">
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('signup');
                        setErrorMsg(null);
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        authMode === 'signup'
                          ? 'bg-emerald-500 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      সাইনআপ
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        setAuthMode('login');
                        setErrorMsg(null);
                      }}
                      className={`px-3 py-1 rounded-md text-xs font-bold transition-all cursor-pointer ${
                        authMode === 'login'
                          ? 'bg-emerald-500 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      লগইন
                    </button>
                  </div>
                </div>
              )}

              {/* Feedback messages */}
              {errorMsg && (
                <div className="p-3 rounded-xl bg-rose-950/80 border border-rose-800 text-rose-300 text-xs leading-relaxed animate-fadeIn">
                  {errorMsg}
                </div>
              )}
              {successMsg && (
                <div className="p-3 rounded-xl bg-emerald-950/80 border border-emerald-800 text-emerald-300 text-xs leading-relaxed flex items-center gap-2 animate-fadeIn">
                  <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
                  <span>{successMsg}</span>
                </div>
              )}

              {/* TAB 1: MOBILE NUMBER SIGNUP & LOGIN */}
              {activeMethod === 'phone' && (
                <div className="space-y-4">
                  <div className="bg-[#0b0e15] border border-[#1d273a] rounded-2xl p-3 flex items-center gap-3">
                    <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                      <Smartphone className="w-4 h-4" />
                    </div>
                    <p className="text-xs text-slate-300 leading-snug">
                      {authMode === 'signup'
                        ? 'আপনার মোবাইল নাম্বার ও ৬ সংখ্যার গোপন পিন দিয়ে সরাসরি ফ্রি অ্যাকাউন্ট খুলুন।'
                        : 'আপনার রেজিস্টার্ড মোবাইল নাম্বার ও পাসওয়ার্ড দিয়ে সরাসরি লগইন করুন।'}
                    </p>
                  </div>

                  <form onSubmit={handlePhoneSubmit} className="space-y-3">
                    {authMode === 'signup' && (
                      <div>
                        <label className="block text-[11px] font-bold text-slate-300 mb-1">
                          আপনার নাম (ঐচ্ছিক)
                        </label>
                        <div className="relative">
                          <UserIcon className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                          <input
                            type="text"
                            value={fullName}
                            onChange={(e) => setFullName(e.target.value)}
                            placeholder="যেমন: তানভীর আহমেদ"
                            className="w-full bg-[#0d121c] border border-[#232f44] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                          />
                        </div>
                      </div>
                    )}

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        মোবাইল নাম্বার (১১ ডিজিট)
                      </label>
                      <div className="relative flex items-center">
                        <div className="absolute left-2.5 flex items-center gap-1 text-slate-400 text-xs font-mono select-none">
                          <span className="text-sm">🇧🇩</span>
                          <span className="font-bold text-emerald-400">+88</span>
                        </div>
                        <input
                          type="tel"
                          required
                          value={phoneNumber}
                          onChange={(e) => setPhoneNumber(e.target.value)}
                          placeholder="017xxxxxxxx"
                          className="w-full bg-[#0d121c] border border-[#232f44] rounded-xl pl-16 pr-3 py-2.5 text-xs font-mono text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                        />
                      </div>
                    </div>

                    <div>
                      <label className="block text-[11px] font-bold text-slate-300 mb-1">
                        গোপন পাসওয়ার্ড বা পিন (কমপক্ষে ৬ সংখ্যার)
                      </label>
                      <div className="relative">
                        <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                        <input
                          type={showPassword ? 'text' : 'password'}
                          required
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••"
                          className="w-full bg-[#0d121c] border border-[#232f44] rounded-xl pl-9 pr-10 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          className="absolute right-3 top-3 text-slate-400 hover:text-white"
                        >
                          {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                        </button>
                      </div>
                    </div>

                    {authMode === 'signup' && (
                      <>
                        <div>
                          <label className="block text-[11px] font-bold text-slate-300 mb-1">
                            পাসওয়ার্ড পুনরায় লিখুন
                          </label>
                          <div className="relative">
                            <Lock className="w-4 h-4 absolute left-3 top-3 text-slate-400" />
                            <input
                              type={showPassword ? 'text' : 'password'}
                              required
                              value={confirmPassword}
                              onChange={(e) => setConfirmPassword(e.target.value)}
                              placeholder="••••••"
                              className="w-full bg-[#0d121c] border border-[#232f44] rounded-xl pl-9 pr-3 py-2.5 text-xs text-white placeholder-slate-500 focus:outline-hidden focus:border-emerald-500 transition-colors"
                            />
                          </div>
                        </div>

                        {/* Referral Code Input */}
                        <div>
                          <div className="flex items-center justify-between mb-1">
                            <label className="block text-[11px] font-bold text-slate-300">
                              রেফারেল কোড (ঐচ্ছিক)
                            </label>
                            <span className="text-[10px] text-amber-400 font-semibold">
                              কারো ইনভাইট থাকলে দিন
                            </span>
                          </div>
                          <div className="relative">
                            <Sparkles className="w-4 h-4 absolute left-3 top-3 text-amber-400" />
                            <input
                              type="text"
                              value={referralCodeInput}
                              onChange={(e) => setReferralCodeInput(e.target.value.toUpperCase())}
                              placeholder="যেমন: USER-18492"
                              className="w-full bg-[#0d121c] border border-[#232f44] rounded-xl pl-9 pr-3 py-2.5 text-xs uppercase font-mono text-amber-300 placeholder-slate-500 focus:outline-hidden focus:border-amber-400 transition-colors"
                            />
                          </div>
                        </div>

                        {/* ৳100 Welcome Bonus Notice */}
                        <div className="bg-emerald-500/10 border border-emerald-500/30 rounded-xl p-2.5 flex items-center gap-2">
                          <Gift className="w-4 h-4 text-emerald-400 shrink-0" />
                          <p className="text-[11px] text-emerald-300 leading-snug">
                            <span className="font-bold">১০০ টাকা ফ্রি স্বাগতম ব্যালেন্স!</span> একাউন্ট খুললেই শুরুতেই ১০০ টাকা দিয়ে গেম খেলা শুরু করতে পারবেন।
                          </p>
                        </div>
                      </>
                    )}

                    <button
                      type="submit"
                      disabled={isLoading}
                      className="w-full py-3.5 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-black text-xs rounded-xl shadow-lg active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
                    >
                      {authMode === 'signup' ? <UserPlus className="w-4 h-4" /> : <LogIn className="w-4 h-4" />}
                      <span>
                        {isLoading
                          ? 'প্রক্রিয়াধীন...'
                          : authMode === 'signup'
                          ? 'মোবাইল দিয়ে ফ্রি একাউন্ট খুলুন'
                          : 'মোবাইল নাম্বার দিয়ে লগইন করুন'}
                      </span>
                    </button>
                  </form>

                  {/* Or Google 1-click option */}
                  <div className="pt-1">
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full py-2.5 bg-[#172132] hover:bg-[#202d44] border border-[#2b3a55] text-slate-300 hover:text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 cursor-pointer transition-colors"
                    >
                      <Mail className="w-3.5 h-3.5 text-rose-400" />
                      <span>অথবা Google জিমেইল দিয়ে ১-ক্লিকে সাইনআপ করুন</span>
                    </button>
                  </div>
                </div>
              )}

              {/* TAB 2: GMAIL / GOOGLE */}
              {activeMethod === 'google' && (
                <div className="space-y-4">
                  <div className="bg-[#0b0e15] border border-[#1d273a] rounded-2xl p-4 text-center space-y-3">
                    <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[11px] font-bold">
                      <Sparkles className="w-3.5 h-3.5" />
                      <span>১-ক্লিকে সরাসরি গুগল সাইনআপ</span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium">
                      পাসওয়ার্ড মনে রাখার ঝামেলা ছাড়াই সরাসরি আপনার জিমেইল দিয়ে ফ্রি সাইনআপ ও লগইন করুন:
                    </p>
                    <button
                      type="button"
                      onClick={handleGoogleLogin}
                      disabled={isLoading}
                      className="w-full py-3.5 bg-white hover:bg-slate-100 text-slate-900 font-black text-sm rounded-2xl shadow-xl active:scale-98 transition-all flex items-center justify-center gap-3 cursor-pointer disabled:opacity-60"
                    >
                      {isLoading ? (
                        <span className="text-xs font-bold">লগইন হচ্ছে...</span>
                      ) : (
                        <>
                          <svg className="w-5 h-5 shrink-0" viewBox="0 0 24 24">
                            <path
                              fill="#4285F4"
                              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                            />
                            <path
                              fill="#34A853"
                              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                            />
                            <path
                              fill="#FBBC05"
                              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                            />
                            <path
                              fill="#EA4335"
                              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                            />
                          </svg>
                          <span>Google দিয়ে সরাসরি ১-ক্লিকে প্রবেশ</span>
                        </>
                      )}
                    </button>
                    <p className="text-[11px] text-slate-400">
                      লগইন করার পর যেকোনো সময় আপনার বিকাশ বা নগদ মোবাইল নাম্বার যুক্ত করতে পারবেন।
                    </p>
                  </div>
                </div>
              )}

              {/* Security info note */}
              <div className="flex items-center gap-2 text-[11px] text-slate-400 bg-[#0c1017] p-2.5 rounded-xl border border-[#192231]">
                <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>
                  আপনার অ্যাকাউন্ট ক্লাউড ওয়ালেটে সংরক্ষিত। নতুন অ্যাকাউন্টের প্রারম্ভিক ব্যালেন্স ৳ ০.০০।
                </span>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
