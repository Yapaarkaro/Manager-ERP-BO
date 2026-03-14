import React, { useState, useMemo, useCallback, useEffect, useRef } from 'react';
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
  RefreshControl,
} from 'react-native';
import { router, useFocusEffect } from 'expo-router';
import { ArrowLeft, Wallet, Plus, Search, X, ChevronDown, ArrowDownLeft, ArrowUpRight, FileText } from 'lucide-react-native';
import { useBusinessData } from '@/hooks/useBusinessData';
import { addCashTransaction, getCashTransactions, invalidateApiCache } from '@/services/backendApi';
import { onTransactionChange } from '@/utils/transactionEvents';
import DateInputWithPicker from '@/components/DateInputWithPicker';
import { safeRouter } from '@/utils/safeRouter';
import { setNavData } from '@/utils/navStore';
import ExportModal from '@/components/ExportModal';
import DateFilterBar, { TimeRange, filterByDateRange } from '@/components/DateFilterBar';
import { formatIndianNumber, formatCurrencyINR } from '@/utils/formatters';

const C = {
  bg: '#FFFFFF',
  text: '#1F2937',
  textMuted: '#6B7280',
  textLight: '#9CA3AF',
  primary: '#3f66ac',
  success: '#059669',
  successBg: '#ECFDF5',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  border: '#E5E7EB',
  surface: '#F9FAFB',
  surfaceAlt: '#F3F4F6',
  divider: '#F3F4F6',
};

interface CashTransaction {
  id: string;
  type: 'credit' | 'debit';
  amount: number;
  description: string;
  date: string;
  category: string;
  referenceNumber: string;
  counterpartyName: string;
  createdAt: string;
  referenceType: string;
  referenceId: string;
  relatedInvoiceId: string;
  notes: string;
}

const CATEGORIES = ['Sales', 'Purchase', 'Salary', 'Rent', 'Utilities', 'Loan', 'Interest', 'Transfer', 'General', 'Other'];

const fmt = (n: number) => formatCurrencyINR(n, 2, 0);
const fmtDec = (n: number) => formatCurrencyINR(n);

function fmtDateHeader(ds: string) {
  const d = new Date(ds);
  const today = new Date();
  const yesterday = new Date(); yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}

function mapTransaction(t: any): CashTransaction {
  return {
    id: t.id,
    type: t.type,
    amount: parseFloat(t.amount) || 0,
    description: t.description || '',
    date: t.transaction_date || t.date || t.created_at,
    category: t.category || 'General',
    referenceNumber: t.reference_number || '',
    counterpartyName: t.counterparty_name || '',
    createdAt: t.created_at || '',
    referenceType: t.reference_type || '',
    referenceId: t.reference_id || '',
    relatedInvoiceId: t.related_invoice_id || '',
    notes: t.notes || '',
  };
}

function getSourceLabel(refType: string, type: 'credit' | 'debit'): string {
  const map: Record<string, string> = {
    purchase_invoice: 'Purchase Invoice',
    invoice: 'Sales Invoice',
    return: 'Sales Return',
    receivable: 'Receivable Collection',
    payable: 'Payable Payment',
    expense: 'Expense',
    salary: 'Salary Payment',
  };
  if (map[refType]) return map[refType];
  if (refType) return refType.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase());
  return type === 'credit' ? 'Cash In' : 'Cash Out';
}

function getSourceColor(refType: string): string {
  const map: Record<string, string> = {
    purchase_invoice: '#7C3AED',
    invoice: '#2563EB',
    return: '#D97706',
    receivable: '#059669',
    payable: '#DC2626',
  };
  return map[refType] || C.primary;
}

