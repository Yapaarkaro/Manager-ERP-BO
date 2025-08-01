import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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

interface Product {
  id: string;
  name: string;
  image: string;
  category: string;
  currentStock: number;
  minStockLevel: number;
  maxStockLevel: number;
  unitPrice: number;
  salesPrice: number;
  hsnCode: string;
  barcode: string;
  taxRate: number;
  supplier: string;
  location: string;
  lastRestocked: string;
  stockValue: number;
  primaryUnit: string;
  secondaryUnit?: string;
  urgencyLevel: 'normal' | 'low' | 'critical';
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'iPhone 14 Pro 128GB',
    image: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Smartphones',
    currentStock: 25,
    minStockLevel: 10,
    maxStockLevel: 50,
    unitPrice: 115000,
    salesPrice: 129900,
    hsnCode: '85171200',
    barcode: '1234567890123',
    taxRate: 18,
    supplier: 'Apple India Pvt Ltd',
    location: 'Main Warehouse - A1',
    lastRestocked: '2024-01-10',
    stockValue: 2875000,
    primaryUnit: 'Piece',
    urgencyLevel: 'normal'
  },
  {
    id: '2',
    name: 'Samsung Galaxy S23 Ultra',
    image: 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Smartphones',
    currentStock: 7,
    minStockLevel: 15,
    maxStockLevel: 40,
    unitPrice: 110000,
    salesPrice: 124999,
    hsnCode: '85171200',
    barcode: '2345678901234',
    taxRate: 18,
    supplier: 'Samsung Electronics',
    location: 'Main Warehouse - A2',
    lastRestocked: '2024-01-08',
    stockValue: 770000,
    primaryUnit: 'Piece',
    urgencyLevel: 'low'
  },
  {
    id: '3',
    name: 'MacBook Air M2',
    image: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Laptops',
    currentStock: 5,
    minStockLevel: 12,
    maxStockLevel: 30,
    unitPrice: 100000,
    salesPrice: 114900,
    hsnCode: '84713000',
    barcode: '3456789012345',
    taxRate: 18,
    supplier: 'Apple India Pvt Ltd',
    location: 'Main Warehouse - B1',
    lastRestocked: '2024-01-05',
    stockValue: 500000,
    primaryUnit: 'Piece',
    urgencyLevel: 'critical'
  },
  {
    id: '4',
    name: 'AirPods Pro 2nd Gen',
    image: 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Audio',
    currentStock: 2,
    minStockLevel: 20,
    maxStockLevel: 60,
    unitPrice: 22000,
    salesPrice: 24900,
    hsnCode: '85183000',
    barcode: '4567890123456',
    taxRate: 18,
    supplier: 'Apple India Pvt Ltd',
    location: 'Main Warehouse - C1',
    lastRestocked: '2024-01-12',
    stockValue: 44000,
    primaryUnit: 'Piece',
    urgencyLevel: 'critical'
  },
  {
    id: '5',
    name: 'Dell XPS 13',
    image: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Laptops',
    currentStock: 15,
    minStockLevel: 8,
    maxStockLevel: 25,
    unitPrice: 75000,
    salesPrice: 89999,
    hsnCode: '84713000',
    barcode: '5678901234567',
    taxRate: 18,
    supplier: 'Dell Technologies',
    location: 'Main Warehouse - B2',
    lastRestocked: '2024-01-07',
    stockValue: 1125000,
    primaryUnit: 'Piece',
    urgencyLevel: 'normal'
  },
  {
    id: '6',
    name: 'Sony WH-1000XM4',
    image: 'https://images.pexels.com/photos/3394650/pexels-photo-3394650.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Audio',
    currentStock: 12,
    minStockLevel: 15,
    maxStockLevel: 35,
    unitPrice: 25000,
    salesPrice: 29990,
    hsnCode: '85183000',
    barcode: '6789012345678',
    taxRate: 18,
    supplier: 'Sony India',
    location: 'Main Warehouse - C2',
    lastRestocked: '2024-01-09',
    stockValue: 300000,
    primaryUnit: 'Piece',
    urgencyLevel: 'low'
  },
];

export default function InventoryScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(mockProducts);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredProducts(mockProducts);
    } else {
      const filtered = mockProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase()) ||
        product.supplier.toLowerCase().includes(query.toLowerCase()) ||
        product.hsnCode.includes(query) ||
        product.barcode.includes(query)
      );
      setFilteredProducts(filtered);
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
    router.push('/inventory/add-product');
  };

  const handleLowStockPress = () => {
    router.push('/inventory/low-stock');
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

  const totalStockValue = filteredProducts.reduce((sum, product) => sum + product.stockValue, 0);
  const lowStockItems = mockProducts.filter(product => 
    product.currentStock <= product.minStockLevel
  ).length;
  const criticalItems = mockProducts.filter(product => 
    product.urgencyLevel === 'critical'
  ).length;

  const renderProductCard = (product: Product) => {
    const stockTrend = getStockTrend(product.currentStock, product.minStockLevel, product.maxStockLevel);
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
              {product.supplier}
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
                {formatPrice(product.stockValue)}
              </Text>
            </View>
          </View>

          {/* Stock Progress */}
          <View style={styles.stockProgressContainer}>
            <View style={styles.stockProgressBar}>
              <View style={[
                styles.stockProgressFill,
                { 
                  width: `${Math.min((product.currentStock / product.maxStockLevel) * 100, 100)}%`,
                  backgroundColor: urgencyColor
                }
              ]} />
            </View>
            <Text style={styles.stockPercentage}>
              {Math.round((product.currentStock / product.maxStockLevel) * 100)}%
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
              <Text style={styles.infoValue}>{formatDate(product.lastRestocked)}</Text>
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
        
        <TouchableOpacity
          style={styles.addButton}
          onPress={handleAddProduct}
          activeOpacity={0.7}
        >
          <Plus size={24} color={Colors.primary} />
        </TouchableOpacity>
      </View>

      {/* Total Stock Value */}
      <View style={styles.stockValueContainer}>
        {/* Total Stock Value - Center Top */}
        <View style={styles.totalStockContainer}>
          <Package size={24} color={Colors.success} />
          <View style={styles.totalStockInfo}>
            <Text style={styles.totalStockLabel}>Total Stock Value</Text>
            <Text style={styles.totalStockValue}>
              {formatPrice(totalStockValue)}
            </Text>
          </View>
        </View>

        {/* Items and Categories - Bottom Row */}
        <View style={styles.bottomStatsRow}>
          <View style={styles.bottomStatCard}>
            <Text style={styles.bottomStatLabel}>Total Products</Text>
            <Text style={styles.bottomStatValue}>{filteredProducts.length}</Text>
          </View>

          <View style={styles.bottomStatCard}>
            <Text style={styles.bottomStatLabel}>Categories</Text>
            <Text style={styles.bottomStatValue}>
              {new Set(filteredProducts.map(p => p.category)).size}
            </Text>
          </View>
        </View>
      </View>

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

      {/* Bottom Search Bar */}
      <View style={styles.floatingSearchContainer}>
        <View style={styles.searchContainer}>
          <View style={styles.searchBar}>
            <Search size={20} color={Colors.textLight} />
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
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
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
    outlineStyle: 'none',
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