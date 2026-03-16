// @ts-nocheck — Supabase Edge Function runs on Deno, not local Node/Expo TS
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

function maskMobile(mobile: string): string {
  if (!mobile || mobile.length < 4) return '****';
  return mobile.slice(0, 2) + '*'.repeat(mobile.length - 4) + mobile.slice(-2);
}

const STATE_NAMES = ['Andhra Pradesh','Arunachal Pradesh','Assam','Bihar','Chhattisgarh','Goa','Gujarat','Haryana','Himachal Pradesh','Jharkhand','Karnataka','Kerala','Madhya Pradesh','Maharashtra','Manipur','Meghalaya','Mizoram','Nagaland','Odisha','Punjab','Rajasthan','Sikkim','Tamil Nadu','Telangana','Tripura','Uttar Pradesh','Uttarakhand','West Bengal','Delhi','Jammu and Kashmir','Ladakh','Chandigarh','Puducherry','Lakshadweep','Andaman and Nicobar Islands','Dadra and Nagar Haveli and Daman and Diu'];

function parseAddress(fullAddress: string) {
  const empty = { bno: '', st: '', loc: '', dst: '', city: '', stcd: '', pncd: '', flno: '', bnm: '', lg: '', lt: '' };
  if (!fullAddress) return empty;

  const parts = fullAddress.split(',').map(p => p.trim()).filter(Boolean);
  const pincodeMatch = fullAddress.match(/\b(\d{6})\b/);
  const pincode = pincodeMatch ? pincodeMatch[1] : '';

  let state = '';
  for (const s of STATE_NAMES) {
    if (fullAddress.toLowerCase().includes(s.toLowerCase())) { state = s; break; }
  }

  const meaningful = parts.filter(p => {
    const trimmed = p.trim();
    if (/^\d{6}$/.test(trimmed)) return false;
    if (state && trimmed.toLowerCase() === state.toLowerCase()) return false;
    return trimmed.length > 0;
  });

  const streetWords = /\b(road|rd|street|st|cross|main|lane|avenue|ave|nagar|marg|path|gali|circle|layout|extension|extn|phase|sector|block)\b/i;
  const floorWords = /\b(floor|flr|storey|level|basement)\b/i;
  const doorPattern = /^(no\.?\s*)?[\d]+[\/\-]?[\d]*[a-z]?$/i;
  const buildingWords = /\b(building|bldg|tower|complex|apartment|apt|plaza|house|bhavan|bhawan|mansion|residency|arcade|centre|center|mall|market|industrial|estate)\b/i;

  let bno = '', bnm = '', flno = '', st = '', loc = '', city = '', dst = '';
  const unclassified: string[] = [];

  for (const part of meaningful) {
    const lower = part.toLowerCase();
    if (!bno && doorPattern.test(part)) { bno = part; continue; }
    if (!flno && floorWords.test(lower)) { flno = part; continue; }
    if (!bnm && buildingWords.test(lower)) { bnm = part; continue; }
    if (!st && streetWords.test(lower)) { st = part; continue; }
    unclassified.push(part);
  }

  // If no door number found, check if first part starts with a digit
  if (!bno && meaningful.length > 0 && /^\d/.test(meaningful[0])) {
    bno = meaningful[0];
    const idx = unclassified.indexOf(meaningful[0]);
    if (idx >= 0) unclassified.splice(idx, 1);
  }

  // Assign remaining parts: locality, district, city
  if (unclassified.length >= 3) {
    if (!bnm) bnm = unclassified.shift()!;
    else if (!st) st = unclassified.shift()!;
    else unclassified.shift();
  }
  if (unclassified.length >= 1) loc = unclassified.shift()!;
  if (unclassified.length >= 2) { dst = unclassified.shift()!; city = unclassified.shift()!; }
  else if (unclassified.length >= 1) city = unclassified.shift()!;

  if (!city && loc) { city = loc; loc = ''; }

  return { bno, bnm, st, loc, dst, city, stcd: state, pncd: pincode, flno, lg: '', lt: '' };
}

function buildStructuredAddress(details: any, principalContact: any) {
  const rawAddress = principalContact.address || '';
  const parsed = parseAddress(rawAddress);

  const structured = details.pradr?.addr || details.address_details || {};
  if (structured.bno || structured.bnm || structured.st) {
    return {
      bno: structured.bno || structured.door_number || parsed.bno,
      bnm: structured.bnm || structured.building_name || parsed.bnm,
      st: structured.st || structured.street || parsed.st,
      loc: structured.loc || structured.locality || parsed.loc,
      dst: structured.dst || structured.district || parsed.dst,
      city: structured.city || parsed.city,
      stcd: structured.stcd || structured.state || parsed.stcd,
      pncd: structured.pncd || structured.pincode || parsed.pncd,
      flno: structured.flno || structured.floor_number || '',
      lg: structured.lg || '',
      lt: structured.lt || '',
    };
  }

  return parsed;
}

