import React, { useState, useEffect } from 'react';
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
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
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
  Camera,
  Ruler,
  ChevronDown,
  Edit,
  User,
  Calendar,
  Truck,
} from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

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

const gstRates = [0, 5, 12, 18, 28];

interface PurchaseInvoiceProduct {
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
  conversionFactor: number;
  hsnCode: string;
  description: string;
  category: string;
  brand: string;
  supplier: string;
}

interface Supplier {
  id: string;
  name: string;
  gstin: string;
  type: 'business' | 'individual';
  businessName?: string;
  address: string;
  phone: string;
  email: string;
}

const mockSuppliers: Supplier[] = [
  {
    id: '1',
    name: 'Apple India Pvt Ltd',
    gstin: '29ABCDE1234F2Z6',
    type: 'business',
    businessName: 'Apple India Pvt Ltd',
    address: '123 Business Park, Mumbai, Maharashtra 400001',
    phone: '+91 9876543210',
    email: 'contact@apple.in'
  },
  {
    id: '2',
    name: 'Samsung Electronics',
    gstin: '27FGHIJ5678K3L9',
    type: 'business',
    businessName: 'Samsung Electronics India Pvt Ltd',
    address: '456 Tech Hub, Bangalore, Karnataka 560001',
    phone: '+91 9876543211',
    email: 'contact@samsung.in'
  }
];

