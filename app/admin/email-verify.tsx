import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import * as Clipboard from 'expo-clipboard';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { Shield, Smartphone, Copy, CheckCircle } from 'lucide-react-native';
import { SvgXml } from 'react-native-svg';
import {
  getSuperadminTOTPFactor,
  enrollSuperadminTOTP,
  verifySuperadminTOTP,
} from '@/services/superadminApi';
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

type ViewMode = 'loading' | 'enroll' | 'verify';

export default function SuperadminTOTPVerify() {
  const insets = useSafeAreaInsets();
  const [viewMode, setViewMode] = useState<ViewMode>('loading');
  const [factorId, setFactorId] = useState<string | null>(null);
  const [qrSvg, setQrSvg] = useState<string | null>(null);
  const [secret, setSecret] = useState<string | null>(null);
  const [secretCopied, setSecretCopied] = useState(false);
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [isVerifying, setIsVerifying] = useState(false);
  const [hasAutoVerified, setHasAutoVerified] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [initError, setInitError] = useState<string | null>(null);
  const codeRefs = useRef<TextInput[]>([]);

  const initialize = useCallback(async () => {
    setViewMode('loading');
    setInitError(null);

    const existing = await getSuperadminTOTPFactor();

    if (existing && existing.status === 'verified') {
      setFactorId(existing.factorId);
      setViewMode('verify');
      setTimeout(() => codeRefs.current[0]?.focus(), 300);
      return;
    }

    // If there's an unverified factor, unenroll it first and re-enroll
    if (existing && existing.status === 'unverified') {
      await supabase.auth.mfa.unenroll({ factorId: existing.factorId });
    }

    const result = await enrollSuperadminTOTP();
    if (!result.success) {
      setInitError(result.error || 'Failed to set up authenticator');
      setViewMode('enroll');
      return;
    }

    setFactorId(result.factorId!);
    setSecret(result.secret!);

    // Extract raw SVG from Supabase's data URI
    if (result.qrCode) {
      const svgStr = decodeURIComponent(
        result.qrCode.replace(/^data:image\/svg\+xml;utf8,/, '')
      );
      setQrSvg(svgStr);
    }

    setViewMode('enroll');
  }, []);

  useEffect(() => {
    initialize();
  }, [initialize]);

  useEffect(() => {
    if (code.every(d => d !== '') && !isVerifying && !hasAutoVerified && factorId) {
      setHasAutoVerified(true);
      handleVerify();
    }
  }, [code, isVerifying, hasAutoVerified, factorId]);

  const handleVerify = async () => {
    if (isVerifying || !factorId) return;

    const codeStr = code.join('');
    if (codeStr.length !== 6) {
      setHasAutoVerified(false);
      return;
    }

    setIsVerifying(true);
    setError(null);

    const result = await verifySuperadminTOTP(factorId, codeStr);

    if (result.success) {
      router.replace('/admin/dashboard');
    } else {
      setCode(['', '', '', '', '', '']);
      setHasAutoVerified(false);
      codeRefs.current[0]?.focus();
      setError(result.error || 'Invalid code. Please try again.');
    }

    setIsVerifying(false);
  };

  const handleCodeChange = (text: string, index: number) => {
    const newCode = [...code];
    newCode[index] = text;
    setCode(newCode);
    if (text && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }
  };

  const handleCodeKeyPress = (e: any, index: number) => {
    if (e.nativeEvent.key === 'Backspace') {
      const newCode = [...code];
      if (code[index]) {
        newCode[index] = '';
        setCode(newCode);
      } else if (index > 0) {
        newCode[index - 1] = '';
        setCode(newCode);
        setTimeout(() => codeRefs.current[index - 1]?.focus(), 10);
      }
    }
  };

  const handleCopySecret = async () => {
    if (!secret) return;
    await Clipboard.setStringAsync(secret);
    setSecretCopied(true);
    setTimeout(() => setSecretCopied(false), 2000);
  };

  const handleSignOut = async () => {
    await supabase.auth.signOut();
    router.replace('/auth/mobile');
  };

  const renderCodeInput = () => (
    <>
      <View style={styles.codeContainer}>
        {code.map((digit, index) => (
          <TextInput
            key={index}
            ref={(ref) => { if (ref) codeRefs.current[index] = ref; }}
            style={[
              styles.codeInput,
              digit && styles.filledInput,
              isVerifying && styles.verifyingInput,
              Platform.select({
                web: { outlineWidth: 0, outlineColor: 'transparent', outlineStyle: 'none' },
              }) as any,
            ]}
            value={digit}
            onChangeText={(text) => handleCodeChange(text.slice(-1), index)}
            onKeyPress={(e) => handleCodeKeyPress(e, index)}
            keyboardType="numeric"
            maxLength={1}
            textAlign="center"
            editable={!isVerifying}
          />
        ))}
      </View>

      {isVerifying && (
        <View style={styles.verifyingContainer}>
          <ActivityIndicator size="small" color={COLORS.success} />
          <Text style={styles.verifyingText}>Verifying...</Text>
        </View>
      )}

      {error && <Text style={styles.errorText}>{error}</Text>}
    </>
  );

  const renderLoading = () => (
    <View style={styles.loadingContainer}>
      <ActivityIndicator size="large" color={COLORS.primary} />
      <Text style={styles.loadingText}>Setting up authenticator...</Text>
    </View>
  );

  const renderEnrollment = () => (
    <>
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Smartphone size={32} color={COLORS.primary} />
        </View>
      </View>

      <Text style={styles.title}>Set Up Authenticator</Text>
      <Text style={styles.subtitle}>
        Scan the QR code below with your authenticator app (Google Authenticator, Authy, etc.)
      </Text>

      {initError ? (
        <View style={styles.errorBox}>
          <Text style={styles.errorBoxText}>{initError}</Text>
          <TouchableOpacity style={styles.retryBtn} onPress={initialize}>
            <Text style={styles.retryBtnText}>Try Again</Text>
          </TouchableOpacity>
        </View>
      ) : (
        <>
          {qrSvg && (
            <View style={styles.qrContainer}>
              <View style={styles.qrWrapper}>
                <SvgXml xml={qrSvg} width={200} height={200} />
              </View>
            </View>
          )}

          {secret && (
            <View style={styles.secretContainer}>
              <Text style={styles.secretLabel}>Or enter this key manually:</Text>
              <TouchableOpacity style={styles.secretRow} onPress={handleCopySecret} activeOpacity={0.7}>
                <Text style={styles.secretText} selectable>{secret}</Text>
                {secretCopied ? (
                  <CheckCircle size={18} color={COLORS.success} />
                ) : (
                  <Copy size={18} color={COLORS.primary} />
                )}
              </TouchableOpacity>
              {secretCopied && (
                <Text style={styles.copiedText}>Copied to clipboard</Text>
              )}
            </View>
          )}

          <View style={styles.divider} />

          <Text style={styles.stepLabel}>
            Enter the 6-digit code from your authenticator app:
          </Text>

          {renderCodeInput()}
        </>
      )}

      <TouchableOpacity style={styles.signOutLink} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </>
  );

  const renderVerification = () => (
    <>
      <View style={styles.iconContainer}>
        <View style={styles.iconCircle}>
          <Shield size={32} color={COLORS.primary} />
        </View>
      </View>

      <Text style={styles.title}>Authenticator Code</Text>
      <Text style={styles.subtitle}>
        Enter the 6-digit code from your authenticator app to continue.
      </Text>

      <View style={styles.securityNote}>
        <Shield size={16} color={COLORS.primary} />
        <Text style={styles.securityText}>
          Open your authenticator app (Google Authenticator, Authy, etc.) and enter the current code.
        </Text>
      </View>

      {renderCodeInput()}

      <TouchableOpacity style={styles.signOutLink} onPress={handleSignOut}>
        <Text style={styles.signOutText}>Sign Out</Text>
      </TouchableOpacity>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
      >
        <ScrollView
          style={{ flex: 1 }}
          contentContainerStyle={[
            styles.scrollContent,
            { paddingTop: Platform.select({ web: 20, android: Math.max(insets.top, 16), default: Math.max(insets.top, 0) }) },
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          {viewMode === 'loading' && renderLoading()}
          {viewMode === 'enroll' && renderEnrollment()}
          {viewMode === 'verify' && renderVerification()}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: COLORS.white },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Platform.select({ web: 30, default: 16 }),
    paddingBottom: 40,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 100,
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: COLORS.gray,
  },
  iconContainer: {
    alignItems: 'center',
    marginTop: Platform.select({ web: 20, default: 24 }),
    marginBottom: Platform.select({ web: 40, default: 24 }),
  },
  iconCircle: {
    width: 80, height: 80, borderRadius: 40,
    backgroundColor: COLORS.secondary,
    justifyContent: 'center', alignItems: 'center',
    borderWidth: 3, borderColor: COLORS.primary,
  },
  title: {
    fontSize: 28, fontWeight: '700', color: COLORS.black,
    textAlign: 'center', marginBottom: 12,
  },
  subtitle: {
    fontSize: 16, color: COLORS.gray, textAlign: 'center',
    marginBottom: 24, lineHeight: 22,
  },
  securityNote: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: '#EBF0F8', padding: 12, borderRadius: 8,
    marginBottom: 24, borderLeftWidth: 3, borderLeftColor: COLORS.primary,
  },
  securityText: { flex: 1, fontSize: 13, color: COLORS.primary, lineHeight: 18 },
  qrContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  qrWrapper: {
    padding: 16,
    backgroundColor: COLORS.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: COLORS.lightGray,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 8,
    elevation: 3,
  },
  secretContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  secretLabel: {
    fontSize: 13,
    color: COLORS.gray,
    marginBottom: 8,
  },
  secretRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: COLORS.lightGray,
    paddingVertical: 10,
    paddingHorizontal: 16,
    borderRadius: 8,
  },
  secretText: {
    fontSize: 14,
    fontWeight: '600',
    color: COLORS.black,
    letterSpacing: 1.5,
    fontFamily: Platform.select({ ios: 'Menlo', android: 'monospace', default: 'monospace' }),
  },
  copiedText: {
    fontSize: 12,
    color: COLORS.success,
    marginTop: 4,
  },
  divider: {
    height: 1,
    backgroundColor: COLORS.lightGray,
    marginBottom: 24,
  },
  stepLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: COLORS.black,
    textAlign: 'center',
    marginBottom: 20,
  },
  codeContainer: {
    flexDirection: 'row', justifyContent: 'space-between', marginBottom: 24,
  },
  codeInput: {
    width: 45, height: 55, borderWidth: 2,
    borderColor: COLORS.lightGray, borderRadius: 8,
    fontSize: 20, fontWeight: '600', color: COLORS.black, textAlign: 'center',
  },
  filledInput: { borderColor: COLORS.primary, backgroundColor: '#F0F4FF' },
  verifyingInput: { borderColor: COLORS.success },
  verifyingContainer: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
    backgroundColor: '#D1FAE5', paddingVertical: 12, paddingHorizontal: 16,
    borderRadius: 8, marginBottom: 20,
  },
  verifyingText: { color: '#047857', fontSize: 14, fontWeight: '500' },
  errorText: {
    color: COLORS.error, fontSize: 14, marginBottom: 16, textAlign: 'center',
  },
  errorBox: {
    backgroundColor: '#FEF2F2',
    borderRadius: 12,
    padding: 20,
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 1,
    borderColor: '#FECACA',
  },
  errorBoxText: {
    color: COLORS.error,
    fontSize: 14,
    textAlign: 'center',
    marginBottom: 12,
    lineHeight: 20,
  },
  retryBtn: {
    backgroundColor: COLORS.primary,
    paddingVertical: 10,
    paddingHorizontal: 24,
    borderRadius: 8,
  },
  retryBtnText: {
    color: COLORS.white,
    fontSize: 14,
    fontWeight: '600',
  },
  signOutLink: { alignItems: 'center', marginTop: 24 },
  signOutText: { fontSize: 14, color: COLORS.gray, fontWeight: '500' },
});
