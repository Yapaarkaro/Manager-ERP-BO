import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MessageSquare, Phone, Mail, MapPin, Building2, User, Star, Award, Clock, ShoppingCart, TrendingUp, TrendingDown, FileText, Eye, Calendar, IndianRupee, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Download, Share, RotateCcw } from 'lucide-react-native';
import { safeRouter } from '@/utils/safeRouter';
import { getInitials as getNameInitials, getAvatarColor, formatCurrencyINR } from '@/utils/formatters';
import { getCustomers, getCustomerMetrics, getInvoices, getReturns, invalidateApiCache } from '@/services/backendApi';
import { DetailSkeleton } from '@/components/SkeletonLoader';
import { setNavData } from '@/utils/navStore';

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

export default function CustomerDetailsScreen() {
  const { customerId } = useLocalSearchParams();
  const [customer, setCustomer] = useState<any>(null);
  const [transactionLogs, setTransactionLogs] = useState<TransactionLog[]>([]);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'transactions'>('overview');
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    loadCustomerData();
  }, [customerId]);

  const loadCustomerData = async () => {
    try {
      setIsLoading(true);
      
      if (customerId) {
        const [result, metricsResult, invoicesResult, returnsResult] = await Promise.all([
          getCustomers(),
          getCustomerMetrics(customerId as string),
          getInvoices(),
          getReturns(),
        ]);

        const m = metricsResult.success ? metricsResult.metrics : null;

        if (result.success && result.customers) {
          const found = result.customers.find((c: any) => c.id === customerId);
          if (found) {
            const avgOrderVal = m && m.total_invoices > 0 ? (m.total_value / m.total_invoices) : (found.average_order_value ?? 0);
            setCustomer({
              ...found,
              businessName: found.business_name,
              customerType: found.customer_type,
              contactPerson: found.contact_person,
              customerScore: m?.payment_score ?? found.customer_score ?? 0,
              onTimePayment: m ? (m.on_time_payment_count + m.late_payment_count > 0 ? Math.round((m.on_time_payment_count / (m.on_time_payment_count + m.late_payment_count)) * 100) : 0) : (found.on_time_payment ?? 0),
              satisfactionRating: found.satisfaction_rating ?? 0,
              responseTime: found.response_time ?? 0,
              averageOrderValue: avgOrderVal,
              avgPaymentDays: m?.avg_payment_duration_days ?? 0,
              totalOrders: m?.total_invoices ?? found.total_orders ?? 0,
              completedOrders: m?.paid_invoices ?? found.completed_orders ?? 0,
              pendingOrders: m?.pending_invoices ?? found.pending_orders ?? 0,
              cancelledOrders: found.cancelled_orders ?? 0,
              overdueOrders: m?.overdue_invoices ?? 0,
              totalValue: m?.total_value ?? found.total_value ?? 0,
              totalPaid: m?.total_paid ?? 0,
              totalDue: m?.total_due ?? 0,
              creditLimit: found.credit_limit ?? 0,
              paymentTerms: found.payment_terms,
              joinedDate: found.joined_date || found.created_at,
              lastOrderDate: m?.last_invoice_date || found.last_order_date || null,
              lastPaymentDate: m?.last_payment_date || null,
              createdAt: found.created_at,
            });
          }
        }

        const logs: TransactionLog[] = [];
        if (invoicesResult.success && invoicesResult.invoices) {
          invoicesResult.invoices
            .filter((inv: any) => inv.customer_id === customerId)
            .forEach((inv: any) => {
              logs.push({
                id: inv.id,
                type: 'invoice',
                number: inv.invoice_number || '',
                amount: Number(inv.total_amount) || 0,
                date: inv.invoice_date || inv.created_at || '',
                status: (inv.payment_status || 'pending').toLowerCase() === 'paid' ? 'completed' : 'pending',
                description: `Sales Invoice - ${Array.isArray(inv.items) ? inv.items.length : 0} items`,
                paymentMethod: inv.payment_method || '',
              });
            });
        }
        let customerReturnCount = 0;
        if (returnsResult.success && returnsResult.returns) {
          const customerReturns = returnsResult.returns.filter((ret: any) => ret.customer_id === customerId);
          customerReturnCount = customerReturns.length;
          customerReturns.forEach((ret: any) => {
              logs.push({
                id: ret.id,
                type: 'return',
                number: ret.return_number || ret.return_invoice_number || '',
                amount: Number(ret.refund_amount || ret.total_amount) || 0,
                date: ret.return_date || ret.created_at || '',
                status: 'completed',
                description: `Return - ${ret.return_reason || 'Items returned'}`,
              });
            });
        }

        setCustomer((prev: any) => {
          if (!prev) return prev;
          const totalOrders = prev.totalOrders || 0;
          return {
            ...prev,
            returnedOrders: customerReturnCount,
            returnRate: totalOrders > 0 ? Math.round((customerReturnCount / totalOrders) * 100) : 0,
          };
        });
        logs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setTransactionLogs(logs);
      }
    } catch (error) {
      console.error('Error loading customer data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    loadCustomerData().catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, [customerId]);

  const formatAmount = (amount: number) => formatCurrencyINR(amount, 2, 0);

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
    setNavData('customerChatMeta', {
      customerId: customer.id,
      customerName: customer.businessName || customer.name || customer.contact_person || '',
      customerAvatar: customer.avatar || '',
      customerPhone: customer.mobile || customer.mobile_number || customer.phone || '',
      isOnManager: customer.business_id ? 'true' : 'false',
    });
    safeRouter.push({
      pathname: '/people/customer-chat',
      params: { customerId: customer.id }
    });
  };

  // Show loading state
  if (isLoading) {
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
            <Text style={styles.headerTitle}>Customer Details</Text>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <DetailSkeleton />
        </View>
      </View>
    );
  }

  // Show error state if customer not found
  if (!customer) {
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
            <Text style={styles.headerTitle}>Customer Not Found</Text>
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Customer details could not be loaded</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadCustomerData}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

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
    
    setNavData('preSelectedCustomer', preSelectedCustomerData);
    safeRouter.push({ pathname: '/new-sale' });
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
                <MessageSquare size={22} color={Colors.primary} />
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
        {customer.avatar ? (
          <Image source={{ uri: customer.avatar }} style={styles.customerHeaderAvatar} />
        ) : (
          <View style={[styles.customerHeaderAvatar, { backgroundColor: getAvatarColor(customer.customerType === 'business' ? customer.businessName : customer.name), justifyContent: 'center', alignItems: 'center' }]}>
            <Text style={{ fontSize: 18, fontWeight: '700', color: '#FFFFFF' }}>
              {getNameInitials(customer.customerType === 'business' ? customer.businessName || customer.name : customer.name)}
            </Text>
          </View>
        )}
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {selectedTab === 'overview' && (
          <View style={styles.overviewContainer}>
            {/* Payment Score */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Payment Score</Text>
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <View style={{ flexDirection: 'row', alignItems: 'baseline', backgroundColor: `${customer.customerScore >= 70 ? Colors.success : customer.customerScore >= 40 ? Colors.warning : Colors.error}15`, paddingHorizontal: 20, paddingVertical: 12, borderRadius: 16, gap: 4 }}>
                  <Text style={{ fontSize: 32, fontWeight: '700', color: customer.customerScore >= 70 ? Colors.success : customer.customerScore >= 40 ? Colors.warning : Colors.error }}>{customer.customerScore}</Text>
                  <Text style={{ fontSize: 14, color: customer.customerScore >= 70 ? Colors.success : customer.customerScore >= 40 ? Colors.warning : Colors.error, fontWeight: '500' }}>/100</Text>
                </View>
                <Text style={{ fontSize: 12, color: Colors.textLight, marginTop: 6 }}>
                  {customer.customerScore >= 80 ? 'Excellent Payer' : customer.customerScore >= 60 ? 'Good Payer' : customer.customerScore >= 40 ? 'Average Payer' : 'Needs Follow-up'}
                </Text>
              </View>
            </View>

            {/* Performance Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Metrics</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Clock size={20} color={Colors.primary} />
                  <Text style={styles.metricLabel}>On-Time Payment</Text>
                  <Text style={[styles.metricValue, { color: customer.onTimePayment >= 80 ? Colors.success : customer.onTimePayment >= 50 ? Colors.warning : Colors.error }]}>
                    {customer.onTimePayment}%
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Calendar size={20} color={Colors.warning} />
                  <Text style={styles.metricLabel}>Avg Pay Duration</Text>
                  <Text style={styles.metricValue}>
                    {customer.avgPaymentDays || 0} days
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
                  <Text style={[styles.metricValue, { color: customer.returnRate > 10 ? Colors.error : customer.returnRate > 5 ? Colors.warning : Colors.success }]}>
                    {customer.returnRate}%
                  </Text>
                </View>
              </View>
            </View>

            {/* Financial Overview */}
            {(customer.totalValue > 0 || customer.totalDue > 0) && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>Financial Overview</Text>
                <View style={{ gap: 10 }}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, color: Colors.textLight }}>Total Purchases</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.primary }}>{formatAmount(customer.totalValue)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, color: Colors.textLight }}>Amount Paid</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: Colors.success }}>{formatAmount(customer.totalPaid || 0)}</Text>
                  </View>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                    <Text style={{ fontSize: 14, color: Colors.textLight }}>Outstanding Due</Text>
                    <Text style={{ fontSize: 14, fontWeight: '600', color: (customer.totalDue || 0) > 0 ? Colors.error : Colors.success }}>{formatAmount(customer.totalDue || 0)}</Text>
                  </View>
                </View>
              </View>
            )}

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
                    {customer.address || 'Not provided'}
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
                  {customer.paymentTerms ? (
                    <View style={styles.termRow}>
                      <Text style={styles.termLabel}>Payment Terms:</Text>
                      <Text style={styles.termValue}>{customer.paymentTerms}</Text>
                    </View>
                  ) : null}
                  {customer.creditLimit > 0 ? (
                    <View style={styles.termRow}>
                      <Text style={styles.termLabel}>Credit Limit:</Text>
                      <Text style={styles.termValue}>{formatAmount(customer.creditLimit)}</Text>
                    </View>
                  ) : null}
                  <View style={styles.termRow}>
                    <Text style={styles.termLabel}>Added On:</Text>
                    <Text style={styles.termValue}>{customer.createdAt ? formatDate(customer.createdAt) : 'N/A'}</Text>
                  </View>
                  <View style={styles.termRow}>
                    <Text style={styles.termLabel}>Last Order:</Text>
                    <Text style={styles.termValue}>{customer.lastOrderDate ? formatDate(customer.lastOrderDate) : 'Never'}</Text>
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
              {transactionLogs.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <FileText size={40} color={Colors.grey[300]} />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text, marginTop: 12 }}>No Transactions Yet</Text>
                  <Text style={{ fontSize: 13, color: Colors.textLight, marginTop: 4 }}>Sales and returns for this customer will appear here</Text>
                </View>
              ) : (
                transactionLogs.map(renderTransactionLog)
              )}
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
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  
  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});