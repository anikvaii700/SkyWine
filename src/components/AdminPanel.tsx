import React, { useState, useEffect } from 'react';
import {
  X,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  Copy,
  Check,
  RefreshCw,
  Phone,
  Save,
  AlertTriangle,
  Lock,
  Unlock,
  Coins,
  ArrowUpRight,
  ArrowDownLeft,
  Clock,
  Search,
  Filter,
  DollarSign,
  Smartphone,
  Eye,
  EyeOff,
  UserCheck,
  Send,
  User as UserIcon,
  Edit3,
  History,
  KeyRound,
  Globe,
  ExternalLink,
  Download,
  Megaphone,
  Bell,
  Volume2,
} from 'lucide-react';
import {
  SystemPaymentSettings,
  ManualDepositRequest,
  ManualWithdrawalRequest,
  getStoredPaymentSettings,
  savePaymentSettings,
  getStoredDepositRequests,
  approveManualDepositRequest,
  rejectManualDepositRequest,
  syncDepositRequestsFromFirestore,
  syncPaymentSettingsFromFirestore,
  getStoredWithdrawalRequests,
  completeManualWithdrawalRequest,
  rejectManualWithdrawalRequest,
  syncWithdrawalRequestsFromFirestore,
} from '../services/manualPayment';
import { soundManager } from '../services/audio';
import { UserFullHistoryModal } from './UserFullHistoryModal';
import { AdminUserEditModal } from './AdminUserEditModal';
import { AdminStealthGuideModal } from './AdminStealthGuideModal';
import { getAllAccountsWithStats, calculateWithdrawableBalance, syncUsersFromFirestore } from '../services/userManagement';
import { StoredPhoneAccount, getStoredPhoneAccounts } from '../services/phoneAuth';
import { setAdminVisible, getRegisteredAdminPhone, saveRegisteredAdminPhone } from '../services/adminAuth';
import { db } from '../services/firebase';
import { collection, onSnapshot } from 'firebase/firestore';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  onBalanceAdjusted?: () => void;
  initialTab?: 'requests' | 'withdrawals' | 'settings' | 'users' | 'marquee';
}

