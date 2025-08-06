import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
} from 'react-native';
import { showInfo } from '@/utils/notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  CheckCircle,
  Package,
  FileText,
  Image as ImageIcon,
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

interface Product {
  id: string;
  name: string;
  image: string;
  category: string;
  currentStock: number;
  unitPrice: number;
  barcode: string;
  supplier: string;
  location: string;
  primaryUnit: string;
}

interface StockOutItem {
  product: Product;
  quantityToRemove: number;
  notes: string;
  proofImage?: string;
}

interface StockOutData {
  reason: string;
  items: StockOutItem[];
  generalNotes: string;
}

export default function ConfirmationScreen() {
  const { stockOutData } = useLocalSearchParams<{ stockOutData: string }>();
  
  // Parse stock out data
  const data: StockOutData = stockOutData ? JSON.parse(stockOutData) : {
    reason: '',
    items: [],
    generalNotes: '',
  };

  const handleConfirm = () => {
    // Log final stock out confirmation
    console.log('=== STOCK OUT CONFIRMED ===');
    console.log('Reason:', data.reason);
    console.log('Total Items:', totalItems);
    console.log('Total Quantity:', totalItems);
    console.log('Total Value:', formatPrice(totalValue));
    console.log('General Notes:', data.generalNotes);
    data.items.forEach((item, index) => {
      console.log(`Confirmed Item ${index + 1}:`);
      console.log('  Product ID:', item.product.id);
      console.log('  Product Name:', item.product.name);
      console.log('  Current Stock:', item.product.currentStock);
      console.log('  Quantity Removed:', item.quantityToRemove);
      console.log('  Remaining Stock:', item.product.currentStock - item.quantityToRemove);
      console.log('  Unit Price:', formatPrice(item.product.unitPrice));
      console.log('  Total Value:', formatPrice(item.quantityToRemove * item.product.unitPrice));
      console.log('  Notes:', item.notes);
      console.log('  Has Proof Image:', !!item.proofImage);
      console.log('  Category:', item.product.category);
      console.log('  Supplier:', item.product.supplier);
      console.log('  Location:', item.product.location);
      console.log('  Primary Unit:', item.product.primaryUnit);
    });
    console.log('Confirmed at:', new Date().toISOString());
    console.log('==========================');

    showInfo('Are you sure you want to proceed with this stock out? This action cannot be undone.', 'Confirm Stock Out');
    // Here you would typically make an API call to process the stock out
    // For now, we'll just navigate to success screen after a short delay
    setTimeout(() => {
      router.replace('/inventory/stock-out/success');
    }, 2000);
  };

  const handleBack = () => {
    router.back();
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const totalItems = data.items.reduce((sum, item) => sum + item.quantityToRemove, 0);
  const totalValue = data.items.reduce((sum, item) => 
    sum + (item.quantityToRemove * item.product.unitPrice), 0
  );

  const renderItemCard = (item: StockOutItem, index: number) => {
    const { product, quantityToRemove, notes } = item;
    const remainingStock = product.currentStock - quantityToRemove;

    return (
      <View key={product.id} style={styles.itemCard}>
        <View style={styles.itemHeader}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productCategory}>{product.category}</Text>
            <Text style={styles.productLocation}>{product.location}</Text>
          </View>
        </View>

        <View style={styles.itemDetails}>
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Current Stock:</Text>
            <Text style={styles.detailValue}>{product.currentStock} {product.primaryUnit}</Text>
          </View>
          
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Quantity to Remove:</Text>
            <Text style={styles.detailValue}>{quantityToRemove} {product.primaryUnit}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Will Remain:</Text>
            <Text style={[
              styles.detailValue,
              remainingStock <= 0 && styles.detailValueError
            ]}>
              {remainingStock} {product.primaryUnit}
            </Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Unit Price:</Text>
            <Text style={styles.detailValue}>{formatPrice(product.unitPrice)}</Text>
          </View>

          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Total Value:</Text>
            <Text style={styles.detailValue}>
              {formatPrice(quantityToRemove * product.unitPrice)}
            </Text>
          </View>

          {notes && (
            <View style={styles.notesContainer}>
              <Text style={styles.notesLabel}>Notes:</Text>
              <Text style={styles.notesText}>{notes}</Text>
            </View>
          )}
          
          {item.proofImage && (
            <View style={styles.itemProofImageContainer}>
              <Text style={styles.itemProofImageLabel}>Proof Image:</Text>
              <Image source={{ uri: item.proofImage }} style={styles.itemProofImage} />
            </View>
          )}
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBack}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Confirm Stock Out</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Summary Card */}
        <View style={styles.summaryCard}>
          <Text style={styles.summaryTitle}>Stock Out Summary</Text>
          
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Reason:</Text>
            <Text style={styles.summaryValue}>{data.reason}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Items:</Text>
            <Text style={styles.summaryValue}>{totalItems}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Value:</Text>
            <Text style={styles.summaryValue}>{formatPrice(totalValue)}</Text>
          </View>

          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Products:</Text>
            <Text style={styles.summaryValue}>{data.items.length}</Text>
          </View>
        </View>

        {/* Items */}
        <View style={styles.itemsSection}>
          <Text style={styles.sectionTitle}>Items to Remove</Text>
          {data.items.map(renderItemCard)}
        </View>

        {/* General Notes */}
        {data.generalNotes && (
          <View style={styles.notesSection}>
            <Text style={styles.sectionTitle}>General Notes</Text>
            <View style={styles.generalNotesCard}>
              <FileText size={20} color={Colors.primary} />
              <Text style={styles.generalNotesText}>{data.generalNotes}</Text>
            </View>
          </View>
        )}



        {/* Warning */}
        <View style={styles.warningCard}>
          <Text style={styles.warningTitle}>⚠️ Important</Text>
          <Text style={styles.warningText}>
            This action will permanently reduce your inventory. Please review all details carefully before confirming.
          </Text>
        </View>
      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={handleBack}
          activeOpacity={0.8}
        >
          <Text style={styles.cancelButtonText}>Back</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.confirmButton}
          onPress={handleConfirm}
          activeOpacity={0.8}
        >
          <CheckCircle size={20} color={Colors.background} />
          <Text style={styles.confirmButtonText}>Confirm Stock Out</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
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
    flex: 1,
  },
  content: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  summaryCard: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    padding: 20,
    marginBottom: 24,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.background,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.background,
    opacity: 0.9,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
  itemsSection: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  itemCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    marginBottom: 12,
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 16,
  },
  productImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  productInfo: {
    flex: 1,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  productCategory: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 4,
  },
  productLocation: {
    fontSize: 12,
    color: Colors.textLight,
  },
  itemDetails: {
    gap: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
  },
  detailValueError: {
    color: Colors.error,
  },
  notesContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  notesText: {
    fontSize: 14,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  itemProofImageContainer: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  itemProofImageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  itemProofImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
  },
  notesSection: {
    marginBottom: 24,
  },
  generalNotesCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  generalNotesText: {
    fontSize: 14,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
    lineHeight: 20,
  },
  proofSection: {
    marginBottom: 24,
  },
  proofImageCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 8,
  },
  proofImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  warningCard: {
    backgroundColor: Colors.warning + '20',
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.warning + '40',
  },
  warningTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.warning,
    marginBottom: 8,
  },
  warningText: {
    fontSize: 14,
    color: Colors.text,
    lineHeight: 20,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexDirection: 'row',
    gap: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  cancelButton: {
    flex: 1,
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  confirmButton: {
    flex: 2,
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
  },
  confirmButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
    marginLeft: 8,
  },
}); 