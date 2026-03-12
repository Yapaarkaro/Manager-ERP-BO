import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Download, Share, Eye, Building2, Calendar, Banknote, Smartphone, CreditCard, IndianRupee, Package, Truck, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, Edit3, Send, X, User, MessageCircle, FileText, ActivityIndicator as ActivityIcon } from 'lucide-react-native';
import { ActivityIndicator } from 'react-native';
import { Supplier } from '@/utils/dataStore';
import { getSuppliers, invalidateApiCache, getOrCreateConversation, sendMessage, autoLinkSupplierToUser, acknowledgePurchaseOrder, createInAppNotification } from '@/services/backendApi';
import { supabase } from '@/lib/supabase';
import { useBusinessData } from '@/hooks/useBusinessData';
import { safeRouter } from '@/utils/safeRouter';
import { getInitials, getAvatarColor } from '@/utils/formatters';

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
  }
};

interface POItem {
  id: string;
  name: string;
  quantity: number;
  price: number;
  total: number;
}

interface POData {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierType: 'business' | 'individual';
  businessName?: string;
  gstin?: string;
  staffName: string;
  staffAvatar: string;
  status: 'draft' | 'sent' | 'confirmed' | 'received' | 'cancelled';
  type: 'created' | 'received';
  amount: number;
  itemCount: number;
  date: string;
  expectedDelivery: string;
  supplierAvatar: string;
  items: POItem[];
  terms: string;
  notes: string;
  supplierId?: string;
  customerId?: string;
}

