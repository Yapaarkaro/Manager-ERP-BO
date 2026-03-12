import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Modal,
  Platform,
  KeyboardAvoidingView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  Image as ImageIcon,
  Camera,
  CheckCircle,
  Building,
  Zap,
  Users,
  Package,
  Megaphone,
  Wrench,
  Shield,
  FileSpreadsheet,
  MoreHorizontal,
  Wallet,
  ChevronDown,
  X,
} from 'lucide-react-native';
import { useBusinessData, clearBusinessDataCache } from '@/hooks/useBusinessData';
import { safeRouter } from '@/utils/safeRouter';
import * as ImagePicker from 'expo-image-picker';
import { addBankTransaction, addCashTransaction, getBankAccounts } from '@/services/backendApi';

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

export default function AddExpenseScreen() {
  const { data: businessData } = useBusinessData();
  const [type, setType] = useState('');
  const [customType, setCustomType] = useState('');
  const [amount, setAmount] = useState('');
  const [notes, setNotes] = useState('');
  const [proofImage, setProofImage] = useState('');
  const [paymentAccount, setPaymentAccount] = useState<'cash' | string>('cash');
  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [bankAccounts, setBankAccounts] = useState<any[]>([]);

  useEffect(() => {
    const accts = (businessData.bankAccounts || []).filter((a: any) => (a.type || a.account_type) !== 'cash');
    setBankAccounts(accts);
  }, [businessData]);

  const isCash = paymentAccount === 'cash';
  const selectedBank = bankAccounts.find((a: any) => a.id === paymentAccount);

  const getPaymentLabel = () => {
    if (isCash) return 'Cash';
    if (selectedBank) {
      const name = selectedBank.bank_name || selectedBank.bankName || 'Bank';
      const num = selectedBank.account_number || selectedBank.accountNumber || '';
      return `${name} ••••${num.slice(-4)}`;
    }
    return 'Select Account';
  };

  const isFormValid = () =>
    type.trim().length > 0 &&
    amount.trim().length > 0 &&
    parseFloat(amount) > 0 &&
    (type !== 'other' || customType.trim().length > 0);

  const handleSubmit = async () => {
    if (!isFormValid()) { Alert.alert('Incomplete', 'Please fill required fields'); return; }
    setIsSubmitting(true);

    const desc = type === 'other' ? customType : (expenseTypes.find(t => t.id === type)?.name || type);
    const amt = parseFloat(amount);

    let res;
    if (isCash) {
      res = await addCashTransaction({ type: 'debit', amount: amt, description: `Expense: ${desc}`, category: type, counterpartyName: '', referenceNumber: '' });
    } else {
      res = await addBankTransaction({ bankAccountId: paymentAccount, type: 'debit', amount: amt, description: `Expense: ${desc}`, category: type, paymentMode: 'other', counterpartyName: '', referenceNumber: '' });
    }

    if (res.success) {
      clearBusinessDataCache();
      safeRouter.replace({ pathname: '/expenses/success', params: { expenseData: JSON.stringify({ type, amount, paymentMethod: isCash ? 'Cash' : getPaymentLabel(), notes }) } } as any);
      setIsSubmitting(false);
    } else {
      setIsSubmitting(false);
      Alert.alert('Error', res.error || 'Failed to save expense');
    }
  };

  const handleImageCapture = async () => {
    Alert.alert('Add Proof Image', 'Choose an option', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Take Photo',
        onPress: async () => {
          const { status } = await ImagePicker.requestCameraPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow camera access.');
            return;
          }
          const result = await ImagePicker.launchCameraAsync({ quality: 0.8 });
          if (!result.canceled && result.assets.length > 0) {
            setProofImage(result.assets[0].uri);
          }
        },
      },
      {
        text: 'Choose from Gallery',
        onPress: async () => {
          const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
          if (status !== 'granted') {
            Alert.alert('Permission Required', 'Please allow access to your photo library.');
            return;
          }
          const result = await ImagePicker.launchImageLibraryAsync({
            mediaTypes: ['images'],
            quality: 0.8,
          });
          if (!result.canceled && result.assets.length > 0) {
            setProofImage(result.assets[0].uri);
          }
        },
      },
    ]);
  };

  const getTypeName = (id: string) => expenseTypes.find(t => t.id === id)?.name || 'Select Type';
  const getTypeIcon = (id: string) => expenseTypes.find(t => t.id === id)?.icon || MoreHorizontal;

  return (
    <View style={st.container}>
      <SafeAreaView style={{ flex: 1 }}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <View style={st.header}>
          <TouchableOpacity style={st.backBtn} onPress={() => router.back()}><ArrowLeft size={24} color={Colors.text} /></TouchableOpacity>
          <Text style={st.headerTitle}>Add Expense</Text>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} showsVerticalScrollIndicator={false} keyboardShouldPersistTaps="handled">
          {/* Expense Type */}
          <Text style={st.label}>Expense Type *</Text>
          <TouchableOpacity style={st.dropdown} onPress={() => setShowTypeModal(true)}>
            {type ? (
              <View style={st.dropdownRow}>
                {React.createElement(getTypeIcon(type), { size: 20, color: Colors.textLight })}
                <Text style={st.dropdownText}>{getTypeName(type)}</Text>
              </View>
            ) : (
              <Text style={st.placeholder}>Select expense type</Text>
            )}
            <ChevronDown size={16} color={Colors.textLight} />
          </TouchableOpacity>

          {type === 'other' && (
            <>
              <Text style={st.label}>Specify Type *</Text>
              <TextInput style={st.input} value={customType} onChangeText={setCustomType} placeholder="Enter expense type" placeholderTextColor={Colors.textLight} />
            </>
          )}

          {/* Amount */}
          <Text style={st.label}>Amount *</Text>
          <View style={st.amountRow}>
            <Text style={st.rupee}>₹</Text>
            <TextInput style={st.amountInput} value={amount} onChangeText={t => setAmount(t.replace(/[^0-9.]/g, ''))} placeholder="0.00" placeholderTextColor={Colors.textLight} keyboardType="decimal-pad" />
          </View>

          {/* Payment Account */}
          <Text style={st.label}>Payment Account *</Text>
          <TouchableOpacity style={st.dropdown} onPress={() => setShowAccountModal(true)}>
            <View style={st.dropdownRow}>
              {isCash ? <Wallet size={20} color={Colors.success} /> : <Building size={20} color={Colors.primary} />}
              <Text style={st.dropdownText}>{getPaymentLabel()}</Text>
            </View>
            <ChevronDown size={16} color={Colors.textLight} />
          </TouchableOpacity>

          {/* Notes */}
          <Text style={st.label}>Notes (Optional)</Text>
          <TextInput style={[st.input, { minHeight: 80, textAlignVertical: 'top' }]} value={notes} onChangeText={setNotes} placeholder="Additional notes..." placeholderTextColor={Colors.textLight} multiline />

          {/* Proof Image - hidden for cash */}
          {!isCash && (
            <>
              <Text style={st.label}>Proof Image (Optional)</Text>
              {proofImage ? (
                <View style={{ alignItems: 'center', gap: 8 }}>
                  <View style={st.proofPreview}><ImageIcon size={36} color={Colors.primary} /><Text style={{ color: Colors.textLight, marginTop: 4 }}>Image Captured</Text></View>
                  <TouchableOpacity onPress={() => setProofImage('')} style={st.removeBtn}><Text style={{ color: '#fff', fontWeight: '600' }}>Remove</Text></TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity style={st.captureBtn} onPress={handleImageCapture}>
                  <Camera size={22} color={Colors.primary} />
                  <Text style={{ color: Colors.primary, fontWeight: '600', fontSize: 15 }}>Capture Proof</Text>
                </TouchableOpacity>
              )}
            </>
          )}

          {/* Submit */}
          <TouchableOpacity style={[st.submitBtn, (!isFormValid() || isSubmitting) && { backgroundColor: Colors.grey[300] }]}
            onPress={handleSubmit} disabled={!isFormValid() || isSubmitting} activeOpacity={0.8}>
            <CheckCircle size={20} color="#fff" />
            <Text style={st.submitText}>{isSubmitting ? 'Saving...' : 'Save Expense'}</Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Type Modal */}
        <Modal visible={showTypeModal} transparent animationType="fade" onRequestClose={() => setShowTypeModal(false)}>
          <View style={st.overlay}>
            <View style={st.modal}>
              <View style={st.modalHead}><Text style={st.modalTitle}>Select Expense Type</Text><TouchableOpacity onPress={() => setShowTypeModal(false)}><X size={22} color={Colors.textLight} /></TouchableOpacity></View>
              <ScrollView style={{ maxHeight: 400 }}>
                {expenseTypes.map(t => (
                  <TouchableOpacity key={t.id} style={st.modalItem} onPress={() => { setType(t.id); setShowTypeModal(false); }}>
                    {React.createElement(t.icon, { size: 20, color: Colors.textLight })}
                    <Text style={st.modalItemText}>{t.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Account Modal */}
        <Modal visible={showAccountModal} transparent animationType="fade" onRequestClose={() => setShowAccountModal(false)}>
          <View style={st.overlay}>
            <View style={st.modal}>
              <View style={st.modalHead}><Text style={st.modalTitle}>Select Payment Account</Text><TouchableOpacity onPress={() => setShowAccountModal(false)}><X size={22} color={Colors.textLight} /></TouchableOpacity></View>
              <ScrollView style={{ maxHeight: 400 }}>
                <TouchableOpacity style={[st.modalItem, isCash && st.modalItemActive]} onPress={() => { setPaymentAccount('cash'); setShowAccountModal(false); }}>
                  <Wallet size={20} color={Colors.success} />
                  <Text style={st.modalItemText}>Cash</Text>
                </TouchableOpacity>
                {bankAccounts.map((a: any) => {
                  const name = a.bank_name || a.bankName || 'Bank';
                  const num = a.account_number || a.accountNumber || '';
                  return (
                    <TouchableOpacity key={a.id} style={[st.modalItem, paymentAccount === a.id && st.modalItemActive]}
                      onPress={() => { setPaymentAccount(a.id); setShowAccountModal(false); }}>
                      <Building size={20} color={Colors.primary} />
                      <View style={{ flex: 1 }}>
                        <Text style={st.modalItemText}>{name}</Text>
                        <Text style={{ fontSize: 12, color: Colors.textLight }}>••••{num.slice(-4)}</Text>
                      </View>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          </View>
        </Modal>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const st = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  backBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: Colors.grey[100], justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  label: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 8, marginTop: 18 },
  input: { borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 12, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 10, fontSize: 15, color: Colors.text, backgroundColor: Colors.grey[50], ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  dropdown: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 12, paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.grey[50] },
  dropdownRow: { flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 },
  dropdownText: { fontSize: 15, color: Colors.text },
  placeholder: { fontSize: 15, color: Colors.textLight },
  amountRow: { flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: Colors.grey[200], borderRadius: 12, paddingHorizontal: 16, paddingVertical: Platform.OS === 'ios' ? 14 : 4, backgroundColor: Colors.grey[50] },
  rupee: { fontSize: 18, fontWeight: '700', color: Colors.text, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', color: Colors.text, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  proofPreview: { alignItems: 'center', backgroundColor: Colors.grey[50], borderRadius: 12, borderWidth: 1, borderColor: Colors.grey[200], paddingVertical: 20, width: '100%' },
  removeBtn: { backgroundColor: Colors.error, paddingHorizontal: 16, paddingVertical: 8, borderRadius: 8 },
  captureBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1.5, borderColor: Colors.primary, borderStyle: 'dashed', borderRadius: 12, paddingVertical: 18, gap: 8 },
  submitBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 16, gap: 8, marginTop: 32 },
  submitText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', paddingHorizontal: 20 },
  modal: { backgroundColor: Colors.background, borderRadius: 16, width: '100%', maxWidth: 400 },
  modalHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  modalTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  modalItem: { flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 20, gap: 12, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: Colors.grey[100] },
  modalItemActive: { backgroundColor: Colors.primary + '10' },
  modalItemText: { fontSize: 15, color: Colors.text },
});
