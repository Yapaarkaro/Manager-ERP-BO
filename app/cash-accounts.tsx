/**
 * Cash Accounts Screen
 * Shows only Cash Accounts (not bank accounts)
 */

import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Banknote, Wallet, Plus } from 'lucide-react-native';
import { useBusinessData } from '@/hooks/useBusinessData';
import { useWebBackNavigation } from '@/hooks/useWebBackNavigation';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

// Interface for backend account
interface BackendAccount {
  id: string;
  bank_name?: string;
  bankName?: string;
  account_holder_name?: string;
  accountHolderName?: string;
  account_number?: string;
  accountNumber?: string;
  ifsc_code?: string;
  ifscCode?: string;
  account_type?: string;
  accountType?: string;
  initial_balance?: number;
  initialBalance?: number;
  current_balance?: number;
  currentBalance?: number;
  balance?: number;
  is_primary?: boolean;
  isPrimary?: boolean;
  type?: 'bank' | 'cash';
  upi_id?: string;
  upiId?: string;
  created_at?: string;
  createdAt?: string;
}

export default function CashAccountsScreen() {
  const { handleBack } = useWebBackNavigation();
  const { data: businessData, refetch } = useBusinessData();

  // Use cached data immediately for fast loading
  const bankAccountsData = useMemo(() => {
    if (!businessData?.bankAccounts) return [];
    return businessData.bankAccounts;
  }, [businessData?.bankAccounts]);

  // Filter only cash accounts (exclude bank accounts)
  const cashAccounts = useMemo(() => {
    return bankAccountsData.filter((account: any) => {
      // Only show cash accounts
      return account.type === 'cash' || account.account_type === 'cash';
    });
  }, [bankAccountsData]);

  // Get cash balance from business data (instant from cache)
  const cashBalance = useMemo(() => {
    return businessData?.business?.current_cash_balance || 
           businessData?.business?.current_total_cash_balance || 0;
  }, [businessData?.business?.current_cash_balance, businessData?.business?.current_total_cash_balance]);

  // Refetch when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetch();
    }, [refetch])
  );

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  // Map backend account to display format
  const mapAccountToDisplay = (account: any) => {
    return {
      id: account.id || account.backend_id || '',
      bankName: account.bank_name || account.bankName || 'Cash Account',
      accountHolderName: account.account_holder_name || account.accountHolderName || '',
      accountNumber: account.account_number || account.accountNumber || '',
      ifscCode: account.ifsc_code || account.ifscCode || '',
      accountType: account.account_type || account.accountType || 'Cash',
      currentBalance: account.current_balance || account.currentBalance || account.balance || account.initial_balance || account.initialBalance || 0,
      isPrimary: account.is_primary || account.isPrimary || false,
      upiId: account.upi_id || account.upiId || '',
    };
  };

  const handleViewAccount = (accountId: string) => {
    router.push({
      pathname: '/bank-details',
      params: { bankAccountId: accountId }
    });
  };

  // Calculate total cash balance
  const totalCashBalance = useMemo(() => {
    const cashFromAccounts = cashAccounts.reduce((sum, acc) => {
      const balance = acc.current_balance || acc.currentBalance || acc.balance || acc.initial_balance || acc.initialBalance || 0;
      return sum + (typeof balance === 'number' ? balance : parseFloat(String(balance)) || 0);
    }, 0);
    return cashFromAccounts + (typeof cashBalance === 'number' ? cashBalance : parseFloat(String(cashBalance)) || 0);
  }, [cashAccounts, cashBalance]);

  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Cash Accounts</Text>
        </View>

        <ScrollView 
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === 'web' ? webContainerStyles.webScrollContent : {}
          ]}
          showsVerticalScrollIndicator={false}
        >
          {/* Cash Balance Card (if cash balance exists) */}
          {cashBalance > 0 && (
            <View style={styles.section}>
              <View style={styles.cashCard}>
                <View style={styles.cashCardHeader}>
                  <Banknote size={32} color={Colors.success} />
                  <View style={styles.cashDetails}>
                    <Text style={styles.cashLabel}>Current Cash Balance</Text>
                    <Text style={styles.cashAmount}>
                      {formatAmount(cashBalance)}
                    </Text>
                  </View>
                </View>
                <TouchableOpacity
                  style={styles.viewCashButton}
                  onPress={() => router.push('/cash-details')}
                  activeOpacity={0.7}
                >
                  <Text style={styles.viewCashButtonText}>View Cash Transactions</Text>
                </TouchableOpacity>
              </View>
            </View>
          )}

          {/* Cash Accounts from backend (if any) */}
          {cashAccounts.length > 0 && (
            <View style={[styles.section, styles.cashSection]}>
              <View style={styles.sectionHeader}>
                <View style={styles.sectionHeaderLeft}>
                  <Wallet size={24} color={Colors.success} />
                  <Text style={[styles.sectionTitle, { color: Colors.success }]}>Cash Accounts</Text>
                  {cashAccounts.length > 0 && (
                    <View style={[styles.countBadge, { backgroundColor: Colors.success + '20' }]}>
                      <Text style={[styles.countBadgeText, { color: Colors.success }]}>
                        {cashAccounts.length}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              <View style={styles.accountsList}>
                {cashAccounts.map((account) => {
                  const displayAccount = mapAccountToDisplay(account);
                  return (
                    <TouchableOpacity
                      key={account.id || displayAccount.id}
                      style={[styles.accountCard, styles.cashAccountCard]}
                      onPress={() => handleViewAccount(displayAccount.id)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.accountCardHeader}>
                        <View style={styles.accountInfo}>
                          <Wallet size={20} color={Colors.success} />
                          <View style={styles.accountDetails}>
                            <Text style={styles.accountName}>{displayAccount.bankName}</Text>
                            <Text style={styles.accountNumber}>
                              {displayAccount.accountNumber ? `****${displayAccount.accountNumber.slice(-4)}` : 'Cash Account'}
                            </Text>
                          </View>
                        </View>
                        {displayAccount.isPrimary && (
                          <View style={[styles.primaryBadge, { backgroundColor: Colors.success + '15' }]}>
                            <Text style={[styles.primaryBadgeText, { color: Colors.success }]}>Primary</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.accountBalance}>
                        <Text style={styles.balanceLabel}>Balance</Text>
                        <Text style={[styles.balanceAmount, { color: Colors.success }]}>
                          {formatAmount(displayAccount.currentBalance)}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          )}

          {/* Empty state for cash accounts */}
          {cashAccounts.length === 0 && cashBalance === 0 && (
            <View style={styles.section}>
              <View style={styles.emptyState}>
                <Wallet size={48} color={Colors.grey[300]} />
                <Text style={styles.emptyStateText}>No cash accounts</Text>
              </View>
            </View>
          )}

          {/* Summary */}
          <View style={styles.summarySection}>
            <Text style={styles.summaryTitle}>Total Cash Balance</Text>
            <Text style={[styles.summaryAmount, { color: Colors.success }]}>
              {formatAmount(totalCashBalance)}
            </Text>
          </View>
        </ScrollView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  section: {
    marginBottom: 24,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    ...Platform.select({
      web: {
        boxShadow: '0 2px 8px rgba(0, 0, 0, 0.05)',
      },
    }),
  },
  cashSection: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  countBadge: {
    backgroundColor: Colors.primary + '15',
    borderRadius: 12,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginLeft: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  accountsList: {
    gap: 12,
  },
  accountCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    marginBottom: 12,
    ...Platform.select({
      web: {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      },
    }),
  },
  cashAccountCard: {
    borderColor: Colors.success + '40',
    backgroundColor: Colors.success + '05',
  },
  accountCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  accountInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  accountDetails: {
    flex: 1,
  },
  accountName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 14,
    color: Colors.textLight,
  },
  primaryBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.primary + '15',
  },
  primaryBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  accountBalance: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
    paddingHorizontal: 32,
  },
  emptyStateText: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: 16,
    marginBottom: 24,
  },
  cashCard: {
    backgroundColor: Colors.success + '10',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.success + '30',
  },
  cashCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
    marginBottom: 16,
  },
  cashDetails: {
    flex: 1,
  },
  cashLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  cashAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.success,
  },
  viewCashButton: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.success,
    alignItems: 'center',
  },
  viewCashButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  summarySection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 20,
    marginTop: 8,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
  },
});

















