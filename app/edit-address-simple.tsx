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
import { safeRouter } from '@/utils/safeRouter';
import { ArrowLeft, MapPin, ChevronDown, Search, X, Plus, User, Phone, Building2, Package } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
import { getGSTINStateCode, BusinessAddress, mapLocationsToAddresses, mapLocationToAddress } from '@/utils/dataStore';
import { supabase } from '@/lib/supabase';
import { extractAddressComponents, reverseGeocode } from '@/services/googleMapsApi';
import { useStatusBar } from '@/contexts/StatusBarContext';
import PlatformMapView from '@/components/PlatformMapView';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { createStaff } from '@/services/backendApi';
import { getSignupData, setSignupData } from '@/utils/signupStore';

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
  const params = useLocalSearchParams();
  const stored = getSignupData();
  const editAddressId = params.editAddressId || stored.editAddressId;
  const addressType = params.addressType || stored.addressType || 'primary';
  const type = params.type || stored.type;
  const value = params.value || stored.value;
  const gstinData = params.gstinData || stored.gstinData;
  const name = params.name || stored.name;
  const businessName = params.businessName || stored.businessName;
  const businessType = params.businessType || stored.businessType;
  const customBusinessType = params.customBusinessType || stored.customBusinessType;
  const existingAddresses = params.existingAddresses || stored.existingAddresses || '[]';
  const fromSummary = params.fromSummary || stored.fromSummary || 'false';
  const fromSettings = params.fromSettings || stored.fromSettings || 'false';

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
  const stateSearchInputRef = useRef<TextInput>(null);
  const colors = useThemeColors();
  const defaultLocation = { lat: 28.6139, lng: 77.209 };
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number }>(defaultLocation);

  // Contact person fields (for branch/warehouse)
  const [managerName, setManagerName] = useState('');
  const [managerPhone, setManagerPhone] = useState('');
  const [originalAddress, setOriginalAddress] = useState<any>(null);
  const [originalPhone, setOriginalPhone] = useState<string>('');
  const [showStaffOtpModal, setShowStaffOtpModal] = useState(false);
  const [staffOtpCode, setStaffOtpCode] = useState('');
  const [staffOtpName, setStaffOtpName] = useState('');
  const pendingNavigateRef = useRef<(() => void) | null>(null);

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

      console.log('🔍 Loading address with editAddressId:', editAddressId);
      console.log('🔍 From settings:', fromSettings === 'true', 'From summary:', fromSummary === 'true');
      
      // Try to find address from route params first (passed between screens)
      let existingAddress: any = null;
      try {
        const paramAddrs = JSON.parse((existingAddresses || '[]') as string);
        const mapped = mapLocationsToAddresses(paramAddrs);
        existingAddress = mapped.find(a => a.id === editAddressId || a.backendId === editAddressId);
      } catch { /* ignore parse error */ }

      // Fallback: query backend directly
      if (!existingAddress) {
        try {
          const { data: loc } = await supabase
            .from('locations')
            .select('*')
            .eq('id', editAddressId)
            .maybeSingle();
          if (loc) {
            existingAddress = mapLocationToAddress(loc);
          }
        } catch { /* ignore */ }
      }

      if (!existingAddress) {
        Alert.alert('Error', 'Address not found. Please go back and try again.');
        return;
      }
      
      // ✅ Log address details for debugging
      console.log('✅ Address loaded successfully:', {
        localId: existingAddress.id,
        backendId: existingAddress.backendId,
        name: existingAddress.name,
        type: existingAddress.type
      });

      // Store original address for change detection
      setOriginalAddress({
        name: existingAddress.name,
        doorNumber: existingAddress.doorNumber || '',
        addressLine1: existingAddress.addressLine1,
        addressLine2: existingAddress.addressLine2,
        city: existingAddress.city,
        pincode: existingAddress.pincode,
        stateCode: existingAddress.stateCode,
        manager: existingAddress.manager || '',
        phone: existingAddress.phone || '',
        additionalLines: existingAddress.additionalLines || [], // ✅ Include additionalLines in original address
      });

      setAddressName(existingAddress.name);
      setDoorNumber(existingAddress.doorNumber || '');
      setAddressLine1(existingAddress.addressLine1);
      setAddressLine2(existingAddress.addressLine2);
      setCity(existingAddress.city);
      setPincode(existingAddress.pincode);
      setManagerName(existingAddress.manager || '');
      setManagerPhone(existingAddress.phone || '');
      setOriginalPhone(existingAddress.phone || '');
      
      // Load additional lines (doorNumber is separate, not in additionalLines)
      if (existingAddress.additionalLines && Array.isArray(existingAddress.additionalLines)) {
        setAdditionalLines([...existingAddress.additionalLines]);
      } else {
        setAdditionalLines([]);
      }

      const matchingState = indianStates.find(state => state.code === existingAddress.stateCode);
      if (matchingState) {
        setSelectedState(matchingState);
      }

      // Geocode the existing address to show on map
      const addressParts = [
        existingAddress.doorNumber,
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
                // Use setTimeout to ensure map is ready
                setTimeout(() => {
                setSelectedLocation({ lat, lng });
                }, 500);
              }
            }
          } else {
            // Fallback: try reverse geocoding with city and state
            console.log('⚠️ No predictions found, trying fallback geocoding');
            try {
              const fallbackText = `${existingAddress.city}, ${matchingState?.name || ''}`;
              const fallbackPredictions = await getPlacePredictions(fallbackText);
              if (fallbackPredictions && fallbackPredictions.length > 0) {
                const placeDetails = await getPlaceDetails(fallbackPredictions[0].place_id);
                const geometry = placeDetails?.geometry?.location;
                if (geometry) {
                  const lat = typeof geometry.lat === 'function' ? geometry.lat() : geometry.lat;
                  const lng = typeof geometry.lng === 'function' ? geometry.lng() : geometry.lng;
                  if (lat && lng) {
                    setTimeout(() => {
                      setSelectedLocation({ lat, lng });
                    }, 500);
                  }
                }
              }
            } catch (fallbackError) {
              console.log('⚠️ Fallback geocoding also failed:', fallbackError);
            }
          }
        } catch (error) {
          console.log('⚠️ Failed to resolve map location for existing address:', error);
        }
      }
    };

    loadAddress();
  }, [editAddressId]);

  const parsedExistingAddresses = React.useMemo(() => {
    try {
      return mapLocationsToAddresses(JSON.parse((existingAddresses || '[]') as string));
    } catch { return []; }
  }, [existingAddresses]);

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
      // Clean up city name on mobile - remove administrative suffixes like "Division", "District", etc.
      let cleanedCity = components.city;
      if (Platform.OS !== 'web') {
        // Remove common administrative suffixes
        cleanedCity = components.city
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
        
        console.log('🧹 Cleaned city name:', components.city, '->', cleanedCity);
      }
      setCity(cleanedCity);
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

  // Check if any changes have been made
  const hasChanges = () => {
    if (!originalAddress) return false;
    
    // ✅ Check if additionalLines have changed
    const currentAdditionalLines = additionalLines.filter(line => line.trim().length > 0);
    const originalAdditionalLines = originalAddress.additionalLines || [];
    const additionalLinesChanged = JSON.stringify(currentAdditionalLines) !== JSON.stringify(originalAdditionalLines);
    
    return (
      addressName.trim() !== originalAddress.name ||
      doorNumber.trim() !== originalAddress.doorNumber ||
      addressLine1.trim() !== originalAddress.addressLine1 ||
      addressLine2.trim() !== originalAddress.addressLine2 ||
      city.trim() !== originalAddress.city ||
      pincode.trim() !== originalAddress.pincode ||
      selectedState?.code !== originalAddress.stateCode ||
      managerName.trim() !== originalAddress.manager ||
      managerPhone.trim() !== originalAddress.phone ||
      additionalLinesChanged // ✅ Include additionalLines in change detection
    );
  };

  const handleCancel = () => {
    if (fromSettings === 'true') {
      router.back();
    } else if (fromSummary === 'true') {
      setSignupData({
        type, value, gstinData, name, businessName, businessType, customBusinessType,
        allAddresses: JSON.stringify(parsedExistingAddresses),
        allBankAccounts: '[]', initialCashBalance: '0',
        invoicePrefix: 'INV', invoicePattern: '', startingInvoiceNumber: '1', fiscalYear: 'APR-MAR',
      });
      safeRouter.replace('/auth/business-summary');
    } else if (type && value) {
      setSignupData({
        type, value, gstinData, name, businessName, businessType, customBusinessType,
        allAddresses: JSON.stringify(parsedExistingAddresses),
      });
      safeRouter.replace('/auth/address-confirmation');
    } else {
      router.back();
    }
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('Invalid Form', 'Please fill all required fields correctly');
      return;
    }

    setIsLoading(true);
    
    try {
      let existingAddress: any = parsedExistingAddresses.find(
        a => a.id === editAddressId || a.backendId === editAddressId
      );
      if (!existingAddress) {
        try {
          const { data: loc } = await supabase
            .from('locations')
            .select('*')
            .eq('id', editAddressId)
            .maybeSingle();
          if (loc) {
            existingAddress = mapLocationToAddress(loc);
          }
        } catch { /* ignore */ }
      }
      
      if (!existingAddress) {
        Alert.alert('Error', 'Address not found. Please go back and try again.');
        setIsLoading(false);
        return;
      }
      
      // Resolve the real backend UUID
      let backendId = existingAddress.backendId || (existingAddress.id === editAddressId ? editAddressId : null);
      
      // If backendId doesn't look like a UUID, look up the real one from Supabase
      const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backendId || '');
      if (!isUUID) {
        console.log('🔍 backendId is not a UUID, looking up real ID from Supabase...', backendId);
        try {
          const { data: { session } } = await supabase.auth.getSession();
          if (session?.user) {
            const { data: userData } = await supabase
              .from('users')
              .select('business_id')
              .eq('id', session.user.id)
              .single();
            
            if (userData?.business_id) {
              const { data: locations } = await supabase
                .from('locations')
                .select('id, name')
                .eq('business_id', userData.business_id)
                .eq('is_deleted', false);
              
              if (locations && locations.length > 0) {
                const addrName = existingAddress.name || addressName.trim();
                const match = locations.find((l: any) => l.name === addrName);
                if (match) {
                  console.log('✅ Found real backend UUID by name:', match.id, 'for name:', addrName);
                  backendId = match.id;
                } else {
                  console.log('⚠️ No name match for:', addrName, '- available:', locations.map((l: any) => `${l.id}: ${l.name}`));
                }
              }
            }
          }
        } catch (lookupErr) {
          console.warn('⚠️ Failed to look up real backend ID:', lookupErr);
        }
      }
      
      if (!backendId || !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(backendId)) {
        console.error('❌ Could not resolve a valid backend UUID:', {
          editAddressId,
          addressId: existingAddress.id,
          backendId
        });
        Alert.alert('Error', 'Cannot update address: Unable to find it in the database. Please go back and try again.');
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Updating address with backendId:', backendId, 'local ID:', existingAddress.id);
      
      // ✅ Use optimistic update: Update DataStore immediately, sync backend in background
      const { optimisticUpdateAddress } = await import('@/utils/optimisticSync');
      
      // Prepare address updates with all fields including additionalLines
      const addressUpdates: Partial<BusinessAddress> = {
        name: addressName.trim(),
        doorNumber: doorNumber.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        additionalLines: additionalLines.filter(line => line.trim().length > 0), // ✅ Always include additionalLines
        city: city.trim(),
        pincode: pincode,
        stateName: selectedState?.name || '',
        stateCode: getGSTINStateCode(selectedState?.name || ''),
        manager: addressType === 'primary' 
          ? (Array.isArray(name) ? name[0] : (name || managerName.trim()))
          : (typeInfo.showContactFields ? managerName.trim() : undefined),
        phone: addressType === 'primary'
          ? (managerPhone.trim() || originalPhone)
          : (typeInfo.showContactFields ? managerPhone.trim() : undefined),
        isPrimary: addressType === 'primary',
        updatedAt: new Date().toISOString(),
        backendId: backendId, // ✅ Ensure backendId is included in updates
      };
      
      // ✅ Optimistically update (DataStore updated immediately, backend sync in background)
      // Use the address's local ID for DataStore lookup, but ensure backendId is set
      console.log('🔄 Calling optimisticUpdateAddress with:', {
        localId: existingAddress.id,
        backendId: backendId,
        hasUpdates: Object.keys(addressUpdates).length
      });
      
      const result = await optimisticUpdateAddress(existingAddress.id, addressUpdates, { 
        showError: true, // ✅ Show errors to help debug
        awaitSync: true,
        revertOnError: false // Don't revert - let user see the error
      });
      
      if (!result.success) {
        console.error('❌ Failed to update address:', result.error);
        console.error('❌ Update details:', {
          localId: existingAddress.id,
          backendId: backendId,
          addressName: addressName
        });
        Alert.alert(
          'Update Failed', 
          result.error || 'Failed to update address in backend. Please check your connection and try again.',
          [{ text: 'OK' }]
        );
        setIsLoading(false);
        return;
      }
      
      console.log('✅ Address update successful:', {
        localId: existingAddress.id,
        backendId: backendId,
        addressName: addressName
      });
      
      // ✅ Clear cache to ensure fresh data is loaded when navigating back
      const { clearBusinessDataCache, prefetchBusinessData } = await import('@/hooks/useBusinessData');
      clearBusinessDataCache();
      
      // ✅ Wait for backend to fully process the update (increased delay for reliability)
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // ✅ Prefetch data BEFORE navigation to ensure it's ready when screen loads
      // This ensures the screen shows updated data immediately without waiting for refetch
      // AWAIT the prefetch to ensure data is ready before navigation
      try {
        await prefetchBusinessData();
        console.log('✅ Business data prefetched - screen will show updated address immediately');
      } catch (error) {
        console.warn('⚠️ Prefetch failed (non-blocking):', error);
        // Continue with navigation even if prefetch fails
      }
      
      setIsLoading(false);

      const doNavigate = () => {
        if (fromSettings === 'true') {
          router.back();
        } else if (fromSummary === 'true') {
          setSignupData({
            type, value, gstinData, name, businessName, businessType, customBusinessType,
            allBankAccounts: '[]', initialCashBalance: '0',
            invoicePrefix: 'INV', invoicePattern: '', startingInvoiceNumber: '1', fiscalYear: 'APR-MAR',
          });
          safeRouter.replace('/auth/business-summary');
        } else if (type && value) {
          setSignupData({
            type, value, gstinData, name, businessName, businessType, customBusinessType,
            allAddresses: JSON.stringify(parsedExistingAddresses),
          });
          safeRouter.replace('/auth/address-confirmation');
        } else {
          router.back();
        }
      };

      // Auto-create staff for branch/warehouse manager during onboarding
      const isOnboarding = fromSettings !== 'true' && !!(type && value);
      const isBranchOrWarehouse = addressType === 'branch' || addressType === 'warehouse';
      const hasNewManager = managerName.trim() && managerPhone.trim().length === 10;
      const managerChanged = managerName.trim() !== (originalAddress?.manager || '') || managerPhone.trim() !== (originalAddress?.phone || '');

      if (isOnboarding && isBranchOrWarehouse && hasNewManager && managerChanged) {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        try {
          const staffResult = await createStaff({
            name: managerName.trim(),
            mobile: managerPhone.trim(),
            role: 'Manager',
            department: addressType === 'branch' ? 'Branch' : 'Warehouse',
            locationName: addressName.trim(),
            locationType: addressType as 'branch' | 'warehouse',
            verificationCode,
          });
          if (staffResult.success) {
            console.log('✅ Staff created during onboarding edit:', managerName.trim());
            setStaffOtpName(managerName.trim());
            setStaffOtpCode(verificationCode);
            pendingNavigateRef.current = doNavigate;
            setShowStaffOtpModal(true);
            return;
          }
        } catch (staffErr) {
          console.warn('⚠️ Staff creation error during edit:', staffErr);
        }
      }

      doNavigate();
    } catch (error) {
      console.error('Error updating address:', error);
      Alert.alert('Error', 'Failed to update address. Please try again.');
      setIsLoading(false);
    }
  };

  const handleDismissStaffOtpModal = () => {
    setShowStaffOtpModal(false);
    if (pendingNavigateRef.current) {
      pendingNavigateRef.current();
      pendingNavigateRef.current = null;
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
  };

  const filteredStates = indianStates.filter(state =>
    state.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    state.code.toLowerCase().includes(stateSearch.toLowerCase())
  );

  const IconComponent = typeInfo.icon;

  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
        enabled={true}
      >
        {/* Back Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleCancel}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color="#1a1a1a" />
        </TouchableOpacity>

        <ScrollView 
          style={styles.scrollView} 
          contentContainerStyle={webContainerStyles.webScrollContent} 
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
              <View style={styles.mapWrapper}>
                <PlatformMapView
                  initialLocation={selectedLocation}
                  selectedLocation={selectedLocation}
                  onMapClick={handleMapLocationSelect}
                  onMarkerDragEnd={handleMapLocationSelect}
                />
                
                {/* Floating Search Bar over Map */}
                <View style={styles.floatingSearchContainer}>
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
                      style={[
                        styles.mapSearchInput,
                        Platform.select({
                          web: {
                            outlineWidth: 0,
                            outlineColor: 'transparent',
                            outlineStyle: 'none' as any,
                          },
                        }),
                      ]}
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

                {/* Search Results - Show below search bar */}
              {(() => {
                console.log('🎨 Render check - showSuggestions:', showSuggestions, 'suggestions.length:', suggestions.length);
                return showSuggestions && suggestions.length > 0 ? (
                    <View style={styles.floatingSearchResultsContainer}>
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
                  <View style={styles.inputContainer}>
                    <CapitalizedTextInput
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

            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={handleCancel}
                activeOpacity={0.8}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>

            <TouchableOpacity
              style={[
                styles.submitButton,
                  (isFormValid() && hasChanges()) ? styles.enabledButton : styles.disabledButton
              ]}
              onPress={handleSubmit}
                disabled={!isFormValid() || !hasChanges() || isLoading}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.submitButtonText,
                  (isFormValid() && hasChanges()) ? styles.enabledButtonText : styles.disabledButtonText
              ]}>
                  {isLoading ? 'Saving...' : 'Save Changes'}
              </Text>
            </TouchableOpacity>
            </View>
          </Animated.View>
        </ScrollView>

        {/* State Selection Modal */}
        <Modal
          visible={showStates}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowStates(false)}
        >
          <TouchableOpacity 
            style={styles.modalOverlay} 
            activeOpacity={1} 
            onPressOut={() => {
              setShowStates(false);
              // Delay to allow keyboard to dismiss
              setTimeout(() => stateSearchInputRef.current?.blur(), 100);
            }}
          >
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select State</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setShowStates(false);
                    // Delay to allow keyboard to dismiss
                    setTimeout(() => stateSearchInputRef.current?.blur(), 100);
                  }}
                  activeOpacity={0.7}
                >
                  <X size={24} color="#666666" />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Search size={18} color="#64748b" style={styles.searchIcon} />
                <TextInput
                  ref={stateSearchInputRef}
                  style={styles.searchInput}
                  value={stateSearch}
                  onChangeText={setStateSearch}
                  placeholder="Search states..."
                  placeholderTextColor="#94a3b8"
                  autoFocus={true}
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
          </TouchableOpacity>
        </Modal>

        {/* Staff OTP Modal */}
        <Modal
          visible={showStaffOtpModal}
          transparent
          animationType="fade"
          onRequestClose={handleDismissStaffOtpModal}
        >
          <View style={styles.otpModalOverlay}>
            <View style={styles.otpModalContent}>
              <Text style={{ fontSize: 40, marginBottom: 12 }}>🔑</Text>
              <Text style={styles.otpModalTitle}>Staff Verification Code</Text>
              <Text style={styles.otpModalSubtitle}>
                Share this code with <Text style={{ fontWeight: '700' }}>{staffOtpName}</Text> for their first login.
              </Text>
              <View style={styles.otpCodeContainer}>
                <Text style={styles.otpCodeText} selectable>{staffOtpCode}</Text>
              </View>
              <Text style={styles.otpModalHint}>
                The staff member can use the Staff Login option in the Manager app, verify their mobile number, and enter this code to join your business.
              </Text>
              <TouchableOpacity style={styles.otpModalButton} onPress={handleDismissStaffOtpModal} activeOpacity={0.8}>
                <Text style={styles.otpModalButtonText}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ResponsiveContainer>
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
  scrollView: {
    flex: 1,
    overflow: 'visible',
  },
  content: {
    paddingHorizontal: Platform.select({
      web: 24,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    paddingTop: Platform.select({
      web: 60,
      default: 60,
    }),
    paddingBottom: Platform.select({
      web: 40,
      ios: 20,
      android: 12, // Consistent bottom padding on Android for cleaner look
      default: 20,
    }),
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
  // Floating search bar over map
  floatingSearchContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
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
  mapSearchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1a1a1a',
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineStyle: 'none' as any,
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
  loadingText: {
    fontSize: 14,
    color: '#666666',
  },
  // Floating search results container
  floatingSearchResultsContainer: {
    position: 'absolute',
    top: 80, // Below the search bar
    left: 16,
    right: 16,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#3f66ac',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 9,
    maxHeight: 200,
    overflow: 'hidden',
  },
  // Search Results Container (between search bar and map) - kept for backward compatibility
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
    position: 'relative',
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
        outlineStyle: 'none' as any,
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
        outlineStyle: 'none' as any,
      },
    }),
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  cancelButton: {
    flex: 1,
    borderRadius: 16,
    paddingVertical: 18,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f3f4f6',
    borderWidth: 2,
    borderColor: '#d1d5db',
  },
  cancelButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#6b7280',
  },
  submitButton: {
    flex: 1,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#ffffff',
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
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
  stateCodeText: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
  },
  stateCodeTextSelected: {
    color: '#ffffff',
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
  otpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  otpModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center' as const,
  },
  otpModalTitle: {
    fontSize: 20,
    fontWeight: '700' as const,
    color: '#1e293b',
    marginBottom: 8,
  },
  otpModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center' as const,
    marginBottom: 20,
    lineHeight: 20,
  },
  otpCodeContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    borderColor: '#3F66AC',
    borderStyle: 'dashed' as const,
    marginBottom: 16,
  },
  otpCodeText: {
    fontSize: 32,
    fontWeight: '800' as const,
    color: '#3F66AC',
    letterSpacing: 8,
    textAlign: 'center' as const,
  },
  otpModalHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center' as const,
    marginBottom: 20,
    lineHeight: 18,
  },
  otpModalButton: {
    backgroundColor: '#3F66AC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    width: '100%' as const,
    alignItems: 'center' as const,
  },
  otpModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600' as const,
  },
});
