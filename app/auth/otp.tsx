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
import { supabase } from '@/lib/supabase';

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
    if (isVerifying) return; // Prevent multiple simultaneous calls
    
    setIsVerifying(true);
    const otpCode = otp.join('');
    const mobileNumber = mobile as string;
    
    try {
      // Step 1: Use Supabase OTP verification (phone + OTP flow)
      console.log('🔐 Verifying OTP with Supabase Auth...');
      const phoneNumber = `+91${mobileNumber}`;
      
      // Verify the OTP with Supabase (OTP was already sent from mobile screen)
      // Optimize: Use promise to avoid blocking
      const verifyPromise = supabase.auth.verifyOtp({
        phone: phoneNumber,
        token: otpCode,
        type: 'sms',
      });

      verifyPromise.then(async ({ data: verifyData, error: verifyError }: { data: any; error: any }) => {
        if (verifyError) {
          console.error('OTP verification error:', verifyError);
          setOtp(['', '', '', '', '', '']);
          setHasAutoVerified(false);
          inputRefs.current[0]?.focus();
          
          // Provide more helpful error messages
          let errorMessage = 'Please enter the correct verification code';
          if (verifyError.message?.includes('expired')) {
            errorMessage = 'OTP has expired. Please request a new code.';
          } else if (verifyError.message?.includes('invalid')) {
            errorMessage = 'Invalid OTP. Please check and try again.';
          } else if (verifyError.message?.includes('network') || verifyError.message?.includes('connection')) {
            errorMessage = 'Network error. Please check your connection and try again.';
          } else if (verifyError.message) {
            errorMessage = verifyError.message;
          }
          
          Alert.alert('Verification Failed', errorMessage);
          setIsVerifying(false);
          return;
        }

        if (!verifyData.session) {
          console.error('No session returned from OTP verification');
          setOtp(['', '', '', '', '', '']);
          setHasAutoVerified(false);
          inputRefs.current[0]?.focus();
          Alert.alert('Verification Failed', 'Unable to create session. Please try again.');
          setIsVerifying(false);
          return;
        }

        console.log('✅ OTP verified successfully with Supabase Auth');
        console.log('✅ JWT token obtained successfully');
        console.log('👤 User ID:', verifyData.session.user.id);
        console.log('🔑 Access Token:', verifyData.session.access_token.substring(0, 20) + '...');

        // ✅ Save signup progress first (await to ensure it's saved)
        try {
          const { saveSignupProgress } = await import('@/services/backendApi');
          await saveSignupProgress({
            mobile: mobileNumber,
            mobileVerified: true,
            currentStep: 'mobileOtp',
          });
          console.log('✅ Signup progress saved: mobileOtp');
        } catch (error) {
          console.error('Error saving signup progress:', error);
          // Continue even if progress save fails
        }

        // ✅ Save device snapshot in background (non-blocking)
        (async () => {
          try {
            const { collectDeviceSnapshot } = await import('@/utils/deviceInfo');
            const { saveDeviceSnapshot } = await import('@/services/backendApi');
            
            console.log('📱 Collecting device snapshot...');
            const deviceSnapshot = await collectDeviceSnapshot();
            console.log('📱 Device snapshot collected:', { deviceId: deviceSnapshot.deviceId, hasData: !!deviceSnapshot.deviceId });
            
            if (deviceSnapshot.deviceId) {
              console.log('📱 Saving device snapshot to backend...');
              const result = await saveDeviceSnapshot({
                deviceId: deviceSnapshot.deviceId,
                deviceName: deviceSnapshot.deviceName,
                deviceBrand: deviceSnapshot.deviceBrand,
                deviceModel: deviceSnapshot.deviceModel,
                deviceType: deviceSnapshot.deviceType,
                deviceYearClass: deviceSnapshot.deviceYearClass,
                osName: deviceSnapshot.osName,
                osVersion: deviceSnapshot.osVersion,
                platformApiLevel: deviceSnapshot.platformApiLevel,
                networkServiceProvider: deviceSnapshot.networkServiceProvider,
                internetServiceProvider: deviceSnapshot.internetServiceProvider,
                wifiName: deviceSnapshot.wifiName,
                bluetoothName: deviceSnapshot.bluetoothName,
                manufacturer: deviceSnapshot.manufacturer,
                totalMemory: deviceSnapshot.totalMemory,
                isDevice: deviceSnapshot.isDevice,
                isEmulator: deviceSnapshot.isEmulator,
                isTablet: deviceSnapshot.isTablet,
                appVersion: deviceSnapshot.appVersion,
                appBuildNumber: deviceSnapshot.appBuildNumber,
              });
              console.log('📱 Device snapshot save result:', { success: result.success, error: result.error, snapshotId: result.snapshot?.id });
              
              if (result.success) {
                console.log('✅ Device snapshot saved successfully:', result.snapshot?.id);
              } else {
                console.error('❌ Device snapshot save failed:', result.error);
              }
            } else {
              console.warn('⚠️ No deviceId in snapshot, cannot save');
            }
          } catch (error) {
            console.error('❌ Error in device snapshot save process:', error);
          }
        })().catch(err => console.error('Error in device snapshot save:', err));

        // Step 3: Proceed with verification check (after progress is saved)
        handleSuccessfulVerification(mobileNumber);
        setIsVerifying(false);
      }).catch((error: any) => {
        console.error('Error in OTP verification:', error);
        setOtp(['', '', '', '', '', '']);
        setHasAutoVerified(false);
        inputRefs.current[0]?.focus();
        
        // Provide more helpful error messages
        let errorMessage = 'Unable to verify OTP. Please check your connection and try again.';
        if (error.message?.includes('network') || error.message?.includes('connection') || error.message?.includes('fetch')) {
          errorMessage = 'Network error. Please check your internet connection and try again.';
        } else if (error.message?.includes('timeout')) {
          errorMessage = 'Request timed out. Please try again.';
        } else if (error.message) {
          errorMessage = error.message;
        }
        
        Alert.alert('Verification Failed', errorMessage);
        setIsVerifying(false);
      });
      
    } catch (error: any) {
      console.error('Error in OTP verification:', error);
      setOtp(['', '', '', '', '', '']);
      setHasAutoVerified(false);
      inputRefs.current[0]?.focus();
      
      // Provide more helpful error messages
      let errorMessage = 'Unable to verify OTP. Please check your connection and try again.';
      if (error.message?.includes('network') || error.message?.includes('connection') || error.message?.includes('fetch')) {
        errorMessage = 'Network error. Please check your internet connection and try again.';
      } else if (error.message?.includes('timeout')) {
        errorMessage = 'Request timed out. Please try again.';
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      Alert.alert('Verification Failed', errorMessage);
      setIsVerifying(false);
    }
  };

  const handleSuccessfulVerification = async (mobileNumber: string) => {
    try {
      // ✅ Check Supabase backend to see if user has completed signup
      console.log('🔍 Checking Supabase backend for user signup status...');
      
      // Get current session (user is authenticated after OTP verification)
      const { data: { session }, error: sessionError } = await supabase.auth.getSession();
      
      if (sessionError || !session || !session.user) {
        console.error('❌ No session found after OTP verification');
        // Fall through to signup flow
      } else {
        // Check if user exists in users table with business_id (indicates signup complete)
        // ✅ Add proper headers to prevent 406 errors
        const { data: userProfile, error: userError } = await supabase
          .from('users')
          .select('id, business_id, full_name, role')
          .eq('id', session.user.id)
          .maybeSingle(); // Use maybeSingle() instead of single() to handle not found gracefully
        
        if (!userError && userProfile && userProfile.business_id) {
          console.log('✅ User found in Supabase with business_id - signup complete');
          console.log('👤 User ID:', userProfile.id);
          console.log('🏢 Business ID:', userProfile.business_id);
          console.log('👤 Full Name:', userProfile.full_name);
          
          // ✅ Save device snapshot (AWAIT to ensure it saves, can work without business_id)
          (async () => {
            try {
              const { collectDeviceSnapshot } = await import('@/utils/deviceInfo');
              const { saveDeviceSnapshot } = await import('@/services/backendApi');
              
              console.log('📱 Collecting device snapshot for returning user...');
              const deviceSnapshot = await collectDeviceSnapshot();
              console.log('📱 Device snapshot collected:', { deviceId: deviceSnapshot.deviceId });
              
              if (deviceSnapshot.deviceId) {
                console.log('📱 Saving device snapshot to backend...');
                const result = await saveDeviceSnapshot({
                  deviceId: deviceSnapshot.deviceId,
                  deviceName: deviceSnapshot.deviceName,
                  deviceBrand: deviceSnapshot.deviceBrand,
                  deviceModel: deviceSnapshot.deviceModel,
                  deviceType: deviceSnapshot.deviceType,
                  deviceYearClass: deviceSnapshot.deviceYearClass,
                  osName: deviceSnapshot.osName,
                  osVersion: deviceSnapshot.osVersion,
                  platformApiLevel: deviceSnapshot.platformApiLevel,
                  networkServiceProvider: deviceSnapshot.networkServiceProvider,
                  internetServiceProvider: deviceSnapshot.internetServiceProvider,
                  wifiName: deviceSnapshot.wifiName,
                  bluetoothName: deviceSnapshot.bluetoothName,
                  manufacturer: deviceSnapshot.manufacturer,
                  totalMemory: deviceSnapshot.totalMemory,
                  isDevice: deviceSnapshot.isDevice,
                  isEmulator: deviceSnapshot.isEmulator,
                  isTablet: deviceSnapshot.isTablet,
                  appVersion: deviceSnapshot.appVersion,
                  appBuildNumber: deviceSnapshot.appBuildNumber,
                });
                console.log('📱 Device snapshot save result:', { success: result.success, error: result.error, snapshotId: result.snapshot?.id });
                
                if (result.success) {
                  console.log('✅ Device snapshot saved successfully:', result.snapshot?.id);
                } else {
                  console.error('❌ Device snapshot save failed:', result.error);
                }
              } else {
                console.warn('⚠️ No deviceId in snapshot, cannot save');
              }
            } catch (error) {
              console.error('❌ Error in device snapshot save process:', error);
            }
          })().catch((err) => {
            console.error('❌ Device snapshot promise rejected:', err);
          });
          
          // ✅ Prefetch business data in background (warm up cache for instant dashboard load)
          (async () => {
            try {
              const { prefetchBusinessData } = await import('@/hooks/useBusinessData');
              await prefetchBusinessData();
              console.log('✅ Business data prefetched - dashboard will load instantly');
            } catch (error) {
              console.error('⚠️ Prefetch error (non-blocking):', error);
            }
          })();
          
          // ✅ Redirect immediately (don't wait for device snapshot or prefetch)
          console.log('✅ User authenticated, redirecting to dashboard');
          router.replace('/dashboard');
          return;
        } else {
          console.log('📭 User not found in Supabase or no business_id - checking signup progress...');
          
          // ✅ Fetch signup progress from backend
          try {
            const progressResult = await getSignupProgress();
            
            if (progressResult.success && progressResult.progress) {
              const progress = progressResult.progress;
              console.log('✅ Found signup progress in backend:', progress.current_step);
              
              // ✅ Check if signup is completed (either by current_step or business_id)
              if (progress.business_id || progress.current_step === 'signupComplete' || progress.current_step === 'completed' || progress.current_step === 'complete') {
                console.log('✅ Signup already completed, redirecting to dashboard');
                console.log('🏢 Business ID from signup_progress:', progress.business_id);
                
                // ✅ Prefetch business data in background (warm up cache for instant dashboard load)
                (async () => {
                  try {
                    const { prefetchBusinessData } = await import('@/hooks/useBusinessData');
                    await prefetchBusinessData();
                    console.log('✅ Business data prefetched - dashboard will load instantly');
                  } catch (error) {
                    console.error('⚠️ Prefetch error (non-blocking):', error);
                  }
                })();
                
                // Backend is source of truth - no need to update dataStore
                router.replace('/dashboard');
                return;
              }
              
              // Continue from where user left off based on current_step
              await continueFromSignupProgress(progress, mobileNumber);
              return;
            } else {
              console.log('📭 No signup progress found in backend, starting fresh');
            }
          } catch (progressError) {
            console.error('Error fetching signup progress:', progressError);
          }
        }
      }
    } catch (error) {
      console.error('Error checking Supabase backend:', error);
    }
    
    // No backend progress found - start fresh signup
    console.log('📭 Starting fresh signup flow');
    router.replace({
      pathname: '/auth/gstin-pan',
      params: {
        mobile: mobileNumber,
      }
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
    const mobileNumber = mobile as string;
    const phoneNumber = `+91${mobileNumber}`;
    
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: phoneNumber,
      });
      
      if (error) {
        Alert.alert('Error', error.message || 'Failed to resend OTP. Please try again.');
        return;
      }
      
      setCountdown(30);
      setCanResend(false);
      setOtp(['', '', '', '', '', '']);
      setHasAutoVerified(false);
      inputRefs.current[0]?.focus();
      Alert.alert('OTP Sent', 'A new verification code has been sent to your mobile number');
    } catch (error: any) {
      console.error('Error resending OTP:', error);
      Alert.alert('Error', 'Failed to resend OTP. Please try again.');
    }
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