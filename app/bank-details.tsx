import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  SafeAreaView,
  TextInput,
  Modal,
  Alert,
  Platform,
  ActivityIndicator,
  ScrollView,
  RefreshControl,
} from 'react-native';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { ArrowLeft, Building2, Plus, Search, X, ChevronDown, ArrowDownLeft, ArrowUpRight, FileText, Check, Receipt, Edit3, Trash2 } from 'lucide-react-native';
import { BankAccount } from '@/utils/dataStore';
import { useBusinessData } from '@/hooks/useBusinessData';
import { getBankTransactions, addBankTransaction, invalidateApiCache, clearBankTransaction, deleteBankTransaction, createInAppNotification } from '@/services/backendApi';
import { onTransactionChange } from '@/utils/transactionEvents';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import { safeRouter } from '@/utils/safeRouter';
import { setNavData } from '@/utils/navStore';
import ExportModal from '@/components/ExportModal';
import DateFilterBar, { TimeRange, filterByDateRange } from '@/components/DateFilterBar';
import { formatCurrencyINR, formatIndianNumber } from '@/utils/formatters';

const C = {
  bg: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  primary: '#3f66ac',
  primaryBg: '#EFF3FB',
  success: '#059669',
  successBg: '#ECFDF5',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  warning: '#D97706',
  warningBg: '#FFFBEB',
  border: '#E5E7EB',
  surface: '#F9FAFB',
  surfaceAlt: '#F3F4F6',
  divider: '#F3F4F6',
};

type PaymentSource = 'UPI' | 'Card' | 'Cheque' | 'Cash' | 'Bank Transfer' | 'NEFT' | 'RTGS' | 'IMPS' | 'Other';

interface BankTransaction {
  id: string;
  bankAccountId: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  reference: string;
  category: string;
  transactionNumber: string;
  source: PaymentSource;
  relatedInvoiceId?: string;
  relatedCustomerId?: string;
  relatedSupplierId?: string;
  createdAt: string;
  counterpartyName?: string;
  chequeNumber?: string;
  chequeDate?: string;
  isCleared?: boolean;
  clearanceDate?: string;
  bounceReason?: string;
  notes?: string;
}

const PAYMENT_MODES: { label: string; value: PaymentSource }[] = [
  { label: 'UPI', value: 'UPI' }, { label: 'Card', value: 'Card' },
  { label: 'Bank Transfer', value: 'Bank Transfer' }, { label: 'Cheque', value: 'Cheque' },
  { label: 'Cash', value: 'Cash' }, { label: 'NEFT', value: 'NEFT' },
  { label: 'RTGS', value: 'RTGS' }, { label: 'IMPS', value: 'IMPS' }, { label: 'Other', value: 'Other' },
];
const CATEGORIES = ['Sales', 'Purchase', 'Salary', 'Rent', 'Utilities', 'Loan', 'Interest', 'Transfer', 'General', 'Other'];

const fmt = (n: number) => formatCurrencyINR(n, 2, 0);
const fmtDec = (n: number) => formatCurrencyINR(n);

