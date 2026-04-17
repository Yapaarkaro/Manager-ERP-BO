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
  Linking,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Phone, Download, X } from 'lucide-react-native';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { useStatusBar } from '@/contexts/StatusBarContext';
import { supabase } from '@/lib/supabase';
import { getInputFocusStyles, getWebContainerStyles } from '@/utils/platformUtils';
import { getPlatformShadow } from '@/utils/shadowUtils';
import { setSignupData, clearSignupData } from '@/utils/signupStore';
import { REVIEW_MODE } from '@/lib/config';
import { isPwaInstallable, onPwaInstallChange, triggerPwaInstall } from '@/app/_layout';

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
  const otpRetryCount = useRef(0);
  const mobileInputRef = useRef<TextInput>(null);
  const [showInstallBanner, setShowInstallBanner] = useState(false);

  useEffect(() => {
    if (Platform.OS !== 'web') return;
    const dismissed = typeof localStorage !== 'undefined' && localStorage.getItem('pwa-install-dismissed');
    if (dismissed) return;
    if (isPwaInstallable()) setShowInstallBanner(true);
    const unsub = onPwaInstallChange((installable) => {
      if (installable && !localStorage.getItem('pwa-install-dismissed')) setShowInstallBanner(true);
      else setShowInstallBanner(false);
    });
    return unsub;
  }, []);

  // Reset any previous signup state when the login flow starts
  useEffect(() => {
    clearSignupData();
  }, []);

  // Set status bar to dark for white background
  useEffect(() => {
    setStatusBarStyle('dark-content');
  }, [setStatusBarStyle]);

  // Check for returning user only when 10 digits are entered (debounced)
  useEffect(() => {
    if (mobileNumber.length !== 10 || !/^\d{10}$/.test(mobileNumber)) {
      setIsReturningUser(false);
      return;
    }
    const timer = setTimeout(async () => {
      if (REVIEW_MODE) {
        setIsReturningUser(false);
        return;
      }
      try {
        const { data: progress } = await supabase.from('signup_progress')
          .select('id, owner_name')
          .eq('phone', mobileNumber)
          .maybeSingle();
        setIsReturningUser(!!progress);
      } catch {
        setIsReturningUser(false);
      }
    }, 300);
    return () => clearTimeout(timer);
  }, [mobileNumber]);

  useEffect(() => {
    if (mobileNumber.length === 10 && /^\d{10}$/.test(mobileNumber) && !isNavigating) {
      setIsValid(true);
      setIsNavigating(true);
      otpRetryCount.current = 0;

      console.log('✅ Valid mobile number entered, sending OTP...');

      const sendOtpAndNavigate = async () => {
        if (REVIEW_MODE && mobileNumber === '9999999999') {
          console.log('📱 REVIEW_MODE: skipping SMS, navigating to OTP screen');
          setSignupData({ mobile: mobileNumber });
          router.push('/auth/otp');
          return;
        }

        const MAX_RETRIES = 3;
        let lastError = '';

        for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
          try {
            if (attempt > 0) {
              console.log(`🔄 Retrying OTP send (attempt ${attempt + 1}/${MAX_RETRIES + 1})...`);
              await new Promise(r => setTimeout(r, 2000 * attempt));
            }

            const { error } = await supabase.auth.signInWithOtp({
              phone: `+91${mobileNumber}`,
            });

            if (!error) {
              console.log('📱 OTP sent successfully, navigating to OTP screen');
              setSignupData({ mobile: mobileNumber });
              router.push('/auth/otp');
              return;
            }

            lastError = error.message;
            const isTransient = lastError.includes('JSON') || lastError.includes('Unexpected') || lastError.includes('fetch') || lastError.includes('AuthUnknownError') || error.name === 'AuthUnknownError';
            if (!isTransient) {
              break;
            }
            console.log(`⚠️ Transient OTP error (attempt ${attempt + 1}), will retry...`);
          } catch (err: any) {
            const msg = err?.message || 'Network error';
            const isTransient = msg.includes('JSON') || msg.includes('Unexpected') || msg.includes('fetch') || msg.includes('network') || msg.includes('AuthUnknownError') || err?.name === 'AuthUnknownError';
            lastError = isTransient ? 'Network issue, retrying...' : msg;
            if (!isTransient) break;
            console.log(`⚠️ Transient network error (attempt ${attempt + 1}), will retry...`);
          }
        }

        Alert.alert('Unable to send OTP', 'Please check your internet connection and try again.');
        setIsNavigating(false);
      };

      sendOtpAndNavigate();
    } else if (mobileNumber.length !== 10) {
      setIsValid(false);
      setIsNavigating(false);
    }
  }, [mobileNumber]);

  const handleMobileChange = (text: string) => {
    // Only allow numbers and limit to 10 digits
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(cleaned);
  };


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
        {showInstallBanner && Platform.OS === 'web' && (
          <View style={pwaStyles.banner}>
            <View style={pwaStyles.bannerContent}>
              <Download size={20} color={COLORS.primary} />
              <View style={pwaStyles.bannerText}>
                <Text style={pwaStyles.bannerTitle}>Install Manager App</Text>
                <Text style={pwaStyles.bannerDesc}>Get a native app experience on your device</Text>
              </View>
            </View>
            <View style={pwaStyles.bannerActions}>
              <TouchableOpacity
                style={pwaStyles.installBtn}
                onPress={async () => {
                  const accepted = await triggerPwaInstall();
                  if (accepted) setShowInstallBanner(false);
                }}
              >
                <Text style={pwaStyles.installBtnText}>Install</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={pwaStyles.dismissBtn}
                onPress={() => {
                  setShowInstallBanner(false);
                  if (typeof localStorage !== 'undefined') localStorage.setItem('pwa-install-dismissed', '1');
                }}
              >
                <X size={16} color={COLORS.gray} />
              </TouchableOpacity>
            </View>
          </View>
        )}

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
              ...(isFocused && Platform.OS !== 'web' ? getPlatformShadow(4, COLORS.primary, 0.12) : {}),
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

        <View style={[styles.legalContainer, { paddingBottom: Platform.select({
          web: 20,
          default: Math.max(insets.bottom, 20),
        })}]}>
          <Text style={styles.legalText}>
            By continuing, you agree to our{' '}
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL('https://getmanager.in/terms')}
            >
              Terms &amp; Conditions
            </Text>
            {' '}and{' '}
            <Text
              style={styles.legalLink}
              onPress={() => Linking.openURL('https://getmanager.in/privacy-policy')}
            >
              Privacy Policy
            </Text>
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

const pwaStyles = StyleSheet.create({
  banner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#EEF2FF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#C7D2FE',
  },
  bannerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 10,
  },
  bannerText: {
    flex: 1,
  },
  bannerTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#1e293b',
  },
  bannerDesc: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 1,
  },
  bannerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  installBtn: {
    backgroundColor: COLORS.primary,
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 8,
  },
  installBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '600',
  },
  dismissBtn: {
    padding: 4,
  },
});