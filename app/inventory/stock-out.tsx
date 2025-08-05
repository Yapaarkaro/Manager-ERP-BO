import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Check,
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

const stockOutReasons = [
  'Expired',
  'Damaged',
  'Sample Given',
  'Internal Use',
  'Inventory Shrinkage',
  'Disposed',
  'Recalled or Returned to Supplier',
  'Other'
];

export default function StockOutScreen() {
  const [selectedReason, setSelectedReason] = useState<string>('');
  const [otherReason, setOtherReason] = useState<string>('');

  const handleReasonSelect = (reason: string) => {
    setSelectedReason(reason);
    if (reason !== 'Other') {
      setOtherReason('');
    }
  };

  const handleContinue = () => {
    if (!selectedReason) {
      return;
    }

    const finalReason = selectedReason === 'Other' ? otherReason : selectedReason;
    
    router.push({
      pathname: '/inventory/stock-out/select-products',
      params: {
        reason: finalReason
      }
    });
  };

  const isContinueDisabled = !selectedReason || (selectedReason === 'Other' && !otherReason.trim());

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
        
        <Text style={styles.headerTitle}>Stock Out</Text>
      </View>

      <ScrollView 
        style={styles.content}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        <Text style={styles.title}>Select Reason for Stock Out</Text>
        <Text style={styles.description}>
          Choose the reason why you're removing items from your inventory
        </Text>

        {/* Reason Options */}
        <View style={styles.reasonsContainer}>
          {stockOutReasons.map((reason) => (
            <TouchableOpacity
              key={reason}
              style={[
                styles.reasonCard,
                selectedReason === reason && styles.reasonCardSelected
              ]}
              onPress={() => handleReasonSelect(reason)}
              activeOpacity={0.8}
            >
              <View style={styles.reasonContent}>
                <Text style={[
                  styles.reasonText,
                  selectedReason === reason && styles.reasonTextSelected
                ]}>
                  {reason}
                </Text>
                {selectedReason === reason && (
                  <Check size={20} color={Colors.primary} />
                )}
              </View>
            </TouchableOpacity>
          ))}
        </View>

        {/* Other Reason Input */}
        {selectedReason === 'Other' && (
          <View style={styles.otherReasonContainer}>
            <Text style={styles.otherReasonLabel}>Specify Reason</Text>
            <TextInput
              style={styles.otherReasonInput}
              placeholder="Enter the reason for stock out..."
              placeholderTextColor={Colors.textLight}
              value={otherReason}
              onChangeText={setOtherReason}
              multiline
              numberOfLines={3}
            />
          </View>
        )}
      </ScrollView>

      {/* Continue Button */}
      <View style={styles.floatingButtonContainer}>
        <TouchableOpacity
          style={[
            styles.continueButton,
            isContinueDisabled && styles.continueButtonDisabled
          ]}
          onPress={handleContinue}
          disabled={isContinueDisabled}
          activeOpacity={0.8}
        >
          <Text style={[
            styles.continueButtonText,
            isContinueDisabled && styles.continueButtonTextDisabled
          ]}>
            Continue
          </Text>
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
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  description: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  reasonsContainer: {
    gap: 12,
  },
  reasonCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
  },
  reasonCardSelected: {
    borderColor: Colors.primary,
    backgroundColor: Colors.grey[50],
  },
  reasonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  reasonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  reasonTextSelected: {
    color: Colors.primary,
    fontWeight: '600',
  },
  otherReasonContainer: {
    marginTop: 20,
  },
  otherReasonLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  otherReasonInput: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    fontSize: 16,
    color: Colors.text,
    textAlignVertical: 'top',
    minHeight: 80,
  },
  floatingButtonContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    backgroundColor: Colors.background,
    borderRadius: 12,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 8,
  },
  continueButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
    margin: 4,
  },
  continueButtonDisabled: {
    backgroundColor: Colors.grey[200],
  },
  continueButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  continueButtonTextDisabled: {
    color: Colors.textLight,
  },
}); 