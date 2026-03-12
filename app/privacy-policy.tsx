/**
 * Privacy Policy Screen
 * Displays the privacy policy for the application
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
import { ArrowLeft, Shield } from 'lucide-react-native';
import { useWebBackNavigation } from '@/hooks/useWebBackNavigation';
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
  }
};

export default function PrivacyPolicyScreen() {
  const { handleBack } = useWebBackNavigation();
  const webContainerStyles = getWebContainerStyles();
  
  const handleBackPress = () => {
    router.back();
  };

  return (
    <ResponsiveContainer>
      <SafeAreaView style={styles.container}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBackPress}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Shield size={24} color={Colors.primary} />
            <Text style={styles.headerTitle}>Privacy Policy</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[
            styles.scrollContent,
            Platform.OS === 'web' ? webContainerStyles.webScrollContent : {}
          ]}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.content}>
            <Text style={styles.lastUpdated}>Last Updated: {new Date().toLocaleDateString('en-IN', { year: 'numeric', month: 'long', day: 'numeric' })}</Text>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>1. Introduction</Text>
              <Text style={styles.sectionText}>
                Welcome to Manager ERP BO. We are committed to protecting your privacy and ensuring the security of your personal and business information. This Privacy Policy explains how we collect, use, disclose, and safeguard your information when you use our application.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Information We Collect</Text>
              <Text style={styles.sectionText}>
                We collect information that you provide directly to us, including:
              </Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>• Personal information (name, mobile number, email address)</Text>
                <Text style={styles.listItem}>• Business information (business name, GSTIN, PAN, business type)</Text>
                <Text style={styles.listItem}>• Financial information (bank account details, transaction data)</Text>
                <Text style={styles.listItem}>• Location data (business addresses, branch locations)</Text>
                <Text style={styles.listItem}>• Inventory and sales data</Text>
                <Text style={styles.listItem}>• Staff and customer information</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. How We Use Your Information</Text>
              <Text style={styles.sectionText}>
                We use the information we collect to:
              </Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>• Provide, maintain, and improve our services</Text>
                <Text style={styles.listItem}>• Process transactions and manage your account</Text>
                <Text style={styles.listItem}>• Send you important updates and notifications</Text>
                <Text style={styles.listItem}>• Generate reports and analytics</Text>
                <Text style={styles.listItem}>• Comply with legal obligations</Text>
                <Text style={styles.listItem}>• Prevent fraud and ensure security</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Data Security</Text>
              <Text style={styles.sectionText}>
                We implement appropriate technical and organizational security measures to protect your information against unauthorized access, alteration, disclosure, or destruction. This includes:
              </Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>• Encryption of data in transit and at rest</Text>
                <Text style={styles.listItem}>• Secure authentication and authorization</Text>
                <Text style={styles.listItem}>• Regular security audits and updates</Text>
                <Text style={styles.listItem}>• Access controls and monitoring</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Data Sharing and Disclosure</Text>
              <Text style={styles.sectionText}>
                We do not sell your personal information. We may share your information only in the following circumstances:
              </Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>• With your explicit consent</Text>
                <Text style={styles.listItem}>• To comply with legal obligations or court orders</Text>
                <Text style={styles.listItem}>• To protect our rights, property, or safety</Text>
                <Text style={styles.listItem}>• With service providers who assist in operating our services (under strict confidentiality agreements)</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Your Rights</Text>
              <Text style={styles.sectionText}>
                You have the right to:
              </Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>• Access your personal information</Text>
                <Text style={styles.listItem}>• Correct inaccurate or incomplete information</Text>
                <Text style={styles.listItem}>• Request deletion of your information</Text>
                <Text style={styles.listItem}>• Object to processing of your information</Text>
                <Text style={styles.listItem}>• Request data portability</Text>
                <Text style={styles.listItem}>• Withdraw consent at any time</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. Data Retention</Text>
              <Text style={styles.sectionText}>
                We retain your information for as long as necessary to provide our services and comply with legal obligations. When you delete your account, we will delete or anonymize your personal information, except where we are required to retain it for legal purposes.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Third-Party Services</Text>
              <Text style={styles.sectionText}>
                Our application may contain links to third-party services. We are not responsible for the privacy practices of these third parties. We encourage you to review their privacy policies.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Children's Privacy</Text>
              <Text style={styles.sectionText}>
                Our services are not intended for individuals under the age of 18. We do not knowingly collect personal information from children.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. Changes to This Policy</Text>
              <Text style={styles.sectionText}>
                We may update this Privacy Policy from time to time. We will notify you of any changes by posting the new Privacy Policy on this page and updating the "Last Updated" date. You are advised to review this Privacy Policy periodically.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>11. Contact Us</Text>
              <Text style={styles.sectionText}>
                If you have any questions about this Privacy Policy or our data practices, please contact us at:
              </Text>
              <Text style={styles.contactInfo}>
                Email: privacy@managererp.com{'\n'}
                Phone: +91-XXXX-XXXXXX
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
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
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
  lastUpdated: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 24,
    fontStyle: 'italic',
  },
  section: {
    marginBottom: 32,
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
    marginBottom: 12,
  },
  listContainer: {
    marginTop: 8,
    marginLeft: 8,
  },
  listItem: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    marginBottom: 8,
  },
  contactInfo: {
    fontSize: 16,
    color: Colors.text,
    lineHeight: 24,
    marginTop: 8,
    fontWeight: '500',
  },
});

