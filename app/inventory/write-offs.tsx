import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  Pressable,
  Platform,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';
import { ArrowLeft, Search, Filter, Plus, Trash2, Package } from 'lucide-react-native';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { getWriteOffs, invalidateApiCache } from '@/services/backendApi';
import { formatCurrencyINR, formatDateDDMMYYYY } from '@/utils/formatters';
import { setNavData } from '@/utils/navStore';
import DateFilterBar, { TimeRange, filterByDateRange } from '@/components/DateFilterBar';
import { ListSkeleton } from '@/components/SkeletonLoader';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  orange: '#EA580C',
  grey: { 50: '#F9FAFB', 100: '#F3F4F6', 200: '#E5E7EB', 300: '#D1D5DB' },
};

function normalizeWriteOff(w: any) {
  const items = w.items || w.write_off_items || [];
  const arr = Array.isArray(items) ? items : [];
  return {
    id: String(w.id || ''),
    reason: w.reason || 'Write-off',
    created_at: w.created_at || w.createdAt || '',
    total_value: Number(w.total_value || w.totalValue || 0),
    staff_name: w.staff_name || w.staffName || '',
    general_notes: w.general_notes || w.generalNotes || '',
    items: arr,
    itemCount: arr.length || Number(w.item_count) || 0,
    raw: w,
  };
}

