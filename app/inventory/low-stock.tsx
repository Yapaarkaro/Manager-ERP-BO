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
  TriangleAlert as AlertTriangle,
  TrendingDown,
  Eye,
  Plus
} from 'lucide-react-native';
import { useDebounceNavigation } from '@/hooks/useDebounceNavigation';

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
  supplier: string;
  location: string;
  lastRestocked: string;
  stockValue: number;
  urgencyLevel: 'critical' | 'low' | 'moderate';
}

const mockLowStockItems: LowStockItem[] = [
  {
    id: '1',
    name: 'iPhone 14 Pro 128GB',
    image: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Smartphones',
    currentStock: 3,
    minStockLevel: 10,
    maxStockLevel: 50,
    price: 129900,
    hsnCode: '85171200',
    barcode: '1234567890123',
    taxRate: 18,
    supplier: 'Apple India Pvt Ltd',
    location: 'Main Warehouse - A1',
    lastRestocked: '2024-01-10',
    stockValue: 389700,
    urgencyLevel: 'critical'
  },
  {
    id: '2',
    name: 'Samsung Galaxy S23 Ultra',
    image: 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Smartphones',
    currentStock: 7,
    minStockLevel: 15,
    maxStockLevel: 40,
    price: 124999,
    hsnCode: '85171200',
    barcode: '2345678901234',
    taxRate: 18,
    supplier: 'Samsung Electronics',
    location: 'Main Warehouse - A2',
    lastRestocked: '2024-01-08',
    stockValue: 874993,
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
    price: 114900,
    hsnCode: '84713000',
    barcode: '3456789012345',
    taxRate: 18,
    supplier: 'Apple India Pvt Ltd',
    location: 'Main Warehouse - B1',
    lastRestocked: '2024-01-05',
    stockValue: 574500,
    urgencyLevel: 'moderate'
  },
  {
    id: '4',
    name: 'AirPods Pro 2nd Gen',
    image: 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Audio',
    currentStock: 2,
    minStockLevel: 20,
    maxStockLevel: 60,
    price: 24900,
    hsnCode: '85183000',
    barcode: '4567890123456',
    taxRate: 18,
    supplier: 'Apple India Pvt Ltd',
    location: 'Main Warehouse - C1',
    lastRestocked: '2024-01-12',
    stockValue: 49800,
    urgencyLevel: 'critical'
  },
  {
    id: '5',
    name: 'Dell XPS 13',
    image: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Laptops',
    currentStock: 4,
    minStockLevel: 8,
    maxStockLevel: 25,
    price: 89999,
    hsnCode: '84713000',
    barcode: '5678901234567',
    taxRate: 18,
    supplier: 'Dell Technologies',
    location: 'Main Warehouse - B2',
    lastRestocked: '2024-01-07',
    stockValue: 359996,
    urgencyLevel: 'moderate'
  },
];

