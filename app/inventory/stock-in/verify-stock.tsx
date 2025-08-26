import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Search,
  Package,
  Check,
  AlertTriangle,
  Camera,
  X,
  Send,
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

interface POProduct {
  id: string;
  name: string;
  billedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'received' | 'partial' | 'excess';
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierGSTIN: string;
  orderDate: string;
  expectedDelivery: string;
  totalAmount: number;
  status: 'pending' | 'partial' | 'received';
  products: POProduct[];
}

export default function VerifyStockScreen() {
  const { poData, invoiceNumber, invoiceDate, ewayBillNumber, vehicleNumber, vehicleType } = useLocalSearchParams();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showProductModal, setShowProductModal] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<POProduct | null>(null);
  const [receivedQuantity, setReceivedQuantity] = useState('');
  const [hasDiscrepancies, setHasDiscrepancies] = useState(false);
  const [allQuantitiesMatch, setAllQuantitiesMatch] = useState(false);

  useEffect(() => {
    if (poData) {
      try {
        const parsedPO = JSON.parse(poData as string);
        setPo(parsedPO);
        
        // Check for discrepancies
        const hasDiscrepancies = parsedPO.products.some((product: POProduct) => 
          product.receivedQuantity !== product.billedQuantity
        );
        setHasDiscrepancies(hasDiscrepancies);

        // Check if all quantities match
        const allMatch = parsedPO.products.every((product: POProduct) => 
          product.receivedQuantity === product.billedQuantity
        );
        setAllQuantitiesMatch(allMatch);
      } catch (error) {
        console.error('Error parsing PO data:', error);
        Alert.alert('Error', 'Invalid PO data');
        router.back();
      }
    }
  }, [poData]);

  const handleProductSelect = (product: POProduct) => {
    setSelectedProduct(product);
    setReceivedQuantity(product.receivedQuantity > 0 ? product.receivedQuantity.toString() : '');
    setShowProductModal(true);
  };

  const handleQuantityUpdate = () => {
    if (!selectedProduct || !receivedQuantity) return;

    const received = parseInt(receivedQuantity);
    const billed = selectedProduct.billedQuantity;
    let status: 'pending' | 'received' | 'partial' | 'excess' = 'pending';

    if (received === billed) {
      status = 'received';
    } else if (received > billed) {
      status = 'excess';
    } else if (received > 0) {
      status = 'partial';
    }

    // Update the product in the PO
    if (po) {
      const updatedProducts = po.products.map(p => 
        p.id === selectedProduct.id 
          ? { ...p, receivedQuantity: received, status }
          : p
      );
      
      const updatedPO = { ...po, products: updatedProducts };
      setPo(updatedPO);
      
          // Check for discrepancies
    const hasDiscrepancies = updatedProducts.some(p => 
      p.receivedQuantity !== p.billedQuantity
    );
    setHasDiscrepancies(hasDiscrepancies);

    // Check if all quantities match
    const allMatch = updatedProducts.every(p => 
      p.receivedQuantity === p.billedQuantity
    );
    setAllQuantitiesMatch(allMatch);
    }

    setShowProductModal(false);
    setSelectedProduct(null);
    setReceivedQuantity('');
  };

  const handleScanBarcode = () => {
    // Navigate to barcode scanner
    router.push('/inventory/scan-product');
  };

  const handleReportDiscrepancy = () => {
    if (!po) return;
    
    router.push({
      pathname: '/inventory/stock-in/discrepancy-report',
      params: {
        poData: JSON.stringify(po)
      }
    });
  };

  const handleRecordStockIn = () => {
    if (!po) return;
    
    // Navigate to confirmation page
    router.push({
      pathname: '/inventory/stock-in/stock-confirmation',
      params: {
        poData: JSON.stringify(po),
        invoiceNumber: invoiceNumber as string,
        invoiceDate: invoiceDate as string,
        ewayBillNumber: ewayBillNumber as string,
        vehicleNumber: vehicleNumber as string,
        vehicleType: vehicleType as string,
      }
    });
  };

  const filteredProducts = po?.products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase())
  ) || [];

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'received':
        return Colors.success;
      case 'partial':
        return Colors.warning;
      case 'excess':
        return Colors.error;
      case 'pending':
        return Colors.textLight;
      default:
        return Colors.textLight;
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'received':
        return 'Received';
      case 'partial':
        return 'Partial';
      case 'excess':
        return 'Excess';
      case 'pending':
        return 'Pending';
      default:
        return status;
    }
  };

  if (!po) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.header}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={Colors.text} />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Verify Stock</Text>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading PO data...</Text>
          </View>
        </SafeAreaView>
      </View>
    );
  }

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
          
          <Text style={styles.headerTitle}>Verify Stock</Text>
        </View>

        <View style={styles.content}>
          {/* PO Info */}
          <View style={styles.poInfoCard}>
            <Text style={styles.poNumber}>{po.poNumber}</Text>
            <Text style={styles.supplierName}>{po.supplierName}</Text>
            <Text style={styles.poDetails}>
              Order Date: {po.orderDate} | Expected: {po.expectedDelivery}
            </Text>
            {invoiceNumber && (
              <View style={styles.invoiceInfo}>
                <View style={styles.invoiceLeftColumn}>
                  <View style={styles.invoiceRow}>
                    <Text style={styles.invoiceLabel}>Invoice Number:</Text>
                    <Text style={styles.invoiceValue}>{invoiceNumber}</Text>
                  </View>
                  {invoiceDate && (
                    <View style={styles.invoiceRow}>
                      <Text style={styles.invoiceLabel}>Invoice Date:</Text>
                      <Text style={styles.invoiceValue}>{invoiceDate}</Text>
                    </View>
                  )}
                </View>
                {(ewayBillNumber || vehicleNumber) && (
                  <View style={styles.invoiceRightColumn}>
                    {ewayBillNumber && (
                      <View style={styles.invoiceRow}>
                        <Text style={styles.invoiceLabel}>E-way Bill:</Text>
                        <Text style={styles.invoiceValue}>{ewayBillNumber}</Text>
                      </View>
                    )}
                    {vehicleNumber && (
                      <View style={styles.invoiceRow}>
                        <Text style={styles.invoiceLabel}>Vehicle:</Text>
                        <Text style={styles.invoiceValue}>
                          {vehicleNumber}
                          {vehicleType && ` (${vehicleType})`}
                        </Text>
                      </View>
                    )}
                  </View>
                )}
              </View>
            )}
          </View>

          {/* Search Bar */}
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

          {/* Products List */}
          <ScrollView style={styles.productsList} showsVerticalScrollIndicator={false}>
            {filteredProducts.map((product) => (
              <TouchableOpacity
                key={product.id}
                style={styles.productCard}
                onPress={() => handleProductSelect(product)}
                activeOpacity={0.8}
              >
                <View style={styles.productHeader}>
                  <View style={styles.productInfo}>
                    <Package size={20} color={Colors.primary} />
                    <Text style={styles.productName}>{product.name}</Text>
                  </View>
                  <View style={[
                    styles.statusBadge,
                    { backgroundColor: getStatusColor(product.status) + '20' }
                  ]}>
                    <Text style={[
                      styles.statusText,
                      { color: getStatusColor(product.status) }
                    ]}>
                      {getStatusText(product.status)}
                    </Text>
                  </View>
                </View>

                <View style={styles.productDetails}>
                  <View style={styles.quantityRow}>
                    <Text style={styles.quantityLabel}>Billed:</Text>
                    <Text style={styles.quantityValue}>{product.billedQuantity}</Text>
                  </View>
                  <View style={styles.quantityRow}>
                    <Text style={styles.quantityLabel}>Received:</Text>
                    <Text style={[
                      styles.quantityValue,
                      { color: getStatusColor(product.status) }
                    ]}>
                      {product.receivedQuantity}
                    </Text>
                  </View>
                  {product.receivedQuantity !== product.billedQuantity && (
                    <View style={styles.differenceRow}>
                      <Text style={styles.differenceLabel}>Difference:</Text>
                      <Text style={[
                        styles.differenceValue,
                        { color: product.receivedQuantity > product.billedQuantity ? Colors.error : Colors.warning }
                      ]}>
                        {product.receivedQuantity > product.billedQuantity ? '+' : ''}
                        {product.receivedQuantity - product.billedQuantity}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            ))}
          </ScrollView>

        </View>

        {/* Floating Action Buttons */}
        {allQuantitiesMatch ? (
          <View style={styles.floatingButtonContainer}>
            <TouchableOpacity
              style={styles.recordStockInButton}
              onPress={handleRecordStockIn}
              activeOpacity={0.8}
            >
              <Check size={20} color={Colors.background} />
              <Text style={styles.recordStockInButtonText}>Record Stock In</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <View style={styles.floatingButtonsContainer}>
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScanBarcode}
              activeOpacity={0.8}
            >
              <Camera size={20} color={Colors.background} />
              <Text style={styles.scanButtonText}>Scan Barcode</Text>
            </TouchableOpacity>

            {hasDiscrepancies && (
              <TouchableOpacity
                style={styles.reportButton}
                onPress={handleReportDiscrepancy}
                activeOpacity={0.8}
              >
                <AlertTriangle size={18} color={Colors.error} />
                <Text style={styles.reportButtonText}>Report Issues</Text>
              </TouchableOpacity>
            )}
          </View>
        )}

        {/* Quantity Update Modal */}
        <Modal
          visible={showProductModal}
          transparent
          animationType="fade"
          onRequestClose={() => setShowProductModal(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Update Received Quantity</Text>
                <TouchableOpacity
                  onPress={() => setShowProductModal(false)}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.textLight} />
                </TouchableOpacity>
              </View>
              
              <View style={styles.modalContent}>
                {selectedProduct && (
                  <>
                    <Text style={styles.modalProductName}>{selectedProduct.name}</Text>
                    <Text style={styles.modalBilledQuantity}>
                      Billed Quantity: {selectedProduct.billedQuantity}
                    </Text>
                    
                    <View style={styles.quantityInputContainer}>
                      <Text style={styles.quantityInputLabel}>Received Quantity:</Text>
                      <TextInput
                        style={styles.quantityInput}
                        value={receivedQuantity}
                        onChangeText={(text) => {
                          // Auto-remove "0" if it's the only character and user is typing
                          if (receivedQuantity === '0' && text.length > 1) {
                            setReceivedQuantity(text.substring(1));
                          } else {
                            setReceivedQuantity(text);
                          }
                        }}
                        placeholder="0"
                        placeholderTextColor={Colors.textLight}
                        keyboardType="numeric"
                        autoFocus
                      />
                    </View>
                    
                    <TouchableOpacity
                      style={styles.updateButton}
                      onPress={handleQuantityUpdate}
                      activeOpacity={0.8}
                    >
                      <Check size={20} color={Colors.background} />
                      <Text style={styles.updateButtonText}>Update Quantity</Text>
                    </TouchableOpacity>
                  </>
                )}
              </View>
            </View>
          </View>
        </Modal>
      </SafeAreaView>
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
    borderRadius: 20,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  poInfoCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    marginBottom: 20,
  },
  poNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  supplierName: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  poDetails: {
    fontSize: 12,
    color: Colors.textLight,
  },
  invoiceInfo: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  invoiceLeftColumn: {
    flex: 1,
  },
  invoiceRightColumn: {
    flex: 1,
    marginLeft: 16,
  },
  invoiceRow: {
    marginBottom: 4,
  },
  invoiceLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '600',
  },
  invoiceValue: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
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
    marginBottom: 20,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  productsList: {
    flex: 1,
  },
  productCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  statusText: {
    fontSize: 12,
    fontWeight: '600',
  },
  productDetails: {
    gap: 8,
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  quantityLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  quantityValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  differenceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  differenceLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  differenceValue: {
    fontSize: 14,
    fontWeight: '600',
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
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
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  recordStockInButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  recordStockInButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  scanButton: {
    flex: 1,
    backgroundColor: Colors.primary,
    borderRadius: 25,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  scanButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  reportButton: {
    flex: 1,
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.error,
    borderRadius: 25,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  reportButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
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
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  modalBilledQuantity: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
  },
  quantityInputContainer: {
    marginBottom: 20,
  },
  quantityInputLabel: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 8,
  },
  quantityInput: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  updateButton: {
    backgroundColor: Colors.success,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  updateButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
}); 