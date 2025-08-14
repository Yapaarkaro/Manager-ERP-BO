import React, { useState, useEffect } from 'react';
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
  Sun,
  Moon,
  Smartphone,
  Globe,
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
} from 'lucide-react-native';
import { dataStore } from '@/utils/dataStore';

// Temporary interfaces until they're added to dataStore
interface BusinessAddress {
  id: string;
  name: string;
  type: 'primary' | 'branch' | 'warehouse';
  doorNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  stateName: string;
  stateCode: string;
  pincode: string;
  manager?: string;
  phone?: string;
  isPrimary: boolean;
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
  const [userProfile, setUserProfile] = useState({
    name: 'John Doe',
    position: 'Business Owner',
    businessName: 'ABC Electronics',
    gstin: '22AAAAA0000A1Z5',
    profilePhoto: null, // Set to actual photo URL when available
  });

  const [addresses, setAddresses] = useState<BusinessAddress[]>([]);
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [isAddingAddress, setIsAddingAddress] = useState(false);
  const [isAddingBankAccount, setIsAddingBankAccount] = useState(false);
  const [showFullBankDetails, setShowFullBankDetails] = useState<Set<string>>(new Set());
  const [selectedTheme, setSelectedTheme] = useState<'light' | 'dark' | 'system'>('light');
  const [selectedLanguage, setSelectedLanguage] = useState<'english' | 'hindi' | 'tamil' | 'kannada' | 'telugu' | 'malayalam'>('english');
  const [showLanguageModal, setShowLanguageModal] = useState(false);
  
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

  // Load addresses from dataStore
  useEffect(() => {
    loadAddresses();
    loadBankAccounts();
    
    // Subscribe to dataStore changes
    const unsubscribe = dataStore.subscribe(() => {
      loadAddresses();
      loadBankAccounts();
    });
    
    return unsubscribe;
  }, []);

  const loadAddresses = () => {
    // Mock data for now - replace with actual dataStore.getAddresses() when available
    const mockAddresses: BusinessAddress[] = [
      {
        id: '1',
      name: 'Main Office',
        type: 'primary',
      doorNumber: '123',
        addressLine1: 'Business Park',
        addressLine2: 'Floor 5',
      city: 'Mumbai',
      stateName: 'Maharashtra',
        stateCode: 'MH',
        pincode: '400001',
        manager: 'John Doe',
      phone: '+91 98765 43210',
        isPrimary: true
      }
    ];
    setAddresses(mockAddresses);
  };

  const loadBankAccounts = () => {
    // Mock data for now - replace with actual dataStore.getBankAccounts() when available
    const mockBankAccounts: BankAccount[] = [
      {
        id: '1',
        accountHolderName: 'ABC Electronics',
        bankName: 'State Bank of India',
        bankCode: 'SBI',
        accountNumber: '1234567890',
        ifscCode: 'SBIN0001234',
        upiId: 'abc.electronics@sbi',
        accountType: 'current',
        isPrimary: true
      }
    ];
    setBankAccounts(mockBankAccounts);
  };

  const getAddressesByType = (type: 'branch' | 'warehouse') => {
    return addresses.filter(addr => addr.type === type);
  };

  const getPrimaryAddress = () => {
    return addresses.find(addr => addr.isPrimary) || null;
  };

  const getPrimaryBankAccount = () => {
    return bankAccounts.find(acc => acc.isPrimary) || null;
  };

  const handleBackPress = () => {
    router.back();
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
    
    // Navigate to add address page immediately
    router.push({
      pathname: '/add-address',
      params: { type }
    } as any);
  };

