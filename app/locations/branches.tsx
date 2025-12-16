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
import { ArrowLeft, Building2, MapPin, Plus, Edit3, Trash2, Search, X } from 'lucide-react-native';
import { dataStore, BusinessAddress, getGSTINStateCode } from '../../utils/dataStore';
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

interface Branch {
  id: string;
  name: string;
  type: 'branch';
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
  stockValue?: number;
  receivables?: number;
  payables?: number;
  overdueReceivables?: number;
  overduePayables?: number;
  // Stock data
  lowStockItems?: number;
  nearLowStockItems?: number;
}

// Mock branch data
const mockBranches: Branch[] = [
  {
    id: 'branch_001',
    name: 'Main Branch - Delhi',
    type: 'branch',
    doorNumber: '123',
    addressLine1: 'Connaught Place',
    addressLine2: 'Central Delhi',
    city: 'New Delhi',
    pincode: '110001',
    stateName: 'Delhi',
    stateCode: '07',
    isPrimary: true,
    createdAt: '2024-01-01',
    manager: 'Rajesh Kumar',
    phone: '+91 98765 43210',
    status: 'active',
    usesManager: true,
    staffCount: 25,
    staffAttendance: 92,
    dailySales: 285000,
    weeklySales: 1950000,
    monthlySales: 8500000,
    dailyGrowth: 8.5,
    weeklyGrowth: 15.2,
    monthlyGrowth: 12.5,
    cashInHand: 450000,
    stockValue: 3200000,
    receivables: 1800000,
    payables: 950000,
    overdueReceivables: 320000,
    overduePayables: 180000,
    lowStockItems: 12,
    nearLowStockItems: 8
  },
  {
    id: 'branch_002',
    name: 'Branch Office - Mumbai',
    type: 'branch',
    doorNumber: '456',
    addressLine1: 'Bandra West',
    addressLine2: 'Near Linking Road',
    city: 'Mumbai',
    pincode: '400050',
    stateName: 'Maharashtra',
    stateCode: '27',
    isPrimary: false,
    createdAt: '2024-01-15',
    manager: 'Priya Sharma',
    phone: '+91 87654 32109',
    status: 'active',
    usesManager: true,
    staffCount: 18,
    staffAttendance: 88,
    dailySales: 210000,
    weeklySales: 1450000,
    monthlySales: 6200000,
    dailyGrowth: 5.8,
    weeklyGrowth: 12.1,
    monthlyGrowth: 8.3,
    cashInHand: 320000,
    stockValue: 2400000,
    receivables: 1200000,
    payables: 680000,
    overdueReceivables: 180000,
    overduePayables: 95000,
    lowStockItems: 8,
    nearLowStockItems: 5
  },
  {
    id: 'branch_003',
    name: 'Regional Office - Bangalore',
    type: 'branch',
    doorNumber: '789',
    addressLine1: 'Koramangala',
    addressLine2: '5th Block',
    city: 'Bangalore',
    pincode: '560095',
    stateName: 'Karnataka',
    stateCode: '29',
    isPrimary: false,
    createdAt: '2024-02-01',
    manager: 'Amit Singh',
    phone: '+91 76543 21098',
    status: 'active',
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
    stockValue: 0,
    receivables: 0,
    payables: 0,
    overdueReceivables: 0,
    overduePayables: 0,
    lowStockItems: 0,
    nearLowStockItems: 0
  },
];

