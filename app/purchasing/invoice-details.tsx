import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Download, Share, Eye, Building2, Calendar, Banknote, Smartphone, CreditCard, IndianRupee, Package, Truck, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle } from 'lucide-react-native';

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

export default function InvoiceDetailsScreen() {
  const { invoiceId } = useLocalSearchParams();

  // Mock invoice data - in real app, fetch based on invoiceId
  const invoice = {
    id: invoiceId,
    poNumber: 'PO-2024-001',
    invoiceNumber: 'PINV-2024-001',
    supplierName: 'Apple India Pvt Ltd',
    supplierType: 'business',
    businessName: 'Apple India Pvt Ltd',
    gstin: '29ABCDE1234F2Z6',
    address: 'Apple Park, 1 Infinite Loop, Cupertino, CA 95014',
    staffName: 'Rajesh Kumar',
    staffAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'received',
    paymentStatus: 'paid',
    paymentMethod: 'bank_transfer',
    amount: 850000,
    itemCount: 10,
    date: '2024-01-15',
    expectedDelivery: '2024-01-20',
    actualDelivery: '2024-01-19',
    supplierAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    items: [
      { id: '1', name: 'iPhone 15 Pro', quantity: 5, price: 85000, total: 425000, hsn: '8517', gstRate: 18, cgst: 38250, sgst: 38250, igst: 0 },
      { id: '2', name: 'iPhone 15', quantity: 3, price: 75000, total: 225000, hsn: '8517', gstRate: 18, cgst: 20250, sgst: 20250, igst: 0 },
      { id: '3', name: 'AirPods Pro', quantity: 2, price: 25000, total: 50000, hsn: '8518', gstRate: 18, cgst: 4500, sgst: 4500, igst: 0 },
    ],
    buyerGstin: '27BUYER1234G5Z6',
    buyerName: 'Tech Solutions Pvt Ltd',
    buyerAddress: '123 Business Park, Mumbai, Maharashtra 400001',
    placeOfSupply: 'Maharashtra',
    reverseCharge: 'No',
    totalTaxableValue: 700000,
    totalCgst: 63000,
    totalSgst: 63000,
    totalIgst: 0,
    totalCess: 0,
    grandTotal: 850000,
    amountInWords: 'Eight Lakh Fifty Thousand Rupees Only'
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
      case 'paid':
        return Colors.success;
      case 'pending':
        return Colors.warning;
      case 'partial':
      case 'overdue':
        return Colors.error;
      case 'cancelled':
        return Colors.textLight;
      default:
        return Colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received': return 'Received';
      case 'pending': return 'Pending';
      case 'partial': return 'Partial';
      case 'cancelled': return 'Cancelled';
      case 'paid': return 'Paid';
      case 'overdue': return 'Overdue';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
      case 'paid':
        return <CheckCircle size={20} color={Colors.success} />;
      case 'pending':
        return <Clock size={20} color={Colors.warning} />;
      case 'partial':
      case 'overdue':
        return <AlertTriangle size={20} color={Colors.error} />;
      case 'cancelled':
        return <Package size={20} color={Colors.textLight} />;
      default:
        return <Package size={20} color={Colors.textLight} />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote size={20} color={Colors.success} />;
      case 'upi':
        return <Smartphone size={20} color={Colors.primary} />;
      case 'card':
        return <CreditCard size={20} color={Colors.warning} />;
      case 'bank_transfer':
        return <Building2 size={20} color={Colors.primary} />;
      default:
        return <Banknote size={20} color={Colors.textLight} />;
    }
  };

  const formatAmount = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Tax Invoice</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
              <Download size={20} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} activeOpacity={0.7}>
              <Share size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Invoice Header */}
          <View style={styles.invoiceHeader}>
            <View style={styles.invoiceInfo}>
              <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
              <Text style={styles.poNumber}>PO: {invoice.poNumber}</Text>
              <Text style={styles.invoiceDate}>Date: {formatDate(invoice.date)}</Text>
            </View>
            <View style={styles.statusContainer}>
              {getStatusIcon(invoice.status)}
              <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
                {getStatusText(invoice.status)}
              </Text>
            </View>
          </View>

          {/* Supplier & Buyer Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supplier & Buyer Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Supplier</Text>
                <Text style={styles.detailCardName}>{invoice.supplierName}</Text>
                <Text style={styles.detailCardGstin}>GSTIN: {invoice.gstin}</Text>
                <Text style={styles.detailCardAddress}>{invoice.address}</Text>
              </View>
              <View style={styles.detailCard}>
                <Text style={styles.detailCardTitle}>Buyer</Text>
                <Text style={styles.detailCardName}>{invoice.buyerName}</Text>
                <Text style={styles.detailCardGstin}>GSTIN: {invoice.buyerGstin}</Text>
                <Text style={styles.detailCardAddress}>{invoice.buyerAddress}</Text>
              </View>
            </View>
          </View>

          {/* Invoice Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.invoiceDetailsGrid}>
              <View style={styles.invoiceDetailItem}>
                <Text style={styles.invoiceDetailLabel}>Place of Supply</Text>
                <Text style={styles.invoiceDetailValue}>{invoice.placeOfSupply}</Text>
              </View>
              <View style={styles.invoiceDetailItem}>
                <Text style={styles.invoiceDetailLabel}>Reverse Charge</Text>
                <Text style={styles.invoiceDetailValue}>{invoice.reverseCharge}</Text>
              </View>
            </View>
          </View>

          {/* Items Table */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items</Text>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderCell, styles.itemNameCell]}>Item</Text>
              <Text style={[styles.tableHeaderCell, styles.hsnCell]}>HSN</Text>
              <Text style={[styles.tableHeaderCell, styles.qtyCell]}>Qty</Text>
              <Text style={[styles.tableHeaderCell, styles.rateCell]}>Rate</Text>
              <Text style={[styles.tableHeaderCell, styles.amountCell]}>Amount</Text>
            </View>
            {invoice.items.map((item, index) => (
              <View key={item.id} style={styles.tableRow}>
                <Text style={[styles.tableCell, styles.itemNameCell]}>{item.name}</Text>
                <Text style={[styles.tableCell, styles.hsnCell]}>{item.hsn}</Text>
                <Text style={[styles.tableCell, styles.qtyCell]}>{item.quantity}</Text>
                <Text style={[styles.tableCell, styles.rateCell]}>{formatAmount(item.price)}</Text>
                <Text style={[styles.tableCell, styles.amountCell]}>{formatAmount(item.total)}</Text>
              </View>
            ))}
          </View>

          {/* Tax Breakdown */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tax Breakdown</Text>
            <View style={styles.taxTable}>
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>Taxable Value</Text>
                <Text style={styles.taxValue}>{formatAmount(invoice.totalTaxableValue)}</Text>
              </View>
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>CGST</Text>
                <Text style={styles.taxValue}>{formatAmount(invoice.totalCgst)}</Text>
              </View>
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>SGST</Text>
                <Text style={styles.taxValue}>{formatAmount(invoice.totalSgst)}</Text>
              </View>
              <View style={styles.taxRow}>
                <Text style={styles.taxLabel}>IGST</Text>
                <Text style={styles.taxValue}>{formatAmount(invoice.totalIgst)}</Text>
              </View>
              {invoice.totalCess > 0 && (
                <View style={styles.taxRow}>
                  <Text style={styles.taxLabel}>CESS</Text>
                  <Text style={styles.taxValue}>{formatAmount(invoice.totalCess)}</Text>
                </View>
              )}
              <View style={[styles.taxRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Grand Total</Text>
                <Text style={styles.grandTotalValue}>{formatAmount(invoice.grandTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Amount in Words */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amount in Words</Text>
            <View style={styles.amountInWordsCard}>
              <Text style={styles.amountInWordsText}>{invoice.amountInWords}</Text>
            </View>
          </View>

          {/* Payment Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Information</Text>
            <View style={styles.paymentCard}>
              <View style={styles.paymentRow}>
                {getPaymentMethodIcon(invoice.paymentMethod)}
                <Text style={styles.paymentMethod}>
                  {invoice.paymentMethod === 'bank_transfer' ? 'Bank Transfer' :
                   invoice.paymentMethod === 'cash' ? 'Cash' :
                   invoice.paymentMethod === 'upi' ? 'UPI' : 'Card'}
                </Text>
              </View>
              <View style={styles.paymentStatusRow}>
                <Text style={styles.paymentStatusLabel}>Status:</Text>
                <Text style={[styles.paymentStatus, { color: getStatusColor(invoice.paymentStatus) }]}>
                  {getStatusText(invoice.paymentStatus)}
                </Text>
              </View>
            </View>
          </View>

          {/* Staff Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ordered By</Text>
            <View style={styles.staffCard}>
              <Image source={{ uri: invoice.staffAvatar }} style={styles.staffAvatar} />
              <View style={styles.staffDetails}>
                <Text style={styles.staffName}>{invoice.staffName}</Text>
                <Text style={styles.staffRole}>Purchase Manager</Text>
              </View>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  invoiceInfo: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  poNumber: {
    fontSize: 16,
    color: Colors.textLight,
    marginBottom: 4,
  },
  invoiceDate: {
    fontSize: 14,
    color: Colors.textLight,
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  detailsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  detailCard: {
    flex: 1,
    backgroundColor: Colors.grey[50],
    padding: 16,
    borderRadius: 12,
  },
  detailCardTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  detailCardName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  detailCardGstin: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  detailCardAddress: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 16,
  },
  invoiceDetailsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  invoiceDetailItem: {
    flex: 1,
    backgroundColor: Colors.grey[50],
    padding: 12,
    borderRadius: 8,
  },
  invoiceDetailLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  invoiceDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    paddingVertical: 12,
    paddingHorizontal: 8,
    borderRadius: 8,
    marginBottom: 8,
  },
  tableHeaderCell: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8,
    paddingHorizontal: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  tableCell: {
    fontSize: 12,
    color: Colors.text,
  },
  itemNameCell: {
    flex: 2,
  },
  hsnCell: {
    flex: 1,
  },
  qtyCell: {
    flex: 0.5,
    textAlign: 'center',
  },
  rateCell: {
    flex: 1,
    textAlign: 'right',
  },
  amountCell: {
    flex: 1,
    textAlign: 'right',
  },
  taxTable: {
    backgroundColor: Colors.grey[50],
    padding: 16,
    borderRadius: 12,
    gap: 8,
  },
  taxRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  taxLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  taxValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 8,
    marginTop: 8,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  grandTotalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  amountInWordsCard: {
    backgroundColor: Colors.grey[50],
    padding: 16,
    borderRadius: 12,
  },
  amountInWordsText: {
    fontSize: 14,
    color: Colors.text,
    fontStyle: 'italic',
  },
  paymentCard: {
    backgroundColor: Colors.grey[50],
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentMethod: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  paymentStatusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  paymentStatusLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  paymentStatus: {
    fontSize: 14,
    fontWeight: '600',
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  staffRole: {
    fontSize: 14,
    color: Colors.textLight,
  },
}); 