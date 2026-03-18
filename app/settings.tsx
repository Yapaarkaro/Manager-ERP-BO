import React, { useState, useEffect, useMemo } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { router, useFocusEffect } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';
import { setNavData } from '@/utils/navStore';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Modal,
  Platform,
  Linking,
  TextInput,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft,
  Settings,
  Edit3,
  MapPin,
  Plus,
  ChevronDown,
  ChevronUp,
  Building2,
  Warehouse,
  Home,
  Trash2,
  X,
  Bell,
  Mail,
  FileText,
  Package,
  DollarSign,
  AlertTriangle,
  CreditCard,
  Wallet,
  Receipt,
  Search,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  ChevronRight,
  LogOut,
  Shield,
  FileText as FileTextIcon,
  User,
  Check,
  Send,
  MessageSquare,
  Smartphone,
  Repeat,
} from 'lucide-react-native';
import { getGSTINStateCode, mapLocationsToAddresses } from '@/utils/dataStore';
import { subscriptionStore } from '@/utils/subscriptionStore';
import { useStatusBar } from '@/contexts/StatusBarContext';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { useBusinessData } from '@/hooks/useBusinessData';
import { showAlert, showConfirm } from '@/utils/webAlert';
import CustomAlert from '@/components/CustomAlert';
import { SettingsSkeleton } from '@/components/SkeletonLoader';
import { useWebBackNavigation } from '@/hooks/useWebBackNavigation';
import { supabase, withTimeout } from '@/lib/supabase';
import { usePermissions } from '@/contexts/PermissionContext';
import { getStaffAttendance, getStaffSessions, getBusinessPreferences, updateBusinessPreferences } from '@/services/backendApi';
import type { BusinessPreferences } from '@/services/backendApi';

// Temporary interfaces until they're added to dataStore
interface BusinessAddress {
  id: string;
  name: string;
  type: 'primary' | 'branch' | 'warehouse';
  doorNumber: string;
  addressLine1: string;
  addressLine2: string;
  additionalLines?: string[]; // ✅ Include additionalLines
  city: string;
  stateName: string;
  stateCode: string;
  pincode: string;
  manager?: string;
  phone?: string;
  isPrimary: boolean;
  backendId?: string; // ✅ Include backendId for proper editing
}

interface BankAccount {
  id: string;
  accountHolderName: string;
  bankName: string;
  bankCode: string;
  accountNumber: string;
  ifscCode: string;
  upiId: string;
  accountType: 'savings' | 'current';
  isPrimary: boolean;
}

const Colors = {
  background: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  primary: '#3F66AC', // Brand primary blue
  secondary: '#FFC754', // Brand accent yellow
  success: '#10b981',
  error: '#ef4444',
  warning: '#FFC754', // Using brand yellow for warnings
  grey: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
  }
};

/** Branded colour badges for known wallets; generic wallet icon + text for others */
function getDigitalWalletBadge(walletName: string): { kind: 'brand'; bg: string; abbr: string } | { kind: 'generic' } {
  const lower = walletName.trim().toLowerCase();
  const brands: { match: string; bg: string; abbr: string }[] = [
    { match: 'paytm', bg: '#00BAF2', abbr: 'Pt' },
    { match: 'phonepe', bg: '#5F259F', abbr: 'Pe' },
    { match: 'google pay', bg: '#1A73E8', abbr: 'G' },
    { match: 'googlepay', bg: '#1A73E8', abbr: 'G' },
    { match: 'gpay', bg: '#1A73E8', abbr: 'G' },
    { match: 'amazon pay', bg: '#E47911', abbr: 'Ap' },
    { match: 'amazonpay', bg: '#E47911', abbr: 'Ap' },
    { match: 'freecharge', bg: '#FF6B35', abbr: 'Fc' },
    { match: 'mobikwik', bg: '#D2252B', abbr: 'Mw' },
    { match: 'bhim', bg: '#002F6C', abbr: 'Bh' },
    { match: 'whatsapp', bg: '#25D366', abbr: 'Wa' },
    { match: 'payzapp', bg: '#004C97', abbr: 'Pz' },
    { match: 'airtel', bg: '#E60000', abbr: 'At' },
    { match: 'jiomoney', bg: '#0A2885', abbr: 'Ji' },
    { match: 'jio money', bg: '#0A2885', abbr: 'Ji' },
    { match: 'navi', bg: '#503CF8', abbr: 'Nv' },
    { match: 'cred', bg: '#111827', abbr: 'Cr' },
    { match: 'slice', bg: '#7C3AED', abbr: 'Sl' },
    { match: 'niyo', bg: '#2563EB', abbr: 'Ny' },
  ];
  for (const b of brands) {
    if (lower.includes(b.match)) return { kind: 'brand', bg: b.bg, abbr: b.abbr };
  }
  return { kind: 'generic' };
}

const DEFAULT_USER_PROFILE = {
  name: '',
  position: '',
  businessName: '',
  gstin: '',
  profilePhoto: null as string | null,
};

// Platform-specific shadow/elevation utility for consistent appearance
const getPlatformShadow = () => {
  if (Platform.OS === 'ios') {
    return {
      shadowColor: '#000',
      shadowOffset: {
        width: 0,
        height: 2,
      },
      shadowOpacity: 0.1,
      shadowRadius: 6,
    };
  } else {
    return {
      elevation: 4,
      // Android-specific styling for better visual consistency
      borderWidth: 1,
      borderColor: Colors.grey[200],
    };
  }
};

