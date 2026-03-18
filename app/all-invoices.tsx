import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Image,
  Platform,
  RefreshControl,
} from 'react-native';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import { useWebBackNavigation } from '@/hooks/useWebBackNavigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { getInvoices, getReturns, getPurchaseInvoices, invalidateApiCache } from '@/services/backendApi';
import { ListSkeleton } from '@/components/SkeletonLoader';
import ExportModal from '@/components/ExportModal';
import DateFilterBar, { TimeRange, filterByDateRange } from '@/components/DateFilterBar';
import { formatIndianNumber, formatCurrencyINR, formatDateDDMMYYYY } from '@/utils/formatters';
import { setNavData } from '@/utils/navStore';

import { 
  ArrowLeft, 
  Download,
  Share,
  Eye,
  ShoppingCart,
  RotateCcw,
  FileText,
  User,
  Building2,
  Banknote,
  Smartphone,
  CreditCard,
  IndianRupee,
  Search,
  Filter,
  Plus
} from 'lucide-react-native';

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

interface Invoice {
  id: string;
  invoiceNumber: string;
  customerName: string;
  customerType: 'individual' | 'business';
  staffName: string;
  staffAvatar: string;
  paymentStatus: 'paid' | 'partially_paid' | 'pending';
  paymentMethod: 'cash' | 'upi' | 'card' | 'others';
  amount: number;
  itemCount: number;
  date: string;
  time: string;
  status: 'sale' | 'return' | 'purchase';
  originalInvoice?: string;
  supplierName?: string;
}

// TimeRange type imported from DateFilterBar

function mapPaymentStatus(dbStatus: string): 'paid' | 'partially_paid' | 'pending' {
  if (dbStatus === 'paid') return 'paid';
  if (dbStatus === 'partial') return 'partially_paid';
  return 'pending';
}

