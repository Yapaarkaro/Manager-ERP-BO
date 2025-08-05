import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
} from 'react-native';
import { showInfo } from '@/utils/notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  Scan,
  Camera,
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

export default function ScanProductScreen() {
  const { reason } = useLocalSearchParams<{ reason: string }>();

  const handleScanBarcode = () => {
    // Simulate barcode scanning
    showInfo('Barcode scanner would open here. For demo, we\'ll simulate a scan.', 'Scan Barcode');
    
    // Simulate finding a product after a short delay
    setTimeout(() => {
      const mockProduct = {
        id: '1',
        name: 'iPhone 14 Pro 128GB',
        image: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=150&h=150&dpr=1',
        category: 'Smartphones',
        currentStock: 25,
        unitPrice: 115000,
        barcode: '1234567890123',
        supplier: 'Apple India Pvt Ltd',
        location: 'Main Warehouse - A1',
        primaryUnit: 'Piece',
      };

      router.push({
        pathname: '/inventory/stock-out/stock-details',
        params: {
          reason,
          selectedProducts: JSON.stringify([mockProduct])
        }
      });
    }, 1500);
  };

  const handleManualEntry = () => {
    // Navigate to manual product entry
    router.push({
      pathname: '/inventory/stock-out/manual-product',
      params: { reason }
    });
  };

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
        
        <Text style={styles.headerTitle}>Scan Product</Text>
      </View>

      <View style={styles.content}>
        <Text style={styles.title}>Scan Product Barcode</Text>
        <Text style={styles.description}>
          Use the camera to scan the product barcode or manually enter product details
        </Text>

        {/* Reason Display */}
        <View style={styles.reasonContainer}>
          <Text style={styles.reasonLabel}>Stock Out Reason:</Text>
          <Text style={styles.reasonText}>{reason}</Text>
        </View>

        {/* Scan Options */}
        <View style={styles.optionsContainer}>
          {/* Scan Barcode Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleScanBarcode}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <Scan size={32} color={Colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Scan Barcode</Text>
              <Text style={styles.optionDescription}>
                Use camera to scan product barcode for quick identification
              </Text>
            </View>
          </TouchableOpacity>

          {/* Manual Entry Option */}
          <TouchableOpacity
            style={styles.optionCard}
            onPress={handleManualEntry}
            activeOpacity={0.8}
          >
            <View style={styles.optionIcon}>
              <Package size={32} color={Colors.warning} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Manual Entry</Text>
              <Text style={styles.optionDescription}>
                Manually search and select products from inventory
              </Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Camera Preview Placeholder */}
        <View style={styles.cameraPreview}>
          <View style={styles.cameraFrame}>
            <Camera size={48} color={Colors.textLight} />
            <Text style={styles.cameraText}>Camera Preview</Text>
            <Text style={styles.cameraSubtext}>
              Point camera at product barcode
            </Text>
          </View>
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
  reasonContainer: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    marginBottom: 24,
  },
  reasonLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.textLight,
    marginBottom: 4,
  },
  reasonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  optionsContainer: {
    gap: 16,
    marginBottom: 24,
  },
  optionCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    flexDirection: 'row',
    alignItems: 'center',
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
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
  cameraPreview: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraFrame: {
    width: 280,
    height: 200,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.grey[200],
    borderStyle: 'dashed',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    marginTop: 12,
    marginBottom: 4,
  },
  cameraSubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
}); 