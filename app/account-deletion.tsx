/**
 * Account & data deletion instructions (public URL for app stores).
 */

import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, UserX } from 'lucide-react-native';
import { router } from 'expo-router';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
  },
};

export default function AccountDeletionScreen() {
  const webContainerStyles = getWebContainerStyles();

  const handleBackPress = () => {
    router.back();
  };

  return (
    <ResponsiveContainer>
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <UserX size={24} color={Colors.primary} />
            <Text style={styles.headerTitle}>Account & data deletion</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === 'web' ? webContainerStyles.webScrollContent : {},
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.sectionText}>
              You can delete your Manager account and associated business data from inside the app.
              After deletion, you will not be able to sign in with the same account and your business data
              will be removed in line with our retention and legal obligations.
            </Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>How to delete your account</Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>1. Sign in to the Manager app.</Text>
                <Text style={styles.listItem}>2. Open Settings (gear icon).</Text>
                <Text style={styles.listItem}>3. Scroll to the account section.</Text>
                <Text style={styles.listItem}>4. Tap Delete Account and confirm when prompted.</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>What gets deleted</Text>
              <Text style={styles.sectionText}>
                Confirming account deletion removes your user access and begins removal of personal and
                business data associated with your account, except where we must retain information for
                legal, tax, or regulatory reasons. See our Privacy Policy for more detail.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Need help?</Text>
              <Text style={styles.sectionText}>
                If you cannot access the app or run into issues, contact us using the support details in
                the Privacy Policy and we will assist you with account deletion where we can verify your
                identity.
              </Text>
            </View>
          </View>
        </ScrollView>
      </SafeAreaView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    flexShrink: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 32,
  },
  content: {
    maxWidth: 800,
    alignSelf: 'center',
    width: '100%',
  },
  section: {
    marginTop: 24,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionText: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
  },
  listContainer: {
    marginTop: 4,
    marginLeft: 4,
  },
  listItem: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 26,
    marginBottom: 8,
  },
});
