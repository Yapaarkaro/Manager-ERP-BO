import React, { useState, useEffect } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { productStore, Product } from '@/utils/productStore';
import { dataStore } from '@/utils/dataStore';
import { 
  ArrowLeft, 
  Search, 
  Filter,
  Package,
  Plus,
  TriangleAlert as AlertTriangle,
  Eye,
  Scan,
  TrendingUp,
  TrendingDown,
  IndianRupee
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



export default function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState<Product[]>([]);

  // Refresh products when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      refreshProducts();
    }, [])
  );

  // Subscribe to product store changes
  useEffect(() => {
    const unsubscribe = productStore.subscribe(() => {
      refreshProducts();
    });
    return unsubscribe;
  }, []);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredProducts(productStore.getProducts());
    } else {
      setFilteredProducts(productStore.searchProducts(query));
    }
  };

  const handleProductPress = (product: Product) => {
    router.push({
      pathname: '/inventory/product-details',
      params: {
        productId: product.id,
        productData: JSON.stringify(product)
      }
    });
  };

  const handleAddProduct = () => {
    console.log('=== NAVIGATING DIRECTLY TO MANUAL PRODUCT FORM ===');
    console.log('Timestamp:', new Date().toISOString());
    console.log('==================================================');
    router.push('/inventory/manual-product');
  };

  // Function to refresh products (called when returning from add product)
  const refreshProducts = () => {
    const products = productStore.getProducts();
    setFilteredProducts(products);
    console.log('=== PRODUCTS REFRESHED ===');
    console.log('Total products:', products.length);
    if (products.length > 0) {
      products.forEach((product: Product, index: number) => {
        console.log(`Product ${index + 1}:`, product.name, '-', product.category);
      });
    }
    console.log('==========================');
  };

  const handleLowStockPress = () => {
    router.push('/inventory/low-stock');
  };

  const handleStockDiscrepanciesPress = () => {
    router.push('/inventory/stock-discrepancies');
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return Colors.error;
      case 'low': return Colors.warning;
      case 'normal': return Colors.success;
      default: return Colors.textLight;
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getStockTrend = (current: number, min: number, max: number) => {
    const percentage = (current / max) * 100;
    if (percentage > 70) return { trend: 'up', color: Colors.success };
    if (percentage > 30) return { trend: 'stable', color: Colors.warning };
    return { trend: 'down', color: Colors.error };
  };

  const getSupplierName = (supplierId: string | undefined) => {
    if (!supplierId) return 'No supplier';
    
    // Get supplier name from dataStore
    const supplier = dataStore.getSupplierById(supplierId);
    if (supplier) {
      // Show business name if available, otherwise show contact person name
      return supplier.businessName || supplier.name;
    }
    return supplierId; // Fallback to displaying the ID if supplier not found
  };

  const totalStockValue = filteredProducts.reduce((sum, product) => sum + (product.stockValue || 0), 0);
  const lowStockItems = productStore.getProducts().filter(product => 
    product.currentStock <= product.minStockLevel
  ).length;
  const criticalItems = productStore.getProducts().filter(product => 
    product.urgencyLevel === 'critical'
  ).length;

  const renderProductCard = (product: Product) => {
    const stockTrend = getStockTrend(product.currentStock, product.minStockLevel, product.maxStockLevel || 1);
    const urgencyColor = getUrgencyColor(product.urgencyLevel);

    return (
      <TouchableOpacity
        key={product.id}
        style={styles.productCard}
        onPress={() => handleProductPress(product)}
        activeOpacity={0.7}
      >
        {/* Product Header */}
        <View style={styles.productHeader}>
          <Image 
            source={{ uri: product.image }}
            style={styles.productImage}
          />
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {product.name}
            </Text>
            <Text style={styles.productCategory}>
              {product.category}
            </Text>
            <Text style={styles.productSupplier}>
              {getSupplierName(product.supplier)}
            </Text>
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

        {/* Stock Information */}
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

          {/* Stock Progress */}
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

          {/* Additional Info */}
          <View style={styles.additionalInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{product.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Restocked:</Text>
              <Text style={styles.infoValue}>
                {product.lastRestocked ? formatDate(product.lastRestocked) : 'Not specified'}
              </Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>HSN Code:</Text>
              <Text style={[styles.infoValue, styles.hsnCode]}>{product.hsnCode}</Text>
            </View>
          </View>
        </View>

        {/* Stock Status Badge */}
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
  };

  return (
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

      {/* Summary Cards */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <Package size={20} color={Colors.success} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Stock Value</Text>
            <Text style={[styles.summaryValue, { color: Colors.success }]}>
              {formatPrice(totalStockValue)}
            </Text>
            <Text style={styles.summaryCount}>
              value
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Package size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Products</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {filteredProducts.length}
            </Text>
            <Text style={styles.summaryCount}>
              products
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Package size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Categories</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {new Set(filteredProducts.map(p => p.category)).size}
            </Text>
            <Text style={styles.summaryCount}>
              categories
            </Text>
          </View>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Search Bar - Inline between summary and content */}
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
            onPress={() => console.log('Filter products')}
            activeOpacity={0.7}
          >
            <Filter size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Products List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredProducts.length === 0 ? (
          <View style={styles.emptyState}>
            <Package size={64} color={Colors.textLight} />
            <Text style={styles.emptyStateTitle}>No Products Found</Text>
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No products match your search criteria' : 'Add your first product to get started'}
            </Text>
            {productStore.getProductCount() > 0 && (
              <TouchableOpacity
                style={[styles.addButton, { backgroundColor: Colors.error, marginTop: 16 }]}
                onPress={() => {
                  productStore.clearProducts();
                  console.log('=== ALL PRODUCTS CLEARED ===');
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.alertButtonText, { color: Colors.background }]}>Clear All Products (Test)</Text>
              </TouchableOpacity>
            )}
          </View>
        ) : (
          filteredProducts.map(renderProductCard)
        )}
      </ScrollView>

      {/* Low Stock Alert Button */}
      {lowStockItems > 0 && (
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

      {/* Add Product FAB */}
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
  addButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  stockValueContainer: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: Colors.grey[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  totalStockContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
    gap: 12,
  },
  totalStockInfo: {
    alignItems: 'center',
  },
  totalStockLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  totalStockValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.success,
    textAlign: 'center',
  },
  bottomStatsRow: {
    flexDirection: 'row',
    gap: 12,
  },
  bottomStatCard: {
    flex: 1,
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
  bottomStatLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  bottomStatValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
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
    // No background - completely transparent
  },
  addProductFAB: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 40, // Above safe area to prevent gesture conflicts
    right: 20,
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 25,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
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
    padding: 16,
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
    marginBottom: 16,
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
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  alertButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
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