/**
 * Unified Business Data Hook
 * Provides fast, cached, parallel data fetching for all business-related data
 * Eliminates latency by using parallel queries and caching
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import { supabase, withTimeout } from '@/lib/supabase';
import { onTransactionChange } from '@/utils/transactionEvents';

interface BusinessData {
  user: {
    id: string;
    name: string;
    full_name: string;
    business_id: string | null;
    role: string;
  } | null;
  business: {
    id: string;
    legal_name: string;
    owner_name: string;
    business_type: string;
    tax_id: string;
    is_onboarding_complete: boolean;
    primary_address_id: string | null;
    primary_bank_account_id: string | null;
    current_subscription_id: string | null;
    // Financial summary (auto-synced via triggers)
    total_cash_balance: number;
    total_bank_balance: number;
    total_funds: number;
    // Backward-compat aliases
    initial_cash_balance: number;
    current_cash_balance: number;
    initial_bank_balance: number;
    current_primary_bank_balance: number;
    current_total_bank_balance: number;
    current_total_cash_balance: number;
    current_total_funds: number;
    // Subscription summary (auto-synced via trigger from subscriptions)
    subscription_status: string;
    is_on_trial: boolean;
    trial_start_date: string | null;
    trial_end_date: string | null;
    subscription_plan_name: string | null;
    subscription_expires_at: string | null;
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
  lastBackgroundRefresh: number;
} = {
  data: null,
  timestamp: 0,
  promise: null,
  lastBackgroundRefresh: 0,
};

const CACHE_DURATION = 30000; // 30 seconds cache (longer for better UX)
const MIN_BACKGROUND_REFRESH_INTERVAL = 15000; // Don't background-refresh more than once per 15s

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
      // Stale-while-revalidate: only refresh if enough time has passed
      if (now - globalCache.lastBackgroundRefresh > MIN_BACKGROUND_REFRESH_INTERVAL) {
        globalCache.lastBackgroundRefresh = now;
        fetchData(false).catch(() => {});
      }
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

    const fetchPromise = (async (): Promise<BusinessData> => {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          10000,
          'useBusinessData: getSession'
        );
        
        if (!session?.user) {
          throw new Error('No session found');
        }

        // ✅ PARALLEL: Fetch user profile first to get business_id
        // Handle 406 errors gracefully (RLS policy or column issues)
        const userResult = await supabase
          .from('users')
          .select('id, business_id, name, role')
          .eq('id', session.user.id)
          .maybeSingle();

        let user = null;
        let businessId: string | null = null;

        if (userResult.data && !userResult.error) {
          const userData = userResult.data as { id: string; business_id?: string | null; name?: string; role?: string };
          const displayName = userData.name || session.user.user_metadata?.full_name || '';
          user = {
            id: userData.id,
            business_id: userData.business_id || null,
            name: displayName,
            full_name: displayName,
            role: userData.role || 'user',
          };
          businessId = user.business_id;
        }

        // ✅ PARALLEL: Fetch all remaining data simultaneously (business, addresses, bank accounts)
        const [businessResult, addressesResult, bankAccountsResult] = await Promise.allSettled([
          businessId
            ? supabase
                .from('businesses')
                .select('id, legal_name, owner_name, business_type, tax_id, phone, is_onboarding_complete, primary_address_id, primary_bank_account_id, current_subscription_id, initial_cash_balance, total_cash_balance, total_bank_balance, total_funds, subscription_status, is_on_trial, trial_start_date, trial_end_date, subscription_plan_name, subscription_expires_at')
                .eq('id', businessId)
                .single()
            : Promise.resolve({ data: null, error: null }),

          (async () => {
            const { getAddresses } = await import('@/services/backendApi');
            return getAddresses();
          })(),

          (async () => {
            const { getBankAccounts } = await import('@/services/backendApi');
            return getBankAccounts();
          })(),
        ]);

        let business = null;
        if (businessResult.status === 'fulfilled' && businessResult.value.data) {
          const biz = businessResult.value.data;

          const initCashBal = parseFloat(String(biz.initial_cash_balance)) || 0;
          const cashBalance = parseFloat(String(biz.total_cash_balance)) || 0;
          const bankBalance = parseFloat(String(biz.total_bank_balance)) || 0;
          const totalFunds = parseFloat(String(biz.total_funds)) || 0;

          business = {
            ...biz,
            initial_cash_balance: initCashBal,
            current_cash_balance: cashBalance,
            current_primary_bank_balance: bankBalance,
            current_total_bank_balance: bankBalance,
            current_total_cash_balance: cashBalance,
            current_total_funds: totalFunds,
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
      hasInitializedRef.current = true;
      fetchData(false).catch(() => {});
    } else if (!hasInitializedRef.current) {
      hasInitializedRef.current = true;
      fetchData().catch(() => {});
    }

    return () => {
      mountedRef.current = false;
    };
  }, [fetchData]);

  // Silent auto-refresh when any transaction is recorded anywhere in the app
  useEffect(() => {
    const unsubscribe = onTransactionChange(() => {
      if (!mountedRef.current) return;
      // Invalidate cache and silently refetch without showing loading
      globalCache.data = null;
      globalCache.timestamp = 0;
      globalCache.promise = null;
      fetchData(false).catch(() => {});
    });
    return unsubscribe;
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
    try {
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        10000,
        'prefetchBusinessData: getSession'
      );
      
      if (!session?.user) {
        return;
      }

      // Import fetch functions
      const { getAddresses } = await import('@/services/backendApi');
      const { getBankAccounts } = await import('@/services/backendApi');

      const userResult = await supabase
        .from('users')
        .select('id, business_id, name, role')
        .eq('id', session.user.id)
        .maybeSingle();

      let user = null;
      let businessId: string | null = null;

      if (userResult.data) {
        const displayName = userResult.data.name || '';
        user = { ...userResult.data, full_name: displayName };
        businessId = userResult.data.business_id;
      }

      const [businessResult, addressesResult, bankAccountsResult] = await Promise.allSettled([
        businessId
          ? supabase
              .from('businesses')
              .select('id, legal_name, owner_name, business_type, tax_id, phone, is_onboarding_complete, primary_address_id, primary_bank_account_id, current_subscription_id, initial_cash_balance, total_cash_balance, total_bank_balance, total_funds, subscription_status, is_on_trial, trial_start_date, trial_end_date, subscription_plan_name, subscription_expires_at')
              .eq('id', businessId)
              .single()
          : Promise.resolve({ data: null, error: null }),
        getAddresses(),
        getBankAccounts(),
      ]);

      let business = null;
      if (businessResult.status === 'fulfilled' && businessResult.value.data) {
        const biz = businessResult.value.data;
        const initCashBal2 = parseFloat(String(biz.initial_cash_balance)) || 0;
        const cashBalance = parseFloat(String(biz.total_cash_balance)) || 0;
        const bankBalance = parseFloat(String(biz.total_bank_balance)) || 0;

        business = {
          ...biz,
          initial_cash_balance: initCashBal2,
          current_cash_balance: cashBalance,
          current_primary_bank_balance: bankBalance,
          current_total_bank_balance: bankBalance,
          current_total_cash_balance: cashBalance,
          current_total_funds: parseFloat(String(biz.total_funds)) || 0,
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
    } catch {
      // Prefetch failed silently
    }
  }
}
