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
import { 
  ArrowLeft, 
  FileText,
  Building2,
  User,
  Calendar,
  Package,
  IndianRupee,
  Check,
  Send
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

export default function POConfirmationScreen() {
  const { supplierId, supplierData, selectedProducts, totalAmount } = useLocalSearchParams();
  const supplier = JSON.parse(supplierData as string);
  const products = JSON.parse(selectedProducts as string);
  const [isProcessing, setIsProcessing] = useState(false);

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  const generatePONumber = () => {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    const random = Math.floor(Math.random() * 1000).toString().padStart(3, '0');
    return `PO-${year}${month}${day}-${random}`;
  };

  const calculateSubtotal = () => {
    return products.reduce((sum: number, product: any) => 
      sum + (product.price * product.orderQuantity), 0
    );
  };

  const calculateTax = () => {
    return calculateSubtotal() * 0.18; // 18% GST
  };

  const calculateGrandTotal = () => {
    return calculateSubtotal() + calculateTax();
  };

  const handleNotifySupplier = async () => {
    setIsProcessing(true);

    const poNumber = generatePONumber();
    const poData = {
      poNumber,
      supplier,
      products,
      subtotal: calculateSubtotal(),
      tax: calculateTax(),
      grandTotal: calculateGrandTotal(),
      createdAt: new Date().toISOString(),
    };

    // Simulate processing
    setTimeout(() => {
      router.push({
        pathname: '/purchasing/po-success',
        params: {
          poData: JSON.stringify(poData)
        }
      });
      setIsProcessing(false);
    }, 2000);
  };

  const poNumber = generatePONumber();

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
          
          <Text style={styles.headerTitle}>Confirm Purchase Order</Text>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* PO Header */}
        <View style={styles.poHeader}>
          <View style={styles.poHeaderTop}>
            <FileText size={32} color={Colors.primary} />
            <Text style={styles.poTitle}>PURCHASE ORDER</Text>
          </View>
          
          <View style={styles.poMetaInfo}>
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>PO Number:</Text>
              <Text style={styles.metaValue}>{poNumber}</Text>
            </View>
            
            <View style={styles.metaRow}>
              <Text style={styles.metaLabel}>Date:</Text>
              <Text style={styles.metaValue}>
                {new Date().toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>
        </View>

        {/* Supplier Information */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Supplier Information</Text>
          <View style={styles.supplierCard}>
            <View style={styles.supplierHeader}>
              <Image 
                source={{ uri: supplier.avatar }}
                style={styles.supplierAvatar}
              />
              <View style={styles.supplierInfo}>
                <Text style={styles.supplierName}>
                  {supplier.supplierType === 'business' ? supplier.businessName : supplier.name}
                </Text>
                <Text style={styles.supplierContact}>
                  Contact: {supplier.contactPerson}
                </Text>
                <Text style={styles.supplierMobile}>{supplier.mobile}</Text>
                {supplier.email && (
                  <Text style={styles.supplierEmail}>{supplier.email}</Text>
                )}
              </View>
            </View>
            
            <View style={styles.supplierDetails}>
              <Text style={styles.supplierAddress}>{supplier.address}</Text>
              {supplier.gstin && (
                <Text style={styles.supplierGstin}>GSTIN: {supplier.gstin}</Text>
              )}
            </View>
          </View>
        </View>

        {/* Order Items */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Items</Text>
          <View style={styles.itemsTable}>
            {/* Table Header */}
            <View style={styles.tableHeader}>
              <Text style={[styles.tableHeaderText, styles.itemNameHeader]}>Item</Text>
              <Text style={[styles.tableHeaderText, styles.qtyHeader]}>Qty</Text>
              <Text style={[styles.tableHeaderText, styles.rateHeader]}>Rate</Text>
              <Text style={[styles.tableHeaderText, styles.amountHeader]}>Amount</Text>
            </View>
            
            {/* Table Rows */}
            {products.map((product: any) => (
              <View key={product.id} style={styles.tableRow}>
                <View style={styles.itemNameCell}>
                  <Text style={styles.itemName}>{product.name}</Text>
                  <Text style={styles.itemCategory}>{product.category}</Text>
                </View>
                <Text style={[styles.tableCellText, styles.qtyCell]}>
                  {product.orderQuantity}
                </Text>
                <Text style={[styles.tableCellText, styles.rateCell]}>
                  {formatAmount(product.price)}
                </Text>
                <Text style={[styles.tableCellText, styles.amountCell]}>
                  {formatAmount(product.price * product.orderQuantity)}
                </Text>
              </View>
            ))}
          </View>
        </View>

        {/* Order Summary */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Order Summary</Text>
          <View style={styles.summaryCard}>
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>Subtotal:</Text>
              <Text style={styles.summaryValue}>
                {formatAmount(calculateSubtotal())}
              </Text>
            </View>
            
            <View style={styles.summaryRow}>
              <Text style={styles.summaryLabel}>GST (18%):</Text>
              <Text style={styles.summaryValue}>
                {formatAmount(calculateTax())}
              </Text>
            </View>
            
            <View style={[styles.summaryRow, styles.totalRow]}>
              <Text style={styles.totalLabel}>Grand Total:</Text>
              <Text style={styles.totalValue}>
                {formatAmount(calculateGrandTotal())}
              </Text>
            </View>
          </View>
        </View>

        {/* Terms & Conditions */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Terms & Conditions</Text>
          <View style={styles.termsCard}>
            <View style={styles.termRow}>
              <Text style={styles.termLabel}>Payment Terms:</Text>
              <Text style={styles.termValue}>{supplier.paymentTerms}</Text>
            </View>
            <View style={styles.termRow}>
              <Text style={styles.termLabel}>Delivery Time:</Text>
              <Text style={styles.termValue}>{supplier.deliveryTime}</Text>
            </View>
            <View style={styles.termRow}>
              <Text style={styles.termLabel}>Expected Delivery:</Text>
              <Text style={styles.termValue}>
                {new Date(Date.now() + 5 * 24 * 60 * 60 * 1000).toLocaleDateString('en-IN')}
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>

      {/* Notify Supplier Button */}
      <View style={styles.notifySection}>
        <TouchableOpacity
          style={[
            styles.notifyButton,
            isProcessing && styles.processingButton
          ]}
          onPress={handleNotifySupplier}
          disabled={isProcessing}
          activeOpacity={0.8}
        >
          <Send size={20} color="#ffffff" />
          <Text style={styles.notifyButtonText}>
            {isProcessing ? 'Sending PO...' : 'Notify Supplier'}
          </Text>
        </TouchableOpacity>
      </View>
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
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  poHeader: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
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
  poHeaderTop: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  poTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.primary,
    marginLeft: 12,
  },
  poMetaInfo: {
    gap: 8,
  },
  metaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  metaLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  metaValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  section: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    marginBottom: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  supplierCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
  },
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  supplierAvatar: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginRight: 12,
  },
  supplierInfo: {
    flex: 1,
  },
  supplierName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  supplierContact: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 2,
  },
  supplierMobile: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 2,
  },
  supplierEmail: {
    fontSize: 14,
    color: Colors.textLight,
  },
  supplierDetails: {
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  supplierAddress: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: 8,
  },
  supplierGstin: {
    fontSize: 12,
    color: Colors.primary,
    fontFamily: 'monospace',
  },
  itemsTable: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
  },
  tableHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.primary,
    paddingVertical: 12,
    paddingHorizontal: 16,
  },
  tableHeaderText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
  itemNameHeader: {
    flex: 2,
  },
  qtyHeader: {
    flex: 0.8,
    textAlign: 'center',
  },
  rateHeader: {
    flex: 1.2,
    textAlign: 'right',
  },
  amountHeader: {
    flex: 1.2,
    textAlign: 'right',
  },
  tableRow: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
    alignItems: 'center',
  },
  itemNameCell: {
    flex: 2,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 2,
  },
  itemCategory: {
    fontSize: 12,
    color: Colors.textLight,
  },
  tableCellText: {
    fontSize: 14,
    color: Colors.text,
  },
  qtyCell: {
    flex: 0.8,
    textAlign: 'center',
  },
  rateCell: {
    flex: 1.2,
    textAlign: 'right',
  },
  amountCell: {
    flex: 1.2,
    textAlign: 'right',
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
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
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
    marginTop: 8,
  },
  totalLabel: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
  },
  totalValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
  },
  termsCard: {
    gap: 12,
  },
  termRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  termLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  termValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  notifySection: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  notifyButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  notifyButtonText: {
    color: '#ffffff',
    fontSize: 18,
    fontWeight: '600',
  },
  processingButton: {
    backgroundColor: Colors.grey[400],
  },
});