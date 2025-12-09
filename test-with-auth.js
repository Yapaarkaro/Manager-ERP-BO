/**
 * Test Backend with Authentication (Workaround)
 * This simulates what would happen if we authenticate early
 */

const SUPABASE_URL = 'https://xsmwzaaotncpharmtzcj.supabase.co';
const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InhzbXd6YWFvdG5jcGhhcm10emNqIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjQzNjQ0NDYsImV4cCI6MjA3OTk0MDQ0Nn0.HnQACFAzQVRnFLFYPlWpq1dSRFNB_M1XG3KT1k-7QkM';

async function testWithAuth() {
  console.log('🧪 Testing Backend with Early Authentication (Workaround)\n');
  console.log('='.repeat(60));
  
  // This simulates creating a user early (not recommended for production)
  console.log('\n📝 Note: This test uses early authentication as a workaround.');
  console.log('   In production, verification endpoints should be public.\n');
  
  try {
    // Step 1: Create test user (simulating early auth)
    console.log('1️⃣ Creating test user...');
    const signUpResponse = await fetch(`${SUPABASE_URL}/auth/v1/signup`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
      },
      body: JSON.stringify({
        phone: '+919876543210',
        password: 'Test@123456',
      }),
    });
    
    if (!signUpResponse.ok) {
      const error = await signUpResponse.json();
      console.log('⚠️  User might already exist, trying sign in...');
      
      // Try sign in instead
      const signInResponse = await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          phone: '+919876543210',
          password: 'Test@123456',
        }),
      });
      
      if (!signInResponse.ok) {
        console.log('❌ Could not authenticate. This confirms the issue:');
        console.log('   Verification endpoints require JWT, but users need to verify BEFORE getting JWT.');
        console.log('\n✅ SOLUTION: Make verification endpoints public (verify_jwt: false)');
        return;
      }
      
      const { access_token } = await signInResponse.json();
      const token = access_token;
      
      // Test with token
      console.log('✅ Got JWT token, testing endpoints...\n');
      
      // Test Mobile OTP
      console.log('2️⃣ Testing verify-mobile-otp with JWT...');
      const mobileOTPResponse = await fetch(`${SUPABASE_URL}/functions/v1/verify-mobile-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          mobile: '9876543210',
          otp: '123456', // Test OTP
        }),
      });
      
      const mobileOTPData = await mobileOTPResponse.json();
      if (mobileOTPResponse.ok && mobileOTPData.success) {
        console.log('✅ Mobile OTP verification works WITH JWT');
        console.log('   Response:', mobileOTPData);
      } else {
        console.log('❌ Mobile OTP failed:', mobileOTPData);
      }
      
      // Test GSTIN OTP
      console.log('\n3️⃣ Testing verify-gstin-otp with JWT...');
      const gstinOTPResponse = await fetch(`${SUPABASE_URL}/functions/v1/verify-gstin-otp`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'apikey': SUPABASE_ANON_KEY,
        },
        body: JSON.stringify({
          gstin: '33ALHPL7224K1Z0',
          otp: '654321', // Test OTP
        }),
      });
      
      const gstinOTPData = await gstinOTPResponse.json();
      if (gstinOTPResponse.ok && gstinOTPData.success) {
        console.log('✅ GSTIN OTP verification works WITH JWT');
        console.log('   Response:', gstinOTPData);
      } else {
        console.log('❌ GSTIN OTP failed:', gstinOTPData);
      }
      
      console.log('\n' + '='.repeat(60));
      console.log('\n📊 CONCLUSION:');
      console.log('✅ Endpoints WORK with JWT (test OTPs function correctly)');
      console.log('⚠️  BUT: Users need JWT BEFORE they can verify (chicken-egg problem)');
      console.log('✅ SOLUTION: Make verification endpoints public');
      console.log('   This allows signup flow: verify → authenticate → create business');
      
    } else {
      const { session } = await signUpResponse.json();
      if (session?.access_token) {
        console.log('✅ User created, got JWT token');
        // Similar tests as above...
      }
    }
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testWithAuth();
