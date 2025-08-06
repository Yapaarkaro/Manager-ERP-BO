import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Search, 
  Plus,
  Minus,
  Package,
  ShoppingCart,
  Check,
  Square,
  SquareCheck as CheckSquare
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

interface SupplierProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  minOrderQty: number;
  unit: string;
  availability: 'in_stock' | 'limited' | 'out_of_stock';
  image: string;
}

interface SelectedProduct extends SupplierProduct {
  orderQuantity: number;
}

const mockSupplierProducts: SupplierProduct[] = [
  {
    id: '1',
    name: 'iPhone 14 Pro 128GB',
    category: 'Smartphones',
    price: 115000,
    minOrderQty: 5,
    unit: 'Piece',
    availability: 'in_stock',
    image: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
  },
  {
    id: '2',
    name: 'MacBook Air M2',
    category: 'Laptops',
    price: 100000,
    minOrderQty: 2,
    unit: 'Piece',
    availability: 'in_stock',
    image: 'https://images.pexels.com/photos/205421/pexels-photo-205421.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
  },
  {
    id: '3',
    name: 'AirPods Pro 2nd Gen',
    category: 'Audio',
    price: 22000,
    minOrderQty: 10,
    unit: 'Piece',
    availability: 'limited',
    image: 'https://images.pexels.com/photos/3780681/pexels-photo-3780681.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
  },
  {
    id: '4',
    name: 'iPad Pro 11"',
    category: 'Tablets',
    price: 81900,
    minOrderQty: 3,
    unit: 'Piece',
    availability: 'in_stock',
    image: 'https://images.pexels.com/photos/1334597/pexels-photo-1334597.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
  },
  {
    id: '5',
    name: 'Apple Watch Series 8',
    category: 'Wearables',
    price: 45900,
    minOrderQty: 5,
    unit: 'Piece',
    availability: 'in_stock',
    image: 'https://images.pexels.com/photos/437037/pexels-photo-437037.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1'
  },
];

