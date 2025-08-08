import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Alert,
  Text,
  TouchableOpacity,
  Dimensions,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';
import AndroidMapFallback from './AndroidMapFallback';

const OlaMapView = (props: any) => {
  const {
    initialLocation = { lat: 28.6139, lng: 77.2090 }, // Default to Delhi
    onMapClick,
    onMarkerDragEnd,
    selectedLocation,
    onMapLoad,
  } = props;
  const mapRef = useRef<MapView>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [currentLocation, setCurrentLocation] = useState(initialLocation);
  const [markerLocation, setMarkerLocation] = useState(selectedLocation || initialLocation);
  const [hasLocationPermission, setHasLocationPermission] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  useEffect(() => {
    checkLocationPermission();
  }, []);

  useEffect(() => {
    if (selectedLocation) {
      setMarkerLocation(selectedLocation);
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: selectedLocation.lat,
          longitude: selectedLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }
    }
  }, [selectedLocation]);

  const checkLocationPermission = async () => {
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      setHasLocationPermission(status === 'granted');
      
      if (status === 'granted') {
        getCurrentLocation();
      }
    } catch (error) {
      console.error('Error checking location permission:', error);
    }
  };

  const getCurrentLocation = async () => {
    try {
      console.log('📍 Getting current location...');
      setIsGettingLocation(true);
      
      // Check permission first
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Please grant location permission to use this feature.');
        setIsGettingLocation(false);
        return;
      }

      // Get current position
      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      console.log('📍 Location obtained:', location.coords);

      const newLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      console.log('📍 Setting new location:', newLocation);

      setCurrentLocation(newLocation);
      setMarkerLocation(newLocation);
      
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: newLocation.lat,
          longitude: newLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        });
      }

      onMapClick?.(newLocation.lat, newLocation.lng);
      console.log('📍 Location updated successfully');
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      Alert.alert('Location Error', 'Failed to get current location. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newLocation = { lat: latitude, lng: longitude };
    
    console.log('🗺️ Map pressed at:', newLocation);
    setMarkerLocation(newLocation);
    onMapClick?.(latitude, longitude);
  };

  const handleMarkerDragEnd = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newLocation = { lat: latitude, lng: longitude };
    
    console.log('🎯 Marker dragged to:', newLocation);
    setMarkerLocation(newLocation);
    onMarkerDragEnd?.(latitude, longitude);
  };

  const handleMapLoad = () => {
    setIsMapLoaded(true);
    onMapLoad?.();
  };

  // Custom map style using Ola's vector tiles
  const customMapStyle = [
    {
      featureType: 'all',
      elementType: 'geometry',
      stylers: [
        {
          color: '#f5f5f5'
        }
      ]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [
        {
          color: '#c9c9c9'
        }
      ]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#757575'
        }
      ]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [
        {
          color: '#ffffff'
        }
      ]
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [
        {
          color: '#9ca5b3'
        }
      ]
    }
  ];

    // Check if we should use fallback for Android
  const shouldUseFallback = Platform.OS === 'android' && !__DEV__;

  if (shouldUseFallback) {
    return (
      <AndroidMapFallback
        onLocationSelect={(lat, lng) => {
          const newLocation = { lat, lng };
          setMarkerLocation(newLocation);
          onMapClick?.(lat, lng);
        }}
        selectedLocation={markerLocation}
        onMapLoad={handleMapLoad}
      />
    );
  }

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={Platform.OS === 'android' ? PROVIDER_DEFAULT : PROVIDER_GOOGLE}
        initialRegion={{
          latitude: currentLocation.lat,
          longitude: currentLocation.lng,
          latitudeDelta: 0.01,
          longitudeDelta: 0.01,
        }}
        onPress={handleMapPress}
        onMapReady={handleMapLoad}
        customMapStyle={Platform.OS === 'ios' ? customMapStyle : undefined}
        showsUserLocation={hasLocationPermission}
        showsMyLocationButton={false}
        showsCompass={true}
        showsScale={true}
        showsBuildings={true}
        showsTraffic={false}
        showsIndoors={true}
        mapType="standard"
        zoomEnabled={true}
        scrollEnabled={true}
        rotateEnabled={true}
        pitchEnabled={true}
      >
        {/* Draggable marker for precise location selection */}
        <Marker
          coordinate={{
            latitude: markerLocation.lat,
            longitude: markerLocation.lng,
          }}
          draggable={true}
          onDragEnd={handleMarkerDragEnd}
          title="Selected Location"
          description="Drag to adjust position"
          pinColor="#3f66ac"
        />
      </MapView>

      {/* Current Location Icon */}
      <TouchableOpacity
        style={[
          styles.currentLocationIcon,
          isGettingLocation && styles.currentLocationIconLoading
        ]}
        onPress={getCurrentLocation}
        activeOpacity={0.8}
        disabled={isGettingLocation}
      >
        <Text style={styles.currentLocationIconText}>
          {isGettingLocation ? '⏳' : '📍'}
        </Text>
      </TouchableOpacity>



      {/* Loading Overlay */}
      {!isMapLoaded && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading Map...</Text>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    position: 'relative',
  },
  map: {
    flex: 1,
  },
  currentLocationIcon: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 20,
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  currentLocationIconText: {
    fontSize: 16,
  },
  currentLocationIconLoading: {
    opacity: 0.6,
  },
  locationInfoPanel: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  locationInfoTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1e293b',
    marginBottom: 4,
  },
  locationInfoText: {
    fontSize: 12,
    color: '#64748b',
    fontFamily: 'monospace',
    marginBottom: 4,
  },
  locationInfoHint: {
    fontSize: 10,
    color: '#94a3b8',
    fontStyle: 'italic',
  },

  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 255, 255, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#64748b',
    fontWeight: '500',
  },
});

export default OlaMapView; 