/**
 * Backend API Service
 * Handles all calls to Supabase Edge Functions and direct Supabase queries.
 */

import { EDGE_FUNCTIONS_URL, supabase, SUPABASE_ANON_KEY, withTimeout } from '@/lib/supabase';
import { emitTransactionChange } from '@/utils/transactionEvents';

// Lazy import to avoid circular dependency
let clearBusinessDataCache: (() => void) | null = null;
const getClearCache = () => {
  if (!clearBusinessDataCache) {
    const module = require('@/hooks/useBusinessData');
    clearBusinessDataCache = module.clearBusinessDataCache;
  }
  return clearBusinessDataCache;
};

// ============================================
// Cached business context to avoid repeated DB lookups
// ============================================
let _cachedBusinessCtx: { businessId: string; userId: string; expiresAt: number } | null = null;
const CACHE_TTL = 5 * 60 * 1000; // 5 minutes

async function getUserBusinessId(): Promise<{ businessId: string; userId: string } | null> {
  // Return cached value if still valid
  if (_cachedBusinessCtx && Date.now() < _cachedBusinessCtx.expiresAt) {
    return { businessId: _cachedBusinessCtx.businessId, userId: _cachedBusinessCtx.userId };
  }

  try {
    const { data: { session } } = await withTimeout(
      supabase.auth.getSession(),
      10000,
      'getUserBusinessId: getSession'
    );
    if (!session?.user) return null;

    const { data } = await withTimeout(
      Promise.resolve(
        supabase
          .from('users')
          .select('business_id')
          .eq('id', session.user.id)
          .single()
      ),
      10000,
      'getUserBusinessId: query'
    ) as { data: { business_id: string } | null };

    if (!data?.business_id) return null;

    _cachedBusinessCtx = {
      businessId: data.business_id,
      userId: session.user.id,
      expiresAt: Date.now() + CACHE_TTL,
    };
    return { businessId: data.business_id, userId: session.user.id };
  } catch {
    return null;
  }
}

/** Call this on logout or session change to reset the cache */
export function clearBusinessContext() {
  _cachedBusinessCtx = null;
}

// ============================================
// Singleton session refresh lock
// Prevents thundering herd when multiple 401s fire concurrently
// ============================================
let _refreshPromise: Promise<string | null> | null = null;
const REFRESH_LOCK_TTL = 10000;
let _refreshLockTimer: ReturnType<typeof setTimeout> | null = null;

async function getRefreshedToken(): Promise<string | null> {
  if (_refreshPromise) return _refreshPromise;

  _refreshPromise = (async () => {
    try {
      const { data: refreshed } = await supabase.auth.refreshSession();
      return refreshed?.session?.access_token ?? null;
    } catch {
      return null;
    } finally {
      if (_refreshLockTimer) clearTimeout(_refreshLockTimer);
      _refreshLockTimer = setTimeout(() => { _refreshPromise = null; }, 2000);
    }
  })();

  if (_refreshLockTimer) clearTimeout(_refreshLockTimer);
  _refreshLockTimer = setTimeout(() => { _refreshPromise = null; }, REFRESH_LOCK_TTL);

  return _refreshPromise;
}

// ============================================
// Request-level cache for frequently-called GET endpoints
// Deduplicates in-flight requests and caches results with TTL
// ============================================
const _apiCache = new Map<string, { data: any; expiresAt: number; promise?: Promise<any> }>();
const API_CACHE_TTL = 30000; // 30 seconds

function getCachedOrFetch<T>(key: string, fetcher: () => Promise<T>, ttl = API_CACHE_TTL): Promise<T> {
  const entry = _apiCache.get(key);
  const now = Date.now();
  if (entry && now < entry.expiresAt && entry.data !== undefined) return Promise.resolve(entry.data as T);
  if (entry?.promise) return entry.promise as Promise<T>;

  const promise = fetcher().then(result => {
    _apiCache.set(key, { data: result, expiresAt: Date.now() + ttl });
    return result;
  }).catch(err => {
    _apiCache.delete(key);
    throw err;
  });
  _apiCache.set(key, { data: undefined, expiresAt: 0, promise });
  return promise;
}

export function invalidateApiCache(keyPrefix?: string) {
  if (!keyPrefix) { _apiCache.clear(); return; }
  for (const k of _apiCache.keys()) { if (k.startsWith(keyPrefix)) _apiCache.delete(k); }
}

// Helper to call Edge Functions
export async function callEdgeFunction(
  functionName: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any,
  requireAuth: boolean = false
): Promise<{ success: boolean; data?: any; error?: string }> {
  const attempt = async (token: string | null): Promise<{ response: Response; data: any } | { error: string }> => {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${token || SUPABASE_ANON_KEY}`,
    };
    const options: RequestInit = { method, headers, credentials: 'omit' };
    if (body && method !== 'GET') options.body = JSON.stringify(body);

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    options.signal = controller.signal;

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/${functionName}`, options);
    clearTimeout(timeoutId);

    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try { data = await response.json(); } catch { return { error: 'Invalid response format from server' }; }
    } else {
      const text = await response.text();
      data = { message: text || 'No response data' };
    }
    return { response, data };
  };

  try {
    let accessToken: string | null = null;

    if (requireAuth) {
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        10000,
        'callEdgeFunction: getSession'
      );
      if (session?.access_token) {
        accessToken = session.access_token;
      } else {
        accessToken = await getRefreshedToken();
        if (!accessToken) {
          return { success: false, error: 'Authentication required. Please sign in first.' };
        }
      }
    } else {
      try {
        const { data: { session } } = await withTimeout(
          supabase.auth.getSession(),
          5000,
          'callEdgeFunction: getSession (optional)'
        );
        accessToken = session?.access_token ?? null;
      } catch {
        // No session available or timed out, will use anon key
      }
    }

    const result = await attempt(accessToken);
    if ('error' in result) return { success: false, error: result.error };

    if (result.response.status === 401 && requireAuth) {
      const newToken = await getRefreshedToken();
      if (newToken) {
        const retry = await attempt(newToken);
        if ('error' in retry) return { success: false, error: retry.error };
        if (!retry.response.ok) {
          const errorMessage = retry.data.error || retry.data.message || `Request failed with status ${retry.response.status}`;
          return { success: false, error: errorMessage };
        }
        return { success: true, data: retry.data };
      }
    }

    if (!result.response.ok) {
      const errorMessage = result.data.error || result.data.message || `Request failed with status ${result.response.status}`;
      return { success: false, error: errorMessage };
    }

    return { success: true, data: result.data };
  } catch (error: any) {
    if (error.name === 'AbortError') {
      return { success: false, error: 'Request timed out. Please check your connection and try again.' };
    }
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message === 'Failed to fetch')) {
      return { success: false, error: 'Network error. Please check your internet connection and try again.' };
    }
    return { success: false, error: error.message || 'Network error. Please check your connection.' };
  }
}

// ============================================
// Verification APIs (Public - No Auth Required)
// ============================================

/**
 * Verify mobile OTP
 * @param mobile - 10-digit mobile number
 * @param otp - 6-digit OTP code
 */
export async function verifyMobileOTP(
  mobile: string,
  otp: string
): Promise<{ success: boolean; mobileVerified?: boolean; error?: string }> {
  const result = await callEdgeFunction('verify-mobile-otp', 'POST', { mobile, otp }, false);

  if (result.success && (result.data?.mobileVerified || result.data?.success)) {
    return { success: true, mobileVerified: true };
  }

  return { success: false, error: result.error || result.data?.error || 'OTP verification failed' };
}

/**
 * Verify GSTIN
 * @param gstin - 15-character GSTIN number
 */
export async function verifyGSTIN(
  gstin: string
): Promise<{ success: boolean; taxpayerInfo?: any; error?: string }> {
  const result = await callEdgeFunction('verify-gstin', 'POST', { gstin }, true);

  if (result.success && result.data?.taxpayerInfo) {
    return { success: true, taxpayerInfo: result.data.taxpayerInfo };
  }

  const errorMsg = (typeof result.error === 'string' ? result.error : null)
    || (typeof result.data?.message === 'string' ? result.data.message : null)
    || (typeof result.data?.error === 'string' ? result.data.error : null)
    || 'GSTIN verification failed. Please check the number and try again.';
  return { success: false, error: errorMsg };
}

/**
 * Verify GSTIN OTP
 * @param gstin - GSTIN number
 * @param otp - 6-digit OTP code
 */
export async function verifyGSTINOTP(
  gstin: string,
  otp: string
): Promise<{ success: boolean; gstinVerified?: boolean; error?: string }> {
  const result = await callEdgeFunction('verify-gstin-otp', 'POST', { gstin, otp }, true);

  if (result.success && (result.data?.gstinVerified || result.data?.success)) {
    return { success: true, gstinVerified: true };
  }

  return { success: false, error: result.error || result.data?.error || 'GSTIN OTP verification failed' };
}

/**
 * Verify PAN
 * @param pan - 10-character PAN number
 * @param name - Name as per PAN card
 * @param dateOfBirth - Date of birth (YYYY-MM-DD format)
 */
export async function verifyPAN(
  pan: string,
  name: string,
  dateOfBirth: string
): Promise<{ success: boolean; panVerified?: boolean; error?: string }> {
  const result = await callEdgeFunction('verify-pan', 'POST', { pan, name, dateOfBirth }, true);

  if (result.success && (result.data?.panVerified || result.data?.success)) {
    return { success: true, panVerified: true };
  }

  return { success: false, error: result.error || result.data?.error || 'PAN verification failed' };
}

// ============================================
// Business APIs (Requires Authentication)
// ============================================

/**
 * Submit business details
 * Creates or updates business and user profile
 */
