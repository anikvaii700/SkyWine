/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import { RoundStatus, BetState, RoundHistoryItem, LivePlayerBet, ActiveGameTab } from './types/game';
import { Header } from './components/Header';
import { HistoryRibbon } from './components/HistoryRibbon';
import { FlightCanvas } from './components/FlightCanvas';
import { BetPanel } from './components/BetPanel';
import { LiveBetsTable } from './components/LiveBetsTable';
import { WinNotification } from './components/WinNotification';
import { AIPredictorModal } from './components/AIPredictorModal';
import { DepositModal } from './components/DepositModal';
import { RulesModal } from './components/RulesModal';
import { WingoGame } from './components/WingoGame';
import { AuthModal } from './components/AuthModal';
import { AdminPanel } from './components/AdminPanel';
import { AdminNotificationBanner } from './components/AdminNotificationBanner';
import { UserBalanceAlertToast } from './components/UserBalanceAlertToast';
import { getStoredDepositRequests, getStoredWithdrawalRequests } from './services/manualPayment';
import { soundManager } from './services/audio';
import { Language, translations } from './utils/i18n';
import {
  auth,
  db,
  getOrCreateUserProfile,
  syncUserBalanceToFirestore,
  recordWalletTransaction,
  recordBetHistory,
  UserWalletProfile,
} from './services/firebase';
import { doc, onSnapshot } from 'firebase/firestore';
import { onAuthStateChanged } from 'firebase/auth';
import {
  AppUser,
  getActivePhoneSession,
  syncPhoneAccountBalance,
  updatePhoneAccountBalanceLocally,
} from './services/phoneAuth';
import { recordUserBet } from './services/userManagement';
import { usePWAInstall } from './hooks/usePWAInstall';
import { PWAInstallModal } from './components/PWAInstallModal';
import { MobileBottomNav } from './components/MobileBottomNav';
import { SplashScreen } from './components/SplashScreen';
import { MobileSideDrawer } from './components/MobileSideDrawer';
import { ExitModal } from './components/ExitModal';
import { MarqueeTicker } from './components/MarqueeTicker';
import { AndroidStudioExportModal } from './components/AndroidStudioExportModal';
import { Plane, LogOut } from 'lucide-react';

const INITIAL_BALANCE = 0; // Starts at 0 for real authenticated accounts

