import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Building2, User, Phone, Mail, MapPin, Calendar, Clock, IndianRupee, FileText, CreditCard, TriangleAlert as AlertTriangle, TrendingUp, TrendingDown, Eye, Download, Share } from 'lucide-react-native';

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

interface TransactionLog {
  id: string;
  type: 'bill' | 'payment' | 'debit_note' | 'adjustment';
  billNumber?: string;
  amount: number;
  date: string;
  description: string;
  paymentMethod?: string;
  status: 'paid' | 'pending' | 'overdue' | 'partial';
  dueDate?: string;
  balanceAfter: number;
}

const mockTransactionLogs: TransactionLog[] = [
  {
    id: '1',
    type: 'bill',
    billNumber: 'BILL-2024-001',
    amount: 250000,
    date: '2024-01-20',
    description: 'iPhone 14 Pro - 10 units',
    status: 'pending',
    dueDate: '2024-02-19',
    balanceAfter: 850000
  },
  {
    id: '2',
    type: 'payment',
    amount: -200000,
    date: '2024-01-18',
    description: 'Payment made via Bank Transfer',
    paymentMethod: 'Bank Transfer',
    status: 'paid',
    balanceAfter: 600000
  },
  {
    id: '3',
    type: 'bill',
    billNumber: 'BILL-2024-002',
    amount: 300000,
    date: '2024-01-15',
    description: 'MacBook Air M2 - 5 units',
    status: 'overdue',
    dueDate: '2024-02-14',
    balanceAfter: 800000
  },
  {
    id: '4',
    type: 'payment',
    amount: -150000,
    date: '2024-01-10',
    description: 'Partial payment via UPI',
    paymentMethod: 'UPI',
    status: 'paid',
    balanceAfter: 500000
  },
  {
    id: '5',
    type: 'bill',
    billNumber: 'BILL-2024-003',
    amount: 400000,
    date: '2024-01-05',
    description: 'AirPods Pro - 20 units',
    status: 'overdue',
    dueDate: '2024-02-04',
    balanceAfter: 650000
  },
];

