// @ts-nocheck — Supabase Edge Function runs on Deno, not local Node/Expo TS
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

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

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { pan, name, dateOfBirth } = await req.json();

    if (!pan || typeof pan !== 'string' || pan.length !== 10) {
      return new Response(JSON.stringify({ error: 'Valid 10-character PAN is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!name || typeof name !== 'string' || name.trim().length === 0) {
      return new Response(JSON.stringify({ error: 'Name as per PAN is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!dateOfBirth || typeof dateOfBirth !== 'string') {
      return new Response(JSON.stringify({ error: 'Date of birth is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { accountId, apiKey } = await getIDfyCredentials();

    if (!accountId || !apiKey) {
      return new Response(JSON.stringify({ error: 'PAN verification service not configured' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const taskId = crypto.randomUUID();
    const groupId = crypto.randomUUID();

    const idfyUrl = 'https://eve.idfy.com/v3/tasks/sync/verify_with_source/ind_pan';
    const requestBody = {
      task_id: taskId,
      group_id: groupId,
      data: {
        id_number: pan.toUpperCase(),
        full_name: name.trim(),
        dob: dateOfBirth,
      },
    };
    console.log('IDfy PAN request:', idfyUrl, JSON.stringify(requestBody));

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
      console.error('IDfy PAN API error:', idfyResponse.status, errText, 'accountId:', accountId.substring(0, 12));
      return new Response(JSON.stringify({ error: `PAN service error: ${idfyResponse.status} - ${errText.substring(0, 200)}` }), { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const idfyData = await idfyResponse.json();
    console.log('IDfy PAN response:', JSON.stringify(idfyData).substring(0, 500));

    let result: any;
    if (Array.isArray(idfyData) && idfyData.length > 0) {
      result = idfyData[0].result;
    } else if (idfyData.result) {
      result = idfyData.result;
    } else {
      result = idfyData;
    }

    if (!result || !result.source_output) {
      const status = result?.status || 'unknown';
      if (status === 'id_not_found') {
        return new Response(JSON.stringify({ panVerified: false, error: 'PAN number not found. Please check and try again.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }
      return new Response(JSON.stringify({ panVerified: false, error: 'PAN verification failed. Please try again.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const sourceOutput = result.source_output;
    const nameMatch = sourceOutput.name_match === true;
    const dobMatch = sourceOutput.dob_match === true;
    const idStatus = sourceOutput.status || '';
    const panStatusLower = (sourceOutput.pan_status || '').toLowerCase();
    const panActive = idStatus === 'id_found' || panStatusLower.includes('existing and valid') || panStatusLower.includes('operative');

    const panVerified = panActive && nameMatch;

    if (!panVerified) {
      let errorMsg = 'PAN verification failed.';
      if (!panActive) errorMsg = 'PAN is not active or not found.';
      else if (!nameMatch) errorMsg = 'Name does not match PAN records. Please check spelling.';
      else if (!dobMatch) errorMsg = 'Date of birth does not match PAN records.';
      return new Response(JSON.stringify({ panVerified: false, error: errorMsg }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    return new Response(JSON.stringify({ panVerified: true, success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('verify-pan error:', error);
    return new Response(JSON.stringify({ panVerified: false, error: error.message || 'Verification failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
