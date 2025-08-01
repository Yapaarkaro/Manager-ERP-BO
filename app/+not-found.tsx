import React, { useRef, useEffect } from 'react';
import { Link, Stack } from 'expo-router';
import { 
  StyleSheet, 
  Text, 
  View, 
  TouchableOpacity, 
  Animated,
  Dimensions,
  ScrollView
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Chrome as Home, Compass, ArrowLeft, RotateCcw } from 'lucide-react-native';

const { width } = Dimensions.get('window');

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  secondary: '#F5C754',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

export default function NotFoundScreen() {
  const bounceAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.8)).current;

  useEffect(() => {
    // Start animations
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        tension: 50,
        friction: 8,
        useNativeDriver: true,
      }),
      Animated.loop(
        Animated.sequence([
          Animated.timing(bounceAnim, {
            toValue: 1,
            duration: 2000,
            useNativeDriver: true,
          }),
          Animated.timing(bounceAnim, {
            toValue: 0,
            duration: 2000,
            useNativeDriver: true,
          }),
        ])
      ),
    ]).start();
  }, []);

  const bounceTransform = bounceAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [0, -10],
  });

  return (
    <>
      <Stack.Screen options={{ title: 'Page Not Found' }} />
      <SafeAreaView style={styles.container}>
        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.innerContent}>
            {/* Animated 404 Icon */}
            <Animated.View 
              style={[
                styles.iconContainer,
                {
                  opacity: fadeAnim,
                  transform: [
                    { scale: scaleAnim },
                    { translateY: bounceTransform }
                  ]
                }
              ]}
            >
              <View style={styles.errorIconContainer}>
                <View style={styles.compassWrapper}>
                  <Compass size={48} color={Colors.primary} strokeWidth={2.5} />
                </View>
                <Text style={styles.errorCode}>404</Text>
                <Text style={styles.errorLabel}>PAGE NOT FOUND</Text>
              </View>
            </Animated.View>

            {/* Error Message */}
            <Animated.View 
              style={[
                styles.messageContainer,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
              ]}
            >
              <Text style={styles.title}>Oops! Page Not Found</Text>
              <Text style={styles.subtitle}>
                Looks like you've wandered off the beaten path. The page you're looking for doesn't exist in our business universe.
              </Text>
            </Animated.View>

            {/* Suggestions */}
            <Animated.View 
              style={[
                styles.suggestionsContainer,
                { opacity: fadeAnim }
              ]}
            >
              <Text style={styles.suggestionsTitle}>Here's what you can do:</Text>
              
              <View style={styles.suggestionsList}>
                <View style={styles.suggestionItem}>
                  <View style={styles.suggestionIcon}>
                    <ArrowLeft size={20} color={Colors.success} />
                  </View>
                  <Text style={styles.suggestionText}>
                    Use the back button to return to the previous page
                  </Text>
                </View>
                
                <View style={styles.suggestionItem}>
                  <View style={styles.suggestionIcon}>
                    <Home size={20} color={Colors.secondary} />
                  </View>
                  <Text style={styles.suggestionText}>
                    Go back to the dashboard to start fresh
                  </Text>
                </View>
                
                <View style={styles.suggestionItem}>
                  <View style={styles.suggestionIcon}>
                    <RotateCcw size={20} color={Colors.warning} />
                  </View>
                  <Text style={styles.suggestionText}>
                    Try refreshing the page
                  </Text>
                </View>
              </View>
            </Animated.View>

            {/* Action Buttons */}
            <Animated.View 
              style={[
                styles.actionsContainer,
                { opacity: fadeAnim, transform: [{ scale: scaleAnim }] }
              ]}
            >
              <Link href="/dashboard" asChild>
                <TouchableOpacity style={styles.primaryButton} activeOpacity={0.8}>
                  <Home size={20} color="#ffffff" />
                  <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
                </TouchableOpacity>
              </Link>

              <TouchableOpacity 
                style={styles.secondaryButton} 
                onPress={() => {
                  if (typeof window !== 'undefined') {
                    window.history.back();
                  }
                }}
                activeOpacity={0.8}
              >
                <ArrowLeft size={20} color={Colors.primary} />
                <Text style={styles.secondaryButtonText}>Go Back</Text>
              </TouchableOpacity>
            </Animated.View>

            {/* Fun Business Quote */}
            <Animated.View 
              style={[
                styles.quoteContainer,
                { opacity: fadeAnim }
              ]}
            >
              <Text style={styles.quoteText}>
                "In business, every wrong turn teaches us the right direction."
              </Text>
              <Text style={styles.quoteAuthor}>- Manager Wisdom</Text>
            </Animated.View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
    paddingVertical: 40,
  },
  innerContent: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 32,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  errorIconContainer: {
    alignItems: 'center',
    gap: 16,
  },
  compassWrapper: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: `${Colors.secondary}20`,
    borderWidth: 3,
    borderColor: Colors.secondary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  errorCode: {
    fontSize: 48,
    fontWeight: '900',
    color: Colors.primary,
    textAlign: 'center',
    letterSpacing: 2,
  },
  errorLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    textAlign: 'center',
    letterSpacing: 1,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
    lineHeight: 36,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    maxWidth: width * 0.8,
  },
  suggestionsContainer: {
    width: '100%',
    marginBottom: 40,
  },
  suggestionsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
  },
  suggestionsList: {
    gap: 16,
  },
  suggestionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  suggestionIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  suggestionText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
  },
  actionsContainer: {
    width: '100%',
    gap: 12,
    marginBottom: 32,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.2,
    shadowRadius: 8,
    elevation: 4,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  secondaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  quoteContainer: {
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 20,
    borderLeftWidth: 4,
    borderLeftColor: Colors.secondary,
    width: '100%',
  },
  quoteText: {
    fontSize: 16,
    fontStyle: 'italic',
    color: Colors.text,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 8,
  },
  quoteAuthor: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
});