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
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Shield, RotateCcw } from 'lucide-react-native';

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

export default function OTPScreen() {
  const { mobile } = useLocalSearchParams();
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [countdown, setCountdown] = useState(30);
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
    
    // Simulate API call
    setTimeout(() => {
      if (otpCode === '123456') { // Demo OTP
        router.push('/auth/gstin-pan');
      } else {
        setOtp(['', '', '', '', '', '']);
        setHasAutoVerified(false);
        inputRefs.current[0]?.focus();
        Alert.alert('Invalid OTP', 'Please enter the correct verification code');
      }
      setIsVerifying(false);
    }, 1000);
  };

  const resendOTP = () => {
    setCountdown(30);
    setCanResend(false);
    setOtp(['', '', '', '', '', '']);
    setHasAutoVerified(false);
    inputRefs.current[0]?.focus();
    Alert.alert('OTP Sent', 'A new verification code has been sent to your mobile number');
  };

  const changeMobileNumber = () => {
    router.back();
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
            <Shield size={32} color={COLORS.primary} />
          </View>
        </View>

        <Text style={styles.title}>Verify Mobile Number</Text>
        <Text style={styles.subtitle}>
          Enter the 6-digit code sent to{'\n'}+91 {mobile}
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

        <View style={styles.demoContainer}>
          <Text style={styles.demoText}>Demo: Use OTP 123456</Text>
        </View>
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
  demoContainer: {
    position: 'absolute',
    bottom: 30,
    left: 30,
    right: 30,
    backgroundColor: '#FEF3C7',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#F59E0B',
  },
  demoText: {
    color: '#92400E',
    fontSize: 14,
    textAlign: 'center',
    fontWeight: '500',
  },
});