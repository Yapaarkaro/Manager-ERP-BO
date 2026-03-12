import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  Image,
  Keyboard,
  Platform,
  TextInput,
  Modal,
  RefreshControl,
} from 'react-native';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useWebBackNavigation } from '@/hooks/useWebBackNavigation';
import { 
  ArrowLeft, 
  Download,
  Share,
  Eye,
  RotateCcw,
  Plus,
  FileText,
  Search,
  Filter,
  Package,
  User
} from 'lucide-react-native';
import AnimatedSearchBar from '@/components/AnimatedSearchBar';

import { getReturns, invalidateApiCache } from '@/services/backendApi';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { ListSkeleton } from '@/components/SkeletonLoader';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import ExportModal from '@/components/ExportModal';
import DateFilterBar, { TimeRange, filterByDateRange } from '@/components/DateFilterBar';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  orange: '#EA580C',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

interface ReturnInvoice {
  id: string;
  returnNumber: string;
  originalInvoiceId?: string;
  originalInvoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerType: 'individual' | 'business';
  staffName: string;
  staffAvatar: string;
  refundStatus: 'refunded' | 'partially_refunded' | 'pending';
  amount: number;
  itemCount: number;
  date: string;
  reason: string;
  returnType?: 'customer' | 'supplier';
  supplierName?: string;
  items: any[];
  customerDetails: {
    name: string;
    mobile: string;
    businessName?: string;
    gstin?: string;
    address: string;
    shipToAddress?: string;
    paymentTerms?: string;
  };
}

