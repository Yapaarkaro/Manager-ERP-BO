import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  ActivityIndicator,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  IndianRupee,
  FileText,
  Building,
  Zap,
  Users,
  Package,
  Megaphone,
  Wrench,
  Shield,
  FileSpreadsheet,
  MoreHorizontal,
  TrendingUp,
  TrendingDown,
  CreditCard,
  Wallet,
  Plus,
  X,
  Check,
} from 'lucide-react-native';
import { useBusinessData, clearBusinessDataCache } from '@/hooks/useBusinessData';
import { addBankTransaction, addCashTransaction, createBankAccount, getBankAccounts } from '@/services/backendApi';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  grey: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB' },
};

const expenseTypes = [
  { id: 'rent', name: 'Rent', icon: Building },
  { id: 'utilities', name: 'Utilities', icon: Zap },
  { id: 'salaries', name: 'Salaries and Wages', icon: Users },
  { id: 'office_supplies', name: 'Office Supplies', icon: Package },
  { id: 'marketing', name: 'Marketing and Advertising', icon: Megaphone },
  { id: 'repairs', name: 'Repairs and Maintenance', icon: Wrench },
  { id: 'insurance', name: 'Insurance', icon: Shield },
  { id: 'taxes', name: 'Taxes & Licenses', icon: FileSpreadsheet },
  { id: 'other', name: 'Other', icon: MoreHorizontal },
];

const incomeTypes = [
  { id: 'sales', name: 'Sales Revenue', icon: TrendingUp },
  { id: 'services', name: 'Service Income', icon: FileText },
  { id: 'investments', name: 'Investment Income', icon: TrendingUp },
  { id: 'rental', name: 'Rental Income', icon: Building },
  { id: 'commission', name: 'Commission', icon: Users },
  { id: 'refunds', name: 'Refunds', icon: TrendingDown },
  { id: 'interest', name: 'Interest Income', icon: TrendingUp },
  { id: 'other', name: 'Other Income', icon: MoreHorizontal },
];

interface BankAccountOption {
  id: string;
  bankName: string;
  accountNumber: string;
  currentBalance: number;
  type?: string;
}

