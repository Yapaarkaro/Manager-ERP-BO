/**
 * Unified Business Data Hook
 * Provides fast, cached, parallel data fetching for all business-related data
 * Eliminates latency by using parallel queries and caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase } from '@/lib/supabase';

interface BusinessData {
  user: {
    id: string;
    full_name: string;
    business_id: string | null;
    role: string;
  } | null;
  business: {
    id: string;
    legal_name: string;
    tax_id: string;
    initial_cash_balance: number;
    current_cash_balance: number;
    initial_bank_balance: number;
    current_primary_bank_balance: number;
    current_total_bank_balance: number;
    current_total_cash_balance: number;
    current_total_funds: number;
    primary_address_id: string | null;
    primary_bank_account_id: string | null;
    trial_start_date: string | null;
    trial_end_date: string | null;
    subscription_status: string | null;
  } | null;
  addresses: any[];
  bankAccounts: any[];
}

interface UseBusinessDataReturn {
  data: BusinessData;
  loading: boolean;
  error: string | null;
  refetch: () => Promise<void>;
}

// Global cache to prevent duplicate requests
let globalCache: {
  data: BusinessData | null;
  timestamp: number;
  promise: Promise<BusinessData> | null;
} = {
  data: null,
  timestamp: 0,
  promise: null,
};

const CACHE_DURATION = 30000; // 30 seconds cache (longer for better UX)

/**
 * Get global cache (for synchronous access in component initialization)
 * This allows components to read cached data synchronously before first render
 */
export function __getGlobalCache() {
  return globalCache;
}

/**
 * Unified hook to fetch all business data in parallel
 * Uses caching to prevent duplicate requests
 */
