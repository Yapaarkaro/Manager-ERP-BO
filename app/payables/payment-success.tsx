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
import { CircleCheck as CheckCircle, Download, Share, Printer, Chrome as Home, IndianRupee, Eye, FileText } from 'lucide-react-native';

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

export default function PaymentSuccessScreen() {
  const { paymentData } = useLocalSearchParams();
  const payment = JSON.parse(paymentData as string);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getPaymentMethodText = () => {
    switch (payment.paymentMethod) {
      case 'cash': return 'Cash Payment';
      case 'upi': return 'UPI Payment';
      case 'card': return 'Card Payment';
      case 'bank_transfer': return 'Bank Transfer';
      default: return 'Payment';
    }
  };

  const generateVoucherNumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PV-${year}${month}${day}-${random}`;
  };

  // Use useMemo to ensure voucher number is generated only once
  const voucherNumber = React.useMemo(() => generateVoucherNumber(), []);

  const handleDownloadVoucher = () => {
    console.log('Download voucher:', voucherNumber);
    // Implement download functionality
  };

  const handleShareVoucher = () => {
    console.log('Share voucher:', voucherNumber);
    // Implement share functionality
  };

  const handlePrintVoucher = () => {
    console.log('Print voucher:', voucherNumber);
    // Implement print functionality
  };

  const handleMakeAnother = () => {
    router.push('/payables/make-payment');
  };

  const handleGoToPayables = () => {
    router.push('/payables');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleViewSupplierAccount = () => {
    router.push({
      pathname: '/payables/supplier-details',
      params: {
        supplierId: payment.supplierId,
        supplierData: JSON.stringify({
          id: payment.supplierId,
          supplierName: payment.supplierName,
          totalPayable: payment.remainingBalance,
          // Add other supplier data as needed
        })
      }
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Success Icon */}
          <View style={styles.successIconContainer}>
            <View style={styles.successIconWrapper}>
              <CheckCircle size={64} color={Colors.success} />
            </View>
          </View>

          {/* Success Message */}
          <View style={styles.successMessageContainer}>
            <Text style={styles.successTitle}>Payment Made Successfully!</Text>
            <Text style={styles.successSubtitle}>
              Payment has been recorded in your accounts
            </Text>
          </View>

          {/* Voucher Details */}
          <View style={styles.voucherDetailsContainer}>
            <Text style={styles.voucherNumber}>Payment Voucher #{voucherNumber}</Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Supplier:</Text>
                <Text style={styles.detailValue}>{payment.supplierName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Payment Method:</Text>
                <Text style={styles.detailValue}>{getPaymentMethodText()}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Amount Paid:</Text>
                <Text style={[styles.detailValue, styles.amountValue]}>
                  {formatAmount(payment.paymentAmount)}
                </Text>
              </View>

              {!payment.isFullPayment && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Remaining Balance:</Text>
                  <Text style={[styles.detailValue, styles.balanceValue]}>
                    {formatAmount(payment.remainingBalance)}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date & Time:</Text>
                <Text style={styles.detailValue}>
                  {new Date().toLocaleString('en-IN')}
                </Text>
              </View>
            </View>

            {/* Proof of Payment */}
            {payment.proofOfPayment && (
              <View style={styles.proofSection}>
                <Text style={styles.proofLabel}>Proof of Payment:</Text>
                <Image 
                  source={{ uri: payment.proofOfPayment }}
                  style={styles.proofImage}
                />
              </View>
            )}
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadVoucher}
              activeOpacity={0.7}
            >
              <Download size={20} color={Colors.error} />
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShareVoucher}
              activeOpacity={0.7}
            >
              <Share size={20} color={Colors.error} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePrintVoucher}
              activeOpacity={0.7}
            >
              <Printer size={20} color={Colors.error} />
              <Text style={styles.actionButtonText}>Print</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleViewSupplierAccount}
              activeOpacity={0.7}
            >
              <Eye size={20} color={Colors.error} />
              <Text style={styles.actionButtonText}>View Account</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={styles.makeAnotherButton}
              onPress={handleMakeAnother}
              activeOpacity={0.8}
            >
              <IndianRupee size={20} color="#ffffff" />
              <Text style={styles.makeAnotherButtonText}>Make Another Payment</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.dashboardButton}
              onPress={handleGoToDashboard}
              activeOpacity={0.8}
            >
              <Home size={20} color={Colors.error} />
              <Text style={styles.dashboardButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
    alignItems: 'center',
  },
  successIconContainer: {
    marginTop: 40,
    marginBottom: 32,
  },
  successIconWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: '#dcfce7',
    justifyContent: 'center',
    alignItems: 'center',
  },
  successMessageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.success,
    textAlign: 'center',
    marginBottom: 8,
  },
  successSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
  },
  voucherDetailsContainer: {
    width: '100%',
    backgroundColor: Colors.grey[50],
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  voucherNumber: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  detailsGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  amountValue: {
    fontSize: 16,
    color: Colors.error,
  },
  balanceValue: {
    color: Colors.warning,
  },
  proofSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  proofLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  proofImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    marginBottom: 32,
    flexWrap: 'wrap',
    gap: 12,
  },
  actionButton: {
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    minWidth: 80,
  },
  actionButtonText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
    marginTop: 4,
  },
  navigationContainer: {
    width: '100%',
    gap: 12,
  },
  makeAnotherButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  makeAnotherButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  payablesButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  dashboardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  dashboardButtonText: {
    color: Colors.error,
    fontSize: 16,
    fontWeight: '600',
  },
});