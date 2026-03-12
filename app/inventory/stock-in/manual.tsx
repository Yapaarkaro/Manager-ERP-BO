import React, { useState, useEffect, useMemo } from 'react';
import { formatIndianNumber, formatCurrencyINR, validateDateDDMMYYYY } from '@/utils/formatters';
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
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';
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
  Ruler,
  ChevronDown,
  ChevronUp,
  Edit,
  MapPin,
  ClipboardList,
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

const INVOICE_FIELD_OPTIONS = [
  { key: 'delivery_note', label: 'Delivery Note', isDate: false },
  { key: 'payment_terms', label: 'Mode/Terms of Payment', isDate: false },
  { key: 'reference_no', label: 'Reference No.', isDate: false },
  { key: 'reference_date', label: 'Date (for Reference No.)', isDate: true },
  { key: 'buyers_order_no', label: "Buyer's Order No.", isDate: false },
  { key: 'buyers_order_date', label: "Date (for Buyer's Order No.)", isDate: true },
  { key: 'dispatch_doc_no', label: 'Dispatch Doc No.', isDate: false },
  { key: 'delivery_note_date', label: 'Delivery Note Date', isDate: true },
  { key: 'dispatched_through', label: 'Dispatched Through', isDate: false },
  { key: 'destination', label: 'Destination', isDate: false },
  { key: 'terms_of_delivery', label: 'Terms of Delivery', isDate: false },
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
  pendingProductData?: any;
}

interface ManualStockInData {
  invoiceNumber: string;
  invoiceDate: string;
  hasEwayBill: boolean;
  ewayBillNumber: string;
  vehicleNumber: string;
  vehicleType: string;
  supplier: {
    id?: string;
    name: string;
    gstin: string;
    businessName: string;
    address: string;
  } | null;
  locationId: string | null;
  locationName: string;
  products: StockInProduct[];
  totalAmount: number;
  discountType: 'percentage' | 'amount';
  discountValue: number;
  applyRoundOff: boolean;
  roundOffAmount: number;
  finalAmount: number;
  notes: string;
  additionalFields?: Record<string, string>;
}

import { getSuppliers, getProducts } from '@/services/backendApi';
import { useBusinessData } from '@/hooks/useBusinessData';

// Bridge to persist form data across navigation (e.g. when creating a new product)
let _savedFormData: ManualStockInData | null = null;
export function saveStockInFormData(data: ManualStockInData) { _savedFormData = data; }
export function popStockInFormData(): ManualStockInData | null {
  const d = _savedFormData;
  _savedFormData = null;
  return d;
}

