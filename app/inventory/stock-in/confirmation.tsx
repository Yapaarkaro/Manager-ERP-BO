import React, { useState } from 'react';
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
  FileText,
  Building2,
  Package,
  IndianRupee,
  Percent,
  Check,
  Truck,
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

interface StockInConfirmationData {
  invoiceNumber: string;
  invoiceDate: string;
  hasEwayBill: boolean;
  ewayBillNumber: string;
  vehicleNumber: string;
  vehicleType: string;
  supplier: {
    name: string;
    gstin: string;
    businessName: string;
    address: string;
  } | null;
  products: any[];
  totalAmount: number;
  discountType: 'percentage' | 'amount';
  discountValue: number;
  notes: string;
}

export default function StockInConfirmationScreen() {
  const { stockInData } = useLocalSearchParams();
  const [isSaving, setIsSaving] = useState(false);

  const parseStockInData = (): StockInConfirmationData => {
    if (stockInData) {
      try {
        return JSON.parse(stockInData as string);
      } catch (error) {
        console.error('Error parsing stock in data:', error);
      }
    }
    return {
      invoiceNumber: '',
      invoiceDate: '',
      hasEwayBill: false,
      ewayBillNumber: '',
      vehicleNumber: '',
      vehicleType: '',
      supplier: null,
      products: [],
      totalAmount: 0,
      discountType: 'amount',
      discountValue: 0,
      notes: '',
    };
  };

  const data = parseStockInData();

  const handleConfirm = () => {
    setIsSaving(true);
    
    // Simulate saving
    setTimeout(() => {
      setIsSaving(false);
      Alert.alert(
        'Stock In Saved',
        'Stock in entry has been saved successfully',
        [
          {
            text: 'OK',
            onPress: () => router.replace('/dashboard')
          }
        ]
      );
    }, 2000);
  };

  const handleBack = () => {
    router.back();
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={handleBack}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Confirm Stock In</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Invoice Details */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Invoice Details</Text>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice Number:</Text>
              <Text style={styles.detailValue}>{data.invoiceNumber}</Text>
            </View>
            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Invoice Date:</Text>
              <Text style={styles.detailValue}>{data.invoiceDate}</Text>
            </View>
          </View>

          {/* E-Way Bill & Vehicle */}
          {data.hasEwayBill && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>E-Way Bill Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>E-Way Bill Number:</Text>
                <Text style={styles.detailValue}>{data.ewayBillNumber}</Text>
              </View>
            </View>
          )}

          {(data.vehicleNumber || data.vehicleType) && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Vehicle Details</Text>
              {data.vehicleNumber && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vehicle Number:</Text>
                  <Text style={styles.detailValue}>{data.vehicleNumber}</Text>
                </View>
              )}
              {data.vehicleType && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Vehicle Type:</Text>
                  <Text style={styles.detailValue}>{data.vehicleType}</Text>
                </View>
              )}
            </View>
          )}

          {/* Supplier Details */}
          {data.supplier && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Supplier Details</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Business Name:</Text>
                <Text style={styles.detailValue}>{data.supplier.businessName}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>GSTIN:</Text>
                <Text style={styles.detailValue}>{data.supplier.gstin}</Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Address:</Text>
                <Text style={styles.detailValue}>{data.supplier.address}</Text>
              </View>
            </View>
          )}

          {/* Products */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Products ({data.products.length})</Text>
            {data.products.map((product, index) => (
              <View key={product.id} style={styles.productCard}>
                <View style={styles.productHeader}>
                  <Text style={styles.productName}>{product.name}</Text>
                  {product.isNewProduct && (
                    <View style={styles.newProductBadge}>
                      <Text style={styles.newProductText}>NEW</Text>
                    </View>
                  )}
                </View>
                <View style={styles.productDetails}>
                  <View style={styles.productRow}>
                    <Text style={styles.productLabel}>Quantity:</Text>
                    <Text style={styles.productValue}>{product.quantity}</Text>
                  </View>
                  <View style={styles.productRow}>
                    <Text style={styles.productLabel}>Purchase Price:</Text>
                    <Text style={styles.productValue}>₹{product.purchasePrice}</Text>
                  </View>
                  <View style={styles.productRow}>
                    <Text style={styles.productLabel}>Discount:</Text>
                    <Text style={styles.productValue}>{product.discount}%</Text>
                  </View>
                  <View style={styles.productRow}>
                    <Text style={styles.productLabel}>GST:</Text>
                    <Text style={styles.productValue}>{product.gstRate}%</Text>
                  </View>
                  <View style={styles.productRow}>
                    <Text style={styles.productLabel}>Total:</Text>
                    <Text style={styles.productTotal}>₹{product.totalPrice}</Text>
                  </View>
                </View>
              </View>
            ))}
          </View>

          {/* Discount */}
          {data.discountValue > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Supplier Discount</Text>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Discount Type:</Text>
                <Text style={styles.detailValue}>
                  {data.discountType === 'amount' ? '₹ Amount' : '% Percentage'}
                </Text>
              </View>
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Discount Value:</Text>
                <Text style={styles.detailValue}>
                  {data.discountType === 'amount' ? '₹' : ''}{data.discountValue}
                  {data.discountType === 'percentage' ? '%' : ''}
                </Text>
              </View>
            </View>
          )}

          {/* Total Amount */}
          <View style={styles.section}>
            <View style={styles.totalSection}>
              <Text style={styles.totalLabel}>Total Amount:</Text>
              <Text style={styles.totalAmount}>₹{data.totalAmount.toFixed(2)}</Text>
            </View>
          </View>

          {/* Notes */}
          {data.notes && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Notes</Text>
              <Text style={styles.notesText}>{data.notes}</Text>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={styles.backButtonLarge}
              onPress={handleBack}
              activeOpacity={0.7}
            >
              <Text style={styles.backButtonText}>Back to Edit</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[
                styles.confirmButton,
                isSaving && styles.disabledButton
              ]}
              onPress={handleConfirm}
              activeOpacity={0.8}
              disabled={isSaving}
            >
              <Text style={styles.confirmButtonText}>
                {isSaving ? 'Saving...' : 'Confirm & Save'}
              </Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 2,
    textAlign: 'right',
  },
  productCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
  },
  productHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  newProductBadge: {
    backgroundColor: Colors.success,
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
  },
  newProductText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
  productDetails: {
    gap: 8,
  },
  productRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  productLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  productValue: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  productTotal: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  totalSection: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 2,
    borderTopColor: Colors.grey[200],
  },
  totalLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  totalAmount: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.primary,
  },
  notesText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  actionButtons: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 24,
  },
  backButtonLarge: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    alignItems: 'center',
  },
  backButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  disabledButton: {
    opacity: 0.6,
  },
}); 