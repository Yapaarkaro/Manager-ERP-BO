import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const supabase = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

function json(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });
  if (req.method !== "POST") return json({ error: "Method not allowed" }, 405);

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Missing authorization" }, 401);

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Unauthorized" }, 401);

    const body = await req.json();
    const { ownerName, businessName, businessType, taxIdType, taxIdValue, gstinData, dateOfBirth, registeredMobile } = body;

    if (!ownerName || !businessName || !businessType || !taxIdType || !taxIdValue) {
      return json({ error: "Missing required fields: ownerName, businessName, businessType, taxIdType, taxIdValue" }, 400);
    }

    if (typeof businessType !== "string" || businessType.trim().length === 0) {
      return json({ error: "businessType must be a non-empty string" }, 400);
    }

    if (taxIdType === "PAN" && !dateOfBirth) {
      return json({ error: "Date of birth is required for PAN registration" }, 400);
    }

    const phone = registeredMobile || user.phone?.replace(/^\+91/, "") || "";
    if (!phone) return json({ error: "Phone number is required" }, 400);

    let parsedGstinData = null;
    if (gstinData) {
      parsedGstinData = typeof gstinData === "string" ? JSON.parse(gstinData) : gstinData;
    }
    if (taxIdType === "GSTIN" && !parsedGstinData) {
      return json({ error: "GSTIN data is required for GSTIN registration" }, 400);
    }

    const finalBusinessType = businessType.trim();

    // Check if business already exists for this user via signup_progress
    const { data: existingProgress } = await supabase
      .from("signup_progress")
      .select("business_id")
      .eq("user_id", user.id)
      .maybeSingle();

    if (existingProgress?.business_id) {
      // Update existing business
      const { error: updateError } = await supabase
        .from("businesses")
        .update({
          owner_name: ownerName,
          legal_name: businessName,
          business_type: finalBusinessType,
          is_tax_id_verified: body.taxIdVerified ?? false,
          gstin_data: parsedGstinData,
          owner_dob: dateOfBirth || null,
          updated_at: new Date().toISOString(),
        })
        .eq("id", existingProgress.business_id);

      if (updateError) return json({ error: updateError.message }, 500);

      // Update user name
      await supabase
        .from("users")
        .update({ name: ownerName, updated_at: new Date().toISOString() })
        .eq("id", user.id);

      // Update existing primary address name to match business name
      await supabase
        .from("locations")
        .update({ name: businessName, updated_at: new Date().toISOString() })
        .eq("business_id", existingProgress.business_id)
        .eq("is_primary", true);

      return json({ success: true, businessId: existingProgress.business_id });
    }

    // Check if a business with this tax ID already exists (owned by same or different user)
    const { data: existingBusiness } = await supabase
      .from("businesses")
      .select("id, owner_user_id")
      .eq("tax_id_type", taxIdType)
      .eq("tax_id", taxIdValue)
      .maybeSingle();

    if (existingBusiness) {
      if (existingBusiness.owner_user_id === user.id) {
        // Same user, different device/session — link and update the existing business
        const { error: updateError } = await supabase
          .from("businesses")
          .update({
            owner_name: ownerName,
            legal_name: businessName,
            business_type: finalBusinessType,
            is_tax_id_verified: body.taxIdVerified ?? false,
            gstin_data: parsedGstinData,
            owner_dob: dateOfBirth || null,
            updated_at: new Date().toISOString(),
          })
          .eq("id", existingBusiness.id);

        if (updateError) return json({ error: updateError.message }, 500);

        await supabase
          .from("users")
          .update({ name: ownerName, updated_at: new Date().toISOString() })
          .eq("id", user.id);

        // Link signup_progress to the existing business
        await supabase
          .from("signup_progress")
          .update({ business_id: existingBusiness.id, updated_at: new Date().toISOString() })
          .eq("user_id", user.id);

        return json({ success: true, businessId: existingBusiness.id });
      } else {
        // Different user owns this tax ID
        const idLabel = taxIdType === "GSTIN" ? "GSTIN" : "PAN";
        return json({ error: `This ${idLabel} is already registered with another account. Please use a different ${idLabel} or contact support.` }, 409);
      }
    }

    // Create new business
    const { data: business, error: bizError } = await supabase
      .from("businesses")
      .insert({
        owner_user_id: user.id,
        owner_name: ownerName,
        legal_name: businessName,
        business_type: finalBusinessType,
        tax_id_type: taxIdType,
        tax_id: taxIdValue,
        is_tax_id_verified: body.taxIdVerified ?? false,
        phone: phone.replace(/\D/g, "").slice(0, 10),
        is_phone_verified: true,
        gstin_data: parsedGstinData,
        owner_dob: dateOfBirth || null,
        is_onboarding_complete: false,
      })
      .select("id")
      .single();

    if (bizError) return json({ error: bizError.message }, 500);

    // Create user profile
    const { error: userError } = await supabase
      .from("users")
      .upsert({
        id: user.id,
        business_id: business.id,
        name: ownerName,
        role: "Owner",
        phone: phone.replace(/\D/g, "").slice(0, 10),
        is_active: true,
      }, { onConflict: "id" });

    if (userError) {
      console.error("User creation error:", userError.message);
    }

    // Update signup_progress with business_id
    await supabase
      .from("signup_progress")
      .update({ business_id: business.id, updated_at: new Date().toISOString() })
      .eq("user_id", user.id);

    // If GSTIN data contains address, auto-create primary location using business name
    if (parsedGstinData?.pradr?.addr) {
      const addr = parsedGstinData.pradr.addr;
      const locationData = {
        business_id: business.id,
        name: businessName,
        type: "primary",
        address_line_1: [addr.bno, addr.bnm, addr.flno, addr.st].filter(Boolean).join(", ") || addr.loc || "N/A",
        address_line_2: addr.loc || null,
        address_line_3: addr.dst || null,
        city: addr.dst || addr.loc || "N/A",
        state: addr.stcd ? getStateName(addr.stcd) : (addr.st || "N/A"),
        state_code: addr.stcd || null,
        pincode: addr.pncd || "000000",
        is_primary: true,
        created_by: user.id,
      };

      const { data: location } = await supabase
        .from("locations")
        .insert(locationData)
        .select("id")
        .single();

      if (location) {
        await supabase
          .from("businesses")
          .update({ primary_address_id: location.id })
          .eq("id", business.id);
      }
    }

    return json({ success: true, businessId: business.id });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return json({ error: message }, 500);
  }
});

function getStateName(stateCode: string): string {
  const states: Record<string, string> = {
    "01": "Jammu & Kashmir", "02": "Himachal Pradesh", "03": "Punjab",
    "04": "Chandigarh", "05": "Uttarakhand", "06": "Haryana",
    "07": "Delhi", "08": "Rajasthan", "09": "Uttar Pradesh",
    "10": "Bihar", "11": "Sikkim", "12": "Arunachal Pradesh",
    "13": "Nagaland", "14": "Manipur", "15": "Mizoram",
    "16": "Tripura", "17": "Meghalaya", "18": "Assam",
    "19": "West Bengal", "20": "Jharkhand", "21": "Odisha",
    "22": "Chhattisgarh", "23": "Madhya Pradesh", "24": "Gujarat",
    "26": "Dadra & Nagar Haveli", "27": "Maharashtra", "29": "Karnataka",
    "30": "Goa", "31": "Lakshadweep", "32": "Kerala",
    "33": "Tamil Nadu", "34": "Puducherry", "35": "Andaman & Nicobar",
    "36": "Telangana", "37": "Andhra Pradesh", "38": "Ladakh",
  };
  return states[stateCode] || stateCode;
}
