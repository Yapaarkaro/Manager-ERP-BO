/**
 * SMS message templates for different verification contexts.
 *
 * Supabase Auth OTP (signup/login/staff): Template is configured in the Supabase
 * dashboard under Authentication > Templates > SMS. To customize per-context,
 * a custom Supabase SMS hook is required.
 *
 * GSTIN registered mobile OTP: Sent via Twilio in the verify-gstin edge function.
 */

export const SMS_TEMPLATES = {
  SIGNUP: (otp: string) =>
    `${otp} is your OTP to sign up on Manager ERP. Valid for 10 minutes. Do not share this code. - Manager`,

  LOGIN: (otp: string) =>
    `${otp} is your OTP to log in to Manager ERP. Valid for 10 minutes. Do not share this code. - Manager`,

  STAFF_LOGIN: (otp: string) =>
    `${otp} is your OTP for staff login on Manager ERP. Valid for 10 minutes. Do not share this code. - Manager`,

  GSTIN_VERIFICATION: (otp: string) =>
    `${otp} is your OTP to verify the GSTIN-registered mobile on Manager ERP. Valid for 10 minutes. Do not share this code. - Manager`,
} as const;
