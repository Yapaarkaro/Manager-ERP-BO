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
export async function callEdgeFunction(
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
  
  // Handle 404 gracefully - edge function may not be deployed
  if (!result.success && result.error?.includes('404')) {
    console.warn('⚠️ manage-addresses edge function not found (404). This may not be deployed yet.');
    return {
      success: true,
      addresses: [],
    };
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
  
  // Handle 404 gracefully - edge function may not be deployed
  if (!result.success && result.error?.includes('404')) {
    console.warn('⚠️ manage-bank-accounts edge function not found (404). This may not be deployed yet.');
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

// ============================================
// Supplier APIs (Direct Supabase)
// ============================================

/**
 * Get all suppliers for the current business
 */
export async function getSuppliers(): Promise<{ success: boolean; suppliers?: any[]; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get business_id from user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.business_id) {
      return { success: false, error: 'Business not found' };
    }

    const { data, error } = await supabase
      .from('suppliers')
      .select('*')
      .eq('business_id', userData.business_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching suppliers:', error);
      return { success: false, error: error.message };
    }

    return { success: true, suppliers: data || [] };
  } catch (error: any) {
    console.error('Error in getSuppliers:', error);
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get business_id from user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.business_id) {
      return { success: false, error: 'Business not found' };
    }

    const { data, error } = await supabase
      .from('suppliers')
      .insert({
        business_id: userData.business_id,
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
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating supplier:', error);
      return { success: false, error: error.message };
    }

    return { success: true, supplier: data };
  } catch (error: any) {
    console.error('Error in createSupplier:', error);
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    const updateData: any = {
      updated_by: session.user.id,
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
      console.error('Error updating supplier:', error);
      return { success: false, error: error.message };
    }

    return { success: true, supplier: data };
  } catch (error: any) {
    console.error('Error in updateSupplier:', error);
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
      console.error('Error deleting supplier:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteSupplier:', error);
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get business_id from user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.business_id) {
      return { success: false, error: 'Business not found' };
    }

    const { data, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', userData.business_id)
      .order('created_at', { ascending: false });

    if (error) {
      console.error('Error fetching products:', error);
      return { success: false, error: error.message };
    }

    return { success: true, products: data || [] };
  } catch (error: any) {
    console.error('Error in getProducts:', error);
    return { success: false, error: error.message || 'Failed to fetch products' };
  }
}

/**
 * Get inventory logs for a product from inventory_logs table
 * Includes location information for each transaction
 */
export async function getProductInventoryLogs(productId: string): Promise<{ success: boolean; logs?: any[]; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get business_id from user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.business_id) {
      return { success: false, error: 'Business not found' };
    }

    // Fetch inventory logs from inventory_logs table
    const { data: logs, error: logsError } = await supabase
      .from('inventory_logs')
      .select('*')
      .eq('business_id', userData.business_id)
      .eq('product_id', productId)
      .order('transaction_date', { ascending: false })
      .limit(100);

    if (logsError) {
      console.error('Error fetching inventory logs:', logsError);
      return { success: false, error: logsError.message };
    }

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
    console.error('Error in getProductInventoryLogs:', error);
    return { success: false, error: error.message || 'Failed to fetch inventory logs' };
  }
}

/**
 * Get location stock for a product (all locations where product has stock)
 */
export async function getProductLocationStock(productId: string): Promise<{ success: boolean; locationStock?: any[]; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get business_id from user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.business_id) {
      return { success: false, error: 'Business not found' };
    }

    // Fetch location stock from location_stock table
    const { data: locationStock, error: locationStockError } = await supabase
      .from('location_stock')
      .select('*')
      .eq('product_id', productId)
      .order('quantity', { ascending: false });

    if (locationStockError) {
      console.error('Error fetching location stock:', locationStockError);
      return { success: false, error: locationStockError.message };
    }

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
    console.error('Error in getProductLocationStock:', error);
    return { success: false, error: error.message || 'Failed to fetch location stock' };
  }
}

/**
 * Get inventory logs for a product filtered by location (optional)
 */
export async function getProductInventoryLogsByLocation(
  productId: string, 
  locationId?: string
): Promise<{ success: boolean; logs?: any[]; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get business_id from user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.business_id) {
      return { success: false, error: 'Business not found' };
    }

    // Build query with optional location filter
    let query = supabase
      .from('inventory_logs')
      .select('*')
      .eq('business_id', userData.business_id)
      .eq('product_id', productId);

    if (locationId) {
      query = query.eq('location_id', locationId);
    }

    const { data: logs, error: logsError } = await query
      .order('transaction_date', { ascending: false })
      .limit(100);

    if (logsError) {
      console.error('Error fetching inventory logs:', logsError);
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
    console.error('Error in getProductInventoryLogsByLocation:', error);
    return { success: false, error: error.message || 'Failed to fetch inventory logs' };
  }
}

/**
 * Get low stock products (where current_stock <= min_stock_level)
 */
