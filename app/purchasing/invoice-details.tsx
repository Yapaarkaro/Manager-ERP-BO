import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { getPurchaseInvoices, getCachedPurchaseInvoiceItems, updatePurchaseInvoicePayment, getBankAccounts, invalidateApiCache, getSuppliers } from '@/services/backendApi';
import { useBusinessData } from '@/hooks/useBusinessData';
import { formatQty, formatCurrencyINR } from '@/utils/formatters';
import {
  ArrowLeft,
  Building2,
  Banknote,
  Smartphone,
  CreditCard,
  Package,
  Truck,
  Clock,
  CircleCheck as CheckCircle,
  TriangleAlert as AlertTriangle,
  User,
  Check,
  X,
  Wallet,
  ChevronDown,
  ChevronUp,
  Hash,
  FileText,
  Calendar,
  MapPin,
  Download,
    Share,
    Printer,
    Phone,
    ExternalLink,
} from 'lucide-react-native';
import { safeRouter } from '@/utils/safeRouter';
import { consumeNavData } from '@/utils/navStore';
import { generateInvoicePDF, printInvoice, InvoicePDFData } from '@/utils/invoicePdfGenerator';
import { shareInvoicePDF, showShareOptions } from '@/utils/invoiceShareUtils';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  textMuted: '#9CA3AF',
  primary: '#3F66AC',
  success: '#059669',
  successBg: '#ECFDF5',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  grey: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB' },
};

type PaymentMethod = 'cash' | 'upi' | 'cheque' | 'bank_transfer';

