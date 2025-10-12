import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  TextInput,
  FlatList,
  TouchableOpacity,
  Text,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { MapPin, Navigation } from 'lucide-react-native';
import { getPlacePredictions, getPlaceDetails, extractAddressComponents } from '../services/googleMapsApi';

interface PlaceSuggestion {
  place_id: string;
  description: string;
  main_text: string;
  secondary_text: string;
}

interface GooglePlacesSearchProps {
  onAddressSelect: (addressData: any) => void;
  placeholder?: string;
  style?: any;
  inputStyle?: any;
  containerStyle?: any;
  debounceMs?: number;
  hideAfterSelection?: boolean;
  autoFocus?: boolean;
}

const GooglePlacesSearch: React.FC<GooglePlacesSearchProps> = ({
  onAddressSelect,
  placeholder = 'Search for an address...',
  style,
  inputStyle,
  containerStyle,
  debounceMs = 300,
  hideAfterSelection = true,
  autoFocus = false,
}) => {
  const [query, setQuery] = useState('');
  const [suggestions, setSuggestions] = useState<PlaceSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isVisible, setIsVisible] = useState(true);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    if (query.length > 2) {
      debounceRef.current = setTimeout(() => {
        searchPlaces(query);
      }, debounceMs);
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [query, debounceMs]);

  // Auto-focus when component becomes visible
  useEffect(() => {
    if (autoFocus && isVisible) {
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100); // Reduced delay for better responsiveness
    }
  }, [autoFocus, isVisible]);

  // Reset query when component becomes visible again
  useEffect(() => {
    if (isVisible && autoFocus) {
      setQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, [isVisible, autoFocus]);

  const searchPlaces = async (searchQuery: string) => {
    setIsLoading(true);
    try {
      const predictions = await getPlacePredictions(searchQuery);
      const formattedSuggestions: PlaceSuggestion[] = predictions.map(prediction => ({
        place_id: prediction.place_id,
        description: prediction.description,
        main_text: prediction.structured_formatting.main_text,
        secondary_text: prediction.structured_formatting.secondary_text,
      }));
      
      setSuggestions(formattedSuggestions);
      setShowSuggestions(formattedSuggestions.length > 0);
    } catch (error) {
      console.error('Error searching places:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddressSelect = async (suggestion: PlaceSuggestion) => {
    setQuery(suggestion.description);
    setShowSuggestions(false);
    setIsLoading(true);

    try {
      const placeDetails = await getPlaceDetails(suggestion.place_id);
      if (placeDetails) {
        const addressData = extractAddressComponents(placeDetails);
        // Include the place name from the search suggestion for better premise extraction
        addressData.placeName = suggestion.main_text;
        console.log('📍 Place name from suggestion:', suggestion.main_text);
        onAddressSelect(addressData);
        
        // Don't hide the search bar, let parent handle collapse
        // The parent component will handle the collapse animation
      }
    } catch (error) {
      console.error('Error getting place details:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const renderSuggestion = ({ item, index }: { item: PlaceSuggestion; index: number }) => (
    <TouchableOpacity
      style={[
        styles.suggestionItem,
        index === suggestions.length - 1 && styles.lastSuggestionItem
      ]}
      onPress={() => handleAddressSelect(item)}
      activeOpacity={0.6}
    >
      <View style={styles.suggestionIconContainer}>
        <MapPin size={18} color="#3f66ac" strokeWidth={2.5} />
      </View>
      <View style={styles.suggestionContent}>
        <Text style={styles.mainText} numberOfLines={1}>{item.main_text}</Text>
        <Text style={styles.secondaryText} numberOfLines={1}>{item.secondary_text}</Text>
      </View>
      <View style={styles.suggestionArrow}>
        <Navigation size={16} color="#94a3b8" />
      </View>
    </TouchableOpacity>
  );

  // Don't render if hidden after selection
  if (!isVisible) {
    return null;
  }

  return (
    <View style={[styles.container, containerStyle]}>
      <View style={[styles.inputContainer, style]}>
        <TextInput
          ref={inputRef}
          style={[styles.input, inputStyle]}
          value={query}
          onChangeText={setQuery}
          placeholder={placeholder}
          placeholderTextColor="#999"
          autoCorrect={false}
          autoCapitalize="none"
          autoFocus={autoFocus}
          onFocus={() => {
            if (suggestions.length > 0) {
              setShowSuggestions(true);
            }
          }}
          onBlur={() => {
            // Delay hiding suggestions to allow for selection
            setTimeout(() => setShowSuggestions(false), 200);
          }}
        />
        {isLoading && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="small" color="#3f66ac" />
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
            showsVerticalScrollIndicator={false}
            maxToRenderPerBatch={10}
            windowSize={10}
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
  inputContainer: {
    position: 'relative',
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#e2e8f0',
    shadowColor: '#3f66ac',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.08,
    shadowRadius: 4,
    elevation: 3,
  },
  input: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: '#1e293b',
    minHeight: 52,
    fontWeight: '500',
  },
  loadingContainer: {
    position: 'absolute',
    right: 12,
    top: 12,
    bottom: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    marginTop: 4,
    maxHeight: 280,
    shadowColor: '#3f66ac',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
    overflow: 'hidden',
  },
  suggestionsList: {
    flexGrow: 0,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
    backgroundColor: '#ffffff',
  },
  lastSuggestionItem: {
    borderBottomWidth: 0,
  },
  suggestionIconContainer: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: '#eff6ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
    marginRight: 8,
  },
  mainText: {
    fontSize: 15,
    color: '#1e293b',
    fontWeight: '600',
    marginBottom: 3,
  },
  secondaryText: {
    fontSize: 13,
    color: '#64748b',
    fontWeight: '400',
  },
  suggestionArrow: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    opacity: 0.6,
  },
});

export default GooglePlacesSearch;
