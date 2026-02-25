import React, { useState, useRef, useEffect, useMemo } from 'react';
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
import * as ImagePicker from 'expo-image-picker';
import { productStore, Product } from '@/utils/productStore';
import { dataStore, Supplier as StoreSupplier } from '@/utils/dataStore';
import { createProduct, updateProduct, getSuppliers, assignBarcode } from '@/services/backendApi';
import { getInputFocusStyles } from '@/utils/platformUtils';
import { useBusinessData } from '@/hooks/useBusinessData';
import { supabase } from '@/lib/supabase';
import { generateBarcodeImage } from '@/utils/barcodeGenerator';
import { showSuccess, showError } from '@/utils/notifications';
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
  locationId: string | null;
  productImages: string[];
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

  const categorySearchRef = useRef<TextInput>(null);
  const supplierSearchRef = useRef<TextInput>(null);
  const primaryUnitSearchRef = useRef<TextInput>(null);
  const secondaryUnitSearchRef = useRef<TextInput>(null);
  const tertiaryUnitSearchRef = useRef<TextInput>(null);

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
          locationId: product.locationId || null,
          productImages: product.images || (product.image ? [product.image] : []),
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

  // Pre-load suppliers from backend (non-blocking, runs in background)
  useEffect(() => {
    // Load from dataStore first (instant, cached)
      const allSuppliers = dataStore.getSuppliers();
      suppliersList = allSuppliers.map((supplier: StoreSupplier) => ({
        id: supplier.id,
        name: supplier.businessName || supplier.name,
        type: supplier.supplierType,
      }));

    // Then fetch from backend in background to ensure we have latest data
    const loadSuppliersFromBackend = async () => {
      try {
        const result = await getSuppliers();
        if (result.success && result.suppliers) {
          // Update dataStore with fresh suppliers
          result.suppliers.forEach((supplier: any) => {
            const existingSupplier = dataStore.getSuppliers().find(s => s.id === supplier.id);
            if (!existingSupplier) {
              // Add to dataStore if not already present
              dataStore.addSupplier({
                id: supplier.id,
                name: supplier.business_name || supplier.contact_person,
                businessName: supplier.business_name,
                supplierType: supplier.supplier_type || 'business',
                contactPerson: supplier.contact_person,
                mobile: supplier.mobile_number,
                email: supplier.email,
                address: `${supplier.address_line_1 || ''} ${supplier.address_line_2 || ''}`.trim(),
                gstin: supplier.gstin_pan,
                avatar: '',
                supplierScore: 0,
                onTimeDelivery: 0,
                qualityRating: 0,
                responseTime: 0,
                totalOrders: 0,
                completedOrders: 0,
                pendingOrders: 0,
                cancelledOrders: 0,
                totalValue: 0,
                lastOrderDate: null,
                joinedDate: supplier.created_at || new Date().toISOString(),
                status: supplier.status || 'active',
                paymentTerms: '',
                deliveryTime: '',
                categories: [],
                productCount: 0,
                createdAt: supplier.created_at || new Date().toISOString(),
              });
            }
          });
          
          // Update suppliersList with fresh data from data store
          const updatedSuppliers = dataStore.getSuppliers();
          suppliersList = updatedSuppliers.map((supplier: StoreSupplier) => ({
            id: supplier.id,
            name: supplier.businessName || supplier.name,
            type: supplier.supplierType,
          }));
        }
      } catch (error) {
        console.error('Error loading suppliers from backend:', error);
        // Don't block UI if backend fetch fails, use cached data
      }
    };

    // Load in background (non-blocking)
    loadSuppliersFromBackend();

    // Subscribe to data store changes
    const unsubscribe = dataStore.subscribe(() => {
    const allSuppliers = dataStore.getSuppliers();
    suppliersList = allSuppliers.map((supplier: StoreSupplier) => ({
      id: supplier.id,
      name: supplier.businessName || supplier.name,
      type: supplier.supplierType,
    }));
    });

    return unsubscribe;
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

  // Convert DD-MM-YYYY to YYYY-MM-DD for backend (PostgreSQL format)
  const convertExpiryDateToBackendFormat = (dateString: string): string | undefined => {
    if (!dateString || dateString.trim().length === 0) {
      return undefined;
    }
    
    // Parse DD-MM-YYYY format
    const parts = dateString.split('-');
    if (parts.length !== 3) {
      return undefined;
    }
    
    const day = parseInt(parts[0], 10);
    const month = parseInt(parts[1], 10);
    const year = parseInt(parts[2], 10);
    
    // Validate date components
    if (isNaN(day) || isNaN(month) || isNaN(year)) {
      return undefined;
    }
    
    // Validate date is valid
    const date = new Date(year, month - 1, day);
    if (
      date.getDate() !== day ||
      date.getMonth() !== month - 1 ||
      date.getFullYear() !== year
    ) {
      return undefined;
    }
    
    // Convert to YYYY-MM-DD format
    return `${year}-${month.toString().padStart(2, '0')}-${day.toString().padStart(2, '0')}`;
  };

  // Validate if expiry date is valid (if provided)
  const isExpiryDateValid = (): boolean => {
    if (!formData.expiryDate || formData.expiryDate.trim().length === 0) {
      // Expiry date is optional, so empty is valid
      return true;
    }
    
    // If the date field has content but is incomplete (not 10 characters for DD-MM-YYYY), it's invalid
    if (formData.expiryDate.trim().length > 0 && formData.expiryDate.trim().length < 10) {
      return false;
    }
    
    // Check if date is in correct format and valid
    const convertedDate = convertExpiryDateToBackendFormat(formData.expiryDate);
    if (!convertedDate) {
      return false;
    }
    
    // Check if date is not before today
    const [year, month, day] = convertedDate.split('-').map(Number);
    const date = new Date(year, month - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    return date >= today;
  };

  // Handle expiry date text input with auto-formatting (DD-MM-YYYY)
  const handleExpiryDateTextChange = (text: string) => {
    // Remove all non-numeric characters
    const cleaned = text.replace(/[^0-9]/g, '');
    
    // Format as DD-MM-YYYY
    let formatted = '';
    if (cleaned.length > 0) {
      formatted = cleaned.substring(0, 2);
      if (cleaned.length >= 3) {
        formatted += '-' + cleaned.substring(2, 4);
      }
      if (cleaned.length >= 5) {
        formatted += '-' + cleaned.substring(4, 8);
      }
    }
    
    updateFormData('expiryDate', formatted);
    
    // Parse and validate complete date
    if (cleaned.length === 8) {
      const day = parseInt(cleaned.substring(0, 2), 10);
      const month = parseInt(cleaned.substring(2, 4), 10);
      const year = parseInt(cleaned.substring(4, 8), 10);
      
      // Validate date components
      if (
        day >= 1 && day <= 31 &&
        month >= 1 && month <= 12 &&
        year >= new Date().getFullYear()
      ) {
        const date = new Date(year, month - 1, day);
        const today = new Date();
        today.setHours(0, 0, 0, 0); // Reset time to start of day
        
        // Check if date is valid and not before today
        if (
          date.getDate() === day &&
          date.getMonth() === month - 1 &&
          date.getFullYear() === year &&
          date >= today
        ) {
          setExpiryDateValue(date);
          setHasSelectedExpiryDate(true);
        } else {
          // Invalid date or before today
          if (date < today) {
            Alert.alert('Invalid Date', 'Expiry date cannot be before today');
            updateFormData('expiryDate', '');
            setExpiryDateValue(null);
            setHasSelectedExpiryDate(false);
          }
        }
      }
    } else {
      // Clear date if input is incomplete
      if (expiryDateValue !== null) {
        setExpiryDateValue(null);
        setHasSelectedExpiryDate(false);
      }
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
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
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
          mediaTypes: ImagePicker.MediaTypeOptions.Images,
          allowsMultipleSelection: true,
          allowsEditing: true,
          aspect: [1, 1],
          quality: 0.8,
        });
      }

      if (!result.canceled && result.assets) {
        // Upload images to Supabase Storage
        const uploadedUrls: string[] = [];
        const imagesToUpload = result.assets;
        
        // Show loading alert
        Alert.alert('Uploading', 'Please wait while images are being uploaded...');
        
        for (const image of imagesToUpload) {
          if (image.uri) {
            try {
              // Create a unique filename
              const timestamp = Date.now();
              const randomStr = Math.random().toString(36).substring(7);
              const filename = `${timestamp}-${randomStr}.jpg`;
              
              // Convert image to base64 for upload
              const response = await fetch(image.uri);
              const blob = await response.blob();
              
              // Try to create bucket if it doesn't exist (this will fail silently if bucket exists)
              // Then upload to Supabase Storage
              const { data: uploadData, error: uploadError } = await supabase.storage
                .from('product-images')
                .upload(filename, blob, {
                  contentType: 'image/jpeg',
                  upsert: false,
                });
              
              if (uploadError) {
                console.error('Upload error:', uploadError);
                
                // If bucket doesn't exist, try to create it (this requires admin access)
                // For now, we'll convert to base64 and store directly in the database
                // This is a fallback solution
                const base64Response = await fetch(image.uri);
                const base64Blob = await base64Response.blob();
                const reader = new FileReader();
                
                const base64Promise = new Promise<string>((resolve, reject) => {
                  reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                      resolve(reader.result);
                    } else {
                      reject(new Error('Failed to convert to base64'));
                    }
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(base64Blob);
                });
                
                const base64String = await base64Promise;
                uploadedUrls.push(base64String);
              } else {
                // Get public URL
                const { data: urlData } = supabase.storage
                  .from('product-images')
                  .getPublicUrl(filename);
                
                if (urlData?.publicUrl) {
                  uploadedUrls.push(urlData.publicUrl);
                } else {
                  // Fallback to base64 if public URL fails
                  const base64Response = await fetch(image.uri);
                  const base64Blob = await base64Response.blob();
                  const reader = new FileReader();
                  
                  const base64Promise = new Promise<string>((resolve, reject) => {
                    reader.onloadend = () => {
                      if (typeof reader.result === 'string') {
                        resolve(reader.result);
                      } else {
                        reject(new Error('Failed to convert to base64'));
                      }
                    };
                    reader.onerror = reject;
                    reader.readAsDataURL(base64Blob);
                  });
                  
                  const base64String = await base64Promise;
                  uploadedUrls.push(base64String);
                }
              }
            } catch (error) {
              console.error('Error uploading image:', error);
              // Fallback to base64 encoding
              try {
                const base64Response = await fetch(image.uri);
                const base64Blob = await base64Response.blob();
                const reader = new FileReader();
                
                const base64Promise = new Promise<string>((resolve, reject) => {
                  reader.onloadend = () => {
                    if (typeof reader.result === 'string') {
                      resolve(reader.result);
                    } else {
                      reject(new Error('Failed to convert to base64'));
                    }
                  };
                  reader.onerror = reject;
                  reader.readAsDataURL(base64Blob);
                });
                
                const base64String = await base64Promise;
                uploadedUrls.push(base64String);
              } catch (base64Error) {
                console.error('Error converting to base64:', base64Error);
                Alert.alert('Error', `Failed to process image: ${image.uri}`);
              }
            }
          }
        }
        
        if (uploadedUrls.length > 0) {
          console.log('✅ Images uploaded successfully:', uploadedUrls.length);
          setFormData(prev => {
            const newImages = [...prev.productImages, ...uploadedUrls];
            console.log('📸 Total product images:', newImages.length);
            return { 
              ...prev, 
              productImages: newImages
            };
          });
          Alert.alert('Success', `${uploadedUrls.length} image(s) added successfully`);
        } else {
          Alert.alert('Error', 'No images were uploaded. Please try again.');
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
        cessBreakdown = `Value-based (${cessRate}% of ₹${basePrice.toFixed(3)})`;
        break;
        
      case 'quantity':
        cessTotal = Math.round(cessAmount * 1000) / 1000; // For single unit
        cessBreakdown = `Quantity-based (₹${cessAmount.toFixed(3)} per unit)`;
        break;
        
      case 'value_and_quantity':
        const valueCess = Math.round((basePrice * cessRateDecimal) * 1000) / 1000;
        const quantityCess = Math.round(cessAmount * 1000) / 1000; // For single unit
        cessTotal = Math.round((valueCess + quantityCess) * 1000) / 1000;
        cessBreakdown = `Value + Quantity (${cessRate}% + ₹${cessAmount.toFixed(3)} per unit)`;
        break;
        
      case 'mrp':
        const effectiveMRP = mrp > 0 ? mrp : basePrice;
        cessTotal = Math.round((effectiveMRP * cessRateDecimal) * 1000) / 1000;
        cessBreakdown = `MRP-based (${cessRate}% of MRP ₹${effectiveMRP.toFixed(3)})`;
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

  // Helper function to get display prices based on tax inclusion toggle
  const getDisplayPrices = () => {
    const perUnitPrice = parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0;
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
      (formData.purchasePrice.trim().length > 0 || formData.perUnitPrice.trim().length > 0) &&
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

    // Validate purchase price is lower than sale price
    const purchasePrice = parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0;
    const salePrice = parseFloat(formData.salesPrice);
    
    if (purchasePrice >= salePrice) {
      Alert.alert(
        'Invalid Pricing', 
        'Purchase price must be lower than sale price to ensure profitability.',
        [{ text: 'OK' }]
      );
      return;
    }

    // Check for duplicate products before creating (only for new products, not edits)
    if (editMode !== 'true') {
      try {
        const { getProducts } = await import('@/services/backendApi');
        const productsResult = await getProducts();
        
        if (productsResult.success && productsResult.products) {
          const existingProducts = productsResult.products;
          const newProductName = formData.name.trim().toLowerCase();
          const newProductHsn = formData.hsnCode.trim().toLowerCase();
          const newProductBarcode = formData.barcode.trim().toLowerCase();
          const newProductCategory = (formData.category || formData.customCategory.trim()).toLowerCase();
          
          // Check for similar products (same name, category, HSN, or barcode)
          const duplicateProducts = existingProducts.filter((product: any) => {
            const existingName = (product.name || '').toLowerCase();
            const existingHsn = (product.hsn_code || product.hsnCode || '').toLowerCase();
            const existingBarcode = (product.barcode || '').toLowerCase();
            const existingCategory = (product.category || '').toLowerCase();
            
            // Check if name, category, HSN, and barcode match (almost all details same)
            const nameMatch = existingName === newProductName;
            const categoryMatch = existingCategory === newProductCategory;
            const hsnMatch = newProductHsn && existingHsn && existingHsn === newProductHsn;
            const barcodeMatch = newProductBarcode && existingBarcode && existingBarcode === newProductBarcode;
            
            // If 3 or more fields match, consider it a duplicate
            const matchCount = [nameMatch, categoryMatch, hsnMatch, barcodeMatch].filter(Boolean).length;
            return matchCount >= 3;
          });
          
          if (duplicateProducts.length > 0) {
            const duplicateProduct = duplicateProducts[0];
            Alert.alert(
              'Duplicate Product Detected',
              `A similar product already exists:\n\nName: ${duplicateProduct.name || 'N/A'}\nCategory: ${duplicateProduct.category || 'N/A'}\nHSN: ${duplicateProduct.hsn_code || duplicateProduct.hsnCode || 'N/A'}\n\nDo you want to add this product anyway?`,
              [
                {
                  text: 'Cancel',
                  style: 'cancel',
                  onPress: () => {
                    setIsSubmitting(false);
                  }
                },
                {
                  text: 'Add Anyway',
                  onPress: () => {
                    // Continue with product creation
                    proceedWithProductCreation();
                  }
                }
              ]
            );
            return;
          }
        }
      } catch (error) {
        console.warn('Error checking for duplicates:', error);
        // Continue with creation if duplicate check fails
      }
    }

    // Proceed with product creation
    proceedWithProductCreation();
  };

  const proceedWithProductCreation = async () => {
    setIsSubmitting(true);

    // Generate barcode image if barcode is provided
    let finalProductImages = [...formData.productImages];
    console.log('📸 Initial product images count:', formData.productImages.length);
    
    if (formData.barcode && formData.barcode.trim().length > 0) {
      try {
        console.log('📊 Generating barcode image for:', formData.barcode.trim());
        const barcodeImageUri = await generateBarcodeImage(formData.barcode.trim());
        console.log('📊 Barcode generation result:', barcodeImageUri ? 'SUCCESS' : 'FAILED');
        console.log('📊 Barcode URI preview:', barcodeImageUri ? barcodeImageUri.substring(0, 100) + '...' : 'null');
        
        if (barcodeImageUri) {
          // Add barcode image at the end of the images array
          finalProductImages = [...finalProductImages, barcodeImageUri];
          console.log('✅ Barcode image generated and added to product images');
          console.log('📸 Final product images count:', finalProductImages.length);
          console.log('📸 Final product images preview:', finalProductImages.map((img, idx) => 
            `${idx + 1}: ${img.substring(0, 50)}...`
          ));
        } else {
          console.warn('⚠️ Failed to generate barcode image - barcode URI is null');
        }
      } catch (error) {
        console.error('❌ Error generating barcode image:', error);
        // Continue without barcode image if generation fails
      }
    } else {
      console.log('⚠️ No barcode provided, skipping barcode image generation');
    }

    const productData: Product = {
      id: editMode === 'true' && productId ? (productId as string) : `PROD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name.trim(),
      image: finalProductImages.length > 0 ? finalProductImages[0] : '',
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
      unitPrice: parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0,
      salesPrice: parseFloat(formData.salesPrice),
      minStockLevel: parseInt(formData.minStockLevel),
      maxStockLevel: parseInt(formData.maxStockLevel),
      currentStock: parseInt(formData.openingStock),
      supplier: formData.preferredSupplier,
      location: formData.location,
      lastRestocked: new Date().toISOString(),
      stockValue: (parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0) * parseInt(formData.openingStock),
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

    try {
      let savedProduct: any;
      
      if (editMode === 'true' && productId) {
        // Update existing product in Supabase
        console.log('Updating existing product:', productData);
        const updateResult = await updateProduct(productId as string, {
          name: productData.name,
          category: productData.category,
          hsnCode: productData.hsnCode || undefined,
          barcode: productData.barcode || undefined,
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
          brand: productData.brand || undefined,
          description: productData.description || undefined,
        });

        if (!updateResult.success || !updateResult.product) {
          Alert.alert('Error', updateResult.error || 'Failed to update product');
          setIsSubmitting(false);
          return;
        }

        savedProduct = updateResult.product;
        console.log('✅ Product updated in Supabase');
        
        // Also update in productStore for backward compatibility
        productStore.updateProduct(productId as string, productData);
      } else {
        // Create new product in Supabase
        console.log('Creating new product:', productData);
        console.log('📦 Creating product with:', {
          name: productData.name,
          imagesCount: finalProductImages.length,
          locationId: formData.locationId,
          locationName: formData.location,
        });
        const createResult = await createProduct({
          name: productData.name,
          category: productData.category,
          hsnCode: productData.hsnCode || undefined,
          barcode: productData.barcode || undefined,
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
          brand: productData.brand || undefined,
          description: productData.description || undefined,
        });

        if (!createResult.success || !createResult.product) {
          Alert.alert('Error', createResult.error || 'Failed to create product');
          setIsSubmitting(false);
          return;
        }

        savedProduct = createResult.product;
        productData.id = savedProduct.id; // Update productData with the new ID
        console.log('✅ Product created in Supabase');
        
        // Also add to productStore for backward compatibility
        productStore.addProduct(productData);
      }
      
      // Continue with navigation logic
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
                  locationId: null,
                  productImages: [],
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
                  locationId: null,
                  productImages: [],
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
                <Image 
                          source={{ uri: imageUri }}
                          style={[
                            styles.productImagePreview,
                            isBarcodeImage && styles.barcodeImagePreview
                          ]}
                          resizeMode={isBarcodeImage ? 'contain' : 'cover'}
                />
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
              <View style={[
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
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              {formData.category === 'Others' ? (
                <View style={styles.customInputContainer}>
                  <View style={[
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
              <View style={[
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
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Barcode</Text>
              <View style={styles.barcodeRow}>
                <View style={[
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
                </View>
                <TouchableOpacity
                  style={[styles.generateBarcodeButton, isGeneratingBarcode && styles.generateBarcodeButtonDisabled]}
                  onPress={() => setShowGenerateBarcodeModal(true)}
                  disabled={isGeneratingBarcode}
                  activeOpacity={0.7}
                >
                  <Wand2 size={18} color="#FFF" />
                  <Text style={styles.generateBarcodeButtonText}>
                    {isGeneratingBarcode ? '...' : 'Generate'}
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
                      style={styles.generateBarcodeModalCancelButton}
                      onPress={() => setShowGenerateBarcodeModal(false)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.generateBarcodeModalCancelText}>Cancel</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={styles.generateBarcodeModalConfirmButton}
                      onPress={handleGenerateBarcodeConfirm}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.generateBarcodeModalConfirmText}>Yes, Generate Barcode</Text>
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
                  <View style={[
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
                  </View>
                </View>
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Expiry Date</Text>
                  <View style={styles.dateInputWrapper}>
                    <View style={[
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
                    </View>
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
              <View style={[
                inputFocusStyles.inputContainer,
                focusedField === 'openingStock' && inputFocusStyles.inputContainerFocused
              ]}>
                <TextInput
                  style={inputFocusStyles.input as any}
                  value={formData.openingStock}
                  onChangeText={(text) => handleStockChange('openingStock', text)}
                  onFocus={() => setFocusedField('openingStock')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="Enter opening stock quantity"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                />
              </View>
            </View>

            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Min Stock Level *</Text>
                <View style={[
                  inputFocusStyles.inputContainer,
                  focusedField === 'minStockLevel' && inputFocusStyles.inputContainerFocused
                ]}>
                  <TextInput
                    style={inputFocusStyles.input as any}
                    value={formData.minStockLevel}
                    onChangeText={(text) => handleStockChange('minStockLevel', text)}
                    onFocus={() => setFocusedField('minStockLevel')}
                    onBlur={() => setFocusedField(null)}
                    placeholder="Min level"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="numeric"
                  />
                </View>
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Max Stock Level *</Text>
                <View style={[
                  inputFocusStyles.inputContainer,
                  focusedField === 'maxStockLevel' && inputFocusStyles.inputContainerFocused
                ]}>
                  <TextInput
                    style={inputFocusStyles.input as any}
                    value={formData.maxStockLevel}
                    onChangeText={(text) => handleStockChange('maxStockLevel', text)}
                    onFocus={() => setFocusedField('maxStockLevel')}
                    onBlur={() => setFocusedField(null)}
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
             
             {/* Tax Inclusion Explanation - Info Box */}
             <View style={styles.taxInfoBox}>
               <View style={styles.taxInfoHeader}>
                 <View style={styles.taxInfoIconContainer}>
                   <Info size={20} color="#3f66ac" />
                 </View>
                 <Text style={styles.taxInfoTitle}>Tax-Inclusive vs Tax-Exclusive Pricing</Text>
               </View>
               <View style={styles.taxInfoContent}>
                 <View style={styles.taxInfoItem}>
                   <View style={styles.taxInfoBullet} />
                   <Text style={styles.taxInfoText}>
                     <Text style={styles.taxInfoBold}>Tax-Exclusive:</Text> Enter base price, taxes added on top
                   </Text>
                 </View>
                 <View style={styles.taxInfoItem}>
                   <View style={styles.taxInfoBullet} />
                   <Text style={styles.taxInfoText}>
                     <Text style={styles.taxInfoBold}>Tax-Inclusive:</Text> Enter final price, system calculates base price
                   </Text>
                 </View>
                 <View style={styles.taxInfoNote}>
                   <Text style={styles.taxInfoNoteText}>
                     <Text style={styles.taxInfoBold}>Note:</Text> All tax calculations are done automatically behind the scenes.
                   </Text>
                 </View>
               </View>
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

            {/* Purchase Price Input - Primary Field */}
            <View style={styles.inputGroup}>
              <Text style={styles.label}>
                Purchase Price * 
                <Text style={styles.unitIndicator}>
                  {formData.useCompoundUnit 
                    ? ` (in ${formData.priceUnit === 'primary' ? formData.primaryUnit : formData.secondaryUnit})`
                    : ` (in ${formData.primaryUnit})`
                  }
                </Text>
              </Text>
              <View style={[
                inputFocusStyles.inputContainer,
                focusedField === 'purchasePrice' && inputFocusStyles.inputContainerFocused
              ]}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={inputFocusStyles.input as any}
                  value={formData.purchasePrice}
                  onChangeText={(text) => handlePriceChange('purchasePrice', text)}
                  onFocus={() => setFocusedField('purchasePrice')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </View>
              <Text style={styles.inputHint}>
                Enter the price at which you purchase this product
              </Text>
            </View>
            
            {/* Per Unit Price Input - Optional/Secondary (for backward compatibility) */}
            {!formData.purchasePrice && (
              <View style={styles.inputGroup}>
                <Text style={styles.label}>
                  Per Unit Price (Optional)
                  <Text style={styles.unitIndicator}>
                    {formData.useCompoundUnit 
                      ? ` (in ${formData.priceUnit === 'primary' ? formData.primaryUnit : formData.secondaryUnit})`
                      : ` (in ${formData.primaryUnit})`
                    }
                  </Text>
                </Text>
                <View style={[
                  inputFocusStyles.inputContainer,
                  focusedField === 'perUnitPrice' && inputFocusStyles.inputContainerFocused
                ]}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={inputFocusStyles.input as any}
                  value={formData.perUnitPrice}
                  onChangeText={(text) => handlePriceChange('perUnitPrice', text)}
                    onFocus={() => setFocusedField('perUnitPrice')}
                    onBlur={() => setFocusedField(null)}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            )}
            
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
              <View style={[
                inputFocusStyles.inputContainer,
                focusedField === 'salesPrice' && inputFocusStyles.inputContainerFocused
              ]}>
                <Text style={styles.currencySymbol}>₹</Text>
                <TextInput
                  style={inputFocusStyles.input as any}
                  value={formData.salesPrice}
                  onChangeText={(text) => handlePriceChange('salesPrice', text)}
                  onFocus={() => setFocusedField('salesPrice')}
                  onBlur={() => setFocusedField(null)}
                  placeholder="0.00"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="decimal-pad"
                />
              </View>
            </View>
            <View style={styles.inputGroup}>
              <Text style={styles.label}>MRP (Maximum Retail Price)</Text>
              <View style={[
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
              </View>
            </View>
            {(formData.purchasePrice || formData.perUnitPrice) && formData.salesPrice && (
              <>
                {(() => {
                  const purchasePrice = parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0;
                  return purchasePrice >= parseFloat(formData.salesPrice) ? (
                  <View style={[styles.marginContainer, styles.warningContainer]}>
                      <Text style={styles.warningText}>⚠️ Purchase price should be lower than sale price</Text>
                  </View>
                ) : (
                  <View style={styles.marginContainer}>
                    <Text style={styles.marginLabel}>Profit Margin:</Text>
                    <Text style={styles.marginValue}>
                        {((parseFloat(formData.salesPrice) - purchasePrice) / purchasePrice * 100).toFixed(1)}%
                    </Text>
                  </View>
                  );
                })()}
              </>
            )}

                         {/* Tax Calculation Display */}
             {(formData.purchasePrice || formData.perUnitPrice) && formData.taxRate > 0 && (
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
                         <Text style={styles.taxCalculationPrimary}>₹{(parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0).toFixed(2)}</Text>
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
                         <Text style={styles.taxCalculationPrimary}>₹{(parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0).toFixed(2)}</Text>
                       </View>
                     </View>
                     
                     <View style={styles.taxCalculationRow}>
                       <View style={styles.taxCalculationColumn}>
                         <Text style={styles.taxCalculationLabel}>GST ({formData.taxRate}%):</Text>
                         <Text style={styles.taxCalculationPrimary}>
                           ₹{(((parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0) * formData.taxRate) / 100).toFixed(2)}
                         </Text>

                       </View>
                     </View>
                     
                     {formData.cessType !== 'none' && (
                       <View style={styles.taxCalculationRow}>
                         <View style={styles.taxCalculationColumn}>
                           <Text style={styles.taxCalculationLabel}>CESS:</Text>
                           <Text style={styles.taxCalculationPrimary}>
                             ₹{(() => {
                               const basePrice = parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0;
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
                                   const mrpPrice = parseFloat(formData.mrp) || parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0;
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
             {(formData.purchasePrice || formData.perUnitPrice) && formData.openingStock && (
               <View style={styles.summaryContainer}>
                 <Text style={styles.summaryTitle}>Opening Stock Summary</Text>
                 
                 {formData.taxInclusive ? (
                   // For tax-inclusive pricing, show breakdown from base price
                   <>
                     <View style={styles.summaryRow}>
                       <Text style={styles.summaryLabel}>Price Entered (Tax-Inclusive):</Text>
                       <Text style={styles.summaryValue}>
                         ₹{((parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0) * parseInt(formData.openingStock)).toFixed(2)}
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
                         ₹{((parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0) * parseInt(formData.openingStock)).toFixed(2)}
                       </Text>
                     </View>
                     <View style={styles.summaryRow}>
                       <Text style={styles.summaryLabel}>GST ({formData.taxRate}% of Base Price):</Text>
                       <Text style={styles.summaryValue}>
                         ₹{(((parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0) * parseInt(formData.openingStock) * formData.taxRate) / 100).toFixed(2)}
                       </Text>
                     </View>
                     {formData.cessType !== 'none' && (
                       <>
                         <View style={styles.summaryRow}>
                           <Text style={styles.summaryLabel}>CESS:</Text>
                           <Text style={styles.summaryValue}>
                             ₹{(() => {
                               const basePrice = (parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0) * parseInt(formData.openingStock);
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
                       const purchasePrice = parseFloat(formData.purchasePrice) || parseFloat(formData.perUnitPrice) || 0;
                       const openingStock = parseInt(formData.openingStock) || 0;
                       
                       if (isNaN(purchasePrice) || isNaN(openingStock) || openingStock === 0) {
                         return '0.00';
                       }
                       
                       if (formData.taxInclusive) {
                         // For tax-inclusive, total is the price entered × quantity
                         return (purchasePrice * openingStock).toFixed(2);
                       } else {
                         // For tax-exclusive, calculate total including taxes
                         const basePrice = purchasePrice * openingStock;
                         const gstAmount = (basePrice * formData.taxRate) / 100;
                         let cessAmount = 0;
                         
                         switch (formData.cessType) {
                           case 'value':
                             cessAmount = basePrice * formData.cessRate / 100;
                             break;
                           case 'quantity':
                             cessAmount = openingStock * parseFloat(formData.cessAmount || '0');
                             break;
                           case 'value_and_quantity':
                             const valueCess = basePrice * formData.cessRate / 100;
                             const quantityCess = openingStock * parseFloat(formData.cessAmount || '0');
                             cessAmount = valueCess + quantityCess;
                             break;
                           case 'mrp':
                             const mrpPrice = (parseFloat(formData.mrp) || 0) * openingStock;
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

            <View style={styles.modalSearchWrapper}>
              <View style={[
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
              </View>
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
              <View style={[
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
                <View style={[
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
                </View>
              </View>
            )}

            {(formData.cessType === 'quantity' || formData.cessType === 'value_and_quantity') && (
              <>
                <View style={styles.modalInputGroup}>
                  <Text style={styles.modalLabel}>CESS Amount (₹ per unit)</Text>
                  <View style={[
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
                  </View>
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
            
            <ScrollView 
              style={styles.modalContent} 
              contentContainerStyle={{ paddingBottom: 0 }}
              showsVerticalScrollIndicator={false}
            >
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
                  <View style={styles.modalOptionContent}>
                  <Text style={[
                    styles.modalOptionText,
                    formData.taxRate === rate && styles.selectedOptionText
                  ]}>
                    {rate}% GST
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
              <View style={[
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
            </View>
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
                  router.push({
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
                  router.push({
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
              <View style={[
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
              <View style={[
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
              <View style={[
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
    backgroundColor: Colors.grey[50],
    padding: 16,
    borderRadius: 12,
  },
  barcodeImagePreview: {
    backgroundColor: Colors.background,
    padding: 8,
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
    opacity: 0.6,
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
    justifyContent: 'flex-end',
  },
  generateBarcodeModalCancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.grey[200],
  },
  generateBarcodeModalCancelText: {
    fontSize: 15,
    color: Colors.text,
    fontWeight: '500',
  },
  generateBarcodeModalConfirmButton: {
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
    backgroundColor: Colors.primary,
  },
  generateBarcodeModalConfirmText: {
    fontSize: 15,
    color: '#FFF',
    fontWeight: '600',
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