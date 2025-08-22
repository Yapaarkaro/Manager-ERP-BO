import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Search, 
  X, 
  Hash,
  ChevronDown,
  AlertTriangle
} from 'lucide-react-native';
import { verifyGSTIN } from '@/services/gstinApi';
import { dataStore, Customer } from '@/utils/dataStore';
import AddressAutocomplete from '@/components/AddressAutocomplete';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3F66AC',
  secondary: '#FFC754',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  white: '#FFFFFF',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

interface CustomerFormData {
  name: string;
  businessName: string;
  customerType: 'business' | 'individual';
  contactPerson: string;
  mobile: string;
  email: string;
  address: string;
  gstin: string;
  paymentTerms: string;
  customPaymentTerms: string;
  creditLimit: string;
  notes: string;
}



const paymentTerms = [
  'Net 30 Days',
  'Net 15 Days', 
  'Net 7 Days',
  'Due on Receipt',
  'Cash on Delivery (COD)',
  '2/10 Net 30',
  'Others'
];

export default function AddCustomerScreen() {
  const [formData, setFormData] = useState<CustomerFormData>({
    name: '',
    businessName: '',
    customerType: 'business',
    contactPerson: '',
    mobile: '',
    email: '',
    address: '',
    gstin: '',
    paymentTerms: '',
    customPaymentTerms: '',
    creditLimit: '',
    notes: '',
  });

  const [showGstinModal, setShowGstinModal] = useState(false);
  const [showPaymentTermsModal, setShowPaymentTermsModal] = useState(false);
  const [gstinSearch, setGstinSearch] = useState('');
  const [isLoadingGstin, setIsLoadingGstin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const updateFormData = (field: keyof CustomerFormData, value: string | string[]) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleGstinLookup = async () => {
    const gstinUpper = gstinSearch.toUpperCase().trim();
    if (!gstinUpper) {
      Alert.alert('Invalid GSTIN', 'Please enter a valid GSTIN number');
      return;
    }

    setIsLoadingGstin(true);
    
    try {
      const result = await verifyGSTIN(gstinUpper);
      
      if (result.error) {
        Alert.alert('GSTIN Verification Failed', result.message || 'Invalid GSTIN number');
      } else if (result.taxpayerInfo) {
        const gstinData = result.taxpayerInfo;
        
        // Auto-fill business information from GSTIN data
        setFormData(prev => ({
          ...prev,
          businessName: gstinData.tradeNam || gstinData.lgnm || '',
          name: gstinData.lgnm || '',
          gstin: gstinUpper,
          address: gstinData.pradr?.addr ? 
            `${gstinData.pradr.addr.bno || ''} ${gstinData.pradr.addr.bnm || ''}, ${gstinData.pradr.addr.st || ''}, ${gstinData.pradr.addr.loc || ''}, ${gstinData.pradr.addr.city || ''}, ${gstinData.pradr.addr.stcd || ''} - ${gstinData.pradr.addr.pncd || ''}`.replace(/\s+/g, ' ').trim() : '',
        }));

        setShowGstinModal(false);
        setGstinSearch('');
        Alert.alert('GSTIN Found', 'Business details have been auto-filled. Please complete the remaining information.');
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
      updateFormData('paymentTerms', terms);
      updateFormData('customPaymentTerms', ''); // Clear previous custom terms
      setShowPaymentTermsModal(false);
    } else {
      updateFormData('paymentTerms', terms);
      updateFormData('customPaymentTerms', ''); // Clear custom terms if not Others
      setShowPaymentTermsModal(false);
    }
  };

  const handleAddressSelect = (address: any) => {
    updateFormData('address', address.formatted_address);
  };

  const updateFormAddress = (text: string) => {
    updateFormData('address', text);
  };

  const isFormValid = () => {
    const baseValidation = (
      formData.mobile.trim().length > 0 &&
      formData.address.trim().length > 0
    );

    if (formData.customerType === 'business') {
      // Check if custom payment terms are required for business customers
      const paymentTermsValid = formData.paymentTerms !== 'Others' || 
        (formData.paymentTerms === 'Others' && formData.customPaymentTerms.trim().length > 0);
      
      return baseValidation && 
        formData.businessName.trim().length > 0 &&
        formData.contactPerson.trim().length > 0 &&
        paymentTermsValid;
    }

    // For individual customers, only basic validation is required
    return baseValidation && formData.name.trim().length > 0;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    const customerData: Customer = {
      id: `CUST_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name.trim(),
      businessName: formData.businessName.trim(),
      customerType: formData.customerType,
      contactPerson: formData.contactPerson.trim(),
      mobile: formData.mobile.trim(),
      email: formData.email.trim(),
      address: formData.address.trim(),
      gstin: formData.gstin.trim(),
      paymentTerms: formData.paymentTerms === 'Others' ? formData.customPaymentTerms : formData.paymentTerms,
      creditLimit: formData.creditLimit ? parseFloat(formData.creditLimit) : 0,
      categories: [],
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
      customerScore: 85,
      onTimePayment: 90,
      satisfactionRating: 4.5,
      responseTime: 2.1,
      totalOrders: 0,
      completedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      returnedOrders: 0,
      totalValue: 0,
      averageOrderValue: 0,
      returnRate: 0,
      lastOrderDate: null,
      joinedDate: new Date().toISOString(),
      status: 'active',
      createdAt: new Date().toISOString(),
    };

    // Add customer to data store
    dataStore.addCustomer(customerData);

    console.log('Creating new customer:', customerData);
    
    setTimeout(() => {
      Alert.alert('Success', 'Customer added successfully', [
        {
          text: 'OK',
          onPress: () => {
            // Navigate back to customers list
            router.back();
          }
        }
      ]);
      setIsSubmitting(false);
    }, 1000);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              // Navigate back to customers list
              router.back();
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Add New Customer</Text>
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: 100 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {/* Customer Type Toggle - Moved to top */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Customer Type</Text>
              <View style={styles.toggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    formData.customerType === 'business' && styles.activeToggleButton,
                  ]}
                  onPress={() => updateFormData('customerType', 'business')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    formData.customerType === 'business' && styles.activeToggleButtonText,
                  ]}>
                    Business
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.toggleButton,
                    formData.customerType === 'individual' && styles.activeToggleButton,
                  ]}
                  onPress={() => updateFormData('customerType', 'individual')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.toggleButtonText,
                    formData.customerType === 'individual' && styles.activeToggleButtonText,
                  ]}>
                    Individual
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* GSTIN Lookup Section - Only for Business */}
            {formData.customerType === 'business' && (
              <View style={styles.section}>
                <Text style={styles.sectionTitle}>GSTIN Lookup</Text>
                <Text style={styles.sectionSubtitle}>
                  Enter GSTIN to auto-fill business details
                </Text>
                
                <TouchableOpacity
                  style={styles.gstinButton}
                  onPress={() => setShowGstinModal(true)}
                  activeOpacity={0.7}
                >
                  <Hash size={20} color={Colors.primary} />
                  <Text style={styles.gstinButtonText}>
                    {formData.gstin ? `GSTIN: ${formData.gstin}` : 'Enter GSTIN to auto-fill details'}
                  </Text>
                  <Search size={20} color={Colors.primary} />
                </TouchableOpacity>
              </View>
            )}

            {/* Customer Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {formData.customerType === 'business' ? 'Business Information' : 'Personal Information'}
              </Text>
              
              {formData.customerType === 'business' && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Business Name *</Text>
                    <View style={styles.inputContainer}>
                      <Building2 size={20} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.businessName}
                        onChangeText={(text) => updateFormData('businessName', text)}
                        placeholder="Enter business name"
                        placeholderTextColor={Colors.textLight}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>GSTIN</Text>
                    <View style={styles.inputContainer}>
                      <Hash size={20} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.gstin}
                        onChangeText={(text) => updateFormData('gstin', text.toUpperCase())}
                        placeholder="Enter GSTIN number"
                        placeholderTextColor={Colors.textLight}
                        autoCapitalize="characters"
                        maxLength={15}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Contact Person *</Text>
                    <View style={styles.inputContainer}>
                      <User size={20} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.contactPerson}
                        onChangeText={(text) => updateFormData('contactPerson', text)}
                        placeholder="Enter contact person name"
                        placeholderTextColor={Colors.textLight}
                        autoCapitalize="words"
                      />
                    </View>
                  </View>
                </>
              )}

              {formData.customerType === 'individual' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Full Name *</Text>
                  <View style={styles.inputContainer}>
                    <User size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.name}
                      onChangeText={(text) => updateFormData('name', text)}
                      placeholder="Enter full name"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="words"
                    />
                  </View>
                </View>
              )}

              <View style={styles.rowContainer}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Mobile *</Text>
                  <View style={styles.inputContainer}>
                    <Phone size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.mobile}
                      onChangeText={(text) => updateFormData('mobile', text.replace(/\D/g, '').slice(0, 10))}
                      placeholder="Enter mobile number"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Email</Text>
                  <View style={styles.inputContainer}>
                    <Mail size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.email}
                      onChangeText={(text) => updateFormData('email', text)}
                      placeholder="Enter email address"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address *</Text>
                <AddressAutocomplete
                  placeholder="Search for address or enter manually"
                  value={formData.address}
                  onChangeText={(text) => updateFormAddress(text)}
                  onAddressSelect={handleAddressSelect}
                  isSettingQueryProgrammatically={false}
                />
              </View>
            </View>

            {/* Customer Details */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                {formData.customerType === 'business' ? 'Business Details' : 'Customer Details'}
              </Text>
              
              {/* Payment Terms - Only for Business Customers */}
              {formData.customerType === 'business' && (
                <View style={styles.inputGroup}>
                  <Text style={[
                    styles.label,
                    formData.paymentTerms === 'Others' && styles.requiredLabel
                  ]}>
                    Payment Terms{formData.paymentTerms === 'Others' ? ' *' : ''}
                  </Text>
                  <View style={[
                    styles.inputContainer,
                    formData.paymentTerms === 'Others' && styles.customInputContainer
                  ]}>
                    {formData.paymentTerms === 'Others' ? (
                      <TextInput
                        style={styles.input}
                        value={formData.customPaymentTerms}
                        onChangeText={(text) => updateFormData('customPaymentTerms', text)}
                        placeholder="Enter your custom payment terms"
                        placeholderTextColor={Colors.textLight}
                        autoCapitalize="words"
                      />
                    ) : (
                      <TouchableOpacity
                        style={styles.dropdownButton}
                        onPress={() => setShowPaymentTermsModal(true)}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.dropdownButtonText,
                          !formData.paymentTerms && styles.placeholderText
                        ]}>
                          {formData.paymentTerms || 'Select payment terms'}
                        </Text>
                      </TouchableOpacity>
                    )}
                    <TouchableOpacity
                      style={[
                        styles.dropdownIconButton,
                        formData.paymentTerms === 'Others' && styles.customDropdownIconButton
                      ]}
                      onPress={() => setShowPaymentTermsModal(true)}
                      activeOpacity={0.7}
                    >
                      <ChevronDown size={20} color={formData.paymentTerms === 'Others' ? Colors.text : Colors.textLight} />
                    </TouchableOpacity>
                  </View>
                </View>
              )}

              {/* Credit Limit - Only for Business Customers */}
              {formData.customerType === 'business' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Credit Limit (₹)</Text>
                  <View style={styles.inputContainer}>
                    <Text style={styles.currencySymbol}>₹</Text>
                    <TextInput
                      style={styles.input}
                      value={formData.creditLimit}
                      onChangeText={(text) => updateFormData('creditLimit', text.replace(/[^0-9]/g, ''))}
                      placeholder="0"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                    />
                  </View>
                </View>
              )}



              <View style={styles.inputGroup}>
                <Text style={styles.label}>Notes</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={formData.notes}
                    onChangeText={(text) => updateFormData('notes', text)}
                    placeholder="Add any additional notes"
                    placeholderTextColor={Colors.textLight}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              isFormValid() ? styles.enabledButton : styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.submitButtonText,
              isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
            ]}>
              {isSubmitting ? 'Adding Customer...' : 'Add Customer'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* GSTIN Lookup Modal */}
      <Modal
        visible={showGstinModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowGstinModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>GSTIN Lookup</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowGstinModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Enter GSTIN Number</Text>
              <View style={styles.modalInputContainer}>
                <Hash size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  value={gstinSearch}
                  onChangeText={setGstinSearch}
                  placeholder="Enter 15-digit GSTIN"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="characters"
                  maxLength={15}
                  autoFocus={true}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowGstinModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  (!gstinSearch.trim() || isLoadingGstin) && styles.disabledButton
                ]}
                onPress={handleGstinLookup}
                disabled={!gstinSearch.trim() || isLoadingGstin}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>
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
        animationType="slide"
        onRequestClose={() => setShowPaymentTermsModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Payment Terms</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowPaymentTermsModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {paymentTerms.map((terms) => (
                <TouchableOpacity
                  key={terms}
                  style={[
                    styles.modalItem,
                    formData.paymentTerms === terms && styles.selectedOption
                  ]}
                  onPress={() => handlePaymentTermsSelect(terms)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalItemText,
                    formData.paymentTerms === terms && styles.selectedOptionText
                  ]}>
                    {terms}
                  </Text>
                  {formData.paymentTerms === terms && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.selectedText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
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
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeToggleButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  gstinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
  },
  gstinButtonText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
    flex: 1,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    marginLeft: 2,
  },
  requiredLabel: {
    color: Colors.primary,
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
    height: 48,
    justifyContent: 'space-between',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    width: '100%',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    height: 24,
    paddingVertical: 0,
    textAlignVertical: 'center',
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  dropdownButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: 'transparent',
    borderWidth: 0,
    borderRadius: 0,
    paddingHorizontal: 0,
    paddingVertical: 0,
    flex: 1,
    height: 48,
    width: '100%',
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  dropdownButtonText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  dropdownIcon: {
    marginLeft: 8,
  },
  dropdownIconButton: {
    padding: 8,
    marginLeft: 8,
    borderRadius: 6,
    backgroundColor: Colors.grey[100],
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  customInputContainer: {
    borderColor: Colors.primary,
    backgroundColor: Colors.grey[50],
  },
  customDropdownIconButton: {
    backgroundColor: Colors.grey[200],
  },
  placeholderText: {
    color: Colors.textLight,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 16,
    alignItems: 'flex-start',
  },
  halfWidth: {
    flex: 1,
    minWidth: 0,
    marginBottom: 16,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
    textAlignVertical: 'center',
    includeFontPadding: false,
  },
  submitSection: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    paddingHorizontal: 0,
    paddingVertical: 0,
  },
  submitButton: {
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
  submitButtonText: {
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
    maxHeight: '80%',
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
  modalInputGroup: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedOption: {
    backgroundColor: '#f0f4ff',
  },
  selectedOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  selectedIndicator: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  cancelButton: {
    backgroundColor: Colors.grey[200],
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  confirmButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
}); 