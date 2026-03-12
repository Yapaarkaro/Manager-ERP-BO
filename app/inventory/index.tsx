import React, { useState, useEffect, useMemo, useCallback } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Image,
  Platform,
  RefreshControl,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { useWebBackNavigation } from '@/hooks/useWebBackNavigation';
import { productStore, Product } from '@/utils/productStore';
import { getSuppliers, invalidateApiCache } from '@/services/backendApi';
import { formatCurrencyINR } from '@/utils/formatters';
import { ListSkeleton } from '@/components/SkeletonLoader';
import { safeRouter } from '@/utils/safeRouter';
import { 
  ArrowLeft, 
  Search, 
  Filter,
  Package,
  Plus,
  TriangleAlert as AlertTriangle,
  Eye,
  TrendingUp,
  TrendingDown,
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
  }
};

const formatPrice = (price: number) => formatCurrencyINR(price, 4);

const formatDate = (dateString: string) => {
  const date = new Date(dateString);
  return date.toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric'
  });
};

const getUrgencyColor = (urgency: string) => {
  switch (urgency) {
    case 'critical': return Colors.error;
    case 'low': return Colors.warning;
    case 'normal': return Colors.success;
    default: return Colors.textLight;
  }
};

const getStockTrend = (current: number, min: number, max: number) => {
  const percentage = (current / max) * 100;
  if (percentage > 70) return { trend: 'up', color: Colors.success };
  if (percentage > 30) return { trend: 'stable', color: Colors.warning };
  return { trend: 'down', color: Colors.error };
};

// Cache suppliers across navigations so we don't refetch every time
let _suppliersMapCache: Record<string, string> = {};
let _lastProductRefresh = 0;
const REFRESH_INTERVAL_MS = 60_000; // Only refresh from backend once per minute

