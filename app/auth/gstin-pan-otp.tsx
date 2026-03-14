import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import CapitalizedTextInput from '@/components/CapitalizedTextInput';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Shield, User, CreditCard, Calendar } from 'lucide-react-native';
import { useStatusBar } from '@/contexts/StatusBarContext';
import CustomDatePicker from '@/components/CustomDatePicker';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { verifyGSTINOTP, verifyPAN, saveSignupProgress } from '@/services/backendApi';
import { supabase } from '@/lib/supabase';
import { autoFormatDateInput, parseDDMMYYYY } from '@/utils/formatters';
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

export default function GstinPanOTPScreen() {
  const { setStatusBarStyle } = useStatusBar();
  const params = useLocalSearchParams();
  const signupData = getSignupData();
  const type = (params.type as string) || signupData.type || '';
  const value = (params.value as string) || signupData.value || '';
  const gstinData = params.gstinData || signupData.gstinData || '';
  const mobile = (params.mobile as string) || signupData.mobile || '';
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
  
  // PAN number edit state
  const [isEditingPan, setIsEditingPan] = useState(false);
  const [editablePanValue, setEditablePanValue] = useState(value as string);
  const panNumberInputRef = useRef<TextInput>(null);

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
    
    // If PAN is being edited, validate it before proceeding
    if (isEditingPan) {
      const trimmedValue = editablePanValue.trim().toUpperCase();
      if (trimmedValue.length !== 10 || !/^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmedValue)) {
        Alert.alert('Invalid PAN', 'Please enter a valid 10-character PAN number (e.g., ABCDE1234F)');
        return;
      }
    }
    
    setIsVerifying(true);
    
    // Always use the editable PAN value (it's initialized with the original value)
    const panValue = editablePanValue.trim().toUpperCase();
    const panNameValue = panName.trim();
    const dobValue = dateOfBirth ? dateOfBirth.toISOString().split('T')[0] : '';
    
    try {
      // Call backend API to verify PAN
      const result = await verifyPAN(panValue, panNameValue, dobValue);
      
      if (result.success && result.panVerified) {
        // ✅ Save signup progress to backend (PAN verified, moving to businessDetails)
        // ✅ Optimistically save signup progress (non-blocking)
        (async () => {
          try {
            const { data: { session } } = await supabase.auth.getSession();
            if (session?.user) {
              const { optimisticSaveSignupProgress } = await import('@/utils/optimisticSync');
              optimisticSaveSignupProgress({
                mobile: mobile as string,
                mobileVerified: true,
                taxIdType: 'PAN',
                taxIdValue: panValue,
                taxIdVerified: true,
                ownerName: panNameValue,
                ownerDob: dobValue,
                currentStep: 'verifyPan',
              });
            }
          } catch (error) {
            console.error('Error saving signup progress:', error);
          }
        })();
        
        // Navigate immediately (no delay)
        setSignupData({
          type: type,
          value: panValue,
          panName: panNameValue,
          panDob: dateOfBirth ? 
            `${dateOfBirth.getFullYear()}-${String(dateOfBirth.getMonth() + 1).padStart(2, '0')}-${String(dateOfBirth.getDate()).padStart(2, '0')}` : '',
          mobile: mobile,
        });
        router.replace('/auth/business-details');
      } else {
        Alert.alert('Verification Failed', result.error || 'PAN verification failed. Please check your details and try again.');
      }
    } catch (error: any) {
      console.error('PAN verification error:', error);
      Alert.alert('Verification Failed', error.message || 'Unable to verify PAN. Please check your connection and try again.');
    } finally {
      setIsVerifying(false);
    }
  };

  const verifyOTP = async () => {
    if (type === 'PAN' && !validatePanForm()) {
      Alert.alert('Incomplete Details', 'Please enter your name and date of birth');
      return;
    }
    
    setIsVerifying(true);
    const otpCode = otp.join('');
    const gstinValue = value as string;
    
    if (type === 'GSTIN') {
      // Optimize: Navigate immediately, handle verification in background
      const verifyPromise = verifyGSTINOTP(gstinValue, otpCode);
      
      verifyPromise.then(async (result) => {
        if (result.success && result.gstinVerified) {
          // ✅ Save signup progress to backend (non-blocking)
          supabase.auth.getSession().then(async ({ data: { session } }) => {
            if (session?.user) {
              saveSignupProgress({
                mobile: mobile as string,
                mobileVerified: true,
                taxIdType: 'GSTIN',
                taxIdValue: gstinValue,
                taxIdVerified: true,
                gstinData: typeof gstinData === 'string' ? JSON.parse(gstinData) : gstinData,
                currentStep: 'gstinOtp',
              }).then((result) => {
                if (result.success) {
                  console.log('✅ Signup progress saved: gstinOtp');
                } else {
                  console.error('❌ Failed to save signup progress:', result.error);
                }
              }).catch((error) => {
                console.error('Error saving signup progress:', error);
              });
            }
          }).catch((error) => {
            console.error('Error getting session:', error);
          });
          
          // Navigate immediately (don't wait for signup progress save)
          setIsVerifying(false);
          setSignupData({
            type: type,
            value: gstinValue,
            gstinData: gstinData,
            mobile: mobile,
          });
          router.replace('/auth/business-details');
        } else {
          setOtp(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
          Alert.alert('Invalid OTP', result.error || 'Please enter the correct verification code');
          setIsVerifying(false);
        }
      }).catch((error: any) => {
        console.error('GSTIN OTP verification error:', error);
        setOtp(['', '', '', '', '', '']);
        inputRefs.current[0]?.focus();
        Alert.alert('Verification Failed', error.message || 'Unable to verify OTP. Please check your connection and try again.');
        setIsVerifying(false);
      });
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
    const formatted = autoFormatDateInput(text, '/');
    setDobText(formatted);
    
    if (formatted.length === 10) {
      const parsed = parseDDMMYYYY(formatted);
      if (parsed && parsed <= new Date() && parsed.getFullYear() >= 1950) {
        setDateOfBirth(parsed);
        setHasSelectedDate(true);
      } else {
        setDateOfBirth(null);
        setHasSelectedDate(false);
      }
    } else if (dateOfBirth !== null) {
      setDateOfBirth(null);
      setHasSelectedDate(false);
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
    router.canGoBack() ? router.back() : router.replace('/auth/gstin-pan');
  };

  const maskedValue = value ? 
    (type === 'GSTIN' ? 
      `${String(value).slice(0, 4)}***********` : 
      `${String(value).slice(0, 3)}*******`) : 
    '';

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
            },
            Platform.OS === 'web' ? webContainerStyles.webScrollContent : {}
          ]}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.iconContainer}>
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
                  ref={panNumberInputRef}
                  style={[
                    styles.panInput,
                    Platform.select({
                      web: {
                        outlineWidth: 0,
                        outlineColor: 'transparent',
                      },
                    }) as any,
                  ]}
                  value={isEditingPan ? editablePanValue : (value as string)}
                  onChangeText={setEditablePanValue}
                  editable={isEditingPan}
                  placeholderTextColor={COLORS.gray}
                  autoCapitalize="characters"
                  maxLength={10}
                />
                {!isEditingPan ? (
                  <TouchableOpacity
                    style={styles.editButton}
                    onPress={() => {
                      setIsEditingPan(true);
                      setEditablePanValue(value as string);
                      setTimeout(() => {
                        panNumberInputRef.current?.focus();
                      }, 100);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.editButtonText}>Edit</Text>
                  </TouchableOpacity>
                ) : (
                  <View style={styles.editActions}>
                    <TouchableOpacity
                      style={styles.saveButton}
                      onPress={() => {
                        const trimmedValue = editablePanValue.trim().toUpperCase();
                        if (trimmedValue.length === 10 && /^[A-Z]{5}[0-9]{4}[A-Z]{1}$/.test(trimmedValue)) {
                          // Update the value and exit edit mode
                          setEditablePanValue(trimmedValue);
                          setIsEditingPan(false);
                          // The value will be used when continuing to business details
                        } else {
                          Alert.alert('Invalid PAN', 'Please enter a valid 10-character PAN number (e.g., ABCDE1234F)');
                        }
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.saveButtonText}>Save</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.cancelEditButton}
                      onPress={() => {
                        setIsEditingPan(false);
                        setEditablePanValue(value as string);
                      }}
                      activeOpacity={0.7}
                      hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
                    >
                      <Text style={styles.cancelEditButtonText}>Cancel</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Full Name (as per PAN) *</Text>
              <View style={styles.inputContainer}>
                <User size={20} color={COLORS.gray} style={styles.inputIcon} />
                <CapitalizedTextInput
                  ref={panNameInputRef}
                  style={[
                    styles.panInput,
                    Platform.select({
                      web: {
                        outlineWidth: 0,
                        outlineColor: 'transparent',
                      },
                    }) as any,
                  ]}
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
                  style={[
                    styles.dateInput,
                    Platform.select({
                      web: {
                        outlineWidth: 0,
                        outlineColor: 'transparent',
                      },
                    }) as any,
                  ]}
                  value={dobText}
                  onChangeText={handleDobTextChange}
                  placeholder="DD/MM/YYYY"
                  placeholderTextColor="#999999"
                  keyboardType="numeric"
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
              {dobText.length === 10 && !dateOfBirth && (
                <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 4 }}>Invalid date</Text>
              )}
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

      </ScrollView>
      </KeyboardAvoidingView>

      {/* Date Picker Modal */}
      {showDatePicker && type === 'PAN' && (
        <Modal
          transparent={true}
          animationType="fade"
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
      web: 40,
      default: 24,
    }),
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
    borderColor: '#E5E7EB',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 4,
    backgroundColor: COLORS.white,
    ...Platform.select({
      default: {
        position: 'relative',
        overflow: 'visible', // Allow absolutely positioned children to be visible and clickable
      },
    }),
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    backgroundColor: COLORS.primary,
    ...Platform.select({
      default: {
        position: 'absolute',
        right: 16,
        top: '50%',
        marginTop: -12, // Half of button height to center vertically
        marginLeft: 0, // Remove margin when absolutely positioned
      },
      web: {
        marginLeft: 8,
      },
    }),
  },
  editButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  inputIcon: {
    ...Platform.select({
      default: {
        position: 'absolute',
        left: 16,
        top: '50%',
        marginTop: -10, // Half of icon size (20/2) to center vertically
        zIndex: 10, // Much higher zIndex to ensure icon stays above input even when focused
        elevation: 10, // On Android, elevation is needed to ensure icon renders above input with elevation
        pointerEvents: 'none',
        marginRight: 0, // Remove margin when absolutely positioned
      },
      web: {
        marginRight: 8, // Reduced from 12 to 8 for tighter spacing
      },
    }),
  },
  panInput: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 16,
    color: COLORS.black,
    fontWeight: '500',
    ...Platform.select({
      default: {
        paddingLeft: 40, // Reduced space for icon (icon at left: 16, so 24px gap)
        paddingRight: 80, // Space for edit button on mobile
        borderWidth: 0, // Border is on container
        minHeight: 50,
        zIndex: 1, // Lower than icon to ensure icon stays visible
      },
      web: {
        paddingLeft: 8, // Reduced spacing on web - icon has marginRight: 8, so total is 16px
      },
    }),
  },
  dateInputWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: '#E5E7EB',
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
    paddingVertical: 14,
  },
  calendarButton: {
    padding: 8,
    marginLeft: 8,
  },
  // Date Picker Modal styles
  datePickerModal: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 20,
  },
  datePickerContainer: {
    backgroundColor: COLORS.white,
    borderRadius: 20,
    paddingBottom: Platform.select({
      web: 40,
      ios: 20,
      android: 20, // Consistent bottom padding across all platforms
      default: 20,
    }),
    paddingTop: Platform.select({
      web: 20,
      default: 16,
    }),
    maxWidth: 400,
    width: '100%',
    maxHeight: '80%',
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
  editActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    zIndex: 10,
    ...Platform.select({
      default: {
        position: 'absolute',
        right: 16,
        top: '50%',
        marginTop: -14, // Half of button height to center vertically
        marginLeft: 0, // Remove margin when absolutely positioned
        elevation: 10, // Android elevation
        pointerEvents: 'auto', // Ensure buttons can receive touches
      },
      web: {
        marginLeft: 8,
      },
    }),
  },
  saveButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.success,
    ...Platform.select({
      web: {
        transition: 'background-color 0.2s ease',
      },
    }),
  },
  saveButtonText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  cancelEditButton: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: COLORS.lightGray,
    borderWidth: 1,
    borderColor: COLORS.gray,
    ...Platform.select({
      web: {
        transition: 'background-color 0.2s ease',
      },
    }),
  },
  cancelEditButtonText: {
    color: COLORS.gray,
    fontSize: 14,
    fontWeight: '600',
  },
});