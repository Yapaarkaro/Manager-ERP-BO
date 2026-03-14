import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
  Platform,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
import { AuthCheckSkeleton } from '@/components/SkeletonLoader';
import { supabase, withTimeout } from '@/lib/supabase';
import { mapLocationsToAddresses } from '@/utils/dataStore';
import { setSignupData, clearSignupData } from '@/utils/signupStore';
import { WEBSITE_URL } from '@/lib/config';
import { 
  FileText, 
  Smartphone, 
  Zap, 
  Users, 
  TrendingUp,
  ArrowRight,
  ArrowLeft,
  Gift
} from 'lucide-react-native';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import ResponsiveContainer from '@/components/ResponsiveContainer';

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#3F66AC',
  secondary: '#F5C754',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  darkGray: '#9CA3AF',
};

const onboardingData = [
  {
    id: 1,
    title: 'From Paper to Power',
    subtitle: 'Your mobile is the new paper. Your fingers are the new pen.',
    icon: FileText,
    gradient: [COLORS.white, COLORS.lightGray],
  },
  {
    id: 2,
    title: 'One App to Replace Them All',
    subtitle: 'Say goodbye to juggling Tally, Khatabook, Vyapar, Interakt, and WhatsApp.',
    icon: Smartphone,
    gradient: [COLORS.white, COLORS.lightGray],
  },
  {
    id: 3,
    title: 'Built for Real Businesses, Not Accountants',
    subtitle: 'No jargon. No training needed. If you can use WhatsApp, you can use Manager.',
    icon: Users,
    gradient: [COLORS.white, COLORS.lightGray],
  },
  {
    id: 4,
    title: 'Run Your Business. From Anywhere.',
    subtitle: 'Track sales, stock, staff, payments, and GST — all from your phone.',
    icon: TrendingUp,
    gradient: [COLORS.white, COLORS.lightGray],
  },
  {
    id: 5,
    title: 'Start Free. Grow Fast.',
    subtitle: 'No commitments. 30-day free trial. Instant onboarding.',
    icon: Gift,
    gradient: [COLORS.white, COLORS.lightGray],
  },
];

