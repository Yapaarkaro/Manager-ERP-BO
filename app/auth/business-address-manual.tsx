import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Modal,
} from 'react-native';
import CapitalizedTextInput from '@/components/CapitalizedTextInput';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, ChevronDown, Search, X, Plus } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
import { dataStore, getGSTINStateCode } from '@/utils/dataStore';
import GooglePlacesSearch from '@/components/GooglePlacesSearch';
import { extractAddressComponents } from '@/services/googleMapsApi';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';

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
    mobile,
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
    prefilledContactName = '',
    prefilledContactPhone = '',
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
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateAddressInfo, setDuplicateAddressInfo] = useState<any>(null);
  const [contactPersonName, setContactPersonName] = useState(
    (prefilledContactName as string) || (name as string) || ''
  );
  const initialContactPhone = ((prefilledContactPhone as string) || (mobile as string) || '').replace(/\D/g, '').slice(0, 10);
  const [contactPhone, setContactPhone] = useState(initialContactPhone);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const stateSearchInputRef = useRef<TextInput>(null);
  const colors = useThemeColors();
  const debouncedNavigate = useDebounceNavigation();

  const typeInfo = React.useMemo(() => {
    // Dynamic header based on address type and edit mode
    if (editMode === 'true') {
      const allAddresses = dataStore.getAddresses();
      if (addressType === 'branch') {
        const branchAddresses = allAddresses.filter(addr => addr.type === 'branch');
        const currentBranchIndex = branchAddresses.findIndex(addr => addr.id === editAddressId);
        const branchNumber = currentBranchIndex >= 0 ? currentBranchIndex + 1 : branchAddresses.length + 1;
        return {
          color: '#3f66ac',
          title: `Branch Address - ${branchNumber}`,
          subtitle: 'Edit your branch address details'
        };
      } else if (addressType === 'warehouse') {
        const warehouseAddresses = allAddresses.filter(addr => addr.type === 'warehouse');
        const currentWarehouseIndex = warehouseAddresses.findIndex(addr => addr.id === editAddressId);
        const warehouseNumber = currentWarehouseIndex >= 0 ? currentWarehouseIndex + 1 : warehouseAddresses.length + 1;
        return {
          color: '#f59e0b',
          title: `Warehouse Address - ${warehouseNumber}`,
          subtitle: 'Edit your warehouse address details'
        };
      } else {
        return {
          color: '#ffc754',
          title: 'Primary Address',
          subtitle: 'Edit your primary address details'
        };
      }
    } else {
      // Default to primary address styling for new addresses
      return {
        color: '#ffc754', // Primary business address color
        title: 'Primary Business Address',
        subtitle: 'Enter your primary business address details'
      };
    }
  }, [editMode, addressType, editAddressId]);

  // Glowy animation effect
  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, [glowAnimation]);

  // Auto-focus on state search input when modal opens
  useEffect(() => {
    if (showStates) {
      // Longer delay to ensure modal slide animation completes fully
      const timer = setTimeout(() => {
        console.log('🔍 Attempting to focus state search input');
        stateSearchInputRef.current?.focus();
      }, 800); // Increased from 500ms to 800ms for slide animation
      return () => clearTimeout(timer);
    } else {
      // Clear search when modal closes
      setStateSearch('');
    }
  }, [showStates]);

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
    console.log('🏠 useEffect - Prefilled values check:');
    console.log('  - prefilledStreet:', prefilledStreet, typeof prefilledStreet);
    console.log('  - prefilledArea:', prefilledArea, typeof prefilledArea);
    console.log('  - prefilledCity:', prefilledCity, typeof prefilledCity);
    console.log('  - prefilledPincode:', prefilledPincode, typeof prefilledPincode);
    
    if (prefilledStreet && prefilledStreet !== '') {
      console.log('🏠 Setting prefilled street:', prefilledStreet);
      setAddressLine1(prefilledStreet as string);
    }
    
    // Check for prefilledArea - it can be an empty string, so check for undefined/null
    if (prefilledArea !== undefined && prefilledArea !== null) {
      console.log('🏠 Setting prefilled area:', prefilledArea);
      setAddressLine2(prefilledArea as string);
    } else {
      console.log('⚠️ prefilledArea is undefined or null, not setting addressLine2');
    }
    
    if (prefilledCity && prefilledCity !== '') {
      console.log('🏠 Setting prefilled city:', prefilledCity);
      setCity(prefilledCity as string);
    }
    
    if (prefilledPincode && prefilledPincode !== '') {
      console.log('🏠 Setting prefilled pincode:', prefilledPincode);
      setPincode(prefilledPincode as string);
    }
  }, [prefilledStreet, prefilledArea, prefilledCity, prefilledPincode]);

  useEffect(() => {
    if ((addressType || 'primary') !== 'primary') {
      return;
    }

    const nextContactName = (prefilledContactName as string) || (name as string) || '';
    if (nextContactName && !contactPersonName) {
      setContactPersonName(nextContactName);
    }

    const nextContactPhone = ((prefilledContactPhone as string) || (mobile as string) || '')
      .replace(/\D/g, '')
      .slice(0, 10);
    if (nextContactPhone && !contactPhone) {
      setContactPhone(nextContactPhone);
    }
  }, [prefilledContactName, prefilledContactPhone, name, mobile, addressType, contactPersonName, contactPhone]);

  useEffect(() => {
    if ((addressType || 'primary') !== 'primary' || editMode !== 'true' || !editAddressId) {
      return;
    }

    try {
      const existingAddressesParam = existingAddresses as string;
      if (!existingAddressesParam || existingAddressesParam === '[]') {
        return;
      }
      const parsed = JSON.parse(existingAddressesParam);
      if (!Array.isArray(parsed)) {
        return;
      }

      const currentAddress = parsed.find((addr: any) => addr.id === editAddressId);
      if (currentAddress) {
        if (currentAddress.manager) {
          setContactPersonName(currentAddress.manager);
        }
        if (currentAddress.phone) {
          const sanitizedPhone = String(currentAddress.phone).replace(/\D/g, '').slice(0, 10);
          setContactPhone(sanitizedPhone);
        }
      }
    } catch (error) {
      console.log('⚠️ Error parsing existing addresses for contact info:', error);
    }
  }, [addressType, editMode, editAddressId, existingAddresses]);

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

  const handleAddressSelect = (addressData: any) => {
    console.log('🔍 Selected address from search:', addressData);
    
    // addressData is already the extracted components from GooglePlacesSearch
    const components = addressData;
    console.log('📍 Extracted components:', components);
    
    // Address Line 1: Premise/Building name + Road name
    // Address Line 2: Locality/Area name
    
    let addressLine1Parts: string[] = [];
    
    // First, try to get the premise/building name
    // Priority 1: Use the place name from the search suggestion (most accurate)
    if (components.placeName && components.placeName.trim()) {
      addressLine1Parts.push(components.placeName);
      console.log('📍 Using place name from search:', components.placeName);
    } else if (components.premise) {
      addressLine1Parts.push(components.premise);
      console.log('📍 Using premise:', components.premise);
    } else if (components.subpremise) {
      addressLine1Parts.push(components.subpremise);
      console.log('📍 Using subpremise:', components.subpremise);
    } else {
      // If no premise, try to extract from formatted address (first part that's not a code)
      const formattedParts = components.formatted_address?.split(',') || [];
      const firstPart = formattedParts[0]?.trim();
      
      // Check if first part is a plus code (e.g., "VJ99+78R")
      const isPlusCode = /^[A-Z0-9]+\+[A-Z0-9]+$/.test(firstPart || '');
      
      if (firstPart && !isPlusCode) {
        // Check if it looks like a road name (starts with road keywords)
        const isRoadName = /^(road|street|avenue|lane|marg|cross)/i.test(firstPart);
        
        if (!isRoadName) {
          // It's likely a premise name, use it
          addressLine1Parts.push(firstPart);
          console.log('📍 Using first part of formatted address:', firstPart);
        }
      }
    }
    
    // Then add the road/street name
    if (components.route) {
      addressLine1Parts.push(components.route);
    } else if (components.street && !addressLine1Parts.includes(components.street)) {
      addressLine1Parts.push(components.street);
    }
    
    // Set Address Line 1
    if (addressLine1Parts.length > 0) {
      setAddressLine1(addressLine1Parts.join(', '));
      console.log('📍 Set addressLine1:', addressLine1Parts.join(', '));
    } else {
      // Absolute fallback: use first part of formatted address
      const firstPart = components.formatted_address?.split(',')[0]?.trim();
      if (firstPart) {
        setAddressLine1(firstPart);
        console.log('📍 Set addressLine1 (fallback):', firstPart);
      }
    }
    
    // Address Line 2: Locality/Area name
    if (components.sublocality || components.area) {
      const area = components.sublocality || components.area;
      setAddressLine2(area);
      console.log('📍 Set addressLine2 from area/sublocality:', area);
    } else if (components.district) {
      setAddressLine2(components.district);
      console.log('📍 Set addressLine2 from district:', components.district);
    } else if (components.locality) {
      setAddressLine2(components.locality);
      console.log('📍 Set addressLine2 from locality:', components.locality);
    }
    
    if (components.city) {
      setCity(components.city);
      console.log('📍 Set city:', components.city);
    }
    if (components.pincode) {
      setPincode(components.pincode);
      console.log('📍 Set pincode:', components.pincode);
    }
    if (components.state) {
      // Find matching state
      const matchingState = indianStates.find(state => 
        state.name.toLowerCase() === components.state.toLowerCase()
      );
      if (matchingState) {
        setSelectedState(matchingState);
        console.log('📍 Set state:', matchingState.name);
      }
    }
    
    // Hide search bar after selection
    setShowSearchBar(false);
    setSearchQuery('');
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

  const handleContactPhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setContactPhone(cleaned);
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
    if (!isFormValid()) {
      Alert.alert('Incomplete Details', 'Please fill in all required fields');
      return;
    }

    // Check for duplicate addresses (only for new addresses, not when editing)
    if (editMode !== 'true') {
      const allAddresses = dataStore.getAddresses();
      const trimmedContactName = contactPersonName.trim();
      const sanitizedContactPhone = contactPhone.replace(/\D/g, '').slice(0, 10);
      const newDoorNumber = additionalLines.length > 0 ? additionalLines[0] : '';
      
      console.log('🔍 Checking for duplicates among', allAddresses.length, 'existing addresses');
      console.log('📍 New address to check:', {
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        pincode: pincode,
        stateName: selectedState?.name,
        doorNumber: newDoorNumber,
        managerName: trimmedContactName,
        managerPhone: sanitizedContactPhone
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
        
        const isExactDuplicate = existingDoorNumber.toLowerCase() === newDoorNumber.toLowerCase() &&
                                 existingManager.toLowerCase() === trimmedContactName.toLowerCase() &&
                                 existingPhone === sanitizedContactPhone;
        
        console.log('⚠️ Found same location address:', {
          existingId: sameLocationAddress.id,
          existingName: sameLocationAddress.name,
          existingType: sameLocationAddress.type,
          existingDoorNumber,
          existingManager,
          existingPhone,
          newDoorNumber,
          newManager: trimmedContactName,
          newPhone: sanitizedContactPhone,
          isExactDuplicate
        });

        if (isExactDuplicate) {
          console.log('❌ Exact duplicate detected - showing modal');
          setDuplicateAddressInfo(sameLocationAddress);
          setShowDuplicateModal(true);
          return;
        } else {
          // Same location but different door number/manager - show modal with "Use Same Address" option
          console.log('⚠️ Same location but different door/manager - showing modal with use option');
          setDuplicateAddressInfo(sameLocationAddress);
          setShowDuplicateModal(true);
          return;
        }
      }
      
      console.log('✅ No duplicate found - proceeding with address creation');
    }

    setIsLoading(true);
    const trimmedContactName = contactPersonName.trim();
    const sanitizedContactPhone = contactPhone.replace(/\D/g, '').slice(0, 10);
    const fallbackName = (name as string) || '';
    const fallbackPhone = ((mobile as string) || '').replace(/\D/g, '').slice(0, 10);
    
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
              stateCode: getGSTINStateCode(selectedState?.name || ''),
              // Update manager and phone info for primary addresses
              manager: addr.isPrimary 
                ? (trimmedContactName || addr.manager || fallbackName)
                : addr.manager,
              phone: addr.isPrimary
                ? ((sanitizedContactPhone || addr.phone || fallbackPhone) || undefined)
                : addr.phone,
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
        // Add manager and phone for primary addresses to show user info
        manager: (addressType || 'primary') === 'primary'
          ? (trimmedContactName || fallbackName)
          : undefined,
        phone: (addressType || 'primary') === 'primary'
          ? ((sanitizedContactPhone || fallbackPhone) || undefined)
          : undefined,
      };
      
      console.log('🆕 Creating new address:', newAddress);
      console.log('📝 Adding to existing addresses:', existingAddressList);
      
      // Add new address to existing addresses
      allAddresses = [...existingAddressList, newAddress];
      console.log('📦 Final address list:', allAddresses);
      
      // Save primary address to dataStore
      if ((addressType || 'primary') === 'primary') {
        dataStore.addAddress(newAddress);
      }
    }
    
    setTimeout(() => {
      // Navigate to address confirmation with all addresses
      // Use replace to prevent going back to address form after submission
      debouncedNavigate({
        pathname: '/auth/address-confirmation',
        params: {
          type,
          value,
          gstinData,
          name,
          businessName,
          businessType,
          customBusinessType,
          mobile,
          allAddresses: JSON.stringify(allAddresses),
        }
      }, 'replace');
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

  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer>
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

          <ScrollView style={styles.scrollView} contentContainerStyle={webContainerStyles.webScrollContent} showsVerticalScrollIndicator={false}>
            <Animated.View style={[styles.content, slideTransform]}>
              <View style={styles.iconContainer}>
                <View style={styles.iconWrapper}>
                  <MapPin size={48} color="#3f66ac" strokeWidth={2.5} />
                </View>
              </View>

              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: typeInfo.color }]}>{typeInfo.title}</Text>
                <Text style={styles.subtitle}>
                  {typeInfo.subtitle}
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
                <View style={styles.addressFieldGroup}>
                  <Text style={styles.addressSectionTitle}>Address Details</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Address Name *</Text>
                  <View style={styles.inputContainer}>
                    <CapitalizedTextInput
                      style={styles.input}
                      value={addressName}
                      onChangeText={setAddressName}
                      placeholder="e.g., Head Office, Main Branch"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                    />
                  </View>
                  <Text style={styles.fieldHint}>
                    Give a name to identify this business location
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address Line 1 *</Text>
                  <View style={styles.inputContainer}>
                    <CapitalizedTextInput
                      style={styles.input}
                      value={addressLine1}
                      onChangeText={setAddressLine1}
                      placeholder="Building, Street, Area"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address Line 2</Text>
                  <View style={styles.inputContainer}>
                    <CapitalizedTextInput
                      style={styles.input}
                      value={addressLine2}
                      onChangeText={setAddressLine2}
                      placeholder="Landmark, Near (optional)"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
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
                      >
                        <X size={16} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <View style={styles.inputContainer}>
                      <CapitalizedTextInput
                        style={styles.input}
                        value={line}
                        onChangeText={(text) => updateAdditionalLine(index, text)}
                        placeholder="Additional address line"
                        placeholderTextColor="#999999"
                        autoCapitalize="words"
                      />
                    </View>
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
                    <View style={styles.inputContainer}>
                      <CapitalizedTextInput
                        style={styles.input}
                        value={city}
                        onChangeText={setCity}
                        placeholder="City name"
                        placeholderTextColor="#999999"
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, styles.pincodeInput]}>
                    <Text style={styles.label}>Pincode *</Text>
                    <View style={styles.inputContainer}>
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

                {(addressType === 'primary' || !addressType) && (
                  <View style={styles.contactFieldGroup}>
                    <Text style={styles.contactSectionTitle}>Contact Person Details</Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Contact Person Name</Text>
                      <View style={[styles.inputContainer, styles.contactInputContainer]}>
                        <CapitalizedTextInput
                          style={[styles.input, styles.contactInput]}
                          value={contactPersonName}
                          onChangeText={setContactPersonName}
                          placeholder="Person responsible at this location"
                          placeholderTextColor="#999999"
                          autoCapitalize="words"
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Contact Phone Number</Text>
                      <View style={[styles.inputContainer, styles.contactInputContainer]}>
                        <TextInput
                          style={[styles.input, styles.contactInput]}
                          value={contactPhone}
                          onChangeText={handleContactPhoneChange}
                          placeholder="10-digit mobile number"
                          placeholderTextColor="#999999"
                          keyboardType="phone-pad"
                          maxLength={10}
                        />
                      </View>
                      <Text style={styles.fieldHint}>
                        We'll reach out on this number for deliveries and support updates.
                      </Text>
                    </View>
                  </View>
                )}
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
            onShow={() => {
              // Focus the search input when modal is shown
              setTimeout(() => {
                stateSearchInputRef.current?.focus();
              }, 100);
            }}
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
                    ref={stateSearchInputRef}
                    style={[
                      styles.searchInput,
                      Platform.select({
                        web: {
                          outlineWidth: 0,
                          outlineColor: 'transparent',
                          outlineStyle: 'none',
                        },
                      }),
                    ]}
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
                  const newDoorNumber = additionalLines.length > 0 ? additionalLines[0] : '';
                  const newManager = contactPersonName.trim();
                  const newPhone = contactPhone.replace(/\D/g, '').slice(0, 10);
                  
                  const isExactDuplicate = existingDoorNumber.toLowerCase() === newDoorNumber.toLowerCase() &&
                                           existingManager.toLowerCase() === newManager.toLowerCase() &&
                                           existingPhone === newPhone;
                  
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
                        router.push({
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
                            fromSummary: 'false',
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
                    const newDoorNumber = additionalLines.length > 0 ? additionalLines[0] : '';
                    const newManager = contactPersonName.trim();
                    const newPhone = contactPhone.replace(/\D/g, '').slice(0, 10);
                    
                    const isExactDuplicate = existingDoorNumber.toLowerCase() === newDoorNumber.toLowerCase() &&
                                             existingManager.toLowerCase() === newManager.toLowerCase() &&
                                             existingPhone === newPhone;
                    
                    if (!isExactDuplicate) {
                      return (
                        <TouchableOpacity
                          style={styles.duplicateModalPrimaryButton}
                          onPress={async () => {
                            setShowDuplicateModal(false);
                            // Allow saving with same address but different door/manager
                            setIsLoading(true);
                            const trimmedContactName = contactPersonName.trim();
                            const sanitizedContactPhone = contactPhone.replace(/\D/g, '').slice(0, 10);
                            const fallbackName = (name as string) || '';
                            const fallbackPhone = ((mobile as string) || '').replace(/\D/g, '').slice(0, 10);
                            
                            let existingAddressList = [];
                            try {
                              const existingAddressesParam = existingAddresses as string;
                              if (existingAddressesParam && existingAddressesParam !== '[]') {
                                existingAddressList = JSON.parse(existingAddressesParam);
                              }
                            } catch (error) {
                              existingAddressList = [];
                            }
                            
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
                              manager: (addressType || 'primary') === 'primary'
                                ? (trimmedContactName || fallbackName)
                                : undefined,
                              phone: (addressType || 'primary') === 'primary'
                                ? ((sanitizedContactPhone || fallbackPhone) || undefined)
                                : undefined,
                            };
                            
                            const allAddresses = [...existingAddressList, newAddress];
                            
                            if ((addressType || 'primary') === 'primary') {
                              dataStore.addAddress(newAddress);
                            }
                            
                            setTimeout(() => {
                              debouncedNavigate({
                                pathname: '/auth/address-confirmation',
                                params: {
                                  type,
                                  value,
                                  gstinData,
                                  name,
                                  businessName,
                                  businessType,
                                  customBusinessType,
                                  mobile,
                                  allAddresses: JSON.stringify(allAddresses),
                                }
                              }, 'replace');
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
  // Address field group styles
  addressFieldGroup: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#3f66ac',
  },
  addressSectionTitle: {
    color: '#3f66ac',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  // Contact field group styles
  contactFieldGroup: {
    backgroundColor: '#fffbeb',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#ffc754',
  },
  contactSectionTitle: {
    color: '#ffc754',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  contactInputContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#ffc754',
    borderWidth: 2,
  },
  contactInput: {
    color: '#000000',
    fontWeight: '500',
  },
  contactSection: {
    marginTop: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  inputGroup: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
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
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: {
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      },
    }),
  },
  input: {
    borderWidth: 0,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    fontWeight: '500',
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineStyle: 'none',
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
    paddingVertical: 12,
    fontSize: 16,
    color: '#334155',
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
  // Search bar styles
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
        outlineStyle: 'none',
      },
    }),
  },
  searchButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3f66ac',
  },
  searchBarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  closeSearchButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    padding: 8,
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