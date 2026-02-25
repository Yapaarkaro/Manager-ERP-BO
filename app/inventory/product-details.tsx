import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
  Modal,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { useWebNavigation } from '@/contexts/WebNavigationContext';
import { dataStore } from '@/utils/dataStore';
import { productStore } from '@/utils/productStore';
import { getProductInventoryLogs, getProductInventoryLogsByLocation, getProductLocationStock, getSuppliers } from '@/services/backendApi';
import { ArrowLeft, Package, ChartBar as BarChart3, Hash, Scan, Building2, MapPin, Calendar, TrendingUp, TrendingDown, ShoppingCart, FileText, Eye, Plus, Minus, Trash2, Percent, IndianRupee, Edit3, Phone, ChevronDown, Filter, ChevronLeft, ChevronRight } from 'lucide-react-native';

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

interface InventoryLog {
  id: string;
  type: 'opening_stock' | 'sale' | 'purchase' | 'return' | 'adjustment' | 'transfer';
  invoiceNumber?: string;
  quantity: number;
  date: string;
  staffName: string;
  customerName?: string;
  supplierName?: string;
  reason?: string;
  balanceAfter: number;
  locationName?: string;
  locationId?: string;
  referenceType?: string;
  referenceId?: string;
  unitPrice?: number;
  totalValue?: number;
}

interface LocationStock {
  locationId: string;
  locationName: string;
  locationType: string;
  quantity: number;
  lastUpdated: string;
  updatedBy?: string;
}

// Mock data removed - now fetching from backend

