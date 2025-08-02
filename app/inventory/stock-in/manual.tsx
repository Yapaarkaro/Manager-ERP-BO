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
  Hash,
  Camera,
  Ruler,
  ChevronDown,
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

const primaryUnits = [
  'Piece', 'Kilogram', 'Gram', 'Liter', 'Milliliter', 'Meter', 'Centimeter', 
  'Box', 'Pack', 'Set', 'Pair', 'Dozen', 'Ton', 'Quintal', 'Foot', 'Inch', 
  'Yard', 'Square Meter', 'Square Foot', 'Cubic Meter', 'Cubic Foot', 
  'Bundle', 'Roll', 'Sheet', 'Bottle', 'Can', 'Jar', 'Tube', 'Bag', 
  'Carton', 'Crate', 'Gallon', 'Ounce', 'Pound'
];

const secondaryUnits = [
  'None', 'Piece', 'Kilogram', 'Gram', 'Liter', 'Milliliter', 'Meter', 
  'Centimeter', 'Box', 'Pack', 'Set', 'Pair', 'Dozen', 'Ton', 'Quintal', 
  'Foot', 'Inch', 'Yard', 'Square Meter', 'Square Foot', 'Cubic Meter', 
  'Cubic Foot', 'Bundle', 'Roll', 'Sheet', 'Bottle', 'Can', 'Jar', 'Tube', 
  'Bag', 'Carton', 'Crate', 'Gallon', 'Ounce', 'Pound'
];

const cessTypes = [
  { value: 'none', label: 'No CESS' },
  { value: 'value', label: 'Based on Value' },
  { value: 'quantity', label: 'Based on Quantity' },
  { value: 'value_and_quantity', label: 'Based on Value & Quantity' },
];

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
  cessType: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cessAmount: number;
  primaryUnit: string;
  secondaryUnit: string;
  useCompoundUnit: boolean;
  conversionRatio: string;
}

interface ManualStockInData {
  invoiceNumber: string;
  invoiceDate: string;
  hasEwayBill: boolean;
  ewayBillNumber: string;
  vehicleNumber: string;
  vehicleType: string;
  supplier: {
    name: string;
    gstin: string;
    businessName: string;
    address: string;
  } | null;
  products: StockInProduct[];
  totalAmount: number;
  discountType: 'percentage' | 'amount';
  discountValue: number;
  notes: string;
}

const mockProducts = [
  { id: '1', name: 'Laptop', category: 'Electronics' },
  { id: '2', name: 'Mouse', category: 'Electronics' },
  { id: '3', name: 'Keyboard', category: 'Electronics' },
  { id: '4', name: 'Monitor', category: 'Electronics' },
];

