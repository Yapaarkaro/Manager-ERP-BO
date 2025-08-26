import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Download, Share, Eye, ArrowUpRight, Plus, Building2, User, Calendar, Clock, TriangleAlert as AlertTriangle, IndianRupee } from 'lucide-react-native';
import { Payable } from '@/utils/dataStore';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';

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

const mockPayables: Payable[] = [
  {
    id: 'PAY-001',
    supplierId: 'SUP-001',
    supplierName: 'Apple India Pvt Ltd',
    supplierType: 'business',
    businessName: 'Apple India Pvt Ltd',
    mobile: '+91 98765 43210',
    gstin: '27AABCA1234Z1Z5',
    address: '123, Apple Store, Bangalore - 560001',
    totalPayable: 250000,
    overdueAmount: 0,
    billCount: 2,
    oldestBillDate: '2024-01-20',
    daysPastDue: 0,
    creditLimit: 500000,
    paymentTerms: 'Net 30',
    lastPaymentDate: '2024-01-25',
    lastPaymentAmount: 100000,
    supplierAvatar: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'current'
  },
  {
    id: 'PAY-002',
    supplierId: 'SUP-002',
    supplierName: 'Samsung Electronics',
    supplierType: 'business',
    businessName: 'Samsung Electronics India',
    mobile: '+91 87654 32109',
    gstin: '29AABCS9876Z2Z6',
    address: '456, Samsung Plaza, Mumbai - 400001',
    totalPayable: 180000,
    overdueAmount: 100000,
    billCount: 1,
    oldestBillDate: '2024-01-15',
    daysPastDue: 3,
    creditLimit: 300000,
    paymentTerms: 'Net 30',
    lastPaymentDate: '2024-01-20',
    lastPaymentAmount: 80000,
    supplierAvatar: 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'overdue'
  },
  {
    id: 'PAY-003',
    supplierId: 'SUP-003',
    supplierName: 'Dell Technologies',
    supplierType: 'business',
    businessName: 'Dell Technologies India',
    mobile: '+91 76543 21098',
    gstin: '33AABCD5678Z3Z7',
    address: '789, Dell Tower, Delhi - 110001',
    totalPayable: 95000,
    overdueAmount: 95000,
    billCount: 1,
    oldestBillDate: '2024-01-10',
    daysPastDue: 10,
    creditLimit: 200000,
    paymentTerms: 'Net 15',
    supplierAvatar: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'critical'
  },
  {
    id: 'PAY-004',
    supplierId: 'SUP-004',
    supplierName: 'HP India',
    supplierType: 'business',
    businessName: 'HP India Pvt Ltd',
    mobile: '+91 65432 10987',
    gstin: '24AABCH2345Z4Z8',
    address: '321, HP Complex, Chennai - 600001',
    totalPayable: 120000,
    overdueAmount: 80000,
    billCount: 1,
    oldestBillDate: '2024-01-08',
    daysPastDue: 7,
    creditLimit: 250000,
    paymentTerms: 'Net 30',
    lastPaymentDate: '2024-01-15',
    lastPaymentAmount: 40000,
    supplierAvatar: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'overdue'
  },
  {
    id: 'PAY-005',
    supplierId: 'SUP-005',
    supplierName: 'Lenovo India',
    supplierType: 'business',
    businessName: 'Lenovo India Pvt Ltd',
    mobile: '+91 54321 09876',
    gstin: '27AABCL3456Z5Z9',
    address: '654, Lenovo Park, Ahmedabad - 380001',
    totalPayable: 75000,
    overdueAmount: 0,
    billCount: 2,
    oldestBillDate: '2024-01-12',
    daysPastDue: 0,
    creditLimit: 150000,
    paymentTerms: 'Net 30',
    lastPaymentDate: '2024-01-25',
    lastPaymentAmount: 25000,
    supplierAvatar: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'current'
  }
];

