import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Modal,
  ScrollView,
  Alert,
  KeyboardAvoidingView,
  Platform
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CapitalizedTextInput from '@/components/CapitalizedTextInput';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { User, Building2, ChevronDown, Check } from 'lucide-react-native';
import { getGSTINStateCode, toTitleCase, mapLocationsToAddresses, type BusinessAddress } from '@/utils/dataStore';
import { getInputFocusStyles, getWebContainerStyles } from '@/utils/platformUtils';
import { submitBusinessDetails } from '@/services/backendApi';
import { supabase, withTimeout } from '@/lib/supabase';
import { optimisticAddAddress, optimisticSaveSignupProgress } from '@/utils/optimisticSync';
import { getSignupData, setSignupData } from '@/utils/signupStore';

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
  const params = useLocalSearchParams();
  const signupData = getSignupData();
  const type = (params.type as string) || signupData.type || '';
  const value = (params.value as string) || signupData.value || '';
  const gstinData = (params.gstinData as string) || signupData.gstinData || '';
  const panName = (params.panName as string) || signupData.panName || '';
  const panDob = (params.panDob as string) || signupData.panDob || '';
  const mobile = (params.mobile as string) || signupData.mobile || '';
  const incomingName = (params.name as string) || signupData.name || '';
  const incomingBusinessName = (params.businessName as string) || signupData.businessName || '';
  const incomingBusinessType = (params.businessType as string) || signupData.businessType || '';
  const incomingCustomBusinessType = (params.customBusinessType as string) || signupData.customBusinessType || '';
  const initialCashBalance = (params.initialCashBalance as string) || signupData.initialCashBalance || '';
  const invoicePrefix = (params.invoicePrefix as string) || signupData.invoicePrefix || '';
  const invoicePattern = (params.invoicePattern as string) || signupData.invoicePattern || '';
  const startingInvoiceNumber = (params.startingInvoiceNumber as string) || signupData.startingInvoiceNumber || '';
  const fiscalYear = (params.fiscalYear as string) || signupData.fiscalYear || '';
  
  const insets = useSafeAreaInsets();
  
  // Initialize with incoming data if available (returning from business summary)
  const [name, setName] = useState((incomingName as string) || '');
  const [businessName, setBusinessName] = useState((incomingBusinessName as string) || '');
  const [businessType, setBusinessType] = useState((incomingBusinessType as string) || '');
  const [customBusinessType, setCustomBusinessType] = useState((incomingCustomBusinessType as string) || '');
  const [showBusinessTypeModal, setShowBusinessTypeModal] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
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
      // ✅ Check signup progress from backend in parallel (don't block GST auto-fill)
      const loadExistingProgress = async () => {
        if (mobile && !hasLoadedProgress) {
          // Mark as loading immediately so GST can still auto-fill
          setHasLoadedProgress(true);
          
          try {
            // ✅ Load signup progress from backend (fast, single query, non-blocking)
            const { getSignupProgress } = await import('@/services/backendApi');
            const progressResult = await getSignupProgress();
            
            if (progressResult.success && progressResult.progress) {
              const existingProgress = progressResult.progress;
              
              // Only override if mobile matches and we have relevant data (user data takes priority)
              if (existingProgress.mobile === mobile && (existingProgress.owner_name || existingProgress.business_name)) {
                console.log('📥 Loading signup progress from backend - USER DATA TAKES PRIORITY');
                console.log('🔄 Overriding auto-filled data with user data from backend');
                
                // Override with user data (user data is more accurate)
                if (existingProgress.owner_name) {
                  setName(existingProgress.owner_name);
                  console.log('✅ Restored user name:', existingProgress.owner_name);
                }
                if (existingProgress.business_name) {
                  setBusinessName(existingProgress.business_name);
                  console.log('✅ Restored business name:', existingProgress.business_name);
                }
                if (existingProgress.business_type) {
                  const businessTypesList = [
                    'Manufacturer', 'C&F', 'Distributor', 'Trader', 
                    'Wholesaler', 'Retailer', 'Others'
                  ];
                  if (businessTypesList.includes(existingProgress.business_type)) {
                    setBusinessType(existingProgress.business_type);
                  } else {
                    setBusinessType('Others');
                    setCustomBusinessType(existingProgress.business_type);
                  }
                  console.log('✅ Restored business type:', existingProgress.business_type);
                }
                
                // Block further auto-fill attempts
                setIsInitialized(true);
                setHasAutoFilled(true);
              }
            } else {
              console.log('📝 No existing progress found in backend, GST auto-fill will be used');
            }
          } catch (error) {
            console.error('⚠️ Error loading signup progress from backend:', error);
            // Continue - GST auto-fill will be used
          }
        }
      };
      // ✅ Load in parallel - don't block GST auto-fill
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

  // ✅ Auto-fill data from GSTIN verification IMMEDIATELY (don't wait for backend progress)
  useEffect(() => {
    // Skip if returning from another screen with existing form data
    if (incomingName || incomingBusinessName || incomingBusinessType) {
      return;
    }
    // Auto-fill GST data immediately if available, but check backend progress in parallel
    if (!isInitialized && type === 'GSTIN' && gstinData && !hasAutoFilled) {
      console.log('📝 Auto-filling from GSTIN data IMMEDIATELY');
      try {
        const parsedData = JSON.parse(gstinData as string);
        if (parsedData) {
          setIsInitialized(true);
          setHasAutoFilled(true);
          
          // Auto-fill business name from trade name or legal name (with title case)
          const businessNameFromGstin = parsedData.tradeNam || parsedData.lgnm || '';
          if (businessNameFromGstin && !businessName) {
            setBusinessName(toTitleCase(businessNameFromGstin));
          }
          
          const ownerNameFromGstin = parsedData.selectedPromoter || (parsedData.promoters && parsedData.promoters[0]) || parsedData.lgnm || '';
          if (ownerNameFromGstin && !name) {
            setName(toTitleCase(ownerNameFromGstin));
          }
          
          // Set business type based on constitution of business
          const constitutionType = parsedData.ctb || '';
          if (constitutionType && !businessType) {
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
        }
      } catch (error) {
        console.error('Error parsing GSTIN data:', error);
      }
    }
  }, [type, gstinData, isInitialized, hasAutoFilled, incomingName, incomingBusinessName, incomingBusinessType]);

  // ✅ Check backend progress in parallel and override if user data exists
  useEffect(() => {
    if (hasLoadedProgress && !hasAutoFilled && mobile) {
      // Backend progress check completed, but no auto-fill happened yet
      // This means no GST data was available, so we can proceed
      console.log('✅ Backend progress check completed');
    }
  }, [hasLoadedProgress, hasAutoFilled]);

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
      // Signup progress is saved to Supabase backend via saveSignupProgress (called in handleComplete)
      console.log('💾 Form valid, ready for submission');
    }
  };

  const handleComplete = async () => {
    // Prevent double navigation
    if (isNavigating || isCompleting) {
      console.log('⚠️ Navigation already in progress, ignoring duplicate click');
      return;
    }

    if (!isFormValid()) {
      Alert.alert('Incomplete Details', 'Please fill in all required fields');
      return;
    }

    setIsCompleting(true);
    setIsNavigating(true);
    
    try {
      const { data: { session }, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        10000,
        'Business details: getSession'
      );
      
      const mobileNumber = (mobile as string) || session?.user?.phone || session?.user?.user_metadata?.phone;
      if (!mobileNumber) {
        Alert.alert('Error', 'Mobile number is required. Please try again.');
        setIsCompleting(false);
        setIsNavigating(false);
        return;
      }
      
      if (!session?.user) {
        const phoneNumber = `+91${mobileNumber}`;
        const tempPassword = `Temp@${Date.now()}${Math.random().toString(36).substr(2, 9)}`;
        
        const { data: signUpData, error: signUpError } = await withTimeout(
          supabase.auth.signUp({ phone: phoneNumber, password: tempPassword }),
          15000,
          'Business details: signUp'
        );
        
        if (signUpError && signUpError.message.includes('already registered')) {
          const { error: signInError } = await withTimeout(
            supabase.auth.signInWithPassword({ phone: phoneNumber, password: tempPassword }),
            15000,
            'Business details: signIn'
          );
          if (signInError) {
            throw new Error('Authentication required. Please complete mobile OTP verification first.');
          }
        } else if (signUpError) {
          throw signUpError;
        }
        
        const { data: { session: newSession } } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          'Business details: getSession retry'
        );
        if (!newSession?.user) {
          throw new Error('User authentication failed. Please try again.');
        }
      }

      const { data: { user } } = await withTimeout(
        supabase.auth.getUser(),
        10000,
        'Business details: getUser'
      );
      
      if (!user) {
        throw new Error('User not authenticated. Please complete mobile OTP verification first.');
      }

      let parsedGstinData = null;
      try {
        parsedGstinData = type === 'GSTIN' && gstinData ? JSON.parse(gstinData as string) : null;
      } catch {
        parsedGstinData = null;
      }
      const finalBusinessType = businessType !== 'Others' ? businessType : customBusinessType;
      
      // ✅ CRITICAL: For GSTIN users, we MUST await business creation before creating address
      // because the address creation requires business_id to exist
      const businessResult = await submitBusinessDetails({
        ownerName: name,
        businessName: businessName,
        businessType: finalBusinessType,
        taxIdType: type as 'GSTIN' | 'PAN',
        taxIdValue: value as string,
        gstinData: parsedGstinData,
        dateOfBirth: panDob as string || undefined,
        registeredMobile: mobileNumber, // Pass mobile number
      });

      if (!businessResult.success) {
        console.error('❌ Business details save failed:', businessResult.error);
        Alert.alert('Error', 'Failed to save business details. Please try again.');
        setIsCompleting(false);
        setIsNavigating(false);
        return;
      }

      console.log('✅ Business details saved successfully. Business ID:', businessResult.businessId);
      
      // Trim gstinData to avoid sending the full IDfy payload (prevents 500 errors)
      const trimmedGstinData = parsedGstinData ? (() => {
        try {
          const d = typeof parsedGstinData === 'string' ? JSON.parse(parsedGstinData) : parsedGstinData;
          const ti = d?.taxpayerInfo || {};
          return { taxpayerInfo: { lgnm: ti.lgnm, tradeNam: ti.tradeNam, gstin: ti.gstin, sts: ti.sts, ctb: ti.ctb, pradr: ti.pradr }, mobileMatch: d?.mobileMatch };
        } catch { return parsedGstinData; }
      })() : undefined;

      try {
        optimisticSaveSignupProgress({
          mobile: mobileNumber,
          mobileVerified: true,
          taxIdType: type as 'GSTIN' | 'PAN',
          taxIdValue: value as string,
          taxIdVerified: true,
          ownerName: name,
          ownerDob: panDob as string,
          businessName: businessName,
          businessType: finalBusinessType,
          gstinData: trimmedGstinData,
          currentStep: 'businessDetails',
        });
      } catch (progressErr) {
        console.warn('⚠️ Failed to save signup progress (non-blocking):', progressErr);
      }

      // For GSTIN users, auto-create primary address from GSTIN data and skip to address confirmation
      // ✅ CRITICAL: Business must be created first (we already awaited it above)
      if (type === 'GSTIN' && gstinData && businessResult.success) {
        let parsedGstinDataForAddress: any = null;
        try { parsedGstinDataForAddress = JSON.parse(gstinData as string); } catch { /* malformed */ }
      
        // Check backend for existing addresses (Supabase is source of truth)
        let existingAddresses: any[] = [];
        try {
          const { data: locations } = await supabase.from('locations')
            .select('*')
            .eq('business_id', businessResult.businessId);
          existingAddresses = locations || [];
        } catch {}
        const hasPrimaryAddress = existingAddresses.some((addr: any) => addr.is_primary);
        
        if (!hasPrimaryAddress) {
          // Extract address from GSTIN data
          if (parsedGstinDataForAddress.pradr && parsedGstinDataForAddress.pradr.addr) {
            const addr = parsedGstinDataForAddress.pradr.addr;
          
            const doorNumber = addr.bno || '';
            const buildingParts = [addr.bnm, addr.flno].filter(Boolean);
            const addressLine1 = buildingParts.length > 0 ? buildingParts.join(', ') : addr.st || '';
            const addressLine2 = buildingParts.length > 0 ? (addr.st || addr.loc || '') : (addr.loc || '');
            const extraLines: string[] = [];
            if (buildingParts.length > 0 && addr.st && addr.loc && addr.st !== addr.loc) {
              extraLines.push(addr.loc);
            }
            if (addr.dst && addr.dst !== (addr.city || '')) {
              extraLines.push(addr.dst);
            }
            const city = addr.city || addr.dst || '';
            const pincode = addr.pncd || '';
            const stateName = addr.stcd || '';
            
            const primaryAddress: BusinessAddress & { backendId?: string } = {
              id: `addr_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              name: businessName.trim() || 'Primary Address',
              type: 'primary' as const,
              doorNumber,
              addressLine1,
              addressLine2,
              additionalLines: extraLines.length > 0 ? extraLines : undefined,
              city,
              pincode,
              stateName,
              stateCode: getGSTINStateCode(stateName),
              isPrimary: true,
              status: 'active',
              createdAt: new Date().toISOString(),
              updatedAt: new Date().toISOString(),
              manager: name,
              phone: typeof mobile === 'string' ? mobile : (Array.isArray(mobile) ? mobile[0] : ''),
            };
            
            console.log('🏢 Auto-creating primary address from GSTIN data:', primaryAddress);
            console.log('✅ Business ID exists:', businessResult.businessId, '- Address can now be created');
            
            // ✅ Optimistically add address (DataStore updated immediately, backend sync in background)
            // This makes the UI feel instant while backend sync happens asynchronously
            optimisticAddAddress(primaryAddress, { showError: false });
            
            try {
              optimisticSaveSignupProgress({
                mobile: mobileNumber,
                mobileVerified: true,
                taxIdType: type as 'GSTIN' | 'PAN',
                taxIdValue: value as string,
                taxIdVerified: true,
                ownerName: name,
                businessName: businessName,
                businessType: finalBusinessType,
                gstinData: trimmedGstinData,
                currentStep: 'primaryAddress',
              });
            } catch (progressErr) {
              console.warn('⚠️ Failed to save signup progress (non-blocking):', progressErr);
            }
          } else {
            // No address in GSTIN data, fall back to normal flow
            console.warn('⚠️ No address in GSTIN data, falling back to normal flow');
            setSignupData({
              type,
              value,
              gstinData,
              name,
              businessName,
              businessType: businessType !== 'Others' ? businessType : customBusinessType,
              customBusinessType: businessType === 'Others' ? customBusinessType : '',
              mobile,
              addressType: 'primary',
            });
            router.replace('/auth/business-address');
            setIsCompleting(false);
            setIsNavigating(false);
            return;
          }
        } else {
          console.log('🏢 Primary address already exists, skipping auto-creation from GSTIN data');
        }
        
        setSignupData({
          type,
          value,
          gstinData,
          name,
          businessName,
          businessType: businessType !== 'Others' ? businessType : customBusinessType,
          customBusinessType: businessType === 'Others' ? customBusinessType : '',
          mobile,
          allAddresses: JSON.stringify(mapLocationsToAddresses(existingAddresses)),
          initialCashBalance,
          invoicePrefix,
          invoicePattern,
          startingInvoiceNumber,
          fiscalYear,
        });
        router.replace('/auth/address-confirmation');
        setIsCompleting(false);
        setIsNavigating(false);
      } else {
        // For PAN users, check backend for existing addresses
        let panAddresses: any[] = [];
        try {
          const { data: locations } = await supabase.from('locations')
            .select('*')
            .eq('business_id', businessResult.businessId);
          panAddresses = locations || [];
        } catch {}
        const hasPrimaryAddress = panAddresses.some((addr: any) => addr.is_primary);
        
        if (hasPrimaryAddress) {
          setSignupData({
            type,
            value,
            gstinData,
            name,
            businessName,
            businessType: businessType !== 'Others' ? businessType : customBusinessType,
            customBusinessType: businessType === 'Others' ? customBusinessType : '',
            mobile,
            allAddresses: JSON.stringify(mapLocationsToAddresses(panAddresses)),
          });
          router.replace('/auth/address-confirmation');
          setIsCompleting(false);
          setIsNavigating(false);
        } else {
          setSignupData({
            type,
            value,
            gstinData,
            name,
            businessName,
            businessType: businessType !== 'Others' ? businessType : customBusinessType,
            customBusinessType: businessType === 'Others' ? customBusinessType : '',
            mobile,
            addressType: 'primary',
          });
          router.replace('/auth/business-address');
          setIsCompleting(false);
          setIsNavigating(false);
        }
      }
    } catch (error: any) {
      console.error('Error completing business details:', error);
      Alert.alert(
        'Error',
        error.message || 'Failed to save business details. Please check your connection and try again.'
      );
      setIsCompleting(false);
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

  const inputFocusStyles = getInputFocusStyles();
  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer narrow>
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
          enabled={true}
      >
      {/* Back button removed - users should not go back from business details to prevent signup abandonment */}

      <ScrollView 
        style={styles.content}
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === 'web' ? webContainerStyles.webScrollContent : {},
            { 
              paddingTop: Platform.select({ 
                web: 20, 
                android: Math.max(insets.top, 16),
                default: Math.max(insets.top, 0)
              }) 
            }
          ]}
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
            <View style={styles.inputWrapper}>
              <User size={20} color={COLORS.gray} style={styles.inputIconAbsolute} />
              <CapitalizedTextInput
              style={[
                  {
                    borderWidth: 2,
                    borderColor: focusedField === 'name' ? COLORS.primary : '#E5E7EB',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingLeft: 44,
                    paddingVertical: Platform.OS === 'web' ? 14 : 18,
                    fontSize: 16,
                    color: COLORS.black,
                    backgroundColor: COLORS.white,
                    ...Platform.select({
                      web: {
                        outlineWidth: 0,
                        outlineColor: 'transparent',
                        outlineStyle: 'none',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      },
                      default: {
                        minHeight: 50,
                      },
                    }),
                    ...(focusedField === 'name' && Platform.OS === 'web' ? {
                      boxShadow: '0 0 0 3px rgba(63, 102, 172, 0.12)',
                    } : {}),
                    ...(focusedField === 'name' && Platform.OS !== 'web' ? {
                      shadowColor: COLORS.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.12,
                      shadowRadius: 8,
                      elevation: 2,
                      zIndex: 1,
                    } : {}),
                  },
                ] as any}
                placeholder="Enter your full name"
                placeholderTextColor={COLORS.gray}
                value={name}
                onChangeText={setName}
                onFocus={handleNameFocus}
                onBlur={handleNameBlur}
                autoCapitalize="words"
                editable={true}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>Business Name *</Text>
            <View style={styles.inputWrapper}>
              <Building2 size={20} color={COLORS.gray} style={styles.inputIconAbsolute} />
              <CapitalizedTextInput
              style={[
                  {
                    borderWidth: 2,
                    borderColor: focusedField === 'businessName' ? COLORS.primary : '#E5E7EB',
                    borderRadius: 12,
                    paddingHorizontal: 16,
                    paddingLeft: 44,
                    paddingVertical: Platform.OS === 'web' ? 14 : 18,
                    fontSize: 16,
                    color: COLORS.black,
                    backgroundColor: COLORS.white,
                    ...Platform.select({
                      web: {
                        outlineWidth: 0,
                        outlineColor: 'transparent',
                        outlineStyle: 'none',
                        transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                      },
                      default: {
                        minHeight: 50,
                      },
                    }),
                    ...(focusedField === 'businessName' && Platform.OS === 'web' ? {
                      boxShadow: '0 0 0 3px rgba(63, 102, 172, 0.12)',
                    } : {}),
                    ...(focusedField === 'businessName' && Platform.OS !== 'web' ? {
                      shadowColor: COLORS.primary,
                      shadowOffset: { width: 0, height: 4 },
                      shadowOpacity: 0.12,
                      shadowRadius: 8,
                      elevation: 2,
                      zIndex: 1,
                    } : {}),
                  },
                ] as any}
                placeholder="Enter your business name"
                placeholderTextColor={COLORS.gray}
                value={businessName}
                onChangeText={setBusinessName}
                onFocus={handleBusinessNameFocus}
                onBlur={handleBusinessNameBlur}
                autoCapitalize="words"
                editable={true}
              />
            </View>
          </View>

          <View style={styles.inputGroup}>
            <Text style={styles.label}>
              {businessType === 'Others' ? 'Specify Business Type *' : 'Business Type *'}
            </Text>
            {businessType === 'Others' ? (
              <View style={styles.customTypeWrapper}>
                <CapitalizedTextInput
                style={[
                    {
                      borderWidth: 2,
                      borderColor: focusedField === 'customBusinessType' ? COLORS.primary : '#E5E7EB',
                      borderRadius: 12,
                      paddingHorizontal: 16,
                      paddingRight: 44,
                      paddingVertical: Platform.OS === 'web' ? 14 : 18,
                      fontSize: 16,
                      color: COLORS.black,
                      backgroundColor: COLORS.white,
                      flex: 1,
                      ...Platform.select({
                        web: {
                          outlineWidth: 0,
                          outlineColor: 'transparent',
                          outlineStyle: 'none',
                          transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                        },
                        default: {
                          minHeight: 50,
                        },
                      }),
                      ...(focusedField === 'customBusinessType' && Platform.OS === 'web' ? {
                        boxShadow: '0 0 0 3px rgba(63, 102, 172, 0.12)',
                      } : {}),
                      ...(focusedField === 'customBusinessType' && Platform.OS !== 'web' ? {
                        shadowColor: COLORS.primary,
                        shadowOffset: { width: 0, height: 4 },
                        shadowOpacity: 0.12,
                        shadowRadius: 8,
                        elevation: 4,
                      } : {}),
                    },
                  ] as any}
                  placeholder="Enter your specific business type"
                  placeholderTextColor={COLORS.gray}
                  value={customBusinessType}
                  onChangeText={setCustomBusinessType}
                  onFocus={handleCustomBusinessTypeFocus}
                  onBlur={handleCustomBusinessTypeBlur}
                  autoCapitalize="words"
                  editable={true}
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
    </ResponsiveContainer>
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
    paddingHorizontal: Platform.select({
      web: 24,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    paddingTop: Platform.select({
      web: 20,
      default: 0, // SafeAreaView handles top padding on mobile
    }),
    paddingBottom: Platform.select({
      web: 100,
      ios: 20,
      android: 20, // Consistent bottom padding across all platforms
      default: 20,
    }),
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: Platform.select({
      web: 0,
      default: 20, // Consistent top margin on mobile (SafeAreaView handles safe area)
    }),
    marginBottom: Platform.select({
      web: 40,
      default: 24,
    }),
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
    marginBottom: Platform.select({
      web: 40,
      default: 20,
    }),
    lineHeight: 22,
  },
  formContainer: {
    marginBottom: Platform.select({
      web: 40,
      default: 24,
    }),
  },
  inputGroup: {
    marginBottom: Platform.select({
      web: 24,
      default: 16,
    }),
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 8,
  },
  // inputContainer and inputContainerFocused moved to getInputFocusStyles utility
  customTypeContainer: {
    paddingRight: 0,
  },
  inputIcon: {
    marginRight: 12,
  },
  inputWrapper: {
    position: 'relative',
    ...Platform.select({
      default: {
        pointerEvents: 'box-none', // Allow touches to pass through to children
        zIndex: 1, // Ensure wrapper is below icon
      },
    }),
  },
  inputIconAbsolute: {
    position: 'absolute',
    left: 16,
    top: '50%',
    marginTop: -10, // Half of icon size (20/2) to center vertically
    zIndex: 10, // Much higher zIndex to ensure icon stays above input even when focused
    elevation: 10, // On Android, elevation is needed to ensure icon renders above input with elevation
    pointerEvents: 'none',
  },
  customTypeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    position: 'relative',
  },
  // input style moved to getInputFocusStyles utility
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
    ...Platform.select({
      web: {
        maxWidth: 500,
        width: '90%',
      },
    }),
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