export default function SupplierDetailsScreen() {
  const { supplierId, supplierData } = useLocalSearchParams();
  const supplier = JSON.parse(supplierData as string);
  const [selectedTab, setSelectedTab] = useState<'summary' | 'transactions'>('summary');

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'bill': return Colors.primary;
      case 'payment': return Colors.error;
      case 'debit_note': return Colors.warning;
      case 'adjustment': return Colors.success;
      default: return Colors.textLight;
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'bill': return FileText;
      case 'payment': return IndianRupee;
      case 'debit_note': return TrendingUp;
      case 'adjustment': return AlertTriangle;
      default: return FileText;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return Colors.success;
      case 'pending': return Colors.warning;
      case 'overdue': return Colors.error;
      case 'partial': return Colors.orange;
      default: return Colors.textLight;
    }
  };

  const handleTransactionPress = (transaction: TransactionLog) => {
    if (transaction.billNumber) {
      // Create mock bill data for navigation
      const mockBill = {
        id: transaction.billNumber.replace('BILL-', ''),
        billNumber: transaction.billNumber,
        supplierName: supplier.supplierName,
        supplierType: supplier.supplierType,
        staffName: 'Current User',
        staffAvatar: supplier.supplierAvatar,
        paymentStatus: transaction.status,
        amount: transaction.amount,
        itemCount: 2,
        date: transaction.date,
        supplierDetails: {
          name: supplier.supplierName,
          mobile: supplier.mobile,
          businessName: supplier.businessName,
          gstin: supplier.gstin,
          address: supplier.address,
          paymentTerms: supplier.paymentTerms,
        }
      };

      router.push({
        pathname: '/bill-details',
        params: {
          billId: mockBill.id,
          billData: JSON.stringify(mockBill)
        }
      });
    }
  };

  const handleMakePayment = () => {
    router.push({
      pathname: '/payables/make-payment',
      params: {
        supplierId: supplier.id,
        supplierData: JSON.stringify(supplier)
      }
    });
  };

  const renderTransactionLog = (transaction: TransactionLog) => {
    const TransactionIcon = getTransactionTypeIcon(transaction.type);
    const typeColor = getTransactionTypeColor(transaction.type);
    const statusColor = getStatusColor(transaction.status);

    return (
      <TouchableOpacity
        key={transaction.id}
        style={styles.transactionCard}
        onPress={() => handleTransactionPress(transaction)}
        activeOpacity={0.7}
      >
        <View style={styles.transactionHeader}>
          <View style={styles.transactionLeft}>
            <View style={[styles.transactionIcon, { backgroundColor: `${typeColor}20` }]}>
              <TransactionIcon size={16} color={typeColor} />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionType}>
                {transaction.type === 'bill' ? 'Bill' :
                 transaction.type === 'payment' ? 'Payment' :
                 transaction.type === 'debit_note' ? 'Debit Note' : 'Adjustment'}
                {transaction.billNumber && ` - ${transaction.billNumber}`}
              </Text>
              <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
              <Text style={styles.transactionDescription}>{transaction.description}</Text>
            </View>
          </View>
          
          <View style={styles.transactionRight}>
            <Text style={[
              styles.transactionAmount,
              { color: transaction.amount > 0 ? Colors.primary : Colors.error }
            ]}>
              {transaction.amount > 0 ? '+' : ''}{formatAmount(transaction.amount)}
            </Text>
            <View style={[
              styles.transactionStatus,
              { backgroundColor: `${statusColor}20` }
            ]}>
              <Text style={[styles.transactionStatusText, { color: statusColor }]}>
                {transaction.status.toUpperCase()}
              </Text>
            </View>
            <Text style={styles.balanceAfter}>
              Balance: {formatAmount(transaction.balanceAfter)}
            </Text>
          </View>
        </View>

        {transaction.dueDate && transaction.status !== 'paid' && (
          <View style={styles.dueDateSection}>
            <Clock size={14} color={Colors.warning} />
            <Text style={styles.dueDateText}>
              Due: {formatDate(transaction.dueDate)}
            </Text>
          </View>
        )}

        {transaction.billNumber && (
          <View style={styles.viewBillButton}>
            <Eye size={14} color={Colors.primary} />
            <Text style={styles.viewBillText}>View Bill</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

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
          
          <Text style={styles.headerTitle}>Supplier Details</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => console.log('Download supplier statement')}
              activeOpacity={0.7}
            >
              <Download size={20} color={Colors.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => console.log('Share supplier details')}
              activeOpacity={0.7}
            >
              <Share size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Supplier Header */}
      <View style={styles.supplierHeader}>
        <Image 
          source={{ uri: supplier.supplierAvatar }}
          style={styles.supplierHeaderAvatar}
        />
        <View style={styles.supplierHeaderInfo}>
          <Text style={styles.supplierHeaderName}>
            {supplier.supplierType === 'business' ? supplier.businessName : supplier.supplierName}
          </Text>
          {supplier.supplierType === 'business' && (
            <Text style={styles.supplierHeaderContact}>Contact: {supplier.supplierName}</Text>
          )}
          <View style={styles.supplierHeaderMeta}>
            {supplier.supplierType === 'business' ? (
              <Building2 size={16} color={Colors.textLight} />
            ) : (
              <User size={16} color={Colors.textLight} />
            )}
            <Text style={styles.supplierHeaderType}>
              {supplier.supplierType === 'business' ? 'Business Supplier' : 'Individual Supplier'}
            </Text>
          </View>
        </View>
        
        <View style={styles.payableAmountContainer}>
          <Text style={styles.payableAmountLabel}>Total Payable</Text>
          <Text style={styles.payableAmountValue}>
            {formatAmount(supplier.totalPayable)}
          </Text>
          {supplier.overdueAmount > 0 && (
            <Text style={styles.overdueAmountValue}>
              {formatAmount(supplier.overdueAmount)} overdue
            </Text>
          )}
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'summary' && styles.activeTab
          ]}
          onPress={() => setSelectedTab('summary')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'summary' && styles.activeTabText
          ]}>
            Account Summary
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'transactions' && styles.activeTab
          ]}
          onPress={() => setSelectedTab('transactions')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'transactions' && styles.activeTabText
          ]}>
            Transaction Logs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'summary' ? (
          <View style={styles.summaryContainer}>
            {/* Account Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Account Summary</Text>
              <View style={styles.summaryGrid}>
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardLabel}>Current Payable</Text>
                  <Text style={[styles.summaryCardValue, { color: Colors.error }]}>
                    {formatAmount(supplier.totalPayable)}
                  </Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardLabel}>Overdue Amount</Text>
                  <Text style={[styles.summaryCardValue, { color: Colors.error }]}>
                    {formatAmount(supplier.overdueAmount)}
                  </Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardLabel}>Outstanding Bills</Text>
                  <Text style={styles.summaryCardValue}>
                    {supplier.billCount}
                  </Text>
                </View>
                
                <View style={styles.summaryCard}>
                  <Text style={styles.summaryCardLabel}>Days Past Due</Text>
                  <Text style={[
                    styles.summaryCardValue,
                    { color: supplier.daysPastDue > 30 ? Colors.error : supplier.daysPastDue > 0 ? Colors.warning : Colors.success }
                  ]}>
                    {supplier.daysPastDue}
                  </Text>
                </View>
              </View>
            </View>

            {/* Supplier Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Supplier Information</Text>
              <View style={styles.supplierDetailsCard}>
                <View style={styles.supplierDetailRow}>
                  <Phone size={16} color={Colors.textLight} />
                  <Text style={styles.supplierDetailLabel}>Mobile:</Text>
                  <Text style={styles.supplierDetailValue}>{supplier.mobile}</Text>
                </View>
                
                {supplier.email && (
                  <View style={styles.supplierDetailRow}>
                    <Mail size={16} color={Colors.textLight} />
                    <Text style={styles.supplierDetailLabel}>Email:</Text>
                    <Text style={styles.supplierDetailValue}>{supplier.email}</Text>
                  </View>
                )}
                
                {supplier.gstin && (
                  <View style={styles.supplierDetailRow}>
                    <Building2 size={16} color={Colors.textLight} />
                    <Text style={styles.supplierDetailLabel}>GSTIN:</Text>
                    <Text style={[styles.supplierDetailValue, styles.gstinText]}>
                      {supplier.gstin}
                    </Text>
                  </View>
                )}
                
                <View style={styles.supplierDetailRow}>
                  <MapPin size={16} color={Colors.textLight} />
                  <Text style={styles.supplierDetailLabel}>Address:</Text>
                  <Text style={[styles.supplierDetailValue, styles.addressText]}>
                    {supplier.address}
                  </Text>
                </View>
                
                {supplier.paymentTerms && (
                  <View style={styles.supplierDetailRow}>
                    <Clock size={16} color={Colors.textLight} />
                    <Text style={styles.supplierDetailLabel}>Payment Terms:</Text>
                    <Text style={styles.supplierDetailValue}>{supplier.paymentTerms}</Text>
                  </View>
                )}
                
                {supplier.creditLimit && (
                  <View style={styles.supplierDetailRow}>
                    <CreditCard size={16} color={Colors.textLight} />
                    <Text style={styles.supplierDetailLabel}>Credit Limit:</Text>
                    <Text style={styles.supplierDetailValue}>
                      {formatAmount(supplier.creditLimit)}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Payment History Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Recent Payment Activity</Text>
              {supplier.lastPaymentDate ? (
                <View style={styles.paymentHistoryCard}>
                  <View style={styles.paymentHistoryHeader}>
                    <IndianRupee size={20} color={Colors.error} />
                    <View style={styles.paymentHistoryInfo}>
                      <Text style={styles.paymentHistoryAmount}>
                        {formatAmount(supplier.lastPaymentAmount || 0)}
                      </Text>
                      <Text style={styles.paymentHistoryDate}>
                        Last payment on {formatDate(supplier.lastPaymentDate)}
                      </Text>
                    </View>
                  </View>
                </View>
              ) : (
                <View style={styles.noPaymentCard}>
                  <AlertTriangle size={20} color={Colors.warning} />
                  <Text style={styles.noPaymentText}>No recent payments</Text>
                </View>
              )}
            </View>

            {/* Aging Analysis */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Aging Analysis</Text>
              <View style={styles.agingCard}>
                <View style={styles.agingRow}>
                  <Text style={styles.agingLabel}>Current (0-30 days):</Text>
                  <Text style={[styles.agingValue, { color: Colors.success }]}>
                    {formatAmount(supplier.totalPayable - supplier.overdueAmount)}
                  </Text>
                </View>
                <View style={styles.agingRow}>
                  <Text style={styles.agingLabel}>31-60 days:</Text>
                  <Text style={[styles.agingValue, { color: Colors.warning }]}>
                    {formatAmount(supplier.overdueAmount * 0.6)}
                  </Text>
                </View>
                <View style={styles.agingRow}>
                  <Text style={styles.agingLabel}>60+ days:</Text>
                  <Text style={[styles.agingValue, { color: Colors.error }]}>
                    {formatAmount(supplier.overdueAmount * 0.4)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.transactionsContainer}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              <Text style={styles.transactionsSubtitle}>
                Complete transaction history for this supplier
              </Text>
            </View>

            <View style={styles.transactionLogs}>
              {mockTransactionLogs.map(renderTransactionLog)}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Make Payment Button */}
      <View style={styles.makePaymentSection}>
        <TouchableOpacity
          style={styles.makePaymentButton}
          onPress={handleMakePayment}
          activeOpacity={0.8}
        >
          <IndianRupee size={20} color="#ffffff" />
          <Text style={styles.makePaymentButtonText}>
            Make Payment
          </Text>
        </TouchableOpacity>
      </View>
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplierHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  supplierHeaderAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    marginRight: 16,
  },
  supplierHeaderInfo: {
    flex: 1,
  },
  supplierHeaderName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  supplierHeaderContact: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  supplierHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supplierHeaderType: {
    fontSize: 14,
    color: Colors.textLight,
  },
  payableAmountContainer: {
    alignItems: 'flex-end',
  },
  payableAmountLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  payableAmountValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 4,
  },
  overdueAmountValue: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.error,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeTabText: {
    color: Colors.error,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  summaryContainer: {
    gap: 24,
  },
  section: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  summaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  summaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  summaryCardLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
    textAlign: 'center',
  },
  summaryCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  supplierDetailsCard: {
    gap: 12,
  },
  supplierDetailRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  supplierDetailLabel: {
    fontSize: 14,
    color: Colors.textLight,
    minWidth: 80,
  },
  supplierDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  gstinText: {
    fontFamily: 'monospace',
    fontSize: 13,
  },
  addressText: {
    lineHeight: 20,
  },
  paymentHistoryCard: {
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    padding: 16,
  },
  paymentHistoryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  paymentHistoryInfo: {
    flex: 1,
  },
  paymentHistoryAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 4,
  },
  paymentHistoryDate: {
    fontSize: 14,
    color: '#b91c1c',
  },
  noPaymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: Colors.warning,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  noPaymentText: {
    fontSize: 16,
    color: '#92400e',
    fontWeight: '500',
  },
  agingCard: {
    gap: 12,
  },
  agingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  agingLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  agingValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  transactionsContainer: {
    flex: 1,
  },
  transactionsHeader: {
    marginBottom: 20,
  },
  transactionsSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  transactionLogs: {
    gap: 12,
  },
  transactionCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  transactionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  transactionLeft: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    flex: 1,
    marginRight: 16,
  },
  transactionIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  transactionInfo: {
    flex: 1,
  },
  transactionType: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  transactionDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  transactionDescription: {
    fontSize: 12,
    color: Colors.textLight,
  },
  transactionRight: {
    alignItems: 'flex-end',
  },
  transactionAmount: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 4,
  },
  transactionStatus: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 8,
    marginBottom: 4,
  },
  transactionStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  balanceAfter: {
    fontSize: 11,
    color: Colors.textLight,
  },
  dueDateSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    marginBottom: 8,
    gap: 6,
  },
  dueDateText: {
    fontSize: 12,
    color: '#92400e',
    fontWeight: '500',
  },
  viewBillButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  viewBillText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  makePaymentSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  makePaymentButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  makePaymentButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});