export default function PODetailsScreen() {
  const { poId, poData } = useLocalSearchParams();
  const { data: bizData } = useBusinessData();
  const [isEdited, setIsEdited] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [isAcknowledging, setIsAcknowledging] = useState(false);
  const [linkedInvoiceId, setLinkedInvoiceId] = useState<string | null>(null);
  const [isLoadingFromDB, setIsLoadingFromDB] = useState(!poData);

  const normalizeItems = (raw: any): POItem[] => {
    if (Array.isArray(raw.items) && raw.items.length > 0) {
      return raw.items.map((it: any) => ({
        id: it.id || it.productId || it.product_id || '',
        name: it.name || it.productName || it.product_name || '',
        quantity: it.quantity || 0,
        price: it.price || it.unitPrice || it.unit_price || 0,
        total: it.total || it.totalPrice || it.total_price || ((it.quantity || 0) * (it.price || it.unitPrice || it.unit_price || 0)),
      }));
    }
    if (Array.isArray(raw.products) && raw.products.length > 0) {
      return raw.products.map((p: any) => ({
        id: p.id || '',
        name: p.name || '',
        quantity: p.orderQuantity || p.quantity || 0,
        price: p.price || p.unitPrice || 0,
        total: (p.orderQuantity || p.quantity || 0) * (p.price || p.unitPrice || 0),
      }));
    }
    return [];
  };

  const parsePOData = (): POData => {
    if (poData) {
      try {
        const d = JSON.parse(poData as string);
        const items = normalizeItems(d);
        return {
          id: d.id || (poId as string) || '',
          poNumber: d.poNumber || d.po_number || '',
          supplierName: d.supplierName || d.supplier_name || d.supplier?.businessName || d.supplier?.name || '',
          supplierType: d.supplierType || d.supplier?.supplierType || 'business',
          businessName: d.businessName || d.supplier?.businessName || '',
          gstin: d.gstin || d.supplier?.gstin || '',
          staffName: d.staffName || d.staff_name || '',
          staffAvatar: d.staffAvatar || '',
          status: d.status || 'draft',
          type: d.type || 'created',
          amount: d.amount || d.grandTotal || d.totalAmount || d.total_amount || 0,
          itemCount: items.length || d.itemCount || 0,
          date: d.date || d.createdAt || d.order_date || d.created_at || '',
          expectedDelivery: d.expectedDelivery || d.expected_delivery || '',
          supplierAvatar: d.supplierAvatar || '',
          items,
          terms: d.terms || '',
          notes: d.notes || '',
          supplierId: d.supplierId || d.supplier_id || d.supplier?.id || '',
          customerId: d.customerId || '',
        };
      } catch (error) {
        console.error('Error parsing PO data:', error);
      }
    }

    return {
      id: (poId as string) || '',
      poNumber: '',
      supplierName: '',
      supplierType: 'business',
      businessName: '',
      gstin: '',
      staffName: '',
      staffAvatar: '',
      status: 'draft',
      type: 'created',
      amount: 0,
      itemCount: 0,
      date: '',
      expectedDelivery: '',
      supplierAvatar: '',
      items: [],
      terms: '',
      notes: '',
      supplierId: '',
      customerId: '',
    };
  };

  const [po, setPo] = useState<POData>(parsePOData());
  const [editForm, setEditForm] = useState<POData>(parsePOData());

  // Load PO from DB when opened via notification (no poData param) and fetch linked_invoice_id
  useEffect(() => {
    const resolvedId = Array.isArray(poId) ? poId[0] : poId;
    if (!resolvedId) return;

    (async () => {
      try {
        const { data: poRow } = await supabase
          .from('purchase_orders')
          .select('*, purchase_order_items(*)')
          .eq('id', resolvedId)
          .maybeSingle();

        if (poRow) {
          setLinkedInvoiceId(poRow.linked_invoice_id || null);

          if (!poData) {
            const items = (poRow.purchase_order_items || []).map((it: any) => ({
              id: it.id,
              name: it.product_name || '',
              quantity: it.quantity || 0,
              price: it.unit_price || 0,
              total: it.total_price || ((it.quantity || 0) * (it.unit_price || 0)),
            }));
            const loadedPO: POData = {
              id: poRow.id,
              poNumber: poRow.po_number || '',
              supplierName: poRow.supplier_name || '',
              supplierType: 'business',
              businessName: '',
              gstin: '',
              staffName: poRow.staff_name || '',
              staffAvatar: '',
              status: poRow.status || 'draft',
              type: 'created',
              amount: Number(poRow.total_amount) || 0,
              itemCount: items.length,
              date: poRow.order_date || poRow.created_at || '',
              expectedDelivery: poRow.expected_delivery || '',
              supplierAvatar: '',
              items,
              terms: '',
              notes: poRow.notes || '',
              supplierId: poRow.supplier_id || '',
              customerId: '',
            };
            setPo(loadedPO);
            setEditForm(loadedPO);
          }
        }
      } catch {} finally {
        setIsLoadingFromDB(false);
      }
    })();
  }, [poId]);

  const isAcknowledged = po.status === 'confirmed' || po.status === 'received';

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
      case 'confirmed':
        return Colors.success;
      case 'sent':
      case 'pending':
        return Colors.warning;
      case 'cancelled':
        return Colors.error;
      case 'draft':
        return Colors.textLight;
      default:
        return Colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received': return 'Invoice Created';
      case 'sent': return 'Sent';
      case 'confirmed': return 'Acknowledged';
      case 'draft': return 'Draft';
      case 'cancelled': return 'Cancelled';
      case 'pending': return 'Pending';
      default: return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
      case 'confirmed':
        return <CheckCircle size={20} color={Colors.success} />;
      case 'sent':
      case 'pending':
        return <Clock size={20} color={Colors.warning} />;
      case 'cancelled':
        return <AlertTriangle size={20} color={Colors.error} />;
      case 'draft':
        return <Package size={20} color={Colors.textLight} />;
      default:
        return <Package size={20} color={Colors.textLight} />;
    }
  };

  const formatAmount = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });
  };

  const handleEditPO = () => {
    setEditForm(po);
    setShowEditModal(true);
  };

  const handleSaveEdits = async () => {
    setPo(editForm);
    setIsEdited(true);
    setShowEditModal(false);

    // Persist changes to database
    try {
      const newTotal = editForm.items.reduce((sum, it) => sum + it.total, 0);
      await supabase
        .from('purchase_orders')
        .update({
          notes: editForm.notes || null,
          expected_delivery: editForm.expectedDelivery || null,
          total_amount: newTotal,
          updated_at: new Date().toISOString(),
        })
        .eq('id', po.id);

      // Notify supplier of the changes
      if (po.supplierId) {
        const { data: supplierRec } = await supabase
          .from('suppliers')
          .select('linked_user_id')
          .eq('id', po.supplierId)
          .maybeSingle();

        if (supplierRec?.linked_user_id) {
          const { data: supplierUser } = await supabase
            .from('users')
            .select('business_id')
            .eq('id', supplierRec.linked_user_id)
            .maybeSingle();

          if (supplierUser?.business_id) {
            const myBizName = bizData?.business?.legal_name || bizData?.business?.owner_name || 'Customer';
            await createInAppNotification({
              businessId: supplierUser.business_id,
              recipientId: supplierUser.business_id,
              recipientType: 'owner',
              title: 'Purchase Order Updated',
              message: `${myBizName} has updated PO ${po.poNumber}. Please review the changes.`,
              type: 'purchase_order',
              category: 'purchase',
              priority: 'medium',
              relatedEntityType: 'purchase_order',
              relatedEntityId: po.id,
              relatedEntityName: po.poNumber,
            });
          }
        }
      }
    } catch {}

    Alert.alert('PO Updated', 'Purchase Order has been updated and the supplier has been notified.');
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    Alert.alert('Edit Cancelled', 'Changes have been discarded.');
  };

  const handleViewSupplier = () => {
    safeRouter.push({
      pathname: '/purchasing/supplier-details',
      params: {
        supplierId: po.supplierId || 'supplier_001',
        supplierData: JSON.stringify({
          id: po.supplierId || 'supplier_001',
          name: po.supplierName,
          businessName: po.businessName,
          supplierType: po.supplierType,
          gstin: po.gstin,
          avatar: po.supplierAvatar
        })
      }
    });
  };

  const handleViewCustomer = () => {
    safeRouter.push({
      pathname: '/people/customer-details',
      params: {
        customerId: po.customerId || 'customer_001',
        customerData: JSON.stringify({
          id: po.customerId || 'customer_001',
          name: po.supplierName,
          businessName: po.businessName,
          customerType: 'business',
          gstin: po.gstin,
          avatar: po.supplierAvatar
        })
      }
    });
  };

  const [supplierPhone, setSupplierPhone] = useState<string>('');
  const [refreshing, setRefreshing] = useState(false);

  const fetchSupplierPhone = useCallback(async () => {
    if (po.supplierId) {
      try {
        const result = await getSuppliers();
        if (result.success && result.suppliers) {
          const found = result.suppliers.find((s: any) => s.id === po.supplierId);
          if (found) {
            setSupplierPhone(found.mobile_number || '');
          }
        }
      } catch (error) {
        console.error('Error fetching supplier phone:', error);
      }
    }
  }, [po.supplierId]);

  useEffect(() => {
    fetchSupplierPhone();
  }, [fetchSupplierPhone]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    fetchSupplierPhone().catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, [fetchSupplierPhone]);

  const handleSendToSupplier = () => {
    const title = isEdited ? 'Send Updated PO to Supplier' : 'Send PO to Supplier';
    const msg = isEdited
      ? `Updated PO ${po.poNumber} will be sent to the supplier with all changes listed.`
      : `PO ${po.poNumber} will be sent to the supplier.`;

    Alert.alert(title, msg, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Send',
        onPress: async () => {
          const businessId = bizData?.business?.id;
          if (!businessId || !po.supplierId) return;

          const supplierDisplayName = po.supplierType === 'business' ? po.businessName : po.supplierName;

          let linked = po.supplierBusinessId ? true : false;
          if (!linked) {
            const uid = await autoLinkSupplierToUser(po.supplierId);
            linked = !!uid;
          }
          if (!linked) {
            Alert.alert('Not on Manager', `${supplierDisplayName} is not on Manager yet.`);
            return;
          }

          const convResult = await getOrCreateConversation({
            businessId,
            otherPartyId: po.supplierId,
            otherPartyType: 'supplier',
            otherPartyName: supplierDisplayName,
          });

          if (convResult.success && convResult.conversation) {
            const content = isEdited
              ? `📋 Updated Purchase Order: ${po.poNumber}\n${po.products?.length || 0} item(s) · Total: ₹${po.grandTotal || po.totalAmount || 0}`
              : `📋 Purchase Order: ${po.poNumber}\n${po.products?.length || 0} item(s) · Total: ₹${po.grandTotal || po.totalAmount || 0}`;

            const senderType = convResult.crossBusiness ? 'supplier' : 'owner';
            const { data: { session } } = await (await import('@/lib/supabase')).supabase.auth.getSession();
            await sendMessage({
              conversationId: convResult.conversation.id,
              senderId: session?.user?.id || '',
              senderType,
              senderName: bizData?.business?.legal_name || bizData?.business?.owner_name || 'Owner',
              content,
              messageType: 'file',
              metadata: {
                document_type: 'purchase_order',
                entity_id: po.id || '',
                entity_number: po.poNumber,
              },
            });

            if (isEdited) setIsEdited(false);

            safeRouter.push({
              pathname: '/chat/conversation',
              params: {
                conversationId: convResult.conversation.id,
                name: supplierDisplayName,
                type: convResult.crossBusiness ? 'customer' : 'supplier',
                otherPartyId: po.supplierId,
                ...(convResult.crossBusiness ? { crossBusiness: 'true' } : {}),
              }
            });
          }
        }
      }
    ]);
  };

  const handleUpdateToCustomer = () => {
    if (isEdited) {
      Alert.alert(
        'Send Updated PO to Customer',
        `Updated PO ${po.poNumber} will be sent to the customer who sent this PO with all changes listed.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Send', 
            onPress: () => {
              safeRouter.push({
                pathname: '/people/customer-chat',
                params: {
                  customerId: po.customerId || 'customer_001',
                  customerName: po.supplierType === 'business' ? po.businessName : po.supplierName,
                  customerAvatar: po.supplierAvatar,
                  message: `Here is the updated PO ${po.poNumber}`,
                  poData: JSON.stringify(po),
                  isUpdated: 'true'
                }
              });
              setIsEdited(false);
            }
          }
        ]
      );
    } else {
      Alert.alert(
        'Send PO to Customer',
        `PO ${po.poNumber} will be sent to the customer who sent this PO.`,
        [
          { text: 'Cancel', style: 'cancel' },
          { 
            text: 'Send', 
            onPress: () => {
              safeRouter.push({
                pathname: '/people/customer-chat',
                params: {
                  customerId: po.customerId || 'customer_001',
                  customerName: po.supplierType === 'business' ? po.businessName : po.supplierName,
                  customerAvatar: po.supplierAvatar,
                  message: `Here is the PO ${po.poNumber}`,
                  poData: JSON.stringify(po)
                }
              });
            }
          }
        ]
      );
    }
  };

  const handleAcknowledgePO = async () => {
    Alert.alert(
      'Acknowledge Purchase Order',
      `Confirm that you have received PO ${po.poNumber} and will fulfill it?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Acknowledge',
          onPress: async () => {
            setIsAcknowledging(true);
            try {
              const result = await acknowledgePurchaseOrder(po.id);
              if (!result.success) {
                Alert.alert('Error', result.error || 'Failed to acknowledge PO');
                return;
              }
              setPo(prev => ({ ...prev, status: 'confirmed' }));

              // Notify the customer (PO creator) via in-app notification
              try {
                const { data: poRow } = await supabase
                  .from('purchase_orders')
                  .select('business_id')
                  .eq('id', po.id)
                  .single();
                if (poRow?.business_id) {
                  const myBizName = bizData?.business?.legal_name || bizData?.business?.owner_name || 'Supplier';
                  await createInAppNotification({
                    businessId: poRow.business_id,
                    recipientId: poRow.business_id,
                    recipientType: 'owner',
                    title: 'Purchase Order Acknowledged',
                    message: `${myBizName} has acknowledged PO ${po.poNumber} and will fulfill the order.`,
                    type: 'purchase_order',
                    category: 'purchase',
                    priority: 'medium',
                    relatedEntityType: 'purchase_order',
                    relatedEntityId: po.id,
                    relatedEntityName: po.poNumber,
                  });
                }
              } catch {}

              Alert.alert('Success', `PO ${po.poNumber} has been acknowledged. The customer has been notified.`);
            } catch (error: any) {
              Alert.alert('Error', error.message || 'Something went wrong');
            } finally {
              setIsAcknowledging(false);
            }
          },
        },
      ]
    );
  };

  const handleCreateInvoiceAgainstPO = () => {
    safeRouter.push({
      pathname: '/purchasing/create-invoice-against-po' as any,
      params: {
        poId: po.id,
        poNumber: po.poNumber,
        poData: JSON.stringify(po),
      },
    });
  };

  const handleDownload = () => {
    Alert.alert('Download', 'PO will be downloaded as PDF.');
  };

  const handleShare = () => {
    Alert.alert('Share', 'PO will be shared via available sharing options.');
  };

  const updateItem = (itemId: string, field: keyof POItem, value: any) => {
    setEditForm(prev => ({
      ...prev,
      items: prev.items.map(item => 
        item.id === itemId 
          ? { ...item, [field]: value, total: field === 'quantity' || field === 'price' 
              ? (field === 'quantity' ? value : item.quantity) * (field === 'price' ? value : item.price)
              : item.total
            }
          : item
      )
    }));
  };

  const updatePOField = (field: keyof POData, value: any) => {
    setEditForm(prev => ({ ...prev, [field]: value }));
  };

  if (isLoadingFromDB) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={[styles.safeArea, { justifyContent: 'center', alignItems: 'center' }]}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={{ color: Colors.textLight, marginTop: 12 }}>Loading PO...</Text>
        </SafeAreaView>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>PO Details</Text>

          <View style={styles.headerActions}>
            <TouchableOpacity style={styles.actionButton} onPress={handleDownload} activeOpacity={0.7}>
              <Download size={20} color={Colors.textLight} />
            </TouchableOpacity>
            <TouchableOpacity style={styles.actionButton} onPress={handleShare} activeOpacity={0.7}>
              <Share size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
          {/* PO Header */}
          <View style={styles.poHeader}>
            <View style={styles.poInfo}>
              <Text style={styles.poNumber}>{po.poNumber}</Text>
              <View style={styles.typeBadge}>
                <Text style={[styles.typeText, { color: po.type === 'created' ? Colors.primary : Colors.success }]}>
                  {po.type === 'created' ? 'Created' : 'Received'}
                </Text>
              </View>
            </View>
            <View style={styles.statusContainer}>
              {getStatusIcon(po.status)}
              <Text style={[styles.statusText, { color: getStatusColor(po.status) }]}>
                {getStatusText(po.status)}
              </Text>
            </View>
          </View>

          {/* Supplier/Customer Info with View Details Button */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>
                {po.type === 'created' ? 'Supplier Information' : 'From Business'}
              </Text>
              {po.type === 'created' && (
                <TouchableOpacity 
                  style={styles.viewDetailsButton}
                  onPress={handleViewSupplier}
                  activeOpacity={0.7}
                >
                  <User size={16} color={Colors.primary} />
                  <Text style={styles.viewDetailsText}>View Supplier</Text>
                </TouchableOpacity>
              )}
            </View>
            <View style={styles.supplierCard}>
              {po.supplierAvatar ? (
                <Image source={{ uri: po.supplierAvatar }} style={styles.supplierAvatar} />
              ) : (
                <View style={[styles.supplierAvatar, { backgroundColor: getAvatarColor(po.supplierType === 'business' ? po.businessName : po.supplierName), justifyContent: 'center', alignItems: 'center' }]}>
                  <Text style={{ fontSize: 16, fontWeight: '700', color: '#FFFFFF' }}>
                    {getInitials(po.supplierType === 'business' ? po.businessName || po.supplierName : po.supplierName)}
                  </Text>
                </View>
              )}
              <View style={styles.supplierDetails}>
                <Text style={styles.supplierName}>{po.supplierName}</Text>
                {po.gstin && (
                  <Text style={styles.gstin}>GSTIN: {po.gstin}</Text>
                )}
                <Text style={styles.supplierType}>
                  {po.supplierType === 'business' ? 'Business' : 'Individual'}
                </Text>
              </View>
            </View>
          </View>

          {/* PO Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Purchase Order Details</Text>
            <View style={styles.detailsGrid}>
              <View style={styles.detailItem}>
                <Calendar size={16} color={Colors.textLight} />
                <Text style={styles.detailLabel}>PO Date</Text>
                <Text style={styles.detailValue}>{formatDate(po.date)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Package size={16} color={Colors.textLight} />
                <Text style={styles.detailLabel}>Items</Text>
                <Text style={styles.detailValue}>{po.itemCount}</Text>
              </View>
              <View style={styles.detailItem}>
                <IndianRupee size={16} color={Colors.textLight} />
                <Text style={styles.detailLabel}>Total Amount</Text>
                <Text style={styles.detailValue}>{formatAmount(po.amount)}</Text>
              </View>
              <View style={styles.detailItem}>
                <Truck size={16} color={Colors.textLight} />
                <Text style={styles.detailLabel}>Expected Delivery</Text>
                <Text style={styles.detailValue}>{formatDate(po.expectedDelivery)}</Text>
              </View>
            </View>
          </View>

          {/* Terms & Conditions */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Terms & Conditions</Text>
            <View style={styles.termsCard}>
              <View style={styles.termsRow}>
                <Text style={styles.termsLabel}>Payment Terms:</Text>
                <Text style={styles.termsValue}>{po.terms}</Text>
              </View>
              {po.notes && (
                <View style={styles.notesContainer}>
                  <Text style={styles.notesLabel}>Notes:</Text>
                  <Text style={styles.notesValue}>{po.notes}</Text>
                </View>
              )}
            </View>
          </View>

          {/* Items List */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Order Items</Text>
            {po.items.map((item, index) => (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <Text style={styles.itemName}>{item.name}</Text>
                  <Text style={styles.itemTotal}>{formatAmount(item.total)}</Text>
                </View>
                <View style={styles.itemDetails}>
                  <Text style={styles.itemQuantity}>Qty: {item.quantity}</Text>
                  <Text style={styles.itemPrice}>Price: {formatAmount(item.price)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Staff Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Ordered By</Text>
            <View style={styles.staffCard}>
              <Image source={{ uri: po.staffAvatar }} style={styles.staffAvatar} />
              <View style={styles.staffDetails}>
                <Text style={styles.staffName}>{po.staffName || 'N/A'}</Text>
                <Text style={styles.staffRole}>Created By</Text>
              </View>
            </View>
          </View>

          {/* Linked Invoice */}
          {linkedInvoiceId && (
            <View style={styles.section}>
              <TouchableOpacity
                style={[styles.primaryButton, { backgroundColor: Colors.success }]}
                onPress={() => safeRouter.push({ pathname: '/invoice-details', params: { invoiceId: linkedInvoiceId } })}
                activeOpacity={0.7}
              >
                <FileText size={16} color={Colors.background} />
                <Text style={styles.primaryButtonText}>View Invoice Against This PO</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.section}>
            <View style={styles.actionButtons}>
              {po.type === 'created' && !isAcknowledged && (
                <TouchableOpacity style={styles.secondaryButton} onPress={handleEditPO} activeOpacity={0.7}>
                  <Edit3 size={16} color={Colors.text} />
                  <Text style={styles.secondaryButtonText}>Edit PO</Text>
                </TouchableOpacity>
              )}

              {po.type === 'created' ? (
                isAcknowledged && linkedInvoiceId ? null : (
                  <TouchableOpacity style={[styles.primaryButton]} onPress={handleSendToSupplier} activeOpacity={0.7}>
                    <Send size={16} color={Colors.background} />
                    <Text style={styles.primaryButtonText}>
                      {isEdited ? 'Send Updated PO to Supplier' : 'Send to Supplier'}
                    </Text>
                  </TouchableOpacity>
                )
              ) : (
                <>
                  {po.status !== 'confirmed' && po.status !== 'received' ? (
                    <TouchableOpacity
                      style={[styles.primaryButton, { flex: 1 }]}
                      onPress={handleAcknowledgePO}
                      disabled={isAcknowledging}
                      activeOpacity={0.7}
                    >
                      {isAcknowledging ? (
                        <ActivityIndicator size="small" color={Colors.background} />
                      ) : (
                        <CheckCircle size={16} color={Colors.background} />
                      )}
                      <Text style={styles.primaryButtonText}>
                        {isAcknowledging ? 'Acknowledging...' : 'Acknowledge PO'}
                      </Text>
                    </TouchableOpacity>
                  ) : linkedInvoiceId ? null : (
                    <TouchableOpacity
                      style={[styles.primaryButton, { flex: 1, backgroundColor: Colors.success }]}
                      onPress={handleCreateInvoiceAgainstPO}
                      activeOpacity={0.7}
                    >
                      <FileText size={16} color={Colors.background} />
                      <Text style={styles.primaryButtonText}>Create Invoice</Text>
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
          </View>
        </ScrollView>

        {/* Edit PO Modal */}
        <Modal
          visible={showEditModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Edit Purchase Order</Text>
              <TouchableOpacity onPress={handleCancelEdit} activeOpacity={0.7}>
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalContent}>
              {/* Basic PO Info */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>PO Information</Text>
                
                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>PO Number</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.poNumber}
                    onChangeText={(value) => updatePOField('poNumber', value)}
                    placeholder="Enter PO number"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Expected Delivery Date</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.expectedDelivery}
                    onChangeText={(value) => updatePOField('expectedDelivery', value)}
                    placeholder="YYYY-MM-DD"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Payment Terms</Text>
                  <TextInput
                    style={styles.textInput}
                    value={editForm.terms}
                    onChangeText={(value) => updatePOField('terms', value)}
                    placeholder="Enter payment terms"
                  />
                </View>

                <View style={styles.inputGroup}>
                  <Text style={styles.inputLabel}>Notes</Text>
                  <TextInput
                    style={[styles.textInput, styles.textArea]}
                    value={editForm.notes}
                    onChangeText={(value) => updatePOField('notes', value)}
                    placeholder="Enter additional notes"
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>

              {/* Items */}
              <View style={styles.modalSection}>
                <Text style={styles.modalSectionTitle}>Order Items</Text>
                {editForm.items.map((item, index) => (
                  <View key={item.id} style={styles.itemEditCard}>
                    <Text style={styles.itemEditName}>{item.name}</Text>
                    
                    <View style={styles.itemEditRow}>
                      <View style={styles.itemEditField}>
                        <Text style={styles.itemEditLabel}>Quantity</Text>
                        <TextInput
                          style={styles.itemEditInput}
                          value={item.quantity.toString()}
                          onChangeText={(value) => updateItem(item.id, 'quantity', parseInt(value) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                      
                      <View style={styles.itemEditField}>
                        <Text style={styles.itemEditLabel}>Price (₹)</Text>
                        <TextInput
                          style={styles.itemEditInput}
                          value={item.price.toString()}
                          onChangeText={(value) => updateItem(item.id, 'price', parseInt(value) || 0)}
                          keyboardType="numeric"
                        />
                      </View>
                    </View>
                    
                    <Text style={styles.itemEditTotal}>Total: {formatAmount(item.total)}</Text>
                  </View>
                ))}
              </View>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity style={styles.cancelButton} onPress={handleCancelEdit} activeOpacity={0.7}>
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.saveButton} onPress={handleSaveEdits} activeOpacity={0.7}>
                <Text style={styles.saveButtonText}>Save Changes</Text>
              </TouchableOpacity>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 12,
  },
  actionButton: {
    padding: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  poHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 24,
  },
  poInfo: {
    flex: 1,
  },
  poNumber: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  typeBadge: {
    backgroundColor: Colors.grey[100],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    alignSelf: 'flex-start',
  },
  typeText: {
    fontSize: 12,
    fontWeight: '600',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  statusText: {
    fontSize: 14,
    fontWeight: '600',
  },
  section: {
    marginBottom: 24,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  viewDetailsButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.grey[50],
    borderRadius: 16,
  },
  viewDetailsText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  supplierCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  supplierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  supplierDetails: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  gstin: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 2,
  },
  supplierType: {
    fontSize: 12,
    color: Colors.textLight,
  },
  detailsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  detailItem: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.grey[50],
    padding: 16,
    borderRadius: 12,
    alignItems: 'center',
    gap: 8,
  },
  detailLabel: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
  detailValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  termsCard: {
    backgroundColor: Colors.grey[50],
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  termsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termsLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  termsValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  notesContainer: {
    gap: 4,
  },
  notesLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  notesValue: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  itemCard: {
    backgroundColor: Colors.grey[50],
    padding: 16,
    borderRadius: 12,
    marginBottom: 8,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  itemDetails: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  itemQuantity: {
    fontSize: 14,
    color: Colors.textLight,
  },
  itemPrice: {
    fontSize: 14,
    color: Colors.textLight,
  },
  staffCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    padding: 16,
    borderRadius: 12,
    gap: 12,
  },
  staffAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
  },
  staffDetails: {
    flex: 1,
  },
  staffName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  staffRole: {
    fontSize: 14,
    color: Colors.textLight,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  secondaryButton: {
    flex: 1,
    backgroundColor: Colors.grey[100],
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  primaryButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.background,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  modalContent: {
    flex: 1,
    padding: 16,
  },
  modalSection: {
    marginBottom: 24,
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  textInput: {
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  itemEditCard: {
    backgroundColor: Colors.grey[50],
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
  },
  itemEditName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  itemEditRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 8,
  },
  itemEditField: {
    flex: 1,
  },
  itemEditLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  itemEditInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 6,
    fontSize: 14,
    color: Colors.text,
  },
  itemEditTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'right',
  },
  modalFooter: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.grey[100],
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  saveButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.background,
  },
}); 