export default function LowStockScreen() {
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredItems, setFilteredItems] = useState(mockLowStockItems);
  const [isNavigating, setIsNavigating] = useState(false);
  
  // Use debounced navigation for low stock item cards
  const debouncedNavigate = useDebounceNavigation(500);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredItems(mockLowStockItems);
    } else {
      const filtered = mockLowStockItems.filter(item =>
        item.name.toLowerCase().includes(query.toLowerCase()) ||
        item.category.toLowerCase().includes(query.toLowerCase()) ||
        item.supplier.toLowerCase().includes(query.toLowerCase()) ||
        item.hsnCode.includes(query) ||
        item.barcode.includes(query)
      );
      setFilteredItems(filtered);
    }
  };

  const handleFilter = () => {
    console.log('Filter pressed');
    // Implement filter functionality
  };

  const handleItemPress = (item: LowStockItem) => {
    if (isNavigating) return;
    setIsNavigating(true);
    
    debouncedNavigate({
      pathname: '/inventory/product-details',
      params: {
        productId: item.id,
        productData: JSON.stringify(item)
      }
    });
    
    setTimeout(() => setIsNavigating(false), 1000);
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return Colors.error;
      case 'low': return Colors.warning;
      case 'moderate': return '#f59e0b';
      default: return Colors.textLight;
    }
  };

  const getUrgencyText = (urgency: string) => {
    switch (urgency) {
      case 'critical': return 'CRITICAL';
      case 'low': return 'LOW';
      case 'moderate': return 'MODERATE';
      default: return urgency.toUpperCase();
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

  const getStockPercentage = (current: number, min: number, max: number) => {
    return Math.round((current / max) * 100);
  };

  const renderLowStockCard = (item: LowStockItem) => {
    const stockPercentage = getStockPercentage(item.currentStock, item.minStockLevel, item.maxStockLevel);
    const urgencyColor = getUrgencyColor(item.urgencyLevel);

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.itemCard, { borderLeftColor: urgencyColor }]}
        onPress={() => handleItemPress(item)}
        activeOpacity={0.7}
        disabled={isNavigating}
      >
        {/* Item Header */}
        <View style={styles.itemHeader}>
          <Image 
            source={{ uri: item.image }}
            style={styles.productImage}
          />
          
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={2}>
              {item.name}
            </Text>
            <Text style={styles.productCategory}>
              {item.category}
            </Text>
            <Text style={styles.productPrice}>
              {formatPrice(item.price)}
            </Text>
          </View>

          <View style={styles.itemRight}>
            <View style={[
              styles.urgencyBadge,
              { backgroundColor: `${urgencyColor}20` }
            ]}>
              <Text style={[
                styles.urgencyText,
                { color: urgencyColor }
              ]}>
                {getUrgencyText(item.urgencyLevel)}
              </Text>
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

        {/* Stock Information */}
        <View style={styles.stockSection}>
          <View style={styles.stockHeader}>
            <View style={styles.stockInfo}>
              <Text style={styles.stockLabel}>Current Stock</Text>
              <Text style={[styles.stockValue, { color: urgencyColor }]}>
                {item.currentStock} units
              </Text>
            </View>
            <View style={styles.stockInfo}>
              <Text style={styles.stockLabel}>Min Required</Text>
              <Text style={styles.stockValue}>
                {item.minStockLevel} units
              </Text>
            </View>
          </View>

          {/* Stock Progress Bar */}
          <View style={styles.stockProgressContainer}>
            <View style={styles.stockProgressBar}>
              <View style={[
                styles.stockProgressFill,
                { 
                  width: `${Math.min(stockPercentage, 100)}%`,
                  backgroundColor: urgencyColor
                }
              ]} />
            </View>
            <Text style={styles.stockPercentage}>
              {stockPercentage}%
            </Text>
          </View>

          {/* Additional Info */}
          <View style={styles.additionalInfo}>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Supplier:</Text>
              <Text style={styles.infoValue}>{item.supplier}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Location:</Text>
              <Text style={styles.infoValue}>{item.location}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Last Restocked:</Text>
              <Text style={styles.infoValue}>{formatDate(item.lastRestocked)}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={styles.infoLabel}>Stock Value:</Text>
              <Text style={[styles.infoValue, styles.stockValueText]}>
                {formatPrice(item.stockValue)}
              </Text>
            </View>
          </View>
        </View>
      </TouchableOpacity>
    );
  };

  const criticalItems = filteredItems.filter(item => item.urgencyLevel === 'critical').length;
  const totalStockValue = filteredItems.reduce((sum, item) => sum + item.stockValue, 0);

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
        
        <Text style={styles.headerTitle}>Low Stock Items</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {filteredItems.length} items
          </Text>
        </View>
      </View>

      {/* Summary Stats */}
      <View style={styles.summaryContainer}>
        <View style={styles.summaryCard}>
          <AlertTriangle size={20} color={Colors.error} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Critical Items</Text>
            <Text style={[styles.summaryValue, { color: Colors.error }]}>
              {criticalItems}
            </Text>
            <Text style={styles.summaryCount}>
              items
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <Package size={20} color={Colors.primary} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Items</Text>
            <Text style={[styles.summaryValue, { color: Colors.primary }]}>
              {filteredItems.length}
            </Text>
            <Text style={styles.summaryCount}>
              items
            </Text>
          </View>
        </View>

        <View style={styles.summaryCard}>
          <TrendingDown size={20} color={Colors.warning} />
          <View style={styles.summaryInfo}>
            <Text style={styles.summaryLabel}>Total Value</Text>
            <Text style={[styles.summaryValue, { color: Colors.warning }]}>
              {formatPrice(totalStockValue)}
            </Text>
            <Text style={styles.summaryCount}>
              amount
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
            placeholder="Search low stock items..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          <TouchableOpacity
            style={styles.filterButton}
            onPress={handleFilter}
            activeOpacity={0.7}
          >
            <Filter size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Divider */}
      <View style={styles.divider} />

      {/* Low Stock Items */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {filteredItems.length === 0 ? (
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
    paddingVertical: 16,
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
    marginBottom: 2,
  },
  summaryCount: {
    fontSize: 10,
    color: Colors.textLight,
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
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
  itemCard: {
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
  itemHeader: {
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
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  itemRight: {
    alignItems: 'flex-end',
    gap: 8,
  },
  urgencyBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgencyText: {
    fontSize: 10,
    fontWeight: '700',
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
  stockValueText: {
    color: Colors.success,
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
    backgroundColor: 'transparent',
    borderRadius: 25,
    paddingHorizontal: 16,
    paddingVertical: 14,
    minHeight: 52,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    // No shadows or elevation - completely transparent
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
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
});