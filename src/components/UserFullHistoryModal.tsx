import React, { useState } from 'react';
import {
  X,
  User as UserIcon,
  Copy,
  Check,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  CheckCircle2,
  XCircle,
  Gamepad2,
  Gift,
  Coins,
  Calendar,
  Phone,
  Lock,
  Search,
  ShieldCheck,
} from 'lucide-react';
import { getUserFullHistory, UserFullHistoryData } from '../services/userManagement';
import { soundManager } from '../services/audio';

interface UserFullHistoryModalProps {
  userIdOrCode: string | null;
  onClose: () => void;
  onEditAccount?: (identifier: string) => void;
}

export const UserFullHistoryModal: React.FC<UserFullHistoryModalProps> = ({
  userIdOrCode,
  onClose,
  onEditAccount,
}) => {
  const [activeTab, setActiveTab] = useState<'overview' | 'deposits' | 'withdrawals' | 'bets' | 'referrals'>('overview');
  const [copiedText, setCopiedText] = useState<string | null>(null);

  if (!userIdOrCode) return null;

  const historyData: UserFullHistoryData | null = getUserFullHistory(userIdOrCode);

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedText(text);
    soundManager.playClick();
    setTimeout(() => setCopiedText(null), 2000);
  };

  if (!historyData) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-xs p-4 animate-fadeIn">
        <div className="bg-[#121927] border border-[#223149] rounded-3xl p-6 max-w-md w-full shadow-2xl text-white text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/20 text-rose-400 mx-auto flex items-center justify-center">
            <XCircle className="w-6 h-6" />
          </div>
          <h3 className="text-lg font-bold">ইউজার হিস্ট্রি পাওয়া যায়নি</h3>
          <p className="text-xs text-slate-400">
            আইডি বা নম্বর <span className="text-amber-400 font-mono font-bold">"{userIdOrCode}"</span> এর কোনো রেকর্ড পাওয়া যায়নি।
          </p>
          <button
            onClick={onClose}
            className="w-full py-2.5 rounded-xl bg-[#1f2c42] hover:bg-[#283854] text-white text-xs font-bold transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    );
  }

  const { user, deposits, withdrawals, bets, referrals, summary } = historyData;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-xs p-2 sm:p-4 animate-fadeIn">
      <div className="bg-[#0e1422] border border-[#202f48] rounded-3xl max-w-3xl w-full shadow-2xl text-white relative max-h-[92vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="p-4 sm:p-5 border-b border-[#1b263b] flex items-center justify-between bg-gradient-to-r from-[#121b2a] to-[#152033] shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-cyan-500/20 text-cyan-400 border border-cyan-500/30 flex items-center justify-center font-bold">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-base sm:text-lg font-bold text-white leading-tight">
                  {user.displayName}
                </h3>
                <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-xs font-bold border border-amber-500/30">
                  {user.userCode}
                </span>
              </div>
              <p className="text-xs text-slate-400 font-mono mt-0.5">
                মোবাইল: +88 {user.phoneNumber} | জয়েন: {new Date(user.createdAt).toLocaleDateString('bn-BD')}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {onEditAccount && (
              <button
                onClick={() => {
                  soundManager.playClick();
                  onEditAccount(user.userCode);
                }}
                className="px-3 py-1.5 rounded-xl bg-cyan-500/20 hover:bg-cyan-500/30 text-cyan-300 border border-cyan-500/40 text-xs font-bold transition-all flex items-center gap-1 cursor-pointer"
              >
                একাউন্ট এডিট
              </button>
            )}
            <button
              onClick={onClose}
              className="w-8 h-8 rounded-full bg-[#1a2538] hover:bg-[#25354e] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Top Summary Stats Cards */}
        <div className="p-3 sm:p-4 bg-[#0a0f18] border-b border-[#1a2539] grid grid-cols-2 sm:grid-cols-4 gap-2 shrink-0">
          <div className="bg-[#121927] p-2.5 rounded-xl border border-[#1e2a3f]">
            <span className="text-[10px] text-slate-400 block">বর্তমান ব্যালেন্স:</span>
            <span className="text-base font-black font-mono text-cyan-400">
              ৳ {user.balance.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#121927] p-2.5 rounded-xl border border-[#1e2a3f]">
            <span className="text-[10px] text-slate-400 block">উত্তোলনযোগ্য ব্যালেন্স:</span>
            <span className="text-base font-black font-mono text-emerald-400">
              ৳ {user.withdrawableBalance.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#121927] p-2.5 rounded-xl border border-[#1e2a3f]">
            <span className="text-[10px] text-slate-400 block">মোট ডিপোজিট:</span>
            <span className="text-base font-black font-mono text-amber-300">
              ৳ {summary.totalDepositedAmount.toLocaleString()}
            </span>
          </div>

          <div className="bg-[#121927] p-2.5 rounded-xl border border-[#1e2a3f]">
            <span className="text-[10px] text-slate-400 block">মোট উত্তোলন:</span>
            <span className="text-base font-black font-mono text-purple-400">
              ৳ {summary.totalWithdrawnAmount.toLocaleString()}
            </span>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-3 sm:px-4 pt-2 border-b border-[#1b263b] flex items-center gap-1.5 shrink-0 bg-[#0e1422] overflow-x-auto">
          <button
            onClick={() => setActiveTab('overview')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'overview'
                ? 'bg-[#1e2b40] text-white border-b-2 border-cyan-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <UserIcon className="w-3.5 h-3.5 text-cyan-400" />
            <span>ওভারভিউ</span>
          </button>

          <button
            onClick={() => setActiveTab('deposits')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'deposits'
                ? 'bg-[#1e2b40] text-white border-b-2 border-emerald-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowUpRight className="w-3.5 h-3.5 text-emerald-400" />
            <span>ডিপোজিট ({deposits.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('withdrawals')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'withdrawals'
                ? 'bg-[#1e2b40] text-white border-b-2 border-rose-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <ArrowDownLeft className="w-3.5 h-3.5 text-rose-400" />
            <span>উত্তোলন ({withdrawals.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('bets')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'bets'
                ? 'bg-[#1e2b40] text-white border-b-2 border-amber-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gamepad2 className="w-3.5 h-3.5 text-amber-400" />
            <span>গেম ও বেট ({bets.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('referrals')}
            className={`py-2 px-3 rounded-xl font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              activeTab === 'referrals'
                ? 'bg-[#1e2b40] text-white border-b-2 border-purple-400 shadow-sm'
                : 'text-slate-400 hover:text-white'
            }`}
          >
            <Gift className="w-3.5 h-3.5 text-purple-400" />
            <span>রেফারেল ({referrals.length})</span>
          </button>
        </div>

        {/* Content Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {/* TAB 1: OVERVIEW */}
          {activeTab === 'overview' && (
            <div className="space-y-4 text-xs">
              {/* Account Credentials Card */}
              <div className="bg-[#0b1019] border border-[#1e2a3f] rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-400" />
                  <span>অ্যাকাউন্ট ও লগইন তথ্য</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div className="bg-[#080d16] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">ইউজার আইডি (User ID):</span>
                      <span className="font-mono font-bold text-amber-300 text-sm">{user.userCode}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(user.userCode)}
                      className="p-1 rounded bg-[#172030] text-slate-300 hover:text-white"
                      title="আইডি কপি"
                    >
                      {copiedText === user.userCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="bg-[#080d16] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">মোবাইল নম্বর:</span>
                      <span className="font-mono font-bold text-white text-sm">{user.phoneNumber}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(user.phoneNumber)}
                      className="p-1 rounded bg-[#172030] text-slate-300 hover:text-white"
                      title="নম্বর কপি"
                    >
                      {copiedText === user.phoneNumber ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>

                  <div className="bg-[#080d16] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">পাসওয়ার্ড / গোপন পিন:</span>
                      <span className="font-mono font-bold text-rose-300 text-sm">{user.password || '••••••'}</span>
                    </div>
                    {user.password && (
                      <button
                        onClick={() => handleCopy(user.password || '')}
                        className="p-1 rounded bg-[#172030] text-slate-300 hover:text-white"
                        title="পাসওয়ার্ড কপি"
                      >
                        {copiedText === user.password ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      </button>
                    )}
                  </div>

                  <div className="bg-[#080d16] p-2.5 rounded-xl border border-white/5 flex items-center justify-between">
                    <div>
                      <span className="text-[10px] text-slate-400 block">রেফারেল কোড:</span>
                      <span className="font-mono font-bold text-cyan-300 text-sm">{user.referralCode}</span>
                    </div>
                    <button
                      onClick={() => handleCopy(user.referralCode)}
                      className="p-1 rounded bg-[#172030] text-slate-300 hover:text-white"
                      title="রেফারেল কোড কপি"
                    >
                      {copiedText === user.referralCode ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                  </div>
                </div>
              </div>

              {/* Balance Breakdown & Rules */}
              <div className="bg-[#0b1019] border border-[#1e2a3f] rounded-2xl p-4 space-y-3">
                <h4 className="font-bold text-sm text-white flex items-center gap-2 border-b border-white/5 pb-2">
                  <Coins className="w-4 h-4 text-cyan-400" />
                  <span>ব্যালেন্স ও আর্থিক পরিসংখ্যান</span>
                </h4>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2.5">
                  <div className="bg-[#080d16] p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block">মোট ব্যালেন্স:</span>
                    <span className="font-mono font-bold text-cyan-400 text-sm">৳ {user.balance.toLocaleString()}</span>
                  </div>

                  <div className="bg-[#080d16] p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block">প্লে ব্যালেন্স (ক্যাশ-ইন + বোনাস):</span>
                    <span className="font-mono font-bold text-amber-300 text-sm">৳ {user.lockedPrincipal.toLocaleString()}</span>
                  </div>

                  <div className="bg-[#080d16] p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block">উত্তোলনযোগ্য লাভ:</span>
                    <span className="font-mono font-bold text-emerald-400 text-sm">৳ {user.withdrawableBalance.toLocaleString()}</span>
                  </div>

                  <div className="bg-[#080d16] p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block">স্বাগতম বোনাস:</span>
                    <span className="font-mono font-bold text-slate-300 text-sm">৳ {user.initialBonus || 100}</span>
                  </div>

                  <div className="bg-[#080d16] p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block">রেফারেল কমিশন আয়:</span>
                    <span className="font-mono font-bold text-purple-400 text-sm">৳ {user.referralBonusEarned}</span>
                  </div>

                  <div className="bg-[#080d16] p-2.5 rounded-xl border border-white/5">
                    <span className="text-[10px] text-slate-400 block">গেম নেট প্রফিট:</span>
                    <span className={`font-mono font-bold text-sm ${summary.netGameProfit >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {summary.netGameProfit >= 0 ? `+৳ ${summary.netGameProfit.toLocaleString()}` : `-৳ ${Math.abs(summary.netGameProfit).toLocaleString()}`}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: DEPOSITS */}
          {activeTab === 'deposits' && (
            <div className="space-y-2.5">
              {deposits.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-[#090d15] rounded-2xl border border-white/5">
                  কোনো ডিপোজিট রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                deposits.map((d) => (
                  <div
                    key={d.id}
                    className="p-3 bg-[#0b1019] border border-[#1d273a] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black uppercase text-amber-300 font-mono">{d.method}</span>
                        <span className="font-mono font-bold text-white text-sm">৳ {d.amount.toLocaleString()}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            d.status === 'approved'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : d.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {d.status === 'approved' ? 'অনুমোদিত' : d.status === 'pending' ? 'অপেক্ষমান' : 'বাতিল'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        প্রেরক: {d.senderNumber} | TrxID: <span className="text-amber-300 select-all font-bold">{d.trxId}</span>
                      </p>
                    </div>

                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      {new Date(d.createdAt).toLocaleString('bn-BD', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 3: WITHDRAWALS */}
          {activeTab === 'withdrawals' && (
            <div className="space-y-2.5">
              {withdrawals.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-[#090d15] rounded-2xl border border-white/5">
                  কোনো উত্তোলন রেকর্ড পাওয়া যায়নি।
                </div>
              ) : (
                withdrawals.map((w) => (
                  <div
                    key={w.id}
                    className="p-3 bg-[#0b1019] border border-[#1d273a] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-black uppercase text-rose-400 font-mono">{w.method} Personal</span>
                        <span className="font-mono font-bold text-white text-sm">৳ {w.amount.toLocaleString()}</span>
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            w.status === 'completed'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : w.status === 'pending'
                              ? 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {w.status === 'completed' ? 'টাকা পাঠানো হয়েছে' : w.status === 'pending' ? 'অপেক্ষমান' : 'বাতিল ও রিফান্ড'}
                        </span>
                      </div>
                      <p className="text-[11px] text-slate-400 font-mono mt-1">
                        পার্সোনাল নম্বর: <span className="text-white font-bold select-all">{w.personalNumber}</span>
                      </p>
                      {w.adminNote && <p className="text-[10px] text-emerald-400 mt-0.5">নোট: {w.adminNote}</p>}
                    </div>

                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      {new Date(w.createdAt).toLocaleString('bn-BD', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 4: BETS & GAMES */}
          {activeTab === 'bets' && (
            <div className="space-y-2.5">
              {bets.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-[#090d15] rounded-2xl border border-white/5">
                  কোনো বেট বা খেলার রেকর্ড এখনও নেই।
                </div>
              ) : (
                bets.map((b) => (
                  <div
                    key={b.id}
                    className="p-3 bg-[#0b1019] border border-[#1d273a] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold uppercase text-slate-300">{b.gameType}</span>
                        <span className="font-mono text-slate-400">বেট: ৳{b.stake}</span>
                        {b.multiplier && (
                          <span className="font-mono font-bold text-amber-300">{b.multiplier}x</span>
                        )}
                        <span
                          className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${
                            b.outcome === 'won'
                              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                              : 'bg-rose-500/20 text-rose-400 border border-rose-500/30'
                          }`}
                        >
                          {b.outcome === 'won' ? `জয় (+৳${b.payout})` : 'লস'}
                        </span>
                      </div>
                    </div>

                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      {new Date(b.timestamp).toLocaleString('bn-BD', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}

          {/* TAB 5: REFERRALS */}
          {activeTab === 'referrals' && (
            <div className="space-y-2.5">
              <div className="bg-[#0b1019] p-3 rounded-xl border border-purple-500/30 text-xs text-purple-300 flex items-center justify-between">
                <span>মোট সফল রেফারেল: <strong>{referrals.length} জন</strong></span>
                <span>মোট অর্জিত কমিশন: <strong>৳ {referrals.length * 50}</strong></span>
              </div>

              {referrals.length === 0 ? (
                <div className="p-8 text-center text-slate-500 bg-[#090d15] rounded-2xl border border-white/5 text-xs">
                  এই ইউজারের রেফারেল কোড দিয়ে এখনও কেউ অ্যাকাউন্ট করেনি।
                </div>
              ) : (
                referrals.map((r) => (
                  <div
                    key={r.id}
                    className="p-3 bg-[#0b1019] border border-[#1d273a] rounded-xl flex items-center justify-between text-xs"
                  >
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-amber-300">{r.referredUserCode}</span>
                        <span className="text-slate-400 font-mono">{r.referredPhone}</span>
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 text-[10px] font-bold">
                          +৳ {r.bonusAmount} বোনাস
                        </span>
                      </div>
                    </div>
                    <div className="text-right text-[10px] text-slate-400 font-mono">
                      {new Date(r.createdAt).toLocaleString('bn-BD', { dateStyle: 'short', timeStyle: 'short' })}
                    </div>
                  </div>
                ))
              )}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
