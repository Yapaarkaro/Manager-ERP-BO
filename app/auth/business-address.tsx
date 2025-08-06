import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Dimensions,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Navigation, CreditCard as Edit, MapPin } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
import AddressAutocomplete from '@/components/AddressAutocomplete';
import OlaMapView from '@/components/OlaMapView';
import * as Location from 'expo-location';

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

// Ola Maps API configuration
const OLA_MAPS_API_KEY = '7lWg0vFb2XZqdPXSOzseDmd4QaSSyNKf74TMC93i';

export default function BusinessAddressScreen() {
  const { type, value, gstinData, name, businessName, businessType, customBusinessType } = useLocalSearchParams();
  const { addressType = 'primary', existingAddresses = '[]' } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [mapInstance, setMapInstance] = useState<any>(null);
  const [currentMarker, setCurrentMarker] = useState<any>(null);
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const colors = useThemeColors();

  useEffect(() => {
    // Get user's current location and initialize map
    getCurrentLocationAndInitMap();
    
    // Ensure search bar is empty when screen loads
    setSearchQuery('');
  }, []);



  const getCurrentLocationAndInitMap = async () => {
    setIsGettingLocation(true);
    
    try {
      // Use expo-location for native platforms
      const { status } = await Location.requestForegroundPermissionsAsync();
      
      if (status === 'granted') {
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        const userCoords = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };
        
        setUserLocation(userCoords);
      } else {
        Alert.alert(
          'Location Access',
          'Location permission denied. Using default location.',
          [{ text: 'OK' }]
        );
        // Default to Delhi if location access denied
        const defaultLocation = { lat: 28.6139, lng: 77.2090 };
        setUserLocation(defaultLocation);
      }
      
      setIsGettingLocation(false);
    } catch (error) {
      console.error('Location error:', error);
      
      Alert.alert(
        'Location Error',
        'An error occurred while getting your location. Using default location.',
        [{ text: 'OK' }]
      );
      
      const defaultLocation = { lat: 28.6139, lng: 77.2090 };
      setUserLocation(defaultLocation);
      setIsGettingLocation(false);
    }
  };

  const initializeMap = async (location: { lat: number; lng: number }) => {
    // For iOS, the OlaMapView component handles map initialization
    if (Platform.OS === 'ios') {
      setIsMapLoading(true);
      return;
    }
    
    // For web platforms, use the existing MapLibre implementation
    if (Platform.OS === 'web' && mapContainerRef.current) {
      try {
        setIsMapLoading(true);
        
        // Wait for MapLibre to be available
        const checkMapLibre = () => {
          if (typeof window !== 'undefined' && (window as any).maplibregl) {
            const maplibregl = (window as any).maplibregl;
            
            // Use OpenStreetMap tiles via MapLibre
            const map = new maplibregl.Map({
              container: mapContainerRef.current,
              style: {
                version: 8,
                sources: {
                  'osm-tiles': {
                    type: 'raster',
                    tiles: [
                      'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
                    ],
                    tileSize: 256,
                    attribution: '© OpenStreetMap contributors'
                  }
                },
                layers: [
                  {
                    id: 'osm-tiles',
                    type: 'raster',
                    source: 'osm-tiles'
                  }
                ]
              },
              center: [location.lng, location.lat],
              zoom: 16,
            });

            setMapInstance(map);

            // Wait for map to load
            map.on('load', () => {
              setIsMapLoading(false);
              console.log('Map loaded successfully');
            });

            // Add click handler to map
            map.on('click', (e: any) => {
              const { lng, lat } = e.lngLat;
              handleMapClick(lat, lng);
            });

            console.log('Map initialized successfully');
          } else {
            setTimeout(checkMapLibre, 100);
          }
        };
        
        checkMapLibre();
      } catch (error) {
        console.error('Error initializing map:', error);
        setIsMapLoading(false);
        Alert.alert('Map Error', 'Failed to load map. Please try again.');
      }
    }
  };

  const addMarkerToMap = (lat: number, lng: number, address: string, isDraggable: boolean = true) => {
    // Map functionality not available in React Native
    console.log('Map marker functionality not available in React Native');
  };

  const handleMarkerDragEnd = async (lat: number, lng: number) => {
    try {
      console.log('🔄 Reverse geocoding for coordinates:', lat, lng);
      
      // Reverse geocode the dragged location
      const requestId = `reverse-geocode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const response = await fetch(
        `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${lat},${lng}&api_key=${OLA_MAPS_API_KEY}`,
        {
          method: 'GET',
          headers: {
            'X-Request-Id': requestId,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('🔄 Reverse geocoding response:', data);
        
        if (data.results && data.results.length > 0) {
          const result = data.results[0];
          console.log('🔄 Processing result:', result);
          
          // Handle Ola Maps API response format
          const addressComponents = result.address_components || [];
          
          const getComponent = (types: string[]) => {
            const component = addressComponents.find((comp: any) => 
              types.some(type => comp.types.includes(type))
            );
            return component?.long_name || '';
          };

          const stateName = getComponent(['administrative_area_level_1', 'state']);
          
          const addressData: SelectedAddress = {
            street: result.name || getComponent(['street_number', 'route']) || '',
            area: result.vicinity || getComponent(['sublocality', 'neighborhood']) || '',
            city: getComponent(['locality', 'administrative_area_level_2']) || '',
            state: stateName,
            pincode: getComponent(['postal_code']) || '',
            formatted_address: result.formatted_address || `${result.name || ''}, ${result.vicinity || ''}`,
            stateCode: getGSTStateCode(stateName),
            lat,
            lng,
          };
          
          console.log('🔄 Parsed address data:', addressData);
          setSelectedAddress(addressData);
        } else {
          console.log('🔄 No results found in reverse geocoding response');
          // Fallback: create basic address data from coordinates
          const addressData: SelectedAddress = {
            street: '',
            area: '',
            city: '',
            state: '',
            pincode: '',
            formatted_address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
            stateCode: '',
            lat,
            lng,
          };
          setSelectedAddress(addressData);
        }
      } else {
        console.error('🔄 Reverse geocoding failed with status:', response.status);
        // Fallback: create basic address data from coordinates
        const addressData: SelectedAddress = {
          street: '',
          area: '',
          city: '',
          state: '',
          pincode: '',
          formatted_address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
          stateCode: '',
          lat,
          lng,
        };
        setSelectedAddress(addressData);
      }
    } catch (error) {
      console.error('🔄 Reverse geocoding error:', error);
      // Fallback: create basic address data from coordinates
      const addressData: SelectedAddress = {
        street: '',
        area: '',
        city: '',
        state: '',
        pincode: '',
        formatted_address: `Location at ${lat.toFixed(6)}, ${lng.toFixed(6)}`,
        stateCode: '',
        lat,
        lng,
      };
      setSelectedAddress(addressData);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    try {
      // Add marker immediately for visual feedback
      addMarkerToMap(lat, lng, 'Loading...', true);

      // Reverse geocode the clicked location
      await handleMarkerDragEnd(lat, lng);
    } catch (error) {
      console.error('Map click error:', error);
    }
  };

  const parseAddressText = (addressText: string) => {
    console.log('🔍 Parsing address text:', addressText);
    
    // Split the address by commas and clean up each part
    const parts = addressText.split(',').map(part => part.trim()).filter(part => part.length > 0);
    
    let street = '';
    let area = '';
    let city = '';
    let state = '';
    let pincode = '';
    
    // Extract pincode (6 digits) from any part
    const pincodeRegex = /\b\d{6}\b/;
    for (let i = 0; i < parts.length; i++) {
      const pincodeMatch = parts[i].match(pincodeRegex);
      if (pincodeMatch) {
        pincode = pincodeMatch[0];
        // Remove pincode from the part
        parts[i] = parts[i].replace(pincodeRegex, '').trim();
        if (parts[i] === '') {
          parts.splice(i, 1);
          i--;
        }
      }
    }
    
    // Extract state (usually the last meaningful part)
    const indianStates = [
      'Andhra Pradesh', 'Arunachal Pradesh', 'Assam', 'Bihar', 'Chhattisgarh', 'Goa', 'Gujarat',
      'Haryana', 'Himachal Pradesh', 'Jharkhand', 'Karnataka', 'Kerala', 'Madhya Pradesh',
      'Maharashtra', 'Manipur', 'Meghalaya', 'Mizoram', 'Nagaland', 'Odisha', 'Punjab',
      'Rajasthan', 'Sikkim', 'Tamil Nadu', 'Telangana', 'Tripura', 'Uttar Pradesh',
      'Uttarakhand', 'West Bengal', 'Delhi', 'Chandigarh', 'Puducherry'
    ];
    
    // Find state in the parts
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      const matchedState = indianStates.find(stateName => 
        stateName.toLowerCase() === part.toLowerCase() ||
        part.toLowerCase().includes(stateName.toLowerCase()) ||
        stateName.toLowerCase().includes(part.toLowerCase())
      );
      
      if (matchedState) {
        state = matchedState;
        parts.splice(i, 1);
        break;
      }
    }
    
    // Extract city (usually second to last or last remaining part)
    if (parts.length > 0) {
      city = parts[parts.length - 1];
      parts.splice(parts.length - 1, 1);
    }
    
    // Remaining parts become street and area
    if (parts.length >= 2) {
      // First part is street, second part is area
      street = parts[0];
      area = parts.slice(1).join(', ');
    } else if (parts.length === 1) {
      // Single remaining part becomes street
      street = parts[0];
    }
    
    // If street is too long (more than 50 characters), split it
    if (street.length > 50 && street.includes(' ')) {
      const words = street.split(' ');
      const midPoint = Math.ceil(words.length / 2);
      const firstHalf = words.slice(0, midPoint).join(' ');
      const secondHalf = words.slice(midPoint).join(' ');
      
      street = firstHalf;
      area = area ? `${secondHalf}, ${area}` : secondHalf;
    }
    
    const parsedData = {
      street: street || '',
      area: area || '',
      city: city || '',
      state: state || '',
      pincode: pincode || '',
      formatted_address: addressText,
    };
    
    console.log('📍 Parsed address components:', parsedData);
    return parsedData;
  };

  const handleAddressSelect = (addressData: any) => {
    try {
      console.log('🏠 Selected address from search:', addressData);
      
      // IMMEDIATELY close suggestions and clear all states
      setSearchQuery('');
      
      // Parse the address text into structured components
      const addressText = addressData.formatted_address || searchQuery;
      const parsedData = parseAddressText(addressText);
      
      console.log('📍 Parsed address components:', parsedData);
      
      // Process and store the selected address data
      const processedAddress: SelectedAddress = {
        street: parsedData.street || addressData.street || '',
        area: parsedData.area || addressData.area || '',
        city: parsedData.city || addressData.city || '',
        state: parsedData.state || addressData.state || '',
        pincode: parsedData.pincode || addressData.pincode || '',
        formatted_address: addressText,
        stateCode: parsedData.state ? getGSTStateCode(parsedData.state) : '',
      };
      
      console.log('🏠 Processed address for storage:', processedAddress);
      setSelectedAddress(processedAddress);
      
      // Geocode to get coordinates and move map
      if (addressText) {
        geocodeAddress(addressText, processedAddress);
      }
    } catch (error) {
      console.error('Error processing selected address:', error);
      // Ensure dropdown is closed even on error
      setSearchQuery('');
    }
  };

  const geocodeAddress = async (addressText: string, addressData: any) => {
    try {
      const requestId = `geocode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const response = await fetch(
        `https://api.olamaps.io/places/v1/geocode?address=${encodeURIComponent(addressText)}&api_key=${OLA_MAPS_API_KEY}`,
        {
          method: 'GET',
          headers: {
            'X-Request-Id': requestId,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Geocoding response:', data);
        
        if (data.geocodingResults && data.geocodingResults.length > 0) {
          const result = data.geocodingResults[0];
          const lat = result.geometry?.location?.lat;
          const lng = result.geometry?.location?.lng;
          
          if (lat && lng) {
            // Move map to the geocoded location
            if (mapInstance) {
              mapInstance.flyTo({
                center: [lng, lat],
                zoom: 17,
                duration: 1000,
              });
              
              // Add draggable marker
              addMarkerToMap(lat, lng, addressText, true);
            }
            
            // Update the existing address with coordinates only (preserve original data)
            setSelectedAddress(prev => ({
              ...prev!,
              lat,
              lng,
            }));
            return;
          }
        }
      }
    } catch (error) {
      console.error('Geocoding error:', error);
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
      // Request location permission and get current location
      if ('geolocation' in navigator) {
        navigator.geolocation.getCurrentPosition(
          async (position) => {
            const { latitude, longitude } = position.coords;
            
            try {
              // Use Ola Maps Reverse Geocoding API
              const requestId = `reverse-geocode-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
              const response = await fetch(
                `https://api.olamaps.io/places/v1/reverse-geocode?latlng=${latitude},${longitude}&api_key=${OLA_MAPS_API_KEY}`,
                {
                  method: 'GET',
                  headers: {
                    'X-Request-Id': requestId,
                    'Content-Type': 'application/json',
                  },
                }
              );

              if (response.ok) {
                const data = await response.json();
                console.log('Reverse geocoding response:', data);
                
                // Extract address from reverse geocoding response
                if (data.results && data.results.length > 0) {
                  const result = data.results[0];
                  
                  // Parse address components
                  const addressComponents = result.address_components || [];
                  
                  const getComponent = (types: string[]) => {
                    const component = addressComponents.find((comp: any) => 
                      types.some(type => comp.types.includes(type))
                    );
                    return component?.long_name || '';
                  };

                  // Extract state and find GST code
                  const stateName = getComponent(['administrative_area_level_1', 'state']);
                  
                  const addressData = {
                    street: result.name || getComponent(['street_number', 'route']) || '',
                    area: result.vicinity || getComponent(['sublocality', 'neighborhood']) || '',
                    city: getComponent(['locality', 'administrative_area_level_2']) || '',
                    state: stateName,
                    pincode: getComponent(['postal_code']) || '',
                    formatted_address: result.formatted_address || `${result.name || ''}, ${result.vicinity || ''}`,
                  };
                  
                  handleAddressSelect(addressData);
                } else {
                  Alert.alert('Location Error', 'Could not get address for your current location');
                }
              } else {
                Alert.alert('Location Error', 'Failed to get address from location');
              }
            } catch (error) {
              console.error('Reverse geocoding error:', error);
              Alert.alert('Location Error', 'Failed to get address from location');
            }
            
            setIsGettingLocation(false);
          },
          (error) => {
            console.error('Location error:', error);
            Alert.alert('Location Error', 'Could not get your current location. Please check location permissions.');
            setIsGettingLocation(false);
          },
          {
            enableHighAccuracy: true,
            timeout: 10000,
            maximumAge: 60000,
          }
        );
      } else {
        Alert.alert('Location Error', 'Geolocation is not supported by this browser');
        setIsGettingLocation(false);
      }
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Location Error', 'Failed to get current location');
      setIsGettingLocation(false);
    }
  };

  const handleCurrentLocation = () => {
    if (userLocation && mapInstance) {
      mapInstance.flyTo({
        center: [userLocation.lng, userLocation.lat],
        zoom: 17,
        duration: 1000,
      });
      
      // Reverse geocode current location
      handleMapClick(userLocation.lat, userLocation.lng);
    } else {
      getCurrentLocationAndInitMap();
    }
  };

  const handleConfirmAddress = () => {
    if (!selectedAddress) {
      Alert.alert('No Address Selected', 'Please select an address from the map or search');
      return;
    }

    console.log('🗺️ Confirming address from map:', selectedAddress);
    console.log('📋 Existing addresses being passed:', existingAddresses);

    // Find matching state from our predefined list
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

    // Find matching state
    const matchingState = indianStates.find(state => 
      state.name.toLowerCase() === selectedAddress.state.toLowerCase() ||
      state.name.toLowerCase().includes(selectedAddress.state.toLowerCase()) ||
      selectedAddress.state.toLowerCase().includes(state.name.toLowerCase())
    );

    router.push({
      pathname: '/auth/business-address-manual',
      params: {
        type,
        value,
        gstinData,
        name,
        businessName,
        businessType,
        customBusinessType,
        addressType,
        existingAddresses,
        prefilledStreet: selectedAddress.street,
        prefilledArea: selectedAddress.area,
        prefilledCity: selectedAddress.city,
        prefilledState: matchingState ? matchingState.name : selectedAddress.state,
        prefilledPincode: selectedAddress.pincode,
        prefilledFormatted: selectedAddress.formatted_address,
      }
    });
  };

  const handleManualEntry = () => {
    console.log('✍️ Going to manual entry with existing addresses:', existingAddresses);
    
    router.push({
      pathname: '/auth/business-address-manual',
      params: { 
        type,
        value,
        gstinData,
        name,
        businessName,
        businessType,
        customBusinessType,
        addressType,
        existingAddresses,
      }
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header with Back Button */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {addressType === 'branch'
              ? 'Branch Address'
              : addressType === 'warehouse'
              ? 'Warehouse Address'
              : 'Primary Business Address'}
          </Text>
        </View>

        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchWrapper}>
            <AddressAutocomplete
              placeholder="Search for your business address..."
              value={searchQuery}
              onChangeText={setSearchQuery}
              onAddressSelect={handleAddressSelect}
            />
          </View>
        </View>

        {/* Map Container */}
        <View style={styles.mapContainer}>
          <OlaMapView
            initialLocation={userLocation ? { lat: userLocation.lat, lng: userLocation.lng } : undefined}
            onMapClick={handleMapClick}
            onMarkerDragEnd={handleMarkerDragEnd}
            selectedLocation={selectedAddress ? { lat: selectedAddress.lat || 0, lng: selectedAddress.lng || 0 } : undefined}
            onMapLoad={() => setIsMapLoading(false)}
          />
        </View>

        {/* Selected Address Display - Only show when address is selected */}
        {selectedAddress && (
          <View style={styles.selectedAddressContainer}>
            <Text style={styles.selectedAddressLabel}>Selected Address:</Text>
            <Text style={styles.selectedAddressText} numberOfLines={2}>
              📍 {selectedAddress.formatted_address}
            </Text>
          </View>
        )}

        {/* Bottom Action Buttons */}
        <View style={styles.bottomContainer}>
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
              Confirm Address
            </Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.manualButton}
            onPress={handleManualEntry}
            activeOpacity={0.7}
          >
            <Edit size={20} color={colors.primary} />
            <Text style={styles.manualButtonText}>Fill Address Manually</Text>
          </TouchableOpacity>
        </View>
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: '#ffffff',
    borderBottomWidth: 1,
    borderBottomColor: '#e2e8f0',
    zIndex: 999,
    gap: 8,
  },
  searchWrapper: {
    flex: 1,
  },
  mapContainer: {
    flex: 1,
    position: 'relative',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    paddingHorizontal: 32,
  },
  mapPlaceholderText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#64748b',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  mapPlaceholderSubtext: {
    fontSize: 14,
    color: '#94a3b8',
    textAlign: 'center',
    lineHeight: 20,
  },
  floatingLocationButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: '#dcfce7',
    borderWidth: 2,
    borderColor: '#16a34a',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 100,
  },
  mapOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(248, 250, 252, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  mapOverlayText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  selectedAddressIndicator: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    backgroundColor: 'rgba(255, 255, 255, 0.95)',
    borderRadius: 12,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  selectedAddressText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    lineHeight: 18,
    marginBottom: 4,
  },
  dragHintText: {
    fontSize: 12,
    color: '#64748b',
    fontStyle: 'italic',
  },
  bottomContainer: {
    backgroundColor: '#ffffff',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
    gap: 12,
  },
  confirmButton: {
    backgroundColor: '#ffc754',
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
    color: '#3f66ac',
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
  selectedAddressContainer: {
    backgroundColor: '#f8fafc',
    padding: 16,
    marginHorizontal: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  selectedAddressLabel: {
    fontSize: 12,
    color: '#64748b',
    fontWeight: '600',
    marginBottom: 4,
  },
});