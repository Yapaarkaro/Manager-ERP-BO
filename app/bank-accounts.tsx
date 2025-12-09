import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Plus, CreditCard, Banknote, Edit3, Trash2 } from 'lucide-react-native';
import { dataStore } from '@/utils/dataStore';
import { useBusinessData } from '@/hooks/useBusinessData';

interface BankAccount {
  id: string;
  accountHolderName: string;
  bankName: string;
  accountNumber: string;
  ifscCode: string;
  initialBalance: number;
  isPrimary: boolean;
}

export default function BankAccountsScreen() {
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [cashBalance, setCashBalance] = useState<number>(0);
  const [totalBalance, setTotalBalance] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(true);

  // Data loading is handled by useBusinessData hook

  // ✅ Use unified business data hook (fast, cached, parallel)
  const { data: businessData, loading: dataLoading } = useBusinessData();

  useEffect(() => {
    if (!dataLoading && businessData) {
      // Update balances immediately from cached data
      if (businessData.business) {
        const cashBalance = businessData.business.current_cash_balance || businessData.business.initial_cash_balance || 0;
        setCashBalance(cashBalance);
        
        const totalFunds = businessData.business.current_total_funds || 
          (businessData.business.current_total_bank_balance + cashBalance);
        setTotalBalance(totalFunds);
      }
      
      // Update bank accounts immediately from cached data
      if (businessData.bankAccounts) {
        const accounts = businessData.bankAccounts.map((acc: any) => ({
          id: acc.id,
          accountHolderName: acc.account_holder_name,
          bankName: acc.bank_name,
          accountNumber: acc.account_number,
          ifscCode: acc.ifsc_code,
          initialBalance: parseFloat(String(acc.initial_balance)) || 0,
          isPrimary: acc.is_primary || false,
        }));
        setBankAccounts(accounts);
      }
      setIsLoading(false);
    } else if (dataLoading) {
      setIsLoading(true);
    }
  }, [businessData, dataLoading]);

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(balance);
  };

  const maskAccountNumber = (accountNumber: string) => {
    if (accountNumber.length <= 4) return accountNumber;
    return '****' + accountNumber.slice(-4);
  };

  const handleAddAccount = () => {
    router.push('/add-bank-account');
  };

  const handleEditAccount = (account: BankAccount) => {
    router.push({
      pathname: '/add-bank-account',
      params: {
        editMode: 'true',
        accountId: account.id,
        accountHolderName: account.accountHolderName,
        bankName: account.bankName,
        accountNumber: account.accountNumber,
        ifscCode: account.ifscCode,
        initialBalance: account.initialBalance.toString(),
        isPrimary: account.isPrimary.toString(),
      }
    });
  };

  const handleDeleteAccount = (account: BankAccount) => {
    Alert.alert(
      'Delete Bank Account',
      `Are you sure you want to delete the ${account.bankName} account?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => {
            try {
              const updatedAccounts = bankAccounts.filter(acc => acc.id !== account.id);
              dataStore.setBankAccounts(updatedAccounts);
              setBankAccounts(updatedAccounts);
              
              const totalBankBalance = updatedAccounts.reduce((sum, acc) => sum + (parseFloat(acc.initialBalance) || 0), 0);
              setTotalBalance(totalBankBalance + cashBalance);
            } catch (error) {
              console.error('Error deleting account:', error);
              Alert.alert('Error', 'Failed to delete account. Please try again.');
            }
          }
        }
      ]
    );
  };

  const handleEditCashBalance = () => {
    router.push('/edit-cash-balance');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#3f66ac" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bank Accounts & Cash</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Total Balance Summary */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryHeader}>
              <Text style={styles.summaryTitle}>Total Balance</Text>
              <Text style={styles.summaryAmount}>{formatBalance(totalBalance)}</Text>
            </View>
            <View style={styles.summaryBreakdown}>
              <View style={styles.summaryItem}>
                <CreditCard size={16} color="#3f66ac" />
                <Text style={styles.summaryLabel}>Bank Accounts:</Text>
                <Text style={styles.summaryValue}>
                  {formatBalance(bankAccounts.reduce((sum, acc) => sum + (parseFloat(acc.initialBalance) || 0), 0))}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Banknote size={16} color="#10b981" />
                <Text style={styles.summaryLabel}>Cash:</Text>
                <Text style={styles.summaryValue}>{formatBalance(cashBalance)}</Text>
              </View>
            </View>
          </View>

          {/* Bank Accounts Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Bank Accounts ({bankAccounts.length})</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={handleAddAccount}
                activeOpacity={0.8}
              >
                <Plus size={20} color="#ffffff" />
                <Text style={styles.addButtonText}>Add Account</Text>
              </TouchableOpacity>
            </View>

            {bankAccounts.length === 0 ? (
              <View style={styles.emptyState}>
                <CreditCard size={48} color="#64748b" />
                <Text style={styles.emptyStateTitle}>No Bank Accounts</Text>
                <Text style={styles.emptyStateSubtitle}>
                  Add your first bank account to start tracking your finances
                </Text>
                <TouchableOpacity
                  style={styles.emptyStateButton}
                  onPress={handleAddAccount}
                  activeOpacity={0.8}
                >
                  <Plus size={20} color="#ffffff" />
                  <Text style={styles.emptyStateButtonText}>Add Bank Account</Text>
                </TouchableOpacity>
              </View>
            ) : (
              bankAccounts.map((account) => (
                <View key={account.id} style={styles.accountCard}>
                  <View style={styles.accountHeader}>
                    <View style={styles.accountInfo}>
                      <Text style={styles.bankName}>{account.bankName}</Text>
                      <Text style={styles.accountHolder}>{account.accountHolderName}</Text>
                      <Text style={styles.accountNumber}>
                        {maskAccountNumber(account.accountNumber)} • {account.ifscCode}
                      </Text>
                    </View>
                    <View style={styles.accountBalance}>
                      <Text style={styles.balanceAmount}>
                        {formatBalance(parseFloat(account.initialBalance) || 0)}
                      </Text>
                      {account.isPrimary && (
                        <View style={styles.primaryBadge}>
                          <Text style={styles.primaryBadgeText}>Primary</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <View style={styles.accountActions}>
                    <TouchableOpacity
                      style={styles.actionButton}
                      onPress={() => handleEditAccount(account)}
                      activeOpacity={0.7}
                    >
                      <Edit3 size={16} color="#3f66ac" />
                      <Text style={styles.actionButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.actionButton, styles.deleteButton]}
                      onPress={() => handleDeleteAccount(account)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color="#dc2626" />
                      <Text style={[styles.actionButtonText, styles.deleteButtonText]}>Delete</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))
            )}
          </View>

          {/* Cash Balance Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Cash Balance</Text>
              <TouchableOpacity
                style={styles.editCashButton}
                onPress={handleEditCashBalance}
                activeOpacity={0.8}
              >
                <Edit3 size={16} color="#3f66ac" />
                <Text style={styles.editCashButtonText}>Edit</Text>
              </TouchableOpacity>
            </View>

            <View style={styles.cashCard}>
              <View style={styles.cashHeader}>
                <Banknote size={24} color="#10b981" />
                <View style={styles.cashInfo}>
                  <Text style={styles.cashLabel}>Available Cash</Text>
                  <Text style={styles.cashAmount}>{formatBalance(cashBalance)}</Text>
                </View>
              </View>
              <Text style={styles.cashDescription}>
                Cash available for business operations
              </Text>
            </View>
          </View>
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  summaryCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: '#3f66ac',
  },
  summaryHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3f66ac',
    marginBottom: 8,
  },
  summaryAmount: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
  },
  summaryBreakdown: {
    gap: 8,
  },
  summaryItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    marginLeft: 8,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  addButton: {
    backgroundColor: '#3f66ac',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 6,
  },
  emptyState: {
    alignItems: 'center',
    padding: 32,
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  emptyStateButton: {
    backgroundColor: '#3f66ac',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  emptyStateButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  accountCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  accountInfo: {
    flex: 1,
  },
  bankName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  accountHolder: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  accountNumber: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'monospace',
  },
  accountBalance: {
    alignItems: 'flex-end',
  },
  balanceAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: '#10b981',
    marginBottom: 4,
  },
  primaryBadge: {
    backgroundColor: '#3f66ac',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 4,
  },
  primaryBadgeText: {
    color: '#ffffff',
    fontSize: 10,
    fontWeight: '600',
  },
  accountActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  actionButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    color: '#3f66ac',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
    borderColor: '#fecaca',
  },
  deleteButtonText: {
    color: '#dc2626',
  },
  editCashButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  editCashButtonText: {
    fontSize: 12,
    fontWeight: '500',
    marginLeft: 4,
    color: '#3f66ac',
  },
  cashCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#10b981',
  },
  cashHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  cashInfo: {
    marginLeft: 12,
    flex: 1,
  },
  cashLabel: {
    fontSize: 14,
    color: '#047857',
    marginBottom: 4,
  },
  cashAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  cashDescription: {
    fontSize: 12,
    color: '#047857',
    fontStyle: 'italic',
  },
});
