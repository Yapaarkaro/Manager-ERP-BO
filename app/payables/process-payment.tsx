import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  CreditCard, 
  Banknote,
  Smartphone,
  Building2,
  QrCode,
  X,
  Check,
  User,
  IndianRupee,
  Camera,
  Upload
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

type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer';

export default function ProcessPaymentScreen() {
  const { supplierData } = useLocalSearchParams();
  const supplier = JSON.parse(supplierData as string);
  
  const [paymentAmount, setPaymentAmount] = useState(supplier.totalPayable.toString());
  const [isFullAmount, setIsFullAmount] = useState(true);
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [proofOfPayment, setProofOfPayment] = useState<string | null>(null);
  const [showProofModal, setShowProofModal] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    setPaymentAmount(cleaned);
    setIsFullAmount(parseFloat(cleaned) === supplier.totalPayable);
  };

  const handleFullAmountToggle = () => {
    if (isFullAmount) {
      setPaymentAmount('');
      setIsFullAmount(false);
    } else {
      setPaymentAmount(supplier.totalPayable.toString());
      setIsFullAmount(true);
    }
  };

  const handleCompletePayment = () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method');
      return;
    }

    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid payment amount');
      return;
    }

    if (amount > supplier.totalPayable) {
      Alert.alert('Amount Too High', 'Payment amount cannot exceed total payable');
      return;
    }

    setIsProcessing(true);

    const paymentData = {
      supplierId: supplier.id,
      supplierName: supplier.supplierName,
      paymentAmount: amount,
      paymentMethod: selectedPaymentMethod,
      isFullPayment: amount === supplier.totalPayable,
      remainingBalance: supplier.totalPayable - amount,
      proofOfPayment: proofOfPayment,
      processedAt: new Date().toISOString(),
    };

    // Simulate payment processing
    setTimeout(() => {
      router.push({
        pathname: '/payables/payment-success',
        params: {
          paymentData: JSON.stringify(paymentData)
        }
      });
      setIsProcessing(false);
    }, 1500);
  };

  const handleAddProof = () => {
    setShowProofModal(true);
  };

  const handleProofSelect = (type: 'camera' | 'gallery') => {
    setShowProofModal(false);
    // Mock proof of payment - in real app this would open camera/gallery
    const mockProofUrl = 'https://images.pexels.com/photos/4386321/pexels-photo-4386321.jpeg?auto=compress&cs=tinysrgb&w=300&h=200&dpr=1';
    setProofOfPayment(mockProofUrl);
    Alert.alert('Proof Added', 'Payment proof has been attached for your reference');
  };

  const renderPaymentMethodCard = (
    method: PaymentMethod,
    icon: any,
    title: string,
    description: string
  ) => {
    const IconComponent = icon;
    const isSelected = selectedPaymentMethod === method;

    return (
      <TouchableOpacity
        style={[
          styles.paymentMethodCard,
          isSelected && styles.selectedPaymentMethodCard
        ]}
        onPress={() => {
          setSelectedPaymentMethod(method);
          // No UPI QR for outgoing payments
        }}
        activeOpacity={0.7}
      >
        <View style={styles.paymentMethodLeft}>
          <View style={[
            styles.paymentMethodIcon,
            isSelected && styles.selectedPaymentMethodIcon
          ]}>
            <IconComponent size={24} color={isSelected ? Colors.background : Colors.error} />
          </View>
          <View style={styles.paymentMethodText}>
            <Text style={[
              styles.paymentMethodTitle,
              isSelected && styles.selectedPaymentMethodTitle
            ]}>
              {title}
            </Text>
            <Text style={styles.paymentMethodDescription}>
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
          
          <Text style={styles.headerTitle}>Process Payment</Text>
          
          <View style={styles.headerRight}>
            <Text style={styles.totalPayable}>
              {formatAmount(supplier.totalPayable)}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Supplier Info */}
        <View style={styles.supplierInfoContainer}>
          <View style={styles.supplierInfoHeader}>
            {supplier.supplierType === 'business' ? (
              <Building2 size={24} color={Colors.primary} />
            ) : (
              <User size={24} color={Colors.primary} />
            )}
            <View style={styles.supplierInfoText}>
              <Text style={styles.supplierName}>
                {supplier.supplierType === 'business' ? supplier.businessName : supplier.supplierName}
              </Text>
              {supplier.supplierType === 'business' && (
                <Text style={styles.contactPerson}>Contact: {supplier.supplierName}</Text>
              )}
              <Text style={styles.supplierMobile}>{supplier.mobile}</Text>
            </View>
          </View>
          
          <View style={styles.payableInfo}>
            <Text style={styles.payableLabel}>Total Payable</Text>
            <Text style={styles.payableAmount}>
              {formatAmount(supplier.totalPayable)}
            </Text>
            {supplier.overdueAmount > 0 && (
              <Text style={styles.overdueAmount}>
                {formatAmount(supplier.overdueAmount)} overdue
              </Text>
            )}
          </View>
        </View>

        {/* Payment Amount Selection */}
        <View style={styles.amountContainer}>
          <Text style={styles.sectionTitle}>Payment Amount</Text>
          
          <View style={styles.amountToggleContainer}>
            <TouchableOpacity
              style={[
                styles.amountToggleButton,
                isFullAmount && styles.activeAmountToggle
              ]}
              onPress={handleFullAmountToggle}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.amountToggleText,
                isFullAmount && styles.activeAmountToggleText
              ]}>
                Full Amount
              </Text>
              <Text style={[
                styles.amountToggleValue,
                isFullAmount && styles.activeAmountToggleText
              ]}>
                {formatAmount(supplier.totalPayable)}
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.amountToggleButton,
                !isFullAmount && styles.activeAmountToggle
              ]}
              onPress={handleFullAmountToggle}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.amountToggleText,
                !isFullAmount && styles.activeAmountToggleText
              ]}>
                Custom Amount
              </Text>
            </TouchableOpacity>
          </View>

          {!isFullAmount && (
            <View style={styles.customAmountContainer}>
              <Text style={styles.customAmountLabel}>Enter Amount *</Text>
              <View style={styles.amountInputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.amountInput}
                  value={paymentAmount}
                  onChangeText={handleAmountChange}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                  autoFocus
                />
              </View>
            </View>
          )}
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethodsContainer}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          
          {renderPaymentMethodCard(
            'cash',
            Banknote,
            'Cash',
            'Make cash payment'
          )}
          
          {renderPaymentMethodCard(
            'upi',
            Smartphone,
            'UPI',
            'Make UPI payment'
          )}
          
          {renderPaymentMethodCard(
            'card',
            CreditCard,
            'Card',
            'Make card payment'
          )}
          
          {renderPaymentMethodCard(
            'bank_transfer',
            Building2,
            'Bank Transfer',
            'Make bank transfer'
          )}
        </View>

        {/* Proof of Payment */}
        {selectedPaymentMethod && (
          <View style={styles.proofContainer}>
            <Text style={styles.sectionTitle}>Proof of Payment (Optional)</Text>
            <Text style={styles.proofSubtitle}>
              Add a photo or document as proof for your reference
            </Text>
            
            {proofOfPayment ? (
              <View style={styles.proofPreview}>
                <Image 
                  source={{ uri: proofOfPayment }}
                  style={styles.proofImage}
                />
                <View style={styles.proofActions}>
                  <Text style={styles.proofAddedText}>Proof attached</Text>
                  <TouchableOpacity
                    style={styles.changeProofButton}
                    onPress={handleAddProof}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeProofText}>Change</Text>
                  </TouchableOpacity>
                </View>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addProofButton}
                onPress={handleAddProof}
                activeOpacity={0.7}
              >
                <Camera size={20} color={Colors.primary} />
                <Text style={styles.addProofText}>Add Proof of Payment</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Payment Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Payment Summary</Text>
          <View style={styles.summaryContent}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Supplier:</Text>
              <Text style={styles.summaryValue}>
                {supplier.supplierType === 'business' ? supplier.businessName : supplier.supplierName}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Amount:</Text>
              <Text style={[styles.summaryValue, { color: Colors.error }]}>
                {formatAmount(parseFloat(paymentAmount) || 0)}
              </Text>
            </View>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Payment Method:</Text>
              <Text style={styles.summaryValue}>
                {selectedPaymentMethod 
                  ? selectedPaymentMethod === 'cash' ? 'Cash'
                    : selectedPaymentMethod === 'upi' ? 'UPI'
                    : selectedPaymentMethod === 'card' ? 'Card'
                    : 'Bank Transfer'
                  : 'Not selected'
                }
              </Text>
            </View>
            {parseFloat(paymentAmount) < supplier.totalPayable && (
              <View style={[styles.summaryRow, styles.remainingRow]}>
                <Text style={styles.remainingLabel}>Remaining Balance:</Text>
                <Text style={[styles.remainingValue, { color: Colors.warning }]}>
                  {formatAmount(supplier.totalPayable - (parseFloat(paymentAmount) || 0))}
                </Text>
              </View>
            )}
          </View>
        </View>

        <TouchableOpacity
          style={[
            styles.completeButton,
            (!selectedPaymentMethod || !paymentAmount || isProcessing) && styles.disabledButton
          ]}
          onPress={handleCompletePayment}
          disabled={!selectedPaymentMethod || !paymentAmount || isProcessing}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.completeButtonText,
            (!selectedPaymentMethod || !paymentAmount || isProcessing) && styles.disabledButtonText
          ]}>
            {isProcessing ? 'Processing Payment...' : 'Complete Payment'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* UPI QR Code Modal */}

      {/* Proof of Payment Modal */}
      <Modal
        visible={showProofModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowProofModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.proofModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Proof of Payment</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowProofModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.proofOptions}>
              <TouchableOpacity
                style={styles.proofOption}
                onPress={() => handleProofSelect('camera')}
                activeOpacity={0.7}
              >
                <Camera size={24} color={Colors.primary} />
                <Text style={styles.proofOptionText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.proofOption}
                onPress={() => handleProofSelect('gallery')}
                activeOpacity={0.7}
              >
                <Upload size={24} color={Colors.primary} />
                <Text style={styles.proofOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  totalPayable: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  supplierInfoContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  supplierInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 12,
  },
  supplierInfoText: {
    flex: 1,
  },
  supplierName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  contactPerson: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  supplierMobile: {
    fontSize: 14,
    color: Colors.textLight,
  },
  payableInfo: {
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  payableLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  payableAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.error,
    marginBottom: 4,
  },
  overdueAmount: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
  },
  amountContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  amountToggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
  },
  amountToggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeAmountToggle: {
    backgroundColor: Colors.error,
  },
  amountToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  activeAmountToggleText: {
    color: Colors.background,
  },
  amountToggleValue: {
    fontSize: 12,
    color: Colors.textLight,
  },
  customAmountContainer: {
    gap: 8,
  },
  customAmountLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  amountInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.error,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.error,
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    color: Colors.error,
    fontWeight: '600',
    textAlign: 'right',
    outlineStyle: 'none',
  },
  paymentMethodsContainer: {
    marginBottom: 24,
  },
  paymentMethodCard: {
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
  selectedPaymentMethodCard: {
    borderColor: Colors.error,
    backgroundColor: '#fef2f2',
  },
  paymentMethodLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  paymentMethodIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedPaymentMethodIcon: {
    backgroundColor: Colors.error,
  },
  paymentMethodText: {
    flex: 1,
  },
  paymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  selectedPaymentMethodTitle: {
    color: Colors.error,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: Colors.textLight,
  },
  summaryContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
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
  remainingRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 8,
    marginTop: 8,
  },
  remainingLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  remainingValue: {
    fontSize: 16,
    fontWeight: '700',
  },
  completeButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  completeButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  disabledButtonText: {
    color: Colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  proofContainer: {
    marginBottom: 24,
  },
  proofSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
    lineHeight: 20,
  },
  proofPreview: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  proofImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
    marginBottom: 12,
  },
  proofActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  proofAddedText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '500',
  },
  changeProofButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  changeProofText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  addProofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  addProofText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  proofModalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 350,
  },
  proofOptions: {
    padding: 20,
    gap: 16,
  },
  proofOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  proofOptionText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
});