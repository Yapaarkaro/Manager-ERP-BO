import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Image,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { router, useLocalSearchParams } from 'expo-router';
import { ArrowLeft, Package, ChartBar as BarChart3, Hash, Scan, Building2, MapPin, Calendar, TrendingUp, TrendingDown, ShoppingCart, FileText, Eye, Plus, Minus } from 'lucide-react-native';

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
  type: 'sale' | 'purchase' | 'return' | 'adjustment';
  invoiceNumber?: string;
  quantity: number;
  date: string;
  staffName: string;
  customerName?: string;
  supplierName?: string;
  reason?: string;
  balanceAfter: number;
}

const mockInventoryLogs: InventoryLog[] = [
  {
    id: '1',
    type: 'sale',
    invoiceNumber: 'INV-2024-001',
    quantity: -2,
    date: '2024-01-15',
    staffName: 'Priya Sharma',
    customerName: 'Rajesh Kumar',
    balanceAfter: 3
  },
  {
    id: '2',
    type: 'sale',
    invoiceNumber: 'INV-2024-003',
    quantity: -1,
    date: '2024-01-13',
    staffName: 'Priya Sharma',
    customerName: 'Sunita Devi',
    balanceAfter: 5
  },
  {
    id: '3',
    type: 'purchase',
    invoiceNumber: 'PUR-2024-005',
    quantity: 10,
    date: '2024-01-10',
    staffName: 'Amit Singh',
    supplierName: 'Apple India Pvt Ltd',
    balanceAfter: 6
  },
  {
    id: '4',
    type: 'return',
    invoiceNumber: 'RET-2024-001',
    quantity: 1,
    date: '2024-01-16',
    staffName: 'Priya Sharma',
    customerName: 'Rajesh Kumar',
    reason: 'Defective product',
    balanceAfter: 4
  },
  {
    id: '5',
    type: 'adjustment',
    quantity: -1,
    date: '2024-01-12',
    staffName: 'Amit Singh',
    reason: 'Damaged during handling',
    balanceAfter: 5
  },
];

