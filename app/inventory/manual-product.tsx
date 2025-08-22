import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  AppState,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { productStore, Product } from '@/utils/productStore';
import { dataStore, Supplier as StoreSupplier } from '@/utils/dataStore';
import { 
  ArrowLeft, 
  Package, 
  Search, 
  X, 
  ChevronDown, 
  Camera,
  Upload,
  Building2,
  Hash,
  IndianRupee,
  Percent,
  Plus,
  Barcode
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

let categories = [
  'Smartphones', 'Laptops', 'Tablets', 'Audio', 'Cameras', 'Gaming', 
  'Accessories', 'Wearables', 'Home Appliances'
];

const primaryUnits = [
  'Piece', 'Kilogram', 'Gram', 'Liter', 'Milliliter', 'Meter', 'Centimeter', 
  'Box', 'Pack', 'Set', 'Pair', 'Dozen', 'Ton', 'Quintal', 'Foot', 'Inch', 
  'Yard', 'Square Meter', 'Square Foot', 'Cubic Meter', 'Cubic Foot', 
  'Bundle', 'Roll', 'Sheet', 'Bottle', 'Can', 'Jar', 'Tube', 'Bag', 
  'Carton', 'Crate', 'Gallon', 'Ounce', 'Pound'
];

const customUnitPlaceholder = 'Custom Unit';

const secondaryUnits = [
  'None', 'Piece', 'Kilogram', 'Gram', 'Liter', 'Milliliter', 'Meter', 
  'Centimeter', 'Box', 'Pack', 'Set', 'Pair', 'Dozen', 'Ton', 'Quintal', 
  'Foot', 'Inch', 'Yard', 'Square Meter', 'Square Foot', 'Cubic Meter', 
  'Cubic Foot', 'Bundle', 'Roll', 'Sheet', 'Bottle', 'Can', 'Jar', 'Tube', 
  'Bag', 'Carton', 'Crate', 'Gallon', 'Ounce', 'Pound'
];

const taxRates = [0, 5, 12, 18, 28];

const cessTypes = [
  { value: 'none', label: 'No CESS' },
  { value: 'value', label: 'Based on Value' },
  { value: 'quantity', label: 'Based on Quantity' },
  { value: 'value_and_quantity', label: 'Based on Value & Quantity' },
  { value: 'mrp', label: 'Based on MRP' },
];

const unitConversions: { [key: string]: { [key: string]: number } } = {
  'Dozen': { 'Piece': 12 },
  'Kilogram': { 'Gram': 1000 },
  'Meter': { 'Centimeter': 100, 'Inch': 39.37 },
  'Liter': { 'Milliliter': 1000 },
  'Ton': { 'Kilogram': 1000, 'Quintal': 10 },
  'Quintal': { 'Kilogram': 100 },
  'Foot': { 'Inch': 12, 'Centimeter': 30.48 },
  'Yard': { 'Foot': 3, 'Inch': 36 },
  'Square Meter': { 'Square Foot': 10.764 },
  'Cubic Meter': { 'Cubic Foot': 35.315 },
  'Gallon': { 'Liter': 3.785 },
  'Pack': { 'Piece': 10 },
  'Box': { 'Piece': 24 },
  'Carton': { 'Piece': 48 },
  'Bundle': { 'Piece': 25 },
};

const storageLocations = [
  'Main Warehouse',
  'Main Warehouse - A1',
  'Main Warehouse - A2', 
  'Main Warehouse - B1',
  'Main Warehouse - B2',
  'Main Warehouse - C1',
  'Main Warehouse - C2',
  'Branch Office - Mumbai',
  'Branch Office - Delhi',
  'Branch Office - Bangalore',
  'Branch Office - Chennai',
  'Distribution Center',
  'Storage Room',
  'Display Area',
  'Back Store',
  'Others'
];

interface Supplier {
  id: string;
  name: string;
  type: 'business' | 'individual';
}

// Get suppliers from data store - will be updated via useEffect
let mockSuppliers: Supplier[] = [];

interface ProductFormData {
  name: string;
  category: string;
  customCategory: string;
  hsnCode: string;
  barcode: string;
  taxRate: number;
  taxInclusive: boolean; // New field for tax inclusion toggle
  primaryUnit: string;
  secondaryUnit: string;
  useCompoundUnit: boolean;
  conversionRatio: string;
  tertiaryUnit: string;
  tertiaryConversionRatio: string;
  priceUnit: 'primary' | 'secondary';
  stockUoM: 'primary' | 'secondary' | 'tertiary';
  cessType: 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp';
  cessRate: number;
  cessAmount: string;
  cessUnit: string;
  perUnitPrice: string; // New field for per unit price
  purchasePrice: string;
  salesPrice: string;
  mrp: string;
  minStockLevel: string;
  maxStockLevel: string;
  openingStock: string;
  preferredSupplier: string;
  location: string;
  productImage: string | null;
  // Advanced options
  batchNumber: string;
  expiryDate: string;
  showAdvancedOptions: boolean;
}

import { getScannedData, clearScannedData } from '@/utils/scannedDataStore';

export default function ManualProductScreen() {
  const params = useLocalSearchParams();
  const { scannedData, isScanned, returnToStockIn, supplierId, newSupplier, returnTo, preSelectedCustomer, editMode, productId, productData } = params;
  
  // Check if this is a duplicate form attempt
  useEffect(() => {
    // If we're coming from scanner but don't have scanned data, this might be a duplicate
    if (returnTo === 'manual-product' && !scannedData && !getScannedData()) {
      console.log('🚫 Potential duplicate form detected - checking navigation');
      // Check if we should go back to the original screen
      if (returnTo === 'manual-product') {
        // This is likely a duplicate, go back to original screen
        console.log('🚫 Duplicate form detected - redirecting to original screen');
        router.back();
        return;
      }
    }
  }, [returnTo, scannedData]);
  
  // Debug logging for parameters - only log when there's actual data
  if (scannedData || getScannedData()) {
    console.log('🔍 ManualProductScreen - Received scanned data');
  }
  
  // Force re-render when scanned data changes
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Track which fields were auto-filled for visual feedback
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: '',
    customCategory: '',
    hsnCode: '',
    barcode: '',
    taxRate: 18,
    taxInclusive: false, // Default to tax exclusive
    cessRate: 0,
    cessAmount: '',
    cessUnit: '',
    primaryUnit: 'Piece',
    secondaryUnit: 'None',
    useCompoundUnit: false,
    conversionRatio: '',
    tertiaryUnit: 'None',
    tertiaryConversionRatio: '',
    priceUnit: 'primary',
    stockUoM: 'primary',
    cessType: 'none',
    perUnitPrice: '',
    purchasePrice: '',
    salesPrice: '',
    mrp: '',
    minStockLevel: '',
    maxStockLevel: '',
    openingStock: '',
    preferredSupplier: '',
    location: 'Primary Address',
    productImage: null,
    // Advanced options
    batchNumber: '',
    expiryDate: '',
    showAdvancedOptions: false,
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showAddCategoryModal, setShowAddCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showSecondaryUnitModal, setShowSecondaryUnitModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showCessModal, setShowCessModal] = useState(false);
  const [showCessTypeModal, setShowCessTypeModal] = useState(false);
  const [showCessAmountModal, setShowCessAmountModal] = useState(false);
  const [showUnitTypeModal, setShowUnitTypeModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
  const [primaryUnitSearch, setPrimaryUnitSearch] = useState('');
  const [secondaryUnitSearch, setSecondaryUnitSearch] = useState('');
  const [newCategoryName, setNewCategoryName] = useState('');
  const [customPrimaryUnit, setCustomPrimaryUnit] = useState('');
  const [customSecondaryUnit, setCustomSecondaryUnit] = useState('');
  const [showCustomPrimaryUnitModal, setShowCustomPrimaryUnitModal] = useState(false);
  const [showCustomSecondaryUnitModal, setShowCustomSecondaryUnitModal] = useState(false);
  const [showTertiaryUnitModal, setShowTertiaryUnitModal] = useState(false);
  const [showCustomTertiaryUnitModal, setShowCustomTertiaryUnitModal] = useState(false);
  const [showTertiaryConversionModal, setShowTertiaryConversionModal] = useState(false);
  const [tertiaryUnitSearch, setTertiaryUnitSearch] = useState('');
  const [customTertiaryUnit, setCustomTertiaryUnit] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categorySearchRef = useRef<TextInput>(null);
  const supplierSearchRef = useRef<TextInput>(null);

    // Use useFocusEffect to detect when form comes back into focus
  useFocusEffect(
    React.useCallback(() => {
      console.log('🔍 useFocusEffect triggered - checking for scanned data');
      console.log('🔍 scannedData from params:', scannedData);
      console.log('🔍 scannedData from store:', getScannedData());
      
      // Check if we have scanned data to process (either from params or shared store)
      const dataToProcess = scannedData || getScannedData();
      
      if (dataToProcess) {
        console.log('🔍 Found data to process:', dataToProcess);
        try {
          const scanned = JSON.parse(dataToProcess as string);
          console.log('🔍 Processing scanned data:', { barcode: scanned.barcode, name: scanned.name, brand: scanned.brand });
          
          // Check if this is actually scanned data (has barcode and name)
          if (scanned.barcode && scanned.name) {
            const newAutoFilledFields = new Set<string>();
            
            // Update name field - combine brand and name
            if (scanned.name) {
              let fullProductName = scanned.name;
              
              // If brand exists and is not empty, prepend it to the product name
              if (scanned.brand && scanned.brand.trim() !== '' && scanned.brand !== 'Unknown') {
                fullProductName = `${scanned.brand} ${scanned.name}`;
              }
              
              console.log('🔍 Setting product name to:', fullProductName);
              setFormData(prev => ({ ...prev, name: fullProductName }));
              newAutoFilledFields.add('name');
              console.log('✅ Auto-filled product name:', fullProductName);
            }
            
            // Update barcode field
            if (scanned.barcode) {
              console.log('🔍 Setting barcode to:', scanned.barcode);
              setFormData(prev => ({ ...prev, barcode: scanned.barcode }));
              newAutoFilledFields.add('barcode');
              console.log('✅ Auto-filled barcode:', scanned.barcode);
            }
            
            // Update auto-filled fields tracking
            setAutoFilledFields(newAutoFilledFields);
            
            // Force a re-render to ensure form updates
            setForceUpdate(prev => prev + 1);
            
            console.log('✅ Form auto-filled successfully');
            
            // Clear scanned data after processing
            if (getScannedData()) {
              clearScannedData();
            }
          } else {
            console.log('⚠️ Scanned data missing required fields (barcode or name)');
          }
        } catch (error) {
          console.error('❌ Error parsing scanned data:', error);
        }
      } else {
        console.log('⚠️ No scanned data found to process');
      }
    }, [scannedData])
  );

  // Handle edit mode - populate form with existing product data
  useEffect(() => {
    if (editMode === 'true' && productData) {
      try {
        const product = JSON.parse(productData as string);
        console.log('🔄 Edit mode: Populating form with existing product data:', product.name);
        
        setFormData({
          name: product.name || '',
          category: product.category || '',
          customCategory: '',
          hsnCode: product.hsnCode || '',
          barcode: product.barcode || '',
          taxRate: product.taxRate || 18,
          taxInclusive: product.taxInclusive || false, // Include tax inclusive setting
          cessRate: product.cessRate || 0,
          cessAmount: product.cessAmount?.toString() || '',
          cessUnit: product.cessUnit || '',
          primaryUnit: product.primaryUnit || 'Piece',
          secondaryUnit: product.secondaryUnit || 'None',
          useCompoundUnit: Boolean(product.secondaryUnit && product.secondaryUnit !== 'None'),
          conversionRatio: product.conversionRatio || '',
          tertiaryUnit: product.tertiaryUnit || 'None',
          tertiaryConversionRatio: product.tertiaryConversionRatio || '',
          priceUnit: 'primary',
          stockUoM: 'primary',
          cessType: product.cessType || 'none',
          perUnitPrice: product.unitPrice?.toString() || '',
          purchasePrice: product.unitPrice?.toString() || '',
          salesPrice: product.salesPrice?.toString() || '',
          mrp: product.mrp || '',
          minStockLevel: product.minStockLevel?.toString() || '',
          maxStockLevel: product.maxStockLevel?.toString() || '',
          openingStock: product.currentStock?.toString() || '',
          preferredSupplier: product.supplier || '',
          location: product.location || 'Primary Address',
          productImage: product.image || null,
          batchNumber: product.batchNumber || '',
          expiryDate: '',
          showAdvancedOptions: false,
        });
      } catch (error) {
        console.error('❌ Error parsing product data for edit:', error);
      }
    }
  }, [editMode, productData]);

  useEffect(() => {
    // Auto-fill supplier if passed from stock in
    if (supplierId && typeof supplierId === 'string') {
      setFormData(prev => ({
        ...prev,
        preferredSupplier: supplierId
      }));
    }
  }, [supplierId]);

  // Subscribe to data store changes for suppliers
  useEffect(() => {
    const unsubscribe = dataStore.subscribe(() => {
      const allSuppliers = dataStore.getSuppliers();
      mockSuppliers = allSuppliers.map((supplier: StoreSupplier) => ({
        id: supplier.id,
        name: supplier.businessName || supplier.name,
        type: supplier.supplierType,
      }));
    });

    // Initial load
    const allSuppliers = dataStore.getSuppliers();
    mockSuppliers = allSuppliers.map((supplier: StoreSupplier) => ({
      id: supplier.id,
      name: supplier.businessName || supplier.name,
      type: supplier.supplierType,
    }));

    return unsubscribe;
  }, []);

  // Handle new supplier from add supplier page
  // This preserves all existing form data when returning from adding a supplier
  useEffect(() => {
    if (newSupplier && typeof newSupplier === 'string') {
      try {
        const supplierData = JSON.parse(newSupplier);
        // Add the new supplier to the mock suppliers list
        mockSuppliers.push({
          id: supplierData.id,
          name: supplierData.businessName,
          type: 'business'
        });
        // Set the new supplier as preferred supplier without losing other form data
        setFormData(prev => ({
          ...prev,
          preferredSupplier: supplierData.id
        }));
      } catch (error) {
        console.error('Error parsing new supplier data:', error);
      }
    }
  }, [newSupplier]);

  const updateFormData = (field: keyof ProductFormData, value: string | number | boolean | null) => {
    // Silent update - no logging at all
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (category: string) => {
    if (category === 'Add New Category') {
      setShowCategoryModal(false);
      setShowAddCategoryModal(true);
      return;
    }
    setFormData(prev => ({ 
      ...prev, 
      category: category,
      customCategory: category === 'Others' ? prev.customCategory : ''
    }));
    setShowCategoryModal(false);
  };

  const handleAddNewCategory = () => {
    if (newCategoryName.trim()) {
      // Add new category to the list
      categories.push(newCategoryName.trim());
      setFormData(prev => ({ 
        ...prev, 
        category: newCategoryName.trim(),
        customCategory: ''
      }));
      setNewCategoryName('');
      setShowAddCategoryModal(false);
    }
  };

  const handleUnitSelect = (unit: string) => {
    setFormData(prev => ({ ...prev, primaryUnit: unit }));
    setShowUnitModal(false);
    setPrimaryUnitSearch('');
  };

  const handleSecondaryUnitSelect = (unit: string) => {
    setFormData(prev => ({ ...prev, secondaryUnit: unit }));
    setShowSecondaryUnitModal(false);
    setSecondaryUnitSearch('');
  };

  const handleTertiaryUnitSelect = (unit: string) => {
    setFormData(prev => ({ ...prev, tertiaryUnit: unit }));
    setShowTertiaryUnitModal(false);
    setTertiaryUnitSearch('');
  };

  const handleTaxRateSelect = (rate: number) => {
    setFormData(prev => ({ ...prev, taxRate: rate }));
    setShowTaxModal(false);
  };

  const handleCessTypeSelect = (type: 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp') => {
    setFormData(prev => ({ ...prev, cessType: type }));
    setShowCessTypeModal(false);
    // Show cess amount/rate modal after type selection if not 'none'
    if (type !== 'none') {
      setTimeout(() => setShowCessAmountModal(true), 300);
    }
  };

  const handleCessAmountSubmit = (amount: string) => {
    setFormData(prev => ({ ...prev, cessAmount: amount }));
    setShowCessAmountModal(false);
  };

  const handleUnitTypeSelect = (useCompound: boolean) => {
    setFormData(prev => ({ 
      ...prev, 
      useCompoundUnit: useCompound,
      secondaryUnit: useCompound ? prev.secondaryUnit : 'None'
    }));
    setShowUnitTypeModal(false);
  };

  const handleConversionSubmit = (ratio: string) => {
    setFormData(prev => ({ ...prev, conversionRatio: ratio }));
    setShowConversionModal(false);
  };

  const handleSupplierSelect = (supplierId: string) => {
    setFormData(prev => ({ ...prev, preferredSupplier: supplierId }));
    setShowSupplierModal(false);
  };

  const handleLocationSelect = (location: string) => {
    setFormData(prev => ({ ...prev, location: location }));
    setShowLocationModal(false);
  };

  const handleImageSelect = (type: 'camera' | 'gallery') => {
    // Mock image selection
    const mockImage = 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=400&h=400&dpr=1';
    setFormData(prev => ({ ...prev, productImage: mockImage }));
    setShowImageModal(false);
  };

  const handlePriceChange = (field: 'purchasePrice' | 'salesPrice' | 'mrp' | 'perUnitPrice', text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length <= 2 && parts[0].length <= 8) {
      updateFormData(field, cleaned);
    }
  };

  // Helper function to calculate base price from tax-inclusive price (with GST and CESS)
  const calculateBasePriceFromTaxInclusive = (
    inclusivePrice: number, 
    taxRate: number, 
    cessType: 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp', 
    cessRate: number = 0, 
    cessAmount: number = 0, 
    mrp: number = 0
  ): number => {
    const gstRate = taxRate / 100;
    const cessRateDecimal = cessRate / 100;
    
    // Use MRP if provided, otherwise use inclusive price as fallback
    const effectiveMRP = mrp > 0 ? mrp : inclusivePrice;
    
    let basePrice = 0;
    
    switch (cessType) {
      case 'value':
        // P = B * (1 + g + c_val)
        // B = P / (1 + g + c_val)
        basePrice = inclusivePrice / (1 + gstRate + cessRateDecimal);
        break;
        
      case 'quantity':
        // P = B * (1 + g) + c_qty * n
        // B = (P - c_qty * n) / (1 + g)
        // For single unit calculation, n = 1
        basePrice = (inclusivePrice - cessAmount) / (1 + gstRate);
        break;
        
      case 'value_and_quantity':
        // P = B * (1 + g + c_val) + c_qty * n
        // B = (P - c_qty * n) / (1 + g + c_val)
        // For single unit calculation, n = 1
        basePrice = (inclusivePrice - cessAmount) / (1 + gstRate + cessRateDecimal);
        break;
        
      case 'mrp':
        // P = B * (1 + g) + c_mrp * M
        // B = (P - c_mrp * M) / (1 + g)
        basePrice = (inclusivePrice - cessRateDecimal * effectiveMRP) / (1 + gstRate);
        break;
        
      default:
        // No CESS, only GST
        // P = B * (1 + g)
        // B = P / (1 + g)
        basePrice = inclusivePrice / (1 + gstRate);
        break;
    }
    
    return Math.max(0, basePrice); // Ensure base price is not negative
  };

  // Helper function to calculate tax-exclusive price from tax-inclusive price (simple GST only)
  const calculateTaxExclusivePrice = (inclusivePrice: number, taxRate: number): number => {
    return inclusivePrice / (1 + (taxRate / 100));
  };

  // Helper function to calculate tax-inclusive price from tax-exclusive price
  const calculateTaxInclusivePrice = (exclusivePrice: number, taxRate: number): number => {
    return exclusivePrice * (1 + (taxRate / 100));
  };

  // Helper function to calculate tax and CESS breakdown from base price
  const calculateTaxAndCessBreakdown = (
    basePrice: number,
    taxRate: number,
    cessType: 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp',
    cessRate: number = 0,
    cessAmount: number = 0,
    mrp: number = 0
  ) => {
    const gstRate = taxRate / 100;
    const cessRateDecimal = cessRate / 100;
    
    // Calculate GST
    const gstAmount = basePrice * gstRate;
    const cgstAmount = gstAmount / 2;
    const sgstAmount = gstAmount / 2;
    
    // Calculate CESS based on type
    let cessTotal = 0;
    let cessBreakdown = '';
    
    switch (cessType) {
      case 'value':
        cessTotal = basePrice * cessRateDecimal;
        cessBreakdown = `Value-based (${cessRate}% of ₹${basePrice.toFixed(2)})`;
        break;
        
      case 'quantity':
        cessTotal = cessAmount; // For single unit
        cessBreakdown = `Quantity-based (₹${cessAmount.toFixed(2)} per unit)`;
        break;
        
      case 'value_and_quantity':
        const valueCess = basePrice * cessRateDecimal;
        const quantityCess = cessAmount; // For single unit
        cessTotal = valueCess + quantityCess;
        cessBreakdown = `Value + Quantity (${cessRate}% + ₹${cessAmount.toFixed(2)} per unit)`;
        break;
        
      case 'mrp':
        const effectiveMRP = mrp > 0 ? mrp : basePrice;
        cessTotal = effectiveMRP * cessRateDecimal;
        cessBreakdown = `MRP-based (${cessRate}% of MRP ₹${effectiveMRP.toFixed(2)})`;
        break;
        
      default:
        cessTotal = 0;
        cessBreakdown = 'No CESS';
        break;
    }
    
    const total = basePrice + gstAmount + cessTotal;
    
    return {
      basePrice,
      gstAmount,
      cgstAmount,
      sgstAmount,
      cessTotal,
      cessBreakdown,
      total,
      breakdown: {
        base: basePrice,
        gst: gstAmount,
        cess: cessTotal,
        total: total
      }
    };
  };

  // Helper function to get display prices based on tax inclusion toggle
  const getDisplayPrices = () => {
    const perUnitPrice = parseFloat(formData.perUnitPrice) || 0;
    const salesPrice = parseFloat(formData.salesPrice) || 0;
    const taxRate = formData.taxRate;
    const cessType = formData.cessType || 'none';
    const cessRate = formData.cessRate || 0;
    const cessAmount = parseFloat(formData.cessAmount) || 0;
    const mrp = parseFloat(formData.mrp) || 0;

    if (formData.taxInclusive) {
      // Prices entered are inclusive, calculate base price and breakdown
      const perUnitBasePrice = calculateBasePriceFromTaxInclusive(
        perUnitPrice, 
        taxRate, 
        cessType, 
        cessRate, 
        cessAmount, 
        mrp
      );
      
      const salesBasePrice = calculateBasePriceFromTaxInclusive(
        salesPrice, 
        taxRate, 
        cessType, 
        cessRate, 
        cessAmount, 
        mrp
      );
      
      // Calculate full breakdown for display
      const perUnitBreakdown = calculateTaxAndCessBreakdown(
        perUnitBasePrice,
        taxRate,
        cessType,
        cessRate,
        cessAmount,
        mrp
      );
      
      const salesBreakdown = calculateTaxAndCessBreakdown(
        salesBasePrice,
        taxRate,
        cessType,
        cessRate,
        cessAmount,
        mrp
      );
      
      return {
        perUnitBasePrice,
        salesBasePrice,
        perUnitFinalPrice: perUnitPrice,
        salesFinalPrice: salesPrice,
        perUnitBreakdown,
        salesBreakdown,
        showCalculation: true
      };
    } else {
      // Prices entered are exclusive, calculate inclusive for display
      return {
        perUnitBasePrice: perUnitPrice,
        salesBasePrice: salesPrice,
        perUnitFinalPrice: calculateTaxInclusivePrice(perUnitPrice, taxRate),
        salesFinalPrice: calculateTaxInclusivePrice(salesPrice, taxRate),
        showCalculation: true
      };
    }
  };

  const handleStockChange = (field: 'minStockLevel' | 'maxStockLevel' | 'openingStock', text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    updateFormData(field, cleaned);
  };

  const isFormValid = () => {
    // Basic validation
    const basicValidation = (
      formData.name.trim().length > 0 &&
      formData.category.trim().length > 0 &&
      formData.hsnCode.trim().length > 0 &&
      formData.barcode.trim().length > 0 &&
      formData.perUnitPrice.trim().length > 0 &&
      formData.salesPrice.trim().length > 0 &&
      formData.openingStock.trim().length > 0 &&
      formData.minStockLevel.trim().length > 0 &&
      formData.maxStockLevel.trim().length > 0
    );

    // Compound UoM validation
    if (formData.useCompoundUnit) {
      if (!formData.secondaryUnit || formData.secondaryUnit === 'None') {
        return false;
      }
      if (!formData.conversionRatio || formData.conversionRatio.trim().length === 0) {
        return false;
      }
      
      // Tertiary unit validation if enabled
      if (formData.showAdvancedOptions && formData.tertiaryUnit && formData.tertiaryUnit !== 'None') {
        if (!formData.tertiaryConversionRatio || formData.tertiaryConversionRatio.trim().length === 0) {
          return false;
        }
      }
    }

    return basicValidation;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }

    // Validate per unit price is lower than sale price
    const perUnitPrice = parseFloat(formData.perUnitPrice);
    const salePrice = parseFloat(formData.salesPrice);
    
    if (perUnitPrice >= salePrice) {
      Alert.alert(
        'Invalid Pricing', 
        'Per unit price must be lower than sale price to ensure profitability.',
        [{ text: 'OK' }]
      );
      return;
    }

    setIsSubmitting(true);

    const productData: Product = {
      id: editMode === 'true' && productId ? (productId as string) : `PROD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name.trim(),
      image: formData.productImage || 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
      category: formData.category || formData.customCategory.trim(),
      hsnCode: formData.hsnCode.trim(),
      barcode: formData.barcode.trim(),
      taxRate: formData.taxRate,
      taxInclusive: formData.taxInclusive, // Include tax inclusion setting
      primaryUnit: formData.primaryUnit,
      secondaryUnit: formData.secondaryUnit !== 'None' ? formData.secondaryUnit : undefined,
      tertiaryUnit: formData.tertiaryUnit !== 'None' ? formData.tertiaryUnit : undefined,
      conversionRatio: formData.conversionRatio || undefined,
      tertiaryConversionRatio: formData.tertiaryConversionRatio || undefined,
      unitPrice: parseFloat(formData.perUnitPrice),
      salesPrice: parseFloat(formData.salesPrice),
      minStockLevel: parseInt(formData.minStockLevel),
      maxStockLevel: parseInt(formData.maxStockLevel),
      currentStock: parseInt(formData.openingStock),
      supplier: formData.preferredSupplier,
      location: formData.location,
      lastRestocked: new Date().toISOString(),
      stockValue: parseFloat(formData.perUnitPrice) * parseInt(formData.openingStock),
      urgencyLevel: 'normal',
      batchNumber: formData.batchNumber || '',
      openingStock: parseInt(formData.openingStock),
      // Additional fields
      mrp: formData.mrp || '',
      brand: '',
      description: '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      // CESS fields
      cessType: formData.cessType,
      cessRate: formData.cessRate,
      cessAmount: parseFloat(formData.cessAmount) || 0,
      cessUnit: formData.cessUnit,
    };

    if (editMode === 'true' && productId) {
      // Update existing product
      console.log('Updating existing product:', productData);
      productStore.updateProduct(productId as string, productData);
      console.log('Product updated in store');
    } else {
      // Create new product
      console.log('Creating new product:', productData);
      productStore.addProduct(productData);
      console.log('Product added to store. Total products:', productStore.getProductCount());
    }
    
    setTimeout(() => {
      if (returnToStockIn === 'true') {
        // Return to stock in with the new product data
        const stockInProductData = {
          id: productData.id,
          name: productData.name,
          price: productData.unitPrice,
          gstRate: productData.taxRate,
          cessRate: parseFloat(formData.cessAmount) || 0,
          cessType: formData.cessType,
          cessAmount: parseFloat(formData.cessAmount) || 0,
        };
        
        Alert.alert('Success', editMode === 'true' ? 'Product updated successfully. Returning to stock in...' : 'Product added successfully. Returning to stock in...', [
          {
            text: 'OK',
            onPress: () => {
              // Navigate back to stock in with product data
              router.push({
                pathname: '/inventory/stock-in/manual',
                params: {
                  newProduct: JSON.stringify(stockInProductData)
                }
              });
            }
          }
        ]);
      } else if (returnTo === 'new-sale') {
        // Return to new sale with the new product added to cart
        Alert.alert('Success', editMode === 'true' ? 'Product updated successfully' : 'Product added to inventory and cart successfully', [
          {
            text: 'OK',
            onPress: () => {
              if (editMode === 'true') {
                // Go back to product details page after edit
                router.back();
              } else {
                // Clear the form data to prevent showing completed form
                setFormData({
                  name: '',
                  category: '',
                  customCategory: '',
                  hsnCode: '',
                  barcode: '',
                  taxRate: 18,
                  taxInclusive: false,
                  cessRate: 0,
                  cessAmount: '',
                  cessUnit: '',
                  primaryUnit: 'Piece',
                  secondaryUnit: 'None',
                  useCompoundUnit: false,
                  conversionRatio: '',
                  tertiaryUnit: 'None',
                  tertiaryConversionRatio: '',
                  priceUnit: 'primary',
                  stockUoM: 'primary',
                  cessType: 'none',
                  perUnitPrice: '',
                  purchasePrice: '',
                  salesPrice: '',
                  mrp: '',
                  minStockLevel: '',
                  maxStockLevel: '',
                  openingStock: '',
                  preferredSupplier: '',
                  location: 'Primary Address',
                  productImage: null,
                  batchNumber: '',
                  expiryDate: '',
                  showAdvancedOptions: false,
                });
                
                // Clear auto-filled fields
                setAutoFilledFields(new Set());
                
                // Clear scanned data from store
                clearScannedData();
                
                // Navigate to cart and replace the current screen
                router.replace({
                  pathname: '/new-sale/cart',
                  params: {
                    selectedProducts: JSON.stringify([{
                      ...productData,
                      quantity: 1,
                      price: productData.salesPrice,
                      // Ensure CESS fields are passed
                      cessType: productData.cessType || 'none',
                      cessRate: productData.cessRate || 0,
                      cessAmount: productData.cessAmount || 0,
                      cessUnit: productData.cessUnit || ''
                    }]),
                    preSelectedCustomer: preSelectedCustomer
                  }
                });
              }
            }
          }
        ]);
      } else if (returnTo === 'cart') {
        // Return to cart with the new product added
        Alert.alert('Success', editMode === 'true' ? 'Product updated successfully' : 'Product added to inventory and cart successfully', [
          {
            text: 'OK',
            onPress: () => {
              if (editMode === 'true') {
                // Go back to product details page after edit
                router.back();
              } else {
                // Clear the form data to prevent showing completed form
                setFormData({
                  name: '',
                  category: '',
                  customCategory: '',
                  hsnCode: '',
                  barcode: '',
                  taxRate: 18,
                  taxInclusive: false,
                  cessRate: 0,
                  cessAmount: '',
                  cessUnit: '',
                  primaryUnit: 'Piece',
                  secondaryUnit: 'None',
                  useCompoundUnit: false,
                  conversionRatio: '',
                  tertiaryUnit: 'None',
                  tertiaryConversionRatio: '',
                  priceUnit: 'primary',
                  stockUoM: 'primary',
                  cessType: 'none',
                  perUnitPrice: '',
                  purchasePrice: '',
                  salesPrice: '',
                  mrp: '',
                  minStockLevel: '',
                  maxStockLevel: '',
                  openingStock: '',
                  preferredSupplier: '',
                  location: 'Primary Address',
                  productImage: null,
                  batchNumber: '',
                  expiryDate: '',
                  showAdvancedOptions: false,
                });
                
                // Clear auto-filled fields
                setAutoFilledFields(new Set());
                
                // Clear scanned data from store
                clearScannedData();
                
                // Navigate to cart and replace the current screen
                router.replace({
                  pathname: '/new-sale/cart',
                  params: {
                    newProduct: JSON.stringify({
                      ...productData,
                      // Ensure CESS fields are passed
                      cessType: productData.cessType || 'none',
                      cessRate: productData.cessRate || 0,
                      cessAmount: productData.cessAmount || 0,
                      cessUnit: productData.cessUnit || ''
                    }),
                    preSelectedCustomer: preSelectedCustomer
                  }
                });
              }
            }
          }
        ]);
      } else {
        Alert.alert('Success', editMode === 'true' ? 'Product updated successfully' : 'Product added to inventory successfully', [
          {
            text: 'OK',
            onPress: () => {
              if (editMode === 'true') {
                // Go back to product details page after edit
                router.back();
              } else {
                // Clear the form data to prevent showing completed form
                setFormData({
                  name: '',
                  category: '',
                  customCategory: '',
                  hsnCode: '',
                  barcode: '',
                  taxRate: 18,
                  taxInclusive: false,
                  cessRate: 0,
                  cessAmount: '',
                  cessUnit: '',
                  primaryUnit: 'Piece',
                  secondaryUnit: 'None',
                  useCompoundUnit: false,
                  conversionRatio: '',
                  tertiaryUnit: 'None',
                  tertiaryConversionRatio: '',
                  priceUnit: 'primary',
                  stockUoM: 'primary',
                  cessType: 'none',
                  perUnitPrice: '',
                  purchasePrice: '',
                  salesPrice: '',
                  mrp: '',
                  minStockLevel: '',
                  maxStockLevel: '',
                  openingStock: '',
                  preferredSupplier: '',
                  location: 'Primary Address',
                  productImage: null,
                  batchNumber: '',
                  expiryDate: '',
                  showAdvancedOptions: false,
                });
                
                // Clear auto-filled fields
                setAutoFilledFields(new Set());
                
                // Clear scanned data from store
                clearScannedData();
                
                // Navigate back and trigger refresh
                router.back();
                // Add a small delay to ensure navigation completes
                setTimeout(() => {
                  console.log('=== PRODUCT ADDED - NAVIGATING BACK ===');
                  console.log('Total products in store:', productStore.getProductCount());
                  console.log('==========================================');
                }, 100);
              }
            }
          }
        ]);
      }
      setIsSubmitting(false);
    }, 1000);
  };

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredSuppliers = mockSuppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const filteredLocations = storageLocations.filter(location =>
    location.toLowerCase().includes(locationSearch.toLowerCase())
  );

  const getSupplierName = (supplierId: string) => {
    const supplier = mockSuppliers.find(s => s.id === supplierId);
    return supplier ? supplier.name : 'Unknown Supplier';
  };



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
          
          <Text style={styles.headerTitle}>
            {editMode === 'true' ? 'Edit Product' : (isScanned === 'true' ? 'Complete Product Details' : 'Add New Product')}
          </Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Quick Barcode Entry */}
          <View style={styles.section}>
            <TouchableOpacity
              style={styles.barcodeScanButton}
              onPress={() => {
                // Navigate to scanner with current form context
                router.push({
                  pathname: '/new-sale/scanner',
                  params: {
                    returnTo: 'manual-product',
                    preSelectedCustomer: preSelectedCustomer,
                    currentFormData: JSON.stringify(formData), // Pass current form state
                    formId: Date.now().toString() // Unique form identifier
                  }
                });
              }}
              activeOpacity={0.7}
            >
              <Barcode size={24} color={Colors.primary} />
              <Text style={styles.barcodeScanButtonText}>Scan Barcode to Add Product</Text>
              <Camera size={24} color={Colors.primary} />
            </TouchableOpacity>
            

          </View>

          {/* Preferred Supplier & Location - Moved to top for better flow */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Preferred Supplier & Location</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Preferred Supplier</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowSupplierModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dropdownText,
                  !formData.preferredSupplier && styles.placeholderText
                ]}>
                  {formData.preferredSupplier ? getSupplierName(formData.preferredSupplier) : 'Select preferred supplier'}
                </Text>
                <ChevronDown size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Storage Location</Text>
              <View style={styles.locationContainer}>
                <Text style={styles.locationText}>Primary Address</Text>
                <Text style={styles.comingSoonText}>Other locations coming soon</Text>
              </View>
            </View>
          </View>

          {/* Product Image */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Image</Text>
            
            {formData.productImage ? (
              <View style={styles.imagePreview}>
                <Image 
                  source={{ uri: formData.productImage }}
                  style={styles.productImagePreview}
                />
                <TouchableOpacity
                  style={styles.changeImageButton}
                  onPress={() => setShowImageModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.changeImageText}>Change Image</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={() => setShowImageModal(true)}
                activeOpacity={0.7}
              >
                <Camera size={24} color={Colors.primary} />
                <Text style={styles.addImageText}>Add Product Image</Text>
              </TouchableOpacity>
            )}
          </View>



          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <View style={[
                styles.inputContainer,
                autoFilledFields.has('name') && styles.autoFilledInput
              ]}>
                <Package size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  key={`name-${forceUpdate}`}
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => updateFormData('name', text)}
                  placeholder="Enter product name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                />
                {autoFilledFields.has('name') && (
                  <Text style={styles.autoFilledBadge}>✓ Auto-filled</Text>
                )}
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              {formData.category === 'Others' ? (
                <View style={styles.customInputContainer}>
                  <View style={styles.inputContainer}>
                    <TextInput
                      key={`customCategory-${forceUpdate}`}
                      style={styles.input}
                      value={formData.customCategory}
                      onChangeText={(text) => updateFormData('customCategory', text)}
                      placeholder="Enter custom category"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="words"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.changeButton}
                    onPress={() => setShowCategoryModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.changeButtonText}>Change</Text>
                  </TouchableOpacity>
                </View>
              ) : (
                <TouchableOpacity
                  key={`category-${forceUpdate}`}
                  style={styles.dropdown}
                  onPress={() => setShowCategoryModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.dropdownText,
                    !formData.category && styles.placeholderText
                  ]}>
                    {formData.category || 'Select category'}
                  </Text>
                  <ChevronDown size={20} color={Colors.textLight} />
                </TouchableOpacity>
              )}
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>HSN Code *</Text>
              <View style={styles.inputContainer}>
                <Hash size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.hsnCode}
                  onChangeText={(text) => updateFormData('hsnCode', text.replace(/\D/g, '').slice(0, 8))}
                  placeholder="Enter HSN code"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={8}
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Barcode</Text>
              <View style={[
                styles.inputContainer,
                autoFilledFields.has('barcode') && styles.autoFilledInput
              ]}>
                <Barcode size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  key={`barcode-${forceUpdate}`}
                  style={styles.input}
                  value={formData.barcode}
                  onChangeText={(text) => updateFormData('barcode', text)}
                  placeholder="Enter barcode number"
                  placeholderTextColor={Colors.textLight}
                />
                {autoFilledFields.has('barcode') && (
                  <Text style={styles.autoFilledBadge}>✓ Auto-filled</Text>
                )}
              </View>
            </View>





            {/* Advanced Options Toggle */}
            <TouchableOpacity
              style={[styles.advancedToggle, formData.showAdvancedOptions && styles.advancedToggleActive]}
              onPress={() => updateFormData('showAdvancedOptions', !formData.showAdvancedOptions)}
              activeOpacity={0.7}
            >
              <Text style={[styles.advancedToggleText, formData.showAdvancedOptions && styles.advancedToggleTextActive]}>
                {formData.showAdvancedOptions ? 'Hide Advanced Options' : 'Show Advanced Options'}
              </Text>
            </TouchableOpacity>

            {/* Advanced Options Fields */}
            {formData.showAdvancedOptions && (
              <View style={styles.advancedOptionsContainer}>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Batch Number</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={formData.batchNumber}
                      onChangeText={(text) => updateFormData('batchNumber', text)}
                      placeholder="Enter batch number"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="characters"
                    />
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Expiry Date</Text>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      value={formData.expiryDate}
                      onChangeText={(text) => updateFormData('expiryDate', text)}
                      placeholder="YYYY-MM-DD"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      maxLength={10}
                    />
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Units of Measurement */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Units of Measurement</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Unit Type *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowUnitTypeModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownText}>
                  {formData.useCompoundUnit ? 'Compound Unit (Primary + Secondary)' : 'Primary Unit Only'}
                </Text>
                <ChevronDown size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Primary Unit *</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowUnitModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownText}>
                    {formData.primaryUnit}
                  </Text>
                  <ChevronDown size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>

              {formData.useCompoundUnit && (
                <View style={[styles.inputGroup, styles.halfWidth]}>
                  <Text style={styles.label}>Secondary Unit</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowSecondaryUnitModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownText}>
                      {formData.secondaryUnit}
                    </Text>
                    <ChevronDown size={20} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
              )}
            </View>

            {formData.useCompoundUnit && formData.secondaryUnit !== 'None' && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Conversion Ratio</Text>
                <TouchableOpacity
                  style={styles.dropdown}
                  onPress={() => setShowConversionModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.dropdownText}>
                    {formData.conversionRatio || 'Set conversion ratio'}
                  </Text>
                  <ChevronDown size={20} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
            )}

            {/* Advanced Unit Options */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Advanced Unit Options</Text>
              <TouchableOpacity
                style={[styles.advancedToggle, formData.showAdvancedOptions && styles.advancedToggleActive]}
                onPress={() => updateFormData('showAdvancedOptions', !formData.showAdvancedOptions)}
                activeOpacity={0.7}
              >
                <Text style={[styles.advancedToggleText, formData.showAdvancedOptions && styles.advancedToggleTextActive]}>
                  {formData.showAdvancedOptions ? 'Hide Advanced Unit Options' : 'Show Advanced Unit Options'}
                </Text>
              </TouchableOpacity>
            </View>

            {/* Advanced Unit Fields */}
            {formData.showAdvancedOptions && (
              <View style={styles.advancedOptionsContainer}>
                {/* Tertiary Unit Option */}
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Tertiary Unit</Text>
                  <TouchableOpacity
                    style={styles.dropdown}
                    onPress={() => setShowTertiaryUnitModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.dropdownText}>
                      {formData.tertiaryUnit}
                    </Text>
                    <ChevronDown size={20} color={Colors.textLight} />
                  </TouchableOpacity>
                </View>
                
                {formData.tertiaryUnit !== 'None' && (
                  <View style={styles.inputGroup}>
                    <Text style={styles.label}>Tertiary Conversion Ratio</Text>
                    <TouchableOpacity
                      style={styles.dropdown}
                      onPress={() => setShowTertiaryConversionModal(true)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.dropdownText}>
                        {formData.tertiaryConversionRatio || 'Set tertiary conversion ratio'}
                      </Text>
                      <ChevronDown size={20} color={Colors.textLight} />
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Tax Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Tax Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Tax Rate *</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowTaxModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownText}>
                  {formData.taxRate}% GST
                </Text>
                <ChevronDown size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>



            <View style={styles.inputGroup}>
              <Text style={styles.label}>CESS Calculation</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowCessTypeModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownText}>
                  {formData.cessType === 'none' ? 'No CESS' : 
                   formData.cessType === 'value' ? `Value Based (${formData.cessRate}%)` :
                   formData.cessType === 'quantity' ? `Quantity Based (₹${formData.cessAmount}/${formData.cessUnit || 'unit'})` :
                   formData.cessType === 'value_and_quantity' ? `Value & Quantity (${formData.cessRate}% + ₹${formData.cessAmount}/${formData.cessUnit || 'unit'})` :
                   formData.cessType === 'mrp' ? `MRP Based (${formData.cessRate}%)` :
                   'Select CESS calculation method'
                  }
                </Text>
                <ChevronDown size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Stock Management */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Stock Management</Text>
            
            {/* Stock UoM Selector - Only show for compound units, placed above opening stock */}
            {formData.useCompoundUnit && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Stock Unit *</Text>
                <Text style={styles.inputHint}>
                  Select the unit you're providing stock in
                </Text>
                <View style={styles.stockUoMContainer}>
                  <TouchableOpacity
                    style={[
                      styles.stockUoMButton,
                      formData.stockUoM === 'primary' && styles.activeStockUoMButton
                    ]}
                    onPress={() => updateFormData('stockUoM', 'primary')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.stockUoMButtonText,
                      formData.stockUoM === 'primary' && styles.activeStockUoMButtonText
                    ]}>
                      {formData.primaryUnit}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.stockUoMButton,
                      formData.stockUoM === 'secondary' && styles.activeStockUoMButton
                    ]}
                    onPress={() => updateFormData('stockUoM', 'secondary')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.stockUoMButtonText,
                      formData.stockUoM === 'secondary' && styles.activeStockUoMButtonText
                    ]}>
                      {formData.secondaryUnit}
                    </Text>
                  </TouchableOpacity>
                  {formData.tertiaryUnit !== 'None' && (
                    <TouchableOpacity
                      style={[
                        styles.stockUoMButton,
                        formData.stockUoM === 'tertiary' && styles.activeStockUoMButton
                      ]}
                      onPress={() => updateFormData('stockUoM', 'tertiary')}
                      activeOpacity={0.7}
                    >
                      <Text style={[
                        styles.stockUoMButtonText,
                        formData.stockUoM === 'tertiary' && styles.activeStockUoMButtonText
                      ]}>
                        {formData.tertiaryUnit}
                      </Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            )}
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Opening Stock *
                {formData.useCompoundUnit && (
                  <Text style={styles.unitIndicator}> (in {
                    formData.stockUoM === 'primary' ? formData.primaryUnit :
                    formData.stockUoM === 'secondary' ? formData.secondaryUnit :
                    formData.tertiaryUnit
                  })</Text>
                )}
              </Text>
              <View style={styles.inputContainer}>
                <TextInput
                  style={styles.input}
                  value={formData.openingStock}
                  onChangeText={(text) => handleStockChange('openingStock', text)}
                  placeholder="Enter opening stock quantity"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Min Stock Level *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={formData.minStockLevel}
                    onChangeText={(text) => handleStockChange('minStockLevel', text)}
                    placeholder="Min level"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Max Stock Level *</Text>
                <View style={styles.inputContainer}>
                  <TextInput
                    style={styles.input}
                    value={formData.maxStockLevel}
                    onChangeText={(text) => handleStockChange('maxStockLevel', text)}
                    placeholder="Max level"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
                  />
                </View>
              </View>
            </View>
          </View>

                     {/* Pricing */}
           <View style={styles.section}>
             <Text style={styles.sectionTitle}>Pricing</Text>
             
             {/* Tax Inclusion Explanation */}
             <View style={styles.taxExplanationContainer}>
               <Text style={styles.taxExplanationTitle}>Tax-Inclusive vs Tax-Exclusive Pricing</Text>
               <Text style={styles.taxExplanationText}>
                 <Text style={styles.taxExplanationBold}>Tax-Exclusive:</Text> Enter base price, taxes added on top{'\n'}
                 <Text style={styles.taxExplanationBold}>Tax-Inclusive:</Text> Enter final price, system calculates base price{'\n\n'}
                 <Text style={styles.taxExplanationBold}>Note:</Text> All tax calculations are done automatically behind the scenes.
               </Text>
             </View>
            
            {/* Tax Inclusion Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Price Includes Tax</Text>
              <View style={styles.taxToggleContainer}>
                <TouchableOpacity
                  style={[
                    styles.taxToggleButton,
                    !formData.taxInclusive && styles.taxToggleButtonActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, taxInclusive: false }))}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.taxToggleText,
                    !formData.taxInclusive && styles.taxToggleTextActive
                  ]}>
                    Tax Exclusive
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[
                    styles.taxToggleButton,
                    formData.taxInclusive && styles.taxToggleButtonActive
                  ]}
                  onPress={() => setFormData(prev => ({ ...prev, taxInclusive: true }))}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.taxToggleText,
                    formData.taxInclusive && styles.taxToggleTextActive
                  ]}>
                    Tax Inclusive
                  </Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Per Unit Price Input - Always Show */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Per Unit Price * 
                <Text style={styles.unitIndicator}>
                  {formData.useCompoundUnit 
                    ? ` (in ${formData.priceUnit === 'primary' ? formData.primaryUnit : formData.secondaryUnit})`
                    : ` (in ${formData.primaryUnit})`
                  }
                </Text>
              </Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.input}
                  value={formData.perUnitPrice}
                  onChangeText={(text) => handlePriceChange('perUnitPrice', text)}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            
            {formData.useCompoundUnit && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price Unit *</Text>
                <View style={styles.priceUnitContainer}>
                  <TouchableOpacity
                    style={[
                      styles.priceUnitButton,
                      formData.priceUnit === 'primary' && styles.activePriceUnitButton
                    ]}
                    onPress={() => updateFormData('priceUnit', 'primary')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.priceUnitButtonText,
                      formData.priceUnit === 'primary' && styles.activePriceUnitButtonText
                    ]}>
                      Per {formData.primaryUnit}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.priceUnitButton,
                      formData.priceUnit === 'secondary' && styles.activePriceUnitButton
                    ]}
                    onPress={() => updateFormData('priceUnit', 'secondary')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.priceUnitButtonText,
                      formData.priceUnit === 'secondary' && styles.activePriceUnitButtonText
                    ]}>
                      Per {formData.secondaryUnit}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Sales Price *</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.input}
                  value={formData.salesPrice}
                  onChangeText={(text) => handlePriceChange('salesPrice', text)}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>MRP (Maximum Retail Price)</Text>
              <View style={styles.inputContainer}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={styles.input}
                  value={formData.mrp}
                  onChangeText={(text) => handlePriceChange('mrp', text)}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            {formData.perUnitPrice && formData.salesPrice && (
              <>
                {parseFloat(formData.perUnitPrice) >= parseFloat(formData.salesPrice) ? (
                  <View style={[styles.marginContainer, styles.warningContainer]}>
                    <Text style={styles.warningText}>⚠️ Per unit price should be lower than sale price</Text>
                  </View>
                ) : (
                  <View style={styles.marginContainer}>
                    <Text style={styles.marginLabel}>Profit Margin:</Text>
                    <Text style={styles.marginValue}>
                      {((parseFloat(formData.salesPrice) - parseFloat(formData.perUnitPrice)) / parseFloat(formData.perUnitPrice) * 100).toFixed(1)}%
                    </Text>
                  </View>
                )}
              </>
            )}

                         {/* Tax Calculation Display */}
             {formData.perUnitPrice && formData.taxRate > 0 && (
               <View style={styles.taxCalculationContainer}>
                 <Text style={styles.taxCalculationTitle}>
                   Tax Calculation Summary
                 </Text>
                 
                 {formData.taxInclusive ? (
                   // Show breakdown for tax-inclusive pricing
                   <View style={styles.taxCalculationContent}>
                     <View style={styles.taxCalculationRow}>
                       <View style={styles.taxCalculationColumn}>
                         <Text style={styles.taxCalculationLabel}>Price Entered (Tax-Inclusive):</Text>
                         <Text style={styles.taxCalculationPrimary}>₹{parseFloat(formData.perUnitPrice).toFixed(2)}</Text>
                       </View>
                     </View>
                     
                     <View style={styles.taxCalculationRow}>
                       <View style={styles.taxCalculationColumn}>
                         <Text style={styles.taxCalculationLabel}>Base Price (Before Tax):</Text>
                         <Text style={styles.taxCalculationPrimary}>₹{getDisplayPrices().perUnitBasePrice.toFixed(2)}</Text>

                       </View>
                     </View>
                     
                     <View style={styles.taxCalculationRow}>
                       <View style={styles.taxCalculationColumn}>
                         <Text style={styles.taxCalculationLabel}>GST ({formData.taxRate}%):</Text>
                         <Text style={styles.taxCalculationPrimary}>
                           ₹{((getDisplayPrices().perUnitBasePrice * formData.taxRate) / 100).toFixed(2)}
                         </Text>

                       </View>
                     </View>
                     
                     {formData.cessType !== 'none' && (
                       <View style={styles.taxCalculationRow}>
                         <View style={styles.taxCalculationColumn}>
                           <Text style={styles.taxCalculationLabel}>CESS:</Text>
                           <Text style={styles.taxCalculationPrimary}>
                             ₹{(() => {
                               const basePrice = getDisplayPrices().perUnitBasePrice;
                               switch (formData.cessType) {
                                 case 'value':
                                   return (basePrice * formData.cessRate / 100).toFixed(2);
                                 case 'quantity':
                                   return parseFloat(formData.cessAmount || '0').toFixed(2);
                                 case 'value_and_quantity':
                                   const valueCess = basePrice * formData.cessRate / 100;
                                   const quantityCess = parseFloat(formData.cessAmount || '0');
                                   return (valueCess + quantityCess).toFixed(2);
                                 case 'mrp':
                                   const mrpPrice = parseFloat(formData.mrp) || parseFloat(formData.perUnitPrice);
                                   return (mrpPrice * formData.cessRate / 100).toFixed(2);
                                 default:
                                   return '0.00';
                               }
                             })()}
                           </Text>

                         </View>
                       </View>
                     )}
                     
                     <View style={styles.taxCalculationInfo}>
                       <Text style={styles.taxCalculationInfoText}>
                         All calculations are done automatically behind the scenes
                       </Text>
                     </View>
                   </View>
                 ) : (
                   // Show breakdown for tax-exclusive pricing
                   <View style={styles.taxCalculationContent}>
                     <View style={styles.taxCalculationRow}>
                       <View style={styles.taxCalculationColumn}>
                         <Text style={styles.taxCalculationLabel}>Base Price (Tax-Exclusive):</Text>
                         <Text style={styles.taxCalculationPrimary}>₹{parseFloat(formData.perUnitPrice).toFixed(2)}</Text>
                       </View>
                     </View>
                     
                     <View style={styles.taxCalculationRow}>
                       <View style={styles.taxCalculationColumn}>
                         <Text style={styles.taxCalculationLabel}>GST ({formData.taxRate}%):</Text>
                         <Text style={styles.taxCalculationPrimary}>
                           ₹{((parseFloat(formData.perUnitPrice) * formData.taxRate) / 100).toFixed(2)}
                         </Text>

                       </View>
                     </View>
                     
                     {formData.cessType !== 'none' && (
                       <View style={styles.taxCalculationRow}>
                         <View style={styles.taxCalculationColumn}>
                           <Text style={styles.taxCalculationLabel}>CESS:</Text>
                           <Text style={styles.taxCalculationPrimary}>
                             ₹{(() => {
                               const basePrice = parseFloat(formData.perUnitPrice);
                               switch (formData.cessType) {
                                 case 'value':
                                   return (basePrice * formData.cessRate / 100).toFixed(2);
                                 case 'quantity':
                                   return parseFloat(formData.cessAmount || '0').toFixed(2);
                                 case 'value_and_quantity':
                                   const valueCess = basePrice * formData.cessRate / 100;
                                   const quantityCess = parseFloat(formData.cessAmount || '0');
                                   return (valueCess + quantityCess).toFixed(2);
                                 case 'mrp':
                                   const mrpPrice = parseFloat(formData.mrp) || parseFloat(formData.perUnitPrice);
                                   return (mrpPrice * formData.cessRate / 100).toFixed(2);
                                 default:
                                   return '0.00';
                               }
                             })()}
                           </Text>

                         </View>
                       </View>
                     )}
                     
                     <View style={styles.taxCalculationRow}>
                       <View style={styles.taxCalculationColumn}>
                         <Text style={styles.taxCalculationLabel}>Final Price (Tax-Inclusive):</Text>
                         <Text style={styles.taxCalculationPrimary}>₹{getDisplayPrices().perUnitFinalPrice.toFixed(2)}</Text>
                       </View>
                     </View>
                   </View>
                 )}
               </View>
             )}
            
                         {/* Opening Stock Summary */}
             {formData.perUnitPrice && formData.openingStock && (
               <View style={styles.summaryContainer}>
                 <Text style={styles.summaryTitle}>Opening Stock Summary</Text>
                 
                 {formData.taxInclusive ? (
                   // For tax-inclusive pricing, show breakdown from base price
                   <>
                     <View style={styles.summaryRow}>
                       <Text style={styles.summaryLabel}>Price Entered (Tax-Inclusive):</Text>
                       <Text style={styles.summaryValue}>
                         ₹{(parseFloat(formData.perUnitPrice) * parseInt(formData.openingStock)).toFixed(2)}
                       </Text>
                     </View>
                     <View style={styles.summaryRow}>
                       <Text style={styles.summaryLabel}>Base Price (Before Tax):</Text>
                       <Text style={styles.summaryValue}>
                         ₹{(getDisplayPrices().perUnitBasePrice * parseInt(formData.openingStock)).toFixed(2)}
                       </Text>
                     </View>
                     <View style={styles.summaryRow}>
                       <Text style={styles.summaryLabel}>GST ({formData.taxRate}% of Base Price):</Text>
                       <Text style={styles.summaryValue}>
                         ₹{((getDisplayPrices().perUnitBasePrice * parseInt(formData.openingStock) * formData.taxRate) / 100).toFixed(2)}
                       </Text>
                     </View>
                     {formData.cessType !== 'none' && (
                       <>
                         <View style={styles.summaryRow}>
                           <Text style={styles.summaryLabel}>CESS:</Text>
                           <Text style={styles.summaryValue}>
                             ₹{(() => {
                               const basePrice = getDisplayPrices().perUnitBasePrice * parseInt(formData.openingStock);
                               switch (formData.cessType) {
                                 case 'value':
                                   return (basePrice * formData.cessRate / 100).toFixed(2);
                                 case 'quantity':
                                   return (parseInt(formData.openingStock) * parseFloat(formData.cessAmount || '0')).toFixed(2);
                                 case 'value_and_quantity':
                                   const valueCess = basePrice * formData.cessRate / 100;
                                   const quantityCess = parseInt(formData.openingStock) * parseFloat(formData.cessAmount || '0');
                                   return (valueCess + quantityCess).toFixed(2);
                                 case 'mrp':
                                   const mrpPrice = parseFloat(formData.mrp) * parseInt(formData.openingStock);
                                   return (mrpPrice * formData.cessRate / 100).toFixed(2);
                                 default:
                                   return '0.00';
                               }
                             })()}
                           </Text>
                         </View>

                       </>
                     )}

                   </>
                 ) : (
                   // For tax-exclusive pricing, show normal breakdown
                   <>
                     <View style={styles.summaryRow}>
                       <Text style={styles.summaryLabel}>Base Price (Tax-Exclusive):</Text>
                       <Text style={styles.summaryValue}>
                         ₹{(parseFloat(formData.perUnitPrice) * parseInt(formData.openingStock)).toFixed(2)}
                       </Text>
                     </View>
                     <View style={styles.summaryRow}>
                       <Text style={styles.summaryLabel}>GST ({formData.taxRate}% of Base Price):</Text>
                       <Text style={styles.summaryValue}>
                         ₹{((parseFloat(formData.perUnitPrice) * parseInt(formData.openingStock) * formData.taxRate) / 100).toFixed(2)}
                       </Text>
                     </View>
                     {formData.cessType !== 'none' && (
                       <>
                         <View style={styles.summaryRow}>
                           <Text style={styles.summaryLabel}>CESS:</Text>
                           <Text style={styles.summaryValue}>
                             ₹{(() => {
                               const basePrice = parseFloat(formData.perUnitPrice) * parseInt(formData.openingStock);
                               switch (formData.cessType) {
                                 case 'value':
                                   return (basePrice * formData.cessRate / 100).toFixed(2);
                                 case 'quantity':
                                   return (parseInt(formData.openingStock) * parseFloat(formData.cessAmount || '0')).toFixed(2);
                                 case 'value_and_quantity':
                                   const valueCess = basePrice * formData.cessRate / 100;
                                   const quantityCess = parseInt(formData.openingStock) * parseFloat(formData.cessAmount || '0');
                                   return (valueCess + quantityCess).toFixed(2);
                                 case 'mrp':
                                   const mrpPrice = parseFloat(formData.mrp) * parseInt(formData.openingStock);
                                   return (mrpPrice * formData.cessRate / 100).toFixed(2);
                                 default:
                                   return '0.00';
                               }
                             })()}
                           </Text>
                         </View>

                       </>
                     )}
                     <View style={styles.summaryRow}>
                       <Text style={styles.summaryLabel}>Final Price (Tax-Inclusive):</Text>
                       <Text style={styles.summaryValue}>
                         ₹{getDisplayPrices().perUnitFinalPrice.toFixed(2)}
                       </Text>
                     </View>
                   </>
                 )}
                 
                 <View style={[styles.summaryRow, styles.totalRow]}>
                   <Text style={styles.totalLabel}>Total Value:</Text>
                   <Text style={styles.totalValue}>
                     ₹{(() => {
                       if (formData.taxInclusive) {
                         // For tax-inclusive, total is the price entered × quantity
                         return (parseFloat(formData.perUnitPrice) * parseInt(formData.openingStock)).toFixed(2);
                       } else {
                         // For tax-exclusive, calculate total including taxes
                         const basePrice = parseFloat(formData.perUnitPrice) * parseInt(formData.openingStock);
                         const gstAmount = (basePrice * formData.taxRate) / 100;
                         let cessAmount = 0;
                         
                         switch (formData.cessType) {
                           case 'value':
                             cessAmount = basePrice * formData.cessRate / 100;
                             break;
                           case 'quantity':
                             cessAmount = parseInt(formData.openingStock) * parseFloat(formData.cessAmount || '0');
                             break;
                           case 'value_and_quantity':
                             const valueCess = basePrice * formData.cessRate / 100;
                             const quantityCess = parseInt(formData.openingStock) * parseFloat(formData.cessAmount || '0');
                             cessAmount = valueCess + quantityCess;
                             break;
                           case 'mrp':
                             const mrpPrice = parseFloat(formData.mrp) * parseInt(formData.openingStock);
                             cessAmount = mrpPrice * formData.cessRate / 100;
                             break;
                         }
                         
                         return (basePrice + gstAmount + cessAmount).toFixed(2);
                       }
                     })()}
                   </Text>
                 </View>
               </View>
             )}
          </View>




        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              isFormValid() ? styles.enabledButton : styles.disabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.submitButtonText,
              isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
            ]}>
              {isSubmitting ? (editMode === 'true' ? 'Updating Product...' : 'Adding Product...') : (editMode === 'true' ? 'Update Product' : 'Add Product')}
            </Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Category Selection Modal */}
      <Modal
        visible={showCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Category</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCategoryModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <Search size={20} color={Colors.textLight} />
              <TextInput
                ref={categorySearchRef}
                style={styles.searchInput}
                placeholder="Search categories..."
                placeholderTextColor={Colors.textLight}
                value={categorySearch}
                onChangeText={setCategorySearch}
                autoFocus={true}
              />
            </View>

            <ScrollView style={styles.modalScrollView}>
              <TouchableOpacity
                style={styles.modalItem}
                onPress={() => handleCategorySelect('Add New Category')}
                activeOpacity={0.7}
              >
                <View style={styles.addNewItem}>
                  <Plus size={20} color={Colors.primary} />
                  <Text style={styles.addNewText}>Add New Category</Text>
                </View>
              </TouchableOpacity>
              
              {filteredCategories.map((category) => (
                <TouchableOpacity
                  key={category}
                  style={styles.modalItem}
                  onPress={() => handleCategorySelect(category)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalItemText}>{category}</Text>
                  {formData.category === category && (
                    <View style={styles.selectedIndicator}>
                      <Text style={styles.selectedText}>✓</Text>
                    </View>
                  )}
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Add New Category Modal */}
      <Modal
        visible={showAddCategoryModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowAddCategoryModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add New Category</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowAddCategoryModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Category Name *</Text>
              <View style={styles.modalInputContainer}>
                <Package size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.modalInput}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  placeholder="Enter category name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  autoFocus={true}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowAddCategoryModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !newCategoryName.trim() && styles.disabledButton
                ]}
                onPress={handleAddNewCategory}
                disabled={!newCategoryName.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Add Category</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* CESS Amount Modal */}
      <Modal
        visible={showCessAmountModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowCessAmountModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Set CESS Details</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => setShowCessAmountModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            {(formData.cessType === 'value' || formData.cessType === 'value_and_quantity' || formData.cessType === 'mrp') && (
              <View style={styles.modalInputGroup}>
                {formData.cessType === 'mrp' && (
                  <Text style={styles.modalDescription}>
                    CESS will be calculated on the MRP (Maximum Retail Price) of the product.
                  </Text>
                )}
                <Text style={styles.modalLabel}>CESS Rate (%)</Text>
                <View style={styles.modalInputContainer}>
                  <Percent size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={styles.modalInput}
                    value={formData.cessRate.toString()}
                    onChangeText={(text) => updateFormData('cessRate', parseFloat(text) || 0)}
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
                    autoFocus
                  />
                </View>
              </View>
            )}

            {(formData.cessType === 'quantity' || formData.cessType === 'value_and_quantity') && (
              <>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>CESS Amount (₹ per unit)</Text>
                  <View style={styles.modalInputContainer}>
                    <IndianRupee size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={styles.modalInput}
                      value={formData.cessAmount}
                      onChangeText={(text) => updateFormData('cessAmount', text.replace(/[^0-9.]/g, ''))}
                      placeholder="0.00"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="decimal-pad"
                    />
                  </View>
                </View>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>CESS Unit</Text>
                  {formData.showAdvancedOptions && formData.tertiaryUnit && formData.tertiaryUnit !== 'None' && (
                    <Text style={styles.modalDescription}>
                      Note: Selecting different units affects CESS calculation. Tertiary units will use the conversion ratios you've set.
                    </Text>
                  )}
                  <TouchableOpacity
                    style={styles.modalInputContainer}
                    onPress={() => {
                      const availableUnits = [];
                      if (formData.primaryUnit) {
                        availableUnits.push(formData.primaryUnit);
                      }
                      if (formData.useCompoundUnit && formData.secondaryUnit && formData.secondaryUnit !== 'None') {
                        availableUnits.push(formData.secondaryUnit);
                      }
                      // Add tertiary unit if available and advanced options are enabled
                      if (formData.showAdvancedOptions && formData.tertiaryUnit && formData.tertiaryUnit !== 'None') {
                        availableUnits.push(formData.tertiaryUnit);
                      }
                      
                      if (availableUnits.length === 0) {
                        Alert.alert('No Units Available', 'Please set primary unit first');
                        return;
                      }
                      
                      if (formData.useCompoundUnit && (!formData.secondaryUnit || formData.secondaryUnit === 'None')) {
                        Alert.alert('Secondary Unit Required', 'Please select secondary unit first');
                        return;
                      }
                      
                      // Create unit descriptions for better understanding
                      const unitDescriptions = availableUnits.map(unit => {
                        let description = unit;
                        if (unit === formData.primaryUnit) {
                          description = `${unit} (Primary Unit)`;
                        } else if (unit === formData.secondaryUnit) {
                          description = `${unit} (Secondary Unit - 1 ${formData.primaryUnit} = ${formData.conversionRatio} ${unit})`;
                        } else if (unit === formData.tertiaryUnit) {
                          description = `${unit} (Tertiary Unit - 1 ${formData.secondaryUnit} = ${formData.tertiaryConversionRatio} ${unit})`;
                        }
                        return description;
                      });

                      Alert.alert(
                        'Select CESS Unit',
                        'Choose the unit for CESS calculation:',
                        availableUnits.map((unit, index) => ({
                          text: unitDescriptions[index],
                          onPress: () => {
                            console.log('Selecting CESS unit:', unit);
                            updateFormData('cessUnit', unit);
                          }
                        }))
                      );
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={[styles.modalInput, { color: formData.cessUnit ? Colors.text : Colors.textLight }]}>
                      {formData.cessUnit || 'Select unit'}
                    </Text>
                    <ChevronDown size={16} color={Colors.textLight} style={{ marginLeft: 'auto' }} />
                  </TouchableOpacity>
                </View>
              </>
            )}

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => setShowCessAmountModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  ((!formData.cessRate && (formData.cessType === 'value' || formData.cessType === 'value_and_quantity' || formData.cessType === 'mrp')) ||
                   (!formData.cessAmount && (formData.cessType === 'quantity' || formData.cessType === 'value_and_quantity')) ||
                   (!formData.cessUnit && (formData.cessType === 'quantity' || formData.cessType === 'value_and_quantity'))) && styles.disabledButton
                ]}
                onPress={() => setShowCessAmountModal(false)}
                disabled={(!formData.cessRate && (formData.cessType === 'value' || formData.cessType === 'value_and_quantity' || formData.cessType === 'mrp')) ||
                         (!formData.cessAmount && (formData.cessType === 'quantity' || formData.cessType === 'value_and_quantity')) ||
                         (!formData.cessUnit && (formData.cessType === 'quantity' || formData.cessType === 'value_and_quantity'))}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Set CESS</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tax Rate Modal */}
      <Modal
        visible={showTaxModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTaxModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Tax Rate</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTaxModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {taxRates.map((rate) => (
                <TouchableOpacity
                  key={rate}
                  style={[
                    styles.modalOption,
                    formData.taxRate === rate && styles.selectedOption
                  ]}
                  onPress={() => handleTaxRateSelect(rate)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.taxRate === rate && styles.selectedOptionText
                  ]}>
                    {rate}% GST
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
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowCessTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>CESS Calculation Method</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowCessTypeModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                Choose how CESS should be calculated for this product
              </Text>
              {cessTypes.map((type) => (
                <TouchableOpacity
                  key={type.value}
                  style={[
                    styles.modalOption,
                    formData.cessType === type.value && styles.selectedOption
                  ]}
                  onPress={() => handleCessTypeSelect(type.value as 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp')}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.cessType === type.value && styles.selectedOptionText
                  ]}>
                    {type.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        </View>
      </Modal>

      {/* Unit Type Modal */}
      <Modal
        visible={showUnitTypeModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUnitTypeModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Unit Measurement Type</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowUnitTypeModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalContent}>
              <Text style={styles.modalDescription}>
                Choose the unit measurement system for this product
              </Text>
              
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  !formData.useCompoundUnit && styles.selectedOption
                ]}
                onPress={() => handleUnitTypeSelect(false)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.modalOptionText,
                  !formData.useCompoundUnit && styles.selectedOptionText
                ]}>
                  Primary Unit Only
                </Text>
                <Text style={styles.modalOptionDescription}>
                  Use only one unit (e.g., Pieces, Kilograms)
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  formData.useCompoundUnit && styles.selectedOption
                ]}
                onPress={() => handleUnitTypeSelect(true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.modalOptionText,
                  formData.useCompoundUnit && styles.selectedOptionText
                ]}>
                  Compound Unit
                </Text>
                <Text style={styles.modalOptionDescription}>
                  Use both primary and secondary units with conversion
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Conversion Ratio Modal */}
      <Modal
        visible={showConversionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowConversionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Unit Conversion</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowConversionModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.conversionModalContent}>
              <Text style={styles.conversionQuestion}>
                How many {formData.secondaryUnit} are in 1 {formData.primaryUnit}?
              </Text>
              
              <View style={styles.conversionInputContainer}>
                <Text style={styles.conversionLabel}>1 {formData.primaryUnit} = </Text>
                <TextInput
                  style={styles.conversionModalInput}
                  value={formData.conversionRatio}
                  onChangeText={(text) => updateFormData('conversionRatio', text.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={styles.conversionLabel}> {formData.secondaryUnit}</Text>
              </View>
              
            </View>
            
            <View style={styles.conversionButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.conversionSubmitButton,
                  !formData.conversionRatio && styles.disabledButton
                ]}
                onPress={() => setShowConversionModal(false)}
                disabled={!formData.conversionRatio}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.conversionSubmitButtonText,
                  !formData.conversionRatio && styles.disabledButtonText
                ]}>
                  Set Conversion
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Primary Unit Modal */}
      <Modal
        visible={showUnitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowUnitModal(false);
          setPrimaryUnitSearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Primary Unit</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowUnitModal(false);
                  setPrimaryUnitSearch('');
                }}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={18} color={Colors.textLight} />
              <TextInput
                style={styles.searchInput}
                value={primaryUnitSearch}
                onChangeText={setPrimaryUnitSearch}
                placeholder="Search units..."
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Custom Unit Option */}
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowUnitModal(false);
                  setTimeout(() => setShowCustomPrimaryUnitModal(true), 300);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.addNewItem}>
                  <Plus size={20} color={Colors.primary} />
                  <Text style={styles.addNewText}>Add Custom Unit</Text>
                </View>
              </TouchableOpacity>
              
              {primaryUnits
                .filter(unit => 
                  unit.toLowerCase().includes(primaryUnitSearch.toLowerCase())
                )
                .map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.modalOption,
                    formData.primaryUnit === unit && styles.selectedOption
                  ]}
                  onPress={() => handleUnitSelect(unit)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.primaryUnit === unit && styles.selectedOptionText
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
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowSecondaryUnitModal(false);
          setSecondaryUnitSearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Secondary Unit</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowSecondaryUnitModal(false);
                  setSecondaryUnitSearch('');
                }}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={18} color={Colors.textLight} />
              <TextInput
                style={styles.searchInput}
                value={secondaryUnitSearch}
                onChangeText={setSecondaryUnitSearch}
                placeholder="Search units..."
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Custom Unit Option */}
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowSecondaryUnitModal(false);
                  setTimeout(() => setShowCustomSecondaryUnitModal(true), 300);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.addNewItem}>
                  <Plus size={20} color={Colors.primary} />
                  <Text style={styles.addNewText}>Add Custom Unit</Text>
                </View>
              </TouchableOpacity>
              
              {secondaryUnits
                .filter(unit => 
                  unit.toLowerCase().includes(secondaryUnitSearch.toLowerCase())
                )
                .map((unit) => (
                <TouchableOpacity
                  key={unit}
                  style={[
                    styles.modalOption,
                    formData.secondaryUnit === unit && styles.selectedOption
                  ]}
                  onPress={() => handleSecondaryUnitSelect(unit)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.secondaryUnit === unit && styles.selectedOptionText
                  ]}>
                    {unit}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Preferred Supplier Modal */}
      <Modal
        visible={showSupplierModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowSupplierModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Preferred Supplier</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowSupplierModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={18} color={Colors.textLight} />
              <TextInput
                style={styles.searchInput}
                value={supplierSearch}
                onChangeText={setSupplierSearch}
                placeholder="Search suppliers..."
                placeholderTextColor={Colors.textLight}
              />
            </View>
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {/* Add New Supplier Option */}
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowSupplierModal(false);
                  // Navigate to add supplier screen with return parameter and replace current screen
                  router.replace({
                    pathname: '/purchasing/add-supplier',
                    params: {
                      returnToAddProduct: 'true'
                    }
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.addNewItem}>
                  <Plus size={20} color={Colors.primary} />
                  <Text style={styles.addNewText}>Add New Supplier</Text>
                </View>
              </TouchableOpacity>
              {/* Existing suppliers list */}
              {filteredSuppliers.map((supplier) => (
                <TouchableOpacity
                  key={supplier.id}
                  style={[
                    styles.modalOption,
                    formData.preferredSupplier === supplier.id && styles.selectedOption
                  ]}
                  onPress={() => handleSupplierSelect(supplier.id)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.preferredSupplier === supplier.id && styles.selectedOptionText
                  ]}>
                    {supplier.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Storage Location Modal */}
      <Modal
        visible={showLocationModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Storage Location</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLocationModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Search size={18} color={Colors.textLight} />
              <TextInput
                style={styles.searchInput}
                value={locationSearch}
                onChangeText={setLocationSearch}
                placeholder="Search locations..."
                placeholderTextColor={Colors.textLight}
              />
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              {filteredLocations
                .filter(location => 
                  location.toLowerCase().includes(locationSearch.toLowerCase())
                )
                .map((location) => (
                <TouchableOpacity
                  key={location}
                  style={[
                    styles.modalOption,
                    formData.location === location && styles.selectedOption
                  ]}
                  onPress={() => handleLocationSelect(location)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalOptionText,
                    formData.location === location && styles.selectedOptionText
                  ]}>
                    {location}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Image Selection Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.imageModalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Product Image</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowImageModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.imageOptions}>
              <TouchableOpacity
                style={styles.imageOption}
                onPress={() => handleImageSelect('camera')}
                activeOpacity={0.7}
              >
                <Camera size={24} color={Colors.primary} />
                <Text style={styles.imageOptionText}>Take Photo</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.imageOption}
                onPress={() => handleImageSelect('gallery')}
                activeOpacity={0.7}
              >
                <Upload size={24} color={Colors.primary} />
                <Text style={styles.imageOptionText}>Choose from Gallery</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Primary Unit Modal */}
      <Modal
        visible={showCustomPrimaryUnitModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCustomPrimaryUnitModal(false);
          setCustomPrimaryUnit('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Primary Unit</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowCustomPrimaryUnitModal(false);
                  setCustomPrimaryUnit('');
                }}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Custom Unit Name *</Text>
              <View style={styles.modalInputContainer}>
                <TextInput
                  style={styles.modalInput}
                  value={customPrimaryUnit}
                  onChangeText={setCustomPrimaryUnit}
                  placeholder="Enter custom unit name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  autoFocus={true}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCustomPrimaryUnitModal(false);
                  setCustomPrimaryUnit('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !customPrimaryUnit.trim() && styles.disabledButton
                ]}
                onPress={() => {
                  if (customPrimaryUnit.trim()) {
                    setFormData(prev => ({ ...prev, primaryUnit: customPrimaryUnit.trim() }));
                    setCustomPrimaryUnit('');
                    setShowCustomPrimaryUnitModal(false);
                  }
                }}
                disabled={!customPrimaryUnit.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Add Custom Unit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Custom Secondary Unit Modal */}
      <Modal
        visible={showCustomSecondaryUnitModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => {
          setShowCustomSecondaryUnitModal(false);
          setCustomSecondaryUnit('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Secondary Unit</Text>
              <TouchableOpacity
                style={styles.closeButton}
                onPress={() => {
                  setShowCustomSecondaryUnitModal(false);
                  setCustomSecondaryUnit('');
                }}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Custom Unit Name *</Text>
              <View style={styles.modalInputContainer}>
                <TextInput
                  style={styles.modalInput}
                  value={customSecondaryUnit}
                  onChangeText={setCustomSecondaryUnit}
                  placeholder="Enter custom unit name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  autoFocus={true}
                />
              </View>
            </View>

            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCustomSecondaryUnitModal(false);
                  setCustomSecondaryUnit('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !customSecondaryUnit.trim() && styles.disabledButton
                ]}
                onPress={() => {
                  if (customSecondaryUnit.trim()) {
                    setFormData(prev => ({ ...prev, secondaryUnit: customSecondaryUnit.trim() }));
                    setCustomSecondaryUnit('');
                    setShowCustomSecondaryUnitModal(false);
                  }
                }}
                disabled={!customSecondaryUnit.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Add Custom Unit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tertiary Unit Modal */}
      <Modal
        visible={showTertiaryUnitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowTertiaryUnitModal(false);
          setTertiaryUnitSearch('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Tertiary Unit</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowTertiaryUnitModal(false);
                  setTertiaryUnitSearch('');
                }}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={18} color={Colors.textLight} />
              <TextInput
                style={styles.searchInput}
                value={tertiaryUnitSearch}
                onChangeText={setTertiaryUnitSearch}
                placeholder="Search units..."
                placeholderTextColor={Colors.textLight}
              />
            </View>
            
            <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  formData.tertiaryUnit === 'None' && styles.selectedOption
                ]}
                onPress={() => handleTertiaryUnitSelect('None')}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.modalOptionText,
                  formData.tertiaryUnit === 'None' && styles.selectedOptionText
                ]}>
                  None
                </Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowTertiaryUnitModal(false);
                  setTertiaryUnitSearch('');
                  setTimeout(() => setShowCustomTertiaryUnitModal(true), 300);
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.modalOptionText}>+ Add Custom Unit</Text>
              </TouchableOpacity>
              
              {secondaryUnits
                .filter(unit => 
                  unit.toLowerCase().includes(tertiaryUnitSearch.toLowerCase())
                )
                .map((unit, index) => (
                  <TouchableOpacity
                    key={index}
                    style={[
                      styles.modalOption,
                      formData.tertiaryUnit === unit && styles.selectedOption
                    ]}
                    onPress={() => handleTertiaryUnitSelect(unit)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      formData.tertiaryUnit === unit && styles.selectedOptionText
                    ]}>
                      {unit}
                    </Text>
                  </TouchableOpacity>
                ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Custom Tertiary Unit Modal */}
      <Modal
        visible={showCustomTertiaryUnitModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => {
          setShowCustomTertiaryUnitModal(false);
          setCustomTertiaryUnit('');
        }}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Add Custom Tertiary Unit</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => {
                  setShowCustomTertiaryUnitModal(false);
                  setCustomTertiaryUnit('');
                }}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalInputGroup}>
              <Text style={styles.modalLabel}>Custom Unit Name *</Text>
              <View style={styles.modalInputContainer}>
                <TextInput
                  style={styles.modalInput}
                  value={customTertiaryUnit}
                  onChangeText={setCustomTertiaryUnit}
                  placeholder="e.g., Bundle, Pack, Set"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  autoFocus
                />
              </View>
            </View>
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={styles.cancelButton}
                onPress={() => {
                  setShowCustomTertiaryUnitModal(false);
                  setCustomTertiaryUnit('');
                }}
                activeOpacity={0.7}
              >
                <Text style={styles.cancelButtonText}>Cancel</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.confirmButton,
                  !customTertiaryUnit.trim() && styles.disabledButton
                ]}
                onPress={() => {
                  if (customTertiaryUnit.trim()) {
                    setFormData(prev => ({ ...prev, tertiaryUnit: customTertiaryUnit.trim() }));
                    setCustomTertiaryUnit('');
                    setShowCustomTertiaryUnitModal(false);
                  }
                }}
                disabled={!customTertiaryUnit.trim()}
                activeOpacity={0.7}
              >
                <Text style={styles.confirmButtonText}>Add Custom Unit</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Tertiary Conversion Ratio Modal */}
      <Modal
        visible={showTertiaryConversionModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowTertiaryConversionModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Tertiary Unit Conversion</Text>
                              <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowTertiaryConversionModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
            </View>
            
            <View style={styles.conversionModalContent}>
              <Text style={styles.conversionQuestion}>
                How many {formData.tertiaryUnit} are in 1 {formData.secondaryUnit}?
              </Text>
              
              <View style={styles.conversionInputContainer}>
                <Text style={styles.conversionLabel}>1 {formData.secondaryUnit} = </Text>
                <TextInput
                  style={styles.conversionModalInput}
                  value={formData.tertiaryConversionRatio}
                  onChangeText={(text) => updateFormData('tertiaryConversionRatio', text.replace(/[^0-9.]/g, ''))}
                  placeholder="0"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                  autoFocus
                />
                <Text style={styles.conversionLabel}> {formData.tertiaryUnit}</Text>
              </View>
              
            </View>
            
            <View style={styles.conversionButtonContainer}>
              <TouchableOpacity
                style={[
                  styles.conversionSubmitButton,
                  !formData.tertiaryConversionRatio && styles.disabledButton
                ]}
                onPress={() => setShowTertiaryConversionModal(false)}
                disabled={!formData.tertiaryConversionRatio}
                activeOpacity={0.8}
              >
                <Text style={[
                  styles.conversionSubmitButtonText,
                  !formData.tertiaryConversionRatio && styles.disabledButtonText
                ]}>
                  Set Conversion
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>


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
  keyboardView: {
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
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
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
    padding: 16,
    paddingBottom: 40,
  },
  section: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
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
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  sectionSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
  },

  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 6,
    marginLeft: 2,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  barcodeScanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 16,
    paddingHorizontal: 24,
    paddingVertical: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.15,
    shadowRadius: 6,
    elevation: 4,
  },
  barcodeScanButtonText: {
    fontSize: 18,
    color: Colors.primary,
    fontWeight: '600',
    flex: 1,
    textAlign: 'center',
    marginHorizontal: 16,
  },

  autoFilledInput: {
    borderColor: Colors.success,
    backgroundColor: Colors.success + '10',
  },
  autoFilledBadge: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '600',
    marginLeft: 8,
    fontStyle: 'italic',
  },
  stockUoMContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    padding: 4,
  },
  stockUoMButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activeStockUoMButton: {
    backgroundColor: Colors.background,
    shadowColor: Colors.text,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  stockUoMButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeStockUoMButtonText: {
    color: Colors.text,
    fontWeight: '600',
  },
  unitIndicator: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
    fontStyle: 'italic',
  },
  inputIcon: {
    marginRight: 12,
  },

  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  customInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  changeButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeButtonText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  rowContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  halfWidth: {
    flex: 1,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  marginContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    marginTop: 8,
  },
  marginLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  marginValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
  },
  warningContainer: {
    backgroundColor: Colors.warning + '20',
    borderWidth: 1,
    borderColor: Colors.warning,
  },
  warningText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warning,
    textAlign: 'center',
    flex: 1,
  },
  imagePreview: {
    alignItems: 'center',
    gap: 12,
  },
  productImagePreview: {
    width: 120,
    height: 120,
    borderRadius: 12,
  },
  changeImageButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  changeImageText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: '600',
  },
  addImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    gap: 8,
  },
  addImageText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  submitSection: {
    position: 'absolute',
    bottom: 20,
    left: 20,
    right: 20,
  },
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  enabledButton: {
    backgroundColor: Colors.primary,
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  submitButtonText: {
    fontSize: 18,
    fontWeight: '600',
  },
  enabledButtonText: {
    color: Colors.background,
  },
  disabledButtonText: {
    color: Colors.textLight,
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
    width: '90%',
    maxWidth: 400,
    maxHeight: '80%',
    alignSelf: 'center',
    justifyContent: 'center',
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
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 16,
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
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: Colors.text,
    paddingVertical: 8,
  },
  modalScrollView: {
    maxHeight: 300,
  },
  modalItem: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  addNewItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  addNewText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  modalItemText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedIndicator: {
    position: 'absolute',
    right: 10,
    top: 10,
    backgroundColor: Colors.primary,
    borderRadius: 10,
    width: 20,
    height: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  selectedText: {
    color: Colors.background,
    fontSize: 14,
    fontWeight: 'bold',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  cancelButton: {
    backgroundColor: Colors.grey[200],
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  cancelButtonText: {
    color: Colors.text,
    fontSize: 16,
    fontWeight: '600',
  },
  confirmButton: {
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 10,
  },
  confirmButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  selectedOption: {
    backgroundColor: '#f0f4ff',
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  modalOptionDescription: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  imageModalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 350,
  },
  imageOptions: {
    padding: 20,
    gap: 16,
  },
  imageOption: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 20,
    gap: 12,
  },
  imageOptionText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  closeButton: {
    padding: 8,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 350,
  },
  modalOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  conversionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8,
  },
  conversionText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  conversionInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 60,
  },
  fieldHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  conversionQuestion: {
    fontSize: 16,
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 20,
    lineHeight: 22,
  },
  conversionInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 20,
    gap: 8,
  },
  conversionLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  conversionModalInput: {
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 18,
    color: Colors.text,
    fontWeight: '600',
    textAlign: 'center',
    minWidth: 80,
  },
  conversionSubmitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    width: '100%',
  },
  conversionSubmitButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  conversionModalContent: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 0,
  },
  conversionButtonContainer: {
    marginTop: 20,
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  scanIconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 3,
    },
    shadowOpacity: 0.2,
    shadowRadius: 6,
    elevation: 4,
  },
  toggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    padding: 4,
  },
  toggleButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activeToggleButton: {
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
  toggleButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeToggleButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  modalInputGroup: {
    marginBottom: 16,
    paddingHorizontal: 20,
  },
  modalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  modalInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  disabledInput: {
    backgroundColor: Colors.grey[100],
    borderColor: Colors.grey[300],
    opacity: 0.6,
  },
  modalInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  advancedToggle: {
    marginTop: 8,
    marginBottom: 8,
    alignSelf: 'flex-start',
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  advancedToggleActive: {
    backgroundColor: Colors.primary,
  },
  advancedToggleText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  advancedToggleTextActive: {
    color: Colors.background,
  },
  advancedOptionsContainer: {
    marginTop: 8,
    padding: 8,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
  },
  locationContainer: {
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  locationText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  comingSoonText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
    fontStyle: 'italic',
  },
  priceUnitContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    padding: 4,
  },
  priceUnitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
  },
  activePriceUnitButton: {
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
  priceUnitButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activePriceUnitButtonText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  summaryContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  summaryTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
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
  cessCalculationRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  cessCalculationLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  cessCalculationText: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: 'italic',
    lineHeight: 16,
  },
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 8,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  // Tax Toggle Styles
  taxToggleContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    padding: 2,
  },
  taxToggleButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  taxToggleButtonActive: {
    backgroundColor: Colors.primary,
  },
  taxToggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  taxToggleTextActive: {
    color: Colors.background,
  },
  // Tax Calculation Display Styles
  taxCalculationContainer: {
    marginTop: 16,
    padding: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  taxCalculationTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  taxCalculationContent: {
    gap: 12,
  },
  taxCalculationRow: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
  },
  taxCalculationColumn: {
    gap: 4,
  },
  taxCalculationLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  taxCalculationPrimary: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  taxCalculationSecondary: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  taxCalculationInfo: {
    alignItems: 'center',
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  taxCalculationInfoText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textLight,
    fontStyle: 'italic',
  },
     // Additional Tax Calculation Styles
   taxCalculationUnit: {
     fontSize: 12,
     fontWeight: '500',
     color: Colors.textLight,
     fontStyle: 'italic',
     marginTop: 2,
   },
   taxBreakdownContainer: {
     marginTop: 16,
     padding: 12,
     backgroundColor: Colors.background,
     borderRadius: 8,
     borderWidth: 1,
     borderColor: Colors.grey[200],
   },
   
   // Tax Explanation Styles
   taxExplanationContainer: {
     backgroundColor: Colors.grey[50],
     borderRadius: 12,
     padding: 16,
     marginBottom: 16,
     borderWidth: 1,
     borderColor: Colors.grey[200],
   },
   taxExplanationTitle: {
     fontSize: 16,
     fontWeight: '600',
     color: Colors.primary,
     marginBottom: 8,
   },
   taxExplanationText: {
     fontSize: 14,
     color: Colors.textLight,
     lineHeight: 20,
   },
   taxExplanationBold: {
     fontWeight: '600',
     color: Colors.text,
   },
  taxBreakdownTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  taxBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 4,
  },
  taxBreakdownLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  taxBreakdownValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Simplified Tax Display Styles
  simpleTaxContainer: {
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  simpleTaxText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
});