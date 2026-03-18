import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
};

function json(data: any, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

const MONTH_SHORT = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];

function formatInvoiceNumber(pattern: string, num: number): string {
  const now = new Date();
  const month = now.getMonth();
  const year = now.getFullYear();
  const fyStart = month >= 3 ? year : year - 1;
  const fyEnd = fyStart + 1;

  let result = pattern;
  result = result.replace('YYYY', fyStart.toString());
  result = result.replace('YY', (fyEnd % 100).toString().padStart(2, '0'));
  result = result.replace('MMM', MONTH_SHORT[month]);
  result = result.replace('MM', (month + 1).toString().padStart(2, '0'));
  result = result.replace('DD', now.getDate().toString().padStart(2, '0'));

  const hashMatch = result.match(/#+/);
  if (hashMatch) {
    const padLen = hashMatch[0].length;
    result = result.replace(/#+/, num.toString().padStart(padLen, '0'));
  }

  return result;
}

async function updateCustomerMetrics(supabase: any, businessId: string, customerId: string) {
  try {
    const { data: invoices } = await supabase
      .from("invoices")
      .select("total_amount, paid_amount, payment_status, invoice_date, due_date, created_at, updated_at")
      .eq("business_id", businessId)
      .eq("customer_id", customerId)
      .eq("is_deleted", false);

    if (!invoices || invoices.length === 0) return;

    const totalInvoices = invoices.length;
    const paidInvoices = invoices.filter((i: any) => i.payment_status === 'paid').length;
    const pendingInvoices = invoices.filter((i: any) => i.payment_status === 'unpaid' || i.payment_status === 'partial').length;
    const overdueInvoices = invoices.filter((i: any) => i.payment_status === 'overdue').length;
    const totalValue = invoices.reduce((s: number, i: any) => s + (parseFloat(i.total_amount) || 0), 0);
    const totalPaid = invoices.reduce((s: number, i: any) => s + (parseFloat(i.paid_amount) || 0), 0);
    const totalDue = totalValue - totalPaid;

    const paidOnes = invoices.filter((i: any) => i.payment_status === 'paid');
    let totalPayDays = 0;
    let onTimeCount = 0;
    let lateCount = 0;

    for (const inv of paidOnes) {
      const created = new Date(inv.invoice_date || inv.created_at);
      const paidAt = new Date(inv.updated_at);
      const payDays = Math.max(0, (paidAt.getTime() - created.getTime()) / (1000 * 60 * 60 * 24));
      totalPayDays += payDays;

      if (inv.due_date) {
        const due = new Date(inv.due_date);
        if (paidAt <= due) onTimeCount++;
        else lateCount++;
      } else {
        if (payDays <= 30) onTimeCount++;
        else lateCount++;
      }
    }

    const avgPayDuration = paidOnes.length > 0 ? totalPayDays / paidOnes.length : 0;
    const onTimeRate = paidOnes.length > 0 ? (onTimeCount / paidOnes.length) * 100 : 50;
    const paymentRatio = totalValue > 0 ? (totalPaid / totalValue) * 100 : 50;
    const paymentScore = Math.round(
      paymentRatio * 0.4 +
      onTimeRate * 0.35 +
      (100 - Math.min(avgPayDuration, 100)) * 0.15 +
      Math.min(totalInvoices * 3, 100) * 0.1
    );

    const lastInvoice = invoices.sort((a: any, b: any) => new Date(b.invoice_date || b.created_at).getTime() - new Date(a.invoice_date || a.created_at).getTime())[0];
    const lastPaid = paidOnes.sort((a: any, b: any) => new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime())[0];

    await supabase.from("customer_metrics").upsert({
      business_id: businessId,
      customer_id: customerId,
      total_invoices: totalInvoices,
      paid_invoices: paidInvoices,
      pending_invoices: pendingInvoices,
      overdue_invoices: overdueInvoices,
      total_value: totalValue,
      total_paid: totalPaid,
      total_due: totalDue,
      avg_payment_duration_days: Math.round(avgPayDuration * 10) / 10,
      on_time_payment_count: onTimeCount,
      late_payment_count: lateCount,
      payment_score: Math.max(0, Math.min(100, paymentScore)),
      last_invoice_date: lastInvoice ? (lastInvoice.invoice_date || lastInvoice.created_at) : null,
      last_payment_date: lastPaid ? lastPaid.updated_at : null,
      updated_at: new Date().toISOString(),
    }, { onConflict: 'business_id,customer_id' });
  } catch (e) {
    console.error("Customer metrics update failed:", e);
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
      { auth: { persistSession: false } }
    );

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) return json({ error: "Authorization required" }, 401);
    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (authError || !user) return json({ error: "Invalid token" }, 401);

    const { data: userRow } = await supabase.from("users").select("business_id, name").eq("id", user.id).single();
    if (!userRow?.business_id) return json({ error: "No business found" }, 404);
    const businessId = userRow.business_id;

    const method = req.method;

    if (method === "GET") {
      const url = new URL(req.url);
      const invoiceId = url.searchParams.get("id");

      if (invoiceId) {
        let { data: invoice, error } = await supabase.from("invoices").select("*").eq("id", invoiceId).eq("business_id", businessId).eq("is_deleted", false).maybeSingle();
        
        if (!invoice) {
          const { data: poLinked } = await supabase
            .from("purchase_orders")
            .select("linked_invoice_id")
            .eq("business_id", businessId)
            .eq("linked_invoice_id", invoiceId)
            .eq("is_deleted", false)
            .maybeSingle();
          
          if (poLinked) {
            const { data: linkedInv } = await supabase.from("invoices").select("*").eq("id", invoiceId).eq("is_deleted", false).maybeSingle();
            if (linkedInv) invoice = linkedInv;
          }
        }
        
        if (!invoice) {
          const { data: chatShared } = await supabase
            .from("messages")
            .select("id, conversation_id")
            .eq("message_type", "file")
            .filter("metadata->>entity_id", "eq", invoiceId)
            .limit(1)
            .maybeSingle();
          
          if (chatShared) {
            const { data: conv } = await supabase
              .from("conversations")
              .select("participant_other_user_id")
              .eq("id", chatShared.conversation_id)
              .maybeSingle();
            
            if (conv && conv.participant_other_user_id === user.id) {
              const { data: sharedInv } = await supabase.from("invoices").select("*").eq("id", invoiceId).eq("is_deleted", false).maybeSingle();
              if (sharedInv) invoice = sharedInv;
            }
          }
        }
        
        if (error && !invoice) return json({ error: error.message }, 500);
        if (!invoice) return json({ error: "Invoice not found" }, 404);
        const { data: items, error: itemsErr } = await supabase.from("invoice_items").select("*").eq("invoice_id", invoiceId).eq("is_deleted", false);
        if (itemsErr) console.error("Items fetch error:", itemsErr.message);
        return json({ invoice, items: items || [] });
      }

      const { data: invoices, error } = await supabase.from("invoices").select("*").eq("business_id", businessId).eq("is_deleted", false).order("invoice_date", { ascending: false });
      if (error) return json({ error: error.message }, 500);
      const list = invoices || [];
      if (list.length === 0) return json({ invoices: [] });
      const ids = list.map((i: any) => i.id);
      const countMap: Record<string, number> = {};
      const chunkSize = 200;
      for (let i = 0; i < ids.length; i += chunkSize) {
        const chunk = ids.slice(i, i + chunkSize);
        const { data: rows } = await supabase
          .from("invoice_items")
          .select("invoice_id")
          .eq("is_deleted", false)
          .in("invoice_id", chunk);
        for (const r of rows || []) {
          const id = (r as { invoice_id: string }).invoice_id;
          countMap[id] = (countMap[id] || 0) + 1;
        }
      }
      const enriched = list.map((inv: any) => ({ ...inv, item_count: countMap[inv.id] ?? 0 }));
      return json({ invoices: enriched });
    }

    if (method === "POST") {
      const body = await req.json();
      const { action } = body;

      if (action === "update_payment") {
        const result = await handleUpdatePayment(supabase, businessId, user.id, body);
        if (body.customer_id) await updateCustomerMetrics(supabase, businessId, body.customer_id);
        return result;
      }

      if (action === "get_next_number") return await handleGetNextNumber(supabase, businessId);
      if (action === "peek_next_number") return await handlePeekNextNumber(supabase, businessId);

      const { items, customer_id, customer_name, customer_type, invoice_date, due_date,
        notes, staff_id, staff_name, location_id, payment_method, paid_amount, invoice_extras } = body;

      if (!items || !Array.isArray(items) || items.length === 0) return json({ error: "At least one item is required" }, 400);
      if (!customer_name) return json({ error: "Customer name is required" }, 400);

      const resolvedStaffName = staff_name || userRow.name || null;
      const roundOffAmount = parseFloat(body.round_off_amount || body.roundOffAmount || 0) || 0;

      let invoiceNumber: string;
      const clientInvoiceNumber = body.invoice_number || body.invoiceNumber;

      if (clientInvoiceNumber) {
        invoiceNumber = clientInvoiceNumber;
      } else {
        const { data: numResult, error: numError } = await supabase.rpc("generate_next_invoice_number", { p_business_id: businessId });
        const { data: settings } = await supabase.from("business_settings").select("invoice_prefix, number_pattern, starting_invoice_number").eq("business_id", businessId).single();

        if (numError || !numResult) {
          const prefix = settings?.invoice_prefix || "INV";
          const startNum = settings?.starting_invoice_number || 1;
          const lastNum = 0;
          const nextNum = Math.max(lastNum + 1, startNum);
          await supabase.from("business_settings").update({ last_invoice_number: nextNum }).eq("business_id", businessId);
          const pattern = settings?.number_pattern?.pattern;
          invoiceNumber = pattern ? formatInvoiceNumber(pattern, nextNum) : `${prefix}-${nextNum.toString().padStart(4, '0')}`;
        } else {
          const rawNum = parseInt(numResult, 10);
          const pattern = settings?.number_pattern?.pattern;
          invoiceNumber = pattern ? formatInvoiceNumber(pattern, rawNum) : `${settings?.invoice_prefix || 'INV'}-${rawNum.toString().padStart(4, '0')}`;
        }
      }

      let subtotal = 0;
      let totalTax = 0;
      let totalCess = 0;
      const resolvedItems: any[] = [];

      for (const item of items) {
        const rawProductId = item.product_id || item.productId;
        let productId: string | null = null;
        let unitPrice = parseFloat(item.unit_price || item.unitPrice || 0);
        let taxRate = parseFloat(item.tax_rate || item.taxRate || 0);
        let taxInclusive = item.tax_inclusive ?? item.taxInclusive ?? false;
        let cessType = item.cess_type || item.cessType || 'none';
        let cessRate = parseFloat(item.cess_rate || item.cessRate || 0);
        let cessAmount = parseFloat(item.cess_amount || item.cessAmount || 0);
        let hsnCode = item.hsn_code || item.hsnCode || null;
        let productName = item.product_name || item.productName || '';
        let primaryUnit = item.primary_unit || item.primaryUnit || 'Piece';
        const quantity = parseFloat(item.quantity || 0);
        const discountType = item.discount_type || item.discountType || null;
        const discountValue = parseFloat(item.discount_value || item.discountValue || 0);

        if (quantity <= 0) continue;

        if (rawProductId) {
          const { data: product } = await supabase.from("products").select("id, sales_price, tax_rate, tax_inclusive, cess_type, cess_rate, cess_amount, hsn_code, name, primary_unit, current_stock").eq("id", rawProductId).eq("business_id", businessId).eq("is_deleted", false).maybeSingle();
          if (product) {
            productId = product.id;
            if (!unitPrice || unitPrice <= 0) unitPrice = product.sales_price || 0;
            taxRate = product.tax_rate ?? taxRate;
            taxInclusive = product.tax_inclusive ?? taxInclusive;
            cessType = product.cess_type || cessType;
            cessRate = product.cess_rate ?? cessRate;
            cessAmount = product.cess_amount ?? cessAmount;
            hsnCode = product.hsn_code || hsnCode;
            productName = productName || product.name;
            primaryUnit = product.primary_unit || primaryUnit;
          }
        }

        let lineTotal = unitPrice * quantity;
        let itemDiscount = 0;
        if (discountType === 'percentage' && discountValue > 0) itemDiscount = lineTotal * (discountValue / 100);
        else if (discountType === 'flat' && discountValue > 0) itemDiscount = discountValue;
        lineTotal -= itemDiscount;

        let taxableAmount: number;
        let itemTax: number;
        if (taxInclusive && taxRate > 0) {
          taxableAmount = lineTotal / (1 + taxRate / 100);
          itemTax = lineTotal - taxableAmount;
          lineTotal = taxableAmount;
        } else {
          itemTax = lineTotal * (taxRate / 100);
        }

        let itemCess = 0;
        if (cessType === 'percentage' || cessType === 'ad_valorem') itemCess = lineTotal * (cessRate / 100);
        else if (cessType === 'specific' || cessType === 'quantity') itemCess = cessAmount * quantity;

        const itemTotal = lineTotal + itemTax + itemCess;
        subtotal += lineTotal;
        totalTax += itemTax;
        totalCess += itemCess;

        resolvedItems.push({
          product_id: productId, product_name: productName, quantity,
          unit_price: taxInclusive ? +(lineTotal / quantity).toFixed(2) : unitPrice,
          total_price: itemTotal, tax_rate: taxRate, tax_amount: itemTax, cess_type: cessType,
          cess_rate: cessRate, cess_amount: itemCess, hsn_code: hsnCode, primary_unit: primaryUnit,
          discount_type: discountType, discount_value: discountValue,
          batch_number: item.batch_number || item.batchNumber || null,
        });
      }

      if (resolvedItems.length === 0) return json({ error: "No valid items" }, 400);

      const totalAmount = subtotal + totalTax + totalCess + roundOffAmount;
      const paidAmt = Math.min(parseFloat(paid_amount || 0), totalAmount);
      const balanceAmount = totalAmount - paidAmt;
      const paymentStatus = paidAmt >= totalAmount ? 'paid' : paidAmt > 0 ? 'partial' : 'unpaid';

      const { data: invoice, error: invError } = await supabase.from("invoices").insert({
        business_id: businessId, invoice_number: invoiceNumber, customer_id: customer_id || null,
        customer_name, customer_type: customer_type || 'individual', subtotal, tax_amount: totalTax,
        cess_amount: totalCess, round_off_amount: roundOffAmount, total_amount: totalAmount,
        paid_amount: paidAmt, balance_amount: balanceAmount,
        payment_method: payment_method || 'cash', payment_status: paymentStatus,
        invoice_date: invoice_date || new Date().toISOString(), due_date: due_date || null,
        notes: notes || null, staff_id: staff_id || null, staff_name: resolvedStaffName,
        location_id: location_id || null, created_by: user.id,
        invoice_extras: invoice_extras || null,
      }).select().single();

      if (invError) return json({ error: "Failed to create invoice: " + invError.message }, 500);

      const itemsToInsert = resolvedItems.map(item => ({ ...item, invoice_id: invoice.id }));
      let { error: itemsError } = await supabase.from("invoice_items").insert(itemsToInsert);

      if (itemsError) {
        console.error("Invoice items insert error (first attempt):", itemsError.message);
        const itemsWithoutFk = itemsToInsert.map(item => ({ ...item, product_id: null }));
        const { error: retryError } = await supabase.from("invoice_items").insert(itemsWithoutFk);
        if (retryError) {
          console.error("Invoice items insert error (retry without FK):", retryError.message);
          for (const singleItem of itemsWithoutFk) {
            const { error: singleErr } = await supabase.from("invoice_items").insert(singleItem);
            if (singleErr) console.error("Single item insert error:", singleErr.message, JSON.stringify(singleItem));
          }
        }
      }

      for (const item of resolvedItems) {
        if (!item.product_id) continue;
        try {
          const { error: stockErr } = await supabase.rpc("deduct_product_stock", { p_product_id: item.product_id, p_quantity: item.quantity });
          if (stockErr) console.error("Stock deduction RPC failed:", stockErr.message);
        } catch (e: any) { console.error("Stock deduction error:", e.message); }

        let currentBalance = 0;
        try {
          const { data: prod } = await supabase.from("products").select("current_stock").eq("id", item.product_id).maybeSingle();
          if (prod) currentBalance = parseFloat(prod.current_stock) || 0;
        } catch (_) {}

        try {
          await supabase.from("inventory_logs").insert({
            business_id: businessId, product_id: item.product_id, transaction_type: 'sale',
            quantity_change: -item.quantity, balance_after: currentBalance, reference_type: 'invoice',
            reference_id: invoice.id, reference_number: invoiceNumber, location_id: location_id || null,
            customer_id: customer_id || null, customer_name, unit_price: item.unit_price,
            total_value: item.unit_price * item.quantity, staff_name: resolvedStaffName,
            created_by: user.id,
          });
        } catch (e: any) { console.error("Inventory log error:", e.message); }
      }

      if (paidAmt > 0 && payment_method && payment_method !== 'cash' && payment_method !== 'none') {
        const bankAccountId = body.bank_account_id || body.bankAccountId;
        if (bankAccountId) {
          try {
            await supabase.from("bank_transactions").insert({
              business_id: businessId, bank_account_id: bankAccountId, type: 'credit', amount: paidAmt,
              description: `Payment for Invoice ${invoiceNumber}`,
              transaction_date: invoice_date || new Date().toISOString(),
              source: payment_method === 'upi' ? 'UPI' : payment_method === 'cheque' ? 'Cheque' : payment_method === 'card' ? 'Card' : 'Bank Transfer',
              reference_type: 'invoice', reference_id: invoice.id, related_invoice_id: invoice.id,
              related_customer_id: customer_id || null, counterparty_name: customer_name,
              is_cleared: payment_method !== 'cheque', created_by: user.id, updated_by: user.id,
            });
          } catch (e: any) { console.error("Bank transaction error:", e.message); }
        }
      }

      if (paidAmt > 0 && (!payment_method || payment_method === 'cash')) {
        try {
          await supabase.from("cash_transactions").insert({
            business_id: businessId, type: 'credit', amount: paidAmt,
            description: `Payment for Invoice ${invoiceNumber}`,
            transaction_date: invoice_date || new Date().toISOString(),
            reference_type: 'invoice', reference_id: invoice.id,
            related_invoice_id: invoice.id, related_customer_id: invoice.customer_id || null,
            counterparty_name: customer_name, created_by: user.id,
          });
        } catch (e: any) { console.error("Cash transaction error:", e.message); }
      }

      if (customer_id) await updateCustomerMetrics(supabase, businessId, customer_id);

      return json({ invoice, items: itemsToInsert, invoiceNumber }, 201);
    }

    if (method === "DELETE") {
      const url = new URL(req.url);
      let invoiceId = url.searchParams.get("id");
      if (!invoiceId) { try { const b = await req.json(); invoiceId = b.id; } catch {} }
      if (!invoiceId) return json({ error: "Invoice id required" }, 400);

      const { data: inv } = await supabase.from("invoices").select("id, customer_id").eq("id", invoiceId).eq("business_id", businessId).eq("is_deleted", false).maybeSingle();
      if (!inv) return json({ error: "Invoice not found" }, 404);

      await supabase.from("invoices").update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id }).eq("id", invoiceId);
      await supabase.from("invoice_items").update({ is_deleted: true, deleted_at: new Date().toISOString(), deleted_by: user.id }).eq("invoice_id", invoiceId);

      if (inv.customer_id) await updateCustomerMetrics(supabase, businessId, inv.customer_id);

      return json({ success: true });
    }

    return json({ error: "Method not allowed" }, 405);
  } catch (err: any) {
    return json({ error: err.message || "Internal server error" }, 500);
  }
});