export default function ProductDetailsScreen() {
  const { productId, productData } = useLocalSearchParams();
  const product = JSON.parse(productData as string);
  const [selectedTab, setSelectedTab] = useState<'details' | 'inventory'>('details');

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-IN', {
      style: 'currency',
      currency: 'INR',
      minimumFractionDigits: 0,
    }).format(price);
  };

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
      case 'sale': return Colors.error;
      case 'purchase': return Colors.success;
      case 'return': return Colors.warning;
      case 'adjustment': return Colors.primary;
      default: return Colors.textLight;
    }
  };

  const getLogTypeIcon = (type: string) => {
    switch (type) {
      case 'sale': return ShoppingCart;
      case 'purchase': return Plus;
      case 'return': return TrendingUp;
      case 'adjustment': return Package;
      default: return Package;
    }
  };

  const getLogTypeText = (type: string) => {
    switch (type) {
      case 'sale': return 'Sale';
      case 'purchase': return 'Purchase';
      case 'return': return 'Return';
      case 'adjustment': return 'Adjustment';
      default: return type;
    }
  };

  const handleLogPress = (log: InventoryLog) => {
    if (log.invoiceNumber) {
      // Create mock invoice data for navigation
      const mockInvoice = {
        id: log.invoiceNumber.replace(/[A-Z-]/g, ''),
        invoiceNumber: log.invoiceNumber,
        customerName: log.customerName || log.supplierName || 'N/A',
        customerType: 'individual',
        staffName: log.staffName,
        staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
        paymentStatus: 'paid',
        amount: Math.abs(log.quantity) * product.price,
        itemCount: Math.abs(log.quantity),
        date: log.date,
        customerDetails: {
          name: log.customerName || log.supplierName || 'N/A',
          mobile: '+91 98765 43210',
          address: '123, Sample Address, City - 560001'
        }
      };

      if (log.type === 'return') {
        // Navigate to return details
        const returnInvoice = {
          id: log.invoiceNumber.replace('RET-', ''),
          returnNumber: log.invoiceNumber,
          originalInvoiceNumber: 'INV-2024-001',
          customerName: log.customerName || 'N/A',
          customerType: 'individual',
          staffName: log.staffName,
          staffAvatar: 'https://images.pexels.com/photos/1239291/pexels-photo-1239291.jpeg?auto=compress&cs=tinysrgb&w=100&h=100&dpr=1',
          refundStatus: 'refunded',
          amount: Math.abs(log.quantity) * product.price,
          itemCount: Math.abs(log.quantity),
          date: log.date,
          reason: log.reason || 'Customer return',
          customerDetails: {
            name: log.customerName || 'N/A',
            mobile: '+91 98765 43210',
            address: '123, Sample Address, City - 560001'
          }
        };

        router.push({
          pathname: '/return-details',
          params: {
            returnId: returnInvoice.id,
            returnData: JSON.stringify(returnInvoice)
          }
        });
      } else {
        // Navigate to invoice details
        router.push({
          pathname: '/invoice-details',
          params: {
            invoiceId: mockInvoice.id,
            invoiceData: JSON.stringify(mockInvoice)
          }
        });
      }
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

  const renderInventoryLog = (log: InventoryLog) => {
    const LogIcon = getLogTypeIcon(log.type);
    const logColor = getLogTypeColor(log.type);

    return (
      <TouchableOpacity
        key={log.id}
        style={styles.logCard}
        onPress={() => handleLogPress(log)}
        activeOpacity={0.7}
      >
        <View style={styles.logHeader}>
          <View style={styles.logLeft}>
            <View style={[styles.logIcon, { backgroundColor: `${logColor}20` }]}>
              <LogIcon size={16} color={logColor} />
            </View>
            <View style={styles.logInfo}>
              <Text style={styles.logType}>
                {getLogTypeText(log.type)}
                {log.invoiceNumber && ` - ${log.invoiceNumber}`}
              </Text>
              <Text style={styles.logDate}>{formatDate(log.date)}</Text>
            </View>
          </View>
          
          <View style={styles.logRight}>
            <Text style={[
              styles.logQuantity,
              { color: log.quantity > 0 ? Colors.success : Colors.error }
            ]}>
              {log.quantity > 0 ? '+' : ''}{log.quantity}
            </Text>
            <Text style={styles.logBalance}>
              Bal: {log.balanceAfter}
            </Text>
          </View>
        </View>

        <View style={styles.logDetails}>
          {log.customerName && (
            <Text style={styles.logDetailText}>Customer: {log.customerName}</Text>
          )}
          {log.supplierName && (
            <Text style={styles.logDetailText}>Supplier: {log.supplierName}</Text>
          )}
          {log.reason && (
            <Text style={styles.logDetailText}>Reason: {log.reason}</Text>
          )}
          <Text style={styles.logDetailText}>Staff: {log.staffName}</Text>
        </View>

        {log.invoiceNumber && (
          <View style={styles.viewInvoiceButton}>
            <Eye size={14} color={Colors.primary} />
            <Text style={styles.viewInvoiceText}>View Invoice</Text>
          </View>
        )}
      </TouchableOpacity>
    );
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
          
          <Text style={styles.headerTitle}>Product Details</Text>
          
          <View style={styles.headerRight}>
            <Text style={[
              styles.stockStatus,
              { color: getUrgencyColor(product.urgencyLevel) }
            ]}>
              {product.currentStock} units
            </Text>
          </View>
        </View>
      </SafeAreaView>

      {/* Product Header */}
      <View style={styles.productHeader}>
        <Image 
          source={{ uri: product.image }}
          style={styles.productHeaderImage}
        />
        <View style={styles.productHeaderInfo}>
          <Text style={styles.productHeaderName}>{product.name}</Text>
          <Text style={styles.productHeaderCategory}>{product.category}</Text>
          <Text style={styles.productHeaderPrice}>{formatPrice(product.price)}</Text>
          
          <View style={[
            styles.urgencyBadge,
            { backgroundColor: `${getUrgencyColor(product.urgencyLevel)}20` }
          ]}>
            <Text style={[
              styles.urgencyText,
              { color: getUrgencyColor(product.urgencyLevel) }
            ]}>
              {product.urgencyLevel.toUpperCase()} STOCK
            </Text>
          </View>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={styles.tabContainer}>
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'details' && styles.activeTab
          ]}
          onPress={() => setSelectedTab('details')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'details' && styles.activeTabText
          ]}>
            Product Details
          </Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[
            styles.tab,
            selectedTab === 'inventory' && styles.activeTab
          ]}
          onPress={() => setSelectedTab('inventory')}
          activeOpacity={0.7}
        >
          <Text style={[
            styles.tabText,
            selectedTab === 'inventory' && styles.activeTabText
          ]}>
            Inventory Logs
          </Text>
        </TouchableOpacity>
      </View>

      {/* Tab Content */}
      <ScrollView 
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
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
                  <Text style={styles.detailValue}>{product.taxRate}% GST</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <Building2 size={16} color={Colors.textLight} />
                  <Text style={styles.detailLabel}>Supplier:</Text>
                  <Text style={styles.detailValue}>{product.supplier}</Text>
                </View>
                
                <View style={styles.detailRow}>
                  <MapPin size={16} color={Colors.textLight} />
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={styles.detailValue}>{product.location}</Text>
                </View>
              </View>
            </View>

            {/* Stock Information */}
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>Stock Information</Text>
              <View style={styles.stockGrid}>
                <View style={styles.stockCard}>
                  <Text style={styles.stockCardLabel}>Current Stock</Text>
                  <Text style={[
                    styles.stockCardValue,
                    { color: getUrgencyColor(product.urgencyLevel) }
                  ]}>
                    {product.currentStock}
                  </Text>
                  <Text style={styles.stockCardUnit}>units</Text>
                </View>
                
                <View style={styles.stockCard}>
                  <Text style={styles.stockCardLabel}>Min Level</Text>
                  <Text style={styles.stockCardValue}>
                    {product.minStockLevel}
                  </Text>
                  <Text style={styles.stockCardUnit}>units</Text>
                </View>
                
                <View style={styles.stockCard}>
                  <Text style={styles.stockCardLabel}>Max Level</Text>
                  <Text style={styles.stockCardValue}>
                    {product.maxStockLevel}
                  </Text>
                  <Text style={styles.stockCardUnit}>units</Text>
                </View>
                
                <View style={styles.stockCard}>
                  <Text style={styles.stockCardLabel}>Stock Value</Text>
                  <Text style={[styles.stockCardValue, { color: Colors.success }]}>
                    {formatPrice(product.stockValue)}
                  </Text>
                  <Text style={styles.stockCardUnit}>total</Text>
                </View>
              </View>
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
                    Last restocked: {formatDate(product.lastRestocked)}
                  </Text>
                  <Text style={styles.restockDetailText}>
                    Estimated cost: {formatPrice((product.maxStockLevel - product.currentStock) * product.price * 0.8)}
                  </Text>
                </View>
              </View>
            </View>
          </View>
        ) : (
          <View style={styles.inventoryContainer}>
            <View style={styles.inventoryHeader}>
              <Text style={styles.sectionTitle}>Inventory Movement Logs</Text>
              <Text style={styles.inventorySubtitle}>
                Track all stock movements for this product
              </Text>
            </View>

            <View style={styles.inventoryLogs}>
              {mockInventoryLogs.map(renderInventoryLog)}
            </View>
          </View>
        )}
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
  headerRight: {
    alignItems: 'flex-end',
  },
  stockStatus: {
    fontSize: 16,
    fontWeight: '700',
  },
  productHeader: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    paddingHorizontal: 16,
    paddingVertical: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
  },
  productHeaderImage: {
    width: 80,
    height: 80,
    borderRadius: 12,
    marginRight: 16,
  },
  productHeaderInfo: {
    flex: 1,
  },
  productHeaderName: {
    fontSize: 20,
    fontWeight: '700',
    color: Colors.text,
    marginBottom: 4,
  },
  productHeaderCategory: {
    fontSize: 14,
    color: Colors.textLight,
    marginBottom: 8,
  },
  productHeaderPrice: {
    fontSize: 18,
    fontWeight: '700',
    color: Colors.success,
    marginBottom: 12,
  },
  urgencyBadge: {
    alignSelf: 'flex-start',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  urgencyText: {
    fontSize: 12,
    fontWeight: '700',
  },
  tabContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.background,
    borderBottomWidth: 1,
    borderBottomColor: Colors.grey[200],
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
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    padding: 16,
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
  },
  inventoryHeader: {
    marginBottom: 20,
  },
  inventorySubtitle: {
    fontSize: 14,
    color: Colors.textLight,
    marginTop: 4,
  },
  inventoryLogs: {
    gap: 12,
  },
  logCard: {
    backgroundColor: Colors.background,
    borderRadius: 12,
    padding: 16,
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
  logHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  logLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  logIcon: {
    width: 32,
    height: 32,
    borderRadius: 16,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
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
  },
  logQuantity: {
    fontSize: 16,
    fontWeight: '700',
    marginBottom: 2,
  },
  logBalance: {
    fontSize: 12,
    color: Colors.textLight,
  },
  logDetails: {
    gap: 4,
    marginBottom: 8,
  },
  logDetailText: {
    fontSize: 12,
    color: Colors.textLight,
  },
  viewInvoiceButton: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-end',
    backgroundColor: Colors.grey[50],
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 4,
  },
  viewInvoiceText: {
    fontSize: 12,
    color: Colors.primary,
    fontWeight: '500',
  },
});