import { initializeApp } from 'firebase/app';
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  User as FirebaseUser,
} from 'firebase/auth';
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
  updateDoc,
  collection,
  addDoc,
  getDocFromServer,
  onSnapshot,
} from 'firebase/firestore';
import firebaseConfig from '../../firebase-applet-config.json';

const app = initializeApp(firebaseConfig);
export const db = getFirestore(app, firebaseConfig.firestoreDatabaseId); /* CRITICAL: The app will break without this line */
export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();

// Test connection on boot according to skill guideline
export async function testFirestoreConnection() {
  try {
    await getDocFromServer(doc(db, 'test', 'connection'));
  } catch (error) {
    if (error instanceof Error && error.message.includes('the client is offline')) {
      console.warn('Firebase client is offline. Please check connection.');
    }
  }
}
testFirestoreConnection();

export interface UserWalletProfile {
  id: string;
  userCode?: string;
  email: string;
  displayName: string;
  photoURL?: string;
  phoneNumber?: string;
  balance: number;
  initialBonus?: number;
  lockedPrincipal?: number;
  totalDeposited?: number;
  referralCode?: string;
  referredBy?: string;
  referralCount?: number;
  referralBonusEarned?: number;
  createdAt: string;
  updatedAt: string;
}

export interface WalletTransaction {
  id?: string;
  userId: string;
  type: 'deposit' | 'withdraw';
  amount: number;
  method: 'bkash' | 'nagad' | 'rocket';
  accountNumber: string;
  status: 'completed' | 'pending';
  trxId: string;
  createdAt: string;
}

// User sign-in with Google popup
export async function signInWithGoogle(): Promise<FirebaseUser | null> {
  try {
    const result = await signInWithPopup(auth, googleProvider);
    return result.user;
  } catch (err) {
    console.error('Error signing in with Google:', err);
    throw err;
  }
}

// Format and normalize phone numbers for auth and display
export function formatPhoneNumber(phone: string): { cleanPhone: string; authEmail: string; displayPhone: string } {
  let clean = phone.replace(/[^0-9]/g, '');
  if (clean.startsWith('880')) {
    clean = '0' + clean.slice(3);
  }
  const authEmail = `user_${clean}@phone.aviator.bd`;
  const displayPhone = clean.length === 11
    ? `${clean.slice(0, 5)}-${clean.slice(5)}`
    : clean;
  return { cleanPhone: clean, authEmail, displayPhone };
}

// User sign-up with Mobile Number and PIN/Password
export async function signUpWithPhone(
  phone: string,
  pass: string,
  name?: string
): Promise<FirebaseUser> {
  const { authEmail, displayPhone } = formatPhoneNumber(phone);
  const userCredential = await createUserWithEmailAndPassword(auth, authEmail, pass);
  const displayName = name?.trim() || `User ${displayPhone}`;
  await updateProfile(userCredential.user, {
    displayName,
  });
  await getOrCreateUserProfile(userCredential.user, 0, displayPhone, displayName);
  return userCredential.user;
}

// User sign-in with Mobile Number and PIN/Password
export async function signInWithPhone(
  phone: string,
  pass: string
): Promise<FirebaseUser> {
  const { authEmail } = formatPhoneNumber(phone);
  const userCredential = await signInWithEmailAndPassword(auth, authEmail, pass);
  return userCredential.user;
}

// User sign-up with Email & Password
export async function signUpWithEmail(
  email: string,
  pass: string,
  name?: string
): Promise<FirebaseUser> {
  const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), pass);
  const displayName = name?.trim() || email.split('@')[0];
  await updateProfile(userCredential.user, {
    displayName,
  });
  await getOrCreateUserProfile(userCredential.user, 0, '', displayName);
  return userCredential.user;
}

// User sign-in with Email & Password
export async function signInWithEmail(
  email: string,
  pass: string
): Promise<FirebaseUser> {
  const userCredential = await signInWithEmailAndPassword(auth, email.trim(), pass);
  return userCredential.user;
}

// User sign-out
export async function logoutUser(): Promise<void> {
  await signOut(auth);
}

// Helper to strip undefined values so Firestore never throws 'Unsupported field value: undefined'
function sanitizeFirestoreData<T extends Record<string, unknown>>(data: T): Record<string, unknown> {
  const sanitized: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) {
      sanitized[key] = value;
    }
  }
  return sanitized;
}

