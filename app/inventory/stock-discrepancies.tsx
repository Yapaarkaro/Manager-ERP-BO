import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
  Modal,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Search, 
  Filter,
  Package,
  PackageMinus,
  PackagePlus,
  TriangleAlert as AlertTriangle,
  Eye,
  FileText,
  User,
  Calendar,
  TrendingUp,
  TrendingDown,
  Building2,
  Download
} from 'lucide-react-native';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import { invalidateApiCache } from '@/services/backendApi';
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

interface StockDiscrepancy {
  id: string;
  productId: string;
  productName: string;
  productImage: string;
  category: string;
  expectedStock: number;
  actualStock: number;
  discrepancyType: 'shortage' | 'excess';
  discrepancyQuantity: number;
  reportedBy: {
    id: string;
    name: string;
    avatar: string;
    role: string;
  };
  reportedDate: string;
  relatedInvoice?: {
    id: string;
    invoiceNumber: string;
    type: 'sale' | 'purchase' | 'return';
    customerName?: string;
    supplierName?: string;
    date: string;
    amount: number;
  };
  location: string;
  reason?: string;
  status: 'pending' | 'investigating' | 'resolved' | 'acknowledged';
  priority: 'low' | 'medium' | 'high' | 'critical';
  unitPrice: number;
  discrepancyValue: number;
  lastUpdated: string;
}

const stockDiscrepancies: StockDiscrepancy[] = [];

