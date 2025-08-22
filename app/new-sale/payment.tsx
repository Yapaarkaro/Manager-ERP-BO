import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Image,
} from 'react-native';
import { showError } from '@/utils/notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { dataStore, BankAccount } from '@/utils/dataStore';
import { generateInvoiceUPIURL, formatUPIAmountDisplay } from '@/utils/upiQRGenerator';
import { 
  ArrowLeft, 
  CreditCard, 
  Banknote,
  Smartphone,
  Building2,
  X,
  Check,
  FileText
} from 'lucide-react-native';
import QRCode from 'react-native-qrcode-svg';

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
type PaymentType = 'full_payment' | 'part_payment' | 'add_to_receivables';

export default function PaymentScreen() {
  const { cartItems, totalAmount, customerDetails } = useLocalSearchParams();
  const [selectedPaymentMethod, setSelectedPaymentMethod] = useState<PaymentMethod | null>(null);
  const [selectedOthersMethod, setSelectedOthersMethod] = useState<OthersMethod | null>(null);
  
  // Cash payment states
  const [cashReceived, setCashReceived] = useState('');
  const [paymentType, setPaymentType] = useState<PaymentType>('full_payment');
  
  // Part payment states
  const [showPartPaymentOptions, setShowPartPaymentOptions] = useState(false);
  const [partPaymentMethod, setPartPaymentMethod] = useState<PaymentMethod | null>(null);
  const [partPaymentAmount, setPartPaymentAmount] = useState('');
  const [showContinueButton, setShowContinueButton] = useState(false);
  const [balanceUpdated, setBalanceUpdated] = useState(false);
  
  // Card payment states
  const [cardNumber, setCardNumber] = useState('');
  
  // Others payment states
  const [selectedBankAccount, setSelectedBankAccount] = useState('');
  const [bankTransferReference, setBankTransferReference] = useState('');
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');
  const [autoClearCheque, setAutoClearCheque] = useState(true);
  
  // Modal states
  const [showUpiQR, setShowUpiQR] = useState(false);
  const [showBankAccounts, setShowBankAccounts] = useState(false);
  const [showReceivablesConfirmation, setShowReceivablesConfirmation] = useState(false);
  const [showPartPaymentConfirmation, setShowPartPaymentConfirmation] = useState(false);
  

  
  // Bank accounts state
  const [bankAccounts, setBankAccounts] = useState<BankAccount[]>([]);
  const [primaryBankAccount, setPrimaryBankAccount] = useState<BankAccount | null>(null);
  
  // UPI payment data
  const [upiPaymentURL, setUpiPaymentURL] = useState<string>('');

  const amount = parseFloat(totalAmount as string);
  const customer = JSON.parse(customerDetails as string);

  // Load real bank accounts from data store
  React.useEffect(() => {
    const allBankAccounts = dataStore.getBankAccounts();
    setBankAccounts(allBankAccounts);
    
    const primary = dataStore.getPrimaryBankAccount();
    setPrimaryBankAccount(primary || null);
    
    // Auto-select primary bank account by default
    if (primary && !selectedBankAccount) {
      setSelectedBankAccount(primary.id);
    }

  }, []);

  // Auto-generate QR code only for single bank account when UPI modal opens
  React.useEffect(() => {
    if (showUpiQR && !upiPaymentURL && bankAccounts.length === 1) {
      // Small delay to ensure modal is fully rendered
      const timer = setTimeout(() => {
        generateUPIQRCode();
      }, 100);
      return () => clearTimeout(timer);
    }
  }, [showUpiQR, bankAccounts.length, upiPaymentURL]);

  // Clean up UPI QR code when component unmounts
  React.useEffect(() => {
    return () => {
      setUpiPaymentURL('');
      setShowUpiQR(false);
      // Reset part payment states
      setShowPartPaymentOptions(false);
      setPaymentType('full_payment');
      setPartPaymentMethod(null);
      setPartPaymentAmount('');
    };
  }, []);

  // Reload bank accounts when screen comes into focus (e.g., after adding a new bank account)
  useFocusEffect(
    React.useCallback(() => {
      const allBankAccounts = dataStore.getBankAccounts();
      setBankAccounts(allBankAccounts);
      
      const primary = dataStore.getPrimaryBankAccount();
      setPrimaryBankAccount(primary || null);
      
      // Auto-select primary bank account by default if none is selected
      if (primary && !selectedBankAccount) {
        setSelectedBankAccount(primary.id);
      }

    }, [])
  );

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

  const handleCashAmountChange = (value: string) => {
    setCashReceived(value);
    
    const received = parseFloat(value) || 0;
    if (received > 0 && received < amount && !balanceUpdated) {
      setShowContinueButton(true);
      setShowPartPaymentOptions(false);
    } else if (received >= amount || received === 0) {
      setShowContinueButton(false);
      setShowPartPaymentOptions(false);
      setBalanceUpdated(false);
      setPaymentType('full_payment');
      setPartPaymentMethod(null);
      setPartPaymentAmount('');
    }
  };

  const handleContinue = () => {
    setBalanceUpdated(true);
    setShowContinueButton(false);
    setShowPartPaymentOptions(true);
    setPaymentType('full_payment'); // Reset to default
  };

  const handlePaymentTypeSelection = (type: PaymentType) => {
    setPaymentType(type);
    if (type === 'add_to_receivables') {
      setPartPaymentMethod(null);
      setPartPaymentAmount('');
      // Show receivables confirmation popup
      setShowReceivablesConfirmation(true);
    }
  };

  const showPaymentConfirmation = () => {
    // Navigate to success screen with payment confirmation data
    router.push({
      pathname: '/new-sale/success',
      params: {
        paymentData: JSON.stringify({
          method: 'mixed',
          amount: amount,
          total: amount, // Add total field for compatibility
          customer: customer,
          cartItems: JSON.parse(cartItems as string),
          paymentType: paymentType,
          cashAmount: parseFloat(cashReceived),
          receivablesAmount: Math.abs(calculateBalance()),
        })
      }
    });
  };

  const handlePartPaymentConfirmation = () => {
    // Navigate to success screen with part payment confirmation data
    router.push({
      pathname: '/new-sale/success',
      params: {
        paymentData: JSON.stringify({
          method: 'mixed',
          amount: amount,
          total: amount, // Add total field for compatibility
          customer: customer,
          cartItems: JSON.parse(cartItems as string),
          paymentType: 'part_payment',
          cashAmount: parseFloat(cashReceived),
          remainingAmount: Math.abs(calculateBalance()),
          remainingMethod: selectedPaymentMethod,
          remainingDetails: selectedPaymentMethod === 'upi' ? { method: 'UPI' } :
                           selectedPaymentMethod === 'card' ? { method: 'Card' } :
                           { method: 'Others' }
        })
      }
    });
  };

  const generateUPIQRCode = () => {
    // Determine which bank account to use for UPI
    let bankAccountForUPI: BankAccount | null = null;
    
    if (bankAccounts.length === 1) {
      // Single bank account - use it automatically
      bankAccountForUPI = bankAccounts[0];
    } else if (bankAccounts.length > 1) {
      // Multiple bank accounts - use selected one
      if (!selectedBankAccount) {
        showError('Please select a bank account for UPI payment.', 'Bank Account Selection Required');
        return;
      }
      bankAccountForUPI = bankAccounts.find(acc => acc.id === selectedBankAccount) || null;
    }
    
    if (!bankAccountForUPI) {
      showError('No bank account found. Please add a bank account with UPI ID first.', 'Bank Account Required');
      return;
    }
    
    try {
      // Generate invoice number for this transaction
      const invoiceNumber = `INV-${Date.now()}`;
      
      // Determine amount for UPI (full amount or part payment amount)
      let upiAmount = amount;
      if (showPartPaymentOptions) {
        upiAmount = Math.abs(calculateBalance());
      }
      
      // Generate UPI payment URL
      const upiUrl = generateInvoiceUPIURL(
        bankAccountForUPI.upiId,
        bankAccountForUPI.accountHolderName,
        upiAmount,
        invoiceNumber,
        undefined // No invoice URL for now
      );
      
      setUpiPaymentURL(upiUrl);
    } catch (error) {
      console.error('Error generating UPI QR code:', error);
      showError('Failed to generate UPI QR code. Please check your bank account details.', 'UPI Error');
    }
  };

  const handleCompletePayment = () => {
    if (!selectedPaymentMethod) {
      showError('Please select a payment method', 'Payment Method Required');
      return;
    }

    // Check if full invoice amount is received
    if (showPartPaymentOptions) {
      const cashAmount = parseFloat(cashReceived) || 0;
      const remainingAmount = Math.abs(calculateBalance());
      
      // For part payments, we need to ensure the selected payment method can cover the remaining amount
      if (selectedPaymentMethod === 'upi') {
        // UPI payment - amount is automatically set to remaining balance
        if (!selectedBankAccount) {
          showError('Please select a bank account for UPI payment', 'Bank Account Required');
          return;
        }
      } else if (selectedPaymentMethod === 'card') {
        // Card payment - validate reference number
        if (!cardNumber) {
          showError('Please enter the payment reference number', 'Payment Reference Required');
          return;
        }
      } else if (selectedPaymentMethod === 'others') {
        // Other payment methods - validate based on selected method
        if (!selectedOthersMethod) {
          showError('Please select bank transfer or cheque', 'Payment Method Required');
          return;
        }
        if (selectedOthersMethod === 'bank_transfer' && !bankTransferReference) {
          showError('Please enter transaction reference number', 'Transaction Reference Required');
          return;
        }
        if (selectedOthersMethod === 'cheque') {
          if (!chequeNumber || !chequeDate || !chequeBankName) {
            showError('Please fill all cheque details', 'Cheque Details Required');
            return;
          }
        }
      }
    }

    let paymentData: any = {
      method: selectedPaymentMethod,
      amount: amount,
      customer: customer,
      cartItems: JSON.parse(cartItems as string),
      paymentType: paymentType,
      total: amount, // Add total field for compatibility
    };

    switch (selectedPaymentMethod) {
      case 'cash':
        if (!cashReceived || parseFloat(cashReceived) < amount) {
          showError('Cash received must be at least the invoice amount', 'Insufficient Cash');
          return;
        }
        paymentData.cashReceived = parseFloat(cashReceived);
        paymentData.balance = calculateBalance();
        break;

      case 'card':
        if (!cardNumber) {
          showError('Please enter the payment reference number', 'Payment Reference Required');
          return;
        }
        paymentData.cardDetails = {
          referenceNumber: cardNumber,
          method: 'PoS Machine',
        };
        break;

      case 'others':
        if (!selectedOthersMethod) {
          showError('Please select bank transfer or cheque', 'Payment Method Required');
          return;
        }
        if (selectedOthersMethod === 'bank_transfer') {
          if (!selectedBankAccount) {
            showError('Please select a bank account', 'Bank Account Required');
            return;
          }
          if (!bankTransferReference) {
            showError('Please enter transaction reference number', 'Transaction Reference Required');
            return;
          }
        }
        if (selectedOthersMethod === 'cheque') {
          if (!selectedBankAccount) {
            showError('Please select a bank account for cheque payment', 'Bank Account Required');
            return;
          }
          if (!chequeNumber) {
            showError('Please enter cheque number', 'Cheque Number Required');
            return;
          }
          if (!chequeDate) {
            showError('Please enter cheque date', 'Cheque Date Required');
            return;
          }
          if (!chequeBankName) {
            showError('Please enter bank name on cheque', 'Bank Name Required');
            return;
          }
          paymentData.chequeDetails = {
            bankAccount: selectedBankAccount,
            chequeNumber: chequeNumber,
            chequeDate: chequeDate,
            bankName: chequeBankName,
            autoClear: autoClearCheque,
          };
        }
        paymentData.othersMethod = selectedOthersMethod;
        paymentData.bankAccount = selectedBankAccount;
        if (selectedOthersMethod === 'bank_transfer') {
          paymentData.bankTransferReference = bankTransferReference;
        }
        break;
    }

    // Add part payment details if applicable
    if (showPartPaymentOptions) {
      paymentData.partPayment = {
        cashAmount: parseFloat(cashReceived),
        remainingAmount: Math.abs(calculateBalance()),
        remainingMethod: selectedPaymentMethod,
        remainingDetails: selectedPaymentMethod === 'upi' ? { method: 'UPI' } :
                         selectedPaymentMethod === 'card' ? { method: 'Card' } :
                         { method: 'Others' }
      };
    }

    // Log payment completion
    console.log('=== PAYMENT COMPLETED ===');
    console.log('Payment Method:', selectedPaymentMethod);
    console.log('Customer:', customer.name);
    console.log('Customer Type:', customer.customerType);
    console.log('Total Amount:', formatAmount(amount));
    console.log('Items Count:', JSON.parse(cartItems as string).length);
    console.log('Cash Received:', selectedPaymentMethod === 'cash' ? formatAmount(parseFloat(cashReceived)) : 'N/A');
    console.log('Balance:', selectedPaymentMethod === 'cash' ? formatAmount(calculateBalance()) : 'N/A');
    console.log('Payment Reference:', selectedPaymentMethod === 'card' ? cardNumber : 'N/A');
    console.log('Others Method:', selectedPaymentMethod === 'others' ? selectedOthersMethod : 'N/A');
    console.log('Bank Account:', selectedPaymentMethod === 'others' ? selectedBankAccount : 'N/A');
    console.log('Cheque Number:', selectedPaymentMethod === 'others' && selectedOthersMethod === 'cheque' ? chequeNumber : 'N/A');
    console.log('Cheque Date:', selectedPaymentMethod === 'others' && selectedOthersMethod === 'cheque' ? chequeDate : 'N/A');
    console.log('Cheque Bank:', selectedPaymentMethod === 'others' && selectedOthersMethod === 'cheque' ? chequeBankName : 'N/A');
    console.log('Auto Clear Cheque:', selectedPaymentMethod === 'others' && selectedOthersMethod === 'cheque' ? autoClearCheque : 'N/A');
    console.log('Bank Transfer Reference:', selectedPaymentMethod === 'others' && selectedOthersMethod === 'bank_transfer' ? bankTransferReference : 'N/A');
    
    // Log part payment details
    if (showPartPaymentOptions) {
      console.log('Part Payment - Cash Amount:', formatAmount(parseFloat(cashReceived)));
      console.log('Part Payment - Remaining Amount:', formatAmount(Math.abs(calculateBalance())));
      console.log('Part Payment - Remaining Method:', selectedPaymentMethod);
    }
    
    JSON.parse(cartItems as string).forEach((item: any, index: number) => {
      console.log(`Item ${index + 1}:`);
      console.log('  Product Name:', item.name);
      console.log('  Quantity:', item.quantity);
      console.log('  Unit Price:', formatAmount(item.price));
      console.log('  Total:', formatAmount(item.price * item.quantity));
      console.log('  Tax Rate:', item.taxRate + '%');
      console.log('  HSN Code:', item.hsnCode);
      console.log('  Batch Number:', item.batchNumber);
      console.log('  Primary Unit:', item.primaryUnit);
    });
    console.log('Completed at:', new Date().toISOString());
    console.log('========================');

    // Discard UPI QR code when payment is completed
    setUpiPaymentURL('');
    setShowUpiQR(false);
    
    // Reset part payment states
    setShowPartPaymentOptions(false);
    setPaymentType('full_payment');
    setPartPaymentMethod(null);
    setPartPaymentAmount('');
    
    // Show appropriate confirmation based on payment type
    if (showPartPaymentOptions) {
      setShowPartPaymentConfirmation(true);
    } else {
      // Navigate to success screen for full payments
      router.push({
        pathname: '/new-sale/success',
        params: {
          paymentData: JSON.stringify(paymentData),
        }
      });
    }
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
          // Clear UPI QR code if switching away from UPI
          if (selectedPaymentMethod === 'upi' && method !== 'upi') {
            setUpiPaymentURL('');
            setShowUpiQR(false);
          }
          
          setSelectedPaymentMethod(method);
          if (method === 'upi') {
            // Clear previous UPI QR and show UPI QR modal (keep bank account selection)
            setUpiPaymentURL('');
            setShowUpiQR(true);
            // Auto-generate QR code after a short delay to ensure modal is rendered
            setTimeout(() => {
              generateUPIQRCode();
            }, 300);
          }
          
          // If this is a part payment method, update the part payment method
          if (showPartPaymentOptions && paymentType === 'part_payment') {
            setPartPaymentMethod(method);
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
            onPress={() => {
              // Discard UPI QR code when navigating back
              setUpiPaymentURL('');
              setShowUpiQR(false);
              // Reset part payment states
              setShowPartPaymentOptions(false);
              setPaymentType('full_payment');
              setPartPaymentMethod(null);
              setPartPaymentAmount('');
              router.back();
            }}
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
          
                    {/* 1. Cash Payment - Always First */}
          {renderPaymentMethodCard(
            'cash',
            Banknote,
            'Cash',
            'Receive cash payment'
          )}
          
          {/* Cash Payment Input - Immediately Below Cash Option */}
          <View style={styles.cashPaymentInputContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Cash Received *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.input}
                  value={cashReceived}
                  onChangeText={handleCashAmountChange}
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
                  <Text style={styles.totalBalanceValue}>
                    {formatAmount(Math.abs(calculateBalance()))}
                  </Text>
                </View>
              </View>
            )}

            {/* Continue Button for Part Payment */}
            {showContinueButton && (
              <View style={styles.continueButtonContainer}>
                <TouchableOpacity
                  style={styles.continueButton}
                  onPress={handleContinue}
                  activeOpacity={0.8}
                >
                  <Text style={styles.continueButtonText}>Continue</Text>
                </TouchableOpacity>
                <Text style={styles.continueButtonNote}>
                  Click to proceed with payment of remaining amount: {formatAmount(Math.abs(calculateBalance()))}
                </Text>
              </View>
            )}
          </View>
          
          {/* Show payment methods only when balance is updated or full payment */}
          {(balanceUpdated || !showContinueButton) && !showContinueButton && (
            <>
              {/* Remaining Amount Header for Part Payments */}
              {showPartPaymentOptions && (
                <View style={styles.remainingAmountHeader}>
                  <Text style={styles.remainingAmountTitle}>
                    Remaining Amount: {formatAmount(Math.abs(calculateBalance()))}
                  </Text>
                  <Text style={styles.remainingAmountSubtitle}>
                    Select payment method for the remaining amount
                  </Text>
                </View>
              )}
              
              {/* 2. Bank Account Selection - If Multiple Bank Accounts Exist */}
              {bankAccounts.length > 1 && (
                <View style={styles.bankSelectionSection}>
                  <Text style={styles.bankSelectionTitle}>Select Bank Account</Text>
                  <Text style={styles.bankSelectionSubtitle}>
                    Choose your preferred bank account for all payment methods
                  </Text>
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
                        ? bankAccounts.find(acc => acc.id === selectedBankAccount)?.bankName + ' ****' + 
                          bankAccounts.find(acc => acc.id === selectedBankAccount)?.accountNumber.slice(-4)
                        : 'Select bank account'
                      }
                    </Text>
                  </TouchableOpacity>
                  <Text style={styles.bankSelectionNote}>
                    💡 Note: Bank account may have been auto-selected if the server was down or inactive
                  </Text>
                </View>
              )}
              
              {/* 3. UPI Payment */}
              {renderPaymentMethodCard(
                'upi',
                Smartphone,
                'UPI',
                showPartPaymentOptions 
                  ? `Pay remaining amount: ${formatAmount(Math.abs(calculateBalance()))}`
                  : 'Click to generate QR code instantly'
              )}
              
              {/* 4. Card Payment */}
              {renderPaymentMethodCard(
                'card',
                CreditCard,
                'Card',
                showPartPaymentOptions 
                  ? `Pay remaining amount: ${formatAmount(Math.abs(calculateBalance()))}`
                  : 'Receive card payment'
              )}
              
              {/* 5. Other Payment Methods */}
              {renderPaymentMethodCard(
                'others',
                Building2,
                'Others',
                showPartPaymentOptions 
                  ? `Pay remaining amount: ${formatAmount(Math.abs(calculateBalance()))}`
                  : 'Bank transfer or Cheque payment'
              )}
            </>
          )}
        </View>
        
        {/* Payment Details Based on Selected Method - Only show when balance is updated or full payment */}
        {((balanceUpdated || !showContinueButton) && !showContinueButton) && selectedPaymentMethod === 'card' && (
          <View style={styles.paymentDetailsContainer}>
            <Text style={styles.sectionTitle}>Card Payment via PoS Machine</Text>
            
            <View style={styles.posNoticeContainer}>
              <Text style={styles.posNoticeTitle}>📱 Use Your PoS Machine</Text>
              <Text style={styles.posNoticeText}>
                Please use your PoS machine to process the card payment. Enter the payment reference number below after the transaction is completed.
              </Text>
              <Text style={styles.posNoticeFeature}>
                💡 In-app card processing feature coming soon!
              </Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Reference Number *</Text>
              <TextInput
                style={styles.input}
                value={cardNumber}
                onChangeText={setCardNumber}
                placeholder="Enter payment reference number"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="characters"
              />
            </View>
          </View>
        )}

        {((balanceUpdated || !showContinueButton) && !showContinueButton) && selectedPaymentMethod === 'others' && (
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
              <>
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
                        ? bankAccounts.find(acc => acc.id === selectedBankAccount)?.bankName + ' ****' + 
                          bankAccounts.find(acc => acc.id === selectedBankAccount)?.accountNumber.slice(-4)
                        : 'Select bank account'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Transaction Reference Number *</Text>
                  <TextInput
                    style={styles.input}
                    value={bankTransferReference}
                    onChangeText={setBankTransferReference}
                    placeholder="Enter transaction reference number"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="characters"
                  />
                </View>
              </>
            )}

            {selectedOthersMethod === 'cheque' && (
              <>
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
                        ? bankAccounts.find(acc => acc.id === selectedBankAccount)?.bankName + ' ****' + 
                          bankAccounts.find(acc => acc.id === selectedBankAccount)?.accountNumber.slice(-4)
                        : 'Select bank account'
                      }
                    </Text>
                  </TouchableOpacity>
                </View>

                <View style={styles.rowContainer}>
                  <View style={[styles.inputGroup, styles.halfWidth]}>
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

                  <View style={[styles.inputGroup, styles.halfWidth]}>
                    <Text style={styles.label}>Cheque Date *</Text>
                    <TextInput
                      style={styles.input}
                      value={chequeDate}
                      onChangeText={setChequeDate}
                      placeholder="DD/MM/YYYY"
                      placeholderTextColor={Colors.textLight}
                      maxLength={10}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Bank Name on Cheque *</Text>
                  <TextInput
                    style={styles.input}
                    value={chequeBankName}
                    onChangeText={setChequeBankName}
                    placeholder="Enter bank name as shown on cheque"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Payment Clearance</Text>
                  <View style={styles.clearanceContainer}>
                    <TouchableOpacity
                      style={[
                        styles.clearanceOption,
                        autoClearCheque && styles.selectedClearanceOption
                      ]}
                      onPress={() => setAutoClearCheque(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.clearanceOptionText,
                        autoClearCheque && styles.selectedClearanceOptionText
                      ]}>
                        Auto-clear when cheque is deposited
                      </Text>
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={[
                        styles.clearanceOption,
                        !autoClearCheque && styles.selectedClearanceOption
                      ]}
                      onPress={() => setAutoClearCheque(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.clearanceOptionText}>
                        I will clear manually
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </>
            )}
          </View>
        )}





        {/* Payment Action Buttons */}
        {showPartPaymentOptions ? (
          <View style={styles.paymentActionButtons}>
            <TouchableOpacity
              style={[
                styles.completePaymentButton,
                !selectedPaymentMethod && styles.disabledButton
              ]}
              onPress={handleCompletePayment}
              disabled={!selectedPaymentMethod}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.completePaymentButtonText,
                !selectedPaymentMethod && styles.disabledButtonText
              ]}>
                Complete Payment
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.addToReceivablesButton}
              onPress={() => {
                setPaymentType('add_to_receivables');
                setShowReceivablesConfirmation(true);
              }}
              activeOpacity={0.8}
            >
              <Text style={styles.addToReceivablesButtonText}>
                Add Balance to Receivables
              </Text>
            </TouchableOpacity>
          </View>
        ) : (
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
        )}
      </ScrollView>

      {/* UPI QR Code Modal */}
      <Modal
        visible={showUpiQR}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowUpiQR(false);
          // Discard UPI QR code when modal is closed
          setUpiPaymentURL('');
        }}
      >

        <View style={styles.modalOverlay}>
          <View style={styles.qrModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>UPI Payment</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowUpiQR(false);
                  // Discard UPI QR code when modal is closed manually
                  setUpiPaymentURL('');
                }}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.qrContent}>
              <Text style={styles.qrAmount}>
                {showPartPaymentOptions 
                  ? formatAmount(Math.abs(calculateBalance()))
                  : formatAmount(amount)
                }
              </Text>
              
              {/* Bank Account Info for UPI */}
              {bankAccounts.length === 0 ? (
                <View style={styles.qrErrorContainer}>
                  <Text style={styles.qrErrorText}>
                    ⚠️ No bank accounts found. Please add a bank account with UPI ID first.
                  </Text>
                  <TouchableOpacity
                    style={styles.addBankAccountButton}
                    onPress={() => {
                      setShowUpiQR(false);
                      router.push('/add-bank-account');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addBankAccountButtonText}>Add Bank Account</Text>
                  </TouchableOpacity>
                </View>
              ) : selectedBankAccount && bankAccounts.find(acc => acc.id === selectedBankAccount) ? (
                // Show selected bank account info
                <View style={styles.qrBankInfo}>
                  <Text style={styles.qrBankName}>
                    {bankAccounts.find(acc => acc.id === selectedBankAccount)?.bankName}
                  </Text>
                  <Text style={styles.qrBankAccount}>
                    {bankAccounts.find(acc => acc.id === selectedBankAccount)?.accountHolderName}
                  </Text>
                  <Text style={styles.qrBankUPI}>
                    UPI: {bankAccounts.find(acc => acc.id === selectedBankAccount)?.upiId}
                  </Text>
                  
                  {/* QR Code will be generated automatically */}
                </View>
              ) : (
                // No bank account selected
                <View style={styles.qrErrorContainer}>
                  <Text style={styles.qrErrorText}>
                    ⚠️ Please select a bank account from the main screen first.
                  </Text>
                </View>
              )}

              {/* QR Code Display */}
              <View style={styles.qrCodeContainer}>
                {(() => {
                  // Only show QR code if we have a bank account to use
                  let shouldShowQR = false;
                  let bankAccountForQR: BankAccount | null = null;
                  
                  if (bankAccounts.length === 1) {
                    // Single account - always show QR
                    shouldShowQR = true;
                    bankAccountForQR = bankAccounts[0];
                  } else if (bankAccounts.length > 1 && selectedBankAccount) {
                    // Multiple accounts - only show QR if selected
                    shouldShowQR = true;
                    bankAccountForQR = bankAccounts.find(acc => acc.id === selectedBankAccount) || null;
                  }
                  
                  if (shouldShowQR && bankAccountForQR && upiPaymentURL) {
                    return (
                      <>
                        <QRCode
                          value={upiPaymentURL}
                          size={200}
                          color={Colors.text}
                          backgroundColor={Colors.background}
                          onError={(error: any) => console.error('QR Code generation error:', error)}
                        />
                        <Text style={styles.qrCodeText}>Scan to Pay</Text>
                      </>
                    );
                  } else if (bankAccounts.length > 1 && !selectedBankAccount) {
                    return (
                      <View style={styles.qrCodePlaceholder}>
                        <Text style={styles.qrCodePlaceholderText}>Select a bank account to generate QR code</Text>
                      </View>
                    );
                  } else {
                    return (
                      <View style={styles.qrCodePlaceholder}>
                        <Text style={styles.qrCodePlaceholderText}>Generating QR Code...</Text>
                      </View>
                    );
                  }
                })()}
              </View>
              
              <Text style={styles.qrInstructions}>
                Scan this QR code with any UPI app to pay {
                  showPartPaymentOptions 
                    ? formatAmount(Math.abs(calculateBalance()))
                    : formatAmount(amount)
                }
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
              {bankAccounts.length > 0 ? (
                bankAccounts.map((account) => (
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
                      <Text style={styles.bankAccountName}>{account.bankName}</Text>
                      <Text style={styles.bankAccountNumber}>
                        {account.accountHolderName} • ****{account.accountNumber.slice(-4)} • {account.accountType}
                      </Text>
                      <Text style={styles.bankAccountUPI}>
                        UPI: {account.upiId}
                      </Text>
                    </View>
                    {selectedBankAccount === account.id && (
                      <Check size={20} color={Colors.primary} />
                    )}
                  </TouchableOpacity>
                ))
              ) : (
                <View style={styles.emptyBankAccounts}>
                  <Text style={styles.emptyBankAccountsText}>
                    No bank accounts found. Please add a bank account first.
                  </Text>
                  <TouchableOpacity
                    style={styles.addBankAccountButton}
                    onPress={() => {
                      setShowBankAccounts(false);
                      // Navigate to add bank account screen
                      router.push('/add-bank-account');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addBankAccountButtonText}>Add Bank Account</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          </View>
        </View>
      </Modal>

      {/* Receivables Confirmation Modal */}
      <Modal
        visible={showReceivablesConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReceivablesConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.receivablesModalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <FileText size={24} color={Colors.primary} style={styles.modalTitleIcon} />
                <Text style={styles.modalTitle}>Add to Receivables</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowReceivablesConfirmation(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.receivablesModalContent}>
              <Text style={styles.receivablesModalSubtitle}>
                Confirm adding remaining amount to customer's outstanding balance
              </Text>
              
              <View style={styles.receivablesSummaryContainer}>
                <View style={styles.receivablesSummaryRow}>
                  <Text style={styles.receivablesSummaryLabel}>Customer:</Text>
                  <Text style={styles.receivablesSummaryValue}>{customer.name}</Text>
                </View>
                
                <View style={styles.receivablesSummaryRow}>
                  <Text style={styles.receivablesSummaryLabel}>Current Balance:</Text>
                  <Text style={styles.receivablesSummaryValue}>₹0.00</Text>
                </View>
                
                <View style={styles.receivablesSummaryRow}>
                  <Text style={styles.receivablesSummaryLabel}>Cash Received:</Text>
                  <Text style={styles.receivablesSummaryValue}>{formatAmount(parseFloat(cashReceived) || 0)}</Text>
                </View>
                
                <View style={styles.receivablesSummaryRow}>
                  <Text style={styles.receivablesSummaryLabel}>Amount to Add:</Text>
                  <Text style={styles.receivablesSummaryValue}>{formatAmount(Math.abs(calculateBalance()))}</Text>
                </View>
                
                <View style={[styles.receivablesSummaryRow, styles.receivablesTotalRow]}>
                  <Text style={styles.receivablesTotalLabel}>New Balance:</Text>
                  <Text style={styles.receivablesTotalValue}>{formatAmount(Math.abs(calculateBalance()))}</Text>
                </View>
              </View>
              
              <View style={styles.receivablesModalNoteContainer}>
                <Check size={16} color={Colors.textLight} style={styles.receivablesModalNoteIcon} />
                <Text style={styles.receivablesModalNote}>
                  The remaining amount will be added to {customer.name}'s outstanding balance. You can collect this amount later from the receivables screen.
                </Text>
              </View>
              
              <View style={styles.receivablesModalButtons}>
                <TouchableOpacity
                  style={styles.receivablesCancelButton}
                  onPress={() => setShowReceivablesConfirmation(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.receivablesCancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.receivablesConfirmButton}
                  onPress={() => {
                    setShowReceivablesConfirmation(false);
                    // Show payment confirmation screen
                    showPaymentConfirmation();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.receivablesConfirmButtonText}>Confirm and Continue</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Part Payment Confirmation Modal */}
      <Modal
        visible={showPartPaymentConfirmation}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPartPaymentConfirmation(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.partPaymentModalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalTitleContainer}>
                <Check size={24} color={Colors.success} style={styles.modalTitleIcon} />
                <Text style={styles.modalTitle}>Payment Completed</Text>
              </View>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPartPaymentConfirmation(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.partPaymentModalContent}>
              <Text style={styles.partPaymentModalSubtitle}>
                Part payment has been successfully completed
              </Text>
              
              <View style={styles.partPaymentSummaryContainer}>
                <View style={styles.partPaymentSummaryRow}>
                  <Text style={styles.partPaymentSummaryLabel}>Customer:</Text>
                  <Text style={styles.partPaymentSummaryValue}>{customer.name}</Text>
                </View>
                
                <View style={styles.partPaymentSummaryRow}>
                  <Text style={styles.partPaymentSummaryLabel}>Invoice Amount:</Text>
                  <Text style={styles.partPaymentSummaryValue}>{formatAmount(amount)}</Text>
                </View>
                
                <View style={styles.partPaymentSummaryRow}>
                  <Text style={styles.partPaymentSummaryLabel}>Cash Received:</Text>
                  <Text style={styles.partPaymentSummaryValue}>{formatAmount(parseFloat(cashReceived) || 0)}</Text>
                </View>
                
                <View style={styles.partPaymentSummaryRow}>
                  <Text style={styles.partPaymentSummaryLabel}>Remaining Amount:</Text>
                  <Text style={styles.partPaymentSummaryValue}>{formatAmount(Math.abs(calculateBalance()))}</Text>
                </View>
                
                <View style={styles.partPaymentSummaryRow}>
                  <Text style={styles.partPaymentSummaryLabel}>Payment Method:</Text>
                  <Text style={styles.partPaymentSummaryValue}>
                    {selectedPaymentMethod === 'upi' ? 'UPI Payment' :
                     selectedPaymentMethod === 'card' ? 'Card Payment' :
                     selectedPaymentMethod === 'others' ? 'Bank Transfer/Cheque' : 'N/A'}
                  </Text>
                </View>
                
                <View style={[styles.partPaymentSummaryRow, styles.partPaymentTotalRow]}>
                  <Text style={styles.partPaymentTotalLabel}>Status:</Text>
                  <View style={styles.statusContainer}>
                    <Check size={16} color={Colors.success} style={styles.statusIcon} />
                    <Text style={styles.partPaymentTotalValue}>Fully Paid</Text>
                  </View>
                </View>
              </View>
              
              <View style={styles.receivablesModalNoteContainer}>
                <Check size={16} color={Colors.textLight} style={styles.receivablesModalNoteIcon} />
                <Text style={styles.partPaymentModalNote}>
                  The invoice has been fully paid through a combination of cash and {selectedPaymentMethod === 'upi' ? 'UPI' : selectedPaymentMethod === 'card' ? 'card' : 'other payment method'}.
                </Text>
              </View>
              
              <View style={styles.partPaymentModalButtons}>
                <TouchableOpacity
                  style={styles.partPaymentConfirmButton}
                  onPress={() => {
                    setShowPartPaymentConfirmation(false);
                    // Navigate to success screen
                    handlePartPaymentConfirmation();
                  }}
                  activeOpacity={0.8}
                >
                  <Text style={styles.partPaymentConfirmButtonText}>Continue to Invoice</Text>
                </TouchableOpacity>
              </View>
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

  upiErrorContainer: {
    backgroundColor: Colors.error + '10',
    borderWidth: 1,
    borderColor: Colors.error + '30',
    borderRadius: 12,
    padding: 16,
    marginTop: 8,
    marginBottom: 16,
    alignItems: 'center',
  },
  upiErrorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
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
  qrCodePlaceholder: {
    width: 200,
    height: 200,
    backgroundColor: Colors.grey[200],
    borderRadius: 8,
    justifyContent: 'center',
    alignItems: 'center',
  },
  qrCodePlaceholderText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 20,
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
  bankAccountUPI: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 4,
    fontFamily: 'monospace',
  },
  emptyBankAccounts: {
    padding: 20,
    alignItems: 'center',
  },
  emptyBankAccountsText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
  },
  addBankAccountButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 20,
  },
  addBankAccountButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  qrBankInfo: {
    alignItems: 'center',
    marginBottom: 16,
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    width: '100%',
  },
  qrBankName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  qrBankAccount: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  qrBankUPI: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  qrError: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    marginBottom: 16,
  },
  upiInfoContainer: {
    backgroundColor: Colors.success + '10',
    borderWidth: 1,
    borderColor: Colors.success + '30',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  upiInfoText: {
    fontSize: 14,
    color: Colors.success,
    textAlign: 'center',
    fontWeight: '500',
  },
  posNoticeContainer: {
    backgroundColor: Colors.primary + '10',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  posNoticeTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 8,
    textAlign: 'center',
  },
  posNoticeText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  posNoticeFeature: {
    fontSize: 12,
    color: Colors.warning,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  clearanceContainer: {
    marginTop: 8,
  },
  clearanceOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  selectedClearanceOption: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary + '30',
  },
  clearanceOptionText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  selectedClearanceOptionText: {
    color: Colors.primary,
    fontWeight: '500',
  },
  qrErrorContainer: {
    backgroundColor: Colors.error + '10',
    borderWidth: 1,
    borderColor: Colors.error + '30',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  qrErrorText: {
    fontSize: 14,
    color: Colors.error,
    textAlign: 'center',
    fontWeight: '500',
  },
  qrBankSelectionContainer: {
    marginBottom: 16,
  },
  qrBankSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  qrBankAccountSelector: {
    backgroundColor: Colors.grey[100],
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 12,
  },
  qrBankAccountSelectorText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  generateQRButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    marginTop: 12,
    alignItems: 'center',
  },
  generateQRButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  qrBankAccountsList: {
    marginTop: 8,
    marginBottom: 16,
  },
  qrBankAccountItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.grey[50],
    borderWidth: 2,
    borderColor: Colors.grey[200],
  },
  selectedQrBankAccountItem: {
    backgroundColor: Colors.primary + '15',
    borderColor: Colors.primary,
  },
  qrBankAccountInfo: {
    flex: 1,
  },
  qrBankAccountName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  qrBankAccountDetails: {
    fontSize: 12,
    color: Colors.textLight,
  },
  bankSelectionSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  bankSelectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  bankSelectionSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 12,
    lineHeight: 20,
  },
  qrPreSelectedBank: {
    backgroundColor: Colors.success + '15',
    borderWidth: 1,
    borderColor: Colors.success + '30',
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    alignItems: 'center',
  },
  qrPreSelectedBankText: {
    fontSize: 14,
    color: Colors.success,
    textAlign: 'center',
    fontWeight: '500',
  },
  
  // Part Payment Styles
  partPaymentContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  partPaymentTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  partPaymentSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  partPaymentOptions: {
    gap: 12,
    marginBottom: 20,
  },
  partPaymentOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  selectedPartPaymentOption: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  partPaymentOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    textAlign: 'center',
  },
  selectedPartPaymentOptionText: {
    color: Colors.primary,
  },
  partPaymentOptionDescription: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 16,
  },
  partPaymentMethodContainer: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  partPaymentMethodTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  partPaymentMethods: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 16,
  },
  partPaymentMethodButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.grey[200],
    borderRadius: 8,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  selectedPartPaymentMethod: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  partPaymentMethodText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  selectedPartPaymentMethodText: {
    color: Colors.primary,
  },
  partPaymentAmountNote: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    textAlign: 'center',
  },
  receivablesSummary: {
    backgroundColor: Colors.success + '10',
    borderWidth: 1,
    borderColor: Colors.success + '30',
    borderRadius: 8,
    padding: 16,
    marginTop: 16,
    alignItems: 'center',
  },
  receivablesSummaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 8,
    textAlign: 'center',
  },
  receivablesSummaryText: {
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
    lineHeight: 20,
  },
  receivablesSummaryNote: {
    fontSize: 12,
    color: Colors.success,
    textAlign: 'center',
    fontStyle: 'italic',
  },
  
  // Cash Payment Input Container
  cashPaymentInputContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  
  // Bank Selection Note
  bankSelectionNote: {
    fontSize: 12,
    color: Colors.warning,
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  
  // Part Payment Enhanced Styles
  partPaymentRemainingAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  partPaymentInstruction: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  partPaymentMethodCards: {
    gap: 12,
    marginBottom: 16,
  },
  partPaymentMethodCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  selectedPartPaymentMethodCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  partPaymentMethodCardContent: {
    alignItems: 'center',
    gap: 8,
  },
  partPaymentMethodCardText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  selectedPartPaymentMethodCardText: {
    color: Colors.primary,
  },
  partPaymentMethodCardAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    textAlign: 'center',
  },
  
  // Receivables Confirmation Modal Styles
  receivablesModalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 450,
  },
  receivablesModalContent: {
    padding: 20,
  },
  receivablesModalSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  receivablesSummaryContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  receivablesSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  receivablesSummaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  receivablesSummaryValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  receivablesTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  receivablesTotalLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  receivablesTotalValue: {
    fontSize: 16,
    color: Colors.success,
    fontWeight: '700',
  },
  receivablesModalNote: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  receivablesModalButtons: {
    gap: 12,
  },
  receivablesCancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    borderWidth: 2,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  receivablesCancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  receivablesConfirmButton: {
    paddingVertical: 14,
    paddingHorizontal: 20,
    backgroundColor: Colors.success,
    borderRadius: 12,
    alignItems: 'center',
  },
  receivablesConfirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  
  // Remaining Amount Styles
  remainingAmountTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  remainingAmountSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 20,
  },
  remainingAmountMethods: {
    gap: 12,
    marginBottom: 16,
  },
  remainingAmountMethodCard: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderWidth: 2,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    backgroundColor: Colors.background,
  },
  selectedRemainingAmountMethodCard: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '10',
  },
  remainingAmountMethodContent: {
    alignItems: 'center',
    gap: 8,
  },
  remainingAmountMethodText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  selectedRemainingAmountMethodText: {
    color: Colors.primary,
  },
  remainingAmountMethodAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    textAlign: 'center',
  },
  
  // Payment Action Buttons
  paymentActionButtons: {
    gap: 12,
    marginTop: 16,
  },
  completePaymentButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  completePaymentButtonText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  addToReceivablesButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  addToReceivablesButtonText: {
    color: Colors.background,
    fontSize: 18,
    fontWeight: '600',
  },
  
  // Continue Button Styles
  continueButtonContainer: {
    marginTop: 16,
    alignItems: 'center',
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    marginBottom: 8,
  },
  continueButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  continueButtonNote: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  
  // Remaining Amount Header
  remainingAmountHeader: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    alignItems: 'center',
  },
  
  // Part Payment Confirmation Modal Styles
  partPaymentModalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 450,
  },
  partPaymentModalContent: {
    padding: 20,
  },
  partPaymentModalSubtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  partPaymentSummaryContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  partPaymentSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  partPaymentSummaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  partPaymentSummaryValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  partPaymentTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  partPaymentTotalLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  partPaymentTotalValue: {
    fontSize: 16,
    color: Colors.success,
    fontWeight: '700',
  },
  partPaymentModalNote: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 24,
    lineHeight: 20,
    fontStyle: 'italic',
  },
  partPaymentModalButtons: {
    alignItems: 'center',
  },
  partPaymentConfirmButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 32,
    alignItems: 'center',
    width: '100%',
  },
  partPaymentConfirmButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  
  // Modal Title Container Styles
  modalTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalTitleIcon: {
    marginRight: 8,
  },
  
  // Receivables Modal Note Styles
  receivablesModalNoteContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 24,
    paddingHorizontal: 4,
  },
  receivablesModalNoteIcon: {
    marginRight: 8,
    marginTop: 2,
  },
  
  // Status Container Styles
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusIcon: {
    marginRight: 6,
  },
});