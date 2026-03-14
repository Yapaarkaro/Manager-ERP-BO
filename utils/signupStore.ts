/**
 * In-memory store for signup/onboarding flow data.
 * Keeps sensitive data (GSTIN, PAN, addresses, bank accounts) out of URL params.
 * Persists across screen navigations within the same session.
 * For cross-session persistence, the signup_progress table in Supabase is used.
 */

let _data: Record<string, any> = {};

export function setSignupData(updates: Record<string, any>) {
  _data = { ..._data, ...updates };
}

export function getSignupData(): Record<string, any> {
  return { ..._data };
}

export function getSignupField<T = string>(key: string, fallback?: T): T {
  return (_data[key] as T) ?? (fallback as T);
}

export function clearSignupData() {
  _data = {};
}
