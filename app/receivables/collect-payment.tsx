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
  Wallet,
  ChevronDown,
} from 'lucide-react-native';
import { useBusinessData } from '@/hooks/useBusinessData';
import { recordTransactionForModule, updateInvoicePayment } from '@/services/backendApi';
import { formatCurrencyINR } from '@/utils/formatters';
import { consumeNavData } from '@/utils/navStore';

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

type PaymentMethod = 'cash' | 'upi' | 'card' | 'bank_transfer' | 'cheque';

const METHODS: { method: PaymentMethod; icon: any; title: string; desc: string }[] = [
  { method: 'cash', icon: Banknote, title: 'Cash', desc: 'Receive cash payment' },
  { method: 'upi', icon: Smartphone, title: 'UPI', desc: 'Receive UPI payment' },
  { method: 'card', icon: CreditCard, title: 'Card', desc: 'Receive card payment' },
  { method: 'bank_transfer', icon: Building2, title: 'Bank Transfer', desc: 'Receive bank transfer' },
];

export default function CollectPaymentScreen() {
  const { customerData: paramCustomerData } = useLocalSearchParams();
  const navCustomer = consumeNavData('collectPaymentCustomer');
  const customer = navCustomer || JSON.parse(paramCustomerData as string);
  const { data: businessData } = useBusinessData();

  const [paymentAmount, setPaymentAmount] = useState(customer.totalReceivable.toString());
  const [isFullAmount, setIsFullAmount] = useState(true);
  const [selectedMethod, setSelectedMethod] = useState<PaymentMethod | null>(null);
  const [selectedBankId, setSelectedBankId] = useState<string>('');
  const [showBankPicker, setShowBankPicker] = useState(false);
  const [referenceNumber, setReferenceNumber] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  useEffect(() => {
    const accts = (businessData.bankAccounts || []).filter((a: any) => (a.type || a.account_type) !== 'cash');
    setBankAccounts(accts);
    if (accts.length > 0) {
      const primary = accts.find((a: any) => a.is_primary || a.isPrimary);
      setSelectedBankId(primary?.id || accts[0].id);
    }
  }, [businessData]);

  const isCash = selectedMethod === 'cash';
  const needsBank = selectedMethod && !isCash;
  const selectedBank = bankAccounts.find(a => a.id === selectedBankId);
  const getBankLabel = (a: any) => `${a.bank_name || a.bankName || 'Bank'} ••••${(a.account_number || a.accountNumber || '').slice(-4)}`;

  const fmt = (n: number) => formatCurrencyINR(n);

  const handleAmountChange = (text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    if (cleaned.split('.').length > 2) return;
    setPaymentAmount(cleaned);
    setIsFullAmount(parseFloat(cleaned) === customer.totalReceivable);
  };

  const handleCompletePayment = async () => {
    if (!selectedMethod) { Alert.alert('Required', 'Select a payment method'); return; }
    const amount = parseFloat(paymentAmount);
    if (!amount || amount <= 0) { Alert.alert('Invalid', 'Enter a valid amount'); return; }
    if (amount > customer.totalReceivable) { Alert.alert('Too High', 'Amount exceeds total receivable'); return; }
    if (needsBank && !selectedBankId) { Alert.alert('Required', 'Select a bank account'); return; }

    setIsProcessing(true);

    const txResult = await recordTransactionForModule({
      module: 'receivable',
      referenceId: customer.id || '',
      paymentMethod: selectedMethod,
      amount,
      bankAccountId: needsBank ? selectedBankId : undefined,
      counterpartyName: customer.customerName || customer.businessName,
      description: `Payment received from ${customer.customerName || customer.businessName}`,
    });

    if (!txResult.success) {
      setIsProcessing(false);
      Alert.alert('Error', txResult.error || 'Failed to record payment');
      return;
    }

    if (customer.invoiceIds && Array.isArray(customer.invoiceIds)) {
      let remaining = amount;
      for (const invId of customer.invoiceIds) {
        if (remaining <= 0) break;
        await updateInvoicePayment(invId, { paidAmount: remaining, paymentMethod: 'none' });
        remaining = 0;
      }
    }

    setNavData('receivablePaymentResult', {
      customerId: customer.id,
      customerName: customer.customerName,
      paymentAmount: amount,
      paymentMethod: selectedMethod,
      isFullPayment: amount === customer.totalReceivable,
      remainingBalance: customer.totalReceivable - amount,
      processedAt: new Date().toISOString(),
    });
    safeRouter.replace({ pathname: '/receivables/payment-success' } as any);
    setIsProcessing(false);
  };

  return (
    <View style={s.container}>
      <SafeAreaView style={s.headerArea}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn}><ArrowLeft size={24} color={C.text} /></TouchableOpacity>
          <Text style={s.headerTitle}>Collect Payment</Text>
          <Text style={s.headerAmt}>{fmt(customer.totalReceivable)}</Text>
        </View>
      </SafeAreaView>

      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
      <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
        {/* Customer Info */}
        <View style={s.card}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 }}>
            {customer.customerType === 'business' ? <Building2 size={22} color={C.primary} /> : <User size={22} color={C.primary} />}
            <View style={{ flex: 1 }}>
              <Text style={s.cardTitle}>{customer.customerType === 'business' ? customer.businessName : customer.customerName}</Text>
              {customer.customerType === 'business' && <Text style={s.cardSub}>Contact: {customer.customerName}</Text>}
              <Text style={s.cardSub}>{customer.mobile}</Text>
            </View>
          </View>
          <View style={{ borderTopWidth: 1, borderTopColor: C.border, paddingTop: 12, alignItems: 'center' }}>
            <Text style={s.cardSub}>Total Receivable</Text>
            <Text style={{ fontSize: 24, fontWeight: '700', color: C.success }}>{fmt(customer.totalReceivable)}</Text>
            {customer.overdueAmount > 0 && <Text style={{ fontSize: 13, color: C.error, fontWeight: '600' }}>{fmt(customer.overdueAmount)} overdue</Text>}
          </View>
        </View>

        {/* Amount */}
        <Text style={s.sectionTitle}>Payment Amount</Text>
        <View style={s.toggleRow}>
          <TouchableOpacity style={[s.toggleBtn, isFullAmount && s.toggleActive]} onPress={() => { setIsFullAmount(true); setPaymentAmount(customer.totalReceivable.toString()); }}>
            <Text style={[s.toggleText, isFullAmount && s.toggleTextActive]}>Full Amount</Text>
            <Text style={[s.toggleVal, isFullAmount && s.toggleTextActive]}>{fmt(customer.totalReceivable)}</Text>
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
        {METHODS.map(m => {
          const Icon = m.icon;
          const sel = selectedMethod === m.method;
          return (
            <TouchableOpacity key={m.method} style={[s.methodCard, sel && s.methodCardActive]} onPress={() => setSelectedMethod(m.method)} activeOpacity={0.7}>
              <View style={[s.methodIcon, sel && s.methodIconActive]}><Icon size={22} color={sel ? C.bg : C.success} /></View>
              <View style={{ flex: 1 }}>
                <Text style={[s.methodTitle, sel && { color: C.success }]}>{m.title}</Text>
                <Text style={s.methodDesc}>{m.desc}</Text>
              </View>
              {sel && <Check size={20} color={C.success} />}
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
          <View style={s.sumRow}><Text style={s.sumLabel}>Customer:</Text><Text style={s.sumVal}>{customer.customerType === 'business' ? customer.businessName : customer.customerName}</Text></View>
          <View style={s.sumRow}><Text style={s.sumLabel}>Amount:</Text><Text style={[s.sumVal, { color: C.success }]}>{fmt(parseFloat(paymentAmount) || 0)}</Text></View>
          <View style={s.sumRow}><Text style={s.sumLabel}>Method:</Text><Text style={s.sumVal}>{selectedMethod ? METHODS.find(m => m.method === selectedMethod)?.title || selectedMethod : 'Not selected'}</Text></View>
          {parseFloat(paymentAmount) < customer.totalReceivable && (
            <View style={[s.sumRow, { borderTopWidth: 1, borderTopColor: C.border, paddingTop: 8, marginTop: 8 }]}>
              <Text style={[s.sumLabel, { fontWeight: '600' }]}>Remaining:</Text>
              <Text style={[s.sumVal, { color: C.warning, fontWeight: '700' }]}>{fmt(customer.totalReceivable - (parseFloat(paymentAmount) || 0))}</Text>
            </View>
          )}
        </View>

        <TouchableOpacity style={[s.submitBtn, (!selectedMethod || !paymentAmount || isProcessing) && { backgroundColor: '#D1D5DB' }]}
          onPress={handleCompletePayment} disabled={!selectedMethod || !paymentAmount || isProcessing} activeOpacity={0.8}>
          <Text style={s.submitText}>{isProcessing ? 'Processing...' : 'Complete Payment Collection'}</Text>
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
                  {selectedBankId === a.id && <Check size={18} color={C.success} />}
                </TouchableOpacity>
              ))}
              {bankAccounts.length === 0 && <Text style={{ padding: 20, color: C.textMuted, textAlign: 'center' }}>No bank accounts found</Text>}
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
  headerAmt: { fontSize: 15, fontWeight: '700', color: C.success },

  card: { backgroundColor: C.surface, borderRadius: 12, padding: 16, marginBottom: 20, borderWidth: 1, borderColor: C.border },
  cardTitle: { fontSize: 17, fontWeight: '600', color: C.text, marginBottom: 2 },
  cardSub: { fontSize: 13, color: C.textMuted },

  sectionTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 12, marginTop: 4 },

  toggleRow: { flexDirection: 'row', backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 3, marginBottom: 12 },
  toggleBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  toggleActive: { backgroundColor: C.success },
  toggleText: { fontSize: 13, fontWeight: '600', color: C.textMuted, marginBottom: 2 },
  toggleVal: { fontSize: 11, color: C.textMuted },
  toggleTextActive: { color: C.bg },

  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: C.success, borderRadius: 12, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 12 : 4, marginBottom: 16 },
  rupee: { fontSize: 18, fontWeight: '700', color: C.success, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', color: C.success, textAlign: 'right', ...Platform.select({ web: { outlineStyle: 'none' as any } }) },

  methodCard: { flexDirection: 'row', alignItems: 'center', borderWidth: 2, borderColor: C.border, borderRadius: 12, padding: 14, marginBottom: 10, gap: 14 },
  methodCardActive: { borderColor: C.success, backgroundColor: '#f0fdf4' },
  methodIcon: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#f0fdf4', justifyContent: 'center', alignItems: 'center' },
  methodIconActive: { backgroundColor: C.success },
  methodTitle: { fontSize: 15, fontWeight: '600', color: C.text, marginBottom: 2 },
  methodDesc: { fontSize: 13, color: C.textMuted },

  pickerBtn: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12, marginBottom: 12 },
  textField: { borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10, fontSize: 14, color: C.text, marginBottom: 12, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },

  sumRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  sumLabel: { fontSize: 13, color: C.textMuted },
  sumVal: { fontSize: 13, fontWeight: '600', color: C.text },

  submitBtn: { backgroundColor: C.success, borderRadius: 12, paddingVertical: 16, alignItems: 'center', marginTop: 20, marginBottom: 32 },
  submitText: { color: '#fff', fontSize: 17, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modal: { backgroundColor: C.bg, borderRadius: 16, width: '100%', maxWidth: 400 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: C.border },
  modalTitle: { fontSize: 17, fontWeight: '600', color: C.text },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.surfaceAlt },
  modalItemActive: { backgroundColor: C.success + '10' },
  modalItemText: { fontSize: 14, color: C.text },
});
