# Subscription and Primary References Update

## Summary
This document outlines the changes made to fix primary address/bank account references and update the subscription system with new pricing and read-only mode functionality.

## Changes Made

### 1. Primary Address and Bank Account References

#### Problem
The `primary_address_id` and `primary_bank_account_id` columns in the `businesses` table were not being updated when addresses or bank accounts were marked as primary.

#### Solution
- Added two new API functions in `services/backendApi.ts`:
  - `updateBusinessPrimaryAddress(addressId: string | null)` - Updates `primary_address_id` in businesses table
  - `updateBusinessPrimaryBankAccount(accountId: string | null)` - Updates `primary_bank_account_id` in businesses table

- Integrated these functions into:
  - `createAddress()` - Updates businesses table when a new primary address is created
  - `updateAddress()` - Updates businesses table when an address is marked/unmarked as primary
  - `createBankAccount()` - Updates businesses table when a new primary bank account is created
  - `updateBankAccount()` - Updates businesses table when a bank account is marked/unmarked as primary

#### Database Schema
The following columns were already added to the `businesses` table (via migration):
- `primary_address_id` (UUID) - References `locations.id`
- `primary_bank_account_id` (UUID) - References `bank_accounts.id`

### 2. Subscription Pricing Updates

#### Monthly Plan
- **Price**: ₹750/month (updated from ₹999)
- **Features**:
  - 1 Primary Location (full access)
  - 2 Location Overview
  - 3 Staff Accounts
  - Full access to invoicing, staff, supplier, customer, inventory management, reports
  - Additional Staff: ₹100/month per staff
  - Additional Location: ₹150/month per location

#### Yearly Plan
- **Price**: ₹7500/year (updated from ₹9999)
- **Features**:
  - 1 Primary Address (full access)
  - 5 Location Overview
  - 10 Staff Accounts
  - Full access to invoicing, staff, supplier, customer, inventory management, reports
  - GST Filing (calculated based on filing data)
  - Priority Support

#### Add-On Pricing
- **Additional Staff**: ₹100/month (updated from ₹99)
- **Additional Location**: ₹150/month (updated from ₹149)
- Yearly add-ons: 10 months pricing (₹1000 for staff, ₹1500 for location)

### 3. Trial System

#### Trial Start
- The 30-day free trial now starts automatically when the user completes the signup flow
- Trial start is triggered in `app/auth/business-summary.tsx` when onboarding is completed

#### Trial Features
- 1 Primary Location (read-only after expiration)
- 0 Staff Accounts during trial
- Full access to all features during trial period

### 4. Read-Only Mode

#### Implementation
- Created `hooks/useSubscription.ts` hook that provides:
  - `isReadOnly` - Boolean indicating if user is in read-only mode
  - `hasActiveSubscription` - Boolean indicating if user has active subscription
  - `isTrialExpired` - Boolean indicating if trial has expired
  - `canPerformAction(action: string)` - Function to check if an action is allowed

- Added methods to `utils/subscriptionStore.ts`:
  - `hasActiveSubscription()` - Checks if user has active subscription
  - `isReadOnlyMode()` - Checks if user is in read-only mode (trial expired or no active subscription)

#### Read-Only Behavior
After the 30-day trial expires:
- User can **view** all their data (read-only access)
- User **cannot** perform actions like:
  - Creating/editing invoices
  - Adding/editing products
  - Adding/editing customers/suppliers
  - Creating/editing staff
  - Adding/editing addresses/bank accounts
  - Any data modification operations

#### Usage
To use read-only mode checking in components:

```typescript
import { useSubscription } from '@/hooks/useSubscription';

function MyComponent() {
  const { isReadOnly, canPerformAction } = useSubscription();
  
  const handleAction = () => {
    if (isReadOnly) {
      Alert.alert('Trial Expired', 'Please subscribe to continue using this feature.');
      return;
    }
    // Perform action
  };
  
  return (
    <TouchableOpacity
      onPress={handleAction}
      disabled={isReadOnly}
    >
      <Text>Perform Action</Text>
    </TouchableOpacity>
  );
}
```

### 5. GST Filing
- GST filing pricing is calculated based on filing data (sales/purchase reconciliation)
- Marketing prices are set by users and will be used for GST filing calculations
- GST filing is included in the yearly plan

## Next Steps

### Frontend Integration
To fully implement read-only mode, you'll need to:

1. **Add read-only checks to key action buttons**:
   - Add product buttons
   - Create invoice buttons
   - Edit/delete buttons
   - Add customer/supplier buttons
   - Add staff buttons
   - Add address/bank account buttons

2. **Show trial expiration banner**:
   - Display a banner when trial is expired
   - Link to subscription page
   - Show days remaining during trial

3. **Disable form submissions**:
   - Disable form submit buttons in read-only mode
   - Show message explaining why action is disabled

### Backend Edge Functions
The backend Edge Functions (`manage-addresses` and `manage-bank-accounts`) should also update the `businesses` table when addresses/bank accounts are marked as primary. The frontend now handles this as a fallback, but the Edge Functions should be the primary source of truth.

## Testing Checklist

- [ ] Verify primary_address_id updates when address is marked as primary
- [ ] Verify primary_bank_account_id updates when bank account is marked as primary
- [ ] Verify subscription pricing displays correctly (₹750/month, ₹7500/year)
- [ ] Verify trial starts when signup completes
- [ ] Verify read-only mode activates after trial expires
- [ ] Verify add-on pricing displays correctly (₹100/staff, ₹150/location)
- [ ] Test that actions are disabled in read-only mode
- [ ] Test that viewing data still works in read-only mode

## Files Modified

1. `services/backendApi.ts` - Added primary reference update functions
2. `utils/subscriptionStore.ts` - Updated pricing, features, and added read-only mode methods
3. `hooks/useSubscription.ts` - New hook for subscription status checking
4. `hooks/useBusinessData.ts` - Updated to include primary_address_id and primary_bank_account_id in queries
5. `app/auth/business-summary.tsx` - Trial already starts on signup completion (verified)

## Database Changes

- Migration: `add_primary_address_and_bank_account_references`
  - Added `primary_address_id` column to `businesses` table
  - Added `primary_bank_account_id` column to `businesses` table
  - Added indexes for performance

