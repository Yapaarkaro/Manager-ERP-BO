import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';
import { ArrowLeft, ArrowDownLeft, ArrowUpRight } from 'lucide-react-native';
import { getReceivables, getPayables } from '@/services/backendApi';
import { formatCurrencyINR, formatIndianNumber } from '@/utils/formatters';

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

const formatAmount = (amount: number) => {
  if (amount >= 10000000) return '₹' + formatIndianNumber(amount / 10000000, 2) + ' Cr';
  if (amount >= 100000) return '₹' + formatIndianNumber(amount / 100000, 2) + ' L';
  return formatCurrencyINR(amount, 2, 0);
};

export default function PaymentSelectionScreen() {
  const [totalReceivable, setTotalReceivable] = useState(0);
  const [totalPayable, setTotalPayable] = useState(0);
  const [isLoading, setIsLoading] = useState(true);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [recResult, payResult] = await Promise.all([
        getReceivables(),
        getPayables(),
      ]);

      if (recResult.success) {
        setTotalReceivable(recResult.totalAmount ?? 0);
      }

      if (payResult.success) {
        setTotalPayable(payResult.totalAmount ?? 0);
      }
    } catch {} finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => { loadData(); }, [loadData]);

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Payment Options</Text>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Choose Payment Type</Text>
          <Text style={styles.instructionsText}>
            Select whether you want to receive payment from customers or make payment to suppliers
          </Text>
        </View>

        <View style={styles.optionsContainer}>
          <TouchableOpacity
            style={[styles.optionCard, styles.receivePaymentCard]}
            onPress={() => safeRouter.push('/receivables/receive-payment')}
            activeOpacity={0.7}
          >
            <View style={styles.optionIconContainer}>
              <ArrowDownLeft size={32} color={Colors.success} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Receive Payment</Text>
              <Text style={styles.optionDescription}>
                Collect payments from customers for outstanding invoices
              </Text>
              <View style={styles.optionFeatures}>
                <Text style={styles.featureText}>• Select customer</Text>
                <Text style={styles.featureText}>• Choose amount</Text>
                <Text style={styles.featureText}>• Record payment method</Text>
              </View>
            </View>
            <View style={styles.optionArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.optionCard, styles.makePaymentCard]}
            onPress={() => safeRouter.push('/payables/make-payment')}
            activeOpacity={0.7}
          >
            <View style={styles.optionIconContainer}>
              <ArrowUpRight size={32} color={Colors.error} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Make Payment</Text>
              <Text style={styles.optionDescription}>
                Pay suppliers for outstanding bills and invoices
              </Text>
              <View style={styles.optionFeatures}>
                <Text style={styles.featureText}>• Select supplier</Text>
                <Text style={styles.featureText}>• Choose amount</Text>
                <Text style={styles.featureText}>• Record payment method</Text>
              </View>
            </View>
            <View style={styles.optionArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Quick Overview</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <ArrowDownLeft size={20} color={Colors.success} />
              <Text style={styles.statLabel}>Receivables</Text>
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.success} style={{ marginTop: 4 }} />
              ) : (
                <Text style={[styles.statValue, { color: Colors.success }]}>
                  {totalReceivable > 0 ? formatAmount(totalReceivable) : '₹0'}
                </Text>
              )}
            </View>
            
            <View style={styles.statCard}>
              <ArrowUpRight size={20} color={Colors.error} />
              <Text style={styles.statLabel}>Payables</Text>
              {isLoading ? (
                <ActivityIndicator size="small" color={Colors.error} style={{ marginTop: 4 }} />
              ) : (
                <Text style={[styles.statValue, { color: Colors.error }]}>
                  {totalPayable > 0 ? formatAmount(totalPayable) : '₹0'}
                </Text>
              )}
            </View>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  receivePaymentCard: {
    borderColor: Colors.success,
    backgroundColor: '#f0fdf4',
  },
  makePaymentCard: {
    borderColor: Colors.error,
    backgroundColor: '#fef2f2',
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  optionFeatures: {
    gap: 4,
  },
  featureText: {
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 16,
  },
  optionArrow: {
    marginLeft: 16,
  },
  arrowText: {
    fontSize: 24,
    color: Colors.textLight,
    fontWeight: '300',
  },
  statsContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginVertical: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});
