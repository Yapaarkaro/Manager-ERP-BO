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
  Percent
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

const categories = [
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

const secondaryUnits = [
  'None', 'Piece', 'Kilogram', 'Gram', 'Liter', 'Milliliter', 'Meter', 
  'Centimeter', 'Box', 'Pack', 'Set', 'Pair', 'Dozen', 'Ton', 'Quintal', 
  'Foot', 'Inch', 'Yard', 'Square Meter', 'Square Foot', 'Cubic Meter', 
  'Cubic Foot', 'Bundle', 'Roll', 'Sheet', 'Bottle', 'Can', 'Jar', 'Tube', 
  'Bag', 'Carton', 'Crate', 'Gallon', 'Ounce', 'Pound'
];

const taxRates = [0, 5, 12, 18, 28];
const cessRates = [0, 1, 2, 3, 4, 5, 10, 15, 20, 25];

const cessTypes = [
  { value: 'value', label: 'Based on Value' },
  { value: 'quantity', label: 'Based on Quantity' },
  { value: 'value_quantity', label: 'Based on Value & Quantity' },
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
  'Roll': { 'Meter': 100 },
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
  cessType: string;
  purchasePrice: string;
  salesPrice: string;
  cessRate: number;
  minStockLevel: string;
  maxStockLevel: string;
  openingStock: string;
  supplier: string;
  location: string;
  productImage: string | null;
}

export default function ManualProductScreen() {
  const { scannedData, isScanned } = useLocalSearchParams();
  
  const [formData, setFormData] = useState<ProductFormData>({
    name: '',
    category: '',
    customCategory: '',
    hsnCode: '',
    barcode: '',
    taxRate: 18,
    cessRate: 0,
    primaryUnit: 'Piece',
    secondaryUnit: 'None',
    useCompoundUnit: false,
    conversionRatio: '',
    cessType: 'value',
    purchasePrice: '',
    salesPrice: '',
    minStockLevel: '',
    maxStockLevel: '',
    openingStock: '',
    supplier: '',
    location: 'Main Warehouse',
    productImage: null,
  });

  const [showCategoryModal, setShowCategoryModal] = useState(false);
  const [showUnitModal, setShowUnitModal] = useState(false);
  const [showSecondaryUnitModal, setShowSecondaryUnitModal] = useState(false);
  const [showTaxModal, setShowTaxModal] = useState(false);
  const [showCessModal, setShowCessModal] = useState(false);
  const [showCessTypeModal, setShowCessTypeModal] = useState(false);
  const [showUnitTypeModal, setShowUnitTypeModal] = useState(false);
  const [showConversionModal, setShowConversionModal] = useState(false);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [showLocationModal, setShowLocationModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [categorySearch, setCategorySearch] = useState('');
  const [supplierSearch, setSupplierSearch] = useState('');
  const [locationSearch, setLocationSearch] = useState('');
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
          name: scanned.name || '',
          hsnCode: scanned.hsnCode || '',
          taxRate: scanned.taxRate || 18,
          cessRate: scanned.cessRate || 0,
          category: scanned.category || '',
          primaryUnit: scanned.primaryUnit || 'Piece',
          barcode: scanned.barcode || '',
          productImage: scanned.image || null,
        }));
      } catch (error) {
        console.error('Error parsing scanned data:', error);
      }
    }
  }, [isScanned, scannedData]);

  const updateFormData = (field: keyof ProductFormData, value: string | number | null) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleCategorySelect = (category: string) => {
    updateFormData('category', category);
    if (category !== 'Others') {
      updateFormData('customCategory', '');
    }
    setCategorySearch('');
    setShowCategoryModal(false);
  };

  const handleUnitSelect = (unit: string) => {
    updateFormData('primaryUnit', unit);
    setShowUnitModal(false);
  };

  const handleSecondaryUnitSelect = (unit: string) => {
    updateFormData('secondaryUnit', unit);
    
    // Check if conversion is needed
    if (unit !== 'None' && formData.primaryUnit !== 'Piece') {
      const preset = unitConversions[formData.primaryUnit]?.[unit];
      if (preset) {
        updateFormData('conversionRatio', preset.toString());
      } else {
        // Ask user for conversion ratio
        setShowConversionModal(true);
      }
    }
    
    setShowSecondaryUnitModal(false);
  };

  const handleTaxRateSelect = (rate: number) => {
    updateFormData('taxRate', rate);
    setShowTaxModal(false);
  };

  const handleCessRateSelect = (rate: number) => {
    updateFormData('cessRate', rate);
    
    // Show CESS type selector if rate > 0
    if (rate > 0) {
      setShowCessTypeModal(true);
    }
    
    setShowCessModal(false);
  };

  const handleCessTypeSelect = (type: string) => {
    updateFormData('cessType', type);
    setShowCessTypeModal(false);
  };

  const handleUnitTypeSelect = (useCompound: boolean) => {
    updateFormData('useCompoundUnit', useCompound);
    if (!useCompound) {
      updateFormData('secondaryUnit', 'None');
      updateFormData('conversionRatio', '');
    }
    setShowUnitTypeModal(false);
  };

  const handleConversionSubmit = (ratio: string) => {
    updateFormData('conversionRatio', ratio);
    setShowConversionModal(false);
  };

  const handleSupplierSelect = (supplierId: string) => {
    updateFormData('supplier', supplierId);
    setSupplierSearch('');
    setShowSupplierModal(false);
  };

  const handleLocationSelect = (location: string) => {
    updateFormData('location', location);
    setLocationSearch('');
    setShowLocationModal(false);
  };

  const handleImageSelect = (type: 'camera' | 'gallery') => {
    setShowImageModal(false);
    // Mock image URL - in real app this would open camera/gallery
    const mockImageUrl = 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=300&h=300&dpr=1';
    updateFormData('productImage', mockImageUrl);
    Alert.alert('Image Added', 'Product image has been added');
  };

  const handlePriceChange = (field: 'purchasePrice' | 'salesPrice', text: string) => {
    const cleaned = text.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    if (parts.length > 2) return;
    updateFormData(field, cleaned);
  };

  const handleStockChange = (field: 'minStockLevel' | 'maxStockLevel' | 'openingStock', text: string) => {
    const cleaned = text.replace(/\D/g, '');
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
      purchasePrice: parseFloat(formData.purchasePrice),
      salesPrice: parseFloat(formData.salesPrice),
      minStockLevel: parseInt(formData.minStockLevel),
      maxStockLevel: parseInt(formData.maxStockLevel),
      currentStock: parseInt(formData.openingStock),
      supplier: formData.supplier,
      location: formData.location,
      productImage: formData.productImage,
      createdAt: new Date().toISOString(),
    };

    console.log('Creating new product:', productData);
    
    setTimeout(() => {
      Alert.alert('Success', 'Product added to inventory successfully', [
        {
          text: 'OK',
          onPress: () => router.push('/inventory')
        }
      ]);
      setIsSubmitting(false);
    }, 1000);
  };

  const filteredCategories = categories.filter(cat =>
    cat.toLowerCase().includes(categorySearch.toLowerCase())
  );

  const filteredSuppliers = mockSuppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearch.toLowerCase())
  );

  const getSupplierName = (supplierId: string) => {
    const supplier = mockSuppliers.find(s => s.id === supplierId);
    return supplier?.name || 'Select supplier';
  };

  return (
    <SafeAreaView style={styles.container}>
      <KeyboardAvoidingView
        style={styles.keyboardView}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      >
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
              <TextInput
                style={styles.input}
                value={formData.barcode}
                onChangeText={(text) => updateFormData('barcode', text)}
                placeholder="Enter or scan barcode"
                placeholderTextColor={Colors.textLight}
                editable={isScanned !== 'true'}
              />
            </View>

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
              <Text style={styles.label}>CESS Rate</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowCessModal(true)}
                activeOpacity={0.7}
              >
                <Text style={styles.dropdownText}>
                  {formData.cessRate}% CESS {formData.cessRate > 0 ? `(${cessTypes.find(t => t.value === formData.cessType)?.label})` : ''}
                </Text>
                <ChevronDown size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Units of Measurement */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Units of Measurement</Text>
            
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
            </View>
          </View>

          {/* Pricing */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Pricing</Text>
            
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

            {formData.purchasePrice && formData.salesPrice && (
              <View style={styles.marginContainer}>
                <Text style={styles.marginLabel}>Profit Margin:</Text>
                <Text style={styles.marginValue}>
                  {((parseFloat(formData.salesPrice) - parseFloat(formData.purchasePrice)) / parseFloat(formData.purchasePrice) * 100).toFixed(1)}%
                </Text>
              </View>
            )}
          </View>

          {/* Stock Levels */}
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

          {/* Supplier & Location */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supplier & Location</Text>
            
            <View style={styles.inputGroup}>
              <Text style={styles.label}>Supplier</Text>
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
          
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowSupplierModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dropdownText,
                  !formData.supplier && styles.placeholderText
                ]}>
                  {formData.supplier ? getSupplierName(formData.supplier) : 'Select supplier (optional)'}
                </Text>
                <ChevronDown size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            {formData.useCompoundUnit && (
            <View style={[styles.inputGroup, styles.halfWidth]}>
              <Text style={styles.label}>Storage Location</Text>
              <TouchableOpacity
                style={styles.dropdown}
                onPress={() => setShowLocationModal(true)}
                activeOpacity={0.7}
              >
                <Text style={[
                  styles.dropdownText,
                  !formData.location && styles.placeholderText
                ]}>
                  {formData.location || 'Select storage location'}
                </Text>
                <ChevronDown size={20} color={Colors.textLight} />
              </TouchableOpacity>
            </View>
            )}
          </View>
          
          {formData.useCompoundUnit && formData.secondaryUnit !== 'None' && (
            <View style={styles.conversionContainer}>
              <Text style={styles.conversionText}>
                1 {formData.primaryUnit} = 
              </Text>
              <TextInput
                style={styles.conversionInput}
                value={formData.conversionRatio}
                onChangeText={(text) => updateFormData('conversionRatio', text.replace(/[^0-9.]/g, ''))}
                placeholder="0"
                placeholderTextColor={Colors.textLight}
                keyboardType="decimal-pad"
              />
              <Text style={styles.conversionText}>
                {formData.secondaryUnit}
              </Text>
            </View>
          )}

          <TouchableOpacity
            style={[
              styles.submitButton,
              isFormValid() ? styles.enabledButton : styles.disabledButton
            ]}
            onPress={handleSubmit}
            disabled={!isFormValid() || isSubmitting}
            activeOpacity={0.8}
          >
            <Text style={[
              styles.submitButtonText,
              isFormValid() ? styles.enabledButtonText : styles.disabledButtonText
            ]}>
              {isSubmitting ? 'Adding Product...' : 'Add Product to Inventory'}
            </Text>
          </TouchableOpacity>
        </ScrollView>

        {/* Modals */}
        {/* Category Modal */}
        <Modal
          visible={showCategoryModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCategoryModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Category</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowCategoryModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.searchContainer}>
                <Search size={18} color={Colors.textLight} />
                <TextInput
                  ref={categorySearchRef}
                  style={styles.searchInput}
                  value={categorySearch}
                  onChangeText={setCategorySearch}
                  placeholder="Search categories..."
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {filteredCategories.map((category) => (
                  <TouchableOpacity
                    key={category}
                    style={[
                      styles.modalOption,
                      formData.category === category && styles.selectedOption
                    ]}
                    onPress={() => handleCategorySelect(category)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      formData.category === category && styles.selectedOptionText
                    ]}>
                      {category}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        </Modal>

        {/* Similar modals for other dropdowns... */}
        {/* I'll include the key modals here */}

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

        {/* CESS Rate Modal */}
        <Modal
          visible={showCessModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowCessModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select CESS Rate</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowCessModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                {cessRates.map((rate) => (
                  <TouchableOpacity
                    key={rate}
                    style={[
                      styles.modalOption,
                      formData.cessRate === rate && styles.selectedOption
                    ]}
                    onPress={() => handleCessRateSelect(rate)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      formData.cessRate === rate && styles.selectedOptionText
                    ]}>
                      {rate}% CESS
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
                    onPress={() => handleCessTypeSelect(type.value)}
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
          onRequestClose={() => setShowUnitModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Primary Unit</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowUnitModal(false)}
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
          onRequestClose={() => setShowSecondaryUnitModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Secondary Unit</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
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

        {/* Supplier Modal */}
        <Modal
          visible={showSupplierModal}
          transparent={true}
          animationType="fade"
          onRequestClose={() => setShowSupplierModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Supplier</Text>
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
                {filteredSuppliers.map((supplier) => (
                  <TouchableOpacity
                    key={supplier.id}
                    style={[
                      styles.modalOption,
                      formData.supplier === supplier.id && styles.selectedOption
                    ]}
                    onPress={() => handleSupplierSelect(supplier.id)}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.modalOptionText,
                      formData.supplier === supplier.id && styles.selectedOptionText
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
                {storageLocations
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
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    outlineStyle: 'none',
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
  submitButton: {
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 16,
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
    width: '100%',
    maxWidth: 400,
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
    justifyContent: 'space-between',
    alignItems: 'center',
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
    outlineStyle: 'none',
  },
  modalContent: {
    maxHeight: 300,
  },
  modalOption: {
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
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
    outlineStyle: 'none',
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
    outlineStyle: 'none',
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
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  disabledButtonText: {
    color: Colors.textLight,
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
    outlineStyle: 'none',
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
    paddingHorizontal: 20,
    textAlign: 'center',
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
    outlineStyle: 'none',
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
});