export default function ManualStockInScreen() {
  const { newProduct: newProductParam, newSupplier: newSupplierParam } = useLocalSearchParams();
  const { data: businessData } = useBusinessData();

  const restoredData = useMemo(() => popStockInFormData(), []);
  const [formData, setFormData] = useState<ManualStockInData>(restoredData || {
    invoiceNumber: '',
    invoiceDate: '',
    hasEwayBill: false,
    ewayBillNumber: '',
    vehicleNumber: '',
    vehicleType: '',
    supplier: null,
    locationId: null,
    locationName: '',
    products: [],
    totalAmount: 0,
    discountType: 'amount',
    discountValue: 0,
    applyRoundOff: true,
    roundOffAmount: 0,
    finalAmount: 0,
    notes: '',
  });

  const locations = useMemo(() => {
    if (!businessData?.addresses) return [];
    return businessData.addresses.map((addr: any) => {
      const name = addr.name || addr.label || 'Main Location';
      const addressParts = [
        addr.address_line_1 || addr.addressLine1,
        addr.address_line_2 || addr.addressLine2,
        addr.city,
        addr.state || addr.stateName,
        addr.pincode,
      ].filter(Boolean);
      const fullAddress = addressParts.join(', ');
      return {
        id: addr.id,
        name,
        fullAddress,
        type: addr.type || addr.address_type || 'primary',
      };
    });
  }, [businessData?.addresses]);

  useEffect(() => {
    if (locations.length > 0 && !formData.locationId) {
      const primary = locations.find((l: any) => l.type === 'primary') || locations[0];
      if (primary) {
        setFormData(prev => ({ ...prev, locationId: primary.id, locationName: primary.name }));
      }
    }
  }, [locations]);

  useEffect(() => {
    (async () => {
      setProductsLoading(true);
      try {
        const result = await getProducts();
        if (result.success && result.products) {
          setExistingProducts(result.products);
        }
      } catch (e) {
        console.error('Error loading products:', e);
      } finally {
        setProductsLoading(false);
      }
    })();
  }, []);

  const formatDateField = (text: string, prev: string): string => {
    const isDeleting = text.length < prev.length;
    if (isDeleting) {
      if (prev.length === 4 && prev[2] === '-') return text.slice(0, 2);
      if (prev.length === 7 && prev[5] === '-') return text.slice(0, 5);
      return text;
    }
    let digits = text.replace(/[^0-9]/g, '');
    if (digits.length > 8) digits = digits.slice(0, 8);
    if (digits.length <= 2) return digits;
    if (digits.length <= 4) return digits.slice(0, 2) + '-' + digits.slice(2);
    return digits.slice(0, 2) + '-' + digits.slice(2, 4) + '-' + digits.slice(4);
  };

  const updateAdditionalField = (key: string, value: string) => {
    setFormData(prev => ({
      ...prev,
      additionalFields: { ...(prev.additionalFields || {}), [key]: value },
    }));
  };

  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showProductModal, setShowProductModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [suppliersList, setSuppliersList] = useState<any[]>([]);
  const [suppliersLoading, setSuppliersLoading] = useState(false);
  const [supplierSearch, setSupplierSearch] = useState('');
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedProduct, setSelectedProduct] = useState<any>(null);
  const [existingProducts, setExistingProducts] = useState<any[]>([]);
  const [productsLoading, setProductsLoading] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [newSupplier, setNewSupplier] = useState<any>(null);
  const [newProduct, setNewProduct] = useState<any>(null);
  const [showPrimaryUnitModal, setShowPrimaryUnitModal] = useState(false);
  const [showSecondaryUnitModal, setShowSecondaryUnitModal] = useState(false);
  const [showPrimaryUnitDropdown, setShowPrimaryUnitDropdown] = useState(false);
  const [showSecondaryUnitDropdown, setShowSecondaryUnitDropdown] = useState(false);
  const [primaryUnitSearch, setPrimaryUnitSearch] = useState('');
  const [secondaryUnitSearch, setSecondaryUnitSearch] = useState('');
  const [editingProduct, setEditingProduct] = useState<StockInProduct | null>(null);
  const [showEditProductModal, setShowEditProductModal] = useState(false);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());
  const [showAdditionalFields, setShowAdditionalFields] = useState(false);
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

  const loadSuppliers = async () => {
    setSuppliersLoading(true);
    try {
      const result = await getSuppliers();
      if (result.success && result.suppliers) {
        setSuppliersList(result.suppliers);
      }
    } catch (_) { /* ignore */ }
    setSuppliersLoading(false);
  };

  const handleOpenSupplierModal = () => {
    setSupplierSearch('');
    setShowSupplierModal(true);
    loadSuppliers();
  };

  const handleSupplierSelect = (supplier: any) => {
    updateFormData('supplier', {
      id: supplier.id || undefined,
      name: supplier.contact_person || supplier.contactPerson || supplier.business_name || '',
      gstin: supplier.gstin_pan || supplier.gstinPan || '',
      businessName: supplier.business_name || supplier.businessName || '',
      address: supplier.address || '',
    });
    setShowSupplierModal(false);
  };

  const handleAddProduct = () => {
    if (!selectedProduct) return;

    const alreadyAdded = formData.products.some(p => p.id === selectedProduct.id);
    if (alreadyAdded) {
      Alert.alert('Already Added', 'This product is already in the stock-in list. You can edit its quantity from the list.');
      return;
    }

    const purchasePrice = parseFloat(selectedProduct.unitPrice || selectedProduct.unit_price || selectedProduct.purchasePrice || selectedProduct.purchase_price || '0') || 0;
    const newProduct: StockInProduct = {
      id: selectedProduct.id,
      name: selectedProduct.name || '',
      barcode: selectedProduct.barcode || '',
      quantity: 1,
      purchasePrice,
      discount: 0,
      totalPrice: purchasePrice,
      isNewProduct: false,
      gstRate: parseFloat(selectedProduct.gstRate || selectedProduct.gst_rate || selectedProduct.taxRate || selectedProduct.tax_rate || '18') || 18,
      cessRate: parseFloat(selectedProduct.cessRate || selectedProduct.cess_rate || '0') || 0,
      cessType: selectedProduct.cessType || selectedProduct.cess_type || 'none',
      cessAmount: parseFloat(selectedProduct.cessAmount || selectedProduct.cess_amount || '0') || 0,
      cessUnit: selectedProduct.cessUnit || selectedProduct.cess_unit || '',
      primaryUnit: selectedProduct.primaryUnit || selectedProduct.primary_unit || 'Piece',
      secondaryUnit: selectedProduct.secondaryUnit || selectedProduct.secondary_unit || 'None',
      useCompoundUnit: selectedProduct.useCompoundUnit || selectedProduct.use_compound_unit || false,
      conversionRatio: selectedProduct.conversionRatio || selectedProduct.conversion_ratio || '',
      priceUnit: 'primary',
      hsnCode: selectedProduct.hsnCode || selectedProduct.hsn_code || '',
    };

    const updatedProducts = [...formData.products, newProduct];
    updateFormData('products', updatedProducts);

    const total = updatedProducts.reduce((sum, product) => sum + product.totalPrice, 0);
    updateFormData('totalAmount', total);

    // Auto-expand the newly added product
    setExpandedProducts(prev => new Set(prev).add(newProduct.id));

    setSelectedProduct(null);
    setShowProductModal(false);
  };

  const handleTaxConfiguration = (gstRate: number, cessRate: number, cessType: string, cessAmount: number) => {
    if (!selectedProduct) return;

    const purchasePrice = parseFloat(selectedProduct.unitPrice || selectedProduct.unit_price || selectedProduct.purchasePrice || selectedProduct.purchase_price || '0') || 0;
    const newProduct: StockInProduct = {
      id: selectedProduct.id || `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: selectedProduct.name || '',
      barcode: selectedProduct.barcode || '',
      quantity: 1,
      purchasePrice,
      discount: 0,
      totalPrice: purchasePrice,
      isNewProduct: false,
      gstRate,
      cessRate,
      cessType: cessType as 'none' | 'value' | 'quantity' | 'value_and_quantity',
      cessAmount,
      cessUnit: selectedProduct.cessUnit || selectedProduct.cess_unit || '',
      primaryUnit: selectedProduct.primaryUnit || selectedProduct.primary_unit || 'Piece',
      secondaryUnit: selectedProduct.secondaryUnit || selectedProduct.secondary_unit || 'None',
      useCompoundUnit: selectedProduct.useCompoundUnit || selectedProduct.use_compound_unit || false,
      conversionRatio: selectedProduct.conversionRatio || selectedProduct.conversion_ratio || '',
      priceUnit: 'primary',
      hsnCode: selectedProduct.hsnCode || selectedProduct.hsn_code || '',
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
    setShowProductModal(false);
    saveStockInFormData(formData);
    safeRouter.push({
      pathname: '/inventory/manual-product',
      params: { returnToStockIn: 'true' },
    });
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
        id: newProduct.id || `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        name: newProduct.name,
        barcode: newProduct.barcode || '',
        quantity: 1,
        purchasePrice: newProduct.price || 0,
        discount: 0,
        totalPrice: newProduct.price || 0,
        isNewProduct: false,
        gstRate: newProduct.gstRate || 18,
        cessRate: newProduct.cessRate || 0,
        cessType: newProduct.cessType || 'none',
        cessAmount: newProduct.cessAmount || 0,
        cessUnit: newProduct.cessUnit || '',
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
          id: productData.id || `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          name: productData.name,
          barcode: productData.barcode || '',
          quantity: 1,
          purchasePrice: productData.purchasePrice || productData.price || 0,
          discount: 0,
          totalPrice: productData.purchasePrice || productData.price || 0,
          isNewProduct: !!productData.pendingProductData,
          gstRate: productData.gstRate || 18,
          cessRate: productData.cessRate || 0,
          cessType: productData.cessType || 'none',
          cessAmount: productData.cessAmount || 0,
          cessUnit: productData.cessUnit || '',
          primaryUnit: productData.primaryUnit || 'Piece',
          secondaryUnit: productData.secondaryUnit || 'None',
          useCompoundUnit: productData.useCompoundUnit || false,
          conversionRatio: productData.conversionRatio || '',
          priceUnit: 'primary',
          hsnCode: productData.hsnCode || '',
          pendingProductData: productData.pendingProductData || undefined,
        };
        
        setFormData(prev => ({ ...prev, products: [...prev.products, productToAdd] }));
        setExpandedProducts(prev => new Set(prev).add(productToAdd.id));
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
    
    let amountAfterDiscount = total;
    if (formData.discountValue > 0) {
      if (formData.discountType === 'percentage') {
        amountAfterDiscount = total - (total * formData.discountValue / 100);
      } else {
        amountAfterDiscount = total - formData.discountValue;
      }
    }
    
    const roundOffAmount = formData.applyRoundOff ? calculateRoundOff(amountAfterDiscount) : 0;
    updateFormData('roundOffAmount', roundOffAmount);
    
    const finalAmount = amountAfterDiscount + roundOffAmount;
    updateFormData('finalAmount', finalAmount);
  }, [formData.products, formData.discountValue, formData.discountType, formData.applyRoundOff]);

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
    setEditingProduct({ ...product });
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

      const total = updatedProducts.reduce((sum, product) => sum + product.totalPrice, 0);
      updateFormData('totalAmount', total);

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
    if (
      formData.invoiceNumber.trim().length === 0 ||
      formData.invoiceDate.trim().length === 0 ||
      formData.supplier === null ||
      formData.products.length === 0
    ) return false;
    if (formData.invoiceDate.length === 10 && validateDateDDMMYYYY(formData.invoiceDate)) return false;
    return true;
  };

  const handleSave = () => {
    if (!isFormValid()) {
      const dateErr = formData.invoiceDate.length === 10 ? validateDateDDMMYYYY(formData.invoiceDate) : null;
      Alert.alert('Incomplete Form', dateErr || 'Please fill in all required fields');
      return;
    }

    const additionalFields = formData.additionalFields || {};
    for (const [key, value] of Object.entries(additionalFields)) {
      if (value && value.length === 10) {
        const err = validateDateDDMMYYYY(value);
        if (err) {
          Alert.alert('Invalid Date', `${key}: ${err}`);
          return;
        }
      }
    }

    safeRouter.push({
      pathname: '/inventory/stock-in/confirmation',
      params: {
        stockInData: JSON.stringify(formData)
      }
    });
  };

  const filteredProducts = existingProducts.filter((product: any) => {
    const q = searchQuery.toLowerCase();
    const name = (product.name || '').toLowerCase();
    const barcode = (product.barcode || '').toLowerCase();
    const category = (product.category || '').toLowerCase();
    return name.includes(q) || barcode.includes(q) || category.includes(q);
  });

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
              safeRouter.replace('/inventory/stock-in');
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
          {/* Supplier Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supplier *</Text>
            <TouchableOpacity
              style={[styles.dropdown, formData.supplier ? styles.dropdownSelected : null]}
              onPress={handleOpenSupplierModal}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <Building2 size={20} color={formData.supplier ? Colors.primary : Colors.textLight} />
                <Text style={[
                  styles.dropdownText,
                  formData.supplier ? styles.dropdownTextSelected : styles.placeholderText
                ]} numberOfLines={1}>
                  {formData.supplier ? formData.supplier.businessName : 'Select supplier'}
                </Text>
                <ChevronDown size={20} color={Colors.textLight} />
              </View>
            </TouchableOpacity>
          </View>

          {/* Receiving Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Receiving Location *</Text>
            <TouchableOpacity
              style={[styles.dropdown, formData.locationId ? styles.dropdownSelected : null]}
              onPress={() => setShowLocationModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <MapPin size={20} color={formData.locationId ? Colors.primary : Colors.textLight} />
                <View style={{ flex: 1 }}>
                  <Text style={[
                    styles.dropdownText,
                    formData.locationId ? styles.dropdownTextSelected : styles.placeholderText
                  ]} numberOfLines={1}>
                    {formData.locationName || (locations.length === 0 ? 'No locations added' : 'Select receiving location')}
                  </Text>
                  {formData.locationId && (() => {
                    const loc = locations.find((l: any) => l.id === formData.locationId);
                    if (!loc) return null;
                    const typeLabel = loc.type === 'primary' ? 'Primary Address' : loc.type === 'warehouse' ? 'Warehouse' : 'Branch';
                    return (
                      <>
                        {loc.fullAddress ? (
                          <Text style={{ fontSize: 12, color: Colors.textLight, marginTop: 2 }} numberOfLines={2}>
                            {loc.fullAddress}
                          </Text>
                        ) : null}
                        <Text style={{ fontSize: 11, color: Colors.primary, marginTop: 2, fontWeight: '500' as const }}>
                          {typeLabel}
                        </Text>
                      </>
                    );
                  })()}
                </View>
                <ChevronDown size={20} color={Colors.textLight} />
              </View>
            </TouchableOpacity>
          </View>

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
                  const prev = formData.invoiceDate;
                  const isDeleting = text.length < prev.length;

                  if (isDeleting) {
                    if (prev.length === 4 && prev[2] === '-') {
                      updateFormData('invoiceDate', text.slice(0, 2));
                      return;
                    }
                    if (prev.length === 7 && prev[5] === '-') {
                      updateFormData('invoiceDate', text.slice(0, 5));
                      return;
                    }
                    updateFormData('invoiceDate', text);
                    return;
                  }

                  let digits = text.replace(/[^0-9]/g, '');
                  if (digits.length > 8) digits = digits.slice(0, 8);

                  let formatted = '';
                  if (digits.length <= 2) {
                    formatted = digits;
                  } else if (digits.length <= 4) {
                    formatted = digits.slice(0, 2) + '-' + digits.slice(2);
                  } else {
                    formatted = digits.slice(0, 2) + '-' + digits.slice(2, 4) + '-' + digits.slice(4);
                  }
                  updateFormData('invoiceDate', formatted);
                }}
                placeholder="DD-MM-YYYY"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
                maxLength={10}
              />
              {formData.invoiceDate && formData.invoiceDate.length === 10 && validateDateDDMMYYYY(formData.invoiceDate) && (
                <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>{validateDateDDMMYYYY(formData.invoiceDate)}</Text>
              )}
            </View>
          </View>

          {/* Additional Invoice Fields */}
          <View style={styles.section}>
            <TouchableOpacity
              style={{
                flexDirection: 'row' as const, alignItems: 'center' as const,
                justifyContent: 'space-between' as const, paddingVertical: 4,
              }}
              onPress={() => setShowAdditionalFields(!showAdditionalFields)}
              activeOpacity={0.7}
            >
              <View style={{ flexDirection: 'row' as const, alignItems: 'center' as const }}>
                <ClipboardList size={18} color={Colors.primary} />
                <Text style={[styles.sectionTitle, { marginBottom: 0, marginLeft: 8, color: Colors.primary }]}>
                  Additional Invoice Fields
                </Text>
              </View>
              {showAdditionalFields
                ? <ChevronUp size={18} color={Colors.textLight} />
                : <ChevronDown size={18} color={Colors.textLight} />}
            </TouchableOpacity>

            {showAdditionalFields && (
              <View style={{ marginTop: 12 }}>
                {INVOICE_FIELD_OPTIONS.map((field) => (
                  <View key={field.key} style={{ marginBottom: 12 }}>
                    <Text style={{ fontSize: 13, fontWeight: '500' as const, color: Colors.text, marginBottom: 6 }}>
                      {field.label}
                    </Text>
                    <View style={styles.inputContainer}>
                      <TextInput
                        style={[styles.input, { paddingLeft: 14 }]}
                        value={formData.additionalFields?.[field.key] || ''}
                        onChangeText={(text) => {
                          if (field.isDate) {
                            updateAdditionalField(field.key, formatDateField(text, formData.additionalFields?.[field.key] || ''));
                          } else {
                            updateAdditionalField(field.key, text);
                          }
                        }}
                        placeholder={field.isDate ? 'DD-MM-YYYY' : `Enter ${field.label.toLowerCase()}`}
                        placeholderTextColor={Colors.textLight}
                        keyboardType={field.isDate ? 'numeric' : 'default'}
                        maxLength={field.isDate ? 10 : undefined}
                      />
                    </View>
                    {field.isDate && (formData.additionalFields?.[field.key] || '').length === 10 && validateDateDDMMYYYY(formData.additionalFields?.[field.key] || '') && (
                      <Text style={{ fontSize: 11, color: '#DC2626', marginTop: 2 }}>{validateDateDDMMYYYY(formData.additionalFields?.[field.key] || '')}</Text>
                    )}
                  </View>
                ))}
              </View>
            )}
          </View>

          {/* E-Way Bill */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>E-Way Bill</Text>
            <View style={styles.checkboxContainer}>
              <TouchableOpacity
                style={[styles.checkbox, formData.hasEwayBill && styles.checkboxChecked]}
                onPress={() => updateFormData('hasEwayBill', !formData.hasEwayBill)}
                activeOpacity={0.7}
              >
                {formData.hasEwayBill && <Check size={14} color="#FFFFFF" strokeWidth={3} />}
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
                {formData.products.map((product, index) => {
                  const productKey = product.id || `product_${index}`;
                  const isExpanded = expandedProducts.has(productKey);
                  const toggleExpand = () => {
                    setExpandedProducts(prev => {
                      const next = new Set(prev);
                      if (next.has(productKey)) next.delete(productKey);
                      else next.add(productKey);
                      return next;
                    });
                  };

                  return (
                    <View key={productKey} style={styles.productCard}>
                      <TouchableOpacity
                        style={styles.productHeader}
                        onPress={toggleExpand}
                        activeOpacity={0.7}
                      >
                        <View style={{ flex: 1 }}>
                          <Text style={styles.productName} numberOfLines={1}>{product.name}</Text>
                          {!isExpanded && (
                            <Text style={{ fontSize: 12, color: Colors.textLight, marginTop: 2 }}>
                              Qty: {product.quantity} {product.primaryUnit}  •  {formatCurrencyINR(product.totalPrice, 4)}
                            </Text>
                          )}
                        </View>
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
                          {isExpanded
                            ? <ChevronUp size={16} color={Colors.textLight} />
                            : <ChevronDown size={16} color={Colors.textLight} />
                          }
                        </View>
                      </TouchableOpacity>

                      {isExpanded && (
                        <View style={styles.productDetails}>
                          {product.useCompoundUnit && product.secondaryUnit && product.secondaryUnit !== 'None' && product.conversionRatio && (
                            <View style={styles.uomSelectorRow}>
                              <Text style={styles.productLabel}>Price per:</Text>
                              <View style={styles.uomToggle}>
                                <TouchableOpacity
                                  style={[styles.uomOption, product.priceUnit === 'primary' && styles.uomOptionActive]}
                                  onPress={() => updateProduct(product.id, 'priceUnit', 'primary')}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.uomOptionText, product.priceUnit === 'primary' && styles.uomOptionTextActive]}>
                                    {product.primaryUnit}
                                  </Text>
                                </TouchableOpacity>
                                <TouchableOpacity
                                  style={[styles.uomOption, product.priceUnit === 'secondary' && styles.uomOptionActive]}
                                  onPress={() => updateProduct(product.id, 'priceUnit', 'secondary')}
                                  activeOpacity={0.7}
                                >
                                  <Text style={[styles.uomOptionText, product.priceUnit === 'secondary' && styles.uomOptionTextActive]}>
                                    {product.secondaryUnit}
                                  </Text>
                                </TouchableOpacity>
                              </View>
                            </View>
                          )}

                          <View style={styles.productRow}>
                            <Text style={styles.productLabel}>
                              Quantity ({product.primaryUnit}):
                              {product.useCompoundUnit && product.conversionRatio && (
                                <Text style={styles.piecesInfo}> ({product.conversionRatio} {product.secondaryUnit} per {product.primaryUnit})</Text>
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
                            <Text style={styles.productLabel}>
                              Purchase Price{product.useCompoundUnit && product.conversionRatio
                                ? ` (per ${product.priceUnit === 'secondary' ? product.secondaryUnit : product.primaryUnit})`
                                : ''}:
                            </Text>
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
                              {formatCurrencyINR(calculateBasePrice(product) * product.gstRate / 100, 4)}
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
                                {formatCurrencyINR(calculateCessAmount(product), 4)}
                              </Text>
                            </View>
                          )}

                          <View style={styles.productRow}>
                            <Text style={styles.productLabel}>Total:</Text>
                            <Text style={styles.totalPrice}>
                              {formatCurrencyINR(product.totalPrice, 4)}
                            </Text>
                          </View>
                        </View>
                      )}
                    </View>
                  );
                })}
              </View>
            )}
          </View>

          {/* Discount Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Supplier Discount</Text>
              <Text style={styles.sectionSubtitle}>
                {formData.discountValue > 0 ? 
                  `Saving: ${formatCurrencyINR(formData.discountType === 'percentage' 
                    ? (formData.totalAmount * formData.discountValue / 100)
                    : formData.discountValue
                  )}` : 'No discount applied'
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
                    : `${formatCurrencyINR(formData.discountValue)} off total amount`
                  }
                </Text>
              )}
            </View>
          </View>

          {/* Total Amount */}
          <View style={styles.section}>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>{formatCurrencyINR(formData.totalAmount)}</Text>
            </View>
          </View>

          {/* Amount After Discount */}
          {formData.discountValue > 0 && (
            <View style={styles.section}>
              <View style={styles.totalSection}>
                <Text style={styles.totalLabel}>After Discount:</Text>
                <Text style={styles.totalAmount}>
                  {formatCurrencyINR(formData.totalAmount - (formData.discountType === 'percentage' 
                    ? (formData.totalAmount * formData.discountValue / 100) 
                    : formData.discountValue))}
                </Text>
              </View>
            </View>
          )}

          {/* Round Off */}
          <View style={styles.section}>
            <View style={styles.totalSection}>
              <TouchableOpacity
                style={{ flexDirection: 'row', alignItems: 'center', flex: 1 }}
                onPress={() => updateFormData('applyRoundOff', !formData.applyRoundOff)}
                activeOpacity={0.7}
              >
                <View style={[styles.checkbox, formData.applyRoundOff && styles.checkboxChecked]}>
                  {formData.applyRoundOff && <Check size={14} color="#fff" />}
                </View>
                <Text style={styles.totalLabel}>Round Off:</Text>
              </TouchableOpacity>
              <Text style={[
                styles.totalAmount, 
                { color: formData.applyRoundOff ? (formData.roundOffAmount > 0 ? Colors.success : formData.roundOffAmount < 0 ? Colors.error : Colors.text) : Colors.textLight }
              ]}>
                {formData.applyRoundOff
                  ? `${formData.roundOffAmount > 0 ? '+' : ''}${formatCurrencyINR(formData.roundOffAmount)}`
                  : '—'}
              </Text>
            </View>
          </View>

          {/* Final Amount */}
          <View style={styles.section}>
            <View style={styles.totalSection}>
              <Text style={[styles.totalLabel, { fontWeight: 'bold' }]}>Final Amount:</Text>
              <Text style={[styles.totalAmount, { fontWeight: 'bold', color: Colors.primary }]}>
                {formatCurrencyINR(formData.finalAmount)}
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
              {isSaving ? 'Saving...' : 'Review & Confirm'}
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
                <View style={styles.searchContainer}>
                  <Search size={20} color={Colors.textLight} />
                  <TextInput
                    style={styles.searchInput}
                    placeholder="Search suppliers..."
                    placeholderTextColor={Colors.textLight}
                    value={supplierSearch}
                    onChangeText={setSupplierSearch}
                  />
                </View>

                <ScrollView style={styles.productList}>
                  {suppliersLoading ? (
                    <View style={{ paddingVertical: 24, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={[styles.modalOptionText, { marginTop: 8 }]}>Loading suppliers...</Text>
                    </View>
                  ) : (
                    <>
                      {suppliersList
                        .filter((s: any) => {
                          if (!supplierSearch.trim()) return true;
                          const q = supplierSearch.toLowerCase();
                          return (
                            (s.business_name || '').toLowerCase().includes(q) ||
                            (s.contact_person || '').toLowerCase().includes(q) ||
                            (s.gstin_pan || '').toLowerCase().includes(q) ||
                            (s.mobile_number || '').toLowerCase().includes(q)
                          );
                        })
                        .map((supplier: any) => (
                          <TouchableOpacity
                            key={supplier.id}
                            style={styles.modalOption}
                            onPress={() => handleSupplierSelect(supplier)}
                            activeOpacity={0.7}
                          >
                            <Building2 size={20} color={Colors.textLight} />
                            <View style={{ flex: 1, marginLeft: 8 }}>
                              <Text style={styles.modalOptionText}>{supplier.business_name || supplier.contact_person || 'Unnamed'}</Text>
                              {supplier.gstin_pan ? (
                                <Text style={{ fontSize: 12, color: Colors.textLight, marginTop: 2 }}>GSTIN: {supplier.gstin_pan}</Text>
                              ) : null}
                            </View>
                          </TouchableOpacity>
                        ))
                      }
                      {!suppliersLoading && suppliersList.length === 0 && (
                        <View style={{ paddingVertical: 16, alignItems: 'center' }}>
                          <Text style={[styles.modalOptionText, { color: Colors.textLight }]}>No suppliers found</Text>
                        </View>
                      )}
                    </>
                  )}
                </ScrollView>

                <TouchableOpacity
                  style={[styles.modalOption, { borderTopWidth: 1, borderTopColor: Colors.grey[200], marginTop: 8, paddingTop: 12 }]}
                  onPress={() => {
                    setShowSupplierModal(false);
                    saveStockInFormData(formData);
                    setTimeout(() => {
                      safeRouter.push({
                        pathname: '/purchasing/add-supplier',
                        params: { returnToStockIn: 'true' },
                      });
                    }, 100);
                  }}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color={Colors.primary} />
                  <Text style={[styles.modalOptionText, { color: Colors.primary }]}>Add New Supplier</Text>
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
                  {productsLoading ? (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <ActivityIndicator size="small" color={Colors.primary} />
                      <Text style={{ marginTop: 8, color: Colors.textLight, fontSize: 13 }}>Loading products...</Text>
                    </View>
                  ) : filteredProducts.length === 0 ? (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <Package size={32} color={Colors.grey[300]} />
                      <Text style={{ marginTop: 8, color: Colors.textLight, fontSize: 13 }}>
                        {searchQuery ? 'No products match your search' : 'No products yet'}
                      </Text>
                    </View>
                  ) : (
                    filteredProducts.map((product: any) => {
                      const isAlreadyAdded = formData.products.some(p => p.id === product.id);
                      return (
                        <TouchableOpacity
                          key={product.id}
                          style={[styles.productOption, isAlreadyAdded && { opacity: 0.5, backgroundColor: Colors.grey[100] }]}
                          onPress={() => !isAlreadyAdded && setSelectedProduct(product)}
                          activeOpacity={0.7}
                          disabled={isAlreadyAdded}
                        >
                          <Package size={20} color={isAlreadyAdded ? Colors.grey[300] : Colors.textLight} />
                          <View style={{ flex: 1, marginLeft: 8 }}>
                            <Text style={styles.productOptionText}>{product.name}</Text>
                            <Text style={{ fontSize: 11, color: Colors.textLight, marginTop: 1 }}>
                              {product.category || ''}
                              {product.barcode ? ` • ${product.barcode}` : ''}
                              {(product.unitPrice || product.unit_price) ? ` • ${formatCurrencyINR(parseFloat(product.unitPrice || product.unit_price || 0), 4)}` : ''}
                            </Text>
                          </View>
                          {isAlreadyAdded ? (
                            <Text style={{ fontSize: 10, color: Colors.textLight, fontWeight: '500' }}>Added</Text>
                          ) : selectedProduct?.id === product.id ? (
                            <Check size={20} color={Colors.primary} />
                          ) : null}
                        </TouchableOpacity>
                      );
                    })
                  )}
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

                      {/* UoM Toggle (for compound units) */}
                      {editingProduct.useCompoundUnit && editingProduct.secondaryUnit && editingProduct.secondaryUnit !== 'None' && (
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>Price per</Text>
                          <View style={styles.uomToggle}>
                            <TouchableOpacity
                              style={[styles.uomOption, editingProduct.priceUnit === 'primary' && styles.uomOptionActive]}
                              onPress={() => setEditingProduct(prev => prev ? { ...prev, priceUnit: 'primary' } : null)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.uomOptionText, editingProduct.priceUnit === 'primary' && styles.uomOptionTextActive]}>
                                {editingProduct.primaryUnit}
                              </Text>
                            </TouchableOpacity>
                            <TouchableOpacity
                              style={[styles.uomOption, editingProduct.priceUnit === 'secondary' && styles.uomOptionActive]}
                              onPress={() => setEditingProduct(prev => prev ? { ...prev, priceUnit: 'secondary' } : null)}
                              activeOpacity={0.7}
                            >
                              <Text style={[styles.uomOptionText, editingProduct.priceUnit === 'secondary' && styles.uomOptionTextActive]}>
                                {editingProduct.secondaryUnit}
                              </Text>
                            </TouchableOpacity>
                          </View>
                        </View>
                      )}

                      {/* Pieces per Box (for compound units) */}
                      {editingProduct.useCompoundUnit && (
                        <View style={styles.inputGroup}>
                          <Text style={styles.label}>{editingProduct.secondaryUnit || 'Pieces'} per {editingProduct.primaryUnit}</Text>
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

          {/* Location Selection Modal */}
          <Modal
            visible={showLocationModal}
            transparent
            animationType="fade"
            onRequestClose={() => setShowLocationModal(false)}
          >
            <View style={styles.modalOverlay}>
              <View style={styles.modalContainer}>
                <View style={styles.modalHeader}>
                  <Text style={styles.modalTitle}>Select Receiving Location</Text>
                  <TouchableOpacity
                    onPress={() => setShowLocationModal(false)}
                    activeOpacity={0.7}
                  >
                    <X size={24} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                  {locations.map((loc: any) => {
                    const isSelected = formData.locationId === loc.id;
                    const typeLabel = loc.type === 'primary' ? 'Primary' : loc.type === 'warehouse' ? 'Warehouse' : 'Branch';
                    return (
                      <TouchableOpacity
                        key={loc.id}
                        style={[
                          styles.locationOptionItem,
                          isSelected && styles.locationOptionSelected,
                        ]}
                        onPress={() => {
                          setFormData(prev => ({ ...prev, locationId: loc.id, locationName: loc.name }));
                          setShowLocationModal(false);
                        }}
                        activeOpacity={0.7}
                      >
                        <View style={[styles.locationIconCircle, isSelected && { backgroundColor: Colors.primary + '15' }]}>
                          <MapPin size={18} color={isSelected ? Colors.primary : Colors.textLight} />
                        </View>
                        <View style={{ flex: 1 }}>
                          <Text style={[styles.locationOptionName, isSelected && { color: Colors.primary, fontWeight: '600' }]} numberOfLines={1}>
                            {loc.name}
                          </Text>
                          {loc.fullAddress ? (
                            <Text style={{ fontSize: 12, color: Colors.textLight, marginTop: 1 }} numberOfLines={2}>
                              {loc.fullAddress}
                            </Text>
                          ) : null}
                          <Text style={styles.locationOptionType}>{typeLabel}</Text>
                        </View>
                        {isSelected && (
                          <View style={styles.locationCheckCircle}>
                            <Check size={14} color="#FFFFFF" />
                          </View>
                        )}
                      </TouchableOpacity>
                    );
                  })}

                  {locations.length === 0 && (
                    <View style={{ padding: 24, alignItems: 'center' }}>
                      <View style={{ width: 56, height: 56, borderRadius: 28, backgroundColor: Colors.grey[100], alignItems: 'center', justifyContent: 'center', marginBottom: 12 }}>
                        <MapPin size={28} color={Colors.grey[300]} />
                      </View>
                      <Text style={{ color: Colors.text, fontSize: 15, fontWeight: '600', marginBottom: 4 }}>No locations added</Text>
                      <Text style={{ color: Colors.textLight, fontSize: 13, textAlign: 'center' }}>Add a branch or warehouse to get started</Text>
                    </View>
                  )}
                </ScrollView>

                <View style={styles.locationModalFooter}>
                  <TouchableOpacity
                    style={styles.locationAddButton}
                    onPress={() => {
                      setShowLocationModal(false);
                      safeRouter.push('/locations/add-branch');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.locationAddIconCircle}>
                      <Plus size={16} color={Colors.primary} />
                    </View>
                    <Text style={styles.locationAddButtonText}>Add Branch</Text>
                  </TouchableOpacity>
                  <View style={styles.locationFooterDivider} />
                  <TouchableOpacity
                    style={styles.locationAddButton}
                    onPress={() => {
                      setShowLocationModal(false);
                      safeRouter.push('/locations/add-warehouse');
                    }}
                    activeOpacity={0.7}
                  >
                    <View style={styles.locationAddIconCircle}>
                      <Plus size={16} color={Colors.primary} />
                    </View>
                    <Text style={styles.locationAddButtonText}>Add Warehouse</Text>
                  </TouchableOpacity>
                </View>
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
  dropdownSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  dropdownTextSelected: {
    color: Colors.text,
    fontWeight: '600',
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
  locationOptionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 12,
    marginBottom: 6,
    gap: 12,
    backgroundColor: Colors.grey[50],
  },
  locationOptionSelected: {
    backgroundColor: Colors.primary + '0A',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  locationIconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationOptionName: {
    fontSize: 15,
    fontWeight: '500',
    color: Colors.text,
  },
  locationOptionType: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  locationCheckCircle: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationModalFooter: {
    flexDirection: 'row',
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 4,
    paddingBottom: Platform.OS === 'ios' ? 8 : 4,
    paddingHorizontal: 8,
  },
  locationAddButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 14,
    gap: 8,
    borderRadius: 10,
  },
  locationAddIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: Colors.primary + '12',
    alignItems: 'center',
    justifyContent: 'center',
  },
  locationAddButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  locationFooterDivider: {
    width: 1,
    backgroundColor: Colors.grey[200],
    marginVertical: 8,
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
    width: 22,
    height: 22,
    borderRadius: 5,
    borderWidth: 2,
    borderColor: Colors.grey[300],
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  checkboxChecked: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary,
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
  uomSelectorRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  uomToggle: {
    flexDirection: 'row',
    borderRadius: 8,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  uomOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background,
  },
  uomOptionActive: {
    backgroundColor: Colors.primary,
  },
  uomOptionText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  uomOptionTextActive: {
    color: '#FFFFFF',
  },
}); 