import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { generateInvoiceLinkURL, generateQRCodeImageTag, InvoiceQRData } from './invoiceQRGenerator';
import { formatQty, formatCurrencyINR, numberToWords } from './formatters';
import { EDGE_FUNCTIONS_URL } from '@/lib/supabase';

export interface InvoiceExtrasData {
  deliveryNote?: string;
  paymentTermsMode?: string;
  referenceNo?: string;
  referenceDate?: string;
  buyerOrderNumber?: string;
  buyerOrderDate?: string;
  dispatchDocNo?: string;
  deliveryNoteDate?: string;
  dispatchedVia?: string;
  destination?: string;
  termsOfDelivery?: string;
  customFields?: Array<{ label: string; value: string }>;
}

export interface InvoiceItemData {
  name: string;
  hsnCode?: string;
  quantity: number;
  unit?: string;
  rate: number;
  mrp?: number;
  discount?: number;
  taxRate: number;
  taxAmount: number;
  cessAmount?: number;
  total: number;
  reason?: string;
}

export interface BusinessInfo {
  name: string;
  address?: string;
  gstin?: string;
  pan?: string;
  phone?: string;
  email?: string;
}

export interface CustomerInfo {
  name: string;
  address?: string;
  gstin?: string;
  phone?: string;
  businessName?: string;
  isBusinessCustomer?: boolean;
}

export interface InvoicePDFData {
  type: 'sale' | 'purchase' | 'return' | 'stock_discrepancy' | 'purchase_order';
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;

  business: BusinessInfo;
  businessLogo?: string;
  customer?: CustomerInfo;
  supplierName?: string;
  supplierAddress?: string;
  supplierGstin?: string;

  shipToName?: string;
  shipToAddress?: string;
  shipFromName?: string;
  shipFromAddress?: string;

  items: InvoiceItemData[];
  subtotal: number;
  taxAmount: number;
  cessAmount?: number;
  discount?: number;
  totalAmount: number;
  paidAmount?: number;
  balanceDue?: number;

  additionalCharges?: Array<{ label: string; amount: number }>;
  bankDetails?: { bankName: string; accountNo: string; ifsc: string; branch?: string };

  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  staffName?: string;

  invoiceExtras?: InvoiceExtrasData;

  invoiceId?: string;
  businessId?: string;

  ratingUrl?: string;

  discrepancyDetails?: {
    productName: string;
    expectedStock: number;
    actualStock: number;
    discrepancyQty: number;
    value: number;
    reason?: string;
    investigationNotes?: string;
  };
}

const fmt = (amount: number) => formatCurrencyINR(amount);

function fmtDate(dateStr: string): string {
  if (!dateStr) return '-';
  try { return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); }
  catch { return dateStr; }
}

function getInvoiceTitle(type: string): string {
  switch (type) {
    case 'sale': return 'TAX INVOICE';
    case 'purchase': return 'PURCHASE INVOICE';
    case 'return': return 'CREDIT NOTE / RETURN INVOICE';
    case 'purchase_order': return 'PURCHASE ORDER';
    case 'stock_discrepancy': return 'STOCK DISCREPANCY REPORT';
    default: return 'INVOICE';
  }
}

function getPaymentMethodLabel(method: string): string {
  const map: Record<string, string> = { cash: 'Cash', upi: 'UPI', card: 'Card', cheque: 'Cheque', bank_transfer: 'Bank Transfer', none: 'Unpaid' };
  return map[method] || method || '-';
}

