import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  CheckCircle,
  ArrowLeft,
  Home,
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

interface ExpenseData {
  type: string;
  amount: string;
  paymentMethod: string;
  notes: string;
  proofImage: string;
  customType: string;
}

export default function ExpenseSuccessScreen() {
  const { expenseData } = useLocalSearchParams();
  
  let expense: ExpenseData | null = null;
  try {
    expense = JSON.parse(expenseData as string);
  } catch (error) {
    console.error('Error parsing expense data:', error);
  }

  const formatAmount = (amount: string) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(parseFloat(amount) || 0);
  };

  const getExpenseTypeName = (type: string) => {
    const typeNames: { [key: string]: string } = {
      'rent': 'Rent',
      'utilities': 'Utilities',
      'salaries': 'Salaries and Wages',
      'office_supplies': 'Office Supplies',
      'marketing': 'Marketing and Advertising',
      'repairs': 'Repairs and Maintenance',
      'insurance': 'Insurance',
      'taxes': 'Taxes & Licenses',
      'other': 'Other',
    };
    return typeNames[type] || 'Unknown';
  };

  const handleGoHome = () => {
    router.push('/dashboard');
  };

  const handleAddAnother = () => {
    router.push('/expenses/add-expense');
  };

  return (
    <View style={styles.container}>
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.content}>
          {/* Success Icon */}
          <View style={styles.iconContainer}>
            <CheckCircle size={80} color={Colors.success} />
          </View>

          {/* Success Message */}
          <View style={styles.messageContainer}>
            <Text style={styles.successTitle}>Expense Saved Successfully!</Text>
            <Text style={styles.successMessage}>
              Your expense has been recorded and saved to your account.
            </Text>
          </View>

          {/* Expense Summary */}
          {expense && (
            <View style={styles.summaryContainer}>
              <Text style={styles.summaryTitle}>Expense Details</Text>
              
              <View style={styles.summaryCard}>
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Type:</Text>
                  <Text style={styles.summaryValue}>
                    {expense.type === 'other' ? expense.customType : getExpenseTypeName(expense.type)}
                  </Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Amount:</Text>
                  <Text style={styles.summaryValue}>{formatAmount(expense.amount)}</Text>
                </View>
                
                <View style={styles.summaryRow}>
                  <Text style={styles.summaryLabel}>Payment Method:</Text>
                  <Text style={styles.summaryValue}>{expense.paymentMethod}</Text>
                </View>
                
                {expense.notes && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Notes:</Text>
                    <Text style={styles.summaryValue}>{expense.notes}</Text>
                  </View>
                )}
                
                {expense.proofImage !== '' && (
                  <View style={styles.summaryRow}>
                    <Text style={styles.summaryLabel}>Proof:</Text>
                    <Text style={styles.summaryValue}>Image attached</Text>
                  </View>
                )}
              </View>
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            <TouchableOpacity
              style={styles.primaryButton}
              onPress={handleGoHome}
              activeOpacity={0.8}
            >
              <Home size={20} color="#ffffff" />
              <Text style={styles.primaryButtonText}>Go to Dashboard</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.secondaryButton}
              onPress={handleAddAnother}
              activeOpacity={0.8}
            >
              <Text style={styles.secondaryButtonText}>Add Another Expense</Text>
            </TouchableOpacity>
          </View>
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
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
  },
  iconContainer: {
    marginBottom: 32,
  },
  messageContainer: {
    alignItems: 'center',
    marginBottom: 40,
  },
  successTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  successMessage: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
  },
  summaryContainer: {
    width: '100%',
    marginBottom: 40,
  },
  summaryTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  summaryCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 12,
  },
  summaryLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  summaryValue: {
    fontSize: 16,
    color: Colors.text,
    flex: 2,
    textAlign: 'right',
  },
  buttonContainer: {
    width: '100%',
    gap: 16,
  },
  primaryButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    gap: 8,
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  secondaryButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    paddingVertical: 16,
  },
  secondaryButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
}); 