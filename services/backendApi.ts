/**
 * Backend API Service
 * Handles all calls to Supabase Edge Functions
 */

import { EDGE_FUNCTIONS_URL, supabase, SUPABASE_ANON_KEY } from '@/lib/supabase';

// Lazy import to avoid circular dependency
let clearBusinessDataCache: (() => void) | null = null;
const getClearCache = () => {
  if (!clearBusinessDataCache) {
    const module = require('@/hooks/useBusinessData');
    clearBusinessDataCache = module.clearBusinessDataCache;
  }
  return clearBusinessDataCache;
};

// Helper to call Edge Functions
async function callEdgeFunction(
  functionName: string,
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' = 'POST',
  body?: any,
  requireAuth: boolean = false
): Promise<{ success: boolean; data?: any; error?: string }> {
  try {
    // Check authentication if required
    if (requireAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return {
          success: false,
          error: 'Authentication required. Please sign in first.',
        };
      }
    }

    // Try using Supabase's functions.invoke() first (only for POST requests)
    // This handles CORS automatically and is more reliable on web
    if (method === 'POST') {
      try {
        const response = await supabase.functions.invoke(functionName, {
          body: body || {},
        });

        if (response.error) {
          console.error(`Error calling ${functionName} via functions.invoke():`, response.error);
          // Fall through to fetch fallback
        } else {
          return {
            success: true,
            data: response.data,
          };
        }
      } catch (invokeError: any) {
        console.warn(`Supabase functions.invoke() failed for ${functionName}, falling back to fetch:`, invokeError);
        // Fall through to fetch fallback
      }
    }

    // For GET, PUT, DELETE, or if POST invoke() failed, use fetch
    // This ensures compatibility with all HTTP methods
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    };

    if (requireAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.access_token) {
        headers['Authorization'] = `Bearer ${session.access_token}`;
      }
    }

    const options: RequestInit = {
      method,
      headers,
      // Add credentials for CORS (important for web)
      credentials: 'omit', // Don't send cookies, but allow CORS
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    // ✅ Enhanced logging for PUT requests to debug the issue
    if (method === 'PUT') {
      console.log(`🔄 Making PUT request to ${functionName}:`, {
        url: `${EDGE_FUNCTIONS_URL}/${functionName}`,
        hasBody: !!body,
        bodyKeys: body ? Object.keys(body) : [],
        headers: Object.keys(headers),
      });
    }
    
    const response = await fetch(`${EDGE_FUNCTIONS_URL}/${functionName}`, options);
    
    // ✅ Enhanced error logging for failed requests
    if (!response.ok) {
      console.error(`❌ ${method} request to ${functionName} failed:`, {
        status: response.status,
        statusText: response.statusText,
        url: `${EDGE_FUNCTIONS_URL}/${functionName}`,
        method,
        hasBody: !!body,
      });
    }
    
    // Handle non-JSON responses
    let data: any;
    const contentType = response.headers.get('content-type');
    if (contentType && contentType.includes('application/json')) {
      try {
        data = await response.json();
      } catch (jsonError) {
        console.error(`Error parsing JSON response from ${functionName}:`, jsonError);
        return {
          success: false,
          error: 'Invalid response format from server',
        };
      }
    } else {
      // For non-JSON responses, try to get text
      const text = await response.text();
      data = { message: text || 'No response data' };
    }

    if (!response.ok) {
      // Provide more detailed error information
      const errorMessage = data.error || data.message || `Request failed with status ${response.status}`;
      console.error(`Error calling ${functionName}:`, {
        status: response.status,
        statusText: response.statusText,
        error: errorMessage,
        data,
      });
      return {
        success: false,
        error: errorMessage,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error(`❌ Error calling ${functionName} (${method}):`, error);
    // Handle network errors more gracefully with detailed messages
    if (error.name === 'TypeError' && (error.message.includes('fetch') || error.message === 'Failed to fetch')) {
      // This usually indicates CORS issue or network problem
      console.error(`❌ Network error details for ${functionName} (${method}):`, {
        message: error.message,
        stack: error.stack,
        url: `${EDGE_FUNCTIONS_URL}/${functionName}`,
        method,
        hasBody: !!body,
        bodyType: body ? typeof body : 'none',
        // ✅ Log if this is a PUT request (which might have CORS issues)
        isPutRequest: method === 'PUT',
      });
      
      // ✅ Provide more specific error message for PUT requests
      if (method === 'PUT') {
        return {
          success: false,
          error: 'Failed to update resource. This may be due to a network issue or CORS configuration. Please check your internet connection and try again. If the problem persists, the Edge Function may need to be reconfigured to accept PUT requests.',
        };
      }
      
      return {
        success: false,
        error: 'Network error. Please check your internet connection and try again. If the problem persists, the Edge Function may not be deployed.',
      };
    }
    return {
      success: false,
      error: error.message || 'Network error. Please check your connection.',
    };
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
  
  console.log('🔍 verifyMobileOTP - Raw API result:', result);
  console.log('🔍 verifyMobileOTP - result.data:', result.data);
  
  // Check if the response indicates success
  if (result.success) {
    // The Edge Function returns { success: true, mobileVerified: true, message: ... }
    if (result.data?.mobileVerified || result.data?.success) {
      return {
        success: true,
        mobileVerified: true,
      };
    }
  }
  
  // If we get here, verification failed
  const errorMessage = result.error || result.data?.error || 'OTP verification failed';
  console.log('❌ verifyMobileOTP failed:', errorMessage);
  
  return {
    success: false,
    error: errorMessage,
  };
}

/**
 * Verify GSTIN
 * @param gstin - 15-character GSTIN number
 */
export async function verifyGSTIN(
  gstin: string
): Promise<{ success: boolean; taxpayerInfo?: any; error?: string }> {
  // GSTIN verification now requires authentication (JWT)
  const result = await callEdgeFunction('verify-gstin', 'POST', { gstin }, true);
  
  console.log('🔍 verifyGSTIN - Raw API result:', result);
  console.log('🔍 verifyGSTIN - result.data:', result.data);
  
  if (result.success && result.data?.taxpayerInfo) {
    return {
      success: true,
      taxpayerInfo: result.data.taxpayerInfo,
    };
  }
  
  const errorMessage = result.error || result.data?.message || result.data?.error || 'GSTIN verification failed';
  console.log('❌ verifyGSTIN failed:', errorMessage);
  
  return {
    success: false,
    error: errorMessage,
  };
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
  // GSTIN OTP verification now requires authentication (JWT)
  const result = await callEdgeFunction('verify-gstin-otp', 'POST', { gstin, otp }, true);
  
  console.log('🔍 verifyGSTINOTP - Raw API result:', result);
  
  if (result.success && (result.data?.gstinVerified || result.data?.success)) {
    return {
      success: true,
      gstinVerified: true,
    };
  }
  
  const errorMessage = result.error || result.data?.error || 'GSTIN OTP verification failed';
  console.log('❌ verifyGSTINOTP failed:', errorMessage);
  
  return {
    success: false,
    error: errorMessage,
  };
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
  // PAN verification now requires authentication (JWT)
  const result = await callEdgeFunction('verify-pan', 'POST', { pan, name, dateOfBirth }, true);
  
  console.log('🔍 verifyPAN - Raw API result:', result);
  
  if (result.success && (result.data?.panVerified || result.data?.success)) {
    return {
      success: true,
      panVerified: true,
    };
  }
  
  const errorMessage = result.error || result.data?.error || 'PAN verification failed';
  console.log('❌ verifyPAN failed:', errorMessage);
  
  return {
    success: false,
    error: errorMessage,
  };
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
      userId: user.id,
      ownerName: params.ownerName,
      businessName: params.businessName,
      businessType: params.businessType,
      taxIdType: params.taxIdType,
      taxIdValue: params.taxIdValue,
      gstinData: params.gstinData ? JSON.stringify(params.gstinData) : null,
      dateOfBirth: params.dateOfBirth || null,
      registeredMobile: mobileNumber, // Include mobile number
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
  
  console.log('🔄 updateAddress - Request body:', {
    addressId: requestBody.addressId,
    hasName: !!requestBody.name,
    hasAddressJson: !!requestBody.addressJson,
    hasType: !!requestBody.type,
    hasManagerName: !!requestBody.managerName,
    hasManagerMobileNumber: !!requestBody.managerMobileNumber,
    isPrimary: requestBody.isPrimary,
  });
  
  // ✅ Use POST instead of PUT to avoid CORS issues on web
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
  
  console.log('🔄 updateBankAccount - Request body:', {
    action: requestBody.action,
    accountId: requestBody.accountId,
    hasBankName: !!requestBody.bankName,
    hasAccountHolderName: !!requestBody.accountHolderName,
    hasAccountNumber: !!requestBody.accountNumber,
    hasIfscCode: !!requestBody.ifscCode,
    hasAccountType: !!requestBody.accountType,
    hasInitialBalance: requestBody.initialBalance !== undefined,
    isPrimary: requestBody.isPrimary,
  });
  
  // ✅ Use POST instead of PUT to avoid CORS issues on web
  // The Edge Function now accepts POST requests with action: 'update' for updates
  // This allows us to use supabase.functions.invoke() which handles CORS automatically
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    // Get user's business_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.business_id) {
      return {
        success: false,
        error: 'Business not found',
      };
    }

    // Update businesses table
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ primary_address_id: addressId })
      .eq('id', userData.business_id);

    if (updateError) {
      console.error('Error updating primary_address_id:', updateError);
      return {
        success: false,
        error: updateError.message,
      };
    }

    // Clear cache so data refreshes
    getClearCache()?.();
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating primary address:', error);
    return {
      success: false,
      error: error.message || 'Failed to update primary address',
    };
  }
}

