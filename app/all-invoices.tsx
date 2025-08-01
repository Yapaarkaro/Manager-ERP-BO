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
  IndianRupee,
  ChevronDown,
  X
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

interface Invoice {
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
  status: 'sale' | 'return';
  originalInvoice?: string;
}

const mockAllInvoices: Invoice[] = [
  // Sales Invoices
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
    time: '09:30 AM',
    status: 'sale'
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
    time: '11:45 AM',
    status: 'sale'
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
    time: '03:20 PM',
    status: 'sale'
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
    time: '10:15 AM',
    status: 'sale'
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
    time: '01:30 PM',
    status: 'sale'
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
    time: '02:45 PM',
    status: 'sale'
  },
  
  // Return Invoices
  {
    id: '7',
    invoiceNumber: 'RET-2024-001',
    customerName: 'Rajesh Kumar',
    customerType: 'individual',
    staffName: 'Priya Sharma',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    amount: 5500,
    itemCount: 1,
    date: '2024-01-16',
    time: '02:15 PM',
    status: 'return',
    originalInvoice: 'INV-2024-001'
  },
  {
    id: '8',
    invoiceNumber: 'RET-2024-002',
    customerName: 'Global Enterprises',
    customerType: 'business',
    staffName: 'Priya Sharma',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    amount: 3000,
    itemCount: 1,
    date: '2024-01-16',
    time: '04:30 PM',
    status: 'return',
    originalInvoice: 'INV-2024-002'
  },
  {
    id: '9',
    invoiceNumber: 'RET-2024-003',
    customerName: 'TechCorp Solutions',
    customerType: 'business',
    staffName: 'Amit Singh',
    staffAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'card',
    amount: 8000,
    itemCount: 2,
    date: '2024-01-15',
    time: '04:20 PM',
    status: 'return',
    originalInvoice: 'INV-2024-004'
  },
  {
    id: '10',
    invoiceNumber: 'RET-2024-004',
    customerName: 'Sunita Devi',
    customerType: 'individual',
    staffName: 'Rajesh Kumar',
    staffAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    amount: 12000,
    itemCount: 3,
    date: '2024-01-14',
    time: '11:30 AM',
    status: 'return',
    originalInvoice: 'INV-2024-003'
  },
];

type TimeRange = 'today' | 'week' | 'month' | 'custom';

