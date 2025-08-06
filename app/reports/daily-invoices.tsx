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
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Search, 
  Filter,
  Download,
  Share,
  Eye,
  ShoppingCart,
  RotateCcw,
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

export default function DailyInvoicesScreen() {
  const { date, invoices } = useLocalSearchParams();
  const invoicesList = JSON.parse(invoices as string);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInvoices, setFilteredInvoices] = useState(invoicesList);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'sales' | 'returns'>('all');

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedFilter);
  };

  const handleFilterChange = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
    applyFilters(searchQuery, filter);
  };

  const applyFilters = (query: string, filter: typeof selectedFilter) => {
    let filtered = invoicesList;

    // Apply search filter
    if (query.trim() !== '') {
      filtered = filtered.filter((invoice: any) =>
        invoice.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(query.toLowerCase()) ||
        invoice.staffName.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter((invoice: any) => {
        if (filter === 'sales') return invoice.status === 'sale';
        if (filter === 'returns') return invoice.status === 'return';
        return true;
      });
    }

    setFilteredInvoices(filtered);
  };

  const handleInvoicePress = (invoice: any) => {
    if (invoice.status === 'return') {
      // Navigate to return details
      const returnData = {
        id: invoice.id,
        returnNumber: invoice.invoiceNumber,
        originalInvoiceNumber: invoice.originalInvoice || 'INV-2024-001',
        customerName: invoice.customerName,
        customerType: invoice.customerType,
        staffName: invoice.staffName,
        staffAvatar: invoice.staffAvatar,
        refundStatus: 'refunded',
        amount: invoice.amount,
        itemCount: 1,
        date: date as string,
        reason: 'Customer return',
        customerDetails: {
          name: invoice.customerName,
          mobile: '+91 98765 43210',
          address: '123, Sample Address, City - 560001'
        }
      };

      router.push({
        pathname: '/return-details',
        params: {
          returnId: returnData.id,
          returnData: JSON.stringify(returnData)
        }
      });
    } else {
      // Navigate to invoice details
      const invoiceData = {
        id: invoice.id,
        invoiceNumber: invoice.invoiceNumber,
        customerName: invoice.customerName,
        customerType: invoice.customerType,
        staffName: invoice.staffName,
        staffAvatar: invoice.staffAvatar,
        paymentStatus: 'paid',
        amount: invoice.amount,
        itemCount: 2,
        date: date as string,
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
      weekday: 'long',
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleInvoiceAction = (action: string, invoiceId: string) => {
    console.log(`${action} action for invoice ${invoiceId}`);
    // Implement action logic here
  };

  const renderInvoiceCard = (invoice: any) => {
    const isReturn = invoice.status === 'return';
    const statusColor = isReturn ? Colors.error : Colors.success;
    const StatusIcon = isReturn ? RotateCcw : ShoppingCart;
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
                {isReturn ? 'RETURN' : 'SALE'}
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

  const salesInvoices = filteredInvoices.filter((inv: any) => inv.status === 'sale');
  const returnInvoices = filteredInvoices.filter((inv: any) => inv.status === 'return');
  const totalSales = salesInvoices.reduce((sum: number, inv: any) => sum + inv.amount, 0);
  const totalReturns = returnInvoices.reduce((sum: number, inv: any) => sum + inv.amount, 0);
  const netSales = totalSales - totalReturns;

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
        
        <Text style={styles.headerTitle}>Daily Transactions</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.dateText}>
            {formatDate(date as string)}
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <ShoppingCart size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Sales</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {formatAmount(totalSales)}
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
          <IndianRupee size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Net Sales</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {formatAmount(netSales)}
            </Text>
            <Text style={styles.summaryCount}>
              {filteredInvoices.length} total
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
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
            All ({invoicesList.length})
          </Text>
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
            Sales ({salesInvoices.length})
          </Text>
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
            Returns ({returnInvoices.length})
          </Text>
        </TouchableOpacity>
      </View>

      {/* Invoice List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredInvoices.length === 0 ? (
          <View style={styles.emptyState}>
            <FileText size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Transactions Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No transactions match your search criteria' : 'No transactions for this day'}
            </Text>
          </View>
        ) : (
          filteredInvoices.map(renderInvoiceCard)
        )}
      </ScrollView>

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search transactions..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => console.log('Advanced filter')}
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
  dateText: {
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
  filterContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    paddingHorizontal: 16,
  },
  filterTab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeFilterTab: {
    borderBottomColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeFilterTabText: {
    color: Colors.primary,
    fontWeight: '600',
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
    marginBottom: 12,
  },
  paymentMethodBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  paymentMethodText: {
    fontSize: 12,
    fontWeight: '600',
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