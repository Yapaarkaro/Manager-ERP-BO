import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { CameraView, CameraType, useCameraPermissions } from 'expo-camera';
import { 
  ArrowLeft, 
  Flashlight,
  FlashlightOff,
  Keyboard,
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
    if (!barcode || typeof barcode !== 'string') {
      console.error('Invalid barcode:', barcode);
      return { found: false, error: true };
    }

    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: {
        'User-Agent': 'ManagerApp (getmanager.in) - support@getmanager.in'
      }
    });
    
    if (!response.ok) {
      console.error('API response not ok:', response.status);
      return { found: false, error: true };
    }
    
    const data = await response.json();
    
    if (data && data.status === 1 && data.product) {
      return {
        found: true,
        product: {
          name: data.product.product_name || '',
          brand: data.product.brands || '',
          quantity: data.product.quantity || '',
          image: data.product.image_front_url || null,
          barcode: barcode,
          category: data.product.categories_tags && Array.isArray(data.product.categories_tags) && data.product.categories_tags.length > 0 
            ? data.product.categories_tags[0].replace('en:', '') 
            : 'Others',
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

export default function BarcodeScannerScreen() {
  const params = useLocalSearchParams();
  const preSelectedCustomer = params?.preSelectedCustomer || '';
  const [permission, requestPermission] = useCameraPermissions();
  
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  if (!permission || !permission.granted) {
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
    if (!barcode || typeof barcode !== 'string') {
      console.error('Invalid barcode provided:', barcode);
      Alert.alert('Error', 'Invalid barcode. Please try again.');
      setScanned(false);
      return;
    }

    setIsLoading(true);
    
    try {
      console.log('Fetching product details for barcode:', barcode);
      const result = await fetchProductDetails(barcode);
      console.log('API result:', result);
      setIsLoading(false);
      
      if (result && result.found && result.product) {
        // Product found in OpenFoodFacts
        const productData = {
          id: barcode,
          name: result.product.name || 'Unknown Product',
          price: 999, // Default price, can be updated later
          barcode: barcode,
          image: result.product.image || 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
          category: result.product.category || 'Others',
          brand: result.product.brand || '',
          quantity: result.product.quantity || '',
        };

        Alert.alert(
          'Product Found',
          `Barcode: ${barcode}\nProduct: ${result.product.name}\nBrand: ${result.product.brand || 'Unknown'}\nQuantity: ${result.product.quantity || 'N/A'}`,
          [
            {
              text: 'Scan Again',
              onPress: () => setScanned(false),
              style: 'cancel',
            },
            {
              text: 'Add to Cart',
              onPress: () => {
                try {
                  router.push({
                    pathname: '/new-sale/cart',
                    params: {
                      selectedProducts: JSON.stringify([{
                        ...productData,
                        quantity: 1
                      }]),
                      preSelectedCustomer: preSelectedCustomer || ''
                    }
                  });
                } catch (error) {
                  console.error('Error navigating to cart:', error);
                  Alert.alert('Error', 'Failed to add product to cart. Please try again.');
                }
              },
            },
          ]
        );
      } else {
        // Product not found
        Alert.alert(
          'Product Not Found',
          `Barcode: ${barcode}\n\nThis product was not found in our database. You can still add it manually to your cart.`,
          [
            {
              text: 'Scan Again',
              onPress: () => setScanned(false),
              style: 'cancel',
            },
            {
              text: 'Add Manually',
              onPress: () => {
                const manualProduct = {
                  id: barcode,
                  name: 'Manual Product',
                  price: 999,
                  barcode: barcode,
                  image: 'https://images.pexels.com/photos/788946/pexels-photo-788946.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
                  category: 'Others',
                };
                
                try {
                  router.push({
                    pathname: '/new-sale/cart',
                    params: {
                      selectedProducts: JSON.stringify([{
                        ...manualProduct,
                        quantity: 1
                      }]),
                      preSelectedCustomer: preSelectedCustomer || ''
                    }
                  });
                } catch (error) {
                  console.error('Error navigating to cart:', error);
                  Alert.alert('Error', 'Failed to add product to cart. Please try again.');
                }
              },
            },
          ]
        );
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      setIsLoading(false);
      setScanned(false);
      Alert.alert('Error', 'Failed to fetch product details. Please try again.');
    }
  };

  const handleManualBarcodeSubmit = async () => {
    if (!manualBarcode || !manualBarcode.trim()) {
      Alert.alert('Error', 'Please enter a barcode number');
      return;
    }

    const trimmedBarcode = manualBarcode.trim();
    if (trimmedBarcode.length === 0) {
      Alert.alert('Error', 'Please enter a valid barcode number');
      return;
    }

    setShowManualInput(false);
    setScanned(true);
    await processBarcode(trimmedBarcode);
    setManualBarcode('');
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
          
          <Text style={styles.headerTitle}>Scan Barcode</Text>
          
          <TouchableOpacity
            style={styles.manualInputButton}
            onPress={() => setShowManualInput(true)}
            activeOpacity={0.7}
          >
            <Keyboard size={24} color="#ffffff" />
          </TouchableOpacity>
        </View>

        {/* Camera */}
        {!cameraError ? (
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
                Position the barcode within the frame
              </Text>
              
              {/* Floating Torch Button */}
              <TouchableOpacity
                style={styles.floatingTorchButton}
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
                  <ActivityIndicator size="large" color="#ffffff" />
                  <Text style={styles.loadingText}>Fetching product details...</Text>
                </View>
              )}
            </View>
            </View>
          </CameraView>
        ) : (
          <View style={styles.cameraErrorContainer}>
            <Text style={styles.cameraErrorTitle}>Camera Error</Text>
            <Text style={styles.cameraErrorText}>
              Unable to access camera. Please check your device settings and try again.
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={() => setCameraError(false)}
              activeOpacity={0.8}
            >
              <Text style={styles.retryButtonText}>Retry</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Instructions */}
        <View style={styles.instructions}>
          <Text style={styles.instructionTitle}>How to scan:</Text>
          <Text style={styles.instructionText}>
            • Hold your device steady{'\n'}
            • Position the barcode within the frame{'\n'}
            • Ensure good lighting for best results
          </Text>
        </View>

        {/* Manual Barcode Input Modal */}
        <Modal
          visible={showManualInput}
          transparent={true}
          animationType="slide"
          onRequestClose={() => setShowManualInput(false)}
        >
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Enter Barcode</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => {
                    setShowManualInput(false);
                    setManualBarcode('');
                  }}
                  activeOpacity={0.7}
                >
                  <X size={24} color={Colors.text} />
                </TouchableOpacity>
              </View>

              <View style={styles.modalContent}>
                <Text style={styles.modalDescription}>
                  Enter the barcode number manually if you're unable to scan it
                </Text>
                
                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Barcode Number</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.barcodeInput}
                      value={manualBarcode}
                      onChangeText={setManualBarcode}
                      placeholder="Enter barcode number"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="numeric"
                      autoFocus={true}
                      maxLength={20}
                      selectionColor={Colors.primary}
                      autoCapitalize="none"
                      autoCorrect={false}
                    />
                    <TouchableOpacity
                      style={styles.torchButton}
                      onPress={() => setFlashOn(!flashOn)}
                      activeOpacity={0.7}
                    >
                      {flashOn ? (
                        <FlashlightOff size={20} color={Colors.primary} />
                      ) : (
                        <Flashlight size={20} color={Colors.primary} />
                      )}
                    </TouchableOpacity>
                  </View>
                  {manualBarcode.length > 0 && (
                    <Text style={styles.inputPreview}>Preview: {manualBarcode}</Text>
                  )}
                </View>

                <View style={styles.modalActions}>
                  <TouchableOpacity
                    style={styles.cancelButton}
                    onPress={() => {
                      setShowManualInput(false);
                      setManualBarcode('');
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.cancelButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  
                  <TouchableOpacity
                    style={[
                      styles.submitButton,
                      !manualBarcode.trim() && styles.disabledButton
                    ]}
                    onPress={handleManualBarcodeSubmit}
                    disabled={!manualBarcode.trim()}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.submitButtonText}>Submit</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </View>
          </View>
        </Modal>
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
  cameraErrorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 32,
    backgroundColor: '#000000',
  },
  cameraErrorTitle: {
    fontSize: 24,
    fontWeight: '700',
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 16,
  },
  cameraErrorText: {
    fontSize: 16,
    color: '#ffffff',
    textAlign: 'center',
    marginBottom: 32,
    lineHeight: 22,
  },
  retryButton: {
    backgroundColor: Colors.primary,
    paddingHorizontal: 32,
    paddingVertical: 16,
    borderRadius: 12,
  },
  retryButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  manualInputButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    marginLeft: 8,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 0,
    width: '90%',
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
    alignItems: 'center',
    justifyContent: 'space-between',
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
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    padding: 20,
  },
  modalDescription: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 20,
    lineHeight: 20,
  },
  inputContainer: {
    marginBottom: 24,
  },
  inputLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  barcodeInput: {
    flex: 1,
    borderWidth: 2,
    borderColor: Colors.primary,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 16,
    fontSize: 18,
    color: Colors.text,
    backgroundColor: Colors.background,
    fontFamily: 'monospace',
    letterSpacing: 1,
    textAlign: 'center',
  },
  torchButton: {
    width: 48,
    height: 48,
    borderRadius: 12,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: Colors.primary,
  },
  inputPreview: {
    fontSize: 14,
    color: Colors.success,
    textAlign: 'center',
    marginTop: 8,
    fontFamily: 'monospace',
    fontWeight: '600',
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    gap: 12,
  },
  cancelButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  submitButton: {
    flex: 1,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  submitButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#ffffff',
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },
  loadingContainer: {
    backgroundColor: 'rgba(0, 0, 0, 0.8)',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 16,
    marginTop: 20,
    alignItems: 'center',
  },
  loadingText: {
    color: '#ffffff',
    fontSize: 14,
    textAlign: 'center',
    marginTop: 8,
  },
  floatingTorchButton: {
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
});