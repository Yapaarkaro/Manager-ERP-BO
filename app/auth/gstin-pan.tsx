import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, FileText, CreditCard, Check } from 'lucide-react-native';
import { verifyGSTIN as verifyGSTINBackend, saveSignupProgress } from '@/services/backendApi';
import { supabase } from '@/lib/supabase';
import { useStatusBar } from '@/contexts/StatusBarContext';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
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


export default function GstinPanScreen() {
  const { setStatusBarStyle } = useStatusBar();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams();
  const signupData = getSignupData();
  const mobile = (params.mobile as string) || signupData.mobile || '';
  const inputRef = React.useRef<TextInput>(null);
  const [selectedType, setSelectedType] = useState<'GSTIN' | 'PAN'>('GSTIN');
  const [inputValue, setInputValue] = useState('');
  // Set status bar to dark for white background
  React.useEffect(() => {
    setStatusBarStyle('dark-content');
  }, [setStatusBarStyle]);
  
  const [isValid, setIsValid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifiedGstinData, setVerifiedGstinData] = useState<any>(null);
  const [hasAutoVerified, setHasAutoVerified] = useState(false);
  const [lastVerifiedGstin, setLastVerifiedGstin] = useState<string>('');
  const [mobileMatch, setMobileMatch] = useState<boolean | undefined>(undefined);
  const [registeredMobile, setRegisteredMobile] = useState<string>('');
  const [otpRequestId, setOtpRequestId] = useState<string>('');
  const [promoters, setPromoters] = useState<string[]>([]);
  const [selectedPromoter, setSelectedPromoter] = useState<string>('');

  const validateInput = (text: string, type: 'GSTIN' | 'PAN') => {
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

  const formatInput = (text: string, type: 'GSTIN' | 'PAN') => {
    const cleaned = text.toUpperCase().replace(/[^A-Z0-9]/g, '');
    if (type === 'GSTIN') {
      return cleaned.slice(0, 15);
    } else {
      return cleaned.slice(0, 10);
    }
  };

  const handleInputChange = (text: string) => {
    const formatted = formatInput(text, selectedType);
    setInputValue(formatted);
    const isFormatValid = validateInput(formatted, selectedType);
    setIsValid(isFormatValid);
    setVerificationError(null);

    if (verifiedGstinData && formatted !== lastVerifiedGstin) {
      setVerifiedGstinData(null);
      setHasAutoVerified(false);
      setIsValid(false);
    }

    // Auto-verify GSTIN when format is valid and it's a new value
    if (selectedType === 'GSTIN' && isFormatValid && formatted.length === 15 && formatted !== lastVerifiedGstin && !isVerifying) {
      setHasAutoVerified(true);
      verifyGSTINNumber(formatted);
    }
  };

  const handleTypeSwitch = (type: 'GSTIN' | 'PAN') => {
    setSelectedType(type);
    setInputValue('');
    setIsValid(false);
    setVerificationError(null);
    setIsVerifying(false);
    setHasAutoVerified(false);
    setVerifiedGstinData(null);
    setLastVerifiedGstin('');
  };

  const verifyGSTINNumber = async (gstinNumber: string) => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      const userMobile = (mobile || '').replace(/^\+91/, '').replace(/\D/g, '');
      const result = await verifyGSTINBackend(gstinNumber, 'signup', userMobile);
      
      if (result.success && result.taxpayerInfo) {
        setVerifiedGstinData(result.taxpayerInfo);
        setLastVerifiedGstin(gstinNumber);
        setIsValid(true);
        setVerificationError(null);
        setMobileMatch(result.mobileMatch);
        setRegisteredMobile(result.registeredMobile || '');
        setOtpRequestId(result.otpRequestId || '');

        const proms = result.taxpayerInfo.promoters || [];
        setPromoters(proms);
        if (proms.length === 1) {
          setSelectedPromoter(proms[0].trim());
        } else if (proms.length > 1) {
          setSelectedPromoter('');
        }
      } else {
        setVerificationError(result.error || 'GSTIN verification failed');
        setIsValid(false);
        setInputValue('');
        setHasAutoVerified(false);
        setVerifiedGstinData(null);
        setLastVerifiedGstin('');
        setMobileMatch(undefined);
        setRegisteredMobile('');
        setOtpRequestId('');
        setPromoters([]);
        setSelectedPromoter('');
        setTimeout(() => {
          inputRef.current?.focus();
        }, 300);
      }
    } catch (error: any) {
      console.error('GSTIN verification error:', error);
      setVerificationError(error.message || 'Failed to verify GSTIN. Please check your connection and try again.');
      setIsValid(false);
      setInputValue('');
      setHasAutoVerified(false);
      setVerifiedGstinData(null);
      setLastVerifiedGstin('');
      setMobileMatch(undefined);
      setRegisteredMobile('');
      setOtpRequestId('');
      setPromoters([]);
      setSelectedPromoter('');
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContinue = async () => {
    if (!isValid || isVerifying) {
      if (verificationError) {
        Alert.alert('Verification Failed', verificationError);
      } else {
        Alert.alert('Invalid Input', `Please enter a valid ${selectedType}`);
      }
      return;
    }

    const currentGstin = inputValue;

    if (selectedType === 'GSTIN' && promoters.length > 1 && !selectedPromoter) {
      Alert.alert('Select Promoter', 'Please select a business promoter/owner before continuing.');
      return;
    }

    if (selectedType === 'GSTIN' && (!verifiedGstinData || lastVerifiedGstin !== currentGstin)) {
      try {
        setIsVerifying(true);
        const userMobile = (mobile || '').replace(/^\+91/, '').replace(/\D/g, '');
        const result = await verifyGSTINBackend(currentGstin, 'signup', userMobile);
        if (!result.success || !result.taxpayerInfo) {
          setVerificationError(result.error || 'GSTIN verification failed');
          setIsValid(false);
          setVerifiedGstinData(null);
          setLastVerifiedGstin('');
          setIsVerifying(false);
          Alert.alert('Verification Failed', result.error || 'GSTIN verification failed. Please re-enter.');
          return;
        }
        setVerifiedGstinData(result.taxpayerInfo);
        setLastVerifiedGstin(currentGstin);
        setMobileMatch(result.mobileMatch);
        setRegisteredMobile(result.registeredMobile || '');
        setOtpRequestId(result.otpRequestId || '');

        const proms = result.taxpayerInfo.promoters || [];
        setPromoters(proms);
        if (proms.length === 1) {
          setSelectedPromoter(proms[0].trim());
        } else if (proms.length > 1 && !selectedPromoter) {
          setSelectedPromoter('');
          setIsVerifying(false);
          Alert.alert('Select Promoter', 'Please select a business promoter/owner before continuing.');
          return;
        }

        setIsVerifying(false);
        navigateNext(currentGstin, result.taxpayerInfo);
      } catch (error: any) {
        setIsVerifying(false);
        Alert.alert('Error', error.message || 'Failed to verify GSTIN');
      }
      return;
    }

    navigateNext(currentGstin, verifiedGstinData);
  };

  const navigateNext = (gstinValue: string, gstinDataObj: any) => {
    (async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { optimisticSaveSignupProgress } = await import('@/utils/optimisticSync');
          optimisticSaveSignupProgress({
            mobile: mobile as string,
            mobileVerified: true,
            taxIdType: selectedType as 'GSTIN' | 'PAN',
            taxIdValue: gstinValue,
            taxIdVerified: false,
            currentStep: 'gstinPan',
          });
        }
      } catch {}
    })();

    const enrichedData = { ...gstinDataObj };
    if (selectedPromoter) {
      enrichedData.selectedPromoter = selectedPromoter;
    }

    if (selectedType === 'GSTIN') {
      setSignupData({
        type: selectedType,
        value: gstinValue,
        gstinData: JSON.stringify(enrichedData),
        mobile,
        mobileMatch: mobileMatch === true ? 'true' : 'false',
        registeredMobile: registeredMobile || '',
        otpRequestId: otpRequestId || '',
        selectedPromoter: selectedPromoter || '',
      });
    } else {
      setSignupData({
        type: selectedType,
        value: gstinValue,
        mobile,
      });
    }
    router.replace('/auth/gstin-pan-otp');
  };

  const switchToOtherType = () => {
    const otherType = selectedType === 'GSTIN' ? 'PAN' : 'GSTIN';
    handleTypeSwitch(otherType);
  };

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
        <ScrollView 
          style={styles.content}
          contentContainerStyle={[
            styles.scrollContent, 
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
        >
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            {selectedType === 'GSTIN' ? (
              <FileText size={32} color={COLORS.primary} />
            ) : (
              <CreditCard size={32} color={COLORS.primary} />
            )}
          </View>
        </View>

        <Text style={styles.title}>Enter {selectedType}</Text>
        <Text style={styles.subtitle}>
          {selectedType === 'GSTIN' 
            ? 'Enter your 15-digit GST Identification Number'
            : 'Enter your 10-digit Permanent Account Number'}
        </Text>

        <View style={styles.typeSelector}>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'GSTIN' && styles.activeTypeButton,
            ]}
            onPress={() => handleTypeSwitch('GSTIN')}
          >
            <Text style={[
              styles.typeButtonText,
              selectedType === 'GSTIN' && styles.activeTypeButtonText,
            ]}>
              GSTIN
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[
              styles.typeButton,
              selectedType === 'PAN' && styles.activeTypeButton,
            ]}
            onPress={() => handleTypeSwitch('PAN')}
          >
            <Text style={[
              styles.typeButtonText,
              selectedType === 'PAN' && styles.activeTypeButtonText,
            ]}>
              PAN
            </Text>
          </TouchableOpacity>
        </View>

        <View style={[
          styles.inputContainer,
          isValid && styles.validInput,
          (inputValue.length > 0 && !isValid) || verificationError ? styles.invalidInput : {},
          isVerifying && styles.verifyingInput,
        ]}>
          <TextInput
            ref={inputRef}
            style={[
              styles.input,
              Platform.select({
                web: {
                  outlineWidth: 0,
                  outlineColor: 'transparent',
                  outlineStyle: 'none',
                },
              }),
            ]}
            placeholder={selectedType === 'GSTIN' ? '15AAAAA0000A1Z5' : 'AAAAA0000A'}
            placeholderTextColor={COLORS.gray}
            value={inputValue}
            onChangeText={handleInputChange}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={selectedType === 'GSTIN' ? 15 : 10}
            keyboardType="default"
            autoFocus
          />
        </View>

        {verificationError && (
          <Text style={styles.errorText}>
            {verificationError}
          </Text>
        )}

        {inputValue.length > 0 && !isValid && !verificationError && !isVerifying && (
          <Text style={styles.errorText}>
            Please enter a valid {selectedType} format
          </Text>
        )}

        {verifiedGstinData && promoters.length > 1 && (
          <View style={styles.promoterSection}>
            <Text style={styles.promoterTitle}>Select Business Promoter / Owner</Text>
            {promoters.map((name, idx) => {
              const trimmed = name.trim();
              const isSelected = selectedPromoter === trimmed;
              return (
                <TouchableOpacity
                  key={idx}
                  style={[styles.promoterCard, isSelected && styles.promoterCardSelected]}
                  onPress={() => setSelectedPromoter(trimmed)}
                  activeOpacity={0.7}
                >
                  <View style={[styles.promoterRadio, isSelected && styles.promoterRadioSelected]}>
                    {isSelected && <Check size={14} color={COLORS.white} />}
                  </View>
                  <Text style={[styles.promoterName, isSelected && styles.promoterNameSelected]}>{trimmed}</Text>
                </TouchableOpacity>
              );
            })}
          </View>
        )}

        <TouchableOpacity
          style={[
            styles.continueButton,
            (isValid && !isVerifying && !(promoters.length > 1 && !selectedPromoter)) ? styles.enabledButton : styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={!isValid || isVerifying || (promoters.length > 1 && !selectedPromoter)}
        >
          <Text style={[
            styles.continueButtonText,
            (isValid && !isVerifying && !(promoters.length > 1 && !selectedPromoter)) ? styles.enabledButtonText : styles.disabledButtonText,
          ]}>
            {isVerifying ? 'Verifying...' : 'Continue'}
          </Text>
        </TouchableOpacity>

        <View style={styles.infoContainer}>
          <Text style={styles.infoText}>
            {selectedType === 'GSTIN' 
              ? 'Format: 2-digit state code + 10-digit PAN + 4 additional characters'
              : 'Format: 5 letters + 4 numbers + 1 letter (e.g., ABCDE1234F)'}
          </Text>
        </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  keyboardAvoidingView: {
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Platform.select({
      web: 30,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    paddingTop: Platform.select({
      web: 20,
      default: 0, // SafeAreaView handles top padding on mobile
    }),
    paddingBottom: Platform.select({
      web: 40,
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
    marginBottom: Platform.select({
      web: 12,
      default: 8,
    }),
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    marginBottom: Platform.select({
      web: 30,
      default: 20,
    }),
    lineHeight: 22,
  },
  typeSelector: {
    flexDirection: 'row',
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    padding: 4,
    marginBottom: 30,
  },
  typeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeTypeButton: {
    backgroundColor: COLORS.primary,
  },
  typeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.gray,
  },
  activeTypeButtonText: {
    color: COLORS.white,
  },
  inputContainer: {
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: COLORS.white,
  },
  input: {
    borderWidth: 0,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.black,
    fontFamily: 'monospace',
    letterSpacing: 1,
    ...Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
        outlineStyle: 'none',
      },
    }),
  },
  validInput: {
    borderColor: COLORS.success,
    backgroundColor: '#F0FDF4',
  },
  invalidInput: {
    borderColor: COLORS.error,
    backgroundColor: '#FEF2F2',
  },
  verifyingInput: {
    borderColor: '#F59E0B',
    backgroundColor: '#FFFBEB',
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  continueButton: {
    paddingVertical: 16,
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
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
  },
  enabledButtonText: {
    color: COLORS.white,
  },
  disabledButtonText: {
    color: COLORS.gray,
  },
  infoContainer: {
    backgroundColor: '#F0F4FF',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: COLORS.primary,
  },
  infoText: {
    color: COLORS.primary,
    fontSize: 12,
    lineHeight: 16,
  },
  promoterSection: {
    marginBottom: 20,
  },
  promoterTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
    marginBottom: 12,
  },
  promoterCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E5E7EB',
    backgroundColor: COLORS.white,
    marginBottom: 8,
  },
  promoterCardSelected: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F4FF',
  },
  promoterRadio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#D1D5DB',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  promoterRadioSelected: {
    borderColor: COLORS.primary,
    backgroundColor: COLORS.primary,
  },
  promoterName: {
    fontSize: 15,
    fontWeight: '500',
    color: COLORS.black,
    flex: 1,
  },
  promoterNameSelected: {
    color: COLORS.primary,
    fontWeight: '600',
  },
});