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
import AndroidMapFallback from './AndroidMapFallback';

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
const OlaMapView = (props: any) => {
  const {
    initialLocation = { lat: 28.6139, lng: 77.2090 },
    onMapClick,
    onMarkerDragEnd,
    selectedLocation,
    onMapLoad,
  } = props;

  const [markerLocation, setMarkerLocation] = useState(selectedLocation || initialLocation);
  const [isGettingLocation, setIsGettingLocation] = useState(false);

  const getCurrentLocation = async () => {
    try {
      setIsGettingLocation(true);
      
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Location Permission', 'Please grant location permission to use this feature.');
        setIsGettingLocation(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
      });

      const newLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      setMarkerLocation(newLocation);
      onMapClick?.(newLocation.lat, newLocation.lng);
    } catch (error) {
      console.error('❌ Error getting current location:', error);
      Alert.alert('Location Error', 'Failed to get current location. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

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
        onMapLoad={onMapLoad}
      />
    );
  }

  // On web, use the web fallback
  if (Platform.OS === 'web') {
    return (
      <View style={styles.container}>
        <WebMapFallback
          markerLocation={markerLocation}
          onMapClick={onMapClick}
          isGettingLocation={isGettingLocation}
          getCurrentLocation={getCurrentLocation}
        />
      </View>
    );
  }

  // On native platforms, use the native map component
  // This will only be loaded on native platforms, preventing web bundling issues
  const NativeMapComponent = require('./NativeMapView').default;
  
  return (
    <NativeMapComponent
      initialLocation={initialLocation}
      onMapClick={onMapClick}
      onMarkerDragEnd={onMarkerDragEnd}
      selectedLocation={selectedLocation}
      onMapLoad={onMapLoad}
    />
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

export default OlaMapView; 