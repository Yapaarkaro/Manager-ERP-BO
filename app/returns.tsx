import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Keyboard,
  Platform,
  TextInput,
} from 'react-native';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Download,
  Share,
  Eye,
  RotateCcw,
  Plus,
  FileText,
  Search,
  Filter,
  Package
} from 'lucide-react-native';
import AnimatedSearchBar from '@/components/AnimatedSearchBar';

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

interface ReturnInvoice {
  id: string;
  returnNumber: string;
  originalInvoiceNumber: string;
  customerName: string;
  customerType: 'individual' | 'business';
  staffName: string;
  staffAvatar: string;
  refundStatus: 'refunded' | 'partially_refunded' | 'pending';
  amount: number;
  itemCount: number;
  date: string;
  reason: string;
  customerDetails: {
    name: string;
    mobile: string;
    businessName?: string;
    gstin?: string;
    address: string;
    shipToAddress?: string;
    paymentTerms?: string;
  };
}

const mockReturnInvoices: ReturnInvoice[] = [
  {
    id: '1',
    returnNumber: 'RET-2024-001',
    originalInvoiceNumber: 'INV-2024-001',
    customerName: 'Rajesh Kumar',
    customerType: 'individual',
    staffName: 'Priya Sharma',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    refundStatus: 'refunded',
    amount: 5500,
    itemCount: 1,
    date: '2024-01-16',
    reason: 'Defective product',
    customerDetails: {
      name: 'Rajesh Kumar',
      mobile: '+91 98765 43210',
      address: '123, MG Road, Bangalore, Karnataka - 560001'
    }
  },
  {
    id: '2',
    returnNumber: 'RET-2024-002',
    originalInvoiceNumber: 'INV-2024-002',
    customerName: 'TechCorp Solutions Pvt Ltd',
    customerType: 'business',
    staffName: 'Rajesh Kumar',
    staffAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    refundStatus: 'pending',
    amount: 2750,
    itemCount: 1,
    date: '2024-01-15',
    reason: 'Wrong specification',
    customerDetails: {
      name: 'Amit Singh',
      mobile: '+91 87654 32109',
      businessName: 'TechCorp Solutions Pvt Ltd',
      gstin: '29ABCDE1234F2Z6',
      address: '456, Electronic City, Phase 2, Bangalore, Karnataka - 560100',
      shipToAddress: '789, Whitefield, ITPL Road, Bangalore, Karnataka - 560066',
      paymentTerms: 'Net 30 Days'
    }
  },
  {
    id: '3',
    returnNumber: 'RET-2024-003',
    originalInvoiceNumber: 'INV-2024-003',
    customerName: 'Sunita Devi',
    customerType: 'individual',
    staffName: 'Priya Sharma',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    refundStatus: 'partially_refunded',
    amount: 8300,
    itemCount: 2,
    date: '2024-01-14',
    reason: 'Customer changed mind',
    customerDetails: {
      name: 'Sunita Devi',
      mobile: '+91 76543 21098',
      address: '321, Jayanagar, 4th Block, Bangalore, Karnataka - 560011'
    }
  },
  {
    id: '4',
    returnNumber: 'RET-2024-004',
    originalInvoiceNumber: 'INV-2024-004',
    customerName: 'Global Enterprises Ltd',
    customerType: 'business',
    staffName: 'Amit Singh',
    staffAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    refundStatus: 'refunded',
    amount: 4200,
    itemCount: 1,
    date: '2024-01-13',
    reason: 'Damaged during shipping',
    customerDetails: {
      name: 'Vikram Patel',
      mobile: '+91 99887 76655',
      businessName: 'Global Enterprises Ltd',
      gstin: '27FGHIJ5678K3L9',
      address: '567, Bandra West, Mumbai, Maharashtra - 400050',
      shipToAddress: '567, Bandra West, Mumbai, Maharashtra - 400050',
      paymentTerms: 'Net 15 Days'
    }
  },
];

