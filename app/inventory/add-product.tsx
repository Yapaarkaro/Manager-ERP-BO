import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { ArrowLeft, Scan, CreditCard as Edit, Package } from 'lucide-react-native';

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

export default function AddProductScreen() {
  const handleScanBarcode = () => {
    router.push('/inventory/scan-product');
  };

  const handleManualEntry = () => {
    router.push('/inventory/manual-product');
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
          
          <Text style={styles.headerTitle}>Add New Product</Text>
        </View>
      </SafeAreaView>

      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Instructions */}
        <View style={styles.instructionsContainer}>
          <Text style={styles.instructionsTitle}>Choose How to Add Product</Text>
          <Text style={styles.instructionsText}>
            You can either scan a barcode to auto-fill product details or enter all information manually.
          </Text>
        </View>

        {/* Add Product Options */}
        <View style={styles.optionsContainer}>
          {/* Scan Barcode Option */}
          <TouchableOpacity
            style={[styles.optionCard, styles.scanCard]}
            onPress={handleScanBarcode}
            activeOpacity={0.7}
          >
            <View style={styles.optionIconContainer}>
              <Scan size={32} color={Colors.primary} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Scan Barcode</Text>
              <Text style={styles.optionDescription}>
                Scan product barcode to automatically fill in product details
              </Text>
              <View style={styles.optionFeatures}>
                <Text style={styles.featureText}>• Auto-fill product name</Text>
                <Text style={styles.featureText}>• Auto-fill HSN code</Text>
                <Text style={styles.featureText}>• Auto-fill tax rate</Text>
                <Text style={styles.featureText}>• Quick and accurate</Text>
              </View>
            </View>
            <View style={styles.optionArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>

          {/* Manual Entry Option */}
          <TouchableOpacity
            style={[styles.optionCard, styles.manualCard]}
            onPress={handleManualEntry}
            activeOpacity={0.7}
          >
            <View style={styles.optionIconContainer}>
              <Edit size={32} color={Colors.success} />
            </View>
            <View style={styles.optionContent}>
              <Text style={styles.optionTitle}>Manual Entry</Text>
              <Text style={styles.optionDescription}>
                Enter all product details manually for complete control
              </Text>
              <View style={styles.optionFeatures}>
                <Text style={styles.featureText}>• Full customization</Text>
                <Text style={styles.featureText}>• Add custom details</Text>
                <Text style={styles.featureText}>• Set pricing strategy</Text>
                <Text style={styles.featureText}>• Complete flexibility</Text>
              </View>
            </View>
            <View style={styles.optionArrow}>
              <Text style={styles.arrowText}>→</Text>
            </View>
          </TouchableOpacity>
        </View>

        {/* Quick Stats */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsTitle}>Current Inventory</Text>
          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Package size={20} color={Colors.primary} />
              <Text style={styles.statLabel}>Total Products</Text>
              <Text style={[styles.statValue, { color: Colors.primary }]}>
                156
              </Text>
            </View>
            
            <View style={styles.statCard}>
              <Text style={styles.statLabel}>Categories</Text>
              <Text style={[styles.statValue, { color: Colors.success }]}>
                8
              </Text>
            </View>
          </View>
        </View>
      </ScrollView>
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 24,
  },
  instructionsContainer: {
    alignItems: 'center',
    marginBottom: 32,
  },
  instructionsTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 8,
  },
  instructionsText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 22,
    paddingHorizontal: 16,
  },
  optionsContainer: {
    gap: 20,
    marginBottom: 32,
  },
  optionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    borderWidth: 2,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
  },
  scanCard: {
    borderColor: Colors.primary,
    backgroundColor: '#f0f4ff',
  },
  manualCard: {
    borderColor: Colors.success,
    backgroundColor: '#f0fdf4',
  },
  optionIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 16,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 2,
  },
  optionContent: {
    flex: 1,
  },
  optionTitle: {
    fontSize: 20,
    fontWeight: '700',
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
    fontSize: 12,
    color: Colors.textLight,
    lineHeight: 16,
  },
  optionArrow: {
    marginLeft: 16,
  },
  arrowText: {
    fontSize: 24,
    color: Colors.textLight,
    fontWeight: '300',
  },
  statsContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 16,
    padding: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  statsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  statsGrid: {
    flexDirection: 'row',
    gap: 16,
  },
  statCard: {
    flex: 1,
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginVertical: 8,
  },
  statValue: {
    fontSize: 16,
    fontWeight: '700',
  },
});