export default function InventoryScreen() {
  const { handleBack } = useWebBackNavigation();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>(() => productStore.getProducts());
  const [isLoading, setIsLoading] = useState(() => productStore.getProducts().length === 0);
  const [suppliersMap, setSuppliersMap] = useState<Record<string, string>>(_suppliersMapCache);
  const [refreshing, setRefreshing] = useState(false);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    _lastProductRefresh = 0;
    _suppliersMapCache = {};
    (async () => {
      try {
        await productStore.loadProductsFromBackend();
        refreshProducts();
        const result = await getSuppliers();
        if (result.success && result.suppliers) {
          const map: Record<string, string> = {};
          result.suppliers.forEach((s: any) => {
            map[s.id] = s.business_name || s.contact_person || s.id;
          });
          _suppliersMapCache = map;
          setSuppliersMap(map);
        }
      } catch (e) {
        console.error('Refresh failed:', e);
      }
    })();
    setTimeout(() => setRefreshing(false), 600);
  }, []);

  useFocusEffect(
    React.useCallback(() => {
      // Always show cached products immediately
      const cachedProducts = productStore.getProducts();
      if (cachedProducts.length > 0) {
        setFilteredProducts(cachedProducts);
        setIsLoading(false);
      }

      // Only refresh from backend if stale
      const now = Date.now();
      if (now - _lastProductRefresh > REFRESH_INTERVAL_MS) {
        _lastProductRefresh = now;
        productStore.loadProductsFromBackend().then(() => {
          refreshProducts();
          setIsLoading(false);
        }).catch(() => setIsLoading(false));
      } else {
        setIsLoading(false);
      }
    }, [])
  );

  useEffect(() => {
    if (Object.keys(_suppliersMapCache).length > 0) {
      setSuppliersMap(_suppliersMapCache);
      return;
    }
    const loadSuppliers = async () => {
      try {
        const result = await getSuppliers();
        if (result.success && result.suppliers) {
          const map: Record<string, string> = {};
          result.suppliers.forEach((s: any) => {
            map[s.id] = s.business_name || s.contact_person || s.id;
          });
          _suppliersMapCache = map;
          setSuppliersMap(map);
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
      }
    };
    loadSuppliers();
  }, []);

  useEffect(() => {
    const unsubscribe = productStore.subscribe(() => {
      refreshProducts();
    });
    return unsubscribe;
  }, []);

  const handleSearch = useCallback((query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredProducts(productStore.getProducts());
    } else {
      setFilteredProducts(productStore.searchProducts(query));
    }
  }, []);

  const handleProductPress = useCallback((product: Product) => {
    safeRouter.push({
      pathname: '/inventory/product-details',
      params: { productId: product.id }
    });
  }, []);

  const handleAddProduct = useCallback(() => {
    const { canPerformAction } = require('@/utils/trialUtils');
    if (!canPerformAction('add product')) return;
    safeRouter.push('/inventory/manual-product');
  }, []);

  const refreshProducts = () => {
    setFilteredProducts(productStore.getProducts());
  };

  const handleLowStockPress = useCallback(() => {
    safeRouter.push('/inventory/low-stock');
  }, []);

  const handleStockDiscrepanciesPress = useCallback(() => {
    safeRouter.push('/inventory/stock-discrepancies');
  }, []);

  const getSupplierName = useCallback((product: Product): string | null => {
    if (product.supplierName) return product.supplierName;
    if (!product.supplier) return null;
    return suppliersMap[product.supplier] || null;
  }, [suppliersMap]);

  const { totalStockValue, lowStockItems, criticalItems, categoryCount } = useMemo(() => {
    const allProducts = productStore.getProducts();
    return {
      totalStockValue: filteredProducts.reduce((sum, p) => sum + (p.stockValue || 0), 0),
      lowStockItems: allProducts.filter(p => p.currentStock <= p.minStockLevel).length,
      criticalItems: allProducts.filter(p => p.urgencyLevel === 'critical').length,
      categoryCount: new Set(filteredProducts.map(p => p.category)).size,
    };
  }, [filteredProducts]);

  const renderProductCard = useCallback(({ item: product }: { item: Product }) => {
    const stockTrend = getStockTrend(product.currentStock, product.minStockLevel, product.maxStockLevel || 1);
    const urgencyColor = getUrgencyColor(product.urgencyLevel);

    return (
      <TouchableOpacity
        style={styles.productCard}
        onPress={() => handleProductPress(product)}
        activeOpacity={0.7}
      >
        <View style={styles.productHeader}>
          {product.image ? (
            <Image 
              source={{ uri: product.image }}
              style={styles.productImage}
            />
          ) : (
            <View style={[styles.productImage, styles.productImagePlaceholder]}>
              <Package size={24} color={Colors.textLight} />
            </View>
          )}
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.productCategory}>
              {product.category}
            </Text>
            {getSupplierName(product) ? (
              <Text style={styles.productSupplier}>
                {getSupplierName(product)}
              </Text>
            ) : (
              <Text style={styles.productNoSupplier}>No supplier</Text>
            )}
          </View>

          <View style={styles.productRight}>
            <Text style={styles.productPrice}>
              {formatPrice(product.salesPrice)}
            </Text>
            <TouchableOpacity
              style={styles.viewButton}
              onPress={() => handleProductPress(product)}
              activeOpacity={0.7}
            >
              <Eye size={16} color={Colors.primary} />
            </TouchableOpacity>
          </View>
        </View>

        <View style={styles.stockSection}>
          <View style={styles.stockHeader}>
            <View style={styles.stockInfo}>
              <Text style={styles.stockLabel}>Current Stock</Text>
              <Text style={[styles.stockValue, { color: urgencyColor }]}>
                {product.currentStock} {product.primaryUnit}
              </Text>
            </View>
            <View style={styles.stockInfo}>
              <Text style={styles.stockLabel}>Min Threshold</Text>
              <Text style={styles.stockValue}>
                {product.minStockLevel} {product.primaryUnit}
              </Text>
            </View>
            <View style={styles.stockInfo}>
              <Text style={styles.stockLabel}>Stock Value</Text>
              <Text style={[styles.stockValue, { color: Colors.success }]}>
                {formatPrice(product.stockValue || 0)}
              </Text>
            </View>
          </View>

          <View style={styles.stockProgressContainer}>
            <View style={styles.stockProgressBar}>
              <View style={[
                styles.stockProgressFill,
                { 
                  width: `${Math.min((product.currentStock / (product.maxStockLevel || 1)) * 100, 100)}%`,
                  backgroundColor: urgencyColor
                }
              ]} />
            </View>
            <Text style={styles.stockPercentage}>
              {Math.round((product.currentStock / (product.maxStockLevel || 1)) * 100)}%
            </Text>
          </View>

          <View style={styles.additionalInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{product.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Restocked:</Text>
              <Text style={styles.infoValue}>
                {product.lastRestocked ? formatDate(product.lastRestocked) : 'Never'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>HSN Code:</Text>
              <Text style={[styles.infoValue, styles.hsnCode]}>{product.hsnCode}</Text>
            </View>
          </View>
        </View>

        {product.urgencyLevel !== 'normal' && (
          <View style={styles.statusBadgeContainer}>
            <View style={[
              styles.statusBadge,
              { backgroundColor: `${urgencyColor}20` }
            ]}>
              <AlertTriangle size={14} color={urgencyColor} />
              <Text style={[styles.statusText, { color: urgencyColor }]}>
                {product.urgencyLevel === 'critical' ? 'CRITICAL STOCK' : 'LOW STOCK'}
              </Text>
            </View>
          </View>
        )}
      </TouchableOpacity>
    );
  }, [handleProductPress, getSupplierName]);

  const keyExtractor = useCallback((item: Product) => item.id, []);

  const ListHeader = useMemo(() => (
    <>
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Package size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Stock Value</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {formatPrice(totalStockValue)}
            </Text>
            <Text style={styles.summaryCount}>value</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Package size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Products</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {filteredProducts.length}
            </Text>
            <Text style={styles.summaryCount}>products</Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Package size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Categories</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {categoryCount}
            </Text>
            <Text style={styles.summaryCount}>categories</Text>
          </View>
        </View>
      </View>

      <View style={styles.divider} />

      <View style={styles.inlineSearchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.primary} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={() => {}}
            activeOpacity={0.7}
          >
            <Filter size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.divider} />
    </>
  ), [totalStockValue, filteredProducts.length, categoryCount, searchQuery, handleSearch]);

  const ListEmpty = useMemo(() => (
    <View style={styles.emptyState}>
      <Package size={64} color={Colors.textLight} />
      <Text style={styles.emptyStateTitle}>No Products Found</Text>
      <Text style={styles.emptyStateText}>
        {searchQuery ? 'No products match your search criteria' : 'Add your first product to get started'}
      </Text>
    </View>
  ), [searchQuery]);

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Inventory Management</Text>
        
        <View style={styles.headerActions}>
          <TouchableOpacity
            style={styles.headerActionButton}
            onPress={handleStockDiscrepanciesPress}
            activeOpacity={0.7}
          >
            <AlertTriangle size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {isLoading ? (
        <View style={styles.scrollView}>
          <ListSkeleton itemCount={6} showSearch={true} showFilter={true} />
        </View>
      ) : (
        <FlatList
          data={filteredProducts}
          renderItem={renderProductCard}
          keyExtractor={keyExtractor}
          ListHeaderComponent={ListHeader}
          ListEmptyComponent={ListEmpty}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          initialNumToRender={8}
          maxToRenderPerBatch={10}
          windowSize={5}
          removeClippedSubviews={Platform.OS !== 'web'}
          style={styles.scrollView}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        />
      )}

      {!isLoading && lowStockItems > 0 && (
        <View style={styles.alertButtonContainer}>
          <TouchableOpacity
            style={styles.alertButton}
            onPress={handleLowStockPress}
            activeOpacity={0.8}
          >
            <AlertTriangle size={20} color={Colors.error} />
            <Text style={styles.alertButtonText}>
              {lowStockItems} products need attention
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <TouchableOpacity
        style={styles.addProductFAB}
        onPress={handleAddProduct}
        activeOpacity={0.8}
      >
        <Plus size={20} color="#FFFFFF" />
        <Text style={styles.fabText}>Add Product</Text>
      </TouchableOpacity>
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
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  headerActionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  summaryCard: {
    flex: 1,
    flexDirection: 'column',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
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
    marginBottom: 2,
  },
  summaryCount: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
  },
  summaryContainer: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 16,
    gap: 12,
    backgroundColor: Colors.grey[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  divider: {
    height: 1,
    backgroundColor: Colors.grey[200],
    marginHorizontal: 16,
  },
  inlineSearchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  addProductFAB: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40,
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: Colors.primary,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
    zIndex: 1000,
    ...Platform.select({ web: { cursor: 'pointer' as any } }),
  },
  fabText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: 140,
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
  productCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    marginHorizontal: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.05,
    shadowRadius: 3.84,
    elevation: 2,
  },
  productHeader: {
    flexDirection: 'row',
    marginBottom: 16,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productImagePlaceholder: {
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  productSupplier: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  productNoSupplier: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  productRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  viewButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  stockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  stockInfo: {
    alignItems: 'center',
  },
  stockLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
  },
  stockProgressContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  stockProgressBar: {
    flex: 1,
    height: 6,
    backgroundColor: Colors.grey[200],
    borderRadius: 3,
    overflow: 'hidden',
  },
  stockProgressFill: {
    height: '100%',
    borderRadius: 3,
  },
  stockPercentage: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    minWidth: 32,
    textAlign: 'right',
  },
  additionalInfo: {
    gap: 4,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  infoLabel: {
    fontSize: 12,
    color: Colors.textLight,
  },
  infoValue: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.text,
  },
  hsnCode: {
    fontFamily: 'monospace',
  },
  statusBadgeContainer: {
    alignItems: 'flex-start',
  },
  statusBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },
  statusText: {
    fontSize: 10,
    fontWeight: '700',
  },
  alertButtonContainer: {
    position: 'absolute',
    bottom: 90,
    left: 16,
    right: 16,
  },
  alertButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 20,
    gap: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  alertButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
});
