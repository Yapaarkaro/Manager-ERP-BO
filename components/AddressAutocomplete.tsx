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
import { Search, MapPin, Edit3 } from 'lucide-react-native';

interface AddressAutocompleteProps {
  placeholder?: string;
  value: string;
  onChangeText: (text: string) => void;
  onAddressSelect: (address: any) => void;
  onManualEntry?: () => void;
  isSettingQueryProgrammatically?: boolean;
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
  value = '',
  onChangeText,
  onAddressSelect,
  onManualEntry,
  isSettingQueryProgrammatically = false,
}: AddressAutocompleteProps) {
  // Ensure value is always a string
  const safeValue = typeof value === 'string' ? value : '';
  // Internal state for the input value
  const [inputValue, setInputValue] = useState(safeValue);
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [hasSelectedAddress, setHasSelectedAddress] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  // Sync inputValue with external value prop
  useEffect(() => {
    setInputValue(safeValue);
  }, [safeValue]);

  useEffect(() => {
    // Don't trigger search if query is being set programmatically
    if (isSettingQueryProgrammatically) {
      return;
    }
    
    // Use the internal inputValue for search
    if (inputValue && inputValue.length > 2) {
      // Debounce the search
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      
      debounceRef.current = setTimeout(() => {
        searchAddresses(inputValue);
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
  }, [inputValue, isSettingQueryProgrammatically]);

  const searchAddresses = async (query: string) => {
    if (!query.trim()) return;

    setIsLoading(true);
    try {
      const requestId = `autocomplete-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      // Add timeout for Android to prevent hanging requests
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 10000); // 10 second timeout
      
      const response = await fetch(
        `https://api.olamaps.io/places/v1/autocomplete?input=${encodeURIComponent(query)}&api_key=${OLA_MAPS_API_KEY}`,
        {
          method: 'GET',
          headers: {
            'X-Request-Id': requestId,
            'Content-Type': 'application/json',
            'User-Agent': 'Manager-ERP-BO/1.0',
          },
          signal: controller.signal,
        }
      );

      clearTimeout(timeoutId);

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
        console.error('Autocomplete API error:', response.status, response.statusText);
        setSuggestions([]);
        setShowSuggestions(false);
      }
    } catch (error: any) {
      console.error('Autocomplete error:', error);
      if (error.name === 'AbortError') {
        console.log('Request timed out');
      }
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
    console.log('🏠 Selected address from search:', suggestion);
    console.log('📱 Platform:', Platform.OS);
    
    // IMMEDIATELY close suggestions and clear all states
    setShowSuggestions(false);
    setSuggestions([]);
    setIsLoading(false); // Ensure loading state is also cleared
    setHasSelectedAddress(true); // Mark that an address has been selected
    
    // Ensure onAddressSelect is defined before calling it
    if (typeof onAddressSelect === 'function') {
      // For Android, we need to ensure the touch event is fully processed
      // before calling the parent callback
      if (Platform.OS === 'android') {
        // Use a longer delay for Android to ensure proper touch handling
        setTimeout(() => {
          console.log('📞 Calling onAddressSelect with:', suggestion);
          onAddressSelect(suggestion);
        }, 200);
      } else {
        // For iOS, call immediately
        console.log('📞 Calling onAddressSelect with:', suggestion);
        onAddressSelect(suggestion);
      }
    } else {
      console.warn('onAddressSelect callback is not defined');
    }
  };

  const handleManualEntry = () => {
    // Close suggestions
    setShowSuggestions(false);
    setSuggestions([]);
    
    // Blur the input to ensure suggestions are hidden
    // inputRef.current?.blur(); // This line is removed as per the edit hint
    
    // Call the manual entry callback if provided
    if (typeof onManualEntry === 'function') {
      onManualEntry();
    }
  };

  const handleInputFocus = () => {
    // Only show suggestions if there are actual suggestions, we're not loading, and no address has been selected
    if (suggestions && suggestions.length > 0 && !isLoading && !hasSelectedAddress) {
      setShowSuggestions(true);
    }
  };

  const handleInputBlur = () => {
    // Hide suggestions immediately with a small delay to ensure proper touch handling
    setTimeout(() => {
      setShowSuggestions(false);
    }, 100);
  };

  const handleInputChange = (text: string) => {
    // Update internal state
    setInputValue(text);
    
    // Reset selection flag when user starts typing again
    if (hasSelectedAddress) {
      setHasSelectedAddress(false);
    }
    
    // Call external onChangeText if provided
    if (typeof onChangeText === 'function') {
      onChangeText(text);
    }
  };

  return (
    <View style={styles.container}>
      <View style={styles.inputContainer}>
        <Search size={20} color="#64748b" style={styles.searchIcon} />
        <TextInput
          style={styles.input}
          placeholder={placeholder}
          placeholderTextColor="#94a3b8"
          value={inputValue}
          onChangeText={handleInputChange}
          onFocus={handleInputFocus}
          onBlur={handleInputBlur}
          autoCapitalize="words"
          autoCorrect={false}
          returnKeyType="search"
          blurOnSubmit={false}
        />
        {isLoading && (
          <Text style={styles.loadingText}>...</Text>
        )}
      </View>



      {showSuggestions && (
        <View style={styles.suggestionsContainer}>
          <ScrollView
            style={styles.suggestionsList}
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            nestedScrollEnabled={true}
          >
            {suggestions && suggestions.length > 0 && suggestions.map((suggestion, index) => (
              <TouchableOpacity
                key={`${suggestion.place_id}-${index}`}
                style={styles.suggestionItem}
                onPress={() => handleSuggestionSelect(suggestion)}
                activeOpacity={0.7}
                delayPressIn={Platform.OS === 'android' ? 50 : 0}
                delayPressOut={Platform.OS === 'android' ? 50 : 0}
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
            
            {/* Manual Entry Option */}
            <TouchableOpacity
              style={[styles.suggestionItem, styles.manualEntryItem]}
              onPress={handleManualEntry}
              activeOpacity={0.7}
              delayPressIn={Platform.OS === 'android' ? 50 : 0}
            >
              <Edit3 size={16} color="#64748b" style={styles.suggestionIcon} />
              <View style={styles.suggestionContent}>
                <Text style={styles.suggestionMain}>Enter address manually</Text>
                <Text style={styles.suggestionSecondary}>Type your address details</Text>
              </View>
            </TouchableOpacity>
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
  manualEntryItem: {
    backgroundColor: '#f8fafc',
    borderTopWidth: 1,
    borderTopColor: '#e2e8f0',
  },

});