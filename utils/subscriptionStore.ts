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
  planId?: string;
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
    price: 750,
    locations: 2,
    staffAccounts: 3,
    description: 'Perfect for small businesses',
    features: [
      '1 Primary Location',
      '2 Location Overview',
      '3 Staff Accounts',
      'Full Access to Invoicing',
      'Staff Management',
      'Supplier Management',
      'Customer Management',
      'Inventory Management',
      'Reports & Analytics',
      'Additional Staff: ₹100/month',
      'Additional Location: ₹150/month'
    ]
  },
  {
    id: 'yearly_premium',
    name: 'Yearly Plan',
    type: 'yearly',
    price: 7500,
    locations: 5,
    staffAccounts: 10,
    description: 'Best value for growing businesses',
    features: [
      '1 Primary Address',
      '5 Location Overview',
      '10 Staff Accounts',
      'Full Access to Invoicing',
      'Staff Management',
      'Supplier Management',
      'Customer Management',
      'Inventory Management',
      'Reports & Analytics',
      'GST Filing (calculated based on filing data)',
      'Priority Support'
    ]
  }
];

export const addOns: AddOn[] = [
  { id: 'staff_monthly', name: 'Additional Staff', type: 'monthly', price: 100, category: 'staff', description: 'Add more staff accounts to your plan (₹100/month per staff)' },
  { id: 'staff_yearly', name: 'Additional Staff', type: 'yearly', price: 1000, category: 'staff', description: 'Add more staff accounts to your plan (₹100/month per staff)' },
  { id: 'location_monthly', name: 'Additional Location', type: 'monthly', price: 150, category: 'location', description: 'Add more locations to your plan (₹150/month per location)' },
  { id: 'location_yearly', name: 'Additional Location', type: 'yearly', price: 1500, category: 'location', description: 'Add more locations to your plan (₹150/month per location)' },
  { id: 'gst_filing_monthly', name: 'GST Filing', type: 'monthly', price: 499, category: 'gst_filing', description: 'Monthly GST filing service (subject to change based on sales/purchase reconciliation)' },
  { id: 'gst_filing_yearly', name: 'GST Filing', type: 'yearly', price: 4999, category: 'gst_filing', description: 'Yearly GST filing service (subject to change based on sales/purchase reconciliation)' },
];

export const oneTimeServices: OneTimeService[] = [
  { id: 'marketing_basic', name: 'Marketing Services', price: 1000, category: 'marketing', description: 'Professional marketing services for your business' },
  { id: 'consultation_basic', name: 'Business Consultation', price: 4999, category: 'consultation', description: 'Expert business consultation and strategy planning' },
];

const SUBSCRIPTION_KEY = 'appSubscription';

class SubscriptionStore {
  private subscription: Subscription = { isOnTrial: false, status: 'inactive' };
  private listeners: (() => void)[] = [];

  constructor() {
    this.loadSubscription();
  }

  private notifyListeners() {
    this.listeners.forEach(fn => fn());
  }

  addListener(listener: () => void) {
    this.listeners.push(listener);
    return () => { this.listeners = this.listeners.filter(l => l !== listener); };
  }

  async loadSubscription() {
    try {
      const stored = await AsyncStorage.getItem(SUBSCRIPTION_KEY);
      if (stored) this.subscription = JSON.parse(stored);
      this.notifyListeners();
    } catch {
      // Failed to load subscription
    }
  }

  async saveSubscription() {
    try {
      await AsyncStorage.setItem(SUBSCRIPTION_KEY, JSON.stringify(this.subscription));
      this.notifyListeners();
    } catch {
      // Failed to save subscription
    }
  }

  async startTrial() {
    const trialStart = new Date();
    const trialEnd = new Date();
    trialEnd.setDate(trialStart.getDate() + 30);

    this.subscription = {
      isOnTrial: true,
      trialStartDate: trialStart.toISOString(),
      trialEndDate: trialEnd.toISOString(),
      planId: undefined,
      status: 'trialing',
      addons: { staff: 0, locations: 1, gstFiling: false },
    };
    this.saveSubscription();

    try {
      const { createOrUpdateSubscription } = await import('@/services/backendApi');
      await createOrUpdateSubscription({
        isOnTrial: true,
        trialStartDate: trialStart.toISOString(),
        trialEndDate: trialEnd.toISOString(),
        status: 'trialing',
      });
    } catch {
      // DB sync failed silently
    }
  }

  getSubscription(): Subscription { return this.subscription; }