// Fetch or create user wallet in Firestore with 0 initial balance for real accounts
export async function getOrCreateUserProfile(
  user: FirebaseUser,
  initialBalance = 0,
  fallbackPhone?: string,
  fallbackName?: string
): Promise<UserWalletProfile> {
  const userRef = doc(db, 'users', user.uid);
  const snap = await getDoc(userRef);

  if (snap.exists()) {
    const data = snap.data() as UserWalletProfile;
    // If account was previously given the 132846.07 demo placeholder balance, reset it to 0 for real logged-in users
    if (data.balance === 132846.07) {
      try {
        await updateDoc(userRef, {
          balance: 0,
          updatedAt: new Date().toISOString(),
        });
        data.balance = 0;
      } catch (err) {
        console.error('Failed to reset legacy balance to 0:', err);
      }
    }
    // Update phone, display name, or userCode if previously missing
    const phoneToSet = user.phoneNumber || fallbackPhone;
    const nameToSet = user.displayName || fallbackName;
    const updates: Record<string, unknown> = {};
    if (!data.userCode) {
      data.userCode = `USER-${Math.floor(10000 + Math.random() * 90000)}`;
      data.referralCode = data.userCode;
      updates.userCode = data.userCode;
      updates.referralCode = data.referralCode;
    }
    if (!data.lockedPrincipal && data.lockedPrincipal !== 0) {
      data.lockedPrincipal = data.balance;
      updates.lockedPrincipal = data.lockedPrincipal;
    }
    if ((!data.phoneNumber && phoneToSet) || (!data.displayName && nameToSet)) {
      if (!data.phoneNumber && phoneToSet) updates.phoneNumber = phoneToSet;
      if (!data.displayName && nameToSet) updates.displayName = nameToSet;
    }
    if (Object.keys(updates).length > 0) {
      try {
        updates.updatedAt = new Date().toISOString();
        await updateDoc(userRef, sanitizeFirestoreData(updates));
        if (updates.phoneNumber) data.phoneNumber = updates.phoneNumber as string;
        if (updates.displayName) data.displayName = updates.displayName as string;
      } catch (e) {
        console.warn('Could not update extra profile info:', e);
      }
    }
    return data;
  }

  // Create new real account profile with ৳ 100 starting balance
  const now = new Date().toISOString();
  const generatedCode = `USER-${Math.floor(10000 + Math.random() * 90000)}`;
  const startingBalance = typeof initialBalance === 'number' && !isNaN(initialBalance) && initialBalance > 0 ? initialBalance : 100;

  const rawProfile: Record<string, unknown> = {
    id: user.uid,
    userCode: generatedCode,
    email: user.email || '',
    displayName: user.displayName || fallbackName || 'Player',
    photoURL: user.photoURL || '',
    phoneNumber: user.phoneNumber || fallbackPhone || '',
    balance: startingBalance,
    initialBonus: 100,
    lockedPrincipal: startingBalance,
    totalDeposited: 0,
    referralCode: generatedCode,
    referralCount: 0,
    referralBonusEarned: 0,
    createdAt: now,
    updatedAt: now,
  };

  const sanitized = sanitizeFirestoreData(rawProfile);
  await setDoc(userRef, sanitized);
  return sanitized as unknown as UserWalletProfile;
}

// Reset balance to 0 in Firestore
export async function resetUserBalanceInFirestore(userId: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      balance: 0,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to reset balance to 0 in Firestore:', err);
  }
}

// Update user phone number in Firestore profile
export async function updateUserPhoneNumber(userId: string, phoneNumber: string): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      phoneNumber,
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to update phone number in Firestore:', err);
    throw err;
  }
}

// Update user wallet balance in Firestore
export async function syncUserBalanceToFirestore(userId: string, newBalance: number): Promise<void> {
  try {
    const userRef = doc(db, 'users', userId);
    await updateDoc(userRef, {
      balance: Math.max(0, Math.round(newBalance * 100) / 100),
      updatedAt: new Date().toISOString(),
    });
  } catch (err) {
    console.error('Failed to sync balance to Firestore:', err);
  }
}

// Record deposit or withdrawal transaction
export async function recordWalletTransaction(
  userId: string,
  tx: Omit<WalletTransaction, 'userId' | 'createdAt'>
): Promise<void> {
  try {
    const txCol = collection(db, 'users', userId, 'transactions');
    const rawTx: Record<string, unknown> = {
      ...tx,
      userId,
      createdAt: new Date().toISOString(),
    };
    await addDoc(txCol, sanitizeFirestoreData(rawTx));
  } catch (err) {
    console.error('Failed to record transaction in Firestore:', err);
  }
}

// Record bet record
export async function recordBetHistory(
  userId: string,
  gameType: 'aviator' | 'wingo',
  stake: number,
  multiplier: number | null,
  payout: number | null,
  outcome: 'won' | 'lost'
): Promise<void> {
  try {
    const betCol = collection(db, 'users', userId, 'bets');
    const rawBet: Record<string, unknown> = {
      userId,
      gameType,
      stake,
      multiplier: multiplier || 0,
      payout: payout || 0,
      outcome,
      createdAt: new Date().toISOString(),
    };
    await addDoc(betCol, sanitizeFirestoreData(rawBet));
  } catch (err) {
    console.error('Failed to record bet in Firestore:', err);
  }
}
