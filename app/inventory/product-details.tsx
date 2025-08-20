import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { dataStore } from '@/utils/dataStore';
import { productStore } from '@/utils/productStore';
import { ArrowLeft, Package, ChartBar as BarChart3, Hash, Scan, Building2, MapPin, Calendar, TrendingUp, TrendingDown, ShoppingCart, FileText, Eye, Plus, Minus, Trash2, Percent, IndianRupee, Edit3, Phone } from 'lucide-react-native';

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
  type: 'sale' | 'purchase' | 'return' | 'adjustment';
  invoiceNumber?: string;
  quantity: number;
  date: string;
  staffName: string;
  customerName?: string;
  supplierName?: string;
  reason?: string;
  balanceAfter: number;
}

const mockInventoryLogs: InventoryLog[] = [
  {
    id: '1',
    type: 'sale',
    invoiceNumber: 'INV-2024-001',
    quantity: -2,
    date: '2024-01-15',
    staffName: 'Priya Sharma',
    customerName: 'Rajesh Kumar',
    balanceAfter: 3
  },
  {
    id: '2',
    type: 'sale',
    invoiceNumber: 'INV-2024-003',
    quantity: -1,
    date: '2024-01-13',
    staffName: 'Priya Sharma',
    customerName: 'Sunita Devi',
    balanceAfter: 5
  },
  {
    id: '3',
    type: 'purchase',
    invoiceNumber: 'PUR-2024-005',
    quantity: 10,
    date: '2024-01-10',
    staffName: 'Amit Singh',
    supplierName: 'Apple India Pvt Ltd',
    balanceAfter: 6
  },
  {
    id: '4',
    type: 'return',
    invoiceNumber: 'RET-2024-001',
    quantity: 1,
    date: '2024-01-16',
    staffName: 'Priya Sharma',
    customerName: 'Rajesh Kumar',
    reason: 'Defective product',
    balanceAfter: 4
  },
  {
    id: '5',
    type: 'adjustment',
    quantity: -1,
    date: '2024-01-12',
    staffName: 'Amit Singh',
    reason: 'Damaged during handling',
    balanceAfter: 5
  },
];

export default function ProductDetailsScreen() {
  const { productId, productData } = useLocalSearchParams();
  const product = JSON.parse(productData as string);
  const [selectedTab, setSelectedTab] = useState<'details' | 'inventory'>('details');
  const [showDeleteModal, setShowDeleteModal] = useState(false);

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
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
      case 'sale': return Colors.error;
      case 'purchase': return Colors.success;
      case 'return': return Colors.warning;
      case 'adjustment': return Colors.primary;
      default: return Colors.textLight;
    }
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return ShoppingCart;
      case 'purchase': return Plus;
      case 'return': return TrendingUp;
      case 'adjustment': return Package;
      default: return Package;
    }
  };

  const getLogTypeText = (type: string) => {
    switch (type) {
      case 'sale': return 'Sale';
      case 'purchase': return 'Purchase';
      case 'return': return 'Return';
      case 'adjustment': return 'Adjustment';
      default: return type;
    }
  };

  const handleLogPress = (log: InventoryLog) => {
    if (log.invoiceNumber) {
      // Create mock invoice data for navigation
      const mockInvoice = {
        id: log.invoiceNumber.replace(/[A-Z-]/g, ''),
        invoiceNumber: log.invoiceNumber,
        customerName: log.customerName || log.supplierName || 'N/A',
        customerType: 'individual',
        staffName: log.staffName,
        staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
        paymentStatus: 'paid',
        amount: Math.abs(log.quantity) * (product.salesPrice || 0),
        itemCount: Math.abs(log.quantity),
        date: log.date,
        customerDetails: {
          name: log.customerName || log.supplierName || 'N/A',
          mobile: '+91 98765 43210',
          address: '123, Sample Address, City - 560001'
        }
      };

      if (log.type === 'return') {
        // Navigate to return details
        const returnInvoice = {
          id: log.invoiceNumber.replace('RET-', ''),
          returnNumber: log.invoiceNumber,
          originalInvoiceNumber: 'INV-2024-001',
          customerName: log.customerName || 'N/A',
          customerType: 'individual',
          staffName: log.staffName,
          staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
          refundStatus: 'refunded',
          amount: Math.abs(log.quantity) * (product.salesPrice || 0),
          itemCount: Math.abs(log.quantity),
          date: log.date,
          reason: log.reason || 'Customer return',
          customerDetails: {
            name: log.customerName || 'N/A',
            mobile: '+91 98765 43210',
            address: '123, Sample Address, City - 560001'
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
            invoiceId: mockInvoice.id,
            invoiceData: JSON.stringify(mockInvoice)
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
              {log.quantity > 0 ? '+' : ''}{log.quantity}
            </Text>
            <Text style={styles.logBalance}>
              Bal: {log.balanceAfter}
            </Text>
          </View>
        </View>

        <View style={styles.logDetails}>
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
            onPress={() => router.back()}
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
        <Image 
          source={{ uri: product.image }}
          style={styles.productHeaderImage}
        />
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
                    {product.supplier && (
                      <TouchableOpacity
                        style={styles.callButton}
                        onPress={() => handleCallSupplier(product.supplier)}
                        activeOpacity={0.7}
                      >
                        <Phone size={16} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
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
                  <Text style={styles.stockCardUnit}>units</Text>
                </View>
                
                <View style={styles.stockCard}>
                  <Text style={styles.stockCardLabel}>Max Level</Text>
                  <Text style={styles.stockCardValue}>
                    {product.maxStockLevel}
                  </Text>
                  <Text style={styles.stockCardUnit}>units</Text>
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
                    Last restocked: {formatDate(product.lastRestocked)}
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

            <View style={styles.inventoryLogs}>
              {mockInventoryLogs.map(renderInventoryLog)}
            </View>
          </View>
        )}
      </ScrollView>

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
  productHeaderImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
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
    alignItems: 'flex-start', // Align to top for multi-line text
    flex: 1,
    gap: 8,
    justifyContent: 'flex-end',
    paddingTop: 2, // Small top padding for visual balance
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
    marginLeft: 4,
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
  inventoryLogs: {
    gap: 12,
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
});