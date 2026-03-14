import React, { useState, useRef, useEffect, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  Pressable,
  ScrollView,
  Modal,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Image,
  AppState,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams, useFocusEffect } from 'expo-router';
import { setNavData } from '@/utils/navStore';
import * as ImagePicker from 'expo-image-picker';
import { productStore, Product } from '@/utils/productStore';
import { Supplier as StoreSupplier } from '@/utils/dataStore';
import { createProduct, updateProduct, getSuppliers, assignBarcode, getProductCategories, addProductCategory, releaseBarcode, uploadProductImages } from '@/services/backendApi';
import { getInputFocusStyles } from '@/utils/platformUtils';
import { useBusinessData } from '@/hooks/useBusinessData';
import { supabase } from '@/lib/supabase';
import { generateBarcodeImage } from '@/utils/barcodeGenerator';
import { showSuccess, showError } from '@/utils/notifications';
import { autoFormatDateInput, parseDDMMYYYY, ddmmyyyyToISO, formatCurrencyINR } from '@/utils/formatters';
import { safeRouter } from '@/utils/safeRouter';
import { 
  ArrowLeft, 
  Package, 
  Search, 
  X, 
  ChevronDown,
  ChevronUp, 
  Camera,
  Upload,
  Building2,
  Hash,
  IndianRupee,
  Percent,
  Plus,
  Barcode,
  Info,
  Calendar,
  Wand2
} from 'lucide-react-native';
import CustomDatePicker from '@/components/CustomDatePicker';

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

const FocusableInput = ({ children, style, ...props }: any) => {
  const inputRef = React.useRef<TextInput | null>(null);
  return (
    <Pressable style={style} onPress={() => inputRef.current?.focus()} {...props}>
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === TextInput) {
          const origRef = (child.props as any).ref;
          return React.cloneElement(child as any, {
            ref: (r: TextInput | null) => {
              inputRef.current = r;
              if (typeof origRef === 'function') origRef(r);
              else if (origRef && typeof origRef === 'object') origRef.current = r;
            },
          });
        }
        return child;
      })}
    </Pressable>
  );
};

let categories: string[] = [];

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

const taxRates = [
  { rate: 0,  label: 'Nil Rate',  description: 'Essential items – milk, vegetables, grains, lifesaving drugs, insurance' },
  { rate: 5,  label: 'Merit Rate', description: 'Daily essentials – toiletries, dairy, clothing & footwear up to ₹2,500, agriculture' },
  { rate: 18, label: 'Standard Rate', description: 'Most goods & services – electronics, appliances, vehicles, general products' },
  { rate: 40, label: 'Luxury / Sin Goods', description: 'Tobacco, pan masala, aerated beverages, luxury vehicles above ₹40L' },
];

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

const storageLocations: string[] = [];

interface Supplier {
  id: string;
  name: string;
  type: 'business' | 'individual';
}