export default function IncomeExpenseToggleScreen() {
  const { data: businessData } = useBusinessData();
  const [mode, setMode] = useState<'income' | 'expense'>('expense');
  const [type, setType] = useState('');
  const [customType, setCustomType] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [counterparty, setCounterparty] = useState('');
  const [referenceNumber, setReferenceNumber] = useState('');
  const [paymentAccount, setPaymentAccount] = useState<'cash' | string>('');
  const [submitting, setSubmitting] = useState(false);

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showCustomTypeModal, setShowCustomTypeModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [showAddBankModal, setShowAddBankModal] = useState(false);

  const [bankAccounts, setBankAccounts] = useState<BankAccountOption[]>([]);
  const [loadingAccounts, setLoadingAccounts] = useState(true);

  // New bank account form
  const [newBankName, setNewBankName] = useState('');
  const [newAccountHolder, setNewAccountHolder] = useState('');
  const [newAccountNumber, setNewAccountNumber] = useState('');
  const [newIfsc, setNewIfsc] = useState('');
  const [newAccountType, setNewAccountType] = useState<'Savings' | 'Current'>('Savings');
  const [newInitialBalance, setNewInitialBalance] = useState('');
  const [addingBank, setAddingBank] = useState(false);

  useEffect(() => {
    loadBankAccounts();
  }, []);

  const loadBankAccounts = async () => {
    setLoadingAccounts(true);
    try {
      const result = await getBankAccounts();
      if (result.success && result.accounts) {
        setBankAccounts(
          result.accounts
            .filter((a: any) => !a.is_deleted && a.type !== 'cash')
            .map((a: any) => ({
              id: a.id,
              bankName: a.bank_name || 'Unknown Bank',
              accountNumber: a.account_number || '',
              currentBalance: Number(a.current_balance) || 0,
              type: a.type,
            }))
        );
      }
    } catch {}
    setLoadingAccounts(false);
  };

  const currentTypes = mode === 'income' ? incomeTypes : expenseTypes;

  const getTypeName = (typeId: string) => {
    if (typeId === 'other' && customType) return customType;
    const t = currentTypes.find(x => x.id === typeId);
    return t?.name || 'Other';
  };

  const getTypeIcon = (typeId: string) => {
    const t = currentTypes.find(x => x.id === typeId);
    return t?.icon || MoreHorizontal;
  };

  const getAccountLabel = () => {
    if (paymentAccount === 'cash') return 'Cash';
    const acc = bankAccounts.find(a => a.id === paymentAccount);
    if (acc) return `${acc.bankName} (****${acc.accountNumber.slice(-4)})`;
    return '';
  };

  const isFormValid = () => type && amount && Number(amount) > 0 && paymentAccount;

  const handleSubmit = async () => {
    const { canPerformAction } = require('@/utils/trialUtils');
    if (!canPerformAction(`add ${mode}`)) return;

    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in type, amount, and payment account.');
      return;
    }

    setSubmitting(true);
    try {
      const txType = mode === 'income' ? 'credit' : 'debit';
      const desc = `${mode === 'income' ? 'Income' : 'Expense'}: ${getTypeName(type)}${notes ? ' - ' + notes : ''}`;
      const txAmount = Number(amount);

      let result;
      if (paymentAccount === 'cash') {
        result = await addCashTransaction({
          type: txType,
          amount: txAmount,
          description: desc,
          category: type === 'other' ? customType : type,
          counterpartyName: counterparty,
          referenceNumber,
        });
      } else {
        result = await addBankTransaction({
          bankAccountId: paymentAccount,
          type: txType,
          amount: txAmount,
          description: desc,
          category: type === 'other' ? customType : type,
          counterpartyName: counterparty,
          referenceNumber,
        });
      }

      if (result.success) {
        clearBusinessDataCache();
        Alert.alert('Success', `${mode === 'income' ? 'Income' : 'Expense'} of \u20B9${txAmount.toLocaleString('en-IN')} recorded successfully`, [
          { text: 'OK', onPress: () => router.back() },
        ]);
      } else {
        Alert.alert('Error', result.error || 'Failed to record transaction. Please try again.');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleAddBankAccount = async () => {
    if (!newBankName.trim() || !newAccountHolder.trim() || !newAccountNumber.trim() || !newIfsc.trim()) {
      Alert.alert('Incomplete', 'Please fill in all required bank details.');
      return;
    }
    setAddingBank(true);
    try {
      const result = await createBankAccount({
        bankName: newBankName.trim(),
        accountHolderName: newAccountHolder.trim(),
        accountNumber: newAccountNumber.trim(),
        ifscCode: newIfsc.trim(),
        accountType: newAccountType,
        initialBalance: Number(newInitialBalance) || 0,
      });
      if (result.success && result.account) {
        const newAcc: BankAccountOption = {
          id: result.account.id,
          bankName: newBankName.trim(),
          accountNumber: newAccountNumber.trim(),
          currentBalance: Number(newInitialBalance) || 0,
        };
        setBankAccounts(prev => [...prev, newAcc]);
        setPaymentAccount(result.account.id);
        setShowAddBankModal(false);
        setShowAccountModal(false);
        resetBankForm();
        Alert.alert('Success', 'Bank account added successfully!');
      } else {
        Alert.alert('Error', result.error || 'Failed to add bank account');
      }
    } catch (e: any) {
      Alert.alert('Error', e.message || 'Failed to add bank account');
    } finally {
      setAddingBank(false);
    }
  };

  const resetBankForm = () => {
    setNewBankName('');
    setNewAccountHolder('');
    setNewAccountNumber('');
    setNewIfsc('');
    setNewAccountType('Savings');
    setNewInitialBalance('');
  };

  const headerBg = mode === 'income' ? Colors.success : Colors.error;

  return (
    <View style={st.container}>
      <SafeAreaView style={[st.headerSafe, { backgroundColor: headerBg }]}>
        <View style={[st.header, { backgroundColor: headerBg }]}>
          <TouchableOpacity onPress={() => router.back()} style={st.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={24} color="#FFF" />
          </TouchableOpacity>
          <Text style={st.headerTitle}>Add {mode === 'income' ? 'Income' : 'Expense'}</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={[st.toggleWrap, { backgroundColor: headerBg }]}>
          <View style={st.toggleRow}>
            <TouchableOpacity style={[st.toggleBtn, mode === 'income' && st.toggleBtnIncomeActive]} onPress={() => setMode('income')} activeOpacity={0.7}>
              <TrendingUp size={18} color={mode === 'income' ? '#FFF' : Colors.success} />
              <Text style={[st.toggleText, mode === 'income' && st.toggleTextActive]}>Income</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[st.toggleBtn, mode === 'expense' && st.toggleBtnExpenseActive]} onPress={() => setMode('expense')} activeOpacity={0.7}>
              <TrendingDown size={18} color={mode === 'expense' ? '#FFF' : Colors.error} />
              <Text style={[st.toggleText, mode === 'expense' && st.toggleTextActive]}>Expense</Text>
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      <ScrollView style={{ flex: 1 }} contentContainerStyle={st.scrollContent} showsVerticalScrollIndicator={false}>
        {/* Type */}
        <View style={st.section}>
          <Text style={st.label}>{mode === 'income' ? 'Income' : 'Expense'} Type *</Text>
          <TouchableOpacity style={st.selectField} onPress={() => setShowTypeModal(true)} activeOpacity={0.7}>
            {type ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {React.createElement(getTypeIcon(type), { size: 20, color: Colors.primary })}
                <Text style={st.selectedText}>{getTypeName(type)}</Text>
              </View>
            ) : (
              <Text style={st.placeholder}>Select {mode} type</Text>
            )}
            <ArrowLeft size={20} color={Colors.textLight} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={st.section}>
          <Text style={st.label}>Amount *</Text>
          <View style={st.amountRow}>
            <IndianRupee size={20} color={Colors.textLight} />
            <TextInput style={st.amountInput} placeholder="0.00" value={amount} onChangeText={setAmount} keyboardType="numeric" placeholderTextColor={Colors.textLight} />
          </View>
        </View>

        {/* Payment Account */}
        <View style={st.section}>
          <Text style={st.label}>Payment Account *</Text>
          <TouchableOpacity style={st.selectField} onPress={() => setShowAccountModal(true)} activeOpacity={0.7}>
            {paymentAccount ? (
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                {paymentAccount === 'cash' ? <Wallet size={20} color={Colors.success} /> : <CreditCard size={20} color={Colors.primary} />}
                <Text style={st.selectedText}>{getAccountLabel()}</Text>
              </View>
            ) : (
              <Text style={st.placeholder}>Select bank account or cash</Text>
            )}
            <ArrowLeft size={20} color={Colors.textLight} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        </View>

        {/* Counterparty */}
        <View style={st.section}>
          <Text style={st.label}>{mode === 'income' ? 'Received From' : 'Paid To'}</Text>
          <TextInput style={st.textField} placeholder={mode === 'income' ? 'e.g., Customer name' : 'e.g., Vendor name'} value={counterparty} onChangeText={setCounterparty} placeholderTextColor={Colors.textLight} />
        </View>

        {/* Reference */}
        <View style={st.section}>
          <Text style={st.label}>Reference Number</Text>
          <TextInput style={st.textField} placeholder="e.g., Invoice #, Receipt #" value={referenceNumber} onChangeText={setReferenceNumber} placeholderTextColor={Colors.textLight} />
        </View>

        {/* Notes */}
        <View style={st.section}>
          <Text style={st.label}>Notes</Text>
          <TextInput style={[st.textField, { minHeight: 80, textAlignVertical: 'top' }]} placeholder="Add notes (optional)" value={notes} onChangeText={setNotes} multiline numberOfLines={3} placeholderTextColor={Colors.textLight} />
        </View>

        {/* Submit */}
        <TouchableOpacity
          style={[st.submitBtn, !isFormValid() && st.submitBtnDisabled]}
          onPress={handleSubmit}
          disabled={!isFormValid() || submitting}
          activeOpacity={0.8}
        >
          {submitting ? (
            <ActivityIndicator color="#FFF" />
          ) : (
            <Text style={st.submitText}>Record {mode === 'income' ? 'Income' : 'Expense'}</Text>
          )}
        </TouchableOpacity>
      </ScrollView>

      {/* Type Modal */}
      {showTypeModal && (
        <View style={st.overlay}>
          <View style={st.modalContent}>
            <View style={st.modalHead}>
              <Text style={st.modalTitle}>Select {mode === 'income' ? 'Income' : 'Expense'} Type</Text>
              <TouchableOpacity onPress={() => setShowTypeModal(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
            </View>
            <ScrollView style={st.modalScroll}>
              {currentTypes.map(t => {
                const IC = t.icon;
                return (
                  <TouchableOpacity key={t.id} style={st.optionRow} onPress={() => { if (t.id === 'other') { setShowCustomTypeModal(true); setShowTypeModal(false); } else { setType(t.id); setShowTypeModal(false); } }} activeOpacity={0.7}>
                    <IC size={24} color={Colors.primary} />
                    <Text style={st.optionText}>{t.name}</Text>
                    {type === t.id && <Check size={20} color={Colors.primary} />}
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Custom Type Modal */}
      {showCustomTypeModal && (
        <View style={st.overlay}>
          <View style={st.modalContent}>
            <View style={st.modalHead}>
              <Text style={st.modalTitle}>Custom {mode === 'income' ? 'Income' : 'Expense'} Type</Text>
              <TouchableOpacity onPress={() => setShowCustomTypeModal(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              <TextInput style={st.textField} placeholder={`e.g., ${mode === 'income' ? 'Freelance Work' : 'Office Cleaning'}`} value={customType} onChangeText={setCustomType} placeholderTextColor={Colors.textLight} autoFocus />
              <TouchableOpacity style={[st.submitBtn, !customType.trim() && st.submitBtnDisabled, { marginTop: 16 }]} disabled={!customType.trim()} onPress={() => { setType('other'); setShowCustomTypeModal(false); }} activeOpacity={0.8}>
                <Text style={st.submitText}>Save</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      )}

      {/* Account Selection Modal */}
      <Modal visible={showAccountModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAccountModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={st.modalHead}>
            <Text style={st.modalTitle}>Select Payment Account</Text>
            <TouchableOpacity onPress={() => setShowAccountModal(false)}><X size={24} color={Colors.text} /></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }}>
            {/* Cash option */}
            <TouchableOpacity style={[st.accountCard, paymentAccount === 'cash' && st.accountCardActive]} onPress={() => { setPaymentAccount('cash'); setShowAccountModal(false); }} activeOpacity={0.7}>
              <View style={[st.accountIcon, { backgroundColor: '#ECFDF5' }]}><Wallet size={20} color={Colors.success} /></View>
              <View style={{ flex: 1 }}>
                <Text style={st.accountName}>Cash</Text>
                <Text style={st.accountSub}>Cash on hand</Text>
              </View>
              {paymentAccount === 'cash' && <Check size={20} color={Colors.primary} />}
            </TouchableOpacity>

            {/* Bank accounts */}
            {loadingAccounts ? (
              <ActivityIndicator color={Colors.primary} style={{ marginVertical: 20 }} />
            ) : (
              bankAccounts.map(acc => (
                <TouchableOpacity key={acc.id} style={[st.accountCard, paymentAccount === acc.id && st.accountCardActive]} onPress={() => { setPaymentAccount(acc.id); setShowAccountModal(false); }} activeOpacity={0.7}>
                  <View style={[st.accountIcon, { backgroundColor: '#EBF0F8' }]}><CreditCard size={20} color={Colors.primary} /></View>
                  <View style={{ flex: 1 }}>
                    <Text style={st.accountName}>{acc.bankName}</Text>
                    <Text style={st.accountSub}>****{acc.accountNumber.slice(-4)} {'\u00B7'} Bal: {'\u20B9'}{acc.currentBalance.toLocaleString('en-IN')}</Text>
                  </View>
                  {paymentAccount === acc.id && <Check size={20} color={Colors.primary} />}
                </TouchableOpacity>
              ))
            )}

            {/* Add new bank */}
            <TouchableOpacity style={st.addBankBtn} onPress={() => setShowAddBankModal(true)} activeOpacity={0.7}>
              <Plus size={20} color={Colors.primary} />
              <Text style={st.addBankText}>Add New Bank Account</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* Add Bank Account Modal */}
      <Modal visible={showAddBankModal} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddBankModal(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: Colors.background }}>
          <View style={st.modalHead}>
            <Text style={st.modalTitle}>Add Bank Account</Text>
            <TouchableOpacity onPress={() => { setShowAddBankModal(false); resetBankForm(); }}><X size={24} color={Colors.text} /></TouchableOpacity>
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16 }} keyboardShouldPersistTaps="handled">
            <View style={st.section}>
              <Text style={st.label}>Bank Name *</Text>
              <TextInput style={st.textField} placeholder="e.g., State Bank of India" value={newBankName} onChangeText={setNewBankName} placeholderTextColor={Colors.textLight} />
            </View>
            <View style={st.section}>
              <Text style={st.label}>Account Holder Name *</Text>
              <TextInput style={st.textField} placeholder="Name as per bank records" value={newAccountHolder} onChangeText={setNewAccountHolder} placeholderTextColor={Colors.textLight} />
            </View>
            <View style={st.section}>
              <Text style={st.label}>Account Number *</Text>
              <TextInput style={st.textField} placeholder="Account number" value={newAccountNumber} onChangeText={setNewAccountNumber} keyboardType="numeric" placeholderTextColor={Colors.textLight} />
            </View>
            <View style={st.section}>
              <Text style={st.label}>IFSC Code *</Text>
              <TextInput style={st.textField} placeholder="e.g., SBIN0001234" value={newIfsc} onChangeText={setNewIfsc} autoCapitalize="characters" placeholderTextColor={Colors.textLight} />
            </View>
            <View style={st.section}>
              <Text style={st.label}>Account Type</Text>
              <View style={{ flexDirection: 'row', gap: 10 }}>
                {(['Savings', 'Current'] as const).map(t => (
                  <TouchableOpacity key={t} style={[st.chipBtn, newAccountType === t && st.chipBtnActive]} onPress={() => setNewAccountType(t)} activeOpacity={0.7}>
                    <Text style={[st.chipText, newAccountType === t && st.chipTextActive]}>{t}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
            <View style={st.section}>
              <Text style={st.label}>Opening Balance</Text>
              <View style={st.amountRow}>
                <IndianRupee size={20} color={Colors.textLight} />
                <TextInput style={st.amountInput} placeholder="0.00" value={newInitialBalance} onChangeText={setNewInitialBalance} keyboardType="numeric" placeholderTextColor={Colors.textLight} />
              </View>
            </View>
            <TouchableOpacity style={[st.submitBtn, { marginTop: 8 }]} onPress={handleAddBankAccount} disabled={addingBank} activeOpacity={0.8}>
              {addingBank ? <ActivityIndicator color="#FFF" /> : <Text style={st.submitText}>Add Bank Account</Text>}
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  headerSafe: { borderBottomWidth: 0 },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 6 },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: '#FFF' },
  toggleWrap: { paddingHorizontal: 16, paddingVertical: 6 },
  toggleRow: { flexDirection: 'row', backgroundColor: Colors.grey[100], borderRadius: 20, padding: 4, overflow: 'hidden' },
  toggleBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', paddingVertical: 12, borderRadius: 16, gap: 6 },
  toggleBtnIncomeActive: { backgroundColor: Colors.success },
  toggleBtnExpenseActive: { backgroundColor: Colors.error },
  toggleText: { fontSize: 14, fontWeight: '600', color: Colors.textLight },
  toggleTextActive: { color: '#FFF', fontWeight: '700' },

  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8 },
  selectField: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14 },
  selectedText: { fontSize: 16, color: Colors.text, fontWeight: '500' },
  placeholder: { fontSize: 16, color: Colors.textLight },
  textField: { borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, fontSize: 16, color: Colors.text },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, gap: 8 },
  amountInput: { flex: 1, fontSize: 18, fontWeight: '600', color: Colors.text },

  submitBtn: { backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, alignItems: 'center' },
  submitBtnDisabled: { backgroundColor: Colors.grey[300] },
  submitText: { color: '#FFF', fontSize: 16, fontWeight: '600' },

  overlay: { position: 'absolute', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end', zIndex: 1000 },
  modalContent: { backgroundColor: Colors.background, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '70%' },
  modalHead: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  modalScroll: { paddingHorizontal: 20, paddingVertical: 8 },
  optionRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.grey[100], gap: 12 },
  optionText: { flex: 1, fontSize: 16, color: Colors.text, fontWeight: '500' },

  accountCard: { flexDirection: 'row', alignItems: 'center', padding: 14, borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 12, marginBottom: 10, gap: 12 },
  accountCardActive: { borderColor: Colors.primary, backgroundColor: '#F0F4FA' },
  accountIcon: { width: 40, height: 40, borderRadius: 10, justifyContent: 'center', alignItems: 'center' },
  accountName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  accountSub: { fontSize: 12, color: Colors.textLight, marginTop: 2 },

  addBankBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', padding: 16, borderWidth: 2, borderColor: Colors.primary, borderRadius: 12, borderStyle: 'dashed', marginTop: 4, gap: 8 },
  addBankText: { fontSize: 15, fontWeight: '600', color: Colors.primary },

  chipBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, borderWidth: 1, borderColor: Colors.grey[200], backgroundColor: Colors.grey[50] },
  chipBtnActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  chipText: { fontSize: 14, fontWeight: '500', color: Colors.text },
  chipTextActive: { color: '#FFF' },
});
