import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Download, Share, Eye, ArrowDownLeft, Plus, Building2, User, Calendar, Clock, TriangleAlert as AlertTriangle, IndianRupee } from 'lucide-react-native';

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

interface Receivable {
  id: string;
  customerName: string;
  customerType: 'individual' | 'business';
  businessName?: string;
  gstin?: string;
  mobile: string;
  email?: string;
  address: string;
  totalReceivable: number;
  overdueAmount: number;
  invoiceCount: number;
  oldestInvoiceDate: string;
  daysPastDue: number;
  creditLimit?: number;
  paymentTerms?: string;
  lastPaymentDate?: string;
  lastPaymentAmount?: number;
  customerAvatar: string;
  status: 'current' | 'overdue' | 'critical';
}

const mockReceivables: Receivable[] = [
  {
    id: '1',
    customerName: 'TechCorp Solutions Pvt Ltd',
    customerType: 'business',
    businessName: 'TechCorp Solutions Pvt Ltd',
    gstin: '29ABCDE1234F2Z6',
    mobile: '+91 87654 32109',
    email: 'accounts@techcorp.com',
    address: '456, Electronic City, Phase 2, Bangalore, Karnataka - 560100',
    totalReceivable: 125000,
    overdueAmount: 45000,
    invoiceCount: 3,
    oldestInvoiceDate: '2024-01-05',
    daysPastDue: 25,
    creditLimit: 500000,
    paymentTerms: 'Net 30 Days',
    lastPaymentDate: '2024-01-10',
    lastPaymentAmount: 75000,
    customerAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'overdue'
  },
  {
    id: '2',
    customerName: 'Global Enterprises Ltd',
    customerType: 'business',
    businessName: 'Global Enterprises Ltd',
    gstin: '27FGHIJ5678K3L9',
    mobile: '+91 99887 76655',
    email: 'finance@globalent.com',
    address: '567, Bandra West, Mumbai, Maharashtra - 400050',
    totalReceivable: 89000,
    overdueAmount: 89000,
    invoiceCount: 2,
    oldestInvoiceDate: '2023-12-15',
    daysPastDue: 45,
    creditLimit: 300000,
    paymentTerms: 'Net 15 Days',
    lastPaymentDate: '2023-12-20',
    lastPaymentAmount: 50000,
    customerAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'critical'
  },
  {
    id: '3',
    customerName: 'Rajesh Kumar',
    customerType: 'individual',
    mobile: '+91 98765 43210',
    address: '123, MG Road, Bangalore, Karnataka - 560001',
    totalReceivable: 35000,
    overdueAmount: 0,
    invoiceCount: 1,
    oldestInvoiceDate: '2024-01-20',
    daysPastDue: 0,
    lastPaymentDate: '2024-01-15',
    lastPaymentAmount: 25000,
    customerAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'current'
  },
  {
    id: '4',
    customerName: 'Sunita Devi',
    customerType: 'individual',
    mobile: '+91 76543 21098',
    address: '321, Jayanagar, 4th Block, Bangalore, Karnataka - 560011',
    totalReceivable: 22000,
    overdueAmount: 12000,
    invoiceCount: 2,
    oldestInvoiceDate: '2024-01-08',
    daysPastDue: 15,
    lastPaymentDate: '2024-01-12',
    lastPaymentAmount: 18000,
    customerAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'overdue'
  },
  {
    id: '5',
    customerName: 'Metro Retail Chain',
    customerType: 'business',
    businessName: 'Metro Retail Chain Pvt Ltd',
    gstin: '07KLMNO9012P3Q4',
    mobile: '+91 88776 65544',
    email: 'payments@metroretail.com',
    address: '890, Connaught Place, New Delhi, Delhi - 110001',
    totalReceivable: 156000,
    overdueAmount: 0,
    invoiceCount: 4,
    oldestInvoiceDate: '2024-01-18',
    daysPastDue: 0,
    creditLimit: 750000,
    paymentTerms: 'Net 45 Days',
    lastPaymentDate: '2024-01-22',
    lastPaymentAmount: 95000,
    customerAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'current'
  },
];

export default function ReceivablesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredReceivables, setFilteredReceivables] = useState(mockReceivables);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredReceivables(mockReceivables);
    } else {
      const filtered = mockReceivables.filter(receivable =>
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
    router.push({
      pathname: '/receivables/customer-details',
      params: {
        customerId: receivable.id,
        customerData: JSON.stringify(receivable)
      }
    });
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
          </View>
        </View>

        <View style={styles.summaryCard}>
          <AlertTriangle size={20} color={Colors.error} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Overdue Amount</Text>
            <Text style={[styles.summaryValue, { color: Colors.error }]}>
              {formatAmount(totalOverdue)}
            </Text>
            <Text style={styles.summarySubtext}>
              {overdueCustomers} customers
            </Text>
          </View>
        </View>
      </View>

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

      {/* Bottom Section with Search */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
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
              <Filter size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    gap: 12,
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
    flex: 1,
  },
  summaryLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  summarySubtext: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
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
    bottom: 90,
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
});