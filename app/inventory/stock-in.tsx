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
  FileText,
  Search,
  QrCode,
  Edit3,
  Package,
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

export default function StockInScreen() {
  const handleManualEntry = () => {
    router.push('/inventory/stock-in/manual');
  };

  const handlePOSearch = () => {
    router.push('/inventory/stock-in/po-search');
  };

  const handleQRCode = () => {
    router.push('/inventory/stock-in/qr-scan');
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
          
          <Text style={styles.headerTitle}>Stock In</Text>
        </View>

        <View style={styles.content}>
          <Text style={styles.description}>
            Choose how you want to record your stock in
          </Text>

          {/* Manual Entry Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleManualEntry}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <Edit3 size={32} color={Colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Manual Entry</Text>
              <Text style={styles.optionDescription}>
                Enter invoice details manually. Add supplier, products, and quantities.
              </Text>
              <View style={styles.optionFeatures}>
                <Text style={styles.featureText}>• Enter invoice number</Text>
                <Text style={styles.featureText}>• Add supplier manually or via GSTIN</Text>
                <Text style={styles.featureText}>• Search existing products or create new</Text>
                <Text style={styles.featureText}>• Adjust purchase prices and discounts</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* PO Search Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handlePOSearch}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <Search size={32} color={Colors.success} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>PO Search</Text>
              <Text style={styles.optionDescription}>
                Search for existing purchase orders and verify received goods.
              </Text>
              <View style={styles.optionFeatures}>
                <Text style={styles.featureText}>• Search by PO number</Text>
                <Text style={styles.featureText}>• Verify against billed quantities</Text>
                <Text style={styles.featureText}>• Report discrepancies</Text>
                <Text style={styles.featureText}>• Send discrepancy reports to supplier</Text>
              </View>
            </View>
          </TouchableOpacity>

          {/* QR Code Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleQRCode}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <QrCode size={32} color={Colors.warning} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Manager QR Code</Text>
              <Text style={styles.optionDescription}>
                Scan QR code from Manager invoices for quick stock verification.
              </Text>
              <View style={styles.optionFeatures}>
                <Text style={styles.featureText}>• Scan Manager invoice QR code</Text>
                <Text style={styles.featureText}>• Automatic product verification</Text>
                <Text style={styles.featureText}>• Compare received vs billed quantities</Text>
                <Text style={styles.featureText}>• Report discrepancies if any</Text>
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