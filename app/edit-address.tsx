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
import { ArrowLeft, MapPin, ChevronDown, Search, X, Plus, User, Phone, Building2, Package } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
import { getGSTINStateCode, BusinessAddress, mapLocationToAddress, mapLocationsToAddresses } from '@/utils/dataStore';
import { supabase } from '@/lib/supabase';
import GooglePlacesSearch from '@/components/GooglePlacesSearch';
import { extractAddressComponents } from '@/services/googleMapsApi';
import { useStatusBar } from '@/contexts/StatusBarContext';
import { updateAddress, createStaff } from '@/services/backendApi';
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
  { name: 'Dadra and Nagar Haveli', code: '26' },
  { name: 'Daman and Diu', code: '25' },
  { name: 'Delhi', code: '07' },
  { name: 'Jammu and Kashmir', code: '01' },
  { name: 'Ladakh', code: '38' },
  { name: 'Lakshadweep', code: '31' },
  { name: 'Puducherry', code: '34' },
];

export default function EditAddressScreen() {
  console.log('🔧 EditAddressScreen - Component rendering');
  
  const { setStatusBarStyle } = useStatusBar();
  const { 
    editAddressId,
    addressType = 'primary',
    // Signup flow parameters
    type,
    value,
    gstinData,
    name,
    businessName,
    businessType,
    customBusinessType,
    existingAddresses = '[]',
  } = useLocalSearchParams();

  console.log('🔧 EditAddressScreen - Parameters:', { editAddressId, addressType, type, value });

  const [addressName, setAddressName] = useState('');
  const [addressLine1, setAddressLine1] = useState(''); // Door number - user should enter this
  const [addressLine2, setAddressLine2] = useState(''); // Street address from parsed data
  const [additionalLines, setAdditionalLines] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [selectedState, setSelectedState] = useState<{ name: string; code: string } | null>(null);
  const [showStates, setShowStates] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const stateSearchInputRef = useRef<TextInput>(null);
  const colors = useThemeColors();

  // Contact person fields (for branch/warehouse)
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');

  useEffect(() => {
    setStatusBarStyle('dark-content');
  }, [setStatusBarStyle]);

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

  // Load existing address data from backend
  useEffect(() => {
    const loadAddress = async () => {
      if (!editAddressId) return;

      // Try route params first
      let address: BusinessAddress | null = null;
      try {
        const paramAddrs = JSON.parse((existingAddresses || '[]') as string);
        const mapped = mapLocationsToAddresses(paramAddrs);
        address = mapped.find(a => a.id === editAddressId || a.backendId === editAddressId) || null;
      } catch { /* ignore parse error */ }

      // Fallback: query backend directly
      if (!address) {
        try {
          const { data: loc } = await supabase
            .from('locations')
            .select('*')
            .eq('id', editAddressId)
            .maybeSingle();
          if (loc) {
            address = mapLocationToAddress(loc);
          }
        } catch { /* ignore */ }
      }

      if (address) {
        setAddressName(address.name);
        setAddressLine1(address.addressLine1);
        setAddressLine2(address.addressLine2);
        setAdditionalLines(address.additionalLines || []);
        setCity(address.city);
        setPincode(address.pincode);
        setManagerName(address.manager || '');
        setManagerPhone(address.phone || '');
        
        const matchingState = indianStates.find(state => state.code === address!.stateCode);
        if (matchingState) {
          setSelectedState(matchingState);
        }
      }
    };

    loadAddress();
  }, [editAddressId]);

  // Parse existing addresses from route params
  const parsedExistingAddresses = React.useMemo(() => {
    try {
      return mapLocationsToAddresses(JSON.parse((existingAddresses || '[]') as string));
    } catch { return []; }
  }, [existingAddresses]);

  // Dynamic header and form configuration
  const typeInfo = React.useMemo(() => {
    const allAddresses = parsedExistingAddresses;
    
    if (addressType === 'branch') {
      const branchAddresses = allAddresses.filter(addr => addr.type === 'branch');
      const currentBranchIndex = branchAddresses.findIndex(addr => addr.id === editAddressId);
      const branchNumber = currentBranchIndex >= 0 ? currentBranchIndex + 1 : branchAddresses.length + 1;
      return {
        color: '#3f66ac',
        title: `Branch Address - ${branchNumber}`,
        subtitle: 'Edit your branch address details',
        icon: Building2,
        showContactFields: true,
      };
    } else if (addressType === 'warehouse') {
      const warehouseAddresses = allAddresses.filter(addr => addr.type === 'warehouse');
      const currentWarehouseIndex = warehouseAddresses.findIndex(addr => addr.id === editAddressId);
      const warehouseNumber = currentWarehouseIndex >= 0 ? currentWarehouseIndex + 1 : warehouseAddresses.length + 1;
      return {
        color: '#f59e0b',
        title: `Warehouse Address - ${warehouseNumber}`,
        subtitle: 'Edit your warehouse address details',
        icon: Package,
        showContactFields: true,
      };
    } else {
      return {
        color: '#ffc754',
        title: 'Primary Address',
        subtitle: 'Edit your primary address details',
        icon: MapPin,
        showContactFields: false,
      };
    }
  }, [addressType, editAddressId, parsedExistingAddresses]);

  // Glowy animation effect - stops when user starts searching or search bar is shown
  useEffect(() => {
    if (!isSearching && !showSearchBar) {
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
    } else {
      // Stop animation when searching or search bar is shown
      glowAnimation.setValue(0);
    }
  }, [glowAnimation, isSearching, showSearchBar]);

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
    setIsSearching(false);
  };

  const handleSearchFocus = () => {
    setIsSearching(true);
  };

  const handleSearchBlur = () => {
    setIsSearching(false);
  };

  const handlePincodeChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    setPincode(cleaned);
  };

  const handleManagerPhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setManagerPhone(cleaned);
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
      Alert.alert('Invalid Form', 'Please fill all required fields correctly');
      return;
    }

    setIsLoading(true);
    
    try {
      const addressUpdates: Partial<BusinessAddress> = {
        name: addressName.trim(),
        doorNumber: addressLine1.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        additionalLines: additionalLines.filter(line => line.trim().length > 0),
        city: city.trim(),
        pincode: pincode,
        stateName: selectedState?.name || '',
        stateCode: getGSTINStateCode(selectedState?.name || ''),
        manager: typeInfo.showContactFields ? managerName.trim() : undefined,
        phone: typeInfo.showContactFields ? managerPhone.trim() : undefined,
        isPrimary: addressType === 'primary',
        updatedAt: new Date().toISOString(),
      };
      
      const { optimisticUpdateAddress } = await import('@/utils/optimisticSync');
      await optimisticUpdateAddress(editAddressId as string, addressUpdates, { showError: false, awaitSync: true });
      
      const { clearBusinessDataCache } = await import('@/hooks/useBusinessData');
      clearBusinessDataCache();
      
      await new Promise(resolve => setTimeout(resolve, 300));
      
      // If manager info was added/updated, create staff via backend directly
      if (addressUpdates.manager && addressUpdates.phone) {
        try {
          await createStaff({
            name: addressUpdates.manager,
            mobile: addressUpdates.phone,
            role: addressType === 'branch' ? 'branch_manager' : addressType === 'warehouse' ? 'warehouse_manager' : 'manager',
            locationId: editAddressId as string,
            locationType: addressType as string,
            locationName: addressName.trim(),
          });
          console.log('✅ Staff synced to backend from address update');
        } catch (error) {
          console.error('Error syncing staff to backend:', error);
        }
      }
      
      setIsLoading(false);
      if (type && value) {
        safeRouter.push({
          pathname: '/auth/address-confirmation',
          params: {
            type,
            value,
            gstinData,
            name,
            businessName,
            businessType,
            customBusinessType,
            allAddresses: JSON.stringify(parsedExistingAddresses),
          }
        });
      } else {
        safeRouter.push('/settings');
      }
    } catch (error) {
      console.error('Error updating address:', error);
      Alert.alert('Error', 'Failed to update address. Please try again.');
      setIsLoading(false);
    }
  };

  const slideTransform = {
    transform: [
      {
        translateY: slideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [50, 0],
        }),
      },
    ],
    opacity: slideAnimation,
  };

  const filteredStates = indianStates.filter(state =>
    state.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    state.code.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const IconComponent = typeInfo.icon;

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#3f66ac" />
          </TouchableOpacity>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          <Animated.View style={[styles.content, slideTransform]}>
            <View style={styles.iconContainer}>
              <View style={[styles.iconWrapper, { backgroundColor: `${typeInfo.color}20` }]}>
                <IconComponent size={48} color={typeInfo.color} strokeWidth={2.5} />
              </View>
            </View>

            <View style={styles.textContainer}>
              <Text style={[styles.title, { color: typeInfo.color }]}>{typeInfo.title}</Text>
              <Text style={styles.subtitle}>
                {typeInfo.subtitle}
              </Text>
            </View>

            <View style={styles.formContainer}>
              {/* Search Bar with Glowy Animation */}
              <View style={styles.searchContainer}>
                <TouchableOpacity
                  style={styles.searchButton}
                  onPress={() => setShowSearchBar(true)}
                  activeOpacity={0.8}
                >
                  <Animated.View
                    style={[
                      styles.searchButtonInner,
                      {
                        shadowColor: glowAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: ['#3f66ac', '#ffc754'],
                        }),
                        shadowOpacity: glowAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [0.3, 0.8],
                        }),
                        shadowRadius: glowAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [8, 16],
                        }),
                        elevation: glowAnimation.interpolate({
                          inputRange: [0, 1],
                          outputRange: [4, 12],
                        }),
                      },
                    ]}
                  >
                    <Search size={20} color="#3f66ac" />
                    <Text style={styles.searchButtonText}>Search Address</Text>
                  </Animated.View>
                </TouchableOpacity>
              </View>

              {showSearchBar && (
                <View style={styles.searchBarContainer}>
                  <GooglePlacesSearch
                    onAddressSelect={handleAddressSelect}
                    placeholder="Search for an address..."
                    autoFocus={true}
                  />
                  <TouchableOpacity
                    style={styles.closeSearchButton}
                    onPress={() => {
                      setShowSearchBar(false);
                      setSearchQuery('');
                      setIsSearching(false);
                    }}
                  >
                    <X size={20} color="#666666" />
                  </TouchableOpacity>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {addressType === 'branch' ? 'Branch Name' : 
                   addressType === 'warehouse' ? 'Warehouse Name' : 'Address Name'} *
                </Text>
                <TextInput
                  style={styles.input}
                  value={addressName}
                  onChangeText={setAddressName}
                  placeholder={`e.g., ${addressType === 'branch' ? 'Mumbai Branch' : 
                              addressType === 'warehouse' ? 'Main Warehouse' : 'Head Office'}`}
                  placeholderTextColor="#999999"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Door Number / Building Name *</Text>
                <TextInput
                  style={styles.input}
                  value={addressLine1}
                  onChangeText={setAddressLine1}
                  placeholder="e.g., Flat 101, Shop No. 5, Building A"
                  placeholderTextColor="#999999"
                  autoCapitalize="words"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Street Address *</Text>
                <TextInput
                  style={styles.input}
                  value={addressLine2}
                  onChangeText={setAddressLine2}
                  placeholder="Street name, area, landmark"
                  placeholderTextColor="#999999"
                  autoCapitalize="words"
                />
              </View>

              {/* Additional Address Lines */}
              {additionalLines.map((line, index) => (
                <View key={index} style={styles.inputGroup}>
                  <View style={styles.additionalLineHeader}>
                    <Text style={styles.label}>Address Line {index + 3}</Text>
                    <TouchableOpacity
                      style={styles.removeLineButton}
                      onPress={() => {
                        const newLines = [...additionalLines];
                        newLines.splice(index, 1);
                        setAdditionalLines(newLines);
                      }}
                      activeOpacity={0.7}
                    >
                      <X size={Platform.select({
                        web: 16,
                        default: 20,
                      })} color="#ef4444" />
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.input}
                    value={line}
                    onChangeText={(text) => {
                      const newLines = [...additionalLines];
                      newLines[index] = text;
                      setAdditionalLines(newLines);
                    }}
                    placeholder="Additional address line"
                    placeholderTextColor="#999999"
                    autoCapitalize="words"
                  />
                </View>
              ))}

              {additionalLines.length < 3 && (
                <TouchableOpacity 
                  style={styles.addLineButton} 
                  onPress={() => {
                    if (additionalLines.length < 3) {
                      setAdditionalLines([...additionalLines, '']);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Plus size={Platform.select({
                    web: 16,
                    default: 14,
                  })} color="#3f66ac" />
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
                  onPress={() => setShowStates(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownText,
                    { color: selectedState ? '#1a1a1a' : '#999999' }
                  ]}>
                    {selectedState ? selectedState.name : 'Select state'}
                  </Text>
                  <ChevronDown size={20} color="#666666" />
                </TouchableOpacity>
              </View>

              {/* Contact Person Fields for Branch/Warehouse */}
              {typeInfo.showContactFields && (
                <View style={styles.contactFieldGroup}>
                  <Text style={styles.contactSectionTitle}>Contact Person Details</Text>
                  
                  <View style={styles.contactFieldRow}>
                    <Text style={styles.contactLabel}>
                      {addressType === 'branch' ? 'Branch Manager' : 'Warehouse Manager'}
                    </Text>
                    <View style={[styles.inputContainer, styles.contactInputContainer]}>
                      <User size={20} color="#fbbf24" style={styles.inputIcon} />
                      <TextInput
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
                    <View style={[styles.inputContainer, styles.contactInputContainer]}>
                      <Phone size={20} color="#fbbf24" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.contactInput]}
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
              )}
            </View>

            <TouchableOpacity
              style={[
                styles.submitButton,
                isFormValid() ? styles.enabledButton : styles.disabledButton
              ]}
              onPress={handleSubmit}
              disabled={!isFormValid() || isLoading}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.submitButtonText,
                isFormValid() ? styles.enabledButtonText : styles.disabledButtonText
              ]}>
                {isLoading ? 'Updating...' : 'Update Address'}
              </Text>
            </TouchableOpacity>
          </Animated.View>
        </ScrollView>

        {/* State Selection Modal */}
        <Modal
          visible={showStates}
          transparent={true}
          animationType="slide"
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
                >
                  <X size={24} color="#666666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <TextInput
                  ref={stateSearchInputRef}
                  style={styles.searchInput}
                  placeholder="Search states..."
                  value={stateSearch}
                  onChangeText={setStateSearch}
                  placeholderTextColor="#999999"
                  autoFocus={true}
                />
              </View>
              
              <ScrollView style={styles.modalContent}>
                {filteredStates.map((state) => (
                  <TouchableOpacity
                    key={state.code}
                    style={[
                      styles.modalOption,
                      selectedState?.code === state.code && styles.modalOptionSelected
                    ]}
                    onPress={() => {
                      setSelectedState(state);
                      setShowStates(false);
                      setStateSearch('');
                    }}
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#f8fafc',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 24,
  },
  iconWrapper: {
    width: 80,
    height: 80,
    borderRadius: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
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
  },
  formContainer: {
    marginBottom: 32,
  },
  // Search bar styles
  searchContainer: {
    marginBottom: 20,
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
  inputGroup: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cityInput: {
    flex: 2,
  },
  pincodeInput: {
    flex: 1,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  dropdownText: {
    fontSize: 16,
    flex: 1,
  },
  // Contact field styles
  contactFieldGroup: {
    backgroundColor: '#fefce8',
    borderRadius: 12,
    padding: 16,
    marginVertical: 8,
    borderWidth: 2,
    borderColor: '#fbbf24',
  },
  contactSectionTitle: {
    color: '#fbbf24',
    fontWeight: '800',
    fontSize: 18,
    marginBottom: 16,
    textAlign: 'center',
  },
  contactFieldRow: {
    marginBottom: 12,
  },
  contactLabel: {
    color: '#000000',
    fontWeight: '700',
    fontSize: 16,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: '#ffffff',
  },
  contactInputContainer: {
    backgroundColor: '#ffffff',
    borderColor: '#fbbf24',
    borderWidth: 2,
  },
  inputIcon: {
    marginRight: 12,
  },
  contactInput: {
    color: '#000000',
    fontWeight: '500',
    flex: 1,
  },
  // Additional lines styles
  additionalLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeLineButton: {
    padding: 4,
    borderRadius: 8,
  },
  addLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#3f66ac',
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    marginBottom: 20,
    gap: 8,
  },
  addLineText: {
    color: '#3f66ac',
    fontSize: 14,
    fontWeight: '600',
  },
  submitButton: {
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
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
    alignItems: 'center',
    justifyContent: 'center',
  },
  searchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    margin: 20,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: '#ffffff',
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
  stateCodeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  stateCodeTextSelected: {
    color: '#ffffff',
  },
});
