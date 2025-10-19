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
import * as Location from 'expo-location';
import MapView, { Marker, PROVIDER_GOOGLE } from 'react-native-maps';

// Google Maps API Key
const GOOGLE_MAPS_API_KEY = 'AIzaSyBqLe3lHfzB5epezdgwdKDzkdFkECuUN1o';

// Web fallback component
const WebMapFallback: React.FC<{
  markerLocation: { lat: number; lng: number };
  onMapClick: (lat: number, lng: number) => void;
  isGettingLocation: boolean;
  getCurrentLocation: () => void;
}> = ({ markerLocation, onMapClick, isGettingLocation, getCurrentLocation }) => (
  <View style={styles.webFallback}>
    <Text style={styles.webFallbackTitle}>Map View</Text>
    <Text style={styles.webFallbackText}>
      Interactive maps are not available on web. Please use the address search above or enter details manually.
    </Text>
    <View style={styles.webFallbackLocation}>
      <Text style={styles.webFallbackLocationTitle}>Selected Location:</Text>
      <Text style={styles.webFallbackLocationText}>
        Lat: {markerLocation.lat.toFixed(6)}, Lng: {markerLocation.lng.toFixed(6)}
      </Text>
    </View>
    <TouchableOpacity
      style={styles.webFallbackButton}
      onPress={getCurrentLocation}
      activeOpacity={0.8}
      disabled={isGettingLocation}
    >
      <Text style={styles.webFallbackButtonText}>
        {isGettingLocation ? 'Getting Location...' : 'Get Current Location'}
      </Text>
    </TouchableOpacity>
  </View>
);

// Main component that chooses between web and native
const GoogleMapView = (props: any) => {
  const {
    initialLocation = { lat: 28.6139, lng: 77.2090 },
    onMapClick,
    onMarkerDragEnd,
    selectedLocation,
    onMapLoad,
  } = props;

  const [markerLocation, setMarkerLocation] = useState(selectedLocation || initialLocation);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const mapRef = useRef<MapView>(null);

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      
      // Request permissions with Android-specific handling
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert(
          'Location Permission', 
          'Please grant location permission to use this feature. You can enable it in your device settings.',
          [
            { text: 'Cancel', style: 'cancel' },
            { text: 'Settings', onPress: () => Location.openAppSettingsAsync() }
          ]
        );
        setIsGettingLocation(false);
        return;
      }

      // Use appropriate accuracy based on platform
      const location = await Location.getCurrentPositionAsync({
        accuracy: Platform.OS === 'android' ? Location.Accuracy.Balanced : Location.Accuracy.High,
        maximumAge: 10000, // Use cached location if less than 10 seconds old
        timeout: 15000, // 15 second timeout
      });

      const newLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      setMarkerLocation(newLocation);
      onMapClick?.(newLocation.lat, newLocation.lng);
      
      // Animate to current location with platform-specific timing
      if (mapRef.current) {
        mapRef.current.animateToRegion({
          latitude: newLocation.lat,
          longitude: newLocation.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }, Platform.OS === 'android' ? 1000 : 500); // Slower animation on Android for better performance
      }
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      const errorMessage = Platform.OS === 'android' 
        ? 'Failed to get current location. Please check your GPS settings and try again.'
        : 'Failed to get current location. Please try again.';
      Alert.alert('Location Error', errorMessage);
    } finally {
      setIsGettingLocation(false);
    }
  };

  const handleMapPress = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newLocation = { lat: latitude, lng: longitude };
    setMarkerLocation(newLocation);
    onMapClick?.(latitude, longitude);
  };

  const handleMarkerDragEnd = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newLocation = { lat: latitude, lng: longitude };
    setMarkerLocation(newLocation);
    onMarkerDragEnd?.(latitude, longitude);
  };

  const handleMapReady = () => {
    onMapLoad?.();
  };

  // Update marker location when selectedLocation changes
  useEffect(() => {
    if (selectedLocation && mapRef.current) {
      mapRef.current.animateToRegion({
        latitude: selectedLocation.lat,
        longitude: selectedLocation.lng,
        latitudeDelta: 0.002, // Much closer zoom for street view
        longitudeDelta: 0.002, // Much closer zoom for street view
      });
      setMarkerLocation(selectedLocation);
    }
  }, [selectedLocation]);

  // This component is only used on native platforms

  return (
    <View style={styles.container}>
      <MapView
        ref={mapRef}
        style={styles.map}
        provider={PROVIDER_GOOGLE}
        initialRegion={{
          latitude: initialLocation.lat,
          longitude: initialLocation.lng,
          latitudeDelta: 0.005,
          longitudeDelta: 0.005,
        }}
        onPress={handleMapPress}
        onMapReady={handleMapReady}
        showsUserLocation={true}
        showsMyLocationButton={false}
        mapType="standard"
        // Android-specific optimizations
        loadingEnabled={true}
        loadingIndicatorColor="#3f66ac"
        loadingBackgroundColor="#ffffff"
        // Ensure proper rendering on Android
        moveOnMarkerPress={false}
        showsCompass={false}
        showsScale={false}
        showsBuildings={true}
        showsTraffic={false}
        showsIndoors={true}
        // Android-specific map styling
        customMapStyle={Platform.OS === 'android' ? undefined : undefined}
      >
        <Marker
          coordinate={{
            latitude: markerLocation.lat,
            longitude: markerLocation.lng,
          }}
          draggable={true}
          onDragEnd={handleMarkerDragEnd}
          title="Selected Location"
          description="Tap and drag to adjust location"
          // Android-specific marker optimizations
          anchor={{ x: 0.5, y: 0.5 }}
          centerOffset={{ x: 0, y: 0 }}
          // Ensure proper marker rendering on Android
          flat={false}
          tracksViewChanges={false}
        />
      </MapView>
      
      {/* Current Location Button */}
      <TouchableOpacity
        style={[styles.currentLocationIcon, isGettingLocation && styles.currentLocationIconLoading]}
        onPress={getCurrentLocation}
        activeOpacity={0.8}
        disabled={isGettingLocation}
      >
        <Text style={styles.currentLocationIconText}>📍</Text>
      </TouchableOpacity>

      {/* Location Info Panel - Hidden as requested */}
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
  webFallback: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f0f0f0',
  },
  webFallbackTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  webFallbackText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  webFallbackLocation: {
    backgroundColor: '#e0e0e0',
    borderRadius: 8,
    padding: 10,
    marginBottom: 20,
  },
  webFallbackLocationTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#444',
    marginBottom: 4,
  },
  webFallbackLocationText: {
    fontSize: 12,
    color: '#555',
    fontFamily: 'monospace',
  },
  webFallbackButton: {
    backgroundColor: '#3f66ac',
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 25,
    alignItems: 'center',
    justifyContent: 'center',
  },
  webFallbackButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default GoogleMapView;