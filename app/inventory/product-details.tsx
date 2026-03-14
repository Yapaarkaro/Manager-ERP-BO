import React, { useState, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  RefreshControl,
  Image,
  Alert,
  Modal,
  Dimensions,
  Platform,
  Animated,
  PanResponder,
  TextInput,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { useEffect } from 'react';
import { productStore } from '@/utils/productStore';
import { getProductInventoryLogs, getProductInventoryLogsByLocation, getProductLocationStock, getSuppliers, getReturns, invalidateApiCache } from '@/services/backendApi';
import { ArrowLeft, Package, ChartBar as BarChart3, Hash, Scan, Building2, MapPin, Calendar, TrendingUp, TrendingDown, ShoppingCart, FileText, Eye, Plus, Minus, Trash2, Percent, IndianRupee, Edit3, Phone, ChevronDown, Filter, X, Printer, GripHorizontal, Download } from 'lucide-react-native';
import { generateBarcodeImage } from '@/utils/barcodeGenerator';
import { useBusinessData } from '@/hooks/useBusinessData';
import { formatQty, formatCurrencyINR } from '@/utils/formatters';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { safeRouter } from '@/utils/safeRouter';
import { setNavData } from '@/utils/navStore';

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

interface InventoryLog {
  id: string;
  type: 'opening_stock' | 'sale' | 'purchase' | 'return' | 'adjustment' | 'transfer';
  invoiceNumber?: string;
  quantity: number;
  date: string;
  staffName: string;
  customerName?: string;
  supplierName?: string;
  reason?: string;
  balanceAfter: number;
  locationName?: string;
  locationId?: string;
  referenceType?: string;
  referenceId?: string;
  unitPrice?: number;
  totalValue?: number;
}

interface LocationStock {
  locationId: string;
  locationName: string;
  locationType: string;
  quantity: number;
  lastUpdated: string;
  updatedBy?: string;
}

// Mock data removed - now fetching from backend

export default function ProductDetailsScreen() {
  const { productId } = useLocalSearchParams();
  const finalProductId = productId as string | null;
  const product = finalProductId ? productStore.getProductById(finalProductId) : null;
  
  // If product is still not found, show error
  if (!product) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'left', 'right']}>
        <View style={styles.header}>
          <TouchableOpacity
            style={styles.backButton}
            onPress={() => router.back()}
            activeOpacity={0.7}
          >
            <ArrowLeft size={24} color={Colors.text} />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Product Details</Text>
        </View>
        <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}>
          <Text style={{ fontSize: 16, color: Colors.error, textAlign: 'center' }}>
            Product not found. Please go back and try again.
          </Text>
        </View>
      </SafeAreaView>
    );
  }
  
  const insets = useSafeAreaInsets();

  const [selectedTab, setSelectedTab] = useState<'details' | 'inventory'>('details');
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [inventoryLogs, setInventoryLogs] = useState<InventoryLog[]>([]);
  const [loadingLogs, setLoadingLogs] = useState(false);
  const [selectedUoM, setSelectedUoM] = useState<'primary' | 'secondary' | 'tertiary'>('primary');
  const [selectedLocationId, setSelectedLocationId] = useState<string | null>(null); // null = all locations
  const [locationStock, setLocationStock] = useState<LocationStock[]>([]);
  const [showUoMModal, setShowUoMModal] = useState(false);
  const [showLocationFilterModal, setShowLocationFilterModal] = useState(false);
  const [showImageModal, setShowImageModal] = useState(false);
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const imageScrollViewRef = useRef<ScrollView>(null);
  const [suppliersCache, setSuppliersCache] = useState<Record<string, any>>({});
  const [refreshing, setRefreshing] = useState(false);

  const [showPrintModal, setShowPrintModal] = useState(false);
  const [selectedStickerSize, setSelectedStickerSize] = useState<string>('small');
  const [isCustomSize, setIsCustomSize] = useState(false);
  const [customWidth, setCustomWidth] = useState('50');
  const [customHeight, setCustomHeight] = useState('25');
  const [customUnit, setCustomUnit] = useState<'mm' | 'inches'>('mm');
  const [isPrinting, setIsPrinting] = useState(false);
  const [printShowMRP, setPrintShowMRP] = useState(true);
  const [printShowStoreName, setPrintShowStoreName] = useState(true);
  const [printShowProductName, setPrintShowProductName] = useState(true);
  const { data: businessDataHook } = useBusinessData();
  const storeName = businessDataHook?.business?.legal_name || businessDataHook?.business?.owner_name || '';

  const STICKER_SIZES = [
    { id: 'small', label: 'Small / Retail', size: '38 x 25 mm', w: 38, h: 25, desc: 'Price tags & MRP' },
    { id: 'medium', label: 'Medium', size: '50 x 25 mm', w: 50, h: 25, desc: 'Standard product boxes' },
    { id: 'square', label: 'Square', size: '50 x 50 mm', w: 50, h: 50, desc: 'QR codes / detailed info' },
    { id: 'large', label: 'Large / Industrial', size: '100 x 50 mm', w: 100, h: 50, desc: 'Outer carton / warehouse' },
    { id: 'shipping', label: 'Shipping', size: '100 x 150 mm', w: 100, h: 150, desc: 'Amazon/Flipkart labels' },
    { id: 'specialty', label: 'Specialty', size: '100 x 15 mm', w: 100, h: 15, desc: 'Jewellery tags' },
  ];

  const getActiveSizeMm = () => {
    if (isCustomSize) {
      const w = parseFloat(customWidth) || 50;
      const h = parseFloat(customHeight) || 25;
      if (customUnit === 'inches') return { w: w * 25.4, h: h * 25.4 };
      return { w, h };
    }
    const s = STICKER_SIZES.find(s => s.id === selectedStickerSize);
    return s ? { w: s.w, h: s.h } : { w: 38, h: 25 };
  };

  const buildPrintHtml = (barcodeDataUri: string | null) => {
    const { w, h } = getActiveSizeMm();
    const area = w * h;

    const pxW = (w / 25.4) * 96;
    const pxH = (h / 25.4) * 96;

    const extraLines = (printShowStoreName && storeName ? 1 : 0) + (printShowProductName ? 1 : 0) + (printShowMRP ? 1 : 0);
    const barcodeH = Math.max(25, Math.min(pxH * (extraLines <= 1 ? 0.55 : 0.40), 120));
    const storeSize = Math.max(6, Math.min(11, pxW / 18));
    const nameSize = Math.max(7, Math.min(15, pxW / 14));
    const priceSize = Math.max(8, Math.min(16, pxW / 12));

    return `<!DOCTYPE html><html><head><meta charset="utf-8"/>
<style>
@page { size: ${w}mm ${h}mm; margin: 0; }
* { margin: 0; padding: 0; box-sizing: border-box; }
body { width: ${w}mm; height: ${h}mm; display: flex; flex-direction: column; align-items: center; justify-content: center; font-family: Arial, Helvetica, sans-serif; padding: 1mm; overflow: hidden; }
.store { font-size: ${storeSize}px; font-weight: 600; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; margin-bottom: 0.3mm; color: #333; }
.name { font-size: ${nameSize}px; font-weight: 700; text-align: center; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; max-width: 100%; margin-bottom: 0.3mm; }
.price { font-size: ${priceSize}px; font-weight: 800; text-align: center; margin-bottom: 0.5mm; }
.barcode-wrap { display: flex; flex-direction: column; align-items: center; flex: 1; justify-content: center; width: 100%; }
.barcode-img { max-width: 98%; height: ${barcodeH}px; object-fit: contain; }
</style></head><body>
${printShowStoreName && storeName && area >= 800 ? `<div class="store">${storeName}</div>` : ''}
${printShowProductName && area >= 600 ? `<div class="name">${product.name}</div>` : ''}
${printShowMRP ? `<div class="price">MRP ${formatCurrencyINR(product.mrp || product.salesPrice || 0)}</div>` : ''}
<div class="barcode-wrap">
${barcodeDataUri ? `<img class="barcode-img" src="${barcodeDataUri}" />` : ''}
</div>
</body></html>`;
  };

  const getBarcodeUri = async (): Promise<string | null> => {
    if (!product.barcode) return null;
    const images = product.productImages || [];
    const lastImg = images[images.length - 1];
    if (lastImg && lastImg.startsWith('data:image')) return lastImg;
    return generateBarcodeImage(product.barcode);
  };

  const handlePrintBarcode = async () => {
    setIsPrinting(true);
    try {
      const barcodeUri = await getBarcodeUri();
      const html = buildPrintHtml(barcodeUri);
      await Print.printAsync({ html });
    } catch (error: any) {
      Alert.alert('Print Error', error.message || 'Failed to print barcode label');
    } finally {
      setIsPrinting(false);
    }
  };

  const handleDownloadPdf = async () => {
    setIsPrinting(true);
    try {
      const barcodeUri = await getBarcodeUri();
      const html = buildPrintHtml(barcodeUri);
      const { uri } = await Print.printToFileAsync({ html });
      const isAvailable = await Sharing.isAvailableAsync();
      if (isAvailable) {
        await Sharing.shareAsync(uri, {
          mimeType: 'application/pdf',
          dialogTitle: `Barcode - ${product.name}`,
          UTI: 'com.adobe.pdf',
        });
      } else {
        Alert.alert('Saved', `PDF saved to: ${uri}`);
      }
    } catch (error: any) {
      Alert.alert('Download Error', error.message || 'Failed to generate PDF');
    } finally {
      setIsPrinting(false);
    }
  };

  const EXPANDED_OFFSET = 0;
  const DEFAULT_COLLAPSED = 400;
  const collapsedOffsetRef = useRef(DEFAULT_COLLAPSED);
  const [bgHeight, setBgHeight] = useState(DEFAULT_COLLAPSED);
  const [isSheetExpanded, setIsSheetExpanded] = useState(false);

  const sheetTranslateY = useRef(new Animated.Value(DEFAULT_COLLAPSED)).current;
  const lastSheetOffset = useRef(DEFAULT_COLLAPSED);

  const onBackgroundLayout = (e: any) => {
    const measuredHeight = e.nativeEvent.layout.height;
    if (measuredHeight > 0 && Math.abs(measuredHeight - collapsedOffsetRef.current) > 5) {
      collapsedOffsetRef.current = measuredHeight;
      setBgHeight(measuredHeight);
      if (lastSheetOffset.current !== EXPANDED_OFFSET) {
        lastSheetOffset.current = measuredHeight;
        sheetTranslateY.setValue(measuredHeight);
      }
    }
  };

  const snapSheet = (toExpanded: boolean) => {
    const toValue = toExpanded ? EXPANDED_OFFSET : collapsedOffsetRef.current;
    lastSheetOffset.current = toValue;
    setIsSheetExpanded(toExpanded);
    Animated.spring(sheetTranslateY, {
      toValue,
      useNativeDriver: true,
      tension: 65,
      friction: 11,
    }).start();
  };

  const sheetPanResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: (_, gs) => Math.abs(gs.dy) > 5,
      onPanResponderGrant: () => {
        sheetTranslateY.setOffset(lastSheetOffset.current);
        sheetTranslateY.setValue(0);
      },
      onPanResponderMove: Animated.event(
        [null, { dy: sheetTranslateY }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (_, gs) => {
        sheetTranslateY.flattenOffset();
        const currentVal = lastSheetOffset.current + gs.dy;
        const midpoint = collapsedOffsetRef.current / 2;
        if (gs.vy > 0.5) {
          snapSheet(false);
        } else if (gs.vy < -0.5) {
          snapSheet(true);
        } else {
          snapSheet(currentVal < midpoint);
        }
      },
    })
  ).current;

  // Load suppliers from backend
  useEffect(() => {
    const loadSuppliers = async () => {
      try {
        const result = await getSuppliers();
        if (result.success && result.suppliers) {
          const cache: Record<string, any> = {};
          result.suppliers.forEach((sup: any) => {
            cache[sup.id] = {
              id: sup.id,
              name: sup.contact_person || '',
              businessName: sup.business_name || '',
              supplierType: sup.supplier_type || 'business',
              contactPerson: sup.contact_person || '',
              mobile: sup.mobile_number || '',
              email: sup.email || '',
              address: `${sup.address_line_1 || ''}, ${sup.address_line_2 ? sup.address_line_2 + ', ' : ''}${sup.address_line_3 ? sup.address_line_3 + ', ' : ''}${sup.city || ''}, ${sup.pincode || ''}, ${sup.state || ''}`,
              gstin: sup.gstin_pan || '',
              status: sup.status || 'active',
            };
          });
          setSuppliersCache(cache);
        }
      } catch (error) {
        console.error('Error loading suppliers:', error);
      }
    };
    loadSuppliers();
  }, []);

  // Load location stock from backend
  useEffect(() => {
    const loadLocationStock = async () => {
      if (!finalProductId) return;

      try {
        const result = await getProductLocationStock(finalProductId);
        if (result.success && result.locationStock) {
          setLocationStock(result.locationStock);
        }
      } catch (error) {
        console.error('Error loading location stock:', error);
      }
    };

    loadLocationStock();
  }, [finalProductId]);

  // Load inventory logs from backend eagerly
  useEffect(() => {
    const loadInventoryLogs = async () => {
      if (!finalProductId) return;
      
      setLoadingLogs(true);
      try {
        const [result, returnsResult] = await Promise.all([
          selectedLocationId
            ? getProductInventoryLogsByLocation(finalProductId, selectedLocationId)
            : getProductInventoryLogs(finalProductId),
          typeof getReturns === 'function' ? getReturns().catch(() => ({ success: false })) : Promise.resolve({ success: false }),
        ]);
          
        let allLogs: InventoryLog[] = [];

        if (result.success && result.logs) {
          allLogs = result.logs.map((log: any) => ({
            id: log.id,
            type: log.transaction_type || log.type,
            invoiceNumber: log.reference_number || log.invoiceNumber,
            quantity: log.quantity_change ?? log.quantity ?? 0,
            date: log.transaction_date || log.date || log.created_at,
            staffName: log.staff_name || log.staffName || 'Staff',
            customerName: log.customer_name || log.customerName,
            supplierName: log.supplier_name || log.supplierName,
            reason: log.reason || log.notes,
            balanceAfter: log.balance_after ?? log.balanceAfter ?? 0,
            locationName: log.location_name || log.locationName,
            locationId: log.location_id || log.locationId,
            referenceType: log.reference_type || log.referenceType,
            referenceId: log.reference_id || log.referenceId,
            unitPrice: log.unit_price ?? log.unitPrice,
            totalValue: log.total_value ?? log.totalValue,
          }));
        }

        const existingReturnIds = new Set(
          allLogs.filter(l => l.type === 'return').map(l => l.referenceId)
        );

        if (returnsResult.success && returnsResult.returns) {
          returnsResult.returns.forEach((ret: any) => {
            if (existingReturnIds.has(ret.id)) return;
            const items = ret.items || [];
            items.forEach((item: any) => {
              const pid = item.product_id || item.productId;
              if (pid !== finalProductId) return;
              const qty = Number(item.quantity) || 0;
              allLogs.push({
                id: `return-${ret.id}-${pid}`,
                type: 'return',
                invoiceNumber: ret.return_number || ret.return_invoice_number || '',
                quantity: qty,
                date: ret.return_date || ret.created_at || '',
                staffName: ret.staff_name || 'Staff',
                customerName: ret.customer_name || '',
                reason: item.reason || ret.reason || 'Customer return',
                balanceAfter: 0,
                referenceType: 'return',
                referenceId: ret.id,
                unitPrice: Number(item.unit_price || item.unitPrice) || 0,
                totalValue: Number(item.total_price || item.totalPrice) || (qty * (Number(item.unit_price || item.unitPrice) || 0)),
              });
            });
          });
        }

        allLogs.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime());
        setInventoryLogs(allLogs);
      } catch (error) {
        console.error('Error loading inventory logs:', error);
        setInventoryLogs([]);
      } finally {
        setLoadingLogs(false);
      }
    };

    loadInventoryLogs();
  }, [finalProductId, selectedLocationId]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    invalidateApiCache();
    const suppliersPromise = getSuppliers().then(result => {
      if (result.success && result.suppliers) {
        const cache: Record<string, any> = {};
        result.suppliers.forEach((sup: any) => {
          cache[sup.id] = {
            id: sup.id,
            name: sup.contact_person || '',
            businessName: sup.business_name || '',
            supplierType: sup.supplier_type || 'business',
            contactPerson: sup.contact_person || '',
            mobile: sup.mobile_number || '',
            email: sup.email || '',
            address: `${sup.address_line_1 || ''}, ${sup.address_line_2 ? sup.address_line_2 + ', ' : ''}${sup.address_line_3 ? sup.address_line_3 + ', ' : ''}${sup.city || ''}, ${sup.pincode || ''}, ${sup.state || ''}`,
            gstin: sup.gstin_pan || '',
            status: sup.status || 'active',
          };
        });
        setSuppliersCache(cache);
      }
    });
    const stockPromise = finalProductId
      ? getProductLocationStock(finalProductId).then(result => {
          if (result.success && result.locationStock) setLocationStock(result.locationStock);
        })
      : Promise.resolve();
    const logsPromise = finalProductId
      ? (selectedLocationId
          ? getProductInventoryLogsByLocation(finalProductId, selectedLocationId)
          : getProductInventoryLogs(finalProductId)
        ).then(result => {
          if (result.success && result.logs) {
            setInventoryLogs(result.logs.map((log: any) => ({
              id: log.id, type: log.transaction_type || log.type, invoiceNumber: log.reference_number || log.invoiceNumber,
              quantity: log.quantity_change ?? log.quantity ?? 0, date: log.transaction_date || log.date || log.created_at,
              staffName: log.staff_name || log.staffName || 'Staff',
              customerName: log.customer_name || log.customerName, supplierName: log.supplier_name || log.supplierName,
              reason: log.reason || log.notes, balanceAfter: log.balance_after ?? log.balanceAfter ?? 0,
              locationName: log.location_name || log.locationName, locationId: log.location_id || log.locationId,
              referenceType: log.reference_type || log.referenceType, referenceId: log.reference_id || log.referenceId,
              unitPrice: log.unit_price ?? log.unitPrice, totalValue: log.total_value ?? log.totalValue,
            })));
          }
        })
      : Promise.resolve();
    Promise.all([suppliersPromise, stockPromise, logsPromise]).catch(e => console.error('Refresh failed:', e));
    setTimeout(() => setRefreshing(false), 600);
  }, [finalProductId, selectedLocationId]);

  const formatPrice = (price: number) => formatCurrencyINR(price, 3, 0);

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric'
    });
  };

  const getLogTypeColor = (type: string) => {
    switch (type) {
      case 'opening_stock': return Colors.primary;
      case 'sale': return Colors.error;
      case 'purchase': return Colors.success;
      case 'return': return Colors.warning;
      case 'write_off': return '#dc2626';
      case 'adjustment': return Colors.primary;
      case 'transfer': return '#8b5cf6';
      default: return Colors.textLight;
    }
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'opening_stock': return Package;
      case 'sale': return ShoppingCart;
      case 'purchase': return Plus;
      case 'return': return TrendingUp;
      case 'write_off': return Trash2;
      case 'adjustment': return Package;
      case 'transfer': return TrendingDown;
      default: return Package;
    }
  };

  const getLogTypeText = (type: string) => {
    switch (type) {
      case 'opening_stock': return 'Opening Stock';
      case 'sale': return 'Sale';
      case 'purchase': return 'Purchase';
      case 'return': return 'Return';
      case 'write_off': return 'Write Off';
      case 'adjustment': return 'Adjustment';
      case 'transfer': return 'Transfer';
      default: return type;
    }
  };

  // Convert quantity from primary UoM to the selected UoM
  // conversionRatio = how many secondary units in 1 primary (e.g. 1 Box = 10 Pieces → ratio=10)
  const convertQuantity = (quantity: number): number => {
    const q = quantity ?? 0;
    if (!product.useCompoundUnit || selectedUoM === 'primary') {
      return q;
    }

    const conversionRatio = parseFloat(product.conversionRatio || '1');
    const tertiaryRatio = parseFloat(product.tertiaryConversionRatio || '1');

    if (selectedUoM === 'secondary' && product.secondaryUnit && product.secondaryUnit !== 'None') {
      return quantity * conversionRatio;
    }

    if (selectedUoM === 'tertiary' && product.tertiaryUnit && product.tertiaryUnit !== 'None') {
      return quantity * conversionRatio * tertiaryRatio;
    }

    return quantity;
  };

  const getPrimaryStock = (): number => {
    if (selectedLocationId) {
      const location = locationStock.find(loc => loc.locationId === selectedLocationId);
      return location ? location.quantity : 0;
    }
    return product.currentStock;
  };

  const getCurrentStock = (): number => {
    return convertQuantity(getPrimaryStock());
  };

  // Get UoM label
  const getUoMLabel = (): string => {
    if (!product.useCompoundUnit || selectedUoM === 'primary') {
      return product.primaryUnit || 'Piece';
    }
    
    if (selectedUoM === 'secondary' && product.secondaryUnit && product.secondaryUnit !== 'None') {
      return product.secondaryUnit;
    }
    
    if (selectedUoM === 'tertiary' && product.tertiaryUnit && product.tertiaryUnit !== 'None') {
      return product.tertiaryUnit;
    }
    
    return product.primaryUnit || 'Piece';
  };

  const handleLogPress = (log: InventoryLog) => {
    if (log.type === 'purchase' || log.referenceType === 'purchase_invoice') {
      if (!log.referenceId) return;
      safeRouter.push({
        pathname: '/purchasing/invoice-details',
        params: { invoiceId: log.referenceId || '' }
      });
    } else if (log.type === 'return') {
      if (!log.referenceId) return;
      safeRouter.push({
        pathname: '/return-details',
        params: {
          returnId: log.referenceId || log.invoiceNumber || '',
          returnData: JSON.stringify({
            id: log.referenceId || log.invoiceNumber,
            returnNumber: log.invoiceNumber,
            customerName: log.customerName || 'N/A',
            customerType: 'individual',
            refundStatus: 'refunded',
            amount: log.totalValue || Math.abs(log.quantity) * (product.salesPrice || 0),
            itemCount: Math.abs(log.quantity),
            date: log.date,
            reason: log.reason || 'Customer return',
            customerDetails: { name: log.customerName || 'N/A', mobile: '', address: '' }
          })
        }
      });
    } else if (log.type === 'sale' || log.referenceType === 'invoice') {
      if (!log.referenceId) return;
      safeRouter.push({
        pathname: '/invoice-details',
        params: { invoiceId: log.referenceId || '' }
      });
    }
  };

  const getUrgencyColor = (urgency: string) => {
    switch (urgency) {
      case 'critical': return Colors.error;
      case 'low': return Colors.warning;
      case 'moderate': return '#f59e0b';
      default: return Colors.textLight;
    }
  };

  const resolveSupplierName = (nameOrId: string | undefined): string | undefined => {
    if (!nameOrId) return undefined;
    const cached = suppliersCache[nameOrId];
    if (cached) return cached.businessName || cached.name || nameOrId;
    if (/^[0-9a-f]{8}-[0-9a-f]{4}-/.test(nameOrId)) return undefined;
    return nameOrId;
  };

  const renderInventoryLog = (log: InventoryLog) => {
    const LogIcon = getLogTypeIcon(log.type);
    const logColor = getLogTypeColor(log.type);
    const convertedQuantity = convertQuantity(log.quantity);
    const convertedBalance = convertQuantity(log.balanceAfter);
    const isPositive = log.quantity > 0;
    const displaySupplier = resolveSupplierName(log.supplierName);

    return (
      <TouchableOpacity
        key={log.id}
        style={[styles.logCard, { borderLeftColor: logColor }]}
        onPress={() => handleLogPress(log)}
        activeOpacity={0.7}
      >
        <View style={styles.logHeader}>
          <View style={styles.logLeft}>
            <View style={[styles.logIcon, { backgroundColor: `${logColor}15` }]}>
              <LogIcon size={18} color={logColor} />
            </View>
            <View style={styles.logInfo}>
              <Text style={styles.logType}>{getLogTypeText(log.type)}</Text>
              <Text style={styles.logDate}>{formatDate(log.date)}</Text>
            </View>
          </View>
          
          <View style={styles.logRight}>
            <View style={[styles.logQuantityBadge, { backgroundColor: isPositive ? `${Colors.success}12` : `${Colors.error}12` }]}>
              <Text style={[styles.logQuantity, { color: isPositive ? Colors.success : Colors.error }]}>
                {isPositive ? '+' : ''}{formatQty(convertedQuantity ?? 0)}
              </Text>
            </View>
            <Text style={styles.logBalance}>
              Bal: {formatQty(convertedBalance ?? 0)}
            </Text>
          </View>
        </View>

        {(log.invoiceNumber || log.locationName || log.customerName || displaySupplier) && (
          <View style={styles.logMetaRow}>
            {log.invoiceNumber && (
              <View style={styles.logMetaChip}>
                <FileText size={11} color={Colors.primary} />
                <Text style={styles.logMetaChipText}>{log.invoiceNumber}</Text>
              </View>
            )}
            {log.locationName && (
              <View style={styles.logMetaChip}>
                <MapPin size={11} color={Colors.textLight} />
                <Text style={styles.logMetaChipText}>{log.locationName}</Text>
              </View>
            )}
            {log.customerName && (
              <View style={styles.logMetaChip}>
                <Text style={styles.logMetaChipText}>{log.customerName}</Text>
              </View>
            )}
            {displaySupplier && (
              <View style={styles.logMetaChip}>
                <Building2 size={11} color={Colors.textLight} />
                <Text style={styles.logMetaChipText}>{displaySupplier}</Text>
              </View>
            )}
          </View>
        )}

        <View style={styles.logFooter}>
          <Text style={styles.logStaffText}>{log.staffName}</Text>
          {log.unitPrice !== undefined && (
            <Text style={styles.logPriceText}>@ {formatPrice(log.unitPrice)}/{getUoMLabel()}</Text>
          )}
        </View>
      </TouchableOpacity>
    );
  };

  const handleEditProduct = () => {
    safeRouter.push({
      pathname: '/inventory/manual-product',
      params: {
        editMode: 'true',
        productId: product.id,
      }
    });
  };

  const handleDeleteProduct = () => {
    const recordsMessage = `This will permanently delete:

• Product: ${product.name}

All related transaction history will be updated accordingly.

This action cannot be undone.`;

    Alert.alert(
      'Delete Product',
      recordsMessage,
      [
        {
          text: 'Cancel',
          style: 'cancel',
          onPress: () => setShowDeleteModal(false)
        },
        {
          text: 'Permanently Delete',
          style: 'destructive',
          onPress: confirmDeleteProduct
        }
      ]
    );
  };

  const confirmDeleteProduct = async () => {
    try {
      const { deleteProduct } = await import('@/services/backendApi');
      const result = await deleteProduct(product.id);
      
      if (result.success) {
        productStore.deleteProduct(product.id);
        Alert.alert(
          'Product Deleted Successfully',
          'Product has been permanently deleted.',
          [
            {
              text: 'OK',
              onPress: () => {
                setShowDeleteModal(false);
                router.back();
              }
            }
          ]
        );
      } else {
        Alert.alert(
          'Error',
          result.error || 'Failed to delete product. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      console.error('Error deleting product:', error);
      Alert.alert(
        'Error',
        'An error occurred while deleting the product. Please try again.',
        [{ text: 'OK' }]
      );
    }
  };

  const cancelDeleteProduct = () => {
    setShowDeleteModal(false);
  };

  const handleSupplierPress = (supplierId: string | undefined) => {
    if (supplierId && supplierId !== 'Not specified') {
      const supplier = suppliersCache[supplierId];
      
      if (supplier) {
        setNavData('supplierData', supplier);
        safeRouter.push({
          pathname: '/purchasing/supplier-details',
          params: { supplierId: supplierId }
        });
      } else {
        Alert.alert(
          'Supplier Not Found', 
          'This supplier is not in your supplier database. Would you like to add them?',
          [
            { text: 'Cancel', style: 'cancel' },
            {
              text: 'Add Supplier',
              onPress: () => {
                safeRouter.push('/purchasing/add-supplier');
              }
            }
          ]
        );
      }
    }
  };

  const getSupplierName = (supplierId: string | undefined) => {
    if (!supplierId) return 'Not specified';
    const supplier = suppliersCache[supplierId];
    if (supplier) {
      return supplier.businessName || supplier.name;
    }
    return supplierId;
  };

  const handleCallSupplier = (supplierId: string | undefined) => {
    if (supplierId && supplierId !== 'Not specified') {
      const supplier = suppliersCache[supplierId];
      if (supplier && supplier.mobile) {
        // In a real app, this would open the phone dialer
        // For now, we'll show an alert with the phone number
        Alert.alert(
          'Call Supplier',
          `Call ${getSupplierName(supplierId)} at ${supplier.mobile}?`,
          [
            { text: 'Cancel', style: 'cancel' },
            { 
              text: 'Call', 
              onPress: () => {
                // In a real app, you would use Linking.openURL(`tel:${supplier.mobile}`)
                console.log(`Calling ${supplier.mobile}`);
              }
            }
          ]
        );
      } else {
        Alert.alert('No Phone Number', 'Phone number not available for this supplier');
      }
    }
  };

  const formatSupplierNameForDisplay = (supplierName: string) => {
    if (!supplierName || supplierName === 'Not specified') {
      return supplierName;
    }

    // Split the name into words
    const words = supplierName.split(' ');
    
    if (words.length <= 2) {
      // For short names, return as is
      return supplierName;
    }
    
    if (words.length === 3) {
      // For 3-word names: "Word1 Word2\nWord3"
      return `${words[0]} ${words[1]}\n${words[2]}`;
    }
    
    if (words.length === 4) {
      // For 4-word names: "Word1 Word2\nWord3 Word4"
      return `${words[0]} ${words[1]}\n${words[2]} ${words[3]}`;
    }
    
    // For longer names: "Word1 Word2\nWord3 Word4..."
    const firstLine = words.slice(0, 2).join(' ');
    const secondLine = words.slice(2, 4).join(' ') + '...';
    return `${firstLine}\n${secondLine}`;
  };



  return (
    <SafeAreaView style={styles.container} edges={['top', 'left', 'right', 'bottom']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity
          style={styles.backButton}
          onPress={() => router.back()}
          activeOpacity={0.7}
        >
          <ArrowLeft size={24} color={Colors.text} />
        </TouchableOpacity>
        
        <Text style={styles.headerTitle}>Product Details</Text>
        
        <View style={styles.headerRight}>
          <TouchableOpacity
            style={styles.printButton}
            onPress={() => {
              if (product.barcode && product.barcode.trim().length > 0) {
                setShowPrintModal(true);
              } else {
                Alert.alert(
                  'No Barcode',
                  'This product does not have a barcode assigned. Please edit the product and generate a barcode first.',
                  [{ text: 'OK' }]
                );
              }
            }}
            activeOpacity={0.7}
          >
            <Printer size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.editButton}
            onPress={handleEditProduct}
            activeOpacity={0.7}
          >
            <Edit3 size={20} color={Colors.primary} />
          </TouchableOpacity>
          <TouchableOpacity
            style={styles.deleteButton}
            onPress={handleDeleteProduct}
            activeOpacity={0.7}
          >
            <Trash2 size={20} color={Colors.error} />
          </TouchableOpacity>
        </View>
      </View>

      {/* Content Area below header */}
      <View style={styles.contentArea}>
        {/* Background: Image Gallery + Product Info */}
        <View style={styles.backgroundContent} onLayout={onBackgroundLayout}>
          <View style={styles.productImageSection}>
            {product.productImages && product.productImages.length > 0 ? (
              <ScrollView 
                horizontal 
                showsHorizontalScrollIndicator={false}
                style={styles.productImagesScroll}
                contentContainerStyle={styles.productImagesContainer}
                pagingEnabled={false}
              >
                {product.productImages.map((imageUri: string, index: number) => {
                  const isBarcodeImage = product.barcode && 
                                        product.barcode.trim().length > 0 && 
                                        index === (product.productImages?.length ?? 0) - 1 &&
                                        (imageUri.startsWith('data:image') || imageUri.includes('barcode_'));
                  return (
                    <TouchableOpacity
                      key={index}
                      onPress={() => {
                        setSelectedImageIndex(index);
                        setShowImageModal(true);
                        setTimeout(() => {
                          const screenWidth = Dimensions.get('window').width;
                          imageScrollViewRef.current?.scrollTo({ x: index * screenWidth, animated: false });
                        }, 100);
                      }}
                      activeOpacity={0.8}
                    >
                      <Image 
                        source={{ uri: imageUri }}
                        style={isBarcodeImage ? styles.barcodeThumbFullSize : styles.productHeaderImage}
                        resizeMode={isBarcodeImage ? 'contain' : 'cover'}
                      />
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            ) : product.image ? (
              <TouchableOpacity
                onPress={() => {
                  setSelectedImageIndex(0);
                  setShowImageModal(true);
                }}
                activeOpacity={0.8}
                style={styles.singleImageContainer}
              >
                <Image 
                  source={{ uri: product.image }}
                  style={styles.productHeaderImageSingle}
                  resizeMode="cover"
                />
              </TouchableOpacity>
            ) : (
              <View style={styles.productImagePlaceholder}>
                <Package size={48} color={Colors.textLight} />
                <Text style={styles.placeholderText}>No Image</Text>
              </View>
            )}
            {product.productImages && product.productImages.length > 1 && (
              <View style={styles.imageCountBadge}>
                <Text style={styles.imageCountText}>{product.productImages.length} photos</Text>
              </View>
            )}
          </View>

          <View style={styles.productHeaderInfo}>
            <View style={styles.titleRow}>
              <Text style={styles.productHeaderName} numberOfLines={1}>{product.name}</Text>
              <Text style={styles.productHeaderCategory}>{product.category}</Text>
            </View>

            <Text style={styles.productHeaderPrice}>{formatPrice(product.salesPrice || 0)}</Text>

            <View style={[styles.stockSummaryCard, { borderLeftColor: getUrgencyColor(product.urgencyLevel) }]}>
              <View style={styles.stockSummaryLeft}>
                <View style={styles.stockSummaryRow}>
                  <Text style={styles.stockSummaryLabel}>Available Stock</Text>
                  <TouchableOpacity
                    style={styles.stockInfoIcon}
                    onPress={() => {
                      const stockInfo = product.secondaryUnit && product.secondaryUnit !== 'None' 
                        ? `Stock Calculation:\n\n1 ${product.primaryUnit} = ${product.conversionRatio} ${product.secondaryUnit}s${product.tertiaryUnit && product.tertiaryUnit !== 'None' ? `\n1 ${product.secondaryUnit} = ${product.tertiaryConversionRatio} ${product.tertiaryUnit}s` : ''}\n\nCurrent stock: ${product.currentStock} ${product.primaryUnit}s`
                        : `Stock Calculation:\n\nCurrent stock: ${product.currentStock} ${product.primaryUnit}s\n\nThis product uses a single unit of measurement.`;
                      Alert.alert('Stock Information', stockInfo, [{ text: 'OK' }]);
                    }}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.stockInfoIconText}>ⓘ</Text>
                  </TouchableOpacity>
                </View>
                <Text style={[styles.stockSummaryValue, { color: getUrgencyColor(product.urgencyLevel) }]}>
                  {product.currentStock} {product.primaryUnit}s
                </Text>
                {product.secondaryUnit && product.secondaryUnit !== 'None' && (
                  <Text style={styles.stockSummarySecondary}>
                    {(() => {
                      const conversionRatio = parseFloat(product.conversionRatio || '1');
                      const tertiaryConversionRatio = parseFloat(product.tertiaryConversionRatio || '1');
                      if (product.tertiaryUnit && product.tertiaryUnit !== 'None') {
                        return `${product.currentStock * conversionRatio * tertiaryConversionRatio} ${product.tertiaryUnit}s`;
                      }
                      return `${product.currentStock * conversionRatio} ${product.secondaryUnit}s`;
                    })()}
                  </Text>
                )}
              </View>
              <View style={[
                styles.urgencyBadge,
                { backgroundColor: `${getUrgencyColor(product.urgencyLevel)}15` }
              ]}>
                <Text style={[styles.urgencyText, { color: getUrgencyColor(product.urgencyLevel) }]}>
                  {product.urgencyLevel === 'critical' ? 'CRITICAL' : product.urgencyLevel === 'low' ? 'LOW' : 'NORMAL'}
                </Text>
              </View>
            </View>
          </View>
        </View>

        {/* Bottom Sheet Card */}
        <Animated.View style={[styles.bottomSheet, { transform: [{ translateY: sheetTranslateY }] }]}>
        {/* Drag Handle */}
        <View {...sheetPanResponder.panHandlers} style={styles.dragHandleArea}>
          <View style={styles.dragHandlePill} />
        </View>

        {/* Tab Navigation */}
        <View style={styles.tabContainer}>
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'details' && styles.activeTab]}
            onPress={() => setSelectedTab('details')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, selectedTab === 'details' && styles.activeTabText]}>
              Product Details
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[styles.tab, selectedTab === 'inventory' && styles.activeTab]}
            onPress={() => setSelectedTab('inventory')}
            activeOpacity={0.7}
          >
            <Text style={[styles.tabText, selectedTab === 'inventory' && styles.activeTabText]}>
              Inventory Logs
            </Text>
          </TouchableOpacity>
        </View>

        {/* Tab Content */}
        <ScrollView 
          style={styles.sheetScrollView}
          contentContainerStyle={[styles.sheetScrollContent, { paddingBottom: isSheetExpanded ? (insets.bottom + 40) : (bgHeight + insets.bottom + 20) }]}
          showsVerticalScrollIndicator={false}
          nestedScrollEnabled={true}
          refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        >
        {selectedTab === 'details' ? (
          <View style={styles.detailsContainer}>
            {/* Product Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Product Information</Text>
              <View style={styles.detailsGrid}>
                <View style={styles.detailRow}>
                  <Hash size={16} color={Colors.textLight} />
                  <Text style={styles.detailLabel}>HSN Code:</Text>
                  <Text style={styles.detailValue}>{product.hsnCode}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Scan size={16} color={Colors.textLight} />
                  <Text style={styles.detailLabel}>Barcode:</Text>
                  <Text style={[styles.detailValue, styles.barcodeText]}>
                    {product.barcode}
                  </Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Package size={16} color={Colors.textLight} />
                  <Text style={styles.detailLabel}>Tax Rate:</Text>
                  <Text style={styles.detailValue}>{product.taxRate || 0}% GST</Text>
                </View>
                
                {product.cessType && product.cessType !== 'none' && product.cessRate && product.cessRate > 0 && (
                  <View style={styles.detailRow}>
                    <BarChart3 size={16} color={Colors.textLight} />
                    <Text style={styles.detailLabel}>CESS:</Text>
                    <Text style={styles.detailValue}>
                      {product.cessType === 'value' ? `${product.cessRate}%` :
                       product.cessType === 'quantity' ? `${product.cessRate}%` :
                       product.cessType === 'value_and_quantity' ? `${product.cessRate}%+${formatCurrencyINR(product.cessAmount || 0)}/${product.cessUnit || product.primaryUnit}` :
                       product.cessType === 'mrp' ? `${product.cessRate}%` : `${product.cessRate}%`}
                    </Text>
                  </View>
                )}
                
                {product.cessType && product.cessType !== 'none' && (
                  <View style={styles.detailRow}>
                    <Percent size={16} color={Colors.textLight} />
                    <Text style={styles.detailLabel}>CESS Type:</Text>
                    <Text style={styles.detailValue}>
                      {product.cessType === 'value' ? 'Based on Value' :
                       product.cessType === 'quantity' ? 'Based on Quantity' :
                       product.cessType === 'value_and_quantity' ? 'Based on Value & Quantity' :
                       product.cessType === 'mrp' ? 'Based on MRP' : 'Not specified'}
                    </Text>
                  </View>
                )}
                
                <View style={styles.detailRow}>
                  <Building2 size={16} color={Colors.textLight} />
                  <Text style={styles.detailLabel}>Supplier:</Text>
                  <View style={styles.supplierInfoContainer}>
                    <TouchableOpacity
                      style={styles.clickableValue}
                      onPress={() => handleSupplierPress(product.supplier)}
                      activeOpacity={0.7}
                    >
                      <Text 
                        style={[styles.detailValue, styles.clickableText, styles.truncatedText]}
                        numberOfLines={2}
                        ellipsizeMode="tail"
                      >
                        {formatSupplierNameForDisplay(getSupplierName(product.supplier))}
                      </Text>
                    </TouchableOpacity>
                    {product.supplier && (
                      <TouchableOpacity
                        style={styles.callButton}
                        onPress={() => handleCallSupplier(product.supplier)}
                        activeOpacity={0.7}
                      >
                        <Phone size={16} color={Colors.primary} />
                      </TouchableOpacity>
                    )}
                  </View>
                </View>
                
                <View style={styles.detailRow}>
                  <MapPin size={16} color={Colors.textLight} />
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>{product.location || 'Not specified'}</Text>
                </View>
                
                {product.brand && (
                  <View style={styles.detailRow}>
                    <Package size={16} color={Colors.textLight} />
                    <Text style={styles.detailLabel}>Brand:</Text>
                    <Text style={styles.detailValue}>{product.brand}</Text>
                  </View>
                )}
                
                {product.mrp && (
                  <View style={styles.detailRow}>
                    <IndianRupee size={16} color={Colors.textLight} />
                    <Text style={styles.detailLabel}>MRP:</Text>
                    <Text style={styles.detailValue}>{formatPrice(parseFloat(product.mrp) || 0)}</Text>
                  </View>
                )}
              </View>
            </View>

            {/* Stock Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stock Management</Text>
              <View style={styles.stockGrid}>
                <View style={styles.stockCard}>
                  <Text style={styles.stockCardLabel}>Min Level</Text>
                  <Text style={styles.stockCardValue}>
                    {product.minStockLevel}
                  </Text>
                  <Text style={styles.stockCardUnit}>{product.primaryUnit || 'units'}</Text>
                </View>
                
                <View style={styles.stockCard}>
                  <Text style={styles.stockCardLabel}>Max Level</Text>
                  <Text style={styles.stockCardValue}>
                    {product.maxStockLevel}
                  </Text>
                  <Text style={styles.stockCardUnit}>{product.primaryUnit || 'units'}</Text>
                </View>
                
                <View style={styles.stockCard}>
                  <Text style={styles.stockCardLabel}>Stock Value</Text>
                  <Text style={[styles.stockCardValue, { color: Colors.success }]}>
                    {formatPrice((product.unitPrice || 0) * product.currentStock)}
                  </Text>
                  <Text style={styles.stockCardUnit}>total</Text>
                </View>
              </View>


            </View>

            {/* Pricing Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Pricing Information</Text>
              <View style={styles.pricingGrid}>
                <View style={styles.pricingCard}>
                  <Text style={styles.pricingCardLabel}>Purchase Price</Text>
                  <Text style={[styles.pricingCardValue, { color: Colors.text }]}>
                    {formatPrice(product.unitPrice || 0)}
                  </Text>
                  <Text style={styles.pricingCardUnit}>/{product.primaryUnit || 'unit'}</Text>
                </View>
                
                <View style={styles.pricingCard}>
                  <Text style={styles.pricingCardLabel}>Sale Price</Text>
                  <Text style={[styles.pricingCardValue, { color: Colors.success }]}>
                    {formatPrice(product.salesPrice || 0)}
                  </Text>
                  <Text style={styles.pricingCardUnit}>/{product.primaryUnit || 'unit'}</Text>
                </View>
                
                <View style={styles.pricingCard}>
                  <Text style={styles.pricingCardLabel}>Profit Margin</Text>
                  <Text style={[
                    styles.pricingCardValue,
                    { color: product.salesPrice > (product.unitPrice || 0) ? Colors.success : Colors.error }
                  ]}>
                    {product.unitPrice && product.salesPrice > product.unitPrice 
                      ? `${(((product.salesPrice - product.unitPrice) / product.unitPrice) * 100).toFixed(4).replace(/\.?0+$/, '')}%`
                      : 'N/A'
                    }
                  </Text>
                  <Text style={styles.pricingCardUnit}>margin</Text>
                </View>
                
                <View style={styles.pricingCard}>
                  <Text style={styles.pricingCardLabel}>GST ({product.taxRate || 0}%)</Text>
                  <Text style={[styles.pricingCardValue, { color: Colors.warning }]}>
                    {formatPrice((product.salesPrice * (product.taxRate || 0)) / 100)}
                  </Text>
                  <Text style={styles.pricingCardUnit}>/{product.primaryUnit || 'unit'}</Text>
                </View>
                
                {product.cessType && product.cessType !== 'none' && ((product.cessRate ?? 0) > 0 || (product.cessAmount && parseFloat(String(product.cessAmount)) > 0)) && (
                  <View style={styles.pricingCard}>
                    <Text style={styles.pricingCardLabel}>
                      CESS ({product.cessType === 'value' ? `${product.cessRate}%` :
                             product.cessType === 'quantity' ? `${formatCurrencyINR(product.cessAmount)}/${product.cessUnit || product.primaryUnit}` :
                             product.cessType === 'value_and_quantity' ? `${product.cessRate}%+${formatCurrencyINR(product.cessAmount)}/${product.cessUnit || product.primaryUnit}` :
                             product.cessType === 'mrp' ? `${product.cessRate}%` : 'Applied'})
                    </Text>
                    <Text style={[styles.pricingCardValue, { color: Colors.error }]}>
                      {formatPrice((() => {
                        const basePrice = product.salesPrice || 0;
                        switch (product.cessType) {
                          case 'value':
                            return (basePrice * (product.cessRate || 0)) / 100;
                          case 'quantity':
                            return parseFloat(String(product.cessAmount || '0'));
                          case 'value_and_quantity':
                            const valueCess = (basePrice * (product.cessRate || 0)) / 100;
                            const quantityCess = parseFloat(String(product.cessAmount || '0'));
                            return valueCess + quantityCess;
                          case 'mrp':
                            const mrpPrice = parseFloat(product.mrp || '0');
                            return (mrpPrice * (product.cessRate || 0)) / 100;
                          default:
                            return 0;
                        }
                      })())}
                    </Text>
                    <Text style={styles.pricingCardUnit}>/{product.primaryUnit || 'unit'}</Text>
                  </View>
                )}
              </View>
              
              {/* UoM Price Breakdown */}
              {product.secondaryUnit && product.secondaryUnit !== 'None' && (
                <View style={styles.uomPricingSection}>
                  <Text style={styles.uomPricingTitle}>Unit of Measurement Pricing</Text>
                  <View style={styles.uomPricingGrid}>
                    <View style={styles.uomPricingItem}>
                      <Text style={styles.uomPricingLabel}>Primary ({product.primaryUnit})</Text>
                      <Text style={styles.uomPricingValue}>
                        {formatPrice(product.salesPrice || 0)}/{product.primaryUnit}
                      </Text>
                    </View>
                    {product.secondaryUnit && product.secondaryUnit !== 'None' && (
                      <View style={styles.uomPricingItem}>
                        <Text style={styles.uomPricingLabel}>Secondary ({product.secondaryUnit})</Text>
                        <Text style={styles.uomPricingValue}>
                          {formatPrice((product.salesPrice || 0) / parseFloat(product.conversionRatio || '1'))}/{product.secondaryUnit}
                        </Text>
                      </View>
                    )}
                    {product.tertiaryUnit && product.tertiaryUnit !== 'None' && (
                      <View style={styles.uomPricingItem}>
                        <Text style={styles.uomPricingLabel}>Tertiary ({product.tertiaryUnit})</Text>
                        <Text style={styles.uomPricingValue}>
                          {formatPrice((product.salesPrice || 0) / (parseFloat(product.conversionRatio || '1') * parseFloat(product.tertiaryConversionRatio || '1')))}/{product.tertiaryUnit}
                        </Text>
                      </View>
                    )}
                  </View>
                </View>
              )}
            </View>

            {/* Restock Recommendation */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Restock Recommendation</Text>
              <View style={[
                styles.restockCard,
                { backgroundColor: `${getUrgencyColor(product.urgencyLevel)}10` }
              ]}>
                <View style={styles.restockHeader}>
                  <Package size={24} color={getUrgencyColor(product.urgencyLevel)} />
                  <View style={styles.restockInfo}>
                    <Text style={[
                      styles.restockTitle,
                      { color: getUrgencyColor(product.urgencyLevel) }
                    ]}>
                      {product.urgencyLevel === 'critical' ? 'Urgent Restock Required' :
                       product.urgencyLevel === 'low' ? 'Restock Soon' : 'Consider Restocking'}
                    </Text>
                    <Text style={styles.restockSubtitle}>
                      Recommended order: {product.maxStockLevel - product.currentStock} units
                    </Text>
                  </View>
                </View>
                
                <View style={styles.restockDetails}>
                  <Text style={styles.restockDetailText}>
                    Last restocked: {product.lastRestocked ? formatDate(product.lastRestocked) : 'Never'}
                  </Text>
                  <Text style={styles.restockDetailText}>
                    Estimated cost: {formatPrice((product.maxStockLevel - product.currentStock) * (product.unitPrice || 0) * 0.8)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.inventoryContainer}>
            {/* Current Stock Display - on top */}
            <View style={styles.currentStockContainer}>
              <View style={styles.currentStockHeader}>
                <View style={styles.currentStockHeaderLeft}>
                  <Package size={20} color={Colors.primary} />
                  <Text style={styles.currentStockLabel}>Current Stock</Text>
                </View>
                {product.useCompoundUnit && product.secondaryUnit && product.secondaryUnit !== 'None' && (
                  <TouchableOpacity
                    style={styles.currentStockUoMButton}
                    onPress={() => setShowUoMModal(true)}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.currentStockUoMText}>
                      {getUoMLabel()}
                    </Text>
                    <ChevronDown size={16} color={Colors.primary} />
                  </TouchableOpacity>
                )}
              </View>
              <View style={styles.currentStockRow}>
                <Text style={styles.currentStockBigValue}>
                  {formatQty(getCurrentStock())}
                </Text>
                <Text style={styles.currentStockBigUnit}>{getUoMLabel()}</Text>
              </View>
              {selectedLocationId && (
                <Text style={styles.currentStockLocation}>
                  at {locationStock.find(loc => loc.locationId === selectedLocationId)?.locationName || 'Selected Location'}
                </Text>
              )}
              {!selectedLocationId && locationStock.length > 1 && (
                <Text style={styles.currentStockLocation}>
                  across {locationStock.length} locations
                </Text>
              )}
            </View>

            {/* Location Filter */}
            {locationStock.length > 1 && (
              <View style={styles.inventoryControls}>
                <TouchableOpacity
                  style={[styles.controlButton, selectedLocationId && styles.controlButtonActive]}
                  onPress={() => setShowLocationFilterModal(true)}
                  activeOpacity={0.7}
                >
                  <Filter size={18} color={selectedLocationId ? Colors.primary : Colors.textLight} />
                  <Text style={[styles.controlButtonText, selectedLocationId && styles.controlButtonTextActive]}>
                    {selectedLocationId 
                      ? locationStock.find(loc => loc.locationId === selectedLocationId)?.locationName || 'All Locations'
                      : 'All Locations'}
                  </Text>
                  <ChevronDown size={18} color={selectedLocationId ? Colors.primary : Colors.textLight} />
                </TouchableOpacity>
              </View>
            )}

            {/* Movement Logs Header */}
            <View style={styles.inventoryHeader}>
              <Text style={styles.sectionTitle}>Movement History</Text>
            </View>

            {/* Logs */}
            <View style={styles.inventoryLogs}>
              {loadingLogs ? (
                <View style={styles.loadingContainer}>
                  <Text style={styles.loadingText}>Loading inventory logs...</Text>
                </View>
              ) : inventoryLogs.length > 0 ? (
                inventoryLogs.map(renderInventoryLog)
              ) : (
                <View style={styles.emptyLogsContainer}>
                  <Package size={48} color={Colors.textLight} />
                  <Text style={styles.emptyLogsText}>No inventory movements found</Text>
                  <Text style={styles.emptyLogsSubtext}>
                    Stock movements will appear here when products are sold, purchased, or adjusted
                  </Text>
                </View>
              )}
            </View>
          </View>
        )}
        </ScrollView>
        </Animated.View>
      </View>

      {/* UoM Selection Modal */}
      <Modal
        visible={showUoMModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowUoMModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Select Unit of Measure</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowUoMModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={[styles.modalOption, selectedUoM === 'primary' && styles.selectedOption]}
                onPress={() => {
                  setSelectedUoM('primary');
                  setShowUoMModal(false);
                }}
                activeOpacity={0.7}
              >
                <View style={styles.modalOptionContent}>
                  <View style={{ flex: 1 }}>
                    <Text style={[styles.modalOptionText, selectedUoM === 'primary' && styles.selectedOptionText]}>
                      {product.primaryUnit || 'Piece'} (Primary)
                    </Text>
                    <Text style={styles.modalOptionSubtext}>
                      Current Stock: {formatQty(getPrimaryStock())} {product.primaryUnit || 'Piece'}
                    </Text>
                  </View>
                </View>
              </TouchableOpacity>
              
              {product.useCompoundUnit && product.secondaryUnit && product.secondaryUnit !== 'None' && (
                <TouchableOpacity
                  style={[styles.modalOption, selectedUoM === 'secondary' && styles.selectedOption]}
                  onPress={() => {
                    setSelectedUoM('secondary');
                    setShowUoMModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionText, selectedUoM === 'secondary' && styles.selectedOptionText]}>
                        {product.secondaryUnit} (Secondary)
                      </Text>
                      <Text style={styles.modalOptionSubtext}>
                        Current Stock: {formatQty(getPrimaryStock() * parseFloat(product.conversionRatio || '1'))} {product.secondaryUnit}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
              
              {product.useCompoundUnit && product.tertiaryUnit && product.tertiaryUnit !== 'None' && (
                <TouchableOpacity
                  style={[styles.modalOption, selectedUoM === 'tertiary' && styles.selectedOption]}
                  onPress={() => {
                    setSelectedUoM('tertiary');
                    setShowUoMModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionText, selectedUoM === 'tertiary' && styles.selectedOptionText]}>
                        {product.tertiaryUnit} (Tertiary)
                      </Text>
                      <Text style={styles.modalOptionSubtext}>
                        Current Stock: {formatQty(getPrimaryStock() * parseFloat(product.conversionRatio || '1') * parseFloat(product.tertiaryConversionRatio || '1'))} {product.tertiaryUnit}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              )}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Location Filter Modal */}
      <Modal
        visible={showLocationFilterModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowLocationFilterModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Filter by Location</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLocationFilterModal(false)}
                activeOpacity={0.7}
              >
                <Text style={styles.modalCloseText}>✕</Text>
              </TouchableOpacity>
            </View>
            <ScrollView style={styles.modalContent}>
              <TouchableOpacity
                style={[styles.modalOption, !selectedLocationId && styles.selectedOption]}
                onPress={() => {
                  setSelectedLocationId(null);
                  setShowLocationFilterModal(false);
                }}
                activeOpacity={0.7}
              >
                <Text style={[styles.modalOptionText, !selectedLocationId && styles.selectedOptionText]}>
                  All Locations
                </Text>
              </TouchableOpacity>
              
              {locationStock.map((location) => (
                <TouchableOpacity
                  key={location.locationId}
                  style={[styles.modalOption, selectedLocationId === location.locationId && styles.selectedOption]}
                  onPress={() => {
                    setSelectedLocationId(location.locationId);
                    setShowLocationFilterModal(false);
                  }}
                  activeOpacity={0.7}
                >
                  <View style={styles.modalOptionContent}>
                    <View style={{ flex: 1 }}>
                      <Text style={[styles.modalOptionText, selectedLocationId === location.locationId && styles.selectedOptionText]}>
                        {location.locationName}
                      </Text>
                      <Text style={styles.modalOptionSubtext}>
                        {formatQty(convertQuantity(location.quantity ?? 0) ?? 0)} {getUoMLabel()}
                      </Text>
                    </View>
                  </View>
                </TouchableOpacity>
              ))}
            </ScrollView>
          </View>
        </View>
      </Modal>

      {/* Product Images Modal */}
      <Modal
        visible={showImageModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowImageModal(false)}
      >
        <View style={styles.imageModalOverlay}>
          <View style={styles.imageModalContainer}>
            <View style={styles.imageModalHeader}>
              <Text style={styles.imageModalTitle}>Product Images</Text>
              <TouchableOpacity
                style={styles.imageModalCloseButton}
                onPress={() => setShowImageModal(false)}
                activeOpacity={0.7}
              >
                <X size={22} color={Colors.background} />
              </TouchableOpacity>
            </View>
            
            <View style={styles.imageModalContent}>
              <ScrollView 
                ref={imageScrollViewRef}
                horizontal 
                pagingEnabled
                showsHorizontalScrollIndicator={false}
                style={styles.imageModalScrollView}
                contentContainerStyle={styles.imageModalScrollContent}
                onMomentumScrollEnd={(event) => {
                  const index = Math.round(event.nativeEvent.contentOffset.x / event.nativeEvent.layoutMeasurement.width);
                  setSelectedImageIndex(index);
                }}
              >
                {(product.productImages && product.productImages.length > 0 ? product.productImages : (product.image ? [product.image] : [])).map((imageUri: string, index: number) => {
                  const imageArray = product.productImages && product.productImages.length > 0 ? product.productImages : (product.image ? [product.image] : []);
                  return (
                    <View key={index} style={styles.imageModalImageContainer}>
                      <Image 
                        source={{ uri: imageUri }}
                        style={styles.imageModalImage}
                        resizeMode="contain"
                      />
                    </View>
                  );
                })}
              </ScrollView>
              
              {/* Swipe to navigate between images — no arrows for unobstructed viewing */}
            </View>
            
            <View style={styles.imageModalFooter}>
              {(() => {
                const imageArray = product.productImages && product.productImages.length > 0 ? product.productImages : (product.image ? [product.image] : []);
                if (imageArray.length <= 1) return null;
                return (
                  <View style={styles.imageModalFooterInner}>
                    <View style={styles.imageModalDots}>
                      {imageArray.map((_: string, i: number) => (
                        <View
                          key={i}
                          style={[
                            styles.imageModalDot,
                            i === selectedImageIndex && styles.imageModalDotActive,
                          ]}
                        />
                      ))}
                    </View>
                    <Text style={styles.imageModalIndicatorText}>
                      {selectedImageIndex + 1} / {imageArray.length}
                    </Text>
                  </View>
                );
              })()}
            </View>
          </View>
        </View>
      </Modal>

      {/* Delete Confirmation Modal */}
      {showDeleteModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.deleteModal}>
            <View style={styles.deleteModalHeader}>
              <View style={styles.deleteIconContainer}>
                <Trash2 size={32} color={Colors.error} />
              </View>
              <Text style={styles.deleteModalTitle}>Delete Product</Text>
              <Text style={styles.deleteModalSubtitle}>
                Are you sure you want to delete "{product.name}"?
              </Text>
            </View>

            <View style={styles.deleteModalContent}>
              <Text style={styles.deleteWarningText}>
                This action cannot be undone. The following data will be permanently deleted:
              </Text>
              
              <View style={styles.deleteDataList}>
                <View style={styles.deleteDataItem}>
                  <Package size={16} color={Colors.error} />
                  <Text style={styles.deleteDataText}>Product information and specifications</Text>
                </View>
                <View style={styles.deleteDataItem}>
                  <FileText size={16} color={Colors.error} />
                  <Text style={styles.deleteDataText}>All sales invoices containing this product</Text>
                </View>
                <View style={styles.deleteDataItem}>
                  <ShoppingCart size={16} color={Colors.error} />
                  <Text style={styles.deleteDataText}>All purchase invoices containing this product</Text>
                </View>
                <View style={styles.deleteDataItem}>
                  <TrendingUp size={16} color={Colors.error} />
                  <Text style={styles.deleteDataText}>All payment records related to this product</Text>
                </View>
                <View style={styles.deleteDataItem}>
                  <BarChart3 size={16} color={Colors.error} />
                  <Text style={styles.deleteDataText}>Inventory logs and stock history</Text>
                </View>
              </View>

              <View style={styles.deleteModalActions}>
                <TouchableOpacity
                  style={styles.cancelButton}
                  onPress={cancelDeleteProduct}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelButtonText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.deleteConfirmButton}
                  onPress={confirmDeleteProduct}
                  activeOpacity={0.7}
                >
                  <Text style={styles.deleteConfirmButtonText}>Delete Permanently</Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      )}

      {/* Print Barcode Modal */}
      <Modal
        visible={showPrintModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPrintModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.printModalContainer}>
            <View style={styles.printModalHeader}>
              <Text style={styles.printModalTitle}>Print Barcode Label</Text>
              <TouchableOpacity onPress={() => setShowPrintModal(false)} activeOpacity={0.7}>
                <X size={22} color={Colors.text} />
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.printModalBody} showsVerticalScrollIndicator={false}>
              <Text style={styles.printSectionLabel}>Select Sticker Size</Text>
              
              {STICKER_SIZES.map((size) => (
                <TouchableOpacity
                  key={size.id}
                  style={[styles.stickerSizeCard, !isCustomSize && selectedStickerSize === size.id && styles.stickerSizeCardActive]}
                  onPress={() => { setSelectedStickerSize(size.id); setIsCustomSize(false); }}
                  activeOpacity={0.7}
                >
                  <View style={styles.stickerSizeRadio}>
                    {!isCustomSize && selectedStickerSize === size.id && <View style={styles.stickerSizeRadioDot} />}
                  </View>
                  <View style={{ flex: 1 }}>
                    <Text style={styles.stickerSizeName}>{size.label}</Text>
                    <Text style={styles.stickerSizeDesc}>{size.size} - {size.desc}</Text>
                  </View>
                </TouchableOpacity>
              ))}

              {/* Custom Size */}
              <TouchableOpacity
                style={[styles.stickerSizeCard, isCustomSize && styles.stickerSizeCardActive]}
                onPress={() => setIsCustomSize(true)}
                activeOpacity={0.7}
              >
                <View style={styles.stickerSizeRadio}>
                  {isCustomSize && <View style={styles.stickerSizeRadioDot} />}
                </View>
                <Text style={styles.stickerSizeName}>Custom Size</Text>
              </TouchableOpacity>

              {isCustomSize && (
                <View style={styles.customSizeRow}>
                  <View style={styles.customSizeInput}>
                    <Text style={styles.customSizeLabel}>Width</Text>
                    <TextInput
                      style={styles.customSizeField}
                      value={customWidth}
                      onChangeText={setCustomWidth}
                      keyboardType="numeric"
                      placeholder="50"
                    />
                  </View>
                  <Text style={styles.customSizeX}>x</Text>
                  <View style={styles.customSizeInput}>
                    <Text style={styles.customSizeLabel}>Height</Text>
                    <TextInput
                      style={styles.customSizeField}
                      value={customHeight}
                      onChangeText={setCustomHeight}
                      keyboardType="numeric"
                      placeholder="25"
                    />
                  </View>
                  <TouchableOpacity
                    style={styles.unitToggle}
                    onPress={() => setCustomUnit(customUnit === 'mm' ? 'inches' : 'mm')}
                    activeOpacity={0.7}
                  >
                    <Text style={styles.unitToggleText}>{customUnit}</Text>
                  </TouchableOpacity>
                </View>
              )}

              {/* Label Content Options */}
              <Text style={[styles.printSectionLabel, { marginTop: 16 }]}>Label Content</Text>
              <View style={styles.printOptionsRow}>
                <TouchableOpacity
                  style={[styles.printOptionChip, printShowProductName && styles.printOptionChipActive]}
                  onPress={() => setPrintShowProductName(!printShowProductName)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.printOptionText, printShowProductName && styles.printOptionTextActive]}>Product Name</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.printOptionChip, printShowMRP && styles.printOptionChipActive]}
                  onPress={() => setPrintShowMRP(!printShowMRP)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.printOptionText, printShowMRP && styles.printOptionTextActive]}>MRP</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.printOptionChip, printShowStoreName && styles.printOptionChipActive]}
                  onPress={() => setPrintShowStoreName(!printShowStoreName)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.printOptionText, printShowStoreName && styles.printOptionTextActive]}>Store Name</Text>
                </TouchableOpacity>
              </View>

              {/* Preview */}
              <Text style={[styles.printSectionLabel, { marginTop: 16 }]}>Preview</Text>
              <View style={styles.previewContainer}>
                {(() => {
                  const { w, h } = getActiveSizeMm();
                  const maxPrevW = Dimensions.get('window').width - 80;
                  const scale = Math.min(maxPrevW / w, 150 / h, 3);
                  const prevW = w * scale;
                  const prevH = h * scale;
                  const area = w * h;
                  const barcodeImg = product.productImages?.length
                    ? product.productImages[product.productImages.length - 1]
                    : null;
                  const hasBarcodeImg = barcodeImg && (barcodeImg.startsWith('data:image') || barcodeImg.includes('barcode_'));

                  return (
                    <View style={[styles.previewCard, { width: prevW, height: prevH }]}>
                      {printShowStoreName && storeName && area >= 800 ? (
                        <Text style={styles.previewStore} numberOfLines={1}>{storeName}</Text>
                      ) : null}
                      {printShowProductName && area >= 600 ? (
                        <Text style={styles.previewName} numberOfLines={1}>{product.name}</Text>
                      ) : null}
                      {printShowMRP ? (
                        <Text style={styles.previewPrice}>MRP {formatCurrencyINR(product.mrp || product.salesPrice || 0)}</Text>
                      ) : null}
                      {hasBarcodeImg ? (
                        <Image source={{ uri: barcodeImg }} style={{ width: prevW * 0.9, height: prevH * 0.4, flex: 1 }} resizeMode="contain" />
                      ) : (
                        <View style={[styles.previewBarcodePlaceholder, { width: prevW * 0.8, height: prevH * 0.3 }]}>
                          <Text style={{ fontSize: 8, color: Colors.textLight }}>Barcode</Text>
                        </View>
                      )}
                    </View>
                  );
                })()}
              </View>
            </ScrollView>

            <View style={styles.printModalFooter}>
              <TouchableOpacity
                style={[styles.printDownloadButton, isPrinting && { opacity: 0.6 }]}
                onPress={handleDownloadPdf}
                disabled={isPrinting}
                activeOpacity={0.7}
              >
                <Download size={20} color={Colors.primary} />
                <Text style={styles.printDownloadText}>Save PDF</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.printActionButton, isPrinting && { opacity: 0.6 }]}
                onPress={handlePrintBarcode}
                disabled={isPrinting}
                activeOpacity={0.7}
              >
                <Printer size={20} color="#FFF" />
                <Text style={styles.printActionText}>{isPrinting ? 'Preparing...' : 'Print Label'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
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
    textAlign: 'center',
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  printButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: 20,
  },
  editButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary + '10',
    borderRadius: 20,
  },
  deleteButton: {
    width: 40,
    height: 40,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.error + '10',
    borderRadius: 20,
  },
  contentArea: {
    flex: 1,
    overflow: 'hidden',
  },
  backgroundContent: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
  },
  bottomSheet: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -3 },
    shadowOpacity: 0.15,
    shadowRadius: 8,
    elevation: 12,
  },
  dragHandleArea: {
    paddingVertical: 10,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.background,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
  },
  dragHandlePill: {
    width: 40,
    height: 5,
    borderRadius: 3,
    backgroundColor: Colors.grey[300],
  },
  stockStatus: {
    fontSize: 14,
    fontWeight: '600',
    textAlign: 'right',
    minWidth: 80,
  },
  productImageSection: {
    position: 'relative',
    backgroundColor: Colors.grey[50],
  },
  productImagesScroll: {
    height: 220,
  },
  productImagesContainer: {
    flexDirection: 'row',
    gap: 2,
    paddingHorizontal: 0,
  },
  productHeaderImage: {
    width: 220,
    height: 220,
  },
  barcodeThumbFullSize: {
    width: 220,
    height: 220,
    backgroundColor: '#FAFBFC',
  },
  productHeaderImageSingle: {
    width: '100%',
    height: 220,
  },
  singleImageContainer: {
    width: '100%',
  },
  productImagePlaceholder: {
    height: 160,
    backgroundColor: Colors.grey[100],
    justifyContent: 'center',
    alignItems: 'center',
  },
  placeholderText: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 8,
  },
  imageCountBadge: {
    position: 'absolute',
    bottom: 10,
    right: 10,
    backgroundColor: 'rgba(0, 0, 0, 0.6)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  imageCountText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FFFFFF',
  },
  barcodeThumbContainer: {
    backgroundColor: '#FAFBFC',
    justifyContent: 'center',
    alignItems: 'center',
    width: 200,
    height: 200,
    padding: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 12,
    marginRight: 10,
  },
  barcodeThumbInner: {
    alignItems: 'center',
    justifyContent: 'center',
    flex: 1,
    width: '100%',
  },
  barcodeThumbImage: {
    width: 170,
    height: 110,
  },
  barcodeThumbTextRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
    marginTop: 10,
    paddingHorizontal: 10,
    paddingVertical: 6,
    backgroundColor: Colors.grey[100],
    borderRadius: 6,
  },
  barcodeThumbText: {
    fontSize: 13,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Colors.text,
    letterSpacing: 2,
    textAlign: 'center',
  },
  productHeaderInfo: {
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingBottom: 20,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginBottom: 4,
  },
  productHeaderName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    flexShrink: 1,
  },
  productHeaderCategory: {
    fontSize: 13,
    color: Colors.textLight,
    backgroundColor: Colors.grey[100],
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    overflow: 'hidden',
  },
  productHeaderPrice: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 10,
  },
  stockSummaryCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderRadius: 10,
    padding: 12,
    borderLeftWidth: 4,
  },
  stockSummaryLeft: {
    flex: 1,
  },
  stockSummaryRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    marginBottom: 2,
  },
  stockSummaryLabel: {
    fontSize: 12,
    color: Colors.textLight,
    fontWeight: '500',
  },
  stockSummaryValue: {
    fontSize: 18,
    fontWeight: '700',
  },
  stockSummarySecondary: {
    fontSize: 12,
    color: Colors.textLight,
    fontStyle: 'italic',
    marginTop: 2,
  },
  urgencyBadge: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 8,
    alignSelf: 'center',
  },
  urgencyText: {
    fontSize: 11,
    fontWeight: '700',
    letterSpacing: 0.5,
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
    paddingTop: 0,
  },
  tab: {
    flex: 1,
    paddingVertical: 16,
    alignItems: 'center',
    borderBottomWidth: 2,
    borderBottomColor: 'transparent',
  },
  activeTab: {
    borderBottomColor: Colors.primary,
  },
  tabText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textLight,
  },
  activeTabText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  sheetScrollView: {
    flex: 1,
  },
  sheetScrollContent: {
    padding: 16,
    paddingBottom: 60,
  },
  detailsContainer: {
    gap: 24,
  },
  section: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 16,
  },
  detailsGrid: {
    gap: 12,
  },
  detailRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  detailLabel: {
    fontSize: 14,
    color: Colors.textLight,
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
    textAlign: 'right',
  },
  clickableValue: {
    flex: 1,
  },
  clickableText: {
    color: Colors.primary,
    textDecorationLine: 'underline',
  },
  supplierInfoContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    gap: 8,
    justifyContent: 'flex-start',
  },
  callButton: {
    width: 32,
    height: 32,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.primary + '15',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
    flexShrink: 0,
    marginLeft: 'auto',
    shadowColor: Colors.primary,
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  truncatedText: {
    flex: 1,
    textAlign: 'right',
    fontSize: 14,
    fontWeight: '600',
    lineHeight: 18,
    minHeight: 36, // Ensure consistent height for 2 lines
  },
  barcodeText: {
    fontFamily: 'monospace',
    fontSize: 12,
  },
  stockGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
  },
  stockCard: {
    flex: 1,
    minWidth: '45%',
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  stockCardLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 8,
  },
  stockCardValue: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  stockCardUnit: {
    fontSize: 12,
    color: Colors.textLight,
  },
  
  // Pricing Information Styles
  pricingGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 16,
  },
  pricingCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    padding: 16,
    minWidth: '48%',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  pricingCardLabel: {
    fontSize: 12,
    color: Colors.textLight,
    marginBottom: 4,
    textAlign: 'center',
  },
  pricingCardValue: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  pricingCardUnit: {
    fontSize: 10,
    color: Colors.textLight,
    textAlign: 'center',
  },
  uomPricingSection: {
    marginTop: 16,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
  },
  uomPricingTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
    textAlign: 'center',
  },
  uomPricingGrid: {
    gap: 8,
  },
  uomPricingItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  uomPricingLabel: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.text,
  },
  uomPricingValue: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.success,
  },
  
  restockCard: {
    borderRadius: 12,
    padding: 16,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  restockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  restockInfo: {
    flex: 1,
    marginLeft: 12,
  },
  restockTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  restockSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
  },
  restockDetails: {
    gap: 4,
  },
  restockDetailText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  inventoryContainer: {
    flex: 1,
    gap: 16,
  },
  inventoryHeader: {
    marginBottom: 4,
  },
  inventorySubtitle: {
    fontSize: 13,
    color: Colors.textLight,
    marginTop: 4,
  },
  inventoryControls: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 16,
  },
  controlButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    gap: 8,
  },
  controlButtonActive: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  controlButtonText: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.text,
    flex: 1,
  },
  controlButtonTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  currentStockContainer: {
    padding: 16,
    backgroundColor: Colors.primary + '08',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.primary + '25',
  },
  currentStockHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  currentStockLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  currentStockUoMButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: Colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  currentStockUoMText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.primary,
  },
  currentStockRow: {
    flexDirection: 'row',
    alignItems: 'baseline',
    gap: 8,
    marginTop: 4,
  },
  currentStockBigValue: {
    fontSize: 28,
    fontWeight: '700',
    color: Colors.primary,
  },
  currentStockBigUnit: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textLight,
  },
  currentStockContent: {
    gap: 16,
  },
  currentStockLeft: {
    marginBottom: 4,
  },
  currentStockUoMValues: {
    gap: 8,
    alignItems: 'flex-end',
  },
  currentStockUoMItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    justifyContent: 'flex-end',
  },
  currentStockUoMLabel: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textLight,
  },
  currentStockUoMValue: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.primary,
    minWidth: 80,
    textAlign: 'right',
  },
  currentStockLocation: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  currentStockHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    flex: 1,
  },
  inventoryLogs: {
    gap: 12,
  },
  loadingContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  loadingText: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 12,
  },
  emptyLogsContainer: {
    padding: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  emptyLogsText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyLogsSubtext: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    paddingHorizontal: 32,
  },
  logCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 14,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderLeftWidth: 3,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    marginBottom: 10,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 12,
  },
  logIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  logInfo: {
    flex: 1,
  },
  logType: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 2,
  },
  logDate: {
    fontSize: 12,
    color: Colors.textLight,
  },
  logRight: {
    alignItems: 'flex-end',
    gap: 4,
  },
  logQuantityBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
  },
  logQuantity: {
    fontSize: 15,
    fontWeight: '700',
  },
  logBalance: {
    fontSize: 11,
    color: Colors.textLight,
  },
  logMetaRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 10,
    paddingLeft: 46,
  },
  logMetaChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  logMetaChipText: {
    fontSize: 11,
    color: Colors.text,
    fontWeight: '500',
  },
  logFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[100],
    paddingLeft: 46,
  },
  logStaffText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  logPriceText: {
    fontSize: 12,
    color: Colors.text,
    fontWeight: '500',
  },
  
  // Modal Styles
  modalContainer: {
    backgroundColor: Colors.background,
    borderRadius: 20,
    padding: 20,
    width: '90%',
    maxHeight: '80%',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: '700',
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
    fontSize: 18,
    color: Colors.textLight,
    fontWeight: '600',
  },
  modalContent: {
    maxHeight: 400,
  },
  modalOption: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    borderRadius: 8,
    marginBottom: 8,
    backgroundColor: Colors.grey[50],
    borderWidth: 1,
    borderColor: Colors.grey[200],
  },
  selectedOption: {
    backgroundColor: Colors.primary + '10',
    borderColor: Colors.primary,
  },
  modalOptionContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  modalOptionText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.text,
  },
  selectedOptionText: {
    color: Colors.primary,
    fontWeight: '600',
  },
  modalOptionSubtext: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 4,
  },
  
  // Delete Modal Styles
  modalOverlay: {
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
  deleteModal: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    marginHorizontal: 20,
    maxWidth: 400,
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
  deleteModalHeader: {
    alignItems: 'center',
    padding: 24,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  deleteIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.error + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  deleteModalTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 8,
  },
  deleteModalSubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    textAlign: 'center',
    lineHeight: 20,
  },
  deleteModalContent: {
    padding: 24,
  },
  deleteWarningText: {
    fontSize: 14,
    color: Colors.error,
    fontWeight: '600',
    marginBottom: 16,
    textAlign: 'center',
  },
  deleteDataList: {
    gap: 12,
    marginBottom: 24,
  },
  deleteDataItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  deleteDataText: {
    fontSize: 14,
    color: Colors.text,
    flex: 1,
  },
  deleteModalActions: {
    flexDirection: 'column',
    gap: 16,
    alignItems: 'stretch',
  },
  cancelButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[300],
    backgroundColor: Colors.background,
    alignItems: 'center',
  },
  cancelButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  deleteConfirmButton: {
    width: '100%',
    paddingVertical: 14,
    paddingHorizontal: 16,
    borderRadius: 8,
    backgroundColor: Colors.error,
    alignItems: 'center',
  },
  deleteConfirmButtonText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
  },
  

  
  stockInfoIcon: {
    width: 20,
    height: 20,
    borderRadius: 10,
    backgroundColor: Colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stockInfoIconText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: Colors.background,
  },
  // Image Modal Styles
  imageModalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.95)',
  },
  imageModalContainer: {
    flex: 1,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
    position: 'relative',
  },
  imageModalContent: {
    flex: 1,
    width: '100%',
    position: 'relative',
  },
  imageModalHeader: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: Platform.OS === 'ios' ? 60 : 40,
    paddingBottom: 16,
    zIndex: 10,
  },
  imageModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.background,
  },
  imageModalCloseButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  imageModalScrollView: {
    flex: 1,
    width: Dimensions.get('window').width,
  },
  imageModalScrollContent: {
    alignItems: 'center',
  },
  imageModalImageContainer: {
    width: Dimensions.get('window').width,
    height: Dimensions.get('window').height * 0.75,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Platform.OS === 'ios' ? 80 : 60,
  },
  imageModalImage: {
    width: Dimensions.get('window').width - 20,
    height: Dimensions.get('window').height * 0.7,
  },
  barcodeModalFullContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    flex: 1,
  },
  barcodeModalImageWrapper: {
    backgroundColor: Colors.background,
    borderRadius: 16,
    padding: 24,
    paddingBottom: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.25,
    shadowRadius: 8,
    elevation: 8,
  },
  barcodeModalImageFull: {
    width: Dimensions.get('window').width - 80,
    height: 200,
  },
  barcodeModalCodeText: {
    fontSize: 22,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Colors.background,
    letterSpacing: 4,
    marginTop: 24,
    textAlign: 'center',
  },
  barcodeModalInnerCodeText: {
    fontSize: 18,
    fontWeight: '700',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Colors.text,
    letterSpacing: 3,
    marginTop: 16,
    textAlign: 'center',
  },
  imageModalFooter: {
    position: 'absolute',
    bottom: Platform.OS === 'ios' ? 50 : 30,
    left: 0,
    right: 0,
    alignItems: 'center',
    gap: 8,
    zIndex: 10,
  },
  imageModalIndicatorText: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.background,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    overflow: 'hidden',
  },
  imageModalFooterInner: {
    alignItems: 'center',
    gap: 10,
  },
  imageModalDots: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  imageModalDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: 'rgba(255, 255, 255, 0.4)',
  },
  imageModalDotActive: {
    backgroundColor: Colors.background,
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  printModalContainer: {
    backgroundColor: Colors.background,
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: Dimensions.get('window').height * 0.85,
    width: '100%',
    position: 'absolute',
    bottom: 0,
  },
  printModalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  printModalTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.text,
  },
  printModalBody: {
    paddingHorizontal: 20,
    paddingTop: 16,
    maxHeight: Dimensions.get('window').height * 0.55,
  },
  printSectionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 10,
  },
  stickerSizeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    marginBottom: 8,
    gap: 12,
  },
  stickerSizeCardActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '08',
  },
  stickerSizeRadio: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.grey[300],
    alignItems: 'center',
    justifyContent: 'center',
  },
  stickerSizeRadioDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary,
  },
  stickerSizeName: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  stickerSizeDesc: {
    fontSize: 12,
    color: Colors.textLight,
    marginTop: 2,
  },
  customSizeRow: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    gap: 8,
    marginBottom: 8,
    paddingLeft: 32,
  },
  customSizeInput: {
    flex: 1,
  },
  customSizeLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 4,
  },
  customSizeField: {
    borderWidth: 1,
    borderColor: Colors.grey[200],
    borderRadius: 8,
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    color: Colors.text,
    textAlign: 'center',
  },
  customSizeX: {
    fontSize: 16,
    color: Colors.textLight,
    paddingBottom: 10,
  },
  unitToggle: {
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: Colors.primary + '15',
  },
  unitToggleText: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.primary,
  },
  previewContainer: {
    alignItems: 'center',
    padding: 16,
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    marginBottom: 16,
  },
  printOptionsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 4,
  },
  printOptionChip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1.5,
    borderColor: Colors.grey[300],
    backgroundColor: Colors.background,
  },
  printOptionChipActive: {
    borderColor: Colors.primary,
    backgroundColor: Colors.primary + '15',
  },
  printOptionText: {
    fontSize: 13,
    fontWeight: '500',
    color: Colors.textLight,
  },
  printOptionTextActive: {
    color: Colors.primary,
    fontWeight: '600',
  },
  previewCard: {
    backgroundColor: '#FFF',
    borderWidth: 1,
    borderColor: Colors.grey[300],
    borderRadius: 4,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 4,
    overflow: 'hidden',
  },
  previewStore: {
    fontSize: 7,
    fontWeight: '600',
    color: Colors.textLight,
    textAlign: 'center',
    marginBottom: 1,
  },
  previewName: {
    fontSize: 9,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  previewPrice: {
    fontSize: 10,
    fontWeight: '800',
    color: Colors.text,
    textAlign: 'center',
    marginBottom: 2,
  },
  previewBarcodePlaceholder: {
    backgroundColor: Colors.grey[100],
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 2,
  },
  previewBarcodeText: {
    fontSize: 7,
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
    color: Colors.text,
    letterSpacing: 1,
    marginTop: 2,
  },
  printModalFooter: {
    padding: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    flexDirection: 'row',
    gap: 12,
  },
  printDownloadButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary + '12',
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
    borderWidth: 1,
    borderColor: Colors.primary,
  },
  printDownloadText: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.primary,
  },
  printActionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.primary,
    paddingVertical: 14,
    borderRadius: 12,
    gap: 8,
  },
  printActionText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
});