export const AdminPanel: React.FC<AdminPanelProps> = ({
  isOpen,
  onClose,
  onBalanceAdjusted,
  initialTab,
}) => {
  const [isAuthenticated, setIsAuthenticated] = useState<boolean>(false);
  const [pinInput, setPinInput] = useState<string>('');
  const [pinError, setPinError] = useState<string>('');
  const [showPin, setShowPin] = useState<boolean>(false);

  const [activeTab, setActiveTab] = useState<'requests' | 'withdrawals' | 'users' | 'marquee' | 'settings'>(initialTab || 'requests');

  useEffect(() => {
    if (initialTab && isOpen) {
      setActiveTab(initialTab);
    }
  }, [initialTab, isOpen]);
  const [filterStatus, setFilterStatus] = useState<'all' | 'pending' | 'approved' | 'rejected'>('pending');
  const [searchQuery, setSearchQuery] = useState<string>('');

  // User History & Edit Modal states
  const [selectedHistoryUserId, setSelectedHistoryUserId] = useState<string | null>(null);
  const [editingAccount, setEditingAccount] = useState<StoredPhoneAccount | null>(null);
  const [userSearchQuery, setUserSearchQuery] = useState<string>('');
  const [accountsWithStats, setAccountsWithStats] = useState<ReturnType<typeof getAllAccountsWithStats>>([]);
  const [copiedCredentialId, setCopiedCredentialId] = useState<string | null>(null);

  // Withdrawal tab state
  const [withdrawals, setWithdrawals] = useState<ManualWithdrawalRequest[]>(getStoredWithdrawalRequests);
  const [withdrawFilterStatus, setWithdrawFilterStatus] = useState<'all' | 'pending' | 'completed' | 'rejected'>('pending');
  const [withdrawSearchQuery, setWithdrawSearchQuery] = useState<string>('');
  const [copiedPersonalNumber, setCopiedPersonalNumber] = useState<string | null>(null);

  // Reject withdrawal modal state
  const [rejectingWithdrawalId, setRejectingWithdrawalId] = useState<string | null>(null);
  const [rejectWithdrawalReason, setRejectWithdrawalReason] = useState<string>('ভুল বা অসত্য পার্সোনাল নম্বর');

  // Complete withdrawal confirmation state
  const [completingWithdrawal, setCompletingWithdrawal] = useState<ManualWithdrawalRequest | null>(null);
  const [completeAdminNote, setCompleteAdminNote] = useState<string>('টাকা সেন্ড করা হয়েছে');

  const [settings, setSettings] = useState<SystemPaymentSettings>(getStoredPaymentSettings);
  const [requests, setRequests] = useState<ManualDepositRequest[]>(getStoredDepositRequests);
  const [isSavingSettings, setIsSavingSettings] = useState<boolean>(false);
  const [saveSuccessMsg, setSaveSuccessMsg] = useState<string>('');

  // Prominent Floating Action Notification Toast
  interface AdminActionToast {
    id: string;
    type: 'success' | 'error' | 'info';
    title: string;
    message: string;
  }
  const [actionToast, setActionToast] = useState<AdminActionToast | null>(null);
  const toastTimeoutRef = React.useRef<any>(null);

  const showAdminToast = (title: string, message: string, type: 'success' | 'error' | 'info' = 'success') => {
    if (toastTimeoutRef.current) clearTimeout(toastTimeoutRef.current);
    setActionToast({
      id: Date.now().toString(),
      type,
      title,
      message,
    });
    if (type === 'success') {
      soundManager.playWin();
    } else {
      soundManager.playClick();
    }
    if (typeof window !== 'undefined' && 'Notification' in window && Notification.permission === 'granted') {
      try {
        new Notification(title, {
          body: message,
          icon: '/pwa-192x192.png',
        });
      } catch {}
    }
    toastTimeoutRef.current = setTimeout(() => {
      setActionToast(null);
    }, 4500);
  };

  const [copiedTrxId, setCopiedTrxId] = useState<string | null>(null);
  const [copiedShareLink, setCopiedShareLink] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState<boolean>(false);

  // Reject deposit modal state
  const [rejectingRequestId, setRejectingRequestId] = useState<string | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('ভুল বা অসত্য ট্রানজেকশন আইডি');

  // Stealth Admin Mode & Admin Phone state
  const [adminPhone, setAdminPhone] = useState<string>(() => getRegisteredAdminPhone());
  const [adminPhoneSavedMsg, setAdminPhoneSavedMsg] = useState<string>('');
  const [showStealthGuideModal, setShowStealthGuideModal] = useState<boolean>(false);

  // Admin PIN Change States (Step 1: Old PIN confirm -> Step 2: New PIN with * masking)
  const [showPinChange, setShowPinChange] = useState<boolean>(false);
  const [oldPinInput, setOldPinInput] = useState<string>('');
  const [isOldPinConfirmed, setIsOldPinConfirmed] = useState<boolean>(false);
  const [newPin, setNewPin] = useState<string>('');
  const [pinChangeError, setPinChangeError] = useState<string>('');
  const [pinChangeMsg, setPinChangeMsg] = useState<string>('');
  const [showOldPinToggle, setShowOldPinToggle] = useState<boolean>(false);
  const [showNewPinToggle, setShowNewPinToggle] = useState<boolean>(false);
  const [revealStoredPin, setRevealStoredPin] = useState<boolean>(false); // default false: masked with '*'

  // Local phone accounts list for Tab 3
  const [localAccounts, setLocalAccounts] = useState<Array<{ uid: string; phone: string; name: string; balance: number }>>([]);
  const [manualAddAmount, setManualAddAmount] = useState<number>(500);

  // Marquee announcement text state
  const [marqueeNotice, setMarqueeNotice] = useState<string>(
    () => localStorage.getItem('aviator_marquee_text') || '🎉 স্বাগতম অ্যাভিয়েটর অফিসিয়াল মোবাইল গেমে! ৳ ৫০০ ডিপোজিট করলেই পাচ্ছেন আকর্ষণীয় বোনাস! বিকাশ, নগদ ও রকেটে ১-৩ মিনিটে দ্রুত পেমেন্ট সম্পন্ন হয়। উপভোগ করুন সেরা ক্র্যাশ গেম ও সেরা জয়! 🚀'
  );

  // Load and subscribe to requests & settings
  const reloadData = () => {
    setRequests(getStoredDepositRequests());
    setWithdrawals(getStoredWithdrawalRequests());
    setSettings(getStoredPaymentSettings());
    setAccountsWithStats(getAllAccountsWithStats());

    // Load local phone accounts
    try {
      const raw = localStorage.getItem('aviator_phone_accounts_v1');
      if (raw) {
        const parsed = JSON.parse(raw);
        const list = Object.keys(parsed).map((k) => ({
          uid: parsed[k].uid,
          phone: parsed[k].phoneNumber,
          name: parsed[k].displayName,
          balance: parsed[k].balance || 0,
        }));
        setLocalAccounts(list);
      }
    } catch {}
  };

  useEffect(() => {
    if (isOpen) {
      reloadData();
      // Attempt background sync
      syncPaymentSettingsFromFirestore().then((s) => {
        setSettings(s);
        if (s.marqueeNotice) setMarqueeNotice(s.marqueeNotice);
      });
      syncDepositRequestsFromFirestore().then((r) => setRequests(r));
      syncWithdrawalRequestsFromFirestore().then((w) => setWithdrawals(w));
      syncUsersFromFirestore().then((u) => setAccountsWithStats(u));

      try {
        const unsub = onSnapshot(collection(db, 'users'), () => {
          syncUsersFromFirestore().then((u) => setAccountsWithStats(u));
        });
        return () => unsub();
      } catch {}
    }
  }, [isOpen]);

  useEffect(() => {
    const handleRequestsUpdated = () => setRequests(getStoredDepositRequests());
    const handleWithdrawalsUpdated = () => setWithdrawals(getStoredWithdrawalRequests());
    const handleSettingsUpdated = () => {
      const s = getStoredPaymentSettings();
      setSettings(s);
      if (s.marqueeNotice) setMarqueeNotice(s.marqueeNotice);
    };
    const handleAccountsUpdated = () => setAccountsWithStats(getAllAccountsWithStats());
    const handleBalanceCredited = () => {
      reloadData();
      if (onBalanceAdjusted) onBalanceAdjusted();
    };

    window.addEventListener('deposit_requests_updated', handleRequestsUpdated);
    window.addEventListener('withdrawal_requests_updated', handleWithdrawalsUpdated);
    window.addEventListener('payment_settings_updated', handleSettingsUpdated);
    window.addEventListener('accounts_updated', handleAccountsUpdated);
    window.addEventListener('balance_credited', handleBalanceCredited);

    return () => {
      window.removeEventListener('deposit_requests_updated', handleRequestsUpdated);
      window.removeEventListener('withdrawal_requests_updated', handleWithdrawalsUpdated);
      window.removeEventListener('payment_settings_updated', handleSettingsUpdated);
      window.removeEventListener('accounts_updated', handleAccountsUpdated);
      window.removeEventListener('balance_credited', handleBalanceCredited);
    };
  }, [onBalanceAdjusted]);

  if (!isOpen) return null;

  // Handle PIN verification (Strict check against currently saved admin PIN)
  const handlePinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Always fetch fresh settings from storage to ensure latest active PIN
    const latestSettings = getStoredPaymentSettings();
    const activeAdminPin = (latestSettings.adminPin || settings.adminPin || '1234').trim();
    if (pinInput.trim() === activeAdminPin) {
      setIsAuthenticated(true);
      setPinError('');
      soundManager.playClick();
    } else {
      setPinError('ভুল এডমিন পিন! অনুগ্রহ করে আপনার সঠিক সিক্রেট পিন দিন।');
      soundManager.playCrash();
    }
  };

  // Handle Save Admin Phone Number
  const handleSaveAdminPhone = () => {
    saveRegisteredAdminPhone(adminPhone);
    setAdminPhoneSavedMsg('এডমিন ফোন নম্বর সংরক্ষিত হয়েছে! এই নম্বর দিয়ে লগইন করলে এডমিন মোড স্বয়ংক্রিয়ভাবে সক্রিয় হবে।');
    soundManager.playWin();
    showAdminToast(
      'এডমিন ফোন নম্বর সংরক্ষিত হয়েছে!',
      `+88 ${adminPhone} নম্বর দিয়ে লগইন করলে এডমিন সুবিধা স্বয়ংক্রিয়ভাবে সক্রিয় থাকবে।`,
      'success'
    );
    setTimeout(() => setAdminPhoneSavedMsg(''), 4500);
  };

  // Mask helper:
  // শুরুতে ****** এমন থাকবে (সবগুলো '*')
  // ভিও এ ক্লিক করলে শুধু প্রথম ও শেষ অক্ষর দেখাবে বাকিগুলো '*' থাকবে (যেমন: 2****0)
  // পুরো পিন (যেমন: 224700) কোনো অবস্থাতেই সম্পূর্ণ দৃশ্যমান হবে না।
  const getMaskedPin = (pin: string, isViewClicked: boolean = false) => {
    const target = (pin || '1234').trim();
    if (!isViewClicked) {
      // শুরুতে ****** এমন থাকবে
      return '*'.repeat(target.length);
    }
    // ভিও এ ক্লিক করলে শুধু প্রথম ও শেষ অক্ষর দেখাবে বাকিগুলো * থাকবে
    if (target.length <= 2) {
      return target;
    }
    const firstChar = target[0];
    const lastChar = target[target.length - 1];
    const middleStars = '*'.repeat(target.length - 2);
    return `${firstChar}${middleStars}${lastChar}`;
  };

  // Step 1: Verify Current PIN (শুধুমাত্র বর্তমান সক্রিয় পিন গ্রহণ করবে)
  const handleVerifyOldPin = () => {
    setPinChangeError('');
    setPinChangeMsg('');
    const latestSettings = getStoredPaymentSettings();
    const activeAdminPin = (latestSettings.adminPin || settings.adminPin || '1234').trim();
    if (oldPinInput.trim() === activeAdminPin) {
      setIsOldPinConfirmed(true);
      setPinChangeError('');
      soundManager.playWin();
    } else {
      setPinChangeError('ভুল বর্তমান পিন! সঠিক বর্তমান পিন দিয়ে কনফার্ম করুন।');
      soundManager.playCrash();
    }
  };

  // Step 2: Save New PIN after verification ("নতুন পিন দিয়ে আপডেট হবে")
  const handleSaveNewPin = async () => {
    setPinChangeError('');
    if (!isOldPinConfirmed) {
      setPinChangeError('প্রথমে বর্তমান পিন দিয়ে কনফার্ম করুন');
      return;
    }
    const cleanNewPin = newPin.trim();
    if (cleanNewPin.length < 4) {
      setPinChangeError('নতুন পিন ন্যূনতম ৪ সংখ্যার হতে হবে');
      soundManager.playCrash();
      return;
    }
    try {
      const updated = { ...settings, adminPin: cleanNewPin };
      setSettings(updated);
      await savePaymentSettings(updated);
      // পিন আপডেট বার্তা: শুধু প্রথম ও শেষ অক্ষর দেখাবে, বাকিগুলো *
      const maskedPreview = getMaskedPin(cleanNewPin, true);
      const msg = `নতুন পিন সফলভাবে আপডেট হয়েছে! বর্তমান পিন: ${maskedPreview}`;
      setPinChangeMsg(msg);
      showAdminToast('এডমিন পিন পরিবর্তন সফল!', msg, 'success');
      setNewPin('');
      setOldPinInput('');
      setIsOldPinConfirmed(false);
      setTimeout(() => {
        setPinChangeMsg('');
      }, 5000);
    } catch {
      setPinChangeError('পিন আপডেট করতে সমস্যা হয়েছে। আবার চেষ্টা করুন।');
      showAdminToast('পিন পরিবর্তন ব্যর্থ', 'আবার চেষ্টা করুন।', 'error');
    }
  };

  const handleResetPinChangeForm = () => {
    setOldPinInput('');
    setNewPin('');
    setIsOldPinConfirmed(false);
    setPinChangeError('');
    setPinChangeMsg('');
  };

  // Handle Save Numbers & Settings
  const handleSaveSettings = async () => {
    setIsSavingSettings(true);
    setSaveSuccessMsg('');
    try {
      const mergedSettings = {
        ...settings,
        marqueeNotice,
      };
      await savePaymentSettings(mergedSettings);
      localStorage.setItem('aviator_marquee_text', marqueeNotice);
      window.dispatchEvent(new Event('marquee_text_updated'));
      const msg = 'সেটিংস ও স্ক্রোলিং শিরোনাম সফলভাবে সংরক্ষিত ও ক্লাউডে আপডেট হয়েছে!';
      setSaveSuccessMsg(msg);
      showAdminToast(
        'সফলভাবে সংরক্ষিত ও ক্লাউডে আপডেট হয়েছে!',
        'আপনার নতুন শিরোনাম ও পেমেন্ট সেটিংস ফায়ারবেস ক্লাউডে সেভ হয়েছে এবং সকল ইউজারের ফোনে এখনই লাইভ পরিবর্তন হয়ে গেছে।',
        'success'
      );
      setTimeout(() => setSaveSuccessMsg(''), 5000);
    } catch (e) {
      console.error(e);
      showAdminToast('সংরক্ষণ ব্যর্থ হয়েছে', 'ইন্টারনেট কানেকশন চেক করে আবার চেষ্টা করুন।', 'error');
    } finally {
      setIsSavingSettings(false);
    }
  };

  // Handle Approve Request
  const handleApprove = async (req: ManualDepositRequest) => {
    soundManager.playClick();
    const res = await approveManualDepositRequest(req.id, 'Approved via Admin Panel');
    if (res.success) {
      reloadData();
      if (onBalanceAdjusted) onBalanceAdjusted();
      showAdminToast(
        'ডিপোজিট সফলভাবে অনুমোদিত!',
        `গ্রাহক ${req.userIdentifier}-এর একাউন্টে ৳${req.amount.toLocaleString()} ব্যালেন্স সফলভাবে যোগ করা হয়েছে।`,
        'success'
      );
    } else {
      showAdminToast('অনুমোদনে সমস্যা হয়েছে', res.error || 'অনুমোদন ব্যর্থ হয়েছে', 'error');
    }
  };

  // Handle Reject Request
  const handleReject = async () => {
    if (!rejectingRequestId) return;
    soundManager.playClick();
    const res = await rejectManualDepositRequest(rejectingRequestId, rejectReason);
    if (res.success) {
      setRejectingRequestId(null);
      reloadData();
      showAdminToast(
        'ডিপোজিট রিকোয়েস্ট বাতিল করা হয়েছে',
        'বাতিলের তথ্য সফলভাবে ক্লাউডে রেকর্ড করা হয়েছে।',
        'error'
      );
    } else {
      showAdminToast('বাতিল করতে সমস্যা হয়েছে', res.error || 'বাতিল ব্যর্থ হয়েছে', 'error');
    }
  };

  // Handle Manual Add Balance to Phone Account
  const handleDirectCreditPhoneAccount = (phone: string, amount: number) => {
    try {
      const raw = localStorage.getItem('aviator_phone_accounts_v1');
      if (raw) {
        const accounts = JSON.parse(raw);
        if (accounts[phone]) {
          accounts[phone].balance = (accounts[phone].balance || 0) + amount;
          accounts[phone].updatedAt = new Date().toISOString();
          localStorage.setItem('aviator_phone_accounts_v1', JSON.stringify(accounts));
          reloadData();
          window.dispatchEvent(new CustomEvent('balance_credited', { detail: { userId: accounts[phone].uid, amount } }));
          if (onBalanceAdjusted) onBalanceAdjusted();
          showAdminToast(
            'ব্যালেন্স যোগ সফল হয়েছে!',
            `+88 ${phone} একাউন্টে ৳${amount.toLocaleString()} সফলভাবে যোগ করা হয়েছে।`,
            'success'
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Manual Reset Balance
  const handleDirectResetPhoneAccount = (phone: string) => {
    try {
      const raw = localStorage.getItem('aviator_phone_accounts_v1');
      if (raw) {
        const accounts = JSON.parse(raw);
        if (accounts[phone]) {
          accounts[phone].balance = 0;
          accounts[phone].updatedAt = new Date().toISOString();
          localStorage.setItem('aviator_phone_accounts_v1', JSON.stringify(accounts));
          reloadData();
          window.dispatchEvent(new CustomEvent('balance_credited', { detail: { userId: accounts[phone].uid, amount: 0 } }));
          if (onBalanceAdjusted) onBalanceAdjusted();
          showAdminToast(
            'ব্যালেন্স রিসেট সম্পন্ন',
            `+88 ${phone} একাউন্টের ব্যালেন্স ০ টাকা করা হয়েছে।`,
            'info'
          );
        }
      }
    } catch (err) {
      console.error(err);
    }
  };

  // Handle Refresh from Firestore
  const handleRefresh = async () => {
    setIsRefreshing(true);
    soundManager.playClick();
    try {
      const updatedReqs = await syncDepositRequestsFromFirestore();
      const updatedWithdrawals = await syncWithdrawalRequestsFromFirestore();
      const updatedSettings = await syncPaymentSettingsFromFirestore();
      setRequests(updatedReqs);
      setWithdrawals(updatedWithdrawals);
      setSettings(updatedSettings);
      showAdminToast(
        'ক্লাউড ডাটা রিফ্রেশ সম্পন্ন!',
        'ফায়ারবেস ক্লাউড থেকে সর্বশেষ সকল রিকোয়েস্ট ও সেটিংস আপডেট করা হয়েছে।',
        'info'
      );
    } finally {
      setIsRefreshing(false);
    }
  };

  // Copy TrxID
  const handleCopyTrx = (trxId: string) => {
    navigator.clipboard.writeText(trxId);
    setCopiedTrxId(trxId);
    soundManager.playClick();
    showAdminToast('TrxID কপি হয়েছে!', trxId, 'info');
    setTimeout(() => setCopiedTrxId(null), 2000);
  };

  // Copy User Personal Number
  const handleCopyPersonalNum = (num: string) => {
    navigator.clipboard.writeText(num.replace(/[^0-9]/g, ''));
    setCopiedPersonalNumber(num);
    soundManager.playClick();
    showAdminToast('পার্সোনাল নম্বর কপি হয়েছে!', num, 'info');
    setTimeout(() => setCopiedPersonalNumber(null), 2000);
  };

  // Complete Withdrawal Request (Mark as sent)
  const handleCompleteWithdrawal = async (req: ManualWithdrawalRequest, note?: string) => {
    soundManager.playClick();
    const res = await completeManualWithdrawalRequest(req.id, note || 'টাকা সফলভাবে পাঠানো হয়েছে');
    if (res.success) {
      setCompletingWithdrawal(null);
      reloadData();
      showAdminToast(
        'উত্তোলন সফলভাবে সম্পন্ন!',
        `নম্বর ${req.personalNumber}-এ ৳${req.amount.toLocaleString()} পাঠানো নিশ্চিত করা হয়েছে।`,
        'success'
      );
    } else {
      showAdminToast('উত্তোলন সম্পন্ন করতে সমস্যা হয়েছে', res.error || 'ব্যর্থ হয়েছে', 'error');
    }
  };

  // Reject Withdrawal Request (Refund back to wallet)
  const handleRejectWithdrawalConfirm = async () => {
    if (!rejectingWithdrawalId) return;
    soundManager.playClick();
    const res = await rejectManualWithdrawalRequest(rejectingWithdrawalId, rejectWithdrawalReason);
    if (res.success) {
      soundManager.playCrash();
      setRejectingWithdrawalId(null);
      setRejectWithdrawalReason('ভুল বা অসত্য পার্সোনাল নম্বর');
      reloadData();
      if (onBalanceAdjusted) onBalanceAdjusted();
      showAdminToast(
        'উত্তোলন রিকোয়েস্ট বাতিল করা হয়েছে',
        'টাকা স্বয়ংক্রিয়ভাবে গ্রাহকের ওয়ালেটে ফেরত যোগ হয়েছে।',
        'error'
      );
    } else {
      showAdminToast('বাতিল করতে সমস্যা হয়েছে', res.error || 'ব্যর্থ হয়েছে', 'error');
    }
  };

  // Filter requests
  const filteredRequests = requests.filter((r) => {
    if (filterStatus !== 'all' && r.status !== filterStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        r.trxId.toLowerCase().includes(q) ||
        r.senderNumber.toLowerCase().includes(q) ||
        r.userIdentifier.toLowerCase().includes(q) ||
        (r.userCode && r.userCode.toLowerCase().includes(q)) ||
        r.amount.toString().includes(q)
      );
    }
    return true;
  });

  // Filter withdrawals
  const filteredWithdrawals = withdrawals.filter((w) => {
    if (withdrawFilterStatus !== 'all' && w.status !== withdrawFilterStatus) return false;
    if (withdrawSearchQuery.trim()) {
      const q = withdrawSearchQuery.toLowerCase();
      return (
        w.personalNumber.toLowerCase().includes(q) ||
        w.userIdentifier.toLowerCase().includes(q) ||
        (w.userCode && w.userCode.toLowerCase().includes(q)) ||
        w.amount.toString().includes(q) ||
        w.method.toLowerCase().includes(q)
      );
    }
    return true;
  });

  // Filter accounts for Users tab
  const filteredAccounts = accountsWithStats.filter((acc) => {
    if (!userSearchQuery.trim()) return true;
    const q = userSearchQuery.toLowerCase();
    return (
      acc.userCode.toLowerCase().includes(q) ||
      acc.phoneNumber.includes(q) ||
      acc.displayName.toLowerCase().includes(q) ||
      acc.referralCode.toLowerCase().includes(q)
    );
  });

  const pendingCount = requests.filter((r) => r.status === 'pending').length;
  const approvedCount = requests.filter((r) => r.status === 'approved').length;
  const totalApprovedAmount = requests
    .filter((r) => r.status === 'approved')
    .reduce((sum, r) => sum + r.amount, 0);

  const pendingWithdrawalCount = withdrawals.filter((w) => w.status === 'pending').length;
  const completedWithdrawalCount = withdrawals.filter((w) => w.status === 'completed').length;
  const totalCompletedWithdrawalAmount = withdrawals
    .filter((w) => w.status === 'completed')
    .reduce((sum, w) => sum + w.amount, 0);
  const totalPendingActionCount = pendingCount + pendingWithdrawalCount;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 backdrop-blur-sm p-2 sm:p-4 animate-fadeIn">
      <div className="bg-[#0e1420] border border-[#223048] rounded-3xl max-w-4xl w-full shadow-2xl text-white relative max-h-[94vh] flex flex-col overflow-hidden">
        {/* ==================== PROMINENT FLOATING ACTION NOTIFICATION TOAST ==================== */}
        {actionToast && (
          <div className="fixed top-5 left-1/2 -translate-x-1/2 z-[99999] max-w-lg w-[94%] sm:w-[500px] shadow-2xl pointer-events-auto animate-in fade-in slide-in-from-top-3 duration-300">
            <div
              className={`p-4 rounded-2xl border-2 backdrop-blur-xl flex items-start gap-3 shadow-2xl transition-all ${
                actionToast.type === 'success'
                  ? 'bg-[#091a13]/98 border-emerald-400 text-emerald-100 shadow-emerald-950/90 ring-4 ring-emerald-500/20'
                  : actionToast.type === 'error'
                  ? 'bg-[#220d11]/98 border-rose-400 text-rose-100 shadow-rose-950/90 ring-4 ring-rose-500/20'
                  : 'bg-[#0f1827]/98 border-cyan-400 text-cyan-100 shadow-cyan-950/90 ring-4 ring-cyan-500/20'
              }`}
            >
              <div
                className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 font-bold shadow-md ${
                  actionToast.type === 'success'
                    ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-400/60'
                    : actionToast.type === 'error'
                    ? 'bg-rose-500/30 text-rose-300 border border-rose-400/60'
                    : 'bg-cyan-500/30 text-cyan-300 border border-cyan-400/60'
                }`}
              >
                {actionToast.type === 'success' ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-300 animate-pulse" />
                ) : actionToast.type === 'error' ? (
                  <XCircle className="w-6 h-6 text-rose-300" />
                ) : (
                  <Bell className="w-6 h-6 text-cyan-300" />
                )}
              </div>

              <div className="flex-1 min-w-0 pr-1">
                <div className="flex items-center gap-2">
                  <h4 className="font-black text-sm text-white tracking-wide">{actionToast.title}</h4>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded-full font-black uppercase tracking-wider ${
                      actionToast.type === 'success'
                        ? 'bg-emerald-500/30 text-emerald-300 border border-emerald-500/40'
                        : actionToast.type === 'error'
                        ? 'bg-rose-500/30 text-rose-300 border border-rose-500/40'
                        : 'bg-cyan-500/30 text-cyan-300 border border-cyan-500/40'
                    }`}
                  >
                    {actionToast.type === 'success' ? 'সফল হয়েছে' : actionToast.type === 'error' ? 'বাতিল' : 'আপডেট'}
                  </span>
                </div>
                <p className="text-xs text-slate-200 mt-1 leading-snug font-medium">{actionToast.message}</p>
              </div>

              <button
                type="button"
                onClick={() => setActionToast(null)}
                className="p-1.5 rounded-lg hover:bg-white/10 text-slate-400 hover:text-white transition-colors cursor-pointer shrink-0"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* Top Header */}
        <div className="p-4 sm:p-5 border-b border-[#1b263b] flex items-center justify-between bg-gradient-to-r from-[#111927] to-[#141e30]">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-amber-500/20 text-amber-400 border border-amber-500/30 flex items-center justify-center shadow-lg">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-base sm:text-lg font-black tracking-wide">এডমিন কন্ট্রোল প্যানেল (Admin Panel)</h2>
                {pendingCount > 0 && (
                  <span className="px-2 py-0.5 rounded-full bg-amber-500/20 border border-amber-500/50 text-amber-300 font-bold text-xs animate-pulse">
                    {pendingCount} টি অপেক্ষমান
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">ম্যানুয়াল বিকাশ, নগদ, রকেট নম্বর সেটআপ ও ডিপোজিট অনুমোদন</p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 sm:gap-2">
            {isAuthenticated && (
              <>
                {/* Secret Access Guide Button */}
                <button
                  onClick={() => setShowStealthGuideModal(true)}
                  className="px-2.5 py-1.5 rounded-xl bg-amber-500/15 hover:bg-amber-500/25 border border-amber-500/40 text-amber-300 flex items-center gap-1.5 text-xs font-bold transition-all cursor-pointer"
                  title="অনলাইনে পাবলিশিং ও গোপন এডমিন এক্সেস নির্দেশিকা"
                >
                  <KeyRound className="w-3.5 h-3.5" />
                  <span className="hidden md:inline">সিক্রেট গাইড</span>
                </button>

                <button
                  onClick={handleRefresh}
                  disabled={isRefreshing}
                  className="p-2 rounded-xl bg-[#1a2538] hover:bg-[#24334c] text-slate-300 hover:text-white transition-all flex items-center gap-1.5 text-xs font-semibold"
                  title="রিফ্রেশ করুন"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${isRefreshing ? 'animate-spin text-amber-400' : ''}`} />
                  <span className="hidden sm:inline">রিফ্রেশ</span>
                </button>
              </>
            )}
            <button
              onClick={onClose}
              className="w-9 h-9 rounded-full bg-[#1a2538] hover:bg-[#25344e] text-slate-300 hover:text-white flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* ==================== PIN PROTECTION SCREEN ==================== */}
        {!isAuthenticated ? (
          <div className="p-6 sm:p-12 flex flex-col items-center justify-center text-center max-w-md mx-auto my-auto">
            <div className="w-16 h-16 rounded-3xl bg-amber-500/10 border border-amber-500/30 flex items-center justify-center text-amber-400 mb-4 shadow-xl">
              <Lock className="w-8 h-8" />
            </div>
            <h3 className="text-lg sm:text-xl font-bold mb-1">অ্যাডমিন প্রমাণীকরণ (Admin Login)</h3>
            <p className="text-xs text-slate-400 mb-6">
              পেমেন্ট নম্বর পরিচালনা, ডিপোজিট-উত্তোলন অনুমোদন ও ইউজার কন্ট্রোলের জন্য আপনার সিক্রেট এডমিন পিন দিন।
            </p>

            <form onSubmit={handlePinSubmit} className="w-full space-y-4">
              <div className="relative">
                <input
                  type={showPin ? 'text' : 'password'}
                  maxLength={10}
                  value={pinInput}
                  onChange={(e) => {
                    setPinInput(e.target.value);
                    setPinError('');
                  }}
                  placeholder="গোপন এডমিন পিন লিখুন"
                  autoFocus
                  className="w-full bg-[#0a0e17] border border-[#24334c] rounded-2xl px-4 py-3 text-center text-lg font-mono tracking-widest text-white focus:outline-hidden focus:border-amber-500 focus:ring-1 focus:ring-amber-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPin(!showPin)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white"
                >
                  {showPin ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>

              {pinError && (
                <div className="flex items-center justify-center gap-1.5 text-xs text-rose-400 font-medium">
                  <AlertTriangle className="w-3.5 h-3.5" />
                  <span>{pinError}</span>
                </div>
              )}

              <button
                type="submit"
                className="w-full py-3 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-[#120e00] font-black text-sm uppercase tracking-wider rounded-2xl shadow-lg shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <Unlock className="w-4 h-4 font-bold" />
                <span>লগইন করুন</span>
              </button>
            </form>
          </div>
        ) : (
          /* ==================== AUTHENTICATED ADMIN PANEL ==================== */
          <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
            {/* Stats Cards */}
            <div className="p-3 sm:p-4 bg-[#0a0e16] border-b border-[#1b2537] grid grid-cols-2 sm:grid-cols-4 gap-2 sm:gap-3 shrink-0">
              <div className="bg-[#121a28] border border-[#202d44] rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center shrink-0">
                  <ArrowUpRight className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400">ডিপোজিট পেন্ডিং</p>
                  <p className="text-base sm:text-lg font-black text-emerald-400 font-mono-numbers">
                    {pendingCount} টি
                  </p>
                </div>
              </div>

              <div className="bg-[#121a28] border border-[#202d44] rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-rose-500/20 text-rose-400 flex items-center justify-center shrink-0">
                  <ArrowDownLeft className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400">উত্তোলন পেন্ডিং</p>
                  <p className="text-base sm:text-lg font-black text-rose-400 font-mono-numbers">
                    {pendingWithdrawalCount} টি
                  </p>
                </div>
              </div>

              <div className="bg-[#121a28] border border-[#202d44] rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-cyan-500/20 text-cyan-400 flex items-center justify-center shrink-0">
                  <Coins className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400">মোট ডিপোজিট অনুমোদন</p>
                  <p className="text-base sm:text-lg font-black text-cyan-400 font-mono-numbers truncate">
                    ৳ {totalApprovedAmount.toLocaleString()}
                  </p>
                </div>
              </div>

              <div className="bg-[#121a28] border border-[#202d44] rounded-2xl p-2.5 sm:p-3 flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-purple-500/20 text-purple-400 flex items-center justify-center shrink-0">
                  <Smartphone className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <p className="text-[11px] text-slate-400">মোট উত্তোলন সম্পন্ন</p>
                  <p className="text-base sm:text-lg font-black text-purple-400 font-mono-numbers truncate">
                    ৳ {totalCompletedWithdrawalAmount.toLocaleString()}
                  </p>
                </div>
              </div>
            </div>

            {/* Navigation Tabs */}
            <div className="px-3 sm:px-4 pt-3 border-b border-[#1b2537] flex items-center justify-between shrink-0 bg-[#0e1420] overflow-x-auto">
              <div className="flex gap-2">
                <button
                  onClick={() => {
                    soundManager.playClick();
                    setActiveTab('requests');
                  }}
                  className={`py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'requests'
                      ? 'bg-[#1e2a3f] text-white border-b-2 border-emerald-400 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-[#151e2e]'
                  }`}
                >
                  <ArrowUpRight className="w-4 h-4 text-emerald-400" />
                  <span>ডিপোজিট রিকোয়েস্ট</span>
                  {pendingCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-emerald-500 text-black font-black text-[10px] flex items-center justify-center">
                      {pendingCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setActiveTab('withdrawals');
                  }}
                  className={`py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'withdrawals'
                      ? 'bg-[#1e2a3f] text-white border-b-2 border-rose-400 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-[#151e2e]'
                  }`}
                >
                  <ArrowDownLeft className="w-4 h-4 text-rose-400" />
                  <span>উত্তোলন রিকোয়েস্ট</span>
                  {pendingWithdrawalCount > 0 && (
                    <span className="w-5 h-5 rounded-full bg-rose-500 text-white font-black text-[10px] flex items-center justify-center animate-pulse">
                      {pendingWithdrawalCount}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setActiveTab('users');
                  }}
                  className={`py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'users'
                      ? 'bg-[#1e2a3f] text-white border-b-2 border-cyan-400 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-[#151e2e]'
                  }`}
                >
                  <UserCheck className="w-4 h-4 text-cyan-400" />
                  <span>ইউজার লিস্ট ও হিস্ট্রি</span>
                  <span className="px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 font-bold text-[10px] border border-cyan-500/30">
                    {accountsWithStats.length}
                  </span>
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setActiveTab('marquee');
                  }}
                  className={`py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'marquee'
                      ? 'bg-[#1e2a3f] text-white border-b-2 border-amber-400 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-[#151e2e]'
                  }`}
                >
                  <Megaphone className="w-4 h-4 text-amber-400" />
                  <span>শিরোনাম ও নোটিশ এডিট</span>
                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 text-[10px] font-bold">
                    লাইভ
                  </span>
                </button>

                <button
                  onClick={() => {
                    soundManager.playClick();
                    setActiveTab('settings');
                  }}
                  className={`py-2 px-3 sm:px-4 rounded-xl font-bold text-xs sm:text-sm flex items-center gap-2 transition-all cursor-pointer whitespace-nowrap ${
                    activeTab === 'settings'
                      ? 'bg-[#1e2a3f] text-white border-b-2 border-emerald-400 shadow-md'
                      : 'text-slate-400 hover:text-white hover:bg-[#151e2e]'
                  }`}
                >
                  <Phone className="w-4 h-4 text-emerald-400" />
                  <span>পেমেন্ট নম্বর ও সিস্টেম</span>
                </button>
              </div>

              <button
                onClick={() => setShowPinChange(!showPinChange)}
                className="text-[11px] text-slate-400 hover:text-amber-300 flex items-center gap-1 px-2.5 py-1 rounded-lg bg-[#151e2e] hover:bg-[#1e2a3e] transition-colors"
                title="এডমিন পিন পরিবর্তন করুন"
              >
                <Lock className="w-3 h-3" />
                <span className="hidden sm:inline">পিন পরিবর্তন</span>
              </button>
            </div>

            {/* Quick Change PIN panel */}
            {showPinChange && (
              <div className="bg-[#121926] border-b border-[#24334c] p-3 sm:p-4 space-y-3 shrink-0 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#1f2b3e]">
                  <div className="flex items-center gap-2">
                    <KeyRound className="w-4 h-4 text-amber-400" />
                    <span className="text-xs font-bold text-white">এডমিন পিন পরিবর্তন</span>
                    <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-amber-500/20">
                      <span className="text-slate-400">বর্তমান পিন:</span>
                      <strong className="font-bold tracking-widest text-white text-xs">
                        {getMaskedPin(settings.adminPin || '1234', revealStoredPin)}
                      </strong>
                      <button
                        type="button"
                        onClick={() => setRevealStoredPin(!revealStoredPin)}
                        className="text-slate-400 hover:text-amber-300 ml-1 transition-colors cursor-pointer"
                        title={revealStoredPin ? 'পিন লুকান' : 'পিন দেখুন'}
                      >
                        {revealStoredPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </span>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      handleResetPinChangeForm();
                      setShowPinChange(false);
                    }}
                    className="text-slate-400 hover:text-white text-xs px-2.5 py-1 rounded-lg bg-[#182234] hover:bg-[#202d44] transition-colors cursor-pointer"
                  >
                    বন্ধ করুন
                  </button>
                </div>

                {/* Step 1: Verify Current PIN (পুরাতন পিন লিখুন এর ঘরে বর্তমান পিন হবে) */}
                {!isOldPinConfirmed ? (
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                      <span className="w-4 h-4 rounded-full bg-amber-500/20 text-amber-400 text-[10px] font-bold flex items-center justify-center border border-amber-500/40">১</span>
                      <span>বর্তমান পিন লিখুন:</span>
                    </span>

                    <div className="relative">
                      <input
                        type={showOldPinToggle ? 'text' : 'password'}
                        maxLength={10}
                        value={oldPinInput}
                        onChange={(e) => {
                          setOldPinInput(e.target.value);
                          setPinChangeError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleVerifyOldPin();
                        }}
                        placeholder="বর্তমান পিন"
                        autoFocus
                        className="bg-[#0b1019] border border-[#2b3a54] rounded-xl px-3 py-1.5 pr-8 text-xs text-white font-mono w-36 tracking-widest focus:outline-hidden focus:border-amber-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowOldPinToggle(!showOldPinToggle)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showOldPinToggle ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    <button
                      type="button"
                      onClick={handleVerifyOldPin}
                      className="px-3.5 py-1.5 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs rounded-xl shadow cursor-pointer active:scale-95 transition-all flex items-center gap-1"
                    >
                      <Check className="w-3.5 h-3.5 stroke-[3]" />
                      <span>কনফার্ম করুন</span>
                    </button>
                  </div>
                ) : (
                  /* Step 2: Set New PIN (নতুন পিন দিয়ে আপডেট হবে) */
                  <div className="flex flex-wrap items-center gap-2.5 bg-emerald-500/10 p-2.5 rounded-xl border border-emerald-500/30 animate-fadeIn">
                    <span className="text-xs font-semibold text-emerald-300 flex items-center gap-1.5">
                      <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                      <span>বর্তমান পিন নিশ্চিত! এবার নতুন পিন লিখুন:</span>
                    </span>

                    <div className="relative">
                      <input
                        type={showNewPinToggle ? 'text' : 'password'}
                        maxLength={10}
                        value={newPin}
                        onChange={(e) => {
                          setNewPin(e.target.value);
                          setPinChangeError('');
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') handleSaveNewPin();
                        }}
                        placeholder="নতুন পিন"
                        autoFocus
                        className="bg-[#0b1019] border border-emerald-500/50 rounded-xl px-3 py-1.5 pr-8 text-xs text-white font-mono w-40 tracking-widest focus:outline-hidden focus:border-emerald-400"
                      />
                      <button
                        type="button"
                        onClick={() => setShowNewPinToggle(!showNewPinToggle)}
                        className="absolute right-2 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                      >
                        {showNewPinToggle ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                      </button>
                    </div>

                    {/* Asterisk Preview while typing */}
                    {newPin.length > 0 && (
                      <span className="text-xs font-mono text-cyan-300 tracking-widest bg-cyan-950/40 px-2 py-1 rounded border border-cyan-800/40">
                        {getMaskedPin(newPin)}
                      </span>
                    )}

                    <button
                      type="button"
                      onClick={handleSaveNewPin}
                      className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-xs rounded-xl shadow cursor-pointer active:scale-95 transition-all flex items-center gap-1.5"
                    >
                      <Save className="w-3.5 h-3.5" />
                      <span>আপডেট করুন</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => setIsOldPinConfirmed(false)}
                      className="px-2.5 py-1.5 bg-[#1b2538] hover:bg-[#25344c] text-slate-300 text-xs rounded-xl cursor-pointer"
                    >
                      বাতিল
                    </button>
                  </div>
                )}

                {/* Error Banner */}
                {pinChangeError && (
                  <div className="flex items-center gap-1.5 text-xs text-rose-400 font-medium animate-fadeIn">
                    <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
                    <span>{pinChangeError}</span>
                  </div>
                )}

                {/* Success Banner */}
                {pinChangeMsg && (
                  <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4 shrink-0" />
                    <span>{pinChangeMsg}</span>
                  </div>
                )}
              </div>
            )}

            {/* ==================== TAB 1: DEPOSIT REQUESTS ==================== */}
            {activeTab === 'requests' && (
              <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0">
                  <div className="flex items-center gap-1 bg-[#0b1018] p-1 rounded-xl border border-[#1d273a]">
                    <button
                      onClick={() => setFilterStatus('pending')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filterStatus === 'pending'
                          ? 'bg-amber-500 text-[#120e00] shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      অপেক্ষমান ({pendingCount})
                    </button>
                    <button
                      onClick={() => setFilterStatus('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filterStatus === 'all'
                          ? 'bg-[#1f2b3e] text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      সকল ({requests.length})
                    </button>
                    <button
                      onClick={() => setFilterStatus('approved')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filterStatus === 'approved'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      অনুমোদিত ({approvedCount})
                    </button>
                    <button
                      onClick={() => setFilterStatus('rejected')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        filterStatus === 'rejected'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      বাতিল ({requests.filter((r) => r.status === 'rejected').length})
                    </button>
                  </div>

                  <div className="relative min-w-[200px] flex-1 sm:flex-initial">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      placeholder="TrxID বা নম্বর খুঁজুন..."
                      className="w-full bg-[#0b1018] border border-[#1e2a3f] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-amber-400"
                    />
                  </div>
                </div>

                {/* Requests List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {filteredRequests.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-[#0a0e16] border border-[#1b2537] rounded-2xl">
                      <Clock className="w-8 h-8 text-slate-600 mb-2" />
                      <p className="text-sm font-semibold text-slate-400">কোনো ডিপোজিট রিকোয়েস্ট পাওয়া যায়নি</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {filterStatus === 'pending'
                          ? 'বর্তমানে কোনো পেন্ডিং রিকোয়েস্ট নেই'
                          : 'ফিল্টার পরিবর্তন করে দেখুন'}
                      </p>
                    </div>
                  ) : (
                    filteredRequests.map((req) => {
                      const isBkash = req.method === 'bkash';
                      const isNagad = req.method === 'nagad';
                      const isPending = req.status === 'pending';
                      const isApproved = req.status === 'approved';

                      return (
                        <div
                          key={req.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isPending
                              ? 'bg-[#121927] border-amber-500/40 shadow-lg shadow-amber-500/5'
                              : isApproved
                              ? 'bg-[#0e1622] border-emerald-500/20 opacity-90'
                              : 'bg-[#0c121c] border-rose-500/20 opacity-70'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Left: Method & Amount */}
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 ${
                                  isBkash
                                    ? 'bg-[#e2136e]/20 text-[#ff4f9a] border border-[#e2136e]/40'
                                    : isNagad
                                    ? 'bg-[#f7941d]/20 text-[#ffa843] border border-[#f7941d]/40'
                                    : 'bg-[#8c3494]/20 text-[#ba68c8] border border-[#8c3494]/40'
                                }`}
                              >
                                <span>{req.method.toUpperCase()}</span>
                              </div>

                              <div>
                                <span className="text-lg sm:text-xl font-black text-emerald-400 font-mono-numbers">
                                  ৳ {req.amount.toLocaleString()}
                                </span>
                              </div>

                              {/* Status Badge */}
                              <span
                                className={`px-2 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                                  isPending
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                    : isApproved
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {isPending && <Clock className="w-3 h-3" />}
                                {isApproved && <CheckCircle2 className="w-3 h-3" />}
                                {!isPending && !isApproved && <XCircle className="w-3 h-3" />}
                                <span>
                                  {isPending ? 'অপেক্ষমান (Pending)' : isApproved ? 'অনুমোদিত' : 'বাতিল'}
                                </span>
                              </span>
                            </div>

                            {/* Right: Date & Time */}
                            <div className="text-[11px] text-slate-400 font-mono">
                              {new Date(req.createdAt).toLocaleString('bn-BD', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </div>
                          </div>

                          {/* Middle: Details Grid */}
                          <div className="mt-3 pt-2.5 border-t border-[#1e2a3e] grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            <div className="bg-[#0b1018] p-2 rounded-xl">
                              <span className="text-slate-500 text-[10px] block">যে নম্বর থেকে পাঠানো হয়েছে (Sender):</span>
                              <span className="font-mono font-bold text-white tracking-wide">
                                {req.senderNumber}
                              </span>
                              <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                <span className="text-[10px] text-slate-400 truncate">
                                  {req.userIdentifier}
                                </span>
                                {req.userCode && (
                                  <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                                    {req.userCode}
                                  </span>
                                )}
                                <button
                                  type="button"
                                  onClick={() => setSelectedHistoryUserId(req.userCode || req.senderNumber || req.userId)}
                                  className="px-1.5 py-0.5 rounded bg-[#172337] hover:bg-[#20304a] text-cyan-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                  title="এই ইউজারের সম্পূর্ণ হিস্ট্রি দেখুন"
                                >
                                  <History className="w-3 h-3" />
                                  <span>হিস্ট্রি</span>
                                </button>
                              </div>
                            </div>

                            <div className="bg-[#0b1018] p-2 rounded-xl">
                              <span className="text-slate-500 text-[10px] block">অ্যাডমিন প্রাপ্ত নম্বর (Target):</span>
                              <span className="font-mono font-bold text-slate-300 tracking-wide">
                                {req.targetNumber}
                              </span>
                            </div>

                            <div className="bg-[#0b1018] p-2 rounded-xl flex items-center justify-between">
                              <div>
                                <span className="text-slate-500 text-[10px] block">ট্রানজেকশন আইডি (TrxID):</span>
                                <span className="font-mono font-black text-amber-300 tracking-wider text-sm select-all">
                                  {req.trxId}
                                </span>
                              </div>
                              <button
                                onClick={() => handleCopyTrx(req.trxId)}
                                className="p-1.5 rounded-lg bg-[#1a2538] hover:bg-[#25354e] text-slate-300 hover:text-white transition-colors"
                                title="TrxID কপি করুন"
                              >
                                {copiedTrxId === req.trxId ? (
                                  <Check className="w-3.5 h-3.5 text-emerald-400" />
                                ) : (
                                  <Copy className="w-3.5 h-3.5" />
                                )}
                              </button>
                            </div>
                          </div>

                          {/* Rejection / Note Info if any */}
                          {req.rejectionReason && (
                            <p className="mt-2 text-[11px] text-rose-400 bg-rose-500/10 px-2 py-1 rounded-lg">
                              বাতিলের কারণ: {req.rejectionReason}
                            </p>
                          )}

                          {/* Bottom Action Buttons (for Pending) */}
                          {isPending && (
                            <div className="mt-3 pt-2.5 border-t border-[#1e2a3e] flex items-center justify-end gap-2">
                              <button
                                onClick={() => setRejectingRequestId(req.id)}
                                className="px-3 py-1.5 rounded-xl border border-rose-500/40 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                <span>বাতিল করুন</span>
                              </button>

                              <button
                                onClick={() => handleApprove(req)}
                                className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-xs font-black shadow-lg shadow-emerald-700/20 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                                <span>অনুমোদন ও ব্যালেন্স যোগ করুন (+৳{req.amount.toLocaleString()})</span>
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ==================== TAB 2: WITHDRAWAL REQUESTS ==================== */}
            {activeTab === 'withdrawals' && (
              <div className="flex-1 flex flex-col min-h-0 p-3 sm:p-4 overflow-hidden">
                {/* Search & Filter Toolbar */}
                <div className="flex flex-wrap items-center justify-between gap-2 mb-3 shrink-0">
                  <div className="flex items-center gap-1 bg-[#0b1018] p-1 rounded-xl border border-[#1d273a]">
                    <button
                      onClick={() => setWithdrawFilterStatus('pending')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        withdrawFilterStatus === 'pending'
                          ? 'bg-rose-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      অপেক্ষমান ({pendingWithdrawalCount})
                    </button>
                    <button
                      onClick={() => setWithdrawFilterStatus('all')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        withdrawFilterStatus === 'all'
                          ? 'bg-[#1f2b3e] text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      সকল ({withdrawals.length})
                    </button>
                    <button
                      onClick={() => setWithdrawFilterStatus('completed')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        withdrawFilterStatus === 'completed'
                          ? 'bg-emerald-600 text-white shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      টাকা পাঠানো হয়েছে ({completedWithdrawalCount})
                    </button>
                    <button
                      onClick={() => setWithdrawFilterStatus('rejected')}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        withdrawFilterStatus === 'rejected'
                          ? 'bg-red-900 text-rose-300 shadow'
                          : 'text-slate-400 hover:text-white'
                      }`}
                    >
                      বাতিল ও রিফান্ড ({withdrawals.filter((w) => w.status === 'rejected').length})
                    </button>
                  </div>

                  <div className="relative min-w-[220px] flex-1 sm:flex-initial">
                    <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                    <input
                      type="text"
                      value={withdrawSearchQuery}
                      onChange={(e) => setWithdrawSearchQuery(e.target.value)}
                      placeholder="পার্সোনাল নম্বর বা ইউজার খুঁজুন..."
                      className="w-full bg-[#0b1018] border border-[#1e2a3f] rounded-xl pl-9 pr-3 py-1.5 text-xs text-white focus:outline-hidden focus:border-rose-400"
                    />
                  </div>
                </div>

                {/* Withdrawals List */}
                <div className="flex-1 overflow-y-auto space-y-2.5 pr-1">
                  {filteredWithdrawals.length === 0 ? (
                    <div className="h-48 flex flex-col items-center justify-center text-center p-6 bg-[#0a0e16] border border-[#1b2537] rounded-2xl">
                      <ArrowDownLeft className="w-8 h-8 text-slate-600 mb-2" />
                      <p className="text-sm font-semibold text-slate-400">কোনো উত্তোলন রিকোয়েস্ট পাওয়া যায়নি</p>
                      <p className="text-xs text-slate-500 mt-0.5">
                        {withdrawFilterStatus === 'pending'
                          ? 'বর্তমানে কোনো পেন্ডিং উত্তোলন রিকোয়েস্ট নেই'
                          : 'ফিল্টার পরিবর্তন করে দেখুন'}
                      </p>
                    </div>
                  ) : (
                    filteredWithdrawals.map((req) => {
                      const isBkash = req.method === 'bkash';
                      const isNagad = req.method === 'nagad';
                      const isPending = req.status === 'pending';
                      const isCompleted = req.status === 'completed';

                      return (
                        <div
                          key={req.id}
                          className={`p-3.5 rounded-2xl border transition-all ${
                            isPending
                              ? 'bg-[#15121e] border-rose-500/40 shadow-lg shadow-rose-950/20'
                              : isCompleted
                              ? 'bg-[#0e1622] border-emerald-500/20 opacity-90'
                              : 'bg-[#150d12] border-rose-900/40 opacity-70'
                          }`}
                        >
                          <div className="flex flex-wrap items-center justify-between gap-2">
                            {/* Left: Method & Amount */}
                            <div className="flex items-center gap-2.5">
                              <div
                                className={`px-2.5 py-1 rounded-xl text-xs font-black uppercase flex items-center gap-1.5 ${
                                  isBkash
                                    ? 'bg-[#e2136e]/20 text-[#ff4f9a] border border-[#e2136e]/40'
                                    : isNagad
                                    ? 'bg-[#f7941d]/20 text-[#ffa843] border border-[#f7941d]/40'
                                    : 'bg-[#8c3494]/20 text-[#ba68c8] border border-[#8c3494]/40'
                                }`}
                              >
                                <span>{req.method.toUpperCase()}</span>
                                <span className="text-[10px] font-medium bg-white/10 px-1 rounded">Personal</span>
                              </div>

                              <div>
                                <span className="text-lg sm:text-xl font-black text-rose-400 font-mono-numbers">
                                  ৳ {req.amount.toLocaleString()}
                                </span>
                              </div>

                              {/* Status Badge */}
                              <span
                                className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold flex items-center gap-1 ${
                                  isPending
                                    ? 'bg-amber-500/20 text-amber-300 border border-amber-500/40 animate-pulse'
                                    : isCompleted
                                    ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                    : 'bg-rose-500/20 text-rose-300 border border-rose-500/30'
                                }`}
                              >
                                {isPending && <Clock className="w-3 h-3" />}
                                {isCompleted && <CheckCircle2 className="w-3 h-3" />}
                                {!isPending && !isCompleted && <XCircle className="w-3 h-3" />}
                                <span>
                                  {isPending
                                    ? 'অপেক্ষমান (টাকা সেন্ড করুন)'
                                    : isCompleted
                                    ? 'টাকা পাঠানো হয়েছে (Completed)'
                                    : 'বাতিল ও রিফান্ড'}
                                </span>
                              </span>
                            </div>

                            {/* Right: Date & Time */}
                            <div className="text-[11px] text-slate-400 font-mono">
                              {new Date(req.createdAt).toLocaleString('bn-BD', {
                                dateStyle: 'short',
                                timeStyle: 'short',
                              })}
                            </div>
                          </div>

                          {/* Middle: Details Grid */}
                          <div className="mt-3 pt-2.5 border-t border-[#1e2a3e] grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
                            {/* Personal Phone with copy button */}
                            <div className="bg-[#0b1018] p-2.5 rounded-xl border border-[#1b2538] flex items-center justify-between">
                              <div>
                                <span className="text-slate-400 text-[10px] block font-medium">গ্রাহকের পার্সোনাল নম্বর (Personal No):</span>
                                <span className="font-mono font-black text-white text-sm tracking-wider select-all">
                                  {req.personalNumber}
                                </span>
                                <div className="flex items-center gap-1.5 mt-0.5 flex-wrap">
                                  <span className="text-[10px] text-slate-400 truncate">
                                    {req.userIdentifier}
                                  </span>
                                  {req.userCode && (
                                    <span className="px-1.5 py-0.2 rounded bg-amber-500/20 text-amber-300 font-mono text-[10px] font-bold border border-amber-500/30">
                                      {req.userCode}
                                    </span>
                                  )}
                                  <button
                                    type="button"
                                    onClick={() => setSelectedHistoryUserId(req.userCode || req.personalNumber || req.userId)}
                                    className="px-1.5 py-0.5 rounded bg-[#172337] hover:bg-[#20304a] text-cyan-300 hover:text-white text-[10px] font-semibold flex items-center gap-1 transition-colors cursor-pointer"
                                    title="এই ইউজারের সম্পূর্ণ হিস্ট্রি দেখুন"
                                  >
                                    <History className="w-3 h-3" />
                                    <span>হিস্ট্রি</span>
                                  </button>
                                </div>
                              </div>
                              <button
                                onClick={() => handleCopyPersonalNum(req.personalNumber)}
                                className={`px-2 py-1 rounded-lg text-xs font-bold flex items-center gap-1 transition-all cursor-pointer ${
                                  copiedPersonalNumber === req.personalNumber
                                    ? 'bg-emerald-600 text-white'
                                    : 'bg-[#182335] hover:bg-[#22314a] text-amber-300 hover:text-white'
                                }`}
                                title="নম্বর কপি করুন"
                              >
                                {copiedPersonalNumber === req.personalNumber ? (
                                  <>
                                    <Check className="w-3 h-3 stroke-[3]" />
                                    <span>কপি হয়েছে</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>কপি</span>
                                  </>
                                )}
                              </button>
                            </div>

                            <div className="bg-[#0b1018] p-2.5 rounded-xl border border-[#1b2538]">
                              <span className="text-slate-400 text-[10px] block font-medium">উত্তোলন মাধ্যম (Method):</span>
                              <span className="font-mono font-bold text-amber-300 text-sm uppercase">
                                {req.method} Personal
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                শুধুমাত্র পার্সোনাল একাউন্টে সেন্ড মানি করুন
                              </span>
                            </div>

                            <div className="bg-[#0b1018] p-2.5 rounded-xl border border-[#1b2538]">
                              <span className="text-slate-400 text-[10px] block font-medium">প্রদেয় টাকা (Payable Amount):</span>
                              <span className="font-mono font-black text-emerald-400 text-sm">
                                ৳ {req.amount.toLocaleString()}
                              </span>
                              <span className="text-[10px] text-slate-400 block mt-0.5">
                                {isPending ? 'ইউজার ব্যালেন্স থেকে কাটা হয়েছে' : isCompleted ? 'সফলভাবে পাঠানো হয়েছে' : 'ব্যালেন্সে রিফান্ড করা হয়েছে'}
                              </span>
                            </div>
                          </div>

                          {/* Admin Note if present */}
                          {req.adminNote && (
                            <p className="mt-2 text-[11px] text-emerald-300 bg-emerald-500/10 px-2.5 py-1.5 rounded-xl border border-emerald-500/20">
                              এডমিন নোট: {req.adminNote}
                            </p>
                          )}

                          {/* Rejection Info if rejected */}
                          {req.rejectionReason && (
                            <p className="mt-2 text-[11px] text-rose-300 bg-rose-500/10 px-2.5 py-1.5 rounded-xl border border-rose-500/20">
                              বাতিলের কারণ: {req.rejectionReason} (টাকা ইউজারের একাউন্টে ফেরত দেওয়া হয়েছে)
                            </p>
                          )}

                          {/* Action Buttons for Pending */}
                          {isPending && (
                            <div className="mt-3 pt-2.5 border-t border-[#1e2a3e] flex items-center justify-between gap-2 flex-wrap">
                              <span className="text-[11px] text-slate-400">
                                💡 নির্দেশিকা: নম্বর কপি করে আপনার বিকাশ/নগদ/রকেট অ্যাপ থেকে সেন্ড মানি করুন, তারপর নিশ্চিত করুন।
                              </span>

                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => {
                                    setRejectingWithdrawalId(req.id);
                                    setRejectWithdrawalReason('ভুল বা বন্ধ পার্সোনাল নম্বর');
                                  }}
                                  className="px-3 py-1.5 rounded-xl border border-rose-500/40 hover:bg-rose-500/20 text-rose-300 text-xs font-bold transition-all cursor-pointer flex items-center gap-1"
                                >
                                  <XCircle className="w-3.5 h-3.5" />
                                  <span>বাতিল ও রিফান্ড</span>
                                </button>

                                <button
                                  onClick={() => {
                                    setCompletingWithdrawal(req);
                                    setCompleteAdminNote(`টাকা পাঠানো হয়েছে (${req.method.toUpperCase()} Personal)`);
                                  }}
                                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-xs font-black shadow-lg shadow-emerald-700/20 active:scale-98 transition-all cursor-pointer flex items-center gap-1.5"
                                >
                                  <Send className="w-3.5 h-3.5" />
                                  <span>টাকা সেন্ড করেছি (Mark as Sent)</span>
                                </button>
                              </div>
                            </div>
                          )}
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}

            {/* ==================== TAB 2: PAYMENT NUMBERS SETTINGS ==================== */}
            {activeTab === 'settings' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-3.5 flex items-start gap-3">
                  <ShieldCheck className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300">
                    <p className="font-bold text-amber-300">ম্যানুয়াল পেমেন্ট নম্বর কনফিগারেশন</p>
                    <p className="mt-0.5 text-slate-400">
                      এখানে যে বিকাশ, নগদ ও রকেট নম্বর সেট করবেন, ইউজার যখন ডিপোজিটে ক্লিক করবে ঠিক সেই নম্বরটিই দেখতে পাবে। ইউজার সেই নম্বরে টাকা পাঠিয়ে TrxID সাবমিট করবে।
                    </p>
                  </div>
                </div>

                {saveSuccessMsg && (
                  <div className="p-3 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-4 h-4" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  {/* bKash Card */}
                  <div className="bg-[#0b1018] border border-[#e2136e]/40 rounded-2xl p-4 shadow-lg shadow-[#e2136e]/5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1f2838]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#e2136e] text-white font-black text-xs flex items-center justify-center">
                          bK
                        </div>
                        <span className="font-black text-sm text-[#ff4f9a]">বিকাশ (bKash)</span>
                      </div>
                      <label className="text-[11px] flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={settings.bkash.isActive}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              bkash: { ...settings.bkash, isActive: e.target.checked },
                            })
                          }
                          className="rounded accent-emerald-500"
                        />
                        <span>সক্রিয়</span>
                      </label>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        বিকাশ নম্বর (Admin Number):
                      </label>
                      <input
                        type="text"
                        value={settings.bkash.number}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            bkash: { ...settings.bkash, number: e.target.value },
                          })
                        }
                        placeholder="যেমন: 01712-345678"
                        className="w-full bg-[#121926] border border-[#233148] rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-hidden focus:border-[#e2136e]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        অ্যাকাউন্টের ধরন:
                      </label>
                      <select
                        value={settings.bkash.accountType}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            bkash: {
                              ...settings.bkash,
                              accountType: e.target.value as 'Personal' | 'Agent' | 'Merchant',
                            },
                          })
                        }
                        className="w-full bg-[#121926] border border-[#233148] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#e2136e]"
                      >
                        <option value="Personal">Personal (সেন্ড মানি)</option>
                        <option value="Agent">Agent (ক্যাশ আউট)</option>
                        <option value="Merchant">Merchant (পেমেন্ট)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        ব্যবহারকারীর জন্য নির্দেশনা:
                      </label>
                      <input
                        type="text"
                        value={settings.bkash.instructions}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            bkash: { ...settings.bkash, instructions: e.target.value },
                          })
                        }
                        placeholder="নির্দেশনা..."
                        className="w-full bg-[#121926] border border-[#233148] rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-[#e2136e]"
                      />
                    </div>
                  </div>

                  {/* Nagad Card */}
                  <div className="bg-[#0b1018] border border-[#f7941d]/40 rounded-2xl p-4 shadow-lg shadow-[#f7941d]/5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1f2838]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#f7941d] text-white font-black text-xs flex items-center justify-center">
                          ন
                        </div>
                        <span className="font-black text-sm text-[#ffa843]">নগদ (Nagad)</span>
                      </div>
                      <label className="text-[11px] flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={settings.nagad.isActive}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              nagad: { ...settings.nagad, isActive: e.target.checked },
                            })
                          }
                          className="rounded accent-emerald-500"
                        />
                        <span>সক্রিয়</span>
                      </label>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        নগদ নম্বর (Admin Number):
                      </label>
                      <input
                        type="text"
                        value={settings.nagad.number}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            nagad: { ...settings.nagad, number: e.target.value },
                          })
                        }
                        placeholder="যেমন: 01812-345678"
                        className="w-full bg-[#121926] border border-[#233148] rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-hidden focus:border-[#f7941d]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        অ্যাকাউন্টের ধরন:
                      </label>
                      <select
                        value={settings.nagad.accountType}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            nagad: {
                              ...settings.nagad,
                              accountType: e.target.value as 'Personal' | 'Agent' | 'Merchant',
                            },
                          })
                        }
                        className="w-full bg-[#121926] border border-[#233148] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#f7941d]"
                      >
                        <option value="Personal">Personal (সেন্ড মানি)</option>
                        <option value="Agent">Agent (ক্যাশ আউট)</option>
                        <option value="Merchant">Merchant (পেমেন্ট)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        ব্যবহারকারীর জন্য নির্দেশনা:
                      </label>
                      <input
                        type="text"
                        value={settings.nagad.instructions}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            nagad: { ...settings.nagad, instructions: e.target.value },
                          })
                        }
                        placeholder="নির্দেশনা..."
                        className="w-full bg-[#121926] border border-[#233148] rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-[#f7941d]"
                      />
                    </div>
                  </div>

                  {/* Rocket Card */}
                  <div className="bg-[#0b1018] border border-[#8c3494]/40 rounded-2xl p-4 shadow-lg shadow-[#8c3494]/5 space-y-3">
                    <div className="flex items-center justify-between pb-2 border-b border-[#1f2838]">
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-[#8c3494] text-white font-black text-xs flex items-center justify-center">
                          R
                        </div>
                        <span className="font-black text-sm text-[#ba68c8]">রকেট (Rocket)</span>
                      </div>
                      <label className="text-[11px] flex items-center gap-1.5 cursor-pointer text-slate-300">
                        <input
                          type="checkbox"
                          checked={settings.rocket.isActive}
                          onChange={(e) =>
                            setSettings({
                              ...settings,
                              rocket: { ...settings.rocket, isActive: e.target.checked },
                            })
                          }
                          className="rounded accent-emerald-500"
                        />
                        <span>সক্রিয়</span>
                      </label>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        রকেট নম্বর (Admin Number):
                      </label>
                      <input
                        type="text"
                        value={settings.rocket.number}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            rocket: { ...settings.rocket, number: e.target.value },
                          })
                        }
                        placeholder="যেমন: 01912-345678"
                        className="w-full bg-[#121926] border border-[#233148] rounded-xl px-3 py-2 text-sm font-mono font-bold text-white focus:outline-hidden focus:border-[#8c3494]"
                      />
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        অ্যাকাউন্টের ধরন:
                      </label>
                      <select
                        value={settings.rocket.accountType}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            rocket: {
                              ...settings.rocket,
                              accountType: e.target.value as 'Personal' | 'Agent' | 'Merchant',
                            },
                          })
                        }
                        className="w-full bg-[#121926] border border-[#233148] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-[#8c3494]"
                      >
                        <option value="Personal">Personal (সেন্ড মানি)</option>
                        <option value="Agent">Agent (ক্যাশ আউট)</option>
                        <option value="Merchant">Merchant (পেমেন্ট)</option>
                      </select>
                    </div>

                    <div>
                      <label className="text-xs font-semibold text-slate-300 block mb-1">
                        ব্যবহারকারীর জন্য নির্দেশনা:
                      </label>
                      <input
                        type="text"
                        value={settings.rocket.instructions}
                        onChange={(e) =>
                          setSettings({
                            ...settings,
                            rocket: { ...settings.rocket, instructions: e.target.value },
                          })
                        }
                        placeholder="নির্দেশনা..."
                        className="w-full bg-[#121926] border border-[#233148] rounded-xl px-3 py-1.5 text-xs text-slate-300 focus:outline-hidden focus:border-[#8c3494]"
                      />
                    </div>
                  </div>
                </div>

                {/* Notice text */}
                <div>
                  <label className="text-xs font-semibold text-slate-300 block mb-1">
                    সার্বজনীন ডিপোজিট নোটিশ (ডিপোজিট মডালে প্রদর্শিত হবে):
                  </label>
                  <textarea
                    rows={2}
                    value={settings.noticeText}
                    onChange={(e) => setSettings({ ...settings, noticeText: e.target.value })}
                    className="w-full bg-[#0b1018] border border-[#223048] rounded-xl p-3 text-xs text-white focus:outline-hidden focus:border-amber-400"
                  />
                </div>

                {/* Marquee Ticker Notice */}
                <div className="bg-[#0b1018] border border-amber-500/30 rounded-2xl p-3.5 space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <Megaphone className="w-4 h-4 text-amber-400" />
                      <span>হেডার স্ক্রোলিং শিরোনাম (ডান থেকে বামে চলমান নোটিশ):</span>
                    </label>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
                      লাইভ স্ক্রিন
                    </span>
                  </div>
                  <textarea
                    rows={2}
                    value={marqueeNotice}
                    onChange={(e) => setMarqueeNotice(e.target.value)}
                    placeholder="এখানে যা লিখবেন তা অ্যাপের উপরে ডান থেকে বামে স্ক্রল হবে..."
                    className="w-full bg-[#121926] border border-[#223048] rounded-xl p-3 text-xs text-amber-100 font-medium focus:outline-hidden focus:border-amber-400"
                  />
                  <p className="text-[10.5px] text-slate-400">
                    💡 আপনি এখানে যেকোনো টেক্সট, ঘোষণা বা অফার লিখে নিচে <strong>"সেটিংস সংরক্ষণ করুন"</strong> চাপলেই তা অ্যাপের উপরে স্বয়ংক্রিয়ভাবে ডান থেকে বামে স্ক্রোল হতে থাকবে।
                  </p>
                </div>

                {/* ==================== LIVE FIREBASE & NOTIFICATION SYSTEM ==================== */}
                <div className="bg-[#0b1019] border border-emerald-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                  <div className="flex items-center justify-between pb-2 border-b border-[#1d293d]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center font-bold">
                        <Bell className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white flex items-center gap-2">
                          <span>রিয়েল-টাইম নোটিফিকেশন ও অনলাইন ক্লাউড</span>
                          <span className="text-[10px] bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded-full border border-emerald-500/30 font-semibold flex items-center gap-1">
                            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-ping" />
                            অনলাইন সক্রিয়
                          </span>
                        </h4>
                        <p className="text-[11px] text-slate-400">
                          কোনো ইউজার এডমানি (ডিপোজিট) বা ক্যাশআউট (উইথড্র) দিলে সাথে সাথে সাউন্ড ও নোটিফিকেশন পাবেন
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="bg-[#121926] border border-[#233148] rounded-xl p-3.5 space-y-3">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                      <div>
                        <p className="text-xs font-bold text-white flex items-center gap-1.5">
                          <span>মোবাইল ও ব্রাউজার পুশ নোটিফিকেশন:</span>
                          <span className="text-[10px] px-2 py-0.5 rounded font-mono font-bold bg-emerald-500/20 text-emerald-300">
                            সক্রিয়
                          </span>
                        </p>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          স্ক্রিন অফ বা ব্যাকগ্রাউন্ডে থাকলেও আপনার মোবাইলে সরাসরি নোটিফিকেশন শো করবে
                        </p>
                      </div>

                      <button
                        type="button"
                        onClick={async () => {
                          if (typeof window !== 'undefined' && 'Notification' in window) {
                            soundManager.playClick();
                            const res = await Notification.requestPermission();
                            if (res === 'granted') {
                              soundManager.playNotificationChime();
                              new Notification('🔔 নোটিফিকেশন চালু হয়েছে!', {
                                body: 'এডমিন নোটিফিকেশন এখন থেকে আপনার ফোনে সরাসরি আসবে।',
                                icon: '/pwa-192x192.png',
                              });
                            }
                          }
                        }}
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 shadow-md shadow-emerald-950/40 cursor-pointer shrink-0"
                      >
                        <Bell className="w-3.5 h-3.5" />
                        <span>নোটিফিকেশন সক্রিয় করুন</span>
                      </button>
                    </div>

                    <div className="pt-2.5 border-t border-[#1e2a3c] flex flex-wrap items-center gap-2">
                      <span className="text-[11px] text-slate-400">পরীক্ষা করুন:</span>
                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playNotificationChime();
                          window.dispatchEvent(
                            new CustomEvent('trigger_admin_test_notification', { detail: { type: 'deposit' } })
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-emerald-950/80 hover:bg-emerald-900 border border-emerald-500/40 text-emerald-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>এডমানি নোটিফিকেশন টেস্ট</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => {
                          soundManager.playNotificationChime();
                          window.dispatchEvent(
                            new CustomEvent('trigger_admin_test_notification', { detail: { type: 'withdrawal' } })
                          );
                        }}
                        className="px-2.5 py-1.5 rounded-lg bg-amber-950/80 hover:bg-amber-900 border border-amber-500/40 text-amber-300 text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
                      >
                        <Volume2 className="w-3.5 h-3.5" />
                        <span>ক্যাশআউট নোটিফিকেশন টেস্ট</span>
                      </button>
                    </div>
                  </div>
                </div>

                {/* ==================== WEB & GOOGLE DRIVE SHARING ==================== */}
                <div className="bg-[#0b1019] border border-cyan-500/30 rounded-2xl p-4 sm:p-5 space-y-3.5 shadow-xl">
                  <div className="flex items-center gap-2 pb-2 border-b border-[#1d293d]">
                    <div className="w-7 h-7 rounded-lg bg-cyan-500/20 text-cyan-400 flex items-center justify-center font-bold">
                      <Globe className="w-4 h-4" />
                    </div>
                    <div>
                      <h4 className="text-sm font-bold text-white">অ্যাপ ওয়েবসাইট ও ড্রাইভ শেয়ারিং লিংক</h4>
                      <p className="text-[11px] text-slate-400">বন্ধুদের মাঝে সরাসরি ওয়েবসাইট লিংক শেয়ার অথবা সম্পূর্ণ ফাইল ডাউনলোড</p>
                    </div>
                  </div>

                  {/* Public Live Shared Link */}
                  <div className="bg-[#121926] border border-[#233148] rounded-xl p-3 space-y-2">
                    <span className="text-xs text-slate-300 font-medium block">
                      ১. বন্ধুদের সরাসরি খেলার লাইভ ওয়েবসাইট লিংক:
                    </span>
                    <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
                      <div className="flex-1 bg-[#090d14] border border-[#1e2a3c] rounded-xl px-3 py-2 text-xs font-mono text-cyan-300 break-all select-all">
                        https://ais-pre-rcq6agpjqpcvfptktadv4m-196713937546.asia-southeast1.run.app
                      </div>
                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => {
                            navigator.clipboard.writeText('https://ais-pre-rcq6agpjqpcvfptktadv4m-196713937546.asia-southeast1.run.app');
                            setCopiedShareLink(true);
                            setTimeout(() => setCopiedShareLink(false), 2000);
                          }}
                          className="flex-1 sm:flex-none px-3 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs flex items-center justify-center gap-1.5 transition-all cursor-pointer shadow-sm"
                        >
                          {copiedShareLink ? <Check className="w-3.5 h-3.5 text-white" /> : <Copy className="w-3.5 h-3.5" />}
                          <span>{copiedShareLink ? 'কপি হয়েছে!' : 'লিংক কপি করুন'}</span>
                        </button>
                        <a
                          href="https://ais-pre-rcq6agpjqpcvfptktadv4m-196713937546.asia-southeast1.run.app"
                          target="_blank"
                          rel="noreferrer"
                          className="px-2.5 py-2 rounded-xl bg-[#1a2538] hover:bg-[#253550] text-slate-300 hover:text-white transition-colors flex items-center justify-center"
                          title="ওপেন করুন"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                        </a>
                      </div>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      💡 এই লিংকটি আপনি WhatsApp, Facebook বা মেসেঞ্জারে বন্ধুদের দিলে তারা সাথে সাথে কোনো কিছু ডাউনলোড করা ছাড়াই ফোনে খেলতে পারবে।
                    </p>
                  </div>

                  {/* ZIP download for Google Drive / Hosting */}
                  <div className="bg-[#121926] border border-[#233148] rounded-xl p-3 space-y-2">
                    <span className="text-xs text-slate-300 font-medium block">
                      ২. গুগল ড্রাইভে রাখা বা নিজস্ব ওয়েবসাইটে আপলোড করার জন্য সম্পূর্ণ ফাইল (ZIP):
                    </span>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-[#080d16] p-3 rounded-xl border border-[#1b263b]">
                      <div className="text-left">
                        <span className="text-xs font-bold text-white block font-mono">aviator-app-website.zip</span>
                        <span className="text-[10px] text-slate-400 block">সম্পূর্ণ ফ্রন্টএন্ড কোড, এইচটিএমএল, পিডব্লিউএ আইকন ও ফাইল</span>
                      </div>
                      <a
                        href="/aviator-app-website.zip"
                        download="aviator-app-website.zip"
                        className="px-3.5 py-2 rounded-xl bg-gradient-to-r from-emerald-600 to-green-600 hover:from-emerald-500 hover:to-green-500 text-white font-bold text-xs flex items-center gap-2 transition-all cursor-pointer shadow-md shrink-0"
                      >
                        <Download className="w-3.5 h-3.5" />
                        <span>ডাউনলোড জিপ (ZIP)</span>
                      </a>
                    </div>
                    <p className="text-[11px] text-slate-400">
                      💡 এই জিপ ফাইলটি ডাউনলোড করে আপনার গুগল ড্রাইভ (Google Drive)-এ আপলোড করে বন্ধুদের সাথে ড্রাইভ লিংক শেয়ার করতে পারেন, অথবা যেকোনো cPanel / Netlify / Vercel ওয়েবসাইটে আপলোড করতে পারেন।
                    </p>
                  </div>
                </div>

                {/* ==================== ADMIN STEALTH & SECURITY CONTROLS ==================== */}
                <div className="bg-[#0b1019] border border-amber-500/40 rounded-2xl p-4 sm:p-5 space-y-4 shadow-xl">
                  <div className="flex flex-wrap items-center justify-between gap-2 pb-3 border-b border-[#1d293d]">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-lg bg-amber-500/20 text-amber-400 flex items-center justify-center font-bold">
                        <Lock className="w-4 h-4" />
                      </div>
                      <div>
                        <h4 className="text-sm font-bold text-white">এডমিন সিকিউরিটি ও অনলাইন পাবলিশিং কন্ট্রোল</h4>
                        <p className="text-[11px] text-slate-400">সাধারণ প্লেয়ারদের থেকে এডমিন সেকশন গোপন রাখার ব্যবস্থাপনা</p>
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowStealthGuideModal(true)}
                      className="px-3 py-1.5 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-300 font-bold text-xs flex items-center gap-1.5 transition-all cursor-pointer border border-amber-500/30"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      <span>গোপন এক্সেস নির্দেশিকা</span>
                    </button>
                  </div>

                  {/* The Single Secret Access Method */}
                  <div className="bg-[#121926] border border-amber-500/30 rounded-2xl p-3.5 space-y-2">
                    <div className="flex items-center gap-2 text-white font-bold text-xs sm:text-sm">
                      <div className="w-5 h-5 rounded-full bg-red-600/30 text-red-400 flex items-center justify-center text-xs font-black border border-red-500/40">
                        ১
                      </div>
                      <span className="text-amber-300">পদ্ধতি ১: লোগোতে ৫ বার ট্যাপ (সবচেয়ে সহজ)</span>
                    </div>
                    <p className="text-slate-300 leading-relaxed text-xs pl-7">
                      পাবলিক সাইটে কোনো এডমিন বাটন থাকবে না। শুধুমাত্র আপনি উপরে বামের <strong className="text-red-400 font-bold italic">"SkyWin BD"</strong> লোগোতে দ্রুত <strong className="text-white font-mono bg-white/10 px-1 py-0.5 rounded">৫ বার ট্যাপ</strong> করলেই এডমিন প্যানেল খুলে যাবে।
                    </p>
                  </div>

                  {/* Change Admin PIN */}
                  <div className="pt-3 border-t border-[#1d293d] space-y-3">
                    <div className="flex items-center justify-between">
                      <label className="text-xs font-semibold text-slate-300">
                        এডমিন লগইন পিন পরিবর্তন (Change Admin PIN):
                      </label>
                      <span className="text-[11px] font-mono text-amber-400 bg-amber-500/10 px-2 py-0.5 rounded-md flex items-center gap-1.5 border border-amber-500/20">
                        <span className="text-slate-400">বর্তমান পিন:</span>
                        <strong className="tracking-widest text-white text-xs">
                          {getMaskedPin(settings.adminPin || '1234', revealStoredPin)}
                        </strong>
                        <button
                          type="button"
                          onClick={() => setRevealStoredPin(!revealStoredPin)}
                          className="text-slate-400 hover:text-amber-300 ml-1 transition-colors cursor-pointer"
                          title={revealStoredPin ? 'পিন লুকান' : 'পিন দেখুন'}
                        >
                          {revealStoredPin ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                        </button>
                      </span>
                    </div>

                    {!isOldPinConfirmed ? (
                      <div className="flex flex-wrap items-center gap-2">
                        <div className="relative flex-1 min-w-[200px]">
                          <input
                            type={showOldPinToggle ? 'text' : 'password'}
                            maxLength={10}
                            value={oldPinInput}
                            onChange={(e) => {
                              setOldPinInput(e.target.value);
                              setPinChangeError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleVerifyOldPin();
                            }}
                            placeholder="বর্তমান পিন লিখুন"
                            className="w-full bg-[#121926] border border-[#233148] rounded-xl px-3.5 py-2 pr-9 text-xs font-mono tracking-widest text-white focus:outline-hidden focus:border-amber-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowOldPinToggle(!showOldPinToggle)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                          >
                            {showOldPinToggle ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={handleVerifyOldPin}
                          className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black font-black text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                        >
                          <Check className="w-3.5 h-3.5 stroke-[3]" />
                          <span>কনফার্ম করুন</span>
                        </button>
                      </div>
                    ) : (
                      <div className="flex flex-wrap items-center gap-2 bg-emerald-500/10 p-3 rounded-xl border border-emerald-500/30 animate-fadeIn">
                        <div className="w-full text-xs text-emerald-300 font-semibold flex items-center gap-1.5 mb-1">
                          <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                          <span>বর্তমান পিন যাচাই সম্পন্ন! নতুন পিন লিখুন:</span>
                        </div>
                        <div className="relative flex-1 min-w-[200px]">
                          <input
                            type={showNewPinToggle ? 'text' : 'password'}
                            maxLength={10}
                            value={newPin}
                            onChange={(e) => {
                              setNewPin(e.target.value);
                              setPinChangeError('');
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveNewPin();
                            }}
                            placeholder="নতুন পিন লিখুন (যেমন: 224700)"
                            autoFocus
                            className="w-full bg-[#121926] border border-emerald-500/50 rounded-xl px-3.5 py-2 pr-9 text-xs font-mono tracking-widest text-white focus:outline-hidden focus:border-emerald-400"
                          />
                          <button
                            type="button"
                            onClick={() => setShowNewPinToggle(!showNewPinToggle)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white cursor-pointer"
                          >
                            {showNewPinToggle ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
                          </button>
                        </div>

                        {newPin.length > 0 && (
                          <span className="text-xs font-mono text-cyan-300 tracking-widest bg-cyan-950/40 px-2 py-1.5 rounded border border-cyan-800/40">
                            {getMaskedPin(newPin)}
                          </span>
                        )}

                        <button
                          type="button"
                          onClick={handleSaveNewPin}
                          className="px-4 py-2 bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white font-black text-xs rounded-xl shadow-md transition-all cursor-pointer whitespace-nowrap flex items-center gap-1.5"
                        >
                          <Save className="w-3.5 h-3.5" />
                          <span>নতুন পিন আপডেট করুন</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => setIsOldPinConfirmed(false)}
                          className="px-3 py-2 bg-[#1b2538] hover:bg-[#25344c] text-slate-300 text-xs rounded-xl cursor-pointer"
                        >
                          বাতিল
                        </button>
                      </div>
                    )}

                    {pinChangeError && (
                      <p className="text-xs text-rose-400 font-medium animate-fadeIn">{pinChangeError}</p>
                    )}
                    {pinChangeMsg && (
                      <p className="text-xs text-emerald-400 font-semibold animate-fadeIn">{pinChangeMsg}</p>
                    )}
                  </div>
                </div>

                {/* Save Button */}
                <button
                  onClick={handleSaveSettings}
                  disabled={isSavingSettings}
                  className="w-full py-3.5 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-400 hover:to-yellow-500 text-[#120e00] font-black text-sm uppercase tracking-wider rounded-2xl shadow-xl shadow-amber-500/20 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50"
                >
                  <Save className="w-4 h-4 font-bold" />
                  <span>{isSavingSettings ? 'সংরক্ষণ হচ্ছে...' : 'পেমেন্ট নম্বরসমূহ সংরক্ষণ করুন (Save Numbers)'}</span>
                </button>
              </div>
            )}

            {/* ==================== TAB 3: USER MANAGEMENT & FULL HISTORY ==================== */}
            {activeTab === 'users' && (
              <div className="flex-1 overflow-y-auto p-3 sm:p-5 space-y-4">
                {/* Header & Search */}
                <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-[#1f2838]">
                  <div>
                    <h4 className="text-sm font-bold text-white flex items-center gap-2">
                      <UserCheck className="w-4 h-4 text-emerald-400" />
                      <span>সকল ব্যবহারকারী অ্যাকাউন্ট ও ইতিহাস পরিচালনা</span>
                    </h4>
                    <p className="text-xs text-slate-400 mt-0.5">
                      ইউজার আইডি অনুসন্ধান, সম্পূর্ণ হিস্ট্রি দেখা, আইডি রিসেট/আপডেট ও সরাসরি ব্যালেন্স অ্যাড
                    </p>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-slate-400">কুইক অ্যাড:</span>
                    <input
                      type="number"
                      value={manualAddAmount}
                      onChange={(e) => setManualAddAmount(Math.max(10, parseFloat(e.target.value) || 0))}
                      className="w-20 bg-[#0b1018] border border-[#24334c] rounded-lg px-2 py-1 text-xs text-center font-mono text-emerald-400 font-bold"
                    />
                  </div>
                </div>

                {/* Search Bar for Users */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
                  <input
                    type="text"
                    value={userSearchQuery}
                    onChange={(e) => setUserSearchQuery(e.target.value)}
                    placeholder="ইউজার আইডি (যেমন: USER-18492), মোবাইল নম্বর বা নাম দিয়ে খুঁজুন..."
                    className="w-full bg-[#0b1018] border border-[#223149] focus:border-amber-400 rounded-xl pl-9 pr-4 py-2 text-xs text-white placeholder-slate-500 focus:outline-hidden transition-colors"
                  />
                  {userSearchQuery && (
                    <button
                      onClick={() => setUserSearchQuery('')}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-white text-xs"
                    >
                      মুছুন
                    </button>
                  )}
                </div>

                {/* Users List */}
                {(() => {
                  const query = userSearchQuery.trim().toLowerCase();
                  const list = accountsWithStats.filter((acc) => {
                    if (!query) return true;
                    return (
                      acc.userCode.toLowerCase().includes(query) ||
                      acc.phoneNumber.includes(query) ||
                      acc.displayName.toLowerCase().includes(query) ||
                      acc.referralCode.toLowerCase().includes(query)
                    );
                  });

                  if (list.length === 0) {
                    return (
                      <div className="p-8 text-center text-slate-500 bg-[#0b1018] rounded-2xl border border-[#1b2537]">
                        <UserIcon className="w-8 h-8 mx-auto mb-2 text-slate-600" />
                        <p className="text-xs font-medium">কোনো ইউজার অ্যাকাউন্ট পাওয়া যায়নি।</p>
                        {userSearchQuery && (
                          <p className="text-[11px] text-slate-400 mt-1">
                            "{userSearchQuery}" দিয়ে কোনো ফলাফল পাওয়া যায়নি।
                          </p>
                        )}
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
                      {list.map((acc) => {
                        const copyUserCredentials = () => {
                          const text = `🎮 SkyWin BD গেম একাউন্ট তথ্য\n━━━━━━━━━━━━━━━━━\nইউজার আইডি: ${acc.userCode}\nমোবাইল নম্বর: +88 ${acc.phoneNumber}\nপাসওয়ার্ড: ${acc.password || 'গোপনীয়'}\nবর্তমান ব্যালেন্স: ৳ ${acc.balance.toFixed(2)}\nউত্তোলনযোগ্য লাভ: ৳ ${acc.withdrawableBalance.toFixed(2)}\nরেফারেল কোড: ${acc.referralCode}\n━━━━━━━━━━━━━━━━━`;
                          navigator.clipboard.writeText(text);
                          setCopiedCredentialId(acc.userCode);
                          soundManager.playClick();
                          showAdminToast('ইউজার লগইন তথ্য কপি হয়েছে!', `${acc.userCode} (+88 ${acc.phoneNumber}) এর আইডি ও পাসওয়ার্ড ক্লিপবোর্ডে কপি করা হয়েছে।`, 'info');
                          setTimeout(() => setCopiedCredentialId(null), 2500);
                        };

                        const handleOpenEdit = () => {
                          const accounts = getStoredPhoneAccounts();
                          const found = accounts[acc.phoneNumber];
                          if (found) {
                            setEditingAccount(found);
                          } else {
                            setEditingAccount({
                              uid: acc.uid,
                              userCode: acc.userCode,
                              phoneNumber: acc.phoneNumber,
                              password: acc.password || '123456',
                              displayName: acc.displayName,
                              balance: acc.balance,
                              initialBonus: 100,
                              lockedPrincipal: acc.lockedPrincipal,
                              totalDeposited: acc.totalDeposited,
                              referralCode: acc.referralCode,
                              referralCount: acc.referralCount,
                              referralBonusEarned: acc.referralBonusEarned,
                              createdAt: acc.createdAt,
                              updatedAt: acc.updatedAt,
                            });
                          }
                        };

                        return (
                          <div
                            key={acc.uid}
                            className="bg-[#0b1018] border border-[#1e2a3e] hover:border-[#2f4262] rounded-2xl p-4 flex flex-col justify-between gap-3 transition-colors shadow-lg"
                          >
                            {/* User Header */}
                            <div className="flex items-start justify-between gap-2">
                              <div>
                                <div className="flex items-center gap-2">
                                  <span className="font-bold text-sm text-white">{acc.displayName}</span>
                                  <span className="px-2 py-0.5 rounded-md bg-amber-500/20 text-amber-300 font-mono text-[11px] font-bold border border-amber-500/30">
                                    {acc.userCode}
                                  </span>
                                </div>
                                <span className="text-xs font-mono text-slate-300 block mt-0.5">
                                  📱 +88 {acc.phoneNumber}
                                </span>
                                <span className="text-[10px] text-slate-400 block mt-0.5">
                                  রেজিস্ট্রেশন: {new Date(acc.createdAt).toLocaleDateString('bn-BD')}
                                </span>
                              </div>

                              <div className="text-right">
                                <span className="text-[10px] text-slate-400 block font-medium">মোট ব্যালেন্স</span>
                                <span className="text-base font-black font-mono-numbers text-cyan-300">
                                  ৳ {acc.balance.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                                </span>
                              </div>
                            </div>

                            {/* Financial Breakdown & Referral Metrics */}
                            <div className="grid grid-cols-3 gap-1.5 text-center bg-[#070b12] p-2 rounded-xl border border-white/5 text-[10.5px]">
                              <div>
                                <span className="text-slate-400 block text-[9.5px]">রেফার কমিশন:</span>
                                <span className="font-bold text-amber-400 font-mono">
                                  ৳ {acc.lockedPrincipal.toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9.5px]">উত্তোলনযোগ্য:</span>
                                <span className="font-bold text-emerald-400 font-mono">
                                  ৳ {acc.withdrawableBalance.toLocaleString()}
                                </span>
                              </div>
                              <div>
                                <span className="text-slate-400 block text-[9.5px]">রেফারেল ({acc.referralCount} জন):</span>
                                <span className="font-bold text-purple-400 font-mono">
                                  +৳{acc.referralBonusEarned}
                                </span>
                              </div>
                            </div>

                            {/* Action Buttons */}
                            <div className="space-y-2 pt-2 border-t border-[#182234]">
                              <div className="flex items-center gap-1.5">
                                <button
                                  type="button"
                                  onClick={() => setSelectedHistoryUserId(acc.userCode)}
                                  className="flex-1 py-1.5 px-2 bg-[#162338] hover:bg-[#20314d] text-cyan-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                  title="এই ইউজারের সম্পূর্ণ ডিপোজিট, উইথড্র ও বেট হিস্ট্রি দেখুন"
                                >
                                  <History className="w-3.5 h-3.5" />
                                  <span>সম্পূর্ণ হিস্ট্রি</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={handleOpenEdit}
                                  className="flex-1 py-1.5 px-2 bg-[#231e14] hover:bg-[#332b1d] border border-amber-600/30 text-amber-300 hover:text-white rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer"
                                  title="আইডি বা পাসওয়ার্ড ভুলে গেলে রিসেট ও পরিবর্তন করুন"
                                >
                                  <KeyRound className="w-3.5 h-3.5" />
                                  <span>আইডি রিসেট/এডিট</span>
                                </button>

                                <button
                                  type="button"
                                  onClick={copyUserCredentials}
                                  className={`py-1.5 px-2.5 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 cursor-pointer ${
                                    copiedCredentialId === acc.userCode
                                      ? 'bg-emerald-600 text-white'
                                      : 'bg-[#141b28] hover:bg-[#1d273a] text-slate-300 hover:text-white border border-[#223048]'
                                  }`}
                                  title="ইউজারের জন্য আইডি ও পাসওয়ার্ড কপি করুন"
                                >
                                  {copiedCredentialId === acc.userCode ? (
                                    <>
                                      <Check className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">কপি হয়েছে</span>
                                    </>
                                  ) : (
                                    <>
                                      <Copy className="w-3.5 h-3.5" />
                                      <span className="hidden sm:inline">তথ্য কপি</span>
                                    </>
                                  )}
                                </button>
                              </div>

                              {/* Quick Balance Operations */}
                              <div className="flex items-center gap-2">
                                <button
                                  onClick={() => handleDirectCreditPhoneAccount(acc.phoneNumber, manualAddAmount)}
                                  className="flex-1 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 rounded-xl text-xs font-bold transition-all flex items-center justify-center gap-1 active:scale-95 cursor-pointer"
                                >
                                  <ArrowUpRight className="w-3.5 h-3.5" />
                                  <span>+৳{manualAddAmount} ব্যালেন্স যোগ</span>
                                </button>

                                <button
                                  onClick={() => handleDirectResetPhoneAccount(acc.phoneNumber)}
                                  className="px-2.5 py-1.5 bg-[#172030] hover:bg-[#202d44] text-slate-400 hover:text-rose-400 rounded-xl text-xs font-medium transition-colors cursor-pointer"
                                  title="ব্যালেন্স ০ করুন"
                                >
                                  ০ করুন
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            )}

            {/* ==================== TAB 4: HEADER SCROLLING TITLE & NOTICES (শিরোনাম ও নোটিশ এডিট) ==================== */}
            {activeTab === 'marquee' && (
              <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-5">
                <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl p-4 flex items-start gap-3">
                  <Megaphone className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                  <div className="text-xs text-slate-300">
                    <p className="font-bold text-amber-300 text-sm">হেডার স্ক্রোলিং শিরোনাম ও সার্বজনীন নোটিশ আপডেট</p>
                    <p className="mt-0.5 text-slate-400">
                      এখানে যে শিরোনাম বা নোটিশ লিখে সংরক্ষণ করবেন, তা সাথে সাথে ফায়ারবেস ক্লাউডের মাধ্যমে সকল ইউজারের ফোনে লাইভ আপডেট হয়ে যাবে।
                    </p>
                  </div>
                </div>

                {saveSuccessMsg && (
                  <div className="p-3.5 rounded-xl bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 text-xs font-bold flex items-center gap-2 animate-fadeIn">
                    <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                    <span>{saveSuccessMsg}</span>
                  </div>
                )}

                {/* 1. Live Preview of Marquee */}
                <div className="bg-[#0b1018] border border-amber-500/40 rounded-2xl p-4 space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-amber-300 flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-amber-400 animate-ping" />
                      <span>লাইভ স্ক্রোলিং প্রিভিউ (ইউজাররা ঠিক যেভাবে দেখবে):</span>
                    </span>
                    <span className="text-[10px] bg-amber-500/20 text-amber-300 px-2 py-0.5 rounded-full border border-amber-500/30 font-mono">
                      LIVE
                    </span>
                  </div>

                  <div className="w-full bg-gradient-to-r from-[#171208] via-[#1a140b] to-[#171208] border border-amber-500/30 rounded-xl px-2.5 py-2 overflow-hidden flex items-center gap-2">
                    <div className="flex items-center gap-1 bg-gradient-to-r from-red-600 to-amber-600 text-white text-[10px] font-black uppercase px-2 py-0.5 rounded-full shrink-0 shadow-sm">
                      <Megaphone className="w-3 h-3 text-yellow-200" />
                      <span>শিরোনাম</span>
                    </div>
                    <div className="flex-1 overflow-hidden whitespace-nowrap text-xs font-semibold text-amber-200">
                      <span className="inline-block animate-pulse">{marqueeNotice}</span>
                    </div>
                  </div>
                </div>

                {/* 2. Headline Editor */}
                <div className="bg-[#0b1018] border border-[#223048] rounded-2xl p-4 sm:p-5 space-y-3">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-white flex items-center gap-1.5">
                      <Edit3 className="w-4 h-4 text-amber-400" />
                      <span>হেডার স্ক্রোলিং শিরোনাম লিখুন:</span>
                    </label>
                    <span className="text-[11px] text-slate-400 font-mono">
                      {marqueeNotice.length} অক্ষর
                    </span>
                  </div>

                  <textarea
                    rows={3}
                    value={marqueeNotice}
                    onChange={(e) => setMarqueeNotice(e.target.value)}
                    placeholder="এখানে যা লিখবেন তা অ্যাপের উপরে চলমান শিরোনাম হিসেবে স্ক্রল হবে..."
                    className="w-full bg-[#121926] border border-[#24334c] focus:border-amber-400 rounded-xl p-3 text-xs text-amber-100 font-medium focus:outline-hidden transition-colors"
                  />

                    {/* Preset Template Chips */}
                    <div className="space-y-1.5 pt-1">
                      <span className="text-[11px] font-semibold text-slate-400">তাত্ক্ষণিক টেমপ্লেট নির্বাচন করুন:</span>
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setMarqueeNotice('🎉 স্বাগতম অ্যাভিয়েটর অফিসিয়াল মোবাইল গেমে! ৳ ৫০০ ডিপোজিট করলেই পাচ্ছেন আকর্ষণীয় বোনাস! বিকাশ, নগদ ও রকেটে ১-৩ মিনিটে দ্রুত পেমেন্ট সম্পন্ন হয়। উপভোগ করুন সেরা ক্র্যাশ গেম ও সেরা জয়! 🚀');
                            soundManager.playClick();
                            showAdminToast('টেমপ্লেট লোড হয়েছে!', 'স্ক্রোলিং শিরোনামে সাধারণ নোটিশ সেট হয়েছে। লাইভ করতে নিচের সংরক্ষণ বাটনে চাপুন।', 'info');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#141d2c] hover:bg-[#1e2a3f] border border-[#233148] text-[11px] text-amber-300 cursor-pointer transition-colors"
                        >
                          🚀 সাধারণ স্বাগতম নোটিশ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMarqueeNotice('🔥 ধামাকা অফার! আজকের সকল ডিপোজিটে পাবেন অতিরিক্ত ৫০% ক্যাশব্যাক বোনাস! সরাসরি বিকাশ, নগদ ও রকেটের মাধ্যমে টাকা জমা করুন ও দ্বিগুণ লাভ করুন! ⚡');
                            soundManager.playClick();
                            showAdminToast('টেমপ্লেট লোড হয়েছে!', 'স্ক্রোলিং শিরোনামে বোনাস অফার নোটিশ সেট হয়েছে। লাইভ করতে নিচের সংরক্ষণ বাটনে চাপুন।', 'info');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#141d2c] hover:bg-[#1e2a3f] border border-[#233148] text-[11px] text-emerald-300 cursor-pointer transition-colors"
                        >
                          🎁 বোনাস অফার নোটিশ
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setMarqueeNotice('📢 সতর্কতা: শুধুমাত্র এডমিন প্যানেলে দেওয়া বিকাশ/নগদ/রকেট নম্বরেই টাকা পাঠান। TrxID সাবমিট করার ১-৩ মিনিটের মধ্যে ব্যালেন্স যোগ হবে। ২৪ ঘণ্টা সার্ভিস চালু! 🎮');
                            soundManager.playClick();
                            showAdminToast('টেমপ্লেট লোড হয়েছে!', 'স্ক্রোলিং শিরোনামে সতর্কবার্তা নোটিশ সেট হয়েছে। লাইভ করতে নিচের সংরক্ষণ বাটনে চাপুন।', 'info');
                          }}
                          className="px-2.5 py-1 rounded-lg bg-[#141d2c] hover:bg-[#1e2a3f] border border-[#233148] text-[11px] text-rose-300 cursor-pointer transition-colors"
                        >
                          ⚡ সতর্কবার্তা নোটিশ
                        </button>
                      </div>
                    </div>
                </div>

                {/* 3. Universal Deposit Modal Notice */}
                <div className="bg-[#0b1018] border border-[#223048] rounded-2xl p-4 sm:p-5 space-y-2">
                  <label className="text-xs font-bold text-white block">
                    সার্বজনীন ডিপোজিট নোটিশ (ইউজার যখন ডিপোজিট মডাল খুলবে তখন দেখতে পাবে):
                  </label>
                  <textarea
                    rows={2}
                    value={settings.noticeText}
                    onChange={(e) => setSettings({ ...settings, noticeText: e.target.value })}
                    placeholder="ডিপোজিট নোটিশ লিখুন..."
                    className="w-full bg-[#121926] border border-[#24334c] focus:border-emerald-400 rounded-xl p-3 text-xs text-white focus:outline-hidden"
                  />
                </div>

                {/* 4. Universal Withdrawal Modal Notice */}
                <div className="bg-[#0b1018] border border-[#223048] rounded-2xl p-4 sm:p-5 space-y-2">
                  <label className="text-xs font-bold text-white block">
                    সার্বজনীন উত্তোলন নোটিশ (ইউজার যখন ক্যাশআউট মডাল খুলবে তখন দেখতে পাবে):
                  </label>
                  <textarea
                    rows={2}
                    value={settings.withdrawalNoticeText || 'উত্তোলন দেওয়ার পর এডমিন ভেরিফাই করে ৫-১৫ মিনিটের মধ্যে টাকা পাঠিয়ে দিবে। শুধুমাত্র পার্সোনাল বিকাশ/নগদ/রকেট নম্বর ব্যবহার করুন।'}
                    onChange={(e) => setSettings({ ...settings, withdrawalNoticeText: e.target.value })}
                    placeholder="উত্তোলন নোটিশ লিখুন..."
                    className="w-full bg-[#121926] border border-[#24334c] focus:border-rose-400 rounded-xl p-3 text-xs text-white focus:outline-hidden"
                  />
                </div>

                {/* Save Button */}
                <div className="pt-2">
                  <button
                    type="button"
                    onClick={handleSaveSettings}
                    disabled={isSavingSettings}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-r from-amber-600 via-orange-600 to-amber-700 hover:from-amber-500 hover:to-orange-500 text-white font-black text-sm shadow-xl shadow-amber-950/40 flex items-center justify-center gap-2 cursor-pointer transition-all active:scale-[0.99] disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isSavingSettings ? 'সংরক্ষণ ও ক্লাউড সিঙ্ক হচ্ছে...' : 'শিরোনাম ও নোটিশ সংরক্ষণ করুন (Save & Sync to Cloud)'}</span>
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Reject Deposit Dialog Modal */}
        {rejectingRequestId && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-[#121927] border border-rose-500/40 rounded-2xl p-5 max-w-sm w-full shadow-2xl text-white space-y-4">
              <div className="flex items-center gap-2 text-rose-400">
                <XCircle className="w-5 h-5" />
                <h4 className="font-bold text-base">ডিপোজিট রিকোয়েস্ট বাতিল</h4>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">বাতিলের কারণ লিখুন:</label>
                <input
                  type="text"
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="যেমন: ভুল TrxID বা টাকা পাওয়া যায়নি"
                  className="w-full bg-[#0a0e16] border border-[#233148] rounded-xl px-3 py-2 text-xs text-white focus:outline-hidden focus:border-rose-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2">
                <button
                  onClick={() => setRejectingRequestId(null)}
                  className="px-3 py-1.5 rounded-xl bg-[#1b2538] hover:bg-[#25344c] text-xs font-medium text-slate-300"
                >
                  ফিরে যান
                </button>
                <button
                  onClick={handleReject}
                  className="px-4 py-1.5 rounded-xl bg-rose-600 hover:bg-rose-500 text-white text-xs font-bold shadow-md cursor-pointer"
                >
                  বাতিল নিশ্চিত করুন
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Complete Withdrawal Dialog Modal */}
        {completingWithdrawal && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-[#101724] border border-emerald-500/40 rounded-3xl p-5 max-w-md w-full shadow-2xl text-white space-y-4">
              <div className="flex items-center gap-2 text-emerald-400 border-b border-[#1f2c42] pb-3">
                <CheckCircle2 className="w-6 h-6" />
                <div>
                  <h4 className="font-bold text-base">টাকা পাঠানো নিশ্চিতকরণ (Mark as Sent)</h4>
                  <p className="text-[11px] text-slate-400">গ্রাহকের পার্সোনাল নম্বরে টাকা পাঠিয়ে থাকলে নিশ্চিত করুন</p>
                </div>
              </div>

              <div className="bg-[#0b1018] p-3.5 rounded-2xl border border-[#1d273a] space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">গ্রাহক:</span>
                  <span className="font-bold text-white">{completingWithdrawal.userIdentifier}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">পার্সোনাল নম্বর:</span>
                  <span className="font-mono font-bold text-amber-300 text-sm">{completingWithdrawal.personalNumber}</span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">মাধ্যম:</span>
                  <span className="font-bold uppercase text-white">{completingWithdrawal.method} Personal</span>
                </div>
                <div className="flex items-center justify-between pt-1 border-t border-white/5">
                  <span className="text-slate-300 font-bold">প্রদেয় টাকার পরিমাণ:</span>
                  <span className="font-black text-emerald-400 text-base font-mono-numbers">
                    ৳ {completingWithdrawal.amount.toLocaleString()}
                  </span>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">এডমিন নোট / TrxID (ঐচ্ছিক):</label>
                <input
                  type="text"
                  value={completeAdminNote}
                  onChange={(e) => setCompleteAdminNote(e.target.value)}
                  placeholder="যেমন: TrxID 9K34F2... সেন্ড সম্পন্ন"
                  className="w-full bg-[#0a0e16] border border-[#233148] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-emerald-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setCompletingWithdrawal(null)}
                  className="px-3.5 py-2 rounded-xl bg-[#1b2538] hover:bg-[#25344c] text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  ফিরে যান
                </button>
                <button
                  onClick={() => handleCompleteWithdrawal(completingWithdrawal, completeAdminNote)}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:from-emerald-400 hover:to-green-500 text-white text-xs font-black shadow-lg shadow-emerald-700/30 cursor-pointer flex items-center gap-1.5"
                >
                  <Check className="w-4 h-4 stroke-[3]" />
                  <span>টাকা পাঠানো হয়েছে নিশ্চিত করুন</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Reject Withdrawal Dialog Modal (With Automatic Refund) */}
        {rejectingWithdrawalId && (
          <div className="absolute inset-0 bg-black/80 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-fadeIn">
            <div className="bg-[#140f1a] border border-rose-500/50 rounded-3xl p-5 max-w-md w-full shadow-2xl text-white space-y-4">
              <div className="flex items-center gap-2 text-rose-400 border-b border-[#2d1b28] pb-3">
                <XCircle className="w-6 h-6" />
                <div>
                  <h4 className="font-bold text-base">উত্তোলন রিকোয়েস্ট বাতিল ও ব্যালেন্স রিফান্ড</h4>
                  <p className="text-[11px] text-rose-300/80">বাতিল করলে ইউজারের কাটা টাকা স্বয়ংক্রিয়ভাবে তার একাউন্টে ফেরত চলে যাবে</p>
                </div>
              </div>

              <div>
                <label className="text-xs text-slate-300 block mb-1">বাতিলের কারণ লিখুন:</label>
                <input
                  type="text"
                  value={rejectWithdrawalReason}
                  onChange={(e) => setRejectWithdrawalReason(e.target.value)}
                  placeholder="যেমন: ভুল পার্সোনাল নম্বর / একাউন্ট সমস্যা"
                  className="w-full bg-[#0a0e16] border border-[#233148] rounded-xl px-3 py-2.5 text-xs text-white focus:outline-hidden focus:border-rose-400"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-2">
                <button
                  onClick={() => setRejectingWithdrawalId(null)}
                  className="px-3.5 py-2 rounded-xl bg-[#1b2538] hover:bg-[#25344c] text-xs font-semibold text-slate-300 cursor-pointer"
                >
                  ফিরে যান
                </button>
                <button
                  onClick={handleRejectWithdrawalConfirm}
                  className="px-4 py-2 rounded-xl bg-gradient-to-r from-rose-600 to-red-600 hover:from-rose-500 hover:to-red-500 text-white text-xs font-black shadow-lg shadow-rose-900/30 cursor-pointer flex items-center gap-1.5"
                >
                  <XCircle className="w-4 h-4" />
                  <span>বাতিল ও রিফান্ড নিশ্চিত করুন</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {/* User Full History Modal */}
        {selectedHistoryUserId && (
          <UserFullHistoryModal
            userIdOrCode={selectedHistoryUserId}
            onClose={() => setSelectedHistoryUserId(null)}
            onEditAccount={(identifier) => {
              setSelectedHistoryUserId(null);
              const accounts = getStoredPhoneAccounts();
              for (const k of Object.keys(accounts)) {
                const acc = accounts[k];
                if (
                  acc.phoneNumber === identifier ||
                  acc.userCode === identifier ||
                  acc.uid === identifier
                ) {
                  setEditingAccount(acc);
                  break;
                }
              }
            }}
          />
        )}

        {/* Admin User Edit / ID Reset Modal */}
        {editingAccount && (
          <AdminUserEditModal
            userAccount={editingAccount}
            onClose={() => setEditingAccount(null)}
            onSaved={() => {
              setEditingAccount(null);
              reloadData();
              if (onBalanceAdjusted) onBalanceAdjusted();
              showAdminToast(
                'ইউজার তথ্য সফলভাবে সংরক্ষিত ও আপডেট হয়েছে!',
                'ইউজার আইডি, পাসওয়ার্ড ও ব্যালেন্স ফায়ারবেস ক্লাউডে তাৎক্ষণিক আপডেট সম্পন্ন হয়েছে।',
                'success'
              );
            }}
          />
        )}

        {/* Admin Stealth Guide Modal */}
        <AdminStealthGuideModal
          isOpen={showStealthGuideModal}
          onClose={() => setShowStealthGuideModal(false)}
          adminPhone={adminPhone}
        />
      </div>
    </div>
  );
};
