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
import { ArrowLeft, Building2, ChevronRight, Plus, Landmark } from 'lucide-react-native';
import { useBusinessData } from '@/hooks/useBusinessData';
import { router } from 'expo-router';
import { useFocusEffect } from '@react-navigation/native';
import { onTransactionChange } from '@/utils/transactionEvents';
import { invalidateApiCache } from '@/services/backendApi';
import { safeRouter } from '@/utils/safeRouter';
import { formatCurrencyINR } from '@/utils/formatters';

const C = {
  bg: '#FFFFFF',
  surface: '#F9FAFB',
  text: '#1F2937',
  textMuted: '#6B7280',
  primary: '#3f66ac',
  primaryBg: '#EFF3FB',
  success: '#059669',
  border: '#E5E7EB',
  divider: '#F3F4F6',
};

const fmt = (n: number) => formatCurrencyINR(n, 2, 0);

export default function BankAccountsScreen() {
  const { data: businessData, refetch } = useBusinessData();

  const bankAccounts = useMemo(() => {
    if (!businessData?.bankAccounts) return [];
    return businessData.bankAccounts.filter(
      (a: any) => a.type !== 'cash' && a.account_type !== 'cash'
    );
  }, [businessData?.bankAccounts]);

  const totalBankBalance = useMemo(() => {
    if (!bankAccounts.length) {
      return businessData?.business?.current_total_bank_balance ?? 0;
    }
    return bankAccounts.reduce((sum: number, a: any) => {
      const bal = a.current_balance ?? a.currentBalance ?? a.balance ?? a.initial_balance ?? 0;
      return sum + (typeof bal === 'number' ? bal : parseFloat(String(bal)) || 0);
    }, 0);
  }, [bankAccounts, businessData?.business?.current_total_bank_balance]);

  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    refetch().catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, [refetch]);

  useFocusEffect(React.useCallback(() => { refetch(); }, [refetch]));

  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    const unsub = onTransactionChange(() => { if (mountedRef.current) refetch(); });
    return () => { mountedRef.current = false; unsub(); };
  }, [refetch]);

  const handleView = (id: string) => safeRouter.push({ pathname: '/bank-details', params: { bankAccountId: id } });

  return (
    <View style={s.container}>
      <SafeAreaView style={{ flex: 1 }}>
        {/* Header */}
        <View style={s.header}>
          <TouchableOpacity onPress={() => router.back()} style={s.backBtn} activeOpacity={0.7}>
            <ArrowLeft size={22} color={C.text} />
          </TouchableOpacity>
          <Text style={s.headerTitle}>Bank Accounts</Text>
          <TouchableOpacity onPress={() => safeRouter.push('/auth/banking-details')} style={s.addBtn} activeOpacity={0.7}>
            <Plus size={18} color={C.primary} />
          </TouchableOpacity>
        </View>

        <ScrollView style={{ flex: 1 }} contentContainerStyle={s.scroll} showsVerticalScrollIndicator={false} refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}>
          {/* Summary card */}
          <View style={s.summaryCard}>
            <View style={s.summaryIconWrap}>
              <Landmark size={28} color={C.primary} />
            </View>
            <Text style={s.summaryLabel}>Total Bank Balance</Text>
            <Text style={s.summaryAmount}>{fmt(totalBankBalance)}</Text>
            <Text style={s.summaryAccounts}>
              {bankAccounts.length} account{bankAccounts.length !== 1 ? 's' : ''}
            </Text>
          </View>

          {/* Account list */}
          {bankAccounts.length > 0 ? (
            <View style={s.listWrap}>
              <Text style={s.sectionLabel}>Your Accounts</Text>
              {bankAccounts.map((account: any, idx: number) => {
                const name = account.bank_name || account.bankName || 'Bank Account';
                const accNum = account.account_number || account.accountNumber || '';
                const balance = account.current_balance ?? account.currentBalance ?? account.balance ?? account.initial_balance ?? 0;
                const isPrimary = account.is_primary || account.isPrimary;
                const isLast = idx === bankAccounts.length - 1;

                return (
                  <TouchableOpacity
                    key={account.id}
                    style={[s.accountCard, isLast && { marginBottom: 0 }]}
                    onPress={() => handleView(account.id)}
                    activeOpacity={0.7}
                  >
                    <View style={s.accountRow}>
                      <View style={s.accountIconWrap}>
                        <Building2 size={20} color={C.primary} />
                      </View>
                      <View style={s.accountInfo}>
                        <View style={s.accountNameRow}>
                          <Text style={s.accountName} numberOfLines={1}>{name}</Text>
                          {isPrimary && (
                            <View style={s.primaryPill}>
                              <Text style={s.primaryPillText}>Primary</Text>
                            </View>
                          )}
                        </View>
                        {accNum ? (
                          <Text style={s.accountNum}>{'•••• ' + accNum.slice(-4)}</Text>
                        ) : null}
                      </View>
                      <View style={s.accountRight}>
                        <Text style={s.accountBal}>{fmt(typeof balance === 'number' ? balance : parseFloat(String(balance)) || 0)}</Text>
                        <ChevronRight size={16} color={C.textMuted} />
                      </View>
                    </View>
                  </TouchableOpacity>
                );
              })}
            </View>
          ) : (
            <View style={s.emptyWrap}>
              <View style={s.emptyIconWrap}>
                <Building2 size={40} color={C.border} />
              </View>
              <Text style={s.emptyTitle}>No bank accounts yet</Text>
              <Text style={s.emptySub}>Add a bank account to track your balance and transactions</Text>
              <TouchableOpacity
                style={s.emptyBtn}
                onPress={() => safeRouter.push('/auth/banking-details')}
                activeOpacity={0.7}
              >
                <Plus size={16} color="#fff" />
                <Text style={s.emptyBtnText}>Add Bank Account</Text>
              </TouchableOpacity>
            </View>
          )}
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
  addBtn: {
    width: 40, height: 40, borderRadius: 12, justifyContent: 'center', alignItems: 'center',
    backgroundColor: C.primaryBg,
  },
  scroll: { padding: 16, paddingBottom: 40 },

  summaryCard: {
    backgroundColor: C.bg, borderRadius: 16, padding: 24, alignItems: 'center',
    borderWidth: 1, borderColor: C.border, marginBottom: 20,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.06, shadowRadius: 8 }, android: { elevation: 3 } }),
  },
  summaryIconWrap: {
    width: 52, height: 52, borderRadius: 14, backgroundColor: C.primaryBg,
    justifyContent: 'center', alignItems: 'center', marginBottom: 14,
  },
  summaryLabel: { fontSize: 14, color: C.textMuted, fontWeight: '500', marginBottom: 6 },
  summaryAmount: { fontSize: 32, fontWeight: '800', color: C.text, letterSpacing: -0.5, marginBottom: 4 },
  summaryAccounts: { fontSize: 13, color: C.textMuted },

  listWrap: { marginBottom: 16 },
  sectionLabel: { fontSize: 14, fontWeight: '600', color: C.textMuted, marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.5 },
  accountCard: {
    backgroundColor: C.bg, borderRadius: 14, padding: 16,
    borderWidth: 1, borderColor: C.border, marginBottom: 10,
    ...Platform.select({ ios: { shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.04, shadowRadius: 4 }, android: { elevation: 1 } }),
  },
  accountRow: { flexDirection: 'row', alignItems: 'center' },
  accountIconWrap: {
    width: 42, height: 42, borderRadius: 12, backgroundColor: C.primaryBg,
    justifyContent: 'center', alignItems: 'center', marginRight: 14,
  },
  accountInfo: { flex: 1 },
  accountNameRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 3 },
  accountName: { fontSize: 15, fontWeight: '600', color: C.text, flexShrink: 1 },
  accountNum: { fontSize: 13, color: C.textMuted },
  accountRight: { alignItems: 'flex-end', marginLeft: 8, gap: 4 },
  accountBal: { fontSize: 15, fontWeight: '700', color: C.text },

  primaryPill: {
    backgroundColor: C.primaryBg, borderRadius: 6, paddingHorizontal: 8, paddingVertical: 2,
  },
  primaryPillText: { fontSize: 11, fontWeight: '600', color: C.primary },

  emptyWrap: {
    alignItems: 'center', paddingVertical: 48, paddingHorizontal: 32,
    backgroundColor: C.surface, borderRadius: 16, borderWidth: 1, borderColor: C.divider,
  },
  emptyIconWrap: {
    width: 72, height: 72, borderRadius: 20, backgroundColor: C.divider,
    justifyContent: 'center', alignItems: 'center', marginBottom: 16,
  },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: C.text, marginBottom: 6 },
  emptySub: { fontSize: 13, color: C.textMuted, textAlign: 'center', lineHeight: 20, marginBottom: 20 },
  emptyBtn: {
    flexDirection: 'row', alignItems: 'center', gap: 8,
    backgroundColor: C.primary, borderRadius: 10, paddingHorizontal: 20, paddingVertical: 12,
  },
  emptyBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
});
