import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
} from 'react-native';
import { showError, showInfo } from '@/utils/notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Plus,
  Camera,
  FileText,
  Trash2,
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

export default function StockDetailsScreen() {
  const { reason, selectedProducts } = useLocalSearchParams<{ 
    reason: string;
    selectedProducts: string;
  }>();
  
  const [stockOutItems, setStockOutItems] = useState<StockOutItem[]>([]);
  const [notes, setNotes] = useState('');

  // Parse selected products
  const products: Product[] = selectedProducts ? JSON.parse(selectedProducts) : [];

  // Initialize stock out items
  React.useEffect(() => {
    if (products.length > 0 && stockOutItems.length === 0) {
      const initialItems: StockOutItem[] = products.map(product => ({
        product,
        quantityToRemove: 0,
        notes: '',
      }));
      setStockOutItems(initialItems);
    }
  }, [products]);

  const handleQuantityChange = (productId: string, quantity: string) => {
    const numQuantity = parseInt(quantity) || 0;
    const product = stockOutItems.find(item => item.product.id === productId);
    
    if (product && numQuantity > product.product.currentStock) {
      showError('Quantity to remove cannot exceed current stock', 'Invalid Quantity');
      return;
    }

    setStockOutItems(prev => 
      prev.map(item => 
        item.product.id === productId 
          ? { ...item, quantityToRemove: numQuantity }
          : item
      )
    );
  };

  const handleNotesChange = (productId: string, notes: string) => {
    setStockOutItems(prev => 
      prev.map(item => 
        item.product.id === productId 
          ? { ...item, notes }
          : item
      )
    );
  };

  const handleAddProductProofImage = (productId: string) => {
    showInfo('Camera or gallery would open here. For demo, we\'ll simulate adding an image.', 'Add Proof Image');
    // Simulate adding image after a short delay
    setTimeout(() => {
      setStockOutItems(prev => 
        prev.map(item => 
          item.product.id === productId 
            ? { ...item, proofImage: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1' }
            : item
        )
      );
    }, 1000);
  };

  const handleRemoveProductProofImage = (productId: string) => {
    setStockOutItems(prev => 
      prev.map(item => 
        item.product.id === productId 
          ? { ...item, proofImage: undefined }
          : item
      )
    );
  };

  const handleAddMoreItems = () => {
    router.push({
      pathname: '/inventory/stock-out/select-products',
      params: { reason }
    });
  };

  const handleContinue = () => {
    const hasValidQuantities = stockOutItems.some(item => item.quantityToRemove > 0);
    
    if (!hasValidQuantities) {
      showError('Please specify quantities to remove for at least one product', 'No Items Selected');
      return;
    }

    // Check if all products with quantities have proof images
    const itemsWithQuantities = stockOutItems.filter(item => item.quantityToRemove > 0);
    const itemsWithoutProofImages = itemsWithQuantities.filter(item => !item.proofImage);
    
    if (itemsWithoutProofImages.length > 0) {
      showError('Please add proof images for all products before continuing.', 'Proof Images Required');
      return;
    }

    // Log stock out details
    console.log('=== STOCK OUT DETAILS COMPLETED ===');
    console.log('Reason:', reason);
    console.log('Total Items:', itemsWithQuantities.length);
    console.log('Total Quantity:', itemsWithQuantities.reduce((sum, item) => sum + item.quantityToRemove, 0));
    itemsWithQuantities.forEach((item, index) => {
      console.log(`Item ${index + 1}:`);
      console.log('  Product ID:', item.product.id);
      console.log('  Product Name:', item.product.name);
      console.log('  Current Stock:', item.product.currentStock);
      console.log('  Quantity to Remove:', item.quantityToRemove);
      console.log('  Will Remain:', item.product.currentStock - item.quantityToRemove);
      console.log('  Notes:', item.notes);
      console.log('  Has Proof Image:', !!item.proofImage);
      console.log('  Unit Price:', item.product.unitPrice);
      console.log('  Category:', item.product.category);
      console.log('  Supplier:', item.product.supplier);
      console.log('  Location:', item.product.location);
      console.log('  Primary Unit:', item.product.primaryUnit);
    });
    console.log('General Notes:', notes);
    console.log('Completed at:', new Date().toISOString());
    console.log('==================================');

    const stockOutData = {
      reason,
      items: itemsWithQuantities,
      generalNotes: notes,
    };

    router.push({
      pathname: '/inventory/stock-out/confirmation',
      params: {
        stockOutData: JSON.stringify(stockOutData)
      }
    });
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

  const renderProductCard = (item: StockOutItem) => {
    const { product, quantityToRemove, notes } = item;
    const remainingStock = product.currentStock - quantityToRemove;

    return (
      <View key={product.id} style={styles.productCard}>
        <View style={styles.productHeader}>
          <Image source={{ uri: product.image }} style={styles.productImage} />
          <View style={styles.productInfo}>
            <Text style={styles.productName}>{product.name}</Text>
            <Text style={styles.productCategory}>{product.category}</Text>
            <Text style={styles.productLocation}>{product.location}</Text>
          </View>
        </View>

        <View style={styles.stockInfo}>
          <View style={styles.stockCardsContainer}>
            <View style={styles.stockCard}>
              <Text style={styles.stockCardLabel}>Current Stock</Text>
              <Text style={styles.stockCardValue}>{product.currentStock}</Text>
              <Text style={styles.stockCardUnit}>{product.primaryUnit}</Text>
            </View>

            <View style={styles.stockCard}>
              <Text style={styles.stockCardLabel}>Will Remain</Text>
              <Text style={[
                styles.stockCardValue,
                remainingStock <= 0 && styles.stockCardValueError
              ]}>
                {remainingStock}
              </Text>
              <Text style={styles.stockCardUnit}>{product.primaryUnit}</Text>
            </View>
          </View>
          
          <View style={styles.quantityInputContainer}>
            <Text style={styles.quantityLabel}>Quantity to Remove:</Text>
            <TextInput
              style={styles.quantityInput}
              placeholder="0"
              placeholderTextColor={Colors.textLight}
              value={quantityToRemove.toString()}
              onChangeText={(text) => handleQuantityChange(product.id, text)}
              keyboardType="numeric"
            />
          </View>
        </View>

        <View style={styles.notesContainer}>
          <Text style={styles.notesLabel}>Notes (Optional):</Text>
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes for this product..."
            placeholderTextColor={Colors.textLight}
            value={notes}
            onChangeText={(text) => handleNotesChange(product.id, text)}
            multiline
            numberOfLines={3}
          />
          
          {/* Proof Image for this product */}
          <View style={styles.productProofImageContainer}>
            <Text style={styles.productProofImageLabel}>Proof Image *</Text>
            {item.proofImage ? (
              <View style={styles.productProofImageWrapper}>
                <Image source={{ uri: item.proofImage }} style={styles.productProofImage} />
                <TouchableOpacity
                  style={styles.removeProductImageButton}
                  onPress={() => handleRemoveProductProofImage(product.id)}
                  activeOpacity={0.8}
                >
                  <Trash2 size={16} color={Colors.error} />
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.addProductImageButton}
                onPress={() => handleAddProductProofImage(product.id)}
                activeOpacity={0.8}
              >
                <Camera size={20} color={Colors.primary} />
                <Text style={styles.addProductImageText}>Add Proof Image</Text>
              </TouchableOpacity>
            )}
          </View>
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
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Stock Out Details</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Reason Display */}
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>Stock Out Reason:</Text>
          <Text style={styles.reasonText}>{reason}</Text>
        </View>

        {/* Products */}
        {stockOutItems.map(renderProductCard)}

        {/* General Notes */}
        <View style={styles.generalNotesContainer}>
          <Text style={styles.generalNotesLabel}>General Notes (Optional):</Text>
          <TextInput
            style={styles.generalNotesInput}
            placeholder="Add general notes for this stock out..."
            placeholderTextColor={Colors.textLight}
            value={notes}
            onChangeText={setNotes}
            multiline
            numberOfLines={4}
          />
        </View>

      </ScrollView>

      {/* Action Buttons */}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={styles.addMoreButtonFooter}
          onPress={handleAddMoreItems}
          activeOpacity={0.8}
        >
          <Plus size={20} color={Colors.primary} />
          <Text style={styles.addMoreTextFooter}>Add More Items</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={styles.continueButton}
          onPress={handleContinue}
          activeOpacity={0.8}
        >
          <Text style={styles.continueButtonText}>Continue</Text>
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
  reasonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    marginBottom: 20,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  productCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    marginBottom: 16,
  },
  productHeader: {
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
  stockInfo: {
    marginBottom: 16,
  },
  stockCardsContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 8,
    marginBottom: 16,
  },
  stockCard: {
    flex: 1,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 12,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  stockCardLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  stockCardValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
    textAlign: 'center',
  },
  stockCardValueError: {
    color: Colors.error,
  },
  stockCardUnit: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
    marginTop: 2,
  },
  quantityInputContainer: {
    marginBottom: 8,
  },
  quantityLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  quantityInput: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 16,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  notesContainer: {
    marginBottom: 8,
  },
  notesLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    textAlignVertical: 'top',
    minHeight: 60,
  },
  generalNotesContainer: {
    marginBottom: 20,
  },
  generalNotesLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  generalNotesInput: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    textAlignVertical: 'top',
    minHeight: 80,
  },
  proofImageContainer: {
    marginBottom: 20,
  },
  proofImageLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  addImageButton: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderStyle: 'dashed',
    paddingVertical: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  addImageText: {
    fontSize: 14,
    color: Colors.primary,
    marginTop: 8,
    fontWeight: '500',
  },
  proofImageWrapper: {
    position: 'relative',
  },
  proofImage: {
    width: '100%',
    height: 120,
    borderRadius: 8,
  },
  removeImageButton: {
    position: 'absolute',
    top: 8,
    right: 8,
    backgroundColor: Colors.background,
    borderRadius: 12,
    width: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  productProofImageContainer: {
    marginTop: 12,
  },
  productProofImageLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 8,
  },
  addProductImageButton: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderStyle: 'dashed',
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    flexDirection: 'row',
  },
  addProductImageText: {
    fontSize: 14,
    color: Colors.primary,
    marginLeft: 8,
    fontWeight: '500',
  },
  productProofImageWrapper: {
    position: 'relative',
  },
  productProofImage: {
    width: '100%',
    height: 80,
    borderRadius: 8,
  },
  removeProductImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    backgroundColor: Colors.background,
    borderRadius: 10,
    width: 20,
    height: 20,
    alignItems: 'center',
    justifyContent: 'center',
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
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  addMoreButtonFooter: {
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'center',
    marginBottom: 12,
  },
  addMoreTextFooter: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
}); 