function buildExtrasRows(extras?: InvoiceExtrasData): string {
  if (!extras) return '';
  const pairs: [string, string | undefined][] = [
    ['Delivery Note', extras.deliveryNote], ['Mode/Terms of Payment', extras.paymentTermsMode],
    ['Reference No.', extras.referenceNo], ['Ref. Date', extras.referenceDate],
    ["Buyer's Order No.", extras.buyerOrderNumber], ["Buyer's Order Date", extras.buyerOrderDate],
    ['Dispatch Doc No.', extras.dispatchDocNo], ['Delivery Note Date', extras.deliveryNoteDate],
    ['Dispatched Through', extras.dispatchedVia], ['Destination', extras.destination],
    ['Terms of Delivery', extras.termsOfDelivery],
  ];
  if (extras.customFields) extras.customFields.forEach(cf => { if (cf.label && cf.value) pairs.push([cf.label, cf.value]); });
  const filled = pairs.filter(([, v]) => v);
  if (filled.length === 0) return '';
  const rows: string[] = [];
  for (let i = 0; i < filled.length; i += 2) {
    const [l1, v1] = filled[i];
    const [l2, v2] = filled[i + 1] || ['', ''];
    rows.push(`<tr><td class="lbl">${l1}</td><td>${v1}</td>${l2 ? `<td class="lbl">${l2}</td><td>${v2}</td>` : '<td class="lbl"></td><td></td>'}</tr>`);
  }
  return `<table class="mt">${rows.join('')}</table>`;
}

function buildTaxBreakdown(items: InvoiceItemData[]): string {
  const hsnMap = new Map<string, { taxableValue: number; cgst: number; sgst: number; cess: number; totalTax: number; rate: number }>();
  for (const item of items) {
    const key = item.hsnCode || '-';
    const existing = hsnMap.get(key) || { taxableValue: 0, cgst: 0, sgst: 0, cess: 0, totalTax: 0, rate: item.taxRate };
    const lineBase = item.rate * item.quantity * (1 - (item.discount || 0) / 100);
    const halfGst = lineBase * (item.taxRate / 100) / 2;
    existing.taxableValue += lineBase;
    existing.cgst += halfGst;
    existing.sgst += halfGst;
    existing.cess += item.cessAmount || 0;
    existing.totalTax += halfGst * 2 + (item.cessAmount || 0);
    hsnMap.set(key, existing);
  }
  if (hsnMap.size === 0) return '';
  let rows = '';
  let totTaxable = 0, totCgst = 0, totSgst = 0, totCess = 0, totAll = 0;
  hsnMap.forEach((v, hsn) => {
    totTaxable += v.taxableValue; totCgst += v.cgst; totSgst += v.sgst; totCess += v.cess; totAll += v.totalTax;
    rows += `<tr><td>${hsn}</td><td class="r">${fmt(v.taxableValue)}</td><td class="r">${v.rate / 2}%</td><td class="r">${fmt(v.cgst)}</td><td class="r">${v.rate / 2}%</td><td class="r">${fmt(v.sgst)}</td><td class="r">${fmt(v.cess)}</td><td class="r">${fmt(v.totalTax)}</td></tr>`;
  });
  rows += `<tr class="totrow"><td><b>Total</b></td><td class="r"><b>${fmt(totTaxable)}</b></td><td></td><td class="r"><b>${fmt(totCgst)}</b></td><td></td><td class="r"><b>${fmt(totSgst)}</b></td><td class="r"><b>${fmt(totCess)}</b></td><td class="r"><b>${fmt(totAll)}</b></td></tr>`;
  return `<table class="tax-tbl"><thead><tr><th>HSN/SAC</th><th class="r">Taxable Value</th><th class="r">CGST Rate</th><th class="r">CGST Amt</th><th class="r">SGST Rate</th><th class="r">SGST Amt</th><th class="r">CESS Amt</th><th class="r">Total Tax</th></tr></thead><tbody>${rows}</tbody></table>`;
}

