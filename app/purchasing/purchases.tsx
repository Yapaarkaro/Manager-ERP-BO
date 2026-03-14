import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  RefreshControl,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWebBackNavigation } from '@/hooks/useWebBackNavigation';
import { safeRouter } from '@/utils/safeRouter';
import { setNavData } from '@/utils/navStore';
import { getPurchaseInvoices, getPurchaseOrders, invalidateApiCache } from '@/services/backendApi';
import { supabase } from '@/lib/supabase';
import { ArrowLeft, Search, Filter, Download, Share, Eye, ShoppingCart, Plus, FileText, User, Building2, Calendar, Banknote, Smartphone, CreditCard, IndianRupee, Package, Truck, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, X, ChevronDown } from 'lucide-react-native';
import { ListSkeleton } from '@/components/SkeletonLoader';
import { formatCurrencyINR } from '@/utils/formatters';

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

interface PurchaseInvoice {
  id: string;
  poNumber: string;
  invoiceNumber: string;
  supplierName: string;
  supplierType: 'business' | 'individual';
  businessName?: string;
  gstin?: string;
  staffName: string;
  staffAvatar: string;
  status: 'pending' | 'received' | 'partial' | 'cancelled';
  paymentStatus: 'paid' | 'pending' | 'overdue';
  paymentMethod: 'cash' | 'upi' | 'card' | 'bank_transfer';
  amount: number;
  itemCount: number;
  itemNames: string[];
  date: string;
  expectedDelivery: string;
  actualDelivery?: string;
  supplierAvatar: string;
  contactPerson?: string;
  contactPhone?: string;
  paidAmount: number;
  balanceDue: number;
}

interface PurchaseOrder {
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
  supplierId?: string;
  customerId?: string;
}

const DEFAULT_AVATAR = '';

const INVOICE_SEARCH_HINTS = [
  'invoice number',
  'supplier name',
  'item name',
  'date',
  'GSTIN',
  'contact person',
  'phone number',
];

const ORDER_SEARCH_HINTS = [
  'PO number',
  'supplier name',
  'GSTIN',
  'order date',
  'supplier contact',
];

function useTypewriterPlaceholder(phrases: string[], typingSpeed = 60, pauseMs = 1800, deleteSpeed = 30) {
  const [text, setText] = useState('');
  const phraseIdx = useRef(0);
  const charIdx = useRef(0);
  const isDeleting = useRef(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    phraseIdx.current = 0;
    charIdx.current = 0;
    isDeleting.current = false;
    setText('');
  }, [phrases]);

  useEffect(() => {
    const tick = () => {
      const current = phrases[phraseIdx.current];
      if (!current) return;

      if (!isDeleting.current) {
        charIdx.current++;
        setText(current.slice(0, charIdx.current));
        if (charIdx.current >= current.length) {
          isDeleting.current = true;
          timerRef.current = setTimeout(tick, pauseMs);
          return;
        }
        timerRef.current = setTimeout(tick, typingSpeed);
      } else {
        charIdx.current--;
        setText(current.slice(0, charIdx.current));
        if (charIdx.current <= 0) {
          isDeleting.current = false;
          phraseIdx.current = (phraseIdx.current + 1) % phrases.length;
          timerRef.current = setTimeout(tick, typingSpeed * 2);
          return;
        }
        timerRef.current = setTimeout(tick, deleteSpeed);
      }
    };

    timerRef.current = setTimeout(tick, 400);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [phrases, typingSpeed, pauseMs, deleteSpeed]);

  return text;
}