export default function App() {
  const [balance, setBalance] = useState<number>(INITIAL_BALANCE);
  const [roundStatus, setRoundStatus] = useState<RoundStatus>('WAITING');
  const [currentMultiplier, setCurrentMultiplier] = useState<number>(1.0);
  const [finalCrashMultiplier, setFinalCrashMultiplier] = useState<number>(1.84);
  const [waitingCountdown, setWaitingCountdown] = useState<number>(5.0);

  // Mobile App Native Experience & Splash Screen State
  const [showSplash, setShowSplash] = useState<boolean>(true);
  const [isSideDrawerOpen, setIsSideDrawerOpen] = useState<boolean>(false);
  const [isExitModalOpen, setIsExitModalOpen] = useState<boolean>(false);
  const [isAppClosed, setIsAppClosed] = useState<boolean>(false);
  const [backPressToast, setBackPressToast] = useState<string | null>(null);
  const lastBackPressTimeRef = useRef<number>(0);
  const isExitingRef = useRef<boolean>(false);
  const backToastTimeoutRef = useRef<any>(null);

  const handleFinishSplash = useCallback(() => {
    setShowSplash(false);
  }, []);

  // Mobile App PWA & Android Studio State
  const [isInstallModalOpen, setIsInstallModalOpen] = useState<boolean>(false);
  const [isAndroidStudioOpen, setIsAndroidStudioOpen] = useState<boolean>(false);
  const { isInstalled: isAppInstalled, isMobile } = usePWAInstall();

  // Language & UI Modals
  const [lang, setLang] = useState<Language>('bn');
  const [isMuted, setIsMuted] = useState<boolean>(false);
  const [isDepositOpen, setIsDepositOpen] = useState<boolean>(false);
  const [walletTab, setWalletTab] = useState<'deposit' | 'withdraw'>('deposit');
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [isAdminOpen, setIsAdminOpen] = useState<boolean>(false);
  const [adminPanelInitialTab, setAdminPanelInitialTab] = useState<'requests' | 'withdrawals' | 'settings' | 'users'>('requests');
  const [balanceUpdateNotice, setBalanceUpdateNotice] = useState<string | null>(null);
  const [pendingDepositCount, setPendingDepositCount] = useState<number>(0);
  const [isPredictorOpen, setIsPredictorOpen] = useState<boolean>(true); // open by default as in screenshot
  const [activeGameTab, setActiveGameTab] = useState<ActiveGameTab>('AVIATOR');

  // User Auth & Cloud / Local Server Wallet State
  const [currentUser, setCurrentUser] = useState<AppUser | null>(null);
  const [userProfile, setUserProfile] = useState<UserWalletProfile | null>(null);
  const [isAuthOpen, setIsAuthOpen] = useState<boolean>(false);
  const [authNoticeMessage, setAuthNoticeMessage] = useState<string | null>(null);

  // Win Banner Notification
  const [winNotification, setWinNotification] = useState<{ amount: number; multiplier: number } | null>(null);

  // Dual Betting Panels
  const [bet1, setBet1] = useState<BetState>({
    id: 'bet-1',
    amount: 1000,
    isPlaced: false,
    cashedOut: false,
    cashedOutMultiplier: null,
    winAmount: null,
    isAutoCashOut: false,
    autoCashOutMultiplier: 2.0,
    isAutoBet: false,
  });

  const [bet2, setBet2] = useState<BetState>({
    id: 'bet-2',
    amount: 1000,
    isPlaced: false,
    cashedOut: false,
    cashedOutMultiplier: null,
    winAmount: null,
    isAutoCashOut: false,
    autoCashOutMultiplier: 2.0,
    isAutoBet: false,
  });

  // Recent multiplier history
  const [history, setHistory] = useState<RoundHistoryItem[]>([
    { id: '1', crashMultiplier: 2.14, timestamp: Date.now() - 60000 },
    { id: '2', crashMultiplier: 3.12, timestamp: Date.now() - 120000 },
    { id: '3', crashMultiplier: 1.57, timestamp: Date.now() - 180000 },
    { id: '4', crashMultiplier: 1.96, timestamp: Date.now() - 240000 },
    { id: '5', crashMultiplier: 8.10, timestamp: Date.now() - 300000 },
    { id: '6', crashMultiplier: 1.15, timestamp: Date.now() - 360000 },
    { id: '7', crashMultiplier: 1.84, timestamp: Date.now() - 420000 },
    { id: '8', crashMultiplier: 4.52, timestamp: Date.now() - 480000 },
    { id: '9', crashMultiplier: 1.38, timestamp: Date.now() - 540000 },
    { id: '10', crashMultiplier: 14.80, timestamp: Date.now() - 600000 },
  ]);

  // My Personal Bets History
  const [myBetHistory, setMyBetHistory] = useState<
    Array<{ id: string; amount: number; multiplier: number | null; winAmount: number | null; timestamp: number }>
  >([
    { id: 'h-0', amount: 1000, multiplier: 1.53, winAmount: 1530, timestamp: Date.now() - 150000 },
  ]);

  // Simulated Live Multiplayer Bets
  const [livePlayers, setLivePlayers] = useState<LivePlayerBet[]>([]);

  // Refs for requestAnimationFrame loop
  const flightStartTimeRef = useRef<number>(0);
  const crashTargetRef = useRef<number>(1.84);
  const animFrameIdRef = useRef<number | null>(null);
  const currentMultiplierRef = useRef<number>(1.0);

  // Synchronization refs to prevent multiple trigger in animation frames
  const bet1StateRef = useRef(bet1);
  const bet2StateRef = useRef(bet2);
  const bet1CashedOutRef = useRef(false);
  const bet2CashedOutRef = useRef(false);

  useEffect(() => {
    bet1StateRef.current = bet1;
  }, [bet1]);

  useEffect(() => {
    bet2StateRef.current = bet2;
  }, [bet2]);

  const balanceRef = useRef(balance);
  const userProfileRef = useRef(userProfile);
  const currentUserRef = useRef(currentUser);

  useEffect(() => {
    balanceRef.current = balance;
  }, [balance]);

  useEffect(() => {
    userProfileRef.current = userProfile;
  }, [userProfile]);

  useEffect(() => {
    currentUserRef.current = currentUser;
  }, [currentUser]);

  // Keep track of active modal states for synchronous back-button popstate handling
  const openModalsRef = useRef({
    isSideDrawerOpen,
    isExitModalOpen,
    isAuthOpen,
    isDepositOpen,
    isRulesOpen,
    isAdminOpen,
    isInstallModalOpen,
    isAndroidStudioOpen,
    activeGameTab,
  });

  useEffect(() => {
    openModalsRef.current = {
      isSideDrawerOpen,
      isExitModalOpen,
      isAuthOpen,
      isDepositOpen,
      isRulesOpen,
      isAdminOpen,
      isInstallModalOpen,
      isAndroidStudioOpen,
      activeGameTab,
    };
  }, [
    isSideDrawerOpen,
    isExitModalOpen,
    isAuthOpen,
    isDepositOpen,
    isRulesOpen,
    isAdminOpen,
    isInstallModalOpen,
    isAndroidStudioOpen,
    activeGameTab,
  ]);

  // Phone Default Back Button & Double Back Exit Handling
  useEffect(() => {
    // Prime the browser history stack to trap back navigation
    window.history.replaceState({ page: 'root' }, '');
    window.history.pushState({ page: 'aviator-dashboard' }, '');

    const handlePopState = () => {
      if (isExitingRef.current) return;
      const state = openModalsRef.current;
      const now = Date.now();

      // Case 1: If Exit modal is already open, 2nd back press exits the app directly!
      if (state.isExitModalOpen) {
        handleExitApp();
        return;
      }

      // Case 2: Close 3-line side drawer menu
      if (state.isSideDrawerOpen) {
        setIsSideDrawerOpen(false);
        window.history.pushState({ page: 'aviator-dashboard' }, '');
        return;
      }

      // Case 3: Close any active modal
      if (state.isAuthOpen) {
        setIsAuthOpen(false);
        window.history.pushState({ page: 'aviator-dashboard' }, '');
        return;
      }

      if (state.isDepositOpen) {
        setIsDepositOpen(false);
        window.history.pushState({ page: 'aviator-dashboard' }, '');
        return;
      }

      if (state.isRulesOpen) {
        setIsRulesOpen(false);
        window.history.pushState({ page: 'aviator-dashboard' }, '');
        return;
      }

      if (state.isAdminOpen) {
        setIsAdminOpen(false);
        window.history.pushState({ page: 'aviator-dashboard' }, '');
        return;
      }

      if (state.isInstallModalOpen) {
        setIsInstallModalOpen(false);
        window.history.pushState({ page: 'aviator-dashboard' }, '');
        return;
      }

      if (state.isAndroidStudioOpen) {
        setIsAndroidStudioOpen(false);
        window.history.pushState({ page: 'aviator-dashboard' }, '');
        return;
      }

      // Case 4: If on sub-game (like Wingo), go back to Aviator dashboard
      if (state.activeGameTab !== 'AVIATOR') {
        setActiveGameTab('AVIATOR');
        window.history.pushState({ page: 'aviator-dashboard' }, '');
        return;
      }

      // Case 5: On the dashboard with no open modals -> Check if double-tapped within 2000ms!
      if (now - lastBackPressTimeRef.current < 2000) {
        // Double tap on phone back button detected within 2 seconds: Open Exit Confirmation Modal!
        soundManager.playClick();
        setBackPressToast(null);
        setIsExitModalOpen(true);
        window.history.pushState({ page: 'aviator-dashboard' }, '');
      } else {
        // 1st back button press on phone: Show standard mobile toast like Facebook/YouTube!
        lastBackPressTimeRef.current = now;
        soundManager.playClick();
        setBackPressToast('অ্যাপ থেকে বের হতে আবার ব্যাক বাটনে চাপ দিন');
        if (backToastTimeoutRef.current) clearTimeout(backToastTimeoutRef.current);
        backToastTimeoutRef.current = setTimeout(() => {
          setBackPressToast(null);
        }, 2200);
        window.history.pushState({ page: 'aviator-dashboard' }, '');
      }
    };

    window.addEventListener('popstate', handlePopState);
    return () => {
      window.removeEventListener('popstate', handlePopState);
      if (backToastTimeoutRef.current) clearTimeout(backToastTimeoutRef.current);
    };
  }, []);

  // Listen to Firebase Auth or restore saved Phone session
  useEffect(() => {
    // 1. Check if phone user session exists
    const phoneSession = getActivePhoneSession();
    if (phoneSession) {
      setCurrentUser(phoneSession.user);
      setUserProfile(phoneSession.profile);
      setBalance(phoneSession.profile.balance);
    }

    // 2. Listen to Firebase Google Auth state
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        try {
          const profile = await getOrCreateUserProfile(user, 0);
          const appUser: AppUser = {
            uid: user.uid,
            displayName: user.displayName || 'Google Player',
            email: user.email,
            phoneNumber: profile.phoneNumber || user.phoneNumber || null,
            photoURL: user.photoURL,
            provider: 'google',
          };
          setCurrentUser(appUser);
          setUserProfile(profile);
          setBalance(profile.balance);
        } catch (err) {
          console.error('Error fetching Firestore user profile:', err);
        }
      } else {
        // If no firebase user, verify if there's a phone session
        const currentPhoneSession = getActivePhoneSession();
        if (!currentPhoneSession) {
          setCurrentUser(null);
          setUserProfile(null);
          setBalance(0);
        }
      }
    });

    return () => unsubscribe();
  }, []);

  // Listen to manual deposit approval credit events and pending deposit badge count
  useEffect(() => {
    const handleBalanceCredited = (e: Event) => {
      const customEvent = e as CustomEvent<{ userId: string; amount: number; requestId: string }>;
      if (customEvent.detail && customEvent.detail.amount > 0) {
        const targetUid = customEvent.detail.userId;
        const targetPhone = targetUid.replace('phone_', '');
        if (
          !currentUser ||
          currentUser.uid === targetUid ||
          currentUser.phoneNumber === targetPhone ||
          currentUser.phoneNumber?.replace(/[^0-9]/g, '') === targetPhone
        ) {
          setBalance((prev) => prev + customEvent.detail.amount);
          setUserProfile((p) => (p ? { ...p, balance: p.balance + customEvent.detail.amount } : null));
          soundManager.playWin();
        }
      }
    };

    const updatePendingCount = () => {
      const depReqs = getStoredDepositRequests();
      const wthReqs = getStoredWithdrawalRequests();
      const pendingDep = depReqs.filter((r) => r.status === 'pending').length;
      const pendingWth = wthReqs.filter((r) => r.status === 'pending').length;
      setPendingDepositCount(pendingDep + pendingWth);
    };

    updatePendingCount();
    window.addEventListener('balance_credited', handleBalanceCredited);
    window.addEventListener('deposit_requests_updated', updatePendingCount);
    window.addEventListener('withdrawal_requests_updated', updatePendingCount);

    return () => {
      window.removeEventListener('balance_credited', handleBalanceCredited);
      window.removeEventListener('deposit_requests_updated', updatePendingCount);
      window.removeEventListener('withdrawal_requests_updated', updatePendingCount);
    };
  }, [currentUser]);

  // Real-time Firestore listener for logged-in user wallet profile and balance
  const prevRemoteBalanceRef = useRef<number | null>(null);
  useEffect(() => {
    if (!currentUser?.uid) {
      prevRemoteBalanceRef.current = null;
      return;
    }

    const userDocRef = doc(db, 'users', currentUser.uid);
    const unsubscribe = onSnapshot(
      userDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data() as UserWalletProfile;
          if (typeof data.balance === 'number') {
            const newBal = Math.max(0, Math.round(data.balance * 100) / 100);

            // If balance increased remotely (e.g. admin approved deposit or refunded withdrawal)
            if (prevRemoteBalanceRef.current !== null && newBal > prevRemoteBalanceRef.current) {
              const credited = Math.round((newBal - prevRemoteBalanceRef.current) * 100) / 100;
              setBalanceUpdateNotice(
                `🎉 আপনার একাউন্টে ৳ ${credited.toLocaleString()} জমা হয়েছে! বর্তমান ব্যালেন্স: ৳ ${newBal.toLocaleString()}`
              );
              soundManager.playWin();
            }

            prevRemoteBalanceRef.current = newBal;
            setBalance(newBal);
            setUserProfile((prev) => (prev ? { ...prev, ...data, balance: newBal } : data));

            if (currentUser.provider === 'phone') {
              updatePhoneAccountBalanceLocally(currentUser.uid, newBal);
            }
          }
        }
      },
      (error) => {
        console.warn('Realtime user profile listener error:', error);
      }
    );

    return () => unsubscribe();
  }, [currentUser?.uid]);

  // Real-time Firestore listener for System Payment Settings (bKash/Nagad/Rocket numbers and notices)
  useEffect(() => {
    const settingsDocRef = doc(db, 'system', 'payment_settings');
    const unsubscribe = onSnapshot(
      settingsDocRef,
      (docSnap) => {
        if (docSnap.exists()) {
          const data = docSnap.data();
          if (data) {
            localStorage.setItem('aviator_payment_settings_v2', JSON.stringify(data));
            window.dispatchEvent(new CustomEvent('payment_settings_updated', { detail: data }));
          }
        }
      },
      (err) => {
        console.warn('Realtime payment settings listener error:', err);
      }
    );
    return () => unsubscribe();
  }, []);

  // Sync balance updates with Firestore cloud wallet or Phone Account storage
  const updateBalanceAndSync = useCallback((updater: (prev: number) => number) => {
    setBalance((prev) => {
      const next = Math.max(0, Math.round(updater(prev) * 100) / 100);
      if (currentUser) {
        if (currentUser.provider === 'google') {
          syncUserBalanceToFirestore(currentUser.uid, next);
        } else {
          syncPhoneAccountBalance(currentUser.uid, next);
        }
        setUserProfile((p) => (p ? { ...p, balance: next } : null));
      }
      return next;
    });
  }, [currentUser]);

  // Generate Provably Fair Crash Multiplier with Smart New-User Algorithm
  // Rule (Per User Instruction):
  // 1. New user starts with 100 bonus - this 100 MUST NOT be lost at the start!
  // 2. While user balance is below 400-500 BDT (and haven't deposited), the plane flies high (2.20x - 6.50x), never crashing early.
  // 3. Once balance reaches 400-500 BDT, user enters the loss curve (crashes early: 1.05x - 1.35x), motivating them to deposit (এড মানি).
  // 4. If user has not placed a bet, or has deposited, normal realistic fair casino distribution applies.
  const generateNewCrashPoint = useCallback((): number => {
    const currentBet1 = bet1StateRef.current;
    const currentBet2 = bet2StateRef.current;
    const hasPlacedBet = (currentBet1.isPlaced && !currentBet1.cashedOut) || (currentBet2.isPlaced && !currentBet2.cashedOut);
    const hasDeposited = (userProfileRef.current?.totalDeposited || 0) > 0;
    const currentBal = balanceRef.current;

    // Beginner New-User Algorithm (Before Depositing)
    if (!hasDeposited && hasPlacedBet) {
      // Phase 1: Beginner Boost (Allows balance to grow and pass 500+ with broken/fractional numbers)
      // New user starting with 100 bonus - protected from early crashes until reaching 500+ BDT!
      if (currentBal < 515) {
        let targetAuto = 0;
        if (currentBet1.isPlaced && currentBet1.isAutoCashOut && currentBet1.autoCashOutMultiplier > 1) {
          targetAuto = Math.max(targetAuto, currentBet1.autoCashOutMultiplier);
        }
        if (currentBet2.isPlaced && currentBet2.isAutoCashOut && currentBet2.autoCashOutMultiplier > 1) {
          targetAuto = Math.max(targetAuto, currentBet2.autoCashOutMultiplier);
        }

        // Generous multiplier giving them ample time and safe, exciting wins with natural decimals
        let baseMin = 2.20;
        if (targetAuto > 1.2 && targetAuto <= 5.0) {
          baseMin = targetAuto + 0.40;
        }

        const point = +(baseMin + Math.random() * 3.5).toFixed(2);
        return Math.min(48.00, Math.max(2.10, point));
      }

      // Phase 2: Loss Curve (Once balance reaches 500+ BDT zone)
      // Once user reaches 500+ BDT, induce early crashes so they lose and deposit!
      if (currentBal >= 515) {
        const lossRand = Math.random();
        let lossPoint = 1.12;
        if (lossRand < 0.80) {
          // 80% chance of immediate early crash (1.05x - 1.25x)
          lossPoint = +(1.05 + Math.random() * 0.20).toFixed(2);
        } else if (lossRand < 0.95) {
          // 15% chance of crash right around 1.26x - 1.48x
          lossPoint = +(1.26 + Math.random() * 0.22).toFixed(2);
        } else {
          // 5% chance of moderate flight (1.50x - 1.95x)
          lossPoint = +(1.50 + Math.random() * 0.45).toFixed(2);
        }
        return Math.min(50.00, Math.max(1.05, lossPoint));
      }
    }

    // Standard / Default Provably Fair Distribution (Capped strictly at max 50.00x)
    const rand = Math.random();
    let point = 1.0;
    // 3.5% early crash (1.00x - 1.05x)
    if (rand < 0.035) point = +(1.0 + Math.random() * 0.05).toFixed(2);
    // 45% medium (1.10x - 2.10x)
    else if (rand < 0.485) point = +(1.1 + Math.random() * 1.0).toFixed(2);
    // 35% good (2.10x - 6.50x)
    else if (rand < 0.835) point = +(2.1 + Math.random() * 4.4).toFixed(2);
    // 13% high (6.50x - 22.00x)
    else if (rand < 0.965) point = +(6.5 + Math.random() * 15.5).toFixed(2);
    // 3.5% super high (capped strictly between 22.00x - 50.00x)
    else point = +(22.0 + Math.random() * 28.0).toFixed(2);

    return Math.min(50.00, Math.max(1.00, point));
  }, []);

  // Generate simulated players for each round (Fluctuating player count: sometimes 13, sometimes much more, sometimes less)
  const generateSimulatedPlayers = useCallback(() => {
    const allNames = [
      'Shanto_Vai',
      'Shakib_75',
      'Tamim_BD',
      'Rahim_VIP',
      'Priya_Queen',
      'Tanvir_Pro',
      'Rony_Dhaka',
      'Sumon_Trader',
      'Mehedi_Winner',
      'Anik_99',
      'Arif_Chittagong',
      'Nusrat_Win',
      'Rakib_Gamer',
      'Hasan_King',
      'Siam_786',
      'Fahim_BD',
      'Alomgir_Boss',
      'Zahid_Winner',
      'Munna_Star',
      'Sujon_Pro',
      'Biplob_Vai',
      'Nayeem_Dhaka',
      'Kazol_Sylhet',
      'Jamil_99',
      'Akash_Blue',
      'Rubel_Hossain',
      'Nazmul_Smart',
      'Imran_CTG',
      'Shohel_Rana',
      'Babul_Master',
      'Faruk_Knight',
      'Ashik_Player',
      'Shahadat_Win',
      'Robin_Lucky',
      'Selim_Boss',
      'Apon_BD',
      'Emon_King',
      'Shimul_Trader',
      'Jewel_Pro',
      'Rasel_Vip',
      'Mithun_Dhaka',
      'Masud_Win',
      'Joy_777',
      'Ripon_Master',
      'Shamim_Gold',
    ];
    const stakes = [50, 100, 200, 500, 1000, 2000, 5000];

    // Determine random number of players for this round (fluctuates: sometimes 12 [total 13 with current], sometimes 18, 25, 34, etc.)
    const rand = Math.random();
    let count: number;
    if (rand < 0.20) {
      count = 12; // exactly 12 so with player it shows 13
    } else if (rand < 0.55) {
      count = Math.floor(14 + Math.random() * 12); // 14 to 25
    } else if (rand < 0.85) {
      count = Math.floor(26 + Math.random() * 14); // 26 to 39
    } else {
      count = Math.floor(8 + Math.random() * 5); // 8 to 12
    }

    // Shuffle and pick `count` names
    const shuffled = [...allNames].sort(() => 0.5 - Math.random()).slice(0, count);

    const players: LivePlayerBet[] = shuffled.map((name, idx) => ({
      id: `p-${idx}-${Date.now()}`,
      playerName: name,
      avatarSeed: name,
      betAmount: stakes[Math.floor(Math.random() * stakes.length)],
      cashedOut: false,
    }));
    setLivePlayers(players);
  }, []);

  // Track completed rounds to only update simulated player count every 3 completed games
  const completedRoundsCountRef = useRef<number>(0);

  // Reset simulated players for next round (retains exact same players and count across 3 consecutive rounds)
  const resetSimulatedPlayersForNextRound = useCallback(() => {
    const stakes = [50, 100, 200, 500, 1000, 2000, 5000];
    setLivePlayers((prev) =>
      prev.map((p) => ({
        ...p,
        cashedOut: false,
        cashedOutMultiplier: undefined,
        winAmount: undefined,
        betAmount: stakes[Math.floor(Math.random() * stakes.length)],
      }))
    );
  }, []);

  // Cash out handler for Panel 1 (strictly executed once)
  const handleCashOutPanel1 = useCallback((multiplierSnapshot?: unknown) => {
    if (bet1CashedOutRef.current) return;
    const currentBet = bet1StateRef.current;
    if (!currentBet.isPlaced || currentBet.cashedOut) return;

    bet1CashedOutRef.current = true;
    const mult =
      typeof multiplierSnapshot === 'number' && Number.isFinite(multiplierSnapshot)
        ? multiplierSnapshot
        : (currentMultiplierRef.current || 1.0);

    const win = Math.round(currentBet.amount * mult * 100) / 100;
    const actualWin = win;

    soundManager.playWin();

    setBet1((prev) => ({
      ...prev,
      cashedOut: true,
      cashedOutMultiplier: mult,
      winAmount: actualWin,
    }));

    updateBalanceAndSync((prev) => prev + actualWin);

    // Record user bet history
    recordUserBet({
      userId: currentUser?.uid || 'guest',
      userCode: userProfile?.userCode || currentUser?.userCode,
      gameType: 'aviator',
      stake: currentBet.amount,
      multiplier: mult,
      payout: actualWin,
      outcome: 'won',
    });

    if (currentUser && currentUser.provider === 'google') {
      recordBetHistory(currentUser.uid, 'aviator', currentBet.amount, mult, actualWin, 'won');
    }
    setWinNotification({ amount: actualWin, multiplier: mult });

    setMyBetHistory((prev) => [
      {
        id: `my-${Date.now()}-1`,
        amount: currentBet.amount,
        multiplier: mult,
        winAmount: actualWin,
        timestamp: Date.now(),
      },
      ...prev.slice(0, 19),
    ]);
  }, [updateBalanceAndSync, currentUser, userProfile, balance]);

  // Cash out handler for Panel 2 (strictly executed once)
  const handleCashOutPanel2 = useCallback((multiplierSnapshot?: unknown) => {
    if (bet2CashedOutRef.current) return;
    const currentBet = bet2StateRef.current;
    if (!currentBet.isPlaced || currentBet.cashedOut) return;

    bet2CashedOutRef.current = true;
    const mult =
      typeof multiplierSnapshot === 'number' && Number.isFinite(multiplierSnapshot)
        ? multiplierSnapshot
        : (currentMultiplierRef.current || 1.0);

    const win = Math.round(currentBet.amount * mult * 100) / 100;
    const actualWin = win;

    soundManager.playWin();

    setBet2((prev) => ({
      ...prev,
      cashedOut: true,
      cashedOutMultiplier: mult,
      winAmount: actualWin,
    }));

    updateBalanceAndSync((prev) => prev + actualWin);

    // Record user bet history
    recordUserBet({
      userId: currentUser?.uid || 'guest',
      userCode: userProfile?.userCode || currentUser?.userCode,
      gameType: 'aviator',
      stake: currentBet.amount,
      multiplier: mult,
      payout: actualWin,
      outcome: 'won',
    });

    if (currentUser && currentUser.provider === 'google') {
      recordBetHistory(currentUser.uid, 'aviator', currentBet.amount, mult, actualWin, 'won');
    }
    setWinNotification({ amount: actualWin, multiplier: mult });

    setMyBetHistory((prev) => [
      {
        id: `my-${Date.now()}-2`,
        amount: currentBet.amount,
        multiplier: mult,
        winAmount: actualWin,
        timestamp: Date.now(),
      },
      ...prev.slice(0, 19),
    ]);
  }, [updateBalanceAndSync, currentUser, userProfile, balance]);

  // Main Game Loop: WAITING -> FLYING -> CRASHED
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;

    if (roundStatus === 'WAITING') {
      soundManager.stopEngineSound();
      setCurrentMultiplier(1.0);
      currentMultiplierRef.current = 1.0;
      bet1CashedOutRef.current = false;
      bet2CashedOutRef.current = false;

      // Update simulated players count only after at least 3 completed games finish (or on initial round)
      completedRoundsCountRef.current += 1;
      if (completedRoundsCountRef.current === 1 || completedRoundsCountRef.current % 3 === 1) {
        generateSimulatedPlayers();
      } else {
        resetSimulatedPlayersForNextRound();
      }

      // Check auto bets (Strict: Only if user has account!)
      if (currentUser && bet1.isAutoBet && !bet1.isPlaced && balance >= bet1.amount) {
        setBalance((prev) => prev - bet1.amount);
        setBet1((prev) => ({ ...prev, isPlaced: true, cashedOut: false, winAmount: null }));
      }
      if (currentUser && bet2.isAutoBet && !bet2.isPlaced && balance >= bet2.amount) {
        setBalance((prev) => prev - bet2.amount);
        setBet2((prev) => ({ ...prev, isPlaced: true, cashedOut: false, winAmount: null }));
      }

      // 5-second countdown
      const startTime = Date.now();
      const interval = setInterval(() => {
        const elapsed = (Date.now() - startTime) / 1000;
        const remain = Math.max(0, 5.0 - elapsed);
        setWaitingCountdown(remain);

        if (remain <= 0) {
          clearInterval(interval);
          // Transition to FLYING
          const nextCrash = generateNewCrashPoint();
          crashTargetRef.current = nextCrash;
          setFinalCrashMultiplier(nextCrash);
          setRoundStatus('FLYING');
          soundManager.startEngineSound();
          flightStartTimeRef.current = Date.now();
        }
      }, 50);

      return () => clearInterval(interval);
    }

    if (roundStatus === 'FLYING') {
      let isFlying = true;

      const flyLoop = () => {
        if (!isFlying) return;

        const timeInSeconds = (Date.now() - flightStartTimeRef.current) / 1000;
        // Aviator exponential curve formula: multiplier grows smoothly
        const mult = 1.0 + 0.07 * timeInSeconds + 0.06 * Math.pow(timeInSeconds, 1.8);
        const roundedMult = Math.min(50.00, Math.round(mult * 100) / 100);
        currentMultiplierRef.current = roundedMult;

        soundManager.updateEnginePitch(roundedMult);

        // Check if other simulated players cash out
        setLivePlayers((prev) =>
          prev.map((p) => {
            if (!p.cashedOut && Math.random() < 0.02 && roundedMult < crashTargetRef.current) {
              return {
                ...p,
                cashedOut: true,
                cashedOutMultiplier: roundedMult,
                winAmount: Math.round(p.betAmount * roundedMult),
              };
            }
            return p;
          })
        );

        // Check Auto Cash Out Panel 1 (strictly once)
        if (
          !bet1CashedOutRef.current &&
          bet1StateRef.current.isPlaced &&
          !bet1StateRef.current.cashedOut &&
          bet1StateRef.current.isAutoCashOut &&
          roundedMult >= bet1StateRef.current.autoCashOutMultiplier
        ) {
          handleCashOutPanel1(roundedMult);
        }

        // Check Auto Cash Out Panel 2 (strictly once)
        if (
          !bet2CashedOutRef.current &&
          bet2StateRef.current.isPlaced &&
          !bet2StateRef.current.cashedOut &&
          bet2StateRef.current.isAutoCashOut &&
          roundedMult >= bet2StateRef.current.autoCashOutMultiplier
        ) {
          handleCashOutPanel2(roundedMult);
        }

        if (roundedMult >= crashTargetRef.current || roundedMult >= 50.00) {
          // CRASH EVENT! (Capped strictly at max 50x)
          isFlying = false;
          setCurrentMultiplier(Math.min(50.00, crashTargetRef.current));
          soundManager.playCrash();
          setRoundStatus('CRASHED');

          // Record lost bets
          if (bet1.isPlaced && !bet1.cashedOut) {
            recordUserBet({
              userId: currentUser?.uid || 'guest',
              userCode: userProfile?.userCode || currentUser?.userCode,
              gameType: 'aviator',
              stake: bet1.amount,
              multiplier: null,
              payout: 0,
              outcome: 'lost',
            });
            setMyBetHistory((h) => [
              { id: `lost-${Date.now()}-1`, amount: bet1.amount, multiplier: null, winAmount: null, timestamp: Date.now() },
              ...h.slice(0, 19),
            ]);
          }
          if (bet2.isPlaced && !bet2.cashedOut) {
            recordUserBet({
              userId: currentUser?.uid || 'guest',
              userCode: userProfile?.userCode || currentUser?.userCode,
              gameType: 'aviator',
              stake: bet2.amount,
              multiplier: null,
              payout: 0,
              outcome: 'lost',
            });
            setMyBetHistory((h) => [
              { id: `lost-${Date.now()}-2`, amount: bet2.amount, multiplier: null, winAmount: null, timestamp: Date.now() },
              ...h.slice(0, 19),
            ]);
          }

          // Add to multiplier history
          setHistory((prev) => [
            {
              id: String(Date.now()),
              crashMultiplier: crashTargetRef.current,
              timestamp: Date.now(),
              hash: 'sha256_' + Math.random().toString(36).substring(2, 15),
            },
            ...prev.slice(0, 19),
          ]);

          return;
        }

        setCurrentMultiplier(roundedMult);
        animFrameIdRef.current = requestAnimationFrame(flyLoop);
      };

      animFrameIdRef.current = requestAnimationFrame(flyLoop);

      return () => {
        isFlying = false;
        if (animFrameIdRef.current) cancelAnimationFrame(animFrameIdRef.current);
      };
    }

    if (roundStatus === 'CRASHED') {
      // Stay on crashed screen for 2.8 seconds, then reset for next round
      timer = setTimeout(() => {
        setBet1((prev) => ({
          ...prev,
          isPlaced: false,
          cashedOut: false,
          cashedOutMultiplier: null,
          winAmount: null,
        }));
        setBet2((prev) => ({
          ...prev,
          isPlaced: false,
          cashedOut: false,
          cashedOutMultiplier: null,
          winAmount: null,
        }));
        setRoundStatus('WAITING');
      }, 2800);

      return () => {
        if (timer) clearTimeout(timer);
      };
    }
  }, [
    roundStatus,
    bet1.isPlaced,
    bet1.cashedOut,
    bet1.isAutoCashOut,
    bet1.autoCashOutMultiplier,
    bet1.isAutoBet,
    bet2.isPlaced,
    bet2.cashedOut,
    bet2.isAutoCashOut,
    bet2.autoCashOutMultiplier,
    bet2.isAutoBet,
    balance,
    generateNewCrashPoint,
    generateSimulatedPlayers,
    handleCashOutPanel1,
    handleCashOutPanel2,
  ]);

  // Auth requirement notification trigger
  const handleRequireAuth = useCallback((message: string) => {
    soundManager.playCrash();
    setAuthNoticeMessage(message);
    setIsAuthOpen(true);
  }, []);

  // Guarded Deposit & Withdraw handlers (Strict: Must have an account!)
  const handleOpenDeposit = useCallback(() => {
    if (!currentUser) {
      handleRequireAuth('এড মানি (রিচার্জ) করতে হলে প্রথমে আপনার একটি একাউন্ট তৈরি বা লগইন করতে হবে!');
      return;
    }
    setWalletTab('deposit');
    setIsDepositOpen(true);
  }, [currentUser, handleRequireAuth]);

  const handleOpenWithdraw = useCallback(() => {
    if (!currentUser) {
      handleRequireAuth('টাকা উইথড্র করতে হলে প্রথমে আপনার একটি একাউন্ট তৈরি বা লগইন করতে হবে!');
      return;
    }
    setWalletTab('withdraw');
    setIsDepositOpen(true);
  }, [currentUser, handleRequireAuth]);

  // Place Bet actions (Strict: No bets allowed without an account!)
  const handlePlaceBetPanel1 = (amount: number) => {
    if (!currentUser) {
      handleRequireAuth('বেট ধরার জন্য আপনাকে অবশ্যই একাউন্ট তৈরি বা লগইন করতে হবে!');
      return;
    }
    if (roundStatus !== 'WAITING') return; // Strict: No bets allowed during flight or crash!
    if (balance < amount) return;
    soundManager.playClick();
    bet1CashedOutRef.current = false;
    updateBalanceAndSync((prev) => prev - amount);
    setBet1((prev) => ({ ...prev, amount, isPlaced: true, cashedOut: false, winAmount: null }));
  };

  const handleCancelBetPanel1 = () => {
    if (!bet1.isPlaced || roundStatus !== 'WAITING') return;
    soundManager.playClick();
    bet1CashedOutRef.current = false;
    updateBalanceAndSync((prev) => prev + bet1.amount);
    setBet1((prev) => ({ ...prev, isPlaced: false }));
  };

  const handlePlaceBetPanel2 = (amount: number) => {
    if (!currentUser) {
      handleRequireAuth('বেট ধরার জন্য আপনাকে অবশ্যই একাউন্ট তৈরি বা লগইন করতে হবে!');
      return;
    }
    if (roundStatus !== 'WAITING') return; // Strict: No bets allowed during flight or crash!
    if (balance < amount) return;
    soundManager.playClick();
    bet2CashedOutRef.current = false;
    updateBalanceAndSync((prev) => prev - amount);
    setBet2((prev) => ({ ...prev, amount, isPlaced: true, cashedOut: false, winAmount: null }));
  };

  const handleCancelBetPanel2 = () => {
    if (!bet2.isPlaced || roundStatus !== 'WAITING') return;
    soundManager.playClick();
    bet2CashedOutRef.current = false;
    updateBalanceAndSync((prev) => prev + bet2.amount);
    setBet2((prev) => ({ ...prev, isPlaced: false }));
  };

  // Complete Direct Exit: Closes app and returns straight to mobile's default home screen without showing any exit screen
  // Complete Direct Exit: Closes app and returns straight to mobile's default home screen without looping
  const handleExitApp = useCallback(() => {
    isExitingRef.current = true;
    soundManager.stopEngineSound();
    setIsExitModalOpen(false);
    setBackPressToast(null);

    // 1. Android APK native JavaScript interfaces (from Android Studio / WebView wrappers)
    try {
      const win = window as any;
      if (win.Android?.exitApp) { win.Android.exitApp(); return; }
      if (win.Android?.finish) { win.Android.finish(); return; }
      if (win.Android?.closeApp) { win.Android.closeApp(); return; }
      if (win.android?.exitApp) { win.android.exitApp(); return; }
      if (win.android?.finish) { win.android.finish(); return; }
      if (win.navigator?.app?.exitApp) { win.navigator.app.exitApp(); return; }
      if (win.JSBridge?.closeWindow) { win.JSBridge.closeWindow(); return; }
    } catch {}

    // 2. Standard window.close()
    try {
      window.close();
    } catch {}

    // 3. Set clean App Closed State (Clean native-like closed state, zero loops)
    setIsAppClosed(true);
  }, []);

  const handleOpenAdminPanelWithTab = (tab?: 'requests' | 'withdrawals') => {
    if (tab) setAdminPanelInitialTab(tab);
    setIsAdminOpen(true);
  };

  // Clean Native-like App Closed Screen (like Facebook, YouTube exit on phone)
  if (isAppClosed) {
    return (
      <div className="min-h-screen bg-[#070a12] text-white flex flex-col items-center justify-center p-6 text-center select-none font-sans">
        <div className="w-16 h-16 rounded-full bg-red-600/10 border border-red-500/30 flex items-center justify-center text-red-400 mb-4 shadow-xl">
          <LogOut className="w-8 h-8 text-red-500" />
        </div>
        <h2 className="text-xl font-bold text-white mb-2">অ্যাপটি বন্ধ হয়েছে</h2>
        <p className="text-xs text-slate-400 max-w-xs mb-6">
          ধন্যবাদ! আপনি নিরাপদে অ্যাপ থেকে প্রস্থান করেছেন। আপনি চাইলে ব্রাউজার ট্যাব বন্ধ করতে পারেন অথবা নিচে চাপ দিয়ে পুনরায় অ্যাপ চালু করতে পারেন।
        </p>
        <button
          onClick={() => {
            isExitingRef.current = false;
            setIsAppClosed(false);
          }}
          className="px-6 py-3 rounded-xl bg-gradient-to-r from-red-600 to-rose-700 hover:from-red-500 hover:to-rose-600 text-white font-bold text-xs shadow-lg shadow-red-700/40 cursor-pointer active:scale-95 transition-transform"
        >
          অ্যাপ পুনরায় চালু করুন
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#070a12] text-white flex justify-center font-sans select-none relative touch-manipulation p-[0.1rem] sm:p-2 box-border overflow-x-hidden">
      {/* Phone Default Back Button 1st Press Toast (Classic Android / YouTube / Facebook Style) */}
      {backPressToast && (
        <div className="fixed bottom-16 left-1/2 -translate-x-1/2 z-[120] bg-black/90 border border-[#2a364f] text-slate-100 px-4 py-2 rounded-full text-xs font-semibold shadow-2xl backdrop-blur-md flex items-center gap-2 pointer-events-none animate-fadeIn">
          <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
          <span>{backPressToast}</span>
        </div>
      )}

      {/* Real-time Admin Notification Banner for Add Money & Cashout requests */}
      <AdminNotificationBanner
        currentUserPhone={currentUser?.phoneNumber}
        onOpenAdminPanel={handleOpenAdminPanelWithTab}
      />

      {/* Real-time User Balance Update Notification when deposit is approved */}
      <UserBalanceAlertToast
        message={balanceUpdateNotice}
        onClose={() => setBalanceUpdateNotice(null)}
      />

      {/* 100% Mobile Phone Container (With 4-side .1 padding, rounded frame, zero overflow) */}
      <div className="w-full max-w-md min-h-[calc(100dvh-0.2rem)] bg-[#0c0f17] flex flex-col shadow-2xl relative rounded-xl border border-[#1e2a3f] overflow-x-hidden box-border">
        {/* Top Header with 3-Line Menu Button */}
        <Header
          balance={balance}
          currentUser={currentUser}
          userProfile={userProfile}
          onOpenMenu={() => setIsSideDrawerOpen(true)}
          onOpenAuth={() => {
            setAuthNoticeMessage(null);
            setIsAuthOpen(true);
          }}
          onOpenDeposit={handleOpenDeposit}
          onOpenWithdraw={handleOpenWithdraw}
          onOpenRules={() => setIsRulesOpen(true)}
          onOpenAdmin={() => setIsAdminOpen(true)}
          pendingDepositCount={pendingDepositCount}
          isMuted={isMuted}
          onToggleSound={() => {
            const next = !isMuted;
            setIsMuted(next);
            soundManager.setMuted(next);
          }}
          lang={lang}
          onToggleLang={() => setLang((prev) => (prev === 'bn' ? 'en' : 'bn'))}
          isPredictorOpen={isPredictorOpen}
          onTogglePredictor={() => setIsPredictorOpen((prev) => !prev)}
          onOpenInstallModal={() => setIsInstallModalOpen(true)}
          isAppInstalled={isAppInstalled}
        />

        {/* Right-to-Left Scrolling Announcement Banner ("শিরোনাম") */}
        <MarqueeTicker />

        {/* Main Container */}
        <main className="flex-1 w-full max-w-full p-1.5 sm:p-2 flex flex-col gap-2 relative pb-24 overflow-x-hidden box-border">
        {/* Aviator Mode */}
        {activeGameTab === 'AVIATOR' && (
          <>
            {/* Multiplier History Ribbon */}
            <HistoryRibbon history={history} />

            {/* Canvas Stage */}
            <div className="relative">
              <FlightCanvas
                status={roundStatus}
                currentMultiplier={currentMultiplier}
                finalCrashMultiplier={finalCrashMultiplier}
                waitingCountdown={waitingCountdown}
                lang={lang}
              />

              {/* Floating Win Banner */}
              {winNotification && (
                <WinNotification
                  amount={winNotification.amount}
                  multiplier={winNotification.multiplier}
                  onClose={() => setWinNotification(null)}
                />
              )}

              {/* AI Signal Predictor widget */}
              <AIPredictorModal
                isOpen={isPredictorOpen}
                onClose={() => setIsPredictorOpen(false)}
                recentMultipliers={history.map((h) => h.crashMultiplier)}
                roundStatus={roundStatus}
              />
            </div>

            {/* Dual Betting Controls: Panel 1 & Panel 2 (Both visible simultaneously in same view - no tab switching) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div>
                <BetPanel
                  panelIndex={1}
                  bet={bet1}
                  roundStatus={roundStatus}
                  currentMultiplier={currentMultiplier}
                  balance={balance}
                  currentUser={currentUser}
                  onRequireAuth={handleRequireAuth}
                  onPlaceBet={handlePlaceBetPanel1}
                  onCancelBet={handleCancelBetPanel1}
                  onCashOut={() => handleCashOutPanel1()}
                  onUpdateAutoSettings={(autoBet, autoCash, autoMult) =>
                    setBet1((prev) => ({
                      ...prev,
                      isAutoBet: autoBet,
                      isAutoCashOut: autoCash,
                      autoCashOutMultiplier: autoMult,
                    }))
                  }
                  lang={lang}
                />
              </div>

              <div>
                <BetPanel
                  panelIndex={2}
                  bet={bet2}
                  roundStatus={roundStatus}
                  currentMultiplier={currentMultiplier}
                  balance={balance}
                  currentUser={currentUser}
                  onRequireAuth={handleRequireAuth}
                  onPlaceBet={handlePlaceBetPanel2}
                  onCancelBet={handleCancelBetPanel2}
                  onCashOut={() => handleCashOutPanel2()}
                  onUpdateAutoSettings={(autoBet, autoCash, autoMult) =>
                    setBet2((prev) => ({
                      ...prev,
                      isAutoBet: autoBet,
                      isAutoCashOut: autoCash,
                      autoCashOutMultiplier: autoMult,
                    }))
                  }
                  lang={lang}
                />
              </div>
            </div>

            {/* Multiplayer Live Bets & History */}
            <LiveBetsTable
              livePlayers={livePlayers}
              myBetHistory={myBetHistory}
              lang={lang}
            />
          </>
        )}

        {/* Wingo Mode */}
        {activeGameTab === 'WINGO' && (
          <WingoGame
            balance={balance}
            currentUser={currentUser}
            onRequireAuth={handleRequireAuth}
            onUpdateBalance={(delta) => updateBalanceAndSync((prev) => prev + delta)}
            lang={lang}
          />
        )}
      </main>

      {/* Mobile Native App Bottom Navigation Bar (Uniform on all viewports) */}
      <MobileBottomNav
        activeTab={activeGameTab}
        onSelectTab={(tab) => setActiveGameTab(tab)}
        onOpenDeposit={handleOpenDeposit}
        onOpenWithdraw={handleOpenWithdraw}
        onOpenAuth={() => {
          setAuthNoticeMessage(null);
          setIsAuthOpen(true);
        }}
        onTogglePredictor={() => setIsPredictorOpen((prev) => !prev)}
        isPredictorOpen={isPredictorOpen}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        isAppInstalled={isAppInstalled}
        currentUser={currentUser}
      />

      {/* Modals */}
      <DepositModal
        isOpen={isDepositOpen}
        onClose={() => setIsDepositOpen(false)}
        currentBalance={balance}
        initialTab={walletTab}
        onAddFunds={(amt) => {
          updateBalanceAndSync((prev) => prev + amt);
          if (currentUser && currentUser.provider === 'google') {
            recordWalletTransaction(currentUser.uid, {
              type: 'deposit',
              amount: amt,
              method: 'bkash',
              accountNumber: userProfile?.phoneNumber || '01712-345678',
              status: 'completed',
              trxId: 'DEP' + Math.random().toString(36).substring(2, 9).toUpperCase(),
            });
          }
        }}
        onWithdrawFunds={(amt) => {
          updateBalanceAndSync((prev) => Math.max(0, Math.round((prev - amt) * 100) / 100));
          if (currentUser && currentUser.provider === 'google') {
            recordWalletTransaction(currentUser.uid, {
              type: 'withdraw',
              amount: amt,
              method: 'bkash',
              accountNumber: userProfile?.phoneNumber || '01712-345678',
              status: 'completed',
              trxId: 'WTH' + Math.random().toString(36).substring(2, 9).toUpperCase(),
            });
          }
        }}
        onResetBalance={() => {
          updateBalanceAndSync(() => INITIAL_BALANCE);
        }}
        lang={lang}
        userPhone={userProfile?.phoneNumber}
        currentUser={currentUser}
        userProfile={userProfile}
        onOpenAdminPanel={() => setIsAdminOpen(true)}
        onOpenAuth={(notice) => handleRequireAuth(notice || 'এড মানি করতে প্রথমে একাউন্ট তৈরি করুন!')}
      />

      <RulesModal
        isOpen={isRulesOpen}
        onClose={() => setIsRulesOpen(false)}
        lang={lang}
      />

      <AuthModal
        isOpen={isAuthOpen}
        onClose={() => {
          setIsAuthOpen(false);
          setAuthNoticeMessage(null);
        }}
        currentUser={currentUser}
        userProfile={userProfile}
        noticeMessage={authNoticeMessage}
        onLoginSuccess={(user, profile) => {
          setCurrentUser(user);
          setUserProfile(profile);
          setBalance(profile.balance);
          setAuthNoticeMessage(null);
        }}
        onLogoutSuccess={() => {
          setCurrentUser(null);
          setUserProfile(null);
          setBalance(INITIAL_BALANCE);
          setAuthNoticeMessage(null);
        }}
        onResetBalance={() => {
          updateBalanceAndSync(() => 0);
        }}
        onUpdatePhone={(phone) => {
          setUserProfile((p) => (p ? { ...p, phoneNumber: phone } : null));
        }}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
      />

      <AdminPanel
        isOpen={isAdminOpen}
        onClose={() => setIsAdminOpen(false)}
        initialTab={adminPanelInitialTab}
        onBalanceAdjusted={() => {
          // If phone session exists, refresh state
          const currentPhoneSession = getActivePhoneSession();
          if (currentPhoneSession && currentUser?.uid === currentPhoneSession.user.uid) {
            setBalance(currentPhoneSession.profile.balance);
            setUserProfile(currentPhoneSession.profile);
          }
        }}
      />

      {/* PWA Mobile App Install Modal */}
      <PWAInstallModal
        isOpen={isInstallModalOpen}
        onClose={() => setIsInstallModalOpen(false)}
        onOpenAndroidStudio={() => setIsAndroidStudioOpen(true)}
      />

      {/* Android Studio Export & APK Generation Guide Modal */}
      <AndroidStudioExportModal
        isOpen={isAndroidStudioOpen}
        onClose={() => setIsAndroidStudioOpen(false)}
      />

      {/* 3-Line Top Left Mobile Side Drawer Menu */}
      <MobileSideDrawer
        isOpen={isSideDrawerOpen}
        onClose={() => setIsSideDrawerOpen(false)}
        currentUser={currentUser}
        userProfile={userProfile}
        balance={balance}
        activeGameTab={activeGameTab}
        onChangeGameTab={(tab) => setActiveGameTab(tab)}
        onOpenAuth={() => {
          setAuthNoticeMessage(null);
          setIsAuthOpen(true);
        }}
        onOpenDeposit={handleOpenDeposit}
        onOpenWithdraw={handleOpenWithdraw}
        onOpenRules={() => setIsRulesOpen(true)}
        onOpenAdmin={() => setIsAdminOpen(true)}
        isPredictorOpen={isPredictorOpen}
        onTogglePredictor={() => setIsPredictorOpen((prev) => !prev)}
        isMuted={isMuted}
        onToggleSound={() => {
          const next = !isMuted;
          setIsMuted(next);
          soundManager.setMuted(next);
        }}
        lang={lang}
        onToggleLang={() => setLang((prev) => (prev === 'bn' ? 'en' : 'bn'))}
        onOpenInstallModal={() => setIsInstallModalOpen(true)}
        onRequireAuth={handleRequireAuth}
        onExitApp={() => setIsExitModalOpen(true)}
      />

      {/* Phone Default Back Button & Double Back / Double Click Exit Confirmation Modal */}
      <ExitModal
        isOpen={isExitModalOpen}
        onClose={() => setIsExitModalOpen(false)}
        onConfirmExit={handleExitApp}
      />

      {/* 1-Second Initial Mobile Splash Screen */}
      {showSplash && (
        <SplashScreen onFinish={handleFinishSplash} />
      )}
      </div>
    </div>
  );
}
