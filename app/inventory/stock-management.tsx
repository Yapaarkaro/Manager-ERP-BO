import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from 'react-native';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
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

export default function StockManagementScreen() {
  const handleStockIn = () => {
    router.push('/inventory/stock-in');
  };

  const handleStockOut = () => {
    router.push('/inventory/stock-out');
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
          
          <Text style={styles.headerTitle}>Stock Management</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Choose the type of stock operation you want to perform
          </Text>

          {/* Stock In Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleStockIn}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <ArrowDownLeft size={32} color={Colors.success} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Stock In</Text>
              <Text style={styles.optionDescription}>
                Add new inventory to your stock. Record purchases, receipts, and incoming goods.
              </Text>
              <View style={styles.optionFeatures}>
                <Text style={styles.featureText}>• Manual entry with supplier details</Text>
                <Text style={styles.featureText}>• PO-based verification</Text>
                <Text style={styles.featureText}>• QR code scanning</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* Stock Out Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleStockOut}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <ArrowUpRight size={32} color={Colors.error} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Stock Out</Text>
              <Text style={styles.optionDescription}>
                Record inventory that leaves your stock. Track sales, transfers, and adjustments.
              </Text>
              <View style={styles.optionFeatures}>
                <Text style={styles.featureText}>• Sales-based stock out</Text>
                <Text style={styles.featureText}>• Transfer to other locations</Text>
                <Text style={styles.featureText}>• Manual adjustments</Text>
              </View>
            </View>
          </TouchableOpacity>
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
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 24,
  },
  description: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 24,
  },
  optionCard: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 20,
    marginBottom: 16,
    flexDirection: 'row',
    alignItems: 'flex-start',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  optionIcon: {
    width: 60,
    height: 60,
    borderRadius: 30,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
    marginBottom: 12,
  },
  optionFeatures: {
    gap: 4,
  },
  featureText: {
    fontSize: 13,
    color: Colors.textLight,
    lineHeight: 18,
  },
}); 