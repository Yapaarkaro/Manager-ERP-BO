// Supabase Configuration
// Update these values with your actual Supabase project credentials

export const SUPABASE_CONFIG = {
  // Your Supabase project URL
  URL: process.env.EXPO_PUBLIC_SUPABASE_URL || 'https://vwdjfjdloocygirngaan.supabase.co',
  
  // Your Supabase anonymous key
  ANON_KEY: process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InZ3ZGpmamRsb29jeWdpcm5nYWFuIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTU0MTQ4ODAsImV4cCI6MjA3MDk5MDg4MH0._HlnwTnNu72fJqmj8Q1Wo9-BceVK9GEpZpE_THbh5i0',
  
  // Optional: Service role key for server-side operations
  SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY || 'YOUR_SERVICE_ROLE_KEY_HERE',
  
  // Database configuration
  DB_CONFIG: {
    // Connection timeout in milliseconds
    TIMEOUT: 30000,
    
    // Retry attempts for failed operations
    MAX_RETRIES: 3,
    
    // Batch size for bulk operations
    BATCH_SIZE: 100,
  },
  
  // Storage configuration (if you decide to use storage later)
  STORAGE_CONFIG: {
    // Default bucket name
    DEFAULT_BUCKET: 'erp-app-files',
    
    // Maximum file size in bytes (10MB)
    MAX_FILE_SIZE: 10 * 1024 * 1024,
    
    // Allowed file types
    ALLOWED_TYPES: ['image/jpeg', 'image/png', 'image/gif', 'application/pdf'],
  },
  
  // Authentication configuration
  AUTH_CONFIG: {
    // Session timeout in seconds (24 hours)
    SESSION_TIMEOUT: 24 * 60 * 60,
    
    // Auto refresh token
    AUTO_REFRESH: true,
    
    // Persist session
    PERSIST_SESSION: true,
  },
};

// Example configuration values (replace with your actual values):
/*
export const SUPABASE_CONFIG_EXAMPLE = {
  URL: 'https://abcdefghijklmnop.supabase.co',
  ANON_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoiYW5vbiIsImlhdCI6MTYzNjQ5NjAwMCwiZXhwIjoxOTUyMDcyMDAwfQ.example_signature_here',
  SERVICE_ROLE_KEY: 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImFiY2RlZmdoaWprbG1ub3AiLCJyb2xlIjoic2VydmljZV9yb2xlIiwiaWF0IjoxNjM2NDk2MDAwLCJleHAiOjE5NTIwNzIwMDB9.example_service_signature_here',
};
*/

// Environment check function
export const checkSupabaseConfig = (): boolean => {
  const { URL, ANON_KEY } = SUPABASE_CONFIG;
  
  if (URL === 'YOUR_SUPABASE_URL_HERE' || ANON_KEY === 'YOUR_SUPABASE_ANON_KEY_HERE') {
    console.warn('⚠️  Supabase configuration not set. Please update config/supabase.config.ts with your actual credentials.');
    return false;
  }
  
  if (!URL.includes('supabase.co')) {
    console.warn('⚠️  Invalid Supabase URL format. URL should be like: https://project-id.supabase.co');
    return false;
  }
  
  if (!ANON_KEY.startsWith('eyJ')) {
    console.warn('⚠️  Invalid Supabase anon key format. Key should start with "eyJ"');
    return false;
  }
  
  console.log('✅ Supabase configuration is valid');
  return true;
};

// Get configuration for different environments
export const getSupabaseConfig = (environment: 'development' | 'staging' | 'production' = 'development') => {
  switch (environment) {
    case 'production':
      return {
        ...SUPABASE_CONFIG,
        DB_CONFIG: {
          ...SUPABASE_CONFIG.DB_CONFIG,
          TIMEOUT: 60000, // Longer timeout for production
          MAX_RETRIES: 5, // More retries for production
        },
      };
    case 'staging':
      return {
        ...SUPABASE_CONFIG,
        DB_CONFIG: {
          ...SUPABASE_CONFIG.DB_CONFIG,
          TIMEOUT: 45000,
          MAX_RETRIES: 4,
        },
      };
    default:
      return SUPABASE_CONFIG;
  }
}; 