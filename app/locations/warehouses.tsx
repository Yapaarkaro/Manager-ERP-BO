import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Warehouse, MapPin, Plus, Edit3, Trash2, Search, Package, TrendingUp, TrendingDown, X } from 'lucide-react-native';
import { dataStore, BusinessAddress } from '../../utils/dataStore';
import ResponsiveContainer from '@/components/ResponsiveContainer';
import { getWebContainerStyles } from '@/utils/platformUtils';
import { useBusinessData } from '@/hooks/useBusinessData';

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

interface WarehouseData {
  id: string;
  name: string;
  type: 'warehouse';
  doorNumber: string;
  addressLine1: string;
  addressLine2: string;
  city: string;
  pincode: string;
  stateName: string;
  stateCode: string;
  isPrimary: boolean;
  createdAt: string;
  manager?: string;
  phone?: string;
  status: 'active' | 'inactive';
  capacity?: string;
  currentStock?: number;
  stockValue?: number;
  // Business performance data
  usesManager: boolean;
  staffCount?: number;
  staffAttendance?: number;
  // Sales data with different time periods
  dailySales?: number;
  weeklySales?: number;
  monthlySales?: number;
  dailyGrowth?: number;
  weeklyGrowth?: number;
  monthlyGrowth?: number;
  // Financial data
  cashInHand?: number;
  receivables?: number;
  payables?: number;
  // Stock movement data
  stockInToday?: number;
  stockOutToday?: number;
  // Stock data
  lowStockItems?: number;
  nearLowStockItems?: number;
}

// Mock warehouse data
const mockWarehouses: WarehouseData[] = [
  {
    id: 'warehouse_001',
    name: 'Main Warehouse - Gurgaon',
    type: 'warehouse',
    doorNumber: 'Plot 45',
    addressLine1: 'Sector 18',
    addressLine2: 'Industrial Area',
    city: 'Gurgaon',
    pincode: '122015',
    stateName: 'Haryana',
    stateCode: '06',
    isPrimary: true,
    createdAt: '2024-01-01',
    manager: 'Vikram Patel',
    phone: '+91 99887 76655',
    status: 'active',
    capacity: '10,000 sq ft',
    currentStock: 2500,
    stockValue: 12500000,
    usesManager: true,
    staffCount: 32,
    staffAttendance: 94,
    dailySales: 620000,
    weeklySales: 4250000,
    monthlySales: 18500000,
    dailyGrowth: 12.8,
    weeklyGrowth: 18.5,
    monthlyGrowth: 15.2,
    cashInHand: 680000,
    receivables: 3200000,
    payables: 2100000,
    stockInToday: 450000,
    stockOutToday: 320000,
    lowStockItems: 15,
    nearLowStockItems: 12
  },
  {
    id: 'warehouse_002',
    name: 'Regional Warehouse - Chennai',
    type: 'warehouse',
    doorNumber: '67',
    addressLine1: 'Ambattur Industrial Estate',
    addressLine2: 'Phase 2',
    city: 'Chennai',
    pincode: '600058',
    stateName: 'Tamil Nadu',
    stateCode: '33',
    isPrimary: false,
    createdAt: '2024-01-20',
    manager: 'Meera Joshi',
    phone: '+91 88776 65544',
    status: 'active',
    capacity: '7,500 sq ft',
    currentStock: 1800,
    stockValue: 8900000,
    usesManager: true,
    staffCount: 24,
    staffAttendance: 89,
    dailySales: 420000,
    weeklySales: 2950000,
    monthlySales: 12800000,
    dailyGrowth: 8.9,
    weeklyGrowth: 14.2,
    monthlyGrowth: 9.8,
    cashInHand: 450000,
    receivables: 2100000,
    payables: 1500000,
    stockInToday: 320000,
    stockOutToday: 280000,
    lowStockItems: 10,
    nearLowStockItems: 7
  },
  {
    id: 'warehouse_003',
    name: 'Distribution Center - Pune',
    type: 'warehouse',
    doorNumber: '89',
    addressLine1: 'Pimpri-Chinchwad',
    addressLine2: 'MIDC Area',
    city: 'Pune',
    pincode: '411019',
    stateName: 'Maharashtra',
    stateCode: '27',
    isPrimary: false,
    createdAt: '2024-02-10',
    manager: 'Suresh Kumar',
    phone: '+91 77665 54433',
    status: 'inactive',
    capacity: '5,000 sq ft',
    currentStock: 0,
    stockValue: 0,
    usesManager: false,
    staffCount: 0,
    staffAttendance: 0,
    dailySales: 0,
    weeklySales: 0,
    monthlySales: 0,
    dailyGrowth: 0,
    weeklyGrowth: 0,
    monthlyGrowth: 0,
    cashInHand: 0,
    receivables: 0,
    payables: 0,
    stockInToday: 0,
    stockOutToday: 0,
    lowStockItems: 0,
    nearLowStockItems: 0
  },
];

