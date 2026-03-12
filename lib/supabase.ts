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

/**
 * Custom fetch wrapper that catches HTML responses from auth endpoints
 * and converts them into proper JSON error responses, preventing
 * AuthUnknownError from JSON parse failures.
 */
const resilientFetch: typeof fetch = async (input, init) => {
  const response = await fetch(input, init);
  const url = typeof input === 'string' ? input : input instanceof Request ? input.url : '';
  const isAuthEndpoint = url.includes('/auth/v1/');

  if (isAuthEndpoint && !response.ok) {
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      const text = await response.text();
      const trimmed = text.trim();
      if (trimmed.startsWith('<')) {
        console.warn(`⚠️ Auth endpoint returned HTML (status ${response.status}), converting to JSON error`);
        return new Response(
          JSON.stringify({ error: 'server_error', error_description: `Auth server returned non-JSON response (HTTP ${response.status})` }),
          { status: response.status, statusText: response.statusText, headers: { 'content-type': 'application/json' } },
        );
      }
    }
  }

  return response;
};

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    storage: supabaseStorage,
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: false,
  },
  global: {
    fetch: resilientFetch,
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
