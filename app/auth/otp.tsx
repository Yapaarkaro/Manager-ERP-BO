import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Shield, RotateCcw } from 'lucide-react-native';
import { useStatusBar } from '@/contexts/StatusBarContext';
import { dataStore } from '@/utils/dataStore';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { verifyMobileOTP, getSignupProgress } from '@/services/backendApi';
import { supabase, withTimeout } from '@/lib/supabase';

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

// Helper function to mask mobile number (show only last 4 digits)
const maskMobileNumber = (mobile: string | string[] | undefined): string => {
  if (!mobile || typeof mobile !== 'string') return '********';
  if (mobile.length < 4) return mobile;
  const lastFour = mobile.slice(-4);
  return '******' + lastFour;
};

export default function OTPScreen() {
  const { setStatusBarStyle } = useStatusBar();
  const insets = useSafeAreaInsets();
  const { mobile } = useLocalSearchParams();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);

  // Set status bar to dark for white background
  useEffect(() => {
    setStatusBarStyle('dark-content');
  }, [setStatusBarStyle]);
  const [canResend, setCanResend] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const inputRefs = useRef<TextInput[]>([]);

  useEffect(() => {
    // Auto-focus first input on mount
    setTimeout(() => {
      inputRefs.current[0]?.focus();
    }, 100);
  }, []);

  useEffect(() => {
    if (countdown > 0) {
      const timer = setTimeout(() => setCountdown(countdown - 1), 1000);
      return () => clearTimeout(timer);
    } else {
      setCanResend(true);
    }
  }, [countdown]);

  const [hasAutoVerified, setHasAutoVerified] = useState(false);

  useEffect(() => {
    // Auto-verify when all 6 digits are entered (only once)
    if (otp.every(digit => digit !== '') && !isVerifying && !hasAutoVerified) {
      setHasAutoVerified(true);
      verifyOTP();
    }
  }, [otp, isVerifying, hasAutoVerified]);

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

  const verifyOTP = async () => {
    if (isVerifying) return;
    
    setIsVerifying(true);
    const otpCode = otp.join('');
    const mobileNumber = mobile as string;
    
    try {
      const { callEdgeFunction, saveSignupProgress, saveDeviceSnapshot } = await import('@/services/backendApi');
      const { collectDeviceSnapshot } = await import('@/utils/deviceInfo');

      // Step 1: Verify OTP via edge function (has built-in 15s timeout)
      const otpResult = await callEdgeFunction('verify-mobile-otp', 'POST', {
        mobile: mobileNumber,
        otp: otpCode,
      }, false);

      if (!otpResult.success || otpResult.data?.error) {
        const errorMsg = otpResult.data?.error || otpResult.error || 'Invalid OTP';
        setOtp(['', '', '', '', '', '']);
        setHasAutoVerified(false);
        inputRefs.current[0]?.focus();
        Alert.alert('Verification Failed', errorMsg);
        setIsVerifying(false);
        return;
      }

      // Step 2: Prepare auth credentials via backend
      const authResult = await callEdgeFunction('auth-mobile-login', 'POST', {
        mobile: mobileNumber,
      }, false);

      if (!authResult.success || !authResult.data?.success) {
        const errorMsg = authResult.data?.error || authResult.error || 'Authentication setup failed';
        Alert.alert('Error', errorMsg);
        setIsVerifying(false);
        return;
      }

      const { email, password } = authResult.data;

      // Step 3: Sign in to get a real Supabase session (with timeout)
      const { data: signInData, error: signInError } = await withTimeout(
        supabase.auth.signInWithPassword({ email, password }),
        15000,
        'Sign in'
      );

      if (signInError || !signInData?.session) {
        Alert.alert('Error', 'Failed to sign in. Please try again.');
        setIsVerifying(false);
        return;
      }

      // Step 4: Save signup progress in background (fire-and-forget)
      saveSignupProgress({
        mobile: mobileNumber,
        mobileVerified: true,
        currentStep: 'mobileOtp',
      }).catch(() => {});

      // Step 5: Save device snapshot in background (fire-and-forget)
      collectDeviceSnapshot().then(snapshot => {
        if (snapshot.deviceId) {
          saveDeviceSnapshot({
            deviceId: snapshot.deviceId,
            deviceName: snapshot.deviceName,
            deviceBrand: snapshot.deviceBrand,
            deviceModel: snapshot.deviceModel,
            deviceType: snapshot.deviceType,
            deviceYearClass: snapshot.deviceYearClass,
            osName: snapshot.osName,
            osVersion: snapshot.osVersion,
            platformApiLevel: snapshot.platformApiLevel,
            networkServiceProvider: snapshot.networkServiceProvider,
            internetServiceProvider: snapshot.internetServiceProvider,
            wifiName: snapshot.wifiName,
            bluetoothName: snapshot.bluetoothName,
            manufacturer: snapshot.manufacturer,
            totalMemory: snapshot.totalMemory,
            isDevice: snapshot.isDevice,
            isEmulator: snapshot.isEmulator,
            isTablet: snapshot.isTablet,
            appVersion: snapshot.appVersion,
            appBuildNumber: snapshot.appBuildNumber,
          }).catch(() => {});
        }
      }).catch(() => {});

      // Step 6: Proceed to next step
      setIsVerifying(false);
      handleSuccessfulVerification(mobileNumber);
    } catch (error: any) {
      setOtp(['', '', '', '', '', '']);
      setHasAutoVerified(false);
      inputRefs.current[0]?.focus();
      const msg = error.message?.includes('timed out')
        ? 'Request timed out. Please check your connection and try again.'
        : error.message || 'Please try again.';
      Alert.alert('Verification Failed', msg);
      setIsVerifying(false);
    }
  };

  const handleSuccessfulVerification = async (mobileNumber: string) => {
    try {
      const { data: { session }, error: sessionError } = await withTimeout(
        supabase.auth.getSession(),
        10000,
        'Get session'
      );
      
      if (sessionError || !session?.user) {
        // No session -- fall through to fresh signup
      } else {
        const { data: userProfile, error: userError } = await withTimeout(
          supabase
            .from('users')
            .select('id, business_id, full_name, role')
            .eq('id', session.user.id)
            .maybeSingle(),
          10000,
          'Fetch user profile'
        );
        
        if (!userError && userProfile?.business_id) {
          // Returning user with completed signup -- prefetch in background, navigate immediately
          import('@/hooks/useBusinessData')
            .then(m => m.prefetchBusinessData())
            .catch(() => {});
          
          router.replace('/dashboard');
          return;
        }

        // No business_id -- check signup progress
        try {
          const progressResult = await withTimeout(
            getSignupProgress(),
            10000,
            'Get signup progress'
          );
          
          if (progressResult.success && progressResult.progress) {
            const progress = progressResult.progress;
            
            if (progress.business_id || progress.current_step === 'signupComplete' || progress.current_step === 'completed' || progress.current_step === 'complete') {
              import('@/hooks/useBusinessData')
                .then(m => m.prefetchBusinessData())
                .catch(() => {});
              
              router.replace('/dashboard');
              return;
            }
            
            await continueFromSignupProgress(progress, mobileNumber);
            return;
          }
        } catch {
          // Signup progress fetch failed -- start fresh
        }
      }
    } catch {
      // Session/profile check failed -- start fresh
    }
    
    router.replace({
      pathname: '/auth/gstin-pan',
      params: { mobile: mobileNumber },
    });
  };

  // Helper function to continue from signup progress
  const continueFromSignupProgress = async (progress: any, mobileNumber: string) => {
    const currentStep = progress.current_step;
    
    console.log('🔄 Continuing signup from step:', currentStep);
    
    // ✅ Backend is source of truth - no need to update dataStore
    // Progress is already in backend, will be loaded when needed
    
    // Navigate to appropriate screen based on current_step
    switch (currentStep) {
      case 'mobile':
      case 'mobileOtp':
      case 'gstinPan':
        router.replace({
          pathname: '/auth/gstin-pan',
          params: { mobile: mobileNumber }
        });
        break;
        
      case 'gstinOtp':
      case 'verifyPan':
        router.replace({
          pathname: '/auth/gstin-pan-otp',
          params: {
            type: progress.tax_id_type,
            value: progress.tax_id_value,
            gstinData: progress.gstin_data ? JSON.stringify(progress.gstin_data) : '',
            mobile: mobileNumber,
          }
        });
        break;
        
      case 'primaryAddress':
      case 'businessDetails':
        router.replace({
          pathname: '/auth/business-details',
          params: {
            type: progress.tax_id_type,
            value: progress.tax_id_value,
            gstinData: progress.gstin_data ? JSON.stringify(progress.gstin_data) : '',
            panName: progress.owner_name,
            panDob: progress.owner_dob || '',
            mobile: mobileNumber,
          }
        });
        break;
        
      case 'addressManagement':
      case 'addressManagement':
      case 'address':
        router.replace({
          pathname: '/auth/address-confirmation',
          params: {
            type: progress.tax_id_type,
            value: progress.tax_id_value,
            gstinData: progress.gstin_data ? JSON.stringify(progress.gstin_data) : '',
            name: progress.owner_name,
            businessName: progress.business_name,
            businessType: progress.business_type,
            mobile: mobileNumber,
            addressType: 'primary',
          }
        });
        break;
        
      case 'primaryBank':
      case 'bankManagement':
      case 'banking':
        router.replace({
          pathname: '/auth/banking-details',
          params: {
            type: progress.tax_id_type,
            value: progress.tax_id_value,
            gstinData: progress.gstin_data ? JSON.stringify(progress.gstin_data) : '',
            name: progress.owner_name,
            businessName: progress.business_name,
            businessType: progress.business_type,
            mobile: mobileNumber,
          }
        });
        break;
        
      case 'finalSetup':
        router.replace({
          pathname: '/auth/final-setup',
          params: {
            type: progress.tax_id_type,
            value: progress.tax_id_value,
            gstinData: progress.gstin_data ? JSON.stringify(progress.gstin_data) : '',
            name: progress.owner_name,
            businessName: progress.business_name,
            businessType: progress.business_type,
            mobile: mobileNumber,
          }
        });
        break;
        
      case 'businessSummary':
      case 'summary':
        router.replace({
          pathname: '/auth/business-summary',
          params: {
            type: progress.tax_id_type,
            value: progress.tax_id_value,
            gstinData: progress.gstin_data ? JSON.stringify(progress.gstin_data) : '',
            name: progress.owner_name,
            businessName: progress.business_name,
            businessType: progress.business_type,
            mobile: mobileNumber,
          }
        });
        break;
        
      case 'signupComplete':
      case 'completed':
      case 'complete':
        // Signup is complete, redirect to dashboard
        router.replace('/dashboard');
        break;
        
      default:
        // Start from GSTIN/PAN selection
        router.replace({
          pathname: '/auth/gstin-pan',
          params: { mobile: mobileNumber }
        });
    }
  };

  const resendOTP = async () => {
    setCountdown(30);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    setHasAutoVerified(false);
    inputRefs.current[0]?.focus();
    console.log('📱 OTP resend requested.');
    Alert.alert('OTP Sent', 'A new verification code has been sent to your mobile number.');
  };

  const changeMobileNumber = () => {
    router.back();
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
            <Shield size={32} color={COLORS.primary} />
          </View>
        </View>

        <Text style={styles.title}>Verify Mobile Number</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}+91 {maskMobileNumber(mobile)}
        </Text>

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
                Platform.select({
                  web: {
                    outlineWidth: 0,
                    outlineColor: 'transparent',
                    outlineStyle: 'none',
                  },
                }) as any,
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
            <Text style={styles.verifyingText}>Verifying...</Text>
          </View>
        )}

        <View style={styles.resendContainer}>
          {canResend ? (
            <TouchableOpacity style={styles.resendButton} onPress={resendOTP}>
              <RotateCcw size={16} color={COLORS.primary} />
              <Text style={styles.resendText}>Resend OTP</Text>
            </TouchableOpacity>
          ) : (
            <Text style={styles.countdownText}>
              Resend code in {countdown}s
            </Text>
          )}
        </View>

        <TouchableOpacity style={styles.changeMobileButton} onPress={changeMobileNumber}>
          <Text style={styles.changeMobileText}>Change Mobile Number</Text>
        </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 20,
    backgroundColor: COLORS.lightGray,
    borderRadius: 8,
  },
  resendText: {
    color: COLORS.primary,
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  countdownText: {
    color: COLORS.gray,
    fontSize: 16,
  },
  changeMobileButton: {
    alignItems: 'center',
    marginTop: 20,
  },
  changeMobileText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
});