export default function AllInvoicesScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredInvoices, setFilteredInvoices] = useState(mockAllInvoices);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'sales' | 'returns'>('all');
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('today');
  const [showTimeRangeModal, setShowTimeRangeModal] = useState(false);
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  const timeRangeOptions = [
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'custom', label: 'Custom Range' },
  ];

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedFilter, selectedTimeRange);
  };

  const handleFilterChange = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
    applyFilters(searchQuery, filter, selectedTimeRange);
  };

  const handleTimeRangeChange = (timeRange: TimeRange) => {
    setSelectedTimeRange(timeRange);
    if (timeRange !== 'custom') {
      setShowTimeRangeModal(false);
      applyFilters(searchQuery, selectedFilter, timeRange);
    }
  };

  const applyCustomDateRange = () => {
    if (!customFromDate || !customToDate) {
      return;
    }
    setShowTimeRangeModal(false);
    applyFilters(searchQuery, selectedFilter, 'custom');
  };

  const applyFilters = (query: string, filter: typeof selectedFilter, timeRange: TimeRange) => {
    let filtered = mockAllInvoices;

    // Apply search filter
    if (query.trim() !== '') {
      filtered = filtered.filter(invoice =>
        invoice.invoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
        invoice.customerName.toLowerCase().includes(query.toLowerCase()) ||
        invoice.staffName.toLowerCase().includes(query.toLowerCase())
      );
    }

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(invoice => {
        if (filter === 'sales') return invoice.status === 'sale';
        if (filter === 'returns') return invoice.status === 'return';
        return true;
      });
    }

    // Apply time range filter
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    
    filtered = filtered.filter(invoice => {
      const invoiceDate = new Date(invoice.date);
      
      switch (timeRange) {
        case 'today':
          return invoice.date === todayStr;
        case 'week':
          const weekAgo = new Date(today);
          weekAgo.setDate(today.getDate() - 7);
          return invoiceDate >= weekAgo && invoiceDate <= today;
        case 'month':
          const monthAgo = new Date(today);
          monthAgo.setMonth(today.getMonth() - 1);
          return invoiceDate >= monthAgo && invoiceDate <= today;
        case 'custom':
          if (customFromDate && customToDate) {
            const fromDate = new Date(customFromDate);
            const toDate = new Date(customToDate);
            return invoiceDate >= fromDate && invoiceDate <= toDate;
          }
          return true;
        default:
          return true;
      }
    });

    setFilteredInvoices(filtered);
  };

  const handleInvoicePress = (invoice: Invoice) => {
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
        itemCount: invoice.itemCount,
        date: invoice.date,
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

  const getTimeRangeLabel = () => {
    switch (selectedTimeRange) {
      case 'today': return 'Today';
      case 'week': return 'This Week';
      case 'month': return 'This Month';
      case 'custom': 
        if (customFromDate && customToDate) {
          return `${customFromDate} to ${customToDate}`;
        }
        return 'Custom Range';
      default: return 'Today';
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

  const renderInvoiceCard = (invoice: Invoice) => {
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

  const salesInvoices = filteredInvoices.filter(inv => inv.status === 'sale');
  const returnInvoices = filteredInvoices.filter(inv => inv.status === 'return');
  const totalSalesAmount = salesInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const totalReturns = returnInvoices.reduce((sum, inv) => sum + inv.amount, 0);
  const netSales = totalSalesAmount - totalReturns;

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
        
        <Text style={styles.headerTitle}>All Invoices</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredInvoices.length} invoices
          </Text>
        </View>
      </View>

      {/* Time Range Selector */}
      <View style={styles.timeRangeContainer}>
        <Text style={styles.timeRangeLabel}>Time Period:</Text>
        <TouchableOpacity
          style={styles.timeRangeSelector}
          onPress={() => setShowTimeRangeModal(true)}
          activeOpacity={0.7}
        >
          <Calendar size={20} color={Colors.primary} />
          <Text style={styles.timeRangeText}>{getTimeRangeLabel()}</Text>
          <ChevronDown size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <ShoppingCart size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Sales</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {formatAmount(totalSalesAmount)}
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
            All ({mockAllInvoices.length})
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
            <Text style={styles.emptyStateTitle}>No Invoices Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No invoices match your search criteria' : 'No invoices for the selected time period'}
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
              placeholder="Search invoices..."
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

      {/* Time Range Selection Modal */}
      <Modal
        visible={showTimeRangeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTimeRangeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Time Period</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTimeRangeModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              {timeRangeOptions.map((option) => (
                <TouchableOpacity
                  key={option.value}
                  style={[
                    styles.timeRangeOption,
                    selectedTimeRange === option.value && styles.selectedTimeRangeOption
                  ]}
                  onPress={() => handleTimeRangeChange(option.value as TimeRange)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.timeRangeOptionText,
                    selectedTimeRange === option.value && styles.selectedTimeRangeText
                  ]}>
                    {option.label}
                  </Text>
                </TouchableOpacity>
              ))}

              {selectedTimeRange === 'custom' && (
                <View style={styles.customDateContainer}>
                  <Text style={styles.customDateLabel}>Custom Date Range</Text>
                  
                  <View style={styles.dateInputRow}>
                    <View style={styles.dateInputGroup}>
                      <Text style={styles.dateInputLabel}>From Date</Text>
                      <TextInput
                        style={styles.dateInput}
                        value={customFromDate}
                        onChangeText={setCustomFromDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={Colors.textLight}
                      />
                    </View>
                    
                    <View style={styles.dateInputGroup}>
                      <Text style={styles.dateInputLabel}>To Date</Text>
                      <TextInput
                        style={styles.dateInput}
                        value={customToDate}
                        onChangeText={setCustomToDate}
                        placeholder="YYYY-MM-DD"
                        placeholderTextColor={Colors.textLight}
                      />
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[
                      styles.applyCustomButton,
                      (!customFromDate || !customToDate) && styles.disabledButton
                    ]}
                    onPress={applyCustomDateRange}
                    disabled={!customFromDate || !customToDate}
                    activeOpacity={0.8}
                  >
                    <Text style={[
                      styles.applyCustomButtonText,
                      (!customFromDate || !customToDate) && styles.disabledButtonText
                    ]}>
                      Apply Custom Range
                    </Text>
                  </TouchableOpacity>
                </View>
              )}
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
  timeRangeContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grey[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  timeRangeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  timeRangeSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 8,
  },
  timeRangeText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
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
  modalContent: {
    padding: 20,
  },
  timeRangeOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.grey[50],
  },
  selectedTimeRangeOption: {
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  timeRangeOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedTimeRangeText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  customDateContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  customDateLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  dateInputRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  dateInputGroup: {
    flex: 1,
  },
  dateInputLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  dateInput: {
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 14,
    color: Colors.text,
    outlineStyle: 'none',
  },
  applyCustomButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  applyCustomButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  disabledButtonText: {
    color: Colors.textLight,
  },
});