export default function CashDetailsScreen() {
  const { data: businessData } = useBusinessData();
  const [transactions, setTransactions] = useState<CashTransaction[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSearch, setShowSearch] = useState(false);
  const [showExportModal, setShowExportModal] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('month');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  const [showAddTx, setShowAddTx] = useState(false);
  const [txType, setTxType] = useState<'credit' | 'debit'>('credit');
  const [txAmount, setTxAmount] = useState('');
  const [txDescription, setTxDescription] = useState('');
  const [txCategory, setTxCategory] = useState('General');
  const [txReference, setTxReference] = useState('');
  const [txCounterparty, setTxCounterparty] = useState('');
  const [txDate, setTxDate] = useState(new Date().toISOString().split('T')[0]);
  const [txSaving, setTxSaving] = useState(false);
  const [showCategoryPicker, setShowCategoryPicker] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [openingBalance, setOpeningBalance] = useState(0);
  const openingBalFetched = useRef(false);

  useEffect(() => {
    if (openingBalFetched.current) return;
    const biz = businessData.business;
    if (!biz) return;
    const initBal = Number(biz.initial_cash_balance) || 0;
    if (initBal > 0) {
      openingBalFetched.current = true;
      setOpeningBalance(initBal);
    }
  }, [businessData.business]);

  useFocusEffect(useCallback(() => { loadTransactions(); }, []));

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    const unsub = onTransactionChange(() => { if (mountedRef.current) loadSilent(); });
    return () => { mountedRef.current = false; unsub(); };
  }, []);

  const loadSilent = async () => {
    try {
      const r = await getCashTransactions();
      if (r.success && r.transactions && mountedRef.current) {
        setTransactions(r.transactions.map(mapTransaction));
      }
    } catch { /* silent */ }
  };

  const loadTransactions = async () => {
    setIsLoading(true);
    try {
      const r = await getCashTransactions();
      if (r.success && r.transactions) setTransactions(r.transactions.map(mapTransaction));
    } catch { setTransactions([]); }
    setIsLoading(false);
  };

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    loadTransactions().catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  const filtered = useMemo(() => {
    let result = transactions;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t =>
        t.description.toLowerCase().includes(q) ||
        t.amount.toString().includes(q) ||
        t.category.toLowerCase().includes(q) ||
        t.counterpartyName.toLowerCase().includes(q) ||
        t.referenceNumber.toLowerCase().includes(q)
      );
    }
    result = filterByDateRange(result, (t) => t.date, selectedTimeRange, customFromDate, customToDate);
    return result;
  }, [transactions, searchQuery, selectedTimeRange, customFromDate, customToDate]);

  const grouped = useMemo(() => {
    const sorted = [...filtered].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
    const sections: { title: string; data: CashTransaction[] }[] = [];
    for (const t of sorted) {
      const key = new Date(t.date).toDateString();
      const last = sections[sections.length - 1];
      if (last && last.title === key) last.data.push(t);
      else sections.push({ title: key, data: [t] });
    }
    return sections;
  }, [filtered]);

  const totalIn = transactions.filter(t => t.type === 'credit').reduce((s, t) => s + t.amount, 0);
  const totalOut = transactions.filter(t => t.type === 'debit').reduce((s, t) => s + t.amount, 0);
  const currentBalance = openingBalance + totalIn - totalOut;

  const resetTxForm = () => {
    setTxType('credit'); setTxAmount(''); setTxDescription(''); setTxCategory('General');
    setTxReference(''); setTxCounterparty(''); setTxDate(new Date().toISOString().split('T')[0]); setTxSaving(false);
  };

  const handleSave = async () => {
    const amt = parseFloat(txAmount);
    if (!amt || amt <= 0) { Alert.alert('Error', 'Enter a valid amount'); return; }
    if (!txDescription.trim()) { Alert.alert('Error', 'Enter a description'); return; }
    setTxSaving(true);
    const res = await addCashTransaction({
      type: txType, amount: amt, description: txDescription.trim(),
      category: txCategory, referenceNumber: txReference.trim(),
      counterpartyName: txCounterparty.trim(), transactionDate: new Date(txDate).toISOString(),
    });
    setTxSaving(false);
    if (res.success) {
      Alert.alert('Success', 'Cash transaction added');
      setShowAddTx(false); resetTxForm(); loadTransactions();
    } else {
      Alert.alert('Error', res.error || 'Failed to add transaction');
    }
  };

  const handleTxPress = (t: CashTransaction) => {
    if (t.referenceType === 'purchase_invoice' && t.referenceId) {
      safeRouter.push({ pathname: '/purchasing/invoice-details', params: { invoiceId: t.referenceId } });
    } else if (t.referenceType === 'invoice' && (t.relatedInvoiceId || t.referenceId)) {
      safeRouter.push({ pathname: '/invoice-details', params: { invoiceId: t.relatedInvoiceId || t.referenceId } });
    } else if (t.referenceType === 'return' && t.referenceId) {
      safeRouter.push({ pathname: '/return-details', params: { returnId: t.referenceId } });
    } else {
      setNavData('transactionData', t);
      safeRouter.push({ pathname: '/transaction-details', params: { transactionId: t.id, transactionType: 'cash' } });
    }
  };

  const renderTxItem = ({ item: t }: { item: CashTransaction }) => {
    const isCredit = t.type === 'credit';
    const sourceLabel = getSourceLabel(t.referenceType, t.type);
    const sourceColor = getSourceColor(t.referenceType);
    const txDate = new Date(t.date);
    const dateStr = txDate.toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
    const timeStr = txDate.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit' });

    return (
      <TouchableOpacity style={s.txRow} activeOpacity={0.6} onPress={() => handleTxPress(t)}>
        <View style={[s.txIcon, { backgroundColor: isCredit ? C.successBg : C.errorBg }]}>
          {isCredit
            ? <ArrowDownLeft size={16} color={C.success} />
            : <ArrowUpRight size={16} color={C.error} />}
        </View>
        <View style={s.txInfo}>
          <Text style={s.txDesc} numberOfLines={1}>{t.description}</Text>
          <View style={s.txMeta}>
            <Text style={s.txTime}>{dateStr}, {timeStr}</Text>
            <View style={[s.txSourcePill, { backgroundColor: sourceColor + '15' }]}>
              <Text style={[s.txSourceText, { color: sourceColor }]}>{sourceLabel}</Text>
            </View>
          </View>
          {t.counterpartyName ? (
            <Text style={s.txCounterparty} numberOfLines={1}>
              {isCredit ? 'From: ' : 'To: '}{t.counterpartyName}
            </Text>
          ) : null}
          {t.referenceNumber ? (
            <Text style={s.txRef} numberOfLines={1}>Ref: {t.referenceNumber}</Text>
          ) : null}
        </View>
        <Text style={[s.txAmount, { color: isCredit ? C.success : C.error }]}>
          {isCredit ? '+' : '-'}{fmt(t.amount)}
        </Text>
      </TouchableOpacity>
    );
  };

  const renderSection = (section: { title: string; data: CashTransaction[] }) => (
    <View key={section.title}>
      <Text style={s.sectionDate}>{fmtDateHeader(section.data[0].date)}</Text>
      {section.data.map(t => <View key={t.id}>{renderTxItem({ item: t })}</View>)}
    </View>
  );

  return (
    <View style={s.container}>
      <SafeAreaView style={s.headerArea}>
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.headerBtn}><ArrowLeft size={22} color={C.text} /></TouchableOpacity>
          <Text style={s.headerTitle}>Cash Statement</Text>
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

      {/* Balance Card */}
      <View style={s.balCard}>
        <View style={s.balTop}>
          <View style={s.balIconWrap}><Wallet size={18} color="#fff" /></View>
          <View style={{ flex: 1 }}>
            <Text style={s.balLabel}>Cash Balance</Text>
            <Text style={s.balAmount}>{fmtDec(currentBalance)}</Text>
          </View>
        </View>
        <View style={s.balStats}>
          <View style={s.balStat}>
            <Text style={s.balStatLabel}>Opening</Text>
            <Text style={s.balStatVal}>{fmt(openingBalance)}</Text>
          </View>
          <View style={s.balStatSep} />
          <View style={s.balStat}>
            <Text style={s.balStatLabel}>Cash In</Text>
            <Text style={[s.balStatVal, { color: '#34D399' }]}>+{fmt(totalIn)}</Text>
          </View>
          <View style={s.balStatSep} />
          <View style={s.balStat}>
            <Text style={s.balStatLabel}>Cash Out</Text>
            <Text style={[s.balStatVal, { color: '#FCA5A5' }]}>-{fmt(totalOut)}</Text>
          </View>
        </View>
      </View>

      {/* Transaction List */}
      {isLoading ? (
        <View style={s.loadingWrap}>
          <ActivityIndicator size="small" color={C.primary} />
          <Text style={s.loadingText}>Loading transactions...</Text>
        </View>
      ) : grouped.length === 0 && !openingBalance ? (
        <View style={s.emptyWrap}>
          <FileText size={40} color={C.border} />
          <Text style={s.emptyTitle}>{searchQuery ? 'No matching transactions' : 'No Cash Transactions'}</Text>
          <Text style={s.emptySub}>{searchQuery ? 'Try different search terms' : 'Tap the button below to record your first cash transaction'}</Text>
        </View>
      ) : (
        <FlatList
          data={grouped}
          keyExtractor={(item) => item.title}
          renderItem={({ item }) => renderSection(item)}
          ListHeaderComponent={openingBalance ? (
            <View style={s.openingBalRow}>
              <View style={[s.txIcon, { backgroundColor: '#EFF6FF' }]}>
                <Wallet size={16} color={C.primary} />
              </View>
              <View style={s.txInfo}>
                <Text style={s.txDesc}>Opening Balance</Text>
                <Text style={s.txTime}>Balance at start</Text>
              </View>
              <Text style={[s.txAmount, { color: C.primary }]}>{fmt(openingBalance)}</Text>
            </View>
          ) : null}
          ListEmptyComponent={openingBalance ? (
            <View style={s.emptyWrap}>
              <FileText size={40} color={C.border} />
              <Text style={s.emptyTitle}>No Transactions Yet</Text>
              <Text style={s.emptySub}>Your opening balance is {fmt(openingBalance)}. Tap below to record your first transaction.</Text>
            </View>
          ) : null}
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
          <Text style={s.addBtnText}>Add Cash Transaction</Text>
        </TouchableOpacity>
      </View>

      {/* Add Transaction Modal */}
      <Modal visible={showAddTx} animationType="slide" presentationStyle="pageSheet" onRequestClose={() => setShowAddTx(false)}>
        <SafeAreaView style={{ flex: 1, backgroundColor: C.bg }}>
          <View style={s.modalHead}>
            <TouchableOpacity onPress={() => setShowAddTx(false)}><X size={24} color={C.text} /></TouchableOpacity>
            <Text style={s.modalTitle}>Add Cash Transaction</Text>
            <View style={{ width: 24 }} />
          </View>
          <FlatList
            data={[1]}
            keyExtractor={() => 'form'}
            renderItem={() => (
              <View style={{ padding: 16, paddingBottom: 40 }}>
                <View style={s.typeToggle}>
                  <TouchableOpacity style={[s.typeBtn, txType === 'credit' && s.typeBtnCredit]} onPress={() => setTxType('credit')}>
                    <Text style={[s.typeBtnText, txType === 'credit' && { color: '#fff' }]}>Cash In</Text>
                  </TouchableOpacity>
                  <TouchableOpacity style={[s.typeBtn, txType === 'debit' && s.typeBtnDebit]} onPress={() => setTxType('debit')}>
                    <Text style={[s.typeBtnText, txType === 'debit' && { color: '#fff' }]}>Cash Out</Text>
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
                  placeholder="e.g., Cash sale to walk-in customer" placeholderTextColor={C.textLight} />

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

                <Text style={s.fieldLabel}>Reference Number</Text>
                <TextInput style={s.textField} value={txReference} onChangeText={setTxReference}
                  placeholder="e.g., Receipt No." placeholderTextColor={C.textLight} />

                <DateInputWithPicker
                  label="Transaction Date"
                  value={txDate}
                  onChangeDate={setTxDate}
                  maximumDate={new Date()}
                />

                <TouchableOpacity style={[s.saveBtn, txSaving && { opacity: 0.6 }]} onPress={handleSave} disabled={txSaving} activeOpacity={0.8}>
                  <Text style={s.saveBtnText}>{txSaving ? 'Saving...' : 'Save Transaction'}</Text>
                </TouchableOpacity>
              </View>
            )}
            keyboardShouldPersistTaps="handled"
          />
        </SafeAreaView>
      </Modal>

      <ExportModal
        visible={showExportModal}
        onClose={() => setShowExportModal(false)}
        config={{
          title: 'Cash Statement',
          fileName: 'cash_statement',
          columns: [
            { key: 'date', header: 'Date' },
            { key: 'description', header: 'Description' },
            { key: 'type', header: 'Type', format: (v) => v === 'credit' ? 'Credit' : 'Debit' },
            { key: 'amount', header: 'Amount (₹)', format: (v) => formatIndianNumber(v || 0) },
            { key: 'category', header: 'Category' },
            { key: 'counterpartyName', header: 'Counterparty' },
            { key: 'referenceNumber', header: 'Reference' },
            { key: 'notes', header: 'Notes' },
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
  headerTitle: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '600', color: C.text },

  searchBar: {
    flexDirection: 'row', alignItems: 'center', marginHorizontal: 16, marginTop: 8, marginBottom: 4,
    backgroundColor: C.surface, borderRadius: 10, borderWidth: 1, borderColor: C.border,
    paddingHorizontal: 12, paddingVertical: Platform.OS === 'ios' ? 10 : 4, gap: 8,
  },
  searchInput: { flex: 1, fontSize: 14, color: C.text, paddingVertical: Platform.OS === 'ios' ? 0 : 6, ...Platform.select({ web: { outlineStyle: 'none' as any } }) },

  balCard: {
    margin: 16, marginBottom: 8, backgroundColor: C.success, borderRadius: 16, padding: 18,
    ...Platform.select({ ios: { shadowColor: '#059669', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8 }, android: { elevation: 6 } }),
  },
  balTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 14 },
  balIconWrap: { width: 36, height: 36, borderRadius: 10, backgroundColor: 'rgba(255,255,255,0.2)', justifyContent: 'center', alignItems: 'center' },
  balLabel: { fontSize: 12, color: 'rgba(255,255,255,0.75)', fontWeight: '500' },
  balAmount: { fontSize: 26, fontWeight: '800', color: '#fff', letterSpacing: -0.5, marginTop: 2 },
  balStats: {
    flexDirection: 'row', backgroundColor: 'rgba(0,0,0,0.12)', borderRadius: 10, paddingVertical: 10,
  },
  balStat: { flex: 1, alignItems: 'center' },
  balStatSep: { width: 1, backgroundColor: 'rgba(255,255,255,0.15)' },
  balStatLabel: { fontSize: 10, color: 'rgba(255,255,255,0.65)', textTransform: 'uppercase', letterSpacing: 0.3, marginBottom: 3 },
  balStatVal: { fontSize: 13, fontWeight: '700', color: '#fff' },

  openingBalRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 14, paddingHorizontal: 4,
    marginBottom: 6, borderBottomWidth: 1, borderBottomColor: C.border,
    backgroundColor: '#F0F7FF', borderRadius: 10, paddingLeft: 8, marginTop: 4,
  },

  sectionDate: {
    fontSize: 12, fontWeight: '700', color: C.textMuted, textTransform: 'uppercase',
    letterSpacing: 0.4, marginTop: 18, marginBottom: 8, paddingHorizontal: 4,
  },

  txRow: {
    flexDirection: 'row', alignItems: 'center', paddingVertical: 12, paddingHorizontal: 4,
    borderBottomWidth: StyleSheet.hairlineWidth, borderBottomColor: C.divider,
  },
  txIcon: {
    width: 38, height: 38, borderRadius: 10, justifyContent: 'center', alignItems: 'center', marginRight: 12,
  },
  txInfo: { flex: 1, marginRight: 12 },
  txDesc: { fontSize: 14, fontWeight: '500', color: C.text, marginBottom: 3 },
  txMeta: { flexDirection: 'row', alignItems: 'center', gap: 6, flexWrap: 'wrap', marginBottom: 2 },
  txTime: { fontSize: 11, color: C.textLight },
  txSourcePill: { borderRadius: 4, paddingHorizontal: 6, paddingVertical: 1 },
  txSourceText: { fontSize: 10, fontWeight: '600' },
  txCounterparty: { fontSize: 12, color: C.textMuted, marginTop: 1 },
  txRef: { fontSize: 11, color: C.textLight, marginTop: 1 },
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
    backgroundColor: C.success, borderRadius: 12, paddingVertical: 14,
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8,
  },
  addBtnText: { color: '#fff', fontSize: 15, fontWeight: '600' },

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
  pickerItemActive: { backgroundColor: C.successBg },
  pickerItemText: { fontSize: 14, color: C.text },

  saveBtn: { backgroundColor: C.success, borderRadius: 12, paddingVertical: 14, alignItems: 'center', marginTop: 24 },
  saveBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
