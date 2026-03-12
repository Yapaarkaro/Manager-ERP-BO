import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWebBackNavigation } from '@/hooks/useWebBackNavigation';
import { safeRouter } from '@/utils/safeRouter';
import { getInvoices, getInvoiceWithItems, getPurchaseInvoices } from '@/services/backendApi';
import { 
  ArrowLeft, 
  Search, 
  Scan,
  RotateCcw,
  FileText,
  Calendar,
  User,
  Building2,
  Truck
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
  paymentStatus: string;
  paymentMethod: string;
  amount: number;
  itemCount: number;
  date: string;
  customerDetails: {
    name: string;
    mobile: string;
    businessName?: string;
    gstin?: string;
    address: string;
  };
  items: any[];
  supplierId?: string;
  supplierName?: string;
}

export default function NewReturnScreen() {
  const { handleBack } = useWebBackNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingInvoiceId, setLoadingInvoiceId] = useState<string | null>(null);
  const [returnType, setReturnType] = useState<'customer' | 'supplier'>('customer');

  const loadInvoices = useCallback(async () => {
    setLoading(true);
    try {
      if (returnType === 'customer') {
        const result = await getInvoices();
        if (result.success && result.invoices) {
          const mapped: Invoice[] = result.invoices.map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoice_number || '',
            customerName: inv.customer_name || 'Walk-in Customer',
            customerType: inv.customer_type || 'individual',
            staffName: inv.staff_name || '',
            paymentStatus: inv.payment_status || 'unpaid',
            paymentMethod: inv.payment_method || 'cash',
            amount: parseFloat(inv.total_amount) || 0,
            itemCount: 0,
            date: inv.invoice_date || inv.created_at || '',
            customerDetails: {
              name: inv.customer_name || '',
              mobile: '',
              address: '',
            },
            items: [],
          }));
          setInvoices(mapped);
        }
      } else {
        const result = await getPurchaseInvoices();
        if (result.success && result.invoices) {
          const mapped: Invoice[] = result.invoices.map((inv: any) => ({
            id: inv.id,
            invoiceNumber: inv.invoice_number || inv.purchase_invoice_number || '',
            customerName: inv.supplier_name || 'Unknown Supplier',
            customerType: 'business' as const,
            staffName: inv.staff_name || '',
            paymentStatus: inv.payment_status || 'unpaid',
            paymentMethod: inv.payment_method || 'bank_transfer',
            amount: parseFloat(inv.total_amount) || 0,
            itemCount: inv.items?.length || 0,
            date: inv.invoice_date || inv.created_at || '',
            customerDetails: {
              name: inv.supplier_name || '',
              mobile: '',
              address: '',
            },
            items: inv.items || [],
            supplierId: inv.supplier_id,
            supplierName: inv.supplier_name,
          }));
          setInvoices(mapped);
        }
      }
    } catch (e) {
      console.warn('Failed to load invoices:', e);
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [returnType]);

  useEffect(() => {
    loadInvoices();
  }, [loadInvoices]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadInvoices();
  }, [loadInvoices]);

  const handleInvoiceSelect = async (invoice: Invoice) => {
    const { canPerformAction } = require('@/utils/trialUtils');
    if (!canPerformAction('process return')) return;

    setLoadingInvoiceId(invoice.id);
    try {
      let items: any[] = [];

      if (returnType === 'customer') {
        const result = await getInvoiceWithItems(invoice.id);
        if (result.success && result.items && result.items.length > 0) {
          items = result.items.map((item: any) => ({
            id: item.id,
            productId: item.product_id || item.productId || item.id,
            name: item.product_name || item.name || '',
            quantity: parseFloat(item.quantity) || 0,
            rate: parseFloat(item.unit_price) || 0,
            amount: (parseFloat(item.unit_price) || 0) * (parseFloat(item.quantity) || 0),
            taxRate: parseFloat(item.tax_rate) || 0,
            taxAmount: parseFloat(item.tax_amount) || 0,
            total: parseFloat(item.total_price) || 0,
          }));
        }
      } else {
        if (invoice.items && invoice.items.length > 0) {
          items = invoice.items.map((item: any, idx: number) => ({
            id: item.id || `pi-item-${idx}`,
            productId: item.product_id || item.productId || item.id,
            name: item.product_name || item.name || '',
            quantity: parseFloat(item.quantity) || 0,
            rate: parseFloat(item.unit_price || item.rate) || 0,
            amount: (parseFloat(item.unit_price || item.rate) || 0) * (parseFloat(item.quantity) || 0),
            taxRate: parseFloat(item.tax_rate || item.taxRate) || 0,
            taxAmount: parseFloat(item.tax_amount || item.taxAmount) || 0,
            total: parseFloat(item.total_price || item.total) || 0,
          }));
        }
      }

      const invoiceWithItems = {
        ...invoice,
        items,
        itemCount: items.length,
        returnType,
        supplierId: (invoice as any).supplierId || '',
        supplierName: (invoice as any).supplierName || invoice.customerName,
      };

      safeRouter.push({
        pathname: '/new-return/select-items',
        params: { invoiceData: JSON.stringify(invoiceWithItems) }
      });
    } catch (e) {
      console.warn('Failed to fetch invoice items:', e);
    } finally {
      setLoadingInvoiceId(null);
    }
  };

  const handleScanInvoice = () => {
    const { canPerformAction } = require('@/utils/trialUtils');
    if (!canPerformAction('scan invoice for return')) return;
    safeRouter.push('/new-return/scan-invoice');
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

  const getPaymentStatusColor = (status: string) => {
    switch (status) {
      case 'paid': return Colors.success;
      case 'partial': case 'partially_paid': return Colors.warning;
      default: return Colors.error;
    }
  };

  const getPaymentStatusText = (status: string) => {
    switch (status) {
      case 'paid': return 'Paid';
      case 'partial': case 'partially_paid': return 'Partial';
      case 'unpaid': return 'Unpaid';
      default: return status;
    }
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

  const filteredInvoices = invoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.customerName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (invoice.staffName || '').toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>New Return</Text>
        
        <View style={styles.headerRight}>
          <RotateCcw size={24} color={Colors.error} />
        </View>
      </View>

      {/* Return Type Toggle */}
      <View style={styles.returnTypeContainer}>
        <TouchableOpacity
          style={[styles.returnTypeBtn, returnType === 'customer' && styles.returnTypeBtnActive]}
          onPress={() => setReturnType('customer')}
          activeOpacity={0.7}
        >
          <RotateCcw size={16} color={returnType === 'customer' ? '#fff' : Colors.text} />
          <Text style={[styles.returnTypeBtnText, returnType === 'customer' && styles.returnTypeBtnTextActive]}>
            Customer Return
          </Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.returnTypeBtn, returnType === 'supplier' && styles.returnTypeBtnActive, returnType === 'supplier' && { backgroundColor: '#D97706' }]}
          onPress={() => setReturnType('supplier')}
          activeOpacity={0.7}
        >
          <Truck size={16} color={returnType === 'supplier' ? '#fff' : Colors.text} />
          <Text style={[styles.returnTypeBtnText, returnType === 'supplier' && styles.returnTypeBtnTextActive]}>
            Return to Supplier
          </Text>
        </TouchableOpacity>
      </View>

      {/* Instructions */}
      <View style={[styles.instructionsContainer, returnType === 'supplier' && { backgroundColor: '#FFFBEB', borderBottomColor: '#FDE68A' }]}>
        <Text style={[styles.instructionsTitle, returnType === 'supplier' && { color: '#D97706' }]}>
          {returnType === 'customer' ? 'Select Invoice to Return' : 'Select Purchase Invoice'}
        </Text>
        <Text style={[styles.instructionsText, returnType === 'supplier' && { color: '#92400E' }]}>
          {returnType === 'customer'
            ? 'Choose the original sales invoice for which you want to process a return. For unpaid invoices, the return amount will be deducted from receivables.'
            : 'Choose the purchase invoice for items you want to return to the supplier. The return amount will be adjusted in payables.'}
        </Text>
      </View>

      {/* Search Bar and Scanner - Top of screen */}
      <View style={styles.topSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.primary} />
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

      {/* Recent Invoices */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>{returnType === 'customer' ? 'Sales Invoices' : 'Purchase Invoices'}</Text>
          <Text style={styles.sectionSubtitle}>
            {returnType === 'customer' ? 'Select an invoice to process a return' : 'Select a purchase invoice to return items to supplier'}
          </Text>
        </View>

        {loading ? (
          <View style={styles.emptyState}>
            <ActivityIndicator size="large" color={Colors.primary} />
            <Text style={[styles.emptyStateText, { marginTop: 16 }]}>Loading invoices...</Text>
          </View>
        ) : (
          <View style={styles.invoicesContainer}>
            {filteredInvoices.map((invoice) => (
              <TouchableOpacity
                key={invoice.id}
                style={[styles.invoiceCard, { borderLeftColor: getPaymentStatusColor(invoice.paymentStatus) }]}
                onPress={() => handleInvoiceSelect(invoice)}
                activeOpacity={0.7}
                disabled={loadingInvoiceId === invoice.id}
              >
                {/* Invoice Header */}
                <View style={styles.invoiceHeader}>
                  <View style={styles.invoiceLeft}>
                    <View style={styles.invoiceIconContainer}>
                      {loadingInvoiceId === invoice.id ? (
                        <ActivityIndicator size="small" color={Colors.primary} />
                      ) : (
                        <FileText size={20} color={Colors.primary} />
                      )}
                    </View>
                    <View style={styles.invoiceInfo}>
                      <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                      <View style={styles.customerInfo}>
                        {returnType === 'supplier' ? (
                          <Truck size={14} color={Colors.textLight} />
                        ) : invoice.customerType === 'business' ? (
                          <Building2 size={14} color={Colors.textLight} />
                        ) : (
                          <User size={14} color={Colors.textLight} />
                        )}
                        <Text style={styles.customerName}>{invoice.customerName}</Text>
                      </View>
                    </View>
                  </View>

                  <View style={styles.invoiceRight}>
                    <Text style={[styles.invoiceAmount, { color: getPaymentStatusColor(invoice.paymentStatus) }]}>
                      {formatAmount(invoice.amount)}
                    </Text>
                    <Text style={[styles.paymentStatusBadge, { 
                      color: getPaymentStatusColor(invoice.paymentStatus),
                      backgroundColor: `${getPaymentStatusColor(invoice.paymentStatus)}15`,
                    }]}>
                      {getPaymentStatusText(invoice.paymentStatus)}
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

                  {invoice.staffName ? (
                    <View style={styles.detailRow}>
                      <User size={14} color={Colors.textLight} />
                      <Text style={styles.detailText}>by {invoice.staffName}</Text>
                    </View>
                  ) : null}
                </View>
              </TouchableOpacity>
            ))}
          </View>
        )}

        {!loading && filteredInvoices.length === 0 && (
          <View style={styles.emptyState}>
            <FileText size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Invoices Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No invoices match your search criteria' : returnType === 'customer' ? 'No sales invoices available for returns' : 'No purchase invoices available for returns'}
            </Text>
          </View>
        )}
      </ScrollView>
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
  },
  headerRight: {
    alignItems: 'flex-end',
    marginLeft: 'auto',
  },
  returnTypeContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 10,
    backgroundColor: Colors.grey[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  returnTypeBtn: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderRadius: 10,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  returnTypeBtnActive: {
    backgroundColor: Colors.error,
    borderColor: Colors.error,
  },
  returnTypeBtnText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  returnTypeBtnTextActive: {
    color: '#FFFFFF',
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
    paddingBottom: 20,
  },
  // Top search container styles
  topSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
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
  paymentStatusBadge: {
    fontSize: 11,
    fontWeight: '600',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    overflow: 'hidden',
    marginTop: 4,
    textAlign: 'center',
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    
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