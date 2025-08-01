import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Download, Share, Eye, ShoppingCart, Plus, FileText, User, Building2, Calendar, Banknote, Smartphone, CreditCard, IndianRupee, Package, Truck, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, X, ChevronDown } from 'lucide-react-native';

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

interface PurchaseInvoice {
  id: string;
  poNumber: string;
  invoiceNumber: string;
  supplierName: string;
  supplierType: 'business' | 'individual';
  businessName?: string;
  gstin?: string;
  staffName: string;
  staffAvatar: string;
  status: 'pending' | 'received' | 'partial' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'overdue';
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer';
  amount: number;
  itemCount: number;
  date: string;
  expectedDelivery: string;
  actualDelivery?: string;
  supplierAvatar: string;
}

const mockPurchaseInvoices: PurchaseInvoice[] = [
  {
    id: '1',
    poNumber: 'PO-2024-001',
    invoiceNumber: 'PINV-2024-001',
    supplierName: 'Apple India Pvt Ltd',
    supplierType: 'business',
    businessName: 'Apple India Pvt Ltd',
    gstin: '29ABCDE1234F2Z6',
    staffName: 'Rajesh Kumar',
    staffAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'received',
    paymentStatus: 'paid',
    paymentMethod: 'bank_transfer',
    amount: 850000,
    itemCount: 10,
    date: '2024-01-15',
    expectedDelivery: '2024-01-20',
    actualDelivery: '2024-01-19',
    supplierAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
  },
  {
    id: '2',
    poNumber: 'PO-2024-002',
    invoiceNumber: 'PINV-2024-002',
    supplierName: 'Samsung Electronics',
    supplierType: 'business',
    businessName: 'Samsung Electronics India Pvt Ltd',
    gstin: '27FGHIJ5678K3L9',
    staffName: 'Priya Sharma',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'bank_transfer',
    amount: 650000,
    itemCount: 8,
    date: '2024-01-18',
    expectedDelivery: '2024-01-25',
    supplierAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
  },
  {
    id: '3',
    poNumber: 'PO-2024-003',
    invoiceNumber: 'PINV-2024-003',
    supplierName: 'Dell Technologies',
    supplierType: 'business',
    businessName: 'Dell Technologies India Pvt Ltd',
    gstin: '07KLMNO9012P3Q4',
    staffName: 'Amit Singh',
    staffAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'partial',
    paymentStatus: 'pending',
    paymentMethod: 'bank_transfer',
    amount: 420000,
    itemCount: 5,
    date: '2024-01-16',
    expectedDelivery: '2024-01-22',
    actualDelivery: '2024-01-21',
    supplierAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
  },
  {
    id: '4',
    poNumber: 'PO-2024-004',
    invoiceNumber: 'PINV-2024-004',
    supplierName: 'Local Electronics Supplier',
    supplierType: 'individual',
    staffName: 'Meera Joshi',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'cancelled',
    paymentStatus: 'pending',
    paymentMethod: 'cash',
    amount: 180000,
    itemCount: 3,
    date: '2024-01-12',
    expectedDelivery: '2024-01-18',
    supplierAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
  },
];

