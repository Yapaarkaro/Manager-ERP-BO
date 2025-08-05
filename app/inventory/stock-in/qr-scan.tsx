import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import {
  ArrowLeft,
  QrCode,
  Camera,
  AlertTriangle,
} from 'lucide-react-native';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

// Calculate responsive values with platform-specific adjustments
const headerPaddingHorizontal = Math.max(16, screenWidth * 0.04);
const headerPaddingVertical = Math.max(12, screenHeight * 0.015) + (Platform.OS === 'android' ? 8 : 0);
const backButtonWidth = Math.max(40, screenWidth * 0.1);
const backButtonHeight = Math.max(40, screenHeight * 0.05);
const backButtonMarginRight = Math.max(16, screenWidth * 0.04);
const headerTitleFontSize = Math.max(18, screenWidth * 0.045);

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

export default function QRScanScreen() {
  const [isScanning, setIsScanning] = useState(false);

  const handleScanQR = () => {
    setIsScanning(true);
    
    // Simulate QR code scanning
    setTimeout(() => {
      setIsScanning(false);
      
      // Mock QR code data
      const mockQRData = {
        invoiceNumber: 'INV-2024-001',
        supplierName: 'ABC Suppliers Pvt Ltd',
        supplierGSTIN: '27ABCDE1234F1Z5',
        invoiceDate: '2024-01-25',
        products: [
          {
            id: 'prod_1',
            name: 'Laptop',
            billedQuantity: 10,
            unitPrice: 45000,
            totalPrice: 450000,
          },
          {
            id: 'prod_2',
            name: 'Mouse',
            billedQuantity: 20,
            unitPrice: 500,
            totalPrice: 10000,
          },
        ],
        totalAmount: 460000,
      };
      
      // Navigate to verify stock with QR data
      router.push({
        pathname: '/inventory/stock-in/verify-stock',
        params: {
          qrData: JSON.stringify(mockQRData)
        }
      });
    }, 2000);
  };

  const handleManualEntry = () => {
    Alert.alert(
      'Manual Entry',
      'Would you like to enter invoice details manually instead?',
      [
        {
          text: 'Cancel',
          style: 'cancel'
        },
        {
          text: 'Manual Entry',
          onPress: () => router.push('/inventory/stock-in/manual')
        }
      ]
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
        <View style={styles.header}>
                  <TouchableOpacity
          style={styles.backButton}
          onPress={() => {
            // Try to go back, if no previous screen, go to stock in options
            try {
              router.back();
            } catch (error) {
              router.replace('/inventory/stock-in');
            }
          }}
          activeOpacity={0.7}
        >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Scan Manager QR Code</Text>
        </View>

        <ScrollView 
          style={styles.scrollView}
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
        >
          <View style={styles.scanContainer}>
            <View style={styles.qrIconContainer}>
              <QrCode size={80} color={Colors.primary} />
            </View>
            
            <Text style={styles.scanTitle}>Scan Manager Invoice QR Code</Text>
            <Text style={styles.scanDescription}>
              Point your camera at the QR code on your Manager invoice to automatically load product details and verify quantities.
            </Text>
            
            <View style={styles.featuresList}>
              <Text style={styles.featureText}>• Automatic product verification</Text>
              <Text style={styles.featureText}>• Compare received vs billed quantities</Text>
              <Text style={styles.featureText}>• Report discrepancies if any</Text>
              <Text style={styles.featureText}>• Quick stock verification process</Text>
            </View>
          </View>

          <View style={styles.actionButtons}>
            <TouchableOpacity
              style={[
                styles.scanButton,
                isScanning && styles.scanningButton
              ]}
              onPress={handleScanQR}
              activeOpacity={0.8}
              disabled={isScanning}
            >
              <Camera size={24} color={Colors.background} />
              <Text style={styles.scanButtonText}>
                {isScanning ? 'Scanning...' : 'Start Scanning'}
              </Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.manualButton}
              onPress={handleManualEntry}
              activeOpacity={0.8}
            >
              <AlertTriangle size={20} color={Colors.text} />
              <Text style={styles.manualButtonText}>Manual Entry Instead</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.instructionsContainer}>
            <Text style={styles.instructionsTitle}>Instructions:</Text>
            <Text style={styles.instructionsText}>
              1. Ensure the QR code is clearly visible on your Manager invoice{'\n'}
              2. Hold your device steady and point the camera at the QR code{'\n'}
              3. The app will automatically detect and load invoice details{'\n'}
              4. Verify received quantities against billed quantities{'\n'}
              5. Report any discrepancies found
            </Text>
          </View>
        </ScrollView>
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
    paddingHorizontal: headerPaddingHorizontal,
    paddingVertical: headerPaddingVertical,
  },
  backButton: {
    width: backButtonWidth,
    height: backButtonHeight,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: backButtonMarginRight,
  },
  headerTitle: {
    fontSize: headerTitleFontSize,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  scanContainer: {
    alignItems: 'center',
    paddingVertical: 40,
  },
  qrIconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.grey[50],
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 24,
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  scanTitle: {
    fontSize: 24,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 12,
  },
  scanDescription: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 24,
  },
  featuresList: {
    gap: 8,
  },
  featureText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  actionButtons: {
    gap: 16,
    marginBottom: 32,
  },
  scanButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  scanningButton: {
    backgroundColor: Colors.grey[300],
  },
  scanButtonText: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.background,
  },
  manualButton: {
    backgroundColor: Colors.grey[100],
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  manualButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  instructionsContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
  },
  instructionsTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  instructionsText: {
    fontSize: 14,
    color: Colors.textLight,
    lineHeight: 20,
  },
}); 