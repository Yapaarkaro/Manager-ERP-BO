import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  Animated,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CreditCard, Plus, CreditCard as Edit3, Trash2, Check, ArrowRight, Building2, IndianRupee, ChevronDown, ChevronUp } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';

interface BankAccount {
  id: string;
  bankId: string;
  bankName: string;
  bankShortName: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  branchName: string;
  accountType: string;
  initialBalance: number;
  isPrimary: boolean;
  createdAt: string;
}

export default function BankAccountsScreen() {
  const { 
    type,
    value,
    gstinData,
    name,
    businessName,
    businessType,
    customBusinessType,
    allAddresses,
    allBankAccounts = '[]',
  } = useLocalSearchParams();

  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set(['primary']));
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [accountToDelete, setAccountToDelete] = useState<string | null>(null);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const colors = useThemeColors();

  useEffect(() => {
    // Load bank accounts
    try {
      const accounts = JSON.parse(allBankAccounts as string);
      setBankAccounts(accounts);
      console.log('Loaded bank accounts:', accounts);
    } catch (error) {
      console.log('No bank accounts to load');
      setBankAccounts([]);
    }

    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, []);

  const toggleSection = (section: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(section)) {
      newExpanded.delete(section);
    } else {
      newExpanded.add(section);
    }
    setExpandedSections(newExpanded);
  };

  const getPrimaryAccounts = () => {
    return bankAccounts.filter(account => account.isPrimary);
  };

  const getSecondaryAccounts = () => {
    return bankAccounts.filter(account => !account.isPrimary);
  };

  const formatAccountNumber = (accountNumber: string) => {
    // Mask account number for security
    if (accountNumber.length <= 4) return accountNumber;
    const visibleDigits = accountNumber.slice(-4);
    const maskedPart = '*'.repeat(Math.max(0, accountNumber.length - 4));
    return maskedPart + visibleDigits;
  };

  const formatBalance = (balance: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(balance);
  };

  const handleAddBankAccount = () => {
    router.push({
      pathname: '/auth/banking-details',
      params: {
        type,
        value,
        gstinData,
        name,
        businessName,
        businessType,
        customBusinessType,
        allAddresses,
        allBankAccounts: JSON.stringify(bankAccounts),
        isAddingSecondary: 'true',
      }
    });
  };

  const handleEditAccount = (account: BankAccount) => {
    router.push({
      pathname: '/auth/banking-details',
      params: {
        type,
        value,
        gstinData,
        name,
        businessName,
        businessType,
        customBusinessType,
        allAddresses,
        allBankAccounts: JSON.stringify(bankAccounts),
        editMode: 'true',
        editAccountId: account.id,
        prefilledBankId: account.bankId,
        prefilledAccountHolderName: account.accountHolderName,
        prefilledAccountNumber: account.accountNumber,
        prefilledIFSC: account.ifscCode,
        prefilledAccountType: account.accountType,
        prefilledInitialBalance: account.initialBalance.toString(),
      }
    });
  };

  const handleDeleteAccount = (accountId: string) => {
    setAccountToDelete(accountId);
    setShowDeleteModal(true);
  };

  const confirmDeleteAccount = () => {
    if (accountToDelete) {
      setBankAccounts(prev => prev.filter(acc => acc.id !== accountToDelete));
      setAccountToDelete(null);
      setShowDeleteModal(false);
    }
  };

  const handleContinue = () => {
    if (bankAccounts.length === 0) {
      Alert.alert('No Bank Account', 'Please add at least one bank account to continue');
      return;
    }

    // Navigate to final setup screen
    router.push({
      pathname: '/auth/final-setup',
      params: {
        type,
        value,
        gstinData,
        name,
        businessName,
        businessType,
        customBusinessType,
        allAddresses,
        allBankAccounts: JSON.stringify(bankAccounts),
      }
    });
  };

  const renderBankAccountCard = (account: BankAccount) => {
    return (
      <View key={account.id} style={styles.accountCard}>
        <View style={styles.accountHeader}>
          <View style={styles.accountTypeContainer}>
            <View style={[
              styles.accountTypeIcon,
              { backgroundColor: account.isPrimary ? '#3f66ac' : '#10b981' }
            ]}>
              <CreditCard size={20} color="#ffffff" />
            </View>
            <View style={styles.accountTypeText}>
              <Text style={[
                styles.accountTypeLabel,
                { color: account.isPrimary ? '#3f66ac' : '#10b981' }
              ]}>
                {account.bankShortName}
              </Text>
              <Text style={styles.accountTypeBadge}>
                {account.isPrimary ? 'PRIMARY' : 'SECONDARY'}
              </Text>
            </View>
          </View>
          
          <View style={styles.accountActions}>
            <TouchableOpacity
              style={[styles.actionButton, styles.editButton]}
              onPress={() => handleEditAccount(account)}
              activeOpacity={0.7}
            >
              <Edit3 size={16} color="#64748b" />
            </TouchableOpacity>
            {!account.isPrimary && (
              <TouchableOpacity
                style={[styles.actionButton, styles.deleteButton]}
                onPress={() => handleDeleteAccount(account.id)}
                activeOpacity={0.7}
              >
                <Trash2 size={16} color="#ef4444" />
              </TouchableOpacity>
            )}
          </View>
        </View>

        <View style={styles.accountContent}>
          <Text style={styles.bankName}>{account.bankName}</Text>
          <Text style={styles.accountHolderName}>{account.accountHolderName}</Text>
          
          <View style={styles.accountDetails}>
            <View style={styles.accountDetailRow}>
              <Text style={styles.accountDetailLabel}>Account Number:</Text>
              <Text style={styles.accountDetailValue}>
                {formatAccountNumber(account.accountNumber)}
              </Text>
            </View>
            
            <View style={styles.accountDetailRow}>
              <Text style={styles.accountDetailLabel}>IFSC Code:</Text>
              <Text style={styles.accountDetailValue}>{account.ifscCode}</Text>
            </View>
            
            <View style={styles.accountDetailRow}>
              <Text style={styles.accountDetailLabel}>Account Type:</Text>
              <Text style={styles.accountDetailValue}>{account.accountType}</Text>
            </View>
            
            <View style={styles.accountDetailRow}>
              <Text style={styles.accountDetailLabel}>Balance:</Text>
              <Text style={[styles.accountDetailValue, styles.balanceValue]}>
                {formatBalance(account.initialBalance)}
              </Text>
            </View>
          </View>
        </View>
      </View>
    );
  };

  const renderAccountSection = (sectionType: 'primary' | 'secondary') => {
    const accounts = sectionType === 'primary' ? getPrimaryAccounts() : getSecondaryAccounts();
    const isExpanded = expandedSections.has(sectionType);
    const sectionTitle = sectionType === 'primary' ? 'Primary Bank Account' : 'Additional Bank Accounts';
    const sectionColor = sectionType === 'primary' ? '#3f66ac' : '#10b981';

    return (
      <View key={sectionType} style={styles.accountSection}>
        {/* Section Header */}
        <TouchableOpacity
          style={[styles.sectionHeader, { borderColor: sectionColor }]}
          onPress={() => toggleSection(sectionType)}
          activeOpacity={0.7}
        >
          <View style={styles.sectionHeaderLeft}>
            <View style={[styles.sectionIcon, { backgroundColor: sectionColor }]}>
              <CreditCard size={24} color="#ffffff" />
            </View>
            <View style={styles.sectionHeaderText}>
              <Text style={[styles.sectionTitle, { color: sectionColor }]}>
                {sectionTitle}
              </Text>
              <Text style={styles.sectionCount}>
                {accounts.length} {accounts.length === 1 ? 'account' : 'accounts'}
              </Text>
            </View>
          </View>
          
          <View style={styles.sectionHeaderRight}>
            {accounts.length > 0 && (
              <View style={[styles.countBadge, { backgroundColor: sectionColor }]}>
                <Text style={styles.countBadgeText}>{accounts.length}</Text>
              </View>
            )}
            {isExpanded ? (
              <ChevronUp size={20} color={sectionColor} />
            ) : (
              <ChevronDown size={20} color={sectionColor} />
            )}
          </View>
        </TouchableOpacity>

        {/* Section Content */}
        {isExpanded && (
          <View style={styles.sectionContent}>
            {accounts.length > 0 ? (
              <>
                {accounts.map(renderBankAccountCard)}
                
                {/* Add More Button for secondary accounts */}
                {sectionType === 'secondary' && (
                  <TouchableOpacity
                    style={[styles.addMoreButton, { borderColor: sectionColor }]}
                    onPress={handleAddBankAccount}
                    activeOpacity={0.7}
                  >
                    <Plus size={20} color={sectionColor} />
                    <Text style={[styles.addMoreText, { color: sectionColor }]}>
                      Add Another Bank Account
                    </Text>
                  </TouchableOpacity>
                )}
              </>
            ) : (
              <View style={styles.emptySection}>
                <Text style={styles.emptySectionText}>
                  {sectionType === 'primary' 
                    ? 'No primary bank account added yet' 
                    : 'No additional bank accounts added yet'}
                </Text>
                {sectionType === 'secondary' && (
                  <TouchableOpacity
                    style={[styles.addFirstButton, { backgroundColor: sectionColor }]}
                    onPress={handleAddBankAccount}
                    activeOpacity={0.7}
                  >
                    <Plus size={16} color="#ffffff" />
                    <Text style={styles.addFirstButtonText}>
                      Add First Additional Account
                    </Text>
                  </TouchableOpacity>
                )}
              </View>
            )}
          </View>
        )}
      </View>
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

  const totalBalance = bankAccounts.reduce((sum, account) => sum + account.initialBalance, 0);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.content, slideTransform]}>
            <View style={styles.iconContainer}>
              <View style={styles.iconWrapper}>
                <Check size={48} color="#10b981" strokeWidth={3} />
              </View>
            </View>

            <View style={styles.textContainer}>
              <Text style={styles.title}>Bank Account Management</Text>
              <Text style={styles.subtitle}>
                Manage your business bank accounts. Add, edit, or remove accounts as needed.
              </Text>
            </View>

            {/* Total Balance Summary */}
            <View style={styles.balanceSummary}>
              <View style={styles.balanceSummaryIcon}>
                <IndianRupee size={24} color="#10b981" />
              </View>
              <View style={styles.balanceSummaryText}>
                <Text style={styles.balanceSummaryLabel}>Total Balance</Text>
                <Text style={styles.balanceSummaryValue}>
                  {formatBalance(totalBalance)}
                </Text>
              </View>
            </View>

            {/* Bank Account Sections */}
            <View style={styles.accountsContainer}>
              {(['primary', 'secondary'] as const).map(renderAccountSection)}
            </View>

            {/* Quick Add Section */}
            <View style={styles.quickAddContainer}>
              <Text style={styles.quickAddTitle}>Quick Actions</Text>
              <TouchableOpacity
                style={styles.quickAddButton}
                onPress={handleAddBankAccount}
                activeOpacity={0.7}
              >
                <CreditCard size={24} color="#10b981" />
                <Text style={styles.quickAddButtonText}>
                  Add Bank Account
                </Text>
              </TouchableOpacity>
            </View>

            {/* Setup Summary */}
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Setup Summary</Text>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Business Name:</Text>
                <Text style={styles.summaryValue}>{businessName}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Addresses:</Text>
                <Text style={styles.summaryValue}>
                  {allAddresses ? JSON.parse(allAddresses as string).length : 0}
                </Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Bank Accounts:</Text>
                <Text style={styles.summaryValue}>{bankAccounts.length}</Text>
              </View>
              <View style={styles.summaryItem}>
                <Text style={styles.summaryLabel}>Total Balance:</Text>
                <Text style={styles.summaryValue}>{formatBalance(totalBalance)}</Text>
              </View>
            </View>

            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>Continue</Text>
              <ArrowRight size={20} color="#3f66ac" />
            </TouchableOpacity>
          </Animated.View>
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
              <Text style={styles.deleteModalTitle}>Delete Bank Account</Text>
              <Text style={styles.deleteModalText}>
                Are you sure you want to delete this bank account? This action cannot be undone.
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
                  onPress={confirmDeleteAccount}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteModalConfirmText}>Delete</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>
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
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 24,
    paddingTop: 60,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
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
  balanceSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  balanceSummaryIcon: {
    width: 48,
    height: 48,
    backgroundColor: '#10b981',
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  balanceSummaryText: {
    flex: 1,
  },
  balanceSummaryLabel: {
    fontSize: 14,
    color: '#047857',
    marginBottom: 4,
  },
  balanceSummaryValue: {
    fontSize: 24,
    fontWeight: '800',
    color: '#047857',
  },
  accountsContainer: {
    marginBottom: 32,
  },
  accountSection: {
    marginBottom: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderRadius: 16,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  sectionHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  sectionIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  sectionHeaderText: {
    flex: 1,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  sectionCount: {
    fontSize: 14,
    color: '#64748b',
  },
  sectionHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  countBadge: {
    minWidth: 24,
    height: 24,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  countBadgeText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#ffffff',
  },
  sectionContent: {
    paddingTop: 16,
  },
  accountCard: {
    backgroundColor: '#f8fafc',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  accountHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  accountTypeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  accountTypeIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  accountTypeText: {
    flex: 1,
  },
  accountTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 2,
  },
  accountTypeBadge: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '500',
  },
  accountActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  editButton: {
    backgroundColor: '#f1f5f9',
  },
  deleteButton: {
    backgroundColor: '#fef2f2',
  },
  accountContent: {
    marginTop: 8,
  },
  bankName: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 4,
  },
  accountHolderName: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  accountDetails: {
    gap: 8,
  },
  accountDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  accountDetailLabel: {
    fontSize: 12,
    color: '#64748b',
    flex: 1,
  },
  accountDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },
  balanceValue: {
    color: '#10b981',
    fontSize: 14,
  },
  emptySection: {
    alignItems: 'center',
    paddingVertical: 32,
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderStyle: 'dashed',
  },
  emptySectionText: {
    fontSize: 16,
    color: '#64748b',
    marginBottom: 16,
    textAlign: 'center',
  },
  addFirstButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  addFirstButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#ffffff',
  },
  addMoreButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  addMoreText: {
    fontSize: 16,
    fontWeight: '600',
  },
  quickAddContainer: {
    marginBottom: 32,
  },
  quickAddTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
  },
  quickAddButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    gap: 8,
  },
  quickAddButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#10b981',
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
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  summaryItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: '#64748b',
    flex: 1,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1a1a1a',
    flex: 1,
    textAlign: 'right',
  },
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffc754',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3f66ac',
  },
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
});