async function handleUpdatePayment(supabase: any, businessId: string, userId: string, body: any) {
  const { invoice_id, paid_amount, payment_method, bank_account_id } = body;
  if (!invoice_id) return json({ error: "invoice_id required" }, 400);

  const { data: invoice, error } = await supabase.from("invoices").select("*").eq("id", invoice_id).eq("business_id", businessId).eq("is_deleted", false).maybeSingle();
  if (error || !invoice) return json({ error: "Invoice not found" }, 404);

  const newPaid = Math.min(parseFloat(paid_amount || 0), parseFloat(invoice.total_amount));
  const newBalance = parseFloat(invoice.total_amount) - newPaid;
  const newStatus = newPaid >= parseFloat(invoice.total_amount) ? 'paid' : newPaid > 0 ? 'partial' : 'unpaid';

  const { data: updated, error: updErr } = await supabase.from("invoices").update({
    paid_amount: newPaid, balance_amount: newBalance, payment_status: newStatus,
    payment_method: payment_method || 'cash', updated_at: new Date().toISOString(),
  }).eq("id", invoice_id).select().single();

  if (updErr) return json({ error: updErr.message }, 500);

  const paymentDiff = newPaid - (parseFloat(invoice.paid_amount) || 0);

  if (paymentDiff > 0 && payment_method && payment_method !== 'cash' && payment_method !== 'none' && bank_account_id) {
    try {
      await supabase.from("bank_transactions").insert({
        business_id: businessId, bank_account_id, type: 'credit', amount: paymentDiff,
        description: `Payment received for Invoice ${invoice.invoice_number}`,
        transaction_date: new Date().toISOString(),
        source: payment_method === 'upi' ? 'UPI' : payment_method === 'cheque' ? 'Cheque' : 'Bank Transfer',
        reference_type: 'invoice', reference_id: invoice_id, related_invoice_id: invoice_id,
        related_customer_id: invoice.customer_id || null, counterparty_name: invoice.customer_name,
        is_cleared: payment_method !== 'cheque', created_by: userId, updated_by: userId,
      });
    } catch (e: any) { console.error("Bank transaction error:", e.message); }
  }

  if (paymentDiff > 0 && (!payment_method || payment_method === 'cash')) {
    try {
      await supabase.from("cash_transactions").insert({
        business_id: businessId, type: 'credit', amount: paymentDiff,
        description: `Payment received for Invoice ${invoice.invoice_number}`,
        transaction_date: new Date().toISOString(),
        reference_type: 'invoice', reference_id: invoice_id,
        related_invoice_id: invoice_id, related_customer_id: invoice.customer_id || null,
        counterparty_name: invoice.customer_name, created_by: userId,
      });
    } catch (e: any) { console.error("Cash transaction error:", e.message); }
  }

  if (invoice.customer_id) {
    body.customer_id = invoice.customer_id;
  }

  return json({ invoice: updated });
}

