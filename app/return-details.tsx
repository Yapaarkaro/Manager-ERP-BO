import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Download, Share, Printer, FileText, Calendar, Hash, Building2, Phone, MapPin, CreditCard, Package, IndianRupee, RotateCcw, Eye, TriangleAlert as AlertTriangle, User, ExternalLink, XCircle, Edit3, X } from 'lucide-react-native';
import { useBusinessData } from '@/hooks/useBusinessData';
import { formatQty, formatCurrencyINR } from '@/utils/formatters';
import { generateInvoicePDF, printInvoice, InvoicePDFData } from '@/utils/invoicePdfGenerator';
import { shareInvoicePDF, showShareOptions } from '@/utils/invoiceShareUtils';
import { safeRouter } from '@/utils/safeRouter';
import { consumeNavData } from '@/utils/navStore';
import { supabase } from '@/lib/supabase';
import { getReturnById, cancelReturn, updateReturnItems } from '@/services/backendApi';
import { showAlert, showConfirm } from '@/utils/webAlert';

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

interface ReturnItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
  reason: string;
}

export default function ReturnDetailsScreen() {
  const { returnId, returnData: returnDataParam } = useLocalSearchParams();
  const { data: businessData } = useBusinessData();
  const navReturnData = consumeNavData('returnData');
  let parsedReturn: any = {};
  try { parsedReturn = navReturnData || (returnDataParam ? JSON.parse(returnDataParam as string) : {}); } catch { parsedReturn = {}; }

  const [returnInvoice, setReturnInvoice] = useState<any>(parsedReturn);
  const [returnItems, setReturnItems] = useState<ReturnItem[]>([]);
  const [isLoadingItems, setIsLoadingItems] = useState(true);

  const customer = returnInvoice?.customerDetails;
  const isBusinessCustomer = returnInvoice?.customerType === 'business';

  const mapItems = (rawItems: any[]): ReturnItem[] =>
    rawItems.map((item: any, idx: number) => {
      const qty = Number(item.quantity) || 0;
      const unitPrice = Number(item.rate || item.unit_price || item.unitPrice) || 0;
      const totalPrice = Number(item.total_price || item.totalPrice || item.amount) || (unitPrice * qty);
      const taxAmt = Number(item.taxAmount || item.tax_amount) || 0;
      let taxRate = Number(item.taxRate || item.tax_rate) || 0;
      if (taxRate === 0 && taxAmt > 0 && totalPrice > taxAmt) {
        taxRate = Math.round((taxAmt / (totalPrice - taxAmt)) * 100);
      }
      const preTaxAmount = totalPrice - taxAmt > 0 ? totalPrice - taxAmt : unitPrice * qty;

      return {
        id: item.id || `return-item-${idx}`,
        name: item.name || item.product_name || item.productName || '',
        quantity: qty,
        rate: unitPrice,
        amount: preTaxAmount,
        taxRate,
        taxAmount: taxAmt,
        total: totalPrice > 0 ? totalPrice : preTaxAmount + taxAmt,
        reason: item.reason || '',
      };
    });

  useEffect(() => {
    const loadReturnData = async () => {
      setIsLoadingItems(true);
      const resolvedId = Array.isArray(returnId) ? returnId[0] : returnId;

      const paramItems = parsedReturn?.items || parsedReturn?.returnItems || [];
      if (paramItems.length > 0) {
        setReturnItems(mapItems(paramItems));
        setIsLoadingItems(false);
        return;
      }

      if (!resolvedId) {
        setIsLoadingItems(false);
        return;
      }

      try {
        let foundItems: any[] = [];

        try {
          const efResult = await getReturnById(resolvedId);
          if (efResult.success && efResult.returnData) {
            const r = efResult.returnData;
            setReturnInvoice((prev: any) => ({
              ...prev,
              id: r.id || prev.id,
              returnNumber: r.return_number || prev.returnNumber || '',
              originalInvoiceId: r.original_invoice_id || prev.originalInvoiceId || '',
              originalInvoiceNumber: r.original_invoice_number || prev.originalInvoiceNumber || '',
              customerName: r.customer_name || prev.customerName || '',
              customerType: r.customer_type || prev.customerType || 'individual',
              customerId: r.customer_id || prev.customerId || '',
              staffName: r.staff_name || prev.staffName || '',
              date: r.return_date || r.created_at || prev.date || '',
              amount: parseFloat(r.total_amount) || prev.amount || 0,
              refundStatus: r.refund_status || prev.refundStatus || 'pending',
              refundMethod: r.refund_method || prev.refundMethod || '',
              reason: r.reason || prev.reason || '',
              returnType: r.return_type || prev.returnType || 'customer',
              supplierName: r.supplier_name || prev.supplierName || '',
            }));
            foundItems = efResult.items || [];
          }
        } catch (e) {
          console.warn('Edge function for return failed:', e);
        }

        // Fallback: Query return_items table directly if edge function failed
        if (foundItems.length === 0) {
          try {
            const { data: returnItemRows } = await supabase
              .from('return_items')
              .select('*')
              .eq('return_id', resolvedId)
              .eq('is_deleted', false);
            if (returnItemRows && returnItemRows.length > 0) {
              foundItems = returnItemRows;
            }
          } catch (e) {
            console.warn('Direct return_items query failed:', e);
          }
        }

        if (foundItems.length > 0) {
          setReturnItems(mapItems(foundItems));
        }
      } catch (error) {
        console.warn('Error loading return data:', error);
      } finally {
        setIsLoadingItems(false);
      }
    };

    loadReturnData();
  }, [returnId]);

  const subtotal = returnItems.reduce((sum, item) => sum + item.amount, 0) || Number(returnInvoice.amount) || 0;
  const totalTax = returnItems.reduce((sum, item) => sum + item.taxAmount, 0);
  const grandTotal = subtotal + totalTax || Number(returnInvoice.totalAmount) || subtotal;

  const formatAmount = (amount: number) => formatCurrencyINR(amount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'refunded':
        return Colors.success;
      case 'partially_refunded':
        return Colors.warning;
      case 'pending':
        return Colors.error;
      default:
        return Colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'refunded':
        return 'Refunded';
      case 'partially_refunded':
        return 'Partially Refunded';
      case 'pending':
        return 'Pending Refund';
      default:
        return status;
    }
  };

  const buildReturnPDFData = (): InvoicePDFData => {
    const bizAddr = businessData?.addresses?.[0];
    const bizAddress = bizAddr ? [bizAddr.door_number || bizAddr.doorNumber, bizAddr.address_line_1 || bizAddr.addressLine1 || bizAddr.address_line1, bizAddr.address_line_2 || bizAddr.addressLine2, bizAddr.city, bizAddr.state || bizAddr.stateName, bizAddr.pincode].filter(Boolean).join(', ') : '';
    const bank = businessData?.bankAccounts?.[0];
    return {
      type: 'return',
      invoiceNumber: returnInvoice.returnNumber || returnInvoice.return_number || returnInvoice.id || '',
      invoiceDate: returnInvoice.date || returnInvoice.return_date || new Date().toISOString(),
      business: {
        name: businessData?.business?.legal_name || businessData?.business?.owner_name || '',
        address: bizAddress,
        gstin: businessData?.business?.tax_id || '',
        phone: businessData?.business?.phone,
      },
      customer: customer ? {
        name: customer.name || returnInvoice.customerName || '',
        address: customer.address,
        gstin: customer.gstin,
        phone: customer.mobile,
        isBusinessCustomer,
      } : undefined,
      items: returnItems.map(item => ({
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
        reason: item.reason,
      })),
      subtotal,
      taxAmount: totalTax,
      totalAmount: grandTotal,
      paymentStatus: returnInvoice.refundStatus || 'pending',
      notes: returnInvoice.notes,
      staffName: returnInvoice.staffName || returnInvoice.staff_name,
      invoiceId: returnInvoice.id,
      businessId: businessData?.business?.id,
      bankDetails: bank ? { bankName: bank.bank_name || bank.bankName || '', accountNo: bank.account_number || bank.accountNumber || '', ifsc: bank.ifsc_code || bank.ifscCode || '', branch: bank.branch || '' } : undefined,
    };
  };

  const isCancelled = returnInvoice.status === 'cancelled';
  const [showEditModal, setShowEditModal] = useState(false);
  const [editItems, setEditItems] = useState<any[]>([]);
  const [editNotes, setEditNotes] = useState('');
  const [editSaving, setEditSaving] = useState(false);

  const openEditModal = () => {
    setEditItems(returnItems.map(item => ({ ...item })));
    setEditNotes(returnInvoice.notes || '');
    setShowEditModal(true);
  };

  const handleSaveEdit = async () => {
    setEditSaving(true);
    const total = editItems.reduce((s: number, i: any) => s + i.rate * i.quantity + i.rate * i.quantity * ((i.taxRate || 0) / 100), 0);
    const res = await updateReturnItems(returnInvoice.id, editItems.map((i: any) => ({
      name: i.name, quantity: i.quantity, rate: i.rate, taxRate: i.taxRate || 0, reason: i.reason,
    })), { totalAmount: Math.round(total), notes: editNotes });
    if (res.success) {
      setShowEditModal(false);
      showAlert('Updated', 'Return updated');
      loadReturn();
    } else {
      showAlert('Error', res.error || 'Failed to update');
    }
    setEditSaving(false);
  };

  const handleCancelReturn = () => {
    showConfirm(
      'Cancel Return',
      'Are you sure you want to cancel this return? This will mark it as cancelled.',
      async () => {
        const res = await cancelReturn(returnInvoice.id);
        if (res.success) {
          showAlert('Cancelled', 'Return has been cancelled');
          setReturnInvoice((prev: any) => ({ ...prev, status: 'cancelled' }));
        } else {
          showAlert('Error', res.error || 'Failed to cancel return');
        }
      }
    );
  };

  const handleDownload = async () => {
    try {
      const pdfData = buildReturnPDFData();
      const fileUri = await generateInvoicePDF(pdfData);
      await shareInvoicePDF(fileUri, pdfData.invoiceNumber);
    } catch (error: any) {
      Alert.alert('Download Failed', error.message || 'Could not generate PDF');
    }
  };

  const handleShare = () => {
    const pdfData = buildReturnPDFData();
    showShareOptions({
      invoiceNumber: returnInvoice.returnNumber || returnInvoice.id || '',
      invoiceId: returnInvoice.id,
      businessId: businessData?.business?.id,
      invoiceType: 'return',
      invoicePdfData: pdfData,
    });
  };

  const handlePrint = async () => {
    try {
      const pdfData = buildReturnPDFData();
      await printInvoice(pdfData);
    } catch (error: any) {
      Alert.alert('Print Failed', error.message || 'Could not print invoice');
    }
  };

  const handleViewOriginalInvoice = () => {
    const origId = returnInvoice.originalInvoiceId
      || returnInvoice.original_invoice_id
      || returnInvoice.originalInvoice?.id
      || '';

    if (origId) {
      safeRouter.push({
        pathname: '/invoice-details',
        params: { invoiceId: origId, fromReturn: 'true' }
      });
    } else {
      Alert.alert('Original Invoice', 'Could not find the original invoice ID.');
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
          
          <Text style={styles.headerTitle}>Return Details</Text>
          
          <View style={styles.headerActions}>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleDownload}
              activeOpacity={0.7}
            >
              <Download size={20} color={Colors.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handleShare}
              activeOpacity={0.7}
            >
              <Share size={20} color={Colors.error} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.headerActionButton}
              onPress={handlePrint}
              activeOpacity={0.7}
            >
              <Printer size={20} color={Colors.error} />
            </TouchableOpacity>
            {!isCancelled && (
              <TouchableOpacity style={styles.headerActionButton} onPress={openEditModal} activeOpacity={0.7}>
                <Edit3 size={20} color={Colors.primary} />
              </TouchableOpacity>
            )}
            {!isCancelled && (
              <TouchableOpacity
                style={styles.headerActionButton}
                onPress={handleCancelReturn}
                activeOpacity={0.7}
              >
                <XCircle size={20} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Return Invoice Header */}
        <View style={styles.returnHeader}>
          <View style={styles.returnInvoiceSection}>
            <RotateCcw size={32} color={Colors.error} />
            <Text style={styles.returnInvoiceTitle}>RETURN INVOICE</Text>
          </View>
          
          <View style={styles.returnMetaInfo}>
            <View style={styles.metaRow}>
              <Hash size={16} color={Colors.textLight} />
              <Text style={styles.metaLabel}>Return No:</Text>
              <Text style={styles.metaValue}>{returnInvoice.returnNumber}</Text>
            </View>
            
            <View style={styles.metaRow}>
              <Calendar size={16} color={Colors.textLight} />
              <Text style={styles.metaLabel}>Return Date:</Text>
              <Text style={styles.metaValue}>{formatDate(returnInvoice.date)}</Text>
            </View>

            <View style={styles.metaRow}>
              <FileText size={16} color={Colors.textLight} />
              <Text style={styles.metaLabel}>Original Invoice:</Text>
              <Text style={styles.metaValue}>{returnInvoice.originalInvoiceNumber}</Text>
            </View>
          </View>

          {/* View Original Invoice Button */}
          <TouchableOpacity
            style={styles.viewOriginalButton}
            onPress={handleViewOriginalInvoice}
            activeOpacity={0.7}
          >
            <Eye size={16} color={Colors.primary} />
            <Text style={styles.viewOriginalText}>View Original Invoice</Text>
          </TouchableOpacity>
        </View>

        {/* Return Status */}
        <View style={styles.statusSection}>
          <Text style={styles.sectionTitle}>Return Status</Text>
          
          <View style={[
            styles.statusCard,
            { backgroundColor: `${getStatusColor(returnInvoice.refundStatus)}10` }
          ]}>
            <View style={styles.statusHeader}>
              <View style={[
                styles.statusIcon,
                { backgroundColor: getStatusColor(returnInvoice.refundStatus) }
              ]}>
                <RotateCcw size={20} color="#ffffff" />
              </View>
              <View style={styles.statusInfo}>
                <Text style={[
                  styles.statusText,
                  { color: getStatusColor(returnInvoice.refundStatus) }
                ]}>
                  {getStatusText(returnInvoice.refundStatus)}
                </Text>
                <Text style={styles.statusAmount}>
                  {formatAmount(returnInvoice.amount)}
                </Text>
              </View>
            </View>
            
            <View style={styles.reasonContainer}>
              <AlertTriangle size={16} color={Colors.warning} />
              <Text style={styles.reasonLabel}>Return Reason:</Text>
              <Text style={styles.reasonText}>{returnInvoice.reason}</Text>
            </View>
          </View>
        </View>

        {/* E-Invoice Details — only when data exists */}
        {!!(returnInvoice.irn || returnInvoice.acknowledgmentNumber) && (
          <View style={styles.irnSection}>
            <Text style={styles.sectionTitle}>E-Invoice Details</Text>
            
            <View style={styles.irnCard}>
              {returnInvoice.irn ? (
                <View style={styles.irnRow}>
                  <Text style={styles.irnLabel}>IRN (Invoice Reference Number):</Text>
                  <Text style={styles.irnValue}>{returnInvoice.irn}</Text>
                </View>
              ) : null}
              
              {returnInvoice.acknowledgmentNumber ? (
                <View style={styles.irnRow}>
                  <Text style={styles.irnLabel}>Acknowledgment Number:</Text>
                  <Text style={styles.irnValue}>{returnInvoice.acknowledgmentNumber}</Text>
                </View>
              ) : null}
              
              {returnInvoice.acknowledgmentDate ? (
                <View style={styles.irnRow}>
                  <Text style={styles.irnLabel}>Acknowledgment Date:</Text>
                  <Text style={styles.irnValue}>{formatDate(returnInvoice.acknowledgmentDate)}</Text>
                </View>
              ) : null}
            </View>
          </View>
        )}

        {/* Return From/To — Customer/Supplier Details */}
        {customer && (
          <View style={styles.customerSection}>
            <Text style={styles.sectionTitle}>
              {(returnInvoice?.returnType === 'supplier' || returnInvoice?.return_type === 'supplier') ? 'Return To' : 'Return From'}
            </Text>
            
            <View style={styles.customerCard}>
              <View style={styles.billToHeader}>
                <User size={20} color={Colors.error} />
                <Text style={styles.customerName}>
                  {isBusinessCustomer && customer.businessName ? customer.businessName : (customer.name || returnInvoice.customerName || '')}
                </Text>
              </View>
              {isBusinessCustomer && customer.name && customer.businessName && customer.name !== customer.businessName && (
                <Text style={styles.contactPerson}>{customer.name}</Text>
              )}
              {isBusinessCustomer && customer.gstin ? (
                <View style={styles.billToRow}>
                  <Hash size={14} color={Colors.textLight} />
                  <Text style={styles.customerGstin}>GSTIN: {customer.gstin}</Text>
                </View>
              ) : null}
              {customer.mobile ? (
                <View style={styles.billToRow}>
                  <Phone size={14} color={Colors.textLight} />
                  <Text style={styles.billToText}>{customer.mobile}</Text>
                </View>
              ) : null}
              {customer.address ? (
                <View style={styles.billToRow}>
                  <MapPin size={14} color={Colors.textLight} />
                  <Text style={styles.billToText}>{customer.address}</Text>
                </View>
              ) : null}

              {(returnInvoice?.customerId || returnInvoice?.customer_id) && (
                <TouchableOpacity
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 12, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.grey[100] }}
                  onPress={() => safeRouter.push(`/people/customer-details?customerId=${returnInvoice.customerId || returnInvoice.customer_id}` as any)}
                  activeOpacity={0.7}
                >
                  <ExternalLink size={15} color={Colors.primary} />
                  <Text style={{ fontSize: 13, fontWeight: '600', color: Colors.primary }}>View Customer Details</Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        )}

        {/* Return Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Returned Items ({returnItems.length})</Text>
          
          {isLoadingItems ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={{ marginTop: 8, fontSize: 13, color: Colors.textLight }}>Loading items...</Text>
            </View>
          ) : returnItems.length === 0 ? (
            <View style={{ padding: 24, alignItems: 'center' }}>
              <Package size={24} color={Colors.textLight} />
              <Text style={{ marginTop: 8, fontSize: 13, color: Colors.textLight }}>No items found</Text>
            </View>
          ) : (
            <View style={styles.itemsTable}>
              {/* Table Header */}
              <View style={styles.tableHeader}>
                <Text style={[styles.tableHeaderText, styles.itemNameHeader]}>Item</Text>
                <Text style={[styles.tableHeaderText, styles.qtyHeader]}>Qty</Text>
                <Text style={[styles.tableHeaderText, styles.rateHeader]}>Rate</Text>
                <Text style={[styles.tableHeaderText, styles.amountHeader]}>Amount</Text>
              </View>
              
              {/* Table Rows */}
              {returnItems.map((item) => (
                <View key={item.id} style={styles.tableRow}>
                  <View style={styles.itemNameCell}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemTax}>GST @ {item.taxRate}%</Text>
                    {item.reason ? <Text style={styles.itemReason}>Reason: {item.reason}</Text> : null}
                  </View>
                  <Text style={[styles.tableCellText, styles.qtyCell]}>{formatQty(item.quantity)}</Text>
                  <Text style={[styles.tableCellText, styles.rateCell]}>
                    {formatAmount(item.rate)}
                  </Text>
                  <Text style={[styles.tableCellText, styles.amountCell]}>
                    {formatAmount(item.total)}
                  </Text>
                </View>
              ))}
            </View>
          )}
        </View>

        {/* Refund Summary */}
        <View style={styles.summarySection}>
          <Text style={styles.sectionTitle}>Refund Summary</Text>
          
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>CGST (9%):</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalTax / 2)}</Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>SGST (9%):</Text>
              <Text style={styles.summaryValue}>{formatAmount(totalTax / 2)}</Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Total Refund:</Text>
              <Text style={styles.totalValue}>{formatAmount(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Refund Status */}
        <View style={styles.refundSection}>
          <Text style={styles.sectionTitle}>Refund Information</Text>
          
          <View style={styles.refundCard}>
            <View style={styles.refundRow}>
              <CreditCard size={20} color={getStatusColor(returnInvoice.refundStatus)} />
              <View style={styles.refundInfo}>
                <Text style={styles.refundMethod}>Cash Refund</Text>
                <Text style={[
                  styles.refundStatus,
                  { color: getStatusColor(returnInvoice.refundStatus) }
                ]}>
                  {getStatusText(returnInvoice.refundStatus)}
                </Text>
              </View>
              <Text style={styles.refundAmount}>{formatAmount(grandTotal)}</Text>
            </View>
            
            <View style={styles.refundDetails}>
              <Text style={styles.refundDetailText}>
              {returnInvoice.refundStatus === 'refunded'
                  ? `Refund processed on ${formatDate(returnInvoice.date)}`
                  : returnInvoice.refundStatus === 'partially_refunded'
                  ? `Partial refund of ${formatAmount(Number(returnInvoice.paidAmount) || 0)} processed`
                  : 'Refund processing pending'
                }
              </Text>
            </View>
          </View>
        </View>

        {/* Staff Information */}
        <View style={styles.staffSection}>
          <Text style={styles.sectionTitle}>Processed By</Text>
          
          <View style={styles.staffCard}>
            <View style={styles.staffRow}>
              <View style={styles.staffAvatar}>
                <User size={18} color={Colors.error} />
              </View>
              <View style={styles.staffInfo}>
                <Text style={styles.staffName}>
                  {returnInvoice.staffName || returnInvoice.staff_name || businessData?.business?.owner_name || 'N/A'}
                </Text>
                <Text style={styles.staffRole}>
                  {(returnInvoice.staffName || returnInvoice.staff_name) ? 'Staff' : (businessData?.business?.owner_name ? 'Owner' : '')}
                </Text>
              </View>
            </View>
          </View>
        </View>
      </ScrollView>

      <Modal visible={showEditModal} transparent animationType="slide" onRequestClose={() => setShowEditModal(false)}>
        <View style={{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }}>
          <View style={{ backgroundColor: '#fff', borderRadius: 12, padding: 20, maxHeight: '80%' }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
              <Text style={{ fontSize: 18, fontWeight: '700' }}>Edit Return Items</Text>
              <TouchableOpacity onPress={() => setShowEditModal(false)}><X size={22} color="#666" /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {editItems.map((item: any, idx: number) => (
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
    paddingVertical: 12,
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
    padding: 16,
  },
  returnHeader: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  returnInvoiceSection: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  returnInvoiceTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.error,
    marginLeft: 12,
  },
  returnMetaInfo: {
    gap: 8,
    marginBottom: 16,
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
  viewOriginalButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#f0f4ff',
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  viewOriginalText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  statusSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  statusCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  statusHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  statusIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  statusInfo: {
    flex: 1,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  statusAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
  },
  reasonContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    gap: 8,
  },
  reasonLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '600',
  },
  reasonText: {
    fontSize: 12,
    color: Colors.text,
    flex: 1,
  },
  irnSection: {
    marginBottom: 16,
  },
  irnCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  irnRow: {
    marginBottom: 12,
  },
  irnLabel: {
    fontSize: 12,
    color: Colors.error,
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
    marginBottom: 16,
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
  itemsSection: {
    marginBottom: 16,
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
    backgroundColor: Colors.error,
    paddingVertical: 12,
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
    paddingVertical: 12,
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
    marginBottom: 2,
  },
  itemReason: {
    fontSize: 11,
    color: Colors.error,
    fontStyle: 'italic',
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
    marginBottom: 16,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
    color: Colors.error,
  },
  refundSection: {
    marginBottom: 16,
  },
  refundCard: {
    backgroundColor: '#fef2f2',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.error,
  },
  refundRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  refundInfo: {
    flex: 1,
    marginLeft: 12,
  },
  refundMethod: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  refundStatus: {
    fontSize: 12,
    fontWeight: '600',
  },
  refundAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
  },
  refundDetails: {
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.error,
  },
  refundDetailText: {
    fontSize: 12,
    color: Colors.error,
    fontStyle: 'italic',
  },
  staffSection: {
    marginBottom: 16,
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
});