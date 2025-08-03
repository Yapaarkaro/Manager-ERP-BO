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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
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
  'Accessories', 'Wearables', 'Home Appliances', 'Others'
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

const mockSuppliers = [
  { id: '1', name: 'Apple India Pvt Ltd', type: 'business' },
  { id: '2', name: 'Samsung Electronics', type: 'business' },
  { id: '3', name: 'Dell Technologies', type: 'business' },
  { id: '4', name: 'Sony India', type: 'business' },
  { id: '5', name: 'Local Electronics Supplier', type: 'individual' },
];

interface ProductFormData {
  name: string;
  category: string;
  customCategory: string;
  hsnCode: string;
  barcode: string;
  taxRate: number;
  primaryUnit: string;
  secondaryUnit: string;
  useCompoundUnit: boolean;
  conversionRatio: string;
  priceUnit: 'primary' | 'secondary';
  cessType: 'none' | 'value' | 'quantity' | 'value_and_quantity';
  cessRate: number;
  cessAmount: string;
  cessUnit: string;
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

export default function ManualProductScreen() {
  const { scannedData, isScanned, returnToStockIn, supplierId, newSupplier } = useLocalSearchParams();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: '',
    customCategory: '',
    hsnCode: '',
    barcode: '',
    taxRate: 18,
    cessRate: 0,
    cessAmount: '',
    cessUnit: '',
    primaryUnit: 'Piece',
    secondaryUnit: 'None',
    useCompoundUnit: false,
    conversionRatio: '',
    priceUnit: 'primary',
    cessType: 'none',
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
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categorySearchRef = useRef<TextInput>(null);
  const supplierSearchRef = useRef<TextInput>(null);

  useEffect(() => {
    // Auto-fill data if scanned
    if (isScanned === 'true' && scannedData) {
      try {
        const scanned = JSON.parse(scannedData as string);
        setFormData(prev => ({
          ...prev,
          barcode: scanned.barcode || '',
          name: scanned.name || '',
        }));
      } catch (error) {
        console.error('Error parsing scanned data:', error);
      }
    }
  }, [scannedData, isScanned]);

  useEffect(() => {
    // Auto-fill supplier if passed from stock in
    if (supplierId && typeof supplierId === 'string') {
      setFormData(prev => ({
        ...prev,
        preferredSupplier: supplierId
      }));
    }
  }, [supplierId]);

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

  const handleTaxRateSelect = (rate: number) => {
    setFormData(prev => ({ ...prev, taxRate: rate }));
    setShowTaxModal(false);
  };

  const handleCessTypeSelect = (type: 'none' | 'value' | 'quantity' | 'value_and_quantity') => {
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

  const handlePriceChange = (field: 'purchasePrice' | 'salesPrice' | 'mrp', text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length <= 2 && parts[0].length <= 8) {
      updateFormData(field, cleaned);
    }
  };

  const handleStockChange = (field: 'minStockLevel' | 'maxStockLevel' | 'openingStock', text: string) => {
    const cleaned = text.replace(/[^0-9]/g, '');
    updateFormData(field, cleaned);
  };

  const isFormValid = () => {
    return (
      formData.name.trim().length > 0 &&
      formData.category.trim().length > 0 &&
      (formData.category !== 'Others' || formData.customCategory.trim().length > 0) &&
      formData.hsnCode.trim().length > 0 &&
      formData.barcode.trim().length > 0 &&
      formData.purchasePrice.trim().length > 0 &&
      formData.salesPrice.trim().length > 0 &&
      formData.openingStock.trim().length > 0 &&
      formData.minStockLevel.trim().length > 0 &&
      formData.maxStockLevel.trim().length > 0
    );
  };

  const handleSubmit = async () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);

