import React, { useEffect, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Animated,
  BackHandler,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useNavigation } from 'expo-router';
import { CheckCircle, Home, CreditCard } from 'lucide-react-native';
import { safeRouter } from '@/utils/safeRouter';

export default function SubscriptionSuccessScreen() {
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;
  const navigation = useNavigation();

  useEffect(() => {
    const backHandler = BackHandler.addEventListener('hardwareBackPress', () => {
      safeRouter.replace('/dashboard');
      return true;
    });
    return () => backHandler.remove();
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('beforeRemove', (e: any) => {
      e.preventDefault();
      safeRouter.replace('/dashboard');
    });
    return unsubscribe;
  }, [navigation]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 100,
        friction: 8,
        useNativeDriver: true,
      }),
    ]).start();
  }, []);

  const handleGoToDashboard = () => {
    safeRouter.replace('/dashboard');
  };

  const handleViewSubscription = () => {
    safeRouter.push('/subscription');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <Animated.View 
          style={[
            styles.content,
            {
              opacity: fadeAnim,
              transform: [{ scale: scaleAnim }],
            }
          ]}
        >
          <View style={styles.iconContainer}>
            <View style={styles.iconWrapper}>
              <CheckCircle size={64} color="#10b981" strokeWidth={3} />
            </View>
          </View>

          <View style={styles.textContainer}>
            <Text style={styles.title}>🎉 Subscription Active!</Text>
            <Text style={styles.subtitle}>
              Your subscription has been successfully activated. Enjoy all the premium features!
            </Text>
          </View>

          <View style={styles.featuresContainer}>
            <Text style={styles.featuresTitle}>What's included:</Text>
            <View style={styles.featureItem}>
              <CheckCircle size={20} color="#10b981" />
              <Text style={styles.featureText}>Unlimited locations</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle size={20} color="#10b981" />
              <Text style={styles.featureText}>Multiple staff accounts</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle size={20} color="#10b981" />
              <Text style={styles.featureText}>Advanced reporting</Text>
            </View>
            <View style={styles.featureItem}>
              <CheckCircle size={20} color="#10b981" />
              <Text style={styles.featureText}>Priority support</Text>
            </View>
          </View>

          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGoToDashboard}
              activeOpacity={0.8}
            >
              <Home size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleViewSubscription}
              activeOpacity={0.8}
            >
              <CreditCard size={20} color="#3f66ac" />
              <Text style={styles.secondaryButtonText}>View Subscription</Text>
            </TouchableOpacity>
          </View>
        </Animated.View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  iconWrapper: {
    width: 120,
    height: 120,
    backgroundColor: '#dcfce7',
    borderRadius: 60,
    borderWidth: 6,
    borderColor: '#10b981',
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  title: {
    fontSize: 28,
    fontWeight: '800',
    color: '#1a1a1a',
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 34,
  },
  subtitle: {
    fontSize: 16,
    color: '#666666',
    textAlign: 'center',
    lineHeight: 24,
    paddingHorizontal: 16,
  },
  featuresContainer: {
    backgroundColor: '#f0fdf4',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
    width: '100%',
    borderWidth: 1,
    borderColor: '#10b981',
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 16,
    textAlign: 'center',
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  featureText: {
    fontSize: 16,
    color: '#047857',
    marginLeft: 12,
    fontWeight: '500',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    backgroundColor: '#3f66ac',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '700',
    marginLeft: 8,
  },
  secondaryButton: {
    backgroundColor: '#f8f9fa',
    borderRadius: 16,
    paddingVertical: 18,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: '#3f66ac',
  },
  secondaryButtonText: {
    color: '#3f66ac',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
