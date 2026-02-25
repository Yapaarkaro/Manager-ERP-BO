/**
 * Supabase Client Configuration
 * Provides the Supabase client instance and configuration
 */

import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Platform } from 'react-native';
import 'react-native-url-polyfill/auto';

const SUPABASE_URL = process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://xsmwzaaotncpharmtzcj.supabase.co';
export const SUPABASE_ANON_KEY = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzbXd6YWFvdG5jcGhhcm10emNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjQ0NDYsImV4cCI6MjA3OTk0MDQ0Nn0.HnQACFAzQVRnFLFYPlWpq1dSRFNB_M1XG3KT1k-7QkM';

export const EDGE_FUNCTIONS_URL = `${SUPABASE_URL}/functions/v1`;

const supabaseStorage = Platform.OS === 'web'
  ? (typeof window !== 'undefined' && window.localStorage ? window.localStorage : undefined)
  : AsyncStorage;

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
});

/**
 * Wraps a promise with a timeout. If the promise doesn't resolve within
 * the given ms, it rejects with a timeout error. Prevents Supabase SDK
 * calls from hanging indefinitely on poor networks.
 */
export function withTimeout<T>(promise: Promise<T>, ms = 15000, label = 'Operation'): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms / 1000}s`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(timer));
}

/** Safely parse JSON, returning fallback on failure instead of crashing. */
export function safeJsonParse<T = any>(value: string | undefined | null, fallback: T | null = null): T | null {
  if (!value) return fallback;
  try {
    return JSON.parse(value);
  } catch {
    return fallback;
  }
}
