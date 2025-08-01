import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  CreditCard, 
  Smartphone, 
  Building2,
  CheckCircle,
  X,
  Copy,
  QrCode
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

interface PaymentMethod {
  id: string;
  name: string;
  icon: React.ReactNode;
  description: string;
}

const paymentMethods: PaymentMethod[] = [
  {
    id: 'upi',
    name: 'UPI',
    icon: <Smartphone size={24} color={Colors.primary} />,
    description: 'Pay using UPI ID'
  },
  {
    id: 'card',
    name: 'Credit/Debit Card',
    icon: <CreditCard size={24} color={Colors.primary} />,
    description: 'Pay using card'
  },
  {
    id: 'bank',
    name: 'Bank Transfer',
    icon: <Building2 size={24} color={Colors.primary} />,
    description: 'Pay via bank transfer'
  }
];

export default function PaymentScreen() {
  const { campaignData } = useLocalSearchParams();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<string>('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [showQRCode, setShowQRCode] = useState(false);

  let campaignInfo: any = {};
  try {
    campaignInfo = JSON.parse(campaignData as string);
  } catch (error) {
    console.error('Error parsing campaign data:', error);
  }

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(parseInt(amount) || 0);
  };

  const handlePaymentMethodSelect = (methodId: string) => {
    setSelectedPaymentMethod(methodId);
  };

  const handlePayment = () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Select Payment Method', 'Please select a payment method to continue');
      return;
    }

    setIsProcessing(true);

    // Simulate payment processing
    setTimeout(() => {
      setIsProcessing(false);
      Alert.alert('Payment Successful', 'Your campaign has been created successfully. One of our ad managers will be in touch with you soon.', [
        {
          text: 'OK',
          onPress: () => router.push('/marketing')
        }
      ]);
    }, 2000);
  };

  const renderPaymentMethod = (method: PaymentMethod) => (
    <TouchableOpacity
      key={method.id}
      style={[
        styles.paymentMethodCard,
        selectedPaymentMethod === method.id && styles.selectedPaymentMethod
      ]}
      onPress={() => handlePaymentMethodSelect(method.id)}
      activeOpacity={0.7}
    >
      <View style={styles.paymentMethodHeader}>
        {method.icon}
        <View style={styles.paymentMethodInfo}>
          <Text style={styles.paymentMethodName}>{method.name}</Text>
          <Text style={styles.paymentMethodDescription}>{method.description}</Text>
        </View>
        {selectedPaymentMethod === method.id && (
          <CheckCircle size={24} color={Colors.primary} />
        )}
      </View>
    </TouchableOpacity>
  );

  const renderPaymentDetails = () => {
    switch (selectedPaymentMethod) {
      case 'upi':
        return (
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentDetailsTitle}>UPI Payment</Text>
            <View style={styles.upiSection}>
              <Text style={styles.upiLabel}>UPI ID</Text>
              <View style={styles.upiInputContainer}>
                <TextInput
                  style={styles.upiInput}
                  placeholder="Enter UPI ID (e.g., username@upi)"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="none"
                />
              </View>
              <TouchableOpacity
                style={styles.scanButton}
                onPress={() => setShowQRCode(true)}
                activeOpacity={0.7}
              >
                <QrCode size={20} color={Colors.primary} />
                <Text style={styles.scanButtonText}>Scan QR Code</Text>
              </TouchableOpacity>
            </View>
          </View>
        );

      case 'card':
        return (
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentDetailsTitle}>Card Payment</Text>
            <View style={styles.cardSection}>
              <Text style={styles.cardLabel}>Card Number</Text>
              <View style={styles.cardInputContainer}>
                <CreditCard size={20} color={Colors.textLight} />
                <TextInput
                  style={styles.cardInput}
                  placeholder="1234 5678 9012 3456"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={19}
                />
              </View>
              
              <View style={styles.cardRow}>
                <View style={styles.cardHalf}>
                  <Text style={styles.cardLabel}>Expiry Date</Text>
                  <View style={styles.cardInputContainer}>
                    <TextInput
                      style={styles.cardInput}
                      placeholder="MM/YY"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      maxLength={5}
                    />
                  </View>
                </View>
                <View style={styles.cardHalf}>
                  <Text style={styles.cardLabel}>CVV</Text>
                  <View style={styles.cardInputContainer}>
                    <TextInput
                      style={styles.cardInput}
                      placeholder="123"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      maxLength={4}
                    />
                  </View>
                </View>
              </View>
            </View>
          </View>
        );

      case 'bank':
        return (
          <View style={styles.paymentDetails}>
            <Text style={styles.paymentDetailsTitle}>Bank Transfer Details</Text>
            <View style={styles.bankSection}>
              <View style={styles.bankDetail}>
                <Text style={styles.bankLabel}>Bank Name</Text>
                <Text style={styles.bankValue}>State Bank of India</Text>
              </View>
              <View style={styles.bankDetail}>
                <Text style={styles.bankLabel}>Account Number</Text>
                <View style={styles.bankValueContainer}>
                  <Text style={styles.bankValue}>12345678901</Text>
                  <TouchableOpacity style={styles.copyButton}>
                    <Copy size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.bankDetail}>
                <Text style={styles.bankLabel}>IFSC Code</Text>
                <View style={styles.bankValueContainer}>
                  <Text style={styles.bankValue}>SBIN0001234</Text>
                  <TouchableOpacity style={styles.copyButton}>
                    <Copy size={16} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.bankDetail}>
                <Text style={styles.bankLabel}>Account Holder</Text>
                <Text style={styles.bankValue}>Marketing Solutions Pvt Ltd</Text>
              </View>
              <View style={styles.bankDetail}>
                <Text style={styles.bankLabel}>Amount to Transfer</Text>
                <Text style={styles.bankAmount}>{formatAmount(campaignInfo.budget)}</Text>
              </View>
            </View>
          </View>
        );

      default:
        return null;
    }
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
          
          <Text style={styles.headerTitle}>Payment</Text>
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Campaign Summary */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Campaign Summary</Text>
              <View style={styles.campaignSummary}>
                <Text style={styles.campaignName}>{campaignInfo.name}</Text>
                <Text style={styles.campaignPlatform}>{campaignInfo.platform}</Text>
                <Text style={styles.campaignBudget}>
                  Budget: {formatAmount(campaignInfo.budget)}
                </Text>
              </View>
            </View>

            {/* Payment Methods */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Select Payment Method</Text>
              {paymentMethods.map(renderPaymentMethod)}
            </View>

            {/* Payment Details */}
            {selectedPaymentMethod && renderPaymentDetails()}
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Pay Button */}
        <View style={styles.paySection}>
          <TouchableOpacity
            style={[
              styles.payButton,
              selectedPaymentMethod ? styles.enabledButton : styles.disabledButton,
            ]}
            onPress={handlePayment}
            disabled={!selectedPaymentMethod || isProcessing}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.payButtonText,
              selectedPaymentMethod ? styles.enabledButtonText : styles.disabledButtonText,
            ]}>
              {isProcessing ? 'Processing Payment...' : `Pay ${formatAmount(campaignInfo.budget)}`}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* QR Code Modal */}
      <Modal
        visible={showQRCode}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowQRCode(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Scan QR Code</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowQRCode(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrContainer}>
              <View style={styles.qrCode}>
                <QrCode size={120} color={Colors.text} />
              </View>
              <Text style={styles.qrText}>
                Scan this QR code with any UPI app to pay
              </Text>
              <Text style={styles.qrAmount}>
                Amount: {formatAmount(campaignInfo.budget)}
              </Text>
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
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
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
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  campaignSummary: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  campaignName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  campaignPlatform: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  campaignBudget: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  paymentMethodCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  selectedPaymentMethod: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f4ff',
  },
  paymentMethodHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  paymentMethodInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethodName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  paymentDetails: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  paymentDetailsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  upiSection: {
    gap: 12,
  },
  upiLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  upiInputContainer: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  upiInput: {
    fontSize: 16,
    color: Colors.text,
  },
  scanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    gap: 8,
  },
  scanButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  cardSection: {
    gap: 16,
  },
  cardLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  cardInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    gap: 8,
  },
  cardInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  cardRow: {
    flexDirection: 'row',
    gap: 12,
  },
  cardHalf: {
    flex: 1,
  },
  bankSection: {
    gap: 16,
  },
  bankDetail: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  bankLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  bankValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
  },
  bankValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  copyButton: {
    padding: 4,
  },
  bankAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  paySection: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  payButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  enabledButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  payButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  enabledButtonText: {
    color: Colors.background,
  },
  disabledButtonText: {
    color: Colors.textLight,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    alignSelf: 'center',
    marginTop: 'auto',
    marginBottom: 'auto',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  qrContainer: {
    padding: 20,
    alignItems: 'center',
  },
  qrCode: {
    width: 150,
    height: 150,
    backgroundColor: Colors.background,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
    marginBottom: 16,
  },
  qrText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 8,
  },
  qrAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
}); 