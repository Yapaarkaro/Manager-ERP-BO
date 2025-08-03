import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  TextInput,
  Alert,
  ScrollView,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  FileText,
  Building2,
  Package,
  Check,
  AlertTriangle,
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
  supplierAddress: string;
  supplierPhone: string;
  supplierEmail: string;
  orderDate: string;
  expectedDelivery: string;
  totalAmount: number;
  status: 'pending' | 'partial' | 'received';
  products: POProduct[];
}

export default function InvoiceInputScreen() {
  const { poData } = useLocalSearchParams();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [hasEwayBill, setHasEwayBill] = useState(false);
  const [ewayBillNumber, setEwayBillNumber] = useState('');
  const [vehicleNumber, setVehicleNumber] = useState('');
  const [vehicleType, setVehicleType] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (poData) {
      try {
        const parsedPO = JSON.parse(poData as string);
        setPo(parsedPO);
        // Set today's date as default invoice date
        const today = new Date().toISOString().split('T')[0];
        setInvoiceDate(today);
      } catch (error) {
        console.error('Error parsing PO data:', error);
        Alert.alert('Error', 'Invalid PO data');
        router.back();
      }
    }
  }, [poData]);

  const handleContinue = () => {
    if (!invoiceNumber.trim()) {
      Alert.alert('Invoice Number Required', 'Please enter the invoice number');
      return;
    }

    if (!invoiceDate.trim()) {
      Alert.alert('Invoice Date Required', 'Please enter the invoice date');
      return;
    }

    if (!po) {
      Alert.alert('Error', 'Purchase order data not found');
      return;
    }

    // Navigate to verify stock with invoice details
    const params: any = {
      poData: JSON.stringify(po),
      invoiceNumber: invoiceNumber.trim(),
      invoiceDate: invoiceDate.trim(),
    };

    if (hasEwayBill) {
      params.ewayBillNumber = ewayBillNumber.trim();
      params.vehicleNumber = vehicleNumber.trim();
      params.vehicleType = vehicleType.trim();
    }

    router.push({
      pathname: '/inventory/stock-in/verify-stock',
      params
    });
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
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
            <Text style={styles.headerTitle}>Invoice Details</Text>
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
          
          <Text style={styles.headerTitle}>Invoice Details</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* PO Information */}
          <View style={styles.poInfoCard}>
            <View style={styles.poHeader}>
              <FileText size={24} color={Colors.primary} />
              <View style={styles.poInfo}>
                <Text style={styles.poNumber}>{po.poNumber}</Text>
                <Text style={styles.poDate}>Order Date: {po.orderDate}</Text>
                <Text style={styles.poAmount}>Total: {formatAmount(po.totalAmount)}</Text>
              </View>
            </View>
          </View>

          {/* Supplier Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Supplier Information</Text>
            <View style={styles.supplierCard}>
              <View style={styles.supplierHeader}>
                <Building2 size={20} color={Colors.primary} />
                <Text style={styles.supplierName}>{po.supplierName}</Text>
              </View>
              
              <View style={styles.supplierDetails}>
                <View style={styles.supplierDetailRow}>
                  <Text style={styles.supplierDetailLabel}>GSTIN:</Text>
                  <Text style={styles.supplierDetailValue}>{po.supplierGSTIN}</Text>
                </View>
                
                <View style={styles.supplierDetailRow}>
                  <Text style={styles.supplierDetailLabel}>Address:</Text>
                  <Text style={styles.supplierDetailValue}>{po.supplierAddress}</Text>
                </View>
                
                <View style={styles.supplierDetailRow}>
                  <Text style={styles.supplierDetailLabel}>Phone:</Text>
                  <Text style={styles.supplierDetailValue}>{po.supplierPhone}</Text>
                </View>
                
                <View style={styles.supplierDetailRow}>
                  <Text style={styles.supplierDetailLabel}>Email:</Text>
                  <Text style={styles.supplierDetailValue}>{po.supplierEmail}</Text>
                </View>
              </View>
            </View>
          </View>

          {/* Invoice Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.invoiceForm}>
              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Invoice Number *</Text>
                <TextInput
                  style={styles.textInput}
                  value={invoiceNumber}
                  onChangeText={setInvoiceNumber}
                  placeholder="Enter invoice number"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="characters"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.inputLabel}>Invoice Date *</Text>
                <TextInput
                  style={styles.textInput}
                  value={invoiceDate}
                  onChangeText={setInvoiceDate}
                  placeholder="YYYY-MM-DD"
                  placeholderTextColor={Colors.textLight}
                  keyboardType="numeric"
                />
              </View>

              {/* E-way Bill Section */}
              <View style={styles.inputGroup}>
                <View style={styles.checkboxContainer}>
                  <TouchableOpacity
                    style={styles.checkbox}
                    onPress={() => setHasEwayBill(!hasEwayBill)}
                    activeOpacity={0.7}
                  >
                    {hasEwayBill && <Check size={16} color={Colors.primary} />}
                  </TouchableOpacity>
                  <Text style={styles.checkboxLabel}>Has E-way Bill</Text>
                </View>
              </View>

              {hasEwayBill && (
                <>
                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>E-way Bill Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={ewayBillNumber}
                      onChangeText={(text) => {
                        // Only allow numeric input, max 12 digits
                        const numericText = text.replace(/[^0-9]/g, '');
                        if (numericText.length <= 12) {
                          setEwayBillNumber(numericText);
                        }
                      }}
                      placeholder="Enter 12-digit e-way bill number"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      maxLength={12}
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Vehicle Number *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={vehicleNumber}
                      onChangeText={setVehicleNumber}
                      placeholder="Enter vehicle number"
                      placeholderTextColor={Colors.textLight}
                      autoCapitalize="characters"
                    />
                  </View>

                  <View style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>Vehicle Type *</Text>
                    <TextInput
                      style={styles.textInput}
                      value={vehicleType}
                      onChangeText={setVehicleType}
                      placeholder="e.g., Truck, Tempo, etc."
                      placeholderTextColor={Colors.textLight}
                    />
                  </View>
                </>
              )}
            </View>
          </View>

          {/* Products Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Products to Receive</Text>
            <View style={styles.productsList}>
              {po.products.map((product) => (
                <View key={product.id} style={styles.productItem}>
                  <View style={styles.productInfo}>
                    <Package size={16} color={Colors.textLight} />
                    <Text style={styles.productName}>{product.name}</Text>
                  </View>
                  <View style={styles.productQuantities}>
                    <Text style={styles.quantityText}>
                      {product.receivedQuantity}/{product.billedQuantity}
                    </Text>
                    <Text style={styles.productPrice}>
                      {formatAmount(product.unitPrice)} each
                    </Text>
                  </View>
                </View>
              ))}
            </View>
          </View>

          {/* Instructions */}
          <View style={styles.instructionsCard}>
            <AlertTriangle size={20} color={Colors.warning} />
            <View style={styles.instructionsContent}>
              <Text style={styles.instructionsTitle}>Important Notes</Text>
              <Text style={styles.instructionsText}>
                • Verify the invoice number matches the supplier's invoice{'\n'}
                • Check that all products listed match the PO{'\n'}
                • Report any discrepancies during stock verification{'\n'}
                • Keep the original invoice for records
              </Text>
            </View>
          </View>
        </ScrollView>

        {/* Floating Continue Button */}
        <View style={styles.floatingButtonContainer}>
          <TouchableOpacity
            style={[
              styles.continueButton,
              (!invoiceNumber.trim() || !invoiceDate.trim()) && styles.disabledButton
            ]}
            onPress={handleContinue}
            disabled={!invoiceNumber.trim() || !invoiceDate.trim()}
            activeOpacity={0.8}
          >
            <Check size={20} color={Colors.background} />
            <Text style={styles.continueButtonText}>Continue to Stock Verification</Text>
          </TouchableOpacity>
        </View>
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
  poHeader: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  poInfo: {
    marginLeft: 12,
    flex: 1,
  },
  poNumber: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  poDate: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 2,
  },
  poAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  section: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  supplierCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
  },
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  supplierDetails: {
    gap: 8,
  },
  supplierDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
  },
  supplierDetailLabel: {
    fontSize: 14,
    color: Colors.textLight,
    minWidth: 80,
  },
  supplierDetailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  invoiceForm: {
    gap: 16,
  },
  inputGroup: {
    gap: 8,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  textInput: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
  },
  productsList: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
  },
  productItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productName: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 8,
  },
  productQuantities: {
    alignItems: 'flex-end',
  },
  quantityText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  productPrice: {
    fontSize: 12,
    color: Colors.textLight,
  },
  instructionsCard: {
    backgroundColor: '#fff7ed',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.warning,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  instructionsContent: {
    marginLeft: 12,
    flex: 1,
  },
  instructionsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 18,
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
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  checkboxContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 8,
  },
  checkboxLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
}); 