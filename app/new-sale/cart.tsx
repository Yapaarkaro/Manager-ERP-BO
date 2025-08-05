import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
} from 'react-native';
import { showError } from '@/utils/notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { 
  ArrowLeft, 
  Search, 
  Scan,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ChevronDown,
  Ruler,
  Hash,
  Percent,
  X,
  Upload
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

const gstRates = [
  { label: '0%', value: 0 },
  { label: '5%', value: 5 },
  { label: '12%', value: 12 },
  { label: '18%', value: 18 },
  { label: '28%', value: 28 }
];

const cessTypes = [
  { value: 'none', label: 'No CESS' },
  { value: 'value', label: 'Value Based (%)' },
  { value: 'quantity', label: 'Quantity Based (₹/unit)' },
  { value: 'value_and_quantity', label: 'Value + Quantity' }
];

const cessUnits = [
  'Piece', 'Kilogram', 'Liter', 'Box', 'Pack', 'Set', 'Pair', 'Dozen', 
  'Ton', 'Quintal', 'Foot', 'Inch', 'Yard', 'Square Meter', 'Square Foot', 
  'Cubic Meter', 'Cubic Foot', 'Bundle', 'Roll', 'Sheet', 'Bottle', 'Can', 
  'Jar', 'Tube', 'Bag', 'Carton', 'Crate', 'Gallon', 'Ounce', 'Pound'
];

interface CartProduct {
  id: string;
  name: string;
  price: number;
  image: string;
  category: string;
  quantity: number;
  barcode?: string;
  taxRate?: number;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  brand?: string;
  originalPrice?: number;
  // HSN/SAC and Batch fields
  hsnCode?: string;
  batchNumber?: string;
  // Unit fields
  primaryUnit?: string;
  // CESS fields
  cessType?: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cessRate?: number;
  cessAmount?: number;
  cessUnit?: string;
}

