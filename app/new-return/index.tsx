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
  Scan,
  RotateCcw,
  FileText,
  Calendar,
  User,
  Building2
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
  customerDetails: {
    name: string;
    mobile: string;
    businessName?: string;
    gstin?: string;
    address: string;
    shipToAddress?: string;
    paymentTerms?: string;
  };
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    rate: number;
    amount: number;
    taxRate: number;
    taxAmount: number;
    total: number;
  }>;
}

// Mock recent invoices for return processing
const recentInvoices: Invoice[] = [
  {
    id: '1',
    invoiceNumber: 'INV-2024-001',
    customerName: 'Rajesh Kumar',
    customerType: 'individual',
    staffName: 'Priya Sharma',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'cash',
    amount: 155000,
    itemCount: 3,
    date: '2024-01-15',
    customerDetails: {
      name: 'Rajesh Kumar',
      mobile: '+91 98765 43210',
      address: '123, MG Road, Bangalore, Karnataka - 560001'
    },
    items: [
      {
        id: '1',
        name: 'iPhone 14 Pro 128GB',
        quantity: 1,
        rate: 129900,
        amount: 129900,
        taxRate: 18,
        taxAmount: 23382,
        total: 153282
      },
      {
        id: '2',
        name: 'AirPods Pro 2nd Gen',
        quantity: 1,
        rate: 24900,
        amount: 24900,
        taxRate: 18,
        taxAmount: 4482,
        total: 29382
      }
    ]
  },
  {
    id: '2',
    invoiceNumber: 'INV-2024-002',
    customerName: 'TechCorp Solutions Pvt Ltd',
    customerType: 'business',
    staffName: 'Rajesh Kumar',
    staffAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'upi',
    amount: 87500,
    itemCount: 2,
    date: '2024-01-14',
    customerDetails: {
      name: 'Amit Singh',
      mobile: '+91 87654 32109',
      businessName: 'TechCorp Solutions Pvt Ltd',
      gstin: '29ABCDE1234F2Z6',
      address: '456, Electronic City, Phase 2, Bangalore, Karnataka - 560100',
      shipToAddress: '789, Whitefield, ITPL Road, Bangalore, Karnataka - 560066',
      paymentTerms: 'Net 30 Days'
    },
    items: [
      {
        id: '1',
        name: 'MacBook Air M2',
        quantity: 1,
        rate: 114900,
        amount: 114900,
        taxRate: 18,
        taxAmount: 20682,
        total: 135582
      },
      {
        id: '2',
        name: 'Magic Mouse',
        quantity: 2,
        rate: 7900,
        amount: 15800,
        taxRate: 18,
        taxAmount: 2844,
        total: 18644
      }
    ]
  },
  {
    id: '3',
    invoiceNumber: 'INV-2024-003',
    customerName: 'Sunita Devi',
    customerType: 'individual',
    staffName: 'Priya Sharma',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'card',
    amount: 223000,
    itemCount: 5,
    date: '2024-01-13',
    customerDetails: {
      name: 'Sunita Devi',
      mobile: '+91 76543 21098',
      address: '321, Jayanagar, 4th Block, Bangalore, Karnataka - 560011'
    },
    items: [
      {
        id: '1',
        name: 'Samsung Galaxy S23 Ultra',
        quantity: 1,
        rate: 124999,
        amount: 124999,
        taxRate: 18,
        taxAmount: 22499,
        total: 147498
      },
      {
        id: '2',
        name: 'Galaxy Buds Pro',
        quantity: 1,
        rate: 19999,
        amount: 19999,
        taxRate: 18,
        taxAmount: 3599,
        total: 23598
      },
      {
        id: '3',
        name: 'Wireless Charger',
        quantity: 2,
        rate: 2999,
        amount: 5998,
        taxRate: 18,
        taxAmount: 1079,
        total: 7077
      }
    ]
  },
  {
    id: '4',
    invoiceNumber: 'INV-2024-004',
    customerName: 'Global Enterprises Ltd',
    customerType: 'business',
    staffName: 'Amit Singh',
    staffAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    paymentStatus: 'paid',
    paymentMethod: 'others',
    amount: 128000,
    itemCount: 4,
    date: '2024-01-12',
    customerDetails: {
      name: 'Vikram Patel',
      mobile: '+91 99887 76655',
      businessName: 'Global Enterprises Ltd',
      gstin: '27FGHIJ5678K3L9',
      address: '567, Bandra West, Mumbai, Maharashtra - 400050',
      shipToAddress: '567, Bandra West, Mumbai, Maharashtra - 400050',
      paymentTerms: 'Net 15 Days'
    },
    items: [
      {
        id: '1',
        name: 'Dell Laptop',
        quantity: 2,
        rate: 65000,
        amount: 130000,
        taxRate: 18,
        taxAmount: 23400,
        total: 153400
      }
    ]
  },
];

