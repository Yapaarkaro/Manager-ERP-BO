import React, { useState } from 'react';
import { router } from 'expo-router';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { 
  ArrowLeft,
  Search,
  Filter,
  Calendar,
  CheckCircle,
  XCircle,
  Clock,
  Receipt,
} from 'lucide-react-native';

const Colors = {
  background: '#ffffff',
  text: '#1e293b',
  textLight: '#64748b',
  primary: '#3F66AC', // Brand primary blue
  secondary: '#FFC754', // Brand accent yellow
  success: '#10b981',
  error: '#ef4444',
  warning: '#FFC754', // Using brand yellow for warnings
  grey: {
    50: '#f8fafc',
    100: '#f1f5f9',
    200: '#e2e8f0',
    300: '#cbd5e1',
  }
};

export default function SubscriptionsScreen() {
  // Mock subscription data
  const [subscriptions] = useState([
    {
      id: '1',
      name: 'ERP Basic Plan',
      amount: 500,
      currency: '₹',
      status: 'current',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      nextBilling: '2024-12-31',
      invoiceId: 'INV-001',
      description: 'Essential ERP features for small businesses',
      features: ['Inventory Management', 'Basic Sales Tracking', 'Simple Reports'],
      type: 'subscription'
    },
    {
      id: '2',
      name: 'ERP Pro Plan',
      amount: 750,
      currency: '₹',
      status: 'paid',
      startDate: '2024-01-01',
      endDate: '2024-03-31',
      nextBilling: '2024-03-31',
      invoiceId: 'INV-002',
      description: 'Complete ERP solution with all modules',
      features: ['Full Inventory Management', 'Sales & CRM', 'Financial Reports', 'Analytics Dashboard'],
      type: 'subscription'
    },
    {
      id: '3',
      name: 'GST Filing Service',
      amount: 500,
      currency: '₹',
      status: 'current',
      startDate: '2024-01-01',
      endDate: '2024-12-31',
      nextBilling: '2024-12-31',
      invoiceId: 'INV-003',
      description: 'Monthly GST filing and compliance service',
      features: ['GST Return Filing', 'Compliance Monitoring', 'Tax Calculation', 'Document Management'],
      type: 'addon'
    },
    {
      id: '4',
      name: 'Digital Marketing Package',
      amount: 5000,
      currency: '₹',
      status: 'paid',
      startDate: '2024-02-01',
      endDate: '2024-04-30',
      nextBilling: '2024-04-30',
      invoiceId: 'INV-004',
      description: 'Comprehensive digital marketing services',
      features: ['Social Media Management', 'Google Ads', 'Content Creation', 'Performance Analytics'],
      type: 'marketing'
    },
    {
      id: '5',
      name: 'SEO Optimization',
      amount: 3000,
      currency: '₹',
      status: 'failed',
      startDate: '2024-03-01',
      endDate: '2024-05-31',
      nextBilling: '2024-05-31',
      invoiceId: 'INV-005',
      description: 'Search engine optimization services',
      features: ['Keyword Research', 'On-Page SEO', 'Link Building', 'Ranking Reports'],
      type: 'marketing'
    },
  ]);

  const [selectedSubscription, setSelectedSubscription] = useState<any>(null);
  const [subscriptionSearch, setSubscriptionSearch] = useState('');

  const handleBackPress = () => {
    router.back();
  };

  const handleSubscriptionSelect = (subscription: any) => {
    // Navigate to detailed invoice view
    const invoiceData = {
      id: subscription.id,
      invoiceNumber: subscription.invoiceId,
      customerName: 'Business Owner',
      customerType: 'business',
      subscriptionName: subscription.name,
      subscriptionType: subscription.type,
      amount: subscription.amount,
      currency: subscription.currency,
      status: subscription.status,
      startDate: subscription.startDate,
      endDate: subscription.endDate,
      nextBilling: subscription.nextBilling,
      description: subscription.description,
      features: subscription.features,
      customerDetails: {
        name: 'Business Owner',
        mobile: '+91 98765 43210',
        businessName: 'Your Business Name',
        address: '123, Sample Address, City - 560001'
      }
    };

    router.push({
      pathname: '/subscription-invoice-details',
      params: {
        invoiceId: invoiceData.id,
        invoiceData: JSON.stringify(invoiceData)
      }
    });
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'current':
        return <Clock size={16} color={Colors.primary} />;
      case 'paid':
        return <CheckCircle size={16} color={Colors.success} />;
      case 'failed':
        return <XCircle size={16} color={Colors.error} />;
      default:
        return <Clock size={16} color={Colors.textLight} />;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'current':
        return Colors.primary;
      case 'paid':
        return Colors.success;
      case 'failed':
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const getTypeBadgeColor = (type: string) => {
    switch (type) {
      case 'subscription':
        return Colors.primary;
      case 'addon':
        return Colors.secondary;
      case 'marketing':
        return Colors.warning;
      default:
        return Colors.textLight;
    }
  };

  const getTypeLabel = (type: string) => {
    switch (type) {
      case 'subscription':
        return 'ERP Plan';
      case 'addon':
        return 'Add-on Service';
      case 'marketing':
        return 'Marketing Service';
      default:
        return 'Service';
    }
  };

  const filteredSubscriptions = subscriptions.filter(subscription =>
    subscription.name.toLowerCase().includes(subscriptionSearch.toLowerCase()) ||
    subscription.status.toLowerCase().includes(subscriptionSearch.toLowerCase())
  );

  return (
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
        
        <Text style={styles.headerTitle}>Subscriptions</Text>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* January Month Invoice */}
        <View style={styles.monthSection}>
          <Text style={styles.monthTitle}>January Month Invoice</Text>
          <TouchableOpacity
            style={styles.invoiceCard}
            onPress={() => handleSubscriptionSelect(subscriptions[0])}
            activeOpacity={0.7}
          >
            <View style={styles.invoiceHeader}>
              <Text style={styles.invoiceName}>ERP Basic Plan</Text>
              <View style={[styles.statusBadge, { backgroundColor: Colors.primary + '15' }]}>
                <Text style={[styles.statusText, { color: Colors.primary }]}>Current</Text>
              </View>
            </View>
            <Text style={styles.invoiceAmount}>₹500</Text>
            <Text style={styles.invoiceDate}>Jan 1, 2024 - Dec 31, 2024</Text>
          </TouchableOpacity>
        </View>

        {/* February Month Invoice */}
        <View style={styles.monthSection}>
          <Text style={styles.monthTitle}>February Month Invoice</Text>
          <TouchableOpacity
            style={styles.invoiceCard}
            onPress={() => handleSubscriptionSelect(subscriptions[1])}
            activeOpacity={0.7}
          >
            <View style={styles.invoiceHeader}>
              <Text style={styles.invoiceName}>ERP Pro Plan</Text>
              <View style={[styles.statusBadge, { backgroundColor: Colors.success + '15' }]}>
                <Text style={[styles.statusText, { color: Colors.success }]}>Paid</Text>
              </View>
            </View>
            <Text style={styles.invoiceAmount}>₹750</Text>
            <Text style={styles.invoiceDate}>Jan 1, 2024 - Mar 31, 2024</Text>
          </TouchableOpacity>
        </View>

        {/* GST Add-on Services */}
        <View style={styles.monthSection}>
          <Text style={styles.monthTitle}>GST (Add-on Services)</Text>
          <TouchableOpacity
            style={styles.invoiceCard}
            onPress={() => handleSubscriptionSelect(subscriptions[2])}
            activeOpacity={0.7}
          >
            <View style={styles.invoiceHeader}>
              <Text style={styles.invoiceName}>GST Filing Service</Text>
              <View style={[styles.statusBadge, { backgroundColor: Colors.secondary + '15' }]}>
                <Text style={[styles.statusText, { color: Colors.secondary }]}>Add-on</Text>
              </View>
            </View>
            <Text style={styles.invoiceAmount}>₹500</Text>
            <Text style={styles.invoiceDate}>Jan 1, 2024 - Dec 31, 2024</Text>
          </TouchableOpacity>
        </View>

        {/* March Invoice */}
        <View style={styles.monthSection}>
          <Text style={styles.monthTitle}>March Invoice</Text>
          <TouchableOpacity
            style={styles.invoiceCard}
            onPress={() => handleSubscriptionSelect(subscriptions[3])}
            activeOpacity={0.7}
          >
            <View style={styles.invoiceHeader}>
              <Text style={styles.invoiceName}>Digital Marketing Package</Text>
              <View style={[styles.statusBadge, { backgroundColor: Colors.success + '15' }]}>
                <Text style={[styles.statusText, { color: Colors.success }]}>Paid</Text>
              </View>
            </View>
            <Text style={styles.invoiceAmount}>₹5,000</Text>
            <Text style={styles.invoiceDate}>Feb 1, 2024 - Apr 30, 2024</Text>
          </TouchableOpacity>
        </View>

        {/* Marketing Services */}
        <View style={styles.monthSection}>
          <Text style={styles.monthTitle}>Marketing Services</Text>
          <TouchableOpacity
            style={styles.invoiceCard}
            onPress={() => handleSubscriptionSelect(subscriptions[4])}
            activeOpacity={0.7}
          >
            <View style={styles.invoiceHeader}>
              <Text style={styles.invoiceName}>SEO Optimization</Text>
              <View style={[styles.statusBadge, { backgroundColor: Colors.error + '15' }]}>
                <Text style={[styles.statusText, { color: Colors.error }]}>Failed</Text>
              </View>
            </View>
            <Text style={styles.invoiceAmount}>₹3,000</Text>
            <Text style={styles.invoiceDate}>Mar 1, 2024 - May 31, 2024</Text>
          </TouchableOpacity>
        </View>

        {/* Current Plan Section - At Bottom */}
        <View style={styles.currentPlanSection}>
          <Text style={styles.currentPlanTitle}>Current Plan</Text>
          {subscriptions.find(s => s.status === 'current') && (
            <View style={styles.currentPlanCard}>
              <View style={styles.currentPlanHeader}>
                <Text style={styles.currentPlanName}>
                  {subscriptions.find(s => s.status === 'current')?.name}
                </Text>
                <View style={[styles.statusBadge, { backgroundColor: Colors.primary + '15' }]}>
                  <Text style={[styles.statusText, { color: Colors.primary }]}>Active</Text>
                </View>
              </View>
              
              <View style={styles.currentPlanDetails}>
                <Text style={styles.currentPlanAmount}>
                  ₹{subscriptions.find(s => s.status === 'current')?.amount.toLocaleString()}
                </Text>
                <Text style={styles.currentPlanPeriod}>
                  {new Date(subscriptions.find(s => s.status === 'current')?.startDate || '').toLocaleDateString()} - {new Date(subscriptions.find(s => s.status === 'current')?.endDate || '').toLocaleDateString()}
                </Text>
              </View>
              
              <View style={styles.currentPlanFooter}>
                <Text style={styles.invoiceId}>
                  Invoice: {subscriptions.find(s => s.status === 'current')?.invoiceId}
                </Text>
                <Text style={styles.nextBilling}>
                  Next: {new Date(subscriptions.find(s => s.status === 'current')?.nextBilling || '').toLocaleDateString()}
                </Text>
              </View>
            </View>
          )}
        </View>

      </ScrollView>

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search subscriptions..."
              placeholderTextColor={Colors.textLight}
              value={subscriptionSearch}
              onChangeText={setSubscriptionSearch}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => console.log('Filter subscriptions')}
              activeOpacity={0.7}
            >
              <Filter size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  content: {
    flex: 1,
    padding: 16,
    paddingBottom: 100, // Add padding for floating search
  },
  monthSection: {
    marginBottom: 24,
  },
  monthTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  invoiceCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: Colors.text,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 4,
    elevation: 2,
  },
  invoiceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  invoiceName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  invoiceAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 8,
  },
  invoiceDate: {
    fontSize: 14,
    color: Colors.textLight,
  },
  currentPlanSection: {
    marginBottom: 24,
  },
  currentPlanTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 12,
  },
  currentPlanCard: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    borderColor: Colors.primary + '20',
  },
  currentPlanHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  currentPlanName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    flex: 1,
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    gap: 6,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  currentPlanDetails: {
    marginBottom: 16,
  },
  currentPlanAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: Colors.primary,
    marginBottom: 4,
  },
  currentPlanPeriod: {
    fontSize: 16,
    color: Colors.textLight,
  },
  currentPlanFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  invoiceId: {
    fontSize: 14,
    color: Colors.textLight,
  },
  nextBilling: {
    fontSize: 14,
    color: Colors.textLight,
  },
  subscriptionsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
  },
  subscriptionCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  selectedSubscriptionCard: {
    borderColor: Colors.primary,
    borderWidth: 2,
    backgroundColor: Colors.primary + '05',
  },
  subscriptionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 16,
  },
  subscriptionInfo: {
    flex: 1,
    marginRight: 12,
  },
  subscriptionName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  subscriptionDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  badgeContainer: {
    alignItems: 'flex-end',
    gap: 8,
  },
  typeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  typeText: {
    fontSize: 10,
    fontWeight: '600',
  },
  subscriptionDetails: {
    marginBottom: 16,
  },
  subscriptionAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  subscriptionPeriod: {
    fontSize: 14,
    color: Colors.textLight,
  },
  subscriptionFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  featuresList: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  featuresTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  featureItem: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
    paddingLeft: 8,
  },
  bottomSearchContainer: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 0,
    marginLeft: 12,
  },
  floatingSearchContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.background,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  searchContainer: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.grey[300],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    marginRight: 12,
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
});
