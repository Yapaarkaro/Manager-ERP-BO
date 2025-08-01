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
import { ArrowLeft, MessageCircle, Phone, Mail, MapPin, Building2, User, Star, Award, Clock, ShoppingCart, TrendingUp, TrendingDown, FileText, Eye, Calendar, IndianRupee, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Download, Share, RotateCcw } from 'lucide-react-native';

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
  type: 'invoice' | 'payment' | 'return' | 'adjustment';
  number: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  description: string;
  paymentMethod?: string;
}

const mockTransactionLogs: TransactionLog[] = [
  {
    id: '1',
    type: 'invoice',
    number: 'INV-2024-001',
    amount: 125000,
    date: '2024-01-15',
    status: 'completed',
    description: 'iPhone 14 Pro, MacBook Air M2',
    paymentMethod: 'UPI'
  },
  {
    id: '2',
    type: 'payment',
    number: 'PAY-001',
    amount: 125000,
    date: '2024-01-16',
    status: 'completed',
    description: 'Payment for INV-2024-001',
    paymentMethod: 'UPI'
  },
  {
    id: '3',
    type: 'return',
    number: 'RET-2024-001',
    amount: 25000,
    date: '2024-01-18',
    status: 'completed',
    description: 'Return - Defective AirPods',
    paymentMethod: 'Cash'
  },
];

