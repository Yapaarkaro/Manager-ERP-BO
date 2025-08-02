import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
  Platform,
} from 'react-native';
import { Search, MapPin } from 'lucide-react-native';

interface AddressAutocompleteProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onAddressSelect: (address: any) => void;
}

interface AddressSuggestion {
  place_id: string;
  formatted_address: string;
  street?: string;
  area?: string;
  city?: string;
  state?: string;
  pincode?: string;
}

// Ola Maps API configuration
const OLA_MAPS_API_KEY = '7lWg0vFb2XZqdPXSOzseDmd4QaSSyNKf74TMC93i';

export default function AddressAutocomplete({
  placeholder = 'Search for address...',
  value,
  onChangeText,
  onAddressSelect,
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    if (value.length > 2) {
      // Debounce the search
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(() => {
        searchAddresses(value);
      }, 300) as unknown as NodeJS.Timeout;
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
    };
  }, [value]);

  const searchAddresses = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const requestId = `autocomplete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      const response = await fetch(
        `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(query)}&api_key=${OLA_MAPS_API_KEY}`,
        {
          method: 'GET',
          headers: {
            'X-Request-Id': requestId,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.ok) {
        const data = await response.json();
        console.log('Autocomplete response:', data);
        
        if (data.predictions && data.predictions.length > 0) {
          const formattedSuggestions = data.predictions.map((prediction: any) => {
            // Parse the structured formatting
            const mainText = prediction.structured_formatting?.main_text || '';
            const secondaryText = prediction.structured_formatting?.secondary_text || '';
            
            return {
              place_id: prediction.place_id,
              formatted_address: prediction.description,
              street: mainText,
              area: secondaryText,
              city: extractCityFromDescription(prediction.description),
              state: extractStateFromDescription(prediction.description),
              pincode: extractPincodeFromDescription(prediction.description),
            };
          });
          
          setSuggestions(formattedSuggestions);
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
          setShowSuggestions(false);
        }
      } else {
        console.error('Autocomplete API error:', response.status);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error) {
      console.error('Autocomplete error:', error);
      setSuggestions([]);
      setShowSuggestions(false);
    } finally {
      setIsLoading(false);
    }
  };

  const extractCityFromDescription = (description: string): string => {
    const parts = description.split(',').map(part => part.trim());
    // Look for city in the middle parts, avoiding the first (street) and last (state/pincode)
    if (parts.length >= 3) {
      // Common address words to skip
      const commonAddressWords = ['road', 'street', 'avenue', 'lane', 'colony', 'nagar', 'area', 'india', 'puram', 'palayam', 'patti'];
      const commonSuffixes = ['puram', 'palayam', 'patti', 'nagar', 'colony'];
      
      // First, try to find a part that looks like a major city (not a locality)
      for (let i = 1; i < parts.length - 1; i++) {
        const part = parts[i];
        if (part.length > 2 && 
            !/\d{6}/.test(part) && 
            !/^\d+$/.test(part) &&
            !commonAddressWords.some(word => part.toLowerCase().includes(word)) &&
            !commonSuffixes.some(suffix => part.toLowerCase().endsWith(suffix))) {
          return part;
        }
      }
      
      // If no city found, try to find the most likely city name
      for (let i = 1; i < parts.length - 1; i++) {
        const part = parts[i];
        if (part.length > 2 && 
            !/\d{6}/.test(part) && 
            !/^\d+$/.test(part) &&
            !commonAddressWords.some(word => part.toLowerCase().includes(word))) {
          return part;
        }
      }
      
      // Fallback to second last part
      return parts[parts.length - 2] || '';
    }
    return '';
  };

  const extractStateFromDescription = (description: string): string => {
    const parts = description.split(',').map(part => part.trim());
    // Look for state in the last parts, but avoid common words
    const commonWords = ['india', 'road', 'street', 'area'];
    
    for (let i = parts.length - 1; i >= 0; i--) {
      const part = parts[i];
      // Remove pincode if present
      const cleanPart = part.replace(/\d{6}/, '').trim();
      if (cleanPart.length > 2 && 
          !commonWords.some(word => cleanPart.toLowerCase().includes(word))) {
        return cleanPart;
      }
    }
    return '';
  };

  const extractPincodeFromDescription = (description: string): string => {
    const pincodeMatch = description.match(/\b\d{6}\b/);
    return pincodeMatch ? pincodeMatch[0] : '';
  };

  const handleSuggestionSelect = (suggestion: AddressSuggestion) => {
    onAddressSelect(suggestion);
    setShowSuggestions(false);
    setSuggestions([]);
  };

  const handleInputFocus = () => {
    if (suggestions.length > 0) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Delay hiding suggestions to allow for selection
    setTimeout(() => {
      setShowSuggestions(false);
    }, 200);
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Search size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={value}
          onChangeText={onChangeText}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          autoCapitalize="words"
          autoCorrect={false}
        />
        {isLoading && (
          <Text style={styles.loadingText}>...</Text>
        )}
      </View>

      {showSuggestions && suggestions.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          >
            {suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion.place_id}-${index}`}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionSelect(suggestion)}
                activeOpacity={0.7}
              >
                <MapPin size={16} color="#64748b" style={styles.suggestionIcon} />
                <View style={styles.suggestionContent}>
                  <Text style={styles.suggestionMain} numberOfLines={1}>
                    {suggestion.street || suggestion.formatted_address}
                  </Text>
                  <Text style={styles.suggestionSecondary} numberOfLines={1}>
                    {suggestion.area || suggestion.formatted_address}
                  </Text>
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    zIndex: 1000,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f8fafc',
    borderWidth: 2,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: '#1e293b',
  },
  loadingText: {
    color: '#64748b',
    fontSize: 16,
    marginLeft: 8,
  },
  suggestionsContainer: {
    position: 'absolute',
    top: '100%',
    left: 0,
    right: 0,
    backgroundColor: '#ffffff',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderTopWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
    maxHeight: 200,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
    zIndex: 1001,
  },
  suggestionsList: {
    flex: 1,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  suggestionIcon: {
    marginRight: 12,
  },
  suggestionContent: {
    flex: 1,
  },
  suggestionMain: {
    fontSize: 16,
    color: '#1e293b',
    fontWeight: '500',
    marginBottom: 2,
  },
  suggestionSecondary: {
    fontSize: 14,
    color: '#64748b',
  },
});