export default function CartScreen() {
  const { selectedProducts, preSelectedCustomer } = useLocalSearchParams();
  const [cartItems, setCartItems] = useState<CartProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<CartProduct | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState('');
  const [showAddProductModal, setShowAddProductModal] = useState(false);

  useEffect(() => {
    if (selectedProducts) {
      try {
        const products = JSON.parse(selectedProducts as string);
        setCartItems(products);
      } catch (error) {
        console.error('Error parsing selected products:', error);
      }
    }
  }, [selectedProducts]);

  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }
    
    setCartItems(prev => 
      prev.map(item => 
        item.id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const removeItem = (productId: string) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const handleScanBarcode = () => {
    router.push('/new-sale/scanner');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    // Implement product search functionality
  };

  const handleEditProduct = (product: CartProduct) => {
    setEditingProduct({ ...product });
    setShowEditModal(true);
  };

  const handleSaveProduct = (updatedProduct: CartProduct) => {
    setCartItems(prev => 
      prev.map(item => 
        item.id === updatedProduct.id ? updatedProduct : item
      )
    );
    setShowEditModal(false);
    setEditingProduct(null);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingProduct(null);
  };

  const handleAddNewProduct = () => {
    setShowAddProductModal(true);
  };

  const handleSaveNewProduct = (newProduct: CartProduct) => {
    setCartItems(prev => [...prev, newProduct]);
    setShowAddProductModal(false);
  };

  const handleCancelAddProduct = () => {
    setShowAddProductModal(false);
  };

  const calculateItemTotal = (item: CartProduct) => {
    let basePrice = item.price * item.quantity;
    
    // Apply discount
    if (item.discountValue && item.discountValue > 0) {
      if (item.discountType === 'percentage') {
        basePrice = basePrice * (1 - item.discountValue / 100);
      } else {
        basePrice = basePrice - item.discountValue;
      }
    }
    
    // Apply tax
    const taxRate = item.taxRate || 0;
    const taxAmount = basePrice * (taxRate / 100);
    
    // Calculate CESS
    let cessAmount = 0;
    if (item.cessType && item.cessType !== 'none') {
      if (item.cessType === 'value') {
        // Value-based CESS (percentage of base price)
        cessAmount = basePrice * ((item.cessRate || 0) / 100);
      } else if (item.cessType === 'quantity') {
        // Quantity-based CESS (fixed amount per unit)
        cessAmount = (item.cessAmount || 0) * item.quantity;
      } else if (item.cessType === 'value_and_quantity') {
        // Both value and quantity CESS
        const valueCess = basePrice * ((item.cessRate || 0) / 100);
        const quantityCess = (item.cessAmount || 0) * item.quantity;
        cessAmount = valueCess + quantityCess;
      }
    }
    
    return {
      subtotal: item.price * item.quantity,
      discountAmount: item.discountValue && item.discountValue > 0 
        ? (item.discountType === 'percentage' 
          ? (item.price * item.quantity * item.discountValue / 100)
          : item.discountValue)
        : 0,
      taxAmount: taxAmount,
      cessAmount: cessAmount,
      total: basePrice + taxAmount + cessAmount
    };
  };

  const calculateInvoiceDiscount = () => {
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const discountValue = parseFloat(invoiceDiscountValue) || 0;
    
    if (invoiceDiscountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    } else {
      return discountValue;
    }
  };

  const calculateTotal = () => {
    const subtotal = cartItems.reduce((total, item) => total + (item.price * item.quantity), 0);
    const invoiceDiscount = calculateInvoiceDiscount();
    const tax = cartItems.reduce((total, item) => total + calculateItemTotal(item).taxAmount, 0);
    const cess = cartItems.reduce((total, item) => total + calculateItemTotal(item).cessAmount, 0);
    
    const total = subtotal - invoiceDiscount + tax + cess;
    
    // Apply round-off logic
    const decimalPart = total % 1;
    if (decimalPart < 0.50) {
      return Math.floor(total); // Round down to nearest whole number
    } else {
      return Math.ceil(total); // Round up to nearest whole number
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const formatGSTDisplay = (taxRate: number) => {
    if (!taxRate || taxRate === 0) return '0%';
    
    // For GST rates, show as (CGST%+SGST%)
    const halfRate = taxRate / 2;
    return `(${halfRate}%+${halfRate}%)`;
  };

  const handleContinue = () => {
    if (cartItems.length === 0) {
      showError('Please add some products to continue', 'Empty Cart');
      return;
    }

    router.push({
      pathname: '/new-sale/customer-details',
      params: {
        cartItems: JSON.stringify(cartItems),
        totalAmount: calculateTotal().toString(),
        preSelectedCustomer: preSelectedCustomer
      }
    });
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
        
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        
        <View style={styles.headerRight}>
          <Text style={styles.itemCount}>
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      {/* Cart Items */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {cartItems.length === 0 ? (
          <View style={styles.emptyCart}>
            <ShoppingCart size={64} color={Colors.textLight} />
            <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
            <Text style={styles.emptyCartText}>
              Add products by searching or scanning barcodes
            </Text>
          </View>
        ) : (
          <>
            {cartItems.map((item) => (
              <View key={item.id} style={styles.cartItem}>
                {/* Main Content Row */}
                <View style={styles.cartItemMain}>
                  {/* Left: Product Image */}
                  <Image 
                    source={{ uri: item.image }}
                    style={styles.productImage}
                  />
                  
                  {/* Center: Product Details */}
                  <View style={styles.productInfo}>
                    <Text style={styles.productName} numberOfLines={2}>
                      {item.name}
                    </Text>
                    <Text style={styles.productCategory}>
                      HSN: {item.category}
                    </Text>
                    {item.barcode && (
                      <Text style={styles.barcode}>
                        {item.barcode}
                      </Text>
                    )}
                  </View>

                  {/* Right: Price */}
                  <View style={styles.rightSection}>
                    <Text style={styles.productPrice}>
                      {formatPrice(item.price)}
                    </Text>
                  </View>
                </View>

                {/* Bottom: Action Buttons and Quantity */}
                <View style={styles.cartItemBottom}>
                  {/* Left: Edit and Delete Buttons */}
                  <View style={styles.actionButtons}>
                    <TouchableOpacity
                      style={styles.editButton}
                      onPress={() => handleEditProduct(item)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.editButtonText}>Edit</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.removeButton}
                      onPress={() => removeItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={16} color={Colors.error} />
                    </TouchableOpacity>
                  </View>

                  {/* Right: Quantity Controls */}
                  <View style={styles.quantityControls}>
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.id, item.quantity - 1)}
                      activeOpacity={0.7}
                    >
                      <Minus size={16} color={Colors.text} />
                    </TouchableOpacity>
                    
                    <TextInput
                      style={styles.quantityInput}
                      value={item.quantity.toString()}
                      onChangeText={(text) => {
                        const newQuantity = parseInt(text) || 0;
                        if (newQuantity >= 0) {
                          updateQuantity(item.id, newQuantity);
                        }
                      }}
                      keyboardType="numeric"
                      textAlign="center"
                      placeholder="0"
                      placeholderTextColor={Colors.textLight}
                    />
                    
                    <TouchableOpacity
                      style={styles.quantityButton}
                      onPress={() => updateQuantity(item.id, item.quantity + 1)}
                      activeOpacity={0.7}
                    >
                      <Plus size={16} color={Colors.text} />
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            ))}

            {/* Add New Product Button */}
            <TouchableOpacity
              style={styles.addNewProductButton}
              onPress={handleAddNewProduct}
              activeOpacity={0.7}
            >
              <Plus size={20} color={Colors.primary} />
              <Text style={styles.addNewProductText}>Add New Product</Text>
            </TouchableOpacity>

            {/* Floating Total Display */}
            <View style={styles.floatingTotalContainer}>
              <View style={styles.floatingTotalContent}>
                <Text style={styles.floatingTotalLabel}>Total Bill Amount:</Text>
                <Text style={styles.floatingTotalAmount}>
                  {formatPrice(calculateTotal())}
                </Text>
              </View>
            </View>

            {/* Invoice Discount Section */}
            <View style={styles.discountSection}>
              <Text style={styles.discountTitle}>Invoice Discount</Text>
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>Discount Type:</Text>
                <View style={styles.discountTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.discountTypeButton, 
                      invoiceDiscountType === 'percentage' && styles.activeDiscountTypeButton
                    ]}
                    onPress={() => setInvoiceDiscountType('percentage')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.discountTypeText,
                      invoiceDiscountType === 'percentage' && styles.activeDiscountTypeText
                    ]}>%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.discountTypeButton,
                      invoiceDiscountType === 'amount' && styles.activeDiscountTypeButton
                    ]}
                    onPress={() => setInvoiceDiscountType('amount')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.discountTypeText,
                      invoiceDiscountType === 'amount' && styles.activeDiscountTypeText
                    ]}>₹</Text>
                  </TouchableOpacity>
                </View>
              </View>
              <View style={styles.discountRow}>
                <Text style={styles.discountLabel}>Discount Value:</Text>
                <TextInput
                  style={styles.invoiceDiscountInput}
                  value={invoiceDiscountValue}
                  onChangeText={setInvoiceDiscountValue}
                  placeholder="0"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>

            {/* Total Section */}
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Subtotal:</Text>
                <Text style={styles.totalAmount}>
                  {formatPrice(cartItems.reduce((total, item) => total + (item.price * item.quantity), 0))}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Invoice Discount:</Text>
                <Text style={styles.totalAmount}>
                  {formatPrice(calculateInvoiceDiscount())}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>GST:</Text>
                <Text style={styles.totalAmount}>
                  {formatPrice(cartItems.reduce((total, item) => total + calculateItemTotal(item).taxAmount, 0))}
                </Text>
              </View>
              
              {/* GST Breakdown */}
              {cartItems.some(item => item.taxRate && item.taxRate > 0) && (
                <View style={styles.taxBreakdownContainer}>
                  <Text style={styles.taxBreakdownLabel}>GST Breakdown:</Text>
                  {cartItems.map((item, index) => {
                    if (item.taxRate && item.taxRate > 0) {
                      const itemTotal = item.price * item.quantity;
                      const cgstAmount = (itemTotal * (item.taxRate / 100)) / 2;
                      const sgstAmount = (itemTotal * (item.taxRate / 100)) / 2;
                      
                      return (
                        <View key={index} style={styles.taxBreakdownRow}>
                          <Text style={styles.taxBreakdownItem}>{item.name}:</Text>
                          <Text style={styles.taxBreakdownText}>
                            CGST ({item.taxRate / 2}%): {formatPrice(cgstAmount)} | 
                            SGST ({item.taxRate / 2}%): {formatPrice(sgstAmount)}
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
              )}
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>CESS:</Text>
                <Text style={styles.totalAmount}>
                  {formatPrice(cartItems.reduce((total, item) => total + calculateItemTotal(item).cessAmount, 0))}
                </Text>
              </View>
              
              {/* CESS Breakdown */}
              {cartItems.some(item => item.cessType && item.cessType !== 'none') && (
                <View style={styles.taxBreakdownContainer}>
                  <Text style={styles.taxBreakdownLabel}>CESS Breakdown:</Text>
                  {cartItems.map((item, index) => {
                    if (item.cessType && item.cessType !== 'none') {
                      const itemTotal = item.price * item.quantity;
                      let cessAmount = 0;
                      let cessDescription = '';
                      
                      if (item.cessType === 'value') {
                        cessAmount = itemTotal * ((item.cessRate || 0) / 100);
                        cessDescription = `Value-based (${item.cessRate}% of ₹${itemTotal.toFixed(2)})`;
                      } else if (item.cessType === 'quantity') {
                        cessAmount = (item.cessAmount || 0) * item.quantity;
                        cessDescription = `Quantity-based (₹${item.cessAmount} × ${item.quantity} units)`;
                      } else if (item.cessType === 'value_and_quantity') {
                        const valueCess = itemTotal * ((item.cessRate || 0) / 100);
                        const quantityCess = (item.cessAmount || 0) * item.quantity;
                        cessAmount = valueCess + quantityCess;
                        cessDescription = `Value + Quantity (${item.cessRate}% + ₹${item.cessAmount} × ${item.quantity})`;
                      }
                      
                      return (
                        <View key={index} style={styles.taxBreakdownRow}>
                          <Text style={styles.taxBreakdownItem}>{item.name}:</Text>
                          <Text style={styles.taxBreakdownText}>
                            {formatPrice(cessAmount)} - {cessDescription}
                          </Text>
                        </View>
                      );
                    }
                    return null;
                  })}
                </View>
              )}
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total:</Text>
                <Text style={styles.grandTotalAmount}>
                  {formatPrice(calculateTotal())}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Section with Continue Button and Search */}
      <View style={styles.bottomContainer}>
        {/* Continue Button */}
        {cartItems.length > 0 && (
          <View style={styles.continueSection}>
            <TouchableOpacity
              style={styles.continueButton}
              onPress={handleContinue}
              activeOpacity={0.8}
            >
              <Text style={styles.continueButtonText}>
                Continue to Customer Details
              </Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Search and Scan */}
        <View style={styles.floatingSearchContainer}>
          <View style={styles.searchContainer}>
            <View style={styles.searchBar}>
              <Search size={20} color={Colors.textLight} />
              <TextInput
                style={styles.searchInput}
                placeholder="Search more products..."
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
      </View>

      {/* Product Edit Modal */}
      {showEditModal && editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onSave={handleSaveProduct}
          onCancel={handleCancelEdit}
          formatPrice={formatPrice}
        />
      )}

      {/* Add New Product Modal */}
      {showAddProductModal && (
        <AddNewProductModal
          onSave={handleSaveNewProduct}
          onCancel={handleCancelAddProduct}
          formatPrice={formatPrice}
        />
      )}
    </SafeAreaView>
  );
}

// Product Edit Modal Component
interface ProductEditModalProps {
  product: CartProduct;
  onSave: (product: CartProduct) => void;
  onCancel: () => void;
  formatPrice: (price: number) => string;
}

interface ProductEditData {
  price: number;
  taxRate: number;
  discountType: 'percentage' | 'amount';
  discountValue: number;
  unitType: 'primary' | 'compound';
  primaryUnit: string;
  secondaryUnit?: string;
  conversionRatio?: number;
  hsnCode: string;
  batchNumber: string;
  cessType: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cessRate?: number;
  cessAmount?: number;
  cessUnit?: string;
}

interface AddNewProductModalProps {
  onSave: (product: CartProduct) => void;
  onCancel: () => void;
  formatPrice: (price: number) => string;
}

function ProductEditModal({ product, onSave, onCancel, formatPrice }: ProductEditModalProps) {
  const [editedProduct, setEditedProduct] = useState<CartProduct>({ ...product });
  const [price, setPrice] = useState(product.price.toString());
  const [taxRate, setTaxRate] = useState((product.taxRate || 0).toString());
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>(product.discountType || 'percentage');
  const [discountValue, setDiscountValue] = useState((product.discountValue || 0).toString());
  
  // Unit of Measurement
  const [unitType, setUnitType] = useState<'primary' | 'compound'>('primary');
  const [primaryUnit, setPrimaryUnit] = useState('Pieces');
  const [secondaryUnit, setSecondaryUnit] = useState('');
  const [conversionRatio, setConversionRatio] = useState('');
  
  // HSN/SAC and Batch Number
  const [hsnCode, setHsnCode] = useState(product.hsnCode || '');
  const [batchNumber, setBatchNumber] = useState(product.batchNumber || '');
  
  // CESS
  const [cessType, setCessType] = useState<'none' | 'value' | 'quantity' | 'value_and_quantity'>('none');
  const [cessRate, setCessRate] = useState('');
  const [cessAmount, setCessAmount] = useState('');
  const [cessUnit, setCessUnit] = useState('');

  const [showCessTypeModal, setShowCessTypeModal] = useState(false);
  const [cessTypeSearch, setCessTypeSearch] = useState('');
  
  // Modals
  const [showPrimaryUnitModal, setShowPrimaryUnitModal] = useState(false);
  const [showSecondaryUnitModal, setShowSecondaryUnitModal] = useState(false);
  const [showCessModal, setShowCessModal] = useState(false);
  const [showGstModal, setShowGstModal] = useState(false);
  const [showCessUnitModal, setShowCessUnitModal] = useState(false);
  
  // Search states
  const [primaryUnitSearch, setPrimaryUnitSearch] = useState('');
  const [secondaryUnitSearch, setSecondaryUnitSearch] = useState('');
  const [cessUnitSearch, setCessUnitSearch] = useState('');
  
  // Custom unit modals
  const [showCustomPrimaryUnitModal, setShowCustomPrimaryUnitModal] = useState(false);
  const [showCustomSecondaryUnitModal, setShowCustomSecondaryUnitModal] = useState(false);
  const [showCustomCessUnitModal, setShowCustomCessUnitModal] = useState(false);
  const [customPrimaryUnit, setCustomPrimaryUnit] = useState('');
  const [customSecondaryUnit, setCustomSecondaryUnit] = useState('');
  const [customCessUnit, setCustomCessUnit] = useState('');

  const handlePrimaryUnitSelect = (unit: string) => {
    setPrimaryUnit(unit);
    setShowPrimaryUnitModal(false);
  };

  const handleSecondaryUnitSelect = (unit: string) => {
    setSecondaryUnit(unit);
    setShowSecondaryUnitModal(false);
  };

  const handleCessUnitSelect = (unit: string) => {
    setCessUnit(unit);
    setShowCessUnitModal(false);
  };



  const handleCessTypeSelect = (type: string) => {
    setCessType(type as 'none' | 'value' | 'quantity' | 'value_and_quantity');
    setShowCessTypeModal(false);
  };

  const handleCustomPrimaryUnit = () => {
    setShowPrimaryUnitModal(false);
    setTimeout(() => setShowCustomPrimaryUnitModal(true), 100);
  };

  const handleCustomSecondaryUnit = () => {
    setShowSecondaryUnitModal(false);
    setTimeout(() => setShowCustomSecondaryUnitModal(true), 100);
  };

  const handleCustomCessUnit = () => {
    setShowCessUnitModal(false);
    setTimeout(() => setShowCustomCessUnitModal(true), 100);
  };

  const handleSaveCustomPrimaryUnit = () => {
    if (customPrimaryUnit.trim()) {
      setPrimaryUnit(customPrimaryUnit.trim());
      setCustomPrimaryUnit('');
      setShowCustomPrimaryUnitModal(false);
    }
  };

  const handleSaveCustomSecondaryUnit = () => {
    if (customSecondaryUnit.trim()) {
      setSecondaryUnit(customSecondaryUnit.trim());
      setCustomSecondaryUnit('');
      setShowCustomSecondaryUnitModal(false);
    }
  };

  const handleSaveCustomCessUnit = () => {
    if (customCessUnit.trim()) {
      setCessUnit(customCessUnit.trim());
      setCustomCessUnit('');
      setShowCustomCessUnitModal(false);
    }
  };

  const handleSave = () => {
    const updatedProduct = {
      ...editedProduct,
      price: parseFloat(price) || 0,
      taxRate: parseFloat(taxRate) || 0,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      // Include HSN/SAC and Batch data
      hsnCode,
      batchNumber,
      // Include Unit data
      primaryUnit,
      // Include CESS data
      cessType,
      cessRate: parseFloat(cessRate) || 0,
      cessAmount: parseFloat(cessAmount) || 0,
      cessUnit,
    };
    onSave(updatedProduct);
  };

  const calculatePreview = () => {
    const basePrice = (parseFloat(price) || 0) * editedProduct.quantity;
    let finalPrice = basePrice;
    
    // Apply discount
    if (parseFloat(discountValue) > 0) {
      if (discountType === 'percentage') {
        finalPrice = basePrice * (1 - parseFloat(discountValue) / 100);
      } else {
        finalPrice = basePrice - parseFloat(discountValue);
      }
    }
    
    // Apply tax
    const taxAmount = finalPrice * (parseFloat(taxRate) / 100);
    
    // Calculate CESS
    let calculatedCessAmount = 0;
    if (cessType && cessType !== 'none') {
      if (cessType === 'value') {
        // Value-based CESS (percentage of base price)
        calculatedCessAmount = finalPrice * ((parseFloat(cessRate) || 0) / 100);
      } else if (cessType === 'quantity') {
        // Quantity-based CESS (fixed amount per unit)
        calculatedCessAmount = (parseFloat(cessAmount) || 0) * editedProduct.quantity;
      } else if (cessType === 'value_and_quantity') {
        // Both value and quantity CESS
        const valueCess = finalPrice * ((parseFloat(cessRate) || 0) / 100);
        const quantityCess = (parseFloat(cessAmount) || 0) * editedProduct.quantity;
        calculatedCessAmount = valueCess + quantityCess;
      }
    }
    
    const total = finalPrice + taxAmount + calculatedCessAmount;
    
    return {
      basePrice,
      discountAmount: parseFloat(discountValue) > 0 
        ? (discountType === 'percentage' 
          ? (basePrice * parseFloat(discountValue) / 100)
          : parseFloat(discountValue))
        : 0,
      taxAmount,
      cessAmount: calculatedCessAmount,
      total
    };
  };

  const preview = calculatePreview();

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Product</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

                                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        {/* Product Info */}
                        <View style={styles.productInfoSection}>
                          <Image source={{ uri: product.image }} style={styles.modalProductImage} />
                          <View style={styles.modalProductDetails}>
                            <Text style={styles.modalProductName}>{product.name}</Text>
                            <Text style={styles.modalProductCategory}>{product.category}</Text>
                            {product.barcode && (
                              <Text style={styles.modalProductBarcode}>Barcode: {product.barcode}</Text>
                            )}
                          </View>
                        </View>

                        {/* Unit of Measurement */}
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>Unit of Measurement</Text>
                          
                          {/* Unit Type Toggle */}
                          <View style={styles.unitTypeContainer}>
                            <TouchableOpacity
                              style={[
                                styles.unitTypeButton,
                                unitType === 'primary' && styles.activeUnitTypeButton
                              ]}
                              onPress={() => setUnitType('primary')}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.unitTypeText,
                                unitType === 'primary' && styles.activeUnitTypeText
                              ]}>
                                Primary
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.unitTypeButton,
                                unitType === 'compound' && styles.activeUnitTypeButton
                              ]}
                              onPress={() => setUnitType('compound')}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.unitTypeText,
                                unitType === 'compound' && styles.activeUnitTypeText
                              ]}>
                                Compound
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* Primary Unit */}
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Primary Unit</Text>
                            <TouchableOpacity
                              style={styles.dropdownButton}
                              onPress={() => setShowPrimaryUnitModal(true)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.dropdownButtonText}>{primaryUnit}</Text>
                              <ChevronDown size={16} color={Colors.textLight} />
                            </TouchableOpacity>
                          </View>

                          {/* Secondary Unit (for compound) */}
                          {unitType === 'compound' && (
                            <>
                              <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Secondary Unit</Text>
                                <TouchableOpacity
                                  style={styles.dropdownButton}
                                  onPress={() => setShowSecondaryUnitModal(true)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.dropdownButtonText}>{secondaryUnit || 'Select Unit'}</Text>
                                  <ChevronDown size={16} color={Colors.textLight} />
                                </TouchableOpacity>
                              </View>

                              <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Conversion Relationship</Text>
                                <View style={styles.conversionContainer}>
                                  <View style={styles.conversionLeft}>
                                    <Text style={styles.conversionLabel}>1</Text>
                                    <Text style={styles.conversionUnit}>{primaryUnit}</Text>
                                  </View>
                                  <View style={styles.conversionEquals}>
                                    <Text style={styles.conversionEqualsText}>=</Text>
                                  </View>
                                  <View style={styles.conversionRight}>
                                    <TextInput
                                      style={styles.conversionInput}
                                      value={conversionRatio}
                                      onChangeText={setConversionRatio}
                                      placeholder="0"
                                      placeholderTextColor={Colors.textLight}
                                      keyboardType="decimal-pad"
                                    />
                                    <Text style={styles.conversionUnit}>{secondaryUnit}</Text>
                                  </View>
                                </View>
                              </View>
                            </>
                          )}
                        </View>

                        {/* GST Rate Selection */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>GST Rate</Text>
                          <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => setShowGstModal(true)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.dropdownButtonText}>
                              {gstRates.find(rate => rate.value === parseFloat(taxRate))?.label || 'Select GST Rate'}
                            </Text>
                            <ChevronDown size={16} color={Colors.textLight} />
                          </TouchableOpacity>
                        </View>

                        {/* Price Input */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Price (₹)</Text>
                          <TextInput
                            style={styles.input}
                            value={price}
                            onChangeText={setPrice}
                            placeholder="0.00"
                            placeholderTextColor={Colors.textLight}
                            keyboardType="decimal-pad"
                          />
                        </View>

                        {/* HSN/SAC Code Input */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>HSN/SAC Code (8 digits)</Text>
                          <TextInput
                            style={styles.input}
                            value={hsnCode}
                            onChangeText={(text) => {
                              // Limit to 8 numeric characters
                              const numericOnly = text.replace(/[^0-9]/g, '');
                              if (numericOnly.length <= 8) {
                                setHsnCode(numericOnly);
                              }
                            }}
                            placeholder="12345678"
                            placeholderTextColor={Colors.textLight}
                            keyboardType="numeric"
                            maxLength={8}
                          />
                        </View>

                        {/* Batch Number Input */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Batch Number</Text>
                          <TextInput
                            style={styles.input}
                            value={batchNumber}
                            onChangeText={setBatchNumber}
                            placeholder="Enter batch number"
                            placeholderTextColor={Colors.textLight}
                            keyboardType="default"
                            autoCorrect={false}
                            autoCapitalize="none"
                            spellCheck={false}
                          />
                        </View>

                        {/* CESS Section */}
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>CESS</Text>
                          
                          {/* CESS Type Selection */}
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>CESS Type</Text>
                            <TouchableOpacity
                              style={styles.dropdownButton}
                              onPress={() => setShowCessTypeModal(true)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.dropdownButtonText}>
                                {cessTypes.find(type => type.value === cessType)?.label || 'Select CESS type'}
                              </Text>
                              <ChevronDown size={20} color={Colors.textLight} />
                            </TouchableOpacity>
                          </View>



                          {/* CESS Rate (%) - Show for 'value' and 'value_and_quantity' */}
                          {(cessType === 'value' || cessType === 'value_and_quantity') && (
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>CESS Rate (%)</Text>
                              <TextInput
                                style={styles.input}
                                value={cessRate}
                                onChangeText={setCessRate}
                                placeholder="0"
                                placeholderTextColor={Colors.textLight}
                                keyboardType="numeric"
                              />
                            </View>
                          )}

                          {/* CESS Amount (₹ per unit) - Show for 'quantity' and 'value_and_quantity' */}
                          {(cessType === 'quantity' || cessType === 'value_and_quantity') && (
                            <>
                              <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>CESS Amount (₹ per unit)</Text>
                                <TextInput
                                  style={styles.input}
                                  value={cessAmount}
                                  onChangeText={setCessAmount}
                                  placeholder="0.00"
                                  placeholderTextColor={Colors.textLight}
                                  keyboardType="decimal-pad"
                                />
                              </View>
                              
                              <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>CESS Unit</Text>
                                <TouchableOpacity
                                  style={styles.dropdownButton}
                                  onPress={() => setShowCessUnitModal(true)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.dropdownButtonText}>
                                    {cessUnit || 'Select unit'}
                                  </Text>
                                  <ChevronDown size={16} color={Colors.textLight} />
                                </TouchableOpacity>
                              </View>
                            </>
                          )}
                        </View>

                        {/* Discount Section */}
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>Discount</Text>

                          {/* Discount Type Toggle */}
                          <View style={styles.discountTypeContainer}>
                            <TouchableOpacity
                              style={[
                                styles.discountTypeButton,
                                discountType === 'percentage' && styles.activeDiscountTypeButton
                              ]}
                              onPress={() => setDiscountType('percentage')}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.discountTypeText,
                                discountType === 'percentage' && styles.activeDiscountTypeText
                              ]}>
                                %
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.discountTypeButton,
                                discountType === 'amount' && styles.activeDiscountTypeButton
                              ]}
                              onPress={() => setDiscountType('amount')}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.discountTypeText,
                                discountType === 'amount' && styles.activeDiscountTypeText
                              ]}>
                                ₹
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* Discount Value Input */}
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                              Discount {discountType === 'percentage' ? '(%)' : '(₹)'}
                            </Text>
                            <TextInput
                              style={styles.input}
                              value={discountValue}
                              onChangeText={setDiscountValue}
                              placeholder={discountType === 'percentage' ? '0' : '0.00'}
                              placeholderTextColor={Colors.textLight}
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>

                        {/* Price Preview */}
                        <View style={styles.previewSection}>
                          <Text style={styles.previewTitle}>Price Breakdown</Text>
                          <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Base Price:</Text>
                            <Text style={styles.previewValue}>{formatPrice(preview.basePrice)}</Text>
                          </View>
                          {preview.discountAmount > 0 && (
                            <View style={styles.previewRow}>
                              <Text style={styles.previewLabel}>Discount:</Text>
                              <Text style={styles.previewValue}>-{formatPrice(preview.discountAmount)}</Text>
                            </View>
                          )}
                          {parseFloat(taxRate) > 0 && (
                            <View style={styles.previewRow}>
                              <Text style={styles.previewLabel}>Tax ({taxRate}%):</Text>
                              <Text style={styles.previewValue}>{formatPrice(preview.taxAmount)}</Text>
                            </View>
                          )}
                          <View style={[styles.previewRow, styles.totalPreviewRow]}>
                            <Text style={styles.totalPreviewLabel}>Total:</Text>
                            <Text style={styles.totalPreviewValue}>{formatPrice(preview.total)}</Text>
                          </View>
                        </View>
                      </ScrollView>

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
                     </View>
         </View>
       </View>

       {/* Primary Unit Selection Modal */}
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
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search units..."
                 placeholderTextColor={Colors.textLight}
                 value={primaryUnitSearch}
                 onChangeText={setPrimaryUnitSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Add Custom Unit Option */}
               <TouchableOpacity
                 style={styles.addCustomOption}
                 onPress={handleCustomPrimaryUnit}
                 activeOpacity={0.7}
               >
                 <Plus size={16} color={Colors.primary} />
                 <Text style={styles.addCustomText}>Add Custom Unit</Text>
               </TouchableOpacity>
               
               {/* Filtered Units */}
               {primaryUnits
                 .filter(unit => 
                   unit.toLowerCase().includes(primaryUnitSearch.toLowerCase())
                 )
                 .map((unit) => (
                   <TouchableOpacity
                     key={unit}
                     style={[
                       styles.optionItem,
                       primaryUnit === unit && styles.selectedOption
                     ]}
                     onPress={() => handlePrimaryUnitSelect(unit)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       primaryUnit === unit && styles.selectedOptionText
                     ]}>
                       {unit}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* Secondary Unit Selection Modal */}
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
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search units..."
                 placeholderTextColor={Colors.textLight}
                 value={secondaryUnitSearch}
                 onChangeText={setSecondaryUnitSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Add Custom Unit Option */}
               <TouchableOpacity
                 style={styles.addCustomOption}
                 onPress={handleCustomSecondaryUnit}
                 activeOpacity={0.7}
               >
                 <Plus size={16} color={Colors.primary} />
                 <Text style={styles.addCustomText}>Add Custom Unit</Text>
               </TouchableOpacity>
               
               {/* Filtered Units */}
               {secondaryUnits
                 .filter(unit => 
                   unit.toLowerCase().includes(secondaryUnitSearch.toLowerCase())
                 )
                 .map((unit) => (
                   <TouchableOpacity
                     key={unit}
                     style={[
                       styles.optionItem,
                       secondaryUnit === unit && styles.selectedOption
                     ]}
                     onPress={() => handleSecondaryUnitSelect(unit)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       secondaryUnit === unit && styles.selectedOptionText
                     ]}>
                       {unit}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* CESS Unit Selection Modal */}
       <Modal
         visible={showCessUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCessUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select CESS Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCessUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search units..."
                 placeholderTextColor={Colors.textLight}
                 value={cessUnitSearch}
                 onChangeText={setCessUnitSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Add Custom Unit Option */}
               <TouchableOpacity
                 style={styles.addCustomOption}
                 onPress={handleCustomCessUnit}
                 activeOpacity={0.7}
               >
                 <Plus size={16} color={Colors.primary} />
                 <Text style={styles.addCustomText}>Add Custom Unit</Text>
               </TouchableOpacity>
               
               {/* Filtered Units - Only show selected primary/secondary units */}
               {[primaryUnit, secondaryUnit]
                 .filter(unit => unit && unit !== 'None')
                 .filter(unit => 
                   unit.toLowerCase().includes(cessUnitSearch.toLowerCase())
                 )
                 .map((unit) => (
                   <TouchableOpacity
                     key={unit}
                     style={[
                       styles.optionItem,
                       cessUnit === unit && styles.selectedOption
                     ]}
                     onPress={() => handleCessUnitSelect(unit)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       cessUnit === unit && styles.selectedOptionText
                     ]}>
                       {unit}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* GST Rate Selection Modal */}
       <Modal
         visible={showGstModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowGstModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select GST Rate</Text>
               <TouchableOpacity
                 onPress={() => setShowGstModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {gstRates.map((rate) => (
                 <TouchableOpacity
                   key={rate.value}
                   style={[
                     styles.optionItem,
                     parseFloat(taxRate) === rate.value && styles.selectedOption
                   ]}
                   onPress={() => {
                     setTaxRate(rate.value.toString());
                     setShowGstModal(false);
                   }}
                   activeOpacity={0.7}
                 >
                   <Text style={[
                     styles.optionText,
                     parseFloat(taxRate) === rate.value && styles.selectedOptionText
                   ]}>
                     {rate.label}
                   </Text>
                 </TouchableOpacity>
               ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* Custom Primary Unit Modal */}
       <Modal
         visible={showCustomPrimaryUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCustomPrimaryUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Add Custom Primary Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCustomPrimaryUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Custom Unit Name</Text>
                 <TextInput
                   style={styles.input}
                   value={customPrimaryUnit}
                   onChangeText={setCustomPrimaryUnit}
                   placeholder="Enter custom unit name"
                   placeholderTextColor={Colors.textLight}
                   autoFocus={true}
                 />
               </View>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowCustomPrimaryUnitModal(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleSaveCustomPrimaryUnit}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>

       {/* Custom Secondary Unit Modal */}
       <Modal
         visible={showCustomSecondaryUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCustomSecondaryUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Add Custom Secondary Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCustomSecondaryUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Custom Unit Name</Text>
                 <TextInput
                   style={styles.input}
                   value={customSecondaryUnit}
                   onChangeText={setCustomSecondaryUnit}
                   placeholder="Enter custom unit name"
                   placeholderTextColor={Colors.textLight}
                   autoFocus={true}
                 />
               </View>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowCustomSecondaryUnitModal(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleSaveCustomSecondaryUnit}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>

       {/* Custom CESS Unit Modal */}
       <Modal
         visible={showCustomCessUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCustomCessUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Add Custom CESS Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCustomCessUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Custom Unit Name</Text>
                 <TextInput
                   style={styles.input}
                   value={customCessUnit}
                   onChangeText={setCustomCessUnit}
                   placeholder="Enter custom unit name"
                   placeholderTextColor={Colors.textLight}
                   autoFocus={true}
                 />
               </View>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowCustomCessUnitModal(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleSaveCustomCessUnit}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>

       {/* CESS Type Modal */}
       <Modal
         visible={showCessTypeModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCessTypeModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select CESS Type</Text>
               <TouchableOpacity
                 onPress={() => setShowCessTypeModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search CESS types..."
                 placeholderTextColor={Colors.textLight}
                 value={cessTypeSearch}
                 onChangeText={setCessTypeSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Filtered CESS Types */}
               {cessTypes
                 .filter(type => 
                   type.label.toLowerCase().includes(cessTypeSearch.toLowerCase())
                 )
                 .map((type) => (
                   <TouchableOpacity
                     key={type.value}
                     style={[
                       styles.optionItem,
                       cessType === type.value && styles.selectedOption
                     ]}
                     onPress={() => handleCessTypeSelect(type.value)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       cessType === type.value && styles.selectedOptionText
                     ]}>
                       {type.label}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>


     </Modal>
   );
 }

 function AddNewProductModal({ onSave, onCancel, formatPrice }: AddNewProductModalProps) {
   const [productName, setProductName] = useState('');
   const [productCategory, setProductCategory] = useState('');
   const [productImages, setProductImages] = useState<string[]>([]);
     const [hsnCode, setHsnCode] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [barcode, setBarcode] = useState('');
   const [price, setPrice] = useState('');
   const [taxRate, setTaxRate] = useState('0');
   const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
   const [discountValue, setDiscountValue] = useState('');
   
   // Unit of Measurement
   const [unitType, setUnitType] = useState<'primary' | 'compound'>('primary');
   const [primaryUnit, setPrimaryUnit] = useState('Piece');
   const [secondaryUnit, setSecondaryUnit] = useState('');
   const [conversionRatio, setConversionRatio] = useState('');
   
   // CESS
   const [cessType, setCessType] = useState<'none' | 'value' | 'quantity' | 'value_and_quantity'>('none');
   const [cessRate, setCessRate] = useState('');
   const [cessAmount, setCessAmount] = useState('');
   const [cessUnit, setCessUnit] = useState('');
   
   // Modals
   const [showPrimaryUnitModal, setShowPrimaryUnitModal] = useState(false);
   const [showSecondaryUnitModal, setShowSecondaryUnitModal] = useState(false);
   const [showCessModal, setShowCessModal] = useState(false);
   const [showGstModal, setShowGstModal] = useState(false);
   const [showCessUnitModal, setShowCessUnitModal] = useState(false);
   const [showCessTypeModal, setShowCessTypeModal] = useState(false);
   const [cessTypeSearch, setCessTypeSearch] = useState('');
   
   // Search states
   const [primaryUnitSearch, setPrimaryUnitSearch] = useState('');
   const [secondaryUnitSearch, setSecondaryUnitSearch] = useState('');
   const [cessUnitSearch, setCessUnitSearch] = useState('');
   
   // Custom unit modals
   const [showCustomPrimaryUnitModal, setShowCustomPrimaryUnitModal] = useState(false);
   const [showCustomSecondaryUnitModal, setShowCustomSecondaryUnitModal] = useState(false);
   const [showCustomCessUnitModal, setShowCustomCessUnitModal] = useState(false);
   const [customPrimaryUnit, setCustomPrimaryUnit] = useState('');
   const [customSecondaryUnit, setCustomSecondaryUnit] = useState('');
   const [customCessUnit, setCustomCessUnit] = useState('');
   
   // Barcode scanning
   const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

   const handlePrimaryUnitSelect = (unit: string) => {
     setPrimaryUnit(unit);
     setShowPrimaryUnitModal(false);
   };

   const handleSecondaryUnitSelect = (unit: string) => {
     setSecondaryUnit(unit);
     setShowSecondaryUnitModal(false);
   };

   const handleCessUnitSelect = (unit: string) => {
     setCessUnit(unit);
     setShowCessUnitModal(false);
   };

   const handleCessTypeSelect = (type: string) => {
     setCessType(type as 'none' | 'value' | 'quantity' | 'value_and_quantity');
     setShowCessTypeModal(false);
   };

   const handleCustomPrimaryUnit = () => {
     setShowPrimaryUnitModal(false);
     setTimeout(() => setShowCustomPrimaryUnitModal(true), 100);
   };

   const handleCustomSecondaryUnit = () => {
     setShowSecondaryUnitModal(false);
     setTimeout(() => setShowCustomSecondaryUnitModal(true), 100);
   };

   const handleCustomCessUnit = () => {
     setShowCessUnitModal(false);
     setTimeout(() => setShowCustomCessUnitModal(true), 100);
   };

   const handleSaveCustomPrimaryUnit = () => {
     if (customPrimaryUnit.trim()) {
       setPrimaryUnit(customPrimaryUnit.trim());
       setCustomPrimaryUnit('');
       setShowCustomPrimaryUnitModal(false);
     }
   };

   const handleSaveCustomSecondaryUnit = () => {
     if (customSecondaryUnit.trim()) {
       setSecondaryUnit(customSecondaryUnit.trim());
       setCustomSecondaryUnit('');
       setShowCustomSecondaryUnitModal(false);
     }
   };

   const handleSaveCustomCessUnit = () => {
     if (customCessUnit.trim()) {
       setCessUnit(customCessUnit.trim());
       setCustomCessUnit('');
       setShowCustomCessUnitModal(false);
     }
   };

   const handleBarcodeScan = (scannedBarcode: string) => {
     setBarcode(scannedBarcode);
     setShowBarcodeScanner(false);
   };

   const handleManualBarcode = () => {
     setShowBarcodeScanner(false);
   };

   const handleProductImageSelect = () => {
     // For now, we'll use a placeholder image
     // In a real app, this would open image picker
     const newImage = `https://via.placeholder.com/60x60/3f66ac/ffffff?text=Product${productImages.length + 1}`;
     setProductImages([...productImages, newImage]);
   };

   const handleSave = () => {
     if (!productName.trim() || !price.trim()) {
       showError('Please enter product name and price', 'Error');
       return;
     }

     const newProduct: CartProduct = {
       id: Date.now().toString(),
       name: productName.trim(),
       price: parseFloat(price),
       image: productImages.length > 0 ? productImages[0] : 'https://via.placeholder.com/60x60',
       category: productCategory.trim() || 'General',
       quantity: 1,
       barcode: barcode.trim() || undefined,
       taxRate: parseFloat(taxRate) || 0,
       discountType,
       discountValue: parseFloat(discountValue) || 0,
       brand: '',
       originalPrice: parseFloat(price),
       // Include HSN/SAC and Batch data
       hsnCode: hsnCode.trim() || undefined,
       batchNumber: batchNumber.trim() || undefined,
       // Include Unit data
       primaryUnit: primaryUnit || 'Piece',
       // Include CESS data
       cessType,
       cessRate: parseFloat(cessRate) || 0,
       cessAmount: parseFloat(cessAmount) || 0,
       cessUnit,
     };

     onSave(newProduct);
   };

   const calculatePreview = () => {
     const basePrice = parseFloat(price) || 0;
     let finalPrice = basePrice;
     
     // Apply discount
     if (parseFloat(discountValue) > 0) {
       if (discountType === 'percentage') {
         finalPrice = basePrice * (1 - parseFloat(discountValue) / 100);
       } else {
         finalPrice = basePrice - parseFloat(discountValue);
       }
     }
     
     // Apply tax
     const taxRateValue = parseFloat(taxRate) || 0;
     const taxAmount = finalPrice * (taxRateValue / 100);
     
     // Calculate CESS
     let calculatedCessAmount = 0;
     if (cessType && cessType !== 'none') {
       if (cessType === 'value') {
         // Value-based CESS (percentage of base price)
         calculatedCessAmount = finalPrice * ((parseFloat(cessRate) || 0) / 100);
       } else if (cessType === 'quantity') {
         // Quantity-based CESS (fixed amount per unit)
         calculatedCessAmount = (parseFloat(cessAmount) || 0) * 1; // For preview, quantity is 1
       } else if (cessType === 'value_and_quantity') {
         // Both value and quantity CESS
         const valueCess = finalPrice * ((parseFloat(cessRate) || 0) / 100);
         const quantityCess = (parseFloat(cessAmount) || 0) * 1; // For preview, quantity is 1
         calculatedCessAmount = valueCess + quantityCess;
       }
     }
     
     return {
       basePrice,
       discountAmount: parseFloat(discountValue) > 0
         ? (discountType === 'percentage'
           ? (basePrice * parseFloat(discountValue) / 100)
           : parseFloat(discountValue))
         : 0,
       taxAmount: taxAmount,
       cessAmount: calculatedCessAmount,
       finalPrice: finalPrice + taxAmount + calculatedCessAmount
     };
   };

   return (
     <Modal
       visible={true}
       transparent={true}
       animationType="slide"
       onRequestClose={onCancel}
     >
       <View style={styles.modalOverlay}>
         <View style={styles.modalContainer}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Add New Product</Text>
             <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
               <Text style={styles.modalCloseText}>✕</Text>
             </TouchableOpacity>
           </View>

           <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={{flexGrow: 1}}>
             {/* Product Info */}
             <View style={styles.productInfoSection}>
               <Image
                 source={{ uri: productImages.length > 0 ? productImages[0] : 'https://via.placeholder.com/60x60' }}
                 style={styles.modalProductImage}
               />
               <View style={styles.modalProductDetails}>
                 <Text style={styles.modalProductName}>New Product</Text>
                 <Text style={styles.modalProductCategory}>General</Text>
                 <Text style={styles.modalProductBarcode}>No barcode</Text>
               </View>
             </View>

             {/* Product Photo Selection */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Product Photos</Text>
               <TouchableOpacity
                 style={styles.productImageButton}
                 onPress={handleProductImageSelect}
                 activeOpacity={0.7}
               >
                 <Plus size={20} color={Colors.primary} />
                 <Text style={styles.productImageButtonText}>Add Product Photo</Text>
               </TouchableOpacity>
               {productImages.length > 0 && (
                 <View style={styles.productImagesGrid}>
                   {productImages.map((image, index) => (
                     <View key={index} style={styles.productImageCard}>
                       <Image
                         source={{ uri: image }}
                         style={styles.productImageSquare}
                       />
                       <TouchableOpacity
                         style={styles.removeImageButton}
                         onPress={() => {
                           const newImages = productImages.filter((_, i) => i !== index);
                           setProductImages(newImages);
                         }}
                         activeOpacity={0.7}
                       >
                         <X size={16} color={Colors.background} />
                       </TouchableOpacity>
                     </View>
                   ))}
                 </View>
               )}
             </View>

             {/* Product Name Input */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Product Name *</Text>
               <TextInput
                 style={styles.input}
                 value={productName}
                 onChangeText={setProductName}
                 placeholder="Enter product name"
                 placeholderTextColor={Colors.textLight}
               />
             </View>

             {/* Product Category Input */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Category</Text>
               <TextInput
                 style={styles.input}
                 value={productCategory}
                 onChangeText={setProductCategory}
                 placeholder="Enter category"
                 placeholderTextColor={Colors.textLight}
               />
             </View>

             {/* HSN/SAC Code Input */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>HSN/SAC Code (8 digits)</Text>
               <TextInput
                 style={styles.input}
                 value={hsnCode}
                 onChangeText={(text) => {
                   // Limit to 8 numeric characters
                   const numericOnly = text.replace(/[^0-9]/g, '');
                   if (numericOnly.length <= 8) {
                     setHsnCode(numericOnly);
                   }
                 }}
                 placeholder="12345678"
                 placeholderTextColor={Colors.textLight}
                 keyboardType="numeric"
                 maxLength={8}
               />
             </View>

             {/* Batch Number Input */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Batch Number</Text>
               <TextInput
                 style={styles.input}
                 value={batchNumber}
                 onChangeText={setBatchNumber}
                 placeholder="Enter batch number"
                 placeholderTextColor={Colors.textLight}
                 keyboardType="default"
                 autoCorrect={false}
                 autoCapitalize="none"
                 spellCheck={false}
               />
               </View>

               {/* Barcode Input */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Barcode</Text>
               <View style={styles.barcodeInputContainer}>
                 <TextInput
                   style={styles.barcodeInput}
                   value={barcode}
                   onChangeText={setBarcode}
                   placeholder="Enter barcode or scan"
                   placeholderTextColor={Colors.textLight}
                   keyboardType="numeric"
                 />
                 <TouchableOpacity
                   style={styles.scanButton}
                   onPress={() => setShowBarcodeScanner(true)}
                   activeOpacity={0.7}
                 >
                   <Scan size={20} color={Colors.background} />
                 </TouchableOpacity>
               </View>
             </View>

             {/* Unit of Measurement */}
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Unit of Measurement</Text>
               
               {/* Unit Type Toggle */}
               <View style={styles.unitTypeContainer}>
                 <TouchableOpacity
                   style={[
                     styles.unitTypeButton,
                     unitType === 'primary' && styles.activeUnitTypeButton
                   ]}
                   onPress={() => setUnitType('primary')}
                   activeOpacity={0.7}
                 >
                   <Text style={[
                     styles.unitTypeText,
                     unitType === 'primary' && styles.activeUnitTypeText
                   ]}>
                     Primary
                   </Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                   style={[
                     styles.unitTypeButton,
                     unitType === 'compound' && styles.activeUnitTypeButton
                   ]}
                   onPress={() => setUnitType('compound')}
                   activeOpacity={0.7}
                 >
                   <Text style={[
                     styles.unitTypeText,
                     unitType === 'compound' && styles.activeUnitTypeText
                   ]}>
                     Compound
                   </Text>
                 </TouchableOpacity>
               </View>

               {/* Primary Unit Selection */}
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Primary Unit</Text>
                 <TouchableOpacity
                   style={styles.dropdownButton}
                   onPress={() => setShowPrimaryUnitModal(true)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.dropdownButtonText}>
                     {primaryUnit || 'Select primary unit'}
                   </Text>
                   <ChevronDown size={20} color={Colors.textLight} />
                 </TouchableOpacity>
               </View>

               {/* Secondary Unit Selection */}
               {unitType === 'compound' && (
                 <>
                   <View style={styles.inputGroup}>
                     <Text style={styles.inputLabel}>Secondary Unit</Text>
                     <TouchableOpacity
                       style={styles.dropdownButton}
                       onPress={() => setShowSecondaryUnitModal(true)}
                       activeOpacity={0.7}
                     >
                       <Text style={styles.dropdownButtonText}>
                         {secondaryUnit || 'Select secondary unit'}
                       </Text>
                       <ChevronDown size={20} color={Colors.textLight} />
                     </TouchableOpacity>
                   </View>

                   <View style={styles.inputGroup}>
                     <Text style={styles.inputLabel}>Conversion Relationship</Text>
                     <View style={styles.conversionContainer}>
                       <View style={styles.conversionLeft}>
                         <Text style={styles.conversionLabel}>1</Text>
                         <Text style={styles.conversionUnit}>{primaryUnit}</Text>
                       </View>
                       <View style={styles.conversionEquals}>
                         <Text style={styles.conversionEqualsText}>=</Text>
                       </View>
                       <View style={styles.conversionRight}>
                         <TextInput
                           style={styles.conversionInput}
                           value={conversionRatio}
                           onChangeText={setConversionRatio}
                           placeholder="0"
                           placeholderTextColor={Colors.textLight}
                           keyboardType="decimal-pad"
                         />
                         <Text style={styles.conversionUnit}>{secondaryUnit}</Text>
                       </View>
                     </View>
                   </View>
                 </>
               )}
             </View>

             {/* GST Rate Selection */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>GST Rate</Text>
               <TouchableOpacity
                 style={styles.dropdownButton}
                 onPress={() => setShowGstModal(true)}
                 activeOpacity={0.7}
               >
                 <Text style={styles.dropdownButtonText}>
                   {gstRates.find(rate => rate.value === parseFloat(taxRate))?.label || 'Select GST Rate'}
                 </Text>
                 <ChevronDown size={20} color={Colors.textLight} />
               </TouchableOpacity>
             </View>

             {/* Price Input */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Price (₹) *</Text>
               <TextInput
                 style={styles.input}
                 value={price}
                 onChangeText={setPrice}
                 placeholder="0.00"
                 placeholderTextColor={Colors.textLight}
                 keyboardType="decimal-pad"
               />
             </View>

             {/* CESS Section */}
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>CESS</Text>
               
               {/* CESS Type Selection */}
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>CESS Type</Text>
                 <TouchableOpacity
                   style={styles.dropdownButton}
                   onPress={() => setShowCessTypeModal(true)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.dropdownButtonText}>
                     {cessTypes.find(type => type.value === cessType)?.label || 'Select CESS type'}
                   </Text>
                   <ChevronDown size={20} color={Colors.textLight} />
                 </TouchableOpacity>
               </View>

               {/* CESS Rate (%) - Show for 'value' and 'value_and_quantity' */}
               {(cessType === 'value' || cessType === 'value_and_quantity') && (
                 <View style={styles.inputGroup}>
                   <Text style={styles.inputLabel}>CESS Rate (%)</Text>
                   <TextInput
                     style={styles.input}
                     value={cessRate}
                     onChangeText={setCessRate}
                     placeholder="0"
                     placeholderTextColor={Colors.textLight}
                     keyboardType="numeric"
                   />
                 </View>
               )}

               {/* CESS Amount (₹ per unit) - Show for 'quantity' and 'value_and_quantity' */}
               {(cessType === 'quantity' || cessType === 'value_and_quantity') && (
                 <>
                   <View style={styles.inputGroup}>
                     <Text style={styles.inputLabel}>CESS Amount (₹ per unit)</Text>
                     <TextInput
                       style={styles.input}
                       value={cessAmount}
                       onChangeText={setCessAmount}
                       placeholder="0.00"
                       placeholderTextColor={Colors.textLight}
                       keyboardType="decimal-pad"
                     />
                   </View>
                   
                   <View style={styles.inputGroup}>
                     <Text style={styles.inputLabel}>CESS Unit</Text>
                     <TouchableOpacity
                       style={styles.dropdownButton}
                       onPress={() => setShowCessUnitModal(true)}
                       activeOpacity={0.7}
                     >
                       <Text style={styles.dropdownButtonText}>
                         {cessUnit || 'Select unit'}
                       </Text>
                       <ChevronDown size={16} color={Colors.textLight} />
                     </TouchableOpacity>
                   </View>
                 </>
               )}
             </View>

             {/* Discount Section */}
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Discount</Text>
               
               {/* Discount Type Toggle */}
               <View style={styles.discountTypeContainer}>
                 <TouchableOpacity
                   style={[
                     styles.discountTypeButton,
                     discountType === 'percentage' && styles.activeDiscountTypeButton
                   ]}
                   onPress={() => setDiscountType('percentage')}
                   activeOpacity={0.7}
                 >
                   <Text style={[
                     styles.discountTypeText,
                     discountType === 'percentage' && styles.activeDiscountTypeText
                   ]}>%</Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                   style={[
                     styles.discountTypeButton,
                     discountType === 'amount' && styles.activeDiscountTypeButton
                   ]}
                   onPress={() => setDiscountType('amount')}
                   activeOpacity={0.7}
                 >
                   <Text style={[
                     styles.discountTypeText,
                     discountType === 'amount' && styles.activeDiscountTypeText
                   ]}>₹</Text>
                 </TouchableOpacity>
               </View>
               
               {/* Discount Value Input */}
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>
                   Discount {discountType === 'percentage' ? '(%)' : '(₹)'}
                 </Text>
                 <TextInput
                   style={styles.input}
                   value={discountValue}
                   onChangeText={setDiscountValue}
                   placeholder="0"
                   placeholderTextColor={Colors.textLight}
                   keyboardType="decimal-pad"
                 />
               </View>
             </View>

             {/* Price Preview */}
             <View style={styles.previewSection}>
               <Text style={styles.previewTitle}>Price Preview</Text>
               <View style={styles.previewRow}>
                 <Text style={styles.previewLabel}>Base Price:</Text>
                 <Text style={styles.previewValue}>
                   {formatPrice(calculatePreview().basePrice)}
                 </Text>
               </View>
               {calculatePreview().discountAmount > 0 && (
                 <View style={styles.previewRow}>
                   <Text style={styles.previewLabel}>Discount:</Text>
                   <Text style={styles.previewValue}>
                     -{formatPrice(calculatePreview().discountAmount)}
                   </Text>
                 </View>
               )}
               <View style={styles.previewRow}>
                 <Text style={styles.previewLabel}>Tax:</Text>
                 <Text style={styles.previewValue}>
                   {formatPrice(calculatePreview().taxAmount)}
                 </Text>
               </View>
               <View style={[styles.previewRow, styles.totalPreviewRow]}>
                 <Text style={styles.totalPreviewLabel}>Final Price:</Text>
                 <Text style={styles.totalPreviewValue}>
                   {formatPrice(calculatePreview().finalPrice)}
                 </Text>
               </View>
             </View>
           </ScrollView>

           {/* Modal Actions */}
           <View style={styles.modalActions}>
             <TouchableOpacity
               style={styles.cancelButton}
               onPress={onCancel}
               activeOpacity={0.7}
             >
               <Text style={styles.cancelButtonText}>Cancel</Text>
             </TouchableOpacity>
             
             <TouchableOpacity
               style={styles.saveButton}
               onPress={handleSave}
               activeOpacity={0.7}
             >
               <Text style={styles.saveButtonText}>Add This Product to Inventory & Continue</Text>
             </TouchableOpacity>
           </View>
         </View>
       </View>

       {/* Primary Unit Selection Modal */}
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
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search units..."
                 placeholderTextColor={Colors.textLight}
                 value={primaryUnitSearch}
                 onChangeText={setPrimaryUnitSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Add Custom Unit Option */}
               <TouchableOpacity
                 style={styles.addCustomOption}
                 onPress={handleCustomPrimaryUnit}
                 activeOpacity={0.7}
               >
                 <Plus size={16} color={Colors.primary} />
                 <Text style={styles.addCustomText}>Add Custom Unit</Text>
               </TouchableOpacity>
               
               {/* Filtered Units */}
               {primaryUnits
                 .filter(unit => 
                   unit.toLowerCase().includes(primaryUnitSearch.toLowerCase())
                 )
                 .map((unit) => (
                   <TouchableOpacity
                     key={unit}
                     style={[
                       styles.optionItem,
                       primaryUnit === unit && styles.selectedOption
                     ]}
                     onPress={() => handlePrimaryUnitSelect(unit)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       primaryUnit === unit && styles.selectedOptionText
                     ]}>
                       {unit}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* Secondary Unit Selection Modal */}
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
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search units..."
                 placeholderTextColor={Colors.textLight}
                 value={secondaryUnitSearch}
                 onChangeText={setSecondaryUnitSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Add Custom Unit Option */}
               <TouchableOpacity
                 style={styles.addCustomOption}
                 onPress={handleCustomSecondaryUnit}
                 activeOpacity={0.7}
               >
                 <Plus size={16} color={Colors.primary} />
                 <Text style={styles.addCustomText}>Add Custom Unit</Text>
               </TouchableOpacity>
               
               {/* Filtered Units */}
               {secondaryUnits
                 .filter(unit => 
                   unit.toLowerCase().includes(secondaryUnitSearch.toLowerCase())
                 )
                 .map((unit) => (
                   <TouchableOpacity
                     key={unit}
                     style={[
                       styles.optionItem,
                       secondaryUnit === unit && styles.selectedOption
                     ]}
                     onPress={() => handleSecondaryUnitSelect(unit)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       secondaryUnit === unit && styles.selectedOptionText
                     ]}>
                       {unit}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* CESS Unit Selection Modal */}
       <Modal
         visible={showCessUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCessUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select CESS Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCessUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search units..."
                 placeholderTextColor={Colors.textLight}
                 value={cessUnitSearch}
                 onChangeText={setCessUnitSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Add Custom Unit Option */}
               <TouchableOpacity
                 style={styles.addCustomOption}
                 onPress={handleCustomCessUnit}
                 activeOpacity={0.7}
               >
                 <Plus size={16} color={Colors.primary} />
                 <Text style={styles.addCustomText}>Add Custom Unit</Text>
               </TouchableOpacity>
               
               {/* Filtered Units - Only show selected primary/secondary units */}
               {[primaryUnit, secondaryUnit]
                 .filter(unit => unit && unit !== 'None')
                 .filter(unit => 
                   unit.toLowerCase().includes(cessUnitSearch.toLowerCase())
                 )
                 .map((unit) => (
                   <TouchableOpacity
                     key={unit}
                     style={[
                       styles.optionItem,
                       cessUnit === unit && styles.selectedOption
                     ]}
                     onPress={() => handleCessUnitSelect(unit)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       cessUnit === unit && styles.selectedOptionText
                     ]}>
                       {unit}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* CESS Type Modal */}
       <Modal
         visible={showCessTypeModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCessTypeModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select CESS Type</Text>
               <TouchableOpacity
                 onPress={() => setShowCessTypeModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search CESS types..."
                 placeholderTextColor={Colors.textLight}
                 value={cessTypeSearch}
                 onChangeText={setCessTypeSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Filtered CESS Types */}
               {cessTypes
                 .filter(type => 
                   type.label.toLowerCase().includes(cessTypeSearch.toLowerCase())
                 )
                 .map((type) => (
                   <TouchableOpacity
                     key={type.value}
                     style={[
                       styles.optionItem,
                       cessType === type.value && styles.selectedOption
                     ]}
                     onPress={() => handleCessTypeSelect(type.value)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       cessType === type.value && styles.selectedOptionText
                     ]}>
                       {type.label}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* GST Rate Selection Modal */}
       <Modal
         visible={showGstModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowGstModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select GST Rate</Text>
               <TouchableOpacity
                 onPress={() => setShowGstModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {gstRates.map((rate) => (
                 <TouchableOpacity
                   key={rate.value}
                   style={[
                     styles.optionItem,
                     parseFloat(taxRate) === rate.value && styles.selectedOption
                   ]}
                   onPress={() => {
                     setTaxRate(rate.value.toString());
                     setShowGstModal(false);
                   }}
                   activeOpacity={0.7}
                 >
                   <Text style={[
                     styles.optionText,
                     parseFloat(taxRate) === rate.value && styles.selectedOptionText
                   ]}>
                     {rate.label}
                   </Text>
                 </TouchableOpacity>
               ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* Custom Primary Unit Modal */}
       <Modal
         visible={showCustomPrimaryUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCustomPrimaryUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Add Custom Primary Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCustomPrimaryUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Custom Unit Name</Text>
                 <TextInput
                   style={styles.input}
                   value={customPrimaryUnit}
                   onChangeText={setCustomPrimaryUnit}
                   placeholder="Enter custom unit name"
                   placeholderTextColor={Colors.textLight}
                   autoFocus={true}
                 />
               </View>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowCustomPrimaryUnitModal(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleSaveCustomPrimaryUnit}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>

       {/* Custom Secondary Unit Modal */}
       <Modal
         visible={showCustomSecondaryUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCustomSecondaryUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Add Custom Secondary Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCustomSecondaryUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Custom Unit Name</Text>
                 <TextInput
                   style={styles.input}
                   value={customSecondaryUnit}
                   onChangeText={setCustomSecondaryUnit}
                   placeholder="Enter custom unit name"
                   placeholderTextColor={Colors.textLight}
                   autoFocus={true}
                 />
               </View>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowCustomSecondaryUnitModal(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleSaveCustomSecondaryUnit}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>

       {/* Custom CESS Unit Modal */}
       <Modal
         visible={showCustomCessUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCustomCessUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Add Custom CESS Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCustomCessUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Custom Unit Name</Text>
                 <TextInput
                   style={styles.input}
                   value={customCessUnit}
                   onChangeText={setCustomCessUnit}
                   placeholder="Enter custom unit name"
                   placeholderTextColor={Colors.textLight}
                   autoFocus={true}
                 />
               </View>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowCustomCessUnitModal(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleSaveCustomCessUnit}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>

       {/* Barcode Scanner Modal */}
       <Modal
         visible={showBarcodeScanner}
         transparent
         animationType="slide"
         onRequestClose={() => setShowBarcodeScanner(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Scan Barcode</Text>
               <TouchableOpacity
                 onPress={() => setShowBarcodeScanner(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <Text style={styles.inputLabel}>Barcode Scanner</Text>
               <Text style={styles.modalProductBarcode}>
                 Point camera at barcode to scan
               </Text>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowBarcodeScanner(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleManualBarcode}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Manual Input</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>
     </Modal>
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
  itemCount: {
    fontSize: 14,
    color: Colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyCartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCartText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  cartItem: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
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
  cartItemMain: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  cartItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
  },
  discountSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  discountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  discountLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },

  invoiceDiscountInput: {
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    width: 100,
    textAlign: 'center',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  section: {
    marginBottom: 20,
  },
  unitTypeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  unitTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeUnitTypeButton: {
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unitTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeUnitTypeText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  cessTypeContainer: {
    marginBottom: 16,
  },
  cessSubLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  cessTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cessTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  cessTypeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  optionItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  selectedOption: {
    backgroundColor: Colors.primary + '10',
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedOptionText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  addCustomOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    backgroundColor: Colors.grey[50],
  },
  addCustomText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 8,
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
  priceSection: {
    alignItems: 'flex-end',
  },
  productDetails: {
    marginLeft: 60, // Align with product name (image width + margin)
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
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
    marginBottom: 4,
  },
  barcode: {
    fontSize: 11,
    color: Colors.textLight,
    fontFamily: 'monospace',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[100],
    borderRadius: 6,
    paddingHorizontal: 3,
    paddingVertical: 1,
  },
  quantityButton: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantity: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: 6,
    minWidth: 16,
    textAlign: 'center',
  },
  quantityInput: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: 6,
    minWidth: 30,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 4,
    paddingHorizontal: 4,
    paddingVertical: 2,
    backgroundColor: Colors.background,
  },
  floatingTotalContainer: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    marginBottom: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  floatingTotalContent: {
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  floatingTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  floatingTotalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.background,
  },
  gstRateText: {
    fontSize: 10,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  taxBreakdownContainer: {
    marginLeft: 16,
    marginBottom: 8,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: Colors.grey[300],
  },
  taxBreakdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  taxBreakdownRow: {
    marginBottom: 2,
  },
  taxBreakdownItem: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 1,
  },
  taxBreakdownText: {
    fontSize: 10,
    color: Colors.textLight,
    lineHeight: 12,
  },
  itemActions: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: 8,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  removeButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#fef2f2',
    justifyContent: 'center',
    alignItems: 'center',
  },
  totalSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[300],
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  grandTotalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.success,
  },
  bottomContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    gap: 12, // Small gap between continue button and search bar
  },
  continueSection: {
    marginBottom: 0, // No margin since it's in the bottom container
  },
  continueButton: {
    backgroundColor: '#3f66ac',
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
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
  },
  scanButton: {
    width: 48,
    height: 48,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalContent: {
    padding: 20,
  },
  productInfoSection: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  modalProductDetails: {
    flex: 1,
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  modalProductCategory: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 2,
  },
  modalProductBarcode: {
    fontSize: 12,
    color: Colors.textLight,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  discountTypeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
    flex: 1,
  },
  discountTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeDiscountTypeButton: {
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  discountTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeDiscountTypeText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  previewSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  totalPreviewRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 8,
    marginTop: 8,
  },
  totalPreviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalPreviewValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  modalActions: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    gap: 12,
    backgroundColor: Colors.background,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  saveButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
    textAlign: 'center',
  },
  // Cart item action styles
  itemTotals: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  itemBreakdown: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  editButton: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    backgroundColor: Colors.primary,
  },
  editButtonText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.background,
  },
  conversionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  conversionLeft: {
    alignItems: 'center',
    flex: 1,
  },
  conversionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  conversionUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  conversionEquals: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  conversionEqualsText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textLight,
  },
  conversionRight: {
    alignItems: 'center',
    flex: 1,
  },
  conversionInput: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    minWidth: 80,
    marginBottom: 4,
  },
  addNewProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    paddingVertical: 16,
    paddingHorizontal: 20,
    marginHorizontal: 20,
    marginVertical: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderStyle: 'dashed',
  },
  addNewProductText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.primary,
    marginLeft: 8,
  },
  barcodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  barcodeInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  productImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    gap: 8,
  },
  productImageButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  productImagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  productImageThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  productImagePreviewText: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  productImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  productImageCard: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImageSquare: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
});