import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
  Animated,
  KeyboardAvoidingView,
  Keyboard,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Edit3, Navigation, Search } from 'lucide-react-native';
import GooglePlacesSearch from '@/components/GooglePlacesSearch';
import WebAddressSearch from '@/components/WebAddressSearch';
import PlatformMapView from '@/components/PlatformMapView';
import * as Location from 'expo-location';
import { reverseGeocode, extractAddressComponents } from '@/services/googleMapsApi';
import { useStatusBar } from '@/contexts/StatusBarContext';
// DataStore removed - Supabase backend is the sole source of truth
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { getSignupData, setSignupData } from '@/utils/signupStore';

const { width, height } = Dimensions.get('window');

interface SelectedAddress {
  street: string;
  area: string;
  city: string;
  state: string;
  pincode: string;
  formatted_address: string;
  stateCode: string;
  lat?: number;
  lng?: number;
}

export default function BusinessAddressScreen() {
  const _params = useLocalSearchParams();
  const _stored = getSignupData();

  const type = (_params.type as string) ?? _stored.type ?? '';
  const value = (_params.value as string) ?? _stored.value ?? '';
  const gstinData = (_params.gstinData as string) ?? _stored.gstinData ?? '';
  const name = (_params.name as string) ?? _stored.name ?? '';
  const businessName = (_params.businessName as string) ?? _stored.businessName ?? '';
  const businessType = (_params.businessType as string) ?? _stored.businessType ?? '';
  const customBusinessType = (_params.customBusinessType as string) ?? _stored.customBusinessType ?? '';
  const mobile = (_params.mobile as string) ?? _stored.mobile ?? '';
  const addressType = (_params.addressType as string) ?? _stored.addressType ?? 'primary';
  const existingAddresses = (_params.existingAddresses as string) ?? _stored.existingAddresses ?? '[]';
  const fromSummary = (_params.fromSummary as string) ?? _stored.fromSummary ?? '';
  const allBankAccounts = (_params.allBankAccounts as string) ?? _stored.allBankAccounts ?? '';
  const initialCashBalance = (_params.initialCashBalance as string) ?? _stored.initialCashBalance ?? '';
  const invoicePrefix = (_params.invoicePrefix as string) ?? _stored.invoicePrefix ?? '';
  const invoicePattern = (_params.invoicePattern as string) ?? _stored.invoicePattern ?? '';
  const startingInvoiceNumber = (_params.startingInvoiceNumber as string) ?? _stored.startingInvoiceNumber ?? '';
  const fiscalYear = (_params.fiscalYear as string) ?? _stored.fiscalYear ?? '';

  const { setStatusBarStyle } = useStatusBar();
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [showSearchBar, setShowSearchBar] = useState(true);
  const [isAddressFromSearch, setIsAddressFromSearch] = useState(false);
  const [keyboardHeight, setKeyboardHeight] = useState(0); // Track keyboard height
  const resolvedName = Array.isArray(name) ? name[0] : name;
  const resolvedMobile = Array.isArray(mobile) ? mobile[0] : mobile;
  const resolvedMobileDigits = resolvedMobile ? resolvedMobile.replace(/\D/g, '').slice(0, 10) : '';

  // Get count for dynamic header
  const getAddressCount = () => {
    if (addressType === 'primary') return '';
    try {
      const parsed = JSON.parse(existingAddresses as string || '[]');
      const typeAddresses = parsed.filter((addr: any) => addr.type === addressType);
      return ` - ${typeAddresses.length + 1}`;
    } catch { return ''; }
  };

  // Set status bar to light for blue header
  useEffect(() => {
    setStatusBarStyle('light-content');
  }, [setStatusBarStyle]);
  const [isSearchExpanded, setIsSearchExpanded] = useState(true);
  const searchAnimation = useRef(new Animated.Value(1)).current;

  useEffect(() => {
    getCurrentLocationAndInitMap();
  }, []);

  useEffect(() => {
    if (userLocation) {
      setIsMapLoading(false);
    }
  }, [userLocation]);

  // Handle keyboard show/hide for Android
  useEffect(() => {
    if (Platform.OS === 'android') {
      const keyboardWillShow = Keyboard.addListener('keyboardDidShow', (e) => {
        setKeyboardHeight(e.endCoordinates.height);
      });
      const keyboardWillHide = Keyboard.addListener('keyboardDidHide', () => {
        setKeyboardHeight(0);
      });

      return () => {
        keyboardWillShow.remove();
        keyboardWillHide.remove();
      };
    }
  }, []);

  // Animate search bar collapse/expand
  useEffect(() => {
    Animated.timing(searchAnimation, {
      toValue: isSearchExpanded ? 1 : 0,
      duration: 300,
      useNativeDriver: false,
    }).start();
  }, [isSearchExpanded]);

  const getCurrentLocationAndInitMap = async () => {
    setIsGettingLocation(true);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        // Use appropriate accuracy based on platform for better performance
        const location = await Location.getCurrentPositionAsync({
          accuracy: Platform.OS === 'android' ? Location.Accuracy.Balanced : Location.Accuracy.High,
          maximumAge: 10000, // Use cached location if less than 10 seconds old
          timeout: 15000, // 15 second timeout
        });
        
        const userCoords = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };
        
        setUserLocation(userCoords);
      } else {
        // Show better permission dialog for Android
        if (Platform.OS === 'android') {
          Alert.alert(
            'Location Permission', 
            'Please grant location permission to use this feature. You can enable it in your device settings.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => Location.openAppSettingsAsync() }
            ]
          );
        }
        const defaultLocation = { lat: 28.6139, lng: 77.2090 };
        setUserLocation(defaultLocation);
      }
      
      setIsGettingLocation(false);
    } catch (error) {
      console.error('Location error:', error);
      const errorMessage = Platform.OS === 'android' 
        ? 'Failed to get current location. Please check your GPS settings and try again.'
        : 'Failed to get current location. Please try again.';
      Alert.alert('Location Error', errorMessage);
      const defaultLocation = { lat: 28.6139, lng: 77.2090 };
      setUserLocation(defaultLocation);
      setIsGettingLocation(false);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    try {
      setIsAddressFromSearch(false); // Reset flag when user clicks on map directly
      await handleMarkerDragEnd(lat, lng);
    } catch (error) {
      console.error('Map click error:', error);
    }
  };

  const handleMarkerDragEnd = async (lat: number, lng: number) => {
    try {
      // Don't override addresses that were selected from search
      if (isAddressFromSearch) {
        console.log('📍 Skipping marker drag end - address was selected from search');
        return;
      }

      const results = await reverseGeocode(lat, lng);
      
      if (results && results.length > 0) {
        const result = results[0];
        const addressData = extractAddressComponents(result);
        
        // Extract street address from formatted address if not available
        let streetAddress = '';
        if (addressData.street) {
          streetAddress = addressData.street;
        } else if (addressData.street_number && addressData.route) {
          streetAddress = `${addressData.street_number} ${addressData.route}`;
        } else if (addressData.route) {
          streetAddress = addressData.route;
        } else if (addressData.premise) {
          streetAddress = addressData.premise;
        } else if (addressData.formatted_address) {
          // Extract from formatted address
          const parts = addressData.formatted_address.split(',');
          streetAddress = parts[0]?.trim() || '';
        }

        // Build area for Address Line 2 with better fallback logic
        let areaValue = '';
        if (addressData.area && addressData.area.trim()) {
          areaValue = addressData.area;
          console.log('📍 handleMarkerDragEnd - Using addressData.area:', areaValue);
        } else {
          // Fallback chain: sublocality levels > neighborhood > sublocality > district
          const areaParts: string[] = [];
          if (addressData.sublocality_level_2) areaParts.push(addressData.sublocality_level_2);
          if (addressData.sublocality_level_3 && !areaParts.includes(addressData.sublocality_level_3)) {
            areaParts.push(addressData.sublocality_level_3);
          }
          if (addressData.neighborhood && !areaParts.includes(addressData.neighborhood)) {
            areaParts.push(addressData.neighborhood);
          }
          if (addressData.sublocality && !areaParts.includes(addressData.sublocality)) {
            areaParts.push(addressData.sublocality);
          }
          if (areaParts.length === 0 && addressData.district) {
            areaParts.push(addressData.district);
          }
          
          // If still no area, try to extract from formatted address
          if (areaParts.length === 0 && addressData.formatted_address) {
            const addressParts = addressData.formatted_address.split(',').map(p => p.trim());
            // Skip first part (street), last part (country), and parts that are city/state/pincode
            for (let i = 1; i < addressParts.length - 1; i++) {
              const part = addressParts[i];
              // Skip if it's the city, state, pincode, or country
              if (part !== addressData.city && 
                  part !== addressData.locality &&
                  part !== addressData.state && 
                  part !== addressData.administrative_area_level_1 &&
                  part !== addressData.pincode && 
                  part !== addressData.postal_code &&
                  part !== addressData.country &&
                  !/^\d{6}$/.test(part) && // Not a pincode
                  part.length > 0 &&
                  !part.toLowerCase().includes('india')) {
                areaParts.push(part);
                break; // Take the first valid part
              }
            }
          }
          
          areaValue = areaParts.join(', ');
          console.log('📍 handleMarkerDragEnd - Extracted areaValue from fallback:', areaValue);
          console.log('📍 handleMarkerDragEnd - areaParts:', areaParts);
        }

        // Enhanced city extraction - matching Google Maps API priority
        // Priority: postal_town > administrative_area_level_2 (district) > city (from extractAddressComponents) > locality (last resort)
        // Note: extractAddressComponents now prioritizes postal_town and district, so addressData.city should be reliable
        let cityValue = '';
        
        // Priority 1: postal_town (most reliable city name from Google Maps API)
        if (addressData.postal_town) {
          cityValue = addressData.postal_town;
          console.log('📍 Set city from postal_town (most reliable):', cityValue);
        } 
        // Priority 2: administrative_area_level_2 (district) - reliable for Indian addresses
        else if (addressData.administrative_area_level_2 || addressData.district) {
          cityValue = addressData.administrative_area_level_2 || addressData.district;
          console.log('📍 Set city from district:', cityValue);
        } 
        // Priority 3: Use city from extractAddressComponents (should already be postal_town or district)
        else if (addressData.city) {
          cityValue = addressData.city;
          console.log('📍 Set city from addressData.city:', cityValue);
        }
        // Priority 4: Use locality only as last resort (often a neighborhood, not the city)
        else if (addressData.locality) {
          cityValue = addressData.locality;
          console.log('📍 Set city from locality (last resort - may be inaccurate):', cityValue);
        }
        // Priority 5: Extract from formatted address as last resort
        else if (addressData.formatted_address) {
          const addressParts = addressData.formatted_address.split(',').map((p: string) => p.trim());
          for (let i = addressParts.length - 2; i >= 1; i--) {
            const part = addressParts[i];
            if (/^\d{6}$/.test(part)) continue; // Skip pincode
            if (addressData.state && part.toLowerCase().includes(addressData.state.toLowerCase())) continue;
            if (addressData.administrative_area_level_1 && part.toLowerCase().includes(addressData.administrative_area_level_1.toLowerCase())) continue;
            const commonWords = ['road', 'street', 'avenue', 'lane', 'colony', 'nagar', 'area', 'puram', 'palayam', 'patti', 'circle', 'chowk', 'market', 'plaza', 'mall', 'sector', 'phase', 'block', 'village', 'town'];
            if (commonWords.some(word => part.toLowerCase().includes(word))) continue;
            if (part.length > 2 && part.length < 50) {
              cityValue = part;
              console.log('📍 Set city from formatted address:', cityValue);
              break;
            }
          }
        }
        
        if (cityValue) {
          console.log('✅ Final city set:', cityValue);
        } else {
          console.warn('⚠️ No city value found in address data');
        }

        const processedAddress: SelectedAddress = {
          street: streetAddress,
          area: areaValue,
          city: cityValue,
          state: addressData.state || addressData.administrative_area_level_1 || '',
          pincode: addressData.pincode || addressData.postal_code || '',
          formatted_address: addressData.formatted_address,
          stateCode: addressData.state ? getGSTStateCode(addressData.state) : '',
          lat,
          lng,
        };
        
      setSelectedAddress(processedAddress);
      setIsSearchExpanded(false); // Collapse search bar after selection
      
      // Log the coordinates for backend storage (not shown to user)
      console.log('📍 Selected Address Coordinates:', {
        latitude: lat,
        longitude: lng,
        formatted_address: processedAddress.formatted_address
      });
      }
    } catch (error) {
      console.error('Reverse geocoding error:', error);
    }
  };

  const handleAddressSelect = (addressData: any) => {
    try {
      console.log('📍 Raw address data:', addressData);
      
      // Build street address with premise name priority
      let streetAddress = '';
      
      // Priority 1: Use place name from search suggestion
      if (addressData.placeName && addressData.placeName.trim()) {
        streetAddress = addressData.placeName;
        console.log('📍 Using place name from search:', addressData.placeName);
        // Add route if available and different
        if (addressData.route && !streetAddress.includes(addressData.route)) {
          streetAddress += `, ${addressData.route}`;
        }
      } 
      // Priority 2: Use premise/subpremise
      else if (addressData.premise || addressData.subpremise) {
        streetAddress = [addressData.subpremise, addressData.premise].filter(Boolean).join(', ');
        console.log('📍 Using premise:', streetAddress);
        if (addressData.route) {
          streetAddress += `, ${addressData.route}`;
        }
      }
      // Priority 3: Use street from extracted components
      else if (addressData.street) {
        streetAddress = addressData.street;
      } 
      // Priority 4: Build from street components
      else if (addressData.street_number && addressData.route) {
        streetAddress = `${addressData.street_number} ${addressData.route}`;
      } else if (addressData.route) {
        streetAddress = addressData.route;
      } else if (addressData.formatted_address) {
        // Extract from formatted address
        const parts = addressData.formatted_address.split(',');
        streetAddress = parts[0]?.trim() || '';
      }

      // Build area for Address Line 2 with better fallback logic
      let areaValue = '';
      if (addressData.area && addressData.area.trim()) {
        areaValue = addressData.area;
        console.log('📍 Using addressData.area:', areaValue);
      } else {
        // Fallback chain: sublocality levels > neighborhood > sublocality > district
        const areaParts: string[] = [];
        if (addressData.sublocality_level_2) areaParts.push(addressData.sublocality_level_2);
        if (addressData.sublocality_level_3 && !areaParts.includes(addressData.sublocality_level_3)) {
          areaParts.push(addressData.sublocality_level_3);
        }
        if (addressData.neighborhood && !areaParts.includes(addressData.neighborhood)) {
          areaParts.push(addressData.neighborhood);
        }
        if (addressData.sublocality && !areaParts.includes(addressData.sublocality)) {
          areaParts.push(addressData.sublocality);
        }
        if (areaParts.length === 0 && addressData.district) {
          areaParts.push(addressData.district);
        }
        
        // If still no area, try to extract from formatted address
        if (areaParts.length === 0 && addressData.formatted_address) {
          const addressParts = addressData.formatted_address.split(',').map(p => p.trim());
          // Skip first part (street), last part (country), and parts that are city/state/pincode
          for (let i = 1; i < addressParts.length - 1; i++) {
            const part = addressParts[i];
            // Skip if it's the city, state, pincode, or country
            if (part !== addressData.city && 
                part !== addressData.locality &&
                part !== addressData.state && 
                part !== addressData.administrative_area_level_1 &&
                part !== addressData.pincode && 
                part !== addressData.postal_code &&
                part !== addressData.country &&
                !/^\d{6}$/.test(part) && // Not a pincode
                part.length > 0 &&
                !part.toLowerCase().includes('india')) {
              areaParts.push(part);
              break; // Take the first valid part
            }
          }
        }
        
        areaValue = areaParts.join(', ');
        console.log('📍 Extracted areaValue from fallback:', areaValue);
        console.log('📍 areaParts:', areaParts);
      }

      // Enhanced city extraction - matching web implementation
      // Priority: city > locality > postal_town > administrative_area_level_2 (district) > sublocality_level_1
      let cityValue = '';
      if (addressData.city) {
        cityValue = addressData.city;
      } else if (addressData.locality) {
        cityValue = addressData.locality;
      } else if (addressData.postal_town) {
        cityValue = addressData.postal_town;
      } else if (addressData.administrative_area_level_2 || addressData.district) {
        cityValue = addressData.administrative_area_level_2 || addressData.district;
      } else if (addressData.sublocality_level_1) {
        cityValue = addressData.sublocality_level_1;
      } else if (addressData.formatted_address) {
        // Extract from formatted address as last resort
        const addressParts = addressData.formatted_address.split(',').map((p: string) => p.trim());
        for (let i = addressParts.length - 2; i >= 1; i--) {
          const part = addressParts[i];
          if (/^\d{6}$/.test(part)) continue; // Skip pincode
          if (addressData.state && part.toLowerCase().includes(addressData.state.toLowerCase())) continue;
          if (addressData.administrative_area_level_1 && part.toLowerCase().includes(addressData.administrative_area_level_1.toLowerCase())) continue;
          const commonWords = ['road', 'street', 'avenue', 'lane', 'colony', 'nagar', 'area', 'puram', 'palayam', 'patti', 'circle', 'chowk', 'market', 'plaza', 'mall', 'sector', 'phase', 'block', 'village', 'town'];
          if (commonWords.some(word => part.toLowerCase().includes(word))) continue;
          if (part.length > 2 && part.length < 50) {
            cityValue = part;
            break;
          }
        }
      }

      // Clean up city name on mobile - remove administrative suffixes like "Division", "District", etc.
      let cleanedCity = cityValue;
      if (Platform.OS !== 'web' && cityValue) {
        // Remove common administrative suffixes
        cleanedCity = cityValue
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
        
        console.log('🧹 Cleaned city name:', cityValue, '->', cleanedCity);
      }

      const processedAddress: SelectedAddress = {
        street: streetAddress,
        area: areaValue,
        city: cleanedCity,
        state: addressData.state || addressData.administrative_area_level_1 || '',
        pincode: addressData.pincode || addressData.postal_code || '',
        formatted_address: addressData.formatted_address || '',
        stateCode: addressData.state ? getGSTStateCode(addressData.state) : '',
        lat: addressData.lat,
        lng: addressData.lng,
      };
      
      console.log('📍 handleAddressSelect - processedAddress:', processedAddress);
      console.log('📍 handleAddressSelect - areaValue:', areaValue);
      console.log('📍 handleAddressSelect - addressData.area:', addressData.area);
      console.log('📍 handleAddressSelect - addressData.sublocality_level_2:', addressData.sublocality_level_2);
      console.log('📍 handleAddressSelect - addressData.sublocality:', addressData.sublocality);
      console.log('📍 handleAddressSelect - addressData.neighborhood:', addressData.neighborhood);
      console.log('📍 handleAddressSelect - addressData.district:', addressData.district);
      
      setSelectedAddress(processedAddress);
      setIsAddressFromSearch(true); // Mark that this address came from search
      setIsSearchExpanded(false); // Collapse search bar after selection
      
      // Log the coordinates for backend storage (not shown to user)
      console.log('📍 Selected Address Coordinates:', {
        latitude: addressData.lat,
        longitude: addressData.lng,
        formatted_address: addressData.formatted_address
      });
    } catch (error) {
      console.error('Error processing selected address:', error);
    }
  };

  const getGSTStateCode = (stateName: string): string => {
    const stateCodeMap: { [key: string]: string } = {
      'andhra pradesh': '37', 'arunachal pradesh': '12', 'assam': '18', 'bihar': '10',
      'chhattisgarh': '22', 'goa': '30', 'gujarat': '24', 'haryana': '06',
      'himachal pradesh': '02', 'jharkhand': '20', 'karnataka': '29', 'kerala': '32',
      'madhya pradesh': '23', 'maharashtra': '27', 'manipur': '14', 'meghalaya': '17',
      'mizoram': '15', 'nagaland': '13', 'odisha': '21', 'punjab': '03',
      'rajasthan': '08', 'sikkim': '11', 'tamil nadu': '33', 'telangana': '36',
      'tripura': '16', 'uttar pradesh': '09', 'uttarakhand': '05', 'west bengal': '19',
      'andaman and nicobar islands': '35', 'chandigarh': '04',
      'dadra and nagar haveli and daman and diu': '26', 'delhi': '07',
      'jammu and kashmir': '01', 'ladakh': '38', 'lakshadweep': '31', 'puducherry': '34',
    };
    return stateCodeMap[stateName.toLowerCase()] || '';
  };

  const handleGetCurrentLocation = async () => {
    setIsGettingLocation(true);
    
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        const { latitude, longitude } = location.coords;
        
        try {
          const results = await reverseGeocode(latitude, longitude);
          
          if (results && results.length > 0) {
            const result = results[0];
            const addressData = extractAddressComponents(result);
            handleAddressSelect(addressData);
          } else {
            Alert.alert('Location Error', 'Could not get address for your current location');
          }
        } catch (error) {
          console.error('Reverse geocoding error:', error);
          Alert.alert('Location Error', 'Failed to get address from location');
        }
      } else {
        Alert.alert('Location Permission', 'Please grant location permission to use this feature.');
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Location Error', 'Failed to get current location');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleConfirmAddress = () => {
    if (!selectedAddress) {
      Alert.alert('No Address Selected', 'Please select an address from the map or search');
      return;
    }

    // Debug logging
    console.log('📍 handleConfirmAddress - selectedAddress:', selectedAddress);
    console.log('📍 selectedAddress.area:', selectedAddress.area);
    console.log('📍 selectedAddress.area type:', typeof selectedAddress.area);
    console.log('📍 selectedAddress.area length:', selectedAddress.area?.length);

    // During onboarding, always use the auth flow form for all address types
    const targetPath = '/auth/business-address-manual';
    
    // Ensure area is always a string (not undefined or null)
    const areaValue = selectedAddress.area || '';
    
    const navData: Record<string, any> = {
        type, value, gstinData, name, businessName, businessType, customBusinessType, mobile,
        addressType,
        existingAddresses,
        editMode: 'false',
        editAddressId: '',
        prefilledAddressName: businessName || '',
        prefilledDoorNumber: '',
        prefilledStreet: selectedAddress.street || '',
        prefilledArea: areaValue,
        prefilledCity: selectedAddress.city || '',
        prefilledState: selectedAddress.state || '',
        prefilledPincode: selectedAddress.pincode || '',
        prefilledFormatted: selectedAddress.formatted_address || '',
        prefilledLat: selectedAddress.lat?.toString() || '',
        prefilledLng: selectedAddress.lng?.toString() || '',
        fromSummary,
        allAddresses: existingAddresses,
        allBankAccounts,
        initialCashBalance,
        invoicePrefix,
        invoicePattern,
        startingInvoiceNumber,
        fiscalYear,
    };

    if (targetPath === '/auth/business-address-manual') {
      navData.prefilledContactName = resolvedName || '';
      navData.prefilledContactPhone = resolvedMobileDigits || resolvedMobile || '';
    }

    setSignupData(navData);
    router.replace(targetPath);
  };

  const handleManualEntry = () => {
    const targetPath = '/auth/business-address-manual';

    const navData: Record<string, any> = {
        type, value, gstinData, name, businessName, businessType, customBusinessType, mobile,
        addressType,
        existingAddresses,
        editMode: 'false',
        editAddressId: '',
        prefilledAddressName: businessName || '',
        prefilledDoorNumber: '',
        prefilledStreet: '',
        prefilledArea: '',
        prefilledCity: '',
        prefilledState: '',
        prefilledPincode: '',
        prefilledFormatted: '',
        fromSummary,
        allAddresses: existingAddresses,
        allBankAccounts,
        initialCashBalance,
        invoicePrefix,
        invoicePattern,
        startingInvoiceNumber,
        fiscalYear,
    };

    if (targetPath === '/auth/business-address-manual') {
      navData.prefilledContactName = resolvedName || '';
      navData.prefilledContactPhone = resolvedMobileDigits || resolvedMobile || '';
    }

    setSignupData(navData);
    router.replace(targetPath);
  };

  const handleShowSearchAgain = () => {
    setIsSearchExpanded(true);
    setSelectedAddress(null);
    setIsAddressFromSearch(false); // Reset flag when starting new search
  };

  const handleCollapsedSearchPress = () => {
    setIsSearchExpanded(true);
    setSelectedAddress(null);
    setIsAddressFromSearch(false); // Reset flag when starting new search
  };

  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          enabled={Platform.OS === 'ios'}
        >
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/auth/mobile')}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>
            {addressType === 'branch' ? `Branch Address${getAddressCount()}` : 
             addressType === 'warehouse' ? `Warehouse Address${getAddressCount()}` : 
             'Primary Address'}
          </Text>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <PlatformMapView
            initialLocation={userLocation || { lat: 28.6139, lng: 77.2090 }}
            selectedLocation={selectedAddress ? { lat: selectedAddress.lat!, lng: selectedAddress.lng! } : undefined}
            onMapClick={handleMapClick}
            onMarkerDragEnd={handleMarkerDragEnd}
            onMapLoad={() => setIsMapLoading(false)}
          />
          
          {/* Floating Search Bar */}
          {isSearchExpanded ? (
            <Animated.View 
              style={[
                styles.floatingSearchContainer,
                {
                  opacity: searchAnimation,
                }
              ]}
            >
              <View style={styles.floatingSearchWrapper}>
                {Platform.OS === 'web' ? (
                  <WebAddressSearch
                    key={isSearchExpanded ? 'expanded' : 'collapsed'}
                    placeholder="Search for your business address..."
                    onAddressSelect={handleAddressSelect}
                  />
                ) : (
                  <GooglePlacesSearch
                    key={isSearchExpanded ? 'expanded' : 'collapsed'}
                    placeholder="Search for your business address..."
                    onAddressSelect={handleAddressSelect}
                    hideAfterSelection={false}
                    autoFocus={true}
                  />
                )}
              </View>
            </Animated.View>
          ) : (
            <TouchableOpacity 
              style={styles.floatingSearchIcon}
              onPress={handleCollapsedSearchPress}
              activeOpacity={0.8}
            >
              <Search size={24} color="#3f66ac" />
            </TouchableOpacity>
          )}
        </View>

        {/* Selected Address Display */}
        {selectedAddress && !isSearchExpanded && (
          <View style={styles.selectedAddressContainer}>
            <View style={styles.selectedAddressHeader}>
              <Text style={styles.selectedAddressTitle}>Selected Address</Text>
              <TouchableOpacity 
                style={styles.changeAddressButton}
                onPress={handleShowSearchAgain}
              >
                <Text style={styles.changeAddressText}>Change</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.selectedAddressText} numberOfLines={2}>
              {selectedAddress.formatted_address}
            </Text>
          </View>
        )}

        {/* Bottom Action Buttons */}
        <View style={[
          styles.bottomContainer,
          Platform.OS === 'android' && { paddingBottom: keyboardHeight > 0 ? keyboardHeight + 20 : 20 }
        ]}>
          <TouchableOpacity
            style={[
              styles.confirmButton,
              !selectedAddress && styles.confirmButtonDisabled
            ]}
            onPress={handleConfirmAddress}
            disabled={!selectedAddress}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>
              Use This Address
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manualButton}
            onPress={handleManualEntry}
            activeOpacity={0.7}
          >
            <Edit3 size={20} color="#3f66ac" />
            <Text style={styles.manualButtonText}>Enter Address Manually</Text>
          </TouchableOpacity>
        </View>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3f66ac',
    paddingHorizontal: 16,
    paddingVertical: 12,
    zIndex: 1000,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
    flex: 1,
  },
  floatingSearchContainer: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: 16, // Add spacing from header
    zIndex: 1000,
  },
  floatingSearchWrapper: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 5,
  },
  floatingSearchIcon: {
    position: 'absolute',
    right: 16, // Right corner of map
    top: 16, // Same position as expanded search bar
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#ffc754', // Brand yellow
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  selectedAddressContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: Platform.select({
      web: 12,
      ios: 20,
      android: 20, // Consistent bottom padding across all platforms
      default: 20,
    }),
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },
  selectedAddressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  selectedAddressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1e293b',
  },
  changeAddressButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#f0f7ff',
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#3f66ac',
  },
  changeAddressText: {
    fontSize: 12,
    color: '#3f66ac',
    fontWeight: '500',
  },
  selectedAddressText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
  },
  bottomContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingTop: 16,
    paddingBottom: Platform.select({
      web: 16,
      ios: 20,
      android: 20, // Will be overridden dynamically when keyboard is visible
      default: 20,
    }),
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  confirmButtonDisabled: {
    opacity: 0.5,
  },
  confirmButtonText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#ffffff',
  },
  manualButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 24,
    justifyContent: 'center',
    gap: 8,
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3f66ac',
  },
});
