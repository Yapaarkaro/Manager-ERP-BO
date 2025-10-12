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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck as CheckCircle, Banknote, ArrowLeft } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
import { dataStore } from '@/utils/dataStore';
import InvoicePatternConfig from '@/components/InvoicePatternConfig';
import FiscalYearSelector from '@/components/FiscalYearSelector';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';

export default function FinalSetupScreen() {
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
    // Invoice configuration from business summary (if coming back)
    initialCashBalance: incomingCashBalance,
    invoicePrefix: incomingInvoicePrefix,
    invoicePattern: incomingInvoicePattern,
    startingInvoiceNumber: incomingStartingNumber,
    fiscalYear: incomingFiscalYear,
  } = useLocalSearchParams();

  // Check if we have incoming invoice config (returning user from business summary)
  // Need to check for actual values, not just truthy check (empty string '' is falsy)
  const hasIncomingConfig = 
    (incomingCashBalance !== undefined && incomingCashBalance !== null) ||
    (incomingInvoicePrefix !== undefined && incomingInvoicePrefix !== null) ||
    (incomingInvoicePattern !== undefined && incomingInvoicePattern !== null);

  const [initialCashBalance, setInitialCashBalance] = useState(
    (incomingCashBalance !== undefined && incomingCashBalance !== null) ? (incomingCashBalance as string) : ''
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
  const colors = useThemeColors();
  const debouncedNavigate = useDebounceNavigation();

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
      useNativeDriver: true,
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
    const cleaned = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      return;
    }
    
    // Store the raw value for calculations
    setInitialCashBalance(cleaned);
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'decimal',
      minimumFractionDigits: 2,
    }).format(balance);
  };

  const formatBalanceWithSymbol = (balance: number) => {
    return `₹${formatBalance(balance)}`;
  };

  const handleContinue = () => {
    if (!isFormValid()) return;

    // Get latest data from dataStore to ensure we have all updates
    const latestAddresses = dataStore.getAddresses();
    const latestBankAccounts = dataStore.getBankAccounts();

    // Navigate to business summary with all collected data
    debouncedNavigate({
      pathname: '/auth/business-summary',
      params: {
        type,
        value,
        gstinData,
        name,
        businessName,
        businessType,
        customBusinessType,
        allAddresses: JSON.stringify(latestAddresses),
        allBankAccounts: JSON.stringify(latestBankAccounts),
        initialCashBalance: totalCashBalance.toString(),
        invoicePrefix,
        invoicePattern,
        startingInvoiceNumber,
        fiscalYear,
      }
    }, 'replace');
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
    opacity: slideAnimation,
  };

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
                pathname: '/auth/bank-accounts',
                params: {
                  type,
                  value,
                  gstinData,
                  name,
                  businessName,
                  businessType,
                  customBusinessType,
                  allAddresses,
                  allBankAccounts,
                  // Pass current invoice configuration
                  initialCashBalance,
                  invoicePrefix,
                  invoicePattern,
                  startingInvoiceNumber,
                  fiscalYear,
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
                    style={styles.input}
                    value={formatIndianNumber(initialCashBalance)}
                    onChangeText={handleInitialCashBalanceChange}
                    placeholder="0.00"
                    placeholderTextColor="#999999"
                    keyboardType="decimal-pad"
                  />
                </View>
                <Text style={styles.fieldHint}>
                  Enter the cash amount you currently have for business operations
                </Text>
                
                {totalCashBalance > 0 && (
                  <View style={styles.cashPreview}>
                    <Text style={styles.cashPreviewLabel}>Cash Balance:</Text>
                    <Text style={styles.cashPreviewValue}>
                      {formatBalanceWithSymbol(totalCashBalance)}
                    </Text>
                  </View>
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
                  Continue to Summary
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>
        </KeyboardAvoidingView>
      </SafeAreaView>
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
    paddingHorizontal: 32,
    paddingTop: 60,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 48,
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
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 4,
    marginBottom: 8,
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
    paddingVertical: 14,
    fontSize: 18,
    color: '#047857',
    fontWeight: '600',
    textAlign: 'right',
    
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
  invoiceContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#3F66AC',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  fiscalContainer: {
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
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