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
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      'apikey': SUPABASE_ANON_KEY,
    };

    // Add JWT token if authentication is required
    if (requireAuth) {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session?.access_token) {
        return {
          success: false,
          error: 'Authentication required. Please sign in first.',
        };
      }
      headers['Authorization'] = `Bearer ${session.access_token}`;
    }

    const options: RequestInit = {
      method,
      headers,
    };

    if (body && method !== 'GET') {
      options.body = JSON.stringify(body);
    }

    const response = await fetch(`${EDGE_FUNCTIONS_URL}/${functionName}`, options);
    
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
      return {
        success: false,
        error: data.error || data.message || `Request failed with status ${response.status}`,
      };
    }

    return {
      success: true,
      data,
    };
  } catch (error: any) {
    console.error(`Error calling ${functionName}:`, error);
    // Handle network errors more gracefully
    if (error.name === 'TypeError' && error.message.includes('fetch')) {
      return {
        success: false,
        error: 'Network error. Please check your internet connection and try again.',
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
  const result = await callEdgeFunction(
    'manage-addresses',
    'PUT',
    {
      addressId: params.addressId,
      name: params.name,
      addressJson: params.addressJson 
        ? (typeof params.addressJson === 'string' 
            ? params.addressJson 
            : JSON.stringify(params.addressJson))
        : undefined,
      type: params.type,
      managerName: params.managerName,
      managerMobileNumber: params.managerMobileNumber,
      isPrimary: params.isPrimary,
      latitude: params.latitude !== undefined ? params.latitude : null,
      longitude: params.longitude !== undefined ? params.longitude : null,
    },
    true
  );

  if (result.success && result.data?.address) {
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
  const result = await callEdgeFunction(
    'manage-bank-accounts',
    'PUT',
    params,
    true
  );

  if (result.success && result.data?.account) {
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
    const result = await callEdgeFunction('manage-signup-progress', 'DELETE', undefined, true);
    
    return {
      success: result.success,
      error: result.error,
    };
  } catch (error: any) {
    console.error('Error deleting signup progress:', error);
    // Return success: false but don't throw - this is non-blocking
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

