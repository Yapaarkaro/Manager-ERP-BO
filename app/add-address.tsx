import React, { useState, useEffect } from 'react';
import { router, useLocalSearchParams } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  ScrollView,
  Modal,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft,
  MapPin,
  Search,
  Check,
  Edit3,
  ChevronDown,
  X,
} from 'lucide-react-native';
import AddressAutocomplete from '../components/AddressAutocomplete';
import { dataStore, BusinessAddress, getStateCode } from '@/utils/dataStore';

const Colors = {
  primary: '#007AFF',
  secondary: '#5856D6',
  success: '#34C759',
  warning: '#FF9500',
  error: '#FF3B30',
  background: '#F2F2F7',
  card: '#FFFFFF',
  text: '#000000',
  textSecondary: '#8E8E93',
  border: '#C6C6C8',
  grey: {
    50: '#F9F9F9',
    100: '#F2F2F7',
    200: '#E5E5EA',
    300: '#D1D1D6',
    400: '#C7C7CC',
    500: '#AEAEB2',
    600: '#8E8E93',
    700: '#636366',
    800: '#48484A',
    900: '#1C1C1E',
  },
};

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

export default function AddAddress() {
  const params = useLocalSearchParams();
  const isEditMode = params.address ? true : false;
  const existingAddress = params.address ? JSON.parse(params.address as string) : null;
  const addressType = (params.type as 'branch' | 'warehouse') || 'branch';

  const [addressName, setAddressName] = useState('');
  const [doorNumber, setDoorNumber] = useState(''); // Door number/building name
  const [addressLine1, setAddressLine1] = useState(''); // Address line 1
  const [addressLine2, setAddressLine2] = useState(''); // Address line 2
  const [city, setCity] = useState('');
  const [pincode, setPincode] = useState('');
  const [selectedState, setSelectedState] = useState<{ name: string; code: string } | null>(null);
  const [showStateModal, setShowStateModal] = useState(false);
  const [stateSearchQuery, setStateSearchQuery] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isInitialized, setIsInitialized] = useState(false);
  const [manager, setManager] = useState('');
  const [phone, setPhone] = useState('');
  const [primaryAddress, setPrimaryAddress] = useState(false);


  // Initialize form values only once when editing
  useEffect(() => {
    if (isEditMode && existingAddress && !isInitialized) {
      console.log('Initializing form with existing address:', existingAddress);
      
      setAddressName(existingAddress.name || '');
      // Handle both data structures - from dataStore and from settings mapping
      const doorNum = existingAddress.doorNumber || existingAddress.addressLine1 || '';
      const line1 = existingAddress.addressLine1 || existingAddress.street || '';
      const line2 = existingAddress.addressLine2 || '';
      
      setDoorNumber(doorNum);
      setAddressLine1(line1);
      setAddressLine2(line2);
      setCity(existingAddress.city || '');
      setPincode(existingAddress.pincode || '');
      setManager(existingAddress.manager || '');
      setPhone(existingAddress.phone || '');
      setPrimaryAddress(existingAddress.isPrimary || false);
      
      console.log('Setting form values:', {
        name: existingAddress.name,
        doorNumber: doorNum,
        addressLine1: line1,
        addressLine2: line2,
        city: existingAddress.city,
        pincode: existingAddress.pincode,
        manager: existingAddress.manager,
        phone: existingAddress.phone,
        isPrimary: existingAddress.isPrimary
      });
      
      // Note: Address type is now determined by navigation params, not local state
      console.log('Address type from params:', addressType);
      
      // Find and set the state
      if (existingAddress.stateName) {
        console.log('Looking for state:', existingAddress.stateName);
        const state = indianStates.find(s => s.name === existingAddress.stateName);
        if (state) {
          console.log('Found state:', state);
          setSelectedState(state);
        } else {
          console.log('State not found in indianStates list');
        }
      }
      
      // Initialize search query with existing address for display purposes
      // Use the street address (addressLine2 or street)
      const searchStreetAddress = existingAddress.addressLine2 || existingAddress.street || '';
      if (searchStreetAddress) {
        setSearchQuery(searchStreetAddress);
      }
      
      // Mark as initialized to prevent re-running
      setIsInitialized(true);
    }
  }, [isEditMode, existingAddress, isInitialized]);

  // Reset initialization flag when switching between add/edit modes
  useEffect(() => {
    if (!isEditMode) {
      setIsInitialized(false);
    }
  }, [isEditMode]);

  // Debug: Monitor form state changes (only when parsing is complete)
  useEffect(() => {
    if (searchQuery && (doorNumber || addressLine1 || addressLine2 || city || pincode || selectedState)) {
      console.log('=== FORM STATE UPDATED ===');
      console.log('Form values after parsing:', {
        doorNumber,
        addressLine1,
        addressLine2,
        city,
        pincode,
        selectedState: selectedState?.name
      });
    }
  }, [doorNumber, addressLine1, addressLine2, city, pincode, selectedState, searchQuery]);





  const filteredStates = indianStates.filter(state =>
    state.name.toLowerCase().includes(stateSearchQuery.toLowerCase())
  );

  const handleConfirmAddress = () => {
    console.log('Form values:', {
      addressName: addressName.trim(),
      doorNumber: doorNumber.trim(),
      addressLine1: addressLine1.trim(),
      addressLine2: addressLine2.trim(),
      city: city.trim(),
      pincode: pincode.trim(),
      selectedState: selectedState?.name,
      manager: manager.trim(),
      phone: phone.trim(),
      isPrimary: primaryAddress
    });
    
    if (!addressName.trim() || !addressLine1.trim() || !city.trim() || !pincode.trim() || !selectedState) {
      Alert.alert('Missing Information', 'Please fill in all required fields including state selection.');
      return;
    }
    
    // Check for duplicate addresses
    const allAddresses = dataStore.getAddresses();
    const isDuplicate = allAddresses.some(addr => {
      return addr.addressLine1.toLowerCase() === addressLine1.trim().toLowerCase() &&
             addr.city.toLowerCase() === city.trim().toLowerCase() &&
             addr.pincode === pincode &&
             addr.stateName.toLowerCase() === selectedState.name.toLowerCase() &&
             addr.type === addressType &&
             (!isEditMode || addr.id !== existingAddress?.id);
    });

    if (isDuplicate) {
      Alert.alert('Duplicate Address', 'An address with these details already exists. Please use a different location or edit the existing one.');
      return;
    }

    if (isEditMode && existingAddress) {
      // Update existing address
      dataStore.updateAddress(existingAddress.id, {
        name: addressName.trim(),
        doorNumber: doorNumber.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        pincode: pincode,
        stateName: selectedState.name,
        stateCode: getStateCode(selectedState.name), // Use the proper state code function
        type: addressType,
        manager: manager.trim(),
        phone: phone.trim(),
        isPrimary: primaryAddress,
        updatedAt: new Date().toISOString(),
      });
      
      // If setting as primary, update the dataStore
      if (primaryAddress) {
        dataStore.setPrimaryAddress(existingAddress.id);
      }
      
      Alert.alert('Success', 'Address updated successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    } else {
      // Add new address
      const newAddress: BusinessAddress = {
        id: `${addressType}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: addressName.trim(),
        type: addressType,
        doorNumber: doorNumber.trim(),
        addressLine1: addressLine1.trim(),
        addressLine2: addressLine2.trim(),
        city: city.trim(),
        pincode: pincode,
        stateName: selectedState.name,
        stateCode: selectedState.code,
        manager: manager.trim(),
        phone: phone.trim(),
        isPrimary: primaryAddress,
        status: 'active',
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      
      dataStore.addAddress(newAddress);
      
      // If setting as primary, update the dataStore
      if (primaryAddress) {
        dataStore.setPrimaryAddress(newAddress.id);
      }
      
      Alert.alert('Success', 'Address added successfully!', [
        { text: 'OK', onPress: () => router.back() }
      ]);
    }
  };

  const handleAddressSelect = (address: any) => {
    console.log('=== ADDRESS SELECTED ===');
    console.log('Selected address:', address.formatted_address);
    
    // Clear the search query first
    setSearchQuery('');
    
    // Parse the address into logical components
    parseAddressIntoComponents(address.formatted_address);
  };

  // Function to parse address into logical components
  // This function breaks down a full address string into its components:
  // 1. Door Number - First numeric part that's not pincode
  // 2. Address Line 1 - First part of street address
  // 3. Address Line 2 - Second part of street address (if available)
  // 4. City - Found by looking for non-street words before state
  // 5. State - Found by looking for state names from the end
  // 6. Pincode - 6-digit number found anywhere in the address
  const parseAddressIntoComponents = (fullAddress: string) => {
    const addressParts = fullAddress.split(', ').map(part => part.trim());
    
    console.log('=== STARTING ADDRESS PARSING ===');
    console.log('Full address:', fullAddress);
    
    // Clear existing values first
    setDoorNumber('');
    setAddressLine1('');
    setAddressLine2('');
    setCity('');
    setPincode('');
    setSelectedState(null);
    
    if (addressParts.length === 0) {
      console.log('No address parts found');
      return;
    }
    
    // First, find and extract pincode to avoid it being mistaken for door number
    let pincode = '';
    const pincodeMatch = fullAddress.match(/\b\d{6}\b/);
    if (pincodeMatch) {
      pincode = pincodeMatch[0];
      console.log('Found pincode:', pincode);
      setPincode(pincode);
    }
    
    // Extract building number/door number (first numeric part that's NOT the pincode)
    let doorNumber = '';
    for (let i = 0; i < addressParts.length; i++) {
      const part = addressParts[i];
      // Check if it's a numeric part but NOT the pincode
      if (/^\d+/.test(part) && part !== pincode) {
        doorNumber = part;
        console.log('Found door number:', part);
        setDoorNumber(part);
        break;
      }
    }
    
    // Find state first (usually at the end)
    let stateFound = false;
    let stateName = '';
    for (let i = addressParts.length - 1; i >= 0; i--) {
      const part = addressParts[i];
      if (part === pincode) continue;
      
      const isState = indianStates.some(state => 
        state.name.toLowerCase() === part.toLowerCase() ||
        part.toLowerCase().includes(state.name.toLowerCase())
      );
      
      if (isState && !stateFound) {
        stateFound = true;
        stateName = part;
        const foundState = indianStates.find(state => 
          state.name.toLowerCase() === part.toLowerCase() ||
          part.toLowerCase().includes(state.name.toLowerCase())
        );
        console.log('Found state:', part);
        setSelectedState(foundState || null);
        break;
      }
    }
    
    // Find city (usually before state)
    let cityFound = false;
    let cityName = '';
    for (let i = addressParts.length - 2; i >= 0; i--) {
      const part = addressParts[i];
      if (part === pincode || part === stateName || part === doorNumber) continue;
      
      // Check if this might be the city (not a state, not a pincode, not a common street word)
      const commonStreetWords = ['road', 'street', 'avenue', 'lane', 'colony', 'nagar', 'area', 'puram', 'palayam', 'patti', 'circle', 'chowk', 'market', 'plaza', 'mall', 'sector', 'phase', 'block'];
      const isStreetWord = commonStreetWords.some(word => part.toLowerCase().includes(word));
      
      if (!isStreetWord && part.length > 2) {
        cityName = part;
        console.log('Found city:', part);
        setCity(part);
        cityFound = true;
        break;
      }
    }
    
    // Now collect all remaining parts as street address and split into two lines
    let streetParts = [];
    for (let i = 0; i < addressParts.length; i++) {
      const part = addressParts[i];
      
      // Skip door number, pincode, state, and city
      if (part === doorNumber || part === pincode || part === stateName || part === cityName) {
        continue;
      }
      
      streetParts.push(part);
    }
    
    // Split street parts into two lines
    if (streetParts.length > 0) {
      if (streetParts.length === 1) {
        // Only one street part, put it in Address Line 1
        setAddressLine1(streetParts[0]);
        setAddressLine2('');
      } else if (streetParts.length === 2) {
        // Two street parts, put first in Line 1, second in Line 2
        setAddressLine1(streetParts[0]);
        setAddressLine2(streetParts[1]);
      } else {
        // More than two parts, split them evenly
        const midPoint = Math.ceil(streetParts.length / 2);
        const line1Parts = streetParts.slice(0, midPoint);
        const line2Parts = streetParts.slice(midPoint);
        
        setAddressLine1(line1Parts.join(', '));
        setAddressLine2(line2Parts.join(', '));
      }
    }
    
    console.log('=== PARSING COMPLETE ===');
    console.log('Values set:', { doorNumber, cityName, stateName, pincode });
  };

  return (
    <SafeAreaView style={styles.container}>
        <KeyboardAvoidingView 
          style={styles.keyboardView}
          behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        >
      <View style={styles.header}>
                    <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
          <Text style={styles.headerTitle}>
            {isEditMode ? 'Edit Address' : `Add ${addressType === 'branch' ? 'Branch' : 'Warehouse'} Address`}
          </Text>
          <View style={styles.placeholder} />
      </View>

                <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
            
            {/* Address Search Section - At the top for better visibility */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Search for Address</Text>
              <Text style={styles.sectionSubtitle}>
                Search for an address to auto-fill the form, or scroll down to fill manually
              </Text>
              
        <AddressAutocomplete
          value={searchQuery}
          onChangeText={setSearchQuery}
          onAddressSelect={handleAddressSelect}
        />
        
        {/* Show parsed address breakdown when available */}
        {searchQuery && (doorNumber || addressLine1 || addressLine2 || city || pincode || selectedState) && (
          <View style={styles.parsedAddressSection}>
            <Text style={styles.parsedAddressTitle}>Parsed Address Components:</Text>
            <View style={styles.parsedAddressCard}>
              <View style={styles.parsedAddressRow}>
                <Text style={styles.parsedAddressLabel}>Door Number:</Text>
                <Text style={styles.parsedAddressValue}>{doorNumber || 'Not specified'}</Text>
              </View>
              <View style={styles.parsedAddressRow}>
                <Text style={styles.parsedAddressLabel}>Address Line 1:</Text>
                <Text style={styles.parsedAddressValue}>{addressLine1 || 'Not specified'}</Text>
              </View>
              <View style={styles.parsedAddressRow}>
                <Text style={styles.parsedAddressLabel}>Address Line 2:</Text>
                <Text style={styles.parsedAddressValue}>{addressLine2 || 'Not specified'}</Text>
              </View>
              <View style={styles.parsedAddressRow}>
                <Text style={styles.parsedAddressLabel}>City:</Text>
                <Text style={styles.parsedAddressValue}>{city || 'Not specified'}</Text>
              </View>
              <View style={styles.parsedAddressRow}>
                <Text style={styles.parsedAddressLabel}>Pincode:</Text>
                <Text style={styles.parsedAddressValue}>{pincode || 'Not specified'}</Text>
              </View>
              <View style={styles.parsedAddressRow}>
                <Text style={styles.parsedAddressLabel}>State:</Text>
                <Text style={styles.parsedAddressValue}>{selectedState?.name || 'Not specified'}</Text>
              </View>
            </View>
            <Text style={styles.parsedAddressHint}>
              Review and edit these components as needed. You can modify any field to make corrections.
            </Text>
            <TouchableOpacity
              style={styles.clearParsedButton}
              onPress={() => {
                setSearchQuery('');
                setDoorNumber('');
                setAddressLine1('');
                setAddressLine2('');
                setCity('');
                setPincode('');
                setSelectedState(null);
                setManager('');
                setPhone('');
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.clearParsedButtonText}>Clear & Enter Manually</Text>
            </TouchableOpacity>
          </View>
        )}
            </View>

            {/* Separator Section */}
            <View style={styles.separatorSection}>
              <View style={styles.separatorLine} />
              <Text style={styles.separatorText}>OR</Text>
              <View style={styles.separatorLine} />
            </View>

            {/* Manual Entry Section */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Fill in Manually</Text>
              <Text style={styles.sectionSubtitle}>
                Enter address details manually or edit the parsed values above
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Location Name *</Text>
                <TextInput
                  style={[styles.input, { borderColor: addressName ? Colors.success : Colors.border }]}
                  value={addressName}
                  onChangeText={(text) => {
                    console.log('Location Name changed:', text);
                    setAddressName(text);
                  }}
                  placeholder={`Enter ${addressType} name`}
                  placeholderTextColor={Colors.textSecondary}
                  editable={true}
        />
      </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Door Number / Building Name</Text>
                <TextInput
                  style={[styles.input, { borderColor: Colors.border }]}
                  value={doorNumber}
                  onChangeText={(text) => {
                    console.log('Door Number changed:', text);
                    setDoorNumber(text);
                  }}
                  placeholder="e.g., Flat 101, Shop No. 5, Building A"
                  placeholderTextColor={Colors.textSecondary}
                  editable={true}
                />
                <Text style={styles.fieldHint}>
                  Enter the specific door number, flat number, or building name
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address Line 1 *</Text>
                <TextInput
                  style={[styles.input, { borderColor: addressLine1 ? Colors.success : Colors.border }]}
                  value={addressLine1}
                  onChangeText={(text) => {
                    console.log('Address Line 1 changed:', text);
                    setAddressLine1(text);
                  }}
                  placeholder="Street name, area, landmark"
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={2}
                  editable={true}
                />
                <Text style={styles.fieldHint}>
                  Enter street name, area, or landmark
          </Text>
        </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Address Line 2</Text>
                <TextInput
                  style={[styles.input, { borderColor: addressLine2 ? Colors.success : Colors.border }]}
                  value={addressLine2}
                  onChangeText={(text) => {
                    console.log('Address Line 2 changed:', text);
                    setAddressLine2(text);
                  }}
                  placeholder="Additional street details, locality"
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={2}
                  editable={true}
                />
                <Text style={styles.fieldHint}>
                  Enter additional street details or locality information
                </Text>
      </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Additional Address Details</Text>
                <TextInput
                  style={[styles.input, { borderColor: Colors.border, minHeight: 60 }]}
                  value={city}
                  onChangeText={(text) => {
                    console.log('City changed:', text);
                    setCity(text);
                  }}
                  placeholder="City, locality, or additional area information"
                  placeholderTextColor={Colors.textSecondary}
                  multiline
                  numberOfLines={2}
                  editable={true}
                />
                <Text style={styles.fieldHint}>
                  Enter city and any additional location details
                </Text>
          </View>
          
              <View style={styles.row}>
                <View style={[styles.inputGroup, { flex: 1, marginRight: 8 }]}>
                  <Text style={styles.label}>Pincode *</Text>
          <TextInput
                    style={[styles.input, { borderColor: pincode ? Colors.success : Colors.border }]}
                    value={pincode}
                    onChangeText={(text) => {
                      console.log('Pincode changed:', text);
                      setPincode(text);
                    }}
                    placeholder="6-digit pincode"
                    placeholderTextColor={Colors.textSecondary}
                    keyboardType="numeric"
                    maxLength={6}
                    editable={true}
          />
        </View>

                <View style={[styles.inputGroup, { flex: 1, marginLeft: 8 }]}>
                  <Text style={styles.label}>State *</Text>
        <TouchableOpacity
                    style={styles.stateSelector}
                    onPress={() => setShowStateModal(true)}
          activeOpacity={0.7}
        >
                    <Text style={[
                      styles.stateSelectorText,
                      selectedState ? styles.stateSelectorText : styles.stateSelectorPlaceholder
                    ]}>
                      {selectedState ? selectedState.name : 'Select State'}
                    </Text>
                    <ChevronDown size={20} color={Colors.textSecondary} />
        </TouchableOpacity>
                </View>
              </View>
            </View>

            {/* Manager and Contact Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Contact Information</Text>
              <Text style={styles.sectionSubtitle}>
                Add manager details and contact information for this location
              </Text>
              
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Manager Name</Text>
                <TextInput
                  style={[styles.input, { borderColor: manager ? Colors.success : Colors.border }]}
                  value={manager}
                  onChangeText={setManager}
                  placeholder="Enter manager's full name"
                  placeholderTextColor={Colors.textSecondary}
                  editable={true}
                />
                <Text style={styles.fieldHint}>
                  Name of the person in charge at this location
                </Text>
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Phone Number</Text>
                <TextInput
                  style={[styles.input, { borderColor: phone ? Colors.success : Colors.border }]}
                  value={phone}
                  onChangeText={setPhone}
                  placeholder="Enter contact phone number"
                  placeholderTextColor={Colors.textSecondary}
                  keyboardType="phone-pad"
                  editable={true}
                />
                <Text style={styles.fieldHint}>
                  Primary contact number for this location
                </Text>
              </View>

              {/* Set as Primary Option */}
              <View style={styles.inputGroup}>
                <TouchableOpacity
                  style={styles.primaryToggle}
                  onPress={() => setPrimaryAddress(!primaryAddress)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.checkbox, { backgroundColor: primaryAddress ? Colors.primary : Colors.grey[200] }]}>
                    {primaryAddress && <Check size={16} color={Colors.card} />}
                  </View>
                  <View style={styles.primaryToggleText}>
                    <Text style={styles.primaryToggleLabel}>Set as Primary Address</Text>
                    <Text style={styles.primaryToggleHint}>
                      This will be your main business location
                    </Text>
                  </View>
                </TouchableOpacity>
              </View>
            </View>

        <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirmAddress}
            activeOpacity={0.8}
          >
            <Text style={styles.confirmButtonText}>
              {isEditMode ? 'Update Address' : `Add ${addressType === 'branch' ? 'Branch' : 'Warehouse'}`}
          </Text>
        </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>

      {/* State Selection Modal */}
      <Modal
        visible={showStateModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowStateModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.stateModal}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select State</Text>
              <TouchableOpacity
                onPress={() => setShowStateModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Search size={20} color={Colors.textSecondary} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search states..."
                value={stateSearchQuery}
                onChangeText={setStateSearchQuery}
                placeholderTextColor={Colors.textSecondary}
              />
            </View>
            
            <ScrollView style={styles.stateList} showsVerticalScrollIndicator={false}>
              {filteredStates.map((state) => (
                <TouchableOpacity
                  key={state.code}
                  style={styles.stateOption}
                  onPress={() => {
                    setSelectedState(state);
                    setShowStateModal(false);
                    setStateSearchQuery('');
                  }}
                >
                  <Text style={styles.stateOptionText}>{state.name}</Text>
                  {selectedState?.code === state.code && (
                    <Check size={20} color={Colors.primary} />
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
      </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  keyboardView: {
    flex: 1,
  },
  header: {
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.card,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginBottom: 12,
  },

  inputGroup: {
    marginBottom: 12,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    marginBottom: 8,
  },
  input: {
    height: 50,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.grey[50],
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    height: 50,
    borderColor: Colors.border,
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.grey[50],
  },
  stateSelectorText: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  stateSelectorPlaceholder: {
    color: Colors.textSecondary,
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 16,
    marginBottom: 16,
  },
  confirmButtonText: {
    color: Colors.card,
    fontSize: 18,
    fontWeight: '700',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  stateModal: {
    backgroundColor: Colors.card,
    borderRadius: 16,
    width: '90%',
    maxHeight: '70%',
    overflow: 'hidden',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
  },
  stateList: {
    maxHeight: 300, // Limit height for scrolling
  },
  stateOption: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.border,
  },
  stateOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  parsedAddressSection: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  parsedAddressTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  parsedAddressCard: {
    backgroundColor: Colors.card,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  parsedAddressRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  parsedAddressLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
    flex: 1,
  },
  parsedAddressValue: {
    fontSize: 14,
    color: Colors.text,
    flex: 2,
    textAlign: 'right',
    fontWeight: '500',
  },
  parsedAddressHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    fontStyle: 'italic',
    textAlign: 'center',
  },
  clearParsedButton: {
    backgroundColor: Colors.error,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignSelf: 'center',
    marginTop: 8,
  },
  clearParsedButtonText: {
    color: Colors.card,
    fontSize: 14,
    fontWeight: '500',
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 4,
    fontStyle: 'italic',
  },

  separatorSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 20,
    paddingHorizontal: 16,
    backgroundColor: Colors.card,
    borderRadius: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    borderWidth: 1,
    borderColor: Colors.grey[100],
    minHeight: 40,
    justifyContent: 'center',
  },
  separatorLine: {
    flex: 1,
    height: 1,
    backgroundColor: Colors.grey[200],
    marginHorizontal: 8,
    borderRadius: 0.5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    borderWidth: 0.5,
    borderColor: Colors.grey[300],
    minHeight: 1,
    alignSelf: 'center',
  },
  separatorText: {
    marginHorizontal: 16,
    fontSize: 14,
    color: Colors.textSecondary,
    fontWeight: '500',
    backgroundColor: Colors.card,
    paddingHorizontal: 8,
    borderRadius: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 1,
    elevation: 1,
    borderWidth: 0.5,
    borderColor: Colors.grey[200],
    minHeight: 24,
    alignSelf: 'center',
  },
  primaryToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.border,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  primaryToggleText: {
    flex: 1,
  },
  primaryToggleLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  primaryToggleHint: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
    fontStyle: 'italic',
  },
});