// Get suppliers from data store - will be updated via useEffect
let suppliersList: Supplier[] = [];

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
  salesPriceUnit: 'primary' | 'secondary';
  stockUoM: 'primary' | 'secondary' | 'tertiary';
  cessType: 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp';
  cessRate: number;
  cessAmount: string;
  cessUnit: string;
  perUnitPrice: string;
  purchasePrice: string;
  salesPrice: string;
  mrp: string;
  minStockLevel: string;
  maxStockLevel: string;
  openingStock: string;
  preferredSupplier: string;
  location: string;
  locationId: string | null;
  productImages: string[];
  quantityDecimals: number;
  roundOffOpeningStock: boolean;
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
      // Check if we should go back to the original screen
      if (returnTo === 'manual-product') {
        // This is likely a duplicate, go back to original screen
        router.back();
        return;
      }
    }
  }, [returnTo, scannedData]);
  
  // Force re-render when scanned data changes
  const [forceUpdate, setForceUpdate] = useState(0);
  
  // Track which fields were auto-filled for visual feedback
  const [autoFilledFields, setAutoFilledFields] = useState<Set<string>>(new Set());
  
  // Track focused input field for consistent focus styling
  const [focusedField, setFocusedField] = useState<string | null>(null);
  
  // Track focused modal input field for consistent focus styling
  const [focusedModalField, setFocusedModalField] = useState<string | null>(null);
  
  // Get input focus styles for consistent UI
  const inputFocusStyles = getInputFocusStyles();
  
  // Fetch business data for locations
  const { data: businessData, refetch: refetchBusinessData } = useBusinessData();
  
  // Extract locations from business data
  const locations = useMemo(() => {
    if (!businessData?.addresses) return [];
    return businessData.addresses.map((addr: any) => ({
      id: addr.id,
      name: addr.name,
      type: addr.type,
    }));
  }, [businessData?.addresses]);
  
  // Set initial location when locations are loaded
  useEffect(() => {
    if (locations.length > 0) {
      setFormData(prev => {
        // Only set if locationId is null (not already set)
        if (!prev.locationId) {
          // Find primary location first, otherwise use first location
          const primaryLocation = locations.find((loc: any) => loc.type === 'primary') || locations[0];
          if (primaryLocation) {
            return {
              ...prev,
              location: primaryLocation.name,
              locationId: primaryLocation.id,
            };
          }
        }
        return prev;
      });
    }
  }, [locations]);
  
  // Refetch locations when returning from add branch/warehouse
  const returnParams = useLocalSearchParams();
  useFocusEffect(
    React.useCallback(() => {
      if (returnParams.returnToAddProduct === 'true') {
        // Refetch business data to get updated locations
        refetchBusinessData();
      }
    }, [refetchBusinessData, returnParams.returnToAddProduct])
  );
  
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
    salesPriceUnit: 'primary',
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
    locationId: null,
    productImages: [],
    quantityDecimals: 0,
    roundOffOpeningStock: true,
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
  const [showExpiryDatePicker, setShowExpiryDatePicker] = useState(false);
  const [expiryDateValue, setExpiryDateValue] = useState<Date | null>(null);
  const [hasSelectedExpiryDate, setHasSelectedExpiryDate] = useState(false);
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
  const [showGenerateBarcodeModal, setShowGenerateBarcodeModal] = useState(false);
  const [isGeneratingBarcode, setIsGeneratingBarcode] = useState(false);
  const [barcodeGenerated, setBarcodeGenerated] = useState(false);
  const [loadingCategories, setLoadingCategories] = useState(false);
  const [summaryExpanded, setSummaryExpanded] = useState(false);
  const generatedBarcodeRef = useRef<string | null>(null);
  const productSavedRef = useRef(false);

  const categorySearchRef = useRef<TextInput>(null);
  const supplierSearchRef = useRef<TextInput>(null);
  const primaryUnitSearchRef = useRef<TextInput>(null);
  const secondaryUnitSearchRef = useRef<TextInput>(null);
  const tertiaryUnitSearchRef = useRef<TextInput>(null);

    // Use useFocusEffect to detect when form comes back into focus
  useFocusEffect(
    React.useCallback(() => {
      // Check if we have scanned data to process (either from params or shared store)
      const dataToProcess = scannedData || getScannedData();
      
      if (dataToProcess) {
        try {
          const scanned = JSON.parse(dataToProcess as string);
          
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
              
              setFormData(prev => ({ ...prev, name: fullProductName }));
              newAutoFilledFields.add('name');
            }
            
            // Update barcode field
            if (scanned.barcode) {
              setFormData(prev => ({ ...prev, barcode: scanned.barcode }));
              newAutoFilledFields.add('barcode');
            }
            
            // Update auto-filled fields tracking
            setAutoFilledFields(newAutoFilledFields);
            
            // Force a re-render to ensure form updates
            setForceUpdate(prev => prev + 1);
            
            // Clear scanned data after processing
            if (getScannedData()) {
              clearScannedData();
            }
          }
        } catch (error) {
          console.error('❌ Error parsing scanned data:', error);
        }
      }
    }, [scannedData])
  );

  // Load categories from backend
  useEffect(() => {
    const loadCategories = async () => {
      setLoadingCategories(true);
      try {
        const result = await getProductCategories();
        if (result.success && result.categories && result.categories.length > 0) {
          categories = result.categories;
        }
      } catch (error) {
        // Keep empty categories array - user can add new ones
      } finally {
        setLoadingCategories(false);
      }
    };
    loadCategories();
  }, []);

  // Release unused barcode on unmount
  useEffect(() => {
    return () => {
      if (generatedBarcodeRef.current && !productSavedRef.current) {
        releaseBarcode(generatedBarcodeRef.current).catch(() => {});
      }
    };
  }, []);

  // Handle edit mode - populate form with existing product data
  useEffect(() => {
    if (editMode === 'true' && (productData || productId)) {
      try {
        const product = productData
          ? JSON.parse(productData as string)
          : productStore.getProductById(productId as string);
        if (!product) return;
        
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
          salesPriceUnit: 'primary',
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
          locationId: product.locationId || null,
          productImages: product.productImages || product.images || (product.image ? [product.image] : []),
          quantityDecimals: product.quantityDecimals ?? 0,
          roundOffOpeningStock: true,
          batchNumber: product.batchNumber || '',
          expiryDate: product.expiryDate || '',
          showAdvancedOptions: false,
        });
        
        // Parse and set expiry date value if it exists
        if (product.expiryDate) {
          try {
            const dateParts = product.expiryDate.split('-');
            if (dateParts.length === 3) {
              // Check if it's YYYY-MM-DD format (backend format)
              const firstPart = parseInt(dateParts[0], 10);
              if (firstPart > 31) {
                // First part is year (YYYY-MM-DD format)
                const year = firstPart;
                const month = parseInt(dateParts[1], 10);
                const day = parseInt(dateParts[2], 10);
                const date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime())) {
                  setExpiryDateValue(date);
                  setHasSelectedExpiryDate(true);
                  // Convert to DD-MM-YYYY format for display
                  updateFormData('expiryDate', formatExpiryDate(date));
                }
              } else {
                // First part is day (DD-MM-YYYY format)
                const day = firstPart;
                const month = parseInt(dateParts[1], 10);
                const year = parseInt(dateParts[2], 10);
                const date = new Date(year, month - 1, day);
                if (!isNaN(date.getTime())) {
                  setExpiryDateValue(date);
                  setHasSelectedExpiryDate(true);
                }
              }
            } else {
              // Try parsing as ISO date string
              const date = new Date(product.expiryDate);
              if (!isNaN(date.getTime())) {
                setExpiryDateValue(date);
                setHasSelectedExpiryDate(true);
                // Convert to DD-MM-YYYY format
                updateFormData('expiryDate', formatExpiryDate(date));
              }
            }
          } catch (error) {
            console.error('Error parsing expiry date:', error);
          }
        }
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

  // Load suppliers from backend
  useEffect(() => {
    const loadSuppliersFromBackend = async () => {
      try {
        const result = await getSuppliers();
        if (result.success && result.suppliers) {
          suppliersList = result.suppliers.map((supplier: any) => ({
            id: supplier.id,
            name: supplier.business_name || supplier.contact_person || '',
            type: (supplier.supplier_type || 'business') as 'business' | 'individual',
          }));
        }
      } catch (error) {
        console.error('Error loading suppliers from backend:', error);
      }
    };

    loadSuppliersFromBackend();
  }, []);

  // Handle new supplier from add supplier page
  // This preserves all existing form data when returning from adding a supplier
  useEffect(() => {
    if (newSupplier && typeof newSupplier === 'string') {
      try {
        const supplierData = JSON.parse(newSupplier);
        suppliersList.push({
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

  // Format date as DD-MM-YYYY (consistent with PAN date of birth format, but with - instead of /)
  const formatExpiryDate = (date: Date | null) => {
    if (!date) return '';
    const day = date.getDate().toString().padStart(2, '0');
    const month = (date.getMonth() + 1).toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${day}-${month}-${year}`;
  };

  const convertExpiryDateToBackendFormat = (dateString: string): string | undefined => {
    if (!dateString || dateString.trim().length === 0) return undefined;
    return ddmmyyyyToISO(dateString);
  };

  const isExpiryDateValid = (): boolean => {
    if (!formData.expiryDate || formData.expiryDate.trim().length === 0) return true;
    if (formData.expiryDate.trim().length < 10) return false;
    const parsed = parseDDMMYYYY(formData.expiryDate);
    if (!parsed) return false;
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return parsed >= today;
  };

  const handleExpiryDateTextChange = (text: string) => {
    const formatted = autoFormatDateInput(text);
    updateFormData('expiryDate', formatted);
    
    if (formatted.length === 10) {
      const parsed = parseDDMMYYYY(formatted);
      if (parsed) {
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        if (parsed >= today) {
          setExpiryDateValue(parsed);
          setHasSelectedExpiryDate(true);
        } else {
          Alert.alert('Invalid Date', 'Expiry date cannot be before today');
          updateFormData('expiryDate', '');
          setExpiryDateValue(null);
          setHasSelectedExpiryDate(false);
        }
      } else {
        Alert.alert('Invalid Date', 'Please enter a valid date');
        updateFormData('expiryDate', '');
        setExpiryDateValue(null);
        setHasSelectedExpiryDate(false);
      }
    } else if (expiryDateValue !== null) {
      setExpiryDateValue(null);
      setHasSelectedExpiryDate(false);
    }
  };

  // Handle date picker done
  const handleExpiryDatePickerDone = () => {
    if (hasSelectedExpiryDate || expiryDateValue) {
      setShowExpiryDatePicker(false);
      // Update text field with selected date
      if (expiryDateValue) {
        updateFormData('expiryDate', formatExpiryDate(expiryDateValue));
      }
    }
  };

  // Handle open date picker
  const handleOpenExpiryDatePicker = () => {
    setShowExpiryDatePicker(true);
    // If there's already a date and it's valid (not before today), enable the done button
    if (expiryDateValue) {
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      if (expiryDateValue >= today) {
        setHasSelectedExpiryDate(true);
      } else {
        // If date is before today, reset to today
        const todayDate = new Date();
        todayDate.setHours(0, 0, 0, 0);
        setExpiryDateValue(todayDate);
        setHasSelectedExpiryDate(true);
      }
    } else {
      // If no date, set to today
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      setExpiryDateValue(today);
      setHasSelectedExpiryDate(true);
    }
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

  const handleAddNewCategory = async () => {
    const name = newCategoryName.trim();
    if (!name) return;
    categories.push(name);
    setFormData(prev => ({ ...prev, category: name, customCategory: '' }));
    setNewCategoryName('');
    setShowAddCategoryModal(false);
    addProductCategory(name).catch(() => {});
  };

  const handleUnitSelect = (unit: string) => {
    setFormData(prev => {
      const updated = { ...prev, primaryUnit: unit };
      // Reset tertiary unit if primary unit is set to 'None' or if compound UoM is disabled
      if (unit === 'None' || !prev.useCompoundUnit || !prev.secondaryUnit || prev.secondaryUnit === 'None') {
        updated.tertiaryUnit = 'None';
        updated.tertiaryConversionRatio = '';
      }
      return updated;
    });
    setShowUnitModal(false);
    setPrimaryUnitSearch('');
  };

  const handleSecondaryUnitSelect = (unit: string) => {
    setFormData(prev => {
      const updated = { ...prev, secondaryUnit: unit };
      // Reset tertiary unit if secondary unit is set to 'None' or if primary unit is 'None'
      if (unit === 'None' || !prev.useCompoundUnit || !prev.primaryUnit || prev.primaryUnit === 'None') {
        updated.tertiaryUnit = 'None';
        updated.tertiaryConversionRatio = '';
      }
      return updated;
    });
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
      secondaryUnit: useCompound ? prev.secondaryUnit : 'None',
      // Reset tertiary unit when compound UoM is disabled
      tertiaryUnit: useCompound ? prev.tertiaryUnit : 'None',
      tertiaryConversionRatio: useCompound ? prev.tertiaryConversionRatio : ''
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

  const handleLocationSelect = (locationId: string, locationName: string) => {
    setFormData(prev => ({ ...prev, location: locationName, locationId }));
    setShowLocationModal(false);
  };

  const handleGenerateBarcodeConfirm = async () => {
    setIsGeneratingBarcode(true);
    setShowGenerateBarcodeModal(false);
    try {
      const result = await assignBarcode({ locationId: formData.locationId });
      if (result.success && result.barcode) {
        updateFormData('barcode', result.barcode);
        setBarcodeGenerated(true);
        generatedBarcodeRef.current = result.barcode;
        showSuccess('Unique barcode assigned: ' + result.barcode);
      } else {
        showError(result.error || 'Failed to generate barcode');
      }
    } catch (err: any) {
      showError(err?.message || 'Failed to generate barcode');
    } finally {
      setIsGeneratingBarcode(false);
    }
  };

  const handleImageSelect = async (type: 'camera' | 'gallery') => {
    try {
      let result;
      
      if (type === 'camera') {
        // Request camera permissions
        const { status } = await ImagePicker.requestCameraPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Camera permission is required to take photos.');
          return;
        }
        
        result = await ImagePicker.launchCameraAsync({
          mediaTypes: ['images'],
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      } else {
        // Request media library permissions
        const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
        if (status !== 'granted') {
          Alert.alert('Permission Required', 'Media library permission is required to select photos.');
          return;
        }
        
        result = await ImagePicker.launchImageLibraryAsync({
          mediaTypes: ['images'],
          allowsMultipleSelection: true,
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets) {
        const imageUris = result.assets
          .filter(a => a.uri)
          .map(a => a.uri as string);

        if (imageUris.length > 0) {
          setFormData(prev => ({
            ...prev,
            productImages: [...prev.productImages, ...imageUris],
          }));
        }
      }
      
    setShowImageModal(false);
    } catch (error) {
      console.error('Error selecting image:', error);
      Alert.alert('Error', 'Failed to select image. Please try again.');
    }
  };

  const handleRemoveImage = (index: number) => {
    setFormData(prev => ({
      ...prev,
      productImages: prev.productImages.filter((_, i) => i !== index),
    }));
  };

  const handlePriceChange = (field: 'purchasePrice' | 'salesPrice' | 'mrp' | 'perUnitPrice', text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    // Allow up to 3 decimal places
    if (parts.length <= 2 && parts[0].length <= 8) {
      if (parts.length === 2 && parts[1].length <= 3) {
        updateFormData(field, cleaned);
      } else if (parts.length === 1) {
      updateFormData(field, cleaned);
      }
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
    
    // Round to 3 decimal places to preserve precision
    return Math.max(0, Math.round(basePrice * 1000) / 1000); // Ensure base price is not negative
  };

  // Helper function to calculate tax-exclusive price from tax-inclusive price (simple GST only)
  const calculateTaxExclusivePrice = (inclusivePrice: number, taxRate: number): number => {
    const result = inclusivePrice / (1 + (taxRate / 100));
    // Round to 3 decimal places to preserve precision
    return Math.round(result * 1000) / 1000;
  };

  // Helper function to calculate tax-inclusive price from tax-exclusive price
  const calculateTaxInclusivePrice = (exclusivePrice: number, taxRate: number): number => {
    const result = exclusivePrice * (1 + (taxRate / 100));
    // Round to 3 decimal places to preserve precision
    return Math.round(result * 1000) / 1000;
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
    
    // Calculate GST (round to 3 decimal places)
    const gstAmount = Math.round((basePrice * gstRate) * 1000) / 1000;
    const cgstAmount = Math.round((gstAmount / 2) * 1000) / 1000;
    const sgstAmount = Math.round((gstAmount / 2) * 1000) / 1000;
    
    // Calculate CESS based on type (round to 3 decimal places)
    let cessTotal = 0;
    let cessBreakdown = '';
    
    switch (cessType) {
      case 'value':
        cessTotal = Math.round((basePrice * cessRateDecimal) * 1000) / 1000;
        cessBreakdown = `Value-based (${cessRate}% of ${formatCurrencyINR(basePrice)})`;
        break;
        
      case 'quantity':
        cessTotal = Math.round(cessAmount * 1000) / 1000; // For single unit
        cessBreakdown = `Quantity-based (${formatCurrencyINR(cessAmount)} per unit)`;
        break;
        
      case 'value_and_quantity':
        const valueCess = Math.round((basePrice * cessRateDecimal) * 1000) / 1000;
        const quantityCess = Math.round(cessAmount * 1000) / 1000; // For single unit
        cessTotal = Math.round((valueCess + quantityCess) * 1000) / 1000;
        cessBreakdown = `Value + Quantity (${cessRate}% + ${formatCurrencyINR(cessAmount)} per unit)`;
        break;
        
      case 'mrp':
        const effectiveMRP = mrp > 0 ? mrp : basePrice;
        cessTotal = Math.round((effectiveMRP * cessRateDecimal) * 1000) / 1000;
        cessBreakdown = `MRP-based (${cessRate}% of MRP ${formatCurrencyINR(effectiveMRP)})`;
        break;
        
      default:
        cessTotal = 0;
        cessBreakdown = 'No CESS';
        break;
    }
    
    const total = Math.round((basePrice + gstAmount + cessTotal) * 1000) / 1000;
    
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

  const displayPrices = useMemo(() => {
    const perUnitPrice = parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0;
    const salesPrice = parseFloat(formData.salesPrice) || 0;
    const taxRate = formData.taxRate;
    const cessType = formData.cessType || 'none';
    const cessRate = formData.cessRate || 0;
    const cessAmount = parseFloat(formData.cessAmount) || 0;
    const mrp = parseFloat(formData.mrp) || 0;

    if (formData.taxInclusive) {
      const perUnitBasePrice = calculateBasePriceFromTaxInclusive(
        perUnitPrice, taxRate, cessType, cessRate, cessAmount, mrp
      );
      const salesBasePrice = calculateBasePriceFromTaxInclusive(
        salesPrice, taxRate, cessType, cessRate, cessAmount, mrp
      );
      const perUnitBreakdown = calculateTaxAndCessBreakdown(
        perUnitBasePrice, taxRate, cessType, cessRate, cessAmount, mrp
      );
      const salesBreakdown = calculateTaxAndCessBreakdown(
        salesBasePrice, taxRate, cessType, cessRate, cessAmount, mrp
      );
      return {
        perUnitBasePrice, salesBasePrice,
        perUnitFinalPrice: perUnitPrice, salesFinalPrice: salesPrice,
        perUnitBreakdown, salesBreakdown, showCalculation: true
      };
    } else {
      const perUnitBreakdown = calculateTaxAndCessBreakdown(
        perUnitPrice, taxRate, cessType, cessRate, cessAmount, mrp
      );
      const salesBreakdown = calculateTaxAndCessBreakdown(
        salesPrice, taxRate, cessType, cessRate, cessAmount, mrp
      );
      return {
        perUnitBasePrice: perUnitPrice, salesBasePrice: salesPrice,
        perUnitFinalPrice: perUnitBreakdown.total, salesFinalPrice: salesBreakdown.total,
        perUnitBreakdown, salesBreakdown, showCalculation: true
      };
    }
  }, [formData.purchasePrice, formData.perUnitPrice, formData.salesPrice, formData.taxRate,
      formData.taxInclusive, formData.cessType, formData.cessRate, formData.cessAmount, formData.mrp]);

  const getDisplayPrices = () => displayPrices;

  const priceDec = Math.max(formData.quantityDecimals, 2);
  const fmtPrice = (n: number) => formatCurrencyINR(n, priceDec, 2);

  const handleStockChange = (field: 'minStockLevel' | 'maxStockLevel' | 'openingStock', text: string) => {
    const decimals = formData.quantityDecimals;
    if (decimals > 0) {
      const regex = new RegExp(`^\\d*\\.?\\d{0,${decimals}}$`);
      if (regex.test(text) || text === '') {
        updateFormData(field, text);
      }
    } else {
      const cleaned = text.replace(/[^0-9]/g, '');
      updateFormData(field, cleaned);
    }
  };

  const isFormValid = () => {
    // Basic validation
    const basicValidation = (
      formData.name.trim().length > 0 &&
      formData.category.trim().length > 0 &&
      formData.hsnCode.trim().length > 0 &&
      formData.barcode.trim().length > 0 &&
      (formData.purchasePrice.trim().length > 0 || formData.perUnitPrice.trim().length > 0) &&
      formData.salesPrice.trim().length > 0 &&
      (returnToStockIn === 'true' || formData.openingStock.trim().length > 0) &&
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

    // Expiry date validation (if provided, must be valid)
    if (!isExpiryDateValid()) {
      return false;
    }

    return basicValidation;
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }

    // Validate purchase price is lower than sale price (normalized to same UoM)
    const rawPurchase = parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0;
    const rawSale = parseFloat(formData.salesPrice);
    const convRatio = parseFloat(formData.conversionRatio) || 1;
    const useCompound = formData.useCompoundUnit && convRatio > 0;

    let normalizedPurchase = rawPurchase;
    let normalizedSale = rawSale;

    if (useCompound) {
      normalizedPurchase = formData.priceUnit === 'primary'
        ? rawPurchase / convRatio : rawPurchase;
      normalizedSale = formData.priceUnit === 'primary'
        ? rawSale / convRatio : rawSale;
    }

    if (normalizedPurchase >= normalizedSale) {
      const purchaseLabel = formData.priceUnit === 'primary' ? formData.primaryUnit : formData.secondaryUnit;
      const salesLabel = formData.priceUnit === 'primary' ? formData.primaryUnit : formData.secondaryUnit;
      Alert.alert(
        'Invalid Pricing', 
        `Purchase price (${formatCurrencyINR(rawPurchase)}/${purchaseLabel}) must be lower than sale price (${formatCurrencyINR(rawSale)}/${salesLabel}) to ensure profitability.`,
        [{ text: 'OK' }]
      );
      return;
    }

    // Check for duplicate products using cached data (only for new products)
    if (editMode !== 'true') {
      const cachedProducts = productStore.getProducts();
      const newName = formData.name.trim().toLowerCase();
      const newBarcode = formData.barcode.trim().toLowerCase();

      const duplicate = cachedProducts.find((p: any) => {
        if (p.name?.toLowerCase() === newName) return true;
        if (newBarcode && p.barcode?.toLowerCase() === newBarcode) return true;
        return false;
      });

      if (duplicate) {
        Alert.alert(
          'Duplicate Product Detected',
          `A product with the same ${duplicate.name?.toLowerCase() === newName ? 'name' : 'barcode'} already exists:\n\nName: ${duplicate.name || 'N/A'}\nCategory: ${duplicate.category || 'N/A'}\n\nDo you want to add this product anyway?`,
          [
            { text: 'Cancel', style: 'cancel', onPress: () => setIsSubmitting(false) },
            { text: 'Add Anyway', onPress: () => proceedWithProductCreation() },
          ]
        );
        return;
      }
    }

    // Proceed with product creation
    proceedWithProductCreation();
  };

  const proceedWithProductCreation = async () => {
    setIsSubmitting(true);

    // Auto-generate barcode if none exists
    let barcodeToUse = formData.barcode;
    if (!barcodeToUse || barcodeToUse.trim().length === 0) {
      try {
        const barcodeResult = await assignBarcode({ locationId: formData.locationId });
        if (barcodeResult.success && barcodeResult.barcode) {
          barcodeToUse = barcodeResult.barcode;
          setFormData(prev => ({ ...prev, barcode: barcodeToUse }));
          setBarcodeGenerated(true);
          generatedBarcodeRef.current = barcodeResult.barcode;
        } else {
          console.warn('Barcode generation failed:', barcodeResult.error);
        }
      } catch (e) {
        console.warn('Barcode generation error:', e);
      }
    }

    let finalProductImages = [...formData.productImages];
    let barcodeDataUri: string | null = null;
    
    if (barcodeToUse && barcodeToUse.trim().length > 0) {
      const hasBarcodeImage = finalProductImages.some(uri =>
        uri.includes('barcode_') || uri.startsWith('data:image')
      );

      if (!hasBarcodeImage) {
        try {
          barcodeDataUri = await generateBarcodeImage(barcodeToUse.trim());
          if (barcodeDataUri) {
            finalProductImages = [...finalProductImages, barcodeDataUri];
          }
        } catch (error) {
          console.error('Error generating barcode image:', error);
        }
      }
    }

    // Upload local images to Supabase Storage
    const localImages = finalProductImages.filter(uri => !uri.startsWith('http'));
    const remoteImages = finalProductImages.filter(uri => uri.startsWith('http'));
    
    if (localImages.length > 0) {
      try {
        const uploaded = await uploadProductImages(localImages);
        finalProductImages = [...remoteImages, ...uploaded];
      } catch (uploadErr) {
        console.warn('Image upload failed:', uploadErr);
        finalProductImages = [...remoteImages];
      }
    }

    if (finalProductImages.length === 0 && barcodeDataUri) {
      finalProductImages = [barcodeDataUri];
    } else if (barcodeDataUri && !finalProductImages.some(u => u.includes('barcode'))) {
      finalProductImages.push(barcodeDataUri);
    }

    const productData: Product = {
      id: editMode === 'true' && productId ? (productId as string) : `PROD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name.trim(),
      image: finalProductImages.length > 0 ? finalProductImages[0] : '',
      category: formData.category || formData.customCategory.trim(),
      hsnCode: formData.hsnCode.trim(),
      barcode: barcodeToUse.trim(),
      taxRate: formData.taxRate,
      taxInclusive: formData.taxInclusive,
      primaryUnit: formData.primaryUnit,
      secondaryUnit: formData.secondaryUnit !== 'None' ? formData.secondaryUnit : undefined,
      tertiaryUnit: formData.tertiaryUnit !== 'None' ? formData.tertiaryUnit : undefined,
      conversionRatio: formData.conversionRatio || undefined,
      tertiaryConversionRatio: formData.tertiaryConversionRatio || undefined,
      unitPrice: parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0,
      salesPrice: parseFloat(formData.salesPrice),
      minStockLevel: parseFloat(formData.minStockLevel) || 0,
      maxStockLevel: parseFloat(formData.maxStockLevel) || 0,
      currentStock: parseFloat(formData.openingStock || '0'),
      supplier: formData.preferredSupplier,
      location: formData.location,
      lastRestocked: new Date().toISOString(),
      stockValue: (parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0) * parseFloat(formData.openingStock || '0'),
      urgencyLevel: 'normal',
      batchNumber: formData.batchNumber || '',
      openingStock: parseFloat(formData.openingStock || '0'),
      mrp: formData.mrp || '',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      cessType: formData.cessType,
      cessRate: formData.cessRate,
      cessAmount: parseFloat(formData.cessAmount) || 0,
      cessUnit: formData.cessUnit,
      quantityDecimals: formData.quantityDecimals,
    };

    try {
      let savedProduct: any;
      
      if (editMode === 'true' && productId) {
        // Update existing product in Supabase
        const updateResult = await updateProduct(productId as string, {
          name: productData.name,
          category: productData.category,
          hsnCode: productData.hsnCode || undefined,
          barcode: productData.barcode || undefined,
          productImage: finalProductImages.length > 0 ? finalProductImages[0] : undefined,
          productImages: finalProductImages.length > 0 ? finalProductImages : undefined,
          storageLocationId: formData.locationId || undefined,
          showAdvancedOptions: formData.showAdvancedOptions,
          batchNumber: productData.batchNumber || undefined,
          expiryDate: convertExpiryDateToBackendFormat(formData.expiryDate),
          useCompoundUnit: formData.useCompoundUnit,
          unitType: formData.useCompoundUnit ? 'compound' : 'simple',
          primaryUnit: productData.primaryUnit,
          secondaryUnit: productData.secondaryUnit || undefined,
          tertiaryUnit: productData.tertiaryUnit || undefined,
          conversionRatio: productData.conversionRatio || undefined,
          tertiaryConversionRatio: productData.tertiaryConversionRatio || undefined,
          priceUnit: formData.priceUnit,
          stockUom: formData.stockUoM,
          taxRate: productData.taxRate,
          taxInclusive: productData.taxInclusive,
          cessType: productData.cessType,
          cessRate: productData.cessRate,
          cessAmount: productData.cessAmount,
          cessUnit: productData.cessUnit || undefined,
          openingStock: productData.openingStock,
          currentStock: productData.currentStock,
          minStockLevel: productData.minStockLevel,
          maxStockLevel: productData.maxStockLevel,
          stockUnit: formData.stockUoM,
          perUnitPrice: parseFloat(formData.purchasePrice) || productData.unitPrice,
          purchasePrice: parseFloat(formData.purchasePrice) || productData.unitPrice,
          salesPrice: productData.salesPrice,
          mrpPrice: parseFloat(formData.mrp) || 0,
          preferredSupplierId: formData.preferredSupplier || undefined,
          storageLocationName: productData.location || undefined,
          quantityDecimals: formData.quantityDecimals,
        });

        if (!updateResult.success || !updateResult.product) {
          Alert.alert('Error', updateResult.error || 'Failed to update product');
          setIsSubmitting(false);
          return;
        }

        savedProduct = updateResult.product;
        productSavedRef.current = true;
        
        productStore.updateProduct(productId as string, productData);
      } else {
        // For stock-in flow: defer product creation to the confirmation step
        // so product only exists if the purchase invoice is successfully created
        if (returnToStockIn === 'true') {
          const pendingCreateParams = {
            name: productData.name,
            category: productData.category,
            hsnCode: productData.hsnCode || undefined,
            barcode: productData.barcode || undefined,
            productImage: finalProductImages.length > 0 ? finalProductImages[0] : undefined,
            productImages: finalProductImages.length > 0 ? finalProductImages : undefined,
            storageLocationId: formData.locationId || undefined,
            showAdvancedOptions: formData.showAdvancedOptions,
            batchNumber: productData.batchNumber || undefined,
            expiryDate: convertExpiryDateToBackendFormat(formData.expiryDate),
            useCompoundUnit: formData.useCompoundUnit,
            unitType: formData.useCompoundUnit ? 'compound' : 'simple',
            primaryUnit: productData.primaryUnit,
            secondaryUnit: productData.secondaryUnit || undefined,
            tertiaryUnit: productData.tertiaryUnit || undefined,
            conversionRatio: productData.conversionRatio || undefined,
            tertiaryConversionRatio: productData.tertiaryConversionRatio || undefined,
            priceUnit: formData.priceUnit,
            stockUom: formData.stockUoM,
            taxRate: productData.taxRate,
            taxInclusive: productData.taxInclusive,
            cessType: productData.cessType,
            cessRate: productData.cessRate,
            cessAmount: productData.cessAmount,
            cessUnit: productData.cessUnit || undefined,
            openingStock: productData.openingStock,
            minStockLevel: productData.minStockLevel,
            maxStockLevel: productData.maxStockLevel,
            stockUnit: formData.stockUoM,
            perUnitPrice: parseFloat(formData.purchasePrice) || productData.unitPrice,
            purchasePrice: parseFloat(formData.purchasePrice) || productData.unitPrice,
            salesPrice: productData.salesPrice,
            mrpPrice: parseFloat(formData.mrp) || 0,
            preferredSupplierId: formData.preferredSupplier || undefined,
            storageLocationName: productData.location || undefined,
            quantityDecimals: formData.quantityDecimals,
          };

          const stockInProductData = {
            id: `new_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
            name: productData.name,
            price: productData.unitPrice,
            purchasePrice: parseFloat(formData.purchasePrice) || productData.unitPrice,
            gstRate: productData.taxRate,
            cessRate: formData.cessRate || 0,
            cessType: formData.cessType,
            cessAmount: parseFloat(formData.cessAmount) || 0,
            cessUnit: formData.cessUnit || '',
            primaryUnit: formData.primaryUnit,
            secondaryUnit: formData.secondaryUnit,
            useCompoundUnit: formData.useCompoundUnit,
            conversionRatio: formData.conversionRatio || '',
            hsnCode: formData.hsnCode || '',
            barcode: barcodeToUse || '',
            pendingProductData: pendingCreateParams,
          };

          Alert.alert('Success', 'Product added. Returning to stock in...', [{
            text: 'OK',
            onPress: () => {
              setNavData('newStockInProduct', stockInProductData);
              safeRouter.push({
                pathname: '/inventory/stock-in/manual',
              });
            }
          }]);

          setIsSubmitting(false);
          return;
        }

        // Normal create flow (not returning to stock-in)
        const createResult = await createProduct({
          name: productData.name,
          category: productData.category,
          hsnCode: productData.hsnCode || undefined,
          barcode: productData.barcode || undefined,
          productImage: finalProductImages.length > 0 ? finalProductImages[0] : undefined,
          productImages: finalProductImages.length > 0 ? finalProductImages : undefined,
          storageLocationId: formData.locationId || undefined,
          showAdvancedOptions: formData.showAdvancedOptions,
          batchNumber: productData.batchNumber || undefined,
          expiryDate: convertExpiryDateToBackendFormat(formData.expiryDate),
          useCompoundUnit: formData.useCompoundUnit,
          unitType: formData.useCompoundUnit ? 'compound' : 'simple',
          primaryUnit: productData.primaryUnit,
          secondaryUnit: productData.secondaryUnit || undefined,
          tertiaryUnit: productData.tertiaryUnit || undefined,
          conversionRatio: productData.conversionRatio || undefined,
          tertiaryConversionRatio: productData.tertiaryConversionRatio || undefined,
          priceUnit: formData.priceUnit,
          stockUom: formData.stockUoM,
          taxRate: productData.taxRate,
          taxInclusive: productData.taxInclusive,
          cessType: productData.cessType,
          cessRate: productData.cessRate,
          cessAmount: productData.cessAmount,
          cessUnit: productData.cessUnit || undefined,
          openingStock: productData.openingStock,
          minStockLevel: productData.minStockLevel,
          maxStockLevel: productData.maxStockLevel,
          stockUnit: formData.stockUoM,
          perUnitPrice: parseFloat(formData.purchasePrice) || productData.unitPrice,
          purchasePrice: parseFloat(formData.purchasePrice) || productData.unitPrice,
          salesPrice: productData.salesPrice,
          mrpPrice: parseFloat(formData.mrp) || 0,
          preferredSupplierId: formData.preferredSupplier || undefined,
          storageLocationName: productData.location || undefined,
          quantityDecimals: formData.quantityDecimals,
        });

        if (!createResult.success || !createResult.product) {
          Alert.alert('Error', createResult.error || 'Failed to create product');
          setIsSubmitting(false);
          return;
        }

        savedProduct = createResult.product;
        productData.id = savedProduct.id;
        productSavedRef.current = true;
        
        productStore.addProduct(productData);
      }
      
      // Continue with navigation logic
      if (returnToStockIn === 'true') {
        // Edit mode only reaches here (new products are handled above with deferred creation)
        const stockInProductData = {
          id: productData.id,
          name: productData.name,
          price: productData.unitPrice,
          purchasePrice: parseFloat(formData.purchasePrice) || productData.unitPrice,
          gstRate: productData.taxRate,
          cessRate: formData.cessRate || 0,
          cessType: formData.cessType,
          cessAmount: parseFloat(formData.cessAmount) || 0,
          cessUnit: formData.cessUnit || '',
          primaryUnit: formData.primaryUnit,
          secondaryUnit: formData.secondaryUnit,
          useCompoundUnit: formData.useCompoundUnit,
          conversionRatio: formData.conversionRatio || '',
          hsnCode: formData.hsnCode || '',
          barcode: barcodeToUse || '',
        };
        
        Alert.alert('Success', 'Product updated successfully. Returning to stock in...', [
          {
            text: 'OK',
            onPress: () => {
              safeRouter.push({
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
                  salesPriceUnit: 'primary',
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
                  locationId: null,
                  productImages: [],
                  quantityDecimals: 0,
                  roundOffOpeningStock: true,
                  batchNumber: '',
                  expiryDate: '',
                  showAdvancedOptions: false,
                });
                
                // Clear auto-filled fields
                setAutoFilledFields(new Set());
                
                // Clear scanned data from store
                clearScannedData();
                
                // Navigate to cart and replace the current screen
                safeRouter.replace({
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
                  salesPriceUnit: 'primary',
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
                  locationId: null,
                  productImages: [],
                  quantityDecimals: 0,
                  roundOffOpeningStock: true,
                  batchNumber: '',
                  expiryDate: '',
                  showAdvancedOptions: false,
                });
                
                // Clear auto-filled fields
                setAutoFilledFields(new Set());
                
                // Clear scanned data from store
                clearScannedData();
                
                // Navigate to cart and replace the current screen
                safeRouter.replace({
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
        // Default navigation - go back to the screen user came from
        // Clear the form data first
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
          productImages: [],
          locationId: null,
                  batchNumber: '',
                  expiryDate: '',
                  showAdvancedOptions: false,
                });
                
                // Clear auto-filled fields
                setAutoFilledFields(new Set());
                
                // Clear scanned data from store
                clearScannedData();
                
        // Navigate back immediately without waiting for Alert
        if (editMode === 'true') {
          // Go back to product details page after edit
                router.back();
        } else {
          // Navigate back to the screen user came from
          router.back();
        }
        
        // Show success message after navigation
                setTimeout(() => {
          Alert.alert('Success', editMode === 'true' ? 'Product updated successfully' : 'Product added to inventory successfully');
        }, 300);
      }
      
      setIsSubmitting(false);
    } catch (error: any) {
      console.error('Error saving product:', error);
      Alert.alert('Error', error.message || 'Failed to save product');
      setIsSubmitting(false);
    }
  };

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredSuppliers = suppliersList.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  // Filter locations from backend data
  const filteredLocations = useMemo(() => {
    if (!locations || locations.length === 0) return [];
    return locations.filter(location =>
      location.name.toLowerCase().includes(locationSearch.toLowerCase())
  );
  }, [locations, locationSearch]);

  const getSupplierName = (supplierId: string) => {
    const supplier = suppliersList.find(s => s.id === supplierId);
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
                safeRouter.push({
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

          {returnToStockIn !== 'true' && (
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
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowLocationModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dropdownText,
                  !formData.locationId && styles.placeholderText
                ]}>
                  {formData.location || 'Select storage location'}
                </Text>
                <ChevronDown size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
          </View>
          )}

          {/* Product Image */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Product Images</Text>
            
            {formData.productImages && formData.productImages.length > 0 ? (
              <View style={styles.imagesContainer}>
                <View style={styles.imagesGrid}>
                  {formData.productImages.map((imageUri, index) => {
                    // Check if this is the last image and barcode exists (barcode is always last)
                    const isBarcodeImage = formData.barcode && formData.barcode.trim().length > 0 && 
                                          index === formData.productImages.length - 1 &&
                                          imageUri.startsWith('data:image');
                    return (
                      <View key={index} style={[
                        styles.imagePreviewWrapper,
                        isBarcodeImage && styles.barcodeImageWrapper
                      ]}>
                        {isBarcodeImage ? (
                          <View style={styles.barcodePreviewInner}>
                            <Image 
                              source={{ uri: imageUri }}
                              style={styles.barcodeImagePreview}
                              resizeMode="contain"
                            />
                            <Text style={styles.barcodeNumberText} numberOfLines={1}>
                              {formData.barcode}
                            </Text>
                          </View>
                        ) : (
                          <Image 
                            source={{ uri: imageUri }}
                            style={styles.productImagePreview}
                            resizeMode="cover"
                          />
                        )}
                        <TouchableOpacity
                          style={styles.removeImageButton}
                          onPress={() => handleRemoveImage(index)}
                          activeOpacity={0.7}
                        >
                          <X size={16} color={Colors.background} />
                        </TouchableOpacity>
                      </View>
                    );
                  })}
                </View>
                <TouchableOpacity
                  style={styles.addMoreImageButton}
                  onPress={() => setShowImageModal(true)}
                  activeOpacity={0.7}
                >
                  <Plus size={20} color={Colors.primary} />
                  <Text style={styles.addImageText}>Add More Images</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <>
              <TouchableOpacity
                style={styles.addImageButton}
                onPress={() => setShowImageModal(true)}
                activeOpacity={0.7}
              >
                <Camera size={24} color={Colors.primary} />
                  <Text style={styles.addImageText}>Add Product Images</Text>
              </TouchableOpacity>
                {formData.barcode && formData.barcode.trim().length > 0 && (
                  <View style={styles.barcodePreviewIndicator}>
                    <Barcode size={16} color={Colors.primary} />
                    <Text style={styles.barcodePreviewText}>
                      Barcode image will be automatically added for: {formData.barcode}
                    </Text>
                  </View>
                )}
              </>
            )}
          </View>



          {/* Basic Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Basic Information</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Product Name *</Text>
              <FocusableInput style={[
                inputFocusStyles.inputContainer,
                focusedField === 'name' && inputFocusStyles.inputContainerFocused,
                autoFilledFields.has('name') && styles.autoFilledInput
              ]}>
                <Package size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  key={`name-${forceUpdate}`}
                  style={inputFocusStyles.input as any}
                  value={formData.name}
                  onChangeText={(text) => updateFormData('name', text)}
                  onFocus={() => setFocusedField('name')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter product name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                />
                {autoFilledFields.has('name') && (
                  <Text style={styles.autoFilledBadge}>✓ Auto-filled</Text>
                )}
              </FocusableInput>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              {formData.category === 'Others' ? (
                <View style={styles.customInputContainer}>
                  <FocusableInput style={[
                    inputFocusStyles.inputContainer,
                    focusedField === 'customCategory' && inputFocusStyles.inputContainerFocused
                  ]}>
                    <TextInput
                      key={`customCategory-${forceUpdate}`}
                      style={inputFocusStyles.input as any}
                      value={formData.customCategory}
                      onChangeText={(text) => updateFormData('customCategory', text)}
                      onFocus={() => setFocusedField('customCategory')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter custom category"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="words"
                    />
                  </FocusableInput>
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
              <FocusableInput style={[
                inputFocusStyles.inputContainer,
                focusedField === 'hsnCode' && inputFocusStyles.inputContainerFocused
              ]}>
                <Hash size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={inputFocusStyles.input as any}
                  value={formData.hsnCode}
                  onChangeText={(text) => updateFormData('hsnCode', text.replace(/\D/g, '').slice(0, 8))}
                  onFocus={() => setFocusedField('hsnCode')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter HSN code"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                  maxLength={8}
                />
              </FocusableInput>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Barcode</Text>
              <View style={styles.barcodeRow}>
                <FocusableInput style={[
                  inputFocusStyles.inputContainer,
                  focusedField === 'barcode' && inputFocusStyles.inputContainerFocused,
                  autoFilledFields.has('barcode') && styles.autoFilledInput,
                  styles.barcodeInputWrapper
                ]}>
                  <Barcode size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    key={`barcode-${forceUpdate}`}
                    style={inputFocusStyles.input as any}
                    value={formData.barcode}
                    onChangeText={(text) => updateFormData('barcode', text)}
                    onFocus={() => setFocusedField('barcode')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Enter or scan barcode"
                    placeholderTextColor={Colors.textLight}
                    editable={!isGeneratingBarcode}
                  />
                  {autoFilledFields.has('barcode') && (
                    <Text style={styles.autoFilledBadge}>✓ Auto-filled</Text>
                  )}
                </FocusableInput>
                <TouchableOpacity
                  style={[
                    styles.generateBarcodeButton,
                    (isGeneratingBarcode || (barcodeGenerated && formData.barcode.trim().length > 0)) && styles.generateBarcodeButtonDisabled
                  ]}
                  onPress={() => setShowGenerateBarcodeModal(true)}
                  disabled={isGeneratingBarcode || (barcodeGenerated && formData.barcode.trim().length > 0)}
                  activeOpacity={0.7}
                >
                  <Wand2 size={18} color={(barcodeGenerated && formData.barcode.trim().length > 0) ? Colors.textLight : '#FFF'} />
                  <Text style={[
                    styles.generateBarcodeButtonText,
                    (barcodeGenerated && formData.barcode.trim().length > 0) && { color: Colors.textLight }
                  ]}>
                    {isGeneratingBarcode ? '...' : barcodeGenerated ? 'Generated' : 'Generate'}
                  </Text>
                </TouchableOpacity>
              </View>
              <Text style={styles.barcodeHint}>
                Scan or enter manufacturer barcode, or tap Generate to assign a unique Manager barcode
              </Text>
            </View>

            {/* Generate Barcode Confirmation Modal */}
            <Modal
              visible={showGenerateBarcodeModal}
              transparent
              animationType="fade"
              onRequestClose={() => setShowGenerateBarcodeModal(false)}
            >
              <View style={styles.modalOverlay}>
                <View style={styles.generateBarcodeModalContent}>
                  <View style={styles.generateBarcodeModalHeader}>
                    <Barcode size={32} color={Colors.primary} />
                    <Text style={styles.generateBarcodeModalTitle}>Assign Manager Barcode</Text>
                  </View>
                  <Text style={styles.generateBarcodeModalBody}>
                    Please confirm: This product does <Text style={styles.boldText}>not</Text> have a barcode from the manufacturer or Manager on the physical product.
                  </Text>
                  <Text style={styles.generateBarcodeModalSubtext}>
                    Only proceed if you need to assign a new unique barcode (13-character alphanumeric). Once assigned, this barcode will never be given to any other product.
                  </Text>
                  <View style={styles.generateBarcodeModalActions}>
                    <TouchableOpacity
                      style={[styles.generateBarcodeModalCancelButton, { flex: 1 }]}
                      onPress={() => setShowGenerateBarcodeModal(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.generateBarcodeModalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.generateBarcodeModalConfirmButton, { flex: 1 }]}
                      onPress={handleGenerateBarcodeConfirm}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.generateBarcodeModalConfirmText}>Yes, Generate</Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            </Modal>





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
                  <FocusableInput style={[
                    inputFocusStyles.inputContainer,
                    focusedField === 'batchNumber' && inputFocusStyles.inputContainerFocused
                  ]}>
                    <TextInput
                      style={inputFocusStyles.input as any}
                      value={formData.batchNumber}
                      onChangeText={(text) => updateFormData('batchNumber', text)}
                      onFocus={() => setFocusedField('batchNumber')}
                      onBlur={() => setFocusedField(null)}
                      placeholder="Enter batch number"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="characters"
                    />
                  </FocusableInput>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Expiry Date</Text>
                  <View style={styles.dateInputWrapper}>
                    <FocusableInput style={[
                      inputFocusStyles.inputContainer,
                      focusedField === 'expiryDate' && inputFocusStyles.inputContainerFocused,
                      { flex: 1, marginRight: 8 }
                    ]}>
                    <TextInput
                        style={inputFocusStyles.input as any}
                      value={formData.expiryDate}
                        onChangeText={handleExpiryDateTextChange}
                        onFocus={() => setFocusedField('expiryDate')}
                        onBlur={() => setFocusedField(null)}
                        placeholder="DD-MM-YYYY"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      maxLength={10}
                        contextMenuHidden={true}
                        selectTextOnFocus={false}
                      />
                    </FocusableInput>
                    <TouchableOpacity
                      style={styles.calendarButton}
                      onPress={handleOpenExpiryDatePicker}
                      activeOpacity={0.7}
                    >
                      <Calendar size={20} color={Colors.primary} />
                    </TouchableOpacity>
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
                {/* Tertiary Unit Option - Only available when compound UoM is enabled and primary/secondary units are set */}
                {formData.useCompoundUnit && 
                 formData.primaryUnit && 
                 formData.primaryUnit !== 'None' && 
                 formData.secondaryUnit && 
                 formData.secondaryUnit !== 'None' && (
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
                )}
                
                {formData.useCompoundUnit && 
                 formData.primaryUnit && 
                 formData.primaryUnit !== 'None' && 
                 formData.secondaryUnit && 
                 formData.secondaryUnit !== 'None' && 
                 formData.tertiaryUnit !== 'None' && (
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
            <Text style={styles.sectionTitle}>Tax Information (GST 2.0)</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>GST Rate *</Text>
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
              <Text style={{ fontSize: 12, color: '#6B7280', marginBottom: 8, lineHeight: 17 }}>
                Compensation Cess was abolished under GST 2.0 for most categories. Only applicable for select tobacco and specialty goods.
              </Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowCessTypeModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownText}>
                  {formData.cessType === 'none' ? 'No CESS' : 
                   formData.cessType === 'value' ? `Value Based (${formData.cessRate}%)` :
                   formData.cessType === 'quantity' ? `Quantity Based (${formatCurrencyINR(formData.cessAmount)}/${formData.cessUnit || 'unit'})` :
                   formData.cessType === 'value_and_quantity' ? `Value & Quantity (${formData.cessRate}% + ${formatCurrencyINR(formData.cessAmount)}/${formData.cessUnit || 'unit'})` :
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
                  {formData.useCompoundUnit && 
                   formData.primaryUnit && 
                   formData.primaryUnit !== 'None' && 
                   formData.secondaryUnit && 
                   formData.secondaryUnit !== 'None' && 
                   formData.tertiaryUnit !== 'None' && (
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
            
            {returnToStockIn !== 'true' && (
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
              <FocusableInput style={[
                inputFocusStyles.inputContainer,
                focusedField === 'openingStock' && inputFocusStyles.inputContainerFocused
              ]}>
                <TextInput
                  style={inputFocusStyles.input as any}
                  value={formData.openingStock}
                  onChangeText={(text) => handleStockChange('openingStock', text)}
                  onFocus={() => setFocusedField('openingStock')}
                  onBlur={() => setFocusedField(null)}
                  placeholder={formData.quantityDecimals > 0 ? '0.00' : '0'}
                  placeholderTextColor={Colors.textLight}
                  keyboardType={formData.quantityDecimals > 0 ? 'decimal-pad' : 'numeric'}
                />
              </FocusableInput>
            </View>
            )}

            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Min Stock Level *</Text>
                <FocusableInput style={[
                  inputFocusStyles.inputContainer,
                  focusedField === 'minStockLevel' && inputFocusStyles.inputContainerFocused
                ]}>
                  <TextInput
                    style={inputFocusStyles.input as any}
                    value={formData.minStockLevel}
                    onChangeText={(text) => handleStockChange('minStockLevel', text)}
                    onFocus={() => setFocusedField('minStockLevel')}
                    onBlur={() => setFocusedField(null)}
                    placeholder={formData.quantityDecimals > 0 ? '0.00' : '0'}
                    placeholderTextColor={Colors.textLight}
                    keyboardType={formData.quantityDecimals > 0 ? 'decimal-pad' : 'numeric'}
                  />
                </FocusableInput>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Max Stock Level *</Text>
                <FocusableInput style={[
                  inputFocusStyles.inputContainer,
                  focusedField === 'maxStockLevel' && inputFocusStyles.inputContainerFocused
                ]}>
                  <TextInput
                    style={inputFocusStyles.input as any}
                    value={formData.maxStockLevel}
                    onChangeText={(text) => handleStockChange('maxStockLevel', text)}
                    onFocus={() => setFocusedField('maxStockLevel')}
                    onBlur={() => setFocusedField(null)}
                    placeholder={formData.quantityDecimals > 0 ? '0.00' : '0'}
                    placeholderTextColor={Colors.textLight}
                    keyboardType={formData.quantityDecimals > 0 ? 'decimal-pad' : 'numeric'}
                  />
                </FocusableInput>
              </View>
            </View>
          </View>

          {/* Quantity Decimal Precision */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Quantity Precision</Text>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>How many decimals for quantity?</Text>
              <Text style={{ fontSize: 12, color: Colors.textLight, marginBottom: 8 }}>
                {formData.quantityDecimals === 0
                  ? 'Whole numbers only (e.g. 1, 2, 10)'
                  : `Up to ${formData.quantityDecimals} decimal${formData.quantityDecimals > 1 ? 's' : ''} (e.g. ${formData.quantityDecimals === 1 ? '1.5' : formData.quantityDecimals === 2 ? '1.75' : formData.quantityDecimals === 3 ? '1.999' : '1.9999'})`}
              </Text>
              <View style={{ flexDirection: 'row', gap: 8 }}>
                {[0, 1, 2, 3, 4].map((d) => (
                  <TouchableOpacity
                    key={d}
                    style={{
                      flex: 1,
                      paddingVertical: 10,
                      borderRadius: 8,
                      backgroundColor: formData.quantityDecimals === d ? Colors.primary : Colors.grey[100],
                      borderWidth: 1,
                      borderColor: formData.quantityDecimals === d ? Colors.primary : Colors.grey[200],
                      alignItems: 'center',
                    }}
                    onPress={() => updateFormData('quantityDecimals', d)}
                    activeOpacity={0.7}
                  >
                    <Text style={{
                      fontSize: 14,
                      fontWeight: '600',
                      color: formData.quantityDecimals === d ? '#fff' : Colors.text,
                    }}>
                      {d}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </View>

                     {/* Pricing */}
           <View style={styles.section}>
             <Text style={styles.sectionTitle}>Pricing</Text>

            {/* Tax Inclusive/Exclusive Toggle */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Are the prices you enter inclusive of tax?</Text>
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
              <Text style={styles.inputHint}>
                {formData.taxInclusive
                  ? 'You are entering the final price (tax already included). We will calculate the base price.'
                  : 'You are entering the base price. Tax will be added on top.'}
              </Text>
            </View>

            {/* UoM for pricing - only when compound units */}
            {formData.useCompoundUnit && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Price is per</Text>
                <View style={styles.priceUnitContainer}>
                  <TouchableOpacity
                    style={[
                      styles.priceUnitButton,
                      formData.priceUnit === 'primary' && styles.activePriceUnitButton
                    ]}
                    onPress={() => { updateFormData('priceUnit', 'primary'); updateFormData('salesPriceUnit', 'primary'); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.priceUnitButtonText,
                      formData.priceUnit === 'primary' && styles.activePriceUnitButtonText
                    ]}>
                      {formData.primaryUnit}
                    </Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.priceUnitButton,
                      formData.priceUnit === 'secondary' && styles.activePriceUnitButton
                    ]}
                    onPress={() => { updateFormData('priceUnit', 'secondary'); updateFormData('salesPriceUnit', 'secondary'); }}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.priceUnitButtonText,
                      formData.priceUnit === 'secondary' && styles.activePriceUnitButtonText
                    ]}>
                      {formData.secondaryUnit}
                    </Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}

            {/* Purchase Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Purchase Price *
                <Text style={styles.unitIndicator}>
                  {` (per ${formData.priceUnit === 'primary' ? formData.primaryUnit : formData.secondaryUnit}${formData.taxInclusive ? ', tax inclusive' : ', before tax'})`}
                </Text>
              </Text>
              <FocusableInput style={[
                inputFocusStyles.inputContainer,
                focusedField === 'purchasePrice' && inputFocusStyles.inputContainerFocused
              ]}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[inputFocusStyles.input, { flex: 1 }] as any}
                  value={formData.purchasePrice}
                  onChangeText={(text) => handlePriceChange('purchasePrice', text)}
                  onFocus={() => setFocusedField('purchasePrice')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </FocusableInput>
              {/* Inline breakdown for purchase price */}
              {(parseFloat(formData.purchasePrice) > 0) && (
                (() => {
                  const dp = getDisplayPrices();
                  const taxRate = formData.taxRate;
                  const base = dp.perUnitBasePrice;
                  const gst = Math.round((base * taxRate / 100) * 100) / 100;
                  const cess = formData.cessType !== 'none' ? Math.round((dp.perUnitBreakdown?.cessTotal ?? 0) * 100) / 100 : 0;
                  const total = dp.perUnitFinalPrice;
                  return (
                    <View style={{ backgroundColor: '#FEF2F2', borderRadius: 8, padding: 10, marginTop: 8, gap: 2 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>Base Price</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }}>{fmtPrice(base)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>GST ({taxRate}%)</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }}>{fmtPrice(gst)}</Text>
                      </View>
                      {cess > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, color: '#64748b' }}>CESS</Text>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }}>{fmtPrice(cess)}</Text>
                        </View>
                      )}
                      <View style={{ borderTopWidth: 1, borderTopColor: '#FECACA', paddingTop: 3, marginTop: 2, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#DC2626' }}>Total (incl. tax)</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#DC2626' }}>{fmtPrice(total)}</Text>
                      </View>
                    </View>
                  );
                })()
              )}
            </View>

            {/* Sales Price */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Sales Price *
                <Text style={styles.unitIndicator}>
                  {` (per ${formData.priceUnit === 'primary' ? formData.primaryUnit : formData.secondaryUnit}${formData.taxInclusive ? ', tax inclusive' : ', before tax'})`}
                </Text>
              </Text>
              <FocusableInput style={[
                inputFocusStyles.inputContainer,
                focusedField === 'salesPrice' && inputFocusStyles.inputContainerFocused
              ]}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={[inputFocusStyles.input, { flex: 1 }] as any}
                  value={formData.salesPrice}
                  onChangeText={(text) => handlePriceChange('salesPrice', text)}
                  onFocus={() => setFocusedField('salesPrice')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </FocusableInput>
              {/* Inline breakdown for sales price */}
              {(parseFloat(formData.salesPrice) > 0) && (
                (() => {
                  const dp = getDisplayPrices();
                  const taxRate = formData.taxRate;
                  const base = dp.salesBasePrice;
                  const gst = Math.round((base * taxRate / 100) * 100) / 100;
                  const cess = formData.cessType !== 'none' ? Math.round((dp.salesBreakdown?.cessTotal ?? 0) * 100) / 100 : 0;
                  const total = dp.salesFinalPrice;
                  return (
                    <View style={{ backgroundColor: '#F0FDF4', borderRadius: 8, padding: 10, marginTop: 8, gap: 2 }}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>Base Price</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }}>{fmtPrice(base)}</Text>
                      </View>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 12, color: '#64748b' }}>GST ({taxRate}%)</Text>
                        <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }}>{fmtPrice(gst)}</Text>
                      </View>
                      {cess > 0 && (
                        <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                          <Text style={{ fontSize: 12, color: '#64748b' }}>CESS</Text>
                          <Text style={{ fontSize: 12, fontWeight: '600', color: '#1F2937' }}>{fmtPrice(cess)}</Text>
                        </View>
                      )}
                      <View style={{ borderTopWidth: 1, borderTopColor: '#BBF7D0', paddingTop: 3, marginTop: 2, flexDirection: 'row', justifyContent: 'space-between' }}>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#059669' }}>Total (incl. tax)</Text>
                        <Text style={{ fontSize: 13, fontWeight: '700', color: '#059669' }}>{fmtPrice(total)}</Text>
                      </View>
                    </View>
                  );
                })()
              )}
            </View>

            {/* MRP */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                MRP (Maximum Retail Price)
                {formData.useCompoundUnit && (
                  <Text style={styles.unitIndicator}>
                    {` (per ${formData.priceUnit === 'primary' ? formData.primaryUnit : formData.secondaryUnit})`}
                  </Text>
                )}
              </Text>
              <FocusableInput style={[
                inputFocusStyles.inputContainer,
                focusedField === 'mrp' && inputFocusStyles.inputContainerFocused
              ]}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={inputFocusStyles.input as any}
                  value={formData.mrp}
                  onChangeText={(text) => handlePriceChange('mrp', text)}
                  onFocus={() => setFocusedField('mrp')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </FocusableInput>
            </View>

            {/* Profit Margin */}
            {(formData.purchasePrice || formData.perUnitPrice) && formData.salesPrice && (
              (() => {
                const dp = getDisplayPrices();
                const marginAbs = dp.salesBasePrice - dp.perUnitBasePrice;
                const marginPct = dp.perUnitBasePrice > 0 ? (marginAbs / dp.perUnitBasePrice * 100) : 0;
                const isNegative = marginAbs < 0;
                return (
                  <View style={[styles.marginContainer, isNegative && styles.warningContainer]}>
                    {isNegative ? (
                      <Text style={styles.warningText}>
                        ⚠️ Purchase price is higher than sale price. Margin: {fmtPrice(marginAbs)} ({marginPct.toFixed(1)}%)
                      </Text>
                    ) : (
                      <>
                        <Text style={styles.marginLabel}>Profit Margin:</Text>
                        <Text style={styles.marginValue}>{fmtPrice(marginAbs)} ({marginPct.toFixed(1)}%)</Text>
                      </>
                    )}
                  </View>
                );
              })()
            )}

            {/* UoM Price Conversion Table - shown only for compound units with prices entered */}
            {formData.useCompoundUnit && formData.secondaryUnit && formData.secondaryUnit !== 'None' && parseFloat(formData.conversionRatio) > 0 && (parseFloat(formData.purchasePrice) > 0 || parseFloat(formData.salesPrice) > 0) && (
              (() => {
                const dp = getDisplayPrices();
                const convRatio = parseFloat(formData.conversionRatio) || 1;
                const pUnit = formData.primaryUnit;
                const sUnit = formData.secondaryUnit;
                const priceIsPerPrimary = formData.priceUnit === 'primary';
                const fmt = fmtPrice;

                const purchaseRaw = parseFloat(formData.purchasePrice) || 0;
                const salesRaw = parseFloat(formData.salesPrice) || 0;

                const purchasePerPrimary = priceIsPerPrimary ? purchaseRaw : purchaseRaw * convRatio;
                const purchasePerSecondary = priceIsPerPrimary ? purchaseRaw / convRatio : purchaseRaw;
                const salesPerPrimary = priceIsPerPrimary ? salesRaw : salesRaw * convRatio;
                const salesPerSecondary = priceIsPerPrimary ? salesRaw / convRatio : salesRaw;

                const taxLabel = formData.taxInclusive ? 'incl. tax' : 'before tax';

                const purchaseBasePerPrimary = formData.taxInclusive
                  ? dp.perUnitBasePrice * (priceIsPerPrimary ? 1 : convRatio)
                  : purchasePerPrimary;
                const purchaseBasePerSecondary = purchaseBasePerPrimary / convRatio;
                const salesBasePerPrimary = formData.taxInclusive
                  ? dp.salesBasePrice * (priceIsPerPrimary ? 1 : convRatio)
                  : salesPerPrimary;
                const salesBasePerSecondary = salesBasePerPrimary / convRatio;

                const taxRate = formData.taxRate / 100;
                const purchaseTaxPerPrimary = Math.round(purchaseBasePerPrimary * taxRate * 100) / 100;
                const purchaseTaxPerSecondary = Math.round(purchaseBasePerSecondary * taxRate * 100) / 100;
                const salesTaxPerPrimary = Math.round(salesBasePerPrimary * taxRate * 100) / 100;
                const salesTaxPerSecondary = Math.round(salesBasePerSecondary * taxRate * 100) / 100;

                const purchaseTotalPerPrimary = Math.round((purchaseBasePerPrimary + purchaseTaxPerPrimary) * 100) / 100;
                const purchaseTotalPerSecondary = Math.round((purchaseBasePerSecondary + purchaseTaxPerSecondary) * 100) / 100;
                const salesTotalPerPrimary = Math.round((salesBasePerPrimary + salesTaxPerPrimary) * 100) / 100;
                const salesTotalPerSecondary = Math.round((salesBasePerSecondary + salesTaxPerSecondary) * 100) / 100;

                return (
                  <View style={{ backgroundColor: '#F8FAFC', borderRadius: 12, padding: 14, marginTop: 12, borderWidth: 1, borderColor: '#E2E8F0' }}>
                    <Text style={{ fontSize: 14, fontWeight: '700', color: '#1E293B', marginBottom: 4 }}>
                      Price Conversion Table
                    </Text>
                    <Text style={{ fontSize: 11, color: '#64748B', marginBottom: 10 }}>
                      1 {pUnit} = {convRatio} {sUnit}{convRatio > 1 ? 's' : ''}
                    </Text>

                    {/* Table Header */}
                    <View style={{ flexDirection: 'row', borderBottomWidth: 1, borderBottomColor: '#CBD5E1', paddingBottom: 6, marginBottom: 6 }}>
                      <Text style={{ flex: 2, fontSize: 11, fontWeight: '600', color: '#475569' }}> </Text>
                      <Text style={{ flex: 3, fontSize: 11, fontWeight: '600', color: '#475569', textAlign: 'center' }}>Per {pUnit}</Text>
                      <Text style={{ flex: 3, fontSize: 11, fontWeight: '600', color: '#475569', textAlign: 'center' }}>Per {sUnit}</Text>
                    </View>

                    {/* Purchase Price Row */}
                    {purchaseRaw > 0 && (
                      <>
                        <View style={{ flexDirection: 'row', paddingVertical: 4 }}>
                          <Text style={{ flex: 2, fontSize: 11, fontWeight: '600', color: '#DC2626' }}>Purchase</Text>
                          <Text style={{ flex: 3, fontSize: 12, fontWeight: '600', color: '#1E293B', textAlign: 'center' }}>{fmt(purchaseTotalPerPrimary)}</Text>
                          <Text style={{ flex: 3, fontSize: 12, fontWeight: '600', color: '#1E293B', textAlign: 'center' }}>{fmt(purchaseTotalPerSecondary)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', paddingVertical: 1 }}>
                          <Text style={{ flex: 2, fontSize: 10, color: '#94A3B8' }}>  Base</Text>
                          <Text style={{ flex: 3, fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>{fmt(purchaseBasePerPrimary)}</Text>
                          <Text style={{ flex: 3, fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>{fmt(purchaseBasePerSecondary)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', paddingVertical: 1, marginBottom: 4 }}>
                          <Text style={{ flex: 2, fontSize: 10, color: '#94A3B8' }}>  GST ({formData.taxRate}%)</Text>
                          <Text style={{ flex: 3, fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>{fmt(purchaseTaxPerPrimary)}</Text>
                          <Text style={{ flex: 3, fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>{fmt(purchaseTaxPerSecondary)}</Text>
                        </View>
                      </>
                    )}

                    {/* Sales Price Row */}
                    {salesRaw > 0 && (
                      <>
                        <View style={{ flexDirection: 'row', paddingVertical: 4, borderTopWidth: purchaseRaw > 0 ? 1 : 0, borderTopColor: '#E2E8F0', paddingTop: purchaseRaw > 0 ? 6 : 4 }}>
                          <Text style={{ flex: 2, fontSize: 11, fontWeight: '600', color: '#059669' }}>Sales</Text>
                          <Text style={{ flex: 3, fontSize: 12, fontWeight: '600', color: '#1E293B', textAlign: 'center' }}>{fmt(salesTotalPerPrimary)}</Text>
                          <Text style={{ flex: 3, fontSize: 12, fontWeight: '600', color: '#1E293B', textAlign: 'center' }}>{fmt(salesTotalPerSecondary)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', paddingVertical: 1 }}>
                          <Text style={{ flex: 2, fontSize: 10, color: '#94A3B8' }}>  Base</Text>
                          <Text style={{ flex: 3, fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>{fmt(salesBasePerPrimary)}</Text>
                          <Text style={{ flex: 3, fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>{fmt(salesBasePerSecondary)}</Text>
                        </View>
                        <View style={{ flexDirection: 'row', paddingVertical: 1 }}>
                          <Text style={{ flex: 2, fontSize: 10, color: '#94A3B8' }}>  GST ({formData.taxRate}%)</Text>
                          <Text style={{ flex: 3, fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>{fmt(salesTaxPerPrimary)}</Text>
                          <Text style={{ flex: 3, fontSize: 10, color: '#94A3B8', textAlign: 'center' }}>{fmt(salesTaxPerSecondary)}</Text>
                        </View>
                      </>
                    )}

                    {/* Margin per unit */}
                    {purchaseRaw > 0 && salesRaw > 0 && (
                      <View style={{ flexDirection: 'row', paddingVertical: 6, borderTopWidth: 1, borderTopColor: '#CBD5E1', marginTop: 6 }}>
                        <Text style={{ flex: 2, fontSize: 11, fontWeight: '600', color: '#475569' }}>Margin</Text>
                        <Text style={{ flex: 3, fontSize: 12, fontWeight: '700', color: (salesTotalPerPrimary - purchaseTotalPerPrimary) >= 0 ? '#059669' : '#DC2626', textAlign: 'center' }}>
                          {fmt(salesTotalPerPrimary - purchaseTotalPerPrimary)}
                        </Text>
                        <Text style={{ flex: 3, fontSize: 12, fontWeight: '700', color: (salesTotalPerSecondary - purchaseTotalPerSecondary) >= 0 ? '#059669' : '#DC2626', textAlign: 'center' }}>
                          {fmt(salesTotalPerSecondary - purchaseTotalPerSecondary)}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })()
            )}
            
            {/* Opening Stock Summary */}
            {returnToStockIn !== 'true' && (formData.purchasePrice || formData.perUnitPrice) && formData.openingStock && (
              (() => {
                const purchasePrice = parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0;
                const openingStock = parseFloat(formData.openingStock) || 0;
                if (isNaN(purchasePrice) || isNaN(openingStock) || openingStock === 0) return null;

                const priceEntered = purchasePrice * openingStock;
                const basePriceTotal = formData.taxInclusive
                  ? displayPrices.perUnitBasePrice * openingStock
                  : priceEntered;
                const gstTotal = (formData.taxInclusive
                  ? displayPrices.perUnitBasePrice * openingStock
                  : priceEntered) * formData.taxRate / 100;

                let cessTotal = 0;
                const cessBase = formData.taxInclusive ? displayPrices.perUnitBasePrice * openingStock : priceEntered;
                switch (formData.cessType) {
                  case 'value': cessTotal = cessBase * formData.cessRate / 100; break;
                  case 'quantity': cessTotal = openingStock * parseFloat(formData.cessAmount || '0'); break;
                  case 'value_and_quantity':
                    cessTotal = (cessBase * formData.cessRate / 100) + (openingStock * parseFloat(formData.cessAmount || '0')); break;
                  case 'mrp':
                    cessTotal = ((parseFloat(formData.mrp) || 0) * openingStock) * formData.cessRate / 100; break;
                }

                let exactTotal = formData.taxInclusive
                  ? priceEntered
                  : basePriceTotal + gstTotal + cessTotal;

                const roundedTotal = Math.round(exactTotal);
                const roundOffDiff = Math.round((roundedTotal - exactTotal) * 100) / 100;

                return (
                  <View style={styles.summaryContainer}>
                    <TouchableOpacity
                      style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}
                      onPress={() => setSummaryExpanded(!summaryExpanded)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.summaryTitle}>Opening Stock Summary</Text>
                      {summaryExpanded
                        ? <ChevronUp size={18} color={Colors.textLight} />
                        : <ChevronDown size={18} color={Colors.textLight} />}
                    </TouchableOpacity>

                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>
                        Price Entered ({formData.taxInclusive ? 'Tax-Inclusive' : 'Tax-Exclusive'}):
                      </Text>
                      <Text style={styles.summaryValue}>{fmtPrice(priceEntered)}</Text>
                    </View>

                    <View style={[styles.summaryRow, styles.totalRow]}>
                      <Text style={styles.totalLabel}>Total Value:</Text>
                      <Text style={styles.totalValue}>
                        {formData.roundOffOpeningStock
                          ? formatCurrencyINR(roundedTotal, 2, 0)
                          : fmtPrice(exactTotal)}
                      </Text>
                    </View>

                    {summaryExpanded && (
                      <>
                        <View style={{ borderTopWidth: 1, borderTopColor: '#E2E8F0', marginVertical: 8 }} />
                        {formData.taxInclusive ? (
                          <>
                            <View style={styles.summaryRow}>
                              <Text style={styles.summaryLabel}>Base Price (Before Tax):</Text>
                              <Text style={styles.summaryValue}>{fmtPrice(basePriceTotal)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                              <Text style={styles.summaryLabel}>GST ({formData.taxRate}%):</Text>
                              <Text style={styles.summaryValue}>{fmtPrice(gstTotal)}</Text>
                            </View>
                            {formData.cessType !== 'none' && cessTotal > 0 && (
                              <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>CESS:</Text>
                                <Text style={styles.summaryValue}>{fmtPrice(cessTotal)}</Text>
                              </View>
                            )}
                          </>
                        ) : (
                          <>
                            <View style={styles.summaryRow}>
                              <Text style={styles.summaryLabel}>Base Price (Tax-Exclusive):</Text>
                              <Text style={styles.summaryValue}>{fmtPrice(basePriceTotal)}</Text>
                            </View>
                            <View style={styles.summaryRow}>
                              <Text style={styles.summaryLabel}>GST ({formData.taxRate}%):</Text>
                              <Text style={styles.summaryValue}>{fmtPrice(gstTotal)}</Text>
                            </View>
                            {formData.cessType !== 'none' && cessTotal > 0 && (
                              <View style={styles.summaryRow}>
                                <Text style={styles.summaryLabel}>CESS:</Text>
                                <Text style={styles.summaryValue}>{fmtPrice(cessTotal)}</Text>
                              </View>
                            )}
                            <View style={styles.summaryRow}>
                              <Text style={styles.summaryLabel}>Total (Tax-Inclusive):</Text>
                              <Text style={styles.summaryValue}>{fmtPrice(exactTotal)}</Text>
                            </View>
                          </>
                        )}
                      </>
                    )}

                    <TouchableOpacity
                      style={{ flexDirection: 'row', alignItems: 'center', marginTop: 10, marginBottom: 4, gap: 8 }}
                      onPress={() => updateFormData('roundOffOpeningStock', !formData.roundOffOpeningStock)}
                      activeOpacity={0.7}
                    >
                      <View style={{
                        width: 20, height: 20, borderRadius: 4, borderWidth: 2,
                        borderColor: formData.roundOffOpeningStock ? Colors.primary : Colors.grey[300],
                        backgroundColor: formData.roundOffOpeningStock ? Colors.primary : 'transparent',
                        alignItems: 'center', justifyContent: 'center',
                      }}>
                        {formData.roundOffOpeningStock && <Text style={{ color: '#fff', fontSize: 12, fontWeight: '700' }}>✓</Text>}
                      </View>
                      <Text style={{ fontSize: 13, color: Colors.text }}>Round off total value</Text>
                    </TouchableOpacity>

                    <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4 }}>
                      <Text style={{ fontSize: 13, color: '#475569' }}>
                        Round Off{!formData.roundOffOpeningStock ? ' (not applied)' : ''}:
                      </Text>
                      <Text style={{
                        fontSize: 13,
                        fontWeight: '600',
                        color: formData.roundOffOpeningStock
                          ? (roundOffDiff >= 0 ? '#059669' : '#DC2626')
                          : '#94A3B8',
                      }}>
                        {roundOffDiff >= 0 ? '+' : ''}{formatCurrencyINR(roundOffDiff, 2, 2)}
                      </Text>
                    </View>
                  </View>
                );
              })()
            )}
          </View>




        </ScrollView>

        {/* Submit Button */}
        <View style={styles.submitSection}>
          <TouchableOpacity
            style={[
              styles.submitButton,
              (!isFormValid() || isSubmitting) ? styles.disabledButton : styles.enabledButton,
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            activeOpacity={0.8}
          >
            <View style={styles.submitButtonContent}>
              {isSubmitting && (
                <ActivityIndicator
                  size="small"
                  color={Colors.background}
                  style={{ marginRight: 10 }}
                />
              )}
              <Text style={[
                styles.submitButtonText,
                (!isFormValid() || isSubmitting) ? styles.disabledButtonText : styles.enabledButtonText,
              ]}>
                {isSubmitting ? (editMode === 'true' ? 'Updating Product...' : 'Adding Product...') : (editMode === 'true' ? 'Update Product' : 'Add Product')}
              </Text>
            </View>
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

            <View style={styles.modalSearchWrapper}>
              <FocusableInput style={[
                inputFocusStyles.inputContainer,
                focusedModalField === 'categorySearch' && inputFocusStyles.inputContainerFocused
              ]}>
                <Search size={20} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                ref={categorySearchRef}
                  style={inputFocusStyles.input as any}
                placeholder="Search categories..."
                placeholderTextColor={Colors.textLight}
                value={categorySearch}
                onChangeText={setCategorySearch}
                  onFocus={() => setFocusedModalField('categorySearch')}
                  onBlur={() => setFocusedModalField(null)}
                autoFocus={true}
              />
              </FocusableInput>
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
              <FocusableInput style={[
                inputFocusStyles.inputContainer,
                focusedModalField === 'newCategoryName' && inputFocusStyles.inputContainerFocused
              ]}>
                <Package size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={inputFocusStyles.input as any}
                  value={newCategoryName}
                  onChangeText={setNewCategoryName}
                  onFocus={() => setFocusedModalField('newCategoryName')}
                  onBlur={() => setFocusedModalField(null)}
                  placeholder="Enter category name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  autoFocus={true}
                />
              </FocusableInput>
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
                <FocusableInput style={[
                  inputFocusStyles.inputContainer,
                  focusedModalField === 'cessRate' && inputFocusStyles.inputContainerFocused
                ]}>
                  <Percent size={20} color={Colors.textLight} style={styles.inputIcon} />
                  <TextInput
                    style={inputFocusStyles.input as any}
                    value={formData.cessRate.toString()}
                    onChangeText={(text) => updateFormData('cessRate', parseFloat(text) || 0)}
                    onFocus={() => setFocusedModalField('cessRate')}
                    onBlur={() => setFocusedModalField(null)}
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
                    autoFocus
                  />
                </FocusableInput>
              </View>
            )}

            {(formData.cessType === 'quantity' || formData.cessType === 'value_and_quantity') && (
              <>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>CESS Amount (₹ per unit)</Text>
                  <FocusableInput style={[
                    inputFocusStyles.inputContainer,
                    focusedModalField === 'cessAmount' && inputFocusStyles.inputContainerFocused
                  ]}>
                    <IndianRupee size={20} color={Colors.textLight} style={styles.inputIcon} />
                    <TextInput
                      style={inputFocusStyles.input as any}
                      value={formData.cessAmount}
                      onChangeText={(text) => updateFormData('cessAmount', text.replace(/[^0-9.]/g, ''))}
                      onFocus={() => setFocusedModalField('cessAmount')}
                      onBlur={() => setFocusedModalField(null)}
                      placeholder="0.00"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="decimal-pad"
                    />
                  </FocusableInput>
                </View>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>CESS Unit</Text>
                  {formData.showAdvancedOptions && 
                   formData.useCompoundUnit && 
                   formData.primaryUnit && 
                   formData.primaryUnit !== 'None' && 
                   formData.secondaryUnit && 
                   formData.secondaryUnit !== 'None' && 
                   formData.tertiaryUnit && 
                   formData.tertiaryUnit !== 'None' && (
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
                      // Only if compound UoM is enabled and primary/secondary units are set
                      if (formData.showAdvancedOptions && 
                          formData.useCompoundUnit && 
                          formData.primaryUnit && 
                          formData.primaryUnit !== 'None' && 
                          formData.secondaryUnit && 
                          formData.secondaryUnit !== 'None' && 
                          formData.tertiaryUnit && 
                          formData.tertiaryUnit !== 'None') {
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
              <Text style={styles.modalTitle}>GST Rate (GST 2.0)</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowTaxModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            
            <ScrollView 
              style={styles.modalContent} 
              contentContainerStyle={{ paddingBottom: 0 }}
              showsVerticalScrollIndicator={false}
            >
              {taxRates.map((slab) => (
                <TouchableOpacity
                  key={slab.rate}
                  style={[
                    styles.modalOption,
                    formData.taxRate === slab.rate && styles.selectedOption
                  ]}
                  onPress={() => handleTaxRateSelect(slab.rate)}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionContent}>
                    <Text style={[
                      styles.modalOptionText,
                      formData.taxRate === slab.rate && styles.selectedOptionText
                    ]}>
                      {slab.rate}% GST — {slab.label}
                    </Text>
                    <Text style={{
                      fontSize: 12,
                      color: formData.taxRate === slab.rate ? '#5a82bf' : '#6B7280',
                      marginTop: 4,
                      lineHeight: 17,
                    }}>
                      {slab.description}
                    </Text>
                  </View>
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
                  <View style={styles.modalOptionContent}>
                  <Text style={[
                    styles.modalOptionText,
                    formData.cessType === type.value && styles.selectedOptionText
                  ]}>
                    {type.label}
                  </Text>
                  </View>
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
                <View style={styles.modalOptionContent}>
                <Text style={[
                  styles.modalOptionText,
                  !formData.useCompoundUnit && styles.selectedOptionText
                ]}>
                  Primary Unit Only
                </Text>
                <Text style={styles.modalOptionDescription}>
                  Use only one unit (e.g., Pieces, Kilograms)
                </Text>
                </View>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[
                  styles.modalOption,
                  formData.useCompoundUnit && styles.selectedOption
                ]}
                onPress={() => handleUnitTypeSelect(true)}
                activeOpacity={0.7}
              >
                <View style={styles.modalOptionContent}>
                <Text style={[
                  styles.modalOptionText,
                  formData.useCompoundUnit && styles.selectedOptionText
                ]}>
                  Compound Unit
                </Text>
                <Text style={styles.modalOptionDescription}>
                  Use both primary and secondary units with conversion
                </Text>
                </View>
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
                <X size={24} color="#666666" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={18} color="#64748b" />
              <TextInput
                ref={primaryUnitSearchRef}
                style={styles.searchInput}
                value={primaryUnitSearch}
                onChangeText={setPrimaryUnitSearch}
                placeholder="Search units..."
                placeholderTextColor="#94a3b8"
                autoFocus={true}
                autoCapitalize="none"
              />
            </View>
            <ScrollView 
              style={styles.modalContent} 
              contentContainerStyle={{ paddingBottom: 0 }}
              showsVerticalScrollIndicator={false}
            >
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
                <X size={24} color="#666666" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={18} color="#64748b" />
              <TextInput
                ref={secondaryUnitSearchRef}
                style={styles.searchInput}
                value={secondaryUnitSearch}
                onChangeText={setSecondaryUnitSearch}
                placeholder="Search units..."
                placeholderTextColor="#94a3b8"
                autoFocus={true}
                autoCapitalize="none"
              />
            </View>
            <ScrollView 
              style={styles.modalContent} 
              contentContainerStyle={{ paddingBottom: 0 }}
              showsVerticalScrollIndicator={false}
            >
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
            <View style={styles.modalSearchWrapper}>
              <FocusableInput style={[
                inputFocusStyles.inputContainer,
                focusedModalField === 'supplierSearch' && inputFocusStyles.inputContainerFocused
              ]}>
                <Search size={18} color={Colors.textLight} style={styles.inputIcon} />
              <TextInput
                  style={inputFocusStyles.input as any}
                value={supplierSearch}
                onChangeText={setSupplierSearch}
                  onFocus={() => setFocusedModalField('supplierSearch')}
                  onBlur={() => setFocusedModalField(null)}
                placeholder="Search suppliers..."
                placeholderTextColor={Colors.textLight}
              />
            </FocusableInput>
            </View>
            <ScrollView 
              style={styles.modalContent} 
              contentContainerStyle={{ paddingBottom: 0 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Add New Supplier Option */}
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowSupplierModal(false);
                  // Navigate to add supplier screen with return parameter and replace current screen
                  safeRouter.replace({
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
                  <View style={styles.modalOptionContent}>
                  <Text style={[
                    styles.modalOptionText,
                    formData.preferredSupplier === supplier.id && styles.selectedOptionText
                  ]}>
                    {supplier.name}
                  </Text>
                  </View>
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
                <X size={24} color="#666666" />
              </TouchableOpacity>
            </View>
            
            <View style={styles.searchContainer}>
              <Search size={18} color="#64748b" />
              <TextInput
                style={styles.searchInput}
                value={locationSearch}
                onChangeText={setLocationSearch}
                placeholder="Search locations..."
                placeholderTextColor="#94a3b8"
                autoFocus={false}
                autoCapitalize="none"
              />
            </View>
            
            <ScrollView 
              style={styles.modalContent} 
              contentContainerStyle={{ paddingBottom: 0 }}
              showsVerticalScrollIndicator={false}
            >
              {/* Add New Branch Option */}
                <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowLocationModal(false);
                  safeRouter.push({
                    pathname: '/locations/add-branch',
                    params: {
                      returnToAddProduct: 'true',
                      editMode: 'false',
                    }
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.addNewItem}>
                  <Plus size={20} color={Colors.primary} />
                  <Text style={styles.addNewText}>Add New Branch</Text>
                </View>
              </TouchableOpacity>
              
              {/* Add New Warehouse Option */}
              <TouchableOpacity
                style={styles.modalOption}
                onPress={() => {
                  setShowLocationModal(false);
                  safeRouter.push({
                    pathname: '/locations/add-warehouse',
                    params: {
                      returnToAddProduct: 'true',
                      editMode: 'false',
                    }
                  });
                }}
                activeOpacity={0.7}
              >
                <View style={styles.addNewItem}>
                  <Plus size={20} color={Colors.primary} />
                  <Text style={styles.addNewText}>Add New Warehouse</Text>
                </View>
              </TouchableOpacity>
              
              {/* Existing locations list */}
              {filteredLocations.length > 0 ? (
                filteredLocations.map((location) => (
                  <TouchableOpacity
                    key={location.id}
                  style={[
                    styles.modalOption,
                      formData.locationId === location.id && styles.selectedOption
                  ]}
                    onPress={() => handleLocationSelect(location.id, location.name)}
                  activeOpacity={0.7}
                >
                  <Text style={[
                    styles.modalOptionText,
                      formData.locationId === location.id && styles.selectedOptionText
                  ]}>
                      {location.name}
                  </Text>
                </TouchableOpacity>
                ))
              ) : locations.length === 0 ? (
                <View style={styles.modalOption}>
                  <Text style={styles.modalOptionText}>No locations available. Add a branch or warehouse to get started.</Text>
                </View>
              ) : (
                <View style={styles.modalOption}>
                  <Text style={styles.modalOptionText}>No locations match your search.</Text>
                </View>
              )}
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
              <FocusableInput style={[
                inputFocusStyles.inputContainer,
                focusedModalField === 'customPrimaryUnit' && inputFocusStyles.inputContainerFocused
              ]}>
                <TextInput
                  style={[inputFocusStyles.input as any, { paddingVertical: 12 }]}
                  value={customPrimaryUnit}
                  onChangeText={setCustomPrimaryUnit}
                  onFocus={() => setFocusedModalField('customPrimaryUnit')}
                  onBlur={() => setFocusedModalField(null)}
                  placeholder="Enter custom unit name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  autoFocus={true}
                />
              </FocusableInput>
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
              <FocusableInput style={[
                inputFocusStyles.inputContainer,
                focusedModalField === 'customSecondaryUnit' && inputFocusStyles.inputContainerFocused
              ]}>
                <TextInput
                  style={[inputFocusStyles.input as any, { paddingVertical: 12 }]}
                  value={customSecondaryUnit}
                  onChangeText={setCustomSecondaryUnit}
                  onFocus={() => setFocusedModalField('customSecondaryUnit')}
                  onBlur={() => setFocusedModalField(null)}
                  placeholder="Enter custom unit name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  autoFocus={true}
                />
              </FocusableInput>
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
                <X size={24} color="#666666" />
              </TouchableOpacity>
            </View>
            <View style={styles.searchContainer}>
              <Search size={18} color="#64748b" />
              <TextInput
                ref={tertiaryUnitSearchRef}
                style={styles.searchInput}
                value={tertiaryUnitSearch}
                onChangeText={setTertiaryUnitSearch}
                placeholder="Search units..."
                placeholderTextColor="#94a3b8"
                autoFocus={true}
                autoCapitalize="none"
              />
            </View>
            
            <ScrollView 
              style={styles.modalContent} 
              contentContainerStyle={{ paddingBottom: 0 }}
              showsVerticalScrollIndicator={false}
            >
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
              <FocusableInput style={[
                inputFocusStyles.inputContainer,
                focusedModalField === 'customTertiaryUnit' && inputFocusStyles.inputContainerFocused
              ]}>
                <TextInput
                  style={[inputFocusStyles.input as any, { paddingVertical: 12 }]}
                  value={customTertiaryUnit}
                  onChangeText={setCustomTertiaryUnit}
                  onFocus={() => setFocusedModalField('customTertiaryUnit')}
                  onBlur={() => setFocusedModalField(null)}
                  placeholder="e.g., Bundle, Pack, Set"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                  autoFocus
                />
              </FocusableInput>
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

      {/* Expiry Date Picker Modal */}
      {showExpiryDatePicker && (
        <Modal
          transparent={true}
          animationType="fade"
          visible={showExpiryDatePicker}
          onRequestClose={handleExpiryDatePickerDone}
        >
          <TouchableOpacity 
            style={styles.datePickerModal}
            activeOpacity={1}
            onPress={() => {
              // Close modal only if date has been selected
              if (hasSelectedExpiryDate) {
                handleExpiryDatePickerDone();
              }
            }}
          >
            <TouchableOpacity 
              style={styles.datePickerContainer}
              activeOpacity={1}
              onPress={(e) => {
                // Prevent closing when tapping inside the picker
                e.stopPropagation();
              }}
            >
              <View style={styles.datePickerHeader}>
                <Text style={styles.datePickerTitle}>Select Expiry Date</Text>
                <TouchableOpacity
                  style={styles.datePickerDone}
                  onPress={handleExpiryDatePickerDone}
                >
                  <Text style={styles.datePickerDoneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <CustomDatePicker
                value={expiryDateValue || (() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return today;
                })()}
                onChange={(date) => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  // Ensure date is not before today
                  if (date >= today) {
                    setExpiryDateValue(date);
                    setHasSelectedExpiryDate(true);
                  }
                }}
                minimumDate={(() => {
                  const today = new Date();
                  today.setHours(0, 0, 0, 0);
                  return today;
                })()} // Cannot select dates before today
                maximumDate={new Date(2100, 11, 31)} // Allow dates up to year 2100
                textColor={Colors.primary}
              />
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      )}


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
  imagesContainer: {
    gap: 12,
  },
  imagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  imagePreviewWrapper: {
    position: 'relative',
    width: 120,
    height: 120,
  },
  removeImageButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.error,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: 2,
    borderColor: Colors.background,
  },
  addMoreImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  barcodeImageWrapper: {
    backgroundColor: '#FAFBFC',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  barcodePreviewInner: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
  },
  barcodeImagePreview: {
    width: '100%',
    height: 80,
    backgroundColor: Colors.background,
  },
  barcodeNumberText: {
    fontSize: 12,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Colors.text,
    letterSpacing: 2,
    textAlign: 'center',
    marginTop: 8,
    paddingHorizontal: 4,
  },
  barcodePreviewIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginTop: 12,
    gap: 8,
  },
  barcodeRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  barcodeInputWrapper: {
    flex: 1,
  },
  generateBarcodeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: Colors.primary,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    minWidth: 100,
  },
  generateBarcodeButtonDisabled: {
    opacity: 0.5,
    backgroundColor: Colors.grey[200],
  },
  generateBarcodeButtonText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  barcodeHint: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 6,
    marginLeft: 2,
  },
  generateBarcodeModalContent: {
    backgroundColor: '#FFF',
    borderRadius: 16,
    padding: 24,
    margin: 24,
    maxWidth: 400,
    width: '100%',
  },
  generateBarcodeModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 16,
  },
  generateBarcodeModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  generateBarcodeModalBody: {
    fontSize: 15,
    color: Colors.text,
    lineHeight: 22,
    marginBottom: 12,
  },
  generateBarcodeModalSubtext: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: 24,
  },
  boldText: {
    fontWeight: '700',
  },
  generateBarcodeModalActions: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 8,
    alignItems: 'stretch',
  },
  generateBarcodeModalCancelButton: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.grey[200],
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  generateBarcodeModalCancelText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
    textAlign: 'center',
  },
  generateBarcodeModalConfirmButton: {
    paddingVertical: 14,
    paddingHorizontal: 12,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minHeight: 48,
  },
  generateBarcodeModalConfirmText: {
    fontSize: 14,
    color: '#FFF',
    fontWeight: '600',
    textAlign: 'center',
  },
  barcodePreviewText: {
    fontSize: 13,
    color: Colors.primary,
    fontWeight: '500',
    flex: 1,
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
  submitButtonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
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
    paddingVertical: 18,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    backgroundColor: '#ffffff',
  },
  searchInput: {
    flex: 1,
    marginLeft: 12,
    fontSize: 16,
    color: '#334155',
    paddingVertical: 8,
    ...(Platform.select({
      web: {
        outlineWidth: 0,
        outlineColor: 'transparent',
      },
    }) as any),
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
    paddingVertical: 4,
    paddingHorizontal: 20,
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
    backgroundColor: '#f0f7ff',
  },
  modalOptionContent: {
    width: '100%',
    flex: 1,
  },
  modalOptionText: {
    fontSize: 16,
    color: '#334155',
    fontWeight: '500',
  },
  selectedOptionText: {
    color: '#3f66ac',
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
    maxHeight: 400,
  },
  modalOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9',
  },
  modalSearchWrapper: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
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
    marginTop: 8,
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
   
   // Tax Info Box Styles - Prominent Info Section
   taxInfoBox: {
     backgroundColor: '#EFF6FF', // Light blue background
     borderRadius: 12,
     padding: 16,
     marginBottom: 20,
     borderWidth: 2,
     borderColor: '#3f66ac', // Primary blue border
     ...Platform.select({
       web: {
         boxShadow: '0 2px 8px rgba(63, 102, 172, 0.15)',
       },
     }),
   },
   taxInfoHeader: {
     flexDirection: 'row',
     alignItems: 'center',
     marginBottom: 12,
   },
   taxInfoIconContainer: {
     width: 32,
     height: 32,
     borderRadius: 16,
     backgroundColor: '#DBEAFE', // Lighter blue for icon background
     justifyContent: 'center',
     alignItems: 'center',
     marginRight: 12,
   },
   taxInfoTitle: {
     fontSize: 17,
     fontWeight: '700',
     color: '#3f66ac',
     flex: 1,
   },
   taxInfoContent: {
     paddingLeft: 4,
   },
   taxInfoItem: {
     flexDirection: 'row',
     alignItems: 'flex-start',
     marginBottom: 10,
   },
   // Date Input Wrapper Styles
   dateInputWrapper: {
     flexDirection: 'row',
     alignItems: 'center',
   },
   calendarButton: {
     padding: 8,
     marginLeft: 8,
   },
   // Date Picker Modal styles
   datePickerModal: {
     flex: 1,
     justifyContent: 'center',
     alignItems: 'center',
     backgroundColor: 'rgba(0, 0, 0, 0.6)',
     paddingHorizontal: 20,
   },
   datePickerContainer: {
     backgroundColor: Colors.background,
     borderRadius: 20,
     paddingBottom: Platform.select({
       web: 40,
       ios: 20,
       android: 20,
       default: 20,
     }),
     paddingTop: Platform.select({
       web: 20,
       default: 16,
     }),
     maxWidth: 400,
     width: '100%',
     maxHeight: '80%',
   },
   datePickerHeader: {
     flexDirection: 'row',
     justifyContent: 'space-between',
     alignItems: 'center',
     paddingHorizontal: 20,
     paddingVertical: 16,
     borderBottomWidth: 1,
     borderBottomColor: Colors.grey[200],
   },
   datePickerTitle: {
     fontSize: 18,
     fontWeight: '700',
     color: Colors.primary,
   },
   datePickerDone: {
     paddingHorizontal: 16,
     paddingVertical: 8,
     backgroundColor: Colors.grey[100],
     borderRadius: 8,
   },
   datePickerDoneText: {
     fontSize: 16,
     fontWeight: '700',
     color: Colors.primary,
   },
   taxInfoBullet: {
     width: 6,
     height: 6,
     borderRadius: 3,
     backgroundColor: '#3f66ac',
     marginTop: 6,
     marginRight: 10,
   },
   taxInfoText: {
     fontSize: 14,
     color: Colors.text,
     lineHeight: 22,
     flex: 1,
   },
   taxInfoBold: {
     fontWeight: '600',
     color: Colors.text,
   },
   taxInfoNote: {
     marginTop: 8,
     paddingTop: 12,
     borderTopWidth: 1,
     borderTopColor: '#BFDBFE', // Light blue border
   },
   taxInfoNoteText: {
     fontSize: 13,
     color: Colors.textLight,
     fontStyle: 'italic',
     lineHeight: 18,
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