export async function getLowStockProducts(): Promise<{ success: boolean; products?: any[]; error?: string }> {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get business_id from user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.business_id) {
      return { success: false, error: 'Business not found' };
    }

    // First get all products, then filter in JavaScript for low stock
    // (Supabase doesn't support comparing two columns directly in a filter)
    const { data: allProducts, error } = await supabase
      .from('products')
      .select('*')
      .eq('business_id', userData.business_id)
      .gt('min_stock_level', 0)
      .order('urgency_level', { ascending: false })
      .order('current_stock', { ascending: true });

    if (error) {
      console.error('Error fetching products for low stock:', error);
      return { success: false, error: error.message };
    }

    // Filter products where current_stock <= min_stock_level
    const lowStockProducts = (allProducts || []).filter(
      (product) => product.current_stock <= product.min_stock_level
    );

    return { success: true, products: lowStockProducts };
  } catch (error: any) {
    console.error('Error in getLowStockProducts:', error);
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.business_id) {
      return { success: false, error: 'Business not found' };
    }

    const { data: barcode, error } = await supabase.rpc('reserve_assigned_barcode', {
      p_business_id: userData.business_id,
      p_location_id: params?.locationId || null,
    });

    if (error) {
      console.error('Error assigning barcode:', error);
      return { success: false, error: error.message };
    }

    if (!barcode || typeof barcode !== 'string') {
      return { success: false, error: 'Failed to generate barcode' };
    }

    return { success: true, barcode };
  } catch (error: any) {
    console.error('Error in assignBarcode:', error);
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    // Get business_id from user profile
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', session.user.id)
      .single();

    if (userError || !userData?.business_id) {
      return { success: false, error: 'Business not found' };
    }

    const { data, error } = await supabase
      .from('products')
      .insert({
        business_id: userData.business_id,
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
        created_by: session.user.id,
      })
      .select()
      .single();

    if (error) {
      console.error('Error creating product:', error);
      return { success: false, error: error.message };
    }

    // If location is specified, create location_stock entry
    // If opening stock > 0, also create inventory log entry
    const openingStock = params.openingStock || 0;
    const locationId = params.storageLocationId;
    
    if (locationId) {
      try {
        // Get user's full name for staff_name
        const { data: userProfile } = await supabase
          .from('users')
          .select('full_name')
          .eq('id', session.user.id)
          .single();

        // Get location name if not provided
        let locationName = params.storageLocationName;
        if (!locationName) {
          const { data: locationData } = await supabase
            .from('locations')
            .select('name')
            .eq('id', locationId)
            .single();
          locationName = locationData?.name || null;
        }

        // Create or update location_stock entry (always create, even if stock is 0)
        const { error: locationStockError } = await supabase
          .from('location_stock')
          .upsert({
            product_id: data.id,
            location_id: locationId,
            quantity: openingStock,
            last_updated: new Date().toISOString(),
            updated_by: session.user.id,
          }, {
            onConflict: 'product_id,location_id'
          });

        if (locationStockError) {
          console.error('Error creating location_stock:', locationStockError);
          // Don't fail the product creation if location_stock creation fails, but log the error
        }

        // Create inventory log entry for opening stock (only if opening stock > 0)
        if (openingStock > 0) {
          const { error: logError } = await supabase
            .from('inventory_logs')
            .insert({
              business_id: userData.business_id,
              product_id: data.id,
              transaction_type: 'opening_stock',
              quantity_change: openingStock,
              balance_after: openingStock,
              location_id: locationId,
              location_name: locationName,
              staff_id: session.user.id,
              staff_name: userProfile?.full_name || null,
              unit_price: params.purchasePrice || params.perUnitPrice || 0,
              total_value: (params.purchasePrice || params.perUnitPrice || 0) * openingStock,
              reference_type: 'manual',
              notes: 'Opening stock recorded during product creation',
              created_by: session.user.id,
            });

          if (logError) {
            console.error('Error creating inventory log:', logError);
            // Don't fail the product creation if log creation fails, but log the error
          }
        }
      } catch (stockError: any) {
        console.error('Error recording opening stock:', stockError);
        // Don't fail the product creation if stock recording fails, but log the error
      }
    }

    return { success: true, product: data };
  } catch (error: any) {
    console.error('Error in createProduct:', error);
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
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.user) {
      return { success: false, error: 'Authentication required' };
    }

    const updateData: any = {
      updated_by: session.user.id,
    };

    // Add all provided fields to update
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

    if (error) {
      console.error('Error updating product:', error);
      return { success: false, error: error.message };
    }

    return { success: true, product: data };
  } catch (error: any) {
    console.error('Error in updateProduct:', error);
    return { success: false, error: error.message || 'Failed to update product' };
  }
}

/**
 * Delete a product
 */
export async function deleteProduct(productId: string): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase
      .from('products')
      .delete()
      .eq('id', productId);

    if (error) {
      console.error('Error deleting product:', error);
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch (error: any) {
    console.error('Error in deleteProduct:', error);
    return { success: false, error: error.message || 'Failed to delete product' };
  }
}
