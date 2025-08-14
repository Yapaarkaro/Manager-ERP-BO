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
  TrendingUp,
  TrendingDown,
  Plus,
  Minus,
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

interface FormData {
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

const incomeTypes = [
  { id: 'sales', name: 'Sales Revenue', icon: TrendingUp },
  { id: 'services', name: 'Service Income', icon: FileText },
  { id: 'investments', name: 'Investment Income', icon: TrendingUp },
  { id: 'rental', name: 'Rental Income', icon: Building },
  { id: 'commission', name: 'Commission', icon: Users },
  { id: 'refunds', name: 'Refunds', icon: TrendingDown },
  { id: 'interest', name: 'Interest Income', icon: TrendingUp },
  { id: 'other', name: 'Other Income', icon: MoreHorizontal },
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

export default function IncomeExpenseToggleScreen() {
  const [mode, setMode] = useState<'income' | 'expense'>('expense');
  const [formData, setFormData] = useState<FormData>({
    type: '',
    amount: '',
    paymentMethod: '',
    notes: '',
    proofImage: '',
    customType: '',
  });

  const [showTypeModal, setShowTypeModal] = useState(false);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showCustomTypeModal, setShowCustomTypeModal] = useState(false);

  const updateFormData = (field: keyof FormData, value: string) => {
    setFormData(prev => ({ ...prev, [field]: value }));
  };

  const handleTypeSelect = (type: string) => {
    if (type === 'other') {
      setShowCustomTypeModal(true);
      setShowTypeModal(false);
    } else {
      updateFormData('type', type);
      setShowTypeModal(false);
    }
  };

  const handlePaymentMethodSelect = (method: string) => {
    updateFormData('paymentMethod', method);
    setShowPaymentModal(false);
  };

  const handleImageCapture = () => {
    // Mock image capture
    updateFormData('proofImage', 'https://images.pexels.com/photos/1234567/pexels-photo-1234567.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1');
    Alert.alert('Success', 'Proof image captured successfully');
  };

  const removeImage = () => {
    updateFormData('proofImage', '');
  };

  const isFormValid = () => {
    return formData.type && formData.amount && formData.paymentMethod;
  };

  const handleSubmit = () => {
    if (!isFormValid()) {
      Alert.alert('Incomplete Form', 'Please fill in all required fields');
      return;
    }

    Alert.alert(
      'Success',
      `${mode === 'income' ? 'Income' : 'Expense'} recorded successfully`,
      [
        {
          text: 'OK',
          onPress: () => router.back(),
        },
      ]
    );
  };

  const getTypeIcon = (typeId: string) => {
    const types = mode === 'income' ? incomeTypes : expenseTypes;
    const type = types.find(t => t.id === typeId);
    return type?.icon || MoreHorizontal;
  };

  const getTypeName = (typeId: string) => {
    if (typeId === 'other' && formData.customType) {
      return formData.customType;
    }
    const types = mode === 'income' ? incomeTypes : expenseTypes;
    const type = types.find(t => t.id === typeId);
    return type?.name || 'Other';
  };

  const currentTypes = mode === 'income' ? incomeTypes : expenseTypes;

  return (
    <View style={styles.container}>
      {/* Header */}
      <SafeAreaView style={[
        styles.headerSafeArea,
        mode === 'income' && styles.headerSafeAreaIncome,
        mode === 'expense' && styles.headerSafeAreaExpense
      ]}>
        <View style={[
          styles.header,
          mode === 'income' && styles.headerIncome,
          mode === 'expense' && styles.headerExpense
        ]}>
          <View style={styles.backButtonContainer}>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => router.back()}
              activeOpacity={0.7}
            >
              <ArrowLeft size={24} color={mode === 'income' ? '#ffffff' : mode === 'expense' ? '#ffffff' : Colors.text} />
            </TouchableOpacity>
          </View>
          
          <View style={styles.titleContainer}>
            <Text style={[
              styles.headerTitle,
              mode === 'income' && styles.headerTitleIncome,
              mode === 'expense' && styles.headerTitleExpense
            ]}>
              Add
            </Text>
          </View>
          
          <View style={styles.spacerContainer} />
        </View>
        
        <View style={[
          styles.toggleContainer,
          mode === 'income' && styles.toggleContainerIncome,
          mode === 'expense' && styles.toggleContainerExpense
        ]}>
          <TouchableOpacity
            style={styles.modeToggle}
            onPress={() => setMode(mode === 'income' ? 'expense' : 'income')}
            activeOpacity={0.7}
          >
            <View style={[
              styles.toggleButton,
              mode === 'income' && styles.toggleButtonIncome
            ]}>
              <TrendingUp size={18} color={mode === 'income' ? '#ffffff' : Colors.success} />
              <Text style={[
                styles.toggleText,
                mode === 'income' && styles.toggleTextActive
              ]}>Income</Text>
            </View>
            <View style={[
              styles.toggleButton,
              mode === 'expense' && styles.toggleButtonExpense
            ]}>
              <TrendingDown size={18} color={mode === 'expense' ? '#ffffff' : Colors.error} />
              <Text style={[
                styles.toggleText,
                mode === 'expense' && styles.toggleTextActive
              ]}>Expense</Text>
            </View>
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Type Selection */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            {mode === 'income' ? 'Income' : 'Expense'} Type
          </Text>
          
          <TouchableOpacity
            style={styles.inputField}
            onPress={() => setShowTypeModal(true)}
            activeOpacity={0.7}
          >
            {formData.type ? (
              <View style={styles.selectedType}>
                {React.createElement(getTypeIcon(formData.type), {
                  size: 20,
                  color: Colors.primary
                })}
                <Text style={styles.selectedTypeText}>
                  {getTypeName(formData.type)}
                </Text>
              </View>
            ) : (
              <Text style={styles.placeholderText}>
                Select {mode === 'income' ? 'income' : 'expense'} type
              </Text>
            )}
            <ArrowLeft size={20} color={Colors.textLight} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        </View>

        {/* Amount */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Amount</Text>
          
          <View style={styles.amountContainer}>
            <View style={styles.currencyIcon}>
              <IndianRupee size={20} color={Colors.textLight} />
            </View>
            <TextInput
              style={styles.amountInput}
              placeholder="0.00"
              value={formData.amount}
              onChangeText={(text) => updateFormData('amount', text)}
              keyboardType="numeric"
              placeholderTextColor={Colors.textLight}
            />
          </View>
        </View>

        {/* Payment Method */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Payment Method</Text>
          
          <TouchableOpacity
            style={styles.inputField}
            onPress={() => setShowPaymentModal(true)}
            activeOpacity={0.7}
          >
            {formData.paymentMethod ? (
              <Text style={styles.selectedText}>{formData.paymentMethod}</Text>
            ) : (
              <Text style={styles.placeholderText}>Select payment method</Text>
            )}
            <ArrowLeft size={20} color={Colors.textLight} style={{ transform: [{ rotate: '180deg' }] }} />
          </TouchableOpacity>
        </View>

        {/* Notes */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Notes</Text>
          
          <TextInput
            style={styles.notesInput}
            placeholder="Add notes (optional)"
            value={formData.notes}
            onChangeText={(text) => updateFormData('notes', text)}
            multiline
            numberOfLines={3}
            placeholderTextColor={Colors.textLight}
          />
        </View>

        {/* Proof */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Proof</Text>
          
          {formData.proofImage ? (
            <View style={styles.proofContainer}>
              <Image source={{ uri: formData.proofImage }} style={styles.proofImage} />
              <TouchableOpacity
                style={styles.removeProofButton}
                onPress={removeImage}
                activeOpacity={0.7}
              >
                <Text style={styles.removeProofText}>Remove</Text>
              </TouchableOpacity>
            </View>
          ) : (
            <TouchableOpacity
              style={styles.addProofButton}
              onPress={handleImageCapture}
              activeOpacity={0.7}
            >
              <Camera size={24} color={Colors.primary} />
              <Text style={styles.addProofText}>Add Proof</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Submit Button */}
        <TouchableOpacity
          style={[
            styles.submitButton,
            !isFormValid() && styles.submitButtonDisabled
          ]}
          onPress={handleSubmit}
          disabled={!isFormValid()}
          activeOpacity={0.8}
        >
          <Text style={styles.submitButtonText}>
            Record {mode === 'income' ? 'Income' : 'Expense'}
          </Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Type Selection Modal */}
      {showTypeModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Select {mode === 'income' ? 'Income' : 'Expense'} Type
              </Text>
              <TouchableOpacity
                onPress={() => setShowTypeModal(false)}
                activeOpacity={0.7}
              >
                <ArrowLeft size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {currentTypes.map((type) => {
                const IconComponent = type.icon;
                return (
                  <TouchableOpacity
                    key={type.id}
                    style={styles.typeOption}
                    onPress={() => handleTypeSelect(type.id)}
                    activeOpacity={0.7}
                  >
                    <IconComponent size={24} color={Colors.primary} />
                    <Text style={styles.typeOptionText}>{type.name}</Text>
                  </TouchableOpacity>
                );
              })}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Payment Method Modal */}
      {showPaymentModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Payment Method</Text>
              <TouchableOpacity
                onPress={() => setShowPaymentModal(false)}
                activeOpacity={0.7}
              >
                <ArrowLeft size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <ScrollView style={styles.modalScroll}>
              {paymentMethods.map((method) => (
                <TouchableOpacity
                  key={method}
                  style={styles.paymentOption}
                  onPress={() => handlePaymentMethodSelect(method)}
                  activeOpacity={0.7}
                >
                  <Text style={styles.paymentOptionText}>{method}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      )}

      {/* Custom Type Modal */}
      {showCustomTypeModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                Specify {mode === 'income' ? 'Income' : 'Expense'} Type
              </Text>
              <TouchableOpacity
                onPress={() => setShowCustomTypeModal(false)}
                activeOpacity={0.7}
              >
                <ArrowLeft size={24} color={Colors.text} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.modalScroll}>
              <View style={styles.customTypeContainer}>
                <Text style={styles.customTypeLabel}>
                  Enter {mode === 'income' ? 'income' : 'expense'} type:
                </Text>
                <TextInput
                  style={styles.customTypeInput}
                  placeholder={`e.g., ${mode === 'income' ? 'Freelance Work' : 'Office Cleaning'}`}
                  value={formData.customType}
                  onChangeText={(text) => updateFormData('customType', text)}
                  placeholderTextColor={Colors.textLight}
                />
                <TouchableOpacity
                  style={[
                    styles.customTypeSubmit,
                    !formData.customType.trim() && styles.customTypeSubmitDisabled
                  ]}
                  onPress={() => {
                    if (formData.customType.trim()) {
                      updateFormData('type', 'other');
                      setShowCustomTypeModal(false);
                    }
                  }}
                  disabled={!formData.customType.trim()}
                  activeOpacity={0.8}
                >
                  <Text style={styles.customTypeSubmitText}>Save</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
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
  headerSafeAreaIncome: {
    backgroundColor: Colors.success,
    borderBottomColor: Colors.success,
  },
  headerSafeAreaExpense: {
    backgroundColor: Colors.error,
    borderBottomColor: Colors.error,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Colors.background,
  },
  headerIncome: {
    backgroundColor: Colors.success,
  },
  headerExpense: {
    backgroundColor: Colors.error,
  },
  backButtonContainer: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  backButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  spacerContainer: {
    width: 40,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
  },
  headerTitleIncome: {
    color: '#ffffff',
  },
  headerTitleExpense: {
    color: '#ffffff',
  },
  toggleContainer: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    backgroundColor: Colors.background,
  },
  toggleContainerIncome: {
    backgroundColor: Colors.success,
  },
  toggleContainerExpense: {
    backgroundColor: Colors.error,
  },
  modeToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 20,
    padding: 4,
    width: '100%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
    overflow: 'hidden',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 16,
    gap: 6,
    flex: 1,
    justifyContent: 'center',
    overflow: 'hidden',
  },
  toggleButtonIncome: {
    backgroundColor: Colors.success,
  },
  toggleButtonExpense: {
    backgroundColor: Colors.error,
  },
  toggleText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
  },
  toggleTextActive: {
    color: '#ffffff',
    fontWeight: '700',
  },

  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
  },
  section: {
    marginBottom: 24,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputField: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  selectedType: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  selectedTypeText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  selectedText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  placeholderText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  amountContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  currencyIcon: {
    marginRight: 8,
  },
  amountInput: {
    flex: 1,
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  notesInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  addProofButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grey[50],
    borderWidth: 2,
    borderColor: Colors.grey[200],
    borderStyle: 'dashed',
    borderRadius: 12,
    paddingVertical: 20,
    gap: 8,
  },
  addProofText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  proofContainer: {
    alignItems: 'center',
  },
  proofImage: {
    width: 120,
    height: 120,
    borderRadius: 12,
    marginBottom: 8,
  },
  removeProofButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 8,
  },
  removeProofText: {
    color: '#ffffff',
    fontSize: 14,
    fontWeight: '500',
  },
  submitButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    marginTop: 8,
  },
  submitButtonDisabled: {
    backgroundColor: Colors.grey[300],
  },
  submitButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'flex-end',
    zIndex: 1000,
  },
  modalContent: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    maxHeight: '70%',
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
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
  modalScroll: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  typeOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
    gap: 12,
  },
  typeOptionText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  paymentOption: {
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  paymentOptionText: {
    fontSize: 16,
    color: Colors.text,
    fontWeight: '500',
  },
  customTypeContainer: {
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  customTypeLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  customTypeInput: {
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 20,
  },
  customTypeSubmit: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  customTypeSubmitDisabled: {
    backgroundColor: Colors.grey[300],
  },
  customTypeSubmitText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
}); 