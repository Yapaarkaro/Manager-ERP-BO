import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  TouchableOpacity,
  FlatList,
  Text,
  StyleSheet,
} from 'react-native';
// Use simple text icons for web compatibility
// import { Search, MapPin } from 'lucide-react-native';

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

  const renderSuggestion = ({ item }: { item: AddressSuggestion }) => (
    <TouchableOpacity
      style={styles.suggestionItem}
      onPress={() => handleAddressSelect(item.place_id)}
    >
      <Text style={styles.suggestionIcon}>📍</Text>
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
        <Text style={styles.searchIcon}>🔍</Text>
        <TextInput
          style={styles.searchInput}
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
            renderItem={renderSuggestion}
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
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  searchIcon: {
    marginRight: 8,
    fontSize: 18,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#1f2937',
    paddingVertical: 4,
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
    backgroundColor: 'white',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e5e7eb',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 5,
    maxHeight: 200,
    zIndex: 1001,
  },
  suggestionsList: {
    maxHeight: 200,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f3f4f6',
  },
  suggestionIcon: {
    marginRight: 12,
    fontSize: 16,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionMainText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#1f2937',
    marginBottom: 2,
  },
  suggestionSecondaryText: {
    fontSize: 12,
    color: '#64748b',
  },
});

export default WebAddressSearch;
