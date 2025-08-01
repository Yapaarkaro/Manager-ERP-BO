import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MessageCircle, Phone, Mail, MapPin, Building2, User, Star, Award, Clock, Package, TrendingUp, TrendingDown, FileText, Eye, Calendar, IndianRupee, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, X, Download, Share } from 'lucide-react-native';

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

interface SupplierProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  minOrderQty: number;
  unit: string;
  availability: 'in_stock' | 'limited' | 'out_of_stock';
  lastOrderDate?: string;
}

interface TransactionLog {
  id: string;
  type: 'po' | 'invoice' | 'payment' | 'return';
  number: string;
  amount: number;
  date: string;
  status: 'pending' | 'completed' | 'cancelled';
  description: string;
}

const mockSupplierProducts: SupplierProduct[] = [
  {
    id: '1',
    name: 'iPhone 14 Pro 128GB',
    category: 'Smartphones',
    price: 115000,
    minOrderQty: 5,
    unit: 'Piece',
    availability: 'in_stock',
    lastOrderDate: '2024-01-10'
  },
  {
    id: '2',
    name: 'MacBook Air M2',
    category: 'Laptops',
    price: 100000,
    minOrderQty: 2,
    unit: 'Piece',
    availability: 'in_stock',
    lastOrderDate: '2024-01-05'
  },
  {
    id: '3',
    name: 'AirPods Pro 2nd Gen',
    category: 'Audio',
    price: 22000,
    minOrderQty: 10,
    unit: 'Piece',
    availability: 'limited',
    lastOrderDate: '2024-01-12'
  },
];

const mockTransactionLogs: TransactionLog[] = [
  {
    id: '1',
    type: 'po',
    number: 'PO-2024-001',
    amount: 850000,
    date: '2024-01-15',
    status: 'completed',
    description: 'iPhone 14 Pro - 10 units'
  },
  {
    id: '2',
    type: 'invoice',
    number: 'INV-SUP-001',
    amount: 850000,
    date: '2024-01-16',
    status: 'pending',
    description: 'Invoice for PO-2024-001'
  },
  {
    id: '3',
    type: 'payment',
    number: 'PAY-001',
    amount: 500000,
    date: '2024-01-18',
    status: 'completed',
    description: 'Partial payment for INV-SUP-001'
  },
];

