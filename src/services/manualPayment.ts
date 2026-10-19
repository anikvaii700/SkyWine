import { db } from './firebase';
import {
  doc,
  getDoc,
  setDoc,
  collection,
  getDocs,
  updateDoc,
  query,
  orderBy,
  limit,
  onSnapshot,
} from 'firebase/firestore';
import { syncPhoneAccountBalance } from './phoneAuth';

export interface PaymentGatewayConfig {
  number: string;
  accountType: 'Personal' | 'Agent' | 'Merchant';
  instructions: string;
  isActive: boolean;
}

export interface SystemPaymentSettings {
  bkash: PaymentGatewayConfig;
  nagad: PaymentGatewayConfig;
  rocket: PaymentGatewayConfig;
  noticeText: string;
  adminPin: string;
  marqueeNotice?: string;
  withdrawalNoticeText?: string;
}

export interface ManualDepositRequest {
  id: string;
  userId: string;
  userCode?: string; // Player's User ID, e.g. "USER-10842"
  userIdentifier: string;
  method: 'bkash' | 'nagad' | 'rocket';
  targetNumber: string;
  senderNumber: string;
  trxId: string;
  amount: number;
  status: 'pending' | 'approved' | 'rejected';
  createdAt: string;
  updatedAt: string;
  rejectionReason?: string;
  adminNote?: string;
}

export interface ManualWithdrawalRequest {
  id: string;
  userId: string;
  userCode?: string; // Player's User ID, e.g. "USER-10842"
  userIdentifier: string;
  method: 'bkash' | 'nagad' | 'rocket';
  personalNumber: string; // শুধুমাত্র পার্সোনাল নম্বর (No agent)
  amount: number;
  status: 'pending' | 'completed' | 'rejected';
  createdAt: string;
  updatedAt: string;
  adminNote?: string;
  rejectionReason?: string;
}

const STORAGE_SETTINGS_KEY = 'aviator_payment_settings_v2';
const STORAGE_REQUESTS_KEY = 'aviator_manual_deposit_requests_v2';
const STORAGE_WITHDRAWAL_REQUESTS_KEY = 'aviator_manual_withdrawal_requests_v2';

export const DEFAULT_PAYMENT_SETTINGS: SystemPaymentSettings = {
  bkash: {
    number: '01712-345678',
    accountType: 'Personal',
    instructions: 'বিকাশ অ্যাপ থেকে "Send Money" করুন।',
    isActive: true,
  },
  nagad: {
    number: '01812-345678',
    accountType: 'Personal',
    instructions: 'নগদ অ্যাপ থেকে "Send Money" করুন।',
    isActive: true,
  },
  rocket: {
    number: '01912-345678',
    accountType: 'Personal',
    instructions: 'রকেট অ্যাপ থেকে "Send Money" করুন।',
    isActive: true,
  },
  noticeText: 'টাকা পাঠানোর পর ট্রানজেকশন আইডি (TrxID) দিয়ে সাবমিট করুন। অ্যাডমিন নিশ্চিত করে ১-৩ মিনিটের মধ্যে ব্যালেন্স অ্যাড করে দিবে।',
  adminPin: '1234',
  marqueeNotice: '🎉 স্বাগতম অ্যাভিয়েটর অফিসিয়াল মোবাইল গেমে! ৳ ৫০০ ডিপোজিট করলেই পাচ্ছেন আকর্ষণীয় বোনাস! বিকাশ, নগদ ও রকেটে ১-৩ মিনিটে দ্রুত পেমেন্ট সম্পন্ন হয়। উপভোগ করুন সেরা ক্র্যাশ গেম ও সেরা জয়! 🚀',
  withdrawalNoticeText: 'উত্তোলন দেওয়ার পর এডমিন ভেরিফাই করে ৫-১৫ মিনিটের মধ্যে টাকা পাঠিয়ে দিবে। শুধুমাত্র পার্সোনাল বিকাশ/নগদ/রকেট নম্বর ব্যবহার করুন।',
};

