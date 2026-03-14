import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Animated,
  KeyboardAvoidingView,
  Platform,
  Alert,
  ScrollView,
  Modal,
  Keyboard,
  Dimensions,
} from 'react-native';
import CapitalizedTextInput from '@/components/CapitalizedTextInput';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MapPin, ChevronDown, Search, X, Plus, User, Phone } from 'lucide-react-native';
import { useThemeColors } from '@/hooks/useColorScheme';
import { getGSTINStateCode } from '@/utils/dataStore';
import GooglePlacesSearch from '@/components/GooglePlacesSearch';
import { extractAddressComponents } from '@/services/googleMapsApi';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { createAddress, updateAddress, createStaff } from '@/services/backendApi';
import { BusinessAddress } from '@/utils/dataStore';
import { getPlatformShadow } from '@/utils/shadowUtils';
import { getSignupData, setSignupData } from '@/utils/signupStore';

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
  { name: 'Andaman and Nicobar Islands', code: '35' },
  { name: 'Chandigarh', code: '04' },
  { name: 'Dadra and Nagar Haveli and Daman and Diu', code: '26' },
  { name: 'Delhi', code: '07' },
  { name: 'Jammu and Kashmir', code: '01' },
  { name: 'Ladakh', code: '38' },
  { name: 'Lakshadweep', code: '31' },
  { name: 'Puducherry', code: '34' },
];

