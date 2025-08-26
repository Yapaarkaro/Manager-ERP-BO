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
import { ArrowLeft, Search, Filter, Download, Share, Eye, ArrowDownLeft, Plus, Building2, User, Calendar, Clock, TriangleAlert as AlertTriangle, IndianRupee } from 'lucide-react-native';
import { Receivable } from '@/utils/dataStore';
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

// Using Receivable interface from dataStore

const mockReceivables: Receivable[] = [
  {
    id: 'REC-001',
    customerId: 'CUST-001',
    customerName: 'Rajesh Kumar',
    customerType: 'business',
    businessName: 'TechCorp Solutions',
    mobile: '+91 98765 43210',
    gstin: '27AABCT1234Z1Z5',
    address: '123, Tech Park, Bangalore - 560001',
    totalReceivable: 45000,
    overdueAmount: 0,
    invoiceCount: 3,
    oldestInvoiceDate: '2024-01-15',
    daysPastDue: 0,
    creditLimit: 100000,
    paymentTerms: 'Net 30',
    lastPaymentDate: '2024-01-25',
    lastPaymentAmount: 20000,
    customerAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'current'
  },
  {
    id: 'REC-002',
    customerId: 'CUST-002',
    customerName: 'Metro Retail Chain',
    customerType: 'business',
    businessName: 'Metro Retail Chain',
    mobile: '+91 87654 32109',
    gstin: '29AABCM9876Z2Z6',
    address: '456, Retail Plaza, Mumbai - 400001',
    totalReceivable: 125000,
    overdueAmount: 75000,
    invoiceCount: 2,
    oldestInvoiceDate: '2024-01-10',
    daysPastDue: 5,
    creditLimit: 200000,
    paymentTerms: 'Net 45',
    lastPaymentDate: '2024-01-15',
    lastPaymentAmount: 50000,
    customerAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'overdue'
  },
  {
    id: 'REC-003',
    customerId: 'CUST-003',
    customerName: 'Sunita Devi',
    customerType: 'individual',
    mobile: '+91 76543 21098',
    address: '789, Residential Area, Delhi - 110001',
    totalReceivable: 28000,
    overdueAmount: 28000,
    invoiceCount: 1,
    oldestInvoiceDate: '2024-01-08',
    daysPastDue: 12,
    creditLimit: 50000,
    paymentTerms: 'Net 15',
    customerAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'critical'
  },
  {
    id: 'REC-004',
    customerId: 'CUST-004',
    customerName: 'Global Enterprises',
    customerType: 'business',
    businessName: 'Global Enterprises Ltd',
    mobile: '+91 65432 10987',
    gstin: '33AABCG5678Z3Z7',
    address: '321, Corporate Tower, Chennai - 600001',
    totalReceivable: 89000,
    overdueAmount: 59000,
    invoiceCount: 2,
    oldestInvoiceDate: '2024-01-05',
    daysPastDue: 8,
    creditLimit: 150000,
    paymentTerms: 'Net 30',
    lastPaymentDate: '2024-01-12',
    lastPaymentAmount: 30000,
    customerAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'overdue'
  },
  {
    id: 'REC-005',
    customerId: 'CUST-005',
    customerName: 'Vikram Patel',
    customerType: 'business',
    businessName: 'Patel Electronics',
    mobile: '+91 54321 09876',
    gstin: '24AABCP2345Z4Z8',
    address: '654, Electronics Market, Ahmedabad - 380001',
    totalReceivable: 67000,
    overdueAmount: 0,
    invoiceCount: 3,
    oldestInvoiceDate: '2024-01-12',
    daysPastDue: 0,
    creditLimit: 100000,
    paymentTerms: 'Net 30',
    lastPaymentDate: '2024-01-25',
    lastPaymentAmount: 20000,
    customerAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'current'
  }
];

export default function ReceivablesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [receivables, setReceivables] = useState<Receivable[]>(mockReceivables);
  const [filteredReceivables, setFilteredReceivables] = useState<Receivable[]>(mockReceivables);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Use debounced navigation for customer cards
  const debouncedNavigate = useDebounceNavigation(500);

  // Use mock data instead of dataStore
  React.useEffect(() => {
    // Set initial data from mock
    console.log('Loading mock receivables:', mockReceivables.length);
    setReceivables(mockReceivables);
    setFilteredReceivables(mockReceivables);
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredReceivables(receivables);
    } else {
      const filtered = receivables.filter(receivable =>
        receivable.customerName.toLowerCase().includes(query.toLowerCase()) ||
        receivable.businessName?.toLowerCase().includes(query.toLowerCase()) ||
        receivable.mobile.includes(query) ||
        receivable.gstin?.toLowerCase().includes(query.toLowerCase()) ||
        receivable.address.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredReceivables(filtered);
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

  const handleReceivableAction = (action: string, receivableId: string) => {
    console.log(`${action} action for receivable ${receivableId}`);
    // Implement action logic here
  };

  const handleReceivePayment = () => {
    router.push('/receivables/receive-payment');
  };

  const handleFilter = () => {
    console.log('Filter pressed');
    // Open filter modal
  };

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
            onPress={handleFilter}
            activeOpacity={0.7}
          >
            <Filter size={20} color="#FFFFFF" />
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
});