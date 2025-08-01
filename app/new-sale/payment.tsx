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
  Check
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

type PaymentMethod = 'cash' | 'upi' | 'card' | 'others';
type OthersMethod = 'bank_transfer' | 'cheque';

export default function PaymentScreen() {
  const { cartItems, totalAmount, customerDetails } = useLocalSearchParams();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedOthersMethod, setSelectedOthersMethod] = useState<OthersMethod | null>(null);
  
  // Cash payment states
  const [cashReceived, setCashReceived] = useState('');
  
  // Card payment states
  const [cardNumber, setCardNumber] = useState('');
  const [expiryDate, setExpiryDate] = useState('');
  const [cvv, setCvv] = useState('');
  const [cardHolderName, setCardHolderName] = useState('');
  
  // Others payment states
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  
  // Modal states
  const [showUpiQR, setShowUpiQR] = useState(false);
  const [showBankAccounts, setShowBankAccounts] = useState(false);

  const amount = parseFloat(totalAmount as string);
  const customer = JSON.parse(customerDetails as string);

  // Mock bank accounts
  const bankAccounts = [
    { id: '1', name: 'HDFC Bank', accountNumber: '****1234', type: 'Current' },
    { id: '2', name: 'ICICI Bank', accountNumber: '****5678', type: 'Savings' },
    { id: '3', name: 'SBI Bank', accountNumber: '****9012', type: 'Current' },
  ];

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const calculateBalance = () => {
    const received = parseFloat(cashReceived) || 0;
    return received - amount;
  };

  const handleCompletePayment = () => {
    if (!selectedPaymentMethod) {
      Alert.alert('Payment Method Required', 'Please select a payment method');
      return;
    }

    let paymentData: any = {
      method: selectedPaymentMethod,
      amount: amount,
      customer: customer,
      cartItems: JSON.parse(cartItems as string),
    };

    switch (selectedPaymentMethod) {
      case 'cash':
        if (!cashReceived || parseFloat(cashReceived) < amount) {
          Alert.alert('Insufficient Cash', 'Cash received must be at least the invoice amount');
          return;
        }
        paymentData.cashReceived = parseFloat(cashReceived);
        paymentData.balance = calculateBalance();
        break;

      case 'card':
        if (!cardNumber || !expiryDate || !cvv || !cardHolderName) {
          Alert.alert('Incomplete Card Details', 'Please fill in all card details');
          return;
        }
        paymentData.cardDetails = {
          number: cardNumber,
          expiry: expiryDate,
          cvv: cvv,
          holderName: cardHolderName,
        };
        break;

      case 'others':
        if (!selectedOthersMethod) {
          Alert.alert('Payment Method Required', 'Please select bank transfer or cheque');
          return;
        }
        if (selectedOthersMethod === 'bank_transfer' && !selectedBankAccount) {
          Alert.alert('Bank Account Required', 'Please select a bank account');
          return;
        }
        if (selectedOthersMethod === 'cheque' && !chequeNumber) {
          Alert.alert('Cheque Number Required', 'Please enter cheque number');
          return;
        }
        paymentData.othersMethod = selectedOthersMethod;
        paymentData.bankAccount = selectedBankAccount;
        paymentData.chequeNumber = chequeNumber;
        break;
    }

    // Navigate to success screen
    router.push({
      pathname: '/new-sale/success',
      params: {
        paymentData: JSON.stringify(paymentData),
      }
    });
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
          if (method === 'upi') {
            setShowUpiQR(true);
          }
        }}
        activeOpacity={0.7}
      >
        <View style={styles.paymentMethodLeft}>
          <View style={[
            styles.paymentMethodIcon,
            isSelected && styles.selectedPaymentMethodIcon
          ]}>
            <IconComponent size={24} color={isSelected ? Colors.background : Colors.primary} />
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
          <Check size={20} color={Colors.primary} />
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
          
          <Text style={styles.headerTitle}>Payment</Text>
          
          <View style={styles.headerRight}>
            <Text style={styles.totalAmount}>
              {formatAmount(amount)}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Info */}
        <View style={styles.customerInfo}>
          <Text style={styles.customerName}>{customer.name}</Text>
          <Text style={styles.customerMobile}>{customer.mobile}</Text>
        </View>

        {/* Payment Methods */}
        <View style={styles.paymentMethodsContainer}>
          <Text style={styles.sectionTitle}>Select Payment Method</Text>
          
          {renderPaymentMethodCard(
            'cash',
            Banknote,
            'Cash',
            'Receive cash payment'
          )}
          
          {renderPaymentMethodCard(
            'upi',
            Smartphone,
            'UPI',
            'Receive UPI payment'
          )}
          
          {renderPaymentMethodCard(
            'card',
            CreditCard,
            'Card',
            'Receive card payment'
          )}
          
          {renderPaymentMethodCard(
            'others',
            Building2,
            'Others',
            'Bank transfer or Cheque payment'
          )}
        </View>

        {/* Payment Details Based on Selected Method */}
        {selectedPaymentMethod === 'cash' && (
          <View style={styles.paymentDetailsContainer}>
            <Text style={styles.sectionTitle}>Cash Payment</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cash Received *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.input}
                  value={cashReceived}
                  onChangeText={setCashReceived}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            
            {cashReceived && (
              <View style={styles.balanceContainer}>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Invoice Amount:</Text>
                  <Text style={styles.balanceValue}>{formatAmount(amount)}</Text>
                </View>
                <View style={styles.balanceRow}>
                  <Text style={styles.balanceLabel}>Cash Received:</Text>
                  <Text style={styles.balanceValue}>{formatAmount(parseFloat(cashReceived) || 0)}</Text>
                </View>
                <View style={[styles.balanceRow, styles.totalBalanceRow]}>
                  <Text style={styles.totalBalanceLabel}>
                    {calculateBalance() >= 0 ? 'Balance to Return:' : 'Amount Due:'}
                  </Text>
                  <Text style={[
                    styles.totalBalanceValue,
                    calculateBalance() >= 0 ? styles.positiveBalance : styles.negativeBalance
                  ]}>
                    {formatAmount(Math.abs(calculateBalance()))}
                  </Text>
                </View>
              </View>
            )}
          </View>
        )}

        {selectedPaymentMethod === 'card' && (
          <View style={styles.paymentDetailsContainer}>
            <Text style={styles.sectionTitle}>Card Details</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Card Number *</Text>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={(text) => setCardNumber(text.replace(/\D/g, '').slice(0, 16))}
                placeholder="1234 5678 9012 3456"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
                maxLength={16}
              />
            </View>

            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Expiry Date *</Text>
                <TextInput
                  style={styles.input}
                  value={expiryDate}
                  onChangeText={setExpiryDate}
                  placeholder="MM/YY"
                  placeholderTextColor={Colors.textLight}
                  maxLength={5}
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>CVV *</Text>
                <TextInput
                  style={styles.input}
                  value={cvv}
                  onChangeText={(text) => setCvv(text.replace(/\D/g, '').slice(0, 3))}
                  placeholder="123"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={3}
                  secureTextEntry
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cardholder Name *</Text>
              <TextInput
                style={styles.input}
                value={cardHolderName}
                onChangeText={setCardHolderName}
                placeholder="Enter cardholder name"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="words"
              />
            </View>
          </View>
        )}

        {selectedPaymentMethod === 'others' && (
          <View style={styles.paymentDetailsContainer}>
            <Text style={styles.sectionTitle}>Other Payment Methods</Text>
            
            <View style={styles.othersMethodContainer}>
              <TouchableOpacity
                style={[
                  styles.othersMethodButton,
                  selectedOthersMethod === 'bank_transfer' && styles.selectedOthersMethod
                ]}
                onPress={() => setSelectedOthersMethod('bank_transfer')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.othersMethodText,
                  selectedOthersMethod === 'bank_transfer' && styles.selectedOthersMethodText
                ]}>
                  Bank Transfer
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[
                  styles.othersMethodButton,
                  selectedOthersMethod === 'cheque' && styles.selectedOthersMethod
                ]}
                onPress={() => setSelectedOthersMethod('cheque')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.othersMethodText,
                  selectedOthersMethod === 'cheque' && styles.selectedOthersMethodText
                ]}>
                  Cheque
                </Text>
              </TouchableOpacity>
            </View>

            {selectedOthersMethod === 'bank_transfer' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Select Bank Account *</Text>
                <TouchableOpacity
                  style={styles.bankAccountSelector}
                  onPress={() => setShowBankAccounts(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.bankAccountText,
                    !selectedBankAccount && styles.placeholderText
                  ]}>
                    {selectedBankAccount 
                      ? bankAccounts.find(acc => acc.id === selectedBankAccount)?.name + ' ' + 
                        bankAccounts.find(acc => acc.id === selectedBankAccount)?.accountNumber
                      : 'Select bank account'
                    }
                  </Text>
                </TouchableOpacity>
              </View>
            )}

            {selectedOthersMethod === 'cheque' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Cheque Number *</Text>
                <TextInput
                  style={styles.input}
                  value={chequeNumber}
                  onChangeText={setChequeNumber}
                  placeholder="Enter cheque number"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                />
              </View>
            )}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.completeButton,
            !selectedPaymentMethod && styles.disabledButton
          ]}
          onPress={handleCompletePayment}
          disabled={!selectedPaymentMethod}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.completeButtonText,
            !selectedPaymentMethod && styles.disabledButtonText
          ]}>
            Complete Payment
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* UPI QR Code Modal */}
      <Modal
        visible={showUpiQR}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUpiQR(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>UPI Payment</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowUpiQR(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrContent}>
              <Text style={styles.qrAmount}>{formatAmount(amount)}</Text>
              <View style={styles.qrCodeContainer}>
                <QrCode size={200} color={Colors.text} />
                <Text style={styles.qrCodeText}>QR Code</Text>
              </View>
              <Text style={styles.qrInstructions}>
                Scan this QR code with any UPI app to pay {formatAmount(amount)}
              </Text>
              
              <TouchableOpacity
                style={styles.qrCompleteButton}
                onPress={() => {
                  setShowUpiQR(false);
                  handleCompletePayment();
                }}
                activeOpacity={0.8}
              >
                <Text style={styles.qrCompleteButtonText}>Payment Completed</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Bank Accounts Modal */}
      <Modal
        visible={showBankAccounts}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowBankAccounts(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Bank Account</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowBankAccounts(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.bankAccountsList}>
              {bankAccounts.map((account) => (
                <TouchableOpacity
                  key={account.id}
                  style={[
                    styles.bankAccountItem,
                    selectedBankAccount === account.id && styles.selectedBankAccountItem
                  ]}
                  onPress={() => {
                    setSelectedBankAccount(account.id);
                    setShowBankAccounts(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.bankAccountInfo}>
                    <Text style={styles.bankAccountName}>{account.name}</Text>
                    <Text style={styles.bankAccountNumber}>
                      {account.accountNumber} • {account.type}
                    </Text>
                  </View>
                  {selectedBankAccount === account.id && (
                    <Check size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
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
  totalAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  customerInfo: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  customerName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  customerMobile: {
    fontSize: 14,
    color: Colors.textLight,
  },
  paymentMethodsContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
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
    borderColor: '#3f66ac',
    backgroundColor: '#f0f4ff',
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
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  selectedPaymentMethodIcon: {
    backgroundColor: '#3f66ac',
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
    color: '#3f66ac',
  },
  paymentMethodDescription: {
    fontSize: 14,
    color: Colors.textLight,
  },
  paymentDetailsContainer: {
    marginBottom: 24,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    outlineStyle: 'none',
  },
  balanceContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
  },
  balanceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  balanceLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  balanceValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  totalBalanceRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  totalBalanceLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalBalanceValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  positiveBalance: {
    color: Colors.success,
  },
  negativeBalance: {
    color: Colors.error,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  othersMethodContainer: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  othersMethodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    alignItems: 'center',
  },
  selectedOthersMethod: {
    borderColor: '#3f66ac',
    backgroundColor: '#f0f4ff',
  },
  othersMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  selectedOthersMethodText: {
    color: '#3f66ac',
  },
  bankAccountSelector: {
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  bankAccountText: {
    fontSize: 16,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  completeButton: {
    backgroundColor: '#3f66ac',
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
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
  },
  qrModalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 350,
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
  qrContent: {
    padding: 20,
    alignItems: 'center',
  },
  qrAmount: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 20,
  },
  qrCodeContainer: {
    width: 220,
    height: 220,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  qrCodeText: {
    fontSize: 16,
    color: Colors.textLight,
    marginTop: 8,
  },
  qrInstructions: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
  },
  qrCompleteButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 24,
  },
  qrCompleteButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  bankAccountsList: {
    padding: 20,
  },
  bankAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 8,
    backgroundColor: Colors.grey[50],
  },
  selectedBankAccountItem: {
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: '#3f66ac',
  },
  bankAccountInfo: {
    flex: 1,
  },
  bankAccountName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  bankAccountNumber: {
    fontSize: 14,
    color: Colors.textLight,
  },
});