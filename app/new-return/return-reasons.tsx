import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, MessageSquare, Check, X, TriangleAlert as AlertTriangle } from 'lucide-react-native';

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

const presetReasons = [
  'Defective product',
  'Wrong item delivered',
  'Damaged during shipping',
  'Customer changed mind',
  'Wrong specification',
  'Quality issues',
  'Size/fit issues',
  'Not as described',
  'Duplicate order',
  'Others'
];

interface ItemReason {
  itemId: string;
  reason: string;
}

export default function ReturnReasonsScreen() {
  const { invoiceData, selectedItems, returnAmount } = useLocalSearchParams();
  const invoice = JSON.parse(invoiceData as string);
  const items = JSON.parse(selectedItems as string);
  
  const [itemReasons, setItemReasons] = useState<ItemReason[]>(
    items.map((item: any) => ({ itemId: item.id, reason: '' }))
  );
  const [showReasonModal, setShowReasonModal] = useState(false);
  const [currentItemId, setCurrentItemId] = useState<string | null>(null);
  const [customReason, setCustomReason] = useState('');

  const handleReasonSelect = (itemId: string) => {
    setCurrentItemId(itemId);
    setShowReasonModal(true);
  };

  const handlePresetReasonSelect = (reason: string) => {
    if (!currentItemId) return;

    if (reason === 'Others') {
      setCustomReason('');
      // Keep modal open for custom input
    } else {
      setItemReasons(prev => 
        prev.map(item => 
          item.itemId === currentItemId 
            ? { ...item, reason }
            : item
        )
      );
      setShowReasonModal(false);
      setCurrentItemId(null);
    }
  };

  const handleCustomReasonSubmit = () => {
    if (!currentItemId || !customReason.trim()) {
      Alert.alert('Invalid Reason', 'Please enter a valid reason');
      return;
    }

    setItemReasons(prev => 
      prev.map(item => 
        item.itemId === currentItemId 
          ? { ...item, reason: customReason.trim() }
          : item
      )
    );
    
    setShowReasonModal(false);
    setCurrentItemId(null);
    setCustomReason('');
  };

  const getItemReason = (itemId: string) => {
    return itemReasons.find(item => item.itemId === itemId)?.reason || '';
  };

  const isFormValid = () => {
    return itemReasons.every(item => item.reason.trim().length > 0);
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 2,
    }).format(amount);
  };

  const handleContinue = () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Reasons', 'Please provide return reason for all items');
      return;
    }

    router.push({
      pathname: '/new-return/refund-method',
      params: {
        invoiceData: JSON.stringify(invoice),
        selectedItems: JSON.stringify(items),
        itemReasons: JSON.stringify(itemReasons),
        returnAmount
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
          
          <Text style={styles.headerTitle}>Return Reasons</Text>
          
          <View style={styles.headerRight}>
            <Text style={styles.returnAmountHeader}>
              {formatAmount(parseFloat(returnAmount as string))}
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Instructions */}
      <View style={styles.instructionsContainer}>
        <AlertTriangle size={20} color={Colors.warning} />
        <Text style={styles.instructionsText}>
          Please specify the reason for returning each item
        </Text>
      </View>

      {/* Items with Reasons */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.itemsContainer}>
          {items.map((item: any) => {
            const reason = getItemReason(item.id);
            const itemReturnAmount = (item.rate * item.returnQuantity) * (1 + item.taxRate / 100);

            return (
              <View key={item.id} style={styles.itemCard}>
                <View style={styles.itemHeader}>
                  <View style={styles.itemInfo}>
                    <Text style={styles.itemName}>{item.name}</Text>
                    <Text style={styles.itemDetails}>
                      Return Qty: {item.returnQuantity} • Amount: {formatAmount(itemReturnAmount)}
                    </Text>
                  </View>
                </View>

                <TouchableOpacity
                  style={[
                    styles.reasonSelector,
                    reason && styles.reasonSelected
                  ]}
                  onPress={() => handleReasonSelect(item.id)}
                  activeOpacity={0.7}
                >
                  <MessageSquare size={20} color={reason ? Colors.error : Colors.textLight} />
                  <Text style={[
                    styles.reasonText,
                    reason ? styles.reasonTextSelected : styles.reasonTextPlaceholder
                  ]}>
                    {reason || 'Select return reason'}
                  </Text>
                  {reason && (
                    <Check size={16} color={Colors.error} />
                  )}
                </TouchableOpacity>
              </View>
            );
          })}
        </View>

        {/* Summary */}
        <View style={styles.summaryContainer}>
          <Text style={styles.summaryTitle}>Return Summary</Text>
          <View style={styles.summaryRow}>
            <Text style={styles.summaryLabel}>Total Items:</Text>
            <Text style={styles.summaryValue}>
              {items.reduce((sum: number, item: any) => sum + item.returnQuantity, 0)}
            </Text>
          </View>
          <View style={[styles.summaryRow, styles.totalRow]}>
            <Text style={styles.totalLabel}>Total Refund:</Text>
            <Text style={styles.totalValue}>
              {formatAmount(parseFloat(returnAmount as string))}
            </Text>
          </View>
        </View>
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.continueSection}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            !isFormValid() && styles.disabledButton
          ]}
          onPress={handleContinue}
          disabled={!isFormValid()}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.continueButtonText,
            !isFormValid() && styles.disabledButtonText
          ]}>
            Continue to Refund Method
          </Text>
        </TouchableOpacity>
      </View>

      {/* Reason Selection Modal */}
      <Modal
        visible={showReasonModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowReasonModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Return Reason</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowReasonModal(false)}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.reasonsList} showsVerticalScrollIndicator={false}>
              {presetReasons.map((reason, index) => (
                <TouchableOpacity
                  key={index}
                  style={styles.reasonOption}
                  onPress={() => handlePresetReasonSelect(reason)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.reasonOptionText}>{reason}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            {/* Custom Reason Input */}
            {presetReasons.includes('Others') && (
              <View style={styles.customReasonContainer}>
                <Text style={styles.customReasonLabel}>Custom Reason:</Text>
                <TextInput
                  style={styles.customReasonInput}
                  value={customReason}
                  onChangeText={setCustomReason}
                  placeholder="Enter custom return reason"
                  placeholderTextColor={Colors.textLight}
                  multiline
                  numberOfLines={3}
                  textAlignVertical="top"
                />
                <TouchableOpacity
                  style={[
                    styles.customReasonButton,
                    !customReason.trim() && styles.disabledButton
                  ]}
                  onPress={handleCustomReasonSubmit}
                  disabled={!customReason.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={[
                    styles.customReasonButtonText,
                    !customReason.trim() && styles.disabledButtonText
                  ]}>
                    Use Custom Reason
                  </Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>
      </Modal>
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
  returnAmountHeader: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.error,
  },
  instructionsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fffbeb',
    borderBottomWidth: 1,
    borderBottomColor: '#fde68a',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: '#92400e',
    flex: 1,
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
  itemHeader: {
    padding: 16,
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
  reasonSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 12,
  },
  reasonSelected: {
    backgroundColor: '#fef2f2',
    borderTopColor: Colors.error,
  },
  reasonText: {
    flex: 1,
    fontSize: 14,
  },
  reasonTextSelected: {
    color: Colors.text,
    fontWeight: '500',
  },
  reasonTextPlaceholder: {
    color: Colors.textLight,
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
  totalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 8,
    marginTop: 8,
    marginBottom: 0,
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
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  disabledButtonText: {
    color: Colors.textLight,
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
    maxHeight: '80%',
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  reasonsList: {
    maxHeight: 300,
  },
  reasonOption: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  reasonOptionText: {
    fontSize: 16,
    color: Colors.text,
  },
  customReasonContainer: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  customReasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  customReasonInput: {
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 16,
    minHeight: 80,
    
  },
  customReasonButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 12,
    alignItems: 'center',
  },
  customReasonButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});