export async function submitBusinessDetails(params: {
  ownerName: string;
  businessName: string;
  businessType: string;
  taxIdType: 'GSTIN' | 'PAN';
  taxIdValue: string;
  gstinData?: any;
  dateOfBirth?: string;
  registeredMobile?: string; // Add mobile number parameter
}): Promise<{ success: boolean; businessId?: string; error?: string }> {
  // Get current user (should be authenticated by this point)
  const { data: { user } } = await supabase.auth.getUser();
  
  if (!user) {
    return {
      success: false,
      error: 'User not authenticated. Please sign in first.',
    };
  }

  // Get mobile number from user's phone if not provided
  let mobileNumber = params.registeredMobile;
  if (!mobileNumber && user.phone) {
    mobileNumber = user.phone.replace(/\D/g, '').slice(-10);
  }

  const result = await callEdgeFunction(
    'submit-business-details',
    'POST',
    {
      ownerName: params.ownerName,
      businessName: params.businessName,
      businessType: params.businessType,
      taxIdType: params.taxIdType,
      taxIdValue: params.taxIdValue,
      gstinData: params.gstinData ? JSON.stringify(params.gstinData) : null,
      dateOfBirth: params.dateOfBirth || null,
      registeredMobile: mobileNumber,
    },
    true
  );

  if (result.success && result.data?.businessId) {
    return {
      success: true,
      businessId: result.data.businessId,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to save business details',
  };
}

// ============================================
// Address Management APIs (Requires Authentication)
// ============================================

/**
 * Get all addresses for the business
 */
export async function getAddresses(): Promise<{ success: boolean; addresses?: any[]; error?: string }> {
  return getCachedOrFetch('addresses', async () => {
    const result = await callEdgeFunction('manage-addresses', 'GET', undefined, true);
    if (!result.success && result.error?.includes('404')) return { success: true, addresses: [] };
    if (result.success && Array.isArray(result.data?.addresses)) return { success: true, addresses: result.data.addresses };
    return { success: false, error: result.error || 'Failed to fetch addresses' };
  });
}

/**
 * Create a new address
 */
export async function createAddress(params: {
  name: string;
  addressJson: any;
  type: 'primary' | 'branch' | 'warehouse';
  managerName?: string;
  managerMobileNumber?: string;
  isPrimary?: boolean;
  latitude?: number; // Add latitude
  longitude?: number; // Add longitude
}): Promise<{ success: boolean; address?: any; error?: string }> {
  const result = await callEdgeFunction(
    'manage-addresses',
    'POST',
    {
      name: params.name,
      addressJson: typeof params.addressJson === 'string' 
        ? params.addressJson 
        : JSON.stringify(params.addressJson),
      type: params.type,
      managerName: params.managerName || null,
      managerMobileNumber: params.managerMobileNumber || null,
      isPrimary: params.isPrimary || false,
      latitude: params.latitude || null,
      longitude: params.longitude || null,
    },
    true
  );

  if (result.success && result.data?.address) {
    // ✅ Update businesses table if this address is primary
    if (params.isPrimary && result.data.address.id) {
      await updateBusinessPrimaryAddress(result.data.address.id);
    }
    
    // Clear cache so data refreshes
    getClearCache()?.();
    invalidateApiCache('addresses');
    return {
      success: true,
      address: result.data.address,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to create address',
  };
}

/**
 * Update an existing address
 */
export async function updateAddress(params: {
  addressId: string;
  name?: string;
  addressJson?: any;
  type?: 'primary' | 'branch' | 'warehouse';
  managerName?: string;
  managerMobileNumber?: string;
  isPrimary?: boolean;
  latitude?: number; // Add latitude
  longitude?: number; // Add longitude
}): Promise<{ success: boolean; address?: any; error?: string }> {
  // ✅ Build request body, filtering out undefined values to avoid issues
  const requestBody: any = {
    addressId: params.addressId,
  };
  
  // Only include fields that are defined
  if (params.name !== undefined) {
    requestBody.name = params.name;
  }
  if (params.addressJson !== undefined) {
    requestBody.addressJson = typeof params.addressJson === 'string' 
      ? params.addressJson 
      : JSON.stringify(params.addressJson);
  }
  if (params.type !== undefined) {
    requestBody.type = params.type;
  }
  if (params.managerName !== undefined) {
    requestBody.managerName = params.managerName;
  }
  if (params.managerMobileNumber !== undefined) {
    requestBody.managerMobileNumber = params.managerMobileNumber;
  }
  if (params.isPrimary !== undefined) {
    requestBody.isPrimary = params.isPrimary;
  }
  if (params.latitude !== undefined) {
    requestBody.latitude = params.latitude;
  }
  if (params.longitude !== undefined) {
    requestBody.longitude = params.longitude;
  }
  
  const { supabase } = await import('@/lib/supabase');
  const updateData: any = { updated_at: new Date().toISOString() };
  if (params.name !== undefined) updateData.name = params.name;
  if (params.type !== undefined) updateData.type = params.type;
  if (params.managerName !== undefined) updateData.contact_name = params.managerName;
  if (params.managerMobileNumber !== undefined) updateData.contact_phone = params.managerMobileNumber;
  if (params.isPrimary !== undefined) updateData.is_primary = params.isPrimary;
  if (params.latitude !== undefined) updateData.latitude = params.latitude;
  if (params.longitude !== undefined) updateData.longitude = params.longitude;
  if (params.addressJson !== undefined) {
    const addrObj = typeof params.addressJson === 'string' ? JSON.parse(params.addressJson) : params.addressJson;
    if (addrObj.doorNumber !== undefined) updateData.door_number = addrObj.doorNumber;
    if (addrObj.addressLine1 !== undefined) updateData.address_line_1 = addrObj.addressLine1;
    if (addrObj.addressLine2 !== undefined) updateData.address_line_2 = addrObj.addressLine2;
    if (addrObj.city !== undefined) updateData.city = addrObj.city;
    if (addrObj.pincode !== undefined) updateData.pincode = addrObj.pincode;
    if (addrObj.stateName !== undefined) updateData.state = addrObj.stateName;
    if (addrObj.state !== undefined && !addrObj.stateName) updateData.state = addrObj.state;
    if (addrObj.stateCode !== undefined) updateData.state_code = addrObj.stateCode;
    if (addrObj.additionalLines !== undefined) updateData.address_line_3 = Array.isArray(addrObj.additionalLines) ? addrObj.additionalLines.join(', ') : addrObj.additionalLines;
  }

  const { data, error } = await supabase
    .from('locations')
    .update(updateData)
    .eq('id', params.addressId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message || 'Failed to update address' };
  }

  if (params.isPrimary) {
    await updateBusinessPrimaryAddress(params.addressId);
  }

  getClearCache()?.();
  invalidateApiCache('addresses');
  return { success: true, address: data };
}

/**
 * Delete an address
 */
export async function deleteAddress(addressId: string): Promise<{ success: boolean; error?: string }> {
  const result = await callEdgeFunction(
    'manage-addresses',
    'DELETE',
    { addressId },
    true
  );

  if (result.success) {
    // Clear cache so data refreshes
    getClearCache()?.();
    invalidateApiCache('addresses');
    return { success: true };
  }

  return {
    success: false,
    error: result.error || 'Failed to delete address',
  };
}

// ============================================
// Bank Account Management APIs (Requires Authentication)
// ============================================

/**
 * Get all bank accounts for the business
 */
export async function getBankAccounts(): Promise<{ success: boolean; accounts?: any[]; error?: string }> {
  return getCachedOrFetch('bankAccounts', async () => {
    const result = await callEdgeFunction('manage-bank-accounts', 'GET', undefined, true);
    if (!result.success && result.error?.includes('404')) return { success: true, accounts: [] };
    if (result.success && Array.isArray(result.data?.accounts)) return { success: true, accounts: result.data.accounts };
    return { success: false, error: result.error || 'Failed to fetch bank accounts' };
  });
}

/**
 * Create a new bank account
 */
export async function createBankAccount(params: {
  bankName: string;
  bankShortName?: string;
  bankId?: string;
  accountHolderName: string;
  accountNumber: string;
  ifscCode: string;
  upiId?: string;
  accountType: 'Savings' | 'Current';
  initialBalance: number;
  isPrimary?: boolean;
}): Promise<{ success: boolean; account?: any; error?: string }> {
  const result = await callEdgeFunction(
    'manage-bank-accounts',
    'POST',
    {
      bankName: params.bankName,
      bankShortName: params.bankShortName || null,
      bankId: params.bankId || null,
      accountHolderName: params.accountHolderName,
      accountNumber: params.accountNumber,
      ifscCode: params.ifscCode,
      upiId: params.upiId || null,
      accountType: params.accountType,
      initialBalance: params.initialBalance,
      isPrimary: params.isPrimary === true, // ✅ Fix: explicitly convert to boolean
    },
    true
  );

  if (result.success && result.data?.account) {
    // ✅ Update businesses table if this account is primary
    if (params.isPrimary && result.data.account.id) {
      await updateBusinessPrimaryBankAccount(result.data.account.id);
    }
    
    // Clear cache so data refreshes
    getClearCache()?.();
    invalidateApiCache('bankAccounts');
    return {
      success: true,
      account: result.data.account,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to create bank account',
  };
}

/**
 * Update a bank account
 */
export async function updateBankAccount(params: {
  accountId: string;
  bankName?: string;
  bankShortName?: string;
  bankId?: string;
  accountHolderName?: string;
  accountNumber?: string;
  ifscCode?: string;
  upiId?: string;
  accountType?: 'Savings' | 'Current';
  initialBalance?: number;
  isPrimary?: boolean;
}): Promise<{ success: boolean; account?: any; error?: string }> {
  // ✅ Build request body with action: 'update' for POST request
  const requestBody: any = {
    action: 'update', // ✅ Specify action for POST request
    accountId: params.accountId,
  };
  
  // Only include fields that are defined
  if (params.bankName !== undefined) {
    requestBody.bankName = params.bankName;
  }
  if (params.bankShortName !== undefined) {
    requestBody.bankShortName = params.bankShortName;
  }
  if (params.bankId !== undefined) {
    requestBody.bankId = params.bankId;
  }
  if (params.accountHolderName !== undefined) {
    requestBody.accountHolderName = params.accountHolderName;
  }
  if (params.accountNumber !== undefined) {
    requestBody.accountNumber = params.accountNumber;
  }
  if (params.ifscCode !== undefined) {
    requestBody.ifscCode = params.ifscCode;
  }
  if (params.upiId !== undefined) {
    requestBody.upiId = params.upiId;
  }
  if (params.accountType !== undefined) {
    requestBody.accountType = params.accountType;
  }
  if (params.initialBalance !== undefined) {
    requestBody.initialBalance = params.initialBalance;
  }
  if (params.isPrimary !== undefined) {
    requestBody.isPrimary = params.isPrimary;
  }
  
  // Direct Supabase update for reliability
  const { supabase } = await import('@/lib/supabase');
  const updateData: any = {};
  if (params.bankName !== undefined) updateData.bank_name = params.bankName;
  if (params.bankShortName !== undefined) updateData.bank_short_name = params.bankShortName;
  if (params.bankId !== undefined) updateData.bank_id = params.bankId;
  if (params.accountHolderName !== undefined) updateData.account_holder_name = params.accountHolderName;
  if (params.accountNumber !== undefined) updateData.account_number = params.accountNumber;
  if (params.ifscCode !== undefined) updateData.ifsc_code = params.ifscCode;
  if (params.upiId !== undefined) updateData.upi_id = params.upiId;
  if (params.accountType !== undefined) updateData.account_type = params.accountType;
  if (params.isPrimary !== undefined) updateData.is_primary = params.isPrimary;
  updateData.updated_at = new Date().toISOString();

  const { data, error } = await supabase
    .from('bank_accounts')
    .update(updateData)
    .eq('id', params.accountId)
    .select()
    .single();

  if (error) {
    return { success: false, error: error.message || 'Failed to update bank account' };
  }

  if (params.isPrimary) {
    await updateBusinessPrimaryBankAccount(params.accountId);
    await supabase
      .from('bank_accounts')
      .update({ is_primary: false })
      .eq('business_id', data.business_id)
      .neq('id', params.accountId);
  }

  getClearCache()?.();
  invalidateApiCache('bankAccounts');
  return { success: true, account: data };
}

/**
 * Delete a bank account
 */
export async function deleteBankAccount(accountId: string): Promise<{ success: boolean; error?: string }> {
  const result = await callEdgeFunction(
    'manage-bank-accounts',
    'DELETE',
    { accountId },
    true
  );

  if (result.success) {
    // Clear cache so data refreshes
    getClearCache()?.();
    invalidateApiCache('bankAccounts');
    return { success: true };
  }

  return {
    success: false,
    error: result.error || 'Failed to delete bank account',
  };
}

// ============================================
// Bank & Cash Transaction APIs (Requires Authentication)
// ============================================

export async function addBankTransaction(params: {
  bankAccountId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  category?: string;
  paymentMode?: string;
  referenceNumber?: string;
  counterpartyName?: string;
  transactionDate?: string;
}): Promise<{ success: boolean; transaction?: any; error?: string }> {
  const result = await callEdgeFunction('manage-bank-transactions', 'POST', {
    bank_account_id: params.bankAccountId,
    type: params.type,
    amount: params.amount,
    description: params.description,
    category: params.category || 'general',
    payment_mode: params.paymentMode || 'other',
    reference_number: params.referenceNumber || '',
    counterparty_name: params.counterpartyName || '',
    transaction_date: params.transactionDate || new Date().toISOString(),
  }, true);

  if (result.success) {
    getClearCache()?.();
    emitTransactionChange('bank_transaction');
    return { success: true, transaction: result.data?.transaction };
  }
  return { success: false, error: result.error || 'Failed to add bank transaction' };
}

export async function addCashTransaction(params: {
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  category?: string;
  referenceNumber?: string;
  counterpartyName?: string;
  transactionDate?: string;
}): Promise<{ success: boolean; transaction?: any; error?: string }> {
  const result = await callEdgeFunction('manage-cash-transactions', 'POST', {
    type: params.type,
    amount: params.amount,
    description: params.description,
    category: params.category || 'general',
    reference_number: params.referenceNumber || '',
    counterparty_name: params.counterpartyName || '',
    transaction_date: params.transactionDate || new Date().toISOString(),
  }, true);

  if (result.success) {
    getClearCache()?.();
    emitTransactionChange('cash_transaction');
    return { success: true, transaction: result.data?.transaction };
  }
  return { success: false, error: result.error || 'Failed to add cash transaction' };
}

export async function getBankTransactions(bankAccountId: string): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-bank-transactions?bank_account_id=' + bankAccountId, 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch bank transactions' };
    return { success: true, transactions: result.data?.transactions || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch bank transactions' };
  }
}

export async function getCashTransactions(): Promise<{ success: boolean; transactions?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-cash-transactions', 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch cash transactions' };
    return { success: true, transactions: result.data?.transactions || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch cash transactions' };
  }
}

export async function recordTransactionForModule(params: {
  module: 'invoice' | 'return' | 'purchase_invoice' | 'receivable' | 'payable';
  referenceId: string;
  paymentMethod: string;
  amount: number;
  bankAccountId?: string;
  counterpartyName?: string;
  description: string;
}): Promise<{ success: boolean; error?: string }> {
  const isCash = params.paymentMethod === 'cash';
  const isDebit = ['return', 'purchase_invoice', 'payable'].includes(params.module);
  const txType = isDebit ? 'debit' : 'credit';

  if (isCash) {
    return addCashTransaction({
      type: txType,
      amount: params.amount,
      description: params.description,
      category: params.module,
      counterpartyName: params.counterpartyName,
      referenceNumber: params.referenceId,
    });
  } else {
    if (!params.bankAccountId) return { success: false, error: 'Bank account required for non-cash payment' };
    return addBankTransaction({
      bankAccountId: params.bankAccountId,
      type: txType,
      amount: params.amount,
      description: params.description,
      category: params.module,
      paymentMode: params.paymentMethod,
      counterpartyName: params.counterpartyName,
      referenceNumber: params.referenceId,
    });
  }
}

// ============================================
// Business Primary References Update API (Requires Authentication)
// ============================================

/**
 * Update primary address ID in businesses table
 */
export async function updateBusinessPrimaryAddress(addressId: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { error } = await supabase
      .from('businesses')
      .update({ primary_address_id: addressId })
      .eq('id', ctx.businessId);

    if (error) return { success: false, error: error.message };
    getClearCache()?.();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update primary address' };
  }
}

/**
 * Update primary bank account ID in businesses table
 */
export async function updateBusinessPrimaryBankAccount(accountId: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { error } = await supabase
      .from('businesses')
      .update({ primary_bank_account_id: accountId })
      .eq('id', ctx.businessId);

    if (error) return { success: false, error: error.message };
    getClearCache()?.();
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update primary bank account' };
  }
}

/**
 * Create or update subscription in database
 * This syncs the local subscription state to the database
 */
export async function createOrUpdateSubscription(
  subscriptionData: {
    isOnTrial: boolean;
    trialStartDate?: string;
    trialEndDate?: string;
    status: 'active' | 'inactive' | 'trialing' | 'cancelled';
    planId?: string;
  }
): Promise<{ success: boolean; subscription?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-subscriptions', 'POST', {
      plan_id: subscriptionData.planId || null,
      is_on_trial: subscriptionData.isOnTrial,
      trial_start_date: subscriptionData.trialStartDate || null,
      trial_end_date: subscriptionData.trialEndDate || null,
      status: subscriptionData.status,
    }, true);

    if (result.success) {
      getClearCache()?.();
      return { success: true, subscription: result.data?.subscription || result.data };
    }

    return { success: false, error: result.error || 'Failed to sync subscription' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to sync subscription' };
  }
}

// ============================================
// Business Cash Balance Update API (Requires Authentication)
// ============================================

/**
 * Update business cash balance
 */
export async function updateBusinessCashBalance(
  initialCashBalance: number
): Promise<{ success: boolean; business?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-cash-balance', 'POST', {
      initial_cash_balance: initialCashBalance,
    }, true);

    if (result.success) {
      getClearCache()?.();
      emitTransactionChange('cash_balance');
      return { success: true, business: result.data?.business || { initial_cash_balance: initialCashBalance } };
    }

    return { success: false, error: result.error || 'Failed to update cash balance' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update cash balance' };
  }
}

// ============================================
// Onboarding Completion API (Requires Authentication)
// ============================================

/**
 * Complete onboarding
 * Creates business settings and finalizes setup
 */
export async function completeOnboarding(params: {
  initialCashBalance: number;
  invoicePrefix: string;
  invoicePattern: string;
  startingInvoiceNumber: string;
  fiscalYear: 'JAN-DEC' | 'APR-MAR';
  registeredMobile: string;
}): Promise<{ success: boolean; businessId?: string; error?: string }> {
  const result = await callEdgeFunction(
    'complete-onboarding',
    'POST',
    {
      initialCashBalance: params.initialCashBalance,
      invoicePrefix: params.invoicePrefix,
      invoicePattern: typeof params.invoicePattern === 'string' 
        ? params.invoicePattern 
        : JSON.stringify(params.invoicePattern),
      startingInvoiceNumber: params.startingInvoiceNumber,
      fiscalYear: params.fiscalYear,
      registeredMobile: params.registeredMobile,
    },
    true
  );

  if (result.success && result.data?.businessId) {
    const businessId = result.data.businessId;
    const startNum = parseInt(params.startingInvoiceNumber, 10) || 1;
    try {
      const { supabase } = await import('@/lib/supabase');
      await supabase
        .from('business_settings')
        .update({ last_invoice_number: Math.max(startNum - 1, 0) })
        .eq('business_id', businessId);
    } catch (e) {
      console.warn('Could not fix last_invoice_number after onboarding:', e);
    }
    return {
      success: true,
      businessId,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to complete onboarding',
  };
}

// ============================================
// Google Maps API (Public - No Auth Required)
// ============================================

/**
 * Call Google Maps geocoding API
 */
export async function callGoogleMapsAPI(params: {
  action: 'autocomplete' | 'place-details' | 'geocode' | 'reverse-geocode';
  input?: string;
  placeId?: string;
  address?: string;
  lat?: number;
  lng?: number;
}): Promise<{ success: boolean; data?: any; error?: string }> {
  const body: any = { action: params.action };
  
  if (params.action === 'autocomplete' && params.input) {
    body.input = params.input;
  } else if (params.action === 'place-details' && params.placeId) {
    body.placeId = params.placeId;
  } else if (params.action === 'geocode' && params.address) {
    body.address = params.address;
  } else if (params.action === 'reverse-geocode' && params.lat !== undefined && params.lng !== undefined) {
    body.lat = params.lat;
    body.lng = params.lng;
  }

  const result = await callEdgeFunction('google-maps-geocode', 'POST', body, false);

  if (result.success && result.data?.data) {
    return {
      success: true,
      data: result.data.data,
    };
  }

  return {
    success: false,
    error: result.error || 'Google Maps API call failed',
  };
}

// ============================================
// Signup Progress Management
// ============================================

/**
 * Get signup progress for current user
 */
export async function getSignupProgress(): Promise<{ success: boolean; progress?: any; error?: string }> {
  const result = await callEdgeFunction('manage-signup-progress', 'GET', undefined, true);
  
  if (result.success && result.data?.progress) {
    return {
      success: true,
      progress: result.data.progress,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to get signup progress',
  };
}

/**
 * Save or update signup progress
 */
export async function saveSignupProgress(params: {
  mobile: string;
  mobileVerified?: boolean;
  taxIdType?: 'GSTIN' | 'PAN';
  taxIdValue?: string;
  taxIdVerified?: boolean;
  ownerName?: string;
  ownerDob?: string;
  businessName?: string;
  businessType?: string;
  gstinData?: any;
  currentStep?: 'mobile' | 'mobileOtp' | 'gstinPan' | 'gstinOtp' | 'verifyPan' | 'businessDetails' | 'primaryAddress' | 'addressManagement' | 'primaryBank' | 'bankManagement' | 'finalSetup' | 'businessSummary' | 'signupComplete';
}): Promise<{ success: boolean; progress?: any; error?: string }> {
  // Use non-required auth so it falls back gracefully if session isn't ready yet
  let result = await callEdgeFunction('manage-signup-progress', 'POST', params, false);
  
  // Retry once with required auth if the first attempt failed due to auth
  if (!result.success && (result.error?.includes('Unauthorized') || result.error?.includes('Authentication'))) {
    await new Promise(r => setTimeout(r, 500));
    result = await callEdgeFunction('manage-signup-progress', 'POST', params, true);
  }
  
  if (result.success && result.data?.progress) {
    return {
      success: true,
      progress: result.data.progress,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to save signup progress',
  };
}

/**
 * Delete signup progress (when signup is complete)
 * Uses POST method with action='delete' to avoid CORS issues with DELETE method
 * @param mobile - 10-digit mobile number (optional). If not provided, attempts to get from session.
 *                 The Edge Function requires mobile to identify which signup_progress row to delete.
 */
export async function deleteSignupProgress(mobile?: string): Promise<{ success: boolean; error?: string }> {
  try {
    let mobileNumber = mobile;
    if (!mobileNumber || !mobileNumber.replace(/\D/g, '')) {
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        5000,
        'deleteSignupProgress: getSession'
      );
      const phone = session?.user?.phone || session?.user?.user_metadata?.phone;
      if (phone) {
        mobileNumber = phone.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10);
      }
    } else {
      mobileNumber = mobileNumber.replace(/^\+91/, '').replace(/\D/g, '').slice(0, 10);
    }
    const body: { action: string; mobile?: string } = { action: 'delete' };
    if (mobileNumber) body.mobile = mobileNumber;

    const result = await callEdgeFunction('manage-signup-progress', 'POST', body, true);
    
    // DELETE is idempotent - if it succeeds or if the resource doesn't exist, consider it successful
    // This prevents errors when signup progress was already deleted or doesn't exist
    if (result.success || result.error?.includes('not found') || result.error?.includes('does not exist')) {
      return {
        success: true,
      };
    }
    
    return {
      success: result.success,
      error: result.error,
    };
  } catch (error: any) {
    // signup progress deletion failed
    // Return success: true for network errors during cleanup - this is non-blocking cleanup
    // The signup is already complete, so failing to delete progress shouldn't block the user
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      // Network error during signup progress deletion (non-blocking)
      return {
        success: true, // Treat as success since this is cleanup after successful signup
      };
    }
    return {
      success: false,
      error: error.message || 'Failed to delete signup progress',
    };
  }
}