export default function StockDiscrepanciesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredDiscrepancies, setFilteredDiscrepancies] = useState(stockDiscrepancies);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'shortage' | 'excess' | 'pending' | 'critical'>('all');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [activeFilters, setActiveFilters] = useState({
    discrepancyType: [] as string[],
    status: [] as string[],
    priority: [] as string[],
    category: [] as string[],
    location: [] as string[],
    reportedBy: [] as string[],
    amountRange: 'none' as string,
    dateRange: 'none' as string,
  });
  
  const [refreshing, setRefreshing] = useState(false);
  
  // Use debounced navigation for discrepancy cards
  const debouncedNavigate = useDebounceNavigation(500);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    applyFilters(searchQuery, selectedFilter);
    setTimeout(() => setRefreshing(false), 600);
  }, [searchQuery, selectedFilter]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedFilter);
  };

  const handleFilterChange = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
    applyFilters(searchQuery, filter);
  };

  const applyFilters = (query: string, filter: typeof selectedFilter) => {
    let filtered = stockDiscrepancies;

    // Apply search filter
    if (query.trim() !== '') {
      filtered = filtered.filter(discrepancy =>
        discrepancy.productName.toLowerCase().includes(query.toLowerCase()) ||
        discrepancy.category.toLowerCase().includes(query.toLowerCase()) ||
        discrepancy.reportedBy.name.toLowerCase().includes(query.toLowerCase()) ||
        discrepancy.location.toLowerCase().includes(query.toLowerCase()) ||
        discrepancy.relatedInvoice?.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
        discrepancy.id.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply quick filter tabs
    if (filter !== 'all') {
      filtered = filtered.filter(discrepancy => {
        switch (filter) {
          case 'shortage':
            return discrepancy.discrepancyType === 'shortage';
          case 'excess':
            return discrepancy.discrepancyType === 'excess';
          case 'pending':
            return discrepancy.status === 'pending';
          case 'critical':
            return discrepancy.priority === 'critical';
          default:
            return true;
        }
      });
    }

    // Apply advanced filters
    if (activeFilters.discrepancyType.length > 0) {
      filtered = filtered.filter(discrepancy => 
        activeFilters.discrepancyType.includes(discrepancy.discrepancyType)
      );
    }

    if (activeFilters.status.length > 0) {
      filtered = filtered.filter(discrepancy => 
        activeFilters.status.includes(discrepancy.status)
      );
    }

    if (activeFilters.priority.length > 0) {
      filtered = filtered.filter(discrepancy => 
        activeFilters.priority.includes(discrepancy.priority)
      );
    }

    if (activeFilters.category.length > 0) {
      filtered = filtered.filter(discrepancy => 
        activeFilters.category.includes(discrepancy.category)
      );
    }

    if (activeFilters.location.length > 0) {
      filtered = filtered.filter(discrepancy => 
        activeFilters.location.includes(discrepancy.location)
      );
    }

    if (activeFilters.reportedBy.length > 0) {
      filtered = filtered.filter(discrepancy => 
        activeFilters.reportedBy.includes(discrepancy.reportedBy.name)
      );
    }

    // Apply amount range filter
    if (activeFilters.amountRange !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        if (activeFilters.amountRange === 'lowToHigh') {
          return a.discrepancyValue - b.discrepancyValue;
        } else {
          return b.discrepancyValue - a.discrepancyValue;
        }
      });
    }

    // Apply date range filter via DateFilterBar
    filtered = filterByDateRange(filtered, (d) => d.reportedDate, selectedTimeRange, customFromDate, customToDate);

    setFilteredDiscrepancies(filtered);
  };

  const getDiscrepancyTypeColor = (type: string) => {
    return type === 'shortage' ? Colors.error : Colors.orange;
  };

  const getDiscrepancyTypeIcon = (type: string) => {
    return type === 'shortage' ? PackageMinus : PackagePlus;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return Colors.error;
      case 'investigating': return Colors.warning;
      case 'resolved': return Colors.success;
      case 'acknowledged': return Colors.primary;
      default: return Colors.textLight;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'critical': return Colors.error;
      case 'high': return Colors.warning;
      case 'medium': return Colors.orange;
      case 'low': return Colors.success;
      default: return Colors.textLight;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(amount);
  };

  const formatPrice = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(amount);
  };

  const handleFilterToggle = (filterType: keyof typeof activeFilters, value: string) => {
    setActiveFilters(prev => {
      const newFilters = { ...prev };
      
      if (filterType === 'amountRange' || filterType === 'dateRange') {
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
      discrepancyType: [],
      status: [],
      priority: [],
      category: [],
      location: [],
      reportedBy: [],
      amountRange: 'none',
      dateRange: 'none',
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (activeFilters.discrepancyType.length > 0) count++;
    if (activeFilters.status.length > 0) count++;
    if (activeFilters.priority.length > 0) count++;
    if (activeFilters.category.length > 0) count++;
    if (activeFilters.location.length > 0) count++;
    if (activeFilters.reportedBy.length > 0) count++;
    if (activeFilters.amountRange !== 'none') count++;
    if (activeFilters.dateRange !== 'none') count++;
    return count;
  };

  // Apply filters whenever activeFilters or date range change
  useEffect(() => {
    applyFilters(searchQuery, selectedFilter);
  }, [activeFilters, selectedTimeRange, customFromDate, customToDate]);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleDiscrepancyPress = (discrepancy: StockDiscrepancy) => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    debouncedNavigate({
      pathname: '/inventory/discrepancy-details',
      params: {
        discrepancyId: discrepancy.id,
        discrepancyData: JSON.stringify(discrepancy)
      }
    });
    
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleViewInvoice = (discrepancy: StockDiscrepancy) => {
    if (!discrepancy.relatedInvoice) return;
    if (isNavigating) return;
    
    setIsNavigating(true);

    const invoice = discrepancy.relatedInvoice;
    
    if (invoice.type === 'return') {
      // Navigate to return details
      const returnInvoiceData = {
        id: invoice.id,
        returnNumber: invoice.invoiceNumber,
        originalInvoiceNumber: '',
        customerName: invoice.customerName || 'N/A',
        customerType: 'business',
        staffName: discrepancy.reportedBy.name,
        staffAvatar: discrepancy.reportedBy.avatar,
        refundStatus: 'refunded',
        amount: invoice.amount,
        itemCount: discrepancy.discrepancyQuantity,
        date: invoice.date,
        reason: 'Product return',
        customerDetails: {
          name: invoice.customerName || 'N/A',
          mobile: '',
          address: ''
        }
      };

      debouncedNavigate({
        pathname: '/return-details',
        params: {
          returnId: returnInvoiceData.id,
          returnData: JSON.stringify(returnInvoiceData)
        }
      });
    } else {
      // Navigate to invoice details
      const invoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName || invoice.supplierName || 'N/A',
        customerType: invoice.type === 'purchase' ? 'business' : 'individual',
        staffName: discrepancy.reportedBy.name,
        staffAvatar: discrepancy.reportedBy.avatar,
        paymentStatus: 'paid',
        amount: invoice.amount,
        itemCount: discrepancy.discrepancyQuantity,
        date: invoice.date,
        customerDetails: {
          name: invoice.customerName || invoice.supplierName || 'N/A',
          mobile: '',
          businessName: invoice.type === 'purchase' ? invoice.supplierName : invoice.customerName,
          address: ''
        }
      };

      debouncedNavigate({
        pathname: '/invoice-details',
        params: {
          invoiceId: invoiceData.id,
          invoiceData: JSON.stringify(invoiceData)
        }
      });
    }
    
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleResolveDiscrepancy = (discrepancyId: string) => {
    Alert.alert(
      'Resolve Discrepancy',
      'Mark this discrepancy as resolved?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Resolve',
          onPress: () => {
            // Update discrepancy status
            setFilteredDiscrepancies(prev =>
              prev.map(disc =>
                disc.id === discrepancyId
                  ? { ...disc, status: 'resolved' as const }
                  : disc
              )
            );
            Alert.alert('Success', 'Discrepancy marked as resolved');
          }
        }
      ]
    );
  };

  const renderDiscrepancyCard = (discrepancy: StockDiscrepancy) => {
    const DiscrepancyIcon = getDiscrepancyTypeIcon(discrepancy.discrepancyType);
    const discrepancyColor = getDiscrepancyTypeColor(discrepancy.discrepancyType);
    const statusColor = getStatusColor(discrepancy.status);
    const priorityColor = getPriorityColor(discrepancy.priority);

    return (
      <TouchableOpacity
        key={discrepancy.id}
        style={[
          styles.discrepancyCard,
          { borderLeftColor: discrepancyColor }
        ]}
        onPress={() => handleDiscrepancyPress(discrepancy)}
        activeOpacity={0.7}
        disabled={isNavigating}
      >
        {/* Header */}
        <View style={styles.discrepancyHeader}>
          <View style={styles.discrepancyLeft}>
            {discrepancy.productImage ? (
              <Image source={{ uri: discrepancy.productImage }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                <Package size={16} color="#6B7280" />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>
                {discrepancy.productName}
              </Text>
              <Text style={styles.productCategory}>
                {discrepancy.category}
              </Text>
              <Text style={styles.discrepancyId}>
                ID: {discrepancy.id}
              </Text>
            </View>
          </View>

          <View style={styles.discrepancyRight}>
            <View style={[
              styles.discrepancyTypeBadge,
              { backgroundColor: `${discrepancyColor}20` }
            ]}>
              <DiscrepancyIcon size={16} color={discrepancyColor} />
              <Text style={[
                styles.discrepancyTypeText,
                { color: discrepancyColor }
              ]}>
                {discrepancy.discrepancyType.toUpperCase()}
              </Text>
            </View>
            
            <View style={styles.discrepancyQuantityContainer}>
              <Text style={[
                styles.discrepancyQuantity,
                { color: discrepancyColor }
              ]}>
                {discrepancy.discrepancyType === 'shortage' ? '-' : '+'}
                {discrepancy.discrepancyQuantity} units
              </Text>
              <Text style={styles.discrepancyValue}>
                {formatAmount(discrepancy.discrepancyValue)}
              </Text>
            </View>
          </View>
        </View>

        {/* Stock Details */}
        <View style={styles.stockDetails}>
          <View style={styles.stockDetailRow}>
            <Text style={styles.stockDetailLabel}>Expected:</Text>
            <Text style={styles.stockDetailValue}>{discrepancy.expectedStock} units</Text>
          </View>
          <View style={styles.stockDetailRow}>
            <Text style={styles.stockDetailLabel}>Actual:</Text>
            <Text style={[
              styles.stockDetailValue,
              { color: discrepancyColor }
            ]}>
              {discrepancy.actualStock} units
            </Text>
          </View>
          <View style={styles.stockDetailRow}>
            <Text style={styles.stockDetailLabel}>Location:</Text>
            <Text style={styles.stockDetailValue}>{discrepancy.location}</Text>
          </View>
        </View>

        {/* Reported By */}
        <View style={styles.reportedBySection}>
          <View style={styles.reportedByHeader}>
            {discrepancy.reportedBy.avatar ? (
              <Image source={{ uri: discrepancy.reportedBy.avatar }} style={styles.staffAvatar} />
            ) : (
              <View style={[styles.staffAvatar, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                <User size={14} color="#6B7280" />
              </View>
            )}
            <View style={styles.reportedByInfo}>
              <Text style={styles.reportedByName}>
                Reported by {discrepancy.reportedBy.name}
              </Text>
              <Text style={styles.reportedByRole}>
                {discrepancy.reportedBy.role}
              </Text>
              <Text style={styles.reportedDate}>
                {formatDate(discrepancy.reportedDate)}
              </Text>
            </View>
          </View>
          
          {discrepancy.reason && (
            <Text style={styles.discrepancyReason}>
              Reason: {discrepancy.reason}
            </Text>
          )}
        </View>

        {/* Related Invoice */}
        {discrepancy.relatedInvoice && (
          <View style={styles.relatedInvoiceSection}>
            <View style={styles.relatedInvoiceHeader}>
              <FileText size={16} color={Colors.primary} />
              <Text style={styles.relatedInvoiceLabel}>Related Invoice:</Text>
              <Text style={styles.relatedInvoiceNumber}>
                {discrepancy.relatedInvoice.invoiceNumber}
              </Text>
            </View>
            
            <View style={styles.relatedInvoiceDetails}>
              <Text style={styles.relatedInvoiceCustomer}>
                {discrepancy.relatedInvoice.type === 'purchase' 
                  ? `Supplier: ${discrepancy.relatedInvoice.supplierName}`
                  : `Customer: ${discrepancy.relatedInvoice.customerName}`
                }
              </Text>
              <Text style={styles.relatedInvoiceAmount}>
                {formatAmount(discrepancy.relatedInvoice.amount)}
              </Text>
            </View>

            <TouchableOpacity
              style={styles.viewInvoiceButton}
              onPress={() => handleViewInvoice(discrepancy)}
              activeOpacity={0.7}
              disabled={isNavigating}
            >
              <Eye size={14} color={Colors.primary} />
              <Text style={styles.viewInvoiceText}>View Invoice</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Status and Priority */}
        <View style={styles.statusSection}>
          <View style={styles.statusPriorityContainer}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` }
            ]}>
              <Text style={[
                styles.statusText,
                { color: statusColor }
              ]}>
                {discrepancy.status.toUpperCase()}
              </Text>
            </View>
            
            <View style={[
              styles.priorityBadge,
              { backgroundColor: `${priorityColor}20` }
            ]}>
              <Text style={[
                styles.priorityText,
                { color: priorityColor }
              ]}>
                {discrepancy.priority.toUpperCase()} PRIORITY
              </Text>
            </View>
          </View>

          {discrepancy.status === 'pending' && (
            <TouchableOpacity
              style={styles.resolveButton}
              onPress={() => handleResolveDiscrepancy(discrepancy.id)}
              activeOpacity={0.7}
            >
              <Text style={styles.resolveButtonText}>Mark Resolved</Text>
            </TouchableOpacity>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const getFilterCounts = () => {
    return {
      all: stockDiscrepancies.length,
      shortage: stockDiscrepancies.filter(d => d.discrepancyType === 'shortage').length,
      excess: stockDiscrepancies.filter(d => d.discrepancyType === 'excess').length,
      pending: stockDiscrepancies.filter(d => d.status === 'pending').length,
      critical: stockDiscrepancies.filter(d => d.priority === 'critical').length,
    };
  };

  const filterCounts = getFilterCounts();
  const totalDiscrepancyValue = filteredDiscrepancies.reduce((sum, d) => sum + d.discrepancyValue, 0);

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
        
        <Text style={styles.headerTitle}>Stock Discrepancies</Text>

        <TouchableOpacity
          style={styles.exportButton}
          onPress={() => setShowExportModal(true)}
          activeOpacity={0.7}
        >
          <Download size={20} color={Colors.primary} />
        </TouchableOpacity>

        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredDiscrepancies.length} items
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <AlertTriangle size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {formatPrice(totalDiscrepancyValue)}
            </Text>
            <Text style={styles.summaryCount}>
              amount
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <PackageMinus size={20} color={Colors.error} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Shortages</Text>
            <Text style={[styles.summaryValue, { color: Colors.error }]}>
              {filterCounts.shortage}
            </Text>
            <Text style={styles.summaryCount}>
              items
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <PackagePlus size={20} color={Colors.orange} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Excess</Text>
            <Text style={[styles.summaryValue, { color: Colors.orange }]}>
              {filterCounts.excess}
            </Text>
            <Text style={styles.summaryCount}>
              items
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
            placeholder="Search discrepancies..."
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

      {/* Date Filter Chips */}
      <DateFilterBar
        selectedRange={selectedTimeRange}
        onRangeChange={setSelectedTimeRange}
        customFromDate={customFromDate}
        customToDate={customToDate}
        onCustomFromChange={setCustomFromDate}
        onCustomToChange={setCustomToDate}
      />

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {[
            { key: 'all', label: 'All', count: filterCounts.all },
            { key: 'shortage', label: 'Shortages', count: filterCounts.shortage },
            { key: 'excess', label: 'Excess', count: filterCounts.excess },
            { key: 'pending', label: 'Pending', count: filterCounts.pending },
            { key: 'critical', label: 'Critical', count: filterCounts.critical },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                selectedFilter === filter.key && styles.activeFilterTab
              ]}
              onPress={() => handleFilterChange(filter.key as typeof selectedFilter)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === filter.key && styles.activeFilterTabText
              ]}>
                {filter.label}
              </Text>
              <View style={[
                styles.filterTabCount,
                selectedFilter === filter.key && styles.activeFilterTabCount
              ]}>
                <Text style={[
                  styles.filterTabCountText,
                  selectedFilter === filter.key && styles.activeFilterTabCountText
                ]}>
                  {filter.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Discrepancies List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {filteredDiscrepancies.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Discrepancies Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No discrepancies match your search criteria' : 'No stock discrepancies reported'}
            </Text>
          </View>
        ) : (
          filteredDiscrepancies.map(renderDiscrepancyCard)
        )}
      </ScrollView>

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
              <Text style={styles.filterModalTitle}>Filter Stock Discrepancies</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowFilterModal(false)}
              >
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
              {/* Discrepancy Type Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Discrepancy Type</Text>
                <View style={styles.filterOptions}>
                  {['shortage', 'excess'].map(type => (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.filterOption,
                        activeFilters.discrepancyType.includes(type) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('discrepancyType', type)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.discrepancyType.includes(type) && styles.filterOptionTextActive
                      ]}>
                        {type.charAt(0).toUpperCase() + type.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Status Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Status</Text>
                <View style={styles.filterOptions}>
                  {['pending', 'investigating', 'resolved', 'acknowledged'].map(status => (
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

              {/* Priority Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Priority</Text>
                <View style={styles.filterOptions}>
                  {['critical', 'high', 'medium', 'low'].map(priority => (
                    <TouchableOpacity
                      key={priority}
                      style={[
                        styles.filterOption,
                        activeFilters.priority.includes(priority) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('priority', priority)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.priority.includes(priority) && styles.filterOptionTextActive
                      ]}>
                        {priority.charAt(0).toUpperCase() + priority.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Category Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Category</Text>
                <View style={styles.filterOptions}>
                  {['Smartphones', 'Laptops', 'Accessories', 'Tablets', 'Wearables'].map(category => (
                    <TouchableOpacity
                      key={category}
                      style={[
                        styles.filterOption,
                        activeFilters.category.includes(category) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('category', category)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.category.includes(category) && styles.filterOptionTextActive
                      ]}>
                        {category}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Location Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Location</Text>
                <View style={styles.filterOptions}>
                  {['Main Warehouse - A1', 'Main Warehouse - A2', 'Branch Office - B1', 'Branch Office - B2'].map(location => (
                    <TouchableOpacity
                      key={location}
                      style={[
                        styles.filterOption,
                        activeFilters.location.includes(location) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('location', location)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.location.includes(location) && styles.filterOptionTextActive
                      ]}>
                        {location}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Reported By Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Reported By</Text>
                <View style={styles.filterOptions}>
                  {([] as string[]).map(staff => (
                    <TouchableOpacity
                      key={staff}
                      style={[
                        styles.filterOption,
                        activeFilters.reportedBy.includes(staff) && styles.filterOptionActive
                      ]}
                      onPress={() => handleFilterToggle('reportedBy', staff)}
                    >
                      <Text style={[
                        styles.filterOptionText,
                        activeFilters.reportedBy.includes(staff) && styles.filterOptionTextActive
                      ]}>
                        {staff}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {/* Amount Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Discrepancy Value</Text>
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

              {/* Date Range Filter */}
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Reported Date</Text>
                <View style={styles.filterOptions}>
                  {[
                    { value: 'none', label: 'All Time' },
                    { value: 'today', label: 'Today' },
                    { value: 'week', label: 'This Week' },
                    { value: 'month', label: 'This Month' }
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
          title: 'Stock Discrepancies / Write-Offs',
          fileName: 'stock_writeoffs',
          columns: [
            { key: 'productName', header: 'Product' },
            { key: 'category', header: 'Category' },
            { key: 'discrepancyType', header: 'Type', format: (v) => v === 'shortage' ? 'Shortage' : 'Excess' },
            { key: 'expectedStock', header: 'Expected Stock', format: (v) => String(v || 0) },
            { key: 'actualStock', header: 'Actual Stock', format: (v) => String(v || 0) },
            { key: 'discrepancyQuantity', header: 'Discrepancy Qty', format: (v) => String(v || 0) },
            { key: 'discrepancyValue', header: 'Value (₹)', format: (v) => Number(v || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 }) },
            { key: 'status', header: 'Status', format: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : '' },
            { key: 'priority', header: 'Priority', format: (v) => v ? v.charAt(0).toUpperCase() + v.slice(1) : '' },
            { key: 'reportedDate', header: 'Reported Date' },
            { key: 'location', header: 'Location' },
            { key: 'reason', header: 'Reason' },
          ],
          data: filteredDiscrepancies,
          summaryRows: [
            { label: 'Total Discrepancies', value: String(filteredDiscrepancies.length) },
            { label: 'Total Value', value: `₹${filteredDiscrepancies.reduce((s, d) => s + (d.discrepancyValue || 0), 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` },
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
  filterContainer: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    paddingVertical: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
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
  },
  filterTabCount: {
    backgroundColor: Colors.grey[200],
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activeFilterTabCount: {
    backgroundColor: Colors.background,
  },
  filterTabCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
  },
  activeFilterTabCountText: {
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
  discrepancyCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
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
  discrepancyHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  discrepancyLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
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
  discrepancyId: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  discrepancyRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  discrepancyTypeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  discrepancyTypeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  discrepancyQuantityContainer: {
    alignItems: 'flex-end',
  },
  discrepancyQuantity: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  discrepancyValue: {
    fontSize: 12,
    color: Colors.textLight,
  },
  stockDetails: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  stockDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  stockDetailLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  stockDetailValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  reportedBySection: {
    marginBottom: 12,
  },
  reportedByHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  staffAvatar: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: 12,
  },
  reportedByInfo: {
    flex: 1,
  },
  reportedByName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  reportedByRole: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  reportedDate: {
    fontSize: 11,
    color: Colors.textLight,
  },
  discrepancyReason: {
    fontSize: 12,
    color: Colors.text,
    fontStyle: 'italic',
    backgroundColor: Colors.background,
    padding: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  relatedInvoiceSection: {
    backgroundColor: '#f0f4ff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  relatedInvoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 6,
  },
  relatedInvoiceLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  relatedInvoiceNumber: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '700',
    fontFamily: 'monospace',
  },
  relatedInvoiceDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  relatedInvoiceCustomer: {
    fontSize: 12,
    color: Colors.text,
    flex: 1,
  },
  relatedInvoiceAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.success,
  },
  viewInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: Colors.background,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  viewInvoiceText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  statusSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  statusPriorityContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  priorityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  priorityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  resolveButton: {
    backgroundColor: Colors.success,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  resolveButtonText: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: '600',
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