  const handleEditAddress = (address: BusinessAddress) => {
    // Prevent multiple forms from opening
    if (isAddingAddress) {
      return;
    }
    
    setIsAddingAddress(true);
    
    // Navigate to edit address page
    router.push({
      pathname: '/add-address',
      params: {
        type: address.type,
        address: JSON.stringify(address)
      }
    } as any);
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

  const handleDeleteBankAccount = (accountId: string) => {
    // Mock delete for now - replace with actual dataStore.deleteBankAccount() when available
    setBankAccounts(prev => prev.filter(acc => acc.id !== accountId));
  };

  const handleThemeChange = (theme: 'light' | 'dark' | 'system') => {
    setSelectedTheme(theme);
    // TODO: Implement theme change logic
    console.log('Theme changed to:', theme);
  };

  const handleLanguageChange = (language: 'english' | 'hindi' | 'tamil' | 'kannada' | 'telugu' | 'malayalam') => {
    setSelectedLanguage(language);
    setShowLanguageModal(false);
    // TODO: Implement language change logic
    console.log('Language changed to:', language);
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

  const confirmDeleteAddress = () => {
    if (addressToDelete) {
      // Mock delete for now - replace with actual dataStore.deleteAddress() when available
      setAddresses(prev => prev.filter(addr => addr.id !== addressToDelete));
      setAddressToDelete(null);
      setShowDeleteModal(false);
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
                    router.push({
                      pathname: '/add-address',
                      params: { type: 'branch' }
                    } as any);
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
                // Mock set primary for now - replace with actual dataStore.setPrimaryBankAccount() when available
                setBankAccounts(prev => prev.map(acc => ({
                  ...acc,
                  isPrimary: acc.id === account.id
                })));
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

  return (
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

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Profile Section */}
        <View style={styles.profileSection}>
          <View style={styles.profileHeader}>
            <View style={styles.profileImageContainer}>
              {userProfile.profilePhoto ? (
                <View style={styles.profileImage}>
                  <Text style={styles.profileImageText}>JD</Text>
                </View>
              ) : (
                <View style={[styles.profileImage, { backgroundColor: Colors.primary }]}>
                  <Text style={styles.profileImageText}>
                    {userProfile.name.split(' ').map(n => n[0]).join('')}
                  </Text>
                </View>
              )}
            </View>
            <View style={styles.profileInfo}>
              <Text style={styles.profileName}>{userProfile.name}</Text>
              <Text style={styles.profilePosition}>{userProfile.position}</Text>
              <Text style={styles.profileBusiness}>{userProfile.businessName}</Text>
              <Text style={styles.profileGstin}>{userProfile.gstin}</Text>
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

        {/* Appearance Section */}
        <View style={styles.section}>
          <View style={styles.mainSectionHeader}>
            <View style={styles.mainSectionHeaderContent}>
              <Text style={styles.mainSectionTitle}>Appearance</Text>
                  </View>
                  </View>
                
          <View style={styles.mainExpandedContent}>
            {/* Theme Selection */}
            <View style={styles.appearanceSubsection}>
              <Text style={styles.appearanceSubtitle}>Theme</Text>
              <View style={styles.themeSelector}>
            <TouchableOpacity
                  style={[styles.themeOption, { backgroundColor: Colors.primary + '15', borderColor: Colors.primary }]}
                  onPress={() => handleThemeChange('light')}
              activeOpacity={0.7}
            >
                  <Sun size={24} color={Colors.primary} />
                  <Text style={[styles.themeOptionText, { color: Colors.primary }]}>Light</Text>
            </TouchableOpacity>
          
            <TouchableOpacity 
                  style={[styles.themeOption, { backgroundColor: Colors.secondary + '15', borderColor: Colors.secondary }]}
                  onPress={() => handleThemeChange('dark')}
              activeOpacity={0.7}
            >
                  <Moon size={24} color={Colors.secondary} />
                  <Text style={[styles.themeOptionText, { color: Colors.secondary }]}>Dark</Text>
            </TouchableOpacity>
            
                <TouchableOpacity 
                  style={styles.themeOption}
                  onPress={() => handleThemeChange('system')}
                  activeOpacity={0.7}
                >
                  <Smartphone size={24} color={Colors.textLight} />
                  <Text style={styles.themeOptionText}>System</Text>
                </TouchableOpacity>
                  </View>
                  </View>
                
            {/* Language Selection */}
            <View style={styles.appearanceSubsection}>
              <Text style={styles.appearanceSubtitle}>Language</Text>
            <TouchableOpacity
                style={styles.languageSelector}
                onPress={() => setShowLanguageModal(true)}
              activeOpacity={0.7}
            >
                <View style={styles.languageSelectorContent}>
                  <Globe size={20} color={Colors.textLight} />
                  <Text style={styles.languageSelectorText}>
                    {selectedLanguage === 'english' ? 'English' :
                     selectedLanguage === 'hindi' ? 'हिंदी' :
                     selectedLanguage === 'tamil' ? 'தமிழ்' :
                     selectedLanguage === 'kannada' ? 'ಕನ್ನಡ' :
                     selectedLanguage === 'telugu' ? 'తెలుగు' :
                     selectedLanguage === 'malayalam' ? 'മലയാളം' : 'English'}
                  </Text>
                </View>
                <ChevronDown size={16} color={Colors.textLight} />
            </TouchableOpacity>
              </View>
          </View>
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

      {/* Language Selection Modal */}
      <Modal
        visible={showLanguageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLanguageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.languageModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Language</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowLanguageModal(false)}
                activeOpacity={0.7}
              >
                <X size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.languageList}>
              {[
                { key: 'english', label: 'English', native: 'English' },
                { key: 'hindi', label: 'हिंदी', native: 'हिंदी' },
                { key: 'tamil', label: 'தமிழ்', native: 'தமிழ்' },
                { key: 'kannada', label: 'ಕನ್ನಡ', native: 'ಕನ್ನಡ' },
                { key: 'telugu', label: 'తెలుగు', native: 'తెలుగు' },
                { key: 'malayalam', label: 'മലയാളം', native: 'മലയാളം' }
              ].map((language) => (
                <TouchableOpacity
                  key={language.key}
                  style={styles.languageOption}
                  onPress={() => handleLanguageChange(language.key as any)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.languageOptionText}>{language.native}</Text>
                  {selectedLanguage === language.key && (
                    <Text style={styles.languageOptionCheck}>✓</Text>
                  )}
                </TouchableOpacity>
              ))}
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


    </SafeAreaView>
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
  appearanceSubsection: {
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  appearanceSubtitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  themeSelector: {
    flexDirection: 'row',
    gap: 12,
    justifyContent: 'space-between',
  },
  themeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    backgroundColor: Colors.background,
  },
  themeOptionText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
    marginTop: 8,
  },
  languageSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    backgroundColor: Colors.background,
  },
  languageSelectorContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  languageSelectorText: {
    fontSize: 16,
    color: Colors.text,
  },
  languageModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '90%',
    maxHeight: '70%',
    overflow: 'hidden',
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
  languageList: {
    padding: 16,
  },
  languageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  languageOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  languageOptionCheck: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: 'bold',
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
});