export default function SupplierDetailsScreen() {
  const { supplierId, supplierData } = useLocalSearchParams();
  const supplier = JSON.parse(supplierData as string);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'products' | 'transactions'>('overview');

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

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'in_stock': return Colors.success;
      case 'limited': return Colors.warning;
      case 'out_of_stock': return Colors.error;
      default: return Colors.textLight;
    }
  };

  const getTransactionTypeColor = (type: string) => {
    switch (type) {
      case 'po': return Colors.primary;
      case 'invoice': return Colors.warning;
      case 'payment': return Colors.success;
      case 'return': return Colors.error;
      default: return Colors.textLight;
    }
  };

  const getTransactionTypeIcon = (type: string) => {
    switch (type) {
      case 'po': return FileText;
      case 'invoice': return FileText;
      case 'payment': return IndianRupee;
      case 'return': return TrendingDown;
      default: return FileText;
    }
  };

  const handleChatPress = () => {
    router.push({
      pathname: '/purchasing/supplier-chat',
      params: {
        supplierId: supplier.id,
        supplierName: supplier.supplierType === 'business' ? supplier.businessName : supplier.name,
        supplierAvatar: supplier.avatar
      }
    });
  };

  const handleCreatePO = () => {
    router.push({
      pathname: '/purchasing/create-po',
      params: {
        supplierId: supplier.id,
        supplierData: JSON.stringify(supplier)
      }
    });
  };

  const renderProductCard = (product: SupplierProduct) => {
    const availabilityColor = getAvailabilityColor(product.availability);

    return (
      <View key={product.id} style={styles.productCard}>
        <View style={styles.productHeader}>
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productCategory}>{product.category}</Text>
            <Text style={styles.productPrice}>
              {formatAmount(product.price)} per {product.unit}
            </Text>
          </View>
          
          <View style={styles.productRight}>
            <View style={[
              styles.availabilityBadge,
              { backgroundColor: `${availabilityColor}20` }
            ]}>
              <Text style={[
                styles.availabilityText,
                { color: availabilityColor }
              ]}>
                {product.availability.replace('_', ' ').toUpperCase()}
              </Text>
            </View>
            <Text style={styles.minOrderQty}>
              Min: {product.minOrderQty} {product.unit}
            </Text>
          </View>
        </View>
        
        {product.lastOrderDate && (
          <Text style={styles.lastOrderDate}>
            Last ordered: {formatDate(product.lastOrderDate)}
          </Text>
        )}
      </View>
    );
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
            <Text style={styles.transactionAmount}>
              {formatAmount(transaction.amount)}
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
          
          <Text style={styles.headerTitle}>Supplier Details</Text>
          
          <TouchableOpacity
            style={styles.chatButton}
            onPress={handleChatPress}
            activeOpacity={0.7}
          >
            <MessageCircle size={24} color={Colors.primary} />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Supplier Header */}
      <View style={styles.supplierHeader}>
        <Image 
          source={{ uri: supplier.avatar }}
          style={styles.supplierHeaderAvatar}
        />
        <View style={styles.supplierHeaderInfo}>
          <Text style={styles.supplierHeaderName}>
            {supplier.supplierType === 'business' ? supplier.businessName : supplier.name}
          </Text>
          <Text style={styles.supplierHeaderContact}>
            Contact: {supplier.contactPerson}
          </Text>
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
        
        <View style={styles.scoreContainer}>
          <View style={[
            styles.scoreBadge,
            { backgroundColor: `${getScoreColor(supplier.supplierScore)}20` }
          ]}>
            <Award size={20} color={getScoreColor(supplier.supplierScore)} />
            <Text style={[
              styles.scoreValue,
              { color: getScoreColor(supplier.supplierScore) }
            ]}>
              {supplier.supplierScore}
            </Text>
          </View>
          <Text style={styles.scoreLabel}>Supplier Score</Text>
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
            selectedTab === 'products' && styles.activeTab
          ]}
          onPress={() => setSelectedTab('products')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'products' && styles.activeTabText
          ]}>
            Products ({supplier.productCount})
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
              <Text style={styles.sectionTitle}>Performance Metrics</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Clock size={20} color={Colors.primary} />
                  <Text style={styles.metricLabel}>On-Time Delivery</Text>
                  <Text style={[
                    styles.metricValue,
                    { color: supplier.onTimeDelivery >= 90 ? Colors.success : Colors.warning }
                  ]}>
                    {supplier.onTimeDelivery}%
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Star size={20} color={Colors.warning} />
                  <Text style={styles.metricLabel}>Quality Rating</Text>
                  <Text style={styles.metricValue}>
                    {supplier.qualityRating}/5
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <TrendingUp size={20} color={Colors.success} />
                  <Text style={styles.metricLabel}>Response Time</Text>
                  <Text style={styles.metricValue}>
                    {supplier.responseTime}h
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Package size={20} color={Colors.primary} />
                  <Text style={styles.metricLabel}>Total Orders</Text>
                  <Text style={styles.metricValue}>
                    {supplier.totalOrders}
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
                  <Text style={styles.contactValue}>{supplier.mobile}</Text>
                </View>
                
                {supplier.email && (
                  <View style={styles.contactRow}>
                    <Mail size={16} color={Colors.textLight} />
                    <Text style={styles.contactLabel}>Email:</Text>
                    <Text style={styles.contactValue}>{supplier.email}</Text>
                  </View>
                )}
                
                <View style={styles.contactRow}>
                  <MapPin size={16} color={Colors.textLight} />
                  <Text style={styles.contactLabel}>Address:</Text>
                  <Text style={[styles.contactValue, styles.addressText]}>
                    {supplier.address}
                  </Text>
                </View>
                
                {supplier.gstin && (
                  <View style={styles.contactRow}>
                    <Building2 size={16} color={Colors.textLight} />
                    <Text style={styles.contactLabel}>GSTIN:</Text>
                    <Text style={[styles.contactValue, styles.gstinText]}>
                      {supplier.gstin}
                    </Text>
                  </View>
                )}
              </View>
            </View>

            {/* Business Terms */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Business Terms</Text>
              <View style={styles.termsCard}>
                <View style={styles.termRow}>
                  <Text style={styles.termLabel}>Payment Terms:</Text>
                  <Text style={styles.termValue}>{supplier.paymentTerms}</Text>
                </View>
                <View style={styles.termRow}>
                  <Text style={styles.termLabel}>Delivery Time:</Text>
                  <Text style={styles.termValue}>{supplier.deliveryTime}</Text>
                </View>
                <View style={styles.termRow}>
                  <Text style={styles.termLabel}>Joined Date:</Text>
                  <Text style={styles.termValue}>{formatDate(supplier.joinedDate)}</Text>
                </View>
              </View>
            </View>

            {/* Order Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.orderSummaryGrid}>
                <View style={styles.orderSummaryCard}>
                  <CheckCircle size={20} color={Colors.success} />
                  <Text style={styles.orderSummaryLabel}>Completed</Text>
                  <Text style={[styles.orderSummaryValue, { color: Colors.success }]}>
                    {supplier.completedOrders}
                  </Text>
                </View>

                <View style={styles.orderSummaryCard}>
                  <Clock size={20} color={Colors.warning} />
                  <Text style={styles.orderSummaryLabel}>Pending</Text>
                  <Text style={[styles.orderSummaryValue, { color: Colors.warning }]}>
                    {supplier.pendingOrders}
                  </Text>
                </View>

                <View style={styles.orderSummaryCard}>
                  <AlertTriangle size={20} color={Colors.error} />
                  <Text style={styles.orderSummaryLabel}>Cancelled</Text>
                  <Text style={[styles.orderSummaryValue, { color: Colors.error }]}>
                    {supplier.cancelledOrders}
                  </Text>
                </View>

                <View style={styles.orderSummaryCard}>
                  <IndianRupee size={20} color={Colors.primary} />
                  <Text style={styles.orderSummaryLabel}>Total Value</Text>
                  <Text style={[styles.orderSummaryValue, { color: Colors.primary }]}>
                    {formatAmount(supplier.totalValue)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        )}

        {selectedTab === 'products' && (
          <View style={styles.productsContainer}>
            <View style={styles.productsHeader}>
              <Text style={styles.sectionTitle}>Supplier Products</Text>
              <Text style={styles.productsSubtitle}>
                Products available from this supplier
              </Text>
            </View>

            <View style={styles.productsList}>
              {mockSupplierProducts.map(renderProductCard)}
            </View>
          </View>
        )}

        {selectedTab === 'transactions' && (
          <View style={styles.transactionsContainer}>
            <View style={styles.transactionsHeader}>
              <Text style={styles.sectionTitle}>Transaction History</Text>
              <Text style={styles.transactionsSubtitle}>
                Purchase orders, invoices, and payments
              </Text>
            </View>

            <View style={styles.transactionsList}>
              {mockTransactionLogs.map(renderTransactionLog)}
            </View>
          </View>
        )}
      </ScrollView>

      {/* Create PO Button */}
      <View style={styles.createPOSection}>
        <TouchableOpacity
          style={styles.createPOButton}
          onPress={handleCreatePO}
          activeOpacity={0.8}
        >
          <FileText size={20} color="#ffffff" />
          <Text style={styles.createPOButtonText}>Create Purchase Order</Text>
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
  chatButton: {
    width: 40,
    height: 40,
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
    width: 80,
    height: 80,
    borderRadius: 40,
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
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeTabText: {
    color: Colors.primary,
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
  productsContainer: {
    flex: 1,
  },
  productsHeader: {
    marginBottom: 20,
  },
  productsSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  productsList: {
    gap: 12,
  },
  productCard: {
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
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
    marginRight: 16,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  productRight: {
    alignItems: 'flex-end',
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 4,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  minOrderQty: {
    fontSize: 12,
    color: Colors.textLight,
  },
  lastOrderDate: {
    fontSize: 11,
    color: Colors.textLight,
    fontStyle: 'italic',
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
    color: Colors.text,
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
  createPOSection: {
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
  createPOButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    gap: 8,
  },
  createPOButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});