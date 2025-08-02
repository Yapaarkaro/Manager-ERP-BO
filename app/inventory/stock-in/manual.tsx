import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Modal,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  Building2,
  Package,
  Plus,
  Search,
  X,
  Check,
  IndianRupee,
  Percent,
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

interface StockInProduct {
  id: string;
  name: string;
  quantity: number;
  purchasePrice: number;
  discount: number;
  totalPrice: number;
  isNewProduct: boolean;
  gstRate: number;
  cessRate: number;
  cessType: 'value' | 'quantity' | 'value_and_quantity';
  cessAmount: number;
}

interface ManualStockInData {
  invoiceNumber: string;
  invoiceDate: string;
  supplier: {
    name: string;
    gstin: string;
    businessName: string;
    address: string;
  } | null;
  products: StockInProduct[];
  totalAmount: number;
  notes: string;
}

const mockProducts = [
  { id: '1', name: 'Laptop', category: 'Electronics' },
  { id: '2', name: 'Mouse', category: 'Electronics' },
  { id: '3', name: 'Keyboard', category: 'Electronics' },
  { id: '4', name: 'Monitor', category: 'Electronics' },
];

export default function ManualStockInScreen() {
  const { newProduct: newProductParam } = useLocalSearchParams();
  const [formData, setFormData] = useState<ManualStockInData>({
    invoiceNumber: '',
    invoiceDate: '',
    supplier: null,
    products: [],
    totalAmount: 0,
    notes: '',
  });

  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newSupplier, setNewSupplier] = useState<any>(null);
  const [newProduct, setNewProduct] = useState<any>(null);

  const updateFormData = (field: keyof ManualStockInData, value: any) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleSupplierSelect = (supplier: any) => {
    updateFormData('supplier', supplier);
    setShowSupplierModal(false);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;
    
    const newProduct: StockInProduct = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      quantity: 1,
      purchasePrice: 0,
      discount: 0,
      totalPrice: 0,
      isNewProduct: false,
      gstRate: 18, // Default GST rate
      cessRate: 0,
      cessType: 'value',
      cessAmount: 0,
    };
    
    // Check if this is a new product that needs tax configuration
    if (selectedProduct.isNewProduct) {
      setShowTaxModal(true);
    } else {
      updateFormData('products', [...formData.products, newProduct]);
      setSelectedProduct(null);
      setShowProductModal(false);
    }
  };

  const handleTaxConfiguration = (gstRate: number, cessRate: number, cessType: string, cessAmount: number) => {
    if (!selectedProduct) return;
    
    const newProduct: StockInProduct = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      quantity: 1,
      purchasePrice: 0,
      discount: 0,
      totalPrice: 0,
      isNewProduct: false,
      gstRate,
      cessRate,
      cessType: cessType as 'value' | 'quantity' | 'value_and_quantity',
      cessAmount,
    };
    
    updateFormData('products', [...formData.products, newProduct]);
    setSelectedProduct(null);
    setShowProductModal(false);
    setShowTaxModal(false);
  };

  const handleCreateNewProduct = () => {
    // Close modal first, then navigate to add product screen
    setShowProductModal(false);
    setTimeout(() => {
      router.push({
        pathname: '/inventory/add-product',
        params: {
          returnToStockIn: 'true',
          supplierId: formData.supplier?.gstin || ''
        }
      });
    }, 100);
  };

  // Listen for new supplier from navigation
  useEffect(() => {
    // This would be set when returning from add supplier screen
    if (newSupplier) {
      updateFormData('supplier', newSupplier);
      setNewSupplier(null);
    }
  }, [newSupplier]);

  // Listen for new product from navigation
  useEffect(() => {
    // This would be set when returning from add product screen
    if (newProduct) {
      // Add the new product to the products list
      const productToAdd: StockInProduct = {
        id: newProduct.id,
        name: newProduct.name,
        quantity: 1,
        purchasePrice: newProduct.price || 0,
        discount: 0,
        totalPrice: newProduct.price || 0,
        isNewProduct: false,
        gstRate: newProduct.gstRate || 18,
        cessRate: newProduct.cessRate || 0,
        cessType: newProduct.cessType || 'value',
        cessAmount: newProduct.cessAmount || 0,
      };
      
      updateFormData('products', [...formData.products, productToAdd]);
      setNewProduct(null);
    }
  }, [newProduct]);

  // Listen for new product from navigation params
  useEffect(() => {
    if (newProductParam && typeof newProductParam === 'string') {
      try {
        const productData = JSON.parse(newProductParam);
        const productToAdd: StockInProduct = {
          id: productData.id,
          name: productData.name,
          quantity: 1,
          purchasePrice: productData.price || 0,
          discount: 0,
          totalPrice: productData.price || 0,
          isNewProduct: false,
          gstRate: productData.gstRate || 18,
          cessRate: productData.cessRate || 0,
          cessType: productData.cessType || 'value',
          cessAmount: productData.cessAmount || 0,
        };
        
        updateFormData('products', [...formData.products, productToAdd]);
      } catch (error) {
        console.error('Error parsing new product data:', error);
      }
    }
  }, [newProductParam]);

  const updateProduct = (productId: string, field: keyof StockInProduct, value: any) => {
    const updatedProducts = formData.products.map(product => {
      if (product.id === productId) {
        const updated = { ...product, [field]: value };
        // Recalculate total price
        updated.totalPrice = (updated.purchasePrice * updated.quantity) * (1 - updated.discount / 100);
        return updated;
      }
      return product;
    });
    
    updateFormData('products', updatedProducts);
    
    // Recalculate total amount
    const total = updatedProducts.reduce((sum, product) => sum + product.totalPrice, 0);
    updateFormData('totalAmount', total);
  };

  const removeProduct = (productId: string) => {
    const updatedProducts = formData.products.filter(product => product.id !== productId);
    updateFormData('products', updatedProducts);
    
    const total = updatedProducts.reduce((sum, product) => sum + product.totalPrice, 0);
    updateFormData('totalAmount', total);
  };

  const isFormValid = () => {
    return (
      formData.invoiceNumber.trim().length > 0 &&
      formData.invoiceDate.trim().length > 0 &&
      formData.supplier !== null &&
      formData.products.length > 0
    );
  };

  const handleSave = () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }

    // Show confirmation dialog
    Alert.alert(
      'Confirm Stock In',
      'Please review all details before saving. Are you sure you want to save this stock in entry?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Save',
          onPress: () => {
            setIsSaving(true);
            
            // Simulate saving
            setTimeout(() => {
              setIsSaving(false);
              Alert.alert(
                'Stock In Saved',
                'Stock in entry has been saved successfully',
                [
                  {
                    text: 'OK',
                    onPress: () => router.back()
                  }
                ]
              );
            }, 2000);
          }
        }
      ]
    );
  };

  const filteredProducts = mockProducts.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Manual Stock In</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Invoice Number */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Number *</Text>
            <View style={styles.inputContainer}>
              <FileText size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.invoiceNumber}
                onChangeText={(text) => updateFormData('invoiceNumber', text)}
                placeholder="Enter invoice number"
                placeholderTextColor={Colors.textLight}
                autoCapitalize="characters"
              />
            </View>
          </View>

          {/* Invoice Date */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Date *</Text>
            <View style={styles.inputContainer}>
              <FileText size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                style={styles.input}
                value={formData.invoiceDate}
                onChangeText={(text) => updateFormData('invoiceDate', text)}
                placeholder="DD-MM-YYYY"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
                maxLength={10}
              />
            </View>
          </View>

          {/* Supplier Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supplier *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowSupplierModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <Building2 size={20} color={Colors.textLight} />
                <Text style={[
                  styles.dropdownText,
                  !formData.supplier && styles.placeholderText
                ]}>
                  {formData.supplier ? formData.supplier.businessName : 'Select supplier'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Products */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Products *</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={() => setShowProductModal(true)}
                activeOpacity={0.7}
              >
                <Plus size={20} color={Colors.primary} />
                <Text style={styles.addButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>

            {formData.products.length === 0 ? (
              <View style={styles.emptyState}>
                <Package size={48} color={Colors.textLight} />
                <Text style={styles.emptyStateText}>No products added yet</Text>
                <Text style={styles.emptyStateSubtext}>
                  Add products to your stock in entry
                </Text>
              </View>
            ) : (
              <View style={styles.productsList}>
                {formData.products.map((product, index) => (
                  <View key={product.id} style={styles.productCard}>
                    <View style={styles.productHeader}>
                      <Text style={styles.productName}>{product.name}</Text>
                      <TouchableOpacity
                        onPress={() => removeProduct(product.id)}
                        activeOpacity={0.7}
                      >
                        <X size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                    
                    <View style={styles.productDetails}>
                      <View style={styles.productRow}>
                        <Text style={styles.productLabel}>Quantity:</Text>
                        <TextInput
                          style={styles.quantityInput}
                          value={product.quantity.toString()}
                          onChangeText={(text) => updateProduct(product.id, 'quantity', parseInt(text) || 0)}
                          keyboardType="numeric"
                          placeholder="0"
                        />
                      </View>
                      
                      <View style={styles.productRow}>
                        <Text style={styles.productLabel}>Purchase Price:</Text>
                        <View style={styles.priceInputContainer}>
                          <IndianRupee size={16} color={Colors.textLight} />
                          <TextInput
                            style={styles.priceInput}
                            value={product.purchasePrice.toString()}
                            onChangeText={(text) => updateProduct(product.id, 'purchasePrice', parseFloat(text) || 0)}
                            keyboardType="decimal-pad"
                            placeholder="0.00"
                          />
                        </View>
                      </View>
                      
                      <View style={styles.productRow}>
                        <Text style={styles.productLabel}>Discount (%):</Text>
                        <View style={styles.priceInputContainer}>
                          <Percent size={16} color={Colors.textLight} />
                          <TextInput
                            style={styles.priceInput}
                            value={product.discount.toString()}
                            onChangeText={(text) => updateProduct(product.id, 'discount', parseFloat(text) || 0)}
                            keyboardType="decimal-pad"
                            placeholder="0"
                          />
                        </View>
                      </View>
                      
                      <View style={styles.productRow}>
                        <Text style={styles.productLabel}>GST ({product.gstRate}%):</Text>
                        <Text style={styles.taxAmount}>
                          ₹{((product.purchasePrice * product.quantity) * product.gstRate / 100).toFixed(2)}
                        </Text>
                      </View>
                      
                      {product.cessRate > 0 && (
                        <View style={styles.productRow}>
                          <Text style={styles.productLabel}>CESS ({product.cessRate}%):</Text>
                          <Text style={styles.taxAmount}>
                            ₹{product.cessAmount.toFixed(2)}
                          </Text>
                        </View>
                      )}
                      
                      <View style={styles.productRow}>
                        <Text style={styles.productLabel}>Total:</Text>
                        <Text style={styles.totalPrice}>
                          ₹{product.totalPrice.toFixed(2)}
                        </Text>
                      </View>
                    </View>
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* Total Amount */}
          <View style={styles.section}>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₹{formData.totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <View style={styles.inputContainer}>
              <TextInput
                style={[styles.input, styles.textArea]}
                value={formData.notes}
                onChangeText={(text) => updateFormData('notes', text)}
                placeholder="Add any additional notes..."
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              !isFormValid() && styles.disabledButton
            ]}
            onPress={handleSave}
            activeOpacity={0.8}
            disabled={!isFormValid() || isSaving}
          >
            <Text style={styles.saveButtonText}>
              {isSaving ? 'Saving...' : 'Save Stock In'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Supplier Selection Modal */}
        <Modal
          visible={showSupplierModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowSupplierModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Supplier</Text>
                <TouchableOpacity
                  onPress={() => setShowSupplierModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => {
                    // Navigate to add supplier and remember the new supplier
                    setShowSupplierModal(false);
                    setTimeout(() => {
                      router.push({
                        pathname: '/purchasing/add-supplier',
                        params: {
                          returnToStockIn: 'true'
                        }
                      });
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color={Colors.primary} />
                  <Text style={styles.modalOptionText}>Add New Supplier</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={styles.modalOption}
                  onPress={() => handleSupplierSelect({
                    name: 'ABC Suppliers',
                    gstin: '27ABCDE1234F1Z5',
                    businessName: 'ABC Suppliers Pvt Ltd',
                    address: 'Mumbai, Maharashtra'
                  })}
                  activeOpacity={0.7}
                >
                  <Building2 size={20} color={Colors.textLight} />
                  <Text style={styles.modalOptionText}>ABC Suppliers Pvt Ltd</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </Modal>

        {/* Product Selection Modal */}
        <Modal
          visible={showProductModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowProductModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Add Product</Text>
                <TouchableOpacity
                  onPress={() => setShowProductModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                <View style={styles.searchContainer}>
                  <Search size={20} color={Colors.textLight} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search products..."
                    placeholderTextColor={Colors.textLight}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                  />
                </View>
                
                <ScrollView style={styles.productList}>
                  {filteredProducts.map((product) => (
                    <TouchableOpacity
                      key={product.id}
                      style={styles.productOption}
                      onPress={() => setSelectedProduct(product)}
                      activeOpacity={0.7}
                    >
                      <Package size={20} color={Colors.textLight} />
                      <Text style={styles.productOptionText}>{product.name}</Text>
                      {selectedProduct?.id === product.id && (
                        <Check size={20} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  ))}
                </ScrollView>
                
                <TouchableOpacity
                  style={styles.createNewButton}
                  onPress={handleCreateNewProduct}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color={Colors.primary} />
                  <Text style={styles.createNewButtonText}>Create New Product</Text>
                </TouchableOpacity>
                
                <TouchableOpacity
                  style={[
                    styles.addSelectedButton,
                    !selectedProduct && styles.disabledButton
                  ]}
                  onPress={handleAddProduct}
                  activeOpacity={0.8}
                  disabled={!selectedProduct}
                >
                  <Text style={styles.addSelectedButtonText}>Add Selected Product</Text>
                </TouchableOpacity>
              </View>
            </View>
                      </View>
          </Modal>

          {/* Tax Configuration Modal */}
          <Modal
            visible={showTaxModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowTaxModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Configure Tax Rates</Text>
                  <TouchableOpacity
                    onPress={() => setShowTaxModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
                
                <View style={styles.modalContent}>
                  <Text style={styles.modalProductName}>
                    {selectedProduct?.name}
                  </Text>
                  
                  <View style={styles.taxSection}>
                    <Text style={styles.taxLabel}>GST Rate (%)</Text>
                    <View style={styles.taxButtons}>
                      {[0, 5, 12, 18, 28].map((rate) => (
                        <TouchableOpacity
                          key={rate}
                          style={[
                            styles.taxButton,
                            { backgroundColor: Colors.primary + '20' }
                          ]}
                          onPress={() => handleTaxConfiguration(rate, 0, 'value', 0)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.taxButtonText, { color: Colors.primary }]}>
                            {rate}%
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  <View style={styles.taxSection}>
                    <Text style={styles.taxLabel}>CESS Type</Text>
                    <View style={styles.taxButtons}>
                      {['value', 'quantity', 'value_and_quantity'].map((type) => (
                        <TouchableOpacity
                          key={type}
                          style={[
                            styles.taxButton,
                            { backgroundColor: Colors.warning + '20' }
                          ]}
                          onPress={() => handleTaxConfiguration(18, 0, type, 0)}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.taxButtonText, { color: Colors.warning }]}>
                            {type.replace('_', ' ').toUpperCase()}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>
                </View>
              </View>
            </View>
          </Modal>
        </SafeAreaView>
      </View>
    );
  }

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  safeArea: {
    flex: 1,
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
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  inputContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
  },
  inputIcon: {
    marginRight: 12,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  textArea: {
    minHeight: 100,
    textAlignVertical: 'top',
  },
  dropdown: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 6,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  emptyStateText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 12,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  productsList: {
    gap: 12,
  },
  productCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  productDetails: {
    gap: 8,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  quantityInput: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 12,
    paddingVertical: 8,
    width: 80,
    textAlign: 'center',
    fontSize: 14,
  },
  priceInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 12,
    paddingVertical: 8,
    gap: 6,
  },
  priceInput: {
    fontSize: 14,
    color: Colors.text,
    width: 80,
  },
  totalPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  taxAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  saveButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 32,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    gap: 12,
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 12,
    marginBottom: 16,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  productList: {
    maxHeight: 300,
  },
  productOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginVertical: 4,
    gap: 12,
  },
  productOptionText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  createNewButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    marginTop: 16,
    gap: 8,
  },
  createNewButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  addSelectedButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
  },
  addSelectedButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  taxSection: {
    marginBottom: 20,
  },
  taxLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  taxButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  taxButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  taxButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
}); 