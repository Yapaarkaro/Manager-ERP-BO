import React, { useState } from 'react';
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
import { 
  ArrowLeft, 
  Banknote,
  Smartphone,
  CreditCard,
  Building2,
  IndianRupee,
  ShoppingCart,
  RotateCcw,
  FileText,
  Eye,
  User,
  TrendingUp,
  TrendingDown,
  Calendar
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

export default function PaymentDetailsScreen() {
  const { date, paymentMethod, invoices, paymentData } = useLocalSearchParams();
  const invoicesList = JSON.parse(invoices as string);
  const paymentBreakdown = JSON.parse(paymentData as string);

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
      case 'cash': return 'Cash Payments';
      case 'upi': return 'UPI Payments';
      case 'card': return 'Card Payments';
      case 'others': return 'Other Payments';
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

  const renderInvoiceCard = (invoice: any) => {
    const isReturn = invoice.status === 'return';
    const statusColor = isReturn ? Colors.error : Colors.success;
    const StatusIcon = isReturn ? RotateCcw : ShoppingCart;

    return (
      <TouchableOpacity
        key={invoice.id}
        style={[styles.invoiceCard, { borderLeftColor: statusColor }]}
        onPress={() => handleInvoicePress(invoice)}
        activeOpacity={0.7}
      >
        <View style={styles.invoiceHeader}>
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

        <View style={styles.invoiceFooter}>
          <View style={styles.staffInfo}>
            <Image 
              source={{ uri: invoice.staffAvatar }}
              style={styles.staffAvatar}
            />
            <Text style={styles.staffName}>Processed by {invoice.staffName}</Text>
          </View>
          
          <TouchableOpacity
            style={styles.viewInvoiceButton}
            onPress={() => handleInvoicePress(invoice)}
            activeOpacity={0.7}
          >
            <Eye size={16} color={Colors.primary} />
            <Text style={styles.viewInvoiceText}>View Details</Text>
          </TouchableOpacity>
        </View>
      </TouchableOpacity>
    );
  };

  const PaymentIcon = getPaymentMethodIcon(paymentMethod as string);
  const paymentColor = getPaymentMethodColor(paymentMethod as string);
  const paymentName = getPaymentMethodName(paymentMethod as string);

  const salesInvoices = invoicesList.filter((inv: any) => inv.status === 'sale');
  const returnInvoices = invoicesList.filter((inv: any) => inv.status === 'return');

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
        
        <Text style={styles.headerTitle}>{paymentName}</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.dateText}>
            {formatDate(date as string)}
          </Text>
        </View>
      </View>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Payment Method Summary */}
        <View style={[styles.summaryCard, { borderColor: paymentColor }]}>
          <View style={styles.summaryHeader}>
            <View style={[styles.summaryIcon, { backgroundColor: `${paymentColor}20` }]}>
              <PaymentIcon size={32} color={paymentColor} />
            </View>
            <Text style={styles.summaryTitle}>{paymentName}</Text>
          </View>

          <View style={styles.summaryStats}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Gross Sales:</Text>
              <Text style={[styles.summaryValue, { color: Colors.success }]}>
                {formatAmount(paymentBreakdown.gross)}
              </Text>
            </View>
            
            {paymentBreakdown.returns > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Returns:</Text>
                <Text style={[styles.summaryValue, { color: Colors.error }]}>
                  -{formatAmount(paymentBreakdown.returns)}
                </Text>
              </View>
            )}
            
            <View style={[styles.summaryRow, styles.netRow]}>
              <Text style={styles.netLabel}>Net Amount:</Text>
              <Text style={[styles.netValue, { color: paymentColor }]}>
                {formatAmount(paymentBreakdown.net)}
              </Text>
            </View>
          </View>

          <View style={styles.transactionCounts}>
            <View style={styles.countItem}>
              <ShoppingCart size={16} color={Colors.success} />
              <Text style={styles.countLabel}>Sales</Text>
              <Text style={styles.countValue}>{salesInvoices.length}</Text>
            </View>
            
            {returnInvoices.length > 0 && (
              <View style={styles.countItem}>
                <RotateCcw size={16} color={Colors.error} />
                <Text style={styles.countLabel}>Returns</Text>
                <Text style={styles.countValue}>{returnInvoices.length}</Text>
              </View>
            )}
          </View>
        </View>

        {/* Invoices List */}
        <View style={styles.invoicesSection}>
          <Text style={styles.invoicesSectionTitle}>
            All Transactions ({invoicesList.length})
          </Text>
          
          {invoicesList.length === 0 ? (
            <View style={styles.emptyState}>
              <FileText size={64} color={Colors.textLight} />
              <Text style={styles.emptyStateTitle}>No Transactions</Text>
              <Text style={styles.emptyStateText}>
                No transactions found for {paymentName.toLowerCase()} on this date
              </Text>
            </View>
          ) : (
            <View style={styles.invoicesList}>
              {invoicesList.map(renderInvoiceCard)}
            </View>
          )}
        </View>

        {/* Breakdown Analysis */}
        <View style={styles.analysisSection}>
          <Text style={styles.analysisSectionTitle}>Payment Analysis</Text>
          
          <View style={styles.analysisCard}>
            <View style={styles.analysisRow}>
              <View style={styles.analysisItem}>
                <TrendingUp size={20} color={Colors.success} />
                <Text style={styles.analysisLabel}>Sales Revenue</Text>
                <Text style={[styles.analysisValue, { color: Colors.success }]}>
                  {formatAmount(paymentBreakdown.gross)}
                </Text>
              </View>
              
              {paymentBreakdown.returns > 0 && (
                <View style={styles.analysisItem}>
                  <TrendingDown size={20} color={Colors.error} />
                  <Text style={styles.analysisLabel}>Refunds</Text>
                  <Text style={[styles.analysisValue, { color: Colors.error }]}>
                    {formatAmount(paymentBreakdown.returns)}
                  </Text>
                </View>
              )}
            </View>

            <View style={styles.netAnalysis}>
              <Text style={styles.netAnalysisLabel}>
                Net {paymentName} Collection
              </Text>
              <Text style={[styles.netAnalysisValue, { color: paymentColor }]}>
                {formatAmount(paymentBreakdown.net)}
              </Text>
              
              {paymentBreakdown.returns > 0 && (
                <Text style={styles.netAnalysisNote}>
                  After deducting {formatAmount(paymentBreakdown.returns)} in refunds
                </Text>
              )}
            </View>
          </View>
        </View>
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
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  dateText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  summaryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 16,
  },
  summaryIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
  },
  summaryStats: {
    marginBottom: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 16,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: 16,
    fontWeight: '600',
  },
  netRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  netLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  netValue: {
    fontSize: 20,
    fontWeight: '700',
  },
  transactionCounts: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
  },
  countItem: {
    alignItems: 'center',
    gap: 4,
  },
  countLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  countValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  invoicesSection: {
    marginBottom: 24,
  },
  invoicesSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 60,
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
  },
  invoicesList: {
    gap: 12,
  },
  invoiceCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceLeft: {
    flexDirection: 'row',
    alignItems: 'center',
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
  viewInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  viewInvoiceText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  analysisSection: {
    marginBottom: 16,
  },
  analysisSectionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  analysisCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  analysisRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  analysisItem: {
    alignItems: 'center',
    gap: 8,
  },
  analysisLabel: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
  analysisValue: {
    fontSize: 16,
    fontWeight: '700',
    textAlign: 'center',
  },
  netAnalysis: {
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
  },
  netAnalysisLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  netAnalysisValue: {
    fontSize: 24,
    fontWeight: '700',
    marginBottom: 4,
  },
  netAnalysisNote: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});