    const productData = {
      id: `PROD_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
      name: formData.name.trim(),
      category: formData.category !== 'Others' ? formData.category : formData.customCategory.trim(),
      hsnCode: formData.hsnCode.trim(),
      barcode: formData.barcode.trim(),
      taxRate: formData.taxRate,
      primaryUnit: formData.primaryUnit,
      secondaryUnit: formData.secondaryUnit !== 'None' ? formData.secondaryUnit : undefined,
      useCompoundUnit: formData.useCompoundUnit,
      conversionRatio: formData.conversionRatio,
      cessType: formData.cessType,
      cessAmount: formData.cessAmount,
      cessRate: formData.cessRate,
      cessUnit: formData.cessUnit,
      purchasePrice: parseFloat(formData.purchasePrice),
      salesPrice: parseFloat(formData.salesPrice),
      minStockLevel: parseInt(formData.minStockLevel),
      maxStockLevel: parseInt(formData.maxStockLevel),
      currentStock: parseInt(formData.openingStock),
      supplier: formData.preferredSupplier,
      location: formData.location,
      productImage: formData.productImage,
      createdAt: new Date().toISOString(),
    };

    console.log('Creating new product:', productData);
    
    setTimeout(() => {
      if (returnToStockIn === 'true') {
        // Return to stock in with the new product data
        const stockInProductData = {
          id: productData.id,
          name: productData.name,
          price: productData.purchasePrice,
          gstRate: productData.taxRate,
          cessRate: parseFloat(formData.cessAmount) || 0,
          cessType: formData.cessType,
          cessAmount: parseFloat(formData.cessAmount) || 0,
        };
        
        Alert.alert('Success', 'Product added successfully. Returning to stock in...', [
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
      } else {
        Alert.alert('Success', 'Product added to inventory successfully', [
          {
            text: 'OK',
            onPress: () => router.back()
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
    return supplier ? supplier.name : '';
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
            {isScanned === 'true' ? 'Complete Product Details' : 'Add New Product'}
          </Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
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
              <View style={styles.inputContainer}>
                <Package size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.name}
                  onChangeText={(text) => updateFormData('name', text)}
                  placeholder="Enter product name"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                />
              </View>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Category *</Text>
              {formData.category === 'Others' ? (
                <View style={styles.customInputContainer}>
                  <View style={styles.inputContainer}>
                    <TextInput
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
              <Text style={styles.label}>Barcode *</Text>
              <View style={styles.inputContainer}>
                <Barcode size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.barcode}
                  onChangeText={(text) => updateFormData('barcode', text)}
                  placeholder="Enter or scan barcode"
                  placeholderTextColor={Colors.textLight}
                  editable={isScanned !== 'true'}
                />
                <TouchableOpacity
                  style={styles.scanIconButton}
                  onPress={() => {
                    // Navigate to scanner
                    router.push('/inventory/scan-product');
                  }}
                  activeOpacity={0.7}
                >
                  <Camera size={20} color={Colors.primary} />
                </TouchableOpacity>
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
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Opening Stock *</Text>
              <TextInput
                style={styles.input}
                value={formData.openingStock}
                onChangeText={(text) => handleStockChange('openingStock', text)}
                placeholder="Enter opening stock quantity"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
              />
            </View>

            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Min Stock Level *</Text>
                <TextInput
                  style={styles.input}
                  value={formData.minStockLevel}
                  onChangeText={(text) => handleStockChange('minStockLevel', text)}
                  placeholder="Min level"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                />
              </View>

              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Max Stock Level *</Text>
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

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            
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
            
            <View style={styles.rowContainer}>
              <View style={[styles.inputGroup, styles.halfWidth]}>
                <Text style={styles.label}>Purchase Price *</Text>
                <View style={styles.inputContainer}>
                  <Text style={styles.currencySymbol}>₹</Text>
                  <TextInput
                    style={styles.input}
                    value={formData.purchasePrice}
                    onChangeText={(text) => handlePriceChange('purchasePrice', text)}
                    placeholder="0.00"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>
              <View style={[styles.inputGroup, styles.halfWidth]}>
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
            {formData.purchasePrice && formData.salesPrice && (
              <View style={styles.marginContainer}>
                <Text style={styles.marginLabel}>Profit Margin:</Text>
                <Text style={styles.marginValue}>
                  {((parseFloat(formData.salesPrice) - parseFloat(formData.purchasePrice)) / parseFloat(formData.purchasePrice) * 100).toFixed(1)}%
                </Text>
              </View>
            )}
            
            {/* Opening Stock Summary */}
            {formData.purchasePrice && formData.openingStock && (
              <View style={styles.summaryContainer}>
                <Text style={styles.summaryTitle}>Opening Stock Summary</Text>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Base Price:</Text>
                  <Text style={styles.summaryValue}>
                    ₹{(parseFloat(formData.purchasePrice) * parseInt(formData.openingStock)).toFixed(2)}
                  </Text>
                </View>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>GST ({formData.taxRate}%):</Text>
                  <Text style={styles.summaryValue}>
                    ₹{((parseFloat(formData.purchasePrice) * parseInt(formData.openingStock) * formData.taxRate) / 100).toFixed(2)}
                  </Text>
                </View>
                {formData.cessType !== 'none' && (
                  <>
                    <View style={styles.summaryRow}>
                      <Text style={styles.summaryLabel}>CESS:</Text>
                      <Text style={styles.summaryValue}>
                        ₹{(() => {
                          const basePrice = parseFloat(formData.purchasePrice) * parseInt(formData.openingStock);
                          switch (formData.cessType) {
                            case 'value':
                              return (basePrice * formData.cessRate / 100).toFixed(2);
                            case 'quantity':
                              return (parseInt(formData.openingStock) * parseFloat(formData.cessAmount || '0')).toFixed(2);
                            case 'value_and_quantity':
                              const valueCess = basePrice * formData.cessRate / 100;
                              const quantityCess = parseInt(formData.openingStock) * parseFloat(formData.cessAmount || '0');
                              return (valueCess + quantityCess).toFixed(2);
                            default:
                              return '0.00';
                          }
                        })()}
                      </Text>
                    </View>
                    <View style={styles.cessCalculationRow}>
                      <Text style={styles.cessCalculationLabel}>CESS Calculation:</Text>
                      <Text style={styles.cessCalculationText}>
                        {(() => {
                          const basePrice = parseFloat(formData.purchasePrice) * parseInt(formData.openingStock);
                          switch (formData.cessType) {
                            case 'value':
                              return `${formData.cessRate}% of Base Price (₹${basePrice.toFixed(2)}) = ₹${(basePrice * formData.cessRate / 100).toFixed(2)}`;
                            case 'quantity':
                              return `${formData.cessAmount} × ${parseInt(formData.openingStock)} ${formData.cessUnit} = ₹${(parseInt(formData.openingStock) * parseFloat(formData.cessAmount || '0')).toFixed(2)}`;
                            case 'value_and_quantity':
                              const valueCess = basePrice * formData.cessRate / 100;
                              const quantityCess = parseInt(formData.openingStock) * parseFloat(formData.cessAmount || '0');
                              return `${formData.cessRate}% of Base Price (₹${basePrice.toFixed(2)}) + ${formData.cessAmount} × ${parseInt(formData.openingStock)} ${formData.cessUnit} = ₹${(valueCess + quantityCess).toFixed(2)}`;
                            default:
                              return 'No CESS applied';
                          }
                        })()}
                      </Text>
                    </View>
                  </>
                )}
                <View style={[styles.summaryRow, styles.totalRow]}>
                  <Text style={styles.totalLabel}>Total Value:</Text>
                  <Text style={styles.totalValue}>
                    ₹{(() => {
                      const basePrice = parseFloat(formData.purchasePrice) * parseInt(formData.openingStock);
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
                      }
                      
                      return (basePrice + gstAmount + cessAmount).toFixed(2);
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
              {isSubmitting ? 'Adding Product...' : 'Add Product'}
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

            {(formData.cessType === 'value' || formData.cessType === 'value_and_quantity') && (
              <View style={styles.modalInputGroup}>
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
                  <TouchableOpacity
                    style={styles.modalInputContainer}
                    onPress={() => {
                      const availableUnits = [formData.primaryUnit];
                      if (formData.useCompoundUnit && formData.secondaryUnit !== 'None') {
                        availableUnits.push(formData.secondaryUnit);
                      }
                      
                      Alert.alert(
                        'Select CESS Unit',
                        'Choose the unit for CESS calculation',
                        [
                          ...availableUnits.map(unit => ({ 
                            text: unit, 
                            onPress: () => updateFormData('cessUnit', unit) 
                          })),
                          { text: 'Cancel', style: 'cancel' }
                        ]
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
                  ((!formData.cessRate && (formData.cessType === 'value' || formData.cessType === 'value_and_quantity')) ||
                   (!formData.cessAmount && (formData.cessType === 'quantity' || formData.cessType === 'value_and_quantity')) ||
                   (!formData.cessUnit && (formData.cessType === 'quantity' || formData.cessType === 'value_and_quantity'))) && styles.disabledButton
                ]}
                onPress={() => setShowCessAmountModal(false)}
                disabled={(!formData.cessRate && (formData.cessType === 'value' || formData.cessType === 'value_and_quantity')) ||
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
                  onPress={() => handleCessTypeSelect(type.value as 'none' | 'value' | 'quantity' | 'value_and_quantity')}
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
            
            <View style={styles.modalContent}>
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
  inputGroup: {
    marginBottom: 16,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
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
    marginTop: 'auto',
    marginBottom: 'auto',
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
  },
  conversionSubmitButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
    paddingHorizontal: 20,
    textAlign: 'center',
  },
  scanIconButton: {
    padding: 8,
    marginLeft: 8,
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
});