export default function WriteOffsScreen() {
  const [list, setList] = useState<ReturnType<typeof normalizeWriteOff>[]>([]);
  const [filtered, setFiltered] = useState<ReturnType<typeof normalizeWriteOff>[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedTimeRange, setSelectedTimeRange] = useState<TimeRange>('all');
  const [customFromDate, setCustomFromDate] = useState('');
  const [customToDate, setCustomToDate] = useState('');

  const load = useCallback(async () => {
    const res = await getWriteOffs();
    if (res.success && res.writeOffs) {
      const mapped = (res.writeOffs as any[]).map(normalizeWriteOff).filter((x) => x.id);
      setList(mapped);
    } else {
      setList([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    invalidateApiCache('writeoffs');
    await load();
    setRefreshing(false);
  }, [load]);

  const applyFilters = useCallback(() => {
    let rows = list;
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      rows = rows.filter(
        (r) =>
          r.reason.toLowerCase().includes(q) ||
          r.staff_name.toLowerCase().includes(q) ||
          r.general_notes.toLowerCase().includes(q) ||
          r.items.some((it: any) =>
            String(it.product_name || it.productName || '').toLowerCase().includes(q)
          )
      );
    }
    rows = filterByDateRange(rows, (r) => r.created_at, selectedTimeRange, customFromDate, customToDate);
    setFiltered(rows);
  }, [list, searchQuery, selectedTimeRange, customFromDate, customToDate]);

  useEffect(() => {
    applyFilters();
  }, [applyFilters]);

  const activeFilterCount = useMemo(() => {
    let n = 0;
    if (selectedTimeRange !== 'all') n++;
    if (selectedTimeRange === 'custom' && (customFromDate || customToDate)) n++;
    return n;
  }, [selectedTimeRange, customFromDate, customToDate]);

  const handleOpenDetail = (row: ReturnType<typeof normalizeWriteOff>) => {
    setNavData('writeOffDetail', { ...row.raw, items: row.items });
    safeRouter.push({
      pathname: '/inventory/write-off-details',
      params: { writeOffId: row.id },
    });
  };

  const renderCard = ({ item }: { item: ReturnType<typeof normalizeWriteOff> }) => (
    <TouchableOpacity
      style={[styles.card, { borderLeftColor: Colors.orange }]}
      onPress={() => handleOpenDetail(item)}
      activeOpacity={0.7}
    >
      <View style={styles.cardRow}>
        <View style={[styles.iconWrap, { backgroundColor: `${Colors.orange}18` }]}>
          <Trash2 size={20} color={Colors.orange} />
        </View>
        <View style={{ flex: 1 }}>
          <Text style={styles.reason} numberOfLines={2}>
            {item.reason}
          </Text>
          <Text style={styles.meta}>
            {formatDateDDMMYYYY(item.created_at) || '—'} · {item.itemCount} line{item.itemCount !== 1 ? 's' : ''}
            {item.staff_name ? ` · ${item.staff_name}` : ''}
          </Text>
        </View>
        <Text style={styles.amount}>{formatCurrencyINR(item.total_value, 2, 0)}</Text>
      </View>
    </TouchableOpacity>
  );

  if (loading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Write-offs</Text>
          <View style={{ width: 40 }} />
        </View>
        <ListSkeleton itemCount={6} showSearch showFilter />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <ResponsiveContainer maxWidth={1200}>
        <View style={[styles.header, getWebContainerStyles()]}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Write-offs</Text>
          <View style={{ width: 40 }} />
        </View>

        <View style={[styles.searchRow, getWebContainerStyles()]}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} style={{ marginRight: 10 }} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search reason, product, staff…"
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
          </View>
          <TouchableOpacity style={styles.filterBtn} onPress={() => setShowFilterModal(true)}>
            <Filter size={22} color={Colors.primary} />
            {activeFilterCount > 0 ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>

        <DateFilterBar
          selectedRange={selectedTimeRange}
          onRangeChange={setSelectedTimeRange}
          customFromDate={customFromDate}
          customToDate={customToDate}
          onCustomFromChange={setCustomFromDate}
          onCustomToChange={setCustomToDate}
        />

        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderCard}
          contentContainerStyle={[styles.listContent, getWebContainerStyles(), { paddingBottom: 100 }]}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
          ListEmptyComponent={
            <View style={styles.empty}>
              <Package size={48} color={Colors.grey[300]} />
              <Text style={styles.emptyTitle}>No write-offs</Text>
              <Text style={styles.emptySub}>Tap + to record stock write-off</Text>
            </View>
          }
        />

        <TouchableOpacity
          style={styles.fab}
          onPress={() => safeRouter.push('/inventory/stock-out')}
          activeOpacity={0.85}
        >
          <Plus size={28} color="#fff" />
        </TouchableOpacity>

        <Modal visible={showFilterModal} transparent animationType="fade">
          <Pressable style={styles.modalBackdrop} onPress={() => setShowFilterModal(false)} />
          <View style={styles.modalCard}>
            <Text style={styles.modalTitle}>Date filter</Text>
            <DateFilterBar
              selectedRange={selectedTimeRange}
              onRangeChange={setSelectedTimeRange}
              customFromDate={customFromDate}
              customToDate={customToDate}
              onCustomFromChange={setCustomFromDate}
              onCustomToChange={setCustomToDate}
            />
            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilterModal(false)}>
              <Text style={styles.applyBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </Modal>
      </ResponsiveContainer>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backBtn: { padding: 8 },
  title: { fontSize: 18, fontWeight: '700', color: Colors.text },
  searchRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    gap: 10,
    marginBottom: 8,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    paddingHorizontal: 14,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  searchInput: { flex: 1, fontSize: 16, color: Colors.text, paddingVertical: 8 },
  filterBtn: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  badge: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    minWidth: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 4,
  },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  listContent: { paddingHorizontal: 16, paddingTop: 8 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  cardRow: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  iconWrap: {
    width: 44,
    height: 44,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  reason: { fontSize: 16, fontWeight: '600', color: Colors.text },
  meta: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  amount: { fontSize: 15, fontWeight: '700', color: Colors.orange },
  empty: { alignItems: 'center', paddingVertical: 48 },
  emptyTitle: { fontSize: 17, fontWeight: '600', color: Colors.text, marginTop: 12 },
  emptySub: { fontSize: 14, color: Colors.textLight, marginTop: 6 },
  fab: {
    position: 'absolute',
    right: 20,
    bottom: Platform.OS === 'ios' ? 32 : 24,
    width: 58,
    height: 58,
    borderRadius: 29,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
  },
  modalBackdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(0,0,0,0.45)',
  },
  modalCard: {
    position: 'absolute',
    left: 20,
    right: 20,
    top: '22%',
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    maxHeight: '70%',
  },
  modalTitle: { fontSize: 18, fontWeight: '700', marginBottom: 16, color: Colors.text },
  applyBtn: {
    marginTop: 20,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