export default function InvoiceDetailsScreen() {
  const { invoiceId, invoiceData: invoiceDataParam } = useLocalSearchParams();
  const navInvoiceData = consumeNavData('purchaseInvoiceData');
  const invoiceData = navInvoiceData ? JSON.stringify(navInvoiceData) : invoiceDataParam;
  const { data: businessData } = useBusinessData();
  const [invoice, setInvoice] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  const [showPayModal, setShowPayModal] = useState(false);
  const [payMethod, setPayMethod] = useState<PaymentMethod>('cash');
  const [chequeNumber, setChequeNumber] = useState('');
  const [transactionRef, setTransactionRef] = useState('');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [isPaying, setIsPaying] = useState(false);
  const [expandedItemIdx, setExpandedItemIdx] = useState<number | null>(null);
  const [supplierExpanded, setSupplierExpanded] = useState(false);
  const [supplierDetails, setSupplierDetails] = useState<any>(null);

  useEffect(() => { loadInvoice(); }, [invoiceId, invoiceData]);

  const loadInvoice = async () => {
    setLoading(true);
    try {
      let inv: any = null;
      if (invoiceData && typeof invoiceData === 'string') {
        try { inv = JSON.parse(invoiceData); } catch {}
      }
      if (!inv || !inv.id) {
        const result = await getPurchaseInvoices();
        if (result.success && result.invoices) {
          inv = result.invoices.find((i: any) => i.id === invoiceId) || null;
        }
      }
      if (inv) {
        if (!inv.items || (Array.isArray(inv.items) && inv.items.length === 0)) {
          const cached = getCachedPurchaseInvoiceItems(inv.id);
          if (cached) inv = { ...inv, items: cached };
        }
        setInvoice(inv);

        const supplierId = inv.supplier_id || inv.supplierId;
        if (supplierId) {
          const suppRes = await getSuppliers();
          if (suppRes.success && suppRes.suppliers) {
            const supp = suppRes.suppliers.find((s: any) => s.id === supplierId);
            if (supp) setSupplierDetails(supp);
          }
        }
      }
      const bankRes = await getBankAccounts();
      if (bankRes.success) setBankAccounts(bankRes.accounts || []);
    } catch (e) {
      console.error('Failed to load invoice:', e);
    } finally {
      setLoading(false);
    }
  };

  const fmt = (n: number | null | undefined) => formatCurrencyINR(n || 0);

  const fmtDate = (d: string | null | undefined) => {
    if (!d) return '—';
    try { return new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }); } catch { return d; }
  };

  const getStatusColor = (s: string) => {
    switch (s) { case 'received': case 'paid': return Colors.success; case 'pending': return Colors.warning; case 'partial': case 'overdue': return Colors.error; default: return Colors.textLight; }
  };
  const getStatusLabel = (s: string) => {
    switch (s) { case 'received': return 'Received'; case 'pending': return 'Pending'; case 'paid': return 'Paid'; case 'partial': return 'Partial'; case 'overdue': return 'Overdue'; case 'cancelled': return 'Cancelled'; default: return s || '—'; }
  };
  const getPaymentLabel = (m: string) => {
    switch (m) { case 'cash': return 'Cash'; case 'upi': return 'UPI'; case 'cheque': return 'Cheque'; case 'bank_transfer': return 'Bank Transfer'; case 'none': return 'Not Paid'; default: return m || '—'; }
  };
  const getBankLabel = (a: any) => {
    const name = a.bank_name || a.bankName || 'Bank';
    const num = a.account_number || a.accountNumber || '';
    return `${name} ••••${num.slice(-4)}`;
  };

  const handlePayInvoice = async () => {
    if (!invoice) return;
    const totalAmount = Number(invoice.total_amount) || 0;
    const paidAlready = Number(invoice.paid_amount) || 0;
    const balDue = totalAmount - paidAlready;
    if (balDue <= 0) return;
    if (payMethod !== 'cash' && !selectedBankId) {
      Alert.alert('Error', 'Please select a bank account'); return;
    }
    setIsPaying(true);
    try {
      const updateRes = await updatePurchaseInvoicePayment({
        invoiceId: invoice.id, paidAmount: totalAmount, paymentMethod: payMethod, paymentStatus: 'paid',
        bankAccountId: payMethod !== 'cash' ? selectedBankId : undefined,
        chequeNumber: payMethod === 'cheque' ? chequeNumber : undefined,
        transactionRef: payMethod === 'upi' ? transactionRef : undefined,
      });
      if (!updateRes.success) { Alert.alert('Error', updateRes.error || 'Failed to update payment'); setIsPaying(false); return; }
      invalidateApiCache();
      Alert.alert('Payment Recorded', 'Invoice has been marked as paid', [{ text: 'OK', onPress: () => { setShowPayModal(false); loadInvoice(); } }]);
    } catch (err: any) {
      Alert.alert('Error', err.message || 'Payment failed');
    } finally { setIsPaying(false); }
  };

  if (loading) {
    return <View style={st.container}><SafeAreaView style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><ActivityIndicator size="large" color={Colors.primary} /><Text style={{ marginTop: 12, color: Colors.textLight }}>Loading...</Text></SafeAreaView></View>;
  }

  if (!invoice) {
    return <View style={st.container}><SafeAreaView style={{ flex: 1 }}><View style={st.header}><TouchableOpacity style={st.backBtn} onPress={() => router.back()}><ArrowLeft size={24} color={Colors.text} /></TouchableOpacity><Text style={st.headerTitle}>Invoice Not Found</Text></View><View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}><Package size={48} color={Colors.textMuted} /><Text style={{ marginTop: 12, color: Colors.textLight }}>Invoice could not be loaded</Text></View></SafeAreaView></View>;
  }

  const items: any[] = invoice.items || [];
  const subtotal = Number(invoice.subtotal) || items.reduce((s: number, i: any) => s + ((Number(i.unit_price || i.unitPrice) || 0) * (Number(i.quantity) || 0)), 0);
  const taxAmount = Number(invoice.tax_amount) || 0;
  const cessAmount = Number(invoice.cess_amount) || 0;
  const totalAmount = Number(invoice.total_amount) || (subtotal + taxAmount + cessAmount);
  const paidAmount = Number(invoice.paid_amount) || 0;
  const balanceDue = totalAmount - paidAmount;
  const supplierName = invoice.supplier_name || '';
  const invoiceNum = invoice.invoice_number || '—';
  const invoiceDateStr = invoice.invoice_date || invoice.created_at;
  const paymentStatus = invoice.payment_status || 'pending';
  const deliveryStatus = invoice.delivery_status || 'pending';
  const isUnpaid = paymentStatus !== 'paid' && balanceDue > 0;

  const bizName = businessData?.business?.legal_name || businessData?.business?.owner_name || '';
  const bizAddr = businessData?.addresses?.[0];
  const bizGstin = businessData?.business?.tax_id || '';

  const buildPurchasePDFData = (): InvoicePDFData => {
    const bizNamePdf = businessData?.business?.legal_name || businessData?.business?.owner_name || '';
    const bizAddrPdf = businessData?.addresses?.[0];
    const bizAddress = bizAddrPdf ? [bizAddrPdf.door_number || bizAddrPdf.doorNumber, bizAddrPdf.address_line_1 || bizAddrPdf.addressLine1, bizAddrPdf.address_line_2 || bizAddrPdf.addressLine2, bizAddrPdf.city, bizAddrPdf.state || bizAddrPdf.stateName, bizAddrPdf.pincode].filter(Boolean).join(', ') : '';
    const bank = businessData?.bankAccounts?.[0];
    return {
      type: 'purchase',
      invoiceNumber: invoiceNum,
      invoiceDate: invoiceDateStr || '',
      business: {
        name: bizNamePdf,
        address: bizAddress,
        gstin: bizGstin,
        phone: businessData?.business?.phone,
      },
      supplierName,
      supplierAddress: invoice.supplier_address || '',
      supplierGstin: invoice.supplier_gstin || '',
      items: items.map((item: any) => ({
        name: item.product_name || item.productName || '',
        hsnCode: item.hsn_code || item.hsnCode,
        quantity: Number(item.quantity) || 0,
        unit: item.primary_unit || item.primaryUnit,
        rate: Number(item.unit_price || item.unitPrice) || 0,
        discount: Number(item.discount) || 0,
        taxRate: Number(item.tax_rate || item.taxRate) || 0,
        taxAmount: Number(item.tax_amount || item.taxAmount) || 0,
        cessAmount: Number(item.cess_amount || item.cessAmount) || 0,
        total: (() => {
          const price = Number(item.unit_price || item.unitPrice) || 0;
          const qty = Number(item.quantity) || 0;
          const disc = Number(item.discount) || 0;
          const gst = Number(item.tax_rate || item.taxRate) || 0;
          const base = price * qty * (1 - disc / 100);
          return base + base * (gst / 100) + (Number(item.cess_amount || item.cessAmount) || 0);
        })(),
      })),
      subtotal,
      taxAmount,
      cessAmount,
      totalAmount,
      paidAmount,
      balanceDue,
      paymentMethod: invoice.payment_method || 'none',
      paymentStatus,
      notes: invoice.notes,
      staffName: invoice.staff_name || businessData?.business?.owner_name,
      invoiceId: invoice.id,
      businessId: businessData?.business?.id,
      bankDetails: bank ? { bankName: bank.bank_name || bank.bankName || '', accountNo: bank.account_number || bank.accountNumber || '', ifsc: bank.ifsc_code || bank.ifscCode || '', branch: bank.branch || '' } : undefined,
    };
  };

  const handleDownloadPDF = async () => {
    try {
      const pdfData = buildPurchasePDFData();
      const fileUri = await generateInvoicePDF(pdfData);
      await shareInvoicePDF(fileUri, pdfData.invoiceNumber);
    } catch (error: any) {
      Alert.alert('Download Failed', error.message || 'Could not generate PDF');
    }
  };

  const handleShareInvoice = () => {
    const pdfData = buildPurchasePDFData();
    showShareOptions({
      invoiceNumber: invoiceNum,
      invoiceId: invoice.id,
      businessId: businessData?.business?.id,
      invoiceType: 'purchase',
      invoicePdfData: pdfData,
    });
  };

  const handlePrintInvoice = async () => {
    try {
      const pdfData = buildPurchasePDFData();
      await printInvoice(pdfData);
    } catch (error: any) {
      Alert.alert('Print Failed', error.message || 'Could not print invoice');
    }
  };

  return (
    <View style={st.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <View style={st.header}>
          <TouchableOpacity style={st.backBtn} onPress={() => router.back()} activeOpacity={0.7}><ArrowLeft size={24} color={Colors.text} /></TouchableOpacity>
          <Text style={st.headerTitle}>Purchase Invoice</Text>
          <View style={{ flexDirection: 'row', gap: 4 }}>
            <TouchableOpacity style={{ padding: 8 }} onPress={handleDownloadPDF} activeOpacity={0.7}><Download size={20} color={Colors.primary} /></TouchableOpacity>
            <TouchableOpacity style={{ padding: 8 }} onPress={handleShareInvoice} activeOpacity={0.7}><Share size={20} color={Colors.primary} /></TouchableOpacity>
            <TouchableOpacity style={{ padding: 8 }} onPress={handlePrintInvoice} activeOpacity={0.7}><Printer size={20} color={Colors.primary} /></TouchableOpacity>
          </View>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: isUnpaid ? 100 : 32 }} showsVerticalScrollIndicator={false}>

          {/* Invoice Paper */}
          <View style={st.invoicePaper}>
            {/* Invoice Title & Status */}
            <View style={st.invoiceTitleRow}>
              <View>
                <Text style={st.invoiceTitle}>PURCHASE INVOICE</Text>
                <Text style={st.invoiceNum}>#{invoiceNum}</Text>
              </View>
              <View style={[st.statusBadge, { backgroundColor: getStatusColor(paymentStatus) + '15' }]}>
                {paymentStatus === 'paid' ? <CheckCircle size={14} color={getStatusColor(paymentStatus)} /> : <Clock size={14} color={getStatusColor(paymentStatus)} />}
                <Text style={[st.statusBadgeText, { color: getStatusColor(paymentStatus) }]}>{getStatusLabel(paymentStatus)}</Text>
              </View>
            </View>

            <View style={st.invoiceDivider} />

            {/* FROM (Supplier) - expandable */}
            <View style={{ marginBottom: 4 }}>
              <Text style={st.colLabel}>FROM (SUPPLIER)</Text>
              <TouchableOpacity
                style={st.supplierRow}
                onPress={() => setSupplierExpanded(!supplierExpanded)}
                activeOpacity={0.7}
              >
                <View style={st.supplierIcon}>
                  <Building2 size={18} color={Colors.primary} />
                </View>
                <Text style={[st.supplierName, { flex: 1 }]}>{supplierName || '—'}</Text>
                {supplierExpanded ? <ChevronUp size={16} color={Colors.textLight} /> : <ChevronDown size={16} color={Colors.textLight} />}
              </TouchableOpacity>
              {supplierExpanded && (() => {
                const sd = supplierDetails;
                const gstin = sd?.gstin_pan || sd?.gstin || sd?.tax_id || '';
                const address = [
                  sd?.address_line_1, sd?.address_line_2, sd?.address_line_3,
                  sd?.city, sd?.state, sd?.pincode,
                ].filter(Boolean).join(', ');
                const contactName = sd?.contact_person || '';
                const contactPhone = sd?.mobile_number || sd?.phone || '';
                const hasDetails = !!(gstin || address || contactName || contactPhone);

                return (
                  <View style={{ marginTop: 10, marginLeft: 46, gap: 8 }}>
                    {gstin ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <FileText size={13} color={Colors.textMuted} />
                        <Text style={st.colSubValue}>GSTIN: {gstin}</Text>
                      </View>
                    ) : null}
                    {address ? (
                      <View style={{ flexDirection: 'row', alignItems: 'flex-start', gap: 6 }}>
                        <MapPin size={13} color={Colors.textMuted} style={{ marginTop: 1 }} />
                        <Text style={[st.colSubValue, { flex: 1 }]}>{address}</Text>
                      </View>
                    ) : null}
                    {contactName ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <User size={13} color={Colors.textMuted} />
                        <Text style={st.colSubValue}>{contactName}</Text>
                      </View>
                    ) : null}
                    {contactPhone ? (
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Phone size={13} color={Colors.textMuted} />
                        <Text style={st.colSubValue}>{contactPhone}</Text>
                      </View>
                    ) : null}
                    {!hasDetails && (
                      <Text style={{ fontSize: 13, color: Colors.textMuted, fontStyle: 'italic' }}>No additional supplier details available</Text>
                    )}
                  </View>
                );
              })()}
              {(supplierDetails?.id || invoice?.supplier_id || invoice?.supplierId) && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 10 }}
                  onPress={() => safeRouter.push(`/purchasing/supplier-details?supplierId=${supplierDetails?.id || invoice?.supplier_id || invoice?.supplierId}` as any)}
                  activeOpacity={0.7}
                >
                  <ExternalLink size={15} color={Colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>View Supplier Details</Text>
                </TouchableOpacity>
              )}
            </View>

            <View style={st.invoiceDivider} />

            {/* Bill To / Invoice Info */}
            <View style={st.twoCol}>
              <View style={st.colLeft}>
                <Text style={st.colLabel}>BILL TO</Text>
                {bizName ? <Text style={st.colValue}>{bizName}</Text> : null}
                {bizAddr ? (
                  <>
                    {(bizAddr.door_number || bizAddr.doorNumber) ? (
                      <Text style={st.colSubValue}>{bizAddr.door_number || bizAddr.doorNumber}</Text>
                    ) : null}
                    {(bizAddr.address_line_1 || bizAddr.addressLine1) ? (
                      <Text style={st.colSubValue}>{bizAddr.address_line_1 || bizAddr.addressLine1}</Text>
                    ) : null}
                    {(bizAddr.address_line_2 || bizAddr.addressLine2) ? (
                      <Text style={st.colSubValue}>{bizAddr.address_line_2 || bizAddr.addressLine2}</Text>
                    ) : null}
                    <Text style={st.colSubValue}>
                      {[bizAddr.city, bizAddr.state || bizAddr.stateName, bizAddr.pincode].filter(Boolean).join(', ')}
                    </Text>
                  </>
                ) : null}
                {bizGstin ? <Text style={st.colSubValue}>GSTIN: {bizGstin}</Text> : null}
              </View>
              <View style={st.colRight}>
                <View style={st.infoLineRow}>
                  <Calendar size={13} color={Colors.textMuted} />
                  <Text style={st.infoLineLabel}>Date</Text>
                </View>
                <Text style={st.infoLineVal}>{fmtDate(invoiceDateStr)}</Text>

                <View style={[st.infoLineRow, { marginTop: 10 }]}>
                  <Truck size={13} color={Colors.textMuted} />
                  <Text style={st.infoLineLabel}>Delivery</Text>
                </View>
                <Text style={[st.infoLineVal, { color: getStatusColor(deliveryStatus) }]}>{getStatusLabel(deliveryStatus)}</Text>
              </View>
            </View>

            <View style={st.invoiceDivider} />

            {/* Items */}
            <Text style={st.colLabel}>ITEMS</Text>
            {items.length === 0 ? (
              <View style={st.emptyItems}>
                <Package size={24} color={Colors.grey[300]} />
                <Text style={{ fontSize: 13, color: Colors.textMuted, marginTop: 6 }}>No items available</Text>
              </View>
            ) : (
              <View style={st.itemListWrap}>
                {items.map((item: any, idx: number) => {
                  const name = item.product_name || item.productName || '';
                  const qty = Number(item.quantity) || 0;
                  const price = Number(item.unit_price || item.unitPrice) || 0;
                  const gst = Number(item.tax_rate || item.taxRate) || 0;
                  const discount = Number(item.discount) || 0;
                  const cessAmt = Number(item.cess_amount || item.cessAmount) || 0;
                  const lineBase = price * qty * (1 - discount / 100);
                  const gstAmt = lineBase * (gst / 100);
                  const cgst = gstAmt / 2;
                  const sgst = gstAmt / 2;
                  const lineTotal = lineBase + gstAmt + cessAmt;
                  const hsn = item.hsn_code || item.hsnCode || '';
                  const unit = item.primary_unit || item.primaryUnit || '';
                  const isExpanded = expandedItemIdx === idx;
                  const isLast = idx === items.length - 1;

                  return (
                    <View key={item.id || idx}>
                      <TouchableOpacity
                        style={[st.itemRow, isExpanded && st.itemRowActive]}
                        onPress={() => setExpandedItemIdx(isExpanded ? null : idx)}
                        activeOpacity={0.6}
                      >
                        <Text style={st.itemNum}>{idx + 1}</Text>
                        <View style={st.itemCenter}>
                          <Text style={st.itemName} numberOfLines={1}>{name}</Text>
                          <Text style={st.itemSub}>
                            {formatQty(qty)}{unit ? ` ${unit}` : ''}  ×  {fmt(price)}
                            {hsn ? `  ·  HSN: ${hsn}` : ''}
                          </Text>
                        </View>
                        <Text style={st.itemAmt}>{fmt(lineTotal)}</Text>
                        {isExpanded
                          ? <ChevronUp size={14} color={Colors.primary} style={{ marginLeft: 8 }} />
                          : <ChevronDown size={14} color={Colors.grey[300]} style={{ marginLeft: 8 }} />}
                      </TouchableOpacity>
                      {isExpanded && (
                        <View style={st.itemTaxDetail}>
                          {discount > 0 && <View style={st.itemTaxRow}><Text style={st.itemTaxLabel}>Discount</Text><Text style={st.itemTaxVal}>{discount}%</Text></View>}
                          <View style={st.itemTaxRow}><Text style={st.itemTaxLabel}>Taxable Amount</Text><Text style={st.itemTaxVal}>{fmt(lineBase)}</Text></View>
                          <View style={st.itemTaxRow}><Text style={st.itemTaxLabel}>CGST ({(gst / 2).toFixed(1)}%)</Text><Text style={st.itemTaxVal}>{fmt(cgst)}</Text></View>
                          <View style={st.itemTaxRow}><Text style={st.itemTaxLabel}>SGST ({(gst / 2).toFixed(1)}%)</Text><Text style={st.itemTaxVal}>{fmt(sgst)}</Text></View>
                          {cessAmt > 0 && <View style={st.itemTaxRow}><Text style={st.itemTaxLabel}>Cess</Text><Text style={st.itemTaxVal}>{fmt(cessAmt)}</Text></View>}
                          <View style={[st.itemTaxRow, { marginTop: 4, paddingTop: 4, borderTopWidth: 1, borderTopColor: Colors.grey[200] }]}>
                            <Text style={[st.itemTaxLabel, { fontWeight: '600', color: Colors.text }]}>Line Total</Text>
                            <Text style={[st.itemTaxVal, { fontWeight: '700', color: Colors.primary }]}>{fmt(lineTotal)}</Text>
                          </View>
                        </View>
                      )}
                      {!isLast && !isExpanded && <View style={st.itemDivider} />}
                    </View>
                  );
                })}
              </View>
            )}

            <View style={st.invoiceDivider} />

            {/* Totals - spread across full width */}
            <View>
              <View style={st.totalFullRow}>
                <Text style={st.totalFullLabel}>Subtotal</Text>
                <Text style={st.totalFullVal}>{fmt(subtotal)}</Text>
              </View>
              <View style={st.totalFullRow}>
                <Text style={st.totalFullLabel}>GST</Text>
                <Text style={st.totalFullVal}>{fmt(taxAmount)}</Text>
              </View>
              {cessAmount > 0 && (
                <View style={st.totalFullRow}>
                  <Text style={st.totalFullLabel}>Cess</Text>
                  <Text style={st.totalFullVal}>{fmt(cessAmount)}</Text>
                </View>
              )}
              <View style={[st.invoiceDivider, { marginVertical: 8 }]} />
              <View style={st.totalFullRow}>
                <Text style={st.totalGrandLabel}>Total Amount</Text>
                <Text style={st.totalGrandVal}>{fmt(totalAmount)}</Text>
              </View>
              <View style={st.totalFullRow}>
                <Text style={[st.totalFullLabel, paidAmount > 0 ? { color: Colors.success } : undefined]}>Amount Paid</Text>
                <Text style={[st.totalFullVal, paidAmount > 0 ? { color: Colors.success } : undefined]}>{fmt(paidAmount)}</Text>
              </View>
              {balanceDue > 0 && (
                <View style={st.balanceDueRow}>
                  <Text style={st.balanceDueLabel}>Balance Due</Text>
                  <Text style={st.balanceDueVal}>{fmt(balanceDue)}</Text>
                </View>
              )}
            </View>

            <View style={st.invoiceDivider} />

            {/* Payment & Meta */}
            <View style={st.metaGrid}>
              <View style={st.metaItem}>
                <Text style={st.metaLabel}>Payment Method</Text>
                <Text style={st.metaValue}>{getPaymentLabel(invoice.payment_method || 'none')}</Text>
              </View>
              <View style={st.metaItem}>
                <Text style={st.metaLabel}>Payment Status</Text>
                <Text style={[st.metaValue, { color: getStatusColor(paymentStatus) }]}>{getStatusLabel(paymentStatus)}</Text>
              </View>
              <View style={st.metaItem}>
                <Text style={st.metaLabel}>Recorded By</Text>
                <Text style={st.metaValue}>
                  {invoice.staff_name || businessData?.business?.owner_name || 'N/A'}
                </Text>
                {(invoice.staff_name || businessData?.business?.owner_name) ? (
                  <Text style={{ fontSize: 10, color: Colors.textMuted, marginTop: 1 }}>
                    {invoice.staff_name ? 'Staff' : 'Owner'}
                  </Text>
                ) : null}
              </View>
            </View>

            {invoice.notes ? (
              <>
                <View style={st.invoiceDivider} />
                <Text style={st.colLabel}>NOTES</Text>
                <Text style={st.notesText}>{invoice.notes}</Text>
              </>
            ) : null}
          </View>
        </ScrollView>

        {/* Pay Invoice Button - Fixed Bottom */}
        {isUnpaid && (
          <View style={st.payBtnWrap}>
            <TouchableOpacity style={st.payBtn} onPress={() => setShowPayModal(true)} activeOpacity={0.8}>
              <Banknote size={20} color="#fff" />
              <Text style={st.payBtnText}>Pay Invoice — {fmt(balanceDue)}</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Payment Modal */}
        <Modal visible={showPayModal} transparent animationType="slide" onRequestClose={() => setShowPayModal(false)}>
          <View style={st.modalOverlay}>
            <View style={st.payModal}>
              <View style={st.payModalHead}>
                <Text style={st.payModalTitle}>Pay Invoice</Text>
                <TouchableOpacity onPress={() => setShowPayModal(false)}><X size={22} color={Colors.textLight} /></TouchableOpacity>
              </View>
              <ScrollView style={{ maxHeight: 500 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
                <View style={st.payAmtCard}>
                  <Text style={st.payAmtLabel}>Amount to Pay</Text>
                  <Text style={st.payAmtVal}>{fmt(balanceDue)}</Text>
                </View>
                <Text style={st.payLabel}>Payment Method</Text>
                <View style={{ gap: 6, marginBottom: 16 }}>
                  {([
                    { key: 'cash' as PaymentMethod, icon: Banknote, label: 'Cash', color: Colors.success },
                    { key: 'upi' as PaymentMethod, icon: Smartphone, label: 'UPI', color: Colors.primary },
                    { key: 'cheque' as PaymentMethod, icon: CreditCard, label: 'Cheque', color: Colors.warning },
                    { key: 'bank_transfer' as PaymentMethod, icon: Building2, label: 'Bank Transfer', color: '#7C3AED' },
                  ]).map(m => (
                    <TouchableOpacity key={m.key} style={[st.methodCard, payMethod === m.key && { borderColor: m.color, backgroundColor: m.color + '08' }]} onPress={() => setPayMethod(m.key)} activeOpacity={0.7}>
                      <m.icon size={18} color={payMethod === m.key ? m.color : Colors.textLight} />
                      <Text style={[st.methodLabel, payMethod === m.key && { color: m.color, fontWeight: '600' }]}>{m.label}</Text>
                      {payMethod === m.key && <Check size={16} color={m.color} />}
                    </TouchableOpacity>
                  ))}
                </View>
                {payMethod === 'cheque' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={st.payLabel}>Cheque Number</Text>
                    <View style={st.payInputRow}><Hash size={16} color={Colors.textLight} /><TextInput style={st.payInput} value={chequeNumber} onChangeText={setChequeNumber} placeholder="Enter cheque number" placeholderTextColor={Colors.textMuted} /></View>
                  </View>
                )}
                {payMethod === 'upi' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={st.payLabel}>Transaction Reference</Text>
                    <View style={st.payInputRow}><Hash size={16} color={Colors.textLight} /><TextInput style={st.payInput} value={transactionRef} onChangeText={setTransactionRef} placeholder="UPI transaction ID" placeholderTextColor={Colors.textMuted} /></View>
                  </View>
                )}
                {payMethod !== 'cash' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={st.payLabel}>Bank Account</Text>
                    <TouchableOpacity style={st.bankSelector} onPress={() => setShowBankPicker(true)} activeOpacity={0.7}>
                      <Wallet size={18} color={Colors.primary} />
                      <Text style={[st.bankSelectorText, !selectedBankId && { color: Colors.textMuted }]}>
                        {selectedBankId ? getBankLabel(bankAccounts.find(a => (a.id || a.bank_account_id) === selectedBankId) || {}) : 'Select Bank Account'}
                      </Text>
                      <ChevronDown size={16} color={Colors.textLight} />
                    </TouchableOpacity>
                  </View>
                )}
                <TouchableOpacity style={[st.confirmPayBtn, isPaying && { opacity: 0.6 }]} onPress={handlePayInvoice} disabled={isPaying} activeOpacity={0.8}>
                  {isPaying ? <ActivityIndicator color="#fff" /> : <Text style={st.confirmPayText}>Confirm Payment</Text>}
                </TouchableOpacity>
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Bank Picker */}
        <Modal visible={showBankPicker} transparent animationType="fade" onRequestClose={() => setShowBankPicker(false)}>
          <View style={st.modalOverlay}>
            <View style={st.bankModal}>
              <View style={st.payModalHead}><Text style={st.payModalTitle}>Select Bank Account</Text><TouchableOpacity onPress={() => setShowBankPicker(false)}><X size={22} color={Colors.textLight} /></TouchableOpacity></View>
              <ScrollView style={{ maxHeight: 400 }}>
                {bankAccounts.map(a => {
                  const aid = a.id || a.bank_account_id;
                  return (
                    <TouchableOpacity key={aid} style={[st.bankItem, selectedBankId === aid && st.bankItemActive]} onPress={() => { setSelectedBankId(aid); setShowBankPicker(false); }} activeOpacity={0.7}>
                      <Building2 size={18} color={Colors.primary} /><Text style={{ flex: 1, marginLeft: 10, fontSize: 14, color: Colors.text }}>{getBankLabel(a)}</Text>{selectedBankId === aid && <Check size={16} color={Colors.primary} />}
                    </TouchableOpacity>
                  );
                })}
                {bankAccounts.length === 0 && <Text style={{ padding: 20, color: Colors.textMuted, textAlign: 'center' }}>No bank accounts found</Text>}
              </ScrollView>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}


