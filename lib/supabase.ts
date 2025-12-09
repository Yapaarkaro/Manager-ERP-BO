/**
 * Supabase Client Configuration
 * Provides the Supabase client instance and configuration
 */

import { createClient } from '@supabase/supabase-js';
import 'react-native-url-polyfill/auto';

// Supabase configuration
const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xsmwzaaotncpharmtzcj.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzbXd6YWFvdG5jcGhhcm10emNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjQ0NDYsImV4cCI6MjA3OTk0MDQ0Nn0.HnQACFAzQVRnFLFYPlWpq1dSRFNB_M1XG3KT1k-7QkM';

// Edge Functions URL
export const EDGE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

// Create Supabase client
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

// Add supabaseKey property for backward compatibility
(supabase as any).supabaseKey = SUPABASE_ANON_KEY;
