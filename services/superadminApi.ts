/**
 * Superadmin API Service
 * All requests go through the superadmin-api Edge Function which enforces
 * superadmin verification server-side using the service_role key.
 */

import { EDGE_FUNCTIONS_URL, supabase, SUPABASE_ANON_KEY, withTimeout } from '@/lib/supabase';

async function getAuthHeaders() {
  const { data: { session } } = await withTimeout(
    supabase.auth.getSession(),
    10000,
    'SA: getSession'
  );
  if (!session?.access_token) throw new Error('Not authenticated');
  return {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
    'Authorization': `Bearer ${session.access_token}`,
  };
}

async function callSuperadminApi(action: string, params?: Record<string, string>): Promise<any> {
  const makeRequest = async (headers: Record<string, string>) => {
    const queryParams = new URLSearchParams({ action, ...params });
    const url = `${EDGE_FUNCTIONS_URL}/superadmin-api?${queryParams.toString()}`;
    return withTimeout(fetch(url, { method: 'GET', headers }), 30000, `SA: ${action}`);
  };

  const headers = await getAuthHeaders();
  let response = await makeRequest(headers);

  if (response.status === 401) {
    console.log(`🔄 SA: Got 401 for ${action}, refreshing session and retrying...`);
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed?.session?.access_token) {
      const retryHeaders = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${refreshed.session.access_token}`,
      };
      response = await makeRequest(retryHeaders);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

async function callSearchApi(action: string, params?: Record<string, string>): Promise<any> {
  const makeRequest = async (headers: Record<string, string>) => {
    const queryParams = new URLSearchParams({ action, ...params });
    const url = `${EDGE_FUNCTIONS_URL}/superadmin-search?${queryParams.toString()}`;
    return withTimeout(fetch(url, { method: 'GET', headers }), 60000, `SA-Search: ${action}`);
  };

  const headers = await getAuthHeaders();
  let response = await makeRequest(headers);

  if (response.status === 401) {
    console.log(`🔄 SA-Search: Got 401 for ${action}, refreshing session and retrying...`);
    const { data: refreshed } = await supabase.auth.refreshSession();
    if (refreshed?.session?.access_token) {
      const retryHeaders = {
        'Content-Type': 'application/json',
        'apikey': SUPABASE_ANON_KEY,
        'Authorization': `Bearer ${refreshed.session.access_token}`,
      };
      response = await makeRequest(retryHeaders);
    }
  }

  if (!response.ok) {
    const errorData = await response.json().catch(() => ({}));
    throw new Error(errorData.error || `HTTP ${response.status}`);
  }

  return response.json();
}

export async function verifySuperadmin(): Promise<boolean> {
  try {
    const result = await callSuperadminApi('verify');
    return result?.success === true && result?.isSuperadmin === true;
  } catch {
    return false;
  }
}

export async function getOverview() {
  return callSuperadminApi('overview');
}

export async function getBusinesses() {
  return callSuperadminApi('businesses');
}

export async function getBusinessDetail(businessId: string) {
  return callSuperadminApi('business_detail', { business_id: businessId });
}

export async function getAuditLogs(table?: string, limit?: number, offset?: number) {
  const params: Record<string, string> = {};
  if (table) params.table = table;
  if (limit) params.limit = String(limit);
  if (offset) params.offset = String(offset);
  return callSuperadminApi('audit_logs', params);
}

export async function getAuthUsers() {
  return callSuperadminApi('auth_users');
}

export async function getDeviceSnapshots() {
  return callSuperadminApi('device_snapshots');
}

export async function getSignupProgress() {
  return callSuperadminApi('signup_progress');
}

export async function searchAll(query: string) {
  return callSearchApi('search', { q: query });
}

export async function getFullBusinessDetail(businessId: string) {
  return callSearchApi('business_detail', { id: businessId });
}

export async function searchProducts(query: string) {
  return callSearchApi('product_detail', { q: query });
}

// ============================================
// Superadmin TOTP (Authenticator App) MFA
// ============================================

export async function getSuperadminTOTPFactor(): Promise<{
  factorId: string;
  status: string;
} | null> {
  try {
    const { data, error } = await supabase.auth.mfa.listFactors();
    if (error || !data) return null;
    const totp = data.totp?.[0];
    if (!totp) return null;
    return { factorId: totp.id, status: totp.status };
  } catch {
    return null;
  }
}

export async function enrollSuperadminTOTP(): Promise<{
  success: boolean;
  factorId?: string;
  qrCode?: string;
  secret?: string;
  uri?: string;
  error?: string;
}> {
  try {
    const { data, error } = await supabase.auth.mfa.enroll({
      factorType: 'totp',
    });
    if (error) return { success: false, error: error.message };
    return {
      success: true,
      factorId: data.id,
      qrCode: data.totp.qr_code,
      secret: data.totp.secret,
      uri: data.totp.uri,
    };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to enroll TOTP' };
  }
}

export async function verifySuperadminTOTP(
  factorId: string,
  code: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { data: challenge, error: challengeErr } =
      await supabase.auth.mfa.challenge({ factorId });
    if (challengeErr) return { success: false, error: challengeErr.message };

    const { error: verifyErr } = await supabase.auth.mfa.verify({
      factorId,
      challengeId: challenge.id,
      code,
    });
    if (verifyErr) return { success: false, error: verifyErr.message };

    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to verify TOTP' };
  }
}

export async function getAllMarketingRequests(): Promise<{ success: boolean; requests?: any[]; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const { data, error } = await supabase
      .from('marketing_service_requests')
      .select('*, businesses(legal_name, owner_name, phone)')
      .eq('is_deleted', false)
      .order('created_at', { ascending: false });

    if (error) return { success: false, error: error.message };
    return { success: true, requests: data || [] };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to fetch marketing requests' };
  }
}

export async function updateMarketingRequestStatus(
  requestId: string,
  status: string,
  adminNotes?: string
): Promise<{ success: boolean; error?: string }> {
  try {
    const { supabase } = await import('@/lib/supabase');
    const updates: any = { status, updated_at: new Date().toISOString() };
    if (adminNotes !== undefined) updates.admin_notes = adminNotes;
    if (status === 'completed' || status === 'rejected') updates.resolved_at = new Date().toISOString();

    const { error } = await supabase
      .from('marketing_service_requests')
      .update(updates)
      .eq('id', requestId);

    if (error) return { success: false, error: error.message };
    return { success: true };
  } catch (e: any) {
    return { success: false, error: e.message || 'Failed to update marketing request' };
  }
}
