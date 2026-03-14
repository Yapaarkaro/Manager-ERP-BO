import React, { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Image,
  Modal,
  Alert,
} from 'react-native';
import { showError } from '@/utils/notifications';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import * as ImagePicker from 'expo-image-picker';
import { productStore, Product, cartBridge, cartDataBridge } from '@/utils/productStore';
import { safeRouter } from '@/utils/safeRouter';
import { uploadProductImages, peekNextInvoiceNumber } from '@/services/backendApi';
import { 
  ArrowLeft, 
  Search, 
  Scan,
  Plus,
  Minus,
  Trash2,
  ShoppingCart,
  ChevronDown,
  ChevronUp,
  Ruler,
  Hash,
  Percent,
  X,
  Upload,
  Package,
  FileText
} from 'lucide-react-native';
import { formatCurrencyINR } from '@/utils/formatters';

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

const primaryUnits = [
  'Piece', 'Kilogram', 'Gram', 'Liter', 'Milliliter', 'Meter', 'Centimeter', 
  'Box', 'Pack', 'Set', 'Pair', 'Dozen', 'Ton', 'Quintal', 'Foot', 'Inch', 
  'Yard', 'Square Meter', 'Square Foot', 'Cubic Meter', 'Cubic Foot', 
  'Bundle', 'Roll', 'Sheet', 'Bottle', 'Can', 'Jar', 'Tube', 'Bag', 
  'Carton', 'Crate', 'Gallon', 'Ounce', 'Pound'
];

const secondaryUnits = [
  'None', 'Piece', 'Kilogram', 'Gram', 'Liter', 'Milliliter', 'Meter', 
  'Centimeter', 'Box', 'Pack', 'Set', 'Pair', 'Dozen', 'Ton', 'Quintal', 
  'Foot', 'Inch', 'Yard', 'Square Meter', 'Square Foot', 'Cubic Meter', 
  'Cubic Foot', 'Bundle', 'Roll', 'Sheet', 'Bottle', 'Can', 'Jar', 'Tube', 
  'Bag', 'Carton', 'Crate', 'Gallon', 'Ounce', 'Pound'
];

const gstRates = [
  { label: '0%', value: 0 },
  { label: '5%', value: 5 },
  { label: '12%', value: 12 },
  { label: '18%', value: 18 },
  { label: '28%', value: 28 }
];

const cessTypes = [
  { value: 'none', label: 'No CESS' },
  { value: 'value', label: 'Value Based (%)' },
  { value: 'quantity', label: 'Quantity Based (₹/unit)' },
  { value: 'value_and_quantity', label: 'Value + Quantity' }
];

const cessUnits = [
  'Piece', 'Kilogram', 'Liter', 'Box', 'Pack', 'Set', 'Pair', 'Dozen', 
  'Ton', 'Quintal', 'Foot', 'Inch', 'Yard', 'Square Meter', 'Square Foot', 
  'Cubic Meter', 'Cubic Foot', 'Bundle', 'Roll', 'Sheet', 'Bottle', 'Can', 
  'Jar', 'Tube', 'Bag', 'Carton', 'Crate', 'Gallon', 'Ounce', 'Pound'
];

const _uomShortForms: Record<string, string> = {
  'Piece': 'Pcs', 'Pieces': 'Pcs', 'Kilogram': 'Kg', 'Kilograms': 'Kg',
  'Gram': 'g', 'Grams': 'g', 'Liter': 'L', 'Liters': 'L',
  'Milliliter': 'ml', 'Milliliters': 'ml', 'Meter': 'm', 'Meters': 'm',
  'Centimeter': 'cm', 'Centimeters': 'cm', 'Box': 'Bx', 'Boxes': 'Bx',
  'Case': 'Cs', 'Cases': 'Cs', 'Pack': 'Pk', 'Packs': 'Pk',
  'Set': 'St', 'Sets': 'St', 'Pair': 'Pr', 'Pairs': 'Pr',
  'Dozen': 'Doz', 'Dozens': 'Doz', 'Ton': 'Ton', 'Tons': 'Ton',
  'Quintal': 'Qtl', 'Quintals': 'Qtl', 'Foot': 'ft', 'Feet': 'ft',
  'Inch': 'in', 'Inches': 'in', 'Yard': 'yd', 'Yards': 'yd',
  'Square Meter': 'm²', 'Square Meters': 'm²', 'Square Foot': 'ft²', 'Square Feet': 'ft²',
  'Cubic Meter': 'm³', 'Cubic Meters': 'm³', 'Cubic Foot': 'ft³', 'Cubic Feet': 'ft³',
  'Bundle': 'Bdl', 'Bundles': 'Bdl', 'Roll': 'Roll', 'Rolls': 'Roll',
  'Sheet': 'Sheet', 'Sheets': 'Sheet', 'Bottle': 'Btl', 'Bottles': 'Btl',
  'Can': 'Can', 'Cans': 'Can', 'Jar': 'Jar', 'Jars': 'Jar',
  'Tube': 'Tube', 'Tubes': 'Tube', 'Bag': 'Bag', 'Bags': 'Bag',
  'Carton': 'Ctn', 'Cartons': 'Ctn', 'Crate': 'Crate', 'Crates': 'Crate',
  'Gallon': 'Gal', 'Gallons': 'Gal', 'Ounce': 'oz', 'Ounces': 'oz',
  'Pound': 'lb', 'Pounds': 'lb',
};
const _getUoMShortForm = (unit: string): string => _uomShortForms[unit] || unit;

interface CartProduct {
  id: string;
  productDbId?: string;
  name: string;
  price: number;
  image: string;
  category: string;
  quantity: number;
  barcode?: string;
  taxRate?: number;
  taxInclusive?: boolean;
  discountType?: 'percentage' | 'amount';
  discountValue?: number;
  brand?: string;
  originalPrice?: number;
  hsnCode?: string;
  batchNumber?: string;
  primaryUnit?: string;
  secondaryUnit?: string;
  tertiaryUnit?: string;
  conversionRatio?: string;
  tertiaryConversionRatio?: string;
  mrp?: string;
  cessType?: 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp';
  cessRate?: number;
  cessAmount?: number;
  cessUnit?: string;
  selectedUoM?: 'primary' | 'secondary' | 'tertiary';
  currentStock?: number;
  openingStock?: number;
  quantityDecimals?: number;
}

