import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Download, Share, Eye, ArrowDownLeft, Plus, Building2, User, Calendar, Clock, TriangleAlert as AlertTriangle, IndianRupee } from 'lucide-react-native';
import { Receivable } from '@/utils/dataStore';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import { getReceivables } from '@/services/backendApi';

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

// Using Receivable interface from dataStore

function mapReceivableFromBackend(raw: {
  id: string;
  customerId?: string;
  customerName: string;
  customerType?: string;
  totalReceivable: number;
  invoiceCount: number;
  oldestInvoiceDate: string;
  status?: string;
}): Receivable {
  return {
    id: raw.id,
    customerId: raw.customerId ?? raw.id,
    customerName: raw.customerName ?? '',
    customerType: (raw.customerType === 'business' ? 'business' : 'individual') as 'business' | 'individual',
    totalReceivable: raw.totalReceivable ?? 0,
    invoiceCount: raw.invoiceCount ?? 0,
    oldestInvoiceDate: raw.oldestInvoiceDate ?? '',
    status: (raw.status === 'overdue' || raw.status === 'critical' ? raw.status : 'current') as 'current' | 'overdue' | 'critical',
    overdueAmount: 0,
    daysPastDue: 0,
    mobile: '',
    address: '',
    customerAvatar: '',
    businessName: undefined,
    gstin: undefined,
    paymentTerms: undefined,
    lastPaymentDate: undefined,
    lastPaymentAmount: undefined,
    creditLimit: undefined,
  };
}

