import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, usePathname } from 'expo-router';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import Sidebar from '@/components/Sidebar';
import { 
  ArrowLeft, 
  Building2, 
  User, 
  Phone, 
  Mail, 
  MapPin, 
  Search, 
  X, 
  Hash,
  Plus,
  TriangleAlert as AlertTriangle,
  ChevronDown,
  Map,
  FileText,
  CreditCard,
  Info,
  Lock
} from 'lucide-react-native';
import { verifyGSTIN } from '@/services/gstinApi';
import { dataStore, Supplier } from '@/utils/dataStore';
import { createSupplier } from '@/services/backendApi';
import PlatformMapView from '@/components/PlatformMapView';
import { getInputFocusStyles } from '@/utils/platformUtils';
import { extractAddressComponents, reverseGeocode } from '@/services/googleMapsApi';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

interface SupplierFormData {
  businessName: string;
  contactPerson: string;
  mobile: string;
  email: string;
  addressLine1: string;
  addressLine2: string;
  addressLine3: string;
  city: string;
  pincode: string;
  state: string;
  gstin: string;
  notes: string;
}

const indianStates = [
  { name: 'Andhra Pradesh', code: '37' },
  { name: 'Arunachal Pradesh', code: '12' },
  { name: 'Assam', code: '18' },
  { name: 'Bihar', code: '10' },
  { name: 'Chhattisgarh', code: '22' },
  { name: 'Goa', code: '30' },
  { name: 'Gujarat', code: '24' },
  { name: 'Haryana', code: '06' },
  { name: 'Himachal Pradesh', code: '02' },
  { name: 'Jharkhand', code: '20' },
  { name: 'Karnataka', code: '29' },
  { name: 'Kerala', code: '32' },
  { name: 'Madhya Pradesh', code: '23' },
  { name: 'Maharashtra', code: '27' },
  { name: 'Manipur', code: '14' },
  { name: 'Meghalaya', code: '17' },
  { name: 'Mizoram', code: '15' },
  { name: 'Nagaland', code: '13' },
  { name: 'Odisha', code: '21' },
  { name: 'Punjab', code: '03' },
  { name: 'Rajasthan', code: '08' },
  { name: 'Sikkim', code: '11' },
  { name: 'Tamil Nadu', code: '33' },
  { name: 'Telangana', code: '36' },
  { name: 'Tripura', code: '16' },
  { name: 'Uttar Pradesh', code: '09' },
  { name: 'Uttarakhand', code: '05' },
  { name: 'West Bengal', code: '19' },
  { name: 'Delhi', code: '07' },
  { name: 'Jammu and Kashmir', code: '01' },
  { name: 'Ladakh', code: '38' },
  { name: 'Chandigarh', code: '04' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: '26' },
  { name: 'Lakshadweep', code: '31' },
  { name: 'Puducherry', code: '34' },
  { name: 'Andaman and Nicobar Islands', code: '35' }
];

