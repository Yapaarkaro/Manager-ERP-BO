import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Alert,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Banknote, Save } from 'lucide-react-native';
import { useBusinessData, clearBusinessDataCache } from '@/hooks/useBusinessData';
import { formatCurrencyINR } from '@/utils/formatters';
import { updateBusinessCashBalance } from '@/services/backendApi';

export default function EditCashBalanceScreen() {
  const { data: businessData } = useBusinessData();
  const [cashBalance, setCashBalance] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadCurrentBalance();
  }, [businessData.business]);

  const loadCurrentBalance = () => {
    try {
      const currentBalance = businessData.business?.current_cash_balance || businessData.business?.total_cash_balance || 0;
      setCashBalance(currentBalance.toString());
    } catch (error) {
      console.error('Error loading current cash balance:', error);
    }
  };

  const formatIndianNumber = (num: string): string => {
    if (!num) return '';
    
    // Remove all non-numeric characters except decimal point
    const cleaned = num.replace(/[^0-9.]/g, '');
    const parts = cleaned.split('.');
    let integerPart = parts[0];
    const decimalPart = parts[1];
    
    if (!integerPart) return '';
    
    // Indian number formatting
    let lastThree = integerPart.substring(integerPart.length - 3);
    let otherNumbers = integerPart.substring(0, integerPart.length - 3);
    
    if (otherNumbers !== '') {
      lastThree = ',' + lastThree;
    }
    
    let formatted = otherNumbers.replace(/\B(?=(\d{2})+(?!\d))/g, ',') + lastThree;
    
    if (decimalPart !== undefined) {
      formatted += '.' + decimalPart;
    }
    
    return formatted;
  };

  const handleCashBalanceChange = (text: string) => {
    // Remove all non-numeric characters except decimal point
    const cleaned = text.replace(/[^0-9.]/g, '');
    
    // Ensure only one decimal point
    const parts = cleaned.split('.');
    if (parts.length > 2) {
      return;
    }
    
    // Limit decimal places to 2
    if (parts.length === 2 && parts[1].length > 2) {
      return;
    }
    
    setCashBalance(cleaned);
  };

  const handleSave = async () => {
    const balance = parseFloat(cashBalance);
    
    if (isNaN(balance) || balance < 0) {
      Alert.alert('Invalid Amount', 'Please enter a valid cash balance amount.');
      return;
    }

    setIsLoading(true);

    try {
      const result = await updateBusinessCashBalance(balance);
      if (!result.success) {
        throw new Error(result.error || 'Failed to update cash balance');
      }
      clearBusinessDataCache();

      Alert.alert(
        'Success',
        'Cash balance updated successfully!',
        [
          {
            text: 'OK',
            onPress: () => router.back(),
          },
        ]
      );
    } catch (error) {
      console.error('Error updating cash balance:', error);
      Alert.alert('Error', 'Failed to update cash balance. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const isFormValid = () => {
    const balance = parseFloat(cashBalance);
    return !isNaN(balance) && balance >= 0 && cashBalance.length > 0;
  };

  const formatBalanceWithSymbol = (balance: number) => {
    return formatCurrencyINR(balance);
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        {/* Header */}
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color="#3f66ac" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Edit Cash Balance</Text>
        </View>

        <View style={styles.content}>
          {/* Cash Balance Input */}
          <View style={styles.cashBalanceContainer}>
            <Text style={styles.sectionTitle}>Cash Balance</Text>
            <View style={styles.inputContainer}>
              <Banknote size={20} color="#10b981" style={styles.inputIcon} />
              <Text style={styles.currencySymbol}>₹</Text>
              <TextInput
                style={styles.input}
                value={formatIndianNumber(cashBalance)}
                onChangeText={handleCashBalanceChange}
                placeholder="0.00"
                placeholderTextColor="#999999"
                keyboardType="decimal-pad"
              />
            </View>
            <Text style={styles.fieldHint}>
              Enter the cash amount you currently have for business operations
            </Text>
            
            {cashBalance && !isNaN(parseFloat(cashBalance)) && (
              <View style={styles.previewContainer}>
                <Text style={styles.previewLabel}>Preview:</Text>
                <Text style={styles.previewValue}>
                  {formatBalanceWithSymbol(parseFloat(cashBalance))}
                </Text>
              </View>
            )}
          </View>

          {/* Save Button */}
          <TouchableOpacity
            style={[
              styles.saveButton,
              isFormValid() ? styles.enabledButton : styles.disabledButton,
            ]}
            onPress={handleSave}
            disabled={!isFormValid() || isLoading}
            activeOpacity={0.8}
          >
            <Save size={20} color={isFormValid() ? "#ffffff" : "#6b7280"} />
            <Text style={[
              styles.saveButtonText,
              isFormValid() ? styles.enabledButtonText : styles.disabledButtonText,
            ]}>
              {isLoading ? 'Saving...' : 'Save Changes'}
            </Text>
          </TouchableOpacity>
        </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#ffffff',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: '#f8f9fa',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#1a1a1a',
  },
  content: {
    flex: 1,
    padding: 24,
  },
  cashBalanceContainer: {
    backgroundColor: '#f0fdf4',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 16,
    padding: 20,
    marginBottom: 32,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
    marginBottom: 16,
    textAlign: 'center',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffffff',
    borderWidth: 2,
    borderColor: '#10b981',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 4,
    marginBottom: 8,
  },
  inputIcon: {
    marginRight: 12,
  },
  currencySymbol: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
    marginRight: 12,
  },
  input: {
    flex: 1,
    paddingVertical: 14,
    fontSize: 18,
    color: '#047857',
    fontWeight: '600',
    textAlign: 'right',
  },
  fieldHint: {
    fontSize: 12,
    color: '#047857',
    textAlign: 'center',
    fontStyle: 'italic',
  },
  previewContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: '#10b981',
  },
  previewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#047857',
  },
  previewValue: {
    fontSize: 18,
    fontWeight: '700',
    color: '#047857',
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 16,
    paddingVertical: 18,
    gap: 8,
  },
  enabledButton: {
    backgroundColor: '#10b981',
  },
  disabledButton: {
    backgroundColor: '#f3f4f6',
  },
  saveButtonText: {
    fontSize: 18,
    fontWeight: '700',
  },
  enabledButtonText: {
    color: '#ffffff',
  },
  disabledButtonText: {
    color: '#6b7280',
  },
});
