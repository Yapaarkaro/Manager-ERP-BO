export const REVIEW_MODE = true;

/** Fixed token used for REVIEW_MODE Edge Function Authorization and OTP bypass session. */
export const REVIEW_ACCESS_TOKEN = 'review-mode-token';

export const REVIEW_REFRESH_TOKEN = 'review-mode-refresh';

export const REVIEW_USER_ID = 'review-user-id';

/** Stable UUID for mocked submit-business-details / cash balance responses. */
export const REVIEW_MOCK_BUSINESS_ID = '00000000-0000-4000-a000-000000000001';

export const GOOGLE_MAPS_API_KEY =
  process.env.EXPO_PUBLIC_GOOGLE_MAPS_API_KEY || 'AIzaSyBqLe3lHfzB5epezdgwdKDzkdFkECuUN1o';

export const WEBSITE_URL =
  process.env.EXPO_PUBLIC_WEBSITE_URL || 'https://getmanager.in';

export const APP_URL =
  process.env.EXPO_PUBLIC_APP_URL || 'https://app.getmanager.in';
