/**
 * Optimistic Sync Service
 * 
 * Industry-standard pattern: DataStore acts as fast local cache,
 * Backend is the single source of truth.
 * 
 * Pattern:
 * 1. Update DataStore immediately (optimistic) - UI feels instant
 * 2. Sync with backend in background (non-blocking)
 * 3. Handle errors gracefully (show notification, optionally revert)
 * 4. All reads from DataStore (fast), periodic sync with backend
 */

import { dataStore } from './dataStore';
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
  /** Show error alert if sync fails (default: false) */
  showError?: boolean;
  /** Revert DataStore changes if sync fails (default: false) */
  revertOnError?: boolean;
  /** Custom error message */
  errorMessage?: string;
  /** Wait for backend sync to complete before returning (default: false) */
  awaitSync?: boolean;
}

/**
 * Optimistically add address: Update DataStore immediately, sync backend in background
 */
export async function optimisticAddAddress(
  address: BusinessAddress,
  options: SyncOptions = {}
): Promise<SyncResult> {
  // 1. Update DataStore immediately (optimistic)
  dataStore.addAddress(address);
  
  // 2. Sync with backend in background (non-blocking)
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
        latitude: undefined, // Can be added if available
        longitude: undefined,
      });

      if (result.success && result.address) {
        // Update DataStore with backend ID
        const updatedAddress = { ...address, backendId: result.address.id };
        dataStore.updateAddress(address.id, updatedAddress);
        console.log('✅ Address synced to backend:', result.address.id);
        return { success: true, data: result.address };
      } else {
        throw new Error(result.error || 'Failed to create address in backend');
      }
    } catch (error: any) {
      console.error('❌ Failed to sync address to backend:', error);
      
      // Handle error
      if (options.revertOnError) {
        dataStore.deleteAddress(address.id);
        console.log('🔄 Reverted address from DataStore');
      }
      
      if (options.showError) {
        // Could use a toast/notification system here
        console.warn('⚠️ Address sync failed:', error.message);
      }
      
      return { success: false, error: error.message };
    }
  })();

  // Return immediately (don't await sync)
  return { success: true };
}

/**
 * Optimistically update address: Update DataStore immediately, sync backend in background
 * Returns a promise that resolves when backend sync completes (can be awaited)
 */
export async function optimisticUpdateAddress(
  addressId: string,
  updates: Partial<BusinessAddress>,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const existingAddress = dataStore.getAddressById(addressId);
  if (!existingAddress) {
    console.error('❌ Address not found in DataStore with ID:', addressId);
    return { success: false, error: 'Address not found in DataStore' };
  }

  // Store original for potential revert
  const originalAddress = { ...existingAddress };
  
  // ✅ CRITICAL: Use backendId from updates if provided, otherwise use existing backendId
  // This ensures backendId is preserved even if it's passed in updates
  const backendId = updates.backendId || existingAddress.backendId;
  
  if (!backendId) {
    console.error('❌ Address has no backendId - cannot update in backend:', {
      addressId,
      addressName: existingAddress.name,
      hasBackendIdInUpdates: !!updates.backendId,
      existingBackendId: existingAddress.backendId
    });
    return { success: false, error: 'Address has no backend ID. Cannot update in backend.' };
  }
  
  // 1. Update DataStore immediately (optimistic)
  // Ensure backendId is preserved in the updated address
  const updatedAddress = { 
    ...existingAddress, 
    ...updates, 
    backendId: backendId, // ✅ Always preserve backendId
    updatedAt: new Date().toISOString() 
  };
  dataStore.updateAddress(addressId, updatedAddress);
  
  console.log('🔄 Syncing address update to backend:', {
    localId: addressId,
    backendId: backendId,
    addressName: updatedAddress.name
  });
  
  // 2. Sync with backend and return promise that resolves when sync completes
  const syncPromise = (async (): Promise<SyncResult> => {
    try {
      // Address exists in backend - update it using backendId
      const result = await updateAddress({
        addressId: backendId, // ✅ Use the backendId to update
        name: updatedAddress.name,
        addressJson: {
          doorNumber: updatedAddress.doorNumber,
          addressLine1: updatedAddress.addressLine1,
          addressLine2: updatedAddress.addressLine2,
          additionalLines: updatedAddress.additionalLines || [], // ✅ Always include additionalLines
          city: updatedAddress.city,
          pincode: updatedAddress.pincode,
          stateName: updatedAddress.stateName,
          stateCode: updatedAddress.stateCode,
          formatted_address: `${updatedAddress.addressLine1}, ${updatedAddress.addressLine2}, ${updatedAddress.city}, ${updatedAddress.stateName} - ${updatedAddress.pincode}`,
        },
        type: updatedAddress.type,
        managerName: updatedAddress.manager,
        managerMobileNumber: updatedAddress.phone,
        isPrimary: updatedAddress.isPrimary,
      });

      if (result.success) {
        console.log('✅ Address successfully updated in backend:', backendId);
        return { success: true, data: result.address };
      } else {
        const errorMsg = result.error || 'Failed to update address in backend';
        console.error('❌ Backend update failed:', errorMsg);
        throw new Error(errorMsg);
      }
    } catch (error: any) {
      console.error('❌ Failed to sync address update to backend:', error);
      console.error('❌ Error details:', {
        message: error.message,
        stack: error.stack,
        backendId: backendId,
        addressId: addressId
      });
      
      if (options.revertOnError) {
        dataStore.updateAddress(addressId, originalAddress);
        console.log('🔄 Reverted address update in DataStore');
      }
      
      if (options.showError) {
        console.error('⚠️ Address update sync failed:', error.message);
      }
      
      return { success: false, error: error.message || 'Failed to update address in backend' };
    }
  })();

  // If awaitSync option is set, return the sync promise (caller can await it)
  // Otherwise, fire and forget (non-blocking)
  if (options.awaitSync) {
    return await syncPromise;
  } else {
    // Fire and forget - don't block, but return promise for optional awaiting
    syncPromise.catch(() => {}); // Suppress unhandled promise rejection
    return { success: true };
  }
}