// ============================================
// Device Snapshot Management
// ============================================

/**
 * Save or update device snapshot
 */
export async function saveDeviceSnapshot(snapshot: {
  deviceId: string;
  deviceName?: string;
  deviceBrand?: string;
  deviceModel?: string;
  deviceType?: string;
  deviceYearClass?: number;
  osName?: string;
  osVersion?: string;
  platformApiLevel?: number;
  networkServiceProvider?: string;
  internetServiceProvider?: string;
  networkType?: string;
  wifiName?: string;
  bluetoothName?: string;
  ipAddress?: string;
  manufacturer?: string;
  totalMemory?: number;
  isDevice?: boolean;
  isEmulator?: boolean;
  isTablet?: boolean;
  screenWidth?: number;
  screenHeight?: number;
  screenScale?: number;
  pixelDensity?: number;
  totalStorage?: number;
  freeStorage?: number;
  batteryLevel?: number;
  batteryState?: string;
  carrierName?: string;
  mobileCountryCode?: string;
  mobileNetworkCode?: string;
  appVersion?: string;
  appBuildNumber?: string;
  expoSdkVersion?: string;
  locale?: string;
  timezone?: string;
}): Promise<{ success: boolean; snapshot?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-device-snapshots', 'POST', snapshot, true);

    if (result.success && result.data) {
      if (result.data.snapshot) return { success: true, snapshot: result.data.snapshot };
      if (result.data.id && result.data.device_id) return { success: true, snapshot: result.data };
    }

    return { success: false, error: result.error || result.data?.error || 'Failed to save device snapshot' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Exception saving device snapshot' };
  }
}

/**
 * Get all device snapshots for current user
 */
export async function getDeviceSnapshots(): Promise<{ success: boolean; snapshots?: any[]; error?: string }> {
  const result = await callEdgeFunction('manage-device-snapshots', 'GET', undefined, true);
  
  if (result.success && Array.isArray(result.data?.snapshots)) {
    return {
      success: true,
      snapshots: result.data.snapshots,
    };
  }
  
  return {
    success: false,
    error: result.error || 'Failed to fetch device snapshots',
  };
}

/**
 * Delete a device snapshot
 */
export async function deleteDeviceSnapshot(deviceId: string): Promise<{ success: boolean; error?: string }> {
  const result = await callEdgeFunction('manage-device-snapshots', 'DELETE', { deviceId }, true);
  
  return {
    success: result.success,
    error: result.error,
  };
}

// ============================================
// Staff Management APIs (Requires Authentication)
// ============================================

/**
 * Get all staff for the business
 */