export default function ReturnsScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredReturns, setFilteredReturns] = useState(mockReturnInvoices);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Use debounced navigation for FAB button
  const debouncedNavigate = useDebounceNavigation(500);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredReturns(mockReturnInvoices);
    } else {
      const filtered = mockReturnInvoices.filter(returnInvoice =>
        returnInvoice.returnNumber.toLowerCase().includes(query.toLowerCase()) ||
        returnInvoice.originalInvoiceNumber.toLowerCase().includes(query.toLowerCase()) ||
        returnInvoice.customerName.toLowerCase().includes(query.toLowerCase()) ||
        returnInvoice.staffName.toLowerCase().includes(query.toLowerCase()) ||
        returnInvoice.reason.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredReturns(filtered);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'refunded':
        return Colors.success;
      case 'partially_refunded':
        return Colors.warning;
      case 'pending':
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'refunded':
        return 'Refunded';
      case 'partially_refunded':
        return 'Partially Refunded';
      case 'pending':
        return 'Pending';
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

  const handleReturnAction = (action: string, returnId: string) => {
    console.log(`${action} action for return ${returnId}`);
    // Implement action logic here
  };

  const handleNewReturn = () => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate('/new-return');
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const handleFilter = () => {
    console.log('Filter pressed');
    // Open filter modal
  };

  // Calculate summary data
  const getSummaryData = () => {
    const totalReturns = mockReturnInvoices.length;
    const totalItems = mockReturnInvoices.reduce((sum, returnItem) => sum + returnItem.itemCount, 0);
    const totalAmount = mockReturnInvoices.reduce((sum, returnItem) => sum + returnItem.amount, 0);

    return {
      totalReturns,
      totalItems,
      totalAmount
    };
  };

  const renderReturnCard = (returnInvoice: ReturnInvoice) => {
    return (
      <TouchableOpacity
        key={returnInvoice.id}
        style={styles.returnCard}
        onPress={() => router.push({
          pathname: '/return-details',
          params: {
            returnId: returnInvoice.id,
            returnData: JSON.stringify(returnInvoice)
          }
        })}
        activeOpacity={0.7}
      >
        {/* Top Section */}
        <View style={styles.returnHeader}>
          {/* Left Side - Return Info */}
          <View style={styles.returnLeft}>
            <Text style={styles.returnNumber}>{returnInvoice.returnNumber}</Text>
            <Text style={styles.originalInvoice}>
              Original: {returnInvoice.originalInvoiceNumber}
            </Text>
            <Text style={styles.customerName}>{returnInvoice.customerName}</Text>
            <View style={styles.staffInfo}>
              <Image 
                source={{ uri: returnInvoice.staffAvatar }}
                style={styles.staffAvatar}
              />
              <Text style={styles.staffName}>{returnInvoice.staffName}</Text>
            </View>
          </View>

          {/* Right Side - Status and Amount */}
          <View style={styles.returnRight}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${getStatusColor(returnInvoice.refundStatus)}20` }
            ]}>
              <Text style={[
                styles.statusText,
                { color: getStatusColor(returnInvoice.refundStatus) }
              ]}>
                {getStatusText(returnInvoice.refundStatus)}
              </Text>
            </View>
            <Text style={styles.returnAmount}>
              {formatAmount(returnInvoice.amount)}
            </Text>
            <Text style={styles.itemCount}>
              {returnInvoice.itemCount} {returnInvoice.itemCount === 1 ? 'item' : 'items'}
            </Text>
          </View>
        </View>

        {/* Return Reason */}
        <View style={styles.reasonSection}>
          <Text style={styles.reasonLabel}>Reason:</Text>
          <Text style={styles.reasonText}>{returnInvoice.reason}</Text>
        </View>

        {/* Bottom Section */}
        <View style={styles.returnFooter}>
          {/* Left Side - Date */}
          <Text style={styles.returnDate}>
            {formatDate(returnInvoice.date)}
          </Text>

          {/* Right Side - Action Icons */}
          <View style={styles.actionIcons}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReturnAction('download', returnInvoice.id)}
              activeOpacity={0.7}
            >
              <Download size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReturnAction('share', returnInvoice.id)}
              activeOpacity={0.7}
            >
              <Share size={18} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleReturnAction('view', returnInvoice.id)}
              activeOpacity={0.7}
            >
              <Eye size={18} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

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
        
        <Text style={styles.headerTitle}>Return Invoices</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredReturns.length} returns
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <RotateCcw size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Returns</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {getSummaryData().totalReturns}
            </Text>
            <Text style={styles.summaryCount}>
              returns
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Package size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Items</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {getSummaryData().totalItems}
            </Text>
            <Text style={styles.summaryCount}>
              items
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <FileText size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {formatAmount(getSummaryData().totalAmount)}
            </Text>
            <Text style={styles.summaryCount}>
              amount
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
            placeholder="Search returns..."
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

      {/* Returns List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredReturns.length === 0 ? (
          <View style={styles.emptyState}>
            <RotateCcw size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Returns Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No returns match your search criteria' : 'No return invoices yet'}
            </Text>
          </View>
        ) : (
          filteredReturns.map(renderReturnCard)
        )}
      </ScrollView>

      {/* New Return FAB */}
      <TouchableOpacity
        style={[styles.newReturnFAB, isNavigating && styles.fabDisabled]}
        onPress={handleNewReturn}
        activeOpacity={0.8}
        disabled={isNavigating}
      >
        <RotateCcw size={20} color="#ffffff" />
        <Text style={styles.newReturnText}>New Return</Text>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingTop: 8,
    paddingBottom: 120,
  },
  // Summary Cards Styles
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
  returnCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  returnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  returnLeft: {
    flex: 1,
    marginRight: 16,
  },
  returnNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  originalInvoice: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    marginBottom: 4,
  },
  customerName: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  staffAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
    marginRight: 6,
  },
  staffName: {
    fontSize: 12,
    color: Colors.textLight,
  },
  returnRight: {
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
  returnAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 2,
  },
  itemCount: {
    fontSize: 12,
    color: Colors.textLight,
  },
  reasonSection: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '600',
    marginRight: 8,
  },
  reasonText: {
    fontSize: 12,
    color: Colors.text,
    flex: 1,
  },
  returnFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  returnDate: {
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
  newReturnFAB: {
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
  newReturnText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(63, 102, 172, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
    // Glassmorphism effect
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.2)',
  },
  // Search Results Styles
  searchResultsContainer: {
    paddingVertical: 8,
  },
  searchResultItem: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  searchResultContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  searchResultTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    marginRight: 12,
  },
  searchResultSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
    marginRight: 12,
  },
  searchResultAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  noSearchResults: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  noSearchResultsText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  inlineSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    // No background - completely transparent
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
    padding: 0,
    fontWeight: '500',
    // Better contrast for glassmorphism
    textShadowColor: 'rgba(0, 0, 0, 0.1)',
    textShadowOffset: { width: 0, height: 1 },
    textShadowRadius: 2,
  },
  fabDisabled: {
    opacity: 0.6,
  },
});