function generateInvoiceHTML(data: InvoicePDFData): string {
  const title = getInvoiceTitle(data.type);
  const isDiscrepancy = data.type === 'stock_discrepancy';
  const isPO = data.type === 'purchase_order';
  const hasMrp = data.items.some(i => (i.mrp || 0) > 0);
  const hasDisc = data.items.some(i => (i.discount || 0) > 0);

  let qrCodeHTML = '';
  if (data.invoiceId && data.businessId && !isDiscrepancy) {
    const qrData: InvoiceQRData = { invoiceId: data.invoiceId, businessId: data.businessId, type: data.type as any };
    const linkUrl = generateInvoiceLinkURL(qrData);
    qrCodeHTML = generateQRCodeImageTag(linkUrl, 80);
  }

  const logoHTML = data.businessLogo ? `<img src="${data.businessLogo}" style="max-height:50px;max-width:120px;object-fit:contain;" />` : '';

  const itemRows = data.items.map((item, idx) => {
    const lineBase = item.rate * item.quantity * (1 - (item.discount || 0) / 100);
    const gst = lineBase * (item.taxRate / 100);
    const total = lineBase + gst + (item.cessAmount || 0);
    return `<tr>
      <td class="c">${idx + 1}</td>
      <td>${item.name}${item.hsnCode ? `<br><span class="sm">HSN: ${item.hsnCode}</span>` : ''}${item.reason ? `<br><span class="sm">Reason: ${item.reason}</span>` : ''}</td>
      <td class="c">${formatQty(item.quantity)}${item.unit ? ' ' + item.unit : ''}</td>
      <td class="r">${fmt(item.rate)}</td>
      ${hasMrp ? `<td class="r">${item.mrp ? fmt(item.mrp) : '-'}</td>` : ''}
      ${hasDisc ? `<td class="c">${(item.discount || 0) > 0 ? item.discount + '%' : '-'}</td>` : ''}
      <td class="c">${item.taxRate}%</td>
      <td class="r"><b>${fmt(total)}</b></td>
    </tr>`;
  }).join('');

  const addlChargesHTML = (data.additionalCharges || []).filter(c => c.amount !== 0).map(c =>
    `<tr><td class="lbl">${c.label}</td><td class="r">${fmt(c.amount)}</td></tr>`
  ).join('');

  const bankHTML = data.bankDetails ? `
    <div class="bank-box">
      <div class="bank-title">Bank Details</div>
      <div>Bank: <b>${data.bankDetails.bankName}</b></div>
      <div>A/C No: <b>${data.bankDetails.accountNo}</b></div>
      <div>IFSC: <b>${data.bankDetails.ifsc}</b></div>
      ${data.bankDetails.branch ? `<div>Branch: <b>${data.bankDetails.branch}</b></div>` : ''}
    </div>` : '';

  let discrepancyHTML = '';
  if (isDiscrepancy && data.discrepancyDetails) {
    const d = data.discrepancyDetails;
    discrepancyHTML = `<table class="mt"><tr><td class="lbl">Product</td><td>${d.productName}</td><td class="lbl">Expected</td><td>${d.expectedStock}</td></tr>
      <tr><td class="lbl">Actual</td><td>${d.actualStock}</td><td class="lbl">Discrepancy</td><td style="color:#DC2626;font-weight:700">${d.discrepancyQty}</td></tr>
      <tr><td class="lbl">Value Impact</td><td>${fmt(d.value)}</td><td class="lbl">Reason</td><td>${d.reason || '-'}</td></tr>
      ${d.investigationNotes ? `<tr><td class="lbl">Investigation Notes</td><td colspan="3">${d.investigationNotes}</td></tr>` : ''}</table>`;
  }

  const supplierBlock = (data.type === 'purchase' || isPO) && data.supplierName ? `
    <td style="width:50%;vertical-align:top;padding:8px;">
      <div class="sec-title">${isPO ? 'TO (SUPPLIER)' : 'FROM (SUPPLIER)'}</div>
      <div class="party-name">${data.supplierName}</div>
      ${data.supplierAddress ? `<div class="party-det">${data.supplierAddress}</div>` : ''}
      ${data.supplierGstin ? `<div class="party-det">GSTIN: ${data.supplierGstin}</div>` : ''}
    </td>` : '';

  const customerBlock = data.customer ? `
    <td style="width:50%;vertical-align:top;padding:8px;">
      <div class="sec-title">BILL TO</div>
      <div class="party-name">${data.customer.businessName || data.customer.name}</div>
      ${data.customer.address ? `<div class="party-det">${data.customer.address}</div>` : ''}
      ${data.customer.gstin ? `<div class="party-det">GSTIN: ${data.customer.gstin}</div>` : ''}
      ${data.customer.phone ? `<div class="party-det">Phone: ${data.customer.phone}</div>` : ''}
    </td>` : '';

  const shipFromBlock = data.shipFromName ? `
    <td style="width:50%;vertical-align:top;padding:8px;">
      <div class="sec-title">SHIPPED FROM</div>
      <div class="party-name">${data.shipFromName}</div>
      ${data.shipFromAddress ? `<div class="party-det">${data.shipFromAddress}</div>` : ''}
    </td>` : '';

  const shipToBlock = data.shipToName ? `
    <td style="width:50%;vertical-align:top;padding:8px;">
      <div class="sec-title">SHIP TO</div>
      <div class="party-name">${data.shipToName}</div>
      ${data.shipToAddress ? `<div class="party-det">${data.shipToAddress}</div>` : ''}
    </td>` : '';

  const amountWords = numberToWords(data.totalAmount);

  return `<!DOCTYPE html>
<html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{font-family:'Segoe UI',Tahoma,Geneva,Verdana,sans-serif;color:#1a1a1a;font-size:10px;line-height:1.5;background:#fff}
@page{size:A4;margin:8mm}
@media print{html,body{margin:0;padding:0;width:100%}.page{box-shadow:none;padding:14px}}
.page{max-width:210mm;margin:0 auto;padding:18px}
table{border-collapse:collapse;width:100%}
.accent-bar{height:4px;background:linear-gradient(90deg,#2c5282,#3f66ac,#5a8dcc);margin-bottom:12px;border-radius:2px}
.mt td,.mt th{border:1px solid #d0d0d0;padding:6px 8px;font-size:9px;vertical-align:top}
.mt .lbl{font-weight:700;background:#f0f4f8;width:22%;font-size:8px;text-transform:uppercase;letter-spacing:0.4px;color:#2c5282}
.hdr{text-align:center;padding:12px 0 8px;border-bottom:3px solid #2c5282}
.hdr h1{font-size:20px;color:#2c5282;margin:0;letter-spacing:1.5px;font-weight:800}
.hdr .sub{font-size:9px;color:#666;margin-top:3px;letter-spacing:0.5px}
.logo-row{display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;padding:0 4px}
.sec-title{font-size:9px;font-weight:700;text-transform:uppercase;letter-spacing:0.6px;color:#2c5282;border-bottom:2px solid #e2e8f0;padding-bottom:4px;margin-bottom:6px}
.party-name{font-size:12px;font-weight:700;margin-bottom:3px;color:#1a1a1a}
.party-det{font-size:9px;color:#444;line-height:1.6}
.items-tbl th{background:#2c5282;color:#fff;padding:7px 6px;font-size:8px;text-transform:uppercase;letter-spacing:0.4px;font-weight:700;border:1px solid #2c5282}
.items-tbl td{padding:6px;border:1px solid #d0d0d0;font-size:9px}
.items-tbl tbody tr:nth-child(even){background:#f7fafc}
.c{text-align:center}.r{text-align:right}
.sm{color:#718096;font-size:8px}
.tax-tbl th{background:#f0f4f8;padding:5px;font-size:8px;text-transform:uppercase;border:1px solid #d0d0d0;font-weight:700;color:#2c5282}
.tax-tbl td{padding:5px;border:1px solid #d0d0d0;font-size:8px}
.tax-tbl .totrow td{background:#e2e8f0;font-weight:700}
.amt-words{background:#f0f4f8;border:1px solid #d0d0d0;border-left:4px solid #2c5282;padding:8px 10px;font-size:9px;font-weight:700;margin:10px 0}
.totals-box{width:250px;margin-left:auto}
.totals-box td{padding:5px 8px;font-size:10px;border:none}
.totals-box .grand td{border-top:3px solid #2c5282;font-size:13px;font-weight:800;padding-top:10px;color:#2c5282}
.totals-box .due td{color:#DC2626;font-weight:700}
.bank-box{border:1px solid #d0d0d0;border-left:4px solid #2c5282;padding:10px;font-size:9px;margin-top:10px;max-width:300px;background:#f7fafc}
.bank-title{font-weight:700;font-size:9px;text-transform:uppercase;margin-bottom:5px;color:#2c5282}
.decl{border:1px solid #d0d0d0;padding:8px 10px;font-size:8px;margin-top:12px;color:#555;background:#f7fafc}
.sig-area{display:flex;justify-content:space-between;margin-top:24px;padding-top:12px}
.sig-block{text-align:center;width:200px}
.sig-line{border-top:1px solid #1a1a1a;margin-top:45px;padding-top:5px;font-size:8px;font-weight:700}
.qr-footer{display:flex;justify-content:center;gap:16px;margin-top:12px;align-items:flex-start}
.qr-item{text-align:center}
.qr-item .qr-lbl{font-size:7px;color:#888;margin-top:2px}
.foot-text{text-align:center;font-size:7px;color:#999;margin-top:10px;border-top:1px solid #e2e8f0;padding-top:8px}
.notes-box{background:#FFFBEB;border:1px solid #FDE68A;border-left:4px solid #D97706;padding:8px 10px;font-size:9px;color:#92400E;font-style:italic;margin:10px 0}
</style></head><body><div class="page">

  <div class="accent-bar"></div>
  <div class="logo-row">${logoHTML}<div></div></div>

  <div class="hdr">
    <h1>${title}</h1>
    ${data.paymentStatus && !isPO ? `<div class="sub">${data.paymentStatus.toUpperCase()}</div>` : ''}
  </div>

  <!-- Business & Invoice Details -->
  <table class="mt" style="margin-top:8px">
    <tr>
      <td style="width:50%;vertical-align:top;padding:8px;">
        <div class="sec-title">${data.type === 'purchase' || isPO ? 'FROM' : 'INVOICED BY'}</div>
        <div class="party-name">${data.business.name}</div>
        ${data.business.address ? `<div class="party-det">${data.business.address}</div>` : ''}
        ${data.business.gstin ? `<div class="party-det">GSTIN: ${data.business.gstin}</div>` : ''}
        ${data.business.pan ? `<div class="party-det">PAN: ${data.business.pan}</div>` : ''}
        ${data.business.phone ? `<div class="party-det">Phone: ${data.business.phone}</div>` : ''}
        ${data.business.email ? `<div class="party-det">Email: ${data.business.email}</div>` : ''}
      </td>
      <td style="width:50%;padding:0;vertical-align:top;">
        <table class="mt" style="margin:0">
          <tr><td class="lbl">Invoice No.</td><td>${data.invoiceNumber}</td></tr>
          <tr><td class="lbl">Date</td><td>${fmtDate(data.invoiceDate)}</td></tr>
          ${data.dueDate ? `<tr><td class="lbl">Due Date</td><td>${fmtDate(data.dueDate)}</td></tr>` : ''}
          ${data.paymentMethod ? `<tr><td class="lbl">Payment</td><td>${getPaymentMethodLabel(data.paymentMethod)}</td></tr>` : ''}
          ${data.staffName ? `<tr><td class="lbl">Handled By</td><td>${data.staffName}</td></tr>` : ''}
        </table>
      </td>
    </tr>
  </table>

  <!-- Buyer / Supplier / Ship To -->
  <table class="mt" style="margin-top:0">
    <tr>
      ${supplierBlock || customerBlock || '<td></td>'}
      ${supplierBlock ? (customerBlock || '<td></td>') : (shipToBlock || '<td></td>')}
    </tr>
    ${supplierBlock && shipToBlock ? `<tr>${shipToBlock}<td></td></tr>` : ''}
    ${shipFromBlock ? `<tr>${shipFromBlock}<td></td></tr>` : ''}
  </table>

  ${buildExtrasRows(data.invoiceExtras)}

  ${discrepancyHTML}

  ${!isDiscrepancy ? `
  <!-- Items -->
  <table class="items-tbl" style="margin-top:8px">
    <thead><tr>
      <th class="c" style="width:25px">Sl</th>
      <th>Description of Goods / Services</th>
      <th class="c" style="width:55px">Qty</th>
      <th class="r" style="width:65px">Rate</th>
      ${hasMrp ? '<th class="r" style="width:60px">MRP</th>' : ''}
      ${hasDisc ? '<th class="c" style="width:45px">Disc.</th>' : ''}
      <th class="c" style="width:40px">GST%</th>
      <th class="r" style="width:75px">Amount</th>
    </tr></thead>
    <tbody>${itemRows}</tbody>
  </table>

  <div class="amt-words">${amountWords}</div>

  <!-- Tax Breakdown -->
  ${buildTaxBreakdown(data.items)}

  <!-- Additional Charges + Totals -->
  <div style="display:flex;justify-content:space-between;align-items:flex-start;margin-top:8px">
    <div style="flex:1">${bankHTML}</div>
    <table class="totals-box">
      <tr><td>Subtotal</td><td class="r">${fmt(data.subtotal)}</td></tr>
      ${(data.discount || 0) > 0 ? `<tr><td>Discount</td><td class="r">-${fmt(data.discount || 0)}</td></tr>` : ''}
      <tr><td>Tax (GST)</td><td class="r">${fmt(data.taxAmount)}</td></tr>
      ${(data.cessAmount || 0) > 0 ? `<tr><td>Cess</td><td class="r">${fmt(data.cessAmount || 0)}</td></tr>` : ''}
      ${addlChargesHTML}
      <tr class="grand"><td>Grand Total</td><td class="r">${fmt(data.totalAmount)}</td></tr>
      ${(data.paidAmount ?? 0) > 0 ? `<tr><td>Paid</td><td class="r">${fmt(data.paidAmount || 0)}</td></tr>` : ''}
      ${(data.balanceDue ?? 0) > 0 ? `<tr class="due"><td>Balance Due</td><td class="r">${fmt(data.balanceDue || 0)}</td></tr>` : ''}
    </table>
  </div>` : ''}

  ${data.notes ? `<div class="notes-box"><b>Notes:</b> ${data.notes}</div>` : ''}

  <div class="decl">
    <b>Declaration:</b> We declare that this invoice shows the actual price of the goods/services described and that all particulars are true and correct.
    ${isPO ? '<br><b>Terms & Conditions:</b> Goods to be delivered as per agreed schedule. Quality must meet specified standards. Payment as per agreed terms.' : ''}
  </div>

  <div class="sig-area">
    <div class="sig-block">
      <div class="sig-line">Receiver's Signature</div>
    </div>
    <div class="sig-block">
      <div class="sig-line">for ${data.business.name}<br>Authorised Signatory</div>
    </div>
  </div>

  <div class="qr-footer">
    ${qrCodeHTML ? `<div class="qr-item">${qrCodeHTML}<div class="qr-lbl">Scan to view digitally</div></div>` : ''}
    <div class="qr-item" style="font-size:8px;color:#888;padding-top:10px">
      Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}
    </div>
  </div>

  <div class="foot-text">Computer Generated Invoice &mdash; Powered by Manager &bull; getmanager.in</div>

</div></body></html>`;
}