function mapDbInvoiceToLocal(db: any): PurchaseInvoice {
  const deliveryStatus = (db.delivery_status || 'pending').toLowerCase();
  const paymentStatus = (db.payment_status || 'pending').toLowerCase();
  const statusMap: Record<string, PurchaseInvoice['status']> = {
    pending: 'pending',
    received: 'received',
    partial: 'partial',
    cancelled: 'cancelled',
  };
  const paymentStatusMap: Record<string, PurchaseInvoice['paymentStatus']> = {
    paid: 'paid',
    pending: 'pending',
    overdue: 'overdue',
  };
  const paymentMethodMap: Record<string, PurchaseInvoice['paymentMethod']> = {
    cash: 'cash',
    upi: 'upi',
    card: 'card',
    bank_transfer: 'bank_transfer',
  };
  return {
    id: db.id,
    poNumber: db.po_number || '',
    invoiceNumber: db.invoice_number || '',
    supplierName: db.supplier_name || '',
    supplierType: 'business',
    gstin: db.supplier_gstin || db.gstin || '',
    staffName: db.staff_name || '',
    staffAvatar: DEFAULT_AVATAR,
    status: statusMap[deliveryStatus] ?? 'pending',
    paymentStatus: paymentStatusMap[paymentStatus] ?? 'pending',
    paymentMethod: paymentMethodMap[(db.payment_method || 'cash').toLowerCase()] ?? 'cash',
    amount: Number(db.total_amount) || 0,
    itemCount: Array.isArray(db.items) ? db.items.length : 0,
    itemNames: Array.isArray(db.items) ? db.items.map((i: any) => i.product_name || i.productName || '').filter(Boolean) : [],
    date: db.invoice_date || db.created_at || new Date().toISOString(),
    expectedDelivery: db.expected_delivery ? String(db.expected_delivery) : '',
    actualDelivery: db.actual_delivery ? String(db.actual_delivery) : undefined,
    supplierAvatar: DEFAULT_AVATAR,
    contactPerson: db.contact_person || db.supplier_contact_person || '',
    contactPhone: db.contact_phone || db.supplier_phone || '',
    paidAmount: Number(db.paid_amount || db.amount_paid) || 0,
    balanceDue: Math.max(0, (Number(db.total_amount) || 0) - (Number(db.paid_amount || db.amount_paid) || 0)),
  };
}

function mapDbOrderToLocal(db: any): PurchaseOrder {
  const status = (db.status || 'draft').toLowerCase();
  const statusMap: Record<string, PurchaseOrder['status']> = {
    draft: 'draft',
    sent: 'sent',
    confirmed: 'confirmed',
    received: 'received',
    cancelled: 'cancelled',
  };
  return {
    id: db.id,
    poNumber: db.po_number || '',
    supplierName: db.supplier_name || '',
    supplierType: 'business',
    staffName: db.staff_name || '',
    staffAvatar: DEFAULT_AVATAR,
    status: statusMap[status] ?? 'draft',
    type: 'created',
    amount: Number(db.total_amount) || 0,
    itemCount: Array.isArray(db.items) ? db.items.length : 0,
    date: db.order_date || db.created_at || new Date().toISOString(),
    expectedDelivery: db.expected_delivery ? String(db.expected_delivery) : '',
    supplierAvatar: DEFAULT_AVATAR,
    supplierId: db.supplier_id,
  };
}