export async function getStaff(): Promise<{ success: boolean; staff?: any[]; error?: string }> {
  return getCachedOrFetch('staff', async () => {
    try {
      const result = await callEdgeFunction('manage-staff', 'GET', undefined, true);
      if (result.success && result.data) {
        if (Array.isArray(result.data)) return { success: true, staff: result.data };
        if (Array.isArray(result.data.staff)) return { success: true, staff: result.data.staff };
        if (Array.isArray(result.data.data)) return { success: true, staff: result.data.data };
      }
      return { success: false, error: result.error || 'Failed to fetch staff' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch staff' };
    }
  });
}

/**
 * Create a new staff member
 */
export async function createStaff(params: {
  name: string;
  mobile: string;
  email?: string;
  role: string;
  department?: string;
  address?: string;
  employeeId?: string;
  locationId?: string;
  locationType?: 'branch' | 'warehouse' | 'primary';
  locationName?: string;
  basicSalary?: number;
  allowances?: number;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  permissions?: string[];
  monthlySalesTarget?: number;
  monthlyInvoiceTarget?: number;
  verificationCode?: string;
  attendanceMode?: 'geofence' | 'manual';
  geofenceRadius?: number;
}): Promise<{ success: boolean; staff?: any; error?: string }> {
  try {
    const result = await callEdgeFunction(
      'manage-staff',
      'POST',
      {
        name: params.name,
        mobile: params.mobile,
        email: params.email || null,
        role: params.role,
        department: params.department || null,
        address: params.address || null,
        employeeId: params.employeeId || null,
        locationId: params.locationId || null,
        locationType: params.locationType || null,
        locationName: params.locationName || null,
        basicSalary: params.basicSalary || null,
        allowances: params.allowances || null,
        emergencyContactName: params.emergencyContactName || null,
        emergencyContactRelation: params.emergencyContactRelation || null,
        emergencyContactPhone: params.emergencyContactPhone || null,
        permissions: params.permissions || [],
        monthlySalesTarget: params.monthlySalesTarget || null,
        monthlyInvoiceTarget: params.monthlyInvoiceTarget || null,
        verificationCode: params.verificationCode || null,
        attendanceMode: params.attendanceMode || 'geofence',
        geofenceRadius: params.geofenceRadius || 100,
      },
      true
    );

    // Handle different response structures
    if (result.success) {
      const staffData = result.data?.staff || result.data;
      if (staffData) {
        // Clear cache so data refreshes
        getClearCache()?.();
        invalidateApiCache('staff');
        return {
          success: true,
          staff: staffData,
        };
      }
    }

    // If Edge Function doesn't exist or fails, return error but don't throw
    // This allows the signup flow to continue
    // Staff creation failed
    return {
      success: false,
      error: result.error || 'Failed to create staff - Edge Function may not be available',
    };
  } catch (error: any) {
    // Catch any unexpected errors and return gracefully
    // Staff creation error (non-blocking)
    return {
      success: false,
      error: error.message || 'Failed to create staff',
    };
  }
}

/**
 * Update a staff member
 */
export async function updateStaff(params: {
  staffId: string;
  name?: string;
  mobile?: string;
  email?: string;
  role?: string;
  department?: string;
  address?: string;
  employeeId?: string;
  locationId?: string;
  locationType?: 'branch' | 'warehouse' | 'primary';
  locationName?: string;
  status?: 'active' | 'inactive' | 'on_leave';
  basicSalary?: number;
  allowances?: number;
  emergencyContactName?: string;
  emergencyContactRelation?: string;
  emergencyContactPhone?: string;
  permissions?: string[];
  monthlySalesTarget?: number;
  monthlyInvoiceTarget?: number;
  attendanceMode?: 'geofence' | 'manual';
  geofenceRadius?: number;
}): Promise<{ success: boolean; staff?: any; error?: string }> {
  const result = await callEdgeFunction(
    'manage-staff',
    'PUT',
    params,
    true
  );

  if (result.success && result.data?.staff) {
    // Clear cache so data refreshes
    getClearCache()?.();
    invalidateApiCache('staff');
    return {
      success: true,
      staff: result.data.staff,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to update staff',
  };
}

/**
 * Delete a staff member
 */
export async function deleteStaff(staffId: string): Promise<{ success: boolean; error?: string }> {
  const result = await callEdgeFunction(
    'manage-staff',
    'DELETE',
    { staffId },
    true
  );

  if (result.success) {
    // Clear cache so data refreshes
    getClearCache()?.();
    invalidateApiCache('staff');
    return { success: true };
  }

  return {
    success: false,
    error: result.error || 'Failed to delete staff',
  };
}

// ============================================
// Staff Metrics APIs (Direct Supabase)
// ============================================

/**
 * Record staff attendance (check-in / check-out / absence)
 */
export async function recordStaffAttendance(params: {
  staffId: string;
  date?: string;
  checkIn?: string;
  checkOut?: string;
  status?: 'present' | 'absent' | 'half_day' | 'on_leave' | 'holiday';
  notes?: string;
  locationId?: string;
}): Promise<{ success: boolean; attendance?: any; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { success: false, error: 'Not authenticated' };

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (!userData?.business_id) return { success: false, error: 'No business found' };

    const attendanceDate = params.date || new Date().toISOString().split('T')[0];

    const { data, error } = await supabase
      .from('staff_attendance')
      .upsert({
        business_id: userData.business_id,
        staff_id: params.staffId,
        date: attendanceDate,
        check_in: params.checkIn || null,
        check_out: params.checkOut || null,
        status: params.status || 'present',
        notes: params.notes || null,
        location_id: params.locationId || null,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'staff_id,date' })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, attendance: data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to record attendance' };
  }
}

/**
 * Get staff attendance for a date range
 */
export async function getStaffAttendance(params: {
  staffId?: string;
  startDate: string;
  endDate: string;
}): Promise<{ success: boolean; attendance?: any[]; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { success: false, error: 'Not authenticated' };

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (!userData?.business_id) return { success: false, error: 'No business found' };

    let query = supabase
      .from('staff_attendance')
      .select('*')
      .eq('business_id', userData.business_id)
      .gte('date', params.startDate)
      .lte('date', params.endDate)
      .order('date', { ascending: false });

    if (params.staffId) {
      query = query.eq('staff_id', params.staffId);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, attendance: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch attendance' };
  }
}

/**
 * Create a staff attendance session (check-in)
 */
export async function createStaffSession(params: {
  staffId: string;
  businessId: string;
  selfieUrl?: string;
  latitude?: number;
  longitude?: number;
}): Promise<{ success: boolean; session?: any; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const now = new Date().toISOString();
    const today = now.split('T')[0];

    const { data, error } = await supabase
      .from('staff_sessions')
      .insert({
        business_id: params.businessId,
        staff_id: params.staffId,
        date: today,
        check_in: now,
        selfie_url: params.selfieUrl || null,
        check_in_latitude: params.latitude || null,
        check_in_longitude: params.longitude || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    await supabase
      .from('staff')
      .update({ is_online: true, last_online_at: now })
      .eq('id', params.staffId);

    await supabase
      .from('staff_attendance')
      .upsert({
        business_id: params.businessId,
        staff_id: params.staffId,
        date: today,
        check_in: now,
        status: 'present',
        selfie_url: params.selfieUrl || null,
        updated_at: now,
      }, { onConflict: 'staff_id,date' })
      .select();

    return { success: true, session: data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create session' };
  }
}

/**
 * End a staff attendance session (check-out)
 */
export async function endStaffSession(params: {
  sessionId: string;
  staffId: string;
  reason: 'manual' | 'geofence_exit' | 'app_closed' | 'end_of_day';
  latitude?: number;
  longitude?: number;
  distance?: number;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const now = new Date().toISOString();

    const { error } = await supabase
      .from('staff_sessions')
      .update({
        check_out: now,
        check_out_reason: params.reason,
        check_out_latitude: params.latitude || null,
        check_out_longitude: params.longitude || null,
        distance_at_checkout: params.distance || null,
      })
      .eq('id', params.sessionId);

    if (error) return { success: false, error: error.message };

    await supabase
      .from('staff')
      .update({ is_online: false })
      .eq('id', params.staffId);

    const today = now.split('T')[0];
    await supabase
      .from('staff_attendance')
      .update({ check_out: now, updated_at: now })
      .eq('staff_id', params.staffId)
      .eq('date', today);

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to end session' };
  }
}

/**
 * Get staff sessions for a date range
 */
export async function getStaffSessions(params: {
  staffId: string;
  startDate: string;
  endDate: string;
}): Promise<{ success: boolean; sessions?: any[]; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { success: false, error: 'Not authenticated' };

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (!userData?.business_id) return { success: false, error: 'No business found' };

    const { data, error } = await supabase
      .from('staff_sessions')
      .select('*')
      .eq('business_id', userData.business_id)
      .eq('staff_id', params.staffId)
      .gte('date', params.startDate)
      .lte('date', params.endDate)
      .order('check_in', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, sessions: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch sessions' };
  }
}

/**
 * Get open (active) session for a staff member
 */
export async function getActiveStaffSession(staffId: string): Promise<{ success: boolean; session?: any; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');

    const { data, error } = await supabase
      .from('staff_sessions')
      .select('*')
      .eq('staff_id', staffId)
      .is('check_out', null)
      .order('check_in', { ascending: false })
      .limit(1)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    return { success: true, session: data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch active session' };
  }
}

/**
 * Add a staff rating
 */
export async function addStaffRating(params: {
  staffId: string;
  rating: number;
  ratedBy?: 'customer' | 'manager' | 'system';
  review?: string;
  invoiceId?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { success: false, error: 'Not authenticated' };

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (!userData?.business_id) return { success: false, error: 'No business found' };

    const { error } = await supabase
      .from('staff_ratings')
      .insert({
        business_id: userData.business_id,
        staff_id: params.staffId,
        rating: params.rating,
        rated_by: params.ratedBy || 'manager',
        review: params.review || null,
        invoice_id: params.invoiceId || null,
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add rating' };
  }
}

/**
 * Get aggregated staff metrics: attendance %, invoices processed, sales amount, avg rating
 * Computes from staff_attendance, invoices, returns, and staff_ratings tables.
 */
export async function getStaffMetrics(staffId: string): Promise<{
  success: boolean;
  metrics?: {
    attendance: { percentage: number; presentDays: number; totalDays: number; lastCheckIn: string };
    performance: { salesAmount: number; invoicesProcessed: number; customersServed: number; returnsHandled: number; rating: number; score: number };
  };
  error?: string;
}> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) return { success: false, error: 'Not authenticated' };

    const { data: userData } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (!userData?.business_id) return { success: false, error: 'No business found' };

    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
    const today = now.toISOString().split('T')[0];

    // Fetch attendance for current month
    const { data: attendanceData } = await supabase
      .from('staff_attendance')
      .select('*')
      .eq('staff_id', staffId)
      .gte('date', monthStart)
      .lte('date', today);

    const totalDays = attendanceData?.length || 0;
    const presentDays = attendanceData?.filter((a: any) => a.status === 'present' || a.status === 'half_day').length || 0;
    const attendancePct = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0;
    const lastCheckIn = attendanceData?.[0]?.check_in || '';

    // Fetch invoices for current month
    const { data: invoiceData } = await supabase
      .from('invoices')
      .select('id, total_amount, customer_id')
      .eq('business_id', userData.business_id)
      .eq('staff_id', staffId)
      .gte('created_at', `${monthStart}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    const invoicesProcessed = invoiceData?.length || 0;
    const salesAmount = invoiceData?.reduce((sum: number, inv: any) => sum + (parseFloat(inv.total_amount) || 0), 0) || 0;
    const uniqueCustomers = new Set(invoiceData?.map((inv: any) => inv.customer_id).filter(Boolean)).size;

    // Fetch returns for current month
    const { data: returnsData } = await supabase
      .from('returns')
      .select('id')
      .eq('business_id', userData.business_id)
      .eq('staff_id', staffId)
      .gte('created_at', `${monthStart}T00:00:00`)
      .lte('created_at', `${today}T23:59:59`);

    const returnsHandled = returnsData?.length || 0;

    // Fetch average rating
    const { data: ratingsData } = await supabase
      .from('staff_ratings')
      .select('rating')
      .eq('staff_id', staffId);

    const avgRating = ratingsData && ratingsData.length > 0
      ? Math.round((ratingsData.reduce((sum: number, r: any) => sum + parseFloat(r.rating), 0) / ratingsData.length) * 10) / 10
      : 0;

    // Composite score (weighted)
    const score = Math.min(100, Math.round(
      (attendancePct * 0.3) +
      (Math.min(invoicesProcessed, 50) * 0.8) +
      (avgRating * 8)
    ));

    return {
      success: true,
      metrics: {
        attendance: { percentage: attendancePct, presentDays, totalDays, lastCheckIn },
        performance: { salesAmount, invoicesProcessed, customersServed: uniqueCustomers, returnsHandled, rating: avgRating, score },
      },
    };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch staff metrics' };
  }
}

// ============================================
// Supplier APIs (Edge Function)
// ============================================

/**
 * Get all suppliers for the current business
 */
export async function getSuppliers(): Promise<{ success: boolean; suppliers?: any[]; error?: string }> {
  return getCachedOrFetch('suppliers', async () => {
    try {
      const result = await callEdgeFunction('manage-suppliers', 'GET', undefined, true);
      if (result.success) return { success: true, suppliers: result.data?.suppliers || [] };
      return { success: false, error: result.error || 'Failed to fetch suppliers' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch suppliers' };
    }
  });
}

/**
 * Create a new supplier
 */
export async function createSupplier(params: {
  businessName: string;
  contactPerson: string;
  mobileNumber: string;
  email?: string;
  gstinPan?: string;
  addressLine1: string;
  addressLine2?: string;
  addressLine3?: string;
  city: string;
  pincode: string;
  state: string;
  additionalNotes?: string;
}): Promise<{ success: boolean; supplier?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-suppliers', 'POST', {
      business_name: params.businessName,
      contact_person: params.contactPerson,
      mobile_number: params.mobileNumber,
      email: params.email || null,
      gstin_pan: params.gstinPan || null,
      address_line_1: params.addressLine1,
      address_line_2: params.addressLine2 || null,
      address_line_3: params.addressLine3 || null,
      city: params.city,
      pincode: params.pincode,
      state: params.state,
      additional_notes: params.additionalNotes || null,
    }, true);

    if (result.success) {
      getClearCache()?.();
      emitTransactionChange('supplier');
      invalidateApiCache('suppliers');
      return { success: true, supplier: result.data?.supplier };
    }

    return { success: false, error: result.error || 'Failed to create supplier' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create supplier' };
  }
}

/**
 * Update a supplier
 */
export async function updateSupplier(
  supplierId: string,
  params: {
    businessName?: string;
    contactPerson?: string;
    mobileNumber?: string;
    email?: string;
    gstinPan?: string;
    addressLine1?: string;
    addressLine2?: string;
    addressLine3?: string;
    city?: string;
    pincode?: string;
    state?: string;
    additionalNotes?: string;
    status?: string;
  }
): Promise<{ success: boolean; supplier?: any; error?: string }> {
  try {
    const body: any = { id: supplierId };

    if (params.businessName !== undefined) body.business_name = params.businessName;
    if (params.contactPerson !== undefined) body.contact_person = params.contactPerson;
    if (params.mobileNumber !== undefined) body.mobile_number = params.mobileNumber;
    if (params.email !== undefined) body.email = params.email || null;
    if (params.gstinPan !== undefined) body.gstin_pan = params.gstinPan || null;
    if (params.addressLine1 !== undefined) body.address_line_1 = params.addressLine1;
    if (params.addressLine2 !== undefined) body.address_line_2 = params.addressLine2 || null;
    if (params.addressLine3 !== undefined) body.address_line_3 = params.addressLine3 || null;
    if (params.city !== undefined) body.city = params.city;
    if (params.pincode !== undefined) body.pincode = params.pincode;
    if (params.state !== undefined) body.state = params.state;
    if (params.additionalNotes !== undefined) body.additional_notes = params.additionalNotes || null;
    if (params.status !== undefined) body.status = params.status;

    const result = await callEdgeFunction('manage-suppliers', 'PUT', body, true);

    if (result.success) {
      getClearCache()?.();
      invalidateApiCache('suppliers');
      return { success: true, supplier: result.data?.supplier };
    }

    return { success: false, error: result.error || 'Failed to update supplier' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update supplier' };
  }
}

/**
 * Delete a supplier
 */
export async function deleteSupplier(supplierId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-suppliers', 'DELETE', { id: supplierId }, true);

    if (result.success) {
      getClearCache()?.();
      invalidateApiCache('suppliers');
      return { success: true };
    }

    return { success: false, error: result.error || 'Failed to delete supplier' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete supplier' };
  }
}

// ============================================
// Product Image Upload
// ============================================

/**
 * Upload a single local image to Supabase Storage and return the public URL.
 * Skips upload if the URI is already a remote URL.
 */
export async function uploadProductImage(localUri: string): Promise<string> {
  if (!localUri || localUri.trim() === '') return '';
  if (localUri.startsWith('http://') || localUri.startsWith('https://')) return localUri;

  try {
    let contentType = 'image/jpeg';
    let fileBytes: ArrayBuffer;
    let ext = 'jpg';

    if (localUri.startsWith('data:image')) {
      const match = localUri.match(/^data:image\/([\w+.-]+);base64,/);
      const rawExt = match?.[1] || 'png';
      if (rawExt === 'png') {
        ext = 'png';
        contentType = 'image/png';
      } else if (rawExt === 'jpeg' || rawExt === 'jpg') {
        ext = 'jpg';
        contentType = 'image/jpeg';
      } else if (rawExt === 'webp') {
        ext = 'webp';
        contentType = 'image/webp';
      } else {
        ext = 'png';
        contentType = 'image/png';
      }
      const base64Data = localUri.replace(/^data:image\/[\w+.-]+;base64,/, '');
      const binaryStr = atob(base64Data);
      const bytes = new Uint8Array(binaryStr.length);
      for (let i = 0; i < binaryStr.length; i++) bytes[i] = binaryStr.charCodeAt(i);
      fileBytes = bytes.buffer;
    } else {
      ext = localUri.split('.').pop()?.split('?')[0]?.toLowerCase() || 'jpg';
      const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', webp: 'image/webp', gif: 'image/gif' };
      contentType = mimeMap[ext] || 'image/jpeg';
      const response = await fetch(localUri);
      if (!response.ok) {
        console.warn('⚠️ Image fetch failed:', response.status, localUri);
        return '';
      }
      fileBytes = await response.arrayBuffer();
    }

    if (!fileBytes || fileBytes.byteLength === 0) {
      console.warn('⚠️ Image data is empty for:', localUri.substring(0, 60));
      return '';
    }

    const prefix = localUri.startsWith('data:image') ? 'barcode' : 'product';
    const filename = `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}.${ext}`;
    const { data, error } = await supabase.storage
      .from('product-images')
      .upload(filename, fileBytes, { contentType, upsert: false });

    if (error) {
      console.warn('⚠️ Product image upload failed:', error.message);
      return '';
    }

    const { data: urlData } = supabase.storage.from('product-images').getPublicUrl(data.path);
    const publicUrl = urlData?.publicUrl || '';
    console.log('✅ Image uploaded:', publicUrl);
    return publicUrl;
  } catch (err: any) {
    console.warn('⚠️ Image upload exception:', err?.message || err);
    return '';
  }
}

/**
 * Upload multiple local images to Supabase Storage.
 * Returns array of public URLs (empty strings filtered out).
 */
export async function uploadProductImages(localUris: string[]): Promise<string[]> {
  if (!localUris || localUris.length === 0) return [];
  const results = await Promise.all(localUris.map(uri => uploadProductImage(uri)));
  return results.filter(url => url !== '');
}

// ============================================
// Product APIs (Direct Supabase)
// ============================================

/**
 * Get all products for the current business
 */
export async function getProducts(): Promise<{ success: boolean; products?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-products', 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch products' };
    return { success: true, products: result.data?.products || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch products' };
  }
}

/**
 * Get inventory logs for a product from inventory_logs table
 * Includes location information for each transaction
 */
export async function getProductInventoryLogs(productId: string): Promise<{ success: boolean; logs?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-products?action=inventory_logs&product_id=' + productId, 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch inventory logs' };
    return { success: true, logs: result.data?.logs || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch inventory logs' };
  }
}

export async function getProductLocationStock(productId: string): Promise<{ success: boolean; locationStock?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-products?action=location_stock&product_id=' + productId, 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch location stock' };
    return { success: true, locationStock: result.data?.stock || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch location stock' };
  }
}

export async function getProductStockAcrossLocations(productId: string): Promise<{ success: boolean; data?: Array<{ locationId: string; locationName: string; locationType: string; currentStock: number; lastUpdated: string }>; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('location_stock')
      .select('id, location_id, current_stock, last_updated, locations(id, address_name, location_type)')
      .eq('product_id', productId);
    if (error) return { success: false, error: error.message };
    const mapped = (data || []).map((row: any) => ({
      locationId: row.location_id,
      locationName: row.locations?.address_name || 'Unknown',
      locationType: row.locations?.location_type || 'unknown',
      currentStock: row.current_stock || 0,
      lastUpdated: row.last_updated || '',
    }));
    return { success: true, data: mapped };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch stock across locations' };
  }
}

export async function getProductInventoryLogsByLocation(
  productId: string, 
  locationId?: string
): Promise<{ success: boolean; logs?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction(
      'manage-products?action=inventory_logs&product_id=' + productId + (locationId ? '&location_id=' + locationId : ''),
      'GET', undefined, true
    );
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch inventory logs' };
    return { success: true, logs: result.data?.logs || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch inventory logs' };
  }
}

/**
 * Get low stock products (where current_stock <= min_stock_level)
 */
export async function getLowStockProducts(): Promise<{ success: boolean; products?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-products?action=low_stock', 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch low stock products' };
    return { success: true, products: result.data?.products || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch low stock products' };
  }
}

/**
 * Assign a unique Manager-generated barcode for a product.
 * Only use when the product has no manufacturer or existing Manager barcode.
 * Returns a 13-character alphanumeric (A-Z, 0-9) barcode that is globally unique.
 */
export async function assignBarcode(params?: {
  locationId?: string | null;
}): Promise<{ success: boolean; barcode?: string; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data: barcode, error } = await supabase.rpc('reserve_assigned_barcode', {
      p_business_id: ctx.businessId,
      p_location_id: params?.locationId || null,
    });

    if (error) return { success: false, error: error.message };
    if (!barcode || typeof barcode !== 'string') return { success: false, error: 'Failed to generate barcode' };
    return { success: true, barcode };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to assign barcode' };
  }
}

/**
 * Fetch product categories for the current business
 */
export async function getProductCategories(): Promise<{ success: boolean; categories?: string[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-products?action=categories', 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error };
    return { success: true, categories: result.data?.categories || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch categories' };
  }
}

/**
 * Add a new product category for the current business
 */
export async function addProductCategory(name: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-products', 'POST', { action: 'add_category', name }, true);
    if (!result.success) return { success: false, error: result.error };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add category' };
  }
}

/**
 * Release a reserved barcode that was not used for any product
 */
export async function releaseBarcode(barcode: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-products', 'POST', { action: 'release_barcode', barcode }, true);
    if (!result.success) return { success: false, error: result.error };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to release barcode' };
  }
}

/**
 * Create a new product
 */
export async function createProduct(params: {
  name: string;
  category?: string;
  customCategory?: string;
  hsnCode?: string;
  barcode?: string;
  productImage?: string;
  productImages?: string[];
  showAdvancedOptions?: boolean;
  batchNumber?: string;
  expiryDate?: string;
  useCompoundUnit?: boolean;
  unitType?: string;
  primaryUnit: string;
  secondaryUnit?: string;
  tertiaryUnit?: string;
  conversionRatio?: string;
  tertiaryConversionRatio?: string;
  priceUnit?: string;
  stockUom?: string;
  taxRate?: number;
  taxInclusive?: boolean;
  cessType?: string;
  cessRate?: number;
  cessAmount?: number;
  cessUnit?: string;
  openingStock?: number;
  minStockLevel?: number;
  maxStockLevel?: number;
  stockUnit?: string;
  perUnitPrice?: number;
  purchasePrice?: number;
  salesPrice?: number;
  mrpPrice?: number;
  preferredSupplierId?: string;
  storageLocationId?: string;
  storageLocationName?: string;
  quantityDecimals?: number;
  brand?: string;
  description?: string;
}): Promise<{ success: boolean; product?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-products', 'POST', {
      name: params.name,
      category: params.category || null,
      custom_category: params.customCategory || null,
      hsn_code: params.hsnCode || null,
      barcode: params.barcode || null,
      product_image: (params.productImage && params.productImage.trim() !== '') ? params.productImage : null,
      product_images: params.productImages && params.productImages.length > 0 ? params.productImages : null,
      show_advanced_options: params.showAdvancedOptions || false,
      batch_number: params.batchNumber || null,
      expiry_date: params.expiryDate || null,
      use_compound_unit: params.useCompoundUnit || false,
      unit_type: params.unitType || null,
      primary_unit: params.primaryUnit || 'Piece',
      secondary_unit: params.secondaryUnit || null,
      tertiary_unit: params.tertiaryUnit || null,
      conversion_ratio: params.conversionRatio || null,
      tertiary_conversion_ratio: params.tertiaryConversionRatio || null,
      price_unit: params.priceUnit || 'primary',
      stock_uom: params.stockUom || 'primary',
      tax_rate: params.taxRate || 0,
      tax_inclusive: params.taxInclusive || false,
      cess_type: params.cessType || 'none',
      cess_rate: params.cessRate || 0,
      cess_amount: params.cessAmount || 0,
      cess_unit: params.cessUnit || null,
      opening_stock: params.openingStock || 0,
      min_stock_level: params.minStockLevel || 0,
      max_stock_level: params.maxStockLevel || 0,
      stock_unit: params.stockUnit || 'primary',
      per_unit_price: params.perUnitPrice || 0,
      purchase_price: params.purchasePrice || 0,
      sales_price: params.salesPrice || 0,
      mrp_price: params.mrpPrice || 0,
      preferred_supplier_id: params.preferredSupplierId || null,
      storage_location_id: params.storageLocationId || null,
      storage_location_name: params.storageLocationName || null,
      quantity_decimals: params.quantityDecimals ?? 0,
      brand: params.brand || null,
      description: params.description || null,
    }, true);

    if (!result.success) return { success: false, error: result.error || 'Failed to create product' };
    return { success: true, product: result.data?.product };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create product' };
  }
}

/**
 * Update a product
 */
export async function updateProduct(
  productId: string,
  params: {
    name?: string;
    category?: string;
    customCategory?: string;
    hsnCode?: string;
    barcode?: string;
    productImage?: string;
    productImages?: string[];
    showAdvancedOptions?: boolean;
    batchNumber?: string;
    expiryDate?: string;
    useCompoundUnit?: boolean;
    unitType?: string;
    primaryUnit?: string;
    secondaryUnit?: string;
    tertiaryUnit?: string;
    conversionRatio?: string;
    tertiaryConversionRatio?: string;
    priceUnit?: string;
    stockUom?: string;
    taxRate?: number;
    taxInclusive?: boolean;
    cessType?: string;
    cessRate?: number;
    cessAmount?: number;
    cessUnit?: string;
    openingStock?: number;
    currentStock?: number;
    minStockLevel?: number;
    maxStockLevel?: number;
    stockUnit?: string;
    perUnitPrice?: number;
    purchasePrice?: number;
    salesPrice?: number;
    mrpPrice?: number;
    preferredSupplierId?: string;
    storageLocationId?: string;
    storageLocationName?: string;
    quantityDecimals?: number;
    brand?: string;
    description?: string;
  }
): Promise<{ success: boolean; product?: any; error?: string }> {
  try {
    const body: any = { id: productId };

    if (params.name !== undefined) body.name = params.name;
    if (params.category !== undefined) body.category = params.category || null;
    if (params.customCategory !== undefined) body.custom_category = params.customCategory || null;
    if (params.hsnCode !== undefined) body.hsn_code = params.hsnCode || null;
    if (params.barcode !== undefined) body.barcode = params.barcode || null;
    if (params.productImage !== undefined) body.product_image = (params.productImage && params.productImage.trim() !== '') ? params.productImage : null;
    if (params.productImages !== undefined) body.product_images = params.productImages && params.productImages.length > 0 ? params.productImages : null;
    if (params.showAdvancedOptions !== undefined) body.show_advanced_options = params.showAdvancedOptions;
    if (params.batchNumber !== undefined) body.batch_number = params.batchNumber || null;
    if (params.expiryDate !== undefined) body.expiry_date = params.expiryDate || null;
    if (params.useCompoundUnit !== undefined) body.use_compound_unit = params.useCompoundUnit;
    if (params.unitType !== undefined) body.unit_type = params.unitType || null;
    if (params.primaryUnit !== undefined) body.primary_unit = params.primaryUnit;
    if (params.secondaryUnit !== undefined) body.secondary_unit = params.secondaryUnit || null;
    if (params.tertiaryUnit !== undefined) body.tertiary_unit = params.tertiaryUnit || null;
    if (params.conversionRatio !== undefined) body.conversion_ratio = params.conversionRatio || null;
    if (params.tertiaryConversionRatio !== undefined) body.tertiary_conversion_ratio = params.tertiaryConversionRatio || null;
    if (params.priceUnit !== undefined) body.price_unit = params.priceUnit;
    if (params.stockUom !== undefined) body.stock_uom = params.stockUom;
    if (params.taxRate !== undefined) body.tax_rate = params.taxRate;
    if (params.taxInclusive !== undefined) body.tax_inclusive = params.taxInclusive;
    if (params.cessType !== undefined) body.cess_type = params.cessType;
    if (params.cessRate !== undefined) body.cess_rate = params.cessRate;
    if (params.cessAmount !== undefined) body.cess_amount = params.cessAmount;
    if (params.cessUnit !== undefined) body.cess_unit = params.cessUnit || null;
    if (params.openingStock !== undefined) body.opening_stock = params.openingStock;
    if (params.currentStock !== undefined) body.current_stock = params.currentStock;
    if (params.minStockLevel !== undefined) body.min_stock_level = params.minStockLevel;
    if (params.maxStockLevel !== undefined) body.max_stock_level = params.maxStockLevel;
    if (params.stockUnit !== undefined) body.stock_unit = params.stockUnit;
    if (params.perUnitPrice !== undefined) body.per_unit_price = params.perUnitPrice;
    if (params.purchasePrice !== undefined) body.purchase_price = params.purchasePrice;
    if (params.salesPrice !== undefined) body.sales_price = params.salesPrice;
    if (params.mrpPrice !== undefined) body.mrp_price = params.mrpPrice;
    if (params.preferredSupplierId !== undefined) body.preferred_supplier_id = params.preferredSupplierId || null;
    if (params.storageLocationId !== undefined) body.storage_location_id = params.storageLocationId || null;
    if (params.storageLocationName !== undefined) body.storage_location_name = params.storageLocationName || null;
    if (params.quantityDecimals !== undefined) body.quantity_decimals = params.quantityDecimals;
    if (params.brand !== undefined) body.brand = params.brand || null;
    if (params.description !== undefined) body.description = params.description || null;

    const result = await callEdgeFunction('manage-products', 'PUT', body, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to update product' };
    return { success: true, product: result.data?.product };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update product' };
  }
}

export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-products', 'DELETE', { id: productId }, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to delete product' };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete product' };
  }
}

// ============================================
// Customer APIs (Direct Supabase)
// ============================================

export async function getCustomers(): Promise<{ success: boolean; customers?: any[]; error?: string }> {
  return getCachedOrFetch('customers', async () => {
    try {
      const result = await callEdgeFunction('manage-customers', 'GET', undefined, true);
      if (!result.success) return { success: false, error: result.error || 'Failed to fetch customers' };
      return { success: true, customers: result.data?.customers || [] };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch customers' };
    }
  });
}

export async function createCustomer(params: {
  name: string;
  businessName?: string;
  customerType: 'business' | 'individual';
  contactPerson?: string;
  mobile: string;
  email?: string;
  address?: string;
  gstin?: string;
  avatar?: string;
  paymentTerms?: string;
  creditLimit?: number;
  categories?: string[];
}): Promise<{ success: boolean; customer?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-customers', 'POST', {
      name: params.name,
      business_name: params.businessName || null,
      customer_type: params.customerType,
      contact_person: params.contactPerson || params.name,
      mobile: params.mobile,
      email: params.email || null,
      address: params.address || null,
      gstin: params.gstin || null,
      avatar: params.avatar || '👤',
      payment_terms: params.paymentTerms || null,
      credit_limit: params.creditLimit || 0,
      categories: params.categories || [],
    }, true);

    if (!result.success) return { success: false, error: result.error || 'Failed to create customer' };
    emitTransactionChange('customer');
    invalidateApiCache('customers');
    return { success: true, customer: result.data?.customer };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create customer' };
  }
}

export async function updateCustomer(
  customerId: string,
  params: Partial<{
    name: string;
    businessName: string;
    customerType: 'business' | 'individual';
    contactPerson: string;
    mobile: string;
    email: string;
    address: string;
    gstin: string;
    avatar: string;
    status: 'active' | 'inactive' | 'suspended';
    paymentTerms: string;
    creditLimit: number;
    categories: string[];
  }>
): Promise<{ success: boolean; customer?: any; error?: string }> {
  try {
    const body: any = { id: customerId };
    if (params.name !== undefined) body.name = params.name;
    if (params.businessName !== undefined) body.business_name = params.businessName || null;
    if (params.customerType !== undefined) body.customer_type = params.customerType;
    if (params.contactPerson !== undefined) body.contact_person = params.contactPerson;
    if (params.mobile !== undefined) body.mobile = params.mobile;
    if (params.email !== undefined) body.email = params.email || null;
    if (params.address !== undefined) body.address = params.address || null;
    if (params.gstin !== undefined) body.gstin = params.gstin || null;
    if (params.avatar !== undefined) body.avatar = params.avatar;
    if (params.status !== undefined) body.status = params.status;
    if (params.paymentTerms !== undefined) body.payment_terms = params.paymentTerms;
    if (params.creditLimit !== undefined) body.credit_limit = params.creditLimit;
    if (params.categories !== undefined) body.categories = params.categories;

    const result = await callEdgeFunction('manage-customers', 'PUT', body, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to update customer' };
    invalidateApiCache('customers');
    return { success: true, customer: result.data?.customer };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update customer' };
  }
}

export async function deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-customers', 'DELETE', { id: customerId }, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to delete customer' };
    invalidateApiCache('customers');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete customer' };
  }
}

// ============================================
// Sales Invoice APIs (Direct Supabase)
// ============================================

export async function getInvoices(): Promise<{ success: boolean; invoices?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-invoices', 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch invoices' };
    return { success: true, invoices: result.data?.invoices || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch invoices' };
  }
}

export async function getInvoiceWithItems(invoiceId: string): Promise<{ success: boolean; invoice?: any; items?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-invoices?id=' + invoiceId, 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch invoice' };
    return { success: true, invoice: result.data?.invoice, items: result.data?.items || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch invoice' };
  }
}

export async function createInvoice(params: {
  invoiceNumber: string;
  customerId?: string;
  customerName: string;
  customerType?: string;
  items: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate?: number;
    taxAmount?: number;
    cessType?: string;
    cessRate?: number;
    cessAmount?: number;
    hsnCode?: string;
    batchNumber?: string;
    primaryUnit?: string;
    discountType?: string;
    discountValue?: number;
  }>;
  subtotal: number;
  taxAmount: number;
  cessAmount?: number;
  roundOffAmount?: number;
  totalAmount: number;
  paidAmount: number;
  balanceAmount: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'partial' | 'unpaid';
  invoiceDate?: string;
  dueDate?: string;
  notes?: string;
  staffId?: string;
  staffName?: string;
  locationId?: string;
  bankAccountId?: string;
  invoiceExtras?: {
    deliveryNote?: string;
    paymentTermsMode?: string;
    referenceNo?: string;
    referenceDate?: string;
    buyerOrderNumber?: string;
    buyerOrderDate?: string;
    dispatchDocNo?: string;
    deliveryNoteDate?: string;
    dispatchedVia?: string;
    destination?: string;
    termsOfDelivery?: string;
    customFields?: Array<{ label: string; value: string }>;
  };
}): Promise<{ success: boolean; invoice?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-invoices', 'POST', {
      invoice_number: params.invoiceNumber || null,
      items: params.items.map(item => ({
        product_id: item.productId || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate || 0,
        discount_type: item.discountType || null,
        discount_value: item.discountValue || 0,
        product_name: item.productName,
        hsn_code: item.hsnCode || null,
        primary_unit: item.primaryUnit || 'Piece',
        cess_type: item.cessType || 'none',
        cess_rate: item.cessRate || 0,
        cess_amount: item.cessAmount || 0,
        batch_number: item.batchNumber || null,
      })),
      customer_id: params.customerId || null,
      customer_name: params.customerName,
      customer_type: params.customerType || 'individual',
      invoice_date: params.invoiceDate || new Date().toISOString(),
      due_date: params.dueDate || null,
      notes: params.notes || null,
      staff_id: params.staffId || null,
      staff_name: params.staffName || null,
      location_id: params.locationId || null,
      subtotal: params.subtotal,
      tax_amount: params.taxAmount,
      cess_amount: params.cessAmount || 0,
      total_amount: params.totalAmount,
      paid_amount: params.paidAmount,
      balance_amount: params.balanceAmount,
      payment_method: params.paymentMethod,
      payment_status: params.paymentStatus,
      round_off_amount: params.roundOffAmount || 0,
      bank_account_id: params.bankAccountId || null,
      invoice_extras: params.invoiceExtras || null,
    }, true);

    if (!result.success) return { success: false, error: result.error || 'Failed to create invoice' };

    getClearCache()?.();
    emitTransactionChange('invoice');
    return { success: true, invoice: result.data?.invoice };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create invoice' };
  }
}

export async function updateInvoicePayment(
  invoiceId: string,
  params: { paidAmount: number; paymentMethod?: string; bankAccountId?: string; }
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-invoices', 'POST', {
      action: 'update_payment',
      invoice_id: invoiceId,
      paid_amount: params.paidAmount,
      payment_method: params.paymentMethod,
      bank_account_id: params.bankAccountId || null,
    }, true);

    if (!result.success) return { success: false, error: result.error || 'Failed to update invoice payment' };

    getClearCache()?.();
    emitTransactionChange('invoice_payment');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update invoice payment' };
  }
}

export async function cancelInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase
      .from('invoices')
      .update({ status: 'cancelled', is_cancelled: true, updated_at: new Date().toISOString() })
      .eq('id', invoiceId);
    if (error) return { success: false, error: error.message };
    getClearCache()?.();
    invalidateApiCache('invoices');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to cancel invoice' };
  }
}

export async function deletePurchaseOrder(orderId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { error: itemsErr } = await supabase.from('purchase_order_items').delete().eq('purchase_order_id', orderId);
    if (itemsErr) return { success: false, error: itemsErr.message };
    const { error } = await supabase.from('purchase_orders').delete().eq('id', orderId);
    if (error) return { success: false, error: error.message };
    getClearCache()?.();
    invalidateApiCache('purchaseOrders');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete purchase order' };
  }
}

export async function cancelReturn(returnId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase
      .from('returns')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', returnId);
    if (error) return { success: false, error: error.message };
    getClearCache()?.();
    invalidateApiCache('returns');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to cancel return' };
  }
}

export async function cancelPurchaseInvoice(invoiceId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase
      .from('purchase_invoices')
      .update({ status: 'cancelled', updated_at: new Date().toISOString() })
      .eq('id', invoiceId);
    if (error) return { success: false, error: error.message };
    getClearCache()?.();
    invalidateApiCache('purchaseInvoices');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to cancel purchase invoice' };
  }
}

export async function updateInvoiceItems(
  invoiceId: string,
  items: Array<{ id?: string; name: string; quantity: number; rate: number; taxRate: number; discount?: number; unit?: string; hsnCode?: string }>,
  totals: { subtotal: number; taxAmount: number; totalAmount: number; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('invoice_items').delete().eq('invoice_id', invoiceId);
    const newItems = items.map(item => ({
      invoice_id: invoiceId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.rate,
      tax_rate: item.taxRate,
      discount: item.discount || 0,
      unit: item.unit || 'Piece',
      hsn_code: item.hsnCode || null,
      total: item.rate * item.quantity * (1 - (item.discount || 0) / 100),
      tax_amount: item.rate * item.quantity * (1 - (item.discount || 0) / 100) * (item.taxRate / 100),
    }));
    if (newItems.length > 0) {
      const { error: itemsErr } = await supabase.from('invoice_items').insert(newItems);
      if (itemsErr) return { success: false, error: itemsErr.message };
    }
    const { error } = await supabase.from('invoices').update({
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      total_amount: totals.totalAmount,
      total: totals.totalAmount,
      notes: totals.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', invoiceId);
    if (error) return { success: false, error: error.message };
    getClearCache()?.();
    invalidateApiCache('invoices');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update invoice' };
  }
}

export async function updateReturnItems(
  returnId: string,
  items: Array<{ name: string; quantity: number; rate: number; taxRate: number; reason?: string }>,
  totals: { totalAmount: number; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('return_items').delete().eq('return_id', returnId);
    const newItems = items.map(item => ({
      return_id: returnId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.rate,
      tax_rate: item.taxRate,
      reason: item.reason || null,
      total: item.rate * item.quantity,
      tax_amount: item.rate * item.quantity * (item.taxRate / 100),
    }));
    if (newItems.length > 0) {
      const { error: itemsErr } = await supabase.from('return_items').insert(newItems);
      if (itemsErr) return { success: false, error: itemsErr.message };
    }
    const { error } = await supabase.from('returns').update({
      refund_amount: totals.totalAmount,
      total_amount: totals.totalAmount,
      notes: totals.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', returnId);
    if (error) return { success: false, error: error.message };
    getClearCache()?.();
    invalidateApiCache('returns');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update return' };
  }
}

export async function updatePurchaseInvoiceItems(
  invoiceId: string,
  items: Array<{ name: string; quantity: number; rate: number; taxRate: number; unit?: string; hsnCode?: string }>,
  totals: { subtotal: number; taxAmount: number; totalAmount: number; notes?: string }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    await supabase.from('purchase_invoice_items').delete().eq('purchase_invoice_id', invoiceId);
    const newItems = items.map(item => ({
      purchase_invoice_id: invoiceId,
      product_name: item.name,
      quantity: item.quantity,
      unit_price: item.rate,
      tax_rate: item.taxRate,
      unit: item.unit || 'Piece',
      hsn_code: item.hsnCode || null,
      total: item.rate * item.quantity,
      tax_amount: item.rate * item.quantity * (item.taxRate / 100),
    }));
    if (newItems.length > 0) {
      const { error: itemsErr } = await supabase.from('purchase_invoice_items').insert(newItems);
      if (itemsErr) return { success: false, error: itemsErr.message };
    }
    const { error } = await supabase.from('purchase_invoices').update({
      subtotal: totals.subtotal,
      tax_amount: totals.taxAmount,
      total_amount: totals.totalAmount,
      notes: totals.notes || null,
      updated_at: new Date().toISOString(),
    }).eq('id', invoiceId);
    if (error) return { success: false, error: error.message };
    getClearCache()?.();
    invalidateApiCache('purchaseInvoices');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update purchase invoice' };
  }
}

// ============================================
// Returns APIs (Direct Supabase)
// ============================================

export async function getReturns(): Promise<{ success: boolean; returns?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-returns', 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch returns' };
    return { success: true, returns: result.data?.returns || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch returns' };
  }
}

export async function getReturnWithItems(returnId: string): Promise<{ success: boolean; returnData?: any; items?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-returns?id=' + returnId, 'GET', undefined, true);
    if (result.success && result.data?.return) {
      return { success: true, returnData: result.data.return, items: result.data.return?.items || result.data.items || [] };
    }

    const { data: returnRow } = await supabase
      .from('returns')
      .select('*')
      .eq('id', returnId)
      .maybeSingle();

    if (!returnRow) return { success: false, error: 'Return not found' };

    let items: any[] = [];
    if (returnRow.items && Array.isArray(returnRow.items) && returnRow.items.length > 0) {
      items = returnRow.items;
    } else {
      const { data: returnItemRows } = await supabase
        .from('return_items')
        .select('*')
        .eq('return_id', returnId);
      items = returnItemRows || [];
    }

    return { success: true, returnData: returnRow, items };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function createReturn(params: {
  returnNumber: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
  customerId?: string | null;
  customerName: string;
  customerType?: string;
  items: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate?: number;
    taxAmount?: number;
    reason?: string;
  }>;
  totalAmount: number;
  refundAmount: number;
  refundStatus?: 'refunded' | 'partially_refunded' | 'pending';
  refundMethod?: string;
  reason?: string;
  staffId?: string;
  staffName?: string;
  locationId?: string;
  bankAccountId?: string;
  returnType?: 'customer' | 'supplier';
  supplierId?: string;
  supplierName?: string;
}): Promise<{ success: boolean; returnData?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-returns', 'POST', {
      items: params.items.map(item => ({
        product_id: item.productId || null,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        tax_rate: item.taxRate || 0,
        product_name: item.productName,
        reason: item.reason || null,
      })),
      original_invoice_id: params.originalInvoiceId || null,
      original_invoice_number: params.originalInvoiceNumber || null,
      customer_id: params.customerId || null,
      customer_name: params.customerName,
      return_type: params.returnType || 'customer',
      supplier_id: params.supplierId || null,
      supplier_name: params.supplierName || null,
      customer_type: params.customerType || 'individual',
      refund_method: params.refundMethod || null,
      reason: params.reason || null,
      staff_id: params.staffId || null,
      staff_name: params.staffName || null,
      location_id: params.locationId || null,
      return_number: params.returnNumber,
      bank_account_id: params.bankAccountId || null,
    }, true);

    if (!result.success) return { success: false, error: result.error || 'Failed to create return' };

    getClearCache()?.();
    emitTransactionChange('return');
    return { success: true, returnData: result.data?.return };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create return' };
  }
}

// ============================================
// Purchase Order APIs (Direct Supabase)
// ============================================

export async function getPurchaseOrders(): Promise<{ success: boolean; orders?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-purchase-orders', 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch purchase orders' };
    return { success: true, orders: result.data?.purchase_orders || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch purchase orders' };
  }
}

export async function createPurchaseOrder(params: {
  poNumber: string;
  supplierId?: string;
  supplierName: string;
  items: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate?: number;
    taxAmount?: number;
    hsnCode?: string;
    primaryUnit?: string;
  }>;
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  expectedDelivery?: string;
  notes?: string;
  staffId?: string;
  staffName?: string;
  locationId?: string;
}): Promise<{ success: boolean; order?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-purchase-orders', 'POST', {
      po_number: params.poNumber,
      supplier_id: params.supplierId || null,
      supplier_name: params.supplierName,
      items: params.items.map(item => ({
        product_id: item.productId || null,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        tax_rate: item.taxRate || 0,
        tax_amount: item.taxAmount || 0,
        hsn_code: item.hsnCode || null,
        primary_unit: item.primaryUnit || 'Piece',
      })),
      subtotal: params.subtotal,
      tax_amount: params.taxAmount,
      total_amount: params.totalAmount,
      expected_delivery: params.expectedDelivery || null,
      notes: params.notes || null,
      staff_id: params.staffId || null,
      staff_name: params.staffName || null,
      location_id: params.locationId || null,
    }, true);

    if (!result.success) return { success: false, error: result.error || 'Failed to create purchase order' };

    getClearCache()?.();
    emitTransactionChange('purchase_order');
    return { success: true, order: result.data?.purchase_order };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create purchase order' };
  }
}

export async function updatePurchaseOrderStatus(
  orderId: string,
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-purchase-orders', 'POST', {
      action: 'update_status',
      order_id: orderId,
      status,
    }, true);

    if (!result.success) return { success: false, error: result.error || 'Failed to update purchase order' };

    getClearCache()?.();
    emitTransactionChange('purchase_order_status');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update purchase order' };
  }
}

export async function acknowledgePurchaseOrder(
  orderId: string,
  acknowledgedBy?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase
      .from('purchase_orders')
      .update({
        status: 'confirmed',
        updated_at: new Date().toISOString(),
      })
      .eq('id', orderId);

    if (error) return { success: false, error: error.message };

    getClearCache()?.();
    emitTransactionChange('purchase_order_status');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to acknowledge PO' };
  }
}

// ============================================
// Purchase Invoice APIs (Direct Supabase)
// ============================================

const _purchaseInvoiceItemsCache: Record<string, any[]> = {};

export function cachePurchaseInvoiceItems(invoiceId: string, items: any[]) {
  if (invoiceId && items?.length) _purchaseInvoiceItemsCache[invoiceId] = items;
}

export function getCachedPurchaseInvoiceItems(invoiceId: string): any[] | null {
  return _purchaseInvoiceItemsCache[invoiceId] || null;
}

export async function getPurchaseInvoices(): Promise<{ success: boolean; invoices?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-purchase-invoices', 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch purchase invoices' };
    const invoices = (result.data?.purchase_invoices || []).map((inv: any) => {
      if (!inv.items || (Array.isArray(inv.items) && inv.items.length === 0)) {
        const cached = _purchaseInvoiceItemsCache[inv.id];
        if (cached) return { ...inv, items: cached };
      }
      if (inv.items?.length) _purchaseInvoiceItemsCache[inv.id] = inv.items;
      return inv;
    });
    return { success: true, invoices };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch purchase invoices' };
  }
}

export async function createPurchaseInvoice(params: {
  invoiceNumber: string;
  purchaseOrderId?: string;
  poNumber?: string;
  supplierId?: string;
  supplierName: string;
  items: Array<{
    productId?: string;
    tempProductId?: string;
    productName: string;
    quantity: number;
    unitPrice: number;
    totalPrice: number;
    taxRate?: number;
    taxAmount?: number;
    cessType?: string;
    cessRate?: number;
    cessAmount?: number;
    hsnCode?: string;
    primaryUnit?: string;
  }>;
  pendingProducts?: Array<{ tempId: string; productData: any }>;
  subtotal: number;
  taxAmount: number;
  cessAmount?: number;
  totalAmount: number;
  discountAmount?: number;
  roundOffAmount?: number;
  paidAmount?: number;
  paymentMethod?: string;
  paymentStatus?: 'paid' | 'partial' | 'pending' | 'overdue';
  deliveryStatus?: 'pending' | 'received' | 'partial' | 'cancelled';
  expectedDelivery?: string;
  notes?: string;
  staffId?: string;
  staffName?: string;
  locationId?: string;
  invoiceDate?: string;
  bankAccountId?: string;
  additionalFields?: Record<string, string>;
}): Promise<{ success: boolean; invoice?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-purchase-invoices', 'POST', {
      invoice_number: params.invoiceNumber,
      purchase_order_id: params.purchaseOrderId || null,
      po_number: params.poNumber || null,
      supplier_id: params.supplierId || null,
      supplier_name: params.supplierName,
      items: params.items.map(item => ({
        product_id: item.productId || null,
        temp_product_id: item.tempProductId || null,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        tax_rate: item.taxRate || 0,
        tax_amount: item.taxAmount || 0,
        cess_type: item.cessType || 'none',
        cess_rate: item.cessRate || 0,
        cess_amount: item.cessAmount || 0,
        hsn_code: item.hsnCode || null,
        primary_unit: item.primaryUnit || 'Piece',
      })),
      pending_products: (params.pendingProducts || []).map(pp => ({
        temp_id: pp.tempId,
        product_data: pp.productData,
      })),
      subtotal: params.subtotal,
      tax_amount: params.taxAmount,
      cess_amount: params.cessAmount || 0,
      total_amount: params.totalAmount,
      discount_amount: params.discountAmount || 0,
      round_off_amount: params.roundOffAmount || 0,
      paid_amount: params.paidAmount || 0,
      payment_method: params.paymentMethod || 'cash',
      payment_status: params.paymentStatus || ((params.paidAmount || 0) >= params.totalAmount ? 'paid' : 'pending'),
      delivery_status: params.deliveryStatus || 'pending',
      expected_delivery: params.expectedDelivery || null,
      notes: params.notes || null,
      staff_id: params.staffId || null,
      staff_name: params.staffName || null,
      location_id: params.locationId || null,
      invoice_date: params.invoiceDate || null,
      bank_account_id: params.bankAccountId || null,
      additional_fields: params.additionalFields || null,
    }, true);

    if (!result.success) return { success: false, error: result.error || 'Failed to create purchase invoice' };

    const createdInvoice = result.data?.purchase_invoice;
    if (createdInvoice?.id) {
      const itemsToCache = params.items.map(item => ({
        product_id: item.productId || null, product_name: item.productName,
        quantity: item.quantity, unit_price: item.unitPrice, total_price: item.totalPrice,
        tax_rate: item.taxRate || 0, tax_amount: item.taxAmount || 0,
        cess_type: item.cessType || 'none', cess_rate: item.cessRate || 0, cess_amount: item.cessAmount || 0,
        hsn_code: item.hsnCode || null, primary_unit: item.primaryUnit || 'Piece',
      }));
      cachePurchaseInvoiceItems(createdInvoice.id, itemsToCache);
      createdInvoice.items = itemsToCache;
    }

    getClearCache()?.();
    emitTransactionChange('purchase_invoice');
    return { success: true, invoice: createdInvoice };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create purchase invoice' };
  }
}

export async function updatePurchaseInvoicePayment(params: {
  invoiceId: string;
  paidAmount: number;
  paymentMethod: string;
  paymentStatus: 'paid' | 'partial' | 'pending' | 'overdue';
  bankAccountId?: string;
  chequeNumber?: string;
  transactionRef?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-purchase-invoices', 'PUT', {
      id: params.invoiceId,
      paid_amount: params.paidAmount,
      payment_method: params.paymentMethod,
      payment_status: params.paymentStatus,
      bank_account_id: params.bankAccountId || null,
      cheque_number: params.chequeNumber || null,
      transaction_ref: params.transactionRef || null,
    }, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to update invoice payment' };
    getClearCache()?.();
    emitTransactionChange('purchase_invoice');
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update invoice payment' };
  }
}

export async function getSupplierMetrics(supplierId: string): Promise<{ success: boolean; metrics?: any; error?: string }> {
  try {
    const { data: metrics } = await supabase.from('supplier_metrics').select('*').eq('supplier_id', supplierId).maybeSingle();
    return { success: true, metrics };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getCustomerMetrics(customerId: string): Promise<{ success: boolean; metrics?: any; error?: string }> {
  try {
    const { data: metrics } = await supabase.from('customer_metrics').select('*').eq('customer_id', customerId).maybeSingle();
    return { success: true, metrics };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllCustomerMetrics(): Promise<{ success: boolean; metrics?: any[]; error?: string }> {
  try {
    const { data: metrics } = await supabase.from('customer_metrics').select('*');
    return { success: true, metrics: metrics || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

export async function getAllSupplierMetrics(): Promise<{ success: boolean; metrics?: any[]; error?: string }> {
  try {
    const { data: metrics } = await supabase.from('supplier_metrics').select('*');
    return { success: true, metrics: metrics || [] };
  } catch (error: any) {
    return { success: false, error: error.message };
  }
}

// ============================================
// Notifications APIs (Direct Supabase)
// ============================================

export async function getNotifications(): Promise<{ success: boolean; notifications?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-notifications', 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch notifications' };
    return { success: true, notifications: result.data?.notifications || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch notifications' };
  }
}

export async function createNotification(params: {
  type: 'urgent' | 'warning' | 'info' | 'success';
  category: 'order' | 'stock' | 'payment' | 'staff' | 'system' | 'customer';
  title: string;
  message: string;
  priority?: 'low' | 'medium' | 'high' | 'critical';
  actionRequired?: boolean;
  relatedEntityType?: string;
  relatedEntityId?: string;
  relatedEntityName?: string;
  assignedToUserId?: string;
  assignedToName?: string;
}): Promise<{ success: boolean; notification?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-notifications', 'POST', {
      type: params.type,
      category: params.category,
      title: params.title,
      message: params.message,
      priority: params.priority || 'medium',
      action_required: params.actionRequired || false,
      related_entity_type: params.relatedEntityType || null,
      related_entity_id: params.relatedEntityId || null,
      related_entity_name: params.relatedEntityName || null,
      assigned_to_user_id: params.assignedToUserId || null,
      assigned_to_name: params.assignedToName || null,
    }, true);

    if (!result.success) return { success: false, error: result.error || 'Failed to create notification' };
    return { success: true, notification: result.data?.notification };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create notification' };
  }
}

// ============================================
// Marketing Campaign APIs (Direct Supabase)
// ============================================

export async function getCampaigns(): Promise<{ success: boolean; campaigns?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-campaigns', 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch campaigns' };
    return { success: true, campaigns: result.data?.campaigns || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch campaigns' };
  }
}

export async function createCampaign(params: {
  name: string;
  platform?: string;
  startDate?: string;
  endDate?: string;
  budget?: number;
  status?: 'pending' | 'active' | 'completed' | 'cancelled';
  targetAudience?: string[];
  objective?: string;
}): Promise<{ success: boolean; campaign?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-campaigns', 'POST', {
      name: params.name,
      platform: params.platform || null,
      start_date: params.startDate || null,
      end_date: params.endDate || null,
      budget: params.budget || 0,
      status: params.status || 'pending',
      target_audience: params.targetAudience || [],
      objective: params.objective || null,
    }, true);

    if (!result.success) return { success: false, error: result.error || 'Failed to create campaign' };
    return { success: true, campaign: result.data?.campaign };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create campaign' };
  }
}

// ============================================
// Receivables (Computed from Invoices)
// ============================================

export async function getReceivables(): Promise<{ success: boolean; receivables?: any[]; totalAmount?: number; error?: string }> {
  try {
    const result = await callEdgeFunction('get-financial-summary?type=receivables', 'GET', undefined, true);

    if (result.success) {
      const rawReceivables = result.data?.receivables || [];
      const receivables = rawReceivables.map((r: any) => ({
        id: r.customer_id || r.id || r.customer_name,
        customerId: r.customer_id || null,
        customerName: r.customer_name || r.customerName || '',
        customerType: r.customer_type || r.customerType || 'individual',
        totalReceivable: Number(r.totalReceivable ?? r.total_outstanding ?? r.total_receivable ?? r.balance_amount ?? r.total_balance ?? 0),
        invoiceCount: Number(r.invoice_count ?? r.invoiceCount ?? 0),
        invoiceIds: r.invoice_ids || [],
        oldestInvoiceDate: r.oldest_due_date || r.oldest_invoice_date || r.oldestInvoiceDate || null,
        status: r.status || 'current',
      }));

      if (receivables.length > 0) {
        const totalAmount = Number(result.data?.total_receivables ?? 0) || receivables.reduce((s: number, r: any) => s + (r.totalReceivable || 0), 0);
        return { success: true, receivables, totalAmount };
      }
    }

    const invoiceResult = await getInvoices();
    if (!invoiceResult.success || !invoiceResult.invoices) {
      return { success: true, receivables: [], totalAmount: 0 };
    }

    const unpaidInvoices = invoiceResult.invoices.filter((inv: any) => {
      const balance = Number(inv.balance_amount) || 0;
      const status = (inv.payment_status || '').toLowerCase();
      return balance > 0 || status === 'pending' || status === 'partially_paid' || status === 'partial';
    });

    const customerMap = new Map<string, { id: string; customerId: string; customerName: string; customerType: string; totalReceivable: number; invoiceCount: number; oldestInvoiceDate: string | null; status: string }>();

    for (const inv of unpaidInvoices) {
      const custKey = inv.customer_id || inv.customer_name || 'unknown';
      const balance = Number(inv.balance_amount) || Number(inv.total_amount) || 0;
      const invDate = inv.invoice_date || inv.created_at || '';

      if (customerMap.has(custKey)) {
        const existing = customerMap.get(custKey)!;
        existing.totalReceivable += balance;
        existing.invoiceCount += 1;
        if (invDate && (!existing.oldestInvoiceDate || invDate < existing.oldestInvoiceDate)) {
          existing.oldestInvoiceDate = invDate;
        }
      } else {
        customerMap.set(custKey, {
          id: custKey,
          customerId: inv.customer_id || custKey,
          customerName: inv.customer_name || 'Unknown Customer',
          customerType: inv.customer_type || 'individual',
          totalReceivable: balance,
          invoiceCount: 1,
          oldestInvoiceDate: invDate || null,
          status: 'current',
        });
      }
    }

    const receivables = Array.from(customerMap.values());
    const totalAmount = receivables.reduce((s, r) => s + r.totalReceivable, 0);
    return { success: true, receivables, totalAmount };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch receivables' };
  }
}

// ============================================
// Payables (Computed from Purchase Invoices)
// ============================================

export async function getPayables(): Promise<{ success: boolean; payables?: any[]; totalAmount?: number; error?: string }> {
  try {
    const result = await callEdgeFunction('get-financial-summary?type=payables', 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Failed to fetch payables' };

    const rawPayables = result.data?.payables || [];
    const payables = rawPayables.map((p: any) => ({
      id: p.supplier_id || p.id || p.supplier_name,
      supplierId: p.supplier_id || null,
      supplierName: p.supplier_name,
      totalPayable: Number(p.totalPayable ?? p.total_outstanding ?? p.total_payable ?? 0),
      billCount: p.invoice_count || p.bill_count || p.billCount || 0,
      invoiceIds: p.invoice_ids || [],
      oldestBillDate: p.oldest_bill_date || p.oldestBillDate || null,
      status: p.status || 'current',
    }));

    const totalAmount = Number(result.data?.total_payables ?? 0) || payables.reduce((s: number, p: any) => s + (p.totalPayable || 0), 0);
    return { success: true, payables, totalAmount };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch payables' };
  }
}

// ============================================
// Write-Offs
// ============================================

export async function getWriteOffs(period?: 'month'): Promise<{ success: boolean; writeOffs?: any[]; summary?: any; error?: string }> {
  return getCachedOrFetch(`writeoffs_${period || 'all'}`, async () => {
    try {
      const params = period ? `?period=${period}` : '';
      const result = await callEdgeFunction(`manage-write-offs${params}`, 'GET', undefined, true);
      if (result.success) {
        return {
          success: true,
          writeOffs: result.data?.write_offs || [],
          summary: result.data?.summary || { count: 0, totalValue: 0, totalQuantity: 0 },
        };
      }
      return { success: false, error: result.error || 'Failed to fetch write-offs' };
    } catch (error: any) {
      return { success: false, error: error.message || 'Failed to fetch write-offs' };
    }
  });
}

export async function createWriteOff(params: {
  reason: string;
  items: Array<{
    productId?: string;
    productName: string;
    quantity: number;
    unitPrice?: number;
    primaryUnit?: string;
    notes?: string;
    proofImage?: string;
    locationId?: string;
  }>;
  generalNotes?: string;
  staffId?: string;
  staffName?: string;
}): Promise<{ success: boolean; writeOff?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-write-offs', 'POST', {
      reason: params.reason,
      items: params.items.map(item => ({
        product_id: item.productId || null,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice || 0,
        primary_unit: item.primaryUnit || 'Piece',
        notes: item.notes || null,
        proof_image: item.proofImage || null,
        location_id: item.locationId || null,
      })),
      general_notes: params.generalNotes || null,
      staff_id: params.staffId || null,
      staff_name: params.staffName || null,
    }, true);

    if (!result.success) return { success: false, error: result.error || 'Failed to create write-off' };
    return { success: true, writeOff: result.data?.write_off };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create write-off' };
  }
}

// ============================================
// Invoice Number Generation
// ============================================

export async function getNextInvoiceNumber(): Promise<{ success: boolean; invoiceNumber?: string; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-invoices', 'POST', {
      action: 'get_next_number',
    }, true);

    if (!result.success) return { success: false, error: result.error || 'Failed to generate invoice number' };
    return { success: true, invoiceNumber: result.data?.invoiceNumber || result.data?.invoice_number };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to generate invoice number' };
  }
}

export async function peekNextInvoiceNumber(): Promise<{ success: boolean; invoiceNumber?: string; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-invoices', 'POST', {
      action: 'peek_next_number',
    }, true);
    if (result.success && (result.data?.invoiceNumber || result.data?.invoice_number)) {
      return { success: true, invoiceNumber: result.data?.invoiceNumber || result.data?.invoice_number };
    }
    return { success: false, error: result.error || 'Could not peek invoice number' };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to peek invoice number' };
  }
}

// ============================================
// Chat & Messaging APIs (Direct Supabase)
// ============================================

export async function discoverLinkedBusinesses(): Promise<{ success: boolean; businesses?: any[]; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase.rpc('discover_linked_businesses', { p_user_id: session.user.id });
    if (error) return { success: false, error: error.message };

    const businesses = (data || []).map((b: any) => ({
      id: b.id,
      legal_name: b.legal_name,
      owner_name: b.owner_name,
      phone: b.phone,
      business_type: b.business_type,
      linkedAs: b.linked_as,
      primary_address: b.primary_address,
      primary_city: b.primary_city,
      primary_state: b.primary_state,
      primary_pincode: b.primary_pincode,
    }));
    return { success: true, businesses };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to discover businesses' };
  }
}

export async function searchAllBusinesses(query: string): Promise<{ success: boolean; businesses?: any[]; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase.rpc('search_platform_businesses', { p_user_id: session.user.id, p_query: query });
    if (error) return { success: false, error: error.message };
    return { success: true, businesses: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to search businesses' };
  }
}

export async function addBusinessAsContact(params: {
  targetBusinessId: string;
  targetBusinessName: string;
  targetOwnerName: string;
  targetPhone: string;
  addAs: 'supplier' | 'customer';
  address?: string;
  city?: string;
  state?: string;
  pincode?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    if (params.addAs === 'supplier') {
      const result = await createSupplier({
        businessName: params.targetBusinessName,
        contactPerson: params.targetOwnerName || params.targetBusinessName,
        mobileNumber: params.targetPhone || '',
        addressLine1: params.address || 'N/A',
        city: params.city || 'N/A',
        pincode: params.pincode || '000000',
        state: params.state || 'N/A',
      });
      return { success: result.success, error: result.error };
    } else {
      const addressParts = [params.address, params.city, params.state, params.pincode].filter(Boolean);
      const fullAddress = addressParts.length > 0 ? addressParts.join(', ') : undefined;
      const result = await createCustomer({
        name: params.targetBusinessName,
        businessName: params.targetBusinessName,
        customerType: 'business',
        contactPerson: params.targetOwnerName || params.targetBusinessName,
        mobile: params.targetPhone || '',
        address: fullAddress,
      });
      return { success: result.success, error: result.error };
    }
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to add business' };
  }
}

export async function autoLinkSupplierToUser(supplierId: string): Promise<string | null> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: supplier } = await supabase
      .from('suppliers')
      .select('id, mobile_number, email, linked_user_id, gstin_pan')
      .eq('id', supplierId)
      .maybeSingle();

    if (!supplier) return null;
    if (supplier.linked_user_id) return supplier.linked_user_id;

    const phone = (supplier.mobile_number || '').replace(/^\+91/, '').replace(/\D/g, '');
    const normalizedPhone = phone.length >= 10 ? phone.slice(-10) : null;
    const gstin = (supplier.gstin_pan || '').trim().toUpperCase();
    const normalizedGstin = gstin.length >= 2 ? gstin : null;

    if (!normalizedPhone && !normalizedGstin) return null;

    const { data: match } = await supabase.rpc('find_business_owner_by_phone_or_gstin', {
      lookup_phone: normalizedPhone,
      lookup_gstin: normalizedGstin,
    });
    if (match && match.length > 0 && match[0].owner_user_id) {
      await supabase
        .from('suppliers')
        .update({ linked_user_id: match[0].owner_user_id })
        .eq('id', supplierId);
      return match[0].owner_user_id;
    }
    return null;
  } catch {
    return null;
  }
}

export async function autoLinkCustomerToUser(customerId: string): Promise<string | null> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: customer } = await supabase
      .from('customers')
      .select('id, mobile, email, customer_type, name, business_name, gstin')
      .eq('id', customerId)
      .maybeSingle();

    if (!customer) return null;

    const custPhone = (customer.mobile || '').replace(/^\+91/, '').replace(/\D/g, '');
    const normalizedPhone = custPhone.length >= 10 ? custPhone.slice(-10) : null;
    const gstin = (customer.gstin || '').trim().toUpperCase();
    const normalizedGstin = gstin.length >= 2 ? gstin : null;

    if (!normalizedPhone && !normalizedGstin) return null;

    const { data: match } = await supabase.rpc('find_business_owner_by_phone_or_gstin', {
      lookup_phone: normalizedPhone,
      lookup_gstin: normalizedGstin,
    });
    if (match && match.length > 0 && match[0].owner_user_id) {
      return match[0].owner_user_id;
    }
    return null;
  } catch {
    return null;
  }
}

export async function getOrCreateConversation(params: {
  businessId: string;
  otherPartyId: string;
  otherPartyType: 'staff' | 'customer' | 'supplier';
  otherPartyName: string;
  otherPartyAvatar?: string;
  otherPartyUserId?: string;
}): Promise<{ success: boolean; conversation?: any; crossBusiness?: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');

    // Resolve otherPartyUserId to a real auth user id (not a business id)
    let resolvedOtherUserId = params.otherPartyUserId || null;
    if (params.otherPartyType === 'supplier') {
      const { data: supplierRow } = await supabase
        .from('suppliers')
        .select('linked_user_id, mobile_number, business_name, contact_person')
        .eq('id', params.otherPartyId)
        .maybeSingle();
      if (supplierRow) {
        if (supplierRow.linked_user_id) {
          resolvedOtherUserId = supplierRow.linked_user_id;
        } else {
          // Try auto-link by phone number
          const linked = await autoLinkSupplierToUser(params.otherPartyId);
          if (linked) resolvedOtherUserId = linked;
        }
      }
    } else if (params.otherPartyType === 'customer') {
      const linked = await autoLinkCustomerToUser(params.otherPartyId);
      if (linked) resolvedOtherUserId = linked;
    }
    // Ensure we don't have a business_id as the user id
    if (resolvedOtherUserId) {
      const { data: checkBiz } = await supabase
        .from('businesses')
        .select('id, owner_user_id')
        .eq('id', resolvedOtherUserId)
        .maybeSingle();
      if (checkBiz?.owner_user_id) {
        resolvedOtherUserId = checkBiz.owner_user_id;
      }
    }

    // 1. Check for existing conversation owned by this business
    const { data: existing } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', params.businessId)
      .eq('participant_other_id', params.otherPartyId)
      .eq('participant_other_type', params.otherPartyType)
      .maybeSingle();

    if (existing) {
      const updates: any = {};
      if (params.otherPartyName && params.otherPartyName !== 'Unknown' && existing.participant_other_name !== params.otherPartyName) {
        updates.participant_other_name = params.otherPartyName;
      }
      if (resolvedOtherUserId && existing.participant_other_user_id !== resolvedOtherUserId) {
        updates.participant_other_user_id = resolvedOtherUserId;
      }
      if (Object.keys(updates).length > 0) {
        await supabase.from('conversations').update(updates).eq('id', existing.id);
        Object.assign(existing, updates);
      }
      return { success: true, conversation: existing, crossBusiness: false };
    }

    // 2. Reverse lookup: check if the OTHER business already created a conversation
    //    that includes the current user as participant_other_user_id
    const { data: { session } } = await supabase.auth.getSession();
    const currentUserId = session?.user?.id;

    if (currentUserId && (params.otherPartyType === 'supplier' || params.otherPartyType === 'customer')) {
      const { data: reverseConvo } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant_other_user_id', currentUserId)
        .neq('business_id', params.businessId)
        .limit(10);

      if (reverseConvo && reverseConvo.length > 0) {
        // Find the other party's business on Manager via their user id
        let otherBizId: string | null = null;
        if (resolvedOtherUserId) {
          const { data: bizRow } = await supabase
            .from('businesses')
            .select('id')
            .eq('owner_user_id', resolvedOtherUserId)
            .maybeSingle();
          otherBizId = bizRow?.id || null;
        }

        if (otherBizId) {
          const match = reverseConvo.find((c: any) => c.business_id === otherBizId);
          if (match) {
            if (!match.participant_other_user_id && currentUserId) {
              await supabase.from('conversations').update({ participant_other_user_id: currentUserId }).eq('id', match.id);
              match.participant_other_user_id = currentUserId;
            }
            return { success: true, conversation: match, crossBusiness: true };
          }
        }

        // If we couldn't find by business_id, try matching any conversation
        // where the reverse convo was created by the other party's business
        if (!otherBizId && reverseConvo.length === 1) {
          const match = reverseConvo[0];
          return { success: true, conversation: match, crossBusiness: true };
        }
      }
    }

    // 3. Create new conversation
    let resolvedName = params.otherPartyName;
    if (!resolvedName || resolvedName === 'Unknown') {
      if (params.otherPartyType === 'supplier') {
        const { data: sRow } = await supabase.from('suppliers').select('business_name, contact_person').eq('id', params.otherPartyId).maybeSingle();
        resolvedName = sRow?.business_name || sRow?.contact_person || resolvedName;
      } else if (params.otherPartyType === 'customer') {
        const { data: cRow } = await supabase.from('customers').select('name, business_name').eq('id', params.otherPartyId).maybeSingle();
        resolvedName = cRow?.business_name || cRow?.name || resolvedName;
      }
    }

    const { data, error } = await supabase
      .from('conversations')
      .insert({
        business_id: params.businessId,
        type: params.otherPartyType,
        participant_owner_id: currentUserId || null,
        participant_other_id: params.otherPartyId,
        participant_other_type: params.otherPartyType,
        participant_other_name: resolvedName,
        participant_other_avatar: params.otherPartyAvatar || null,
        participant_other_user_id: resolvedOtherUserId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, conversation: data, crossBusiness: false };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to get/create conversation' };
  }
}

export async function sendMessage(params: {
  conversationId: string;
  senderId: string;
  senderType: 'owner' | 'staff' | 'customer' | 'supplier';
  senderName: string;
  content: string;
  messageType?: 'text' | 'image' | 'audio' | 'file';
  mediaUrl?: string;
  metadata?: { document_type?: string; entity_id?: string; entity_number?: string } | null;
}): Promise<{ success: boolean; message?: any; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const insertRow: any = {
      conversation_id: params.conversationId,
      sender_id: params.senderId,
      sender_type: params.senderType,
      sender_name: params.senderName,
      content: params.content,
      message_type: params.messageType || 'text',
      media_url: params.mediaUrl || null,
    };
    if (params.metadata) insertRow.metadata = params.metadata;
    const { data, error } = await supabase
      .from('messages')
      .insert(insertRow)
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    const { data: convo } = await supabase
      .from('conversations')
      .select('unread_count_owner, unread_count_other')
      .eq('id', params.conversationId)
      .single();

    const unreadUpdate = params.senderType === 'owner'
      ? { unread_count_other: (convo?.unread_count_other || 0) + 1 }
      : { unread_count_owner: (convo?.unread_count_owner || 0) + 1 };

    await supabase
      .from('conversations')
      .update({
        last_message_text: params.content,
        last_message_at: new Date().toISOString(),
        ...unreadUpdate,
      })
      .eq('id', params.conversationId);

    try {
      const { data: convoFull } = await supabase
        .from('conversations')
        .select('business_id, participant_owner_id, participant_other_id, participant_other_type, participant_other_name')
        .eq('id', params.conversationId)
        .single();

      if (convoFull) {
        const messagePreview = params.content.length > 80
          ? params.content.substring(0, 80) + '...'
          : params.content;

        if (params.senderType === 'owner') {
          await createInAppNotification({
            businessId: convoFull.business_id,
            title: `New message from ${params.senderName}`,
            message: messagePreview,
            type: 'chat_message',
            recipientId: convoFull.participant_other_id,
            recipientType: convoFull.participant_other_type,
          });
        } else {
          await createInAppNotification({
            businessId: convoFull.business_id,
            title: `New message from ${params.senderName}`,
            message: messagePreview,
            type: 'chat_message',
            recipientId: convoFull.participant_owner_id,
            recipientType: 'owner',
          });
        }
      }
    } catch (notifErr) {
      // Non-critical: don't fail the message send if notification fails
    }

    return { success: true, message: data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to send message' };
  }
}

export async function getConversations(businessId: string): Promise<{ success: boolean; conversations?: any[]; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: ownConvos, error } = await supabase
      .from('conversations')
      .select('*')
      .eq('business_id', businessId)
      .order('last_message_at', { ascending: false, nullsFirst: false });

    if (error) return { success: false, error: error.message };

    const { data: { session } } = await supabase.auth.getSession();
    const userId = session?.user?.id;

    let crossBusinessConvos: any[] = [];
    if (userId) {
      const { data: linkedConvos } = await supabase
        .from('conversations')
        .select('*')
        .eq('participant_other_user_id', userId)
        .neq('business_id', businessId)
        .order('last_message_at', { ascending: false, nullsFirst: false });

      if (linkedConvos && linkedConvos.length > 0) {
        const businessIds = [...new Set(linkedConvos.map((c: any) => c.business_id))];
        const { data: bizRows } = await supabase
          .from('businesses')
          .select('id, legal_name, owner_name')
          .in('id', businessIds);
        const bizMap = new Map((bizRows || []).map((b: any) => [b.id, b]));

        crossBusinessConvos = linkedConvos.map((c: any) => ({
          ...c,
          _crossBusiness: true,
          _buyerBusinessName: bizMap.get(c.business_id)?.legal_name || 'Business Partner',
          _buyerOwnerName: bizMap.get(c.business_id)?.owner_name || 'Partner',
        }));
      }
    }

    const allConvos = [...(ownConvos || []), ...crossBusinessConvos]
      .sort((a, b) => {
        const aTime = a.last_message_at ? new Date(a.last_message_at).getTime() : 0;
        const bTime = b.last_message_at ? new Date(b.last_message_at).getTime() : 0;
        return bTime - aTime;
      });

    return { success: true, conversations: allConvos };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch conversations' };
  }
}

export async function getTotalUnreadChatCount(businessId: string, isStaff: boolean): Promise<number> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('conversations')
      .select(isStaff ? 'unread_count_other' : 'unread_count_owner')
      .eq('business_id', businessId);

    if (error || !data) return 0;
    let total = data.reduce((sum: number, row: any) => {
      const count = isStaff ? (row.unread_count_other || 0) : (row.unread_count_owner || 0);
      return sum + count;
    }, 0);

    if (!isStaff) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user?.id) {
        const { data: crossData } = await supabase
          .from('conversations')
          .select('unread_count_other')
          .eq('participant_other_user_id', session.user.id)
          .neq('business_id', businessId);
        if (crossData) {
          total += crossData.reduce((s: number, r: any) => s + (r.unread_count_other || 0), 0);
        }
      }
    }

    return total;
  } catch {
    return 0;
  }
}

export async function getMessages(conversationId: string, limit: number = 50, offset: number = 0): Promise<{ success: boolean; messages?: any[]; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('messages')
      .select('*')
      .eq('conversation_id', conversationId)
      .neq('is_deleted', true)
      .order('created_at', { ascending: true })
      .range(offset, offset + limit - 1);

    if (error) return { success: false, error: error.message };
    return { success: true, messages: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch messages' };
  }
}

export async function markMessagesRead(conversationId: string, readerType: 'owner' | 'staff' | 'customer' | 'supplier'): Promise<void> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const senderTypes = readerType === 'owner'
      ? ['staff', 'customer', 'supplier']
      : ['owner'];

    await supabase
      .from('messages')
      .update({ is_read: true })
      .eq('conversation_id', conversationId)
      .in('sender_type', senderTypes)
      .eq('is_read', false);

    const countField = readerType === 'owner' ? 'unread_count_owner' : 'unread_count_other';
    await supabase
      .from('conversations')
      .update({ [countField]: 0 })
      .eq('id', conversationId);
  } catch {}
}

// ============================================
// In-App Notifications APIs (Direct Supabase)
// ============================================

export async function createInAppNotification(params: {
  businessId: string;
  recipientId: string;
  recipientType: 'owner' | 'staff';
  title: string;
  message?: string;
  type?: string;
  category?: string;
  priority?: 'low' | 'medium' | 'high';
  sourceStaffId?: string;
  sourceStaffName?: string;
  relatedEntityType?: string;
  relatedEntityId?: string;
  relatedEntityName?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase
      .from('in_app_notifications')
      .insert({
        business_id: params.businessId,
        recipient_id: params.recipientId,
        recipient_type: params.recipientType,
        title: params.title,
        message: params.message || null,
        type: params.type || 'info',
        category: params.category || null,
        priority: params.priority || 'medium',
        status: 'unread',
        source_staff_id: params.sourceStaffId || null,
        source_staff_name: params.sourceStaffName || null,
        related_entity_type: params.relatedEntityType || null,
        related_entity_id: params.relatedEntityId || null,
        related_entity_name: params.relatedEntityName || null,
      });

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create notification' };
  }
}

export async function updateNotificationStatus(notificationId: string, status: 'unread' | 'read' | 'acknowledged' | 'resolved'): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { error } = await supabase
      .from('in_app_notifications')
      .update({ status, is_read: status !== 'unread' })
      .eq('id', notificationId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update notification status' };
  }
}

export async function getInAppNotifications(params: {
  businessId: string;
  recipientId?: string;
  recipientType?: 'owner' | 'staff';
  unreadOnly?: boolean;
  limit?: number;
}): Promise<{ success: boolean; notifications?: any[]; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    let query = supabase
      .from('in_app_notifications')
      .select('*')
      .eq('business_id', params.businessId)
      .order('created_at', { ascending: false })
      .limit(params.limit || 50);

    if (params.recipientId) query = query.eq('recipient_id', params.recipientId);
    if (params.recipientType) query = query.eq('recipient_type', params.recipientType);
    if (params.unreadOnly) query = query.eq('is_read', false);

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, notifications: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch notifications' };
  }
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  try {
    const { supabase } = await import('@/lib/supabase');
    await supabase
      .from('in_app_notifications')
      .update({ is_read: true, status: 'read' })
      .eq('id', notificationId);
  } catch {}
}

export async function markAllNotificationsRead(businessId: string, recipientId: string): Promise<void> {
  try {
    const { supabase } = await import('@/lib/supabase');
    await supabase
      .from('in_app_notifications')
      .update({ is_read: true })
      .eq('business_id', businessId)
      .eq('recipient_id', recipientId)
      .eq('is_read', false);
  } catch {}
}

// ─── MARKETING SERVICE REQUESTS ─────────────────

export async function createMarketingRequest(params: {
  serviceType: string;
  title: string;
  description?: string;
  budgetRange?: string;
  targetPlatforms?: string[];
  targetAudience?: string;
  urgency?: string;
}): Promise<{ success: boolean; request?: any; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

    const { data: user } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .maybeSingle();
    if (!user?.business_id) return { success: false, error: 'No business found' };

    const { data, error } = await supabase
      .from('marketing_service_requests')
      .insert({
        business_id: user.business_id,
        requested_by: session.user.id,
        service_type: params.serviceType,
        title: params.title,
        description: params.description || null,
        budget_range: params.budgetRange || null,
        target_platforms: params.targetPlatforms || [],
        target_audience: params.targetAudience || null,
        urgency: params.urgency || 'normal',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, request: data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create marketing request' };
  }
}

export async function getMarketingRequests(): Promise<{ success: boolean; requests?: any[]; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user?.id) return { success: false, error: 'Not authenticated' };

    const { data: user } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .maybeSingle();
    if (!user?.business_id) return { success: false, error: 'No business found' };

    const { data, error } = await supabase
      .from('marketing_service_requests')
      .select('*')
      .eq('business_id', user.business_id)
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, requests: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch marketing requests' };
  }
}

export async function getCashTransactionById(transactionId: string): Promise<{ success: boolean; transaction?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-cash-transactions?id=' + transactionId, 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Transaction not found' };
    return { success: true, transaction: result.data?.transaction };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch cash transaction' };
  }
}

export async function getBankTransactionById(transactionId: string): Promise<{ success: boolean; transaction?: any; relatedCustomer?: any; relatedSupplier?: any; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-bank-transactions?id=' + transactionId, 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Transaction not found' };
    return { success: true, transaction: result.data?.transaction, relatedCustomer: result.data?.relatedCustomer, relatedSupplier: result.data?.relatedSupplier };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch bank transaction' };
  }
}

export async function clearBankTransaction(transactionId: string, clearanceDate: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-bank-transactions', 'PUT', { id: transactionId, is_cleared: true, clearance_date: clearanceDate }, true);
    return { success: result.success, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to clear transaction' };
  }
}

export async function deleteBankTransaction(transactionId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-bank-transactions', 'DELETE', { id: transactionId }, true);
    return { success: result.success, error: result.error };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete transaction' };
  }
}

export async function getReturnById(returnId: string): Promise<{ success: boolean; returnData?: any; items?: any[]; error?: string }> {
  try {
    const result = await callEdgeFunction('manage-returns?id=' + returnId, 'GET', undefined, true);
    if (!result.success) return { success: false, error: result.error || 'Return not found' };
    return { success: true, returnData: result.data?.return, items: result.data?.items || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch return' };
  }
}

export async function notifyStaffLogin(staffId: string): Promise<void> {
  try {
    await callEdgeFunction('staff-login-notify', 'POST', { staffId });
  } catch { /* silent */ }
}

export async function generateBarcodeImage(barcodeValue: string): Promise<{ success: boolean; data?: string; error?: string }> {
  try {
    const result = await callEdgeFunction('generate-barcode', 'POST', { barcode: barcodeValue.trim() }, false);
    if (!result.success) return { success: false, error: result.error || 'Barcode generation failed' };
    return { success: true, data: result.data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to generate barcode' };
  }
}

// ============================================
// Leave Requests
// ============================================

export async function createLeaveRequest(params: {
  staffId: string;
  staffName: string;
  startDate: string;
  endDate: string;
  reason: string;
}): Promise<{ success: boolean; leaveRequest?: any; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Not authenticated' };

    const { data, error } = await supabase
      .from('leave_requests')
      .insert({
        business_id: ctx.businessId,
        staff_id: params.staffId,
        staff_name: params.staffName,
        start_date: params.startDate,
        end_date: params.endDate,
        reason: params.reason,
        status: 'pending',
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, leaveRequest: data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create leave request' };
  }
}

export async function getLeaveRequests(filters?: {
  staffId?: string;
  status?: string;
}): Promise<{ success: boolean; leaveRequests?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Not authenticated' };

    let query = supabase
      .from('leave_requests')
      .select('*')
      .eq('business_id', ctx.businessId)
      .order('created_at', { ascending: false });

    if (filters?.staffId) {
      query = query.eq('staff_id', filters.staffId);
    }
    if (filters?.status) {
      query = query.eq('status', filters.status);
    }

    const { data, error } = await query;
    if (error) return { success: false, error: error.message };
    return { success: true, leaveRequests: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch leave requests' };
  }
}

export async function updateLeaveRequest(
  requestId: string,
  params: {
    status: 'approved' | 'rejected';
    reviewerNote?: string;
  }
): Promise<{ success: boolean; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Not authenticated' };

    const { error } = await supabase
      .from('leave_requests')
      .update({
        status: params.status,
        reviewer_note: params.reviewerNote || null,
        reviewed_at: new Date().toISOString(),
        reviewed_by: ctx.userId,
        updated_at: new Date().toISOString(),
      })
      .eq('id', requestId)
      .eq('business_id', ctx.businessId);

    if (error) return { success: false, error: error.message };

    if (params.status === 'approved') {
      const { data: leaveReq } = await supabase
        .from('leave_requests')
        .select('staff_id')
        .eq('id', requestId)
        .single();
      if (leaveReq?.staff_id) {
        await supabase
          .from('staff')
          .update({ status: 'on_leave', updated_at: new Date().toISOString() })
          .eq('id', leaveReq.staff_id);
      }
    }

    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update leave request' };
  }
}

// ============================================
// BUSINESS PREFERENCES
// ============================================

export interface BusinessPreferences {
  business_id: string;
  push_notifications: boolean;
  email_notifications: boolean;
  whatsapp_notifications: boolean;
  weekly_reports: boolean;
  low_stock_alerts: boolean;
  overdue_receivables: boolean;
  overdue_payables: boolean;
  auto_send_po: boolean;
  auto_send_return_invoice: boolean;
  auto_send_discrepancy: boolean;
  auto_send_payment: boolean;
  payment_methods: Record<string, boolean>;
  active_bank_accounts: string[];
  digital_wallets: string[];
  updated_at: string;
}

export async function getBusinessPreferences(businessId: string): Promise<{ success: boolean; preferences?: BusinessPreferences; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('business_preferences')
      .select('*')
      .eq('business_id', businessId)
      .maybeSingle();

    if (error) return { success: false, error: error.message };
    if (!data) {
      // No preferences yet, return defaults
      return {
        success: true,
        preferences: {
          business_id: businessId,
          push_notifications: true,
          email_notifications: true,
          whatsapp_notifications: false,
          weekly_reports: false,
          low_stock_alerts: true,
          overdue_receivables: true,
          overdue_payables: true,
          auto_send_po: true,
          auto_send_return_invoice: true,
          auto_send_discrepancy: false,
          auto_send_payment: false,
          payment_methods: { cash: true, upi: true, card: true, bankTransfer: true, cheque: false, digitalWallet: true },
          active_bank_accounts: [],
          digital_wallets: ['Paytm', 'PhonePe', 'Google Pay', 'Amazon Pay', 'Freecharge', 'MobiKwik'],
          updated_at: new Date().toISOString(),
        },
      };
    }
    return { success: true, preferences: data as BusinessPreferences };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch business preferences' };
  }
}

export async function updateBusinessPreferences(
  businessId: string,
  updates: Partial<Omit<BusinessPreferences, 'business_id'>>
): Promise<{ success: boolean; preferences?: BusinessPreferences; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const updateData = {
      ...updates,
      updated_at: new Date().toISOString(),
    };

    const { data, error } = await supabase
      .from('business_preferences')
      .upsert({
        business_id: businessId,
        ...updateData,
      }, { onConflict: 'business_id' })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, preferences: data as BusinessPreferences };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update business preferences' };
  }
}
