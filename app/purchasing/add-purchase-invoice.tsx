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
  Platform,
  KeyboardAvoidingView,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';
import { createPurchaseInvoice, createInAppNotification, getSuppliers, getBankAccounts } from '@/services/backendApi';
import { usePermissions } from '@/contexts/PermissionContext';
import { useBusinessData } from '@/hooks/useBusinessData';
import {
  ArrowLeft,
  Building2,
  Package,
  Plus,
  Search,
  X,
  Check,
  IndianRupee,
  ChevronDown,
  ChevronUp,
  Banknote,
  Smartphone,
  CreditCard,
  Wallet,
  AlertTriangle,
  Trash2,
} from 'lucide-react-native';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import { formatCurrencyINR } from '@/utils/formatters';

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

interface PurchaseProduct {
  id: string;
  name: string;
  barcode: string;
  quantity: number;
  purchasePrice: number;
  discount: number;
  totalPrice: number;
  gstRate: number;
  cessRate: number;
  cessType: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cessAmount: number;
  primaryUnit: string;
  hsnCode: string;
}

type PaymentMethod = 'cash' | 'upi' | 'cheque' | 'bank_transfer';
type PaymentStatus = 'paid' | 'partial' | 'unpaid';

export default function AddPurchaseInvoiceScreen() {
  const { isStaff, staffId, staffName, staffBusinessId } = usePermissions();
  const { data: businessData } = useBusinessData();

  const [suppliers, setSuppliers] = useState<any[]>([]);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [loadingSuppliers, setLoadingSuppliers] = useState(true);
  const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');

  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [poNumber, setPoNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [products, setProducts] = useState<PurchaseProduct[]>([]);

  const [paymentStatus, setPaymentStatus] = useState<PaymentStatus>('unpaid');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('cash');
  const [paidAmount, setPaidAmount] = useState('');
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [showBankPicker, setShowBankPicker] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [expandedProductId, setExpandedProductId] = useState<string | null>(null);
  const [gstType, setGstType] = useState<'intra' | 'inter'>('intra');

  useEffect(() => {
    (async () => {
      setLoadingSuppliers(true);
      const [supRes, bankRes] = await Promise.all([getSuppliers(), getBankAccounts()]);
      if (supRes.success) setSuppliers(supRes.suppliers || []);
      if (bankRes.success) setBankAccounts(bankRes.accounts || []);
      setLoadingSuppliers(false);
    })();
  }, []);

  const filteredSuppliers = suppliers.filter(s => {
    const q = supplierSearch.toLowerCase();
    return (s.business_name || s.contact_person || s.name || '').toLowerCase().includes(q) ||
      (s.gstin || '').toLowerCase().includes(q);
  });

  const addProduct = () => {
    setProducts([...products, {
      id: Date.now().toString(),
      name: '', barcode: '', quantity: 1, purchasePrice: 0, discount: 0, totalPrice: 0,
      gstRate: 18, cessRate: 0, cessType: 'none', cessAmount: 0, primaryUnit: 'Piece', hsnCode: '',
    }]);
  };

  const updateProduct = (id: string, field: keyof PurchaseProduct, value: any) => {
    setProducts(prev => prev.map(p => {
      if (p.id !== id) return p;
      const u = { ...p, [field]: value };
      if (field === 'quantity' || field === 'purchasePrice' || field === 'discount') {
        const qty = field === 'quantity' ? value : u.quantity;
        const price = field === 'purchasePrice' ? value : u.purchasePrice;
        const disc = field === 'discount' ? value : u.discount;
        u.totalPrice = qty * price * (1 - disc / 100);
      }
      return u;
    }));
  };

  const removeProduct = (id: string) => setProducts(prev => prev.filter(p => p.id !== id));

  const totals = (() => {
    const subtotal = products.reduce((s, p) => s + p.totalPrice, 0);
    const totalGST = products.reduce((s, p) => s + (p.totalPrice * p.gstRate / 100), 0);
    const totalCess = products.reduce((s, p) => s + p.cessAmount, 0);
    return { subtotal, totalGST, totalCess, total: subtotal + totalGST + totalCess };
  })();

  const paidAmt = paymentStatus === 'paid' ? totals.total : (parseFloat(paidAmount) || 0);
  const balanceDue = totals.total - paidAmt;

  const checkBalanceAndSubmit = () => {
    if (paymentStatus === 'unpaid' || paidAmt <= 0) {
      doSubmit();
      return;
    }

    let availableBalance = 0;
    let balanceType = '';

    if (paymentMethod === 'cash') {
      availableBalance = businessData?.business?.cash_balance ?? businessData?.cashBalance ?? 0;
      balanceType = 'Cash';
    } else if (selectedBankId) {
      const bank = bankAccounts.find(a => (a.id || a.bank_account_id) === selectedBankId);
      availableBalance = bank?.current_balance ?? bank?.balance ?? 0;
      balanceType = bank?.bank_name || bank?.bankName || 'Bank';
    }

    if (paidAmt > availableBalance) {
      const deficit = paidAmt - availableBalance;
      Alert.alert(
        'Insufficient Balance',
        `Your ${balanceType} balance (${formatCurrencyINR(availableBalance)}) is less than the payment amount (${formatCurrencyINR(paidAmt)}). This will result in a negative balance of ${formatCurrencyINR(deficit)}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: paymentMethod === 'cash' ? 'Add Cash Balance' : 'Add Bank Balance',
            onPress: () => {
              if (paymentMethod === 'cash') {
                safeRouter.push('/edit-cash-balance' as any);
              } else {
                safeRouter.push('/bank-accounts' as any);
              }
            },
          },
          { text: 'Continue Anyway', style: 'destructive', onPress: () => doSubmit() },
        ]
      );
      return;
    }
    doSubmit();
  };

  const handleSubmit = () => {
    if (!selectedSupplier) return Alert.alert('Error', 'Please select a supplier');
    if (products.length === 0) return Alert.alert('Error', 'Please add at least one product');
    if (!invoiceNumber.trim()) return Alert.alert('Error', 'Please enter invoice number');
    if (products.some(p => !p.name.trim())) return Alert.alert('Error', 'All products must have a name');
    if (products.some(p => p.quantity <= 0 || p.purchasePrice <= 0)) return Alert.alert('Error', 'All products must have valid quantity and price');
    checkBalanceAndSubmit();
  };

  const doSubmit = async () => {
    const supplierName = selectedSupplier.business_name || selectedSupplier.contact_person || selectedSupplier.name || 'Supplier';
    const finalPaymentStatus: 'paid' | 'partial' | 'pending' | 'overdue' = paymentStatus === 'paid' ? 'paid' : paidAmt > 0 ? 'partial' : 'pending';
    const finalPaymentMethod = paymentStatus === 'unpaid' ? 'none' : (paymentMethod === 'upi' || paymentMethod === 'cheque' || paymentMethod === 'bank_transfer' ? paymentMethod : 'cash');

    setIsSubmitting(true);
    try {
      const result = await createPurchaseInvoice({
        invoiceNumber: invoiceNumber.trim(),
        poNumber: poNumber.trim() || undefined,
        supplierId: selectedSupplier.id,
        supplierName,
        items: products.map(p => ({
          productId: p.id, productName: p.name, quantity: p.quantity,
          unitPrice: p.purchasePrice, totalPrice: p.totalPrice,
          taxRate: p.gstRate, taxAmount: p.totalPrice * p.gstRate / 100,
          cessType: p.cessType, cessRate: p.cessRate, cessAmount: p.cessAmount,
          hsnCode: p.hsnCode, primaryUnit: p.primaryUnit, discount: p.discount,
        })),
        subtotal: totals.subtotal,
        taxAmount: totals.totalGST,
        cessAmount: totals.totalCess,
        totalAmount: totals.total,
        paidAmount: paidAmt,
        paymentMethod: finalPaymentMethod,
        paymentStatus: finalPaymentStatus,
        invoiceDate,
        expectedDelivery: deliveryDate || undefined,
        notes: notes || undefined,
        staffId: staffId || undefined,
        staffName: staffName || undefined,
        bankAccountId: paymentMethod !== 'cash' && selectedBankId ? selectedBankId : undefined,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create purchase invoice');
        setIsSubmitting(false);
        return;
      }

      if (isStaff && staffId && staffBusinessId) {
        createInAppNotification({
          businessId: staffBusinessId,
          recipientId: 'owner', recipientType: 'owner',
          title: `New Purchase by ${staffName || 'Staff'}`,
          message: `Purchase Invoice #${invoiceNumber} - ${formatCurrencyINR(totals.total)}`,
          type: 'info', category: 'purchase',
          sourceStaffId: staffId, sourceStaffName: staffName || undefined,
          relatedEntityType: 'purchase_invoice', relatedEntityId: result.invoice?.id,
        }).catch(() => {});
      }

      Alert.alert('Success', 'Purchase invoice added successfully!', [{ text: 'OK', onPress: () => router.back() }]);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to add purchase invoice');
    } finally {
      setIsSubmitting(false);
    }
  };

  const getSupplierDisplayName = (s: any) => s.business_name || s.contact_person || s.name || 'Unknown';

  const getBankLabel = (a: any) => {
    const name = a.bank_name || a.bankName || 'Bank';
    const num = a.account_number || a.accountNumber || '';
    return `${name} ••••${num.slice(-4)}`;
  };

  return (
    <View style={st.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
          <View style={st.header}>
            <TouchableOpacity style={st.backBtn} onPress={() => router.back()} activeOpacity={0.7}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={st.headerTitle}>Add Purchase Invoice</Text>
          </View>

          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
            {/* ── Supplier ── */}
            <View style={st.section}>
              <Text style={st.sectionTitle}>Supplier Details</Text>
              <TouchableOpacity style={st.selector} onPress={() => setShowSupplierModal(true)} activeOpacity={0.7}>
                <View style={st.selectorLeft}>
                  <Building2 size={20} color={Colors.primary} />
                  {selectedSupplier ? (
                    <View style={{ marginLeft: 12, flex: 1 }}>
                      <Text style={st.selectorText}>{getSupplierDisplayName(selectedSupplier)}</Text>
                      {selectedSupplier.gstin ? <Text style={st.selectorSub}>GSTIN: {selectedSupplier.gstin}</Text> : null}
                    </View>
                  ) : (
                    <Text style={[st.selectorText, { color: Colors.textLight, marginLeft: 12 }]}>Select Supplier</Text>
                  )}
                </View>
                <ChevronDown size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            {/* ── Invoice Details ── */}
            <View style={st.section}>
              <Text style={st.sectionTitle}>Invoice Details</Text>
              <View style={st.row}>
                <View style={st.field}>
                  <Text style={st.label}>Invoice Number *</Text>
                  <TextInput style={st.input} value={invoiceNumber} onChangeText={setInvoiceNumber} placeholder="Enter invoice number" placeholderTextColor={Colors.textMuted} />
                </View>
                <View style={st.field}>
                  <DateInputWithPicker
                    label="Invoice Date"
                    value={invoiceDate}
                    onChangeDate={setInvoiceDate}
                    maximumDate={new Date()}
                  />
                </View>
              </View>
              <View style={st.row}>
                <View style={st.field}>
                  <Text style={st.label}>PO Number</Text>
                  <TextInput style={st.input} value={poNumber} onChangeText={setPoNumber} placeholder="Enter PO number" placeholderTextColor={Colors.textMuted} />
                </View>
                <View style={st.field}>
                  <DateInputWithPicker
                    label="Delivery Date"
                    value={deliveryDate}
                    onChangeDate={setDeliveryDate}
                    maximumDate={new Date(2030, 11, 31)}
                  />
                </View>
              </View>
            </View>

            {/* ── Products ── */}
            <View style={st.section}>
              <View style={st.sectionHead}>
                <Text style={st.sectionTitle}>Products ({products.length})</Text>
                <TouchableOpacity style={st.addBtn} onPress={addProduct} activeOpacity={0.7}>
                  <Plus size={16} color={Colors.primary} /><Text style={st.addBtnText}>Add Product</Text>
                </TouchableOpacity>
              </View>

              {products.length > 0 ? (
                <View style={st.listWrap}>
                  {products.map((p, i) => {
                    const isExpanded = expandedProductId === p.id;
                    const gstAmt = p.totalPrice * p.gstRate / 100;
                    const lineTotal = p.totalPrice + gstAmt + p.cessAmount;
                    const isLast = i === products.length - 1;

                    return (
                      <View key={p.id}>
                        <TouchableOpacity
                          onPress={() => setExpandedProductId(isExpanded ? null : p.id)}
                          activeOpacity={0.6}
                          style={[st.listItem, isExpanded && st.listItemActive]}
                        >
                          <Text style={st.listNum}>{i + 1}</Text>

                          <View style={st.listCenter}>
                            <Text style={st.listName} numberOfLines={1}>{p.name || 'Untitled Item'}</Text>
                            <Text style={st.listSub}>
                              {p.quantity} {p.primaryUnit || 'pcs'}  ×  {formatCurrencyINR(p.purchasePrice)}
                            </Text>
                          </View>

                          <Text style={st.listAmt}>{formatCurrencyINR(lineTotal)}</Text>

                          {isExpanded
                            ? <ChevronUp size={16} color={Colors.primary} style={{ marginLeft: 10 }} />
                            : <ChevronDown size={16} color={Colors.grey[300]} style={{ marginLeft: 10 }} />}
                        </TouchableOpacity>

                        {isExpanded && (
                          <View style={st.listExpanded}>
                            <View style={st.row}>
                              <View style={[st.field, { flex: 2 }]}>
                                <Text style={st.label}>Product Name *</Text>
                                <TextInput style={st.input} value={p.name} onChangeText={v => updateProduct(p.id, 'name', v)} placeholder="Enter product name" placeholderTextColor={Colors.textMuted} />
                              </View>
                              <View style={st.field}>
                                <Text style={st.label}>HSN Code</Text>
                                <TextInput style={st.input} value={p.hsnCode} onChangeText={v => updateProduct(p.id, 'hsnCode', v)} placeholder="HSN" placeholderTextColor={Colors.textMuted} />
                              </View>
                            </View>
                            <View style={st.row}>
                              <View style={st.field}>
                                <Text style={st.label}>Quantity *</Text>
                                <TextInput style={st.input} value={p.quantity > 0 ? p.quantity.toString() : ''} onChangeText={v => updateProduct(p.id, 'quantity', parseFloat(v) || 0)} placeholder="0" keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
                              </View>
                              <View style={st.field}>
                                <Text style={st.label}>Price/Unit *</Text>
                                <TextInput style={st.input} value={p.purchasePrice > 0 ? p.purchasePrice.toString() : ''} onChangeText={v => updateProduct(p.id, 'purchasePrice', parseFloat(v) || 0)} placeholder="0.00" keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
                              </View>
                            </View>
                            <View style={st.row}>
                              <View style={st.field}>
                                <Text style={st.label}>Discount %</Text>
                                <TextInput style={st.input} value={p.discount > 0 ? p.discount.toString() : ''} onChangeText={v => updateProduct(p.id, 'discount', parseFloat(v) || 0)} placeholder="0" keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
                              </View>
                              <View style={st.field}>
                                <Text style={st.label}>GST %</Text>
                                <TextInput style={st.input} value={p.gstRate.toString()} onChangeText={v => updateProduct(p.id, 'gstRate', parseFloat(v) || 0)} placeholder="18" keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
                              </View>
                              <View style={st.field}>
                                <Text style={st.label}>Unit</Text>
                                <TextInput style={st.input} value={p.primaryUnit} onChangeText={v => updateProduct(p.id, 'primaryUnit', v)} placeholder="Piece" placeholderTextColor={Colors.textMuted} />
                              </View>
                            </View>

                            <View style={st.taxBreakdown}>
                              <Text style={st.taxBreakdownTitle}>Tax Breakdown</Text>
                              <View style={st.taxRow}><Text style={st.taxLabel}>Taxable Amount</Text><Text style={st.taxVal}>{formatCurrencyINR(p.totalPrice)}</Text></View>
                              {gstType === 'inter' ? (
                                <View style={st.taxRow}><Text style={st.taxLabel}>IGST ({p.gstRate}%)</Text><Text style={st.taxVal}>{formatCurrencyINR(gstAmt)}</Text></View>
                              ) : (
                                <>
                                  <View style={st.taxRow}><Text style={st.taxLabel}>CGST ({(p.gstRate / 2).toFixed(1)}%)</Text><Text style={st.taxVal}>{formatCurrencyINR(gstAmt / 2)}</Text></View>
                                  <View style={st.taxRow}><Text style={st.taxLabel}>SGST ({(p.gstRate / 2).toFixed(1)}%)</Text><Text style={st.taxVal}>{formatCurrencyINR(gstAmt / 2)}</Text></View>
                                </>
                              )}
                              {p.cessAmount > 0 && <View style={st.taxRow}><Text style={st.taxLabel}>Cess</Text><Text style={st.taxVal}>{formatCurrencyINR(p.cessAmount)}</Text></View>}
                              <View style={[st.taxRow, st.taxTotalRow]}>
                                <Text style={st.taxTotalLabel}>Line Total</Text>
                                <Text style={st.taxTotalVal}>{formatCurrencyINR(lineTotal)}</Text>
                              </View>
                            </View>

                            <TouchableOpacity style={st.removeBtn} onPress={() => { removeProduct(p.id); setExpandedProductId(null); }} activeOpacity={0.7}>
                              <Trash2 size={14} color={Colors.error} />
                              <Text style={st.removeBtnText}>Remove Item</Text>
                            </TouchableOpacity>
                          </View>
                        )}

                        {!isLast && <View style={st.listDivider} />}
                      </View>
                    );
                  })}
                </View>
              ) : (
                <TouchableOpacity style={st.emptyCard} onPress={addProduct} activeOpacity={0.7}>
                  <Package size={24} color={Colors.textMuted} />
                  <Text style={st.emptyText}>Tap to add a product</Text>
                </TouchableOpacity>
              )}
            </View>

            {/* ── Totals ── */}
            {products.length > 0 && (
              <View style={st.section}>
                <Text style={st.sectionTitle}>Invoice Summary</Text>
                <View style={st.gstToggleRow}>
                  <Text style={st.gstToggleLabel}>GST Type:</Text>
                  <View style={st.gstToggle}>
                    <TouchableOpacity style={[st.gstToggleBtn, gstType === 'intra' && st.gstToggleBtnActive]} onPress={() => setGstType('intra')} activeOpacity={0.7}>
                      <Text style={[st.gstToggleBtnText, gstType === 'intra' && st.gstToggleBtnTextActive]}>Intra (CGST+SGST)</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[st.gstToggleBtn, gstType === 'inter' && st.gstToggleBtnActive]} onPress={() => setGstType('inter')} activeOpacity={0.7}>
                      <Text style={[st.gstToggleBtnText, gstType === 'inter' && st.gstToggleBtnTextActive]}>Inter (IGST)</Text>
                    </TouchableOpacity>
                  </View>
                </View>
                <View style={st.summaryCard}>
                  <View style={st.summaryRow}><Text style={st.summaryLabel}>Subtotal</Text><Text style={st.summaryVal}>{formatCurrencyINR(totals.subtotal)}</Text></View>
                  <View style={st.summaryRow}><Text style={st.summaryLabel}>{gstType === 'inter' ? 'IGST' : 'GST'}</Text><Text style={st.summaryVal}>{formatCurrencyINR(totals.totalGST)}</Text></View>
                  {totals.totalCess > 0 && <View style={st.summaryRow}><Text style={st.summaryLabel}>Cess</Text><Text style={st.summaryVal}>{formatCurrencyINR(totals.totalCess)}</Text></View>}
                  <View style={[st.summaryRow, st.summaryTotal]}>
                    <Text style={st.summaryTotalLabel}>Grand Total</Text>
                    <Text style={st.summaryTotalVal}>{formatCurrencyINR(totals.total)}</Text>
                  </View>
                </View>
              </View>
            )}

            {/* ── Payment ── */}
            {products.length > 0 && totals.total > 0 && (
              <View style={st.section}>
                <Text style={st.sectionTitle}>Payment</Text>

                {/* Payment Status */}
                <View style={st.toggleRow}>
                  {(['paid', 'partial', 'unpaid'] as PaymentStatus[]).map(s => (
                    <TouchableOpacity key={s} style={[st.toggleBtn, paymentStatus === s && st.toggleActive]} onPress={() => { setPaymentStatus(s); if (s === 'paid') setPaidAmount(totals.total.toString()); }} activeOpacity={0.7}>
                      <Text style={[st.toggleText, paymentStatus === s && st.toggleTextActive]}>
                        {s === 'paid' ? 'Fully Paid' : s === 'partial' ? 'Partial' : 'Unpaid'}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                {/* Partial amount */}
                {paymentStatus === 'partial' && (
                  <View style={{ marginBottom: 16 }}>
                    <Text style={st.label}>Amount Paid</Text>
                    <View style={st.amtRow}>
                      <Text style={st.rupee}>₹</Text>
                      <TextInput style={st.amtInput} value={paidAmount} onChangeText={setPaidAmount} placeholder="0.00" keyboardType="numeric" placeholderTextColor={Colors.textMuted} />
                    </View>
                  </View>
                )}

                {/* Payment Method */}
                {paymentStatus !== 'unpaid' && (
                  <>
                    <Text style={[st.label, { marginBottom: 8 }]}>Payment Method</Text>
                    <View style={st.methodGrid}>
                      {([
                        { key: 'cash' as PaymentMethod, icon: Banknote, label: 'Cash', color: Colors.success },
                        { key: 'upi' as PaymentMethod, icon: Smartphone, label: 'UPI', color: Colors.primary },
                        { key: 'cheque' as PaymentMethod, icon: CreditCard, label: 'Cheque', color: Colors.warning },
                        { key: 'bank_transfer' as PaymentMethod, icon: Building2, label: 'Bank Transfer', color: '#7C3AED' },
                      ]).map(m => (
                        <TouchableOpacity key={m.key} style={[st.methodCard, paymentMethod === m.key && { borderColor: m.color, backgroundColor: m.color + '08' }]} onPress={() => setPaymentMethod(m.key)} activeOpacity={0.7}>
                          <m.icon size={20} color={paymentMethod === m.key ? m.color : Colors.textLight} />
                          <Text style={[st.methodLabel, paymentMethod === m.key && { color: m.color, fontWeight: '600' }]}>{m.label}</Text>
                          {paymentMethod === m.key && <Check size={16} color={m.color} />}
                        </TouchableOpacity>
                      ))}
                    </View>

                    {/* Bank Account Selection */}
                    {paymentMethod !== 'cash' && (
                      <View style={{ marginTop: 12 }}>
                        <Text style={st.label}>Bank Account</Text>
                        <TouchableOpacity style={st.selector} onPress={() => setShowBankPicker(true)} activeOpacity={0.7}>
                          <View style={st.selectorLeft}>
                            <Wallet size={18} color={Colors.primary} />
                            <Text style={[st.selectorText, { marginLeft: 10 }]}>
                              {selectedBankId ? getBankLabel(bankAccounts.find(a => (a.id || a.bank_account_id) === selectedBankId) || {}) : 'Select Bank Account'}
                            </Text>
                          </View>
                          <ChevronDown size={18} color={Colors.textLight} />
                        </TouchableOpacity>
                      </View>
                    )}
                  </>
                )}

                {/* Balance Due / Add to Payables */}
                {(paymentStatus === 'partial' || paymentStatus === 'unpaid') && (
                  <View style={[st.balanceCard, { marginTop: 16 }]}>
                    <AlertTriangle size={18} color={Colors.warning} />
                    <View style={{ flex: 1, marginLeft: 10 }}>
                      <Text style={st.balanceLabel}>Balance Due</Text>
                      <Text style={st.balanceVal}>{formatCurrencyINR(balanceDue)}</Text>
                      <Text style={st.balanceNote}>This amount will be added to Payables for {selectedSupplier ? getSupplierDisplayName(selectedSupplier) : 'this supplier'}</Text>
                    </View>
                  </View>
                )}
              </View>
            )}

            {/* ── Notes ── */}
            <View style={st.section}>
              <Text style={st.sectionTitle}>Notes</Text>
              <TextInput style={[st.input, { height: 80, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Add notes..." placeholderTextColor={Colors.textMuted} multiline numberOfLines={3} />
            </View>

            {/* ── Submit ── */}
            <View style={{ paddingHorizontal: 16, paddingVertical: 24 }}>
              <TouchableOpacity style={[st.submitBtn, isSubmitting && { backgroundColor: Colors.grey[300] }]} onPress={handleSubmit} disabled={isSubmitting} activeOpacity={0.8}>
                {isSubmitting ? <ActivityIndicator color="#fff" /> : <Text style={st.submitText}>Add Purchase Invoice</Text>}
              </TouchableOpacity>
            </View>
          </ScrollView>
        </KeyboardAvoidingView>

        {/* ── Supplier Modal ── */}
        <Modal visible={showSupplierModal} animationType="slide" presentationStyle="pageSheet">
          <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
            <View style={st.modalHead}>
              <Text style={st.modalTitle}>Select Supplier</Text>
              <TouchableOpacity onPress={() => setShowSupplierModal(false)} style={st.closeBtn}><X size={24} color={Colors.text} /></TouchableOpacity>
            </View>
            <View style={st.searchWrap}>
              <Search size={18} color={Colors.textLight} />
              <TextInput style={st.searchInput} placeholder="Search suppliers..." placeholderTextColor={Colors.textMuted} value={supplierSearch} onChangeText={setSupplierSearch} />
            </View>
            {loadingSuppliers ? (
              <View style={{ padding: 40, alignItems: 'center' }}><ActivityIndicator color={Colors.primary} /><Text style={{ marginTop: 8, color: Colors.textLight }}>Loading suppliers...</Text></View>
            ) : (
              <ScrollView style={{ flex: 1 }}>
                {filteredSuppliers.map(s => (
                  <TouchableOpacity key={s.id} style={st.supplierItem} onPress={() => { setSelectedSupplier(s); setShowSupplierModal(false); setSupplierSearch(''); }} activeOpacity={0.7}>
                    <Text style={st.supplierName}>{getSupplierDisplayName(s)}</Text>
                    {s.gstin ? <Text style={st.supplierSub}>GSTIN: {s.gstin}</Text> : null}
                    {(s.mobile_number || s.phone) ? <Text style={st.supplierSub}>{s.mobile_number || s.phone}</Text> : null}
                  </TouchableOpacity>
                ))}
                {filteredSuppliers.length === 0 && <Text style={{ padding: 20, color: Colors.textMuted, textAlign: 'center' }}>No suppliers found</Text>}
              </ScrollView>
            )}
          </SafeAreaView>
        </Modal>

        {/* ── Bank Picker Modal ── */}
        <Modal visible={showBankPicker} transparent animationType="fade" onRequestClose={() => setShowBankPicker(false)}>
          <View style={st.overlay}>
            <View style={st.modal}>
              <View style={st.modalHead}><Text style={st.modalTitle}>Select Bank Account</Text><TouchableOpacity onPress={() => setShowBankPicker(false)}><X size={22} color={Colors.textLight} /></TouchableOpacity></View>
              <ScrollView style={{ maxHeight: 400 }}>
                {bankAccounts.map(a => {
                  const aid = a.id || a.bank_account_id;
                  return (
                    <TouchableOpacity key={aid} style={[st.bankItem, selectedBankId === aid && st.bankItemActive]} onPress={() => { setSelectedBankId(aid); setShowBankPicker(false); }} activeOpacity={0.7}>
                      <Building2 size={20} color={Colors.primary} />
                      <View style={{ flex: 1, marginLeft: 10 }}><Text style={st.bankItemText}>{getBankLabel(a)}</Text></View>
                      {selectedBankId === aid && <Check size={18} color={Colors.primary} />}
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
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },

  section: { paddingHorizontal: 16, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.grey[100] },
  sectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  sectionHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },

  selector: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', backgroundColor: Colors.grey[50], borderRadius: 10, padding: 14, borderWidth: 1, borderColor: Colors.grey[200] },
  selectorLeft: { flexDirection: 'row', alignItems: 'center', flex: 1 },
  selectorText: { fontSize: 15, fontWeight: '500', color: Colors.text },
  selectorSub: { fontSize: 12, color: Colors.textLight, marginTop: 2 },

  row: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  field: { flex: 1 },
  label: { fontSize: 13, fontWeight: '500', color: Colors.text, marginBottom: 6 },
  input: { backgroundColor: Colors.grey[50], borderRadius: 8, paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 12 : 8, fontSize: 15, color: Colors.text, borderWidth: 1, borderColor: Colors.grey[200] },

  addBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary + '15', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 8, gap: 4 },
  addBtnText: { fontSize: 13, fontWeight: '500', color: Colors.primary },

  listWrap: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden' as const,
  },
  listItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
  },
  listItemActive: {
    backgroundColor: Colors.primary + '06',
  },
  listNum: {
    width: 22,
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textMuted,
  },
  listCenter: {
    flex: 1,
    marginRight: 16,
  },
  listName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  listSub: {
    fontSize: 13,
    color: Colors.textLight,
  },
  listAmt: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.primary,
  },
  listDivider: {
    height: 1,
    backgroundColor: Colors.grey[100],
    marginLeft: 16,
  },
  listExpanded: {
    paddingTop: 16,
    paddingBottom: 10,
    paddingHorizontal: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    backgroundColor: Colors.grey[50],
  },
  taxBreakdown: { backgroundColor: Colors.grey[50], borderRadius: 8, padding: 12, marginBottom: 12, borderWidth: 1, borderColor: Colors.grey[200] },
  taxBreakdownTitle: { fontSize: 11, fontWeight: '700', color: Colors.textMuted, letterSpacing: 0.5, textTransform: 'uppercase', marginBottom: 8 },
  taxRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 3 },
  taxLabel: { fontSize: 12, color: Colors.textLight },
  taxVal: { fontSize: 12, fontWeight: '500', color: Colors.text },
  taxTotalRow: { marginTop: 6, paddingTop: 6, borderTopWidth: 1, borderTopColor: Colors.grey[200] },
  taxTotalLabel: { fontSize: 13, fontWeight: '600', color: Colors.text },
  taxTotalVal: { fontSize: 13, fontWeight: '700', color: Colors.primary },
  removeBtn: { flexDirection: 'row', alignItems: 'center', alignSelf: 'flex-start', gap: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, backgroundColor: Colors.errorBg, borderWidth: 1, borderColor: Colors.error + '20' },
  removeBtnText: { fontSize: 12, fontWeight: '500', color: Colors.error },

  emptyCard: { alignItems: 'center', justifyContent: 'center', padding: 32, backgroundColor: Colors.grey[50], borderRadius: 12, borderWidth: 1, borderColor: Colors.grey[200], borderStyle: 'dashed', gap: 8 },
  emptyText: { fontSize: 14, color: Colors.textMuted },

  gstToggleRow: { flexDirection: 'row' as const, alignItems: 'center' as const, justifyContent: 'space-between' as const, marginBottom: 12 },
  gstToggleLabel: { fontSize: 14, fontWeight: '600' as const, color: Colors.text },
  gstToggle: { flexDirection: 'row' as const, borderRadius: 8, overflow: 'hidden' as const, borderWidth: 1, borderColor: Colors.primary },
  gstToggleBtn: { paddingHorizontal: 10, paddingVertical: 5, backgroundColor: Colors.background },
  gstToggleBtnActive: { backgroundColor: Colors.primary },
  gstToggleBtnText: { fontSize: 11, fontWeight: '600' as const, color: Colors.primary },
  gstToggleBtnTextActive: { color: '#fff' },
  summaryCard: { backgroundColor: Colors.grey[50], borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.grey[200] },
  summaryRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 },
  summaryLabel: { fontSize: 14, color: Colors.textLight },
  summaryVal: { fontSize: 14, fontWeight: '500', color: Colors.text },
  summaryTotal: { marginTop: 8, paddingTop: 10, borderTopWidth: 1, borderTopColor: Colors.grey[200], marginBottom: 0 },
  summaryTotalLabel: { fontSize: 16, fontWeight: '600', color: Colors.text },
  summaryTotalVal: { fontSize: 18, fontWeight: '700', color: Colors.primary },

  toggleRow: { flexDirection: 'row', backgroundColor: Colors.grey[100], borderRadius: 10, padding: 3, marginBottom: 16 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleActive: { backgroundColor: Colors.primary },
  toggleText: { fontSize: 13, fontWeight: '500', color: Colors.textLight },
  toggleTextActive: { color: '#fff' },

  amtRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: Colors.primary, borderRadius: 10, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 4 },
  rupee: { fontSize: 18, fontWeight: '700', color: Colors.primary, marginRight: 8 },
  amtInput: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.primary, textAlign: 'right', ...Platform.select({ web: { outlineStyle: 'none' as any } }) },

  methodGrid: { gap: 8 },
  methodCard: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 14, borderRadius: 10, borderWidth: 1, borderColor: Colors.grey[200], backgroundColor: Colors.grey[50] },
  methodLabel: { flex: 1, fontSize: 14, color: Colors.textLight },

  balanceCard: { flexDirection: 'row', alignItems: 'flex-start', backgroundColor: Colors.warningBg, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: Colors.warning + '30' },
  balanceLabel: { fontSize: 13, fontWeight: '600', color: Colors.warning },
  balanceVal: { fontSize: 18, fontWeight: '700', color: Colors.warning, marginVertical: 2 },
  balanceNote: { fontSize: 11, color: Colors.warning, lineHeight: 16 },

  submitBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center', shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.1, shadowRadius: 4, elevation: 2 },
  submitText: { fontSize: 16, fontWeight: '600', color: '#fff' },

  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  closeBtn: { padding: 4 },
  searchWrap: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grey[50], margin: 16, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, borderWidth: 1, borderColor: Colors.grey[200], gap: 10 },
  searchInput: { flex: 1, fontSize: 15, color: Colors.text },

  supplierItem: { paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: Colors.grey[100] },
  supplierName: { fontSize: 15, fontWeight: '500', color: Colors.text },
  supplierSub: { fontSize: 13, color: Colors.textLight, marginTop: 2 },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modal: { backgroundColor: Colors.background, borderRadius: 16, width: '100%', maxWidth: 400 },
  bankItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 10, borderBottomWidth: 1, borderBottomColor: Colors.grey[100] },
  bankItemActive: { backgroundColor: Colors.primary + '10' },
  bankItemText: { fontSize: 14, color: Colors.text },
});
