/**
 * Backend API Service
 * Handles all calls to Supabase Edge Functions and direct Supabase queries.
 */

import { EDGE_FUNCTIONS_URL, supabase, SUPABASE_ANON_KEY, withTimeout } from '@/lib/supabase';

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

// Helper to call Edge Functions
export async function callEdgeFunction(
  functionName: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any,
  requireAuth: boolean = false
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    let accessToken: string | null = null;

    if (requireAuth) {
      const { data: { session } } = await withTimeout(
        supabase.auth.getSession(),
        10000,
        'callEdgeFunction: getSession'
      );
      if (!session?.access_token) {
        return {
          success: false,
          error: 'Authentication required. Please sign in first.',
        };
      }
      accessToken = session.access_token;
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

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
      'Authorization': `Bearer ${accessToken || SUPABASE_ANON_KEY}`,
    };

    const options: RequestInit = {
      method,
      headers,
      credentials: 'omit',
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 15000);
    options.signal = controller.signal;

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/${functionName}`, options);
    clearTimeout(timeoutId);

    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch {
        return { success: false, error: 'Invalid response format from server' };
      }
    } else {
      const text = await response.text();
      data = { message: text || 'No response data' };
    }

    if (!response.ok) {
      const errorMessage = data.error || data.message || `Request failed with status ${response.status}`;
      return { success: false, error: errorMessage };
    }

    return { success: true, data };
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

  return { success: false, error: result.error || result.data?.message || result.data?.error || 'GSTIN verification failed' };
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
    // Extract mobile number from phone (remove +91 prefix)
    mobileNumber = user.phone.replace(/^\+91/, '');
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
  const result = await callEdgeFunction('manage-addresses', 'GET', undefined, true);
  
  if (!result.success && result.error?.includes('404')) {
    return { success: true, addresses: [] };
  }
  
  if (result.success && Array.isArray(result.data?.addresses)) {
    return {
      success: true,
      addresses: result.data.addresses,
    };
  }
  
  return {
    success: false,
    error: result.error || 'Failed to fetch addresses',
  };
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
  
  // Use POST instead of PUT to avoid CORS issues on web
  // The Edge Function now accepts POST requests with addressId for updates
  // This allows us to use supabase.functions.invoke() which handles CORS automatically
  const result = await callEdgeFunction(
    'manage-addresses',
    'POST',
    requestBody,
    true
  );

  if (result.success && result.data?.address) {
    // ✅ Update businesses table if isPrimary status changed
    if (params.isPrimary !== undefined) {
      if (params.isPrimary) {
        // Set as primary
        await updateBusinessPrimaryAddress(params.addressId);
      } else {
        // Unset primary - find new primary or set to null
        // The Edge Function should handle setting another address as primary
        // For now, we'll just update if explicitly set to false
        // In practice, when unsetting primary, another address should be set as primary first
      }
    }
    
    // Clear cache so data refreshes
    getClearCache()?.();
    return {
      success: true,
      address: result.data.address,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to update address',
  };
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
  const result = await callEdgeFunction('manage-bank-accounts', 'GET', undefined, true);
  
  // Handle 404 gracefully - edge function may not be deployed
  if (!result.success && result.error?.includes('404')) {
    // Edge function not deployed yet
    return {
      success: true,
      accounts: [],
    };
  }
  
  if (result.success && Array.isArray(result.data?.accounts)) {
    return {
      success: true,
      accounts: result.data.accounts,
    };
  }
  
  return {
    success: false,
    error: result.error || 'Failed to fetch bank accounts',
  };
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
  
  // Use POST with action: 'update' to avoid CORS issues on web
  const result = await callEdgeFunction(
    'manage-bank-accounts',
    'POST',
    requestBody,
    true
  );

  if (result.success && result.data?.account) {
    // ✅ Update businesses table if isPrimary status changed
    if (params.isPrimary !== undefined) {
      if (params.isPrimary) {
        // Set as primary
        await updateBusinessPrimaryBankAccount(params.accountId);
      } else {
        // Unset primary - find new primary or set to null
        // The Edge Function should handle setting another account as primary
        // For now, we'll just update if explicitly set to false
        // In practice, when unsetting primary, another account should be set as primary first
      }
    }
    
    // Clear cache so data refreshes
    getClearCache()?.();
    return {
      success: true,
      account: result.data.account,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to update bank account',
  };
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
    return { success: true };
  }

  return {
    success: false,
    error: result.error || 'Failed to delete bank account',
  };
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
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('business_id', ctx.businessId)
      .in('status', ['active', 'trialing'])
      .maybeSingle();

    if (existingSubscription) {
      // Update existing subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .update({
          is_on_trial: subscriptionData.isOnTrial,
          trial_start_date: subscriptionData.trialStartDate || null,
          trial_end_date: subscriptionData.trialEndDate || null,
          status: subscriptionData.status,
          updated_at: new Date().toISOString(),
        })
        .eq('id', existingSubscription.id)
        .select()
        .single();

      if (error) {
        // subscription update failed
        return { success: false, error: error.message };
      }

      getClearCache()?.();
      return { success: true, subscription: data };
    } else {
      // Create new subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          business_id: ctx.businessId,
          is_on_trial: subscriptionData.isOnTrial,
          trial_start_date: subscriptionData.trialStartDate || null,
          trial_end_date: subscriptionData.trialEndDate || null,
          status: subscriptionData.status,
        })
        .select()
        .single();

      if (error) {
        // subscription create failed
        return { success: false, error: error.message };
      }

      getClearCache()?.();
      return { success: true, subscription: data };
    }
  } catch (error: any) {
    // createOrUpdateSubscription failed
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
  const result = await callEdgeFunction(
    'update-business-cash-balance',
    'POST',
    { initialCashBalance },
    true
  );

  if (result.success && result.data?.business) {
    // Clear cache so data refreshes
    getClearCache()?.();
    return {
      success: true,
      business: result.data.business,
    };
  }

  return {
    success: false,
    error: result.error || 'Failed to update cash balance',
  };
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
    return {
      success: true,
      businessId: result.data.businessId,
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
  const result = await callEdgeFunction('manage-signup-progress', 'POST', params, true);
  
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
 */
export async function deleteSignupProgress(): Promise<{ success: boolean; error?: string }> {
  try {
    // Use POST with action='delete' instead of DELETE method to avoid CORS issues
    // This is more reliable on web platforms
    const result = await callEdgeFunction('manage-signup-progress', 'POST', { action: 'delete' }, true);
    
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
  wifiName?: string;
  bluetoothName?: string;
  manufacturer?: string;
  totalMemory?: number;
  isDevice?: boolean;
  isEmulator?: boolean;
  isTablet?: boolean;
  appVersion?: string;
  appBuildNumber?: string;
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
      },
      true
    );

    // Handle different response structures
    if (result.success) {
      const staffData = result.data?.staff || result.data;
      if (staffData) {
        // Clear cache so data refreshes
        getClearCache()?.();
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
    return { success: true };
  }

  return {
    success: false,
    error: result.error || 'Failed to delete staff',
  };
}

// ============================================
// Supplier APIs (Direct Supabase)
// ============================================

/**
 * Get all suppliers for the current business
 */
export async function getSuppliers(): Promise<{ success: boolean; suppliers?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('business_id', ctx.businessId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, suppliers: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch suppliers' };
  }
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
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        business_id: ctx.businessId,
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
        status: 'active',
        supplier_type: 'business',
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, supplier: data };
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
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const updateData: any = {
      updated_by: ctx.userId,
    };

    if (params.businessName !== undefined) updateData.business_name = params.businessName;
    if (params.contactPerson !== undefined) updateData.contact_person = params.contactPerson;
    if (params.mobileNumber !== undefined) updateData.mobile_number = params.mobileNumber;
    if (params.email !== undefined) updateData.email = params.email || null;
    if (params.gstinPan !== undefined) updateData.gstin_pan = params.gstinPan || null;
    if (params.addressLine1 !== undefined) updateData.address_line_1 = params.addressLine1;
    if (params.addressLine2 !== undefined) updateData.address_line_2 = params.addressLine2 || null;
    if (params.addressLine3 !== undefined) updateData.address_line_3 = params.addressLine3 || null;
    if (params.city !== undefined) updateData.city = params.city;
    if (params.pincode !== undefined) updateData.pincode = params.pincode;
    if (params.state !== undefined) updateData.state = params.state;
    if (params.additionalNotes !== undefined) updateData.additional_notes = params.additionalNotes || null;
    if (params.status !== undefined) updateData.status = params.status;

    const { data, error } = await supabase
      .from('suppliers')
      .update(updateData)
      .eq('id', supplierId)
      .select()
      .single();

    if (error) {
      // supplier update failed
      return { success: false, error: error.message };
    }

    return { success: true, supplier: data };
  } catch (error: any) {
    // updateSupplier error
    return { success: false, error: error.message || 'Failed to update supplier' };
  }
}

/**
 * Delete a supplier
 */
export async function deleteSupplier(supplierId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('suppliers')
      .delete()
      .eq('id', supplierId);

    if (error) {
      // supplier delete failed
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    // deleteSupplier error
    return { success: false, error: error.message || 'Failed to delete supplier' };
  }
}

// ============================================
// Product APIs (Direct Supabase)
// ============================================

/**
 * Get all products for the current business
 */
export async function getProducts(): Promise<{ success: boolean; products?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', ctx.businessId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, products: data || [] };
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
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data: logs, error: logsError } = await supabase
      .from('inventory_logs')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('product_id', productId)
      .order('transaction_date', { ascending: false })
      .limit(100);

    if (logsError) return { success: false, error: logsError.message };

    // Transform logs to match the expected format
    const transformedLogs = (logs || []).map((log: any) => {
      // Keep original transaction_type - don't map opening_stock to purchase
      const type = log.transaction_type;

      return {
        id: log.id,
        type: type, // Keep original: 'opening_stock', 'purchase', 'sale', 'return', 'adjustment', 'transfer'
        invoiceNumber: log.reference_number || undefined,
        quantity: parseFloat(log.quantity_change) || 0,
        date: log.transaction_date || log.created_at,
        staffName: log.staff_name || 'Staff',
        customerName: log.customer_name || undefined,
        supplierName: log.supplier_name || undefined,
        reason: log.reason || undefined,
        balanceAfter: parseFloat(log.balance_after) || 0,
        locationName: log.location_name || undefined,
        locationId: log.location_id || undefined,
        referenceType: log.reference_type || undefined,
        referenceId: log.reference_id || undefined,
        unitPrice: log.unit_price ? parseFloat(log.unit_price) : undefined,
        totalValue: log.total_value ? parseFloat(log.total_value) : undefined,
      };
    });

    return { success: true, logs: transformedLogs };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch inventory logs' };
  }
}

export async function getProductLocationStock(productId: string): Promise<{ success: boolean; locationStock?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data: locationStock, error: locationStockError } = await supabase
      .from('location_stock')
      .select('*')
      .eq('product_id', productId)
      .order('quantity', { ascending: false });

    if (locationStockError) return { success: false, error: locationStockError.message };

    // Fetch location details for each location_id
    const locationIds = [...new Set((locationStock || []).map((stock: any) => stock.location_id))];
    const { data: locations, error: locationsError } = await supabase
      .from('locations')
      .select('id, name, type')
      .in('id', locationIds);

    // Create a map of location_id to location details
    const locationMap = new Map();
    (locations || []).forEach((loc: any) => {
      locationMap.set(loc.id, loc);
    });

    // Transform to include location name
    const transformedStock = (locationStock || []).map((stock: any) => {
      const location = locationMap.get(stock.location_id);
      return {
        locationId: stock.location_id,
        locationName: location?.name || 'Unknown Location',
        locationType: location?.type || 'primary',
        quantity: parseFloat(stock.quantity) || 0,
        lastUpdated: stock.last_updated,
        updatedBy: stock.updated_by,
      };
    });

    return { success: true, locationStock: transformedStock };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch location stock' };
  }
}

export async function getProductInventoryLogsByLocation(
  productId: string, 
  locationId?: string
): Promise<{ success: boolean; logs?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    let query = supabase
      .from('inventory_logs')
      .select('*')
      .eq('business_id', ctx.businessId)
      .eq('product_id', productId);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data: logs, error: logsError } = await query
      .order('transaction_date', { ascending: false })
      .limit(100);

    if (logsError) {
      // inventory logs fetch failed
      return { success: false, error: logsError.message };
    }

    // Transform logs to match the expected format
    const transformedLogs = (logs || []).map((log: any) => {
      return {
        id: log.id,
        type: log.transaction_type,
        invoiceNumber: log.reference_number || undefined,
        quantity: parseFloat(log.quantity_change) || 0,
        date: log.transaction_date || log.created_at,
        staffName: log.staff_name || 'Staff',
        customerName: log.customer_name || undefined,
        supplierName: log.supplier_name || undefined,
        reason: log.reason || undefined,
        balanceAfter: parseFloat(log.balance_after) || 0,
        locationName: log.location_name || undefined,
        locationId: log.location_id || undefined,
        referenceType: log.reference_type || undefined,
        referenceId: log.reference_id || undefined,
        unitPrice: log.unit_price ? parseFloat(log.unit_price) : undefined,
        totalValue: log.total_value ? parseFloat(log.total_value) : undefined,
      };
    });

    return { success: true, logs: transformedLogs };
  } catch (error: any) {
    // getProductInventoryLogsByLocation error
    return { success: false, error: error.message || 'Failed to fetch inventory logs' };
  }
}

/**
 * Get low stock products (where current_stock <= min_stock_level)
 */
export async function getLowStockProducts(): Promise<{ success: boolean; products?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data: allProducts, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', ctx.businessId)
      .gt('min_stock_level', 0)
      .order('urgency_level', { ascending: false })
      .order('current_stock', { ascending: true });

    if (error) return { success: false, error: error.message };

    const lowStockProducts = (allProducts || []).filter(
      (product: any) => product.current_stock <= product.min_stock_level
    );
    return { success: true, products: lowStockProducts };
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
  brand?: string;
  description?: string;
}): Promise<{ success: boolean; product?: any; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('products')
      .insert({
        business_id: ctx.businessId,
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
        current_stock: params.openingStock || 0, // Initialize current_stock with opening_stock
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
        brand: params.brand || null,
        description: params.description || null,
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    const openingStock = params.openingStock || 0;
    const locationId = params.storageLocationId;

    if (locationId) {
      try {
        const { data: userProfile } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', ctx.userId)
          .single();

        let locationName = params.storageLocationName;
        if (!locationName) {
          const { data: locationData } = await supabase
            .from('locations')
            .select('name')
            .eq('id', locationId)
            .single();
          locationName = locationData?.name || null;
        }

        await supabase
          .from('location_stock')
          .upsert({
            product_id: data.id,
            location_id: locationId,
            quantity: openingStock,
            last_updated: new Date().toISOString(),
            updated_by: ctx.userId,
          }, { onConflict: 'product_id,location_id' });

        if (openingStock > 0) {
          await supabase
            .from('inventory_logs')
            .insert({
              business_id: ctx.businessId,
              product_id: data.id,
              transaction_type: 'opening_stock',
              quantity_change: openingStock,
              balance_after: openingStock,
              location_id: locationId,
              location_name: locationName,
              staff_id: ctx.userId,
              staff_name: userProfile?.full_name || null,
              unit_price: params.purchasePrice || params.perUnitPrice || 0,
              total_value: (params.purchasePrice || params.perUnitPrice || 0) * openingStock,
              reference_type: 'manual',
              notes: 'Opening stock recorded during product creation',
              created_by: ctx.userId,
            });
        }
      } catch {
        // Non-critical: location stock / inventory log creation failed
      }
    }

    return { success: true, product: data };
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
    brand?: string;
    description?: string;
  }
): Promise<{ success: boolean; product?: any; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const updateData: any = {
      updated_by: ctx.userId,
    };

    if (params.name !== undefined) updateData.name = params.name;
    if (params.category !== undefined) updateData.category = params.category || null;
    if (params.customCategory !== undefined) updateData.custom_category = params.customCategory || null;
    if (params.hsnCode !== undefined) updateData.hsn_code = params.hsnCode || null;
    if (params.barcode !== undefined) updateData.barcode = params.barcode || null;
    if (params.productImage !== undefined) updateData.product_image = (params.productImage && params.productImage.trim() !== '') ? params.productImage : null;
    if (params.productImages !== undefined) updateData.product_images = params.productImages && params.productImages.length > 0 ? params.productImages : null;
    if (params.showAdvancedOptions !== undefined) updateData.show_advanced_options = params.showAdvancedOptions;
    if (params.batchNumber !== undefined) updateData.batch_number = params.batchNumber || null;
    if (params.expiryDate !== undefined) updateData.expiry_date = params.expiryDate || null;
    if (params.useCompoundUnit !== undefined) updateData.use_compound_unit = params.useCompoundUnit;
    if (params.unitType !== undefined) updateData.unit_type = params.unitType || null;
    if (params.primaryUnit !== undefined) updateData.primary_unit = params.primaryUnit;
    if (params.secondaryUnit !== undefined) updateData.secondary_unit = params.secondaryUnit || null;
    if (params.tertiaryUnit !== undefined) updateData.tertiary_unit = params.tertiaryUnit || null;
    if (params.conversionRatio !== undefined) updateData.conversion_ratio = params.conversionRatio || null;
    if (params.tertiaryConversionRatio !== undefined) updateData.tertiary_conversion_ratio = params.tertiaryConversionRatio || null;
    if (params.priceUnit !== undefined) updateData.price_unit = params.priceUnit;
    if (params.stockUom !== undefined) updateData.stock_uom = params.stockUom;
    if (params.taxRate !== undefined) updateData.tax_rate = params.taxRate;
    if (params.taxInclusive !== undefined) updateData.tax_inclusive = params.taxInclusive;
    if (params.cessType !== undefined) updateData.cess_type = params.cessType;
    if (params.cessRate !== undefined) updateData.cess_rate = params.cessRate;
    if (params.cessAmount !== undefined) updateData.cess_amount = params.cessAmount;
    if (params.cessUnit !== undefined) updateData.cess_unit = params.cessUnit || null;
    if (params.openingStock !== undefined) updateData.opening_stock = params.openingStock;
    if (params.currentStock !== undefined) updateData.current_stock = params.currentStock;
    if (params.minStockLevel !== undefined) updateData.min_stock_level = params.minStockLevel;
    if (params.maxStockLevel !== undefined) updateData.max_stock_level = params.maxStockLevel;
    if (params.stockUnit !== undefined) updateData.stock_unit = params.stockUnit;
    if (params.perUnitPrice !== undefined) updateData.per_unit_price = params.perUnitPrice;
    if (params.purchasePrice !== undefined) updateData.purchase_price = params.purchasePrice;
    if (params.salesPrice !== undefined) updateData.sales_price = params.salesPrice;
    if (params.mrpPrice !== undefined) updateData.mrp_price = params.mrpPrice;
    if (params.preferredSupplierId !== undefined) updateData.preferred_supplier_id = params.preferredSupplierId || null;
    if (params.storageLocationId !== undefined) updateData.storage_location_id = params.storageLocationId || null;
    if (params.storageLocationName !== undefined) updateData.storage_location_name = params.storageLocationName || null;
    if (params.brand !== undefined) updateData.brand = params.brand || null;
    if (params.description !== undefined) updateData.description = params.description || null;

    const { data, error } = await supabase
      .from('products')
      .update(updateData)
      .eq('id', productId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, product: data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update product' };
  }
}

export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('products').delete().eq('id', productId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to delete product' };
  }
}

// ============================================
// Customer APIs (Direct Supabase)
// ============================================

export async function getCustomers(): Promise<{ success: boolean; customers?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('customers')
      .select('*')
      .eq('business_id', ctx.businessId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, customers: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch customers' };
  }
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
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('customers')
      .insert({
        business_id: ctx.businessId,
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
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, customer: data };
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
    const updateData: any = {};
    if (params.name !== undefined) updateData.name = params.name;
    if (params.businessName !== undefined) updateData.business_name = params.businessName || null;
    if (params.customerType !== undefined) updateData.customer_type = params.customerType;
    if (params.contactPerson !== undefined) updateData.contact_person = params.contactPerson;
    if (params.mobile !== undefined) updateData.mobile = params.mobile;
    if (params.email !== undefined) updateData.email = params.email || null;
    if (params.address !== undefined) updateData.address = params.address || null;
    if (params.gstin !== undefined) updateData.gstin = params.gstin || null;
    if (params.avatar !== undefined) updateData.avatar = params.avatar;
    if (params.status !== undefined) updateData.status = params.status;
    if (params.paymentTerms !== undefined) updateData.payment_terms = params.paymentTerms;
    if (params.creditLimit !== undefined) updateData.credit_limit = params.creditLimit;
    if (params.categories !== undefined) updateData.categories = params.categories;

    const { data, error } = await supabase
      .from('customers')
      .update(updateData)
      .eq('id', customerId)
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, customer: data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update customer' };
  }
}

export async function deleteCustomer(customerId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('customers').delete().eq('id', customerId);
    if (error) return { success: false, error: error.message };
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
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('invoices')
      .select('*')
      .eq('business_id', ctx.businessId)
      .order('invoice_date', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, invoices: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch invoices' };
  }
}

export async function getInvoiceWithItems(invoiceId: string): Promise<{ success: boolean; invoice?: any; items?: any[]; error?: string }> {
  try {
    const [invoiceRes, itemsRes] = await Promise.all([
      supabase.from('invoices').select('*').eq('id', invoiceId).single(),
      supabase.from('invoice_items').select('*').eq('invoice_id', invoiceId),
    ]);

    if (invoiceRes.error) return { success: false, error: invoiceRes.error.message };
    return { success: true, invoice: invoiceRes.data, items: itemsRes.data || [] };
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
}): Promise<{ success: boolean; invoice?: any; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data: invoice, error: invoiceError } = await supabase
      .from('invoices')
      .insert({
        business_id: ctx.businessId,
        invoice_number: params.invoiceNumber,
        customer_id: params.customerId || null,
        customer_name: params.customerName,
        customer_type: params.customerType || 'individual',
        subtotal: params.subtotal,
        tax_amount: params.taxAmount,
        cess_amount: params.cessAmount || 0,
        total_amount: params.totalAmount,
        paid_amount: params.paidAmount,
        balance_amount: params.balanceAmount,
        payment_method: params.paymentMethod,
        payment_status: params.paymentStatus,
        invoice_date: params.invoiceDate || new Date().toISOString(),
        due_date: params.dueDate || null,
        notes: params.notes || null,
        staff_id: params.staffId || null,
        staff_name: params.staffName || null,
        location_id: params.locationId || null,
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (invoiceError) return { success: false, error: invoiceError.message };

    if (params.items.length > 0) {
      const itemRows = params.items.map(item => ({
        invoice_id: invoice.id,
        product_id: item.productId || null,
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
        batch_number: item.batchNumber || null,
        primary_unit: item.primaryUnit || 'Piece',
        discount_type: item.discountType || null,
        discount_value: item.discountValue || 0,
      }));

      const { error: itemsError } = await supabase.from('invoice_items').insert(itemRows);
      // invoice items creation may have failed silently
    }

    // Update product stock for each item (deduct sold quantity)
    for (const item of params.items) {
      if (item.productId) {
        const { data: product } = await supabase
          .from('products')
          .select('current_stock')
          .eq('id', item.productId)
          .single();

        if (product) {
          const newStock = Math.max(0, (product.current_stock || 0) - item.quantity);
          await supabase
            .from('products')
            .update({ current_stock: newStock })
            .eq('id', item.productId);

          await supabase.from('inventory_logs').insert({
            business_id: ctx.businessId,
            product_id: item.productId,
            transaction_type: 'sale',
            quantity_change: -item.quantity,
            balance_after: newStock,
            reference_type: 'invoice',
            reference_id: invoice.id,
            reference_number: params.invoiceNumber,
            location_id: params.locationId || null,
            staff_id: params.staffId || null,
            staff_name: params.staffName || null,
            customer_name: params.customerName,
            unit_price: item.unitPrice,
            total_value: item.totalPrice,
            created_by: ctx.userId,
          });
        }
      }
    }

    return { success: true, invoice };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create invoice' };
  }
}

export async function updateInvoicePayment(
  invoiceId: string,
  params: { paidAmount: number; paymentMethod?: string; }
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: invoice } = await supabase
      .from('invoices')
      .select('total_amount')
      .eq('id', invoiceId)
      .single();

    if (!invoice) return { success: false, error: 'Invoice not found' };

    const balance = invoice.total_amount - params.paidAmount;
    const status = balance <= 0 ? 'paid' : params.paidAmount > 0 ? 'partial' : 'unpaid';

    const updateData: any = {
      paid_amount: params.paidAmount,
      balance_amount: Math.max(0, balance),
      payment_status: status,
    };
    if (params.paymentMethod) updateData.payment_method = params.paymentMethod;

    const { error } = await supabase.from('invoices').update(updateData).eq('id', invoiceId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update invoice payment' };
  }
}

// ============================================
// Returns APIs (Direct Supabase)
// ============================================

export async function getReturns(): Promise<{ success: boolean; returns?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('returns')
      .select('*')
      .eq('business_id', ctx.businessId)
      .order('return_date', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, returns: data || [] };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch returns' };
  }
}

export async function createReturn(params: {
  returnNumber: string;
  originalInvoiceId?: string;
  originalInvoiceNumber?: string;
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
}): Promise<{ success: boolean; returnData?: any; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data: returnRow, error } = await supabase
      .from('returns')
      .insert({
        business_id: ctx.businessId,
        return_number: params.returnNumber,
        original_invoice_id: params.originalInvoiceId || null,
        original_invoice_number: params.originalInvoiceNumber || null,
        customer_id: params.customerId || null,
        customer_name: params.customerName,
        customer_type: params.customerType || 'individual',
        total_amount: params.totalAmount,
        refund_amount: params.refundAmount,
        refund_status: params.refundStatus || 'pending',
        refund_method: params.refundMethod || null,
        reason: params.reason || null,
        staff_id: params.staffId || null,
        staff_name: params.staffName || null,
        location_id: params.locationId || null,
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    if (params.items.length > 0) {
      const itemRows = params.items.map(item => ({
        return_id: returnRow.id,
        product_id: item.productId || null,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        tax_rate: item.taxRate || 0,
        tax_amount: item.taxAmount || 0,
        reason: item.reason || null,
      }));
      await supabase.from('return_items').insert(itemRows);
    }

    // Restore product stock for returned items
    for (const item of params.items) {
      if (item.productId) {
        const { data: product } = await supabase
          .from('products')
          .select('current_stock')
          .eq('id', item.productId)
          .single();
        if (product) {
          const newStock = (product.current_stock || 0) + item.quantity;
          await supabase.from('products').update({ current_stock: newStock }).eq('id', item.productId);
          await supabase.from('inventory_logs').insert({
            business_id: ctx.businessId,
            product_id: item.productId,
            transaction_type: 'return',
            quantity_change: item.quantity,
            balance_after: newStock,
            reference_type: 'return',
            reference_id: returnRow.id,
            reference_number: params.returnNumber,
            location_id: params.locationId || null,
            staff_name: params.staffName || null,
            customer_name: params.customerName,
            reason: item.reason || params.reason || null,
            unit_price: item.unitPrice,
            total_value: item.totalPrice,
            created_by: ctx.userId,
          });
        }
      }
    }

    return { success: true, returnData: returnRow };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create return' };
  }
}

// ============================================
// Purchase Order APIs (Direct Supabase)
// ============================================

export async function getPurchaseOrders(): Promise<{ success: boolean; orders?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('purchase_orders')
      .select('*')
      .eq('business_id', ctx.businessId)
      .order('order_date', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, orders: data || [] };
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
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data: order, error } = await supabase
      .from('purchase_orders')
      .insert({
        business_id: ctx.businessId,
        po_number: params.poNumber,
        supplier_id: params.supplierId || null,
        supplier_name: params.supplierName,
        subtotal: params.subtotal,
        tax_amount: params.taxAmount,
        total_amount: params.totalAmount,
        expected_delivery: params.expectedDelivery || null,
        notes: params.notes || null,
        staff_id: params.staffId || null,
        staff_name: params.staffName || null,
        location_id: params.locationId || null,
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    if (params.items.length > 0) {
      const itemRows = params.items.map(item => ({
        purchase_order_id: order.id,
        product_id: item.productId || null,
        product_name: item.productName,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.totalPrice,
        tax_rate: item.taxRate || 0,
        tax_amount: item.taxAmount || 0,
        hsn_code: item.hsnCode || null,
        primary_unit: item.primaryUnit || 'Piece',
      }));
      await supabase.from('purchase_order_items').insert(itemRows);
    }

    return { success: true, order };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create purchase order' };
  }
}

export async function updatePurchaseOrderStatus(
  orderId: string,
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled'
): Promise<{ success: boolean; error?: string }> {
  try {
    const updateData: any = { status };
    if (status === 'received') updateData.actual_delivery = new Date().toISOString();

    const { error } = await supabase.from('purchase_orders').update(updateData).eq('id', orderId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update purchase order' };
  }
}

// ============================================
// Purchase Invoice APIs (Direct Supabase)
// ============================================

export async function getPurchaseInvoices(): Promise<{ success: boolean; invoices?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('*')
      .eq('business_id', ctx.businessId)
      .order('invoice_date', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, invoices: data || [] };
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
  subtotal: number;
  taxAmount: number;
  totalAmount: number;
  paidAmount?: number;
  paymentMethod?: string;
  paymentStatus?: 'paid' | 'pending' | 'overdue';
  deliveryStatus?: 'pending' | 'received' | 'partial' | 'cancelled';
  expectedDelivery?: string;
  notes?: string;
  staffId?: string;
  staffName?: string;
  locationId?: string;
}): Promise<{ success: boolean; invoice?: any; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const paidAmount = params.paidAmount || 0;
    const balance = params.totalAmount - paidAmount;

    const { data: invoice, error } = await supabase
      .from('purchase_invoices')
      .insert({
        business_id: ctx.businessId,
        invoice_number: params.invoiceNumber,
        purchase_order_id: params.purchaseOrderId || null,
        po_number: params.poNumber || null,
        supplier_id: params.supplierId || null,
        supplier_name: params.supplierName,
        subtotal: params.subtotal,
        tax_amount: params.taxAmount,
        total_amount: params.totalAmount,
        paid_amount: paidAmount,
        balance_amount: Math.max(0, balance),
        payment_method: params.paymentMethod || 'cash',
        payment_status: params.paymentStatus || (paidAmount >= params.totalAmount ? 'paid' : 'pending'),
        delivery_status: params.deliveryStatus || 'pending',
        expected_delivery: params.expectedDelivery || null,
        notes: params.notes || null,
        staff_id: params.staffId || null,
        staff_name: params.staffName || null,
        location_id: params.locationId || null,
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };

    if (params.items.length > 0) {
      const itemRows = params.items.map(item => ({
        purchase_invoice_id: invoice.id,
        product_id: item.productId || null,
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
      }));
      await supabase.from('purchase_invoice_items').insert(itemRows);
    }

    // Add stock for received purchase items
    if (params.deliveryStatus === 'received') {
      for (const item of params.items) {
        if (item.productId) {
          const { data: product } = await supabase
            .from('products')
            .select('current_stock')
            .eq('id', item.productId)
            .single();
          if (product) {
            const newStock = (product.current_stock || 0) + item.quantity;
            await supabase.from('products').update({ current_stock: newStock }).eq('id', item.productId);
            await supabase.from('inventory_logs').insert({
              business_id: ctx.businessId,
              product_id: item.productId,
              transaction_type: 'purchase',
              quantity_change: item.quantity,
              balance_after: newStock,
              reference_type: 'purchase_invoice',
              reference_id: invoice.id,
              reference_number: params.invoiceNumber,
              location_id: params.locationId || null,
              staff_name: params.staffName || null,
              supplier_name: params.supplierName,
              unit_price: item.unitPrice,
              total_value: item.totalPrice,
              created_by: ctx.userId,
            });
          }
        }
      }
    }

    return { success: true, invoice };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create purchase invoice' };
  }
}

// ============================================
// Notifications APIs (Direct Supabase)
// ============================================

export async function getNotifications(): Promise<{ success: boolean; notifications?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('notifications')
      .select('*')
      .eq('business_id', ctx.businessId)
      .order('created_at', { ascending: false })
      .limit(100);

    if (error) return { success: false, error: error.message };
    return { success: true, notifications: data || [] };
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
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data: userProfile } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', ctx.userId)
      .single();

    const { data, error } = await supabase
      .from('notifications')
      .insert({
        business_id: ctx.businessId,
        type: params.type,
        category: params.category,
        title: params.title,
        message: params.message,
        priority: params.priority || 'medium',
        action_required: params.actionRequired || false,
        related_entity_type: params.relatedEntityType || null,
        related_entity_id: params.relatedEntityId || null,
        related_entity_name: params.relatedEntityName || null,
        created_by_user_id: ctx.userId,
        created_by_name: userProfile?.full_name || null,
        assigned_to_user_id: params.assignedToUserId || null,
        assigned_to_name: params.assignedToName || null,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, notification: data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create notification' };
  }
}

export async function updateNotificationStatus(
  notificationId: string,
  status: 'read' | 'acknowledged' | 'resolved'
): Promise<{ success: boolean; error?: string }> {
  try {
    const { error } = await supabase.from('notifications').update({ status }).eq('id', notificationId);
    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to update notification' };
  }
}

// ============================================
// Marketing Campaign APIs (Direct Supabase)
// ============================================

export async function getCampaigns(): Promise<{ success: boolean; campaigns?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .select('*')
      .eq('business_id', ctx.businessId)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, campaigns: data || [] };
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
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('marketing_campaigns')
      .insert({
        business_id: ctx.businessId,
        name: params.name,
        platform: params.platform || null,
        start_date: params.startDate || null,
        end_date: params.endDate || null,
        budget: params.budget || 0,
        status: params.status || 'pending',
        target_audience: params.targetAudience || [],
        objective: params.objective || null,
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (error) return { success: false, error: error.message };
    return { success: true, campaign: data };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to create campaign' };
  }
}

// ============================================
// Receivables (Computed from Invoices)
// ============================================

export async function getReceivables(): Promise<{ success: boolean; receivables?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('invoices')
      .select('customer_id, customer_name, customer_type, balance_amount, payment_status, invoice_date, invoice_number')
      .eq('business_id', ctx.businessId)
      .gt('balance_amount', 0)
      .order('invoice_date', { ascending: true });

    if (error) return { success: false, error: error.message };

    // Group by customer
    const customerMap = new Map<string, any>();
    for (const inv of (data || [])) {
      const key = inv.customer_id || inv.customer_name;
      if (!customerMap.has(key)) {
        customerMap.set(key, {
          id: inv.customer_id || key,
          customerId: inv.customer_id,
          customerName: inv.customer_name,
          customerType: inv.customer_type,
          totalReceivable: 0,
          invoiceCount: 0,
          oldestInvoiceDate: inv.invoice_date,
          status: 'current' as string,
        });
      }
      const entry = customerMap.get(key);
      entry.totalReceivable += Number(inv.balance_amount);
      entry.invoiceCount += 1;
    }

    return { success: true, receivables: Array.from(customerMap.values()) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch receivables' };
  }
}

// ============================================
// Payables (Computed from Purchase Invoices)
// ============================================

export async function getPayables(): Promise<{ success: boolean; payables?: any[]; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data, error } = await supabase
      .from('purchase_invoices')
      .select('supplier_id, supplier_name, balance_amount, payment_status, invoice_date, invoice_number')
      .eq('business_id', ctx.businessId)
      .gt('balance_amount', 0)
      .order('invoice_date', { ascending: true });

    if (error) return { success: false, error: error.message };

    const supplierMap = new Map<string, any>();
    for (const inv of (data || [])) {
      const key = inv.supplier_id || inv.supplier_name;
      if (!supplierMap.has(key)) {
        supplierMap.set(key, {
          id: inv.supplier_id || key,
          supplierId: inv.supplier_id,
          supplierName: inv.supplier_name,
          totalPayable: 0,
          billCount: 0,
          oldestBillDate: inv.invoice_date,
          status: 'current' as string,
        });
      }
      const entry = supplierMap.get(key);
      entry.totalPayable += Number(inv.balance_amount);
      entry.billCount += 1;
    }

    return { success: true, payables: Array.from(supplierMap.values()) };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to fetch payables' };
  }
}

// ============================================
// Invoice Number Generation
// ============================================

export async function getNextInvoiceNumber(): Promise<{ success: boolean; invoiceNumber?: string; error?: string }> {
  try {
    const ctx = await getUserBusinessId();
    if (!ctx) return { success: false, error: 'Authentication required' };

    const { data: settings } = await supabase
      .from('business_settings')
      .select('invoice_prefix, last_invoice_number')
      .eq('business_id', ctx.businessId)
      .single();

    const prefix = settings?.invoice_prefix || 'INV';
    const lastNumber = settings?.last_invoice_number || 0;
    const nextNumber = lastNumber + 1;

    const paddedNumber = String(nextNumber).padStart(4, '0');
    const invoiceNumber = `${prefix}-${paddedNumber}`;

    // Update the counter
    await supabase
      .from('business_settings')
      .update({ last_invoice_number: nextNumber })
      .eq('business_id', ctx.businessId);

    return { success: true, invoiceNumber };
  } catch (error: any) {
    return { success: false, error: error.message || 'Failed to generate invoice number' };
  }
}
