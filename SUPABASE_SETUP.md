# Supabase Setup Guide for ERP Manager App

This guide will help you set up Supabase as the backend database for your ERP Manager application.

## 🚀 Quick Start

### 1. Create a Supabase Project

1. Go to [supabase.com](https://supabase.com) and sign up/sign in
2. Click "New Project"
3. Choose your organization
4. Enter project details:
   - **Name**: `erp-manager-app` (or your preferred name)
   - **Database Password**: Choose a strong password
   - **Region**: Select the region closest to your users
5. Click "Create new project"
6. Wait for the project to be created (usually takes 1-2 minutes)

### 2. Get Your Project Credentials

1. In your project dashboard, go to **Settings** → **API**
2. Copy the following values:
   - **Project URL** (e.g., `https://abcdefghijklmnop.supabase.co`)
   - **anon public** key (starts with `eyJ...`)
   - **service_role** key (starts with `eyJ...`) - Keep this secret!

### 3. Update Configuration

1. Open `config/supabase.config.ts`
2. Replace the placeholder values with your actual credentials:

```typescript
export const SUPABASE_CONFIG = {
  URL: 'https://your-project-id.supabase.co',
  ANON_KEY: 'your-actual-anon-key-here',
  SERVICE_ROLE_KEY: 'your-actual-service-role-key-here',
  // ... rest of config
};
```

### 4. Set Environment Variables (Optional)

Create a `.env` file in your project root:

```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project-id.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-actual-anon-key-here
SUPABASE_SERVICE_ROLE_KEY=your-actual-service-role-key-here
```

**Note**: Only variables prefixed with `EXPO_PUBLIC_` will be available in your React Native app.

### 5. Install Dependencies

Run the following command to install Supabase:

```bash
npm install @supabase/supabase-js
```

## 🗄️ Database Setup

### 1. Run the Schema

1. Go to your Supabase project dashboard
2. Navigate to **SQL Editor**
3. Copy the contents of `database/schema.sql`
4. Paste and run the SQL script
5. Verify that all tables are created in **Table Editor**

### 2. Verify Tables

The following tables should be created:

- `business_addresses` - Business locations and addresses
- `customers` - Customer information and metrics
- `suppliers` - Supplier information and metrics
- `products` - Product catalog and inventory
- `sales` - Sales transactions
- `sale_items` - Individual items in sales
- `invoices` - Customer invoices
- `invoice_items` - Individual items in invoices
- `purchase_orders` - Purchase orders
- `po_items` - Items in purchase orders
- `purchase_invoices` - Supplier invoices
- `receivables` - Customer payment tracking
- `payables` - Supplier payment tracking
- `expenses` - Business expenses
- `marketing_campaigns` - Marketing campaign data
- `returns` - Product returns
- `return_items` - Items in returns
- `staff` - Staff information
- `stock_movements` - Inventory movement tracking
- `stock_discrepancies` - Stock discrepancy reports

### 3. Enable Row Level Security (RLS)

RLS is already enabled in the schema. You can customize the policies based on your authentication needs:

1. Go to **Authentication** → **Policies**
2. Review and modify policies for each table
3. Test policies to ensure they work as expected

## 🔐 Authentication Setup

### 1. Configure Authentication Providers

1. Go to **Authentication** → **Providers**
2. Enable the providers you want to use:
   - **Email**: For email/password authentication
   - **Phone**: For SMS authentication
   - **Google**: For Google OAuth
   - **GitHub**: For GitHub OAuth

### 3. Set Up Email Templates

1. Go to **Authentication** → **Email Templates**
2. Customize the email templates for:
   - Confirm signup
   - Magic link
   - Change email address
   - Reset password

### 4. Configure SMTP (Optional)

If you want to use your own SMTP server:

1. Go to **Authentication** → **SMTP Settings**
2. Enter your SMTP credentials
3. Test the connection

## 📱 App Integration

### 1. Import Services

In your React Native components, import the database services:

```typescript
import { 
  customerService, 
  productService, 
  saleService 
} from '@/services/databaseService';
```

### 2. Use Services

```typescript
// Get all customers
const customers = await customerService.getCustomers();

// Create a new customer
const newCustomer = await customerService.createCustomer({
  name: 'John Doe',
  customer_type: 'individual',
  contact_person: 'John Doe',
  mobile: '+1234567890',
  address: '123 Main St, City, State',
  // ... other fields
});

// Search customers
const searchResults = await customerService.searchCustomers('John');

// Update customer
await customerService.updateCustomer(customerId, {
  status: 'inactive'
});
```

### 3. Error Handling

The services include built-in error handling:

```typescript
try {
  const customers = await customerService.getCustomers();
  // Handle success
} catch (error) {
  console.error('Error fetching customers:', error.message);
  // Handle error (show toast, retry, etc.)
}
```

## 🔍 Testing Your Setup

### 1. Test Connection

```typescript
import { supabase } from '@/services/supabase';

// Test the connection
const testConnection = async () => {
  try {
    const { data, error } = await supabase
      .from('customers')
      .select('count')
      .limit(1);
    
    if (error) {
      console.error('Connection failed:', error);
    } else {
      console.log('✅ Supabase connection successful!');
    }
  } catch (error) {
    console.error('Connection test failed:', error);
  }
};
```

### 2. Test CRUD Operations

```typescript
// Test creating a customer
const testCustomer = await customerService.createCustomer({
  name: 'Test Customer',
  customer_type: 'individual',
  contact_person: 'Test Contact',
  mobile: '+1234567890',
  address: 'Test Address',
});

console.log('Created customer:', testCustomer);

// Test updating the customer
await customerService.updateCustomer(testCustomer.id, {
  status: 'inactive'
});

// Test deleting the customer
await customerService.deleteCustomer(testCustomer.id);
```

## 🚨 Common Issues & Solutions

### 1. Connection Errors

**Issue**: "Invalid API key" or "Invalid URL"
**Solution**: 
- Double-check your credentials in `config/supabase.config.ts`
- Ensure the URL format is correct: `https://project-id.supabase.co`
- Verify the anon key starts with `eyJ`

### 2. RLS Policy Errors

**Issue**: "new row violates row-level security policy"
**Solution**:
- Check your RLS policies in the Supabase dashboard
- Ensure policies allow the operations you're trying to perform
- Test policies with the SQL editor

### 3. Type Errors

**Issue**: TypeScript compilation errors
**Solution**:
- Ensure you've imported the correct types from `@/types/database`
- Check that your data matches the expected interface
- Use the provided service methods instead of direct Supabase calls

### 4. Network Errors

**Issue**: Timeout or connection refused
**Solution**:
- Check your internet connection
- Verify the Supabase project is not paused
- Check if there are any regional restrictions

## 🔧 Advanced Configuration

### 1. Custom RLS Policies

Create more sophisticated access control:

```sql
-- Example: Users can only see their own data
CREATE POLICY "Users can only see own data" ON customers
FOR ALL USING (auth.uid()::text = user_id);

-- Example: Staff can see all data
CREATE POLICY "Staff can see all data" ON customers
FOR ALL USING (
  EXISTS (
    SELECT 1 FROM staff 
    WHERE staff.id = auth.uid()::text 
    AND staff.role IN ('admin', 'manager')
  )
);
```

### 2. Database Functions

Create custom functions for complex operations:

```sql
-- Example: Calculate customer score
CREATE OR REPLACE FUNCTION calculate_customer_score(customer_id UUID)
RETURNS INTEGER AS $$
BEGIN
  RETURN (
    SELECT 
      (on_time_payment * 0.4) + 
      (satisfaction_rating * 0.3) + 
      (response_time * 0.3)
    FROM customers 
    WHERE id = customer_id
  );
END;
$$ LANGUAGE plpgsql;
```

### 3. Triggers

Set up automatic actions:

```sql
-- Example: Update stock when sale is created
CREATE OR REPLACE FUNCTION update_stock_on_sale()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE products 
  SET current_stock = current_stock - NEW.quantity
  WHERE id = NEW.product_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_stock_on_sale
  AFTER INSERT ON sale_items
  FOR EACH ROW
  EXECUTE FUNCTION update_stock_on_sale();
```

## 📊 Monitoring & Analytics

### 1. Database Insights

- Go to **Dashboard** → **Database** to see:
  - Table sizes and row counts
  - Query performance
  - Connection statistics

### 2. Logs

- Go to **Logs** to monitor:
  - API requests
  - Authentication events
  - Database queries
  - Error logs

### 3. Performance

- Use **Query Performance** to identify slow queries
- Monitor **Connection Pool** usage
- Check **Storage** usage

## 🔒 Security Best Practices

### 1. API Keys

- Never expose your `service_role` key in client-side code
- Use the `anon` key for public operations
- Rotate keys regularly

### 2. RLS Policies

- Always enable RLS on sensitive tables
- Test policies thoroughly
- Use principle of least privilege

### 3. Data Validation

- Validate data on both client and server
- Use database constraints
- Sanitize user inputs

## 📚 Additional Resources

- [Supabase Documentation](https://supabase.com/docs)
- [Supabase JavaScript Client](https://supabase.com/docs/reference/javascript)
- [Row Level Security Guide](https://supabase.com/docs/guides/auth/row-level-security)
- [Database Design Best Practices](https://supabase.com/docs/guides/database/best-practices)

## 🆘 Support

If you encounter issues:

1. Check the [Supabase Community](https://github.com/supabase/supabase/discussions)
2. Review the [Supabase Status Page](https://status.supabase.com)
3. Check your project logs for error details
4. Ensure your configuration matches the examples above

---

**Happy coding! 🎉**

Your ERP Manager app is now connected to a powerful, scalable backend database. 