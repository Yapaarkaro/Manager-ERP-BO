// @ts-nocheck — Supabase Edge Function runs on Deno, not local Node/Expo TS
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, apikey',
};

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'POST') {
    return new Response(JSON.stringify({ error: 'Method not allowed' }), { status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }

  try {
    const { gstin, otp, otpRequestId, action } = await req.json();

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const anonKey = Deno.env.get('SUPABASE_ANON_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    if (action === 'resend') {
      if (!otpRequestId) {
        return new Response(JSON.stringify({ success: false, error: 'No verification session found.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const { data: otpRecord } = await supabase
        .from('otp_verifications')
        .select('phone, expires_at')
        .eq('id', otpRequestId)
        .eq('purpose', 'gstin_verify')
        .eq('verified', false)
        .maybeSingle();

      if (!otpRecord) {
        return new Response(JSON.stringify({ success: false, error: 'Verification session expired. Please go back and re-verify GSTIN.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const newExpiry = new Date(Date.now() + 10 * 60 * 1000).toISOString();
      await supabase.from('otp_verifications').update({ expires_at: newExpiry, attempts: 0 }).eq('id', otpRequestId);

      const resp = await fetch(`${supabaseUrl}/auth/v1/otp`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
        body: JSON.stringify({ phone: `+91${otpRecord.phone}` }),
      });

      if (resp.ok) {
        return new Response(JSON.stringify({ success: true, message: 'OTP resent successfully' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
      }

      const errText = await resp.text();
      console.error('Resend OTP failed:', resp.status, errText);
      return new Response(JSON.stringify({ success: false, error: 'Failed to resend OTP. Please try again.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!otp || typeof otp !== 'string' || otp.length !== 6) {
      return new Response(JSON.stringify({ error: 'Valid 6-digit OTP is required' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (!otpRequestId) {
      return new Response(JSON.stringify({ gstinVerified: false, error: 'Verification session not found. Please go back and re-verify your GSTIN.' }), { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const { data: otpRecord, error: fetchErr } = await supabase
      .from('otp_verifications')
      .select('*')
      .eq('id', otpRequestId)
      .eq('purpose', 'gstin_verify')
      .eq('verified', false)
      .maybeSingle();

    if (fetchErr || !otpRecord) {
      return new Response(JSON.stringify({ gstinVerified: false, error: 'No pending verification found. Please request a new OTP.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (new Date(otpRecord.expires_at) < new Date()) {
      await supabase.from('otp_verifications').delete().eq('id', otpRecord.id);
      return new Response(JSON.stringify({ gstinVerified: false, error: 'OTP has expired. Please request a new one.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    if (otpRecord.attempts >= otpRecord.max_attempts) {
      await supabase.from('otp_verifications').delete().eq('id', otpRecord.id);
      return new Response(JSON.stringify({ gstinVerified: false, error: 'Maximum verification attempts exceeded. Please request a new OTP.' }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    await supabase.from('otp_verifications').update({ attempts: otpRecord.attempts + 1 }).eq('id', otpRecord.id);

    const verifyResp = await fetch(`${supabaseUrl}/auth/v1/verify`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': anonKey },
      body: JSON.stringify({
        phone: `+91${otpRecord.phone}`,
        token: otp,
        type: 'sms',
      }),
    });

    if (verifyResp.ok) {
      await supabase.from('otp_verifications').update({ verified: true }).eq('id', otpRecord.id);
      return new Response(JSON.stringify({ gstinVerified: true, success: true }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
    }

    const verifyErr = await verifyResp.text();
    console.error('OTP verify failed:', verifyResp.status, verifyErr);

    const remaining = otpRecord.max_attempts - otpRecord.attempts - 1;
    return new Response(JSON.stringify({ gstinVerified: false, error: `Invalid OTP. ${remaining} attempt${remaining !== 1 ? 's' : ''} remaining.` }), { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  } catch (error) {
    console.error('verify-gstin-otp error:', error);
    return new Response(JSON.stringify({ gstinVerified: false, error: error.message || 'Verification failed' }), { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
  }
});
