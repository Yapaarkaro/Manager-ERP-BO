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
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { getSignupProgress, saveSignupProgress, deleteSignupProgress, saveDeviceSnapshot } from '@/services/backendApi';
import { supabase, withTimeout } from '@/lib/supabase';
import { mapLocationsToAddresses } from '@/utils/dataStore';

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
    
    const mobileNumber = (mobile as string)?.replace(/\D/g, '').slice(0, 10) || '';
    if (!mobileNumber) {
      setHasAutoVerified(false);
      Alert.alert('Error', 'Mobile number is required. Please go back and enter your number.');
      return;
    }

    setIsVerifying(true);
    const otpCode = otp.join('');
    
    try {
      let verifyData: any = null;
      let verifyError: any = null;

      for (let attempt = 0; attempt < 3; attempt++) {
        try {
          if (attempt > 0) {
            await new Promise(r => setTimeout(r, 2000 * attempt));
          }
          const result = await withTimeout(
            supabase.auth.verifyOtp({
              phone: `+91${mobileNumber}`,
              token: otpCode,
              type: 'sms',
            }),
            15000,
            'Verify OTP'
          );
          verifyData = result.data;
          verifyError = result.error;

          if (!verifyError || !(verifyError.name === 'AuthUnknownError' || verifyError.message?.includes('JSON') || verifyError.message?.includes('Unexpected'))) {
            break;
          }
          console.log(`⚠️ Transient verify error (attempt ${attempt + 1}), will retry...`);
        } catch (err: any) {
          const isTransient = err?.message?.includes('JSON') || err?.message?.includes('Unexpected') || err?.name === 'AuthUnknownError';
          if (!isTransient || attempt === 2) {
            throw err;
          }
          console.log(`⚠️ Transient verify error (attempt ${attempt + 1}), will retry...`);
        }
      }

      if (verifyError || !verifyData?.session) {
        const isServerError = verifyError?.name === 'AuthUnknownError' || verifyError?.message?.includes('JSON');
        const errorMsg = isServerError
          ? 'Server temporarily unavailable. Please try again in a moment.'
          : (verifyError?.message || 'Invalid OTP. Please try again.');
        setOtp(['', '', '', '', '', '']);
        setHasAutoVerified(false);
        inputRefs.current[0]?.focus();
        Alert.alert('Verification Failed', errorMsg);
        setIsVerifying(false);
        return;
      }

      // Proceed to next step - await to avoid race and handle routing errors
      setIsVerifying(false);
      try {
        await handleSuccessfulVerification(mobileNumber);
      } catch (navError: any) {
        // Fallback: if post-verification routing fails, still navigate to gstin-pan
        router.replace({
          pathname: '/auth/gstin-pan',
          params: { mobile: mobileNumber },
        });
      }
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
        try {
          const { verifySuperadmin } = await import('@/services/superadminApi');
          const isSA = await verifySuperadmin();
          if (isSA) {
            console.log('🛡️ Superadmin detected, routing to email verification');
            router.replace('/admin/email-verify');
            return;
          }
        } catch {
          // Not a superadmin or check failed -- continue normal flow
        }

        // Device snapshot (fire-and-forget, doesn't affect flow)
        setTimeout(() => {
          import('@/utils/deviceInfo').then(({ collectDeviceSnapshot }) => {
            collectDeviceSnapshot().then(ds => {
              if (ds.deviceId) {
                saveDeviceSnapshot({
                  deviceId: ds.deviceId, deviceName: ds.deviceName,
                  deviceBrand: ds.deviceBrand, deviceModel: ds.deviceModel,
                  deviceType: ds.deviceType, deviceYearClass: ds.deviceYearClass,
                  osName: ds.osName, osVersion: ds.osVersion,
                  platformApiLevel: ds.platformApiLevel,
                  networkServiceProvider: ds.networkServiceProvider,
                  internetServiceProvider: ds.internetServiceProvider,
                  networkType: ds.networkType, ipAddress: ds.ipAddress,
                  wifiName: ds.wifiName, bluetoothName: ds.bluetoothName,
                  manufacturer: ds.manufacturer, totalMemory: ds.totalMemory,
                  isDevice: ds.isDevice, isEmulator: ds.isEmulator, isTablet: ds.isTablet,
                  screenWidth: ds.screenWidth, screenHeight: ds.screenHeight,
                  screenScale: ds.screenScale, pixelDensity: ds.pixelDensity,
                  totalStorage: ds.totalStorage, freeStorage: ds.freeStorage,
                  batteryLevel: ds.batteryLevel, batteryState: ds.batteryState,
                  carrierName: ds.carrierName, mobileCountryCode: ds.mobileCountryCode,
                  mobileNetworkCode: ds.mobileNetworkCode,
                  appVersion: ds.appVersion, appBuildNumber: ds.appBuildNumber,
                  expoSdkVersion: ds.expoSdkVersion,
                  locale: ds.locale, timezone: ds.timezone,
                }).catch(() => {});
              }
            }).catch(() => {});
          }).catch(() => {});
        }, 1500);

        const { data: userProfile, error: userError } = await withTimeout(
          supabase
            .from('users')
            .select('*')
            .eq('id', session.user.id)
            .maybeSingle(),
          10000,
          'Fetch user profile'
        );
        
        if (!userError && userProfile?.business_id) {
          const { clearBusinessContext } = await import('@/services/backendApi');
          clearBusinessContext();
          try {
            const { prefetchBusinessData } = await import('@/hooks/useBusinessData');
            await Promise.race([
              prefetchBusinessData(),
              new Promise(r => setTimeout(r, 3000)),
            ]);
          } catch {}
          
          router.replace('/dashboard');
          return;
        }

        // No users row — check if this phone belongs to a staff member
        const cleanPhone = mobileNumber.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10);
        try {
          const { data: staffRows, error: staffQueryErr } = await supabase
            .from('staff')
            .select('*')
            .eq('mobile', cleanPhone);

          const activeStaff = (staffRows || []).filter((s: any) => !s.is_deleted);
          const staffRow = activeStaff[0];

          if (staffQueryErr) {
            console.warn('Staff query error:', staffQueryErr.message);
          }

          if (staffRow) {
            // Staff member found — clear any stale signup progress
            deleteSignupProgress(mobileNumber).catch(() => {});

            const hasVerificationCode = !!staffRow.verification_code;
            const hasUserId = !!staffRow.user_id;

            if (hasVerificationCode && !hasUserId) {
              router.replace({
                pathname: '/auth/staff-verify',
                params: {
                  staffId: staffRow.id,
                  staffName: staffRow.name,
                  businessId: staffRow.business_id,
                  mobile: cleanPhone,
                },
              });
              return;
            }

            // Staff already verified or no code was set — link and go to dashboard
            try {
              const { error: insertErr } = await supabase
                .from('users')
                .insert({
                  id: session.user.id,
                  business_id: staffRow.business_id,
                  name: staffRow.name,
                  role: 'Staff',
                });

              if (insertErr) {
                // Row might already exist — try update
                await supabase
                  .from('users')
                  .update({
                    business_id: staffRow.business_id,
                    name: staffRow.name,
                    role: 'Staff',
                  })
                  .eq('id', session.user.id);
              }

              if (!hasUserId) {
                await supabase
                  .from('staff')
                  .update({ user_id: session.user.id })
                  .eq('id', staffRow.id)
                  .catch(() => {});
              }
            } catch (linkErr) {
              console.warn('Failed to link staff user:', linkErr);
            }

            const { clearBusinessContext } = await import('@/services/backendApi');
            clearBusinessContext();
            try {
              const { prefetchBusinessData } = await import('@/hooks/useBusinessData');
              await Promise.race([prefetchBusinessData(), new Promise(r => setTimeout(r, 3000))]);
            } catch {}

            router.replace('/dashboard');
            return;
          }
        } catch (staffCheckErr: any) {
          console.warn('Staff lookup failed, continuing to onboarding:', staffCheckErr?.message || staffCheckErr);
        }

        // Not a staff member — save signup progress for owner onboarding
        saveSignupProgress({
          mobile: mobileNumber,
          mobileVerified: true,
          currentStep: 'mobileOtp',
        }).catch(() => {});

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
              try {
                const { prefetchBusinessData } = await import('@/hooks/useBusinessData');
                await Promise.race([
                  prefetchBusinessData(),
                  new Promise(r => setTimeout(r, 3000)),
                ]);
              } catch {}
              
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

  const continueFromSignupProgress = async (progress: any, mobileNumber: string) => {
    const currentStep = progress.current_step;
    console.log('🔄 Continuing signup from step:', currentStep);

    const baseParams: Record<string, string> = {
      mobile: mobileNumber,
      type: progress.tax_id_type || '',
      value: progress.tax_id_value || '',
      name: progress.owner_name || '',
      businessName: progress.business_name || '',
      businessType: progress.business_type || '',
      gstinData: progress.gstin_data ? JSON.stringify(progress.gstin_data) : '',
    };

    // Load addresses from Supabase for steps that need them
    const needsAddresses = ['addressManagement', 'address', 'primaryBank', 'banking', 'bankManagement', 'finalSetup', 'businessSummary', 'summary'];
    if (needsAddresses.includes(currentStep) && progress.business_id) {
      try {
        const { data: locations } = await supabase.from('locations').select('*').eq('business_id', progress.business_id).eq('is_deleted', false);
        baseParams.allAddresses = JSON.stringify(mapLocationsToAddresses(locations || []));
      } catch { baseParams.allAddresses = '[]'; }
    }

    // Load bank accounts from Supabase for steps that need them
    const needsBanks = ['bankManagement', 'finalSetup', 'businessSummary', 'summary'];
    if (needsBanks.includes(currentStep) && progress.business_id) {
      try {
        const { data: banks } = await supabase.from('bank_accounts').select('*').eq('business_id', progress.business_id);
        baseParams.allBankAccounts = JSON.stringify(banks || []);
      } catch { baseParams.allBankAccounts = '[]'; }
    }

    const stepToRoute: Record<string, string> = {
      mobile: '/auth/gstin-pan',
      mobileOtp: '/auth/gstin-pan',
      gstinPan: '/auth/gstin-pan',
      gstinOtp: '/auth/gstin-pan-otp',
      verifyPan: '/auth/gstin-pan-otp',
      primaryAddress: '/auth/business-details',
      businessDetails: '/auth/business-details',
      addressManagement: '/auth/address-confirmation',
      address: '/auth/address-confirmation',
      primaryBank: '/auth/banking-details',
      banking: '/auth/banking-details',
      bankManagement: '/auth/bank-accounts',
      finalSetup: '/auth/final-setup',
      businessSummary: '/auth/business-summary',
      summary: '/auth/business-summary',
    };

    if (['signupComplete', 'completed', 'complete'].includes(currentStep)) {
      router.replace('/dashboard');
      return;
    }

    const route = stepToRoute[currentStep];
    if (route) {
      // Add step-specific params
      if (['primaryAddress', 'businessDetails'].includes(currentStep)) {
        baseParams.panName = progress.owner_name || '';
        baseParams.panDob = progress.owner_dob || '';
      }
      if (['addressManagement', 'address'].includes(currentStep)) {
        baseParams.addressType = 'primary';
      }
      router.replace({ pathname: route as any, params: baseParams });
    } else {
      router.replace({ pathname: '/auth/gstin-pan' as any, params: { mobile: mobileNumber } });
    }
  };

  const resendOTP = async () => {
    setCountdown(30);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    setHasAutoVerified(false);
    inputRefs.current[0]?.focus();

    const mobileNumber = mobile as string;
    try {
      const { error } = await supabase.auth.signInWithOtp({
        phone: `+91${mobileNumber}`,
      });

      if (error) {
        console.error('❌ Resend OTP failed:', error.message);
        Alert.alert('Error', error.message || 'Failed to resend OTP.');
        return;
      }
      Alert.alert('OTP Sent', 'A new verification code has been sent to your mobile number.');
    } catch (err: any) {
      console.error('❌ Resend OTP error:', err);
      Alert.alert('Error', 'Failed to resend OTP. Please check your connection.');
    }
  };

  const changeMobileNumber = () => {
    router.canGoBack() ? router.back() : router.replace('/auth/mobile');
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