export async function generateInvoicePDF(data: InvoicePDFData): Promise<string> {
  const html = generateInvoiceHTML(data);

  if (Platform.OS === 'web') {
    const printWindow = (typeof window !== 'undefined' && window.open) ? window.open('', '_blank') : null;
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
    return 'web-handled';
  }

  try {
    const { uri } = await Print.printToFileAsync({
      html,
      base64: false,
    });

    const pdfName = `${data.type}_invoice_${data.invoiceNumber.replace(/[^a-zA-Z0-9]/g, '_')}.pdf`;
    const newUri = `${FileSystem.documentDirectory}${pdfName}`;

    await FileSystem.moveAsync({ from: uri, to: newUri });
    return newUri;
  } catch (error) {
    console.error('PDF generation failed:', error);
    throw error;
  }
}

export async function printInvoice(data: InvoicePDFData): Promise<void> {
  const html = generateInvoiceHTML(data);
  if (Platform.OS === 'web') {
    const printWindow = (typeof window !== 'undefined' && window.open) ? window.open('', '_blank') : null;
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
    return;
  }
  await Print.printAsync({ html });
}

/**
 * Opens a new browser window with the invoice HTML, ready for printing/saving as PDF.
 * Use this on web when you want to let the user print or save as PDF via the browser.
 */
export function downloadInvoiceOnWeb(data: InvoicePDFData): void {
  const html = generateInvoiceHTML(data);
  if (typeof window !== 'undefined' && window.open) {
    const printWindow = window.open('', '_blank');
    if (printWindow) {
      printWindow.document.write(html);
      printWindow.document.close();
      printWindow.focus();
      printWindow.print();
    }
  }
}

export { generateInvoiceHTML };
