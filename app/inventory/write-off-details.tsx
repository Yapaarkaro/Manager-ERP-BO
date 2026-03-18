import React from 'react';
import { View, Text, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Trash2, Package } from 'lucide-react-native';
import { consumeNavData } from '@/utils/navStore';
import { formatCurrencyINR, formatDateDDMMYYYY } from '@/utils/formatters';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  orange: '#EA580C',
  grey: { 100: '#F3F4F6', 200: '#E5E7EB' },
};

export default function WriteOffDetailsScreen() {
  const nav = consumeNavData<any>('writeOffDetail');
  if (!nav || typeof nav !== 'object') {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.title}>Write-off</Text>
          <View style={{ width: 40 }} />
        </View>
        <View style={{ padding: 24 }}>
          <Text style={styles.empty}>Open this write-off from the list — details are not available after refresh.</Text>
        </View>
      </SafeAreaView>
    );
  }

  const w = nav;
  const items = w.items || w.write_off_items || [];
  const arr = Array.isArray(items) ? items : [];

  const reason = w.reason || 'Write-off';
  const created = w.created_at || w.createdAt || '';
  const total = Number(w.total_value || w.totalValue || 0);
  const staff = w.staff_name || w.staffName || '';
  const notes = w.general_notes || w.generalNotes || '';

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backBtn} onPress={() => router.back()}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.title}>Write-off</Text>
        <View style={{ width: 40 }} />
      </View>

      <ScrollView contentContainerStyle={styles.scroll} showsVerticalScrollIndicator={false}>
        <View style={[styles.hero, { borderColor: Colors.grey[200] }]}>
          <View style={[styles.iconWrap, { backgroundColor: `${Colors.orange}18` }]}>
            <Trash2 size={28} color={Colors.orange} />
          </View>
          <Text style={styles.reason}>{reason}</Text>
          <Text style={styles.amount}>{formatCurrencyINR(total, 2, 0)}</Text>
          <Text style={styles.meta}>
            {formatDateDDMMYYYY(created) || '—'}
            {staff ? ` · ${staff}` : ''}
          </Text>
        </View>

        {notes ? (
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <Text style={styles.notes}>{notes}</Text>
          </View>
        ) : null}

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Items ({arr.length})</Text>
          {arr.length === 0 ? (
            <Text style={styles.empty}>No line items in response</Text>
          ) : (
            arr.map((it: any, idx: number) => {
              const name = it.product_name || it.productName || 'Product';
              const qty = Number(it.quantity || 0);
              const unit = it.primary_unit || it.primaryUnit || 'Piece';
              const price = Number(it.unit_price || it.unitPrice || 0);
              const line = qty * price;
              return (
                <View key={idx} style={styles.itemRow}>
                  <Package size={18} color={Colors.primary} style={{ marginRight: 10 }} />
                  <View style={{ flex: 1 }}>
                    <Text style={styles.itemName}>{name}</Text>
                    <Text style={styles.itemMeta}>
                      {qty} {unit} × {formatCurrencyINR(price, 2, 0)}
                    </Text>
                  </View>
                  <Text style={styles.itemAmt}>{formatCurrencyINR(line, 2, 0)}</Text>
                </View>
              );
            })
          )}
        </View>
      </ScrollView>
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
  scroll: { padding: 16, paddingBottom: 40 },
  hero: {
    alignItems: 'center',
    padding: 24,
    borderRadius: 16,
    borderWidth: 1,
    marginBottom: 20,
    backgroundColor: '#FFFBF5',
  },
  iconWrap: {
    width: 56,
    height: 56,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 12,
  },
  reason: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  amount: { fontSize: 22, fontWeight: '800', color: Colors.orange, marginTop: 8 },
  meta: { fontSize: 14, color: Colors.textLight, marginTop: 8 },
  section: { marginBottom: 24 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 12 },
  notes: { fontSize: 15, color: Colors.text, lineHeight: 22 },
  empty: { color: Colors.textLight, fontSize: 14 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  itemName: { fontSize: 15, fontWeight: '600', color: Colors.text },
  itemMeta: { fontSize: 13, color: Colors.textLight, marginTop: 4 },
  itemAmt: { fontSize: 15, fontWeight: '700', color: Colors.text },
});