export default function WarehousesScreen() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWarehouses, setFilteredWarehouses] = useState<WarehouseData[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(null);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [selectedWarehouse, setSelectedWarehouse] = useState<WarehouseData | null>(null);
  const [salesPeriod, setSalesPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // ✅ Use unified business data hook (fast, cached, parallel)
  const { data: businessData, refetch } = useBusinessData();

  // ✅ Update warehouses from cached data (instant display)
  useEffect(() => {
    if (businessData.addresses) {
      // Filter only warehouse addresses
      const warehouseAddresses = businessData.addresses.filter((addr: any) => addr.type === 'warehouse');
      
      // Convert backend format to WarehouseData format
      const warehouseData: WarehouseData[] = warehouseAddresses.map((addr: any) => ({
        id: addr.id,
        name: addr.name,
        type: 'warehouse' as const,
        doorNumber: addr.door_number || '',
        addressLine1: addr.address_line1 || '',
        addressLine2: addr.address_line2 || '',
        city: addr.city || '',
        pincode: addr.pincode || '',
        stateName: addr.state || '',
        stateCode: '',
        isPrimary: addr.is_primary || false,
        createdAt: addr.created_at || new Date().toISOString(),
        manager: addr.manager_name || '',
        phone: addr.manager_mobile_number || '',
        status: 'active' as const,
        usesManager: !!addr.manager_name,
        staffCount: 0,
        staffAttendance: 0,
        dailySales: 0,
        weeklySales: 0,
        monthlySales: 0,
        dailyGrowth: 0,
        weeklyGrowth: 0,
        monthlyGrowth: 0,
        cashInHand: 0,
        stockValue: 0,
        receivables: 0,
        payables: 0,
        overdueReceivables: 0,
        overduePayables: 0,
        lowStockItems: 0,
        nearLowStockItems: 0,
      }));
      
      setWarehouses(warehouseData);
      setFilteredWarehouses(warehouseData);
    }
  }, [businessData]);

  // ✅ Reload warehouses when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refetch(); // Refresh cached data
    }, [refetch])
  );

  useEffect(() => {
    // Filter warehouses based on search query
    if (searchQuery.trim() === '') {
      setFilteredWarehouses(warehouses);
    } else {
      const filtered = warehouses.filter(warehouse =>
        warehouse.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        warehouse.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        warehouse.stateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        warehouse.manager?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        warehouse.pincode.includes(searchQuery)
      );
      setFilteredWarehouses(filtered);
    }
  }, [searchQuery, warehouses]);

  const formatAddress = (warehouse: WarehouseData) => {
    const parts = [
      warehouse.doorNumber,
      warehouse.addressLine1,
      warehouse.addressLine2,
      warehouse.city,
      `${warehouse.stateName} - ${warehouse.pincode}`
    ].filter(part => part && part.trim() !== '');
    
    return parts.join(', ');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddWarehouse = () => {
    router.push('/locations/add-warehouse');
  };

  const handleEditWarehouse = (warehouse: WarehouseData) => {
    router.push({
      pathname: '/locations/edit-warehouse',
      params: {
        warehouseId: warehouse.id,
        warehouseData: JSON.stringify(warehouse)
      }
    });
  };

  const handleDeleteWarehouse = (warehouseId: string) => {
    setWarehouseToDelete(warehouseId);
    setShowDeleteModal(true);
  };

  const confirmDeleteWarehouse = () => {
    if (warehouseToDelete) {
      setWarehouses(prev => prev.filter(warehouse => warehouse.id !== warehouseToDelete));
      setWarehouseToDelete(null);
      setShowDeleteModal(false);
      Alert.alert('Success', 'Warehouse deleted successfully');
    }
  };



  const handleWarehouseCardPress = (warehouse: WarehouseData) => {
    setSelectedWarehouse(warehouse);
    setShowOverviewModal(true);
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? Colors.success : Colors.error;
  };

  const getStockTrend = (currentStock: number) => {
    // Mock trend calculation
    const trend = Math.random() > 0.5 ? 'up' : 'down';
    const percentage = (Math.random() * 20).toFixed(1);
    return { trend, percentage };
  };

  const renderWarehouseCard = (warehouse: WarehouseData) => {
    const stockTrend = getStockTrend(warehouse.currentStock || 0);

    return (
      <TouchableOpacity
        key={warehouse.id}
        style={styles.warehouseCard}
        onPress={() => handleWarehouseCardPress(warehouse)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.warehouseHeader}>
          <View style={styles.warehouseLeft}>
            <View style={styles.warehouseIconContainer}>
              <Warehouse size={24} color={Colors.warning} />
            </View>
            <View style={styles.warehouseInfo}>
              <Text style={styles.warehouseName}>{warehouse.name}</Text>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(warehouse.status)}20` }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(warehouse.status) }
                  ]}>
                    {warehouse.status.toUpperCase()}
                  </Text>
                </View>
                {warehouse.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryText}>PRIMARY</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.warehouseActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditWarehouse(warehouse)}
              activeOpacity={0.7}
            >
              <Edit3 size={18} color={Colors.textLight} />
            </TouchableOpacity>
            {!warehouse.isPrimary && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteWarehouse(warehouse.id)}
                activeOpacity={0.7}
              >
                <Trash2 size={18} color={Colors.error} />
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* Address */}
        <View style={styles.addressSection}>
          <MapPin size={16} color={Colors.textLight} />
          <Text style={styles.addressText}>{formatAddress(warehouse)}</Text>
        </View>

        {/* Warehouse Stats */}
        <View style={styles.statsSection}>
          <View style={styles.statItem}>
            <Package size={16} color={Colors.primary} />
            <View style={styles.statContent}>
              <Text style={styles.statLabel}>Current Stock</Text>
              <View style={styles.statValueContainer}>
                <Text style={styles.statValue}>{warehouse.currentStock || 0} items</Text>
                <View style={styles.trendContainer}>
                  {stockTrend.trend === 'up' ? (
                    <TrendingUp size={12} color={Colors.success} />
                  ) : (
                    <TrendingDown size={12} color={Colors.error} />
                  )}
                  <Text style={[
                    styles.trendText,
                    { color: stockTrend.trend === 'up' ? Colors.success : Colors.error }
                  ]}>
                    {stockTrend.percentage}%
                  </Text>
                </View>
              </View>
            </View>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.capacityLabel}>Capacity:</Text>
            <Text style={styles.capacityValue}>{warehouse.capacity || 'N/A'}</Text>
          </View>

          <View style={styles.statItem}>
            <Text style={styles.valueLabel}>Stock Value:</Text>
            <Text style={styles.valueAmount}>
              {formatCurrency(warehouse.stockValue || 0)}
            </Text>
          </View>
        </View>

        {/* Manager & Contact */}
        {(warehouse.manager || warehouse.phone) && (
          <View style={styles.contactSection}>
            {warehouse.manager && (
              <Text style={styles.managerText}>Manager: {warehouse.manager}</Text>
            )}
            {warehouse.phone && (
              <Text style={styles.phoneText}>Phone: {warehouse.phone}</Text>
            )}
          </View>
        )}

        {/* GST State Code */}
        <View style={styles.gstSection}>
          <Text style={styles.gstLabel}>GST State Code:</Text>
          <Text style={styles.gstCode}>{warehouse.stateCode}</Text>
        </View>

        {/* Glassmorphism Overlay for Non-Manager Warehouses */}
        {!warehouse.usesManager && (
          <View style={styles.cardGlassmorphismOverlay}>
            <View style={styles.cardGlassmorphismContent}>
              <Text style={styles.cardGlassmorphismTitle}>Subscribe to Manager</Text>
              <Text style={styles.cardGlassmorphismSubtitle}>
                Get comprehensive business overview including staff attendance, sales performance, stock analysis, and financial insights for this warehouse.
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const webContainerStyles = getWebContainerStyles();

  return (
    <ResponsiveContainer>
      <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Warehouses</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredWarehouses.length} warehouses
          </Text>
        </View>
      </View>

      {/* Search Bar - Top of screen */}
      <View style={styles.topSearchContainer}>
                  <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color={Colors.primary} />
              <TextInput
                style={[
                  styles.searchInput,
                  Platform.select({
                    web: {
                      outlineWidth: 0,
                      outlineColor: 'transparent',
                      outlineStyle: 'none',
                    },
                  }),
                ]}
                placeholder="Search warehouses..."
                placeholderTextColor={Colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
      </View>

      {/* Warehouses List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, webContainerStyles.webScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        {filteredWarehouses.length === 0 ? (
          <View style={styles.emptyState}>
            <Warehouse size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Warehouses Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No warehouses match your search criteria' : 'Add your first warehouse to get started'}
            </Text>
          </View>
        ) : (
          filteredWarehouses.map(renderWarehouseCard)
        )}
      </ScrollView>

      {/* Add Warehouse FAB */}
      <TouchableOpacity
        style={styles.addWarehouseFAB}
        onPress={handleAddWarehouse}
        activeOpacity={0.8}
      >
        <Plus size={20} color="#ffffff" />
        <Text style={styles.addWarehouseText}>Add Warehouse</Text>
      </TouchableOpacity>

      {/* Delete Confirmation Modal */}
      <Modal
        visible={showDeleteModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowDeleteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <Text style={styles.deleteModalTitle}>Delete Warehouse</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete this warehouse? This action cannot be undone.
            </Text>

            <View style={styles.deleteModalActions}>
              <TouchableOpacity
                style={styles.deleteModalCancel}
                onPress={() => setShowDeleteModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.deleteModalConfirm}
                onPress={confirmDeleteWarehouse}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Warehouse Overview Modal */}
      <Modal
        visible={showOverviewModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOverviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.overviewModal}>
            {selectedWarehouse && (
              <>
                {/* Header */}
                <View style={styles.overviewHeader}>
                  <View style={styles.overviewIconContainer}>
                    <Warehouse size={32} color={Colors.warning} />
                  </View>
                  <View style={styles.overviewTitleSection}>
                    <Text style={styles.overviewTitle}>{selectedWarehouse.name}</Text>
                    <View style={styles.overviewStatusRow}>
                      <View style={[
                        styles.overviewStatusBadge,
                        { backgroundColor: `${getStatusColor(selectedWarehouse.status)}20` }
                      ]}>
                        <Text style={[
                          styles.overviewStatusText,
                          { color: getStatusColor(selectedWarehouse.status) }
                        ]}>
                          {selectedWarehouse.status.toUpperCase()}
                        </Text>
                      </View>
                      {selectedWarehouse.isPrimary && (
                        <View style={styles.overviewPrimaryBadge}>
                          <Text style={styles.overviewPrimaryText}>PRIMARY</Text>
                        </View>
                      )}
                    </View>
                  </View>
                  <TouchableOpacity
                    style={styles.closeButton}
                    onPress={() => setShowOverviewModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>

                {/* Content */}
                <ScrollView style={styles.overviewContent} showsVerticalScrollIndicator={false}>
                  {/* Business Performance Overview */}
                  {selectedWarehouse.usesManager ? (
                    <>
                      {/* Stock Movement Section - Top Priority for Warehouses */}
                      <View style={styles.overviewSection}>
                        <Text style={styles.overviewSectionTitle}>Stock Movement Today</Text>
                        <View style={styles.overviewStatsGrid}>
                          <View style={styles.overviewStatCard}>
                            <Text style={styles.overviewStatValue} numberOfLines={1} adjustsFontSizeToFit>
                              {formatCurrency(selectedWarehouse.stockInToday || 0)}
                            </Text>
                            <Text style={styles.overviewStatLabel}>Stock In Today</Text>
                          </View>
                          <View style={styles.overviewStatCard}>
                            <Text style={styles.overviewStatValue} numberOfLines={1} adjustsFontSizeToFit>
                              {formatCurrency(selectedWarehouse.stockOutToday || 0)}
                            </Text>
                            <Text style={styles.overviewStatLabel}>Stock Out Today</Text>
                          </View>
                        </View>
                      </View>

                      {/* Sales Performance with Toggle */}
                      <View style={styles.overviewSection}>
                        <Text style={styles.overviewSectionTitle}>Sales Performance</Text>
                        <View style={styles.salesPeriodToggle}>
                          <TouchableOpacity
                            style={[styles.periodButton, salesPeriod === 'daily' && styles.activePeriodButton]}
                            onPress={() => setSalesPeriod('daily')}
                          >
                            <Text style={[styles.periodButtonText, salesPeriod === 'daily' && styles.activePeriodButtonText]}>
                              Daily
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.periodButton, salesPeriod === 'weekly' && styles.activePeriodButton]}
                            onPress={() => setSalesPeriod('weekly')}
                          >
                            <Text style={[styles.periodButtonText, salesPeriod === 'weekly' && styles.activePeriodButtonText]}>
                              Weekly
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[styles.periodButton, salesPeriod === 'monthly' && styles.activePeriodButton]}
                            onPress={() => setSalesPeriod('monthly')}
                          >
                            <Text style={[styles.periodButtonText, salesPeriod === 'monthly' && styles.activePeriodButtonText]}>
                              Monthly
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.overviewStatsGrid}>
                          <View style={styles.overviewStatCard}>
                            <Text style={styles.overviewStatValue} numberOfLines={1} adjustsFontSizeToFit>
                              {salesPeriod === 'daily' && formatCurrency(selectedWarehouse.dailySales || 0)}
                              {salesPeriod === 'weekly' && formatCurrency(selectedWarehouse.weeklySales || 0)}
                              {salesPeriod === 'monthly' && formatCurrency(selectedWarehouse.monthlySales || 0)}
                            </Text>
                            <Text style={styles.overviewStatLabel}>
                              {salesPeriod === 'daily' ? 'Daily Sales' : salesPeriod === 'weekly' ? 'Weekly Sales' : 'Monthly Sales'}
                            </Text>
                          </View>
                          <View style={styles.overviewStatCard}>
                            <Text style={styles.overviewStatValue}>
                              +{salesPeriod === 'daily' && (selectedWarehouse.dailyGrowth || 0)}
                              {salesPeriod === 'weekly' && (selectedWarehouse.weeklyGrowth || 0)}
                              {salesPeriod === 'monthly' && (selectedWarehouse.monthlyGrowth || 0)}%
                            </Text>
                            <Text style={styles.overviewStatLabel}>
                              vs {salesPeriod === 'daily' ? 'Yesterday' : salesPeriod === 'weekly' ? 'Last Week' : 'Last Month'}
                            </Text>
                          </View>
                        </View>
                      </View>

                      {/* Financial Overview */}
                      <View style={styles.overviewSection}>
                        <Text style={styles.overviewSectionTitle}>Financial Overview</Text>
                        <View style={styles.overviewLineItem}>
                          <Text style={styles.overviewLineLabel}>Cash in Hand:</Text>
                          <Text style={styles.overviewLineValue}>{formatCurrency(selectedWarehouse.cashInHand || 0)}</Text>
                        </View>
                        <View style={styles.overviewLineItem}>
                          <Text style={styles.overviewLineLabel}>Receivables:</Text>
                          <Text style={styles.overviewLineValue}>{formatCurrency(selectedWarehouse.receivables || 0)}</Text>
                        </View>
                        <View style={styles.overviewLineItem}>
                          <Text style={styles.overviewLineLabel}>Payables:</Text>
                          <Text style={styles.overviewLineValue}>{formatCurrency(selectedWarehouse.payables || 0)}</Text>
                        </View>
                      </View>

                      {/* Stock Overview */}
                      <View style={styles.overviewSection}>
                        <Text style={styles.overviewSectionTitle}>Stock Overview</Text>
                        <View style={styles.overviewLineItem}>
                          <Text style={styles.overviewLineLabel}>Current Stock Value:</Text>
                          <Text style={styles.overviewLineValue}>{formatCurrency(selectedWarehouse.stockValue || 0)}</Text>
                        </View>
                        <View style={styles.overviewLineItem}>
                          <Text style={styles.overviewLineLabel}>Low Stock Items:</Text>
                          <Text style={[styles.overviewLineValue, styles.lowStockAlert]}>{selectedWarehouse.lowStockItems || 0}</Text>
                        </View>
                        <View style={styles.overviewLineItem}>
                          <Text style={styles.overviewLineLabel}>Near Low Stock:</Text>
                          <Text style={[styles.overviewLineValue, styles.nearLowStockAlert]}>{selectedWarehouse.nearLowStockItems || 0}</Text>
                        </View>
                      </View>

                      {/* Staff Overview */}
                      <View style={styles.overviewSection}>
                        <Text style={styles.overviewSectionTitle}>Staff Overview</Text>
                        <View style={styles.overviewStatsGrid}>
                          <View style={styles.overviewStatCard}>
                            <Text style={styles.overviewStatValue}>{selectedWarehouse.staffCount || 0}</Text>
                            <Text style={styles.overviewStatLabel}>Total Staff</Text>
                          </View>
                          <View style={styles.overviewStatCard}>
                            <Text style={styles.overviewStatValue}>{selectedWarehouse.staffAttendance || 0}%</Text>
                            <Text style={styles.overviewStatLabel}>Attendance Rate</Text>
                          </View>
                        </View>
                      </View>

                      {/* Staff on Leave */}
                      <View style={styles.overviewSection}>
                        <Text style={styles.overviewSectionTitle}>Staff on Leave</Text>
                        <View style={styles.leaveItem}>
                          <Text style={styles.leaveName}>Vikram Patel</Text>
                          <Text style={styles.leaveType}>Annual Leave</Text>
                          <Text style={styles.leaveDuration}>3 days</Text>
                        </View>
                        <View style={styles.leaveItem}>
                          <Text style={styles.leaveName}>Meera Joshi</Text>
                          <Text style={styles.leaveType}>Sick Leave</Text>
                          <Text style={styles.leaveDuration}>1 day</Text>
                        </View>
                      </View>

                      {/* Address Section */}
                      <View style={styles.overviewSection}>
                        <Text style={styles.overviewSectionTitle}>Address</Text>
                        <View style={styles.overviewAddressRow}>
                          <MapPin size={20} color={Colors.textLight} />
                          <Text style={styles.overviewAddressText}>{formatAddress(selectedWarehouse)}</Text>
                        </View>
                      </View>

                      {/* Manager & Contact Section */}
                      {(selectedWarehouse.manager || selectedWarehouse.phone) && (
                        <View style={styles.overviewSection}>
                          <Text style={styles.overviewSectionTitle}>Contact Information</Text>
                          {selectedWarehouse.manager && (
                            <View style={styles.overviewContactRow}>
                              <Text style={styles.overviewContactLabel}>Manager:</Text>
                              <Text style={styles.overviewContactValue}>{selectedWarehouse.manager}</Text>
                            </View>
                          )}
                          {selectedWarehouse.phone && (
                            <View style={styles.overviewContactRow}>
                              <Text style={styles.overviewContactLabel}>Phone:</Text>
                              <Text style={styles.overviewContactValue}>{selectedWarehouse.phone}</Text>
                            </View>
                          )}
                        </View>
                      )}
                    </>
                  ) : (
                    <View style={styles.overviewSection}>
                      <View style={styles.glassmorphismOverlay}>
                        <View style={styles.glassmorphismContent}>
                          <Text style={styles.glassmorphismTitle}>Subscribe to Manager</Text>
                          <Text style={styles.glassmorphismSubtitle}>
                            Get comprehensive business overview including staff attendance, sales performance, stock analysis, and financial insights for this warehouse.
                          </Text>
                          <TouchableOpacity
                            style={styles.glassmorphismButton}
                            onPress={() => {
                              setShowOverviewModal(false);
                              // Navigate to subscription page or show subscription modal
                              console.log('Navigate to Manager subscription');
                            }}
                            activeOpacity={0.8}
                          >
                            <Text style={styles.glassmorphismButtonText}>Subscribe to Manager</Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    </View>
                  )}
                </ScrollView>

                {/* Actions */}
                <View style={styles.overviewActions}>
                  <TouchableOpacity
                    style={styles.overviewEditButton}
                    onPress={() => {
                      setShowOverviewModal(false);
                      handleEditWarehouse(selectedWarehouse);
                    }}
                    activeOpacity={0.8}
                  >
                    <Edit3 size={20} color="#ffffff" />
                    <Text style={styles.overviewEditButtonText}>Edit Warehouse</Text>
                  </TouchableOpacity>
                </View>
              </>
            )}
          </View>
        </View>
      </Modal>
    </SafeAreaView>
    </ResponsiveContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },

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
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  totalCount: {
    fontSize: 14,
    color: Colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  // Top search container styles
  topSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyStateTitle: {
    fontSize: 20,
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
  warehouseCard: {
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
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  warehouseHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  warehouseLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  warehouseIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fffbeb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  warehouseInfo: {
    flex: 1,
  },
  warehouseName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  statusContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  primaryBadge: {
    backgroundColor: '#ffc754',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  primaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#3f66ac',
  },
  warehouseActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  addressSection: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 16,
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
    lineHeight: 20,
  },
  statsSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statContent: {
    flex: 1,
    marginLeft: 8,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  statValueContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  statValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  trendContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  trendText: {
    fontSize: 12,
    fontWeight: '600',
  },
  capacityLabel: {
    fontSize: 12,
    color: Colors.textLight,
    flex: 1,
  },
  capacityValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  valueLabel: {
    fontSize: 12,
    color: Colors.textLight,
    flex: 1,
  },
  valueAmount: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.success,
  },
  contactSection: {
    marginBottom: 12,
  },
  managerText: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    marginBottom: 4,
  },
  phoneText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  gstSection: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  gstLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginRight: 8,
  },
  gstCode: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  addWarehouseFAB: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    zIndex: 10,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  addWarehouseText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },

  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },

  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  deleteModal: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 24,
    width: '100%',
    maxWidth: 350,
  },
  deleteModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  deleteModalText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
  },
  deleteModalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  // Overview Modal Styles
  overviewModal: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 10,
    },
    shadowOpacity: 0.25,
    shadowRadius: 20,
    elevation: 10,
  },
  overviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  overviewIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#fffbeb',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  overviewTitleSection: {
    flex: 1,
  },
  overviewTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  overviewStatusRow: {
    flexDirection: 'row',
    gap: 8,
  },
  overviewStatusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overviewStatusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  overviewPrimaryBadge: {
    backgroundColor: '#ffc754',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  overviewPrimaryText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  closeButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
  },
  overviewContent: {
    padding: 20,
  },
  overviewSection: {
    marginBottom: 24,
  },
  overviewSectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  overviewAddressRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
  },
  overviewAddressText: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  overviewStatsGrid: {
    flexDirection: 'row',
    gap: 12,
  },
  overviewStatCard: {
    flex: 1,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
    marginHorizontal: 4,
  },
  criticalCard: {
    backgroundColor: '#FEF2F2',
    borderColor: '#FECACA',
  },
  // Line Item Styles for Financial and Stock Overview
  overviewLineItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  overviewLineLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  overviewLineValue: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  // Stock Alert Styles
  lowStockAlert: {
    color: '#DC2626',
    fontWeight: '700',
  },
  nearLowStockAlert: {
    color: '#D97706',
    fontWeight: '700',
  },
  // Leave Item Styles
  leaveItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    marginBottom: 6,
  },
  leaveName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  leaveType: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: 'italic',
    marginRight: 8,
  },
  leaveDuration: {
    fontSize: 12,
    color: Colors.warning,
    fontWeight: '600',
  },
  overviewStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
    marginTop: 8,
    marginBottom: 4,
    textAlign: 'center',
    flexShrink: 1,
  },
  overviewStatLabel: {
    fontSize: 12,
    color: Colors.textLight,
    textAlign: 'center',
  },
  // Sales Period Toggle Styles
  salesPeriodToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    padding: 4,
    marginBottom: 16,
  },
  periodButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activePeriodButton: {
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 1,
  },
  periodButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activePeriodButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  overviewContactRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  overviewContactLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
    width: 80,
  },
  overviewContactValue: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  overviewGSTRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overviewGSTLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
    marginRight: 12,
  },
  overviewGSTValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  overviewDateText: {
    fontSize: 14,
    color: Colors.text,
  },
  // Glassmorphism Overlay Styles
  glassmorphismOverlay: {
    backgroundColor: 'rgba(255, 199, 84, 0.95)',
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFC754',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  glassmorphismContent: {
    alignItems: 'center',
  },
  glassmorphismTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  glassmorphismSubtitle: {
    fontSize: 14,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 20,
    opacity: 0.8,
  },
  glassmorphismButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 25,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    elevation: 4,
  },
  glassmorphismButtonText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '600',
  },
  // Card Glassmorphism Overlay Styles
  cardGlassmorphismOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255, 199, 84, 0.95)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    zIndex: 10,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
    shadowColor: '#FFC754',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 6,
  },
  cardGlassmorphismContent: {
    alignItems: 'center',
  },
  cardGlassmorphismTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#000000',
    marginBottom: 8,
    textAlign: 'center',
  },
  cardGlassmorphismSubtitle: {
    fontSize: 12,
    color: '#000000',
    textAlign: 'center',
    lineHeight: 16,
    opacity: 0.8,
  },
  overviewActions: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  overviewEditButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  overviewEditButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  deleteModalCancel: {
    flex: 1,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteModalCancelText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
  },
  deleteModalConfirm: {
    flex: 1,
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  deleteModalConfirmText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
});