export default function PurchasesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredPurchases, setFilteredPurchases] = useState(mockPurchaseInvoices);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'pending' | 'received' | 'cancelled'>('all');
  const [showFilterModal, setShowFilterModal] = useState(false);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedFilter);
  };

  const handleFilterChange = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
    setShowFilterModal(false);
    applyFilters(searchQuery, filter);
  };

  const applyFilters = (query: string, filter: typeof selectedFilter) => {
    let filtered = mockPurchaseInvoices;

    // Apply search filter
    if (query.trim() !== '') {
      filtered = filtered.filter(purchase =>
        purchase.poNumber.toLowerCase().includes(query.toLowerCase()) ||
        purchase.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
        purchase.supplierName.toLowerCase().includes(query.toLowerCase()) ||
        purchase.businessName?.toLowerCase().includes(query.toLowerCase()) ||
        purchase.staffName.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(purchase => purchase.status === filter);
    }

    setFilteredPurchases(filtered);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received': return Colors.success;
      case 'pending': return Colors.warning;
      case 'partial': return Colors.primary;
      case 'cancelled': return Colors.error;
      default: return Colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received': return 'RECEIVED';
      case 'pending': return 'PENDING';
      case 'partial': return 'PARTIAL';
      case 'cancelled': return 'CANCELLED';
      default: return status.toUpperCase();
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received': return CheckCircle;
      case 'pending': return Clock;
      case 'partial': return Package;
      case 'cancelled': return AlertTriangle;
      default: return FileText;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash': return Banknote;
      case 'upi': return Smartphone;
      case 'card': return CreditCard;
      case 'bank_transfer': return Building2;
      default: return IndianRupee;
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

  const handlePurchasePress = (purchase: PurchaseInvoice) => {
    router.push({
      pathname: '/purchasing/purchase-details',
      params: {
        purchaseId: purchase.id,
        purchaseData: JSON.stringify(purchase)
      }
    });
  };

  const handleCreatePO = () => {
    router.push('/purchasing/select-supplier');
  };

  const renderPurchaseCard = (purchase: PurchaseInvoice) => {
    const StatusIcon = getStatusIcon(purchase.status);
    const PaymentIcon = getPaymentMethodIcon(purchase.paymentMethod);
    const statusColor = getStatusColor(purchase.status);

    return (
      <TouchableOpacity
        key={purchase.id}
        style={[
          styles.purchaseCard,
          { borderLeftColor: statusColor }
        ]}
        onPress={() => handlePurchasePress(purchase)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.purchaseHeader}>
          <View style={styles.purchaseLeft}>
            <View style={[styles.statusIcon, { backgroundColor: `${statusColor}20` }]}>
              <StatusIcon size={20} color={statusColor} />
            </View>
            <View style={styles.purchaseInfo}>
              <Text style={styles.poNumber}>{purchase.poNumber}</Text>
              <Text style={styles.invoiceNumber}>Invoice: {purchase.invoiceNumber}</Text>
              <View style={styles.supplierInfo}>
                {purchase.supplierType === 'business' ? (
                  <Building2 size={14} color={Colors.textLight} />
                ) : (
                  <User size={14} color={Colors.textLight} />
                )}
                <Text style={styles.supplierName}>
                  {purchase.supplierType === 'business' ? purchase.businessName : purchase.supplierName}
                </Text>
              </View>
            </View>
          </View>

          <View style={styles.purchaseRight}>
            <Text style={styles.purchaseAmount}>
              {formatAmount(purchase.amount)}
            </Text>
            <Text style={styles.itemCount}>
              {purchase.itemCount} items
            </Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` }
            ]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getStatusText(purchase.status)}
              </Text>
            </View>
          </View>
        </View>

        {/* Delivery Info */}
        <View style={styles.deliverySection}>
          <View style={styles.deliveryRow}>
            <Truck size={14} color={Colors.textLight} />
            <Text style={styles.deliveryLabel}>Expected:</Text>
            <Text style={styles.deliveryDate}>{formatDate(purchase.expectedDelivery)}</Text>
          </View>
          {purchase.actualDelivery && (
            <View style={styles.deliveryRow}>
              <CheckCircle size={14} color={Colors.success} />
              <Text style={styles.deliveryLabel}>Delivered:</Text>
              <Text style={styles.deliveryDate}>{formatDate(purchase.actualDelivery)}</Text>
            </View>
          )}
        </View>

        {/* Payment Info */}
        <View style={styles.paymentSection}>
          <View style={styles.paymentRow}>
            <PaymentIcon size={16} color={Colors.primary} />
            <Text style={styles.paymentMethod}>
              {purchase.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
               purchase.paymentMethod === 'cash' ? 'Cash' :
               purchase.paymentMethod === 'upi' ? 'UPI' : 'Card'}
            </Text>
            <View style={[
              styles.paymentStatusBadge,
              { backgroundColor: purchase.paymentStatus === 'paid' ? `${Colors.success}20` : `${Colors.warning}20` }
            ]}>
              <Text style={[
                styles.paymentStatusText,
                { color: purchase.paymentStatus === 'paid' ? Colors.success : Colors.warning }
              ]}>
                {purchase.paymentStatus.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Footer */}
        <View style={styles.purchaseFooter}>
          <View style={styles.staffInfo}>
            <Image 
              source={{ uri: purchase.staffAvatar }}
              style={styles.staffAvatar}
            />
            <Text style={styles.staffName}>Ordered by {purchase.staffName}</Text>
          </View>
          
          <View style={styles.actionIcons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => console.log('Download purchase')}
              activeOpacity={0.7}
            >
              <Download size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => console.log('Share purchase')}
              activeOpacity={0.7}
            >
              <Share size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePurchasePress(purchase)}
              activeOpacity={0.7}
            >
              <Eye size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const totalPurchases = filteredPurchases.reduce((sum, p) => sum + p.amount, 0);
  const pendingPurchases = filteredPurchases.filter(p => p.status === 'pending').length;
  const receivedPurchases = filteredPurchases.filter(p => p.status === 'received').length;

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
        
        <Text style={styles.headerTitle}>Purchase Orders</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredPurchases.length} orders
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <ShoppingCart size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {formatAmount(totalPurchases)}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Clock size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {pendingPurchases}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <CheckCircle size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Received</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {receivedPurchases}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {[
            { key: 'all', label: 'All', count: mockPurchaseInvoices.length },
            { key: 'pending', label: 'Pending', count: mockPurchaseInvoices.filter(p => p.status === 'pending').length },
            { key: 'received', label: 'Received', count: mockPurchaseInvoices.filter(p => p.status === 'received').length },
            { key: 'cancelled', label: 'Cancelled', count: mockPurchaseInvoices.filter(p => p.status === 'cancelled').length },
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

      {/* Purchase List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredPurchases.length === 0 ? (
          <View style={styles.emptyState}>
            <ShoppingCart size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Purchase Orders Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No purchase orders match your search criteria' : 'No purchase orders created yet'}
            </Text>
          </View>
        ) : (
          filteredPurchases.map(renderPurchaseCard)
        )}
      </ScrollView>

      {/* Create PO FAB */}
      <TouchableOpacity
        style={styles.createPOFAB}
        onPress={handleCreatePO}
        activeOpacity={0.8}
      >
        <Plus size={20} color="#ffffff" />
        <Text style={styles.createPOText}>Create PO</Text>
      </TouchableOpacity>

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search purchase orders..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => setShowFilterModal(true)}
              activeOpacity={0.7}
            >
              <Filter size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

      {/* Filter Modal */}
      <Modal
        visible={showFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter Purchase Orders</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowFilterModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.filterOptions}>
              {[
                { key: 'all', label: 'All Orders' },
                { key: 'pending', label: 'Pending Orders' },
                { key: 'received', label: 'Received Orders' },
                { key: 'cancelled', label: 'Cancelled Orders' },
              ].map((option) => (
                <TouchableOpacity
                  key={option.key}
                  style={[
                    styles.filterOption,
                    selectedFilter === option.key && styles.selectedFilterOption
                  ]}
                  onPress={() => handleFilterChange(option.key as typeof selectedFilter)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.filterOptionText,
                    selectedFilter === option.key && styles.selectedFilterOptionText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}
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
  purchaseCard: {
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
  purchaseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  purchaseLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  purchaseInfo: {
    flex: 1,
  },
  poNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  invoiceNumber: {
    fontSize: 12,
    color: Colors.primary,
    marginBottom: 6,
  },
  supplierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  supplierName: {
    fontSize: 14,
    color: Colors.textLight,
  },
  purchaseRight: {
    alignItems: 'flex-end',
  },
  purchaseAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  itemCount: {
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
  deliverySection: {
    gap: 6,
    marginBottom: 12,
  },
  deliveryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  deliveryLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  deliveryDate: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  paymentSection: {
    marginBottom: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethod: {
    fontSize: 12,
    color: Colors.textLight,
    flex: 1,
  },
  paymentStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  paymentStatusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  purchaseFooter: {
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
  createPOFAB: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: Colors.primary,
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
  createPOText: {
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
    backgroundColor: Colors.background,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.grey[300],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    marginRight: 12,
    outlineStyle: 'none',
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  filterOptions: {
    padding: 20,
  },
  filterOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.grey[50],
  },
  selectedFilterOption: {
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  filterOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedFilterOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
});