export default function NewReturnScreen() {
  const [searchQuery, setSearchQuery] = useState('');

  const handleInvoiceSelect = (invoice: Invoice) => {
    router.push({
      pathname: '/new-return/select-items',
      params: {
        invoiceData: JSON.stringify(invoice)
      }
    });
  };

  const handleScanInvoice = () => {
    router.push('/new-return/scan-invoice');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
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

  const getPaymentMethodText = (method: string) => {
    switch (method) {
      case 'cash': return 'Cash';
      case 'upi': return 'UPI';
      case 'card': return 'Card';
      case 'others': return 'Others';
      default: return method;
    }
  };

  const filteredInvoices = recentInvoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.staffName.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>New Return</Text>
          
          <View style={styles.headerRight}>
            <RotateCcw size={24} color={Colors.error} />
          </View>
        </View>
      </SafeAreaView>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <Text style={styles.instructionsTitle}>Select Invoice to Return</Text>
        <Text style={styles.instructionsText}>
          Choose the original invoice for which you want to process a return
        </Text>
      </View>

      {/* Recent Invoices */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recent Paid Invoices</Text>
          <Text style={styles.sectionSubtitle}>
            Only paid invoices are eligible for returns
          </Text>
        </View>

        <View style={styles.invoicesContainer}>
          {filteredInvoices.map((invoice) => (
            <TouchableOpacity
              key={invoice.id}
              style={styles.invoiceCard}
              onPress={() => handleInvoiceSelect(invoice)}
              activeOpacity={0.7}
            >
              {/* Invoice Header */}
              <View style={styles.invoiceHeader}>
                <View style={styles.invoiceLeft}>
                  <View style={styles.invoiceIconContainer}>
                    <FileText size={20} color={Colors.primary} />
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

                <View style={styles.invoiceRight}>
                  <Text style={styles.invoiceAmount}>
                    {formatAmount(invoice.amount)}
                  </Text>
                  <Text style={styles.itemCount}>
                    {invoice.itemCount} {invoice.itemCount === 1 ? 'item' : 'items'}
                  </Text>
                </View>
              </View>

              {/* Invoice Details */}
              <View style={styles.invoiceDetails}>
                <View style={styles.detailRow}>
                  <Calendar size={14} color={Colors.textLight} />
                  <Text style={styles.detailText}>
                    {formatDate(invoice.date)}
                  </Text>
                </View>

                <View style={styles.detailRow}>
                  <Text style={styles.paymentMethodLabel}>
                    Paid via {getPaymentMethodText(invoice.paymentMethod)}
                  </Text>
                </View>

                <View style={styles.staffInfo}>
                  <Image 
                    source={{ uri: invoice.staffAvatar }}
                    style={styles.staffAvatar}
                  />
                  <Text style={styles.staffName}>Processed by {invoice.staffName}</Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {filteredInvoices.length === 0 && (
          <View style={styles.emptyState}>
            <FileText size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Invoices Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No invoices match your search criteria' : 'No recent paid invoices available for returns'}
            </Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom Section with Search and Scan */}
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
          </View>
          
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScanInvoice}
            activeOpacity={0.7}
          >
            <Scan size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSafeArea: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
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
  instructionsContainer: {
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
    marginBottom: 4,
  },
  instructionsText: {
    fontSize: 14,
    color: '#b91c1c',
    lineHeight: 20,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
  },
  invoicesContainer: {
    gap: 12,
  },
  invoiceCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
    borderLeftColor: Colors.success,
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
  invoiceIconContainer: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f0f4ff',
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
    color: Colors.success,
    marginBottom: 4,
  },
  itemCount: {
    fontSize: 12,
    color: Colors.textLight,
  },
  invoiceDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  detailText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  paymentMethodLabel: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  staffInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 4,
  },
  staffAvatar: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  staffName: {
    fontSize: 12,
    color: Colors.textLight,
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 12,
  },
  searchBar: {
    flex: 1,
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
    outlineStyle: 'none',
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
});