export default function AllInvoicesScreen() {
  const { handleBack } = useWebBackNavigation();
  const [allInvoices, setAllInvoices] = useState<Invoice[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInvoices, setFilteredInvoices] = useState<Invoice[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'sales' | 'returns' | 'purchases'>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [showExportModal, setShowExportModal] = useState(false);
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showFABMenu, setShowFABMenu] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  
  // Use debounced navigation for FAB buttons
  const debouncedNavigate = useDebounceNavigation(500);

  const loadAllTransactions = useCallback(async () => {
    const allMapped: Invoice[] = [];

    const [salesResult, returnsResult, purchasesResult] = await Promise.allSettled([
      getInvoices(),
      getReturns(),
      getPurchaseInvoices(),
    ]);

    // Map sales invoices
    if (salesResult.status === 'fulfilled' && salesResult.value.success && salesResult.value.invoices) {
      salesResult.value.invoices.forEach((inv: any) => {
        const invoiceDate = inv.invoice_date ? new Date(inv.invoice_date) : new Date();
        const dateStr = invoiceDate.toISOString().split('T')[0];
        const timeStr = invoiceDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        allMapped.push({
          id: inv.id,
          invoiceNumber: inv.invoice_number ?? '',
          customerName: inv.customer_name ?? '',
          customerType: (inv.customer_type === 'business' ? 'business' : 'individual') as 'individual' | 'business',
          staffName: inv.staff_name || '',
          staffAvatar: '',
          paymentStatus: mapPaymentStatus(inv.payment_status ?? 'unpaid'),
          paymentMethod: (inv.payment_method ?? 'others') as 'cash' | 'upi' | 'card' | 'others',
          amount: Number(inv.total_amount ?? 0),
          itemCount: inv.item_count || 0,
          date: dateStr,
          time: timeStr,
          status: 'sale' as const,
        });
      });
    }

    // Map returns
    if (returnsResult.status === 'fulfilled' && returnsResult.value.success && returnsResult.value.returns) {
      returnsResult.value.returns.forEach((ret: any) => {
        const returnDate = ret.return_date || ret.created_at ? new Date(ret.return_date || ret.created_at) : new Date();
        const dateStr = returnDate.toISOString().split('T')[0];
        const timeStr = returnDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        allMapped.push({
          id: ret.id,
          invoiceNumber: ret.return_number ?? '',
          customerName: ret.customer_name ?? '',
          customerType: 'individual' as const,
          staffName: ret.staff_name || '',
          staffAvatar: '',
          paymentStatus: ret.refund_status === 'refunded' ? 'paid' : 'pending',
          paymentMethod: (ret.refund_method ?? 'others') as 'cash' | 'upi' | 'card' | 'others',
          amount: Number(ret.refund_amount ?? ret.total_amount ?? 0),
          itemCount: ret.item_count || 0,
          date: dateStr,
          time: timeStr,
          status: 'return' as const,
          originalInvoice: ret.original_invoice_number ?? '',
        });
      });
    }

    // Map purchase invoices
    if (purchasesResult.status === 'fulfilled' && purchasesResult.value.success && purchasesResult.value.invoices) {
      purchasesResult.value.invoices.forEach((inv: any) => {
        const invoiceDate = inv.invoice_date || inv.created_at ? new Date(inv.invoice_date || inv.created_at) : new Date();
        const dateStr = invoiceDate.toISOString().split('T')[0];
        const timeStr = invoiceDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });
        allMapped.push({
          id: inv.id,
          invoiceNumber: inv.invoice_number ?? '',
          customerName: inv.supplier_name ?? '',
          customerType: 'business' as const,
          staffName: inv.staff_name || '',
          staffAvatar: '',
          paymentStatus: mapPaymentStatus(inv.payment_status ?? 'unpaid'),
          paymentMethod: (inv.payment_method ?? 'others') as 'cash' | 'upi' | 'card' | 'others',
          amount: Number(inv.total_amount ?? 0),
          itemCount: inv.item_count || 0,
          date: dateStr,
          time: timeStr,
          status: 'purchase' as const,
          supplierName: inv.supplier_name ?? '',
        });
      });
    }

    // Sort by date descending
    allMapped.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());

    setAllInvoices(allMapped);
  }, []);

  useEffect(() => {
    (async () => {
      await loadAllTransactions();
      setIsLoading(false);
    })();
  }, [loadAllTransactions]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    loadAllTransactions().catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, [loadAllTransactions]);

  // filtering handled by the useEffect with filterByDateRange

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleFilterChange = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
  };

  const handleNewSalePress = () => {
    const { canPerformAction } = require('@/utils/trialUtils');
    if (!canPerformAction('create new sale')) return;
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/new-sale');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleNewReturnPress = () => {
    const { canPerformAction } = require('@/utils/trialUtils');
    if (!canPerformAction('create new return')) return;
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/new-return');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleNewPurchasePress = () => {
    const { canPerformAction } = require('@/utils/trialUtils');
    if (!canPerformAction('create new purchase')) return;
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/purchasing/add-purchase-invoice');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  useEffect(() => {
    let filtered = allInvoices;

    if (searchQuery.trim() !== '') {
      const q = searchQuery.toLowerCase();
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(q) ||
        invoice.customerName.toLowerCase().includes(q) ||
        invoice.staffName.toLowerCase().includes(q)
      );
    }

    if (selectedFilter !== 'all') {
      filtered = filtered.filter(invoice => {
        if (selectedFilter === 'sales') return invoice.status === 'sale';
        if (selectedFilter === 'returns') return invoice.status === 'return';
        if (selectedFilter === 'purchases') return invoice.status === 'purchase';
        return true;
      });
    }

    filtered = filterByDateRange(filtered, (inv) => inv.date, selectedTimeRange, customFromDate, customToDate);

    setFilteredInvoices(filtered);
  }, [allInvoices, searchQuery, selectedFilter, selectedTimeRange, customFromDate, customToDate]);

  const handleInvoicePress = (invoice: Invoice) => {
    if (invoice.status === 'return') {
      // Navigate to return details
      const returnData = {
        id: invoice.id,
        returnNumber: invoice.invoiceNumber,
        originalInvoiceNumber: invoice.originalInvoice || '',
        customerName: invoice.customerName,
        customerType: invoice.customerType,
        staffName: invoice.staffName,
        staffAvatar: invoice.staffAvatar,
        refundStatus: (invoice as any).refundStatus || 'pending',
        amount: invoice.amount,
        itemCount: invoice.itemCount,
        date: invoice.date,
        reason: (invoice as any).reason || '',
        customerDetails: {
          name: invoice.customerName,
          mobile: (invoice as any).customerMobile || '',
          address: ''
        }
      };

      setNavData('returnData', returnData);
      router.push({
        pathname: '/return-details',
        params: {
          returnId: returnData.id,
        }
      });
    } else if (invoice.status === 'purchase') {
      router.push({
        pathname: '/purchasing/invoice-details',
        params: { invoiceId: invoice.id }
      });
    } else {
      const invoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        customerType: invoice.customerType,
        staffName: invoice.staffName,
        staffAvatar: invoice.staffAvatar,
        paymentStatus: invoice.paymentStatus,
        paymentMethod: (invoice as any).paymentMethod || '',
        amount: invoice.amount,
        totalAmount: invoice.amount,
        itemCount: invoice.itemCount,
        date: invoice.date,
        invoiceDate: invoice.date,
        customerDetails: {
          name: invoice.customerName,
          mobile: (invoice as any).customerMobile || '',
          businessName: invoice.customerType === 'business' ? invoice.customerName : undefined,
          address: (invoice as any).customerAddress || '',
        }
      };

      setNavData('invoiceData', invoiceData);
      router.push({
        pathname: '/invoice-details',
        params: {
          invoiceId: invoiceData.id,
        }
      });
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return Banknote;
      case 'upi': return Smartphone;
      case 'card': return CreditCard;
      case 'others': return Building2;
      default: return IndianRupee;
    }
  };

  const getPaymentMethodColor = (method: string) => {
    switch (method) {
      case 'cash': return Colors.success;
      case 'upi': return Colors.primary;
      case 'card': return Colors.warning;
      case 'others': return Colors.error;
      default: return Colors.textLight;
    }
  };

  const getPaymentMethodName = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'upi': return 'UPI';
      case 'card': return 'Card';
      case 'others': return 'Others';
      default: return method;
    }
  };

  const formatAmount = (amount: number) => formatCurrencyINR(amount, 2, 0);

  const formatDate = (dateString: string) => formatDateDDMMYYYY(dateString);

  const handleInvoiceAction = (action: string, invoiceId: string) => {
    console.log(`${action} action for invoice ${invoiceId}`);
    // Implement action logic here
  };

  const renderInvoiceCard = (invoice: Invoice) => {
    const isReturn = invoice.status === 'return';
    const isPurchase = invoice.status === 'purchase';
    const statusColor = isReturn ? Colors.error : isPurchase ? Colors.warning : Colors.success;
    const StatusIcon = isReturn ? RotateCcw : isPurchase ? ShoppingCart : ShoppingCart;
    const PaymentIcon = getPaymentMethodIcon(invoice.paymentMethod);
    const paymentColor = getPaymentMethodColor(invoice.paymentMethod);

    return (
      <TouchableOpacity
        key={invoice.id}
        style={[styles.invoiceCard, { borderLeftColor: statusColor }]}
        onPress={() => handleInvoicePress(invoice)}
        activeOpacity={0.7}
      >
        {/* Top Section */}
        <View style={styles.invoiceHeader}>
          {/* Left Side - Invoice Info */}
          <View style={styles.invoiceLeft}>
            <View style={[styles.invoiceStatusIcon, { backgroundColor: `${statusColor}20` }]}>
              <StatusIcon size={20} color={statusColor} />
            </View>
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
              {isReturn && invoice.originalInvoice && (
                <Text style={styles.originalInvoice}>
                  Return for: {invoice.originalInvoice}
                </Text>
              )}
              <View style={styles.customerInfo}>
                {invoice.customerType === 'business' ? (
                  <Building2 size={14} color={Colors.textLight} />
                ) : (
                  <User size={14} color={Colors.textLight} />
                )}
                <Text style={styles.customerName}>{invoice.customerName}</Text>
              </View>
            </View>
          </View>

          {/* Right Side - Status and Amount */}
          <View style={styles.invoiceRight}>
            <Text style={[
              styles.invoiceAmount,
              { color: statusColor }
            ]}>
              {isReturn ? '-' : ''}{formatAmount(invoice.amount)}
            </Text>
            <Text style={styles.invoiceTime}>{invoice.time}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` }
            ]}>
                          <Text style={[styles.statusText, { color: statusColor }]}>
              {isReturn ? 'RETURN' : isPurchase ? 'PURCHASE' : 'SALE'}
            </Text>
            </View>
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.paymentSection}>
          <View style={[styles.paymentMethodBadge, { backgroundColor: `${paymentColor}20` }]}>
            <PaymentIcon size={16} color={paymentColor} />
            <Text style={[styles.paymentMethodText, { color: paymentColor }]}>
              {getPaymentMethodName(invoice.paymentMethod)}
            </Text>
          </View>
          
          <Text style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.invoiceFooter}>
          {/* Left Side - Staff Info */}
          <View style={styles.staffInfo}>
            {invoice.staffAvatar ? (
              <Image 
                source={{ uri: invoice.staffAvatar }}
                style={styles.staffAvatar}
              />
            ) : (
              <View style={[styles.staffAvatar, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                <User size={14} color="#6B7280" />
              </View>
            )}
            <Text style={styles.staffName} numberOfLines={1}>Processed by {invoice.staffName || 'Unknown'}</Text>
          </View>

          {/* Right Side - Action Icons */}
          <View style={styles.actionIcons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleInvoiceAction('download', invoice.id)}
              activeOpacity={0.7}
            >
              <Download size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleInvoiceAction('share', invoice.id)}
              activeOpacity={0.7}
            >
              <Share size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleInvoicePress(invoice)}
              activeOpacity={0.7}
            >
              <Eye size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const salesInvoices = filteredInvoices.filter(inv => inv.status === 'sale');
  const returnInvoices = filteredInvoices.filter(inv => inv.status === 'return');
  const purchaseInvoices = filteredInvoices.filter(inv => inv.status === 'purchase');
  const totalSalesAmount = salesInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalReturns = returnInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalPurchases = purchaseInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const netSales = totalSalesAmount - totalReturns;

  return (
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
        
        <Text style={styles.headerTitle}>All Invoices</Text>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => setShowExportModal(true)}
          activeOpacity={0.7}
        >
          <Download size={20} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredInvoices.length} invoices
          </Text>
        </View>
      </View>

      {/* Date Filter Chips */}
      <DateFilterBar
        selectedRange={selectedTimeRange}
        onRangeChange={setSelectedTimeRange}
        customFromDate={customFromDate}
        customToDate={customToDate}
        onCustomFromChange={setCustomFromDate}
        onCustomToChange={setCustomToDate}
      />

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <ShoppingCart size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Sales</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {formatAmount(totalSalesAmount)}
            </Text>
            <Text style={styles.summaryCount}>
              {salesInvoices.length} invoices
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <RotateCcw size={20} color={Colors.error} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Returns</Text>
            <Text style={[styles.summaryValue, { color: Colors.error }]}>
              {formatAmount(totalReturns)}
            </Text>
            <Text style={styles.summaryCount}>
              {returnInvoices.length} returns
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <ShoppingCart size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Purchases</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {formatAmount(totalPurchases)}
            </Text>
            <Text style={styles.summaryCount}>
              {purchaseInvoices.length} invoices
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Search Bar - Inline between summary and content */}
      <View style={styles.inlineSearchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search invoices..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => console.log('Advanced filter')}
            activeOpacity={0.7}
          >
            <Filter size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterTabsWrapper}
        >
          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedFilter === 'all' && styles.activeFilterTab
            ]}
            onPress={() => handleFilterChange('all')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterTabText,
              selectedFilter === 'all' && styles.activeFilterTabText
            ]}>
              All
            </Text>
            <View style={[
              styles.filterTabBadge,
              selectedFilter === 'all' && styles.activeFilterTabBadge
            ]}>
              <Text style={[
                styles.filterTabCount,
                selectedFilter === 'all' && styles.activeFilterTabCount
              ]}>
                {allInvoices.length}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedFilter === 'sales' && styles.activeFilterTab
            ]}
            onPress={() => handleFilterChange('sales')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterTabText,
              selectedFilter === 'sales' && styles.activeFilterTabText
            ]}>
              Sales
            </Text>
            <View style={[
              styles.filterTabBadge,
              selectedFilter === 'sales' && styles.activeFilterTabBadge
            ]}>
              <Text style={[
                styles.filterTabCount,
                selectedFilter === 'sales' && styles.activeFilterTabCount
              ]}>
                {salesInvoices.length}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedFilter === 'returns' && styles.activeFilterTab
            ]}
            onPress={() => handleFilterChange('returns')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterTabText,
              selectedFilter === 'returns' && styles.activeFilterTabText
            ]}>
              Returns
            </Text>
            <View style={[
              styles.filterTabBadge,
              selectedFilter === 'returns' && styles.activeFilterTabBadge
            ]}>
              <Text style={[
                styles.filterTabCount,
                selectedFilter === 'returns' && styles.activeFilterTabCount
              ]}>
                {returnInvoices.length}
              </Text>
            </View>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.filterTab,
              selectedFilter === 'purchases' && styles.activeFilterTab
            ]}
            onPress={() => handleFilterChange('purchases')}
            activeOpacity={0.7}
          >
            <Text style={[
              styles.filterTabText,
              selectedFilter === 'purchases' && styles.activeFilterTabText
            ]}>
              Purchases
            </Text>
            <View style={[
              styles.filterTabBadge,
              selectedFilter === 'purchases' && styles.activeFilterTabBadge
            ]}>
              <Text style={[
                styles.filterTabCount,
                selectedFilter === 'purchases' && styles.activeFilterTabCount
              ]}>
                {purchaseInvoices.length}
              </Text>
            </View>
          </TouchableOpacity>
        </ScrollView>
      </View>

      {/* Invoice List */}
      {isLoading ? (
        <ListSkeleton itemCount={6} showSearch={true} showFilter={true} />
      ) : (
        <FlatList
          data={filteredInvoices}
          renderItem={({item}) => renderInvoiceCard(item)}
          keyExtractor={(item) => item.id}
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <FileText size={64} color={Colors.textLight} />
              <Text style={styles.emptyStateTitle}>No Invoices Found</Text>
              <Text style={styles.emptyStateText}>
                {searchQuery ? 'No invoices match your search criteria' : 'No invoices for the selected time period'}
              </Text>
            </View>
          }
        />
      )}



      {/* FAB Menu */}
      <View style={styles.fabContainer}>
        {/* FAB Menu Options */}
        {showFABMenu && (
          <View style={styles.fabMenu}>
            <TouchableOpacity
              style={[styles.fabMenuItem, { backgroundColor: Colors.success }]}
              onPress={handleNewSalePress}
              activeOpacity={0.8}
              disabled={isNavigating}
            >
              <Text style={styles.fabMenuText}>New Sale</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.fabMenuItem, { backgroundColor: Colors.error }]}
              onPress={handleNewReturnPress}
              activeOpacity={0.8}
              disabled={isNavigating}
            >
              <Text style={styles.fabMenuText}>New Return</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[styles.fabMenuItem, { backgroundColor: Colors.warning }]}
              onPress={handleNewPurchasePress}
              activeOpacity={0.8}
              disabled={isNavigating}
            >
              <Text style={styles.fabMenuText}>New Purchase</Text>
            </TouchableOpacity>
          </View>
        )}
        
        {/* Main FAB */}
        <TouchableOpacity
          style={[styles.mainFAB, isNavigating && styles.fabDisabled]}
          onPress={() => setShowFABMenu(!showFABMenu)}
          activeOpacity={0.8}
          disabled={isNavigating}
        >
          <Plus size={24} color={Colors.background} />
        </TouchableOpacity>
      </View>

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        config={{
          title: 'All Invoices',
          fileName: 'all_invoices',
          columns: [
            { key: 'invoiceNumber', header: 'Invoice #' },
            { key: 'date', header: 'Date' },
            { key: 'status', header: 'Type', format: (v) => v === 'sale' ? 'Sale' : v === 'return' ? 'Return' : 'Purchase' },
            { key: 'customerName', header: 'Customer/Supplier', format: (v, row) => row.supplierName || v || '' },
            { key: 'itemCount', header: 'Items', format: (v) => String(v || 0) },
            { key: 'amount', header: 'Amount (₹)', format: (v) => formatIndianNumber(v || 0) },
            { key: 'paymentStatus', header: 'Payment Status', format: (v) => v === 'paid' ? 'Paid' : v === 'partially_paid' ? 'Partially Paid' : 'Pending' },
            { key: 'paymentMethod', header: 'Payment Method', format: (v) => v === 'cash' ? 'Cash' : v === 'upi' ? 'UPI' : v === 'card' ? 'Card' : 'Others' },
            { key: 'staffName', header: 'Processed By' },
          ],
          data: filteredInvoices,
          summaryRows: [
            { label: 'Total Invoices', value: String(filteredInvoices.length) },
            { label: 'Total Amount', value: formatCurrencyINR(filteredInvoices.reduce((s, i) => s + (i.amount || 0), 0)) },
          ],
        }}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
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
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  exportButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#EFF6FF',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  totalCount: {
    fontSize: 14,
    color: Colors.textLight,
  },
  // timeRange styles removed - now using DateFilterBar
  // old timeRange selector styles removed
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: Colors.grey[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
    marginBottom: 2,
  },
  summaryCount: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grey[200],
    marginHorizontal: 16,
  },
  inlineSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    // No background - completely transparent
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    // No shadows or elevation - completely transparent
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    marginRight: 12,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterContainer: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  filterTabsWrapper: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 20,
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    gap: 8,
  },
  activeFilterTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeFilterTabText: {
    color: Colors.background,
    fontWeight: '600',
  },
  filterTabBadge: {
    backgroundColor: Colors.grey[200],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    minWidth: 20,
    alignItems: 'center',
  },
  activeFilterTabBadge: {
    backgroundColor: Colors.background,
  },
  filterTabCount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
  },
  activeFilterTabCount: {
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  invoiceCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  invoiceLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  invoiceStatusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  originalInvoice: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 6,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  customerName: {
    fontSize: 14,
    color: Colors.textLight,
  },
  invoiceRight: {
    alignItems: 'flex-end',
  },
  invoiceAmount: {
    fontSize: 18,
    fontWeight: '700',
    marginBottom: 4,
  },
  invoiceTime: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 6,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  paymentSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '600',
  },
  invoiceDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  invoiceFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  staffAvatar: {
    width: 24,
    height: 24,
    borderRadius: 12,
  },
  staffName: {
    fontSize: 12,
    color: Colors.textLight,
  },
  actionIcons: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  // old modal styles removed - now using DateFilterBar
  fabContainer: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    alignItems: 'flex-end',
  },
  fabMenu: {
    marginBottom: 16,
    gap: 12,
  },
  fabMenuItem: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  fabMenuText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: '600',
  },
  mainFAB: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabDisabled: {
    opacity: 0.6,
  },
});