export default function AddPurchaseInvoiceScreen() {
  const [products, setProducts] = useState<PurchaseInvoiceProduct[]>([]);
  const [selectedSupplier, setSelectedSupplier] = useState<Supplier | null>(null);
  const [showSupplierModal, setShowSupplierModal] = useState(false);
  const [supplierSearchQuery, setSupplierSearchQuery] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState(new Date().toISOString().split('T')[0]);
  const [poNumber, setPoNumber] = useState('');
  const [deliveryDate, setDeliveryDate] = useState('');
  const [notes, setNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const filteredSuppliers = mockSuppliers.filter(supplier =>
    supplier.name.toLowerCase().includes(supplierSearchQuery.toLowerCase()) ||
    supplier.gstin.toLowerCase().includes(supplierSearchQuery.toLowerCase())
  );

  const addNewProduct = () => {
    const newProduct: PurchaseInvoiceProduct = {
      id: Date.now().toString(),
      name: '',
      barcode: '',
      quantity: 1,
      purchasePrice: 0,
      discount: 0,
      totalPrice: 0,
      isNewProduct: true,
      gstRate: 18,
      cessRate: 0,
      cessType: 'none',
      cessAmount: 0,
      primaryUnit: 'Piece',
      secondaryUnit: 'None',
      useCompoundUnit: false,
      conversionFactor: 1,
      hsnCode: '',
      description: '',
      category: '',
      brand: '',
      supplier: selectedSupplier?.name || '',
    };
    setProducts([...products, newProduct]);
  };

  const updateProduct = (id: string, field: keyof PurchaseInvoiceProduct, value: any) => {
    setProducts(products.map(product => {
      if (product.id === id) {
        const updatedProduct = { ...product, [field]: value };
        
        // Recalculate total price
        if (field === 'quantity' || field === 'purchasePrice' || field === 'discount') {
          const quantity = field === 'quantity' ? value : updatedProduct.quantity;
          const price = field === 'purchasePrice' ? value : updatedProduct.purchasePrice;
          const discount = field === 'discount' ? value : updatedProduct.discount;
          
          updatedProduct.totalPrice = quantity * price * (1 - discount / 100);
        }
        
        return updatedProduct;
      }
      return product;
    }));
  };

  const removeProduct = (id: string) => {
    setProducts(products.filter(product => product.id !== id));
  };

  const calculateTotals = () => {
    const subtotal = products.reduce((sum, product) => sum + product.totalPrice, 0);
    const totalGST = products.reduce((sum, product) => {
      return sum + (product.totalPrice * product.gstRate / 100);
    }, 0);
    const totalCess = products.reduce((sum, product) => sum + product.cessAmount, 0);
    const total = subtotal + totalGST + totalCess;
    
    return { subtotal, totalGST, totalCess, total };
  };

  const handleSubmit = async () => {
    if (!selectedSupplier) {
      Alert.alert('Error', 'Please select a supplier');
      return;
    }
    
    if (products.length === 0) {
      Alert.alert('Error', 'Please add at least one product');
      return;
    }
    
    if (!invoiceNumber.trim()) {
      Alert.alert('Error', 'Please enter invoice number');
      return;
    }

    setIsSubmitting(true);
    
    try {
      // Simulate API call
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      Alert.alert(
        'Success',
        'Purchase invoice added successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back()
          }
        ]
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to add purchase invoice. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const totals = calculateTotals();

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
          
          <Text style={styles.headerTitle}>Add Purchase Invoice</Text>
        </View>

        <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
          {/* Supplier Selection */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supplier Details</Text>
            <TouchableOpacity
              style={styles.supplierSelector}
              onPress={() => setShowSupplierModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.supplierInfo}>
                <Building2 size={20} color={Colors.primary} />
                <View style={styles.supplierDetails}>
                  {selectedSupplier ? (
                    <>
                      <Text style={styles.supplierName}>{selectedSupplier.name}</Text>
                      <Text style={styles.supplierGstin}>GSTIN: {selectedSupplier.gstin}</Text>
                    </>
                  ) : (
                    <Text style={styles.placeholderText}>Select Supplier</Text>
                  )}
                </View>
              </View>
              <ChevronDown size={20} color={Colors.textLight} />
            </TouchableOpacity>
          </View>

          {/* Invoice Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Invoice Number *</Text>
                <TextInput
                  style={styles.input}
                  value={invoiceNumber}
                  onChangeText={setInvoiceNumber}
                  placeholder="Enter invoice number"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Invoice Date</Text>
                <TextInput
                  style={styles.input}
                  value={invoiceDate}
                  onChangeText={setInvoiceDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
            <View style={styles.formRow}>
              <View style={styles.formGroup}>
                <Text style={styles.label}>PO Number</Text>
                <TextInput
                  style={styles.input}
                  value={poNumber}
                  onChangeText={setPoNumber}
                  placeholder="Enter PO number"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
              <View style={styles.formGroup}>
                <Text style={styles.label}>Delivery Date</Text>
                <TextInput
                  style={styles.input}
                  value={deliveryDate}
                  onChangeText={setDeliveryDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textLight}
                />
              </View>
            </View>
          </View>

          {/* Products Section */}
          <View style={styles.section}>
            <View style={styles.sectionHeader}>
              <Text style={styles.sectionTitle}>Products</Text>
              <TouchableOpacity
                style={styles.addButton}
                onPress={addNewProduct}
                activeOpacity={0.7}
              >
                <Plus size={16} color={Colors.primary} />
                <Text style={styles.addButtonText}>Add Product</Text>
              </TouchableOpacity>
            </View>

            {products.map((product, index) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <Text style={styles.productNumber}>Product {index + 1}</Text>
                  <TouchableOpacity
                    onPress={() => removeProduct(product.id)}
                    style={styles.removeButton}
                  >
                    <X size={16} color={Colors.error} />
                  </TouchableOpacity>
                </View>

                <View style={styles.formRow}>
                  <View style={[styles.formGroup, { flex: 2 }]}>
                    <Text style={styles.label}>Product Name *</Text>
                    <TextInput
                      style={styles.input}
                      value={product.name}
                      onChangeText={(value) => updateProduct(product.id, 'name', value)}
                      placeholder="Enter product name"
                      placeholderTextColor={Colors.textLight}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Barcode</Text>
                    <TextInput
                      style={styles.input}
                      value={product.barcode}
                      onChangeText={(value) => updateProduct(product.id, 'barcode', value)}
                      placeholder="Scan or enter"
                      placeholderTextColor={Colors.textLight}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Quantity *</Text>
                    <TextInput
                      style={styles.input}
                      value={product.quantity.toString()}
                      onChangeText={(value) => updateProduct(product.id, 'quantity', parseFloat(value) || 0)}
                      placeholder="0"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.textLight}
                    />
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Unit</Text>
                    <View style={styles.unitSelector}>
                      <Text style={styles.unitText}>{product.primaryUnit}</Text>
                      <ChevronDown size={16} color={Colors.textLight} />
                    </View>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>Price *</Text>
                    <TextInput
                      style={styles.input}
                      value={product.purchasePrice.toString()}
                      onChangeText={(value) => updateProduct(product.id, 'purchasePrice', parseFloat(value) || 0)}
                      placeholder="0.00"
                      keyboardType="numeric"
                      placeholderTextColor={Colors.textLight}
                    />
                  </View>
                </View>

                <View style={styles.formRow}>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>GST Rate (%)</Text>
                    <View style={styles.gstSelector}>
                      <Text style={styles.gstText}>{product.gstRate}%</Text>
                      <ChevronDown size={16} color={Colors.textLight} />
                    </View>
                  </View>
                  <View style={styles.formGroup}>
                    <Text style={styles.label}>HSN Code</Text>
                    <TextInput
                      style={styles.input}
                      value={product.hsnCode}
                      onChangeText={(value) => updateProduct(product.id, 'hsnCode', value)}
                      placeholder="Enter HSN code"
                      placeholderTextColor={Colors.textLight}
                    />
                  </View>
                </View>

                <View style={styles.productTotal}>
                  <Text style={styles.totalLabel}>Total: </Text>
                  <Text style={styles.totalAmount}>₹{product.totalPrice.toFixed(2)}</Text>
                </View>
              </View>
            ))}
          </View>

          {/* Totals Section */}
          {products.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Invoice Summary</Text>
              <View style={styles.totalsCard}>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Subtotal:</Text>
                  <Text style={styles.totalAmount}>₹{totals.subtotal.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>GST:</Text>
                  <Text style={styles.totalAmount}>₹{totals.totalGST.toFixed(2)}</Text>
                </View>
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>CESS:</Text>
                  <Text style={styles.totalAmount}>₹{totals.totalCess.toFixed(2)}</Text>
                </View>
                <View style={[styles.totalRow, styles.grandTotalRow]}>
                  <Text style={styles.grandTotalLabel}>Grand Total:</Text>
                  <Text style={styles.grandTotalAmount}>₹{totals.total.toFixed(2)}</Text>
                </View>
              </View>
            </View>
          )}

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes</Text>
            <TextInput
              style={[styles.input, styles.textArea]}
              value={notes}
              onChangeText={setNotes}
              placeholder="Add any additional notes..."
              placeholderTextColor={Colors.textLight}
              multiline
              numberOfLines={3}
            />
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <TouchableOpacity
              style={[styles.submitButton, isSubmitting && styles.submitButtonDisabled]}
              onPress={handleSubmit}
              disabled={isSubmitting}
              activeOpacity={0.8}
            >
              <Text style={styles.submitButtonText}>
                {isSubmitting ? 'Adding Invoice...' : 'Add Purchase Invoice'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Supplier Selection Modal */}
        <Modal
          visible={showSupplierModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Supplier</Text>
              <TouchableOpacity
                onPress={() => setShowSupplierModal(false)}
                style={styles.closeButton}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <View style={styles.searchContainer}>
              <View style={styles.searchBar}>
                <Search size={20} color={Colors.textLight} />
                <TextInput
                  style={styles.searchInput}
                  placeholder="Search suppliers..."
                  placeholderTextColor={Colors.textLight}
                  value={supplierSearchQuery}
                  onChangeText={setSupplierSearchQuery}
                />
              </View>
            </View>

            <ScrollView style={styles.supplierList}>
              {filteredSuppliers.map((supplier) => (
                <TouchableOpacity
                  key={supplier.id}
                  style={styles.supplierItem}
                  onPress={() => {
                    setSelectedSupplier(supplier);
                    setShowSupplierModal(false);
                    setSupplierSearchQuery('');
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.supplierItemInfo}>
                    <Text style={styles.supplierItemName}>{supplier.name}</Text>
                    <Text style={styles.supplierItemGstin}>GSTIN: {supplier.gstin}</Text>
                    <Text style={styles.supplierItemAddress}>{supplier.address}</Text>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </SafeAreaView>
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
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  backButton: {
    padding: 8,
    marginRight: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  scrollView: {
    flex: 1,
  },
  section: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  supplierSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  supplierInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  supplierDetails: {
    marginLeft: 12,
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  supplierGstin: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  formRow: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  formGroup: {
    flex: 1,
  },
  label: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  textArea: {
    height: 80,
    textAlignVertical: 'top',
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    gap: 4,
  },
  addButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.primary,
  },
  productCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  productNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  removeButton: {
    padding: 4,
  },
  unitSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  unitText: {
    fontSize: 16,
    color: Colors.text,
  },
  gstSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  gstText: {
    fontSize: 16,
    color: Colors.text,
  },
  productTotal: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  totalAmount: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  totalsCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  grandTotalRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  grandTotalAmount: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  submitSection: {
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitButtonDisabled: {
    backgroundColor: Colors.grey[300],
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  modalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  closeButton: {
    padding: 8,
  },
  searchContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
  supplierList: {
    flex: 1,
  },
  supplierItem: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  supplierItemInfo: {
    flex: 1,
  },
  supplierItemName: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  supplierItemGstin: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 2,
  },
  supplierItemAddress: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
});

