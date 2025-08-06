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
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Search, Filter, Plus, Building2, User, Phone, Mail, MapPin, Star, Package, TrendingUp, TrendingDown, Eye, MessageCircle, X, Award, Clock, CircleCheck as CheckCircle, TriangleAlert as AlertTriangle } from 'lucide-react-native';
import { dataStore, Supplier } from '@/utils/dataStore';

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

// Using Supplier interface from dataStore

const mockSuppliers: Supplier[] = [];

export default function SuppliersScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [suppliers, setSuppliers] = useState<Supplier[]>([]);
  const [filteredSuppliers, setFilteredSuppliers] = useState<Supplier[]>([]);
  const [selectedFilter, setSelectedFilter] = useState<'all' | 'active' | 'high_score'>('all');

  // Subscribe to data store changes
  React.useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => {
      const allSuppliers = dataStore.getSuppliers();
      setSuppliers(allSuppliers);
      applyFilters(searchQuery, selectedFilter);
    });

    // Initial load
    const allSuppliers = dataStore.getSuppliers();
    setSuppliers(allSuppliers);
    setFilteredSuppliers(allSuppliers);

    return unsubscribe;
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query, selectedFilter);
  };

  const handleFilterChange = (filter: typeof selectedFilter) => {
    setSelectedFilter(filter);
    applyFilters(searchQuery, filter);
  };

  const applyFilters = (query: string, filter: typeof selectedFilter) => {
    let filtered = suppliers;

    // Apply search filter
    if (query.trim() !== '') {
      filtered = filtered.filter(supplier =>
        supplier.name.toLowerCase().includes(query.toLowerCase()) ||
        supplier.businessName?.toLowerCase().includes(query.toLowerCase()) ||
        supplier.contactPerson.toLowerCase().includes(query.toLowerCase()) ||
        supplier.mobile.includes(query) ||
        supplier.email?.toLowerCase().includes(query.toLowerCase()) ||
        supplier.categories.some(cat => cat.toLowerCase().includes(query.toLowerCase()))
      );
    }

    // Apply status filter
    if (filter !== 'all') {
      filtered = filtered.filter(supplier => {
        switch (filter) {
          case 'active':
            return supplier.status === 'active';
          case 'high_score':
            return supplier.supplierScore >= 85;
          default:
            return true;
        }
      });
    }

    setFilteredSuppliers(filtered);
  };

  const handleSupplierPress = (supplier: Supplier) => {
    router.push({
      pathname: '/purchasing/supplier-details',
      params: {
        supplierId: supplier.id,
        supplierData: JSON.stringify(supplier)
      }
    });
  };

  const handleAddSupplier = () => {
    router.push('/purchasing/add-supplier');
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return Colors.success;
    if (score >= 80) return Colors.warning;
    if (score >= 70) return '#f59e0b';
    return Colors.error;
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'active': return Colors.success;
      case 'inactive': return Colors.error;
      case 'suspended': return Colors.warning;
      default: return Colors.textLight;
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const renderSupplierCard = (supplier: Supplier) => {
    const scoreColor = getScoreColor(supplier.supplierScore);
    const statusColor = getStatusColor(supplier.status);

    return (
      <TouchableOpacity
        key={supplier.id}
        style={[
          styles.supplierCard,
          { borderLeftColor: scoreColor }
        ]}
        onPress={() => handleSupplierPress(supplier)}
        activeOpacity={0.7}
      >
        {/* Header */}
        <View style={styles.supplierHeader}>
          <View style={styles.supplierLeft}>
            <Image 
              source={{ uri: supplier.avatar }}
              style={styles.supplierAvatar}
            />
            <View style={styles.supplierInfo}>
              <Text style={styles.supplierName}>
                {supplier.supplierType === 'business' ? supplier.businessName : supplier.name}
              </Text>
              <Text style={styles.contactPerson}>
                Contact: {supplier.contactPerson}
              </Text>
              <View style={styles.supplierMeta}>
                {supplier.supplierType === 'business' ? (
                  <Building2 size={14} color={Colors.textLight} />
                ) : (
                  <User size={14} color={Colors.textLight} />
                )}
                <Text style={styles.supplierType}>
                  {supplier.supplierType === 'business' ? 'Business' : 'Individual'}
                </Text>
                {supplier.gstin && (
                  <Text style={styles.gstin}>• {supplier.gstin}</Text>
                )}
              </View>
            </View>
          </View>

          <View style={styles.supplierRight}>
            <View style={[
              styles.scoreBadge,
              { backgroundColor: `${scoreColor}20` }
            ]}>
              <Award size={14} color={scoreColor} />
              <Text style={[
                styles.scoreText,
                { color: scoreColor }
              ]}>
                {supplier.supplierScore}
              </Text>
            </View>
            
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${statusColor}20` }
            ]}>
              <Text style={[
                styles.statusText,
                { color: statusColor }
              ]}>
                {supplier.status.toUpperCase()}
              </Text>
            </View>
          </View>
        </View>

        {/* Performance Metrics */}
        <View style={styles.performanceSection}>
          <View style={styles.performanceGrid}>
            <View style={styles.performanceItem}>
              <Clock size={16} color={Colors.primary} />
              <Text style={styles.performanceLabel}>On-Time</Text>
              <Text style={[
                styles.performanceValue,
                { color: supplier.onTimeDelivery >= 90 ? Colors.success : Colors.warning }
              ]}>
                {supplier.onTimeDelivery}%
              </Text>
            </View>

            <View style={styles.performanceItem}>
              <Star size={16} color={Colors.warning} />
              <Text style={styles.performanceLabel}>Quality</Text>
              <Text style={styles.performanceValue}>
                {supplier.qualityRating}/5
              </Text>
            </View>

            <View style={styles.performanceItem}>
              <Package size={16} color={Colors.success} />
              <Text style={styles.performanceLabel}>Products</Text>
              <Text style={styles.performanceValue}>
                {supplier.productCount}
              </Text>
            </View>

            <View style={styles.performanceItem}>
              <TrendingUp size={16} color={Colors.primary} />
              <Text style={styles.performanceLabel}>Orders</Text>
              <Text style={styles.performanceValue}>
                {supplier.totalOrders}
              </Text>
            </View>
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.orderSummary}>
          <View style={styles.orderSummaryRow}>
            <Text style={styles.orderSummaryLabel}>Total Value:</Text>
            <Text style={styles.orderSummaryValue}>
              {formatAmount(supplier.totalValue)}
            </Text>
          </View>
          <View style={styles.orderSummaryRow}>
            <Text style={styles.orderSummaryLabel}>Last Order:</Text>
            <Text style={styles.orderSummaryValue}>
              {supplier.lastOrderDate ? formatDate(supplier.lastOrderDate) : 'No orders yet'}
            </Text>
          </View>
        </View>

        {/* Categories */}
        <View style={styles.categoriesSection}>
          <Text style={styles.categoriesLabel}>Categories:</Text>
          <View style={styles.categoriesContainer}>
            {supplier.categories.slice(0, 3).map((category, index) => (
              <View key={index} style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>{category}</Text>
              </View>
            ))}
            {supplier.categories.length > 3 && (
              <View style={styles.categoryChip}>
                <Text style={styles.categoryChipText}>
                  +{supplier.categories.length - 3}
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* Contact Info */}
        <View style={styles.contactSection}>
          <View style={styles.contactRow}>
            <Phone size={14} color={Colors.textLight} />
            <Text style={styles.contactText}>{supplier.mobile}</Text>
          </View>
          {supplier.email && (
            <View style={styles.contactRow}>
              <Mail size={14} color={Colors.textLight} />
              <Text style={styles.contactText}>{supplier.email}</Text>
            </View>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const activeSuppliers = filteredSuppliers.filter(s => s.status === 'active').length;
  const avgScore = Math.round(filteredSuppliers.reduce((sum, s) => sum + s.supplierScore, 0) / filteredSuppliers.length);
  const totalValue = filteredSuppliers.reduce((sum, s) => sum + s.totalValue, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.push('/dashboard')}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Suppliers</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredSuppliers.length} suppliers
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <CheckCircle size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Active</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {activeSuppliers}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Award size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Avg Score</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {avgScore}
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <TrendingUp size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {formatAmount(totalValue)}
            </Text>
          </View>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <ScrollView 
          horizontal 
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.filterScrollContent}
        >
          {[
                          { key: 'all', label: 'All', count: suppliers.length },
              { key: 'active', label: 'Active', count: suppliers.filter(s => s.status === 'active').length },
              { key: 'high_score', label: 'High Score', count: suppliers.filter(s => s.supplierScore >= 85).length },
          ].map((filter) => (
            <TouchableOpacity
              key={filter.key}
              style={[
                styles.filterTab,
                selectedFilter === filter.key && styles.activeFilterTab
              ]}
              onPress={() => handleFilterChange(filter.key as typeof selectedFilter)}
              activeOpacity={0.7}
            >
              <Text style={[
                styles.filterTabText,
                selectedFilter === filter.key && styles.activeFilterTabText
              ]}>
                {filter.label}
              </Text>
              <View style={[
                styles.filterTabCount,
                selectedFilter === filter.key && styles.activeFilterTabCount
              ]}>
                <Text style={[
                  styles.filterTabCountText,
                  selectedFilter === filter.key && styles.activeFilterTabCountText
                ]}>
                  {filter.count}
                </Text>
              </View>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Suppliers List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredSuppliers.length === 0 ? (
          <View style={styles.emptyState}>
            <Building2 size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Suppliers Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No suppliers match your search criteria' : 'Add your first supplier to get started'}
            </Text>
          </View>
        ) : (
          filteredSuppliers.map(renderSupplierCard)
        )}
      </ScrollView>

      {/* Add Supplier FAB */}
      <TouchableOpacity
        style={styles.addSupplierFAB}
        onPress={handleAddSupplier}
        activeOpacity={0.8}
      >
        <Plus size={20} color="#ffffff" />
        <Text style={styles.addSupplierText}>Add Supplier</Text>
      </TouchableOpacity>

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
            <TextInput
              style={styles.searchInput}
              placeholder="Search suppliers..."
              placeholderTextColor={Colors.textLight}
              value={searchQuery}
              onChangeText={handleSearch}
            />
            <TouchableOpacity
              style={styles.filterButton}
              onPress={() => console.log('Advanced filter')}
              activeOpacity={0.7}
            >
              <Filter size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </SafeAreaView>
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
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
    backgroundColor: Colors.grey[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryInfo: {
    alignItems: 'center',
    marginTop: 8,
  },
  summaryLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '700',
    textAlign: 'center',
  },
  filterContainer: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    paddingVertical: 12,
  },
  filterScrollContent: {
    paddingHorizontal: 16,
    gap: 8,
  },
  filterTab: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 20,
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 8,
  },
  activeFilterTab: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  filterTabText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeFilterTabText: {
    color: Colors.background,
  },
  filterTabCount: {
    backgroundColor: Colors.grey[200],
    borderRadius: 10,
    paddingHorizontal: 6,
    paddingVertical: 2,
    minWidth: 20,
    alignItems: 'center',
  },
  activeFilterTabCount: {
    backgroundColor: Colors.background,
  },
  filterTabCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
  },
  activeFilterTabCountText: {
    color: Colors.primary,
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
  supplierCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 4,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  supplierHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  supplierLeft: {
    flexDirection: 'row',
    flex: 1,
    marginRight: 16,
  },
  supplierAvatar: {
    width: 60,
    height: 60,
    borderRadius: 30,
    marginRight: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  contactPerson: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 6,
  },
  supplierMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  supplierType: {
    fontSize: 12,
    color: Colors.textLight,
  },
  gstin: {
    fontSize: 11,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  supplierRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  scoreBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  scoreText: {
    fontSize: 12,
    fontWeight: '700',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '600',
  },
  performanceSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  performanceGrid: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  performanceItem: {
    alignItems: 'center',
    gap: 4,
  },
  performanceLabel: {
    fontSize: 11,
    color: Colors.textLight,
    textAlign: 'center',
  },
  performanceValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  orderSummary: {
    gap: 6,
    marginBottom: 12,
  },
  orderSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  orderSummaryLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  orderSummaryValue: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  categoriesSection: {
    marginBottom: 12,
  },
  categoriesLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 6,
  },
  categoriesContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
  },
  categoryChip: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryChipText: {
    fontSize: 10,
    color: Colors.background,
    fontWeight: '500',
  },
  contactSection: {
    gap: 6,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  contactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  contactText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  addSupplierFAB: {
    position: 'absolute',
    bottom: 90,
    right: 20,
    backgroundColor: Colors.primary,
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
  addSupplierText: {
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
});