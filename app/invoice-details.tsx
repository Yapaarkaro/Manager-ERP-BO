import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Alert,
  Platform,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { invalidateApiCache, getCustomers, getInvoiceWithItems, cancelInvoice, updateInvoiceItems } from '@/services/backendApi';
import { formatQty, formatCurrencyINR } from '@/utils/formatters';
import { supabase } from '@/lib/supabase';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Download, 
  Share, 
  Printer,
  FileText,
  Calendar,
  Hash,
  Building2,
  Phone,
  MapPin,
  CreditCard,
  Package,
  IndianRupee,
  User,
  Eye,
  ExternalLink,
  XCircle,
  Edit3,
  X,
  Trash2,
} from 'lucide-react-native';
import { safeRouter } from '@/utils/safeRouter';
import { consumeNavData } from '@/utils/navStore';
import { showAlert, showConfirm } from '@/utils/webAlert';
import { DetailSkeleton } from '@/components/SkeletonLoader';
import { useBusinessData } from '@/hooks/useBusinessData';
import { generateInvoicePDF, printInvoice, InvoicePDFData } from '@/utils/invoicePdfGenerator';
import { shareInvoicePDF, showShareOptions } from '@/utils/invoiceShareUtils';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

export default function InvoiceDetailsScreen() {
  const { invoiceId, invoiceData: invoiceDataParam } = useLocalSearchParams();
  const navInvoiceData = consumeNavData('invoiceData');
  const invoiceData = navInvoiceData ? JSON.stringify(navInvoiceData) : invoiceDataParam;
  const { data: businessData } = useBusinessData();
  const [invoice, setInvoice] = useState<any>(null);
  const [customer, setCustomer] = useState<any>(null);
  const [isBusinessCustomer, setIsBusinessCustomer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isItemsLoading, setIsItemsLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const resolvedInvoiceId = Array.isArray(invoiceId) ? invoiceId[0] : invoiceId;

  useEffect(() => {
    if (!resolvedInvoiceId) return;
    loadInvoiceData();
  }, [resolvedInvoiceId]);

  const mapRawItems = (rawItems: any[]): InvoiceItem[] => {
    return rawItems.map((item: any, idx: number) => {
      const qty = Number(item.quantity) || 1;
      const unitPrice = parseFloat(item.unit_price || item.unitPrice) || 0;
      const totalPrice = parseFloat(item.total_price || item.totalPrice) || 0;
      const taxAmt = parseFloat(item.tax_amount || item.taxAmount) || 0;
      const cessAmt = parseFloat(item.cess_amount || item.cessAmount) || 0;
      const preTaxAmount = totalPrice - taxAmt - cessAmt;
      return {
        id: item.id || `item-${idx}`,
        name: item.product_name || item.productName || item.name || '',
        quantity: qty,
        rate: unitPrice,
        amount: preTaxAmount > 0 ? preTaxAmount : unitPrice * qty,
        taxRate: parseFloat(item.tax_rate || item.taxRate) || 0,
        taxAmount: taxAmt,
        total: totalPrice > 0 ? totalPrice : unitPrice * qty + taxAmt + cessAmt,
      };
    });
  };

  const buildInvoiceFromRow = (inv: any, mappedItems: InvoiceItem[]) => {
    const backendSubtotal = parseFloat(inv.subtotal) || 0;
    const backendTotalAmount = parseFloat(inv.total_amount) || 0;
    const backendTaxAmount = parseFloat(inv.tax_amount) || 0;
    const backendCessAmount = parseFloat(inv.cess_amount) || 0;
    const itemsSubtotal = mappedItems.reduce((sum: number, item: any) => sum + item.amount, 0);
    const itemsTax = mappedItems.reduce((sum: number, item: any) => sum + (item.taxAmount || 0), 0);
    const itemsCess = mappedItems.reduce((sum: number, item: any) => sum + ((item as any).cessAmount || 0), 0);

    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      invoiceDate: inv.invoice_date || inv.created_at,
      customerId: inv.customer_id,
      customerName: inv.customer_name,
      customerType: inv.customer_type,
      totalAmount: backendTotalAmount,
      amount: backendTotalAmount,
      subtotal: backendSubtotal > 0 ? backendSubtotal : itemsSubtotal,
      taxAmount: backendTaxAmount > 0 ? backendTaxAmount : itemsTax,
      cessAmount: backendCessAmount > 0 ? backendCessAmount : itemsCess,
      roundOffAmount: parseFloat(inv.round_off_amount) || 0,
      status: inv.payment_status,
      paymentMethod: inv.payment_method,
      paymentStatus: inv.payment_status,
      paidAmount: parseFloat(inv.paid_amount) || 0,
      balanceDue: parseFloat(inv.balance_amount) || 0,
      staffName: inv.staff_name,
      invoiceExtras: inv.invoice_extras,
      items: mappedItems,
    };
  };

  const loadInvoiceData = async () => {
    setIsLoading(true);
    setIsItemsLoading(true);

    const idToFetch = resolvedInvoiceId as string;
    let finalInv: any = null;
    let finalItems: any[] = [];

    // Step 1: Query Supabase directly (fast & reliable)
    try {
      const { data: directInv } = await supabase
        .from('invoices')
        .select('*')
        .eq('id', idToFetch)
        .maybeSingle();
      if (directInv) finalInv = directInv;
    } catch (e) {
      console.warn('Direct invoice query failed:', e);
    }

    // Step 2: Get invoice items directly
    try {
      const { data: directItems } = await supabase
        .from('invoice_items')
        .select('*')
        .eq('invoice_id', idToFetch);
      if (directItems && directItems.length > 0) {
        finalItems = directItems;
      }
    } catch (e) {
      console.warn('Direct invoice_items query failed:', e);
    }

    // Step 3: Fallback to edge function if direct queries gave nothing
    if (!finalInv) {
      try {
        const result = await getInvoiceWithItems(idToFetch);
        if (result.success && result.invoice) {
          finalInv = result.invoice;
          const ri = result.items;
          if (ri && ri.length > 0) finalItems = ri;
          else if (finalInv.items?.length > 0) finalItems = finalInv.items;
          else if (finalInv.invoice_items?.length > 0) finalItems = finalInv.invoice_items;
        }
      } catch (e) {
        console.warn('Edge function fetch failed:', e);
      }
    }

    // Step 4: Build and set the invoice state
    if (finalInv) {
      const mappedItems = mapRawItems(finalItems);
      setInvoice(buildInvoiceFromRow(finalInv, mappedItems));

      // Set customer from invoice data as baseline
      if (finalInv.customer_name) {
        setCustomer({
          id: finalInv.customer_id || 'unknown',
          name: finalInv.customer_name || '',
          customerType: finalInv.customer_type || 'individual',
          mobile: '',
          address: '',
          gstin: '',
          businessName: '',
        });
        setIsBusinessCustomer((finalInv.customer_type || 'individual') === 'business');
      }
      // Try to enrich with full customer data
      if (finalInv.customer_id) {
        try {
          const custResult = await getCustomers();
          if (custResult.success && custResult.customers) {
            const fc = custResult.customers.find((c: any) => c.id === finalInv.customer_id);
            if (fc) {
              setCustomer({
                id: finalInv.customer_id,
                name: finalInv.customer_name || fc.name || '',
                customerType: finalInv.customer_type || 'individual',
                mobile: fc.mobile || fc.phone || '',
                address: fc.address || fc.billing_address || '',
                gstin: fc.gstin || fc.tax_id || '',
                businessName: fc.business_name || '',
              });
              setIsBusinessCustomer((finalInv.customer_type || 'individual') === 'business');
            }
          }
        } catch (e) {
          console.warn('Could not fetch customer details:', e);
        }
      }
    } else if (invoiceData) {
      // Last resort: use navigation params for display
      try {
        const parsed = JSON.parse(invoiceData as string);
        parsed.totalAmount = Number(parsed.totalAmount) || Number(parsed.amount) || 0;
        setInvoice(parsed);
        setCustomer({
          id: parsed.customerId || parsed.id || 'unknown',
          name: parsed.customerName || '',
          customerType: parsed.customerType || 'individual',
          mobile: parsed.customerDetails?.mobile || '',
          address: parsed.customerDetails?.address || '',
          businessName: parsed.customerDetails?.businessName || '',
          gstin: parsed.customerDetails?.gstin || '',
        });
        setIsBusinessCustomer((parsed.customerType || 'individual') === 'business');
      } catch { /* ignore */ }
    }

    setIsLoading(false);
    setIsItemsLoading(false);
  };

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    invalidateApiCache();
    await loadInvoiceData();
    setRefreshing(false);
  }, [resolvedInvoiceId]);

  // Show loading state
  if (isLoading) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Loading Invoice...</Text>
          </View>
        </SafeAreaView>
        <View style={styles.loadingContainer}>
          <DetailSkeleton />
        </View>
      </View>
    );
  }

  // Show error state if invoice not found
  if (!invoice) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Invoice Not Found</Text>
          </View>
        </SafeAreaView>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Invoice not found</Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={loadInvoiceData}
            activeOpacity={0.7}
          >
            <Text style={styles.retryButtonText}>Retry</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  const invoiceItems: InvoiceItem[] = invoice.items && invoice.items.length > 0 ? invoice.items : [];

  const subtotal = invoice.subtotal || invoiceItems.reduce((sum, item) => sum + item.amount, 0);
  const totalTax = invoice.taxAmount != null ? invoice.taxAmount : invoiceItems.reduce((sum, item) => sum + (item.taxAmount || 0), 0);
  const totalCess = invoice.cessAmount != null ? invoice.cessAmount : invoiceItems.reduce((sum, item) => sum + ((item as any).cessAmount || 0), 0);
  const roundOffAmount = invoice.roundOffAmount || 0;
  const grandTotal = Number(invoice.totalAmount) || Number(invoice.amount) || (subtotal + totalTax + totalCess + roundOffAmount);

  const processedByName = invoice.staffName || '';
  const processedByRole = '';
  
  const hasEInvoiceData = !!(invoice.irn || invoice.acknowledgmentNumber || invoice.invoiceExtras?.irn || invoice.invoiceExtras?.acknowledgmentNumber);
  
  const hasInvoiceExtras = invoice.invoiceExtras && typeof invoice.invoiceExtras === 'object' &&
    Object.entries(invoice.invoiceExtras).some(([key, val]) => key !== 'irn' && key !== 'acknowledgmentNumber' && key !== 'acknowledgmentDate' && val && String(val).trim().length > 0);

  const formatAmount = (amount: number) => formatCurrencyINR(amount, 3, 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const isCancelled = invoice.status === 'cancelled' || invoice.is_cancelled;
  const isEditable = !isCancelled && (invoice.status !== 'paid' || (invoice.balanceDue || 0) > 0);

  const openEditModal = () => {
    setEditItems(invoiceItems.map(item => ({ ...item })));
    setEditNotes(invoice.notes || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    const sub = editItems.reduce((s, i) => s + i.rate * i.quantity * (1 - (i.discount || 0) / 100), 0);
    const taxAmt = editItems.reduce((s, i) => s + i.rate * i.quantity * (1 - (i.discount || 0) / 100) * ((i.taxRate || 0) / 100), 0);
    const total = sub + taxAmt;
    const res = await updateInvoiceItems(invoice.id, editItems.map(i => ({
      name: i.name, quantity: i.quantity, rate: i.rate, taxRate: i.taxRate, discount: i.discount || 0, unit: i.unit, hsnCode: i.hsnCode || i.hsn_code,
    })), { subtotal: sub, taxAmount: taxAmt, totalAmount: Math.round(total), notes: editNotes });
    if (res.success) {
      setShowEditModal(false);
      showAlert('Success', 'Invoice updated');
      onRefresh();
    } else {
      showAlert('Error', res.error || 'Failed to update');
    }
    setEditSaving(false);
  };

  const handleCancelInvoice = () => {
    const doCancel = async () => {
      const invoiceIdToUse = invoice.id || invoice.backendId || resolvedInvoiceId;
      if (!invoiceIdToUse) {
        showAlert('Error', 'Invoice ID not found');
        return;
      }
      const res = await cancelInvoice(invoiceIdToUse);
      if (res.success) {
        showAlert('Cancelled', 'Invoice has been cancelled');
        setInvoice((prev: any) => ({ ...prev, status: 'cancelled', is_cancelled: true }));
      } else {
        showAlert('Error', res.error || 'Failed to cancel invoice');
      }
    };
    if (Platform.OS === 'web') {
      if (typeof window !== 'undefined' && window.confirm('Are you sure you want to cancel this invoice? This will mark it as cancelled for audit purposes.')) {
        doCancel();
      }
    } else {
      Alert.alert(
        'Cancel Invoice',
        'Are you sure you want to cancel this invoice? This will mark it as cancelled for audit purposes.',
        [
          { text: 'No', style: 'cancel' },
          { text: 'Yes, Cancel', style: 'destructive', onPress: doCancel },
        ],
        { cancelable: true }
      );
    }
  };

  const buildPDFData = (): InvoicePDFData => {
    const bizAddr = businessData?.addresses?.[0];
    const bizAddress = bizAddr ? [bizAddr.door_number || bizAddr.doorNumber, bizAddr.address_line_1 || bizAddr.addressLine1, bizAddr.address_line_2 || bizAddr.addressLine2, bizAddr.city, bizAddr.state || bizAddr.stateName, bizAddr.pincode].filter(Boolean).join(', ') : invoice.businessAddress;
    const bank = businessData?.bankAccounts?.[0];
    return {
      type: 'sale',
      invoiceNumber: invoice.invoiceNumber || invoice.invoice_number || '',
      invoiceDate: invoice.invoiceDate || invoice.invoice_date || '',
      business: {
        name: businessData?.business?.legal_name || businessData?.business?.owner_name || invoice.businessName || '',
        address: bizAddress,
        gstin: businessData?.business?.tax_id || invoice.gstin,
        phone: businessData?.business?.phone || invoice.businessPhone,
      },
      customer: customer ? {
        name: customer.name || '',
        address: customer.address,
        gstin: invoice.customerDetails?.gstin || customer.gstin,
        phone: customer.mobile,
        businessName: invoice.customerDetails?.businessName || customer.businessName,
        isBusinessCustomer,
      } : undefined,
      items: invoiceItems.map(item => ({
        name: item.name,
        hsnCode: item.hsnCode || item.hsn_code,
        quantity: item.quantity,
        unit: item.unit,
        rate: item.rate,
        discount: item.discount || 0,
        taxRate: item.taxRate,
        taxAmount: item.taxAmount,
        cessAmount: item.cessAmount || 0,
        total: item.total,
      })),
      subtotal,
      taxAmount: totalTax,
      totalAmount: grandTotal,
      paidAmount: invoice.paidAmount || grandTotal,
      balanceDue: invoice.balanceDue || 0,
      paymentMethod: invoice.paymentMethod || invoice.payment_method,
      paymentStatus: invoice.status || invoice.payment_status,
      notes: invoice.notes,
      staffName: invoice.staffName || invoice.staff_name,
      invoiceExtras: invoice.invoiceExtras || invoice.invoice_extras,
      invoiceId: invoice.id,
      businessId: businessData?.business?.id,
      bankDetails: bank ? { bankName: bank.bank_name || bank.bankName || '', accountNo: bank.account_number || bank.accountNumber || '', ifsc: bank.ifsc_code || bank.ifscCode || '', branch: bank.branch || '' } : undefined,
    };
  };

  const handleDownload = async () => {
    try {
      const pdfData = buildPDFData();
      const fileUri = await generateInvoicePDF(pdfData);
      await shareInvoicePDF(fileUri, pdfData.invoiceNumber);
    } catch (error: any) {
      Alert.alert('Download Failed', error.message || 'Could not generate PDF');
    }
  };

  const handleShare = () => {
    const pdfData = buildPDFData();
    showShareOptions({
      invoiceNumber: pdfData.invoiceNumber,
      invoiceId: invoice.id,
      businessId: businessData?.business?.id,
      invoiceType: 'sale',
      invoicePdfData: pdfData,
      onShareToChat: isBusinessCustomer ? () => {
        Alert.alert('Share in Chat', 'Navigate to chat to share this invoice with the customer.');
      } : undefined,
    });
  };

  const handlePrint = async () => {
    try {
      const pdfData = buildPDFData();
      await printInvoice(pdfData);
    } catch (error: any) {
      Alert.alert('Print Failed', error.message || 'Could not print invoice');
    }
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Tax Invoice - {invoice.invoiceNumber || 'N/A'}</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleDownload}
              activeOpacity={0.7}
            >
              <Download size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Share size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handlePrint}
              activeOpacity={0.7}
            >
              <Printer size={20} color={Colors.primary} />
            </TouchableOpacity>
            {isEditable && (
              <TouchableOpacity style={styles.headerActionButton} onPress={openEditModal} activeOpacity={0.7}>
                <Edit3 size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {!isCancelled && (
              <TouchableOpacity
                style={[styles.headerActionButton, { flexDirection: 'row', alignItems: 'center', gap: 4 }]}
                onPress={handleCancelInvoice}
                activeOpacity={0.7}
                hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
              >
                <Trash2 size={20} color={Colors.error} />
                <Text style={{ fontSize: 12, color: Colors.error, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {/* Tax Invoice Header */}
        <View style={styles.invoiceHeader}>
          <View style={styles.taxInvoiceSection}>
            <FileText size={32} color={Colors.primary} />
            <Text style={styles.taxInvoiceTitle}>TAX INVOICE</Text>
          </View>
          
          <View style={styles.invoiceMetaInfo}>
            <View style={styles.metaRow}>
              <Hash size={16} color={Colors.textLight} />
              <Text style={styles.metaLabel}>Invoice No:</Text>
              <Text style={styles.metaValue}>{invoice.invoiceNumber}</Text>
            </View>
            
            <View style={styles.metaRow}>
              <Calendar size={16} color={Colors.textLight} />
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>{formatDate(invoice.invoiceDate)}</Text>
            </View>
          </View>
        </View>

        {/* E-Invoice Details — only when data exists */}
        {hasEInvoiceData && (
          <View style={styles.irnSection}>
            <Text style={styles.sectionTitle}>E-Invoice Details</Text>
            
            <View style={styles.irnCard}>
              {(invoice.irn || invoice.invoiceExtras?.irn) ? (
                <View style={styles.irnRow}>
                  <Text style={styles.irnLabel}>IRN (Invoice Reference Number):</Text>
                  <Text style={styles.irnValue}>{invoice.irn || invoice.invoiceExtras?.irn}</Text>
                </View>
              ) : null}
              
              {(invoice.acknowledgmentNumber || invoice.invoiceExtras?.acknowledgmentNumber) ? (
                <View style={styles.irnRow}>
                  <Text style={styles.irnLabel}>Acknowledgment Number:</Text>
                  <Text style={styles.irnValue}>{invoice.acknowledgmentNumber || invoice.invoiceExtras?.acknowledgmentNumber}</Text>
                </View>
              ) : null}
              
              {(invoice.acknowledgmentDate || invoice.invoiceExtras?.acknowledgmentDate) ? (
                <View style={styles.irnRow}>
                  <Text style={styles.irnLabel}>Acknowledgment Date:</Text>
                  <Text style={styles.irnValue}>{formatDate(invoice.acknowledgmentDate || invoice.invoiceExtras?.acknowledgmentDate)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Bill To — Customer Details */}
        <View style={styles.customerSection}>
          <Text style={styles.sectionTitle}>Bill To</Text>
          
          <View style={styles.customerCard}>
            <View style={styles.billToHeader}>
              <User size={20} color={Colors.primary} />
              <Text style={styles.customerName}>
                {customer
                  ? (isBusinessCustomer && customer.businessName ? customer.businessName : customer.name)
                  : (invoice?.customerName || 'Customer')}
              </Text>
            </View>
            {customer && isBusinessCustomer && customer.name && customer.businessName && customer.name !== customer.businessName && (
              <Text style={styles.contactPerson}>{customer.name}</Text>
            )}
            {customer && isBusinessCustomer && customer.gstin ? (
              <View style={styles.billToRow}>
                <Hash size={14} color={Colors.textLight} />
                <Text style={styles.customerGstin}>GSTIN: {customer.gstin}</Text>
              </View>
            ) : null}
            {customer?.mobile ? (
              <View style={styles.billToRow}>
                <Phone size={14} color={Colors.textLight} />
                <Text style={styles.billToText}>{customer.mobile}</Text>
              </View>
            ) : null}
            {customer?.address ? (
              <View style={styles.billToRow}>
                <MapPin size={14} color={Colors.textLight} />
                <Text style={styles.billToText}>{customer.address}</Text>
              </View>
            ) : null}

            {(customer?.id && customer.id !== 'unknown') || invoice?.customerId ? (
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.grey[100] }}
                onPress={() => safeRouter.push(`/people/customer-details?customerId=${customer?.id !== 'unknown' ? customer?.id : invoice?.customerId}` as any)}
                activeOpacity={0.7}
              >
                <ExternalLink size={15} color={Colors.primary} />
                <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>View Customer Details</Text>
              </TouchableOpacity>
            ) : null}
          </View>
        </View>

        {/* Ship To Address (only for business customers with different shipping address) */}
        {isBusinessCustomer && customer?.shipToAddress && customer.shipToAddress.trim() !== '' && customer.shipToAddress !== customer.address && (
          <View style={styles.shipToSection}>
            <Text style={styles.sectionTitle}>Ship To</Text>
            
            <View style={styles.shipToCard}>
              <Text style={styles.shipToName}>
                {customer.businessName || customer.name}
              </Text>
              <Text style={styles.shipToDetails}>
                {customer.shipToAddress}
              </Text>
            </View>
          </View>
        )}

        {/* Advanced Invoice Details (invoice extras from settings) */}
        {hasInvoiceExtras && (
          <View style={styles.extrasSection}>
            <Text style={styles.sectionTitle}>Additional Details</Text>
            <View style={styles.extrasCard}>
              {invoice.invoiceExtras.deliveryNote ? (
                <View style={styles.extrasRow}><Text style={styles.extrasLabel}>Delivery Note:</Text><Text style={styles.extrasValue}>{invoice.invoiceExtras.deliveryNote}</Text></View>
              ) : null}
              {invoice.invoiceExtras.paymentTermsMode ? (
                <View style={styles.extrasRow}><Text style={styles.extrasLabel}>Payment Terms:</Text><Text style={styles.extrasValue}>{invoice.invoiceExtras.paymentTermsMode}</Text></View>
              ) : null}
              {invoice.invoiceExtras.referenceNo ? (
                <View style={styles.extrasRow}><Text style={styles.extrasLabel}>Reference No:</Text><Text style={styles.extrasValue}>{invoice.invoiceExtras.referenceNo}</Text></View>
              ) : null}
              {invoice.invoiceExtras.referenceDate ? (
                <View style={styles.extrasRow}><Text style={styles.extrasLabel}>Reference Date:</Text><Text style={styles.extrasValue}>{formatDate(invoice.invoiceExtras.referenceDate)}</Text></View>
              ) : null}
              {invoice.invoiceExtras.buyerOrderNumber ? (
                <View style={styles.extrasRow}><Text style={styles.extrasLabel}>Buyer's Order No:</Text><Text style={styles.extrasValue}>{invoice.invoiceExtras.buyerOrderNumber}</Text></View>
              ) : null}
              {invoice.invoiceExtras.buyerOrderDate ? (
                <View style={styles.extrasRow}><Text style={styles.extrasLabel}>Buyer's Order Date:</Text><Text style={styles.extrasValue}>{formatDate(invoice.invoiceExtras.buyerOrderDate)}</Text></View>
              ) : null}
              {invoice.invoiceExtras.dispatchDocNo ? (
                <View style={styles.extrasRow}><Text style={styles.extrasLabel}>Dispatch Doc No:</Text><Text style={styles.extrasValue}>{invoice.invoiceExtras.dispatchDocNo}</Text></View>
              ) : null}
              {invoice.invoiceExtras.deliveryNoteDate ? (
                <View style={styles.extrasRow}><Text style={styles.extrasLabel}>Delivery Note Date:</Text><Text style={styles.extrasValue}>{formatDate(invoice.invoiceExtras.deliveryNoteDate)}</Text></View>
              ) : null}
              {invoice.invoiceExtras.dispatchedVia ? (
                <View style={styles.extrasRow}><Text style={styles.extrasLabel}>Dispatched Through:</Text><Text style={styles.extrasValue}>{invoice.invoiceExtras.dispatchedVia}</Text></View>
              ) : null}
              {invoice.invoiceExtras.destination ? (
                <View style={styles.extrasRow}><Text style={styles.extrasLabel}>Destination:</Text><Text style={styles.extrasValue}>{invoice.invoiceExtras.destination}</Text></View>
              ) : null}
              {invoice.invoiceExtras.termsOfDelivery ? (
                <View style={styles.extrasRow}><Text style={styles.extrasLabel}>Terms of Delivery:</Text><Text style={styles.extrasValue}>{invoice.invoiceExtras.termsOfDelivery}</Text></View>
              ) : null}
              {invoice.invoiceExtras.customFields && Object.entries(invoice.invoiceExtras.customFields).map(([key, val]) => val ? (
                <View key={key} style={styles.extrasRow}><Text style={styles.extrasLabel}>{key}:</Text><Text style={styles.extrasValue}>{String(val)}</Text></View>
              ) : null)}
            </View>
          </View>
        )}

        {/* Invoice Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Invoice Items</Text>
          
          <View style={styles.itemsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.itemNameHeader]}>Item</Text>
              <Text style={[styles.tableHeaderText, styles.qtyHeader]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.rateHeader]}>Rate</Text>
              <Text style={[styles.tableHeaderText, styles.amountHeader]}>Amount</Text>
            </View>
            
            {isItemsLoading && invoiceItems.length === 0 ? (
              <View style={styles.itemsLoadingContainer}>
                <ActivityIndicator size="small" color={Colors.primary} />
                <Text style={styles.itemsLoadingText}>Loading items...</Text>
              </View>
            ) : invoiceItems.length > 0 ? invoiceItems.map((item, index) => (
              <View key={item.id || `item-${index}`} style={styles.tableRow}>
                <View style={styles.itemNameCell}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  {item.taxRate > 0 && <Text style={styles.itemTax}>GST @ {item.taxRate}%</Text>}
                </View>
                <Text style={[styles.tableCellText, styles.qtyCell]}>{formatQty(item.quantity)}</Text>
                <Text style={[styles.tableCellText, styles.rateCell]}>
                  {formatAmount(item.rate)}
                </Text>
                <Text style={[styles.tableCellText, styles.amountCell]}>
                  {formatAmount(item.total)}
                </Text>
              </View>
            )) : (
              <View style={styles.itemsLoadingContainer}>
                <Text style={styles.itemsLoadingText}>No items found</Text>
              </View>
            )}
          </View>
        </View>

        {/* Payment Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Payment Summary</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST:</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalTax)}</Text>
            </View>

            {totalCess > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Cess:</Text>
                <Text style={styles.summaryValue}>{formatAmount(totalCess)}</Text>
              </View>
            )}

            {roundOffAmount !== 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Round Off:</Text>
                <Text style={styles.summaryValue}>{roundOffAmount >= 0 ? '+' : ''}{formatAmount(roundOffAmount)}</Text>
              </View>
            )}
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Grand Total:</Text>
              <Text style={styles.totalValue}>{formatAmount(grandTotal)}</Text>
            </View>

            {invoice.balanceDue > 0 && (
              <>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Paid:</Text>
                  <Text style={styles.summaryValue}>{formatAmount(invoice.paidAmount || 0)}</Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={[styles.summaryLabel, { color: Colors.error }]}>Balance Due:</Text>
                  <Text style={[styles.summaryValue, { color: Colors.error, fontWeight: '700' }]}>{formatAmount(invoice.balanceDue)}</Text>
                </View>
              </>
            )}
          </View>
        </View>

        {/* Payment Status */}
        <View style={styles.paymentSection}>
          <Text style={styles.sectionTitle}>Payment Information</Text>
          
          <View style={styles.paymentCard}>
            <View style={styles.paymentRow}>
              <CreditCard size={20} color={Colors.success} />
              <View style={styles.paymentInfo}>
                <Text style={styles.paymentMethod}>
                  {(invoice.paymentMethod || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase()) || 'N/A'}
                </Text>
                <Text style={styles.paymentStatus}>
                  {(invoice.status || invoice.paymentStatus || '').replace(/_/g, ' ').replace(/\b\w/g, (c: string) => c.toUpperCase())}
                </Text>
              </View>
              <Text style={styles.paymentAmount}>{formatAmount(invoice.paidAmount || grandTotal)}</Text>
            </View>
            
            {invoice.paymentDate ? (
              <View style={styles.paymentDetails}>
                <Text style={styles.paymentDetailText}>
                  Payment received on {formatDate(invoice.paymentDate)}{invoice.paymentTime ? ` at ${invoice.paymentTime}` : ''}
                </Text>
              </View>
            ) : null}
          </View>
        </View>

        {/* Staff Information */}
        <View style={styles.staffSection}>
          <Text style={styles.sectionTitle}>Processed By</Text>
          
          <View style={styles.staffCard}>
            <View style={styles.staffRow}>
              <View style={styles.staffAvatar}>
                <User size={18} color={Colors.primary} />
              </View>
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>{processedByName || 'N/A'}</Text>
                {processedByRole ? <Text style={styles.staffRole}>{processedByRole}</Text> : null}
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>Edit Invoice Items</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}><X size={22} color="#666" /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {editItems.map((item, idx) => (
                <View key={idx} style={{ marginBottom: 14, borderBottomWidth: 1, borderBottomColor: '#e5e7eb', paddingBottom: 10 }}>
                  <Text style={{ fontWeight: '600', marginBottom: 6 }}>{item.name}</Text>
                  <View style={{ flexDirection: 'row', gap: 10 }}>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#666' }}>Qty</Text>
                      <TextInput style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 8, fontSize: 14 }}
                        value={String(item.quantity)} keyboardType="numeric"
                        onChangeText={v => { const items = [...editItems]; items[idx].quantity = parseFloat(v) || 0; setEditItems(items); }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#666' }}>Rate</Text>
                      <TextInput style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 8, fontSize: 14 }}
                        value={String(item.rate)} keyboardType="numeric"
                        onChangeText={v => { const items = [...editItems]; items[idx].rate = parseFloat(v) || 0; setEditItems(items); }} />
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={{ fontSize: 11, color: '#666' }}>Disc %</Text>
                      <TextInput style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 8, fontSize: 14 }}
                        value={String(item.discount || 0)} keyboardType="numeric"
                        onChangeText={v => { const items = [...editItems]; items[idx].discount = parseFloat(v) || 0; setEditItems(items); }} />
                    </View>
                  </View>
                </View>
              ))}
              <View style={{ marginTop: 10 }}>
                <Text style={{ fontSize: 11, color: '#666' }}>Notes</Text>
                <TextInput style={{ borderWidth: 1, borderColor: '#d1d5db', borderRadius: 6, padding: 8, fontSize: 14, minHeight: 50 }}
                  value={editNotes} onChangeText={setEditNotes} multiline />
              </View>
            </ScrollView>
            <TouchableOpacity style={{ backgroundColor: Colors.primary, padding: 14, borderRadius: 8, marginTop: 16, alignItems: 'center' }} onPress={handleSaveEdit} disabled={editSaving}>
              <Text style={{ color: '#fff', fontWeight: '700', fontSize: 15 }}>{editSaving ? 'Saving...' : 'Save Changes'}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSafeArea: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 8, // Reduced padding
    backgroundColor: Colors.background,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 12, // Reduced padding
  },
  invoiceHeader: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16, // Reduced padding
    marginBottom: 12, // Reduced margin
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  taxInvoiceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12, // Reduced margin
    paddingBottom: 12, // Reduced padding
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  taxInvoiceTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 12,
  },
  invoiceMetaInfo: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  metaLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  irnSection: {
    marginBottom: 12, // Reduced margin
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  irnCard: {
    backgroundColor: '#f0f4ff',
    borderRadius: 12,
    padding: 12, // Reduced padding
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  irnRow: {
    marginBottom: 12,
  },
  irnLabel: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
    marginBottom: 4,
  },
  irnValue: {
    fontSize: 14,
    color: Colors.text,
    fontFamily: 'monospace',
    lineHeight: 20,
  },
  customerSection: {
    marginBottom: 12,
  },
  customerCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  billToHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  customerName: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    flex: 1,
  },
  customerGstin: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  contactPerson: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 6,
    marginLeft: 30,
  },
  billToRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 8,
    marginTop: 6,
    marginLeft: 30,
  },
  billToText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
    lineHeight: 20,
  },
  shipToSection: {
    marginBottom: 16,
  },
  shipToCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: '#fed7aa',
  },
  shipToName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  shipToDetails: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  itemsSection: {
    marginBottom: 12, // Reduced margin
  },
  itemsTable: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 8, // Reduced padding
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
  itemNameHeader: {
    flex: 2,
  },
  qtyHeader: {
    flex: 0.8,
    textAlign: 'center',
  },
  rateHeader: {
    flex: 1.2,
    textAlign: 'right',
  },
  amountHeader: {
    flex: 1.2,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 8, // Reduced padding
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
    alignItems: 'center',
  },
  itemNameCell: {
    flex: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  itemTax: {
    fontSize: 12,
    color: Colors.textLight,
  },
  tableCellText: {
    fontSize: 14,
    color: Colors.text,
  },
  qtyCell: {
    flex: 0.8,
    textAlign: 'center',
  },
  rateCell: {
    flex: 1.2,
    textAlign: 'right',
  },
  amountCell: {
    flex: 1.2,
    textAlign: 'right',
    fontWeight: '600',
  },
  summarySection: {
    marginBottom: 12, // Reduced margin
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12, // Reduced padding
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6, // Reduced padding
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  paymentSection: {
    marginBottom: 12, // Reduced margin
  },
  paymentCard: {
    backgroundColor: '#f0fdf4',
    borderRadius: 12,
    padding: 12, // Reduced padding
    borderWidth: 1,
    borderColor: Colors.success,
  },
  paymentRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  paymentInfo: {
    flex: 1,
    marginLeft: 12,
  },
  paymentMethod: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  paymentStatus: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
  },
  paymentAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  paymentDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.success,
  },
  paymentDetailText: {
    fontSize: 12,
    color: Colors.success,
    fontStyle: 'italic',
  },
  staffSection: {
    marginBottom: 12,
  },
  staffCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  staffRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  staffAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.grey[200],
    justifyContent: 'center',
    alignItems: 'center',
  },
  staffInfo: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  staffRole: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 2,
  },
  itemsLoadingContainer: {
    padding: 24,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
    gap: 10,
  },
  itemsLoadingText: {
    color: Colors.textLight,
    fontSize: 13,
  },
  extrasSection: {
    marginBottom: 12,
  },
  extrasCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    gap: 8,
  },
  extrasRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  extrasLabel: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500',
    flex: 1,
  },
  extrasValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
    flex: 1.5,
    textAlign: 'right',
  },
  
  // Loading State
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  
  // Error State
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 20,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});