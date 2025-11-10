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
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, ChevronDown, Search, X, Plus, User, Phone, Building2, Package } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
import { dataStore, getGSTINStateCode } from '@/utils/dataStore';
import { extractAddressComponents, reverseGeocode } from '@/services/googleMapsApi';
import { useStatusBar } from '@/contexts/StatusBarContext';
import PlatformMapView from '@/components/PlatformMapView';

// Import web-specific API for better CORS handling on web
const getPlacePredictions = Platform.OS === 'web' 
  ? require('@/services/googleMapsApiWeb').getPlacePredictions
  : require('@/services/googleMapsApi').getPlacePredictions;

const getPlaceDetails = Platform.OS === 'web'
  ? require('@/services/googleMapsApiWeb').getPlaceDetails
  : require('@/services/googleMapsApi').getPlaceDetails;

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

export default function EditAddressSimpleScreen() {
  console.log('🔧 EditAddressSimpleScreen - Component rendering');
  
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
    fromSummary = 'false',
  } = useLocalSearchParams();

  console.log('🔧 EditAddressSimpleScreen - Parameters:', { editAddressId, addressType, type, value });

  const [addressName, setAddressName] = useState('');
  const [doorNumber, setDoorNumber] = useState(''); // Door number - user should enter this
  const [addressLine1, setAddressLine1] = useState(''); // Street address from parsed data
  const [addressLine2, setAddressLine2] = useState(''); // Area/landmark from parsed data
  const [additionalLines, setAdditionalLines] = useState<string[]>([]);
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [selectedState, setSelectedState] = useState<{ name: string; code: string } | null>(null);
  const [showStates, setShowStates] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const colors = useThemeColors();
  const defaultLocation = { lat: 28.6139, lng: 77.209 };
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number }>(defaultLocation);

  // Contact person fields (for branch/warehouse)
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');

  useEffect(() => {
    setStatusBarStyle('dark-content');
  }, [setStatusBarStyle]);

  // Start slide animation
  useEffect(() => {
    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: true,
    }).start();
  }, [slideAnimation]);

  // Load existing address data
  useEffect(() => {
    const loadAddress = async () => {
      if (!editAddressId) return;

      const existingAddress = dataStore.getAddressById(editAddressId as string);
      if (!existingAddress) return;

      setAddressName(existingAddress.name);
      setDoorNumber(existingAddress.doorNumber || '');
      setAddressLine1(existingAddress.addressLine1);
      setAddressLine2(existingAddress.addressLine2);
      setCity(existingAddress.city);
      setPincode(existingAddress.pincode);
      setManagerName(existingAddress.manager || '');
      setManagerPhone(existingAddress.phone || '');

      const matchingState = indianStates.find(state => state.code === existingAddress.stateCode);
      if (matchingState) {
        setSelectedState(matchingState);
      }

      const addressParts = [
        existingAddress.addressLine1,
        existingAddress.addressLine2,
        existingAddress.city,
        existingAddress.pincode,
        matchingState?.name,
      ].filter(part => part && part.trim() !== '');

      if (addressParts.length) {
        try {
          const searchText = addressParts.join(', ');
          console.log('📍 Geocoding existing address:', searchText);
          const predictions = await getPlacePredictions(searchText);
          console.log('📍 Predictions for existing address:', predictions.length);
          if (predictions && predictions.length > 0) {
            const placeDetails = await getPlaceDetails(predictions[0].place_id);
            const geometry = placeDetails?.geometry?.location;
            if (geometry) {
              const lat = typeof geometry.lat === 'function' ? geometry.lat() : geometry.lat;
              const lng = typeof geometry.lng === 'function' ? geometry.lng() : geometry.lng;
              if (lat && lng) {
                console.log('✅ Setting existing address location on map:', { lat, lng });
                setSelectedLocation({ lat, lng });
              }
            }
          }
        } catch (error) {
          console.log('⚠️ Failed to resolve map location for existing address:', error);
        }
      }
    };

    loadAddress();
  }, [editAddressId]);

  // Dynamic header and form configuration
  const typeInfo = React.useMemo(() => {
    const allAddresses = dataStore.getAddresses();
    
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
        showContactFields: true, // Show contact fields for primary address
      };
    }
  }, [addressType, editAddressId]);

  // Subtle glowy animation effect - stops when user starts searching
  useEffect(() => {
    if (!isSearchActive) {
      const glowLoop = Animated.loop(
        Animated.sequence([
          Animated.timing(glowAnimation, {
            toValue: 1,
            duration: 3000,
            useNativeDriver: false,
          }),
          Animated.timing(glowAnimation, {
            toValue: 0,
            duration: 3000,
            useNativeDriver: false,
          }),
        ])
      );
      glowLoop.start();
      return () => glowLoop.stop();
    } else {
      // Stop animation when searching
      glowAnimation.setValue(0);
    }
  }, [glowAnimation, isSearchActive]);

  // Search functionality
  const handleSearchQuery = async (query: string) => {
    console.log('🔍 Search query changed:', query);
    setSearchQuery(query);
    
    if (query.length > 2) {
      setIsLoadingSuggestions(true);
      console.log('🔍 Fetching predictions for:', query);
      try {
        const predictions = await getPlacePredictions(query);
        console.log('📍 Received predictions:', predictions.length);
        console.log('📍 Predictions data:', JSON.stringify(predictions.slice(0, 3), null, 2));
        setSuggestions(predictions.slice(0, 5));
        setShowSuggestions(true);
        console.log('📍 State updated - showSuggestions: true, suggestions count:', predictions.slice(0, 5).length);
      } catch (error) {
        console.error('❌ Error fetching place predictions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    } else {
      console.log('⚠️ Query too short, clearing suggestions');
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const applyAddressComponents = (components: any) => {
    const addressParts = components.formatted_address.split(',').map((p: string) => p.trim());

    // Priority 1: Use place name from search suggestion (e.g., "Provident Park Square")
    // Priority 2: Use premise from address components
    // Priority 3: Use first part of formatted address
    let parsedAddressLine1 = '';
    if (components.placeName && components.placeName.trim() !== '') {
      parsedAddressLine1 = components.placeName;
      console.log('✅ Using place name for Address Line 1:', parsedAddressLine1);
    } else if (components.premise) {
      parsedAddressLine1 = components.premise;
      console.log('✅ Using premise for Address Line 1:', parsedAddressLine1);
    } else if (addressParts.length > 0 && !addressParts[0].match(/^[A-Z0-9]+\+[A-Z0-9]+$/)) {
      parsedAddressLine1 = addressParts[0];
      console.log('✅ Using first address part for Address Line 1:', parsedAddressLine1);
    }
    setAddressLine1(parsedAddressLine1);

    const line2Parts: string[] = [];
    if (components.route && components.route !== parsedAddressLine1) {
      line2Parts.push(components.route);
    }
    if (components.sublocality) {
      line2Parts.push(components.sublocality);
    }
    for (let i = 1; i < addressParts.length; i++) {
      const part = addressParts[i];
      if (
        part &&
        part !== components.city &&
        part !== components.state &&
        part !== components.country &&
        !part.match(/^\d{6}$/) &&
        !part.match(/^[A-Z]{2}$/) &&
        !part.includes(components.state) &&
        !line2Parts.includes(part) &&
        line2Parts.length < 3
      ) {
        line2Parts.push(part);
      }
    }
    setAddressLine2(line2Parts.join(', '));

    if (components.city) {
      setCity(components.city);
    }
    if (components.pincode) {
      setPincode(components.pincode);
    }
    if (components.state) {
      const matchingState = indianStates.find(state =>
        state.name.toLowerCase() === components.state.toLowerCase()
      );
      if (matchingState) {
        setSelectedState(matchingState);
      }
    }
  };

  const handleMapLocationSelect = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    try {
      const results = await reverseGeocode(lat, lng);
      if (results && results.length > 0) {
        const components = extractAddressComponents(results[0]);
        applyAddressComponents(components);
      }
    } catch (error) {
      console.log('⚠️ Reverse geocode failed for map selection:', error);
    }
  };

  const handleAddressSelect = async (suggestion: any) => {
    console.log('🔍 Selected address from search');
    console.log('🔍 Place name from suggestion:', suggestion.structured_formatting?.main_text);
    
    try {
      // Get full place details using place_id
      const placeDetails = await getPlaceDetails(suggestion.place_id);
      
      if (!placeDetails) {
        throw new Error('No place details found');
      }
      
      const components = extractAddressComponents(placeDetails);
      
      // Add the place name from search suggestion to components for better premise extraction
      components.placeName = suggestion.structured_formatting?.main_text || '';
      console.log('📍 Added place name to components:', components.placeName);
      
      applyAddressComponents(components);

      const geometry = placeDetails.geometry?.location;
      if (geometry) {
        const resolvedLat = typeof geometry.lat === 'function' ? geometry.lat() : geometry.lat;
        const resolvedLng = typeof geometry.lng === 'function' ? geometry.lng() : geometry.lng;
        if (resolvedLat && resolvedLng) {
          setSelectedLocation({ lat: resolvedLat, lng: resolvedLng });
        }
      }
      
      // Clear search and hide suggestions
      setSearchQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearchActive(false);
    } catch (error) {
      console.error('Error getting place details:', error);
      // Fallback: try to extract from suggestion description
      const description = suggestion.description || suggestion.structured_formatting?.secondary_text || '';
      if (description) {
        // Enhanced parsing as fallback - only auto-fill address fields
        const parts = description.split(', ');
        if (parts.length >= 2) {
          // Address Line 1: Use the main_text (place name) from suggestion
          setAddressLine1(suggestion.structured_formatting?.main_text || parts[0]);
          
          // Address Line 2: Second part (usually area/landmark)
          setAddressLine2(parts[1]);
          
          // Door Number remains empty - user must enter manually
          
          // Try to extract city from the parts
          for (let i = 2; i < parts.length; i++) {
            const part = parts[i].trim();
            // Look for city (usually before state/pincode)
            if (part && !part.match(/^\d{6}$/) && !part.match(/^[A-Z]{2}$/)) {
              setCity(part);
              break;
            }
          }
          
          // Try to extract pincode
          for (let i = parts.length - 1; i >= 0; i--) {
            const part = parts[i].trim();
            if (part.match(/^\d{6}$/)) {
              setPincode(part);
              break;
            }
          }
        }
      }
      
      // Clear search and hide suggestions
      setSearchQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearchActive(false);
    }
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
      Alert.alert('Invalid Form', 'Please fill all required fields correctly');
      return;
    }

    setIsLoading(true);
    
    try {
      // Update existing address
      const updatedAddress = {
        id: editAddressId as string,
        name: addressName.trim(),
        type: addressType as 'primary' | 'branch' | 'warehouse',
        doorNumber: doorNumber.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        pincode: pincode,
        stateName: selectedState?.name || '',
        stateCode: getGSTINStateCode(selectedState?.name || ''),
        // For primary addresses, preserve user info (name and mobile from signup)
        // For branch/warehouse, use the manager fields if showContactFields is true
        manager: addressType === 'primary' ? name : (typeInfo.showContactFields ? managerName.trim() : undefined),
        phone: addressType === 'primary' ? mobile : (typeInfo.showContactFields ? managerPhone.trim() : undefined),
        isPrimary: addressType === 'primary',
        status: 'active' as const,
        updatedAt: new Date().toISOString(),
      };

      console.log('🔄 Updating address:', updatedAddress);
      dataStore.updateAddress(editAddressId as string, updatedAddress);
      
      setTimeout(() => {
        Alert.alert('Success', 'Address updated successfully', [
          {
            text: 'OK',
            onPress: () => {
              // Check if we came from business summary page
              if (fromSummary === 'true') {
                // Return to business summary page
                router.replace({
                  pathname: '/auth/business-summary',
                  params: {
                    type,
                    value,
                    gstinData,
                    name,
                    businessName,
                    businessType,
                    customBusinessType,
                    allAddresses: JSON.stringify(dataStore.getAddresses()),
                    allBankAccounts: '[]', // Will be updated from summary
                    initialCashBalance: '0',
                    invoicePrefix: 'INV',
                    invoicePattern: '',
                    startingInvoiceNumber: '1',
                    fiscalYear: 'APR-MAR',
                  }
                });
              } else if (type && value) {
                // Navigate back to address confirmation screen with signup parameters
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
                    allAddresses: JSON.stringify(dataStore.getAddresses()),
                  }
                });
              } else {
                router.push('/settings');
              }
            }
          }
        ]);
        setIsLoading(false);
      }, 500);
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
          {/* Back button removed for edit forms to prevent navigation back */}
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
              {/* Integrated Glowing Search Bar */}
              <View style={styles.searchContainer}>
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
                        outputRange: [0.2, 0.4],
                      }),
                      shadowRadius: glowAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [4, 8],
                      }),
                      shadowOffset: {
                        width: 0,
                        height: 0,
                      },
                      elevation: glowAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [2, 4],
                      }),
                      borderColor: glowAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: ['#3f66ac', '#ffc754'],
                      }),
                      borderWidth: glowAnimation.interpolate({
                        inputRange: [0, 1],
                        outputRange: [1, 2],
                      }),
                    },
                  ]}
                >
                  <Search size={20} color="#3f66ac" />
                  <TextInput
                    ref={searchInputRef}
                    style={styles.searchInput}
                    placeholder="Search for an address..."
                    placeholderTextColor="#999999"
                    value={searchQuery}
                    onChangeText={handleSearchQuery}
                    onFocus={() => setIsSearchActive(true)}
                    onBlur={() => {
                      // Don't hide suggestions immediately to allow clicking on them
                      setTimeout(() => {
                        if (!searchQuery) {
                          setIsSearchActive(false);
                        }
                      }, 300);
                    }}
                    autoCapitalize="none"
                    autoCorrect={false}
                  />
                  {isLoadingSuggestions ? (
                    <View style={styles.loadingIndicator}>
                      <Text style={styles.loadingText}>Searching...</Text>
                    </View>
                  ) : searchQuery.length > 0 ? (
                    <TouchableOpacity
                      onPress={() => {
                        setSearchQuery('');
                        setSuggestions([]);
                        setShowSuggestions(false);
                        setIsSearchActive(false);
                      }}
                      style={styles.clearButton}
                    >
                      <X size={16} color="#666666" />
                    </TouchableOpacity>
                  ) : null}
                </Animated.View>
              </View>

              {/* Search Results - Show between search bar and map */}
              {(() => {
                console.log('🎨 Render check - showSuggestions:', showSuggestions, 'suggestions.length:', suggestions.length);
                return showSuggestions && suggestions.length > 0 ? (
                  <View style={styles.searchResultsContainer}>
                    {suggestions.slice(0, 3).map((suggestion, index) => {
                      console.log('🎨 Rendering suggestion:', index, suggestion.description);
                      return (
                        <TouchableOpacity
                          key={suggestion.place_id || index}
                          style={[
                            styles.searchResultItem,
                            index === suggestions.slice(0, 3).length - 1 && styles.searchResultItemLast
                          ]}
                          onPress={() => handleAddressSelect(suggestion)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.searchResultIcon}>
                            <MapPin size={16} color="#3f66ac" />
                          </View>
                          <View style={styles.searchResultText}>
                            <Text style={styles.searchResultMainText} numberOfLines={1}>
                              {suggestion.structured_formatting?.main_text || suggestion.description?.split(',')[0]}
                            </Text>
                            <Text style={styles.searchResultSecondaryText} numberOfLines={1}>
                              {suggestion.structured_formatting?.secondary_text || suggestion.description}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                ) : null;
              })()}

              <View style={styles.mapWrapper}>
                <PlatformMapView
                  initialLocation={selectedLocation}
                  selectedLocation={selectedLocation}
                  onMapClick={handleMapLocationSelect}
                  onMarkerDragEnd={handleMapLocationSelect}
                />
              </View>


              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  {addressType === 'branch' ? 'Branch Name' : 
                   addressType === 'warehouse' ? 'Warehouse Name' : 'Address Name'} *
                </Text>
                <View style={styles.inputContainer}>
                  <CapitalizedTextInput
                    style={styles.input}
                    value={addressName}
                    onChangeText={setAddressName}
                    placeholder={`e.g., ${addressType === 'branch' ? 'Mumbai Branch' : 
                                addressType === 'warehouse' ? 'Main Warehouse' : 'Head Office'}`}
                    placeholderTextColor="#999999"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Door Number / Building Name *</Text>
                <View style={styles.inputContainer}>
                  <CapitalizedTextInput
                    style={styles.input}
                    value={doorNumber}
                    onChangeText={setDoorNumber}
                    placeholder="e.g., Flat 101, Shop No. 5, Building A"
                    placeholderTextColor="#999999"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address Line 1 *</Text>
                <View style={styles.inputContainer}>
                  <CapitalizedTextInput
                    style={styles.input}
                    value={addressLine1}
                    onChangeText={setAddressLine1}
                    placeholder="Street name, area, landmark"
                    placeholderTextColor="#999999"
                    autoCapitalize="words"
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address Line 2 *</Text>
                <View style={styles.inputContainer}>
                  <CapitalizedTextInput
                    style={styles.input}
                    value={addressLine2}
                    onChangeText={setAddressLine2}
                    placeholder="Additional address information"
                    placeholderTextColor="#999999"
                    autoCapitalize="words"
                  />
                </View>
              </View>

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

              {/* Contact Person Fields */}
              {typeInfo.showContactFields && (
                <View style={styles.contactFieldGroup}>
                  <Text style={styles.contactSectionTitle}>Contact Person Details</Text>
                  
                  <View style={styles.contactFieldRow}>
                    <Text style={styles.contactLabel}>
                      {addressType === 'branch' ? 'Branch Manager' : 
                       addressType === 'warehouse' ? 'Warehouse Manager' : 
                       'Contact Person Name'}
                    </Text>
                    <View style={[styles.inputContainer, styles.contactInputContainer]}>
                      <User size={20} color="#fbbf24" style={styles.inputIcon} />
                      <CapitalizedTextInput
                        style={[styles.input, styles.contactInput]}
                        value={managerName}
                        onChangeText={setManagerName}
                        placeholder={
                          addressType === 'branch' ? 'Branch manager name (optional)' :
                          addressType === 'warehouse' ? 'Warehouse manager name (optional)' :
                          'Person responsible at this location'
                        }
                        placeholderTextColor="#999999"
                        autoCapitalize="words"
                      />
                    </View>
                  </View>

                  <View style={styles.contactFieldRow}>
                    <Text style={styles.contactLabel}>
                      {addressType === 'branch' || addressType === 'warehouse' ? 'Manager Phone' : 'Contact Phone Number'}
                    </Text>
                    <View style={[styles.inputContainer, styles.contactInputContainer]}>
                      <Phone size={20} color="#fbbf24" style={styles.inputIcon} />
                      <TextInput
                        style={[styles.input, styles.contactInput]}
                        value={managerPhone}
                        onChangeText={handleManagerPhoneChange}
                        placeholder={
                          addressType === 'branch' || addressType === 'warehouse' 
                            ? 'Manager phone (optional)'
                            : '10-digit mobile number'
                        }
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
                {isLoading ? 'Updating...' : 'Save Changes'}
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
              
              <View style={styles.modalSearchContainer}>
                <TextInput
                  style={styles.modalSearchInput}
                  placeholder="Search states..."
                  value={stateSearch}
                  onChangeText={setStateSearch}
                  placeholderTextColor="#999999"
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
    overflow: 'visible',
  },
  content: {
    paddingHorizontal: 20,
    paddingBottom: 40,
    overflow: 'visible',
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
    overflow: 'visible',
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
    backgroundColor: '#ffffff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
    borderWidth: 1,
    borderColor: '#d1d5db',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineStyle: 'none',
      },
    }),
  },
  clearButton: {
    padding: 4,
  },
  loadingIndicator: {
    paddingHorizontal: 8,
    paddingVertical: 4,
  },
  // Search Results Container (between search bar and map)
  searchResultsContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#3f66ac',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  searchResultItemLast: {
    borderBottomWidth: 0,
  },
  searchResultIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultText: {
    flex: 1,
  },
  searchResultMainText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
    lineHeight: 18,
  },
  searchResultSecondaryText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 16,
  },
  mapWrapper: {
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: '#f8fafc',
    marginBottom: 28,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
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
  inputContainer: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 12,
    backgroundColor: '#ffffff',
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1a1a1a',
    backgroundColor: 'transparent',
    borderRadius: 12,
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineStyle: 'none',
      },
    }),
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  cityInput: {
    flex: 1.5,
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
  contactInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderColor: '#fbbf24',
    borderWidth: 2,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 0, // Reduced from 10 to 0 to match other fields height
  },
  inputIcon: {
    marginRight: 12,
  },
  contactInput: {
    color: '#000000',
    fontWeight: '500',
    flex: 1,
    paddingVertical: 12, // Reduced from default to match other fields
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineStyle: 'none',
      },
    }),
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
  modalSearchContainer: {
    padding: 20,
    paddingBottom: 10,
  },
  modalSearchInput: {
    borderWidth: 1,
    borderColor: '#d1d5db',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
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
