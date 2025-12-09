import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { 
  CheckCircle, 
  User, 
  Building2, 
  CreditCard, 
  MapPin, 
  Banknote, 
  IndianRupee,
  FileText,
  Calendar,
  Hash,
  Type,
  ChevronDown,
  ChevronUp,
  Edit3,
  ArrowLeft,
  Home,
  Warehouse,
  Phone,
  Trash2,
  Eye,
} from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
import { dataStore } from '@/utils/dataStore';
import { subscriptionStore } from '@/utils/subscriptionStore';
import InvoicePatternConfig from '@/components/InvoicePatternConfig';
import TrialNotification from '@/components/TrialNotification';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { completeOnboarding, deleteSignupProgress, saveSignupProgress } from '@/services/backendApi';
import { supabase } from '@/lib/supabase';

export default function BusinessSummaryScreen() {
  const { 
    type,
    value,
    gstinData,
    name,
    businessName,
    businessType,
    customBusinessType,
    allAddresses,
    allBankAccounts,
    initialCashBalance,
    invoicePrefix,
    invoicePattern,
    startingInvoiceNumber,
    fiscalYear,
    mobile,
  } = useLocalSearchParams();

  // Editable states
  const [editableName, setEditableName] = useState(name as string);
  const [editableBusinessName, setEditableBusinessName] = useState(businessName as string);
  const [editableBusinessType, setEditableBusinessType] = useState(
    businessType !== 'Others' ? businessType as string : customBusinessType as string
  );
  const [editableAddresses, setEditableAddresses] = useState(JSON.parse(allAddresses as string || '[]'));
  const [editableBankAccounts, setEditableBankAccounts] = useState(JSON.parse(allBankAccounts as string || '[]'));
  const [editableCashBalance, setEditableCashBalance] = useState(initialCashBalance as string || '0');
  const [editableInvoicePrefix, setEditableInvoicePrefix] = useState(invoicePrefix as string);
  const [editableInvoicePattern, setEditableInvoicePattern] = useState(invoicePattern as string);
  const [editableStartingNumber, setEditableStartingNumber] = useState(startingInvoiceNumber as string);
  const [editableFiscalYear, setEditableFiscalYear] = useState<'JAN-DEC' | 'APR-MAR'>(fiscalYear as any || 'APR-MAR');

  // Expandable sections (all expanded by default)
  const [expandedSections, setExpandedSections] = useState({
    business: true,
    locations: true,
    financial: true,
    invoice: true,
  });

  // Edit mode tracking
  const [editingSection, setEditingSection] = useState<string | null>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showTrialNotification, setShowTrialNotification] = useState(false);
  const [showDeleteAddressModal, setShowDeleteAddressModal] = useState(false);
  const [showDeleteBankModal, setShowDeleteBankModal] = useState(false);
  const [addressToDelete, setAddressToDelete] = useState<string | null>(null);
  const [bankAccountToDelete, setBankAccountToDelete] = useState<string | null>(null);
  const [showViewBankModal, setShowViewBankModal] = useState(false);
  const [bankAccountToView, setBankAccountToView] = useState<any | null>(null);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const colors = useThemeColors();

  // Calculate totals
  const totalBankBalance = editableBankAccounts.reduce((sum: number, account: any) => sum + (parseFloat(account.initialBalance) || 0), 0);
  const totalCashBalance = parseFloat(editableCashBalance) || 0;
  const grandTotal = totalBankBalance + totalCashBalance;

  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: false, // Disable for web to avoid warning
    }).start();
  }, []);

  // Reload data when screen comes into focus (after editing)
  useFocusEffect(
    React.useCallback(() => {
      const reloadData = async () => {
        console.log('🔄 Reloading data on business summary screen focus');
        try {
          const latestAddresses = await dataStore.getAddresses();
          const latestBankAccounts = await dataStore.getBankAccounts();
          console.log('📊 Raw data from store:', { 
            addresses: latestAddresses, 
            banks: latestBankAccounts 
          });
          
          // Only update if we have data, otherwise keep existing data
          if (latestAddresses && latestAddresses.length > 0) {
            setEditableAddresses(latestAddresses);
          }
          if (latestBankAccounts && latestBankAccounts.length > 0) {
            setEditableBankAccounts(latestBankAccounts);
          }
          
          console.log('✅ Data reloaded:', { 
            addresses: latestAddresses?.length || 0, 
            banks: latestBankAccounts?.length || 0,
            currentAddresses: editableAddresses.length,
            currentBanks: editableBankAccounts.length
          });
        } catch (error) {
          console.error('❌ Error reloading data:', error);
        }
      };
      
      reloadData();
    }, [editableAddresses.length, editableBankAccounts.length])
  );

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'decimal',
      minimumFractionDigits: 2,
    }).format(balance);
  };

  const formatBalanceWithSymbol = (balance: number) => {
    return `₹${formatBalance(balance)}`;
  };

  const formatAccountNumber = (accountNumber: string) => {
    // Mask account number for security - show only last 4 digits
    if (!accountNumber) return '';
    if (accountNumber.length <= 4) return accountNumber;
    const visibleDigits = accountNumber.slice(-4);
    const maskedPart = '*'.repeat(Math.max(0, accountNumber.length - 4));
    return maskedPart + visibleDigits;
  };

  const formatIndianNumber = (num: string): string => {
    if (!num) return '';
    
    const cleaned = num.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    
    if (!integerPart) return '';
    
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

  const toggleSection = (section: string) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section as keyof typeof prev],
    }));
  };

  const handleDeleteAddress = (addressId: string) => {
    setAddressToDelete(addressId);
    setShowDeleteAddressModal(true);
  };

  const confirmDeleteAddress = () => {
    if (addressToDelete) {
      // Update local state
      setEditableAddresses((prev: typeof editableAddresses) => prev.filter((addr: typeof editableAddresses[0]) => addr.id !== addressToDelete));
      
      // Update dataStore
      dataStore.deleteAddress(addressToDelete);
      
      setAddressToDelete(null);
      setShowDeleteAddressModal(false);
    }
  };

  const handleDeleteBankAccount = (accountId: string) => {
    setBankAccountToDelete(accountId);
    setShowDeleteBankModal(true);
  };

  const confirmDeleteBankAccount = () => {
    if (bankAccountToDelete) {
      // Update local state
      setEditableBankAccounts((prev: typeof editableBankAccounts) => prev.filter((acc: typeof editableBankAccounts[0]) => acc.id !== bankAccountToDelete));
      
      // Update dataStore
      dataStore.deleteBankAccount(bankAccountToDelete);
      
      setBankAccountToDelete(null);
      setShowDeleteBankModal(false);
    }
  };

  const handleViewBankAccount = (account: any) => {
    setBankAccountToView(account);
    setShowViewBankModal(true);
  };

  const handleCompleteSetup = async () => {
    // Prevent double navigation
    if (isNavigating || isLoading) {
      console.log('⚠️ Navigation already in progress, ignoring duplicate click');
      return;
    }

    setIsLoading(true);
    setIsNavigating(true);

    try {
      // Complete onboarding in backend
      // Get mobile from params or from user's phone metadata
      const { data: { session } } = await supabase.auth.getSession();
      const mobileNumber = (mobile as string) || session?.user?.phone || session?.user?.user_metadata?.phone;
      
      if (!mobileNumber) {
        console.warn('⚠️ Mobile number not available for completing onboarding');
        Alert.alert('Error', 'Mobile number is required to complete setup. Please try again.');
        setIsLoading(false);
        setIsNavigating(false);
        return;
      }
      
      const invoicePatternValue = editableInvoicePattern || `${editableInvoicePrefix}-YYYY-####`;
      
      // ✅ Save signup progress at summary step (before completing)
      try {
        const progressResult = await saveSignupProgress({
          mobile: mobileNumber,
          mobileVerified: true,
          currentStep: 'businessSummary',
        });
        if (progressResult.success) {
          console.log('✅ Signup progress saved: businessSummary');
        } else {
          console.error('❌ Failed to save signup progress:', progressResult.error);
        }
      } catch (error) {
        console.error('Error saving signup progress:', error);
        // Don't fail onboarding if progress save fails
      }

      // Complete onboarding - AWAIT to ensure it completes before navigation
      const onboardingResult = await completeOnboarding({
        initialCashBalance: totalCashBalance,
        invoicePrefix: editableInvoicePrefix,
        invoicePattern: JSON.stringify({ pattern: invoicePatternValue }),
        startingInvoiceNumber: editableStartingNumber || '1',
        fiscalYear: editableFiscalYear as 'JAN-DEC' | 'APR-MAR',
        registeredMobile: mobileNumber,
      });

      if (!onboardingResult.success) {
        console.error('Onboarding failed:', onboardingResult.error);
        Alert.alert('Error', onboardingResult.error || 'Failed to complete onboarding. Please try again.');
        setIsLoading(false);
        setIsNavigating(false);
        return;
      }

      console.log('✅ Onboarding completed successfully. Business ID:', onboardingResult.businessId);
      
      // ✅ Note: complete-onboarding Edge Function now updates signup_progress with business_id
      // and marks it as 'signupComplete', so we don't need to update it here
      console.log('✅ Onboarding complete - signup_progress will be updated by complete-onboarding Edge Function');

      const businessData = {
        personalInfo: {
          name: editableName,
          businessName: editableBusinessName,
          businessType: editableBusinessType,
        },
        verification: {
          type,
          value,
          gstinData: gstinData ? JSON.parse(gstinData as string) : null,
        },
        addresses: editableAddresses,
        bankAccounts: editableBankAccounts,
        initialCashBalance: totalCashBalance,
        totalBalance: grandTotal,
        invoiceConfig: {
          prefix: editableInvoicePrefix,
          pattern: editableInvoicePattern,
          startingNumber: editableStartingNumber,
          fiscalYear: editableFiscalYear,
        },
        setupCompletedAt: new Date().toISOString(),
      };

      console.log('Complete business setup data:', businessData);

      dataStore.setSignupComplete(true);

      // Create user account for login
      const userAccount = dataStore.createUserAccount();
      console.log('✅ User account created for login:', userAccount.mobile);

      // Start the 30-day free trial
      subscriptionStore.startTrial();

      // ✅ Prefetch business data in background (warm up cache for instant dashboard load)
      (async () => {
        try {
          const { prefetchBusinessData } = await import('@/hooks/useBusinessData');
          await prefetchBusinessData();
          console.log('✅ Business data prefetched - dashboard will load instantly');
        } catch (error) {
          console.error('⚠️ Prefetch error (non-blocking):', error);
        }
      })();
      
      // ✅ Delete signup progress after successful completion
      try {
        const deleteResult = await deleteSignupProgress();
        if (deleteResult.success) {
          console.log('✅ Signup progress deleted after successful completion');
        } else {
          console.warn('⚠️ Failed to delete signup progress (non-blocking):', deleteResult.error);
        }
      } catch (error) {
        console.error('⚠️ Error deleting signup progress (non-blocking):', error);
      }
      
      setIsLoading(false);
      setIsNavigating(false);
      
      // ✅ Redirect to dashboard after successful onboarding
      // Prefetch runs in background, navigation happens immediately
      router.replace('/dashboard');
      
      // Show trial notification (non-blocking)
      setShowTrialNotification(true);
    } catch (error: any) {
      console.error('Error completing setup:', error);
      Alert.alert(
        'Setup Failed',
        error.message || 'Failed to complete setup. Please check your connection and try again.'
      );
      setIsLoading(false);
      setIsNavigating(false);
    }
  };

  // Format pattern display with hyphens
  const formatPatternDisplay = (pattern: string) => {
    if (!pattern) return `${editableInvoicePrefix}-####`;
    
    // If pattern already has hyphens, return as-is
    if (pattern.includes('-')) return pattern;
    
    // If pattern doesn't have hyphens, try to add them intelligently
    // This handles patterns like "ETPLMM####" -> "ETPL-MM-####"
    let formatted = pattern;
    
    // Add hyphen after prefix (if it's at the start)
    if (formatted.startsWith(editableInvoicePrefix)) {
      formatted = formatted.replace(editableInvoicePrefix, editableInvoicePrefix + '-');
    }
    
    // Add hyphens before common patterns
    formatted = formatted.replace(/([A-Z]{2,4})([A-Z]{2,4})/g, '$1-$2');
    formatted = formatted.replace(/([A-Z]+)([0-9#]+)/g, '$1-$2');
    formatted = formatted.replace(/([0-9#]+)([A-Z]+)/g, '$1-$2');
    
    return formatted;
  };

  const generateInvoicePreview = () => {
    const currentYear = new Date().getFullYear();
    const currentMonth = (new Date().getMonth() + 1).toString().padStart(2, '0');
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const fullMonthNames = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    const startNumber = editableStartingNumber || '1';
    
    const pattern = editableInvoicePattern || '';
    
    // Handle empty pattern
    if (!pattern) {
      return `${editableInvoicePrefix}-${startNumber.padStart(4, '0')}`;
    }
    
    const parts = pattern.split('-').map(part => {
      // Handle fiscal year format
      if (part === 'YYYY-YY' || part.includes('YYYY') && part.includes('YY')) {
        return `${currentYear}-${(currentYear + 1).toString().slice(-2)}`;
      }
      if (part === 'YYYY') return currentYear.toString();
      if (part === 'YY') return currentYear.toString().slice(-2);
      
      // Handle month formats
      if (part === 'MMMM') return fullMonthNames[new Date().getMonth()];
      if (part === 'MMM') return monthNames[new Date().getMonth()];
      if (part === 'MM') return currentMonth;
      
      // Handle number format
      if (part === '####') return startNumber.padStart(4, '0');
      
      // Return prefix or any other part as-is
      return part;
    });
    
    return parts.join('-');
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

  const SectionHeader = ({ title, section, icon }: { title: string; section: keyof typeof expandedSections; icon: React.ReactNode }) => (
    <TouchableOpacity
      style={styles.sectionHeader}
      onPress={() => toggleSection(section)}
      activeOpacity={0.7}
    >
      <View style={styles.sectionHeaderLeft}>
        {icon}
        <Text style={styles.sectionTitle}>{title}</Text>
      </View>
      {expandedSections[section] ? (
        <ChevronUp size={20} color="#3F66AC" />
      ) : (
        <ChevronDown size={20} color="#3F66AC" />
      )}
    </TouchableOpacity>
  );

  const EditButton = ({ onPress }: { onPress: () => void }) => (
    <TouchableOpacity
      style={styles.editButton}
      onPress={onPress}
      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
    >
      <Edit3 size={16} color="#3F66AC" />
    </TouchableOpacity>
  );

  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          enabled={Platform.OS === 'ios'}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              router.replace({
                pathname: '/auth/final-setup',
                params: {
                  type,
                  value,
                  gstinData,
                  name: editableName,
                  businessName: editableBusinessName,
                  businessType: editableBusinessType,
                  customBusinessType: businessType === 'Others' ? editableBusinessType : '',
                  allAddresses: JSON.stringify(editableAddresses),
                  allBankAccounts: JSON.stringify(editableBankAccounts),
                  // Pass invoice configuration back
                  initialCashBalance: editableCashBalance,
                  invoicePrefix: editableInvoicePrefix,
                  invoicePattern: editableInvoicePattern,
                  startingInvoiceNumber: editableStartingNumber,
                  fiscalYear: editableFiscalYear,
                }
              });
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#3f66ac" />
          </TouchableOpacity>

          <ScrollView 
            style={styles.scrollView} 
            contentContainerStyle={Platform.OS === 'web' ? webContainerStyles.webScrollContent : {}} 
            showsVerticalScrollIndicator={false}
          >
            <Animated.View style={[styles.content, slideTransform]}>
              <View style={styles.iconContainer}>
                <View style={styles.iconWrapper}>
                  <CheckCircle size={48} color="#10b981" strokeWidth={3} />
                </View>
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title}>Business Summary</Text>
                <Text style={styles.subtitle}>
                  Review and edit your business details before completing setup
                </Text>
              </View>

              {/* Business Information */}
              <View style={styles.sectionContainer}>
                <SectionHeader 
                  title="Business Information" 
                  section="business" 
                  icon={<Building2 size={20} color="#3F66AC" />}
                />
                
                {expandedSections.business && (
                  <View style={styles.sectionContent}>
                    {editingSection === 'business' ? (
                      <>
                        <View style={styles.editField}>
                          <Text style={styles.editLabel}>Business Owner Name</Text>
                          <TextInput
                            style={[
                              styles.editInput,
                              Platform.select({
                                web: {
                                  outlineWidth: 0,
                                  outlineColor: 'transparent',
                                  outlineStyle: 'none',
                                },
                              }) as any,
                            ]}
                            value={editableName}
                            onChangeText={setEditableName}
                            placeholder="Enter owner name"
                            autoCapitalize="words"
                          />
                        </View>
                        <View style={styles.editField}>
                          <Text style={styles.editLabel}>Business Type</Text>
                          <TextInput
                            style={[
                              styles.editInput,
                              Platform.select({
                                web: {
                                  outlineWidth: 0,
                                  outlineColor: 'transparent',
                                  outlineStyle: 'none',
                                },
                              }) as any,
                            ]}
                            value={editableBusinessType}
                            onChangeText={setEditableBusinessType}
                            placeholder="Enter business type"
                            autoCapitalize="words"
                          />
                        </View>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={() => setEditingSection(null)}
                        >
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <View style={styles.summaryRow}>
                          <View style={styles.summaryItemContent}>
                            <User size={16} color="#64748b" />
                            <View style={styles.summaryTextContainer}>
                              <Text style={styles.summaryLabel}>Business Owner</Text>
                              <Text style={styles.summaryValue}>{editableName}</Text>
                            </View>
                          </View>
                          <EditButton onPress={() => setEditingSection('business')} />
                        </View>

                        <View style={styles.summaryRow}>
                          <View style={styles.summaryItemContent}>
                            <Building2 size={16} color="#64748b" />
                            <View style={styles.summaryTextContainer}>
                              <Text style={styles.summaryLabel}>Business Name</Text>
                              <Text style={styles.summaryValue}>{editableBusinessName}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.summaryRow}>
                          <View style={styles.summaryItemContent}>
                            <Building2 size={16} color="#64748b" />
                            <View style={styles.summaryTextContainer}>
                              <Text style={styles.summaryLabel}>Business Type</Text>
                              <Text style={styles.summaryValue}>{editableBusinessType}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={[styles.summaryRow, styles.noBorder]}>
                          <View style={styles.summaryItemContent}>
                            <CreditCard size={16} color="#64748b" />
                            <View style={styles.summaryTextContainer}>
                              <Text style={styles.summaryLabel}>{type} Number</Text>
                              <Text style={styles.summaryValue}>{value}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.infoBox}>
                          <Text style={styles.infoText}>
                            ℹ️ Business Name and Tax ID cannot be edited as they are linked to your verified {type} registration.
                          </Text>
                        </View>
                      </>
                    )}
                  </View>
                )}
              </View>

              {/* Location Summary */}
              <View style={styles.sectionContainer}>
                <SectionHeader 
                  title="Location Summary" 
                  section="locations" 
                  icon={<MapPin size={20} color="#3F66AC" />}
                />
                
                {expandedSections.locations && (
                  <View style={styles.sectionContent}>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItemContent}>
                        <MapPin size={16} color="#64748b" />
                        <View style={styles.summaryTextContainerInline}>
                          <Text style={styles.summaryLabel}>Total Addresses</Text>
                          <Text style={styles.summaryValueInline}>{editableAddresses.length}</Text>
                        </View>
                      </View>
                    </View>

                    {editableAddresses
                      .sort((a: any, b: any) => {
                        // Sort: Primary (0), Branch (1), Warehouse (2)
                        const typeOrder = { primary: 0, branch: 1, warehouse: 2 };
                        return typeOrder[a.type as keyof typeof typeOrder] - typeOrder[b.type as keyof typeof typeOrder];
                      })
                      .map((address: any, index: number) => (
                      <View key={address.id} style={styles.addressCard}>
                        <View style={styles.addressHeader}>
                          <View style={styles.addressTypeContainer}>
                            {address.type === 'primary' ? (
                              <>
                                <Home size={16} color="#3f66ac" />
                                <Text style={styles.addressType}>Primary Address</Text>
                              </>
                            ) : address.type === 'branch' ? (
                              <>
                                <Building2 size={16} color="#10b981" />
                                <Text style={styles.addressType}>Branch</Text>
                              </>
                            ) : (
                              <>
                                <Warehouse size={16} color="#f59e0b" />
                                <Text style={styles.addressType}>Warehouse</Text>
                              </>
                            )}
                          </View>
                          <View style={styles.addressActions}>
                            <EditButton onPress={() => {
                              // Navigate to edit-address-simple with the actual address data
                              router.push({
                                pathname: '/edit-address-simple',
                                params: { 
                                  editAddressId: address.id,
                                  addressType: address.type,
                                  type: type,
                                  value: value,
                                  name: editableName,
                                  businessName: editableBusinessName,
                                  businessType: editableBusinessType,
                                  existingAddresses: JSON.stringify(editableAddresses),
                                  fromSummary: 'true',
                                }
                              });
                            }} />
                            {!address.isPrimary && (
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeleteAddress(address.id)}
                                activeOpacity={0.7}
                              >
                                <Trash2 size={16} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        <Text style={styles.addressName}>{address.name}</Text>
                        <Text style={styles.addressText}>
                          {[address.doorNumber, address.addressLine1, address.addressLine2, address.city, address.stateName, address.pincode].filter(Boolean).join(', ')}
                        </Text>
                        {/* Contact Person Details for All Address Types (Primary, Branch, Warehouse) */}
                        {(address.manager || address.phone || (address.isPrimary && (name || mobile))) && (
                          <View style={styles.addressContactInfo}>
                            {(address.manager || (address.isPrimary && name)) && (
                              <View style={styles.contactRow}>
                                <User size={12} color="#64748b" />
                                <Text style={styles.contactText}>{address.manager || name}</Text>
                              </View>
                            )}
                            {(address.phone || (address.isPrimary && mobile)) && (
                              <View style={styles.contactRow}>
                                <Phone size={12} color="#64748b" />
                                <Text style={styles.contactText}>{address.phone || mobile}</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    ))}

                    {/* Add Address Buttons - Stacked on mobile, inline on web */}
                    <View style={styles.addAddressButtonsContainer}>
                      <TouchableOpacity
                        style={[styles.addAddressButton, styles.addBranchButton]}
                        onPress={() => {
                          // Navigate to business address screen with branch type
                          router.push({
                            pathname: '/auth/business-address',
                            params: {
                              type,
                              value,
                              gstinData,
                              name: editableName,
                              businessName: editableBusinessName,
                              businessType: editableBusinessType,
                              customBusinessType: businessType === 'Others' ? editableBusinessType : '',
                              mobile: '', // Not needed for branch/warehouse, but prevent error
                              addressType: 'branch',
                              existingAddresses: JSON.stringify(editableAddresses),
                              fromSummary: 'true',
                              allBankAccounts: JSON.stringify(editableBankAccounts),
                              initialCashBalance: editableCashBalance,
                              invoicePrefix: editableInvoicePrefix,
                              invoicePattern: editableInvoicePattern,
                              startingInvoiceNumber: editableStartingNumber,
                              fiscalYear: editableFiscalYear,
                            }
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <Building2 size={20} color="#10b981" />
                        <Text style={[styles.addAddressButtonText, { color: '#10b981' }]}>Add Branch</Text>
                      </TouchableOpacity>

                      <TouchableOpacity
                        style={[styles.addAddressButton, styles.addWarehouseButton]}
                        onPress={() => {
                          // Navigate to business address screen with warehouse type
                          router.push({
                            pathname: '/auth/business-address',
                            params: {
                              type,
                              value,
                              gstinData,
                              name: editableName,
                              businessName: editableBusinessName,
                              businessType: editableBusinessType,
                              customBusinessType: businessType === 'Others' ? editableBusinessType : '',
                              mobile: '', // Not needed for branch/warehouse, but prevent error
                              addressType: 'warehouse',
                              existingAddresses: JSON.stringify(editableAddresses),
                              fromSummary: 'true',
                              allBankAccounts: JSON.stringify(editableBankAccounts),
                              initialCashBalance: editableCashBalance,
                              invoicePrefix: editableInvoicePrefix,
                              invoicePattern: editableInvoicePattern,
                              startingInvoiceNumber: editableStartingNumber,
                              fiscalYear: editableFiscalYear,
                            }
                          });
                        }}
                        activeOpacity={0.7}
                      >
                        <Warehouse size={20} color="#f59e0b" />
                        <Text style={[styles.addAddressButtonText, { color: '#f59e0b' }]}>Add Warehouse</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                )}
              </View>

              {/* Financial Summary */}
              <View style={styles.sectionContainer}>
                <SectionHeader 
                  title="Financial Summary" 
                  section="financial" 
                  icon={<IndianRupee size={20} color="#3F66AC" />}
                />
                
                {expandedSections.financial && (
                  <View style={styles.sectionContent}>
                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItemContent}>
                        <CreditCard size={16} color="#64748b" />
                        <View style={styles.summaryTextContainerInline}>
                          <Text style={styles.summaryLabel}>Bank Accounts</Text>
                          <Text style={styles.summaryValueInline}>{editableBankAccounts.length}</Text>
                        </View>
                      </View>
                    </View>

                    {editableBankAccounts.map((account: any, index: number) => (
                      <View key={account.id} style={styles.bankCard}>
                        <View style={styles.bankHeader}>
                          <View style={styles.bankHeaderLeft}>
                            <CreditCard size={16} color="#3F66AC" />
                            <Text style={styles.bankName}>{account.bankName}</Text>
                            {account.isPrimary && (
                              <View style={styles.primaryBadge}>
                                <Text style={styles.primaryBadgeText}>Primary</Text>
                              </View>
                            )}
                          </View>
                          <View style={styles.bankActions}>
                            <TouchableOpacity
                              style={styles.viewButton}
                              onPress={() => handleViewBankAccount(account)}
                              activeOpacity={0.7}
                            >
                              <Eye size={16} color="#3f66ac" />
                            </TouchableOpacity>
                            <EditButton onPress={() => {
                              router.push({
                                pathname: '/auth/banking-details',
                                params: {
                                  fromSummary: 'true',
                                  editMode: 'true',
                                  editAccountId: account.id,
                                  type,
                                  value,
                                  gstinData,
                                  name: editableName,
                                  businessName: editableBusinessName,
                                  businessType: editableBusinessType,
                                  customBusinessType: businessType === 'Others' ? editableBusinessType : '',
                                  allAddresses: JSON.stringify(editableAddresses),
                                  allBankAccounts: JSON.stringify(editableBankAccounts),
                                  prefilledBankId: account.bankId,
                                  prefilledAccountHolderName: account.accountHolderName,
                                  prefilledAccountNumber: account.accountNumber,
                                  prefilledIFSC: account.ifscCode,
                                  prefilledAccountType: account.accountType,
                                  prefilledInitialBalance: account.initialBalance.toString(),
                                  prefilledUpiId: account.upiId || '',
                                  prefilledIsPrimary: account.isPrimary.toString(),
                                  currentCashBalance: editableCashBalance,
                                  currentInvoicePrefix: editableInvoicePrefix,
                                  currentInvoicePattern: editableInvoicePattern,
                                  currentStartingNumber: editableStartingNumber,
                                  currentFiscalYear: editableFiscalYear,
                                }
                              });
                            }} />
                            {!account.isPrimary && (
                              <TouchableOpacity
                                style={styles.deleteButton}
                                onPress={() => handleDeleteBankAccount(account.id)}
                                activeOpacity={0.7}
                              >
                                <Trash2 size={16} color="#ef4444" />
                              </TouchableOpacity>
                            )}
                          </View>
                        </View>
                        <View style={styles.bankDetails}>
                          <Text style={styles.bankDetail}>Account Holder: {account.accountHolderName}</Text>
                          <Text style={styles.bankDetail}>
                            A/C Number: <Text style={styles.accountNumberMasked}>{formatAccountNumber(account.accountNumber)}</Text>
                          </Text>
                          <Text style={styles.bankDetail}>IFSC: {account.ifscCode}</Text>
                          <Text style={[styles.bankDetail, styles.bankBalance]}>
                            Balance: {formatBalanceWithSymbol(parseFloat(account.initialBalance) || 0)}
                          </Text>
                        </View>
                      </View>
                    ))}

                    {/* Add Bank Account Button - Matching Add Branch/Add Warehouse style */}
                    <TouchableOpacity
                      style={[styles.addAddressButton, styles.addBankAccountButton]}
                      onPress={() => {
                        // Navigate to banking-details with fromSummary and isAddingSecondary flags
                        router.push({
                          pathname: '/auth/banking-details',
                          params: {
                            fromSummary: 'true',
                            isAddingSecondary: 'true', // ✅ Important: Adding additional bank, not primary
                            type,
                            value,
                            gstinData,
                            name: editableName,
                            businessName: editableBusinessName,
                            businessType: editableBusinessType,
                            customBusinessType: businessType === 'Others' ? editableBusinessType : '',
                            allAddresses: JSON.stringify(editableAddresses),
                            allBankAccounts: JSON.stringify(editableBankAccounts),
                            currentCashBalance: editableCashBalance,
                            currentInvoicePrefix: editableInvoicePrefix,
                            currentInvoicePattern: editableInvoicePattern,
                            currentStartingNumber: editableStartingNumber,
                            currentFiscalYear: editableFiscalYear,
                          }
                        });
                      }}
                      activeOpacity={0.7}
                    >
                      <CreditCard size={20} color="#3f66ac" />
                      <Text style={[styles.addAddressButtonText, { color: '#3f66ac' }]}>Add Bank Account</Text>
                    </TouchableOpacity>

                    <View style={styles.summaryRow}>
                      <View style={styles.summaryItemContent}>
                        <CreditCard size={16} color="#64748b" />
                        <View style={styles.summaryTextContainer}>
                          <Text style={styles.summaryLabel}>Total Bank Balance</Text>
                          <Text style={[styles.summaryValue, styles.balanceValue]}>
                            {formatBalanceWithSymbol(totalBankBalance)}
                          </Text>
                        </View>
                      </View>
                    </View>

                    {/* Cash Balance Section */}
                    {editingSection === 'cash' ? (
                      <View style={styles.cashEditCard}>
                        <View style={styles.cashEditHeader}>
                          <Banknote size={20} color="#3F66AC" />
                          <Text style={styles.cashEditTitle}>Edit Initial Cash Balance</Text>
                        </View>
                        <View style={styles.cashInputWrapper}>
                          <View style={styles.cashInputContainer}>
                            <Text style={styles.currencySymbol}>₹</Text>
                            <TextInput
                              style={[
                                styles.cashInput,
                                Platform.select({
                                  web: {
                                    outlineWidth: 0,
                                    outlineColor: 'transparent',
                                    outlineStyle: 'none',
                                  },
                                }) as any,
                              ]}
                              value={formatIndianNumber(editableCashBalance)}
                              onChangeText={(text) => {
                                const cleaned = text.replace(/[^0-9.]/g, '');
                                setEditableCashBalance(cleaned);
                              }}
                              placeholder="0.00"
                              placeholderTextColor="#94a3b8"
                              keyboardType="decimal-pad"
                            />
                          </View>
                          <Text style={styles.cashHint}>
                            Enter the cash amount you currently have for business operations
                          </Text>
                        </View>
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={() => setEditingSection(null)}
                        >
                          <Text style={styles.saveButtonText}>Save Changes</Text>
                        </TouchableOpacity>
                      </View>
                    ) : (
                      <View style={styles.summaryRow}>
                        <View style={styles.summaryItemContent}>
                          <Banknote size={16} color="#64748b" />
                          <View style={styles.summaryTextContainer}>
                            <Text style={styles.summaryLabel}>Initial Cash Balance</Text>
                            <Text style={[styles.summaryValue, styles.balanceValue]}>
                              {formatBalanceWithSymbol(totalCashBalance)}
                            </Text>
                          </View>
                        </View>
                        <EditButton onPress={() => setEditingSection('cash')} />
                      </View>
                    )}

                    <View style={[styles.summaryRow, styles.totalRow, styles.noBorder]}>
                      <View style={styles.summaryItemContent}>
                        <IndianRupee size={18} color="#10b981" />
                        <View style={styles.summaryTextContainer}>
                          <Text style={[styles.summaryLabel, styles.totalLabel]}>Total Business Capital</Text>
                          <Text style={[styles.summaryValue, styles.totalValue]}>
                            {formatBalanceWithSymbol(grandTotal)}
                          </Text>
                        </View>
                      </View>
                    </View>
                  </View>
                )}
              </View>

              {/* Invoice Configuration */}
              <View style={styles.sectionContainer}>
                <SectionHeader 
                  title="Invoice Configuration" 
                  section="invoice" 
                  icon={<FileText size={20} color="#3F66AC" />}
                />
                
                {expandedSections.invoice && (
                  <View style={styles.sectionContent}>
                    {editingSection === 'invoice' ? (
                      <>
                        <InvoicePatternConfig
                          onPatternChange={setEditableInvoicePattern}
                          onPrefixChange={setEditableInvoicePrefix}
                          onStartingNumberChange={setEditableStartingNumber}
                          initialPrefix={editableInvoicePrefix}
                          initialStartingNumber={editableStartingNumber}
                          initialPattern={editableInvoicePattern}
                        />
                        <TouchableOpacity
                          style={styles.saveButton}
                          onPress={() => setEditingSection(null)}
                        >
                          <Text style={styles.saveButtonText}>Save Configuration</Text>
                        </TouchableOpacity>
                      </>
                    ) : (
                      <>
                        <View style={styles.summaryRow}>
                          <View style={styles.summaryItemContent}>
                            <Type size={16} color="#64748b" />
                            <View style={styles.summaryTextContainer}>
                              <Text style={styles.summaryLabel}>Invoice Prefix</Text>
                              <Text style={styles.summaryValue}>{editableInvoicePrefix}</Text>
                            </View>
                          </View>
                          <EditButton onPress={() => setEditingSection('invoice')} />
                        </View>

                        <View style={styles.summaryRow}>
                          <View style={styles.summaryItemContent}>
                            <FileText size={16} color="#64748b" />
                            <View style={styles.summaryTextContainer}>
                              <Text style={styles.summaryLabel}>Invoice Pattern</Text>
                              <Text style={styles.summaryValue}>
                                {formatPatternDisplay(editableInvoicePattern)}
                              </Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.summaryRow}>
                          <View style={styles.summaryItemContent}>
                            <Hash size={16} color="#64748b" />
                            <View style={styles.summaryTextContainer}>
                              <Text style={styles.summaryLabel}>Starting Number</Text>
                              <Text style={styles.summaryValue}>{editableStartingNumber}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={styles.summaryRow}>
                          <View style={styles.summaryItemContent}>
                            <Calendar size={16} color="#64748b" />
                            <View style={styles.summaryTextContainer}>
                              <Text style={styles.summaryLabel}>Fiscal Year</Text>
                              <Text style={styles.summaryValue}>{editableFiscalYear}</Text>
                            </View>
                          </View>
                        </View>

                        <View style={[styles.summaryRow, styles.noBorder]}>
                          <View style={styles.summaryItemContent}>
                            <FileText size={16} color="#64748b" />
                            <View style={styles.summaryTextContainer}>
                              <Text style={styles.summaryLabel}>Sample Invoice Number</Text>
                              <Text style={styles.summaryValue}>{generateInvoicePreview()}</Text>
                            </View>
                          </View>
                        </View>
                      </>
                    )}
                  </View>
                )}
              </View>

              <TouchableOpacity
                style={styles.completeButton}
                onPress={handleCompleteSetup}
                disabled={isLoading || isNavigating}
                activeOpacity={0.8}
              >
                <Text style={styles.completeButtonText}>
                  {isLoading || isNavigating ? 'Setting up your business...' : 'Complete Setup & Start Using'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>

      {/* Trial Notification Modal */}
      <TrialNotification
        visible={showTrialNotification}
        onClose={() => {
          setShowTrialNotification(false);
          // ✅ Prefetch business data before navigation (if not already cached)
          (async () => {
            try {
              const { prefetchBusinessData } = await import('@/hooks/useBusinessData');
              await prefetchBusinessData();
            } catch (error) {
              console.error('⚠️ Prefetch error (non-blocking):', error);
            }
          })();
          router.push('/dashboard');
        }}
        onUpgrade={() => {
          setShowTrialNotification(false);
          router.push('/subscription');
        }}
        trialEndDate={subscriptionStore.getSubscription().trialEndDate!}
      />

      {/* Delete Address Confirmation Modal */}
      <Modal
        visible={showDeleteAddressModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteAddressModal(false)}
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
                onPress={() => setShowDeleteAddressModal(false)}
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

      {/* Delete Bank Account Confirmation Modal */}
      <Modal
        visible={showDeleteBankModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteBankModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Delete Bank Account</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete this bank account? This action cannot be undone.
            </Text>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setShowDeleteBankModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirm}
                onPress={confirmDeleteBankAccount}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* View Bank Account Modal */}
      <Modal
        visible={showViewBankModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowViewBankModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.viewModal}>
            <View style={styles.viewModalHeader}>
              <Text style={styles.viewModalTitle}>Bank Account Details</Text>
              <TouchableOpacity
                style={styles.viewModalClose}
                onPress={() => setShowViewBankModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.viewModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            
            {bankAccountToView && (
              <ScrollView style={styles.viewModalContent} showsVerticalScrollIndicator={false}>
                <View style={styles.viewModalRow}>
                  <Text style={styles.viewModalLabel}>Bank Name:</Text>
                  <Text style={styles.viewModalValue}>{bankAccountToView.bankName}</Text>
                </View>
                <View style={styles.viewModalRow}>
                  <Text style={styles.viewModalLabel}>Account Holder:</Text>
                  <Text style={styles.viewModalValue}>{bankAccountToView.accountHolderName}</Text>
                </View>
                <View style={styles.viewModalRow}>
                  <Text style={styles.viewModalLabel}>Account Number:</Text>
                  <Text style={styles.viewModalValue}>{bankAccountToView.accountNumber}</Text>
                </View>
                <View style={styles.viewModalRow}>
                  <Text style={styles.viewModalLabel}>IFSC Code:</Text>
                  <Text style={styles.viewModalValue}>{bankAccountToView.ifscCode}</Text>
                </View>
                <View style={styles.viewModalRow}>
                  <Text style={styles.viewModalLabel}>Account Type:</Text>
                  <Text style={styles.viewModalValue}>{bankAccountToView.accountType}</Text>
                </View>
                <View style={styles.viewModalRow}>
                  <Text style={styles.viewModalLabel}>UPI ID:</Text>
                  <Text style={styles.viewModalValue}>{bankAccountToView.upiId || 'N/A'}</Text>
                </View>
                <View style={styles.viewModalRow}>
                  <Text style={styles.viewModalLabel}>Initial Balance:</Text>
                  <Text style={styles.viewModalValue}>
                    {formatBalanceWithSymbol(parseFloat(bankAccountToView.initialBalance) || 0)}
                  </Text>
                </View>
                <View style={styles.viewModalRow}>
                  <Text style={styles.viewModalLabel}>Status:</Text>
                  <Text style={styles.viewModalValue}>
                    {bankAccountToView.isPrimary ? 'Primary Account' : 'Secondary Account'}
                  </Text>
                </View>
              </ScrollView>
            )}
          </View>
        </View>
      </Modal>
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
    top: 60,
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
      web: 24,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    paddingTop: Platform.select({
      web: 40,
      default: 32, // Reduced for more native feel on mobile
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
    marginBottom: 32,
  },
  iconWrapper: {
    width: 90,
    height: 90,
    backgroundColor: '#dcfce7',
    borderRadius: 45,
    borderWidth: 5,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  title: {
    fontSize: 26,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    paddingHorizontal: 16,
  },
  sectionContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: Platform.select({
      web: 12,
      default: 10, // Smaller radius for more native feel
    }),
    marginBottom: Platform.select({
      web: 16,
      default: 12, // Reduced spacing on mobile
    }),
    borderWidth: Platform.select({
      web: 1,
      default: 1,
    }),
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Platform.select({
      web: 16,
      default: 12, // Reduced padding for more compact feel
    }),
    backgroundColor: '#ffffff',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: Platform.select({
      web: 16,
      default: 14, // Reduced for more native feel
    }),
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sectionContent: {
    padding: Platform.select({
      web: 16,
      default: 12, // Reduced padding for more compact feel
    }),
    paddingTop: Platform.select({
      web: 8,
      default: 6, // Reduced top padding on mobile
    }),
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Platform.select({
      web: 12,
      default: 8, // Reduced padding for more compact feel
    }),
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  summaryItemContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  summaryTextContainer: {
    flex: 1,
  },
  summaryTextContainerInline: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: Platform.select({
      web: 12,
      default: 13, // Increased for better readability on mobile
    }),
    color: '#64748b',
    marginBottom: Platform.select({
      web: 2,
      default: 2,
    }),
  },
  summaryValue: {
    fontSize: Platform.select({
      web: 14,
      default: 14, // Increased for better readability on mobile
    }),
    fontWeight: '600',
    color: '#1a1a1a',
  },
  summaryValueInline: {
    fontSize: Platform.select({
      web: 14,
      default: 14, // Increased for better readability on mobile
    }),
    fontWeight: '600',
    color: '#1a1a1a',
    marginLeft: 8,
  },
  balanceValue: {
    color: '#10b981',
    fontWeight: '700',
  },
  noBorder: {
    borderBottomWidth: 0,
  },
  totalRow: {
    borderTopWidth: 2,
    borderTopColor: '#10b981',
    borderBottomWidth: 0,
    paddingTop: 16,
    marginTop: 8,
    backgroundColor: '#f0fdf4',
    marginHorizontal: -16,
    paddingHorizontal: 16,
    marginBottom: -16,
    paddingBottom: 16,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  totalLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: '#10b981',
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '800',
    color: '#10b981',
  },
  editButton: {
    width: Platform.select({
      web: 36,
      default: 28, // Smaller on mobile
    }),
    height: Platform.select({
      web: 36,
      default: 28, // Smaller on mobile
    }),
    borderRadius: Platform.select({
      web: 18,
      default: 6, // Smaller radius on mobile
    }),
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  editField: {
    marginBottom: 16,
  },
  editLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  editInput: {
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 10,
    padding: 12,
    fontSize: 14,
    color: '#1a1a1a',
  },
  cashEditCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#3F66AC',
    shadowColor: '#3F66AC',
    shadowOffset: { width: 0, height: 2 },
    shadowRadius: 8,
    shadowOpacity: 0.1,
    elevation: 3,
  },
  cashEditHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 16,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
  },
  cashEditTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cashInputWrapper: {
    marginBottom: 16,
  },
  cashInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingLeft: 16,
    paddingRight: 16,
    paddingVertical: 4,
  },
  currencySymbol: {
    fontSize: 20,
    fontWeight: '700',
    color: '#3F66AC',
    marginRight: 8,
  },
  cashInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    paddingVertical: 12,
  },
  cashHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 8,
    fontStyle: 'italic',
  },
  primaryBadge: {
    backgroundColor: '#dcfce7',
    borderRadius: Platform.select({
      web: 6,
      default: 5, // Smaller radius for more native feel
    }),
    paddingHorizontal: Platform.select({
      web: 8,
      default: 6, // Reduced padding on mobile
    }),
    paddingVertical: Platform.select({
      web: 3,
      default: 2, // Reduced padding on mobile
    }),
    marginLeft: Platform.select({
      web: 8,
      default: 6, // Reduced spacing on mobile
    }),
  },
  primaryBadgeText: {
    fontSize: Platform.select({
      web: 10,
      default: 9, // Reduced for truncated text on mobile
    }),
    fontWeight: '700',
    color: '#10b981',
    textTransform: 'uppercase',
  },
  addButton: {
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3F66AC',
    borderStyle: 'dashed',
    borderRadius: 12,
    padding: 16,
    marginVertical: 12,
  },
  addButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  addIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#3F66AC',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addIconText: {
    fontSize: 24,
    fontWeight: '300',
    color: '#ffffff',
  },
  addButtonText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#3F66AC',
  },
  addAddressButtonsContainer: {
    flexDirection: Platform.select({
      web: 'row',
      default: 'column', // Stacked on mobile for cleaner look
    }),
    gap: Platform.select({
      web: 12,
      default: 10, // Reduced gap on mobile
    }),
    marginVertical: Platform.select({
      web: 12,
      default: 10, // Reduced margin on mobile
    }),
  },
  addAddressButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.select({
      web: 14,
      default: 12, // Reduced for more native feel
    }),
    paddingHorizontal: Platform.select({
      web: 16,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    borderRadius: Platform.select({
      web: 12,
      default: 10, // Smaller radius for more native feel
    }),
    borderWidth: Platform.select({
      web: 2,
      default: 1.5, // Thinner border for more native feel
    }),
    gap: Platform.select({
      web: 8,
      default: 6, // Reduced gap on mobile
    }),
  },
  addBranchButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  addWarehouseButton: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  addBankAccountButton: {
    backgroundColor: '#f0f4ff',
    borderColor: '#3f66ac',
  },
  addAddressButtonText: {
    fontSize: Platform.select({
      web: 14,
      default: 13, // Reduced for more native feel
    }),
    fontWeight: '600',
  },
  saveButton: {
    backgroundColor: '#10b981',
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 8,
  },
  saveButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  addressCard: {
    backgroundColor: '#ffffff',
    borderRadius: Platform.select({
      web: 10,
      default: 8, // Smaller radius for more native feel
    }),
    padding: Platform.select({
      web: 12,
      default: 10, // Reduced padding for more compact feel
    }),
    marginBottom: Platform.select({
      web: 12,
      default: 10, // Reduced spacing on mobile
    }),
    borderWidth: Platform.select({
      web: 1,
      default: 1,
    }),
    borderColor: '#e2e8f0',
  },
  addressHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  addressTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addressActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Platform.select({
      web: 8,
      default: 6, // Reduced gap on mobile
    }),
    ...Platform.select({
      default: {
        // Ensure actions stay within card
        flexShrink: 0,
        marginLeft: 'auto',
      },
    }),
  },
  viewButton: {
    width: Platform.select({
      web: 32,
      default: 28, // Smaller on mobile
    }),
    height: Platform.select({
      web: 32,
      default: 28, // Smaller on mobile
    }),
    borderRadius: Platform.select({
      web: 8,
      default: 6, // Smaller radius on mobile
    }),
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  deleteButton: {
    width: Platform.select({
      web: 32,
      default: 28, // Smaller on mobile
    }),
    height: Platform.select({
      web: 32,
      default: 28, // Smaller on mobile
    }),
    borderRadius: Platform.select({
      web: 8,
      default: 6, // Smaller radius on mobile
    }),
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressType: {
    fontSize: Platform.select({
      web: 12,
      default: 11, // Reduced for truncated text on mobile
    }),
    fontWeight: '700',
    color: '#1a1a1a',
    textTransform: 'uppercase',
  },
  addressName: {
    fontSize: Platform.select({
      web: 14,
      default: 13, // Reduced for truncated text on mobile
    }),
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: Platform.select({
      web: 4,
      default: 3, // Reduced spacing on mobile
    }),
  },
  addressText: {
    fontSize: Platform.select({
      web: 13,
      default: 11, // Reduced for truncated text on mobile
    }),
    color: '#64748b',
    lineHeight: Platform.select({
      web: 18,
      default: 15, // Reduced line height for compact text
    }),
  },
  addressContactInfo: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    flexDirection: 'row',
    gap: 16,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  contactText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  bankCard: {
    backgroundColor: '#ffffff',
    borderRadius: Platform.select({
      web: 10,
      default: 8, // Smaller radius for more native feel
    }),
    padding: Platform.select({
      web: 12,
      default: 10, // Reduced padding for more compact feel
    }),
    marginBottom: Platform.select({
      web: 12,
      default: 10, // Reduced spacing on mobile
    }),
    borderWidth: Platform.select({
      web: 1,
      default: 1,
    }),
    borderColor: '#e2e8f0',
    overflow: 'hidden', // Ensure icons stay within card
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Platform.select({
      web: 8,
      default: 6, // Reduced spacing on mobile
    }),
    ...Platform.select({
      default: {
        // Ensure header doesn't overflow on mobile
        flexWrap: 'wrap',
      },
    }),
  },
  bankHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankName: {
    fontSize: Platform.select({
      web: 14,
      default: 12, // Reduced for truncated text on mobile
    }),
    fontWeight: '700',
    color: '#1a1a1a',
  },
  bankDetails: {
    gap: Platform.select({
      web: 4,
      default: 3, // Reduced spacing on mobile
    }),
  },
  bankDetail: {
    fontSize: Platform.select({
      web: 12,
      default: 11, // Reduced for truncated text on mobile
    }),
    color: '#64748b',
  },
  accountNumberMasked: {
    fontFamily: 'monospace',
    fontSize: Platform.select({
      web: 12,
      default: 11, // Reduced for truncated text on mobile
    }),
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: Platform.select({
      web: 0.5,
      default: 0.3, // Reduced letter spacing on mobile
    }),
  },
  bankBalance: {
    fontSize: Platform.select({
      web: 13,
      default: 12, // Reduced for truncated text on mobile
    }),
    fontWeight: '600',
    color: '#10b981',
    marginTop: Platform.select({
      web: 4,
      default: 3, // Reduced spacing on mobile
    }),
  },
  previewContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 8,
    padding: 12,
    marginTop: 8,
  },
  previewLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 4,
  },
  previewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
    fontFamily: 'monospace',
    letterSpacing: 1,
  },
  completeButton: {
    backgroundColor: '#10b981',
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 24,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#ffffff',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 8,
    padding: 12,
    marginTop: 12,
    borderWidth: 1,
    borderColor: '#bfdbfe',
  },
  infoText: {
    fontSize: 12,
    color: '#1e40af',
    lineHeight: 18,
  },
  // Modal styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: '#64748b',
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
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  deleteModalConfirm: {
    flex: 1,
    backgroundColor: '#ef4444',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  viewModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  viewModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  viewModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  viewModalClose: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
  },
  viewModalCloseText: {
    fontSize: 18,
    color: '#64748b',
    fontWeight: '600',
  },
  viewModalContent: {
    maxHeight: 400,
  },
  viewModalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  viewModalLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#64748b',
    flex: 1,
  },
  viewModalValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },
});
