import React, { useEffect, useRef, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
} from 'react-native';
import * as Location from 'expo-location';

interface WebMapViewProps {
  initialLocation?: { lat: number; lng: number };
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number };
  onMapLoad?: () => void;
}

const WebMapView: React.FC<WebMapViewProps> = ({
  initialLocation,
  onMapClick,
  onMarkerDragEnd,
  selectedLocation,
  onMapLoad,
}) => {
  const mapRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<google.maps.Map | null>(null);
  const markerRef = useRef<google.maps.Marker | null>(null);
  const [isMapLoaded, setIsMapLoaded] = useState(false);
  const [isGettingLocation, setIsGettingLocation] = useState(false);
  const [markerLocation, setMarkerLocation] = useState(
    selectedLocation || initialLocation || { lat: 28.6139, lng: 77.2090 }
  );

  // Google Maps API Key - Real API key
  const GOOGLE_MAPS_API_KEY = 'AIzaSyBqLe3lHfzB5epezdgwdKDzkdFkECuUN1o';

  // Load Google Maps API
  useEffect(() => {
    const loadGoogleMaps = () => {
      // Check if Google Maps API is already loaded
      if (window.google && window.google.maps && window.google.maps.Map) {
        initializeMap();
        return;
      }

      // Remove any existing Google Maps scripts to avoid conflicts
      const existingScripts = document.querySelectorAll('script[src*="maps.googleapis.com"]');
      existingScripts.forEach(script => script.remove());
      
      // Create and load the script with async loading
      const script = document.createElement('script');
      script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&v=3.54`;
      script.async = true;
      script.defer = true;
      
      script.onload = () => {
        // Wait for the API to be fully available
        const checkApi = () => {
          if (window.google && window.google.maps && window.google.maps.Map) {
            initializeMap();
          } else {
            setTimeout(checkApi, 100);
          }
        };
        
        setTimeout(checkApi, 200);
      };
      
      script.onerror = (error) => {
        console.error('Failed to load Google Maps API:', error);
        Alert.alert(
          'Map Error', 
          'Failed to load Google Maps. Please check your internet connection and try refreshing the page. If the problem persists, verify your API key is valid and has the necessary permissions.'
        );
      };
      
      document.head.appendChild(script);
    };

    // Start loading after a short delay
    setTimeout(loadGoogleMaps, 500);
  }, []);

  // Update marker when selectedLocation changes
  useEffect(() => {
    if (selectedLocation && mapInstanceRef.current) {
      const newLocation = new google.maps.LatLng(selectedLocation.lat, selectedLocation.lng);
      if (markerRef.current) {
        markerRef.current.setPosition(newLocation);
      }
      mapInstanceRef.current.setCenter(newLocation);
      mapInstanceRef.current.setZoom(17); // Set zoom to 17 for better detail
      setMarkerLocation(selectedLocation);
    }
  }, [selectedLocation]);

  const initializeMap = () => {
    if (!mapRef.current) {
      console.error('Map ref not available');
      return;
    }
    
    if (!window.google || !window.google.maps || !window.google.maps.Map) {
      console.error('Google Maps API not available');
      return;
    }

    try {
      const mapOptions: google.maps.MapOptions = {
        center: { lat: markerLocation.lat, lng: markerLocation.lng },
        zoom: 17, // Increased from 15 to 17 for better detail
        mapTypeId: google.maps.MapTypeId.ROADMAP,
        disableDefaultUI: true, // Disable all default controls
        zoomControl: false,
        streetViewControl: false,
        fullscreenControl: false,
        mapTypeControl: false,
        gestureHandling: 'greedy',
        backgroundColor: '#f0f0f0',
      };

      mapInstanceRef.current = new google.maps.Map(mapRef.current, mapOptions);
      
      // Wait a moment for map to initialize, then add marker
      setTimeout(() => {
        if (mapInstanceRef.current) {
          // Use regular Marker (AdvancedMarkerElement requires Map ID which we don't have)
          // This avoids the "map is initialised without a valid Map ID" error
          markerRef.current = new google.maps.Marker({
            position: { lat: markerLocation.lat, lng: markerLocation.lng },
            map: mapInstanceRef.current,
            draggable: true,
            title: 'Selected Location',
            animation: google.maps.Animation.DROP,
          });

          // Handle map clicks
          mapInstanceRef.current.addListener('click', (event: google.maps.MapMouseEvent) => {
            if (event.latLng) {
              const lat = event.latLng.lat();
              const lng = event.latLng.lng();
              
              if (markerRef.current) {
                markerRef.current.setPosition(event.latLng);
              }
              
              setMarkerLocation({ lat, lng });
              onMapClick?.(lat, lng);
            }
          });

          // Handle marker drag end
          if (markerRef.current) {
            markerRef.current.addListener('dragend', () => {
              if (markerRef.current) {
                const position = markerRef.current.getPosition();
                if (position) {
                  const lat = position.lat();
                  const lng = position.lng();
                  setMarkerLocation({ lat, lng });
                  onMarkerDragEnd?.(lat, lng);
                }
              }
            });
          }

          setIsMapLoaded(true);
          onMapLoad?.();
        }
      }, 500);
      
    } catch (error) {
      console.error('Error creating map:', error);
      return;
    }
  };

  const getCurrentLocation = async () => {
    setIsGettingLocation(true);
    
    try {
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

      const location = await Location.getCurrentPositionAsync({
        accuracy: Location.Accuracy.High,
        maximumAge: 10000,
        timeout: 15000,
      });

      const newLocation = {
        lat: location.coords.latitude,
        lng: location.coords.longitude,
      };

      setMarkerLocation(newLocation);
      
      if (mapInstanceRef.current && markerRef.current) {
        const googleLocation = new google.maps.LatLng(newLocation.lat, newLocation.lng);
        markerRef.current.setPosition(googleLocation);
        mapInstanceRef.current.setCenter(googleLocation);
      }

      onMapClick?.(newLocation.lat, newLocation.lng);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Location Error', 'Failed to get current location. Please try again.');
    } finally {
      setIsGettingLocation(false);
    }
  };

  return (
    <View style={styles.container}>
      {/* Map Container */}
      <div
        ref={mapRef}
        style={{
          width: '100%',
          height: '100%',
          minHeight: '400px',
          backgroundColor: '#f0f0f0',
        }}
      />
      
      {/* Current Location Button */}
      <TouchableOpacity
        style={[styles.currentLocationIcon, isGettingLocation && styles.currentLocationIconLoading]}
        onPress={getCurrentLocation}
        activeOpacity={0.8}
        disabled={isGettingLocation}
      >
        <Text style={styles.currentLocationIconText}>📍</Text>
      </TouchableOpacity>

      {/* Loading Overlay */}
      {!isMapLoaded && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Loading Google Maps...</Text>
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
  currentLocationIcon: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: 'white',
    borderRadius: 25,
    width: 50,
    height: 50,
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
    marginBottom: 8,
  },
  loadingSubText: {
    fontSize: 14,
    color: '#94a3b8',
    fontFamily: 'monospace',
  },
});

export default WebMapView;
