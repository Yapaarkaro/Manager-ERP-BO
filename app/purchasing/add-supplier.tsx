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
import { router, useLocalSearchParams } from 'expo-router';
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
  Plus,
  AlertTriangle,
  ChevronDown,
  Map
} from 'lucide-react-native';
import { verifyGSTIN } from '@/services/gstinApi';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import { dataStore, Supplier } from '@/utils/dataStore';

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

interface SupplierFormData {
  businessName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  pincode: string;
  state: string;
  gstin: string;
  notes: string;
}

const indianStates = [
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Assam', code: '18' },
  { name: 'Bihar', code: '10' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Goa', code: '30' },
  { name: 'Gujarat', code: '24' },
  { name: 'Haryana', code: '06' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Karnataka', code: '29' },
  { name: 'Kerala', code: '32' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Manipur', code: '14' },
  { name: 'Meghalaya', code: '17' },
  { name: 'Mizoram', code: '15' },
  { name: 'Nagaland', code: '13' },
  { name: 'Odisha', code: '21' },
  { name: 'Punjab', code: '03' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Sikkim', code: '11' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Tripura', code: '16' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'West Bengal', code: '19' },
  { name: 'Delhi', code: '07' },
  { name: 'Jammu and Kashmir', code: '01' },
  { name: 'Ladakh', code: '38' },
  { name: 'Chandigarh', code: '04' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: '26' },
  { name: 'Lakshadweep', code: '31' },
  { name: 'Puducherry', code: '34' },
  { name: 'Andaman and Nicobar Islands', code: '35' }
];

export default function AddSupplierScreen() {
  const { returnToStockIn, returnToAddProduct } = useLocalSearchParams();
  const [formData, setFormData] = useState<SupplierFormData>({
    businessName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    city: '',
    pincode: '',
    state: '',
    gstin: '',
    notes: '',
  });

  const [showGstinModal, setShowGstinModal] = useState(false);
  const [showStateModal, setShowStateModal] = useState(false);
  const [gstinSearch, setGstinSearch] = useState('');
  const [stateSearch, setStateSearch] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [isLoadingGstin, setIsLoadingGstin] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);

  const updateFormData = (field: keyof SupplierFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Function to convert text to camel case (capitalize first letter of each word)
  const toCamelCase = (text: string): string => {
    return text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  };

  // Function to handle text input with camel case formatting
  const handleTextInput = (field: keyof SupplierFormData, text: string) => {
    let formattedText = text;
    
    // Apply camel case formatting for specific fields
    if (['businessName', 'contactPerson', 'addressLine1', 'addressLine2', 'addressLine3', 'city', 'state'].includes(field)) {
      formattedText = toCamelCase(text);
    }
    
    updateFormData(field, formattedText);
  };

  // Shared function to parse address components with enhanced logic
  const parseAddressComponents = (addressString: string, rawCity?: string, rawState?: string, rawPincode?: string) => {
    const addressParts = addressString.split(',').map((part: string) => part.trim());
    
    // Extract address components
    let addressLine1 = addressParts[0] || '';
    let addressLine2 = addressParts[1] || '';
    let addressLine3 = addressParts[2] || '';
    let city = rawCity || '';
    let state = rawState || '';
    let pincode = rawPincode || '';

    // Clean city name - remove numbers, extra spaces, and ensure it's just the city name
    const cleanCityName = (cityName: string): string => {
      if (!cityName) return '';
      
      // Remove any numbers and special characters, keep only letters and spaces
      let cleaned = cityName.replace(/[0-9]/g, '').replace(/[^\w\s]/g, '');
      
      // Remove extra spaces and trim
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      
      // If the cleaned name is too short, return empty
      if (cleaned.length < 2) return '';
      
      return cleaned;
    };

    // Better parsing for city and state
    if (addressParts.length > 3) {
      // First, find pincode
      for (let i = addressParts.length - 1; i >= 0; i--) {
        const part = addressParts[i];
        if (/\d{6}/.test(part)) {
          pincode = part.match(/\d{6}/)?.[0] || pincode;
          break;
        }
      }

      // Find state by looking for exact matches in our state list
      for (let i = addressParts.length - 1; i >= 0; i--) {
        const part = addressParts[i];
        // Skip if it's a pincode
        if (/\d{6}/.test(part)) continue;
        
        // Look for exact state match
        const matchingState = indianStates.find(s => 
          s.name.toLowerCase() === part.toLowerCase()
        );
        
        if (matchingState) {
          state = matchingState.name;
          break;
        }
      }

      // Find city - look for parts that are not states, pincodes, or common address words
      const commonAddressWords = ['road', 'street', 'avenue', 'lane', 'colony', 'nagar', 'area', 'india', 'puram', 'palayam', 'patti'];
      const commonSuffixes = ['puram', 'palayam', 'patti', 'nagar', 'colony'];
      
      // First, try to find a part that looks like a major city (not a locality)
      for (let i = 1; i < addressParts.length - 1; i++) {
        const part = addressParts[i];
        
        // Skip if it's a pincode, state, or common address word
        if (/\d{6}/.test(part)) continue;
        if (indianStates.some(s => s.name.toLowerCase() === part.toLowerCase())) continue;
        if (commonAddressWords.some(word => part.toLowerCase().includes(word))) continue;
        
        // Skip if it ends with common locality suffixes
        if (commonSuffixes.some(suffix => part.toLowerCase().endsWith(suffix))) continue;
        
        // If this part looks like a city (not too short, not a number, not a locality)
        if (part.length > 2 && !/^\d+$/.test(part)) {
          city = cleanCityName(part);
          break;
        }
      }
      
      // If no city found, try to find the most likely city name
      if (!city) {
        for (let i = 1; i < addressParts.length - 1; i++) {
          const part = addressParts[i];
          
          // Skip if it's a pincode or state
          if (/\d{6}/.test(part)) continue;
          if (indianStates.some(s => s.name.toLowerCase() === part.toLowerCase())) continue;
          
          // If this part looks like a city (not too short, not a number)
          if (part.length > 2 && !/^\d+$/.test(part)) {
            city = cleanCityName(part);
            break;
          }
        }
      }
    }

    // Clean the final city name
    city = cleanCityName(city);

    return { addressLine1, addressLine2, addressLine3, city, state, pincode };
  };

  // Function to map GSTIN state data to our state names
  const mapGstinStateToStateName = (gstinState: string): string => {
    if (!gstinState) return '';
    
    const stateLower = gstinState.toLowerCase();
    
    // Direct matches
    const directMatch = indianStates.find(state => 
      state.name.toLowerCase() === stateLower ||
      state.name.toLowerCase().includes(stateLower) ||
      stateLower.includes(state.name.toLowerCase())
    );
    
    if (directMatch) {
      return directMatch.name;
    }
    
    // Common abbreviations and variations
    const stateMappings: { [key: string]: string } = {
      'tn': 'Tamil Nadu',
      'tamilnadu': 'Tamil Nadu',
      'tamil nadu': 'Tamil Nadu',
      'ap': 'Andhra Pradesh',
      'andhrapradesh': 'Andhra Pradesh',
      'andhra pradesh': 'Andhra Pradesh',
      'ka': 'Karnataka',
      'karnataka': 'Karnataka',
      'mh': 'Maharashtra',
      'maharashtra': 'Maharashtra',
      'dl': 'Delhi',
      'delhi': 'Delhi',
      'gj': 'Gujarat',
      'gujarat': 'Gujarat',
      'up': 'Uttar Pradesh',
      'uttarpradesh': 'Uttar Pradesh',
      'uttar pradesh': 'Uttar Pradesh',
      'wb': 'West Bengal',
      'westbengal': 'West Bengal',
      'west bengal': 'West Bengal',
      'hr': 'Haryana',
      'haryana': 'Haryana',
      'pb': 'Punjab',
      'punjab': 'Punjab',
      'mp': 'Madhya Pradesh',
      'madhyapradesh': 'Madhya Pradesh',
      'madhya pradesh': 'Madhya Pradesh',
      'rj': 'Rajasthan',
      'rajasthan': 'Rajasthan',
      'kl': 'Kerala',
      'kerala': 'Kerala',
      'or': 'Odisha',
      'odisha': 'Odisha',
      'orissa': 'Odisha',
      'jh': 'Jharkhand',
      'jharkhand': 'Jharkhand',
      'ct': 'Chhattisgarh',
      'chhattisgarh': 'Chhattisgarh',
      'chattisgarh': 'Chhattisgarh',
      'as': 'Assam',
      'assam': 'Assam',
      'br': 'Bihar',
      'bihar': 'Bihar',
      'uk': 'Uttarakhand',
      'uttarakhand': 'Uttarakhand',
      'ut': 'Uttarakhand',
      'hp': 'Himachal Pradesh',
      'himachalpradesh': 'Himachal Pradesh',
      'himachal pradesh': 'Himachal Pradesh',
      'ga': 'Goa',
      'goa': 'Goa',
      'mn': 'Manipur',
      'manipur': 'Manipur',
      'ml': 'Meghalaya',
      'meghalaya': 'Meghalaya',
      'mz': 'Mizoram',
      'mizoram': 'Mizoram',
      'nl': 'Nagaland',
      'nagaland': 'Nagaland',
      'ar': 'Arunachal Pradesh',
      'arunachalpradesh': 'Arunachal Pradesh',
      'arunachal pradesh': 'Arunachal Pradesh',
      'sk': 'Sikkim',
      'sikkim': 'Sikkim',
      'tr': 'Tripura',
      'tripura': 'Tripura',
      'an': 'Andaman and Nicobar Islands',
      'andamanandnicobar': 'Andaman and Nicobar Islands',
      'andaman and nicobar': 'Andaman and Nicobar Islands',
      'ch': 'Chandigarh',
      'chandigarh': 'Chandigarh',
      'dn': 'Dadra and Nagar Haveli and Daman and Diu',
      'dadraandnagarhaveli': 'Dadra and Nagar Haveli and Daman and Diu',
      'ld': 'Ladakh',
      'ladakh': 'Ladakh',
      'py': 'Puducherry',
      'puducherry': 'Puducherry',
      'lk': 'Lakshadweep',
      'lakshadweep': 'Lakshadweep',
      'jk': 'Jammu and Kashmir',
      'jammuandkashmir': 'Jammu and Kashmir',
      'jammu and kashmir': 'Jammu and Kashmir',
      'tg': 'Telangana',
      'telangana': 'Telangana',
    };
    
    // Check for mapped state
    const mappedState = stateMappings[stateLower];
    if (mappedState) {
      return mappedState;
    }
    
    // If no match found, return the original state name
    return gstinState;
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
      if (!result.error && result.taxpayerInfo) {
        const gstinData = result.taxpayerInfo;
        const address = gstinData.pradr?.addr;
        
        // Create a formatted address string from GSTIN data
        const addressString = address ? 
          `${address.bno || ''} ${address.bnm || ''}, ${address.st || ''}, ${address.city || ''}, ${address.stcd || ''}, ${address.pncd || ''}`.trim() : '';
        
        // Parse the address string to find state and city
        const addressParts = addressString.split(',').map((part: string) => part.trim());
        let foundState = '';
        let foundCity = '';
        
        // Find state by matching with our state list
        for (let i = addressParts.length - 1; i >= 0; i--) {
          const part = addressParts[i];
          
          // Skip if it's a pincode
          if (/\d{6}/.test(part)) continue;
          
          // Look for exact state match in our state list
          const matchingState = indianStates.find(state => 
            state.name.toLowerCase() === part.toLowerCase()
          );
          
          if (matchingState) {
            foundState = matchingState.name;
            // The city is the part before the state
            if (i > 0) {
              foundCity = addressParts[i - 1];
            }
            break;
          }
        }
        
        // Clean city name - remove numbers and extra spaces
        const cleanCityName = (cityName: string): string => {
          if (!cityName) return '';
          let cleaned = cityName.replace(/[0-9]/g, '').replace(/[^\w\s]/g, '');
          cleaned = cleaned.replace(/\s+/g, ' ').trim();
          return cleaned.length >= 2 ? cleaned : '';
        };
        
        // Use the parsed address data
        setFormData(prev => ({
          ...prev,
          businessName: gstinData.tradeNam || gstinData.lgnm || '',
          gstin: gstinUpper,
          addressLine1: address ? `${address.bno || ''} ${address.bnm || ''}`.trim() : '',
          addressLine2: address?.st || '',
          addressLine3: '',
          city: cleanCityName(foundCity),
          state: foundState,
          pincode: address?.pncd || '',
        }));
        setShowGstinModal(false);
        Alert.alert('Success', 'Business details auto-filled from GSTIN');
      } else {
        Alert.alert('GSTIN Lookup Failed', result.message || 'Unable to verify GSTIN');
      }
    } catch (error) {
      Alert.alert('Error', 'Failed to verify GSTIN. Please try again.');
    } finally {
      setIsLoadingGstin(false);
    }
  };

  const handleStateSelect = (state: string) => {
    updateFormData('state', state);
    setShowStateModal(false);
    setStateSearch('');
  };

  const filteredStates = indianStates.filter(state =>
    state.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    state.code.includes(stateSearch)
  );

  const handleAddressSelect = (address: any) => {
    // Use the shared parsing function
    const parsedAddress = parseAddressComponents(
      address.formatted_address,
      address.city,
      address.state,
      address.pincode
    );

    setFormData(prev => ({
      ...prev,
      addressLine1: parsedAddress.addressLine1,
      addressLine2: parsedAddress.addressLine2,
      addressLine3: parsedAddress.addressLine3,
      city: parsedAddress.city,
      state: parsedAddress.state,
      pincode: parsedAddress.pincode,
    }));
    
    setShowMap(false);
    setAddressSearch('');
  };

  const isFormValid = () => {
    return (
      formData.businessName.trim().length > 0 &&
      formData.contactPerson.trim().length > 0 &&
      formData.mobile.trim().length === 10 &&
      formData.addressLine1.trim().length > 0 &&
      formData.city.trim().length > 0 &&
      formData.pincode.trim().length > 0 &&
      formData.state.trim().length > 0 &&
      formData.gstin.trim().length > 0
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    const newSupplier: Supplier = {
      id: `SUPP_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.contactPerson.trim(),
      businessName: formData.businessName.trim(),
      supplierType: 'business',
      contactPerson: formData.contactPerson.trim(),
      mobile: formData.mobile.trim(),
      email: formData.email.trim(),
      address: `${formData.addressLine1.trim()}, ${formData.addressLine2.trim() ? formData.addressLine2.trim() + ', ' : ''}${formData.addressLine3.trim() ? formData.addressLine3.trim() + ', ' : ''}${formData.city.trim()}, ${formData.pincode.trim()}, ${formData.state.trim()}`,
      gstin: formData.gstin.trim(),
      avatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
      supplierScore: 85,
      onTimeDelivery: 90,
      qualityRating: 4.5,
      responseTime: 2.1,
      totalOrders: 0,
      completedOrders: 0,
      pendingOrders: 0,
      cancelledOrders: 0,
      totalValue: 0,
      lastOrderDate: null,
      joinedDate: new Date().toISOString(),
      status: 'active',
      paymentTerms: 'Net 30 Days',
      deliveryTime: '3-5 Business Days',
      categories: ['Electronics', 'Accessories'],
      productCount: 0,
      createdAt: new Date().toISOString(),
    };

    // Add supplier to data store
    dataStore.addSupplier(newSupplier);

    console.log('Creating new supplier:', newSupplier);
    
    setTimeout(() => {
      Alert.alert('Success', 'Supplier added successfully', [
        {
          text: 'OK',
          onPress: () => {
            // Check if we should return to add product page
            if (returnToAddProduct === 'true') {
              // Return to add product page with the new supplier data
              const supplierData = {
                id: newSupplier.id,
                name: formData.contactPerson,
                gstin: formData.gstin,
                businessName: formData.businessName,
                address: `${formData.addressLine1}, ${formData.addressLine2 ? formData.addressLine2 + ', ' : ''}${formData.addressLine3 ? formData.addressLine3 + ', ' : ''}${formData.city}, ${formData.pincode}, ${formData.state}`,
              };
              
              // Navigate back to add product page with supplier data
              router.replace({
                pathname: '/inventory/manual-product',
                params: {
                  newSupplier: JSON.stringify(supplierData)
                }
              });
            }
            // Check if we should return to stock-in
            else if (returnToStockIn === 'true') {
              // Return to stock-in with the new supplier data
              const supplierData = {
                name: formData.contactPerson,
                gstin: formData.gstin,
                businessName: formData.businessName,
                address: `${formData.addressLine1}, ${formData.addressLine2 ? formData.addressLine2 + ', ' : ''}${formData.addressLine3 ? formData.addressLine3 + ', ' : ''}${formData.city}, ${formData.pincode}, ${formData.state}`,
              };
              
              // Navigate back to stock-in with supplier data
              router.push({
                pathname: '/inventory/stock-in/manual',
                params: {
                  newSupplier: JSON.stringify(supplierData)
                }
              });
            } else {
              // Return to suppliers list
              router.replace('/purchasing/suppliers');
            }
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
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Add New Supplier</Text>
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
            {/* GSTIN Lookup Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>GSTIN Lookup (Optional)</Text>
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

            {/* Business Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Business Information</Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Name *</Text>
                <View style={styles.inputContainer}>
                  <Building2 size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.businessName}
                    onChangeText={(text) => handleTextInput('businessName', text)}
                    placeholder="Enter business name"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="words"
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
                    onChangeText={(text) => {
                      // Remove any numeric characters and apply camel case
                      const cleanText = text.replace(/[0-9]/g, '');
                      handleTextInput('contactPerson', cleanText);
                    }}
                    placeholder="Enter contact person name"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="words"
                  />
                </View>
              </View>

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
                <Text style={styles.label}>GSTIN/PAN *</Text>
                <View style={styles.inputContainer}>
                  <Hash size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.gstin}
                    onChangeText={(text) => {
                      const upperText = text.toUpperCase();
                      // Auto-detect GSTIN vs PAN and set appropriate max length
                      const isGSTIN = /^\d/.test(upperText);
                      const maxLength = isGSTIN ? 15 : 10;
                      const limitedText = upperText.slice(0, maxLength);
                      updateFormData('gstin', limitedText);
                    }}
                    placeholder="Enter GSTIN (15 digits) or PAN (10 characters)"
                    placeholderTextColor={Colors.textLight}
                    autoCapitalize="characters"
                    maxLength={15}
                  />
                </View>
                <Text style={styles.helperText}>
                  {formData.gstin ? 
                    (/^\d/.test(formData.gstin) ? 'GSTIN detected (15 digits)' : 'PAN detected (10 characters)') : 
                    'GSTIN starts with number, PAN starts with letter'
                  }
                </Text>
              </View>
            </View>

            {/* Address Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Address Information</Text>
              
              <View style={styles.addressHeader}>
                <Text style={styles.label}>Address *</Text>
                <TouchableOpacity
                  style={styles.mapButton}
                  onPress={() => setShowMap(true)}
                  activeOpacity={0.7}
                >
                  <Map size={20} color={Colors.primary} />
                  <Text style={styles.mapButtonText}>Use Map</Text>
                </TouchableOpacity>
              </View>

              {showMap ? (
                <View style={styles.mapContainer}>
                  <AddressAutocomplete
                    placeholder="Search for address..."
                    value={addressSearch}
                    onChangeText={setAddressSearch}
                    onAddressSelect={handleAddressSelect}
                  />
                  <TouchableOpacity
                    style={styles.manualButton}
                    onPress={() => {
                      setShowMap(false);
                      setAddressSearch('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.manualButtonText}>Fill Manually Instead</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Address Line 1 *</Text>
                    <View style={styles.inputContainer}>
                      <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={formData.addressLine1}
                        onChangeText={(text) => handleTextInput('addressLine1', text)}
                        placeholder="Enter address line 1"
                        placeholderTextColor={Colors.textLight}
                      />
                    </View>
                  </View>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address Line 2</Text>
                <View style={styles.inputContainer}>
                  <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.addressLine2}
                    onChangeText={(text) => handleTextInput('addressLine2', text)}
                    placeholder="Enter address line 2 (optional)"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address Line 3</Text>
                <View style={styles.inputContainer}>
                  <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.input}
                    value={formData.addressLine3}
                    onChangeText={(text) => handleTextInput('addressLine3', text)}
                    placeholder="Enter address line 3 (optional)"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
              </View>

              <View style={styles.rowContainer}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>City *</Text>
                  <View style={styles.inputContainer}>
                    <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.city}
                      onChangeText={(text) => handleTextInput('city', text)}
                      placeholder="Enter city"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Pincode *</Text>
                  <View style={styles.inputContainer}>
                    <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.input}
                      value={formData.pincode}
                      onChangeText={(text) => updateFormData('pincode', text.replace(/\D/g, '').slice(0, 6))}
                      placeholder="Enter pincode"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>State *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowStateModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.state && styles.placeholderText
                  ]}>
                    {formData.state || 'Select state'}
                  </Text>
                  <ChevronDown size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Additional Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Additional Information</Text>
              
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
              styles.completeButton,
              isFormValid() ? styles.enabledButton : styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.completeButtonText,
              isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
            ]}>
              {isSubmitting ? 'Adding Supplier...' : 'Add Supplier'}
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
                  onChangeText={(text) => setGstinSearch(text.toUpperCase())}
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

      {/* State Selection Modal */}
      <Modal
        visible={showStateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowStateModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Search States</Text>
              <View style={styles.modalInputContainer}>
                <Search size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  value={stateSearch}
                  onChangeText={setStateSearch}
                  placeholder="Search by state name or code..."
                  placeholderTextColor={Colors.textLight}
                  autoFocus={true}
                />
              </View>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {filteredStates.map((state) => (
                <TouchableOpacity
                  key={state.code}
                  style={styles.stateOption}
                  onPress={() => handleStateSelect(state.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stateName}>{state.name}</Text>
                  <Text style={styles.stateCode}>Code: {state.code}</Text>
                </TouchableOpacity>
              ))}
              {filteredStates.length === 0 && (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>No states found matching "{stateSearch}"</Text>
                </View>
              )}
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
  gstinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  gstinButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  inputIcon: {
    marginRight: 8,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 12,
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  submitSection: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  completeButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  enabledButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  completeButtonText: {
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
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalInputGroup: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.background,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  stateOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  stateName: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  stateCode: {
    fontSize: 14,
    color: Colors.textLight,
  },
  noResultsContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
  },
  helperText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  addressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  mapButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  mapContainer: {
    marginBottom: 16,
  },
  manualButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  manualButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
}); 