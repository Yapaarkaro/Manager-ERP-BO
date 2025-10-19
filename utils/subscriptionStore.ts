import AsyncStorage from '@react-native-async-storage/async-storage';

export interface SubscriptionPlan {
  id: string;
  name: string;
  type: 'monthly' | 'yearly';
  price: number;
  locations: number;
  staffAccounts: number;
  description: string;
  features: string[];
}

export interface AddOn {
  id: string;
  name: string;
  type: 'monthly' | 'yearly';
  price: number;
  category: 'staff' | 'location' | 'gst_filing';
  description: string;
}

export interface OneTimeService {
  id: string;
  name: string;
  price: number;
  category: 'marketing' | 'consultation';
  description: string;
}

export interface Subscription {
  isOnTrial: boolean;
  trialStartDate?: string;
  trialEndDate?: string;
  planId?: string; // 'monthly', 'yearly'
  status: 'active' | 'inactive' | 'trialing' | 'cancelled';
  currentPeriodEnd?: string;
  addons?: {
    staff: number;
    locations: number;
    gstFiling: boolean;
  };
}

export interface TrialProgress {
  daysUsed: number;
  daysRemaining: number;
  percentage: number;
}

export interface SubscriptionState {
  isOnTrial: boolean;
  trialStartDate: string | null;
  trialEndDate: string | null;
  currentPlan: SubscriptionPlan | null;
  addOns: AddOn[];
  oneTimeServices: OneTimeService[];
  isActive: boolean;
}

const SUBSCRIPTION_STORAGE_KEY = 'subscription_data';

export const subscriptionPlans: SubscriptionPlan[] = [
  {
    id: 'monthly_basic',
    name: 'Monthly Plan',
    type: 'monthly',
    price: 999,
    locations: 2,
    staffAccounts: 3,
    description: 'Perfect for small businesses',
    features: [
      '2 Location Overview',
      '3 Staff Accounts',
      'Basic Inventory Management',
      'Invoice Generation',
      'Basic Reporting'
    ]
  },
  {
    id: 'yearly_premium',
    name: 'Yearly Plan',
    type: 'yearly',
    price: 9999,
    locations: 4,
    staffAccounts: 10,
    description: 'Best value for growing businesses',
    features: [
      '4 Location Overview',
      '10 Staff Accounts',
      'Advanced Inventory Management',
      'Invoice Generation',
      'Advanced Reporting',
      'Priority Support',
      '2 Months Free'
    ]
  }
];

export const addOns: AddOn[] = [
  {
    id: 'staff_monthly',
    name: 'Additional Staff',
    type: 'monthly',
    price: 99,
    category: 'staff',
    description: 'Add more staff accounts to your plan'
  },
  {
    id: 'staff_yearly',
    name: 'Additional Staff',
    type: 'yearly',
    price: 999,
    category: 'staff',
    description: 'Add more staff accounts to your plan'
  },
  {
    id: 'location_monthly',
    name: 'Additional Location',
    type: 'monthly',
    price: 149,
    category: 'location',
    description: 'Add more locations to your plan'
  },
  {
    id: 'location_yearly',
    name: 'Additional Location',
    type: 'yearly',
    price: 1499,
    category: 'location',
    description: 'Add more locations to your plan'
  },
  {
    id: 'gst_filing_monthly',
    name: 'GST Filing',
    type: 'monthly',
    price: 499,
    category: 'gst_filing',
    description: 'Monthly GST filing service (subject to change based on sales/purchase reconciliation)'
  },
  {
    id: 'gst_filing_yearly',
    name: 'GST Filing',
    type: 'yearly',
    price: 4999,
    category: 'gst_filing',
    description: 'Yearly GST filing service (subject to change based on sales/purchase reconciliation)'
  }
];

export const oneTimeServices: OneTimeService[] = [
  {
    id: 'marketing_basic',
    name: 'Marketing Services',
    price: 1000,
    category: 'marketing',
    description: 'Professional marketing services for your business'
  },
  {
    id: 'consultation_basic',
    name: 'Business Consultation',
    price: 4999,
    category: 'consultation',
    description: 'Expert business consultation and strategy planning'
  }
];

const SUBSCRIPTION_KEY = 'appSubscription';

