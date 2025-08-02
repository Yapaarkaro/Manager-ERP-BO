import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Download, Share, Eye, ShoppingCart, Plus, FileText, User, Building2, Calendar, Banknote, Smartphone, CreditCard, IndianRupee, Package, Truck, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle, X, ChevronDown } from 'lucide-react-native';

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
  date: string;
  expectedDelivery: string;
  actualDelivery?: string;
  supplierAvatar: string;
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

const mockPurchaseInvoices: PurchaseInvoice[] = [
  {
    id: '1',
    poNumber: 'PO-2024-001',
    invoiceNumber: 'PINV-2024-001',
    supplierName: 'Apple India Pvt Ltd',
    supplierType: 'business',
    businessName: 'Apple India Pvt Ltd',
    gstin: '29ABCDE1234F2Z6',
    staffName: 'Rajesh Kumar',
    staffAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'received',
    paymentStatus: 'paid',
    paymentMethod: 'bank_transfer',
    amount: 850000,
    itemCount: 10,
    date: '2024-01-15',
    expectedDelivery: '2024-01-20',
    actualDelivery: '2024-01-19',
    supplierAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
  },
  {
    id: '2',
    poNumber: 'PO-2024-002',
    invoiceNumber: 'PINV-2024-002',
    supplierName: 'Samsung Electronics',
    supplierType: 'business',
    businessName: 'Samsung Electronics India Pvt Ltd',
    gstin: '27FGHIJ5678K3L9',
    staffName: 'Priya Sharma',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'pending',
    paymentStatus: 'pending',
    paymentMethod: 'bank_transfer',
    amount: 650000,
    itemCount: 8,
    date: '2024-01-18',
    expectedDelivery: '2024-01-25',
    supplierAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
  },
  {
    id: '3',
    poNumber: 'PO-2024-003',
    invoiceNumber: 'PINV-2024-003',
    supplierName: 'Dell Technologies',
    supplierType: 'business',
    businessName: 'Dell Technologies India Pvt Ltd',
    gstin: '07KLMNO9012P3Q4',
    staffName: 'Amit Patel',
    staffAvatar: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'partial',
    paymentStatus: 'overdue',
    paymentMethod: 'card',
    amount: 450000,
    itemCount: 5,
    date: '2024-01-20',
    expectedDelivery: '2024-01-30',
    supplierAvatar: 'https://images.pexels.com/photos/1222272/pexels-photo-1222272.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1'
  }
];

const mockPurchaseOrders: PurchaseOrder[] = [
  {
    id: '1',
    poNumber: 'PO-2024-001',
    supplierName: 'Apple India Pvt Ltd',
    supplierType: 'business',
    businessName: 'Apple India Pvt Ltd',
    gstin: '29ABCDE1234F2Z6',
    staffName: 'Rajesh Kumar',
    staffAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'received',
    type: 'created',
    amount: 850000,
    itemCount: 10,
    date: '2024-01-15',
    expectedDelivery: '2024-01-20',
    supplierAvatar: 'https://images.pexels.com/photos/2379004/pexels-photo-2379004.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    supplierId: 'supplier_apple_001',
    customerId: 'customer_001'
  },
  {
    id: '2',
    poNumber: 'PO-2024-002',
    supplierName: 'Samsung Electronics',
    supplierType: 'business',
    businessName: 'Samsung Electronics India Pvt Ltd',
    gstin: '27FGHIJ5678K3L9',
    staffName: 'Priya Sharma',
    staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'sent',
    type: 'created',
    amount: 650000,
    itemCount: 8,
    date: '2024-01-18',
    expectedDelivery: '2024-01-25',
    supplierAvatar: 'https://images.pexels.com/photos/1222271/pexels-photo-1222271.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    supplierId: 'supplier_samsung_002',
    customerId: 'customer_002'
  },
  {
    id: '3',
    poNumber: 'PO-2024-003',
    supplierName: 'Dell Technologies',
    supplierType: 'business',
    businessName: 'Dell Technologies India Pvt Ltd',
    gstin: '07KLMNO9012P3Q4',
    staffName: 'Amit Patel',
    staffAvatar: 'https://images.pexels.com/photos/2379005/pexels-photo-2379005.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'confirmed',
    type: 'received',
    amount: 450000,
    itemCount: 5,
    date: '2024-01-20',
    expectedDelivery: '2024-01-30',
    supplierAvatar: 'https://images.pexels.com/photos/1222272/pexels-photo-1222272.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    supplierId: 'supplier_dell_003',
    customerId: 'customer_003'
  },
  {
    id: '4',
    poNumber: 'PO-2024-004',
    supplierName: 'HP India',
    supplierType: 'business',
    businessName: 'HP India Pvt Ltd',
    gstin: '12PQRST5678U9V0',
    staffName: 'Neha Singh',
    staffAvatar: 'https://images.pexels.com/photos/1239292/pexels-photo-1239292.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    status: 'draft',
    type: 'created',
    amount: 320000,
    itemCount: 4,
    date: '2024-01-22',
    expectedDelivery: '2024-02-05',
    supplierAvatar: 'https://images.pexels.com/photos/1222273/pexels-photo-1222273.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
    supplierId: 'supplier_hp_004',
    customerId: 'customer_004'
  }
];

