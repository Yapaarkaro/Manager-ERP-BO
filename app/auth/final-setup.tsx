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
import { IndianRupee, CircleCheck as CheckCircle, User, Building2, CreditCard, MapPin, Banknote } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';

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
  } = useLocalSearchParams();

  const [initialCashBalance, setInitialCashBalance] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const colors = useThemeColors();

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

  const handleInitialCashBalanceChange = (text: string) => {
    // Allow numbers and decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
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

  const handleCompleteSetup = async () => {
    setIsLoading(true);

    // Here you would typically save all the data to your backend
    const businessData = {
      personalInfo: {
        name,
        businessName,
        businessType: businessType !== 'Others' ? businessType : customBusinessType,
      },
      verification: {
        type,
        value,
        gstinData: gstinData ? JSON.parse(gstinData as string) : null,
      },
      addresses,
      bankAccounts,
      initialCashBalance: totalCashBalance,
      totalBalance: grandTotal,
      setupCompletedAt: new Date().toISOString(),
    };

    console.log('Complete business setup data:', businessData);

    setTimeout(() => {
      router.push('/dashboard');
      setIsLoading(false);
    }, 1000);
  };

  const isFormValid = () => {
    return initialCashBalance.length > 0 && !isNaN(parseFloat(initialCashBalance));
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
                  Add your initial cash balance and review your business summary
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
                    value={initialCashBalance}
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

              {/* Business Summary */}
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Business Summary</Text>
                
                <View style={styles.summarySection}>
                  <View style={styles.summaryItem}>
                    <View style={styles.summaryItemLeft}>
                      <User size={16} color="#64748b" />
                      <Text style={styles.summaryLabel}>Owner Name</Text>
                    </View>
                    <Text style={styles.summaryValue}>{name}</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <View style={styles.summaryItemLeft}>
                      <Building2 size={16} color="#64748b" />
                      <Text style={styles.summaryLabel}>Business Name</Text>
                    </View>
                    <Text style={styles.summaryValue}>{businessName}</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <View style={styles.summaryItemLeft}>
                      <CreditCard size={16} color="#64748b" />
                      <Text style={styles.summaryLabel}>{type} Number</Text>
                    </View>
                    <Text style={styles.summaryValue}>{value}</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <View style={styles.summaryItemLeft}>
                      <Building2 size={16} color="#64748b" />
                      <Text style={styles.summaryLabel}>Business Type</Text>
                    </View>
                    <Text style={styles.summaryValue}>
                      {businessType !== 'Others' ? businessType : customBusinessType}
                    </Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <View style={styles.summaryItemLeft}>
                      <MapPin size={16} color="#64748b" />
                      <Text style={styles.summaryLabel}>Addresses</Text>
                    </View>
                    <Text style={styles.summaryValue}>{addresses.length}</Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <View style={styles.summaryItemLeft}>
                      <CreditCard size={16} color="#64748b" />
                      <Text style={styles.summaryLabel}>Bank Account Balance</Text>
                    </View>
                    <Text style={[styles.summaryValue, styles.balanceValue]}>
                      ₹{formatBalance(totalBankBalance)}
                    </Text>
                  </View>

                  <View style={styles.summaryItem}>
                    <View style={styles.summaryItemLeft}>
                      <Banknote size={16} color="#64748b" />
                      <Text style={styles.summaryLabel}>Initial Cash Balance</Text>
                    </View>
                    <Text style={[styles.summaryValue, styles.balanceValue]}>
                      ₹{formatBalance(totalCashBalance)}
                    </Text>
                  </View>

                  <View style={[styles.summaryItem, styles.totalItem]}>
                    <View style={styles.summaryItemLeft}>
                      <IndianRupee size={16} color="#10b981" />
                      <Text style={[styles.summaryLabel, styles.totalLabel]}>Total</Text>
                    </View>
                    <Text style={[styles.summaryValue, styles.totalValue]}>
                      {formatBalanceWithSymbol(grandTotal)}
                    </Text>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.completeButton,
                  isFormValid() ? styles.enabledButton : styles.disabledButton,
                ]}
                onPress={handleCompleteSetup}
                disabled={!isFormValid() || isLoading}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.completeButtonText,
                  isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
                ]}>
                  {isLoading ? 'Setting up your business...' : 'Complete Setup'}
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
    outlineStyle: 'none',
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
  summaryContainer: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  summaryTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 20,
    textAlign: 'center',
  },
  summarySection: {
    gap: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },
  balanceValue: {
    color: '#10b981',
    fontWeight: '700',
  },
  totalItem: {
    borderTopWidth: 2,
    borderTopColor: '#e2e8f0',
    paddingTop: 16,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: '#10b981',
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '800',
    color: '#10b981',
    flex: 1,
    textAlign: 'right',
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