import * as Print from 'expo-print';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';
import { generateInvoiceLinkURL, generateQRCodeImageTag, InvoiceQRData } from './invoiceQRGenerator';
import { formatQty } from './formatters';
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
  type: 'sale' | 'purchase' | 'return' | 'stock_discrepancy';
  invoiceNumber: string;
  invoiceDate: string;
  dueDate?: string;

  business: BusinessInfo;
  customer?: CustomerInfo;
  supplierName?: string;

  items: InvoiceItemData[];
  subtotal: number;
  taxAmount: number;
  cessAmount?: number;
  discount?: number;
  totalAmount: number;
  paidAmount?: number;
  balanceDue?: number;

  paymentMethod?: string;
  paymentStatus?: string;
  notes?: string;
  staffName?: string;

  invoiceExtras?: InvoiceExtrasData;

  // For QR code generation
  invoiceId?: string;
  businessId?: string;

  // For review/rating
  ratingUrl?: string;

  // Stock discrepancy fields
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

function formatCurrency(amount: number): string {
  const n = amount || 0;
  const fixed = n.toFixed(4).replace(/\.?0+$/, '');
  const hasDecimals = fixed.includes('.');
  return `₹${parseFloat(fixed).toLocaleString('en-IN', { minimumFractionDigits: hasDecimals ? 2 : 0, maximumFractionDigits: 4 })}`;
}

function formatDate(dateStr: string): string {
  if (!dateStr) return '-';
  try {
    return new Date(dateStr).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
  } catch {
    return dateStr;
  }
}

function getInvoiceTitle(type: string): string {
  switch (type) {
    case 'sale': return 'TAX INVOICE';
    case 'purchase': return 'PURCHASE INVOICE';
    case 'return': return 'CREDIT NOTE / RETURN INVOICE';
    case 'stock_discrepancy': return 'STOCK DISCREPANCY REPORT';
    default: return 'INVOICE';
  }
}

function getPaymentMethodLabel(method: string): string {
  switch (method) {
    case 'cash': return 'Cash';
    case 'upi': return 'UPI';
    case 'card': return 'Card';
    case 'cheque': return 'Cheque';
    case 'bank_transfer': return 'Bank Transfer';
    case 'none': return 'Unpaid';
    default: return method || '-';
  }
}

function generateExtrasHTML(extras?: InvoiceExtrasData): string {
  if (!extras) return '';
  const fields: string[] = [];
  if (extras.deliveryNote) fields.push(`<div class="extra-item"><span class="extra-label">Delivery Note</span><span class="extra-value">${extras.deliveryNote}</span></div>`);
  if (extras.paymentTermsMode) fields.push(`<div class="extra-item"><span class="extra-label">Mode/Terms of Payment</span><span class="extra-value">${extras.paymentTermsMode}</span></div>`);
  if (extras.referenceNo) fields.push(`<div class="extra-item"><span class="extra-label">Reference No.</span><span class="extra-value">${extras.referenceNo}</span></div>`);
  if (extras.referenceDate) fields.push(`<div class="extra-item"><span class="extra-label">Date (Ref. No.)</span><span class="extra-value">${extras.referenceDate}</span></div>`);
  if (extras.buyerOrderNumber) fields.push(`<div class="extra-item"><span class="extra-label">Buyer's Order No.</span><span class="extra-value">${extras.buyerOrderNumber}</span></div>`);
  if (extras.buyerOrderDate) fields.push(`<div class="extra-item"><span class="extra-label">Date (Buyer's Order)</span><span class="extra-value">${extras.buyerOrderDate}</span></div>`);
  if (extras.dispatchDocNo) fields.push(`<div class="extra-item"><span class="extra-label">Dispatch Doc No.</span><span class="extra-value">${extras.dispatchDocNo}</span></div>`);
  if (extras.deliveryNoteDate) fields.push(`<div class="extra-item"><span class="extra-label">Delivery Note Date</span><span class="extra-value">${extras.deliveryNoteDate}</span></div>`);
  if (extras.dispatchedVia) fields.push(`<div class="extra-item"><span class="extra-label">Dispatched Through</span><span class="extra-value">${extras.dispatchedVia}</span></div>`);
  if (extras.destination) fields.push(`<div class="extra-item"><span class="extra-label">Destination</span><span class="extra-value">${extras.destination}</span></div>`);
  if (extras.termsOfDelivery) fields.push(`<div class="extra-item"><span class="extra-label">Terms of Delivery</span><span class="extra-value">${extras.termsOfDelivery}</span></div>`);
  if (extras.customFields) {
    for (const cf of extras.customFields) {
      if (cf.label && cf.value) {
        fields.push(`<div class="extra-item"><span class="extra-label">${cf.label}</span><span class="extra-value">${cf.value}</span></div>`);
      }
    }
  }
  if (fields.length === 0) return '';
  return `<div class="extras-section"><div class="extras-grid">${fields.join('')}</div></div>`;
}

