import React, { useMemo, useEffect, useRef, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { ArrowLeft, Wallet, TrendingUp, TrendingDown, ChevronRight, IndianRupee } from 'lucide-react-native';
import { useBusinessData } from '@/hooks/useBusinessData';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { onTransactionChange } from '@/utils/transactionEvents';
import { invalidateApiCache, getCashTransactions } from '@/services/backendApi';
import { safeRouter } from '@/utils/safeRouter';

const C = {
  bg: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#1F2937',
  textMuted: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  successBg: '#ECFDF5',
  error: '#DC2626',
  errorBg: '#FEF2F2',
  border: '#E5E7EB',
  divider: '#F3F4F6',
};

const fmt = (n: number) =>
  new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0 }).format(n);

export default function CashAccountsScreen() {
  const { data: businessData, refetch } = useBusinessData();
  const [totalIn, setTotalIn] = useState(0);
  const [totalOut, setTotalOut] = useState(0);

  const openingBalance = useMemo(() => {
    return businessData?.business?.initial_cash_balance || businessData?.business?.current_cash_balance || 0;
  }, [businessData?.business?.initial_cash_balance, businessData?.business?.current_cash_balance]);

  const currentBalance = openingBalance + totalIn - totalOut;

  const [refreshing, setRefreshing] = useState(false);

  const loadTransactions = useCallback(async () => {
    try {
      const r = await getCashTransactions();
      if (r.success && r.transactions) {
        const txns = r.transactions;
        setTotalIn(txns.filter((t: any) => t.type === 'credit').reduce((s: number, t: any) => s + (parseFloat(t.amount) || 0), 0));
        setTotalOut(txns.filter((t: any) => t.type === 'debit').reduce((s: number, t: any) => s + (parseFloat(t.amount) || 0), 0));
      }
    } catch { /* silent */ }
  }, []);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    Promise.all([refetch(), loadTransactions()]).catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, [refetch, loadTransactions]);

  useFocusEffect(React.useCallback(() => { refetch(); loadTransactions(); }, [refetch, loadTransactions]));

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    const unsub = onTransactionChange(() => { if (mountedRef.current) { refetch(); loadTransactions(); } });
    return () => { mountedRef.current = false; unsub(); };
  }, [refetch, loadTransactions]);

  const netChange = totalIn - totalOut;
  const isPositive = netChange >= 0;

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Cash</Text>
          <View style={{ width: 40 }} />
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {/* Hero Balance Card */}
          <View style={s.heroCard}>
            <View style={s.heroIconWrap}>
              <Wallet size={28} color={C.success} />
            </View>
            <Text style={s.heroLabel}>Current Cash Balance</Text>
            <Text style={s.heroAmount}>{fmt(currentBalance)}</Text>
            <View style={s.heroDivider} />
            <View style={s.heroRow}>
              <View style={s.heroStat}>
                <Text style={s.heroStatLabel}>Opening Balance</Text>
                <Text style={s.heroStatVal}>{fmt(openingBalance)}</Text>
              </View>
              <View style={s.heroStatSep} />
              <View style={s.heroStat}>
                <Text style={s.heroStatLabel}>Net Change</Text>
                <View style={{ flexDirection: 'row', alignItems: 'center', gap: 4 }}>
                  {isPositive
                    ? <TrendingUp size={14} color={C.success} />
                    : <TrendingDown size={14} color={C.error} />}
                  <Text style={[s.heroStatVal, { color: isPositive ? C.success : C.error }]}>
                    {isPositive ? '+' : ''}{fmt(netChange)}
                  </Text>
                </View>
              </View>
            </View>
          </View>

          {/* View Transactions */}
          <TouchableOpacity
            style={s.txnCard}
            onPress={() => safeRouter.push('/cash-details')}
            activeOpacity={0.7}
          >
            <View style={s.txnCardLeft}>
              <View style={[s.txnIcon, { backgroundColor: C.successBg }]}>
                <IndianRupee size={20} color={C.success} />
              </View>
              <View>
                <Text style={s.txnCardTitle}>Cash Transactions</Text>
                <Text style={s.txnCardSub}>View all cash in & cash out</Text>
              </View>
            </View>
            <ChevronRight size={20} color={C.textMuted} />
          </TouchableOpacity>

          {/* Quick Info */}
          <View style={s.infoCard}>
            <Text style={s.infoTitle}>How cash balance works</Text>
            <Text style={s.infoText}>
              Your cash balance updates automatically when you record income, expenses, sales, purchases, returns, receivables, and payables with cash as the payment method.
            </Text>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const s = StyleSheet.create({
  container: { flex: 1, backgroundColor: C.bg },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: 16, paddingVertical: 10,
    borderBottomWidth: 1, borderBottomColor: C.border,
  },
  backBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  headerTitle: { fontSize: 18, fontWeight: '600', color: C.text },
  scroll: { padding: 16, paddingBottom: 40 },

  heroCard: {
    backgroundColor: C.bg, borderRadius: 16, padding: 24,
    borderWidth: 1, borderColor: C.border, marginBottom: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  heroIconWrap: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: C.successBg,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  heroLabel: { fontSize: 14, color: C.textMuted, fontWeight: '500', marginBottom: 6 },
  heroAmount: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -0.5 },
  heroDivider: { height: 1, backgroundColor: C.divider, marginVertical: 18 },
  heroRow: { flexDirection: 'row', alignItems: 'center' },
  heroStat: { flex: 1 },
  heroStatSep: { width: 1, height: 32, backgroundColor: C.divider, marginHorizontal: 12 },
  heroStatLabel: { fontSize: 12, color: C.textMuted, marginBottom: 4 },
  heroStatVal: { fontSize: 15, fontWeight: '700', color: C.text },

  txnCard: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    backgroundColor: C.bg, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 16,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }, android: { elevation: 1 } }),
  },
  txnCardLeft: { flexDirection: 'row', alignItems: 'center', gap: 14, flex: 1 },
  txnIcon: { width: 44, height: 44, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  txnCardTitle: { fontSize: 15, fontWeight: '600', color: C.text },
  txnCardSub: { fontSize: 13, color: C.textMuted, marginTop: 2 },

  infoCard: {
    backgroundColor: C.surface, borderRadius: 14, padding: 18,
    borderWidth: 1, borderColor: C.divider,
  },
  infoTitle: { fontSize: 14, fontWeight: '600', color: C.text, marginBottom: 8 },
  infoText: { fontSize: 13, color: C.textMuted, lineHeight: 20 },
});
