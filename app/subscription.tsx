import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import { ArrowLeft, CheckCircle, Crown, Users, MapPin, FileText, Star } from 'lucide-react-native';
import { subscriptionStore, subscriptionPlans, addOns, oneTimeServices, SubscriptionPlan, AddOn, OneTimeService } from '@/utils/subscriptionStore';

export default function SubscriptionScreen() {
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan | null>(null);
  const [selectedAddOns, setSelectedAddOns] = useState<AddOn[]>([]);
  const [selectedServices, setSelectedServices] = useState<OneTimeService[]>([]);
  const [subscription, setSubscription] = useState(subscriptionStore.getSubscription());
  const [trialProgress, setTrialProgress] = useState(subscriptionStore.getTrialProgress());

  useEffect(() => {
    const updateSubscription = () => {
      setSubscription(subscriptionStore.getSubscription());
      setTrialProgress(subscriptionStore.getTrialProgress());
    };

    updateSubscription();
    // Update every minute to keep trial progress current
    const interval = setInterval(updateSubscription, 60000);
    return () => clearInterval(interval);
  }, []);

  const handlePlanSelect = (plan: SubscriptionPlan) => {
    setSelectedPlan(plan);
  };

  const handleAddOnToggle = (addOn: AddOn) => {
    setSelectedAddOns(prev => {
      const exists = prev.find(item => item.id === addOn.id);
      if (exists) {
        return prev.filter(item => item.id !== addOn.id);
      } else {
        return [...prev, addOn];
      }
    });
  };

  const handleServiceToggle = (service: OneTimeService) => {
    setSelectedServices(prev => {
      const exists = prev.find(item => item.id === service.id);
      if (exists) {
        return prev.filter(item => item.id !== service.id);
      } else {
        return [...prev, service];
      }
    });
  };

  const calculateTotal = () => {
    let total = 0;
    
    if (selectedPlan) {
      total += selectedPlan.price;
    }
    
    selectedAddOns.forEach(addOn => {
      total += addOn.price;
    });
    
    selectedServices.forEach(service => {
      total += service.price;
    });
    
    return total;
  };

  const handleSubscribe = () => {
    if (selectedPlan) {
      subscriptionStore.subscribeToPlan(selectedPlan, selectedAddOns);
      selectedServices.forEach(service => {
        subscriptionStore.addOneTimeService(service);
      });
      setSubscription(subscriptionStore.getSubscription());
      // Navigate to payment or success screen
      router.push('/subscription-success');
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatTrialEndDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#3f66ac" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Subscription Plans</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Trial Progress */}
          {subscription.isOnTrial && (
            <View style={styles.trialContainer}>
              <View style={styles.trialHeader}>
                <Crown size={24} color="#3f66ac" />
                <Text style={styles.trialTitle}>Free Trial Active</Text>
              </View>
              <Text style={styles.trialSubtitle}>
                {trialProgress.daysRemaining} days remaining
              </Text>
              <View style={styles.progressBar}>
                <View 
                  style={[
                    styles.progressFill, 
                    { width: `${trialProgress.percentage}%` }
                  ]} 
                />
              </View>
              <Text style={styles.trialEndText}>
                Trial ends on {formatTrialEndDate(subscription.trialEndDate!)}
              </Text>
            </View>
          )}

          {/* Subscription Plans */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Choose Your Plan</Text>
            {subscriptionPlans.map((plan) => (
              <TouchableOpacity
                key={plan.id}
                style={[
                  styles.planCard,
                  selectedPlan?.id === plan.id && styles.selectedPlanCard,
                  plan.type === 'yearly' && styles.popularPlan
                ]}
                onPress={() => handlePlanSelect(plan)}
                activeOpacity={0.8}
              >
                {plan.type === 'yearly' && (
                  <View style={styles.popularBadge}>
                    <Star size={16} color="#ffffff" />
                    <Text style={styles.popularText}>Best Value</Text>
                  </View>
                )}
                
                <View style={styles.planHeader}>
                  <Text style={styles.planName}>{plan.name}</Text>
                  <Text style={styles.planPrice}>{formatPrice(plan.price)}</Text>
                  <Text style={styles.planPeriod}>
                    {plan.type === 'monthly' ? 'per month' : 'per year'}
                  </Text>
                  {plan.type === 'yearly' && (
                    <Text style={styles.savingsText}>Save 2 months!</Text>
                  )}
                </View>

                <View style={styles.planFeatures}>
                  <View style={styles.featureItem}>
                    <MapPin size={16} color="#10b981" />
                    <Text style={styles.featureText}>
                      {plan.locations} Location{plan.locations > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <Users size={16} color="#10b981" />
                    <Text style={styles.featureText}>
                      {plan.staffAccounts} Staff Account{plan.staffAccounts > 1 ? 's' : ''}
                    </Text>
                  </View>
                  <View style={styles.featureItem}>
                    <FileText size={16} color="#10b981" />
                    <Text style={styles.featureText}>All Features Included</Text>
                  </View>
                </View>
              </TouchableOpacity>
            ))}
          </View>

          {/* Add-ons */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Add-ons (Optional)</Text>
            {addOns.map((addOn) => (
              <TouchableOpacity
                key={addOn.id}
                style={[
                  styles.addOnCard,
                  selectedAddOns.find(item => item.id === addOn.id) && styles.selectedAddOnCard
                ]}
                onPress={() => handleAddOnToggle(addOn)}
                activeOpacity={0.8}
              >
                <View style={styles.addOnHeader}>
                  <Text style={styles.addOnName}>{addOn.name}</Text>
                  <Text style={styles.addOnPrice}>{formatPrice(addOn.price)}</Text>
                </View>
                <Text style={styles.addOnDescription}>{addOn.description}</Text>
                <Text style={styles.addOnPeriod}>
                  {addOn.type === 'monthly' ? 'per month' : 'per year'}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* One-time Services */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>One-time Services</Text>
            {oneTimeServices.map((service) => (
              <TouchableOpacity
                key={service.id}
                style={[
                  styles.serviceCard,
                  selectedServices.find(item => item.id === service.id) && styles.selectedServiceCard
                ]}
                onPress={() => handleServiceToggle(service)}
                activeOpacity={0.8}
              >
                <View style={styles.serviceHeader}>
                  <Text style={styles.serviceName}>{service.name}</Text>
                  <Text style={styles.servicePrice}>{formatPrice(service.price)}</Text>
                </View>
                <Text style={styles.serviceDescription}>{service.description}</Text>
                <Text style={styles.serviceNote}>One-time payment</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Total and Subscribe Button */}
          {selectedPlan && (
            <View style={styles.totalContainer}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Total:</Text>
                <Text style={styles.totalAmount}>{formatPrice(calculateTotal())}</Text>
              </View>
              <Text style={styles.totalNote}>+ applicable taxes</Text>
              
              <TouchableOpacity
                style={styles.subscribeButton}
                onPress={handleSubscribe}
                activeOpacity={0.8}
              >
                <Text style={styles.subscribeButtonText}>
                  Subscribe Now
                </Text>
              </TouchableOpacity>
            </View>
          )}
        </ScrollView>
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
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  scrollView: {
    flex: 1,
  },
  trialContainer: {
    backgroundColor: '#f0f4ff',
    margin: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#3f66ac',
  },
  trialHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  trialTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#3f66ac',
    marginLeft: 8,
  },
  trialSubtitle: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 12,
  },
  progressBar: {
    height: 8,
    backgroundColor: '#e9ecef',
    borderRadius: 4,
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    backgroundColor: '#3f66ac',
    borderRadius: 4,
  },
  trialEndText: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
  },
  section: {
    paddingHorizontal: 24,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 16,
  },
  planCard: {
    backgroundColor: '#ffffff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 16,
    borderWidth: 2,
    borderColor: '#e9ecef',
    position: 'relative',
  },
  selectedPlanCard: {
    borderColor: '#3f66ac',
    backgroundColor: '#f0f4ff',
  },
  popularPlan: {
    borderColor: '#10b981',
    backgroundColor: '#f0fdf4',
  },
  popularBadge: {
    position: 'absolute',
    top: -10,
    right: 20,
    backgroundColor: '#10b981',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
  },
  popularText: {
    color: '#ffffff',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 4,
  },
  planHeader: {
    alignItems: 'center',
    marginBottom: 16,
  },
  planName: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
    marginBottom: 8,
  },
  planPrice: {
    fontSize: 28,
    fontWeight: '800',
    color: '#3f66ac',
    marginBottom: 4,
  },
  planPeriod: {
    fontSize: 14,
    color: '#64748b',
  },
  savingsText: {
    fontSize: 12,
    color: '#10b981',
    fontWeight: '600',
    marginTop: 4,
  },
  planFeatures: {
    gap: 8,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  featureText: {
    fontSize: 14,
    color: '#374151',
    marginLeft: 8,
  },
  addOnCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedAddOnCard: {
    borderColor: '#3f66ac',
    backgroundColor: '#f0f4ff',
  },
  addOnHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  addOnName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  addOnPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3f66ac',
  },
  addOnDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  addOnPeriod: {
    fontSize: 12,
    color: '#64748b',
  },
  serviceCard: {
    backgroundColor: '#ffffff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectedServiceCard: {
    borderColor: '#3f66ac',
    backgroundColor: '#f0f4ff',
  },
  serviceHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  servicePrice: {
    fontSize: 16,
    fontWeight: '700',
    color: '#3f66ac',
  },
  serviceDescription: {
    fontSize: 14,
    color: '#64748b',
    marginBottom: 4,
  },
  serviceNote: {
    fontSize: 12,
    color: '#64748b',
  },
  totalContainer: {
    backgroundColor: '#f8f9fa',
    margin: 24,
    padding: 20,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#1a1a1a',
  },
  totalAmount: {
    fontSize: 24,
    fontWeight: '800',
    color: '#3f66ac',
  },
  totalNote: {
    fontSize: 12,
    color: '#64748b',
    textAlign: 'center',
    marginBottom: 20,
  },
  subscribeButton: {
    backgroundColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  subscribeButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '700',
  },
});
