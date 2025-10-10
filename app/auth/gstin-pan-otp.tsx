import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Shield, User, CreditCard, Calendar } from 'lucide-react-native';
import { useStatusBar } from '@/contexts/StatusBarContext';
import CustomDatePicker from '@/components/CustomDatePicker';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';

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

export default function GstinPanOTPScreen() {
  const { setStatusBarStyle } = useStatusBar();
  const debouncedNavigate = useDebounceNavigation();
  const { type, value, gstinData } = useLocalSearchParams();
  const insets = useSafeAreaInsets();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);

  // Set status bar to dark for white background
  useEffect(() => {
    setStatusBarStyle('dark-content');
  }, [setStatusBarStyle]);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);
  
  // PAN-specific fields
  const [panName, setPanName] = useState('');
  const [dateOfBirth, setDateOfBirth] = useState<Date | null>(null);
  const [dobText, setDobText] = useState('');
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [hasSelectedDate, setHasSelectedDate] = useState(false);
  const panNameInputRef = useRef<TextInput>(null);
  const dobInputRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-focus first input on mount for GSTIN
    // For PAN, auto-focus on the Full Name field
    setTimeout(() => {
      if (type === 'GSTIN') {
        inputRefs.current[0]?.focus();
      } else if (type === 'PAN') {
        panNameInputRef.current?.focus();
      }
    }, 300);
  }, [type]);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  useEffect(() => {
    // Auto-verify when all 6 digits are entered (only for GSTIN)
    if (type === 'GSTIN' && otp.every(digit => digit !== '') && !isVerifying) {
      verifyOTP();
    }
  }, [otp, type]);

  const handleOtpChange = (text: string, index: number) => {
    const newOtp = [...otp];
    newOtp[index] = text;
    setOtp(newOtp);

    // Move to next input
    if (text && index < 5) {
      inputRefs.current[index + 1]?.focus();
    }
  };

  const handleKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      const newOtp = [...otp];
      if (otp[index]) {
        // Clear current field if it has a value
        newOtp[index] = '';
        setOtp(newOtp);
      } else if (index > 0) {
        // Move to previous field and clear it
        newOtp[index - 1] = '';
        setOtp(newOtp);
        setTimeout(() => {
          inputRefs.current[index - 1]?.focus();
        }, 10);
      }
    }
  };

  const validatePanForm = () => {
    if (type === 'PAN') {
      return panName.trim().length > 0 && dateOfBirth !== null;
    }
    return true; // For GSTIN, no additional validation needed
  };

  const handlePanVerification = async () => {
    if (!validatePanForm()) {
      Alert.alert('Incomplete Details', 'Please enter your name and date of birth');
      return;
    }
    
    setIsVerifying(true);
    
    // PAN verification using Name and DOB (no OTP needed)
    setTimeout(() => {
      // Use replace to prevent going back to PAN details screen after verification
      debouncedNavigate({
        pathname: '/auth/business-details',
        params: { 
          type: type,
          value: value,
          panName: panName.trim(),
          panDob: dateOfBirth?.toISOString() || '',
        }
      }, 'replace');
      setIsVerifying(false);
    }, 1000);
  };

  const verifyOTP = async () => {
    if (type === 'PAN' && !validatePanForm()) {
      Alert.alert('Incomplete Details', 'Please enter your name and date of birth');
      return;
    }
    
    setIsVerifying(true);
    const otpCode = otp.join('');
    
    if (type === 'GSTIN') {
      // Use demo OTP 654321 for GSTIN verification
      setTimeout(() => {
        if (otpCode === '654321') {
          // Use replace to prevent going back to OTP screen after verification
          debouncedNavigate({
            pathname: '/auth/business-details',
            params: { 
              type: type,
              value: value,
              gstinData: gstinData,
            }
          }, 'replace');
        } else {
          setOtp(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
          Alert.alert('Invalid OTP', 'Please enter the correct verification code');
        }
        setIsVerifying(false);
      }, 1000);
    } else {
      // PAN - should not reach here as PAN uses handlePanVerification
      Alert.alert('Error', 'Invalid verification method');
      setIsVerifying(false);
    }
  };
  
  const useGSTIN = () => {
    // Replace current screen with GSTIN/PAN selection screen
    // This prevents going back to PAN verification screen
    router.replace('/auth/gstin-pan');
  };
  
  const formatDate = (date: Date | null) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  };
  
  const handleDobTextChange = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/[^0-9]/g, '');
    
    // Format as DD/MM/YYYY
    let formatted = '';
    if (cleaned.length > 0) {
      formatted = cleaned.substring(0, 2);
      if (cleaned.length >= 3) {
        formatted += '/' + cleaned.substring(2, 4);
      }
      if (cleaned.length >= 5) {
        formatted += '/' + cleaned.substring(4, 8);
      }
    }
    
    setDobText(formatted);
    
    // Parse and validate complete date
    if (cleaned.length === 8) {
      const day = parseInt(cleaned.substring(0, 2), 10);
      const month = parseInt(cleaned.substring(2, 4), 10);
      const year = parseInt(cleaned.substring(4, 8), 10);
      
      // Validate date components
      if (
        day >= 1 && day <= 31 &&
        month >= 1 && month <= 12 &&
        year >= 1950 && year <= new Date().getFullYear()
      ) {
        const date = new Date(year, month - 1, day);
        
        // Check if date is valid (handles invalid dates like Feb 30)
        if (
          date.getDate() === day &&
          date.getMonth() === month - 1 &&
          date.getFullYear() === year &&
          date <= new Date()
        ) {
          setDateOfBirth(date);
          setHasSelectedDate(true);
        }
      }
    } else {
      // Clear date if input is incomplete
      if (dateOfBirth !== null) {
        setDateOfBirth(null);
        setHasSelectedDate(false);
      }
    }
  };
  
  const handleDatePickerDone = () => {
    if (hasSelectedDate || dateOfBirth) {
      setShowDatePicker(false);
      // Update text field with selected date
      if (dateOfBirth) {
        setDobText(formatDate(dateOfBirth));
      }
    }
  };
  
  const handleOpenDatePicker = () => {
    setShowDatePicker(true);
    // If there's already a date, enable the done button
    if (dateOfBirth) {
      setHasSelectedDate(true);
    }
  };

  const resendOTP = () => {
    setCountdown(30);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    inputRefs.current[0]?.focus();
    Alert.alert('OTP Sent', `A new verification code has been sent for ${type} verification`);
  };

  const changeGstinPan = () => {
    router.back();
  };

  const maskedValue = value ? 
    (type === 'GSTIN' ? 
      `${String(value).slice(0, 4)}***********` : 
      `${String(value).slice(0, 3)}*******`) : 
    '';

  return (
    <SafeAreaView style={[styles.container, { paddingTop: insets.top }]}>
      <KeyboardAvoidingView 
        style={styles.keyboardAvoidingView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView 
          style={styles.content}
          contentContainerStyle={[styles.scrollContent, { paddingTop: 20 }]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
        <View style={[styles.iconContainer, { marginTop: Math.max(insets.top - 44, 20) }]}>
          <View style={styles.iconCircle}>
            <Shield size={32} color={COLORS.primary} />
          </View>
        </View>

        <Text style={styles.title}>Verify {type}</Text>
        <Text style={styles.subtitle}>
          {type === 'PAN' 
            ? `Enter your details for PAN verification` 
            : `Enter the 6-digit OTP for GSTIN verification`}
        </Text>

        {/* PAN-specific fields */}
        {type === 'PAN' && (
          <View style={styles.panFieldsContainer}>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>PAN Number *</Text>
              <View style={styles.inputContainer}>
                <CreditCard size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  style={styles.panInput}
                  value={value as string}
                  editable={false}
                  placeholderTextColor={COLORS.gray}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name (as per PAN) *</Text>
              <View style={styles.inputContainer}>
                <User size={20} color={COLORS.gray} style={styles.inputIcon} />
                <TextInput
                  ref={panNameInputRef}
                  style={styles.panInput}
                  placeholder="Enter your full name"
                  value={panName}
                  onChangeText={setPanName}
                  autoCapitalize="words"
                  placeholderTextColor={COLORS.gray}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Date of Birth *</Text>
              <View style={styles.dateInputWrapper}>
                <TextInput
                  ref={dobInputRef}
                  style={styles.dateInput}
                  value={dobText}
                  onChangeText={handleDobTextChange}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#999999"
                  keyboardType="default"
                  maxLength={10}
                  returnKeyType="done"
                  contextMenuHidden={true}
                  selectTextOnFocus={false}
                />
                <TouchableOpacity
                  style={styles.calendarButton}
                  onPress={handleOpenDatePicker}
                  activeOpacity={0.7}
                >
                  <Calendar size={20} color={COLORS.primary} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Continue Button for PAN */}
            <TouchableOpacity 
              style={[
                styles.continueButton,
                validatePanForm() ? styles.enabledButton : styles.disabledButton
              ]}
              onPress={handlePanVerification}
              disabled={!validatePanForm() || isVerifying}
              activeOpacity={0.8}
            >
              <Text style={[
                styles.continueButtonText,
                validatePanForm() ? styles.enabledButtonText : styles.disabledButtonText
              ]}>
                {isVerifying ? 'Verifying...' : 'Continue'}
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* OTP fields - only for GSTIN */}
        {type === 'GSTIN' && (
          <>
            <View style={styles.otpContainer}>
              {otp.map((digit, index) => (
                <TextInput
                  key={index}
                  ref={(ref) => {
                    if (ref) inputRefs.current[index] = ref;
                  }}
                  style={[
                    styles.otpInput,
                    digit && styles.filledInput,
                    isVerifying && styles.verifyingInput,
                  ]}
                  value={digit}
                  onChangeText={(text) => handleOtpChange(text.slice(-1), index)}
                  onKeyPress={(e) => handleKeyPress(e, index)}
                  keyboardType="numeric"
                  maxLength={1}
                  textAlign="center"
                />
              ))}
            </View>

            {isVerifying && (
              <View style={styles.verifyingContainer}>
                <Text style={styles.verifyingText}>Verifying {type}...</Text>
              </View>
            )}

            <View style={styles.resendContainer}>
              {canResend ? (
                <TouchableOpacity style={styles.resendButton} onPress={resendOTP}>
                  <Text style={styles.resendText}>Resend OTP</Text>
                </TouchableOpacity>
              ) : (
                <Text style={styles.countdownText}>
                  Resend code in {countdown}s
                </Text>
              )}
            </View>
          </>
        )}

        {/* Action buttons */}
        <View style={styles.actionButtonsContainer}>
          {type === 'GSTIN' && (
            <TouchableOpacity style={styles.changeButton} onPress={changeGstinPan}>
              <Text style={styles.changeButtonText}>Change {type}</Text>
            </TouchableOpacity>
          )}

          {type === 'PAN' && (
            <TouchableOpacity style={styles.useGstinButton} onPress={useGSTIN}>
              <Text style={styles.useGstinButtonText}>Use GSTIN Instead</Text>
            </TouchableOpacity>
          )}
        </View>

        {type === 'GSTIN' && (
          <View style={styles.demoContainer}>
            <Text style={styles.demoText}>
              Demo: Use OTP 654321
            </Text>
          </View>
        )}
        </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {showDatePicker && type === 'PAN' && (
        <Modal
          transparent={true}
          animationType="slide"
          visible={showDatePicker}
          onRequestClose={handleDatePickerDone}
        >
          <TouchableOpacity 
            style={styles.datePickerModal}
            activeOpacity={1}
            onPress={() => {
              // Close modal only if date has been selected
              if (hasSelectedDate) {
                handleDatePickerDone();
              }
            }}
          >
            <TouchableOpacity 
              style={styles.datePickerContainer}
              activeOpacity={1}
              onPress={(e) => {
                // Prevent closing when tapping inside the picker
                e.stopPropagation();
              }}
            >
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select Date of Birth</Text>
                <TouchableOpacity
                  style={styles.datePickerDone}
                  onPress={handleDatePickerDone}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <CustomDatePicker
                value={dateOfBirth || new Date(2000, 0, 1)}
                onChange={(date) => {
                  setDateOfBirth(date);
                  setHasSelectedDate(true);
                }}
                maximumDate={new Date()}
                minimumDate={new Date(1950, 0, 1)}
                textColor={COLORS.primary}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}
    </SafeAreaView>
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
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
    marginTop: 0, // Will be overridden by inline style
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
  otpContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
  },
  otpInput: {
    width: 45,
    height: 55,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    borderRadius: 8,
    fontSize: 20,
    fontWeight: '600',
    color: COLORS.black,
    textAlign: 'center',
  },
  filledInput: {
    borderColor: COLORS.primary,
    backgroundColor: '#F0F4FF',
  },
  verifyingInput: {
    borderColor: COLORS.success,
  },
  verifyingContainer: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  verifyingText: {
    color: '#047857',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  resendContainer: {
    alignItems: 'center',
    marginBottom: 30,
  },
  resendButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
  },
  countdownText: {
    color: COLORS.gray,
    fontSize: 16,
  },
  actionButtonsContainer: {
    marginTop: 20,
    gap: 12,
  },
  changeButton: {
    alignItems: 'center',
    paddingVertical: 12,
  },
  changeButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
  useGstinButton: {
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 24,
    backgroundColor: COLORS.lightGray,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: COLORS.primary,
  },
  useGstinButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '700',
  },
  continueButton: {
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
    marginTop: 10,
  },
  enabledButton: {
    backgroundColor: COLORS.secondary,
  },
  disabledButton: {
    backgroundColor: COLORS.lightGray,
  },
  continueButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  enabledButtonText: {
    color: COLORS.primary,
  },
  disabledButtonText: {
    color: COLORS.gray,
  },
  demoContainer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  demoText: {
    color: '#92400E',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  // PAN-specific styles
  panFieldsContainer: {
    marginBottom: 30,
  },
  inputGroup: {
    marginBottom: 20,
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
    paddingVertical: 14,
    backgroundColor: COLORS.white,
  },
  inputIcon: {
    marginRight: 12,
  },
  panInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '500',
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: COLORS.white,
  },
  dateInput: {
    flex: 1,
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '500',
    paddingVertical: 12,
  },
  calendarButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Date Picker Modal styles
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
  },
  datePickerContainer: {
    backgroundColor: COLORS.white,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 30 : 20,
    paddingTop: Platform.OS === 'android' ? 10 : 0,
  },
  datePickerHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: COLORS.lightGray,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: COLORS.primary,
  },
  datePickerDone: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    backgroundColor: COLORS.secondary,
    borderRadius: 8,
  },
  datePickerDoneText: {
    fontSize: 16,
    fontWeight: '700',
    color: COLORS.primary,
  },
  datePicker: {
    width: '100%',
    height: Platform.OS === 'android' ? 200 : 216,
    backgroundColor: COLORS.white,
  },
});