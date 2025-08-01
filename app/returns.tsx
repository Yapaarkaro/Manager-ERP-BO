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
  RotateCcw,
  Plus,
  FileText
} from 'lucide-react-native';

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
    router.push('/new-return');
  };

  const handleFilter = () => {
    console.log('Filter pressed');
    // Open filter modal
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
        style={styles.newReturnFAB}
        onPress={handleNewReturn}
        activeOpacity={0.8}
      >
        <RotateCcw size={20} color="#ffffff" />
        <Text style={styles.newReturnText}>New Return</Text>
      </TouchableOpacity>

      {/* Bottom Section with Search */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
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
    bottom: 90,
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