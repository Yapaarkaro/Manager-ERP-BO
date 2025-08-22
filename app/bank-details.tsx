import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
  TextInput,
  Animated,
  Modal,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Building, TrendingUp, TrendingDown, Calendar, FileText, CreditCard, Smartphone, Banknote, Receipt, Plus, ExternalLink, Search, X, Check } from 'lucide-react-native';
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

interface BankTransaction {
  id: string;
  bankAccountId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  reference: string;
  category: string;
  transactionNumber: string;
  source: 'UPI' | 'Card' | 'Cheque' | 'Cash' | 'Bank Transfer' | 'NEFT' | 'RTGS' | 'IMPS' | 'Other';
  relatedInvoiceId?: string;
  relatedCustomerId?: string;
  relatedSupplierId?: string;
  createdAt: string;
  // Cheque specific fields
  chequeNumber?: string;
  chequeDate?: string;
  isCleared?: boolean;
  clearanceDate?: string;
}

export default function BankDetailsScreen() {
  const { bankAccountId } = useLocalSearchParams();
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [showAddTransaction, setShowAddTransaction] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [filteredTransactions, setFilteredTransactions] = useState<BankTransaction[]>([]);
  const [currentSearchText, setCurrentSearchText] = useState('');
  const [cursorVisible, setCursorVisible] = useState(true);
  const [showUnclearedCheques, setShowUnclearedCheques] = useState(false);
  const [showChequeConfirmation, setShowChequeConfirmation] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [chequeAction, setChequeAction] = useState<'clear' | 'bounce' | null>(null);
  const [clearanceDate, setClearanceDate] = useState('');
  const [bounceReason, setBounceReason] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(false);
  
  const searchTerms = ['amount', 'date', 'customer', 'supplier', 'invoice number'];

  useEffect(() => {
    loadBankAccount();
    startTypewriterAnimation();
  }, [bankAccountId]);

  useEffect(() => {
    if (bankAccount) {
      loadTransactions();
    }
  }, [bankAccount, bankAccountId]);

  const startTypewriterAnimation = () => {
    let termIndex = 0;
    let charIndex = 0;
    let isDeleting = false;
    
    const typewriterEffect = () => {
      const currentTerm = searchTerms[termIndex];
      
      if (!isDeleting) {
        // Typing effect
        setCurrentSearchText(currentTerm.substring(0, charIndex + 1));
        charIndex++;
        
        if (charIndex === currentTerm.length) {
          // Adaptive pause based on word length - shorter words get more time
          const baseTime = 1200; // Base reading time
          const lengthBonus = Math.max(0, (8 - currentTerm.length) * 200); // Extra time for short words
          const readingTime = baseTime + lengthBonus;
          
          setTimeout(() => {
            isDeleting = true;
            typewriterEffect();
          }, readingTime);
          return;
        }
      } else {
        // Deleting effect
        setCurrentSearchText(currentTerm.substring(0, charIndex - 1));
        charIndex--;
        
        if (charIndex === 0) {
          isDeleting = false;
          termIndex = (termIndex + 1) % searchTerms.length;
          setTimeout(typewriterEffect, 400);
          return;
        }
      }
      
      // Adaptive typing speed - shorter words type slower for visibility
      let typingSpeed, deletingSpeed;
      
      if (currentTerm.length <= 4) {
        // Short words: slower typing for better visibility
        typingSpeed = 150;
        deletingSpeed = 100;
      } else if (currentTerm.length <= 8) {
        // Medium words: normal speed
        typingSpeed = 120;
        deletingSpeed = 80;
      } else {
        // Long words: faster typing since they're easier to recognize
        typingSpeed = 100;
        deletingSpeed = 70;
      }
      
      const speed = isDeleting ? deletingSpeed : typingSpeed;
      setTimeout(typewriterEffect, speed);
    };
    
    // Start the animation
    typewriterEffect();
    
    // Cursor blinking
    const cursorInterval = setInterval(() => {
      setCursorVisible(prev => !prev);
    }, 600);
    
    return () => clearInterval(cursorInterval);
  };

  const loadBankAccount = () => {
    if (bankAccountId) {
      const account = dataStore.getBankAccountById(bankAccountId as string);
      setBankAccount(account || null);
    }
  };

  const loadTransactions = () => {
    if (bankAccountId) {
      const accountTransactions = dataStore.getBankTransactions(bankAccountId as string);
      setTransactions(accountTransactions);
      setFilteredTransactions(accountTransactions);
      
      // Calculate current balance properly (excluding uncleared cheques)
      const openingBalance = bankAccount?.balance || 0;
      const totalCredit = accountTransactions
        .filter(t => t.type === 'credit' && (t.source !== 'Cheque' || t.isCleared))
        .reduce((sum, t) => sum + t.amount, 0);
      const totalDebit = accountTransactions
        .filter(t => t.type === 'debit' && (t.source !== 'Cheque' || t.isCleared))
        .reduce((sum, t) => sum + t.amount, 0);
      
      setCurrentBalance(openingBalance + totalCredit - totalDebit);
    }
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (!query.trim()) {
      setFilteredTransactions(transactions);
      return;
    }

    const filtered = transactions.filter(transaction => {
      const searchLower = query.toLowerCase();
      
      // Search by invoice number
      if (transaction.relatedInvoiceId?.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search by customer name (if available)
      if (transaction.relatedCustomerId) {
        const customer = dataStore.getCustomerById(transaction.relatedCustomerId);
        if (customer?.name.toLowerCase().includes(searchLower) || 
            customer?.businessName?.toLowerCase().includes(searchLower)) {
          return true;
        }
      }
      
      // Search by supplier name (if available)
      if (transaction.relatedSupplierId) {
        const supplier = dataStore.getSupplierById(transaction.relatedSupplierId);
        if (supplier?.name.toLowerCase().includes(searchLower) || 
            supplier?.businessName?.toLowerCase().includes(searchLower)) {
          return true;
        }
      }
      
      // Search by date
      if (transaction.date.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search by amount
      if (transaction.amount.toString().includes(searchLower)) {
        return true;
      }
      
      // Search by description
      if (transaction.description.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      // Search by transaction number
      if (transaction.transactionNumber.toLowerCase().includes(searchLower)) {
        return true;
      }
      
      return false;
    });
    
    setFilteredTransactions(filtered);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    });
  };

  const getSourceIcon = (source: string) => {
    switch (source) {
      case 'UPI':
        return <Smartphone size={16} color={Colors.primary} />;
      case 'Card':
        return <CreditCard size={16} color={Colors.primary} />;
      case 'Cheque':
        return <Receipt size={16} color={Colors.primary} />;
      case 'Cash':
        return <Banknote size={16} color={Colors.primary} />;
      case 'Bank Transfer':
      case 'NEFT':
      case 'RTGS':
      case 'IMPS':
        return <Building size={16} color={Colors.primary} />;
      default:
        return <FileText size={16} color={Colors.primary} />;
    }
  };

  const getSourceColor = (source: string) => {
    switch (source) {
      case 'UPI':
        return Colors.primary;
      case 'Card':
        return Colors.success;
      case 'Cheque':
        return Colors.warning;
      case 'Cash':
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const handleTransactionPress = (transaction: BankTransaction) => {
    // Navigate to transaction details screen
    router.push({
      pathname: '/transaction-details',
      params: {
        transactionId: transaction.id,
        bankAccountId: bankAccountId as string,
      }
    });
  };

  const getTotalCredit = () => {
    return transactions
      .filter(t => t.type === 'credit')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getTotalDebit = () => {
    return transactions
      .filter(t => t.type === 'debit')
      .reduce((sum, t) => sum + t.amount, 0);
  };

  const getUnclearedChequeAmount = () => {
    return transactions
      .filter(t => t.source === 'Cheque' && !t.isCleared)
      .reduce((sum, t) => {
        if (t.type === 'credit') {
          return sum + t.amount;
        } else {
          return sum - t.amount;
        }
      }, 0);
  };

  const getUnclearedCheques = () => {
    return transactions.filter(t => t.source === 'Cheque' && !t.isCleared);
  };

  const handleViewUnclearedCheques = () => {
    setShowUnclearedCheques(true);
  };

  const handleQuickClearCheque = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    setChequeAction('clear');
    setClearanceDate(new Date().toISOString().split('T')[0]); // Default to today
    setShowChequeConfirmation(true);
  };

  const handleQuickBounceCheque = (transaction: BankTransaction) => {
    setSelectedTransaction(transaction);
    setChequeAction('bounce');
    setBounceReason(''); // Reset reason
    setNotifyCustomer(false); // Reset notification option
    setShowChequeConfirmation(true);
  };

  const handleConfirmChequeAction = () => {
    if (!selectedTransaction || !chequeAction) return;

    if (chequeAction === 'clear') {
      if (!clearanceDate) {
        Alert.alert('Error', 'Please select a clearance date.');
        return;
      }
      
      const success = dataStore.clearCheque(selectedTransaction.id, clearanceDate);
      if (success) {
        loadTransactions();
        Alert.alert('Success', 'Cheque cleared successfully!');
        handleCloseChequeConfirmation();
      } else {
        Alert.alert('Error', 'Failed to clear cheque. Please try again.');
      }
    } else if (chequeAction === 'bounce') {
      if (!bounceReason.trim()) {
        Alert.alert('Error', 'Please provide a reason for bouncing the cheque.');
        return;
      }
      
      const success = dataStore.bounceCheque(selectedTransaction.id);
      if (success) {
        loadTransactions();
        
        // Show notification option if enabled
        if (notifyCustomer) {
          const customerName = selectedTransaction.relatedCustomerId 
            ? dataStore.getCustomerById(selectedTransaction.relatedCustomerId)?.name || 'Customer'
            : 'Customer';
          
          Alert.alert(
            'Notification Sent',
            `${customerName} has been notified about the bounced cheque.\n\nReason: ${bounceReason}`,
            [{ text: 'OK' }]
          );
        } else {
          Alert.alert('Success', 'Cheque bounced successfully!');
        }
        
        handleCloseChequeConfirmation();
      } else {
        Alert.alert('Error', 'Failed to bounce cheque. Please try again.');
      }
    }
  };

  const handleCloseChequeConfirmation = () => {
    setShowChequeConfirmation(false);
    setSelectedTransaction(null);
    setChequeAction(null);
    setClearanceDate('');
    setBounceReason('');
    setNotifyCustomer(false);
  };

  if (!bankAccount) {
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
            <Text style={styles.headerTitle}>Bank Account</Text>
            <TouchableOpacity
              style={styles.searchButton}
              onPress={() => setShowSearch(!showSearch)}
              activeOpacity={0.7}
            >
              <Search size={24} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Bank account not found</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>{bankAccount.bankName}</Text>
          <TouchableOpacity
            style={styles.searchButton}
            onPress={() => setShowSearch(!showSearch)}
            activeOpacity={0.7}
          >
            <Search size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Search Bar */}
      {showSearch && (
        <View style={styles.searchContainer}>
          <View style={styles.searchInputContainer}>
            <Search size={20} color={Colors.textLight} style={styles.searchIcon} />
            {searchQuery.length === 0 ? (
              <View style={styles.searchHintContainer}>
                <Text style={styles.searchHintText}>Search using: </Text>
                <Text style={styles.animatedText}>{currentSearchText}</Text>
                <View
                  style={[
                    styles.cursor,
                    {
                      opacity: cursorVisible ? 1 : 0,
                    },
                  ]}
                />
              </View>
            ) : (
              <TextInput
                style={styles.searchInput}
                placeholder=""
                value={searchQuery}
                onChangeText={handleSearch}
                placeholderTextColor={Colors.textLight}
              />
            )}
            {searchQuery.length > 0 && (
              <TouchableOpacity
                style={styles.clearSearchButton}
                onPress={() => {
                  setSearchQuery('');
                  setFilteredTransactions(transactions);
                }}
              >
                <Text style={styles.clearSearchText}>✕</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      )}

      {/* Account Details at Top */}
      <View style={styles.compactAccountSection}>
        <View style={styles.compactAccountCard}>
          <View style={styles.compactAccountIcon}>
            <Building size={16} color={Colors.primary} />
          </View>
          <Text style={styles.compactAccountText}>
            {bankAccount.accountHolderName} • {bankAccount.accountNumber}
          </Text>
        </View>
      </View>

      {/* Balance Overview at Top */}
      <View style={styles.topBalanceSection}>
        <View style={styles.topBalanceContainer}>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Opening Balance:</Text>
            <Text style={styles.balanceValue}>
              {formatAmount(bankAccount.balance || 0)}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Total Credit:</Text>
            <Text style={[styles.balanceValue, { color: Colors.success }]}>
              {formatAmount(getTotalCredit())}
            </Text>
          </View>
          <View style={styles.balanceRow}>
            <Text style={styles.balanceLabel}>Total Debit:</Text>
            <Text style={styles.balanceValue}>
              {formatAmount(getTotalDebit())}
            </Text>
          </View>
          <View style={[styles.balanceRow, styles.finalBalanceRow]}>
            <Text style={styles.finalBalanceLabel}>Current Balance:</Text>
            <Text style={styles.finalBalanceValue}>
              {formatAmount(currentBalance)}
            </Text>
          </View>
          {getUnclearedChequeAmount() !== 0 && (
            <View style={styles.balanceRow}>
              <Text style={styles.balanceLabel}>Uncleared Cheques:</Text>
              <Text style={[styles.balanceValue, { color: Colors.warning }]}>
                {getUnclearedChequeAmount() > 0 ? '+' : ''}{formatAmount(getUnclearedChequeAmount())}
              </Text>
            </View>
          )}
        </View>
      </View>

      {/* Credit and Debit Overview Cards Below Balance */}
      <View style={styles.overviewCardsSection}>
        <View style={styles.overviewCards}>
          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Credit</Text>
            <Text style={[styles.overviewAmount, { color: Colors.success }]}>
              {formatAmount(getTotalCredit())}
            </Text>
          </View>

          <View style={styles.overviewCard}>
            <Text style={styles.overviewLabel}>Debit</Text>
            <Text style={[styles.overviewAmount, { color: Colors.error }]}>
              {formatAmount(getTotalDebit())}
            </Text>
          </View>
        </View>
      </View>

      {/* Transactions Section */}
      <View style={styles.transactionsSection}>
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Transaction History</Text>
          <Text style={styles.transactionCount}>
            {filteredTransactions.length} transactions
          </Text>
        </View>

        {filteredTransactions.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={48} color={Colors.grey[300]} />
            <Text style={styles.emptyStateTitle}>
              {searchQuery ? 'No matching transactions' : 'No Transactions'}
            </Text>
            <Text style={styles.emptyStateSubtitle}>
              {searchQuery 
                ? 'Try adjusting your search criteria'
                : 'Transactions will appear here when you make or receive payments'
              }
            </Text>
          </View>
        ) : (
          <ScrollView 
            style={styles.transactionsScrollView} 
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.transactionsContent}
          >
            {filteredTransactions.map((transaction) => (
              <View key={transaction.id} style={styles.transactionCardContainer}>
                <TouchableOpacity
                  style={[
                    styles.transactionCard,
                    transaction.source === 'Cheque' && !transaction.isCleared && styles.unclearedChequeCard
                  ]}
                  onPress={() => handleTransactionPress(transaction)}
                  activeOpacity={0.7}
                >
                  {/* Main Transaction Row */}
                  <View style={styles.transactionMainRow}>
                    {/* Left Side - Transaction Info */}
                    <View style={styles.transactionLeft}>
                      <View style={styles.transactionHeader}>
                        <Text style={styles.transactionDescription}>
                          {transaction.description}
                        </Text>
                        {/* Uncleared Cheque Badge */}
                        {transaction.source === 'Cheque' && !transaction.isCleared && (
                          <View style={styles.unclearedBadge}>
                            <Receipt size={12} color={Colors.background} />
                            <Text style={styles.unclearedBadgeText}>Uncleared</Text>
                          </View>
                        )}
                      </View>
                      <View style={styles.transactionMeta}>
                        <Text style={styles.transactionDate}>
                          {formatDate(transaction.date)}
                        </Text>
                        <Text style={styles.transactionId}>
                          {transaction.transactionNumber}
                        </Text>
                      </View>
                    </View>

                    {/* Right Side - Amount & Source */}
                    <View style={styles.transactionRight}>
                      {/* Amount */}
                      <Text style={[
                        styles.transactionAmount,
                        { color: transaction.type === 'credit' ? Colors.success : Colors.error }
                      ]}>
                        {transaction.type === 'credit' ? '+' : '-'}{formatAmount(transaction.amount)}
                      </Text>
                      
                      {/* Source */}
                      <Text style={[styles.sourceText, { color: getSourceColor(transaction.source) }]}>
                        {transaction.source}
                      </Text>
                    </View>
                  </View>

                  {/* Click Indicator */}
                  <View style={styles.clickIndicator}>
                    <Text style={styles.clickText}>Tap for details</Text>
                    <ExternalLink size={14} color={Colors.primary} />
                  </View>
                </TouchableOpacity>

                {/* Quick Actions for Uncleared Cheques */}
                {transaction.source === 'Cheque' && !transaction.isCleared && (
                  <View style={styles.quickActionsContainer}>
                    <TouchableOpacity
                      style={styles.clearChequeQuickButton}
                      onPress={() => handleQuickClearCheque(transaction)}
                      activeOpacity={0.7}
                    >
                      <Check size={14} color={Colors.background} />
                      <Text style={styles.clearChequeQuickButtonText}>Clear Cheque</Text>
                    </TouchableOpacity>
                    
                    <TouchableOpacity
                      style={styles.bounceChequeQuickButton}
                      onPress={() => handleQuickBounceCheque(transaction)}
                      activeOpacity={0.7}
                    >
                      <X size={14} color={Colors.background} />
                      <Text style={styles.bounceChequeQuickButtonText}>Bounce</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ))}
          </ScrollView>
        )}
      </View>



      {/* Uncleared Cheques Button - Above Add Transaction */}
      {getUnclearedCheques().length > 0 && (
        <View style={styles.unclearedChequesButtonContainer}>
          <TouchableOpacity
            style={styles.unclearedChequesButton}
            onPress={handleViewUnclearedCheques}
            activeOpacity={0.7}
          >
            <Receipt size={20} color={Colors.background} />
            <Text style={styles.unclearedChequesButtonText}>
              View Uncleared Cheques ({getUnclearedCheques().length})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Add Transaction Button - Fixed at Bottom */}
      <View style={styles.bottomButtonContainer}>
        <TouchableOpacity
          style={styles.bottomButton}
          onPress={() => setShowAddTransaction(true)}
          activeOpacity={0.7}
        >
          <Plus size={20} color={Colors.background} />
          <Text style={styles.bottomButtonText}>Add Transaction</Text>
        </TouchableOpacity>
      </View>

      {/* Uncleared Cheques Modal */}
      <Modal
        visible={showUnclearedCheques}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowUnclearedCheques(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Uncleared Cheques</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowUnclearedCheques(false)}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              <Text style={styles.modalSubtitle}>
                You have {getUnclearedCheques().length} uncleared cheque(s) that need attention
              </Text>
              
              <ScrollView style={styles.chequesList} showsVerticalScrollIndicator={false}>
                {getUnclearedCheques().map((cheque) => (
                  <View key={cheque.id} style={styles.chequeItemContainer}>
                    <View style={styles.chequeItem}>
                      <View style={styles.chequeItemHeader}>
                        <View style={styles.chequeItemLeft}>
                          <Receipt size={20} color={Colors.warning} />
                          <Text style={styles.chequeItemTitle}>
                            {cheque.description}
                          </Text>
                        </View>
                        <Text style={[
                          styles.chequeItemAmount,
                          { color: cheque.type === 'credit' ? Colors.success : Colors.error }
                        ]}>
                          {cheque.type === 'credit' ? '+' : '-'}{formatAmount(cheque.amount)}
                        </Text>
                      </View>
                      
                      <View style={styles.chequeItemDetails}>
                        {cheque.chequeNumber && (
                          <Text style={styles.chequeItemDetail}>
                            Cheque #: {cheque.chequeNumber}
                          </Text>
                        )}
                        {cheque.chequeDate && (
                          <Text style={styles.chequeItemDetail}>
                            Date: {formatDate(cheque.chequeDate)}
                          </Text>
                        )}
                        <Text style={styles.chequeItemDetail}>
                          Reference: {cheque.reference}
                        </Text>
                      </View>
                      
                      <View style={styles.chequeItemAction}>
                        <Text style={styles.chequeItemActionText}>Quick Actions Available</Text>
                      </View>
                    </View>

                    {/* Quick Action Buttons for Uncleared Cheques */}
                    <View style={styles.chequeItemQuickActions}>
                      <TouchableOpacity
                        style={styles.chequeItemClearButton}
                        onPress={() => {
                          setShowUnclearedCheques(false);
                          handleQuickClearCheque(cheque);
                        }}
                        activeOpacity={0.7}
                      >
                        <Check size={14} color={Colors.background} />
                        <Text style={styles.chequeItemClearButtonText}>Clear Cheque</Text>
                      </TouchableOpacity>
                      
                      <TouchableOpacity
                        style={styles.chequeItemBounceButton}
                        onPress={() => {
                          setShowUnclearedCheques(false);
                          handleQuickBounceCheque(cheque);
                        }}
                        activeOpacity={0.7}
                      >
                        <X size={14} color={Colors.background} />
                        <Text style={styles.chequeItemBounceButtonText}>Bounce Cheque</Text>
                      </TouchableOpacity>
                    </View>
                  </View>
                ))}
              </ScrollView>
            </View>
          </View>
        </View>
      </Modal>

      {/* Enhanced Cheque Confirmation Modal */}
      <Modal
        visible={showChequeConfirmation}
        transparent={true}
        animationType="slide"
        onRequestClose={handleCloseChequeConfirmation}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.confirmationModalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {chequeAction === 'clear' ? 'Clear Cheque' : 'Bounce Cheque'}
              </Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={handleCloseChequeConfirmation}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalBody}>
              {/* Cheque Details Section */}
              <View style={styles.chequeDetailsSection}>
                <Text style={styles.chequeDetailsSectionTitle}>Cheque Details</Text>
                <View style={styles.chequeDetailsCard}>
                  <View style={styles.chequeDetailRow}>
                    <Text style={styles.chequeDetailLabel}>Cheque Number:</Text>
                    <Text style={styles.chequeDetailValue}>{selectedTransaction?.chequeNumber}</Text>
                  </View>
                  <View style={styles.chequeDetailRow}>
                    <Text style={styles.chequeDetailLabel}>Amount:</Text>
                    <Text style={styles.chequeDetailValue}>
                      {selectedTransaction && formatAmount(selectedTransaction.amount)}
                    </Text>
                  </View>
                  <View style={styles.chequeDetailRow}>
                    <Text style={styles.chequeDetailLabel}>Description:</Text>
                    <Text style={styles.chequeDetailValue}>{selectedTransaction?.description}</Text>
                  </View>
                  {selectedTransaction?.chequeDate && (
                    <View style={styles.chequeDetailRow}>
                      <Text style={styles.chequeDetailLabel}>Cheque Date:</Text>
                      <Text style={styles.chequeDetailValue}>
                        {formatDate(selectedTransaction.chequeDate)}
                      </Text>
                    </View>
                  )}
                </View>
              </View>

              {/* Clear Cheque Section */}
              {chequeAction === 'clear' && (
                <View style={styles.actionSection}>
                  <Text style={styles.actionSectionTitle}>Clearance Details</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Clearance Date *</Text>
                    <TextInput
                      style={styles.dateInput}
                      value={clearanceDate}
                      onChangeText={setClearanceDate}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.textLight}
                    />
                    <Text style={styles.inputNote}>
                      Date when the cheque was cleared by the bank
                    </Text>
                  </View>
                </View>
              )}

              {/* Bounce Cheque Section */}
              {chequeAction === 'bounce' && (
                <View style={styles.actionSection}>
                  <Text style={styles.actionSectionTitle}>Bounce Details</Text>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Reason for Bounce *</Text>
                    <TextInput
                      style={styles.reasonTextArea}
                      value={bounceReason}
                      onChangeText={setBounceReason}
                      placeholder="Enter reason for cheque bounce (e.g., Insufficient funds, Account closed, etc.)"
                      placeholderTextColor={Colors.textLight}
                      multiline={true}
                      numberOfLines={3}
                      textAlignVertical="top"
                    />
                  </View>

                  {/* Customer Notification Option */}
                  <View style={styles.notificationSection}>
                    <TouchableOpacity
                      style={styles.notificationToggle}
                      onPress={() => setNotifyCustomer(!notifyCustomer)}
                      activeOpacity={0.7}
                    >
                      <View style={[styles.checkbox, notifyCustomer && styles.checkboxChecked]}>
                        {notifyCustomer && <Check size={16} color={Colors.background} />}
                      </View>
                      <View style={styles.notificationTextContainer}>
                        <Text style={styles.notificationLabel}>Notify Customer/Supplier</Text>
                        <Text style={styles.notificationDescription}>
                          Send notification about the bounced cheque with reason
                        </Text>
                      </View>
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Action Buttons */}
              <View style={styles.confirmationModalButtons}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={handleCloseChequeConfirmation}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.confirmActionButton,
                    chequeAction === 'clear' ? styles.clearActionButton : styles.bounceActionButton,
                    (chequeAction === 'clear' && !clearanceDate) || 
                    (chequeAction === 'bounce' && !bounceReason.trim()) ? styles.disabledButton : {}
                  ]}
                  onPress={handleConfirmChequeAction}
                  disabled={
                    (chequeAction === 'clear' && !clearanceDate) || 
                    (chequeAction === 'bounce' && !bounceReason.trim())
                  }
                  activeOpacity={0.7}
                >
                  <Text style={styles.confirmActionButtonText}>
                    {chequeAction === 'clear' ? 'Clear Cheque' : 'Bounce Cheque'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  
  // Fixed Header
  headerSafeArea: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  header: {
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
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'center',
  },
  searchButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  



  // Transactions Section
  transactionsSection: {
    flex: 1,
    marginHorizontal: 16,
    marginTop: 16,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  transactionCount: {
    fontSize: 12,
    color: Colors.textLight,
  },

  // Overview Cards
  overviewCards: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  overviewCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    alignItems: 'center',
  },
  overviewLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  overviewAmount: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 48,
  },
  emptyStateTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },

  // Scrollable Transactions
  transactionsScrollView: {
    flex: 1,
  },
  transactionsContent: {
    paddingBottom: 16,
  },

  // Transaction Cards - Simplified Design
  transactionCard: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  
  // Main Transaction Row
  transactionMainRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  
  // Left Side - Transaction Info
  transactionLeft: {
    flex: 1,
    marginRight: 12,
  },
  transactionDescription: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    lineHeight: 18,
  },
  transactionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  transactionId: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '500',
    backgroundColor: Colors.primary + '15',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  transactionType: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Right Side - Amount & Source
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  sourceText: {
    fontSize: 11,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // Click Indicator
  clickIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  clickText: {
    fontSize: 11,
    color: Colors.textLight,
    fontStyle: 'italic',
  },

  // Balance Row Styles (Used in Top Balance)
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  balanceLabel: {
    fontSize: 13,
    color: Colors.textLight,
  },
  balanceValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  finalBalanceRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
  },
  finalBalanceLabel: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  finalBalanceValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },

  // Compact Account Information at Top
  compactAccountSection: {
    marginHorizontal: 16,
    marginTop: 16,
    marginBottom: 12,
  },
  compactAccountCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    flexDirection: 'row',
    alignItems: 'center',
  },
  compactAccountIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  compactAccountText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },

  // Top Balance Section
  topBalanceSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },
  topBalanceContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },

  // Overview Cards Section
  overviewCardsSection: {
    marginHorizontal: 16,
    marginBottom: 16,
  },

  // Bottom Button Container - App UI Consistent
  unclearedChequesButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  unclearedChequesButton: {
    backgroundColor: Colors.warning,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.warning,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  unclearedChequesButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },

  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalBody: {
    padding: 20,
  },
  modalSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
    textAlign: 'center',
  },

  // Cheques List Styles
  chequesList: {
    maxHeight: 400,
  },
  chequeItem: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  chequeItemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  chequeItemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
  },
  chequeItemTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  chequeItemAmount: {
    fontSize: 18,
    fontWeight: '700',
  },
  chequeItemDetails: {
    marginBottom: 12,
  },
  chequeItemDetail: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  chequeItemAction: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  chequeItemActionText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },

  // Enhanced Uncleared Cheques Modal Styles
  chequeItemContainer: {
    marginBottom: 16,
  },
  chequeItemQuickActions: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.grey[100],
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  chequeItemClearButton: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chequeItemClearButtonText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  chequeItemBounceButton: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  chequeItemBounceButtonText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },



  // Enhanced Transaction Card Styles
  transactionCardContainer: {
    marginBottom: 12,
  },
  unclearedChequeCard: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
    backgroundColor: Colors.grey[50],
  },
  transactionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  unclearedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.warning,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  unclearedBadgeText: {
    color: Colors.background,
    fontSize: 10,
    fontWeight: '600',
  },
  quickActionsContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingTop: 12,
    paddingHorizontal: 16,
    paddingBottom: 16,
    backgroundColor: Colors.grey[100],
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  clearChequeQuickButton: {
    flex: 1,
    backgroundColor: Colors.success,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  clearChequeQuickButtonText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  bounceChequeQuickButton: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  bounceChequeQuickButtonText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },

  // Enhanced Confirmation Modal Styles
  confirmationModalContent: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '95%',
    maxWidth: 450,
    maxHeight: '85%',
  },
  chequeDetailsSection: {
    marginBottom: 20,
  },
  chequeDetailsSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  chequeDetailsCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  chequeDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  chequeDetailLabel: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
  },
  chequeDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1.5,
    textAlign: 'right',
  },
  actionSection: {
    marginBottom: 20,
  },
  actionSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  dateInput: {
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  reasonTextArea: {
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
    minHeight: 80,
  },
  inputNote: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  notificationSection: {
    marginTop: 16,
  },
  notificationToggle: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.grey[300],
    borderRadius: 4,
    marginRight: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxChecked: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  notificationTextContainer: {
    flex: 1,
  },
  notificationLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  notificationDescription: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 16,
  },
  confirmationModalButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 20,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grey[200],
    borderWidth: 1,
    borderColor: Colors.grey[300],
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '500',
  },
  confirmActionButton: {
    flex: 2,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  clearActionButton: {
    backgroundColor: Colors.success,
  },
  bounceActionButton: {
    backgroundColor: Colors.error,
  },
  confirmActionButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },

  bottomButtonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 32,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  bottomButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  bottomButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },

  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
  },

  // Search Bar Styles
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grey[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchIcon: {
    marginRight: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    paddingVertical: 0,
  },
  clearSearchButton: {
    padding: 4,
  },
  clearSearchText: {
    fontSize: 16,
  },
  searchHintContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    paddingHorizontal: 12,
  },
  searchHintText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  animatedText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginLeft: 2,
  },
  cursor: {
    width: 2,
    height: 14,
    backgroundColor: Colors.primary,
    marginLeft: 2,
  },
});
