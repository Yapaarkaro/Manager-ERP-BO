import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  FlatList,
  TextInput,
  Platform,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Eye, ArrowUpRight, Plus, Building2, User, Calendar, Clock, TriangleAlert as AlertTriangle, IndianRupee, Download } from 'lucide-react-native';
import { Payable } from '@/utils/dataStore';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import { getPayables, invalidateApiCache } from '@/services/backendApi';
import { ListSkeleton } from '@/components/SkeletonLoader';
import ExportModal from '@/components/ExportModal';
import DateFilterBar, { TimeRange, filterByDateRange } from '@/components/DateFilterBar';
import { formatIndianNumber, formatCurrencyINR, formatDateDDMMYYYY } from '@/utils/formatters';

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

// Using Payable interface from dataStore

function mapPayableFromBackend(raw: {
  id: string;
  supplierId?: string;
  supplierName: string;
  totalPayable: number;
  billCount: number;
  oldestBillDate: string;
  status?: string;
}): Payable {
  return {
    id: raw.id,
    supplierId: raw.supplierId ?? raw.id,
    supplierName: raw.supplierName ?? '',
    supplierType: 'individual',
    totalPayable: raw.totalPayable ?? 0,
    billCount: raw.billCount ?? 0,
    oldestBillDate: raw.oldestBillDate ?? '',
    status: (raw.status === 'overdue' || raw.status === 'critical' ? raw.status : 'current') as 'current' | 'overdue' | 'critical',
    overdueAmount: 0,
    daysPastDue: 0,
    mobile: '',
    address: '',
    supplierAvatar: '',
    businessName: undefined,
    gstin: undefined,
    paymentTerms: undefined,
    lastPaymentDate: undefined,
    lastPaymentAmount: undefined,
    creditLimit: undefined,
  };
}

