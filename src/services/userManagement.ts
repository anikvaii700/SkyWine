import { doc, getDoc, updateDoc, collection, addDoc, getDocs, query, where } from 'firebase/firestore';
import { db } from './firebase';
import {
  StoredPhoneAccount,
  getStoredPhoneAccounts,
  saveStoredPhoneAccounts,
  adminUpdatePhoneAccount,
  getStoredReferralRecords,
  ReferralRecord,
} from './phoneAuth';
import {
  ManualDepositRequest,
  ManualWithdrawalRequest,
  getStoredDepositRequests,
  getStoredWithdrawalRequests,
} from './manualPayment';

export interface UserBetRecord {
  id: string;
  userId: string;
  userCode?: string;
  gameType: 'aviator' | 'wingo';
  stake: number;
  multiplier: number | null;
  payout: number | null;
  outcome: 'won' | 'lost';
  timestamp: number;
  createdAt: string;
}

const STORAGE_USER_BETS_KEY = 'aviator_all_user_bets_v1';

// Get stored bets from localStorage
export function getStoredUserBets(): UserBetRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_USER_BETS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Record a user bet (both Aviator and Wingo)
export function recordUserBet(bet: {
  userId: string;
  userCode?: string;
  gameType: 'aviator' | 'wingo';
  stake: number;
  multiplier: number | null;
  payout: number | null;
  outcome: 'won' | 'lost';
}): void {
  try {
    const now = new Date().toISOString();
    const newBet: UserBetRecord = {
      id: `bet_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
      userId: bet.userId,
      userCode: bet.userCode,
      gameType: bet.gameType,
      stake: bet.stake,
      multiplier: bet.multiplier,
      payout: bet.payout,
      outcome: bet.outcome,
      timestamp: Date.now(),
      createdAt: now,
    };

    const currentBets = getStoredUserBets();
    const updated = [newBet, ...currentBets.slice(0, 200)];
    localStorage.setItem(STORAGE_USER_BETS_KEY, JSON.stringify(updated));

    // Also attempt to store in Firestore if available
    try {
      if (bet.userId && !bet.userId.startsWith('guest_')) {
        const betCol = collection(db, 'users', bet.userId, 'bets');
        addDoc(betCol, {
          ...newBet,
        }).catch(() => {});
      }
    } catch {}
  } catch (e) {
    console.warn('Failed to record user bet:', e);
  }
}

// Helper: Calculate withdrawable profit balance
// নিয়ম: একাউন্টে সর্বনিম্ন ১০০ টাকা ব্যালেন্স থাকবে (০ করে উইথড্র করা যাবে না) এবং রেফার কমিশন তোলা যায় না
export function calculateWithdrawableBalance(balance: number, lockedPrincipal: number): number {
  const safeBalance = Math.max(0, balance || 0);
  const safeLocked = Math.max(0, lockedPrincipal || 0);
  const minRetained = 100; // ০ করে উইথড্র করা যাবে না, একাউন্টে সর্বনিম্ন ১০০ টাকা ব্যালেন্স থাকতে হবে
  return Math.max(0, Math.round((safeBalance - safeLocked - minRetained) * 100) / 100);
}

// User full profile with all aggregated history for Admin Panel and User History Modal
export interface UserFullHistoryData {
  user: {
    uid: string;
    userCode: string;
    phoneNumber: string;
    displayName: string;
    password?: string;
    balance: number;
    initialBonus: number;
    lockedPrincipal: number;
    withdrawableBalance: number;
    totalDeposited: number;
    referralCode: string;
    referredBy?: string;
    referralCount: number;
    referralBonusEarned: number;
    createdAt: string;
    updatedAt: string;
  };
  deposits: ManualDepositRequest[];
  withdrawals: ManualWithdrawalRequest[];
  bets: UserBetRecord[];
  referrals: ReferralRecord[];
  summary: {
    totalDepositedAmount: number;
    totalWithdrawnAmount: number;
    totalBetsCount: number;
    totalBetsAmount: number;
    totalWonAmount: number;
    netGameProfit: number;
  };
}

// Retrieve complete history of a specific user by User ID, phone, or UID
export function getUserFullHistory(identifier: string): UserFullHistoryData | null {
  const cleanId = identifier.trim().toUpperCase();
  const accounts = getStoredPhoneAccounts();

  let targetAccount: StoredPhoneAccount | null = null;
  for (const key of Object.keys(accounts)) {
    const acc = accounts[key];
    if (
      key === cleanId ||
      acc.phoneNumber === cleanId ||
      acc.uid.toUpperCase() === cleanId ||
      acc.userCode.toUpperCase() === cleanId ||
      (acc.userCode && cleanId.includes(acc.userCode.toUpperCase())) ||
      acc.phoneNumber.includes(cleanId)
    ) {
      targetAccount = acc;
      break;
    }
  }

  if (!targetAccount) {
    return null;
  }

  const userPhone = targetAccount.phoneNumber;
  const userCode = targetAccount.userCode;
  const uid = targetAccount.uid;

  // Filter all deposits
  const allDeposits = getStoredDepositRequests();
  const userDeposits = allDeposits.filter((d) => {
    return (
      d.userId === uid ||
      (d.userCode && d.userCode.toUpperCase() === userCode.toUpperCase()) ||
      d.senderNumber.includes(userPhone) ||
      (d.userIdentifier && d.userIdentifier.includes(userPhone))
    );
  });

  // Filter all withdrawals
  const allWithdrawals = getStoredWithdrawalRequests();
  const userWithdrawals = allWithdrawals.filter((w) => {
    return (
      w.userId === uid ||
      (w.userCode && w.userCode.toUpperCase() === userCode.toUpperCase()) ||
      w.personalNumber.includes(userPhone) ||
      (w.userIdentifier && w.userIdentifier.includes(userPhone))
    );
  });

  // Filter all bets
  const allBets = getStoredUserBets();
  const userBets = allBets.filter((b) => {
    return (
      b.userId === uid ||
      (b.userCode && b.userCode.toUpperCase() === userCode.toUpperCase()) ||
      b.userId.includes(userPhone)
    );
  });

  // Filter all referrals (people who registered using this user's code)
  const allReferrals = getStoredReferralRecords();
  const userReferrals = allReferrals.filter(
    (r) => r.referrerCode.toUpperCase() === userCode.toUpperCase()
  );

  // Compute stats
  const totalDepositedAmount = userDeposits
    .filter((d) => d.status === 'approved')
    .reduce((sum, d) => sum + d.amount, 0);

  const totalWithdrawnAmount = userWithdrawals
    .filter((w) => w.status === 'completed')
    .reduce((sum, w) => sum + w.amount, 0);

  const totalBetsCount = userBets.length;
  const totalBetsAmount = userBets.reduce((sum, b) => sum + (b.stake || 0), 0);
  const totalWonAmount = userBets.reduce((sum, b) => sum + (b.payout || 0), 0);
  const netGameProfit = Math.round((totalWonAmount - totalBetsAmount) * 100) / 100;

  const lockedBonus = targetAccount.referralBonusEarned || 0;
  const withdrawable = calculateWithdrawableBalance(
    targetAccount.balance,
    lockedBonus
  );

  return {
    user: {
      uid: targetAccount.uid,
      userCode: targetAccount.userCode,
      phoneNumber: targetAccount.phoneNumber,
      displayName: targetAccount.displayName,
      password: targetAccount.password,
      balance: targetAccount.balance,
      initialBonus: targetAccount.initialBonus || 100,
      lockedPrincipal: targetAccount.lockedPrincipal,
      withdrawableBalance: withdrawable,
      totalDeposited: targetAccount.totalDeposited || totalDepositedAmount,
      referralCode: targetAccount.referralCode || targetAccount.userCode,
      referredBy: targetAccount.referredBy,
      referralCount: targetAccount.referralCount || userReferrals.length,
      referralBonusEarned: targetAccount.referralBonusEarned || userReferrals.length * 50,
      createdAt: targetAccount.createdAt,
      updatedAt: targetAccount.updatedAt,
    },
    deposits: userDeposits,
    withdrawals: userWithdrawals,
    bets: userBets,
    referrals: userReferrals,
    summary: {
      totalDepositedAmount,
      totalWithdrawnAmount,
      totalBetsCount,
      totalBetsAmount,
      totalWonAmount,
      netGameProfit,
    },
  };
}

// Get all accounts with calculated withdrawable balances and stats for Admin Panel
export function getAllAccountsWithStats(): Array<{
  uid: string;
  userCode: string;
  phoneNumber: string;
  displayName: string;
  password?: string;
  balance: number;
  lockedPrincipal: number;
  withdrawableBalance: number;
  totalDeposited: number;
  referralCode: string;
  referralCount: number;
  referralBonusEarned: number;
  createdAt: string;
  updatedAt: string;
}> {
  const accounts = getStoredPhoneAccounts();
  const referrals = getStoredReferralRecords();

  return Object.values(accounts).map((acc) => {
    const inviteCount =
      acc.referralCount ||
      referrals.filter((r) => r.referrerCode.toUpperCase() === acc.userCode?.toUpperCase()).length;

    const lockedBonus = acc.referralBonusEarned || 0;
    const withdrawable = calculateWithdrawableBalance(acc.balance, lockedBonus);

    return {
      uid: acc.uid,
      userCode: acc.userCode || `USER-${acc.phoneNumber.slice(-5)}`,
      phoneNumber: acc.phoneNumber,
      displayName: acc.displayName,
      password: acc.password,
      balance: acc.balance,
      lockedPrincipal: lockedBonus,
      withdrawableBalance: withdrawable,
      totalDeposited: acc.totalDeposited || 0,
      referralCode: acc.referralCode || acc.userCode,
      referralCount: inviteCount,
      referralBonusEarned: acc.referralBonusEarned || inviteCount * 50,
      createdAt: acc.createdAt,
      updatedAt: acc.updatedAt,
    };
  });
}

// Fetch all registered users from Firestore and merge into local phone accounts cache
export async function syncUsersFromFirestore(): Promise<ReturnType<typeof getAllAccountsWithStats>> {
  try {
    const usersCol = collection(db, 'users');
    const snap = await getDocs(usersCol);
    const remoteAccounts: Record<string, StoredPhoneAccount> = {};
    const local = getStoredPhoneAccounts();

    snap.forEach((d) => {
      const data = d.data();
      const phone =
        data.phoneNumber ||
        (data.email?.endsWith('@aviator.phone') ? data.email.split('@')[0] : '') ||
        (data.userCode ? data.userCode : '');
      const cleanPhone = phone.replace(/[^0-9]/g, '');

      const uid = data.id || data.uid || d.id;
      const key = cleanPhone.length >= 10 ? cleanPhone : uid;

      remoteAccounts[key] = {
        uid,
        userCode: data.userCode || `USER-${key.slice(-5)}`,
        phoneNumber: cleanPhone || data.phoneNumber || key,
        password: data.password || local[key]?.password || '123456',
        displayName: data.displayName || `User ${key}`,
        balance: typeof data.balance === 'number' ? data.balance : 100,
        initialBonus: typeof data.initialBonus === 'number' ? data.initialBonus : 100,
        lockedPrincipal: typeof data.lockedPrincipal === 'number' ? data.lockedPrincipal : 0,
        totalDeposited: typeof data.totalDeposited === 'number' ? data.totalDeposited : 0,
        referralCode: data.referralCode || data.userCode || `USER-${key.slice(-5)}`,
        referredBy: data.referredBy || undefined,
        referralCount: typeof data.referralCount === 'number' ? data.referralCount : 0,
        referralBonusEarned: typeof data.referralBonusEarned === 'number' ? data.referralBonusEarned : 0,
        createdAt: data.createdAt || new Date().toISOString(),
        updatedAt: data.updatedAt || new Date().toISOString(),
      };
    });

    if (Object.keys(remoteAccounts).length > 0) {
      const merged = { ...local, ...remoteAccounts };
      saveStoredPhoneAccounts(merged);
      window.dispatchEvent(new CustomEvent('accounts_updated'));
      return getAllAccountsWithStats();
    }
  } catch (err) {
    console.warn('Could not sync users from Firestore:', err);
  }
  return getAllAccountsWithStats();
}
