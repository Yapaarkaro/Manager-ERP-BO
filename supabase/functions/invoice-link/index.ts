// @ts-nocheck — Supabase Edge Function runs on Deno, not local Node/Expo TS
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== 'GET') {
    return new Response('Method not allowed', { status: 405, headers: corsHeaders });
  }

  try {
    const url = new URL(req.url);
    const invoiceId = url.searchParams.get('invoice_id');
    const businessId = url.searchParams.get('business_id');
    const type = url.searchParams.get('type') || 'sale';

    if (!invoiceId || !businessId) {
      return new Response('Missing required parameters', { status: 400, headers: corsHeaders });
    }

    if (!UUID_RE.test(invoiceId) || !UUID_RE.test(businessId)) {
      return new Response('Invalid parameters', { status: 400, headers: corsHeaders });
    }

    if (!['sale', 'purchase', 'return', 'po'].includes(type)) {
      return new Response('Invalid type', { status: 400, headers: corsHeaders });
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch business details
    const { data: business } = await supabase
      .from('businesses')
      .select('legal_name, tax_id, phone, owner_name, gstin_data')
      .eq('id', businessId)
      .maybeSingle();

    // Fetch invoice details based on type
    let invoice: any = null;
    let items: any[] = [];
    if (type === 'sale') {
      const { data } = await supabase
        .from('invoices')
        .select('id, invoice_number, invoice_date, total_amount, customer_name, payment_status, tax_amount, discount_amount, subtotal')
        .eq('id', invoiceId)
        .eq('business_id', businessId)
        .maybeSingle();
      invoice = data;
      if (data) {
        const { data: lineItems } = await supabase
          .from('invoice_items')
          .select('product_name, quantity, unit_price, total_price, tax_amount, discount_amount, hsn_code, unit')
          .eq('invoice_id', invoiceId);
        items = lineItems || [];
      }
    } else if (type === 'purchase') {
      const { data } = await supabase
        .from('purchase_invoices')
        .select('id, invoice_number, invoice_date, total_amount, supplier_name, payment_status, tax_amount, discount_amount, subtotal')
        .eq('id', invoiceId)
        .eq('business_id', businessId)
        .maybeSingle();
      invoice = data;
      if (data) {
        const { data: lineItems } = await supabase
          .from('purchase_invoice_items')
          .select('product_name, quantity, unit_price, total_price, tax_amount, discount_amount, hsn_code, unit')
          .eq('purchase_invoice_id', invoiceId);
        items = lineItems || [];
      }
    } else if (type === 'return') {
      const { data } = await supabase
        .from('returns')
        .select('id, return_number, return_date, total_amount, customer_name, tax_amount, subtotal')
        .eq('id', invoiceId)
        .eq('business_id', businessId)
        .maybeSingle();
      invoice = data;
      if (data) {
        const { data: lineItems } = await supabase
          .from('return_items')
          .select('product_name, quantity, unit_price, total_price, tax_amount, hsn_code, unit')
          .eq('return_id', invoiceId);
        items = lineItems || [];
      }
    } else if (type === 'po') {
      const { data } = await supabase
        .from('purchase_orders')
        .select('id, po_number, order_date, total_amount, supplier_name, status, tax_amount, subtotal, notes')
        .eq('id', invoiceId)
        .eq('business_id', businessId)
        .maybeSingle();
      if (data) {
        invoice = { ...data, invoice_number: data.po_number, invoice_date: data.order_date, payment_status: data.status };
      }
      if (data) {
        const { data: lineItems } = await supabase
          .from('purchase_order_items')
          .select('product_name, quantity, unit_price, total_price, tax_amount, hsn_code, unit')
          .eq('purchase_order_id', invoiceId);
        items = lineItems || [];
      }
    }

    const gstinData = business?.gstin_data && typeof business.gstin_data === 'object' ? business.gstin_data : null;
    const businessName = (gstinData as any)?.legal_name || business?.legal_name || 'Business';
    const invoiceNumber = invoice?.invoice_number || invoice?.return_number || 'N/A';
    const amount = invoice?.total_amount ? `₹${Number(invoice.total_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '';
    const date = invoice?.invoice_date || invoice?.return_date || '';
    const formattedDate = date ? new Date(date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }) : '';

    const queryStr = `invoice_id=${invoiceId}&business_id=${businessId}&type=${type}&business_name=${encodeURIComponent(businessName)}&invoice_number=${encodeURIComponent(invoiceNumber)}&amount=${invoice?.total_amount || ''}`;
    const webUrl = `https://app.getmanager.in/invoice-link?${queryStr}`;
    const nativeUrl = `manager://invoice-link?${queryStr}`;
    const deepLinkUrl = webUrl;

    const typeLabel = type === 'sale' ? 'Sales Invoice' : type === 'purchase' ? 'Purchase Invoice' : type === 'po' ? 'Purchase Order' : 'Return / Credit Note';
    const partyLabel = type === 'purchase' ? 'Supplier' : 'Customer';
    const partyName = invoice?.customer_name || invoice?.supplier_name || '';
    const subtotal = invoice?.subtotal ? `₹${Number(invoice.subtotal).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '';
    const taxTotal = invoice?.tax_amount ? `₹${Number(invoice.tax_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '';
    const discountTotal = invoice?.discount_amount && Number(invoice.discount_amount) > 0 ? `₹${Number(invoice.discount_amount).toLocaleString('en-IN', { minimumFractionDigits: 2 })}` : '';

    const itemsHTML = items.length > 0 ? items.map((item: any, idx: number) => `
      <tr>
        <td style="padding:10px 8px;border-bottom:1px solid #F3F4F6;font-size:13px;color:#6B7280;">${idx + 1}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #F3F4F6;">
          <div style="font-size:14px;font-weight:500;color:#1F2937;">${item.product_name || 'Item'}</div>
          ${item.hsn_code ? `<div style="font-size:11px;color:#9CA3AF;margin-top:2px;">HSN: ${item.hsn_code}</div>` : ''}
        </td>
        <td style="padding:10px 8px;border-bottom:1px solid #F3F4F6;text-align:center;font-size:13px;color:#1F2937;">${item.quantity || 0}${item.unit ? ' ' + item.unit : ''}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #F3F4F6;text-align:right;font-size:13px;color:#1F2937;">₹${Number(item.unit_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
        <td style="padding:10px 8px;border-bottom:1px solid #F3F4F6;text-align:right;font-size:13px;font-weight:600;color:#1F2937;">₹${Number(item.total_price || 0).toLocaleString('en-IN', { minimumFractionDigits: 2 })}</td>
      </tr>
    `).join('') : '<tr><td colspan="5" style="padding:20px;text-align:center;color:#9CA3AF;font-size:13px;">No items available</td></tr>';

    const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<title>${typeLabel} #${invoiceNumber} from ${businessName}</title>
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  body{font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;background:#F3F4F6;color:#1F2937;min-height:100vh;padding:20px}
  .wrap{max-width:640px;margin:0 auto}
  .invoice{background:#fff;border-radius:16px;box-shadow:0 4px 24px rgba(0,0,0,0.08);overflow:hidden}
  .inv-header{background:linear-gradient(135deg,#3F66AC 0%,#2D4F8A 100%);color:#fff;padding:28px 28px 24px}
  .inv-badge{display:inline-block;background:rgba(255,255,255,0.2);font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.8px;padding:4px 12px;border-radius:6px;margin-bottom:12px}
  .inv-number{font-size:22px;font-weight:700;margin-bottom:4px}
  .inv-biz{font-size:15px;opacity:0.9}
  .inv-body{padding:24px 28px}
  .inv-meta{display:flex;flex-wrap:wrap;gap:16px;margin-bottom:24px;padding-bottom:20px;border-bottom:1px solid #E5E7EB}
  .meta-block{flex:1;min-width:140px}
  .meta-label{font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#9CA3AF;margin-bottom:4px}
  .meta-value{font-size:14px;font-weight:600;color:#1F2937}
  .items-table{width:100%;border-collapse:collapse;margin-bottom:20px}
  .items-table th{text-align:left;padding:10px 8px;font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px;color:#9CA3AF;border-bottom:2px solid #E5E7EB}
  .items-table th:nth-child(3),.items-table th:nth-child(4),.items-table th:nth-child(5){text-align:right}
  .items-table th:nth-child(3){text-align:center}
  .totals{border-top:2px solid #E5E7EB;padding-top:16px;margin-bottom:24px}
  .total-row{display:flex;justify-content:space-between;padding:5px 0;font-size:14px}
  .total-row .t-label{color:#6B7280}
  .total-row .t-val{font-weight:500}
  .grand-total{display:flex;justify-content:space-between;padding:12px 0;margin-top:8px;border-top:2px solid #1F2937}
  .grand-total .t-label{font-size:16px;font-weight:700;color:#1F2937}
  .grand-total .t-val{font-size:20px;font-weight:700;color:#059669}
  .status-badge{display:inline-block;padding:4px 12px;border-radius:20px;font-size:12px;font-weight:600;text-transform:capitalize}
  .status-paid{background:#D1FAE5;color:#065F46}
  .status-unpaid,.status-pending{background:#FEF3C7;color:#92400E}
  .status-partial{background:#DBEAFE;color:#1E40AF}
  .inv-actions{display:flex;gap:10px;padding:0 28px 24px;flex-wrap:wrap}
  .btn{flex:1;min-width:180px;padding:14px;border-radius:12px;font-size:15px;font-weight:600;text-decoration:none;cursor:pointer;border:none;text-align:center}
  .btn-primary{background:#3F66AC;color:#fff}
  .btn-secondary{background:#F3F4F6;color:#3F66AC;border:1px solid #E5E7EB}
  .inv-footer{text-align:center;padding:16px 28px 20px;border-top:1px solid #F3F4F6;font-size:12px;color:#9CA3AF}
  .inv-footer a{color:#3F66AC;text-decoration:none}
  @media(max-width:480px){.inv-header,.inv-body,.inv-actions{padding-left:16px;padding-right:16px}.inv-actions{flex-direction:column}}
</style>
</head>
<body>
<div class="wrap">
<div class="invoice">
  <div class="inv-header">
    <div class="inv-badge">${typeLabel}</div>
    <div class="inv-number">#${invoiceNumber}</div>
    <div class="inv-biz">${businessName}</div>
  </div>

  <div class="inv-body">
    <div class="inv-meta">
      ${formattedDate ? `<div class="meta-block"><div class="meta-label">Date</div><div class="meta-value">${formattedDate}</div></div>` : ''}
      ${partyName ? `<div class="meta-block"><div class="meta-label">${partyLabel}</div><div class="meta-value">${partyName}</div></div>` : ''}
      ${invoice?.payment_status ? `<div class="meta-block"><div class="meta-label">Payment</div><span class="status-badge status-${(invoice.payment_status || '').toLowerCase()}">${invoice.payment_status}</span></div>` : ''}
      ${business?.tax_id ? `<div class="meta-block"><div class="meta-label">GSTIN</div><div class="meta-value">${business.tax_id}</div></div>` : ''}
    </div>

    <table class="items-table">
      <thead><tr>
        <th>#</th><th>Item</th><th>Qty</th><th>Rate</th><th>Amount</th>
      </tr></thead>
      <tbody>${itemsHTML}</tbody>
    </table>

    <div class="totals">
      ${subtotal ? `<div class="total-row"><span class="t-label">Subtotal</span><span class="t-val">${subtotal}</span></div>` : ''}
      ${taxTotal ? `<div class="total-row"><span class="t-label">Tax</span><span class="t-val">${taxTotal}</span></div>` : ''}
      ${discountTotal ? `<div class="total-row"><span class="t-label">Discount</span><span class="t-val">-${discountTotal}</span></div>` : ''}
      ${amount ? `<div class="grand-total"><span class="t-label">Total</span><span class="t-val">${amount}</span></div>` : ''}
    </div>
  </div>

  <div class="inv-actions">
    <a href="${deepLinkUrl}" class="btn btn-primary">Open in Manager App</a>
    <a href="https://getmanager.in" class="btn btn-secondary">Visit Manager Website</a>
  </div>

  <div class="inv-footer">
    <p>Powered by <a href="#">Manager ERP</a></p>
  </div>
</div>
</div>
</body>
</html>`;

    return new Response(html, {
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/html; charset=utf-8',
      },
    });
  } catch (_error) {
    return new Response('Something went wrong', { status: 500, headers: corsHeaders });
  }
});
