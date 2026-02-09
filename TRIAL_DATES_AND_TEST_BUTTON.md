# Trial Dates and Test Button Implementation

## Summary
Added trial start/end date display in businesses table and created test buttons to simulate trial expiration for testing purposes.

## Changes Made

### 1. Database Changes

#### Added `trial_start_date` Column to Businesses Table
- **Column**: `trial_start_date` (TIMESTAMPTZ)
- **Purpose**: Denormalized trial start date for quick access
- **Index**: Created partial index for performance
- **Migration File**: `migrations/add_trial_start_date.sql`

#### Updated Trigger Function
- Updated `update_business_subscription_status()` trigger to also update `trial_start_date`
- Now updates both `trial_start_date` and `trial_end_date` when subscription changes

### 2. Frontend Changes

#### Updated `useBusinessData` Hook
- Added `trial_start_date`, `trial_end_date`, and `subscription_status` to `BusinessData` interface
- Updated queries to include these fields from businesses table
- Both `fetchData()` and `prefetchBusinessData()` now fetch trial dates

#### Updated Settings Screen
- **Trial Date Display**: Shows trial start and end dates when on trial
- **Subscription Status Display**: Shows subscription status and trial dates when not on trial
- **Test Buttons Added**:
  1. **"🧪 Test: Simulate Trial Expiration"** - Simulates trial expiration (sets end date to 1 second ago)
  2. **"🔄 Test: Reset Trial to Active"** - Resets trial to active with 30 days remaining

#### Updated Subscription Store
- Added `simulateTrialExpiration()` method - Sets trial end date to 1 second ago
- Added `resetTrialToActive()` method - Resets trial to active with 30 days remaining
- Both methods update AsyncStorage and notify listeners

## How to Apply Migration

### Option 1: Using Supabase Dashboard
1. Go to Supabase Dashboard → SQL Editor
2. Copy the contents of `migrations/add_trial_start_date.sql`
3. Execute the SQL

### Option 2: Using Supabase CLI
```bash
supabase migration new add_trial_start_date
# Copy the SQL from migrations/add_trial_start_date.sql to the new migration file
supabase db push
```

### Option 3: Direct SQL Execution
Run the SQL from `migrations/add_trial_start_date.sql` directly in your database.

## Testing the Trial Expiration

### Steps to Test:
1. **Navigate to Settings Screen**
   - Open the app and go to Settings

2. **View Trial Information**
   - You should see:
     - Trial start date
     - Trial end date
     - Days remaining
     - Progress bar

3. **Simulate Trial Expiration**
   - Click "🧪 Test: Simulate Trial Expiration" button
   - Confirm the action
   - The trial will be marked as expired
   - You should enter read-only mode

4. **Test Read-Only Mode**
   - Try to perform actions (add product, create invoice, etc.)
   - Actions should be disabled or show "Trial Expired" message
   - You should only be able to view data

5. **Reset Trial**
   - Click "🔄 Test: Reset Trial to Active" button
   - Confirm the action
   - Trial will be reset to active with 30 days remaining
   - Full access should be restored

## What Happens After Trial Expires

### Read-Only Mode Features:
- ✅ **Can View**: All data (products, invoices, customers, suppliers, etc.)
- ❌ **Cannot**: Create, edit, or delete any data
- ❌ **Cannot**: Add new products, customers, suppliers, staff
- ❌ **Cannot**: Create invoices or sales
- ❌ **Cannot**: Modify addresses or bank accounts

### User Experience:
- Action buttons are disabled
- Forms show "Trial Expired" message
- Upgrade prompts appear
- Navigation to subscription page is available

## Database Schema

### Businesses Table Columns:
- `trial_start_date` (TIMESTAMPTZ) - Trial start date
- `trial_end_date` (TIMESTAMPTZ) - Trial end date
- `subscription_status` (TEXT) - Current subscription status
- `current_subscription_id` (UUID) - Reference to active subscription
- `subscription_expires_at` (TIMESTAMPTZ) - Subscription expiration date

### Automatic Updates:
- When a subscription is created/updated, the trigger automatically updates businesses table
- Trial dates are synced from subscriptions table to businesses table
- No manual updates needed

## Files Modified

1. **migrations/add_trial_start_date.sql** - New migration file
2. **hooks/useBusinessData.ts** - Added trial date fields to interface and queries
3. **app/settings.tsx** - Added trial date display and test buttons
4. **utils/subscriptionStore.ts** - Added test methods for simulating trial expiration

## Next Steps

1. **Apply Migration**: Run the SQL migration to add `trial_start_date` column
2. **Test Functionality**: Use the test buttons to verify trial expiration behavior
3. **Implement Read-Only Mode**: Add read-only checks to all action buttons throughout the app
4. **Add Upgrade Prompts**: Show upgrade prompts when users try to perform actions in read-only mode

## Notes

- Test buttons are only visible when on trial
- Test buttons should be removed or hidden in production (consider using environment variable)
- Trial dates are automatically synced from subscriptions table via trigger
- Read-only mode is enforced via `useSubscription` hook and `isReadOnlyMode()` method

