export default function BusinessAddressManualScreen() {
  const _params = useLocalSearchParams();
  const _stored = getSignupData();

  const type = (_params.type as string) ?? _stored.type ?? '';
  const value = (_params.value as string) ?? _stored.value ?? '';
  const gstinData = (_params.gstinData as string) ?? _stored.gstinData ?? '';
  const name = (_params.name as string) ?? _stored.name ?? '';
  const businessName = (_params.businessName as string) ?? _stored.businessName ?? '';
  const businessType = (_params.businessType as string) ?? _stored.businessType ?? '';
  const customBusinessType = (_params.customBusinessType as string) ?? _stored.customBusinessType ?? '';
  const mobile = (_params.mobile as string) ?? _stored.mobile ?? '';
  const addressType = (_params.addressType as string) ?? _stored.addressType ?? 'primary';
  const existingAddresses = (_params.existingAddresses as string) ?? _stored.existingAddresses ?? '[]';
  const editMode = (_params.editMode as string) ?? _stored.editMode ?? 'false';
  const editAddressId = (_params.editAddressId as string) ?? _stored.editAddressId ?? '';
  const prefilledAddressName = (_params.prefilledAddressName as string) ?? _stored.prefilledAddressName ?? '';
  const prefilledDoorNumber = (_params.prefilledDoorNumber as string) ?? _stored.prefilledDoorNumber ?? '';
  const prefilledStreet = (_params.prefilledStreet as string) ?? _stored.prefilledStreet ?? '';
  const prefilledArea = (_params.prefilledArea as string) ?? _stored.prefilledArea ?? '';
  const prefilledCity = (_params.prefilledCity as string) ?? _stored.prefilledCity ?? '';
  const prefilledState = (_params.prefilledState as string) ?? _stored.prefilledState ?? '';
  const prefilledPincode = (_params.prefilledPincode as string) ?? _stored.prefilledPincode ?? '';
  const prefilledFormatted = (_params.prefilledFormatted as string) ?? _stored.prefilledFormatted ?? '';
  const prefilledContactName = (_params.prefilledContactName as string) ?? _stored.prefilledContactName ?? '';
  const prefilledContactPhone = (_params.prefilledContactPhone as string) ?? _stored.prefilledContactPhone ?? '';
  const prefilledLat = (_params.prefilledLat as string) ?? _stored.prefilledLat ?? '';
  const prefilledLng = (_params.prefilledLng as string) ?? _stored.prefilledLng ?? '';
  
  const insets = useSafeAreaInsets();
  const isPrimaryAddress = addressType === 'primary';
  const [addressName, setAddressName] = useState(isPrimaryAddress ? (prefilledAddressName as string) : '');
  const [addressLine1, setAddressLine1] = useState(prefilledStreet as string);
  const [addressLine2, setAddressLine2] = useState(prefilledArea as string);
  const [additionalLines, setAdditionalLines] = useState<string[]>([]);
  const [city, setCity] = useState(prefilledCity as string);
  const [pincode, setPincode] = useState(prefilledPincode as string);
  const [selectedState, setSelectedState] = useState<{ name: string; code: string } | null>(null);
  const [showStates, setShowStates] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showSearchBar, setShowSearchBar] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isNavigating, setIsNavigating] = useState(false);
  const [showDuplicateModal, setShowDuplicateModal] = useState(false);
  const [duplicateAddressInfo, setDuplicateAddressInfo] = useState<any>(null);
  const [showStaffOtpModal, setShowStaffOtpModal] = useState(false);
  const [staffOtpCode, setStaffOtpCode] = useState('');
  const [staffOtpName, setStaffOtpName] = useState('');
  const [contactPersonName, setContactPersonName] = useState(
    isPrimaryAddress ? ((prefilledContactName as string) || (name as string) || '') : ''
  );
  const initialContactPhone = isPrimaryAddress
    ? ((prefilledContactPhone as string) || (mobile as string) || '').replace(/\D/g, '').slice(0, 10)
    : '';
  const [contactPhone, setContactPhone] = useState(initialContactPhone);
  const [latitude, setLatitude] = useState<number | null>(prefilledLat ? parseFloat(prefilledLat as string) : null);
  const [longitude, setLongitude] = useState<number | null>(prefilledLng ? parseFloat(prefilledLng as string) : null);
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const glowAnimation = useRef(new Animated.Value(0)).current;
  const searchInputRef = useRef<TextInput>(null);
  const stateSearchInputRef = useRef<TextInput>(null);
  const scrollViewRef = useRef<ScrollView>(null);
  const inputRefs = useRef<{ [key: string]: TextInput | null }>({});
  const inputContainerRefs = useRef<{ [key: string]: View | null }>({});
  const inputPositionsRef = useRef<{ [key: string]: number }>({});
  const saveButtonRef = useRef<View | null>(null);
  const pendingNavigateRef = useRef<any>(null);
  const keyboardHeightRef = useRef<number>(0);
  const prefilledInitializedRef = useRef(false);
  const contactInitializedRef = useRef(false);
  const editAddressLoadedRef = useRef(false);
  const [keyboardHeight, setKeyboardHeight] = useState<number>(0);
  const scrollCheckTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const colors = useThemeColors();

  const typeInfo = React.useMemo(() => {
    // Parse existing addresses from route params
    let parsedAddresses: any[] = [];
    try { parsedAddresses = JSON.parse(existingAddresses as string || '[]'); } catch {}
    
    if (editMode === 'true') {
      if (addressType === 'branch') {
        const branchAddresses = parsedAddresses.filter((addr: any) => addr.type === 'branch');
        const currentBranchIndex = branchAddresses.findIndex((addr: any) => addr.id === editAddressId);
        const branchNumber = currentBranchIndex >= 0 ? currentBranchIndex + 1 : branchAddresses.length + 1;
        return {
          color: '#3f66ac',
          title: `Branch Address - ${branchNumber}`,
          subtitle: 'Edit your branch address details'
        };
      } else if (addressType === 'warehouse') {
        const warehouseAddresses = parsedAddresses.filter((addr: any) => addr.type === 'warehouse');
        const currentWarehouseIndex = warehouseAddresses.findIndex((addr: any) => addr.id === editAddressId);
        const warehouseNumber = currentWarehouseIndex >= 0 ? currentWarehouseIndex + 1 : warehouseAddresses.length + 1;
        return {
          color: '#f59e0b',
          title: `Warehouse Address - ${warehouseNumber}`,
          subtitle: 'Edit your warehouse address details'
        };
      } else {
        return {
          color: '#ffc754',
          title: 'Primary Address',
          subtitle: 'Edit your primary address details'
        };
      }
    } else {
      if (addressType === 'branch') {
        const branchAddresses = parsedAddresses.filter((addr: any) => addr.type === 'branch');
        const branchNumber = branchAddresses.length + 1;
        return {
          color: '#3f66ac',
          title: `Branch Address - ${branchNumber}`,
          subtitle: 'Enter your branch address details'
        };
      } else if (addressType === 'warehouse') {
        const warehouseAddresses = parsedAddresses.filter((addr: any) => addr.type === 'warehouse');
        const warehouseNumber = warehouseAddresses.length + 1;
        return {
          color: '#f59e0b',
          title: `Warehouse Address - ${warehouseNumber}`,
          subtitle: 'Enter your warehouse address details'
        };
      }
      return {
        color: '#ffc754',
        title: 'Primary Business Address',
        subtitle: 'Enter your primary business address details'
      };
    }
  }, [editMode, addressType, editAddressId]);

  // Glowy animation effect
  useEffect(() => {
    const glowLoop = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 2000,
          useNativeDriver: false,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 2000,
          useNativeDriver: false,
        }),
      ])
    );
    glowLoop.start();
    return () => glowLoop.stop();
  }, [glowAnimation]);

  // Auto-focus on state search input when modal opens
  useEffect(() => {
    if (showStates) {
      // Longer delay to ensure modal slide animation completes fully
      const timer = setTimeout(() => {
        console.log('🔍 Attempting to focus state search input');
        stateSearchInputRef.current?.focus();
      }, 800); // Increased from 500ms to 800ms for slide animation
      return () => clearTimeout(timer);
    } else {
      // Clear search when modal closes
      setStateSearch('');
    }
  }, [showStates]);

  useEffect(() => {
    console.log('🏠 Business Address Manual Screen - Prefilled Data:');
    console.log('  - Address Name:', prefilledAddressName);
    console.log('  - Street:', prefilledStreet);
    console.log('  - Area:', prefilledArea);
    console.log('  - City:', prefilledCity);
    console.log('  - State:', prefilledState);
    console.log('  - Pincode:', prefilledPincode);
    console.log('  - Formatted:', prefilledFormatted);
    
    // Auto-fill address name with business name
    if (businessName && !addressName && addressType === 'primary') {
      setAddressName(businessName as string);
    }

    // Auto-select state if prefilled
    if (prefilledState) {
      const matchingState = indianStates.find(state => {
        const stateName = state.name.toLowerCase();
        const prefilledLower = (prefilledState as string).toLowerCase();
        
        // Exact match
        if (stateName === prefilledLower) return true;
        
        // Contains match
        if (stateName.includes(prefilledLower) || prefilledLower.includes(stateName)) return true;
        
        // Code match
        if (state.code === prefilledState) return true;
        
        return false;
      });
      
      if (matchingState) {
        setSelectedState(matchingState);
      }
    }

    Animated.timing(slideAnimation, {
      toValue: 1,
      duration: 500,
      useNativeDriver: Platform.OS !== 'web',
    }).start();
  }, [businessName, prefilledState, addressType]);

  // Handle prefilled address data - only run once on mount to prevent cursor jumping
  useEffect(() => {
    if (prefilledInitializedRef.current) return; // Already initialized
    
    console.log('🏠 useEffect - Prefilled values check:');
    console.log('  - prefilledStreet:', prefilledStreet, typeof prefilledStreet);
    console.log('  - prefilledArea:', prefilledArea, typeof prefilledArea);
    console.log('  - prefilledCity:', prefilledCity, typeof prefilledCity);
    console.log('  - prefilledPincode:', prefilledPincode, typeof prefilledPincode);
    
    if (prefilledStreet && prefilledStreet !== '') {
      console.log('🏠 Setting prefilled street:', prefilledStreet);
      setAddressLine1(prefilledStreet as string);
    }
    
    // Check for prefilledArea - it can be an empty string, so check for undefined/null
    if (prefilledArea !== undefined && prefilledArea !== null) {
      console.log('🏠 Setting prefilled area:', prefilledArea);
      setAddressLine2(prefilledArea as string);
    } else {
      console.log('⚠️ prefilledArea is undefined or null, not setting addressLine2');
    }
    
    if (prefilledCity && prefilledCity !== '') {
      // Clean up city name on mobile - remove administrative suffixes like "Division", "District", etc.
      let cleanedCity = prefilledCity as string;
      if (Platform.OS !== 'web') {
        // Remove common administrative suffixes
        cleanedCity = (prefilledCity as string)
          .replace(/\s+Division\s*$/i, '')
          .replace(/\s+District\s*$/i, '')
          .replace(/\s+Tehsil\s*$/i, '')
          .replace(/\s+Tahsil\s*$/i, '')
          .replace(/\s+Taluka\s*$/i, '')
          .trim();
        
        // Special case: "Bangalore Division" -> "Bengaluru"
        if (cleanedCity.toLowerCase().includes('bangalore')) {
          cleanedCity = 'Bengaluru';
        }
        
        console.log('🧹 Cleaned city name:', prefilledCity, '->', cleanedCity);
      }
      console.log('🏠 Setting prefilled city:', cleanedCity);
      setCity(cleanedCity);
    }
    
    if (prefilledPincode && prefilledPincode !== '') {
      console.log('🏠 Setting prefilled pincode:', prefilledPincode);
      setPincode(prefilledPincode as string);
    }
    
    prefilledInitializedRef.current = true; // Mark as initialized
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    if ((addressType || 'primary') !== 'primary') {
      return;
    }
    
    if (contactInitializedRef.current) return; // Already initialized

    const nextContactName = (prefilledContactName as string) || (name as string) || '';
    if (nextContactName && !contactPersonName) {
      setContactPersonName(nextContactName);
    }

    const nextContactPhone = ((prefilledContactPhone as string) || (mobile as string) || '')
      .replace(/\D/g, '')
      .slice(0, 10);
    if (nextContactPhone && !contactPhone) {
      setContactPhone(nextContactPhone);
    }
    
    contactInitializedRef.current = true; // Mark as initialized
  }, []); // Empty dependency array - only run once on mount

  useEffect(() => {
    if (editMode !== 'true' || !editAddressId || editAddressLoadedRef.current) {
      return;
    }

    try {
      const existingAddressesParam = existingAddresses as string;
      if (!existingAddressesParam || existingAddressesParam === '[]') {
        // Try loading from route params as fallback
        const allParsed = (() => { try { return JSON.parse(existingAddresses as string || '[]'); } catch { return []; } })();
        const addressFromStore = allParsed.find((a: any) => a.id === editAddressId);
        if (addressFromStore) {
          // Load address data including additional lines
          setAddressName(addressFromStore.name || '');
          setAddressLine1(addressFromStore.addressLine1 || '');
          setAddressLine2(addressFromStore.addressLine2 || '');
          setCity(addressFromStore.city || '');
          setPincode(addressFromStore.pincode || '');
          
          // Load additional lines: doorNumber is first, then additionalLines array
          const loadedAdditionalLines: string[] = [];
          if (addressFromStore.doorNumber) {
            loadedAdditionalLines.push(addressFromStore.doorNumber);
          }
          if (addressFromStore.additionalLines && Array.isArray(addressFromStore.additionalLines)) {
            loadedAdditionalLines.push(...addressFromStore.additionalLines);
          }
          setAdditionalLines(loadedAdditionalLines);
          
          // Load state
          if (addressFromStore.stateCode) {
            const matchingState = indianStates.find(state => state.code === addressFromStore.stateCode);
            if (matchingState) {
              setSelectedState(matchingState);
            }
          }
          
          // Load contact info for primary addresses
          if ((addressType || 'primary') === 'primary') {
            if (addressFromStore.manager) {
              setContactPersonName(addressFromStore.manager);
            }
            if (addressFromStore.phone) {
              const sanitizedPhone = String(addressFromStore.phone).replace(/\D/g, '').slice(0, 10);
              setContactPhone(sanitizedPhone);
            }
          }
          
          editAddressLoadedRef.current = true;
          return;
        }
        return;
      }
      
      const parsed = JSON.parse(existingAddressesParam);
      if (!Array.isArray(parsed)) {
        return;
      }

      const currentAddress = parsed.find((addr: any) => addr.id === editAddressId);
      if (currentAddress) {
        // Load address data including additional lines
        setAddressName(currentAddress.name || '');
        setAddressLine1(currentAddress.addressLine1 || '');
        setAddressLine2(currentAddress.addressLine2 || '');
        setCity(currentAddress.city || '');
        setPincode(currentAddress.pincode || '');
        
        // Load additional lines: doorNumber is first, then additionalLines array
        const loadedAdditionalLines: string[] = [];
        if (currentAddress.doorNumber) {
          loadedAdditionalLines.push(currentAddress.doorNumber);
        }
        if (currentAddress.additionalLines && Array.isArray(currentAddress.additionalLines)) {
          loadedAdditionalLines.push(...currentAddress.additionalLines);
        }
        setAdditionalLines(loadedAdditionalLines);
        
        // Load state
        if (currentAddress.stateCode) {
          const matchingState = indianStates.find(state => state.code === currentAddress.stateCode);
          if (matchingState) {
            setSelectedState(matchingState);
          }
        }
        
        // Load contact info for primary addresses
        if ((addressType || 'primary') === 'primary') {
          if (currentAddress.manager) {
            setContactPersonName(currentAddress.manager);
          }
          if (currentAddress.phone) {
            const sanitizedPhone = String(currentAddress.phone).replace(/\D/g, '').slice(0, 10);
            setContactPhone(sanitizedPhone);
          }
        }
        
        editAddressLoadedRef.current = true;
      }
    } catch (error) {
      console.log('⚠️ Error parsing existing addresses:', error);
    }
  }, []); // Empty dependency array - only run once on mount

  // Track which input is currently focused
  const [focusedInputKey, setFocusedInputKey] = useState<string | null>(null);

  // Continuous checking to keep focused input above keyboard while typing
  // Reduced frequency to prevent cursor jumping
  useEffect(() => {
    if (Platform.OS === 'web' || !focusedInputKey || keyboardHeight === 0) return;

    // Check every 500ms (increased from 300ms) while input is focused and keyboard is visible
    // This reduces interference with cursor position
    const interval = setInterval(() => {
      checkAndScrollToFocusedInput();
    }, 500);

    return () => clearInterval(interval);
  }, [focusedInputKey, keyboardHeight]);

  // Track keyboard height
  useEffect(() => {
    if (Platform.OS === 'web') return;

    const keyboardWillShowListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow',
      (e) => {
        keyboardHeightRef.current = e.endCoordinates.height;
        setKeyboardHeight(e.endCoordinates.height);
        
        // Scroll focused input above keyboard when keyboard appears
        setTimeout(() => {
          checkAndScrollToFocusedInput();
        }, Platform.OS === 'ios' ? 250 : 150);
      }
    );

    const keyboardWillHideListener = Keyboard.addListener(
      Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide',
      () => {
        keyboardHeightRef.current = 0;
        setKeyboardHeight(0);
      }
    );

    return () => {
      keyboardWillShowListener.remove();
      keyboardWillHideListener.remove();
    };
  }, []);

  // Store input container position on layout
  const handleInputLayout = (key: string, event: any) => {
    if (Platform.OS === 'web') return;
    const { y } = event.nativeEvent.layout;
    inputPositionsRef.current[key] = y;
  };

  // Handle input focus - track which input is focused and start continuous checking
  const handleInputFocus = (key: string) => {
    setFocusedInputKey(key);
    // Start continuous checking to keep input above keyboard
    if (Platform.OS !== 'web') {
      // Check immediately
      setTimeout(() => checkAndScrollToFocusedInput(), 100);
    }
  };

  // Handle input blur - stop tracking
  const handleInputBlur = () => {
    setFocusedInputKey(null);
  };

  // Check if focused input is hidden and scroll it into view
  const checkAndScrollToFocusedInput = () => {
    if (Platform.OS === 'web' || !scrollViewRef.current || keyboardHeightRef.current === 0) return;

    const currentFocusedKey = focusedInputKey || Object.keys(inputRefs.current).find(key => {
      const input = inputRefs.current[key];
      return input && input.isFocused();
    });

    if (currentFocusedKey) {
      const container = inputContainerRefs.current[currentFocusedKey];
      if (container && scrollViewRef.current) {
        container.measureInWindow((windowX: number, windowY: number, width: number, height: number) => {
          const screenHeight = Dimensions.get('window').height;
          const keyboardHeight = keyboardHeightRef.current;
          const visibleAreaBottom = screenHeight - keyboardHeight;
          
          const inputTop = windowY;
          const inputBottom = windowY + height;
          
          // Check if input is hidden behind keyboard
          if (inputBottom > visibleAreaBottom && scrollViewRef.current) {
            // Input is hidden - calculate scroll needed to bring it above keyboard
            const padding = 20; // Minimal padding above input
            const hiddenAmount = inputBottom - visibleAreaBottom;
            
            // Calculate scroll offset: we need to scroll enough to bring input above keyboard
            // Use the stored input position to calculate relative scroll
            const inputY = inputPositionsRef.current[currentFocusedKey];
            
            if (inputY !== undefined) {
              // Scroll by the hidden amount plus padding to position input correctly
              scrollViewRef.current.scrollTo({
                y: hiddenAmount + padding,
                animated: true,
              });
            } else {
              // Fallback: scroll by hidden amount + padding
              scrollViewRef.current.scrollTo({
                y: hiddenAmount + padding,
                animated: true,
              });
            }
          }
        });
      }
    }
  };

  const filteredStates = indianStates.filter(state =>
    state.name.toLowerCase().includes(stateSearch.toLowerCase()) ||
    state.code.includes(stateSearch)
  );

  const handleStateSelect = (state: { name: string; code: string }) => {
    setSelectedState(state);
    setStateSearch('');
    setShowStates(false);
  };

  const handleStateModalOpen = () => {
    setShowStates(true);
    setTimeout(() => {
      searchInputRef.current?.focus();
    }, 300);
  };

  const addAddressLine = () => {
    if (additionalLines.length < 3) {
      setAdditionalLines([...additionalLines, '']);
    }
  };

  const handleAddressSelect = (addressData: any) => {
    console.log('🔍 Selected address from search:', addressData);
    
    // addressData is already the extracted components from GooglePlacesSearch
    const components = addressData;
    console.log('📍 Extracted components:', components);
    
    // Address Line 1: Premise/Building name + Road name
    // Address Line 2: Locality/Area name
    
    let addressLine1Parts: string[] = [];
    
    // First, try to get the premise/building name
    // Priority 1: Use the place name from the search suggestion (most accurate)
    if (components.placeName && components.placeName.trim()) {
      addressLine1Parts.push(components.placeName);
      console.log('📍 Using place name from search:', components.placeName);
    } else if (components.premise) {
      addressLine1Parts.push(components.premise);
      console.log('📍 Using premise:', components.premise);
    } else if (components.subpremise) {
      addressLine1Parts.push(components.subpremise);
      console.log('📍 Using subpremise:', components.subpremise);
    } else {
      // If no premise, try to extract from formatted address (first part that's not a code)
      const formattedParts = components.formatted_address?.split(',') || [];
      const firstPart = formattedParts[0]?.trim();
      
      // Check if first part is a plus code (e.g., "VJ99+78R")
      const isPlusCode = /^[A-Z0-9]+\+[A-Z0-9]+$/.test(firstPart || '');
      
      if (firstPart && !isPlusCode) {
        // Check if it looks like a road name (starts with road keywords)
        const isRoadName = /^(road|street|avenue|lane|marg|cross)/i.test(firstPart);
        
        if (!isRoadName) {
          // It's likely a premise name, use it
          addressLine1Parts.push(firstPart);
          console.log('📍 Using first part of formatted address:', firstPart);
        }
      }
    }
    
    // Then add the road/street name
    if (components.route) {
      addressLine1Parts.push(components.route);
    } else if (components.street && !addressLine1Parts.includes(components.street)) {
      addressLine1Parts.push(components.street);
    }
    
    // Set Address Line 1
    if (addressLine1Parts.length > 0) {
      setAddressLine1(addressLine1Parts.join(', '));
      console.log('📍 Set addressLine1:', addressLine1Parts.join(', '));
    } else {
      // Absolute fallback: use first part of formatted address
      const firstPart = components.formatted_address?.split(',')[0]?.trim();
      if (firstPart) {
        setAddressLine1(firstPart);
        console.log('📍 Set addressLine1 (fallback):', firstPart);
      }
    }
    
    // Address Line 2: Locality/Area name
    if (components.sublocality || components.area) {
      const area = components.sublocality || components.area;
      setAddressLine2(area);
      console.log('📍 Set addressLine2 from area/sublocality:', area);
    } else if (components.district) {
      setAddressLine2(components.district);
      console.log('📍 Set addressLine2 from district:', components.district);
    } else if (components.locality) {
      setAddressLine2(components.locality);
      console.log('📍 Set addressLine2 from locality:', components.locality);
    }
    
    // Enhanced city extraction - matching Google Maps API priority
    // Priority: postal_town > administrative_area_level_2 (district) > city (from extractAddressComponents) > locality (last resort)
    // Note: extractAddressComponents now prioritizes postal_town and district, so components.city should be reliable
    let cityValue = '';
    
    // Priority 1: postal_town (most reliable city name from Google Maps API)
    if (components.postal_town) {
      cityValue = components.postal_town;
      console.log('📍 Set city from postal_town (most reliable):', cityValue);
    } 
    // Priority 2: administrative_area_level_2 (district) - reliable for Indian addresses
    else if (components.administrative_area_level_2 || components.district) {
      cityValue = components.administrative_area_level_2 || components.district;
      console.log('📍 Set city from district:', cityValue);
    } 
    // Priority 3: Use city from extractAddressComponents (should already be postal_town or district)
    else if (components.city) {
      cityValue = components.city;
      console.log('📍 Set city from components.city:', cityValue);
    }
    // Priority 4: Use locality only as last resort (often a neighborhood, not the city)
    else if (components.locality) {
      cityValue = components.locality;
      console.log('📍 Set city from locality (last resort - may be inaccurate):', cityValue);
    }
    // Priority 5: Extract from formatted address (same logic as web)
    else if (components.formatted_address) {
      const addressParts = components.formatted_address.split(',').map((p: string) => p.trim());
      // Look for city before state and after street parts
      for (let i = addressParts.length - 2; i >= 1; i--) {
        const part = addressParts[i];
        // Skip if it's a pincode, state, or common address word
        if (/^\d{6}$/.test(part)) continue;
        if (components.state && part.toLowerCase().includes(components.state.toLowerCase())) continue;
        if (components.administrative_area_level_1 && part.toLowerCase().includes(components.administrative_area_level_1.toLowerCase())) continue;
        const commonWords = ['road', 'street', 'avenue', 'lane', 'colony', 'nagar', 'area', 'puram', 'palayam', 'patti', 'circle', 'chowk', 'market', 'plaza', 'mall', 'sector', 'phase', 'block', 'village', 'town'];
        if (commonWords.some(word => part.toLowerCase().includes(word))) continue;
        if (part.length > 2 && part.length < 50) {
          cityValue = part;
          console.log('📍 Set city from formatted address:', cityValue);
          break;
        }
      }
    }
    
    if (cityValue) {
      setCity(cityValue);
      console.log('✅ Final city set:', cityValue);
    } else {
      console.warn('⚠️ No city value found in address components');
    }
    if (components.pincode) {
      setPincode(components.pincode);
      console.log('📍 Set pincode:', components.pincode);
    }
    if (components.state) {
      // Find matching state
      const matchingState = indianStates.find(state => 
        state.name.toLowerCase() === components.state.toLowerCase()
      );
      if (matchingState) {
        setSelectedState(matchingState);
        console.log('📍 Set state:', matchingState.name);
      }
    }
    
    // Hide search bar after selection
    setShowSearchBar(false);
    setSearchQuery('');
  };

  const updateAdditionalLine = (index: number, value: string) => {
    const newLines = [...additionalLines];
    newLines[index] = value;
    setAdditionalLines(newLines);
  };

  const removeAdditionalLine = (index: number) => {
    const newLines = additionalLines.filter((_, i) => i !== index);
    setAdditionalLines(newLines);
  };

  const handlePincodeChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 6);
    setPincode(cleaned);
  };

  const handleContactPhoneChange = (text: string) => {
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setContactPhone(cleaned);
  };

  const isFormValid = () => {
    return (
      addressName.trim().length > 0 &&
      addressLine1.trim().length > 0 &&
      city.trim().length > 0 &&
      pincode.trim().length === 6 &&
      /^\d{6}$/.test(pincode) &&
      selectedState !== null
    );
  };

  const handleSubmit = async () => {
    // Prevent double navigation
    if (isNavigating || isLoading) {
      console.log('⚠️ Navigation already in progress, ignoring duplicate click');
      return;
    }

    if (!isFormValid()) {
      Alert.alert('Incomplete Details', 'Please fill in all required fields');
      return;
    }

    // Check for duplicate addresses (only for new addresses, not when editing)
    if (editMode !== 'true') {
      let allAddresses: any[] = [];
      try { allAddresses = JSON.parse(existingAddresses as string || '[]'); } catch {}
      const trimmedContactName = contactPersonName.trim();
      const sanitizedContactPhone = contactPhone.replace(/\D/g, '').slice(0, 10);
      const newDoorNumber = additionalLines.length > 0 ? additionalLines[0] : '';
      
      console.log('🔍 Checking for duplicates among', allAddresses.length, 'existing addresses');
      console.log('📍 New address to check:', {
        addressLine1: addressLine1.trim(),
        city: city.trim(),
        pincode: pincode,
        stateName: selectedState?.name,
        doorNumber: newDoorNumber,
        managerName: trimmedContactName,
        managerPhone: sanitizedContactPhone
      });
      
      // Check for same location (addressLine1, city, pincode, state)
      const sameLocationAddress = allAddresses.find(addr => {
        return addr.addressLine1.toLowerCase() === addressLine1.trim().toLowerCase() &&
               addr.city.toLowerCase() === city.trim().toLowerCase() &&
               addr.pincode === pincode &&
               addr.stateName.toLowerCase() === (selectedState?.name || '').toLowerCase();
      });

      if (sameLocationAddress) {
        // Check if door number, manager name, and manager phone are also the same (exact duplicate)
        const existingDoorNumber = sameLocationAddress.doorNumber || '';
        const existingManager = sameLocationAddress.manager || '';
        const existingPhone = sameLocationAddress.phone || '';
        
        const isExactDuplicate = existingDoorNumber.toLowerCase() === newDoorNumber.toLowerCase() &&
                                 existingManager.toLowerCase() === trimmedContactName.toLowerCase() &&
                                 existingPhone === sanitizedContactPhone;
        
        console.log('⚠️ Found same location address:', {
          existingId: sameLocationAddress.id,
          existingName: sameLocationAddress.name,
          existingType: sameLocationAddress.type,
          existingDoorNumber,
          existingManager,
          existingPhone,
          newDoorNumber,
          newManager: trimmedContactName,
          newPhone: sanitizedContactPhone,
          isExactDuplicate
        });

        if (isExactDuplicate) {
          console.log('❌ Exact duplicate detected - showing modal');
          setDuplicateAddressInfo(sameLocationAddress);
          setShowDuplicateModal(true);
          return;
        } else {
          // Same location but different door number/manager - show modal with "Use Same Address" option
          console.log('⚠️ Same location but different door/manager - showing modal with use option');
          setDuplicateAddressInfo(sameLocationAddress);
          setShowDuplicateModal(true);
          return;
        }
      }
      
      console.log('✅ No duplicate found - proceeding with address creation');
    }

    setIsLoading(true);
    const trimmedContactName = contactPersonName.trim();
    const sanitizedContactPhone = contactPhone.replace(/\D/g, '').slice(0, 10);
    const fallbackName = (name as string) || '';
    const fallbackPhone = ((mobile as string) || '').replace(/\D/g, '').slice(0, 10);
    
    // Parse existing addresses properly
    let existingAddressList = [];
    try {
      const existingAddressesParam = existingAddresses as string;
      if (existingAddressesParam && existingAddressesParam !== '[]') {
        existingAddressList = JSON.parse(existingAddressesParam);
      }
      console.log('📋 Existing addresses loaded:', existingAddressList);
    } catch (error) {
      console.log('No existing addresses or parse error:', error);
      existingAddressList = [];
    }
    
    try {
      const addressTypeValue = (Array.isArray(addressType) ? addressType[0] : addressType) || 'primary';
      
      // Prepare address JSON for backend
      // Include all additional lines (not just the first one as doorNumber)
      const addressJson = {
        doorNumber: additionalLines.length > 0 ? additionalLines[0] : '',
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        additionalLines: additionalLines.length > 1 ? additionalLines.slice(1) : [], // All lines after the first
        city: city.trim(),
        pincode: pincode,
        stateName: selectedState?.name || '',
        stateCode: selectedState?.code || '',
      };

      // Use latitude and longitude from state; auto-geocode if missing
      let addressLatitude = latitude;
      let addressLongitude = longitude;

      if (!addressLatitude || !addressLongitude) {
        try {
          const { geocodeAddress } = await import('@/services/googleMapsApi');
          const fullAddr = [addressLine1.trim(), addressLine2.trim(), city.trim(), selectedState?.name, pincode].filter(Boolean).join(', ');
          const results = await geocodeAddress(fullAddr);
          if (results.length > 0 && results[0].geometry?.location) {
            addressLatitude = results[0].geometry.location.lat;
            addressLongitude = results[0].geometry.location.lng;
          }
        } catch (geocodeErr) {
          console.warn('Auto-geocode failed:', geocodeErr);
        }
      }

      let backendAddress: any = null;
      
      if (editMode === 'true' && editAddressId) {
        // ✅ Use optimistic update: Update DataStore immediately, sync backend in background
        const existingAddress = existingAddressList.find((addr: any) => addr.id === editAddressId);
        if (existingAddress) {
          const { optimisticUpdateAddress } = await import('@/utils/optimisticSync');
          const { clearBusinessDataCache } = await import('@/hooks/useBusinessData');
          
          // Prepare address updates with all fields including additionalLines
          const addressUpdates: Partial<BusinessAddress> = {
            name: addressName.trim(),
            doorNumber: additionalLines.length > 0 ? additionalLines[0] : '',
            addressLine1: addressLine1.trim(),
            addressLine2: addressLine2.trim(),
            additionalLines: additionalLines.length > 1 ? additionalLines.slice(1) : [],
            city: city.trim(),
            pincode: pincode,
            stateName: selectedState?.name || '',
            stateCode: selectedState?.code || '',
            manager: trimmedContactName || existingAddress.manager || (addressTypeValue === 'primary' ? fallbackName : undefined),
            phone: sanitizedContactPhone || existingAddress.phone || (addressTypeValue === 'primary' ? fallbackPhone : undefined),
            isPrimary: addressTypeValue === 'primary',
            updatedAt: new Date().toISOString(),
          };
          
          // Optimistically update (DataStore updated immediately, backend sync in background)
          const editId = Array.isArray(editAddressId) ? editAddressId[0] : (editAddressId as string);
          optimisticUpdateAddress(editId, addressUpdates, { showError: false });
          
          // Clear cache to ensure fresh data is loaded when navigating back
          clearBusinessDataCache();
        }
      } else {
        // Create new address in backend (non-blocking for better performance)
        createAddress({
          name: addressName.trim(),
          addressJson,
          type: addressTypeValue as 'primary' | 'branch' | 'warehouse',
          managerName: addressTypeValue === 'primary'
            ? (trimmedContactName || fallbackName)
            : (addressTypeValue === 'branch' || addressTypeValue === 'warehouse')
            ? (trimmedContactName || undefined)
            : undefined,
          managerMobileNumber: addressTypeValue === 'primary'
            ? ((sanitizedContactPhone || fallbackPhone) || undefined)
            : (addressTypeValue === 'branch' || addressTypeValue === 'warehouse')
            ? (sanitizedContactPhone || undefined)
            : undefined,
          isPrimary: addressTypeValue === 'primary',
          latitude: addressLatitude || undefined,
          longitude: addressLongitude || undefined,
        }).then((createResult) => {
          if (createResult.success && createResult.address) {
            backendAddress = createResult.address;
            console.log('✅ Address created in backend:', backendAddress);
          } else {
            console.warn('⚠️ Backend create failed, continuing with local save:', createResult.error);
          }
        }).catch((error) => {
          console.error('Error creating address in backend:', error);
        });
      }

      // Update local address list
      let allAddresses;
      
      if (editMode === 'true' && editAddressId) {
        // Edit existing address
        allAddresses = existingAddressList.map((addr: any) => 
          addr.id === editAddressId 
            ? {
                ...addr,
                name: addressName.trim(),
                doorNumber: additionalLines.length > 0 ? additionalLines[0] : '',
                addressLine1: addressLine1.trim(),
                addressLine2: addressLine2.trim(),
                additionalLines: additionalLines.length > 1 ? additionalLines.slice(1) : [], // Store all additional lines
                city: city.trim(),
                pincode: pincode,
                stateName: selectedState?.name || '',
                stateCode: getGSTINStateCode(selectedState?.name || ''),
                manager: trimmedContactName || addr.manager || (addr.isPrimary ? fallbackName : undefined),
                phone: sanitizedContactPhone || addr.phone || (addr.isPrimary ? fallbackPhone : undefined),
                backendId: backendAddress?.id || addr.backendId,
              }
            : addr
        );
        console.log('✏️ Edited address in list:', allAddresses);
      } else {
        const newAddress = {
          id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: addressName.trim(),
          type: addressTypeValue as 'primary' | 'branch' | 'warehouse',
          doorNumber: additionalLines.length > 0 ? additionalLines[0] : '',
          addressLine1: addressLine1.trim(),
          addressLine2: addressLine2.trim(),
          additionalLines: additionalLines.length > 1 ? additionalLines.slice(1) : [],
          city: city.trim(),
          pincode: pincode,
          stateName: selectedState?.name || '',
          stateCode: selectedState?.code || '',
          isPrimary: addressTypeValue === 'primary',
          manager: trimmedContactName || (addressTypeValue === 'primary' ? fallbackName : undefined),
          phone: sanitizedContactPhone || (addressTypeValue === 'primary' ? fallbackPhone : undefined),
          status: 'active' as const,
          createdAt: new Date().toISOString(),
          updatedAt: new Date().toISOString(),
          backendId: backendAddress?.id,
        };
        
        console.log('🆕 Creating new address:', newAddress);
        console.log('📝 Adding to existing addresses:', existingAddressList);
        
        // Add new address to existing addresses
        allAddresses = [...existingAddressList, newAddress];
        console.log('📦 Final address list:', allAddresses);
        
        // Address will be synced to Supabase backend via optimistic sync
      }
      
      const navigateParams = {
        type, value, gstinData, name, businessName, businessType, customBusinessType, mobile,
        allAddresses: JSON.stringify(allAddresses),
      };

      // Auto-create staff when a branch/warehouse manager is added during onboarding
      const isBranchOrWarehouse = addressTypeValue === 'branch' || addressTypeValue === 'warehouse';
      if (isBranchOrWarehouse && trimmedContactName && sanitizedContactPhone && sanitizedContactPhone.length === 10) {
        const verificationCode = Math.floor(100000 + Math.random() * 900000).toString();
        try {
          const staffResult = await createStaff({
            name: trimmedContactName,
            mobile: sanitizedContactPhone,
            role: 'Manager',
            department: addressTypeValue === 'branch' ? 'Branch' : 'Warehouse',
            locationName: addressName.trim(),
            locationType: addressTypeValue,
            verificationCode,
          });
          if (staffResult.success) {
            console.log('✅ Staff created during onboarding:', trimmedContactName);
            // Show OTP modal - navigation will happen when user dismisses it
            setStaffOtpName(trimmedContactName);
            setStaffOtpCode(verificationCode);
            setShowStaffOtpModal(true);
            setIsLoading(false);
            // Store navigate params for after modal dismiss
            pendingNavigateRef.current = navigateParams;
            return;
          } else {
            console.warn('⚠️ Staff creation failed, continuing:', staffResult.error);
          }
        } catch (staffErr) {
          console.warn('⚠️ Staff creation error, continuing:', staffErr);
        }
      }

      setSignupData(navigateParams);
      router.replace('/auth/address-confirmation');
      setIsNavigating(false);
      setIsLoading(false);
    } catch (error: any) {
      console.error('Error saving address:', error);
      Alert.alert('Error', error.message || 'Failed to save address. Please try again.');
      setIsNavigating(false);
      setIsLoading(false);
    }
  };

  const handleDismissStaffOtpModal = () => {
    setShowStaffOtpModal(false);
    if (pendingNavigateRef.current) {
      setSignupData(pendingNavigateRef.current);
      router.replace('/auth/address-confirmation');
      pendingNavigateRef.current = null;
    }
    setIsNavigating(false);
  };

  const slideTransform = {
    transform: [
      {
        translateY: slideAnimation.interpolate({
          inputRange: [0, 1],
          outputRange: [100, 0],
        }),
      },
    ],
  };

  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer>
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
        <KeyboardAvoidingView
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
          enabled={Platform.OS !== 'web'}
        >
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.canGoBack() ? router.back() : router.replace('/auth/mobile')}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#3f66ac" />
          </TouchableOpacity>

          <ScrollView 
            ref={scrollViewRef}
            style={styles.scrollView} 
            contentContainerStyle={[
              Platform.OS === 'web' ? webContainerStyles.webScrollContent : {},
              // Add bottom safe area inset + minimal padding to ensure save button can scroll above keyboard
              Platform.OS !== 'web' ? { 
                paddingBottom: keyboardHeight > 0 ? keyboardHeight + 30 : 20 + insets.bottom
              } : {}
            ]} 
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
            keyboardDismissMode="none"
            nestedScrollEnabled={true}
            onScrollEndDrag={checkAndScrollToFocusedInput}
            onMomentumScrollEnd={checkAndScrollToFocusedInput}
            scrollEventThrottle={16}
            onScroll={(e) => {
              // Debounce scroll checking to avoid too many checks
              if (scrollCheckTimeoutRef.current) {
                clearTimeout(scrollCheckTimeoutRef.current);
              }
              scrollCheckTimeoutRef.current = setTimeout(() => {
                checkAndScrollToFocusedInput();
              }, 100);
            }}
          >
            <Animated.View style={[styles.content, slideTransform]}>
              <View style={styles.iconContainer}>
                <View style={styles.iconWrapper}>
                  <MapPin size={48} color="#3f66ac" strokeWidth={2.5} />
                </View>
              </View>

              <View style={styles.textContainer}>
                <Text style={[styles.title, { color: typeInfo.color }]}>{typeInfo.title}</Text>
                <Text style={styles.subtitle}>
                  {typeInfo.subtitle}
                </Text>
                
                {addressType === 'primary' ? (
                  <View style={styles.primaryNotice}>
                    <Text style={styles.primaryNoticeText}>
                      📍 This is your <Text style={styles.primaryBold}>Primary Address</Text>
                    </Text>
                    <Text style={styles.primaryNoticeSubtext}>
                      You can add more locations later
                    </Text>
                  </View>
                ) : addressType === 'branch' ? (
                  <View style={[styles.primaryNotice, { backgroundColor: '#eff6ff', borderColor: '#3f66ac' }]}>
                    <Text style={[styles.primaryNoticeText, { color: '#3f66ac' }]}>
                      🏢 Adding a <Text style={styles.primaryBold}>Branch Office</Text>
                    </Text>
                    <Text style={[styles.primaryNoticeSubtext, { color: '#3f66ac' }]}>
                      Enter the details for this branch location
                    </Text>
                  </View>
                ) : addressType === 'warehouse' ? (
                  <View style={[styles.primaryNotice, { backgroundColor: '#fffbeb', borderColor: '#f59e0b' }]}>
                    <Text style={[styles.primaryNoticeText, { color: '#92400e' }]}>
                      📦 Adding a <Text style={styles.primaryBold}>Warehouse</Text>
                    </Text>
                    <Text style={[styles.primaryNoticeSubtext, { color: '#b45309' }]}>
                      Enter the details for this warehouse location
                    </Text>
                  </View>
                ) : null}
              </View>

              {prefilledFormatted ? (
                <View style={styles.prefilledSection}>
                  <Text style={styles.prefilledLabel}>Selected Address:</Text>
                  <Text style={styles.prefilledText}>{prefilledFormatted}</Text>
                </View>
              ) : null}

              <View style={styles.formContainer}>
                <View style={styles.addressFieldGroup}>
                  <Text style={styles.addressSectionTitle}>Address Details</Text>
                  
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Address Name *</Text>
                  <View 
                    ref={(ref) => {
                      inputContainerRefs.current['addressName'] = ref;
                    }}
                    style={styles.inputContainer}
                    onLayout={(e) => handleInputLayout('addressName', e)}
                  >
                    <CapitalizedTextInput
                      ref={(ref) => {
                        inputRefs.current['addressName'] = ref;
                      }}
                      style={styles.input}
                      value={addressName}
                      onChangeText={setAddressName}
                      placeholder="e.g., Head Office, Main Branch"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                      editable={true}
                      returnKeyType="next"
                      onFocus={() => handleInputFocus('addressName')}
                      onBlur={handleInputBlur}
                    />
                  </View>
                  <Text style={styles.fieldHint}>
                    Give a name to identify this business location
                  </Text>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address Line 1 *</Text>
                  <View 
                    ref={(ref) => {
                      inputContainerRefs.current['addressLine1'] = ref;
                    }}
                    style={styles.inputContainer}
                    onLayout={(e) => handleInputLayout('addressLine1', e)}
                  >
                    <CapitalizedTextInput
                      ref={(ref) => {
                        inputRefs.current['addressLine1'] = ref;
                      }}
                      style={styles.input}
                      value={addressLine1}
                      onChangeText={setAddressLine1}
                      placeholder="Building, Street, Area"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                      editable={true}
                      returnKeyType="next"
                      onFocus={() => handleInputFocus('addressLine1')}
                      onBlur={handleInputBlur}
                    />
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Address Line 2</Text>
                  <View 
                    ref={(ref) => {
                      inputContainerRefs.current['addressLine2'] = ref;
                    }}
                    style={styles.inputContainer}
                    onLayout={(e) => handleInputLayout('addressLine2', e)}
                  >
                    <CapitalizedTextInput
                      ref={(ref) => {
                        inputRefs.current['addressLine2'] = ref;
                      }}
                      style={styles.input}
                      value={addressLine2}
                      onChangeText={setAddressLine2}
                      placeholder="Landmark, Near (optional)"
                      placeholderTextColor="#999999"
                      autoCapitalize="words"
                      editable={true}
                      returnKeyType="next"
                      onFocus={() => handleInputFocus('addressLine2')}
                      onBlur={handleInputBlur}
                    />
                  </View>
                </View>

                {additionalLines.map((line, index) => (
                  <View key={index} style={styles.inputGroup}>
                    <View style={styles.additionalLineHeader}>
                      <Text style={styles.label}>Address Line {index + 3}</Text>
                      <TouchableOpacity
                        style={styles.removeLineButton}
                        onPress={() => removeAdditionalLine(index)}
                        activeOpacity={0.7}
                      >
                        <X size={Platform.select({
                          web: 16,
                          default: 20, // Larger icon on mobile
                        })} color="#ef4444" />
                      </TouchableOpacity>
                    </View>
                    <View 
                      ref={(ref) => {
                        inputContainerRefs.current[`addressLine${index + 3}`] = ref;
                      }}
                      style={styles.inputContainer}
                      onLayout={(e) => handleInputLayout(`addressLine${index + 3}`, e)}
                    >
                      <CapitalizedTextInput
                        ref={(ref) => {
                          inputRefs.current[`addressLine${index + 3}`] = ref;
                        }}
                        style={styles.input}
                        value={line}
                        onChangeText={(text) => updateAdditionalLine(index, text)}
                        placeholder="Additional address line"
                        placeholderTextColor="#999999"
                        autoCapitalize="words"
                        editable={true}
                        returnKeyType="next"
                        onFocus={() => handleInputFocus(`addressLine${index + 3}`)}
                        onBlur={handleInputBlur}
                      />
                    </View>
                  </View>
                ))}

                {additionalLines.length < 3 && (
                  <TouchableOpacity 
                    style={styles.addLineButton} 
                    onPress={addAddressLine}
                    activeOpacity={0.7}
                  >
                    <Plus size={Platform.select({
                      web: 16,
                      default: 14, // Smaller icon for cleaner look
                    })} color="#3f66ac" />
                    <Text style={styles.addLineText}>Add Address Line</Text>
                  </TouchableOpacity>
                )}

                <View style={styles.rowContainer}>
                  <View style={[styles.inputGroup, styles.cityInput]}>
                    <Text style={styles.label}>City *</Text>
                    <View 
                      ref={(ref) => {
                        inputContainerRefs.current['city'] = ref;
                      }}
                      style={styles.inputContainer}
                      onLayout={(e) => handleInputLayout('city', e)}
                    >
                      <CapitalizedTextInput
                        ref={(ref) => {
                          inputRefs.current['city'] = ref;
                        }}
                        style={styles.input}
                        value={city}
                        onChangeText={setCity}
                        placeholder="City name"
                        placeholderTextColor="#999999"
                        autoCapitalize="words"
                        editable={true}
                        returnKeyType="next"
                        onFocus={() => handleInputFocus('city')}
                        onBlur={handleInputBlur}
                      />
                    </View>
                  </View>

                  <View style={[styles.inputGroup, styles.pincodeInput]}>
                    <Text style={styles.label}>Pincode *</Text>
                    <View 
                      ref={(ref) => {
                        inputContainerRefs.current['pincode'] = ref;
                      }}
                      style={styles.inputContainer}
                      onLayout={(e) => handleInputLayout('pincode', e)}
                    >
                      <TextInput
                        ref={(ref) => {
                          inputRefs.current['pincode'] = ref;
                        }}
                        style={styles.input}
                        value={pincode}
                        onChangeText={handlePincodeChange}
                        placeholder="000000"
                        placeholderTextColor="#999999"
                        keyboardType="numeric"
                        maxLength={6}
                        editable={true}
                        returnKeyType="done"
                        onFocus={() => handleInputFocus('pincode')}
                        onBlur={handleInputBlur}
                      />
                    </View>
                  </View>
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.label}>State *</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={handleStateModalOpen}
                    activeOpacity={0.7}
                  >
                    <View style={styles.stateSelectContent}>
                      <Text style={[
                        styles.dropdownText,
                        { color: selectedState ? '#1a1a1a' : '#999999' }
                      ]}>
                        {selectedState ? `${selectedState.name} (${selectedState.code})` : 'Select state'}
                      </Text>
                    </View>
                    <ChevronDown 
                      size={20} 
                      color="#666666"
                      style={[
                        styles.dropdownIcon,
                        showStates && styles.dropdownIconRotated
                      ]}
                    />
                  </TouchableOpacity>
                </View>
                </View>

                  <View style={styles.contactFieldGroup}>
                    <Text style={styles.contactSectionTitle}>
                      {addressType === 'branch' ? 'Branch Manager Details' : addressType === 'warehouse' ? 'Warehouse Manager Details' : 'Contact Person Details'}
                    </Text>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>
                        {addressType === 'branch' ? 'Branch Manager Name' : addressType === 'warehouse' ? 'Warehouse Manager Name' : 'Contact Person Name'}
                      </Text>
                      <View 
                        ref={(ref) => {
                          inputContainerRefs.current['contactPersonName'] = ref;
                        }}
                        style={[styles.inputContainer, styles.contactInputContainer]}
                        onLayout={(e) => handleInputLayout('contactPersonName', e)}
                      >
                        <User size={20} color="#ffc754" style={styles.inputIcon} />
                        <CapitalizedTextInput
                          ref={(ref) => {
                            inputRefs.current['contactPersonName'] = ref;
                          }}
                          style={[styles.input, styles.contactInput]}
                          value={contactPersonName}
                          onChangeText={setContactPersonName}
                          placeholder={addressType === 'branch' ? 'Branch manager name' : addressType === 'warehouse' ? 'Warehouse manager name' : 'Person responsible at this location'}
                          placeholderTextColor="#999999"
                          autoCapitalize="words"
                          editable={true}
                          returnKeyType="next"
                          onFocus={() => handleInputFocus('contactPersonName')}
                          onBlur={handleInputBlur}
                        />
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Contact Phone Number</Text>
                      <View 
                        ref={(ref) => {
                          inputContainerRefs.current['contactPhone'] = ref;
                        }}
                        style={[styles.inputContainer, styles.contactInputContainer]}
                        onLayout={(e) => handleInputLayout('contactPhone', e)}
                      >
                        <Phone size={20} color="#ffc754" style={styles.inputIcon} />
                        <TextInput
                          ref={(ref) => {
                            inputRefs.current['contactPhone'] = ref;
                          }}
                          style={[styles.input, styles.contactInput]}
                          value={contactPhone}
                          onChangeText={handleContactPhoneChange}
                          placeholder="10-digit mobile number"
                          placeholderTextColor="#999999"
                          editable={true}
                          keyboardType="phone-pad"
                          maxLength={10}
                          returnKeyType="done"
                          onFocus={() => {
                            handleInputFocus('contactPhone');
                          }}
                          onBlur={handleInputBlur}
                        />
                      </View>
                      <Text style={styles.fieldHint}>
                        We'll reach out on this number for deliveries and support updates.
                      </Text>
                    </View>
                  </View>
              </View>

              <TouchableOpacity
                ref={(ref) => {
                  saveButtonRef.current = ref;
                }}
                style={[
                  styles.submitButton,
                  isFormValid() ? styles.enabledButton : styles.disabledButton,
                ]}
                onPress={handleSubmit}
                disabled={!isFormValid() || isLoading}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.submitButtonText,
                  isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
                ]}>
                  {isLoading ? 'Saving Address...' : 'Save Address'}
                </Text>
              </TouchableOpacity>
            </Animated.View>
          </ScrollView>

          {/* State Selection Modal */}
          <Modal
            visible={showStates}
            transparent={true}
            animationType="fade"
            onRequestClose={() => setShowStates(false)}
            onShow={() => {
              // Focus the search input when modal is shown
              setTimeout(() => {
                stateSearchInputRef.current?.focus();
              }, 100);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select State</Text>
                  <TouchableOpacity
                    style={styles.modalCloseButton}
                    onPress={() => setShowStates(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color="#666666" />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.searchContainer}>
                  <Search size={18} color="#64748b" />
                  <TextInput
                    ref={stateSearchInputRef}
                    style={[
                      styles.searchInput,
                      Platform.select({
                        web: {
                          outlineWidth: 0,
                          outlineColor: 'transparent',
                        },
                      }),
                    ]}
                    value={stateSearch}
                    onChangeText={setStateSearch}
                    placeholder="Search states..."
                    placeholderTextColor="#94a3b8"
                    autoFocus={false}
                  />
                </View>
                
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {filteredStates.map((state) => (
                    <TouchableOpacity
                      key={state.code}
                      style={[
                        styles.modalOption,
                        selectedState?.code === state.code && styles.modalOptionSelected
                      ]}
                      onPress={() => handleStateSelect(state)}
                      activeOpacity={0.7}
                    >
                      <View style={styles.stateInfo}>
                        <Text style={[
                          styles.stateName,
                          selectedState?.code === state.code && styles.stateNameSelected
                        ]}>
                          {state.name}
                        </Text>
                      </View>
                      <View style={[
                        styles.stateCodeBadge,
                        selectedState?.code === state.code && styles.stateCodeBadgeSelected
                      ]}>
                        <Text style={[
                          styles.stateCodeText,
                          selectedState?.code === state.code && styles.stateCodeTextSelected
                        ]}>
                          {state.code}
                        </Text>
                      </View>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Duplicate Address Modal */}
          <Modal
            visible={showDuplicateModal}
            transparent={true}
            animationType="fade"
            onRequestClose={() => {
              setShowDuplicateModal(false);
              setDuplicateAddressInfo(null);
            }}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.duplicateModal}>
                <Text style={styles.duplicateModalTitle}>Address Already Exists</Text>
                {duplicateAddressInfo && (() => {
                  const existingDoorNumber = duplicateAddressInfo.doorNumber || '';
                  const existingManager = duplicateAddressInfo.manager || '';
                  const existingPhone = duplicateAddressInfo.phone || '';
                  const newDoorNumber = additionalLines.length > 0 ? additionalLines[0] : '';
                  const newManager = contactPersonName.trim();
                  const newPhone = contactPhone.replace(/\D/g, '').slice(0, 10);
                  
                  const isExactDuplicate = existingDoorNumber.toLowerCase() === newDoorNumber.toLowerCase() &&
                                           existingManager.toLowerCase() === newManager.toLowerCase() &&
                                           existingPhone === newPhone;
                  
                  return (
                    <>
                      {isExactDuplicate && (
                        <View style={styles.warningBox}>
                          <Text style={styles.warningText}>
                            ⚠️ Having two identical addresses will create confusion in your system. Please choose an option below.
                          </Text>
                        </View>
                      )}
                      {!isExactDuplicate && (
                        <View style={styles.infoBox}>
                          <Text style={styles.infoText}>
                            ℹ️ An address at this location already exists, but with different door number or manager details. You can use the same address if needed.
                          </Text>
                        </View>
                      )}
                      <Text style={styles.duplicateModalText}>
                        Existing address details:
                      </Text>
                      <View style={styles.duplicateAddressInfo}>
                        <Text style={styles.duplicateAddressName}>{duplicateAddressInfo.name}</Text>
                        <Text style={styles.duplicateAddressText}>
                          {[duplicateAddressInfo.doorNumber, duplicateAddressInfo.addressLine1, duplicateAddressInfo.addressLine2, duplicateAddressInfo.city, duplicateAddressInfo.stateName, duplicateAddressInfo.pincode].filter(Boolean).join(', ')}
                        </Text>
                        <Text style={styles.duplicateAddressType}>
                          Type: {duplicateAddressInfo.type === 'primary' ? 'Primary Address' : duplicateAddressInfo.type === 'branch' ? 'Branch Office' : 'Warehouse'}
                        </Text>
                        {existingManager && (
                          <Text style={styles.duplicateManagerInfo}>
                            Manager: {existingManager} {existingPhone ? `(${existingPhone})` : ''}
                          </Text>
                        )}
                      </View>
                    </>
                  );
                })()}

                <View style={styles.duplicateModalActions}>
                  <TouchableOpacity
                    style={styles.duplicateModalSecondaryButton}
                    onPress={() => {
                      setShowDuplicateModal(false);
                      setDuplicateAddressInfo(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.duplicateModalSecondaryButtonText}>Add Different Address</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.duplicateModalTertiaryButton}
                    onPress={() => {
                      setShowDuplicateModal(false);
                      // Navigate to edit the existing address
                      if (duplicateAddressInfo) {
                        setSignupData({
                          editAddressId: duplicateAddressInfo.id,
                          addressType: duplicateAddressInfo.type,
                          type, value, name, businessName, businessType, customBusinessType,
                          existingAddresses,
                          fromSummary: 'false',
                        });
                        router.push('/edit-address-simple');
                      }
                      setDuplicateAddressInfo(null);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.duplicateModalTertiaryButtonText}>Edit Existing Address</Text>
                  </TouchableOpacity>
                  {duplicateAddressInfo && (() => {
                    const existingDoorNumber = duplicateAddressInfo.doorNumber || '';
                    const existingManager = duplicateAddressInfo.manager || '';
                    const existingPhone = duplicateAddressInfo.phone || '';
                    const newDoorNumber = additionalLines.length > 0 ? additionalLines[0] : '';
                    const newManager = contactPersonName.trim();
                    const newPhone = contactPhone.replace(/\D/g, '').slice(0, 10);
                    
                    const isExactDuplicate = existingDoorNumber.toLowerCase() === newDoorNumber.toLowerCase() &&
                                             existingManager.toLowerCase() === newManager.toLowerCase() &&
                                             existingPhone === newPhone;
                    
                    if (!isExactDuplicate) {
                      return (
                        <TouchableOpacity
                          style={styles.duplicateModalPrimaryButton}
                          onPress={async () => {
                            setShowDuplicateModal(false);
                            // Allow saving with same address but different door/manager
                            setIsLoading(true);
                            const trimmedContactName = contactPersonName.trim();
                            const sanitizedContactPhone = contactPhone.replace(/\D/g, '').slice(0, 10);
                            const fallbackName = (name as string) || '';
                            const fallbackPhone = ((mobile as string) || '').replace(/\D/g, '').slice(0, 10);
                            
                            let existingAddressList = [];
                            try {
                              const existingAddressesParam = existingAddresses as string;
                              if (existingAddressesParam && existingAddressesParam !== '[]') {
                                existingAddressList = JSON.parse(existingAddressesParam);
                              }
                            } catch (error) {
                              existingAddressList = [];
                            }
                            
                            const addressTypeValue = (Array.isArray(addressType) ? addressType[0] : addressType) || 'primary';
                            const newAddress = {
                              id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                              name: addressName.trim(),
                              type: addressTypeValue as 'primary' | 'branch' | 'warehouse',
                              doorNumber: additionalLines.length > 0 ? additionalLines[0] : '',
                              addressLine1: addressLine1.trim(),
                              addressLine2: addressLine2.trim(),
                              city: city.trim(),
                              pincode: pincode,
                              stateName: selectedState?.name || '',
                              stateCode: selectedState?.code || '',
                              isPrimary: addressTypeValue === 'primary',
                              manager: addressTypeValue === 'primary'
                                ? (trimmedContactName || fallbackName)
                                : undefined,
                              phone: addressTypeValue === 'primary'
                                ? ((sanitizedContactPhone || fallbackPhone) || undefined)
                                : undefined,
                              status: 'active' as const,
                              createdAt: new Date().toISOString(),
                              updatedAt: new Date().toISOString(),
                            };
                            
                            const allAddresses = [...existingAddressList, newAddress];
                            
                            // Address synced to Supabase backend via optimistic sync
                            
                            setSignupData({
                              type, value, gstinData, name, businessName, businessType,
                              customBusinessType, mobile,
                              allAddresses: JSON.stringify(allAddresses),
                            });
                            router.replace('/auth/address-confirmation');
                            setIsLoading(false);
                            setDuplicateAddressInfo(null);
                          }}
                          activeOpacity={0.7}
                        >
                          <Text style={styles.duplicateModalPrimaryButtonText}>Use Same Address</Text>
                        </TouchableOpacity>
                      );
                    }
                    return null;
                  })()}
                </View>
              </View>
            </View>
          </Modal>

          {/* Staff OTP Modal */}
          <Modal
            visible={showStaffOtpModal}
            transparent
            animationType="fade"
            onRequestClose={handleDismissStaffOtpModal}
          >
            <View style={styles.otpModalOverlay}>
              <View style={styles.otpModalContent}>
                <View style={styles.otpModalIcon}>
                  <Text style={{ fontSize: 40 }}>🔑</Text>
                </View>
                <Text style={styles.otpModalTitle}>Staff Verification Code</Text>
                <Text style={styles.otpModalSubtitle}>
                  Share this code with <Text style={{ fontWeight: '700' }}>{staffOtpName}</Text> for their first login.
                </Text>
                <View style={styles.otpCodeContainer}>
                  <Text style={styles.otpCodeText} selectable>{staffOtpCode}</Text>
                </View>
                <Text style={styles.otpModalHint}>
                  The staff member will enter this code after verifying their mobile number to link their account.
                </Text>
                <TouchableOpacity style={styles.otpModalButton} onPress={handleDismissStaffOtpModal} activeOpacity={0.8}>
                  <Text style={styles.otpModalButtonText}>Done</Text>
                </TouchableOpacity>
              </View>
            </View>
          </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  keyboardView: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  backButton: {
    position: 'absolute',
    top: Platform.select({
      web: 60,
      default: 20, // SafeAreaView handles top safe area, so we start from 20
    }),
    left: 24,
    zIndex: 1,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    borderWidth: 1,
    borderColor: '#e9ecef',
    justifyContent: 'center',
    alignItems: 'center',
  },
  content: {
    paddingHorizontal: Platform.select({
      web: 32,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    paddingTop: Platform.select({
      web: 120,
      default: 0, // SafeAreaView handles top padding, back button is absolutely positioned
    }),
    paddingBottom: Platform.select({
      web: 40,
      ios: 0, // Handled via ScrollView contentContainerStyle with safe area insets
      android: 0, // Handled via ScrollView contentContainerStyle with safe area insets
      default: 0,
    }),
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Platform.select({
      web: 48,
      default: 24,
    }),
  },
  iconWrapper: {
    width: 100,
    height: 100,
    backgroundColor: '#ffc754',
    borderRadius: 50,
    borderWidth: Platform.select({
      web: 6,
      default: 3,
    }),
    borderColor: '#3f66ac',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: Platform.select({
      web: 32,
      default: 20,
    }),
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: Platform.select({
      web: 12,
      default: 8,
    }),
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: Platform.select({
      web: 16,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    marginBottom: Platform.select({
      web: 16,
      default: 12,
    }),
  },
  primaryNotice: {
    backgroundColor: '#e0f2fe',
    borderWidth: 1,
    borderColor: '#0369a1',
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
  },
  primaryNoticeText: {
    fontSize: 16,
    color: '#0369a1',
    textAlign: 'center',
    marginBottom: 4,
  },
  primaryBold: {
    fontWeight: '700',
  },
  primaryNoticeSubtext: {
    fontSize: 14,
    color: '#0284c7',
    textAlign: 'center',
  },
  prefilledSection: {
    backgroundColor: '#f0f9ff',
    borderWidth: 1,
    borderColor: '#0ea5e9',
    borderRadius: 12,
    padding: 16,
    marginBottom: 24,
  },
  prefilledLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#0369a1',
    marginBottom: 8,
  },
  prefilledText: {
    fontSize: 16,
    color: '#1e293b',
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: Platform.select({
      web: 32,
      default: 20,
    }),
  },
  // Address field group styles
  addressFieldGroup: {
    ...Platform.select({
      web: {
        backgroundColor: '#eff6ff',
        borderRadius: 12,
        padding: 16,
        marginBottom: 16,
        borderWidth: 2,
        borderColor: '#3f66ac',
      },
      default: {
        // Mobile: two-toned background for better visual separation
        backgroundColor: '#eff6ff',
        borderRadius: 10,
        padding: 12,
        marginBottom: 20,
        borderWidth: 1.5,
        borderColor: '#3f66ac',
        overflow: 'visible',
      },
    }),
  },
  addressSectionTitle: {
    ...Platform.select({
      web: {
        color: '#3f66ac',
        fontWeight: '800',
        fontSize: 18,
        marginBottom: 16,
        textAlign: 'center',
      },
      default: {
        // Mobile: hide section title
        display: 'none',
      },
    }),
  },
  // Contact field group styles
  contactFieldGroup: {
    ...Platform.select({
      web: {
        backgroundColor: '#fffbeb',
        borderRadius: 12,
        padding: 16,
        marginVertical: 8,
        borderWidth: 2,
        borderColor: '#ffc754',
      },
      default: {
        // Mobile: two-toned background for better visual separation
        backgroundColor: '#fffbeb',
        borderRadius: 10,
        padding: 12,
        marginTop: 20,
        marginBottom: 0,
        borderWidth: 1.5,
        borderColor: '#ffc754',
      },
    }),
  },
  contactSectionTitle: {
    ...Platform.select({
      web: {
        color: '#ffc754',
        fontWeight: '800',
        fontSize: 18,
        marginBottom: 16,
        textAlign: 'center',
      },
      default: {
        // Mobile: hide section title
        display: 'none',
      },
    }),
  },
  contactInputContainer: {
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: {
        borderColor: '#ffc754',
        borderWidth: 2,
      },
      default: {
        // Mobile: use default border color like other inputs
        borderColor: '#E5E7EB',
        borderWidth: 2,
      },
    }),
  },
  contactInput: {
    color: '#000000',
    fontWeight: '500',
  },
  inputIcon: {
    marginRight: Platform.select({
      web: 12,
      default: 10, // Reduced spacing on mobile
    }),
    // Ensure icon is vertically centered
    alignSelf: 'center',
  },
  contactSection: {
    marginTop: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 12,
    backgroundColor: '#f8fafc',
  },
  inputGroup: {
    marginBottom: 20,
  },
  sectionHeading: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 12,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  fieldHint: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: Platform.select({
      web: 2,
      default: 1.5, // Thinner border for more native feel
    }),
    borderColor: '#E5E7EB',
    borderRadius: Platform.select({
      web: 12,
      default: 10, // Slightly smaller radius for more native feel
    }),
    paddingHorizontal: Platform.select({
      web: 16,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    paddingVertical: Platform.select({
      web: 4,
      default: 2, // Reduced padding for more compact feel
    }),
    backgroundColor: '#ffffff',
    ...Platform.select({
      web: {
        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
      },
      default: {
        // Ensure inputs are selectable on mobile
        pointerEvents: 'box-none', // Allow touches to pass through to children
        minHeight: 50, // Consistent height for all input containers on mobile
      },
    }),
  },
  input: {
    flex: 1,
    borderWidth: 0,
    paddingVertical: Platform.select({
      web: 14,
      default: 12, // Reduced padding for more compact feel
    }),
    fontSize: Platform.select({
      web: 16,
      default: 15, // Slightly smaller for more native feel
    }),
    color: '#1a1a1a',
    fontWeight: '500',
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
      },
      default: {
        minHeight: 44, // Standard native input height
      },
    }),
  },
  additionalLineHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  removeLineButton: {
    padding: Platform.select({
      web: 4,
      default: 8, // Larger touch target on mobile
    }),
    ...Platform.select({
      web: {},
      ios: { minWidth: 40, minHeight: 40 },
      android: { minWidth: 40, minHeight: 40 },
    }),
    justifyContent: 'center',
    alignItems: 'center',
  },
  addLineButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Platform.select({
      web: 12,
      default: 8, // Reduced padding for smaller button
    }),
    paddingHorizontal: Platform.select({
      web: 16,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    borderWidth: Platform.select({
      web: 1,
      default: 1.5, // Thinner border for cleaner look
    }),
    borderColor: '#3f66ac', // Blue to match background
    borderRadius: Platform.select({
      web: 8,
      default: 6, // Smaller radius for cleaner look
    }),
    borderStyle: 'dashed',
    backgroundColor: Platform.select({
      web: 'transparent',
      default: 'transparent', // No background for cleaner look
    }),
    marginBottom: Platform.select({
      web: 20,
      default: 12, // Reduced spacing on mobile
    }),
    marginTop: Platform.select({
      web: 0,
      default: 8, // Reduced spacing on mobile
    }),
    marginHorizontal: Platform.select({
      web: 0,
      default: 0, // No horizontal margin
    }),
    ...Platform.select({
      web: {},
      ios: { minHeight: 36 },
      android: { minHeight: 36 },
    }),
    ...Platform.select({
      default: {
        // Ensure button is always visible on mobile
        opacity: 1,
        zIndex: 1,
      },
    }),
  },
  addLineText: {
    color: '#3f66ac',
    fontSize: Platform.select({
      web: 14,
      default: 13, // Slightly smaller for more native feel
    }),
    fontWeight: '500',
    marginLeft: Platform.select({
      web: 8,
      default: 6, // Reduced spacing on mobile
    }),
  },
  rowContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  cityInput: {
    flex: 1,
    marginRight: 10,
  },
  pincodeInput: {
    flex: 0.6,
    marginLeft: 10,
  },
  dropdown: {
    backgroundColor: '#f8f9fa',
    borderWidth: Platform.select({
      web: 2,
      default: 1.5, // Match inputContainer on mobile
    }),
    borderColor: '#e9ecef',
    borderRadius: Platform.select({
      web: 12,
      default: 10, // Match inputContainer on mobile
    }),
    paddingHorizontal: Platform.select({
      web: 20,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    paddingVertical: Platform.select({
      web: 18,
      default: 0, // Remove padding to let content handle spacing
    }),
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    ...Platform.select({
      default: {
        minHeight: 50, // Match inputContainer total height on mobile
      },
    }),
  },
  stateSelectContent: {
    flex: 1,
    ...Platform.select({
      default: {
        justifyContent: 'center', // Center content vertically on mobile
        paddingVertical: 12, // Match input paddingVertical for consistent alignment
      },
    }),
  },
  dropdownText: {
    fontSize: Platform.select({
      web: 16,
      default: 15, // Match input fontSize on mobile
    }),
    fontWeight: '500',
    ...Platform.select({
      web: {
        flex: 1,
      },
      default: {
        textAlignVertical: 'center', // Center text vertically on mobile (Android)
        includeFontPadding: false, // Remove extra font padding on Android for better alignment
      },
    }),
  },
  stateCodeText: {
    fontSize: 12,
    color: '#666666',
    marginTop: 2,
  },
  dropdownIcon: {
    marginLeft: 8,
  },
  dropdownIconRotated: {
    transform: [{ rotate: '180deg' }],
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 18,
    alignItems: 'center',
    marginTop: 16,
  },
  enabledButton: {
    backgroundColor: '#ffc754',
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  enabledButtonText: {
    color: '#ffffff',
  },
  disabledButtonText: {
    color: '#6b7280',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    width: '100%',
    maxWidth: 400,
    maxHeight: '80%',
    ...getPlatformShadow(4, '#000', 0.15),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    maxHeight: 350,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalOptionSelected: {
    backgroundColor: '#f0f7ff',
  },
  stateInfo: {
    flex: 1,
  },
  stateName: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  stateNameSelected: {
    color: '#3f66ac',
    fontWeight: '600',
  },
  stateCodeBadge: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    minWidth: 36,
    alignItems: 'center',
  },
  stateCodeBadgeSelected: {
    backgroundColor: '#3f66ac',
  },
  stateCodeTextSelected: {
    color: '#ffffff',
  },
  // Search bar styles
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#ffffff',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#334155',
    paddingVertical: 8,
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
      },
    }),
  },
  searchButton: {
    borderRadius: 12,
    overflow: 'hidden',
  },
  searchButtonInner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  searchButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#3f66ac',
  },
  searchBarContainer: {
    position: 'relative',
    marginBottom: 20,
  },
  closeSearchButton: {
    position: 'absolute',
    right: 12,
    top: 12,
    zIndex: 10,
    backgroundColor: '#f1f5f9',
    borderRadius: 20,
    padding: 8,
  },
  duplicateModal: {
    backgroundColor: '#ffffff',
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
  },
  duplicateModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 12,
  },
  duplicateModalText: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  duplicateAddressInfo: {
    backgroundColor: '#f8fafc',
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  duplicateAddressName: {
    fontSize: 16,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  duplicateAddressText: {
    fontSize: 14,
    color: '#64748b',
    lineHeight: 20,
    marginBottom: 8,
  },
  duplicateAddressType: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3f66ac',
    marginTop: 4,
  },
  duplicateModalActions: {
    flexDirection: 'column',
    gap: 12,
  },
  duplicateModalPrimaryButton: {
    backgroundColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  duplicateModalPrimaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  duplicateModalSecondaryButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  duplicateModalSecondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  duplicateModalTertiaryButton: {
    backgroundColor: '#f1f5f9',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e2e8f0',
  },
  duplicateModalTertiaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#64748b',
  },
  warningBox: {
    backgroundColor: '#fef3c7',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#fbbf24',
  },
  warningText: {
    fontSize: 14,
    color: '#92400e',
    lineHeight: 20,
    textAlign: 'center',
  },
  infoBox: {
    backgroundColor: '#eff6ff',
    borderRadius: 12,
    padding: 12,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3b82f6',
  },
  infoText: {
    fontSize: 14,
    color: '#1e40af',
    lineHeight: 20,
    textAlign: 'center',
  },
  duplicateManagerInfo: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 4,
    fontStyle: 'italic',
  },
  otpModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 24,
  },
  otpModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 28,
    width: '100%',
    maxWidth: 360,
    alignItems: 'center',
  },
  otpModalIcon: {
    marginBottom: 12,
  },
  otpModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1e293b',
    marginBottom: 8,
  },
  otpModalSubtitle: {
    fontSize: 14,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 20,
  },
  otpCodeContainer: {
    backgroundColor: '#f0f9ff',
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderWidth: 1.5,
    borderColor: '#3F66AC',
    borderStyle: 'dashed',
    marginBottom: 16,
  },
  otpCodeText: {
    fontSize: 32,
    fontWeight: '800',
    color: '#3F66AC',
    letterSpacing: 8,
    textAlign: 'center',
  },
  otpModalHint: {
    fontSize: 12,
    color: '#94a3b8',
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 18,
  },
  otpModalButton: {
    backgroundColor: '#3F66AC',
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 48,
    width: '100%',
    alignItems: 'center',
  },
  otpModalButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
});