export default function CreatePOScreen() {
  const { supplierId, supplierData } = useLocalSearchParams();
  const supplier = supplierData ? JSON.parse(supplierData as string) : null;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [filteredProducts, setFilteredProducts] = useState(mockSupplierProducts);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setFilteredProducts(mockSupplierProducts);
    } else {
      const filtered = mockSupplierProducts.filter(product =>
        product.name.toLowerCase().includes(query.toLowerCase()) ||
        product.category.toLowerCase().includes(query.toLowerCase())
      );
      setFilteredProducts(filtered);
    }
  };

  const handleProductToggle = (product: SupplierProduct) => {
    const existingIndex = selectedProducts.findIndex(selected => selected.id === product.id);
    
    if (existingIndex >= 0) {
      // Remove product
      setSelectedProducts(prev => prev.filter(selected => selected.id !== product.id));
    } else {
      // Add product with minimum order quantity
      setSelectedProducts(prev => [...prev, { ...product, orderQuantity: product.minOrderQty }]);
    }
  };

  const handleQuantityChange = (productId: string, change: number) => {
    setSelectedProducts(prev => 
      prev.map(product => {
        if (product.id === productId) {
          const newQuantity = Math.max(product.minOrderQty, product.orderQuantity + change);
          return { ...product, orderQuantity: newQuantity };
        }
        return product;
      })
    );
  };

  const isProductSelected = (productId: string) => {
    return selectedProducts.some(product => product.id === productId);
  };

  const getSelectedProduct = (productId: string) => {
    return selectedProducts.find(product => product.id === productId);
  };

  const calculateTotal = () => {
    return selectedProducts.reduce((total, product) => {
      return total + (product.price * product.orderQuantity);
    }, 0);
  };

  const getAvailabilityColor = (availability: string) => {
    switch (availability) {
      case 'in_stock': return Colors.success;
      case 'limited': return Colors.warning;
      case 'out_of_stock': return Colors.error;
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

  const handleContinue = () => {
    if (selectedProducts.length === 0) {
      Alert.alert('No Products Selected', 'Please select at least one product to create PO');
      return;
    }

    router.push({
      pathname: '/purchasing/po-confirmation',
      params: {
        supplierId,
        supplierData,
        selectedProducts: JSON.stringify(selectedProducts),
        totalAmount: calculateTotal().toString()
      }
    });
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
          
          <Text style={styles.headerTitle}>Create Purchase Order</Text>
          
          <View style={styles.headerRight}>
            <Text style={styles.selectedCount}>
              {selectedProducts.length} selected
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Supplier Info */}
      {supplier && (
        <View style={styles.supplierInfoContainer}>
          <View style={styles.supplierInfoHeader}>
            <Image 
              source={{ uri: supplier.avatar }}
              style={styles.supplierAvatar}
            />
            <View style={styles.supplierInfoText}>
              <Text style={styles.supplierName}>
                {supplier.supplierType === 'business' ? supplier.businessName : supplier.name}
              </Text>
              <Text style={styles.supplierContact}>
                Contact: {supplier.contactPerson}
              </Text>
              <Text style={styles.supplierTerms}>
                Terms: {supplier.paymentTerms} • Delivery: {supplier.deliveryTime}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* Products List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.productsContainer}>
          {filteredProducts.map((product) => {
            const isSelected = isProductSelected(product.id);
            const selectedProduct = getSelectedProduct(product.id);
            const availabilityColor = getAvailabilityColor(product.availability);

            return (
              <View key={product.id} style={[
                styles.productCard,
                isSelected && styles.selectedProductCard
              ]}>
                {/* Product Header */}
                <TouchableOpacity
                  style={styles.productHeader}
                  onPress={() => handleProductToggle(product)}
                  activeOpacity={0.7}
                >
                  <View style={styles.productLeft}>
                    <View style={styles.checkboxContainer}>
                      {isSelected ? (
                        <CheckSquare size={24} color={Colors.primary} />
                      ) : (
                        <Square size={24} color={Colors.grey[300]} />
                      )}
                    </View>
                    <Image 
                      source={{ uri: product.image }}
                      style={styles.productImage}
                    />
                    <View style={styles.productInfo}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <Text style={styles.productCategory}>{product.category}</Text>
                      <Text style={styles.productPrice}>
                        {formatAmount(product.price)} per {product.unit}
                      </Text>
                      <Text style={styles.minOrderQty}>
                        Min order: {product.minOrderQty} {product.unit}
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.productRight}>
                    <View style={[
                      styles.availabilityBadge,
                      { backgroundColor: `${availabilityColor}20` }
                    ]}>
                      <Text style={[
                        styles.availabilityText,
                        { color: availabilityColor }
                      ]}>
                        {product.availability.replace('_', ' ').toUpperCase()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>

                {/* Quantity Selector for Selected Products */}
                {isSelected && selectedProduct && (
                  <View style={styles.quantitySelector}>
                    <Text style={styles.quantityLabel}>Order Quantity:</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(product.id, -1)}
                        disabled={selectedProduct.orderQuantity <= product.minOrderQty}
                        activeOpacity={0.7}
                      >
                        <Minus size={16} color={
                          selectedProduct.orderQuantity <= product.minOrderQty ? Colors.textLight : Colors.text
                        } />
                      </TouchableOpacity>
                      
                      <Text style={styles.quantityValue}>
                        {selectedProduct.orderQuantity}
                      </Text>
                      
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(product.id, 1)}
                        activeOpacity={0.7}
                      >
                        <Plus size={16} color={Colors.text} />
                      </TouchableOpacity>
                    </View>
                    
                    <Text style={styles.lineTotal}>
                      Total: {formatAmount(product.price * selectedProduct.orderQuantity)}
                    </Text>
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Order Summary */}
        {selectedProducts.length > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Order Summary</Text>
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Products Selected:</Text>
                <Text style={styles.summaryValue}>
                  {selectedProducts.reduce((sum, product) => sum + product.orderQuantity, 0)} items
                </Text>
              </View>
              <View style={[styles.summaryRow, styles.totalRow]}>
                <Text style={styles.totalLabel}>Total Amount:</Text>
                <Text style={styles.totalValue}>
                  {formatAmount(calculateTotal())}
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Continue Button */}
      {selectedProducts.length > 0 && (
        <View style={styles.continueSection}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              Continue to Confirmation
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
          </View>
        </View>
      </View>
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
  selectedCount: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  supplierInfoContainer: {
    backgroundColor: '#f0f4ff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  supplierInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  supplierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  supplierInfoText: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  supplierContact: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 2,
  },
  supplierTerms: {
    fontSize: 12,
    color: Colors.primary,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 120,
  },
  productsContainer: {
    gap: 12,
  },
  productCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
  },
  selectedProductCard: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f4ff',
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  productLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  checkboxContainer: {
    marginRight: 12,
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
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 2,
  },
  minOrderQty: {
    fontSize: 12,
    color: Colors.textLight,
  },
  productRight: {
    alignItems: 'flex-end',
  },
  availabilityBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  availabilityText: {
    fontSize: 10,
    fontWeight: '600',
  },
  quantitySelector: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 32,
    textAlign: 'center',
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  summaryContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  continueSection: {
    position: 'absolute',
    bottom: 70,
    left: 16,
    right: 16,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  continueButtonText: {
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
    
  },
});