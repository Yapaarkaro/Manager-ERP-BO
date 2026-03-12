/**
 * Backend Sync Service
 * 
 * All writes go directly to the Supabase backend (single source of truth).
 * No local DataStore intermediary - screens pass data via route params
 * and read from backend via useBusinessData() hook.
 */

import { 
  createAddress, 
  updateAddress, 
  createBankAccount, 
  updateBankAccount,
  saveSignupProgress,
  submitBusinessDetails,
  createStaff,
  updateStaff
} from '@/services/backendApi';
import type { BusinessAddress } from './dataStore';

export interface SyncResult {
  success: boolean;
  error?: string;
  data?: any;
}

export interface SyncOptions {
  showError?: boolean;
  revertOnError?: boolean;
  errorMessage?: string;
  awaitSync?: boolean;
}

/**
 * Create address directly in Supabase backend
 */
export async function optimisticAddAddress(
  address: BusinessAddress,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const syncPromise = (async () => {
    try {
      const result = await createAddress({
        name: address.name,
        addressJson: {
          doorNumber: address.doorNumber,
          addressLine1: address.addressLine1,
          addressLine2: address.addressLine2,
          additionalLines: address.additionalLines || [],
          city: address.city,
          pincode: address.pincode,
          stateName: address.stateName,
          stateCode: address.stateCode,
          formatted_address: `${address.addressLine1}, ${address.addressLine2}, ${address.city}, ${address.stateName} - ${address.pincode}`,
        },
        type: address.type,
        managerName: address.manager,
        managerMobileNumber: address.phone,
        isPrimary: address.isPrimary,
        latitude: undefined,
        longitude: undefined,
      });

      if (result.success && result.address) {
        console.log('✅ Address created in backend:', result.address.id);
        return { success: true, data: result.address };
      } else {
        throw new Error(result.error || 'Failed to create address in backend');
      }
    } catch (error: any) {
      console.error('❌ Failed to create address in backend:', error);
      return { success: false, error: error.message };
    }
  })();

  if (options.awaitSync) {
    return await syncPromise;
  }
  syncPromise.catch(() => {});
  return { success: true };
}

/**
 * Update address directly in Supabase backend
 */
export async function optimisticUpdateAddress(
  addressId: string,
  updates: Partial<BusinessAddress>,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const backendId = updates.backendId || addressId;
  
  const syncPromise = (async (): Promise<SyncResult> => {
    try {
      const result = await updateAddress({
        addressId: backendId,
        name: updates.name,
        addressJson: updates.addressLine1 ? {
          doorNumber: updates.doorNumber || '',
          addressLine1: updates.addressLine1 || '',
          addressLine2: updates.addressLine2 || '',
          additionalLines: updates.additionalLines || [],
          city: updates.city || '',
          pincode: updates.pincode || '',
          stateName: updates.stateName || '',
          stateCode: updates.stateCode || '',
          formatted_address: `${updates.addressLine1}, ${updates.addressLine2}, ${updates.city}, ${updates.stateName} - ${updates.pincode}`,
        } : undefined,
        type: updates.type,
        managerName: updates.manager,
        managerMobileNumber: updates.phone,
        isPrimary: updates.isPrimary,
      });

      if (result.success) {
        console.log('✅ Address updated in backend:', backendId);
        return { success: true, data: result.address };
      } else {
        throw new Error(result.error || 'Failed to update address in backend');
      }
    } catch (error: any) {
      console.error('❌ Failed to update address in backend:', error);
      return { success: false, error: error.message || 'Failed to update address in backend' };
    }
  })();

  if (options.awaitSync) {
    return await syncPromise;
  }
  syncPromise.catch(() => {});
  return { success: true };
}

/**
 * Create bank account directly in Supabase backend
 */
export async function optimisticAddBankAccount(
  account: any,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const syncPromise = (async (): Promise<SyncResult> => {
    try {
      const result = await createBankAccount({
        accountHolderName: account.accountHolderName,
        bankName: account.bankName,
        bankShortName: account.bankShortName,
        bankId: account.bankId,
        accountNumber: account.accountNumber,
        ifscCode: account.ifscCode,
        upiId: account.upiId || '',
        accountType: account.accountType === 'Savings' ? 'Savings' : 'Current',
        initialBalance: typeof account.initialBalance === 'number' ? account.initialBalance : parseFloat(account.initialBalance || '0'),
        isPrimary: account.isPrimary || false,
      });

      if (result.success && result.account) {
        console.log('✅ Bank account created in backend:', result.account.id);
        return { success: true, data: result.account };
      } else {
        throw new Error(result.error || 'Failed to create bank account in backend');
      }
    } catch (error: any) {
      console.error('❌ Failed to create bank account in backend:', error);
      return { success: false, error: error.message };
    }
  })();

  if (options.awaitSync) {
    return await syncPromise;
  }
  syncPromise.catch(() => {});
  return { success: true };
}

/**
 * Update bank account directly in Supabase backend
 */
export async function optimisticUpdateBankAccount(
  accountId: string,
  updates: any,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const backendId = updates.backendId || accountId;
  
  const syncPromise = (async (): Promise<SyncResult> => {
    try {
      const result = await updateBankAccount({
        accountId: backendId,
        accountHolderName: updates.accountHolderName,
        bankName: updates.bankName,
        bankShortName: updates.bankShortName,
        bankId: updates.bankId,
        accountNumber: updates.accountNumber,
        ifscCode: updates.ifscCode,
        upiId: updates.upiId || '',
        accountType: updates.accountType === 'Savings' ? 'Savings' : 'Current',
        isPrimary: updates.isPrimary || false,
      });

      if (result.success) {
        console.log('✅ Bank account updated in backend:', backendId);
        return { success: true };
      } else {
        throw new Error(result.error || 'Failed to update bank account in backend');
      }
    } catch (error: any) {
      console.error('❌ Failed to update bank account in backend:', error);
      return { success: false, error: error.message };
    }
  })();

  if (options.awaitSync) {
    return await syncPromise;
  }
  syncPromise.catch(() => {});
  return { success: true };
}

/**
 * Save signup progress directly to Supabase backend
 */
export async function optimisticSaveSignupProgress(
  progress: any,
  options: SyncOptions = {}
): Promise<SyncResult> {
  (async () => {
    try {
      const result = await saveSignupProgress(progress);
      if (result.success) {
        console.log('✅ Signup progress saved to backend');
      } else {
        console.warn('⚠️ Signup progress save failed:', result.error);
      }
    } catch (error: any) {
      console.error('❌ Failed to save signup progress:', error);
    }
  })();

  return { success: true };
}

/**
 * Submit business details directly to Supabase backend
 */
export async function optimisticSubmitBusinessDetails(
  params: {
    ownerName: string;
    businessName: string;
    businessType: string;
    taxIdType: 'GSTIN' | 'PAN';
    taxIdValue: string;
    gstinData?: any;
    dateOfBirth?: string;
    registeredMobile?: string;
  },
  options: SyncOptions = {}
): Promise<{ success: boolean; businessId?: string; error?: string }> {
  return await submitBusinessDetails(params);
}

/**
 * Sync all addresses to backend (used during signup flow transition)
 */
export async function syncAllAddressesToBackend(
  options: SyncOptions = {}
): Promise<{ success: boolean; synced: number; errors: string[] }> {
  // No longer needed since addresses are synced directly to backend during creation
  // Kept for backward compatibility with calling code
  return { success: true, synced: 0, errors: [] };
}
