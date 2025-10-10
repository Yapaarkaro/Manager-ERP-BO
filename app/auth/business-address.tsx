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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, Edit3, Navigation, Search } from 'lucide-react-native';
import GooglePlacesSearch from '@/components/GooglePlacesSearch';
import GoogleMapView from '@/components/GoogleMapView';
import * as Location from 'expo-location';
import { reverseGeocode, extractAddressComponents } from '@/services/googleMapsApi';
import { useStatusBar } from '@/contexts/StatusBarContext';
import { dataStore } from '@/utils/dataStore';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';

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
  const { 
    type,
    value,
    gstinData,
    name,
    businessName,
    businessType,
    customBusinessType,
    addressType = 'primary',
  } = useLocalSearchParams();

  const { setStatusBarStyle } = useStatusBar();
  const debouncedNavigate = useDebounceNavigation();
  const [selectedAddress, setSelectedAddress] = useState<SelectedAddress | null>(null);
  const [userLocation, setUserLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [isMapLoading, setIsMapLoading] = useState(true);
  const [showSearchBar, setShowSearchBar] = useState(true);

  // Get count for dynamic header
  const getAddressCount = () => {
    if (addressType === 'primary') return '';
    const allAddresses = dataStore.getAddresses();
    const typeAddresses = allAddresses.filter(addr => addr.type === addressType);
    return ` - ${typeAddresses.length + 1}`;
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
        const location = await Location.getCurrentPositionAsync({
          accuracy: Location.Accuracy.High,
        });
        
        const userCoords = {
          lat: location.coords.latitude,
          lng: location.coords.longitude,
        };
        
        setUserLocation(userCoords);
      } else {
        const defaultLocation = { lat: 28.6139, lng: 77.2090 };
        setUserLocation(defaultLocation);
      }
      
      setIsGettingLocation(false);
    } catch (error) {
      console.error('Location error:', error);
      const defaultLocation = { lat: 28.6139, lng: 77.2090 };
      setUserLocation(defaultLocation);
      setIsGettingLocation(false);
    }
  };

  const handleMapClick = async (lat: number, lng: number) => {
    try {
      await handleMarkerDragEnd(lat, lng);
    } catch (error) {
      console.error('Map click error:', error);
    }
  };

  const handleMarkerDragEnd = async (lat: number, lng: number) => {
    try {
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

        const processedAddress: SelectedAddress = {
          street: streetAddress,
          area: addressData.area || addressData.sublocality || addressData.district || '',
          city: addressData.city || addressData.locality || '',
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

      const processedAddress: SelectedAddress = {
        street: streetAddress,
        area: addressData.area || addressData.sublocality || addressData.district || '',
        city: addressData.city || addressData.locality || '',
        state: addressData.state || addressData.administrative_area_level_1 || '',
        pincode: addressData.pincode || addressData.postal_code || '',
        formatted_address: addressData.formatted_address || '',
        stateCode: addressData.state ? getGSTStateCode(addressData.state) : '',
        lat: addressData.lat,
        lng: addressData.lng,
      };
      
      console.log('📍 Processed address:', processedAddress);
      
      setSelectedAddress(processedAddress);
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

    // Navigate to the correct form based on address type
    const targetPath = addressType === 'branch' ? '/locations/branch-details' : 
                      addressType === 'warehouse' ? '/locations/warehouse-details' : 
                      '/auth/business-address-manual';
    
    // Use replace to prevent going back to map screen after confirming address
    debouncedNavigate({
      pathname: targetPath,
      params: {
        type,
        value,
        gstinData,
        name,
        businessName,
        businessType,
        customBusinessType,
        addressType: addressType,
        existingAddresses: '[]',
        editMode: 'false',
        editAddressId: '',
        prefilledAddressName: businessName || '',
        prefilledDoorNumber: '',
        prefilledStreet: selectedAddress.street,
        prefilledArea: selectedAddress.area,
        prefilledCity: selectedAddress.city,
        prefilledState: selectedAddress.state,
        prefilledPincode: selectedAddress.pincode,
        prefilledFormatted: selectedAddress.formatted_address,
      }
    }, 'replace'); // Use replace to prevent going back to map screen
  };

  const handleManualEntry = () => {
    // Navigate to manual address entry without prefilled data
    // Use replace to prevent going back to map screen
    debouncedNavigate({
      pathname: '/auth/business-address-manual',
      params: {
        type,
        value,
        gstinData,
        name,
        businessName,
        businessType,
        customBusinessType,
        addressType: addressType,
        existingAddresses: '[]',
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
      }
    }, 'replace'); // Use replace to prevent going back to map screen
  };

  const handleShowSearchAgain = () => {
    setIsSearchExpanded(true);
    setSelectedAddress(null);
  };

  const handleCollapsedSearchPress = () => {
    setIsSearchExpanded(true);
    setSelectedAddress(null);
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
          <GoogleMapView
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
                <GooglePlacesSearch
                  key={isSearchExpanded ? 'expanded' : 'collapsed'}
                  placeholder="Search for your business address..."
                  onAddressSelect={handleAddressSelect}
                  hideAfterSelection={false}
                  autoFocus={true}
                />
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
    paddingVertical: 16,
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
