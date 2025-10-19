import React, { ComponentType } from 'react';
import { Platform, View, Text } from 'react-native';

interface PlatformMapViewProps {
  initialLocation?: { lat: number; lng: number };
  onMapClick?: (lat: number, lng: number) => void;
  onMarkerDragEnd?: (lat: number, lng: number) => void;
  selectedLocation?: { lat: number; lng: number };
  onMapLoad?: () => void;
}

const PlatformMapView: React.FC<PlatformMapViewProps> = (props) => {
  const [MapComponent, setMapComponent] = React.useState<ComponentType<any> | null>(null);
  const [loading, setLoading] = React.useState(true);

  React.useEffect(() => {
    const loadMapComponent = async () => {
      try {
        if (Platform.OS === 'web') {
          // Dynamic import for web component
          const { default: WebMapView } = await import('./WebMapView');
          setMapComponent(() => WebMapView);
        } else {
          // Dynamic import for native component
          const { default: NativeMapView } = await import('./GoogleMapView');
          setMapComponent(() => NativeMapView);
        }
      } catch (error) {
        console.error('Failed to load map component:', error);
        // Fallback to a simple placeholder
        setMapComponent(() => () => (
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
            <Text style={{ fontSize: 16, color: '#64748b' }}>Map not available</Text>
          </View>
        ));
      } finally {
        setLoading(false);
      }
    };

    loadMapComponent();
  }, []);

  if (loading) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <Text style={{ fontSize: 16, color: '#64748b' }}>Loading Map...</Text>
      </View>
    );
  }

  if (!MapComponent) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#f8f9fa' }}>
        <Text style={{ fontSize: 16, color: '#64748b' }}>Map not available</Text>
      </View>
    );
  }

  return <MapComponent {...props} />;
};

export default PlatformMapView;