export default function SettingsScreen() {
  const { setStatusBarStyle } = useStatusBar();
  
  // ✅ Use unified business data hook FIRST (before any useEffects that use it)
  const { data: businessData, loading: isLoading, refetch } = useBusinessData();
  
  // ✅ Initialize userProfile with cached business data if available, otherwise use empty strings (not mock data)
  const getInitialUserProfile = () => {
    // Check if we have cached data available immediately
    const { __getGlobalCache } = require('@/hooks/useBusinessData');
    const cache = __getGlobalCache();
    const now = Date.now();
    const hasValidCache = cache.data && (now - cache.timestamp) < 30000;
    
    if (hasValidCache && cache.data) {
      return {
        name: cache.data.user?.full_name || '',
        position: DEFAULT_USER_PROFILE.position,
        businessName: cache.data.business?.legal_name || '',
        gstin: cache.data.business?.tax_id || '',
        profilePhoto: null as string | null,
      };
    }
    
    // If no cached data, use empty strings instead of mock data
    return {
      name: '',
      position: DEFAULT_USER_PROFILE.position,
      businessName: '',
      gstin: '',
      profilePhoto: null as string | null,
    };
  };
  
  const [userProfile, setUserProfile] = useState(getInitialUserProfile());
  const [subscription, setSubscription] = useState(subscriptionStore.getSubscription());
  const [trialProgress, setTrialProgress] = useState(subscriptionStore.getTrialProgress());
  const { isStaff, staffId, staffName, staffLocationId, hasPermission } = usePermissions();
  const [staffProfile, setStaffProfile] = useState<any>(null);
  const [attendanceData, setAttendanceData] = useState<any[]>([]);
  const [attendanceSessions, setAttendanceSessions] = useState<any[]>([]);
  const [attendanceExpanded, setAttendanceExpanded] = useState(false);
  const [invoiceExtraFieldsEnabled, setInvoiceExtraFieldsEnabled] = useState(false);
  const [selectedInvoiceFields, setSelectedInvoiceFields] = useState<string[]>([]);
  const [showInvoiceFieldsPicker, setShowInvoiceFieldsPicker] = useState(false);
  const [alertState, setAlertState] = useState<{
    visible: boolean;
    title: string;
    message: string;
    buttons: any[];
    type: 'default' | 'success' | 'error' | 'warning' | 'info';
  } | null>(null);

  // Set status bar to dark for white header
  useEffect(() => {
    setStatusBarStyle('dark-content');
  }, [setStatusBarStyle]);

  // Cleanup debounce timer on unmount
  useEffect(() => {
    return () => {
      if (preferenceSaveTimeoutRef.current) clearTimeout(preferenceSaveTimeoutRef.current);
    };
  }, []);

  // Subscribe to alert state changes
  useEffect(() => {
    const { subscribeToAlert, getAlertState } = require('@/utils/webAlert');
    const unsubscribe = subscribeToAlert((state: any) => {
      setAlertState(state);
    });
    // Check initial state
    const initialState = getAlertState();
    if (initialState) {
      setAlertState(initialState);
    }
    return unsubscribe;
  }, []);

  // ✅ Update user profile from business data immediately (runs on every data change)
  // This ensures we update as soon as data loads, even if it wasn't in cache
  useEffect(() => {
    if (businessData?.user || businessData?.business) {
      setUserProfile(prev => {
        const newName = businessData?.user?.full_name || prev.name || '';
        const newBusinessName = businessData?.business?.legal_name || prev.businessName || '';
        const newGstin = businessData?.business?.tax_id || prev.gstin || '';
        
        // Only update if values actually changed (prevent unnecessary re-renders)
        if (newName !== prev.name || newBusinessName !== prev.businessName || newGstin !== prev.gstin) {
          return {
            ...prev,
            name: newName,
            businessName: newBusinessName,
            gstin: newGstin,
          };
        }
        return prev;
      });
    }
  }, [businessData]);

  // Update subscription data
  useEffect(() => {
    setSubscription(subscriptionStore.getSubscription());
    setTrialProgress(subscriptionStore.getTrialProgress());
  }, []);

  const INVOICE_FIELD_OPTIONS = [
    { key: 'delivery_note', label: 'Delivery Note' },
    { key: 'payment_terms', label: 'Mode/Terms of Payment' },
    { key: 'reference_no', label: 'Reference No.' },
    { key: 'reference_date', label: 'Date (for Reference No.)' },
    { key: 'buyers_order_no', label: "Buyer's Order No." },
    { key: 'buyers_order_date', label: "Date (for Buyer's Order No.)" },
    { key: 'dispatch_doc_no', label: 'Dispatch Doc No.' },
    { key: 'delivery_note_date', label: 'Delivery Note Date' },
    { key: 'dispatched_through', label: 'Dispatched Through' },
    { key: 'destination', label: 'Destination' },
    { key: 'terms_of_delivery', label: 'Terms of Delivery' },
  ];

  useEffect(() => {
    (async () => {
      try {
        const val = await AsyncStorage.getItem('@invoice_extra_fields_enabled');
        if (val === 'true') setInvoiceExtraFieldsEnabled(true);
        const fields = await AsyncStorage.getItem('@invoice_selected_fields');
        if (fields) {
          try { setSelectedInvoiceFields(JSON.parse(fields)); } catch {}
        }
      } catch {}
    })();
  }, []);

  const handleInvoiceExtraFieldsToggle = async () => {
    const newVal = !invoiceExtraFieldsEnabled;
    setInvoiceExtraFieldsEnabled(newVal);
    try {
      await AsyncStorage.setItem('@invoice_extra_fields_enabled', newVal ? 'true' : 'false');
    } catch {}
  };

  const toggleInvoiceField = async (key: string) => {
    const updated = selectedInvoiceFields.includes(key)
      ? selectedInvoiceFields.filter(f => f !== key)
      : [...selectedInvoiceFields, key];
    setSelectedInvoiceFields(updated);
    try { await AsyncStorage.setItem('@invoice_selected_fields', JSON.stringify(updated)); } catch {}
    const shouldEnable = updated.length > 0;
    if (shouldEnable !== invoiceExtraFieldsEnabled) {
      setInvoiceExtraFieldsEnabled(shouldEnable);
      try { await AsyncStorage.setItem('@invoice_extra_fields_enabled', shouldEnable ? 'true' : 'false'); } catch {}
    }
  };

  const selectAllInvoiceFields = async () => {
    const allKeys = INVOICE_FIELD_OPTIONS.map(f => f.key);
    const allSelected = allKeys.every(k => selectedInvoiceFields.includes(k));
    const updated = allSelected ? [] : allKeys;
    setSelectedInvoiceFields(updated);
    try { await AsyncStorage.setItem('@invoice_selected_fields', JSON.stringify(updated)); } catch {}
    if (updated.length > 0 && !invoiceExtraFieldsEnabled) {
      setInvoiceExtraFieldsEnabled(true);
      try { await AsyncStorage.setItem('@invoice_extra_fields_enabled', 'true'); } catch {}
    }
    if (updated.length === 0 && invoiceExtraFieldsEnabled) {
      setInvoiceExtraFieldsEnabled(false);
      try { await AsyncStorage.setItem('@invoice_extra_fields_enabled', 'false'); } catch {}
    }
  };

  // Load staff profile details
  useEffect(() => {
    if (!isStaff || !staffId) return;
    (async () => {
      try {
        const { supabase } = await import('@/lib/supabase');
        const { data } = await supabase
          .from('staff')
          .select('*, locations(name, city)')
          .eq('id', staffId)
          .single();
        if (data) setStaffProfile(data);
      } catch {}
    })();
  }, [isStaff, staffId]);

  // Load staff attendance when settings screen is visible
  useEffect(() => {
    if (!isStaff || !staffId) return;
    let cancelled = false;
    (async () => {
      const now = new Date();
      const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
      const today = now.toISOString().split('T')[0];

      const [attResult, sessResult] = await Promise.all([
        getStaffAttendance({ staffId, startDate: startOfMonth, endDate: today }),
        getStaffSessions({ staffId, startDate: startOfMonth, endDate: today }),
      ]);
      if (cancelled) return;
      if (attResult.success && attResult.attendance) setAttendanceData(attResult.attendance);
      if (sessResult.success && sessResult.sessions) setAttendanceSessions(sessResult.sessions);
    })();
    return () => { cancelled = true; };
  }, [isStaff, staffId]);

  const [addresses, setAddresses] = useState<BusinessAddress[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isAddingBankAccount, setIsAddingBankAccount] = useState(false);
  const [showFullBankDetails, setShowFullBankDetails] = useState<Set<string>>(new Set());
  const [showDeleteAccountModal, setShowDeleteAccountModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  
  // Notification settings state
  const [notificationSettings, setNotificationSettings] = useState({
    pushNotifications: true,
    emailNotifications: true,
    whatsappNotifications: false,
    weeklyReports: false,
    lowStockAlerts: true,
    overdueReceivables: true,
    overduePayables: true,
  });

  const [autoSendSettings, setAutoSendSettings] = useState({
    autoSendPO: true,
    autoSendReturnInvoice: true,
    autoSendDiscrepancy: false,
    autoSendPayment: false,
  });

  // Payment settings state
  const [paymentMethods, setPaymentMethods] = useState({
    cash: true,
    upi: true,
    card: true,
    bankTransfer: true,
    cheque: false,
    digitalWallet: true,
  });

  const [activeBankAccounts, setActiveBankAccounts] = useState<Set<string>>(new Set());
  const [digitalWallets, setDigitalWallets] = useState<string[]>(['Paytm', 'PhonePe', 'Google Pay', 'Amazon Pay', 'Freecharge', 'MobiKwik']);
  const [showDigitalWalletsModal, setShowDigitalWalletsModal] = useState(false);
  const [customWalletName, setCustomWalletName] = useState('');
  const [preferencesLoaded, setPreferencesLoaded] = useState(false);
  const preferenceSaveTimeoutRef = React.useRef<ReturnType<typeof setTimeout> | null>(null);

  // Subscription state
  const [subscriptions, setSubscriptions] = useState([]);

  const [showPaymentMethodsModal, setShowPaymentMethodsModal] = useState(false);
  const [showBankAccountsModal, setShowBankAccountsModal] = useState(false);

  // ✅ Use useMemo for instant derived data from cached businessData (no delay)
  const formattedAddresses = useMemo(() => {
    if (!businessData?.addresses) return [];
    return mapLocationsToAddresses(businessData.addresses);
  }, [businessData?.addresses]);

  const formattedBankAccounts = useMemo(() => {
    if (!businessData?.bankAccounts) return [];
    return businessData.bankAccounts.map((acc: any) => ({
      id: acc.id,
      accountHolderName: acc.account_holder_name,
      bankName: acc.bank_name,
      bankCode: acc.bank_short_name || '',
      accountNumber: acc.account_number,
      ifscCode: acc.ifsc_code,
      upiId: acc.upi_id || '',
      accountType: acc.account_type.toLowerCase() as 'savings' | 'current',
      isPrimary: acc.is_primary || false,
      initial_balance: acc.initial_balance ?? acc.opening_balance ?? 0,
      current_balance: acc.current_balance ?? acc.balance ?? 0,
    }));
  }, [businessData?.bankAccounts]);

  // ✅ Update state only when formatted data changes (instant from cache)
  useEffect(() => {
    setAddresses(formattedAddresses);
  }, [formattedAddresses]);

  useEffect(() => {
    setBankAccounts(formattedBankAccounts);
  }, [formattedBankAccounts]);

  useFocusEffect(
    React.useCallback(() => {
      refetch().catch((error) => {
        console.error('Error refetching settings data:', error);
      });
    }, [refetch])
  );

  // Load business preferences from Supabase
  useEffect(() => {
    if (!businessData?.business?.id || preferencesLoaded) return;
    (async () => {
      const result = await getBusinessPreferences(businessData.business.id);
      if (result.success && result.preferences) {
        const p = result.preferences;
        setNotificationSettings({
          pushNotifications: p.push_notifications,
          emailNotifications: p.email_notifications,
          whatsappNotifications: p.whatsapp_notifications,
          weeklyReports: p.weekly_reports,
          lowStockAlerts: p.low_stock_alerts,
          overdueReceivables: p.overdue_receivables,
          overduePayables: p.overdue_payables,
        });
        setAutoSendSettings({
          autoSendPO: p.auto_send_po,
          autoSendReturnInvoice: p.auto_send_return_invoice,
          autoSendDiscrepancy: p.auto_send_discrepancy,
          autoSendPayment: p.auto_send_payment,
        });
        if (p.payment_methods && typeof p.payment_methods === 'object') {
          setPaymentMethods(prev => ({ ...prev, ...p.payment_methods }));
        }
        if (Array.isArray(p.active_bank_accounts)) {
          setActiveBankAccounts(new Set(p.active_bank_accounts));
        }
        if (Array.isArray(p.digital_wallets) && p.digital_wallets.length > 0) {
          setDigitalWallets(p.digital_wallets);
        }
        setPreferencesLoaded(true);
      }
    })();
  }, [businessData?.business?.id, preferencesLoaded]);

  // Debounced save to Supabase when any preference changes
  const savePreferencesToBackend = React.useCallback(() => {
    if (!businessData?.business?.id || !preferencesLoaded) return;
    if (preferenceSaveTimeoutRef.current) clearTimeout(preferenceSaveTimeoutRef.current);
    preferenceSaveTimeoutRef.current = setTimeout(async () => {
      await updateBusinessPreferences(businessData.business.id, {
        push_notifications: notificationSettings.pushNotifications,
        email_notifications: notificationSettings.emailNotifications,
        whatsapp_notifications: notificationSettings.whatsappNotifications,
        weekly_reports: notificationSettings.weeklyReports,
        low_stock_alerts: notificationSettings.lowStockAlerts,
        overdue_receivables: notificationSettings.overdueReceivables,
        overdue_payables: notificationSettings.overduePayables,
        auto_send_po: autoSendSettings.autoSendPO,
        auto_send_return_invoice: autoSendSettings.autoSendReturnInvoice,
        auto_send_discrepancy: autoSendSettings.autoSendDiscrepancy,
        auto_send_payment: autoSendSettings.autoSendPayment,
        payment_methods: paymentMethods,
        active_bank_accounts: Array.from(activeBankAccounts),
        digital_wallets: digitalWallets,
      });
    }, 800);
  }, [businessData?.business?.id, preferencesLoaded, notificationSettings, autoSendSettings, paymentMethods, activeBankAccounts, digitalWallets]);

  const prefsChangedAfterLoad = React.useRef(false);
  useEffect(() => {
    if (!preferencesLoaded) return;
    if (!prefsChangedAfterLoad.current) {
      prefsChangedAfterLoad.current = true;
      return;
    }
    savePreferencesToBackend();
  }, [notificationSettings, autoSendSettings, paymentMethods, activeBankAccounts, digitalWallets]);

  const getAddressesByType = (type: 'branch' | 'warehouse') => {
    return addresses.filter(addr => addr.type === type);
  };

  const getPrimaryAddress = () => {
    return addresses.find(addr => addr.isPrimary) || null;
  };

  const getPrimaryBankAccount = () => {
    return bankAccounts.find(acc => acc.isPrimary) || null;
  };

  const { handleBack } = useWebBackNavigation();
  
  const handleBackPress = () => {
    handleBack();
  };


  const handleEditProfile = () => {
    // TODO: Navigate to edit profile screen
    console.log('Edit profile pressed');
  };

  const handleAddAddress = (type: 'branch' | 'warehouse') => {
    // Prevent multiple forms from opening
    if (isAddingAddress) {
      return;
    }
    
    setIsAddingAddress(true);
    
    // Navigate to the correct address flow based on type
    if (type === 'branch') {
      safeRouter.push('/locations/add-branch');
    } else if (type === 'warehouse') {
      safeRouter.push('/locations/add-warehouse');
    }
  };

  const handleEditAddress = (address: BusinessAddress) => {
    // Prevent multiple forms from opening
    if (isAddingAddress) {
      return;
    }
    
    setIsAddingAddress(true);
    
    // ✅ Use edit-address-simple.tsx for all address types (consistent with business summary)
    // This ensures proper backend sync and consistent editing experience
    // Use backendId if available, otherwise use local ID
    const addressId = address.backendId || address.id;
    
    safeRouter.push({
      pathname: '/edit-address-simple',
      params: {
        editAddressId: addressId,
        addressType: address.type,
        fromSettings: 'true',
      }
    });
  };

  const handleDeleteAddress = (addressId: string) => {
    setAddressToDelete(addressId);
    setShowDeleteModal(true);
  };

  const handleAddBankAccount = () => {
    // Prevent multiple forms from opening
    if (isAddingBankAccount) {
      return;
    }
    
    setIsAddingBankAccount(true);
    
    // Navigate to add bank account page
    safeRouter.push({
      pathname: '/add-bank-account',
      params: { returnTo: 'settings' },
    } as any);
  };

  const handleEditBankAccount = (account: BankAccount) => {
    if (isAddingBankAccount) return;
    setIsAddingBankAccount(true);

    setNavData('editBankAccount', account);
    safeRouter.push({
      pathname: '/edit-bank-account',
      params: {
        editAccountId: account.id,
        bankId: account.id,
        fromSettings: 'true',
        returnTo: 'settings',
      },
    } as any);
  };

  const handleDeleteBankAccount = async (accountId: string) => {
    try {
      // Find account to get backend ID
      const account = bankAccounts.find(acc => acc.id === accountId);
      if (account?.id) {
        const { deleteBankAccount } = await import('@/services/backendApi');
        const result = await deleteBankAccount(account.id);
        
        if (result.success) {
          // Optimistic update - remove from UI immediately
          setBankAccounts(prev => prev.filter(acc => acc.id !== accountId));
          // Refresh cache to get latest data
          refetch();
        } else {
          Alert.alert('Error', result.error || 'Failed to delete bank account');
        }
      }
    } catch (error) {
      console.error('Error deleting bank account:', error);
      Alert.alert('Error', 'Failed to delete bank account');
    }
  };

  const handleLogout = async () => {
    showConfirm(
      'Logout',
      'Are you sure you want to logout?',
      async () => {
        try {
          setIsLoggingOut(true);
          const { error } = await withTimeout(
            supabase.auth.signOut(),
            10000,
            'Settings: signOut'
          );
          if (error) {
            throw error;
          }
          await subscriptionStore.clearSubscriptionData();
          const { clearBusinessContext } = await import('@/services/backendApi');
          clearBusinessContext();
          const { clearBusinessDataCache } = await import('@/hooks/useBusinessData');
          clearBusinessDataCache();
          safeRouter.replace('/auth/mobile');
        } catch (error) {
          console.error('Error logging out:', error);
          showAlert(
            'Error',
            'Failed to logout. Please try again.',
            [{ text: 'OK' }],
            undefined,
            'error'
          );
          setIsLoggingOut(false);
        }
      },
      () => {
        // User cancelled
      }
    );
  };

  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleAutoSendToggle = (key: keyof typeof autoSendSettings) => {
    setAutoSendSettings(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handlePaymentMethodToggle = (method: keyof typeof paymentMethods) => {
    setPaymentMethods(prev => ({ ...prev, [method]: !prev[method] }));
  };

  const handleBankAccountToggle = (accountId: string) => {
    setActiveBankAccounts(prev => {
      const newSet = new Set(prev);
      if (newSet.has(accountId)) newSet.delete(accountId);
      else newSet.add(accountId);
      return newSet;
    });
  };

  const handleAddCustomWallet = () => {
    const name = customWalletName.trim();
    if (!name) return;
    if (digitalWallets.includes(name)) {
      showAlert('Already Added', `"${name}" is already in your wallet list.`);
      return;
    }
    setDigitalWallets(prev => [...prev, name]);
    setCustomWalletName('');
  };

  const handleRemoveWallet = (walletName: string) => {
    setDigitalWallets(prev => prev.filter(w => w !== walletName));
  };

  const confirmDeleteAddress = async () => {
    if (addressToDelete) {
      try {
        // Find address to get backend ID
        const address = addresses.find(addr => addr.id === addressToDelete);
        if (address?.backendId) {
          const { deleteAddress } = await import('@/services/backendApi');
          const result = await deleteAddress(address.backendId);
          
          if (result.success) {
            // Optimistic update - remove from UI immediately
            setAddresses(prev => prev.filter(addr => addr.id !== addressToDelete));
            // Refresh cache to get latest data
            refetch();
          } else {
            Alert.alert('Error', result.error || 'Failed to delete address');
          }
        }
        setAddressToDelete(null);
        setShowDeleteModal(false);
      } catch (error) {
        console.error('Error deleting address:', error);
        Alert.alert('Error', 'Failed to delete address');
        setAddressToDelete(null);
        setShowDeleteModal(false);
      }
    }
  };

  const handleDeleteAccountPress = () => {
    setShowDeleteAccountModal(true);
  };

  const cancelDeleteAccount = () => {
    if (isDeletingAccount) {
      return;
    }
    setShowDeleteAccountModal(false);
  };

  const handleConfirmDeleteAccount = async () => {
    if (isDeletingAccount) {
      return;
    }

    try {
      setIsDeletingAccount(true);
      await subscriptionStore.clearSubscriptionData();
      const { clearBusinessDataCache } = await import('@/hooks/useBusinessData');
      clearBusinessDataCache();

      setAddresses([]);
      setBankAccounts([]);
      setExpandedCards(new Set());
      setActiveBankAccounts(new Set());
      setNotificationSettings({
        pushNotifications: true,
        emailNotifications: true,
        weeklyReports: false,
        lowStockAlerts: true,
        overdueReceivables: true,
        overduePayables: true,
      });
      setPaymentMethods({
        cash: true,
        upi: true,
        card: true,
        bankTransfer: true,
        cheque: false,
        digitalWallet: true,
      });
      setSubscription(subscriptionStore.getSubscription());
      setTrialProgress(subscriptionStore.getTrialProgress());
      setUserProfile({ ...DEFAULT_USER_PROFILE });

      setShowDeleteAccountModal(false);
      safeRouter.replace('/auth/mobile');
    } catch (error) {
      console.error('Error deleting account:', error);
      Alert.alert('Delete Account Failed', 'Something went wrong while deleting the account. Please try again.');
    } finally {
      setIsDeletingAccount(false);
    }
  };

  const toggleCardExpansion = (cardId: string) => {
    const newExpandedCards = new Set(expandedCards);
    if (newExpandedCards.has(cardId)) {
      newExpandedCards.delete(cardId);
      } else {
      newExpandedCards.add(cardId);
    }
    setExpandedCards(newExpandedCards);
  };

  const formatAddress = (address: BusinessAddress) => {
    const parts = [
      address.doorNumber,
      address.addressLine1,
      address.addressLine2,
      address.city,
      `${address.stateName} - ${address.pincode}`
    ].filter(part => part && part.trim() !== '');
    
    return parts.join(', ');
  };

  const getAddressTypeInfo = (type: 'primary' | 'branch' | 'warehouse') => {
    switch (type) {
      case 'primary':
        return {
          icon: Home,
          color: Colors.primary, // #3F66AC
          bgColor: Colors.primary + '15',
          label: 'Primary Business',
          description: 'Main business location',
          sectionTitle: 'Primary Business Address'
        };
      case 'branch':
        return {
          icon: Building2,
          color: Colors.secondary, // #FFC754
          bgColor: Colors.secondary + '15',
          label: 'Business Branch',
          description: 'Additional business location',
          sectionTitle: 'Branch Offices'
        };
      case 'warehouse':
        return {
          icon: Warehouse,
          color: '#10b981', // Keep green for warehouse
          bgColor: '#f0fdf4',
          label: 'Warehouse',
          description: 'Storage and inventory location',
          sectionTitle: 'Warehouses'
        };
    }
  };

  const renderAddressSection = (sectionType: 'primary' | 'branch' | 'warehouse') => {
    const typeInfo = getAddressTypeInfo(sectionType);
    const IconComponent = typeInfo.icon;
    
    if (sectionType === 'primary') {
      const primaryAddress = getPrimaryAddress();
      if (!primaryAddress) {
    return (
          <View key={sectionType} style={styles.addressSubsection}>
            <TouchableOpacity 
              style={styles.subsectionHeader}
              onPress={() => toggleCardExpansion(sectionType)}
              activeOpacity={0.7}
            >
              <View style={styles.subsectionHeaderContent}>
                <IconComponent size={20} color={typeInfo.color} />
                <Text style={styles.subsectionTitle}>
                  {typeInfo.sectionTitle} (0)
          </Text>
        </View>
              <ChevronDown size={16} color={Colors.textLight} />
            </TouchableOpacity>
          
            {expandedCards.has(sectionType) && (
              <View style={styles.expandedContent}>
            <TouchableOpacity 
                  style={[styles.addFirstButton, { backgroundColor: typeInfo.color }]}
                  onPress={() => {
                    // Get business data for navigation
                    const business = businessData?.business;
                    const user = businessData?.user;
                    safeRouter.push({
                      pathname: '/auth/business-address',
                      params: { 
                        addressType: 'primary',
                        editMode: 'false',
                        // Pass business info if available
                        ...(business?.legal_name && { businessName: business.legal_name }),
                        ...(business?.tax_id && { value: business.tax_id }),
                        ...(business?.tax_id && business.tax_id.length === 15 && { type: 'GSTIN' }),
                        ...(business?.tax_id && business.tax_id.length === 10 && { type: 'PAN' }),
                        ...(user?.name && { name: user.name }),
                        existingAddresses: JSON.stringify(addresses)
                      }
                    });
                  }}
              activeOpacity={0.7}
            >
                  <Plus size={16} color="#ffffff" />
                  <Text style={styles.addFirstButtonText}>Add Primary Address</Text>
            </TouchableOpacity>
              </View>
            )}
          </View>
        );
      }
            
      return (
        <View key={sectionType} style={styles.addressSubsection}>
                <TouchableOpacity 
            style={styles.subsectionHeader}
            onPress={() => toggleCardExpansion(sectionType)}
                  activeOpacity={0.7}
                >
            <View style={styles.subsectionHeaderContent}>
              <IconComponent size={20} color={typeInfo.color} />
              <Text style={styles.subsectionTitle}>
                {typeInfo.sectionTitle} (1)
              </Text>
            </View>
            <ChevronDown size={16} color={Colors.textLight} />
                </TouchableOpacity>
          
          {expandedCards.has(sectionType) && (
            <View style={styles.expandedContent}>
              {renderAddressDetails(primaryAddress, 'primary')}
            </View>
          )}
        </View>
      );
    }
    
    const sectionAddresses = getAddressesByType(sectionType);
    const isExpanded = expandedCards.has(sectionType);
    
    return (
      <View key={sectionType} style={styles.addressSubsection}>
                  <TouchableOpacity 
          style={styles.subsectionHeader}
          onPress={() => toggleCardExpansion(sectionType)}
                    activeOpacity={0.7}
                  >
          <View style={styles.subsectionHeaderContent}>
            <IconComponent size={20} color={typeInfo.color} />
            <Text style={styles.subsectionTitle}>
              {typeInfo.sectionTitle} ({sectionAddresses.length})
            </Text>
          </View>
          <View style={styles.subsectionHeaderActions}>
            <TouchableOpacity
              style={[
                styles.addButton, 
                { 
                  backgroundColor: typeInfo.color + '10', 
                  borderColor: typeInfo.color + '20',
                  opacity: isAddingAddress ? 0.5 : 1
                }
              ]}
              onPress={() => handleAddAddress(sectionType)}
              activeOpacity={0.7}
              disabled={isAddingAddress}
            >
              {isAddingAddress ? (
                <Text style={[styles.addButtonText, { color: typeInfo.color }]}>
                  Loading...
                </Text>
              ) : (
                <Text style={[styles.addButtonText, { color: typeInfo.color }]}>
                  Add {sectionType === 'branch' ? 'Branch' : 'Warehouse'}
                </Text>
              )}
          </TouchableOpacity>
            <ChevronDown size={16} color={Colors.textLight} />
          </View>
        </TouchableOpacity>
        
        {isExpanded && (
          <View style={styles.expandedContent}>
            {sectionAddresses.length > 0 ? (
              <View style={styles.addressList}>
                {sectionAddresses.map((address) => (
                  <View key={address.id} style={styles.addressItem}>
                    {renderAddressDetails(address, sectionType)}
                  </View>
                ))}
              </View>
            ) : (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No {sectionType} addresses yet</Text>
              </View>
        )}
              </View>
            )}
          </View>
    );
  };

  const renderAddressDetails = (address: BusinessAddress, type: 'primary' | 'branch' | 'warehouse') => {
    const typeInfo = getAddressTypeInfo(type);
    
    return (
      <View style={styles.addressDetails}>
        {/* Address Name and Type */}
        <View style={styles.addressNameRow}>
      <Text style={styles.addressName}>{address.name}</Text>
          <View style={[styles.addressTypeBadge, { backgroundColor: typeInfo.bgColor }]}>
            <Text style={[styles.addressTypeText, { color: typeInfo.color }]}>
              {typeInfo.label}
            </Text>
            {address.isPrimary && (
              <Text style={[styles.primaryBadge, { color: typeInfo.color }]}> • PRIMARY</Text>
            )}
          </View>
        </View>
        
        {/* Address Lines */}
        <View style={styles.addressLines}>
                {address.doorNumber && address.doorNumber.trim() !== '' && (
            <Text style={styles.addressLine}>{address.doorNumber}</Text>
                )}
                {address.addressLine1 && address.addressLine1.trim() !== '' && (
            <Text style={styles.addressLine}>{address.addressLine1}</Text>
                )}
                {address.addressLine2 && address.addressLine2.trim() !== '' && (
            <Text style={styles.addressLine}>{address.addressLine2}</Text>
                )}
                {/* ✅ Display additional address lines */}
                {address.additionalLines && Array.isArray(address.additionalLines) && address.additionalLines.length > 0 && (
                  address.additionalLines.map((line, index) => (
                    line && line.trim() !== '' && (
                      <Text key={index} style={styles.addressLine}>{line}</Text>
                    )
                  ))
                )}
                {address.city && address.city.trim() !== '' && (
            <Text style={styles.addressLine}>{address.city}</Text>
                )}
                {address.stateName && address.stateName.trim() !== '' && (
            <Text style={styles.addressLine}>
                    {address.stateName}
                    {address.stateCode && address.stateCode.trim() !== '' && (
                      <Text style={styles.gstCodeText}> (GST: {address.stateCode})</Text>
                    )}
                  </Text>
                )}
                {address.pincode && address.pincode.trim() !== '' && (
            <Text style={styles.addressLine}>{address.pincode}</Text>
                )}
        </View>
                
        {/* Manager and Contact */}
        {(address.manager || address.phone) && (
          <View style={styles.contactInfo}>
                {address.manager && address.manager.trim() !== '' && (
              <Text style={styles.contactLine}>Manager: {address.manager}</Text>
                )}
                {address.phone && address.phone.trim() !== '' && (
                  <TouchableOpacity 
                style={styles.phoneLine}
                onPress={() => Linking.openURL(`tel:${address.phone}`)}
                    activeOpacity={0.7}
                  >
                <Text style={styles.contactLine}>Phone: {address.phone}</Text>
                  </TouchableOpacity>
                )}
              </View>
        )}
        
        {/* Actions - Edit and Delete Icons */}
        <View style={styles.addressActions}>
          <TouchableOpacity 
            style={styles.actionIconButton}
            onPress={() => handleEditAddress(address)}
            activeOpacity={0.7}
          >
            <Edit3 size={16} color={Colors.primary} />
          </TouchableOpacity>
          
          {type !== 'primary' && (
            <TouchableOpacity 
              style={styles.actionIconButton}
              onPress={() => handleDeleteAddress(address.id)}
              activeOpacity={0.7}
            >
              <Trash2 size={16} color={Colors.error} />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  };

  const renderBankAccountsSection = () => {
    const primaryBankAccount = bankAccounts.find(acc => acc.isPrimary);
    const otherBankAccounts = bankAccounts.filter(acc => !acc.isPrimary);
    
    return (
      <>
        {/* Primary Bank Account Section */}
        <View style={styles.addressSubsection}>
          <TouchableOpacity 
            style={styles.subsectionHeader}
            onPress={() => toggleCardExpansion('primary-bank')}
            activeOpacity={0.7}
          >
            <View style={styles.subsectionHeaderContent}>
              <Text style={styles.subsectionTitle}>
                Primary Bank Account ({primaryBankAccount ? '1' : '0'})
              </Text>
            </View>
            <ChevronDown size={16} color={Colors.textLight} />
          </TouchableOpacity>
          
          {expandedCards.has('primary-bank') && (
            <View style={styles.expandedContent}>
              {primaryBankAccount ? (
                renderBankAccountDetails(primaryBankAccount)
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No primary bank account set</Text>
                  <TouchableOpacity
                    style={[styles.addFirstButton, { backgroundColor: Colors.primary }]}
                    onPress={() => handleAddBankAccount()}
                    activeOpacity={0.7}
                  >
                    <Plus size={16} color="#ffffff" />
                    <Text style={styles.addFirstButtonText}>Add Primary Bank Account</Text>
                  </TouchableOpacity>
            </View>
          )}
    </View>
          )}
        </View>

        {/* Other Bank Accounts Section */}
        <View style={styles.addressSubsection}>
          <TouchableOpacity 
            style={styles.subsectionHeader}
            onPress={() => toggleCardExpansion('other-banks')}
            activeOpacity={0.7}
          >
            <View style={styles.subsectionHeaderContent}>
              <Text style={styles.subsectionTitle}>
                Other Bank Accounts ({otherBankAccounts.length})
              </Text>
            </View>
            <View style={styles.subsectionHeaderActions}>
                               <TouchableOpacity
                   style={[styles.addButton, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary + '30' }]}
                   onPress={() => handleAddBankAccount()}
                   activeOpacity={0.7}
                   disabled={isAddingBankAccount}
                 >
                   {isAddingBankAccount ? (
                     <Text style={[styles.addButtonText, { color: Colors.primary }]}>Loading...</Text>
                   ) : (
                     <Text style={[styles.addButtonText, { color: Colors.primary }]}>Add Bank</Text>
                   )}
                 </TouchableOpacity>
              <ChevronDown size={16} color={Colors.textLight} />
            </View>
          </TouchableOpacity>
          
          {expandedCards.has('other-banks') && (
            <View style={styles.expandedContent}>
              {otherBankAccounts.length > 0 ? (
                <View style={styles.bankAccountsList}>
                  {otherBankAccounts.map((account) => (
                    <View key={account.id} style={styles.bankAccountItem}>
                      {renderBankAccountDetails(account)}
                    </View>
                  ))}
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <Text style={styles.emptyText}>No other bank accounts yet</Text>
                </View>
              )}
            </View>
          )}
        </View>
      </>
    );
  };

    const renderBankAccountDetails = (account: BankAccount) => {
    const showFullDetails = showFullBankDetails.has(account.id);
    
    const maskAccountNumber = (number: string) => {
      if (number.length <= 4) return number;
      return '*'.repeat(number.length - 4) + number.slice(-4);
    };
    
    const maskUpiId = (upi: string) => {
      if (upi.length <= 8) return upi;
      const atIndex = upi.indexOf('@');
      if (atIndex > 0) {
        const username = upi.substring(0, atIndex);
        const domain = upi.substring(atIndex);
        if (username.length <= 3) return upi;
        return username.substring(0, 3) + '*'.repeat(username.length - 3) + domain;
      }
      return upi;
    };

    return (
      <View style={styles.bankAccountDetails}>
        {/* Account Name and Type */}
        <View style={styles.bankAccountNameRow}>
          <Text style={styles.bankAccountName}>{account.accountHolderName}</Text>
          <View style={[styles.bankAccountTypeBadge, { backgroundColor: Colors.primary + '15' }]}>
            <Text style={[styles.bankAccountTypeText, { color: Colors.primary }]}>
              {account.accountType.charAt(0).toUpperCase() + account.accountType.slice(1)}
            </Text>
            {account.isPrimary && (
              <Text style={[styles.primaryBadge, { color: Colors.primary }]}> • PRIMARY</Text>
            )}
          </View>
        </View>
        
        {/* Bank Details */}
        <View style={styles.bankDetails}>
          <Text style={styles.bankDetailLine}>Bank: {account.bankName}</Text>
          <Text style={styles.bankDetailLine}>
            Account: <Text style={styles.monospaceFont}>
              {showFullDetails ? account.accountNumber : maskAccountNumber(account.accountNumber)}
            </Text>
          </Text>
          <Text style={styles.bankDetailLine}>
            IFSC: <Text style={styles.monospaceFont}>{account.ifscCode}</Text>
          </Text>
          <Text style={styles.bankDetailLine}>
            UPI: <Text style={styles.monospaceFont}>
              {showFullDetails ? account.upiId : maskUpiId(account.upiId)}
            </Text>
          </Text>
        </View>
        
        {/* Actions */}
        <View style={styles.bankAccountActions}>
          <TouchableOpacity 
            style={styles.viewButton}
            onPress={() => {
              const newSet = new Set(showFullBankDetails);
              if (showFullDetails) {
                newSet.delete(account.id);
              } else {
                newSet.add(account.id);
              }
              setShowFullBankDetails(newSet);
            }}
            activeOpacity={0.7}
          >
            <Text style={styles.viewButtonText}>
              {showFullDetails ? 'Hide' : 'View'}
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity 
            style={styles.actionIconButton}
            onPress={() => handleEditBankAccount(account)}
            activeOpacity={0.7}
          >
            <Edit3 size={16} color={Colors.primary} />
          </TouchableOpacity>
          
          {!account.isPrimary && (
            <TouchableOpacity 
              style={styles.actionIconButton}
              onPress={async () => {
                try {
                  const { updateBusinessPrimaryBankAccount } = await import('@/services/backendApi');
                  const result = await updateBusinessPrimaryBankAccount(account.id);
                  if (result.success) {
                    refetch();
                  } else {
                    Alert.alert('Error', result.error || 'Failed to set primary bank account');
                  }
                } catch (error) {
                  console.error('Error setting primary bank account:', error);
                  Alert.alert('Error', 'Failed to set primary bank account');
                }
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.setPrimaryIcon}>⭐</Text>
            </TouchableOpacity>
          )}
          
          <TouchableOpacity 
            style={styles.actionIconButton}
            onPress={() => handleDeleteBankAccount(account.id)}
            activeOpacity={0.7}
          >
            <Trash2 size={16} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  // Reset the adding state when component regains focus
  useEffect(() => {
    // Reset adding state when component mounts or when addresses change
    // This ensures the form can be opened again after navigation
    setIsAddingAddress(false);
  }, [addresses]);

  // Reset the adding state when the screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      setIsAddingAddress(false);
      setIsAddingBankAccount(false);
    }, [])
  );

  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer>
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackPress}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Settings</Text>
      </View>

      {isLoading ? (
        <View style={styles.content}>
          <SettingsSkeleton />
        </View>
      ) : (
      <ScrollView style={styles.content} contentContainerStyle={webContainerStyles.webScrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Section - Owner View */}
        {!isStaff && (
          <View style={styles.profileSection}>
            <View style={styles.profileHeader}>
              <View style={styles.profileImageContainer}>
                <View style={[styles.profileImage, { backgroundColor: Colors.primary }]}>
                  <Text style={styles.profileImageText}>
                    {userProfile.name 
                      ? userProfile.name.split(' ').map((n: string) => n[0]).join('').toUpperCase() 
                      : 'U'}
                  </Text>
                </View>
              </View>
              <View style={styles.profileInfo}>
                <Text style={styles.profileName}>
                  {userProfile.name || 'Loading...'}
                </Text>
                <Text style={styles.profilePosition}>{userProfile.position}</Text>
                <Text style={styles.profileBusiness}>
                  {userProfile.businessName || 'Loading...'}
                </Text>
                <Text style={styles.profileGstin}>
                  {userProfile.gstin || 'Loading...'}
                </Text>
              </View>
              <TouchableOpacity
                style={styles.editProfileButton}
                onPress={handleEditProfile}
                activeOpacity={0.7}
              >
                <Edit3 size={20} color={Colors.primary} />
              </TouchableOpacity>
            </View>
          </View>
        )}

        {/* Profile Section - Staff View */}
        {isStaff && (
          <View style={styles.staffProfileCard}>
            <View style={styles.staffProfileTop}>
              <View style={styles.staffAvatar}>
                <Text style={styles.staffAvatarText}>
                  {(staffProfile?.name || staffName || '?')[0].toUpperCase()}
                </Text>
              </View>
              <View style={styles.staffProfileHeaderInfo}>
                <Text style={styles.staffProfileName}>{staffProfile?.name || staffName || 'Staff'}</Text>
                <Text style={styles.staffProfileRole}>{staffProfile?.role || staffProfile?.job_role || 'Staff Member'}</Text>
                {staffProfile?.department ? (
                  <View style={styles.staffDeptBadge}>
                    <Text style={styles.staffDeptBadgeText}>{staffProfile.department}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            {staffProfile && (
              <View style={styles.staffDetailsGrid}>
                {staffProfile.employee_id ? (
                  <View style={styles.staffDetailRow}>
                    <Text style={styles.staffDetailLabel}>Employee ID</Text>
                    <Text style={styles.staffDetailValue}>{staffProfile.employee_id}</Text>
                  </View>
                ) : null}
                {staffProfile.mobile ? (
                  <View style={styles.staffDetailRow}>
                    <Text style={styles.staffDetailLabel}>Mobile</Text>
                    <Text style={styles.staffDetailValue}>{staffProfile.mobile}</Text>
                  </View>
                ) : null}
                {staffProfile.email ? (
                  <View style={styles.staffDetailRow}>
                    <Text style={styles.staffDetailLabel}>Email</Text>
                    <Text style={[styles.staffDetailValue, { fontSize: 12 }]}>{staffProfile.email}</Text>
                  </View>
                ) : null}
                {staffProfile.locations ? (
                  <View style={styles.staffDetailRow}>
                    <Text style={styles.staffDetailLabel}>Location</Text>
                    <Text style={styles.staffDetailValue}>
                      {staffProfile.locations.name}{staffProfile.locations.city ? `, ${staffProfile.locations.city}` : ''}
                    </Text>
                  </View>
                ) : null}
              </View>
            )}

            {staffProfile?.permissions && staffProfile.permissions.length > 0 ? (
              <View style={styles.staffPermissionsSection}>
                <Text style={styles.staffPermissionsLabel}>Permissions</Text>
                <View style={styles.staffPermissionsWrap}>
                  {staffProfile.permissions.map((p: string) => (
                    <View key={p} style={styles.staffPermissionChip}>
                      <Text style={styles.staffPermissionChipText}>
                        {p.replace(/_/g, ' ')}
                      </Text>
                    </View>
                  ))}
                </View>
              </View>
            ) : null}

            {userProfile.businessName ? (
              <View style={styles.staffBusinessInfo}>
                <Building2 size={14} color={Colors.textLight} />
                <Text style={styles.staffBusinessName}>{userProfile.businessName}</Text>
              </View>
            ) : null}
          </View>
        )}

        {/* My Attendance Section (Staff Only) */}
        {isStaff && staffId && (
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.mainSectionHeader}
              onPress={() => setAttendanceExpanded(!attendanceExpanded)}
              activeOpacity={0.7}
            >
              <View style={styles.mainSectionHeaderContent}>
                <Clock size={20} color={Colors.primary} />
                <Text style={styles.mainSectionTitle}>My Attendance</Text>
              </View>
              {attendanceExpanded ? (
                <ChevronUp size={20} color={Colors.textLight} />
              ) : (
                <ChevronDown size={20} color={Colors.textLight} />
              )}
            </TouchableOpacity>

            {attendanceExpanded && (() => {
              const now = new Date();
              const todayStr = now.toISOString().split('T')[0];
              const todaySessions = attendanceSessions.filter((s: any) => s.date === todayStr);
              const todayTotalSec = todaySessions.reduce((acc: number, s: any) => {
                const start = new Date(s.check_in).getTime();
                const end = s.check_out ? new Date(s.check_out).getTime() : Date.now();
                return acc + (end - start) / 1000;
              }, 0);

              const startOfWeek = new Date(now);
              startOfWeek.setDate(now.getDate() - now.getDay());
              const weekStr = startOfWeek.toISOString().split('T')[0];
              const weekSessions = attendanceSessions.filter((s: any) => s.date >= weekStr);
              const weekDays = new Set(weekSessions.map((s: any) => s.date)).size;
              const weekHrs = weekSessions.reduce((acc: number, s: any) => {
                const start = new Date(s.check_in).getTime();
                const end = s.check_out ? new Date(s.check_out).getTime() : Date.now();
                return acc + (end - start) / 3_600_000;
              }, 0);

              const daysPassed = now.getDate();
              const monthDays = new Set(attendanceSessions.map((s: any) => s.date)).size;
              const attendancePct = daysPassed > 0 ? Math.round((monthDays / daysPassed) * 100) : 0;

              const formatHrs = (sec: number) => {
                const h = Math.floor(sec / 3600);
                const m = Math.floor((sec % 3600) / 60);
                return h > 0 ? `${h}h ${m}m` : `${m}m`;
              };

              return (
                <View style={styles.attendanceContent}>
                  <View style={styles.attendanceStatsRow}>
                    <View style={[styles.attendanceStatCard, { backgroundColor: '#f0f9ff' }]}>
                      <Text style={styles.attendanceStatLabel}>Today</Text>
                      <Text style={styles.attendanceStatValue}>{formatHrs(todayTotalSec)}</Text>
                      <Text style={styles.attendanceStatSub}>{todaySessions.length} session{todaySessions.length !== 1 ? 's' : ''}</Text>
                    </View>
                    <View style={[styles.attendanceStatCard, { backgroundColor: '#f0fdf4' }]}>
                      <Text style={styles.attendanceStatLabel}>This Week</Text>
                      <Text style={styles.attendanceStatValue}>{weekDays} day{weekDays !== 1 ? 's' : ''}</Text>
                      <Text style={styles.attendanceStatSub}>{weekHrs.toFixed(1)} hrs total</Text>
                    </View>
                    <View style={[styles.attendanceStatCard, { backgroundColor: '#fef3c7' }]}>
                      <Text style={styles.attendanceStatLabel}>Month</Text>
                      <Text style={styles.attendanceStatValue}>{attendancePct}%</Text>
                      <Text style={styles.attendanceStatSub}>{monthDays}/{daysPassed} days</Text>
                    </View>
                  </View>

                  {attendanceSessions.length > 0 && (
                    <View>
                      <Text style={styles.sessionsTitle}>Recent Sessions</Text>
                      {attendanceSessions.slice(0, 10).map((session: any, idx: number) => {
                        const checkIn = new Date(session.check_in);
                        const checkOut = session.check_out ? new Date(session.check_out) : null;
                        const isGeoExit = session.check_out_reason === 'geofence_exit';

                        return (
                          <View key={session.id || idx} style={[
                            styles.sessionRow,
                            idx < Math.min(attendanceSessions.length, 10) - 1 && styles.sessionRowBorder,
                          ]}>
                            <View style={[styles.sessionDot, { backgroundColor: isGeoExit ? '#DC2626' : '#059669' }]} />
                            <View style={styles.sessionInfo}>
                              <Text style={styles.sessionDate}>
                                {checkIn.toLocaleDateString([], { weekday: 'short', month: 'short', day: 'numeric' })}
                              </Text>
                              <Text style={styles.sessionTime}>
                                {checkIn.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                {' → '}
                                {checkOut ? checkOut.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : 'Active'}
                              </Text>
                            </View>
                            {isGeoExit ? (
                              <View style={styles.geoExitBadge}>
                                <Text style={styles.geoExitText}>Geofence exit</Text>
                              </View>
                            ) : null}
                            {checkOut ? (
                              <Text style={styles.sessionDuration}>
                                {formatHrs((checkOut.getTime() - checkIn.getTime()) / 1000)}
                              </Text>
                            ) : null}
                          </View>
                        );
                      })}
                    </View>
                  )}

                  {attendanceSessions.length === 0 && (
                    <Text style={styles.noAttendanceText}>
                      No attendance records yet
                    </Text>
                  )}
                </View>
              );
            })()}
          </View>
        )}

        {/* Subscription Section */}
        {!isStaff && subscription.isOnTrial && (
          <View style={styles.subscriptionSection}>
            <View style={styles.subscriptionHeader}>
              <CreditCard size={20} color="#3f66ac" />
              <Text style={styles.subscriptionTitle}>Free Trial</Text>
            </View>
            <Text style={styles.subscriptionSubtitle}>
              {trialProgress.daysRemaining} days remaining
            </Text>
            <View style={styles.progressBarContainer}>
              {/* Date labels on left and right of progress bar */}
              <View style={styles.progressBarDateRow}>
                {businessData?.business?.trial_start_date && (
                  <Text style={styles.progressBarDateText}>
                    {new Date(businessData.business.trial_start_date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                )}
                {businessData?.business?.trial_end_date && (
                  <Text style={styles.progressBarDateText}>
                    {new Date(businessData.business.trial_end_date).toLocaleDateString('en-IN', {
                      month: 'short',
                      day: 'numeric'
                    })}
                  </Text>
                )}
              </View>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${trialProgress.percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.progressText}>
                {trialProgress.daysUsed} of 30 days used
              </Text>
            </View>
            <TouchableOpacity
              style={styles.upgradeButton}
              onPress={() => safeRouter.push('/subscription')}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
            
          </View>
        )}
        
        {/* Show subscription status if not on trial */}
        {!isStaff && !subscription.isOnTrial && businessData?.business?.subscription_status && (() => {
          const status = businessData.business.subscription_status;
          const isActive = status === 'active' || status === 'paid';
          const isExpired = status === 'expired' || status === 'cancelled';
          const statusColor = isActive ? Colors.success : isExpired ? Colors.error : '#D97706';
          const statusBg = isActive ? '#ECFDF5' : isExpired ? '#FEF2F2' : '#FFFBEB';
          const statusLabel = status.charAt(0).toUpperCase() + status.slice(1);

          return (
            <View style={styles.subscriptionSection}>
              <View style={styles.subscriptionHeader}>
                <CreditCard size={20} color={Colors.primary} />
                <Text style={styles.subscriptionTitle}>Subscription</Text>
              </View>
              <View style={styles.subStatusRow}>
                <View style={[styles.subStatusBadge, { backgroundColor: statusBg }]}>
                  <View style={[styles.subStatusDot, { backgroundColor: statusColor }]} />
                  <Text style={[styles.subStatusText, { color: statusColor }]}>{statusLabel}</Text>
                </View>
              </View>
              <View style={styles.subDatesContainer}>
                {businessData.business.trial_start_date ? (
                  <View style={styles.subDateRow}>
                    <Text style={styles.subDateLabel}>Trial Started</Text>
                    <Text style={styles.subDateValue}>
                      {new Date(businessData.business.trial_start_date).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </Text>
                  </View>
                ) : null}
                {businessData.business.trial_end_date ? (
                  <View style={styles.subDateRow}>
                    <Text style={styles.subDateLabel}>Trial Ended</Text>
                    <Text style={styles.subDateValue}>
                      {new Date(businessData.business.trial_end_date).toLocaleDateString('en-IN', {
                        year: 'numeric', month: 'short', day: 'numeric'
                      })}
                    </Text>
                  </View>
                ) : null}
              </View>
              {isExpired && (
                <TouchableOpacity
                  style={styles.upgradeButton}
                  onPress={() => safeRouter.push('/subscription')}
                  activeOpacity={0.8}
                >
                  <Text style={styles.upgradeButtonText}>Renew Subscription</Text>
                </TouchableOpacity>
              )}
            </View>
          );
        })()}

        {/* Business Addresses Section (Owner or Master Access Staff) */}
        {(!isStaff || hasPermission('master_access')) && (
        <View style={styles.section}>
            <TouchableOpacity 
            style={styles.mainSectionHeader}
            onPress={() => toggleCardExpansion('business-addresses')}
              activeOpacity={0.7}
            >
            <View style={styles.mainSectionHeaderContent}>
              <Text style={styles.mainSectionTitle}>
                Business Addresses ({addresses.length})
              </Text>
              </View>
            <ChevronDown size={16} color={Colors.textLight} />
            </TouchableOpacity>
            
          {expandedCards.has('business-addresses') && (
            <View style={styles.mainExpandedContent}>
              {renderAddressSection('primary')}
              {renderAddressSection('branch')}
              {renderAddressSection('warehouse')}
              </View>
            )}
          </View>
        )}
          
        {/* Bank Accounts Section (Owner or Master Access Staff) */}
        {(!isStaff || hasPermission('master_access')) && (
        <View style={styles.section}>
            <TouchableOpacity 
            style={styles.mainSectionHeader}
            onPress={() => toggleCardExpansion('bank-accounts')}
              activeOpacity={0.7}
            >
            <View style={styles.mainSectionHeaderContent}>
              <Text style={styles.mainSectionTitle}>
                Bank Accounts ({bankAccounts.length})
              </Text>
                </View>
            <ChevronDown size={16} color={Colors.textLight} />
          </TouchableOpacity>
          
          {expandedCards.has('bank-accounts') && (
            <View style={styles.mainExpandedContent}>
              {renderBankAccountsSection()}
              </View>
                )}
              </View>
        )}


        {/* Invoice Settings Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={styles.mainSectionHeader}
            onPress={() => toggleCardExpansion('invoice-settings')}
            activeOpacity={0.7}
          >
            <View style={styles.mainSectionHeaderContent}>
              <Receipt size={20} color={Colors.primary} />
              <Text style={styles.mainSectionTitle}>Invoice Settings</Text>
            </View>
            <ChevronDown size={16} color={Colors.textLight} />
          </TouchableOpacity>

          {expandedCards.has('invoice-settings') && (
            <View style={[styles.mainExpandedContent, { padding: 16 }]}>
              <Text style={{ fontSize: 14, color: Colors.text, fontWeight: '600', marginBottom: 6 }}>Professional Invoice Fields</Text>
              <Text style={{ fontSize: 13, color: Colors.textLight, marginBottom: 14, lineHeight: 18 }}>Select which additional fields to show on your sales invoices.</Text>

              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.grey[50], borderRadius: 10, padding: 14, borderWidth: 1, borderColor: Colors.grey[200] }}
                onPress={() => setShowInvoiceFieldsPicker(!showInvoiceFieldsPicker)}
                activeOpacity={0.7}
              >
                <View style={{ flex: 1 }}>
                  <Text style={{ fontSize: 14, fontWeight: '500', color: selectedInvoiceFields.length > 0 ? Colors.text : Colors.textLight }}>
                    {selectedInvoiceFields.length === 0
                      ? 'No fields selected'
                      : `${selectedInvoiceFields.length} of ${INVOICE_FIELD_OPTIONS.length} fields selected`}
                  </Text>
                </View>
                {showInvoiceFieldsPicker
                  ? <ChevronUp size={18} color={Colors.textLight} />
                  : <ChevronDown size={18} color={Colors.textLight} />}
              </TouchableOpacity>

              {showInvoiceFieldsPicker && (
                <View style={{ marginTop: 8, borderRadius: 10, borderWidth: 1, borderColor: Colors.grey[200], overflow: 'hidden' }}>
                  <TouchableOpacity
                    style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: Colors.primary + '08', borderBottomWidth: 1, borderBottomColor: Colors.grey[200] }}
                    onPress={selectAllInvoiceFields}
                    activeOpacity={0.7}
                  >
                    <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: Colors.primary, backgroundColor: INVOICE_FIELD_OPTIONS.every(f => selectedInvoiceFields.includes(f.key)) ? Colors.primary : 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                      {INVOICE_FIELD_OPTIONS.every(f => selectedInvoiceFields.includes(f.key)) && <Check size={14} color="#fff" />}
                    </View>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.primary }}>
                      {INVOICE_FIELD_OPTIONS.every(f => selectedInvoiceFields.includes(f.key)) ? 'Deselect All' : 'Select All'}
                    </Text>
                  </TouchableOpacity>

                  {INVOICE_FIELD_OPTIONS.map((field, idx) => {
                    const isSelected = selectedInvoiceFields.includes(field.key);
                    return (
                      <TouchableOpacity
                        key={field.key}
                        style={{ flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, backgroundColor: isSelected ? Colors.primary + '06' : Colors.background, borderBottomWidth: idx < INVOICE_FIELD_OPTIONS.length - 1 ? 1 : 0, borderBottomColor: Colors.grey[100] }}
                        onPress={() => toggleInvoiceField(field.key)}
                        activeOpacity={0.7}
                      >
                        <View style={{ width: 22, height: 22, borderRadius: 4, borderWidth: 2, borderColor: isSelected ? Colors.primary : Colors.grey[300], backgroundColor: isSelected ? Colors.primary : 'transparent', justifyContent: 'center', alignItems: 'center', marginRight: 12 }}>
                          {isSelected && <Check size={14} color="#fff" />}
                        </View>
                        <Text style={{ fontSize: 14, color: Colors.text, fontWeight: isSelected ? '500' : '400' }}>{field.label}</Text>
                      </TouchableOpacity>
                    );
                  })}
                </View>
              )}
            </View>
          )}
        </View>

        {/* Notification Settings Section */}
        <View style={styles.section}>
          <View style={styles.mainSectionHeader}>
            <View style={styles.mainSectionHeaderContent}>
              <Bell size={20} color={Colors.primary} />
              <Text style={styles.mainSectionTitle}>Notification Settings</Text>
            </View>
          </View>
          
          <View style={styles.mainExpandedContent}>
            {/* Push Notifications */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Bell size={20} color={Colors.primary} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>Push Notifications</Text>
                  <Text style={styles.notificationDescription}>Receive push notifications on your device</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleSwitch,
                  { backgroundColor: notificationSettings.pushNotifications ? Colors.primary : Colors.grey[300] }
                ]}
                onPress={() => handleNotificationToggle('pushNotifications')}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.toggleThumb,
                  { 
                    transform: [{ translateX: notificationSettings.pushNotifications ? 20 : 0 }],
                    backgroundColor: Colors.background
                  }
                ]} />
              </TouchableOpacity>
            </View>

            {/* Email Notifications */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Mail size={20} color={Colors.secondary} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>Email Notifications</Text>
                  <Text style={styles.notificationDescription}>Receive notifications via email</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleSwitch,
                  { backgroundColor: notificationSettings.emailNotifications ? Colors.primary : Colors.grey[300] }
                ]}
                onPress={() => handleNotificationToggle('emailNotifications')}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.toggleThumb,
                  { 
                    transform: [{ translateX: notificationSettings.emailNotifications ? 20 : 0 }],
                    backgroundColor: Colors.background
                  }
                ]} />
              </TouchableOpacity>
            </View>

            {/* WhatsApp Notifications */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <MessageSquare size={20} color="#25D366" />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>WhatsApp Notifications</Text>
                  <Text style={styles.notificationDescription}>Receive notifications via WhatsApp</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleSwitch,
                  { backgroundColor: notificationSettings.whatsappNotifications ? Colors.primary : Colors.grey[300] }
                ]}
                onPress={() => handleNotificationToggle('whatsappNotifications')}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.toggleThumb,
                  { 
                    transform: [{ translateX: notificationSettings.whatsappNotifications ? 20 : 0 }],
                    backgroundColor: Colors.background
                  }
                ]} />
              </TouchableOpacity>
            </View>

            {/* Weekly Reports */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <FileText size={20} color={Colors.textLight} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>Weekly Reports</Text>
                  <Text style={styles.notificationDescription}>Get weekly business summary reports</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleSwitch,
                  { backgroundColor: notificationSettings.weeklyReports ? Colors.primary : Colors.grey[300] }
                ]}
                onPress={() => handleNotificationToggle('weeklyReports')}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.toggleThumb,
                  { 
                    transform: [{ translateX: notificationSettings.weeklyReports ? 20 : 0 }],
                    backgroundColor: Colors.background
                  }
                ]} />
              </TouchableOpacity>
            </View>

            {/* Low Stock Alerts */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Package size={20} color={Colors.warning} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>Low Stock Alerts</Text>
                  <Text style={styles.notificationDescription}>Get notified when inventory is running low</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleSwitch,
                  { backgroundColor: notificationSettings.lowStockAlerts ? Colors.primary : Colors.grey[300] }
                ]}
                onPress={() => handleNotificationToggle('lowStockAlerts')}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.toggleThumb,
                  { 
                    transform: [{ translateX: notificationSettings.lowStockAlerts ? 20 : 0 }],
                    backgroundColor: Colors.background
                  }
                ]} />
              </TouchableOpacity>
            </View>

            {/* Overdue Receivables */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Text style={[styles.rupeeIcon, { color: Colors.success }]}>₹</Text>
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>Overdue Receivables</Text>
                  <Text style={styles.notificationDescription}>Get alerts for overdue customer payments</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleSwitch,
                  { backgroundColor: notificationSettings.overdueReceivables ? Colors.primary : Colors.grey[300] }
                ]}
                onPress={() => handleNotificationToggle('overdueReceivables')}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.toggleThumb,
                  { 
                    transform: [{ translateX: notificationSettings.overdueReceivables ? 20 : 0 }],
                    backgroundColor: Colors.background
                  }
                ]} />
              </TouchableOpacity>
            </View>

            {/* Overdue Payables */}
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <AlertTriangle size={20} color={Colors.error} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>Overdue Payables</Text>
                  <Text style={styles.notificationDescription}>Get alerts for overdue supplier payments</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[
                  styles.toggleSwitch,
                  { backgroundColor: notificationSettings.overduePayables ? Colors.primary : Colors.grey[300] }
                ]}
                onPress={() => handleNotificationToggle('overduePayables')}
                activeOpacity={0.7}
              >
                <View style={[
                  styles.toggleThumb,
                  { 
                    transform: [{ translateX: notificationSettings.overduePayables ? 20 : 0 }],
                    backgroundColor: Colors.background
                  }
                ]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>

        {/* Chat Auto-Send Section */}
        {(!isStaff || hasPermission('master_access')) && (
        <View style={styles.section}>
          <View style={styles.mainSectionHeader}>
            <View style={styles.mainSectionHeaderContent}>
              <MessageSquare size={20} color={Colors.primary} />
              <Text style={styles.mainSectionTitle}>Chat Auto-Send</Text>
            </View>
          </View>
          <View style={styles.mainExpandedContent}>
            <Text style={{ fontSize: 12, color: Colors.textLight, marginBottom: 12, paddingHorizontal: 4 }}>
              Automatically send documents to suppliers/customers in chat when they're on Manager
            </Text>
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Send size={20} color={Colors.primary} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>Purchase Orders</Text>
                  <Text style={styles.notificationDescription}>Auto-send POs to suppliers via chat</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggleSwitch, { backgroundColor: autoSendSettings.autoSendPO ? Colors.primary : Colors.grey[300] }]}
                onPress={() => handleAutoSendToggle('autoSendPO')}
                activeOpacity={0.7}
              >
                <View style={[styles.toggleThumb, { transform: [{ translateX: autoSendSettings.autoSendPO ? 20 : 0 }], backgroundColor: Colors.background }]} />
              </TouchableOpacity>
            </View>
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Send size={20} color={Colors.success} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>Return Invoices</Text>
                  <Text style={styles.notificationDescription}>Auto-send return invoices to the relevant supplier or customer</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggleSwitch, { backgroundColor: autoSendSettings.autoSendReturnInvoice ? Colors.primary : Colors.grey[300] }]}
                onPress={() => handleAutoSendToggle('autoSendReturnInvoice')}
                activeOpacity={0.7}
              >
                <View style={[styles.toggleThumb, { transform: [{ translateX: autoSendSettings.autoSendReturnInvoice ? 20 : 0 }], backgroundColor: Colors.background }]} />
              </TouchableOpacity>
            </View>
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Send size={20} color={Colors.warning} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>Stock Discrepancy Reports</Text>
                  <Text style={styles.notificationDescription}>Auto-send discrepancy reports to suppliers via chat</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggleSwitch, { backgroundColor: autoSendSettings.autoSendDiscrepancy ? Colors.primary : Colors.grey[300] }]}
                onPress={() => handleAutoSendToggle('autoSendDiscrepancy')}
                activeOpacity={0.7}
              >
                <View style={[styles.toggleThumb, { transform: [{ translateX: autoSendSettings.autoSendDiscrepancy ? 20 : 0 }], backgroundColor: Colors.background }]} />
              </TouchableOpacity>
            </View>
            <View style={styles.notificationItem}>
              <View style={styles.notificationInfo}>
                <Receipt size={20} color={Colors.error} />
                <View style={styles.notificationText}>
                  <Text style={styles.notificationTitle}>Payment Receipts</Text>
                  <Text style={styles.notificationDescription}>Auto-send payment receipts to customers/suppliers via chat</Text>
                </View>
              </View>
              <TouchableOpacity
                style={[styles.toggleSwitch, { backgroundColor: autoSendSettings.autoSendPayment ? Colors.primary : Colors.grey[300] }]}
                onPress={() => handleAutoSendToggle('autoSendPayment')}
                activeOpacity={0.7}
              >
                <View style={[styles.toggleThumb, { transform: [{ translateX: autoSendSettings.autoSendPayment ? 20 : 0 }], backgroundColor: Colors.background }]} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
        )}

        {/* Payments Section (Owner or Master Access Staff) */}
        {(!isStaff || hasPermission('master_access')) && (
        <View style={styles.section}>
          <View style={styles.mainSectionHeader}>
            <View style={styles.mainSectionHeaderContent}>
              <Wallet size={20} color={Colors.primary} />
              <Text style={styles.mainSectionTitle}>Payments</Text>
            </View>
          </View>
          
          <View style={styles.mainExpandedContent}>
            {/* Payment Methods */}
            <TouchableOpacity 
              style={styles.paymentOption}
              onPress={() => setShowPaymentMethodsModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.paymentOptionInfo}>
                <CreditCard size={20} color={Colors.primary} />
                <View style={styles.paymentOptionText}>
                  <Text style={styles.paymentOptionTitle}>Payment Methods</Text>
                  <Text style={styles.paymentOptionDescription}>Configure accepted payment methods for sales and purchases</Text>
                </View>
              </View>
              <ChevronRight size={16} color={Colors.textLight} />
            </TouchableOpacity>

            {/* Bank Accounts */}
            <TouchableOpacity 
              style={styles.paymentOption}
              onPress={() => setShowBankAccountsModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.paymentOptionInfo}>
                <Text style={[styles.rupeeIcon, { color: Colors.secondary }]}>₹</Text>
                <View style={styles.paymentOptionText}>
                  <Text style={styles.paymentOptionTitle}>Bank Accounts</Text>
                  <Text style={styles.paymentOptionDescription}>Manage active bank accounts for receiving payments</Text>
                </View>
              </View>
              <ChevronRight size={16} color={Colors.textLight} />
            </TouchableOpacity>

            {/* Digital Wallets */}
            <TouchableOpacity 
              style={styles.paymentOption}
              onPress={() => setShowDigitalWalletsModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.paymentOptionInfo}>
                <Smartphone size={20} color="#6366f1" />
                <View style={styles.paymentOptionText}>
                  <Text style={styles.paymentOptionTitle}>Digital Wallets</Text>
                  <Text style={styles.paymentOptionDescription}>Configure accepted digital wallet options ({digitalWallets.length} active)</Text>
                </View>
              </View>
              <ChevronRight size={16} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
        )}

        {/* Subscriptions Section (separate from Payments) */}
        {(!isStaff || hasPermission('master_access')) && (
        <View style={styles.section}>
          <View style={styles.mainSectionHeader}>
            <View style={styles.mainSectionHeaderContent}>
              <Repeat size={20} color={Colors.primary} />
              <Text style={styles.mainSectionTitle}>Subscriptions</Text>
            </View>
          </View>
          <View style={styles.mainExpandedContent}>
            <TouchableOpacity 
              style={styles.paymentOption}
              onPress={() => safeRouter.push({
                pathname: '/subscriptions'
              } as any)}
              activeOpacity={0.7}
            >
              <View style={styles.paymentOptionInfo}>
                <Calendar size={20} color={Colors.warning} />
                <View style={styles.paymentOptionText}>
                  <Text style={styles.paymentOptionTitle}>Plan & billing</Text>
                  <Text style={styles.paymentOptionDescription}>View subscription details, usage, and payment status</Text>
                </View>
              </View>
              <ChevronRight size={16} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
        )}

        {/* Legal Section */}
        <View style={styles.section}>
          <View style={styles.mainSectionHeader}>
            <View style={styles.mainSectionHeaderContent}>
              <Shield size={20} color={Colors.primary} />
              <Text style={styles.mainSectionTitle}>Legal</Text>
            </View>
          </View>
          
          <View style={styles.mainExpandedContent}>
            <TouchableOpacity
              style={styles.legalOption}
              onPress={() => {
                safeRouter.push('/privacy-policy');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.legalOptionInfo}>
                <Shield size={20} color={Colors.primary} />
                <View style={styles.legalOptionText}>
                  <Text style={styles.legalOptionTitle}>Privacy Policy</Text>
                  <Text style={styles.legalOptionDescription}>View our privacy policy and data handling practices</Text>
                </View>
              </View>
              <ChevronRight size={16} color={Colors.textLight} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.legalOption}
              onPress={() => {
                safeRouter.push('/terms-and-conditions');
              }}
              activeOpacity={0.7}
            >
              <View style={styles.legalOptionInfo}>
                <FileTextIcon size={20} color={Colors.primary} />
                <View style={styles.legalOptionText}>
                  <Text style={styles.legalOptionTitle}>Terms & Conditions</Text>
                  <Text style={styles.legalOptionDescription}>Read our terms of service and conditions</Text>
                </View>
              </View>
              <ChevronRight size={16} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Logout Section */}
        <View style={styles.section}>
          <TouchableOpacity
            style={[styles.logoutButton, isLoggingOut && styles.logoutButtonDisabled]}
            onPress={handleLogout}
            activeOpacity={0.8}
            disabled={isLoggingOut}
          >
            <LogOut size={20} color="#ffffff" />
            <Text style={styles.logoutButtonText}>
              {isLoggingOut ? 'Logging out...' : 'Logout'}
            </Text>
          </TouchableOpacity>
        </View>

        {/* Danger Zone (Owner Only) */}
        {!isStaff && (
        <View style={[styles.section, styles.dangerZoneSection]}>
          <View style={styles.dangerZoneHeader}>
            <AlertTriangle size={20} color={Colors.error} />
            <Text style={styles.dangerZoneTitle}>Danger Zone</Text>
          </View>
          <Text style={styles.dangerZoneDescription}>
            Deleting your account will remove all business data and reset your setup. This action cannot be undone.
          </Text>
          <TouchableOpacity
            style={[styles.dangerZoneButton, isDeletingAccount && styles.dangerZoneButtonDisabled]}
            onPress={handleDeleteAccountPress}
            activeOpacity={0.8}
            disabled={isDeletingAccount}
          >
            <Trash2 size={18} color="#ffffff" />
            <Text style={styles.dangerZoneButtonText}>
              {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
            </Text>
          </TouchableOpacity>
        </View>
        )}
      </ScrollView>
      )}

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Delete Address</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete this address? This action cannot be undone.
            </Text>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirm}
                onPress={confirmDeleteAddress}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Account Modal */}
      <Modal
        visible={showDeleteAccountModal}
        transparent={true}
        animationType="fade"
        onRequestClose={cancelDeleteAccount}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteAccountModal}>
            <View style={styles.deleteAccountIconWrapper}>
              <AlertTriangle size={32} color={Colors.error} />
            </View>
            <Text style={styles.deleteAccountTitle}>Delete Account &amp; Data</Text>
            <Text style={styles.deleteAccountText}>
              This will permanently remove all business data, addresses, bank accounts, and history linked to your account. You will need to complete the signup flow again.
            </Text>

            <View style={styles.deleteAccountActions}>
              <TouchableOpacity
                style={[styles.deleteAccountCancel, isDeletingAccount && styles.deleteAccountDisabled]}
                onPress={cancelDeleteAccount}
                activeOpacity={0.7}
                disabled={isDeletingAccount}
              >
                <Text style={styles.deleteAccountCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.deleteAccountConfirm, isDeletingAccount && styles.deleteAccountConfirmDisabled]}
                onPress={handleConfirmDeleteAccount}
                activeOpacity={0.7}
                disabled={isDeletingAccount}
              >
                <Text style={styles.deleteAccountConfirmText}>
                  {isDeletingAccount ? 'Deleting...' : 'Delete Account'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


      {/* Payment Methods Modal */}
      <Modal
        visible={showPaymentMethodsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaymentMethodsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Methods</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPaymentMethodsModal(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.paymentMethodsList}>
              {Object.entries(paymentMethods).map(([method, isEnabled]) => (
                <View key={method} style={styles.paymentMethodItem}>
                  <View style={styles.paymentMethodInfo}>
                    <Text style={styles.paymentMethodName}>
                      {method.charAt(0).toUpperCase() + method.slice(1).replace(/([A-Z])/g, ' $1')}
                    </Text>
                    <Text style={styles.paymentMethodDescription}>
                      Accept {method} payments in sales and purchases
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleSwitch,
                      { backgroundColor: isEnabled ? Colors.primary : Colors.grey[300] }
                    ]}
                    onPress={() => handlePaymentMethodToggle(method as keyof typeof paymentMethods)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.toggleThumb,
                      { 
                        transform: [{ translateX: isEnabled ? 20 : 0 }],
                        backgroundColor: Colors.background
                      }
                    ]} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Bank Accounts Modal */}
      <Modal
        visible={showBankAccountsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBankAccountsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.paymentModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Bank Accounts</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowBankAccountsModal(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.bankAccountsModalList}>
              {bankAccounts.map((account) => (
                <View key={account.id} style={styles.bankAccountModalItem}>
                  <View style={styles.bankAccountModalInfo}>
                    <Text style={styles.bankAccountModalName}>{account.bankName}</Text>
                    <Text style={styles.bankAccountModalDetails}>
                      {account.accountNumber.slice(-4)} • {account.ifscCode}
                    </Text>
                  </View>
                  <TouchableOpacity
                    style={[
                      styles.toggleSwitch,
                      { backgroundColor: activeBankAccounts.has(account.id) ? Colors.primary : Colors.grey[300] }
                    ]}
                    onPress={() => handleBankAccountToggle(account.id)}
                    activeOpacity={0.7}
                  >
                    <View style={[
                      styles.toggleThumb,
                      { 
                        transform: [{ translateX: activeBankAccounts.has(account.id) ? 20 : 0 }],
                        backgroundColor: Colors.background
                      }
                    ]} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Digital Wallets Modal */}
      <Modal
        visible={showDigitalWalletsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDigitalWalletsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.paymentModal, styles.digitalWalletModalCard]}>
            <View style={[styles.modalHeader, styles.digitalWalletModalHeader]}>
              <Text style={styles.modalTitle}>Digital Wallets</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowDigitalWalletsModal(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView
              style={styles.digitalWalletScroll}
              contentContainerStyle={styles.digitalWalletScrollContent}
              showsVerticalScrollIndicator={false}
            >
              {digitalWallets.length === 0 ? (
                <Text style={styles.digitalWalletEmpty}>No wallets added yet. Use the field below to add one.</Text>
              ) : (
                digitalWallets.map((wallet) => {
                  const badge = getDigitalWalletBadge(wallet);
                  return (
                    <View key={wallet} style={styles.digitalWalletRow}>
                      <View style={styles.digitalWalletRowLeft}>
                        {badge.kind === 'brand' ? (
                          <View style={[styles.walletBadge, { backgroundColor: badge.bg }]}>
                            <Text style={styles.walletBadgeText}>{badge.abbr}</Text>
                          </View>
                        ) : (
                          <View style={[styles.walletBadge, styles.walletBadgeGeneric]}>
                            <Wallet size={20} color="#ffffff" />
                          </View>
                        )}
                        <Text style={styles.digitalWalletName} numberOfLines={2}>
                          {wallet}
                        </Text>
                      </View>
                      <TouchableOpacity
                        onPress={() => handleRemoveWallet(wallet)}
                        activeOpacity={0.7}
                        style={styles.digitalWalletRemove}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={18} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  );
                })
              )}
            </ScrollView>

            <View style={styles.digitalWalletAddRow}>
              <TextInput
                style={styles.digitalWalletInput}
                value={customWalletName}
                onChangeText={setCustomWalletName}
                placeholder="Add wallet name..."
                placeholderTextColor={Colors.textLight}
                returnKeyType="done"
                onSubmitEditing={handleAddCustomWallet}
              />
              <TouchableOpacity
                style={styles.digitalWalletAddBtn}
                onPress={handleAddCustomWallet}
                activeOpacity={0.7}
              >
                <Plus size={20} color="#fff" />
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Alert Modal */}
      {alertState && (
        <CustomAlert
          visible={alertState.visible}
          title={alertState.title}
          message={alertState.message}
          buttons={alertState.buttons}
          type={alertState.type}
          onClose={() => {
            const { setAlertState } = require('@/utils/webAlert');
            setAlertState(null);
          }}
        />
      )}
    </SafeAreaView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
  },
  profileSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  profileHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  profileImageContainer: {
    marginRight: 16,
  },
  profileImage: {
    width: 80,
    height: 80,
    borderRadius: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  profileImageText: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.background,
  },
  profileInfo: {
    flex: 1,
  },
  profileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  profilePosition: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 4,
  },
  profileBusiness: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 4,
  },
  profileGstin: {
    fontSize: 14,
    color: Colors.textLight,
    fontFamily: 'monospace',
  },
  editProfileButton: {
    padding: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  section: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
    marginBottom: 16,
  },
  mainSectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.grey[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  mainSectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  mainSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  mainExpandedContent: {
    padding: 0,
    backgroundColor: Colors.background,
  },
  addressSubsection: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  subsectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.background,
  },
  subsectionHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  subsectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  subsectionHeaderActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  expandedContent: {
    padding: 16,
    backgroundColor: Colors.grey[50],
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 10,
    minHeight: 48,
  },
  addFirstButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '700',
    marginLeft: 12,
  },
  addButton: {
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
    minWidth: 120,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  addressList: {
    gap: 12,
  },
  addressItem: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
  },
  addressDetails: {
    padding: 16,
  },
  addressNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  addressName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  addressTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  addressTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBadge: {
    fontSize: 10,
    fontWeight: '600',
    textTransform: 'uppercase',
  },
  addressLines: {
    marginBottom: 12,
    gap: 4,
  },
  addressLine: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  contactInfo: {
    marginTop: 8,
    gap: 4,
  },
  contactLine: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  phoneLine: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 6,
    paddingHorizontal: 8,
    backgroundColor: Colors.primary + '05',
    borderRadius: 6,
  },
  gstCodeText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  actionIconButton: {
    padding: 8,
    borderRadius: 8,
    backgroundColor: Colors.grey[100],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    minWidth: 36,
    minHeight: 36,
    justifyContent: 'center',
    alignItems: 'center',
  },

  emptyState: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModal: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteModalCancel: {
    flex: 1,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  deleteModalConfirm: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  bankAccountsList: {
    gap: 12,
  },
  bankAccountItem: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
  },
  bankAccountDetails: {
    padding: 16,
  },
  bankAccountNameRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  bankAccountName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  bankAccountTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  bankAccountTypeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  bankDetails: {
    marginBottom: 12,
    gap: 4,
  },
  bankDetailLine: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  bankAccountActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    justifyContent: 'flex-end',
  },
  setPrimaryIcon: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  monospaceFont: {
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    fontSize: 14,
  },
  viewButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  viewButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textLight,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  notificationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  notificationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  notificationText: {
    flex: 1,
  },
  notificationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  notificationDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 18,
  },
  toggleSwitch: {
    width: 44,
    height: 24,
    borderRadius: 12,
    padding: 2,
    justifyContent: 'center',
  },
  toggleThumb: {
    width: 20,
    height: 20,
    borderRadius: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 2,
    elevation: 2,
  },
  rupeeIcon: {
    fontSize: 20,
    fontWeight: 'bold',
    width: 20,
    textAlign: 'center',
  },
  paymentOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  paymentOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  paymentOptionText: {
    flex: 1,
  },
  paymentOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  paymentOptionDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 18,
  },
  legalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  legalOptionInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  legalOptionText: {
    flex: 1,
  },
  legalOptionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  legalOptionDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 18,
  },
  dangerZoneSection: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  dangerZoneHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingTop: 16,
  },
  dangerZoneTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.error,
  },
  dangerZoneDescription: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dangerZoneButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    margin: 16,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.error,
  },
  dangerZoneButtonDisabled: {
    opacity: 0.6,
  },
  dangerZoneButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
  paymentModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '90%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  subscriptionModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '95%',
    maxHeight: '85%',
    overflow: 'hidden',
  },
  paymentMethodsList: {
    padding: 16,
  },
  paymentMethodItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  paymentMethodInfo: {
    flex: 1,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 18,
  },
  bankAccountsModalList: {
    padding: 16,
  },
  bankAccountModalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  bankAccountModalInfo: {
    flex: 1,
  },
  bankAccountModalName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  bankAccountModalDetails: {
    fontSize: 14,
    color: Colors.textLight,
  },
  digitalWalletModalCard: {
    paddingBottom: 8,
  },
  digitalWalletModalHeader: {
    paddingHorizontal: 22,
    paddingTop: 22,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  digitalWalletScroll: {
    maxHeight: 340,
  },
  digitalWalletScrollContent: {
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 12,
  },
  digitalWalletEmpty: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 20,
    lineHeight: 20,
  },
  digitalWalletRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  digitalWalletRowLeft: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 12,
    gap: 14,
  },
  walletBadge: {
    width: 46,
    height: 46,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  walletBadgeGeneric: {
    backgroundColor: Colors.primary,
  },
  walletBadgeText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
    letterSpacing: -0.5,
  },
  digitalWalletName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  digitalWalletRemove: {
    padding: 8,
  },
  digitalWalletAddRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 22,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    marginTop: 4,
  },
  digitalWalletInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    color: Colors.text,
    backgroundColor: Colors.grey[50],
  },
  digitalWalletAddBtn: {
    backgroundColor: Colors.primary,
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteAccountModal: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 360,
  },
  deleteAccountIconWrapper: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: '#FEE2E2',
    alignItems: 'center',
    justifyContent: 'center',
    alignSelf: 'center',
    marginBottom: 16,
  },
  deleteAccountTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteAccountText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteAccountActions: {
    flexDirection: 'row',
    gap: 12,
  },
  deleteAccountCancel: {
    flex: 1,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  deleteAccountCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  deleteAccountConfirm: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteAccountConfirmText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  deleteAccountDisabled: {
    opacity: 0.6,
  },
  deleteAccountConfirmDisabled: {
    opacity: 0.7,
  },
  subscriptionsList: {
    padding: 16,
    maxHeight: 300,
  },
  subscriptionCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  subscriptionName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  subscriptionDetails: {
    marginBottom: 12,
  },
  subscriptionAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subscriptionPeriod: {
    fontSize: 14,
    color: Colors.textLight,
  },
  subscriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceId: {
    fontSize: 14,
    color: Colors.textLight,
  },
  nextBilling: {
    fontSize: 14,
    color: Colors.textLight,
  },
  selectedSubscriptionDetails: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 16,
    margin: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '20',
  },
  selectedSubscriptionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
  },
  selectedSubscriptionName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  selectedSubscriptionStatus: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  selectedSubscriptionInvoice: {
    fontSize: 14,
    color: Colors.textLight,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    margin: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
    marginLeft: 12,
  },
  subscriptionSection: {
    backgroundColor: '#f0f4ff',
    margin: 16,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3f66ac',
  },
  subscriptionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3f66ac',
    marginLeft: 8,
  },
  subscriptionSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  progressBarContainer: {
    marginBottom: 16,
  },
  progressBarDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  progressBarDateText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '500',
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3f66ac',
    borderRadius: 4,
  },
  progressText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  upgradeButton: {
    backgroundColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  upgradeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  trialDateText: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    textAlign: 'center',
  },
  subStatusRow: {
    marginBottom: 14,
  },
  subStatusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  subStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  subStatusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  subDatesContainer: {
    gap: 8,
  },
  subDateRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  subDateLabel: {
    fontSize: 13,
    color: '#64748b',
  },
  subDateValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1e293b',
  },
  logoutButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(63, 102, 172, 0.3)',
      },
    }),
  },
  logoutButtonDisabled: {
    opacity: 0.6,
  },
  logoutButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  staffProfileCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    marginBottom: 16,
    overflow: 'hidden',
  },
  staffProfileTop: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    backgroundColor: Colors.primary + '08',
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  staffAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 16,
  },
  staffAvatarText: {
    fontSize: 24,
    fontWeight: '700',
    color: '#fff',
  },
  staffProfileHeaderInfo: {
    flex: 1,
  },
  staffProfileName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  staffProfileRole: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 6,
  },
  staffDeptBadge: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.primary + '12',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  staffDeptBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  staffDetailsGrid: {
    padding: 16,
    gap: 12,
  },
  staffDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  staffDetailLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  staffDetailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  staffPermissionsSection: {
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  staffPermissionsLabel: {
    fontSize: 13,
    color: Colors.textLight,
    marginBottom: 8,
  },
  staffPermissionsWrap: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  staffPermissionChip: {
    backgroundColor: '#EEF2FF',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
  },
  staffPermissionChipText: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    textTransform: 'capitalize',
  },
  staffBusinessInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grey[50],
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  staffBusinessName: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500',
  },
  attendanceContent: {
    paddingHorizontal: 16,
    paddingTop: 20,
    paddingBottom: 16,
  },
  attendanceStatsRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 16,
  },
  attendanceStatCard: {
    flex: 1,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: 'rgba(0,0,0,0.04)',
  },
  attendanceStatLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
  },
  attendanceStatValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  attendanceStatSub: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
  },
  sessionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  sessionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
  },
  sessionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  sessionDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: 10,
  },
  sessionInfo: {
    flex: 1,
  },
  sessionDate: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  sessionTime: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  geoExitBadge: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 6,
  },
  geoExitText: {
    fontSize: 10,
    color: '#DC2626',
    fontWeight: '600',
  },
  sessionDuration: {
    fontSize: 12,
    color: Colors.textLight,
    marginLeft: 8,
  },
  noAttendanceText: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center',
    paddingVertical: 20,
  },
});

