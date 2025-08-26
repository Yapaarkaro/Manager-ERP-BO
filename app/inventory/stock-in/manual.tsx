import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Modal,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
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
  Edit,
} from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calculate responsive values with platform-specific adjustments
const headerPaddingHorizontal = Math.max(16, screenWidth * 0.04);
const headerPaddingVertical = Math.max(12, screenHeight * 0.015) + (Platform.OS === 'android' ? 8 : 0);
const backButtonWidth = Math.max(40, screenWidth * 0.1);
const backButtonHeight = Math.max(40, screenHeight * 0.05);
const backButtonMarginRight = Math.max(16, screenWidth * 0.04);
const headerTitleFontSize = Math.max(18, screenWidth * 0.045);
const totalCountFontSize = Math.max(14, screenWidth * 0.035);

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
  barcode: string;
  quantity: number;
  purchasePrice: number;
  discount: number;
  totalPrice: number;
  isNewProduct: boolean;
  gstRate: number;
  cessRate: number;
  cessType: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cessAmount: number;
  cessUnit?: string;
  primaryUnit: string;
  secondaryUnit: string;
  useCompoundUnit: boolean;
  conversionRatio: string;
  priceUnit: 'primary' | 'secondary';
  hsnCode?: string;
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
  roundOffAmount: number;
  finalAmount: number;
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
    roundOffAmount: 0,
    finalAmount: 0,
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
  const [editingProduct, setEditingProduct] = useState<StockInProduct | null>(null);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [newProductData, setNewProductData] = useState({
    name: '',
    category: '',
    barcode: '',
    hsnCode: '',
    purchasePrice: '',
    salePrice: '',
    mrp: '',
    priceUnit: 'primary' as 'primary' | 'secondary',
    gstRate: 18,
    cessRate: 0,
    cessType: 'none' as 'none' | 'value' | 'quantity' | 'value_and_quantity',
    cessAmount: 0,
    cessUnit: '',
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
      barcode: selectedProduct.barcode || '',
      quantity: 1,
      purchasePrice: 0,
      discount: 0,
      totalPrice: 0,
      isNewProduct: false,
      gstRate: 18, // Default GST rate
      cessRate: 0,
      cessType: 'value',
      cessAmount: 0,
      cessUnit: '',
      primaryUnit: 'Piece', // Default unit
      secondaryUnit: 'None',
      useCompoundUnit: false,
      conversionRatio: '',
      priceUnit: 'primary',
      hsnCode: '',
    };
    
    // Check if this is a new product that needs tax configuration
    if (selectedProduct.isNewProduct) {
      setShowTaxModal(true);
    } else {
      const updatedProducts = [...formData.products, newProduct];
      updateFormData('products', updatedProducts);
      
      // Recalculate total amount immediately
      const total = updatedProducts.reduce((sum, product) => sum + product.totalPrice, 0);
      updateFormData('totalAmount', total);
      
      setSelectedProduct(null);
      setShowProductModal(false);
    }
  };

  const handleTaxConfiguration = (gstRate: number, cessRate: number, cessType: string, cessAmount: number) => {
    if (!selectedProduct) return;
    
    const newProduct: StockInProduct = {
      id: selectedProduct.id,
      name: selectedProduct.name,
      barcode: selectedProduct.barcode || '',
      quantity: 1,
      purchasePrice: 0,
      discount: 0,
      totalPrice: 0,
      isNewProduct: false,
      gstRate,
      cessRate,
      cessType: cessType as 'value' | 'quantity' | 'value_and_quantity',
      cessAmount,
      cessUnit: '',
      primaryUnit: 'Piece', // Default unit
      secondaryUnit: 'None',
      useCompoundUnit: false,
      conversionRatio: '',
      priceUnit: 'primary',
      hsnCode: '',
    };
    
    const updatedProducts = [...formData.products, newProduct];
    updateFormData('products', updatedProducts);
    
    // Recalculate total amount immediately
    const total = updatedProducts.reduce((sum, product) => sum + product.totalPrice, 0);
    updateFormData('totalAmount', total);
    
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
      barcode: '1234567890123',
      hsnCode: '8471',
      purchasePrice: '1500',
      salePrice: '1800',
      mrp: '2000',
      priceUnit: 'primary' as 'primary' | 'secondary',
      gstRate: 18,
      cessRate: 0,
      cessType: 'none' as 'none' | 'value' | 'quantity' | 'value_and_quantity',
      cessAmount: 0,
      cessUnit: '',
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
        barcode: newProduct.barcode || '',
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
        priceUnit: 'primary',
        hsnCode: newProduct.hsnCode || '',
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
          barcode: productData.barcode || '',
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
          priceUnit: 'primary',
          hsnCode: productData.hsnCode || '',
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

  // Calculate round-off amount
  const calculateRoundOff = (amount: number) => {
    const decimalPart = amount % 1;
    if (decimalPart === 0) return 0;
    
    if (decimalPart < 0.5) {
      return -decimalPart; // Deduct the decimal part
    } else {
      return 1 - decimalPart; // Add to reach next whole number
    }
  };

  // Recalculate total amount and round-off whenever products or discount changes
  useEffect(() => {
    const total = formData.products.reduce((sum, product) => sum + product.totalPrice, 0);
    updateFormData('totalAmount', total);
    
    // Calculate amount after discount
    let amountAfterDiscount = total;
    if (formData.discountValue > 0) {
      if (formData.discountType === 'percentage') {
        amountAfterDiscount = total - (total * formData.discountValue / 100);
      } else {
        amountAfterDiscount = total - formData.discountValue;
      }
    }
    
    // Calculate round-off amount based on amount after discount
    const roundOffAmount = calculateRoundOff(amountAfterDiscount);
    updateFormData('roundOffAmount', roundOffAmount);
    
    // Calculate final amount
    const finalAmount = amountAfterDiscount + roundOffAmount;
    updateFormData('finalAmount', finalAmount);
  }, [formData.products, formData.discountValue, formData.discountType]);

  // Helper function to calculate effective price for compound units
  const calculateEffectivePrice = (product: StockInProduct) => {
    if (product.useCompoundUnit && product.conversionRatio) {
      const conversionRatio = parseFloat(product.conversionRatio);
      if (conversionRatio > 0) {
        // For compound units, always calculate based on pieces
        // If price is per piece, use as is
        if (product.priceUnit === 'secondary') {
          return product.purchasePrice;
        }
        // If price is per box, convert to per piece
        else if (product.priceUnit === 'primary') {
          return product.purchasePrice / conversionRatio;
        }
      }
    }
    return product.purchasePrice;
  };

  // Helper function to calculate base price for products
  const calculateBasePrice = (product: StockInProduct) => {
    if (product.useCompoundUnit && product.conversionRatio) {
      const conversionRatio = parseFloat(product.conversionRatio);
      const piecesPerUnit = conversionRatio;
      const totalPieces = product.quantity * piecesPerUnit;
      const pricePerPiece = calculateEffectivePrice(product);
      return totalPieces * pricePerPiece;
    } else {
      const effectivePrice = calculateEffectivePrice(product);
      return effectivePrice * product.quantity;
    }
  };

  // Helper function to calculate CESS amount
  const calculateCessAmount = (product: StockInProduct) => {
    const basePrice = calculateBasePrice(product);
    
    switch (product.cessType) {
      case 'none':
        return 0;
      case 'value':
        // CESS based on value (percentage)
        return basePrice * (product.cessRate / 100);
      case 'quantity':
        // CESS based on quantity (₹ per unit)
        return product.quantity * product.cessAmount;
      case 'value_and_quantity':
        // CESS based on both value and quantity
        const valueCess = basePrice * (product.cessRate / 100);
        const quantityCess = product.quantity * product.cessAmount;
        return valueCess + quantityCess;
      default:
        return 0;
    }
  };

  const updateProduct = (productId: string, field: keyof StockInProduct, value: any) => {
    const updatedProducts = formData.products.map(product => {
      if (product.id === productId) {
        const updated = { ...product, [field]: value };
        // Recalculate total price including GST and CESS
        const basePrice = calculateBasePrice(updated);
        const gstAmount = basePrice * (updated.gstRate / 100);
        const cessAmount = calculateCessAmount(updated);
        updated.totalPrice = basePrice + gstAmount + cessAmount;
        return updated;
      }
      return product;
    });
    
    updateFormData('products', updatedProducts);
    
    // Recalculate total amount immediately
    const total = updatedProducts.reduce((sum, product) => sum + product.totalPrice, 0);
    updateFormData('totalAmount', total);
  };

  const handleEditProduct = (product: StockInProduct) => {
    setEditingProduct(product);
    setShowEditProductModal(true);
  };

  const handleUpdateProduct = () => {
    if (editingProduct && editingProduct.name && editingProduct.purchasePrice > 0 && editingProduct.quantity > 0) {
      // Validate CESS fields based on type
      let cessValidation = true;
      let validationMessage = '';
      
      if (editingProduct.cessType === 'value') {
        if (editingProduct.cessRate <= 0) {
          cessValidation = false;
          validationMessage = 'Please enter CESS rate for value-based CESS';
        }
              } else if (editingProduct.cessType === 'quantity') {
          if (editingProduct.cessAmount <= 0 || !editingProduct.cessUnit) {
            cessValidation = false;
            validationMessage = 'Please enter CESS amount and select unit for quantity-based CESS';
          }
        } else if (editingProduct.cessType === 'value_and_quantity') {
          if (editingProduct.cessRate <= 0 || editingProduct.cessAmount <= 0 || !editingProduct.cessUnit) {
            cessValidation = false;
            validationMessage = 'Please enter both CESS rate and amount, and select unit for value and quantity CESS';
          }
        }
      
      if (!cessValidation) {
        Alert.alert('CESS Configuration', validationMessage);
        return;
      }
      
      // Update the product in the form data with recalculated total
      const updatedProduct = { ...editingProduct };
      const basePrice = calculateBasePrice(updatedProduct);
      const gstAmount = basePrice * (updatedProduct.gstRate / 100);
      const cessAmount = calculateCessAmount(updatedProduct);
      updatedProduct.totalPrice = basePrice + gstAmount + cessAmount;
      
      const updatedProducts = formData.products.map(product => 
        product.id === editingProduct.id ? updatedProduct : product
      );
      updateFormData('products', updatedProducts);
      setShowEditProductModal(false);
      setEditingProduct(null);
    } else {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
    }
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
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Try to go back, if no previous screen, go to stock in options
            try {
              router.back();
            } catch (error) {
              router.replace('/inventory/stock-in');
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Manual Stock In</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.totalCount}>
            {formData.products.length} products
          </Text>
        </View>
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
                onChangeText={(text) => {
                  // Format date as DD-MM-YYYY
                  let formattedText = text.replace(/[^0-9]/g, '');
                  if (formattedText.length >= 2) {
                    formattedText = formattedText.slice(0, 2) + '-' + formattedText.slice(2);
                  }
                  if (formattedText.length >= 5) {
                    formattedText = formattedText.slice(0, 5) + '-' + formattedText.slice(5);
                  }
                  if (formattedText.length > 10) {
                    formattedText = formattedText.slice(0, 10);
                  }
                  updateFormData('invoiceDate', formattedText);
                }}
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
                <Plus size={20} color={Colors.background} />
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
                      <View style={styles.productActions}>
                        <TouchableOpacity
                          onPress={() => handleEditProduct(product)}
                          activeOpacity={0.7}
                          style={styles.editButton}
                        >
                          <Edit size={16} color={Colors.primary} />
                        </TouchableOpacity>
                        <TouchableOpacity
                          onPress={() => removeProduct(product.id)}
                          activeOpacity={0.7}
                        >
                          <X size={16} color={Colors.error} />
                        </TouchableOpacity>
                      </View>
                    </View>
                    
                    <View style={styles.productDetails}>
                      <View style={styles.productRow}>
                        <Text style={styles.productLabel}>
                          Quantity ({product.primaryUnit}):
                          {product.useCompoundUnit && product.conversionRatio && (
                            <Text style={styles.piecesInfo}> ({product.conversionRatio} pieces per {product.primaryUnit})</Text>
                          )}
                        </Text>
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
                        <Text style={styles.productLabel}>GST ({product.gstRate}%):</Text>
                        <Text style={styles.taxAmount}>
                          ₹{(calculateBasePrice(product) * product.gstRate / 100).toFixed(2)}
                        </Text>
                      </View>
                      
                      {product.cessType !== 'none' && (
                        <View style={styles.productRow}>
                          <Text style={styles.productLabel}>
                            CESS {(() => {
                              switch (product.cessType) {
                                case 'value':
                                  return `(${product.cessRate}%)`;
                                case 'quantity':
                                  return `(₹${product.cessAmount}/${product.cessUnit || product.primaryUnit})`;
                                case 'value_and_quantity':
                                  return `(${product.cessRate}% + ₹${product.cessAmount}/${product.cessUnit || product.primaryUnit})`;
                                default:
                                  return '';
                              }
                            })()}:
                          </Text>
                          <Text style={styles.taxAmount}>
                            ₹{calculateCessAmount(product).toFixed(2)}
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
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Supplier Discount</Text>
              <Text style={styles.sectionSubtitle}>
                {formData.discountValue > 0 ? 
                  `Saving: ₹${formData.discountType === 'percentage' 
                    ? (formData.totalAmount * formData.discountValue / 100).toFixed(2)
                    : formData.discountValue.toFixed(2)
                  }` : 'No discount applied'
                }
              </Text>
            </View>
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
              
              <View style={styles.discountInputContainer}>
                {formData.discountType === 'amount' ? (
                  <IndianRupee size={20} color={Colors.primary} style={styles.inputIcon} />
                ) : (
                  <Percent size={20} color={Colors.primary} style={styles.inputIcon} />
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
              {formData.discountValue > 0 && (
                <Text style={styles.discountHelperText}>
                  {formData.discountType === 'percentage' 
                    ? `${formData.discountValue}% off total amount`
                    : `₹${formData.discountValue.toFixed(2)} off total amount`
                  }
                </Text>
              )}
            </View>
          </View>

          {/* Total Amount */}
          <View style={styles.section}>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₹{formData.totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* Amount After Discount */}
          {formData.discountValue > 0 && (
            <View style={styles.section}>
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>After Discount:</Text>
                <Text style={styles.totalAmount}>
                  ₹{(formData.totalAmount - (formData.discountType === 'percentage' 
                    ? (formData.totalAmount * formData.discountValue / 100) 
                    : formData.discountValue)).toFixed(2)}
                </Text>
              </View>
            </View>
          )}

          {/* Round Off */}
          <View style={styles.section}>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Round Off:</Text>
              <Text style={[
                styles.totalAmount, 
                { color: formData.roundOffAmount > 0 ? Colors.success : formData.roundOffAmount < 0 ? Colors.error : Colors.text }
              ]}>
                {formData.roundOffAmount > 0 ? '+' : ''}₹{formData.roundOffAmount.toFixed(2)}
              </Text>
            </View>
          </View>

          {/* Final Amount */}
          <View style={styles.section}>
            <View style={styles.totalSection}>
              <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>Final Amount:</Text>
              <Text style={[styles.totalAmount, { fontWeight: 'bold', color: Colors.primary }]}>
                ₹{formData.finalAmount.toFixed(0)}
              </Text>
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
                      {[
                        { type: 'none', label: 'No CESS' },
                        { type: 'value', label: 'Value Based (%)' },
                        { type: 'quantity', label: 'Quantity Based (₹/unit)' },
                        { type: 'value_and_quantity', label: 'Value + Quantity' }
                      ].map(({ type, label }) => (
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
                            {label}
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

                  {/* Basic Information */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Basic Information</Text>
                    
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
                      <Text style={styles.label}>Barcode</Text>
                      <View style={styles.inputContainer}>
                        <Hash size={20} color={Colors.textLight} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={newProductData.barcode}
                          onChangeText={(text) => setNewProductData(prev => ({ ...prev, barcode: text }))}
                          placeholder="Enter barcode or scan"
                          placeholderTextColor={Colors.textLight}
                        />
                        <TouchableOpacity
                          style={styles.scanIcon}
                          onPress={handleScanProduct}
                          activeOpacity={0.7}
                        >
                          <Camera size={16} color={Colors.primary} />
                        </TouchableOpacity>
                      </View>
                    </View>

                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>HSN Code</Text>
                      <View style={styles.inputContainer}>
                        <Hash size={20} color={Colors.textLight} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={newProductData.hsnCode}
                          onChangeText={(text) => {
                            const numericText = text.replace(/[^0-9]/g, '');
                            setNewProductData(prev => ({ ...prev, hsnCode: numericText }))
                          }}
                          placeholder="Enter HSN code (numbers only)"
                          placeholderTextColor={Colors.textLight}
                          keyboardType="numeric"
                          maxLength={8}
                        />
                      </View>
                    </View>
                  </View>

                  {/* Unit of Measurement Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Unit of Measurement</Text>
                    
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

                  

                  {/* Tax Information Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Tax Information</Text>
                    
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
                          {[
                            { value: 'none', label: 'No CESS' },
                            { value: 'value', label: 'Value Based (%)' },
                            { value: 'quantity', label: 'Quantity Based (₹/unit)' },
                            { value: 'value_and_quantity', label: 'Value + Quantity' }
                          ].map((type) => (
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

                      {/* CESS Rate (%) - Show for 'value' and 'value_and_quantity' */}
                      {(newProductData.cessType === 'value' || newProductData.cessType === 'value_and_quantity') && (
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>CESS Rate (%) *</Text>
                          <View style={styles.inputContainer}>
                            <Percent size={20} color={Colors.textLight} style={styles.inputIcon} />
                            <TextInput
                              style={styles.input}
                              value={newProductData.cessRate.toString()}
                              onChangeText={(text) => setNewProductData(prev => ({ ...prev, cessRate: parseFloat(text) || 0 }))}
                              placeholder="0"
                              placeholderTextColor={Colors.textLight}
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                      )}

                      {/* CESS Amount (₹ per unit) - Show for 'quantity' and 'value_and_quantity' */}
                      {(newProductData.cessType === 'quantity' || newProductData.cessType === 'value_and_quantity') && (
                        <>
                          <View style={styles.inputGroup}>
                            <Text style={styles.label}>CESS Amount (₹ per unit) *</Text>
                            <View style={styles.inputContainer}>
                              <IndianRupee size={20} color={Colors.textLight} style={styles.inputIcon} />
                              <TextInput
                                style={styles.input}
                                value={newProductData.cessAmount.toString()}
                                onChangeText={(text) => setNewProductData(prev => ({ ...prev, cessAmount: parseFloat(text) || 0 }))}
                                placeholder="0.00"
                                placeholderTextColor={Colors.textLight}
                                keyboardType="decimal-pad"
                              />
                            </View>
                          </View>
                          
                          <View style={styles.inputGroup}>
                            <Text style={styles.label}>CESS Unit *</Text>
                            <TouchableOpacity
                              style={styles.inputContainer}
                              onPress={() => {
                                const availableUnits = [newProductData.primaryUnit];
                                if (newProductData.useCompoundUnit && newProductData.secondaryUnit !== 'None') {
                                  availableUnits.push(newProductData.secondaryUnit);
                                }
                                
                                Alert.alert(
                                  'Select CESS Unit',
                                  'Choose the unit for CESS calculation',
                                  [
                                    ...availableUnits.map(unit => ({
                                      text: unit,
                                      onPress: () => setNewProductData(prev => ({ ...prev, cessUnit: unit }))
                                    })),
                                    { text: 'Cancel', style: 'cancel' }
                                  ]
                                );
                              }}
                              activeOpacity={0.7}
                            >
                              <Ruler size={20} color={Colors.textLight} style={styles.inputIcon} />
                              <Text style={[styles.input, { color: newProductData.cessUnit ? Colors.text : Colors.textLight }]}>
                                {newProductData.cessUnit || 'Select unit'}
                              </Text>
                              <ChevronDown size={16} color={Colors.textLight} style={{ marginLeft: 'auto' }} />
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                    </View>
                  </View>

                  {/* Pricing Information Section */}
                  <View style={styles.modalSection}>
                    <Text style={styles.modalSectionTitle}>Pricing Information</Text>
                    
                    {/* Price Unit Selection */}
                    {newProductData.useCompoundUnit && newProductData.secondaryUnit !== 'None' ? (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Price Unit *</Text>
                        <View style={styles.priceUnitContainer}>
                          <TouchableOpacity
                            style={[
                              styles.priceUnitButton,
                              newProductData.priceUnit === 'primary' && styles.activePriceUnitButton
                            ]}
                            onPress={() => setNewProductData(prev => ({ ...prev, priceUnit: 'primary' }))}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.priceUnitButtonText,
                              newProductData.priceUnit === 'primary' && styles.activePriceUnitButtonText
                            ]}>
                              Per {newProductData.primaryUnit}
                            </Text>
                          </TouchableOpacity>
                          <TouchableOpacity
                            style={[
                              styles.priceUnitButton,
                              newProductData.priceUnit === 'secondary' && styles.activePriceUnitButton
                            ]}
                            onPress={() => setNewProductData(prev => ({ ...prev, priceUnit: 'secondary' }))}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.priceUnitButtonText,
                              newProductData.priceUnit === 'secondary' && styles.activePriceUnitButtonText
                            ]}>
                              Per {newProductData.secondaryUnit}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    ) : (
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Price Unit *</Text>
                        <View style={styles.priceUnitContainer}>
                          <TouchableOpacity
                            style={[
                              styles.priceUnitButton,
                              styles.activePriceUnitButton
                            ]}
                            activeOpacity={0.7}
                          >
                            <Text style={[
                              styles.priceUnitButtonText,
                              styles.activePriceUnitButtonText
                            ]}>
                              Per {newProductData.primaryUnit}
                            </Text>
                          </TouchableOpacity>
                        </View>
                      </View>
                    )}

                    {/* Purchase Price */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>
                        Purchase Price {newProductData.useCompoundUnit && newProductData.secondaryUnit !== 'None' 
                          ? `per ${newProductData.priceUnit === 'primary' ? newProductData.primaryUnit : newProductData.secondaryUnit}` 
                          : ''} *
                      </Text>
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

                    {/* Sale Price */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>Sale Price *</Text>
                      <View style={styles.inputContainer}>
                        <IndianRupee size={20} color={Colors.textLight} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={newProductData.salePrice}
                          onChangeText={(text) => setNewProductData(prev => ({ ...prev, salePrice: text }))}
                          placeholder="0.00"
                          placeholderTextColor={Colors.textLight}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>

                    {/* MRP */}
                    <View style={styles.inputGroup}>
                      <Text style={styles.label}>MRP *</Text>
                      <View style={styles.inputContainer}>
                        <IndianRupee size={20} color={Colors.textLight} style={styles.inputIcon} />
                        <TextInput
                          style={styles.input}
                          value={newProductData.mrp}
                          onChangeText={(text) => setNewProductData(prev => ({ ...prev, mrp: text }))}
                          placeholder="0.00"
                          placeholderTextColor={Colors.textLight}
                          keyboardType="decimal-pad"
                        />
                      </View>
                    </View>
                  </View>

                  <TouchableOpacity
                    style={[styles.addSelectedButton, { marginTop: 30, marginBottom: 30 }]}
                    onPress={() => {
                      // Basic validation
                      if (!newProductData.name || !newProductData.category || !newProductData.purchasePrice || !newProductData.salePrice || !newProductData.mrp || !newProductData.primaryUnit) {
                        Alert.alert('Incomplete Form', 'Please fill in all required fields');
                        return;
                      }
                      
                      // CESS validation based on type
                      if (newProductData.cessType === 'value' && newProductData.cessRate <= 0) {
                        Alert.alert('CESS Configuration', 'Please enter CESS rate for value-based CESS');
                        return;
                      }
                      
                      if (newProductData.cessType === 'quantity' && (newProductData.cessAmount <= 0 || !newProductData.cessUnit)) {
                        Alert.alert('CESS Configuration', 'Please enter CESS amount and select unit for quantity-based CESS');
                        return;
                      }
                      
                      if (newProductData.cessType === 'value_and_quantity' && (newProductData.cessRate <= 0 || newProductData.cessAmount <= 0 || !newProductData.cessUnit)) {
                        Alert.alert('CESS Configuration', 'Please enter both CESS rate and amount, and select unit for value and quantity CESS');
                        return;
                      }
                      
                      if (newProductData.name && newProductData.category && newProductData.purchasePrice && newProductData.primaryUnit) {
                        const productToAdd: StockInProduct = {
                          id: `PROD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                          name: newProductData.name,
                          barcode: newProductData.barcode || '',
                          quantity: 1,
                          purchasePrice: parseFloat(newProductData.purchasePrice),
                          discount: 0,
                          totalPrice: 0, // Will be calculated properly
                          isNewProduct: true,
                          gstRate: newProductData.gstRate,
                          cessRate: newProductData.cessType === 'none' ? 0 : newProductData.cessRate,
                          cessType: newProductData.cessType,
                          cessAmount: newProductData.cessType === 'none' ? 0 : newProductData.cessAmount,
                          cessUnit: newProductData.cessUnit || '',
                          primaryUnit: newProductData.primaryUnit,
                          secondaryUnit: newProductData.secondaryUnit,
                          useCompoundUnit: newProductData.useCompoundUnit,
                          conversionRatio: newProductData.conversionRatio,
                          priceUnit: newProductData.priceUnit,
                        };
                        
                        // Calculate proper total price including GST and CESS
                        const basePrice = calculateBasePrice(productToAdd);
                        const gstAmount = basePrice * (productToAdd.gstRate / 100);
                        const cessAmount = calculateCessAmount(productToAdd);
                        productToAdd.totalPrice = basePrice + gstAmount + cessAmount;
                        
                        // Save to inventory (mock implementation)
                        const inventoryProduct = {
                          id: productToAdd.id,
                          name: productToAdd.name,
                          category: newProductData.category,
                          barcode: productToAdd.barcode,
                          hsnCode: newProductData.hsnCode,
                          purchasePrice: parseFloat(newProductData.purchasePrice),
                          salePrice: parseFloat(newProductData.salePrice),
                          mrp: parseFloat(newProductData.mrp),
                          gstRate: productToAdd.gstRate,
                          cessRate: productToAdd.cessRate,
                          cessType: productToAdd.cessType,
                          cessAmount: productToAdd.cessAmount,
                          cessUnit: productToAdd.cessUnit,
                          primaryUnit: productToAdd.primaryUnit,
                          secondaryUnit: productToAdd.secondaryUnit,
                          useCompoundUnit: productToAdd.useCompoundUnit,
                          conversionRatio: productToAdd.conversionRatio,
                          priceUnit: productToAdd.priceUnit,
                          stockQuantity: 0, // Will be updated when stock-in is completed
                        };
                        
                        // In a real app, this would save to a database
                        console.log('Product saved to inventory:', inventoryProduct);
                        
                        const updatedProducts = [...formData.products, productToAdd];
                        updateFormData('products', updatedProducts);
                        setShowCreateProductModal(false);
                        setNewProductData({
                          name: '',
                          category: '',
                          barcode: '',
                          hsnCode: '',
                          purchasePrice: '',
                          salePrice: '',
                          mrp: '',
                          priceUnit: 'primary',
                          gstRate: 18,
                          cessRate: 0,
                          cessType: 'none',
                          cessAmount: 0,
                          cessUnit: '',
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
                    <Text style={styles.addSelectedButtonText}>Save to Inventory & Add to Stock In</Text>
                  </TouchableOpacity>
                </ScrollView>
              </View>
            </View>
          </Modal>

          {/* Edit Product Modal */}
          <Modal
            visible={showEditProductModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowEditProductModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Edit Product</Text>
                  <TouchableOpacity
                    onPress={() => setShowEditProductModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
                
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {editingProduct && (
                    <>
                      {/* Product Name */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Product Name *</Text>
                        <View style={styles.inputContainer}>
                          <Package size={20} color={Colors.textLight} style={styles.inputIcon} />
                          <TextInput
                            style={styles.input}
                            value={editingProduct.name}
                            onChangeText={(text) => setEditingProduct(prev => prev ? { ...prev, name: text } : null)}
                            placeholder="Enter product name"
                            placeholderTextColor={Colors.textLight}
                          />
                        </View>
                      </View>

                      {/* Purchase Price */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Purchase Price *</Text>
                        <View style={styles.inputContainer}>
                          <IndianRupee size={20} color={Colors.textLight} style={styles.inputIcon} />
                          <TextInput
                            style={styles.input}
                            value={editingProduct.purchasePrice.toString()}
                            onChangeText={(text) => setEditingProduct(prev => prev ? { ...prev, purchasePrice: parseFloat(text) || 0 } : null)}
                            placeholder="0.00"
                            placeholderTextColor={Colors.textLight}
                            keyboardType="decimal-pad"
                          />
                        </View>
                      </View>

                      {/* Quantity */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>Quantity ({editingProduct.primaryUnit}) *</Text>
                        <View style={styles.inputContainer}>
                          <Hash size={20} color={Colors.textLight} style={styles.inputIcon} />
                          <TextInput
                            style={styles.input}
                            value={editingProduct.quantity.toString()}
                            onChangeText={(text) => setEditingProduct(prev => prev ? { ...prev, quantity: parseInt(text) || 0 } : null)}
                            placeholder="0"
                            placeholderTextColor={Colors.textLight}
                            keyboardType="numeric"
                          />
                        </View>
                      </View>

                      {/* Pieces per Box (for compound units) */}
                      {editingProduct.useCompoundUnit && (
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Pieces per {editingProduct.primaryUnit}</Text>
                          <View style={styles.inputContainer}>
                            <Hash size={20} color={Colors.textLight} style={styles.inputIcon} />
                            <TextInput
                              style={styles.input}
                              value={editingProduct.conversionRatio}
                              onChangeText={(text) => setEditingProduct(prev => prev ? { ...prev, conversionRatio: text } : null)}
                              placeholder="0"
                              placeholderTextColor={Colors.textLight}
                              keyboardType="numeric"
                            />
                          </View>
                        </View>
                      )}

                      {/* GST Rate */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>GST Rate (%)</Text>
                        <View style={styles.taxButtons}>
                          {[0, 5, 12, 18, 28].map((rate) => (
                            <TouchableOpacity
                              key={rate}
                              style={[
                                styles.taxButton,
                                { backgroundColor: editingProduct.gstRate === rate ? Colors.primary : Colors.primary + '20' }
                              ]}
                              onPress={() => setEditingProduct(prev => prev ? { ...prev, gstRate: rate } : null)}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.taxButtonText, 
                                { color: editingProduct.gstRate === rate ? Colors.background : Colors.primary }
                              ]}>
                                {rate}%
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* CESS Type */}
                      <View style={styles.inputGroup}>
                        <Text style={styles.label}>CESS Type</Text>
                        <View style={styles.taxButtons}>
                          {[
                            { type: 'none', label: 'No CESS' },
                            { type: 'value', label: 'Value Based (%)' },
                            { type: 'quantity', label: 'Quantity Based (₹/unit)' },
                            { type: 'value_and_quantity', label: 'Value + Quantity' }
                          ].map(({ type, label }) => (
                            <TouchableOpacity
                              key={type}
                              style={[
                                styles.taxButton,
                                { backgroundColor: editingProduct.cessType === type ? Colors.warning : Colors.warning + '20' }
                              ]}
                              onPress={() => setEditingProduct(prev => prev ? { ...prev, cessType: type as 'none' | 'value' | 'quantity' | 'value_and_quantity' } : null)}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.taxButtonText, 
                                { color: editingProduct.cessType === type ? Colors.background : Colors.warning }
                              ]}>
                                {label}
                              </Text>
                            </TouchableOpacity>
                          ))}
                        </View>
                      </View>

                      {/* CESS Rate/Amount (only show if CESS is enabled) */}
                      {editingProduct.cessType !== 'none' && (
                        <>
                          {/* CESS Rate (%) - Show for 'value' and 'value_and_quantity' */}
                          {(editingProduct.cessType === 'value' || editingProduct.cessType === 'value_and_quantity') && (
                            <View style={styles.inputGroup}>
                              <Text style={styles.label}>CESS Rate (%) *</Text>
                              <View style={styles.inputContainer}>
                                <Percent size={20} color={Colors.textLight} style={styles.inputIcon} />
                                <TextInput
                                  style={styles.input}
                                  value={editingProduct.cessRate.toString()}
                                  onChangeText={(text) => setEditingProduct(prev => prev ? { ...prev, cessRate: parseFloat(text) || 0 } : null)}
                                  placeholder="0"
                                  placeholderTextColor={Colors.textLight}
                                  keyboardType="numeric"
                                />
                              </View>
                            </View>
                          )}

                                                {/* CESS Amount (₹ per unit) - Show for 'quantity' and 'value_and_quantity' */}
                      {(editingProduct.cessType === 'quantity' || editingProduct.cessType === 'value_and_quantity') && (
                        <>
                          <View style={styles.inputGroup}>
                            <Text style={styles.label}>CESS Amount (₹ per unit) *</Text>
                            <View style={styles.inputContainer}>
                              <IndianRupee size={20} color={Colors.textLight} style={styles.inputIcon} />
                              <TextInput
                                style={styles.input}
                                value={editingProduct.cessAmount.toString()}
                                onChangeText={(text) => setEditingProduct(prev => prev ? { ...prev, cessAmount: parseFloat(text) || 0 } : null)}
                                placeholder="0.00"
                                placeholderTextColor={Colors.textLight}
                                keyboardType="decimal-pad"
                              />
                            </View>
                          </View>
                          
                          <View style={styles.inputGroup}>
                            <Text style={styles.label}>CESS Unit *</Text>
                            <TouchableOpacity
                              style={styles.inputContainer}
                              onPress={() => {
                                Alert.alert(
                                  'Select CESS Unit',
                                  'Choose the unit for CESS calculation',
                                  [
                                    { text: 'Piece', onPress: () => setEditingProduct(prev => prev ? { ...prev, cessUnit: 'Piece' } : null) },
                                    { text: 'Kilogram', onPress: () => setEditingProduct(prev => prev ? { ...prev, cessUnit: 'Kilogram' } : null) },
                                    { text: 'Liter', onPress: () => setEditingProduct(prev => prev ? { ...prev, cessUnit: 'Liter' } : null) },
                                    { text: 'Box', onPress: () => setEditingProduct(prev => prev ? { ...prev, cessUnit: 'Box' } : null) },
                                    { text: 'Pack', onPress: () => setEditingProduct(prev => prev ? { ...prev, cessUnit: 'Pack' } : null) },
                                    { text: 'Cancel', style: 'cancel' }
                                  ]
                                );
                              }}
                              activeOpacity={0.7}
                            >
                              <Ruler size={20} color={Colors.textLight} style={styles.inputIcon} />
                              <Text style={[styles.input, { color: editingProduct.cessUnit ? Colors.text : Colors.textLight }]}>
                                {editingProduct.cessUnit || 'Select unit'}
                              </Text>
                              <ChevronDown size={16} color={Colors.textLight} style={{ marginLeft: 'auto' }} />
                            </TouchableOpacity>
                          </View>
                        </>
                      )}
                        </>
                      )}

                      <TouchableOpacity
                        style={styles.addSelectedButton}
                        onPress={handleUpdateProduct}
                        activeOpacity={0.8}
                      >
                        <Text style={styles.addSelectedButtonText}>Update Product</Text>
                      </TouchableOpacity>
                    </>
                  )}
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
    paddingHorizontal: headerPaddingHorizontal,
    paddingVertical: headerPaddingVertical,
  },
  backButton: {
    width: backButtonWidth,
    height: backButtonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: backButtonMarginRight,
  },
  headerTitle: {
    fontSize: headerTitleFontSize,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  totalCount: {
    fontSize: totalCountFontSize,
    color: Colors.textLight,
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
    marginBottom: 8,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic',
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
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
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
    paddingVertical: 12,
    minHeight: 48,
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
    maxWidth: 500,
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
    paddingBottom: 100,
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
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    padding: 4,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    width: '100%',
    gap: 4,
  },
  discountTypeButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  activeDiscountType: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.3,
    shadowRadius: 6,
    elevation: 4,
    transform: [{ scale: 1.02 }],
  },
  discountTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeDiscountTypeText: {
    color: Colors.background,
    fontWeight: '600',
  },
  discountInputContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 12,
    flexDirection: 'row',
    alignItems: 'center',
    minHeight: 48,
  },
  discountHelperText: {
    fontSize: 12,
    color: Colors.success,
    marginTop: 8,
    fontStyle: 'italic',
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
  modalSection: {
    marginBottom: 24,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalSectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    paddingBottom: 8,
    borderBottomWidth: 2,
    borderBottomColor: Colors.primary,
  },
  scanIcon: {
    padding: 8,
    marginLeft: 8,
  },
  priceUnitContainer: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
  },
  priceUnitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  activePriceUnitButton: {
    backgroundColor: Colors.primary,
  },
  priceUnitButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  activePriceUnitButtonText: {
    color: Colors.background,
  },
  productActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    padding: 4,
  },
  piecesInfo: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
}); 