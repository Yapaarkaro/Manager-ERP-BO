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
import { 
  ArrowLeft, 
  CreditCard, 
  Banknote,
  Smartphone,
  Building2,
  Check,
  ArrowRight
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

type RefundMethod = 'same' | 'cash' | 'upi' | 'card' | 'bank_transfer';

export default function RefundMethodScreen() {
  const { invoiceData, selectedItems, itemReasons, returnAmount } = useLocalSearchParams();
  const invoice = JSON.parse(invoiceData as string);
  const items = JSON.parse(selectedItems as string);
  const reasons = JSON.parse(itemReasons as string);
  
  const [selectedRefundMethod, setSelectedRefundMethod] = useState<RefundMethod>('same');

  const getOriginalPaymentMethodText = () => {
    switch (invoice.paymentMethod) {
      case 'cash': return 'Cash';
      case 'upi': return 'UPI';
      case 'card': return 'Card';
      case 'others': return 'Bank Transfer';
      default: return invoice.paymentMethod;
    }
  };

  const getOriginalPaymentIcon = () => {
    switch (invoice.paymentMethod) {
      case 'cash': return Banknote;
      case 'upi': return Smartphone;
      case 'card': return CreditCard;
      case 'others': return Building2;
      default: return CreditCard;
    }
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(parseFloat(amount));
  };

  const handleContinue = () => {
    if (!selectedRefundMethod) {
      Alert.alert('Refund Method Required', 'Please select a refund method');
      return;
    }

    router.push({
      pathname: '/new-return/confirmation',
      params: {
        invoiceData: JSON.stringify(invoice),
        selectedItems: JSON.stringify(items),
        itemReasons: JSON.stringify(reasons),
        returnAmount,
        refundMethod: selectedRefundMethod
      }
    });
  };

  const renderRefundMethodCard = (
    method: RefundMethod,
    icon: any,
    title: string,
    description: string,
    isRecommended?: boolean
  ) => {
    const IconComponent = icon;
    const isSelected = selectedRefundMethod === method;

    return (
      <TouchableOpacity
        style={[
          styles.refundMethodCard,
          isSelected && styles.selectedRefundMethodCard,
          isRecommended && styles.recommendedCard
        ]}
        onPress={() => setSelectedRefundMethod(method)}
        activeOpacity={0.7}
      >
        <View style={styles.refundMethodLeft}>
          <View style={[
            styles.refundMethodIcon,
            isSelected && styles.selectedRefundMethodIcon
          ]}>
            <IconComponent size={24} color={isSelected ? Colors.background : Colors.error} />
          </View>
          <View style={styles.refundMethodText}>
            <View style={styles.refundMethodTitleContainer}>
              <Text style={[
                styles.refundMethodTitle,
                isSelected && styles.selectedRefundMethodTitle
              ]}>
                {title}
              </Text>
              {isRecommended && (
                <View style={styles.recommendedBadge}>
                  <Text style={styles.recommendedText}>RECOMMENDED</Text>
                </View>
              )}
            </View>
            <Text style={styles.refundMethodDescription}>
              {description}
            </Text>
          </View>
        </View>
        {isSelected && (
          <Check size={20} color={Colors.error} />
        )}
      </TouchableOpacity>
    );
  };

  const OriginalPaymentIcon = getOriginalPaymentIcon();

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
          
          <Text style={styles.headerTitle}>Refund Method</Text>
          
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
        {/* Original Payment Info */}
        <View style={styles.originalPaymentContainer}>
          <Text style={styles.sectionTitle}>Original Payment Method</Text>
          <View style={styles.originalPaymentCard}>
            <OriginalPaymentIcon size={24} color={Colors.success} />
            <View style={styles.originalPaymentInfo}>
              <Text style={styles.originalPaymentMethod}>
                {getOriginalPaymentMethodText()}
              </Text>
              <Text style={styles.originalPaymentAmount}>
                {formatAmount(invoice.amount.toString())}
              </Text>
            </View>
          </View>
        </View>

        {/* Refund Methods */}
        <View style={styles.refundMethodsContainer}>
          <Text style={styles.sectionTitle}>Select Refund Method</Text>
          
          {renderRefundMethodCard(
            'same',
            getOriginalPaymentIcon(),
            `Refund to ${getOriginalPaymentMethodText()}`,
            'Refund to the same payment method used originally',
            true
          )}
          
          {invoice.paymentMethod !== 'cash' && renderRefundMethodCard(
            'cash',
            Banknote,
            'Cash Refund',
            'Provide cash refund to customer'
          )}
          
          {invoice.paymentMethod !== 'upi' && renderRefundMethodCard(
            'upi',
            Smartphone,
            'UPI Transfer',
            'Transfer refund via UPI'
          )}
          
          {invoice.paymentMethod !== 'card' && renderRefundMethodCard(
            'card',
            CreditCard,
            'Card Refund',
            'Process refund to customer\'s card'
          )}
          
          {invoice.paymentMethod !== 'others' && renderRefundMethodCard(
            'bank_transfer',
            Building2,
            'Bank Transfer',
            'Transfer refund to customer\'s bank account'
          )}
        </View>

        {/* Refund Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Refund Summary</Text>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Items to Return:</Text>
              <Text style={styles.summaryValue}>
                {items.reduce((sum: number, item: any) => sum + item.returnQuantity, 0)} items
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Refund Method:</Text>
              <Text style={styles.summaryValue}>
                {selectedRefundMethod === 'same' 
                  ? `Same (${getOriginalPaymentMethodText()})`
                  : selectedRefundMethod === 'cash' ? 'Cash'
                  : selectedRefundMethod === 'upi' ? 'UPI'
                  : selectedRefundMethod === 'card' ? 'Card'
                  : 'Bank Transfer'
                }
              </Text>
            </View>
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Refund Amount:</Text>
              <Text style={styles.totalValue}>
                {formatAmount(returnAmount as string)}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.continueSection}>
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>
            Continue to Confirmation
          </Text>
          <ArrowRight size={20} color="#ffffff" />
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
  originalPaymentContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  originalPaymentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: Colors.success,
    borderRadius: 12,
    padding: 16,
    gap: 12,
  },
  originalPaymentInfo: {
    flex: 1,
  },
  originalPaymentMethod: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  originalPaymentAmount: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500',
  },
  refundMethodsContainer: {
    marginBottom: 24,
  },
  refundMethodCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  selectedRefundMethodCard: {
    borderColor: Colors.error,
    backgroundColor: '#fef2f2',
  },
  recommendedCard: {
    borderColor: Colors.success,
    backgroundColor: '#f0fdf4',
  },
  refundMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  refundMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedRefundMethodIcon: {
    backgroundColor: Colors.error,
  },
  refundMethodText: {
    flex: 1,
  },
  refundMethodTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  refundMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  selectedRefundMethodTitle: {
    color: Colors.error,
  },
  recommendedBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 8,
  },
  recommendedText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#ffffff',
  },
  refundMethodDescription: {
    fontSize: 14,
    color: Colors.textLight,
  },
  summaryContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryContent: {
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
  continueSection: {
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
  continueButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});