export default function BranchesScreen() {
  const [branches, setBranches] = useState<Branch[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredBranches, setFilteredBranches] = useState<Branch[]>([]);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [branchToDelete, setBranchToDelete] = useState<string | null>(null);
  const [showOverviewModal, setShowOverviewModal] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [salesPeriod, setSalesPeriod] = useState<'daily' | 'weekly' | 'monthly'>('daily');

  // ✅ Use unified business data hook (fast, cached, parallel)
  const { data: businessData, refetch } = useBusinessData();

  // ✅ Update branches from cached data (instant display)
  useEffect(() => {
    if (businessData.addresses) {
      // Filter only branch addresses
      const branchAddresses = businessData.addresses.filter((addr: any) => addr.type === 'branch');
      
      // Convert backend format to Branch format
      const branchData: Branch[] = branchAddresses.map((addr: any) => ({
        id: addr.id,
        name: addr.name,
        type: 'branch' as const,
        doorNumber: addr.door_number || '',
        addressLine1: addr.address_line1 || '',
        addressLine2: addr.address_line2 || '',
        city: addr.city || '',
        pincode: addr.pincode || '',
        stateName: addr.state || '',
        stateCode: addr.state ? getGSTINStateCode(addr.state) : '',
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
      
      setBranches(branchData);
      setFilteredBranches(branchData);
    }
  }, [businessData]);

  // ✅ Only refetch when screen comes into focus if cache is stale
  useFocusEffect(
    React.useCallback(() => {
      // Check if cache is stale (older than 10 seconds) before refetching
      const { __getGlobalCache } = require('@/hooks/useBusinessData');
      const cache = __getGlobalCache();
      const now = Date.now();
      const CACHE_DURATION = 10000; // 10 seconds
      
      // Only refetch if cache is stale or missing
      if (!cache.data || (now - cache.timestamp) > CACHE_DURATION) {
        console.log('🔄 Branches: Cache stale, refetching business data');
        refetch();
      } else {
        console.log('✅ Branches: Using cached data (no refetch needed)');
      }
    }, [refetch])
  );

  useEffect(() => {
    // Filter branches based on search query
    if (searchQuery.trim() === '') {
      setFilteredBranches(branches);
    } else {
      const filtered = branches.filter(branch =>
        branch.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.city.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.stateName.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.manager?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        branch.pincode.includes(searchQuery)
      );
      setFilteredBranches(filtered);
    }
  }, [searchQuery, branches]);

  const formatAddress = (branch: Branch) => {
    const parts = [
      branch.doorNumber,
      branch.addressLine1,
      branch.addressLine2,
      branch.city,
      `${branch.stateName} - ${branch.pincode}`
    ].filter(part => part && part.trim() !== '');
    
    return parts.join(', ');
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const handleAddBranch = () => {
    router.push('/locations/add-branch');
  };

  const handleEditBranch = (branch: Branch) => {
    router.push({
      pathname: '/locations/branch-details',
      params: {
        branchId: branch.id,
        editMode: 'true',
        editBranch: JSON.stringify(branch)
      }
    });
  };

  const handleDeleteBranch = (branchId: string) => {
    setBranchToDelete(branchId);
    setShowDeleteModal(true);
  };

  const confirmDeleteBranch = () => {
    if (branchToDelete) {
      setBranches(prev => prev.filter(branch => branch.id !== branchToDelete));
      setBranchToDelete(null);
      setShowDeleteModal(false);
      Alert.alert('Success', 'Branch deleted successfully');
    }
  };



  const handleBranchCardPress = (branch: Branch) => {
    setSelectedBranch(branch);
    setShowOverviewModal(true);
  };

  const getStatusColor = (status: string) => {
    return status === 'active' ? Colors.success : Colors.error;
  };

  const renderBranchCard = (branch: Branch) => {
    return (
      <TouchableOpacity
        key={branch.id}
        style={styles.branchCard}
        onPress={() => handleBranchCardPress(branch)}
        activeOpacity={0.8}
      >
        {/* Header */}
        <View style={styles.branchHeader}>
          <View style={styles.branchLeft}>
            <View style={styles.branchIconContainer}>
              <Building2 size={24} color={Colors.primary} />
            </View>
            <View style={styles.branchInfo}>
              <Text style={styles.branchName}>{branch.name}</Text>
              <View style={styles.statusContainer}>
                <View style={[
                  styles.statusBadge,
                  { backgroundColor: `${getStatusColor(branch.status)}20` }
                ]}>
                  <Text style={[
                    styles.statusText,
                    { color: getStatusColor(branch.status) }
                  ]}>
                    {branch.status.toUpperCase()}
                  </Text>
                </View>
                {branch.isPrimary && (
                  <View style={styles.primaryBadge}>
                    <Text style={styles.primaryText}>PRIMARY</Text>
                  </View>
                )}
              </View>
            </View>
          </View>

          <View style={styles.branchActions}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleEditBranch(branch)}
              activeOpacity={0.7}
            >
              <Edit3 size={18} color={Colors.textLight} />
            </TouchableOpacity>
            {!branch.isPrimary && (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleDeleteBranch(branch.id)}
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
          <Text style={styles.addressText}>{formatAddress(branch)}</Text>
        </View>

        {/* Manager & Contact */}
        {(branch.manager || branch.phone) && (
          <View style={styles.contactSection}>
            {branch.manager && (
              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>Manager:</Text>
                <Text style={styles.managerText}>{branch.manager}</Text>
              </View>
            )}
            {branch.phone && (
              <View style={styles.contactRow}>
                <Text style={styles.contactLabel}>Phone:</Text>
                <Text style={styles.phoneText}>{branch.phone}</Text>
              </View>
            )}
          </View>
        )}

        {/* GST State Code */}
        <View style={styles.gstSection}>
          <Text style={styles.gstLabel}>GST State Code:</Text>
          <Text style={styles.gstCode}>{branch.stateCode}</Text>
        </View>

        {/* Glassmorphism Overlay for Non-Manager Branches */}
        {!branch.usesManager && (
          <View style={styles.cardGlassmorphismOverlay}>
            <View style={styles.cardGlassmorphismContent}>
              <Text style={styles.cardGlassmorphismTitle}>Subscribe to Manager</Text>
              <Text style={styles.cardGlassmorphismSubtitle}>
                Get comprehensive business overview including staff attendance, sales performance, stock analysis, and financial insights for this branch.
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
        
        <Text style={styles.headerTitle}>Branches</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredBranches.length} branches
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
                      outlineStyle: 'none' as any,
                    },
                  }),
                ]}
                placeholder="Search branches..."
                placeholderTextColor={Colors.textLight}
                value={searchQuery}
                onChangeText={setSearchQuery}
              />
            </View>
          </View>
      </View>

      {/* Branches List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, webContainerStyles.webScrollContent]}
        showsVerticalScrollIndicator={false}
      >
        {filteredBranches.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Branches Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No branches match your search criteria' : 'Add your first branch office to get started'}
            </Text>
          </View>
        ) : (
          filteredBranches.map(renderBranchCard)
        )}
      </ScrollView>

      {/* Add Branch FAB */}
      <TouchableOpacity
        style={styles.addBranchFAB}
        onPress={handleAddBranch}
        activeOpacity={0.8}
      >
        <Plus size={20} color="#ffffff" />
        <Text style={styles.addBranchText}>Add Branch</Text>
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
            <Text style={styles.deleteModalTitle}>Delete Branch</Text>
            <Text style={styles.deleteModalText}>
              Are you sure you want to delete this branch? This action cannot be undone.
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
                onPress={confirmDeleteBranch}
                activeOpacity={0.7}
              >
                <Text style={styles.deleteModalConfirmText}>Delete</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Branch Overview Modal */}
      <Modal
        visible={showOverviewModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowOverviewModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.overviewModal}>
            {selectedBranch && (
              <>
                {/* Header */}
                <View style={styles.overviewHeader}>
                  <View style={styles.overviewIconContainer}>
                    <Building2 size={32} color={Colors.primary} />
                  </View>
                  <View style={styles.overviewTitleSection}>
                    <Text style={styles.overviewTitle}>{selectedBranch.name}</Text>
                    <View style={styles.overviewStatusRow}>
                      <View style={[
                        styles.overviewStatusBadge,
                        { backgroundColor: `${getStatusColor(selectedBranch.status)}20` }
                      ]}>
                        <Text style={[
                          styles.overviewStatusText,
                          { color: getStatusColor(selectedBranch.status) }
                        ]}>
                          {selectedBranch.status.toUpperCase()}
                        </Text>
                      </View>
                      {selectedBranch.isPrimary && (
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
                  {selectedBranch.usesManager ? (
                    <>
                      {/* Critical Alerts - Top Priority */}
                      <View style={styles.overviewSection}>
                        <Text style={styles.overviewSectionTitle}>Critical Alerts</Text>
                        <View style={styles.overviewStatsGrid}>
                          <View style={[styles.overviewStatCard, styles.criticalCard]}>
                            <Text style={styles.overviewStatValue}>{formatCurrency(selectedBranch.overdueReceivables || 0)}</Text>
                            <Text style={styles.overviewStatLabel}>Overdue Receivables</Text>
                          </View>
                          <View style={[styles.overviewStatCard, styles.criticalCard]}>
                            <Text style={styles.overviewStatValue}>{formatCurrency(selectedBranch.overduePayables || 0)}</Text>
                            <Text style={styles.overviewStatLabel}>Overdue Payables</Text>
                          </View>
                        </View>
                      </View>

                      {/* Customer Overdue Details */}
                      {(selectedBranch.overdueReceivables || 0) > 0 && (
                        <View style={styles.overviewSection}>
                          <Text style={styles.overviewSectionTitle}>Overdue Customers</Text>
                          <View style={styles.overdueItem}>
                            <Text style={styles.overdueName}>ABC Company Ltd.</Text>
                            <Text style={styles.overdueAmount}>₹1,20,000</Text>
                          </View>
                          <View style={styles.overdueItem}>
                            <Text style={styles.overdueName}>XYZ Industries</Text>
                            <Text style={styles.overdueAmount}>₹80,000</Text>
                          </View>
                          <View style={styles.overdueItem}>
                            <Text style={styles.overdueName}>DEF Trading Co.</Text>
                            <Text style={styles.overdueAmount}>₹1,20,000</Text>
                          </View>
                        </View>
                      )}

                      {/* Supplier Overdue Details */}
                      {(selectedBranch.overduePayables || 0) > 0 && (
                        <View style={styles.overviewSection}>
                          <Text style={styles.overviewSectionTitle}>Overdue Suppliers</Text>
                          <View style={styles.overdueItem}>
                            <Text style={styles.overdueName}>GHI Suppliers</Text>
                            <Text style={styles.overviewLineValue}>₹60,000</Text>
                          </View>
                          <View style={styles.overdueItem}>
                            <Text style={styles.overdueName}>JKL Manufacturing</Text>
                            <Text style={styles.overviewLineValue}>₹1,20,000</Text>
                          </View>
                        </View>
                      )}

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
                              {salesPeriod === 'daily' && formatCurrency(selectedBranch.dailySales || 0)}
                              {salesPeriod === 'weekly' && formatCurrency(selectedBranch.weeklySales || 0)}
                              {salesPeriod === 'monthly' && formatCurrency(selectedBranch.monthlySales || 0)}
                            </Text>
                            <Text style={styles.overviewStatLabel}>
                              {salesPeriod === 'daily' ? 'Daily Sales' : salesPeriod === 'weekly' ? 'Weekly Sales' : 'Monthly Sales'}
                            </Text>
                          </View>
                          <View style={styles.overviewStatCard}>
                            <Text style={styles.overviewStatValue}>
                              +{salesPeriod === 'daily' && (selectedBranch.dailyGrowth || 0)}
                              {salesPeriod === 'weekly' && (selectedBranch.weeklyGrowth || 0)}
                              {salesPeriod === 'monthly' && (selectedBranch.monthlyGrowth || 0)}%
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
                          <Text style={styles.overviewLineValue}>{formatCurrency(selectedBranch.cashInHand || 0)}</Text>
                        </View>
                        <View style={styles.overviewLineItem}>
                          <Text style={styles.overviewLineLabel}>Receivables:</Text>
                          <Text style={styles.overviewLineValue}>{formatCurrency(selectedBranch.receivables || 0)}</Text>
                        </View>
                        <View style={styles.overviewLineItem}>
                          <Text style={styles.overviewLineLabel}>Payables:</Text>
                          <Text style={styles.overviewLineValue}>{formatCurrency(selectedBranch.payables || 0)}</Text>
                        </View>
                      </View>

                      {/* Stock Overview */}
                      <View style={styles.overviewSection}>
                        <Text style={styles.overviewSectionTitle}>Stock Overview</Text>
                        <View style={styles.overviewLineItem}>
                          <Text style={styles.overviewLineLabel}>Current Stock Value:</Text>
                          <Text style={styles.overviewLineValue}>{formatCurrency(selectedBranch.stockValue || 0)}</Text>
                        </View>
                        <View style={styles.overviewLineItem}>
                          <Text style={styles.overviewLineLabel}>Low Stock Items:</Text>
                          <Text style={[styles.overviewLineValue, styles.lowStockAlert]}>{selectedBranch.lowStockItems || 0}</Text>
                        </View>
                        <View style={styles.overviewLineItem}>
                          <Text style={styles.overviewLineLabel}>Near Low Stock:</Text>
                          <Text style={[styles.overviewLineValue, styles.nearLowStockAlert]}>{selectedBranch.nearLowStockItems || 0}</Text>
                        </View>
                      </View>

                      {/* Staff Overview */}
                      <View style={styles.overviewSection}>
                        <Text style={styles.overviewSectionTitle}>Staff Overview</Text>
                        <View style={styles.overviewStatsGrid}>
                          <View style={styles.overviewStatCard}>
                            <Text style={styles.overviewStatValue}>{selectedBranch.staffCount || 0}</Text>
                            <Text style={styles.overviewStatLabel}>Total Staff</Text>
                          </View>
                          <View style={styles.overviewStatCard}>
                            <Text style={styles.overviewStatValue}>{selectedBranch.staffAttendance || 0}%</Text>
                            <Text style={styles.overviewStatLabel}>Attendance Rate</Text>
                          </View>
                        </View>
                      </View>

                      {/* Staff on Leave */}
                      <View style={styles.overviewSection}>
                        <Text style={styles.overviewSectionTitle}>Staff on Leave</Text>
                        <View style={styles.leaveItem}>
                          <Text style={styles.leaveName}>Rajesh Kumar</Text>
                          <Text style={styles.leaveType}>Sick Leave</Text>
                          <Text style={styles.leaveDuration}>2 days</Text>
                        </View>
                        <View style={styles.leaveItem}>
                          <Text style={styles.leaveName}>Priya Sharma</Text>
                          <Text style={styles.leaveType}>Personal Leave</Text>
                          <Text style={styles.leaveDuration}>1 day</Text>
                        </View>
                      </View>

                      {/* Address Section */}
                      <View style={styles.overviewSection}>
                        <Text style={styles.overviewSectionTitle}>Address</Text>
                        <View style={styles.overviewAddressRow}>
                          <MapPin size={20} color={Colors.textLight} />
                          <Text style={styles.overviewAddressText}>{formatAddress(selectedBranch)}</Text>
                        </View>
                      </View>

                      {/* Manager & Contact Section */}
                      {(selectedBranch.manager || selectedBranch.phone) && (
                        <View style={styles.overviewSection}>
                          <Text style={styles.overviewSectionTitle}>Contact Information</Text>
                          {selectedBranch.manager && (
                            <View style={styles.overviewContactRow}>
                              <Text style={styles.overviewContactLabel}>Manager:</Text>
                              <Text style={styles.overviewContactValue}>{selectedBranch.manager}</Text>
                            </View>
                          )}
                          {selectedBranch.phone && (
                            <View style={styles.overviewContactRow}>
                              <Text style={styles.overviewContactLabel}>Phone:</Text>
                              <Text style={styles.overviewContactValue}>{selectedBranch.phone}</Text>
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
                            Get comprehensive business overview including staff attendance, sales performance, stock analysis, and financial insights for this branch.
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
                      handleEditBranch(selectedBranch);
                    }}
                    activeOpacity={0.8}
                  >
                    <Edit3 size={20} color="#ffffff" />
                    <Text style={styles.overviewEditButtonText}>Edit Branch</Text>
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
  branchCard: {
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
  branchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  branchLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  branchIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  branchInfo: {
    flex: 1,
  },
  branchName: {
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
  branchActions: {
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
    marginBottom: 12,
    gap: 8,
  },
  addressText: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
    lineHeight: 20,
  },
  contactSection: {
    marginBottom: 12,
    gap: 6,
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
    minWidth: 70,
  },
  managerText: {
    fontSize: 14,
    color: '#3F66AC', // Brand blue for manager name
    fontWeight: '600',
    flex: 1,
  },
  phoneText: {
    fontSize: 14,
    color: '#059669', // Success green for phone number
    fontWeight: '600',
    flex: 1,
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
  addBranchFAB: {
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
  addBranchText: {
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
    backgroundColor: '#f0f4ff',
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
  // Overdue Item Styles
  overdueItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    marginBottom: 6,
  },
  overdueName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
    flex: 1,
  },
  overdueAmount: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
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