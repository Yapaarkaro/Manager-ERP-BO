import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';
import { createInvoice, getNextInvoiceNumber, getOrCreateConversation, sendMessage, createInAppNotification } from '@/services/backendApi';
import { useBusinessData } from '@/hooks/useBusinessData';
import { supabase } from '@/lib/supabase';
import {
  ArrowLeft,
  FileText,
  Check,
  Minus,
  Plus,
  MapPin,
  Calendar,
  CreditCard,
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
  },
};

interface POItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
  description?: string;
}

export default function CreateInvoiceAgainstPOScreen() {
  const { poId, poNumber, poData } = useLocalSearchParams();
  const { data: bizData } = useBusinessData();
  const [isProcessing, setIsProcessing] = useState(false);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [isLoadingNumber, setIsLoadingNumber] = useState(true);

  const po = useMemo(() => {
    if (poData) {
      try { return JSON.parse(poData as string); }
      catch { return null; }
    }
    return null;
  }, [poData]);

  const poItems: POItem[] = useMemo(() => {
    if (!po) return [];
    const items = po.items || po.products || [];
    return items.map((it: any) => ({
      id: it.id || it.productId || it.product_id || '',
      name: it.name || it.productName || it.product_name || '',
      description: it.description || '',
      quantity: it.quantity || it.orderQuantity || 0,
      price: it.price || it.unitPrice || it.unit_price || 0,
      total: it.total || it.totalPrice || it.total_price || 0,
    }));
  }, [po]);

  useEffect(() => {
    (async () => {
      try {
        const result = await getNextInvoiceNumber();
        if (result.success && result.invoiceNumber) {
          setInvoiceNumber(result.invoiceNumber);
        } else {
          setInvoiceNumber(`INV-${Date.now().toString().slice(-8)}`);
        }
      } catch {
        setInvoiceNumber(`INV-${Date.now().toString().slice(-8)}`);
      } finally {
        setIsLoadingNumber(false);
      }
    })();
  }, []);

  const [billedItems, setBilledItems] = useState<Array<{
    id: string;
    name: string;
    orderedQty: number;
    billedQty: number;
    price: number;
    included: boolean;
  }>>(() => poItems.map(item => ({
    id: item.id,
    name: item.name,
    orderedQty: item.quantity,
    billedQty: item.quantity,
    price: item.price,
    included: true,
  })));

  const [invoiceNotes, setInvoiceNotes] = useState('');
  const [deliveryAddress, setDeliveryAddress] = useState('');
  const [paymentTerms, setPaymentTerms] = useState('');
  const [dueDate, setDueDate] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi' | 'bank_transfer' | 'cheque' | 'none'>('none');

  const updateBilledQty = (idx: number, delta: number) => {
    setBilledItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newQty = Math.max(0, Math.min(item.orderedQty, item.billedQty + delta));
      return { ...item, billedQty: newQty, included: newQty > 0 };
    }));
  };

  const toggleItem = (idx: number) => {
    setBilledItems(prev => prev.map((item, i) => {
      if (i !== idx) return item;
      const newIncluded = !item.included;
      return { ...item, included: newIncluded, billedQty: newIncluded ? item.orderedQty : 0 };
    }));
  };

  const includedItems = billedItems.filter(i => i.included && i.billedQty > 0);
  const subtotal = includedItems.reduce((sum, i) => sum + i.billedQty * i.price, 0);
  const grandTotal = subtotal;

  const formatAmount = (n: number) => `₹${n.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;

  const PAYMENT_METHODS = [
    { key: 'none', label: 'Unpaid' },
    { key: 'cash', label: 'Cash' },
    { key: 'upi', label: 'UPI' },
    { key: 'bank_transfer', label: 'Bank' },
    { key: 'cheque', label: 'Cheque' },
  ] as const;

  const handleCreateInvoice = async () => {
    if (includedItems.length === 0) {
      Alert.alert('No Items', 'Please include at least one item to create the invoice.');
      return;
    }
    if (!invoiceNumber.trim()) {
      Alert.alert('Invoice Number', 'Please enter an invoice number.');
      return;
    }

    setIsProcessing(true);
    try {
      const customerName = po?.supplierName || 'Customer';
      const paidAmount = paymentMethod !== 'none' ? grandTotal : 0;
      const paymentStatus: 'paid' | 'unpaid' = paymentMethod !== 'none' ? 'paid' : 'unpaid';

      const result = await createInvoice({
        invoiceNumber: invoiceNumber.trim(),
        customerName,
        items: includedItems.map(item => ({
          productName: item.name,
          quantity: item.billedQty,
          unitPrice: item.price,
          totalPrice: item.billedQty * item.price,
        })),
        subtotal,
        taxAmount: 0,
        totalAmount: grandTotal,
        paidAmount,
        balanceAmount: grandTotal - paidAmount,
        paymentMethod: paymentMethod === 'none' ? 'none' : paymentMethod,
        paymentStatus,
        staffName: bizData?.business?.owner_name || bizData?.business?.legal_name || 'Owner',
        notes: [
          `Against PO: ${poNumber}`,
          deliveryAddress ? `Delivery: ${deliveryAddress}` : '',
          paymentTerms ? `Payment Terms: ${paymentTerms}` : '',
          invoiceNotes,
        ].filter(Boolean).join('\n'),
        dueDate: dueDate || undefined,
      });

      if (!result.success) {
        Alert.alert('Error', result.error || 'Failed to create invoice');
        setIsProcessing(false);
        return;
      }

      const invoiceId = result.invoice?.id;

      // Link invoice to PO and update PO status
      try {
        await supabase
          .from('purchase_orders')
          .update({
            status: 'received',
            actual_delivery: new Date().toISOString(),
            linked_invoice_id: invoiceId || null,
          })
          .eq('id', poId as string);
      } catch {}

      // Get PO details and customer business info
      try {
        const { data: poRow } = await supabase
          .from('purchase_orders')
          .select('business_id, supplier_id, supplier_name')
          .eq('id', poId as string)
          .single();

        const { data: { session } } = await supabase.auth.getSession();
        const myBizName = bizData?.business?.legal_name || bizData?.business?.owner_name || 'Supplier';
        const paidAmount = paymentMethod !== 'none' ? grandTotal : 0;
        const paymentStatusLabel = paymentMethod !== 'none' ? 'Paid' : 'Unpaid';

        if (poRow?.business_id) {
          // Create a purchase invoice entry in the customer's business (payables)
          try {
            const { data: piEntry } = await supabase
              .from('purchase_invoices')
              .insert({
                business_id: poRow.business_id,
                invoice_number: invoiceNumber.trim(),
                purchase_order_id: poId as string,
                po_number: poNumber as string,
                supplier_id: poRow.supplier_id,
                supplier_name: myBizName,
                subtotal,
                tax_amount: 0,
                total_amount: grandTotal,
                paid_amount: paidAmount,
                balance_amount: grandTotal - paidAmount,
                payment_method: paymentMethod === 'none' ? 'none' : paymentMethod,
                payment_status: paymentMethod !== 'none' ? 'paid' : 'unpaid',
                delivery_status: 'pending',
                notes: [
                  deliveryAddress ? `Delivery: ${deliveryAddress}` : '',
                  paymentTerms ? `Payment Terms: ${paymentTerms}` : '',
                  invoiceNotes,
                ].filter(Boolean).join('\n') || null,
                staff_name: bizData?.business?.owner_name || 'Owner',
                invoice_date: new Date().toISOString(),
                created_by: session?.user?.id || null,
              })
              .select()
              .single();

            // Insert purchase invoice items
            if (piEntry) {
              const piItems = includedItems.map(item => ({
                purchase_invoice_id: piEntry.id,
                product_name: item.name,
                quantity: item.billedQty,
                unit_price: item.price,
                total_price: item.billedQty * item.price,
              }));
              await supabase.from('purchase_invoice_items').insert(piItems);
            }
          } catch (piErr) {
            console.warn('Purchase invoice creation for customer failed:', piErr);
          }

          // Notify customer about the invoice with payment status
          let notifMessage = `${myBizName} has created invoice ${invoiceNumber} against PO ${poNumber} for ${formatAmount(grandTotal)}.`;
          if (paymentMethod === 'none') {
            notifMessage += ` Payment is marked as unpaid. Please review and confirm.`;
          } else {
            notifMessage += ` Payment marked as ${paymentStatusLabel} via ${paymentMethod}.`;
          }

          await createInAppNotification({
            businessId: poRow.business_id,
            recipientId: poRow.business_id,
            recipientType: 'owner',
            title: paymentMethod === 'none'
              ? 'Invoice Received — Payment Pending'
              : 'Invoice Received — Payment Marked',
            message: notifMessage,
            type: 'purchase_invoice',
            category: 'purchase',
            priority: paymentMethod === 'none' ? 'high' : 'medium',
            relatedEntityType: 'invoice',
            relatedEntityId: invoiceId || '',
            relatedEntityName: invoiceNumber,
          });
        }

        // Send invoice in chat
        const businessId = bizData?.business?.id;
        if (businessId && poRow?.business_id) {
          try {
            const { data: custSupplier } = await supabase
              .from('suppliers')
              .select('id')
              .eq('linked_user_id', session?.user?.id || '')
              .eq('business_id', poRow.business_id)
              .maybeSingle();

            if (custSupplier) {
              const convResult = await getOrCreateConversation({
                businessId,
                otherPartyId: custSupplier.id,
                otherPartyType: 'supplier',
                otherPartyName: customerName,
              });

              if (convResult.success && convResult.conversation) {
                const sType = convResult.crossBusiness ? 'supplier' : 'owner';
                await sendMessage({
                  conversationId: convResult.conversation.id,
                  senderId: session?.user?.id || '',
                  senderType: sType as any,
                  senderName: myBizName,
                  content: `📄 Sales Invoice: ${invoiceNumber}\n${includedItems.length} item(s) · Total: ${formatAmount(grandTotal)}\nAgainst PO: ${poNumber}\nPayment: ${paymentStatusLabel}`,
                  messageType: 'file',
                  metadata: {
                    document_type: 'sales_invoice',
                    entity_id: invoiceId || '',
                    entity_number: invoiceNumber,
                  },
                });
              }
            }
          } catch {}
        }
      } catch {}

      Alert.alert(
        'Invoice Created',
        `Invoice ${invoiceNumber} has been created against PO ${poNumber} and sent to the customer.`,
        [{ text: 'OK', onPress: () => router.back() }]
      );
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Something went wrong');
    } finally {
      setIsProcessing(false);
    }
  };

  if (!po) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7}>
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Error</Text>
            <View style={{ width: 24 }} />
          </View>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
            <Text style={{ color: Colors.textLight }}>PO data not found</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => router.back()} activeOpacity={0.7} style={styles.backButton}>
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Create Invoice Against PO</Text>
          <View style={{ width: 24 }} />
        </View>

        <ScrollView style={styles.scrollView} contentContainerStyle={styles.scrollContent}>
          {/* PO Reference */}
          <View style={styles.section}>
            <View style={styles.poRefCard}>
              <FileText size={20} color={Colors.primary} />
              <View style={{ flex: 1, marginLeft: 12 }}>
                <Text style={styles.poRefNumber}>PO: {poNumber}</Text>
                <Text style={styles.poRefCustomer}>Customer: {po.supplierName || 'Unknown'}</Text>
              </View>
              <Text style={styles.poRefAmount}>{formatAmount(po.amount || 0)}</Text>
            </View>
          </View>

          {/* Invoice Number */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Number</Text>
            {isLoadingNumber ? (
              <ActivityIndicator size="small" color={Colors.primary} style={{ marginTop: 8 }} />
            ) : (
              <TextInput
                style={styles.textInput}
                value={invoiceNumber}
                onChangeText={setInvoiceNumber}
                placeholder="Enter invoice number"
                placeholderTextColor={Colors.grey[300]}
              />
            )}
          </View>

          {/* Items Comparison */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Items — Ordered vs Billed</Text>
            <Text style={styles.sectionSubtitle}>Adjust quantities for what you are actually billing</Text>

            {billedItems.map((item, idx) => (
              <View key={item.id || idx} style={[styles.itemCard, !item.included && styles.itemCardDisabled]}>
                <TouchableOpacity
                  style={[styles.checkbox, item.included && styles.checkboxChecked]}
                  onPress={() => toggleItem(idx)}
                  activeOpacity={0.7}
                >
                  {item.included && <Check size={14} color={Colors.background} />}
                </TouchableOpacity>

                <View style={styles.itemDetails}>
                  <Text style={[styles.itemName, !item.included && styles.itemNameDisabled]}>{item.name}</Text>
                  <View style={styles.qtyRow}>
                    <Text style={styles.orderedLabel}>Ordered: {item.orderedQty}</Text>
                    <View style={styles.qtyControls}>
                      <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => updateBilledQty(idx, -1)}
                        disabled={!item.included}
                        activeOpacity={0.7}
                      >
                        <Minus size={14} color={item.included ? Colors.text : Colors.grey[300]} />
                      </TouchableOpacity>
                      <Text style={[styles.billedQty, !item.included && { color: Colors.grey[300] }]}>
                        {item.billedQty}
                      </Text>
                      <TouchableOpacity
                        style={styles.qtyButton}
                        onPress={() => updateBilledQty(idx, 1)}
                        disabled={!item.included || item.billedQty >= item.orderedQty}
                        activeOpacity={0.7}
                      >
                        <Plus size={14} color={item.included && item.billedQty < item.orderedQty ? Colors.text : Colors.grey[300]} />
                      </TouchableOpacity>
                    </View>
                  </View>
                  <View style={styles.priceRow}>
                    <Text style={styles.itemPrice}>{formatAmount(item.price)} × {item.billedQty}</Text>
                    <Text style={[styles.itemTotal, !item.included && { color: Colors.grey[300] }]}>
                      {formatAmount(item.billedQty * item.price)}
                    </Text>
                  </View>
                  {item.billedQty < item.orderedQty && item.included && (
                    <View style={styles.shortfallBadge}>
                      <Text style={styles.shortfallText}>Short by {item.orderedQty - item.billedQty} unit(s)</Text>
                    </View>
                  )}
                </View>
              </View>
            ))}
          </View>

          {/* Delivery & Payment */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Delivery & Payment</Text>

            <View style={styles.fieldRow}>
              <MapPin size={16} color={Colors.textLight} />
              <Text style={styles.fieldLabel}>Delivery Address</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={deliveryAddress}
              onChangeText={setDeliveryAddress}
              placeholder="Enter delivery location..."
              placeholderTextColor={Colors.grey[300]}
            />

            <View style={[styles.fieldRow, { marginTop: 14 }]}>
              <CreditCard size={16} color={Colors.textLight} />
              <Text style={styles.fieldLabel}>Payment Terms</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={paymentTerms}
              onChangeText={setPaymentTerms}
              placeholder="e.g., Net 30, Due on receipt..."
              placeholderTextColor={Colors.grey[300]}
            />

            <View style={[styles.fieldRow, { marginTop: 14 }]}>
              <Calendar size={16} color={Colors.textLight} />
              <Text style={styles.fieldLabel}>Due Date</Text>
            </View>
            <TextInput
              style={styles.textInput}
              value={dueDate}
              onChangeText={setDueDate}
              placeholder="e.g., 2026-04-15"
              placeholderTextColor={Colors.grey[300]}
            />

            <View style={[styles.fieldRow, { marginTop: 14 }]}>
              <CreditCard size={16} color={Colors.textLight} />
              <Text style={styles.fieldLabel}>Payment Method</Text>
            </View>
            <View style={styles.paymentMethodRow}>
              {PAYMENT_METHODS.map(pm => (
                <TouchableOpacity
                  key={pm.key}
                  style={[styles.paymentChip, paymentMethod === pm.key && styles.paymentChipActive]}
                  onPress={() => setPaymentMethod(pm.key as any)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.paymentChipText, paymentMethod === pm.key && styles.paymentChipTextActive]}>
                    {pm.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Notes</Text>
            <TextInput
              style={styles.notesInput}
              value={invoiceNotes}
              onChangeText={setInvoiceNotes}
              placeholder="Add notes for this invoice..."
              placeholderTextColor={Colors.grey[300]}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Totals */}
          <View style={styles.section}>
            <View style={styles.totalsCard}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>PO Total</Text>
                <Text style={styles.totalValue}>{formatAmount(po.amount || 0)}</Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Invoice Subtotal</Text>
                <Text style={styles.totalValue}>{formatAmount(subtotal)}</Text>
              </View>
              {subtotal < (po.amount || 0) && (
                <View style={styles.totalRow}>
                  <Text style={[styles.totalLabel, { color: Colors.warning }]}>Difference</Text>
                  <Text style={[styles.totalValue, { color: Colors.warning }]}>
                    -{formatAmount((po.amount || 0) - subtotal)}
                  </Text>
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Invoice Total</Text>
                <Text style={styles.grandTotalValue}>{formatAmount(grandTotal)}</Text>
              </View>
            </View>
          </View>

          {/* Submit */}
          <View style={styles.section}>
            <TouchableOpacity
              style={[styles.submitButton, isProcessing && styles.submitButtonDisabled]}
              onPress={handleCreateInvoice}
              disabled={isProcessing}
              activeOpacity={0.7}
            >
              {isProcessing ? (
                <ActivityIndicator size="small" color={Colors.background} />
              ) : (
                <FileText size={18} color={Colors.background} />
              )}
              <Text style={styles.submitButtonText}>
                {isProcessing ? 'Creating Invoice...' : 'Create & Send Invoice'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  safeArea: { flex: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12,
    borderBottomWidth: 1, borderBottomColor: Colors.grey[200],
  },
  backButton: { padding: 4 },
  headerTitle: { flex: 1, fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center' },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 40 },
  section: { marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: '700', color: Colors.text, marginBottom: 4 },
  sectionSubtitle: { fontSize: 12, color: Colors.textLight, marginBottom: 12 },
  poRefCard: {
    flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.grey[50],
    borderRadius: 12, padding: 16, borderWidth: 1, borderColor: Colors.grey[200],
  },
  poRefNumber: { fontSize: 15, fontWeight: '700', color: Colors.primary },
  poRefCustomer: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  poRefAmount: { fontSize: 16, fontWeight: '700', color: Colors.text },
  textInput: {
    backgroundColor: Colors.grey[50], borderRadius: 10, padding: 14, fontSize: 14,
    color: Colors.text, borderWidth: 1, borderColor: Colors.grey[200], marginTop: 6,
  },
  fieldRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 2 },
  fieldLabel: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  paymentMethodRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  paymentChip: {
    paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20,
    backgroundColor: Colors.grey[100], borderWidth: 1, borderColor: Colors.grey[200],
  },
  paymentChipActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  paymentChipText: { fontSize: 13, fontWeight: '600', color: Colors.textLight },
  paymentChipTextActive: { color: Colors.background },
  itemCard: {
    flexDirection: 'row', backgroundColor: Colors.grey[50], borderRadius: 10,
    padding: 14, marginBottom: 10, borderWidth: 1, borderColor: Colors.grey[200],
  },
  itemCardDisabled: { opacity: 0.5 },
  checkbox: {
    width: 24, height: 24, borderRadius: 6, borderWidth: 2, borderColor: Colors.grey[300],
    justifyContent: 'center', alignItems: 'center', marginRight: 12, marginTop: 2,
  },
  checkboxChecked: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  itemDetails: { flex: 1 },
  itemName: { fontSize: 14, fontWeight: '600', color: Colors.text, marginBottom: 6 },
  itemNameDisabled: { color: Colors.grey[300], textDecorationLine: 'line-through' },
  qtyRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 6 },
  orderedLabel: { fontSize: 12, color: Colors.textLight },
  qtyControls: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  qtyButton: {
    width: 28, height: 28, borderRadius: 6, backgroundColor: Colors.grey[100],
    justifyContent: 'center', alignItems: 'center', borderWidth: 1, borderColor: Colors.grey[200],
  },
  billedQty: { fontSize: 16, fontWeight: '700', color: Colors.text, minWidth: 30, textAlign: 'center' },
  priceRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  itemPrice: { fontSize: 12, color: Colors.textLight },
  itemTotal: { fontSize: 14, fontWeight: '600', color: Colors.text },
  shortfallBadge: {
    marginTop: 6, backgroundColor: '#FEF3C7', paddingHorizontal: 8, paddingVertical: 3,
    borderRadius: 4, alignSelf: 'flex-start',
  },
  shortfallText: { fontSize: 11, color: Colors.warning, fontWeight: '600' },
  notesInput: {
    backgroundColor: Colors.grey[50], borderRadius: 10, padding: 14, fontSize: 14,
    color: Colors.text, borderWidth: 1, borderColor: Colors.grey[200], minHeight: 80,
    textAlignVertical: 'top', marginTop: 8,
  },
  totalsCard: {
    backgroundColor: Colors.grey[50], borderRadius: 12, padding: 16,
    borderWidth: 1, borderColor: Colors.grey[200],
  },
  totalRow: { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6 },
  totalLabel: { fontSize: 14, color: Colors.textLight },
  totalValue: { fontSize: 14, fontWeight: '600', color: Colors.text },
  grandTotalRow: { borderTopWidth: 2, borderTopColor: Colors.primary, marginTop: 8, paddingTop: 10 },
  grandTotalLabel: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  grandTotalValue: { fontSize: 16, fontWeight: '700', color: Colors.primary },
  submitButton: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'center',
    backgroundColor: Colors.success, borderRadius: 12, paddingVertical: 16, gap: 10,
  },
  submitButtonDisabled: { opacity: 0.6 },
  submitButtonText: { fontSize: 16, fontWeight: '700', color: Colors.background },
});
