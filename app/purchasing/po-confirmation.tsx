import React, { useState, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';
import { createPurchaseOrder, createInAppNotification, getOrCreateConversation, sendMessage, autoLinkSupplierToUser } from '@/services/backendApi';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useBusinessData } from '@/hooks/useBusinessData';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  FileText,
  Building2,
  Package,
  Send,
  StickyNote,
} from 'lucide-react-native';

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

export default function POConfirmationScreen() {
  const { supplierId, supplierData, selectedProducts, totalAmount } = useLocalSearchParams();
  const { data: bizData } = useBusinessData();
  const supplier = supplierData ? JSON.parse(supplierData as string) : {};
  const products: any[] = selectedProducts ? JSON.parse(selectedProducts as string) : [];
  const [isProcessing, setIsProcessing] = useState(false);
  const [notes, setNotes] = useState('');

  const formatAmount = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: amount % 1 !== 0 ? 2 : 0 })}`;

  const poNumber = useMemo(() => {
    const d = new Date();
    const rand = Math.floor(Math.random() * 10000).toString().padStart(4, '0');
    return `PO-${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${rand}`;
  }, []);

  const subtotal = products.reduce(
    (sum: number, p: any) => sum + (p.price || 0) * (p.orderQuantity || 0),
    0
  );

  const taxAmount = products.reduce((sum: number, p: any) => {
    const lineTotal = (p.price || 0) * (p.orderQuantity || 0);
    const rate = p.taxRate || 0;
    return sum + lineTotal * (rate / 100);
  }, 0);

  const grandTotal = subtotal + taxAmount;

  const expectedDelivery = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];

  const supplierDisplayName = supplier.businessName || supplier.name || 'Supplier';

  const handleSubmitPO = async () => {
    setIsProcessing(true);
    try {
      const items = products.map((p: any) => ({
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

      const creatorName = bizData?.business?.owner_name || bizData?.business?.legal_name || 'Owner';
      const result = await createPurchaseOrder({
        poNumber,
        supplierId: (supplierId as string) || undefined,
        supplierName: supplierDisplayName,
        items,
        subtotal,
        taxAmount,
        totalAmount: grandTotal,
        expectedDelivery,
        notes: notes.trim() || undefined,
        staffName: creatorName,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create purchase order');
        setIsProcessing(false);
        return;
      }

      // Check if supplier is on Manager (via linked_user_id)
      let supplierLinkedUserId = supplier.linked_user_id;

      if (!supplierLinkedUserId && supplierId) {
        const linked = await autoLinkSupplierToUser(supplierId as string);
        if (linked) supplierLinkedUserId = linked;
      }

      const supplierIsOnManager = !!supplierLinkedUserId;

      if (supplierIsOnManager) {
        // Find the supplier's own business to send them a notification
        try {
          const { data: supplierUser } = await supabase
            .from('users')
            .select('business_id')
            .eq('id', supplierLinkedUserId)
            .maybeSingle();

          if (supplierUser?.business_id) {
            const myBizName = bizData?.business?.legal_name || bizData?.business?.owner_name || 'Customer';
            await createInAppNotification({
              businessId: supplierUser.business_id,
              recipientId: supplierUser.business_id,
              recipientType: 'owner',
              title: 'New Purchase Order Received',
              message: `${myBizName} has sent you PO ${poNumber} with ${products.length} item(s) worth ${formatAmount(grandTotal)}.`,
              type: 'purchase_order',
              category: 'purchase',
              priority: 'high',
              relatedEntityType: 'purchase_order',
              relatedEntityId: result.order?.id || '',
              relatedEntityName: poNumber,
            });
          }
        } catch {}

        try {
          const savedSettings = await AsyncStorage.getItem('autoSendSettings');
          const autoSend = savedSettings ? JSON.parse(savedSettings) : { autoSendPO: true };

          if (autoSend.autoSendPO) {
            const businessId = bizData?.business?.id;
            if (businessId && supplierId) {
              const convResult = await getOrCreateConversation({
                businessId,
                otherPartyId: supplierId as string,
                otherPartyType: 'supplier',
                otherPartyName: supplierDisplayName,
              });
              if (convResult.success && convResult.conversation) {
                const sType = convResult.crossBusiness ? 'supplier' : 'owner';
                const { data: { session } } = await supabase.auth.getSession();
                await sendMessage({
                  conversationId: convResult.conversation.id,
                  senderId: session?.user?.id || '',
                  senderType: sType as any,
                  senderName: bizData?.business?.legal_name || bizData?.business?.owner_name || 'Owner',
                  content: `📋 Purchase Order: ${poNumber}\n${products.length} item(s) · Total: ${formatAmount(grandTotal)}`,
                  messageType: 'file',
                  metadata: {
                    document_type: 'purchase_order',
                    entity_id: result.order?.id || '',
                    entity_number: poNumber,
                  },
                });
              }
            }
          }
        } catch {}
      }

      const poData = {
        id: result.order?.id || '',
        poNumber,
        supplier,
        products,
        items,
        subtotal,
        taxAmount,
        grandTotal,
        expectedDelivery,
        notes: notes.trim(),
        createdAt: new Date().toISOString(),
        status: 'sent',
      };

      safeRouter.replace({
        pathname: '/purchasing/po-success',
        params: { poData: JSON.stringify(poData) },
      } as any);
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Confirm Purchase Order</Text>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PO Header */}
        <View style={styles.poHeader}>
          <View style={styles.poHeaderTop}>
            <FileText size={28} color={Colors.primary} />
            <Text style={styles.poTitle}>PURCHASE ORDER</Text>
          </View>
          <View style={styles.poMeta}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>PO Number</Text>
              <Text style={styles.metaValue}>{poNumber}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date</Text>
              <Text style={styles.metaValue}>{new Date().toLocaleDateString('en-IN')}</Text>
            </View>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Expected Delivery</Text>
              <Text style={styles.metaValue}>{new Date(expectedDelivery).toLocaleDateString('en-IN')}</Text>
            </View>
          </View>
        </View>

        {/* Supplier Info */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supplier</Text>
          <View style={styles.supplierRow}>
            <View style={styles.supplierIcon}>
              <Building2 size={20} color={Colors.primary} />
            </View>
            <View style={styles.supplierInfo}>
              <Text style={styles.supplierName}>{supplierDisplayName}</Text>
              {supplier.contactPerson && supplier.contactPerson !== supplierDisplayName && (
                <Text style={styles.supplierDetail}>Contact: {supplier.contactPerson}</Text>
              )}
              {supplier.mobile && <Text style={styles.supplierDetail}>{supplier.mobile}</Text>}
              {supplier.gstin && <Text style={styles.supplierGstin}>GSTIN: {supplier.gstin}</Text>}
              {supplier.address && <Text style={styles.supplierDetail}>{supplier.address}</Text>}
            </View>
          </View>
        </View>

        {/* Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items ({products.length})</Text>
          <View style={styles.itemsTable}>
            <View style={styles.tableHeader}>
              <Text style={[styles.thText, { flex: 2 }]}>Item</Text>
              <Text style={[styles.thText, { flex: 0.7, textAlign: 'center' }]}>Qty</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>Rate</Text>
              <Text style={[styles.thText, { flex: 1, textAlign: 'right' }]}>Amount</Text>
            </View>
            {products.map((p: any, i: number) => (
              <View key={p.id || i} style={styles.tableRow}>
                <View style={{ flex: 2 }}>
                  <Text style={styles.itemName} numberOfLines={1}>{p.name}</Text>
                  <Text style={styles.itemMeta}>{p.category}{p.hsnCode ? ` • ${p.hsnCode}` : ''}</Text>
                </View>
                <Text style={[styles.cellText, { flex: 0.7, textAlign: 'center' }]}>
                  {p.orderQuantity} {p.unit || ''}
                </Text>
                <Text style={[styles.cellText, { flex: 1, textAlign: 'right' }]}>
                  {formatAmount(p.price)}
                </Text>
                <Text style={[styles.cellText, styles.cellBold, { flex: 1, textAlign: 'right' }]}>
                  {formatAmount(p.price * p.orderQuantity)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal</Text>
              <Text style={styles.summaryValue}>{formatAmount(subtotal)}</Text>
            </View>
            {taxAmount > 0 && (
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Tax</Text>
                <Text style={styles.summaryValue}>{formatAmount(taxAmount)}</Text>
              </View>
            )}
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Grand Total</Text>
              <Text style={styles.totalValue}>{formatAmount(grandTotal)}</Text>
            </View>
          </View>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <View style={styles.notesHeader}>
            <StickyNote size={16} color={Colors.textLight} />
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
          </View>
          <TextInput
            style={styles.notesInput}
            placeholder="Add any notes for this PO..."
            placeholderTextColor={Colors.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={3}
            textAlignVertical="top"
          />
        </View>
      </ScrollView>

      {/* Submit Button */}
      <View style={styles.bottomBar}>
        <TouchableOpacity
          style={[styles.submitBtn, isProcessing && styles.disabledBtn]}
          onPress={handleSubmitPO}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <Send size={18} color="#fff" />
          <Text style={styles.submitBtnText}>
            {isProcessing ? 'Creating PO...' : 'Create & Send PO'}
          </Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.grey[50],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  poHeader: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 18,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  poHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 14,
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  poTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 10,
  },
  poMeta: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  metaLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  section: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  supplierRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  supplierIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: `${Colors.primary}15`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  supplierDetail: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 1,
  },
  supplierGstin: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'monospace',
    marginTop: 2,
  },
  itemsTable: {
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 10,
    paddingHorizontal: 12,
  },
  thText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#fff',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 10,
    paddingHorizontal: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
    alignItems: 'center',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  itemMeta: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 1,
  },
  cellText: {
    fontSize: 13,
    color: Colors.text,
  },
  cellBold: {
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 10,
    padding: 14,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 6,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 10,
    marginTop: 6,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  notesHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 0,
  },
  notesInput: {
    backgroundColor: Colors.grey[50],
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 12,
    fontSize: 14,
    color: Colors.text,
    minHeight: 70,
  },
  bottomBar: {
    paddingHorizontal: 16,
    paddingVertical: 14,
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  submitBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 15,
    gap: 8,
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledBtn: {
    backgroundColor: Colors.grey[400],
  },
});
