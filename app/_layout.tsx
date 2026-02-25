import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';
import Toast from 'react-native-toast-message';
import { StatusBarProvider } from '@/contexts/StatusBarContext';
import { WebNavigationProvider } from '@/contexts/WebNavigationContext';
import { dataStore } from '@/utils/dataStore';
import { subscriptionStore } from '@/utils/subscriptionStore';
import { productStore } from '@/utils/productStore';
import { prefetchBusinessData } from '@/hooks/useBusinessData';
import { supabase, withTimeout } from '@/lib/supabase';

declare global {
  var clearAllData: (() => Promise<void>) | undefined;
}

global.clearAllData = async () => {
  await dataStore.clearAllDataForTesting();
  await subscriptionStore.clearSubscriptionData();
};

export default function RootLayout() {
  useFrameworkReady();

  useEffect(() => {
    const initializeData = async () => {
      // 1. Load local cached data first (fast, from AsyncStorage)
      await dataStore.loadData();

      // 2. Check auth session before any backend calls (with timeout to prevent hanging)
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          'Layout: getSession'
        );
        if (session?.user) {
          await Promise.allSettled([
            withTimeout(productStore.loadProductsFromBackend(), 15000, 'Products prefetch'),
            withTimeout(prefetchBusinessData(), 15000, 'Business data prefetch'),
          ]);
        }
      } catch {
        // Auth check failed or timed out - user will be directed to login
      }
    };

    initializeData();
  }, []);

  return (
    <StatusBarProvider>
      <WebNavigationProvider>
        <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" />
        <Stack.Screen name="auth/mobile" />
        <Stack.Screen name="auth/otp" />
        <Stack.Screen name="auth/gstin-pan" />
        <Stack.Screen name="auth/gstin-pan-otp" />
        <Stack.Screen name="auth/business-details" />
        <Stack.Screen name="auth/business-address" />
        <Stack.Screen name="auth/business-address-manual" />
        <Stack.Screen name="auth/address-confirmation" />
        <Stack.Screen name="auth/banking-details" />
        <Stack.Screen name="auth/bank-accounts" />
        <Stack.Screen name="auth/final-setup" />
        <Stack.Screen name="dashboard" />
        <Stack.Screen name="sales" />
        <Stack.Screen name="all-invoices" />
        <Stack.Screen name="returns" />
        <Stack.Screen name="return-details" />
        <Stack.Screen name="new-sale/index" />
        <Stack.Screen name="new-sale/scanner" />
        <Stack.Screen name="new-sale/cart" />
        <Stack.Screen name="new-sale/customer-details" />
        <Stack.Screen name="new-sale/payment" />
        <Stack.Screen name="new-sale/success" />
        <Stack.Screen name="locations/branches" />
        <Stack.Screen name="locations/warehouses" />
        <Stack.Screen name="locations/add-branch" />
        <Stack.Screen name="locations/add-warehouse" />
        <Stack.Screen name="locations/branch-details" />
        <Stack.Screen name="locations/warehouse-details" />
        <Stack.Screen name="new-return/index" />
        <Stack.Screen name="new-return/scan-invoice" />
        <Stack.Screen name="new-return/select-items" />
        <Stack.Screen name="new-return/return-reasons" />
        <Stack.Screen name="new-return/refund-method" />
        <Stack.Screen name="new-return/confirmation" />
        <Stack.Screen name="new-return/success" />
        <Stack.Screen name="inventory/low-stock" />
        <Stack.Screen name="inventory/product-details" />
        <Stack.Screen name="inventory/stock-discrepancies" />
        <Stack.Screen name="inventory/discrepancy-details" />
        <Stack.Screen name="inventory/index" />
        <Stack.Screen name="inventory/scan-product" />
        <Stack.Screen name="inventory/manual-product" />
        <Stack.Screen name="inventory/stock-management" />
        <Stack.Screen name="inventory/stock-in" />
        <Stack.Screen name="inventory/stock-in/manual" />
        <Stack.Screen name="inventory/stock-in/po-search" />
        <Stack.Screen name="inventory/stock-in/qr-scan" />
        <Stack.Screen name="inventory/stock-in/confirmation" />
        <Stack.Screen name="inventory/stock-in/verify-stock" />
        <Stack.Screen name="inventory/stock-in/stock-confirmation" />
        <Stack.Screen name="inventory/stock-in/invoice-input" />
        <Stack.Screen name="inventory/stock-in/discrepancy-report" />
        <Stack.Screen name="invoice-details" />
        <Stack.Screen name="receivables" />
        <Stack.Screen name="receivables/customer-details" />
        <Stack.Screen name="receivables/receive-payment" />
        <Stack.Screen name="receivables/collect-payment" />
        <Stack.Screen name="receivables/payment-success" />
        <Stack.Screen name="payables" />
        <Stack.Screen name="payables/supplier-details" />
        <Stack.Screen name="payables/make-payment" />
        <Stack.Screen name="payables/process-payment" />
        <Stack.Screen name="payables/payment-success" />
        <Stack.Screen name="payment-selection" />
        <Stack.Screen name="people/staff" />
        <Stack.Screen name="people/add-staff" />
        <Stack.Screen name="people/customers" />
        <Stack.Screen name="people/customer-details" />
        <Stack.Screen name="people/customer-chat" />
        <Stack.Screen name="notifications" />
        <Stack.Screen name="reports" />
        <Stack.Screen name="reports/payment-details" />
        <Stack.Screen name="reports/daily-invoices" />
        <Stack.Screen name="+not-found" />
      </Stack>
      <Toast />
      </WebNavigationProvider>
    </StatusBarProvider>
  );
}