export default function PayablesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [payables, setPayables] = useState<Payable[]>(mockPayables);
  const [filteredPayables, setFilteredPayables] = useState<Payable[]>(mockPayables);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Use debounced navigation for supplier cards
  const debouncedNavigate = useDebounceNavigation(500);

  // Use mock data instead of dataStore
  React.useEffect(() => {
    // Set initial data from mock
    console.log('Loading mock payables:', mockPayables.length);
    setPayables(mockPayables);
    setFilteredPayables(mockPayables);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredPayables(payables);
    } else {
      const filtered = payables.filter(payable =>
        payable.supplierName.toLowerCase().includes(query.toLowerCase()) ||
        payable.businessName?.toLowerCase().includes(query.toLowerCase()) ||
        payable.mobile.includes(query) ||
        payable.gstin?.toLowerCase().includes(query.toLowerCase()) ||
        payable.address.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredPayables(filtered);
    }
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

  const handlePayableAction = (action: string, payableId: string) => {
    console.log(`${action} action for payable ${payableId}`);
    // Implement action logic here
  };

  const handleMakePayment = () => {
    router.push('/payables/make-payment');
  };

  const handleFilter = () => {
    console.log('Filter pressed');
    // Open filter modal
  };

  const handleSupplierDetails = (payable: Payable) => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    debouncedNavigate({
      pathname: '/payables/supplier-details',
      params: {
        supplierId: payable.id,
        supplierData: JSON.stringify(payable)
      }
    });
    
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const renderPayableCard = (payable: Payable) => {
    return (
      <TouchableOpacity
        key={payable.id}
        style={[
          styles.payableCard,
          { borderLeftColor: getStatusColor(payable.status) }
        ]}
        onPress={() => handleSupplierDetails(payable)}
        activeOpacity={0.7}
        disabled={isNavigating}
      >
        {/* Top Section */}
        <View style={styles.payableHeader}>
          {/* Left Side - Supplier Info */}
          <View style={styles.payableLeft}>
            <Image 
              source={{ uri: payable.supplierAvatar }}
              style={styles.supplierAvatar}
            />
            <View style={styles.supplierInfo}>
              <Text style={styles.supplierName}>
                {payable.supplierType === 'business' ? payable.businessName : payable.supplierName}
              </Text>
              {payable.supplierType === 'business' && (
                <Text style={styles.contactPerson}>Contact: {payable.supplierName}</Text>
              )}
              <View style={styles.supplierMeta}>
                {payable.supplierType === 'business' ? (
                  <Building2 size={14} color={Colors.textLight} />
                ) : (
                  <User size={14} color={Colors.textLight} />
                )}
                <Text style={styles.supplierType}>
                  {payable.supplierType === 'business' ? 'Business' : 'Individual'}
                </Text>
                {payable.gstin && (
                  <Text style={styles.gstin}>• {payable.gstin}</Text>
                )}
              </View>
            </View>
          </View>

          {/* Right Side - Status and Amount */}
          <View style={styles.payableRight}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(payable.status)}20` }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getStatusColor(payable.status) }
              ]}>
                {getStatusText(payable.status)}
              </Text>
            </View>
            <Text style={styles.payableAmount}>
              {formatAmount(payable.totalPayable)}
            </Text>
            <Text style={styles.billCount}>
              {payable.billCount} {payable.billCount === 1 ? 'bill' : 'bills'}
            </Text>
          </View>
        </View>

        {/* Overdue Section */}
        {payable.overdueAmount > 0 && (
          <View style={styles.overdueSection}>
            <AlertTriangle size={16} color={Colors.error} />
            <Text style={styles.overdueLabel}>Overdue:</Text>
            <Text style={styles.overdueAmount}>
              {formatAmount(payable.overdueAmount)}
            </Text>
            <Text style={styles.daysPastDue}>
              ({payable.daysPastDue} days past due)
            </Text>
          </View>
        )}

        {/* Details Section */}
        <View style={styles.detailsSection}>
          <View style={styles.detailRow}>
            <Calendar size={14} color={Colors.textLight} />
            <Text style={styles.detailText}>
              Oldest: {formatDate(payable.oldestBillDate)}
            </Text>
          </View>
          
          {payable.paymentTerms && (
            <View style={styles.detailRow}>
              <Clock size={14} color={Colors.textLight} />
              <Text style={styles.detailText}>
                Terms: {payable.paymentTerms}
              </Text>
            </View>
          )}

          {payable.lastPaymentDate && (
            <View style={styles.detailRow}>
              <IndianRupee size={14} color={Colors.error} />
              <Text style={styles.detailText}>
                Last payment: {formatAmount(payable.lastPaymentAmount || 0)} on {formatDate(payable.lastPaymentDate)}
              </Text>
            </View>
          )}
        </View>

        {/* Bottom Section */}
        <View style={styles.payableFooter}>
          {/* Left Side - Contact */}
          <Text style={styles.contactInfo}>
            {payable.mobile}
          </Text>

          {/* Right Side - Action Icons */}
          <View style={styles.actionIcons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePayableAction('download', payable.id)}
              activeOpacity={0.7}
            >
              <Download size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handlePayableAction('share', payable.id)}
              activeOpacity={0.7}
            >
              <Share size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleSupplierDetails(payable)}
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
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredPayables.length} suppliers
          </Text>
        </View>
      </View>

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
            onPress={handleFilter}
            activeOpacity={0.7}
          >
            <Filter size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Payables List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredPayables.length === 0 ? (
          <View style={styles.emptyState}>
            <ArrowUpRight size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Payables Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No payables match your search criteria' : 'No outstanding payables'}
            </Text>
          </View>
        ) : (
          filteredPayables.map(renderPayableCard)
        )}
      </ScrollView>

      {/* Make Payment FAB */}
      <TouchableOpacity
        style={styles.makePaymentFAB}
        onPress={handleMakePayment}
        activeOpacity={0.8}
      >
        <IndianRupee size={20} color="#ffffff" />
        <Text style={styles.makePaymentText}>Make Payment</Text>
      </TouchableOpacity>


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
  payableCard: {
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
  payableHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  payableLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  supplierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
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
  supplierMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  supplierType: {
    fontSize: 12,
    color: Colors.textLight,
  },
  gstin: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  payableRight: {
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
  payableAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  billCount: {
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
  payableFooter: {
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
});