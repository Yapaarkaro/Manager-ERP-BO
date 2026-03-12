import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  ActivityIndicator,
  Platform,
  Share,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Building2,
  Package,
  Send,
  Download,
  Minus,
  Plus,
  CircleCheck as CheckCircle,
  FileText,
  Trash2,
} from 'lucide-react-native';
import { createPurchaseOrder, createInAppNotification } from '@/services/backendApi';
import { safeRouter } from '@/utils/safeRouter';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
    400: '#9CA3AF',
  },
};

interface POProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  hsnCode: string;
  taxRate: number;
  currentStock: number;
  maxStockLevel: number;
  orderQuantity: number;
}

interface SupplierGroup {
  supplierId: string;
  supplierName: string;
  supplierBusinessId?: string | null;
  products: POProduct[];
}

export default function AutoPOReviewScreen() {
  const { supplierGroups: rawGroups } = useLocalSearchParams();
  const initialGroups: SupplierGroup[] = rawGroups ? JSON.parse(rawGroups as string) : [];

  const [groups, setGroups] = useState<SupplierGroup[]>(initialGroups);
  const [sending, setSending] = useState(false);
  const [sentCount, setSentCount] = useState(0);
  const [allSent, setAllSent] = useState(false);

  const totalPOs = groups.length;
  const totalItems = groups.reduce((s, g) => s + g.products.length, 0);
  const totalAmount = groups.reduce(
    (s, g) => s + g.products.reduce((ps, p) => ps + p.price * p.orderQuantity, 0),
    0
  );

  const formatAmount = (n: number) =>
    `₹${n.toLocaleString('en-IN', { minimumFractionDigits: n % 1 !== 0 ? 2 : 0 })}`;

  const handleQtyChange = (groupIdx: number, productId: string, delta: number) => {
    setGroups((prev) =>
      prev.map((g, gi) => {
        if (gi !== groupIdx) return g;
        return {
          ...g,
          products: g.products.map((p) => {
            if (p.id !== productId) return p;
            return { ...p, orderQuantity: Math.max(1, p.orderQuantity + delta) };
          }),
        };
      })
    );
  };

  const handleQtyInput = (groupIdx: number, productId: string, text: string) => {
    const num = parseInt(text, 10);
    if (isNaN(num) || num < 1) return;
    setGroups((prev) =>
      prev.map((g, gi) => {
        if (gi !== groupIdx) return g;
        return {
          ...g,
          products: g.products.map((p) => (p.id === productId ? { ...p, orderQuantity: num } : p)),
        };
      })
    );
  };

  const removeProduct = (groupIdx: number, productId: string) => {
    setGroups((prev) => {
      const updated = prev.map((g, gi) => {
        if (gi !== groupIdx) return g;
        return { ...g, products: g.products.filter((p) => p.id !== productId) };
      });
      return updated.filter((g) => g.products.length > 0);
    });
  };

  const generatePONumber = () => {
    const d = new Date();
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${rand}`;
  };

  const handleSendAll = async () => {
    if (groups.length === 0) return;
    setSending(true);
    setSentCount(0);
    let successCount = 0;
    const errors: string[] = [];

    for (const group of groups) {
      const poNumber = generatePONumber();
      const items = group.products.map((p) => ({
        productId: p.id,
        productName: p.name,
        quantity: p.orderQuantity,
        unitPrice: p.price,
        totalPrice: p.price * p.orderQuantity,
        taxRate: p.taxRate || 0,
        taxAmount: (p.price * p.orderQuantity * (p.taxRate || 0)) / 100,
        hsnCode: p.hsnCode || '',
        primaryUnit: p.unit || 'pcs',
      }));
      const subtotal = items.reduce((s, i) => s + i.unitPrice * i.quantity, 0);
      const taxAmount = items.reduce((s, i) => s + i.taxAmount, 0);

      try {
        const result = await createPurchaseOrder({
          poNumber,
          supplierId: group.supplierId || undefined,
          supplierName: group.supplierName,
          items,
          subtotal,
          taxAmount,
          totalAmount: subtotal + taxAmount,
          expectedDelivery: new Date(Date.now() + 7 * 86400000).toISOString().split('T')[0],
          notes: 'Auto-generated PO from low stock reorder',
        });

        if (result.success) {
          successCount++;
          if (group.supplierBusinessId) {
            try {
              await createInAppNotification({
                businessId: group.supplierBusinessId,
                recipientId: group.supplierBusinessId,
                recipientType: 'owner',
                title: 'New Purchase Order Received',
                message: `You have received PO ${poNumber} with ${items.length} item(s) worth ${formatAmount(subtotal + taxAmount)}.`,
                type: 'purchase_order',
                category: 'purchase',
                priority: 'high',
                relatedEntityType: 'purchase_order',
                relatedEntityId: result.order?.id || '',
              });
            } catch {
              // non-critical
            }
          }
        } else {
          errors.push(`${group.supplierName}: ${result.error}`);
        }
      } catch (e: any) {
        errors.push(`${group.supplierName}: ${e.message}`);
      }
      setSentCount((c) => c + 1);
    }

    setSending(false);

    if (errors.length === 0) {
      setAllSent(true);
    } else if (successCount > 0) {
      Alert.alert(
        'Partially Sent',
        `${successCount} of ${totalPOs} POs created successfully.\n\nFailed:\n${errors.join('\n')}`,
        [{ text: 'OK' }]
      );
      setAllSent(true);
    } else {
      Alert.alert('Failed', `Failed to create POs:\n${errors.join('\n')}`, [{ text: 'OK' }]);
    }
  };

  const buildExportText = () => {
    let text = 'AUTO PURCHASE ORDERS\n';
    text += `Date: ${new Date().toLocaleDateString('en-IN')}\n`;
    text += `Total POs: ${totalPOs} | Items: ${totalItems} | Amount: ${formatAmount(totalAmount)}\n\n`;

    groups.forEach((g, i) => {
      const groupTotal = g.products.reduce((s, p) => s + p.price * p.orderQuantity, 0);
      text += `--- PO ${i + 1}: ${g.supplierName} ---\n`;
      text += `Supplier: ${g.supplierName}\n`;
      g.products.forEach((p) => {
        text += `  ${p.name} | Qty: ${p.orderQuantity} ${p.unit} | Rate: ${formatAmount(p.price)} | Total: ${formatAmount(p.price * p.orderQuantity)}\n`;
      });
      text += `PO Total: ${formatAmount(groupTotal)}\n\n`;
    });

    text += `GRAND TOTAL: ${formatAmount(totalAmount)}\n`;
    return text;
  };

  const handleExport = async () => {
    const text = buildExportText();
    try {
      await Share.share({ message: text, title: 'Purchase Orders' });
    } catch {
      Alert.alert('Export', 'Could not export POs');
    }
  };

  const handleDone = () => {
    safeRouter.replace('/purchasing/purchases' as any);
  };

  if (allSent) {
    return (
      <SafeAreaView style={styles.container}>
        <ScrollView contentContainerStyle={styles.successContent}>
          <View style={styles.successIcon}>
            <CheckCircle size={64} color={Colors.success} />
          </View>
          <Text style={styles.successTitle}>All POs Created!</Text>
          <Text style={styles.successSubtitle}>
            {totalPOs} purchase order{totalPOs !== 1 ? 's' : ''} created and sent to suppliers
          </Text>

          <View style={styles.successSummary}>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Total POs</Text>
              <Text style={styles.successValue}>{totalPOs}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Total Items</Text>
              <Text style={styles.successValue}>{totalItems}</Text>
            </View>
            <View style={styles.successRow}>
              <Text style={styles.successLabel}>Total Amount</Text>
              <Text style={[styles.successValue, { color: Colors.primary }]}>{formatAmount(totalAmount)}</Text>
            </View>
          </View>

          <TouchableOpacity style={styles.exportBtn} onPress={handleExport} activeOpacity={0.7}>
            <Download size={18} color={Colors.primary} />
            <Text style={styles.exportBtnText}>Export POs</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.viewPurchasesBtn} onPress={handleDone} activeOpacity={0.8}>
            <FileText size={18} color="#fff" />
            <Text style={styles.viewPurchasesBtnText}>View Purchases</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.dashboardBtn} onPress={() => safeRouter.replace('/dashboard')} activeOpacity={0.8}>
            <Text style={styles.dashboardBtnText}>Go to Dashboard</Text>
          </TouchableOpacity>
        </ScrollView>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Review Auto POs</Text>
          <Text style={styles.headerSub}>
            {totalPOs} PO{totalPOs !== 1 ? 's' : ''} • {totalItems} items
          </Text>
        </View>
        <TouchableOpacity style={styles.exportHeaderBtn} onPress={handleExport} activeOpacity={0.7}>
          <Download size={20} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Grand total bar */}
      <View style={styles.totalBar}>
        <Text style={styles.totalBarLabel}>Grand Total</Text>
        <Text style={styles.totalBarAmount}>{formatAmount(totalAmount)}</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {groups.map((group, gi) => {
          const groupTotal = group.products.reduce((s, p) => s + p.price * p.orderQuantity, 0);
          return (
            <View key={`${group.supplierId}-${gi}`} style={styles.groupCard}>
              {/* Supplier header */}
              <View style={styles.groupHeader}>
                <View style={styles.groupIconBg}>
                  <Building2 size={20} color={Colors.primary} />
                </View>
                <View style={styles.groupInfo}>
                  <Text style={styles.groupName}>{group.supplierName}</Text>
                  <Text style={styles.groupMeta}>
                    {group.products.length} item{group.products.length !== 1 ? 's' : ''} • {formatAmount(groupTotal)}
                  </Text>
                </View>
              </View>

              {/* Products */}
              {group.products.map((prod) => (
                <View key={prod.id} style={styles.productRow}>
                  <View style={styles.prodIconBg}>
                    <Package size={16} color={Colors.textLight} />
                  </View>
                  <View style={styles.prodInfo}>
                    <Text style={styles.prodName} numberOfLines={1}>{prod.name}</Text>
                    <Text style={styles.prodMeta}>
                      {formatAmount(prod.price)} / {prod.unit} • Stock: {prod.currentStock} / {prod.maxStockLevel}
                    </Text>
                  </View>
                  <View style={styles.qtySection}>
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => handleQtyChange(gi, prod.id, -1)}
                      disabled={prod.orderQuantity <= 1}
                      activeOpacity={0.7}
                    >
                      <Minus size={14} color={prod.orderQuantity <= 1 ? Colors.grey[300] : Colors.text} />
                    </TouchableOpacity>
                    <TextInput
                      style={styles.qtyInput}
                      value={String(prod.orderQuantity)}
                      onChangeText={(t) => handleQtyInput(gi, prod.id, t)}
                      keyboardType="number-pad"
                      selectTextOnFocus
                    />
                    <TouchableOpacity
                      style={styles.qtyBtn}
                      onPress={() => handleQtyChange(gi, prod.id, 1)}
                      activeOpacity={0.7}
                    >
                      <Plus size={14} color={Colors.text} />
                    </TouchableOpacity>
                  </View>
                  <Text style={styles.lineTotal}>{formatAmount(prod.price * prod.orderQuantity)}</Text>
                  <TouchableOpacity
                    style={styles.removeBtn}
                    onPress={() => removeProduct(gi, prod.id)}
                    activeOpacity={0.6}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Trash2 size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          );
        })}

        {groups.length === 0 && (
          <View style={styles.emptyState}>
            <Package size={48} color={Colors.textLight} />
            <Text style={styles.emptyTitle}>No items to order</Text>
          </View>
        )}
      </ScrollView>

      {/* Bottom send bar */}
      {groups.length > 0 && (
        <View style={styles.bottomBar}>
          {sending ? (
            <View style={styles.sendingRow}>
              <ActivityIndicator size="small" color={Colors.primary} />
              <Text style={styles.sendingText}>
                Creating PO {sentCount + 1} of {totalPOs}...
              </Text>
            </View>
          ) : (
            <TouchableOpacity style={styles.sendAllBtn} onPress={handleSendAll} activeOpacity={0.8}>
              <Send size={18} color="#fff" />
              <Text style={styles.sendAllText}>
                Send {totalPOs} PO{totalPOs !== 1 ? 's' : ''} to Supplier{totalPOs !== 1 ? 's' : ''}
              </Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.grey[50] },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, backgroundColor: Colors.background, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 8 },
  headerCenter: { flex: 1 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text },
  headerSub: { fontSize: 13, color: Colors.textLight, marginTop: 1 },
  exportHeaderBtn: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center' },
  totalBar: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 12, backgroundColor: '#f0f4ff', borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  totalBarLabel: { fontSize: 14, fontWeight: '500', color: Colors.textLight },
  totalBarAmount: { fontSize: 20, fontWeight: '700', color: Colors.primary },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  groupCard: { backgroundColor: Colors.background, borderRadius: 14, marginBottom: 14, borderWidth: 1, borderColor: Colors.grey[200], overflow: 'hidden' },
  groupHeader: { flexDirection: 'row', alignItems: 'center', padding: 14, backgroundColor: '#f0f4ff', borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  groupIconBg: { width: 40, height: 40, borderRadius: 20, backgroundColor: `${Colors.primary}15`, justifyContent: 'center', alignItems: 'center', marginRight: 12 },
  groupInfo: { flex: 1 },
  groupName: { fontSize: 16, fontWeight: '600', color: Colors.text },
  groupMeta: { fontSize: 13, color: Colors.textLight, marginTop: 2 },
  productRow: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.grey[100] },
  prodIconBg: { width: 32, height: 32, borderRadius: 6, backgroundColor: Colors.grey[50], justifyContent: 'center', alignItems: 'center', marginRight: 10 },
  prodInfo: { flex: 1, marginRight: 8 },
  prodName: { fontSize: 14, fontWeight: '500', color: Colors.text },
  prodMeta: { fontSize: 11, color: Colors.textLight, marginTop: 2 },
  qtySection: { flexDirection: 'row', alignItems: 'center', gap: 4, marginRight: 8 },
  qtyBtn: { width: 26, height: 26, borderRadius: 13, backgroundColor: Colors.grey[100], justifyContent: 'center', alignItems: 'center' },
  qtyInput: { width: 40, fontSize: 14, fontWeight: '600', color: Colors.text, textAlign: 'center', borderWidth: 1, borderColor: Colors.grey[200], borderRadius: 4, paddingVertical: 2 },
  lineTotal: { fontSize: 13, fontWeight: '600', color: Colors.text, minWidth: 55, textAlign: 'right', marginRight: 6 },
  removeBtn: { padding: 4 },
  emptyState: { alignItems: 'center', paddingVertical: 60, gap: 8 },
  emptyTitle: { fontSize: 16, fontWeight: '600', color: Colors.textLight },
  bottomBar: { paddingHorizontal: 16, paddingVertical: 14, backgroundColor: Colors.background, borderTopWidth: 1, borderTopColor: Colors.grey[200] },
  sendAllBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 15, gap: 8 },
  sendAllText: { fontSize: 16, fontWeight: '600', color: '#fff' },
  sendingRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 10, paddingVertical: 15 },
  sendingText: { fontSize: 15, fontWeight: '500', color: Colors.textLight },
  // Success screen
  successContent: { alignItems: 'center', padding: 24, paddingTop: 60 },
  successIcon: { width: 120, height: 120, borderRadius: 60, backgroundColor: '#dcfce7', justifyContent: 'center', alignItems: 'center', marginBottom: 24 },
  successTitle: { fontSize: 26, fontWeight: '700', color: Colors.success, marginBottom: 8 },
  successSubtitle: { fontSize: 15, color: Colors.textLight, textAlign: 'center', marginBottom: 32, lineHeight: 22 },
  successSummary: { width: '100%', backgroundColor: Colors.grey[50], borderRadius: 14, padding: 18, marginBottom: 24, gap: 12 },
  successRow: { flexDirection: 'row', justifyContent: 'space-between' },
  successLabel: { fontSize: 14, color: Colors.textLight },
  successValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  exportBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.background, borderWidth: 2, borderColor: Colors.primary, borderRadius: 12, paddingVertical: 14, width: '100%', gap: 8, marginBottom: 12 },
  exportBtnText: { fontSize: 15, fontWeight: '600', color: Colors.primary },
  viewPurchasesBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 12, paddingVertical: 14, width: '100%', gap: 8, marginBottom: 12 },
  viewPurchasesBtnText: { fontSize: 15, fontWeight: '600', color: '#fff' },
  dashboardBtn: { alignItems: 'center', paddingVertical: 14, width: '100%' },
  dashboardBtnText: { fontSize: 15, fontWeight: '500', color: Colors.textLight },
});