// Get current payment settings from storage or defaults
export function getStoredPaymentSettings(): SystemPaymentSettings {
  try {
    const raw = localStorage.getItem(STORAGE_SETTINGS_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return {
        ...DEFAULT_PAYMENT_SETTINGS,
        ...parsed,
        bkash: { ...DEFAULT_PAYMENT_SETTINGS.bkash, ...(parsed.bkash || {}) },
        nagad: { ...DEFAULT_PAYMENT_SETTINGS.nagad, ...(parsed.nagad || {}) },
        rocket: { ...DEFAULT_PAYMENT_SETTINGS.rocket, ...(parsed.rocket || {}) },
      };
    }
  } catch (e) {
    console.warn('Failed to parse payment settings from localStorage:', e);
  }
  return DEFAULT_PAYMENT_SETTINGS;
}

// Save payment settings locally and in Firestore
export async function savePaymentSettings(newSettings: SystemPaymentSettings): Promise<void> {
  try {
    localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(newSettings));
    window.dispatchEvent(new CustomEvent('payment_settings_updated', { detail: newSettings }));

    // Sync to Firestore
    try {
      const settingsRef = doc(db, 'system', 'payment_settings');
      await setDoc(settingsRef, {
        ...newSettings,
        updatedAt: new Date().toISOString(),
      });
    } catch (fsErr) {
      console.warn('Could not sync payment settings to Firestore:', fsErr);
    }
  } catch (e) {
    console.error('Error saving payment settings:', e);
    throw e;
  }
}

// Fetch remote settings from Firestore if available
export async function syncPaymentSettingsFromFirestore(): Promise<SystemPaymentSettings> {
  try {
    const settingsRef = doc(db, 'system', 'payment_settings');
    const snap = await getDoc(settingsRef);
    if (snap.exists()) {
      const data = snap.data() as SystemPaymentSettings;
      const merged: SystemPaymentSettings = {
        ...DEFAULT_PAYMENT_SETTINGS,
        ...data,
        bkash: { ...DEFAULT_PAYMENT_SETTINGS.bkash, ...(data.bkash || {}) },
        nagad: { ...DEFAULT_PAYMENT_SETTINGS.nagad, ...(data.nagad || {}) },
        rocket: { ...DEFAULT_PAYMENT_SETTINGS.rocket, ...(data.rocket || {}) },
      };
      localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(merged));
      if (merged.marqueeNotice) {
        localStorage.setItem('aviator_marquee_text', merged.marqueeNotice);
        window.dispatchEvent(new Event('marquee_text_updated'));
      }
      window.dispatchEvent(new CustomEvent('payment_settings_updated', { detail: merged }));
      return merged;
    }
  } catch (e) {
    console.warn('Could not fetch payment settings from Firestore:', e);
  }
  return getStoredPaymentSettings();
}

// Real-time listener for settings (notices, numbers, marquee title)
export function subscribeToPaymentSettings(
  callback: (settings: SystemPaymentSettings) => void
): () => void {
  try {
    const settingsRef = doc(db, 'system', 'payment_settings');
    return onSnapshot(settingsRef, (snap) => {
      if (snap.exists()) {
        const data = snap.data() as SystemPaymentSettings;
        const merged: SystemPaymentSettings = {
          ...DEFAULT_PAYMENT_SETTINGS,
          ...data,
          bkash: { ...DEFAULT_PAYMENT_SETTINGS.bkash, ...(data.bkash || {}) },
          nagad: { ...DEFAULT_PAYMENT_SETTINGS.nagad, ...(data.nagad || {}) },
          rocket: { ...DEFAULT_PAYMENT_SETTINGS.rocket, ...(data.rocket || {}) },
        };
        localStorage.setItem(STORAGE_SETTINGS_KEY, JSON.stringify(merged));
        if (merged.marqueeNotice) {
          localStorage.setItem('aviator_marquee_text', merged.marqueeNotice);
          window.dispatchEvent(new Event('marquee_text_updated'));
        }
        window.dispatchEvent(new CustomEvent('payment_settings_updated', { detail: merged }));
        callback(merged);
      }
    });
  } catch (err) {
    console.warn('subscribeToPaymentSettings error:', err);
    return () => {};
  }
}

