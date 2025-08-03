import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  ScrollView,
  Alert,
} from 'react-native';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Check,
  X,
  FileText,
  Building2,
  Package,
  Truck,
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
  orderDate: string;
  expectedDelivery: string;
  totalAmount: number;
  status: 'pending' | 'partial' | 'received';
  products: POProduct[];
}

export default function StockConfirmationScreen() {
  const { 
    poData, 
    invoiceNumber, 
    invoiceDate, 
    ewayBillNumber, 
    vehicleNumber, 
    vehicleType 
  } = useLocalSearchParams();

  const po: PurchaseOrder = poData ? JSON.parse(poData as string) : null;

  const handleConfirm = () => {
    Alert.alert(
      'Stock In Recorded',
      'Stock in entry has been successfully recorded.',
      [
        {
          text: 'OK',
          onPress: () => {
            // Navigate to dashboard to clear the entire flow
            router.replace('/dashboard');
          }
        }
      ]
    );
  };

  const handleCancel = () => {
    router.back();
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
            <Text style={styles.headerTitle}>Confirm Stock In</Text>
          </View>
          <View style={styles.loadingContainer}>
            <Text style={styles.loadingText}>Loading data...</Text>
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
            onPress={handleCancel}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Confirm Stock In</Text>
        </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Confirmation Message */}
          <View style={styles.confirmationCard}>
            <Check size={24} color={Colors.success} />
            <Text style={styles.confirmationTitle}>Ready to Record Stock In</Text>
            <Text style={styles.confirmationText}>
              Please review the details below before confirming the stock in entry.
            </Text>
          </View>

          {/* PO Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Purchase Order Details</Text>
            <View style={styles.poCard}>
              <View style={styles.poHeader}>
                <FileText size={20} color={Colors.primary} />
                <Text style={styles.poNumber}>{po.poNumber}</Text>
              </View>
              <Text style={styles.supplierName}>{po.supplierName}</Text>
              <Text style={styles.poDetails}>
                Order Date: {po.orderDate} | Expected: {po.expectedDelivery}
              </Text>
            </View>
          </View>

          {/* Invoice Information */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.invoiceCard}>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Invoice Number:</Text>
                <Text style={styles.invoiceValue}>{invoiceNumber}</Text>
              </View>
              <View style={styles.invoiceRow}>
                <Text style={styles.invoiceLabel}>Invoice Date:</Text>
                <Text style={styles.invoiceValue}>{invoiceDate}</Text>
              </View>
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
          </View>

          {/* Products Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Products to be Recorded</Text>
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

          {/* Summary */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Summary</Text>
            <View style={styles.summaryCard}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Items:</Text>
                <Text style={styles.summaryValue}>{po.products.length}</Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Quantity:</Text>
                <Text style={styles.summaryValue}>
                  {po.products.reduce((sum, p) => sum + p.receivedQuantity, 0)}
                </Text>
              </View>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Total Value:</Text>
                <Text style={styles.summaryValue}>
                  {formatAmount(po.products.reduce((sum, p) => sum + (p.receivedQuantity * p.unitPrice), 0))}
                </Text>
              </View>
            </View>
          </View>
        </ScrollView>

        {/* Action Buttons */}
        <View style={styles.floatingButtonsContainer}>
          <TouchableOpacity
            style={styles.cancelButton}
            onPress={handleCancel}
            activeOpacity={0.8}
          >
            <X size={20} color={Colors.error} />
            <Text style={styles.cancelButtonText}>Cancel</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.confirmButton}
            onPress={handleConfirm}
            activeOpacity={0.8}
          >
            <Check size={20} color={Colors.background} />
            <Text style={styles.confirmButtonText}>Confirm Stock In</Text>
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
  confirmationCard: {
    backgroundColor: Colors.success + '10',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.success + '30',
    padding: 16,
    marginBottom: 20,
    alignItems: 'center',
  },
  confirmationTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.success,
    marginTop: 8,
    marginBottom: 4,
  },
  confirmationText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
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
  poCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
  },
  poHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  poNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  supplierName: {
    fontSize: 14,
    color: Colors.text,
    marginBottom: 4,
  },
  poDetails: {
    fontSize: 12,
    color: Colors.textLight,
  },
  invoiceCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
  },
  invoiceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  invoiceValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  productsList: {
    gap: 12,
  },
  productItem: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  productName: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '500',
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
    marginTop: 2,
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
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
  floatingButtonsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
  },
  cancelButton: {
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
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.error,
  },
  confirmButton: {
    flex: 1,
    backgroundColor: Colors.success,
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
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
}); 