export default function AddSupplierScreen() {
  const { returnToStockIn, returnToAddProduct } = useLocalSearchParams();
  const pathname = usePathname();
  const [sidebarWidth, setSidebarWidth] = useState(280);
  const [formData, setFormData] = useState<SupplierFormData>({
    businessName: '',
    contactPerson: '',
    mobile: '',
    email: '',
    addressLine1: '',
    addressLine2: '',
    addressLine3: '',
    city: '',
    pincode: '',
    state: '',
    gstin: '',
    notes: '',
  });

  const [showStateModal, setShowStateModal] = useState(false);
  const [showInfoModal, setShowInfoModal] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [addressSearch, setAddressSearch] = useState('');
  const [isLoadingGstin, setIsLoadingGstin] = useState(false);
  const [gstinInput, setGstinInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showMap, setShowMap] = useState(false);
  const [taxIdType, setTaxIdType] = useState<'GSTIN' | 'PAN'>('GSTIN');
  const [keyboardType, setKeyboardType] = useState<'default' | 'number-pad'>('number-pad');
  const [isTaxIdValid, setIsTaxIdValid] = useState(false);
  const taxIdInputRef = React.useRef<TextInput>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);
  const [isGstinAutoFilled, setIsGstinAutoFilled] = useState(false);
  const [isSearchActive, setIsSearchActive] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [suggestions, setSuggestions] = useState<any[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [selectedLocation, setSelectedLocation] = useState<{ lat: number; lng: number }>({ lat: 28.6139, lng: 77.209 });
  const searchInputRef = React.useRef<TextInput>(null);
  
  // Get focus styles utility
  const inputFocusStyles = getInputFocusStyles();
  
  // Import place predictions based on platform
  const getPlacePredictions = Platform.OS === 'web' 
    ? require('@/services/googleMapsApiWeb').getPlacePredictions
    : require('@/services/googleMapsApi').getPlacePredictions;
  
  const getPlaceDetails = Platform.OS === 'web'
    ? require('@/services/googleMapsApiWeb').getPlaceDetails
    : require('@/services/googleMapsApi').getPlaceDetails;

  const updateFormData = (field: keyof SupplierFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  // Helper function to get keyboard type based on GSTIN/PAN position
  const getKeyboardTypeForPosition = (type: 'GSTIN' | 'PAN', position: number): 'default' | 'number-pad' => {
    if (type === 'GSTIN') {
      // GSTIN Format: 33ALHPL7224K1Z0
      // Position 0-1: Numbers (33)
      // Position 2-6: Letters (ALHPL)
      // Position 7-10: Numbers (7224)
      // Position 11: Letter (K)
      // Position 12: Number (1)
      // Position 13: Letter (Z)
      // Position 14: Number/Letter (0-9 or A-Z) - use default
      if (position < 2) return 'number-pad'; // 0-1: Numbers
      if (position >= 2 && position < 7) return 'default'; // 2-6: Letters
      if (position >= 7 && position < 11) return 'number-pad'; // 7-10: Numbers
      if (position === 11) return 'default'; // 11: Letter
      if (position === 12) return 'number-pad'; // 12: Number
      if (position === 13) return 'default'; // 13: Letter
      if (position === 14) return 'default'; // 14: Can be number or letter
    } else {
      // PAN Format: AAAAA0000A
      // Position 0-4: Letters (AAAAA)
      // Position 5-8: Numbers (0000)
      // Position 9: Letter (A)
      if (position < 5) return 'default'; // 0-4: Letters
      if (position >= 5 && position < 9) return 'number-pad'; // 5-8: Numbers
      if (position === 9) return 'default'; // 9: Letter
    }
    return 'default';
  };

  // Validate input based on type
  const validateTaxId = (text: string, type: 'GSTIN' | 'PAN'): boolean => {
    if (type === 'GSTIN') {
      // GSTIN format: 15 characters (2 state code + 10 PAN + 1 entity code + 1 Z + 1 check digit)
      const gstinPattern = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z]{1}[1-9A-Z]{1}Z[0-9A-Z]{1}$/;
      return gstinPattern.test(text);
    } else {
      // PAN format: 10 characters (5 letters + 4 numbers + 1 letter)
      const panPattern = /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/;
      return panPattern.test(text);
    }
  };

  // Format input based on type
  const formatTaxIdInput = (text: string, type: 'GSTIN' | 'PAN'): string => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (type === 'GSTIN') {
      return cleaned.slice(0, 15);
    } else {
      return cleaned.slice(0, 10);
    }
  };

  // Sync gstinInput with formData.gstin when formData changes externally
  useEffect(() => {
    if (formData.gstin && !gstinInput) {
      setGstinInput(formData.gstin);
      // If GSTIN is set, ensure GSTIN type is selected
      if (formData.gstin.length === 15) {
        setTaxIdType('GSTIN');
      }
    }
  }, [formData.gstin]);

  // Update keyboard type when taxIdType changes
  useEffect(() => {
    const currentPosition = gstinInput.length;
    const currentKeyboardType = getKeyboardTypeForPosition(taxIdType, currentPosition);
    setKeyboardType(currentKeyboardType);
  }, [taxIdType, gstinInput]);

  // Function to convert text to camel case (capitalize first letter of each word)
  const toCamelCase = (text: string): string => {
    return text.replace(/\w\S*/g, (txt) => 
      txt.charAt(0).toUpperCase() + txt.substr(1).toLowerCase()
    );
  };

  // Function to handle text input with camel case formatting
  const handleTextInput = (field: keyof SupplierFormData, text: string) => {
    let formattedText = text;
    
    // Apply camel case formatting for specific fields
    if (['businessName', 'contactPerson', 'addressLine1', 'addressLine2', 'addressLine3', 'city', 'state'].includes(field)) {
      formattedText = toCamelCase(text);
    }
    
    updateFormData(field, formattedText);
  };

  // Shared function to parse address components with enhanced logic
  const parseAddressComponents = (addressString: string, rawCity?: string, rawState?: string, rawPincode?: string) => {
    const addressParts = addressString.split(',').map((part: string) => part.trim());
    
    // Extract address components
    let addressLine1 = addressParts[0] || '';
    let addressLine2 = addressParts[1] || '';
    let addressLine3 = addressParts[2] || '';
    let city = rawCity || '';
    let state = rawState || '';
    let pincode = rawPincode || '';

    // Clean city name - remove numbers, extra spaces, and ensure it's just the city name
    const cleanCityName = (cityName: string): string => {
      if (!cityName) return '';
      
      // Remove any numbers and special characters, keep only letters and spaces
      let cleaned = cityName.replace(/[0-9]/g, '').replace(/[^\w\s]/g, '');
      
      // Remove extra spaces and trim
      cleaned = cleaned.replace(/\s+/g, ' ').trim();
      
      // If the cleaned name is too short, return empty
      if (cleaned.length < 2) return '';
      
      return cleaned;
    };

    // Better parsing for city and state
    if (addressParts.length > 3) {
      // First, find pincode
      for (let i = addressParts.length - 1; i >= 0; i--) {
        const part = addressParts[i];
        if (/\d{6}/.test(part)) {
          pincode = part.match(/\d{6}/)?.[0] || pincode;
          break;
        }
      }

      // Find state by looking for exact matches in our state list
      for (let i = addressParts.length - 1; i >= 0; i--) {
        const part = addressParts[i];
        // Skip if it's a pincode
        if (/\d{6}/.test(part)) continue;
        
        // Look for exact state match
        const matchingState = indianStates.find(s => 
          s.name.toLowerCase() === part.toLowerCase()
        );
        
        if (matchingState) {
          state = matchingState.name;
          break;
        }
      }

      // Find city - look for parts that are not states, pincodes, or common address words
      const commonAddressWords = ['road', 'street', 'avenue', 'lane', 'colony', 'nagar', 'area', 'india', 'puram', 'palayam', 'patti'];
      const commonSuffixes = ['puram', 'palayam', 'patti', 'nagar', 'colony'];
      
      // First, try to find a part that looks like a major city (not a locality)
      for (let i = 1; i < addressParts.length - 1; i++) {
        const part = addressParts[i];
        
        // Skip if it's a pincode, state, or common address word
        if (/\d{6}/.test(part)) continue;
        if (indianStates.some(s => s.name.toLowerCase() === part.toLowerCase())) continue;
        if (commonAddressWords.some(word => part.toLowerCase().includes(word))) continue;
        
        // Skip if it ends with common locality suffixes
        if (commonSuffixes.some(suffix => part.toLowerCase().endsWith(suffix))) continue;
        
        // If this part looks like a city (not too short, not a number, not a locality)
        if (part.length > 2 && !/^\d+$/.test(part)) {
          city = cleanCityName(part);
          break;
        }
      }
      
      // If no city found, try to find the most likely city name
      if (!city) {
        for (let i = 1; i < addressParts.length - 1; i++) {
          const part = addressParts[i];
          
          // Skip if it's a pincode or state
          if (/\d{6}/.test(part)) continue;
          if (indianStates.some(s => s.name.toLowerCase() === part.toLowerCase())) continue;
          
          // If this part looks like a city (not too short, not a number)
          if (part.length > 2 && !/^\d+$/.test(part)) {
            city = cleanCityName(part);
            break;
          }
        }
      }
    }

    // Clean the final city name
    city = cleanCityName(city);

    return { addressLine1, addressLine2, addressLine3, city, state, pincode };
  };

  // Function to map GSTIN state data to our state names
  const mapGstinStateToStateName = (gstinState: string): string => {
    if (!gstinState) return '';
    
    const stateLower = gstinState.toLowerCase();
    
    // Direct matches
    const directMatch = indianStates.find(state => 
      state.name.toLowerCase() === stateLower ||
      state.name.toLowerCase().includes(stateLower) ||
      stateLower.includes(state.name.toLowerCase())
    );
    
    if (directMatch) {
      return directMatch.name;
    }
    
    // Common abbreviations and variations
    const stateMappings: { [key: string]: string } = {
      'tn': 'Tamil Nadu',
      'tamilnadu': 'Tamil Nadu',
      'tamil nadu': 'Tamil Nadu',
      'ap': 'Andhra Pradesh',
      'andhrapradesh': 'Andhra Pradesh',
      'andhra pradesh': 'Andhra Pradesh',
      'ka': 'Karnataka',
      'karnataka': 'Karnataka',
      'mh': 'Maharashtra',
      'maharashtra': 'Maharashtra',
      'dl': 'Delhi',
      'delhi': 'Delhi',
      'gj': 'Gujarat',
      'gujarat': 'Gujarat',
      'up': 'Uttar Pradesh',
      'uttarpradesh': 'Uttar Pradesh',
      'uttar pradesh': 'Uttar Pradesh',
      'wb': 'West Bengal',
      'westbengal': 'West Bengal',
      'west bengal': 'West Bengal',
      'hr': 'Haryana',
      'haryana': 'Haryana',
      'pb': 'Punjab',
      'punjab': 'Punjab',
      'mp': 'Madhya Pradesh',
      'madhyapradesh': 'Madhya Pradesh',
      'madhya pradesh': 'Madhya Pradesh',
      'rj': 'Rajasthan',
      'rajasthan': 'Rajasthan',
      'kl': 'Kerala',
      'kerala': 'Kerala',
      'or': 'Odisha',
      'odisha': 'Odisha',
      'orissa': 'Odisha',
      'jh': 'Jharkhand',
      'jharkhand': 'Jharkhand',
      'ct': 'Chhattisgarh',
      'chhattisgarh': 'Chhattisgarh',
      'chattisgarh': 'Chhattisgarh',
      'as': 'Assam',
      'assam': 'Assam',
      'br': 'Bihar',
      'bihar': 'Bihar',
      'uk': 'Uttarakhand',
      'uttarakhand': 'Uttarakhand',
      'ut': 'Uttarakhand',
      'hp': 'Himachal Pradesh',
      'himachalpradesh': 'Himachal Pradesh',
      'himachal pradesh': 'Himachal Pradesh',
      'ga': 'Goa',
      'goa': 'Goa',
      'mn': 'Manipur',
      'manipur': 'Manipur',
      'ml': 'Meghalaya',
      'meghalaya': 'Meghalaya',
      'mz': 'Mizoram',
      'mizoram': 'Mizoram',
      'nl': 'Nagaland',
      'nagaland': 'Nagaland',
      'ar': 'Arunachal Pradesh',
      'arunachalpradesh': 'Arunachal Pradesh',
      'arunachal pradesh': 'Arunachal Pradesh',
      'sk': 'Sikkim',
      'sikkim': 'Sikkim',
      'tr': 'Tripura',
      'tripura': 'Tripura',
      'an': 'Andaman and Nicobar Islands',
      'andamanandnicobar': 'Andaman and Nicobar Islands',
      'andaman and nicobar': 'Andaman and Nicobar Islands',
      'ch': 'Chandigarh',
      'chandigarh': 'Chandigarh',
      'dn': 'Dadra and Nagar Haveli and Daman and Diu',
      'dadraandnagarhaveli': 'Dadra and Nagar Haveli and Daman and Diu',
      'ld': 'Ladakh',
      'ladakh': 'Ladakh',
      'py': 'Puducherry',
      'puducherry': 'Puducherry',
      'lk': 'Lakshadweep',
      'lakshadweep': 'Lakshadweep',
      'jk': 'Jammu and Kashmir',
      'jammuandkashmir': 'Jammu and Kashmir',
      'jammu and kashmir': 'Jammu and Kashmir',
      'tg': 'Telangana',
      'telangana': 'Telangana',
    };
    
    // Check for mapped state
    const mappedState = stateMappings[stateLower];
    if (mappedState) {
      return mappedState;
    }
    
    // If no match found, return the original state name
    return gstinState;
  };

  const handleTaxIdTypeSwitch = (type: 'GSTIN' | 'PAN') => {
    // Prevent switching if GSTIN was auto-filled
    if (isGstinAutoFilled) {
      Alert.alert(
        'Cannot Change Tax ID Type',
        'The GSTIN and business details have been auto-filled from the GSTIN database. To change the Tax ID type or edit the GSTIN, please use the delete button to clear the auto-filled information first.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    setTaxIdType(type);
    setGstinInput('');
    setIsTaxIdValid(false);
    setIsLoadingGstin(false);
    // Reset keyboard type based on the first character of the new type
    const initialKeyboardType = getKeyboardTypeForPosition(type, 0);
    setKeyboardType(initialKeyboardType);
    
    // Force keyboard type change by blurring and refocusing
    setTimeout(() => {
      taxIdInputRef.current?.blur();
      setTimeout(() => {
        taxIdInputRef.current?.focus();
      }, 100);
    }, 50);
  };

  const handleTaxIdInput = async (text: string) => {
    // Prevent editing if GSTIN was auto-filled
    if (isGstinAutoFilled) {
      Alert.alert(
        'Cannot Edit GSTIN',
        'The GSTIN and business details have been auto-filled from the GSTIN database. To edit the GSTIN, please use the delete button to clear the auto-filled information first.',
        [{ text: 'OK' }]
      );
      return;
    }
    
    const formatted = formatTaxIdInput(text, taxIdType);
    setGstinInput(formatted);
    updateFormData('gstin', formatted);
    
    // Validate the input
    const isValid = validateTaxId(formatted, taxIdType);
    setIsTaxIdValid(isValid);
    
    // Update keyboard type based on the NEXT character position
    const nextPosition = formatted.length;
    const nextKeyboardType = getKeyboardTypeForPosition(taxIdType, nextPosition);
    
    // Only update keyboard if it needs to change, and blur/refocus to force keyboard change
    if (nextKeyboardType !== keyboardType) {
      setKeyboardType(nextKeyboardType);
      // Blur and refocus to force keyboard type change
      setTimeout(() => {
        taxIdInputRef.current?.blur();
        setTimeout(() => {
          taxIdInputRef.current?.focus();
        }, 50);
      }, 50);
    }
  };

  // Handle clearing auto-filled GSTIN data
  const handleClearAutoFilledData = () => {
    setIsGstinAutoFilled(false);
    setGstinInput('');
    setIsTaxIdValid(false);
    setFormData(prev => ({
      ...prev,
      gstin: '',
      businessName: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: '',
      pincode: '',
    }));
  };

  // Handle GSTIN lookup when search button is clicked
  const handleGstinLookup = async () => {
    const formatted = gstinInput || formData.gstin;
    
    // Only lookup if GSTIN is valid and complete
    if (taxIdType === 'GSTIN' && formatted.length === 15 && validateTaxId(formatted, 'GSTIN')) {
      setIsLoadingGstin(true);
      try {
        const result = await verifyGSTIN(formatted);
        if (!result.error && result.taxpayerInfo) {
          const gstinData = result.taxpayerInfo;
          const address = gstinData.pradr?.addr;
          
          // Extract city directly from GSTIN API response
          // Priority: address.city > address.loc (locality) > parse from address string
          let foundCity = '';
          if (address?.city) {
            foundCity = address.city.trim();
          } else if (address?.loc) {
            foundCity = address.loc.trim();
          }
          
          // Clean city name - remove numbers and extra spaces
          const cleanCityName = (cityName: string): string => {
            if (!cityName) return '';
            let cleaned = cityName.replace(/[0-9]/g, '').replace(/[^\w\s]/g, '');
            cleaned = cleaned.replace(/\s+/g, ' ').trim();
            // Remove common suffixes like "Division", "District", etc.
            cleaned = cleaned
              .replace(/\s+Division\s*$/i, '')
              .replace(/\s+District\s*$/i, '')
              .replace(/\s+Tehsil\s*$/i, '')
              .replace(/\s+Tahsil\s*$/i, '')
              .replace(/\s+Taluka\s*$/i, '')
              .trim();
            return cleaned.length >= 2 ? cleaned : '';
          };
          
          // Extract state - try to match state code or state name
          let foundState = '';
          if (address?.stcd) {
            // Try to find state by code
            const stateByCode = indianStates.find(state => state.code === address.stcd);
            if (stateByCode) {
              foundState = stateByCode.name;
            }
          }
          
          // If state not found by code, try to parse from address string
          if (!foundState && address) {
            const addressString = `${address.bno || ''} ${address.bnm || ''}, ${address.st || ''}, ${address.loc || ''}, ${address.city || ''}, ${address.stcd || ''}, ${address.pncd || ''}`.trim();
            const addressParts = addressString.split(',').map((part: string) => part.trim()).filter(part => part.length > 0);
            
            // Find state by matching with our state list
            for (let i = addressParts.length - 1; i >= 0; i--) {
              const part = addressParts[i];
              
              // Skip if it's a pincode or state code
              if (/\d{6}/.test(part) || /^\d{2}$/.test(part)) continue;
              
              // Look for exact state match in our state list
              const matchingState = indianStates.find(state => 
                state.name.toLowerCase() === part.toLowerCase()
              );
              
              if (matchingState) {
                foundState = matchingState.name;
                // If city not found yet, try to get it from the part before state
                if (!foundCity && i > 0) {
                  const potentialCity = addressParts[i - 1];
                  if (potentialCity && !/\d{6}/.test(potentialCity) && !/^\d{2}$/.test(potentialCity)) {
                    foundCity = potentialCity;
                  }
                }
                break;
              }
            }
          }
          
          // Use the parsed address data
          setFormData(prev => ({
            ...prev,
            businessName: gstinData.tradeNam || gstinData.lgnm || prev.businessName,
            gstin: formatted,
            addressLine1: address ? `${address.bno || ''} ${address.bnm || ''}`.trim() : prev.addressLine1,
            addressLine2: address?.st || prev.addressLine2,
            city: cleanCityName(foundCity) || prev.city,
            state: foundState || prev.state,
            pincode: address?.pncd || prev.pincode,
          }));
          
          // Auto-select GSTIN type and set input when lookup is used
          setTaxIdType('GSTIN');
          setGstinInput(formatted);
          setIsTaxIdValid(true);
          setIsGstinAutoFilled(true); // Mark as auto-filled
        } else {
          // Silent fail - don't show alert, just don't auto-fill
          console.log('GSTIN lookup failed:', result.message);
        }
      } catch (error) {
        // Silent fail - don't show alert
        console.error('Error verifying GSTIN:', error);
      } finally {
        setIsLoadingGstin(false);
      }
    }
  };

  const handleStateSelect = (state: string) => {
    updateFormData('state', state);
    setShowStateModal(false);
    setStateSearch('');
  };

  const filteredStates = indianStates.filter(state =>
    state.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    state.code.includes(stateSearch)
  );

  // Search functionality for map
  const handleSearchQuery = async (query: string) => {
    setSearchQuery(query);
    
    if (query.length > 2) {
      setIsLoadingSuggestions(true);
      try {
        const predictions = await getPlacePredictions(query);
        setSuggestions(predictions.slice(0, 5));
        setShowSuggestions(true);
      } catch (error) {
        console.error('Error fetching place predictions:', error);
        setSuggestions([]);
        setShowSuggestions(false);
      } finally {
        setIsLoadingSuggestions(false);
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  };

  const handleMapLocationSelect = async (lat: number, lng: number) => {
    setSelectedLocation({ lat, lng });
    try {
      const results = await reverseGeocode(lat, lng);
      if (results && results.length > 0) {
        const components = extractAddressComponents(results[0]);
        applyAddressComponents(components);
      }
    } catch (error) {
      console.log('⚠️ Reverse geocode failed for map selection:', error);
    }
  };

  const applyAddressComponents = (components: any) => {
    const addressParts = components.formatted_address?.split(',').map((p: string) => p.trim()) || [];
    
    let parsedAddressLine1 = '';
    if (components.placeName && components.placeName.trim() !== '') {
      parsedAddressLine1 = components.placeName;
    } else if (components.premise) {
      parsedAddressLine1 = components.premise;
    } else if (addressParts.length > 0 && !addressParts[0].match(/^[A-Z0-9]+\+[A-Z0-9]+$/)) {
      parsedAddressLine1 = addressParts[0];
    }
    
    const line2Parts: string[] = [];
    if (components.route && components.route !== parsedAddressLine1) {
      line2Parts.push(components.route);
    }
    if (components.sublocality) {
      line2Parts.push(components.sublocality);
    }
    
    // Map Google state to our state name if needed
    let stateName = components.state || '';
    if (stateName) {
      stateName = mapGstinStateToStateName(stateName);
    }
    
    setFormData(prev => ({
      ...prev,
      addressLine1: parsedAddressLine1 || prev.addressLine1,
      addressLine2: line2Parts.join(', ') || prev.addressLine2,
      city: components.city || components.postal_town || components.administrative_area_level_2 || prev.city,
      state: stateName || prev.state,
      pincode: components.pincode || components.postal_code || prev.pincode,
    }));
  };

  const handleAddressSelect = async (suggestion: any) => {
    try {
      const placeDetails = await getPlaceDetails(suggestion.place_id);
      
      if (!placeDetails) {
        throw new Error('No place details found');
      }
      
      const components = extractAddressComponents(placeDetails);
      components.placeName = suggestion.structured_formatting?.main_text || '';
      
      applyAddressComponents(components);

      const geometry = placeDetails.geometry?.location;
      if (geometry) {
        const resolvedLat = typeof geometry.lat === 'function' ? geometry.lat() : geometry.lat;
        const resolvedLng = typeof geometry.lng === 'function' ? geometry.lng() : geometry.lng;
        if (resolvedLat && resolvedLng) {
          setSelectedLocation({ lat: resolvedLat, lng: resolvedLng });
        }
      }
      
      setSearchQuery('');
      setSuggestions([]);
      setShowSuggestions(false);
      setIsSearchActive(false);
    } catch (error) {
      console.error('Error getting place details:', error);
      Alert.alert('Error', 'Failed to get address details. Please try again.');
    }
  };

  const isFormValid = () => {
    return (
      formData.businessName.trim().length > 0 &&
      formData.contactPerson.trim().length > 0 &&
      formData.mobile.trim().length === 10 &&
      formData.addressLine1.trim().length > 0 &&
      formData.city.trim().length > 0 &&
      formData.pincode.trim().length > 0 &&
      formData.state.trim().length > 0 &&
      formData.gstin.trim().length > 0
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    try {
      // Save supplier to Supabase
      const result = await createSupplier({
        businessName: formData.businessName.trim(),
        contactPerson: formData.contactPerson.trim(),
        mobileNumber: formData.mobile.trim(),
        email: formData.email.trim() || undefined,
        gstinPan: formData.gstin.trim() || undefined,
        addressLine1: formData.addressLine1.trim(),
        addressLine2: formData.addressLine2.trim() || undefined,
        addressLine3: formData.addressLine3.trim() || undefined,
        city: formData.city.trim(),
        pincode: formData.pincode.trim(),
        state: formData.state.trim(),
        additionalNotes: formData.notes.trim() || undefined,
      });

      if (!result.success || !result.supplier) {
        Alert.alert('Error', result.error || 'Failed to create supplier');
        setIsSubmitting(false);
        return;
      }

      const newSupplier = result.supplier;
      console.log('✅ Supplier created successfully:', newSupplier);

      // Also add to dataStore for backward compatibility (will be removed later)
      const supplierForStore: Supplier = {
        id: newSupplier.id,
        name: formData.contactPerson.trim(),
        businessName: formData.businessName.trim(),
        supplierType: 'business',
        contactPerson: formData.contactPerson.trim(),
        mobile: formData.mobile.trim(),
        email: formData.email.trim(),
        address: `${formData.addressLine1.trim()}, ${formData.addressLine2.trim() ? formData.addressLine2.trim() + ', ' : ''}${formData.addressLine3.trim() ? formData.addressLine3.trim() + ', ' : ''}${formData.city.trim()}, ${formData.pincode.trim()}, ${formData.state.trim()}`,
        gstin: formData.gstin.trim(),
        avatar: '', // No avatar - will show initials instead
        supplierScore: 85,
        onTimeDelivery: 90,
        qualityRating: 4.5,
        responseTime: 2.1,
        totalOrders: 0,
        completedOrders: 0,
        pendingOrders: 0,
        cancelledOrders: 0,
        totalValue: 0,
        lastOrderDate: null,
        joinedDate: new Date().toISOString(),
        status: 'active',
        paymentTerms: 'Net 30 Days',
        deliveryTime: '3-5 Business Days',
        categories: ['Electronics', 'Accessories'],
        productCount: 0,
        createdAt: new Date().toISOString(),
      };
      dataStore.addSupplier(supplierForStore);

      // Navigate immediately after success
      // Check if we should return to add product page
      if (returnToAddProduct === 'true') {
        // Return to add product page with the new supplier data
        const supplierData = {
          id: newSupplier.id,
          name: formData.contactPerson,
          gstin: formData.gstin,
          businessName: formData.businessName,
          address: `${formData.addressLine1}, ${formData.addressLine2 ? formData.addressLine2 + ', ' : ''}${formData.addressLine3 ? formData.addressLine3 + ', ' : ''}${formData.city}, ${formData.pincode}, ${formData.state}`,
        };
        
        // Navigate back to add product page with supplier data
        router.replace({
          pathname: '/inventory/manual-product',
          params: {
            newSupplier: JSON.stringify(supplierData)
          }
        });
      }
      // Check if we should return to stock-in
      else if (returnToStockIn === 'true') {
        // Return to stock-in with the new supplier data
        const supplierData = {
          id: newSupplier.id,
          name: formData.contactPerson,
          gstin: formData.gstin,
          businessName: formData.businessName,
          address: `${formData.addressLine1}, ${formData.addressLine2 ? formData.addressLine2 + ', ' : ''}${formData.addressLine3 ? formData.addressLine3 + ', ' : ''}${formData.city}, ${formData.pincode}, ${formData.state}`,
        };
        
        // Navigate back to stock-in with supplier data
        router.push({
          pathname: '/inventory/stock-in/manual',
          params: {
            newSupplier: JSON.stringify(supplierData)
          }
        });
      } else {
        // Return to previous screen (suppliers list or wherever we came from)
        router.back();
      }
      
      setIsSubmitting(false);
    } catch (error: any) {
      console.error('Error creating supplier:', error);
      Alert.alert('Error', error.message || 'Failed to create supplier');
      setIsSubmitting(false);
    }
  };

  const handleMenuNavigation = (route: any) => {
    router.push(route);
  };

  const handleSidebarCollapseChange = (isCollapsed: boolean, width: number) => {
    setSidebarWidth(width);
  };

  return (
    <View style={styles.mainContainer}>
      {/* Sidebar - Only on web */}
      {Platform.OS === 'web' && (
        <Sidebar 
          onNavigate={handleMenuNavigation} 
          currentRoute={pathname}
          onCollapseChange={handleSidebarCollapseChange}
        />
      )}
      
      <View style={[
        styles.contentWrapper,
        Platform.OS === 'web' && {
          marginLeft: sidebarWidth,
          flex: 1,
        }
      ]}>
        <ResponsiveContainer>
          <View style={styles.container}>
            <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <View style={styles.headerTitleContainer}>
            <Text style={styles.headerTitle}>Add New Supplier</Text>
            <Text style={styles.headerSubtitle}>Enter supplier details to get started</Text>
          </View>
        </View>

        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            {...(Platform.OS === 'web' && {
              // @ts-ignore - web-specific props
              onWheel: undefined,
            })}
          >
            {/* GSTIN/PAN Section */}
            <View style={styles.gstinSection}>
              <View style={styles.gstinSectionHeader}>
                {taxIdType === 'GSTIN' ? (
                  <FileText size={20} color={Colors.primary} />
                ) : (
                  <CreditCard size={20} color={Colors.primary} />
                )}
                <View style={styles.gstinSectionHeaderText}>
                  <Text style={styles.gstinSectionTitle}>Tax Identification</Text>
                  <Text style={styles.gstinSectionSubtitle}>
                    {taxIdType === 'GSTIN' 
                      ? 'Enter GSTIN to auto-fill business details (Optional)'
                      : 'Enter PAN number (Optional)'}
                  </Text>
                </View>
              </View>
              
              {/* Toggle for GSTIN/PAN */}
              <View style={styles.typeSelector}>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    taxIdType === 'GSTIN' && styles.activeTypeButton,
                    isGstinAutoFilled && styles.disabledTypeButton,
                  ]}
                  onPress={() => handleTaxIdTypeSwitch('GSTIN')}
                  activeOpacity={0.7}
                  disabled={isGstinAutoFilled}
                >
                  <Text style={[
                    styles.typeButtonText,
                    taxIdType === 'GSTIN' && styles.activeTypeButtonText,
                    isGstinAutoFilled && styles.disabledTypeButtonText,
                  ]}>
                    GSTIN
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.typeButton,
                    taxIdType === 'PAN' && styles.activeTypeButton,
                    isGstinAutoFilled && styles.disabledTypeButton,
                  ]}
                  onPress={() => handleTaxIdTypeSwitch('PAN')}
                  activeOpacity={0.7}
                  disabled={isGstinAutoFilled}
                >
                  <Text style={[
                    styles.typeButtonText,
                    taxIdType === 'PAN' && styles.activeTypeButtonText,
                    isGstinAutoFilled && styles.disabledTypeButtonText,
                  ]}>
                    PAN
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputGroup}>
                <View style={[
                  inputFocusStyles.inputContainer,
                  focusedField === 'taxId' && inputFocusStyles.inputContainerFocused,
                  isLoadingGstin && styles.gstinInputContainerLoading,
                  isTaxIdValid && gstinInput.length > 0 && styles.validTaxIdInput,
                  gstinInput.length > 0 && !isTaxIdValid && !isLoadingGstin && styles.invalidTaxIdInput,
                ]}>
                  {taxIdType === 'GSTIN' ? (
                    <FileText size={20} color={isLoadingGstin ? Colors.primary : Colors.textLight} style={styles.inputIcon} />
                  ) : (
                    <CreditCard size={20} color={isLoadingGstin ? Colors.primary : Colors.textLight} style={styles.inputIcon} />
                  )}
                  <TextInput
                    ref={taxIdInputRef}
                    style={[
                      inputFocusStyles.input as any,
                      isGstinAutoFilled && styles.disabledInput,
                    ]}
                    value={gstinInput || formData.gstin}
                    onChangeText={handleTaxIdInput}
                    onFocus={() => {
                      if (isGstinAutoFilled) {
                        Alert.alert(
                          'Cannot Edit GSTIN',
                          'The GSTIN and business details have been auto-filled from the GSTIN database. To edit the GSTIN, please use the delete button to clear the auto-filled information first.',
                          [{ text: 'OK' }]
                        );
                        taxIdInputRef.current?.blur();
                        return;
                      }
                      setFocusedField('taxId');
                    }}
                    onBlur={() => setFocusedField(null)}
                    placeholder={taxIdType === 'GSTIN' ? '15AAAAA0000A1Z5' : 'AAAAA0000A'}
                    placeholderTextColor={Colors.textLight}
                    keyboardType={keyboardType}
                    autoCapitalize="characters"
                    autoCorrect={false}
                    maxLength={taxIdType === 'GSTIN' ? 15 : 10}
                    editable={!isLoadingGstin && !isGstinAutoFilled}
                  />
                  {taxIdType === 'GSTIN' && !isGstinAutoFilled && (
                    <TouchableOpacity
                      onPress={handleGstinLookup}
                      disabled={isLoadingGstin || !gstinInput || gstinInput.length !== 15 || !isTaxIdValid}
                      style={[
                        styles.searchButton,
                        (isLoadingGstin || !gstinInput || gstinInput.length !== 15 || !isTaxIdValid) && styles.searchButtonDisabled
                      ]}
                      activeOpacity={0.7}
                    >
                      {isLoadingGstin ? (
                        <Text style={styles.searchButtonText}>...</Text>
                      ) : (
                        <Search size={18} color={Colors.background} />
                      )}
                    </TouchableOpacity>
                  )}
                  {isGstinAutoFilled && (
                    <View style={styles.lockedIndicator}>
                      <Lock size={18} color={Colors.textLight} />
                    </View>
                  )}
                </View>
                <Text style={styles.gstinHelperText}>
                  {isLoadingGstin ? `Fetching business details from ${taxIdType}...` :
                    isGstinAutoFilled ? 
                      `✓ GSTIN verified - Business details auto-filled from GSTIN database` :
                    isTaxIdValid && gstinInput.length > 0 ? 
                      taxIdType === 'GSTIN' 
                        ? `✓ Valid GSTIN - Click search button to auto-fill details`
                        : `✓ Valid ${taxIdType}` : 
                      gstinInput.length > 0 ?
                      `Please enter a valid ${taxIdType} format` :
                      taxIdType === 'GSTIN' 
                        ? 'Enter 15-digit GSTIN and click search to auto-fill business details'
                        : 'Enter 10-character PAN (5 letters + 4 numbers + 1 letter)'
                  }
                </Text>
                {taxIdType === 'GSTIN' && !isGstinAutoFilled && (
                  <Text style={styles.infoText}>
                    Format: 2-digit state code + 10-digit PAN + 4 additional characters
                  </Text>
                )}
                {taxIdType === 'PAN' && (
                  <Text style={styles.infoText}>
                    Format: 5 letters + 4 numbers + 1 letter (e.g., ABCDE1234F)
                  </Text>
                )}
              </View>
              
              {/* Clear button and info when auto-filled - positioned below input group */}
              {isGstinAutoFilled && (
                <View style={styles.autoFillActionsContainer}>
                  <TouchableOpacity
                    style={styles.clearAutoFillButton}
                    onPress={() => {
                      handleClearAutoFilledData();
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <X size={16} color={Colors.background} />
                    <Text style={styles.clearAutoFillButtonText}>Clear Auto-filled Data</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.infoIconButton}
                    onPress={() => {
                      setShowInfoModal(true);
                    }}
                    activeOpacity={0.7}
                    hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                  >
                    <Info size={18} color={Colors.primary} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {/* Business Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <Building2 size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Business Information</Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Business Name *</Text>
                  <View style={[
                    inputFocusStyles.inputContainer,
                    focusedField === 'businessName' && inputFocusStyles.inputContainerFocused,
                  ]}>
                    <Building2 size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={inputFocusStyles.input as any}
                      value={formData.businessName}
                      onChangeText={(text) => handleTextInput('businessName', text)}
                      onFocus={() => setFocusedField('businessName')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter business name"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="words"
                    />
                  </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Contact Person *</Text>
                  <View style={[
                    inputFocusStyles.inputContainer,
                    focusedField === 'contactPerson' && inputFocusStyles.inputContainerFocused,
                  ]}>
                    <User size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={inputFocusStyles.input as any}
                      value={formData.contactPerson}
                      onChangeText={(text) => {
                        // Remove any numeric characters and apply camel case
                        const cleanText = text.replace(/[0-9]/g, '');
                        handleTextInput('contactPerson', cleanText);
                      }}
                      onFocus={() => setFocusedField('contactPerson')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter contact person name"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="words"
                    />
                  </View>
              </View>

              <View style={styles.rowContainer}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Mobile *</Text>
                  <View style={[
                    inputFocusStyles.inputContainer,
                    focusedField === 'mobile' && inputFocusStyles.inputContainerFocused,
                  ]}>
                    <Phone size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={inputFocusStyles.input as any}
                      value={formData.mobile}
                      onChangeText={(text) => updateFormData('mobile', text.replace(/\D/g, '').slice(0, 10))}
                      onFocus={() => setFocusedField('mobile')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter mobile number"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="phone-pad"
                      maxLength={10}
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Email</Text>
                  <View style={[
                    inputFocusStyles.inputContainer,
                    focusedField === 'email' && inputFocusStyles.inputContainerFocused,
                  ]}>
                    <Mail size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={inputFocusStyles.input as any}
                      value={formData.email}
                      onChangeText={(text) => updateFormData('email', text)}
                      onFocus={() => setFocusedField('email')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter email address"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="email-address"
                      autoCapitalize="none"
                    />
                  </View>
                </View>
              </View>

            </View>

            {/* Address Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <MapPin size={20} color={Colors.primary} />
                <View style={styles.sectionHeaderText}>
                  <Text style={styles.sectionTitle}>Address Information</Text>
                  <TouchableOpacity
                    style={styles.mapButton}
                    onPress={() => setShowMap(true)}
                    activeOpacity={0.7}
                  >
                    <Map size={16} color={Colors.primary} />
                    <Text style={styles.mapButtonText}>Use Map to Auto-fill</Text>
                  </TouchableOpacity>
                </View>
              </View>

              {showMap ? (
                <View style={styles.mapWrapper}>
                  <PlatformMapView
                    initialLocation={selectedLocation}
                    selectedLocation={selectedLocation}
                    onMapClick={handleMapLocationSelect}
                    onMarkerDragEnd={handleMapLocationSelect}
                  />
                  
                  {/* Floating Search Bar over Map */}
                  <View style={styles.floatingSearchContainer}>
                    <View style={styles.searchButtonInner}>
                      <Search size={20} color={Colors.primary} />
                      <TextInput
                        ref={searchInputRef}
                        style={[
                          styles.mapSearchInput,
                          Platform.select({
                            web: {
                              outlineWidth: 0,
                              outlineColor: 'transparent',
                              outlineStyle: 'none' as any,
                            },
                          }),
                        ]}
                        placeholder="Search for an address..."
                        placeholderTextColor={Colors.textLight}
                        value={searchQuery}
                        onChangeText={handleSearchQuery}
                        onFocus={() => setIsSearchActive(true)}
                        onBlur={() => {
                          setTimeout(() => {
                            if (!searchQuery) {
                              setIsSearchActive(false);
                            }
                          }, 300);
                        }}
                        autoCapitalize="none"
                        autoCorrect={false}
                      />
                      {isLoadingSuggestions ? (
                        <View style={styles.loadingIndicator}>
                          <Text style={styles.loadingText}>Searching...</Text>
                        </View>
                      ) : searchQuery.length > 0 ? (
                        <TouchableOpacity
                          onPress={() => {
                            setSearchQuery('');
                            setSuggestions([]);
                            setShowSuggestions(false);
                            setIsSearchActive(false);
                          }}
                          style={styles.clearButton}
                        >
                          <X size={16} color={Colors.textLight} />
                        </TouchableOpacity>
                      ) : null}
                    </View>
                  </View>

                  {/* Search Results - Show below search bar */}
                  {showSuggestions && suggestions.length > 0 && (
                    <View style={styles.floatingSearchResultsContainer}>
                      {suggestions.slice(0, 3).map((suggestion, index) => (
                        <TouchableOpacity
                          key={suggestion.place_id || index}
                          style={[
                            styles.searchResultItem,
                            index === suggestions.slice(0, 3).length - 1 && styles.searchResultItemLast
                          ]}
                          onPress={() => handleAddressSelect(suggestion)}
                          activeOpacity={0.7}
                        >
                          <View style={styles.searchResultIcon}>
                            <MapPin size={16} color={Colors.primary} />
                          </View>
                          <View style={styles.searchResultText}>
                            <Text style={styles.searchResultMainText} numberOfLines={1}>
                              {suggestion.structured_formatting?.main_text || suggestion.description?.split(',')[0]}
                            </Text>
                            <Text style={styles.searchResultSecondaryText} numberOfLines={1}>
                              {suggestion.structured_formatting?.secondary_text || suggestion.description}
                            </Text>
                          </View>
                        </TouchableOpacity>
                      ))}
                    </View>
                  )}
                  
                  <TouchableOpacity
                    style={styles.manualButton}
                    onPress={() => {
                      setShowMap(false);
                      setSearchQuery('');
                      setSuggestions([]);
                      setShowSuggestions(false);
                      setIsSearchActive(false);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.manualButtonText}>Fill Manually Instead</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Address Line 1 *</Text>
                    <View style={[
                      inputFocusStyles.inputContainer,
                      focusedField === 'addressLine1' && inputFocusStyles.inputContainerFocused,
                    ]}>
                      <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={inputFocusStyles.input as any}
                        value={formData.addressLine1}
                        onChangeText={(text) => handleTextInput('addressLine1', text)}
                        onFocus={() => setFocusedField('addressLine1')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="Enter address line 1"
                        placeholderTextColor={Colors.textLight}
                      />
                    </View>
                  </View>
                </>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address Line 2</Text>
                <View style={[
                  inputFocusStyles.inputContainer,
                  focusedField === 'addressLine2' && inputFocusStyles.inputContainerFocused,
                ]}>
                  <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={inputFocusStyles.input as any}
                    value={formData.addressLine2}
                    onChangeText={(text) => handleTextInput('addressLine2', text)}
                    onFocus={() => setFocusedField('addressLine2')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter address line 2 (optional)"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address Line 3</Text>
                <View style={[
                  inputFocusStyles.inputContainer,
                  focusedField === 'addressLine3' && inputFocusStyles.inputContainerFocused,
                ]}>
                  <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={inputFocusStyles.input as any}
                    value={formData.addressLine3}
                    onChangeText={(text) => handleTextInput('addressLine3', text)}
                    onFocus={() => setFocusedField('addressLine3')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter address line 3 (optional)"
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
              </View>

              <View style={styles.rowContainer}>
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>City *</Text>
                  <View style={[
                    inputFocusStyles.inputContainer,
                    focusedField === 'city' && inputFocusStyles.inputContainerFocused,
                  ]}>
                    <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={inputFocusStyles.input as any}
                      value={formData.city}
                      onChangeText={(text) => handleTextInput('city', text)}
                      onFocus={() => setFocusedField('city')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter city"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="words"
                    />
                  </View>
                </View>

                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Pincode *</Text>
                  <View style={[
                    inputFocusStyles.inputContainer,
                    focusedField === 'pincode' && inputFocusStyles.inputContainerFocused,
                  ]}>
                    <MapPin size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={inputFocusStyles.input as any}
                      value={formData.pincode}
                      onChangeText={(text) => updateFormData('pincode', text.replace(/\D/g, '').slice(0, 6))}
                      onFocus={() => setFocusedField('pincode')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter pincode"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      maxLength={6}
                    />
                  </View>
                </View>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>State *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowStateModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.state && styles.placeholderText
                  ]}>
                    {formData.state || 'Select state'}
                  </Text>
                  <ChevronDown size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Additional Information */}
            <View style={styles.section}>
              <View style={styles.sectionHeader}>
                <AlertTriangle size={20} color={Colors.primary} />
                <Text style={styles.sectionTitle}>Additional Information</Text>
              </View>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Additional Notes</Text>
                <View style={[
                  inputFocusStyles.inputContainer,
                  focusedField === 'notes' && inputFocusStyles.inputContainerFocused,
                  styles.textAreaContainer,
                ]}>
                  <TextInput
                    style={[inputFocusStyles.input as any, styles.textArea]}
                    value={formData.notes}
                    onChangeText={(text) => updateFormData('notes', text)}
                    onFocus={() => setFocusedField('notes')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Add any additional notes or remarks about this supplier..."
                    placeholderTextColor={Colors.textLight}
                    multiline
                    numberOfLines={4}
                    textAlignVertical="top"
                  />
                </View>
              </View>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[
              styles.completeButton,
              isFormValid() ? styles.enabledButton : styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.completeButtonText,
              isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
            ]}>
              {isSubmitting ? 'Adding Supplier...' : 'Add Supplier'}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
        </View>
        </ResponsiveContainer>
      </View>

      {/* State Selection Modal */}
      <Modal
        visible={showStateModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowStateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowStateModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Search States</Text>
              <View style={styles.modalInputContainer}>
                <Search size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  value={stateSearch}
                  onChangeText={setStateSearch}
                  placeholder="Search by state name or code..."
                  placeholderTextColor={Colors.textLight}
                  autoFocus={true}
                />
              </View>
            </View>

            <ScrollView style={styles.modalScrollView}>
              {filteredStates.map((state) => (
                <TouchableOpacity
                  key={state.code}
                  style={styles.stateOption}
                  onPress={() => handleStateSelect(state.name)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.stateName}>{state.name}</Text>
                  <Text style={styles.stateCode}>Code: {state.code}</Text>
                </TouchableOpacity>
              ))}
              {filteredStates.length === 0 && (
                <View style={styles.noResultsContainer}>
                  <Text style={styles.noResultsText}>No states found matching "{stateSearch}"</Text>
                </View>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Info Modal - Why GSTIN is locked */}
      <Modal
        visible={showInfoModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowInfoModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderLeft}>
                <Info size={24} color={Colors.primary} />
                <Text style={styles.modalTitle}>Why can't I edit the GSTIN?</Text>
              </View>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowInfoModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalScrollView}>
              <View style={styles.infoModalContent}>
                <Text style={styles.infoModalText}>
                  The GSTIN and business details have been auto-filled from the official GSTIN database. This ensures data accuracy and prevents errors.
                </Text>
                <Text style={styles.infoModalText}>
                  To edit the GSTIN or switch to PAN, please use the "Clear Auto-filled Data" button first.
                </Text>
                <View style={styles.infoModalNote}>
                  <Info size={18} color={Colors.primary} />
                  <Text style={styles.infoModalNoteText}>
                    This helps maintain data integrity and ensures compliance with GST regulations.
                  </Text>
                </View>
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                style={styles.modalButton}
                onPress={() => setShowInfoModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalButtonText}>Got it</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  mainContainer: {
    flex: 1,
    flexDirection: Platform.OS === 'web' ? 'row' : 'column',
    backgroundColor: Colors.background,
  },
  contentWrapper: {
    flex: 1,
    backgroundColor: Colors.background,
    ...Platform.select({
      web: {
        transition: 'margin-left 0.3s ease',
        minWidth: 0,
      },
    }),
  },
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitleContainer: {
    flex: 1,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 2,
  },
  headerSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  section: {
    marginBottom: 24,
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  sectionHeaderText: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  sectionSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
    lineHeight: 18,
  },
  gstinButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderWidth: 1.5,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gstinButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 12,
  },
  gstinButtonText: {
    fontSize: 15,
    color: Colors.primary,
    fontWeight: '600',
    flex: 1,
  },
  inputGroup: {
    marginBottom: 18,
  },
  label: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
    marginLeft: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1.5,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
    height: 24,
    textAlignVertical: 'center',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderWidth: 1.5,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  submitSection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: -2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 8,
  },
  completeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  enabledButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  enabledButtonText: {
    color: Colors.background,
  },
  disabledButtonText: {
    color: Colors.textLight,
  },
  textAreaContainer: {
    minHeight: 100,
    paddingVertical: 12,
  },
  textArea: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    width: '90%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 4,
  },
  modalInputGroup: {
    padding: 16,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 12,
  },
  modalActions: {
    flexDirection: 'row',
    padding: 16,
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  confirmButton: {
    flex: 1,
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.background,
  },
  modalScrollView: {
    maxHeight: 400,
  },
  stateOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  stateName: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  stateCode: {
    fontSize: 14,
    color: Colors.textLight,
  },
  noResultsContainer: {
    paddingVertical: 20,
    alignItems: 'center',
  },
  noResultsText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
  },
  modalHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  infoModalContent: {
    padding: 20,
  },
  infoModalText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 16,
  },
  infoModalNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 8,
    marginTop: 8,
  },
  infoModalNoteText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  modalFooter: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  modalButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 14,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  helperText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 6,
    marginLeft: 2,
    fontStyle: 'italic',
  },
  mapButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 6,
    gap: 6,
    marginTop: 4,
  },
  mapButtonText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  mapContainer: {
    marginBottom: 16,
  },
  mapWrapper: {
    height: 320,
    borderRadius: 20,
    overflow: 'hidden',
    backgroundColor: Colors.grey[50],
    marginBottom: 16,
    shadowColor: '#1f2937',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 12,
    elevation: 8,
  },
  floatingSearchContainer: {
    position: 'absolute',
    top: 16,
    left: 16,
    right: 16,
    zIndex: 10,
  },
  searchButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
    gap: 12,
  },
  mapSearchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineStyle: 'none' as any,
      },
    }),
  },
  floatingSearchResultsContainer: {
    position: 'absolute',
    top: 80,
    left: 16,
    right: 16,
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    zIndex: 11,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
    backgroundColor: Colors.background,
  },
  searchResultItemLast: {
    borderBottomWidth: 0,
  },
  searchResultIcon: {
    width: 32,
    height: 32,
    borderRadius: 10,
    backgroundColor: '#EFF6FF',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: 12,
  },
  searchResultText: {
    flex: 1,
  },
  searchResultMainText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
    lineHeight: 18,
  },
  searchResultSecondaryText: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 16,
  },
  clearButton: {
    padding: 4,
  },
  manualButton: {
    marginTop: 12,
    paddingVertical: 8,
    alignItems: 'center',
  },
  manualButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
  },
  inputContainerLoading: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '05',
  },
  loadingIndicator: {
    marginLeft: 8,
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: Colors.primary + '20',
    borderRadius: 6,
  },
  loadingText: {
    fontSize: 11,
    color: Colors.primary,
    fontWeight: '600',
  },
  // GSTIN Section - Brand blue color scheme
  gstinSection: {
    marginBottom: 24,
    backgroundColor: "#EFF6FF", // Light blue background
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: "#BFDBFE", // Light blue border
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  gstinSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
    gap: 12,
  },
  gstinSectionHeaderText: {
    flex: 1,
  },
  gstinSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary, // Brand blue
    marginBottom: 4,
  },
  gstinSectionSubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 18,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 4,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTypeButton: {
    backgroundColor: Colors.primary,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  activeTypeButtonText: {
    color: Colors.background,
  },
  validTaxIdInput: {
    borderColor: Colors.success,
    backgroundColor: '#F0FDF4',
  },
  invalidTaxIdInput: {
    borderColor: Colors.error,
    backgroundColor: '#FEF2F2',
  },
  gstinInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: "#FFFFFF",
    borderWidth: 2,
    borderColor: "#BFDBFE",
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  gstinInputContainerLoading: {
    borderColor: Colors.primary,
    backgroundColor: "#EFF6FF",
  },
  gstinInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
    height: 24,
    textAlignVertical: 'center',
  },
  gstinHelperText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 6,
    marginLeft: 2,
    fontStyle: 'italic',
    fontWeight: '500',
  },
  infoText: {
    fontSize: 12,
    color: Colors.primary,
    marginTop: 6,
    lineHeight: 16,
  },
  searchButton: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  searchButtonDisabled: {
    backgroundColor: Colors.grey[300],
    opacity: 0.5,
  },
  searchButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  disabledTypeButton: {
    opacity: 0.5,
  },
  disabledTypeButtonText: {
    color: Colors.textLight,
  },
  disabledInput: {
    backgroundColor: Colors.grey[100],
    opacity: 0.7,
  },
  autoFillActionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    gap: 8,
    ...Platform.select({
      web: {
        zIndex: 1000,
        position: 'relative',
        pointerEvents: 'auto',
      },
    }),
  },
  clearAutoFillButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: 8,
    height: 40,
    paddingHorizontal: 16,
    gap: 8,
    shadowColor: Colors.error,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        touchAction: 'manipulation',
      },
    }),
  },
  clearAutoFillButtonText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  infoIconButton: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
    borderWidth: 1.5,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    ...Platform.select({
      web: {
        cursor: 'pointer',
        userSelect: 'none',
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none',
        touchAction: 'manipulation',
      },
    }),
  },
  lockedIndicator: {
    width: 36,
    height: 36,
    borderRadius: 8,
    backgroundColor: Colors.grey[200],
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
}); 