// Load all stored deposit requests
export function getStoredDepositRequests(): ManualDepositRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_REQUESTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse deposit requests from localStorage:', e);
  }
  return [];
}

// Save requests list
function saveDepositRequestsToStorage(requests: ManualDepositRequest[]): void {
  try {
    localStorage.setItem(STORAGE_REQUESTS_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent('deposit_requests_updated', { detail: requests }));
  } catch (e) {
    console.warn('Failed to save deposit requests to localStorage:', e);
  }
}

// Submit a new deposit request
export async function submitManualDepositRequest(params: {
  userId: string;
  userCode?: string;
  userIdentifier: string;
  method: 'bkash' | 'nagad' | 'rocket';
  targetNumber: string;
  senderNumber: string;
  trxId: string;
  amount: number;
}): Promise<{ success: boolean; request?: ManualDepositRequest; error?: string }> {
  const { userId, userCode, userIdentifier, method, targetNumber, senderNumber, trxId, amount } = params;

  if (!userId || userId.startsWith('guest') || userId === 'guest') {
    return { success: false, error: 'এড মানি (রিচার্জ) করতে হলে প্রথমে একটি একাউন্ট তৈরি বা লগইন করতে হবে।' };
  }

  if (!amount || amount < 50) {
    return { success: false, error: 'নূন্যতম ডিপোজিটের পরিমাণ ৫০ ৳ হতে হবে।' };
  }

  const cleanSender = senderNumber.replace(/[^0-9]/g, '');
  if (cleanSender.length < 11) {
    return { success: false, error: 'অনুগ্রহ করে সঠিক ১১ ডিজিটের প্রেরক নম্বর লিখুন (যেমন: 017xxxxxxxx)।' };
  }

  const cleanTrx = trxId.trim().toUpperCase();
  if (!cleanTrx || cleanTrx.length < 5) {
    return { success: false, error: 'অনুগ্রহ করে সঠিক ট্রানজেকশন আইডি (TrxID) দিন।' };
  }

  const now = new Date().toISOString();
  const requestId = `dep_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newRequest: ManualDepositRequest = {
    id: requestId,
    userId,
    userCode: userCode || '',
    userIdentifier: userIdentifier || cleanSender,
    method,
    targetNumber,
    senderNumber: cleanSender,
    trxId: cleanTrx,
    amount,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  // Check if identical TrxID is already submitted
  const allRequests = getStoredDepositRequests();
  const duplicate = allRequests.find(
    (r) => r.trxId.toUpperCase() === cleanTrx && r.status !== 'rejected'
  );
  if (duplicate) {
    return {
      success: false,
      error: 'এই ট্রানজেকশন আইডি (TrxID) ইতিমধ্যে জমা দেওয়া হয়েছে। অনুগ্রহ করে নতুন ট্রানজেকশন আইডি ব্যবহার করুন।',
    };
  }

  // Prepend new request
  const updated = [newRequest, ...allRequests];
  saveDepositRequestsToStorage(updated);

  // Sync to Firestore
  try {
    const docRef = doc(db, 'deposit_requests', requestId);
    await setDoc(docRef, newRequest);
  } catch (err) {
    console.warn('Could not sync manual deposit request to Firestore:', err);
  }

  return { success: true, request: newRequest };
}

// Approve deposit request and credit balance to user
// Note: Cash-in amount is added to lockedPrincipal (cannot be directly withdrawn, only profits above it can be withdrawn)
export async function approveManualDepositRequest(
  requestId: string,
  adminNote?: string
): Promise<{ success: boolean; request?: ManualDepositRequest; error?: string }> {
  const requests = getStoredDepositRequests();
  const index = requests.findIndex((r) => r.id === requestId);

  if (index === -1) {
    return { success: false, error: 'রিকোয়েস্টটি পাওয়া যায়নি।' };
  }

  const target = requests[index];
  if (target.status === 'approved') {
    return { success: false, error: 'এই রিকোয়েস্টটি ইতিমধ্যে অনুমোদিত হয়েছে।' };
  }

  const now = new Date().toISOString();
  target.status = 'approved';
  target.updatedAt = now;
  if (adminNote) target.adminNote = adminNote;

  requests[index] = target;
  saveDepositRequestsToStorage(requests);

  // Credit the user's balance and update lockedPrincipal & totalDeposited
  const creditedAmount = target.amount;
  const targetUserId = target.userId;

  // 1. If phone account in localStorage
  try {
    const rawAccounts = localStorage.getItem('aviator_phone_accounts_v1');
    if (rawAccounts) {
      const accounts = JSON.parse(rawAccounts);
      for (const phoneKey of Object.keys(accounts)) {
        if (accounts[phoneKey].uid === targetUserId || accounts[phoneKey].phoneNumber === target.senderNumber) {
          accounts[phoneKey].balance = (accounts[phoneKey].balance || 0) + creditedAmount;
          accounts[phoneKey].totalDeposited = (accounts[phoneKey].totalDeposited || 0) + creditedAmount;
          // Rule: Cash in CAN be cashed out! Only referral commission is locked.
          accounts[phoneKey].lockedPrincipal = accounts[phoneKey].referralBonusEarned || 0;
          accounts[phoneKey].updatedAt = now;
          localStorage.setItem('aviator_phone_accounts_v1', JSON.stringify(accounts));
          break;
        }
      }
    }
  } catch (err) {
    console.warn('Error crediting local phone account:', err);
  }

  // 2. If user exists in Firestore
  try {
    const userRef = doc(db, 'users', targetUserId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const curBalance = snap.data()?.balance || 0;
      const curDeposited = snap.data()?.totalDeposited || 0;
      const refBonus = snap.data()?.referralBonusEarned || 0;
      await updateDoc(userRef, {
        balance: curBalance + creditedAmount,
        totalDeposited: curDeposited + creditedAmount,
        lockedPrincipal: refBonus,
        updatedAt: now,
      });
    }
  } catch (fsErr) {
    console.warn('Could not credit balance in Firestore:', fsErr);
  }

  // 3. Update Firestore deposit_requests record
  try {
    const reqRef = doc(db, 'deposit_requests', requestId);
    await updateDoc(reqRef, {
      status: 'approved',
      updatedAt: now,
      adminNote: adminNote || 'Approved by admin',
    });
  } catch (fsErr) {
    console.warn('Could not update Firestore deposit request status:', fsErr);
  }

  // 4. Dispatch balance credited event for immediate UI update in active session
  window.dispatchEvent(
    new CustomEvent('balance_credited', {
      detail: {
        userId: targetUserId,
        amount: creditedAmount,
        requestId,
      },
    })
  );

  return { success: true, request: target };
}

// Reject deposit request
export async function rejectManualDepositRequest(
  requestId: string,
  reason = 'ভুল বা অসত্য ট্রানজেকশন আইডি'
): Promise<{ success: boolean; request?: ManualDepositRequest; error?: string }> {
  const requests = getStoredDepositRequests();
  const index = requests.findIndex((r) => r.id === requestId);

  if (index === -1) {
    return { success: false, error: 'রিকোয়েস্টটি পাওয়া যায়নি।' };
  }

  const now = new Date().toISOString();
  requests[index].status = 'rejected';
  requests[index].rejectionReason = reason;
  requests[index].updatedAt = now;

  saveDepositRequestsToStorage(requests);

  // Update Firestore record
  try {
    const reqRef = doc(db, 'deposit_requests', requestId);
    await updateDoc(reqRef, {
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: now,
    });
  } catch (fsErr) {
    console.warn('Could not update Firestore rejection status:', fsErr);
  }

  return { success: true, request: requests[index] };
}

// Fetch all requests from Firestore and merge
export async function syncDepositRequestsFromFirestore(): Promise<ManualDepositRequest[]> {
  try {
    const colRef = collection(db, 'deposit_requests');
    const q = query(colRef, limit(100));
    const snap = await getDocs(q);
    const remoteList: ManualDepositRequest[] = [];
    snap.forEach((d) => {
      remoteList.push(d.data() as ManualDepositRequest);
    });

    if (remoteList.length > 0) {
      const local = getStoredDepositRequests();
      // Merge by ID, prefer newer updatedAt
      const map = new Map<string, ManualDepositRequest>();
      local.forEach((r) => map.set(r.id, r));
      remoteList.forEach((r) => {
        const existing = map.get(r.id);
        if (!existing || new Date(r.updatedAt) >= new Date(existing.updatedAt)) {
          map.set(r.id, r);
        }
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      saveDepositRequestsToStorage(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Could not sync deposit requests from Firestore:', err);
  }
  return getStoredDepositRequests();
}

// ======================== WITHDRAWAL FUNCTIONS ========================

// Load all stored withdrawal requests
export function getStoredWithdrawalRequests(): ManualWithdrawalRequest[] {
  try {
    const raw = localStorage.getItem(STORAGE_WITHDRAWAL_REQUESTS_KEY);
    if (raw) {
      return JSON.parse(raw);
    }
  } catch (e) {
    console.warn('Failed to parse withdrawal requests from localStorage:', e);
  }
  return [];
}

// Save withdrawal requests list
function saveWithdrawalRequestsToStorage(requests: ManualWithdrawalRequest[]): void {
  try {
    localStorage.setItem(STORAGE_WITHDRAWAL_REQUESTS_KEY, JSON.stringify(requests));
    window.dispatchEvent(new CustomEvent('withdrawal_requests_updated', { detail: requests }));
  } catch (e) {
    console.warn('Failed to save withdrawal requests to localStorage:', e);
  }
}

// Submit a new manual withdrawal request
export async function submitManualWithdrawalRequest(params: {
  userId: string;
  userCode?: string;
  userIdentifier: string;
  method: 'bkash' | 'nagad' | 'rocket';
  personalNumber: string;
  amount: number;
}): Promise<{ success: boolean; request?: ManualWithdrawalRequest; error?: string }> {
  const { userId, userCode, userIdentifier, method, personalNumber, amount } = params;

  if (!userId || userId.startsWith('guest') || userId === 'guest') {
    return { success: false, error: 'উইথড্র করতে হলে প্রথমে একটি একাউন্ট তৈরি বা লগইন করতে হবে।' };
  }

  if (!amount || amount < 500) {
    return {
      success: false,
      error: 'ক্যাশআউট মিনিমাম ৫০০ টাকা হতে হবে। ক্যাশআউট করার জন্য একাউন্টে নূন্যতম ৫০০ টাকা উত্তোলনযোগ্য লাভ থাকতে হবে।',
    };
  }

  const cleanPersonalNumber = personalNumber.replace(/[^0-9]/g, '');
  if (cleanPersonalNumber.length < 11) {
    return { success: false, error: 'অনুগ্রহ করে সঠিক ১১ ডিজিটের পার্সোনাল নম্বর লিখুন (যেমন: 017xxxxxxxx)।' };
  }

  const now = new Date().toISOString();
  const requestId = `wth_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;

  const newRequest: ManualWithdrawalRequest = {
    id: requestId,
    userId,
    userCode: userCode || '',
    userIdentifier: userIdentifier || cleanPersonalNumber,
    method,
    personalNumber: cleanPersonalNumber,
    amount,
    status: 'pending',
    createdAt: now,
    updatedAt: now,
  };

  const allRequests = getStoredWithdrawalRequests();
  const updated = [newRequest, ...allRequests];
  saveWithdrawalRequestsToStorage(updated);

  // Sync to Firestore
  try {
    const docRef = doc(db, 'withdrawal_requests', requestId);
    await setDoc(docRef, newRequest);
  } catch (err) {
    console.warn('Could not sync manual withdrawal request to Firestore:', err);
  }

  return { success: true, request: newRequest };
}

