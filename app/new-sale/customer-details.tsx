import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  User, 
  Phone, 
  MapPin, 
  Building2,
  Search,
  X
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

interface Customer {
  name: string;
  mobile: string;
  address: string;
  isBusinessCustomer: boolean;
  gstin?: string;
  businessName?: string;
  businessAddress?: string;
  shipToAddress?: string;
  paymentTerms?: string;
}

const presetPaymentTerms = [
  'Net 30 Days',
  'Net 15 Days',
  'Net 7 Days',
  'Due on Receipt',
  'Cash on Delivery (COD)',
  '2/10 Net 30',
  'Others'
];

export default function CustomerDetailsScreen() {
  const { cartItems, totalAmount } = useLocalSearchParams();
  const { preSelectedCustomer } = useLocalSearchParams();
  const [customer, setCustomer] = useState<Customer>({
    name: '',
    mobile: '',
    address: '',
    isBusinessCustomer: false,
  });
  const [showGstinModal, setShowGstinModal] = useState(false);
  const [gstinSearch, setGstinSearch] = useState('');
  const [isLoadingGstin, setIsLoadingGstin] = useState(false);
  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  const [customPaymentTerms, setCustomPaymentTerms] = useState('');

  // Pre-fill customer data if provided
  useEffect(() => {
    if (preSelectedCustomer) {
      try {
        const preSelected = JSON.parse(preSelectedCustomer as string);
        console.log('Pre-selected customer data:', preSelected);
        setCustomer(preSelected);
      } catch (error) {
        console.error('Error parsing pre-selected customer:', error);
      }
    }
  }, [preSelectedCustomer]);

  const handleGstinLookup = async () => {
    const gstinUpper = gstinSearch.toUpperCase().trim();
    if (!gstinUpper) {
      Alert.alert('Invalid GSTIN', 'Please enter a valid GSTIN number');
      return;
    }

    setIsLoadingGstin(true);
    
    try {
      // Use the existing GSTIN API
      const { verifyGSTIN } = require('@/services/gstinApi');
      const result = await verifyGSTIN(gstinUpper);
      
      if (result.error) {
        Alert.alert('GSTIN Verification Failed', result.message || 'Invalid GSTIN number');
      } else if (result.taxpayerInfo) {
        const gstinData = result.taxpayerInfo;
        
        setCustomer(prev => ({
          ...prev,
          businessName: gstinData.tradeNam || gstinData.lgnm || '',
          businessAddress: gstinData.pradr?.addr ? 
            `${gstinData.pradr.addr.bno || ''} ${gstinData.pradr.addr.bnm || ''}, ${gstinData.pradr.addr.st || ''}, ${gstinData.pradr.addr.loc || ''}, ${gstinData.pradr.addr.city || ''}, ${gstinData.pradr.addr.stcd || ''} - ${gstinData.pradr.addr.pncd || ''}`.replace(/\s+/g, ' ').trim() : '',
          name: gstinData.lgnm || '',
          gstin: gstinUpper,
          shipToAddress: '', // Reset ship-to address when GSTIN changes
        }));

        setShowGstinModal(false);
        setGstinSearch('');
        Alert.alert('GSTIN Found', 'Business details have been auto-filled');
      } else {
        Alert.alert('GSTIN Not Found', 'No data found for this GSTIN number');
      }
    } catch (error) {
      console.error('GSTIN lookup error:', error);
      Alert.alert('Network Error', 'Please check your connection and try again');
    } finally {
      setIsLoadingGstin(false);
    }
  };

  const handlePaymentTermsSelect = (terms: string) => {
    if (terms === 'Others') {
      setCustomPaymentTerms('');
      setShowPaymentTermsModal(false);
      // Keep modal closed but show custom input
    } else {
      setCustomPaymentTerms('');
      setCustomer(prev => ({ ...prev, paymentTerms: terms }));
      setShowPaymentTermsModal(false);
    }
  };

  const handleCustomPaymentTermsSubmit = () => {
    if (customPaymentTerms.trim()) {
      setCustomer(prev => ({ ...prev, paymentTerms: customPaymentTerms.trim() }));
      setCustomPaymentTerms('');
    }
  };

  const handleContinueToPayment = () => {
    if (!customer.name.trim() || !customer.mobile.trim()) {
      Alert.alert('Incomplete Details', 'Please fill in customer name and mobile number');
      return;
    }

    if (customer.mobile.length !== 10) {
      Alert.alert('Invalid Mobile', 'Please enter a valid 10-digit mobile number');
      return;
    }

    router.push({
      pathname: '/new-sale/payment',
      params: {
        cartItems,
        totalAmount,
        customerDetails: JSON.stringify(customer),
      }
    });
  };

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount));
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
          
          <Text style={styles.headerTitle}>Customer Details</Text>
          
          <View style={styles.headerRight}>
            <Text style={styles.totalAmount}>
              {formatAmount(totalAmount as string)}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Customer Type Toggle */}
        <View style={styles.customerTypeContainer}>
          <Text style={styles.sectionTitle}>Customer Type</Text>
          <View style={styles.toggleContainer}>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                !customer.isBusinessCustomer && styles.activeToggleButton,
              ]}
              onPress={() => setCustomer(prev => ({ ...prev, isBusinessCustomer: false }))}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.toggleButtonText,
                !customer.isBusinessCustomer && styles.activeToggleButtonText,
              ]}>
                Individual
              </Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[
                styles.toggleButton,
                customer.isBusinessCustomer && styles.activeToggleButton,
              ]}
              onPress={() => setCustomer(prev => ({ ...prev, isBusinessCustomer: true }))}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.toggleButtonText,
                customer.isBusinessCustomer && styles.activeToggleButtonText,
              ]}>
                Business
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* GSTIN Lookup for Business Customers */}
        {customer.isBusinessCustomer && (
          <View style={styles.gstinContainer}>
            <Text style={styles.sectionTitle}>GSTIN Lookup</Text>
            <TouchableOpacity
              style={styles.gstinButton}
              onPress={() => setShowGstinModal(true)}
              activeOpacity={0.7}
            >
              <Building2 size={20} color={Colors.primary} />
              <Text style={styles.gstinButtonText}>
                {customer.gstin ? `GSTIN: ${customer.gstin}` : 'Enter GSTIN to auto-fill details'}
              </Text>
              <Search size={20} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        )}

        {/* Customer Details Form */}
        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {customer.isBusinessCustomer ? 'Contact Person Name *' : 'Customer Name *'}
            </Text>
            <View style={styles.inputContainer}>
              <User size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={customer.name}
                onChangeText={(text) => setCustomer(prev => ({ ...prev, name: text }))}
                placeholder="Enter name"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Mobile Number *</Text>
            <View style={styles.inputContainer}>
              <Phone size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={customer.mobile}
                onChangeText={(text) => setCustomer(prev => ({ ...prev, mobile: text.replace(/\D/g, '').slice(0, 10) }))}
                placeholder="Enter mobile number"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>

          {customer.isBusinessCustomer && customer.businessName && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Business Name</Text>
              <View style={styles.inputContainer}>
                <Building2 size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={customer.businessName}
                  onChangeText={(text) => setCustomer(prev => ({ ...prev, businessName: text }))}
                  placeholder="Business name"
                  placeholderTextColor={Colors.textLight}
                  editable={false}
                />
              </View>
            </View>
          )}

          {customer.isBusinessCustomer && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Payment Terms</Text>
              {customer.paymentTerms === 'Others' || (customer.paymentTerms && !presetPaymentTerms.includes(customer.paymentTerms)) ? (
                <View style={styles.customTermsContainer}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={customPaymentTerms || customer.paymentTerms}
                      onChangeText={setCustomPaymentTerms}
                      placeholder="Enter custom payment terms"
                      placeholderTextColor={Colors.textLight}
                      onSubmitEditing={handleCustomPaymentTermsSubmit}
                      onBlur={handleCustomPaymentTermsSubmit}
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.changeTermsButton}
                    onPress={() => setShowPaymentTermsModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeTermsText}>Choose Preset</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  style={styles.paymentTermsButton}
                  onPress={() => setShowPaymentTermsModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.paymentTermsText,
                    !customer.paymentTerms && styles.placeholderText
                  ]}>
                    {customer.paymentTerms || 'Select payment terms'}
                  </Text>
                  <Text style={styles.dropdownIcon}>▼</Text>
                </TouchableOpacity>
              )}
            </View>
          )}

          {customer.isBusinessCustomer && customer.businessName && (
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Ship-to Address</Text>
              <View style={styles.inputContainer}>
                <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={[styles.input, styles.addressInput]}
                  value={customer.shipToAddress}
                  onChangeText={(text) => setCustomer(prev => ({ ...prev, shipToAddress: text }))}
                  placeholder="Enter shipping address (if different from business address)"
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
              </View>
              <Text style={styles.fieldHint}>
                Leave blank if same as business address
              </Text>
            </View>
          )}

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {customer.isBusinessCustomer && customer.businessAddress ? 'Business Address' : 'Address'}
            </Text>
            <View style={styles.inputContainer}>
              <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={[styles.input, styles.addressInput]}
                value={customer.isBusinessCustomer && customer.businessAddress ? customer.businessAddress : customer.address}
                onChangeText={(text) => setCustomer(prev => ({ ...prev, address: text }))}
                placeholder="Enter address"
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={3}
                textAlignVertical="top"
              />
            </View>
          </View>
        </View>

        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinueToPayment}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue to Payment</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* GSTIN Lookup Modal */}
      <Modal
        visible={showGstinModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowGstinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>GSTIN Lookup</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowGstinModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                Enter the GSTIN number to automatically fetch business details
              </Text>

              <View style={styles.gstinInputContainer}>
                <TextInput
                  style={styles.gstinInput}
                  value={gstinSearch}
                  onChangeText={(text) => setGstinSearch(text.toUpperCase())}
                  placeholder="Enter 15-digit GSTIN"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="characters"
                  maxLength={15}
                />
              </View>

              <TouchableOpacity
                style={[
                  styles.lookupButton,
                  (!gstinSearch.trim() || isLoadingGstin) && styles.disabledButton
                ]}
                onPress={handleGstinLookup}
                disabled={!gstinSearch.trim() || isLoadingGstin}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.lookupButtonText,
                  (!gstinSearch.trim() || isLoadingGstin) && styles.disabledButtonText
                ]}>
                  {isLoadingGstin ? 'Looking up...' : 'Lookup GSTIN'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Payment Terms Modal */}
      <Modal
        visible={showPaymentTermsModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowPaymentTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Payment Terms</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPaymentTermsModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                Select payment terms for this business customer
              </Text>

              <ScrollView style={styles.paymentTermsList} showsVerticalScrollIndicator={false}>
                {presetPaymentTerms.map((terms, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.paymentTermsOption,
                      customer.paymentTerms === terms && styles.selectedPaymentTermsOption
                    ]}
                    onPress={() => handlePaymentTermsSelect(terms)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.paymentTermsOptionText,
                      customer.paymentTerms === terms && styles.selectedPaymentTermsText
                    ]}>
                      {terms}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
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
  customerTypeContainer: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeToggleButton: {
    backgroundColor: '#3f66ac',
  },
  toggleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  activeToggleButtonText: {
    color: Colors.background,
  },
  gstinContainer: {
    marginBottom: 24,
  },
  gstinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 2,
    borderColor: '#3f66ac',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  gstinButtonText: {
    flex: 1,
    fontSize: 16,
    color: '#3f66ac',
    fontWeight: '500',
  },
  formContainer: {
    marginBottom: 32,
  },
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  inputIcon: {
    marginRight: 12,
    marginTop: 2,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    outlineStyle: 'none',
  },
  addressInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  continueButton: {
    backgroundColor: '#3f66ac',
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
  continueButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
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
  modalContent: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
    lineHeight: 20,
  },
  gstinInputContainer: {
    marginBottom: 20,
  },
  gstinInput: {
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
    fontFamily: 'monospace',
    letterSpacing: 1,
    outlineStyle: 'none',
  },
  lookupButton: {
    backgroundColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  lookupButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  disabledButtonText: {
    color: Colors.textLight,
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  customTermsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  changeTermsButton: {
    backgroundColor: '#3f66ac',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeTermsText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  paymentTermsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  paymentTermsText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  dropdownIcon: {
    fontSize: 12,
    color: Colors.textLight,
  },
  paymentTermsList: {
    maxHeight: 300,
  },
  paymentTermsOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  selectedPaymentTermsOption: {
    backgroundColor: '#f0f4ff',
  },
  paymentTermsOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedPaymentTermsText: {
    color: '#3f66ac',
    fontWeight: '600',
  },
});