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
import { ArrowLeft, FileText, CreditCard } from 'lucide-react-native';
import { verifyGSTIN as verifyGSTINBackend, saveSignupProgress } from '@/services/backendApi';
import { supabase } from '@/lib/supabase';
import { useStatusBar } from '@/contexts/StatusBarContext';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';

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

// Helper function to get keyboard type based on GSTIN/PAN position
const getKeyboardType = (type: 'GSTIN' | 'PAN', position: number): 'default' | 'number-pad' => {
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

export default function GstinPanScreen() {
  const { setStatusBarStyle } = useStatusBar();
  const debouncedNavigate = useDebounceNavigation();
  const insets = useSafeAreaInsets();
  const { mobile } = useLocalSearchParams();
  const inputRef = React.useRef<TextInput>(null);
  const [selectedType, setSelectedType] = useState<'GSTIN' | 'PAN'>('GSTIN');
  const [inputValue, setInputValue] = useState('');
  const [keyboardType, setKeyboardType] = useState<'default' | 'number-pad'>('number-pad');

  // Set status bar to dark for white background
  React.useEffect(() => {
    setStatusBarStyle('dark-content');
  }, [setStatusBarStyle]);
  
  // Initialize keyboard type based on selected type and input value
  React.useEffect(() => {
    const currentPosition = inputValue.length;
    const currentKeyboardType = getKeyboardType(selectedType, currentPosition);
    setKeyboardType(currentKeyboardType);
  }, [selectedType]);
  
  const [isValid, setIsValid] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [verificationError, setVerificationError] = useState<string | null>(null);
  const [verifiedGstinData, setVerifiedGstinData] = useState<any>(null);
  const [hasAutoVerified, setHasAutoVerified] = useState(false);

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
    
    // Update keyboard type based on the NEXT character position (current length is where next char will go)
    const nextPosition = formatted.length;
    const currentKeyboardType = keyboardType;
    const nextKeyboardType = getKeyboardType(selectedType, nextPosition);
    
    // Only update keyboard if it needs to change, and blur/refocus to force keyboard change
    if (nextKeyboardType !== currentKeyboardType) {
      setKeyboardType(nextKeyboardType);
      // Blur and refocus to force keyboard type change
      setTimeout(() => {
        inputRef.current?.blur();
        setTimeout(() => {
          inputRef.current?.focus();
        }, 50);
      }, 50);
    }
    
    // Auto-verify GSTIN when format is valid (only once)
    if (selectedType === 'GSTIN' && isFormatValid && formatted.length === 15 && !hasAutoVerified && !isVerifying) {
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
    // Reset keyboard type based on the first character of the new type
    const initialKeyboardType = getKeyboardType(type, 0);
    setKeyboardType(initialKeyboardType);
    
    // Force keyboard type change by blurring and refocusing
    setTimeout(() => {
      inputRef.current?.blur();
      setTimeout(() => {
        inputRef.current?.focus();
      }, 100);
    }, 50);
  };

  const verifyGSTINNumber = async (gstinNumber: string) => {
    if (isVerifying) return; // Prevent multiple simultaneous calls
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      // Call backend API (user should be authenticated by now with JWT)
      const result = await verifyGSTINBackend(gstinNumber);
      
      console.log('📡 GSTIN Backend API response:', result);
      
      if (result.success && result.taxpayerInfo) {
        // GSTIN is valid and verified
        setVerifiedGstinData(result.taxpayerInfo);
        setIsValid(true);
        setVerificationError(null);
      } else {
        // GSTIN verification failed
        setVerificationError(result.error || 'GSTIN verification failed');
        setIsValid(false);
        setInputValue('');
        setHasAutoVerified(false);
        setVerifiedGstinData(null);
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
      setTimeout(() => {
        inputRef.current?.focus();
      }, 300);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContinue = async () => {
    if (isValid && !isVerifying) {
      // ✅ Save signup progress to backend (taxId step)
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const progressResult = await saveSignupProgress({
            mobile: mobile as string,
            mobileVerified: true,
            taxIdType: selectedType as 'GSTIN' | 'PAN',
            taxIdValue: inputValue,
            taxIdVerified: false, // Will be verified after OTP
            currentStep: 'gstinPan',
          });
          if (progressResult.success) {
            console.log('✅ Signup progress saved: gstinPan');
          } else {
            console.error('❌ Failed to save signup progress:', progressResult.error);
          }
        }
      } catch (error) {
        console.error('Error saving signup progress:', error);
        // Continue with navigation even if save fails
      }
      
      if (selectedType === 'GSTIN') {
        // For GSTIN, go to OTP verification screen
        // Use replace to prevent going back to GSTIN/PAN screen
        debouncedNavigate({
          pathname: '/auth/gstin-pan-otp',
          params: { 
            type: selectedType,
            value: inputValue,
            gstinData: JSON.stringify(verifiedGstinData),
            mobile: mobile
          }
        }, 'replace');
      } else {
        // For PAN, go to PAN details screen
        // Use replace to prevent going back to GSTIN/PAN screen
        debouncedNavigate({
          pathname: '/auth/gstin-pan-otp',
          params: { 
            type: selectedType,
            value: inputValue,
            mobile: mobile
          }
        }, 'replace');
      }
    } else {
      if (verificationError) {
        Alert.alert('Verification Failed', verificationError);
      } else {
        Alert.alert('Invalid Input', `Please enter a valid ${selectedType}`);
      }
    }
  };

  const switchToOtherType = () => {
    const otherType = selectedType === 'GSTIN' ? 'PAN' : 'GSTIN';
    handleTypeSwitch(otherType);
  };

  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer>
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
            keyboardType={keyboardType}
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


        <TouchableOpacity
          style={[
            styles.continueButton,
            (isValid && !isVerifying) ? styles.enabledButton : styles.disabledButton,
          ]}
          onPress={handleContinue}
          disabled={!isValid || isVerifying}
        >
          <Text style={[
            styles.continueButtonText,
            (isValid && !isVerifying) ? styles.enabledButtonText : styles.disabledButtonText,
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
});