// Complete withdrawal request: Admin has verified and sent money to user's personal number
export async function completeManualWithdrawalRequest(
  requestId: string,
  adminNote?: string
): Promise<{ success: boolean; request?: ManualWithdrawalRequest; error?: string }> {
  const requests = getStoredWithdrawalRequests();
  const index = requests.findIndex((r) => r.id === requestId);

  if (index === -1) {
    return { success: false, error: 'উত্তোলন রিকোয়েস্টটি পাওয়া যায়নি।' };
  }

  const target = requests[index];
  if (target.status === 'completed') {
    return { success: false, error: 'এই রিকোয়েস্টটি ইতিমধ্যে সম্পন্ন হয়েছে।' };
  }

  const now = new Date().toISOString();
  target.status = 'completed';
  target.updatedAt = now;
  if (adminNote) target.adminNote = adminNote;

  requests[index] = target;
  saveWithdrawalRequestsToStorage(requests);

  // Sync to Firestore
  try {
    const docRef = doc(db, 'withdrawal_requests', requestId);
    await updateDoc(docRef, {
      status: 'completed',
      updatedAt: now,
      adminNote: adminNote || 'টাকা সফলভাবে পাঠানো হয়েছে (Completed by admin)',
    });
  } catch (fsErr) {
    console.warn('Could not update Firestore withdrawal status:', fsErr);
  }

  return { success: true, request: target };
}

