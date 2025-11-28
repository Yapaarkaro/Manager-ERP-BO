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
    const initializePlacesService = () => {
      console.log('🏗️ Initializing Places services...');
      console.log('🏗️ Google exists:', !!window.google);
      console.log('🏗️ Maps exists:', !!(window.google && window.google.maps));
      console.log('🏗️ Places exists:', !!(window.google && window.google.maps && window.google.maps.places));
      
      if (window.google && window.google.maps && window.google.maps.places) {
        try {
          console.log('✅ Creating AutocompleteService...');
          autocompleteService.current = new google.maps.places.AutocompleteService();
          
          console.log('✅ Creating PlacesService...');
          // Create a dummy div for PlacesService (required by Google Maps API)
          const dummyDiv = document.createElement('div');
          placesService.current = new google.maps.places.PlacesService(dummyDiv);
          
          console.log('✅ Places services initialized successfully!');
        } catch (error) {
          console.error('❌ Error initializing Google Places services:', error);
          setTimeout(initializePlacesService, 1000);
        }
      } else {
        console.log('⏳ Places API not ready, retrying...');
        // Retry after a short delay if Google Maps API is not ready
        setTimeout(initializePlacesService, 500);
      }
    };

    // Start checking after a short delay to ensure the main map component has started loading
    setTimeout(initializePlacesService, 1500);
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
          // Process the place data to match the expected format
          const addressData = processPlaceData(place);
          onAddressSelect(addressData);
          setQuery(place.formatted_address || '');
          setShowSuggestions(false);
        }
      });
    } catch (error) {
      console.error('Error getting place details:', error);
    }
  };

  const processPlaceData = (place: google.maps.places.PlaceResult) => {
    const addressComponents = place.address_components || [];
    
    // Extract address components
    const components: any = {};
    addressComponents.forEach(component => {
      const types = component.types;
      if (types.includes('street_number')) {
        components.street_number = component.long_name;
      } else if (types.includes('route')) {
        components.route = component.long_name;
      } else if (types.includes('locality')) {
        components.locality = component.long_name;
      } else if (types.includes('administrative_area_level_1')) {
        components.administrative_area_level_1 = component.long_name;
      } else if (types.includes('postal_code')) {
        components.postal_code = component.long_name;
      } else if (types.includes('country')) {
        components.country = component.long_name;
        components.country_code = component.short_name;
      }
    });

    return {
      place_id: place.place_id,
      formatted_address: place.formatted_address,
      name: place.name,
      lat: place.geometry?.location?.lat(),
      lng: place.geometry?.location?.lng(),
      ...components,
      placeName: place.name,
    };
  };

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
                outlineStyle: 'none',
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