export function useBusinessData(): UseBusinessDataReturn {
  // ✅ Initialize with cached data if available (instant display, zero delay)
  const getInitialState = (): { data: BusinessData; loading: boolean } => {
    const now = Date.now();
    const hasValidCache = globalCache.data && (now - globalCache.timestamp) < CACHE_DURATION;
    return {
      data: hasValidCache && globalCache.data ? globalCache.data : {
        user: null,
        business: null,
        addresses: [],
        bankAccounts: [],
      },
      loading: !hasValidCache,
    };
  };
  
  const initialState = getInitialState();
  // ✅ Initialize with cached data - this is synchronous and instant
  const [data, setData] = useState<BusinessData>(initialState.data);
  const [loading, setLoading] = useState(initialState.loading);
  
  // ✅ Use ref to track if we've already initialized (prevent unnecessary updates)
  const hasInitializedRef = useRef(false);
  // ✅ Track if state was initialized with valid cache data
  const initializedWithCacheRef = useRef(initialState.data.user !== null || initialState.data.business !== null);
  
  const [error, setError] = useState<string | null>(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (useCache = true) => {
    // Check cache first - return immediately if valid
    const now = Date.now();
    const cachedData = globalCache.data;
    if (useCache && cachedData && (now - globalCache.timestamp) < CACHE_DURATION) {
      if (mountedRef.current) {
        // ✅ Only update state if data actually changed (prevent unnecessary re-renders)
        setData(prevData => {
          // Deep comparison would be expensive, so just check if we have the same reference
          // If cache data is the same object, don't trigger update
          if (prevData === cachedData) {
            return prevData; // No change, prevent re-render
          }
          return cachedData; // cachedData is guaranteed non-null here
        });
        setLoading(false);
        setError(null);
      }
      // Still refresh in background (stale-while-revalidate pattern)
      fetchData(false).catch(() => {}); // Silent background refresh
      return;
    }

    // If there's already a request in progress, wait for it
    if (globalCache.promise) {
      try {
        const cachedData = await globalCache.promise;
        if (mountedRef.current) {
          setData(cachedData);
          setLoading(false);
          setError(null);
        }
        return;
      } catch (err) {
        // Continue to make new request
      }
    }

    // Only set loading if we don't have cached data
    if (!globalCache.data) {
      setLoading(true);
    }
    setError(null);

    // Create promise for parallel fetching
    const fetchPromise = (async (): Promise<BusinessData> => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        
        if (!session?.user) {
          throw new Error('No session found');
        }

        // ✅ PARALLEL: Fetch user profile first to get business_id
        const userResult = await supabase
          .from('users')
          .select('id, business_id, full_name, role')
          .eq('id', session.user.id)
          .single();

        // Process user result
        let user = null;
        let businessId: string | null = null;

        if (userResult.data) {
          user = userResult.data;
          businessId = user.business_id;
        }

        // ✅ PARALLEL: Fetch all remaining data simultaneously (business, addresses, bank accounts)
        const [businessResult, addressesResult, bankAccountsResult] = await Promise.allSettled([
          // Fetch business data (only if business_id exists)
          businessId
            ? supabase
                .from('businesses')
                .select(`
                  id,
                  legal_name,
                  tax_id,
                  initial_cash_balance,
                  current_cash_balance,
                  initial_bank_balance,
                  current_primary_bank_balance,
                  current_total_bank_balance,
                  current_total_cash_balance,
                  current_total_funds,
                  primary_address_id,
                  primary_bank_account_id,
                  trial_start_date,
                  trial_end_date,
                  subscription_status
                `)
                .eq('id', businessId)
                .single()
            : Promise.resolve({ data: null, error: null }),
          
          // Fetch addresses
          (async () => {
            const { getAddresses } = await import('@/services/backendApi');
            return getAddresses();
          })(),
          
          // Fetch bank accounts
          (async () => {
            const { getBankAccounts } = await import('@/services/backendApi');
            return getBankAccounts();
          })(),
        ]);

        // Process business result
        let business = null;
        if (businessResult.status === 'fulfilled' && businessResult.value.data) {
          business = {
            ...businessResult.value.data,
            initial_cash_balance: parseFloat(String(businessResult.value.data.initial_cash_balance)) || 0,
            current_cash_balance: parseFloat(String(businessResult.value.data.current_cash_balance)) || 0,
            initial_bank_balance: parseFloat(String(businessResult.value.data.initial_bank_balance)) || 0,
            current_primary_bank_balance: parseFloat(String(businessResult.value.data.current_primary_bank_balance)) || 0,
            current_total_bank_balance: parseFloat(String(businessResult.value.data.current_total_bank_balance)) || 0,
            current_total_cash_balance: parseFloat(String(businessResult.value.data.current_total_cash_balance)) || 0,
            current_total_funds: parseFloat(String(businessResult.value.data.current_total_funds)) || 0,
          };
        }

        // Process addresses result
        const addresses = addressesResult.status === 'fulfilled' && addressesResult.value.success
          ? addressesResult.value.addresses || []
          : [];

        // Process bank accounts result
        const bankAccounts = bankAccountsResult.status === 'fulfilled' && bankAccountsResult.value.success
          ? bankAccountsResult.value.accounts || []
          : [];

        const result: BusinessData = {
          user,
          business,
          addresses,
          bankAccounts,
        };

        // Update cache
        globalCache.data = result;
        globalCache.timestamp = Date.now();
        globalCache.promise = null;

        return result;
      } catch (err: any) {
        globalCache.promise = null;
        throw err;
      }
    })();

    // Store promise to prevent duplicate requests
    globalCache.promise = fetchPromise;

    try {
      const result = await fetchPromise;
      if (mountedRef.current) {
        setData(result);
        setLoading(false);
        setError(null);
      }
    } catch (err: any) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to load data');
        setLoading(false);
      }
    }
  }, []);

  useEffect(() => {
    mountedRef.current = true;
    
    // ✅ If state was initialized with cache data, skip fetch entirely (zero delay)
    if (initializedWithCacheRef.current && !hasInitializedRef.current) {
      // State already has cached data from initializer - NO FETCH, NO STATE UPDATE
      // This ensures zero render delay
      hasInitializedRef.current = true;
      // Still refresh in background silently (stale-while-revalidate pattern)
      fetchData(false).catch(() => {});
    } else if (!hasInitializedRef.current) {
      // ✅ Fetch immediately - if cache exists, it returns instantly, otherwise fetches in parallel
      hasInitializedRef.current = true;
      fetchData().catch(() => {});
    }
    // If already initialized, don't do anything (prevents re-fetching on re-renders)

    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  const refetch = useCallback(async () => {
    await fetchData(false); // Force refresh, don't use cache
  }, [fetchData]);

  return { data, loading, error, refetch };
}

/**
 * Clear cache (useful after mutations)
 */
export function clearBusinessDataCache() {
  globalCache = {
    data: null,
    timestamp: 0,
    promise: null,
  };
}

/**
 * Prefetch business data (useful for warming up cache before navigation)
 */
export async function prefetchBusinessData(): Promise<void> {
  // Force fetch data to warm up cache
  const now = Date.now();
  if (!globalCache.data || (now - globalCache.timestamp) >= CACHE_DURATION) {
    // Cache is stale or doesn't exist, fetch fresh data
    try {
      const { data: { session } } = await supabase.auth.getSession();
      
      if (!session?.user) {
        return;
      }

      // Import fetch functions
      const { getAddresses } = await import('@/services/backendApi');
      const { getBankAccounts } = await import('@/services/backendApi');

      // ✅ PARALLEL: Fetch user profile first to get business_id (same as fetchData)
      const userResult = await supabase
        .from('users')
        .select('id, business_id, full_name, role')
        .eq('id', session.user.id)
        .single();

      // Process user result
      let user = null;
      let businessId: string | null = null;

      if (userResult.data) {
        user = userResult.data;
        businessId = user.business_id;
      }

      // ✅ PARALLEL: Fetch all remaining data simultaneously (same as fetchData)
      const [businessResult, addressesResult, bankAccountsResult] = await Promise.allSettled([
        // Fetch business data (only if business_id exists)
        businessId
          ? supabase
              .from('businesses')
              .select(`
                id,
                legal_name,
                tax_id,
                initial_cash_balance,
                current_cash_balance,
                initial_bank_balance,
                current_primary_bank_balance,
                current_total_bank_balance,
                current_total_cash_balance,
                current_total_funds,
                primary_address_id,
                primary_bank_account_id,
                trial_start_date,
                trial_end_date,
                subscription_status
              `)
              .eq('id', businessId)
              .single()
          : Promise.resolve({ data: null, error: null }),
        
        // Fetch addresses
        getAddresses(),
        
        // Fetch bank accounts
        getBankAccounts(),
      ]);

      // Process business result (same logic as fetchData)
      let business = null;
      if (businessResult.status === 'fulfilled' && businessResult.value.data) {
        business = {
          ...businessResult.value.data,
          initial_cash_balance: parseFloat(String(businessResult.value.data.initial_cash_balance)) || 0,
          current_cash_balance: parseFloat(String(businessResult.value.data.current_cash_balance)) || 0,
          initial_bank_balance: parseFloat(String(businessResult.value.data.initial_bank_balance)) || 0,
          current_primary_bank_balance: parseFloat(String(businessResult.value.data.current_primary_bank_balance)) || 0,
          current_total_bank_balance: parseFloat(String(businessResult.value.data.current_total_bank_balance)) || 0,
          current_total_cash_balance: parseFloat(String(businessResult.value.data.current_total_cash_balance)) || 0,
          current_total_funds: parseFloat(String(businessResult.value.data.current_total_funds)) || 0,
        };
      }

      // Process addresses result
      const addresses = addressesResult.status === 'fulfilled' && addressesResult.value.success
        ? addressesResult.value.addresses || []
        : [];

      // Process bank accounts result
      const bankAccounts = bankAccountsResult.status === 'fulfilled' && bankAccountsResult.value.success
        ? bankAccountsResult.value.accounts || []
        : [];

      // Update cache
      globalCache.data = {
        user,
        business,
        addresses,
        bankAccounts,
      };
      globalCache.timestamp = Date.now();
    } catch (error) {
      console.error('Error prefetching business data:', error);
    }
  }
}