/**
 * Update primary bank account ID in businesses table
 */
export async function updateBusinessPrimaryBankAccount(accountId: string | null): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return {
        success: false,
        error: 'Authentication required',
      };
    }

    // Get user's business_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.business_id) {
      return {
        success: false,
        error: 'Business not found',
      };
    }

    // Update businesses table
    const { error: updateError } = await supabase
      .from('businesses')
      .update({ primary_bank_account_id: accountId })
      .eq('id', userData.business_id);

    if (updateError) {
      console.error('Error updating primary_bank_account_id:', updateError);
      return {
        success: false,
        error: updateError.message,
      };
    }

    // Clear cache so data refreshes
    getClearCache()?.();
    
    return { success: true };
  } catch (error: any) {
    console.error('Error updating primary bank account:', error);
    return {
      success: false,
      error: error.message || 'Failed to update primary bank account',
    };
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
    // Get current user's business_id
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'User not authenticated' };
    }

    // Get user's business_id
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.business_id) {
      return { success: false, error: 'Business not found' };
    }

    // Check if subscription already exists
    const { data: existingSubscription } = await supabase
      .from('subscriptions')
      .select('id')
      .eq('business_id', userData.business_id)
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
        console.error('Error updating subscription:', error);
        return { success: false, error: error.message };
      }

      getClearCache()?.();
      return { success: true, subscription: data };
    } else {
      // Create new subscription
      const { data, error } = await supabase
        .from('subscriptions')
        .insert({
          business_id: userData.business_id,
          is_on_trial: subscriptionData.isOnTrial,
          trial_start_date: subscriptionData.trialStartDate || null,
          trial_end_date: subscriptionData.trialEndDate || null,
          status: subscriptionData.status,
        })
        .select()
        .single();

      if (error) {
        console.error('Error creating subscription:', error);
        return { success: false, error: error.message };
      }

      getClearCache()?.();
      return { success: true, subscription: data };
    }
  } catch (error: any) {
    console.error('Error in createOrUpdateSubscription:', error);
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
 */
export async function deleteSignupProgress(): Promise<{ success: boolean; error?: string }> {
  try {
    // For DELETE requests, pass an empty object instead of undefined to ensure proper request formatting
    const result = await callEdgeFunction('manage-signup-progress', 'DELETE', {}, true);
    
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
    console.error('Error deleting signup progress:', error);
    // Return success: true for network errors during cleanup - this is non-blocking cleanup
    // The signup is already complete, so failing to delete progress shouldn't block the user
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      console.warn('⚠️ Network error during signup progress deletion (non-blocking):', error.message);
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
  console.log('📱 Calling saveDeviceSnapshot with:', { deviceId: snapshot.deviceId });
  
  try {
    const result = await callEdgeFunction('manage-device-snapshots', 'POST', snapshot, true);
    
    console.log('📱 saveDeviceSnapshot raw result:', JSON.stringify(result, null, 2));
    
    // Edge Function returns { success: true, message: "...", snapshot: {...} }
    // callEdgeFunction wraps it in result.data, so result.data = { success: true, message: "...", snapshot: {...} }
    if (result.success && result.data) {
      // Check for snapshot in the response
      if (result.data.snapshot) {
        console.log('✅ Device snapshot saved successfully:', result.data.snapshot.id);
        return {
          success: true,
          snapshot: result.data.snapshot,
        };
      }
      
      // If no snapshot but success is true, check if the data itself is the snapshot
      if (result.data.id && result.data.device_id) {
        console.log('✅ Device snapshot saved (data is snapshot):', result.data.id);
        return {
          success: true,
          snapshot: result.data,
        };
      }
      
      // If we have success but no snapshot data, log for debugging
      console.warn('⚠️ Success but no snapshot data in response:', result.data);
    }
    
    const errorMsg = result.error || result.data?.error || result.data?.message || 'Failed to save device snapshot';
    console.error('❌ Failed to save device snapshot:', errorMsg);
    return {
      success: false,
      error: errorMsg,
    };
  } catch (error: any) {
    console.error('❌ Exception in saveDeviceSnapshot:', error);
    return {
      success: false,
      error: error.message || 'Exception saving device snapshot',
    };
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
    
    console.log('🔍 getStaff API response:', {
      success: result.success,
      hasData: !!result.data,
      dataType: typeof result.data,
      isArray: Array.isArray(result.data),
      dataKeys: result.data ? Object.keys(result.data) : [],
      error: result.error
    });
    
    // Handle different response structures
    if (result.success && result.data) {
      // Case 1: Staff array is directly in result.data
      if (Array.isArray(result.data)) {
        console.log('✅ Staff array found directly in result.data, count:', result.data.length);
        return {
          success: true,
          staff: result.data,
        };
      }
      
      // Case 2: Staff array is in result.data.staff
      if (Array.isArray(result.data.staff)) {
        console.log('✅ Staff array found in result.data.staff, count:', result.data.staff.length);
        return {
          success: true,
          staff: result.data.staff,
        };
      }
      
      // Case 3: Staff array is in result.data.data
      if (Array.isArray(result.data.data)) {
        console.log('✅ Staff array found in result.data.data, count:', result.data.data.length);
        return {
          success: true,
          staff: result.data.data,
        };
      }
      
      console.warn('⚠️ Unexpected response structure:', result.data);
    }
    
    return {
      success: false,
      error: result.error || 'Failed to fetch staff - unexpected response structure',
    };
  } catch (error: any) {
    console.error('❌ Error in getStaff:', error);
    return {
      success: false,
      error: error.message || 'Failed to fetch staff - network error',
    };
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
    console.warn('⚠️ Staff creation failed (Edge Function may not be deployed):', result.error);
    return {
      success: false,
      error: result.error || 'Failed to create staff - Edge Function may not be available',
    };
  } catch (error: any) {
    // Catch any unexpected errors and return gracefully
    console.warn('⚠️ Staff creation error (non-blocking):', error);
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

