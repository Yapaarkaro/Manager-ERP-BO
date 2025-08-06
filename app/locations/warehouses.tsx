import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Modal,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Warehouse, MapPin, Plus, CreditCard as Edit3, Trash2, Search, Filter, Package, TrendingUp, TrendingDown } from 'lucide-react-native';

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
    stockValue: 12500000
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
    stockValue: 8900000
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
    stockValue: 0
  },
];

export default function WarehousesScreen() {
  const [warehouses, setWarehouses] = useState<WarehouseData[]>(mockWarehouses);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredWarehouses, setFilteredWarehouses] = useState<WarehouseData[]>(mockWarehouses);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [warehouseToDelete, setWarehouseToDelete] = useState<string | null>(null);

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

  const handleFilter = () => {
    console.log('Filter pressed');
    // Implement filter functionality
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
      <View key={warehouse.id} style={styles.warehouseCard}>
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
      </View>
    );
  };

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
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
      </SafeAreaView>

      {/* Warehouses List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
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

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search warehouses..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={setSearchQuery}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={handleFilter}
              activeOpacity={0.7}
            >
              <Filter size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </View>

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
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSafeArea: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
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
    paddingBottom: 120,
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
    bottom: 90,
    right: 20,
    backgroundColor: Colors.warning,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    zIndex: 10,
    shadowColor: '#000',
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
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    marginRight: 12,
    
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