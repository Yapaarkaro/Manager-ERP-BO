import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  ScrollView,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { router } from 'expo-router';
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

const { width, height } = Dimensions.get('window');

const COLORS = {
  primary: '#3F66AC',
  secondary: '#F5C754',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
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
  const scrollViewRef = useRef<ScrollView>(null);
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const handleNext = () => {
    if (currentIndex < onboardingData.length - 1) {
      const nextIndex = currentIndex + 1;
      animateTransition(() => {
        setCurrentIndex(nextIndex);
        scrollViewRef.current?.scrollTo({
          x: nextIndex * width,
          animated: true,
        });
      });
    }
  };

  const handlePrevious = () => {
    if (currentIndex > 0) {
      const prevIndex = currentIndex - 1;
      animateTransition(() => {
        setCurrentIndex(prevIndex);
        scrollViewRef.current?.scrollTo({
          x: prevIndex * width,
          animated: true,
        });
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
    router.push('/auth/mobile');
  };

  const renderSlide = (item: typeof onboardingData[0], index: number) => {
    const IconComponent = item.icon;
    
    return (
      <View key={item.id} style={styles.slide}>
        <LinearGradient colors={item.gradient} style={styles.slideBackground}>
          <Animated.View style={[styles.slideContent, { opacity: fadeAnim }]}>
            <View style={styles.iconContainer}>
              <View style={styles.iconCircle}>
                <IconComponent size={48} color={COLORS.primary} strokeWidth={2} />
              </View>
            </View>
            
            <View style={styles.textContainer}>
              <Text style={styles.title}>{item.title}</Text>
              <Text style={styles.subtitle}>{item.subtitle}</Text>
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
      </View>
    );
  };

  return (
    <View style={styles.container}>
      <ScrollView
        ref={scrollViewRef}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        scrollEnabled={false}
        style={styles.scrollView}
      >
        {onboardingData.map((item, index) => renderSlide(item, index))}
      </ScrollView>

      <View style={styles.navigationContainer}>
        <TouchableOpacity
          style={[
            styles.navButton,
            styles.prevButton,
            currentIndex === 0 && styles.disabledButton,
          ]}
          onPress={handlePrevious}
          disabled={currentIndex === 0}
        >
          <ArrowLeft size={24} color={currentIndex === 0 ? COLORS.gray : COLORS.white} />
        </TouchableOpacity>

        {currentIndex === onboardingData.length - 1 ? (
          <TouchableOpacity style={styles.getStartedButton} onPress={handleGetStarted}>
            <Text style={styles.getStartedText}>Start 30-Day Free Trial</Text>
            <ArrowRight size={20} color={COLORS.primary} />
          </TouchableOpacity>
        ) : (
          <TouchableOpacity style={styles.navButton} onPress={handleNext}>
            <ArrowRight size={24} color={COLORS.white} />
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  scrollView: {
    flex: 1,
  },
  slide: {
    width,
    height,
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
    width: 12,
    height: 12,
    borderRadius: 6,
    marginHorizontal: 6,
  },
  activeDot: {
    backgroundColor: COLORS.primary,
  },
  inactiveDot: {
    backgroundColor: COLORS.lightGray,
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