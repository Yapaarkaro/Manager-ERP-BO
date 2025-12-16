# Subscription Database Schema

## Overview
This document describes the database schema for subscription management, including plans, subscriptions, add-ons, and history tracking.

## Tables Created

### 1. `subscription_plans`
Stores subscription plan definitions (Monthly and Yearly plans).

**Columns:**
- `id` (UUID, Primary Key) - Unique plan identifier
- `name` (TEXT) - Plan name (e.g., "Monthly Plan", "Yearly Plan")
- `type` (TEXT) - Plan type: 'monthly' or 'yearly' (UNIQUE)
- `price` (NUMERIC) - Plan price in INR
- `locations` (INTEGER) - Number of location overviews (primary location is always included separately)
- `staff_accounts` (INTEGER) - Number of staff accounts included
- `description` (TEXT) - Plan description
- `features` (JSONB) - Array of feature descriptions
- `is_active` (BOOLEAN) - Whether the plan is currently active
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Indexes:**
- Index on `is_active` for filtering active plans

**Default Data:**
- Monthly Plan: ₹750/month, 2 location overviews, 3 staff accounts
- Yearly Plan: ₹7500/year, 5 location overviews, 10 staff accounts

### 2. `subscriptions`
Tracks business subscriptions and trial periods.

**Columns:**
- `id` (UUID, Primary Key) - Unique subscription identifier
- `business_id` (UUID, Foreign Key → businesses.id) - Reference to business
- `plan_id` (UUID, Foreign Key → subscription_plans.id) - Reference to plan (nullable)
- `is_on_trial` (BOOLEAN) - Whether currently on trial
- `trial_start_date` (TIMESTAMPTZ) - Trial start date
- `trial_end_date` (TIMESTAMPTZ) - Trial end date
- `status` (TEXT) - Status: 'active', 'inactive', 'trialing', 'cancelled', 'past_due', 'unpaid'
- `current_period_start` (TIMESTAMPTZ) - Current billing period start
- `current_period_end` (TIMESTAMPTZ) - Current billing period end
- `cancel_at_period_end` (BOOLEAN) - Whether to cancel at period end
- `cancelled_at` (TIMESTAMPTZ) - Cancellation timestamp
- `metadata` (JSONB) - Additional subscription metadata
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Indexes:**
- Index on `business_id` for quick lookups
- Index on `status` for filtering by status
- Partial index on `trial_end_date` where `is_on_trial = true`
- Partial index on `current_period_end` where `status = 'active'`
- Unique partial index on `business_id` where `status IN ('active', 'trialing')` - Ensures one active subscription per business

### 3. `subscription_addons`
Tracks add-ons purchased with subscriptions (additional staff, locations, GST filing).

**Columns:**
- `id` (UUID, Primary Key) - Unique addon identifier
- `subscription_id` (UUID, Foreign Key → subscriptions.id) - Reference to subscription
- `addon_type` (TEXT) - Type: 'staff', 'location', or 'gst_filing'
- `quantity` (INTEGER) - Quantity (for staff and location addons)
- `price` (NUMERIC) - Price per unit
- `billing_period` (TEXT) - Billing period: 'monthly' or 'yearly'
- `is_active` (BOOLEAN) - Whether addon is active
- `created_at` (TIMESTAMPTZ) - Creation timestamp
- `updated_at` (TIMESTAMPTZ) - Last update timestamp

**Constraints:**
- UNIQUE(`subscription_id`, `addon_type`) - One addon type per subscription

**Indexes:**
- Index on `subscription_id` for quick lookups
- Index on `addon_type` for filtering by type
- Partial index on `is_active` where `is_active = true`

### 4. `subscription_history`
Audit log of all subscription changes and events.

**Columns:**
- `id` (UUID, Primary Key) - Unique history record identifier
- `subscription_id` (UUID, Foreign Key → subscriptions.id) - Reference to subscription
- `business_id` (UUID, Foreign Key → businesses.id) - Reference to business
- `action` (TEXT) - Action type: 'created', 'updated', 'cancelled', 'renewed', 'trial_started', 'trial_ended', 'plan_changed', 'addon_added', 'addon_removed', 'payment_failed', 'payment_succeeded'
- `old_status` (TEXT) - Previous status (for updates)
- `new_status` (TEXT) - New status (for updates)
- `metadata` (JSONB) - Additional action metadata
- `description` (TEXT) - Human-readable description
- `created_at` (TIMESTAMPTZ) - Timestamp of action
- `created_by` (UUID, Foreign Key → auth.users.id) - User who performed action (nullable)