export default function ProductDetailsScreen() {
  const { productId, productData } = useLocalSearchParams();
  const { isWeb, currentScreen } = useWebNavigation();
  
  // Parse product data with error handling
  // On web, we might need to parse from URL query string or currentScreen if productData is not available
  let product: any = null;
  let parsedProductData: string | null = null;
  let parsedProductId: string | null = null;
  
  // Try to get productData from URL if not in params (for web navigation)
  if (!productData && isWeb) {
    // First try from currentScreen (navigation context)
    if (currentScreen && currentScreen.includes('?')) {
      const queryString = currentScreen.split('?')[1];
      const params = new URLSearchParams(queryString);
      parsedProductData = params.get('productData');
      parsedProductId = params.get('productId') || null;
    }
    
    if (!parsedProductData && Platform.OS === 'web' && typeof window !== 'undefined' && window.location?.search) {
      const urlParams = new URLSearchParams(window.location.search);
      parsedProductData = urlParams.get('productData');
      if (!parsedProductId) {
        parsedProductId = urlParams.get('productId');
      }
    }
  }
  
  // Use parsed productId if original is not available
  const finalProductId = productId || parsedProductId;
  
  try {
    const dataToParse = productData || parsedProductData;
    if (dataToParse) {
      const data = typeof dataToParse === 'string' ? dataToParse : JSON.stringify(dataToParse);
      product = JSON.parse(data);
    } else if (finalProductId) {
      // If productData is not available, try to get from productStore
      product = productStore.getProductById(finalProductId as string);
    }
  } catch (error) {
    console.error('Error parsing product data:', error);
    // Try to get product from store as fallback
    if (finalProductId) {
      product = productStore.getProductById(finalProductId as string);
    }
  }
  
  // If product is still not found, show error
  if (!product) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.headerSafeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => {
                if (isWeb) {
                  router.back();
                } else {
                  router.back();
                }
              }}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Product Details</Text>
          </View>
        </SafeAreaView>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, color: Colors.error, textAlign: 'center' }}>
            Product not found. Please go back and try again.
          </Text>
        </View>
      </View>
    );
  }
  
  const [selectedTab, setSelectedTab] = useState<'details' | 'inventory'>('details');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedUoM, setSelectedUoM] = useState<'primary' | 'secondary' | 'tertiary'>('primary');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null); // null = all locations
  const [locationStock, setLocationStock] = useState<LocationStock[]>([]);
  const [showUoMModal, setShowUoMModal] = useState(false);
  const [showLocationFilterModal, setShowLocationFilterModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const imageScrollViewRef = useRef<ScrollView>(null);

  // Load suppliers from backend to ensure supplier names are available
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const result = await getSuppliers();
        if (result.success && result.suppliers) {
          // Convert Supabase supplier format to Supplier interface format (matching suppliers.tsx)
          const convertedSuppliers: any[] = result.suppliers.map((sup: any) => ({
            id: sup.id,
            name: sup.contact_person || '',
            businessName: sup.business_name || '',
            supplierType: sup.supplier_type || 'business',
            contactPerson: sup.contact_person || '',
            mobile: sup.mobile_number || '',
            email: sup.email || '',
            address: `${sup.address_line_1 || ''}, ${sup.address_line_2 ? sup.address_line_2 + ', ' : ''}${sup.address_line_3 ? sup.address_line_3 + ', ' : ''}${sup.city || ''}, ${sup.pincode || ''}, ${sup.state || ''}`,
            gstin: sup.gstin_pan || '',
            avatar: '',
            supplierScore: 85,
            onTimeDelivery: 90,
            qualityRating: 4.5,
            responseTime: 2.1,
            totalOrders: 0,
            completedOrders: 0,
            pendingOrders: 0,
            cancelledOrders: 0,
            totalValue: 0,
            lastOrderDate: null,
            joinedDate: sup.created_at || new Date().toISOString(),
            status: sup.status || 'active',
            paymentTerms: 'Net 30 Days',
            deliveryTime: '3-5 Business Days',
            categories: [],
            productCount: 0,
            createdAt: sup.created_at || new Date().toISOString(),
          }));
          
          // Add suppliers to dataStore if they don't exist
          convertedSuppliers.forEach((supplier: any) => {
            if (!dataStore.getSupplierById(supplier.id)) {
              dataStore.addSupplier(supplier);
            }
          });
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
      }
    };
    loadSuppliers();
  }, []);

  // Load location stock from backend
  useEffect(() => {
    const loadLocationStock = async () => {
      const idToUse = productId || parsedProductId;
      if (!idToUse) return;

      try {
        const result = await getProductLocationStock(idToUse as string);
        if (result.success && result.locationStock) {
          setLocationStock(result.locationStock);
        }
      } catch (error) {
        console.error('Error loading location stock:', error);
      }
    };

    if (selectedTab === 'inventory') {
      loadLocationStock();
    }
  }, [productId, parsedProductId, selectedTab]);

  // Load inventory logs from backend (with optional location filter)
  useEffect(() => {
    const loadInventoryLogs = async () => {
      const idToUse = productId || parsedProductId;
      if (!idToUse) return;
      
      setLoadingLogs(true);
      try {
        const idToUse = productId || parsedProductId;
        if (!idToUse) return;
        
        // Use location-filtered API if location is selected
        const result = selectedLocationId
          ? await getProductInventoryLogsByLocation(idToUse as string, selectedLocationId)
          : await getProductInventoryLogs(idToUse as string);
          
        if (result.success && result.logs) {
          // Transform backend logs to InventoryLog format
          const transformedLogs: InventoryLog[] = result.logs.map((log: any) => ({
            id: log.id,
            type: log.type,
            invoiceNumber: log.invoiceNumber,
            quantity: log.quantity,
            date: log.date,
            staffName: log.staffName || 'Staff',
            customerName: log.customerName,
            supplierName: log.supplierName,
            reason: log.reason,
            balanceAfter: log.balanceAfter || 0,
            locationName: log.locationName,
            locationId: log.locationId,
            referenceType: log.referenceType,
            referenceId: log.referenceId,
            unitPrice: log.unitPrice,
            totalValue: log.totalValue,
          }));
          setInventoryLogs(transformedLogs);
        } else {
          console.error('Failed to load inventory logs:', result.error);
          setInventoryLogs([]);
        }
      } catch (error) {
        console.error('Error loading inventory logs:', error);
        setInventoryLogs([]);
      } finally {
        setLoadingLogs(false);
      }
    };

    if (selectedTab === 'inventory') {
      loadInventoryLogs();
    }
  }, [productId, parsedProductId, selectedTab, selectedLocationId]);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 3,
    }).format(price);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'opening_stock': return Colors.primary;
      case 'sale': return Colors.error;
      case 'purchase': return Colors.success;
      case 'return': return Colors.warning;
      case 'adjustment': return Colors.primary;
      case 'transfer': return '#8b5cf6';
      default: return Colors.textLight;
    }
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'opening_stock': return Package;
      case 'sale': return ShoppingCart;
      case 'purchase': return Plus;
      case 'return': return TrendingUp;
      case 'adjustment': return Package;
      case 'transfer': return TrendingDown;
      default: return Package;
    }
  };

  const getLogTypeText = (type: string) => {
    switch (type) {
      case 'opening_stock': return 'Opening Stock';
      case 'sale': return 'Sale';
      case 'purchase': return 'Purchase';
      case 'return': return 'Return';
      case 'adjustment': return 'Adjustment';
      case 'transfer': return 'Transfer';
      default: return type;
    }
  };

  // Convert quantity based on selected UoM
  const convertQuantity = (quantity: number): number => {
    if (!product.useCompoundUnit || selectedUoM === 'primary') {
      return quantity;
    }

    const conversionRatio = parseFloat(product.conversionRatio || '1');
    const tertiaryRatio = parseFloat(product.tertiaryConversionRatio || '1');

    if (selectedUoM === 'secondary' && product.secondaryUnit && product.secondaryUnit !== 'None') {
      return quantity / conversionRatio;
    }

    if (selectedUoM === 'tertiary' && product.tertiaryUnit && product.tertiaryUnit !== 'None') {
      return quantity / (conversionRatio * tertiaryRatio);
    }

    return quantity;
  };

  // Get current stock for selected location (or total if all locations)
  const getCurrentStock = (): number => {
    if (selectedLocationId) {
      const location = locationStock.find(loc => loc.locationId === selectedLocationId);
      return location ? convertQuantity(location.quantity) : 0;
    }
    
    // Sum all locations
    const totalStock = locationStock.reduce((sum, loc) => sum + loc.quantity, 0);
    return convertQuantity(totalStock);
  };

  // Get UoM label
  const getUoMLabel = (): string => {
    if (!product.useCompoundUnit || selectedUoM === 'primary') {
      return product.primaryUnit || 'Piece';
    }
    
    if (selectedUoM === 'secondary' && product.secondaryUnit && product.secondaryUnit !== 'None') {
      return product.secondaryUnit;
    }
    
    if (selectedUoM === 'tertiary' && product.tertiaryUnit && product.tertiaryUnit !== 'None') {
      return product.tertiaryUnit;
    }
    
    return product.primaryUnit || 'Piece';
  };

  const handleLogPress = (log: InventoryLog) => {
    if (log.invoiceNumber) {
      const invoiceData = {
        id: log.invoiceNumber.replace(/[A-Z-]/g, ''),
        invoiceNumber: log.invoiceNumber,
        customerName: log.customerName || log.supplierName || 'N/A',
        customerType: 'individual',
        staffName: log.staffName,
        staffAvatar: '',
        paymentStatus: 'paid',
        amount: Math.abs(log.quantity) * (product.salesPrice || 0),
        itemCount: Math.abs(log.quantity),
        date: log.date,
        customerDetails: {
          name: log.customerName || log.supplierName || 'N/A',
          mobile: '',
          address: ''
        }
      };

      if (log.type === 'return') {
        // Navigate to return details
        const returnInvoice = {
          id: log.invoiceNumber.replace('RET-', ''),
          returnNumber: log.invoiceNumber,
          originalInvoiceNumber: '',
          customerName: log.customerName || 'N/A',
          customerType: 'individual',
          staffName: log.staffName,
          staffAvatar: '',
          refundStatus: 'refunded',
          amount: Math.abs(log.quantity) * (product.salesPrice || 0),
          itemCount: Math.abs(log.quantity),
          date: log.date,
          reason: log.reason || 'Customer return',
          customerDetails: {
            name: log.customerName || 'N/A',
            mobile: '',
            address: ''
          }
        };

        router.push({
          pathname: '/return-details',
          params: {
            returnId: returnInvoice.id,
            returnData: JSON.stringify(returnInvoice)
          }
        });
      } else {
        // Navigate to invoice details
        router.push({
          pathname: '/invoice-details',
          params: {
            invoiceId: invoiceData.id,
            invoiceData: JSON.stringify(invoiceData)
          }
        });
      }
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return Colors.error;
      case 'low': return Colors.warning;
      case 'moderate': return '#f59e0b';
      default: return Colors.textLight;
    }
  };

  const renderInventoryLog = (log: InventoryLog) => {
    const LogIcon = getLogTypeIcon(log.type);
    const logColor = getLogTypeColor(log.type);
    const convertedQuantity = convertQuantity(log.quantity);
    const convertedBalance = convertQuantity(log.balanceAfter);

    return (
      <TouchableOpacity
        key={log.id}
        style={styles.logCard}
        onPress={() => handleLogPress(log)}
        activeOpacity={0.7}
      >
        <View style={styles.logHeader}>
          <View style={styles.logLeft}>
            <View style={[styles.logIcon, { backgroundColor: `${logColor}20` }]}>
              <LogIcon size={16} color={logColor} />
            </View>
            <View style={styles.logInfo}>
              <Text style={styles.logType}>
                {getLogTypeText(log.type)}
                {log.invoiceNumber && ` - ${log.invoiceNumber}`}
              </Text>
              <Text style={styles.logDate}>{formatDate(log.date)}</Text>
            </View>
          </View>
          
          <View style={styles.logRight}>
            <Text style={[
              styles.logQuantity,
              { color: log.quantity > 0 ? Colors.success : Colors.error }
            ]}>
              {log.quantity > 0 ? '+' : ''}{convertedQuantity.toFixed(3)} {getUoMLabel()}
            </Text>
            <Text style={styles.logBalance}>
              Bal: {convertedBalance.toFixed(3)} {getUoMLabel()}
            </Text>
          </View>
        </View>

        <View style={styles.logDetails}>
          {log.locationName && (
            <Text style={styles.logDetailText}>Location: {log.locationName}</Text>
          )}
          {log.customerName && (
            <Text style={styles.logDetailText}>Customer: {log.customerName}</Text>
          )}
          {log.supplierName && (
            <Text style={styles.logDetailText}>Supplier: {log.supplierName}</Text>
          )}
          {log.reason && (
            <Text style={styles.logDetailText}>Reason: {log.reason}</Text>
          )}
          <Text style={styles.logDetailText}>Staff: {log.staffName}</Text>
          {log.unitPrice !== undefined && (
            <Text style={styles.logDetailText}>Unit Price: {formatPrice(log.unitPrice)}</Text>
          )}
        </View>

        {log.invoiceNumber && (
          <View style={styles.viewInvoiceButton}>
            <Eye size={14} color={Colors.primary} />
            <Text style={styles.viewInvoiceText}>View Invoice</Text>
          </View>
        )}
      </TouchableOpacity>
    );
  };

  const handleEditProduct = () => {
    // Navigate to the manual product screen with existing product data for editing
    router.push({
      pathname: '/inventory/manual-product',
      params: {
        editMode: 'true',
        productId: product.id,
        productData: JSON.stringify(product)
      }
    });
  };

  const handleDeleteProduct = () => {
    // Get all records related to this product
    const productRecords = dataStore.getProductRecords(product.id);
    
    // Show detailed confirmation dialog
    const recordsMessage = `This will permanently delete:

• Product: ${product.name}
• Sales Invoices: ${productRecords.totalSales}
• Purchase Invoices: ${productRecords.totalInvoices}
• Related Payments: ${productRecords.totalReceivables}
• Total Transaction Value: ₹${productRecords.totalAmount.toLocaleString('en-IN')}

All related transaction history and customer receivables will be updated accordingly.

This action cannot be undone.`;

    Alert.alert(
      'Delete Product',
      recordsMessage,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowDeleteModal(false)
        },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: confirmDeleteProduct
        }
      ]
    );
  };

  const confirmDeleteProduct = () => {
    try {
      // Delete related records from dataStore first
      const deletedRecords = dataStore.deleteProductRecords(product.id);
      
      // Then delete the product itself from productStore
      const productDeleted = productStore.deleteProduct(product.id);
      
      if (productDeleted) {
        Alert.alert(
          'Product Deleted Successfully',
          `Product and ${deletedRecords.sales} sales records, ${deletedRecords.invoices} invoices have been permanently deleted.`,
          [
            {
              text: 'OK',
              onPress: () => {
                setShowDeleteModal(false);
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          'Failed to delete product. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      Alert.alert(
        'Error',
        'An error occurred while deleting the product. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const cancelDeleteProduct = () => {
    setShowDeleteModal(false);
  };

  const handleSupplierPress = (supplierId: string | undefined) => {
    if (supplierId && supplierId !== 'Not specified') {
      // Get supplier data from dataStore
      const supplier = dataStore.getSupplierById(supplierId);
      
      if (supplier) {
        // Navigate to the existing purchasing supplier details screen
        router.push({
          pathname: '/purchasing/supplier-details',
          params: {
            supplierId: supplierId,
            supplierData: JSON.stringify(supplier)
          }
        });
      } else {
        // Supplier not found in dataStore - could be an ID that was set manually
        Alert.alert(
          'Supplier Not Found', 
          'This supplier is not in your supplier database. Would you like to add them?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add Supplier',
              onPress: () => {
                router.push('/purchasing/add-supplier');
              }
            }
          ]
        );
      }
    }
  };

  const getSupplierName = (supplierId: string | undefined) => {
    if (!supplierId) return 'Not specified';
    
    // Get supplier name from dataStore
    const supplier = dataStore.getSupplierById(supplierId);
    if (supplier) {
      // Show business name if available, otherwise show contact person name
      return supplier.businessName || supplier.name;
    }
    return supplierId;
  };

  const handleCallSupplier = (supplierId: string | undefined) => {
    if (supplierId && supplierId !== 'Not specified') {
      const supplier = dataStore.getSupplierById(supplierId);
      if (supplier && supplier.mobile) {
        // In a real app, this would open the phone dialer
        // For now, we'll show an alert with the phone number
        Alert.alert(
          'Call Supplier',
          `Call ${getSupplierName(supplierId)} at ${supplier.mobile}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Call', 
              onPress: () => {
                // In a real app, you would use Linking.openURL(`tel:${supplier.mobile}`)
                console.log(`Calling ${supplier.mobile}`);
              }
            }
          ]
        );
      } else {
        Alert.alert('No Phone Number', 'Phone number not available for this supplier');
      }
    }
  };

  const formatSupplierNameForDisplay = (supplierName: string) => {
    if (!supplierName || supplierName === 'Not specified') {
      return supplierName;
    }

    // Split the name into words
    const words = supplierName.split(' ');
    
    if (words.length <= 2) {
      // For short names, return as is
      return supplierName;
    }
    
    if (words.length === 3) {
      // For 3-word names: "Word1 Word2\nWord3"
      return `${words[0]} ${words[1]}\n${words[2]}`;
    }
    
    if (words.length === 4) {
      // For 4-word names: "Word1 Word2\nWord3 Word4"
      return `${words[0]} ${words[1]}\n${words[2]} ${words[3]}`;
    }
    
    // For longer names: "Word1 Word2\nWord3 Word4..."
    const firstLine = words.slice(0, 2).join(' ');
    const secondLine = words.slice(2, 4).join(' ') + '...';
    return `${firstLine}\n${secondLine}`;
  };



  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={styles.headerSafeArea}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => {
              if (isWeb) {
                // On web, close the screen but keep sidebar visible
                router.back();
              } else {
                router.back();
              }
            }}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Product Details</Text>
          
          <View style={styles.headerRight}>
            <TouchableOpacity
              style={styles.editButton}
              onPress={handleEditProduct}
              activeOpacity={0.7}
            >
              <Edit3 size={20} color={Colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.deleteButton}
              onPress={handleDeleteProduct}
              activeOpacity={0.7}
            >
              <Trash2 size={20} color={Colors.error} />
            </TouchableOpacity>
          </View>
        </View>
      </SafeAreaView>

      {/* Product Header */}
      <View style={styles.productHeader}>
        {/* Product Images - Show multiple images if available */}
        {product.productImages && product.productImages.length > 0 ? (
          <ScrollView 
            horizontal 
            showsHorizontalScrollIndicator={false}
            style={styles.productImagesScroll}
            contentContainerStyle={styles.productImagesContainer}
          >
            {product.productImages.map((imageUri: string, index: number) => {
              // Check if this is the barcode image (last image if barcode exists)
              const isBarcodeImage = product.barcode && 
                                    product.barcode.trim().length > 0 && 
                                    index === product.productImages.length - 1 &&
                                    imageUri.startsWith('data:image');
              return (
                <TouchableOpacity
                  key={index}
                  onPress={() => {
                    setSelectedImageIndex(index);
                    setShowImageModal(true);
                    // Scroll to the clicked image after modal opens
                    setTimeout(() => {
                      const screenWidth = Dimensions.get('window').width;
                      imageScrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: false });
                    }, 100);
                  }}
                  activeOpacity={0.8}
                  style={isBarcodeImage ? styles.barcodeImageContainer : undefined}
                >
                  <Image 
                    source={{ uri: imageUri }}
                    style={[
                      styles.productHeaderImage,
                      isBarcodeImage && styles.barcodeImagePreview
                    ]}
                    resizeMode={isBarcodeImage ? 'contain' : 'cover'}
                  />
                </TouchableOpacity>
              );
            })}
          </ScrollView>
        ) : product.image ? (
          <TouchableOpacity
            onPress={() => {
              setSelectedImageIndex(0);
              setShowImageModal(true);
            }}
            activeOpacity={0.8}
          >
        <Image 
          source={{ uri: product.image }}
          style={styles.productHeaderImage}
        />
          </TouchableOpacity>
        ) : (
          <View style={[styles.productHeaderImage, styles.productImagePlaceholder]}>
            <Package size={40} color={Colors.textLight} />
          </View>
        )}
        <View style={styles.productHeaderInfo}>
          <Text style={styles.productHeaderName}>{product.name}</Text>
          <Text style={styles.productHeaderCategory}>{product.category}</Text>
          
          {/* Stock Availability with Info Icon */}
          <View style={styles.stockAvailabilityContainer}>
            <View style={styles.stockAvailabilityTextContainer}>
              <Text style={[
                styles.stockAvailabilityText,
                { color: getUrgencyColor(product.urgencyLevel) }
              ]}>
                Available: {product.currentStock} {product.primaryUnit}s
              </Text>
              {product.secondaryUnit && product.secondaryUnit !== 'None' && (
                <Text style={styles.stockInPiecesText}>
                  ({(() => {
                    // Calculate total in smallest unit (pieces)
                    const conversionRatio = parseFloat(product.conversionRatio || '1');
                    const tertiaryConversionRatio = parseFloat(product.tertiaryConversionRatio || '1');
                    
                    if (product.tertiaryUnit && product.tertiaryUnit !== 'None') {
                      // Three-level: Primary -> Secondary -> Tertiary
                      const totalInTertiary = product.currentStock * conversionRatio * tertiaryConversionRatio;
                      return `${totalInTertiary} ${product.tertiaryUnit}s`;
                    } else {
                      // Two-level: Primary -> Secondary
                      const totalInSecondary = product.currentStock * conversionRatio;
                      return `${totalInSecondary} ${product.secondaryUnit}s`;
                    }
                  })()})
                </Text>
              )}
            </View>
            <TouchableOpacity
              style={styles.stockInfoIcon}
              onPress={() => {
                const stockInfo = product.secondaryUnit && product.secondaryUnit !== 'None' 
                  ? `Stock Calculation:\n\n1 ${product.primaryUnit} = ${product.conversionRatio} ${product.secondaryUnit}s${product.tertiaryUnit && product.tertiaryUnit !== 'None' ? `\n1 ${product.secondaryUnit} = ${product.tertiaryConversionRatio} ${product.tertiaryUnit}s` : ''}\n\nCurrent stock: ${product.currentStock} ${product.primaryUnit}s`
                  : `Stock Calculation:\n\nCurrent stock: ${product.currentStock} ${product.primaryUnit}s\n\nThis product uses a single unit of measurement.`;
                
                Alert.alert('Stock Information', stockInfo, [{ text: 'OK' }]);
              }}
              activeOpacity={0.7}
            >
              <Text style={styles.stockInfoIconText}>ⓘ</Text>
            </TouchableOpacity>
          </View>
          
          <Text style={styles.productHeaderPrice}>{formatPrice(product.salesPrice || 0)}</Text>
          
          <View style={[
            styles.urgencyBadge,
            { backgroundColor: `${getUrgencyColor(product.urgencyLevel)}20` }
          ]}>
            <Text style={[
              styles.urgencyText,
              { color: getUrgencyColor(product.urgencyLevel) }
            ]}>
              {product.urgencyLevel.toUpperCase()} STOCK
            </Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'details' && styles.activeTab
          ]}
          onPress={() => setSelectedTab('details')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'details' && styles.activeTabText
          ]}>
            Product Details
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'inventory' && styles.activeTab
          ]}
          onPress={() => setSelectedTab('inventory')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'inventory' && styles.activeTabText
          ]}>
            Inventory Logs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {selectedTab === 'details' ? (
          <View style={styles.detailsContainer}>
            {/* Product Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Information</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Hash size={16} color={Colors.textLight} />
                  <Text style={styles.detailLabel}>HSN Code:</Text>
                  <Text style={styles.detailValue}>{product.hsnCode}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Scan size={16} color={Colors.textLight} />
                  <Text style={styles.detailLabel}>Barcode:</Text>
                  <Text style={[styles.detailValue, styles.barcodeText]}>
                    {product.barcode}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Package size={16} color={Colors.textLight} />
                  <Text style={styles.detailLabel}>Tax Rate:</Text>
                  <Text style={styles.detailValue}>{product.taxRate || 0}% GST</Text>
                </View>
                
                {product.cessType && product.cessType !== 'none' && product.cessRate && product.cessRate > 0 && (
                  <View style={styles.detailRow}>
                    <BarChart3 size={16} color={Colors.textLight} />
                    <Text style={styles.detailLabel}>CESS:</Text>
                    <Text style={styles.detailValue}>
                      {product.cessType === 'value' ? `${product.cessRate}%` :
                       product.cessType === 'quantity' ? `${product.cessRate}%` :
                       product.cessType === 'value_and_quantity' ? `${product.cessRate}%+₹${product.cessAmount || 0}/${product.cessUnit || product.primaryUnit}` :
                       product.cessType === 'mrp' ? `${product.cessRate}%` : `${product.cessRate}%`}
                    </Text>
                  </View>
                )}
                
                {product.cessType && product.cessType !== 'none' && (
                  <View style={styles.detailRow}>
                    <Percent size={16} color={Colors.textLight} />
                    <Text style={styles.detailLabel}>CESS Type:</Text>
                    <Text style={styles.detailValue}>
                      {product.cessType === 'value' ? 'Based on Value' :
                       product.cessType === 'quantity' ? 'Based on Quantity' :
                       product.cessType === 'value_and_quantity' ? 'Based on Value & Quantity' :
                       product.cessType === 'mrp' ? 'Based on MRP' : 'Not specified'}
                    </Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Building2 size={16} color={Colors.textLight} />
                  <Text style={styles.detailLabel}>Supplier:</Text>
                  <View style={styles.supplierInfoContainer}>
                    <TouchableOpacity
                      style={styles.clickableValue}
                      onPress={() => handleSupplierPress(product.supplier)}
                      activeOpacity={0.7}
                    >
                      <Text 
                        style={[styles.detailValue, styles.clickableText, styles.truncatedText]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {formatSupplierNameForDisplay(getSupplierName(product.supplier))}
                      </Text>
                    </TouchableOpacity>
                    {product.supplier && (
                      <TouchableOpacity
                        style={styles.callButton}
                        onPress={() => handleCallSupplier(product.supplier)}
                        activeOpacity={0.7}
                      >
                        <Phone size={16} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <MapPin size={16} color={Colors.textLight} />
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>{product.location || 'Not specified'}</Text>
                </View>
                
                {product.brand && (
                  <View style={styles.detailRow}>
                    <Package size={16} color={Colors.textLight} />
                    <Text style={styles.detailLabel}>Brand:</Text>
                    <Text style={styles.detailValue}>{product.brand}</Text>
                  </View>
                )}
                
                {product.mrp && (
                  <View style={styles.detailRow}>
                    <IndianRupee size={16} color={Colors.textLight} />
                    <Text style={styles.detailLabel}>MRP:</Text>
                    <Text style={styles.detailValue}>{formatPrice(parseFloat(product.mrp) || 0)}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stock Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stock Management</Text>
              <View style={styles.stockGrid}>
                <View style={styles.stockCard}>
                  <Text style={styles.stockCardLabel}>Min Level</Text>
                  <Text style={styles.stockCardValue}>
                    {product.minStockLevel}
                  </Text>
                  <Text style={styles.stockCardUnit}>{product.primaryUnit || 'units'}</Text>
                </View>
                
                <View style={styles.stockCard}>
                  <Text style={styles.stockCardLabel}>Max Level</Text>
                  <Text style={styles.stockCardValue}>
                    {product.maxStockLevel}
                  </Text>
                  <Text style={styles.stockCardUnit}>{product.primaryUnit || 'units'}</Text>
                </View>
                
                <View style={styles.stockCard}>
                  <Text style={styles.stockCardLabel}>Stock Value</Text>
                  <Text style={[styles.stockCardValue, { color: Colors.success }]}>
                    {formatPrice((product.unitPrice || 0) * product.currentStock)}
                  </Text>
                  <Text style={styles.stockCardUnit}>total</Text>
                </View>
              </View>


            </View>

            {/* Pricing Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pricing Information</Text>
              <View style={styles.pricingGrid}>
                <View style={styles.pricingCard}>
                  <Text style={styles.pricingCardLabel}>Purchase Price</Text>
                  <Text style={[styles.pricingCardValue, { color: Colors.text }]}>
                    {formatPrice(product.unitPrice || 0)}
                  </Text>
                  <Text style={styles.pricingCardUnit}>/{product.primaryUnit || 'unit'}</Text>
                </View>
                
                <View style={styles.pricingCard}>
                  <Text style={styles.pricingCardLabel}>Sale Price</Text>
                  <Text style={[styles.pricingCardValue, { color: Colors.success }]}>
                    {formatPrice(product.salesPrice || 0)}
                  </Text>
                  <Text style={styles.pricingCardUnit}>/{product.primaryUnit || 'unit'}</Text>
                </View>
                
                <View style={styles.pricingCard}>
                  <Text style={styles.pricingCardLabel}>Profit Margin</Text>
                  <Text style={[
                    styles.pricingCardValue,
                    { color: product.salesPrice > (product.unitPrice || 0) ? Colors.success : Colors.error }
                  ]}>
                    {product.unitPrice && product.salesPrice > product.unitPrice 
                      ? `${(((product.salesPrice - product.unitPrice) / product.unitPrice) * 100).toFixed(2)}%`
                      : 'N/A'
                    }
                  </Text>
                  <Text style={styles.pricingCardUnit}>margin</Text>
                </View>
                
                <View style={styles.pricingCard}>
                  <Text style={styles.pricingCardLabel}>GST ({product.taxRate || 0}%)</Text>
                  <Text style={[styles.pricingCardValue, { color: Colors.warning }]}>
                    {formatPrice((product.salesPrice * (product.taxRate || 0)) / 100)}
                  </Text>
                  <Text style={styles.pricingCardUnit}>/{product.primaryUnit || 'unit'}</Text>
                </View>
                
                {product.cessType && product.cessType !== 'none' && (product.cessRate > 0 || (product.cessAmount && parseFloat(product.cessAmount) > 0)) && (
                  <View style={styles.pricingCard}>
                    <Text style={styles.pricingCardLabel}>
                      CESS ({product.cessType === 'value' ? `${product.cessRate}%` :
                             product.cessType === 'quantity' ? `₹${product.cessAmount}/${product.cessUnit || product.primaryUnit}` :
                             product.cessType === 'value_and_quantity' ? `${product.cessRate}%+₹${product.cessAmount}/${product.cessUnit || product.primaryUnit}` :
                             product.cessType === 'mrp' ? `${product.cessRate}%` : 'Applied'})
                    </Text>
                    <Text style={[styles.pricingCardValue, { color: Colors.error }]}>
                      {formatPrice((() => {
                        const basePrice = product.salesPrice || 0;
                        switch (product.cessType) {
                          case 'value':
                            return (basePrice * (product.cessRate || 0)) / 100;
                          case 'quantity':
                            return parseFloat(product.cessAmount || '0');
                          case 'value_and_quantity':
                            const valueCess = (basePrice * (product.cessRate || 0)) / 100;
                            const quantityCess = parseFloat(product.cessAmount || '0');
                            return valueCess + quantityCess;
                          case 'mrp':
                            const mrpPrice = parseFloat(product.mrp || '0');
                            return (mrpPrice * (product.cessRate || 0)) / 100;
                          default:
                            return 0;
                        }
                      })())}
                    </Text>
                    <Text style={styles.pricingCardUnit}>/{product.primaryUnit || 'unit'}</Text>
                  </View>
                )}
              </View>
              
              {/* UoM Price Breakdown */}
              {product.secondaryUnit && product.secondaryUnit !== 'None' && (
                <View style={styles.uomPricingSection}>
                  <Text style={styles.uomPricingTitle}>Unit of Measurement Pricing</Text>
                  <View style={styles.uomPricingGrid}>
                    <View style={styles.uomPricingItem}>
                      <Text style={styles.uomPricingLabel}>Primary ({product.primaryUnit})</Text>
                      <Text style={styles.uomPricingValue}>
                        {formatPrice(product.salesPrice || 0)}/{product.primaryUnit}
                      </Text>
                    </View>
                    {product.secondaryUnit && product.secondaryUnit !== 'None' && (
                      <View style={styles.uomPricingItem}>
                        <Text style={styles.uomPricingLabel}>Secondary ({product.secondaryUnit})</Text>
                        <Text style={styles.uomPricingValue}>
                          {formatPrice((product.salesPrice || 0) / parseFloat(product.conversionRatio || '1'))}/{product.secondaryUnit}
                        </Text>
                      </View>
                    )}
                    {product.tertiaryUnit && product.tertiaryUnit !== 'None' && (
                      <View style={styles.uomPricingItem}>
                        <Text style={styles.uomPricingLabel}>Tertiary ({product.tertiaryUnit})</Text>
                        <Text style={styles.uomPricingValue}>
                          {formatPrice((product.salesPrice || 0) / (parseFloat(product.conversionRatio || '1') * parseFloat(product.tertiaryConversionRatio || '1')))}/{product.tertiaryUnit}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Restock Recommendation */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Restock Recommendation</Text>
              <View style={[
                styles.restockCard,
                { backgroundColor: `${getUrgencyColor(product.urgencyLevel)}10` }
              ]}>
                <View style={styles.restockHeader}>
                  <Package size={24} color={getUrgencyColor(product.urgencyLevel)} />
                  <View style={styles.restockInfo}>
                    <Text style={[
                      styles.restockTitle,
                      { color: getUrgencyColor(product.urgencyLevel) }
                    ]}>
                      {product.urgencyLevel === 'critical' ? 'Urgent Restock Required' :
                       product.urgencyLevel === 'low' ? 'Restock Soon' : 'Consider Restocking'}
                    </Text>
                    <Text style={styles.restockSubtitle}>
                      Recommended order: {product.maxStockLevel - product.currentStock} units
                    </Text>
                  </View>
                </View>
                
                <View style={styles.restockDetails}>
                  <Text style={styles.restockDetailText}>
                    Last restocked: {product.lastRestocked ? formatDate(product.lastRestocked) : 'Never'}
                  </Text>
                  <Text style={styles.restockDetailText}>
                    Estimated cost: {formatPrice((product.maxStockLevel - product.currentStock) * (product.unitPrice || 0) * 0.8)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.inventoryContainer}>
            <View style={styles.inventoryHeader}>
              <Text style={styles.sectionTitle}>Inventory Movement Logs</Text>
              <Text style={styles.inventorySubtitle}>
                Track all stock movements for this product
              </Text>
            </View>

            {/* Location Filter Toggle (only show if multiple locations) */}
            {locationStock.length > 1 && (
              <View style={styles.inventoryControls}>
                <TouchableOpacity
                  style={[styles.controlButton, selectedLocationId && styles.controlButtonActive]}
                  onPress={() => setShowLocationFilterModal(true)}
                  activeOpacity={0.7}
                >
                  <Filter size={18} color={selectedLocationId ? Colors.primary : Colors.textLight} />
                  <Text style={[styles.controlButtonText, selectedLocationId && styles.controlButtonTextActive]}>
                    {selectedLocationId 
                      ? locationStock.find(loc => loc.locationId === selectedLocationId)?.locationName || 'All Locations'
                      : 'All Locations'}
                  </Text>
                  <ChevronDown size={18} color={selectedLocationId ? Colors.primary : Colors.textLight} />
                </TouchableOpacity>
              </View>
            )}

            <View style={styles.inventoryLogs}>
              {loadingLogs ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading inventory logs...</Text>
                </View>
              ) : inventoryLogs.length > 0 ? (
                inventoryLogs.map(renderInventoryLog)
              ) : (
                <View style={styles.emptyLogsContainer}>
                  <Package size={48} color={Colors.textLight} />
                  <Text style={styles.emptyLogsText}>No inventory movements found</Text>
                  <Text style={styles.emptyLogsSubtext}>
                    Stock movements will appear here when products are sold, purchased, or adjusted
                  </Text>
                </View>
              )}
            </View>

            {/* Current Stock Display at Bottom with All UoM */}
            <View style={styles.currentStockContainer}>
              <View style={styles.currentStockHeader}>
                <View style={styles.currentStockHeaderLeft}>
                  <Package size={20} color={Colors.primary} />
                  <Text style={styles.currentStockLabel}>Current Stock</Text>
                </View>
                {/* UoM Dropdown */}
                <TouchableOpacity
                  style={styles.currentStockUoMButton}
                  onPress={() => setShowUoMModal(true)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.currentStockUoMText}>
                    {getUoMLabel()}
                  </Text>
                  <ChevronDown size={16} color={Colors.primary} />
                </TouchableOpacity>
              </View>
              <View style={styles.currentStockContent}>
                <View style={styles.currentStockLeft}>
                  {selectedLocationId && (
                    <Text style={styles.currentStockLocation}>
                      at {locationStock.find(loc => loc.locationId === selectedLocationId)?.locationName || 'Selected Location'}
                    </Text>
                  )}
                  {!selectedLocationId && locationStock.length > 1 && (
                    <Text style={styles.currentStockLocation}>
                      across {locationStock.length} locations
                    </Text>
                  )}
                </View>
                <View style={styles.currentStockUoMValues}>
                  {/* Primary UoM */}
                  <View style={styles.currentStockUoMItem}>
                    <Text style={styles.currentStockUoMLabel}>{product.primaryUnit || 'Piece'}:</Text>
                    <Text style={styles.currentStockUoMValue}>
                      {(() => {
                        const totalStock = selectedLocationId 
                          ? (locationStock.find(loc => loc.locationId === selectedLocationId)?.quantity || 0)
                          : locationStock.reduce((sum, loc) => sum + loc.quantity, 0);
                        return totalStock.toFixed(3);
                      })()}
                    </Text>
                  </View>
                  
                  {/* Secondary UoM (if available) */}
                  {product.useCompoundUnit && product.secondaryUnit && product.secondaryUnit !== 'None' && (
                    <View style={styles.currentStockUoMItem}>
                      <Text style={styles.currentStockUoMLabel}>{product.secondaryUnit}:</Text>
                      <Text style={styles.currentStockUoMValue}>
                        {(() => {
                          const conversionRatio = parseFloat(product.conversionRatio || '1');
                          const totalStock = selectedLocationId 
                            ? (locationStock.find(loc => loc.locationId === selectedLocationId)?.quantity || 0)
                            : locationStock.reduce((sum, loc) => sum + loc.quantity, 0);
                          return (totalStock / conversionRatio).toFixed(3);
                        })()}
                      </Text>
                    </View>
                  )}
                  
                  {/* Tertiary UoM (if available) */}
                  {product.useCompoundUnit && product.tertiaryUnit && product.tertiaryUnit !== 'None' && (
                    <View style={styles.currentStockUoMItem}>
                      <Text style={styles.currentStockUoMLabel}>{product.tertiaryUnit}:</Text>
                      <Text style={styles.currentStockUoMValue}>
                        {(() => {
                          const conversionRatio = parseFloat(product.conversionRatio || '1');
                          const tertiaryRatio = parseFloat(product.tertiaryConversionRatio || '1');
                          const totalStock = selectedLocationId 
                            ? (locationStock.find(loc => loc.locationId === selectedLocationId)?.quantity || 0)
                            : locationStock.reduce((sum, loc) => sum + loc.quantity, 0);
                          return (totalStock / (conversionRatio * tertiaryRatio)).toFixed(3);
                        })()}
                      </Text>
                    </View>
                  )}
                </View>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* UoM Selection Modal */}
      <Modal
        visible={showUoMModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUoMModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit of Measure</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowUoMModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={[styles.modalOption, selectedUoM === 'primary' && styles.selectedOption]}
                onPress={() => {
                  setSelectedUoM('primary');
                  setShowUoMModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.modalOptionContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalOptionText, selectedUoM === 'primary' && styles.selectedOptionText]}>
                      {product.primaryUnit || 'Piece'} (Primary)
                    </Text>
                    <Text style={styles.modalOptionSubtext}>
                      Current Stock: {(() => {
                        const totalStock = selectedLocationId 
                          ? (locationStock.find(loc => loc.locationId === selectedLocationId)?.quantity || 0)
                          : locationStock.reduce((sum, loc) => sum + loc.quantity, 0);
                        return totalStock.toFixed(3);
                      })()} {product.primaryUnit || 'Piece'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              {product.useCompoundUnit && product.secondaryUnit && product.secondaryUnit !== 'None' && (
                <TouchableOpacity
                  style={[styles.modalOption, selectedUoM === 'secondary' && styles.selectedOption]}
                  onPress={() => {
                    setSelectedUoM('secondary');
                    setShowUoMModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionText, selectedUoM === 'secondary' && styles.selectedOptionText]}>
                        {product.secondaryUnit} (Secondary)
                      </Text>
                      <Text style={styles.modalOptionSubtext}>
                        Current Stock: {(() => {
                          const conversionRatio = parseFloat(product.conversionRatio || '1');
                          const totalStock = selectedLocationId 
                            ? (locationStock.find(loc => loc.locationId === selectedLocationId)?.quantity || 0)
                            : locationStock.reduce((sum, loc) => sum + loc.quantity, 0);
                          return (totalStock / conversionRatio).toFixed(3);
                        })()} {product.secondaryUnit}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              
              {product.useCompoundUnit && product.tertiaryUnit && product.tertiaryUnit !== 'None' && (
                <TouchableOpacity
                  style={[styles.modalOption, selectedUoM === 'tertiary' && styles.selectedOption]}
                  onPress={() => {
                    setSelectedUoM('tertiary');
                    setShowUoMModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionText, selectedUoM === 'tertiary' && styles.selectedOptionText]}>
                        {product.tertiaryUnit} (Tertiary)
                      </Text>
                      <Text style={styles.modalOptionSubtext}>
                        Current Stock: {(() => {
                          const conversionRatio = parseFloat(product.conversionRatio || '1');
                          const tertiaryRatio = parseFloat(product.tertiaryConversionRatio || '1');
                          const totalStock = selectedLocationId 
                            ? (locationStock.find(loc => loc.locationId === selectedLocationId)?.quantity || 0)
                            : locationStock.reduce((sum, loc) => sum + loc.quantity, 0);
                          return (totalStock / (conversionRatio * tertiaryRatio)).toFixed(3);
                        })()} {product.tertiaryUnit}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Location Filter Modal */}
      <Modal
        visible={showLocationFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Location</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLocationFilterModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={[styles.modalOption, !selectedLocationId && styles.selectedOption]}
                onPress={() => {
                  setSelectedLocationId(null);
                  setShowLocationFilterModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalOptionText, !selectedLocationId && styles.selectedOptionText]}>
                  All Locations
                </Text>
              </TouchableOpacity>
              
              {locationStock.map((location) => (
                <TouchableOpacity
                  key={location.locationId}
                  style={[styles.modalOption, selectedLocationId === location.locationId && styles.selectedOption]}
                  onPress={() => {
                    setSelectedLocationId(location.locationId);
                    setShowLocationFilterModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionText, selectedLocationId === location.locationId && styles.selectedOptionText]}>
                        {location.locationName}
                      </Text>
                      <Text style={styles.modalOptionSubtext}>
                        {convertQuantity(location.quantity).toFixed(3)} {getUoMLabel()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Product Images Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageModalContainer}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle}>Product Images</Text>
              <TouchableOpacity
                style={styles.imageModalCloseButton}
                onPress={() => setShowImageModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.imageModalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.imageModalContent}>
              <ScrollView 
                ref={imageScrollViewRef}
                horizontal 
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.imageModalScrollView}
                contentContainerStyle={styles.imageModalScrollContent}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
                  setSelectedImageIndex(index);
                }}
              >
                {(product.productImages && product.productImages.length > 0 ? product.productImages : (product.image ? [product.image] : [])).map((imageUri: string, index: number) => {
                  const imageArray = product.productImages && product.productImages.length > 0 ? product.productImages : (product.image ? [product.image] : []);
                  // Check if this is the barcode image (last image if barcode exists)
                  const isBarcodeImage = product.barcode && 
                                        product.barcode.trim().length > 0 && 
                                        index === imageArray.length - 1 &&
                                        imageUri.startsWith('data:image');
                  return (
                    <View key={index} style={[
                      styles.imageModalImageContainer,
                      isBarcodeImage && styles.barcodeModalImageContainer
                    ]}>
                      <Image 
                        source={{ uri: imageUri }}
                        style={[
                          styles.imageModalImage,
                          isBarcodeImage && styles.barcodeModalImage
                        ]}
                        resizeMode="contain"
                      />
                    </View>
                  );
                })}
              </ScrollView>
              
              {/* Navigation Arrows - Show conditionally based on position */}
              {(product.productImages && product.productImages.length > 0 ? product.productImages : (product.image ? [product.image] : [])).length > 1 && (
                <>
                  {/* Left Arrow - Only show if not on first image */}
                  {selectedImageIndex > 0 && (
                    <TouchableOpacity
                      style={[styles.imageModalArrow, styles.imageModalArrowLeft]}
                      onPress={() => {
                        const newIndex = selectedImageIndex - 1;
                        setSelectedImageIndex(newIndex);
                        const screenWidth = Dimensions.get('window').width;
                        imageScrollViewRef.current?.scrollTo({ x: newIndex * screenWidth, animated: true });
                      }}
                      activeOpacity={0.7}
                    >
                      <ChevronLeft size={32} color={Colors.background} />
                    </TouchableOpacity>
                  )}
                  
                  {/* Right Arrow - Only show if not on last image */}
                  {selectedImageIndex < ((product.productImages && product.productImages.length > 0 ? product.productImages : (product.image ? [product.image] : [])).length - 1) && (
                    <TouchableOpacity
                      style={[styles.imageModalArrow, styles.imageModalArrowRight]}
                      onPress={() => {
                        const newIndex = selectedImageIndex + 1;
                        setSelectedImageIndex(newIndex);
                        const screenWidth = Dimensions.get('window').width;
                        imageScrollViewRef.current?.scrollTo({ x: newIndex * screenWidth, animated: true });
                      }}
                      activeOpacity={0.7}
                    >
                      <ChevronRight size={32} color={Colors.background} />
                    </TouchableOpacity>
                  )}
                </>
              )}
            </View>
            
            {/* Image Counter - Always show if more than 1 image */}
            {(() => {
              const imageArray = product.productImages && product.productImages.length > 0 ? product.productImages : (product.image ? [product.image] : []);
              return imageArray.length > 1 ? (
                <View style={styles.imageModalIndicators}>
                  <Text style={styles.imageModalIndicatorText}>
                    {selectedImageIndex + 1} / {imageArray.length}
                  </Text>
                </View>
              ) : null;
            })()}
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteIconContainer}>
                <Trash2 size={32} color={Colors.error} />
              </View>
              <Text style={styles.deleteModalTitle}>Delete Product</Text>
              <Text style={styles.deleteModalSubtitle}>
                Are you sure you want to delete "{product.name}"?
              </Text>
            </View>

            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteWarningText}>
                This action cannot be undone. The following data will be permanently deleted:
              </Text>
              
              <View style={styles.deleteDataList}>
                <View style={styles.deleteDataItem}>
                  <Package size={16} color={Colors.error} />
                  <Text style={styles.deleteDataText}>Product information and specifications</Text>
                </View>
                <View style={styles.deleteDataItem}>
                  <FileText size={16} color={Colors.error} />
                  <Text style={styles.deleteDataText}>All sales invoices containing this product</Text>
                </View>
                <View style={styles.deleteDataItem}>
                  <ShoppingCart size={16} color={Colors.error} />
                  <Text style={styles.deleteDataText}>All purchase invoices containing this product</Text>
                </View>
                <View style={styles.deleteDataItem}>
                  <TrendingUp size={16} color={Colors.error} />
                  <Text style={styles.deleteDataText}>All payment records related to this product</Text>
                </View>
                <View style={styles.deleteDataItem}>
                  <BarChart3 size={16} color={Colors.error} />
                  <Text style={styles.deleteDataText}>Inventory logs and stock history</Text>
                </View>
              </View>

              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelDeleteProduct}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteConfirmButton}
                  onPress={confirmDeleteProduct}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteConfirmButtonText}>Delete Permanently</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  headerSafeArea: {
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
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
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    minWidth: 180,
    justifyContent: 'flex-end',
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: 20,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    borderRadius: 20,
  },
  stockStatus: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 80,
  },
  productHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  productImagesScroll: {
    maxHeight: 80,
    marginRight: 16,
  },
  productImagesContainer: {
    flexDirection: 'row',
    gap: 8,
  },
  productHeaderImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
  },
  productImagePlaceholder: {
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  productHeaderInfo: {
    flex: 1,
  },
  productHeaderName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  productHeaderCategory: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  productHeaderPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 12,
  },
  urgencyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  detailsContainer: {
    gap: 24,
  },
  section: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  detailsGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  clickableValue: {
    flex: 1,
  },
  clickableText: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  supplierInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'flex-start',
  },
  callButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
    flexShrink: 0,
    marginLeft: 'auto',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  truncatedText: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    minHeight: 36, // Ensure consistent height for 2 lines
  },
  barcodeText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  stockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stockCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  stockCardLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  stockCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  stockCardUnit: {
    fontSize: 12,
    color: Colors.textLight,
  },
  
  // Pricing Information Styles
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  pricingCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    minWidth: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  pricingCardLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  pricingCardValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  pricingCardUnit: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
  },
  uomPricingSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  uomPricingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  uomPricingGrid: {
    gap: 8,
  },
  uomPricingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  uomPricingLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  uomPricingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
  
  restockCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  restockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  restockInfo: {
    flex: 1,
    marginLeft: 12,
  },
  restockTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  restockSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
  },
  restockDetails: {
    gap: 4,
  },
  restockDetailText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  inventoryContainer: {
    flex: 1,
  },
  inventoryHeader: {
    marginBottom: 20,
  },
  inventorySubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  inventoryControls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    gap: 8,
  },
  controlButtonActive: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  controlButtonTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  currentStockContainer: {
    marginTop: 20,
    padding: 16,
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  currentStockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  currentStockLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  currentStockUoMButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  currentStockUoMText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  currentStockContent: {
    gap: 16,
  },
  currentStockLeft: {
    marginBottom: 4,
  },
  currentStockUoMValues: {
    gap: 8,
    alignItems: 'flex-end',
  },
  currentStockUoMItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  currentStockUoMLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  currentStockUoMValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 80,
    textAlign: 'right',
  },
  currentStockLocation: {
    fontSize: 12,
    color: Colors.textLight,
  },
  currentStockHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  inventoryLogs: {
    gap: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 12,
  },
  emptyLogsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLogsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyLogsSubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  logCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  logInfo: {
    flex: 1,
  },
  logType: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  logDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  logRight: {
    alignItems: 'flex-end',
  },
  logQuantity: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  logBalance: {
    fontSize: 12,
    color: Colors.textLight,
  },
  logDetails: {
    gap: 4,
    marginBottom: 8,
  },
  logDetailText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  viewInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  viewInvoiceText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  
  // Modal Styles
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 18,
    color: Colors.textLight,
    fontWeight: '600',
  },
  modalContent: {
    maxHeight: 400,
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  selectedOption: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  modalOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  selectedOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  
  // Delete Modal Styles
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  deleteModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    marginHorizontal: 20,
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
  deleteModalHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  deleteIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteModalContent: {
    padding: 24,
  },
  deleteWarningText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteDataList: {
    gap: 12,
    marginBottom: 24,
  },
  deleteDataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteDataText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  deleteModalActions: {
    flexDirection: 'column',
    gap: 16,
    alignItems: 'stretch',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  deleteConfirmButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
  

  
  // Stock Availability Header Styles
  stockAvailabilityContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  stockAvailabilityTextContainer: {
    flex: 1,
  },
  stockAvailabilityText: {
    fontSize: 16,
    fontWeight: '600',
  },
  stockInPiecesText: {
    fontSize: 13,
    color: Colors.textLight,
    fontStyle: 'italic',
    marginTop: 2,
  },
  stockInfoIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockInfoIconText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.background,
  },
  // Image Modal Styles
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.9)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalContainer: {
    width: '100%',
    height: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageModalContent: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  imageModalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    zIndex: 10,
  },
  imageModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.background,
  },
  imageModalCloseButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalCloseText: {
    fontSize: 20,
    color: Colors.background,
    fontWeight: '600',
  },
  imageModalScrollView: {
    flex: 1,
    width: Dimensions.get('window').width,
  },
  imageModalScrollContent: {
    alignItems: 'center',
  },
  imageModalImageContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalImage: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height,
  },
  barcodeImageContainer: {
    backgroundColor: Colors.grey[50],
    padding: 12,
    borderRadius: 12,
  },
  barcodeImagePreview: {
    backgroundColor: Colors.background,
    padding: 8,
  },
  barcodeModalImageContainer: {
    backgroundColor: Colors.grey[50],
    padding: 24,
  },
  barcodeModalImage: {
    backgroundColor: Colors.background,
    padding: 16,
  },
  imageModalIndicators: {
    position: 'absolute',
    bottom: 40,
    left: 0,
    right: 0,
    alignItems: 'center',
    zIndex: 10,
  },
  imageModalIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
  },
  imageModalArrow: {
    position: 'absolute',
    top: '50%',
    transform: [{ translateY: -20 }],
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 20,
  },
  imageModalArrowLeft: {
    left: 20,
  },
  imageModalArrowRight: {
    right: 20,
  },
  imageModalArrowDisabled: {
    opacity: 0.3,
  },
});