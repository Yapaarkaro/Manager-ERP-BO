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
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';
import { setNavData } from '@/utils/navStore';
import {
  ArrowLeft,
  CreditCard,
  Banknote,
  Smartphone,
  Building2,
  X,
  Check,
  User,
  ChevronDown,
} from 'lucide-react-native';
import { useBusinessData } from '@/hooks/useBusinessData';
import { recordTransactionForModule, updatePurchaseInvoicePayment, getBusinessPreferences } from '@/services/backendApi';
import { formatCurrencyINR } from '@/utils/formatters';
import { Wallet } from 'lucide-react-native';

const C = {
  bg: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  border: '#E5E7EB',
  surface: '#F9FAFB',
  surfaceAlt: '#F3F4F6',
};

type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque' | 'digital_wallet';

const ALL_METHODS: { method: PaymentMethod; icon: any; title: string; desc: string }[] = [
  { method: 'cash', icon: Banknote, title: 'Cash', desc: 'Make cash payment' },
  { method: 'upi', icon: Smartphone, title: 'UPI', desc: 'Make UPI payment' },
  { method: 'card', icon: CreditCard, title: 'Card', desc: 'Make card payment' },
  { method: 'bank_transfer', icon: Building2, title: 'Bank Transfer', desc: 'Make bank transfer' },
  { method: 'cheque', icon: CreditCard, title: 'Cheque', desc: 'Make cheque payment' },
  { method: 'digital_wallet', icon: Wallet, title: 'Digital Wallet', desc: 'Pay via digital wallet' },
];

