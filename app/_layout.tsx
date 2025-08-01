import { useEffect } from 'react';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useFrameworkReady } from '@/hooks/useFrameworkReady';

export default function RootLayout() {
  useFrameworkReady();

  return (
    <>
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
        <Stack.Screen name="inventory/add-product" />
        <Stack.Screen name="inventory/scan-product" />
        <Stack.Screen name="inventory/manual-product" />
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
      <StatusBar style="auto" />
    </>
  );
}