export default function ManualStockInScreen() {
  const { newProduct: newProductParam, newSupplier: newSupplierParam } = useLocalSearchParams();
  const [formData, setFormData] = useState<ManualStockInData>({
    invoiceNumber: '',
    invoiceDate: '',
    hasEwayBill: false,
    ewayBillNumber: '',
    vehicleNumber: '',
    vehicleType: '',
    supplier: null,
    products: [],
    totalAmount: 0,
    discountType: 'amount',
    discountValue: 0,
    notes: '',
  });

  const [showProductModal, setShowProductModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [isSaving, setIsSaving] = useState(false);
  const [newSupplier, setNewSupplier] = useState<any>(null);
  const [newProduct, setNewProduct] = useState<any>(null);
  const [showCreateProductModal, setShowCreateProductModal] = useState(false);
  const [showPrimaryUnitModal, setShowPrimaryUnitModal] = useState(false);
  const [showSecondaryUnitModal, setShowSecondaryUnitModal] = useState(false);
  const [showPrimaryUnitDropdown, setShowPrimaryUnitDropdown] = useState(false);
  const [showSecondaryUnitDropdown, setShowSecondaryUnitDropdown] = useState(false);
  const [primaryUnitSearch, setPrimaryUnitSearch] = useState('');
  const [secondaryUnitSearch, setSecondaryUnitSearch] = useState('');
  const [newProductData, setNewProductData] = useState({
    name: '',
    category: '',
    hsnCode: '',
    purchasePrice: '',
    gstRate: 18,
    cessRate: 0,
    cessType: 'none' as 'none' | 'value' | 'quantity' | 'value_and_quantity',
    cessAmount: 0,
    cessAmountType: 'percentage' as 'percentage' | 'amount',
    primaryUnit: 'Piece',
    secondaryUnit: 'None',
    useCompoundUnit: false,
    conversionRatio: '',
  });

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
      primaryUnit: '', // Default unit
      secondaryUnit: 'None',
      useCompoundUnit: false,
      conversionRatio: '',
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
      primaryUnit: '', // Default unit
      secondaryUnit: 'None',
      useCompoundUnit: false,
      conversionRatio: '',
    };
    
    updateFormData('products', [...formData.products, newProduct]);
    setSelectedProduct(null);
    setShowProductModal(false);
    setShowTaxModal(false);
  };

  const handleCreateNewProduct = () => {
    // Close product selection modal and show create product modal
    setShowProductModal(false);
    setShowCreateProductModal(true);
  };

  const handleScanProduct = () => {
    // Simulate scanning and auto-fill product details
    const scannedProduct = {
      name: 'Scanned Product',
      category: 'Electronics',
      hsnCode: '8471',
      purchasePrice: '1500',
      gstRate: 18,
      cessRate: 0,
      cessType: 'none' as 'none' | 'value' | 'quantity' | 'value_and_quantity',
      cessAmount: 0,
      cessAmountType: 'percentage' as 'percentage' | 'amount',
      primaryUnit: 'Piece',
      secondaryUnit: 'None',
      useCompoundUnit: false,
      conversionRatio: '',
    };
    
    setNewProductData(scannedProduct);
    Alert.alert('Product Scanned', 'Product details have been auto-filled from barcode scan.');
  };

  const handlePrimaryUnitSelect = (unit: string) => {
    console.log('Primary unit selected:', unit);
    setNewProductData(prev => ({ ...prev, primaryUnit: unit }));
    setShowPrimaryUnitModal(false);
  };

  const handleSecondaryUnitSelect = (unit: string) => {
    console.log('Secondary unit selected:', unit);
    setNewProductData(prev => ({ ...prev, secondaryUnit: unit }));
    setShowSecondaryUnitModal(false);
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
        primaryUnit: newProduct.primaryUnit || 'Piece',
        secondaryUnit: newProduct.secondaryUnit || 'None',
        useCompoundUnit: newProduct.useCompoundUnit || false,
        conversionRatio: newProduct.conversionRatio || '',
      };
      
      updateFormData('products', [...formData.products, productToAdd]);
      setNewProduct(null);
    }
  }, [newProduct, formData.products]);

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
          primaryUnit: productData.primaryUnit || 'Piece',
          secondaryUnit: productData.secondaryUnit || 'None',
          useCompoundUnit: productData.useCompoundUnit || false,
          conversionRatio: productData.conversionRatio || '',
        };
        
        updateFormData('products', [...formData.products, productToAdd]);
      } catch (error) {
        console.error('Error parsing new product data:', error);
      }
    }
  }, [newProductParam]);

  // Listen for new supplier from navigation params
  useEffect(() => {
    if (newSupplierParam && typeof newSupplierParam === 'string') {
      try {
        const supplierData = JSON.parse(newSupplierParam);
        updateFormData('supplier', supplierData);
      } catch (error) {
        console.error('Error parsing new supplier data:', error);
      }
    }
  }, [newSupplierParam]);

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

    // Navigate to confirmation screen
    router.push({
      pathname: '/inventory/stock-in/confirmation',
      params: {
        stockInData: JSON.stringify(formData)
      }
    });
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

          {/* E-Way Bill */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>E-Way Bill</Text>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={styles.checkbox}
                onPress={() => updateFormData('hasEwayBill', !formData.hasEwayBill)}
                activeOpacity={0.7}
              >
                {formData.hasEwayBill && <Check size={16} color={Colors.background} />}
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>Invoice has E-Way Bill</Text>
            </View>
            
            {formData.hasEwayBill && (
              <View style={styles.inputContainer}>
                <FileText size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.ewayBillNumber}
                  onChangeText={(text) => updateFormData('ewayBillNumber', text)}
                  placeholder="Enter E-Way Bill number"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="characters"
                />
              </View>
            )}
          </View>

          {/* Vehicle Details - Only show when e-Way bill is selected */}
          {formData.hasEwayBill && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
              <View style={styles.inputContainer}>
                <FileText size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.vehicleNumber}
                  onChangeText={(text) => updateFormData('vehicleNumber', text)}
                  placeholder="Vehicle number"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="characters"
                />
              </View>
              <View style={styles.inputContainer}>
                <FileText size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.vehicleType}
                  onChangeText={(text) => updateFormData('vehicleType', text)}
                  placeholder="Vehicle type (Truck, Tempo, etc.)"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
          )}

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

          {/* Discount Section */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supplier Discount</Text>
            <View style={styles.discountContainer}>
              <View style={styles.discountTypeContainer}>
                <TouchableOpacity
                  style={[
                    styles.discountTypeButton,
                    formData.discountType === 'amount' && styles.activeDiscountType
                  ]}
                  onPress={() => updateFormData('discountType', 'amount')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.discountTypeText,
                    formData.discountType === 'amount' && styles.activeDiscountTypeText
                  ]}>
                    ₹ Amount
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.discountTypeButton,
                    formData.discountType === 'percentage' && styles.activeDiscountType
                  ]}
                  onPress={() => updateFormData('discountType', 'percentage')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.discountTypeText,
                    formData.discountType === 'percentage' && styles.activeDiscountTypeText
                  ]}>
                    % Percentage
                  </Text>
                </TouchableOpacity>
              </View>
              
              <View style={styles.inputContainer}>
                {formData.discountType === 'amount' ? (
                  <IndianRupee size={20} color={Colors.textLight} style={styles.inputIcon} />
                ) : (
                  <Percent size={20} color={Colors.textLight} style={styles.inputIcon} />
                )}
                <TextInput
                  style={styles.input}
                  value={formData.discountValue.toString()}
                  onChangeText={(text) => updateFormData('discountValue', parseFloat(text) || 0)}
                  placeholder={formData.discountType === 'amount' ? '0.00' : '0'}
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
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

          {/* Create Product Modal */}
          <Modal
            visible={showCreateProductModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowCreateProductModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Create New Product</Text>
                  <TouchableOpacity
                    onPress={() => setShowCreateProductModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {/* Scan Product Button */}
                  <TouchableOpacity
                    style={styles.scanButton}
                    onPress={handleScanProduct}
                    activeOpacity={0.8}
                  >
                    <Camera size={20} color={Colors.background} />
                    <Text style={styles.scanButtonText}>Scan Product Barcode</Text>
                  </TouchableOpacity>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Product Name *</Text>
                    <View style={styles.inputContainer}>
                      <Package size={20} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={newProductData.name}
                        onChangeText={(text) => setNewProductData(prev => ({ ...prev, name: text }))}
                        placeholder="Enter product name"
                        placeholderTextColor={Colors.textLight}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Category *</Text>
                    <View style={styles.inputContainer}>
                      <Package size={20} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={newProductData.category}
                        onChangeText={(text) => setNewProductData(prev => ({ ...prev, category: text }))}
                        placeholder="Enter category"
                        placeholderTextColor={Colors.textLight}
                      />
                    </View>
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>HSN Code</Text>
                    <View style={styles.inputContainer}>
                      <Hash size={20} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={newProductData.hsnCode}
                        onChangeText={(text) => setNewProductData(prev => ({ ...prev, hsnCode: text }))}
                        placeholder="Enter HSN code"
                        placeholderTextColor={Colors.textLight}
                      />
                    </View>
                  </View>

                  {/* Unit of Measurement Section */}
                  <View style={styles.unitSection}>
                    <Text style={styles.unitLabel}>Unit of Measurement</Text>
                    
                    <View style={styles.unitTypeContainer}>
                      <Text style={styles.unitSubLabel}>Unit Type:</Text>
                      <View style={styles.unitTypeButtons}>
                        <TouchableOpacity
                          style={[
                            styles.unitTypeButton,
                            { backgroundColor: !newProductData.useCompoundUnit ? Colors.primary : Colors.primary + '20' }
                          ]}
                          onPress={() => setNewProductData(prev => ({ ...prev, useCompoundUnit: false }))}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.unitTypeButtonText, 
                            { color: !newProductData.useCompoundUnit ? Colors.background : Colors.primary }
                          ]}>
                            Primary Only
                          </Text>
                        </TouchableOpacity>
                        <TouchableOpacity
                          style={[
                            styles.unitTypeButton,
                            { backgroundColor: newProductData.useCompoundUnit ? Colors.primary : Colors.primary + '20' }
                          ]}
                          onPress={() => setNewProductData(prev => ({ ...prev, useCompoundUnit: true }))}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.unitTypeButtonText, 
                            { color: newProductData.useCompoundUnit ? Colors.background : Colors.primary }
                          ]}>
                            Compound
                          </Text>
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.rowContainer}>
                      <View style={[styles.inputGroup, styles.halfWidth]}>
                        <Text style={styles.label}>Primary Unit *</Text>
                        <TouchableOpacity
                          style={styles.dropdown}
                          onPress={() => {
                            console.log('Primary unit dropdown pressed');
                            setShowPrimaryUnitDropdown(!showPrimaryUnitDropdown);
                            setShowSecondaryUnitDropdown(false);
                          }}
                          activeOpacity={0.7}
                        >
                          <View style={styles.dropdownContent}>
                            <Ruler size={20} color={Colors.textLight} />
                            <Text style={styles.dropdownText}>
                              {newProductData.primaryUnit}
                            </Text>
                            <ChevronDown size={20} color={Colors.textLight} />
                          </View>
                        </TouchableOpacity>
                        
                        {showPrimaryUnitDropdown && (
                          <View style={styles.dropdownOptions}>
                            <View style={styles.dropdownSearchContainer}>
                              <Search size={16} color={Colors.textLight} />
                              <TextInput
                                style={styles.dropdownSearchInput}
                                placeholder="Search units..."
                                placeholderTextColor={Colors.textLight}
                                value={primaryUnitSearch}
                                onChangeText={setPrimaryUnitSearch}
                                autoFocus
                              />
                            </View>
                            <ScrollView style={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
                              {primaryUnits
                                .filter(unit => 
                                  unit.toLowerCase().includes(primaryUnitSearch.toLowerCase())
                                )
                                .slice(0, 8) // Limit to 8 results
                                .map((unit) => (
                                  <TouchableOpacity
                                    key={unit}
                                    style={styles.dropdownOption}
                                    onPress={() => {
                                      setNewProductData(prev => ({ ...prev, primaryUnit: unit }));
                                      setShowPrimaryUnitDropdown(false);
                                      setPrimaryUnitSearch('');
                                    }}
                                    activeOpacity={0.7}
                                  >
                                    <Text style={styles.dropdownOptionText}>{unit}</Text>
                                  </TouchableOpacity>
                                ))}
                            </ScrollView>
                          </View>
                        )}
                      </View>

                      {newProductData.useCompoundUnit && (
                        <View style={[styles.inputGroup, styles.halfWidth]}>
                          <Text style={styles.label}>Secondary Unit</Text>
                          <TouchableOpacity
                            style={styles.dropdown}
                            onPress={() => {
                              console.log('Secondary unit dropdown pressed');
                              setShowSecondaryUnitDropdown(!showSecondaryUnitDropdown);
                              setShowPrimaryUnitDropdown(false);
                            }}
                            activeOpacity={0.7}
                          >
                            <View style={styles.dropdownContent}>
                              <Ruler size={20} color={Colors.textLight} />
                              <Text style={styles.dropdownText}>
                                {newProductData.secondaryUnit}
                              </Text>
                              <ChevronDown size={20} color={Colors.textLight} />
                            </View>
                          </TouchableOpacity>
                          
                          {showSecondaryUnitDropdown && (
                            <View style={styles.dropdownOptions}>
                              <View style={styles.dropdownSearchContainer}>
                                <Search size={16} color={Colors.textLight} />
                                <TextInput
                                  style={styles.dropdownSearchInput}
                                  placeholder="Search units..."
                                  placeholderTextColor={Colors.textLight}
                                  value={secondaryUnitSearch}
                                  onChangeText={setSecondaryUnitSearch}
                                  autoFocus
                                />
                              </View>
                              <ScrollView style={styles.dropdownScrollView} showsVerticalScrollIndicator={false}>
                                {secondaryUnits
                                  .filter(unit => 
                                    unit.toLowerCase().includes(secondaryUnitSearch.toLowerCase())
                                  )
                                  .slice(0, 8) // Limit to 8 results
                                  .map((unit) => (
                                    <TouchableOpacity
                                      key={unit}
                                      style={styles.dropdownOption}
                                      onPress={() => {
                                        setNewProductData(prev => ({ ...prev, secondaryUnit: unit }));
                                        setShowSecondaryUnitDropdown(false);
                                        setSecondaryUnitSearch('');
                                      }}
                                      activeOpacity={0.7}
                                    >
                                      <Text style={styles.dropdownOptionText}>{unit}</Text>
                                    </TouchableOpacity>
                                  ))}
                              </ScrollView>
                            </View>
                          )}
                        </View>
                      )}
                    </View>

                    {newProductData.useCompoundUnit && newProductData.secondaryUnit !== 'None' && (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Conversion Ratio</Text>
                        <View style={styles.conversionContainer}>
                          <View style={styles.conversionInputGroup}>
                            <Text style={styles.conversionLabel}>1 {newProductData.primaryUnit}</Text>
                            <Text style={styles.conversionEquals}>=</Text>
                            <View style={styles.conversionInputContainer}>
                              <TextInput
                                style={styles.conversionInput}
                                value={newProductData.conversionRatio}
                                onChangeText={(text) => {
                                  // Only allow numbers and decimal points
                                  const cleanedText = text.replace(/[^0-9.]/g, '');
                                  setNewProductData(prev => ({ ...prev, conversionRatio: cleanedText }));
                                }}
                                placeholder="0"
                                placeholderTextColor={Colors.textLight}
                                keyboardType="decimal-pad"
                                maxLength={10}
                              />
                            </View>
                            <Text style={styles.conversionLabel}>{newProductData.secondaryUnit}</Text>
                          </View>
                          {newProductData.conversionRatio && parseFloat(newProductData.conversionRatio) > 0 && (
                            <View style={styles.conversionPreview}>
                              <Text style={styles.conversionPreviewText}>
                                Preview: 1 {newProductData.primaryUnit} = {newProductData.conversionRatio} {newProductData.secondaryUnit}
                              </Text>
                            </View>
                          )}
                        </View>
                      </View>
                    )}
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Purchase Price *</Text>
                    <View style={styles.inputContainer}>
                      <IndianRupee size={20} color={Colors.textLight} style={styles.inputIcon} />
                      <TextInput
                        style={styles.input}
                        value={newProductData.purchasePrice}
                        onChangeText={(text) => setNewProductData(prev => ({ ...prev, purchasePrice: text }))}
                        placeholder="0.00"
                        placeholderTextColor={Colors.textLight}
                        keyboardType="decimal-pad"
                      />
                    </View>
                  </View>

                  <View style={styles.taxSection}>
                    <Text style={styles.taxLabel}>GST Rate (%)</Text>
                    <View style={styles.taxButtons}>
                      {[0, 5, 12, 18, 28].map((rate) => (
                        <TouchableOpacity
                          key={rate}
                          style={[
                            styles.taxButton,
                            { backgroundColor: newProductData.gstRate === rate ? Colors.primary : Colors.primary + '20' }
                          ]}
                          onPress={() => setNewProductData(prev => ({ ...prev, gstRate: rate }))}
                          activeOpacity={0.7}
                        >
                          <Text style={[
                            styles.taxButtonText, 
                            { color: newProductData.gstRate === rate ? Colors.background : Colors.primary }
                          ]}>
                            {rate}%
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>
                  </View>

                  {/* CESS Calculation Section */}
                  <View style={styles.cessSection}>
                    <Text style={styles.cessLabel}>CESS Calculation (Optional)</Text>
                    
                    <View style={styles.cessTypeContainer}>
                      <Text style={styles.cessSubLabel}>CESS Type:</Text>
                      <View style={styles.cessTypeButtons}>
                        {cessTypes.map((type) => (
                          <TouchableOpacity
                            key={type.value}
                            style={[
                              styles.cessTypeButton,
                              { backgroundColor: newProductData.cessType === type.value ? Colors.primary : Colors.primary + '20' }
                            ]}
                            onPress={() => setNewProductData(prev => ({ ...prev, cessType: type.value as 'none' | 'value' | 'quantity' | 'value_and_quantity' }))}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.cessTypeButtonText, 
                              { color: newProductData.cessType === type.value ? Colors.background : Colors.primary }
                            ]}>
                              {type.label}
                            </Text>
                          </TouchableOpacity>
                        ))}
                      </View>
                    </View>

                    {newProductData.cessType !== 'none' && (
                      <View style={styles.cessAmountContainer}>
                        <Text style={styles.cessSubLabel}>CESS Amount:</Text>
                        <View style={styles.cessAmountToggle}>
                          <TouchableOpacity
                            style={[
                              styles.cessToggleButton,
                              { backgroundColor: newProductData.cessAmountType === 'percentage' ? Colors.primary : Colors.grey[200] }
                            ]}
                            onPress={() => setNewProductData(prev => ({ ...prev, cessAmountType: 'percentage' }))}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.cessToggleText,
                              { color: newProductData.cessAmountType === 'percentage' ? Colors.background : Colors.text }
                            ]}>
                              %
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.cessToggleButton,
                              { backgroundColor: newProductData.cessAmountType === 'amount' ? Colors.primary : Colors.grey[200] }
                            ]}
                            onPress={() => setNewProductData(prev => ({ ...prev, cessAmountType: 'amount' }))}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.cessToggleText,
                              { color: newProductData.cessAmountType === 'amount' ? Colors.background : Colors.text }
                            ]}>
                              ₹
                            </Text>
                          </TouchableOpacity>
                        </View>
                        <View style={styles.inputContainer}>
                          {newProductData.cessAmountType === 'percentage' ? (
                            <Percent size={20} color={Colors.textLight} style={styles.inputIcon} />
                          ) : (
                            <IndianRupee size={20} color={Colors.textLight} style={styles.inputIcon} />
                          )}
                          <TextInput
                            style={styles.input}
                            value={newProductData.cessAmount.toString()}
                            onChangeText={(text) => setNewProductData(prev => ({ ...prev, cessAmount: parseFloat(text) || 0 }))}
                            placeholder={newProductData.cessAmountType === 'percentage' ? "0.00" : "0.00"}
                            placeholderTextColor={Colors.textLight}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>
                    )}
                  </View>

                  <TouchableOpacity
                    style={styles.addSelectedButton}
                    onPress={() => {
                      if (newProductData.name && newProductData.category && newProductData.purchasePrice && newProductData.primaryUnit) {
                        const productToAdd: StockInProduct = {
                          id: `PROD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          name: newProductData.name,
                          quantity: 1,
                          purchasePrice: parseFloat(newProductData.purchasePrice),
                          discount: 0,
                          totalPrice: parseFloat(newProductData.purchasePrice),
                          isNewProduct: true,
                          gstRate: newProductData.gstRate,
                          cessRate: newProductData.cessType === 'none' ? 0 : newProductData.cessRate,
                          cessType: newProductData.cessType,
                          cessAmount: newProductData.cessType === 'none' ? 0 : newProductData.cessAmount,
                          primaryUnit: newProductData.primaryUnit,
                          secondaryUnit: newProductData.secondaryUnit,
                          useCompoundUnit: newProductData.useCompoundUnit,
                          conversionRatio: newProductData.conversionRatio,
                        };
                        
                        updateFormData('products', [...formData.products, productToAdd]);
                        setShowCreateProductModal(false);
                        setNewProductData({
                          name: '',
                          category: '',
                          hsnCode: '',
                          purchasePrice: '',
                          gstRate: 18,
                          cessRate: 0,
                          cessType: 'none',
                          cessAmount: 0,
                          cessAmountType: 'percentage',
                          primaryUnit: 'Piece',
                          secondaryUnit: 'None',
                          useCompoundUnit: false,
                          conversionRatio: '',
                        });
                      } else {
                        Alert.alert('Incomplete Form', 'Please fill in all required fields');
                      }
                    }}
                    activeOpacity={0.8}
                  >
                    <Text style={styles.addSelectedButtonText}>Add Product to Stock In</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Primary Unit Modal */}
          <Modal
            visible={showPrimaryUnitModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPrimaryUnitModal(false)}
            onShow={() => console.log('Primary unit modal shown')}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Primary Unit</Text>
                  <TouchableOpacity
                    onPress={() => setShowPrimaryUnitModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {primaryUnits.map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.optionItem,
                        newProductData.primaryUnit === unit && styles.selectedOption
                      ]}
                      onPress={() => handlePrimaryUnitSelect(unit)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.optionText,
                        newProductData.primaryUnit === unit && styles.selectedOptionText
                      ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Secondary Unit Modal */}
          <Modal
            visible={showSecondaryUnitModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSecondaryUnitModal(false)}
            onShow={() => console.log('Secondary unit modal shown')}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Secondary Unit</Text>
                  <TouchableOpacity
                    onPress={() => setShowSecondaryUnitModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {secondaryUnits.map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.optionItem,
                        newProductData.secondaryUnit === unit && styles.selectedOption
                      ]}
                      onPress={() => handleSecondaryUnitSelect(unit)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.optionText,
                        newProductData.secondaryUnit === unit && styles.selectedOptionText
                      ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Primary Unit Modal */}
          <Modal
            visible={showPrimaryUnitModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowPrimaryUnitModal(false)}
            onShow={() => console.log('Primary unit modal shown')}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Primary Unit</Text>
                  <TouchableOpacity
                    onPress={() => setShowPrimaryUnitModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {primaryUnits.map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.optionItem,
                        newProductData.primaryUnit === unit && styles.selectedOption
                      ]}
                      onPress={() => handlePrimaryUnitSelect(unit)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.optionText,
                        newProductData.primaryUnit === unit && styles.selectedOptionText
                      ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Secondary Unit Modal */}
          <Modal
            visible={showSecondaryUnitModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowSecondaryUnitModal(false)}
            onShow={() => console.log('Secondary unit modal shown')}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Secondary Unit</Text>
                  <TouchableOpacity
                    onPress={() => setShowSecondaryUnitModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {secondaryUnits.map((unit) => (
                    <TouchableOpacity
                      key={unit}
                      style={[
                        styles.optionItem,
                        newProductData.secondaryUnit === unit && styles.selectedOption
                      ]}
                      onPress={() => handleSecondaryUnitSelect(unit)}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.optionText,
                        newProductData.secondaryUnit === unit && styles.selectedOptionText
                      ]}>
                        {unit}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
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
    gap: 12,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
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
  modalProductName: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 20,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxLabel: {
    fontSize: 16,
    color: Colors.text,
  },
  discountContainer: {
    marginBottom: 16,
  },
  discountTypeContainer: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  discountTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    alignItems: 'center',
  },
  activeDiscountType: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  discountTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  activeDiscountTypeText: {
    color: Colors.background,
  },
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  scanButton: {
    backgroundColor: Colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 16,
    borderRadius: 12,
    marginBottom: 20,
    gap: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  cessSection: {
    marginBottom: 20,
  },
  cessLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  cessSubLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  cessTypeContainer: {
    marginBottom: 16,
  },
  cessTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cessTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  cessTypeButtonText: {
    fontSize: 12,
    fontWeight: '600',
  },
  cessAmountContainer: {
    marginBottom: 16,
  },
  cessAmountToggle: {
    flexDirection: 'row',
    marginBottom: 12,
    gap: 8,
  },
  cessToggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    alignItems: 'center',
  },
  cessToggleText: {
    fontSize: 14,
    fontWeight: '600',
  },
  unitSection: {
    marginBottom: 20,
  },
  unitLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  unitSubLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  unitTypeContainer: {
    marginBottom: 16,
  },
  unitTypeButtons: {
    flexDirection: 'row',
    gap: 8,
  },
  unitTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    alignItems: 'center',
  },
  unitTypeButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  optionItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  selectedOption: {
    backgroundColor: Colors.primary + '20',
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  dropdownOptions: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    marginTop: 4,
    maxHeight: 280,
    zIndex: 1000,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  dropdownOption: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  dropdownOptionText: {
    fontSize: 14,
    color: Colors.text,
  },
  dropdownSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    gap: 8,
  },
  dropdownSearchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.text,
  },
  dropdownScrollView: {
    maxHeight: 200,
  },
  conversionContainer: {
    marginTop: 8,
  },
  conversionInputGroup: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  conversionLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  conversionEquals: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  conversionInputContainer: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 12,
    paddingVertical: 8,
    minWidth: 80,
  },
  conversionInput: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  conversionPreview: {
    marginTop: 12,
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.primary + '10',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  conversionPreviewText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '500',
    textAlign: 'center',
  },
}); 