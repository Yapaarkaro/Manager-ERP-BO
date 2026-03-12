import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  FlatList,
  TextInput,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Plus,
  Minus,
  Package,
  Building2,
  User,
  Phone,
  Square,
  SquareCheck as CheckSquare,
} from 'lucide-react-native';
import { safeRouter } from '@/utils/safeRouter';
import { getInitials, getAvatarColor } from '@/utils/formatters';
import { productStore, Product } from '@/utils/productStore';

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

interface SelectedProduct {
  id: string;
  name: string;
  category: string;
  price: number;
  unit: string;
  hsnCode: string;
  taxRate: number;
  currentStock: number;
  orderQuantity: number;
}

export default function CreatePOScreen() {
  const { supplierId, supplierData } = useLocalSearchParams();
  const supplier = supplierData ? JSON.parse(supplierData as string) : null;
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProducts, setSelectedProducts] = useState<SelectedProduct[]>([]);
  const [allProducts, setAllProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  const loadProducts = useCallback(async () => {
    try {
      setLoading(true);
      if (!productStore.hasProducts()) {
        await productStore.loadProductsFromBackend();
      }
      setAllProducts(productStore.getProducts());
    } catch (e) {
      console.error('Failed to load products:', e);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProducts();
  }, [loadProducts]);

  const filtered = allProducts.filter((p) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.category.toLowerCase().includes(q) ||
      p.hsnCode.toLowerCase().includes(q) ||
      p.barcode.toLowerCase().includes(q)
    );
  });

  const handleProductToggle = (product: Product) => {
    const exists = selectedProducts.find((sp) => sp.id === product.id);
    if (exists) {
      setSelectedProducts((prev) => prev.filter((sp) => sp.id !== product.id));
    } else {
      setSelectedProducts((prev) => [
        ...prev,
        {
          id: product.id,
          name: product.name,
          category: product.category,
          price: product.unitPrice || product.salesPrice || 0,
          unit: product.primaryUnit || 'pcs',
          hsnCode: product.hsnCode || '',
          taxRate: product.taxRate || 0,
          currentStock: product.currentStock || 0,
          orderQuantity: 1,
        },
      ]);
    }
  };

  const handleQuantityChange = (productId: string, change: number) => {
    setSelectedProducts((prev) =>
      prev.map((sp) => {
        if (sp.id === productId) {
          const newQty = Math.max(1, sp.orderQuantity + change);
          return { ...sp, orderQuantity: newQty };
        }
        return sp;
      })
    );
  };

  const handleQuantityInput = (productId: string, text: string) => {
    const num = parseInt(text, 10);
    if (isNaN(num) || num < 1) return;
    setSelectedProducts((prev) =>
      prev.map((sp) => (sp.id === productId ? { ...sp, orderQuantity: num } : sp))
    );
  };

  const isSelected = (id: string) => selectedProducts.some((sp) => sp.id === id);
  const getSelected = (id: string) => selectedProducts.find((sp) => sp.id === id);

  const calculateTotal = () =>
    selectedProducts.reduce((sum, sp) => sum + sp.price * sp.orderQuantity, 0);

  const formatAmount = (amount: number) =>
    `₹${amount.toLocaleString('en-IN', { minimumFractionDigits: amount % 1 !== 0 ? 2 : 0 })}`;

  const handleContinue = () => {
    if (selectedProducts.length === 0) {
      Alert.alert('No Products Selected', 'Please select at least one product to create a PO.');
      return;
    }
    safeRouter.push({
      pathname: '/purchasing/po-confirmation',
      params: {
        supplierId,
        supplierData,
        selectedProducts: JSON.stringify(selectedProducts),
        totalAmount: calculateTotal().toString(),
      },
    });
  };

  const supplierDisplayName = supplier
    ? supplier.businessName || supplier.name || 'Supplier'
    : 'Unknown Supplier';

  const renderProduct = ({ item: product }: { item: Product }) => {
    const sel = isSelected(product.id);
    const sp = getSelected(product.id);

    return (
      <View style={[styles.productCard, sel && styles.selectedCard]}>
        <TouchableOpacity
          style={styles.productRow}
          onPress={() => handleProductToggle(product)}
          activeOpacity={0.7}
        >
          <View style={styles.checkboxArea}>
            {sel ? (
              <CheckSquare size={22} color={Colors.primary} />
            ) : (
              <Square size={22} color={Colors.grey[300]} />
            )}
          </View>
          <View style={styles.productIconBg}>
            <Package size={20} color={Colors.primary} />
          </View>
          <View style={styles.productInfo}>
            <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
            <Text style={styles.productMeta}>
              {product.category}{product.hsnCode ? ` • HSN: ${product.hsnCode}` : ''}
            </Text>
            <Text style={styles.productPrice}>
              {formatAmount(product.unitPrice || product.salesPrice || 0)} / {product.primaryUnit || 'pcs'}
            </Text>
          </View>
          <View style={styles.stockBadge}>
            <Text style={[styles.stockText, { color: product.currentStock > 0 ? Colors.success : Colors.error }]}>
              Stock: {product.currentStock}
            </Text>
          </View>
        </TouchableOpacity>

        {sel && sp && (
          <View style={styles.qtySection}>
            <Text style={styles.qtyLabel}>Qty:</Text>
            <View style={styles.qtyControls}>
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => handleQuantityChange(product.id, -1)}
                disabled={sp.orderQuantity <= 1}
                activeOpacity={0.7}
              >
                <Minus size={16} color={sp.orderQuantity <= 1 ? Colors.grey[300] : Colors.text} />
              </TouchableOpacity>
              <TextInput
                style={styles.qtyInput}
                value={String(sp.orderQuantity)}
                onChangeText={(t) => handleQuantityInput(product.id, t)}
                keyboardType="number-pad"
                selectTextOnFocus
              />
              <TouchableOpacity
                style={styles.qtyBtn}
                onPress={() => handleQuantityChange(product.id, 1)}
                activeOpacity={0.7}
              >
                <Plus size={16} color={Colors.text} />
              </TouchableOpacity>
            </View>
            <Text style={styles.lineTotal}>{formatAmount(sp.price * sp.orderQuantity)}</Text>
          </View>
        )}
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()} activeOpacity={0.7}>
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.headerTitle}>Create Purchase Order</Text>
          {selectedProducts.length > 0 && (
            <Text style={styles.selectedBadge}>{selectedProducts.length} selected</Text>
          )}
        </View>
      </View>

      {/* Supplier Info */}
      {supplier && (
        <View style={styles.supplierBar}>
          <View style={[styles.supplierAvatar, { backgroundColor: getAvatarColor(supplierDisplayName) }]}>
            <Text style={styles.supplierInitial}>
              {getInitials(supplierDisplayName)}
            </Text>
          </View>
          <View style={styles.supplierInfo}>
            <Text style={styles.supplierName} numberOfLines={1}>{supplierDisplayName}</Text>
            {supplier.contactPerson && supplier.contactPerson !== supplierDisplayName && (
              <Text style={styles.supplierContact}>{supplier.contactPerson}</Text>
            )}
          </View>
          {supplier.mobile ? (
            <View style={styles.supplierPhone}>
              <Phone size={14} color={Colors.textLight} />
              <Text style={styles.supplierPhoneText}>{supplier.mobile}</Text>
            </View>
          ) : null}
        </View>
      )}

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <View style={styles.searchBar}>
          <Search size={18} color={Colors.textLight} />
          <TextInput
            style={styles.searchInput}
            placeholder="Search products..."
            placeholderTextColor={Colors.textLight}
            value={searchQuery}
            onChangeText={setSearchQuery}
          />
        </View>
      </View>

      {/* Products */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary} />
          <Text style={styles.loadingText}>Loading products...</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={(item) => item.id}
          renderItem={renderProduct}
          contentContainerStyle={[
            styles.listContent,
            selectedProducts.length > 0 && { paddingBottom: 160 },
          ]}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Package size={48} color={Colors.textLight} />
              <Text style={styles.emptyTitle}>
                {searchQuery ? 'No products found' : 'No products in inventory'}
              </Text>
              <Text style={styles.emptySubtitle}>
                {searchQuery ? 'Try a different search term' : 'Add products to your inventory first'}
              </Text>
            </View>
          }
        />
      )}

      {/* Bottom Summary & Continue */}
      {selectedProducts.length > 0 && (
        <View style={styles.bottomBar}>
          <View style={styles.bottomSummary}>
            <Text style={styles.bottomLabel}>
              {selectedProducts.reduce((s, p) => s + p.orderQuantity, 0)} items
            </Text>
            <Text style={styles.bottomTotal}>{formatAmount(calculateTotal())}</Text>
          </View>
          <TouchableOpacity style={styles.continueBtn} onPress={handleContinue} activeOpacity={0.8}>
            <Text style={styles.continueBtnText}>Continue</Text>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  headerCenter: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  selectedBadge: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    backgroundColor: `${Colors.primary}15`,
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    overflow: 'hidden',
  },
  supplierBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#f0f4ff',
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  supplierAvatar: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  supplierInitial: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  supplierContact: {
    fontSize: 13,
    color: Colors.textLight,
  },
  supplierPhone: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  supplierPhoneText: {
    fontSize: 13,
    color: Colors.textLight,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  searchInput: {
    flex: 1,
    fontSize: 15,
    color: Colors.text,
    marginLeft: 10,
    padding: 0,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textLight,
  },
  listContent: {
    padding: 16,
    paddingBottom: 40,
  },
  productCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    marginBottom: 10,
    overflow: 'hidden',
  },
  selectedCard: {
    borderColor: Colors.primary,
    backgroundColor: '#f8faff',
  },
  productRow: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
  },
  checkboxArea: {
    marginRight: 10,
  },
  productIconBg: {
    width: 40,
    height: 40,
    borderRadius: 8,
    backgroundColor: `${Colors.primary}10`,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  productMeta: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 2,
  },
  productPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
  stockBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 8,
    backgroundColor: Colors.grey[50],
  },
  stockText: {
    fontSize: 11,
    fontWeight: '600',
  },
  qtySection: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    backgroundColor: Colors.background,
  },
  qtyLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  qtyControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  qtyBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  qtyInput: {
    width: 50,
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 6,
    paddingVertical: 4,
  },
  lineTotal: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 70,
    textAlign: 'right',
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 80,
    gap: 8,
  },
  emptyTitle: {
    fontSize: 17,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 8,
  },
  emptySubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  bottomBar: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    backgroundColor: Colors.background,
  },
  bottomSummary: {
    flex: 1,
  },
  bottomLabel: {
    fontSize: 13,
    color: Colors.textLight,
  },
  bottomTotal: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  continueBtn: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 28,
    paddingVertical: 12,
    borderRadius: 10,
  },
  continueBtnText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
  },
});
