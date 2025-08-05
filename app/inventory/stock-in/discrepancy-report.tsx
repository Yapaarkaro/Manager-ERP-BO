import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  TextInput,
  Alert,
  Dimensions,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import {
  ArrowLeft,
  AlertTriangle,
  Package,
  Send,
  FileText,
  Building2,
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

interface POProduct {
  id: string;
  name: string;
  billedQuantity: number;
  receivedQuantity: number;
  unitPrice: number;
  totalPrice: number;
  status: 'pending' | 'received' | 'partial' | 'excess';
}

interface PurchaseOrder {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierGSTIN: string;
  supplierAddress: string;
  supplierPhone: string;
  supplierEmail: string;
  orderDate: string;
  expectedDelivery: string;
  totalAmount: number;
  status: 'pending' | 'partial' | 'received';
  products: POProduct[];
}

interface DiscrepancyReport {
  id: string;
  poNumber: string;
  supplierName: string;
  supplierEmail: string;
  reportDate: string;
  products: {
    id: string;
    name: string;
    billedQuantity: number;
    receivedQuantity: number;
    discrepancyType: 'shortage' | 'excess' | 'damaged' | 'wrong_item';
    discrepancyQuantity: number;
    discrepancyValue: number;
    reason: string;
  }[];
  totalDiscrepancyValue: number;
  status: 'draft' | 'sent' | 'acknowledged';
}

export default function DiscrepancyReportScreen() {
  const { poData } = useLocalSearchParams();
  const [po, setPo] = useState<PurchaseOrder | null>(null);
  const [discrepancyReport, setDiscrepancyReport] = useState<DiscrepancyReport | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (poData) {
      try {
        const parsedPO = JSON.parse(poData as string);
        setPo(parsedPO);
        
        // Create initial discrepancy report
        const productsWithDiscrepancies = parsedPO.products.filter((product: POProduct) => 
          product.receivedQuantity !== product.billedQuantity
        );

        if (productsWithDiscrepancies.length > 0) {
          const reportProducts = productsWithDiscrepancies.map((product: POProduct) => {
            const discrepancyQuantity = Math.abs(product.receivedQuantity - product.billedQuantity);
            const discrepancyType = product.receivedQuantity < product.billedQuantity ? 'shortage' : 'excess';
            const discrepancyValue = discrepancyQuantity * product.unitPrice;
            
            return {
              id: product.id,
              name: product.name,
              billedQuantity: product.billedQuantity,
              receivedQuantity: product.receivedQuantity,
              discrepancyType,
              discrepancyQuantity,
              discrepancyValue,
              reason: '',
            };
          });

          const totalDiscrepancyValue = reportProducts.reduce((sum, product) => sum + product.discrepancyValue, 0);

          setDiscrepancyReport({
            id: `DISC-${Date.now()}`,
            poNumber: parsedPO.poNumber,
            supplierName: parsedPO.supplierName,
            supplierEmail: parsedPO.supplierEmail,
            reportDate: new Date().toISOString().split('T')[0],
            products: reportProducts,
            totalDiscrepancyValue,
            status: 'draft',
          });
        }
      } catch (error) {
        console.error('Error parsing PO data:', error);
        Alert.alert('Error', 'Invalid PO data');
        router.back();
      }
    }
  }, [poData]);

  const handleReasonChange = (productId: string, text: string) => {
    if (!discrepancyReport) return;

    const updatedProducts = discrepancyReport.products.map(product =>
      product.id === productId
        ? { ...product, reason: text }
        : product
    );

    setDiscrepancyReport({
      ...discrepancyReport,
      products: updatedProducts,
    });
  };

  const handleSendReport = () => {
    if (!discrepancyReport) return;

    setIsSubmitting(true);
    
    // Simulate API call
    setTimeout(() => {
      setIsSubmitting(false);
      Alert.alert(
        'Report Sent',
        'Discrepancy report has been sent to the supplier successfully.',
        [
          {
            text: 'OK',
            onPress: () => router.push('/purchasing/supplier-chat')
          }
        ]
      );
    }, 2000);
  };

  const getDiscrepancyTypeColor = (type: string) => {
    switch (type) {
      case 'shortage': return Colors.error;
      case 'excess': return Colors.warning;
      case 'damaged': return Colors.error;
      case 'wrong_item': return Colors.warning;
      default: return Colors.textLight;
    }
  };

  const getDiscrepancyTypeText = (type: string) => {
    switch (type) {
      case 'shortage': return 'SHORTAGE';
      case 'excess': return 'EXCESS';
      case 'damaged': return 'DAMAGED';
      case 'wrong_item': return 'WRONG ITEM';
      default: return type.toUpperCase();
    }
  };

  const formatAmount = (amount: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(amount);
  };

  if (!po || !discrepancyReport) {
    return (
      <SafeAreaView style={styles.container}>
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
          <Text style={styles.headerTitle}>Discrepancy Report</Text>
        </View>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading discrepancy data...</Text>
        </View>
      </SafeAreaView>
    );
  }

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
        
        <Text style={styles.headerTitle}>Discrepancy Report</Text>
      </View>

        <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
          {/* Supplier Information */}
          <View style={styles.supplierCard}>
            <View style={styles.supplierHeader}>
              <Building2 size={20} color={Colors.primary} />
              <Text style={styles.supplierTitle}>Supplier Details</Text>
            </View>
            <View style={styles.supplierInfo}>
              <View style={styles.supplierRow}>
                <Text style={styles.supplierLabel}>Name:</Text>
                <Text style={styles.supplierValue}>{po.supplierName}</Text>
              </View>
              <View style={styles.supplierRow}>
                <Text style={styles.supplierLabel}>GSTIN:</Text>
                <Text style={styles.supplierValue}>{po.supplierGSTIN}</Text>
              </View>
              <View style={styles.supplierRow}>
                <Text style={styles.supplierLabel}>Email:</Text>
                <Text style={styles.supplierValue}>{po.supplierEmail}</Text>
              </View>
              <View style={styles.supplierRow}>
                <Text style={styles.supplierLabel}>Phone:</Text>
                <Text style={styles.supplierValue}>{po.supplierPhone}</Text>
              </View>
            </View>
          </View>

          {/* PO Information */}
          <View style={styles.poCard}>
            <View style={styles.poHeader}>
              <FileText size={20} color={Colors.primary} />
              <Text style={styles.poTitle}>Purchase Order Details</Text>
            </View>
            <View style={styles.poInfo}>
              <View style={styles.poRow}>
                <Text style={styles.poLabel}>PO Number:</Text>
                <Text style={styles.poValue}>{po.poNumber}</Text>
              </View>
              <View style={styles.poRow}>
                <Text style={styles.poLabel}>Order Date:</Text>
                <Text style={styles.poValue}>{po.orderDate}</Text>
              </View>
              <View style={styles.poRow}>
                <Text style={styles.poLabel}>Expected Delivery:</Text>
                <Text style={styles.poValue}>{po.expectedDelivery}</Text>
              </View>
            </View>
          </View>

          {/* Summary Stats */}
          <View style={styles.summaryCard}>
            <View style={styles.summaryStats}>
              <View style={styles.statItem}>
                <Text style={styles.statValue}>{discrepancyReport.products.length}</Text>
                <Text style={styles.statLabel}>Discrepancies</Text>
              </View>
              <View style={styles.statDivider} />
              <View style={styles.statItem}>
                <Text style={[styles.statValue, { color: Colors.error }]}>
                  {formatAmount(discrepancyReport.totalDiscrepancyValue)}
                </Text>
                <Text style={styles.statLabel}>Total Value</Text>
              </View>
            </View>
          </View>

          {/* Discrepancy Items */}
          <View style={styles.itemsSection}>
            <Text style={styles.sectionTitle}>Items with Discrepancies</Text>
            {discrepancyReport.products.map((product) => (
              <View key={product.id} style={styles.discrepancyItem}>
                <View style={styles.productHeader}>
                  <Package size={16} color={Colors.textLight} />
                  <Text style={styles.productName}>{product.name}</Text>
                  <View style={[
                    styles.discrepancyTypeBadge,
                    { backgroundColor: `${getDiscrepancyTypeColor(product.discrepancyType)}20` }
                  ]}>
                    <Text style={[
                      styles.discrepancyTypeText,
                      { color: getDiscrepancyTypeColor(product.discrepancyType) }
                    ]}>
                      {getDiscrepancyTypeText(product.discrepancyType)}
                    </Text>
                  </View>
                </View>

                <View style={styles.quantityRow}>
                  <View style={styles.quantityItem}>
                    <Text style={styles.quantityLabel}>Billed</Text>
                    <Text style={styles.quantityValue}>{product.billedQuantity}</Text>
                  </View>
                  <View style={styles.quantityItem}>
                    <Text style={styles.quantityLabel}>Received</Text>
                    <Text style={styles.quantityValue}>{product.receivedQuantity}</Text>
                  </View>
                  <View style={styles.quantityItem}>
                    <Text style={styles.quantityLabel}>Difference</Text>
                    <Text style={[
                      styles.quantityValue,
                      { color: getDiscrepancyTypeColor(product.discrepancyType) }
                    ]}>
                      {product.discrepancyType === 'shortage' ? '-' : '+'}
                      {product.discrepancyQuantity}
                    </Text>
                  </View>
                </View>

                <View style={styles.reasonSection}>
                  <Text style={styles.reasonLabel}>Reason for Discrepancy:</Text>
                  <TextInput
                    style={styles.reasonInput}
                    value={product.reason}
                    onChangeText={(text) => handleReasonChange(product.id, text)}
                    placeholder="Enter reason for this discrepancy..."
                    placeholderTextColor={Colors.textLight}
                    multiline
                    numberOfLines={3}
                  />
                </View>

                <View style={styles.notesSection}>
                  <Text style={styles.notesLabel}>Additional Notes:</Text>
                  <TextInput
                    style={styles.notesInput}
                    placeholder="Add any additional notes or observations..."
                    placeholderTextColor={Colors.textLight}
                    multiline
                    numberOfLines={3}
                  />
                </View>
              </View>
            ))}
          </View>
        </ScrollView>

        {/* Send Button */}
        <View style={styles.bottomContainer}>
          <TouchableOpacity
            style={[
              styles.sendButton,
              isSubmitting && styles.disabledButton
            ]}
            onPress={handleSendReport}
            disabled={isSubmitting}
            activeOpacity={0.8}
          >
            <Send size={20} color={Colors.background} />
            <Text style={styles.sendButtonText}>
              {isSubmitting ? 'Sending...' : 'Send Report to Supplier'}
            </Text>
          </TouchableOpacity>
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
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: Colors.textLight,
  },
  content: {
    flex: 1,
    paddingHorizontal: 16,
    paddingVertical: 20,
  },
  supplierCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    marginBottom: 16,
  },
  supplierHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  supplierTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  supplierInfo: {
    gap: 8,
  },
  supplierRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  supplierLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  supplierValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  poCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    marginBottom: 16,
  },
  poHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  poTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginLeft: 8,
  },
  poInfo: {
    gap: 8,
  },
  poRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  poLabel: {
    fontSize: 14,
    color: Colors.textLight,
    fontWeight: '500',
  },
  poValue: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
  },
  summaryCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 20,
    marginBottom: 16,
  },
  summaryStats: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
  },
  statValue: {
    fontSize: 24,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  statLabel: {
    fontSize: 12,
    color: Colors.textLight,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  statDivider: {
    width: 1,
    height: 40,
    backgroundColor: Colors.grey[200],
  },
  itemsSection: {
    marginBottom: 16,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    marginBottom: 12,
  },
  discrepanciesList: {
    gap: 16,
  },
  discrepancyItem: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
    marginBottom: 16,
  },
  productHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 12,
  },
  productName: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.text,
    flex: 1,
  },
  discrepancyTypeBadge: {
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  discrepancyTypeText: {
    fontSize: 10,
    fontWeight: '700',
  },
  quantityRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  quantityItem: {
    alignItems: 'center',
    flex: 1,
  },
  quantityLabel: {
    fontSize: 11,
    color: Colors.textLight,
    marginBottom: 2,
    textAlign: 'center',
  },
  quantityValue: {
    fontSize: 16,
    fontWeight: '700',
    color: Colors.text,
    textAlign: 'center',
  },
  addReasonButton: {
    backgroundColor: Colors.grey[100],
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 6,
    alignSelf: 'flex-start',
  },
  addReasonText: {
    fontSize: 11,
    color: Colors.textLight,
    fontWeight: '500',
  },
  reasonSection: {
    marginTop: 12,
    marginBottom: 12,
  },
  reasonLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  reasonInput: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  notesSection: {
    marginTop: 12,
  },
  notesLabel: {
    fontSize: 14,
    color: Colors.text,
    fontWeight: '600',
    marginBottom: 8,
  },
  notesInput: {
    backgroundColor: Colors.grey[50],
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 14,
    color: Colors.text,
    minHeight: 80,
    textAlignVertical: 'top',
  },
  summaryCard: {
    backgroundColor: Colors.grey[50],
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.grey[200],
    padding: 16,
  },
  summaryRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  summaryLabel: {
    fontSize: 14,
    color: Colors.textLight,
  },
  summaryValue: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.text,
  },
  bottomContainer: {
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderTopWidth: 1,
    borderTopColor: Colors.grey[200],
    backgroundColor: Colors.background,
  },
  sendButton: {
    backgroundColor: Colors.error,
    borderRadius: 12,
    paddingVertical: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  sendButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: Colors.background,
  },
  disabledButton: {
    backgroundColor: Colors.grey[300],
  },

}); 