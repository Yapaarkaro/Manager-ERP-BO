import React, { useState } from 'react';
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
import { ArrowLeft, FileText, User, Building2, Calendar, Hash, Package, MessageSquare, CreditCard, Banknote, Smartphone, TriangleAlert as AlertTriangle, Check } from 'lucide-react-native';

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

export default function ReturnConfirmationScreen() {
  const { invoiceData, selectedItems, itemReasons, returnAmount, refundMethod } = useLocalSearchParams();
  const invoice = JSON.parse(invoiceData as string);
  const items = JSON.parse(selectedItems as string);
  const reasons = JSON.parse(itemReasons as string);
  
  const [isProcessing, setIsProcessing] = useState(false);

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(parseFloat(amount));
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getRefundMethodText = () => {
    switch (refundMethod) {
      case 'same': return `Same as Original (${getOriginalPaymentMethodText()})`;
      case 'cash': return 'Cash Refund';
      case 'upi': return 'UPI Transfer';
      case 'card': return 'Card Refund';
      case 'bank_transfer': return 'Bank Transfer';
      default: return refundMethod;
    }
  };

  const getOriginalPaymentMethodText = () => {
    switch (invoice.paymentMethod) {
      case 'cash': return 'Cash';
      case 'upi': return 'UPI';
      case 'card': return 'Card';
      case 'others': return 'Bank Transfer';
      default: return invoice.paymentMethod;
    }
  };

  const getRefundMethodIcon = () => {
    if (refundMethod === 'same') {
      switch (invoice.paymentMethod) {
        case 'cash': return Banknote;
        case 'upi': return Smartphone;
        case 'card': return CreditCard;
        case 'others': return Building2;
        default: return CreditCard;
      }
    }
    
    switch (refundMethod) {
      case 'cash': return Banknote;
      case 'upi': return Smartphone;
      case 'card': return CreditCard;
      case 'bank_transfer': return Building2;
      default: return CreditCard;
    }
  };

  const getItemReason = (itemId: string) => {
    return reasons.find((reason: any) => reason.itemId === itemId)?.reason || '';
  };

  const handleConfirmReturn = async () => {
    setIsProcessing(true);

    // Generate return number
    const returnNumber = `RET-${new Date().getFullYear()}-${String(Date.now()).slice(-3)}`;

    const returnData = {
      returnNumber,
      originalInvoice: invoice,
      returnedItems: items,
      itemReasons: reasons,
      refundMethod,
      returnAmount: parseFloat(returnAmount as string),
      processedAt: new Date().toISOString(),
      processedBy: invoice.staffName, // Current user
    };

    // Simulate processing
    setTimeout(() => {
      router.push({
        pathname: '/new-return/success',
        params: {
          returnData: JSON.stringify(returnData)
        }
      });
      setIsProcessing(false);
    }, 2000);
  };

  const RefundIcon = getRefundMethodIcon();

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
          
          <Text style={styles.headerTitle}>Confirm Return</Text>
          
          <View style={styles.headerRight}>
            <Text style={styles.returnAmountHeader}>
              {formatAmount(returnAmount as string)}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Warning */}
        <View style={styles.warningContainer}>
          <AlertTriangle size={20} color={Colors.warning} />
          <Text style={styles.warningText}>
            Please review all details before confirming the return
          </Text>
        </View>

        {/* Original Invoice Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Original Invoice</Text>
          <View style={styles.invoiceCard}>
            <View style={styles.invoiceHeader}>
              <FileText size={20} color={Colors.primary} />
              <View style={styles.invoiceInfo}>
                <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
                <Text style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
              </View>
            </View>
            
            <View style={styles.customerInfo}>
              {invoice.customerType === 'business' ? (
                <Building2 size={16} color={Colors.textLight} />
              ) : (
                <User size={16} color={Colors.textLight} />
              )}
              <Text style={styles.customerName}>{invoice.customerName}</Text>
            </View>
          </View>
        </View>

        {/* Return Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items to Return</Text>
          <View style={styles.itemsContainer}>
            {items.map((item: any) => {
              const reason = getItemReason(item.id);
              const itemReturnAmount = (item.rate * item.returnQuantity) * (1 + item.taxRate / 100);

              return (
                <View key={item.id} style={styles.returnItemCard}>
                  <View style={styles.returnItemHeader}>
                    <Package size={16} color={Colors.error} />
                    <View style={styles.returnItemInfo}>
                      <Text style={styles.returnItemName}>{item.name}</Text>
                      <Text style={styles.returnItemDetails}>
                        Qty: {item.returnQuantity} • Amount: {formatAmount(itemReturnAmount)}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.returnItemReason}>
                    <MessageSquare size={14} color={Colors.textLight} />
                    <Text style={styles.reasonText}>{reason}</Text>
                  </View>
                </View>
              );
            })}
          </View>
        </View>

        {/* Refund Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Refund Method</Text>
          <View style={styles.refundMethodCard}>
            <RefundIcon size={24} color={Colors.error} />
            <View style={styles.refundMethodInfo}>
              <Text style={styles.refundMethodText}>
                {getRefundMethodText()}
              </Text>
              <Text style={styles.refundAmountText}>
                {formatAmount(returnAmount as string)}
              </Text>
            </View>
          </View>
        </View>

        {/* Final Summary */}
        <View style={styles.finalSummaryContainer}>
          <Text style={styles.finalSummaryTitle}>Return Summary</Text>
          <View style={styles.finalSummaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Total Items:</Text>
              <Text style={styles.summaryValue}>
                {items.reduce((sum: number, item: any) => sum + item.returnQuantity, 0)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Original Invoice:</Text>
              <Text style={styles.summaryValue}>{invoice.invoiceNumber}</Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Return Date:</Text>
              <Text style={styles.summaryValue}>{formatDate(new Date().toISOString())}</Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Refund:</Text>
              <Text style={styles.totalValue}>
                {formatAmount(returnAmount as string)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Confirm Button */}
      <View style={styles.confirmSection}>
        <TouchableOpacity
          style={[
            styles.confirmButton,
            isProcessing && styles.processingButton
          ]}
          onPress={handleConfirmReturn}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <Text style={styles.confirmButtonText}>
            {isProcessing ? 'Processing Return...' : 'Confirm Return'}
          </Text>
        </TouchableOpacity>
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
  returnAmountHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  warningContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderWidth: 1,
    borderColor: '#fde68a',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    gap: 12,
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
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
  invoiceCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  invoiceHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceInfo: {
    marginLeft: 12,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  invoiceDate: {
    fontSize: 14,
    color: Colors.textLight,
  },
  customerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 14,
    color: Colors.textLight,
  },
  itemsContainer: {
    gap: 12,
  },
  returnItemCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fecaca',
  },
  returnItemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  returnItemInfo: {
    marginLeft: 12,
    flex: 1,
  },
  returnItemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  returnItemDetails: {
    fontSize: 14,
    color: Colors.textLight,
  },
  returnItemReason: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  reasonText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  refundMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  refundMethodInfo: {
    flex: 1,
  },
  refundMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  refundAmountText: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.error,
  },
  finalSummaryContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  finalSummaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  finalSummaryContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingTop: 8,
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
  confirmSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  confirmButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  processingButton: {
    backgroundColor: Colors.grey[400],
  },
});