export default function ReturnsScreen() {
  const { handleBack } = useWebBackNavigation();
  const [returnInvoices, setReturnInvoices] = useState<ReturnInvoice[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredReturns, setFilteredReturns] = useState<ReturnInvoice[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    refundStatus: [] as string[],
    customerType: [] as string[],
    dateRange: 'all' as string,
    amountRange: 'none' as string,
    staffMember: [] as string[],
    reason: [] as string[],
  });
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [refreshing, setRefreshing] = useState(false);

  
  // Use debounced navigation for FAB button
  const debouncedNavigate = useDebounceNavigation(500);

  useEffect(() => {
    let cancelled = false;
    setIsLoading(true);
    (async () => {
      const { success, returns: data } = await getReturns();
      if (cancelled) return;
      setIsLoading(false);
      if (!success || !data) return;
      const mapped: ReturnInvoice[] = data.map((r: any) => ({
        id: r.id,
        returnNumber: r.return_number || '',
        originalInvoiceId: r.original_invoice_id || '',
        originalInvoiceNumber: r.original_invoice_number || '',
        customerId: r.customer_id || '',
        customerName: r.return_type === 'supplier' ? (r.supplier_name || r.customer_name || '') : (r.customer_name || ''),
        customerType: (r.customer_type === 'business' ? 'business' : 'individual') as 'individual' | 'business',
        staffName: r.staff_name || '',
        staffAvatar: '',
        refundStatus: (r.refund_status || 'pending') as 'refunded' | 'partially_refunded' | 'pending',
        amount: Number(r.total_amount) || 0,
        itemCount: Number(r.item_count) || 0,
        date: r.return_date || '',
        reason: r.reason || '',
        returnType: r.return_type === 'supplier' ? 'supplier' : 'customer',
        supplierName: r.supplier_name || '',
        items: [],
        customerDetails: {
          name: r.customer_name || '',
          mobile: '',
          address: '',
        },
      }));
      setReturnInvoices(mapped);
    })();
    return () => { cancelled = true; };
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    (async () => {
      try {
        const { success, returns: data } = await getReturns();
        if (success && data) {
          const mapped: ReturnInvoice[] = data.map((r: any) => ({
            id: r.id,
            returnNumber: r.return_number || '',
            originalInvoiceId: r.original_invoice_id || '',
            originalInvoiceNumber: r.original_invoice_number || '',
            customerId: r.customer_id || '',
            customerName: r.return_type === 'supplier' ? (r.supplier_name || r.customer_name || '') : (r.customer_name || ''),
            customerType: (r.customer_type === 'business' ? 'business' : 'individual') as 'individual' | 'business',
            staffName: r.staff_name || '',
            staffAvatar: '',
            refundStatus: (r.refund_status || 'pending') as 'refunded' | 'partially_refunded' | 'pending',
            amount: Number(r.total_amount) || 0,
            itemCount: Number(r.item_count) || 0,
            date: r.return_date || '',
            reason: r.reason || '',
            returnType: r.return_type === 'supplier' ? 'supplier' : 'customer',
            supplierName: r.supplier_name || '',
            items: [],
            customerDetails: {
              name: r.customer_name || '',
              mobile: '',
              address: '',
            },
          }));
          setReturnInvoices(mapped);
        }
      } catch (e) {
        console.error('Refresh failed:', e);
      }
    })();
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query);
  };

  const applyFilters = (searchQuery: string = '') => {
    let filtered = returnInvoices;

    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(returnInvoice =>
        returnInvoice.returnNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        returnInvoice.originalInvoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
        returnInvoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        returnInvoice.staffName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        returnInvoice.reason.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply refund status filter
    if (activeFilters.refundStatus.length > 0) {
      filtered = filtered.filter(returnInvoice => 
        activeFilters.refundStatus.includes(returnInvoice.refundStatus)
      );
    }

    // Apply customer type filter
    if (activeFilters.customerType.length > 0) {
      filtered = filtered.filter(returnInvoice => 
        activeFilters.customerType.includes(returnInvoice.customerType)
      );
    }

    // Apply staff member filter
    if (activeFilters.staffMember.length > 0) {
      filtered = filtered.filter(returnInvoice => 
        activeFilters.staffMember.includes(returnInvoice.staffName)
      );
    }

    // Apply reason filter
    if (activeFilters.reason.length > 0) {
      filtered = filtered.filter(returnInvoice => 
        activeFilters.reason.includes(returnInvoice.reason)
      );
    }

    // Apply date range filter via DateFilterBar
    filtered = filterByDateRange(filtered, (ret) => ret.date, selectedTimeRange, customFromDate, customToDate);

    // Apply amount range filter
    if (activeFilters.amountRange !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        if (activeFilters.amountRange === 'lowToHigh') {
          return a.amount - b.amount;
        } else {
          return b.amount - a.amount;
        }
      });
    }

    setFilteredReturns(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'refunded':
        return Colors.success;
      case 'partially_refunded':
        return Colors.warning;
      case 'pending':
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'refunded':
        return 'Refunded';
      case 'partially_refunded':
        return 'Partially Refunded';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

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

  const handleReturnAction = (action: string, returnId: string) => {
    console.log(`${action} action for return ${returnId}`);
    // Implement action logic here
  };

  const handleNewReturn = () => {
    const { canPerformAction } = require('@/utils/trialUtils');
    if (!canPerformAction('create new return')) return;
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/new-return');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleFilterToggle = (filterType: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      
      if (filterType === 'dateRange' || filterType === 'amountRange') {
        (newFilters[filterType] as string) = value;
      } else {
        const currentValues = newFilters[filterType] as string[];
        if (currentValues.includes(value)) {
          (newFilters[filterType] as string[]) = currentValues.filter(v => v !== value);
        } else {
          (newFilters[filterType] as string[]) = [...currentValues, value];
        }
      }
      
      return newFilters;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({
      refundStatus: [],
      customerType: [],
      dateRange: 'all',
      amountRange: 'none',
      staffMember: [],
      reason: [],
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (activeFilters.refundStatus.length > 0) count++;
    if (activeFilters.customerType.length > 0) count++;
    if (activeFilters.dateRange !== 'all') count++;
    if (activeFilters.amountRange !== 'none') count++;
    if (activeFilters.staffMember.length > 0) count++;
    if (activeFilters.reason.length > 0) count++;
    return count;
  };

  // Apply filters whenever activeFilters, returnInvoices, custom dates, or selectedTimeRange change
  useEffect(() => {
    applyFilters(searchQuery);
  }, [activeFilters, returnInvoices, customFromDate, customToDate, selectedTimeRange]);

  // Calculate summary data
  const getSummaryData = () => {
    const totalReturns = returnInvoices.length;
    const totalItems = returnInvoices.reduce((sum, returnItem) => sum + returnItem.itemCount, 0);
    const totalAmount = returnInvoices.reduce((sum, returnItem) => sum + returnItem.amount, 0);

    return {
      totalReturns,
      totalItems,
      totalAmount
    };
  };

  const renderReturnCard = (returnInvoice: ReturnInvoice) => {
    return (
      <TouchableOpacity
        style={styles.returnCard}
        onPress={() => debouncedNavigate({
          pathname: '/return-details',
          params: {
            returnId: returnInvoice.id,
            returnData: JSON.stringify(returnInvoice)
          }
        })}
        activeOpacity={0.7}
      >
        {/* Top Section */}
        <View style={styles.returnHeader}>
          {/* Left Side - Return Info */}
          <View style={styles.returnLeft}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 }}>
              <Text style={styles.returnNumber}>{returnInvoice.returnNumber}</Text>
              {returnInvoice.returnType === 'supplier' && (
                <View style={{ backgroundColor: '#FEF3C7', paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4 }}>
                  <Text style={{ fontSize: 10, fontWeight: '600', color: '#92400E' }}>SUPPLIER</Text>
                </View>
              )}
            </View>
            <Text style={styles.originalInvoice}>
              {returnInvoice.returnType === 'supplier' ? 'Purchase' : 'Original'}: {returnInvoice.originalInvoiceNumber}
            </Text>
            <Text style={styles.customerName}>{returnInvoice.customerName}</Text>
            <View style={styles.staffInfo}>
              {returnInvoice.staffAvatar ? (
                <Image 
                  source={{ uri: returnInvoice.staffAvatar }}
                  style={styles.staffAvatar}
                />
              ) : (
                <View style={[styles.staffAvatar, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                  <User size={14} color="#6B7280" />
                </View>
              )}
              <Text style={styles.staffName}>{returnInvoice.staffName}</Text>
            </View>
          </View>

          {/* Right Side - Status and Amount */}
          <View style={styles.returnRight}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(returnInvoice.refundStatus)}20` }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getStatusColor(returnInvoice.refundStatus) }
              ]}>
                {getStatusText(returnInvoice.refundStatus)}
              </Text>
            </View>
            <Text style={styles.returnAmount}>
              {formatAmount(returnInvoice.amount)}
            </Text>
            <Text style={styles.itemCount}>
              {returnInvoice.itemCount} {returnInvoice.itemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>

        {/* Return Reason */}
        <View style={styles.reasonSection}>
          <Text style={styles.reasonLabel}>Reason:</Text>
          <Text style={styles.reasonText}>{returnInvoice.reason}</Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.returnFooter}>
          {/* Left Side - Date */}
          <Text style={styles.returnDate}>
            {formatDate(returnInvoice.date)}
          </Text>

          {/* Right Side - Action Icons */}
          <View style={styles.actionIcons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReturnAction('download', returnInvoice.id)}
              activeOpacity={0.7}
            >
              <Download size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReturnAction('share', returnInvoice.id)}
              activeOpacity={0.7}
            >
              <Share size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReturnAction('view', returnInvoice.id)}
              activeOpacity={0.7}
            >
              <Eye size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  return (
        <ResponsiveContainer>
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
              
              <Text style={styles.headerTitle}>Return Invoices</Text>

              <TouchableOpacity
                style={styles.exportButton}
                onPress={() => setShowExportModal(true)}
                activeOpacity={0.7}
              >
                <Download size={20} color={Colors.primary} />
              </TouchableOpacity>

              <View style={styles.headerRight}>
                <Text style={styles.totalCount}>
                  {filteredReturns.length} returns
                </Text>
              </View>
            </View>

      {isLoading ? (
        <ListSkeleton />
      ) : (
        <>
      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <RotateCcw size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Returns</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {getSummaryData().totalReturns}
            </Text>
            <Text style={styles.summaryCount}>
              returns
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Package size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Items</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {getSummaryData().totalItems}
            </Text>
            <Text style={styles.summaryCount}>
              items
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <FileText size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {formatAmount(getSummaryData().totalAmount)}
            </Text>
            <Text style={styles.summaryCount}>
              amount
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Search Bar - Inline between summary and content */}
      <View style={styles.inlineSearchContainer}>
        <View style={[
          styles.searchBar,
          focusedField === 'search' && { borderColor: Colors.primary },
        ]}>
          <Search size={20} color={Colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search returns..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
            onFocus={() => setFocusedField('search')}
            onBlur={() => setFocusedField(null)}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.7}
          >
            <Filter size={20} color="#FFFFFF" />
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      <DateFilterBar
        selectedRange={selectedTimeRange}
        onRangeChange={setSelectedTimeRange}
        customFromDate={customFromDate}
        customToDate={customToDate}
        onCustomFromChange={setCustomFromDate}
        onCustomToChange={setCustomToDate}
      />

      {/* Returns List */}
      <FlatList
        data={filteredReturns}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => renderReturnCard(item)}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <RotateCcw size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Returns Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No returns match your search criteria' : 'No return invoices yet'}
            </Text>
          </View>
        }
      />

      {/* New Return FAB */}
      <TouchableOpacity
        style={[styles.newReturnFAB, isNavigating && styles.fabDisabled]}
        onPress={handleNewReturn}
        activeOpacity={0.8}
        disabled={isNavigating}
      >
        <RotateCcw size={20} color="#ffffff" />
        <Text style={styles.newReturnText}>New Return</Text>
      </TouchableOpacity>
        </>
      )}

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Returns</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
              {/* Refund Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Refund Status</Text>
                <View style={styles.filterOptions}>
                  {['refunded', 'partially_refunded', 'pending'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        activeFilters.refundStatus.includes(status) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('refundStatus', status)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.refundStatus.includes(status) && styles.filterOptionTextActive
                      ]}>
                        {status === 'partially_refunded' ? 'Partially Refunded' : status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Customer Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Customer Type</Text>
                <View style={styles.filterOptions}>
                  {['individual', 'business'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterOption,
                        activeFilters.customerType.includes(type) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('customerType', type)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.customerType.includes(type) && styles.filterOptionTextActive
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Date Range</Text>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'all', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'This Week' },
                    { value: 'month', label: 'This Month' },
                    { value: 'custom', label: 'Custom Range' }
                  ].map(range => (
                    <TouchableOpacity
                      key={range.value}
                      style={[
                        styles.filterOption,
                        activeFilters.dateRange === range.value && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('dateRange', range.value)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.dateRange === range.value && styles.filterOptionTextActive
                      ]}>
                        {range.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
                {activeFilters.dateRange === 'custom' && (
                  <View style={{ marginTop: 12, flexDirection: 'row', gap: 12 }}>
                    <DateInputWithPicker
                      label="From Date"
                      value={customFromDate}
                      onChangeDate={setCustomFromDate}
                      maximumDate={new Date()}
                    />
                    <DateInputWithPicker
                      label="To Date"
                      value={customToDate}
                      onChangeDate={setCustomToDate}
                      maximumDate={new Date()}
                    />
                  </View>
                )}
              </View>

              {/* Amount Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Amount Range</Text>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'none', label: 'No Sort' },
                    { value: 'lowToHigh', label: 'Low to High' },
                    { value: 'highToLow', label: 'High to Low' }
                  ].map(range => (
                    <TouchableOpacity
                      key={range.value}
                      style={[
                        styles.filterOption,
                        activeFilters.amountRange === range.value && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('amountRange', range.value)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.amountRange === range.value && styles.filterOptionTextActive
                      ]}>
                        {range.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Staff Member Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Staff Member</Text>
                <View style={styles.filterOptions}>
                  {[].map(staff => (
                    <TouchableOpacity
                      key={staff}
                      style={[
                        styles.filterOption,
                        activeFilters.staffMember.includes(staff) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('staffMember', staff)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.staffMember.includes(staff) && styles.filterOptionTextActive
                      ]}>
                        {staff}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Reason Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Return Reason</Text>
                <View style={styles.filterOptions}>
                  {['Defective product', 'Wrong size', 'Customer preference', 'Quality issue', 'Damaged in transit'].map(reason => (
                    <TouchableOpacity
                      key={reason}
                      style={[
                        styles.filterOption,
                        activeFilters.reason.includes(reason) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('reason', reason)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.reason.includes(reason) && styles.filterOptionTextActive
                      ]}>
                        {reason}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>

            <View style={styles.filterModalActions}>
              <TouchableOpacity
                style={styles.clearFiltersButton}
                onPress={clearAllFilters}
              >
                <Text style={styles.clearFiltersButtonText}>Clear All Filters</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.applyFiltersButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.applyFiltersButtonText}>Apply Filters</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        config={{
          title: 'Return Invoices',
          fileName: 'return_invoices',
          columns: [
            { key: 'returnNumber', header: 'Return #' },
            { key: 'date', header: 'Date' },
            { key: 'originalInvoiceNumber', header: 'Original Invoice' },
            { key: 'customerName', header: 'Customer' },
            { key: 'itemCount', header: 'Items', format: (v) => String(v || 0) },
            { key: 'amount', header: 'Amount (₹)', format: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
            { key: 'refundStatus', header: 'Refund Status', format: (v) => v === 'refunded' ? 'Refunded' : v === 'partially_refunded' ? 'Partially Refunded' : 'Pending' },
            { key: 'reason', header: 'Reason' },
            { key: 'staffName', header: 'Processed By' },
          ],
          data: filteredReturns,
          summaryRows: [
            { label: 'Total Returns', value: String(filteredReturns.length) },
            { label: 'Total Refund Amount', value: `₹${filteredReturns.reduce((s, i) => s + (i.amount || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
          ],
        }}
      />
          </SafeAreaView>
        </ResponsiveContainer>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  // Summary Cards Styles
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
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
  returnCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  returnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  returnLeft: {
    flex: 1,
    marginRight: 16,
  },
  returnNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  originalInvoice: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  staffName: {
    fontSize: 12,
    color: Colors.textLight,
  },
  returnRight: {
    alignItems: 'flex-end',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    marginBottom: 8,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  returnAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 12,
    color: Colors.textLight,
  },
  reasonSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '600',
    marginRight: 8,
  },
  reasonText: {
    fontSize: 12,
    color: Colors.text,
    flex: 1,
  },
  returnFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  returnDate: {
    fontSize: 14,
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
  newReturnFAB: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40, // Above safe area to prevent gesture conflicts
    right: 20,
    backgroundColor: Colors.error,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  newReturnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(63, 102, 172, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    // Glassmorphism effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Search Results Styles
  searchResultsContainer: {
    paddingVertical: 8,
  },
  searchResultItem: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
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
  searchResultContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  searchResultSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
    marginRight: 12,
  },
  searchResultAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  noSearchResults: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noSearchResultsText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  inlineSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    // No background - completely transparent
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    marginRight: 12,
    paddingVertical: 4,
    fontWeight: '500',
    ...Platform.select({
      web: {
        outlineStyle: 'none' as any,
      },
      default: {},
    }),
  },
  fabDisabled: {
    opacity: 0.6,
  },
  // Filter Badge Styles
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  filterBadgeText: {
    color: '#FFFFFF',
    fontSize: 12,
    fontWeight: '600',
  },
  // Filter Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterModal: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  filterModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  closeButtonText: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: '600',
  },
  filterModalContent: {
    padding: 20,
  },
  filterSection: {
    marginBottom: 24,
  },
  filterSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  filterOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  filterOption: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  filterOptionActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  filterOptionTextActive: {
    color: '#FFFFFF',
    fontWeight: '600',
  },
  filterModalActions: {
    flexDirection: 'row',
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    gap: 12,
  },
  clearFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.grey[100],
    alignItems: 'center',
  },
  clearFiltersButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  applyFiltersButton: {
    flex: 1,
    paddingVertical: 14,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  applyFiltersButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },
});