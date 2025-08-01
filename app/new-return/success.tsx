import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CircleCheck as CheckCircle, Download, Share, Printer, Chrome as Home, RotateCcw, Eye } from 'lucide-react-native';

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

export default function ReturnSuccessScreen() {
  const { returnData } = useLocalSearchParams();
  const returnInfo = JSON.parse(returnData as string);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const getRefundMethodText = () => {
    switch (returnInfo.refundMethod) {
      case 'same': return `Same as Original (${getOriginalPaymentMethodText()})`;
      case 'cash': return 'Cash Refund';
      case 'upi': return 'UPI Transfer';
      case 'card': return 'Card Refund';
      case 'bank_transfer': return 'Bank Transfer';
      default: return returnInfo.refundMethod;
    }
  };

  const getOriginalPaymentMethodText = () => {
    switch (returnInfo.originalInvoice.paymentMethod) {
      case 'cash': return 'Cash';
      case 'upi': return 'UPI';
      case 'card': return 'Card';
      case 'others': return 'Bank Transfer';
      default: return returnInfo.originalInvoice.paymentMethod;
    }
  };

  const handleDownloadReturn = () => {
    console.log('Download return invoice:', returnInfo.returnNumber);
  };

  const handleShareReturn = () => {
    console.log('Share return invoice:', returnInfo.returnNumber);
  };

  const handlePrintReturn = () => {
    console.log('Print return invoice:', returnInfo.returnNumber);
  };

  const handleNewReturn = () => {
    router.push('/new-return');
  };

  const handleGoToDashboard = () => {
    router.push('/dashboard');
  };

  const handleViewReturnDetails = () => {
    // Create return invoice data for viewing
    const returnInvoiceData = {
      id: returnInfo.returnNumber.replace('RET-', ''),
      returnNumber: returnInfo.returnNumber,
      originalInvoiceNumber: returnInfo.originalInvoice.invoiceNumber,
      customerName: returnInfo.originalInvoice.customerName,
      customerType: returnInfo.originalInvoice.customerType,
      staffName: returnInfo.processedBy,
      staffAvatar: returnInfo.originalInvoice.staffAvatar,
      refundStatus: 'refunded',
      amount: returnInfo.returnAmount,
      itemCount: returnInfo.returnedItems.length,
      date: new Date().toISOString().split('T')[0],
      reason: returnInfo.itemReasons[0]?.reason || 'Multiple reasons',
      customerDetails: returnInfo.originalInvoice.customerDetails,
    };

    router.push({
      pathname: '/return-details',
      params: {
        returnId: returnInvoiceData.id,
        returnData: JSON.stringify(returnInvoiceData)
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
            <Text style={styles.successTitle}>Return Processed Successfully!</Text>
            <Text style={styles.successSubtitle}>
              The return has been processed and refund initiated
            </Text>
          </View>

          {/* Return Details */}
          <View style={styles.returnDetailsContainer}>
            <Text style={styles.returnNumber}>Return #{returnInfo.returnNumber}</Text>
            
            <View style={styles.detailsGrid}>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Original Invoice:</Text>
                <Text style={styles.detailValue}>{returnInfo.originalInvoice.invoiceNumber}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Customer:</Text>
                <Text style={styles.detailValue}>{returnInfo.originalInvoice.customerName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Refund Method:</Text>
                <Text style={styles.detailValue}>{getRefundMethodText()}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Items Returned:</Text>
                <Text style={styles.detailValue}>
                  {returnInfo.returnedItems.reduce((sum: number, item: any) => sum + item.returnQuantity, 0)} items
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Refund Amount:</Text>
                <Text style={[styles.detailValue, styles.amountValue]}>
                  {formatAmount(returnInfo.returnAmount)}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Processed By:</Text>
                <Text style={styles.detailValue}>{returnInfo.processedBy}</Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Date & Time:</Text>
                <Text style={styles.detailValue}>
                  {new Date().toLocaleString('en-IN')}
                </Text>
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleDownloadReturn}
              activeOpacity={0.7}
            >
              <Download size={20} color={Colors.error} />
              <Text style={styles.actionButtonText}>Download</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleShareReturn}
              activeOpacity={0.7}
            >
              <Share size={20} color={Colors.error} />
              <Text style={styles.actionButtonText}>Share</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handlePrintReturn}
              activeOpacity={0.7}
            >
              <Printer size={20} color={Colors.error} />
              <Text style={styles.actionButtonText}>Print</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.actionButton}
              onPress={handleViewReturnDetails}
              activeOpacity={0.7}
            >
              <Eye size={20} color={Colors.error} />
              <Text style={styles.actionButtonText}>View Details</Text>
            </TouchableOpacity>
          </View>

          {/* Navigation Buttons */}
          <View style={styles.navigationContainer}>
            <TouchableOpacity
              style={styles.newReturnButton}
              onPress={handleNewReturn}
              activeOpacity={0.8}
            >
              <RotateCcw size={20} color="#ffffff" />
              <Text style={styles.newReturnButtonText}>New Return</Text>
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
  returnDetailsContainer: {
    width: '100%',
    backgroundColor: Colors.grey[50],
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  returnNumber: {
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
  newReturnButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  newReturnButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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