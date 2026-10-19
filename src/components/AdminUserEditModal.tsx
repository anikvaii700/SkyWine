import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Lock,
  Phone,
  Coins,
  Save,
  RotateCcw,
  Sparkles,
  Check,
  Copy,
  AlertCircle,
  KeyRound,
} from 'lucide-react';
import { StoredPhoneAccount, adminUpdatePhoneAccount, getStoredPhoneAccounts } from '../services/phoneAuth';
import { calculateWithdrawableBalance } from '../services/userManagement';
import { soundManager } from '../services/audio';

interface AdminUserEditModalProps {
  userAccount: StoredPhoneAccount | null;
  onClose: () => void;
  onSaved: () => void;
}

export const AdminUserEditModal: React.FC<AdminUserEditModalProps> = ({
  userAccount,
  onClose,
  onSaved,
}) => {
  if (!userAccount) return null;

  const [userCode, setUserCode] = useState(userAccount.userCode || '');
  const [phoneNumber, setPhoneNumber] = useState(userAccount.phoneNumber || '');
  const [password, setPassword] = useState(userAccount.password || '');
  const [displayName, setDisplayName] = useState(userAccount.displayName || '');
  const [balance, setBalance] = useState<number>(userAccount.balance || 0);
  const [lockedPrincipal, setLockedPrincipal] = useState<number>(
    userAccount.lockedPrincipal !== undefined ? userAccount.lockedPrincipal : userAccount.balance
  );

  const [errorMsg, setErrorMsg] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [copiedCredentials, setCopiedCredentials] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Generate random new User ID
  const handleGenerateNewId = () => {
    soundManager.playClick();
    const accounts = getStoredPhoneAccounts();
    const existing = new Set(Object.values(accounts).map((a) => a.userCode?.toUpperCase()));
    for (let i = 0; i < 200; i++) {
      const code = `USER-${Math.floor(10000 + Math.random() * 90000)}`;
      if (!existing.has(code)) {
        setUserCode(code);
        return;
      }
    }
  };

  // Copy full user credentials
  const handleCopyCredentials = () => {
    const withdrawable = calculateWithdrawableBalance(balance, lockedPrincipal);
    const text = `🎮 Aviator গেম একাউন্ট তথ্য
━━━━━━━━━━━━━━━━━
ইউজার আইডি: ${userCode}
মোবাইল নম্বর: +88 ${phoneNumber}
পাসওয়ার্ড / পিন: ${password}
বর্তমান ব্যালেন্স: ৳ ${balance.toFixed(2)}
উত্তোলনযোগ্য ব্যালেন্স: ৳ ${withdrawable.toFixed(2)}
রেফারেল কোড: ${userCode}
━━━━━━━━━━━━━━━━━`;

    navigator.clipboard.writeText(text);
    setCopiedCredentials(true);
    soundManager.playClick();
    setTimeout(() => setCopiedCredentials(false), 2500);
  };

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    if (!userCode.trim()) {
      setErrorMsg('ইউজার আইডি অবশ্যই দিতে হবে');
      return;
    }

    if (password.trim().length < 4) {
      setErrorMsg('পাসওয়ার্ড কমপক্ষে ৪ ডিজিট হতে হবে');
      return;
    }

    setIsSaving(true);
    soundManager.playClick();

    const res = adminUpdatePhoneAccount(userAccount.phoneNumber, {
      userCode: userCode.trim().toUpperCase(),
      phoneNumber: phoneNumber.trim(),
      password: password.trim(),
      displayName: displayName.trim(),
      balance: Math.max(0, balance),
      lockedPrincipal: Math.max(0, lockedPrincipal),
    });

    setIsSaving(false);

    if (res.success) {
      soundManager.playWin();
      setSuccessMsg('ইউজার একাউন্ট তথ্য সফলভাবে আপডেট হয়েছে!');
      setTimeout(() => {
        onSaved();
        onClose();
      }, 800);
    } else {
      setErrorMsg(res.error || 'আপডেট করতে ব্যর্থ হয়েছে');
      soundManager.playCrash();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-3 sm:p-4 animate-fadeIn">
      <div className="bg-[#0f1624] border border-[#23334d] rounded-3xl max-w-lg w-full shadow-2xl text-white relative max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1b263b] flex items-center justify-between bg-gradient-to-r from-[#121c2d] to-[#162338]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center">
              <KeyRound className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-bold text-white">
                আইডি ও অ্যাকাউন্ট রিসেট / আপডেট
              </h3>
              <p className="text-xs text-slate-400">
                ইউজার আইডি ভুলে গেলে এখান থেকে রিসেট বা আপডেট করে দিন
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full bg-[#1a2538] hover:bg-[#25354e] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-4">
          {/* Quick Copy Credentials Button */}
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3 flex items-center justify-between">
            <div className="text-xs">
              <span className="text-amber-300 font-bold block">গ্রাহককে একাউন্ট তথ্য পাঠাবেন?</span>
              <span className="text-[11px] text-slate-300">১-ক্লিকে আইডি, ফোন ও পাসওয়ার্ড কপি করুন</span>
            </div>
            <button
              type="button"
              onClick={handleCopyCredentials}
              className="px-3 py-1.5 rounded-xl bg-amber-500 hover:bg-amber-400 text-[#120e00] font-black text-xs transition-all flex items-center gap-1.5 cursor-pointer shadow-md"
            >
              {copiedCredentials ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
              <span>{copiedCredentials ? 'কপি হয়েছে!' : 'তথ্য কপি'}</span>
            </button>
          </div>

          {errorMsg && (
            <div className="p-3 rounded-xl bg-rose-500/15 border border-rose-500/40 text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{errorMsg}</span>
            </div>
          )}

          {successMsg && (
            <div className="p-3 rounded-xl bg-emerald-500/15 border border-emerald-500/40 text-emerald-300 text-xs flex items-center gap-2">
              <Check className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}

          {/* User ID Field with Regenerate Button */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-300">
                ইউজার আইডি (User ID):
              </label>
              <button
                type="button"
                onClick={handleGenerateNewId}
                className="text-[11px] text-amber-400 hover:text-amber-300 flex items-center gap-1 font-semibold cursor-pointer"
              >
                <Sparkles className="w-3 h-3" />
                <span>নতুন আইডি জেনারেট করুন</span>
              </button>
            </div>
            <input
              type="text"
              required
              value={userCode}
              onChange={(e) => setUserCode(e.target.value.toUpperCase())}
              placeholder="যেমন: USER-18492"
              className="w-full bg-[#0a0f18] border border-[#233148] focus:border-amber-400 rounded-xl px-3.5 py-2.5 text-sm font-mono font-bold text-amber-300 uppercase focus:outline-hidden"
            />
          </div>

          {/* Phone Number */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              মোবাইল নম্বর (১১ ডিজিট):
            </label>
            <input
              type="tel"
              required
              value={phoneNumber}
              onChange={(e) => setPhoneNumber(e.target.value)}
              placeholder="017xxxxxxxx"
              className="w-full bg-[#0a0f18] border border-[#233148] focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm font-mono text-white focus:outline-hidden"
            />
          </div>

          {/* Password / PIN */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              গোপন পাসওয়ার্ড বা পিন:
            </label>
            <input
              type="text"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="যেমন: 123456"
              className="w-full bg-[#0a0f18] border border-[#233148] focus:border-rose-400 rounded-xl px-3.5 py-2.5 text-sm font-mono text-rose-300 focus:outline-hidden font-bold"
            />
          </div>

          {/* Display Name */}
          <div>
            <label className="text-xs font-bold text-slate-300 block mb-1">
              ইউজারের নাম:
            </label>
            <input
              type="text"
              value={displayName}
              onChange={(e) => setDisplayName(e.target.value)}
              placeholder="ইউজারের পুরো নাম"
              className="w-full bg-[#0a0f18] border border-[#233148] focus:border-cyan-400 rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-hidden"
            />
          </div>

          {/* Balance & Locked Balance Adjustment */}
          <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#1d293c]">
            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                মোট ওয়ালেট ব্যালেন্স (৳):
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={balance}
                onChange={(e) => setBalance(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0a0f18] border border-[#233148] focus:border-cyan-400 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-cyan-400 focus:outline-hidden text-right"
              />
            </div>

            <div>
              <label className="text-xs font-bold text-slate-300 block mb-1">
                প্লে ব্যালেন্স (ক্যাশ-ইন + বোনাস):
              </label>
              <input
                type="number"
                min="0"
                step="0.01"
                value={lockedPrincipal}
                onChange={(e) => setLockedPrincipal(parseFloat(e.target.value) || 0)}
                className="w-full bg-[#0a0f18] border border-[#233148] focus:border-amber-400 rounded-xl px-3.5 py-2 text-sm font-mono font-bold text-amber-300 focus:outline-hidden text-right"
              />
            </div>
          </div>

          {/* Calculated Withdrawable Profit Note */}
          <div className="bg-[#0b1019] p-3 rounded-xl border border-white/5 flex items-center justify-between text-xs">
            <span className="text-slate-400">উত্তোলনযোগ্য লাভ (ব্যালেন্স - প্লে ব্যালেন্স):</span>
            <span className="font-mono font-bold text-emerald-400 text-sm">
              ৳ {calculateWithdrawableBalance(balance, lockedPrincipal).toFixed(2)}
            </span>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSaving}
            className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-[#120e00] font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
          >
            <Save className="w-4 h-4 font-bold" />
            <span>{isSaving ? 'সংরক্ষণ হচ্ছে...' : 'একাউন্ট তথ্য আপডেট করুন (Save Changes)'}</span>
          </button>
        </form>
      </div>
    </div>
  );
};
