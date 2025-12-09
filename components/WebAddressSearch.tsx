import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  StyleSheet,
  Platform,
} from 'react-native';
import { Search, MapPin } from 'lucide-react-native';
import { parseGooglePlace, createAutocompleteService, createPlacesService, loadGoogleMapsScript } from '@/utils/googleMaps';

interface WebAddressSearchProps {
  onAddressSelect: (addressData: any) => void;
  placeholder?: string;
}

interface AddressSuggestion {
  place_id: string;
  description: string;
  structured_formatting: {
    main_text: string;
    secondary_text: string;
  };
}

const WebAddressSearch: React.FC<WebAddressSearchProps> = ({
  onAddressSelect,
  placeholder = "Search for an address...",
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const autocompleteService = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesService = useRef<google.maps.places.PlacesService | null>(null);

  // Initialize Google Places services
  useEffect(() => {
    const initializePlacesService = async () => {
      console.log('🏗️ Initializing Places services...');
      
      try {
        // Load Google Maps API if not already loaded
        const GOOGLE_MAPS_API_KEY = 'AIzaSyBqLe3lHfzB5epezdgwdKDzkdFkECuUN1o';
        await loadGoogleMapsScript(GOOGLE_MAPS_API_KEY);
        
        // Create services using utility functions
        autocompleteService.current = createAutocompleteService();
        placesService.current = createPlacesService();
        
        if (autocompleteService.current && placesService.current) {
          console.log('✅ Places services initialized successfully!');
        } else {
          console.warn('⚠️ Failed to create Places services');
        }
      } catch (error) {
        console.error('❌ Error initializing Google Places services:', error);
        // Retry after a delay
        setTimeout(initializePlacesService, 1000);
      }
    };

    // Start initialization
    initializePlacesService();
  }, []);

  // Debounced search function
  useEffect(() => {
    console.log('🔤 Query changed:', query);
    
    if (!query.trim() || query.length < 3) {
      console.log('🔤 Query too short, clearing suggestions');
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }

    console.log('🔤 Starting search for:', query);
    const timeoutId = setTimeout(() => {
      searchPlaces(query);
    }, 300);

    return () => clearTimeout(timeoutId);
  }, [query]);

  const searchPlaces = async (searchQuery: string) => {
    console.log('🔍 Search triggered:', searchQuery);
    console.log('🔍 Autocomplete service available:', !!autocompleteService.current);
    
    if (!autocompleteService.current) {
      console.log('❌ Autocomplete service not ready');
      return;
    }

    setIsLoading(true);
    try {
      const request: google.maps.places.AutocompleteRequest = {
        input: searchQuery,
        // Remove types to get all relevant results (addresses, establishments, etc.)
        componentRestrictions: { country: 'in' }, // Restrict to India
      };

      console.log('🔍 Making autocomplete request:', request);
      autocompleteService.current.getPlacePredictions(
        request,
        (predictions, status) => {
          console.log('🔍 Autocomplete response:', { status, predictions });
          setIsLoading(false);
          
          if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
            console.log('✅ Found suggestions:', predictions.length);
            setSuggestions(predictions);
            setShowSuggestions(true);
          } else {
            console.log('❌ No suggestions found:', status);
            setSuggestions([]);
            setShowSuggestions(false);
          }
        }
      );
    } catch (error) {
      console.error('❌ Error searching places:', error);
      setIsLoading(false);
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleAddressSelect = async (placeId: string) => {
    if (!placesService.current) return;

    try {
      const request: google.maps.places.PlaceDetailsRequest = {
        placeId: placeId,
        fields: [
          'place_id',
          'formatted_address',
          'geometry',
          'name',
          'address_components',
          'types',
        ],
      };

      placesService.current.getDetails(request, (place, status) => {
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          // Use parseGooglePlace for better address parsing
          const addressData = parseGooglePlace(place);
          // Merge with additional fields for compatibility
          const fullAddressData = {
            ...addressData,
            place_id: place.place_id,
            formatted_address: place.formatted_address,
            name: place.name,
            lat: addressData.coordinates.lat,
            lng: addressData.coordinates.lng,
            placeName: place.name,
          };
          onAddressSelect(fullAddressData);
          setQuery(place.formatted_address || '');
          setShowSuggestions(false);
        }
      });
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  // processPlaceData removed - now using parseGooglePlace from utils/googleMaps.ts

  const renderSuggestion = ({ item, index }: { item: AddressSuggestion; index: number }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        index === suggestions.length - 1 && styles.suggestionItemLast
      ]}
      onPress={() => handleAddressSelect(item.place_id)}
      activeOpacity={0.7}
    >
      <View style={styles.suggestionIconContainer}>
        <MapPin size={18} color="#3f66ac" />
      </View>
      <View style={styles.suggestionContent}>
        <Text style={styles.suggestionMainText}>
          {item.structured_formatting.main_text}
        </Text>
        <Text style={styles.suggestionSecondaryText}>
          {item.structured_formatting.secondary_text}
        </Text>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.searchContainer}>
        <Search size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={[
            styles.searchInput,
            Platform.select({
              web: {
                outlineWidth: 0,
                outlineColor: 'transparent',
              },
            }),
          ]}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor="#999999"
          onFocus={() => setShowSuggestions(suggestions.length > 0)}
        />
        {isLoading && (
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>Searching...</Text>
          </View>
        )}
        {!autocompleteService.current && (
          <View style={styles.loadingIndicator}>
            <Text style={styles.loadingText}>Loading search...</Text>
          </View>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <FlatList
            data={suggestions}
            renderItem={({ item, index }) => renderSuggestion({ item, index })}
            keyExtractor={(item) => item.place_id}
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
          />
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'white',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    ...Platform.select({
      web: {
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      },
    }),
  },
  searchIcon: {
    marginRight: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 14,
  },
  loadingIndicator: {
    marginLeft: 8,
  },
  loadingText: {
    fontSize: 12,
    color: '#64748b',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 16,
    marginTop: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#3f66ac',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
    maxHeight: 300,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 300,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
    backgroundColor: '#ffffff',
  },
  suggestionItemLast: {
    borderBottomWidth: 0,
  },
  suggestionIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 2,
    lineHeight: 18,
  },
  suggestionSecondaryText: {
    fontSize: 13,
    color: '#6b7280',
    lineHeight: 16,
  },
});

export default WebAddressSearch;
