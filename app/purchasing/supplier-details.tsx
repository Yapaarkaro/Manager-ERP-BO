import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Modal,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MessageSquare, Phone, Mail, MapPin, Building2, User, Star, Award, Clock, Package, TrendingUp, TrendingDown, FileText, Eye, Calendar, IndianRupee, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, X, Download, Share, Banknote, Truck } from 'lucide-react-native';
import { getSuppliers, getPurchaseInvoices, getCachedPurchaseInvoiceItems, getSupplierMetrics, getProducts, invalidateApiCache, getOrCreateConversation, autoLinkSupplierToUser } from '@/services/backendApi';
import { useBusinessData } from '@/hooks/useBusinessData';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { DetailSkeleton } from '@/components/SkeletonLoader';
import { safeRouter } from '@/utils/safeRouter';

// Helper function to get initials from name
const getInitials = (name: string): string => {
  if (!name || name.trim().length === 0) return 'S';
  const words = name.trim().split(' ').filter(word => word.length > 0);
  if (words.length === 0) return 'S';
  
  // Get first letter of first word and first letter of last word (if multiple words)
  if (words.length === 1) {
    return words[0][0].toUpperCase();
  }
  return (words[0][0] + words[words.length - 1][0]).toUpperCase();
};

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

export default function SupplierDetailsScreen() {
  const { supplierId, defaultTab } = useLocalSearchParams();
  const { data: bizData } = useBusinessData();
  const [supplier, setSupplier] = useState<any>(null);
  const [selectedTab, setSelectedTab] = useState<'overview' | 'products' | 'transactions'>(
    (defaultTab === 'transactions' || defaultTab === 'products') ? defaultTab as any : 'overview'
  );
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [supplierInvoices, setSupplierInvoices] = useState<any[]>([]);
  const [supplierProducts, setSupplierProducts] = useState<SupplierProduct[]>([]);
  const [metrics, setMetrics] = useState<any>(null);

  useEffect(() => {
    loadSupplierData();
  }, [supplierId]);

  const loadSupplierData = async () => {
    try {
      setIsLoading(true);
      
      if (supplierId) {
        const [suppResult, invResult, metricsResult, productsResult] = await Promise.all([
          getSuppliers(),
          getPurchaseInvoices(),
          getSupplierMetrics(supplierId as string),
          getProducts(),
        ]);

        let invoicesForSupplier: any[] = [];
        if (invResult.success && invResult.invoices) {
          invoicesForSupplier = invResult.invoices.filter((inv: any) => inv.supplier_id === supplierId);
          setSupplierInvoices(invoicesForSupplier);
        }

        if (metricsResult.success && metricsResult.metrics) {
          setMetrics(metricsResult.metrics);
        }

        let suppProds: SupplierProduct[] = [];
        if (productsResult.success && productsResult.products) {
          suppProds = productsResult.products
            .filter((p: any) => p.preferred_supplier_id === supplierId)
            .map((p: any) => ({
              id: p.id,
              name: p.name,
              category: p.category || 'Uncategorized',
              price: parseFloat(p.per_unit_price) || parseFloat(p.sales_price) || 0,
              minOrderQty: parseFloat(p.min_stock_level) || 1,
              unit: p.primary_unit || 'pcs',
              availability: (parseFloat(p.current_stock) || 0) > 0
                ? (parseFloat(p.current_stock) || 0) <= (parseFloat(p.min_stock_level) || 0) ? 'limited' : 'in_stock'
                : 'out_of_stock',
              lastOrderDate: p.last_restocked_at || undefined,
            }));
        }
        setSupplierProducts(suppProds);

        const m = metricsResult.metrics;

        if (suppResult.success && suppResult.suppliers) {
          const found = suppResult.suppliers.find((s: any) => s.id === supplierId);
          if (found) {
            const totalValue = m?.total_value || invoicesForSupplier.reduce((s: number, inv: any) => s + (Number(inv.total_amount) || 0), 0);
            const paidOrders = m?.paid_orders || invoicesForSupplier.filter((inv: any) => inv.payment_status === 'paid').length;
            const pendingOrders = m?.pending_orders || invoicesForSupplier.filter((inv: any) => inv.payment_status !== 'paid').length;
            const lastInvoice = invoicesForSupplier.length > 0 ? invoicesForSupplier.sort((a: any, b: any) => new Date(b.created_at || 0).getTime() - new Date(a.created_at || 0).getTime())[0] : null;

            setSupplier({
              id: found.id,
              name: found.contact_person,
              businessName: found.business_name,
              supplierType: found.supplier_type || 'business',
              contactPerson: found.contact_person,
              mobile: found.mobile_number,
              email: found.email || '',
              address: `${found.address_line_1}${found.address_line_2 ? ', ' + found.address_line_2 : ''}${found.address_line_3 ? ', ' + found.address_line_3 : ''}, ${found.city}, ${found.pincode}, ${found.state}`,
              gstin: found.gstin_pan || '',
              avatar: '',
              supplierScore: m?.health_score || 0,
              onTimeDelivery: m?.on_time_delivery_rate || 0,
              qualityRating: 0,
              responseTime: 0,
              avgDeliveryDays: m?.avg_delivery_days || 0,
              avgPaymentDays: m?.avg_payment_duration_days || 0,
              totalOrders: m?.total_orders || invoicesForSupplier.length,
              completedOrders: paidOrders,
              pendingOrders: pendingOrders,
              overdueOrders: m?.overdue_orders || 0,
              cancelledOrders: 0,
              totalValue,
              totalPaid: m?.total_paid || 0,
              totalDue: m?.total_due || 0,
              lastOrderDate: m?.last_order_date || lastInvoice?.invoice_date || lastInvoice?.created_at || null,
              lastPaymentDate: m?.last_payment_date || null,
              lastDeliveryDate: m?.last_delivery_date || null,
              joinedDate: found.created_at,
              status: found.status || 'active',
              paymentTerms: '',
              deliveryTime: '',
              categories: [...new Set(suppProds.map(p => p.category).filter(c => c && c !== 'Uncategorized'))],
              productCount: suppProds.length,
              createdAt: found.created_at,
              businessId: found.business_id || null,
              linkedUserId: found.linked_user_id || null,
            });
          }
        }
      }
    } catch (error) {
      console.error('Error loading supplier data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    loadSupplierData().catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, [supplierId]);

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

  const handleChatPress = async () => {
    const businessId = bizData?.business?.id;
    if (!businessId) return;

    const supplierDisplayName = supplier.supplierType === 'business' ? supplier.businessName : supplier.name;

    let linkedUserId = supplier.linkedUserId;
    if (!linkedUserId) {
      const linked = await autoLinkSupplierToUser(supplier.id);
      if (linked) linkedUserId = linked;
    }

    if (!linkedUserId) {
      Alert.alert(
        'Not on Manager',
        `${supplierDisplayName} is not on Manager yet. Invite them to start chatting.`,
        [{ text: 'OK' }]
      );
      return;
    }

    const result = await getOrCreateConversation({
      businessId,
      otherPartyId: supplier.id,
      otherPartyType: 'supplier',
      otherPartyName: supplierDisplayName,
      otherPartyUserId: linkedUserId,
    });

    if (result.success && result.conversation) {
      safeRouter.push({
        pathname: '/chat/conversation',
        params: {
          conversationId: result.conversation.id,
          name: supplierDisplayName,
          type: result.crossBusiness ? 'customer' : 'supplier',
          otherPartyId: supplier.id,
          ...(result.crossBusiness ? { crossBusiness: 'true' } : {}),
        }
      });
    }
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
            <Text style={styles.headerTitle}>Loading Supplier...</Text>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <DetailSkeleton />
        </View>
      </View>
    );
  }

  // Show error state if supplier not found
  if (!supplier) {
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
            <Text style={styles.headerTitle}>Supplier Not Found</Text>
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Supplier details could not be loaded</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadSupplierData}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const handleCreatePO = () => {
    safeRouter.push({
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
    <ResponsiveContainer>
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
                  <MessageSquare size={22} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            </SafeAreaView>

      {/* Supplier Header */}
      <View style={styles.supplierHeader}>
        <View style={[styles.supplierHeaderAvatar, styles.supplierHeaderAvatarInitials]}>
          <Text style={styles.supplierHeaderAvatarText}>
            {getInitials(supplier.supplierType === 'business' ? supplier.businessName || supplier.name : supplier.name)}
          </Text>
        </View>
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

      {/* Quick Stats */}
      <View style={{ paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.grey[50], borderTopWidth: 1, borderBottomWidth: 1, borderColor: Colors.grey[200] }}>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
          <View style={{ flex: 1, minWidth: '28%', backgroundColor: Colors.background, borderRadius: 8, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: Colors.textLight, marginBottom: 2 }}>Products</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.primary }}>{supplier.productCount}</Text>
          </View>
          <View style={{ flex: 1, minWidth: '28%', backgroundColor: Colors.background, borderRadius: 8, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: Colors.textLight, marginBottom: 2 }}>Orders</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: Colors.text }}>{supplier.totalOrders}</Text>
          </View>
          <View style={{ flex: 1, minWidth: '28%', backgroundColor: Colors.background, borderRadius: 8, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: Colors.textLight, marginBottom: 2 }}>On-Time</Text>
            <Text style={{ fontSize: 16, fontWeight: '700', color: supplier.onTimeDelivery >= 80 ? Colors.success : supplier.onTimeDelivery >= 50 ? Colors.warning : Colors.error }}>
              {supplier.onTimeDelivery}%
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: '28%', backgroundColor: Colors.background, borderRadius: 8, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: Colors.textLight, marginBottom: 2 }}>Total Value</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.primary }} numberOfLines={1}>{formatAmount(supplier.totalValue)}</Text>
          </View>
          <View style={{ flex: 1, minWidth: '28%', backgroundColor: Colors.background, borderRadius: 8, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: Colors.textLight, marginBottom: 2 }}>Last Order</Text>
            <Text style={{ fontSize: 12, fontWeight: '600', color: Colors.text }} numberOfLines={1}>
              {supplier.lastOrderDate ? formatDate(supplier.lastOrderDate) : 'Never'}
            </Text>
          </View>
          <View style={{ flex: 1, minWidth: '28%', backgroundColor: Colors.background, borderRadius: 8, padding: 10, alignItems: 'center' }}>
            <Text style={{ fontSize: 11, color: Colors.textLight, marginBottom: 2 }}>Categories</Text>
            <Text style={{ fontSize: 14, fontWeight: '700', color: Colors.text }}>
              {supplier.categories?.length || 0}
            </Text>
          </View>
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
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {selectedTab === 'overview' && (
          <View style={styles.overviewContainer}>
            {/* Health Score */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Supplier Health</Text>
              <View style={{ alignItems: 'center', paddingVertical: 8 }}>
                <View style={[styles.scoreBadge, { backgroundColor: `${getScoreColor(supplier.supplierScore)}15`, paddingHorizontal: 20, paddingVertical: 12 }]}>
                  <Award size={24} color={getScoreColor(supplier.supplierScore)} />
                  <Text style={[styles.scoreValue, { fontSize: 28, color: getScoreColor(supplier.supplierScore) }]}>{supplier.supplierScore}</Text>
                  <Text style={{ fontSize: 14, color: getScoreColor(supplier.supplierScore), fontWeight: '500' }}>/100</Text>
                </View>
                <Text style={{ fontSize: 12, color: Colors.textLight, marginTop: 6 }}>
                  {supplier.supplierScore >= 80 ? 'Excellent Supplier' : supplier.supplierScore >= 60 ? 'Good Supplier' : supplier.supplierScore >= 40 ? 'Average Supplier' : 'Needs Improvement'}
                </Text>
              </View>
            </View>

            {/* Performance Metrics */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Performance Metrics</Text>
              <View style={styles.metricsGrid}>
                <View style={styles.metricCard}>
                  <Truck size={20} color={Colors.primary} />
                  <Text style={styles.metricLabel}>On-Time Delivery</Text>
                  <Text style={[styles.metricValue, { color: supplier.onTimeDelivery >= 80 ? Colors.success : supplier.onTimeDelivery >= 50 ? Colors.warning : Colors.error }]}>
                    {supplier.onTimeDelivery}%
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Clock size={20} color={Colors.warning} />
                  <Text style={styles.metricLabel}>Avg Delivery</Text>
                  <Text style={styles.metricValue}>
                    {supplier.avgDeliveryDays || 0} days
                  </Text>
                </View>

                <View style={styles.metricCard}>
                  <Banknote size={20} color={Colors.success} />
                  <Text style={styles.metricLabel}>Avg Payment</Text>
                  <Text style={styles.metricValue}>
                    {supplier.avgPaymentDays || 0} days
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
                {supplier.paymentTerms ? (
                  <View style={styles.termRow}>
                    <Text style={styles.termLabel}>Payment Terms:</Text>
                    <Text style={styles.termValue}>{supplier.paymentTerms}</Text>
                  </View>
                ) : null}
                {supplier.deliveryTime ? (
                  <View style={styles.termRow}>
                    <Text style={styles.termLabel}>Delivery Time:</Text>
                    <Text style={styles.termValue}>{supplier.deliveryTime}</Text>
                  </View>
                ) : null}
                <View style={styles.termRow}>
                  <Text style={styles.termLabel}>Added On:</Text>
                  <Text style={styles.termValue}>{supplier.createdAt ? formatDate(supplier.createdAt) : 'N/A'}</Text>
                </View>
                <View style={styles.termRow}>
                  <Text style={styles.termLabel}>Last Order:</Text>
                  <Text style={styles.termValue}>{supplier.lastOrderDate ? formatDate(supplier.lastOrderDate) : 'Never'}</Text>
                </View>
                {supplier.lastPaymentDate && (
                  <View style={styles.termRow}>
                    <Text style={styles.termLabel}>Last Payment:</Text>
                    <Text style={styles.termValue}>{formatDate(supplier.lastPaymentDate)}</Text>
                  </View>
                )}
                {supplier.lastDeliveryDate && (
                  <View style={styles.termRow}>
                    <Text style={styles.termLabel}>Last Delivery:</Text>
                    <Text style={styles.termValue}>{formatDate(supplier.lastDeliveryDate)}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Financial Overview */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Financial Overview</Text>
              <View style={styles.termsCard}>
                <View style={styles.termRow}>
                  <Text style={styles.termLabel}>Total Purchases</Text>
                  <Text style={[styles.termValue, { color: Colors.primary }]}>{formatAmount(supplier.totalValue)}</Text>
                </View>
                <View style={styles.termRow}>
                  <Text style={styles.termLabel}>Amount Paid</Text>
                  <Text style={[styles.termValue, { color: Colors.success }]}>{formatAmount(supplier.totalPaid || 0)}</Text>
                </View>
                <View style={styles.termRow}>
                  <Text style={styles.termLabel}>Outstanding Due</Text>
                  <Text style={[styles.termValue, { color: (supplier.totalDue || 0) > 0 ? Colors.error : Colors.success }]}>{formatAmount(supplier.totalDue || 0)}</Text>
                </View>
              </View>
            </View>

            {/* Order Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Order Summary</Text>
              <View style={styles.orderSummaryGrid}>
                <View style={styles.orderSummaryCard}>
                  <CheckCircle size={20} color={Colors.success} />
                  <Text style={styles.orderSummaryLabel}>Paid</Text>
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
                  <Text style={styles.orderSummaryLabel}>Overdue</Text>
                  <Text style={[styles.orderSummaryValue, { color: Colors.error }]}>
                    {supplier.overdueOrders || 0}
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
              {supplierProducts.length === 0 ? (
                <View style={{ alignItems: 'center', paddingVertical: 40 }}>
                  <Package size={40} color={Colors.grey[300]} />
                  <Text style={{ fontSize: 16, fontWeight: '600', color: Colors.text, marginTop: 12 }}>No Products Yet</Text>
                  <Text style={{ fontSize: 13, color: Colors.textLight, marginTop: 4, textAlign: 'center', paddingHorizontal: 24 }}>
                    Products with this supplier as their preferred supplier will appear here
                  </Text>
                </View>
              ) : (
                supplierProducts.map(renderProductCard)
              )}
            </View>
          </View>
        )}

        {selectedTab === 'transactions' && (
          <View style={styles.transactionsContainer}>
            {/* Summary strip */}
            {supplierInvoices.length > 0 && (() => {
              const totalVal = supplierInvoices.reduce((s: number, inv: any) => s + (Number(inv.total_amount) || 0), 0);
              const paidVal = supplierInvoices.reduce((s: number, inv: any) => s + (Number(inv.paid_amount) || 0), 0);
              const dueVal = totalVal - paidVal;
              return (
                <View style={styles.txSummaryStrip}>
                  <View style={styles.txSummaryItem}>
                    <Text style={styles.txSummaryLabel}>Total</Text>
                    <Text style={styles.txSummaryVal}>{formatAmount(totalVal)}</Text>
                  </View>
                  <View style={[styles.txSummaryDivider]} />
                  <View style={styles.txSummaryItem}>
                    <Text style={styles.txSummaryLabel}>Paid</Text>
                    <Text style={[styles.txSummaryVal, { color: Colors.success }]}>{formatAmount(paidVal)}</Text>
                  </View>
                  <View style={[styles.txSummaryDivider]} />
                  <View style={styles.txSummaryItem}>
                    <Text style={styles.txSummaryLabel}>Due</Text>
                    <Text style={[styles.txSummaryVal, { color: dueVal > 0 ? Colors.error : Colors.success }]}>{formatAmount(dueVal)}</Text>
                  </View>
                </View>
              );
            })()}

            <View style={styles.transactionsHeader}>
              <Text style={styles.sectionTitle}>Purchase Invoices ({supplierInvoices.length})</Text>
            </View>

            <View style={styles.transactionsList}>
              {supplierInvoices.length === 0 ? (
                <View style={styles.txEmptyState}>
                  <View style={styles.txEmptyIcon}>
                    <FileText size={28} color={Colors.grey[300]} />
                  </View>
                  <Text style={styles.txEmptyTitle}>No Invoices Yet</Text>
                  <Text style={styles.txEmptySubtitle}>Purchase invoices from this supplier will appear here</Text>
                </View>
              ) : (
                supplierInvoices.map((inv: any) => {
                  const invTotal = Number(inv.total_amount) || 0;
                  const invPaid = Number(inv.paid_amount) || 0;
                  const payStatus = inv.payment_status || 'pending';
                  const invNum = inv.invoice_number || 'N/A';
                  const invDate = inv.invoice_date || inv.created_at;
                  let items = Array.isArray(inv.items) ? inv.items : [];
                  if (items.length === 0) {
                    const cached = getCachedPurchaseInvoiceItems(inv.id);
                    if (cached) items = cached;
                  }
                  const itemCount = items.length;
                  const itemNames = items.slice(0, 3).map((i: any) => i.product_name || i.productName || '').filter(Boolean);
                  const moreCount = items.length > 3 ? items.length - 3 : 0;
                  const balanceDue = invTotal - invPaid;
                  const statusColor = payStatus === 'paid' ? Colors.success : payStatus === 'pending' ? Colors.warning : Colors.error;
                  const statusBg = payStatus === 'paid' ? Colors.success + '12' : payStatus === 'pending' ? Colors.warning + '12' : Colors.error + '12';

                  return (
                    <TouchableOpacity
                      key={inv.id}
                      style={styles.txCard}
                      onPress={() => safeRouter.push({ pathname: '/purchasing/invoice-details', params: { invoiceId: inv.id, invoiceData: JSON.stringify(inv) } })}
                      activeOpacity={0.7}
                    >
                      <View style={styles.txCardTop}>
                        <View style={[styles.txStatusDot, { backgroundColor: statusColor }]} />
                        <View style={{ flex: 1 }}>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                            <Text style={styles.txInvNum}>#{invNum}</Text>
                            <Text style={styles.txAmount}>{formatAmount(invTotal)}</Text>
                          </View>
                          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 4 }}>
                            <Text style={styles.txDate}>{invDate ? formatDate(invDate) : '—'}</Text>
                            <View style={[styles.txStatusChip, { backgroundColor: statusBg }]}>
                              <Text style={[styles.txStatusChipText, { color: statusColor }]}>
                                {payStatus === 'paid' ? 'Paid' : balanceDue > 0 ? `Due ${formatAmount(balanceDue)}` : 'Unpaid'}
                              </Text>
                            </View>
                          </View>
                        </View>
                      </View>

                      {itemNames.length > 0 && (
                        <View style={styles.txItemRow}>
                          <Package size={13} color={Colors.textLight} />
                          <Text style={styles.txItemText} numberOfLines={1}>
                            {itemNames.join(', ')}{moreCount > 0 ? ` +${moreCount} more` : ''}
                          </Text>
                          <Text style={styles.txItemCount}>{itemCount} item{itemCount !== 1 ? 's' : ''}</Text>
                        </View>
                      )}

                      {itemNames.length === 0 && (
                        <View style={styles.txItemRow}>
                          <Package size={13} color={Colors.textLight} />
                          <Text style={styles.txItemText}>{itemCount > 0 ? `${itemCount} item${itemCount !== 1 ? 's' : ''}` : 'Items not available'}</Text>
                        </View>
                      )}
                    </TouchableOpacity>
                  );
                })
              )}
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
        </ResponsiveContainer>
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
  supplierHeaderAvatarInitials: {
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplierHeaderAvatarText: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.background,
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
    marginBottom: 12,
  },
  transactionsSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  transactionsList: {
    gap: 10,
  },

  txSummaryStrip: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  txSummaryItem: {
    flex: 1,
    alignItems: 'center' as const,
  },
  txSummaryLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
    textTransform: 'uppercase' as const,
    letterSpacing: 0.5,
  },
  txSummaryVal: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  txSummaryDivider: {
    width: 1,
    backgroundColor: Colors.grey[200],
    marginHorizontal: 8,
  },

  txEmptyState: {
    alignItems: 'center' as const,
    paddingVertical: 40,
  },
  txEmptyIcon: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center' as const,
    alignItems: 'center' as const,
    marginBottom: 12,
  },
  txEmptyTitle: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
    marginBottom: 4,
  },
  txEmptySubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    textAlign: 'center' as const,
    maxWidth: 220,
  },

  txCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 1,
  },
  txCardTop: {
    flexDirection: 'row' as const,
    alignItems: 'flex-start' as const,
    gap: 10,
  },
  txStatusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginTop: 6,
  },
  txInvNum: {
    fontSize: 15,
    fontWeight: '600' as const,
    color: Colors.text,
  },
  txAmount: {
    fontSize: 15,
    fontWeight: '700' as const,
    color: Colors.text,
  },
  txDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  txStatusChip: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
  },
  txStatusChipText: {
    fontSize: 11,
    fontWeight: '600' as const,
  },
  txItemRow: {
    flexDirection: 'row' as const,
    alignItems: 'center' as const,
    gap: 6,
    marginTop: 10,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  txItemText: {
    flex: 1,
    fontSize: 12,
    color: Colors.textLight,
  },
  txItemCount: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '500' as const,
  },
  createPOSection: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  createPOButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  createPOButtonText: {
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