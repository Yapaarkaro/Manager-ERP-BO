import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  TextInput,
  Modal,
  ActivityIndicator,
  Platform,
  FlatList,
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
import { setScannedData } from '@/utils/scannedDataStore';
import { safeRouter } from '@/utils/safeRouter';
import { productStore } from '@/utils/productStore';
import WebBarcodeScanner from '@/components/WebBarcodeScanner';

const BARCODE_TYPES = ['code128', 'code39', 'ean13', 'ean8', 'upc_a', 'upc_e', 'itf14', 'codabar', 'qr'] as const;

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

const fetchProductDetailsFromOpenFoodFacts = async (barcode: string) => {
  try {
    if (!barcode || typeof barcode !== 'string') return { found: false, error: true };

    const response = await fetch(`https://world.openfoodfacts.org/api/v0/product/${barcode}.json`, {
      headers: { 'User-Agent': 'ManagerApp (getmanager.in) - support@getmanager.in' }
    });
    
    if (!response.ok) return { found: false, error: true };
    
    const data = await response.json();
    
    if (data && data.status === 1 && data.product) {
      return {
        found: true,
        source: 'openfoodfacts' as const,
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
    }
    return { found: false };
  } catch (error) {
    console.error('Error fetching from OpenFoodFacts:', error);
    return { found: false, error: true };
  }
};

export default function BarcodeScannerScreen() {
  const params = useLocalSearchParams();
  const preSelectedCustomer = params?.preSelectedCustomer || '';
  const returnTo = params?.returnTo || '';
  const [permission, requestPermission] = useCameraPermissions();
  
  const [scanned, setScanned] = useState(false);
  const [flashOn, setFlashOn] = useState(false);
  const [cameraError, setCameraError] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [manualBarcode, setManualBarcode] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [storeReady, setStoreReady] = useState(productStore.hasProducts());

  useEffect(() => {
    let cancelled = false;
    (async () => {
      if (!productStore.hasProducts()) await productStore.loadProductsFromBackend();
      if (!cancelled) setStoreReady(true);
    })();
    return () => { cancelled = true; };
  }, []);

  // When user opens search/manual modal, ensure products are loaded so search works
  useEffect(() => {
    if (!showManualInput) return;
    let cancelled = false;
    (async () => {
      await productStore.loadProductsFromBackend();
      if (!cancelled) setStoreReady(true);
    })();
    return () => { cancelled = true; };
  }, [showManualInput]);

  if (Platform.OS !== 'web' && (!permission || !permission.granted)) {
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
    const raw = data != null ? String(data) : '';
    const trimmed = raw.trim();
    if (!trimmed) return;
    
    setScanned(true);
    setIsLoading(true);
    await processBarcode(trimmed);
  };

  const processBarcode = async (barcode: string) => {
    if (!barcode || typeof barcode !== 'string') {
      setIsLoading(false);
      setScanned(false);
      Alert.alert('Error', 'Invalid barcode. Please try again.');
      return;
    }

    setIsLoading(true);
    
    try {
      await productStore.loadProductsFromBackend();
      const localProduct = productStore.findByBarcode(barcode.trim());

      if (localProduct) {
        console.log('Product found in local store:', localProduct.name);
        setIsLoading(false);

        if (returnTo === 'manual-product') {
          Alert.alert(
            'Product Found in Inventory',
            `📦 ${localProduct.name}\n🏷️ Barcode: ${localProduct.barcode}\n📂 Category: ${localProduct.category}\n💰 Price: ₹${localProduct.salesPrice || localProduct.unitPrice}\n📦 Stock: ${localProduct.currentStock} ${localProduct.primaryUnit || 'units'}`,
            [{
              text: 'Continue',
              onPress: () => {
                setScannedData(JSON.stringify({
                  barcode: localProduct.barcode,
                  name: localProduct.name,
                  brand: localProduct.brand || '',
                  category: localProduct.category || 'Others',
                  isScanned: 'true',
                  existingProduct: 'true',
                }));
                router.back();
              },
            }]
          );
        } else {
          Alert.alert(
            'Product Found',
            `📦 ${localProduct.name}\n🏷️ Barcode: ${localProduct.barcode}\n📂 Category: ${localProduct.category}\n💰 Price: ₹${localProduct.salesPrice || localProduct.unitPrice}\n📦 Stock: ${localProduct.currentStock} ${localProduct.primaryUnit || 'units'}`,
            [
              { text: 'Scan Again', onPress: () => setScanned(false), style: 'cancel' },
              {
                text: 'Add to Cart',
                onPress: () => {
                  try {
                    safeRouter.push({
                      pathname: '/new-sale/cart',
                      params: {
                        selectedProducts: JSON.stringify([{
                          id: localProduct.id,
                          name: localProduct.name,
                          price: localProduct.salesPrice || localProduct.unitPrice,
                          barcode: localProduct.barcode,
                          image: localProduct.image || '',
                          category: localProduct.category,
                          brand: localProduct.brand || '',
                          quantity: 1,
                          hsnCode: localProduct.hsnCode || '',
                          taxRate: localProduct.taxRate || 0,
                          taxInclusive: localProduct.taxInclusive || false,
                          primaryUnit: localProduct.primaryUnit || 'PCS',
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
        return;
      }

      // Step 2: Not in local store - try OpenFoodFacts for manufacturer barcodes
      console.log('Not in local store, checking OpenFoodFacts...');
      const result = await fetchProductDetailsFromOpenFoodFacts(barcode);
      console.log('OpenFoodFacts result:', result);
      setIsLoading(false);
      
      if (result && result.found && result.product) {
        if (returnTo === 'manual-product') {
          Alert.alert(
            'Product Found Online',
            `📦 Product: ${result.product.name}\n🏷️ Brand: ${result.product.brand || 'Unknown'}\n📊 Quantity: ${result.product.quantity || 'N/A'}\n\nClick Continue to auto-fill the product form.`,
            [{
              text: 'Continue',
              onPress: () => {
                setScannedData(JSON.stringify({
                  barcode: barcode,
                  name: result.product.name || 'Unknown Product',
                  brand: result.product.brand || '',
                  category: result.product.category || 'Others',
                  isScanned: 'true'
                }));
                router.back();
              },
            }]
          );
        } else {
          const productData = {
            id: barcode,
            name: result.product.name || 'Unknown Product',
            price: 999,
            barcode: barcode,
            image: result.product.image || '',
            category: result.product.category || 'Others',
            brand: result.product.brand || '',
            quantity: result.product.quantity || '',
          };
          Alert.alert(
            'Product Found Online',
            `📦 Product: ${result.product.name}\n🏷️ Brand: ${result.product.brand || 'Unknown'}\n📊 Quantity: ${result.product.quantity || 'N/A'}`,
            [
              { text: 'Scan Again', onPress: () => setScanned(false), style: 'cancel' },
              {
                text: 'Add to Cart',
                onPress: () => {
                  try {
                    safeRouter.push({
                      pathname: '/new-sale/cart',
                      params: {
                        selectedProducts: JSON.stringify([{ ...productData, quantity: 1 }]),
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
      } else {
        // Not found anywhere
        if (returnTo === 'manual-product') {
          Alert.alert(
            'Product Not Found',
            `Barcode: ${barcode}\n\nThis product wasn't found in your inventory or online databases. You can add it manually.`,
            [{
              text: 'Continue',
              onPress: () => {
                setScannedData(JSON.stringify({
                  barcode: barcode,
                  name: '',
                  brand: '',
                  category: 'Others',
                  isScanned: 'true'
                }));
                router.back();
              },
            }]
          );
        } else {
          Alert.alert(
            'Product Not Found',
            `Barcode: ${barcode}\n\nThis product was not found in your inventory or online databases. You can still add it manually.`,
            [
              { text: 'Scan Again', onPress: () => setScanned(false), style: 'cancel' },
              {
                text: 'Add Manually',
                onPress: () => {
                  try {
                    safeRouter.push({
                      pathname: '/new-sale/cart',
                      params: {
                        selectedProducts: JSON.stringify([{
                          id: barcode,
                          name: 'Manual Product',
                          price: 999,
                          barcode: barcode,
                          image: '',
                          category: 'Others',
                          quantity: 1,
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
      }
    } catch (error) {
      console.error('Error processing barcode:', error);
      setIsLoading(false);
      setScanned(false);
      Alert.alert('Error', 'Failed to process barcode. Please try again.');
    }
  };

  const handleProductSelected = useCallback((localProduct: import('@/utils/productStore').Product) => {
    setShowManualInput(false);
    setSearchQuery('');
    setManualBarcode('');
    if (returnTo === 'manual-product') {
      setScannedData(JSON.stringify({
        barcode: localProduct.barcode,
        name: localProduct.name,
        brand: localProduct.brand || '',
        category: localProduct.category || 'Others',
        isScanned: 'true',
        existingProduct: 'true',
      }));
      router.back();
      return;
    }
    try {
      safeRouter.push({
        pathname: '/new-sale/cart',
        params: {
          selectedProducts: JSON.stringify([{
            id: localProduct.id,
            name: localProduct.name,
            price: localProduct.salesPrice || localProduct.unitPrice,
            barcode: localProduct.barcode,
            image: localProduct.image || '',
            category: localProduct.category,
            brand: localProduct.brand || '',
            quantity: 1,
            hsnCode: localProduct.hsnCode || '',
            taxRate: localProduct.taxRate || 0,
            taxInclusive: localProduct.taxInclusive || false,
            primaryUnit: localProduct.primaryUnit || 'PCS',
          }]),
          preSelectedCustomer: preSelectedCustomer || ''
        }
      });
    } catch {
      Alert.alert('Error', 'Failed to add product to cart. Please try again.');
    }
  }, [returnTo, preSelectedCustomer]);

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

  const searchQueryTrimmed = searchQuery.trim();
  const bySearch = searchQueryTrimmed.length >= 1
    ? productStore.searchProducts(searchQueryTrimmed)
    : [];
  const byBarcode = searchQueryTrimmed.length >= 1
    ? productStore.findAllByBarcode(searchQueryTrimmed)
    : [];
  const seenIds = new Set<string>();
  const combined: typeof bySearch = [];
  for (const p of byBarcode) {
    if (!seenIds.has(p.id)) {
      seenIds.add(p.id);
      combined.push(p);
    }
  }
  for (const p of bySearch) {
    if (!seenIds.has(p.id)) {
      seenIds.add(p.id);
      combined.push(p);
    }
  }
  const searchResults = combined.slice(0, 80);

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
          <View style={styles.cameraContainer}>
            {Platform.OS === 'web' ? (
              <WebBarcodeScanner
                onBarcodeScanned={handleBarCodeScanned}
                paused={scanned}
                style={StyleSheet.absoluteFillObject}
              />
            ) : (
              <CameraView
                style={StyleSheet.absoluteFillObject}
                facing="back"
                onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
                barcodeScannerSettings={{
                  barcodeTypes: [...BARCODE_TYPES],
                  scanningInterval: 1500,
                }}
                flash={flashOn ? 'on' : 'off'}
              />
            )}
            <View style={[StyleSheet.absoluteFillObject, styles.overlay]} pointerEvents="box-none">
              <View style={styles.topControls}>
                {Platform.OS !== 'web' && (
                  <TouchableOpacity
                    style={styles.flashlightButton}
                    onPress={() => setFlashOn(!flashOn)}
                    activeOpacity={0.7}
                  >
                    {flashOn ? (
                      <FlashlightOff size={24} color="#ffffff" />
                    ) : (
                      <Flashlight size={24} color="#ffffff" />
                    )}
                  </TouchableOpacity>
                )}
              </View>

              <View style={styles.scanArea}>
                <View style={[styles.cornerGuide, styles.topLeft]} />
                <View style={[styles.cornerGuide, styles.topRight]} />
                <View style={[styles.cornerGuide, styles.bottomLeft]} />
                <View style={[styles.cornerGuide, styles.bottomRight]} />
                
                <View style={styles.scanFrame}>
                  <View style={styles.scanFrameInner} />
                </View>
                
                <Text style={styles.scanText}>
                  Position the barcode within the frame
                </Text>
                
                {isLoading && (
                  <View style={styles.loadingContainer}>
                    <ActivityIndicator size="large" color="#ffffff" />
                    <Text style={styles.loadingText}>Looking up product...</Text>
                  </View>
                )}
              </View>
            </View>
          </View>
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
                  All products matching your search (by name or barcode) are listed below. You can also enter a barcode number to look up.
                </Text>

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Search products</Text>
                  {!storeReady && (
                    <Text style={{ fontSize: 12, color: Colors.textLight, marginBottom: 4 }}>Loading products...</Text>
                  )}
                  <TextInput
                    style={styles.barcodeInput}
                    value={searchQuery}
                    onChangeText={setSearchQuery}
                    placeholder="Type product name or barcode..."
                    placeholderTextColor={Colors.textLight}
                  />
                </View>
                {searchResults.length > 0 && (
                  <View style={{ maxHeight: 200, marginBottom: 12 }}>
                    <FlatList
                      data={searchResults}
                      keyExtractor={(item) => item.id}
                      renderItem={({ item }) => (
                        <TouchableOpacity
                          style={{ paddingVertical: 10, paddingHorizontal: 12, borderBottomWidth: 1, borderBottomColor: Colors.grey[200] }}
                          onPress={() => handleProductSelected(item)}
                          activeOpacity={0.7}
                        >
                          <Text style={{ fontSize: 15, fontWeight: '600', color: Colors.text }} numberOfLines={1}>{item.name}</Text>
                          <Text style={{ fontSize: 12, color: Colors.textLight }}>{item.barcode ? `Barcode: ${item.barcode}` : item.category}</Text>
                        </TouchableOpacity>
                      )}
                    />
                  </View>
                )}

                <View style={styles.inputContainer}>
                  <Text style={styles.inputLabel}>Or enter barcode number</Text>
                  <View style={styles.inputRow}>
                    <TextInput
                      style={styles.barcodeInput}
                      value={manualBarcode}
                      onChangeText={setManualBarcode}
                      placeholder="Enter barcode number"
                      placeholderTextColor={Colors.textLight}
                      keyboardType="default"
                      maxLength={20}
                      selectionColor={Colors.primary}
                      autoCapitalize="characters"
                      autoCorrect={false}
                    />
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
  cameraContainer: {
    flex: 1,
    position: 'relative',
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
    paddingHorizontal: 20,
    paddingVertical: 18,
    fontSize: 20,
    color: Colors.text,
    backgroundColor: Colors.background,
    fontFamily: 'monospace',
    letterSpacing: 2,
    textAlign: 'center',
    fontWeight: '600',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
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
  // Top Controls
  topControls: {
    position: 'absolute',
    top: 20,
    right: 20,
    zIndex: 10,
  },
  flashlightButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.3)',
  },
  
  // Corner Guides
  cornerGuide: {
    position: 'absolute',
    width: 30,
    height: 30,
    borderWidth: 3,
    borderColor: Colors.primary,
  },
  topLeft: {
    top: -15,
    left: -15,
    borderBottomWidth: 0,
    borderRightWidth: 0,
  },
  topRight: {
    top: -15,
    right: -15,
    borderBottomWidth: 0,
    borderLeftWidth: 0,
  },
  bottomLeft: {
    bottom: -15,
    left: -15,
    borderTopWidth: 0,
    borderRightWidth: 0,
  },
  bottomRight: {
    bottom: -15,
    right: -15,
    borderTopWidth: 0,
    borderLeftWidth: 0,
  },
  
  // Enhanced Scan Frame
  scanFrame: {
    width: 280,
    height: 180,
    position: 'relative',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scanFrameInner: {
    width: '100%',
    height: '100%',
    borderWidth: 2,
    borderColor: 'rgba(255, 255, 255, 0.8)',
    borderRadius: 16,
    backgroundColor: 'transparent',
  },
});