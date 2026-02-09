# Subscription Tables RLS Policies

## Overview
All subscription-related tables now have Row Level Security (RLS) enabled with comprehensive security policies to ensure data isolation and security.

## RLS Status
✅ **RLS Enabled on:**
- `subscription_plans`
- `subscriptions`
- `subscription_addons`
- `subscription_history`

## Security Policies

### 1. `subscription_plans` Table

#### View Policies
- **"Anyone can view active subscription plans"**
  - Role: `authenticated`
  - Operation: `SELECT`
  - Condition: Only active plans (`is_active = true`)
  - Purpose: Allow authenticated users to view available subscription plans

#### Admin Policies
- **"Service role can manage subscription plans"**
  - Role: `service_role`
  - Operation: `ALL` (INSERT, UPDATE, DELETE)
  - Purpose: Allow admin operations to create/update/delete plans

### 2. `subscriptions` Table

#### View Policy
- **"Businesses can view their own subscriptions"**
  - Role: `authenticated`
  - Operation: `SELECT`
  - Condition: User's business_id matches subscription's business_id
  - Purpose: Businesses can only see their own subscriptions

#### Create Policy
- **"Businesses can create subscriptions for their own business"**
  - Role: `authenticated`
  - Operation: `INSERT`
  - Condition: Can only create subscriptions for their own business_id
  - Purpose: Prevent businesses from creating subscriptions for other businesses

#### Update Policy
- **"Businesses can update their own subscriptions"**
  - Role: `authenticated`
  - Operation: `UPDATE`
  - Condition: Can only update subscriptions for their own business_id
  - Purpose: Allow businesses to update their subscription status, addons, etc.

#### Admin Policy
- **"Service role can manage all subscriptions"**
  - Role: `service_role`
  - Operation: `ALL`
  - Purpose: Allow admin operations (Edge Functions, cron jobs, etc.)

### 3. `subscription_addons` Table

#### View Policy
- **"Businesses can view their own subscription addons"**
  - Role: `authenticated`
  - Operation: `SELECT`
  - Condition: Addon belongs to a subscription owned by the user's business
  - Purpose: Businesses can see addons for their subscriptions

#### Create Policy
- **"Businesses can create addons for their own subscriptions"**
  - Role: `authenticated`
  - Operation: `INSERT`
  - Condition: Can only add addons to their own subscriptions
  - Purpose: Prevent adding addons to other businesses' subscriptions

#### Update Policy
- **"Businesses can update their own subscription addons"**
  - Role: `authenticated`
  - Operation: `UPDATE`
  - Condition: Can only update addons for their own subscriptions
  - Purpose: Allow updating addon quantities, prices, etc.

#### Delete Policy
- **"Businesses can delete their own subscription addons"**
  - Role: `authenticated`
  - Operation: `DELETE`
  - Condition: Can only delete addons for their own subscriptions
  - Purpose: Allow removing addons

#### Admin Policy
- **"Service role can manage all subscription addons"**
  - Role: `service_role`
  - Operation: `ALL`
  - Purpose: Allow admin operations

### 4. `subscription_history` Table

#### View Policy
- **"Businesses can view their own subscription history"**
  - Role: `authenticated`
  - Operation: `SELECT`
  - Condition: History record belongs to the user's business
  - Purpose: Businesses can view their subscription audit trail

#### Insert Policy
- **"Service role can insert subscription history"**
  - Role: `service_role`
  - Operation: `INSERT`
  - Purpose: Allow admin operations to insert history records

#### Admin Policy
- **"Service role can manage subscription history"**
  - Role: `service_role`
  - Operation: `ALL`
  - Purpose: Allow admin operations

**Note:** History records are primarily created automatically by triggers. The trigger function uses `SECURITY DEFINER` to bypass RLS and insert history records.

## Security Features

### 1. Function Security
- **`log_subscription_history()`** - Uses `SECURITY DEFINER` to allow trigger to insert history records
- **`update_business_subscription_status()`** - Uses `SECURITY DEFINER` to allow trigger to update businesses table
- Both functions set `search_path = public` to prevent search path attacks

### 2. Data Isolation
- All policies check that users can only access data for their own business
- Uses `auth.uid()` to get the current authenticated user
- Queries `users` table to get user's `business_id`
- Compares `business_id` to ensure data isolation

### 3. Admin Access
- `service_role` has full access to all tables for:
  - Edge Functions operations
  - Cron jobs
  - Admin operations
  - System maintenance

## Testing RLS Policies

### Test User Access
```sql
-- As authenticated user, should only see own subscriptions
SELECT * FROM subscriptions; 
-- Returns only subscriptions where business_id matches user's business_id

-- As authenticated user, should only see active plans
SELECT * FROM subscription_plans;
-- Returns only plans where is_active = true

-- As authenticated user, cannot create subscription for other business
INSERT INTO subscriptions (business_id, status) 
VALUES ('other-business-id', 'active');
-- Should fail with RLS policy violation
```

### Test Admin Access
```sql
-- As service_role, can see all subscriptions
SET ROLE service_role;
SELECT * FROM subscriptions;
-- Returns all subscriptions

-- As service_role, can manage plans
INSERT INTO subscription_plans (name, type, price, locations, staff_accounts)
VALUES ('Test Plan', 'monthly', 500, 1, 2);
-- Should succeed
```

## Security Best Practices

1. ✅ **RLS Enabled** - All tables have RLS enabled
2. ✅ **Policies Defined** - Comprehensive policies for all operations
3. ✅ **Data Isolation** - Users can only access their own business data
4. ✅ **Admin Access** - Service role has full access for system operations
5. ✅ **Function Security** - Trigger functions use SECURITY DEFINER safely
6. ✅ **Search Path** - Functions set search_path to prevent attacks

## Additional Security Recommendations

### 1. Audit Logging
Consider adding additional audit logging for:
- Failed RLS policy checks
- Admin operations
- Unusual access patterns

### 2. Rate Limiting
Implement rate limiting on:
- Subscription creation
- Addon additions
- Status updates

### 3. Payment Verification
When creating subscriptions, verify:
- Payment has been processed
- Business exists and is valid
- User has permission to create subscription

### 4. Monitoring
Monitor for:
- Unusual subscription patterns
- Failed policy checks
- Admin operations
- Data access patterns

## Migration Status
✅ All RLS policies have been applied successfully
✅ All tables have RLS enabled
✅ Trigger functions updated with SECURITY DEFINER
✅ Security verified

















