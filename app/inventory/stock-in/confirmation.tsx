import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { formatIndianNumber, formatCurrencyINR } from '@/utils/formatters';
import { createPurchaseInvoice, createInAppNotification, getBankAccounts } from '@/services/backendApi';
import { usePermissions } from '@/contexts/PermissionContext';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';
import { consumeNavData } from '@/utils/navStore';
import {
  ArrowLeft,
  FileText,
  Building2,
  Package,
  Check,
  Banknote,
  Smartphone,
  CreditCard,
  Wallet,
  AlertTriangle,
  ChevronDown,
  X,
} from 'lucide-react-native';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  textMuted: '#9CA3AF',
  primary: '#3F66AC',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  grey: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB' },
};

type PaymentMethod = 'cash' | 'upi' | 'cheque' | 'bank_transfer';
type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export default function StockInConfirmationScreen() {
  const params = useLocalSearchParams();
  const stockInData = consumeNavData<string>('stockInData') || (params.stockInData as string) || null;
  const [isSaving, setIsSaving] = useState(false);
  const { isStaff, staffId, staffName, staffBusinessId } = usePermissions();

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmountStr, setPaidAmountStr] = useState('');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [selectedBankId, setSelectedBankId] = useState('');
  const [showBankPicker, setShowBankPicker] = useState(false);

  useEffect(() => {
    (async () => {
      const res = await getBankAccounts();
      if (res.success) setBankAccounts(res.accounts || []);
    })();
  }, []);

  const data = (() => {
    if (stockInData) {
      try { return typeof stockInData === 'string' ? JSON.parse(stockInData) : stockInData; } catch {}
    }
    return { invoiceNumber: '', invoiceDate: '', hasEwayBill: false, ewayBillNumber: '', vehicleNumber: '', vehicleType: '', supplier: null, products: [], totalAmount: 0, discountType: 'amount', discountValue: 0, notes: '', locationId: null, locationName: '' };
  })();

  const invoiceTotal = data.finalAmount || data.totalAmount || 0;
  const discountAmount = data.discountValue ? (data.discountType === 'percentage' ? (data.totalAmount * data.discountValue / 100) : data.discountValue) : 0;
  const roundOffAmount = data.roundOffAmount || 0;
  const paidAmt = paymentStatus === 'paid' ? invoiceTotal : (parseFloat(paidAmountStr) || 0);
  const balanceDue = invoiceTotal - paidAmt;

  const getBankLabel = (a: any) => {
    const name = a.bank_name || a.bankName || 'Bank';
    const num = a.account_number || a.accountNumber || '';
    return `${name} ••••${num.slice(-4)}`;
  };

  const handleConfirm = async () => {
    setIsSaving(true);

    try {
      const products = data.products || [];

      const pendingProducts: Array<{ tempId: string; productData: any }> = [];
      const items = products.map((p: any, idx: number) => {
        const hasPending = !!p.pendingProductData;
        const tempId = hasPending ? `temp_${idx}_${Date.now()}` : '';

        if (hasPending) {
          const productData = { ...p.pendingProductData };
          if (data.supplier?.id && !productData.preferredSupplierId) {
            productData.preferredSupplierId = data.supplier.id;
          }
          pendingProducts.push({ tempId, productData });
        }

        return {
          productId: hasPending ? undefined : (p.id || undefined),
          tempProductId: hasPending ? tempId : undefined,
          productName: p.name || '',
          quantity: p.quantity || 0,
          unitPrice: p.purchasePrice || 0,
          totalPrice: p.totalPrice || 0,
          taxRate: p.gstRate || 0,
          taxAmount: (p.purchasePrice || 0) * (p.quantity || 0) * ((p.gstRate || 0) / 100),
          cessType: p.cessType || 'none',
          cessRate: p.cessRate || 0,
          cessAmount: p.cessAmount || 0,
          hsnCode: p.hsnCode || null,
          primaryUnit: p.primaryUnit || 'Piece',
        };
      });

      const subtotal = items.reduce((s: number, i: any) => s + (i.unitPrice * i.quantity), 0);
      const taxAmount = items.reduce((s: number, i: any) => s + i.taxAmount, 0);

      let invoiceDate: string | undefined;
      if (data.invoiceDate) {
        const parts = data.invoiceDate.split('-');
        if (parts.length === 3) invoiceDate = `${parts[2]}-${parts[1]}-${parts[0]}T00:00:00.000Z`;
      }

      const finalPaymentStatus: 'paid' | 'partial' | 'pending' = paymentStatus === 'paid' ? 'paid' : paidAmt > 0 ? 'partial' : 'pending';
      const finalPaymentMethod = paymentStatus === 'unpaid' ? 'none' : paymentMethod;

      const result = await createPurchaseInvoice({
        invoiceNumber: data.invoiceNumber,
        supplierId: data.supplier?.id || undefined,
        supplierName: data.supplier?.businessName || data.supplier?.name || '',
        items,
        pendingProducts: pendingProducts.length > 0 ? pendingProducts : undefined,
        subtotal,
        taxAmount,
        totalAmount: invoiceTotal || (subtotal + taxAmount),
        discountAmount: discountAmount || undefined,
        roundOffAmount: roundOffAmount || undefined,
        paidAmount: paidAmt,
        paymentMethod: finalPaymentMethod,
        paymentStatus: finalPaymentStatus,
        deliveryStatus: 'received',
        invoiceDate,
        locationId: data.locationId || undefined,
        notes: data.notes || undefined,
        staffId: staffId || undefined,
        staffName: staffName || undefined,
        bankAccountId: paymentMethod !== 'cash' ? selectedBankId : undefined,
        additionalFields: data.additionalFields || undefined,
      });

      if (!result.success) {
        setIsSaving(false);
        Alert.alert('Error', result.error || 'Failed to save stock in entry');
        return;
      }

      if (isStaff && staffId && staffBusinessId) {
        createInAppNotification({
          businessId: staffBusinessId, recipientId: 'owner', recipientType: 'owner',
          title: `Stock In by ${staffName || 'Staff'}`,
          message: `Invoice ${data.invoiceNumber} - ${formatCurrencyINR(invoiceTotal)}`,
          type: 'info', category: 'stock',
          sourceStaffId: staffId, sourceStaffName: staffName || undefined,
          relatedEntityType: 'purchase_invoice', relatedEntityId: result.invoice?.id,
        }).catch(() => {});
      }

      setIsSaving(false);
      Alert.alert('Stock In Saved', 'Purchase invoice created and stock updated successfully', [{ text: 'OK', onPress: () => safeRouter.replace('/dashboard' as any) }]);
    } catch (error: any) {
      setIsSaving(false);
      Alert.alert('Error', error.message || 'Failed to save stock in entry');
    }
  };

  return (
    <SafeAreaView style={st.container}>
      <View style={st.header}>
        <TouchableOpacity style={st.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={st.headerTitle}>Confirm Stock In</Text>
      </View>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false}>
        {/* Invoice */}
        <Section title="Invoice Details">
          <Row label="Invoice Number" value={data.invoiceNumber} />
          <Row label="Invoice Date" value={data.invoiceDate} />
          {data.locationName ? <Row label="Receiving Location" value={data.locationName} /> : null}
        </Section>

        {data.additionalFields && Object.keys(data.additionalFields).some((k: string) => data.additionalFields[k]) && (
          <Section title="Additional Details">
            {data.additionalFields.delivery_note ? <Row label="Delivery Note" value={data.additionalFields.delivery_note} /> : null}
            {data.additionalFields.payment_terms ? <Row label="Mode/Terms of Payment" value={data.additionalFields.payment_terms} /> : null}
            {data.additionalFields.reference_no ? <Row label="Reference No." value={data.additionalFields.reference_no} /> : null}
            {data.additionalFields.reference_date ? <Row label="Reference Date" value={data.additionalFields.reference_date} /> : null}
            {data.additionalFields.buyers_order_no ? <Row label="Buyer's Order No." value={data.additionalFields.buyers_order_no} /> : null}
            {data.additionalFields.buyers_order_date ? <Row label="Buyer's Order Date" value={data.additionalFields.buyers_order_date} /> : null}
            {data.additionalFields.dispatch_doc_no ? <Row label="Dispatch Doc No." value={data.additionalFields.dispatch_doc_no} /> : null}
            {data.additionalFields.delivery_note_date ? <Row label="Delivery Note Date" value={data.additionalFields.delivery_note_date} /> : null}
            {data.additionalFields.dispatched_through ? <Row label="Dispatched Through" value={data.additionalFields.dispatched_through} /> : null}
            {data.additionalFields.destination ? <Row label="Destination" value={data.additionalFields.destination} /> : null}
            {data.additionalFields.terms_of_delivery ? <Row label="Terms of Delivery" value={data.additionalFields.terms_of_delivery} /> : null}
          </Section>
        )}

        {data.hasEwayBill && (
          <Section title="E-Way Bill">
            <Row label="E-Way Bill Number" value={data.ewayBillNumber} />
            {data.vehicleNumber ? <Row label="Vehicle Number" value={data.vehicleNumber} /> : null}
            {data.vehicleType ? <Row label="Vehicle Type" value={data.vehicleType} /> : null}
          </Section>
        )}

        {data.supplier && (
          <Section title="Supplier">
            <Row label="Business Name" value={data.supplier.businessName} />
            {data.supplier.gstin ? <Row label="GSTIN" value={data.supplier.gstin} /> : null}
          </Section>
        )}

        {/* Products */}
        <Section title={`Products (${data.products?.length || 0})`}>
          {(data.products || []).map((p: any) => (
            <View key={p.id} style={st.prodCard}>
              <View style={st.prodHead}>
                <Text style={st.prodName} numberOfLines={1}>{p.name}</Text>
                {p.isNewProduct && <View style={st.newBadge}><Text style={st.newBadgeText}>NEW</Text></View>}
              </View>
              <View style={st.prodMeta}>
                <Text style={st.prodMetaText}>{p.quantity} {p.primaryUnit || 'Pc'} × {formatCurrencyINR(p.purchasePrice || 0, 4)}</Text>
                <Text style={st.prodMetaText}>GST {p.gstRate || 0}%</Text>
                <Text style={st.prodTotal}>{formatCurrencyINR(p.totalPrice || 0)}</Text>
              </View>
            </View>
          ))}
        </Section>

        {/* Subtotal / Discount / Round Off / Total */}
        <View style={{ marginBottom: 20, backgroundColor: Colors.grey[50], borderRadius: 12, padding: 14, borderWidth: 1, borderColor: Colors.grey[200] }}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
            <Text style={{ fontSize: 13, color: Colors.textLight }}>Subtotal</Text>
            <Text style={{ fontSize: 13, color: Colors.text, fontWeight: '500' }}>{formatCurrencyINR(data.totalAmount || 0)}</Text>
          </View>
          {discountAmount > 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: Colors.success }}>Discount {data.discountType === 'percentage' ? `(${data.discountValue}%)` : ''}</Text>
              <Text style={{ fontSize: 13, color: Colors.success, fontWeight: '500' }}>-{formatCurrencyINR(discountAmount)}</Text>
            </View>
          )}
          {roundOffAmount !== 0 && (
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 6 }}>
              <Text style={{ fontSize: 13, color: Colors.textLight }}>Round Off</Text>
              <Text style={{ fontSize: 13, color: roundOffAmount > 0 ? Colors.success : Colors.error, fontWeight: '500' }}>{roundOffAmount > 0 ? '+' : ''}{formatCurrencyINR(roundOffAmount)}</Text>
            </View>
          )}
          <View style={{ borderTopWidth: 1, borderTopColor: Colors.grey[200], paddingTop: 8, marginTop: 4, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
            <Text style={st.totalLabel}>Invoice Total</Text>
            <Text style={st.totalAmt}>{formatCurrencyINR(invoiceTotal)}</Text>
          </View>
        </View>

        {/* ── Payment ── */}
        {invoiceTotal > 0 && (
          <Section title="Payment">
            <View style={st.toggleRow}>
              {(['paid', 'partial', 'unpaid'] as PaymentStatus[]).map(s => (
                <TouchableOpacity key={s} style={[st.toggleBtn, paymentStatus === s && st.toggleActive]} onPress={() => { setPaymentStatus(s); if (s === 'paid') setPaidAmountStr(invoiceTotal.toString()); }} activeOpacity={0.7}>
                  <Text style={[st.toggleText, paymentStatus === s && st.toggleTextActive]}>
                    {s === 'paid' ? 'Fully Paid' : s === 'partial' ? 'Partial' : 'Unpaid'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            {paymentStatus === 'partial' && (
              <View style={{ marginBottom: 14 }}>
                <Text style={st.label}>Amount Paid</Text>
                <View style={st.amtRow}>
                  <Text style={st.rupee}>₹</Text>
                  <TextInput style={st.amtInput} value={paidAmountStr} onChangeText={setPaidAmountStr} placeholder="0.00" keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
                </View>
              </View>
            )}

            {paymentStatus !== 'unpaid' && (
              <>
                <Text style={[st.label, { marginBottom: 8 }]}>Payment Method</Text>
                <View style={{ gap: 6 }}>
                  {([
                    { key: 'cash' as PaymentMethod, icon: Banknote, label: 'Cash', color: Colors.success },
                    { key: 'upi' as PaymentMethod, icon: Smartphone, label: 'UPI', color: Colors.primary },
                    { key: 'cheque' as PaymentMethod, icon: CreditCard, label: 'Cheque', color: Colors.warning },
                    { key: 'bank_transfer' as PaymentMethod, icon: Building2, label: 'Bank Transfer', color: '#7C3AED' },
                  ]).map(m => (
                    <TouchableOpacity key={m.key} style={[st.methodCard, paymentMethod === m.key && { borderColor: m.color, backgroundColor: m.color + '08' }]} onPress={() => setPaymentMethod(m.key)} activeOpacity={0.7}>
                      <m.icon size={18} color={paymentMethod === m.key ? m.color : Colors.textLight} />
                      <Text style={[st.methodLabel, paymentMethod === m.key && { color: m.color, fontWeight: '600' }]}>{m.label}</Text>
                      {paymentMethod === m.key && <Check size={16} color={m.color} />}
                    </TouchableOpacity>
                  ))}
                </View>

                {paymentMethod !== 'cash' && (
                  <View style={{ marginTop: 12 }}>
                    <Text style={st.label}>Bank Account</Text>
                    <TouchableOpacity style={st.selector} onPress={() => setShowBankPicker(true)} activeOpacity={0.7}>
                      <Wallet size={18} color={Colors.primary} />
                      <Text style={[st.selectorText, !selectedBankId && { color: Colors.textMuted }]}>
                        {selectedBankId ? getBankLabel(bankAccounts.find(a => (a.id || a.bank_account_id) === selectedBankId) || {}) : 'Select Bank Account'}
                      </Text>
                      <ChevronDown size={16} color={Colors.textLight} />
                    </TouchableOpacity>
                  </View>
                )}
              </>
            )}

            {(paymentStatus === 'partial' || paymentStatus === 'unpaid') && (
              <View style={st.balanceCard}>
                <AlertTriangle size={18} color={Colors.warning} />
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={st.balanceLabel}>Balance Due</Text>
                  <Text style={st.balanceVal}>{formatCurrencyINR(balanceDue)}</Text>
                  <Text style={st.balanceNote}>This will be added to Payables</Text>
                </View>
              </View>
            )}
          </Section>
        )}

        {data.notes ? <Section title="Notes"><Text style={{ fontSize: 14, color: Colors.text, lineHeight: 20 }}>{data.notes}</Text></Section> : null}

        {/* Action Buttons */}
        <View style={st.actions}>
          <TouchableOpacity style={st.editBtn} onPress={() => router.back()} activeOpacity={0.7}>
            <Text style={st.editBtnText}>Back to Edit</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[st.confirmBtn, isSaving && { opacity: 0.6 }]} onPress={handleConfirm} disabled={isSaving} activeOpacity={0.8}>
            {isSaving ? <ActivityIndicator color="#fff" size="small" /> : <Text style={st.confirmBtnText}>Confirm & Save</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>

      {/* Bank Picker */}
      <Modal visible={showBankPicker} transparent animationType="fade" onRequestClose={() => setShowBankPicker(false)}>
        <View style={st.overlay}>
          <View style={st.modal}>
            <View style={st.modalHead}><Text style={st.modalTitle}>Select Bank Account</Text><TouchableOpacity onPress={() => setShowBankPicker(false)}><X size={22} color={Colors.textLight} /></TouchableOpacity></View>
            <ScrollView style={{ maxHeight: 400 }}>
              {bankAccounts.map(a => {
                const aid = a.id || a.bank_account_id;
                return (
                  <TouchableOpacity key={aid} style={[st.bankItem, selectedBankId === aid && st.bankItemActive]} onPress={() => { setSelectedBankId(aid); setShowBankPicker(false); }} activeOpacity={0.7}>
                    <Building2 size={18} color={Colors.primary} />
                    <Text style={{ flex: 1, marginLeft: 10, fontSize: 14, color: Colors.text }}>{getBankLabel(a)}</Text>
                    {selectedBankId === aid && <Check size={16} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
              {bankAccounts.length === 0 && <Text style={{ padding: 20, color: Colors.textMuted, textAlign: 'center' }}>No bank accounts found</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return <View style={{ marginBottom: 20 }}><Text style={st.sectionTitle}>{title}</Text>{children}</View>;
}

function Row({ label, value }: { label: string; value: string }) {
  return (
    <View style={st.row}><Text style={st.rowLabel}>{label}</Text><Text style={st.rowValue}>{value || '—'}</Text></View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },

  sectionTitle: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 10 },
  row: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 7, borderBottomWidth: 1, borderBottomColor: Colors.grey[100] },
  rowLabel: { fontSize: 13, color: Colors.textLight },
  rowValue: { fontSize: 13, fontWeight: '500', color: Colors.text, textAlign: 'right', flex: 1, marginLeft: 12 },

  prodCard: { backgroundColor: Colors.grey[50], borderRadius: 10, padding: 12, marginBottom: 8, borderWidth: 1, borderColor: Colors.grey[200] },
  prodHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  prodName: { fontSize: 14, fontWeight: '600', color: Colors.text, flex: 1 },
  newBadge: { backgroundColor: Colors.success, paddingHorizontal: 6, paddingVertical: 2, borderRadius: 4, marginLeft: 8 },
  newBadgeText: { fontSize: 10, fontWeight: '700', color: '#fff' },
  prodMeta: { flexDirection: 'row', alignItems: 'center', gap: 10 },
  prodMetaText: { fontSize: 12, color: Colors.textLight },
  prodTotal: { fontSize: 13, fontWeight: '700', color: Colors.primary, marginLeft: 'auto' },

  totalCard: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 16, backgroundColor: Colors.primary + '08', borderRadius: 12, borderWidth: 1, borderColor: Colors.primary + '20', marginBottom: 20 },
  totalLabel: { fontSize: 16, fontWeight: '600', color: Colors.text },
  totalAmt: { fontSize: 22, fontWeight: '700', color: Colors.primary },

  label: { fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 6 },
  toggleRow: { flexDirection: 'row', backgroundColor: Colors.grey[100], borderRadius: 10, padding: 3, marginBottom: 14 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: 13, fontWeight: '500', color: Colors.textLight },
  toggleTextActive: { color: '#fff' },

  amtRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 4 },
  rupee: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginRight: 8 },
  amtInput: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.primary, textAlign: 'right' },

  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 10, borderWidth: 1, borderColor: Colors.grey[200], backgroundColor: Colors.grey[50] },
  methodLabel: { flex: 1, fontSize: 13, color: Colors.textLight },

  selector: { flexDirection: 'row', alignItems: 'center', gap: 10, backgroundColor: Colors.grey[50], borderRadius: 10, padding: 12, borderWidth: 1, borderColor: Colors.grey[200] },
  selectorText: { flex: 1, fontSize: 14, color: Colors.text },

  balanceCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.warningBg, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: Colors.warning + '30', marginTop: 14 },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: Colors.warning },
  balanceVal: { fontSize: 18, fontWeight: '700', color: Colors.warning, marginVertical: 2 },
  balanceNote: { fontSize: 11, color: Colors.warning },

  actions: { flexDirection: 'row', gap: 12, marginTop: 20 },
  editBtn: { flex: 1, paddingVertical: 14, borderRadius: 12, borderWidth: 1, borderColor: Colors.grey[200], alignItems: 'center' },
  editBtnText: { fontSize: 15, fontWeight: '600', color: Colors.text },
  confirmBtn: { flex: 2, backgroundColor: Colors.primary, paddingVertical: 14, borderRadius: 12, alignItems: 'center', justifyContent: 'center' },
  confirmBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modal: { backgroundColor: Colors.background, borderRadius: 16, width: '100%', maxWidth: 400 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  modalTitle: { fontSize: 16, fontWeight: '600', color: Colors.text },
  bankItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, borderBottomWidth: 1, borderBottomColor: Colors.grey[100] },
  bankItemActive: { backgroundColor: Colors.primary + '10' },
});