async function sendOtpViaSupabaseAuth(phone: string): Promise<{ success: boolean; error?: string }> {
  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';

  try {
    const resp = await fetch(`${supabaseUrl}/auth/v1/otp`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': anonKey,
      },
      body: JSON.stringify({ phone: `+91${phone}` }),
    });

    if (resp.ok) {
      return { success: true };
    }
    const errBody = await resp.text();
    console.error('Supabase Auth OTP error:', resp.status, errBody);
    return { success: false, error: `SMS send failed (${resp.status})` };
  } catch (e) {
    console.error('Supabase Auth OTP exception:', e);
    return { success: false, error: 'Failed to send OTP' };
  }
}

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { gstin, purpose, userMobile } = await req.json();

    if (!gstin || typeof gstin !== 'string' || gstin.length !== 15) {
      return new Response(JSON.stringify({ error: 'Valid 15-character GSTIN is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (purpose === 'signup') {
      return await handleIDfyLookup(gstin, userMobile, req);
    } else {
      return await handleAppyFlowLookup(gstin);
    }
  } catch (error) {
    console.error('verify-gstin error:', error);
    return new Response(JSON.stringify({ error: error.message || 'Internal server error' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});

async function getIDfyCredentials(): Promise<{ accountId: string; apiKey: string }> {
  let accountId = Deno.env.get('IDFY_ACCOUNT_ID') || '';
  let apiKey = Deno.env.get('IDFY_API_KEY') || '';
  if (accountId && apiKey) return { accountId, apiKey };
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const sb = createClient(supabaseUrl, supabaseKey);
    const { data } = await sb.from('app_config').select('key, value').in('key', ['IDFY_ACCOUNT_ID', 'IDFY_API_KEY']);
    if (data) {
      for (const row of data) {
        if (row.key === 'IDFY_ACCOUNT_ID') accountId = row.value;
        if (row.key === 'IDFY_API_KEY') apiKey = row.value;
      }
    }
  } catch (e) { console.error('Failed to read IDfy credentials from DB:', e); }
  return { accountId, apiKey };
}

async function handleIDfyLookup(gstin: string, userMobile: string | undefined, req: Request) {
  const { accountId, apiKey } = await getIDfyCredentials();

  if (!accountId || !apiKey) {
    return new Response(JSON.stringify({ error: 'IDfy credentials not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const taskId = crypto.randomUUID();
  const groupId = crypto.randomUUID();

  const idfyUrl = 'https://eve.idfy.com/v3/tasks/async/retrieve/gst_info';
  const requestBody = {
    task_id: taskId,
    group_id: groupId,
    data: { gstnumber: gstin, isdetails: true },
  };
  console.log('IDfy GSTIN request:', idfyUrl, JSON.stringify(requestBody));

  const idfyResponse = await fetch(idfyUrl, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'account-id': accountId,
      'api-key': apiKey,
    },
    body: JSON.stringify(requestBody),
  });

  if (!idfyResponse.ok) {
    const errText = await idfyResponse.text();
    console.error('IDfy API error:', idfyResponse.status, errText);
    return new Response(JSON.stringify({ error: `GSTIN service error: ${idfyResponse.status} - ${errText.substring(0, 200)}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const postData = await idfyResponse.json();
  const requestId = postData.request_id;

  if (!requestId) {
    console.error('IDfy returned no request_id:', JSON.stringify(postData));
    return new Response(JSON.stringify({ error: 'GSTIN verification service returned an unexpected response.' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  let result: any = null;
  const maxWaitMs = 30000;
  const startTime = Date.now();
  let pollInterval = 3000;

  while (Date.now() - startTime < maxWaitMs) {
    await new Promise(r => setTimeout(r, pollInterval));

    const pollResp = await fetch(
      `https://eve.idfy.com/v3/tasks?request_id=${requestId}`,
      {
        method: 'GET',
        headers: {
          'Content-Type': 'application/json',
          'account-id': accountId,
          'api-key': apiKey,
        },
      }
    );

    if (!pollResp.ok) {
      console.error('IDfy poll error:', pollResp.status);
      continue;
    }

    const pollData = await pollResp.json();
    const task = Array.isArray(pollData) ? pollData[0] : pollData;

    if (task?.status === 'completed' && task?.result) {
      result = task.result;
      break;
    }
    if (task?.status === 'failed') {
      console.error('IDfy task failed:', task.error, task.message);
      return new Response(JSON.stringify({ error: task.message || 'GSTIN verification failed at source.' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    pollInterval = Math.min(pollInterval + 1000, 5000);
  }

  if (!result) {
    return new Response(JSON.stringify({ error: 'GSTIN verification timed out. Please try again.' }), { status: 504, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (!result || result.status !== 'id_found' || !result.details) {
    return new Response(JSON.stringify({ error: 'GSTIN not found or inactive. Please check the number and try again.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const details = result.details;
  const principalContact = details.contact_details?.principal || {};
  const registeredMobile = result.mobile || principalContact.mobile || '';
  const registeredEmail = principalContact.email || result.email || '';
  const structuredAddr = buildStructuredAddress(details, principalContact);

  const taxpayerInfo = {
    lgnm: details.legal_name || '',
    tradeNam: details.business_name || details.legal_name || '',
    gstin: details.gstin || gstin,
    sts: details.gstin_status || '',
    ctb: details.constitution_of_business || '',
    rgdt: details.date_of_registration || '',
    dty: details.taxpayer_type || '',
    nba: details.nature_bus_activities || [],
    pradr: {
      ntr: (details.nature_bus_activities || []).join(', '),
      addr: structuredAddr,
    },
    promoters: details.promoters || [],
    registeredEmail: registeredEmail,
    panNumber: details.pan_number || '',
  };

  const cleanUserMobile = (userMobile || '').replace(/^\+91/, '').replace(/\D/g, '');
  const cleanRegisteredMobile = registeredMobile.replace(/^\+91/, '').replace(/\D/g, '');
  const mobileMatch = cleanUserMobile.length >= 10 && cleanRegisteredMobile.length >= 10 && cleanUserMobile === cleanRegisteredMobile;

  if (mobileMatch) {
    return new Response(JSON.stringify({
      taxpayerInfo,
      mobileMatch: true,
      registeredMobile: maskMobile(cleanRegisteredMobile),
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  if (!cleanRegisteredMobile || cleanRegisteredMobile.length < 10) {
    return new Response(JSON.stringify({
      taxpayerInfo,
      mobileMatch: true,
      registeredMobile: '',
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
  const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
  const supabase = createClient(supabaseUrl, supabaseKey);

  await supabase.from('otp_verifications').delete().eq('phone', cleanRegisteredMobile).eq('purpose', 'gstin_verify').eq('verified', false);

  const expiresAt = new Date(Date.now() + 10 * 60 * 1000).toISOString();
  const { data: insertData, error: insertErr } = await supabase.from('otp_verifications').insert({
    phone: cleanRegisteredMobile,
    otp_hash: 'supabase_auth',
    purpose: 'gstin_verify',
    expires_at: expiresAt,
  }).select('id');

  if (insertErr || !insertData || insertData.length === 0) {
    console.error('Failed to store OTP record:', insertErr);
    return new Response(JSON.stringify({ error: 'Failed to initiate verification. Please try again.' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const otpRequestId = insertData[0].id;

  const smsResult = await sendOtpViaSupabaseAuth(cleanRegisteredMobile);

  if (!smsResult.success) {
    return new Response(JSON.stringify({
      error: 'Failed to send verification SMS. Please try again.',
      taxpayerInfo,
      mobileMatch: false,
      registeredMobile: maskMobile(cleanRegisteredMobile),
      smsFailed: true,
    }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({
    taxpayerInfo,
    mobileMatch: false,
    registeredMobile: maskMobile(cleanRegisteredMobile),
    otpRequestId,
  }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

async function handleAppyFlowLookup(gstin: string) {
  const appyFlowKey = Deno.env.get('APPYFLOW_API_KEY') || '';

  if (!appyFlowKey) {
    return new Response(JSON.stringify({ error: 'GSTIN lookup service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const response = await fetch('https://appyflow.in/api/verifyGST', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key_secret: appyFlowKey, gstNo: gstin }),
  });

  if (!response.ok) {
    return new Response(JSON.stringify({ error: 'GSTIN lookup service unavailable' }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  const data = await response.json();

  if (data.error) {
    return new Response(JSON.stringify({ error: data.message || 'GSTIN lookup failed' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  return new Response(JSON.stringify({ taxpayerInfo: data.taxpayerInfo }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}