const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grey[100] },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.grey[200], backgroundColor: Colors.background },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },

  invoicePaper: {
    backgroundColor: Colors.background,
    margin: 12,
    borderRadius: 12,
    padding: 20,
    ...Platform.select({
      ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.08, shadowRadius: 12 },
      android: { elevation: 3 },
    }),
  },

  invoiceTitleRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 },
  invoiceTitle: { fontSize: 11, fontWeight: '700', color: Colors.primary, letterSpacing: 1.5, marginBottom: 4 },
  invoiceNum: { fontSize: 22, fontWeight: '800', color: Colors.text, letterSpacing: -0.5 },
  statusBadge: { flexDirection: 'row', alignItems: 'center', gap: 5, paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  statusBadgeText: { fontSize: 12, fontWeight: '700', textTransform: 'uppercase', letterSpacing: 0.5 },

  invoiceDivider: { height: 1, backgroundColor: Colors.grey[200], marginVertical: 14 },

  twoCol: { flexDirection: 'row', gap: 16 },
  colLeft: { flex: 1 },
  colRight: { flex: 0.8, alignItems: 'flex-end' },
  colLabel: { fontSize: 10, fontWeight: '700', color: Colors.textMuted, letterSpacing: 1.2, marginBottom: 6, textTransform: 'uppercase' },
  colValue: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 2 },
  colSubValue: { fontSize: 12, color: Colors.textLight, lineHeight: 18 },

  infoLineRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 2 },
  infoLineLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5 },
  infoLineVal: { fontSize: 13, fontWeight: '600', color: Colors.text },

  supplierRow: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  supplierIcon: { width: 36, height: 36, borderRadius: 10, backgroundColor: Colors.primary + '10', justifyContent: 'center', alignItems: 'center' },
  supplierName: { fontSize: 15, fontWeight: '600', color: Colors.text, flex: 1 },

  emptyItems: { alignItems: 'center', padding: 20, borderRadius: 8, borderWidth: 1, borderColor: Colors.grey[200], borderStyle: 'dashed' },

  itemListWrap: { borderRadius: 10, borderWidth: 1, borderColor: Colors.grey[200], overflow: 'hidden', marginTop: 6 },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 14 },
  itemRowActive: { backgroundColor: Colors.primary + '06' },
  itemNum: { width: 22, fontSize: 13, fontWeight: '600', color: Colors.textMuted },
  itemCenter: { flex: 1, marginRight: 12 },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  itemSub: { fontSize: 13, color: Colors.textLight },
  itemAmt: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  itemDivider: { height: 1, backgroundColor: Colors.grey[100], marginLeft: 14 },

  itemTaxDetail: { backgroundColor: Colors.grey[50], paddingHorizontal: 14, paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: Colors.grey[200], borderLeftWidth: 3, borderLeftColor: Colors.primary },
  itemTaxRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 2 },
  itemTaxLabel: { fontSize: 11, color: Colors.textLight },
  itemTaxVal: { fontSize: 11, fontWeight: '500', color: Colors.text },

  totalFullRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 6, paddingHorizontal: 4 },
  totalFullLabel: { fontSize: 13, color: Colors.textLight },
  totalFullVal: { fontSize: 13, fontWeight: '500', color: Colors.text },
  totalGrandLabel: { fontSize: 15, fontWeight: '700', color: Colors.text },
  totalGrandVal: { fontSize: 17, fontWeight: '800', color: Colors.primary },
  balanceDueRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 12, marginTop: 8, paddingVertical: 12, backgroundColor: Colors.error + '08', borderRadius: 8 },
  balanceDueLabel: { fontSize: 14, fontWeight: '700', color: Colors.error },
  balanceDueVal: { fontSize: 14, fontWeight: '800', color: Colors.error },

  metaGrid: { flexDirection: 'row', flexWrap: 'wrap', gap: 12 },
  metaItem: { minWidth: '45%' },
  metaLabel: { fontSize: 10, fontWeight: '600', color: Colors.textMuted, letterSpacing: 0.5, marginBottom: 2, textTransform: 'uppercase' },
  metaValue: { fontSize: 13, fontWeight: '600', color: Colors.text },

  notesText: { fontSize: 13, color: Colors.textLight, lineHeight: 20, fontStyle: 'italic' },

  payBtnWrap: { position: 'absolute', bottom: 0, left: 0, right: 0, backgroundColor: Colors.background, paddingHorizontal: 16, paddingVertical: 12, paddingBottom: Platform.OS === 'ios' ? 28 : 16, borderTopWidth: 1, borderTopColor: Colors.grey[200], shadowColor: '#000', shadowOffset: { width: 0, height: -2 }, shadowOpacity: 0.06, shadowRadius: 8, elevation: 4 },
  payBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, backgroundColor: Colors.primary, borderRadius: 14, paddingVertical: 16 },
  payBtnText: { fontSize: 16, fontWeight: '700', color: '#fff' },

  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  payModal: { backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  bankModal: { backgroundColor: Colors.background, borderRadius: 16, marginHorizontal: 20, marginBottom: 40, maxHeight: '60%' },
  payModalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  payModalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },

  payAmtCard: { backgroundColor: Colors.primary + '08', borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 20, borderWidth: 1, borderColor: Colors.primary + '20' },
  payAmtLabel: { fontSize: 13, color: Colors.textLight, marginBottom: 4 },
  payAmtVal: { fontSize: 28, fontWeight: '700', color: Colors.primary },

  payLabel: { fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 6 },
  payInputRow: { flexDirection: 'row', alignItems: 'center', gap: 10, borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 10, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 4, backgroundColor: Colors.grey[50] },
  payInput: { flex: 1, fontSize: 15, color: Colors.text },

  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.grey[200], backgroundColor: Colors.grey[50] },
  methodLabel: { flex: 1, fontSize: 14, color: Colors.textLight },

  bankSelector: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.grey[50], borderRadius: 10, padding: 14, borderWidth: 1, borderColor: Colors.grey[200] },
  bankSelectorText: { flex: 1, fontSize: 14, color: Colors.text },
  bankItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Colors.grey[100] },
  bankItemActive: { backgroundColor: Colors.primary + '10' },

  confirmPayBtn: { backgroundColor: Colors.success, borderRadius: 14, paddingVertical: 16, alignItems: 'center', marginTop: 8 },
  confirmPayText: { fontSize: 16, fontWeight: '700', color: '#fff' },
});