export default function OnboardingScreen() {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isCheckingAuth, setIsCheckingAuth] = useState(true);
  const fadeAnim = useRef(new Animated.Value(1)).current;
  const debouncedNavigate = useDebounceNavigation();

  // Check auth status on mount - Supabase is the sole source of truth
  useEffect(() => {
    let cancelled = false;
    const checkAuth = async () => {
      try {
        let session: any = null;
        try {
          const { data } = await withTimeout(
            supabase.auth.getSession(),
            5000,
            'Index: getSession'
          );
          session = data?.session;
        } catch (authErr: any) {
          if (authErr?.name === 'AuthUnknownError' || authErr?.message?.includes('JSON Parse error')) {
            console.log('⚠️ Auth server returned non-JSON response, treating as no session');
          }
        }
        if (cancelled) return;
        if (!session?.user) {
          if (Platform.OS === 'web') {
            window.location.href = WEBSITE_URL;
            return;
          }
          return;
        }

        try {
          const { verifySuperadmin } = await import('@/services/superadminApi');
          const isSA = await verifySuperadmin();
          if (!cancelled && isSA) {
            console.log('🛡️ Superadmin detected on launch, signing out for re-auth');
            await supabase.auth.signOut();
            setIsCheckingAuth(false);
            return;
          }
        } catch {
          // Not superadmin or check failed -- continue normal flow
        }
        if (cancelled) return;

        const { data: userData } = await withTimeout(
          Promise.resolve(supabase.from('users').select('business_id, role').eq('id', session.user.id).maybeSingle()),
          5000,
          'Index: check user business'
        ) as { data: { business_id: string; role: string } | null };
        if (cancelled) return;

        if (userData?.business_id) {
          const isStaffUser = userData.role === 'Staff';

          // Staff members skip the onboarding check — they don't go through onboarding
          if (isStaffUser) {
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

          // Check if onboarding is complete (owners only)
          const { data: bizData } = await withTimeout(
            Promise.resolve(
              supabase.from('businesses').select('is_onboarding_complete').eq('id', userData.business_id).single()
            ),
            5000,
            'Index: check onboarding status'
          ) as { data: { is_onboarding_complete: boolean } | null };
          if (cancelled) return;

          if (bizData?.is_onboarding_complete) {
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
          // Business exists but onboarding not complete - fall through to resume
        }

        // Check signup_progress to resume from where they left off
        const { data: progress } = await withTimeout(
          Promise.resolve(
            supabase.from('signup_progress')
              .select('current_step, phone, tax_id_type, tax_id_value, owner_name, business_name, business_type, gstin_data, business_id')
              .eq('user_id', session.user.id)
              .maybeSingle()
          ),
          5000,
          'Index: check signup progress'
        ) as { data: any };
        if (cancelled) return;

        if (progress?.current_step && progress.current_step !== 'complete') {
          const step = progress.current_step;

          const earlySteps = ['mobile', 'mobileOtp', 'otp'];
          if (earlySteps.includes(step)) {
            await supabase.auth.signOut();
            if (!cancelled) setIsCheckingAuth(false);
            return;
          }

          clearSignupData();
          setSignupData({
            mobile: progress.phone || '',
            type: progress.tax_id_type || '',
            value: progress.tax_id_value || '',
            name: progress.owner_name || '',
            businessName: progress.business_name || '',
            businessType: progress.business_type || '',
            gstinData: progress.gstin_data ? JSON.stringify(progress.gstin_data) : '',
          });

          const needsAddresses = ['primaryAddress', 'address', 'addressManagement', 'primaryBank', 'banking', 'bankManagement', 'finalSetup', 'businessSummary'];
          if (needsAddresses.includes(step) && progress.business_id) {
            try {
              const { data: locations } = await supabase.from('locations').select('*').eq('business_id', progress.business_id).eq('is_deleted', false);
              setSignupData({ allAddresses: JSON.stringify(mapLocationsToAddresses(locations || [])) });
            } catch { setSignupData({ allAddresses: '[]' }); }
          }
          const needsBanks = ['bankManagement', 'finalSetup', 'businessSummary'];
          if (needsBanks.includes(step) && progress.business_id) {
            try {
              const { data: banks } = await supabase.from('bank_accounts').select('*').eq('business_id', progress.business_id);
              setSignupData({ allBankAccounts: JSON.stringify(banks || []) });
            } catch { setSignupData({ allBankAccounts: '[]' }); }
          }

          const stepToRoute: Record<string, string> = {
            gstinPan: '/auth/gstin-pan',
            taxId: '/auth/gstin-pan',
            gstinOtp: '/auth/gstin-pan-otp',
            taxIdOtp: '/auth/gstin-pan-otp',
            verifyPan: '/auth/gstin-pan',
            businessDetails: '/auth/business-details',
            primaryAddress: '/auth/business-address',
            address: '/auth/business-address',
            addressManagement: '/auth/address-confirmation',
            primaryBank: '/auth/banking-details',
            banking: '/auth/banking-details',
            bankManagement: '/auth/bank-accounts',
            finalSetup: '/auth/final-setup',
            businessSummary: '/auth/business-summary',
          };
          const route = stepToRoute[step];
          if (route) {
            router.replace(route as any);
            return;
          }
        }
        // Session exists but no business and no progress - show onboarding
      } catch {
        if (Platform.OS === 'web') {
          window.location.href = WEBSITE_URL;
          return;
        }
      } finally {
        if (!cancelled) setIsCheckingAuth(false);
      }
    };
    checkAuth();
    return () => { cancelled = true; };
  }, []);

  if (isCheckingAuth) {
    return (
      <ResponsiveContainer fullWidth>
        <AuthCheckSkeleton />
      </ResponsiveContainer>
    );
  }

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      animateTransition(() => {
        setCurrentIndex(nextIndex);
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      animateTransition(() => {
        setCurrentIndex(prevIndex);
      });
    }
  };

  const animateTransition = (callback: () => void) => {
    Animated.sequence([
      Animated.timing(fadeAnim, {
        toValue: 0.7,
        duration: 150,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 150,
        useNativeDriver: true,
      }),
    ]).start();
    callback();
  };

  const handleGetStarted = () => {
    debouncedNavigate('/auth/mobile');
  };

  const renderContent = () => {
    const currentItem = onboardingData[currentIndex];
    const IconComponent = currentItem.icon;
    
    return (
      <LinearGradient colors={currentItem.gradient} style={styles.slideBackground}>
        <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
          <View style={styles.iconContainer}>
            <View style={styles.iconCircle}>
              <IconComponent size={48} color={COLORS.primary} strokeWidth={2} />
            </View>
          </View>
          
          <View style={styles.textContainer}>
            <Text style={styles.title}>{currentItem.title}</Text>
            <Text style={styles.subtitle}>{currentItem.subtitle}</Text>
          </View>

          <View style={styles.dotsContainer}>
            {onboardingData.map((_, dotIndex) => (
              <View
                key={dotIndex}
                style={[
                  styles.dot,
                  dotIndex === currentIndex ? styles.activeDot : styles.inactiveDot,
                ]}
              />
            ))}
          </View>
        </Animated.View>
      </LinearGradient>
    );
  };

  return (
    <ResponsiveContainer fullWidth>
      <View style={styles.container}>
      <View style={styles.contentArea}>
        {renderContent()}
      </View>

      <View style={[
        styles.navigationContainer,
        currentIndex === 0 && styles.navigationContainerFirstSlide
      ]}>
        {currentIndex > 0 && (
          <TouchableOpacity
            style={[
              styles.navButton,
              styles.prevButton,
            ]}
            onPress={handlePrevious}
          >
            <ArrowLeft size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}

        {currentIndex === onboardingData.length - 1 ? (
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <Text style={styles.getStartedText}>Start 30-Day Free Trial</Text>
            <ArrowRight size={20} color={COLORS.primary} />
          </TouchableOpacity>
        ) : currentIndex === 0 ? (
          <TouchableOpacity style={styles.getStartedButton} onPress={handleNext}>
            <Text style={styles.getStartedText}>Get Started</Text>
            <ArrowRight size={20} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navButton} onPress={handleNext}>
            <ArrowRight size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  contentArea: {
    flex: 1,
  },
  slideBackground: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  slideContent: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 40,
  },
  iconContainer: {
    marginBottom: 60,
  },
  iconCircle: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 4,
    borderColor: COLORS.white,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 8,
    },
    shadowOpacity: 0.2,
    shadowRadius: 16,
    elevation: 8,
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 80,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: COLORS.gray,
    textAlign: 'center',
    lineHeight: 24,
  },
  dotsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
  },
  dot: {
    width: 14,
    height: 14,
    borderRadius: 7,
    marginHorizontal: 6,
    borderWidth: 1,
    borderColor: COLORS.lightGray,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
    borderColor: COLORS.primary,
    shadowColor: COLORS.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 3,
  },
  inactiveDot: {
    backgroundColor: COLORS.darkGray,
  },
  navigationContainer: {
    position: 'absolute',
    bottom: 50,
    left: 30,
    right: 30,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  navigationContainerFirstSlide: {
    justifyContent: 'center',
  },
  navButton: {
    width: 56,
    height: 56,
    borderRadius: 28,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: COLORS.primary,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  prevButton: {},
  nextButton: {},
  disabledButton: {
    backgroundColor: 'rgba(255, 255, 255, 0.3)',
  },
  getStartedButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: COLORS.secondary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 28,
    shadowColor: COLORS.black,
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  getStartedText: {
    fontSize: 16,
    fontWeight: '600',
    color: COLORS.primary,
    marginRight: 8,
  },
});