function fmtDateLabel(ds: string) {
  const d = new Date(ds);
  const today = new Date();
  const yest = new Date(); yest.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yest.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function mapTx(t: any): BankTransaction {
  return {
    id: t.id, bankAccountId: t.bank_account_id, type: t.type,
    amount: parseFloat(t.amount) || 0, description: t.description || '',
    date: t.date || t.transaction_date || t.created_at,
    reference: t.reference || t.reference_number || '', category: t.category || '',
    transactionNumber: t.transaction_number || '',
    source: t.source || t.payment_mode || 'Other',
    relatedInvoiceId: t.related_invoice_id || t.reference_id,
    relatedCustomerId: t.related_customer_id, relatedSupplierId: t.related_supplier_id,
    createdAt: t.created_at || '', counterpartyName: t.counterparty_name || '',
    chequeNumber: t.cheque_number || '', chequeDate: t.cheque_date || null,
    isCleared: t.is_cleared ?? true, clearanceDate: t.clearance_date || null,
    bounceReason: t.bounce_reason || null, notes: t.notes || '',
  };
}

export default function BankDetailsScreen() {
  const { bankAccountId } = useLocalSearchParams();
  const { data: businessData } = useBusinessData();
  const [bankAccount, setBankAccount] = useState<BankAccount | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [transactions, setTransactions] = useState<BankTransaction[]>([]);
  const [currentBalance, setCurrentBalance] = useState(0);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');
  const [showUnclearedCheques, setShowUnclearedCheques] = useState(false);
  const [showChequeConfirmation, setShowChequeConfirmation] = useState(false);
  const [selectedTransaction, setSelectedTransaction] = useState<BankTransaction | null>(null);
  const [chequeAction, setChequeAction] = useState<'clear' | 'bounce' | null>(null);
  const [clearanceDate, setClearanceDate] = useState('');
  const [bounceReason, setBounceReason] = useState('');
  const [notifyCustomer, setNotifyCustomer] = useState(false);

  const [showAddTx, setShowAddTx] = useState(false);
  const [txType, setTxType] = useState<'credit' | 'debit'>('credit');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txCategory, setTxCategory] = useState('General');
  const [txPaymentMode, setTxPaymentMode] = useState<PaymentSource>('Other');
  const [txReference, setTxReference] = useState('');
  const [txCounterparty, setTxCounterparty] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txSaving, setTxSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [showModePicker, setShowModePicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => { loadBankAccount(); }, [bankAccountId]);
  useFocusEffect(useCallback(() => { if (bankAccount) loadTransactions(); }, [bankAccount, bankAccountId]));

  const txMountedRef = useRef(true);
  useEffect(() => {
    txMountedRef.current = true;
    const unsub = onTransactionChange(() => {
      if (txMountedRef.current && bankAccountId) { loadBankAccount(); loadSilent(); }
    });
    return () => { txMountedRef.current = false; unsub(); };
  }, [bankAccountId]);

  const loadSilent = async () => {
    if (!bankAccountId) return;
    try {
      const r = await getBankTransactions(bankAccountId as string);
      if (txMountedRef.current && r.success) setTransactions((r.transactions || []).map(mapTx));
    } catch { /* silent */ }
  };

  const loadBankAccount = () => {
    if (bankAccountId) {
      const found = (businessData.bankAccounts || []).find((a: any) => a.id === bankAccountId);
      if (found) {
        setBankAccount({
          id: found.id,
          accountHolderName: found.account_holder_name ?? found.accountHolderName ?? '',
          bankName: found.bank_name ?? found.bankName ?? '',
          bankId: found.bank_id ?? found.bankId ?? '',
          bankShortName: found.bank_short_name ?? found.bankShortName ?? '',
          accountNumber: found.account_number ?? found.accountNumber ?? '',
          ifscCode: found.ifsc_code ?? found.ifscCode ?? '',
          upiId: found.upi_id ?? found.upiId ?? '',
          accountType: found.account_type ?? found.accountType ?? 'Savings',
          isPrimary: found.is_primary ?? found.isPrimary ?? false,
          initialBalance: found.initial_balance ?? found.initialBalance ?? 0,
          balance: found.current_balance ?? found.balance ?? found.initial_balance ?? found.initialBalance ?? 0,
          createdAt: found.created_at ?? found.createdAt ?? '',
        });
      } else {
        setBankAccount(null);
      }
    }
    setIsLoading(false);
  };

  const loadTransactions = async () => {
    if (!bankAccountId) return;
    try {
      const r = await getBankTransactions(bankAccountId as string);
      const mapped = (r.transactions || []).map(mapTx);
      setTransactions(mapped);
      const ob = bankAccount?.initialBalance || bankAccount?.balance || 0;
      const tc = mapped.filter((t: BankTransaction) => t.type === 'credit' && (t.source !== 'Cheque' || t.isCleared)).reduce((s: number, t: BankTransaction) => s + t.amount, 0);
      const td = mapped.filter((t: BankTransaction) => t.type === 'debit' && (t.source !== 'Cheque' || t.isCleared)).reduce((s: number, t: BankTransaction) => s + t.amount, 0);
      setCurrentBalance(ob + tc - td);
    } catch {
      setTransactions([]);
      setCurrentBalance(bankAccount?.balance || 0);
    }
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    Promise.all([loadBankAccount(), loadTransactions()]).catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, [bankAccountId, bankAccount]);

  const filtered = useMemo(() => {
    let result = transactions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.description.toLowerCase().includes(q) || t.amount.toString().includes(q) ||
        t.reference.toLowerCase().includes(q) || t.category.toLowerCase().includes(q) ||
        (t.source || '').toLowerCase().includes(q) || (t.counterpartyName || '').toLowerCase().includes(q)
      );
    }
    result = filterByDateRange(result, (t) => t.date, selectedTimeRange, customFromDate, customToDate);
    return result;
  }, [transactions, searchQuery, selectedTimeRange, customFromDate, customToDate]);

  const grouped = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sections: { title: string; data: BankTransaction[] }[] = [];
    for (const t of sorted) {
      const key = new Date(t.date).toDateString();
      const last = sections[sections.length - 1];
      if (last && last.title === key) last.data.push(t);
      else sections.push({ title: key, data: [t] });
    }
    return sections;
  }, [filtered]);

  const totalCredit = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalDebit = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const unclearedCheques = transactions.filter(t => t.source === 'Cheque' && !t.isCleared);

  const maskAccNum = (n: string) => n.length > 4 ? '•••• ' + n.slice(-4) : n;

  const handleTxPress = (t: BankTransaction) => {
    const cat = (t.category || '').toLowerCase();
    if (cat === 'return' && t.relatedInvoiceId) {
      safeRouter.push({ pathname: '/return-details', params: { returnId: t.relatedInvoiceId } });
    } else if (cat === 'purchase_invoice' && t.relatedInvoiceId) {
      safeRouter.push({ pathname: '/purchasing/invoice-details', params: { invoiceId: t.relatedInvoiceId } });
    } else if (t.relatedInvoiceId && !t.relatedCustomerId && !t.relatedSupplierId) {
      safeRouter.push({ pathname: '/invoice-details', params: { invoiceId: t.relatedInvoiceId } });
    } else {
      setNavData('transactionData', t);
      safeRouter.push({ pathname: '/transaction-details', params: { transactionId: t.id, bankAccountId: bankAccountId as string, transactionType: 'bank' } });
    }
  };

  const handleQuickClearCheque = (t: BankTransaction) => {
    setSelectedTransaction(t); setChequeAction('clear');
    setClearanceDate(new Date().toISOString().split('T')[0]); setShowChequeConfirmation(true);
  };
  const handleQuickBounceCheque = (t: BankTransaction) => {
    setSelectedTransaction(t); setChequeAction('bounce');
    setBounceReason(''); setNotifyCustomer(false); setShowChequeConfirmation(true);
  };
  const handleConfirmChequeAction = async () => {
    if (!selectedTransaction || !chequeAction) return;
    const bizId = businessData?.business?.id;
    const counterparty = selectedTransaction.counterpartyName || selectedTransaction.counterparty_name || '';
    if (chequeAction === 'clear') {
      if (!clearanceDate) { Alert.alert('Error', 'Please select a clearance date.'); return; }
      try {
        const r = await clearBankTransaction(selectedTransaction.id, clearanceDate);
        if (r.success) {
          loadTransactions();
          Alert.alert('Success', 'Cheque cleared successfully!');
          if (notifyCustomer && bizId) {
            createInAppNotification({
              businessId: bizId,
              recipientId: 'owner',
              recipientType: 'owner',
              title: 'Cheque Cleared',
              message: `Cheque from ${counterparty} for ${formatCurrencyINR(selectedTransaction.amount || 0)} has been cleared.`,
              type: 'info',
              category: 'payment',
            }).catch(() => {});
          }
        }
        else Alert.alert('Error', 'Failed to clear cheque.');
      } catch { Alert.alert('Error', 'Failed to clear cheque.'); }
    } else {
      if (!bounceReason.trim()) { Alert.alert('Error', 'Please provide a reason.'); return; }
      try {
        const r = await deleteBankTransaction(selectedTransaction.id);
        if (r.success) {
          loadTransactions();
          Alert.alert('Success', 'Cheque bounced.');
          if (notifyCustomer && bizId) {
            createInAppNotification({
              businessId: bizId,
              recipientId: 'owner',
              recipientType: 'owner',
              title: 'Cheque Bounced',
              message: `Cheque from ${counterparty} for ${formatCurrencyINR(selectedTransaction.amount || 0)} has bounced. Reason: ${bounceReason.trim()}`,
              type: 'warning',
              category: 'payment',
            }).catch(() => {});
          }
        }
        else Alert.alert('Error', 'Failed to bounce cheque.');
      } catch { Alert.alert('Error', 'Failed to bounce cheque.'); }
    }
    closeChequeModal();
  };
  const closeChequeModal = () => {
    setShowChequeConfirmation(false); setSelectedTransaction(null);
    setChequeAction(null); setClearanceDate(''); setBounceReason(''); setNotifyCustomer(false);
  };

  const resetTxForm = () => {
    setTxType('credit'); setTxAmount(''); setTxDescription(''); setTxCategory('General');
    setTxPaymentMode('Other'); setTxReference(''); setTxCounterparty('');
    setTxDate(new Date().toISOString().split('T')[0]); setTxSaving(false);
  };
  const handleSave = async () => {
    const amt = parseFloat(txAmount);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    if (!txDescription.trim()) { Alert.alert('Error', 'Enter a description'); return; }
    setTxSaving(true);
    const res = await addBankTransaction({
      bankAccountId: bankAccountId as string, type: txType, amount: amt,
      description: txDescription.trim(), category: txCategory, paymentMode: txPaymentMode,
      referenceNumber: txReference.trim(), counterpartyName: txCounterparty.trim(),
      transactionDate: new Date(txDate).toISOString(),
    });
    setTxSaving(false);
    if (res.success) {
      Alert.alert('Success', 'Transaction added');
      setShowAddTx(false); resetTxForm(); loadTransactions();
    } else Alert.alert('Error', res.error || 'Failed to add transaction');
  };

  const renderTxItem = (t: BankTransaction) => {
    const isCredit = t.type === 'credit';
    const isUncleared = t.source === 'Cheque' && !t.isCleared;
    return (
      <TouchableOpacity
        key={t.id}
        style={[s.txRow, isUncleared && s.txRowUncleared]}
        onPress={() => handleTxPress(t)}
        activeOpacity={0.6}
      >
        <View style={[s.txIcon, { backgroundColor: isCredit ? C.successBg : C.errorBg }]}>
          {isCredit ? <ArrowDownLeft size={16} color={C.success} /> : <ArrowUpRight size={16} color={C.error} />}
        </View>
        <View style={s.txInfo}>
          <Text style={s.txDesc} numberOfLines={1}>{t.description}</Text>
          <View style={s.txMeta}>
            <Text style={s.txTime}>{new Date(t.date).toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' })}</Text>
            {t.source !== 'Other' && <View style={s.txSourcePill}><Text style={s.txSourceText}>{t.source}</Text></View>}
            {isUncleared && <View style={s.txUnclearedPill}><Text style={s.txUnclearedText}>Pending</Text></View>}
          </View>
          {t.counterpartyName ? <Text style={s.txCounterparty} numberOfLines={1}>{t.counterpartyName}</Text> : null}
        </View>
        <Text style={[s.txAmount, { color: isCredit ? C.success : C.error }]}>
          {isCredit ? '+' : '-'}{fmt(t.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSection = (section: { title: string; data: BankTransaction[] }) => (
    <View key={section.title}>
      <Text style={s.sectionDate}>{fmtDateLabel(section.data[0].date)}</Text>
      {section.data.map(t => renderTxItem(t))}
    </View>
  );

  const handleEditBank = () => {
    if (!bankAccount) return;
    setNavData('editBankAccount', {
      ...bankAccount,
      bankCode: bankAccount.bankShortName || bankAccount.bankId,
    });
    safeRouter.push({
      pathname: '/add-bank-account',
      params: {
        returnTo: 'bank-details',
        bankAccountId: String(bankAccount.id),
      },
    } as any);
  };

  const handleDeleteBank = () => {
    if (!bankAccount) return;
    Alert.alert('Delete Bank Account', 'Are you sure? This cannot be undone.', [
      { text: 'Cancel', style: 'cancel' },
      { text: 'Delete', style: 'destructive', onPress: async () => {
        const { supabase } = await import('@/lib/supabase');
        const { error } = await supabase.from('bank_accounts').delete().eq('id', bankAccount.id);
        if (!error) {
          invalidateApiCache('bankAccounts');
          Alert.alert('Deleted', 'Bank account deleted');
          router.back();
        } else {
          Alert.alert('Error', error.message);
        }
      }},
    ]);
  };

  if (isLoading) return (
    <View style={s.container}>
      <SafeAreaView style={s.headerArea}><View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}><ArrowLeft size={22} color={C.text} /></TouchableOpacity>
        <Text style={s.headerTitle}>Account Statement</Text><View style={s.headerBtn} />
      </View></SafeAreaView>
      <View style={s.loadingWrap}><ActivityIndicator size="small" color={C.primary} /><Text style={s.loadingText}>Loading...</Text></View>
    </View>
  );

  if (!bankAccount) return (
    <View style={s.container}>
      <SafeAreaView style={s.headerArea}><View style={s.header}>
        <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}><ArrowLeft size={22} color={C.text} /></TouchableOpacity>
        <Text style={s.headerTitle}>Account Statement</Text><View style={s.headerBtn} />
      </View></SafeAreaView>
      <View style={s.loadingWrap}><Building2 size={40} color={C.border} /><Text style={s.emptyTitle}>Bank account not found</Text></View>
    </View>
  );

  return (
    <View style={s.container}>
      <SafeAreaView style={s.headerArea}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}><ArrowLeft size={22} color={C.text} /></TouchableOpacity>
          <Text style={s.headerTitle}>Account Statement</Text>
          <TouchableOpacity onPress={handleEditBank} style={s.headerBtn}><Edit3 size={18} color={C.primary} /></TouchableOpacity>
          <TouchableOpacity onPress={handleDeleteBank} style={s.headerBtn}><Trash2 size={18} color="#DC2626" /></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowExportModal(true)} style={s.headerBtn}><FileText size={20} color={C.primary} /></TouchableOpacity>
          <TouchableOpacity onPress={() => setShowSearch(!showSearch)} style={s.headerBtn}><Search size={20} color={C.primary} /></TouchableOpacity>
        </View>
      </SafeAreaView>

      {showSearch && (
        <View style={s.searchBar}>
          <Search size={16} color={C.textMuted} />
          <TextInput style={s.searchInput} value={searchQuery} onChangeText={setSearchQuery}
            placeholder="Search transactions..." placeholderTextColor={C.textLight} autoCapitalize="none" autoCorrect={false} autoFocus />
          {searchQuery.length > 0 && <TouchableOpacity onPress={() => setSearchQuery('')}><X size={16} color={C.textMuted} /></TouchableOpacity>}
        </View>
      )}

      <DateFilterBar
        selectedRange={selectedTimeRange}
        onRangeChange={setSelectedTimeRange}
        customFromDate={customFromDate}
        customToDate={customToDate}
        onCustomFromChange={setCustomFromDate}
        onCustomToChange={setCustomToDate}
      />

      {/* Account Card */}
      <View style={s.acctCard}>
        <View style={s.acctTop}>
          <View style={s.acctIconWrap}><Building2 size={18} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.acctName}>{bankAccount.bankName}</Text>
            <Text style={s.acctNum}>A/C: {maskAccNum(bankAccount.accountNumber)} {bankAccount.accountType ? `• ${bankAccount.accountType}` : ''}</Text>
          </View>
        </View>
        <View style={s.acctBalWrap}>
          <Text style={s.acctBalLabel}>Current Balance</Text>
          <Text style={s.acctBalVal}>{fmtDec(currentBalance)}</Text>
        </View>
        <View style={s.acctStats}>
          <View style={s.acctStat}>
            <Text style={s.acctStatLabel}>Opening</Text>
            <Text style={s.acctStatVal}>{fmt(bankAccount.initialBalance || bankAccount.balance || 0)}</Text>
          </View>
          <View style={s.acctStatSep} />
          <View style={s.acctStat}>
            <Text style={s.acctStatLabel}>Credit</Text>
            <Text style={[s.acctStatVal, { color: '#34D399' }]}>+{fmt(totalCredit)}</Text>
          </View>
          <View style={s.acctStatSep} />
          <View style={s.acctStat}>
            <Text style={s.acctStatLabel}>Debit</Text>
            <Text style={[s.acctStatVal, { color: '#FCA5A5' }]}>-{fmt(totalDebit)}</Text>
          </View>
        </View>
      </View>

      {unclearedCheques.length > 0 && (
        <TouchableOpacity style={s.unclearedBanner} onPress={() => setShowUnclearedCheques(true)}>
          <Receipt size={16} color={C.warning} />
          <Text style={s.unclearedBannerText}>{unclearedCheques.length} uncleared cheque{unclearedCheques.length > 1 ? 's' : ''}</Text>
          <ChevronDown size={16} color={C.warning} />
        </TouchableOpacity>
      )}

      {/* Transaction List */}
      {grouped.length === 0 ? (
        <View style={s.emptyWrap}>
          <FileText size={40} color={C.border} />
          <Text style={s.emptyTitle}>{searchQuery ? 'No matching transactions' : 'No Transactions Yet'}</Text>
          <Text style={s.emptySub}>{searchQuery ? 'Try different search terms' : 'Tap the button below to add a transaction'}</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => renderSection(item)}
          style={{ flex: 1 }}
          contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 80 }}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {/* Bottom Add Button */}
      <View style={s.bottomBar}>
        <TouchableOpacity style={s.addBtn} onPress={() => { resetTxForm(); setShowAddTx(true); }} activeOpacity={0.8}>
          <Plus size={20} color="#fff" />
          <Text style={s.addBtnText}>Add Transaction</Text>
        </TouchableOpacity>
      </View>

      {/* ===== Add Transaction Modal ===== */}
      <Modal visible={showAddTx} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddTx(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={s.modalHead}>
            <TouchableOpacity onPress={() => setShowAddTx(false)}><X size={24} color={C.text} /></TouchableOpacity>
            <Text style={s.modalTitle}>Add Transaction</Text>
            <View style={{ width: 24 }} />
          </View>
          <ScrollView style={{ flex: 1 }} contentContainerStyle={{ padding: 16, paddingBottom: 40 }} keyboardShouldPersistTaps="handled">
            <View style={s.typeToggle}>
              <TouchableOpacity style={[s.typeBtn, txType === 'credit' && s.typeBtnCredit]} onPress={() => setTxType('credit')}>
                <Text style={[s.typeBtnText, txType === 'credit' && { color: '#fff' }]}>Credit (In)</Text>
              </TouchableOpacity>
              <TouchableOpacity style={[s.typeBtn, txType === 'debit' && s.typeBtnDebit]} onPress={() => setTxType('debit')}>
                <Text style={[s.typeBtnText, txType === 'debit' && { color: '#fff' }]}>Debit (Out)</Text>
              </TouchableOpacity>
            </View>

            <Text style={s.fieldLabel}>Amount *</Text>
            <View style={s.amountRow}>
              <Text style={s.rupee}>₹</Text>
              <TextInput style={s.amountInput} value={txAmount} onChangeText={setTxAmount}
                placeholder="0.00" placeholderTextColor={C.textLight} keyboardType="decimal-pad" />
            </View>

            <Text style={s.fieldLabel}>Description *</Text>
            <TextInput style={s.textField} value={txDescription} onChangeText={setTxDescription}
              placeholder="e.g., Payment from ABC Ltd" placeholderTextColor={C.textLight} />

            <Text style={s.fieldLabel}>Counterparty Name</Text>
            <TextInput style={s.textField} value={txCounterparty} onChangeText={setTxCounterparty}
              placeholder="e.g., Customer / Supplier name" placeholderTextColor={C.textLight} />

            <Text style={s.fieldLabel}>Category</Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setShowCategoryPicker(!showCategoryPicker)}>
              <Text style={s.pickerVal}>{txCategory}</Text>
              <ChevronDown size={16} color={C.textMuted} />
            </TouchableOpacity>
            {showCategoryPicker && (
              <View style={s.pickerList}>
                {CATEGORIES.map(cat => (
                  <TouchableOpacity key={cat} style={[s.pickerItem, txCategory === cat && s.pickerItemActive]}
                    onPress={() => { setTxCategory(cat); setShowCategoryPicker(false); }}>
                    <Text style={[s.pickerItemText, txCategory === cat && { color: C.primary, fontWeight: '600' }]}>{cat}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.fieldLabel}>Payment Mode</Text>
            <TouchableOpacity style={s.pickerBtn} onPress={() => setShowModePicker(!showModePicker)}>
              <Text style={s.pickerVal}>{txPaymentMode}</Text>
              <ChevronDown size={16} color={C.textMuted} />
            </TouchableOpacity>
            {showModePicker && (
              <View style={s.pickerList}>
                {PAYMENT_MODES.map(m => (
                  <TouchableOpacity key={m.value} style={[s.pickerItem, txPaymentMode === m.value && s.pickerItemActive]}
                    onPress={() => { setTxPaymentMode(m.value); setShowModePicker(false); }}>
                    <Text style={[s.pickerItemText, txPaymentMode === m.value && { color: C.primary, fontWeight: '600' }]}>{m.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            )}

            <Text style={s.fieldLabel}>Reference Number</Text>
            <TextInput style={s.textField} value={txReference} onChangeText={setTxReference}
              placeholder="e.g., UTR / Cheque No." placeholderTextColor={C.textLight} />

            <DateInputWithPicker
              label="Transaction Date"
              value={txDate}
              onChangeDate={setTxDate}
              maximumDate={new Date()}
            />

            <TouchableOpacity style={[s.saveBtn, txSaving && { opacity: 0.6 }]} onPress={handleSave} disabled={txSaving} activeOpacity={0.8}>
              <Text style={s.saveBtnText}>{txSaving ? 'Saving...' : 'Save Transaction'}</Text>
            </TouchableOpacity>
          </ScrollView>
        </SafeAreaView>
      </Modal>

      {/* ===== Uncleared Cheques Modal ===== */}
      <Modal visible={showUnclearedCheques} transparent animationType="slide" onRequestClose={() => setShowUnclearedCheques(false)}>
        <View style={s.overlay}>
          <View style={s.sheetModal}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>Uncleared Cheques ({unclearedCheques.length})</Text>
              <TouchableOpacity onPress={() => setShowUnclearedCheques(false)}><X size={24} color={C.textMuted} /></TouchableOpacity>
            </View>
            <ScrollView style={{ maxHeight: 400 }}>
              {unclearedCheques.map(ch => (
                <View key={ch.id} style={s.chequeCard}>
                  <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 8 }}>
                    <Text style={{ fontWeight: '600', color: C.text, flex: 1 }}>{ch.description}</Text>
                    <Text style={{ fontWeight: '700', color: ch.type === 'credit' ? C.success : C.error }}>{ch.type === 'credit' ? '+' : '-'}{fmt(ch.amount)}</Text>
                  </View>
                  {ch.chequeNumber && <Text style={s.chequeDetail}>Cheque #: {ch.chequeNumber}</Text>}
                  {ch.chequeDate && <Text style={s.chequeDetail}>Date: {fmtDateLabel(ch.chequeDate)}</Text>}
                  <View style={{ flexDirection: 'row', gap: 8, marginTop: 10 }}>
                    <TouchableOpacity style={[s.inlineClearBtn, { flex: 1, justifyContent: 'center' }]}
                      onPress={() => { setShowUnclearedCheques(false); handleQuickClearCheque(ch); }}>
                      <Check size={14} color="#fff" /><Text style={s.inlineBtnText}> Clear</Text>
                    </TouchableOpacity>
                    <TouchableOpacity style={[s.inlineBounceBtn, { flex: 1, justifyContent: 'center' }]}
                      onPress={() => { setShowUnclearedCheques(false); handleQuickBounceCheque(ch); }}>
                      <X size={14} color="#fff" /><Text style={s.inlineBtnText}> Bounce</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* ===== Cheque Confirmation Modal ===== */}
      <Modal visible={showChequeConfirmation} transparent animationType="fade" onRequestClose={closeChequeModal}>
        <View style={s.overlay}>
          <View style={s.sheetModal}>
            <View style={s.sheetHead}>
              <Text style={s.sheetTitle}>{chequeAction === 'clear' ? 'Clear Cheque' : 'Bounce Cheque'}</Text>
              <TouchableOpacity onPress={closeChequeModal}><X size={24} color={C.textMuted} /></TouchableOpacity>
            </View>
            <View style={{ padding: 20 }}>
              {selectedTransaction && (
                <View style={s.chequeCard}>
                  <Text style={{ fontWeight: '600', color: C.text, marginBottom: 4 }}>{selectedTransaction.description}</Text>
                  <Text style={s.chequeDetail}>Amount: {fmtDec(selectedTransaction.amount)}</Text>
                  {selectedTransaction.chequeNumber && <Text style={s.chequeDetail}>Cheque #: {selectedTransaction.chequeNumber}</Text>}
                </View>
              )}
              {chequeAction === 'clear' && (
                <View style={{ marginTop: 16 }}>
                  <DateInputWithPicker
                    label="Clearance Date *"
                    value={clearanceDate}
                    onChangeDate={setClearanceDate}
                    maximumDate={new Date()}
                  />
                </View>
              )}
              {chequeAction === 'bounce' && (
                <View style={{ marginTop: 16 }}>
                  <Text style={s.fieldLabel}>Reason for Bounce *</Text>
                  <TextInput style={[s.textField, { minHeight: 70, textAlignVertical: 'top' }]} value={bounceReason} onChangeText={setBounceReason}
                    placeholder="e.g., Insufficient funds" placeholderTextColor={C.textLight} multiline />
                  <TouchableOpacity style={s.notifyRow} onPress={() => setNotifyCustomer(!notifyCustomer)}>
                    <View style={[s.checkbox, notifyCustomer && s.checkboxChecked]}>{notifyCustomer && <Check size={14} color="#fff" />}</View>
                    <Text style={{ color: C.text, fontSize: 14 }}>Notify Customer/Supplier</Text>
                  </TouchableOpacity>
                </View>
              )}
              <View style={{ flexDirection: 'row', gap: 12, marginTop: 20 }}>
                <TouchableOpacity style={[s.cancelBtn, { flex: 1 }]} onPress={closeChequeModal}>
                  <Text style={{ color: C.text, fontWeight: '500', textAlign: 'center' }}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[s.saveBtn, { flex: 2, backgroundColor: chequeAction === 'clear' ? C.success : C.error, marginTop: 0 }]}
                  onPress={handleConfirmChequeAction}
                  disabled={(chequeAction === 'clear' && !clearanceDate) || (chequeAction === 'bounce' && !bounceReason.trim())}>
                  <Text style={s.saveBtnText}>{chequeAction === 'clear' ? 'Clear Cheque' : 'Bounce Cheque'}</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        config={{
          title: `Bank Statement - ${bankAccount?.bankName || ''}`,
          fileName: 'bank_statement',
          columns: [
            { key: 'date', header: 'Date' },
            { key: 'description', header: 'Description' },
            { key: 'type', header: 'Type', format: (v) => v === 'credit' ? 'Credit' : 'Debit' },
            { key: 'amount', header: 'Amount (₹)', format: (v) => formatIndianNumber(v || 0, 2, 2) },
            { key: 'source', header: 'Source' },
            { key: 'reference', header: 'Reference' },
            { key: 'counterpartyName', header: 'Counterparty' },
            { key: 'category', header: 'Category' },
          ],
          data: filtered,
          summaryRows: [
            { label: 'Total Credits', value: formatCurrencyINR(filtered.filter(t => t.type === 'credit').reduce((s, t) => s + (t.amount || 0), 0)) },
            { label: 'Total Debits', value: formatCurrencyINR(filtered.filter(t => t.type === 'debit').reduce((s, t) => s + (t.amount || 0), 0)) },
          ],
        }}
      />
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },

  headerArea: { backgroundColor: C.bg, borderBottomWidth: 1, borderBottomColor: C.border },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 10 },
  headerBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 17, fontWeight: '700', color: C.text },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 4, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: Platform.OS === 'ios' ? 0 : 6, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },

  acctCard: {
    margin: 16, marginBottom: 8, backgroundColor: C.primary, borderRadius: 16, padding: 18,
    ...Platform.select({ ios: { shadowColor: C.primary, shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 6 } }),
  },
  acctTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 12 },
  acctIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  acctName: { fontSize: 16, fontWeight: '700', color: '#fff' },
  acctNum: { fontSize: 12, color: 'rgba(255,255,255,0.75)', marginTop: 2 },
  acctBalWrap: { alignItems: 'center', marginBottom: 14 },
  acctBalLabel: { fontSize: 11, color: 'rgba(255,255,255,0.65)', marginBottom: 2 },
  acctBalVal: { fontSize: 28, fontWeight: '800', color: '#fff', letterSpacing: -0.5 },
  acctStats: { flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 10, paddingVertical: 10 },
  acctStat: { flex: 1, alignItems: 'center' },
  acctStatSep: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  acctStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  acctStatVal: { fontSize: 13, fontWeight: '700', color: '#fff' },

  unclearedBanner: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginBottom: 4,
    backgroundColor: C.warningBg, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 10, gap: 8,
    borderWidth: 1, borderColor: '#FDE68A',
  },
  unclearedBannerText: { flex: 1, fontSize: 13, color: C.warning, fontWeight: '500' },

  sectionDate: {
    fontSize: 12, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.4, marginTop: 18, marginBottom: 8, paddingHorizontal: 4,
  },

  txRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider,
  },
  txRowUncleared: { backgroundColor: '#FFFEF5', borderRadius: 8, paddingHorizontal: 4, marginHorizontal: -4 },
  txIcon: { width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  txInfo: { flex: 1, marginRight: 12 },
  txDesc: { fontSize: 14, fontWeight: '500', color: C.text, marginBottom: 3 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap' },
  txTime: { fontSize: 12, color: C.textLight },
  txSourcePill: { backgroundColor: C.primaryBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  txSourceText: { fontSize: 10, fontWeight: '600', color: C.primary, textTransform: 'uppercase' },
  txUnclearedPill: { backgroundColor: C.warningBg, borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1, borderWidth: 1, borderColor: '#FDE68A' },
  txUnclearedText: { fontSize: 10, fontWeight: '600', color: C.warning },
  txCounterparty: { fontSize: 12, color: C.textLight, marginTop: 2 },
  txAmount: { fontSize: 15, fontWeight: '700', textAlign: 'right', minWidth: 80 },

  loadingWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', gap: 10 },
  loadingText: { fontSize: 13, color: C.textMuted },
  emptyWrap: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 32 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginTop: 14, marginBottom: 6 },
  emptySub: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20 },

  bottomBar: {
    paddingHorizontal: 16, paddingVertical: 10, paddingBottom: Platform.OS === 'ios' ? 28 : 14,
    backgroundColor: C.bg, borderTopWidth: 1, borderTopColor: C.border,
  },
  addBtn: {
    backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

  overlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'flex-end' },
  sheetModal: { backgroundColor: C.bg, borderTopLeftRadius: 20, borderTopRightRadius: 20, maxHeight: '80%' },
  sheetHead: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: C.border },
  sheetTitle: { fontSize: 18, fontWeight: '700', color: C.text },

  modalHead: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 14, borderBottomWidth: 1, borderBottomColor: C.border,
  },
  modalTitle: { fontSize: 17, fontWeight: '700', color: C.text },

  typeToggle: { flexDirection: 'row', backgroundColor: C.surfaceAlt, borderRadius: 10, padding: 3, marginBottom: 20 },
  typeBtn: { flex: 1, paddingVertical: 10, borderRadius: 8, alignItems: 'center' },
  typeBtnCredit: { backgroundColor: C.success },
  typeBtnDebit: { backgroundColor: C.error },
  typeBtnText: { fontSize: 13, fontWeight: '600', color: C.textMuted },

  fieldLabel: { fontSize: 13, fontWeight: '600', color: C.text, marginBottom: 6, marginTop: 14 },
  amountRow: {
    flexDirection: 'row', alignItems: 'center', borderWidth: 1.5, borderColor: C.border,
    borderRadius: 10, paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 4,
  },
  rupee: { fontSize: 18, fontWeight: '700', color: C.text, marginRight: 8 },
  amountInput: { flex: 1, fontSize: 20, fontWeight: '700', color: C.text, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },
  textField: {
    borderWidth: 1, borderColor: C.border, borderRadius: 10,
    paddingHorizontal: 14, paddingVertical: Platform.OS === 'ios' ? 12 : 10,
    fontSize: 14, color: C.text, backgroundColor: C.bg,
    ...Platform.select({ web: { outlineStyle: 'none' as any } }),
  },

  pickerBtn: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    borderWidth: 1, borderColor: C.border, borderRadius: 10, paddingHorizontal: 14, paddingVertical: 12,
  },
  pickerVal: { fontSize: 14, color: C.text },
  pickerList: { borderWidth: 1, borderColor: C.border, borderRadius: 10, marginTop: 4, backgroundColor: C.bg, overflow: 'hidden' },
  pickerItem: { paddingVertical: 10, paddingHorizontal: 14, borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.border },
  pickerItemActive: { backgroundColor: C.primaryBg },
  pickerItemText: { fontSize: 14, color: C.text },

  saveBtn: { backgroundColor: C.primary, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  cancelBtn: { borderRadius: 12, paddingVertical: 14, alignItems: 'center', backgroundColor: C.surfaceAlt },

  chequeCard: { backgroundColor: C.surface, borderRadius: 10, padding: 14, borderWidth: 1, borderColor: C.border, marginBottom: 12 },
  chequeDetail: { fontSize: 13, color: C.textMuted, marginBottom: 2 },
  inlineClearBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.success, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, gap: 4 },
  inlineBounceBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: C.error, paddingVertical: 8, paddingHorizontal: 14, borderRadius: 8, gap: 4 },
  inlineBtnText: { fontSize: 13, color: '#fff', fontWeight: '600' },

  notifyRow: { flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 12, padding: 12, backgroundColor: C.surface, borderRadius: 8 },
  checkbox: { width: 20, height: 20, borderWidth: 2, borderColor: C.border, borderRadius: 4, alignItems: 'center', justifyContent: 'center' },
  checkboxChecked: { backgroundColor: C.primary, borderColor: C.primary },
});
