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
} from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
import { dataStore } from '@/utils/dataStore';
import { subscriptionStore } from '@/utils/subscriptionStore';
import InvoicePatternConfig from '@/components/InvoicePatternConfig';
import TrialNotification from '@/components/TrialNotification';

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
  const [showTrialNotification, setShowTrialNotification] = useState(false);
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
      useNativeDriver: true,
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

  const handleCompleteSetup = async () => {
    setIsLoading(true);

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

    setTimeout(() => {
      setIsLoading(false);
      setShowTrialNotification(true);
    }, 1000);
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
    opacity: slideAnimation,
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

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
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

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
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
                            style={styles.editInput}
                            value={editableName}
                            onChangeText={setEditableName}
                            placeholder="Enter owner name"
                          />
                        </View>
                        <View style={styles.editField}>
                          <Text style={styles.editLabel}>Business Type</Text>
                          <TextInput
                            style={styles.editInput}
                            value={editableBusinessType}
                            onChangeText={setEditableBusinessType}
                            placeholder="Enter business type"
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
                        </View>
                        <Text style={styles.addressName}>{address.name}</Text>
                        <Text style={styles.addressText}>
                          {[address.doorNumber, address.addressLine1, address.addressLine2, address.city, address.stateName, address.pincode].filter(Boolean).join(', ')}
                        </Text>
                        {/* Contact Person Details for Branch/Warehouse */}
                        {(address.type === 'branch' || address.type === 'warehouse') && (address.manager || address.phone) && (
                          <View style={styles.addressContactInfo}>
                            {address.manager && (
                              <View style={styles.contactRow}>
                                <User size={12} color="#64748b" />
                                <Text style={styles.contactText}>{address.manager}</Text>
                              </View>
                            )}
                            {address.phone && (
                              <View style={styles.contactRow}>
                                <Phone size={12} color="#64748b" />
                                <Text style={styles.contactText}>{address.phone}</Text>
                              </View>
                            )}
                          </View>
                        )}
                      </View>
                    ))}

                    {/* Add Address Buttons - Inline */}
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
                          <EditButton onPress={() => {
                            router.push({
                              pathname: '/bank-details',
                              params: { 
                                bankAccountId: account.id,
                              }
                            });
                          }} />
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

                    {/* Add Bank Account Button */}
                    <TouchableOpacity
                      style={styles.addButton}
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
                    >
                      <View style={styles.addButtonContent}>
                        <View style={styles.addIcon}>
                          <Text style={styles.addIconText}>+</Text>
                        </View>
                        <Text style={styles.addButtonText}>Add Bank Account</Text>
                      </View>
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
                              style={styles.cashInput}
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
                disabled={isLoading}
                activeOpacity={0.8}
              >
                <Text style={styles.completeButtonText}>
                  {isLoading ? 'Setting up your business...' : 'Complete Setup & Start Using'}
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
          router.push('/dashboard');
        }}
        onUpgrade={() => {
          setShowTrialNotification(false);
          router.push('/subscription');
        }}
        trialEndDate={subscriptionStore.getSubscription().trialEndDate!}
      />
    </View>
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
    paddingHorizontal: 24,
    paddingTop: 40,
    paddingBottom: 40,
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
    borderRadius: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    overflow: 'hidden',
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: 16,
    backgroundColor: '#ffffff',
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  sectionContent: {
    padding: 16,
    paddingTop: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
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
    fontSize: 12,
    color: '#64748b',
    marginBottom: 2,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  summaryValueInline: {
    fontSize: 14,
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
    width: 36,
    height: 36,
    borderRadius: 18,
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
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 3,
    marginLeft: 8,
  },
  primaryBadgeText: {
    fontSize: 10,
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
    flexDirection: 'row',
    gap: 12,
    marginVertical: 12,
  },
  addAddressButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 2,
    gap: 8,
  },
  addBranchButton: {
    backgroundColor: '#f0fdf4',
    borderColor: '#10b981',
  },
  addWarehouseButton: {
    backgroundColor: '#fffbeb',
    borderColor: '#f59e0b',
  },
  addAddressButtonText: {
    fontSize: 14,
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
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
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
  addressType: {
    fontSize: 12,
    fontWeight: '700',
    color: '#1a1a1a',
    textTransform: 'uppercase',
  },
  addressName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  addressText: {
    fontSize: 13,
    color: '#64748b',
    lineHeight: 18,
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
    borderRadius: 10,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  bankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  bankHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  bankName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  bankDetails: {
    gap: 4,
  },
  bankDetail: {
    fontSize: 12,
    color: '#64748b',
  },
  accountNumberMasked: {
    fontFamily: 'monospace',
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    letterSpacing: 0.5,
  },
  bankBalance: {
    fontSize: 13,
    fontWeight: '600',
    color: '#10b981',
    marginTop: 4,
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
});
