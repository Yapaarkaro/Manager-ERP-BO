import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Check, Square, SquareCheck as CheckSquare, Package, FileText, User, Building2 } from 'lucide-react-native';

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

interface InvoiceItem {
  id: string;
  name: string;
  quantity: number;
  rate: number;
  amount: number;
  taxRate: number;
  taxAmount: number;
  total: number;
}

interface SelectedItem extends InvoiceItem {
  returnQuantity: number;
}

export default function SelectItemsScreen() {
  const { invoiceData } = useLocalSearchParams();
  const invoice = JSON.parse(invoiceData as string);
  const [selectedItems, setSelectedItems] = useState<SelectedItem[]>([]);

  const handleItemToggle = (item: InvoiceItem) => {
    const existingIndex = selectedItems.findIndex(selected => selected.id === item.id);
    
    if (existingIndex >= 0) {
      // Remove item
      setSelectedItems(prev => prev.filter(selected => selected.id !== item.id));
    } else {
      // Add item with quantity 1
      setSelectedItems(prev => [...prev, { ...item, returnQuantity: 1 }]);
    }
  };

  const handleQuantityChange = (itemId: string, change: number) => {
    setSelectedItems(prev => 
      prev.map(item => {
        if (item.id === itemId) {
          const newQuantity = Math.max(1, Math.min(item.quantity, item.returnQuantity + change));
          return { ...item, returnQuantity: newQuantity };
        }
        return item;
      })
    );
  };

  const isItemSelected = (itemId: string) => {
    return selectedItems.some(item => item.id === itemId);
  };

  const getSelectedItem = (itemId: string) => {
    return selectedItems.find(item => item.id === itemId);
  };

  const calculateReturnAmount = () => {
    return selectedItems.reduce((total, item) => {
      const itemReturnAmount = (item.rate * item.returnQuantity);
      const itemReturnTax = itemReturnAmount * (item.taxRate / 100);
      return total + itemReturnAmount + itemReturnTax;
    }, 0);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const handleContinue = () => {
    if (selectedItems.length === 0) {
      Alert.alert('No Items Selected', 'Please select at least one item to return');
      return;
    }

    router.push({
      pathname: '/new-return/return-reasons',
      params: {
        invoiceData: JSON.stringify(invoice),
        selectedItems: JSON.stringify(selectedItems),
        returnAmount: calculateReturnAmount().toString()
      }
    });
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
          
          <Text style={styles.headerTitle}>Select Items to Return</Text>
          
          <View style={styles.headerRight}>
            <Text style={styles.selectedCount}>
              {selectedItems.length} selected
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Invoice Info */}
      <View style={styles.invoiceInfoContainer}>
        <View style={styles.invoiceInfoHeader}>
          <FileText size={20} color={Colors.primary} />
          <View style={styles.invoiceInfoText}>
            <Text style={styles.invoiceNumber}>{invoice.invoiceNumber}</Text>
            <Text style={styles.invoiceDate}>{formatDate(invoice.date)}</Text>
          </View>
        </View>
        
        <View style={styles.customerInfoContainer}>
          {invoice.customerType === 'business' ? (
            <Building2 size={16} color={Colors.textLight} />
          ) : (
            <User size={16} color={Colors.textLight} />
          )}
          <Text style={styles.customerName}>{invoice.customerName}</Text>
        </View>
      </View>

      {/* Items List */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.itemsContainer}>
          {invoice.items.map((item: InvoiceItem) => {
            const isSelected = isItemSelected(item.id);
            const selectedItem = getSelectedItem(item.id);

            return (
              <View key={item.id} style={[
                styles.itemCard,
                isSelected && styles.selectedItemCard
              ]}>
                {/* Item Header */}
                <TouchableOpacity
                  style={styles.itemHeader}
                  onPress={() => handleItemToggle(item)}
                  activeOpacity={0.7}
                >
                  <View style={styles.itemLeft}>
                    <View style={styles.checkboxContainer}>
                      {isSelected ? (
                        <CheckSquare size={24} color={Colors.error} />
                      ) : (
                        <Square size={24} color={Colors.grey[300]} />
                      )}
                    </View>
                    <View style={styles.itemInfo}>
                      <Text style={styles.itemName}>{item.name}</Text>
                      <Text style={styles.itemDetails}>
                        Rate: {formatAmount(item.rate)} • GST: {item.taxRate}%
                      </Text>
                    </View>
                  </View>
                  
                  <View style={styles.itemRight}>
                    <Text style={styles.itemTotal}>
                      {formatAmount(item.total)}
                    </Text>
                    <Text style={styles.itemQuantity}>
                      Qty: {item.quantity}
                    </Text>
                  </View>
                </TouchableOpacity>

                {/* Quantity Selector for Selected Items */}
                {isSelected && selectedItem && (
                  <View style={styles.quantitySelector}>
                    <Text style={styles.quantityLabel}>Return Quantity:</Text>
                    <View style={styles.quantityControls}>
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(item.id, -1)}
                        disabled={selectedItem.returnQuantity <= 1}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.quantityButtonText,
                          selectedItem.returnQuantity <= 1 && styles.disabledButtonText
                        ]}>-</Text>
                      </TouchableOpacity>
                      
                      <Text style={styles.quantityValue}>
                        {selectedItem.returnQuantity}
                      </Text>
                      
                      <TouchableOpacity
                        style={styles.quantityButton}
                        onPress={() => handleQuantityChange(item.id, 1)}
                        disabled={selectedItem.returnQuantity >= item.quantity}
                        activeOpacity={0.7}
                      >
                        <Text style={[
                          styles.quantityButtonText,
                          selectedItem.returnQuantity >= item.quantity && styles.disabledButtonText
                        ]}>+</Text>
                      </TouchableOpacity>
                    </View>
                    
                  </View>
                )}
              </View>
            );
          })}
        </View>

        {/* Return Summary */}
        {selectedItems.length > 0 && (
          <View style={styles.summaryContainer}>
            <Text style={styles.summaryTitle}>Return Summary</Text>
            <View style={styles.summaryContent}>
              <View style={styles.summaryRow}>
                <Text style={styles.summaryLabel}>Items to Return:</Text>
                <Text style={styles.summaryValue}>
                  {selectedItems.reduce((sum, item) => sum + item.returnQuantity, 0)} items
                </Text>
              </View>
            </View>
          </View>
        )}
      </ScrollView>

      {/* Continue Button */}
      {selectedItems.length > 0 && (
        <View style={styles.continueSection}>
          <TouchableOpacity
            style={styles.continueButton}
            onPress={handleContinue}
            activeOpacity={0.8}
          >
            <Text style={styles.continueButtonText}>
              Continue to Refund {formatAmount(calculateReturnAmount())}
            </Text>
          </TouchableOpacity>
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
  },
  headerRight: {
    alignItems: 'flex-end',
  },
  selectedCount: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
  },
  invoiceInfoContainer: {
    backgroundColor: '#fef2f2',
    borderBottomWidth: 1,
    borderBottomColor: '#fecaca',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  invoiceInfoHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  invoiceInfoText: {
    marginLeft: 12,
  },
  invoiceNumber: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  invoiceDate: {
    fontSize: 14,
    color: Colors.textLight,
  },
  customerInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  customerName: {
    fontSize: 14,
    color: Colors.textLight,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 100,
  },
  itemsContainer: {
    gap: 12,
  },
  itemCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    overflow: 'hidden',
  },
  selectedItemCard: {
    borderColor: Colors.error,
    backgroundColor: '#fef2f2',
  },
  itemHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
  },
  itemLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 16,
  },
  checkboxContainer: {
    marginRight: 12,
  },
  itemInfo: {
    flex: 1,
  },
  itemName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  itemDetails: {
    fontSize: 14,
    color: Colors.textLight,
  },
  itemRight: {
    alignItems: 'flex-end',
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  itemQuantity: {
    fontSize: 12,
    color: Colors.textLight,
  },
  quantitySelector: {
    backgroundColor: Colors.background,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingHorizontal: 20,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  quantityLabel: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '600',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 20,
  },
  quantityButton: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
  },
  disabledButtonText: {
    color: Colors.textLight,
  },
  quantityValue: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    minWidth: 32,
    textAlign: 'center',
  },
  summaryContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryContent: {
    gap: 8,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
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
    paddingTop: 8,
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
    color: Colors.error,
  },
  continueSection: {
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
  continueButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 4,
    elevation: 5,
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});