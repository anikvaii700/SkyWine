import { UserWalletProfile, db } from './firebase';
import { doc, setDoc, updateDoc, getDoc } from 'firebase/firestore';

export interface AppUser {
  uid: string;
  userCode?: string;
  referralCode?: string;
  displayName: string | null;
  email: string | null;
  phoneNumber: string | null;
  photoURL: string | null;
  provider: 'google' | 'phone';
}

export interface StoredPhoneAccount {
  uid: string;
  userCode: string; // Unique permanent ID, e.g. "USER-10842"
  phoneNumber: string; // Normalized 11 digits: e.g. 01712345678
  password: string;
  displayName: string;
  balance: number; // Starts at ৳ 100
  initialBonus: number; // ৳ 100 welcome bonus
  lockedPrincipal: number; // ৳ 100 + deposits + referral bonuses (cannot be withdrawn)
  totalDeposited: number;
  referralCode: string; // User's referral code (same as userCode)
  referredBy?: string; // Referrer's userCode
  referralCount: number; // Total friends invited
  referralBonusEarned: number; // ৳ 50 * referralCount
  createdAt: string;
  updatedAt: string;
}

export interface ReferralRecord {
  id: string;
  referrerCode: string;
  referredUserCode: string;
  referredPhone: string;
  bonusAmount: number;
  createdAt: string;
}

const STORAGE_ACCOUNTS_KEY = 'aviator_phone_accounts_v1';
const STORAGE_SESSION_KEY = 'aviator_active_phone_session_v1';
const STORAGE_REFERRALS_KEY = 'aviator_referrals_records_v1';

// Format and normalize phone numbers for auth and display
export function normalizePhoneNumber(phone: string): { cleanPhone: string; displayPhone: string } {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('880')) {
    clean = '0' + clean.slice(3);
  } else if (clean.startsWith('88') && clean.length > 11) {
    clean = clean.slice(2);
  }
  const displayPhone = clean.length === 11
    ? `${clean.slice(0, 5)}-${clean.slice(5)}`
    : clean;
  return { cleanPhone: clean, displayPhone };
}

// Generate unique 5-digit User ID code, e.g. "USER-10842"
export function generateUniqueUserCode(existingAccounts: Record<string, StoredPhoneAccount>): string {
  const existingCodes = new Set(Object.values(existingAccounts).map((a) => a.userCode?.toUpperCase()));
  for (let i = 0; i < 500; i++) {
    const randomNum = Math.floor(10000 + Math.random() * 90000);
    const candidate = `USER-${randomNum}`;
    if (!existingCodes.has(candidate)) {
      return candidate;
    }
  }
  return `USER-${Date.now().toString().slice(-5)}`;
}

// Get all stored referral records
export function getStoredReferralRecords(): ReferralRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_REFERRALS_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
}

// Save referral record
export function saveReferralRecord(record: ReferralRecord): void {
  try {
    const current = getStoredReferralRecords();
    localStorage.setItem(STORAGE_REFERRALS_KEY, JSON.stringify([record, ...current]));
  } catch (e) {
    console.warn('Failed to save referral record:', e);
  }
}

// Load all saved phone accounts with auto-migration for userCode & locked balance
export function getStoredPhoneAccounts(): Record<string, StoredPhoneAccount> {
  try {
    const raw = localStorage.getItem(STORAGE_ACCOUNTS_KEY);
    if (!raw) return {};
    const accounts: Record<string, StoredPhoneAccount> = JSON.parse(raw);
    let hasChanges = false;

    // Migrate any legacy accounts without userCode or lockedPrincipal
    for (const key of Object.keys(accounts)) {
      const acc = accounts[key];
      if (!acc.userCode) {
        acc.userCode = `USER-${acc.phoneNumber ? acc.phoneNumber.slice(-5) : Math.floor(10000 + Math.random() * 90000)}`;
        hasChanges = true;
      }
      if (!acc.referralCode) {
        acc.referralCode = acc.userCode;
        hasChanges = true;
      }
      if (acc.initialBonus === undefined) {
        acc.initialBonus = 100;
        hasChanges = true;
      }
      if (acc.referralBonusEarned === undefined) {
        acc.referralBonusEarned = 0;
        hasChanges = true;
      }
      // Rule: Only referral commission cannot be withdrawn. Cash-in and earnings CAN be cashed out!
      if (acc.lockedPrincipal !== (acc.referralBonusEarned || 0)) {
        acc.lockedPrincipal = acc.referralBonusEarned || 0;
        hasChanges = true;
      }
      if (acc.totalDeposited === undefined) {
        acc.totalDeposited = 0;
        hasChanges = true;
      }
      if (acc.referralCount === undefined) {
        acc.referralCount = 0;
        hasChanges = true;
      }
    }

    if (hasChanges) {
      saveStoredPhoneAccounts(accounts);
    }
    return accounts;
  } catch {
    return {};
  }
}