// Reject withdrawal request: Admin rejects and automatically refunds the deducted balance back to user
export async function rejectManualWithdrawalRequest(
  requestId: string,
  reason = 'ভুল তথ্য বা একাউন্ট সংক্রান্ত সমস্যা'
): Promise<{ success: boolean; request?: ManualWithdrawalRequest; error?: string }> {
  const requests = getStoredWithdrawalRequests();
  const index = requests.findIndex((r) => r.id === requestId);

  if (index === -1) {
    return { success: false, error: 'উত্তোলন রিকোয়েস্টটি পাওয়া যায়নি।' };
  }

  const target = requests[index];
  if (target.status === 'rejected') {
    return { success: false, error: 'এই রিকোয়েস্টটি ইতিমধ্যে বাতিল করা হয়েছে।' };
  }

  const now = new Date().toISOString();
  target.status = 'rejected';
  target.rejectionReason = reason;
  target.updatedAt = now;

  requests[index] = target;
  saveWithdrawalRequestsToStorage(requests);

  // REFUND THE USER BALANCE!
  const refundedAmount = target.amount;
  const targetUserId = target.userId;

  // 1. Phone account in localStorage
  try {
    const rawAccounts = localStorage.getItem('aviator_phone_accounts_v1');
    if (rawAccounts) {
      const accounts = JSON.parse(rawAccounts);
      for (const phoneKey of Object.keys(accounts)) {
        if (accounts[phoneKey].uid === targetUserId || accounts[phoneKey].phoneNumber === target.personalNumber) {
          accounts[phoneKey].balance = (accounts[phoneKey].balance || 0) + refundedAmount;
          accounts[phoneKey].updatedAt = now;
          localStorage.setItem('aviator_phone_accounts_v1', JSON.stringify(accounts));
          break;
        }
      }
    }
  } catch (err) {
    console.warn('Error refunding local phone account balance:', err);
  }

  // 2. Firestore user doc
  try {
    const userRef = doc(db, 'users', targetUserId);
    const snap = await getDoc(userRef);
    if (snap.exists()) {
      const curBalance = snap.data()?.balance || 0;
      await updateDoc(userRef, {
        balance: curBalance + refundedAmount,
        updatedAt: now,
      });
    }
  } catch (fsErr) {
    console.warn('Could not refund balance in Firestore:', fsErr);
  }

  // 3. Update Firestore record
  try {
    const docRef = doc(db, 'withdrawal_requests', requestId);
    await updateDoc(docRef, {
      status: 'rejected',
      rejectionReason: reason,
      updatedAt: now,
    });
  } catch (fsErr) {
    console.warn('Could not update Firestore rejection status:', fsErr);
  }

  // 4. Dispatch balance credited / refunded event for active session
  window.dispatchEvent(
    new CustomEvent('balance_credited', {
      detail: {
        userId: targetUserId,
        amount: refundedAmount,
        requestId,
      },
    })
  );

  return { success: true, request: target };
}