function generateRatingHTML(data: InvoicePDFData): string {
  if (data.type === 'stock_discrepancy') return '';
  
  const ratingUrl = data.ratingUrl || (data.invoiceId && data.businessId
    ? `${EDGE_FUNCTIONS_URL}/invoice-link?invoice_id=${data.invoiceId}&business_id=${data.businessId}&type=${data.type}&action=rate`
    : '');
  
  if (!ratingUrl) return '';

  return `
    <div class="rating-section">
      <p class="rating-title">How was your experience?</p>
      <div class="rating-stars">
        <a href="${ratingUrl}&rating=1" class="star">★</a>
        <a href="${ratingUrl}&rating=2" class="star">★</a>
        <a href="${ratingUrl}&rating=3" class="star">★</a>
        <a href="${ratingUrl}&rating=4" class="star">★</a>
        <a href="${ratingUrl}&rating=5" class="star">★</a>
      </div>
      <p class="rating-label">Tap a star to rate this ${data.type === 'sale' ? 'purchase' : data.type === 'purchase' ? 'supplier' : 'return'}</p>
    </div>`;
}

function generateInvoiceHTML(data: InvoicePDFData): string {
  const title = getInvoiceTitle(data.type);
  const isDiscrepancy = data.type === 'stock_discrepancy';

  let qrCodeHTML = '';
  if (data.invoiceId && data.businessId && !isDiscrepancy) {
    const qrData: InvoiceQRData = {
      invoiceId: data.invoiceId,
      businessId: data.businessId,
      type: data.type as 'sale' | 'purchase' | 'return',
    };
    const linkUrl = generateInvoiceLinkURL(qrData);
    qrCodeHTML = `
      <div class="qr-section">
        ${generateQRCodeImageTag(linkUrl, 100)}
        <p class="qr-label">Scan to view on Manager</p>
      </div>`;
  }

  const ratingHTML = generateRatingHTML(data);

  const itemRows = data.items.map((item, idx) => {
    const lineBase = item.rate * item.quantity * (1 - (item.discount || 0) / 100);
    const gst = lineBase * (item.taxRate / 100);
    const total = lineBase + gst + (item.cessAmount || 0);
    return `
      <tr>
        <td class="center">${idx + 1}</td>
        <td>
          <strong>${item.name}</strong>
          ${item.hsnCode ? `<br><span class="muted">HSN: ${item.hsnCode}</span>` : ''}
          ${item.reason ? `<br><span class="muted">Reason: ${item.reason}</span>` : ''}
        </td>
        <td class="center">${formatQty(item.quantity)}${item.unit ? ` ${item.unit}` : ''}</td>
        <td class="right">${formatCurrency(item.rate)}</td>
        ${(item.discount || 0) > 0 ? `<td class="center">${item.discount}%</td>` : `<td class="center">-</td>`}
        <td class="center">${item.taxRate}%</td>
        <td class="right"><strong>${formatCurrency(total)}</strong></td>
      </tr>`;
  }).join('');

  const hasDiscount = data.items.some(i => (i.discount || 0) > 0);

  let discrepancyHTML = '';
  if (isDiscrepancy && data.discrepancyDetails) {
    const d = data.discrepancyDetails;
    discrepancyHTML = `
      <div class="discrepancy-section">
        <h3>Discrepancy Details</h3>
        <table class="details-table">
          <tr><td class="detail-label">Product</td><td>${d.productName}</td></tr>
          <tr><td class="detail-label">Expected Stock</td><td>${d.expectedStock}</td></tr>
          <tr><td class="detail-label">Actual Stock</td><td>${d.actualStock}</td></tr>
          <tr><td class="detail-label">Discrepancy</td><td style="color:#DC2626;font-weight:700">${d.discrepancyQty}</td></tr>
          <tr><td class="detail-label">Value Impact</td><td>${formatCurrency(d.value)}</td></tr>
          ${d.reason ? `<tr><td class="detail-label">Reason</td><td>${d.reason}</td></tr>` : ''}
          ${d.investigationNotes ? `<tr><td class="detail-label">Investigation Notes</td><td>${d.investigationNotes}</td></tr>` : ''}
        </table>
      </div>`;
  }

  return `<!DOCTYPE html>
<html>
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: 'Helvetica Neue', Arial, sans-serif; color: #1F2937; font-size: 12px; line-height: 1.5; padding: 30px; }
  .invoice { max-width: 800px; margin: 0 auto; }
  .header { display: flex; justify-content: space-between; align-items: flex-start; margin-bottom: 24px; border-bottom: 3px solid #3F66AC; padding-bottom: 16px; }
  .header-left h1 { font-size: 22px; color: #3F66AC; margin-bottom: 4px; letter-spacing: 1px; }
  .header-left .invoice-num { font-size: 16px; font-weight: 700; color: #1F2937; }
  .header-right { text-align: right; }
  .header-right .date-label { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 0.5px; }
  .header-right .date-value { font-size: 14px; font-weight: 600; }
  .parties { display: flex; gap: 40px; margin-bottom: 20px; }
  .party { flex: 1; }
  .party-label { font-size: 10px; color: #6B7280; text-transform: uppercase; letter-spacing: 1px; font-weight: 700; margin-bottom: 6px; }
  .party-name { font-size: 14px; font-weight: 700; margin-bottom: 2px; }
  .party-detail { font-size: 11px; color: #6B7280; line-height: 1.6; }
  .extras-section { margin-bottom: 16px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 6px; padding: 12px 16px; }
  .extras-grid { display: flex; flex-wrap: wrap; gap: 8px 24px; }
  .extra-item { display: flex; gap: 6px; }
  .extra-label { font-size: 10px; color: #6B7280; text-transform: uppercase; font-weight: 600; min-width: 100px; }
  .extra-value { font-size: 11px; font-weight: 500; color: #1F2937; }
  .items-table { width: 100%; border-collapse: collapse; margin-bottom: 20px; }
  .items-table th { background: #F3F4F6; padding: 10px 8px; font-size: 10px; text-transform: uppercase; letter-spacing: 0.5px; color: #6B7280; font-weight: 700; border-bottom: 2px solid #E5E7EB; }
  .items-table td { padding: 10px 8px; border-bottom: 1px solid #F3F4F6; font-size: 11px; vertical-align: top; }
  .items-table tr:nth-child(even) td { background: #FAFBFC; }
  .center { text-align: center; }
  .right { text-align: right; }
  .muted { color: #9CA3AF; font-size: 10px; }
  .totals { margin-left: auto; width: 280px; margin-bottom: 20px; }
  .total-row { display: flex; justify-content: space-between; padding: 5px 0; font-size: 12px; }
  .total-row.grand { border-top: 2px solid #3F66AC; margin-top: 8px; padding-top: 10px; font-size: 14px; font-weight: 700; color: #3F66AC; }
  .total-row.due { background: #FEF2F2; padding: 8px 12px; border-radius: 4px; color: #DC2626; font-weight: 700; margin-top: 4px; }
  .footer { display: flex; justify-content: space-between; align-items: flex-end; margin-top: 24px; padding-top: 16px; border-top: 1px solid #E5E7EB; }
  .footer-meta { font-size: 10px; color: #6B7280; }
  .footer-meta span { display: block; margin-bottom: 2px; }
  .qr-section { text-align: center; }
  .qr-label { font-size: 9px; color: #6B7280; margin-top: 4px; }
  .notes { background: #FFFBEB; border: 1px solid #FDE68A; border-radius: 6px; padding: 12px 16px; margin-bottom: 20px; font-size: 11px; color: #92400E; font-style: italic; }
  .discrepancy-section { margin-bottom: 20px; }
  .discrepancy-section h3 { font-size: 14px; margin-bottom: 10px; color: #3F66AC; }
  .details-table { width: 100%; border-collapse: collapse; }
  .details-table td { padding: 8px 12px; border: 1px solid #E5E7EB; font-size: 12px; }
  .detail-label { font-weight: 600; background: #F9FAFB; width: 200px; color: #6B7280; text-transform: uppercase; font-size: 10px; letter-spacing: 0.5px; }
  .status-badge { display: inline-block; padding: 3px 10px; border-radius: 4px; font-size: 10px; font-weight: 700; text-transform: uppercase; letter-spacing: 0.5px; }
  .status-paid { background: #ECFDF5; color: #059669; }
  .status-pending { background: #FFFBEB; color: #D97706; }
  .status-partial { background: #FEF2F2; color: #DC2626; }
  .rating-section { text-align: center; margin-top: 20px; padding: 16px; background: #F9FAFB; border: 1px solid #E5E7EB; border-radius: 8px; }
  .rating-title { font-size: 13px; font-weight: 700; color: #1F2937; margin-bottom: 8px; }
  .rating-stars { display: flex; justify-content: center; gap: 8px; margin-bottom: 6px; }
  .rating-stars .star { font-size: 28px; color: #D1D5DB; text-decoration: none; cursor: pointer; transition: color 0.2s; }
  .rating-stars .star:hover { color: #F59E0B; }
  .rating-label { font-size: 10px; color: #6B7280; }
</style>
</head>
<body>
<div class="invoice">
  <!-- Header -->
  <div class="header">
    <div class="header-left">
      <h1>${title}</h1>
      <div class="invoice-num">#${data.invoiceNumber}</div>
      ${data.paymentStatus ? `<span class="status-badge status-${data.paymentStatus === 'paid' ? 'paid' : data.paymentStatus === 'partial' ? 'partial' : 'pending'}">${data.paymentStatus.toUpperCase()}</span>` : ''}
    </div>
    <div class="header-right">
      <div class="date-label">Invoice Date</div>
      <div class="date-value">${formatDate(data.invoiceDate)}</div>
      ${data.dueDate ? `<div class="date-label" style="margin-top:8px">Due Date</div><div class="date-value">${formatDate(data.dueDate)}</div>` : ''}
    </div>
  </div>

  <!-- Parties -->
  <div class="parties">
    <div class="party">
      <div class="party-label">${data.type === 'purchase' ? 'BILL TO' : 'FROM'}</div>
      <div class="party-name">${data.business.name}</div>
      ${data.business.address ? `<div class="party-detail">${data.business.address}</div>` : ''}
      ${data.business.gstin ? `<div class="party-detail">GSTIN: ${data.business.gstin}</div>` : ''}
      ${data.business.phone ? `<div class="party-detail">Phone: ${data.business.phone}</div>` : ''}
    </div>
    ${data.type === 'purchase' && data.supplierName ? `
    <div class="party">
      <div class="party-label">FROM (SUPPLIER)</div>
      <div class="party-name">${data.supplierName}</div>
    </div>` : ''}
    ${data.customer ? `
    <div class="party">
      <div class="party-label">${data.type === 'purchase' ? '' : 'BILL TO'}</div>
      <div class="party-name">${data.customer.businessName || data.customer.name}</div>
      ${data.customer.address ? `<div class="party-detail">${data.customer.address}</div>` : ''}
      ${data.customer.gstin ? `<div class="party-detail">GSTIN: ${data.customer.gstin}</div>` : ''}
      ${data.customer.phone ? `<div class="party-detail">Phone: ${data.customer.phone}</div>` : ''}
    </div>` : ''}
  </div>

  ${generateExtrasHTML(data.invoiceExtras)}

  ${discrepancyHTML}

  ${!isDiscrepancy ? `
  <!-- Items Table -->
  <table class="items-table">
    <thead>
      <tr>
        <th class="center" style="width:30px">#</th>
        <th style="min-width:150px">Item Description</th>
        <th class="center" style="width:60px">Qty</th>
        <th class="right" style="width:80px">Rate</th>
        <th class="center" style="width:50px">Disc.</th>
        <th class="center" style="width:50px">GST</th>
        <th class="right" style="width:90px">Amount</th>
      </tr>
    </thead>
    <tbody>
      ${itemRows}
    </tbody>
  </table>

  <!-- Totals -->
  <div class="totals">
    <div class="total-row"><span>Subtotal</span><span>${formatCurrency(data.subtotal)}</span></div>
    ${(data.discount || 0) > 0 ? `<div class="total-row"><span>Discount</span><span>-${formatCurrency(data.discount || 0)}</span></div>` : ''}
    <div class="total-row"><span>GST</span><span>${formatCurrency(data.taxAmount)}</span></div>
    ${(data.cessAmount || 0) > 0 ? `<div class="total-row"><span>Cess</span><span>${formatCurrency(data.cessAmount || 0)}</span></div>` : ''}
    <div class="total-row grand"><span>Total</span><span>${formatCurrency(data.totalAmount)}</span></div>
    ${(data.paidAmount ?? 0) > 0 ? `<div class="total-row"><span>Paid</span><span>${formatCurrency(data.paidAmount || 0)}</span></div>` : ''}
    ${(data.balanceDue ?? 0) > 0 ? `<div class="total-row due"><span>Balance Due</span><span>${formatCurrency(data.balanceDue || 0)}</span></div>` : ''}
  </div>` : ''}

  ${data.notes ? `<div class="notes"><strong>Notes:</strong> ${data.notes}</div>` : ''}

  ${ratingHTML}

  <!-- Footer -->
  <div class="footer">
    <div class="footer-meta">
      ${data.paymentMethod ? `<span>Payment: ${getPaymentMethodLabel(data.paymentMethod)}</span>` : ''}
      ${data.staffName ? `<span>Recorded by: ${data.staffName}</span>` : ''}
      <span>Generated on ${new Date().toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
    </div>
    ${qrCodeHTML}
  </div>
</div>
</body>
</html>`;
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
