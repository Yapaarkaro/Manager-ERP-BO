import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  RefreshControl,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Filter,
  Package,
  TriangleAlert as AlertTriangle,
  TrendingDown,
  Eye,
  Square,
  SquareCheck as CheckSquare,
  FileText,
  Send,
  Truck,
  Users,
  X,
} from 'lucide-react-native';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';
import { getLowStockProducts, getSuppliers, invalidateApiCache } from '@/services/backendApi';
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
  },
};

interface LowStockItem {
  id: string;
  name: string;
  image: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  price: number;
  hsnCode: string;
  barcode: string;
  taxRate: number;
  supplierId: string;
  supplierName: string;
  location: string;
  lastRestocked: string;
  stockValue: number;
  urgencyLevel: 'critical' | 'low' | 'moderate';
  primaryUnit: string;
}

export default function LowStockScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [lowStockItems, setLowStockItems] = useState<LowStockItem[]>([]);
  const [filteredItems, setFilteredItems] = useState<LowStockItem[]>([]);
  const [isNavigating, setIsNavigating] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [showFilterModal, setShowFilterModal] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [supplierMap, setSupplierMap] = useState<Record<string, any>>({});
  const [showSupplierChoiceModal, setShowSupplierChoiceModal] = useState(false);
  const [activeFilters, setActiveFilters] = useState({
    urgencyLevel: [] as string[],
    category: [] as string[],
    supplier: [] as string[],
    location: [] as string[],
    dateRange: 'all' as string,
    priceRange: 'none' as string,
    stockRange: 'none' as string,
  });
  const [refreshing, setRefreshing] = useState(false);
  const debouncedNavigate = useDebounceNavigation(500);

  const loadData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [stockResult, suppResult] = await Promise.all([
        getLowStockProducts(),
        getSuppliers(),
      ]);

      const sMap: Record<string, any> = {};
      if (suppResult.success && suppResult.suppliers) {
        suppResult.suppliers.forEach((s: any) => {
          sMap[s.id] = s;
        });
      }
      setSupplierMap(sMap);

      if (stockResult.success && stockResult.products) {
        const items: LowStockItem[] = stockResult.products.map((prod: any) => {
          const suppId = prod.preferred_supplier_id || '';
          const supp = sMap[suppId];
          return {
            id: prod.id,
            name: prod.name,
            image: prod.product_image || '',
            category: prod.category || 'Uncategorized',
            currentStock: parseFloat(prod.current_stock) || 0,
            minStockLevel: parseFloat(prod.min_stock_level) || 0,
            maxStockLevel: parseFloat(prod.max_stock_level) || 0,
            price: parseFloat(prod.per_unit_price) || parseFloat(prod.sales_price) || 0,
            hsnCode: prod.hsn_code || '',
            barcode: prod.barcode || '',
            taxRate: parseFloat(prod.tax_rate) || 0,
            supplierId: suppId,
            supplierName: supp
              ? supp.business_name || supp.contact_person || ''
              : prod.supplier_name || prod.preferred_supplier_name || '',
            location: prod.storage_location_name || prod.storage_location_id || '',
            lastRestocked: prod.last_restocked_at
              ? new Date(prod.last_restocked_at).toISOString().split('T')[0]
              : new Date().toISOString().split('T')[0],
            stockValue: parseFloat(prod.stock_value) || 0,
            urgencyLevel: (prod.urgency_level || 'normal') as any,
            primaryUnit: prod.primary_unit || 'pcs',
          };
        });
        setLowStockItems(items);
        setFilteredItems(items);
      } else {
        setLowStockItems([]);
        setFilteredItems([]);
      }
    } catch (error) {
      console.error('Error loading low stock:', error);
      setLowStockItems([]);
      setFilteredItems([]);
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
    loadData().catch(console.error);
    setTimeout(() => setRefreshing(false), 600);
  }, [loadData]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    applyFilters(query);
  };

  const applyFilters = (query: string = '') => {
    let filtered = lowStockItems;
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(
        (item) =>
          item.name.toLowerCase().includes(q) ||
          item.category.toLowerCase().includes(q) ||
          item.supplierName.toLowerCase().includes(q) ||
          item.hsnCode.includes(query) ||
          item.barcode.includes(query)
      );
    }
    if (activeFilters.urgencyLevel.length > 0)
      filtered = filtered.filter((i) => activeFilters.urgencyLevel.includes(i.urgencyLevel));
    if (activeFilters.category.length > 0)
      filtered = filtered.filter((i) => activeFilters.category.includes(i.category));
    if (activeFilters.supplier.length > 0)
      filtered = filtered.filter((i) => activeFilters.supplier.includes(i.supplierName));
    if (activeFilters.location.length > 0)
      filtered = filtered.filter((i) => activeFilters.location.includes(i.location));
    if (activeFilters.dateRange !== 'all') {
      const today = new Date();
      const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
      switch (activeFilters.dateRange) {
        case 'today':
          filtered = filtered.filter((i) => new Date(i.lastRestocked) >= todayStart);
          break;
        case 'week': {
          const w = new Date(todayStart.getTime() - today.getDay() * 86400000);
          filtered = filtered.filter((i) => new Date(i.lastRestocked) >= w);
          break;
        }
        case 'month': {
          const m = new Date(today.getFullYear(), today.getMonth(), 1);
          filtered = filtered.filter((i) => new Date(i.lastRestocked) >= m);
          break;
        }
      }
    }
    if (activeFilters.priceRange !== 'none')
      filtered = [...filtered].sort((a, b) =>
        activeFilters.priceRange === 'lowToHigh' ? a.price - b.price : b.price - a.price
      );
    if (activeFilters.stockRange !== 'none')
      filtered = [...filtered].sort((a, b) =>
        activeFilters.stockRange === 'lowToHigh'
          ? a.currentStock - b.currentStock
          : b.currentStock - a.currentStock
      );
    setFilteredItems(filtered);
  };

  const handleFilterToggle = (filterType: keyof typeof activeFilters, value: string) => {
    setActiveFilters((prev) => {
      const n = { ...prev };
      if (filterType === 'dateRange' || filterType === 'priceRange' || filterType === 'stockRange') {
        (n[filterType] as string) = value;
      } else {
        const cur = n[filterType] as string[];
        (n[filterType] as string[]) = cur.includes(value)
          ? cur.filter((v) => v !== value)
          : [...cur, value];
      }
      return n;
    });
  };

  const clearAllFilters = () => {
    setActiveFilters({
      urgencyLevel: [],
      category: [],
      supplier: [],
      location: [],
      dateRange: 'all',
      priceRange: 'none',
      stockRange: 'none',
    });
  };

  const getActiveFiltersCount = () => {
    let c = 0;
    if (activeFilters.urgencyLevel.length > 0) c++;
    if (activeFilters.category.length > 0) c++;
    if (activeFilters.supplier.length > 0) c++;
    if (activeFilters.location.length > 0) c++;
    if (activeFilters.dateRange !== 'all') c++;
    if (activeFilters.priceRange !== 'none') c++;
    if (activeFilters.stockRange !== 'none') c++;
    return c;
  };

  useEffect(() => {
    applyFilters(searchQuery);
  }, [activeFilters, lowStockItems]);

  const handleItemPress = (item: LowStockItem) => {
    if (isNavigating) return;
    setIsNavigating(true);
    debouncedNavigate({ pathname: '/inventory/product-details', params: { productId: item.id } });
    setTimeout(() => setIsNavigating(false), 1000);
  };

  // --- Selection ---
  const toggleSelection = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      next.has(id) ? next.delete(id) : next.add(id);
      return next;
    });
  };

  const selectedItems = filteredItems.filter((i) => selectedIds.has(i.id));
  const selectionCount = selectedItems.length;

  const clearSelection = () => setSelectedIds(new Set());

  const getReorderQty = (item: LowStockItem) => Math.max(0, item.maxStockLevel - item.currentStock);

  const truncateSupplierName = (name: string, maxLen = 20) =>
    name.length <= maxLen ? name : name.substring(0, maxLen) + '…';

  // When a single item is selected and user taps "Create PO with [supplier]"
  const handleSingleItemPO = () => {
    const item = selectedItems[0];
    if (!item) return;
    if (!item.supplierId && !item.supplierName) {
      Alert.alert('No Preferred Supplier', 'This product has no preferred supplier. Please select a supplier manually.', [
        { text: 'Select Supplier', onPress: () => navigateToSelectSupplier([item]) },
        { text: 'Cancel', style: 'cancel' },
      ]);
      return;
    }
    navigateToReview([item], 'preferred');
  };

  // When multiple items: ask single supplier or preferred suppliers
  const handleMultiItemPO = () => {
    const itemsWithoutSupplier = selectedItems.filter((i) => !i.supplierId && !i.supplierName);
    if (itemsWithoutSupplier.length === selectedItems.length) {
      Alert.alert(
        'No Preferred Suppliers',
        'None of the selected products have a preferred supplier. Please select a supplier manually.',
        [
          { text: 'Select Supplier', onPress: () => navigateToSelectSupplier(selectedItems) },
          { text: 'Cancel', style: 'cancel' },
        ]
      );
      return;
    }
    setShowSupplierChoiceModal(true);
  };

  const handleSupplierChoice = (choice: 'preferred' | 'single') => {
    setShowSupplierChoiceModal(false);
    if (choice === 'single') {
      navigateToSelectSupplier(selectedItems);
    } else {
      navigateToReview(selectedItems, 'preferred');
    }
  };

  const navigateToSelectSupplier = (items: LowStockItem[]) => {
    const poItems = items.map((i) => ({
      id: i.id,
      name: i.name,
      category: i.category,
      price: i.price,
      unit: i.primaryUnit,
      hsnCode: i.hsnCode,
      taxRate: i.taxRate,
      currentStock: i.currentStock,
      maxStockLevel: i.maxStockLevel,
      orderQuantity: getReorderQty(i),
      supplierId: i.supplierId,
      supplierName: i.supplierName,
    }));
    safeRouter.push({
      pathname: '/purchasing/select-supplier',
      params: { autoPoItems: JSON.stringify(poItems) },
    });
  };

  const navigateToReview = (items: LowStockItem[], mode: 'preferred' | 'single') => {
    const grouped: Record<string, any[]> = {};
    items.forEach((i) => {
      const key = i.supplierId || '__no_supplier__';
      if (!grouped[key]) grouped[key] = [];
      grouped[key].push({
        id: i.id,
        name: i.name,
        category: i.category,
        price: i.price,
        unit: i.primaryUnit,
        hsnCode: i.hsnCode,
        taxRate: i.taxRate,
        currentStock: i.currentStock,
        maxStockLevel: i.maxStockLevel,
        orderQuantity: getReorderQty(i),
        supplierId: i.supplierId,
        supplierName: i.supplierName,
      });
    });

    const supplierGroups = Object.entries(grouped).map(([suppId, products]) => {
      const supp = supplierMap[suppId];
      return {
        supplierId: suppId === '__no_supplier__' ? '' : suppId,
        supplierName:
          supp?.business_name || supp?.contact_person || products[0]?.supplierName || 'Unknown',
        supplierBusinessId: supp?.business_id || null,
        products,
      };
    });

    safeRouter.push({
      pathname: '/inventory/auto-po-review' as any,
      params: { supplierGroups: JSON.stringify(supplierGroups) },
    });
  };

  const handleCreatePOAction = () => {
    if (selectionCount === 1) {
      handleSingleItemPO();
    } else {
      handleMultiItemPO();
    }
  };

  // --- Render helpers ---
  const getUrgencyColor = (u: string) => {
    switch (u) {
      case 'critical': return Colors.error;
      case 'low': return Colors.warning;
      case 'moderate': return '#f59e0b';
      default: return Colors.textLight;
    }
  };
  const getUrgencyText = (u: string) => u.toUpperCase();

  const formatPrice = (p: number) =>
    new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', minimumFractionDigits: 0, maximumFractionDigits: 3 }).format(p);

  const formatDate = (d: string) =>
    new Date(d).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

  const getStockPercentage = (cur: number, _min: number, max: number) =>
    max > 0 ? Math.round((cur / max) * 100) : 0;

  const renderLowStockCard = (item: LowStockItem) => {
    const pct = getStockPercentage(item.currentStock, item.minStockLevel, item.maxStockLevel);
    const uColor = getUrgencyColor(item.urgencyLevel);
    const isSelected = selectedIds.has(item.id);
    const reorderQty = getReorderQty(item);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.itemCard, { borderLeftColor: uColor }, isSelected && styles.selectedCard]}
        onPress={() => toggleSelection(item.id)}
        activeOpacity={0.8}
      >
        <View style={styles.itemHeader}>
          <View style={styles.checkboxArea}>
            {isSelected ? (
              <CheckSquare size={22} color={Colors.primary} />
            ) : (
              <Square size={22} color={Colors.grey[300]} />
            )}
          </View>

          <TouchableOpacity
            style={styles.cardBody}
            onPress={() => handleItemPress(item)}
            activeOpacity={0.7}
            disabled={isNavigating}
          >
            {item.image ? (
              <Image source={{ uri: item.image }} style={styles.productImage} />
            ) : (
              <View style={[styles.productImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                <Package size={16} color="#6B7280" />
              </View>
            )}
            <View style={styles.productInfo}>
              <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
              <Text style={styles.productCategory}>{item.category}</Text>
              <Text style={styles.productPrice}>{formatPrice(item.price)}</Text>
            </View>
          </TouchableOpacity>

          <View style={styles.itemRight}>
            <View style={[styles.urgencyBadge, { backgroundColor: `${uColor}20` }]}>
              <Text style={[styles.urgencyText, { color: uColor }]}>{getUrgencyText(item.urgencyLevel)}</Text>
            </View>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleItemPress(item)}
              activeOpacity={0.7}
              disabled={isNavigating}
            >
              <Eye size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.stockSection}>
          <View style={styles.stockHeader}>
            <View style={styles.stockInfo}>
              <Text style={styles.stockLabel}>Current Stock</Text>
              <Text style={[styles.stockValue, { color: uColor }]}>{item.currentStock} {item.primaryUnit}</Text>
            </View>
            <View style={styles.stockInfo}>
              <Text style={styles.stockLabel}>Min Required</Text>
              <Text style={styles.stockValue}>{item.minStockLevel} {item.primaryUnit}</Text>
            </View>
            <View style={styles.stockInfo}>
              <Text style={styles.stockLabel}>Reorder Qty</Text>
              <Text style={[styles.stockValue, { color: Colors.primary }]}>{reorderQty} {item.primaryUnit}</Text>
            </View>
          </View>

          <View style={styles.stockProgressContainer}>
            <View style={styles.stockProgressBar}>
              <View style={[styles.stockProgressFill, { width: `${Math.min(pct, 100)}%`, backgroundColor: uColor }]} />
            </View>
            <Text style={styles.stockPercentage}>{pct}%</Text>
          </View>

          <View style={styles.additionalInfo}>
            {item.supplierName ? (
              <View style={styles.infoRow}>
                <Text style={styles.infoLabel}>Supplier:</Text>
                <Text style={styles.infoValue}>{item.supplierName}</Text>
              </View>
            ) : null}
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{item.location || '—'}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Restocked:</Text>
              <Text style={styles.infoValue}>{formatDate(item.lastRestocked)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Stock Value:</Text>
              <Text style={[styles.infoValue, styles.stockValueText]}>{formatPrice(item.stockValue)}</Text>
            </View>
          </View>
        </View>

        {/* Inline PO button when this single item is selected */}
        {isSelected && selectionCount === 1 && item.supplierName ? (
          <TouchableOpacity style={styles.inlinePoBtn} onPress={handleSingleItemPO} activeOpacity={0.7}>
            <FileText size={16} color="#fff" />
            <Text style={styles.inlinePoBtnText} numberOfLines={1}>
              Create PO with {truncateSupplierName(item.supplierName)}
            </Text>
          </TouchableOpacity>
        ) : null}
      </TouchableOpacity>
    );
  };

  const criticalItems = filteredItems.filter((i) => i.urgencyLevel === 'critical').length;
  const totalStockValue = filteredItems.reduce((s, i) => s + i.stockValue, 0);

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Low Stock Items</Text>
        <View style={styles.headerRight}>
          {selectionCount > 0 ? (
            <TouchableOpacity onPress={clearSelection} style={styles.clearSelBtn}>
              <Text style={styles.clearSelText}>{selectionCount} selected</Text>
              <X size={14} color={Colors.primary} />
            </TouchableOpacity>
          ) : (
            <Text style={styles.totalCount}>{filteredItems.length} items</Text>
          )}
        </View>
      </View>

      {/* Summary */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <AlertTriangle size={20} color={Colors.error} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Critical</Text>
            <Text style={[styles.summaryValue, { color: Colors.error }]}>{criticalItems}</Text>
          </View>
        </View>
        <View style={styles.summaryCard}>
          <Package size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>{filteredItems.length}</Text>
          </View>
        </View>
        <View style={styles.summaryCard}>
          <TrendingDown size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Value</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>{formatPrice(totalStockValue)}</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      {/* Search */}
      <View style={styles.inlineSearchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search low stock items..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity style={styles.filterButton} onPress={() => setShowFilterModal(true)} activeOpacity={0.7}>
            <Filter size={20} color="#FFFFFF" />
            {getActiveFiltersCount() > 0 && (
              <View style={styles.filterBadge}>
                <Text style={styles.filterBadgeText}>{getActiveFiltersCount()}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />

      {/* List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[styles.scrollContent, selectionCount > 1 && { paddingBottom: 160 }]}
        showsVerticalScrollIndicator={false}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
      >
        {isLoading ? (
          <View style={styles.emptyState}>
            <Package size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>Loading...</Text>
            <Text style={styles.emptyStateText}>Fetching low stock items</Text>
          </View>
        ) : filteredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Low Stock Items</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No items match your search criteria' : 'All items are well stocked'}
            </Text>
          </View>
        ) : (
          filteredItems.map(renderLowStockCard)
        )}
      </ScrollView>

      {/* Bottom bar for multi-select */}
      {selectionCount > 1 && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomBarInfo}>
            <Text style={styles.bottomBarCount}>{selectionCount} items selected</Text>
            <Text style={styles.bottomBarQty}>
              Total reorder: {selectedItems.reduce((s, i) => s + getReorderQty(i), 0)} units
            </Text>
          </View>
          <TouchableOpacity style={styles.createPOBtn} onPress={handleCreatePOAction} activeOpacity={0.8}>
            <Send size={16} color="#fff" />
            <Text style={styles.createPOBtnText}>Auto Create PO</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Supplier Choice Modal */}
      <Modal visible={showSupplierChoiceModal} transparent animationType="fade" onRequestClose={() => setShowSupplierChoiceModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.choiceModal}>
            <Text style={styles.choiceTitle}>How would you like to create POs?</Text>
            <Text style={styles.choiceSubtitle}>
              You've selected {selectionCount} products from multiple suppliers
            </Text>

            <TouchableOpacity style={styles.choiceOption} onPress={() => handleSupplierChoice('preferred')} activeOpacity={0.7}>
              <View style={styles.choiceIconBg}>
                <Truck size={24} color={Colors.primary} />
              </View>
              <View style={styles.choiceContent}>
                <Text style={styles.choiceOptionTitle}>Preferred Suppliers</Text>
                <Text style={styles.choiceOptionDesc}>
                  Auto-create separate POs grouped by each product's preferred supplier
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.choiceOption} onPress={() => handleSupplierChoice('single')} activeOpacity={0.7}>
              <View style={styles.choiceIconBg}>
                <Users size={24} color={Colors.success} />
              </View>
              <View style={styles.choiceContent}>
                <Text style={styles.choiceOptionTitle}>One Supplier</Text>
                <Text style={styles.choiceOptionDesc}>
                  Send all products to a single supplier of your choice
                </Text>
              </View>
            </TouchableOpacity>

            <TouchableOpacity style={styles.choiceCancelBtn} onPress={() => setShowSupplierChoiceModal(false)}>
              <Text style={styles.choiceCancelText}>Cancel</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>

      {/* Filter Modal */}
      <Modal visible={showFilterModal} transparent animationType="slide" onRequestClose={() => setShowFilterModal(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.filterModal}>
            <View style={styles.filterModalHeader}>
              <Text style={styles.filterModalTitle}>Filter Low Stock Items</Text>
              <TouchableOpacity style={styles.closeButton} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.closeButtonText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.filterModalContent} showsVerticalScrollIndicator={false}>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Urgency Level</Text>
                <View style={styles.filterOptions}>
                  {['critical', 'moderate', 'low'].map((u) => (
                    <TouchableOpacity
                      key={u}
                      style={[styles.filterOption, activeFilters.urgencyLevel.includes(u) && styles.filterOptionActive]}
                      onPress={() => handleFilterToggle('urgencyLevel', u)}
                    >
                      <Text style={[styles.filterOptionText, activeFilters.urgencyLevel.includes(u) && styles.filterOptionTextActive]}>
                        {u.charAt(0).toUpperCase() + u.slice(1)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Last Restocked</Text>
                <View style={styles.filterOptions}>
                  {[{ value: 'all', label: 'All Time' }, { value: 'today', label: 'Today' }, { value: 'week', label: 'This Week' }, { value: 'month', label: 'This Month' }].map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.filterOption, activeFilters.dateRange === r.value && styles.filterOptionActive]}
                      onPress={() => handleFilterToggle('dateRange', r.value)}
                    >
                      <Text style={[styles.filterOptionText, activeFilters.dateRange === r.value && styles.filterOptionTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
              <View style={styles.filterSection}>
                <Text style={styles.filterSectionTitle}>Stock Range</Text>
                <View style={styles.filterOptions}>
                  {[{ value: 'none', label: 'No Sort' }, { value: 'lowToHigh', label: 'Low → High' }, { value: 'highToLow', label: 'High → Low' }].map((r) => (
                    <TouchableOpacity
                      key={r.value}
                      style={[styles.filterOption, activeFilters.stockRange === r.value && styles.filterOptionActive]}
                      onPress={() => handleFilterToggle('stockRange', r.value)}
                    >
                      <Text style={[styles.filterOptionText, activeFilters.stockRange === r.value && styles.filterOptionTextActive]}>
                        {r.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            </ScrollView>
            <View style={styles.filterModalActions}>
              <TouchableOpacity style={styles.clearFiltersButton} onPress={clearAllFilters}>
                <Text style={styles.clearFiltersButtonText}>Clear All</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.applyFiltersButton} onPress={() => setShowFilterModal(false)}>
                <Text style={styles.applyFiltersButtonText}>Apply</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.background },
  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  backButton: { width: 40, height: 40, justifyContent: 'center', alignItems: 'center', marginRight: 16 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: Colors.text, flex: 1 },
  headerRight: { alignItems: 'flex-end' },
  totalCount: { fontSize: 14, color: Colors.textLight },
  clearSelBtn: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: `${Colors.primary}15`, paddingHorizontal: 10, paddingVertical: 4, borderRadius: 14 },
  clearSelText: { fontSize: 13, fontWeight: '600', color: Colors.primary },
  summaryContainer: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 10, backgroundColor: Colors.grey[50] },
  summaryCard: { flex: 1, flexDirection: 'column', alignItems: 'center', backgroundColor: Colors.background, borderRadius: 12, padding: 10, shadowColor: '#000', shadowOffset: { width: 0, height: 1 }, shadowOpacity: 0.05, shadowRadius: 2, elevation: 1 },
  summaryInfo: { alignItems: 'center', marginTop: 6 },
  summaryLabel: { fontSize: 11, color: Colors.textLight, marginBottom: 2, textAlign: 'center' },
  summaryValue: { fontSize: 14, fontWeight: '700', textAlign: 'center' },
  divider: { height: 1, backgroundColor: Colors.grey[200], marginHorizontal: 16 },
  inlineSearchContainer: { paddingHorizontal: 16, paddingVertical: 12 },
  scrollView: { flex: 1 },
  scrollContent: { padding: 16, paddingBottom: 100 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center', paddingVertical: 100 },
  emptyStateTitle: { fontSize: 20, fontWeight: '600', color: Colors.text, marginTop: 16, marginBottom: 8 },
  emptyStateText: { fontSize: 14, color: Colors.textLight, textAlign: 'center', paddingHorizontal: 32 },
  itemCard: { backgroundColor: Colors.background, borderRadius: 12, padding: 16, marginBottom: 14, borderWidth: 1, borderColor: Colors.grey[200], borderLeftWidth: 4, shadowColor: '#000', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 3.84, elevation: 2 },
  selectedCard: { borderColor: Colors.primary, backgroundColor: '#f8faff' },
  itemHeader: { flexDirection: 'row', marginBottom: 14 },
  checkboxArea: { justifyContent: 'center', marginRight: 10 },
  cardBody: { flexDirection: 'row', flex: 1, marginRight: 10 },
  productImage: { width: 50, height: 50, borderRadius: 8, marginRight: 10 },
  productInfo: { flex: 1 },
  productName: { fontSize: 15, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  productCategory: { fontSize: 12, color: Colors.textLight, marginBottom: 3 },
  productPrice: { fontSize: 13, fontWeight: '600', color: Colors.success },
  itemRight: { alignItems: 'flex-end', gap: 8 },
  urgencyBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  urgencyText: { fontSize: 10, fontWeight: '700' },
  viewButton: { width: 30, height: 30, borderRadius: 15, backgroundColor: Colors.grey[50], justifyContent: 'center', alignItems: 'center' },
  stockSection: { backgroundColor: Colors.grey[50], borderRadius: 8, padding: 12 },
  stockHeader: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  stockInfo: { alignItems: 'center', flex: 1 },
  stockLabel: { fontSize: 11, color: Colors.textLight, marginBottom: 3 },
  stockValue: { fontSize: 13, fontWeight: '700', color: Colors.text },
  stockProgressContainer: { flexDirection: 'row', alignItems: 'center', marginBottom: 10, gap: 8 },
  stockProgressBar: { flex: 1, height: 6, backgroundColor: Colors.grey[200], borderRadius: 3, overflow: 'hidden' },
  stockProgressFill: { height: '100%', borderRadius: 3 },
  stockPercentage: { fontSize: 12, fontWeight: '600', color: Colors.textLight, minWidth: 32, textAlign: 'right' },
  additionalInfo: { gap: 4 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  infoLabel: { fontSize: 12, color: Colors.textLight },
  infoValue: { fontSize: 12, fontWeight: '500', color: Colors.text },
  stockValueText: { color: Colors.success, fontWeight: '600' },
  inlinePoBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', backgroundColor: Colors.primary, borderRadius: 8, paddingVertical: 10, paddingHorizontal: 14, marginTop: 12, gap: 6 },
  inlinePoBtnText: { fontSize: 14, fontWeight: '600', color: '#fff', flexShrink: 1 },
  // Bottom bar
  bottomBar: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderTopWidth: 1, borderTopColor: Colors.grey[200], backgroundColor: Colors.background },
  bottomBarInfo: { flex: 1 },
  bottomBarCount: { fontSize: 14, fontWeight: '600', color: Colors.text },
  bottomBarQty: { fontSize: 12, color: Colors.textLight, marginTop: 2 },
  createPOBtn: { flexDirection: 'row', alignItems: 'center', backgroundColor: Colors.primary, paddingHorizontal: 18, paddingVertical: 11, borderRadius: 10, gap: 6 },
  createPOBtnText: { fontSize: 14, fontWeight: '600', color: '#fff' },
  // Supplier choice modal
  choiceModal: { backgroundColor: Colors.background, borderRadius: 20, width: '88%', maxWidth: 400, padding: 24 },
  choiceTitle: { fontSize: 18, fontWeight: '700', color: Colors.text, textAlign: 'center', marginBottom: 6 },
  choiceSubtitle: { fontSize: 14, color: Colors.textLight, textAlign: 'center', marginBottom: 20 },
  choiceOption: { flexDirection: 'row', alignItems: 'center', padding: 16, borderRadius: 14, borderWidth: 1, borderColor: Colors.grey[200], marginBottom: 12, gap: 14 },
  choiceIconBg: { width: 48, height: 48, borderRadius: 24, backgroundColor: Colors.grey[50], justifyContent: 'center', alignItems: 'center' },
  choiceContent: { flex: 1 },
  choiceOptionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 3 },
  choiceOptionDesc: { fontSize: 13, color: Colors.textLight, lineHeight: 18 },
  choiceCancelBtn: { alignItems: 'center', paddingVertical: 12, marginTop: 4 },
  choiceCancelText: { fontSize: 15, fontWeight: '500', color: Colors.textLight },
  // Search & filter
  searchBar: { flexDirection: 'row', alignItems: 'center', backgroundColor: 'transparent', borderRadius: 25, paddingHorizontal: 16, paddingVertical: 14, minHeight: 52, borderWidth: 1, borderColor: Colors.grey[200] },
  searchInput: { flex: 1, fontSize: 16, color: Colors.text, marginLeft: 12, marginRight: 12 },
  filterButton: { width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.primary, justifyContent: 'center', alignItems: 'center' },
  filterBadge: { position: 'absolute', top: -5, right: -5, backgroundColor: Colors.error, borderRadius: 10, minWidth: 20, height: 20, justifyContent: 'center', alignItems: 'center', paddingHorizontal: 4 },
  filterBadgeText: { color: '#fff', fontSize: 12, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center' },
  filterModal: { backgroundColor: Colors.background, borderRadius: 20, width: '90%', maxWidth: 400, maxHeight: '80%' },
  filterModalHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 20, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] },
  filterModalTitle: { fontSize: 18, fontWeight: '700', color: Colors.text },
  closeButton: { width: 32, height: 32, borderRadius: 16, backgroundColor: Colors.grey[100], justifyContent: 'center', alignItems: 'center' },
  closeButtonText: { fontSize: 16, color: Colors.textLight, fontWeight: '600' },
  filterModalContent: { padding: 20 },
  filterSection: { marginBottom: 24 },
  filterSectionTitle: { fontSize: 16, fontWeight: '600', color: Colors.text, marginBottom: 12 },
  filterOptions: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  filterOption: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: Colors.grey[100], borderWidth: 1, borderColor: Colors.grey[200] },
  filterOptionActive: { backgroundColor: Colors.primary, borderColor: Colors.primary },
  filterOptionText: { fontSize: 14, color: Colors.textLight, fontWeight: '500' },
  filterOptionTextActive: { color: '#fff', fontWeight: '600' },
  filterModalActions: { flexDirection: 'row', padding: 20, borderTopWidth: 1, borderTopColor: Colors.grey[200], gap: 12 },
  clearFiltersButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.grey[100], alignItems: 'center' },
  clearFiltersButtonText: { fontSize: 16, fontWeight: '600', color: Colors.textLight },
  applyFiltersButton: { flex: 1, paddingVertical: 14, borderRadius: 12, backgroundColor: Colors.primary, alignItems: 'center' },
  applyFiltersButtonText: { fontSize: 16, fontWeight: '600', color: '#fff' },
});
