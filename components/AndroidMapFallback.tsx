import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';

interface AndroidMapFallbackProps {
  onLocationSelect: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number };
  onMapLoad?: () => void;
}

const AndroidMapFallback: React.FC<AndroidMapFallbackProps> = ({
  onLocationSelect,
  selectedLocation,
  onMapLoad,
}) => {
  const defaultLocation = { lat: 28.6139, lng: 77.2090 }; // Delhi
  const currentLocation = selectedLocation || defaultLocation;

  const handleMapPress = (event: any) => {
    // Simulate map press with current location
    onLocationSelect(currentLocation.lat, currentLocation.lng);
  };

  React.useEffect(() => {
    if (onMapLoad) {
      onMapLoad();
    }
  }, []);

  return (
    <View style={styles.container}>
      <View style={styles.mapPlaceholder}>
        <MapPin size={48} color="#3f66ac" />
        <Text style={styles.placeholderTitle}>Map Unavailable</Text>
        <Text style={styles.placeholderSubtitle}>
          Google Maps API key is required for Android
        </Text>
        <Text style={styles.placeholderHint}>
          Please add your Google Maps API key to app.json
        </Text>
      </View>
      
      <TouchableOpacity
        style={styles.locationButton}
        onPress={() => onLocationSelect(currentLocation.lat, currentLocation.lng)}
      >
        <Navigation size={20} color="#ffffff" />
        <Text style={styles.locationButtonText}>Use Current Location</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
  },
  mapPlaceholder: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#e2e8f0',
    margin: 16,
    borderRadius: 12,
    padding: 32,
  },
  placeholderTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: '#374151',
    marginTop: 16,
    marginBottom: 8,
  },
  placeholderSubtitle: {
    fontSize: 14,
    color: '#6b7280',
    textAlign: 'center',
    marginBottom: 8,
  },
  placeholderHint: {
    fontSize: 12,
    color: '#9ca3af',
    textAlign: 'center',
  },
  locationButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#3f66ac',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 8,
    margin: 16,
  },
  locationButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default AndroidMapFallback; 