**Indexes:**
- Index on `subscription_id` for subscription history lookups
- Index on `business_id` for business history lookups
- Index on `action` for filtering by action type
- Index on `created_at DESC` for chronological queries

## Businesses Table Updates

### New Columns Added to `businesses` Table:
- `current_subscription_id` (UUID, Foreign Key → subscriptions.id) - Reference to current active subscription
- `subscription_status` (TEXT) - Current subscription status (denormalized for quick access)
- `trial_end_date` (TIMESTAMPTZ) - Trial end date (denormalized for quick access)
- `subscription_expires_at` (TIMESTAMPTZ) - Subscription expiration date (denormalized for quick access)

**Indexes:**
- Index on `subscription_status` for filtering by status
- Partial index on `trial_end_date` where `trial_end_date IS NOT NULL`
- Partial index on `subscription_expires_at` where `subscription_expires_at IS NOT NULL`

## Triggers and Functions

### 1. `update_business_subscription_status()`
**Purpose:** Automatically updates businesses table when subscription status changes.

**Trigger:** `trigger_update_business_subscription`
- Fires: AFTER INSERT OR UPDATE on `subscriptions`
- Condition: When status is 'active' or 'trialing'
- Action: Updates `businesses` table with subscription details

### 2. `log_subscription_history()`
**Purpose:** Automatically logs all subscription changes to history table.

**Trigger:** `trigger_log_subscription_history`
- Fires: AFTER INSERT OR UPDATE on `subscriptions`
- Action: Creates history record with appropriate action type

## Usage Examples

### Starting a Trial
```sql
INSERT INTO subscriptions (business_id, is_on_trial, trial_start_date, trial_end_date, status)
VALUES (
  'business-uuid',
  true,
  now(),
  now() + INTERVAL '30 days',
  'trialing'
);
```

### Creating a Subscription
```sql
INSERT INTO subscriptions (business_id, plan_id, status, current_period_start, current_period_end)
VALUES (
  'business-uuid',
  'plan-uuid',
  'active',
  now(),
  now() + INTERVAL '1 month'  -- or '1 year' for yearly
);
```

### Adding an Addon
```sql
INSERT INTO subscription_addons (subscription_id, addon_type, quantity, price, billing_period)
VALUES (
  'subscription-uuid',
  'staff',
  1,
  100.00,
  'monthly'
);
```

### Querying Active Subscriptions
```sql
SELECT s.*, sp.name as plan_name, sp.price
FROM subscriptions s
LEFT JOIN subscription_plans sp ON s.plan_id = sp.id
WHERE s.status = 'active'
  AND s.current_period_end > now();
```

### Querying Trial Status
```sql
SELECT b.*, s.trial_end_date, s.status
FROM businesses b
LEFT JOIN subscriptions s ON b.current_subscription_id = s.id
WHERE s.is_on_trial = true
  AND s.trial_end_date > now();
```

## RLS (Row Level Security)

**Note:** RLS policies should be added to ensure:
- Businesses can only see their own subscriptions
- Only authorized users can create/update subscriptions
- History records are readable by business owners

Example RLS policy:
```sql
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Businesses can view their own subscriptions"
ON subscriptions FOR SELECT
USING (
  business_id IN (
    SELECT business_id FROM users WHERE id = auth.uid()
  )
);
```

## Next Steps

1. **Add RLS Policies** - Implement row-level security for all subscription tables
2. **Create Edge Functions** - Build API endpoints for:
   - Starting trials
   - Creating subscriptions
   - Adding/removing addons
   - Cancelling subscriptions
   - Querying subscription status
3. **Update Frontend** - Integrate with new database schema
4. **Payment Integration** - Connect with payment gateway for subscription payments
5. **Automated Billing** - Set up cron jobs for:
   - Checking trial expiration
   - Processing recurring payments
   - Updating subscription status