export default function PurchasesScreen() {
  const [activeTab, setActiveTab] = useState<'invoices' | 'orders'>('invoices');
  const [searchQuery, setSearchQuery] = useState('');
  const [poFilter, setPoFilter] = useState<'all' | 'created' | 'received'>('all');

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

  const filteredInvoices = mockPurchaseInvoices.filter(invoice =>
    invoice.invoiceNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.supplierName.toLowerCase().includes(searchQuery.toLowerCase()) ||
    invoice.poNumber.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const filteredOrders = mockPurchaseOrders.filter(order => {
    const matchesSearch = order.poNumber.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.supplierName.toLowerCase().includes(searchQuery.toLowerCase());
    
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

  const formatAmount = (amount: number) => {
    return `₹${amount.toLocaleString('en-IN')}`;
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleInvoicePress = (invoice: PurchaseInvoice) => {
    router.push({
      pathname: '/purchasing/invoice-details',
      params: { invoiceId: invoice.id }
    });
  };

  const handleOrderPress = (order: PurchaseOrder) => {
    router.push({
      pathname: '/purchasing/po-details',
      params: { 
        poId: order.id,
        poData: JSON.stringify(order)
      }
    });
  };

  const handleCreatePO = () => {
    router.push('/purchasing/create-po');
  };

  const renderInvoiceCard = (invoice: PurchaseInvoice) => (
    <TouchableOpacity
      key={invoice.id}
      style={styles.card}
      onPress={() => handleInvoicePress(invoice)}
      activeOpacity={0.7}
    >
      <View style={styles.cardHeader}>
        <View style={styles.cardHeaderLeft}>
          <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
          <Text style={styles.poNumber}>PO: {invoice.poNumber}</Text>
        </View>
        <View style={styles.statusContainer}>
          {getStatusIcon(invoice.status)}
          <Text style={[styles.statusText, { color: getStatusColor(invoice.status) }]}>
            {getStatusText(invoice.status)}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.supplierInfo}>
          <Image source={{ uri: invoice.supplierAvatar }} style={styles.avatar} />
          <View style={styles.supplierDetails}>
            <Text style={styles.supplierName}>{invoice.supplierName}</Text>
            {invoice.gstin && (
              <Text style={styles.gstin}>GSTIN: {invoice.gstin}</Text>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Text style={styles.amount}>{formatAmount(invoice.amount)}</Text>
            <Text style={styles.itemCount}>{invoice.itemCount} items</Text>
          </View>
          <View style={styles.footerRight}>
            <View style={styles.paymentInfo}>
              {getPaymentMethodIcon(invoice.paymentMethod)}
              <Text style={[styles.paymentStatus, { color: getStatusColor(invoice.paymentStatus) }]}>
                {getStatusText(invoice.paymentStatus)}
              </Text>
            </View>
            <Text style={styles.date}>{formatDate(invoice.date)}</Text>
          </View>
        </View>
      </View>
    </TouchableOpacity>
  );

  const renderOrderCard = (order: PurchaseOrder) => (
    <TouchableOpacity
      key={order.id}
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
        </View>
        <View style={styles.statusContainer}>
          {getStatusIcon(order.status)}
          <Text style={[styles.statusText, { color: getStatusColor(order.status) }]}>
            {getStatusText(order.status)}
          </Text>
        </View>
      </View>

      <View style={styles.cardBody}>
        <View style={styles.supplierInfo}>
          <Image source={{ uri: order.supplierAvatar }} style={styles.avatar} />
          <View style={styles.supplierDetails}>
            <Text style={styles.supplierName}>{order.supplierName}</Text>
            {order.gstin && (
              <Text style={styles.gstin}>GSTIN: {order.gstin}</Text>
            )}
          </View>
        </View>

        <View style={styles.cardFooter}>
          <View style={styles.footerLeft}>
            <Text style={styles.amount}>{formatAmount(order.amount)}</Text>
            <Text style={styles.itemCount}>{order.itemCount} items</Text>
          </View>
          <View style={styles.footerRight}>
            <Text style={styles.date}>{formatDate(order.date)}</Text>
            <Text style={styles.expectedDelivery}>Expected: {formatDate(order.expectedDelivery)}</Text>
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
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Purchases</Text>
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
          <ScrollView 
            style={styles.scrollView}
            contentContainerStyle={styles.scrollContent}
            showsVerticalScrollIndicator={false}
          >
            {activeTab === 'invoices' ? (
              filteredInvoices.length > 0 ? (
                filteredInvoices.map(renderInvoiceCard)
              ) : (
                <View style={styles.emptyState}>
                  <FileText size={48} color={Colors.textLight} />
                  <Text style={styles.emptyStateTitle}>No Purchase Invoices</Text>
                  <Text style={styles.emptyStateText}>
                    {searchQuery ? 'No invoices found matching your search.' : 'You haven\'t received any purchase invoices yet.'}
                  </Text>
                </View>
              )
            ) : (
              filteredOrders.length > 0 ? (
                filteredOrders.map(renderOrderCard)
              ) : (
                <View style={styles.emptyState}>
                  <ShoppingCart size={48} color={Colors.textLight} />
                  <Text style={styles.emptyStateTitle}>No Purchase Orders</Text>
                  <Text style={styles.emptyStateText}>
                    {searchQuery ? 'No orders found matching your search.' : 'You haven\'t created any purchase orders yet.'}
                  </Text>
                </View>
              )
            )}
          </ScrollView>

          {/* Create PO FAB (only for orders tab) */}
          {activeTab === 'orders' && (
            <TouchableOpacity
              style={styles.createPoFAB}
              onPress={handleCreatePO}
              activeOpacity={0.8}
            >
              <Plus size={20} color={Colors.background} />
              <Text style={styles.createPoFABText}>Create New PO</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Search Bar at Bottom */}
        <View style={styles.floatingSearchContainer}>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color={Colors.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder={`Search ${activeTab === 'invoices' ? 'invoices' : 'orders'}...`}
                placeholderTextColor={Colors.textLight}
                value={searchQuery}
                onChangeText={handleSearch}
              />
              <TouchableOpacity
                style={styles.filterButton}
                onPress={() => console.log('Filter purchases')}
                activeOpacity={0.7}
              >
                <Filter size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
          </View>
        </View>
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
    paddingBottom: 120, // Space for search bar and FAB
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
  avatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
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

  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    marginRight: 12,
  },
  floatingSearchContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.background,
    borderRadius: 25,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  searchContainer: {
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.grey[300],
  },
  filterButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
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
  createPoFAB: {
    position: 'absolute',
    bottom: 80,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 28,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  createPoFABText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
});