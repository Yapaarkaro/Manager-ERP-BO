import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  RefreshControl,
  Modal,
  Platform,
  TextInput,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';
import {
  ArrowLeft,
  Search,
  Filter,
  Trash2,
  Package,
  IndianRupee,
  ClipboardList,
} from 'lucide-react-native';
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
  success: '#059669',
  error: '#DC2626',
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

function totalQtyFromItems(items: any[]) {
  return items.reduce((s, it) => s + Math.abs(Number(it.quantity || 0)), 0);
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
    if (selectedTimeRange === 'custom' && customFromDate && customToDate) n++;
    return n;
  }, [selectedTimeRange, customFromDate, customToDate]);

  const summary = useMemo(() => {
    const totalValue = filtered.reduce((s, r) => s + r.total_value, 0);
    const entries = filtered.length;
    const totalUnits = filtered.reduce((s, r) => s + totalQtyFromItems(r.items), 0);
    return { totalValue, entries, totalUnits };
  }, [filtered]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

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
          <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Write-offs</Text>
          <View style={{ width: 40 }} />
        </View>
        <ListSkeleton itemCount={6} showSearch showFilter />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Write-offs</Text>
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>{filtered.length} entries</Text>
        </View>
      </View>

      <View style={[styles.summaryContainer, getWebContainerStyles()]}>
        <View style={styles.summaryCard}>
          <IndianRupee size={20} color={Colors.orange} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total value</Text>
            <Text style={[styles.summaryValue, { color: Colors.orange }]}>
              {formatCurrencyINR(summary.totalValue, 2, 0)}
            </Text>
            <Text style={styles.summaryCount}>in view</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <ClipboardList size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Write-offs</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>{summary.entries}</Text>
            <Text style={styles.summaryCount}>records</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Package size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Units removed</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {summary.totalUnits % 1 === 0 ? String(summary.totalUnits) : summary.totalUnits.toFixed(2)}
            </Text>
            <Text style={styles.summaryCount}>qty</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={[styles.inlineSearchContainer, getWebContainerStyles()]}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search reason, product, staff…"
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => setShowFilterModal(true)}
            activeOpacity={0.7}
          >
            <Filter size={20} color="#FFFFFF" />
            {activeFilterCount > 0 ? (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{activeFilterCount}</Text>
              </View>
            ) : null}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={getWebContainerStyles()}>
        <DateFilterBar
          selectedRange={selectedTimeRange}
          onRangeChange={setSelectedTimeRange}
          customFromDate={customFromDate}
          customToDate={customToDate}
          onCustomFromChange={setCustomFromDate}
          onCustomToChange={setCustomToDate}
        />
      </View>

      <FlatList
        data={filtered}
        keyExtractor={(item) => item.id}
        renderItem={renderCard}
        style={styles.scrollView}
        contentContainerStyle={[styles.listContent, getWebContainerStyles(), { paddingBottom: 100 }]}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        ListEmptyComponent={
          <View style={styles.empty}>
            <Trash2 size={56} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No write-offs</Text>
            <Text style={styles.emptySub}>
              {searchQuery ? 'Nothing matches your search' : 'Record a stock write-off to see it here'}
            </Text>
          </View>
        }
      />

      <TouchableOpacity
        style={styles.writeOffFab}
        onPress={() => safeRouter.push('/inventory/stock-out')}
        activeOpacity={0.85}
      >
        <Package size={20} color="#fff" />
        <Text style={styles.writeOffFabText}>Stock write-off</Text>
      </TouchableOpacity>

      <Modal
        visible={showFilterModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter write-offs</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
              <Text style={styles.filterHint}>Date range applies to the list below.</Text>
              <DateFilterBar
                selectedRange={selectedTimeRange}
                onRangeChange={setSelectedTimeRange}
                customFromDate={customFromDate}
                customToDate={customToDate}
                onCustomFromChange={setCustomFromDate}
                onCustomToChange={setCustomToDate}
              />
            </ScrollView>
            <TouchableOpacity style={styles.applyBtn} onPress={() => setShowFilterModal(false)}>
              <Text style={styles.applyBtnText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  totalCount: { fontSize: 14, color: Colors.textLight },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: Colors.grey[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryInfo: { alignItems: 'center', marginTop: 8 },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
    textAlign: 'center',
  },
  summaryValue: { fontSize: 14, fontWeight: '700', textAlign: 'center', marginBottom: 2 },
  summaryCount: { fontSize: 10, color: Colors.textLight, textAlign: 'center' },
  divider: {
    height: 1,
    backgroundColor: Colors.grey[200],
    marginHorizontal: 16,
  },
  inlineSearchContainer: { paddingHorizontal: 16, paddingVertical: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    backgroundColor: 'transparent',
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    marginRight: 12,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  filterBadge: {
    position: 'absolute',
    top: -5,
    right: -5,
    backgroundColor: Colors.error,
    borderRadius: 10,
    minWidth: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 5,
  },
  filterBadgeText: { color: '#fff', fontSize: 11, fontWeight: '700' },
  scrollView: { flex: 1 },
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
  emptySub: { fontSize: 14, color: Colors.textLight, marginTop: 6, textAlign: 'center', paddingHorizontal: 24 },
  writeOffFab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    backgroundColor: Colors.orange,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 25,
    zIndex: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  writeOffFabText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  filterModal: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: Platform.OS === 'ios' ? 34 : 20,
    maxHeight: '75%',
  },
  filterModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  filterModalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  closeButton: { padding: 8 },
  closeButtonText: { fontSize: 20, color: Colors.textLight },
  filterModalContent: { paddingHorizontal: 16, paddingTop: 12 },
  filterHint: { fontSize: 13, color: Colors.textLight, marginBottom: 12 },
  applyBtn: {
    marginHorizontal: 20,
    marginTop: 8,
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    alignItems: 'center',
  },
  applyBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' },
});
