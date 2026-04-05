import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { safeRouter } from '@/utils/safeRouter';
import { setNavData } from '@/utils/navStore';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { 
  ArrowLeft, 
  Flashlight,
  FlashlightOff,
} from 'lucide-react-native';
import { formatCurrencyINR } from '@/utils/formatters';
import WebBarcodeScanner from '@/components/WebBarcodeScanner';

const BARCODE_TYPES = ['code128', 'code39', 'code93', 'ean13', 'ean8', 'upc_a', 'upc_e', 'itf14', 'codabar', 'qr', 'datamatrix'] as const;

const Colors = {
  background: '#FFFFFF',
  text: '#1F2937',
  textLight: '#6B7280',
  primary: '#3f66ac',
  success: '#059669',
  error: '#DC2626',
  warning: '#D97706',
};

export default function ScanInvoiceScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);

  if (Platform.OS !== 'web' && !permission) {
    return <View />;
  }

  if (Platform.OS !== 'web' && !permission?.granted) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              We need camera access to scan invoice QR codes or barcodes
            </Text>
            <TouchableOpacity
              style={styles.permissionButton}
              onPress={requestPermission}
              activeOpacity={0.8}
            >
              <Text style={styles.permissionButtonText}>Grant Permission</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </View>
    );
  }

  const handleInvoiceScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);

    const trimmedData = (data || '').trim();
    const scannedInvoice = {
      id: trimmedData || '',
      invoiceNumber: data ? `INV-${data.slice(-6)}` : '',
      customerName: '',
      customerType: 'individual' as const,
      staffName: '',
      staffAvatar: '',
      paymentStatus: 'paid' as const,
      paymentMethod: 'cash' as const,
      amount: 0,
      itemCount: 0,
      date: new Date().toISOString().split('T')[0],
      customerDetails: {
        name: '',
        mobile: '',
        address: ''
      },
      items: [] as { id: string; name: string; quantity: number; rate: number; amount: number; taxRate: number; taxAmount: number; total: number }[]
    };

    Alert.alert(
      'Invoice Found',
      `Invoice: ${scannedInvoice.invoiceNumber}\nCustomer: ${scannedInvoice.customerName}\nAmount: ${formatCurrencyINR(scannedInvoice.amount)}`,
      [
        {
          text: 'Scan Again',
          onPress: () => setScanned(false),
          style: 'cancel',
        },
        {
          text: 'Process Return',
          onPress: () => {
            setNavData('returnFlowInvoice', scannedInvoice);
            safeRouter.push({ pathname: '/new-return/select-items' });
          },
        },
      ]
    );
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
            <ArrowLeft size={24} color="#ffffff" />
          </TouchableOpacity>
          
          <Text style={styles.headerTitle}>Scan Invoice</Text>
          
          <TouchableOpacity
            style={styles.flashButton}
            onPress={() => setFlashOn(!flashOn)}
            activeOpacity={0.7}
          >
            {flashOn ? (
              <FlashlightOff size={24} color="#ffffff" />
            ) : (
              <Flashlight size={24} color="#ffffff" />
            )}
          </TouchableOpacity>
        </View>

        {/* Camera */}
        {Platform.OS === 'web' ? (
          <View style={styles.camera}>
            <WebBarcodeScanner
              onBarcodeScanned={handleInvoiceScanned}
              paused={scanned}
              style={StyleSheet.absoluteFillObject}
            />
            <View style={styles.overlay} pointerEvents="box-none">
              <View style={styles.scanArea}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanText}>
                  Position the invoice QR code or barcode within the frame
                </Text>
              </View>
            </View>
          </View>
        ) : (
          <CameraView
            style={styles.camera}
            facing="back"
            onBarcodeScanned={scanned ? undefined : handleInvoiceScanned}
            barcodeScannerSettings={{ barcodeTypes: [...BARCODE_TYPES] }}
            flash={flashOn ? 'on' : 'off'}
          >
            <View style={styles.overlay}>
              <View style={styles.scanArea}>
                <View style={styles.scanFrame} />
                <Text style={styles.scanText}>
                  Position the invoice QR code or barcode within the frame
                </Text>
              </View>
            </View>
          </CameraView>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How to scan:</Text>
          <Text style={styles.instructionText}>
            • Hold your device steady{'\n'}
            • Position the QR code or barcode within the frame{'\n'}
            • Ensure good lighting for best results{'\n'}
            • Look for QR codes on invoice receipts
          </Text>
        </View>
      </SafeAreaView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#000000',
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
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
    color: '#ffffff',
    flex: 1,
  },
  flashButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  scanArea: {
    alignItems: 'center',
  },
  scanFrame: {
    width: 250,
    height: 150,
    borderWidth: 2,
    borderColor: '#ffffff',
    borderRadius: 12,
    backgroundColor: 'transparent',
  },
  scanText: {
    color: '#ffffff',
    fontSize: 16,
    textAlign: 'center',
    marginTop: 20,
    paddingHorizontal: 20,
  },
  instructions: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    paddingHorizontal: 20,
    paddingVertical: 16,
  },
  instructionTitle: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  instructionText: {
    color: '#ffffff',
    fontSize: 14,
    lineHeight: 20,
  },
  permissionContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: Colors.background,
  },
  permissionTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 16,
  },
  permissionText: {
    fontSize: 16,
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  permissionButton: {
    backgroundColor: Colors.error,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
});