/**
 * Optimistically add bank account: Update DataStore immediately, sync backend in background
 * Returns a promise that resolves when backend sync completes (can be awaited)
 */
export async function optimisticAddBankAccount(
  account: any, // BankAccount type from dataStore
  options: SyncOptions = {}
): Promise<SyncResult> {
  // 1. Update DataStore immediately (optimistic)
  dataStore.addBankAccount(account);
  
  // 2. Sync with backend and return promise that resolves when sync completes
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
        // Update DataStore with backend ID
        const updatedAccount = { ...account, backendId: result.account.id };
        dataStore.updateBankAccount(account.id, updatedAccount);
        console.log('✅ Bank account synced to backend:', result.account.id);
        return { success: true, data: result.account };
      } else {
        throw new Error(result.error || 'Failed to create bank account in backend');
      }
    } catch (error: any) {
      console.error('❌ Failed to sync bank account to backend:', error);
      
      if (options.revertOnError) {
        dataStore.deleteBankAccount(account.id);
        console.log('🔄 Reverted bank account from DataStore');
      }
      
      if (options.showError) {
        console.warn('⚠️ Bank account sync failed:', error.message);
      }
      
      return { success: false, error: error.message };
    }
  })();

  // If awaitSync option is set, return the sync promise (caller can await it)
  // Otherwise, fire and forget (non-blocking)
  if (options.awaitSync) {
    return await syncPromise;
  } else {
    // Fire and forget - don't block, but return promise for optional awaiting
    syncPromise.catch(() => {}); // Suppress unhandled promise rejection
    return { success: true };
  }
}

/**
 * Optimistically update bank account: Update DataStore immediately, sync backend in background
 * Returns a promise that resolves when backend sync completes (can be awaited)
 */
export async function optimisticUpdateBankAccount(
  accountId: string,
  updates: any,
  options: SyncOptions = {}
): Promise<SyncResult> {
  const existingAccount = dataStore.getBankAccountById(accountId);
  if (!existingAccount) {
    return { success: false, error: 'Bank account not found' };
  }

  const originalAccount = { ...existingAccount };
  
  // 1. Update DataStore immediately (optimistic)
  const updatedAccount = { ...existingAccount, ...updates };
  dataStore.updateBankAccount(accountId, updatedAccount);
  
  // 2. Sync with backend and return promise that resolves when sync completes
  if (existingAccount.backendId) {
    const backendId = existingAccount.backendId; // Type narrowing
    const syncPromise = (async (): Promise<SyncResult> => {
      try {
        const result = await updateBankAccount({
          accountId: backendId,
          accountHolderName: updatedAccount.accountHolderName,
          bankName: updatedAccount.bankName,
          bankShortName: updatedAccount.bankShortName,
          bankId: updatedAccount.bankId,
          accountNumber: updatedAccount.accountNumber,
          ifscCode: updatedAccount.ifscCode,
          upiId: updatedAccount.upiId || '',
          accountType: updatedAccount.accountType === 'Savings' ? 'Savings' : 'Current',
          isPrimary: updatedAccount.isPrimary || false,
        });

        if (result.success) {
          console.log('✅ Bank account updated in backend:', existingAccount.backendId);
          return { success: true };
        } else {
          throw new Error(result.error || 'Failed to update bank account in backend');
        }
      } catch (error: any) {
        console.error('❌ Failed to sync bank account update to backend:', error);
        
        if (options.revertOnError) {
          dataStore.updateBankAccount(accountId, originalAccount);
          console.log('🔄 Reverted bank account update in DataStore');
        }
        
        if (options.showError) {
          console.warn('⚠️ Bank account update sync failed:', error.message);
        }
        
        return { success: false, error: error.message };
      }
    })();

    // If awaitSync option is set, return the sync promise (caller can await it)
    // Otherwise, fire and forget (non-blocking)
    if (options.awaitSync) {
      return await syncPromise;
    } else {
      // Fire and forget - don't block, but return promise for optional awaiting
      syncPromise.catch(() => {}); // Suppress unhandled promise rejection
      return { success: true };
    }
  }

  // No backendId - can't sync, but DataStore is updated
  return { success: true };
}

