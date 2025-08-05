import React, { useState, useEffect } from 'react';
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
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Package,
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
  unitPrice: number;
  barcode: string;
  supplier: string;
  location: string;
  primaryUnit: string;
}

const mockProducts: Product[] = [
  {
    id: '1',
    name: 'iPhone 14 Pro 128GB',
    image: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Smartphones',
    currentStock: 25,
    unitPrice: 115000,
    barcode: '1234567890123',
    supplier: 'Apple India Pvt Ltd',
    location: 'Main Warehouse - A1',
    primaryUnit: 'Piece',
  },
  {
    id: '2',
    name: 'Samsung Galaxy S23 Ultra',
    image: 'https://images.pexels.com/photos/1092644/pexels-photo-1092644.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Smartphones',
    currentStock: 7,
    unitPrice: 110000,
    barcode: '2345678901234',
    supplier: 'Samsung Electronics',
    location: 'Main Warehouse - A2',
    primaryUnit: 'Piece',
  },
  {
    id: '3',
    name: 'MacBook Pro 14" M2',
    image: 'https://images.pexels.com/photos/18105/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Laptops',
    currentStock: 12,
    unitPrice: 180000,
    barcode: '3456789012345',
    supplier: 'Apple India Pvt Ltd',
    location: 'Main Warehouse - B1',
    primaryUnit: 'Piece',
  },
  {
    id: '4',
    name: 'Dell XPS 13 Plus',
    image: 'https://images.pexels.com/photos/7974/pexels-photo.jpg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
    category: 'Laptops',
    currentStock: 8,
    unitPrice: 140000,
    barcode: '4567890123456',
    supplier: 'Dell Technologies',
    location: 'Main Warehouse - B2',
    primaryUnit: 'Piece',
  },
];

export default function ManualProductScreen() {
  const { reason } = useLocalSearchParams<{ reason: string }>();
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredProducts, setFilteredProducts] = useState(mockProducts);
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);

  useEffect(() => {
    if (searchQuery.trim() === '') {
      setFilteredProducts(mockProducts);
    } else {
      const filtered = mockProducts.filter(product =>
        product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.category.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.supplier.toLowerCase().includes(searchQuery.toLowerCase()) ||
        product.barcode.includes(searchQuery)
      );
      setFilteredProducts(filtered);
    }
  }, [searchQuery]);

  const handleProductSelect = (product: Product) => {
    const isSelected = selectedProducts.some(p => p.id === product.id);
    
    if (isSelected) {
      setSelectedProducts(selectedProducts.filter(p => p.id !== product.id));
    } else {
      setSelectedProducts([...selectedProducts, product]);
    }
  };

  const handleContinue = () => {
    if (selectedProducts.length === 0) {
      return;
    }

    router.push({
      pathname: '/inventory/stock-out/stock-details',
      params: {
        reason,
        selectedProducts: JSON.stringify(selectedProducts)
      }
    });
  };

  const isProductSelected = (productId: string) => {
    return selectedProducts.some(p => p.id === productId);
  };

  const renderProductCard = (product: Product) => {
    const isSelected = isProductSelected(product.id);

    return (
      <TouchableOpacity
        key={product.id}
        style={[
          styles.productCard,
          isSelected && styles.productCardSelected
        ]}
        onPress={() => handleProductSelect(product)}
        activeOpacity={0.8}
      >
        <Image source={{ uri: product.image }} style={styles.productImage} />
        <View style={styles.productInfo}>
          <Text style={styles.productName}>{product.name}</Text>
          <Text style={styles.productCategory}>{product.category}</Text>
          <Text style={styles.productStock}>
            Current Stock: {product.currentStock} {product.primaryUnit}
          </Text>
          <Text style={styles.productLocation}>{product.location}</Text>
        </View>
        {isSelected && (
          <View style={styles.selectedIndicator}>
            <Text style={styles.selectedIndicatorText}>✓</Text>
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
        
        <Text style={styles.headerTitle}>Manual Product Entry</Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={20} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products by name, category, or barcode..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Reason Display */}
      <View style={styles.reasonContainer}>
        <Text style={styles.reasonLabel}>Stock Out Reason:</Text>
        <Text style={styles.reasonText}>{reason}</Text>
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
              {searchQuery ? 'No products match your search criteria' : 'No products available'}
            </Text>
          </View>
        ) : (
          filteredProducts.map(renderProductCard)
        )}
      </ScrollView>

      {/* Continue Button */}
      {selectedProducts.length > 0 && (
        <View style={styles.floatingButtonContainer}>
          <View style={styles.selectedCount}>
            <Text style={styles.selectedCountText}>
              {selectedProducts.length} product{selectedProducts.length !== 1 ? 's' : ''} selected
            </Text>
          </View>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>Continue</Text>
          </TouchableOpacity>
        </View>
      )}
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
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
    color: Colors.text,
  },
  reasonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grey[50],
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  productCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    marginBottom: 12,
    flexDirection: 'row',
    alignItems: 'center',
  },
  productCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.grey[50],
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  productStock: {
    fontSize: 14,
    color: Colors.success,
    fontWeight: '500',
    marginBottom: 2,
  },
  productLocation: {
    fontSize: 12,
    color: Colors.textLight,
  },
  selectedIndicator: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedIndicatorText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: 'bold',
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
    lineHeight: 20,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  selectedCount: {
    marginBottom: 12,
  },
  selectedCountText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
}); 