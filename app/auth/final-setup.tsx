import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Keyboard,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck as CheckCircle, Banknote, ArrowLeft } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
// DataStore removed - Supabase backend is the sole source of truth
import InvoicePatternConfig from '@/components/InvoicePatternConfig';
import FiscalYearSelector from '@/components/FiscalYearSelector';
import { saveSignupProgress } from '@/services/backendApi';
import { supabase } from '@/lib/supabase';
import { getSignupData, setSignupData } from '@/utils/signupStore';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { numberToWords } from '@/utils/numberToWords';
import { formatCurrencyINR } from '@/utils/formatters';

export default function FinalSetupScreen() {
  const _params = useLocalSearchParams();
  const _store = getSignupData();

  const type = (_params.type as string) ?? _store.type ?? '';
  const value = (_params.value as string) ?? _store.value ?? '';
  const gstinData = (_params.gstinData as string) ?? _store.gstinData ?? '';
  const name = (_params.name as string) ?? _store.name ?? '';
  const businessName = (_params.businessName as string) ?? _store.businessName ?? '';
  const businessType = (_params.businessType as string) ?? _store.businessType ?? '';
  const customBusinessType = (_params.customBusinessType as string) ?? _store.customBusinessType ?? '';
  const mobile = (_params.mobile as string) ?? _store.mobile ?? '';
  const allAddresses = (_params.allAddresses as string) ?? _store.allAddresses ?? '[]';
  const allBankAccounts = (_params.allBankAccounts as string) ?? _store.allBankAccounts ?? '[]';
  const incomingCashBalance = (_params.initialCashBalance as string) ?? _store.initialCashBalance;
  const incomingInvoicePrefix = (_params.invoicePrefix as string) ?? _store.invoicePrefix;
  const incomingInvoicePattern = (_params.invoicePattern as string) ?? _store.invoicePattern;
  const incomingStartingNumber = (_params.startingInvoiceNumber as string) ?? _store.startingInvoiceNumber;
  const incomingFiscalYear = (_params.fiscalYear as string) ?? _store.fiscalYear;

  // Check if we have incoming invoice config (returning user from business summary)
  // Need to check for actual values, not just truthy check (empty string '' is falsy)
  const hasIncomingConfig = 
    (incomingCashBalance !== undefined && incomingCashBalance !== null) ||
    (incomingInvoicePrefix !== undefined && incomingInvoicePrefix !== null) ||
    (incomingInvoicePattern !== undefined && incomingInvoicePattern !== null);

  const [initialCashBalance, setInitialCashBalance] = useState(
    (incomingCashBalance !== undefined && incomingCashBalance !== null && incomingCashBalance !== '0' && incomingCashBalance !== '0.00' && incomingCashBalance !== '0.') 
      ? (incomingCashBalance as string) 
      : ''
  );
  const [invoicePrefix, setInvoicePrefix] = useState(
    (incomingInvoicePrefix !== undefined && incomingInvoicePrefix !== null) ? (incomingInvoicePrefix as string) : 'INV'
  );
  const [invoicePattern, setInvoicePattern] = useState(
    (incomingInvoicePattern !== undefined && incomingInvoicePattern !== null) ? (incomingInvoicePattern as string) : ''
  );
  const [startingInvoiceNumber, setStartingInvoiceNumber] = useState(
    (incomingStartingNumber !== undefined && incomingStartingNumber !== null) ? (incomingStartingNumber as string) : '1'
  );
  const [fiscalYear, setFiscalYear] = useState<'JAN-DEC' | 'APR-MAR'>(
    (incomingFiscalYear !== undefined && incomingFiscalYear !== null) ? (incomingFiscalYear as 'JAN-DEC' | 'APR-MAR') : 'APR-MAR'
  );
  const [isLoading, setIsLoading] = useState(false);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const cashBalanceInputRef = useRef<TextInput>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0); // Track keyboard height
  const colors = useThemeColors();

  // Log configuration status for debugging
  useEffect(() => {
    if (hasIncomingConfig) {
      console.log('✅ Returning user - preserving invoice configuration:');
      console.log('  - Cash Balance:', incomingCashBalance);
      console.log('  - Invoice Prefix:', incomingInvoicePrefix);
      console.log('  - Invoice Pattern:', incomingInvoicePattern);
      console.log('  - Starting Number:', incomingStartingNumber);
      console.log('  - Fiscal Year:', incomingFiscalYear);
    } else {
      console.log('📝 Fresh user - requesting new invoice configuration');
    }
  }, [hasIncomingConfig, incomingCashBalance, incomingInvoicePrefix, incomingInvoicePattern, incomingStartingNumber, incomingFiscalYear]);

  // Parse data for summary
  const addresses = JSON.parse(allAddresses as string || '[]');
  const bankAccounts = JSON.parse(allBankAccounts as string || '[]');
  const totalBankBalance = bankAccounts.reduce((sum: number, account: any) => sum + account.initialBalance, 0);
  const totalCashBalance = parseFloat(initialCashBalance) || 0;
  const grandTotal = totalBankBalance + totalCashBalance;

  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: Platform.OS !== 'web', // Web doesn't support native driver
    }).start();
  }, []);

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

  const handleInitialCashBalanceChange = (text: string) => {
    // Remove all non-numeric characters except decimal point
    let cleaned = text.replace(/[^0-9.]/g, '');
    
    // If user deletes everything, ensure it's truly empty
    if (cleaned === '' || cleaned === '0' || cleaned === '0.' || cleaned === '0.00') {
      setInitialCashBalance('');
      setTimeout(() => {
        if (cashBalanceInputRef.current && Platform.OS !== 'web') {
          cashBalanceInputRef.current.setNativeProps({
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
    
    // Store the raw value for calculations
    setInitialCashBalance(cleaned);
    
    // Move cursor to end after formatting
    setTimeout(() => {
      if (cashBalanceInputRef.current && Platform.OS !== 'web') {
        const formatted = formatIndianNumber(cleaned);
        const length = formatted.length;
        cashBalanceInputRef.current.setNativeProps({
          selection: { start: length, end: length }
        });
      }
    }, 50);
  };

  const formatBalanceWithSymbol = (balance: number) => {
    return formatCurrencyINR(balance);
  };

  const handleContinue = async () => {
    if (!isFormValid()) return;

    setIsLoading(true);

    // ✅ Save signup progress - finalSetup step (non-blocking for instant navigation)
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          // Get mobile from params or from user's phone metadata
          const mobileNumber = (mobile as string) || session?.user?.phone || session?.user?.user_metadata?.phone;
          if (mobileNumber) {
            saveSignupProgress({
              mobile: mobileNumber,
              mobileVerified: true,
              currentStep: 'finalSetup',
              taxIdType: type as string || undefined,
              taxIdValue: value as string || undefined,
              ownerName: name as string || undefined,
              businessName: businessName as string || undefined,
              businessType: businessType as string || undefined,
              gstinData: gstinData ? (typeof gstinData === 'string' ? gstinData : JSON.stringify(gstinData)) : undefined,
            }).then((progressResult) => {
              if (progressResult.success) {
                console.log('✅ Signup progress saved: finalSetup');
              } else {
                console.error('❌ Failed to save signup progress:', progressResult.error);
              }
            }).catch((error) => {
              console.error('Error saving signup progress:', error);
            });
          } else {
            console.warn('⚠️ Mobile number not available for saving final setup progress');
          }
        }
      } catch (error) {
        console.error('Error getting session:', error);
      }
    })();

    // ✅ Clear cache to ensure fresh data is loaded when navigating to business summary
    const { clearBusinessDataCache } = await import('@/hooks/useBusinessData');
    clearBusinessDataCache();
    
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
      initialCashBalance: totalCashBalance.toString(),
      invoicePrefix,
      invoicePattern,
      startingInvoiceNumber,
      fiscalYear,
      mobile,
    });
    router.replace('/auth/business-summary' as any);
    
    // Reset loading state immediately
    setIsLoading(false);
  };

  const isFormValid = () => {
    return (
      initialCashBalance.length > 0 && 
      !isNaN(parseFloat(initialCashBalance)) &&
      invoicePrefix.length > 0 &&
      invoicePattern.length > 0 &&
      startingInvoiceNumber.length > 0
    );
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
    <ResponsiveContainer>
      <View style={styles.container}>
      <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          enabled={true}
        >
          {/* Back Button */}
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
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
                initialCashBalance,
                invoicePrefix,
                invoicePattern,
                startingInvoiceNumber,
                fiscalYear,
                mobile,
              });
              router.replace('/auth/bank-accounts' as any);
            }}
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
                  <CheckCircle size={48} color="#10b981" strokeWidth={3} />
                </View>
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title}>Final Setup</Text>
                <Text style={styles.subtitle}>
                  Configure your invoice settings and add initial cash balance
                </Text>
              </View>

              {/* Initial Cash Balance */}
              <View style={styles.cashBalanceContainer}>
                <Text style={styles.sectionTitle}>Initial Cash Balance</Text>
                <View style={styles.inputContainer}>
                  <Banknote size={20} color="#64748b" style={styles.inputIcon} />
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    ref={cashBalanceInputRef}
                    style={[
                      styles.input,
                      (Platform.select({
                        web: {
                          outlineWidth: 0,
                          outlineColor: 'transparent',
                          // outlineStyle removed - React Native doesn't support 'none'
                        },
                      }) as any), // ✅ Type assertion for web-specific styles
                    ]}
                    value={initialCashBalance && initialCashBalance !== '0' && initialCashBalance !== '0.' && initialCashBalance !== '0.00' ? formatIndianNumber(initialCashBalance) : ''}
                    onChangeText={handleInitialCashBalanceChange}
                    placeholder="0.00"
                    placeholderTextColor="#999999"
                    keyboardType="decimal-pad"
                    onFocus={() => {
                      // Move cursor to end when focused, or start if empty
                      setTimeout(() => {
                        if (cashBalanceInputRef.current && Platform.OS !== 'web') {
                          // If empty or just "0", clear and position at start
                          if (!initialCashBalance || initialCashBalance === '0' || initialCashBalance === '0.' || initialCashBalance === '0.00') {
                            setInitialCashBalance('');
                            cashBalanceInputRef.current.setNativeProps({
                              selection: { start: 0, end: 0 }
                            });
                          } else {
                            const formatted = formatIndianNumber(initialCashBalance);
                            const length = formatted.length;
                            cashBalanceInputRef.current.setNativeProps({
                              selection: { start: length, end: length }
                            });
                          }
                        }
                      }, 100);
                    }}
                  />
                </View>
                <Text style={styles.fieldHint}>
                  Enter the cash amount you currently have for business operations
                </Text>
                
                {totalCashBalance > 0 && (
                  <>
                    <View style={styles.cashPreview}>
                      <Text style={styles.cashPreviewLabel}>Cash Balance:</Text>
                      <Text style={styles.cashPreviewValue}>
                        {formatBalanceWithSymbol(totalCashBalance)}
                      </Text>
                    </View>
                    <View style={styles.cashWordsContainer}>
                      <Text style={styles.cashWordsLabel}>Amount in words:</Text>
                      <Text style={styles.cashWordsValue}>
                        {numberToWords(totalCashBalance)}
                      </Text>
                    </View>
                  </>
                )}
              </View>

              {/* Fiscal Year Selection - Moved below cash balance */}
              <View style={styles.fiscalContainer}>
                <FiscalYearSelector
                  onFiscalYearChange={setFiscalYear}
                  initialValue={fiscalYear}
                />
                  </View>

              {/* Invoice Configuration */}
              <View style={styles.invoiceContainer}>
                <Text style={styles.sectionTitle}>Invoice Configuration</Text>
                <InvoicePatternConfig
                  onPatternChange={setInvoicePattern}
                  onPrefixChange={setInvoicePrefix}
                  onStartingNumberChange={setStartingInvoiceNumber}
                  initialPrefix={invoicePrefix}
                  initialStartingNumber={startingInvoiceNumber}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.completeButton,
                  isFormValid() ? styles.enabledButton : styles.disabledButton,
                ]}
                onPress={handleContinue}
                disabled={!isFormValid()}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.completeButtonText,
                  isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
                ]}>
                  {isLoading ? 'Please wait...' : 'Continue to Summary'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
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
      web: 32,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    paddingTop: Platform.select({
      web: 60,
      default: 40,
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
    backgroundColor: '#dcfce7',
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  cashBalanceContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: Platform.select({
      web: 2,
      default: 1.5, // Thinner border for more native feel
    }),
    borderColor: '#10b981',
    borderRadius: Platform.select({
      web: 16,
      default: 12, // Smaller radius for more native feel
    }),
    padding: Platform.select({
      web: 20,
      default: 14, // Reduced padding for more compact feel
    }),
    marginBottom: Platform.select({
      web: 32,
      default: 20, // Reduced spacing on mobile
    }),
  },
  sectionTitle: {
    fontSize: Platform.select({
      web: 18,
      default: 16, // Reduced for more native feel
    }),
    fontWeight: '700',
    color: '#047857',
    marginBottom: Platform.select({
      web: 16,
      default: 12, // Reduced spacing on mobile
    }),
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: Platform.select({
      web: 2,
      default: 1.5, // Thinner border for more native feel
    }),
    borderColor: '#10b981',
    borderRadius: Platform.select({
      web: 12,
      default: 10, // Smaller radius for more native feel
    }),
    paddingHorizontal: Platform.select({
      web: 20,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    paddingVertical: Platform.select({
      web: 4,
      default: 2, // Reduced padding for more compact feel
    }),
    marginBottom: Platform.select({
      web: 8,
      default: 6, // Reduced spacing on mobile
    }),
  },
  inputIcon: {
    marginRight: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: Platform.select({
      web: 14,
      default: 12, // Reduced padding for more compact feel
    }),
    fontSize: Platform.select({
      web: 18,
      default: 16, // Reduced for truncated text on mobile
    }),
    color: '#047857',
    fontWeight: '600',
    textAlign: 'right',
    ...Platform.select({
      default: {
        minHeight: 44, // Standard native input height
      },
    }),
  },
  fieldHint: {
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  cashPreview: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#10b981',
  },
  cashPreviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#047857',
  },
  cashPreviewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
  },
  cashWordsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#d1fae5',
  },
  cashWordsLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#047857',
    marginBottom: 4,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  cashWordsValue: {
    fontSize: 14,
    fontWeight: '500',
    color: '#065f46',
    fontStyle: 'italic',
    lineHeight: 20,
  },
  invoiceContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: Platform.select({
      web: 2,
      default: 1.5, // Thinner border for more native feel
    }),
    borderColor: '#3F66AC',
    borderRadius: Platform.select({
      web: 16,
      default: 12, // Smaller radius for more native feel
    }),
    padding: Platform.select({
      web: 20,
      default: 14, // Reduced padding for more compact feel
    }),
    marginBottom: Platform.select({
      web: 32,
      default: 20, // Reduced spacing on mobile
    }),
  },
  fiscalContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: Platform.select({
      web: 2,
      default: 1.5, // Thinner border for more native feel
    }),
    borderColor: '#10b981',
    borderRadius: Platform.select({
      web: 16,
      default: 12, // Smaller radius for more native feel
    }),
    padding: Platform.select({
      web: 20,
      default: 14, // Reduced padding for more compact feel
    }),
    marginBottom: Platform.select({
      web: 32,
      default: 20, // Reduced spacing on mobile
    }),
  },
  completeButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
  },
  enabledButton: {
    backgroundColor: '#10b981',
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
  },
  completeButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  enabledButtonText: {
    color: '#ffffff',
  },
  disabledButtonText: {
    color: '#6b7280',
  },
});