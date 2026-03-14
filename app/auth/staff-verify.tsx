import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { Shield, ArrowLeft } from 'lucide-react-native';
import { supabase } from '@/lib/supabase';
import { notifyStaffLogin } from '@/services/backendApi';
import { getSignupData } from '@/utils/signupStore';

const COLORS = {
  primary: '#3F66AC',
  white: '#FFFFFF',
  black: '#000000',
  gray: '#6B7280',
  lightGray: '#F3F4F6',
  error: '#EF4444',
  success: '#10B981',
};

export default function StaffVerifyScreen() {
  const params = useLocalSearchParams();
  const signupData = getSignupData();
  const staffId = (params.staffId as string) || signupData.staffId || '';
  const staffName = (params.staffName as string) || signupData.staffName || '';
  const businessId = (params.businessId as string) || signupData.businessId || '';
  const mobile = (params.mobile as string) || signupData.mobile || '';

  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [ownerNotified, setOwnerNotified] = useState(false);
  const inputRefs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    if (!staffId || ownerNotified) return;
    notifyStaffLogin(staffId as string).then(() => setOwnerNotified(true)).catch(() => {});
  }, [staffId]);

  const handleCodeChange = (value: string, index: number) => {
    if (value.length > 1) {
      const digits = value.replace(/\D/g, '').split('').slice(0, 6);
      const newCode = [...code];
      digits.forEach((d, i) => {
        if (index + i < 6) newCode[index + i] = d;
      });
      setCode(newCode);
      const nextIdx = Math.min(index + digits.length, 5);
      inputRefs.current[nextIdx]?.focus();
      return;
    }

    const newCode = [...code];
    newCode[index] = value.replace(/\D/g, '');
    setCode(newCode);
    if (value && index < 5) inputRefs.current[index + 1]?.focus();
  };

  const handleKeyPress = (key: string, index: number) => {
    if (key === 'Backspace' && !code[index] && index > 0) {
      inputRefs.current[index - 1]?.focus();
    }
  };

  const handleVerify = async () => {
    const enteredCode = code.join('');
    if (enteredCode.length !== 6) {
      Alert.alert('Invalid Code', 'Please enter the 6-digit staff verification code.');
      return;
    }

    setIsVerifying(true);
    try {
      // Single RPC call that verifies code, creates users row, and links staff — all bypassing RLS
      const { data: verifyResult, error: verifyError } = await supabase.rpc('verify_and_create_staff_user', {
        p_staff_id: staffId,
        p_verification_code: enteredCode,
      });

      if (verifyError) {
        console.warn('Staff verify RPC error:', verifyError.message);
        Alert.alert('Error', 'Verification failed. Please try again.');
        setIsVerifying(false);
        return;
      }

      const result = typeof verifyResult === 'string' ? JSON.parse(verifyResult) : verifyResult;

      if (!result?.success) {
        const errMsg = result?.error || 'Verification failed';
        if (errMsg.includes('Invalid verification code')) {
          Alert.alert('Incorrect Code', 'The verification code does not match. Please check with your business owner.');
          setCode(['', '', '', '', '', '']);
          inputRefs.current[0]?.focus();
        } else {
          Alert.alert('Error', errMsg);
        }
        setIsVerifying(false);
        return;
      }

      try {
        const { clearBusinessContext } = await import('@/services/backendApi');
        clearBusinessContext();
        const { prefetchBusinessData } = await import('@/hooks/useBusinessData');
        await Promise.race([prefetchBusinessData(), new Promise(r => setTimeout(r, 3000))]);
      } catch {}

      router.replace('/dashboard');
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Verification failed. Please try again.');
      setIsVerifying(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={styles.keyboardView}
      >
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={COLORS.black} />
        </TouchableOpacity>

        <View style={styles.content}>
          <View style={styles.iconWrap}>
            <Shield size={40} color={COLORS.primary} />
          </View>

          <Text style={styles.title}>Staff Verification</Text>
          <Text style={styles.subtitle}>
            Welcome, {staffName || 'team member'}! Enter the 6-digit verification code provided by your business owner to complete setup.
          </Text>

          {ownerNotified && (
            <View style={styles.notifiedBanner}>
              <Text style={styles.notifiedText}>
                Your business owner has been notified with your login code.
              </Text>
            </View>
          )}

          <View style={styles.codeRow}>
            {code.map((digit, i) => (
              <TextInput
                key={i}
                ref={ref => { inputRefs.current[i] = ref; }}
                style={[styles.codeInput, digit ? styles.codeInputFilled : null]}
                value={digit}
                onChangeText={v => handleCodeChange(v, i)}
                onKeyPress={({ nativeEvent }) => handleKeyPress(nativeEvent.key, i)}
                keyboardType="number-pad"
                maxLength={i === 0 ? 6 : 1}
                selectTextOnFocus
              />
            ))}
          </View>

          <TouchableOpacity
            style={[styles.verifyBtn, code.join('').length < 6 && styles.verifyBtnDisabled]}
            onPress={handleVerify}
            disabled={isVerifying || code.join('').length < 6}
            activeOpacity={0.8}
          >
            {isVerifying ? (
              <ActivityIndicator color={COLORS.white} />
            ) : (
              <Text style={styles.verifyBtnText}>Verify & Continue</Text>
            )}
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  keyboardView: { flex: 1 },
  backBtn: { padding: 16 },
  content: { flex: 1, paddingHorizontal: 24, alignItems: 'center', justifyContent: 'center', marginTop: -60 },
  iconWrap: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: '#EBF0F9',
    alignItems: 'center', justifyContent: 'center',
    marginBottom: 24,
  },
  title: { fontSize: 24, fontWeight: '700', color: COLORS.black, marginBottom: 12, textAlign: 'center' },
  subtitle: { fontSize: 15, color: COLORS.gray, textAlign: 'center', lineHeight: 22, marginBottom: 32, paddingHorizontal: 16 },
  codeRow: { flexDirection: 'row', gap: 10, marginBottom: 32 },
  codeInput: {
    width: 48, height: 56, borderRadius: 12,
    borderWidth: 2, borderColor: COLORS.lightGray,
    textAlign: 'center', fontSize: 22, fontWeight: '700', color: COLORS.black,
  },
  codeInputFilled: { borderColor: COLORS.primary },
  notifiedBanner: {
    backgroundColor: '#ECFDF5',
    borderRadius: 10,
    paddingHorizontal: 16,
    paddingVertical: 10,
    marginBottom: 20,
    width: '100%',
    borderWidth: 1,
    borderColor: '#A7F3D0',
  },
  notifiedText: {
    fontSize: 13,
    color: '#065F46',
    textAlign: 'center',
    lineHeight: 18,
  },
  verifyBtn: {
    backgroundColor: COLORS.primary,
    borderRadius: 14, paddingVertical: 16,
    width: '100%', alignItems: 'center',
  },
  verifyBtnDisabled: { opacity: 0.5 },
  verifyBtnText: { color: COLORS.white, fontSize: 16, fontWeight: '700' },
});
