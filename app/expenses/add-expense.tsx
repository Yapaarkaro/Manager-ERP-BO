import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Alert,
  Image,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  IndianRupee,
  FileText,
  Image as ImageIcon,
  Camera,
  CheckCircle,
  Building,
  Zap,
  Users,
  Package,
  Megaphone,
  Wrench,
  Shield,
  FileSpreadsheet,
  MoreHorizontal,
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

interface ExpenseFormData {
  type: string;
  amount: string;
  paymentMethod: string;
  notes: string;
  proofImage: string;
  customType: string;
}

const expenseTypes = [
  { id: 'rent', name: 'Rent', icon: Building },
  { id: 'utilities', name: 'Utilities', icon: Zap },
  { id: 'salaries', name: 'Salaries and Wages', icon: Users },
  { id: 'office_supplies', name: 'Office Supplies', icon: Package },
  { id: 'marketing', name: 'Marketing and Advertising', icon: Megaphone },
  { id: 'repairs', name: 'Repairs and Maintenance', icon: Wrench },
  { id: 'insurance', name: 'Insurance', icon: Shield },
  { id: 'taxes', name: 'Taxes & Licenses', icon: FileSpreadsheet },
  { id: 'other', name: 'Other', icon: MoreHorizontal },
];

const paymentMethods = [
  'Cash',
  'Bank Transfer',
  'UPI',
  'Credit Card',
  'Debit Card',
  'Cheque',
  'Other'
];

