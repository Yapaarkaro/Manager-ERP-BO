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
import CapitalizedTextInput from '@/components/CapitalizedTextInput';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Building2, ChevronDown, Search, X, Plus, User, Phone } from 'lucide-react-native';
import { BusinessAddress, getStateCode, getGSTINStateCode, mapLocationsToAddresses } from '@/utils/dataStore';
import { useStatusBar } from '@/contexts/StatusBarContext';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { createAddress, createStaff } from '@/services/backendApi';
import { safeRouter } from '@/utils/safeRouter';

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

export default function BranchDetailsScreen() {
  const { setStatusBarStyle } = useStatusBar();
  const { 
    addressType = 'branch',
    prefilledAddressName = 'Branch Office',
    prefilledStreet = '',
    prefilledArea = '',
    prefilledCity = '',
    prefilledState = '',
    prefilledPincode = '',
    prefilledFormatted = '',
    prefilledLat = '',
    prefilledLng = '',
    // Signup flow parameters
    type,
    value,
    gstinData,
    name,
    businessName,
    businessType,
    customBusinessType,
    mobile,
    existingAddresses = '[]',
    // From business summary
    fromSummary,
    allAddresses,
    allBankAccounts,
    initialCashBalance,
    invoicePrefix,
    invoicePattern,
    startingInvoiceNumber,
    fiscalYear,
  } = useLocalSearchParams();
  
  const parsedExistingAddresses = React.useMemo(() => {
    try {
      const raw = JSON.parse((existingAddresses || allAddresses || '[]') as string);
      return mapLocationsToAddresses(raw);
    } catch { return []; }
  }, [existingAddresses, allAddresses]);

  const getBranchCount = () => {
    return parsedExistingAddresses.filter(addr => addr.type === 'branch').length + 1;
  };

  // Set status bar to dark for white header
  useEffect(() => {
    setStatusBarStyle('dark-content');
  }, [setStatusBarStyle]);

  // No need to track keyboard height - we'll use fixed padding and auto-scroll
  
  const [branchName, setBranchName] = useState('');
  const [doorNumber, setDoorNumber] = useState(''); // Door number - user should enter this
  const [addressLine1, setAddressLine1] = useState(''); // Address Line 1 from parsed data
  const [addressLine2, setAddressLine2] = useState(''); // Address Line 2 from parsed data
  const [additionalLines, setAdditionalLines] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [selectedState, setSelectedState] = useState<{ name: string; code: string } | null>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const insets = useSafeAreaInsets();
  
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateAddressInfo, setDuplicateAddressInfo] = useState<any>(null);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);

  // Update state when prefilled values are received
  useEffect(() => {
    console.log('🏢 Branch Details - Prefilled values received:');
    console.log('  - prefilledStreet:', prefilledStreet, typeof prefilledStreet);
    console.log('  - prefilledArea:', prefilledArea, typeof prefilledArea);
    console.log('  - prefilledCity:', prefilledCity, typeof prefilledCity);
    console.log('  - prefilledState:', prefilledState, typeof prefilledState);
    console.log('  - prefilledPincode:', prefilledPincode, typeof prefilledPincode);

    // Set values if they exist and are not empty
    if (prefilledStreet && prefilledStreet !== '') {
      console.log('✅ Setting addressLine1 to:', prefilledStreet);
      setAddressLine1(prefilledStreet as string);
    }
    // Check for prefilledArea - it can be an empty string, so check for undefined/null
    if (prefilledArea !== undefined && prefilledArea !== null) {
      console.log('✅ Setting addressLine2 to:', prefilledArea);
      setAddressLine2(prefilledArea as string);
    } else {
      console.log('⚠️ prefilledArea is undefined or null:', prefilledArea);
    }
    if (prefilledCity && prefilledCity !== '') {
      // Clean up city name on mobile - remove administrative suffixes like "Division", "District", etc.
      let cleanedCity = prefilledCity as string;
      if (Platform.OS !== 'web') {
        // Remove common administrative suffixes
        cleanedCity = (prefilledCity as string)
          .replace(/\s+Division\s*$/i, '')
          .replace(/\s+District\s*$/i, '')
          .replace(/\s+Tehsil\s*$/i, '')
          .replace(/\s+Tahsil\s*$/i, '')
          .replace(/\s+Taluka\s*$/i, '')
          .trim();
        
        // Special case: "Bangalore Division" -> "Bengaluru"
        if (cleanedCity.toLowerCase().includes('bangalore')) {
          cleanedCity = 'Bengaluru';
        }
        
        console.log('🧹 Cleaned city name:', prefilledCity, '->', cleanedCity);
      }
      console.log('✅ Setting city to:', cleanedCity);
      setCity(cleanedCity);
    }
    if (prefilledPincode && prefilledPincode !== '') {
      console.log('✅ Setting pincode to:', prefilledPincode);
      setPincode(prefilledPincode as string);
    }
  }, [prefilledStreet, prefilledArea, prefilledCity, prefilledPincode]);

  useEffect(() => {
    // Auto-select state if prefilled
    if (prefilledState) {
      const matchingState = indianStates.find(state => {
        const stateName = state.name.toLowerCase();
        const prefilledLower = (prefilledState as string).toLowerCase();
        
        if (stateName === prefilledLower) return true;
        if (stateName.includes(prefilledLower) || prefilledLower.includes(stateName)) return true;
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
  }, [prefilledState]);

  const filteredStates = indianStates.filter(state =>
    state.name.toLowerCase().includes(stateSearchQuery.toLowerCase()) ||
    state.code.toLowerCase().includes(stateSearchQuery.toLowerCase())
  );

  const handleStateSelect = (state: { name: string; code: string }) => {
    setSelectedState(state);
    setStateSearchQuery('');
    setShowStateModal(false);
  };

  const handleStateModalOpen = () => {
    setShowStateModal(true);
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

  const handleManagerPhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setManagerPhone(cleaned);
  };

  // Removed custom scroll-on-focus logic; KeyboardAvoidingView handles keyboard avoidance.

  const isFormValid = () => {
    return (
      branchName.trim().length > 0 &&
      doorNumber.trim().length > 0 &&
      addressLine1.trim().length > 0 &&
      addressLine2.trim().length > 0 &&
      city.trim().length > 0 &&
      pincode.trim().length === 6 &&
      /^\d{6}$/.test(pincode) &&
      selectedState !== null
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Details', 'Please fill in all required fields');
      return;
    }

    const allAddresses = parsedExistingAddresses;
    console.log('🔍 Checking for duplicates among', allAddresses.length, 'existing addresses');
    console.log('📍 New branch address to check:', {
      addressLine1: addressLine1.trim(),
      city: city.trim(),
      pincode: pincode,
      stateName: selectedState?.name,
      doorNumber: doorNumber.trim(),
      managerName: managerName.trim(),
      managerPhone: managerPhone
    });
    
    // Check for same location (addressLine1, city, pincode, state)
    const sameLocationAddress = allAddresses.find(addr => {
      return addr.addressLine1.toLowerCase() === addressLine1.trim().toLowerCase() &&
             addr.city.toLowerCase() === city.trim().toLowerCase() &&
             addr.pincode === pincode &&
             addr.stateName.toLowerCase() === (selectedState?.name || '').toLowerCase();
    });

    if (sameLocationAddress) {
      // Check if door number, manager name, and manager phone are also the same (exact duplicate)
      const existingDoorNumber = sameLocationAddress.doorNumber || '';
      const existingManager = sameLocationAddress.manager || '';
      const existingPhone = sameLocationAddress.phone || '';
      
      const isExactDuplicate = existingDoorNumber.toLowerCase() === doorNumber.trim().toLowerCase() &&
                               existingManager.toLowerCase() === managerName.trim().toLowerCase() &&
                               existingPhone === managerPhone;
      
      console.log('⚠️ Found same location address:', {
        existingId: sameLocationAddress.id,
        existingName: sameLocationAddress.name,
        existingType: sameLocationAddress.type,
        existingDoorNumber,
        existingManager,
        existingPhone,
        newDoorNumber: doorNumber.trim(),
        newManager: managerName.trim(),
        newPhone: managerPhone,
        isExactDuplicate
      });

      if (isExactDuplicate) {
        console.log('❌ Exact duplicate detected - showing modal');
        setDuplicateAddressInfo(sameLocationAddress);
        setShowDuplicateModal(true);
        setIsLoading(false);
        return;
      } else {
        // Same location but different door number/manager - show modal with "Use Same Address" option
        console.log('⚠️ Same location but different door/manager - showing modal with use option');
        setDuplicateAddressInfo(sameLocationAddress);
        setShowDuplicateModal(true);
        setIsLoading(false);
        return;
      }
    }
    
    console.log('✅ No duplicate found - proceeding with branch creation');

    setIsLoading(true);
    
    const newBranch: BusinessAddress = {
      id: `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: branchName.trim(),
      type: 'branch',
      doorNumber: doorNumber.trim(), // Door number - user input
      addressLine1: addressLine1.trim(), // Address Line 1 - auto-filled
      addressLine2: addressLine2.trim(), // Address Line 2 - auto-filled
      additionalLines: additionalLines.filter(line => line.trim().length > 0),
      city: city.trim(),
      pincode: pincode,
      stateName: selectedState?.name || '',
      stateCode: getGSTINStateCode(selectedState?.name || ''),
      isPrimary: false,
      manager: managerName.trim() || undefined,
      phone: managerPhone || undefined,
      status: 'active',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    console.log('Creating new branch:', newBranch);
    
    try {
      // Prepare address JSON for backend
      // Include all additional lines (not just doorNumber)
      const addressJson = {
        doorNumber: doorNumber.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        additionalLines: additionalLines.filter(line => line.trim().length > 0), // Store all additional lines
        city: city.trim(),
        pincode: pincode,
        stateName: selectedState?.name || '',
        stateCode: getGSTINStateCode(selectedState?.name || ''),
      };

      // ✅ Get latitude/longitude from prefilled values or geocode if not available
      let addressLatitude: number | undefined = prefilledLat ? parseFloat(prefilledLat as string) : undefined;
      let addressLongitude: number | undefined = prefilledLng ? parseFloat(prefilledLng as string) : undefined;
      
      // If lat/long not available, try to geocode the address (non-blocking)
      if (!addressLatitude || !addressLongitude) {
        const geocodePromise = (async () => {
          try {
            const { geocodeAddress } = await import('@/services/googleMapsApi');
            const formattedAddress = `${addressLine1.trim()}, ${addressLine2.trim()}, ${city.trim()}, ${selectedState?.name || ''} - ${pincode}`;
            const geocodeResults = await geocodeAddress(formattedAddress);
            if (geocodeResults && geocodeResults.length > 0) {
              addressLatitude = geocodeResults[0].geometry.location.lat;
              addressLongitude = geocodeResults[0].geometry.location.lng;
              console.log('✅ Geocoded branch address:', { addressLatitude, addressLongitude });
            }
          } catch (geocodeError) {
            console.warn('⚠️ Failed to geocode branch address, continuing without lat/long:', geocodeError);
          }
        })();
        
        // Wait for geocoding to complete before creating address
        await geocodePromise;
      }

      // Save to backend - await to ensure it's saved before navigating
      let backendResult: any = null;
      for (let attempt = 1; attempt <= 2; attempt++) {
        const result = await createAddress({
          name: branchName.trim(),
          addressJson,
          type: 'branch',
          managerName: managerName.trim() || undefined,
          managerMobileNumber: managerPhone || undefined,
          isPrimary: false,
          latitude: addressLatitude,
          longitude: addressLongitude,
        });
        if (result.success && result.address) {
          backendResult = result.address;
          console.log('✅ Branch saved with backend ID:', result.address.id);
          break;
        }
        if (attempt < 2) {
          console.warn(`⚠️ Branch create attempt ${attempt} failed (${result.error}), retrying...`);
          await new Promise(r => setTimeout(r, 1000));
        } else {
          console.error('❌ Branch creation failed after retries:', result.error);
        }
      }

      // Create staff from manager info (non-blocking)
      if (backendResult && managerName.trim() && managerPhone) {
        createStaff({
          name: managerName.trim(),
          mobile: managerPhone.replace(/\D/g, '').slice(0, 10),
          role: 'Branch Manager',
          locationId: backendResult.id,
          locationType: 'branch',
          locationName: branchName.trim(),
        }).then((staffResult) => {
          if (staffResult.success) {
            console.log('✅ Staff created from branch manager in backend:', managerName.trim());
          } else {
            console.warn('⚠️ Staff creation failed (non-blocking):', staffResult.error);
          }
        }).catch((staffError) => {
          console.warn('⚠️ Staff creation error (non-blocking):', staffError);
        });
      }
    } catch (error) {
      console.error('Error preparing branch for backend:', error);
    }
    
    // ✅ Clear cache to ensure fresh data is loaded when navigating back
    const { clearBusinessDataCache } = await import('@/hooks/useBusinessData');
    clearBusinessDataCache();
    
    const updatedAddresses = JSON.stringify([...parsedExistingAddresses, newBranch]);

    setIsLoading(false);
    if (fromSummary === 'true') {
      safeRouter.replace({
        pathname: '/auth/business-summary',
        params: {
          type, value, gstinData, name, businessName, businessType, customBusinessType,
          allAddresses: updatedAddresses,
          allBankAccounts, initialCashBalance, invoicePrefix, invoicePattern, startingInvoiceNumber, fiscalYear,
        }
      });
    } else if (type && value) {
      safeRouter.replace({
        pathname: '/auth/address-confirmation',
        params: {
          type, value, gstinData, name, businessName, businessType, customBusinessType, mobile,
          allAddresses: updatedAddresses,
        }
      });
    } else {
      // User is not in signup flow, go to settings
      safeRouter.push('/settings');
    }
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
    // Removed opacity animation to prevent grey background flash
  };

  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          enabled={Platform.OS === 'ios'}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#10b981" />
          </TouchableOpacity>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView} 
            contentContainerStyle={[
              webContainerStyles.webScrollContent,
              // Add bottom safe area inset for consistent padding
              Platform.OS !== 'web' ? { 
                paddingBottom: 20 + insets.bottom 
              } : {}
            ]} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="interactive"
          >
            <Animated.View style={[styles.content, slideTransform]}>
              <View style={styles.iconContainer}>
                <View style={styles.iconWrapper}>
                  <Building2 size={48} color="#10b981" strokeWidth={2.5} />
                </View>
              </View>

              <View style={styles.textContainer}>
                <Text style={styles.title}>Branch Address - {getBranchCount()}</Text>
                <Text style={styles.subtitle}>
                  Enter the details for your new branch office location
                </Text>
              </View>

              {prefilledFormatted ? (
                <View style={styles.prefilledSection}>
                  <Text style={styles.prefilledLabel}>Selected Address:</Text>
                  <Text style={styles.prefilledText}>{prefilledFormatted}</Text>
                </View>
              ) : null}

              <View style={styles.formContainer}>
                <View style={styles.branchFieldGroup}>
                  <Text style={styles.branchSectionTitle}>Branch Office Details</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Branch Name *</Text>
                  <View style={styles.inputContainer}>
                    <Building2 size={20} color="#64748b" style={styles.inputIcon} />
                    <CapitalizedTextInput
                      style={styles.input}
                      value={branchName}
                      onChangeText={setBranchName}
                      placeholder={Platform.select({
                        web: "e.g., Mumbai Branch, Regional Office",
                        default: "Branch name"
                      })}
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                      
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Door Number / Building Name *</Text>
                  <View 
                    style={styles.inputContainer}
                  >
                    <CapitalizedTextInput
                      style={styles.input}
                      value={doorNumber}
                      onChangeText={setDoorNumber}
                      placeholder={Platform.select({
                        web: "e.g., Flat 101, Shop No. 5, Building A",
                        default: "Door number / Building"
                      })}
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address Line 1 *</Text>
                  <View 
                    style={styles.inputContainer}
                  >
                    <CapitalizedTextInput
                      style={styles.input}
                      value={addressLine1}
                      onChangeText={setAddressLine1}
                      placeholder="Street name, area, landmark"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                      editable={true}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address Line 2 *</Text>
                  <View 
                    style={styles.inputContainer}
                  >
                    <CapitalizedTextInput
                      style={styles.input}
                      value={addressLine2}
                      onChangeText={setAddressLine2}
                      placeholder="Additional address information"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                      editable={true}
                    />
                  </View>
                </View>

                {additionalLines.map((line, index) => (
                  <View key={index} style={styles.inputGroup}>
                    <View style={styles.additionalLineHeader}>
                      <Text style={styles.label}>Address Line {index + 3}</Text>
                      <TouchableOpacity
                        style={styles.removeLineButton}
                        onPress={() => removeAdditionalLine(index)}
                        activeOpacity={0.7}
                      >
                        <X size={Platform.select({
                          web: 16,
                          default: 20, // Larger icon on mobile
                        })} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <View 
                      style={styles.inputContainer}
                    >
                      <CapitalizedTextInput
                        style={styles.input}
                        value={line}
                        onChangeText={(text) => updateAdditionalLine(index, text)}
                        placeholder="Additional address line"
                        placeholderTextColor="#999999"
                        autoCapitalize="words"
                        editable={true}
                      />
                    </View>
                  </View>
                ))}

                {additionalLines.length < 3 && (
                  <TouchableOpacity 
                    style={styles.addLineButton} 
                    onPress={addAddressLine}
                    activeOpacity={0.7}
                  >
                    <Plus size={Platform.select({
                      web: 16,
                      default: 14, // Smaller icon for cleaner look
                    })} color="#3f66ac" />
                    <Text style={styles.addLineText}>Add Address Line</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.rowContainer}>
                  <View style={[styles.inputGroup, styles.cityInput]}>
                    <Text style={styles.label}>City *</Text>
                    <View 
                      style={styles.inputContainer}
                    >
                      <CapitalizedTextInput
                        style={[
                          styles.input,
                          Platform.select({
                            web: {
                              outlineWidth: 0,
                              outlineColor: 'transparent',
                              outlineStyle: 'none' as any,
                            },
                          }),
                        ]}
                        value={city}
                        onChangeText={setCity}
                        placeholder="City name"
                        placeholderTextColor="#999999"
                        autoCapitalize="words"
                        editable={true}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, styles.pincodeInput]}>
                    <Text style={styles.label}>Pincode *</Text>
                    <View 
                      style={styles.inputContainer}
                    >
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
                        {selectedState ? `${selectedState.name} (${selectedState.code})` : 'Select state'}
                      </Text>
                    </View>
                    <ChevronDown size={20} color="#666666" />
                  </TouchableOpacity>
                </View>
                </View>

                <View style={styles.contactFieldGroup}>
                  <Text style={styles.contactSectionTitle}>Contact Person Details</Text>
                  
                  <View style={styles.contactFieldRow}>
                    <Text style={styles.contactLabel}>Branch Manager</Text>
                    <View 
                      style={[styles.inputContainer, styles.contactInputContainer]}
                    >
                      <User size={20} color="#ffc754" style={styles.inputIcon} />
                      <CapitalizedTextInput
                        style={[styles.input, styles.contactInput]}
                        value={managerName}
                        onChangeText={setManagerName}
                        placeholder="Manager name (optional)"
                        placeholderTextColor="#999999"
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={styles.contactFieldRow}>
                    <Text style={styles.contactLabel}>Manager Phone</Text>
                    <View 
                      style={[
                        styles.inputContainer,
                        styles.contactInputContainer
                      ]}
                    >
                      <Phone size={20} color="#ffc754" style={styles.inputIcon} />
                      <TextInput
                        style={[
                          styles.input,
                          styles.contactInput,
                          Platform.select({
                            web: {
                              outlineWidth: 0,
                              outlineColor: 'transparent',
                              outlineStyle: 'none' as any,
                            },
                          }),
                        ]}
                        value={managerPhone}
                        onChangeText={handleManagerPhoneChange}
                        placeholder="Manager phone (optional)"
                        placeholderTextColor="#999999"
                        keyboardType="numeric"
                        maxLength={10}
                      />
                    </View>
                  </View>
                </View>
              </View>

              <TouchableOpacity
                style={[
                  styles.submitButton,
                  isFormValid() ? styles.enabledButton : styles.disabledButton,
                ]}
                onPress={handleSubmit}
                disabled={!isFormValid() || isLoading}
                activeOpacity={0.8}
                
              >
                <Text style={[
                  styles.submitButtonText,
                  isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
                ]}>
                  {isLoading ? 'Adding Branch...' : 'Add Branch Office'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>

          {/* State Selection Modal */}
          <Modal
            visible={showStateModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowStateModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select State</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowStateModal(false)}
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
                    value={stateSearchQuery}
                    onChangeText={setStateSearchQuery}
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

          {/* Duplicate Address Modal */}
          <Modal
            visible={showDuplicateModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {
              setShowDuplicateModal(false);
              setDuplicateAddressInfo(null);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.duplicateModal}>
                <Text style={styles.duplicateModalTitle}>Address Already Exists</Text>
                {duplicateAddressInfo && (() => {
                  const existingDoorNumber = duplicateAddressInfo.doorNumber || '';
                  const existingManager = duplicateAddressInfo.manager || '';
                  const existingPhone = duplicateAddressInfo.phone || '';
                  
                  const isExactDuplicate = existingDoorNumber.toLowerCase() === doorNumber.trim().toLowerCase() &&
                                           existingManager.toLowerCase() === managerName.trim().toLowerCase() &&
                                           existingPhone === managerPhone;
                  
                  return (
                    <>
                      {isExactDuplicate && (
                        <View style={styles.warningBox}>
                          <Text style={styles.warningText}>
                            ⚠️ Having two identical addresses will create confusion in your system. Please choose an option below.
                          </Text>
                        </View>
                      )}
                      {!isExactDuplicate && (
                        <View style={styles.infoBox}>
                          <Text style={styles.infoText}>
                            ℹ️ An address at this location already exists, but with different door number or manager details. You can use the same address if needed.
                          </Text>
                        </View>
                      )}
                      <Text style={styles.duplicateModalText}>
                        Existing address details:
                      </Text>
                      <View style={styles.duplicateAddressInfo}>
                        <Text style={styles.duplicateAddressName}>{duplicateAddressInfo.name}</Text>
                        <Text style={styles.duplicateAddressText}>
                          {[duplicateAddressInfo.doorNumber, duplicateAddressInfo.addressLine1, duplicateAddressInfo.addressLine2, duplicateAddressInfo.city, duplicateAddressInfo.stateName, duplicateAddressInfo.pincode].filter(Boolean).join(', ')}
                        </Text>
                        <Text style={styles.duplicateAddressType}>
                          Type: {duplicateAddressInfo.type === 'primary' ? 'Primary Address' : duplicateAddressInfo.type === 'branch' ? 'Branch Office' : 'Warehouse'}
                        </Text>
                        {existingManager && (
                          <Text style={styles.duplicateManagerInfo}>
                            Manager: {existingManager} {existingPhone ? `(${existingPhone})` : ''}
                          </Text>
                        )}
                      </View>
                    </>
                  );
                })()}

                <View style={styles.duplicateModalActions}>
                  <TouchableOpacity
                    style={styles.duplicateModalSecondaryButton}
                    onPress={() => {
                      setShowDuplicateModal(false);
                      setDuplicateAddressInfo(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.duplicateModalSecondaryButtonText}>Add Different Address</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.duplicateModalTertiaryButton}
                    onPress={() => {
                      setShowDuplicateModal(false);
                      // Navigate to edit the existing address
                      if (duplicateAddressInfo) {
                        safeRouter.push({
                          pathname: '/edit-address-simple',
                          params: {
                            editAddressId: duplicateAddressInfo.id,
                            addressType: duplicateAddressInfo.type,
                            type,
                            value,
                            name,
                            businessName,
                            businessType,
                            customBusinessType,
                            existingAddresses: existingAddresses,
                            fromSummary: fromSummary || 'false',
                          }
                        });
                      }
                      setDuplicateAddressInfo(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.duplicateModalTertiaryButtonText}>Edit Existing Address</Text>
                  </TouchableOpacity>
                  {duplicateAddressInfo && (() => {
                    const existingDoorNumber = duplicateAddressInfo.doorNumber || '';
                    const existingManager = duplicateAddressInfo.manager || '';
                    const existingPhone = duplicateAddressInfo.phone || '';
                    
                    const isExactDuplicate = existingDoorNumber.toLowerCase() === doorNumber.trim().toLowerCase() &&
                                             existingManager.toLowerCase() === managerName.trim().toLowerCase() &&
                                             existingPhone === managerPhone;
                    
                    if (!isExactDuplicate) {
                      return (
                        <TouchableOpacity
                          style={styles.duplicateModalPrimaryButton}
                          onPress={async () => {
                            setShowDuplicateModal(false);
                            // Allow saving with same address but different door/manager
                            setIsLoading(true);
                            
                            const newBranch: BusinessAddress = {
                              id: `branch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              name: branchName.trim(),
                              type: 'branch',
                              doorNumber: doorNumber.trim(),
                              addressLine1: addressLine1.trim(),
                              addressLine2: addressLine2.trim(),
                              additionalLines: additionalLines.filter(line => line.trim().length > 0),
                              city: city.trim(),
                              pincode: pincode,
                              stateName: selectedState?.name || '',
                              stateCode: getGSTINStateCode(selectedState?.name || ''),
                              isPrimary: false,
                              manager: managerName.trim() || undefined,
                              phone: managerPhone || undefined,
                              status: 'active',
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            };

                            createAddress({
                              name: newBranch.name,
                              addressJson: {
                                doorNumber: newBranch.doorNumber,
                                addressLine1: newBranch.addressLine1,
                                addressLine2: newBranch.addressLine2,
                                city: newBranch.city,
                                pincode: newBranch.pincode,
                                stateName: newBranch.stateName,
                                stateCode: newBranch.stateCode,
                              },
                              type: 'branch',
                              managerName: newBranch.manager,
                              managerMobileNumber: newBranch.phone,
                              isPrimary: false,
                            }).catch(() => {});

                            const dupUpdatedAddresses = JSON.stringify([...parsedExistingAddresses, newBranch]);

                            setTimeout(() => {
                              if (fromSummary === 'true') {
                                safeRouter.replace({
                                  pathname: '/auth/business-summary',
                                  params: {
                                    type, value, gstinData, name, businessName, businessType, customBusinessType,
                                    allAddresses: dupUpdatedAddresses,
                                    allBankAccounts, initialCashBalance, invoicePrefix, invoicePattern, startingInvoiceNumber, fiscalYear,
                                  }
                                });
                              } else if (type && value) {
                                safeRouter.replace({
                                  pathname: '/auth/address-confirmation',
                                  params: {
                                    type, value, gstinData, name, businessName, businessType, customBusinessType, mobile,
                                    allAddresses: dupUpdatedAddresses,
                                  }
                                });
                              } else {
                                safeRouter.push('/settings');
                              }
                              setIsLoading(false);
                              setDuplicateAddressInfo(null);
                            }, 500);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.duplicateModalPrimaryButtonText}>Use Same Address</Text>
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  })()}
                </View>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
    </ResponsiveContainer>
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
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: Platform.select({
      web: 32,
      default: 8, // Reduced for more native feel on mobile
    }),
    paddingTop: Platform.select({
      web: 120,
      default: 80,
    }),
    paddingBottom: Platform.select({
      web: 40,
      ios: 0, // Handled via ScrollView contentContainerStyle with safe area insets
      android: 0, // Handled via ScrollView contentContainerStyle with safe area insets
      default: 0,
    }),
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Platform.select({
      web: 48,
      default: 24,
    }),
  },
  iconWrapper: {
    width: 100,
    height: 100,
    backgroundColor: '#dcfce7',
    borderRadius: 50,
    borderWidth: Platform.select({
      web: 6,
      default: 3,
    }),
    borderColor: '#10b981',
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
  prefilledSection: {
    backgroundColor: '#f0fdf4',
    borderWidth: 1,
    borderColor: '#10b981',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  prefilledLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#047857',
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
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: Platform.select({
      web: 2,
      default: 1.5, // Thinner border for more native feel
    }),
    borderColor: '#E5E7EB',
    borderRadius: Platform.select({
      web: 12,
      default: 10, // Slightly smaller radius for more native feel
    }),
    paddingHorizontal: Platform.select({
      web: 16,
      default: 12, // Reduced padding for more native feel
    }),
    paddingVertical: Platform.select({
      web: 4,
      default: 2, // Reduced padding for more compact feel
    }),
    ...Platform.select({
      web: {
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      },
      default: {
        minHeight: 50, // Consistent height for all input containers on mobile
      },
    }),
  },
  inputIcon: {
    marginRight: Platform.select({
      web: 12,
      default: 10, // Reduced spacing on mobile
    }),
    // Ensure icon is vertically centered
    alignSelf: 'center',
  },
  input: {
    flex: 1,
    paddingVertical: Platform.select({
      web: 14,
      default: 12, // Reduced padding for more compact feel
    }),
    fontSize: Platform.select({
      web: 16,
      default: 15, // Slightly smaller for more native feel
    }),
    color: '#1a1a1a',
    fontWeight: '500',
    ...Platform.select({
      default: {
        minHeight: 44, // Standard native input height
      },
    }),
  },
  additionalLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeLineButton: {
    padding: Platform.select({
      web: 4,
      ios: 8,
      android: 8,
    }),
    minWidth: Platform.select({
      web: 'auto' as any,
      ios: 40,
      android: 40,
    }),
    minHeight: Platform.select({
      web: 'auto' as any,
      ios: 40,
      android: 40,
    }),
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.select({
      web: 12,
      default: 8, // Reduced padding for smaller button
    }),
    paddingHorizontal: Platform.select({
      web: 16,
      default: 12, // Reduced padding for smaller button
    }),
    borderWidth: Platform.select({
      web: 1,
      default: 1.5, // Thinner border for cleaner look
    }),
    borderColor: '#3f66ac', // Blue to match background
    borderRadius: Platform.select({
      web: 8,
      default: 6, // Smaller radius for cleaner look
    }),
    borderStyle: 'dashed',
    backgroundColor: Platform.select({
      web: 'transparent',
      ios: 'transparent',
      android: 'transparent',
    }),
    marginBottom: Platform.select({
      web: 20,
      ios: 12,
      android: 12,
    }),
    marginTop: Platform.select({
      web: 0,
      ios: 8,
      android: 8,
    }),
    minHeight: Platform.select({
      web: 'auto' as any,
      ios: 36,
      android: 36,
    }),
    ...Platform.select({
      default: {
        // Ensure button is always visible on mobile
        opacity: 1,
        zIndex: 1,
      },
    }),
  },
  addLineText: {
    color: '#3f66ac', // Blue to match border
    fontSize: Platform.select({
      web: 14,
      default: 12, // Smaller text for cleaner look
    }),
    fontWeight: Platform.select({
      web: '500',
      default: '600', // Bolder text on mobile
    }),
    marginLeft: Platform.select({
      web: 8,
      default: 10, // More spacing on mobile
    }),
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
    borderWidth: Platform.select({
      web: 2,
      default: 1.5, // Match inputContainer on mobile
    }),
    borderColor: '#e9ecef',
    borderRadius: Platform.select({
      web: 12,
      default: 10, // Match inputContainer on mobile
    }),
    paddingHorizontal: Platform.select({
      web: 20,
      default: 12, // Match inputContainer on mobile
    }),
    paddingVertical: Platform.select({
      web: 18,
      default: 0, // Remove padding to let content handle spacing
    }),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      default: {
        minHeight: 50, // Match inputContainer total height on mobile
      },
    }),
  },
  stateSelectContent: {
    flex: 1,
    ...Platform.select({
      default: {
        justifyContent: 'center', // Center content vertically on mobile
        paddingVertical: 12, // Match input paddingVertical for consistent alignment
      },
    }),
  },
  dropdownText: {
    fontSize: Platform.select({
      web: 16,
      default: 15, // Match input fontSize on mobile
    }),
    fontWeight: '500',
    ...Platform.select({
      web: {
        flex: 1,
      },
      default: {
        textAlignVertical: 'center', // Center text vertically on mobile (Android)
        includeFontPadding: false, // Remove extra font padding on Android for better alignment
      },
    }),
  },
  stateCodeText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
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
    color: '#ffffff',
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
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineStyle: 'none' as any,
      },
    }),
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
    backgroundColor: '#f0fdf4',
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
    color: '#10b981',
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
    backgroundColor: '#10b981',
  },
  stateCodeTextSelected: {
    color: '#ffffff',
  },
  // Branch field group styles
  branchFieldGroup: {
    ...Platform.select({
      web: {
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#3f66ac',
      },
      default: {
        // Mobile: two-toned background for better visual separation
        backgroundColor: '#eff6ff',
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1.5,
        borderColor: '#3f66ac',
      },
    }),
  },
  branchSectionTitle: {
    ...Platform.select({
      web: {
        color: '#3f66ac',
        fontWeight: '800',
        fontSize: 18,
        marginBottom: 16,
        textAlign: 'center',
      },
      default: {
        // Mobile: hide section title
        display: 'none',
      },
    }),
  },
  // Contact field styles
  contactFieldGroup: {
    ...Platform.select({
      web: {
        backgroundColor: '#fffbeb',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        borderWidth: 2,
        borderColor: '#ffc754',
      },
      default: {
        // Mobile: two-toned background for better visual separation
        backgroundColor: '#fffbeb',
        borderRadius: 10,
        padding: 12,
        marginTop: 20,
        marginBottom: 0,
        borderWidth: 1.5,
        borderColor: '#ffc754',
      },
    }),
  },
  contactSectionTitle: {
    ...Platform.select({
      web: {
        color: '#ffc754',
        fontWeight: '800',
        fontSize: 18,
        marginBottom: 16,
        textAlign: 'center',
      },
      default: {
        // Mobile: hide section title
        display: 'none',
      },
    }),
  },
  contactFieldRow: {
    marginBottom: 12,
  },
  contactLabel: {
    ...Platform.select({
      web: {
        color: '#000000',
        fontWeight: '700',
        fontSize: 16,
        marginBottom: 8,
      },
      default: {
        // Mobile: use same style as regular labels
        color: '#1a1a1a',
        fontWeight: '600',
        fontSize: 16,
        marginBottom: 8,
      },
    }),
  },
  contactInputContainer: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: {
        borderColor: '#ffc754',
        borderWidth: 2,
      },
      default: {
        // Mobile: use default border color like other inputs
        borderColor: '#E5E7EB',
        borderWidth: 2,
      },
    }),
  },
  contactInput: {
    color: '#000000',
    fontWeight: '500',
  },
  duplicateModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
  },
  duplicateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  duplicateModalText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  duplicateAddressInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  duplicateAddressName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  duplicateAddressText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 8,
  },
  duplicateAddressType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3f66ac',
    marginTop: 4,
  },
  duplicateModalActions: {
    flexDirection: 'column',
    gap: 12,
  },
  duplicateModalPrimaryButton: {
    backgroundColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  duplicateModalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  duplicateModalSecondaryButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  duplicateModalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  duplicateModalTertiaryButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  duplicateModalTertiaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
    textAlign: 'center',
  },
  duplicateManagerInfo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
});