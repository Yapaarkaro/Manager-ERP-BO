import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Download, 
  Share, 
  Printer,
  FileText,
  Calendar,
  Hash,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  Package,
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

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export default function InvoiceDetailsScreen() {
  const { invoiceId, invoiceData } = useLocalSearchParams();
  const invoice = JSON.parse(invoiceData as string);
  const customer = invoice.customerDetails;
  const isBusinessCustomer = invoice.customerType === 'business';

  // Mock invoice items
  const invoiceItems: InvoiceItem[] = [
    {
      id: '1',
      name: 'iPhone 14 Pro 128GB',
      quantity: 2,
      rate: 129900,
      amount: 259800,
      taxRate: 18,
      taxAmount: 46764,
      total: 306564
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
  ];

  const subtotal = invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = invoiceItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + totalTax;

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
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

  const handleDownload = () => {
    Alert.alert('Download', 'Invoice download functionality will be implemented');
  };

  const handleShare = () => {
    Alert.alert('Share', 'Invoice sharing functionality will be implemented');
  };

  const handlePrint = () => {
    Alert.alert('Print', 'Invoice printing functionality will be implemented');
  };

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
          
          <Text style={styles.headerTitle}>Invoice Details</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleDownload}
              activeOpacity={0.7}
            >
              <Download size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Share size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handlePrint}
              activeOpacity={0.7}
            >
              <Printer size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Tax Invoice Header */}
        <View style={styles.invoiceHeader}>
          <View style={styles.taxInvoiceSection}>
            <FileText size={32} color={Colors.primary} />
            <Text style={styles.taxInvoiceTitle}>TAX INVOICE</Text>
          </View>
          
          <View style={styles.invoiceMetaInfo}>
            <View style={styles.metaRow}>
              <Hash size={16} color={Colors.textLight} />
              <Text style={styles.metaLabel}>Invoice No:</Text>
              <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
            </View>
            
            <View style={styles.metaRow}>
              <Calendar size={16} color={Colors.textLight} />
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.date)}</Text>
            </View>
          </View>
        </View>

        {/* IRN & Acknowledgment Section */}
        <View style={styles.irnSection}>
          <Text style={styles.sectionTitle}>E-Invoice Details</Text>
          
          <View style={styles.irnCard}>
            <View style={styles.irnRow}>
              <Text style={styles.irnLabel}>IRN (Invoice Reference Number):</Text>
              <Text style={styles.irnValue}>
                01234567890123456789012345678901234567890123456789012345678901234
              </Text>
            </View>
            
            <View style={styles.irnRow}>
              <Text style={styles.irnLabel}>Acknowledgment Number:</Text>
              <Text style={styles.irnValue}>112410600000685</Text>
            </View>
            
            <View style={styles.irnRow}>
              <Text style={styles.irnLabel}>Acknowledgment Date:</Text>
              <Text style={styles.irnValue}>{formatDate(invoice.date)} 14:30:25</Text>
            </View>
          </View>
        </View>

        {/* Business Details */}
        <View style={styles.businessSection}>
          <Text style={styles.sectionTitle}>Business Details</Text>
          
          <View style={styles.businessCard}>
            <View style={styles.businessHeader}>
              <Building2 size={24} color={Colors.primary} />
              <Text style={styles.businessName}>ABC Electronics Pvt Ltd</Text>
            </View>
            
            <View style={styles.businessDetails}>
              <View style={styles.businessRow}>
                <MapPin size={16} color={Colors.textLight} />
                <Text style={styles.businessText}>
                  123, Electronic City, Phase 1, Bangalore, Karnataka - 560100
                </Text>
              </View>
              
              <View style={styles.businessRow}>
                <Hash size={16} color={Colors.textLight} />
                <Text style={styles.businessText}>GSTIN: 29ABCDE1234F1Z5</Text>
              </View>
              
              <View style={styles.businessRow}>
                <Phone size={16} color={Colors.textLight} />
                <Text style={styles.businessText}>+91 80 1234 5678</Text>
              </View>
            </View>
          </View>
        </View>

        {/* Customer Details */}
        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          
          <View style={styles.customerCard}>
            <Text style={styles.customerName}>
              {isBusinessCustomer ? customer.businessName : customer.name}
            </Text>
            {isBusinessCustomer && customer.gstin && (
              <Text style={styles.customerGstin}>GSTIN: {customer.gstin}</Text>
            )}
            {!isBusinessCustomer && (
              <Text style={styles.contactPerson}>Contact: {customer.name}</Text>
            )}
            <Text style={styles.customerDetails}>
              Mobile: {customer.mobile}{'\n'}
              Address: {customer.address}
            </Text>
            {isBusinessCustomer && customer.paymentTerms && (
              <View style={styles.paymentTermsSection}>
                <Text style={styles.paymentTermsLabel}>Payment Terms:</Text>
                <Text style={styles.paymentTermsValue}>{customer.paymentTerms}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Ship To Address (only for business customers with different shipping address) */}
        {isBusinessCustomer && customer.shipToAddress && customer.shipToAddress.trim() !== '' && customer.shipToAddress !== customer.address && (
          <View style={styles.shipToSection}>
            <Text style={styles.sectionTitle}>Ship To</Text>
            
            <View style={styles.shipToCard}>
              <Text style={styles.shipToName}>
                {customer.businessName}
              </Text>
              <Text style={styles.shipToDetails}>
                Address: {customer.shipToAddress}
              </Text>
            </View>
          </View>
        )}

        {/* Invoice Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Invoice Items</Text>
          
          <View style={styles.itemsTable}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.itemNameHeader]}>Item</Text>
              <Text style={[styles.tableHeaderText, styles.qtyHeader]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.rateHeader]}>Rate</Text>
              <Text style={[styles.tableHeaderText, styles.amountHeader]}>Amount</Text>
            </View>
            
            {/* Table Rows */}
            {invoiceItems.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <View style={styles.itemNameCell}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemTax}>GST @ {item.taxRate}%</Text>
                </View>
                <Text style={[styles.tableCellText, styles.qtyCell]}>{item.quantity}</Text>
                <Text style={[styles.tableCellText, styles.rateCell]}>
                  {formatAmount(item.rate)}
                </Text>
                <Text style={[styles.tableCellText, styles.amountCell]}>
                  {formatAmount(item.total)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>CGST (9%):</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalTax / 2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>SGST (9%):</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalTax / 2)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Grand Total:</Text>
              <Text style={styles.totalValue}>{formatAmount(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Payment Status */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <CreditCard size={20} color={Colors.success} />
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentMethod}>Cash Payment</Text>
                <Text style={styles.paymentStatus}>Paid</Text>
              </View>
              <Text style={styles.paymentAmount}>{formatAmount(grandTotal)}</Text>
            </View>
            
            <View style={styles.paymentDetails}>
              <Text style={styles.paymentDetailText}>
                Payment received on {formatDate(invoice.date)} at 14:30
              </Text>
            </View>
          </View>
        </View>

        {/* Staff Information */}
        <View style={styles.staffSection}>
          <Text style={styles.sectionTitle}>Processed By</Text>
          
          <View style={styles.staffCard}>
            <Text style={styles.staffName}>{invoice.staffName}</Text>
            <Text style={styles.staffRole}>Sales Executive</Text>
          </View>
        </View>
      </ScrollView>
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
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  invoiceHeader: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  taxInvoiceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  taxInvoiceTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 12,
  },
  invoiceMetaInfo: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  irnSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  irnCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  irnRow: {
    marginBottom: 12,
  },
  irnLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  irnValue: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  businessSection: {
    marginBottom: 16,
  },
  businessCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  businessHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  businessName: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginLeft: 12,
  },
  businessDetails: {
    gap: 8,
  },
  businessRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
  },
  businessText: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
    lineHeight: 20,
  },
  customerSection: {
    marginBottom: 16,
  },
  customerCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  customerName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  customerGstin: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
    fontFamily: 'monospace',
  },
  contactPerson: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  customerDetails: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  paymentTermsSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  paymentTermsLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginRight: 8,
  },
  paymentTermsValue: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3f66ac',
  },
  shipToSection: {
    marginBottom: 16,
  },
  shipToCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  shipToName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  shipToDetails: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  itemsSection: {
    marginBottom: 16,
  },
  itemsTable: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
  itemNameHeader: {
    flex: 2,
  },
  qtyHeader: {
    flex: 0.8,
    textAlign: 'center',
  },
  rateHeader: {
    flex: 1.2,
    textAlign: 'right',
  },
  amountHeader: {
    flex: 1.2,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
    alignItems: 'center',
  },
  itemNameCell: {
    flex: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  itemTax: {
    fontSize: 12,
    color: Colors.textLight,
  },
  tableCellText: {
    fontSize: 14,
    color: Colors.text,
  },
  qtyCell: {
    flex: 0.8,
    textAlign: 'center',
  },
  rateCell: {
    flex: 1.2,
    textAlign: 'right',
  },
  amountCell: {
    flex: 1.2,
    textAlign: 'right',
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  paymentSection: {
    marginBottom: 16,
  },
  paymentCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.success,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethod: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  paymentStatus: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  paymentDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.success,
  },
  paymentDetailText: {
    fontSize: 12,
    color: Colors.success,
    fontStyle: 'italic',
  },
  staffSection: {
    marginBottom: 16,
  },
  staffCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
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