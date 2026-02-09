/**
 * Terms and Conditions Screen
 * Displays the terms and conditions for the application
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
import { ArrowLeft, FileText } from 'lucide-react-native';
import { useWebBackNavigation } from '@/hooks/useWebBackNavigation';
import { useWebNavigation } from '@/contexts/WebNavigationContext';
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

export default function TermsAndConditionsScreen() {
  const { handleBack } = useWebBackNavigation();
  const { isWeb, navigateToScreen } = useWebNavigation();
  const webContainerStyles = getWebContainerStyles();
  
  const handleBackPress = () => {
    if (Platform.OS === 'web' && isWeb) {
      // On web, navigate back to settings in the dashboard area
      navigateToScreen('/settings');
    } else {
      // On mobile, use normal back navigation
      router.back();
    }
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
            <FileText size={24} color={Colors.primary} />
            <Text style={styles.headerTitle}>Terms & Conditions</Text>
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
              <Text style={styles.sectionTitle}>1. Acceptance of Terms</Text>
              <Text style={styles.sectionText}>
                By accessing and using Manager ERP BO, you accept and agree to be bound by the terms and provision of this agreement. If you do not agree to these terms, please do not use our services.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>2. Description of Service</Text>
              <Text style={styles.sectionText}>
                Manager ERP BO is a business management application that provides tools for managing inventory, sales, purchases, customers, suppliers, staff, financial transactions, and other business operations.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>3. User Account</Text>
              <Text style={styles.sectionText}>
                To use our services, you must:
              </Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>• Provide accurate and complete information during registration</Text>
                <Text style={styles.listItem}>• Maintain the security of your account credentials</Text>
                <Text style={styles.listItem}>• Be responsible for all activities under your account</Text>
                <Text style={styles.listItem}>• Notify us immediately of any unauthorized use</Text>
                <Text style={styles.listItem}>• Be at least 18 years old to use the service</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>4. Free Trial</Text>
              <Text style={styles.sectionText}>
                We offer a 30-day free trial period for new users. During the trial:
              </Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>• You have full access to all features</Text>
                <Text style={styles.listItem}>• After the trial expires, you will enter read-only mode</Text>
                <Text style={styles.listItem}>• To continue using the service, you must subscribe to a paid plan</Text>
                <Text style={styles.listItem}>• Trial terms may be modified at our discretion</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>5. Subscription Plans</Text>
              <Text style={styles.sectionText}>
                We offer the following subscription plans:
              </Text>
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Monthly Plan - ₹750/month</Text>
                <View style={styles.listContainer}>
                  <Text style={styles.listItem}>• 1 primary location</Text>
                  <Text style={styles.listItem}>• Overview of 2 locations</Text>
                  <Text style={styles.listItem}>• 3 staff accounts included</Text>
                  <Text style={styles.listItem}>• Additional staff: ₹100/month per account</Text>
                  <Text style={styles.listItem}>• Additional location: ₹150/month</Text>
                </View>
              </View>
              <View style={styles.subsection}>
                <Text style={styles.subsectionTitle}>Yearly Plan - ₹7500/year</Text>
                <View style={styles.listContainer}>
                  <Text style={styles.listItem}>• 1 primary address</Text>
                  <Text style={styles.listItem}>• Overview of 5 locations</Text>
                  <Text style={styles.listItem}>• 10 staff accounts included</Text>
                </View>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>6. Payment Terms</Text>
              <Text style={styles.sectionText}>
                By subscribing to a paid plan, you agree to:
              </Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>• Pay all fees associated with your subscription</Text>
                <Text style={styles.listItem}>• Provide valid payment information</Text>
                <Text style={styles.listItem}>• Authorize automatic recurring charges</Text>
                <Text style={styles.listItem}>• Understand that fees are non-refundable except as required by law</Text>
                <Text style={styles.listItem}>• Accept that prices may change with 30 days notice</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>7. User Responsibilities</Text>
              <Text style={styles.sectionText}>
                You are responsible for:
              </Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>• Maintaining the accuracy of your business data</Text>
                <Text style={styles.listItem}>• Complying with all applicable laws and regulations</Text>
                <Text style={styles.listItem}>• Not using the service for illegal or unauthorized purposes</Text>
                <Text style={styles.listItem}>• Backing up your data regularly</Text>
                <Text style={styles.listItem}>• Ensuring the security of your account</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>8. Prohibited Activities</Text>
              <Text style={styles.sectionText}>
                You agree not to:
              </Text>
              <View style={styles.listContainer}>
                <Text style={styles.listItem}>• Use the service for any illegal purpose</Text>
                <Text style={styles.listItem}>• Attempt to gain unauthorized access to the system</Text>
                <Text style={styles.listItem}>• Interfere with or disrupt the service</Text>
                <Text style={styles.listItem}>• Reverse engineer or copy the application</Text>
                <Text style={styles.listItem}>• Share your account credentials with others</Text>
                <Text style={styles.listItem}>• Use automated systems to access the service</Text>
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>9. Intellectual Property</Text>
              <Text style={styles.sectionText}>
                All content, features, and functionality of Manager ERP BO, including but not limited to text, graphics, logos, and software, are the property of the company and are protected by copyright, trademark, and other intellectual property laws.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>10. Data Ownership</Text>
              <Text style={styles.sectionText}>
                You retain all ownership rights to your business data. We do not claim ownership of your data. However, by using our service, you grant us a license to use, store, and process your data solely for the purpose of providing and improving our services.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>11. Service Availability</Text>
              <Text style={styles.sectionText}>
                We strive to provide reliable service but do not guarantee uninterrupted or error-free operation. We may perform maintenance, updates, or modifications that may temporarily interrupt service. We are not liable for any loss or damage resulting from service interruptions.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>12. Limitation of Liability</Text>
              <Text style={styles.sectionText}>
                To the maximum extent permitted by law, Manager ERP BO shall not be liable for any indirect, incidental, special, consequential, or punitive damages, or any loss of profits or revenues, whether incurred directly or indirectly, or any loss of data, use, goodwill, or other intangible losses.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>13. Termination</Text>
              <Text style={styles.sectionText}>
                We may terminate or suspend your account and access to the service immediately, without prior notice, for conduct that we believe violates these Terms or is harmful to other users, us, or third parties. You may cancel your subscription at any time through your account settings.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>14. Changes to Terms</Text>
              <Text style={styles.sectionText}>
                We reserve the right to modify these Terms at any time. We will notify you of any material changes by posting the updated Terms on this page and updating the "Last Updated" date. Your continued use of the service after such changes constitutes acceptance of the modified Terms.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>15. Governing Law</Text>
              <Text style={styles.sectionText}>
                These Terms shall be governed by and construed in accordance with the laws of India, without regard to its conflict of law provisions. Any disputes arising from these Terms shall be subject to the exclusive jurisdiction of the courts in India.
              </Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.sectionTitle}>16. Contact Information</Text>
              <Text style={styles.sectionText}>
                If you have any questions about these Terms, please contact us at:
              </Text>
              <Text style={styles.contactInfo}>
                Email: support@managererp.com{'\n'}
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
  subsection: {
    marginTop: 16,
    marginBottom: 16,
    paddingLeft: 16,
  },
  subsectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
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