class SubscriptionStore {
  private subscription: Subscription = {
    isOnTrial: false,
    status: 'inactive',
  };
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadSubscription();
  }

  private notifyListeners() {
    this.listeners.forEach(listener => listener());
  }

  addListener(listener: () => void) {
    this.listeners.push(listener);
    return () => {
      this.listeners = this.listeners.filter(l => l !== listener);
    };
  }

  async loadSubscription() {
    try {
      const storedSubscription = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
      if (storedSubscription) {
        this.subscription = JSON.parse(storedSubscription);
        console.log('📥 Loaded subscription:', this.subscription);
      } else {
        console.log('📭 No subscription found in storage');
      }
      this.notifyListeners();
    } catch (error) {
      console.error('Error loading subscription from storage:', error);
    }
  }

  async saveSubscription() {
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(this.subscription));
      console.log('✅ Subscription saved:', this.subscription);
      this.notifyListeners();
    } catch (error) {
      console.error('Error saving subscription to storage:', error);
    }
  }

  startTrial() {
    const trialDurationDays = 30;
    const trialStartDate = new Date();
    const trialEndDate = new Date();
    trialEndDate.setDate(trialStartDate.getDate() + trialDurationDays);

    this.subscription = {
      isOnTrial: true,
      trialStartDate: trialStartDate.toISOString(),
      trialEndDate: trialEndDate.toISOString(),
      planId: undefined,
      status: 'trialing',
      addons: {
        staff: 0, // Free trial has 0 staff accounts
        locations: 1, // Free trial has 1 primary location
        gstFiling: false,
      },
    };
    this.saveSubscription();
    console.log(`🚀 Started 30-day free trial. Ends on: ${trialEndDate.toDateString()}`);
  }

  getSubscription(): Subscription {
    return this.subscription;
  }

  getTrialProgress(): TrialProgress {
    if (!this.subscription.isOnTrial || !this.subscription.trialStartDate || !this.subscription.trialEndDate) {
      return { daysUsed: 0, daysRemaining: 0, percentage: 0 };
    }

    const startDate = new Date(this.subscription.trialStartDate);
    const endDate = new Date(this.subscription.trialEndDate);
    const now = new Date();

    const totalDays = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysUsed = Math.ceil((now.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    const daysRemaining = Math.max(0, totalDays - daysUsed);
    const percentage = Math.min(100, (daysUsed / totalDays) * 100);

    return { daysUsed, daysRemaining, percentage };
  }

  isTrialExpired(): boolean {
    if (!this.subscription.isOnTrial || !this.subscription.trialEndDate) {
      return false;
    }

    const trialEnd = new Date(this.subscription.trialEndDate);
    const now = new Date();
    return now > trialEnd;
  }

  subscribeToPlan(plan: SubscriptionPlan, addOns: AddOn[] = []) {
    this.subscription = {
      ...this.subscription,
      isOnTrial: false,
      currentPlan: plan,
      addOns,
      isActive: true,
    };

    this.save();
  }

  cancelSubscription() {
    this.subscription = {
      ...this.subscription,
      currentPlan: null,
      addOns: [],
      isActive: false,
    };

    this.save();
  }

  addOneTimeService(service: OneTimeService) {
    this.subscription.oneTimeServices.push(service);
    this.save();
  }

  getAvailableLocations(): number {
    let baseLocations = 1; // Free trial only includes primary location

    if (this.subscription.currentPlan) {
      baseLocations = this.subscription.currentPlan.locations;
    }

    const locationAddOns = this.subscription.addOns.filter(addon => addon.category === 'location');
    const additionalLocations = locationAddOns.length;

    return baseLocations + additionalLocations;
  }

  getAvailableStaffAccounts(): number {
    let baseStaff = 0; // Free trial doesn't include staff accounts

    if (this.subscription.currentPlan) {
      baseStaff = this.subscription.currentPlan.staffAccounts;
    }

    const staffAddOns = this.subscription.addOns.filter(addon => addon.category === 'staff');
    const additionalStaff = staffAddOns.length;

    return baseStaff + additionalStaff;
  }

  canAddLocation(): boolean {
    return this.getAvailableLocations() > 0;
  }

  canAddStaff(): boolean {
    return this.getAvailableStaffAccounts() > 0;
  }

  // Placeholder for future upgrade logic
  upgradeToPlan(planId: 'monthly' | 'yearly') {
    this.subscription.isOnTrial = false;
    this.subscription.planId = planId;
    this.subscription.status = 'active';
    this.subscription.trialStartDate = undefined;
    this.subscription.trialEndDate = undefined;
    this.subscription.currentPeriodEnd = new Date(new Date().setFullYear(new Date().getFullYear() + (planId === 'yearly' ? 1 : 0))).toISOString(); // Example
    this.saveSubscription();
    console.log(`🎉 Upgraded to ${planId} plan!`);
  }

  // Placeholder for future addon logic
  addAddon(type: 'staff' | 'locations' | 'gstFiling', quantity?: number) {
    if (!this.subscription.addons) {
      this.subscription.addons = { staff: 0, locations: 0, gstFiling: false };
    }
    if (type === 'staff' || type === 'locations') {
      this.subscription.addons[type] = (this.subscription.addons[type] || 0) + (quantity || 1);
    } else if (type === 'gstFiling') {
      this.subscription.addons.gstFiling = true;
    }
    this.saveSubscription();
    console.log(`➕ Added addon: ${type}`);
  }

  // Clear subscription data for fresh testing
  async clearSubscriptionData() {
    try {
      console.log('🧹 CLEARING SUBSCRIPTION DATA FOR FRESH TESTING...');
      
      this.subscription = {
        isOnTrial: false,
        status: 'inactive',
      };
      
      await AsyncStorage.multiRemove([SUBSCRIPTION_KEY, 'subscription_data']);
      console.log('✅ SUBSCRIPTION DATA CLEARED SUCCESSFULLY!');
      
      this.notifyListeners();
    } catch (error) {
      console.error('❌ Error clearing subscription data:', error);
    }
  }
}

export const subscriptionStore = new SubscriptionStore();
