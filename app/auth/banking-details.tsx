import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
  Keyboard,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Building2, 
  Search, 
  X, 
  ChevronDown, 
  CreditCard,
  IndianRupee,
  User,
  Hash
} from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
import { indianBanks, IndianBank, validateAccountNumber, validateIFSC, allBanksWithOthers } from '@/data/indianBanks';
import CapitalizedTextInput from '@/components/CapitalizedTextInput';
import type { BankAccount } from '@/utils/dataStore';
import { getInputFocusStyles, getWebContainerStyles } from '@/utils/platformUtils';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { supabase } from '@/lib/supabase';
import { REVIEW_MODE, REVIEW_MOCK_BUSINESS_ID } from '@/lib/config';
import { numberToWords } from '@/utils/numberToWords';
import { optimisticAddBankAccount, optimisticUpdateBankAccount, optimisticSaveSignupProgress } from '@/utils/optimisticSync';
import { getPlatformShadow } from '@/utils/shadowUtils';
import { getSignupData, setSignupData } from '@/utils/signupStore';

export default function BankingDetailsScreen() {
  const _params = useLocalSearchParams();
  const _store = getSignupData();

  const type = (_params.type ?? _store.type ?? '') as string;
  const value = (_params.value ?? _store.value ?? '') as string;
  const gstinData = (_params.gstinData ?? _store.gstinData ?? '') as string;
  const name = (_params.name ?? _store.name ?? '') as string;
  const businessName = (_params.businessName ?? _store.businessName ?? '') as string;
  const businessType = (_params.businessType ?? _store.businessType ?? '') as string;
  const customBusinessType = (_params.customBusinessType ?? _store.customBusinessType ?? '') as string;
  const mobile = (_params.mobile ?? _store.mobile ?? '') as string;
  const allAddresses = (_params.allAddresses ?? _store.allAddresses ?? '') as string;
  const allBankAccounts = (_params.allBankAccounts ?? _store.allBankAccounts ?? '[]') as string;
  const isAddingSecondary = (_params.isAddingSecondary ?? _store.isAddingSecondary ?? 'false') as string;
  const editMode = (_params.editMode ?? _store.editMode ?? 'false') as string;
  const editAccountId = (_params.editAccountId ?? _store.editAccountId ?? '') as string;
  const prefilledBankId = (_params.prefilledBankId ?? _store.prefilledBankId ?? '') as string;
  const prefilledAccountHolderName = (_params.prefilledAccountHolderName ?? _store.prefilledAccountHolderName ?? '') as string;
  const prefilledAccountNumber = (_params.prefilledAccountNumber ?? _store.prefilledAccountNumber ?? '') as string;
  const prefilledIFSC = (_params.prefilledIFSC ?? _store.prefilledIFSC ?? '') as string;
  const prefilledAccountType = (_params.prefilledAccountType ?? _store.prefilledAccountType ?? '') as string;
  const prefilledInitialBalance = (_params.prefilledInitialBalance ?? _store.prefilledInitialBalance ?? '') as string;
  const prefilledUpiId = (_params.prefilledUpiId ?? _store.prefilledUpiId ?? '') as string;
  const prefilledIsPrimary = (_params.prefilledIsPrimary ?? _store.prefilledIsPrimary ?? 'false') as string;
  const fromSummary = (_params.fromSummary ?? _store.fromSummary ?? 'false') as string;
  const currentCashBalance = (_params.currentCashBalance ?? _store.currentCashBalance ?? '0') as string;
  const currentInvoicePrefix = (_params.currentInvoicePrefix ?? _store.currentInvoicePrefix ?? 'INV') as string;
  const currentInvoicePattern = (_params.currentInvoicePattern ?? _store.currentInvoicePattern ?? '') as string;
  const currentStartingNumber = (_params.currentStartingNumber ?? _store.currentStartingNumber ?? '1') as string;
  const currentFiscalYear = (_params.currentFiscalYear ?? _store.currentFiscalYear ?? 'APR-MAR') as string;

  const [selectedBank, setSelectedBank] = useState<IndianBank | null>(null);
  const [customBankName, setCustomBankName] = useState('');
  const [accountHolderName, setAccountHolderName] = useState(prefilledAccountHolderName as string || (isAddingSecondary === 'false' ? businessName as string || '' : ''));
  
  // Ref to track current account holder name for focus logic
  const accountHolderNameValueRef = useRef<string>(accountHolderName);
  
  // Update ref whenever accountHolderName changes
  useEffect(() => {
    accountHolderNameValueRef.current = accountHolderName;
  }, [accountHolderName]);
  const [accountNumber, setAccountNumber] = useState(prefilledAccountNumber as string || '');
  const [confirmAccountNumber, setConfirmAccountNumber] = useState(prefilledAccountNumber as string || '');
  const [ifscCode, setIfscCode] = useState(prefilledIFSC as string || '');
  // Determine if this is a primary account
  const isPrimaryAccount = editMode === 'true' 
    ? (prefilledIsPrimary === 'true')
    : (isAddingSecondary === 'false');
  
  const [accountType, setAccountType] = useState<'Savings' | 'Current'>(
    (prefilledAccountType as 'Savings' | 'Current') || (isPrimaryAccount ? 'Current' : 'Savings')
  );
  const [initialBalance, setInitialBalance] = useState(
    prefilledInitialBalance && prefilledInitialBalance !== '0' && prefilledInitialBalance !== '0.00' && prefilledInitialBalance !== '0.' 
      ? (prefilledInitialBalance as string) 
      : ''
  );
  const [upiId, setUpiId] = useState(prefilledUpiId as string || '');
  const [acceptsUpiPayments, setAcceptsUpiPayments] = useState(
    (prefilledUpiId as string || '').length > 0
  );
  const [ifscSelection, setIfscSelection] = useState<{start: number, end: number} | undefined>();
  const [showBankModal, setShowBankModal] = useState(false);
  const [bankSearch, setBankSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [originalAccount, setOriginalAccount] = useState<any>(null);
  
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const ifscInputRef = useRef<TextInput>(null);
  const accountHolderNameRef = useRef<TextInput>(null);
  const accountNumberRef = useRef<TextInput>(null);
  const initialBalanceInputRef = useRef<TextInput>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0); // Track keyboard height
  const insets = useSafeAreaInsets();
  const colors = useThemeColors();
  const inputFocusStyles = getInputFocusStyles();
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // ✅ Helper for focused input shadow (platform-specific)
  const getFocusedShadow = () => getPlatformShadow(4, '#3f66ac', 0.12);
  
  // Calculate amount in words for display
  const getAmountInWords = () => {
    if (!initialBalance || initialBalance === '0' || initialBalance === '0.' || initialBalance === '0.00') {
      return null;
    }
    return numberToWords(initialBalance);
  };
  
  const amountInWords = getAmountInWords();
  const isLongAmountText = amountInWords && amountInWords.length > 60;

  useEffect(() => {
    // Pre-fill from route params (data is passed directly, no DataStore lookup needed)
    if (editMode === 'true') {
      if (prefilledAccountHolderName) {
        setOriginalAccount({
          bankId: prefilledBankId as string,
          bankName: '',
          accountHolderName: prefilledAccountHolderName as string,
          accountNumber: prefilledAccountNumber as string,
          ifscCode: prefilledIFSC as string,
          accountType: (prefilledAccountType as string) || 'Savings',
          initialBalance: prefilledInitialBalance as string || '0',
          upiId: prefilledUpiId as string || '',
        });
        
        setAccountHolderName(prefilledAccountHolderName as string || '');
        setAccountNumber(prefilledAccountNumber as string || '');
        setConfirmAccountNumber(prefilledAccountNumber as string || '');
        setIfscCode(prefilledIFSC as string || '');
        setAccountType((prefilledAccountType as string || 'Savings') as 'Savings' | 'Current');
        setInitialBalance(prefilledInitialBalance as string || '');
        setUpiId(prefilledUpiId as string || '');
      }
      
      // Pre-fill bank selector
      const bankId = prefilledBankId as string;
      if (bankId) {
        const bank = allBanksWithOthers.find(b => b.id === bankId || b.shortName === bankId);
        if (bank) {
          setSelectedBank(bank);
          if (bank.id === 'others') {
            // For "others" bank, the bankName would need to be passed via params
            // Try to find it from allBankAccounts
            try {
              const accounts = JSON.parse(allBankAccounts as string || '[]');
              const editAcc = accounts.find((a: any) => a.id === editAccountId || a.bankId === bankId);
              if (editAcc?.bankName) setCustomBankName(editAcc.bankName);
            } catch {}
          }
        } else {
          const othersBank = allBanksWithOthers.find(b => b.id === 'others');
          if (othersBank) {
            setSelectedBank(othersBank);
            try {
              const accounts = JSON.parse(allBankAccounts as string || '[]');
              const editAcc = accounts.find((a: any) => a.id === editAccountId);
              if (editAcc?.bankName) setCustomBankName(editAcc.bankName);
            } catch {}
          }
        }
      }
    }
  }, [editMode, editAccountId, prefilledBankId]);

  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false, // Disable for web to avoid warning
    }).start();
  }, []);

  // Handle keyboard show/hide for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const keyboardWillShow = Keyboard.addListener('keyboardDidShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      });
      const keyboardWillHide = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
      });

      return () => {
        keyboardWillShow.remove();
        keyboardWillHide.remove();
      };
    }
  }, []);

  const filteredBanks = allBanksWithOthers.filter(bank =>
    bank.name.toLowerCase().includes(bankSearch.toLowerCase()) ||
    bank.shortName.toLowerCase().includes(bankSearch.toLowerCase()) ||
    bank.ifscPrefix.toLowerCase().includes(bankSearch.toLowerCase())
  );

  const handleBankSelect = (bank: IndianBank) => {
    // Immediately close modal first to prevent double-tap
    setShowBankModal(false);
    // Then update state
    setSelectedBank(bank);
    setBankSearch('');
    
    // Auto-fill IFSC prefix only for preset banks (not Others)
    if (bank.id !== 'others') {
      if (ifscCode.length === 0 || !ifscCode.startsWith(bank.ifscPrefix)) {
        setIfscCode(bank.ifscPrefix + '0');
      }
    } else {
      // Clear IFSC for Others option
      setIfscCode('');
      setCustomBankName('');
    }
    
    // Smart cursor focus after bank selection
    // Use a longer timeout to ensure modal is fully closed and state is updated
    setTimeout(() => {
      // Check the current account holder name value using ref (always has latest value)
      const currentAccountHolderName = accountHolderNameValueRef.current;
      
      const focusField = () => {
        if (currentAccountHolderName.trim().length === 0) {
          // If account holder name is empty, focus on account holder name field
          if (accountHolderNameRef.current) {
            accountHolderNameRef.current.focus();
            return true;
          }
      } else {
          // If account holder name exists, focus on account number field
          if (accountNumberRef.current) {
            accountNumberRef.current.focus();
            return true;
          }
        }
        return false;
      };
      
      // Try to focus immediately
      if (!focusField()) {
        // If focus failed, try again after a short delay
        setTimeout(() => {
          focusField();
    }, 100);
      }
    }, 500);
  };

  const handleBankModalOpen = () => {
    // Dismiss keyboard first to prevent double-tap issue on Android
    Keyboard.dismiss();
    // Small delay to ensure keyboard is dismissed before opening modal
    setTimeout(() => {
      setShowBankModal(true);
      // Don't auto-focus - let user click search bar if they want to search
    }, Platform.OS === 'android' ? 100 : 0);
  };

  const handleIFSCChange = (text: string) => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 11);
    setIfscCode(cleaned);
    
    // Set cursor position after bank prefix when bank is selected (not Others)
    if (selectedBank && selectedBank.id !== 'others' && cleaned.startsWith(selectedBank.ifscPrefix) && cleaned.length === selectedBank.ifscPrefix.length + 1) {
      setTimeout(() => {
        setIfscSelection({ start: cleaned.length, end: cleaned.length });
      }, 0);
    }
    
    // Auto-detect bank from IFSC (only for preset banks)
    if (cleaned.length >= 4 && (!selectedBank || selectedBank.id === 'others')) {
      const prefix = cleaned.substring(0, 4);
      const matchingBank = indianBanks.find(bank => bank.ifscPrefix === prefix);
      if (matchingBank) {
        setSelectedBank(matchingBank);
      }
    }
  };

  const handleIFSCSelectionChange = (event: any) => {
    setIfscSelection(event.nativeEvent.selection);
  };

  const handleAccountNumberChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setAccountNumber(cleaned);
  };

  const handleConfirmAccountNumberChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '');
    setConfirmAccountNumber(cleaned);
  };

  // Format number in Indian style (1,00,000 instead of 100,000)
  const formatIndianNumber = (num: string): string => {
    if (!num) return '';
    
    // Remove all non-numeric characters except decimal point
    const cleaned = num.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    
    if (!integerPart) return '';
    
    // Indian number formatting
    let lastThree = integerPart.substring(integerPart.length - 3);
    let otherNumbers = integerPart.substring(0, integerPart.length - 3);
    
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    
    let formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    
    if (decimalPart !== undefined) {
      formatted += '.' + decimalPart;
    }
    
    return formatted;
  };

  const handleInitialBalanceChange = (text: string) => {
    // Remove all non-numeric characters except decimal point
    let cleaned = text.replace(/[^0-9.]/g, '');
    
    // If user deletes everything, ensure it's truly empty
    if (cleaned === '' || cleaned === '0' || cleaned === '0.' || cleaned === '0.00') {
      setInitialBalance('');
      setTimeout(() => {
        if (initialBalanceInputRef.current && Platform.OS !== 'web') {
          initialBalanceInputRef.current.setNativeProps({
            selection: { start: 0, end: 0 }
          });
        }
      }, 10);
      return;
    }
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      // If more than one decimal point, keep only the first part and first decimal
      cleaned = parts[0] + '.' + parts.slice(1).join('');
    }
    
    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      return;
    }
    
    // Store the raw value for calculations, display formatted
    setInitialBalance(cleaned);
    
    // Move cursor to end after formatting
    setTimeout(() => {
      if (initialBalanceInputRef.current && Platform.OS !== 'web') {
        const formatted = formatIndianNumber(cleaned);
        const length = formatted.length;
        initialBalanceInputRef.current.setNativeProps({
          selection: { start: length, end: length }
        });
      }
    }, 50);
  };

  const validateUPI = (upi: string): boolean => {
    // UPI ID format: username@bankname or username@upi
    const upiRegex = /^[a-zA-Z0-9._-]+@[a-zA-Z0-9._-]+$/;
    return upiRegex.test(upi) && upi.length >= 5 && upi.length <= 50;
  };

  const handleUPIChange = (text: string) => {
    // Convert to lowercase and remove spaces
    const cleaned = text.toLowerCase().replace(/\s/g, '');
    setUpiId(cleaned);
  };

  const isFormValid = () => {
    return (
      selectedBank !== null &&
      (selectedBank.id !== 'others' || customBankName.trim().length > 0) &&
      accountHolderName.trim().length > 0 &&
      accountNumber.length > 0 &&
      accountNumber === confirmAccountNumber &&
      (selectedBank.id === 'others' || validateAccountNumber(selectedBank?.id || '', accountNumber)) &&
      ifscCode.length === 11 &&
      validateIFSC(ifscCode) &&
      (accountType === 'Savings' || accountType === 'Current') &&
      initialBalance.length > 0 &&
      !isNaN(parseFloat(initialBalance)) &&
      (acceptsUpiPayments
        ? (upiId.trim().length > 0 && validateUPI(upiId))
        : (upiId.length === 0 || validateUPI(upiId)))
    );
  };

  // Check if any changes have been made
  const hasChanges = () => {
    if (!originalAccount || editMode !== 'true') return true; // For new accounts, always allow save
    
    const currentBankId = selectedBank?.id || '';
    const currentBankName = selectedBank?.id === 'others' ? customBankName.trim() : (selectedBank?.name || '');
    
    return (
      currentBankId !== originalAccount.bankId ||
      currentBankName !== originalAccount.bankName ||
      accountHolderName.trim() !== originalAccount.accountHolderName ||
      accountNumber.trim() !== originalAccount.accountNumber ||
      ifscCode.trim() !== originalAccount.ifscCode ||
      accountType !== originalAccount.accountType ||
      initialBalance.trim() !== originalAccount.initialBalance ||
      upiId.trim() !== originalAccount.upiId
    );
  };

  const handleCancel = () => {
    // Navigate back using route params as-is (no DataStore dependency)
    if (fromSummary === 'true') {
      setSignupData({
        type,
        value,
        gstinData,
        name,
        businessName,
        businessType,
        customBusinessType,
        allAddresses,
        allBankAccounts,
        initialCashBalance: currentCashBalance,
        invoicePrefix: currentInvoicePrefix,
        invoicePattern: currentInvoicePattern,
        startingInvoiceNumber: currentStartingNumber,
        fiscalYear: currentFiscalYear,
        mobile,
      });
      router.replace('/auth/business-summary');
    } else {
      setSignupData({
        type,
        value,
        gstinData,
        name,
        businessName,
        businessType,
        customBusinessType,
        allAddresses,
        allBankAccounts,
      });
      router.replace('/auth/bank-accounts');
    }
  };

  const getValidationMessage = () => {
    if (!selectedBank) return 'Please select a bank';
    if (selectedBank.id === 'others' && !customBankName.trim()) return 'Please enter bank name';
    if (!accountHolderName.trim()) return 'Please enter account holder name';
    if (!accountNumber) return 'Please enter account number';
    if (accountNumber !== confirmAccountNumber) return 'Account numbers do not match';
    if (selectedBank && selectedBank.id !== 'others' && !validateAccountNumber(selectedBank.id, accountNumber)) {
      return `Account number should be ${selectedBank.accountNumberFormat}`;
    }
    if (ifscCode.length !== 11) return 'IFSC code should be 11 characters';
    if (!validateIFSC(ifscCode)) return 'Invalid IFSC code format';
    if (accountType !== 'Savings' && accountType !== 'Current') return 'Please select account type';
    if (!initialBalance || isNaN(parseFloat(initialBalance))) return 'Please enter valid initial balance';
    if (acceptsUpiPayments && !upiId.trim()) return 'Please enter your UPI ID';
    if (upiId.trim() && !validateUPI(upiId)) return 'Please enter a valid UPI ID (e.g., username@bankname)';
    return '';
  };

  const handleContinue = async () => {
    // Prevent double navigation
    if (isNavigating || isLoading) {
      console.log('⚠️ Navigation already in progress, ignoring duplicate click');
      return;
    }

    if (!isFormValid()) {
      Alert.alert('Incomplete Details', getValidationMessage());
      return;
    }

    setIsLoading(true);
    setIsNavigating(true);

    // Parse existing bank accounts
    let existingBankAccounts = [];
    try {
      existingBankAccounts = JSON.parse(allBankAccounts as string);
    } catch (error) {
      console.log('No existing bank accounts');
    }

    const bankAccount = {
      id: editMode === 'true' && editAccountId ? editAccountId : `bank_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      bankId: selectedBank!.id,
      bankName: selectedBank!.id === 'others' ? customBankName.trim() : selectedBank!.name,
      bankShortName: selectedBank!.id === 'others' ? customBankName.trim() : selectedBank!.shortName,
      accountHolderName: accountHolderName.trim(),
      accountNumber: accountNumber,
      ifscCode: ifscCode,
      upiId: upiId.trim(),
      accountType: accountType,
      initialBalance: parseFloat(initialBalance),
      isPrimary: editMode === 'true' ? (prefilledIsPrimary === 'true') : (isAddingSecondary === 'false'), // Boolean: true if primary, false if secondary
      createdAt: editMode === 'true' ? existingBankAccounts.find((acc: any) => acc.id === editAccountId)?.createdAt || new Date().toISOString() : new Date().toISOString(),
    };

    try {
      // Save bank account to backend
      let saveResult: any;
      if (editMode === 'true') {
        // Resolve backend UUID if the local ID is not a real UUID
        let resolvedEditId = editAccountId as string;
        const uuidRe = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
        if (!uuidRe.test(resolvedEditId || '')) {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              let userData: { business_id?: string } | null = null;
              let accounts: { id: string; account_number: string }[] | null = null;
              if (REVIEW_MODE) {
                userData = { business_id: REVIEW_MOCK_BUSINESS_ID };
                accounts = [];
              } else {
                const { data: ud } = await supabase.from('users').select('business_id').eq('id', session.user.id).single();
                userData = ud;
                if (userData?.business_id) {
                  const { data: acc } = await supabase.from('bank_accounts').select('id, account_number').eq('business_id', userData.business_id);
                  accounts = acc || [];
                }
              }
              if (userData?.business_id && accounts) {
                const match = accounts.find((a: any) => a.account_number === accountNumber);
                if (match) resolvedEditId = match.id;
              }
            }
          } catch (e) { console.warn('Failed to resolve bank UUID:', e); }
        }
        saveResult = await optimisticUpdateBankAccount(resolvedEditId, { ...bankAccount, backendId: resolvedEditId }, { showError: false, awaitSync: true });
      } else {
        saveResult = await optimisticAddBankAccount(bankAccount as BankAccount, { showError: false, awaitSync: true });
      }
      
      if (!saveResult.success) {
        console.error('❌ Bank account save failed:', saveResult.error);
        Alert.alert('Error', saveResult.error || 'Failed to save bank account. Please try again.');
        setIsLoading(false);
        setIsNavigating(false);
        return;
      }
      
      // ✅ Clear cache to ensure fresh data is loaded when navigating back
      const { clearBusinessDataCache } = await import('@/hooks/useBusinessData');
      clearBusinessDataCache();
      
      console.log('✅ Bank account saved and synced to backend');
      
      // ✅ Small additional delay to ensure backend has fully processed the update
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // ✅ Optimistically save signup progress (non-blocking)
      (async () => {
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const mobileNumber = mobile as string || session.user.phone || session.user.user_metadata?.phone;
            if (mobileNumber) {
              optimisticSaveSignupProgress({
                mobile: mobileNumber,
                mobileVerified: true,
                taxIdType: type as 'GSTIN' | 'PAN',
                taxIdValue: value as string,
                taxIdVerified: true,
                ownerName: name as string,
                businessName: businessName as string,
                businessType: businessType as string,
                gstinData: gstinData ? (typeof gstinData === 'string' ? JSON.parse(gstinData) : gstinData) : undefined,
                currentStep: 'primaryBank',
              });
            }
          }
        } catch (error) {
          console.error('Error getting session:', error);
        }
      })();
      
      setIsLoading(false);
      // Build updated bank accounts list from current state + new/updated account
      let updatedBankAccounts: any[];
      try {
        updatedBankAccounts = JSON.parse(allBankAccounts as string || '[]');
      } catch { updatedBankAccounts = []; }
      
      if (editMode === 'true') {
        updatedBankAccounts = updatedBankAccounts.map((acc: any) => 
          acc.id === editAccountId ? bankAccount : acc
        );
      } else {
        updatedBankAccounts.push(bankAccount);
      }
      
      // Check if we came from business summary page
      if (fromSummary === 'true') {
        setSignupData({
          type,
          value,
          gstinData,
          name,
          businessName,
          businessType,
          customBusinessType,
          allAddresses,
          allBankAccounts: JSON.stringify(updatedBankAccounts),
          initialCashBalance: currentCashBalance,
          invoicePrefix: currentInvoicePrefix,
          invoicePattern: currentInvoicePattern,
          startingInvoiceNumber: currentStartingNumber,
          fiscalYear: currentFiscalYear,
          mobile,
        });
        router.replace('/auth/business-summary');
      } else {
        setSignupData({
          type,
          value,
          gstinData,
          name,
          businessName,
          businessType,
          customBusinessType,
          allAddresses,
          allBankAccounts: JSON.stringify(updatedBankAccounts),
        });
        router.replace('/auth/bank-accounts');
      }
      
      // Reset navigation flag immediately
      setIsNavigating(false);
    } catch (error) {
      console.error('❌ Error saving bank account:', error);
      setIsLoading(false);
      Alert.alert('Error', 'Failed to save bank account. Please try again.');
    }
  };

  const getBankCategoryColor = (category: string) => {
    switch (category) {
      case 'public': return '#10b981';
      case 'private': return '#3b82f6';
      case 'foreign': return '#8b5cf6';
      case 'cooperative': return '#f59e0b';
      case 'regional': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getBankCategoryLabel = (category: string) => {
    switch (category) {
      case 'public': return 'Public';
      case 'private': return 'Private';
      case 'foreign': return 'Foreign';
      case 'cooperative': return 'Cooperative';
      case 'regional': return 'Regional';
      default: return 'Other';
    }
  };

  const slideTransform = {
    transform: [
      {
        translateY: slideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 0],
        }),
      },
    ],
    // Removed opacity animation to prevent grey background flash
  };

  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer narrow>
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          enabled={true}
        >
            <TouchableOpacity
              style={styles.backButton}
            onPress={editMode === 'true' ? handleCancel : () => router.canGoBack() ? router.back() : router.replace('/auth/mobile')}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color="#3f66ac" />
            </TouchableOpacity>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={[
              Platform.OS === 'web' ? webContainerStyles.webScrollContent : {},
              Platform.OS === 'android' ? { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 } : {},
              Platform.OS === 'ios' ? { paddingBottom: 20 } : {}
            ]} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            <Animated.View style={[styles.content, slideTransform]}>
              <View style={styles.iconContainer}>
                <View style={styles.iconWrapper}>
                  <CreditCard size={48} color="#3f66ac" strokeWidth={2.5} />
                </View>
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title}>
                  {isAddingSecondary === 'true' ? 'Add Bank Account' : 
                   editMode === 'true' ? 'Edit Bank Account' : 'Primary Bank Account'}
                </Text>
                <Text style={styles.subtitle}>
                  {isAddingSecondary === 'true' ? 'Add an additional bank account for your business' :
                   editMode === 'true' ? 'Edit your bank account details' :
                   'Add your primary business bank account for transactions and payments'}
                </Text>
                {(isAddingSecondary === 'false' && editMode === 'false') ? (
                  <View style={styles.primaryNotice}>
                    <Text style={styles.primaryNoticeText}>
                      🏦 This is your <Text style={styles.primaryBold}>Primary Bank Account</Text>
                    </Text>
                    <Text style={styles.primaryNoticeSubtext}>
                      You can add more bank accounts later
                    </Text>
                  </View>
                ) : null}
              </View>

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Select Bank *</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPressIn={() => {
                      // Dismiss keyboard immediately on press start
                      Keyboard.dismiss();
                    }}
                    onPress={handleBankModalOpen}
                    activeOpacity={0.7}
                  >
                    <View style={styles.bankSelectContent}>
                      {selectedBank ? (
                        <View style={styles.selectedBankInfo}>
                          <Text style={styles.selectedBankName}>
                            {selectedBank.id === 'others' ? (customBankName || 'Others - Enter bank name') : selectedBank.name}
                          </Text>
                          <View style={styles.bankMetaInfo}>
                            {(selectedBank.id !== 'others') ? (
                              <>
                                <Text style={styles.bankShortName}>({selectedBank.shortName})</Text>
                                <View style={[
                                  styles.bankCategoryBadge,
                                  { backgroundColor: getBankCategoryColor(selectedBank.category) }
                                ]}>
                                  <Text style={styles.bankCategoryText}>
                                    {getBankCategoryLabel(selectedBank.category)}
                                  </Text>
                                </View>
                              </>
                            ) : null}
                          </View>
                        </View>
                      ) : (
                        <Text style={styles.dropdownPlaceholder}>Search and select your bank</Text>
                      )}
                    </View>
                    <ChevronDown size={20} color="#666666" />
                  </TouchableOpacity>
                  {(selectedBank && selectedBank.id !== 'others') ? (
                    <Text style={styles.fieldHint}>
                      Account number format: {selectedBank.accountNumberFormat}
                    </Text>
                  ) : null}
                </View>
                {(selectedBank && selectedBank.id === 'others') ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Bank Name *</Text>
                    <View style={Platform.select({
                      web: [
                        inputFocusStyles.inputContainer,
                        focusedField === 'customBankName' && inputFocusStyles.inputContainerFocused,
                      ].filter(Boolean) as any, // ✅ Filter false values and type assert
                      default: styles.inputWrapper,
                    }) as any}>
                      <Building2 size={20} color="#64748b" style={Platform.OS === 'web' ? styles.inputIcon : styles.inputIconAbsolute} />
                      <TextInput
                        style={Platform.OS === 'web' 
                          ? inputFocusStyles.input 
                          : [
                              {
                                borderWidth: 2,
                                borderColor: focusedField === 'customBankName' ? '#3f66ac' : '#E5E7EB',
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                paddingLeft: 44,
                                paddingVertical: 18,
                                fontSize: 16,
                                color: '#1a1a1a',
                                backgroundColor: '#ffffff',
                                minHeight: 50,
                                ...(focusedField === 'customBankName' ? getFocusedShadow() : {}),
                              },
                            ] as any} // ✅ Use Platform.OS directly for arrays
                        value={customBankName}
                        onChangeText={setCustomBankName}
                        placeholder="Enter your bank name"
                        placeholderTextColor="#999999"
                        autoCapitalize={Platform.OS === 'web' ? 'characters' : 'words'}
                        editable={true}
                        onFocus={() => setFocusedField('customBankName')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </View>
                  </View>
                ) : null}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Holder Name *</Text>
                  <View style={Platform.select({
                    web: [
                      inputFocusStyles.inputContainer,
                      focusedField === 'accountHolderName' && inputFocusStyles.inputContainerFocused,
                    ].filter(Boolean) as any, // ✅ Filter false values
                    default: styles.inputWrapper,
                  }) as any}>
                    <User size={20} color="#64748b" style={Platform.OS === 'web' ? styles.inputIcon : styles.inputIconAbsolute} />
                    <CapitalizedTextInput
                      ref={accountHolderNameRef}
                      style={Platform.OS === 'web' 
                        ? inputFocusStyles.input 
                        : [
                            {
                              borderWidth: 2,
                              borderColor: focusedField === 'accountHolderName' ? '#3f66ac' : '#E5E7EB',
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingLeft: 44,
                              paddingVertical: 18,
                              fontSize: 16,
                              color: '#1a1a1a',
                              backgroundColor: '#ffffff',
                              minHeight: 50,
                              pointerEvents: 'auto', // Ensure input is interactive on Android
                              zIndex: 1, // Lower than icon to ensure icon stays visible
                              ...(focusedField === 'accountHolderName' ? { ...getFocusedShadow(), elevation: 2 } : {}),
                            },
                          ] as any} // ✅ Use Platform.OS directly for arrays
                      value={accountHolderName}
                      onChangeText={setAccountHolderName}
                      placeholder="Enter account holder name"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                      editable={true}
                      onFocus={() => setFocusedField('accountHolderName')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Number *</Text>
                  <View style={Platform.select({
                    web: [
                      inputFocusStyles.inputContainer,
                      focusedField === 'accountNumber' && inputFocusStyles.inputContainerFocused,
                      confirmAccountNumber.length > 0 && accountNumber !== confirmAccountNumber && styles.errorInputContainer,
                    ].filter(Boolean) as any, // ✅ Filter false values
                    default: styles.inputWrapper,
                  }) as any}>
                    <Hash size={20} color="#64748b" style={Platform.OS === 'web' ? styles.inputIcon : styles.inputIconAbsolute} />
                    <TextInput
                      ref={accountNumberRef}
                      style={Platform.OS === 'web' 
                        ? inputFocusStyles.input 
                        : [
                            {
                              borderWidth: 2,
                              borderColor: (confirmAccountNumber.length > 0 && accountNumber !== confirmAccountNumber) 
                                ? '#ef4444' 
                                : (focusedField === 'accountNumber' ? '#3f66ac' : '#E5E7EB'),
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingLeft: 44,
                              paddingVertical: 18,
                              fontSize: 16,
                              color: '#1a1a1a',
                              backgroundColor: '#ffffff',
                              minHeight: 50,
                              zIndex: 1, // Lower than icon to ensure icon stays visible
                              ...(focusedField === 'accountNumber' ? { ...getFocusedShadow(), elevation: 2 } : {}),
                            },
                          ] as any} // ✅ Use Platform.OS directly for arrays
                      value={accountNumber}
                      onChangeText={handleAccountNumberChange}
                      placeholder="Enter account number"
                      placeholderTextColor="#999999"
                      keyboardType="numeric"
                      editable={true}
                      onFocus={() => setFocusedField('accountNumber')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Confirm Account Number *</Text>
                  <View style={Platform.select({
                    web: [
                      inputFocusStyles.inputContainer,
                      focusedField === 'confirmAccountNumber' && inputFocusStyles.inputContainerFocused,
                      confirmAccountNumber.length > 0 && accountNumber !== confirmAccountNumber && styles.errorInputContainer,
                    ].filter(Boolean) as any, // ✅ Filter false values
                    default: styles.inputWrapper,
                  }) as any}>
                    <Hash size={20} color="#64748b" style={Platform.OS === 'web' ? styles.inputIcon : styles.inputIconAbsolute} />
                    <TextInput
                      style={Platform.OS === 'web' 
                        ? inputFocusStyles.input 
                        : [
                            {
                              borderWidth: 2,
                              borderColor: (confirmAccountNumber.length > 0 && accountNumber !== confirmAccountNumber) 
                                ? '#ef4444' 
                                : (focusedField === 'confirmAccountNumber' ? '#3f66ac' : '#E5E7EB'),
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingLeft: 44,
                              paddingVertical: 18,
                              fontSize: 16,
                              color: '#1a1a1a',
                              backgroundColor: '#ffffff',
                              minHeight: 50,
                              zIndex: 1, // Lower than icon to ensure icon stays visible
                              ...(focusedField === 'confirmAccountNumber' ? { ...getFocusedShadow(), elevation: 2 } : {}),
                            },
                          ] as any} // ✅ Use Platform.OS directly for arrays
                      value={confirmAccountNumber}
                      onChangeText={handleConfirmAccountNumberChange}
                      placeholder="Re-enter account number"
                      placeholderTextColor="#999999"
                      keyboardType="numeric"
                      editable={true}
                      onFocus={() => setFocusedField('confirmAccountNumber')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  {(confirmAccountNumber.length > 0 && accountNumber !== confirmAccountNumber) ? (
                    <Text style={styles.errorText}>Account numbers do not match</Text>
                  ) : null}
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>IFSC Code *</Text>
                  <View style={Platform.select({
                    web: [
                      inputFocusStyles.inputContainer,
                      focusedField === 'ifscCode' && inputFocusStyles.inputContainerFocused,
                    ].filter(Boolean) as any, // ✅ Filter false values
                    default: styles.inputWrapper,
                  }) as any}>
                    <Building2 size={20} color="#64748b" style={Platform.OS === 'web' ? styles.inputIcon : styles.inputIconAbsolute} />
                    <TextInput
                      ref={ifscInputRef}
                      style={Platform.OS === 'web' 
                        ? inputFocusStyles.input 
                        : [
                            {
                              borderWidth: 2,
                              borderColor: focusedField === 'ifscCode' ? '#3f66ac' : '#E5E7EB',
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingLeft: 44,
                              paddingVertical: 18,
                              fontSize: 16,
                              color: '#1a1a1a',
                              backgroundColor: '#ffffff',
                              minHeight: 50,
                              zIndex: 1, // Lower than icon to ensure icon stays visible
                              ...(focusedField === 'ifscCode' ? { ...getFocusedShadow(), elevation: 2 } : {}),
                            },
                          ] as any} // ✅ Use Platform.OS directly for arrays
                      value={ifscCode}
                      onChangeText={handleIFSCChange}
                      placeholder="Enter IFSC code"
                      placeholderTextColor="#999999"
                      autoCapitalize="characters"
                      maxLength={11}
                      selection={ifscSelection}
                      onSelectionChange={handleIFSCSelectionChange}
                      editable={true}
                      onFocus={() => setFocusedField('ifscCode')}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Do you collect UPI payments?</Text>
                  <View style={styles.upiToggleContainer}>
                    <TouchableOpacity
                      style={[
                        styles.upiToggleButton,
                        acceptsUpiPayments && styles.upiToggleButtonActive,
                      ]}
                      onPress={() => {
                        setAcceptsUpiPayments(true);
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.upiToggleButtonText,
                        acceptsUpiPayments && styles.upiToggleButtonTextActive,
                      ]}>Yes</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.upiToggleButton,
                        !acceptsUpiPayments && styles.upiToggleButtonInactive,
                      ]}
                      onPress={() => {
                        setAcceptsUpiPayments(false);
                        setUpiId('');
                      }}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.upiToggleButtonText,
                        !acceptsUpiPayments && styles.upiToggleButtonTextInactive,
                      ]}>No</Text>
                    </TouchableOpacity>
                  </View>
                </View>

                {acceptsUpiPayments ? (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>UPI ID *</Text>
                    <View style={Platform.select({
                      web: [
                        inputFocusStyles.inputContainer,
                        focusedField === 'upiId' && inputFocusStyles.inputContainerFocused,
                        upiId.length > 0 && !validateUPI(upiId) && styles.errorInputContainer,
                      ].filter(Boolean) as any,
                      default: styles.inputWrapper,
                    }) as any}>
                      <CreditCard size={20} color="#64748b" style={Platform.OS === 'web' ? styles.inputIcon : styles.inputIconAbsolute} />
                      <TextInput
                        style={Platform.OS === 'web' 
                          ? inputFocusStyles.input
                          : [
                              {
                                borderWidth: 2,
                                borderColor: (upiId.length > 0 && !validateUPI(upiId)) 
                                  ? '#ef4444' 
                                  : (focusedField === 'upiId' ? '#3f66ac' : '#E5E7EB'),
                                borderRadius: 12,
                                paddingHorizontal: 16,
                                paddingLeft: 44,
                                paddingVertical: 18,
                                fontSize: 16,
                                color: '#1a1a1a',
                                backgroundColor: '#ffffff',
                                minHeight: 50,
                                zIndex: 1,
                                ...(focusedField === 'upiId' ? { ...getFocusedShadow(), elevation: 2 } : {}),
                              },
                            ] as any}
                        value={upiId}
                        onChangeText={handleUPIChange}
                        placeholder="e.g., yourname@upi"
                        placeholderTextColor="#999999"
                        autoCapitalize="none"
                        autoCorrect={false}
                        editable={true}
                        onFocus={() => setFocusedField('upiId')}
                        onBlur={() => setFocusedField(null)}
                      />
                    </View>
                    <Text style={styles.fieldHint}>
                      This UPI ID will be used for collecting payments from customers
                    </Text>
                    {(upiId.length > 0 && !validateUPI(upiId)) ? (
                      <Text style={styles.errorText}>Please enter a valid UPI ID (e.g., username@bankname)</Text>
                    ) : null}
                  </View>
                ) : null}

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Account Type *</Text>
                  <View style={styles.toggleContainer}>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        accountType === 'Savings' && styles.activeToggleButton,
                      ]}
                      onPress={() => setAccountType('Savings')}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        accountType === 'Savings' && styles.activeToggleButtonText,
                      ]}>
                        Savings
                      </Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[
                        styles.toggleButton,
                        accountType === 'Current' && styles.activeToggleButton,
                      ]}
                      onPress={() => setAccountType('Current')}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.toggleButtonText,
                        accountType === 'Current' && styles.activeToggleButtonText,
                      ]}>
                        Current
                      </Text>
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.fieldHint}>
                    Select "Savings" for personal accounts or "Current" for business accounts
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Initial Balance *</Text>
                  <View style={Platform.select({
                    web: [
                      inputFocusStyles.inputContainer,
                      focusedField === 'initialBalance' && inputFocusStyles.inputContainerFocused,
                    ].filter(Boolean) as any, // ✅ Filter false values
                    default: styles.inputWrapper,
                  }) as any}>
                    {Platform.OS === 'web' ? (
                      <Text style={styles.currencySymbol}>₹</Text>
                    ) : (
                      <Text style={[styles.currencySymbol, { 
                        position: 'absolute' as const, 
                        left: 16, 
                        zIndex: 1,
                        top: '50%' as const,
                        marginTop: -10,
                      }]}>₹</Text>
                    )}
                    <TextInput
                      ref={initialBalanceInputRef}
                      style={Platform.OS === 'web' 
                        ? [inputFocusStyles.input, styles.balanceInput]
                        : [
                            {
                              borderWidth: 2,
                              borderColor: focusedField === 'initialBalance' ? '#3f66ac' : '#E5E7EB',
                              borderRadius: 12,
                              paddingHorizontal: 16,
                              paddingLeft: 44,
                              paddingVertical: 18,
                              fontSize: 16,
                              color: '#1a1a1a',
                              backgroundColor: '#ffffff',
                              minHeight: 50,
                              ...(focusedField === 'initialBalance' ? getFocusedShadow() : {}),
                            },
                            styles.balanceInput,
                          ] as any} // ✅ Use Platform.OS directly for arrays
                      value={initialBalance && initialBalance !== '0' && initialBalance !== '0.' && initialBalance !== '0.00' ? formatIndianNumber(initialBalance) : ''}
                      onChangeText={handleInitialBalanceChange}
                      placeholder="0.00"
                      placeholderTextColor="#999999"
                      keyboardType="decimal-pad"
                      editable={true}
                      onFocus={() => {
                        setFocusedField('initialBalance');
                        // Move cursor to end when focused, or start if empty
                        setTimeout(() => {
                          if (initialBalanceInputRef.current && Platform.OS !== 'web') {
                            // If empty or just "0", clear and position at start
                            if (!initialBalance || initialBalance === '0' || initialBalance === '0.' || initialBalance === '0.00') {
                              setInitialBalance('');
                              initialBalanceInputRef.current.setNativeProps({
                                selection: { start: 0, end: 0 }
                              });
                            } else {
                              const formatted = formatIndianNumber(initialBalance);
                              const length = formatted.length;
                              initialBalanceInputRef.current.setNativeProps({
                                selection: { start: length, end: length }
                              });
                            }
                          }
                        }, 100);
                      }}
                      onBlur={() => setFocusedField(null)}
                    />
                  </View>
                  <Text style={styles.fieldHint}>
                    Enter the current balance in this account
                  </Text>
                  {amountInWords && (
                    <View style={styles.amountInWordsContainer}>
                      <Text style={[
                        styles.amountInWordsText,
                        isLongAmountText && styles.amountInWordsTextCenter
                      ]}>
                        {amountInWords}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
              {editMode === 'true' ? (
                <View style={styles.buttonContainer}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={handleCancel}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.continueButton,
                      styles.editButton,
                      (isFormValid() && hasChanges()) ? styles.enabledButton : styles.disabledButton,
                    ]}
                    onPress={handleContinue}
                    disabled={!isFormValid() || !hasChanges() || isLoading || isNavigating}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.continueButtonText,
                      (isFormValid() && hasChanges()) ? styles.enabledButtonText : styles.disabledButtonText,
                    ]}>
                      {isLoading ? 'Saving...' : 'Save Changes'}
                    </Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={[
                    styles.continueButton,
                    isFormValid() ? styles.enabledButton : styles.disabledButton,
                  ]}
                  onPress={handleContinue}
                  disabled={!isFormValid() || isLoading || isNavigating}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.continueButtonText,
                    isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
                  ]}>
                    {isLoading ? 'Saving...' : 'Continue'}
                  </Text>
                </TouchableOpacity>
              )}
              {!isFormValid() ? (
                <Text style={styles.validationMessage}>
                  {getValidationMessage()}
                </Text>
              ) : null}
            </Animated.View>
          </ScrollView>

          {/* Bank Selection Modal */}
          <Modal
            visible={showBankModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowBankModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Bank</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowBankModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color="#666666" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                  <Search size={18} color="#64748b" />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    value={bankSearch}
                    onChangeText={setBankSearch}
                    placeholder="Search banks by name or IFSC prefix..."
                    placeholderTextColor="#94a3b8"
                    autoFocus={false}
                    autoCapitalize="none"
                  />
                </View>
                
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {filteredBanks.map((bank) => (
                    <TouchableOpacity
                      key={bank.id}
                      style={[
                        styles.modalOption,
                        selectedBank?.id === bank.id && styles.modalOptionSelected
                      ]}
                      onPress={() => {
                        // Immediately select bank without delay
                        handleBankSelect(bank);
                      }}
                      activeOpacity={0.7}
                      delayPressIn={0}
                    >
                      <View style={styles.bankInfo}>
                        <Text style={[
                          styles.bankName,
                          selectedBank?.id === bank.id && styles.bankNameSelected
                        ]}>
                          {bank.name}
                        </Text>
                        <View style={styles.bankMeta}>
                          <Text style={styles.bankShortNameModal}>({bank.shortName})</Text>
                          <Text style={styles.bankIFSC}>IFSC: {bank.ifscPrefix}****</Text>
                        </View>
                      </View>
                      <View style={[
                        styles.bankCategoryBadge,
                        { backgroundColor: getBankCategoryColor(bank.category) }
                      ]}>
                        <Text style={styles.bankCategoryText}>
                          {getBankCategoryLabel(bank.category)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: Platform.select({
      web: 60,
      default: 20, // SafeAreaView handles top safe area, so we start from 20
    }),
    left: 24,
    zIndex: 1,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: Platform.select({
      web: 32,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    paddingTop: Platform.select({
      web: 120,
      default: 0, // SafeAreaView handles top padding, back button is absolutely positioned
    }),
    paddingBottom: Platform.select({
      web: 40,
      ios: 20,
      android: 20, // Consistent bottom padding across all platforms
      default: 20,
    }),
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Platform.select({
      web: 48,
      default: 24,
    }),
  },
  iconWrapper: {
    width: 100,
    height: 100,
    backgroundColor: '#ffc754',
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#3f66ac',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Platform.select({
      web: 32,
      default: 20,
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: Platform.select({
      web: 12,
      default: 8,
    }),
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Platform.select({
      web: 16,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    marginBottom: Platform.select({
      web: 16,
      default: 12,
    }),
  },
  primaryNotice: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#0369a1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryNoticeText: {
    fontSize: 16,
    color: '#0369a1',
    textAlign: 'center',
    marginBottom: 4,
  },
  primaryBold: {
    fontWeight: '700',
  },
  primaryNoticeSubtext: {
    fontSize: 14,
    color: '#0284c7',
    textAlign: 'center',
  },
  formContainer: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  // inputContainer moved to getInputFocusStyles utility
  errorInputContainer: {
    borderColor: '#ef4444',
  },
  inputIcon: {
    marginRight: 12,
  },
  inputWrapper: {
    position: 'relative',
    ...Platform.select({
      default: {
        pointerEvents: 'box-none', // Allow touches to pass through to children
      },
    }),
  },
  inputIconAbsolute: {
    position: 'absolute',
    left: 16,
    top: '50%',
    marginTop: -10, // Half of icon size (20/2) to center vertically
    zIndex: 10, // Much higher zIndex to ensure icon stays above input even when focused
    elevation: 10, // On Android, elevation is needed to ensure icon renders above input with elevation
    pointerEvents: 'none',
  },
  input: {
    flex: 1,
    paddingVertical: Platform.select({
      web: 14,
      default: 14,
    }),
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        // outlineStyle removed - React Native doesn't support 'none', use undefined instead
      },
      default: {
        // Ensure inputs are fully interactive on mobile
        minHeight: 50, // Better touch target
      },
    }) as any, // ✅ Type assertion for web-specific styles
  },
  // errorInput style removed - using errorInputContainer instead
  errorText: {
    color: '#ef4444',
    fontSize: 12,
    marginTop: 4,
  },
  accountTypeInput: {
    textTransform: 'capitalize',
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#3f66ac',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  activeToggleButtonText: {
    color: '#ffffff',
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginRight: 12,
  },
  balanceInput: {
    textAlign: 'right',
  },
  dropdown: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankSelectContent: {
    flex: 1,
  },
  selectedBankInfo: {
    flex: 1,
  },
  selectedBankName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  bankMetaInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankShortName: {
    fontSize: 12,
    color: '#666666',
  },
  bankCategoryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
  },
  bankCategoryText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  dropdownPlaceholder: {
    fontSize: 16,
    color: '#999999',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b7280',
  },
  continueButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginBottom: 16,
  },
  editButton: {
    flex: 1,
    marginBottom: 0,
  },
  enabledButton: {
    backgroundColor: '#ffc754',
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  enabledButtonText: {
    color: '#3f66ac',
  },
  disabledButtonText: {
    color: '#6b7280',
  },
  validationMessage: {
    fontSize: 14,
    color: '#ef4444',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    ...Platform.select({
      web: {
        boxShadow: '0px 4px 8px rgba(0, 0, 0, 0.15)',
      },
      default: {
        ...getPlatformShadow(4, '#000', 0.15),
        elevation: 8,
      },
    }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#ffffff',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#334155',
    paddingVertical: 8,
    ...(Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        // outlineStyle removed - React Native doesn't support 'none'
      },
    }) as any), // ✅ Type assertion for web-specific styles
  },
  modalContent: {
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionSelected: {
    backgroundColor: '#f0f7ff',
  },
  bankInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
    marginBottom: 4,
  },
  bankNameSelected: {
    color: '#3f66ac',
    fontWeight: '600',
  },
  bankMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  bankShortNameModal: {
    fontSize: 12,
    color: '#64748b',
  },
  bankIFSC: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  // Required UPI ID styles
  requiredLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#D97706',
    marginBottom: 8,
  },
  requiredInputContainer: {
    borderColor: '#D97706',
    borderWidth: 2,
    backgroundColor: '#fff7ed',
  },
  requiredInput: {
    color: '#D97706',
    fontWeight: '600',
  },
  requiredFieldHint: {
    fontSize: 12,
    color: '#D97706',
    marginTop: 4,
    fontWeight: '500',
  },
  requiredErrorText: {
    color: '#D97706',
    fontSize: 12,
    marginTop: 4,
    fontWeight: '600',
  },
  amountInWordsContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    width: '100%',
  },
  amountInWordsText: {
    fontSize: Platform.select({
      web: 12,
      default: 11,
    }),
    color: '#64748b',
    fontStyle: 'italic',
    textAlign: 'right',
    lineHeight: Platform.select({
      web: 16,
      default: 15,
    }),
  },
  amountInWordsTextCenter: {
    textAlign: 'center',
  },
  upiToggleContainer: {
    flexDirection: 'row',
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 4,
    borderWidth: 2,
    borderColor: '#e9ecef',
  },
  upiToggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  upiToggleButtonActive: {
    backgroundColor: '#10b981',
  },
  upiToggleButtonInactive: {
    backgroundColor: '#94a3b8',
  },
  upiToggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666666',
  },
  upiToggleButtonTextActive: {
    color: '#ffffff',
  },
  upiToggleButtonTextInactive: {
    color: '#ffffff',
  },
});