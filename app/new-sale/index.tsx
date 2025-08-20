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
import { productStore, Product } from '@/utils/productStore';
import { 
  ArrowLeft, 
  Search, 
  Scan,
  Plus,
  ShoppingCart,
} from 'lucide-react-native';

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
  orange: '#EA580C',
  grey: {
    50: '#F9FAFB',
    100: '#F3F4F6',
    200: '#E5E7EB',
    300: '#D1D5DB',
  }
};

export default function NewSaleScreen() {
  const { preSelectedCustomer } = useLocalSearchParams();
  const [searchQuery, setSearchQuery] = useState('');
  const [recentProducts, setRecentProducts] = useState<Product[]>([]);

  // Load products from store
  useEffect(() => {
    const products = productStore.getProducts();
    setRecentProducts(products);
  }, []);

  // Subscribe to product store changes
  useEffect(() => {
    const unsubscribe = productStore.subscribe(() => {
      const products = productStore.getProducts();
      setRecentProducts(products);
    });
    return unsubscribe;
  }, []);

  const handleProductSelect = (product: Product) => {
    // Navigate to cart with selected product
    router.push({
      pathname: '/new-sale/cart',
      params: {
        selectedProducts: JSON.stringify([{
          ...product,
          quantity: 1,
          price: product.salesPrice,
          // Ensure CESS fields are passed
          cessType: product.cessType || 'none',
          cessRate: product.cessRate || 0,
          cessAmount: product.cessAmount || 0,
          cessUnit: product.cessUnit || ''
        }]),
        preSelectedCustomer: preSelectedCustomer
      }
    });
  };

  const handleScanBarcode = () => {
    // Navigate to barcode scanner
    router.push({
      pathname: '/new-sale/scanner',
      params: {
        preSelectedCustomer: preSelectedCustomer
      }
    });
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implement search functionality
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const filteredProducts = recentProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

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
        
        <Text style={styles.headerTitle}>New Sale</Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.cartButton}
            onPress={() => router.push('/new-sale/cart')}
            activeOpacity={0.7}
          >
            <ShoppingCart size={24} color={Colors.text} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Recently Billed Products */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.sectionHeader}>
          <Text style={styles.sectionTitle}>Recently Billed Products</Text>
          <Text style={styles.sectionSubtitle}>
            Tap on a product to add it to your cart
          </Text>
        </View>

        {/* Add New Product Card */}
        <TouchableOpacity
          style={styles.addNewProductCard}
          onPress={() => router.push({
            pathname: '/inventory/manual-product',
            params: {
              returnTo: 'new-sale',
              preSelectedCustomer: preSelectedCustomer
            }
          })}
          activeOpacity={0.7}
        >
          <View style={styles.addNewProductContent}>
            <View style={styles.addNewProductIcon}>
              <Plus size={32} color={Colors.primary} />
            </View>
            <View style={styles.addNewProductText}>
              <Text style={styles.addNewProductTitle}>Add New Product</Text>
              <Text style={styles.addNewProductSubtitle}>
                Create a new product on the go
              </Text>
            </View>
          </View>
        </TouchableOpacity>

        <View style={styles.productsGrid}>
          {filteredProducts.map((product) => (
            <TouchableOpacity
              key={product.id}
              style={styles.productCard}
              onPress={() => handleProductSelect(product)}
              activeOpacity={0.7}
            >
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
                <Text style={styles.productPrice}>
                  {formatPrice(product.salesPrice)}
                </Text>
                <Text style={styles.lastBilled}>
                  Stock: {product.currentStock} {product.primaryUnit}
                </Text>
              </View>
              <View style={styles.addButton}>
                <Plus size={16} color="#ffffff" />
              </View>
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>

      {/* Bottom Section with Search and Scan */}
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
          
          <TouchableOpacity
            style={styles.scanButton}
            onPress={handleScanBarcode}
            activeOpacity={0.7}
          >
            <Scan size={24} color="#ffffff" />
          </TouchableOpacity>
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
    flexDirection: 'row',
    alignItems: 'center',
  },
  cartButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  sectionHeader: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
  },
  // Add New Product Card Styles
  addNewProductCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  addNewProductContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  addNewProductIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  addNewProductText: {
    flex: 1,
  },
  addNewProductTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  addNewProductSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  productsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
  },
  productCard: {
    width: '48%',
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 12,
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
    position: 'relative',
  },
  productImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
    marginBottom: 8,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
    lineHeight: 18,
  },
  productCategory: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  productPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 4,
  },
  lastBilled: {
    fontSize: 11,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  addButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 4,
    paddingVertical: 4,
    gap: 12,
  },
  searchBar: {
    flex: 1,
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
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: '#3f66ac',
    justifyContent: 'center',
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
});