export default function ReceivablesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [receivables, setReceivables] = useState<Receivable[]>([]);
  const [filteredReceivables, setFilteredReceivables] = useState<Receivable[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    status: [] as string[],
    customerType: [] as string[],
    paymentTerms: [] as string[],
    amountRange: 'none' as string,
    daysPastDue: 'none' as string,
    creditLimit: 'none' as string,
  });
  
  // Use debounced navigation for customer cards
  const debouncedNavigate = useDebounceNavigation(500);

  useEffect(() => {
    (async () => {
      const { success, receivables: data } = await getReceivables();
      if (success && data) {
        const mapped = data.map(mapReceivableFromBackend);
        setReceivables(mapped);
      } else {
        setReceivables([]);
      }
    })();
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query);
  };

  const applyFilters = (searchQuery: string = '') => {
    let filtered = receivables;

    // Apply search filter
    if (searchQuery.trim() !== '') {
      filtered = filtered.filter(receivable =>
        receivable.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receivable.businessName?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receivable.mobile.includes(searchQuery) ||
        receivable.gstin?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        receivable.address.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    // Apply status filter
    if (activeFilters.status.length > 0) {
      filtered = filtered.filter(receivable => 
        activeFilters.status.includes(receivable.status)
      );
    }

    // Apply customer type filter
    if (activeFilters.customerType.length > 0) {
      filtered = filtered.filter(receivable => 
        activeFilters.customerType.includes(receivable.customerType)
      );
    }

    // Apply payment terms filter
    if (activeFilters.paymentTerms.length > 0) {
      filtered = filtered.filter(receivable => 
        receivable.paymentTerms && activeFilters.paymentTerms.includes(receivable.paymentTerms)
      );
    }

    // Apply amount range filter
    if (activeFilters.amountRange !== 'none') {
      filtered = [...filtered].sort((a, b) => {
        if (activeFilters.amountRange === 'lowToHigh') {
          return a.totalReceivable - b.totalReceivable;
        } else {
          return b.totalReceivable - a.totalReceivable;
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

    setFilteredReceivables(filtered);
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

  const handleReceivableAction = (action: string, receivableId: string) => {
    console.log(`${action} action for receivable ${receivableId}`);
    // Implement action logic here
  };

  const handleReceivePayment = () => {
    debouncedNavigate('/receivables/receive-payment');
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
      customerType: [],
      paymentTerms: [],
      amountRange: 'none',
      daysPastDue: 'none',
      creditLimit: 'none',
    });
  };

  const getActiveFiltersCount = () => {
    let count = 0;
    if (activeFilters.status.length > 0) count++;
    if (activeFilters.customerType.length > 0) count++;
    if (activeFilters.paymentTerms.length > 0) count++;
    if (activeFilters.amountRange !== 'none') count++;
    if (activeFilters.daysPastDue !== 'none') count++;
    if (activeFilters.creditLimit !== 'none') count++;
    return count;
  };

  // Apply filters whenever activeFilters or receivables change
  useEffect(() => {
    applyFilters(searchQuery);
  }, [activeFilters, receivables]);

  const handleCustomerDetails = (receivable: Receivable) => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    debouncedNavigate({
      pathname: '/receivables/customer-details',
      params: {
        customerId: receivable.id,
        customerData: JSON.stringify(receivable)
      }
    });
    
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const renderReceivableCard = (receivable: Receivable) => {
    return (
      <TouchableOpacity
        key={receivable.id}
        style={[
          styles.receivableCard,
          { borderLeftColor: getStatusColor(receivable.status) }
        ]}
        onPress={() => handleCustomerDetails(receivable)}
        activeOpacity={0.7}
        disabled={isNavigating}
      >
        {/* Top Section */}
        <View style={styles.receivableHeader}>
          {/* Left Side - Customer Info */}
          <View style={styles.receivableLeft}>
            <Image 
              source={{ uri: receivable.customerAvatar }}
              style={styles.customerAvatar}
            />
            <View style={styles.customerInfo}>
              <Text style={styles.customerName}>
                {receivable.customerType === 'business' ? receivable.businessName : receivable.customerName}
              </Text>
              {receivable.customerType === 'business' && (
                <Text style={styles.contactPerson}>Contact: {receivable.customerName}</Text>
              )}
              <View style={styles.customerMeta}>
                {receivable.customerType === 'business' ? (
                  <Building2 size={14} color={Colors.textLight} />
                ) : (
                  <User size={14} color={Colors.textLight} />
                )}
                <Text style={styles.customerType}>
                  {receivable.customerType === 'business' ? 'Business' : 'Individual'}
                </Text>
                {receivable.gstin && (
                  <Text style={styles.gstin}>• {receivable.gstin}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Right Side - Status and Amount */}
          <View style={styles.receivableRight}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(receivable.status)}20` }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getStatusColor(receivable.status) }
              ]}>
                {getStatusText(receivable.status)}
              </Text>
            </View>
            <Text style={styles.receivableAmount}>
              {formatAmount(receivable.totalReceivable)}
            </Text>
            <Text style={styles.invoiceCount}>
              {receivable.invoiceCount} {receivable.invoiceCount === 1 ? 'invoice' : 'invoices'}
            </Text>
          </View>
        </View>

        {/* Overdue Section */}
        {receivable.overdueAmount > 0 && (
          <View style={styles.overdueSection}>
            <AlertTriangle size={16} color={Colors.error} />
            <Text style={styles.overdueLabel}>Overdue:</Text>
            <Text style={styles.overdueAmount}>
              {formatAmount(receivable.overdueAmount)}
            </Text>
            <Text style={styles.daysPastDue}>
              ({receivable.daysPastDue} days past due)
            </Text>
          </View>
        )}

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Calendar size={14} color={Colors.textLight} />
            <Text style={styles.detailText}>
              Oldest: {formatDate(receivable.oldestInvoiceDate)}
            </Text>
          </View>
          
          {receivable.paymentTerms && (
            <View style={styles.detailRow}>
              <Clock size={14} color={Colors.textLight} />
              <Text style={styles.detailText}>
                Terms: {receivable.paymentTerms}
              </Text>
            </View>
          )}

          {receivable.lastPaymentDate && (
            <View style={styles.detailRow}>
              <IndianRupee size={14} color={Colors.success} />
              <Text style={styles.detailText}>
                Last payment: {formatAmount(receivable.lastPaymentAmount || 0)} on {formatDate(receivable.lastPaymentDate)}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Section */}
        <View style={styles.receivableFooter}>
          {/* Left Side - Contact */}
          <Text style={styles.contactInfo}>
            {receivable.mobile}
          </Text>

          {/* Right Side - Action Icons */}
          <View style={styles.actionIcons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReceivableAction('download', receivable.id)}
              activeOpacity={0.7}
            >
              <Download size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReceivableAction('share', receivable.id)}
              activeOpacity={0.7}
            >
              <Share size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleCustomerDetails(receivable)}
              activeOpacity={0.7}
              disabled={isNavigating}
            >
              <Eye size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const totalReceivables = filteredReceivables.reduce((sum, r) => sum + r.totalReceivable, 0);
  const totalOverdue = filteredReceivables.reduce((sum, r) => sum + r.overdueAmount, 0);
  const overdueCustomers = filteredReceivables.filter(r => r.overdueAmount > 0).length;

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
        
        <Text style={styles.headerTitle}>Receivables</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredReceivables.length} customers
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <ArrowDownLeft size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Receivables</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {formatAmount(totalReceivables)}
            </Text>
            <Text style={styles.summaryCount}>
              amount
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <AlertTriangle size={20} color={Colors.error} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Overdue Amount</Text>
            <Text style={[styles.summaryValue, { color: Colors.error }]}>
              {formatAmount(totalOverdue)}
            </Text>
            <Text style={styles.summaryCount}>
              {overdueCustomers} customers
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Building2 size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Customers</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {filteredReceivables.length}
            </Text>
            <Text style={styles.summaryCount}>
              customers
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
            placeholder="Search customers..."
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

      {/* Receivables List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredReceivables.length === 0 ? (
          <View style={styles.emptyState}>
            <ArrowDownLeft size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Receivables Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No receivables match your search criteria' : 'No outstanding receivables'}
            </Text>
          </View>
        ) : (
          filteredReceivables.map(renderReceivableCard)
        )}
      </ScrollView>

      {/* Receive Payment FAB */}
      <TouchableOpacity
        style={styles.receivePaymentFAB}
        onPress={handleReceivePayment}
        activeOpacity={0.8}
      >
        <IndianRupee size={20} color="#ffffff" />
        <Text style={styles.receivePaymentText}>Receive Payment</Text>
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
              <Text style={styles.filterModalTitle}>Filter Receivables</Text>
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
  receivableCard: {
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
  receivableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  receivableLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  customerAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  customerInfo: {
    flex: 1,
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  contactPerson: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  customerMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  customerType: {
    fontSize: 12,
    color: Colors.textLight,
  },
  gstin: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  receivableRight: {
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
  receivableAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  invoiceCount: {
    fontSize: 12,
    color: Colors.textLight,
  },
  overdueSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
    gap: 6,
  },
  overdueLabel: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
  overdueAmount: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '700',
  },
  daysPastDue: {
    fontSize: 11,
    color: Colors.error,
    fontStyle: 'italic',
  },
  detailsSection: {
    gap: 6,
    marginBottom: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 12,
    color: Colors.textLight,
    flex: 1,
  },
  receivableFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  contactInfo: {
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
  receivePaymentFAB: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40, // Above safe area to prevent gesture conflicts
    right: 20,
    backgroundColor: Colors.success,
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
  receivePaymentText: {
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