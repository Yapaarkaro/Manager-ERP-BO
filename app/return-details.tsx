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
import { ArrowLeft, Download, Share, Printer, FileText, Calendar, Hash, Building2, Phone, MapPin, CreditCard, Package, IndianRupee, RotateCcw, Eye, TriangleAlert as AlertTriangle } from 'lucide-react-native';

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

interface ReturnItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  reason: string;
}

export default function ReturnDetailsScreen() {
  const { returnId, returnData } = useLocalSearchParams();
  const returnInvoice = JSON.parse(returnData as string);
  const customer = returnInvoice.customerDetails;
  const isBusinessCustomer = returnInvoice.customerType === 'business';

  // Mock return items
  const returnItems: ReturnItem[] = [
    {
      id: '1',
      name: 'iPhone 14 Pro 128GB',
      quantity: 1,
      rate: 129900,
      amount: 129900,
      taxRate: 18,
      taxAmount: 23382,
      total: 153282,
      reason: 'Defective screen'
    },
  ];

  const subtotal = returnItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = returnItems.reduce((sum, item) => sum + item.taxAmount, 0);
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
        return 'Pending Refund';
      default:
        return status;
    }
  };

  const handleDownload = () => {
    Alert.alert('Download', 'Return invoice download functionality will be implemented');
  };

  const handleShare = () => {
    Alert.alert('Share', 'Return invoice sharing functionality will be implemented');
  };

  const handlePrint = () => {
    Alert.alert('Print', 'Return invoice printing functionality will be implemented');
  };

  const handleViewOriginalInvoice = () => {
    // Create mock original invoice data based on the return invoice
    const originalInvoice = {
      id: returnInvoice.originalInvoiceNumber.replace('INV-', ''),
      invoiceNumber: returnInvoice.originalInvoiceNumber,
      customerName: returnInvoice.customerName,
      customerType: returnInvoice.customerType,
      staffName: returnInvoice.staffName,
      staffAvatar: returnInvoice.staffAvatar,
      paymentStatus: 'paid',
      amount: returnInvoice.amount + 5000, // Original amount would be higher
      itemCount: returnInvoice.itemCount + 1,
      date: new Date(new Date(returnInvoice.date).getTime() - 24 * 60 * 60 * 1000).toISOString().split('T')[0], // Day before return
      customerDetails: returnInvoice.customerDetails,
    };

    router.push({
      pathname: '/invoice-details',
      params: {
        invoiceId: originalInvoice.id,
        invoiceData: JSON.stringify(originalInvoice),
        fromReturn: 'true'
      }
    });
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
          
          <Text style={styles.headerTitle}>Return Details</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleDownload}
              activeOpacity={0.7}
            >
              <Download size={20} color={Colors.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Share size={20} color={Colors.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handlePrint}
              activeOpacity={0.7}
            >
              <Printer size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Return Invoice Header */}
        <View style={styles.returnHeader}>
          <View style={styles.returnInvoiceSection}>
            <RotateCcw size={32} color={Colors.error} />
            <Text style={styles.returnInvoiceTitle}>RETURN INVOICE</Text>
          </View>
          
          <View style={styles.returnMetaInfo}>
            <View style={styles.metaRow}>
              <Hash size={16} color={Colors.textLight} />
              <Text style={styles.metaLabel}>Return No:</Text>
              <Text style={styles.metaValue}>{returnInvoice.returnNumber}</Text>
            </View>
            
            <View style={styles.metaRow}>
              <Calendar size={16} color={Colors.textLight} />
              <Text style={styles.metaLabel}>Return Date:</Text>
              <Text style={styles.metaValue}>{formatDate(returnInvoice.date)}</Text>
            </View>

            <View style={styles.metaRow}>
              <FileText size={16} color={Colors.textLight} />
              <Text style={styles.metaLabel}>Original Invoice:</Text>
              <Text style={styles.metaValue}>{returnInvoice.originalInvoiceNumber}</Text>
            </View>
          </View>

          {/* View Original Invoice Button */}
          <TouchableOpacity
            style={styles.viewOriginalButton}
            onPress={handleViewOriginalInvoice}
            activeOpacity={0.7}
          >
            <Eye size={16} color={Colors.primary} />
            <Text style={styles.viewOriginalText}>View Original Invoice</Text>
          </TouchableOpacity>
        </View>

        {/* Return Status */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Return Status</Text>
          
          <View style={[
            styles.statusCard,
            { backgroundColor: `${getStatusColor(returnInvoice.refundStatus)}10` }
          ]}>
            <View style={styles.statusHeader}>
              <View style={[
                styles.statusIcon,
                { backgroundColor: getStatusColor(returnInvoice.refundStatus) }
              ]}>
                <RotateCcw size={20} color="#ffffff" />
              </View>
              <View style={styles.statusInfo}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(returnInvoice.refundStatus) }
                ]}>
                  {getStatusText(returnInvoice.refundStatus)}
                </Text>
                <Text style={styles.statusAmount}>
                  {formatAmount(returnInvoice.amount)}
                </Text>
              </View>
            </View>
            
            <View style={styles.reasonContainer}>
              <AlertTriangle size={16} color={Colors.warning} />
              <Text style={styles.reasonLabel}>Return Reason:</Text>
              <Text style={styles.reasonText}>{returnInvoice.reason}</Text>
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
                98765432109876543210987654321098765432109876543210987654321098765
              </Text>
            </View>
            
            <View style={styles.irnRow}>
              <Text style={styles.irnLabel}>Acknowledgment Number:</Text>
              <Text style={styles.irnValue}>112410600000686</Text>
            </View>
            
            <View style={styles.irnRow}>
              <Text style={styles.irnLabel}>Acknowledgment Date:</Text>
              <Text style={styles.irnValue}>{formatDate(returnInvoice.date)} 15:45:30</Text>
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
          <Text style={styles.sectionTitle}>Return To</Text>
          
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

        {/* Return Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Returned Items</Text>
          
          <View style={styles.itemsTable}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.itemNameHeader]}>Item</Text>
              <Text style={[styles.tableHeaderText, styles.qtyHeader]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.rateHeader]}>Rate</Text>
              <Text style={[styles.tableHeaderText, styles.amountHeader]}>Amount</Text>
            </View>
            
            {/* Table Rows */}
            {returnItems.map((item) => (
              <View key={item.id} style={styles.tableRow}>
                <View style={styles.itemNameCell}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemTax}>GST @ {item.taxRate}%</Text>
                  <Text style={styles.itemReason}>Reason: {item.reason}</Text>
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

        {/* Refund Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Refund Summary</Text>
          
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
              <Text style={styles.totalLabel}>Total Refund:</Text>
              <Text style={styles.totalValue}>{formatAmount(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Refund Status */}
        <View style={styles.refundSection}>
          <Text style={styles.sectionTitle}>Refund Information</Text>
          
          <View style={styles.refundCard}>
            <View style={styles.refundRow}>
              <CreditCard size={20} color={getStatusColor(returnInvoice.refundStatus)} />
              <View style={styles.refundInfo}>
                <Text style={styles.refundMethod}>Cash Refund</Text>
                <Text style={[
                  styles.refundStatus,
                  { color: getStatusColor(returnInvoice.refundStatus) }
                ]}>
                  {getStatusText(returnInvoice.refundStatus)}
                </Text>
              </View>
              <Text style={styles.refundAmount}>{formatAmount(grandTotal)}</Text>
            </View>
            
            <View style={styles.refundDetails}>
              <Text style={styles.refundDetailText}>
                {returnInvoice.refundStatus === 'refunded' 
                  ? `Refund processed on ${formatDate(returnInvoice.date)} at 15:45`
                  : returnInvoice.refundStatus === 'partially_refunded'
                  ? `Partial refund of ${formatAmount(grandTotal * 0.6)} processed`
                  : 'Refund processing pending'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Staff Information */}
        <View style={styles.staffSection}>
          <Text style={styles.sectionTitle}>Processed By</Text>
          
          <View style={styles.staffCard}>
            <Text style={styles.staffName}>{returnInvoice.staffName}</Text>
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
  returnHeader: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
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
  returnInvoiceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  returnInvoiceTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.error,
    marginLeft: 12,
  },
  returnMetaInfo: {
    gap: 8,
    marginBottom: 16,
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
  viewOriginalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  viewOriginalText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  statusSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  reasonLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 12,
    color: Colors.text,
    flex: 1,
  },
  irnSection: {
    marginBottom: 16,
  },
  irnCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  irnRow: {
    marginBottom: 12,
  },
  irnLabel: {
    fontSize: 12,
    color: Colors.error,
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
    backgroundColor: Colors.error,
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
    marginBottom: 2,
  },
  itemReason: {
    fontSize: 11,
    color: Colors.error,
    fontStyle: 'italic',
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
    color: Colors.error,
  },
  refundSection: {
    marginBottom: 16,
  },
  refundCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  refundInfo: {
    flex: 1,
    marginLeft: 12,
  },
  refundMethod: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  refundStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  refundAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
  },
  refundDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.error,
  },
  refundDetailText: {
    fontSize: 12,
    color: Colors.error,
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