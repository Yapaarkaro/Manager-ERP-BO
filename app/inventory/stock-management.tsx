import React from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  Package,
  ArrowUpRight,
  ArrowDownLeft,
  ShoppingCart,
  ArrowRight,
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

  const handleNewSale = () => {
    router.push('/new-sale');
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Try to go back, if no previous screen, go to dashboard
            try {
              router.back();
            } catch (error) {
              router.replace('/dashboard');
            }
          }}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Stock Management</Text>
      </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Choose the type of stock operation or sales process you want to perform
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
                Add new inventory from purchase invoices, receipts, and incoming goods.
              </Text>
              <View style={styles.optionFeatures}>
                <Text style={styles.featureText}>• Purchase invoice processing</Text>
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
                Record inventory adjustments, damages, transfers, and other non-sales removals.
              </Text>
              <View style={styles.optionFeatures}>
                <Text style={styles.featureText}>• Damaged/expired items</Text>
                <Text style={styles.featureText}>• Internal use & samples</Text>
                <Text style={styles.featureText}>• Inventory adjustments</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* New Sale Section */}
          <View style={styles.newSaleSection}>
            <Text style={styles.newSaleQuestion}>Looking to make a sale?</Text>
            <TouchableOpacity
              style={styles.newSaleButton}
              onPress={handleNewSale}
              activeOpacity={0.8}
            >
              <ShoppingCart size={20} color={Colors.background} />
              <Text style={styles.newSaleButtonText}>Create New Sale</Text>
            </TouchableOpacity>
          </View>
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
    paddingHorizontal: 16,
    paddingVertical: 20,
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
  newSaleSection: {
    backgroundColor: Colors.primary + '10',
    borderRadius: 12,
    padding: 20,
    marginBottom: 16,
    alignItems: 'center',
  },
  newSaleQuestion: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 16,
    textAlign: 'center',
  },
  newSaleButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    paddingHorizontal: 24,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  newSaleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
    marginLeft: 8,
  },
}); 