export default function PurchasesScreen() {
  const { handleBack } = useWebBackNavigation();
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'invoices' | 'orders'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);
  const searchHints = activeTab === 'invoices' ? INVOICE_SEARCH_HINTS : ORDER_SEARCH_HINTS;
  const typewriterText = useTypewriterPlaceholder(searchHints);
  const [poFilter, setPoFilter] = useState<'all' | 'created' | 'received'>('all');
  const [purchaseInvoices, setPurchaseInvoices] = useState<PurchaseInvoice[]>([]);
  const [rawInvoices, setRawInvoices] = useState<any[]>([]);
  const [purchaseOrders, setPurchaseOrders] = useState<PurchaseOrder[]>([]);
  const [rawOrders, setRawOrders] = useState<any[]>([]);
  const receivedPORawRef = useRef<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const [invoicesResult, ordersResult] = await Promise.all([
        getPurchaseInvoices(),
        getPurchaseOrders(),
      ]);
      if (invoicesResult.success && invoicesResult.invoices) {
        setRawInvoices(invoicesResult.invoices);
        setPurchaseInvoices(invoicesResult.invoices.map(mapDbInvoiceToLocal));
      }

      const createdOrders = (ordersResult.success && ordersResult.orders)
        ? ordersResult.orders.map(mapDbOrderToLocal)
        : [];

      // Fetch POs received from other businesses (where I am the supplier)
      let receivedOrders: PurchaseOrder[] = [];
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (session?.user) {
          const { data: mySupplierRecords } = await supabase
            .from('suppliers')
            .select('id')
            .eq('linked_user_id', session.user.id);

          if (mySupplierRecords && mySupplierRecords.length > 0) {
            const supplierIds = mySupplierRecords.map(s => s.id);
            const { data: incomingPOs } = await supabase
              .from('purchase_orders')
              .select('*, purchase_order_items(*)')
              .in('supplier_id', supplierIds)
              .eq('is_deleted', false)
              .order('created_at', { ascending: false });

            if (incomingPOs) {
              const createdIds = new Set(createdOrders.map(o => o.id));
              const rawMap: Record<string, any> = {};
              receivedOrders = incomingPOs
                .filter(po => !createdIds.has(po.id))
                .map(po => {
                  rawMap[po.id] = po;
                  return {
                    id: po.id,
                    poNumber: po.po_number || '',
                    supplierName: po.supplier_name || '',
                    supplierType: 'business' as const,
                    staffName: po.staff_name || '',
                    staffAvatar: DEFAULT_AVATAR,
                    status: (po.status || 'sent') as PurchaseOrder['status'],
                    type: 'received' as const,
                    amount: Number(po.total_amount) || 0,
                    itemCount: Array.isArray(po.purchase_order_items) ? po.purchase_order_items.length : 0,
                    date: po.order_date || po.created_at || new Date().toISOString(),
                    expectedDelivery: po.expected_delivery ? String(po.expected_delivery) : '',
                    supplierAvatar: DEFAULT_AVATAR,
                    supplierId: po.supplier_id,
                  };
                });

              // Resolve sender business names for received POs
              const bizIds = [...new Set(incomingPOs.map(po => po.business_id).filter(Boolean))];
              if (bizIds.length > 0) {
                const { data: businesses } = await supabase
                  .from('businesses')
                  .select('id, legal_name, owner_name')
                  .in('id', bizIds);
                if (businesses) {
                  const bizMap = new Map(businesses.map(b => [b.id, b.legal_name || b.owner_name || 'Unknown Business']));
                  receivedOrders = receivedOrders.map((ro, idx) => {
                    const originalPo = incomingPOs.find(p => p.id === ro.id);
                    const fromBiz = originalPo ? bizMap.get(originalPo.business_id) : undefined;
                    return { ...ro, supplierName: fromBiz || ro.supplierName };
                  });
                }
              }
              receivedPORawRef.current = rawMap;
            }
          }
        }
      } catch {}

      const allRawOrders = ordersResult.success && ordersResult.orders ? ordersResult.orders : [];
      setRawOrders(allRawOrders);
      setPurchaseOrders([...createdOrders, ...receivedOrders]);
    } catch (error) {
      console.error('Error loading purchases:', error);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    loadData().catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, [loadData]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
  };

  const handleTabChange = (tab: 'invoices' | 'orders') => {
    setActiveTab(tab);
    setSearchQuery('');
  };

  const handlePoFilterChange = (filter: 'all' | 'created' | 'received') => {
    setPoFilter(filter);
  };

  const filteredInvoices = purchaseInvoices.filter(invoice => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    const dateStr = (() => { try { return new Date(invoice.date).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).toLowerCase(); } catch { return ''; } })();
    return (
      invoice.invoiceNumber.toLowerCase().includes(q) ||
      invoice.supplierName.toLowerCase().includes(q) ||
      invoice.poNumber.toLowerCase().includes(q) ||
      (invoice.gstin || '').toLowerCase().includes(q) ||
      (invoice.contactPerson || '').toLowerCase().includes(q) ||
      (invoice.contactPhone || '').includes(q) ||
      dateStr.includes(q) ||
      invoice.itemNames.some(name => name.toLowerCase().includes(q))
    );
  });

  const filteredOrders = purchaseOrders.filter(order => {
    const q = searchQuery.toLowerCase();
    const matchesSearch = !searchQuery.trim() ||
      order.poNumber.toLowerCase().includes(q) ||
      order.supplierName.toLowerCase().includes(q) ||
      (order.gstin || '').toLowerCase().includes(q);
    
    if (poFilter === 'all') return matchesSearch;
    return matchesSearch && order.type === poFilter;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
      case 'confirmed':
      case 'paid':
        return Colors.success;
      case 'pending':
      case 'sent':
        return Colors.warning;
      case 'partial':
      case 'overdue':
        return Colors.error;
      case 'cancelled':
      case 'draft':
        return Colors.textLight;
      default:
        return Colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received':
        return 'Received';
      case 'pending':
        return 'Pending';
      case 'partial':
        return 'Partial';
      case 'cancelled':
        return 'Cancelled';
      case 'sent':
        return 'Sent';
      case 'confirmed':
        return 'Confirmed';
      case 'draft':
        return 'Draft';
      case 'paid':
        return 'Paid';
      case 'overdue':
        return 'Overdue';
      default:
        return status;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'received':
      case 'confirmed':
      case 'paid':
        return <CheckCircle size={16} color={Colors.success} />;
      case 'pending':
      case 'sent':
        return <Clock size={16} color={Colors.warning} />;
      case 'partial':
      case 'overdue':
        return <AlertTriangle size={16} color={Colors.error} />;
      case 'cancelled':
      case 'draft':
        return <FileText size={16} color={Colors.textLight} />;
      default:
        return <FileText size={16} color={Colors.textLight} />;
    }
  };

  const getPaymentMethodIcon = (method: string) => {
    switch (method) {
      case 'cash':
        return <Banknote size={16} color={Colors.success} />;
      case 'upi':
        return <Smartphone size={16} color={Colors.primary} />;
      case 'card':
        return <CreditCard size={16} color={Colors.warning} />;
      case 'bank_transfer':
        return <Building2 size={16} color={Colors.primary} />;
      default:
        return <Banknote size={16} color={Colors.textLight} />;
    }
  };

  const formatAmount = (amount: number) => formatCurrencyINR(amount);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleInvoicePress = (invoice: PurchaseInvoice) => {
    const raw = rawInvoices.find(r => r.id === invoice.id);
    if (raw) setNavData('purchaseInvoiceData', raw);
    safeRouter.push({
      pathname: '/purchasing/invoice-details',
      params: { invoiceId: invoice.id }
    });
  };

  const handleOrderPress = (order: PurchaseOrder) => {
    let dataToPass: any;
    if (order.type === 'received') {
      const rawReceived = receivedPORawRef.current[order.id];
      const items = rawReceived?.purchase_order_items?.map((it: any) => ({
        id: it.id,
        name: it.product_name || it.name || '',
        description: it.description || '',
        quantity: it.quantity || 0,
        price: it.unit_price || it.price || 0,
        total: it.total_price || ((it.quantity || 0) * (it.unit_price || it.price || 0)),
      })) || [];
      dataToPass = { ...order, items };
    } else {
      const raw = rawOrders.find(r => r.id === order.id);
      dataToPass = raw ? { ...order, items: raw.items } : order;
    }
    safeRouter.push({
      pathname: '/purchasing/po-details',
      params: {
        poId: order.id,
        poData: JSON.stringify(dataToPass)
      }
    });
  };

  const handleCreatePO = () => {
    const { canPerformAction } = require('@/utils/trialUtils');
    if (!canPerformAction('create purchase order')) return;
    safeRouter.push('/purchasing/select-supplier');
  };

  const handleAddPurchaseInvoice = () => {
    const { canPerformAction } = require('@/utils/trialUtils');
    if (!canPerformAction('add purchase invoice')) return;
    safeRouter.push({
      pathname: '/purchasing/add-purchase-invoice' as any
    });
  };

  const renderInvoiceCard = (invoice: PurchaseInvoice) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleInvoicePress(invoice)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          {invoice.poNumber ? <Text style={styles.poNumber}>PO: {invoice.poNumber}</Text> : null}
          <Text style={styles.cardDate}>{formatDate(invoice.date)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={styles.statusContainer}>
            {getStatusIcon(invoice.status)}
            <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
              {getStatusText(invoice.status)}
            </Text>
          </View>
          <Text style={styles.cardAmount}>{formatAmount(invoice.amount)}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.supplierInfo}>
          <View style={styles.supplierIconBg}>
            <Building2 size={18} color={Colors.primary} />
          </View>
          <View style={styles.supplierDetails}>
            <Text style={styles.supplierName}>{invoice.supplierName || ''}</Text>
            {invoice.gstin && (
              <Text style={styles.gstin}>GSTIN: {invoice.gstin}</Text>
            )}
          </View>
        </View>

        {invoice.itemNames.length > 0 && (
          <Text style={styles.itemNamesList} numberOfLines={1}>
            {invoice.itemCount === 1
              ? invoice.itemNames[0]
              : `${invoice.itemCount} items`}
          </Text>
        )}

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Text style={styles.itemCount}>{invoice.itemCount} item{invoice.itemCount !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.footerRight}>
            <View style={styles.paymentInfo}>
              {getPaymentMethodIcon(invoice.paymentMethod)}
              <Text style={[styles.paymentStatus, { color: getStatusColor(invoice.paymentStatus) }]}>
                {invoice.paymentStatus === 'paid'
                  ? 'Paid'
                  : invoice.balanceDue > 0
                    ? `Due: ${formatAmount(invoice.balanceDue)}`
                    : `Pending: ${formatAmount(invoice.amount)}`}
              </Text>
            </View>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderOrderCard = (order: PurchaseOrder) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => handleOrderPress(order)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.invoiceNumber}>{order.poNumber}</Text>
          <View style={styles.typeBadge}>
            <Text style={[styles.typeText, { color: order.type === 'created' ? Colors.primary : Colors.success }]}>
              {order.type === 'created' ? 'Created' : 'Received'}
            </Text>
          </View>
          <Text style={styles.cardDate}>{formatDate(order.date)}</Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 6 }}>
          <View style={styles.statusContainer}>
            {getStatusIcon(order.status)}
            <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
              {getStatusText(order.status)}
            </Text>
          </View>
          <Text style={styles.cardAmount}>{formatAmount(order.amount)}</Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.supplierInfo}>
          <View style={[styles.supplierIconBg, order.type === 'received' && { backgroundColor: '#ecfdf5' }]}>
            <Building2 size={18} color={order.type === 'received' ? Colors.success : Colors.primary} />
          </View>
          <View style={styles.supplierDetails}>
            <Text style={styles.supplierName}>
              {order.type === 'received' ? `From: ${order.supplierName || 'Unknown'}` : (order.supplierName || '')}
            </Text>
            {order.gstin && (
              <Text style={styles.gstin}>GSTIN: {order.gstin}</Text>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Text style={styles.itemCount}>{order.itemCount} item{order.itemCount !== 1 ? 's' : ''}</Text>
          </View>
          <View style={styles.footerRight}>
            {order.expectedDelivery ? <Text style={styles.expectedDelivery}>Expected: {formatDate(order.expectedDelivery)}</Text> : null}
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Purchases</Text>
        </View>

        {isLoading ? (
          <ListSkeleton itemCount={6} showSearch={true} showFilter={false} />
        ) : (
          <>
        {/* Search Bar */}
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <View style={styles.searchInputWrap}>
              <TextInput
                style={styles.searchInput}
                value={searchQuery}
                onChangeText={handleSearch}
                onFocus={() => setSearchFocused(true)}
                onBlur={() => setSearchFocused(false)}
              />
              {!searchQuery && !searchFocused && (
                <View style={styles.typewriterWrap} pointerEvents="none">
                  <Text style={styles.typewriterStatic}>Search by </Text>
                  <Text style={styles.typewriterText}>{typewriterText}</Text>
                  <Text style={styles.typewriterCursor}>|</Text>
                </View>
              )}
            </View>
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => console.log('Filter purchases')}
              activeOpacity={0.7}
            >
              <Filter size={20} color="#FFFFFF" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'invoices' && styles.activeTab]}
            onPress={() => handleTabChange('invoices')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'invoices' && styles.activeTabText]}>
              Purchase Invoices
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.tab, activeTab === 'orders' && styles.activeTab]}
            onPress={() => handleTabChange('orders')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, activeTab === 'orders' && styles.activeTabText]}>
              Purchase Orders
            </Text>
          </TouchableOpacity>
        </View>

        {/* PO Filter (only for orders tab) */}
        {activeTab === 'orders' && (
          <View style={styles.filterContainer}>
                         <TouchableOpacity
               style={[styles.poFilterButton, poFilter === 'all' && styles.activeFilterButton]}
               onPress={() => handlePoFilterChange('all')}
               activeOpacity={0.7}
             >
               <Text style={[styles.filterText, poFilter === 'all' && styles.activeFilterText]}>
                 All
               </Text>
             </TouchableOpacity>
             <TouchableOpacity
               style={[styles.poFilterButton, poFilter === 'created' && styles.activeFilterButton]}
               onPress={() => handlePoFilterChange('created')}
               activeOpacity={0.7}
             >
               <Text style={[styles.filterText, poFilter === 'created' && styles.activeFilterText]}>
                 Created
               </Text>
             </TouchableOpacity>
             <TouchableOpacity
               style={[styles.poFilterButton, poFilter === 'received' && styles.activeFilterButton]}
               onPress={() => handlePoFilterChange('received')}
               activeOpacity={0.7}
             >
               <Text style={[styles.filterText, poFilter === 'received' && styles.activeFilterText]}>
                 Received
               </Text>
             </TouchableOpacity>
          </View>
        )}



        {/* Content */}
        <View style={styles.content}>
          <FlatList
            data={activeTab === 'invoices' ? filteredInvoices : filteredOrders}
            keyExtractor={(item) => item.id}
            renderItem={({ item }) =>
              activeTab === 'invoices'
                ? renderInvoiceCard(item as PurchaseInvoice)
                : renderOrderCard(item as PurchaseOrder)
            }
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
            refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
            ListEmptyComponent={
              activeTab === 'invoices' ? (
                <View style={styles.emptyState}>
                  <FileText size={48} color={Colors.textLight} />
                  <Text style={styles.emptyStateTitle}>No Purchase Invoices</Text>
                  <Text style={styles.emptyStateText}>
                    {searchQuery ? 'No invoices found matching your search.' : 'You haven\'t received any purchase invoices yet.'}
                  </Text>
                </View>
              ) : (
                <View style={styles.emptyState}>
                  <ShoppingCart size={48} color={Colors.textLight} />
                  <Text style={styles.emptyStateTitle}>No Purchase Orders</Text>
                  <Text style={styles.emptyStateText}>
                    {searchQuery ? 'No orders found matching your search.' : 'You haven\'t created any purchase orders yet.'}
                  </Text>
                </View>
              )
            }
          />

          {/* FAB for both tabs */}
          <TouchableOpacity
            style={styles.fab}
            onPress={activeTab === 'invoices' ? handleAddPurchaseInvoice : handleCreatePO}
            activeOpacity={0.8}
          >
            <Plus size={20} color={Colors.background} />
            <Text style={styles.fabText}>
              {activeTab === 'invoices' ? 'Add Invoice' : 'Create PO'}
            </Text>
          </TouchableOpacity>
        </View>
          </>
        )}
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
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  tabContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
    borderRadius: 8,
  },
  activeTab: {
    backgroundColor: Colors.primary + '20',
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  filterContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  poFilterButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
  },
  activeFilterButton: {
    backgroundColor: Colors.primary + '20',
  },
  filterText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeFilterText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  createPoContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  createPoButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 8,
    gap: 8,
  },
  createPoText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  content: {
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    paddingBottom: 100, // Space for FAB
  },
  card: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  cardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cardHeaderLeft: {
    flex: 1,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  poNumber: {
    fontSize: 14,
    color: Colors.textLight,
  },
  cardDate: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  cardAmount: {
    fontSize: 17,
    fontWeight: '700',
    color: Colors.text,
  },
  typeBadge: {
    backgroundColor: Colors.grey[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    alignSelf: 'flex-start',
    marginTop: 4,
  },
  typeText: {
    fontSize: 12,
    fontWeight: '500',
  },
  statusContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '500',
  },
  cardBody: {
    gap: 12,
  },
  supplierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  supplierIconBg: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary + '10',
    justifyContent: 'center',
    alignItems: 'center',
  },
  supplierDetails: {
    flex: 1,
  },
  supplierName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  gstin: {
    fontSize: 12,
    color: Colors.textLight,
  },
  cardFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
  },
  footerLeft: {
    gap: 4,
  },
  amount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  itemCount: {
    fontSize: 12,
    color: Colors.textLight,
  },
  itemNamesList: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
    marginTop: -4,
  },
  footerRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  paymentInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  paymentStatus: {
    fontSize: 12,
    fontWeight: '500',
  },
  date: {
    fontSize: 12,
    color: Colors.textLight,
  },
  expectedDelivery: {
    fontSize: 11,
    color: Colors.textLight,
  },

  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    minHeight: 52,
  },
  searchInputWrap: {
    flex: 1,
    marginLeft: 12,
    marginRight: 12,
    justifyContent: 'center',
  },
  searchInput: {
    fontSize: 16,
    color: Colors.text,
  },
  typewriterWrap: {
    position: 'absolute',
    left: 0,
    right: 0,
    flexDirection: 'row',
    alignItems: 'center',
  },
  typewriterStatic: {
    fontSize: 16,
    color: Colors.textLight,
  },
  typewriterText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  typewriterCursor: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '300',
    marginLeft: 1,
  },
  filterButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  fab: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  fabText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
});