export default function CartScreen() {
  const { selectedProducts, preSelectedCustomer, newProduct } = useLocalSearchParams();
  const [cartItems, setCartItems] = useState<CartProduct[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [editingProduct, setEditingProduct] = useState<CartProduct | null>(null);
  const [processedProducts, setProcessedProducts] = useState<Set<string>>(new Set());
  const [processedSelectedProducts, setProcessedSelectedProducts] = useState<string>('');
  const [bridgeProcessed, setBridgeProcessed] = useState(false);
  const paramsWillProvideProducts = useRef(!!(selectedProducts || newProduct));
  const [showEditModal, setShowEditModal] = useState(false);
  const [invoiceDiscountType, setInvoiceDiscountType] = useState<'percentage' | 'amount'>('percentage');
  const [invoiceDiscountValue, setInvoiceDiscountValue] = useState('');

  const [showSearchModal, setShowSearchModal] = useState(false);
  const [searchResults, setSearchResults] = useState<Product[]>([]);
  const [editingPriceId, setEditingPriceId] = useState<string | null>(null);
  const [editingPriceValue, setEditingPriceValue] = useState('');
  const [editingQtyText, setEditingQtyText] = useState<Record<string, string>>({});
  const [expandedCards, setExpandedCards] = useState<Set<string>>(new Set());
  const [expandedTaxSections, setExpandedTaxSections] = useState<Set<string>>(new Set());
  const [customAlert, setCustomAlert] = useState<{
    visible: boolean;
    title: string;
    message: string;
    type: 'error' | 'warning' | 'info';
  }>({
    visible: false,
    title: '',
    message: '',
    type: 'info'
  });
  
  // Roundoff feature state - applied by default
  const [applyRoundoff, setApplyRoundoff] = useState(true);
  
  // Invoice number preview
  const [nextInvoiceNumber, setNextInvoiceNumber] = useState<string>('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await peekNextInvoiceNumber();
        if (!cancelled && res.success && res.invoiceNumber) {
          setNextInvoiceNumber(res.invoiceNumber);
        }
      } catch {}
    })();
    return () => { cancelled = true; };
  }, []);

  // Navigation debounce
  const [isNavigating, setIsNavigating] = useState(false);

  // Other Charges feature state
  const [showOtherCharges, setShowOtherCharges] = useState(false);
  const [otherCharges, setOtherCharges] = useState<Array<{
    id: string;
    name: string;
    amount: string;
    taxRate: string;
    description?: string;
  }>>([]);



  const logProductToCart = (_product: CartProduct) => {};
  const logNewProductCreation = (_product: CartProduct) => {};



  // Handle new products being created and added to cart
  useEffect(() => {
    if (newProduct && typeof newProduct === 'string' && !processedProducts.has(newProduct)) {
      try {
        const product = JSON.parse(newProduct);
        setProcessedProducts(prev => new Set([...prev, newProduct]));
        
        setCartItems(prev => {
          const existingProductIndex = prev.findIndex(item => 
            item.name === product.name && 
            (item.barcode === product.barcode || item.id === product.id)
          );
          
          if (existingProductIndex >= 0) {
            return prev.map((item, index) => 
              index === existingProductIndex 
                ? { ...item, quantity: item.quantity + 1 }
                : item
            );
          } else {
            const cartProduct: CartProduct = {
              ...product,
              id: `${product.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
              productDbId: product.id,
              quantity: 1,
              price: product.salesPrice || product.unitPrice || 0,
              taxInclusive: product.taxInclusive || false,
              cessType: product.cessType || 'none',
              cessRate: product.cessRate || 0,
              cessAmount: product.cessAmount || 0,
              cessUnit: product.cessUnit || '',
              primaryUnit: product.primaryUnit || 'Piece',
              secondaryUnit: product.secondaryUnit || undefined,
              tertiaryUnit: product.tertiaryUnit || undefined,
              conversionRatio: product.conversionRatio || undefined,
              tertiaryConversionRatio: product.tertiaryConversionRatio || undefined,
              selectedUoM: 'primary'
            };
            
            logProductToCart(cartProduct);
            expandOnlyCard(cartProduct.id);
            return [...prev, cartProduct];
          }
        });
      } catch {
        // Failed to parse new product
      }
    }
  }, [newProduct, processedProducts]);

  // On mount: restore cart state from bridge, AsyncStorage, or route params.
  // All sources are reconciled here to avoid race conditions.
  useEffect(() => {
    // Fast path: consume products from the bridge (no serialization overhead)
    if (cartBridge.hasPending() && !bridgeProcessed) {
      setBridgeProcessed(true);
      const products = cartBridge.consumePendingProducts();
      if (products.length > 0) {
        const newCartItems: CartProduct[] = products.map(product => ({
          ...product,
          id: `${product.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
          productDbId: product.id,
          quantity: 1,
          price: product.salesPrice || product.unitPrice || 0,
          taxInclusive: product.taxInclusive || false,
          cessType: product.cessType || 'none',
          cessRate: product.cessRate || 0,
          cessAmount: product.cessAmount || 0,
          cessUnit: product.cessUnit || '',
          selectedUoM: 'primary' as const,
        }));
        setCartItems(prev => {
          const updatedCart = [...prev];
          newCartItems.forEach(np => {
            const existing = updatedCart.findIndex(item =>
              item.name === np.name && (item.barcode === np.barcode)
            );
            if (existing >= 0) {
              updatedCart[existing] = { ...updatedCart[existing], quantity: updatedCart[existing].quantity + 1 };
            } else {
              updatedCart.push(np);
            }
          });
          return updatedCart;
        });
        return;
      }
    }

    // When newProduct param is present (returning from manual-product),
    // load existing cart from AsyncStorage first, then merge the new product.
    if (paramsWillProvideProducts.current) {
      AsyncStorage.getItem('cartItems').then(saved => {
        if (saved) {
          try {
            const items = JSON.parse(saved);
            if (Array.isArray(items) && items.length > 0) {
              setCartItems(prev => prev.length > 0 ? prev : items);
            }
          } catch { /* ignore */ }
        }
      }).catch(() => {});
      return;
    }

    // Normal mount with no params: restore from AsyncStorage
    AsyncStorage.getItem('cartItems').then(saved => {
      if (saved) {
        try {
          const items = JSON.parse(saved);
          if (Array.isArray(items) && items.length > 0) {
            setCartItems(items);
          }
        } catch { /* ignore */ }
      }
    }).catch(() => {});
  }, []);

  // Only auto-expand when there's exactly one item
  useEffect(() => {
    if (cartItems.length === 1) {
      setExpandedCards(new Set([cartItems[0].id]));
    }
  }, [cartItems.length]);

  // Legacy fallback: parse selectedProducts from navigation params (for scanner/other flows)
  useEffect(() => {
    if (selectedProducts && typeof selectedProducts === 'string' && selectedProducts !== processedSelectedProducts) {
      try {
        const products = JSON.parse(selectedProducts);
        if (Array.isArray(products) && products.length > 0) {
          setProcessedSelectedProducts(selectedProducts);
          
          setCartItems(prev => {
            const updatedCart = [...prev];
            
            products.forEach((product: any) => {
              const np = {
                ...product,
                id: `${product.id}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
                productDbId: product.id,
                quantity: 1,
                price: product.salesPrice || product.unitPrice || 0,
                taxInclusive: product.taxInclusive || false,
                cessType: product.cessType || 'none',
                cessRate: product.cessRate || 0,
                cessAmount: product.cessAmount || 0,
                cessUnit: product.cessUnit || '',
                selectedUoM: 'primary' as const,
              };
              
              const existingIdx = updatedCart.findIndex(item => 
                item.name === np.name && (item.barcode === np.barcode || item.id === np.id)
              );
              
              if (existingIdx >= 0) {
                updatedCart[existingIdx] = {
                  ...updatedCart[existingIdx],
                  quantity: updatedCart[existingIdx].quantity + 1
                };
              } else {
                updatedCart.push(np);
              }
            });
            
            return updatedCart;
          });
        }
      } catch { /* ignore */ }
    }
  }, [selectedProducts, processedSelectedProducts]);

  const cartPersistTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (cartPersistTimer.current) clearTimeout(cartPersistTimer.current);
    cartPersistTimer.current = setTimeout(() => {
      try {
        if (cartItems.length > 0) {
          AsyncStorage.setItem('cartItems', JSON.stringify(cartItems)).catch(() => {});
        } else {
          AsyncStorage.removeItem('cartItems').catch(() => {});
        }
      } catch {}
    }, 500);
    return () => { if (cartPersistTimer.current) clearTimeout(cartPersistTimer.current); };
  }, [cartItems]);



  const updateQuantity = (productId: string, newQuantity: number) => {
    if (newQuantity <= 0) {
      removeItem(productId);
      return;
    }
    
    // Find the item to check stock
    const item = cartItems.find(item => item.id === productId);
    if (item) {
      const stockLimits = calculateStockLimits(item);
      
      if (newQuantity > stockLimits.maxQuantityForSelectedUoM) {
        showCustomAlert(
          'Insufficient Stock',
          `Cannot add more than available stock (${stockLimits.maxQuantityForSelectedUoM} ${stockLimits.selectedUoMUnit}s).\n\nTotal available: ${stockLimits.totalInLowestUoM} ${stockLimits.lowestUoM}s`,
          'error'
        );
        return;
      }
    }
    
    setCartItems(prev => 
      prev.map(item => 
        item.id === productId 
          ? { ...item, quantity: newQuantity }
          : item
      )
    );
  };

  const updateItemUoM = (productId: string, selectedUoM: 'primary' | 'secondary' | 'tertiary') => {
    setCartItems(prev => 
      prev.map(item => {
        if (item.id === productId) {
          const stockLimits = calculateStockLimits({ ...item, selectedUoM });
          if (item.quantity > stockLimits.maxQuantityForSelectedUoM) {
            return { ...item, selectedUoM, quantity: stockLimits.maxQuantityForSelectedUoM };
          }
          return { ...item, selectedUoM };
        }
        return item;
      })
    );
  };

  const removeItem = (productId: string) => {
    setCartItems(prev => {
      const newCart = prev.filter(item => item.id !== productId);
      // If no items left, collapse all tax sections
      if (newCart.length === 0) {
        setExpandedTaxSections(new Set());
      }
      return newCart;
    });
  };

  const clearCart = async () => {
    setCartItems([]);
    // Also collapse all tax sections when cart is cleared
    setExpandedTaxSections(new Set());
    try {
      await AsyncStorage.removeItem('cartItems');
    } catch (error) {
      // Non-critical: cart clear failed
    }
  };



  // Clean up duplicate cart items and ensure unique IDs
  const cleanupCartItems = () => {
    setCartItems(prev => {
      const uniqueItems = new Map<string, CartProduct>();
      
      prev.forEach(item => {
        if (uniqueItems.has(item.id)) {
          // If duplicate ID exists, merge quantities
          const existing = uniqueItems.get(item.id)!;
          existing.quantity += item.quantity;
        } else {
          uniqueItems.set(item.id, { ...item });
        }
      });
      
      return Array.from(uniqueItems.values());
    });
  };

  const handleScanBarcode = () => {
    safeRouter.push('/new-sale/scanner');
  };

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    if (query.trim() === '') {
      setSearchResults([]);
    } else {
      const results = productStore.searchProducts(query);
      setSearchResults(results);
    }
  };

  const handleSearchModalOpen = () => {
    setShowSearchModal(true);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleSearchModalClose = () => {
    setShowSearchModal(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  const handleProductSelectFromSearch = (product: Product) => {
    const existingProductIndex = cartItems.findIndex(item => 
      item.name === product.name && 
      (item.barcode === product.barcode || item.id === product.id)
    );
    
    if (existingProductIndex !== -1) {
      setCartItems(prev => prev.map((item, index) => 
        index === existingProductIndex 
          ? { ...item, quantity: item.quantity + 1 }
          : item
      ));
    } else {
      const cartProduct: CartProduct = {
        ...product,
        quantity: 1,
        price: product.salesPrice,
        taxInclusive: product.taxInclusive || false,
        cessType: product.cessType || 'none',
        cessRate: product.cessRate || 0,
        cessAmount: product.cessAmount || 0,
        cessUnit: product.cessUnit || '',
        selectedUoM: 'primary'
      };
      
      setCartItems(prev => [...prev, cartProduct]);
    }
    
    handleSearchModalClose();
  };

  const handleEditProduct = (product: CartProduct) => {
    setEditingProduct({ ...product });
    setShowEditModal(true);
  };

  const handleSaveProduct = (updatedProduct: CartProduct) => {
    setCartItems(prev => 
      prev.map(item => 
        item.id === updatedProduct.id ? updatedProduct : item
      )
    );
    setShowEditModal(false);
    setEditingProduct(null);
  };

  const handleCancelEdit = () => {
    setShowEditModal(false);
    setEditingProduct(null);
  };





  const handlePriceEditStart = (item: CartProduct) => {
    setEditingPriceId(item.id);
    // Show the current UoM price for editing
    const currentUoMPrice = getCurrentUoMPrice(item);
    setEditingPriceValue(currentUoMPrice.toString());
  };

  const handlePriceEditSave = (itemId: string) => {
    const newPrice = parseFloat(editingPriceValue) || 0;
    if (newPrice > 0) {
      setCartItems(prev => 
        prev.map(item => {
          if (item.id === itemId) {
            // Calculate the new primary unit price based on the edited UoM price
            const selectedUoM = item.selectedUoM || 'primary';
            let newPrimaryPrice = newPrice;
            
            if (selectedUoM === 'secondary' && item.conversionRatio) {
              // Convert secondary UoM price back to primary
              newPrimaryPrice = newPrice * parseFloat(item.conversionRatio);
            } else if (selectedUoM === 'tertiary' && item.conversionRatio && item.tertiaryConversionRatio) {
              // Convert tertiary UoM price back to primary
              const secondaryRatio = parseFloat(item.conversionRatio);
              const tertiaryRatio = parseFloat(item.tertiaryConversionRatio);
              newPrimaryPrice = newPrice * secondaryRatio * tertiaryRatio;
            }
            
            return { ...item, price: newPrimaryPrice };
          }
          return item;
        })
      );
    }
    setEditingPriceId(null);
    setEditingPriceValue('');
  };

  const handlePriceEditCancel = () => {
    setEditingPriceId(null);
    setEditingPriceValue('');
  };

  // Handle card expand/collapse functionality
  const toggleCardExpansion = (itemId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        // If card is expanded, collapse it
        newSet.delete(itemId);
        // If no cards are expanded, collapse all tax sections
        if (newSet.size === 0) {
          setExpandedTaxSections(new Set());
        }
        return newSet;
      } else {
        // If card is collapsed, expand it and collapse all others
        // Also expand tax sections when a card is expanded
        setExpandedTaxSections(new Set(['gst', 'cess']));
        return new Set([itemId]);
      }
    });
  };

  const expandCard = (itemId: string) => {
    setExpandedCards(prev => new Set([...prev, itemId]));
  };

  const collapseCard = (itemId: string) => {
    setExpandedCards(prev => {
      const newSet = new Set(prev);
      newSet.delete(itemId);
      return newSet;
    });
  };

  const collapseAllCards = () => {
    setExpandedCards(new Set());
    // Also collapse all tax sections when all cards are collapsed
    setExpandedTaxSections(new Set());
  };

  const expandOnlyCard = (itemId: string) => {
    setExpandedCards(new Set([itemId]));
    // Keep tax sections collapsed until user manually expands them
  };

  const toggleTaxSection = (itemId: string) => {
    setExpandedTaxSections(prev => {
      const newSet = new Set(prev);
      if (newSet.has(itemId)) {
        newSet.delete(itemId);
      } else {
        newSet.add(itemId);
      }
      return newSet;
    });
  };

  const formatProductNameForTaxSection = (productName: string) => {
    if (productName.length <= 20) return productName;
    return productName.substring(0, 20) + '...';
  };

  // Show custom alert
  const showCustomAlert = (title: string, message: string, type: 'error' | 'warning' | 'info' = 'info') => {
    setCustomAlert({
      visible: true,
      title,
      message,
      type
    });
  };

  // Hide custom alert
  const hideCustomAlert = () => {
    setCustomAlert({
      visible: false,
      title: '',
      message: '',
      type: 'info'
    });
  };

  const calculateItemTotal = (item: CartProduct) => {
    const currentUoMPrice = getCurrentUoMPrice(item);
    const itemSubtotal = currentUoMPrice * item.quantity;
    
    // Calculate item discount amount (but don't apply it yet)
    const itemDiscount = item.discountValue && item.discountValue > 0 
        ? (item.discountType === 'percentage' 
        ? (itemSubtotal * item.discountValue / 100)
          : item.discountValue)
      : 0;
    
    // Return base values without applying discounts or taxes
    return {
      subtotal: itemSubtotal,
      discountAmount: itemDiscount,
      taxAmount: 0, // Will be calculated later after all discounts
      cessAmount: 0, // Will be calculated later after all discounts
      total: itemSubtotal // Base total without discounts or taxes
    };
  };

  const calculateInvoiceDiscount = () => {
    const subtotal = cartItems.reduce((total, item) => {
      const currentUoMPrice = getCurrentUoMPrice(item);
      return total + (currentUoMPrice * item.quantity);
    }, 0);
    const discountValue = parseFloat(invoiceDiscountValue) || 0;
    
    if (invoiceDiscountType === 'percentage') {
      return (subtotal * discountValue) / 100;
    } else {
      return discountValue;
    }
  };

  const getUoMShortForm = _getUoMShortForm;

  // Calculate unit prices for compound UoM
  const calculateUnitPrices = (item: CartProduct) => {
    const basePrice = item.price;
    const primaryUnit = item.primaryUnit || 'Piece';
    
    if (!item.secondaryUnit || item.secondaryUnit === 'None' || !item.conversionRatio) {
      return {
        primary: { unit: primaryUnit, price: basePrice },
        secondary: null,
        tertiary: null
      };
    }

    const secondaryUnit = item.secondaryUnit;
    const secondaryPrice = basePrice / parseFloat(item.conversionRatio);
    
    if (!item.tertiaryUnit || item.tertiaryUnit === 'None' || !item.tertiaryConversionRatio) {
      return {
        primary: { unit: primaryUnit, price: basePrice },
        secondary: { unit: secondaryUnit, price: secondaryPrice },
        tertiary: null
      };
    }

    const tertiaryUnit = item.tertiaryUnit;
    // For your example: 1 Box = 100 Pieces, so 1 Piece = 22.5/100 = 0.225
    const tertiaryPrice = secondaryPrice / parseFloat(item.tertiaryConversionRatio);

    return {
      primary: { unit: primaryUnit, price: basePrice },
      secondary: { unit: secondaryUnit, price: secondaryPrice },
      tertiary: { unit: tertiaryUnit, price: tertiaryPrice }
    };
  };

  // Get the current price for the selected UoM
  const getCurrentUoMPrice = (item: CartProduct) => {
    const unitPrices = calculateUnitPrices(item);
    const selectedUoM = item.selectedUoM || 'primary';
    
    if (selectedUoM === 'primary') {
      return unitPrices.primary.price;
    } else if (selectedUoM === 'secondary' && unitPrices.secondary) {
      return unitPrices.secondary.price;
    } else if (selectedUoM === 'tertiary' && unitPrices.tertiary) {
      return unitPrices.tertiary.price;
    }
    
    return unitPrices.primary.price; // Fallback to primary
  };

  // For tax-inclusive items, extract the base (pre-tax) amount from a total
  const getBasePriceForTax = (item: CartProduct, amount: number): number => {
    if (!item.taxInclusive) return amount;
    const rate = (item.taxRate || 0) / 100;
    return amount / (1 + rate);
  };

  // Calculate UoM-adjusted tax and CESS amounts
  const calculateUoMAdjustedAmounts = (item: CartProduct, baseAmount: number) => {
    const selectedUoM = item.selectedUoM || 'primary';
    
    if (selectedUoM === 'primary' || !item.secondaryUnit || item.secondaryUnit === 'None') {
      return {
        adjustedAmount: baseAmount,
        cessPer: item.cessAmount || 0
      };
    }

    // Calculate conversion factor to adjust amounts
    let conversionFactor = 1;
    
    if (selectedUoM === 'secondary') {
      conversionFactor = 1 / parseFloat(item.conversionRatio || '1');
    } else if (selectedUoM === 'tertiary') {
      const secondaryRatio = parseFloat(item.conversionRatio || '1');
      const tertiaryRatio = parseFloat(item.tertiaryConversionRatio || '1');
      conversionFactor = 1 / (secondaryRatio * tertiaryRatio);
    }

    return {
      adjustedAmount: baseAmount * conversionFactor,
      cessPer: (item.cessAmount || 0) * conversionFactor
    };
  };

  // Calculate total available stock in lowest UoM and set limits for selected UoM
  const calculateStockLimits = (item: CartProduct) => {
    const primaryStock = item.currentStock ?? item.openingStock ?? 0;
    
    if (!item.secondaryUnit || item.secondaryUnit === 'None' || !item.conversionRatio) {
      // Single UoM product
      return {
        totalInLowestUoM: primaryStock,
        maxQuantityForSelectedUoM: primaryStock,
        lowestUoM: item.primaryUnit || 'Piece',
        selectedUoMUnit: item.primaryUnit || 'Piece'
      };
    }

    const secondaryRatio = parseFloat(item.conversionRatio || '1');
    
    if (!item.tertiaryUnit || item.tertiaryUnit === 'None' || !item.tertiaryConversionRatio) {
      // Two UoM product
      const totalInLowestUoM = primaryStock * secondaryRatio;
      const selectedUoM = item.selectedUoM || 'primary';
      
      if (selectedUoM === 'primary') {
        return {
          totalInLowestUoM,
          maxQuantityForSelectedUoM: primaryStock,
          lowestUoM: item.secondaryUnit || 'Box',
          selectedUoMUnit: item.primaryUnit || 'Piece'
        };
      } else {
        return {
          totalInLowestUoM,
          maxQuantityForSelectedUoM: totalInLowestUoM,
          lowestUoM: item.secondaryUnit || 'Piece',
          selectedUoMUnit: item.secondaryUnit || 'Piece'
        };
      }
    }

    // Three UoM product
    const tertiaryRatio = parseFloat(item.tertiaryConversionRatio || '1');
    const totalInLowestUoM = primaryStock * secondaryRatio * tertiaryRatio;
    const selectedUoM = item.selectedUoM || 'primary';
    
    if (selectedUoM === 'primary') {
      return {
        totalInLowestUoM,
        maxQuantityForSelectedUoM: primaryStock,
        lowestUoM: item.tertiaryUnit || 'Piece',
        selectedUoMUnit: item.primaryUnit || 'Piece'
      };
    } else if (selectedUoM === 'secondary') {
      return {
        totalInLowestUoM,
        maxQuantityForSelectedUoM: Math.floor(totalInLowestUoM / tertiaryRatio),
        lowestUoM: item.tertiaryUnit || 'Piece',
        selectedUoMUnit: item.secondaryUnit || 'Box'
      };
    } else {
      return {
        totalInLowestUoM,
        maxQuantityForSelectedUoM: totalInLowestUoM,
        lowestUoM: item.tertiaryUnit || 'Piece',
        selectedUoMUnit: item.tertiaryUnit || 'Piece'
      };
    }
  };

  // Helper function to calculate final discounted amount for an item (after both item and invoice discounts)
  const getFinalDiscountedAmount = (item: CartProduct) => {
    const currentUoMPrice = getCurrentUoMPrice(item);
    const itemSubtotal = currentUoMPrice * item.quantity;
    const itemDiscount = item.discountValue && item.discountValue > 0 
      ? (item.discountType === 'percentage' 
        ? (itemSubtotal * item.discountValue / 100)
        : item.discountValue)
      : 0;
    
    const itemDiscountedSubtotal = itemSubtotal - itemDiscount;
    
    // Calculate this item's proportion of the invoice discount
    const originalSubtotal = cartItems.reduce((total, cartItem) => {
      const cartItemUoMPrice = getCurrentUoMPrice(cartItem);
      return total + (cartItemUoMPrice * cartItem.quantity);
    }, 0);
    const invoiceDiscount = calculateInvoiceDiscount();
    const itemProportion = itemSubtotal / originalSubtotal;
    const itemInvoiceDiscount = invoiceDiscount * itemProportion;
    
    // Final discounted amount for this item
    const finalItemDiscountedAmount = itemDiscountedSubtotal - itemInvoiceDiscount;
    
    return {
      originalSubtotal: itemSubtotal,
      itemDiscount: itemDiscount,
      itemDiscountedSubtotal: itemDiscountedSubtotal,
      itemInvoiceDiscount: itemInvoiceDiscount,
      finalDiscountedAmount: finalItemDiscountedAmount
    };
  };

  const cartTotals = useMemo(() => {
    const originalSubtotal = cartItems.reduce((total, item) => {
      const currentUoMPrice = getCurrentUoMPrice(item);
      return total + (currentUoMPrice * item.quantity);
    }, 0);
    
    const totalItemDiscounts = cartItems.reduce((total, item) => {
      const currentUoMPrice = getCurrentUoMPrice(item);
      const itemSubtotal = currentUoMPrice * item.quantity;
      const itemDiscount = item.discountValue && item.discountValue > 0 
        ? (item.discountType === 'percentage' 
          ? (itemSubtotal * item.discountValue / 100)
          : item.discountValue)
        : 0;
      return total + itemDiscount;
    }, 0);
    
    const discountValue = parseFloat(invoiceDiscountValue) || 0;
    const invoiceDiscount = invoiceDiscountType === 'percentage'
      ? (originalSubtotal * discountValue) / 100
      : discountValue;
    
    let taxableSubtotal = 0;
    let tax = 0;
    let cess = 0;

    cartItems.forEach(item => {
      const { finalDiscountedAmount } = getFinalDiscountedAmount(item);
      const { adjustedAmount, cessPer } = calculateUoMAdjustedAmounts(item, finalDiscountedAmount);
      const taxableAmount = getBasePriceForTax(item, adjustedAmount);
      taxableSubtotal += taxableAmount;
      tax += taxableAmount * ((item.taxRate || 0) / 100);

      if (item.cessType && item.cessType !== 'none') {
        if (item.cessType === 'value') cess += taxableAmount * ((item.cessRate || 0) / 100);
        else if (item.cessType === 'quantity') cess += cessPer * item.quantity;
        else if (item.cessType === 'value_and_quantity') cess += taxableAmount * ((item.cessRate || 0) / 100) + cessPer * item.quantity;
        else if (item.cessType === 'mrp') {
          const mrpPrice = parseFloat(item.mrp || '0') || 0;
          const { adjustedAmount: adjustedMRP } = calculateUoMAdjustedAmounts(item, mrpPrice);
          cess += adjustedMRP * item.quantity * ((item.cessRate || 0) / 100);
        }
      }
    });
    
    const otherChargesTotal = otherCharges.reduce((total, charge) => {
      const amount = parseFloat(charge.amount) || 0;
      const taxRate = parseFloat(charge.taxRate) || 0;
      return total + amount + amount * (taxRate / 100);
    }, 0);
    
    const discountedSubtotal = taxableSubtotal;
    const totalDiscounts = totalItemDiscounts + invoiceDiscount;
    const exactTotal = taxableSubtotal + tax + cess + otherChargesTotal;
    const roundedTotal = Math.round(exactTotal);
    
    return {
      originalSubtotal,
      totalItemDiscounts,
      invoiceDiscount,
      discountedSubtotal,
      tax,
      cess,
      otherChargesTotal,
      exactTotal,
      roundedTotal,
      roundoffAmount: roundedTotal - exactTotal,
    };
  }, [cartItems, invoiceDiscountType, invoiceDiscountValue, otherCharges]);

  const calculateTotal = useCallback(() => cartTotals.exactTotal, [cartTotals]);
  const calculateExactTotal = calculateTotal;
  const calculateRoundoffAmount = useCallback(() => cartTotals.roundoffAmount, [cartTotals]);
  const calculateFinalTotal = useCallback(() => applyRoundoff ? cartTotals.roundedTotal : cartTotals.exactTotal, [cartTotals, applyRoundoff]);

  const formatPrice = (price: number) => formatCurrencyINR(price, 3, 0);

  const formatGSTDisplay = (taxRate: number) => {
    if (!taxRate || taxRate === 0) return '0%';
    
    // For GST rates, show as (CGST%+SGST%)
    const halfRate = taxRate / 2;
    return `(${halfRate}%+${halfRate}%)`;
  };

  const handleContinue = () => {
    if (cartItems.length === 0) {
      showError('Please add some products to continue', 'Empty Cart');
      return;
    }
    if (isNavigating) return;
    setIsNavigating(true);

    cartDataBridge.setCartData(cartItems, calculateFinalTotal(), applyRoundoff ? calculateRoundoffAmount() : 0);
    router.push({
      pathname: '/new-sale/customer-details',
      params: {
        preSelectedCustomer: preSelectedCustomer,
      }
    });

    setTimeout(() => setIsNavigating(false), 1500);
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
        
        <Text style={styles.headerTitle}>Shopping Cart</Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.addNewProductButton}
            onPress={() => safeRouter.push({
              pathname: '/inventory/manual-product',
              params: {
                returnTo: 'cart',
                preSelectedCustomer: preSelectedCustomer
              }
            })}
            activeOpacity={0.7}
          >
            <Plus size={20} color={Colors.primary} />
            <Text style={styles.addNewProductButtonText}>Add New</Text>
          </TouchableOpacity>
          
          <Text style={styles.itemCount}>
            {cartItems.length} {cartItems.length === 1 ? 'item' : 'items'}
          </Text>
        </View>
      </View>

      {/* Invoice Number Strip */}
      {nextInvoiceNumber ? (
        <View style={styles.invoiceStrip}>
          <FileText size={14} color={Colors.primary} />
          <Text style={styles.invoiceStripLabel}>Invoice:</Text>
          <Text style={styles.invoiceStripNumber}>{nextInvoiceNumber}</Text>
        </View>
      ) : null}

      {/* Cart Items */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {cartItems.length === 0 ? (
          <View style={styles.emptyCart}>
            <ShoppingCart size={64} color={Colors.textLight} />
            <Text style={styles.emptyCartTitle}>Your cart is empty</Text>
            <Text style={styles.emptyCartText}>
              Add products by searching or scanning barcodes
            </Text>
          </View>
        ) : (
          <>
            {cartItems.map((item, index) => {
              const isExpanded = expandedCards.has(item.id);
              const itemTotal = getCurrentUoMPrice(item) * item.quantity;
              const itemGST = (item.taxRate || 0);
              const taxableBase = getBasePriceForTax(item, itemTotal);
              const gstAmount = taxableBase * (itemGST / 100);
              const currentUnit = item.selectedUoM === 'secondary' ? item.secondaryUnit :
                                  item.selectedUoM === 'tertiary' ? item.tertiaryUnit :
                                  item.primaryUnit || 'Piece';
              const stockLimits = calculateStockLimits(item);
              const availableStock = stockLimits.maxQuantityForSelectedUoM - item.quantity;
              return (
              <View key={`${item.id}_${index}`} style={styles.cartItem}>
                {/* ─── Row 1: [Image + Name/Stock] ... [Qty controls] ─── */}
                <View style={styles.cardTopRow}>
                  {item.image ? (
                    <Image source={{ uri: item.image }} style={styles.productImage} />
                  ) : (
                    <View style={[styles.productImage, styles.productImagePlaceholder]}>
                      <Package size={18} color="#9CA3AF" />
                    </View>
                  )}

                  <View style={styles.cardInfoSection}>
                    <Text style={styles.productName} numberOfLines={2}>{item.name}</Text>
                    <Text style={[styles.cardStockText, availableStock <= 0 && { color: Colors.error }]}>
                      Stock: {availableStock} {stockLimits.selectedUoMUnit}s
                    </Text>
                  </View>

                  <View style={styles.collapsedQuantityControls}>
                    {(() => {
                      const qtyDec = item.quantityDecimals ?? 0;
                      const step = qtyDec > 0 ? parseFloat((1 / Math.pow(10, qtyDec)).toFixed(qtyDec)) : 1;
                      const qtyTextValue = editingQtyText[item.id] ?? item.quantity.toString();
                      const isEditing = editingQtyText[item.id] !== undefined;
                      return (
                        <>
                          <TouchableOpacity
                            style={[styles.collapsedQuantityButton, item.quantity <= step && !isEditing && styles.deleteQuantityButton]}
                            onPress={() => item.quantity <= step && !isEditing ? removeItem(item.id) : updateQuantity(item.id, parseFloat(Math.max(step, item.quantity - step).toFixed(qtyDec)))}
                            activeOpacity={0.7}
                          >
                            {item.quantity <= step && !isEditing ? (
                              <Trash2 size={13} color={Colors.error} />
                            ) : (
                              <Text style={styles.collapsedQuantityButtonText}>−</Text>
                            )}
                          </TouchableOpacity>
                          <TextInput
                            style={styles.collapsedQuantityInput}
                            value={qtyTextValue}
                            onFocus={() => setEditingQtyText(prev => ({ ...prev, [item.id]: item.quantity.toString() }))}
                            onChangeText={(text) => {
                              if (text === '' || text === '.') {
                                setEditingQtyText(prev => ({ ...prev, [item.id]: text }));
                                return;
                              }
                              if (qtyDec > 0) {
                                const regex = new RegExp(`^\\d*\\.?\\d{0,${qtyDec}}$`);
                                if (regex.test(text)) {
                                  setEditingQtyText(prev => ({ ...prev, [item.id]: text }));
                                }
                              } else {
                                if (/^\d*$/.test(text)) {
                                  setEditingQtyText(prev => ({ ...prev, [item.id]: text }));
                                }
                              }
                            }}
                            onBlur={() => {
                              const raw = editingQtyText[item.id] || '';
                              const parsed = parseFloat(raw);
                              if (!isNaN(parsed) && parsed > 0) {
                                updateQuantity(item.id, parseFloat(parsed.toFixed(qtyDec)));
                              }
                              setEditingQtyText(prev => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                            }}
                            onSubmitEditing={() => {
                              const raw = editingQtyText[item.id] || '';
                              const parsed = parseFloat(raw);
                              if (!isNaN(parsed) && parsed > 0) {
                                updateQuantity(item.id, parseFloat(parsed.toFixed(qtyDec)));
                              }
                              setEditingQtyText(prev => {
                                const next = { ...prev };
                                delete next[item.id];
                                return next;
                              });
                            }}
                            keyboardType={qtyDec > 0 ? 'decimal-pad' : 'numeric'}
                            textAlign="center"
                            selectTextOnFocus
                          />
                          <TouchableOpacity
                            style={styles.collapsedQuantityButton}
                            onPress={() => updateQuantity(item.id, parseFloat((item.quantity + step).toFixed(qtyDec)))}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.collapsedQuantityButtonText}>+</Text>
                          </TouchableOpacity>
                        </>
                      );
                    })()}
                  </View>
                </View>

                {/* ─── UoM selector (inline below name row) ─── */}
                {item.secondaryUnit && item.secondaryUnit !== 'None' && (
                  <View style={styles.inlineUomRow}>
                    {['primary', 'secondary', 'tertiary'].map(uom => {
                      const unitName = uom === 'primary' ? item.primaryUnit :
                        uom === 'secondary' ? item.secondaryUnit : item.tertiaryUnit;
                      if (!unitName || unitName === 'None') return null;
                      const isActive = item.selectedUoM === uom;
                      return (
                        <TouchableOpacity
                          key={uom}
                          style={[styles.inlineUomChip, isActive && styles.inlineUomChipActive]}
                          onPress={() => updateItemUoM(item.id, uom as 'primary' | 'secondary' | 'tertiary')}
                          activeOpacity={0.7}
                        >
                          <Text style={[styles.inlineUomChipText, isActive && styles.inlineUomChipTextActive]}>
                            {unitName}
                          </Text>
                          {isActive && (
                            <Text style={styles.inlineUomChipPrice}>
                              {formatPrice(getCurrentUoMPrice({ ...item, selectedUoM: uom as any }))}
                            </Text>
                          )}
                        </TouchableOpacity>
                      );
                    })}
                  </View>
                )}

                {/* ─── Row 2: Price per unit (tap to edit) ─── */}
                <TouchableOpacity
                  style={styles.cardPriceRow}
                  onPress={() => handlePriceEditStart(item)}
                  activeOpacity={0.7}
                >
                  {editingPriceId === item.id ? (
                    <View style={styles.collapsedPriceEditContainer}>
                      <TextInput
                        style={styles.collapsedPriceEditInput}
                        value={editingPriceValue}
                        onChangeText={setEditingPriceValue}
                        keyboardType="decimal-pad"
                        placeholder="0"
                        placeholderTextColor={Colors.textLight}
                        autoFocus
                        onBlur={() => handlePriceEditSave(item.id)}
                        onSubmitEditing={() => handlePriceEditSave(item.id)}
                      />
                      <TouchableOpacity
                        style={styles.collapsedPriceEditSave}
                        onPress={() => handlePriceEditSave(item.id)}
                        activeOpacity={0.7}
                      >
                        <Text style={styles.collapsedPriceEditSaveText}>✓</Text>
                      </TouchableOpacity>
                    </View>
                  ) : (
                    <View style={styles.cardPriceInline}>
                      <View style={styles.cardPriceLeft}>
                        <Text style={styles.cardUnitPrice}>
                          {item.taxInclusive 
                            ? `${formatPrice(getBasePriceForTax(item, getCurrentUoMPrice(item)))}/${currentUnit}`
                            : `${formatPrice(getCurrentUoMPrice(item))}/${currentUnit}`}
                        </Text>
                        {itemGST > 0 && (
                          <Text style={styles.cardGstInline}> +{itemGST}% GST{item.taxInclusive ? ' (incl.)' : ''}</Text>
                        )}
                        <Text style={styles.cardEditHint}> · Tap to edit</Text>
                      </View>
                      <Text style={styles.cardTotalPrice}>
                        {item.taxInclusive 
                          ? formatPrice(itemTotal) 
                          : formatPrice(taxableBase + gstAmount)}
                      </Text>
                    </View>
                  )}
                </TouchableOpacity>

                {/* ─── Centered expand chevron ─── */}
                <TouchableOpacity
                  style={styles.cardExpandToggle}
                  onPress={() => toggleCardExpansion(item.id)}
                  activeOpacity={0.6}
                >
                  <View style={styles.cardExpandBar} />
                  {isExpanded ? (
                    <ChevronUp size={16} color={Colors.textLight} />
                  ) : (
                    <ChevronDown size={16} color={Colors.textLight} />
                  )}
                </TouchableOpacity>

                {/* ─── Expanded Details ─── */}
                {isExpanded && (
                  <View style={styles.expandedSection}>
                    <View style={styles.collapsedMetaRow}>
                      <View style={styles.collapsedMetaLeft}>
                        <Text style={styles.collapsedMeta}>HSN: {item.hsnCode || 'N/A'}</Text>
                        {item.barcode && <Text style={styles.collapsedMeta}>Barcode: {item.barcode}</Text>}
                      </View>
                      <Text style={styles.collapsedCategory}>{item.category || 'General'}</Text>
                    </View>

                    {(() => {
                      const unitPrices = calculateUnitPrices(item);
                      return (
                        <View style={styles.expandedPriceRow}>
                          <Text style={styles.expandedLabel}>Base Price:</Text>
                          <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                            <Text style={styles.expandedValue}>
                              {formatPrice(unitPrices.primary.price)}/{unitPrices.primary.unit}
                            </Text>
                            {unitPrices.secondary && (
                              <Text style={styles.expandedValue}>
                                {formatPrice(unitPrices.secondary.price)}/{unitPrices.secondary.unit}
                              </Text>
                            )}
                            {unitPrices.tertiary && (
                              <Text style={styles.expandedValue}>
                                {formatPrice(unitPrices.tertiary.price)}/{unitPrices.tertiary.unit}
                              </Text>
                            )}
                          </View>
                        </View>
                      );
                    })()}

                    <View style={styles.expandedPriceRow}>
                      <Text style={styles.expandedLabel}>Selling in:</Text>
                      <Text style={styles.expandedValue}>{currentUnit}</Text>
                    </View>

                    {itemGST > 0 && (
                      <View style={styles.expandedGstRow}>
                        <Text style={styles.expandedLabel}>GST ({itemGST}%):</Text>
                        <View style={{ alignItems: 'flex-end' }}>
                          <Text style={styles.expandedValue}>{formatPrice(gstAmount)}</Text>
                          <Text style={styles.gstSplitText}>
                            CGST {itemGST / 2}%: {formatPrice(gstAmount / 2)} | SGST {itemGST / 2}%: {formatPrice(gstAmount / 2)}
                          </Text>
                        </View>
                      </View>
                    )}

                    {item.cessType && item.cessType !== 'none' && (
                      <View style={styles.expandedPriceRow}>
                        <Text style={styles.expandedLabel}>CESS:</Text>
                        <Text style={styles.expandedValue}>
                          {item.cessType === 'value' ? `${item.cessRate}%` : `₹${item.cessAmount}/unit`}
                        </Text>
                      </View>
                    )}

                    <TouchableOpacity
                      style={[styles.removeButton, { marginTop: 12 }]}
                      onPress={() => removeItem(item.id)}
                      activeOpacity={0.7}
                    >
                      <Trash2 size={14} color={Colors.error} />
                      <Text style={styles.removeButtonText}>Remove Item</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            );
            })}





            {/* Invoice Summary Section */}
            <View style={styles.invoiceSummarySection}>
              <Text style={styles.invoiceSummaryTitle}>Invoice Summary</Text>

              {/* Inline Discount Row */}
              <View style={styles.inlineRow}>
                <Text style={styles.inlineLabel}>Discount</Text>
                <View style={styles.inlineControls}>
                  <View style={styles.inlineToggle}>
                    <TouchableOpacity
                      style={[styles.inlineToggleBtn, invoiceDiscountType === 'percentage' && styles.inlineToggleBtnActive]}
                      onPress={() => setInvoiceDiscountType('percentage')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.inlineToggleText, invoiceDiscountType === 'percentage' && styles.inlineToggleTextActive]}>%</Text>
                    </TouchableOpacity>
                    <TouchableOpacity
                      style={[styles.inlineToggleBtn, invoiceDiscountType === 'amount' && styles.inlineToggleBtnActive]}
                      onPress={() => setInvoiceDiscountType('amount')}
                      activeOpacity={0.7}
                    >
                      <Text style={[styles.inlineToggleText, invoiceDiscountType === 'amount' && styles.inlineToggleTextActive]}>₹</Text>
                    </TouchableOpacity>
                  </View>
                  <TextInput
                    style={styles.inlineInput}
                    value={invoiceDiscountValue}
                    onChangeText={setInvoiceDiscountValue}
                    placeholder="0"
                    placeholderTextColor={Colors.textLight}
                    keyboardType="decimal-pad"
                  />
                </View>
              </View>

              {/* Inline Other Charges Row */}
              <View style={styles.inlineRow}>
                <Text style={styles.inlineLabel}>Other Charges</Text>
                <TouchableOpacity
                  style={styles.inlineAddBtn}
                  onPress={() => {
                    if (!showOtherCharges) {
                      setShowOtherCharges(true);
                      if (otherCharges.length === 0) {
                        setOtherCharges([{ id: Date.now().toString(), name: '', amount: '', taxRate: '0', description: '' }]);
                      }
                    } else {
                      setShowOtherCharges(false);
                    }
                  }}
                  activeOpacity={0.7}
                >
                  <Text style={styles.inlineAddBtnText}>{showOtherCharges ? 'Hide' : '+ Add'}</Text>
                </TouchableOpacity>
              </View>

              {showOtherCharges && (
                <View style={styles.otherChargesCompact}>
                  {otherCharges.map((charge, index) => (
                    <View key={charge.id} style={styles.chargeCompactRow}>
                      <TextInput
                        style={[styles.inlineInput, { flex: 2 }]}
                        value={charge.name}
                        onChangeText={(text) => {
                          const c = [...otherCharges]; c[index].name = text; setOtherCharges(c);
                        }}
                        placeholder="Name"
                        placeholderTextColor={Colors.textLight}
                      />
                      <TextInput
                        style={[styles.inlineInput, { flex: 1 }]}
                        value={charge.amount}
                        onChangeText={(text) => {
                          const c = [...otherCharges]; c[index].amount = text; setOtherCharges(c);
                        }}
                        placeholder="₹ Amt"
                        placeholderTextColor={Colors.textLight}
                        keyboardType="decimal-pad"
                      />
                      <TextInput
                        style={[styles.inlineInput, { width: 45, flex: 0 }]}
                        value={charge.taxRate}
                        onChangeText={(text) => {
                          const c = [...otherCharges]; c[index].taxRate = text; setOtherCharges(c);
                        }}
                        placeholder="%"
                        placeholderTextColor={Colors.textLight}
                        keyboardType="decimal-pad"
                      />
                      <TouchableOpacity
                        onPress={() => setOtherCharges(otherCharges.filter((_, i) => i !== index))}
                        activeOpacity={0.7}
                        hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                      >
                        <X size={16} color={Colors.error} />
                      </TouchableOpacity>
                    </View>
                  ))}
                  <TouchableOpacity
                    style={styles.addChargeLink}
                    onPress={() => {
                      setOtherCharges([...otherCharges, { id: Date.now().toString(), name: '', amount: '', taxRate: '0', description: '' }]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.addChargeLinkText}>+ Add another charge</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>



            {/* Total Section */}
            <View style={styles.totalSection}>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Taxable Subtotal:</Text>
                <Text style={styles.totalAmount}>
                  {formatPrice(cartTotals.discountedSubtotal)}
                </Text>
              </View>
              <View style={styles.totalRow}>
                <Text style={styles.totalLabel}>Invoice Discount:</Text>
                <Text style={styles.totalAmount}>
                  {formatPrice(calculateInvoiceDiscount())}
                </Text>
              </View>

              
              {/* GST Row (inline) */}
              {cartItems.some(item => item.taxRate && item.taxRate > 0) && (
                <>
                  <TouchableOpacity
                    style={styles.totalRow}
                    onPress={() => toggleTaxSection('gst')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.totalLabelWithChevron}>
                      <ChevronDown size={14} color={Colors.textLight} style={!expandedTaxSections.has('gst') ? { transform: [{ rotate: '-90deg' }] } : undefined} />
                      <Text style={styles.totalLabel}>GST:</Text>
                    </View>
                    <Text style={styles.totalAmount}>
                      {formatPrice(cartItems.reduce((total, item) => {
                        if (item.taxRate && item.taxRate > 0) {
                          const { finalDiscountedAmount } = getFinalDiscountedAmount(item);
                          const base = getBasePriceForTax(item, finalDiscountedAmount);
                          return total + base * (item.taxRate / 100);
                        }
                        return total;
                      }, 0))}
                    </Text>
                  </TouchableOpacity>
                  {expandedTaxSections.has('gst') && (
                    <View style={styles.taxExpandedList}>
                      {cartItems.map((item, index) => {
                        if (item.taxRate && item.taxRate > 0) {
                          const { finalDiscountedAmount } = getFinalDiscountedAmount(item);
                          const base = getBasePriceForTax(item, finalDiscountedAmount);
                          const cgst = (base * (item.taxRate / 100)) / 2;
                          const sgst = cgst;
                          return (
                            <View key={index} style={styles.taxExpandedItem}>
                              <Text style={styles.taxExpandedName} numberOfLines={1}>{item.name}</Text>
                              <Text style={styles.taxExpandedAmount}>
                                {formatPrice(cgst + sgst)}
                              </Text>
                            </View>
                          );
                        }
                        return null;
                      })}
                    </View>
                  )}
                </>
              )}

              
              {/* CESS Row (inline) */}
              {cartItems.some(item => item.cessType && item.cessType !== 'none') && (
                <>
                  <TouchableOpacity
                    style={styles.totalRow}
                    onPress={() => toggleTaxSection('cess')}
                    activeOpacity={0.7}
                  >
                    <View style={styles.totalLabelWithChevron}>
                      <ChevronDown size={14} color={Colors.textLight} style={!expandedTaxSections.has('cess') ? { transform: [{ rotate: '-90deg' }] } : undefined} />
                      <Text style={styles.totalLabel}>CESS:</Text>
                    </View>
                    <Text style={styles.totalAmount}>
                      {formatPrice(cartItems.reduce((total, item) => {
                        if (item.cessType && item.cessType !== 'none') {
                          const { finalDiscountedAmount } = getFinalDiscountedAmount(item);
                          const { adjustedAmount, cessPer } = calculateUoMAdjustedAmounts(item, finalDiscountedAmount);
                          let c = 0;
                          if (item.cessType === 'value') c = adjustedAmount * ((item.cessRate || 0) / 100);
                          else if (item.cessType === 'quantity') c = cessPer * item.quantity;
                          else if (item.cessType === 'value_and_quantity') c = adjustedAmount * ((item.cessRate || 0) / 100) + cessPer * item.quantity;
                          else if (item.cessType === 'mrp') {
                            const { adjustedAmount: am } = calculateUoMAdjustedAmounts(item, parseFloat(item.mrp || '0') || 0);
                            c = am * item.quantity * ((item.cessRate || 0) / 100);
                          }
                          return total + c;
                        }
                        return total;
                      }, 0))}
                    </Text>
                  </TouchableOpacity>
                  {expandedTaxSections.has('cess') && (
                    <View style={styles.taxExpandedList}>
                      {cartItems.map((item, index) => {
                        if (item.cessType && item.cessType !== 'none') {
                          const { finalDiscountedAmount } = getFinalDiscountedAmount(item);
                          const { adjustedAmount, cessPer } = calculateUoMAdjustedAmounts(item, finalDiscountedAmount);
                          let cessAmt = 0;
                          if (item.cessType === 'value') cessAmt = adjustedAmount * ((item.cessRate || 0) / 100);
                          else if (item.cessType === 'quantity') cessAmt = cessPer * item.quantity;
                          else if (item.cessType === 'value_and_quantity') cessAmt = adjustedAmount * ((item.cessRate || 0) / 100) + cessPer * item.quantity;
                          else if (item.cessType === 'mrp') {
                            const { adjustedAmount: am } = calculateUoMAdjustedAmounts(item, parseFloat(item.mrp || '0') || 0);
                            cessAmt = am * item.quantity * ((item.cessRate || 0) / 100);
                          }
                          return (
                            <View key={index} style={styles.taxExpandedItem}>
                              <Text style={styles.taxExpandedName} numberOfLines={1}>{item.name}</Text>
                              <Text style={styles.taxExpandedAmount}>{formatPrice(cessAmt)}</Text>
                            </View>
                          );
                        }
                        return null;
                      })}
                    </View>
                  )}
                </>
              )}
              
              {/* Roundoff Section */}
              <View style={styles.roundoffSection}>
                <View style={styles.roundoffRow}>
                  <TouchableOpacity 
                    style={styles.roundoffCheckbox}
                    onPress={() => setApplyRoundoff(!applyRoundoff)}
                    activeOpacity={0.7}
                  >
                    <View style={[styles.checkbox, applyRoundoff && styles.checkboxActive]}>
                      {applyRoundoff && <Text style={styles.checkboxText}>✓</Text>}
                    </View>
                    <Text style={styles.roundoffLabel}>Apply Round Off</Text>
                  </TouchableOpacity>
                  {applyRoundoff && (
                    <Text style={[styles.roundoffAmount, calculateRoundoffAmount() >= 0 ? styles.roundoffPositive : styles.roundoffNegative]}>
                      {calculateRoundoffAmount() >= 0 ? '+' : ''}{formatPrice(Math.abs(calculateRoundoffAmount()))}
                    </Text>
                  )}
                </View>
              </View>
              
              {/* Overall Tax Totals */}
              {cartItems.some(item => item.taxRate && item.taxRate > 0) && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Overall GST:</Text>
                  <Text style={styles.totalAmount}>
                    {formatPrice(cartItems.reduce((total, item) => {
                      if (item.taxRate && item.taxRate > 0) {
                        const { finalDiscountedAmount } = getFinalDiscountedAmount(item);
                        const base = getBasePriceForTax(item, finalDiscountedAmount);
                        return total + base * (item.taxRate / 100);
                      }
                      return total;
                    }, 0))}
                  </Text>
                </View>
              )}
              
              {cartItems.some(item => item.cessType && item.cessType !== 'none') && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Overall CESS:</Text>
                  <Text style={styles.totalAmount}>
                    {formatPrice(cartItems.reduce((total, item) => {
                      const { finalDiscountedAmount } = getFinalDiscountedAmount(item);
                      const { adjustedAmount, cessPer } = calculateUoMAdjustedAmounts(item, finalDiscountedAmount);
                      
                      let cessAmount = 0;
                      
                      if (item.cessType && item.cessType !== 'none') {
                        if (item.cessType === 'value') {
                          cessAmount = adjustedAmount * ((item.cessRate || 0) / 100);
                        } else if (item.cessType === 'quantity') {
                          cessAmount = cessPer * item.quantity;
                        } else if (item.cessType === 'value_and_quantity') {
                          const valueCess = adjustedAmount * ((item.cessRate || 0) / 100);
                          const quantityCess = cessPer * item.quantity;
                          cessAmount = valueCess + quantityCess;
                        } else if (item.cessType === 'mrp') {
                          const mrpPrice = parseFloat(item.mrp || '0') || 0;
                          const { adjustedAmount: adjustedMRP } = calculateUoMAdjustedAmounts(item, mrpPrice);
                          cessAmount = adjustedMRP * item.quantity * ((item.cessRate || 0) / 100);
                        }
                      }
                      
                      return total + cessAmount;
                    }, 0))}
                  </Text>
                </View>
              )}
              
              {/* Other Charges Total */}
              {otherCharges.length > 0 && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Other Charges:</Text>
                  <Text style={styles.totalAmount}>
                    {formatPrice(otherCharges.reduce((total, charge) => {
                      const amount = parseFloat(charge.amount) || 0;
                      return total + amount;
                    }, 0))}
                  </Text>
                </View>
              )}
              
              {/* Other Charges Tax Total */}
              {otherCharges.some(charge => parseFloat(charge.taxRate) > 0) && (
                <View style={styles.totalRow}>
                  <Text style={styles.totalLabel}>Other Charges Tax:</Text>
                  <Text style={styles.totalAmount}>
                    {formatPrice(otherCharges.reduce((total, charge) => {
                      const amount = parseFloat(charge.amount) || 0;
                      const taxRate = parseFloat(charge.taxRate) || 0;
                      const chargeTax = amount * (taxRate / 100);
                      return total + chargeTax;
                    }, 0))}
                  </Text>
                </View>
              )}
              
              <View style={[styles.totalRow, styles.grandTotalRow]}>
                <Text style={styles.grandTotalLabel}>Total:</Text>
                <Text style={styles.grandTotalAmount}>
                  {formatPrice(calculateFinalTotal())}
                </Text>
              </View>
            </View>
          </>
        )}
      </ScrollView>

      {/* Bottom Section - Search above Continue */}
      <View style={styles.bottomContainer}>
        {/* Search and Scan */}
        <View style={styles.floatingSearchContainer}>
          <View style={styles.searchContainer}>
            <TouchableOpacity
              style={styles.searchBar}
              onPress={handleSearchModalOpen}
              activeOpacity={0.7}
            >
              <Search size={20} color={Colors.textLight} />
              <Text style={styles.searchPlaceholder}>
                Search by name or barcode...
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.scanButton}
              onPress={handleScanBarcode}
              activeOpacity={0.7}
            >
              <Scan size={24} color="#ffffff" />
            </TouchableOpacity>
          </View>
        </View>

        {/* Continue Button - always at bottom */}
        {cartItems.length > 0 && (
          <TouchableOpacity
            style={[styles.continueButton, isNavigating && { opacity: 0.6 }]}
            onPress={handleContinue}
            activeOpacity={0.8}
            disabled={isNavigating}
          >
            <Text style={styles.continueButtonText}>
              {isNavigating ? 'Loading...' : `Continue to Customer Details  (${cartItems.length} ${cartItems.length === 1 ? 'item' : 'items'} · ${formatPrice(calculateFinalTotal())})`}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* Product Edit Modal */}
      {showEditModal && editingProduct && (
        <ProductEditModal
          product={editingProduct}
          onSave={handleSaveProduct}
          onCancel={handleCancelEdit}
          formatPrice={formatPrice}
        />
      )}



      {/* Search Products Modal */}
      {showSearchModal && (
        <Modal
          visible={showSearchModal}
          animationType="slide"
          presentationStyle="pageSheet"
        >
          <SafeAreaView style={styles.searchModalContainer}>
            {/* Header */}
            <View style={styles.searchModalHeader}>
              <TouchableOpacity
                style={styles.searchModalCloseButton}
                onPress={handleSearchModalClose}
                activeOpacity={0.7}
              >
                <X size={24} color={Colors.text} />
              </TouchableOpacity>
              <Text style={styles.searchModalTitle}>Search Products</Text>
            </View>

            {/* Search Input */}
            <View style={styles.modalSearchContainer}>
              <Search size={20} color={Colors.textLight} />
              <TextInput
                style={styles.modalSearchInput}
                placeholder="Search by name, barcode, category, HSN..."
                placeholderTextColor={Colors.textLight}
                value={searchQuery}
                onChangeText={handleSearch}
                autoFocus
              />
            </View>

            {/* Search Results */}
            <ScrollView style={styles.searchModalContent}>
              {searchResults.length === 0 && searchQuery.trim() !== '' ? (
                <View style={styles.noResultsContainer}>
                  <Package size={48} color={Colors.textLight} />
                  <Text style={styles.noResultsTitle}>No products found</Text>
                  <Text style={styles.noResultsText}>
                    Try searching with different keywords
                  </Text>
                </View>
              ) : searchQuery.trim() === '' ? (
                <View style={styles.noResultsContainer}>
                  <Search size={48} color={Colors.textLight} />
                  <Text style={styles.noResultsTitle}>Search Products</Text>
                  <Text style={styles.noResultsText}>
                    Type to search for products in your inventory
                  </Text>
                </View>
              ) : (
                searchResults.map((product) => (
                  <TouchableOpacity
                    key={product.id}
                    style={styles.searchResultItem}
                    onPress={() => handleProductSelectFromSearch(product)}
                    activeOpacity={0.7}
                  >
                    {product.image ? (
                      <Image source={{ uri: product.image }} style={styles.searchResultImage} />
                    ) : (
                      <View style={[styles.searchResultImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                        <Package size={16} color="#6B7280" />
                      </View>
                    )}
                    <View style={styles.searchResultInfo}>
                      <Text style={styles.searchResultName}>{product.name}</Text>
                      <Text style={styles.searchResultCategory}>{product.category}</Text>
                      <Text style={styles.searchResultStock}>
                        Stock: {product.currentStock} {product.primaryUnit}
                      </Text>
                    </View>
                    <View style={styles.searchResultPrice}>
                      <Text style={styles.searchResultPriceText}>
                        {formatPrice(product.salesPrice)}
                      </Text>
                    </View>
                  </TouchableOpacity>
                ))
              )}
            </ScrollView>
          </SafeAreaView>
        </Modal>
      )}

      {/* Custom Alert Modal */}
      {customAlert.visible && (
        <View style={styles.customAlertOverlay}>
          <View style={[
            styles.customAlertContainer,
            customAlert.type === 'error' && styles.customAlertError,
            customAlert.type === 'warning' && styles.customAlertWarning,
            customAlert.type === 'info' && styles.customAlertInfo
          ]}>
            <Text style={styles.customAlertTitle}>{customAlert.title}</Text>
            <Text style={styles.customAlertMessage}>{customAlert.message}</Text>
            <TouchableOpacity
              style={styles.customAlertButton}
              onPress={hideCustomAlert}
              activeOpacity={0.7}
            >
              <Text style={styles.customAlertButtonText}>OK</Text>
            </TouchableOpacity>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

// Product Edit Modal Component
interface ProductEditModalProps {
  product: CartProduct;
  onSave: (product: CartProduct) => void;
  onCancel: () => void;
  formatPrice: (price: number) => string;
}

interface ProductEditData {
  price: number;
  taxRate: number;
  discountType: 'percentage' | 'amount';
  discountValue: number;
  unitType: 'primary' | 'compound';
  primaryUnit: string;
  secondaryUnit?: string;
  conversionRatio?: number;
  hsnCode: string;
  batchNumber: string;
          cessType: 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp';
  cessRate?: number;
  cessAmount?: number;
  cessUnit?: string;
}

interface AddNewProductModalProps {
  onSave: (product: CartProduct) => void;
  onCancel: () => void;
  formatPrice: (price: number) => string;
}

function ProductEditModal({ product, onSave, onCancel, formatPrice }: ProductEditModalProps) {
  const [editedProduct, setEditedProduct] = useState<CartProduct>({ ...product });
  const [price, setPrice] = useState(product.price.toString());
  const [taxRate, setTaxRate] = useState((product.taxRate || 0).toString());
  const [discountType, setDiscountType] = useState<'percentage' | 'amount'>(product.discountType || 'percentage');
  const [discountValue, setDiscountValue] = useState((product.discountValue || 0).toString());
  
  // Unit of Measurement
  const [unitType, setUnitType] = useState<'primary' | 'compound'>('primary');
  const [primaryUnit, setPrimaryUnit] = useState(product.primaryUnit || 'Pieces');
  const [secondaryUnit, setSecondaryUnit] = useState('');
  const [conversionRatio, setConversionRatio] = useState('');
  
  // HSN/SAC and Batch Number
  const [hsnCode, setHsnCode] = useState(product.hsnCode || '');
  const [batchNumber, setBatchNumber] = useState(product.batchNumber || '');
  
  // CESS
  const [cessType, setCessType] = useState<'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp'>(product.cessType || 'none');
  const [cessRate, setCessRate] = useState((product.cessRate || 0).toString());
  const [cessAmount, setCessAmount] = useState((product.cessAmount || 0).toString());
  const [cessUnit, setCessUnit] = useState(product.cessUnit || '');

  const [showCessTypeModal, setShowCessTypeModal] = useState(false);
  const [cessTypeSearch, setCessTypeSearch] = useState('');
  
  // Modals
  const [showPrimaryUnitModal, setShowPrimaryUnitModal] = useState(false);
  const [showSecondaryUnitModal, setShowSecondaryUnitModal] = useState(false);
  const [showCessModal, setShowCessModal] = useState(false);
  const [showGstModal, setShowGstModal] = useState(false);
  const [showCessUnitModal, setShowCessUnitModal] = useState(false);
  
  // Search states
  const [primaryUnitSearch, setPrimaryUnitSearch] = useState('');
  const [secondaryUnitSearch, setSecondaryUnitSearch] = useState('');
  const [cessUnitSearch, setCessUnitSearch] = useState('');
  
  // Custom unit modals
  const [showCustomPrimaryUnitModal, setShowCustomPrimaryUnitModal] = useState(false);
  const [showCustomSecondaryUnitModal, setShowCustomSecondaryUnitModal] = useState(false);
  const [showCustomCessUnitModal, setShowCustomCessUnitModal] = useState(false);
  const [customPrimaryUnit, setCustomPrimaryUnit] = useState('');
  const [customSecondaryUnit, setCustomSecondaryUnit] = useState('');
  const [customCessUnit, setCustomCessUnit] = useState('');

  const handlePrimaryUnitSelect = (unit: string) => {
    setPrimaryUnit(unit);
    setShowPrimaryUnitModal(false);
  };

  const handleSecondaryUnitSelect = (unit: string) => {
    setSecondaryUnit(unit);
    setShowSecondaryUnitModal(false);
  };

  const handleCessUnitSelect = (unit: string) => {
    setCessUnit(unit);
    setShowCessUnitModal(false);
  };



  const handleCessTypeSelect = (type: string) => {
    setCessType(type as 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp');
    setShowCessTypeModal(false);
  };

  const handleCustomPrimaryUnit = () => {
    setShowPrimaryUnitModal(false);
    setTimeout(() => setShowCustomPrimaryUnitModal(true), 100);
  };

  const handleCustomSecondaryUnit = () => {
    setShowSecondaryUnitModal(false);
    setTimeout(() => setShowCustomSecondaryUnitModal(true), 100);
  };

  const handleCustomCessUnit = () => {
    setShowCessUnitModal(false);
    setTimeout(() => setShowCustomCessUnitModal(true), 100);
  };

  const handleSaveCustomPrimaryUnit = () => {
    if (customPrimaryUnit.trim()) {
      setPrimaryUnit(customPrimaryUnit.trim());
      setCustomPrimaryUnit('');
      setShowCustomPrimaryUnitModal(false);
    }
  };

  const handleSaveCustomSecondaryUnit = () => {
    if (customSecondaryUnit.trim()) {
      setSecondaryUnit(customSecondaryUnit.trim());
      setCustomSecondaryUnit('');
      setShowCustomSecondaryUnitModal(false);
    }
  };

  const handleSaveCustomCessUnit = () => {
    if (customCessUnit.trim()) {
      setCessUnit(customCessUnit.trim());
      setCustomCessUnit('');
      setShowCustomCessUnitModal(false);
    }
  };

  const handleSave = () => {
    const updatedProduct = {
      ...editedProduct,
      price: parseFloat(price) || 0,
      taxRate: parseFloat(taxRate) || 0,
      discountType,
      discountValue: parseFloat(discountValue) || 0,
      // Include HSN/SAC and Batch data
      hsnCode,
      batchNumber,
      // Include Unit data
      primaryUnit,
      // Include CESS data
      cessType,
      cessRate: parseFloat(cessRate) || 0,
      cessAmount: parseFloat(cessAmount) || 0,
      cessUnit,
    };
    onSave(updatedProduct);
  };

  const calculatePreview = () => {
    const basePrice = (parseFloat(price) || 0) * editedProduct.quantity;
    let finalPrice = basePrice;
    
    // Apply discount
    if (parseFloat(discountValue) > 0) {
      if (discountType === 'percentage') {
        finalPrice = basePrice * (1 - parseFloat(discountValue) / 100);
      } else {
        finalPrice = basePrice - parseFloat(discountValue);
      }
    }
    
    // Apply tax
    const taxAmount = finalPrice * (parseFloat(taxRate) / 100);
    
    // Calculate CESS
    let calculatedCessAmount = 0;
    if (cessType && cessType !== 'none') {
      if (cessType === 'value') {
        // Value-based CESS (percentage of base price)
        calculatedCessAmount = finalPrice * ((parseFloat(cessRate) || 0) / 100);
      } else if (cessType === 'quantity') {
        // Quantity-based CESS (fixed amount per unit)
        calculatedCessAmount = (parseFloat(cessAmount) || 0) * editedProduct.quantity;
      } else if (cessType === 'value_and_quantity') {
        // Both value and quantity CESS
        const valueCess = finalPrice * ((parseFloat(cessRate) || 0) / 100);
        const quantityCess = (parseFloat(cessAmount) || 0) * editedProduct.quantity;
        calculatedCessAmount = valueCess + quantityCess;
      } else if (cessType === 'mrp') {
        // MRP-based CESS (percentage of MRP)
        const mrpPrice = parseFloat(editedProduct.mrp || '0') || 0;
        calculatedCessAmount = mrpPrice * editedProduct.quantity * ((parseFloat(cessRate) || 0) / 100);
      }
    }
    
    const total = finalPrice + taxAmount + calculatedCessAmount;
    
    return {
      basePrice,
      discountAmount: parseFloat(discountValue) > 0 
        ? (discountType === 'percentage' 
          ? (basePrice * parseFloat(discountValue) / 100)
          : parseFloat(discountValue))
        : 0,
      taxAmount,
      cessAmount: calculatedCessAmount,
      total
    };
  };

  const preview = calculatePreview();

  return (
    <Modal
      visible={true}
      transparent={true}
      animationType="slide"
      onRequestClose={onCancel}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.modalContainer}>
          <View style={styles.modalHeader}>
            <Text style={styles.modalTitle}>Edit Product</Text>
            <TouchableOpacity
              style={styles.modalCloseButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.modalCloseText}>✕</Text>
            </TouchableOpacity>
          </View>

                                <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
                        {/* Product Info */}
                        <View style={styles.productInfoSection}>
                          {product.image ? (
                            <Image source={{ uri: product.image }} style={styles.modalProductImage} />
                          ) : (
                            <View style={[styles.modalProductImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                              <Package size={24} color="#6B7280" />
                            </View>
                          )}
                          <View style={styles.modalProductDetails}>
                            <Text style={styles.modalProductName}>{product.name}</Text>
                            <Text style={styles.modalProductCategory}>{product.category}</Text>
                            {product.barcode && (
                              <Text style={styles.modalProductBarcode}>Barcode: {product.barcode}</Text>
                            )}
                          </View>
                        </View>

                        {/* Unit of Measurement */}
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>Unit of Measurement</Text>
                          
                          {/* Unit Type Toggle */}
                          <View style={styles.unitTypeContainer}>
                            <TouchableOpacity
                              style={[
                                styles.unitTypeButton,
                                unitType === 'primary' && styles.activeUnitTypeButton
                              ]}
                              onPress={() => setUnitType('primary')}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.unitTypeText,
                                unitType === 'primary' && styles.activeUnitTypeText
                              ]}>
                                Primary
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.unitTypeButton,
                                unitType === 'compound' && styles.activeUnitTypeButton
                              ]}
                              onPress={() => setUnitType('compound')}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.unitTypeText,
                                unitType === 'compound' && styles.activeUnitTypeText
                              ]}>
                                Compound
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* Primary Unit */}
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>Primary Unit</Text>
                            <TouchableOpacity
                              style={styles.dropdownButton}
                              onPress={() => setShowPrimaryUnitModal(true)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.dropdownButtonText}>{primaryUnit}</Text>
                              <ChevronDown size={16} color={Colors.textLight} />
                            </TouchableOpacity>
                          </View>

                          {/* Secondary Unit (for compound) */}
                          {unitType === 'compound' && (
                            <>
                              <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Secondary Unit</Text>
                                <TouchableOpacity
                                  style={styles.dropdownButton}
                                  onPress={() => setShowSecondaryUnitModal(true)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.dropdownButtonText}>{secondaryUnit || 'Select Unit'}</Text>
                                  <ChevronDown size={16} color={Colors.textLight} />
                                </TouchableOpacity>
                              </View>

                              <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>Conversion Relationship</Text>
                                <View style={styles.conversionContainer}>
                                  <View style={styles.conversionLeft}>
                                    <Text style={styles.conversionLabel}>1</Text>
                                    <Text style={styles.conversionUnit}>{primaryUnit}</Text>
                                  </View>
                                  <View style={styles.conversionEquals}>
                                    <Text style={styles.conversionEqualsText}>=</Text>
                                  </View>
                                  <View style={styles.conversionRight}>
                                    <TextInput
                                      style={styles.conversionInput}
                                      value={conversionRatio}
                                      onChangeText={setConversionRatio}
                                      placeholder="0"
                                      placeholderTextColor={Colors.textLight}
                                      keyboardType="decimal-pad"
                                    />
                                    <Text style={styles.conversionUnit}>{secondaryUnit}</Text>
                                  </View>
                                </View>
                              </View>
                            </>
                          )}
                        </View>

                        {/* GST Rate Selection */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>GST Rate</Text>
                          <TouchableOpacity
                            style={styles.dropdownButton}
                            onPress={() => setShowGstModal(true)}
                            activeOpacity={0.7}
                          >
                            <Text style={styles.dropdownButtonText}>
                              {gstRates.find(rate => rate.value === parseFloat(taxRate))?.label || 'Select GST Rate'}
                            </Text>
                            <ChevronDown size={16} color={Colors.textLight} />
                          </TouchableOpacity>
                        </View>

                        {/* Price Input */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Price (₹)</Text>
                          <TextInput
                            style={styles.input}
                            value={price}
                            onChangeText={setPrice}
                            placeholder="0.00"
                            placeholderTextColor={Colors.textLight}
                            keyboardType="decimal-pad"
                          />
                        </View>

                        {/* HSN/SAC Code Input */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>HSN/SAC Code (8 digits)</Text>
                          <TextInput
                            style={styles.input}
                            value={hsnCode}
                            onChangeText={(text) => {
                              // Limit to 8 numeric characters
                              const numericOnly = text.replace(/[^0-9]/g, '');
                              if (numericOnly.length <= 8) {
                                setHsnCode(numericOnly);
                              }
                            }}
                            placeholder="12345678"
                            placeholderTextColor={Colors.textLight}
                            keyboardType="numeric"
                            maxLength={8}
                          />
                        </View>

                        {/* Batch Number Input */}
                        <View style={styles.inputGroup}>
                          <Text style={styles.inputLabel}>Batch Number</Text>
                          <TextInput
                            style={styles.input}
                            value={batchNumber}
                            onChangeText={setBatchNumber}
                            placeholder="Enter batch number"
                            placeholderTextColor={Colors.textLight}
                            keyboardType="default"
                            autoCorrect={false}
                            autoCapitalize="none"
                            spellCheck={false}
                          />
                        </View>

                        {/* CESS Section */}
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>CESS</Text>
                          
                          {/* CESS Type Selection */}
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>CESS Type</Text>
                            <TouchableOpacity
                              style={styles.dropdownButton}
                              onPress={() => setShowCessTypeModal(true)}
                              activeOpacity={0.7}
                            >
                              <Text style={styles.dropdownButtonText}>
                                {cessTypes.find(type => type.value === cessType)?.label || 'Select CESS type'}
                              </Text>
                              <ChevronDown size={20} color={Colors.textLight} />
                            </TouchableOpacity>
                          </View>



                          {/* CESS Rate (%) - Show for 'value' and 'value_and_quantity' */}
                          {(cessType === 'value' || cessType === 'value_and_quantity') && (
                            <View style={styles.inputGroup}>
                              <Text style={styles.inputLabel}>CESS Rate (%)</Text>
                              <TextInput
                                style={styles.input}
                                value={cessRate}
                                onChangeText={setCessRate}
                                placeholder="0"
                                placeholderTextColor={Colors.textLight}
                                keyboardType="numeric"
                              />
                            </View>
                          )}

                          {/* CESS Amount (₹ per unit) - Show for 'quantity' and 'value_and_quantity' */}
                          {(cessType === 'quantity' || cessType === 'value_and_quantity') && (
                            <>
                              <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>CESS Amount (₹ per unit)</Text>
                                <TextInput
                                  style={styles.input}
                                  value={cessAmount}
                                  onChangeText={setCessAmount}
                                  placeholder="0.00"
                                  placeholderTextColor={Colors.textLight}
                                  keyboardType="decimal-pad"
                                />
                              </View>
                              
                              <View style={styles.inputGroup}>
                                <Text style={styles.inputLabel}>CESS Unit</Text>
                                <TouchableOpacity
                                  style={styles.dropdownButton}
                                  onPress={() => setShowCessUnitModal(true)}
                                  activeOpacity={0.7}
                                >
                                  <Text style={styles.dropdownButtonText}>
                                    {cessUnit || 'Select unit'}
                                  </Text>
                                  <ChevronDown size={16} color={Colors.textLight} />
                                </TouchableOpacity>
                              </View>
                            </>
                          )}
                        </View>

                        {/* Discount Section */}
                        <View style={styles.section}>
                          <Text style={styles.sectionTitle}>Discount</Text>

                          {/* Discount Type Toggle */}
                          <View style={styles.discountTypeContainer}>
                            <TouchableOpacity
                              style={[
                                styles.discountTypeButton,
                                discountType === 'percentage' && styles.activeDiscountTypeButton
                              ]}
                              onPress={() => setDiscountType('percentage')}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.discountTypeText,
                                discountType === 'percentage' && styles.activeDiscountTypeText
                              ]}>
                                %
                              </Text>
                            </TouchableOpacity>

                            <TouchableOpacity
                              style={[
                                styles.discountTypeButton,
                                discountType === 'amount' && styles.activeDiscountTypeButton
                              ]}
                              onPress={() => setDiscountType('amount')}
                              activeOpacity={0.7}
                            >
                              <Text style={[
                                styles.discountTypeText,
                                discountType === 'amount' && styles.activeDiscountTypeText
                              ]}>
                                ₹
                              </Text>
                            </TouchableOpacity>
                          </View>

                          {/* Discount Value Input */}
                          <View style={styles.inputGroup}>
                            <Text style={styles.inputLabel}>
                              Discount {discountType === 'percentage' ? '(%)' : '(₹)'}
                            </Text>
                            <TextInput
                              style={styles.input}
                              value={discountValue}
                              onChangeText={setDiscountValue}
                              placeholder={discountType === 'percentage' ? '0' : '0.00'}
                              placeholderTextColor={Colors.textLight}
                              keyboardType="decimal-pad"
                            />
                          </View>
                        </View>

                        {/* Price Preview */}
                        <View style={styles.previewSection}>
                          <Text style={styles.previewTitle}>Price Breakdown</Text>
                          <View style={styles.previewRow}>
                            <Text style={styles.previewLabel}>Base Price:</Text>
                            <Text style={styles.previewValue}>{formatPrice(preview.basePrice)}</Text>
                          </View>
                          {preview.discountAmount > 0 && (
                            <View style={styles.previewRow}>
                              <Text style={styles.previewLabel}>Discount:</Text>
                              <Text style={styles.previewValue}>-{formatPrice(preview.discountAmount)}</Text>
                            </View>
                          )}
                          {parseFloat(taxRate) > 0 && (
                            <View style={styles.previewRow}>
                              <Text style={styles.previewLabel}>Tax ({taxRate}%):</Text>
                              <Text style={styles.previewValue}>{formatPrice(preview.taxAmount)}</Text>
                            </View>
                          )}
                          <View style={[styles.previewRow, styles.totalPreviewRow]}>
                            <Text style={styles.totalPreviewLabel}>Total:</Text>
                            <Text style={styles.totalPreviewValue}>{formatPrice(preview.total)}</Text>
                          </View>
                        </View>
                      </ScrollView>

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              style={styles.cancelButton}
              onPress={onCancel}
              activeOpacity={0.7}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={styles.saveButton}
              onPress={handleSave}
              activeOpacity={0.7}
            >
              <Text style={styles.saveButtonText}>Save Changes</Text>
            </TouchableOpacity>
                     </View>
         </View>
       </View>

       {/* Primary Unit Selection Modal */}
       <Modal
         visible={showPrimaryUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowPrimaryUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select Primary Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowPrimaryUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search units..."
                 placeholderTextColor={Colors.textLight}
                 value={primaryUnitSearch}
                 onChangeText={setPrimaryUnitSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Add Custom Unit Option */}
               <TouchableOpacity
                 style={styles.addCustomOption}
                 onPress={handleCustomPrimaryUnit}
                 activeOpacity={0.7}
               >
                 <Plus size={16} color={Colors.primary} />
                 <Text style={styles.addCustomText}>Add Custom Unit</Text>
               </TouchableOpacity>
               
               {/* Filtered Units */}
               {primaryUnits
                 .filter(unit => 
                   unit.toLowerCase().includes(primaryUnitSearch.toLowerCase())
                 )
                 .map((unit) => (
                   <TouchableOpacity
                     key={unit}
                     style={[
                       styles.optionItem,
                       primaryUnit === unit && styles.selectedOption
                     ]}
                     onPress={() => handlePrimaryUnitSelect(unit)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       primaryUnit === unit && styles.selectedOptionText
                     ]}>
                       {unit}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* Secondary Unit Selection Modal */}
       <Modal
         visible={showSecondaryUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowSecondaryUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select Secondary Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowSecondaryUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search units..."
                 placeholderTextColor={Colors.textLight}
                 value={secondaryUnitSearch}
                 onChangeText={setSecondaryUnitSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Add Custom Unit Option */}
               <TouchableOpacity
                 style={styles.addCustomOption}
                 onPress={handleCustomSecondaryUnit}
                 activeOpacity={0.7}
               >
                 <Plus size={16} color={Colors.primary} />
                 <Text style={styles.addCustomText}>Add Custom Unit</Text>
               </TouchableOpacity>
               
               {/* Filtered Units */}
               {secondaryUnits
                 .filter(unit => 
                   unit.toLowerCase().includes(secondaryUnitSearch.toLowerCase())
                 )
                 .map((unit) => (
                   <TouchableOpacity
                     key={unit}
                     style={[
                       styles.optionItem,
                       secondaryUnit === unit && styles.selectedOption
                     ]}
                     onPress={() => handleSecondaryUnitSelect(unit)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       secondaryUnit === unit && styles.selectedOptionText
                     ]}>
                       {unit}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* CESS Unit Selection Modal */}
       <Modal
         visible={showCessUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCessUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select CESS Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCessUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search units..."
                 placeholderTextColor={Colors.textLight}
                 value={cessUnitSearch}
                 onChangeText={setCessUnitSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Add Custom Unit Option */}
               <TouchableOpacity
                 style={styles.addCustomOption}
                 onPress={handleCustomCessUnit}
                 activeOpacity={0.7}
               >
                 <Plus size={16} color={Colors.primary} />
                 <Text style={styles.addCustomText}>Add Custom Unit</Text>
               </TouchableOpacity>
               
               {/* Filtered Units - Only show selected primary/secondary units */}
               {[primaryUnit, secondaryUnit]
                 .filter(unit => unit && unit !== 'None')
                 .filter(unit => 
                   unit.toLowerCase().includes(cessUnitSearch.toLowerCase())
                 )
                 .map((unit) => (
                   <TouchableOpacity
                     key={unit}
                     style={[
                       styles.optionItem,
                       cessUnit === unit && styles.selectedOption
                     ]}
                     onPress={() => handleCessUnitSelect(unit)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       cessUnit === unit && styles.selectedOptionText
                     ]}>
                       {unit}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* GST Rate Selection Modal */}
       <Modal
         visible={showGstModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowGstModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select GST Rate</Text>
               <TouchableOpacity
                 onPress={() => setShowGstModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {gstRates.map((rate) => (
                 <TouchableOpacity
                   key={rate.value}
                   style={[
                     styles.optionItem,
                     parseFloat(taxRate) === rate.value && styles.selectedOption
                   ]}
                   onPress={() => {
                     setTaxRate(rate.value.toString());
                     setShowGstModal(false);
                   }}
                   activeOpacity={0.7}
                 >
                   <Text style={[
                     styles.optionText,
                     parseFloat(taxRate) === rate.value && styles.selectedOptionText
                   ]}>
                     {rate.label}
                   </Text>
                 </TouchableOpacity>
               ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* Custom Primary Unit Modal */}
       <Modal
         visible={showCustomPrimaryUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCustomPrimaryUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Add Custom Primary Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCustomPrimaryUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Custom Unit Name</Text>
                 <TextInput
                   style={styles.input}
                   value={customPrimaryUnit}
                   onChangeText={setCustomPrimaryUnit}
                   placeholder="Enter custom unit name"
                   placeholderTextColor={Colors.textLight}
                   autoFocus={true}
                 />
               </View>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowCustomPrimaryUnitModal(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleSaveCustomPrimaryUnit}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>

       {/* Custom Secondary Unit Modal */}
       <Modal
         visible={showCustomSecondaryUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCustomSecondaryUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Add Custom Secondary Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCustomSecondaryUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Custom Unit Name</Text>
                 <TextInput
                   style={styles.input}
                   value={customSecondaryUnit}
                   onChangeText={setCustomSecondaryUnit}
                   placeholder="Enter custom unit name"
                   placeholderTextColor={Colors.textLight}
                   autoFocus={true}
                 />
               </View>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowCustomSecondaryUnitModal(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleSaveCustomSecondaryUnit}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>

       {/* Custom CESS Unit Modal */}
       <Modal
         visible={showCustomCessUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCustomCessUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Add Custom CESS Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCustomCessUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Custom Unit Name</Text>
                 <TextInput
                   style={styles.input}
                   value={customCessUnit}
                   onChangeText={setCustomCessUnit}
                   placeholder="Enter custom unit name"
                   placeholderTextColor={Colors.textLight}
                   autoFocus={true}
                 />
               </View>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowCustomCessUnitModal(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleSaveCustomCessUnit}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>

       {/* CESS Type Modal */}
       <Modal
         visible={showCessTypeModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCessTypeModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select CESS Type</Text>
               <TouchableOpacity
                 onPress={() => setShowCessTypeModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search CESS types..."
                 placeholderTextColor={Colors.textLight}
                 value={cessTypeSearch}
                 onChangeText={setCessTypeSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Filtered CESS Types */}
               {cessTypes
                 .filter(type => 
                   type.label.toLowerCase().includes(cessTypeSearch.toLowerCase())
                 )
                 .map((type) => (
                   <TouchableOpacity
                     key={type.value}
                     style={[
                       styles.optionItem,
                       cessType === type.value && styles.selectedOption
                     ]}
                     onPress={() => handleCessTypeSelect(type.value)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       cessType === type.value && styles.selectedOptionText
                     ]}>
                       {type.label}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>


     </Modal>
   );
 }

 function AddNewProductModal({ onSave, onCancel, formatPrice }: AddNewProductModalProps) {
   const [productName, setProductName] = useState('');
   const [productCategory, setProductCategory] = useState('');
   const [productImages, setProductImages] = useState<string[]>([]);
     const [hsnCode, setHsnCode] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [barcode, setBarcode] = useState('');
   const [price, setPrice] = useState('');
   const [taxRate, setTaxRate] = useState('0');
   const [discountType, setDiscountType] = useState<'percentage' | 'amount'>('percentage');
   const [discountValue, setDiscountValue] = useState('');
   
   // Unit of Measurement
   const [unitType, setUnitType] = useState<'primary' | 'compound'>('primary');
   const [primaryUnit, setPrimaryUnit] = useState('Piece');
   const [secondaryUnit, setSecondaryUnit] = useState('');
   const [conversionRatio, setConversionRatio] = useState('');
   
   // CESS
   const [cessType, setCessType] = useState<'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp'>('none');
   const [cessRate, setCessRate] = useState('');
   const [cessAmount, setCessAmount] = useState('');
   const [cessUnit, setCessUnit] = useState('');
   
   // Modals
   const [showPrimaryUnitModal, setShowPrimaryUnitModal] = useState(false);
   const [showSecondaryUnitModal, setShowSecondaryUnitModal] = useState(false);
   const [showCessModal, setShowCessModal] = useState(false);
   const [showGstModal, setShowGstModal] = useState(false);
   const [showCessUnitModal, setShowCessUnitModal] = useState(false);
   const [showCessTypeModal, setShowCessTypeModal] = useState(false);
   const [cessTypeSearch, setCessTypeSearch] = useState('');
   
   // Search states
   const [primaryUnitSearch, setPrimaryUnitSearch] = useState('');
   const [secondaryUnitSearch, setSecondaryUnitSearch] = useState('');
   const [cessUnitSearch, setCessUnitSearch] = useState('');
   
   // Custom unit modals
   const [showCustomPrimaryUnitModal, setShowCustomPrimaryUnitModal] = useState(false);
   const [showCustomSecondaryUnitModal, setShowCustomSecondaryUnitModal] = useState(false);
   const [showCustomCessUnitModal, setShowCustomCessUnitModal] = useState(false);
   const [customPrimaryUnit, setCustomPrimaryUnit] = useState('');
   const [customSecondaryUnit, setCustomSecondaryUnit] = useState('');
   const [customCessUnit, setCustomCessUnit] = useState('');
   
   // Barcode scanning
   const [showBarcodeScanner, setShowBarcodeScanner] = useState(false);

   const handlePrimaryUnitSelect = (unit: string) => {
     setPrimaryUnit(unit);
     setShowPrimaryUnitModal(false);
   };

   const handleSecondaryUnitSelect = (unit: string) => {
     setSecondaryUnit(unit);
     setShowSecondaryUnitModal(false);
   };

   const handleCessUnitSelect = (unit: string) => {
     setCessUnit(unit);
     setShowCessUnitModal(false);
   };

   const handleCessTypeSelect = (type: string) => {
     setCessType(type as 'none' | 'value' | 'quantity' | 'value_and_quantity' | 'mrp');
     setShowCessTypeModal(false);
   };

   const handleCustomPrimaryUnit = () => {
     setShowPrimaryUnitModal(false);
     setTimeout(() => setShowCustomPrimaryUnitModal(true), 100);
   };

   const handleCustomSecondaryUnit = () => {
     setShowSecondaryUnitModal(false);
     setTimeout(() => setShowCustomSecondaryUnitModal(true), 100);
   };

   const handleCustomCessUnit = () => {
     setShowCessUnitModal(false);
     setTimeout(() => setShowCustomCessUnitModal(true), 100);
   };

   const handleSaveCustomPrimaryUnit = () => {
     if (customPrimaryUnit.trim()) {
       setPrimaryUnit(customPrimaryUnit.trim());
       setCustomPrimaryUnit('');
       setShowCustomPrimaryUnitModal(false);
     }
   };

   const handleSaveCustomSecondaryUnit = () => {
     if (customSecondaryUnit.trim()) {
       setSecondaryUnit(customSecondaryUnit.trim());
       setCustomSecondaryUnit('');
       setShowCustomSecondaryUnitModal(false);
     }
   };

   const handleSaveCustomCessUnit = () => {
     if (customCessUnit.trim()) {
       setCessUnit(customCessUnit.trim());
       setCustomCessUnit('');
       setShowCustomCessUnitModal(false);
     }
   };

   const handleBarcodeScan = (scannedBarcode: string) => {
     setBarcode(scannedBarcode);
     setShowBarcodeScanner(false);
   };

   const handleManualBarcode = () => {
     setShowBarcodeScanner(false);
   };

   const handleProductImageSelect = async () => {
     try {
       const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
       if (status !== 'granted') {
         Alert.alert('Permission Required', 'Media library permission is required to select photos.');
         return;
       }
       const result = await ImagePicker.launchImageLibraryAsync({
         mediaTypes: ['images'],
         allowsMultipleSelection: false,
         quality: 0.8,
       });
       if (!result.canceled && result.assets && result.assets[0]?.uri) {
         setProductImages(prev => [...prev, result.assets[0].uri]);
       }
     } catch (err) {
       console.warn('Image selection failed:', err);
     }
   };

   const [isSaving, setIsSaving] = useState(false);

   const handleSave = async () => {
     if (!productName.trim() || !price.trim()) {
       showError('Please enter product name and price', 'Error');
       return;
     }

     setIsSaving(true);
     let uploadedImages: string[] = [];
     try {
       if (productImages.length > 0) {
         uploadedImages = await uploadProductImages(productImages);
       }
     } catch (err) {
       console.warn('Image upload failed:', err);
     }

     const newProduct: CartProduct = {
       id: Date.now().toString(),
       name: productName.trim(),
       price: parseFloat(price),
       image: uploadedImages.length > 0 ? uploadedImages[0] : '',
       category: productCategory.trim() || 'General',
       quantity: 1,
       barcode: barcode.trim() || undefined,
       taxRate: parseFloat(taxRate) || 0,
       discountType,
       discountValue: parseFloat(discountValue) || 0,
       brand: '',
       originalPrice: parseFloat(price),
       hsnCode: hsnCode.trim() || undefined,
       batchNumber: batchNumber.trim() || undefined,
       primaryUnit: primaryUnit || 'Piece',
       cessType,
       cessRate: parseFloat(cessRate) || 0,
       cessAmount: parseFloat(cessAmount) || 0,
       cessUnit,
     };

     setIsSaving(false);
     onSave(newProduct);
   };

   const calculatePreview = () => {
     const basePrice = parseFloat(price) || 0;
     let finalPrice = basePrice;
     
     // Apply discount
     if (parseFloat(discountValue) > 0) {
       if (discountType === 'percentage') {
         finalPrice = basePrice * (1 - parseFloat(discountValue) / 100);
       } else {
         finalPrice = basePrice - parseFloat(discountValue);
       }
     }
     
     // Apply tax
     const taxRateValue = parseFloat(taxRate) || 0;
     const taxAmount = finalPrice * (taxRateValue / 100);
     
     // Calculate CESS
     let calculatedCessAmount = 0;
     if (cessType && cessType !== 'none') {
       if (cessType === 'value') {
         // Value-based CESS (percentage of base price)
         calculatedCessAmount = finalPrice * ((parseFloat(cessRate) || 0) / 100);
       } else if (cessType === 'quantity') {
         // Quantity-based CESS (fixed amount per unit)
         calculatedCessAmount = (parseFloat(cessAmount) || 0) * 1; // For preview, quantity is 1
       } else if (cessType === 'value_and_quantity') {
         // Both value and quantity CESS
         const valueCess = finalPrice * ((parseFloat(cessRate) || 0) / 100);
         const quantityCess = (parseFloat(cessAmount) || 0) * 1; // For preview, quantity is 1
         calculatedCessAmount = valueCess + quantityCess;
       }
     }
     
     return {
       basePrice,
       discountAmount: parseFloat(discountValue) > 0
         ? (discountType === 'percentage'
           ? (basePrice * parseFloat(discountValue) / 100)
           : parseFloat(discountValue))
         : 0,
       taxAmount: taxAmount,
       cessAmount: calculatedCessAmount,
       finalPrice: finalPrice + taxAmount + calculatedCessAmount
     };
   };

   return (
     <Modal
       visible={true}
       transparent={true}
       animationType="slide"
       onRequestClose={onCancel}
     >
       <View style={styles.modalOverlay}>
         <View style={styles.modalContainer}>
           <View style={styles.modalHeader}>
             <Text style={styles.modalTitle}>Add New Product</Text>
             <TouchableOpacity onPress={onCancel} activeOpacity={0.7}>
               <Text style={styles.modalCloseText}>✕</Text>
             </TouchableOpacity>
           </View>

           <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false} contentContainerStyle={{flexGrow: 1}}>
             {/* Product Info */}
             <View style={styles.productInfoSection}>
               {productImages.length > 0 ? (
                 <Image
                   source={{ uri: productImages[0] }}
                   style={styles.modalProductImage}
                 />
               ) : (
                 <View style={[styles.modalProductImage, { backgroundColor: '#E5E7EB', justifyContent: 'center', alignItems: 'center' }]}>
                   <Package size={24} color="#6B7280" />
                 </View>
               )}
               <View style={styles.modalProductDetails}>
                 <Text style={styles.modalProductName}>New Product</Text>
                 <Text style={styles.modalProductCategory}>General</Text>
                 <Text style={styles.modalProductBarcode}>No barcode</Text>
               </View>
             </View>

             {/* Product Photo Selection */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Product Photos</Text>
               <TouchableOpacity
                 style={styles.productImageButton}
                 onPress={handleProductImageSelect}
                 activeOpacity={0.7}
               >
                 <Plus size={20} color={Colors.primary} />
                 <Text style={styles.productImageButtonText}>Add Product Photo</Text>
               </TouchableOpacity>
               {productImages.length > 0 && (
                 <View style={styles.productImagesGrid}>
                   {productImages.map((image, index) => (
                     <View key={index} style={styles.productImageCard}>
                       <Image
                         source={{ uri: image }}
                         style={styles.productImageSquare}
                       />
                       <TouchableOpacity
                         style={styles.removeImageButton}
                         onPress={() => {
                           const newImages = productImages.filter((_, i) => i !== index);
                           setProductImages(newImages);
                         }}
                         activeOpacity={0.7}
                       >
                         <X size={16} color={Colors.background} />
                       </TouchableOpacity>
                     </View>
                   ))}
                 </View>
               )}
             </View>

             {/* Product Name Input */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Product Name *</Text>
               <TextInput
                 style={styles.input}
                 value={productName}
                 onChangeText={setProductName}
                 placeholder="Enter product name"
                 placeholderTextColor={Colors.textLight}
               />
             </View>

             {/* Product Category Input */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Category</Text>
               <TextInput
                 style={styles.input}
                 value={productCategory}
                 onChangeText={setProductCategory}
                 placeholder="Enter category"
                 placeholderTextColor={Colors.textLight}
               />
             </View>

             {/* HSN/SAC Code Input */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>HSN/SAC Code (8 digits)</Text>
               <TextInput
                 style={styles.input}
                 value={hsnCode}
                 onChangeText={(text) => {
                   // Limit to 8 numeric characters
                   const numericOnly = text.replace(/[^0-9]/g, '');
                   if (numericOnly.length <= 8) {
                     setHsnCode(numericOnly);
                   }
                 }}
                 placeholder="12345678"
                 placeholderTextColor={Colors.textLight}
                 keyboardType="numeric"
                 maxLength={8}
               />
             </View>

             {/* Batch Number Input */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Batch Number</Text>
               <TextInput
                 style={styles.input}
                 value={batchNumber}
                 onChangeText={setBatchNumber}
                 placeholder="Enter batch number"
                 placeholderTextColor={Colors.textLight}
                 keyboardType="default"
                 autoCorrect={false}
                 autoCapitalize="none"
                 spellCheck={false}
               />
               </View>

               {/* Barcode Input */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Barcode</Text>
               <View style={styles.barcodeInputContainer}>
                 <TextInput
                   style={styles.barcodeInput}
                   value={barcode}
                   onChangeText={setBarcode}
                   placeholder="Enter barcode or scan"
                   placeholderTextColor={Colors.textLight}
                   keyboardType="numeric"
                 />
                 <TouchableOpacity
                   style={styles.scanButton}
                   onPress={() => setShowBarcodeScanner(true)}
                   activeOpacity={0.7}
                 >
                   <Scan size={20} color={Colors.background} />
                 </TouchableOpacity>
               </View>
             </View>

             {/* Unit of Measurement */}
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Unit of Measurement</Text>
               
               {/* Unit Type Toggle */}
               <View style={styles.unitTypeContainer}>
                 <TouchableOpacity
                   style={[
                     styles.unitTypeButton,
                     unitType === 'primary' && styles.activeUnitTypeButton
                   ]}
                   onPress={() => setUnitType('primary')}
                   activeOpacity={0.7}
                 >
                   <Text style={[
                     styles.unitTypeText,
                     unitType === 'primary' && styles.activeUnitTypeText
                   ]}>
                     Primary
                   </Text>
                 </TouchableOpacity>
                 <TouchableOpacity
                   style={[
                     styles.unitTypeButton,
                     unitType === 'compound' && styles.activeUnitTypeButton
                   ]}
                   onPress={() => setUnitType('compound')}
                   activeOpacity={0.7}
                 >
                   <Text style={[
                     styles.unitTypeText,
                     unitType === 'compound' && styles.activeUnitTypeText
                   ]}>
                     Compound
                   </Text>
                 </TouchableOpacity>
               </View>

               {/* Primary Unit Selection */}
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Primary Unit</Text>
                 <TouchableOpacity
                   style={styles.dropdownButton}
                   onPress={() => setShowPrimaryUnitModal(true)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.dropdownButtonText}>
                     {primaryUnit || 'Select primary unit'}
                   </Text>
                   <ChevronDown size={20} color={Colors.textLight} />
                 </TouchableOpacity>
               </View>

               {/* Secondary Unit Selection */}
               {unitType === 'compound' && (
                 <>
                   <View style={styles.inputGroup}>
                     <Text style={styles.inputLabel}>Secondary Unit</Text>
                     <TouchableOpacity
                       style={styles.dropdownButton}
                       onPress={() => setShowSecondaryUnitModal(true)}
                       activeOpacity={0.7}
                     >
                       <Text style={styles.dropdownButtonText}>
                         {secondaryUnit || 'Select secondary unit'}
                       </Text>
                       <ChevronDown size={20} color={Colors.textLight} />
                     </TouchableOpacity>
                   </View>

                   <View style={styles.inputGroup}>
                     <Text style={styles.inputLabel}>Conversion Relationship</Text>
                     <View style={styles.conversionContainer}>
                       <View style={styles.conversionLeft}>
                         <Text style={styles.conversionLabel}>1</Text>
                         <Text style={styles.conversionUnit}>{primaryUnit}</Text>
                       </View>
                       <View style={styles.conversionEquals}>
                         <Text style={styles.conversionEqualsText}>=</Text>
                       </View>
                       <View style={styles.conversionRight}>
                         <TextInput
                           style={styles.conversionInput}
                           value={conversionRatio}
                           onChangeText={setConversionRatio}
                           placeholder="0"
                           placeholderTextColor={Colors.textLight}
                           keyboardType="decimal-pad"
                         />
                         <Text style={styles.conversionUnit}>{secondaryUnit}</Text>
                       </View>
                     </View>
                   </View>
                 </>
               )}
             </View>

             {/* GST Rate Selection */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>GST Rate</Text>
               <TouchableOpacity
                 style={styles.dropdownButton}
                 onPress={() => setShowGstModal(true)}
                 activeOpacity={0.7}
               >
                 <Text style={styles.dropdownButtonText}>
                   {gstRates.find(rate => rate.value === parseFloat(taxRate))?.label || 'Select GST Rate'}
                 </Text>
                 <ChevronDown size={20} color={Colors.textLight} />
               </TouchableOpacity>
             </View>

             {/* Price Input */}
             <View style={styles.inputGroup}>
               <Text style={styles.inputLabel}>Price (₹) *</Text>
               <TextInput
                 style={styles.input}
                 value={price}
                 onChangeText={setPrice}
                 placeholder="0.00"
                 placeholderTextColor={Colors.textLight}
                 keyboardType="decimal-pad"
               />
             </View>

             {/* CESS Section */}
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>CESS</Text>
               
               {/* CESS Type Selection */}
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>CESS Type</Text>
                 <TouchableOpacity
                   style={styles.dropdownButton}
                   onPress={() => setShowCessTypeModal(true)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.dropdownButtonText}>
                     {cessTypes.find(type => type.value === cessType)?.label || 'Select CESS type'}
                   </Text>
                   <ChevronDown size={20} color={Colors.textLight} />
                 </TouchableOpacity>
               </View>

               {/* CESS Rate (%) - Show for 'value' and 'value_and_quantity' */}
               {(cessType === 'value' || cessType === 'value_and_quantity') && (
                 <View style={styles.inputGroup}>
                   <Text style={styles.inputLabel}>CESS Rate (%)</Text>
                   <TextInput
                     style={styles.input}
                     value={cessRate}
                     onChangeText={setCessRate}
                     placeholder="0"
                     placeholderTextColor={Colors.textLight}
                     keyboardType="numeric"
                   />
                 </View>
               )}

               {/* CESS Amount (₹ per unit) - Show for 'quantity' and 'value_and_quantity' */}
               {(cessType === 'quantity' || cessType === 'value_and_quantity') && (
                 <>
                   <View style={styles.inputGroup}>
                     <Text style={styles.inputLabel}>CESS Amount (₹ per unit)</Text>
                     <TextInput
                       style={styles.input}
                       value={cessAmount}
                       onChangeText={setCessAmount}
                       placeholder="0.00"
                       placeholderTextColor={Colors.textLight}
                       keyboardType="decimal-pad"
                     />
                   </View>
                   
                   <View style={styles.inputGroup}>
                     <Text style={styles.inputLabel}>CESS Unit</Text>
                     <TouchableOpacity
                       style={styles.dropdownButton}
                       onPress={() => setShowCessUnitModal(true)}
                       activeOpacity={0.7}
                     >
                       <Text style={styles.dropdownButtonText}>
                         {cessUnit || 'Select unit'}
                       </Text>
                       <ChevronDown size={16} color={Colors.textLight} />
                     </TouchableOpacity>
                   </View>
                 </>
               )}
             </View>

             {/* Discount Section */}
             <View style={styles.section}>
               <Text style={styles.sectionTitle}>Discount</Text>
               
               {/* Discount Type Toggle */}
                               <View style={styles.discountTypeContainer}>
                  <TouchableOpacity
                    style={[
                      styles.discountTypeButton,
                      discountType === 'percentage' && styles.activeDiscountTypeButton
                    ]}
                    onPress={() => setDiscountType('percentage')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.discountTypeText,
                      discountType === 'percentage' && styles.activeDiscountTypeText
                    ]}>%</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[
                      styles.discountTypeButton,
                      discountType === 'amount' && styles.activeDiscountTypeButton
                    ]}
                    onPress={() => setDiscountType('amount')}
                    activeOpacity={0.7}
                  >
                    <Text style={[
                      styles.discountTypeText,
                      discountType === 'amount' && styles.activeDiscountTypeText
                    ]}>₹</Text>
                  </TouchableOpacity>
                </View>
               
               {/* Discount Value Input */}
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>
                   Discount {discountType === 'percentage' ? '(%)' : '(₹)'}
                 </Text>
                 <TextInput
                   style={styles.input}
                   value={discountValue}
                   onChangeText={setDiscountValue}
                   placeholder="0"
                   placeholderTextColor={Colors.textLight}
                   keyboardType="decimal-pad"
                 />
               </View>
             </View>

             {/* Price Preview */}
             <View style={styles.previewSection}>
               <Text style={styles.previewTitle}>Price Preview</Text>
               <View style={styles.previewRow}>
                 <Text style={styles.previewLabel}>Base Price:</Text>
                 <Text style={styles.previewValue}>
                   {formatPrice(calculatePreview().basePrice)}
                 </Text>
               </View>
               {calculatePreview().discountAmount > 0 && (
                 <View style={styles.previewRow}>
                   <Text style={styles.previewLabel}>Discount:</Text>
                   <Text style={styles.previewValue}>
                     -{formatPrice(calculatePreview().discountAmount)}
                   </Text>
                 </View>
               )}
               <View style={styles.previewRow}>
                 <Text style={styles.previewLabel}>Tax:</Text>
                 <Text style={styles.previewValue}>
                   {formatPrice(calculatePreview().taxAmount)}
                 </Text>
               </View>
               <View style={[styles.previewRow, styles.totalPreviewRow]}>
                 <Text style={styles.totalPreviewLabel}>Final Price:</Text>
                 <Text style={styles.totalPreviewValue}>
                   {formatPrice(calculatePreview().finalPrice)}
                 </Text>
               </View>
             </View>
           </ScrollView>

           {/* Modal Actions */}
           <View style={styles.modalActions}>
             <TouchableOpacity
               style={styles.cancelButton}
               onPress={onCancel}
               activeOpacity={0.7}
             >
               <Text style={styles.cancelButtonText}>Cancel</Text>
             </TouchableOpacity>
             
             <TouchableOpacity
               style={styles.saveButton}
               onPress={handleSave}
               activeOpacity={0.7}
             >
               <Text style={styles.saveButtonText}>Add This Product to Inventory & Continue</Text>
             </TouchableOpacity>
           </View>
         </View>
       </View>

       {/* Primary Unit Selection Modal */}
       <Modal
         visible={showPrimaryUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowPrimaryUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select Primary Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowPrimaryUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search units..."
                 placeholderTextColor={Colors.textLight}
                 value={primaryUnitSearch}
                 onChangeText={setPrimaryUnitSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Add Custom Unit Option */}
               <TouchableOpacity
                 style={styles.addCustomOption}
                 onPress={handleCustomPrimaryUnit}
                 activeOpacity={0.7}
               >
                 <Plus size={16} color={Colors.primary} />
                 <Text style={styles.addCustomText}>Add Custom Unit</Text>
               </TouchableOpacity>
               
               {/* Filtered Units */}
               {primaryUnits
                 .filter(unit => 
                   unit.toLowerCase().includes(primaryUnitSearch.toLowerCase())
                 )
                 .map((unit) => (
                   <TouchableOpacity
                     key={unit}
                     style={[
                       styles.optionItem,
                       primaryUnit === unit && styles.selectedOption
                     ]}
                     onPress={() => handlePrimaryUnitSelect(unit)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       primaryUnit === unit && styles.selectedOptionText
                     ]}>
                       {unit}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* Secondary Unit Selection Modal */}
       <Modal
         visible={showSecondaryUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowSecondaryUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select Secondary Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowSecondaryUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search units..."
                 placeholderTextColor={Colors.textLight}
                 value={secondaryUnitSearch}
                 onChangeText={setSecondaryUnitSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Add Custom Unit Option */}
               <TouchableOpacity
                 style={styles.addCustomOption}
                 onPress={handleCustomSecondaryUnit}
                 activeOpacity={0.7}
               >
                 <Plus size={16} color={Colors.primary} />
                 <Text style={styles.addCustomText}>Add Custom Unit</Text>
               </TouchableOpacity>
               
               {/* Filtered Units */}
               {secondaryUnits
                 .filter(unit => 
                   unit.toLowerCase().includes(secondaryUnitSearch.toLowerCase())
                 )
                 .map((unit) => (
                   <TouchableOpacity
                     key={unit}
                     style={[
                       styles.optionItem,
                       secondaryUnit === unit && styles.selectedOption
                     ]}
                     onPress={() => handleSecondaryUnitSelect(unit)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       secondaryUnit === unit && styles.selectedOptionText
                     ]}>
                       {unit}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* CESS Unit Selection Modal */}
       <Modal
         visible={showCessUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCessUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select CESS Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCessUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search units..."
                 placeholderTextColor={Colors.textLight}
                 value={cessUnitSearch}
                 onChangeText={setCessUnitSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Add Custom Unit Option */}
               <TouchableOpacity
                 style={styles.addCustomOption}
                 onPress={handleCustomCessUnit}
                 activeOpacity={0.7}
               >
                 <Plus size={16} color={Colors.primary} />
                 <Text style={styles.addCustomText}>Add Custom Unit</Text>
               </TouchableOpacity>
               
               {/* Filtered Units - Only show selected primary/secondary units */}
               {[primaryUnit, secondaryUnit]
                 .filter(unit => unit && unit !== 'None')
                 .filter(unit => 
                   unit.toLowerCase().includes(cessUnitSearch.toLowerCase())
                 )
                 .map((unit) => (
                   <TouchableOpacity
                     key={unit}
                     style={[
                       styles.optionItem,
                       cessUnit === unit && styles.selectedOption
                     ]}
                     onPress={() => handleCessUnitSelect(unit)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       cessUnit === unit && styles.selectedOptionText
                     ]}>
                       {unit}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* CESS Type Modal */}
       <Modal
         visible={showCessTypeModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCessTypeModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select CESS Type</Text>
               <TouchableOpacity
                 onPress={() => setShowCessTypeModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             {/* Search Bar */}
             <View style={styles.modalSearchContainer}>
               <Search size={20} color={Colors.textLight} />
               <TextInput
                 style={styles.modalSearchInput}
                 placeholder="Search CESS types..."
                 placeholderTextColor={Colors.textLight}
                 value={cessTypeSearch}
                 onChangeText={setCessTypeSearch}
                 autoFocus={true}
               />
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {/* Filtered CESS Types */}
               {cessTypes
                 .filter(type => 
                   type.label.toLowerCase().includes(cessTypeSearch.toLowerCase())
                 )
                 .map((type) => (
                   <TouchableOpacity
                     key={type.value}
                     style={[
                       styles.optionItem,
                       cessType === type.value && styles.selectedOption
                     ]}
                     onPress={() => handleCessTypeSelect(type.value)}
                     activeOpacity={0.7}
                   >
                     <Text style={[
                       styles.optionText,
                       cessType === type.value && styles.selectedOptionText
                     ]}>
                       {type.label}
                     </Text>
                   </TouchableOpacity>
                 ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* GST Rate Selection Modal */}
       <Modal
         visible={showGstModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowGstModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Select GST Rate</Text>
               <TouchableOpacity
                 onPress={() => setShowGstModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <ScrollView style={styles.modalContent} showsVerticalScrollIndicator={false}>
               {gstRates.map((rate) => (
                 <TouchableOpacity
                   key={rate.value}
                   style={[
                     styles.optionItem,
                     parseFloat(taxRate) === rate.value && styles.selectedOption
                   ]}
                   onPress={() => {
                     setTaxRate(rate.value.toString());
                     setShowGstModal(false);
                   }}
                   activeOpacity={0.7}
                 >
                   <Text style={[
                     styles.optionText,
                     parseFloat(taxRate) === rate.value && styles.selectedOptionText
                   ]}>
                     {rate.label}
                   </Text>
                 </TouchableOpacity>
               ))}
             </ScrollView>
           </View>
         </View>
       </Modal>

       {/* Custom Primary Unit Modal */}
       <Modal
         visible={showCustomPrimaryUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCustomPrimaryUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Add Custom Primary Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCustomPrimaryUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Custom Unit Name</Text>
                 <TextInput
                   style={styles.input}
                   value={customPrimaryUnit}
                   onChangeText={setCustomPrimaryUnit}
                   placeholder="Enter custom unit name"
                   placeholderTextColor={Colors.textLight}
                   autoFocus={true}
                 />
               </View>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowCustomPrimaryUnitModal(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleSaveCustomPrimaryUnit}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>

       {/* Custom Secondary Unit Modal */}
       <Modal
         visible={showCustomSecondaryUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCustomSecondaryUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Add Custom Secondary Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCustomSecondaryUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Custom Unit Name</Text>
                 <TextInput
                   style={styles.input}
                   value={customSecondaryUnit}
                   onChangeText={setCustomSecondaryUnit}
                   placeholder="Enter custom unit name"
                   placeholderTextColor={Colors.textLight}
                   autoFocus={true}
                 />
               </View>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowCustomSecondaryUnitModal(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleSaveCustomSecondaryUnit}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>

       {/* Custom CESS Unit Modal */}
       <Modal
         visible={showCustomCessUnitModal}
         transparent
         animationType="fade"
         onRequestClose={() => setShowCustomCessUnitModal(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Add Custom CESS Unit</Text>
               <TouchableOpacity
                 onPress={() => setShowCustomCessUnitModal(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <View style={styles.inputGroup}>
                 <Text style={styles.inputLabel}>Custom Unit Name</Text>
                 <TextInput
                   style={styles.input}
                   value={customCessUnit}
                   onChangeText={setCustomCessUnit}
                   placeholder="Enter custom unit name"
                   placeholderTextColor={Colors.textLight}
                   autoFocus={true}
                 />
               </View>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowCustomCessUnitModal(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleSaveCustomCessUnit}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Save</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>

       {/* Barcode Scanner Modal */}
       <Modal
         visible={showBarcodeScanner}
         transparent
         animationType="slide"
         onRequestClose={() => setShowBarcodeScanner(false)}
       >
         <View style={styles.modalOverlay}>
           <View style={styles.modalContainer}>
             <View style={styles.modalHeader}>
               <Text style={styles.modalTitle}>Scan Barcode</Text>
               <TouchableOpacity
                 onPress={() => setShowBarcodeScanner(false)}
                 activeOpacity={0.7}
               >
                 <X size={24} color={Colors.textLight} />
               </TouchableOpacity>
             </View>
             
             <View style={styles.modalContent}>
               <Text style={styles.inputLabel}>Barcode Scanner</Text>
               <Text style={styles.modalProductBarcode}>
                 Point camera at barcode to scan
               </Text>
               
               <View style={styles.modalActions}>
                 <TouchableOpacity
                   style={styles.cancelButton}
                   onPress={() => setShowBarcodeScanner(false)}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.cancelButtonText}>Cancel</Text>
                 </TouchableOpacity>
                 
                 <TouchableOpacity
                   style={styles.saveButton}
                   onPress={handleManualBarcode}
                   activeOpacity={0.7}
                 >
                   <Text style={styles.saveButtonText}>Manual Input</Text>
                 </TouchableOpacity>
               </View>
             </View>
           </View>
         </View>
       </Modal>
     </Modal>
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
  headerRight: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: 16,
  },
  invoiceStrip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#EFF6FF',
    paddingHorizontal: 16,
    paddingVertical: 8,
    gap: 6,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  invoiceStripLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  invoiceStripNumber: {
    fontSize: 13,
    fontWeight: '700',
    color: Colors.primary,
  },
  addNewProductButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    gap: 6,
    minHeight: 32,
  },
  addNewProductButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  itemCount: {
    fontSize: 14,
    color: Colors.textLight,
    textAlignVertical: 'center',
    lineHeight: 32,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
    paddingBottom: 20,
  },
  emptyCart: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 100,
  },
  emptyCartTitle: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyCartText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
  },
  cartItem: {
    backgroundColor: Colors.background,
    borderRadius: 10,
    padding: 12,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 2,
    elevation: 1,
  },
  cardTopRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  productImagePlaceholder: {
    backgroundColor: '#F3F4F6',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cardInfoSection: {
    flex: 1,
    justifyContent: 'center',
  },
  cardPriceText: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  cardGstInline: {
    fontSize: 10,
    color: Colors.primary,
  },
  cardStockText: {
    fontSize: 11,
    color: Colors.success,
    marginTop: 1,
  },
  cardPriceRow: {
    marginTop: 8,
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
  },
  cardPriceInline: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  cardPriceLeft: {
    flexDirection: 'row',
    alignItems: 'baseline',
    flexWrap: 'wrap',
    flex: 1,
  },
  cardUnitPrice: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  cardTotalPrice: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  cardEditHint: {
    fontSize: 11,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  cardExpandToggle: {
    alignItems: 'center',
    paddingTop: 6,
    gap: 2,
  },
  cardExpandBar: {
    width: 32,
    height: 3,
    backgroundColor: Colors.grey[200],
    borderRadius: 2,
  },
  expandedSection: {
    marginTop: 4,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
    paddingTop: 8,
  },
  expandedPriceRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
  },
  expandedGstRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 6,
    backgroundColor: '#F0F7FF',
    marginHorizontal: -12,
    paddingHorizontal: 12,
  },
  expandedLabel: {
    fontSize: 13,
    color: Colors.textLight,
    fontWeight: '500',
  },
  expandedValue: {
    fontSize: 13,
    color: Colors.text,
    fontWeight: '600',
  },
  gstSplitText: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
  collapsedCartItem: {
    paddingBottom: 6,
  },
  collapsedInfo: {
    marginTop: 4,
    paddingTop: 6,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    pointerEvents: 'box-none',
  },
  collapsedRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  collapsedQuantity: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  collapsedMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  collapsedMetaLeft: {
    flex: 1,
  },
  collapsedMetaRight: {
    alignItems: 'flex-end',
  },
  collapsedMeta: {
    fontSize: 10,
    color: Colors.textLight,
    fontFamily: 'monospace',
    marginBottom: 2,
  },
  collapsedCategory: {
    fontSize: 10,
    color: Colors.primary,
    fontWeight: '600',
    backgroundColor: Colors.primary + '10',
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  collapsedSeparator: {
    height: 1,
    backgroundColor: Colors.grey[200],
    marginVertical: 6,
  },
  collapsedBasePriceSection: {
    marginBottom: 4,
  },
  collapsedBasePriceTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  collapsedPriceBreakdown: {
    backgroundColor: Colors.grey[50],
    padding: 8,
    borderRadius: 6,
  },
  collapsedPriceBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
    flexWrap: 'wrap',
  },
  collapsedPriceBreakdownItem: {
    fontSize: 10,
    color: Colors.textLight,
    fontStyle: 'italic',
    fontWeight: '400',
    backgroundColor: 'transparent',
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  collapsedControlsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginVertical: 8,
  },
  collapsedPriceSection: {
    flex: 1,
    alignItems: 'flex-start',
  },
  collapsedPriceContainer: {
    flex: 1,
    marginRight: 12,
  },
  collapsedPriceDisplay: {
    alignItems: 'flex-start',
  },
  collapsedPrice: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  collapsedPriceHint: {
    fontSize: 9,
    color: Colors.textLight,
    fontStyle: 'italic',
    marginTop: 2,
  },
  collapsedPriceEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  collapsedPriceEditInput: {
    flex: 1,
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 14,
    color: Colors.text,
    backgroundColor: Colors.background,
    minWidth: 80,
  },
  collapsedPriceEditSave: {
    backgroundColor: Colors.primary,
    borderRadius: 4,
    padding: 4,
    minWidth: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedPriceEditSaveText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '600',
  },
  collapsedUoMSection: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  collapsedUoMButton: {
    alignItems: 'center',
  },
  collapsedQuantitySection: {
    flex: 1,
    alignItems: 'flex-end',
  },
  collapsedUoM: {
    fontSize: 12,
    color: Colors.textLight,
    backgroundColor: Colors.grey[100],
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 4,
    textAlign: 'center',
    minWidth: 60,
    fontWeight: '600',
  },
  collapsedUoMHint: {
    fontSize: 8,
    color: Colors.textLight,
    fontStyle: 'italic',
    marginTop: 2,
    textAlign: 'center',
  },
  expandHintContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 8,
    gap: 4,
  },
  expandHintLine: {
    width: 40,
    height: 3,
    backgroundColor: Colors.grey[300],
    borderRadius: 2,
  },
  expandHint: {
    fontSize: 11,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  collapseButton: {
    marginTop: 8,
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: Colors.grey[100],
    borderRadius: 6,
    alignSelf: 'center',
  },
  collapseButtonText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  collapsedQuantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[100],
    borderRadius: 6,
    paddingHorizontal: 4,
    paddingVertical: 2,
    pointerEvents: 'auto', // Ensure buttons can receive touches
  },
  collapsedQuantityButton: {
    width: 24,
    height: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background,
    borderRadius: 4,
  },
  deleteQuantityButton: {
    backgroundColor: '#FEF2F2',
  },
  collapsedQuantityButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  collapsedQuantityInput: {
    width: 40,
    height: 24,
    textAlign: 'center',
    fontSize: 12,
    color: Colors.text,
    backgroundColor: Colors.background,
    borderRadius: 4,
    marginHorizontal: 4,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 10,
  },
  productTitleContainer: {
    flex: 1,
    justifyContent: 'center',
  },
  productDetailsSection: {
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  productMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 8,
    flexWrap: 'wrap',
    gap: 8,
  },
  productMeta: {
    fontSize: 11,
    color: Colors.textLight,
    fontFamily: 'monospace',
  },
  priceBreakdownContainer: {
    marginBottom: 8,
    backgroundColor: Colors.grey[50],
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
  },
  priceBreakdownRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 16,
    flexWrap: 'nowrap',
  },
  priceBreakdownTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 6,
    textAlign: 'center',
  },
  priceBreakdownItem: {
    fontSize: 11,
    color: Colors.textLight,
    fontStyle: 'italic',
    fontWeight: '400',
    backgroundColor: 'transparent',
    paddingHorizontal: 6,
    paddingVertical: 2,
  },
  selectedUoMPriceContainer: {
    marginBottom: 8,
    backgroundColor: Colors.primary + '10',
    padding: 8,
    borderRadius: 6,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '30',
  },
  selectedUoMPriceLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 4,
    textAlign: 'center',
  },
  selectedUoMPriceValue: {
    fontSize: 12,
    fontWeight: '700',
    color: Colors.primary,
    textAlign: 'center',
  },
  dynamicStockContainer: {
    alignItems: 'center',
    marginBottom: 8,
  },
  dynamicStock: {
    fontSize: 12,
    color: Colors.success,
    fontWeight: '500',
    fontStyle: 'italic',
    textAlign: 'center',
  },
  outOfStock: {
    color: Colors.error,
  },
  totalStockInfo: {
    fontSize: 10,
    color: Colors.textLight,
    fontStyle: 'italic',
    textAlign: 'center',
    marginTop: 2,
  },
  bottomPriceSection: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 12,
    marginTop: 8,
  },
  bottomPriceDisplay: {
    backgroundColor: Colors.grey[50],
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  bottomPriceLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  bottomPriceValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  cartItemBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 16,
    paddingBottom: 8,
    paddingHorizontal: 4, // Add horizontal padding to prevent edge overflow
    gap: 8, // Reduced gap since we have more space now
    overflow: 'hidden', // Strictly contain all elements
  },
  discountSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  otherChargesSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  otherChargesHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  otherChargesTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  otherChargesToggle: {
    padding: 8,
    borderRadius: 6,
    backgroundColor: Colors.primary + '20',
  },
  otherChargesToggleText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: 'bold',
  },
  otherChargesContent: {
    gap: 16,
  },
  otherChargeItem: {
    backgroundColor: Colors.background,
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  otherChargeRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  otherChargeLabel: {
    fontSize: 14,
    color: Colors.textLight,
    width: 100,
  },
  otherChargeInput: {
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    width: 150,
    textAlign: 'center',
  },
  removeOtherChargeButton: {
    backgroundColor: Colors.error + '20',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
    alignSelf: 'flex-end',
  },
  removeOtherChargeButtonText: {
    fontSize: 12,
    color: Colors.error,
    fontWeight: '600',
  },
  addOtherChargeButton: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.primary + '40',
  },
  addOtherChargeButtonText: {
    fontSize: 14,
    color: Colors.primary,
    fontWeight: '600',
  },
  inlineRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  inlineLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  inlineControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  inlineToggle: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 6,
    padding: 2,
  },
  inlineToggleBtn: {
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 4,
  },
  inlineToggleBtnActive: {
    backgroundColor: Colors.primary,
  },
  inlineToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.textLight,
  },
  inlineToggleTextActive: {
    color: '#fff',
  },
  inlineInput: {
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 5,
    fontSize: 13,
    color: Colors.text,
    minWidth: 60,
    textAlign: 'right',
  },
  inlineAddBtn: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    backgroundColor: Colors.primary + '15',
  },
  inlineAddBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
  },
  otherChargesCompact: {
    marginBottom: 10,
    gap: 6,
  },
  chargeCompactRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  addChargeLink: {
    alignSelf: 'flex-start',
    paddingVertical: 4,
  },
  addChargeLinkText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
  invoiceSummarySection: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  invoiceSummaryTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 12,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  summaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  discountControls: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 2,
    justifyContent: 'flex-end',
  },
  discountInput: {
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    width: 100,
    textAlign: 'center',
    backgroundColor: Colors.background,
    height: 40,
  },
  taxSummarySection: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 20,
    marginTop: 20,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  taxSummaryTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 16,
    textAlign: 'center',
  },
  taxSummaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  taxSummaryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.text,
  },
  taxExpandButton: {
    backgroundColor: Colors.primary + '20',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
  },
  taxExpandText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '600',
  },
  taxSummaryAmount: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.primary,
  },
  taxDetailsContainer: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  taxDetailsTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  taxDetailRow: {
    marginBottom: 8,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[100],
  },
  taxDetailItem: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
    marginBottom: 4,
  },
  taxDetailAmount: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
    textAlign: 'right',
  },
  taxDetailBreakdown: {
    fontSize: 11,
    color: Colors.textLight,
    fontStyle: 'italic',
    marginTop: 2,
  },
  discountTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  discountRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  discountLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },

  invoiceDiscountInput: {
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    width: 100,
    textAlign: 'center',
  },
  dropdownButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    backgroundColor: Colors.background,
  },
  dropdownButtonText: {
    fontSize: 14,
    color: Colors.text,
  },
  section: {
    marginBottom: 20,
  },
  unitTypeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    padding: 4,
    marginBottom: 12,
  },
  unitTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
  activeUnitTypeButton: {
    backgroundColor: Colors.background,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  unitTypeText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeUnitTypeText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  cessTypeContainer: {
    marginBottom: 16,
  },
  cessSubLabel: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  cessTypeButtons: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  cessTypeButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  cessTypeButtonText: {
    fontSize: 12,
    fontWeight: '500',
  },
  optionItem: {
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  selectedOption: {
    backgroundColor: Colors.primary + '10',
  },
  optionText: {
    fontSize: 16,
    color: Colors.text,
  },
  selectedOptionText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '600',
  },
  addCustomOption: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    backgroundColor: Colors.grey[50],
  },
  addCustomText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
    marginLeft: 8,
  },


  productImage: {
    width: 42,
    height: 42,
    borderRadius: 8,
  },
  productInfo: {
    flex: 1,
    marginRight: 12,
  },
  priceSection: {
    alignItems: 'flex-end',
  },
  productDetails: {
    marginLeft: 60, // Align with product name (image width + margin)
  },
  rightSection: {
    alignItems: 'flex-end',
    justifyContent: 'flex-start',
    paddingTop: 4,
  },
  bottomLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 16,
  },
  productName: {
    fontSize: 14,
    fontWeight: '700',
    color: Colors.text,
    lineHeight: 19,
  },
  productCategory: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
  },
  stockCount: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
    fontStyle: 'italic',
  },
  unitPriceContainer: {
    marginBottom: 4,
  },
  unitPriceText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.primary,
    marginBottom: 2,
  },
  unitPriceSubtext: {
    fontSize: 10,
    color: Colors.textLight,
    marginBottom: 1,
  },
  uomSection: {
    marginTop: 8,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  uomSectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
  },
  uomDisplayWrapper: {
    backgroundColor: Colors.grey[100],
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 6,
  },
  uomDisplayText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.text,
  },
  uomSelectorContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    width: '40%' as any,
    paddingHorizontal: 4,
    overflow: 'hidden',
  },
  uomSelectorWrapper: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[100],
    borderRadius: 20,
    padding: 3,
    flex: 1,
    overflow: 'hidden',
  },
  uomSelectorButton: {
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 18,
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'transparent',
  } as any,
  activeUomSelectorButton: {
    backgroundColor: Colors.primary,
  },
  uomSelectorButtonText: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '600',
    textAlign: 'center',
  },
  activeUomSelectorButtonText: {
    color: Colors.background,
    fontWeight: '600',
    textAlign: 'center',
  },
  inlineUomRow: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingBottom: 8,
    marginTop: -2,
  } as any,
  inlineUomChip: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: Colors.grey[100],
    borderWidth: 1.5,
    borderColor: Colors.grey[200],
    gap: 4,
  } as any,
  inlineUomChipActive: {
    backgroundColor: '#EBF0FA',
    borderColor: Colors.primary,
  },
  inlineUomChipText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
  },
  inlineUomChipTextActive: {
    color: Colors.primary,
  },
  inlineUomChipPrice: {
    fontSize: 11,
    fontWeight: '700',
    color: Colors.primary,
  },
  productPrice: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.success,
    marginBottom: 4,
  },
  barcode: {
    fontSize: 11,
    color: Colors.textLight,
    fontFamily: 'monospace',
  },
  quantityControls: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    paddingHorizontal: 6,
    paddingVertical: 4,
    alignSelf: 'flex-end', // Align to right side
    overflow: 'hidden', // Hide any overflow
  },
  quantityButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[300],
  },
  quantity: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: 6,
    minWidth: 16,
    textAlign: 'center',
  },
  quantityInput: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginHorizontal: 6,
    minWidth: 40,
    height: 32,
    textAlign: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 6,
    paddingHorizontal: 8,
    backgroundColor: Colors.background,
  },

  gstRateText: {
    fontSize: 10,
    color: Colors.textLight,
    fontStyle: 'italic',
  },
  taxBreakdownContainer: {
    marginBottom: 8,
  },
  taxBreakdownLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.textLight,
    flex: 1,
  },
  taxBreakdownRow: {
    marginBottom: 2,
  },
  taxBreakdownItem: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 1,
  },
  taxBreakdownAmount: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.text,
  },
  taxBreakdownText: {
    fontSize: 10,
    color: Colors.textLight,
    lineHeight: 12,
  },
  taxSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    marginBottom: 8,
  },
  taxSectionTotal: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginRight: 8,
  },
  taxSectionToggle: {
    fontSize: 16,
    color: Colors.textLight,
    fontWeight: 'bold',
  },
  taxBreakdownDetails: {
    marginLeft: 16,
    paddingLeft: 8,
    borderLeftWidth: 2,
    borderLeftColor: Colors.grey[300],
  },
  itemActions: {
    flex: 1,
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginLeft: 8,
  },
  itemTotal: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  removeButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: Colors.error + '40',
  },
  removeButtonText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.error,
  },
  totalSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    marginTop: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  totalRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  totalLabelWithChevron: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  totalLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  taxExpandedList: {
    marginLeft: 22,
    marginBottom: 8,
  },
  taxExpandedItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 3,
  },
  taxExpandedName: {
    fontSize: 12,
    color: Colors.textLight,
    flex: 1,
    marginRight: 8,
  },
  taxExpandedAmount: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.text,
  },
  totalAmount: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  roundoffSection: {
    marginVertical: 8,
    paddingVertical: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  roundoffRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  roundoffCheckbox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.grey[300],
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
  },
  checkboxActive: {
    backgroundColor: Colors.primary,
    borderColor: Colors.primary,
  },
  checkboxText: {
    color: Colors.background,
    fontSize: 12,
    fontWeight: '700',
  },
  roundoffLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
  },
  roundoffAmount: {
    fontSize: 14,
    fontWeight: '600',
  },
  roundoffPositive: {
    color: Colors.success,
  },
  roundoffNegative: {
    color: Colors.error,
  },
  grandTotalRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[300],
    paddingTop: 12,
    marginTop: 8,
    marginBottom: 0,
  },
  grandTotalLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  grandTotalAmount: {
    fontSize: 20,
    fontWeight: '800',
    color: Colors.success,
  },
  bottomContainer: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingTop: 8,
    paddingBottom: 8,
    gap: 8,
  },
  continueButton: {
    backgroundColor: '#3f66ac',
    borderRadius: 12,
    paddingVertical: 14,
    alignItems: 'center',
  },
  continueButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '600',
  },
  floatingSearchContainer: {
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
  },
  searchBar: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  searchPlaceholder: {
    flex: 1,
    fontSize: 14,
    color: Colors.textLight,
    marginLeft: 10,
  },
  modalSearchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.grey[100],
    borderRadius: 8,
    marginHorizontal: 20,
    marginBottom: 16,
  },
  modalSearchInput: {
    flex: 1,
    fontSize: 16,
    color: Colors.text,
    marginLeft: 8,
  },
  scanButton: {
    width: 42,
    height: 42,
    borderRadius: 12,
    backgroundColor: Colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    width: '90%',
    maxWidth: 500,
    maxHeight: '80%',
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
    borderRadius: 16,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalCloseText: {
    fontSize: 16,
    color: Colors.text,
  },
  modalContent: {
    padding: 20,
  },
  productInfoSection: {
    flexDirection: 'row',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalProductImage: {
    width: 60,
    height: 60,
    borderRadius: 8,
    marginRight: 12,
  },
  modalProductDetails: {
    flex: 1,
  },
  modalProductName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  modalProductCategory: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 2,
  },
  modalProductBarcode: {
    fontSize: 12,
    color: Colors.textLight,
  },
  inputGroup: {
    marginBottom: 16,
  },
  inputLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },

  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  discountTypeContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 2,
    gap: 2,
    width: 120,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  discountTypeButton: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 55,
  },
  activeDiscountTypeButton: {
    backgroundColor: Colors.primary,
  },
  discountTypeText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.textLight,
    textAlign: 'center',
  },
  activeDiscountTypeText: {
    color: Colors.background,
    fontWeight: '700',
  },
  previewSection: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 16,
    marginBottom: 16,
  },
  previewTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  previewRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  previewLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  previewValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  totalPreviewRow: {
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    paddingTop: 8,
    marginTop: 8,
  },
  totalPreviewLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
  },
  totalPreviewValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.success,
  },
  modalActions: {
    flexDirection: 'column',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    gap: 12,
    backgroundColor: Colors.background,
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    alignItems: 'center',
    backgroundColor: Colors.background,
  },
  cancelButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  saveButton: {
    width: '100%',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.primary,
    alignItems: 'center',
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
    textAlign: 'center',
  },
  // Cart item action styles
  itemTotals: {
    alignItems: 'flex-end',
    marginBottom: 8,
  },
  itemBreakdown: {
    fontSize: 11,
    color: Colors.textLight,
    marginTop: 2,
    textAlign: 'right',
  },
  actionButtons: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    alignSelf: 'flex-start', // Align to left side
    overflow: 'hidden', // Hide any overflow
  },
  editButton: {
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 6,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    minWidth: 60,
    minHeight: 32,
  },
  editButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.background,
  },
  conversionContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  conversionLeft: {
    alignItems: 'center',
    flex: 1,
  },
  conversionLabel: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    marginBottom: 4,
  },
  conversionUnit: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    textAlign: 'center',
  },
  conversionEquals: {
    alignItems: 'center',
    marginHorizontal: 16,
  },
  conversionEqualsText: {
    fontSize: 20,
    fontWeight: '600',
    color: Colors.textLight,
  },
  conversionRight: {
    alignItems: 'center',
    flex: 1,
  },
  conversionInput: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    textAlign: 'center',
    backgroundColor: Colors.background,
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    minWidth: 80,
    marginBottom: 4,
  },
  barcodeInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  // Search modal styles
  searchModalContainer: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  searchModalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  searchModalCloseButton: {
    padding: 8,
  },
  searchModalTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 16,
  },
  searchModalContent: {
    flex: 1,
    paddingHorizontal: 20,
  },
  noResultsContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  noResultsTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  noResultsText: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  searchResultItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 16,
    backgroundColor: Colors.background,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  searchResultImage: {
    width: 50,
    height: 50,
    borderRadius: 8,
    marginRight: 12,
  },
  searchResultInfo: {
    flex: 1,
  },
  searchResultName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 4,
  },
  searchResultCategory: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 2,
  },
  searchResultStock: {
    fontSize: 12,
    color: Colors.textLight,
  },
  searchResultPrice: {
    alignItems: 'flex-end',
  },
  searchResultPriceText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.primary,
  },
  // Inline price editing styles
  priceEditContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  priceEditInput: {
    borderWidth: 1,
    borderColor: Colors.primary,
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 4,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
    minWidth: 80,
    textAlign: 'center',
  },
  priceEditSaveButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.success,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceEditSaveText: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: '600',
  },
  priceEditCancelButton: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: Colors.error,
    justifyContent: 'center',
    alignItems: 'center',
  },
  priceEditCancelText: {
    fontSize: 12,
    color: Colors.background,
    fontWeight: '600',
  },
  priceDisplay: {
    alignItems: 'center',
  },
  priceEditHint: {
    fontSize: 10,
    color: Colors.textLight,
    marginTop: 2,
  },
  barcodeInput: {
    flex: 1,
    height: 48,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    color: Colors.text,
    backgroundColor: Colors.background,
  },
  productImageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    height: 48,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 8,
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    gap: 8,
  },
  productImageButtonText: {
    fontSize: 16,
    color: Colors.primary,
    fontWeight: '500',
  },
  productImagePreview: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    padding: 12,
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  productImageThumbnail: {
    width: 40,
    height: 40,
    borderRadius: 6,
    marginRight: 12,
  },
  productImagePreviewText: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  productImagesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: 12,
    gap: 8,
  },
  productImageCard: {
    position: 'relative',
    width: 80,
    height: 80,
    borderRadius: 8,
    overflow: 'hidden',
  },
  productImageSquare: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  removeImageButton: {
    position: 'absolute',
    top: 4,
    right: 4,
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  customAlertOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 1000,
  },
  customAlertContainer: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 20,
    marginHorizontal: 20,
    maxWidth: 300,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  customAlertError: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  customAlertWarning: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.warning,
  },
  customAlertInfo: {
    borderLeftWidth: 4,
    borderLeftColor: Colors.primary,
  },
  customAlertTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 8,
    textAlign: 'center',
  },
  customAlertMessage: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 16,
    textAlign: 'center',
    lineHeight: 20,
  },
  customAlertButton: {
    backgroundColor: Colors.primary,
    borderRadius: 8,
    paddingVertical: 12,
    paddingHorizontal: 24,
    alignSelf: 'center',
  },
  customAlertButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
    textAlign: 'center',
  },
});