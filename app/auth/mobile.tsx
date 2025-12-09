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
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Phone } from 'lucide-react-native';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { useStatusBar } from '@/contexts/StatusBarContext';
import { dataStore } from '@/utils/dataStore';
import { getInputFocusStyles, getWebContainerStyles } from '@/utils/platformUtils';
import { supabase } from '@/lib/supabase';
import { saveSignupProgress } from '@/services/backendApi';

const COLORS = {
  primary: '#3F66AC',
  secondary: '#F5C754',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
};

export default function MobileScreen() {
  const { setStatusBarStyle } = useStatusBar();
  const insets = useSafeAreaInsets();
  const [mobileNumber, setMobileNumber] = useState('');
  const [isValid, setIsValid] = useState(false);
  const [isReturningUser, setIsReturningUser] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const [isNavigating, setIsNavigating] = useState(false);
  const mobileInputRef = useRef<TextInput>(null);

  // Set status bar to dark for white background
  useEffect(() => {
    setStatusBarStyle('dark-content');
  }, [setStatusBarStyle]);

  // Check for returning user when mobile number changes
  useEffect(() => {
    const checkReturningUser = async () => {
      if (mobileNumber.length === 10 && /^\d{10}$/.test(mobileNumber)) {
        try {
          console.log('🔍 Checking for returning user with mobile:', mobileNumber);
          
          // ✅ First check backend to see if user has completed signup
          // Note: We can't check backend before OTP verification, so we'll check after OTP
          // This check is mainly for UI indication (showing "Welcome back" message)
          // The actual backend check happens in OTP screen after verification
          
          // Fallback to local dataStore check
          const userAccount = dataStore.getUserAccountByMobile(mobileNumber);
          
          if (userAccount) {
            setIsReturningUser(true);
            console.log('👋 Welcome back! Found existing account locally for:', mobileNumber);
          } else {
            // Check if user has incomplete signup progress
            const existingProgress = await dataStore.getSignupProgressByMobile(mobileNumber);
            if (existingProgress && existingProgress.ownerName) {
              setIsReturningUser(true);
              console.log('👋 Welcome back! Found incomplete signup locally for:', mobileNumber);
            } else {
              setIsReturningUser(false);
              console.log('📭 No existing data found for mobile:', mobileNumber);
            }
          }
        } catch (error) {
          console.error('Error checking returning user:', error);
          setIsReturningUser(false);
        }
      } else {
        setIsReturningUser(false);
      }
    };
    checkReturningUser();
  }, [mobileNumber]);

  useEffect(() => {
    // Auto-navigate when 10 digits are entered (only once)
    if (mobileNumber.length === 10 && /^\d{10}$/.test(mobileNumber) && !isNavigating) {
      setIsValid(true);
      setIsNavigating(true);
      
      // Send OTP via Supabase Auth
      const sendOTP = async () => {
        try {
          const phoneNumber = `+91${mobileNumber}`;
          const { error } = await supabase.auth.signInWithOtp({
            phone: phoneNumber,
          });
          
          if (error && !error.message.includes('already sent')) {
            console.error('Error sending OTP:', error);
            Alert.alert('Error', 'Failed to send OTP. Please try again.');
            setIsNavigating(false);
            setIsValid(false);
            return;
          }
          
          console.log('✅ OTP sent successfully to', phoneNumber);
          
          // Note: Can't save signup progress here - user not authenticated yet
          // Progress will be saved after OTP verification in otp.tsx
          
          // Navigate to OTP screen
          router.push({
            pathname: '/auth/otp',
            params: { mobile: mobileNumber }
          });
        } catch (error: any) {
          console.error('Error in sendOTP:', error);
          Alert.alert('Error', 'Failed to send OTP. Please try again.');
          setIsNavigating(false);
          setIsValid(false);
        }
      };
      
      sendOTP();
    } else if (mobileNumber.length !== 10) {
      setIsValid(false);
      setIsNavigating(false);
    }
  }, [mobileNumber, isNavigating]);

  const handleMobileChange = (text: string) => {
    // Only allow numbers and limit to 10 digits
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(cleaned);
  };


  const inputFocusStyles = getInputFocusStyles();
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
        >
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Phone size={32} color={COLORS.primary} />
          </View>
        </View>

        <Text style={styles.title}>Enter Mobile Number</Text>
        <Text style={styles.subtitle}>
          We'll send you a verification code to confirm your mobile number
        </Text>

        <TouchableOpacity
          activeOpacity={1}
          onPress={() => mobileInputRef.current?.focus()}
          style={[
            styles.inputContainer,
            {
              flexDirection: 'row',
              alignItems: 'center',
              borderWidth: 2,
              borderColor: isFocused 
                ? COLORS.primary 
                : (isValid 
                  ? '#10B981' 
                  : (mobileNumber.length > 0 && mobileNumber.length < 10 
                    ? COLORS.error 
                    : '#E5E7EB')),
              borderRadius: 12,
              paddingHorizontal: 0,
              backgroundColor: COLORS.white,
              ...Platform.select({
                web: {
                  transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
                },
                default: {
                  minHeight: 50,
                },
              }),
              ...(isFocused && Platform.OS === 'web' ? {
                boxShadow: '0 0 0 3px rgba(63, 102, 172, 0.12)',
              } : {}),
              ...(isFocused && Platform.OS !== 'web' ? {
                shadowColor: COLORS.primary,
                shadowOffset: { width: 0, height: 4 },
                shadowOpacity: 0.12,
                shadowRadius: 8,
                elevation: 4,
              } : {}),
            },
          ]}
        >
          <View style={styles.prefixContainer}>
            <Text style={styles.prefixText}>+91</Text>
          </View>
          <TextInput
            ref={mobileInputRef}
            style={[
              styles.mobileInput,
              Platform.select({
                web: {
                  outlineWidth: 0,
                  outlineColor: 'transparent',
                  outlineStyle: 'none',
                },
              }),
            ]}
            placeholder="Enter mobile number"
            placeholderTextColor={COLORS.gray}
            value={mobileNumber}
            onChangeText={handleMobileChange}
            keyboardType="numeric"
            maxLength={10}
            autoFocus={Platform.OS !== 'web'}
            textAlign="left"
            editable={true}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </TouchableOpacity>

        {isReturningUser && mobileNumber.length === 10 && (
          <View style={styles.returningUserContainer}>
            <Text style={styles.returningUserText}>
              👋 Welcome back! Redirecting you to your account...
            </Text>
          </View>
        )}

        {isValid && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>
              {isReturningUser 
                ? 'Welcome back! Redirecting to your account...'
                : 'Proceeding to verification...'
              }
            </Text>
          </View>
        )}

        {/* Privacy Policy and Terms */}
        <View style={[styles.legalContainer, { paddingBottom: Platform.select({
          web: 20,
          default: Math.max(insets.bottom, 20),
        })}]}>
          <Text style={styles.legalText}>
            By continuing, you agree to our{' '}
            <Text style={styles.legalLink}>Privacy Policy</Text>
            {' '}and{' '}
            <Text style={styles.legalLink}>Terms & Conditions</Text>
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
      web: 24,
      default: 16, // Match dashboard and all-invoices page padding
    }),
    paddingTop: Platform.select({
      web: 20,
      default: 16,
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
      web: 16,
      default: 12,
    }),
    lineHeight: 22,
  },
  testInfo: {
    fontSize: 14,
    color: COLORS.primary,
    textAlign: 'center',
    marginBottom: Platform.select({
      web: 32,
      default: 20,
    }),
            paddingHorizontal: Platform.select({
              web: 20,
              default: 16, // Match dashboard and all-invoices page padding
            }),
    fontStyle: 'italic',
  },
  inputContainer: {
    marginBottom: 16,
  },
  prefixContainer: {
    paddingLeft: 16,
    paddingRight: 8,
    paddingVertical: Platform.OS === 'web' ? 14 : 18,
    borderRightWidth: 1,
    borderRightColor: '#E5E7EB',
    justifyContent: 'center',
    alignItems: 'center',
    pointerEvents: 'none', // Make prefix non-interactive
  },
  prefixText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.black,
  },
  mobileInput: {
    flex: 1,
    paddingHorizontal: 12,
    paddingVertical: Platform.OS === 'web' ? 14 : 18,
    fontSize: 16,
    color: COLORS.black,
    backgroundColor: 'transparent',
    ...Platform.select({
      default: {
        minHeight: 50,
      },
    }),
  },
  input: {
    // Base input styles are in inputFocusStyles.input
  },
  validInputContainer: {
    borderColor: '#10B981',
  },
  invalidInputContainer: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
  },
  returningUserContainer: {
    backgroundColor: '#DBEAFE',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: '#3B82F6',
  },
  returningUserText: {
    color: '#1E40AF',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  successContainer: {
    backgroundColor: '#D1FAE5',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 20,
  },
  successText: {
    color: '#047857',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
  legalContainer: {
    marginTop: 'auto',
    paddingTop: 24,
    paddingHorizontal: 16,
  },
  legalText: {
    fontSize: 12,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 18,
  },
  legalLink: {
    color: COLORS.primary,
    textDecorationLine: 'underline',
    fontWeight: '500',
  },
});