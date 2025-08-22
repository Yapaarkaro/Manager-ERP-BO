import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Building, Plus, TrendingUp, TrendingDown } from 'lucide-react-native';
import { dataStore, BankAccount } from '@/utils/dataStore';

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

export default function BanksScreen() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);

  useFocusEffect(
    React.useCallback(() => {
      loadBankAccounts();
    }, [])
  );

  const loadBankAccounts = () => {
    const accounts = dataStore.getBankAccounts();
    setBankAccounts(accounts);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleBankAccountPress = (bankAccount: BankAccount) => {
    router.push({
      pathname: '/bank-details',
      params: {
        bankAccountId: bankAccount.id,
      }
    });
  };

  const handleAddBankAccount = () => {
    router.push('/add-bank-account');
  };

  const getTotalBalance = () => {
    return bankAccounts.reduce((total, account) => total + (account.balance || 0), 0);
  };

  const getTotalIncome = () => {
    return dataStore.getTotalIncome();
  };

  const getTotalExpense = () => {
    return dataStore.getTotalExpense();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Banks</Text>
          <TouchableOpacity
            style={styles.addButton}
            onPress={handleAddBankAccount}
            activeOpacity={0.7}
          >
            <Plus size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Summary Cards */}
        <View style={styles.summaryContainer}>
          <View style={styles.summaryCard}>
            <View style={styles.summaryIconContainer}>
              <Building size={24} color={Colors.primary} />
            </View>
            <Text style={styles.summaryLabel}>Total Balance</Text>
            <Text style={styles.summaryAmount}>{formatAmount(getTotalBalance())}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: Colors.success + '20' }]}>
              <TrendingUp size={24} color={Colors.success} />
            </View>
            <Text style={styles.summaryLabel}>Total Income</Text>
            <Text style={[styles.summaryAmount, { color: Colors.success }]}>{formatAmount(getTotalIncome())}</Text>
          </View>

          <View style={styles.summaryCard}>
            <View style={[styles.summaryIconContainer, { backgroundColor: Colors.error + '20' }]}>
              <TrendingDown size={24} color={Colors.error} />
            </View>
            <Text style={styles.summaryLabel}>Total Expense</Text>
            <Text style={[styles.summaryAmount, { color: Colors.error }]}>{formatAmount(getTotalExpense())}</Text>
          </View>
        </View>

        {/* Bank Accounts List */}
        <View style={styles.sectionContainer}>
          <Text style={styles.sectionTitle}>Bank Accounts</Text>
          {bankAccounts.length === 0 ? (
            <View style={styles.emptyState}>
              <Building size={48} color={Colors.grey[300]} />
              <Text style={styles.emptyStateTitle}>No Bank Accounts</Text>
              <Text style={styles.emptyStateSubtitle}>
                Add your first bank account to start tracking transactions
              </Text>
              <TouchableOpacity
                style={styles.emptyStateButton}
                onPress={handleAddBankAccount}
                activeOpacity={0.7}
              >
                <Text style={styles.emptyStateButtonText}>Add Bank Account</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <View style={styles.bankAccountsList}>
              {bankAccounts.map((bankAccount) => (
                <TouchableOpacity
                  key={bankAccount.id}
                  style={styles.bankAccountCard}
                  onPress={() => handleBankAccountPress(bankAccount)}
                  activeOpacity={0.7}
                >
                  <View style={styles.bankAccountLeft}>
                    <View style={styles.bankAccountIcon}>
                      <Building size={24} color={Colors.primary} />
                    </View>
                    <View style={styles.bankAccountInfo}>
                      <Text style={styles.bankAccountName}>
                        {bankAccount.accountHolderName}
                      </Text>
                      <Text style={styles.bankAccountDetails}>
                        {bankAccount.bankName} • {bankAccount.accountNumber}
                      </Text>
                      <Text style={styles.bankAccountType}>
                        {bankAccount.accountType} Account
                      </Text>
                    </View>
                  </View>
                  <View style={styles.bankAccountRight}>
                    <Text style={styles.bankAccountBalance}>
                      {formatAmount(bankAccount.balance || 0)}
                    </Text>
                    {bankAccount.isPrimary && (
                      <View style={styles.primaryBadge}>
                        <Text style={styles.primaryBadgeText}>Primary</Text>
                      </View>
                    )}
                  </View>
                </TouchableOpacity>
              ))}
            </View>
          )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSafeArea: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 24,
  },
  summaryCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    alignItems: 'center',
  },
  summaryIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  sectionContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  emptyStateButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  bankAccountsList: {
    gap: 12,
  },
  bankAccountCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  bankAccountLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  bankAccountIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  bankAccountInfo: {
    flex: 1,
  },
  bankAccountName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  bankAccountDetails: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 2,
  },
  bankAccountType: {
    fontSize: 12,
    color: Colors.textLight,
  },
  bankAccountRight: {
    alignItems: 'flex-end',
  },
  bankAccountBalance: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  primaryBadge: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryBadgeText: {
    fontSize: 10,
    fontWeight: '600',
    color: Colors.primary,
  },
});
