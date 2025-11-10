import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import CapitalizedTextInput from '@/components/CapitalizedTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { User, Building2, ChevronDown, Check } from 'lucide-react-native';
import { dataStore, getGSTINStateCode, toTitleCase } from '@/utils/dataStore';

const COLORS = {
  primary: '#3F66AC',
  secondary: '#F5C754',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
  success: '#10B981',
};

const businessTypes = [
  'Manufacturer',
  'C&F',
  'Distributor',
  'Trader',
  'Wholesaler',
  'Retailer',
  'Others',
];

export default function BusinessDetailsScreen() {
  const { 
    type, 
    value, 
    gstinData, 
    panName, 
    panDob, 
    mobile,
    // Incoming data from business summary (when user clicks back)
    name: incomingName,
    businessName: incomingBusinessName,
    businessType: incomingBusinessType,
    customBusinessType: incomingCustomBusinessType,
    // Invoice configuration (for returning users from business summary)
    initialCashBalance,
    invoicePrefix,
    invoicePattern,
    startingInvoiceNumber,
    fiscalYear,
  } = useLocalSearchParams();
  
  // Initialize with incoming data if available (returning from business summary)
  const [name, setName] = useState((incomingName as string) || '');
  const [businessName, setBusinessName] = useState((incomingBusinessName as string) || '');
  const [businessType, setBusinessType] = useState((incomingBusinessType as string) || '');
  const [customBusinessType, setCustomBusinessType] = useState((incomingCustomBusinessType as string) || '');
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const scrollViewRef = useRef<ScrollView>(null);
  const [focusedField, setFocusedField] = useState<string | null>(null);

  const [hasAutoFilled, setHasAutoFilled] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [hasLoadedProgress, setHasLoadedProgress] = useState(false);

  // Check if we have incoming data from navigation (e.g., returning from business summary)
  useEffect(() => {
    if (incomingName || incomingBusinessName || incomingBusinessType) {
      console.log('📥 Loading data from navigation params - RETURNING USER');
      console.log('🚫 BLOCKING all auto-fill from GSTIN/PAN');
      
      // Data already set in useState, just block auto-fill
      setIsInitialized(true);
      setHasAutoFilled(true);
      setHasLoadedProgress(true);
      
      console.log('✅ Loaded from params:', {
        name: incomingName,
        businessName: incomingBusinessName,
        businessType: incomingBusinessType,
      });
    } else {
      // No incoming data, check signup progress
      const loadExistingProgress = async () => {
        if (mobile && !hasLoadedProgress) {
          const existingProgress = await dataStore.getSignupProgressByMobile(mobile as string);
          if (existingProgress && (existingProgress.ownerName || existingProgress.businessName)) {
            console.log('📥 Loading existing signup progress - USER DATA TAKES PRIORITY');
            console.log('🚫 BLOCKING all auto-fill from GSTIN/PAN');
            
            if (existingProgress.ownerName && !name) {
              setName(existingProgress.ownerName);
              console.log('✅ Restored user name:', existingProgress.ownerName);
            }
            if (existingProgress.businessName && !businessName) {
              setBusinessName(existingProgress.businessName);
              console.log('✅ Restored business name:', existingProgress.businessName);
            }
            if (existingProgress.businessType && !businessType) {
              const businessTypesList = [
                'Manufacturer', 'C&F', 'Distributor', 'Trader', 
                'Wholesaler', 'Retailer', 'Others'
              ];
              if (businessTypesList.includes(existingProgress.businessType)) {
                setBusinessType(existingProgress.businessType);
              } else {
                setBusinessType('Others');
                setCustomBusinessType(existingProgress.businessType);
              }
              console.log('✅ Restored business type:', existingProgress.businessType);
            }
            
            // IMPORTANT: Block all auto-fill attempts
            setIsInitialized(true);
            setHasAutoFilled(true);
            setHasLoadedProgress(true);
          } else {
            console.log('📝 No existing progress found, allowing auto-fill from GSTIN/PAN');
            setHasLoadedProgress(true);
          }
        }
      };
      loadExistingProgress();
    }
  }, [mobile, hasLoadedProgress, incomingName, incomingBusinessName, incomingBusinessType]);

  // Auto-fill name for PAN users (only if not already initialized from progress)
  useEffect(() => {
    if (type === 'PAN' && panName && !name && !hasAutoFilled && hasLoadedProgress) {
      setName(toTitleCase(panName as string));
      console.log('📝 Auto-filled name from PAN:', toTitleCase(panName as string));
    }
  }, [type, panName, hasAutoFilled, hasLoadedProgress]);

  // Auto-fill data from GSTIN verification (only once and only if not loaded from progress)
  useEffect(() => {
    if (!isInitialized && type === 'GSTIN' && gstinData && !hasAutoFilled && hasLoadedProgress) {
      setIsInitialized(true);
      console.log('📝 Auto-filling from GSTIN data (no existing user data found)');
      try {
        const parsedData = JSON.parse(gstinData as string);
        if (parsedData) {
          setHasAutoFilled(true);
          
          // Auto-fill business name from trade name or legal name (with title case)
          const businessNameFromGstin = parsedData.tradeNam || parsedData.lgnm || '';
          setBusinessName(toTitleCase(businessNameFromGstin));
          
          // Auto-fill owner name from legal name (with title case)
          const ownerNameFromGstin = parsedData.lgnm || '';
          setName(toTitleCase(ownerNameFromGstin));
          
          // Set business type based on constitution of business
          const constitutionType = parsedData.ctb || '';
          let mappedBusinessType = '';
          
          // Map constitution types to our business types
          switch (constitutionType.toLowerCase()) {
            case 'proprietorship':
              mappedBusinessType = 'Retailer';
              break;
            case 'partnership':
            case 'llp':
              mappedBusinessType = 'Trader';
              break;
            case 'private limited company':
            case 'public limited company':
            case 'company':
              mappedBusinessType = 'Manufacturer';
              break;
            case 'trust':
            case 'society':
            case 'association of persons':
              mappedBusinessType = 'Others';
              setCustomBusinessType(constitutionType);
              break;
            default:
              mappedBusinessType = 'Others';
              setCustomBusinessType(constitutionType);
          }
          
          setBusinessType(mappedBusinessType);
        }
      } catch (error) {
        console.error('Error parsing GSTIN data:', error);
      }
    }
  }, [type, gstinData, isInitialized, hasAutoFilled, hasLoadedProgress]); // Wait for progress load before auto-filling

  const isFormValid = () => {
    return (
      name.trim().length > 0 &&
      businessName.trim().length > 0 &&
      businessType.trim().length > 0 &&
      (businessType !== 'Others' || customBusinessType.trim().length > 0)
    );
  };

  const handleBusinessTypeSelect = (type: string) => {
    setBusinessType(type);
    if (type !== 'Others') {
      setCustomBusinessType('');
    }
    setShowBusinessTypeModal(false);
    // Save progress after selecting business type
    setTimeout(() => saveProgressIfValid(), 100);
  };

  const handleNameFocus = () => {
    setFocusedField('name');
  };

  const handleNameBlur = () => {
    setFocusedField(null);
    saveProgressIfValid();
  };

  const handleBusinessNameFocus = () => {
    setFocusedField('businessName');
  };

  const handleBusinessNameBlur = () => {
    setFocusedField(null);
    saveProgressIfValid();
  };

  const handleCustomBusinessTypeFocus = () => {
    setFocusedField('customBusinessType');
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  };

  const handleCustomBusinessTypeBlur = () => {
    setFocusedField(null);
    saveProgressIfValid();
  };

  // Save signup progress only when form is valid (not on every keystroke)
  // This prevents saving incomplete data like "M L", "M La", etc.
  const saveProgressIfValid = () => {
    if (isFormValid()) {
      dataStore.updateSignupProgress({
        mobile: mobile as string,
        mobileVerified: true,
        taxIdType: type as 'GSTIN' | 'PAN',
        taxIdValue: value as string,
        taxIdVerified: true,
        ownerName: name,
        ownerDob: panDob as string,
        businessName: businessName,
        businessType: businessType !== 'Others' ? businessType : customBusinessType,
        currentStep: 'businessDetails',
      });
      console.log('💾 Saved complete signup progress for', mobile);
    }
  };

  const handleComplete = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Details', 'Please fill in all required fields');
      return;
    }

    setIsCompleting(true);
    
    // Update signup progress before navigation
    dataStore.updateSignupProgress({
      mobile: mobile as string,
      mobileVerified: true,
      taxIdType: type as 'GSTIN' | 'PAN',
      taxIdValue: value as string,
      taxIdVerified: true,
      ownerName: name,
      ownerDob: panDob as string,
      businessName: businessName,
      businessType: businessType !== 'Others' ? businessType : customBusinessType,
      currentStep: 'address',
    });

    // For GSTIN users, auto-create primary address from GSTIN data and skip to address confirmation
    if (type === 'GSTIN' && gstinData) {
      try {
        const parsedGstinData = JSON.parse(gstinData as string);
        
        // Check if a primary address already exists
        const existingAddresses = dataStore.getAddresses();
        const hasPrimaryAddress = existingAddresses.some(addr => addr.isPrimary);
        
        if (!hasPrimaryAddress) {
          // Extract address from GSTIN data
          if (parsedGstinData.pradr && parsedGstinData.pradr.addr) {
            const addr = parsedGstinData.pradr.addr;
            
            // Build address components from GSTIN data
            // addressLine1: Building Name, Floor Number (not door number - that's separate)
            const addressLine1Parts = [addr.bnm, addr.flno].filter(Boolean).join(', ');
            const addressLine2 = addr.st || addr.loc || '';
            const city = addr.city || addr.dst || '';
            const pincode = addr.pncd || '';
            const stateName = addr.stcd || '';
            
            // Create primary address from GSTIN data
            const primaryAddress = {
              id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: businessName.trim() || 'Primary Address',
              type: 'primary' as const,
              doorNumber: addr.bno || '', // Door number goes in its own field
              addressLine1: addressLine1Parts || addr.st || '', // Building name, floor
              addressLine2: addressLine2, // Street, locality
              city: city,
              pincode: pincode,
              stateName: stateName,
              stateCode: getGSTINStateCode(stateName),
              isPrimary: true,
              // Add manager and phone for primary addresses to show user info
              manager: name,
              phone: mobile,
            };
            
            console.log('🏢 Auto-creating primary address from GSTIN data:', primaryAddress);
            
            // Save the primary address to dataStore
            dataStore.addAddress(primaryAddress);
          } else {
            // No address in GSTIN data, fall back to normal flow
            throw new Error('No address in GSTIN data');
          }
        } else {
          console.log('🏢 Primary address already exists, skipping auto-creation from GSTIN data');
        }
        
        // Navigate directly to address confirmation screen
        setTimeout(() => {
          router.push({
            pathname: '/auth/address-confirmation',
            params: {
              type,
              value,
              gstinData,
              name,
              businessName,
              businessType: businessType !== 'Others' ? businessType : customBusinessType,
              customBusinessType: businessType === 'Others' ? customBusinessType : '',
              mobile,
              allAddresses: JSON.stringify(dataStore.getAddresses()),
              // Pass invoice configuration for returning users
              initialCashBalance,
              invoicePrefix,
              invoicePattern,
              startingInvoiceNumber,
              fiscalYear,
            }
          });
          setIsCompleting(false);
        }, 500);
      } catch (error) {
        console.error('Error auto-creating address from GSTIN:', error);
        // Fall back to normal flow if auto-creation fails
        setTimeout(() => {
          router.push({
            pathname: '/auth/business-address',
            params: {
              type,
              value,
              gstinData,
              name,
              businessName,
              businessType: businessType !== 'Others' ? businessType : customBusinessType,
              customBusinessType: businessType === 'Others' ? customBusinessType : '',
              mobile,
            }
          });
          setIsCompleting(false);
        }, 500);
      }
    } else {
      // For PAN users, check if primary address already exists
      const existingAddresses = dataStore.getAddresses();
      const hasPrimaryAddress = existingAddresses.some(addr => addr.isPrimary);
      
      if (hasPrimaryAddress) {
        // Primary address exists, skip to address confirmation
        setTimeout(() => {
          router.push({
            pathname: '/auth/address-confirmation',
            params: {
              type,
              value,
              gstinData,
              name,
              businessName,
              businessType: businessType !== 'Others' ? businessType : customBusinessType,
              customBusinessType: businessType === 'Others' ? customBusinessType : '',
              mobile,
              allAddresses: JSON.stringify(existingAddresses),
            }
          });
          setIsCompleting(false);
        }, 500);
      } else {
        // No primary address exists, continue with normal flow (select address from map/search)
        setTimeout(() => {
          router.push({
            pathname: '/auth/business-address',
            params: {
              type,
              value,
              gstinData,
              name,
              businessName,
              businessType: businessType !== 'Others' ? businessType : customBusinessType,
              customBusinessType: businessType === 'Others' ? customBusinessType : '',
              mobile, // Add mobile parameter for PAN users
            }
          });
          setIsCompleting(false);
        }, 500);
      }
    }
  };

  const renderBusinessTypeModal = () => (
    <Modal
      visible={showBusinessTypeModal}
      transparent
      animationType="fade"
      onRequestClose={() => setShowBusinessTypeModal(false)}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContent}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Select Business Type</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={() => setShowBusinessTypeModal(false)}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>
          
          <ScrollView style={styles.businessTypeList}>
            {businessTypes.map((type) => (
              <TouchableOpacity
                key={type}
                style={[
                  styles.businessTypeItem,
                  businessType === type && styles.selectedBusinessTypeItem,
                ]}
                onPress={() => handleBusinessTypeSelect(type)}
              >
                <Text style={[
                  styles.businessTypeText,
                  businessType === type && styles.selectedBusinessTypeText,
                ]}>
                  {type}
                </Text>
                {businessType === type && (
                  <Check size={20} color={COLORS.primary} />
                )}
              </TouchableOpacity>
            ))}
          </ScrollView>
        </View>
      </View>
    </Modal>
  );

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
      {/* Back button removed - users should not go back from business details to prevent signup abandonment */}

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
        ref={scrollViewRef}
      >
        <View style={styles.contentPadding}>
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Building2 size={32} color={COLORS.primary} />
          </View>
        </View>

        <Text style={styles.title}>Business Details</Text>
        {type === 'GSTIN' && gstinData ? (
          <Text style={styles.subtitle}>
            We've pre-filled your details from GSTIN verification. Please review and update if needed.
          </Text>
        ) : (
          <Text style={styles.subtitle}>
            Tell us about yourself and your business to complete your profile
          </Text>
        )}

        <View style={styles.formContainer}>
          <View style={styles.inputGroup}>
            <Text style={styles.label}>Your Name *</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === 'name' && styles.inputContainerFocused,
              ]}
            >
              <User size={20} color={COLORS.gray} style={styles.inputIcon} />
              <CapitalizedTextInput
                style={styles.input}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.gray}
                value={name}
                onChangeText={setName}
                onFocus={handleNameFocus}
                onBlur={handleNameBlur}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <View
              style={[
                styles.inputContainer,
                focusedField === 'businessName' && styles.inputContainerFocused,
              ]}
            >
              <Building2 size={20} color={COLORS.gray} style={styles.inputIcon} />
              <CapitalizedTextInput
                style={styles.input}
                placeholder="Enter your business name"
                placeholderTextColor={COLORS.gray}
                value={businessName}
                onChangeText={setBusinessName}
                onFocus={handleBusinessNameFocus}
                onBlur={handleBusinessNameBlur}
                autoCapitalize="words"
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {businessType === 'Others' ? 'Specify Business Type *' : 'Business Type *'}
            </Text>
            {businessType === 'Others' ? (
              <View
                style={[
                  styles.inputContainer,
                  styles.customTypeContainer,
                  focusedField === 'customBusinessType' && styles.inputContainerFocused,
                ]}
              >
                <CapitalizedTextInput
                  style={[styles.input, styles.customTypeInput]}
                  placeholder="Enter your specific business type"
                  placeholderTextColor={COLORS.gray}
                  value={customBusinessType}
                  onChangeText={setCustomBusinessType}
                  onFocus={handleCustomBusinessTypeFocus}
                  onBlur={handleCustomBusinessTypeBlur}
                  autoCapitalize="words"
                />
                <TouchableOpacity
                  style={styles.inlineChevronButton}
                  onPress={() => setShowBusinessTypeModal(true)}
                  activeOpacity={0.7}
                >
                  <ChevronDown size={20} color={COLORS.gray} />
                </TouchableOpacity>
              </View>
            ) : (
            <TouchableOpacity
              style={styles.selectButton}
              onPress={() => setShowBusinessTypeModal(true)}
            >
              <Text style={[
                styles.selectButtonText,
                !businessType && styles.selectButtonPlaceholder,
              ]}>
                {businessType || 'Select business type'}
              </Text>
              <ChevronDown size={20} color={COLORS.gray} />
            </TouchableOpacity>
            )}
          </View>

        </View>

        <TouchableOpacity
          style={[
            styles.completeButton,
            isFormValid() ? styles.enabledButton : styles.disabledButton,
          ]}
          onPress={handleComplete}
          disabled={!isFormValid() || isCompleting}
        >
          <Text style={[
            styles.completeButtonText,
            isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
          ]}>
          {isCompleting ? 'Please wait...' : 'Continue'}
          </Text>
        </TouchableOpacity>
        </View>
      </ScrollView>
      </KeyboardAvoidingView>

      {renderBusinessTypeModal()}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  contentPadding: {
    paddingHorizontal: 30,
    paddingTop: 20,
    paddingBottom: 100,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 3,
    borderColor: COLORS.primary,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: 40,
  },
  inputGroup: {
    marginBottom: 24,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
  },
  inputContainerFocused: {
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.12,
    shadowRadius: 8,
    elevation: 4,
  },
  customTypeContainer: {
    paddingRight: 0,
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.black,
    borderWidth: 0,
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineStyle: 'none',
      },
    }),
  },
  customTypeInput: {
    paddingRight: 12,
  },
  inlineChevronButton: {
    paddingHorizontal: 14,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'stretch',
    borderLeftWidth: 1,
    borderLeftColor: COLORS.lightGray,
  },
  selectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
  },
  selectButtonText: {
    fontSize: 16,
    color: COLORS.black,
  },
  selectButtonPlaceholder: {
    color: COLORS.gray,
  },
  completeButton: {
    paddingVertical: 18,
    borderRadius: 12,
    alignItems: 'center',
    marginBottom: 30,
  },
  enabledButton: {
    backgroundColor: COLORS.primary,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray,
  },
  completeButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  enabledButtonText: {
    color: COLORS.white,
  },
  disabledButtonText: {
    color: COLORS.gray,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContent: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: COLORS.black,
  },
  modalCloseButton: {
    width: 30,
    height: 30,
    borderRadius: 15,
    backgroundColor: COLORS.lightGray,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: COLORS.gray,
  },
  businessTypeList: {
    paddingHorizontal: 20,
  },
  businessTypeItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
  },
  selectedBusinessTypeItem: {
    backgroundColor: '#F0F4FF',
    borderWidth: 1,
    borderColor: COLORS.primary,
  },
  businessTypeText: {
    fontSize: 16,
    color: COLORS.black,
  },
  selectedBusinessTypeText: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});