export default function ProcessPaymentScreen() {
  const { supplierData } = useLocalSearchParams();
  const supplier = JSON.parse(supplierData as string);
  const { data: businessData } = useBusinessData();

  const [paymentAmount, setPaymentAmount] = useState(supplier.totalPayable.toString());
  const [isFullAmount, setIsFullAmount] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [chequeNumber, setChequeNumber] = useState('');
  const [chequeDate, setChequeDate] = useState('');
  const [chequeBankName, setChequeBankName] = useState('');
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);
  const [enabledMethods, setEnabledMethods] = useState<Record<string, boolean>>({ cash: true, upi: true, card: true, bankTransfer: true, cheque: false, digitalWallet: true });
  const [digitalWallets, setDigitalWallets] = useState<string[]>([]);
  const [selectedWallet, setSelectedWallet] = useState('');
  const [showWalletPicker, setShowWalletPicker] = useState(false);

  useEffect(() => {
    const accts = (businessData.bankAccounts || []).filter((a: any) => (a.type || a.account_type) !== 'cash');
    setBankAccounts(accts);
    if (accts.length > 0) {
      const primary = accts.find((a: any) => a.is_primary || a.isPrimary);
      setSelectedBankId(primary?.id || accts[0].id);
    }
  }, [businessData]);

  useEffect(() => {
    if (!businessData?.business?.id) return;
    getBusinessPreferences(businessData.business.id).then(res => {
      if (res.success && res.preferences) {
        setEnabledMethods(res.preferences.payment_methods || {});
        setDigitalWallets(res.preferences.digital_wallets || []);
      }
    });
  }, [businessData?.business?.id]);

  const methods = ALL_METHODS.filter(m => {
    if (m.method === 'cash') return enabledMethods.cash !== false;
    if (m.method === 'upi') return enabledMethods.upi !== false;
    if (m.method === 'card') return enabledMethods.card !== false;
    if (m.method === 'bank_transfer') return enabledMethods.bankTransfer !== false;
    if (m.method === 'cheque') return enabledMethods.cheque === true;
    if (m.method === 'digital_wallet') return enabledMethods.digitalWallet !== false;
    return true;
  });

  const isCash = selectedMethod === 'cash';
  const needsBank = selectedMethod && selectedMethod !== 'cash' && selectedMethod !== 'digital_wallet';
  const selectedBank = bankAccounts.find(a => a.id === selectedBankId);
  const getBankLabel = (a: any) => `${a.bank_name || a.bankName || 'Bank'} ••••${(a.account_number || a.accountNumber || '').slice(-4)}`;

  const fmt = (n: number) => formatCurrencyINR(n);

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    if (cleaned.split('.').length > 2) return;
    setPaymentAmount(cleaned);
    setIsFullAmount(parseFloat(cleaned) === supplier.totalPayable);
  };

  const handleCompletePayment = () => {
    if (!selectedMethod) { Alert.alert('Required', 'Select a payment method'); return; }
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { Alert.alert('Invalid', 'Enter a valid amount'); return; }
    if (amount > supplier.totalPayable) { Alert.alert('Too High', 'Amount exceeds total payable'); return; }
    if (needsBank && !selectedBankId) { Alert.alert('Required', 'Select a bank account'); return; }

    let availableBalance = 0;
    let balanceType = '';

    if (selectedMethod === 'cash') {
      availableBalance = businessData?.business?.cash_balance ?? businessData?.cashBalance ?? 0;
      balanceType = 'Cash';
    } else if (selectedBankId) {
      const bank = bankAccounts.find((a: any) => a.id === selectedBankId);
      availableBalance = bank?.current_balance ?? bank?.balance ?? 0;
      balanceType = bank?.bank_name || bank?.bankName || 'Bank';
    }

    if (amount > availableBalance && availableBalance >= 0) {
      const deficit = amount - availableBalance;
      Alert.alert(
        'Insufficient Balance',
        `Your ${balanceType} balance (${formatCurrencyINR(availableBalance)}) is less than the payment amount (${formatCurrencyINR(amount)}). This will result in a negative balance of ${formatCurrencyINR(deficit)}.`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: selectedMethod === 'cash' ? 'Add Cash Balance' : 'Add Bank Balance',
            onPress: () => {
              if (selectedMethod === 'cash') {
                safeRouter.push('/edit-cash-balance' as any);
              } else {
                safeRouter.push('/bank-accounts' as any);
              }
            },
          },
          { text: 'Continue Anyway', style: 'destructive', onPress: () => doCompletePayment(amount) },
        ]
      );
      return;
    }
    doCompletePayment(amount);
  };

  const doCompletePayment = async (amount: number) => {
    setIsProcessing(true);

    const txResult = await recordTransactionForModule({
      module: 'payable',
      referenceId: supplier.id || '',
      paymentMethod: selectedMethod,
      amount,
      bankAccountId: needsBank ? selectedBankId : undefined,
      counterpartyName: supplier.supplierName || supplier.businessName,
      description: `Payment to supplier ${supplier.supplierName || supplier.businessName}`,
    });

    if (!txResult.success) {
      setIsProcessing(false);
      Alert.alert('Error', txResult.error || 'Failed to record payment');
      return;
    }

    if (supplier.invoiceIds && Array.isArray(supplier.invoiceIds)) {
      for (const invId of supplier.invoiceIds) {
        try {
          await updatePurchaseInvoicePayment({
            invoiceId: invId,
            paidAmount: amount,
            paymentMethod: 'none',
            paymentStatus: amount >= supplier.totalPayable ? 'paid' : 'partial',
          });
        } catch (_) {}
      }
    }

    setNavData('payablePaymentResult', {
      supplierId: supplier.id,
      supplierName: supplier.supplierName,
      paymentAmount: amount,
      paymentMethod: selectedMethod,
      isFullPayment: amount === supplier.totalPayable,
      remainingBalance: supplier.totalPayable - amount,
      processedAt: new Date().toISOString(),
    });
    safeRouter.replace({ pathname: '/payables/payment-success' } as any);
    setIsProcessing(false);
  };

  return (
    <View style={s.container}>
      <SafeAreaView style={s.headerArea}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><ArrowLeft size={24} color={C.text} /></TouchableOpacity>
          <Text style={s.headerTitle}>Process Payment</Text>
          <Text style={s.headerAmt}>{fmt(supplier.totalPayable)}</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Supplier Info */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {supplier.supplierType === 'business' ? <Building2 size={22} color={C.primary} /> : <User size={22} color={C.primary} />}
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{supplier.supplierType === 'business' ? supplier.businessName : supplier.supplierName}</Text>
              {supplier.supplierType === 'business' && <Text style={s.cardSub}>Contact: {supplier.supplierName}</Text>}
              <Text style={s.cardSub}>{supplier.mobile}</Text>
            </View>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, alignItems: 'center' }}>
            <Text style={s.cardSub}>Total Payable</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: C.error }}>{fmt(supplier.totalPayable)}</Text>
            {supplier.overdueAmount > 0 && <Text style={{ fontSize: 13, color: C.error, fontWeight: '600' }}>{fmt(supplier.overdueAmount)} overdue</Text>}
          </View>
        </View>

        {/* Amount */}
        <Text style={s.sectionTitle}>Payment Amount</Text>
        <View style={s.toggleRow}>
          <TouchableOpacity style={[s.toggleBtn, isFullAmount && s.toggleActive]} onPress={() => { setIsFullAmount(true); setPaymentAmount(supplier.totalPayable.toString()); }}>
            <Text style={[s.toggleText, isFullAmount && s.toggleTextActive]}>Full Amount</Text>
            <Text style={[s.toggleVal, isFullAmount && s.toggleTextActive]}>{fmt(supplier.totalPayable)}</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[s.toggleBtn, !isFullAmount && s.toggleActive]} onPress={() => { setIsFullAmount(false); setPaymentAmount(''); }}>
            <Text style={[s.toggleText, !isFullAmount && s.toggleTextActive]}>Custom Amount</Text>
          </TouchableOpacity>
        </View>
        {!isFullAmount && (
          <View style={s.amountRow}>
            <Text style={s.rupee}>₹</Text>
            <TextInput style={s.amountInput} value={paymentAmount} onChangeText={handleAmountChange} placeholder="0.00" placeholderTextColor={C.textMuted} keyboardType="decimal-pad" autoFocus />
          </View>
        )}

        {/* Payment Methods */}
        <Text style={s.sectionTitle}>Payment Method</Text>
        {methods.map(m => {
          const Icon = m.icon;
          const sel = selectedMethod === m.method;
          return (
            <TouchableOpacity key={m.method} style={[s.methodCard, sel && s.methodCardActive]} onPress={() => setSelectedMethod(m.method)} activeOpacity={0.7}>
              <View style={[s.methodIcon, sel && s.methodIconActive]}><Icon size={22} color={sel ? C.bg : C.error} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[s.methodTitle, sel && { color: C.error }]}>{m.title}</Text>
                <Text style={s.methodDesc}>{m.desc}</Text>
              </View>
              {sel && <Check size={20} color={C.error} />}
            </TouchableOpacity>
          );
        })}

        {/* Bank Account Selection */}
        {needsBank && (
          <>
            <Text style={s.sectionTitle}>Bank Account</Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setShowBankPicker(true)}>
              <Building2 size={18} color={C.primary} />
              <Text style={{ flex: 1, fontSize: 14, color: C.text, marginLeft: 10 }}>{selectedBank ? getBankLabel(selectedBank) : 'Select bank account'}</Text>
              <ChevronDown size={16} color={C.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {/* Cheque Details */}
        {selectedMethod === 'cheque' && (
          <>
            <Text style={s.sectionTitle}>Cheque Details</Text>
            <TextInput style={s.textField} value={chequeNumber} onChangeText={setChequeNumber} placeholder="Cheque Number" placeholderTextColor={C.textMuted} keyboardType="numeric" />
            <TextInput style={[s.textField, { marginTop: 10 }]} value={chequeDate} onChangeText={(t) => { const c = t.replace(/[^0-9/]/g, ''); if (c.length <= 10) setChequeDate(c); }} placeholder="DD/MM/YYYY" placeholderTextColor={C.textMuted} keyboardType="default" maxLength={10} />
            <TextInput style={[s.textField, { marginTop: 10 }]} value={chequeBankName} onChangeText={setChequeBankName} placeholder="Bank Name on Cheque" placeholderTextColor={C.textMuted} autoCapitalize="words" />
          </>
        )}

        {/* Digital Wallet Picker */}
        {selectedMethod === 'digital_wallet' && digitalWallets.length > 0 && (
          <>
            <Text style={s.sectionTitle}>Select Wallet</Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setShowWalletPicker(true)}>
              <Wallet size={18} color={C.primary} />
              <Text style={{ flex: 1, fontSize: 14, color: C.text, marginLeft: 10 }}>{selectedWallet || 'Select digital wallet'}</Text>
              <ChevronDown size={16} color={C.textMuted} />
            </TouchableOpacity>
          </>
        )}

        {/* Reference */}
        {selectedMethod && selectedMethod !== 'cash' && (
          <>
            <Text style={s.sectionTitle}>Reference Number (Optional)</Text>
            <TextInput style={s.textField} value={referenceNumber} onChangeText={setReferenceNumber} placeholder="UTR / Transaction ID" placeholderTextColor={C.textMuted} />
          </>
        )}

        {/* Summary */}
        <View style={[s.card, { marginTop: 20 }]}>
          <Text style={{ fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 12 }}>Payment Summary</Text>
          <View style={s.sumRow}><Text style={s.sumLabel}>Supplier:</Text><Text style={s.sumVal}>{supplier.supplierType === 'business' ? supplier.businessName : supplier.supplierName}</Text></View>
          <View style={s.sumRow}><Text style={s.sumLabel}>Amount:</Text><Text style={[s.sumVal, { color: C.error }]}>{fmt(parseFloat(paymentAmount) || 0)}</Text></View>
          <View style={s.sumRow}><Text style={s.sumLabel}>Method:</Text><Text style={s.sumVal}>{selectedMethod ? ALL_METHODS.find(m => m.method === selectedMethod)?.title || selectedMethod : 'Not selected'}</Text></View>
          {parseFloat(paymentAmount) < supplier.totalPayable && (
            <View style={[s.sumRow, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 8 }]}>
              <Text style={[s.sumLabel, { fontWeight: '600' }]}>Remaining:</Text>
              <Text style={[s.sumVal, { color: C.warning, fontWeight: '700' }]}>{fmt(supplier.totalPayable - (parseFloat(paymentAmount) || 0))}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={[s.submitBtn, (!selectedMethod || !paymentAmount || isProcessing) && { backgroundColor: '#D1D5DB' }]}
          onPress={handleCompletePayment} disabled={!selectedMethod || !paymentAmount || isProcessing} activeOpacity={0.8}>
          <Text style={s.submitText}>{isProcessing ? 'Processing...' : 'Complete Payment'}</Text>
        </TouchableOpacity>
      </ScrollView>
      </KeyboardAvoidingView>

      {/* Bank Picker Modal */}
      <Modal visible={showBankPicker} transparent animationType="fade" onRequestClose={() => setShowBankPicker(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHead}><Text style={s.modalTitle}>Select Bank Account</Text><TouchableOpacity onPress={() => setShowBankPicker(false)}><X size={22} color={C.textMuted} /></TouchableOpacity></View>
            <ScrollView style={{ maxHeight: 400 }}>
              {bankAccounts.map(a => (
                <TouchableOpacity key={a.id} style={[s.modalItem, selectedBankId === a.id && s.modalItemActive]}
                  onPress={() => { setSelectedBankId(a.id); setShowBankPicker(false); }}>
                  <Building2 size={20} color={C.primary} />
                  <View style={{ flex: 1 }}><Text style={s.modalItemText}>{getBankLabel(a)}</Text></View>
                  {selectedBankId === a.id && <Check size={18} color={C.error} />}
                </TouchableOpacity>
              ))}
              {bankAccounts.length === 0 && <Text style={{ padding: 20, color: C.textMuted, textAlign: 'center' }}>No bank accounts found</Text>}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Wallet Picker Modal */}
      <Modal visible={showWalletPicker} transparent animationType="fade" onRequestClose={() => setShowWalletPicker(false)}>
        <View style={s.overlay}>
          <View style={s.modal}>
            <View style={s.modalHead}><Text style={s.modalTitle}>Select Digital Wallet</Text><TouchableOpacity onPress={() => setShowWalletPicker(false)}><X size={22} color={C.textMuted} /></TouchableOpacity></View>
            <ScrollView style={{ maxHeight: 400 }}>
              {digitalWallets.map(w => (
                <TouchableOpacity key={w} style={[s.modalItem, selectedWallet === w && s.modalItemActive]}
                  onPress={() => { setSelectedWallet(w); setShowWalletPicker(false); }}>
                  <Wallet size={20} color={C.primary} />
                  <View style={{ flex: 1 }}><Text style={s.modalItemText}>{w}</Text></View>
                  {selectedWallet === w && <Check size={18} color={C.error} />}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  headerArea: { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '600', color: C.text },
  headerAmt: { fontSize: 15, fontWeight: '700', color: C.error },

  card: { backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 17, fontWeight: '600', color: C.text, marginBottom: 2 },
  cardSub: { fontSize: 13, color: C.textMuted },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 12, marginTop: 4 },

  toggleRow: { flexDirection: 'row', backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 3, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleActive: { backgroundColor: C.error },
  toggleText: { fontSize: 13, fontWeight: '600', color: C.textMuted, marginBottom: 2 },
  toggleVal: { fontSize: 11, color: C.textMuted },
  toggleTextActive: { color: C.bg },

  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: C.error, borderRadius: 12, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 4, marginBottom: 16 },
  rupee: { fontSize: 18, fontWeight: '700', color: C.error, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', color: C.error, textAlign: 'right', ...Platform.select({ web: { outlineStyle: 'none' as any } }) },

  methodCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 10, gap: 14 },
  methodCardActive: { borderColor: C.error, backgroundColor: '#fef2f2' },
  methodIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fef2f2', justifyContent: 'center', alignItems: 'center' },
  methodIconActive: { backgroundColor: C.error },
  methodTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  methodDesc: { fontSize: 13, color: C.textMuted },

  pickerBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  textField: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 14, color: C.text, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },

  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sumLabel: { fontSize: 13, color: C.textMuted },
  sumVal: { fontSize: 13, fontWeight: '600', color: C.text },

  submitBtn: { backgroundColor: C.error, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20, marginBottom: 32 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modal: { backgroundColor: C.bg, borderRadius: 16, width: '100%', maxWidth: 400 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: 17, fontWeight: '600', color: C.text },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.surfaceAlt },
  modalItemActive: { backgroundColor: C.error + '10' },
  modalItemText: { fontSize: 14, color: C.text },
});