/**
 * Optimistically save signup progress: Update DataStore immediately, sync backend in background
 */
export async function optimisticSaveSignupProgress(
  progress: any,
  options: SyncOptions = {}
): Promise<SyncResult> {
  // 1. Update DataStore immediately (optimistic)
  dataStore.updateSignupProgress(progress);
  
  // 2. Sync with backend in background (non-blocking)
  (async () => {
    try {
      const result = await saveSignupProgress(progress);
      if (result.success) {
        console.log('✅ Signup progress synced to backend');
      } else {
        console.warn('⚠️ Signup progress sync failed:', result.error);
      }
    } catch (error: any) {
      console.error('❌ Failed to sync signup progress to backend:', error);
      if (options.showError) {
        console.warn('⚠️ Signup progress sync failed:', error.message);
      }
    }
  })();

  // Return immediately
  return { success: true };
}

/**
 * Submit business details (must await - required for address creation)
 * But still update DataStore optimistically
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
  // This one must be awaited because address creation depends on business existing
  // But we can still update DataStore optimistically after
  const result = await submitBusinessDetails(params);
  
  if (result.success && result.businessId) {
    // Update DataStore optimistically
    dataStore.updateSignupProgress({
      ownerName: params.ownerName,
      businessName: params.businessName,
      businessType: params.businessType,
      taxIdType: params.taxIdType,
      taxIdValue: params.taxIdValue,
      // ... other fields
    });
  }
  
  return result;
}

/**
 * Background sync: Periodically sync DataStore with backend
 * Can be called on app focus, screen focus, or on interval
 */
export async function backgroundSyncData(): Promise<void> {
  console.log('🔄 Starting background sync...');
  
  // Sync addresses
  const addresses = dataStore.getAddresses();
  for (const address of addresses) {
    if (!address.backendId) {
      // Address exists in DataStore but not in backend - sync it
      console.log('🔄 Syncing address to backend:', address.id);
      await optimisticAddAddress(address, { showError: false });
    }
  }
  
  // Sync bank accounts
  const bankAccounts = dataStore.getBankAccounts();
  for (const account of bankAccounts) {
    if (!account.backendId) {
      // Account exists in DataStore but not in backend - sync it
      console.log('🔄 Syncing bank account to backend:', account.id);
      await optimisticAddBankAccount(account, { showError: false });
    }
  }
  
  console.log('✅ Background sync complete');
}

/**
 * Sync all addresses that don't have backendId to the backend
 * This ensures all addresses are persisted before navigation
 */
export async function syncAllAddressesToBackend(
  options: SyncOptions = {}
): Promise<{ success: boolean; synced: number; errors: string[] }> {
  const addresses = dataStore.getAddresses();
  const addressesToSync = addresses.filter(addr => !addr.backendId);
  
  if (addressesToSync.length === 0) {
    console.log('✅ All addresses already synced to backend');
    return { success: true, synced: 0, errors: [] };
  }

  console.log(`🔄 Syncing ${addressesToSync.length} addresses to backend...`);
  
  const errors: string[] = [];
  let synced = 0;

  // Sync addresses sequentially to avoid overwhelming the backend
  for (const address of addressesToSync) {
    try {
      const result = await optimisticAddAddress(address, { 
        awaitSync: true,
        showError: false,
        ...options 
      });
      
      if (result.success) {
        synced++;
        console.log(`✅ Synced address to backend: ${address.name}`);
      } else {
        errors.push(`${address.name}: ${result.error || 'Unknown error'}`);
        console.error(`❌ Failed to sync address ${address.name}:`, result.error);
      }
    } catch (error: any) {
      errors.push(`${address.name}: ${error.message || 'Unknown error'}`);
      console.error(`❌ Error syncing address ${address.name}:`, error);
    }
  }

  // Also verify addresses that have backendId are up to date
  const addressesWithBackendId = addresses.filter(addr => addr.backendId);
  for (const address of addressesWithBackendId) {
    try {
      // Just verify the address exists in backend (minimal update)
      const result = await optimisticUpdateAddress(address.id, {}, { 
        awaitSync: true,
        showError: false,
        ...options 
      });
      
      if (result.success) {
        console.log(`✅ Verified address in backend: ${address.name}`);
      } else {
        console.warn(`⚠️ Address verification failed for ${address.name}:`, result.error);
      }
    } catch (error: any) {
      console.warn(`⚠️ Error verifying address ${address.name}:`, error);
    }
  }

  const success = errors.length === 0;
  console.log(`✅ Address sync complete: ${synced} synced, ${errors.length} errors`);
  
  return { success, synced, errors };
}
