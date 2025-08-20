import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  StyleSheet,
  Platform,
  Alert,
  Text,
  TouchableOpacity,
} from 'react-native';
import MapView, { Marker, PROVIDER_GOOGLE, PROVIDER_DEFAULT } from 'react-native-maps';
import * as Location from 'expo-location';

interface NativeMapViewProps {
  initialLocation?: { lat: number; lng: number };
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number };
  onMapLoad?: () => void;
}

const NativeMapView: React.FC<NativeMapViewProps> = ({
  initialLocation = { lat: 28.6139, lng: 77.2090 },
  onMapClick,
  onMarkerDragEnd,
  selectedLocation,
  onMapLoad,
}) => {
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
    
    setMarkerLocation(newLocation);
    onMapClick?.(latitude, longitude);
  };

  const handleMarkerDragEnd = (event: any) => {
    const { latitude, longitude } = event.nativeEvent.coordinate;
    const newLocation = { lat: latitude, lng: longitude };
    
    setMarkerLocation(newLocation);
    onMarkerDragEnd?.(latitude, longitude);
  };

  const handleMapLoad = () => {
    setIsMapLoaded(true);
    onMapLoad?.();
  };

  const customMapStyle = [
    {
      featureType: 'all',
      elementType: 'geometry',
      stylers: [{ color: '#f5f5f5' }]
    },
    {
      featureType: 'water',
      elementType: 'geometry',
      stylers: [{ color: '#c9c9c9' }]
    },
    {
      featureType: 'poi',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#757575' }]
    },
    {
      featureType: 'road',
      elementType: 'geometry',
      stylers: [{ color: '#ffffff' }]
    },
    {
      featureType: 'road',
      elementType: 'labels.text.fill',
      stylers: [{ color: '#9ca5b3' }]
    }
  ];

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

export default NativeMapView;