export default function PayablesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [payables, setPayables] = useState<Payable[]>([]);
  const [filteredPayables, setFilteredPayables] = useState<Payable[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    status: [] as string[],
    supplierType: [] as string[],
    paymentTerms: [] as string[],
    amountRange: 'none' as string,
    daysPastDue: 'none' as string,
    creditLimit: 'none' as string,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  // Use debounced navigation for supplier cards
  const debouncedNavigate = useDebounceNavigation(500);

  useEffect(() => {
    (async () => {
      const { success, payables: data } = await getPayables();
      if (success && data) {
        const mapped = data.map(mapPayableFromBackend);
        setPayables(mapped);
      } else {
        setPayables([]);
      }
      setIsLoading(false);
    })();
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    (async () => {
      try {
        const { success, payables: data } = await getPayables();
        if (success && data) {
          setPayables(data.map(mapPayableFromBackend));
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
    let filtered = payables;

    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(payable =>
        payable.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payable.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payable.mobile.includes(searchQuery) ||
        payable.gstin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        payable.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (activeFilters.status.length > 0) {
      filtered = filtered.filter(payable => 
        activeFilters.status.includes(payable.status)
      );
    }

    // Apply supplier type filter
    if (activeFilters.supplierType.length > 0) {
      filtered = filtered.filter(payable => 
        activeFilters.supplierType.includes(payable.supplierType)
      );
    }

    // Apply payment terms filter
    if (activeFilters.paymentTerms.length > 0) {
      filtered = filtered.filter(payable => 
        payable.paymentTerms && activeFilters.paymentTerms.includes(payable.paymentTerms)
      );
    }

    // Apply amount range filter
    if (activeFilters.amountRange !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        if (activeFilters.amountRange === 'lowToHigh') {
          return a.totalPayable - b.totalPayable;
        } else {
          return b.totalPayable - a.totalPayable;
        }
      });
    }

    // Apply days past due filter
    if (activeFilters.daysPastDue !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        if (activeFilters.daysPastDue === 'lowToHigh') {
          return a.daysPastDue - b.daysPastDue;
        } else {
          return b.daysPastDue - a.daysPastDue;
        }
      });
    }

    // Apply credit limit filter
    if (activeFilters.creditLimit !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        const aLimit = a.creditLimit || 0;
        const bLimit = b.creditLimit || 0;
        if (activeFilters.creditLimit === 'lowToHigh') {
          return aLimit - bLimit;
        } else {
          return bLimit - aLimit;
        }
      });
    }

    // Apply date range filter
    filtered = filterByDateRange(filtered, (p) => p.oldestBillDate, selectedTimeRange, customFromDate, customToDate);

    setFilteredPayables(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return Colors.success;
      case 'overdue':
        return Colors.warning;
      case 'critical':
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'current':
        return 'Current';
      case 'overdue':
        return 'Overdue';
      case 'critical':
        return 'Critical';
      default:
        return status;
    }
  };

  const formatAmount = (amount: number) => formatCurrencyINR(amount, 2, 0);

  const formatDate = (dateString: string) => formatDateDDMMYYYY(dateString);

  const handleMakePayment = () => {
    debouncedNavigate('/payables/make-payment');
  };

  const handleFilterToggle = (filterType: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      
      if (filterType === 'amountRange' || filterType === 'daysPastDue' || filterType === 'creditLimit') {
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
      status: [],
      supplierType: [],
      paymentTerms: [],
      amountRange: 'none',
      daysPastDue: 'none',
      creditLimit: 'none',
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (activeFilters.status.length > 0) count++;
    if (activeFilters.supplierType.length > 0) count++;
    if (activeFilters.paymentTerms.length > 0) count++;
    if (activeFilters.amountRange !== 'none') count++;
    if (activeFilters.daysPastDue !== 'none') count++;
    if (activeFilters.creditLimit !== 'none') count++;
    return count;
  };

  // Apply filters whenever activeFilters, payables, or date range changes
  useEffect(() => {
    applyFilters(searchQuery);
  }, [activeFilters, payables, selectedTimeRange, customFromDate, customToDate]);

  const getInitials = (name: string): string => {
    if (!name || name.trim().length === 0) return 'S';
    const words = name.trim().split(' ').filter(w => w.length > 0);
    if (words.length === 0) return 'S';
    if (words.length === 1) return words[0][0].toUpperCase();
    return (words[0][0] + words[words.length - 1][0]).toUpperCase();
  };

  const handleSupplierDetails = (payable: Payable) => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    debouncedNavigate({
      pathname: '/purchasing/supplier-details',
      params: {
        supplierId: payable.supplierId || payable.id,
        defaultTab: 'transactions',
      }
    });
    
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const renderPayableCard = (payable: Payable) => {
    const displayName = payable.supplierType === 'business' && payable.businessName
      ? payable.businessName
      : payable.supplierName;
    const statusColor = getStatusColor(payable.status);
    const daysText = payable.oldestBillDate
      ? Math.max(0, Math.floor((Date.now() - new Date(payable.oldestBillDate).getTime()) / 86400000))
      : 0;

    return (
      <TouchableOpacity
        key={payable.id}
        style={[
          styles.payableCard,
          { borderLeftColor: statusColor }
        ]}
        onPress={() => handleSupplierDetails(payable)}
        activeOpacity={0.7}
        disabled={isNavigating}
      >
        {/* Row 1: Supplier info + Amount */}
        <View style={styles.payableHeader}>
          <View style={styles.payableLeft}>
            <View style={[styles.supplierInitials, { backgroundColor: `${statusColor}12` }]}>
              <Text style={[styles.supplierInitialsText, { color: statusColor }]}>{getInitials(displayName)}</Text>
            </View>
            <View style={styles.supplierInfo}>
              <Text style={styles.supplierName} numberOfLines={1}>{displayName}</Text>
              <View style={[styles.statusBadge, { backgroundColor: `${statusColor}12`, alignSelf: 'flex-start' }]}>
                <Text style={[styles.statusText, { color: statusColor }]}>{getStatusText(payable.status)}</Text>
              </View>
            </View>
          </View>

          <View style={styles.payableRight}>
            <Text style={styles.payableAmount}>{formatAmount(payable.totalPayable)}</Text>
            <Text style={styles.amountLabel}>outstanding</Text>
          </View>
        </View>

        {/* Row 2: Key metrics */}
        <View style={styles.metricsRow}>
          <View style={styles.metricItem}>
            <IndianRupee size={13} color={Colors.textLight} />
            <Text style={styles.metricText}>
              {payable.billCount} {payable.billCount === 1 ? 'invoice' : 'invoices'}
            </Text>
          </View>
          {payable.oldestBillDate ? (
            <View style={styles.metricItem}>
              <Calendar size={13} color={Colors.textLight} />
              <Text style={styles.metricText}>
                {daysText > 0 ? `${daysText} days old` : 'Recent'}
              </Text>
            </View>
          ) : null}
          {payable.lastPaymentDate ? (
            <View style={styles.metricItem}>
              <Clock size={13} color={Colors.success} />
              <Text style={[styles.metricText, { color: Colors.success }]}>Paid {formatDate(payable.lastPaymentDate)}</Text>
            </View>
          ) : null}
        </View>

        {/* Row 3: Overdue warning */}
        {payable.overdueAmount > 0 && (
          <View style={styles.overdueSection}>
            <AlertTriangle size={13} color={Colors.error} />
            <Text style={styles.overdueLabel}>Overdue: {formatAmount(payable.overdueAmount)}</Text>
            {payable.daysPastDue > 0 && (
              <Text style={styles.daysPastDue}>({payable.daysPastDue} days)</Text>
            )}
          </View>
        )}

        {/* Row 4: Action footer */}
        <View style={styles.payableFooter}>
          <Text style={styles.viewDetailsText}>Tap to view supplier details</Text>
          <ArrowUpRight size={14} color={Colors.primary} />
        </View>
      </TouchableOpacity>
    );
  };

  const totalPayables = filteredPayables.reduce((sum, p) => sum + p.totalPayable, 0);
  const totalOverdue = filteredPayables.reduce((sum, p) => sum + p.overdueAmount, 0);
  const overdueSuppliers = filteredPayables.filter(p => p.overdueAmount > 0).length;

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Payables</Text>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => setShowExportModal(true)}
          activeOpacity={0.7}
        >
          <Download size={20} color={Colors.primary} />
        </TouchableOpacity>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredPayables.length} suppliers
          </Text>
        </View>
      </View>

      {isLoading ? (
        <ListSkeleton itemCount={6} showSearch={true} showFilter={true} />
      ) : (
        <>
      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <ArrowUpRight size={20} color={Colors.error} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Payables</Text>
            <Text style={[styles.summaryValue, { color: Colors.error }]}>
              {formatAmount(totalPayables)}
            </Text>
            <Text style={styles.summaryCount}>
              amount
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <AlertTriangle size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Overdue Amount</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {formatAmount(totalOverdue)}
            </Text>
            <Text style={styles.summaryCount}>
              {overdueSuppliers} suppliers
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Building2 size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Suppliers</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {filteredPayables.length}
            </Text>
            <Text style={styles.summaryCount}>
              suppliers
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
            placeholder="Search suppliers..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
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

      {/* Payables List */}
      <FlatList
        data={filteredPayables}
        renderItem={({item}) => renderPayableCard(item)}
        keyExtractor={(item) => item.id}
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <ArrowUpRight size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Payables Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No payables match your search criteria' : 'No outstanding payables'}
            </Text>
          </View>
        }
      />

      {/* Make Payment FAB */}
      <TouchableOpacity
        style={styles.makePaymentFAB}
        onPress={handleMakePayment}
        activeOpacity={0.8}
      >
        <IndianRupee size={20} color="#ffffff" />
        <Text style={styles.makePaymentText}>Make Payment</Text>
      </TouchableOpacity>

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
              <Text style={styles.filterModalTitle}>Filter Payables</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <View style={styles.filterOptions}>
                  {['current', 'overdue', 'critical'].map(status => (
                    <TouchableOpacity
                      key={status}
                      style={[
                        styles.filterOption,
                        activeFilters.status.includes(status) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('status', status)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.status.includes(status) && styles.filterOptionTextActive
                      ]}>
                        {status.charAt(0).toUpperCase() + status.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Supplier Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Supplier Type</Text>
                <View style={styles.filterOptions}>
                  {['individual', 'business'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterOption,
                        activeFilters.supplierType.includes(type) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('supplierType', type)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.supplierType.includes(type) && styles.filterOptionTextActive
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Payment Terms Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Payment Terms</Text>
                <View style={styles.filterOptions}>
                  {['Net 15', 'Net 30', 'Net 45', 'Net 60'].map(terms => (
                    <TouchableOpacity
                      key={terms}
                      style={[
                        styles.filterOption,
                        activeFilters.paymentTerms.includes(terms) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('paymentTerms', terms)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.paymentTerms.includes(terms) && styles.filterOptionTextActive
                      ]}>
                        {terms}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
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

              {/* Days Past Due Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Days Past Due</Text>
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
                        activeFilters.daysPastDue === range.value && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('daysPastDue', range.value)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.daysPastDue === range.value && styles.filterOptionTextActive
                      ]}>
                        {range.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Credit Limit Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Credit Limit</Text>
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
                        activeFilters.creditLimit === range.value && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('creditLimit', range.value)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.creditLimit === range.value && styles.filterOptionTextActive
                      ]}>
                        {range.label}
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
        </>
      )}

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        config={{
          title: 'Payables',
          fileName: 'payables',
          columns: [
            { key: 'supplierName', header: 'Supplier' },
            { key: 'mobile', header: 'Mobile' },
            { key: 'totalPayable', header: 'Total Payable (₹)', format: (v) => formatIndianNumber(v || 0) },
            { key: 'overdueAmount', header: 'Overdue (₹)', format: (v) => formatIndianNumber(v || 0) },
            { key: 'billCount', header: 'Bills', format: (v) => String(v || 0) },
            { key: 'daysPastDue', header: 'Days Past Due', format: (v) => String(v || 0) },
            { key: 'status', header: 'Status', format: (v) => v === 'current' ? 'Current' : v === 'overdue' ? 'Overdue' : 'Critical' },
            { key: 'oldestBillDate', header: 'Oldest Bill Date' },
          ],
          data: filteredPayables,
          summaryRows: [
            { label: 'Total Payable', value: formatCurrencyINR(filteredPayables.reduce((s, p) => s + (p.totalPayable || 0), 0)) },
            { label: 'Total Overdue', value: formatCurrencyINR(filteredPayables.reduce((s, p) => s + (p.overdueAmount || 0), 0)) },
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
  inlineSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    // No background - completely transparent
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
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
  payableCard: {
    backgroundColor: Colors.background,
    borderRadius: 14,
    padding: 14,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.06,
    shadowRadius: 6,
    elevation: 2,
  },
  payableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  payableLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  supplierInitials: {
    width: 44,
    height: 44,
    borderRadius: 22,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supplierInitialsText: {
    fontSize: 16,
    fontWeight: '700',
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  payableRight: {
    alignItems: 'flex-end',
  },
  payableAmount: {
    fontSize: 18,
    fontWeight: '800',
    color: Colors.error,
    letterSpacing: -0.3,
  },
  amountLabel: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
    textTransform: 'uppercase',
    letterSpacing: 0.3,
  },
  metricsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginTop: 12,
    paddingTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  metricItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metricText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  overdueSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    marginTop: 10,
    gap: 5,
  },
  overdueLabel: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
  daysPastDue: {
    fontSize: 11,
    color: Colors.error,
    fontStyle: 'italic',
  },
  payableFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    paddingTop: 10,
    marginTop: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
    gap: 4,
  },
  viewDetailsText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  makePaymentFAB: {
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
  makePaymentText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  floatingSearchContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.background,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  searchContainer: {
    paddingHorizontal: 4,
    paddingVertical: 4,
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