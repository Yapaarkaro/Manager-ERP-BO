import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  Alert,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Phone } from 'lucide-react-native';

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
  const [mobileNumber, setMobileNumber] = useState('');
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Auto-navigate when 10 digits are entered
    if (mobileNumber.length === 10 && /^\d{10}$/.test(mobileNumber)) {
      setIsValid(true);
      // Simulate API call delay
      setTimeout(() => {
        router.push({
          pathname: '/auth/otp',
          params: { mobile: mobileNumber }
        });
      }, 500);
    } else {
      setIsValid(false);
    }
  }, [mobileNumber]);

  const handleMobileChange = (text: string) => {
    // Only allow numbers and limit to 10 digits
    const cleaned = text.replace(/\D/g, '').slice(0, 10);
    setMobileNumber(cleaned);
  };

  const handleLogin = () => {
    // Handle existing user login
    Alert.alert('Login', 'Login functionality will be implemented');
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
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

        <View style={styles.inputContainer}>
          <TextInput
            style={[
              styles.input,
              isValid && styles.validInput,
              mobileNumber.length > 0 && mobileNumber.length < 10 && styles.invalidInput,
            ]}
            placeholder="Enter mobile number"
            placeholderTextColor={COLORS.gray}
            value={mobileNumber}
            onChangeText={handleMobileChange}
            keyboardType="numeric"
            maxLength={10}
            autoFocus
            textAlign="center"
          />
        </View>

        {isValid && (
          <View style={styles.successContainer}>
            <Text style={styles.successText}>Proceeding to verification...</Text>
          </View>
        )}

        <TouchableOpacity style={styles.loginButton} onPress={handleLogin}>
          <Text style={styles.loginButtonText}>I already have an account</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: COLORS.white,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: 30,
    paddingTop: 20,
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: 40,
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
  inputContainer: {
    marginBottom: 16,
  },
  input: {
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 18,
    fontSize: 16,
    color: COLORS.black,
    backgroundColor: COLORS.white,
  },
  validInput: {
    borderColor: '#10B981',
  },
  invalidInput: {
    borderColor: COLORS.error,
  },
  errorText: {
    color: COLORS.error,
    fontSize: 14,
    marginBottom: 16,
    textAlign: 'center',
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
  loginButton: {
    marginTop: 40,
    alignItems: 'center',
  },
  loginButtonText: {
    fontSize: 16,
    color: COLORS.primary,
    fontWeight: '600',
  },
});