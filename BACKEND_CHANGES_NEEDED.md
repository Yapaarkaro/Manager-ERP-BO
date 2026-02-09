# Backend Changes Required

## 1. Remove `business_with_details` Table

The `business_with_details` table needs to be removed from the backend database. This table is not referenced in the frontend code, so it's likely only used in Supabase Edge Functions or database migrations.

### Steps to Remove:
1. Check Supabase Edge Functions for any references to `business_with_details`
2. Check database migrations for table creation
3. Drop the table using SQL:
   ```sql
   DROP TABLE IF EXISTS business_with_details CASCADE;
   ```
4. Remove any views, functions, or triggers that depend on this table
5. Update any Edge Functions that reference this table

### Files to Check:
- Supabase Edge Functions (not in this repository)
- Database migrations (usually in `supabase/migrations/` folder)
- Any SQL files or database setup scripts

## 2. Date of Birth Timezone Fix

The frontend has been fixed to use local timezone when formatting dates. The backend should also ensure it stores dates correctly without timezone conversion.

### Frontend Fix Applied:
- Changed from `dateOfBirth.toISOString().split('T')[0]` (UTC conversion)
- To: `${dateOfBirth.getFullYear()}-${String(dateOfBirth.getMonth() + 1).padStart(2, '0')}-${String(dateOfBirth.getDate()).padStart(2, '0')}` (local timezone)

### Backend Verification:
- Ensure Edge Functions accept dates in `YYYY-MM-DD` format
- Store dates as DATE type (not TIMESTAMP) to avoid timezone issues
- Verify that dates are stored exactly as received from frontend



