export default function AddExpenseScreen() {
  const [formData, setFormData] = useState<ExpenseFormData>({
    type: '',
    amount: '',
    paymentMethod: '',
    notes: '',
    proofImage: '',
    customType: '',
  });

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);

  const updateFormData = (field: keyof ExpenseFormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeSelect = (type: string) => {
    updateFormData('type', type);
    setShowTypeModal(false);
  };

  const handlePaymentSelect = (method: string) => {
    updateFormData('paymentMethod', method);
    setShowPaymentModal(false);
  };

  const handleImageCapture = () => {
    // In a real app, this would open camera/gallery
    // For now, we'll simulate image capture
    Alert.alert(
      'Capture Proof',
      'This would open camera/gallery in a real app',
      [
        { text: 'Cancel', style: 'cancel' },
        { 
          text: 'Simulate Capture', 
          onPress: () => {
            updateFormData('proofImage', 'captured_image.jpg');
            Alert.alert('Success', 'Image captured successfully!');
          }
        }
      ]
    );
  };

  const removeImage = () => {
    updateFormData('proofImage', '');
  };

  const isFormValid = () => {
    return (
      formData.type.trim().length > 0 &&
      formData.amount.trim().length > 0 &&
      formData.paymentMethod.trim().length > 0 &&
      (formData.type !== 'other' || formData.customType.trim().length > 0)
    );
  };

  const handleSubmit = () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }

    // In a real app, this would save to database
    console.log('Saving expense:', formData);
    
    // Navigate to success screen
    router.push({
      pathname: '/expenses/success',
      params: {
        expenseData: JSON.stringify(formData)
      }
    });
  };

  const getTypeIcon = (typeId: string) => {
    const type = expenseTypes.find(t => t.id === typeId);
    return type ? type.icon : MoreHorizontal;
  };

  const getTypeName = (typeId: string) => {
    const type = expenseTypes.find(t => t.id === typeId);
    return type ? type.name : 'Select Type';
  };

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
          
          <Text style={styles.headerTitle}>Add Expense</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          {/* Expense Type */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Expense Type *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowTypeModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                {formData.type ? (
                  <>
                    {React.createElement(getTypeIcon(formData.type), { 
                      size: 20, 
                      color: Colors.textLight 
                    })}
                    <Text style={styles.dropdownText}>
                      {getTypeName(formData.type)}
                    </Text>
                  </>
                ) : (
                  <>
                    <MoreHorizontal size={20} color={Colors.textLight} />
                    <Text style={[styles.dropdownText, styles.placeholderText]}>
                      Select expense type
                    </Text>
                  </>
                )}
              </View>
            </TouchableOpacity>
          </View>

          {/* Custom Type (if Other is selected) */}
          {formData.type === 'other' && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Specify Expense Type *</Text>
              <View style={styles.inputContainer}>
                <FileText size={20} color={Colors.textLight} style={styles.inputIcon} />
                <TextInput
                  style={styles.input}
                  value={formData.customType}
                  onChangeText={(text) => updateFormData('customType', text)}
                  placeholder="Enter expense type"
                  placeholderTextColor={Colors.textLight}
                  autoCapitalize="words"
                />
              </View>
            </View>
          )}

          {/* Amount */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Amount *</Text>
            <View style={styles.inputContainer}>
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.input}
                value={formData.amount}
                onChangeText={(text) => updateFormData('amount', text.replace(/[^0-9.]/g, ''))}
                placeholder="0.00"
                placeholderTextColor={Colors.textLight}
                keyboardType="decimal-pad"
              />
            </View>
          </View>

          {/* Payment Method */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Payment Method *</Text>
            <TouchableOpacity
              style={styles.dropdown}
              onPress={() => setShowPaymentModal(true)}
              activeOpacity={0.7}
            >
              <View style={styles.dropdownContent}>
                <IndianRupee size={20} color={Colors.textLight} />
                <Text style={[
                  styles.dropdownText,
                  !formData.paymentMethod && styles.placeholderText
                ]}>
                  {formData.paymentMethod || 'Select payment method'}
                </Text>
              </View>
            </TouchableOpacity>
          </View>

          {/* Notes */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Notes (Optional)</Text>
            <View style={styles.textAreaContainer}>
              <TextInput
                style={styles.textArea}
                value={formData.notes}
                onChangeText={(text) => updateFormData('notes', text)}
                placeholder="Add any additional notes..."
                placeholderTextColor={Colors.textLight}
                multiline
                numberOfLines={4}
                textAlignVertical="top"
              />
            </View>
          </View>

          {/* Proof Image */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>Proof Image (Optional)</Text>
            {formData.proofImage !== '' ? (
              <View style={styles.imageContainer}>
                <View style={styles.imagePreview}>
                  <ImageIcon size={40} color={Colors.primary} />
                  <Text style={styles.imageText}>Image Captured</Text>
                </View>
                <TouchableOpacity
                  style={styles.removeImageButton}
                  onPress={removeImage}
                  activeOpacity={0.7}
                >
                  <Text style={styles.removeImageText}>Remove</Text>
                </TouchableOpacity>
              </View>
            ) : (
              <TouchableOpacity
                style={styles.captureButton}
                onPress={handleImageCapture}
                activeOpacity={0.7}
              >
                <Camera size={24} color={Colors.primary} />
                <Text style={styles.captureButtonText}>Capture Proof</Text>
              </TouchableOpacity>
            )}
          </View>

          {/* Submit Button */}
          <View style={styles.submitSection}>
            <TouchableOpacity
              style={[
                styles.submitButton,
                !isFormValid() && styles.submitButtonDisabled
              ]}
              onPress={handleSubmit}
              activeOpacity={0.8}
              disabled={!isFormValid()}
            >
              <CheckCircle size={20} color="#ffffff" />
              <Text style={styles.submitButtonText}>Save Expense</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>

        {/* Expense Type Modal */}
        {showTypeModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Expense Type</Text>
                <TouchableOpacity
                  onPress={() => setShowTypeModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseButton}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                {expenseTypes.map((type) => (
                  <TouchableOpacity
                    key={type.id}
                    style={styles.modalOption}
                    onPress={() => handleTypeSelect(type.id)}
                    activeOpacity={0.7}
                  >
                    {React.createElement(type.icon, { 
                      size: 20, 
                      color: Colors.textLight 
                    })}
                    <Text style={styles.modalOptionText}>{type.name}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Payment Method Modal */}
        {showPaymentModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Payment Method</Text>
                <TouchableOpacity
                  onPress={() => setShowPaymentModal(false)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.modalCloseButton}>✕</Text>
                </TouchableOpacity>
              </View>
              
              <ScrollView style={styles.modalContent}>
                {paymentMethods.map((method) => (
                  <TouchableOpacity
                    key={method}
                    style={styles.modalOption}
                    onPress={() => handlePaymentSelect(method)}
                    activeOpacity={0.7}
                  >
                    <IndianRupee size={20} color={Colors.textLight} />
                    <Text style={styles.modalOptionText}>{method}</Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
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
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  dropdown: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  dropdownContent: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  dropdownText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
    flex: 1,
  },
  placeholderText: {
    color: Colors.textLight,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  inputIcon: {
    marginRight: 12,
  },
  currencySymbol: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  input: {
    fontSize: 16,
    color: Colors.text,
    flex: 1,
  },
  textAreaContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  textArea: {
    fontSize: 16,
    color: Colors.text,
    minHeight: 100,
  },
  captureButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderStyle: 'dashed',
    paddingVertical: 20,
    gap: 8,
  },
  captureButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  imageContainer: {
    alignItems: 'center',
  },
  imagePreview: {
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingVertical: 20,
    marginBottom: 12,
  },
  imageText: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 8,
  },
  removeImageButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeImageText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
  submitSection: {
    marginTop: 32,
    marginBottom: 20,
  },
  submitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.grey[300],
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '90%',
    maxHeight: '70%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
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
    fontSize: 20,
    color: Colors.textLight,
    fontWeight: '600',
  },
  modalContent: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  modalOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  modalOptionText: {
    fontSize: 16,
    color: Colors.text,
    marginLeft: 12,
  },
}); 