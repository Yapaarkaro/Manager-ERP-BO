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
import { 
  ArrowLeft, 
  Search, 
  Filter,
  Download,
  Share,
  Eye,
  ShoppingCart,
  Plus,
  FileText,
  User,
  Building2,
  Calendar,
  Banknote,
  Smartphone,
  CreditCard,
  IndianRupee
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

interface SalesInvoice {
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
}

// Only sales invoices (no returns)
const mockSalesInvoices: SalesInvoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    customerName: 'Rajesh Kumar',
    customerType: 'individual',
    staffName: 'Priya Sharma',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    amount: 15500,
    itemCount: 2,
    date: '2024-01-16',
    time: '09:30 AM'
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    customerName: 'TechCorp Solutions',
    customerType: 'business',
    staffName: 'Rajesh Kumar',
    staffAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    amount: 35000,
    itemCount: 5,
    date: '2024-01-16',
    time: '11:45 AM'
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-003',
    customerName: 'Sunita Devi',
    customerType: 'individual',
    staffName: 'Amit Singh',
    staffAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'card',
    amount: 22000,
    itemCount: 3,
    date: '2024-01-16',
    time: '03:20 PM'
  },
  {
    id: '4',
    invoiceNumber: 'INV-2024-004',
    customerName: 'Metro Retail Chain',
    customerType: 'business',
    staffName: 'Rajesh Kumar',
    staffAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    amount: 45000,
    itemCount: 8,
    date: '2024-01-15',
    time: '10:15 AM'
  },
  {
    id: '5',
    invoiceNumber: 'INV-2024-005',
    customerName: 'Vikram Patel',
    customerType: 'individual',
    staffName: 'Priya Sharma',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    amount: 28000,
    itemCount: 4,
    date: '2024-01-15',
    time: '01:30 PM'
  },
  {
    id: '6',
    invoiceNumber: 'INV-2024-006',
    customerName: 'Global Enterprises',
    customerType: 'business',
    staffName: 'Amit Singh',
    staffAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'pending',
    paymentMethod: 'others',
    amount: 67000,
    itemCount: 10,
    date: '2024-01-14',
    time: '02:45 PM'
  },
  {
    id: '7',
    invoiceNumber: 'INV-2024-007',
    customerName: 'Tech Solutions Ltd',
    customerType: 'business',
    staffName: 'Priya Sharma',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    amount: 89000,
    itemCount: 12,
    date: '2024-01-14',
    time: '04:15 PM'
  },
  {
    id: '8',
    invoiceNumber: 'INV-2024-008',
    customerName: 'Ravi Gupta',
    customerType: 'individual',
    staffName: 'Amit Singh',
    staffAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'partially_paid',
    paymentMethod: 'card',
    amount: 34500,
    itemCount: 6,
    date: '2024-01-13',
    time: '11:20 AM'
  },
];

export default function SalesInvoicesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInvoices, setFilteredInvoices] = useState(mockSalesInvoices);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredInvoices(mockSalesInvoices);
    } else {
      const filtered = mockSalesInvoices.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(query.toLowerCase()) ||
        invoice.staffName.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredInvoices(filtered);
    }
  };

  const handleInvoicePress = (invoice: SalesInvoice) => {
    // Navigate to invoice details
    const invoiceData = {
      id: invoice.id,
      invoiceNumber: invoice.invoiceNumber,
      customerName: invoice.customerName,
      customerType: invoice.customerType,
      staffName: invoice.staffName,
      staffAvatar: invoice.staffAvatar,
      paymentStatus: invoice.paymentStatus,
      amount: invoice.amount,
      itemCount: invoice.itemCount,
      date: invoice.date,
      customerDetails: {
        name: invoice.customerName,
        mobile: '+91 98765 43210',
        businessName: invoice.customerType === 'business' ? invoice.customerName : undefined,
        address: '123, Sample Address, City - 560001'
      }
    };

    router.push({
      pathname: '/invoice-details',
      params: {
        invoiceId: invoiceData.id,
        invoiceData: JSON.stringify(invoiceData)
      }
    });
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return Colors.success;
      case 'partially_paid': return Colors.warning;
      case 'pending': return Colors.error;
      default: return Colors.textLight;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'PAID';
      case 'partially_paid': return 'PARTIAL';
      case 'pending': return 'PENDING';
      default: return status.toUpperCase();
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

  const handleInvoiceAction = (action: string, invoiceId: string) => {
    console.log(`${action} action for invoice ${invoiceId}`);
    // Implement action logic here
  };

  const handleNewSale = () => {
    router.push('/new-sale');
  };

  const renderInvoiceCard = (invoice: SalesInvoice) => {
    const PaymentIcon = getPaymentMethodIcon(invoice.paymentMethod);
    const paymentColor = getPaymentMethodColor(invoice.paymentMethod);
    const statusColor = getPaymentStatusColor(invoice.paymentStatus);

    return (
      <TouchableOpacity
        key={invoice.id}
        style={[styles.invoiceCard, { borderLeftColor: Colors.success }]}
        onPress={() => handleInvoicePress(invoice)}
        activeOpacity={0.7}
      >
        {/* Top Section */}
        <View style={styles.invoiceHeader}>
          {/* Left Side - Invoice Info */}
          <View style={styles.invoiceLeft}>
            <View style={[styles.invoiceStatusIcon, { backgroundColor: `${Colors.success}20` }]}>
              <ShoppingCart size={20} color={Colors.success} />
            </View>
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
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
            <Text style={[styles.invoiceAmount, { color: Colors.success }]}>
              {formatAmount(invoice.amount)}
            </Text>
            <Text style={styles.invoiceTime}>{invoice.time}</Text>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` }
            ]}>
              <Text style={[styles.statusText, { color: statusColor }]}>
                {getPaymentStatusText(invoice.paymentStatus)}
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
            <Image 
              source={{ uri: invoice.staffAvatar }}
              style={styles.staffAvatar}
            />
            <Text style={styles.staffName}>Processed by {invoice.staffName}</Text>
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

  const totalSalesAmount = filteredInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const paidInvoices = filteredInvoices.filter(inv => inv.paymentStatus === 'paid');
  const pendingInvoices = filteredInvoices.filter(inv => inv.paymentStatus === 'pending' || inv.paymentStatus === 'partially_paid');

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
        
        <Text style={styles.headerTitle}>Sales Invoices</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredInvoices.length} invoices
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <ShoppingCart size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Sales</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {formatAmount(totalSalesAmount)}
            </Text>
            <Text style={styles.summaryCount}>
              {filteredInvoices.length} invoices
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <FileText size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Paid</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {paidInvoices.length}
            </Text>
            <Text style={styles.summaryCount}>
              invoices
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Calendar size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Pending</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {pendingInvoices.length}
            </Text>
            <Text style={styles.summaryCount}>
              invoices
            </Text>
          </View>
        </View>
      </View>

      {/* Sales Invoices List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <ShoppingCart size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Sales Invoices Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No sales invoices match your search criteria' : 'No sales invoices for the selected period'}
            </Text>
          </View>
        ) : (
          filteredInvoices.map(renderInvoiceCard)
        )}
      </ScrollView>

      {/* New Sale FAB */}
      <TouchableOpacity
        style={styles.newSaleFAB}
        onPress={handleNewSale}
        activeOpacity={0.8}
      >
        <Plus size={20} color="#ffffff" />
        <Text style={styles.newSaleText}>New Sale</Text>
      </TouchableOpacity>

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search sales invoices..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => console.log('Filter sales invoices')}
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
  newSaleFAB: {
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
  newSaleText: {
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