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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, FileText, CreditCard } from 'lucide-react-native';
import { verifyGSTIN } from '../../services/gstinApi';

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
  const [selectedType, setSelectedType] = useState<'GSTIN' | 'PAN'>('GSTIN');
  const [inputValue, setInputValue] = useState('');
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
    // Auto-focus input after type switch
    setTimeout(() => {
      // Focus will be handled by the input field's autoFocus prop
    }, 100);
  };

  const verifyGSTINNumber = async (gstinNumber: string) => {
    if (isVerifying) return; // Prevent multiple simultaneous calls
    
    setIsVerifying(true);
    setVerificationError(null);
    
    try {
      const result = await verifyGSTIN(gstinNumber);
      
      if (result.error) {
        setVerificationError(result.message || 'GSTIN verification failed');
        setIsValid(false);
      } else if (result.taxpayerInfo) {
        // GSTIN is valid and verified
        setVerifiedGstinData(result.taxpayerInfo);
        setIsValid(true);
        setVerificationError(null);
      } else {
        setVerificationError('Invalid GSTIN number');
        setIsValid(false);
      }
    } catch (error) {
      setVerificationError('Network error. Please check your connection and try again.');
      setIsValid(false);
    } finally {
      setIsVerifying(false);
    }
  };

  const handleContinue = () => {
    if (isValid && !isVerifying) {
      if (selectedType === 'GSTIN') {
        // For GSTIN, we already have verified data, so pass it directly to business details
        router.push({
          pathname: '/auth/business-details',
          params: { 
            type: selectedType,
            value: inputValue,
            gstinData: JSON.stringify(verifiedGstinData)
          }
        });
      } else {
        // For PAN, go to OTP verification first
        router.push({
          pathname: '/auth/gstin-pan-otp',
          params: { 
            type: selectedType,
            value: inputValue 
          }
        });
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

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
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

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              isValid && styles.validInput,
              (inputValue.length > 0 && !isValid) || verificationError ? styles.invalidInput : {},
              isVerifying && styles.verifyingInput,
            ]}
            placeholder={selectedType === 'GSTIN' ? '15AAAAA0000A1Z5' : 'AAAAA0000A'}
            placeholderTextColor={COLORS.gray}
            value={inputValue}
            onChangeText={handleInputChange}
            autoCapitalize="characters"
            autoCorrect={false}
            maxLength={selectedType === 'GSTIN' ? 15 : 10}
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
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
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
    marginBottom: 30,
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
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 16,
    color: COLORS.black,
    fontFamily: 'monospace',
    letterSpacing: 1,
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