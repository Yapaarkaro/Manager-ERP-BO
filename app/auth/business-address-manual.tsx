import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, ChevronDown, Search, X, Plus } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';

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
  { name: 'Andaman and Nicobar Islands', code: '35' },
  { name: 'Chandigarh', code: '04' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: '26' },
  { name: 'Delhi', code: '07' },
  { name: 'Jammu and Kashmir', code: '01' },
  { name: 'Ladakh', code: '38' },
  { name: 'Lakshadweep', code: '31' },
  { name: 'Puducherry', code: '34' },
];

export default function BusinessAddressManualScreen() {
  const { 
    type,
    value,
    gstinData,
    name,
    businessName,
    businessType,
    customBusinessType,
    addressType = 'primary',
    existingAddresses = '[]',
    editMode = 'false',
    editAddressId = '',
    prefilledAddressName = '',
    prefilledDoorNumber = '',
    prefilledStreet = '',
    prefilledArea = '',
    prefilledCity = '',
    prefilledState = '',
    prefilledPincode = '',
    prefilledFormatted = '',
  } = useLocalSearchParams();
  
  const [addressName, setAddressName] = useState(prefilledAddressName as string);
  const [addressLine1, setAddressLine1] = useState(prefilledStreet as string);
  const [addressLine2, setAddressLine2] = useState(prefilledArea as string);
  const [additionalLines, setAdditionalLines] = useState<string[]>([]);
  const [city, setCity] = useState(prefilledCity as string);
  const [pincode, setPincode] = useState(prefilledPincode as string);
  const [selectedState, setSelectedState] = useState<{ name: string; code: string } | null>(null);
  const [showStates, setShowStates] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const colors = useThemeColors();

  const typeInfo = React.useMemo(() => {
    // Default to primary address styling
    return {
      color: '#ffc754', // Primary business address color
      title: 'Primary Business Address',
      subtitle: 'Enter your primary business address details'
    };
  }, []);

  useEffect(() => {
    console.log('🏠 Business Address Manual Screen - Prefilled Data:');
    console.log('  - Address Name:', prefilledAddressName);
    console.log('  - Street:', prefilledStreet);
    console.log('  - Area:', prefilledArea);
    console.log('  - City:', prefilledCity);
    console.log('  - State:', prefilledState);
    console.log('  - Pincode:', prefilledPincode);
    console.log('  - Formatted:', prefilledFormatted);
    
    // Auto-fill address name with business name
    if (businessName && !addressName && addressType === 'primary') {
      setAddressName(businessName as string);
    }

    // Auto-select state if prefilled
    if (prefilledState) {
      const matchingState = indianStates.find(state => {
        const stateName = state.name.toLowerCase();
        const prefilledLower = (prefilledState as string).toLowerCase();
        
        // Exact match
        if (stateName === prefilledLower) return true;
        
        // Contains match
        if (stateName.includes(prefilledLower) || prefilledLower.includes(stateName)) return true;
        
        // Code match
        if (state.code === prefilledState) return true;
        
        return false;
      });
      
      if (matchingState) {
        setSelectedState(matchingState);
      }
    }

    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [businessName, prefilledState, addressType]);

  // Handle prefilled address data
  useEffect(() => {
    if (prefilledStreet) {
      console.log('🏠 Setting prefilled street:', prefilledStreet);
      setAddressLine1(prefilledStreet as string);
    }
    
    if (prefilledArea) {
      console.log('🏠 Setting prefilled area:', prefilledArea);
      setAddressLine2(prefilledArea as string);
    }
    
    if (prefilledCity) {
      console.log('🏠 Setting prefilled city:', prefilledCity);
      setCity(prefilledCity as string);
    }
    
    if (prefilledPincode) {
      console.log('🏠 Setting prefilled pincode:', prefilledPincode);
      setPincode(prefilledPincode as string);
    }
  }, [prefilledStreet, prefilledArea, prefilledCity, prefilledPincode]);

  const filteredStates = indianStates.filter(state =>
    state.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    state.code.includes(stateSearch)
  );

  const handleStateSelect = (state: { name: string; code: string }) => {
    setSelectedState(state);
    setStateSearch('');
    setShowStates(false);
  };

  const handleStateModalOpen = () => {
    setShowStates(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 300);
  };

  const addAddressLine = () => {
    if (additionalLines.length < 3) {
      setAdditionalLines([...additionalLines, '']);
    }
  };

  const updateAdditionalLine = (index: number, value: string) => {
    const newLines = [...additionalLines];
    newLines[index] = value;
    setAdditionalLines(newLines);
  };

  const removeAdditionalLine = (index: number) => {
    const newLines = additionalLines.filter((_, i) => i !== index);
    setAdditionalLines(newLines);
  };

  const handlePincodeChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    setPincode(cleaned);
  };

  const isFormValid = () => {
    return (
      addressName.trim().length > 0 &&
      addressLine1.trim().length > 0 &&
      city.trim().length > 0 &&
      pincode.trim().length === 6 &&
      /^\d{6}$/.test(pincode) &&
      selectedState !== null
    );
  };

  const handleSubmit = async () => {
    setIsLoading(true);
    
    // Parse existing addresses properly
    let existingAddressList = [];
    try {
      const existingAddressesParam = existingAddresses as string;
      if (existingAddressesParam && existingAddressesParam !== '[]') {
        existingAddressList = JSON.parse(existingAddressesParam);
      }
      console.log('📋 Existing addresses loaded:', existingAddressList);
    } catch (error) {
      console.log('No existing addresses or parse error:', error);
      existingAddressList = [];
    }
    
    let allAddresses;
    
    if (editMode === 'true' && editAddressId) {
      // Edit existing address
      allAddresses = existingAddressList.map((addr: any) => 
        addr.id === editAddressId 
          ? {
              ...addr,
              name: addressName.trim(),
              doorNumber: additionalLines.length > 0 ? additionalLines[0] : '',
              addressLine1: addressLine1.trim(),
              addressLine2: addressLine2.trim(),
              city: city.trim(),
              pincode: pincode,
              stateName: selectedState?.name || '',
              stateCode: selectedState?.code || '',
            }
          : addr
      );
      console.log('✏️ Edited address in list:', allAddresses);
    } else {
      // Create new address object
      const newAddress = {
        id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: addressName.trim(),
        type: addressType || 'primary',
        doorNumber: additionalLines.length > 0 ? additionalLines[0] : '',
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        pincode: pincode,
        stateName: selectedState?.name || '',
        stateCode: selectedState?.code || '',
        isPrimary: (addressType || 'primary') === 'primary',
      };
      
      console.log('🆕 Creating new address:', newAddress);
      console.log('📝 Adding to existing addresses:', existingAddressList);
      
      // Add new address to existing addresses
      allAddresses = [...existingAddressList, newAddress];
      console.log('📦 Final address list:', allAddresses);
    }
    
    setTimeout(() => {
      // Navigate to address confirmation with all addresses
      router.push({
        pathname: '/auth/address-confirmation',
        params: {
          type,
          value,
          gstinData,
          name,
          businessName,
          businessType,
          customBusinessType,
          allAddresses: JSON.stringify(allAddresses),
        }
      });
      setIsLoading(false);
    }, 500);
  };

  const slideTransform = {
    transform: [
      {
        translateY: slideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 0],
        }),
      },
    ],
    opacity: slideAnimation,
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#3f66ac" />
          </TouchableOpacity>

          <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.content, slideTransform]}>
              <View style={styles.iconContainer}>
                <View style={styles.iconWrapper}>
                  <MapPin size={48} color="#3f66ac" strokeWidth={2.5} />
                </View>
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title}>Primary Business Address</Text>
                <Text style={styles.subtitle}>
                  Enter your primary business address details
                </Text>
                
                <View style={styles.primaryNotice}>
                  <Text style={styles.primaryNoticeText}>
                    📍 This is your <Text style={styles.primaryBold}>Primary Address</Text>
                  </Text>
                  <Text style={styles.primaryNoticeSubtext}>
                    You can add more locations later
                  </Text>
                </View>
              </View>

              {prefilledFormatted ? (
                <View style={styles.prefilledSection}>
                  <Text style={styles.prefilledLabel}>Selected Address:</Text>
                  <Text style={styles.prefilledText}>{prefilledFormatted}</Text>
                </View>
              ) : null}

              <View style={styles.formContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address Name *</Text>
                  <TextInput
                    style={styles.input}
                    value={addressName}
                    onChangeText={setAddressName}
                    placeholder="e.g., Head Office, Main Branch"
                    placeholderTextColor="#999999"
                    autoCapitalize="words"
                  />
                  <Text style={styles.fieldHint}>
                    Give a name to identify this business location
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address Line 1 *</Text>
                  <TextInput
                    style={styles.input}
                    value={addressLine1}
                    onChangeText={setAddressLine1}
                    placeholder="Building, Street, Area"
                    placeholderTextColor="#999999"
                    autoCapitalize="words"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address Line 2</Text>
                  <TextInput
                    style={styles.input}
                    value={addressLine2}
                    onChangeText={setAddressLine2}
                    placeholder="Landmark, Near (optional)"
                    placeholderTextColor="#999999"
                    autoCapitalize="words"
                  />
                </View>

                {additionalLines.map((line, index) => (
                  <View key={index} style={styles.inputGroup}>
                    <View style={styles.additionalLineHeader}>
                      <Text style={styles.label}>Address Line {index + 3}</Text>
                      <TouchableOpacity
                        style={styles.removeLineButton}
                        onPress={() => removeAdditionalLine(index)}
                      >
                        <X size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <TextInput
                      style={styles.input}
                      value={line}
                      onChangeText={(text) => updateAdditionalLine(index, text)}
                      placeholder="Additional address line"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                    />
                  </View>
                ))}

                {additionalLines.length < 3 && (
                  <TouchableOpacity style={styles.addLineButton} onPress={addAddressLine}>
                    <Plus size={16} color="#3f66ac" />
                    <Text style={styles.addLineText}>Add Address Line</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.rowContainer}>
                  <View style={[styles.inputGroup, styles.cityInput]}>
                    <Text style={styles.label}>City *</Text>
                    <TextInput
                      style={styles.input}
                      value={city}
                      onChangeText={setCity}
                      placeholder="City name"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                    />
                  </View>

                  <View style={[styles.inputGroup, styles.pincodeInput]}>
                    <Text style={styles.label}>Pincode *</Text>
                    <TextInput
                      style={styles.input}
                      value={pincode}
                      onChangeText={handlePincodeChange}
                      placeholder="000000"
                      placeholderTextColor="#999999"
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>State *</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={handleStateModalOpen}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stateSelectContent}>
                      <Text style={[
                        styles.dropdownText,
                        { color: selectedState ? '#1a1a1a' : '#999999' }
                      ]}>
                        {selectedState ? selectedState.name : 'Select state'}
                      </Text>
                      {selectedState && (
                        <Text style={styles.stateCodeText}>
                          ({selectedState.code})
                        </Text>
                      )}
                    </View>
                    <ChevronDown 
                      size={20} 
                      color="#666666"
                      style={[
                        styles.dropdownIcon,
                        showStates && styles.dropdownIconRotated
                      ]}
                    />
                  </TouchableOpacity>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isFormValid() ? { backgroundColor: typeInfo.color } : styles.disabledButton,
                ]}
                onPress={handleSubmit}
                disabled={!isFormValid() || isLoading}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.submitButtonText,
                  isFormValid() ? { color: '#ffffff' } : styles.disabledButtonText,
                ]}>
                  {isLoading ? 'Saving Address...' : 'Save Address'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>

          {/* State Selection Modal */}
          <Modal
            visible={showStates}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowStates(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select State</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowStates(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color="#666666" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                  <Search size={18} color="#64748b" />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    value={stateSearch}
                    onChangeText={setStateSearch}
                    placeholder="Search states..."
                    placeholderTextColor="#94a3b8"
                    autoFocus={false}
                  />
                </View>
                
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {filteredStates.map((state) => (
                    <TouchableOpacity
                      key={state.code}
                      style={[
                        styles.modalOption,
                        selectedState?.code === state.code && styles.modalOptionSelected
                      ]}
                      onPress={() => handleStateSelect(state)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.stateInfo}>
                        <Text style={[
                          styles.stateName,
                          selectedState?.code === state.code && styles.stateNameSelected
                        ]}>
                          {state.name}
                        </Text>
                      </View>
                      <View style={[
                        styles.stateCodeBadge,
                        selectedState?.code === state.code && styles.stateCodeBadgeSelected
                      ]}>
                        <Text style={[
                          styles.stateCodeText,
                          selectedState?.code === state.code && styles.stateCodeTextSelected
                        ]}>
                          {state.code}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: 60,
    left: 24,
    zIndex: 1,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: 32,
    paddingTop: 120,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 48,
  },
  iconWrapper: {
    width: 100,
    height: 100,
    backgroundColor: '#ffc754',
    borderRadius: 50,
    borderWidth: 6,
    borderColor: '#3f66ac',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
    marginBottom: 16,
  },
  primaryNotice: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#0369a1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryNoticeText: {
    fontSize: 16,
    color: '#0369a1',
    textAlign: 'center',
    marginBottom: 4,
  },
  primaryBold: {
    fontWeight: '700',
  },
  primaryNoticeSubtext: {
    fontSize: 14,
    color: '#0284c7',
    textAlign: 'center',
  },
  prefilledSection: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  prefilledLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  prefilledText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 22,
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
    color: '#1a1a1a',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  input: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
  },
  additionalLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeLineButton: {
    padding: 4,
  },
  addLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderWidth: 1,
    borderColor: '#3f66ac',
    borderRadius: 8,
    borderStyle: 'dashed',
    marginBottom: 20,
  },
  addLineText: {
    color: '#3f66ac',
    fontSize: 14,
    fontWeight: '500',
    marginLeft: 8,
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cityInput: {
    flex: 1,
    marginRight: 10,
  },
  pincodeInput: {
    flex: 0.6,
    marginLeft: 10,
  },
  dropdown: {
    backgroundColor: '#f8f9fa',
    borderWidth: 2,
    borderColor: '#e9ecef',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 18,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  stateSelectContent: {
    flex: 1,
  },
  dropdownText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  stateCodeText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  dropdownIcon: {
    marginLeft: 8,
  },
  dropdownIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  enabledButton: {
    backgroundColor: '#ffc754',
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  enabledButtonText: {
    color: '#3f66ac',
  },
  disabledButtonText: {
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#ffffff',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#334155',
    paddingVertical: 8,
    
  },
  modalContent: {
    maxHeight: 350,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionSelected: {
    backgroundColor: '#f0f7ff',
  },
  stateInfo: {
    flex: 1,
  },
  stateName: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  stateNameSelected: {
    color: '#3f66ac',
    fontWeight: '600',
  },
  stateCodeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  stateCodeBadgeSelected: {
    backgroundColor: '#3f66ac',
  },
  stateCodeTextSelected: {
    color: '#ffffff',
  },
});