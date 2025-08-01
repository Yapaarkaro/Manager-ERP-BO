import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { 
  ArrowLeft, 
  Flashlight,
  FlashlightOff,
  Hash,
  X,
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
  },
};

// OpenFoodFacts API integration
const fetchProductDetails = async (barcode: string) => {
  try {
    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: {
        'User-Agent': 'ManagerApp (getmanager.in) - support@getmanager.in'
      }
    });
    
    const data = await response.json();
    
    if (data.status === 1 && data.product) {
      return {
        found: true,
        product: {
          name: data.product.product_name || '',
          brand: data.product.brands || '',
          quantity: data.product.quantity || '',
          image: data.product.image_front_url || null,
          barcode: barcode,
          category: data.product.categories_tags?.[0]?.replace('en:', '') || 'Others',
        }
      };
    } else {
      return { found: false };
    }
  } catch (error) {
    console.error('Error fetching product details:', error);
    return { found: false, error: true };
  }
};

export default function ScanProductScreen() {
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [showManualEntry, setShowManualEntry] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');

  if (!permission) {
    return <View />;
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <SafeAreaView style={styles.safeArea}>
          <View style={styles.permissionContainer}>
            <Text style={styles.permissionTitle}>Camera Permission Required</Text>
            <Text style={styles.permissionText}>
              We need camera access to scan product barcodes
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

  const handleBarCodeScanned = async ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    
    setScanned(true);
    setIsLoading(true);
    
    await processBarcode(data);
  };

  const processBarcode = async (barcode: string) => {
    setIsLoading(true);
    
    try {
      const result = await fetchProductDetails(barcode);
      setIsLoading(false);
      
      if (result.found && result.product) {
        // Product found in OpenFoodFacts
        const productData = {
          barcode: barcode,
          name: result.product.name || 'Unknown Product',
          brand: result.product.brand,
          quantity: result.product.quantity,
          hsnCode: '', // Will be filled manually
          taxRate: 18, // Default GST rate
          cessRate: 0,
          category: result.product.category || 'Others',
          primaryUnit: 'Piece',
          image: result.product.image,
        };

        // Auto-navigate to manual product entry with found data
        router.push({
          pathname: '/inventory/manual-product',
          params: {
            scannedData: JSON.stringify(productData),
            isScanned: 'true'
          }
        });
      } else {
        // Product not found
        Alert.alert(
          'Product Not Found',
          'Product not found in OpenFoodFacts database. Add manually?',
          [
            {
              text: 'Scan Again',
              onPress: () => setScanned(false),
              style: 'cancel',
            },
            {
              text: 'Add Manually',
              onPress: () => {
                const basicProductData = {
                  barcode: barcode,
                  name: '',
                  hsnCode: '',
                  taxRate: 18,
                  cessRate: 0,
                  category: '',
                  primaryUnit: 'Piece',
                  image: null,
                };
                
                router.push({
                  pathname: '/inventory/manual-product',
                  params: {
                    scannedData: JSON.stringify(basicProductData),
                    isScanned: 'true'
                  }
                });
              },
            },
          ]
        );
      }
    } catch (error) {
      setIsLoading(false);
      setScanned(false);
      Alert.alert('Error', 'Failed to fetch product details. Please try again.');
    }
  };

  const handleManualBarcodeSubmit = async () => {
    if (!manualBarcode.trim()) {
      Alert.alert('Invalid Barcode', 'Please enter a valid barcode');
      return;
    }

    setShowManualEntry(false);
    setScanned(true);
    await processBarcode(manualBarcode.trim());
    setManualBarcode('');
  };

  const handleManualBarcodeCancel = () => {
    setShowManualEntry(false);
    setManualBarcode('');
    setScanned(false);
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
          
          <Text style={styles.headerTitle}>Scan Product Barcode</Text>
          
          <TouchableOpacity
            style={styles.headerButton}
            onPress={() => setShowManualEntry(true)}
            activeOpacity={0.7}
          >
            <Hash size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Camera */}
        <CameraView
          style={styles.camera}
          facing="back"
          onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
          flash={flashOn ? 'on' : 'off'}
        >
          <View style={styles.overlay}>
            <View style={styles.scanArea}>
              <View style={styles.scanFrame} />
              <Text style={styles.scanText}>
                Position the product barcode within the frame
              </Text>
              
              {/* Flash Button - Floating */}
              <TouchableOpacity
                style={styles.floatingFlashButton}
                onPress={() => setFlashOn(!flashOn)}
                activeOpacity={0.7}
              >
                {flashOn ? (
                  <FlashlightOff size={20} color="#ffffff" />
                ) : (
                  <Flashlight size={20} color="#ffffff" />
                )}
              </TouchableOpacity>
              
              {isLoading && (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Fetching product details...</Text>
                </View>
              )}
            </View>
          </View>
        </CameraView>

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How to scan:</Text>
          <Text style={styles.instructionText}>
            • Tap the # icon to enter barcode manually{'\n'}
            • Hold your device steady{'\n'}
            • Position the barcode within the frame{'\n'}
            • Ensure good lighting for best results{'\n'}
            • Product details will be auto-filled
          </Text>
        </View>
      </SafeAreaView>

      {/* Manual Barcode Entry Modal */}
      <Modal
        visible={showManualEntry}
        transparent={true}
        animationType="fade"
        onRequestClose={handleManualBarcodeCancel}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Enter Barcode Manually</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={handleManualBarcodeCancel}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.textLight} />
              </TouchableOpacity>
            </View>

            <View style={styles.modalContent}>
              <TextInput
                style={styles.barcodeInput}
                value={manualBarcode}
                onChangeText={setManualBarcode}
                placeholder="Enter barcode number"
                placeholderTextColor={Colors.textLight}
                keyboardType="numeric"
                autoFocus
              />
              
              <TouchableOpacity
                style={styles.submitBarcodeButton}
                onPress={handleManualBarcodeSubmit}
                activeOpacity={0.8}
              >
                <Text style={styles.submitBarcodeButtonText}>Fetch Product Details</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
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
  headerButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
  },
  floatingFlashButton: {
    position: 'absolute',
    top: 20,
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
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
  loadingContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 8,
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginTop: 20,
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
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
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  permissionButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    width: '100%',
    maxWidth: 400,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
  },
  modalCloseButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  barcodeInput: {
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 16,
    color: Colors.text,
    marginBottom: 20,
    fontFamily: 'monospace',
    letterSpacing: 1,
    outlineStyle: 'none',
  },
  submitBarcodeButton: {
    backgroundColor: Colors.primary,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: 'center',
  },
  submitBarcodeButtonText: {
    color: Colors.background,
    fontSize: 16,
    fontWeight: '600',
  },
});