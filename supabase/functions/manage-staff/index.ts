import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from 'jsr:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get('Authorization');
    if (!authHeader) return json({ success: false, error: 'Missing authorization header' }, 401);

    const token = authHeader.replace('Bearer ', '');
    const { data: { user }, error: userError } = await supabase.auth.getUser(token);
    if (userError || !user) return json({ success: false, error: 'Unauthorized' }, 401);

    const { data: userData, error: userDataError } = await supabase
      .from('users')
      .select('business_id')
      .eq('id', user.id)
      .single();

    if (userDataError || !userData?.business_id) {
      return json({ success: false, error: 'User business not found' }, 400);
    }

    const businessId = userData.business_id;

    // GET - fetch all staff
    if (req.method === 'GET') {
      const { data: staff, error: staffError } = await supabase
        .from('staff')
        .select('*')
        .eq('business_id', businessId)
        .eq('is_deleted', false)
        .order('created_at', { ascending: false });

      if (staffError) {
        console.error('Error fetching staff:', staffError);
        return json({ success: false, error: staffError.message }, 500);
      }

      return json({ success: true, staff: staff || [] });
    }

    // POST - create new staff
    if (req.method === 'POST') {
      const body = await req.json();

      const staffData: Record<string, unknown> = {
        business_id: businessId,
        name: body.name,
        mobile: body.mobile || null,
        email: body.email || null,
        role: body.role,
        department: body.department || null,
        address: body.address || null,
        employee_id: body.employeeId || body.employee_id || null,
        location_id: body.locationId || body.location_id || null,
        location_type: body.locationType || body.location_type || null,
        location_name: body.locationName || body.location_name || null,
        basic_salary: (body.basicSalary || body.basic_salary) ? parseFloat(String(body.basicSalary || body.basic_salary)) : null,
        allowances: body.allowances ? parseFloat(String(body.allowances)) : null,
        emergency_contact_name: body.emergencyContactName || body.emergency_contact_name || null,
        emergency_contact_relation: body.emergencyContactRelation || body.emergency_contact_relation || null,
        emergency_contact_phone: body.emergencyContactPhone || body.emergency_contact_phone || null,
        permissions: body.permissions || [],
        monthly_sales_target: (body.monthlySalesTarget || body.monthly_sales_target) ? parseFloat(String(body.monthlySalesTarget || body.monthly_sales_target)) : null,
        monthly_invoice_target: (body.monthlyInvoiceTarget || body.monthly_invoice_target) ? parseFloat(String(body.monthlyInvoiceTarget || body.monthly_invoice_target)) : null,
        verification_code: body.verificationCode || body.verification_code || null,
        status: body.status || 'active',
        avatar: body.avatar || null,
      };

      const { data: newStaff, error: insertError } = await supabase
        .from('staff')
        .insert(staffData)
        .select()
        .single();

      if (insertError) {
        console.error('Error creating staff:', insertError);
        return json({ success: false, error: insertError.message }, 500);
      }

      return json({ success: true, staff: newStaff }, 201);
    }

    // PUT - update staff
    if (req.method === 'PUT') {
      const body = await req.json();
      const staffId = body.id || body.staffId;

      if (!staffId) {
        return json({ success: false, error: 'Staff ID is required' }, 400);
      }

      const updateData: Record<string, unknown> = {};
      if (body.name !== undefined) updateData.name = body.name;
      if (body.mobile !== undefined) updateData.mobile = body.mobile;
      if (body.email !== undefined) updateData.email = body.email;
      if (body.role !== undefined) updateData.role = body.role;
      if (body.department !== undefined) updateData.department = body.department;
      if (body.address !== undefined) updateData.address = body.address;
      if (body.employeeId !== undefined || body.employee_id !== undefined) updateData.employee_id = body.employeeId || body.employee_id;
      if (body.locationId !== undefined || body.location_id !== undefined) updateData.location_id = body.locationId || body.location_id;
      if (body.locationType !== undefined || body.location_type !== undefined) updateData.location_type = body.locationType || body.location_type;
      if (body.locationName !== undefined || body.location_name !== undefined) updateData.location_name = body.locationName || body.location_name;
      if (body.basicSalary !== undefined || body.basic_salary !== undefined) updateData.basic_salary = (body.basicSalary || body.basic_salary) ? parseFloat(String(body.basicSalary || body.basic_salary)) : null;
      if (body.allowances !== undefined) updateData.allowances = body.allowances ? parseFloat(String(body.allowances)) : null;
      if (body.emergencyContactName !== undefined || body.emergency_contact_name !== undefined) updateData.emergency_contact_name = body.emergencyContactName || body.emergency_contact_name;
      if (body.emergencyContactRelation !== undefined || body.emergency_contact_relation !== undefined) updateData.emergency_contact_relation = body.emergencyContactRelation || body.emergency_contact_relation;
      if (body.emergencyContactPhone !== undefined || body.emergency_contact_phone !== undefined) updateData.emergency_contact_phone = body.emergencyContactPhone || body.emergency_contact_phone;
      if (body.permissions !== undefined) updateData.permissions = body.permissions;
      if (body.monthlySalesTarget !== undefined || body.monthly_sales_target !== undefined) updateData.monthly_sales_target = (body.monthlySalesTarget || body.monthly_sales_target) ? parseFloat(String(body.monthlySalesTarget || body.monthly_sales_target)) : null;
      if (body.monthlyInvoiceTarget !== undefined || body.monthly_invoice_target !== undefined) updateData.monthly_invoice_target = (body.monthlyInvoiceTarget || body.monthly_invoice_target) ? parseFloat(String(body.monthlyInvoiceTarget || body.monthly_invoice_target)) : null;
      if (body.verificationCode !== undefined || body.verification_code !== undefined) updateData.verification_code = body.verificationCode ?? body.verification_code;
      if (body.status !== undefined) updateData.status = body.status;
      if (body.avatar !== undefined) updateData.avatar = body.avatar;

      updateData.updated_at = new Date().toISOString();

      const { data: updatedStaff, error: updateError } = await supabase
        .from('staff')
        .update(updateData)
        .eq('id', staffId)
        .eq('business_id', businessId)
        .select()
        .single();

      if (updateError) {
        console.error('Error updating staff:', updateError);
        return json({ success: false, error: updateError.message }, 500);
      }

      return json({ success: true, staff: updatedStaff });
    }

    // DELETE - soft delete staff
    if (req.method === 'DELETE') {
      let staffId: string | null = null;
      const url = new URL(req.url);
      staffId = url.searchParams.get('id');

      if (!staffId) {
        try {
          const body = await req.json();
          staffId = body.staffId || body.id || null;
        } catch {}
      }

      if (!staffId) return json({ success: false, error: 'Staff ID is required' }, 400);

      const { error: deleteError } = await supabase
        .from('staff')
        .update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id })
        .eq('id', staffId)
        .eq('business_id', businessId);

      if (deleteError) {
        console.error('Error deleting staff:', deleteError);
        return json({ success: false, error: deleteError.message }, 500);
      }

      return json({ success: true, message: 'Staff deleted successfully' });
    }

    return json({ success: false, error: 'Method not allowed' }, 405);
  } catch (error: any) {
    console.error('Error in manage-staff function:', error);
    return json({ success: false, error: error.message || 'Internal server error' }, 500);
  }
});