// Save accounts map
export function saveStoredPhoneAccounts(accounts: Record<string, StoredPhoneAccount>): void {
  try {
    localStorage.setItem(STORAGE_ACCOUNTS_KEY, JSON.stringify(accounts));
  } catch (e) {
    console.warn('Failed to save phone accounts to localStorage:', e);
  }
}

// Register a new mobile number account
// Starts with ৳ 100 welcome bonus balance!
// Supports referral code: referrer gets ৳ 50 bonus commission!
export async function registerPhoneAccount(
  rawPhone: string,
  pass: string,
  fullName?: string,
  referralCodeInput?: string
): Promise<{ success: boolean; user?: AppUser; profile?: UserWalletProfile; error?: string; referralBonusApplied?: boolean }> {
  const { cleanPhone, displayPhone } = normalizePhoneNumber(rawPhone);

  if (cleanPhone.length !== 11 || !cleanPhone.startsWith('01')) {
    return {
      success: false,
      error: 'অনুগ্রহ করে সঠিক ১১ ডিজিটের বাংলাদেশী মোবাইল নাম্বার দিন (যেমন: 01712345678)',
    };
  }

  if (!pass || pass.length < 6) {
    return {
      success: false,
      error: 'পাসওয়ার্ড বা গোপন পিন কমপক্ষে ৬ ডিজিটের হতে হবে',
    };
  }

  const accounts = getStoredPhoneAccounts();
  const uid = `phone_${cleanPhone}`;

  if (accounts[cleanPhone]) {
    return {
      success: false,
      error: 'এই মোবাইল নাম্বার দিয়ে ইতোমধ্যে অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে লগইন করুন।',
    };
  }

  // Also check Firestore to ensure no account exists on cloud
  try {
    const remoteDoc = await getDoc(doc(db, 'users', uid));
    if (remoteDoc.exists()) {
      return {
        success: false,
        error: 'এই মোবাইল নাম্বার দিয়ে ইতোমধ্যে অ্যাকাউন্ট রয়েছে। অনুগ্রহ করে লগইন করুন।',
      };
    }
  } catch (checkErr) {
    console.warn('Could not check remote user existence:', checkErr);
  }

  const now = new Date().toISOString();
  const displayName = fullName?.trim() || `User ${displayPhone}`;
  const userCode = generateUniqueUserCode(accounts);

  // New account receives ৳ 100 starting balance
  const initialWelcomeBalance = 100;

  // Check and process referral code if provided
  let referralBonusApplied = false;
  let referrerCode: string | undefined = undefined;

  if (referralCodeInput && referralCodeInput.trim()) {
    const cleanRefInput = referralCodeInput.trim().toUpperCase();
    // Look for matching referrer
    for (const phoneKey of Object.keys(accounts)) {
      const existing = accounts[phoneKey];
      if (
        existing.phoneNumber !== cleanPhone &&
        (existing.userCode.toUpperCase() === cleanRefInput ||
          existing.referralCode.toUpperCase() === cleanRefInput ||
          existing.phoneNumber === cleanRefInput ||
          cleanRefInput.endsWith(existing.phoneNumber.slice(-5)))
      ) {
        referrerCode = existing.userCode;
        // Credit ৳ 50 bonus commission to referrer!
        // Referrer can play with this ৳ 50, but cannot cash it out directly
        existing.balance = (existing.balance || 0) + 50;
        existing.lockedPrincipal = (existing.lockedPrincipal || 0) + 50;
        existing.referralCount = (existing.referralCount || 0) + 1;
        existing.referralBonusEarned = (existing.referralBonusEarned || 0) + 50;
        existing.updatedAt = now;

        // Save referral record
        saveReferralRecord({
          id: `ref_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
          referrerCode: existing.userCode,
          referredUserCode: userCode,
          referredPhone: cleanPhone,
          bonusAmount: 50,
          createdAt: now,
        });

        // Also update referrer in Firestore
        try {
          updateDoc(doc(db, 'users', existing.uid), {
            balance: existing.balance,
            lockedPrincipal: existing.lockedPrincipal,
            referralCount: existing.referralCount,
            referralBonusEarned: existing.referralBonusEarned,
            updatedAt: now,
          }).catch(() => {});
        } catch {}

        referralBonusApplied = true;
        break;
      }
    }
  }

  const newAccount: StoredPhoneAccount = {
    uid,
    userCode,
    phoneNumber: cleanPhone,
    password: pass,
    displayName,
    balance: initialWelcomeBalance, // ৳ 100 starting balance
    initialBonus: initialWelcomeBalance,
    lockedPrincipal: 0,
    totalDeposited: 0,
    referralCode: userCode,
    referredBy: referrerCode,
    referralCount: 0,
    referralBonusEarned: 0,
    createdAt: now,
    updatedAt: now,
  };

  accounts[cleanPhone] = newAccount;
  saveStoredPhoneAccounts(accounts);

  // Sync account to Firestore users collection for online cloud access
  try {
    const userDocRef = doc(db, 'users', uid);
    await setDoc(userDocRef, {
      id: uid,
      uid,
      userCode,
      phoneNumber: cleanPhone,
      password: pass,
      displayName,
      balance: initialWelcomeBalance,
      initialBonus: initialWelcomeBalance,
      lockedPrincipal: 0,
      totalDeposited: 0,
      referralCode: userCode,
      referredBy: referrerCode || '',
      referralCount: 0,
      referralBonusEarned: 0,
      provider: 'phone',
      createdAt: now,
      updatedAt: now,
    });
  } catch (fsErr) {
    console.warn('Failed to dispatch Firestore account save:', fsErr);
  }

  // Set active session
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, cleanPhone);
  } catch {}

  const user: AppUser = {
    uid,
    userCode,
    displayName,
    email: `${cleanPhone}@aviator.phone`,
    phoneNumber: cleanPhone,
    photoURL: null,
    provider: 'phone',
  };

  const profile: UserWalletProfile = {
    id: uid,
    userCode,
    displayName,
    email: '',
    phoneNumber: cleanPhone,
    balance: initialWelcomeBalance,
    initialBonus: initialWelcomeBalance,
    lockedPrincipal: 0,
    totalDeposited: 0,
    referralCode: userCode,
    referredBy: referrerCode,
    referralCount: 0,
    referralBonusEarned: 0,
    createdAt: now,
    updatedAt: now,
  };

  return { success: true, user, profile, referralBonusApplied };
}

// Login with mobile number and password/PIN (Supports Firestore cloud check)
export async function loginPhoneAccount(
  rawPhone: string,
  pass: string
): Promise<{ success: boolean; user?: AppUser; profile?: UserWalletProfile; error?: string }> {
  const { cleanPhone } = normalizePhoneNumber(rawPhone);
  const accounts = getStoredPhoneAccounts();
  let account = accounts[cleanPhone];
  const uid = `phone_${cleanPhone}`;

  // If account not found in local storage or to fetch latest online data, check Firestore
  if (!account) {
    try {
      const snap = await getDoc(doc(db, 'users', uid));
      if (snap.exists()) {
        const d = snap.data();
        if (d && d.password) {
          account = {
            uid,
            userCode: d.userCode || `USER-${cleanPhone.slice(-5)}`,
            phoneNumber: d.phoneNumber || cleanPhone,
            password: d.password,
            displayName: d.displayName || `User ${cleanPhone}`,
            balance: typeof d.balance === 'number' ? d.balance : 100,
            initialBonus: typeof d.initialBonus === 'number' ? d.initialBonus : 100,
            lockedPrincipal: typeof d.lockedPrincipal === 'number' ? d.lockedPrincipal : 0,
            totalDeposited: typeof d.totalDeposited === 'number' ? d.totalDeposited : 0,
            referralCode: d.referralCode || d.userCode || `USER-${cleanPhone.slice(-5)}`,
            referredBy: d.referredBy || undefined,
            referralCount: d.referralCount || 0,
            referralBonusEarned: d.referralBonusEarned || 0,
            createdAt: d.createdAt || new Date().toISOString(),
            updatedAt: d.updatedAt || new Date().toISOString(),
          };
          accounts[cleanPhone] = account;
          saveStoredPhoneAccounts(accounts);
        }
      }
    } catch (fsErr) {
      console.warn('Could not check Firestore user for login:', fsErr);
    }
  }

  if (!account) {
    return {
      success: false,
      error: 'এই মোবাইল নাম্বারে কোনো অ্যাকাউন্ট পাওয়া যায়নি। অনুগ্রহ করে সাইনআপ করুন।',
    };
  }

  if (account.password !== pass) {
    return {
      success: false,
      error: 'ভুল পাসওয়ার্ড বা পিন! অনুগ্রহ করে পুনরায় চেষ্টা করুন।',
    };
  }

  // Fetch latest balance from Firestore if online
  try {
    const snap = await getDoc(doc(db, 'users', account.uid));
    if (snap.exists()) {
      const d = snap.data();
      if (d && typeof d.balance === 'number') {
        account.balance = d.balance;
        if (typeof d.lockedPrincipal === 'number') account.lockedPrincipal = d.lockedPrincipal;
        if (typeof d.totalDeposited === 'number') account.totalDeposited = d.totalDeposited;
        accounts[cleanPhone] = account;
        saveStoredPhoneAccounts(accounts);
      }
    }
  } catch {}

  // Set active session
  try {
    localStorage.setItem(STORAGE_SESSION_KEY, cleanPhone);
  } catch {}

  const user: AppUser = {
    uid: account.uid,
    userCode: account.userCode,
    displayName: account.displayName,
    email: `${account.phoneNumber}@aviator.phone`,
    phoneNumber: account.phoneNumber,
    photoURL: null,
    provider: 'phone',
  };

  const profile: UserWalletProfile = {
    id: account.uid,
    userCode: account.userCode,
    displayName: account.displayName,
    email: '',
    phoneNumber: account.phoneNumber,
    balance: account.balance,
    initialBonus: account.initialBonus || 100,
    lockedPrincipal: account.lockedPrincipal !== undefined ? account.lockedPrincipal : account.balance,
    totalDeposited: account.totalDeposited || 0,
    referralCode: account.referralCode || account.userCode,
    referredBy: account.referredBy,
    referralCount: account.referralCount || 0,
    referralBonusEarned: account.referralBonusEarned || 0,
    createdAt: account.createdAt,
    updatedAt: account.updatedAt,
  };

  return { success: true, user, profile };
}

// Get currently active phone session on app load
export function getActivePhoneSession(): { user: AppUser; profile: UserWalletProfile } | null {
  try {
    const activePhone = localStorage.getItem(STORAGE_SESSION_KEY);
    if (!activePhone) return null;
    const accounts = getStoredPhoneAccounts();
    const account = accounts[activePhone];
    if (!account) return null;

    return {
      user: {
        uid: account.uid,
        userCode: account.userCode,
        displayName: account.displayName,
        email: `${account.phoneNumber}@aviator.phone`,
        phoneNumber: account.phoneNumber,
        photoURL: null,
        provider: 'phone',
      },
      profile: {
        id: account.uid,
        userCode: account.userCode,
        displayName: account.displayName,
        email: '',
        phoneNumber: account.phoneNumber,
        balance: account.balance,
        initialBonus: account.initialBonus || 100,
        lockedPrincipal: account.lockedPrincipal !== undefined ? account.lockedPrincipal : account.balance,
        totalDeposited: account.totalDeposited || 0,
        referralCode: account.referralCode || account.userCode,
        referredBy: account.referredBy,
        referralCount: account.referralCount || 0,
        referralBonusEarned: account.referralBonusEarned || 0,
        createdAt: account.createdAt,
        updatedAt: account.updatedAt,
      },
    };
  } catch {
    return null;
  }
}

// Logout phone user
export function logoutPhoneSession(): void {
  try {
    localStorage.removeItem(STORAGE_SESSION_KEY);
  } catch {}
}

// Sync phone account balance to local storage and Firestore
export function syncPhoneAccountBalance(uid: string, balance: number): void {
  const rounded = Math.max(0, Math.round(balance * 100) / 100);
  const accounts = getStoredPhoneAccounts();
  for (const key of Object.keys(accounts)) {
    if (accounts[key].uid === uid) {
      accounts[key].balance = rounded;
      accounts[key].updatedAt = new Date().toISOString();
      saveStoredPhoneAccounts(accounts);
      break;
    }
  }

  // Update in Firestore
  try {
    const userRef = doc(db, 'users', uid);
    updateDoc(userRef, {
      balance: rounded,
      updatedAt: new Date().toISOString(),
    }).catch((err) => console.warn('Could not sync phone balance to Firestore:', err));
  } catch (fsErr) {
    console.warn('Error initiating Firestore balance sync:', fsErr);
  }
}

// Update phone balance in local storage when Firestore sends a snapshot
export function updatePhoneAccountBalanceLocally(phoneOrUid: string, balance: number): void {
  const rounded = Math.max(0, Math.round(balance * 100) / 100);
  const accounts = getStoredPhoneAccounts();
  let updated = false;
  for (const key of Object.keys(accounts)) {
    if (accounts[key].uid === phoneOrUid || accounts[key].phoneNumber === phoneOrUid) {
      accounts[key].balance = rounded;
      accounts[key].updatedAt = new Date().toISOString();
      updated = true;
      break;
    }
  }
  if (updated) {
    saveStoredPhoneAccounts(accounts);
  }
}

// Update phone user profile name
export function updatePhoneAccountName(uid: string, newName: string): void {
  const accounts = getStoredPhoneAccounts();
  for (const key of Object.keys(accounts)) {
    if (accounts[key].uid === uid) {
      accounts[key].displayName = newName;
      accounts[key].updatedAt = new Date().toISOString();
      saveStoredPhoneAccounts(accounts);
      break;
    }
  }
}

// Admin: Update user credentials, reset ID or password
export function adminUpdatePhoneAccount(
  identifier: string, // phone, uid, or userCode
  updates: Partial<StoredPhoneAccount>
): { success: boolean; account?: StoredPhoneAccount; error?: string } {
  const accounts = getStoredPhoneAccounts();
  const cleanId = identifier.trim();

  let targetKey: string | null = null;
  for (const key of Object.keys(accounts)) {
    const acc = accounts[key];
    if (
      key === cleanId ||
      acc.phoneNumber === cleanId ||
      acc.uid === cleanId ||
      acc.userCode?.toUpperCase() === cleanId.toUpperCase()
    ) {
      targetKey = key;
      break;
    }
  }

  if (!targetKey) {
    return { success: false, error: 'ইউজার অ্যাকাউন্ট পাওয়া যায়নি' };
  }

  const existing = accounts[targetKey];
  const now = new Date().toISOString();

  // If userCode is changing, ensure it's not duplicate
  if (updates.userCode && updates.userCode !== existing.userCode) {
    const desiredCode = updates.userCode.trim().toUpperCase();
    const isTaken = Object.values(accounts).some(
      (a) => a.uid !== existing.uid && a.userCode?.toUpperCase() === desiredCode
    );
    if (isTaken) {
      return { success: false, error: 'এই ইউজার আইডি অন্য ইউজারের জন্য ব্যবহৃত হচ্ছে।' };
    }
    existing.userCode = desiredCode;
    existing.referralCode = desiredCode;
  }

  if (updates.password !== undefined && updates.password.trim().length >= 4) {
    existing.password = updates.password.trim();
  }
  if (updates.displayName !== undefined) {
    existing.displayName = updates.displayName.trim();
  }
  if (updates.balance !== undefined && !isNaN(updates.balance)) {
    existing.balance = Math.max(0, Math.round(updates.balance * 100) / 100);
  }
  if (updates.lockedPrincipal !== undefined && !isNaN(updates.lockedPrincipal)) {
    existing.lockedPrincipal = Math.max(0, Math.round(updates.lockedPrincipal * 100) / 100);
  }
  existing.updatedAt = now;

  accounts[targetKey] = existing;
  saveStoredPhoneAccounts(accounts);

  // If phone number is changing, remap key
  if (updates.phoneNumber && updates.phoneNumber !== existing.phoneNumber) {
    const { cleanPhone } = normalizePhoneNumber(updates.phoneNumber);
    if (cleanPhone.length === 11) {
      delete accounts[targetKey];
      existing.phoneNumber = cleanPhone;
      existing.uid = `phone_${cleanPhone}`;
      accounts[cleanPhone] = existing;
      saveStoredPhoneAccounts(accounts);
    }
  }

  // Sync updates to Firestore
  try {
    const userDocRef = doc(db, 'users', existing.uid);
    updateDoc(userDocRef, {
      userCode: existing.userCode,
      referralCode: existing.referralCode,
      password: existing.password,
      displayName: existing.displayName,
      balance: existing.balance,
      lockedPrincipal: existing.lockedPrincipal,
      phoneNumber: existing.phoneNumber,
      updatedAt: now,
    }).catch((err) => console.warn('Could not sync user update to Firestore:', err));
  } catch (fsErr) {
    console.warn('Failed to initiate user update in Firestore:', fsErr);
  }

  window.dispatchEvent(new CustomEvent('accounts_updated'));
  return { success: true, account: existing };
}