// Fetch all withdrawal requests from Firestore and merge
export async function syncWithdrawalRequestsFromFirestore(): Promise<ManualWithdrawalRequest[]> {
  try {
    const colRef = collection(db, 'withdrawal_requests');
    const q = query(colRef, limit(100));
    const snap = await getDocs(q);
    const remoteList: ManualWithdrawalRequest[] = [];
    snap.forEach((d) => {
      remoteList.push(d.data() as ManualWithdrawalRequest);
    });

    if (remoteList.length > 0) {
      const local = getStoredWithdrawalRequests();
      const map = new Map<string, ManualWithdrawalRequest>();
      local.forEach((r) => map.set(r.id, r));
      remoteList.forEach((r) => {
        const existing = map.get(r.id);
        if (!existing || new Date(r.updatedAt) >= new Date(existing.updatedAt)) {
          map.set(r.id, r);
        }
      });

      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
      saveWithdrawalRequestsToStorage(merged);
      return merged;
    }
  } catch (err) {
    console.warn('Could not sync withdrawal requests from Firestore:', err);
  }
  return getStoredWithdrawalRequests();
}

// Real-time Firestore listener for all online deposit requests
export function listenToDepositRequests(
  callback: (requests: ManualDepositRequest[]) => void
): () => void {
  try {
    const colRef = collection(db, 'deposit_requests');
    const q = query(colRef, limit(200));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remoteList: ManualDepositRequest[] = [];
        snapshot.forEach((d) => {
          remoteList.push(d.data() as ManualDepositRequest);
        });
        if (remoteList.length > 0) {
          const sorted = remoteList.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          saveDepositRequestsToStorage(sorted);
          callback(sorted);
        }
      },
      (error) => {
        console.warn('Realtime deposit requests listener error:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not set up deposit requests listener:', err);
    return () => {};
  }
}

// Real-time Firestore listener for all online withdrawal requests
export function listenToWithdrawalRequests(
  callback: (requests: ManualWithdrawalRequest[]) => void
): () => void {
  try {
    const colRef = collection(db, 'withdrawal_requests');
    const q = query(colRef, limit(200));
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const remoteList: ManualWithdrawalRequest[] = [];
        snapshot.forEach((d) => {
          remoteList.push(d.data() as ManualWithdrawalRequest);
        });
        if (remoteList.length > 0) {
          const sorted = remoteList.sort(
            (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
          );
          saveWithdrawalRequestsToStorage(sorted);
          callback(sorted);
        }
      },
      (error) => {
        console.warn('Realtime withdrawal requests listener error:', error);
      }
    );
    return unsubscribe;
  } catch (err) {
    console.warn('Could not set up withdrawal requests listener:', err);
    return () => {};
  }
}