  getTrialProgress(): TrialProgress {
    if (!this.subscription.isOnTrial || !this.subscription.trialStartDate || !this.subscription.trialEndDate) {
      return { daysUsed: 0, daysRemaining: 0, percentage: 0 };
    }
    const start = new Date(this.subscription.trialStartDate);
    const end = new Date(this.subscription.trialEndDate);
    const now = new Date();
    const total = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    const used = Math.ceil((now.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return { daysUsed: used, daysRemaining: Math.max(0, total - used), percentage: Math.min(100, (used / total) * 100) };
  }

  isTrialExpired(): boolean {
    if (!this.subscription.isOnTrial || !this.subscription.trialEndDate) return false;
    return new Date() > new Date(this.subscription.trialEndDate);
  }

  subscribeToPlan(plan: SubscriptionPlan, _addOns: AddOn[] = []) {
    this.subscription = { ...this.subscription, isOnTrial: false, planId: plan.id, status: 'active' } as any;
    this.saveSubscription();
  }

  cancelSubscription() {
    this.subscription = { ...this.subscription, planId: undefined, status: 'cancelled' };
    this.saveSubscription();
  }

  addOneTimeService(_service: OneTimeService) {
    this.saveSubscription();
  }

  getAvailableLocations(): number {
    return 1 + (this.subscription.addons?.locations || 0);
  }

  getAvailableStaffAccounts(): number {
    return this.subscription.addons?.staff || 0;
  }

  hasActiveSubscription(): boolean {
    if (this.subscription.isOnTrial) return !this.isTrialExpired();
    return this.subscription.status === 'active' && this.subscription.planId !== undefined;
  }

  isReadOnlyMode(): boolean {
    const hasNoData =
      !this.subscription.isOnTrial &&
      this.subscription.status === 'inactive' &&
      !this.subscription.trialEndDate &&
      !this.subscription.trialStartDate &&
      !this.subscription.planId;

    if (hasNoData) return false;
    if (this.subscription.isOnTrial && this.isTrialExpired()) return true;
    if (this.hasActiveSubscription()) return false;
    if (this.subscription.status === 'cancelled') return true;
    return false;
  }

  canAddLocation(): boolean { return this.getAvailableLocations() > 0; }
  canAddStaff(): boolean { return this.getAvailableStaffAccounts() > 0; }

  upgradeToPlan(planId: 'monthly' | 'yearly') {
    this.subscription.isOnTrial = false;
    this.subscription.planId = planId;
    this.subscription.status = 'active';
    this.subscription.trialStartDate = undefined;
    this.subscription.trialEndDate = undefined;
    this.subscription.currentPeriodEnd = new Date(
      new Date().setFullYear(new Date().getFullYear() + (planId === 'yearly' ? 1 : 0))
    ).toISOString();
    this.saveSubscription();
  }

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
  }

  async clearSubscriptionData() {
    this.subscription = { isOnTrial: false, status: 'inactive' };
    try {
      await AsyncStorage.multiRemove([SUBSCRIPTION_KEY, SUBSCRIPTION_STORAGE_KEY]);
    } catch {
      // clearing failed
    }
    this.notifyListeners();
  }

  async simulateTrialExpiration() {
    if (!this.subscription.isOnTrial || !this.subscription.trialEndDate) return;

    const expired = new Date();
    expired.setSeconds(expired.getSeconds() - 1);

    this.subscription = { ...this.subscription, trialEndDate: expired.toISOString(), status: 'inactive' };
    this.saveSubscription();
    this.notifyListeners();

    try {
      const { createOrUpdateSubscription } = await import('@/services/backendApi');
      await createOrUpdateSubscription({
        isOnTrial: false,
        trialStartDate: this.subscription.trialStartDate,
        trialEndDate: expired.toISOString(),
        status: 'inactive',
      });
    } catch {
      // sync failed
    }
  }

  async resetTrialToActive() {
    const start = new Date();
    const end = new Date();
    end.setDate(start.getDate() + 30);

    this.subscription = {
      ...this.subscription,
      isOnTrial: true,
      trialStartDate: start.toISOString(),
      trialEndDate: end.toISOString(),
      status: 'trialing',
    };

    this.saveSubscription();
    this.notifyListeners();

    try {
      const { createOrUpdateSubscription } = await import('@/services/backendApi');
      await createOrUpdateSubscription({
        isOnTrial: true,
        trialStartDate: start.toISOString(),
        trialEndDate: end.toISOString(),
        status: 'trialing',
      });
    } catch {
      // sync failed
    }
  }
}

export const subscriptionStore = new SubscriptionStore();