async function handleGetNextNumber(supabase: any, businessId: string) {
  const { data: settings } = await supabase.from("business_settings").select("invoice_prefix, last_invoice_number, starting_invoice_number, number_pattern").eq("business_id", businessId).single();

  const prefix = settings?.invoice_prefix || "INV";
  const startNum = settings?.starting_invoice_number || 1;
  const lastNum = settings?.last_invoice_number || 0;
  const nextNum = Math.max(lastNum + 1, startNum);

  const { error } = await supabase.from("business_settings").update({ last_invoice_number: nextNum }).eq("business_id", businessId).eq("last_invoice_number", lastNum);
  if (error) return json({ error: "Failed to generate invoice number, please retry" }, 409);

  const pattern = settings?.number_pattern?.pattern;
  const invoiceNumber = pattern ? formatInvoiceNumber(pattern, nextNum) : `${prefix}-${nextNum.toString().padStart(4, '0')}`;
  return json({ invoiceNumber, nextNumber: nextNum });
}

async function handlePeekNextNumber(supabase: any, businessId: string) {
  const { data: settings } = await supabase.from("business_settings").select("invoice_prefix, last_invoice_number, starting_invoice_number, number_pattern").eq("business_id", businessId).single();

  const prefix = settings?.invoice_prefix || "INV";
  const startNum = settings?.starting_invoice_number || 1;
  const lastNum = settings?.last_invoice_number || 0;
  const nextNum = Math.max(lastNum + 1, startNum);

  const pattern = settings?.number_pattern?.pattern;
  const invoiceNumber = pattern ? formatInvoiceNumber(pattern, nextNum) : `${prefix}-${nextNum.toString().padStart(4, '0')}`;
  return json({ invoiceNumber, nextNumber: nextNum });
}
