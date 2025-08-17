import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import 'react-native-url-polyfill/auto';

// Supabase configuration
const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL || 'YOUR_SUPABASE_URL';
const supabaseAnonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'YOUR_SUPABASE_ANON_KEY';

// Create Supabase client
export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    storage: AsyncStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Database table names
export const TABLES = {
  BUSINESS_ADDRESSES: 'business_addresses',
  CUSTOMERS: 'customers',
  SUPPLIERS: 'suppliers',
  PRODUCTS: 'products',
  SALES: 'sales',
  SALE_ITEMS: 'sale_items',
  INVOICES: 'invoices',
  INVOICE_ITEMS: 'invoice_items',
  PURCHASE_ORDERS: 'purchase_orders',
  PO_ITEMS: 'po_items',
  PURCHASE_INVOICES: 'purchase_invoices',
  RECEIVABLES: 'receivables',
  PAYABLES: 'payables',
  EXPENSES: 'expenses',
  MARKETING_CAMPAIGNS: 'marketing_campaigns',
  RETURNS: 'returns',
  RETURN_ITEMS: 'return_items',
  STAFF: 'staff',
  STOCK_MOVEMENTS: 'stock_movements',
  STOCK_DISCREPANCIES: 'stock_discrepancies',
} as const;

// Database schema types
export type TableName = typeof TABLES[keyof typeof TABLES];

// Error handling utility
export const handleSupabaseError = (error: any) => {
  console.error('Supabase error:', error);
  if (error?.message) {
    throw new Error(error.message);
  }
  throw new Error('An unexpected error occurred');
};

// Success response utility
export const handleSupabaseSuccess = <T>(data: T, error: any): T => {
  if (error) {
    handleSupabaseError(error);
  }
  return data;
}; 