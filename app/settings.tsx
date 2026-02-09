import React, { useState, useEffect, useMemo } from 'react';
import { router, useFocusEffect } from 'expo-router';
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
} from 'lucide-react-native';
import { dataStore, getGSTINStateCode } from '@/utils/dataStore';
import { subscriptionStore } from '@/utils/subscriptionStore';
import { useStatusBar } from '@/contexts/StatusBarContext';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { useBusinessData } from '@/hooks/useBusinessData';
import { showAlert, showConfirm } from '@/utils/webAlert';
import CustomAlert from '@/components/CustomAlert';
import { useWebBackNavigation } from '@/hooks/useWebBackNavigation';
import { useWebNavigation } from '@/contexts/WebNavigationContext';
import { supabase } from '@/lib/supabase';

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

const DEFAULT_USER_PROFILE = {
  name: 'John Doe',
  position: 'Business Owner',
  businessName: 'ABC Electronics',
  gstin: '22AAAAA0000A1Z5',
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
  const { data: businessData, refetch } = useBusinessData();
  const webNav = useWebNavigation(); // For web navigation
  
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

  // Subscribe to alert state changes
  useEffect(() => {
    const { subscribeToAlert, getAlertState } = require('@/utils/webAlert');
    const unsubscribe = subscribeToAlert((state) => {
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
    weeklyReports: false,
    lowStockAlerts: true,
    overdueReceivables: true,
    overduePayables: true,
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

  const [activeBankAccounts, setActiveBankAccounts] = useState<Set<string>>(new Set(['1'])); // Mock active account

  // Subscription state
  const [subscriptions, setSubscriptions] = useState([
    {
      id: '1',
      name: 'ERP Pro Plan',
      amount: 2999,
      currency: '₹',
      status: 'current',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      nextBilling: '2024-12-31',
      invoiceId: 'INV-001',
    },
    {
      id: '2',
      name: 'Inventory Management',
      amount: 999,
      currency: '₹',
      status: 'paid',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      nextBilling: '2024-03-31',
      invoiceId: 'INV-002',
    },
    {
      id: '3',
      name: 'Analytics Dashboard',
      amount: 1499,
      currency: '₹',
      status: 'failed',
      startDate: '2024-02-01',
      endDate: '2024-04-30',
      nextBilling: '2024-04-30',
      invoiceId: 'INV-003',
    },
  ]);

  const [showPaymentMethodsModal, setShowPaymentMethodsModal] = useState(false);
  const [showBankAccountsModal, setShowBankAccountsModal] = useState(false);

  // ✅ Use useMemo for instant derived data from cached businessData (no delay)
  const formattedAddresses = useMemo(() => {
    if (!businessData?.addresses) return [];
    return businessData.addresses.map((addr: any) => {
      const formattedAddress = {
        id: addr.id,
        backendId: addr.id,
        name: addr.name,
        type: addr.type,
        doorNumber: addr.door_number || '',
        addressLine1: addr.address_line1 || '',
        addressLine2: addr.address_line2 || '',
        additionalLines: addr.additional_lines && Array.isArray(addr.additional_lines) ? addr.additional_lines : [],
        city: addr.city || '',
        pincode: addr.pincode || '',
        stateName: addr.state || '',
        stateCode: addr.state ? getGSTINStateCode(addr.state) : '',
        isPrimary: addr.is_primary || false,
        manager: addr.manager_name || '',
        phone: addr.manager_mobile_number || '',
        status: 'active' as const,
        createdAt: addr.created_at || new Date().toISOString(),
        updatedAt: addr.updated_at || new Date().toISOString(),
      };
      
      // ✅ Sync address to DataStore so edit-address-simple can find it
      const existingAddress = dataStore.getAddresses().find(a => a.backendId === addr.id);
      if (!existingAddress) {
        dataStore.addAddress(formattedAddress as any);
      } else {
        dataStore.updateAddress(existingAddress.id, formattedAddress as any);
      }
      
      return formattedAddress;
    });
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
      isPrimary: acc.is_primary || false
    }));
  }, [businessData?.bankAccounts]);

  // ✅ Update state only when formatted data changes (instant from cache)
  useEffect(() => {
    setAddresses(formattedAddresses);
  }, [formattedAddresses]);

  useEffect(() => {
    setBankAccounts(formattedBankAccounts);
  }, [formattedBankAccounts]);

  // ✅ Only refetch if cache is stale (optimized for instant loading)
  useFocusEffect(
    React.useCallback(() => {
      const { __getGlobalCache } = require('@/hooks/useBusinessData');
      const cache = __getGlobalCache();
      const now = Date.now();
      const CACHE_DURATION = 30000; // 30 seconds - longer cache for better UX
      
      // Only refetch if cache is stale or missing (data loads instantly from cache)
      if (!cache.data || (now - cache.timestamp) > CACHE_DURATION) {
        console.log('🔄 Settings: Cache stale, refetching in background');
        refetch().catch((error) => {
          console.error('❌ Error refetching settings data:', error);
        });
      } else {
        console.log('✅ Settings: Using cached data (instant display)');
      }
    }, [refetch])
  );

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
      router.push('/locations/add-branch');
    } else if (type === 'warehouse') {
      router.push('/locations/add-warehouse');
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
    
    router.push({
      pathname: '/edit-address-simple',
      params: {
        editAddressId: addressId, // ✅ Use backendId if available for proper editing
        addressType: address.type,
        fromSettings: 'true', // ✅ Flag to indicate coming from settings
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
    router.push({
      pathname: '/add-bank-account'
    } as any);
  };

  const handleEditBankAccount = (account: BankAccount) => {
    // Prevent multiple forms from opening
    if (isAddingBankAccount) {
      return;
    }
    
    setIsAddingBankAccount(true);
    
    // Navigate to edit bank account page
    router.push({
      pathname: '/add-bank-account',
      params: { 
        account: JSON.stringify(account)
      }
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
    const confirmed = await showConfirm(
      'Logout',
      'Are you sure you want to logout?',
      async () => {
        try {
          setIsLoggingOut(true);
          // Sign out from Supabase
          const { error } = await supabase.auth.signOut();
          if (error) {
            throw error;
          }
          // Clear local data
          await dataStore.clearAllDataForTesting();
          await subscriptionStore.clearSubscriptionData();
          // Navigate to login screen
          router.replace('/auth/mobile');
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
      },
      'Logout',
      'Cancel'
    );
  };

  const handleNotificationToggle = (key: keyof typeof notificationSettings) => {
    setNotificationSettings(prev => ({
      ...prev,
      [key]: !prev[key]
    }));
    // TODO: Implement notification setting save logic
    console.log(`${key} toggled to:`, !notificationSettings[key]);
  };

  const handlePaymentMethodToggle = (method: keyof typeof paymentMethods) => {
    setPaymentMethods(prev => ({
      ...prev,
      [method]: !prev[method]
    }));
    // TODO: Implement payment method save logic
    console.log(`${method} toggled to:`, !paymentMethods[method]);
  };

  const handleBankAccountToggle = (accountId: string) => {
    const newActiveAccounts = new Set(activeBankAccounts);
    if (newActiveAccounts.has(accountId)) {
      newActiveAccounts.delete(accountId);
    } else {
      newActiveAccounts.add(accountId);
    }
    setActiveBankAccounts(newActiveAccounts);
    // TODO: Implement bank account activation/deactivation logic
    console.log('Bank account toggled:', accountId);
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
      await dataStore.clearAllDataForTesting();
      await subscriptionStore.clearSubscriptionData();

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
      router.replace('/auth/mobile');
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
                    router.push({
                      pathname: '/auth/business-address',
                      params: { 
                        addressType: 'primary',
                        editMode: 'false',
                        // Pass business info if available
                        ...(business?.legal_name && { businessName: business.legal_name }),
                        ...(business?.tax_id && { value: business.tax_id }),
                        ...(business?.tax_id && business.tax_id.length === 15 && { type: 'GSTIN' }),
                        ...(business?.tax_id && business.tax_id.length === 10 && { type: 'PAN' }),
                        ...(user?.full_name && { name: user.full_name }),
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
              onPress={() => {
                // Set primary in data store
                dataStore.setPrimaryBankAccount(account.id);
                // Reload bank accounts to refresh UI
                loadBankAccounts();
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

      <ScrollView style={styles.content} contentContainerStyle={webContainerStyles.webScrollContent} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              {userProfile.profilePhoto ? (
                <View style={styles.profileImage}>
                  <Text style={styles.profileImageText}>
                    {userProfile.name 
                      ? userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase() 
                      : 'U'}
                  </Text>
                </View>
              ) : (
                <View style={[styles.profileImage, { backgroundColor: Colors.primary }]}>
                  <Text style={styles.profileImageText}>
                    {userProfile.name 
                      ? userProfile.name.split(' ').map(n => n[0]).join('').toUpperCase() 
                      : 'U'}
                  </Text>
                </View>
              )}
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

        {/* Subscription Section */}
        {subscription.isOnTrial && (
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
              onPress={() => router.push('/subscription')}
              activeOpacity={0.8}
            >
              <Text style={styles.upgradeButtonText}>Upgrade Now</Text>
            </TouchableOpacity>
            
          </View>
        )}
        
        {/* Show subscription status if not on trial */}
        {!subscription.isOnTrial && businessData?.business?.subscription_status && (
          <View style={styles.subscriptionSection}>
            <View style={styles.subscriptionHeader}>
              <CreditCard size={20} color="#3f66ac" />
              <Text style={styles.subscriptionTitle}>Subscription Status</Text>
            </View>
            <Text style={styles.subscriptionSubtitle}>
              Status: {businessData.business.subscription_status}
            </Text>
            {businessData.business.trial_start_date && (
              <Text style={styles.trialDateText}>
                Trial Started: {new Date(businessData.business.trial_start_date).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            )}
            {businessData.business.trial_end_date && (
              <Text style={styles.trialDateText}>
                Trial Ended: {new Date(businessData.business.trial_end_date).toLocaleDateString('en-IN', {
                  year: 'numeric',
                  month: 'short',
                  day: 'numeric'
                })}
              </Text>
            )}
          </View>
        )}

        {/* Business Addresses Section */}
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
          
        {/* Bank Accounts Section */}
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

        {/* Payments Section */}
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

            {/* Subscriptions */}
            <TouchableOpacity 
              style={styles.paymentOption}
              onPress={() => router.push({
                pathname: '/subscriptions'
              } as any)}
              activeOpacity={0.7}
            >
              <View style={styles.paymentOptionInfo}>
                <Calendar size={20} color={Colors.warning} />
                <View style={styles.paymentOptionText}>
                  <Text style={styles.paymentOptionTitle}>Subscriptions</Text>
                  <Text style={styles.paymentOptionDescription}>View subscription details and payment status</Text>
                </View>
              </View>
              <ChevronRight size={16} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

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
                // Use web navigation if on web, otherwise normal navigation
                if (Platform.OS === 'web' && webNav.isWeb) {
                  webNav.navigateToScreen('/privacy-policy');
                } else {
                  router.push('/privacy-policy');
                }
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
                // Use web navigation if on web, otherwise normal navigation
                if (Platform.OS === 'web' && webNav.isWeb) {
                  webNav.navigateToScreen('/terms-and-conditions');
                } else {
                  router.push('/terms-and-conditions');
                }
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

        {/* Danger Zone */}
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
      </ScrollView>

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
  subscriptionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
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
});