export default function CustomerDetailsScreen() {
  const { customerId, customerData } = useLocalSearchParams();
  const customer = JSON.parse(customerData as string);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'transactions'>('overview');

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

  const getScoreColor = (score: number) => {
    if (score >= 90) return Colors.success;
    if (score >= 80) return Colors.warning;
    if (score >= 70) return '#f59e0b';
    return Colors.error;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'inactive': return Colors.error;
      case 'suspended': return Colors.warning;
      default: return Colors.textLight;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'invoice': return Colors.primary;
      case 'payment': return Colors.success;
      case 'return': return Colors.error;
      case 'adjustment': return Colors.warning;
      default: return Colors.textLight;
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'invoice': return FileText;
      case 'payment': return IndianRupee;
      case 'return': return RotateCcw;
      case 'adjustment': return AlertTriangle;
      default: return FileText;
    }
  };

  const handleChatPress = () => {
    if (customer.customerType === 'business') {
      router.push({
        pathname: '/people/customer-chat',
        params: {
          customerId: customer.id,
          customerName: customer.businessName || customer.name,
          customerAvatar: customer.avatar
        }
      });
    }
  };

  const handleCreateSale = () => {
    // Clean mobile number to remove +91 and spaces
    const cleanMobile = customer.mobile.replace(/^\+91\s*/, '').replace(/\s/g, '');
    
    const preSelectedCustomerData = {
      name: customer.contactPerson,
      mobile: cleanMobile,
      address: customer.address,
      isBusinessCustomer: customer.customerType === 'business',
      gstin: customer.gstin,
      businessName: customer.businessName,
      paymentTerms: customer.paymentTerms,
    };
    
    console.log('Creating sale with customer data:', preSelectedCustomerData);
    
    router.push({
      pathname: '/new-sale',
      params: {
        preSelectedCustomer: JSON.stringify(preSelectedCustomerData)
      }
    });
  };

  const renderTransactionLog = (transaction: TransactionLog) => {
    const TransactionIcon = getTransactionTypeIcon(transaction.type);
    const typeColor = getTransactionTypeColor(transaction.type);

    return (
      <View key={transaction.id} style={styles.transactionCard}>
        <View style={styles.transactionHeader}>
          <View style={styles.transactionLeft}>
            <View style={[styles.transactionIcon, { backgroundColor: `${typeColor}20` }]}>
              <TransactionIcon size={16} color={typeColor} />
            </View>
            <View style={styles.transactionInfo}>
              <Text style={styles.transactionNumber}>{transaction.number}</Text>
              <Text style={styles.transactionDescription}>{transaction.description}</Text>
              <Text style={styles.transactionDate}>{formatDate(transaction.date)}</Text>
            </View>
          </View>
          
          <View style={styles.transactionRight}>
            <Text style={[
              styles.transactionAmount,
              { color: transaction.type === 'return' ? Colors.error : Colors.success }
            ]}>
              {transaction.type === 'return' ? '-' : ''}{formatAmount(transaction.amount)}
            </Text>
            <View style={[
              styles.transactionStatus,
              { backgroundColor: transaction.status === 'completed' ? `${Colors.success}20` : 
                                 transaction.status === 'pending' ? `${Colors.warning}20` : `${Colors.error}20` }
            ]}>
              <Text style={[
                styles.transactionStatusText,
                { color: transaction.status === 'completed' ? Colors.success : 
                         transaction.status === 'pending' ? Colors.warning : Colors.error }
              ]}>
                {transaction.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>
      </View>
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
          
          <Text style={styles.headerTitle}>Customer Details</Text>
          
          <View style={styles.headerActions}>
            {customer.customerType === 'business' && (
              <TouchableOpacity
                style={styles.chatHeaderButton}
                onPress={handleChatPress}
                activeOpacity={0.7}
              >
                <MessageCircle size={24} color={Colors.success} />
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => console.log('Download customer statement')}
              activeOpacity={0.7}
            >
              <Download size={20} color={Colors.success} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={() => console.log('Share customer details')}
              activeOpacity={0.7}
            >
              <Share size={20} color={Colors.success} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Customer Header */}
      <View style={styles.customerHeader}>
        <Image 
          source={{ uri: customer.avatar }}
          style={styles.customerHeaderAvatar}
        />
        <View style={styles.customerHeaderInfo}>
          <Text style={styles.customerHeaderName}>
            {customer.customerType === 'business' ? customer.businessName : customer.name}
          </Text>
          <Text style={styles.customerHeaderContact}>
            Contact: {customer.contactPerson}
          </Text>
          <View style={styles.customerHeaderMeta}>
            {customer.customerType === 'business' ? (
              <Building2 size={16} color={Colors.textLight} />
            ) : (
              <User size={16} color={Colors.textLight} />
            )}
            <Text style={styles.customerHeaderType}>
              {customer.customerType === 'business' ? 'Business Customer' : 'Individual Customer'}
            </Text>
          </View>
        </View>
        
        <View style={styles.scoreContainer}>
          <View style={[
            styles.scoreBadge,
            { backgroundColor: `${getScoreColor(customer.customerScore)}20` }
          ]}>
            <Award size={20} color={getScoreColor(customer.customerScore)} />
            <Text style={[
              styles.scoreValue,
              { color: getScoreColor(customer.customerScore) }
            ]}>
              {customer.customerScore}
            </Text>
          </View>
          <Text style={styles.scoreLabel}>Customer Score</Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'overview' && styles.activeTab
          ]}
          onPress={() => setSelectedTab('overview')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'overview' && styles.activeTabText
          ]}>
            Overview
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
            Transactions
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'overview' && (
          <View style={styles.overviewContainer}>
            {/* Performance Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Metrics</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Clock size={20} color={Colors.primary} />
                  <Text style={styles.metricLabel}>On-Time Payment</Text>
                  <Text style={[
                    styles.metricValue,
                    { color: customer.onTimePayment >= 90 ? Colors.success : Colors.warning }
                  ]}>
                    {customer.onTimePayment}%
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Star size={20} color={Colors.warning} />
                  <Text style={styles.metricLabel}>Satisfaction</Text>
                  <Text style={styles.metricValue}>
                    {customer.satisfactionRating}/5
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <TrendingUp size={20} color={Colors.success} />
                  <Text style={styles.metricLabel}>Avg Order Value</Text>
                  <Text style={styles.metricValue}>
                    {formatAmount(customer.averageOrderValue)}
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <RotateCcw size={20} color={Colors.error} />
                  <Text style={styles.metricLabel}>Return Rate</Text>
                  <Text style={[
                    styles.metricValue,
                    { color: customer.returnRate > 10 ? Colors.error : customer.returnRate > 5 ? Colors.warning : Colors.success }
                  ]}>
                    {customer.returnRate}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <View style={styles.contactCard}>
                <View style={styles.contactRow}>
                  <Phone size={16} color={Colors.textLight} />
                  <Text style={styles.contactLabel}>Mobile:</Text>
                  <Text style={styles.contactValue}>{customer.mobile}</Text>
                </View>
                
                {customer.email && (
                  <View style={styles.contactRow}>
                    <Mail size={16} color={Colors.textLight} />
                    <Text style={styles.contactLabel}>Email:</Text>
                    <Text style={styles.contactValue}>{customer.email}</Text>
                  </View>
                )}
                
                <View style={styles.contactRow}>
                  <MapPin size={16} color={Colors.textLight} />
                  <Text style={styles.contactLabel}>Address:</Text>
                  <Text style={[styles.contactValue, styles.addressText]}>
                    {customer.address}
                  </Text>
                </View>
                
                {customer.gstin && (
                  <View style={styles.contactRow}>
                    <Building2 size={16} color={Colors.textLight} />
                    <Text style={styles.contactLabel}>GSTIN:</Text>
                    <Text style={[styles.contactValue, styles.gstinText]}>
                      {customer.gstin}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Business Terms */}
            {customer.customerType === 'business' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Business Terms</Text>
                <View style={styles.termsCard}>
                  {customer.paymentTerms && (
                    <View style={styles.termRow}>
                      <Text style={styles.termLabel}>Payment Terms:</Text>
                      <Text style={styles.termValue}>{customer.paymentTerms}</Text>
                    </View>
                  )}
                  {customer.creditLimit && (
                    <View style={styles.termRow}>
                      <Text style={styles.termLabel}>Credit Limit:</Text>
                      <Text style={styles.termValue}>{formatAmount(customer.creditLimit)}</Text>
                    </View>
                  )}
                  <View style={styles.termRow}>
                    <Text style={styles.termLabel}>Joined Date:</Text>
                    <Text style={styles.termValue}>{formatDate(customer.joinedDate)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* Order Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.orderSummaryGrid}>
                <View style={styles.orderSummaryCard}>
                  <CheckCircle size={20} color={Colors.success} />
                  <Text style={styles.orderSummaryLabel}>Completed</Text>
                  <Text style={[styles.orderSummaryValue, { color: Colors.success }]}>
                    {customer.completedOrders}
                  </Text>
                </View>

                <View style={styles.orderSummaryCard}>
                  <Clock size={20} color={Colors.warning} />
                  <Text style={styles.orderSummaryLabel}>Pending</Text>
                  <Text style={[styles.orderSummaryValue, { color: Colors.warning }]}>
                    {customer.pendingOrders}
                  </Text>
                </View>

                <View style={styles.orderSummaryCard}>
                  <RotateCcw size={20} color={Colors.error} />
                  <Text style={styles.orderSummaryLabel}>Returns</Text>
                  <Text style={[styles.orderSummaryValue, { color: Colors.error }]}>
                    {customer.returnedOrders}
                  </Text>
                </View>

                <View style={styles.orderSummaryCard}>
                  <IndianRupee size={20} color={Colors.primary} />
                  <Text style={styles.orderSummaryLabel}>Total Value</Text>
                  <Text style={[styles.orderSummaryValue, { color: Colors.primary }]}>
                    {formatAmount(customer.totalValue)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {selectedTab === 'transactions' && (
          <View style={styles.transactionsContainer}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              <Text style={styles.transactionsSubtitle}>
                Sales, payments, and returns for this customer
              </Text>
            </View>

            <View style={styles.transactionsList}>
              {mockTransactionLogs.map(renderTransactionLog)}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create Sale Button */}
      <View style={styles.createSaleSection}>
        <TouchableOpacity
          style={styles.createSaleButton}
          onPress={handleCreateSale}
          activeOpacity={0.8}
        >
          <ShoppingCart size={20} color="#ffffff" />
          <Text style={styles.createSaleButtonText}>Create Sale</Text>
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
  chatHeaderButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  customerHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  customerHeaderAvatar: {
    width: 80,
    height: 80,
    borderRadius: 40,
    marginRight: 16,
  },
  customerHeaderInfo: {
    flex: 1,
  },
  customerHeaderName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  customerHeaderContact: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  customerHeaderMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerHeaderType: {
    fontSize: 14,
    color: Colors.textLight,
  },
  scoreContainer: {
    alignItems: 'center',
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 16,
    gap: 6,
    marginBottom: 4,
  },
  scoreValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  scoreLabel: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
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
    borderBottomColor: Colors.success,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeTabText: {
    color: Colors.success,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  overviewContainer: {
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
  metricsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  metricCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  metricLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginVertical: 8,
    textAlign: 'center',
  },
  metricValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  contactCard: {
    gap: 12,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  contactLabel: {
    fontSize: 14,
    color: Colors.textLight,
    minWidth: 80,
  },
  contactValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  addressText: {
    lineHeight: 20,
  },
  gstinText: {
    fontFamily: 'monospace',
    fontSize: 13,
  },
  termsCard: {
    gap: 12,
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  termValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  orderSummaryGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  orderSummaryCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  orderSummaryLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginVertical: 8,
    textAlign: 'center',
  },
  orderSummaryValue: {
    fontSize: 16,
    fontWeight: '700',
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
  transactionsList: {
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
  transactionNumber: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  transactionDescription: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  transactionDate: {
    fontSize: 11,
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
  },
  transactionStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  createSaleSection: {
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
  createSaleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  createSaleButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});